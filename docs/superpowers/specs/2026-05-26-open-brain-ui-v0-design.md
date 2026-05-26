# Open Brain UI v0 — Make the adaptive engine's reasoning transparent

Status: design spec, not yet implemented.
Author: Claude + Munk, 2026-05-26.
Builds on: `2026-05-25-adaptive-program-engine-v0-design.md` (Søjle 1, shipped).

---

## 0. References to existing codebase (verified)

| Surface | Path | What we'll extend |
|---|---|---|
| Adaptation card | `src/components/adaptive/AdaptationCard.tsx` | Add "Vis tankegang" reveal that expands inline |
| Rule layer (pure) | `src/lib/adaptive/engine.ts` | Re-invoke client-side for counterfactuals — already a pure function with `now: Date` injected |
| Engine input types | `src/lib/adaptive/types.ts` | Re-use `EngineInput`/`CandidateDecision` shapes verbatim |
| Persisted modifier | `hrv_session_modifiers` | Add a `rendered_reasoning_at` timestamp column (telemetry) — see §6 |
| Audit snapshot | `hrv_session_modifiers.input_snapshot` (jsonb) | Already carries the signals the engine saw. We deserialise this client-side for the reasoning panel + counterfactuals |
| Rule decision blob | `hrv_session_modifiers.rule_decision` (jsonb) | Already carries reasons + confidence. Display as-is |
| Claude refinement blob | `hrv_session_modifiers.reasoning_output` (jsonb) | Already carries `explanation_da` + (when present) the full Claude response we display in detail |
| Historical trail data | `hrv_session_modifiers WHERE reason='adaptive_v0'` | Read for the /hrv "tidligere tilpasninger" feed |
| Outcome view | `adaptive_outcomes_v0` view | Already joins each modifier with session outcome — drives the "how did past adaptations work out" panel |
| Reset point | `applyAdaptationToSession()` in `src/lib/adaptive/apply.ts` | Already returns a clone — counterfactual UI can preview the same transformation against hypothetical inputs |

---

## 1. Overview & positioning

Søjle 1 made the engine work. Søjle 2 makes it **visible** and **interactive**.

Today the member sees a one-paragraph Danish explanation in the
`AdaptationCard`. Behind it sits a fully traceable decision: which
signals fired, which rule matched, what Claude refined, what the
counterfactual would have been. Søjle 2 surfaces that without
overwhelming the member.

**Three claims this UI makes** that competitors can't:

1. **No black box.** Every adaptation is decomposable into the
   signals that drove it. The member can click into "why" and see
   the actual readings — not a marketing summary.
2. **Try it yourself.** Counterfactual sliders let the member ask
   "what if I had slept 7h instead of 5h?" and see the engine's
   answer in milliseconds — because the rule layer is pure JS that
   runs in the browser. No API call, no spinner.
3. **A trail you can walk back.** Past adaptations on /hrv form a
   weekly cadence narrative — "the week you drank Thursday, top-set
   dropped 10%; you accepted; landed RPE 8.1 vs target 8." Trust
   compounds.

**Why this is wauw-level differentiation:**
- Trainerize, TrueCoach, Future, Everfit, FitBudd: zero
  inspection of AI/automation reasoning. The coach is a black box
  to the client.
- WHOOP, Oura: opaque 0–100 recovery scores with no decomposition.
- Even labs (HRV4Training, Elite HRV): show raw values but no
  prescriptive reasoning.

We show the **whole chain**: raw signal → rule → Claude refinement →
action → outcome. That's the moat: no competitor can copy this
without rebuilding their entire AI stack to be inspectable.

---

## 2. Goals & non-goals

### Goals (v0)

- **G1**: Member can expand the AdaptationCard inline to see the
  reasoning detail (signals + rule fired + Claude refinement) in a
  single tap. No navigation away from the session.
- **G2**: Member can adjust hypothetical inputs (sleep hours,
  alcohol toggle, feeling state) and see the engine's would-be
  decision recompute live. Powered client-side by re-invoking the
  pure rule layer.
