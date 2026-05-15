# MakeIt HQ — HRV Module Design Spec

**Date:** 2026-05-15
**Status:** Design approved — ready for implementation planning
**Module path:** `/hrv` (new top-level route, parallel to `/coaching`, `/train`, `/form-check`)
**Spec revision:** 2 (post-review)

> Research foundation: [`docs/research/HRV_SCIENCE_BRIEF.md`](../../research/HRV_SCIENCE_BRIEF.md) (HRV science) + [`docs/research/HRV_PLATFORMS_BENCHMARK.md`](../../research/HRV_PLATFORMS_BENCHMARK.md) (competitive landscape including Ruut Labs)

---

## 0. References to existing codebase (verified)

This spec depends on artifacts already in the repo. Listed here as the integration surface — the implementation plan must verify each is unchanged before P1 starts:

| Artifact | Path | Used by |
|---|---|---|
| Latest migration | `supabase/migrations/0030_session_exercises_backfill.sql` | Next migration = `0031` |
| Coach detection RLS function | `supabase/migrations/0004_coach.sql` → `public.is_current_user_coach()` | All coach-read RLS policies |
| Coach notes (existing) | `form_checks.coach_notes` **text column** (NOT a table) | §8 alert flow — uses an analogous text column on `hrv_alerts`, NOT a FK |
| Member table | `members` (from `0001_init.sql`) | All FKs |
| Reps event mechanism | `0007_rewards.sql` / `0008_tier_promotion.sql` / `0009_tier_events.sql` | §8 Reps integration |
| Form-check sheet pattern | `src/components/ui/FormCheckSheet.tsx` | Architectural precedent for `MeasurementSheet` |
| Claude program generator | `src/lib/data/program-generator-claude.ts` | §7 D-prong extension target |
| Resend email integration | `src/lib/email/resend.ts` + `templates/` | §8 coach notification path |
| Stripe webhook auth pattern | `src/app/api/stripe/webhook/route.ts` | Reference only — webhook ≠ cron, P1 establishes the **new** cron pattern |
| Vercel project config | **`vercel.json` does NOT exist** | P1 creates it from scratch |
| Existing cron handlers | **None** | P1 establishes the pattern |
| `CRON_SECRET` env var | **Not yet defined** | P1 adds to `.env.example` + Vercel dashboard |

---

## 1. Overview & positioning

MakeIt HQ adds a dedicated HRV module — `/hrv` — that owns Heart Rate Variability measurement, baselining, trend analysis, daily readiness signaling, lifestyle correlation insights, session-level integration, adaptive program periodization, and a coach (Munk) red-flag review queue. The module is a full HRV ecosystem (not a sidebar metric), positioned in the white space identified by competitive research: **rigorous measurement + deep coaching + strength-training focus** — a corner of the market no incumbent owns (Ruut has the coaching but opaque methodology; HRV4Training has the science but no coaching/community; WHOOP/Oura have data but black-box it).

**Brand positioning:** science-first, ruthlessly honest. The module visibly refuses things competitors do — no 0–100 recovery score, no peer comparison, no LF/HF "stress balance" UI, no population percentiles, no supplement upsells. The crew is sophisticated enough to value rigor over confetti, and that's a defensible market position.

## 2. Goals & non-goals

### Goals

- Give every member a reliable, validated daily HRV signal (lnRMSSD via Plews 7d/60d/SWC framework).
- Detect early-warning patterns for illness, overreaching, and lifestyle imbalance — surface them to the member and (conditionally) to the coach.
- Modulate the existing training engine (`/session`, `/coaching`) so HRV influences both today's session and long-term periodization.
- Generate weekly personalized insights via Claude that surface real, user-specific lifestyle correlations (alcohol, sleep, training load).
- Reward consistent measurement with the existing Reps loyalty mechanism — without ever rewarding the physiological value itself.

### Non-goals (v1)

- 24/7 HRV monitoring (we are a morning-measurement product, not a WHOOP competitor).
- Native iOS Polar H10 support (parked to a later milestone — companion PWA or native iOS app).
- Apple HealthKit fallback at launch (deferred to v2 once we have a validated per-member SDNN↔RMSSD normalization curve).
- WHOOP, Oura, Garmin, Fitbit API ingestion.
- Live HR during workouts.
- Cross-member ranking, peer leaderboards, age-percentile comparisons.

### Platform support — v1 explicit

| Path | Android (Chrome) | iOS (Safari) | Desktop |
|---|---|---|---|
| Camera-PPG (primary) | ✅ with torch | ✅ without torch (finger-press, ambient light) | ❌ (no rear camera) |
| Polar H10 (secondary) | ✅ Web Bluetooth | ❌ deferred to later milestone | ❌ |
| Measurement viewing (`/hrv/trends` etc.) | ✅ | ✅ | ✅ |

iOS Safari does not expose torch control via `MediaTrackConstraints` (verified 2026 Safari). v1 supports iOS camera-PPG **without torch** — the member presses fingertip firmly against the rear camera lens; ambient light through tissue produces a usable PPG signal. HRV4Training operates this way on iOS today. SNR is marginally lower; we accept the tradeoff.

## 3. Information architecture

