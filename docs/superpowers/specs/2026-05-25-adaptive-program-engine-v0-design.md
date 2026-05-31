# Adaptive Program Engine v0 — Daily session adaptation under Munk-in-the-loop

**Date:** 2026-05-25 · **Spec revision:** 1
**Status:** Draft (design)
**Phase:** Søjle 1 af 4 i 6-mdr wauw-planen — closes the "D-prong adaptive periodization" slot deferred from V2.6
**Module path:** new `src/lib/adaptive/*`, extends existing `hrv_session_modifiers` + `hrv_alerts` infrastructure, integrates with `src/lib/programs/*` and `src/lib/hrv/*`

> Strategic context: [`~/.claude/plans/hvis-vi-skal-have-dreamy-spring.md`](../../../.claude/plans/hvis-vi-skal-have-dreamy-spring.md) — fire-søjle wauw-tese, hvor "The Living Program" er det tekniske wauw. Bygger oven på det fundament V2.1–V2.5 har lagt (lifestyle log, weekly insights, coach queue, session nudge, Reps milestones).

---

## 0. References to existing codebase (verified)

| Artifact | Path | Status |
|---|---|---|
| Program data model | `src/lib/workout.ts` — `Session`, `Exercise`, `ExerciseSet` (target/logged reps, weight, RPE, restSec) | Shipped — engine consumes these |
| Rule-based program gen | `src/lib/data/program-generator.ts` — `generateProgram()` deterministic from ProfileInput | Shipped — template for adaptive rule layer |
| Claude program gen + caching | `src/lib/data/program-generator-claude.ts:64-177` — `generateWithClaude()` with `cache_control: ephemeral` on system prompt, Zod structured output via `messages.parse()` | Shipped — exact template for adaptive reasoning layer |
| HRV signals & readiness | `src/lib/hrv/baseline.ts` — `rollingMean`, `withinSubjectSd`, `classifyReadiness` (5 buckets) | Shipped — daily input #1 to engine |
| HRV warmUpState gate | `src/lib/hrv/types.ts` — `WarmUpState: discovery|provisional|active` (≥14 readings) | Shipped — engine only acts when "active" |
| Readiness nudge eval | `src/lib/hrv/nudge.ts` — `evaluateNudge()` (active + low|very_low + ≤36h old + opt-in) | Shipped — engine extends this signal into actual program mutation |
| **Session modifiers table** | `supabase/migrations/0032_hrv_module.sql` — `hrv_session_modifiers(member_id, session_id, modifier_type, reason, accepted_by_member)` | Shipped — **engine writes here, no new table needed** |
| Existing modifier_type enum | top_set_reduction, volume_reduction, deload_week_insertion, paused_session | Shipped — **v0 extends with 4 new types** (§3) |
| HRV alert queue (Munk review) | `src/lib/hrv/alert.ts` + `src/app/api/cron/hrv-alert-detect/route.ts` + `hrv_alerts` table | Shipped — **engine's `escalate_to_coach` action writes here** instead of new queue |
| Lifestyle log signals | `supabase/migrations/0032_hrv_module.sql` — `hrv_lifestyle_logs(event_type, value)` (sleep, alcohol, feeling, menstrual_phase) | Shipped — daily input #2 to engine |
| Skip-days signal | `src/lib/data/skip-days.ts` — `getSkipDayIndices()` from `nutrition_skip_days` | Shipped — daily input #3 |
| Form-check outcomes | `form_checks(ai_score, ai_neg[])` reviewed by Munk | Shipped — daily input #4 (last 7 days, weighted) |
| Week progression | `src/lib/data/week-progression.ts` — `maybeAdvanceWeek`, `isDeloadWeek` | Shipped — engine respects these; never advances week itself |
| Cron registry | `vercel.json` — existing daily crons at 05/06/15 UTC | Shipped — **adds `/api/cron/adapt-program-daily` at 03:30 UTC = 05:30 CET** |
| Member opt-in toggle | `hrv_settings.session_suggestion_enabled` | Shipped — **v0 extends with `adaptive_program_enabled`** (§5) |

**Key insight:** ~70% of v0's infrastructure already exists. Engine is mostly **wiring + reasoning + 4 new action types**, not green-field.

---

## 1. Overview & positioning

The Adaptive Program Engine rewrites the next session each morning based on signals. Output is a `hrv_session_modifiers` row (or absence thereof — a "no change" decision is also valid output, just unrecorded). The session generator reads modifiers when materialising the day's session UI.

Two layers, both required, neither sufficient alone:

1. **Rule layer** (`src/lib/adaptive/engine.ts`) — deterministic, ~50 lines, runs in <10ms per member. Takes HRV readiness bucket + 7d trend + last-session RPE + days-since-heavy + missed-sessions and produces a candidate action with confidence score. **Most days output "no change".**
2. **Reasoning layer** (`src/lib/adaptive/reasoning.ts`) — Claude Sonnet 4.6 with cached system prompt (same pattern as `program-generator-claude.ts`). Activates only when rule layer produces a non-trivial candidate OR when context is ambiguous (e.g., conflicting signals). Outputs final action + 2-3 sentence explanation in Danish + confidence + `human_review_recommended: boolean`.

**Brand positioning.** We never silently alter a session. Every modification is shown to the member with **why** (the audit log) and **who signed off** (auto, co-coach, Munk). The member can always one-tap revert to the original session — the engine is an opinion, not a command. This honesty is the wauw-moment: most competitors hide their algorithm; we open it.

**Why Munk-in-the-loop, not pure auto.** A pure-AI program engine is a liability vector (injury, demotivation, brand damage). Munk's overrides become the engine's training signal — every override is logged as a few-shot example for the reasoning prompt, making the system smarter every week. By Søjle 4 (Crew Coaching Pyramid), co-coaches enter the same loop in shadow mode → live.

---

## 2. Goals & non-goals

### Goals (v0)

- For every active program assignment with HRV `warmUpState = 'active'` + `adaptive_program_enabled = true`, generate at most one adaptation per session per day.
- Persist adaptations as `hrv_session_modifiers` rows with full audit trail: input snapshot (jsonb), rule decision, reasoning output, final action, status.
- Surface "why today is different" UI on the dashboard and pre-session ritual screen, in plain Danish.
- Route high-uncertainty / high-impact adaptations (`human_review_recommended = true` OR action ∈ {deload_week_insertion, paused_session, escalate_to_coach}) into the existing `hrv_alerts` Munk queue.
- One-tap member revert: original session always recoverable in <100ms.
- Outcome tracking: post-session RPE + completion-rate logged against the adaptation for future feedback loop.
- Zero behavior change for members with `adaptive_program_enabled = false` (default off in v0 — opt-in via onboarding step).

### Non-goals (v0)

- **Multi-day planning** — engine acts on *the next session*, not the next week. Week-shaping is for v1.
- **Cross-program optimisation** — if member has parallel programs (rare), engine treats each independently.
- **Nutrition adaptation** — separate spec, follows same pattern but uses `nutrition_plans` table.
- **Custom action authoring** — Munk cannot define new modifier types via UI; new types ship via migrations.
- **Co-coach reviews** — sandbox mode for Beasts is Søjle 4 (separate spec). v0 is Munk-only on the override side.
- **Push notifications for adaptations** — same reasoning as V2.5 milestones: HRV push channel is reserved for anomalies. Adaptations surface via dashboard + email digest.
- **Automatic program regeneration** — engine never calls `generateWithClaude()` mid-program. Programs are stable; only session-level modifiers change.
- **Member-facing reasoning override** — member can revert, but cannot say "next time, ignore my HRV". That's a v1 setting if needed.

### Out of scope (other Søjle work)

- Søjle 2 (Open Brain UI) — dashboard rebuild + ritual screens. This spec only defines the *data* that surfaces there.
- Søjle 3 (Munk Multiplier) — voice-note pipeline + mobile coach PWA. This spec defines the queue that pipeline consumes.
- Søjle 4 (Crew Coaching Pyramid) — co-coach sandbox layer on top of Munk's queue.

---

## 3. Action catalogue

The complete v0 action space — **8 types, no more, no less.** Bounded action space is critical: it makes outcomes measurable, the reasoning prompt tractable, and the audit log understandable.

