# MakeIt HQ — HRV Module Design Spec

**Date:** 2026-05-15
**Status:** Design approved — ready for implementation planning
**Module path:** `/hrv` (new top-level route, parallel to `/coaching`, `/train`, `/form-check`)

> Research foundation: [`docs/research/HRV_SCIENCE_BRIEF.md`](../../research/HRV_SCIENCE_BRIEF.md) (HRV science) + [`docs/research/HRV_PLATFORMS_BENCHMARK.md`](../../research/HRV_PLATFORMS_BENCHMARK.md) (competitive landscape including Ruut Labs)

---

## 1. Overview & positioning

MakeIt HQ adds a dedicated HRV module — `/hrv` — that owns Heart Rate Variability measurement, baselining, trend analysis, daily readiness signaling, lifestyle correlation insights, session-level integration, adaptive program periodization, and a coach (Munk) red-flag review queue. The module is a full HRV ecosystem (not a sidebar metric), positioned in the white space identified by competitive research: **rigorous measurement + deep coaching + strength-training focus** — a corner of the market no incumbent owns (Ruut has the coaching but opaque methodology; HRV4Training has the science but no coaching/community; WHOOP/Oura have data but black-box it).

**Brand positioning:** science-first, ruthlessly honest. The module visibly refuses things competitors do — no 0-100 recovery score, no peer comparison, no LF/HF "stress balance" UI, no population percentiles, no supplement upsells. The crew is sophisticated enough to value rigor over confetti, and that's a defensible market position.

## 2. Goals & non-goals

### Goals

- Give every member a reliable, validated daily HRV signal (lnRMSSD via Plews 7d/60d/SWC framework).
- Detect early-warning patterns for illness, overreaching, and lifestyle imbalance — surface them to the member and (conditionally) to the coach.
- Modulate the existing training engine (`/session`, `/coaching`) so HRV influences both today's session and long-term periodization.
- Generate weekly personalized insights via Claude that surface real, user-specific lifestyle correlations (alcohol, sleep, training load).
- Reward consistent measurement with the existing Reps loyalty mechanism — without ever rewarding the physiological value itself.

### Non-goals (v1)