**Top-level route:** `/hrv` (sidebar position 4 of 6: Today / Træn / Crew / **HRV** / Reps / Mig).

**Mobile tab-bar:** HRV replaces Reps as primary; Reps moves to secondary nav under Mig.

**Pages under `/hrv`:**

- `/hrv` — morning destination. Three states (Discovery / Provisional / Active) depending on measurement maturity.
- `/hrv/trends` — historical chart with lnRMSSD dots, 7-day rolling mean, 60-day baseline band ±SWC. (Empty/Discovery state defined in §6.)
- `/hrv/insights` — weekly Claude-generated observation + lifestyle correlation cards. (Empty state pre-P4 defined in §6.)
- `/hrv/learn` — short editorial intro to HRV science, what we measure, what we refuse to do.

**Cross-module touchpoints:**

- `/dashboard` — HRV-readiness KPI chip at top.
- `/session/[id]` — start-of-session prompt reads HRV status (§7 — B-prong).
- `/coaching` — AI program-gen reads HRV trends at regeneration (§7 — D-prong).
- `/coach/queue` — Munk's red-flag-kø alongside existing form-check queue (§8).
- `/reps` — streak rewards for consistent morning measurement (§8).
- `/settings` — source preference, integration toggles, raw R-R export, cycle-tracking toggle + `menstrual_start` log entry point (ships in P1, see §11).

**Design tokens:** existing system. No new colors. New visual primitive: 5-bucket readiness ladder. Components in `src/components/hrv/`.

## 4. Data sources & measurement

### Primary: smartphone camera PPG (60-second morning measurement)

**Capture pipeline:**

1. `getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } })` — rear camera at 30 fps.
2. On Android Chrome: attempt `track.applyConstraints({ advanced: [{ torch: true }] })` for backlight. On iOS Safari (no torch support): instruct member to press finger firmly against camera; ambient light through tissue is sufficient.
3. Each video frame → canvas → extract **mean red-channel intensity** over a 100×100 px center ROI. Each frame produces one PPG sample at 30 Hz.
4. Stream 60s of samples to `PPGCanvas.tsx` ring buffer (1800 samples).

**Signal processing (`src/lib/hrv/ppg.ts`):**

- **Detrend:** subtract 2nd-order polynomial fit (removes slow brightness drift from hand movement).
- **Bandpass filter:** 0.5–3 Hz Butterworth (cuts DC + high-freq noise; HR range is 30–180 bpm = 0.5–3 Hz).
- **Adaptive threshold peak detection:** sliding 5s window, peak = local maximum exceeding `mean + 0.3 × (max − mean)` of window. Refractory period 300ms (prevents double-counting). This is the HRV4Training canonical approach as documented by Altini, and matches what `hrv-analysis` Python libs use.
- **Output:** array of timestamps for each detected peak → R-R intervals (ms) = diff between consecutive timestamps.

**Quality control:**

- **SNR metric:** ratio of bandpass energy (0.5–3 Hz) to out-of-band energy. SNR < 3 dB → "weak signal" warning to UI.
- **Live retry trigger:** if < 30 peaks detected in first 30s OR SNR < 3 dB OR ectopic % > 10 in partial window → extend by 15s, max 90s.
- **Ectopic filter (PRE-RMSSD):** any R-R interval deviating > **25 %** from the **moving median of the previous 5 intervals** is flagged as ectopic. Threshold based on Tarkiainen et al. methodology used in clinical HRV preprocessing; conservative for short recordings. If > 5 % of intervals are ectopic, reading rejected with retry prompt.

UI under measurement: live waveform visualization (monochrome from anatomy module), 60s countdown, copy *"Træk vejret som du plejer. Det er ikke en breathing exercise."*

Output: raw R-R array → server action → RMSSD, lnRMSSD, mean HR → `hrv_readings` row.

### Secondary: Polar H10 chest strap (Android Chrome only in v1)

- Pair over **Web Bluetooth API** (Chrome/Android). iOS Safari does not support Web Bluetooth — iOS Polar users parked to later milestone (companion PWA or native app).
- Same 60s flow, output marked `source: 'polar_h10'` with higher confidence.
- We link to hardware (~600 DKK), don't sell.

### NOT in v1

- Apple HealthKit fallback (SDNN ≠ RMSSD; needs per-member calibration cohort first — see v2 in §12).
- WHOOP/Oura/Garmin/Fitbit native APIs.

### Edge cases & data hygiene

- **Switching sources:** baseline reset (cross-source pooling forbidden). UI: *"Ny baseline genopbygges over 14 dage."* **P1 caveat:** during the internal pilot (P1 only), if Munk or a pilot member switches source mid-pilot, baseline pollutes across sources. Acceptable for a 2-week internal pilot; P5 ships the reset enforcement.
- **Missed days:** no imputation. Plews' "measured-day rolling mean", not calendar-week.
- **Travel/jetlag:** tag readings with timezone. Trends-view flags days with > 3h tz shift.
- **Illness:** member tags day as "syg" → excluded from baseline update, retained as event for insights engine.

## 5. Baseline model & readiness

### Signal pipeline

