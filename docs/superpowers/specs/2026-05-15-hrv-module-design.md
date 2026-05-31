# MakeIt HQ — HRV Module Design Spec

**Date:** 2026-05-15 · **Spec revision:** 4 (2026-05-17 — wearable-first pivot)
**Status:** Design approved — wearable-first; ready for plan revision
**Module path:** `/hrv` (new top-level route, parallel to `/coaching`, `/train`, `/form-check`)

> Research foundation: [`HRV_SCIENCE_BRIEF.md`](../../research/HRV_SCIENCE_BRIEF.md) · [`HRV_PLATFORMS_BENCHMARK.md`](../../research/HRV_PLATFORMS_BENCHMARK.md) · [`HRV_PPG_SPIKE_FINDINGS.md`](../../research/HRV_PPG_SPIKE_FINDINGS.md)

> **Revision 4 — wearable-first pivot.** Revisions 1-3 designed camera-PPG (smartphone fingertip) as the primary measurement input. The P0 feasibility spike ([findings](../../research/HRV_PPG_SPIKE_FINDINGS.md)) returned **NO-GO** for web-based camera-PPG: a browser cannot control torch/exposure the way native PPG apps do, and stable measurements could not be obtained. The module pivots to **wearable-first**: members connect a wearable (WHOOP, Oura, Polar) via its cloud API and HRV syncs automatically. Apple Watch / HealthKit is served by a separate native iOS companion sub-project (own spec). Camera-PPG is retained as low-confidence fallback code and a future native-app milestone.

---

## 0. References to existing codebase (verified)

| Artifact | Path | Status |
|---|---|---|
| HRV migration | `supabase/migrations/0031_hrv_module.sql` | **Shipped** (7 tables + RLS). Next migration = `0032` |
| Coach detection RLS function | `supabase/migrations/0004_coach.sql` → `public.is_current_user_coach()` | Exists — used by coach-read RLS |
| Coach notes (existing) | `form_checks.coach_notes` **text column** (NOT a table) | §8 uses an analogous text column on `hrv_alerts` |
| Member table | `members` (from `0001_init.sql`) | All FKs |
| Reps event mechanism | `0007_rewards.sql` / `0008` / `0009` | §8 Reps integration |
| HRV algorithm core | `src/lib/hrv/{rmssd,baseline,ppg,mock,types}.ts` | **Shipped** (Tasks 1-8) — source-agnostic, survives the pivot |
| Claude program generator | `src/lib/data/program-generator-claude.ts` | §7 D-prong extension target |
| Resend email integration | `src/lib/email/resend.ts` + `templates/` | §8 coach notification path |
| `vercel.json` | **Does NOT exist** | W1 creates it (cron registration) |
| Cron handlers / `CRON_SECRET` | **None / not defined** | W1 establishes the pattern |
| Camera-PPG probe (reference) | `public/hrv-ppg-probe.html` | Retained for a future native-app validation |

---

## 1. Overview & positioning

MakeIt HQ adds a dedicated HRV module — `/hrv` — that owns Heart Rate Variability ingestion, baselining, trend analysis, daily readiness signaling, lifestyle-correlation insights, session-level integration, adaptive program periodization, and a coach (Munk) red-flag review queue.

Members connect a **wearable** (WHOOP, Oura, or Polar) once; HRV then **syncs automatically** every day. There is no measurement ritual — the friction is gone. For a premium fitness crew, wearable ownership is high, and the data already exists on their wrist; the module's job is to interpret it well, not to re-measure it.

**Brand positioning:** science-first, ruthlessly honest. The module visibly refuses things competitors do — no 0-100 recovery score, no peer comparison, no LF/HF "stress balance" UI, no population percentiles, no supplement upsells. Where it adds value over a bare WHOOP/Oura app: a real coach (Munk) in the loop, integration with the member's training program, the crew context, and honest framing of what HRV can and cannot tell you.

## 2. Goals & non-goals

### Goals

- Let members connect WHOOP, Oura, or Polar and have HRV sync automatically.
- Give every connected member a reliable daily readiness signal (lnRMSSD via the Plews 7d/60d/SWC framework).
- Detect early-warning patterns for illness, overreaching, and lifestyle imbalance — surface them to the member and (conditionally) to the coach.
- Modulate the existing training engine (`/session`, `/coaching`) so HRV influences both today's session and long-term periodization.
- Generate weekly personalized insights via Claude (lifestyle correlations).
- Reward sustained engagement with the existing Reps loyalty mechanism.