- **G3**: /hrv carries a "tidligere tilpasninger" section showing
  the member's last 30 days of adaptations with outcome data
  (accepted / kept original / RPE delta / next-day readiness).
- **G4**: Every reveal/counterfactual interaction is telemetered
  so we can measure: does opening the brain build trust (= higher
  accept rate over time)?
- **G5**: All copy honest. No "AI thinks…" hedging. The engine made
  a decision; the member sees the components.

### Non-goals (deferred to v1)

- **NG1**: Coach-side ops dashboard (per-action accept rates, RPE
  deltas, escalation funnel). Munk has the queue + the
  `adaptive_outcomes_v0` view to query directly for now.
- **NG2**: Editable counterfactuals that re-persist as the new
  decision. v0's sliders are exploratory only — they don't change
  the actual session.
- **NG3**: Sharing/exporting reasoning ("here's why my coach
  reduced my squat today"). Could be powerful for crew posts;
  defer until the share flow exists.
- **NG4**: Multi-day reasoning timeline ("this week the engine
  saw…"). Single-day view in v0; rolling window in v1.
- **NG5**: Reasoning translation to other languages. Danish-only
  for v0 — same constraint as the AdaptationCard.

---

## 3. Surface catalogue

Five UI surfaces. Tier 1+2+3 are inline on `/session/[id]`;
Tier 4 lives on `/hrv`.

### T1: Inline reveal — "Vis tankegang"

Added to `AdaptationCard.tsx`. Below the explanation paragraph,
above the accept/keep CTAs:

```
┌─────────────────────────────────────────────────┐
│ TOPSÆT-VÆGT REDUCERET     AUTOMATISK · HRV+SØVN │
│                                                  │
│ Din HRV er lav i dag og du sov 5t14m. Vi har    │
│ trukket topsæt-vægten 10% ned.                  │
│                                                  │
│ [ Vis tankegang ↓ ]                              │
│                                                  │
│ [ OK kør tilpasset ] [ Behold original ]        │
└─────────────────────────────────────────────────┘
```

- Pure disclosure pattern. No accordion library — `<details>`
  element with custom styled `<summary>` (matches existing UI
  language: minimal, monochrome).
- Open state expands T2 inline. Closed by default.
- Tracked: `adaptive_reasoning_revealed` event (telemetry §8).

### T2: Reasoning detail panel

Expanded T1. Three subpanels stacked:

```
┌─────────────────────────────────────────────────┐
│ HVAD MOTOREN SÅ                                 │
│ HRV i dag      ▼ Under din norm (delta −1.3×SWC)│
│ Søvn (2d snit) 5t14m  ← under tærskel 5t30m     │
│ Følelse i går  Træt                             │
│ Sidste session RPE 8.5 vs mål 8                 │
│ Form-check    Back squat 8/10 · for 4 dage siden│
│                                                  │
│ HVILKEN REGEL FYRRE                             │
│ HRV lav + søvnfaktor → topsæt-reduktion         │
│                                                  │
│ HVAD MUNKS ASSISTENT JUSTEREDE                  │
│ Reglen foreslog 10%. Claude bekræftede 10%      │
│ (kunne have valgt 5% eller 15%) fordi din       │
│ baseline har været stabil de sidste 14 dage.    │
│                                                  │
│ [ Hvad hvis... ↓ ]                              │
└─────────────────────────────────────────────────┘
```

- **"Hvad motoren så"** — read from `input_snapshot` jsonb.
  Each row has the field value + (optional) why-relevant micro-text.
- **"Hvilken regel fyrede"** — derived from `rule_decision.reasons`.
  We map reason-code combinations to plain-Danish rule names
  (defined in `src/lib/adaptive/reason-narratives.ts` — new file).
- **"Hvad Munks assistent justerede"** — when `reasoning_output`
  is non-null, render Claude's `reasons_used` + a comparison
  ("reglen foreslog X, Claude bekræftede Y"). When null (rule-only
  decision), this subpanel is omitted entirely.
- Tracked: `adaptive_signal_clicked` per row click (if rows are
  interactive — see open question OQ-2).

### T3: Counterfactual sliders — "Hvad hvis…"

The wauw. Inside T2, a second `<details>` expands:

```
┌─────────────────────────────────────────────────┐
│ HVAD HVIS DU HAVDE...                           │
│                                                  │
│ Søvn      [ ◯─────────●──── ] 5t14m → 7t       │
│ Alkohol   [ ☐ ingen i 2 dage ]                  │
│ Følelse   [ Træt ▼ ] → Frisk                    │
│                                                  │
│ ─────────────────────────────────────────────── │
│ Motoren ville have valgt:                       │
│                                                  │
│ ✓ Ingen ændring                                 │
│   ("Alt ser fint ud — kør sessionen som         │
│    planlagt.")                                   │
└─────────────────────────────────────────────────┘
```

- Three controls: sleep hours slider, alcohol toggle, feeling
  selector. All initialised from `input_snapshot`.
- On any change, client-side function builds a mutated
  `EngineInput` and calls `evaluateAdaptation()` (the same pure
  function the cron uses). Result renders in <16ms.
- The recomputed decision shows its action + rule-layer
  explanation in Danish (`buildExplanationDa()` already
  produces this for each path).
- Reset button restores the actual snapshot.
- **No persistence.** This is a teaching surface, not a way to
  change today's session. To override → "Behold original" CTA.
- Tracked: `adaptive_counterfactual_used` once per session per
  member with the dimension changed (sleep / alcohol / feeling).

### T4: Historical trail — "Tidligere tilpasninger"

New section on `/hrv` below the existing readiness blocks.

```
┌─────────────────────────────────────────────────┐
│ TIDLIGERE TILPASNINGER · sidste 30 dage         │
│                                                  │
│ 24 maj  Topsæt −10%  ✓ accepteret               │
│         Dag: Back squat · RPE landed 8.0 (mål 8)│
│         Næste dags HRV: normal ↑                │
│                                                  │
│ 21 maj  Accessory droppet  ✗ behold original    │
│         Dag: Deadlift · ingen RPE-delta         │
│                                                  │
│ 17 maj  Pause i dag  ✓ Munk godkendte           │
│         (sygdoms-markering)                     │
│                                                  │
│ Vis flere →                                     │
└─────────────────────────────────────────────────┘
```

- 5 most recent shown; "Vis flere" expands to 30 days.
- Each row: date · action label · accept state · optional outcome.
- Outcome data joins `adaptive_outcomes_v0` view from Søjle 1
  (RPE delta, next-day readiness, session_status). One query.
- Empty state: "Du har ikke haft tilpasninger endnu. Motoren
  starter når dit HRV-baseline er klart og du har slået adaptiv
  tilpasning til på denne side."
- Tracked: `adaptive_history_viewed` on section impression.

### T5: Empty-engine state on `/hrv` (consent surface)

The `AdaptiveConsentCard` already exists from Søjle 1 H. We
**don't** modify it here — it's the right shape. But we add a
small "Hvordan motoren tænker" link below the consent CTA that
opens a static `/hrv/learn/adaptive` page with the same T2-shaped
diagram filled in with mock data, so the member can see what
they'd be opting into before flipping the flag.

The `/hrv/learn/adaptive` page is a marketing-grade explainer (not
a real-time view) — pure static content.

---

## 4. Interaction patterns

### Disclosure hierarchy

Three nested layers, all collapsed by default:

```
AdaptationCard (always rendered)
└─ details: "Vis tankegang"             ← T2 reasoning detail
   └─ details: "Hvad hvis…"             ← T3 counterfactuals
```

Why nested `<details>`: zero JS for state management, accessible
keyboard navigation for free, smooth native animation, no
hydration cost. Custom CSS strips browser defaults so the
disclosure markers match our typography (monochrome `↓` / `↑`).

### Counterfactual recompute

- Client component owns sliders' state (`useState`).
- A `useDeferredValue` wraps the mutated EngineInput so rapid
  slider drags don't queue dozens of evaluations.
- `useMemo` over the deferred input → `evaluateAdaptation()` call.
- Result rendered in a sibling subpanel.

Performance budget: the rule layer is <10ms per evaluation per
Søjle 1 measurements. Even on a low-end Android, slider-drag
re-evaluation feels instant.

### Reading the input_snapshot

The persisted `input_snapshot` is the same shape as `EngineInput`
without the `now: Date` (we use the modifier's `created_at` as
`now` when reconstructing). A small adapter
`hydrateEngineInputFromSnapshot(snapshot, createdAt)` in
`src/lib/adaptive/snapshot.ts` rebuilds a complete `EngineInput`.

This means **counterfactuals run against the exact data the engine
saw at decision time** — not against today's freshly-fetched data.
That's the right semantics: the member is asking "given what
happened that day, what would the engine have done differently?"

### Historical trail data flow

`/hrv` page server-fetches `getRecentAdaptations(memberId, days=30)`
returning rows shaped like:

```ts
type AdaptationHistoryItem = {
  modifierId: string;
  modifierType: AdaptiveAction;
  createdAt: string;
  acceptedByMember: boolean | null;
  reviewedBy: string | null;
  sessionTitle: string | null;        // from joined sessions table
  topSetRpeDelta: number | null;      // from adaptive_outcomes_v0
  completionRatio: number | null;     // from adaptive_outcomes_v0
  nextDayReadiness: ReadinessBucket | null;  // from adaptive_outcomes_v0
};
```

One query joining `hrv_session_modifiers` + `sessions` + outcomes
view. Index `idx_hrv_session_modifiers_member` already covers it.

---

## 5. Components

```
src/components/adaptive/
├── AdaptationCard.tsx                 [EXTEND — add T1 disclosure]
├── ReasoningDetailPanel.tsx           [NEW — T2 subpanels]
├── CounterfactualSliders.tsx          [NEW — T3 client component]
├── AdaptationHistory.tsx              [NEW — T4 server component]
└── AdaptationHistoryRow.tsx           [NEW — T4 single row]

src/lib/adaptive/
├── snapshot.ts                        [NEW — hydrate EngineInput from jsonb]
├── reason-narratives.ts               [NEW — reason-codes → DA labels + rule names]
└── (existing files unchanged)

src/lib/data/
└── adaptive.ts                        [EXTEND — getRecentAdaptations()]

src/app/(app)/hrv/page.tsx             [EXTEND — mount AdaptationHistory]
src/app/(app)/hrv/learn/adaptive/      [NEW — static explainer page]
└── page.tsx
```

Estimated total: ~1200 lines new, ~150 lines modified.

### ReasoningDetailPanel signature

```ts
type Props = {
  // From hrv_session_modifiers, hydrated via snapshot.ts
  signals: EngineInput;
  ruleDecision: {
    action: AdaptiveAction;
    reasons: RuleReasonCode[];
    confidence: number;
    params: AdaptiveActionParams;
  };
  // Null when reasoning layer was skipped/unavailable
  reasoningOutput: {
    final_action: AdaptiveAction;
    explanation_da: string;
    confidence: number;
    reasons_used: string[];
  } | null;
};
```

Server component (no interactivity beyond `<details>` toggle).

### CounterfactualSliders signature

```ts
"use client";

type Props = {
  baseline: EngineInput;  // immutable starting point
  baselineDecision: CandidateDecision;  // for visual comparison
};
```

Owns:
- `sleepHoursAvg2d: number | null` (slider state)
- `alcoholLast2d: boolean` (toggle state)
- `feelingLast3d: FeelingState | null` (selector state)

Computes:
- `mutatedInput: EngineInput` (memoised on deferred slider values)
- `hypotheticalDecision: CandidateDecision` (memoised on mutatedInput)

Renders the sliders + a result subpanel that diffs against
`baselineDecision`:

```
Motoren ville have valgt:
  ✓ Ingen ændring (var: Topsæt −10%)
    "Alt ser fint ud — kør sessionen som planlagt."
```

When the hypothetical = the actual, the subpanel says "Samme
beslutning" and dims to fg-faint — keeps the slider playground
honest.

---

## 6. Schema changes

**Only one column added.** Rest of the data exists already.

```sql
-- Migration 0042: telemetry for Open Brain reveals
alter table public.hrv_session_modifiers
  add column if not exists reasoning_revealed_at timestamptz;

comment on column public.hrv_session_modifiers.reasoning_revealed_at is
  'Set the first time the member expanded "Vis tankegang" on this modifier. Drives Søjle 2 telemetry.';
```

Why one column not a full events table:
- Most telemetry questions ("did member reveal reasoning?") are
  binary, scoped to one modifier. A scalar column answers them
  cheaply.
- Counterfactual telemetry could be richer (which dimension was
  changed?), but for v0 we capture it via the existing PostHog
  event firehose (see §8) — no DB cost.
- A separate `adaptive_reasoning_events` table is the right answer
  if we ever want **time-on-panel** or **multi-reveal** metrics.
  Defer until needed.

---

## 7. Counterfactual safety + bounds

The sliders feed into `evaluateAdaptation()` directly. Two
defensive checks:

1. **Bound mutations to realistic values.** Slider for sleep
   clamps to 0–12 hours. Feeling enum is restricted to the 4
   valid states. Alcohol is binary.
2. **Never persist a counterfactual decision.** The component is
   read-only against the engine. The accept/keep CTAs on
   `AdaptationCard` are the only paths that mutate state.

If the engine logic changes in a future commit, counterfactuals
on **old** adaptations will display the **new** engine's would-be
decision. This is a feature, not a bug: members exploring history
get a consistent "this is how the engine thinks right now" view.
We surface this honestly: "Beregnet med dagens engine — kan
afvige fra hvad motoren gjorde dengang."

---

## 8. Telemetry & observability

Five new events emitted via PostHog (same firehose used by Søjle
1's `adaptive_modifier_persisted`). All carry member_id (hashed
for privacy) and modifier_id.

| Event | When | Properties |
|---|---|---|
| `adaptive_reasoning_revealed` | First time member opens "Vis tankegang" | `modifier_id, modifier_type, time_since_decision_sec` |
| `adaptive_counterfactual_used` | First slider change per session per member | `modifier_id, dimension_changed: 'sleep' \| 'alcohol' \| 'feeling'` |
| `adaptive_counterfactual_result` | Each recompute (debounced 1s) | `modifier_id, hypothetical_action, baseline_action, would_have_changed: boolean` |
| `adaptive_history_viewed` | /hrv "tidligere tilpasninger" enters viewport | `recent_count` |
| `adaptive_history_expanded` | "Vis flere" click | `expanded_count` |

The DB column `reasoning_revealed_at` mirrors the first event for
fast queries (no PostHog round-trip needed for the ops view).

**Key dashboard question Søjle 2 must answer:**
> Does revealing the reasoning correlate with higher accept rates?

If yes (expected): we have evidence the open brain builds trust.
If no: the reasoning might be confusing rather than reassuring —
trigger to iterate on copy.

---

## 9. Rollout

Same gating model as Søjle 1: behind `adaptive_program_enabled`.
No additional flag.

Sequence:
1. Migration 0042 (one column, additive).
2. Ship snapshot adapter + reason-narratives helper (pure, tested).
3. Ship ReasoningDetailPanel (server component, no interactivity).
4. Wire T1 inline reveal in AdaptationCard.
5. Ship CounterfactualSliders (client, the wauw moment).
6. Ship AdaptationHistory on /hrv (server component, joins
   adaptive_outcomes_v0).
7. Ship /hrv/learn/adaptive static explainer.
8. Wire telemetry events.
9. Update demo seed script to also write a `reasoning_revealed_at`
   for the historical-trail demo to render with realistic data.

Each step is independent and can ship as its own commit. Same
small-commits cadence as Søjle 1.

---

## 10. Open questions for planning

- **OQ-1**: Should signal rows in T2 be **interactive** — click a
  signal row to see its time-series ("last 7 days of HRV")? Adds
  significant UI scope. Recommend defer to v1 — text-only rows in
  v0.
- **OQ-2**: Counterfactual sliders cover only **lifestyle**
  dimensions in v0. Should we also let members slide the HRV
  reading itself ("what if my readiness had been normal?"). The
  signal feels valuable but the UX is fiddly (HRV is a derived
  bucket from raw lnRmssd vs baseline; sliding the bucket directly
  is most honest). Recommend: include HRV bucket selector in v0 if
  we can fit it without crowding; otherwise lifestyle-only.
- **OQ-3**: When `acceptedByMember=false` (member kept original),
  T2 still shows the engine's reasoning. Should it be styled
  differently (greyed) to signal "this is what we would have done,
  not what happened"? Recommend: dim the subpanels with a
  10% opacity reduction; same affordance as the "Du valgte at
  beholde…" stand-in line.
- **OQ-4**: Historical trail on /hrv shows last 30 days. Is that
  the right window? Mobile-first concern: 30 entries scrolling on
  a small viewport. Recommend: show 5 with "Vis flere" → expand to
  30 in-place. No separate page.
- **OQ-5**: Coach-side counterpart — should `/coach/queue`'s
  adaptive alerts also gain a "Vis tankegang" reveal? Munk has
  more context to interpret reason codes, so the value is high.
  Recommend: yes, but as a v1 follow-up — out of scope for Søjle
  2 v0 which is member-facing only.

---

## 11. Estimated effort (solo + Claude)

Eight implementation phases mirroring Søjle 1's cadence. Each is
one focused commit.

| Phase | Description | Est. |
|---|---|---|
| OB-1 | Migration 0042 + snapshot.ts hydrator + tests | 1 session |
| OB-2 | reason-narratives.ts (codes → DA labels + rule names) + tests | 1 session |
| OB-3 | ReasoningDetailPanel.tsx (T2 server component) | 1 session |
| OB-4 | AdaptationCard inline reveal (T1) + first telemetry event | 1 session |
| OB-5 | CounterfactualSliders.tsx (T3 — the wauw) + tests on the input-mutation pure helpers | 1.5 sessions |
| OB-6 | getRecentAdaptations data wrapper + AdaptationHistory.tsx (T4) | 1.5 sessions |
| OB-7 | /hrv/learn/adaptive static explainer page | 0.5 session |
| OB-8 | Telemetry wiring + reasoning_revealed_at update on first reveal | 0.5 session |

Total: ~8 sessions. Søjle 1 took 8 sessions for ~12 commits;
Søjle 2 should land in a comparable window because most of the
plumbing (DB shape, jsonb decoding, engine purity) is already in
place.

**Critical path**: OB-5 is the spec's reason for existing. If we
hit a UX wall there (e.g., counterfactual recompute feels janky on
mobile, or the diff explanation reads poorly), we ship OB-1
through OB-4 as a smaller v0 — still useful, still wauw-adjacent,
just not the full leap.

---

## 12. Why this is the right "wauw" move next

Søjle 1 made the engine **work**. It saved the member time and
guesswork. But to a CEO of Trainerize or Future browsing the
product, the engine is invisible: they see a card with an
explanation, and that explanation could be written by anyone — a
human coach, a template, GPT.

Søjle 2 makes the engine **defensible**. The chain
`raw signal → rule → Claude → action → counterfactual → outcome`
is hard to fake. It requires:
- A pure, inspectable engine (we have it)
- A persisted decision trail (we have it)
- A UI that exposes both without overwhelming (this spec)

Once a competitor sees the counterfactual sliders working at <16ms
latency on a 4-year-old Android, they know two things:
1. Our engine is genuinely small and pure (not a hidden LLM call)
2. We've designed for transparency from day one, not as a retrofit

That's the wauw. It's not flashy — it's quiet, technically
serious, and impossible to copy without rebuilding from scratch.