1. R-R array → quality filter (ectopic exclusion, §4).
2. RMSSD = √(mean of squared successive differences).
3. lnRMSSD = ln(RMSSD). Stored on each reading. UI displays raw ms; **all baseline calculations operate on lnRMSSD** (Plews et al. 2013).

### Baseline framework

Following Plews et al. 2013 (Sports Medicine, applied HRV consensus paper):

- **Rolling 7-day mean** of lnRMSSD = short-term readiness signal.
- **Rolling 60-day mean** of lnRMSSD = personal baseline.
- **Within-subject SD** computed over the last 60 days.
- **SWC (Smallest Worthwhile Change)** = 0.5 × within-subject SD.

### Warm-up state vs readiness bucket

These are **two orthogonal concepts** and stored as two separate columns (see §9):

- **Warm-up state** (`warm_up_state`): derived from day-count of valid readings. Values: `discovery` (< 7 days), `provisional` (7–13 days), `active` (≥ 14 days).
- **Readiness bucket** (`readiness_bucket`): derived from 7-day mean vs baseline. Nullable when `warm_up_state ≠ active`. Values: `very_low`, `low`, `normal`, `high`, `very_high`.

### Readiness — 5 buckets

| Bucket | Threshold (7-d mean vs baseline) |
|---|---|
| `very_low` | < baseline − 2 × SWC |
| `low` | baseline − 2 × SWC ≤ 7-d < baseline − SWC |
| `normal` | within ± SWC |
| `high` | baseline + SWC < 7-d ≤ baseline + 2 × SWC |
| `very_high` | > baseline + 2 × SWC |

**Attribution:** the science brief recommends a 3-bucket framework (above / within / below SWC band) directly from Plews. The 5-bucket extension to ± 2 × SWC is a **MakeIt product choice** — it gives members more sense of where in the distribution they sit without slipping into pseudo-precision territory. This is a deliberate elaboration, not Plews canon. Documented here so the implementation owner doesn't think it's settled science.

### Female cycle-phase adjustment

**v1 ships with phase-specific baseline available, but cycle-tracking is opt-in.**

- Setting under `/settings`: "Tilføj cyklus-tracking" — opt-in (ships in P1).
- Member taps "Log menstrual start" (a single date picker + write to `hrv_lifestyle_logs`, event_type `menstrual_start`) — UI ships in P1 (not P3 as originally drafted; the lifestyle-log table is created in P1 anyway, only this one entry point UI is needed at v1 launch).
- Algorithm learns per-cycle phase offsets over 2–3 cycles.
- Baseline comparison: "same phase previous cycle" + 60-day overall mean.

If not enabled: unisex baseline, with explicit copy on `/hrv/learn` describing the cyclic variation members may experience.

### Compute timing

- **On submit:** server action recomputes 7-d mean, baseline, SWC, warm_up_state, readiness_bucket → persisted on the `hrv_readings` row.
- **Nightly cron (00:00 Europe/Copenhagen = 23:00 UTC):** streak-status updates, not baseline.
- **Baseline:** incremental computation — rolling state stored, no full replay.

### Code location

- `src/lib/hrv/ppg.ts` — PPG signal processing (bandpass + peak detection + SNR). Pure functions, unit-testable.
- `src/lib/hrv/rmssd.ts` — R-R → RMSSD + ectopic filter. Pure, unit-testable.
- `src/lib/hrv/baseline.ts` — rolling means + SWC + bucket classification. Pure, unit-testable.

**Unit tests from day one.** Test vectors from public HRV4Training Pro validation data and PhysioNet datasets. This is the algorithmic core; failure here undermines module credibility.

## 6. UI & visualization

### Design principle

Existing MakeIt design tokens. No color accents. No red/yellow/green semaphores. Hierarchy via typography size, stroke weight, position.

5-bucket readiness uses a **vertical ladder**: 5 horizontal segments stacked, bottom-up from very-low to very-high. Current bucket = filled block; adjacent = outline; distant = thin sketch. Readable without color or text.

### `/hrv` — morning destination (3 states)

**A — Not measured today (any warm-up state):** Large display "*God morgen. 60 sekunder.*" + primary CTA "Mål nu" + secondary "Sov endnu lidt". Below: mini-trend if data exists; otherwise blank space.

**B — Measured, Active warm-up state (day 14+):** Large RMSSD value (e.g. `72 ms`), under: 7-d mean + ladder + bucket text + today's session CTA if relevant.

**C — Measured, Discovery or Provisional warm-up state (day 1–13):** Value + honest copy ("*Vi bygger din baseline. 4 dage tilbage.*") — no bucket, no actions.

### `/hrv/trends` — history

**Empty/Discovery state (zero or < 7 readings):** Page renders the chart axes as faint scaffolding + an editorial copy block: *"Vi viser dit forløb her, så snart vi har 7 dages data. Indtil da: dine målinger ligger trygt gemt."* No fake placeholder data, no skeleton flicker.

**Provisional state (7–13 readings):** Chart renders dots + 7-day mean line but **no baseline band yet** (baseline needs > 14 days). Copy: *"Vi bygger din baseline. Når den er klar, kommer båndet."*