| Action | Existing? | Description | Eligible when |
|---|---|---|---|
| `no_change` | implicit | Engine ran, no action warranted. Not persisted. | Default. |
| `top_set_reduction` | ✓ existing enum | Reduce top-set load by X% (X ∈ {5, 10, 15}). Working sets keep load, drop reps. | HRV `low`; or RPE-trend rising on top sets; or sleep <6h logged. |
| `volume_reduction` | ✓ existing enum | Drop N accessory sets (N ∈ {1, 2, 3}). Main lifts untouched. | HRV `low`; or last session ≥2 missed sets. |
| `paused_session` | ✓ existing enum | Replace today's session with active recovery (10 min mobility + walk). | HRV `very_low`; or sickness log; or sleep <5h + lifestyle "feeling: 1/5". |
| `deload_week_insertion` | ✓ existing enum | Mark current week as deload (uses existing `isDeloadWeek` flag). Reduces week-wide loads 40%. | HRV `very_low` ≥3 of last 5 days; or RPE-trend rising ≥1.5 over 14 days; **always escalates to Munk** before applying. |
| `exercise_swap_variant` | **NEW** | Swap one exercise to lighter variant (squat→goblet, deadlift→trap-bar, bench→DB bench). Mapped via `exercise_variant_map` table (new — §6). | Last form-check on that exercise <6/10; or specific joint/lifestyle log; or `low` HRV + heavy main lift. |
| `session_shorten` | **NEW** | Mark optional accessory blocks as "skip if short on time". UX-only flag; member still chooses. | HRV `low`; or self-reported time constraint (lifestyle log: time_available <30min). |
| `escalate_to_coach` | **NEW** | No auto-action. Insert `hrv_alerts` row with reasoning. Munk sees it in next morning queue. | Reasoning layer outputs `human_review_recommended: true` and confidence <0.7; or any signal combination not covered by rules. |

**Combinations:** at most one action per session. The rule layer picks the highest-confidence single action; the reasoning layer can downgrade or escalate but not combine.

**Mutation to existing enum:** migration adds `exercise_swap_variant`, `session_shorten`, `escalate_to_coach`. The first two are session-modifier rows; the third inserts to `hrv_alerts` and writes a placeholder `hrv_session_modifiers` row of type `escalate_to_coach` with `accepted_by_member = null` (visible to member as "Coach reviewing today's plan").

---

## 4. Decision flow

```
05:30 CET cron tick
  ↓
for each active program_assignment where adaptive_program_enabled = true:
  ↓
  load member snapshot:
    - latest HrvReading (must be ≤36h old, warmUpState='active')
    - last 7 days HRV trend (lnRMSSD delta vs baseline)
    - last 3 sessions' RPE-trend + completion rate
    - last 14 days lifestyle logs
    - last 7 days form-check scores (per exercise)
    - days since heavy lift on each main lift
    - next session in queue (must exist, scheduled within 48h)
  ↓
  rule_layer.evaluate(snapshot) → candidate { action, confidence, reasons[] }
  ↓
  if candidate.action == 'no_change' AND confidence > 0.85:
      log telemetry { decided: 'no_change_high_confidence' }
      exit
  ↓
  reasoning_layer.refine(snapshot, candidate, recent_munk_overrides[]) →
      { final_action, dansk_forklaring, confidence, human_review_recommended }
  ↓
  if final_action == 'no_change': exit
  ↓
  INSERT hrv_session_modifiers {
    member_id, session_id, modifier_type=final_action, reason='adaptive_v0',
    input_snapshot=<jsonb>, rule_decision=<jsonb>, reasoning_output=<jsonb>,
    explanation_da=<text>, confidence=<numeric>,
    accepted_by_member=null, reviewed_by=null
  }
  ↓
  if human_review_recommended OR action in {deload_week_insertion, paused_session, escalate_to_coach}:
      INSERT hrv_alerts { conditions_met: {…adaptation…}, status: 'open', triggered_at: now() }
      → surfaces in Munk's existing /coach queue
  ↓
  else:
      mark hrv_session_modifiers.reviewed_by = 'auto', reviewed_at = now()
  ↓
  send dashboard event (no push; member sees on next app open)
```

**Failure modes:**
- Missing HRV reading (>36h old) → skip member silently. Member sees original session. Telemetry: `skipped_stale_hrv`.
- Claude API timeout → degrade gracefully: if rule layer confidence ≥0.8, persist with `reasoning_output: null, explanation_da: <fallback template>`. Telemetry: `reasoning_layer_unavailable`.
- DB write fails → no retry in v0 (cron runs again tomorrow). Telemetry: `persist_failure` (high-cardinality alert).

---

## 5. Member opt-in & UX

**Default state:** `adaptive_program_enabled = false` for all members (new column on `hrv_settings`). v0 ships **opt-in** to limit blast radius. Once we have ≥4 weeks of outcome data showing completion-rate ≥ baseline, v1 flips the default.

**Onboarding hook:** when a member crosses `warmUpState: provisional → active` (day 14 of consistent sync), trigger a one-screen consent flow:

> **Vil du have et levende program?**
> Dit program tilpasser sig hver morgen baseret på din HRV, søvn og sidste session. Munk ser de svære valg. Du kan altid trykke "fortryd" og få den oprindelige session.
> [Ja, tænd det] [Nej tak, behold som det er]

