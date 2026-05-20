# HRV Module — V2.3: Coach Red-Flag Queue

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When all four spec-§8 conditions point to a member needing attention, an `hrv_alerts` row is created (daily cron), surfaced as a card on `/coach/queue` for Munk, with three actions: send personal Danish note (Resend email), suggest a session pause (creates `hrv_session_modifiers`), or mark seen.

**Architecture:** A **pure** detection engine (`src/lib/hrv/alert.ts`) evaluates the four §8 conditions on already-fetched data and returns a structured `AlertEvaluation` — fully testable, no IO. The existing daily cron stub (`/api/cron/hrv-alert-detect`, scheduled `0 6 * * *` in `vercel.json`) becomes the real job: iterate primary wearable connections **whose member has `hrv_settings.share_to_coach = true`** (opt-in), load each member's 60-day window of readings + 7-day window of lifestyle logs, evaluate, and **idempotently** insert a `hrv_alerts` row when triggered (skip if an `open` alert already exists for that member). The `/coach/queue` page gains an HRV-anomalies section above the form-check list; a per-alert card exposes three server actions, mirroring how `reviewFormCheckAction` already works (Resend email best-effort, never blocks).

**Tech Stack:** Next.js 16.2.4, React 19, Supabase, Resend (already used by the platform), TypeScript 5, Vitest. **No new dependencies.**

**Spec:** [`docs/superpowers/specs/2026-05-15-hrv-module-design.md`](../specs/2026-05-15-hrv-module-design.md) rev 4.2 — §8 "Coach red-flag-kø (Munk)" (the 4-condition trigger), §8 "Reps integration" (out-of-scope for V2.3 — no Reps changes), §9 schemas, §10 guardrails (refuse to fake precision; the alert card surfaces the *raw* conditions, never an opinion).

**Depends on (shipped):** the W1–W3 + V1.x + V2.1 + V2.2 HRV module — `/hrv` pages, the wearable sync writing `resting_hr_bpm` on `hrv_readings`, `hrv_lifestyle_logs` populated by V2.1's daily card, the coach role infrastructure (`getSession().isCoach`, the `public.is_current_user_coach()` RLS function), the `/coach/queue` form-check page + `CoachReviewButton` (the action-sheet pattern this plan mirrors), and the Resend email plumbing (`src/lib/email/templates/coach-review.ts`).

## Existing schemas (verified — NO migration needed)

`hrv_alerts` (migration 0031):
```
id uuid pk · member_id uuid → members · triggered_at timestamptz
conditions_met jsonb not null
status text not null check in ('open','reviewed_noted','reviewed_actioned','auto_resolved')
coach_note_text text · session_modifier_id uuid → hrv_session_modifiers
reviewed_at timestamptz · reviewed_by uuid → members
index idx_hrv_alerts_open (status, triggered_at desc) where status='open'
```
RLS: `coach_manages_alerts` — `for all using public.is_current_user_coach()`. The cron writes via the **service-role** client (`createServiceClient()`), which bypasses RLS — background work no member can do themselves.

`hrv_session_modifiers` (migration 0031):
```
id uuid pk · member_id uuid · session_id uuid? · program_id uuid?
modifier_type text check in ('top_set_reduction','volume_reduction','deload_week_insertion','paused_session')
applied_value jsonb · reason text check in ('hrv_low_readiness_b_prong','hrv_sustained_low_d_prong','coach_pause_from_alert')
accepted_by_member boolean · created_at
```

`hrv_readings` (migration 0032 added `resting_hr_bpm numeric(5,2)`): the per-reading wearable RHR, written by `src/lib/hrv/wearables/sync.ts`. Condition 2 reads this column.

## Design decisions (locked — do not deviate without surfacing)

1. **Detection is math, not LLM judgement.** The engine is pure and unit-tested. The cron and the coach UI never recompute conditions — they consume the engine's structured `conditions_met` blob.

2. **Opt-in gating.** The cron only processes members with `hrv_settings.share_to_coach = true`. Members who opted out get no coach alerts — consistent with the existing `coach_reads_opted_*` RLS pattern in 0031. The alert table itself has no opt-in column (coaches manage all alerts they have access to); the gate lives in the cron.

3. **Idempotent alerts.** Before insert, the cron checks for an existing `open` alert for that member. If one exists, the cron skips — Munk has not actioned the previous alert yet, and we don't pile up duplicates. The reviewer's action transitions the status away from `'open'`, after which a new condition trigger creates a fresh alert.

4. **Conditions evaluated against ALL fetched data; the engine fires only when ALL four are true.** Spec §8 is "ALL 4". The engine returns the four sub-results separately so the UI can chip them, but `triggered === true` requires all four. If condition 2 (RHR) cannot be evaluated (insufficient baseline RHR samples — see §below), it is treated as `false` and the alert does NOT fire — a fail-closed default that prefers a missed alert over a false alarm (spec §10).