**Active state (≥ 14 readings):** Full chart — central area: X = dates (default 30, zoom 60/180), Y = lnRMSSD (UI shows raw ms via inverse log). Daily dots (off-white, small), 7-day rolling mean (1.5 px line), 60-day baseline band (translucent stripe ± SWC, ~15 % opacity).

Annotations: travel/tz-shift → flag glyph; "sick" days → outline dot; cycle phase → thin horizontal gradient behind x-axis segment.

Below chart: bucket-distribution last 30 days as 5 horizontal bars.

### `/hrv/insights` — weekly observation

**Pre-P4 (insights skeleton, P3):** page renders empty-state card: *"Vi skriver din ugentlige observation hver søndag. Den første lander om \[N\] dage."* (No fake content.)

**P4+ (full):**

```
Uge 19, 2026

Tom, din 7-dages mean steg 5.2 % denne uge — drevet af to lyse nætter
(>7t søvn) og ingen alkohol-events. Til sammenligning var uge 17
dæmpet, og det matcher tre dage med >2 drinks. Sammenhængen er nu
robust nok til at vi tør sige det højt: alkohol koster dig konsistent
omkring 6–8 % af din baseline.
```

Below: correlation cards per lifestyle factor:

```
ALKOHOL
0 drinks (n=44): +2 % vs baseline
1–2 drinks (n=12): −3 %
3+ drinks (n=8): −7 %
```

No p-values, but `n` always shown.

### `/hrv/learn` — intro page

3–5 sections, max 100 words each: *Hvad er HRV? · Hvorfor RMSSD? · Hvorfor du ikke får et 0–100 score · Hvorfor du ikke kan sammenligne din HRV med andre · Hvad luteal-fase betyder for kvindelige medlemmer.*

Editorial tone, narrow text column, no illustrations. **Citation pass required before P2 ship** — see §12.

### Dashboard chip on `/dashboard`

**Empty/Discovery state:** chip shows label "HRV READINESS" + copy "*Mål for at se*" + the mini ladder rendered in fully-empty state. No fake value.

**Active state:** label, large ms value, mini ladder, caption with 7-d mean. Tap → `/hrv`.

### Components

```
src/components/hrv/
├── ReadinessLadder.tsx        # 5-bucket vertical ladder
├── TrendChart.tsx             # SVG native (not recharts — avoids default color styling)
├── MeasurementSheet.tsx       # bottom sheet, same arch as FormCheckSheet
├── PPGCanvas.tsx              # getUserMedia + canvas + peak detection
├── PolarBluetoothPair.tsx     # Web Bluetooth flow (Android only)
├── InsightCard.tsx            # /hrv/insights correlation cards
├── MiniSparkline.tsx          # dashboard chip + /hrv mini-trend
├── DeloadSuggestionSheet.tsx  # B-prong session integration
└── EmptyTrendsState.tsx       # /hrv/trends empty / discovery state
```

### Mobile + accessibility

- HRV replaces Reps in mobile tab-bar primary nav.
- "Mål nu" CTA on `/hrv` state A: bottom-fixed sticky.
- Ladder has redundant text label for screen readers.
- Charts have data-table fallback behind "se data" disclosure.
- All interactive elements ≥ 44 × 44 px.

## 7. Session integration & adaptive periodization

### B-prong: start-of-session suggestion

When member taps "Start workout" on `/session/[id]`:

```ts
if (warmUpState === 'active' && (readiness === 'very_low' || readiness === 'low')) {
  show DeloadSuggestionSheet
}
```

**DeloadSuggestionSheet** (new component, FormCheckSheet architecture):

```
Din 7-dages mean er [X%] under baseline.

To muligheder:
[primary]   Brug Munk's deload-version af i dag
            — samme øvelser, -10% på top-sæt, færre arbejdssæt
[secondary] Kør planen som den er
            — vi noterer at du valgte at presse igennem

Du kan slå denne suggestion fra under Settings → HRV.
```

If deload picked: session modified in-memory (NOT the program). Top-set weights × 0.9, working-set count − 1 (min 2). Persisted as `hrv_session_modifiers` row with `applied_value: { top_set_pct: 0.9, working_set_delta: -1 }`.

Suggestion NOT shown if: warm-up state ≠ active, member disabled toggle, today is already a planned deload week.

### D-prong: adaptive periodization

Extends `src/lib/data/program-generator-claude.ts` (existing) to read HRV trends at program regeneration.

**Re-generation triggers:**

1. End of 4-week block (existing trigger) — now with HRV trend as input.
2. **Anomaly trigger:** 7-day mean below baseline − SWC for **≥ 10 consecutive days** without already being in a deload. Algorithm inserts a deload week from next Monday.
3. Manual: Munk via coach-dashboard.

**Claude prompt inputs (additions):**

- 28-day lnRMSSD trend + 7-d mean + baseline.
- Readiness-bucket distribution (last 28 days).
- B-prong suggestion adherence (e.g., "4 of 7 followed").
- Illness events.
- Subjective wellness logs.

**Output:** Zod-validated program JSON (same tool-use pattern as existing program-gen). Member notification: *"Munk og algoritmen har justeret dine næste 4 uger. Se ændringer →"*

**Honest framing UI on `/coaching`:**