Setting persists on `hrv_settings.adaptive_program_enabled`. Member can toggle in `/settings/hrv` at any time.

**Surfacing on the dashboard:** when a `hrv_session_modifiers` row exists for today's session, the dashboard "today's session" card shows:

- The adapted session (load/volume already applied)
- A collapsible "**Hvorfor i dag er anderledes**" panel showing:
  - The 2-3 sentence Danish explanation
  - The 1-3 inputs that drove the decision ("HRV var lav", "Sov 5t14m", "Sidste squat-form-check 6/10")
  - Who signed off ("Auto-godkendt 05:31" or "Munk godkendte 06:42")
- A subtle "**Vis original**" link → restores original session for this run only (logged for outcome tracking)

**Pre-session ritual screen** (separate Søjle 2 spec) reads the same data and elevates the explanation to a full screen.

---

## 6. Schema changes

One migration: `supabase/migrations/0041_adaptive_engine_v0.sql`.

```sql
-- 1) Extend modifier_type enum
ALTER TABLE hrv_session_modifiers
  DROP CONSTRAINT IF EXISTS hrv_session_modifiers_modifier_type_check;
ALTER TABLE hrv_session_modifiers
  ADD CONSTRAINT hrv_session_modifiers_modifier_type_check
  CHECK (modifier_type IN (
    'top_set_reduction', 'volume_reduction', 'deload_week_insertion', 'paused_session',
    'exercise_swap_variant', 'session_shorten', 'escalate_to_coach'
  ));

-- 2) Add audit columns
ALTER TABLE hrv_session_modifiers
  ADD COLUMN IF NOT EXISTS input_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS rule_decision jsonb,
  ADD COLUMN IF NOT EXISTS reasoning_output jsonb,
  ADD COLUMN IF NOT EXISTS explanation_da text,
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS reviewed_by text  -- 'auto' | 'munk' | 'co_coach:{member_id}'
    CHECK (reviewed_by IS NULL OR reviewed_by = 'auto' OR reviewed_by = 'munk' OR reviewed_by LIKE 'co_coach:%'),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 3) Opt-in flag
ALTER TABLE hrv_settings
  ADD COLUMN IF NOT EXISTS adaptive_program_enabled boolean NOT NULL DEFAULT false;

-- 4) Exercise variant map (for swap action)
CREATE TABLE IF NOT EXISTS exercise_variant_map (
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  lighter_variant_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  reason text,  -- 'joint-friendly', 'unilateral', 'low-cns'
  PRIMARY KEY (exercise_id, lighter_variant_id)
);

-- 5) Outcome tracking view (no new table; aggregate at read time)
CREATE OR REPLACE VIEW adaptive_outcomes_v0 AS
  SELECT
    hsm.id AS modifier_id,
    hsm.member_id,
    hsm.session_id,
    hsm.modifier_type,
    hsm.accepted_by_member,
    s.status AS session_status,
    -- avg logged RPE vs target RPE on top sets
    (SELECT avg(ss.logged_rpe - ss.target_rpe)
     FROM session_sets ss
     JOIN session_exercises se ON ss.session_exercise_id = se.id
     WHERE se.session_id = hsm.session_id AND ss.logged_rpe IS NOT NULL AND ss.position = 1
    ) AS rpe_delta,
    -- next-day HRV bucket
    (SELECT readiness_bucket FROM hrv_readings
     WHERE member_id = hsm.member_id
       AND measured_at::date = (s.scheduled_for::date + interval '1 day')
     ORDER BY measured_at DESC LIMIT 1
    ) AS next_day_readiness
  FROM hrv_session_modifiers hsm
  JOIN sessions s ON s.id = hsm.session_id
  WHERE hsm.reason = 'adaptive_v0';
```

**RLS:** existing `hrv_session_modifiers` policies (`members_own_*`) cover the new columns. The view inherits source-table RLS. `exercise_variant_map` is admin-only insert, public read (no RLS).

---

## 7. Reasoning layer prompt structure

Cached system prompt (`cache_control: { type: 'ephemeral' }`) contains:
- Identity ("Du er Munks assistent. Du foreslår tilpasninger til dagens session.")
- The 8-action catalogue with eligibility criteria
- Brand voice rules (no medical claims, no scare language, plain Danish)
- The week-progression contract ("Du må ikke spole uger frem eller skifte program.")
- Last 5 Munk overrides as few-shot examples (rotated weekly via cron)