### Non-goals (wearable-first v1 = W1-W3)

- A standardized in-app measurement (camera-PPG / chest-strap morning reading). Demoted to future fallback / native milestone (P0 spike NO-GO).
- Apple Watch / HealthKit ingestion **in the web app** — HealthKit is not web-accessible. Served by the separate native iOS companion sub-project (W4).
- Garmin ingestion — Garmin's Health API requires partner approval; deferred.
- Live HR during workouts.
- Cross-member ranking, peer leaderboards, age-percentile comparisons.

### Wearable support matrix — v1

| Wearable | Integration | v1 phase |
|---|---|---|
| WHOOP | Cloud API, OAuth 2.0 | **W1** |
| Oura | Cloud API, OAuth 2.0 | W2 |
| Polar | AccessLink API, OAuth 2.0 | W3 |
| Apple Watch | HealthKit — needs native app | W4 (separate sub-project) |
| Garmin | Health API, partner approval | Deferred |
| Camera-PPG fallback | Browser (P0 NO-GO) | Future native milestone |

## 3. Information architecture

**Top-level route:** `/hrv`.

- **Desktop sidebar:** HRV added as a nav item (position 4: Today / Træn / Crew / **HRV** / Reps / Mig).
- **Mobile:** the mobile tab-bar already carries 7 tabs (Today / Træn / Mad / Crew / Chat / Reps / Mig) — adding an 8th would crowd it below the 44px touch-target floor. HRV on mobile is therefore reached via **(a)** the `/dashboard` HRV readiness chip (tap-through) and **(b)** the mobile nav drawer/overflow — **not** a new tab-bar slot. (Re-balancing the already-overloaded 7-tab bar is a pre-existing nav concern, explicitly out of scope for this module.)

**Pages under `/hrv`:**

- `/hrv` — daily destination. Three states (No-connection / Warming-up / Active).
- `/hrv/trends` — historical chart: lnRMSSD daily points, 7-day rolling mean, 60-day baseline band ± SWC.
- `/hrv/insights` — weekly Claude observation + lifestyle correlation cards.
- `/hrv/learn` — short editorial intro to HRV science, what we measure, what we refuse to do.

**Cross-module touchpoints:**

- `/dashboard` — HRV-readiness KPI chip.
- `/session/[id]` — start-of-session prompt reads HRV status (§7 B-prong).
- `/coaching` — AI program-gen reads HRV trends at regeneration (§7 D-prong).
- `/coach/queue` — Munk's red-flag-kø alongside the form-check queue (§8).
- `/reps` — engagement rewards (§8).
- `/settings` — **wearable connections** (connect/disconnect WHOOP/Oura/Polar, choose primary), cycle-tracking toggle, data export.

**Design tokens:** existing system. No new colors. New visual primitive: the 5-bucket readiness ladder. Components in `src/components/hrv/`.

## 4. Data sources — wearable cloud APIs

### Connection model

A member connects a wearable through an **OAuth 2.0** flow initiated from `/settings`:

1. Member taps "Forbind WHOOP" (or Oura / Polar).
2. Redirect to the provider's OAuth consent screen.
3. Provider redirects back to `/api/wearables/<provider>/callback` with an authorization code.
4. The callback exchanges the code for an access token + refresh token, stores them in `hrv_wearable_connections` (§9), and triggers an initial backfill sync.

### Sync model

A daily **Vercel Cron** (`/api/cron/hrv-wearable-sync`, ~06:00 Europe/Copenhagen) iterates every active connection:

1. Refresh the access token if expired (using the stored refresh token).
2. Fetch the latest HRV reading(s) from the provider API.
3. Map the provider's HRV value to a `hrv_readings` row (compute lnRMSSD, run the baseline model, derive warm-up state + readiness bucket).
4. Update `last_synced_at`; on auth failure, mark the connection `needs_reauth` and surface a re-connect prompt in the UI.

Webhooks (WHOOP and Oura both offer them) are a **later optimization**; v1 uses cron polling for simplicity and uniformity across the three providers.

### Provider specifics