> *"Vi indsatte en deload-uge baseret på din HRV-trend. Evidensen for HRV-styret styrketræning er mindre etableret end for udholdenhedstræning — vi følger principper fra Vesterinen og Plews, anvendt med forsigtighed. Du kan altid skippe deload'en hvis du føler dig klar."*

### Explicitly NOT in v1

- Auto-modulation mid-session (never change weights during a set the member is lifting).
- Push notifications during rest periods based on intra-session HR.
- HRV-based pre-workout warmup customization.

## 8. Coach flow, Claude weekly insights & Reps

### Coach red-flag-kø (Munk)

`/coach/queue` gets a new HRV-anomalies section alongside form-check queue.

**Alert trigger — ALL 3 conditions must hit simultaneously:**

1. 7-day mean below baseline − SWC for ≥ 3 consecutive days.
2. Mean RHR ≥ 10 % above member's 60-day RHR baseline.
3. At least one of: member tagged "syg" / "stresset" / last logged sleep < 6h / 3+ alcohol events in last week.

Cron job (`/api/cron/hrv-alert-detect`, 07:00 Europe/Copenhagen) runs detection, creates `hrv_alerts` row.

**Munk sees per alert:**

```
[member name, handle]
Anomali: 4 dage under baseline (−8.4%), RHR +12%
Sidste session: i mandags (gennemført)
Subjective tags: "stresset" (tirsdag), 2 alkohol-events

[Send personlig note]  [Foreslå pause (1-3 dage)]  [Marker som "set, ingen handling"]
```

- **Send personlig note** → writes Munk's text to `hrv_alerts.coach_note_text` + Resend email to member.
- **Foreslå pause** → creates `hrv_session_modifiers` row suspending sessions 1–3 days.

**Note on coach_notes:** the existing `coach_notes` is a text column on `form_checks`, not a table. We mirror the same pattern — `coach_note_text TEXT` on `hrv_alerts` — to avoid premature abstraction. If we later need a unified note system across modules, we extract it then.

### Claude weekly insights

- **When:** Sunday 20:00 Europe/Copenhagen, Vercel Cron, all members with ≥ 14 days of data.
- **Model:** Claude Sonnet 4.6 with cached system prompt (~2 K tokens, 5-min TTL — same pattern as program-gen).
- **System prompt:** "HRV-insight-analyst for MakeIt HQ. Write one weekly observation in Danish, second person, ~150 words, honest and specific. Tone: editorial, not wellness-coach. Never population claims, never 'boost your HRV', never p-values in prose. If a correlation has n < 5 OR coefficient of variation > 0.5, state it as 'tentative' rather than asserted."
- **User prompt:** member's week — HRV trend, sleep, alcohol, sessions with RPE/volume, subjective tags, historical correlation data.
- **Cost & batching:** ~2 K cached + ~500 input + ~250 output ≈ 0.4 ¢/member/week. Batching: cron iterates members sequentially; with ~100 members × ~3 s/insight ≈ 5 minutes total, the prompt cache stays warm for > 95 % of calls. Total ≈ 40 ¢/week at 100 members.
- **Output:** Zod-validated `{ summary_text, correlation_cards }` → persisted in `hrv_weekly_insights`.
- **Fallback:** template-based observation if Claude fails — never user-visible error.

### Reps integration

Extend existing event-driven earn mechanism (migrations 0007/0008/0009) with new event type `hrv_streak_milestone`:

| Streak | Reps awarded |
|---|---|
| 7 days | +50 |
| 14 days | +100 |
| 30 days | +250 + tier-progress event |
| 90 days | +750 + special badge |

**Idempotency:** `hrv_streak_events` (lightweight join table, see §9) carries a `UNIQUE (member_id, milestone)` constraint — milestone hit once = paid once. Prevents farming via gap-and-rebuild.

**Reward the ritual, not the value.** No Reps for "improvement", "high HRV", "above-baseline weeks". Only for the measurable behavior (daily measurement).

## 9. Data model & RLS

Migration: **`0031_hrv_module.sql`** (next free number, idempotent, same style as existing migrations).

### Tables

#### `hrv_readings`

```sql
create table public.hrv_readings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  measured_at timestamptz not null,

  source text not null check (source in ('camera_ppg', 'polar_h10')),
  -- 'apple_health_sdnn' reserved for v2
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  quality_warnings jsonb,                     -- {ectopic_pct: 2.1, snr_db: 12.3}

  rr_intervals jsonb not null,                -- raw R-R, kept for re-analysis
  rmssd_ms numeric(6,2) not null,
  ln_rmssd numeric(8,4) not null,
  mean_hr_bpm numeric(5,2),

  rolling_7d_mean_lnrmssd numeric(8,4),       -- null in discovery state
  baseline_60d_mean_lnrmssd numeric(8,4),
  baseline_60d_swc numeric(8,4),

  warm_up_state text not null
    check (warm_up_state in ('discovery', 'provisional', 'active')),
  readiness_bucket text
    check (readiness_bucket in ('very_low', 'low', 'normal', 'high', 'very_high')),
  -- readiness_bucket nullable when warm_up_state != 'active'

  cycle_phase text
    check (cycle_phase in ('menstrual', 'follicular', 'ovulatory', 'luteal')),
  timezone text not null,
  is_sick boolean default false,

  inserted_at timestamptz default now()
);

create index on public.hrv_readings (member_id, measured_at desc);
create index on public.hrv_readings (member_id, is_sick) where is_sick = false;
```