5. **Coach reads the alert via RLS, not service-role.** `coach_manages_alerts` allows it. The UI uses the normal SSR client. Joining to opt-in-gated tables (`hrv_lifestyle_logs`, `hrv_readings`) for richer context inside the card is out of scope for V2.3 — the alert card shows the engine-computed `conditions_met` chips plus the member handle, which the coach can already see via existing `coach_reads_members` policies. (The member detail page already exists at `/coach/members/[id]` for deeper context.)

6. **Three actions, one alert.** Each alert can be acted on once. Sending the personal note transitions to `reviewed_actioned`. Suggesting a pause also transitions to `reviewed_actioned` and links the `hrv_session_modifiers.id` via `session_modifier_id`. Marking seen transitions to `reviewed_noted`. All three stamp `reviewed_by` + `reviewed_at`. Re-firing the SAME button on the same alert is a no-op (the queries filter on `status = 'open'`).

7. **The personal-note email is best-effort.** Pattern mirrors `reviewFormCheckAction`: try/catch around `sendEmail`, never blocks the DB update path, log on failure. Member opt-out: check `members.notif_form_check_review` is NOT the right toggle — this is a coach-initiated HRV note. A new boolean column is out of scope; default behaviour is to send when the member has an email on file. (If a future revision adds `notif_coach_hrv_note`, gate on it then.)

8. **Condition-2 RHR baseline minimum.** Compute the 60-day RHR mean from readings with a non-null `resting_hr_bpm`. Require at least **14** such readings in the baseline window; below that, condition 2 → `false` (fail-closed). The 7-day exposed mean similarly requires at least 3 RHR samples in the last 7 days.

---

## The four conditions (verbatim §8 → engine semantics)

| # | Spec | Engine |
|---|------|--------|
| 0 | `warm_up_state = 'active'` | The member's **most recent** reading's `warm_up_state === "active"`. |
| 1 | 7-day mean below baseline − SWC for ≥ 3 consecutive days | For each of the last 3 distinct calendar days with a reading, that reading's `rolling_7d_mean_lnrmssd < baseline_60d_mean_lnrmssd - baseline_60d_swc`. If fewer than 3 such days exist in the window → `false`. |
| 2 | Mean RHR ≥ 10% above 60-day RHR baseline | `mean(resting_hr_bpm, last 7 days) ≥ 1.10 × mean(resting_hr_bpm, last 60 days)` — with the minimum-sample rule above. |
| 3 | "syg"/"stresset" OR last sleep < 6h OR 3+ alcohol events in the last week | Any of: a `sick={sick:true}` log in the last 7 days, a `feeling={state:"stressed"}` log in the last 7 days, the most recent `sleep_hours` log's `hours < 6`, OR `sum(alcohol_drinks.count) ≥ 3` across alcohol logs in the last 7 days. |

`conditions_met` jsonb shape (one row in `hrv_alerts`):
```json
{
  "warm_up_active": true,
  "sustained_low_readiness": { "consecutive_days_low": 3 },
  "rhr_spike": { "exposed_mean": 62.4, "baseline_mean": 55.7, "delta_pct": 12 },
  "lifestyle_flags": { "sick": false, "stressed": true, "short_sleep": false, "high_alcohol": true }
}
```
`null` for any sub-field that the engine could not compute (e.g. RHR `null` when insufficient samples).

---

## File structure

**New files:**

| Path | Responsibility |
|---|---|
| `src/lib/hrv/alert.ts` | Pure engine — `evaluateAlertConditions`, the `AlertEvaluation` + `AlertConditionsMet` types. No IO. |
| `src/lib/hrv/alert.test.ts` | Unit tests for the engine. |
| `src/lib/email/templates/hrv-alert.ts` | Resend email — coach-to-member personal Danish note. |
| `src/components/coach/HrvAlertCard.tsx` | The per-alert action card (3 buttons, sheet for the note). |

**Modified files:**

| Path | Change |
|---|---|
| `src/app/api/cron/hrv-alert-detect/route.ts` | Replace the stub with the real job. |
| `src/app/coach/queue/actions.ts` | Add `sendHrvAlertNoteAction`, `pauseSessionFromAlertAction`, `markHrvAlertSeenAction`. |
| `src/lib/data/coach.ts` | Add `HrvAlertRow` type, `getOpenHrvAlerts`. |
| `src/app/coach/queue/page.tsx` | Add the HRV-anomalies section above the form-check list. |

No migration. No `database.types.ts` regeneration.

---

## Chunk 1: Pure detection engine

### Task 1: The alert engine (pure, TDD)

**Files:**
- Create: `src/lib/hrv/alert.ts`
- Test: `src/lib/hrv/alert.test.ts`

The engine's public surface:

```ts
/** Per-reading shape the engine needs. */
export interface AlertReading {
  date: string;                          // "YYYY-MM-DD" (server-date slice of measured_at)
  warmUpState: "discovery" | "provisional" | "active";
  rolling7dMeanLnRmssd: number | null;   // baseline columns can be null in early days
  baseline60dMeanLnRmssd: number | null;
  baseline60dSwc: number | null;
  restingHrBpm: number | null;
}

/** Per-log shape (re-used from V2.2 InsightLog). */
export interface AlertLog {
  date: string;                          // logged_for_date
  eventType: string;
  value: unknown;                         // the jsonb blob
}

export interface AlertConditionsMet {
  warm_up_active: boolean;
  sustained_low_readiness: { consecutive_days_low: number } | null;
  rhr_spike: { exposed_mean: number; baseline_mean: number; delta_pct: number } | null;
  lifestyle_flags: { sick: boolean; stressed: boolean; short_sleep: boolean; high_alcohol: boolean };
}

export interface AlertEvaluation {
  triggered: boolean;
  conditions_met: AlertConditionsMet;
}

export interface AlertInput {
  readings: AlertReading[];     // chronological — last 60 days
  lifestyleLogs: AlertLog[];    // last 7 days (relative to `now`)
  now: Date;                    // for the calendar-day windowing
}

export function evaluateAlertConditions(input: AlertInput): AlertEvaluation;
```

- [ ] **Step 1: Write failing tests** in `src/lib/hrv/alert.test.ts` covering every condition's true/false/null path and the "ALL 4" gate.

  **Condition 0 — `warm_up_active`:**
  - Latest reading `warmUpState === "active"` → `true`.
  - Latest reading `"provisional"` → `false`.
  - No readings → `false`.

  **Condition 1 — `sustained_low_readiness`:**
  - The 3 most recent readings are all "low" (each `rolling_7d_mean_lnrmssd < baseline_60d_mean_lnrmssd - baseline_60d_swc`) → `{ consecutive_days_low: 3 }`, condition truthy.
  - Only 2 of the most recent 3 are low → `{ consecutive_days_low: 2 }`, condition **falsy** (the engine still reports the count for the chip, but the `triggered` gate sees `< 3`).
  - Any baseline column null on a recent reading → that day cannot be evaluated and breaks the consecutive run.
  - Fewer than 3 readings in the window → object is `null`.

  **Condition 2 — `rhr_spike`:**
  - 14 baseline readings (last 60d) with mean 55, 3 exposed readings (last 7d) with mean 62 → `{ exposed_mean: 62, baseline_mean: 55, delta_pct: 13 }`, truthy (≥ 10%).
  - Exposed mean 60, baseline 55 → `delta_pct: 9`, **falsy** (< 10%) but object still populated.
  - Only 13 baseline RHR samples → `null` (fail-closed).
  - Only 2 exposed RHR samples → `null` (fail-closed).
  - Every `resting_hr_bpm` is null → `null`.

  **Condition 3 — `lifestyle_flags`:**
  - `sick:{sick:true}` log in last 7 days → `sick: true`.
  - `feeling:{state:"stressed"}` in last 7 days → `stressed: true`. `state:"tired"`/`"ok"`/`"fresh"` → `stressed: false`.
  - Most recent `sleep_hours` log has `{hours:5.5}` → `short_sleep: true`. `{hours:7}` → `false`. No sleep log → `false`.
  - Sum of `alcohol_drinks.count` across last 7 days = 3 → `high_alcohol: true`. Sum = 2 → `false`. No alcohol logs → `false`.
  - With all four sub-flags false → `lifestyle_flags` object still present (never `null`), and `triggered`'s lifestyle component is `false`.

  **`triggered` gate:**
  - All four conditions truthy → `triggered: true`.
  - Three truthy, one falsy → `triggered: false`.
  - Condition 1 has `consecutive_days_low: 2` (object present but < 3) → `triggered: false`.
  - Condition 2 `null` (insufficient samples) → `triggered: false` (fail-closed even if 0/1/3 are true).
  - Condition 3 with at least one sub-flag true → that condition is truthy; all-false sub-flags → falsy.

  **Server-date calendar windows:** assert that "last 7 days" includes the date `dateStr(now) - 6` through `dateStr(now)` inclusive (a 7-day inclusive window), and "last 60 days" is `now - 59` through `now`.

- [ ] **Step 2: Run — expect FAIL.** `npm test -- alert` → fails (`alert.ts` not found).