| Provider | HRV source | API surface | Notes |
|---|---|---|---|
| **WHOOP** | RMSSD (ms) measured during sleep, one value per sleep cycle | WHOOP API v2, OAuth 2.0; `recovery` resource carries `hrv_rmssd_milli` | Webhooks available (later) |
| **Oura** | Nightly RMSSD; 5-min samples across the night | Oura API v2, OAuth 2.0; `daily_readiness` / `sleep` endpoints | Personal-token mode exists; v1 uses OAuth |
| **Polar** | Nightly recharge / HRV | Polar AccessLink, OAuth 2.0 | Pull model; transaction-based reads |

**These wearables are not cross-comparable.** WHOOP, Oura, and Polar each measure HRV with different methodology, hardware, and sleep-window definitions. The science brief is explicit: HRV cannot be pooled across sources. Therefore:

- Each member's baseline is built **only** from one provider's stream.
- If a member connects multiple wearables, one is designated **primary** (it feeds the baseline + readiness). Others are stored as secondary observations (`is_primary = false`) for the member's own reference, never merged into the baseline.
- Switching the primary wearable **resets the baseline** (UI: "Ny baseline genopbygges over 14 dage"). The reset is mechanical, not a manual purge — see §5 "Which readings feed the baseline": the baseline reads only the current primary connection's readings, so a switch resets it automatically.

### What is NOT a data source in v1

- Apple Watch / HealthKit — separate native companion sub-project (W4).
- Camera-PPG — P0 NO-GO; retained code only, future native milestone.
- Garmin — deferred (partner approval).

### Code location

- `src/lib/hrv/wearables/` — one module per provider (`whoop.ts`, `oura.ts`, `polar.ts`), each exposing a common interface: `getAuthUrl()`, `exchangeCode()`, `refreshToken()`, `fetchLatestHrv()`. A shared `WearableProvider` type unifies them so the sync cron is provider-agnostic.
- `src/app/api/wearables/[provider]/callback/route.ts` — OAuth callback.
- `src/app/api/cron/hrv-wearable-sync/route.ts` — daily sync cron.

## 5. Baseline model & readiness

Unchanged from revision 3 — the algorithm core is source-agnostic and already shipped (`src/lib/hrv/baseline.ts`, Task 7). The input is now the wearable's daily RMSSD value rather than a camera-derived one.

### Signal pipeline

1. The provider sync yields a daily RMSSD (ms) per member.
2. lnRMSSD = ln(RMSSD). Stored on each `hrv_readings` row. All baseline math operates on lnRMSSD.

### Baseline framework (Plews et al. 2013)

- **Rolling 7-day mean** of lnRMSSD = short-term readiness signal.
- **Rolling 60-day mean** of lnRMSSD = personal baseline.
- **Within-subject SD** over the last 60 days.
- **SWC** = 0.5 × within-subject SD.

### Readiness — 5 buckets

`very_low` < baseline − 2·SWC · `low` < baseline − SWC · `normal` within ±SWC · `high` > baseline + SWC · `very_high` > baseline + 2·SWC. The 5-bucket extension is a MakeIt product choice, not Plews canon (Plews uses 3). Visualized as a 5-step vertical ladder, monochrome.

### Warm-up state

Derived from the count of synced daily readings on the current primary connection: `discovery` (< 7), `provisional` (7-13), `active` (≥ 14). `readiness_bucket` is null unless `active`. A newly connected wearable starts in `discovery`; an OAuth backfill (most providers return recent history) can jump-start this — **if the backfill yields ≥ 14 days of readings the member lands directly in `active` on connection day one** and the §6 state-B copy ("N dage tilbage") is skipped. Backfill is best-effort: not all providers return enough history, and a member who backfills, say, 9 days starts in `provisional`.

### Female cycle-phase adjustment

Opt-in, unchanged from revision 3. Member taps "Log menstrual start"; the algorithm learns per-cycle phase offsets; baseline comparison becomes phase-aware. Ships with W1.

### Which readings feed the baseline (baseline-reset mechanism)

Every `hrv_readings` row carries `connection_id` (the `hrv_wearable_connections` row that produced it — added in migration 0032). **The baseline for a member is computed only from readings whose `connection_id` equals the member's current primary connection.** This makes wearable-switching self-resetting:

- Member connected to WHOOP → readings have `connection_id = <whoop connection>` → baseline reads them.
- Member switches primary to a newly connected Oura → the Oura connection is a different row → its readings carry the new `connection_id` → the baseline naturally reads only Oura readings, and the member re-enters `discovery` warm-up. Old WHOOP readings stay in the table (history, never deleted) but are excluded from the baseline.

No reading is ever deleted on a switch; the filter does the reset. The warm-up day-count (§ below) likewise counts only current-primary-connection readings.

### Compute timing

- **On sync:** the sync cron recomputes 7-d mean, baseline, SWC, warm-up state, readiness bucket — over the current primary connection's readings — → persisted on the new `hrv_readings` row.
- Baseline is incremental — rolling state, no full replay.

## 6. UI & visualization

### Design principle

Existing MakeIt design tokens, monochrome, no color accents. 5-bucket readiness = a vertical ladder (filled / outline / sketch).

### `/hrv` — daily destination (3 states)

**A — No wearable connected:** editorial copy explaining the module + primary CTA "Forbind dit wearable" → opens the connection chooser (WHOOP / Oura / Polar, each launching its OAuth flow). Honest line about Apple Watch: "Apple Watch-support kommer med MakeIt-appen til iPhone."

**B — Connected, warming up (discovery/provisional, < 14 synced days):** "Vi bygger din baseline. N dage tilbage." Shows the latest synced RMSSD, no bucket, no actions.

**C — Connected, active (≥ 14 synced days):** large RMSSD value + 7-day mean + readiness ladder + bucket text + today's session CTA if relevant. A small "synced from WHOOP · 06:12" provenance line.

**Needs-reauth state:** if a connection's token refresh fails, a banner: "Din WHOOP-forbindelse skal fornyes" → re-runs OAuth.

### `/hrv/trends`

Empty/Discovery/Provisional/Active states as in revision 3 (§6). Active: lnRMSSD daily points + 7-day rolling mean (1.5px) + 60-day baseline band (±SWC, ~15% opacity). Annotations: travel/tz-shift flag, "sick" outline dots, cycle-phase gradient. Below: 30-day bucket distribution.

### `/hrv/insights`

Weekly Claude observation + per-factor correlation cards (alcohol / sleep / training), `n` always shown. Pre-W-insights-phase: empty-state copy.

### `/hrv/learn`

3-5 short editorial sections: what HRV is · why RMSSD · why no 0-100 score · why you can't compare your HRV to others · luteal-phase note · **why different wearables can't be compared**. Citation pass required before this ships.

### Dashboard chip

KPI tile on `/dashboard`: "HRV READINESS" + RMSSD + mini ladder + 7-d mean caption. Empty state when no wearable connected: "Forbind wearable".

### Components

```
src/components/hrv/
├── ReadinessLadder.tsx        # 5-bucket vertical ladder
├── TrendChart.tsx             # SVG native
├── WearableConnectSheet.tsx   # connection chooser + OAuth launch
├── ConnectionStatus.tsx       # connected / warming-up / needs-reauth
├── InsightCard.tsx
├── MiniSparkline.tsx
├── DeloadSuggestionSheet.tsx  # B-prong (later phase)
└── EmptyTrendsState.tsx
```

Camera-era components (`PPGCanvas`, `MeasurementSheet`) are **not built** in wearable-first v1. The shipped `src/lib/hrv/ppg.ts` is retained for the future native fallback.

### Mobile + accessibility

HRV in the mobile tab-bar; ladder has redundant text labels; charts have a data-table fallback; ≥44×44px targets.

## 7. Session integration & adaptive periodization

Unchanged from revision 3.

**B-prong (start-of-session suggestion):** when a member starts a session and `warm_up_state === 'active'` and readiness is `low`/`very_low`, `DeloadSuggestionSheet` offers Munk's deload version (−10% top sets, −1 working set). Choice persisted to `hrv_session_modifiers`.

**D-prong (adaptive periodization):** the existing Claude program generator (`src/lib/data/program-generator-claude.ts`) reads the 28-day HRV trend at regeneration. Anomaly trigger: 7-day mean below baseline − SWC for ≥ 10 consecutive days → insert a deload week. Honest framing card on `/coaching` about the weak strength-training evidence base.

These are later phases (after W1-W3); listed here so the data model supports them.

## 8. Coach flow, Claude weekly insights & Reps

### Coach red-flag-kø (Munk)