#### `hrv_lifestyle_logs`

```sql
create table public.hrv_lifestyle_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  logged_for_date date not null,
  event_type text not null check (event_type in
    ('alcohol_drinks', 'sleep_hours', 'feeling', 'late_meal', 'sick', 'menstrual_start')),
  value jsonb not null,                       -- {count: 3} / {hours: 7.5} / {state: 'stressed'} / {start: '2026-05-15'}
  inserted_at timestamptz default now()
);

create index on public.hrv_lifestyle_logs (member_id, logged_for_date desc);
```

#### `hrv_alerts`

```sql
create table public.hrv_alerts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  triggered_at timestamptz default now(),

  conditions_met jsonb not null,              -- {hrv_drop_days: 4, hrv_drop_pct: -8.4, rhr_increase_pct: 12, subjective_tags: ['stressed', 'alcohol_3plus']}

  status text not null default 'open'
    check (status in ('open', 'reviewed_noted', 'reviewed_actioned', 'auto_resolved')),
  coach_note_text text,                       -- inline text, mirrors form_checks.coach_notes pattern (NOT a FK)
  session_modifier_id uuid references public.hrv_session_modifiers(id),
  reviewed_at timestamptz,
  reviewed_by uuid references public.members(id)
);

create index on public.hrv_alerts (status, triggered_at desc) where status = 'open';
```

#### `hrv_weekly_insights`

```sql
create table public.hrv_weekly_insights (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  week_start date not null,

  summary_text text not null,                 -- ~150 words
  correlation_cards jsonb not null,           -- structured for /hrv/insights cards

  claude_model_id text not null,
  tokens_used int,
  generated_at timestamptz default now(),

  unique (member_id, week_start)
);
```

#### `hrv_settings`

```sql
create table public.hrv_settings (
  member_id uuid primary key references public.members(id) on delete cascade,
  preferred_source text default 'camera_ppg'
    check (preferred_source in ('camera_ppg', 'polar_h10')),
  session_suggestion_enabled boolean default true,
  cycle_tracking_enabled boolean default false,
  share_to_coach boolean default true,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**Note on `share_to_coach` revocation:** setting `share_to_coach=false` revokes coach reads going forward. If Munk has already read the data prior to revocation, no recall is possible. Documented in `/hrv/learn` and in settings copy.

#### `hrv_session_modifiers`

```sql
create table public.hrv_session_modifiers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  session_id uuid references public.sessions(id),
  program_id uuid references public.programs(id),

  modifier_type text not null check (modifier_type in
    ('top_set_reduction', 'volume_reduction', 'deload_week_insertion', 'paused_session')),
  applied_value jsonb,
  -- Shapes by modifier_type:
  --   top_set_reduction:        {top_set_pct: 0.9, working_set_delta: -1}
  --   volume_reduction:         {volume_pct: 0.8}
  --   deload_week_insertion:    {weeks_added: 1, starts_on: '2026-05-18'}
  --   paused_session:           {paused_until: '2026-05-20'}
  reason text not null check (reason in
    ('hrv_low_readiness_b_prong', 'hrv_sustained_low_d_prong', 'coach_pause_from_alert')),

  accepted_by_member boolean,

  created_at timestamptz default now()
);

create index on public.hrv_session_modifiers (member_id, created_at desc);
```

#### `hrv_streak_events`

```sql
create table public.hrv_streak_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  milestone int not null check (milestone in (7, 14, 30, 90)),
  reps_awarded int not null,
  triggered_at timestamptz default now(),
  unique (member_id, milestone)               -- idempotency
);
```

### RLS policies — explicit, not "analogous"

```sql
alter table public.hrv_readings           enable row level security;
alter table public.hrv_lifestyle_logs     enable row level security;
alter table public.hrv_alerts             enable row level security;
alter table public.hrv_weekly_insights    enable row level security;
alter table public.hrv_settings           enable row level security;
alter table public.hrv_session_modifiers  enable row level security;
alter table public.hrv_streak_events      enable row level security;

-- Members own their data (one policy per table, listed explicitly)
create policy "members_own_readings"           on public.hrv_readings           for all using (member_id = auth.uid());
create policy "members_own_lifestyle_logs"     on public.hrv_lifestyle_logs     for all using (member_id = auth.uid());
create policy "members_own_weekly_insights"    on public.hrv_weekly_insights    for select using (member_id = auth.uid());
create policy "members_own_settings"           on public.hrv_settings           for all using (member_id = auth.uid());
create policy "members_own_session_modifiers"  on public.hrv_session_modifiers  for select using (member_id = auth.uid());
create policy "members_own_streak_events"      on public.hrv_streak_events      for select using (member_id = auth.uid());
-- hrv_alerts: members can read their own alerts (but not modify)
create policy "members_read_own_alerts"        on public.hrv_alerts             for select using (member_id = auth.uid());