- [ ] **Step 3: Implement `src/lib/hrv/alert.ts`.** Pure. Implementation notes:
  - Date helpers: `dateStr(d: Date): string` → `d.toISOString().slice(0,10)`. `addDays(dateStr, n)` from the V2.2 engine pattern (parse `YYYY-MM-DD` as UTC, add `n*86400000`, re-slice).
  - Build a UTC `today = dateStr(now)`. `windowStart7 = addDays(today, -6)`; `windowStart60 = addDays(today, -59)`.
  - **Condition 0:** `latest = readings[readings.length - 1]`; `warm_up_active = latest?.warmUpState === "active"`.
  - **Condition 1:** the input is the engine's last-60-days `readings`. Dedupe by `date` (last wins — most recent reading per day), then sort **descending** by `date`. If the deduped list has fewer than 3 distinct days → `sustained_low_readiness: null`. Otherwise walk the deduped-descending list from index 0, computing per-day `isLow = rolling_7d_mean_lnrmssd !== null && baseline_60d_mean_lnrmssd !== null && baseline_60d_swc !== null && rolling_7d_mean_lnrmssd < (baseline_60d_mean_lnrmssd - baseline_60d_swc)`. Count the **full** run of `isLow=true` from the most-recent day until the first non-low (or null/missing-baseline) day — do NOT cap at 3; a 5-day streak returns `consecutive_days_low: 5` so the UI chip can show real information. The `triggered`-gate test is `count >= 3`.
  - **Condition 2:** filter readings with non-null `resting_hr_bpm`; partition by `windowStart7` (exposed = `date >= windowStart7`, baseline = the rest within `windowStart60` — i.e. days `[windowStart60, windowStart7)`, which excludes the exposed week to avoid contamination). Require `baseline.length >= 14` and `exposed.length >= 3`; otherwise → `null` (fail-closed). Document this baseline-excludes-exposed choice in a doc comment on `evaluateAlertConditions` — the spec is silent on the partition and the engine's choice is the more statistically defensible one. Compute means (arithmetic — RHR isn't lognormal). `delta_pct = Math.round((exposed_mean - baseline_mean) / baseline_mean * 100)`. The truthy-gate is `exposed_mean >= 1.10 * baseline_mean` (equivalent to `delta_pct >= 10` — use the multiplicative form to avoid rounding edge-cases). Round means to 1 decimal (`Math.round(x*10)/10`).
  - **Condition 3:** filter lifestyle logs to `date >= windowStart7`. Type-narrow each `value` via the V2.1 `lifestyle.ts` validated shapes (`as { sick?: boolean }` / `as { state?: string }` / `as { hours?: number }` / `as { count?: number }`) — the writer (V2.1 `logLifestyleEvent`) validates these on write, so no null-guard is needed.
    - `sick` = any log with `eventType === "sick" && value.sick === true`.
    - `stressed` = any log with `eventType === "feeling" && value.state === "stressed"`.
    - `short_sleep` = the most recent (by `date`) `sleep_hours` log has `value.hours < 6`. Tie-break: last-wins.
    - `high_alcohol` = sum of `value.count` across all `alcohol_drinks` logs in the window `≥ 3`. (Spec §8 says "3+ alcohol events"; with `count` clamped to 0..3 where `3` means "3+", we interpret "events" as the total drink count over the week. A single `count:3` log alone triggers — that's intentional given "3+" itself is heavy. One day at `count:3` OR three days at `count:1` both fire.)
  - **`triggered`:** `warm_up_active && (sustained_low_readiness != null && sustained_low_readiness.consecutive_days_low >= 3) && (rhr_spike != null && rhr_spike.exposed_mean >= 1.10 * rhr_spike.baseline_mean) && (lifestyle_flags.sick || lifestyle_flags.stressed || lifestyle_flags.short_sleep || lifestyle_flags.high_alcohol)`.
  - Return the populated `AlertEvaluation` object every time — the sub-objects ARE the chips, regardless of `triggered`.

- [ ] **Step 4: Run — expect PASS.** `npm test -- alert` → all green. `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit.**
  ```bash
  git add src/lib/hrv/alert.ts src/lib/hrv/alert.test.ts
  git commit -m "feat(hrv): alert detection engine — four-condition evaluator"
  ```

---

## Chunk 2: Alert-detect cron job

### Task 2: Replace the cron stub

**Files:**
- Modify: `src/app/api/cron/hrv-alert-detect/route.ts` (replace the stub body)

Mirror the established cron pattern from `src/app/api/cron/hrv-wearable-sync/route.ts` and `src/app/api/cron/hrv-weekly-insights/route.ts` (V2.2): `runtime="nodejs"`, `dynamic="force-dynamic"`, bearer check, `createServiceClient()`, per-row try/catch with `[cron/hrv-alert-detect]` prefix, summary JSON.

- [ ] **Step 1: Implement the cron.**

  ```ts
  import { NextResponse, type NextRequest } from "next/server";
  import { createServiceClient } from "@/lib/supabase/service";
  import {
    evaluateAlertConditions,
    type AlertReading,
    type AlertLog,
  } from "@/lib/hrv/alert";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  const WINDOW_DAYS = 60;
  const LIFESTYLE_WINDOW_DAYS = 7;
  const MS_PER_DAY = 86_400_000;
  ```

  Job body:
  1. Bearer check → `401` on mismatch (unchanged from stub).
  2. `const supabase = createServiceClient();`
  3. `const now = new Date();` `const cutoff60 = new Date(now.getTime() - WINDOW_DAYS * MS_PER_DAY).toISOString();` `const cutoff7Date = new Date(now.getTime() - LIFESTYLE_WINDOW_DAYS * MS_PER_DAY).toISOString().slice(0, 10);`
  4. Load opted-in primary connections via **two queries** — `hrv_wearable_connections` and `hrv_settings` are both member-keyed but have no direct foreign-key relationship, so a PostgREST embedded join (`hrv_settings!inner(...)`) cannot be used. Run them in sequence:
     ```ts
     const { data: optedRows, error: optedErr } = await supabase
       .from("hrv_settings")
       .select("member_id")
       .eq("share_to_coach", true);
     if (optedErr) {
       console.error("[cron/hrv-alert-detect] opt-in query:", optedErr.message);
       return new NextResponse("query failed", { status: 500 });
     }
     const optedInIds = (optedRows ?? []).map((r) => r.member_id as string);
     if (optedInIds.length === 0) {
       return NextResponse.json({ ok: true, connections: 0, created: 0, skipped: 0, notTriggered: 0 });
     }
     const { data: connectionRows, error: connError } = await supabase
       .from("hrv_wearable_connections")
       .select("id, member_id")
       .eq("is_primary", true)
       .in("member_id", optedInIds);
     if (connError) {
       console.error("[cron/hrv-alert-detect] connections query:", connError.message);
       return new NextResponse("query failed", { status: 500 });
     }
     const connections = connectionRows ?? [];
     ```
     The early-return when `optedInIds` is empty avoids an `.in(..., [])` query, which supabase-js rejects.
  5. For each opted-in primary connection (`for (const conn of connections)`), inside its own `try/catch`:
     - **Skip if an open alert already exists** for this member. Use `.limit(1).maybeSingle()` rather than bare `.maybeSingle()` — nothing in the schema enforces "at most one open alert per member", and a stray duplicate would make `.maybeSingle()` error out and break that member's processing on every cron run:
       ```ts
       const { data: existing } = await supabase
         .from("hrv_alerts").select("id")
         .eq("member_id", conn.member_id).eq("status", "open")
         .limit(1).maybeSingle();
       if (existing) { skipped += 1; continue; }
       ```
     - Load readings (last 60 days, this connection):
       ```ts
       const { data: readingRows, error: rErr } = await supabase
         .from("hrv_readings")
         .select("measured_at, warm_up_state, rolling_7d_mean_lnrmssd, baseline_60d_mean_lnrmssd, baseline_60d_swc, resting_hr_bpm")
         .eq("connection_id", conn.id)
         .gte("measured_at", cutoff60)
         .order("measured_at", { ascending: true });
       if (rErr) throw new Error(`readings query: ${rErr.message}`);
       const readings: AlertReading[] = (readingRows ?? []).map((r) => ({
         date: (r.measured_at as string).slice(0, 10),
         warmUpState: r.warm_up_state as AlertReading["warmUpState"],
         rolling7dMeanLnRmssd: r.rolling_7d_mean_lnrmssd as number | null,
         baseline60dMeanLnRmssd: r.baseline_60d_mean_lnrmssd as number | null,
         baseline60dSwc: r.baseline_60d_swc as number | null,
         restingHrBpm: r.resting_hr_bpm as number | null,
       }));
       ```
     - Load lifestyle logs (last 7 days, this member):
       ```ts
       const { data: logRows, error: lErr } = await supabase
         .from("hrv_lifestyle_logs")
         .select("logged_for_date, event_type, value")
         .eq("member_id", conn.member_id)
         .gte("logged_for_date", cutoff7Date);
       if (lErr) throw new Error(`lifestyle logs query: ${lErr.message}`);
       const lifestyleLogs: AlertLog[] = (logRows ?? []).map((l) => ({
         date: l.logged_for_date as string,
         eventType: l.event_type as string,
         value: l.value,
       }));
       ```
     - Evaluate: `const ev = evaluateAlertConditions({ readings, lifestyleLogs, now });`
     - If `!ev.triggered` → `notTriggered += 1; continue;`
     - Insert the alert (status defaults to `'open'`):
       ```ts
       const { error: insErr } = await supabase.from("hrv_alerts").insert({
         member_id: conn.member_id,
         conditions_met: ev.conditions_met as unknown as Json,
         triggered_at: now.toISOString(),
       });
       if (insErr) throw new Error(`alert insert: ${insErr.message}`);
       created += 1;
       ```
       (The `as unknown as Json` mirrors the V2.2 cron's pattern for jsonb columns. Import `Json` from `@/lib/supabase/database.types` if needed.)
  6. Return `NextResponse.json({ ok: true, connections: connections.length, created, skipped, notTriggered });`.
  - Match the `console.error("[cron/hrv-alert-detect] ...", ...)` prefix style.

- [ ] **Step 2:** `npx tsc --noEmit` clean. `npx eslint src/app/api/cron/hrv-alert-detect/route.ts` clean. (Repo-wide `npm run lint` has 5 pre-existing unrelated errors — do not fix them.)

- [ ] **Step 3: Commit.**
  ```bash
  git add src/app/api/cron/hrv-alert-detect/route.ts
  git commit -m "feat(hrv): alert-detect cron — evaluate + insert per opted-in member"
  ```

---

## Chunk 3: Email template + server actions

### Task 3: Personal-note email template

**Files:** Create `src/lib/email/templates/hrv-alert.ts`

Mirror `src/lib/email/templates/coach-review.ts` exactly: `import "server-only"`, the `esc()` helper, inline-CSS HTML, plain-text fallback, `sendEmail` from `@/lib/email/resend`, the `emailFooterHtml`/`emailFooterPlain` imports.

- [ ] **Step 1: Implement.**
  ```ts
  export type HrvAlertEmailArgs = {
    to: string;
    memberHandle: string;
    coachNotes: string;     // Munk's note text (Danish, free-form)
    baseUrl: string;
  };
  export async function sendHrvAlertEmail(args: HrvAlertEmailArgs): Promise<SendResult>;
  ```
  HTML body (mirror the coach-review template's structure):
  - Subject: `"En personlig besked fra Mikael Munk"` (no exercise/score).
  - Lead paragraph: `"Hej @${handle},"` (escaped).
  - The notes block, `\n` → `<br>`, escaped.
  - A short signature: `"— Mikael Munk, MakeIt // HQ"`.
  - CTA button → `${baseUrl}/hrv` (the member's own HRV page).
  - Footer: `emailFooterHtml()` / `emailFooterPlain()` — these helpers take **no arguments** (verified in `src/lib/email/footer.ts`; they read company URLs from a `COMPANY` constant internally). Do NOT pass `baseUrl`.
  - NO AI-vurdering block (this isn't a form-check).
  - **No medical claims, no diagnosis** in the template wording — the coach's free-form text is escaped and inlined verbatim; the template's own copy stays neutral and warm (spec §10).
  - Plain-text counterpart: same content, no HTML.

- [ ] **Step 2:** `npx tsc --noEmit` clean. `npx eslint src/lib/email/templates/hrv-alert.ts` clean.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/lib/email/templates/hrv-alert.ts
  git commit -m "feat(hrv): personal-note email template for coach alerts"
  ```

### Task 4: Server actions

**Files:** Modify `src/app/coach/queue/actions.ts`

Add three actions alongside the existing `reviewFormCheckAction`. Each follows the exact same demo-mode + RLS + revalidate pattern.

- [ ] **Step 1: Implement `sendHrvAlertNoteAction(alertId, noteText)`.**
  - `if (!SUPABASE_ENABLED) return { ok: true };`
  - Resolve supabase + user. No user → `{ ok: false }`.
  - `const trimmed = noteText.slice(0, 1000).trim(); if (!trimmed) return { ok: false };` (a note is required for this action).
  - **Update the alert** in one round-trip — fetch + update on success — using a returning-row update:
    ```ts
    const { data: row, error } = await supabase.from("hrv_alerts")
      .update({
        status: "reviewed_actioned",
        coach_note_text: trimmed,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", alertId).eq("status", "open")        // idempotent: only acts on open alerts
      .select("member_id, members:members!inner(email, handle)").maybeSingle();
    if (error || !row) return { ok: false };
    ```
  - Best-effort email:
    ```ts
    const m = Array.isArray(row.members) ? row.members[0] : row.members;
    if (m?.email) {
      try {
        const h = await headers();
        const proto = h.get("x-forwarded-proto") ?? "http";
        const host = h.get("host") ?? "localhost:3002";
        await sendHrvAlertEmail({
          to: m.email, memberHandle: m.handle, coachNotes: trimmed,
          baseUrl: `${proto}://${host}`,
        });
      } catch (err) {
        console.warn("[email] hrv-alert note failed:", err);
      }
    }
    ```
  - `revalidatePath("/coach"); revalidatePath("/coach/queue");` Return `{ ok: true }`.

- [ ] **Step 2: Implement `pauseSessionFromAlertAction(alertId)`.**
  - Demo-mode + session-resolution as above.
  - Load the alert to get `member_id`: `supabase.from("hrv_alerts").select("member_id").eq("id", alertId).eq("status", "open").maybeSingle()`. No row → `{ ok: false }`.
  - Insert a `hrv_session_modifiers` row (member-scoped, no specific session/program — the modifier is a coach suggestion the member will see in their session UI later):
    ```ts
    const { data: mod, error: modErr } = await supabase.from("hrv_session_modifiers").insert({
      member_id: alertRow.member_id,
      modifier_type: "paused_session",
      reason: "coach_pause_from_alert",
      applied_value: null,
    }).select("id").single();
    if (modErr || !mod) return { ok: false };
    ```
  - Update the alert in one round-trip with the modifier link:
    ```ts
    const { error: updErr } = await supabase.from("hrv_alerts").update({
      status: "reviewed_actioned",
      session_modifier_id: mod.id,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    }).eq("id", alertId).eq("status", "open");
    if (updErr) return { ok: false };
    ```
  - `revalidatePath("/coach/queue");` Return `{ ok: true }`. (No member-side surface to revalidate yet — the member-facing pause UI ships in a later phase per spec §7.)

- [ ] **Step 3: Implement `markHrvAlertSeenAction(alertId)`.**
  - Demo-mode + session-resolution.
  - Single update:
    ```ts
    const { error } = await supabase.from("hrv_alerts").update({
      status: "reviewed_noted",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    }).eq("id", alertId).eq("status", "open");
    if (error) return { ok: false };
    ```
  - `revalidatePath("/coach/queue");` Return `{ ok: true }`.

- [ ] **Step 4:** `npx tsc --noEmit && npx eslint src/app/coach/queue/actions.ts` clean.

- [ ] **Step 5: Commit.**
  ```bash
  git add src/app/coach/queue/actions.ts
  git commit -m "feat(hrv): coach-queue actions — send note, pause session, mark seen"
  ```

---

## Chunk 4: Coach UI

### Task 5: Data read + types

**Files:** Modify `src/lib/data/coach.ts`

- [ ] **Step 1:** Add the type and read function.
  ```ts
  import type { AlertConditionsMet } from "@/lib/hrv/alert";

  export interface HrvAlertRow {
    id: string;
    memberId: string;
    memberHandle: string;
    triggeredAt: string;
    conditionsMet: AlertConditionsMet;
  }

  export async function getOpenHrvAlerts(limit = 30): Promise<HrvAlertRow[]>;
  ```
  Implementation:
  - `const supabase = await createClient(); if (!supabase) return [];` (demo mode → empty list — no mock alerts; the section just renders the empty state. This is consistent with the rest of the page being demo-friendly.)
  - Query:
    ```ts
    const { data } = await supabase.from("hrv_alerts")
      .select("id, triggered_at, conditions_met, member:members!inner(id, handle)")
      .eq("status", "open")
      .order("triggered_at", { ascending: false })
      .limit(limit);
    if (!data) return [];
    return data.map((a) => {
      const m = Array.isArray(a.member) ? a.member[0] : a.member;
      return {
        id: a.id as string,
        memberId: m?.id ?? "",
        memberHandle: m?.handle ?? "—",
        triggeredAt: a.triggered_at as string,
        conditionsMet: a.conditions_met as unknown as AlertConditionsMet,
      };
    });
    ```
  Place the function alongside `getPendingFormChecks` and the type alongside the other coach types near the top of the file. The `member:members!inner(id, handle)` join is the same shape `getPendingFormChecks` uses, just with different columns — RLS already permits coach reads of `members.handle`.

- [ ] **Step 2:** `npx tsc --noEmit` clean.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/lib/data/coach.ts
  git commit -m "feat(hrv): getOpenHrvAlerts data read"
  ```