`/coach/queue` gains an HRV-anomalies section. Alert trigger — ALL 4 conditions:

0. Member's `warm_up_state = 'active'`.
1. 7-day mean below baseline − SWC for ≥ 3 consecutive days.
2. Mean RHR ≥ 10% above the member's 60-day RHR baseline (RHR is also available from the wearable sync).
3. At least one of: member tagged "syg"/"stresset" / last logged sleep < 6h / 3+ alcohol events in the last week.

Cron (`/api/cron/hrv-alert-detect`) creates `hrv_alerts`. Munk actions: send personal note (→ `coach_note_text` + Resend email), suggest pause (→ `hrv_session_modifiers`), mark seen.

### Claude weekly insights

Sunday-evening Vercel Cron, Claude Sonnet 4.6 with a cached system prompt. One ~150-word Danish observation per member with ≥ 14 days of data, plus structured lifestyle-correlation cards. Zod-validated output → `hrv_weekly_insights`. Template fallback if Claude fails. ~0.4¢/member/week.

### Reps integration

The original measurement-streak mechanic assumed a daily manual ritual; with auto-sync there is no ritual to reward. Reframed:

- **One-time bonus** for connecting a first wearable (+100 Reps) — rewards onboarding into the module.
- **Engagement milestones** — Reps for reviewing N weekly insights, or for sustained connection (e.g., 90 days of unbroken sync). Rewards staying engaged, not the passive existence of a wearable.
- Idempotent via `hrv_streak_events` (`UNIQUE (member_id, milestone)`).

Never reward the HRV value itself (high/low/improved) — outside the member's direct control.

## 9. Data model & RLS

### Already shipped — migration `0031_hrv_module.sql`

7 tables (`hrv_readings`, `hrv_lifestyle_logs`, `hrv_alerts`, `hrv_weekly_insights`, `hrv_settings`, `hrv_session_modifiers`, `hrv_streak_events`) + RLS. See git history. The wearable pivot requires **changes to two of them**, plus one new table, delivered as migration **`0032_hrv_wearables.sql`**.

### Migration `0032_hrv_wearables.sql`

Created in FK-dependency order: `hrv_wearable_connections` first (it is referenced by a new `hrv_readings` column), then the `hrv_readings` / `hrv_settings` alterations. Idempotent — `create ... if not exists`, `add column if not exists`, `drop ... if exists`.

**1. New table `hrv_wearable_connections`:**

```sql
create table if not exists public.hrv_wearable_connections (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  provider text not null check (provider in ('whoop', 'oura', 'polar')),
  provider_user_id text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  is_primary boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'needs_reauth', 'revoked')),
  connected_at timestamptz default now(),
  last_synced_at timestamptz,
  unique (member_id, provider)
);
create index if not exists idx_hrv_wearable_conn_member
  on public.hrv_wearable_connections (member_id);
create index if not exists idx_hrv_wearable_conn_sync
  on public.hrv_wearable_connections (status) where status = 'active';

-- At most one primary connection per member, enforced at the DB level.
create unique index if not exists idx_hrv_wearable_conn_one_primary
  on public.hrv_wearable_connections (member_id) where is_primary = true;
```

`is_primary` defaults to **false**. The connect server action sets `is_primary = true` only when it is the member's first connection; the "make primary" action flips the existing primary to false and the chosen row to true **inside one transaction** (so the partial unique index above is never transiently violated).

**2. Alter `hrv_readings`:**

```sql
-- rr_intervals: wearables deliver a computed RMSSD, not raw R-R intervals.
alter table public.hrv_readings alter column rr_intervals drop not null;

-- timezone: camera-era field for travel detection; wearable sync has no
-- live device timezone. Made nullable; populated only when available.
alter table public.hrv_readings alter column timezone drop not null;

-- source: replace the camera-era enum with wearable sources.
alter table public.hrv_readings drop constraint if exists hrv_readings_source_check;
alter table public.hrv_readings add constraint hrv_readings_source_check
  check (source in ('whoop', 'oura', 'polar', 'apple_health', 'camera_ppg'));

-- provider_recorded_at: the wearable's own timestamp for the measurement.
alter table public.hrv_readings add column if not exists provider_recorded_at timestamptz;

-- connection_id: ties each reading to the connection that produced it.
-- This is the baseline-reset mechanism (see §5).
alter table public.hrv_readings add column if not exists connection_id uuid
  references public.hrv_wearable_connections(id) on delete set null;
create index if not exists idx_hrv_readings_connection
  on public.hrv_readings (connection_id);
```