-- Coach reads individual member data ONLY when member opted in (share_to_coach = true)
create policy "coach_reads_opted_readings" on public.hrv_readings
  for select using (
    public.is_current_user_coach()
    and exists (
      select 1 from public.hrv_settings s
      where s.member_id = hrv_readings.member_id
        and s.share_to_coach = true
    )
  );

create policy "coach_reads_opted_lifestyle_logs" on public.hrv_lifestyle_logs
  for select using (
    public.is_current_user_coach()
    and exists (
      select 1 from public.hrv_settings s
      where s.member_id = hrv_lifestyle_logs.member_id
        and s.share_to_coach = true
    )
  );

create policy "coach_reads_opted_weekly_insights" on public.hrv_weekly_insights
  for select using (
    public.is_current_user_coach()
    and exists (
      select 1 from public.hrv_settings s
      where s.member_id = hrv_weekly_insights.member_id
        and s.share_to_coach = true
    )
  );

create policy "coach_reads_opted_session_modifiers" on public.hrv_session_modifiers
  for select using (
    public.is_current_user_coach()
    and exists (
      select 1 from public.hrv_settings s
      where s.member_id = hrv_session_modifiers.member_id
        and s.share_to_coach = true
    )
  );

-- Coach always reads + manages alerts (the entire point of the role)
create policy "coach_manages_alerts" on public.hrv_alerts
  for all using (public.is_current_user_coach());

-- Coach reads streak events for crew context (anonymous in aggregate)
create policy "coach_reads_streak_events" on public.hrv_streak_events
  for select using (public.is_current_user_coach());

-- Service role (cron jobs) bypasses RLS via SUPABASE_SERVICE_ROLE_KEY — no policy needed
```

**Critical:** `rr_intervals` (raw R-R data) is sensitive. Server actions can read it for re-analysis; `/hrv/trends` and `/hrv/insights` receive only derived values. Browser bundle never sees raw R-R from other members (RLS enforces).

### `vercel.json` — created from scratch in P1

The repo has **no `vercel.json` today** and **no existing cron handlers**. P1 introduces both:

```json
{
  "crons": [
    { "path": "/api/cron/hrv-streak-check",    "schedule": "0 23 * * *" },
    { "path": "/api/cron/hrv-alert-detect",    "schedule": "0 5 * * *" },
    { "path": "/api/cron/hrv-weekly-insights", "schedule": "0 18 * * 0" }
  ]
}
```

Schedules are in **UTC** (Vercel Cron uses UTC). The above resolve to:

- `hrv-streak-check`: 00:00 Europe/Copenhagen (CET) / 01:00 CEST
- `hrv-alert-detect`: 06:00 Europe/Copenhagen (CET) / 07:00 CEST
- `hrv-weekly-insights`: Sunday 19:00 Europe/Copenhagen (CET) / 20:00 CEST

Daylight-saving slippage of ± 1 hour is acceptable for these cadences. If precise local time matters later, route handlers can check `Date.toLocaleString('en', { timeZone: 'Europe/Copenhagen' })` to skip days outside a window.

**Cron auth pattern (Vercel's documented standard):**

- Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` header.
- Each route handler verifies the header matches `process.env.CRON_SECRET`.
- `CRON_SECRET` added to `.env.example` (P1) and to Vercel project env (preview + production) at deploy time.
- Service-role key (`SUPABASE_SERVICE_ROLE_KEY`, already exists) used inside the handlers to bypass RLS for batch operations.

### No new storage bucket

All HRV data is structured.

## 10. Guardrails — what we refuse to do

- **No 0–100 recovery score.** We show actual ms + baseline band.
- **No cross-member comparison.** No leaderboards, no "top X % for your age". RLS enforces no cross-member reads.
- **No LF/HF as "sympatho-vagal balance"** (Billman 2013).
- **No "boost your HRV with [supplement]"** content.
- **No fused score** (HRV + sleep + RHR + temp). Separate signals, never bundled.
- **No daily readiness from a single day's value.** The signal IS the 7-day mean.
- **No false confidence on strength-training effects.** UI framing reflects the evidence gap.
- **No automatic mid-session weight changes.**

## 11. Phasing & MVP scope

Total module estimate: **10–11 weeks** for one developer. v1 ships after **3 weeks (P1 + P2)**.