- 24/7 HRV monitoring (we are a morning-measurement product, not a WHOOP competitor).
- Native iOS Polar H10 support (parked to a later milestone — companion app or BLE bridge).
- Apple HealthKit fallback at launch (deferred to v2 once we have a validated per-member SDNN↔RMSSD normalization curve).
- WHOOP, Oura, Garmin, Fitbit API ingestion (deferred — too many normalization complications, their recovery scores are black boxes we won't rebrand).
- Live HR during workouts (different paradigm — not what we do).
- Cross-member ranking, peer leaderboards, age-percentile comparisons.

## 3. Information architecture

**Top-level route:** `/hrv` (sidebar position 4 of 6: Today / Træn / Crew / **HRV** / Reps / Mig).

**Mobile tab-bar:** HRV replaces Reps as primary; Reps moves to secondary nav under Mig (Reps is a conversion funnel, not a daily destination).

**Pages under `/hrv`:**

- `/hrv` — morning destination. Three states (Discovery / Provisional / Active) depending on measurement maturity.
- `/hrv/trends` — historical chart with lnRMSSD dots, 7-day rolling mean, 60-day baseline band ±SWC.
- `/hrv/insights` — weekly Claude-generated observation + lifestyle correlation cards.
- `/hrv/learn` — short editorial intro to HRV science, what we measure, what we refuse to do.

**Cross-module touchpoints:**

- `/dashboard` — HRV-readiness KPI chip at top (same stil as existing KPI tiles).
- `/session/[id]` — start-of-session prompt reads HRV status (section 7 — B-prong).
- `/coaching` — AI program-gen reads HRV trends at regeneration (section 7 — D-prong).
- `/coach/queue` — Munk's red-flag-kø alongside existing form-check queue (section 8).
- `/reps` — streak rewards for consistent morning measurement (section 8).
- `/settings` — source preference, integration toggles, raw R-R export, cycle-tracking toggle.

**Design tokens:** existing system. No new colors. The only new visual primitive is the 5-bucket readiness ladder (section 6) which gets its own `src/components/hrv/` directory.

## 4. Data sources & measurement

### Primary: smartphone camera PPG (60-second morning measurement)

Same browser-native architecture as the existing form-check pipeline (canvas + flash + peak detection), but the camera runs continuously for 60s extracting R-R intervals. The protocol — morning, supine, immediately upon waking, before getting out of bed — is the Plews & Buchheit consensus. This is the **golden source** for every member.

- UI under measurement: live waveform visualization (monochrome from anatomy module), 60s countdown, copy *"Træk vejret som du plejer. Det er ikke en breathing exercise."*
- Low SNR detection → 15s extension increments, max 90s.
- Output: raw R-R array → server action → RMSSD, lnRMSSD, mean HR → `hrv_readings` row.

### Secondary: Polar H10 chest strap (optional, opt-in)

- Pair over **Web Bluetooth API**. **Chrome/Android only in v1.** iOS Safari does not support Web Bluetooth — iOS Polar users are parked to a later milestone (companion PWA or native iOS app).
- Same 60s flow but marked `source: 'polar_h10'` with higher confidence.
- We link to hardware (~600 DKK) but don't sell.

### NOT in v1

- **Apple HealthKit fallback.** Decision: ship clean (camera + H10 only). HealthKit reports SDNN, not RMSSD; per-member normalization needs a calibration cohort before we can serve "medium confidence" data without eroding trust. Add in v2.
- **WHOOP, Oura, Garmin, Fitbit native APIs.**

### Edge cases & data hygiene

- **Switching sources:** baseline reset (cross-source pooling forbidden by science). UI: *"Ny baseline genopbygges over 14 dage."*
- **Missed days:** no imputation. Use Plews' "measured-day rolling mean", not calendar-week.
- **Travel/jetlag:** tag readings with timezone. Trends-view flags days with >3h tz shift.
- **Illness:** member tags day as "syg" → excluded from baseline update, retained as event for insights engine.
- **Quality filter:** ectopic beats (>20% deviation from moving median) excluded from RMSSD. >5% ectopic → reading rejected with retry prompt.

## 5. Baseline model & readiness

### Signal pipeline

1. R-R array → quality filter (ectopic exclusion).
2. RMSSD = √(mean of squared successive differences).
3. lnRMSSD = ln(RMSSD). Stored on each reading. UI displays raw ms; **all baseline calculations operate on lnRMSSD** (Plews et al. 2013).

### Baseline framework (Plews 2013 consensus)

- **Rolling 7-day mean** of lnRMSSD = short-term readiness signal.
- **Rolling 60-day mean** of lnRMSSD = personal baseline.
- **Within-subject SD** computed over the last 60 days.
- **SWC (Smallest Worthwhile Change)** = 0.5 × within-subject SD.

### Readiness — 5 buckets

| Bucket | Threshold (7-d mean vs baseline) |
|---|---|
| Very-low | < baseline − 2·SWC |
| Low | baseline − 2·SWC ≤ 7-d < baseline − SWC |
| Normal | within ±SWC |
| High | baseline + SWC < 7-d ≤ baseline + 2·SWC |
| Very-high | > baseline + 2·SWC |

Visualized as a 5-step vertical ladder (section 6). Never as a 0-100 score.

### Warm-up states for new users

- **Day 1–6 (Discovery):** no readiness signal. UI: *"Vi bygger din baseline. X dage tilbage."*
- **Day 7–13 (Provisional):** 7-day mean shown, labeled "Provisional", no actions trigger off it.
- **Day 14+ (Active):** full readiness + integrations.

### Female cycle-phase adjustment (opt-in)

The science brief flags this as mandatory — without it, the module will systematically flag the luteal phase as "low readiness". v1 ships with **phase-specific baseline from the start** (not deferred to v2):

- Setting under `/settings`: "Tilføj cyklus-tracking" — opt-in.
- Member tags `menstrual_start` events manually (v1; HealthKit cycle import is a v2 enhancement).
- Algorithm learns per-cycle phase offsets over 2-3 cycles.
- Baseline comparison: "same phase previous cycle" + 60-day overall mean.

If not enabled: unisex baseline, with explicit copy on `/hrv/learn` describing what they'd miss.

### Compute timing

- **On submit:** server action recomputes 7-d mean, baseline, SWC, bucket → persisted on the `hrv_readings` row.
- **Nightly cron:** streak-status updates, not baseline.
- **Baseline:** incremental computation — rolling state stored, no full replay.

### Code location

- `src/lib/hrv/rmssd.ts` — R-R → RMSSD + ectopic filter (pure, unit-testable).
- `src/lib/hrv/baseline.ts` — rolling means + SWC + bucket classification (pure, unit-testable).
- **Unit tests from day one.** Test vectors from public HRV4Training Pro validation data or PhysioNet datasets. This is the algorithmic core — failure here undermines the entire module.

## 6. UI & visualization

### Design principle

Existing MakeIt design tokens. **No color accents.** No red/yellow/green semaphores. Hierarchy expressed through typography size, stroke weight, position — same as the rest of the app.

5-bucket readiness uses a **vertical ladder**: 5 horizontal segments stacked, read bottom-up from "very-low" to "very-high". Current bucket = filled block; adjacent = outline; distant = thin sketch. Readable without color or text.

### `/hrv` — morning destination (3 states)

**A — Not measured today:** Large display "*God morgen. 60 sekunder.*" + primary CTA "Mål nu" + secondary "Sov endnu lidt". Below: mini-trend (7 dots).

**B — Measured, Active baseline (day 14+):** Large RMSSD value (e.g. `72 ms`), under: 7-d mean + ladder + bucket text ("*Du er over din egen norm. Grønt lys for hård arbejde.*"), under: today's session CTA if relevant.

**C — Measured, Discovery/Provisional (day 1-13):** Value + honest copy ("*Vi bygger din baseline. 4 dage tilbage.*") — no bucket, no actions.

### `/hrv/trends` — history

Central chart: X = dates (default 30, zoom 60/180), Y = lnRMSSD (UI displays raw ms via inverse log). Daily dots (off-white, small), 7-day rolling mean (1.5px line), 60-day baseline band (translucent stripe ±SWC, ~15% opacity).

Annotations: travel/tz-shift → flag glyph, "sick" days → outline dot, cycle phase → thin horizontal gradient behind x-axis segment.

Below chart: bucket-distribution last 30 days as 5 horizontal bars (e.g., "*65% normal, 18% under, 14% over, 3% very-low*").

### `/hrv/insights` — weekly Claude observation

```
Uge 19, 2026

Tom, din 7-dages mean steg 5.2% denne uge — drevet af to lyse 
nætter (>7t søvn) og ingen alkohol-events. Til sammenligning var 
uge 17 dæmpet, og det matcher tre dage med >2 drinks. Sammenhængen 
er nu robust nok til at vi tør sige det højt: alkohol koster dig 
konsistent omkring 6-8% af din baseline.
```

Below: separate **correlation cards** per lifestyle factor:

```
ALKOHOL
0 drinks (n=44): +2% vs baseline
1-2 drinks (n=12): −3%
3+ drinks (n=8): −7%
```

No p-values in UI, but `n` always shown (honest about sample size).

### `/hrv/learn` — intro page

3–5 sections, max 100 words each:
- *Hvad er HRV?*
- *Hvorfor RMSSD og ikke andre tal?*
- *Hvorfor du ikke får et 0-100 score*
- *Hvorfor du ikke kan sammenligne din HRV med andre*
- *Hvad luteal-fase betyder for kvindelige medlemmer*

Editorial tone, narrow text column, no illustrations.

### Dashboard chip on `/dashboard`

Small KPI tile: label "HRV READINESS", large ms value, mini ladder, caption with 7-d mean. Tap → `/hrv`.

### Components

```
src/components/hrv/
├── ReadinessLadder.tsx     # 5-bucket vertical ladder
├── TrendChart.tsx          # SVG native (NOT recharts — avoids default color styling)
├── MeasurementSheet.tsx    # bottom sheet, same arch as FormCheckSheet
├── PPGCanvas.tsx           # getUserMedia + canvas + peak detection
├── PolarBluetoothPair.tsx  # Web Bluetooth flow (Android only)
├── InsightCard.tsx         # /hrv/insights correlation cards
├── MiniSparkline.tsx       # dashboard chip + /hrv mini-trend
└── DeloadSuggestionSheet.tsx  # B-prong session integration (section 7)
```

### Mobile + accessibility

- HRV replaces Reps in mobile tab-bar primary nav.
- "Mål nu" CTA on `/hrv` state A: bottom-fixed sticky (same pattern as `/session`).
- Ladder has redundant text label for screen readers.
- Charts have data-table fallback behind "se data" disclosure.
- All interactive elements ≥44×44px.

## 7. Session integration & adaptive periodization

### B-prong: start-of-session suggestion

When member taps "Start workout" on `/session/[id]`:

```ts
if (readiness === 'very_low' || readiness === 'low') {
  show DeloadSuggestionSheet
}
```

**DeloadSuggestionSheet** (new component, same architecture as `FormCheckSheet`):

```
Din 7-dages mean er [X%] under baseline.

To muligheder:
[primary]   Brug Munk's deload-version af i dag
            — samme øvelser, −10% på top-sæt, færre arbejdssæt
[secondary] Kør planen som den er
            — vi noterer at du valgte at presse igennem

Du kan slå denne suggestion fra under Settings → HRV.
```

If member picks deload: today's session object is modified in-memory (NOT the program). Top-set weights × 0.9, working-set count −1 (min 2). Persisted as `hrv_session_modifiers` row.

If "kør planen": choice noted (input to insights engine).

Suggestion NOT shown if: member is in Discovery/Provisional, member disabled toggle, today is already a planned deload week.

### D-prong: adaptive periodization

Extends the existing Claude-based AI program-generator (README L186-205) to read HRV trends at program regeneration.

**Re-generation triggers:**

1. End of 4-week block (existing trigger) — now with HRV trend as input.
2. **Anomaly trigger:** 7-day mean below baseline-SWC for **≥10 consecutive days** without already being in a deload. Algorithm inserts a deload week from next Monday.
3. **Manual:** Munk via coach-dashboard.

**Claude prompt inputs (additions):**

- 28-day lnRMSSD trend + 7-d mean + baseline.
- Readiness-bucket distribution (last 28 days).
- B-prong suggestion adherence (e.g., "4 of 7 followed").
- Illness events.
- Subjective wellness logs.

**Output:** Zod-validated program JSON (same tool-use pattern as existing program-gen). Member notification: *"Munk og algoritmen har justeret dine næste 4 uger. Se ændringer →"*

**Honest framing in UI:** when an adaptive deload is inserted, an explanation card on `/coaching`:

> *"Vi indsatte en deload-uge baseret på din HRV-trend. Evidensen for HRV-styret styrketræning er mindre etableret end for udholdenhedstræning — vi følger principper fra Vesterinen og Plews, anvendt med forsigtighed. Du kan altid skippe deload'en hvis du føler dig klar."*

This is not decoration. It is the differentiator vs Ruut/Morpheus, who don't disclose their methodology.

### Explicitly NOT in v1

- Auto-modulation mid-session (never change weights during a set).
- Push notifications during rest periods based on intra-session HR.
- HRV-based pre-workout warmup customization.

## 8. Coach flow, Claude weekly insights & Reps

### Coach red-flag-kø (Munk)

`/coach/queue` (existing) gets a new HRV-anomalies section alongside the form-check queue.

**Alert trigger — ALL 3 conditions must hit simultaneously** (avoid alert fatigue):

1. 7-day mean below baseline-SWC for ≥3 consecutive days.
2. Mean RHR ≥10% above member's 60-day RHR baseline (computed from same measurement flow).
3. At least one of: member tagged "syg"/"stresset" / last logged sleep <6h / 3+ alcohol events in last week.

Cron job (`/api/cron/hrv-alert-detect`, 07:00 dansk tid) runs detection, creates `hrv_alerts` row.

**Munk sees per alert:**

```
[member name, handle]
Anomali: 4 dage under baseline (−8.4%), RHR +12%
Sidste session: i mandags (gennemført)
Subjective tags: "stresset" (tirsdag), 2 alkohol-events

[Send personlig note]  [Foreslå pause (1-3 dage)]  [Marker som "set, ingen handling"]
```

- **Send personal note** → reuses existing `coach_notes` flow + Resend email.
- **Foreslå pause** → creates `hrv_session_modifiers` suspending sessions 1-3 days.

### Claude weekly insights

- **When:** Sunday evening, Vercel Cron, all members with ≥14 days of data.
- **Model:** Claude Sonnet 4.6 with cached system prompt (~2K tokens, 5min TTL — same pattern as program-gen).
- **System prompt:** "HRV-insight-analyst for MakeIt HQ. Write one weekly observation in Danish, second person, ~150 words, honest and specific. Tone: editorial, not wellness-coach. Never population claims, never 'boost your HRV', never p-values in prose. If pattern is not robust (n<5 or SD>mean), say so explicitly."
- **User prompt:** member's week — HRV trend, sleep data, alcohol events, training sessions with RPE/volume, subjective tags, historical correlation data.
- **Cost:** ~2K cached + ~500 input + ~250 output ≈ **0.4¢/member/week**. 100 members ≈ 40¢/week.
- **Output:** Zod-validated `{ summary_text, correlation_cards }` → persisted in `hrv_weekly_insights`.
- **Fallback:** template-based observation if Claude fails — never user-visible error.

**v2 hook:** `/hrv/insights/[week-id]` can later add chat-mode (member asks follow-up questions). Data model designed for this — no migration needed when added.

### Reps integration

Extend existing event-driven earn mechanism (migrations 0007/0008) with new event type `hrv_streak_milestone`:

| Streak | Reps awarded |
|---|---|
| 7 days | +50 |
| 14 days | +100 |
| 30 days | +250 + tier-progress event |
| 90 days | +750 + special badge |

**Reward the ritual, not the value.** No Reps for "improvement", "high HRV", "above-baseline weeks". Only for the measurable behavior (daily measurement).

## 9. Data model & RLS

Migration: `0013_hrv_module.sql` (idempotent, same style as existing migrations).

### Tables

#### `hrv_readings`

```sql
create table hrv_readings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  measured_at timestamptz not null,

  source text not null check (source in ('camera_ppg', 'polar_h10', 'apple_health_sdnn')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  quality_warnings jsonb,

  rr_intervals jsonb not null,
  rmssd_ms numeric(6,2) not null,
  ln_rmssd numeric(8,4) not null,
  mean_hr_bpm numeric(5,2),

  rolling_7d_mean_lnrmssd numeric(8,4),
  baseline_60d_mean_lnrmssd numeric(8,4),
  baseline_60d_swc numeric(8,4),
  readiness_bucket text check (readiness_bucket in
    ('discovery', 'provisional', 'very_low', 'low', 'normal', 'high', 'very_high')),

  cycle_phase text check (cycle_phase in ('menstrual', 'follicular', 'ovulatory', 'luteal')),
  timezone text not null,
  is_sick boolean default false,

  inserted_at timestamptz default now()
);

create index on hrv_readings (member_id, measured_at desc);
create index on hrv_readings (member_id, is_sick) where is_sick = false;
```

#### `hrv_lifestyle_logs`

```sql
create table hrv_lifestyle_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  logged_for_date date not null,
  event_type text not null check (event_type in
    ('alcohol_drinks', 'sleep_hours', 'feeling', 'late_meal', 'sick', 'menstrual_start')),
  value jsonb not null,
  inserted_at timestamptz default now()
);

create index on hrv_lifestyle_logs (member_id, logged_for_date desc);
```

#### `hrv_alerts`

```sql
create table hrv_alerts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  triggered_at timestamptz default now(),

  conditions_met jsonb not null,

  status text not null default 'open'
    check (status in ('open', 'reviewed_noted', 'reviewed_actioned', 'auto_resolved')),
  coach_note_id uuid references coach_notes(id),
  session_modifier_id uuid,
  reviewed_at timestamptz,
  reviewed_by uuid references members(id)
);

create index on hrv_alerts (status, triggered_at desc) where status = 'open';
```

#### `hrv_weekly_insights`

```sql
create table hrv_weekly_insights (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  week_start date not null,

  summary_text text not null,
  correlation_cards jsonb not null,

  claude_model_id text not null,
  tokens_used int,
  generated_at timestamptz default now(),

  unique(member_id, week_start)
);
```

#### `hrv_settings`

```sql
create table hrv_settings (
  member_id uuid primary key references members(id) on delete cascade,
  preferred_source text default 'camera_ppg'
    check (preferred_source in ('camera_ppg', 'polar_h10', 'apple_health_sdnn')),
  session_suggestion_enabled boolean default true,
  cycle_tracking_enabled boolean default false,
  share_to_coach boolean default true,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### `hrv_session_modifiers`

```sql
create table hrv_session_modifiers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  session_id uuid references sessions(id),
  program_id uuid references programs(id),

  modifier_type text not null check (modifier_type in
    ('top_set_reduction', 'volume_reduction', 'deload_week_insertion', 'paused_session')),
  applied_value jsonb,
  reason text not null check (reason in
    ('hrv_low_readiness_b_prong', 'hrv_sustained_low_d_prong', 'coach_pause_from_alert')),

  accepted_by_member boolean,

  created_at timestamptz default now()
);