`apple_health` and `camera_ppg` stay reserved in the enum for W4 / the future native fallback; no v1 code writes them. **`confidence` stays `NOT NULL`** — the sync cron writes the constant `confidence = 'high'` (WHOOP/Oura/Polar are device-validated; there is no camera-style quality grade to assign), so no migration change is needed for that column.

**3. Retire `hrv_settings.preferred_source`:**

Migration 0031 created `hrv_settings.preferred_source` with a `check (... in ('camera_ppg','polar_h10'))` constraint — both the default and the enum are camera-era and the constraint would reject wearable values. Primary-wearable selection now lives in `hrv_wearable_connections.is_primary`, so the column is superseded:

```sql
alter table public.hrv_settings drop column if exists preferred_source;
```

**4. RLS for `hrv_wearable_connections`:**

```sql
alter table public.hrv_wearable_connections enable row level security;

-- Member reads their own connection rows (status / provenance for the UI).
drop policy if exists "members_read_own_connections" on public.hrv_wearable_connections;
create policy "members_read_own_connections" on public.hrv_wearable_connections
  for select using (member_id = auth.uid());
```

Coaches deliberately get **no** policy on this table — it holds OAuth tokens; there is no coach use case for it.

**Token security:** access/refresh tokens are sensitive. They are written and read **only** by server-side code (OAuth callback + sync cron) using the Supabase **service-role** key, which bypasses RLS. The member-facing RLS policy is `select`-only, and the application layer must **never** select the token columns into any client-reachable payload — the UI reads only `provider`, `status`, `is_primary`, `last_synced_at`. **W1 requirement (not deferred):** the `access_token` / `refresh_token` columns are encrypted at rest with `pgcrypto` (or Supabase Vault) — storing third-party OAuth refresh tokens in plaintext is an unacceptable liability for a premium product. The sync cron / callback encrypt on write and decrypt on read with a key held in a server-only env var.

### `vercel.json` — created in W1

```json
{
  "crons": [
    { "path": "/api/cron/hrv-wearable-sync",   "schedule": "0 5 * * *" },
    { "path": "/api/cron/hrv-alert-detect",    "schedule": "0 6 * * *" },
    { "path": "/api/cron/hrv-weekly-insights", "schedule": "0 18 * * 0" }
  ]
}
```

UTC schedules — `0 5 * * *` is 06:00 in Copenhagen winter time (CET) and 07:00 in summer time (CEST). The ±1h DST drift is immaterial for a once-daily morning sync. Only `hrv-wearable-sync` has a real handler in W1; `hrv-alert-detect` and `hrv-weekly-insights` are verified stub handlers (they still verify `CRON_SECRET`) until their phases ship. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; every handler verifies it. `CRON_SECRET` added to `.env.example` + Vercel project env.

## 10. Guardrails — what we refuse to do

- No 0-100 recovery score — show actual ms + baseline band.
- No cross-member comparison; no leaderboards.
- No cross-**wearable** comparison — each member's baseline is single-provider.
- No LF/HF as "sympatho-vagal balance" (Billman 2013).
- No "boost your HRV with [supplement]" content.
- No fused score (HRV + sleep + RHR bundled).
- No daily readiness from a single day's value — the signal is the 7-day mean.
- No false confidence on HRV-guided strength-training effects.
- Never expose OAuth tokens to the client.

## 11. Phasing

Phase 1 algorithm core (original P1: Vitest, types, migration 0031, `rmssd`/`baseline`/`ppg`/`mock`) is **shipped** (Tasks 1-8). `submitHrvReading` (original Task 9) is superseded — its algorithm calls are reused inside the sync cron.