User-message payload (uncached) is the member snapshot + rule candidate as JSON. Structured output via Zod schema:

```ts
const AdaptationDecision = z.object({
  final_action: z.enum([
    'no_change', 'top_set_reduction', 'volume_reduction', 'paused_session',
    'deload_week_insertion', 'exercise_swap_variant', 'session_shorten', 'escalate_to_coach',
  ]),
  action_params: z.record(z.union([z.number(), z.string()])).optional(),
  explanation_da: z.string().max(280),
  confidence: z.number().min(0).max(1),
  human_review_recommended: z.boolean(),
  reasons_used: z.array(z.string()).max(5),
});
```

**Cost envelope:** ~2K tokens cached + ~500 input + ~150 output. At Sonnet 4.6 with cache hit: ~$0.001 per member-day. 200 members = $6/mo. 2000 members = $60/mo. Cost is not a constraint.

---

## 8. Telemetry & observability

New event types (extend existing telemetry table — see Søjle 0 starter step §3 in the plan):
- `adapt.cron.started` `{ tick_at, eligible_members }`
- `adapt.skipped` `{ member_id, reason }` — `stale_hrv`, `not_active`, `no_next_session`, `opt_out`
- `adapt.rule.decided` `{ member_id, action, confidence, reasons[] }`
- `adapt.reasoning.called` `{ member_id, model, cache_hit, tokens_in, tokens_out, ms }`
- `adapt.persisted` `{ member_id, modifier_id, action, escalated_to_munk }`
- `adapt.member.reverted` `{ member_id, modifier_id, time_to_revert_ms }`
- `adapt.outcome.captured` `{ modifier_id, session_status, rpe_delta, next_day_readiness }`

**Daily op dashboard** (`/coach/system/adaptive`):
- Coverage: % of eligible members adapted today
- Action distribution (pie)
- Revert rate (red flag if >25%)
- Escalation rate (red flag if >15%)
- Reasoning layer cache-hit % (target: >90%)
- p50 / p95 end-to-end latency

---

## 9. Rollout

Three-step ramp, gated on metrics:

1. **Week 1 — Shadow mode.** Engine runs daily; persists adaptations with `reviewed_by = 'auto'` BUT session UI does NOT read modifiers yet. Munk reviews all rows manually via `/coach/system/adaptive`. Goal: validate decisions vs Munk's judgment.
2. **Week 2 — Munk-approved members only.** Munk hand-selects 5 members (mix of tiers, training phases). They get the consent flow. Engine actions land in their sessions. Daily check-in with all 5 by Munk.
3. **Week 3+ — Open opt-in.** Consent flow fires for all members crossing `warmUpState: active`. No proactive nudges; word-of-mouth + Munk endorsement only.

**Kill criteria:**
- Member-reported injury linked to an adaptation → engine off for that member type until root-cause done.
- Revert rate >40% in week 2 → pause, re-tune rule layer.
- Munk-override rate on auto-decisions >30% → reasoning layer needs retraining (more few-shot examples).

---

## 10. Open questions for planning

These don't block design but need answers before Søjle 2 (UI) starts:

1. **Revert window** — can a member revert *during* a session (after one set), or only before starting? v0 leans "before starting only" to keep state simple; allow post-set revert in v1.
2. **What does "next session" mean for paused programs?** If a member pauses for >7 days, do we still adapt the resumed session? v0: no — require ≥3 fresh HRV readings post-resume.
3. **Cycle-tracking integration** — members with cycle tracking enabled (existing `hrv_settings.cycle_tracking_enabled`) — do we feed phase into the reasoning prompt? v0: yes, as a passive signal; no phase-specific actions yet.
4. **Munk vacation mode** — if Munk is unreachable for ≥48h, escalations stack up. v0 emails Munk; v1 should auto-fallback to "show member the AI reasoning even when escalated, with disclaimer".

---

## 11. Estimated effort (solo + Claude)

| Stage | Days |
|---|---|
| Migration + schema | 0.5 |
| Rule layer + tests | 1.5 |
| Reasoning layer (prompt + Zod + cache) | 1 |
| Cron handler + telemetry | 1 |
| Member opt-in flow + consent screen | 1 |
| Dashboard "why today is different" card | 1.5 |
| `/coach/system/adaptive` ops dashboard | 1 |
| Shadow-mode validation week | 5 (mostly waiting + tuning) |
| **Total** | **~12 working days** |

Fits M1 (fundament v0 — rule-only) + M2 (reasoning layer + persistence + UI) in the 6-mdr plan.