create index on hrv_session_modifiers (member_id, created_at desc);
```

### RLS policies (privacy is core)

```sql
alter table hrv_readings enable row level security;
alter table hrv_lifestyle_logs enable row level security;
alter table hrv_alerts enable row level security;
alter table hrv_weekly_insights enable row level security;
alter table hrv_settings enable row level security;
alter table hrv_session_modifiers enable row level security;

-- Members own their data
create policy "members_own_readings" on hrv_readings
  for all using (member_id = auth.uid());
-- (analogous for other tables)

-- Coach reads individual data ONLY when member opted in
create policy "coach_reads_opted_in_readings" on hrv_readings
  for select using (
    is_current_user_coach()
    and exists (
      select 1 from hrv_settings
      where hrv_settings.member_id = hrv_readings.member_id
        and hrv_settings.share_to_coach = true
    )
  );

-- Coach always reads alerts (their entire reason for existing)
create policy "coach_reads_alerts" on hrv_alerts
  for all using (is_current_user_coach());

-- Service role (cron jobs) uses SUPABASE_SERVICE_ROLE_KEY
-- (same pattern as stripe-webhook today)
```

**Critical:** `rr_intervals` (raw R-R data) is sensitive. Never exposed in API responses outside the measurement flow. Server actions can read it for re-analysis; `/hrv/trends` and `/hrv/insights` receive only derived values.

### `vercel.json` additions

```json
{
  "crons": [
    { "path": "/api/cron/hrv-streak-check",   "schedule": "0 0 * * *" },
    { "path": "/api/cron/hrv-alert-detect",   "schedule": "0 7 * * *" },
    { "path": "/api/cron/hrv-weekly-insights", "schedule": "0 20 * * 0" }
  ]
}
```

All 3 routes verify `CRON_SECRET` header. Use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for batch operations.

### No new storage bucket

All HRV data is structured. If we later want to store measurement video replays for debugging, we'll add a bucket then.

## 10. Guardrails — what we refuse to do

These are not nice-to-haves. They are the brand. Violating them undermines the entire positioning.

- **No 0–100 recovery score.** WHOOP, Oura, Morpheus all do this. We show actual ms + baseline band. Pseudo-precision destroys trust.
- **No cross-member comparison.** No leaderboards, no "top X% for your age". Healthy adult RMSSD spans 10–200 ms — the comparison is meaningless.
- **No LF/HF as "sympatho-vagal balance".** Billman (2013) is clear. Don't display it.
- **No "boost your HRV with [supplement]" content.** Sleep and alcohol abstinence dwarf any supplement effect; we won't pretend otherwise.
- **No fused score (HRV + sleep + RHR + temp).** If we add more signals, they get shown as separate signals — never bundled into a single number.
- **No daily readiness from a single day's value.** The signal IS the 7-day mean. Single days are shown on `/hrv/trends` for history; daily readiness bucket is derived from the 7-day mean.
- **No false confidence on strength-training effects.** HRV-guided lifting evidence is weak. UI framing must reflect that ("eksperimentelt, baseret på ekstrapolation").
- **No automatic mid-session changes.** Never modify weights during the set the member is lifting.

## 11. Phasing & MVP scope

Total module estimate: **10-11 weeks** for one developer. v1 ships after **3 weeks (P1 + P2)**.

| Phase | Content | Estimate | Ships as |
|---|---|---|---|
| **P1** | Migration 0013 + `lib/hrv/rmssd.ts` + `lib/hrv/baseline.ts` + unit tests + `MeasurementSheet` (camera PPG) + `/hrv` landing (3 states) + `submitHrvReading` action + cron streak-check + base settings | **2 weeks** | "Du kan måle din HRV" — internal: Munk + 3-5 crew pilot |
| **P2** | `/hrv/trends` chart + `TrendChart.tsx` SVG + `ReadinessLadder.tsx` + `/dashboard` chip + `/hrv/learn` | **1 week** | **v1 — full crew launch** |
| **P3** | `hrv_lifestyle_logs` UI + cycle-tracking opt-in + `/hrv/insights` skeleton | **1 week** | "Better data — insights soon" |
| **P4** | Claude weekly insights engine + `/api/cron/hrv-weekly-insights` + Zod validation + `/hrv/insights` full UI | **1 week** | **v1.5 — moat features go live** |
| **P5** | Polar H10 Web Bluetooth (Android) + source-switching baseline reset | **1 week** | "Polar H10 support" |
| **P6** | B-prong: `DeloadSuggestionSheet` + `/session/[id]` hook + `hrv_session_modifiers` writes + settings toggle | **1 week** | "Your sessions respect your readiness" |
| **P7** | Coach red-flag-kø: `/api/cron/hrv-alert-detect` + `/coach/queue` HRV section + Munk actions + Resend email | **1 week** | "Munk's got your back automatically" |
| **P8** | D-prong: program-gen Claude prompt extension + anomaly trigger + `/coaching` explanation UI + Reps streak milestones | **1-2 weeks** | **v2 — full vision shipped** |
| **(later)** | HealthKit fallback with per-member normalization; iOS Polar companion app/PWA | TBD | "HealthKit + iOS Polar" |

### Phase 1 concretely (writing-plans target)

1. Migration `0013_hrv_module.sql` — all 6 tables + RLS policies.
2. `src/lib/hrv/rmssd.ts` — R-R → RMSSD + ectopic filter, with unit tests.
3. `src/lib/hrv/baseline.ts` — rolling 7d/60d + SWC + bucket classification, with unit tests.
4. `src/components/hrv/PPGCanvas.tsx` — getUserMedia + canvas + peak detection.
5. `src/components/hrv/MeasurementSheet.tsx` — bottom sheet flow.
6. `src/app/(app)/hrv/page.tsx` — 3 states: Discovery / Provisional / Active.
7. `src/app/(app)/hrv/actions.ts` — `submitHrvReading(rrIntervals, source)`.
8. `src/app/api/cron/hrv-streak-check/route.ts` + `vercel.json` cron entry.
9. Base settings under `/settings` (preferred_source, cycle_tracking_enabled, share_to_coach).

With P1 shipped internally, Munk + 2-3 crew members can measure daily for ~2 weeks and build real baseline data before P2 (trends) needs to render anything meaningful.

## 12. Open questions / future work

- **iOS Polar H10 support** — companion PWA vs native iOS app vs BLE-cable bridge. Decision deferred.
- **HealthKit fallback** — needs per-member SDNN↔RMSSD calibration cohort before v2 ship.
- **WHOOP/Oura/Garmin API ingestion** — only if member demand warrants the normalization complexity.
- **Chat mode on `/hrv/insights/[week-id]`** — v2 feature using Vercel Chat SDK. Data model supports it.
- **HRV-aware crew aggregates** — anonymized weekly observations on `/community` ("the crew slept 7h12 average this week, HRV +4%"). Privacy-careful; explicit member opt-in required.
- **Reference verification** — the HRV science brief was written without web access; specific PubMed IDs need to be verified before any reference is surfaced in-product (e.g., on `/hrv/learn`).