| Phase | Content | Estimate | Ships as |
|---|---|---|---|
| **P0 (spike, 2 days)** | PPG feasibility validation on Android Chrome **and** iOS Safari (15.4+) — measure frame-rate, torch availability, SNR vs Polar H10 reference signal | 2 days | go/no-go decision before P1 commits |
| **P1** | Migration `0031_hrv_module.sql` + `lib/hrv/{ppg,rmssd,baseline}.ts` + unit tests + `MeasurementSheet` + `PPGCanvas` (Android+iOS) + `/hrv` landing (3 states) + `submitHrvReading` action + base settings (incl. `menstrual_start` log entry) + create `vercel.json` + first cron handler `hrv-streak-check` + add `CRON_SECRET` to `.env.example` | 2 weeks | "Du kan måle din HRV" — internal: Munk + 3–5 crew pilot |
| **P2** | `/hrv/trends` chart (incl. empty/Discovery/Provisional states) + `TrendChart.tsx` SVG + `ReadinessLadder.tsx` + `/dashboard` chip (incl. empty state) + `/hrv/learn` + **citation verification pass for `/hrv/learn`** | 1 week | **v1 — full crew launch** |
| **P3** | Full `hrv_lifestyle_logs` UI (alcohol/sleep/sick/feeling beyond menstrual_start) + `/hrv/insights` skeleton (empty state copy) | 1 week | "Better data — insights soon" |
| **P4** | Claude weekly insights engine + `/api/cron/hrv-weekly-insights` + Zod validation + `/hrv/insights` full UI | 1 week | **v1.5 — moat features go live** |
| **P5** | Polar H10 Web Bluetooth (Android) + source-switching baseline reset enforcement | 1 week | "Polar H10 support" |
| **P6** | B-prong: `DeloadSuggestionSheet` + `/session/[id]` hook + `hrv_session_modifiers` writes + settings toggle | 1 week | "Your sessions respect your readiness" |
| **P7** | Coach red-flag-kø: `/api/cron/hrv-alert-detect` + `/coach/queue` HRV section + Munk actions + Resend email | 1 week | "Munk's got your back automatically" |
| **P8** | D-prong: program-gen Claude prompt extension + anomaly trigger + `/coaching` explanation UI + Reps `hrv_streak_milestone` event | 1–2 weeks | **v2 — full vision shipped** |
| **(later)** | HealthKit fallback with per-member normalization; iOS Polar companion app/PWA | TBD | "HealthKit + iOS Polar" |

### P0 spike — explicit rationale

PPG implementation is the single highest-risk technical item. A 2-day spike before P1 commits answers:

1. Does `MediaTrackConstraints { torch: true }` actually work on a representative crew Android device?
2. Does iOS Safari finger-press PPG produce enough signal for usable RMSSD (validation: ≥ r=0.9 against a synchronous Polar H10 chest-strap reading over 60 s on the same person)?
3. Is the bandpass + adaptive-threshold peak detection (§4) accurate enough on real signals from 3–5 pilot members?

If any answer is "no", we either (a) restrict v1 to Android only — accept the platform loss, or (b) extend P1 by 1–2 weeks to add a more robust algorithm. The risk lives at the front, not buried in P1.

### Phase 1 concretely (writing-plans target)

1. Migration `0031_hrv_module.sql` — all 7 tables + RLS policies.
2. `src/lib/hrv/ppg.ts` — getUserMedia signal processing (bandpass, peak detection, SNR). Unit tests against synthetic + known-good signals.
3. `src/lib/hrv/rmssd.ts` — R-R → RMSSD + ectopic filter, with unit tests.
4. `src/lib/hrv/baseline.ts` — rolling 7d/60d + SWC + warm-up-state + bucket classification, with unit tests.
5. `src/components/hrv/PPGCanvas.tsx` — getUserMedia + canvas + peak detection (consumes `lib/hrv/ppg.ts`).
6. `src/components/hrv/MeasurementSheet.tsx` — bottom sheet flow.
7. `src/app/(app)/hrv/page.tsx` — 3 states: Discovery / Provisional / Active.
8. `src/app/(app)/hrv/actions.ts` — `submitHrvReading(rrIntervals, source)`.
9. `src/app/api/cron/hrv-streak-check/route.ts` — first cron handler, sets the codebase pattern.
10. `vercel.json` (new file) with the 3 cron entries (only streak-check has a handler in P1; the other two paths return 200 until their phases ship).
11. `CRON_SECRET` added to `.env.example` with setup instructions.
12. Base settings under `/settings`: `preferred_source`, `cycle_tracking_enabled`, `share_to_coach`, "Log menstrual start" entry point.

With P1 shipped internally, Munk + 2–3 crew members can measure daily for ~2 weeks and build real baseline data before P2 (trends) needs to render anything meaningful.

## 12. Open questions / future work

- **iOS Polar H10 support** — companion PWA vs native iOS app vs BLE-cable bridge. Deferred.
- **HealthKit fallback** — needs per-member SDNN ↔ RMSSD calibration cohort before v2 ship.
- **WHOOP/Oura/Garmin API ingestion** — only if member demand warrants normalization complexity.
- **Chat mode on `/hrv/insights/[week-id]`** — v2 feature. `hrv_weekly_insights` does NOT include thread/conversation columns today; a future migration would add `hrv_insight_messages` or similar. The "data model designed for chat" claim from an earlier draft is withdrawn.
- **HRV-aware crew aggregates** — anonymized weekly observations on `/community`. Privacy-careful; explicit member opt-in required.
- **Reference verification (P2 blocker)** — the HRV science brief was written without web access; specific PubMed IDs need to be verified before any reference is surfaced in-product. P2's `/hrv/learn` task list MUST include a citation verification pass.
- **`exit_pilot_baseline_reset`** — when we transition from P1 internal pilot to P2 crew launch, baselines built on a single source (camera) are fine; baselines that pollute across sources (if any pilot member switched sources) need a manual reset. Document the steps as a P2 pre-launch checklist.