| Phase | Content | Ships as |
|---|---|---|
| ✅ Core | Algorithm core + migration 0031 (Tasks 1-8) | — |
| **W1** | Migration 0032 · WHOOP module (`lib/hrv/wearables/whoop.ts`) · OAuth callback route · `hrv-wearable-sync` cron · `vercel.json` + `CRON_SECRET` · `/hrv` page (3 states) · `WearableConnectSheet` · `/settings` connection UI · nav registration | **New v1 — product owner dogfoods with their own WHOOP** |
| W2 | Oura module + OAuth (additive — reuses the W1 sync cron and UI) | "Oura support" |
| W3 | Polar module + OAuth (additive) | "Polar support" |
| W4 | **Native iOS HealthKit companion — separate sub-project, own spec.** Reads HRV from HealthKit, pushes to a MakeIt ingest endpoint that writes `hrv_readings` with `source='apple_health'` | "Apple Watch support" |
| V1.x | `/hrv/trends` + `TrendChart` + `ReadinessLadder` + `/dashboard` chip + `/hrv/learn` (+ citation pass) | Visualization |
| V2 | Lifestyle logs UI · Claude weekly insights · session B-prong · coach red-flag queue · adaptive periodization D-prong · Reps milestones | Full vision |

**W1 is the new v1** — a member connects WHOOP and sees their readiness. W2/W3 are additive. **W4 is a separate sub-project**: it is a native iOS app (stack TBD — Swift, or Expo/React Native, or Capacitor; decided in W4's own spec), needs an Apple Developer account and TestFlight distribution, and must not be conflated with the Next.js web module. It gets its own brainstorm → spec → plan cycle once W1-W3 are delivered.

### W1 concretely (plan-revision target)

1. Migration `0032_hrv_wearables.sql` — new `hrv_wearable_connections` table (+ partial unique index on primary) + RLS, alter `hrv_readings` (`rr_intervals`/`timezone` nullable, `source` enum, `provider_recorded_at` + `connection_id` columns), drop `hrv_settings.preferred_source`.
2. **Token encryption** — enable `pgcrypto`; the OAuth callback / sync code encrypt `access_token` + `refresh_token` on write and decrypt on read, keyed by a server-only `HRV_TOKEN_ENC_KEY` env var. Decide the column type during planning (`pgp_sym_encrypt` returns `bytea` — keep `text` via armored output, or switch the column to `bytea`). This is a W1 requirement, not deferred.
3. Regenerate `database.types.ts` (after 0032 is applied).
4. `src/lib/hrv/wearables/types.ts` — the `WearableProvider` interface.
5. `src/lib/hrv/wearables/whoop.ts` — WHOOP OAuth + `fetchLatestHrv`, unit-tested with mocked API responses.
6. `src/lib/hrv/wearables/sync.ts` — provider-agnostic sync logic (refresh token → fetch → map → run baseline → write reading), unit-tested.
7. `src/app/api/wearables/[provider]/callback/route.ts` — OAuth callback.
8. `src/app/(app)/hrv/connect-actions.ts` — server actions to start an OAuth flow + disconnect.
9. `src/app/api/cron/hrv-wearable-sync/route.ts` (real handler) + `src/app/api/cron/hrv-alert-detect/route.ts` and `src/app/api/cron/hrv-weekly-insights/route.ts` (verified stubs — `CRON_SECRET`-checked, return ok) + `vercel.json` + `CRON_SECRET` in `.env.example`.
10. `src/app/(app)/hrv/page.tsx` — 3 states (no-connection / warming-up / active).
11. `src/components/hrv/WearableConnectSheet.tsx` + `ConnectionStatus.tsx`.
12. `/settings` HRV section — connections list, connect/disconnect, primary selection, cycle-tracking toggle.
13. Nav registration (`AppShell.tsx` + `MobileTabBar.tsx`).

## 12. Open questions / future work

- **WHOOP/Oura/Polar API specifics** — exact endpoint shapes, rate limits, token lifetimes, and OAuth app registration must be verified against current provider docs during W1 planning (provider APIs change; do not trust memory).
- **W4 native iOS companion** — separate sub-project. Stack choice (Swift vs Expo vs Capacitor), Apple Developer account, HealthKit entitlement, TestFlight distribution — all decided in W4's own spec.
- **Webhooks** — WHOOP and Oura support push webhooks; a later optimization over cron polling.
- **Token encryption** — `pgcrypto` / Supabase Vault for the OAuth token columns; v1 hardening item.
- **Garmin** — revisit if crew demand warrants the partner-approval process.
- **Camera-PPG** — revisit only inside a native app, where full camera control makes it viable (P0 spike findings).
- **Reference verification** — the HRV science brief's citations need PubMed verification before any appear in `/hrv/learn`.