### Task 6: `HrvAlertCard` component

**Files:** Create `src/components/coach/HrvAlertCard.tsx`

Mirror `src/components/coach/CoachReview.tsx`: `"use client"`, `useState` + `useTransition`, a `Sheet` for the note flow. Three buttons inline on the card. Monochrome — match the form-check card visual rhythm exactly.

- [ ] **Step 1: Implement.** Default export `HrvAlertCard({ alert }: { alert: HrvAlertRow })`:
  - **Always rendered (card body):**
    - Header: `@{alert.memberHandle}` link to `/coach/members/${alert.memberId}` (same pattern as the form-check card), plus the triggered-at time formatted via `toLocaleString("da-DK", { hour:"2-digit", minute:"2-digit", day:"numeric", month:"short" })`.
    - **Condition chips** — a horizontal row of four small monochrome chips, each shown active (`text-fg` + bold) when its sub-condition contributed to the trigger, else faint (`text-fg-faint`). Use Danish labels:
      - Cond 0 → `"Aktiv"`, bold when `warm_up_active === true`.
      - Cond 1 → templated `` `${count} dage lavt` `` where `count = sustained_low_readiness?.consecutive_days_low ?? 0`. Bold when `count >= 3`, faint when `1..2`, hidden entirely when `sustained_low_readiness === null` (the engine could not compute it). Never render the literal "3 dage lavt" — it must reflect the real count.
      - Cond 2 → templated `` `RHR +${delta_pct}%` `` from `rhr_spike?.delta_pct`. Bold when `delta_pct >= 10`. Hidden when `rhr_spike === null`. (`delta_pct` can be negative — render the literal sign, e.g. `"RHR −3%"`, faint.)
      - Cond 3 → `"Livsstil"`, bold when any of the four `lifestyle_flags` sub-flags is true.
      For cond 3, also expose the per-sub-flag truth in a smaller secondary line — render `"syg · stress · søvn · alkohol"` as four spans, each `text-fg` when the matching sub-flag is true, `text-fg-faint` otherwise (do NOT hide false ones — Munk needs to see the negative space).
    - The `conditions_met` blob is rendered as **information only**, never as advice — spec §10.
  - **Three actions inline (mirror form-check's right-aligned button row):**
    - `"Markér som set"` — secondary button → calls `markHrvAlertSeenAction(alert.id)` directly inside `startTransition`. On `ok` the card disappears (revalidation removes it).
    - `"Foreslå pause"` — secondary button → calls `pauseSessionFromAlertAction(alert.id)`. (Danish: `Foreslå`, not `Forslå`.)
    - `"Send besked"` — primary button → opens the Sheet with a `<textarea>` for the Danish note (placeholder `"Skriv en personlig besked til @${handle}..."`), a small character counter (`min 1 / max 1000`), and a `"Send"` button which calls `sendHrvAlertNoteAction(alert.id, notes)`. On `ok` close the sheet and clear the input. While `pending`, disable all three buttons.

    **JSX skeleton (mirror `CoachReview.tsx`):** the `<Sheet open={open} onOpenChange={setOpen}>` wraps the `"Send besked"` trigger button and the `<SheetContent>`. The other two buttons sit OUTSIDE the `<Sheet>` element (or are siblings within it that use plain `onClick` and do NOT call `setOpen(true)`). One controlled `[open, setOpen]` state powers only the note-flow Sheet — `CoachReview.tsx` uses the same controlled-open pattern without `<SheetTrigger>`. A single shared `[pending, startTransition]` disables all three buttons during any in-flight action.
  - **No coach-side "delete" or "undo".** The action transitions are one-way per spec §8.

- [ ] **Step 2:** `npx tsc --noEmit && npx eslint src/components/coach/HrvAlertCard.tsx` clean.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/components/coach/HrvAlertCard.tsx
  git commit -m "feat(hrv): HrvAlertCard — three coach actions for an open alert"
  ```

### Task 7: Wire into `/coach/queue`

**Files:** Modify `src/app/coach/queue/page.tsx`

- [ ] **Step 1: Add the HRV-anomalies section ABOVE the form-check list.**
  - Fetch `const hrvAlerts = await getOpenHrvAlerts(50);` alongside the existing `getPendingFormChecks(50)`.
  - **Generalize the page H1** from `"Form-check kø"` to `"Coach-kø"` — the page now hosts two queues, and the old H1 misrepresents it. Update the sub-line to mention both queues: `"${pending.length} form-checks · ${hrvAlerts.length} HRV-anomalier venter."`.
  - **Both lists get parallel `<h2>` section headers** for visual rhythm consistency. Insert the new HRV section between the page header and the existing form-check list:
    - HRV section header: `<div className="eyebrow mb-2">HRV-anomalier</div>` + `<h2 className="font-display text-2xl">${hrvAlerts.length} venter på handling.</h2>`.
    - If `hrvAlerts.length === 0` → small faint copy `"Ingen HRV-anomalier kræver handling lige nu."` (no `surface-2` card — keep the empty state lightweight; the form-check empty state below already provides a heavy empty surface, and we don't need two side-by-side).
    - Otherwise a `<ul className="space-y-3">` of `<li><HrvAlertCard alert={a} /></li>` per alert.
  - Then add a **parallel section header for the form-check list**: `<div className="eyebrow mb-2">Form-checks</div>` + `<h2 className="font-display text-2xl">${pending.length} venter på review.</h2>`. The existing list rendering (the `pending.length === 0` full-card empty state and the form-check `<ul>`) stays unchanged below it.
  - Do not regress the existing form-check list — the rendered output for the form-check section is identical to today aside from the new `<h2>` header above it.

- [ ] **Step 2:** `npx tsc --noEmit && npx eslint "src/app/coach/queue/page.tsx"` clean. Manual smoke (optional): `npm run dev`, sign in as Munk, visit `/coach/queue` — the new section renders with the empty-state copy locally.

- [ ] **Step 3: Commit.**
  ```bash
  git add "src/app/coach/queue/page.tsx"
  git commit -m "feat(hrv): /coach/queue — HRV-anomalies section above form-checks"
  ```

### Task 8: V2.3 verification

- [ ] **Step 1:** `npm test` — all green, including the new `alert` tests.
- [ ] **Step 2:** `npx tsc --noEmit && npm run build` — both pass. `npx eslint` on all V2.3-touched files clean. Repo-wide `npm run lint` should show **no new** errors in V2.3 files; the 5 pre-existing unrelated errors stay as-is (`coach/system/*`, `PhaseAnimator.tsx`, `LogWeightCard.tsx`, `PlanGenerationOverlay.tsx`, `exercises.ts`, `SessionClient.tsx`) — out of scope.
- [ ] **Step 3: Cron smoke (local).** With local Supabase and `CRON_SECRET` set, `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3002/api/cron/hrv-alert-detect` returns `{ ok: true, ... }`. With no opted-in member meeting all four conditions, expect `created: 0`. If the local CLI/Docker is unavailable, skip this step — `tsc` + `build` + the unit tests are sufficient.
- [ ] **Step 4: Final commit.**
  ```bash
  git commit --allow-empty -m "chore(hrv): V2.3 verification — coach red-flag queue complete"
  ```

---

## Done — V2.3 complete

Opted-in members triggering all four §8 conditions surface on `/coach/queue` as actionable cards; Munk can send a personal Danish note (Resend email, best-effort), suggest a session pause (creates `hrv_session_modifiers`), or mark the alert seen. The four conditions are computed deterministically by a pure engine, the cron is idempotent against open alerts, and demo mode degrades gracefully.

**Next:** V2.4 (session integration — B-prong start-of-session deload suggestion) and V2.5 (adaptive periodization — D-prong baseline-anomaly trigger for the Claude program generator). Spec §7 has the full design. Reps integration (§8) is also unstarted.

**Not in V2.3:** the member-facing session-pause UI (V2.4 territory — `DeloadSuggestionSheet`), Reps event for "coach acted on an alert", a `notif_coach_hrv_note` opt-out toggle (default-send for V2.3; gate later), and a richer in-card context view that joins lifestyle/readings under opt-in RLS (deferred — Munk can already drill into `/coach/members/[id]`).
