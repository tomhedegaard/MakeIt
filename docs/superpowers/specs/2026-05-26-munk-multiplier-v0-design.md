# Munk Multiplier v0 — 10x coach productivity without quality tax

Status: design spec, not yet implemented.
Author: Claude + Munk, 2026-05-26.
Builds on: Søjle 1 (engine + queue) shipped, Søjle 2 (Open Brain UI) shipped.

---

## 0. References to existing codebase (verified)

| Surface | Path | What we'll extend |
|---|---|---|
| Coach queue (form-checks + HRV alerts + adaptive escalations) | `src/app/coach/queue/page.tsx` | Add the AI-drafted reply UI to form-check rows; the queue stays the action surface |
| HRV alert detection cron | `src/app/api/cron/hrv-alert-detect/route.ts` | Pattern: daily 06 UTC cron we'll mirror for morning report |
| Coach digest cron | `src/app/api/cron/coach-digest/route.ts` | Weekly Monday 06 UTC — sets the precedent for daily 06 morning report |
| Form-check pipeline | `src/lib/data/coach.ts:getPendingFormChecks`, `form_checks` table | ai_score, ai_headline, ai_pos[], ai_neg[], ai_fix already populated by Claude vision; we add ai_drafted_reply column |
| Resend transactional mail | `lib/email/*` (form-check feedback) | Re-use to optionally email Munk the morning report at 06:30 CET |
| Coach role | `members.is_coach`, `is_current_user_coach()` RLS helper | Single head coach today; co-coach work deferred to v1 |
| Adherence digest | `src/lib/data/coach-adherence-digest.ts` | Already aggregates per-member adherence — morning report joins this |
| Outcomes view | `adaptive_outcomes_v0` (from Søjle 1) | Powers cohort pattern detection — RPE drift, accept rates |
| Anthropic SDK pattern | `src/lib/data/program-generator-claude.ts` | Cached system-prompt + structured output via Zod — mirror for ai-drafted reply |

---

## 1. Overview & positioning

Søjle 1 made the engine work. Søjle 2 made it inspectable. Søjle 3
makes **Munk** the bottleneck-killer — because right now he is the
bottleneck.

The math is brutal:
- Munk coaches ~25 active members today
- Each member generates ~3 form-checks/week + 1 weekly check-in
- That's ~100 form-checks + 25 check-ins per week
- At ~5 min/form-check and ~15 min/check-in: **~13 hours/week of repetitive coach work**

To 5x member count (125), he'd need 65 hours/week of repetitive work.
Hiring co-coaches dilutes the brand promise ("Munk himself reviews
your form"). Templates feel canned. Time per member shrinks until
quality erodes and members notice.

The only way out is **leverage**. AI does the rough first pass; Munk
does the high-value editorial finish:

| Today | With Munk Multiplier |
|---|---|
| Munk writes form-check reply from scratch (3-5 min) | Munk edits Claude's draft (30-60s) |
| Munk scans queue + chooses what's urgent | Morning report pre-sorts: "5 members need you today" |
| Munk spots cohort patterns by gut feel | Engine surfaces them: "3 athletes with sustained low HRV this week" |

Net effect: ~13 h/week → ~3 h/week. **5x member capacity without
quality dilution.**

**Why this is wauw-level for the coaching-platform CEO viewing this:**
- Trainerize / Future / TrueCoach: coach inbox is dumb. No AI-drafted
  replies, no morning prioritization, no cohort intelligence.
- Future, the concierge model, employs 100s of human coaches to brute-
  force scale. We make 1 coach do the work of 10.
- The output still reads as Munk because the AI drafts in his voice
  (few-shot from his past replies) and he edits/approves every send.
  Members can't tell — but Munk gets his evenings back.

---

## 2. Goals & non-goals

### Goals (v0)

- **G1**: Munk can review a form-check, edit Claude's drafted reply,
  and send — in under 60 seconds end-to-end.
- **G2**: A daily `/coach/morning` page surfaces what Munk should
  attend to today, ordered by urgency. Empty days say so honestly.
- **G3**: A weekly cohort-pattern report flags cross-member trends
  the engine sees: sustained low HRV across N athletes, RPE drift in
  a specific program-week, escalating adaptive-engine reject rates.
- **G4**: The drafted reply preserves Munk's voice. Members reading
  it can't reliably tell it was AI-drafted, because Munk edited it.
- **G5**: Every AI-drafted artefact carries a `drafted_by_ai` flag
  in the DB so we can audit later: "is Munk editing significantly
  or sending verbatim?"

### Non-goals (deferred to v1)

- **NG1**: Co-coach workspaces. Single head coach in v0. Co-coach
  needs auth surgery (member-coach assignment, RLS per coach) and
  brand-tone calibration that's its own project.
- **NG2**: Auto-send. Drafts NEVER send without Munk pressing the
  button. v1 may introduce "tier-1 auto-send for low-stakes replies"
  but only after we trust the editing data.
- **NG3**: Voice / video replies. Text only in v0. Voice cloning has
  trust issues we don't want to inherit.
- **NG4**: SMS / WhatsApp / Telegram delivery. Email + in-app only.
- **NG5**: Member-facing "AI helped Munk draft this" disclosure. We
  decide internally to keep this implicit — Munk edits every reply,
  so by the time it reaches the member it IS Munk's. Could revisit.
- **NG6**: Multi-language. Danish-only in v0.

---

## 3. Surface catalogue

Three core surfaces. Each ships as its own commit.

### MM-1: Morning Report — `/coach/morning`

Daily at 06:00 CET (05:00 UTC summer, 05:00 UTC winter — we pin
to 05:00 UTC so it lands before Munk wakes up regardless of DST).
A `morning_reports` row is materialised by cron; the page renders
the latest row for Munk.

Layout (top → bottom by urgency):

```
┌──────────────────────────────────────────────────┐
│ I DAG · 26. maj                                  │
│                                                  │
│ ┌─ Hvad kræver dig nu ─────────────────────────┐ │
│ │ 3 medlemmer med rød HRV (sustained low)      │ │
│ │ 2 adaptive-eskalationer fra cron i nat       │ │
│ │ 4 form-checks i kø (gns. 6 timer ventetid)   │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ ┌─ Mønstre på tværs ───────────────────────────┐ │
│ │ • 4 af 27 aktive ramte very_low HRV tirsdag  │ │
│ │   (vejrskift København fra 15° → 6°?)        │ │
│ │ • Member X + Y: RPE-drift >1.5 over 14d,     │ │
│ │   begge på STR-12 uge 8 — program issue?     │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ ┌─ I går ──────────────────────────────────────┐ │
│ │ 18 sessions kørt · 2 sprunget over           │ │
│ │ 7 PRs noteret · 1 form-check uploadet        │ │
│ │ Adaptive engine: 5 modifiers · 4 accepteret  │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

- Server component. Pulls a single `coach_morning_reports` row
  + minimal joins (no per-section round-trips).
- "Empty Tuesday" must feel honest, not dishonest fluff. If no
  urgent items: "Stille morgen. 4 form-checks i kø — ingen røde
  flag. Nyd kaffen."
- Optionally emailed at 06:30 CET to Munk's address (Resend) —
  toggle per coach.

### MM-2: AI-drafted form-check reply

Extends the existing form-check review modal (`/coach/queue` form-
check section). New flow:

1. Coach clicks "Review" on a form-check.
2. Existing modal opens with video + AI score + bullet points
   (ai_pos, ai_neg, ai_fix).
3. **NEW**: Below those, a "Munks udkast" textarea pre-filled with
   Claude's drafted reply in Munk's voice.
4. Coach edits inline (or accepts verbatim).
5. "Send til [medlem]" → existing Resend email goes out, plus
   updates `form_checks.coach_notes` + `drafted_by_ai = true`.

Draft generation:
- New column `form_checks.ai_drafted_reply text`
- New column `form_checks.ai_drafted_reply_at timestamptz`
- New column `form_checks.drafted_by_ai boolean` (defaults false;
  set true when send originates from a draft Munk didn't fully
  rewrite — heuristic: ≥70% character overlap with the draft)
- Cron mirror: every 30 min, scan `form_checks WHERE
  coach_reviewed_at IS NULL AND ai_drafted_reply IS NULL` and call
  Claude with: video keyframes + ai_score blob + structured
  past-Munk-replies few-shot. Persist the draft.
- This way drafts are ready by the time Munk opens the queue —
  zero wait state.

Voice few-shot strategy:
- Maintain a `coach_voice_samples` table: 20-30 of Munk's actual
  past replies, hand-curated to span tone variations (encouraging,
  corrective, terse, playful).
- Each Claude draft call includes 3 random samples in the system
  prompt as `<example>` blocks.
- Refresh the pool monthly: as Munk sends more replies, the
  curation can pick from the larger corpus.

### MM-3: Cohort pattern detection — weekly + on-demand

Two layers:

**Weekly (Sunday 18 UTC):**
- Mirrors the existing `hrv-weekly-insights` cron pattern.
- Computes 3-5 cohort signals for Munk's roster:
  - **HRV cluster events**: ≥3 members with very_low on the same day
  - **Program-week RPE drift**: members on the same (programCode, week)
    with median RPE drift ≥1.5 — flags possible programming bug
  - **Engine reject pattern**: members with ≥2 "behold original"
    responses in a row — engine over-eager for them?
  - **Form-check decline**: members whose ai_score has dropped >15%
    over their last 3 lifts on the same exercise
- Surfaces in the next morning report's "Mønstre på tværs" block.

**On-demand:**
- `/coach/patterns` page — Munk can query at any time. Same
  signal set, with the timeframe configurable (this week / last 7 /
  last 30 days).
- One-screen output, monochrome chips per signal, click → drill
  into the affected members.

---

## 4. Schema changes

Minimal additive migration. ~6 fields + 2 small tables.

```sql
-- Migration 0043: Munk Multiplier v0
begin;

-- 1) AI-drafted form-check replies
alter table public.form_checks
  add column if not exists ai_drafted_reply text,
  add column if not exists ai_drafted_reply_at timestamptz,
  add column if not exists drafted_by_ai boolean not null default false;

comment on column public.form_checks.ai_drafted_reply is
  'Claude-drafted coach reply in Munk''s voice. Populated by the
   draft cron; coach edits in place before sending.';
comment on column public.form_checks.drafted_by_ai is
  'True when the sent coach_notes started from ai_drafted_reply and
   the coach kept ≥70% character overlap. Drives "how much is Munk
   actually editing?" telemetry.';

-- 2) Coach voice few-shot pool
create table if not exists public.coach_voice_samples (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid references public.exercises(id),
  reply_text text not null,
  tone text check (tone in ('encouraging', 'corrective', 'terse', 'playful')),
  curated_by uuid references public.members(id),
  curated_at timestamptz not null default now()
);

alter table public.coach_voice_samples enable row level security;
create policy coach_voice_samples_coach_all on public.coach_voice_samples
  for all using (public.is_current_user_coach());

-- 3) Morning report (one row per coach per day)
create table if not exists public.coach_morning_reports (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.members(id) on delete cascade,
  report_date date not null,
  payload jsonb not null,
  sent_email_at timestamptz,
  created_at timestamptz not null default now(),
  unique (coach_id, report_date)
);

alter table public.coach_morning_reports enable row level security;
create policy coach_morning_reports_owner on public.coach_morning_reports
  for select using (coach_id = auth.uid());
-- Service-role writes; no member-facing policy needed.

commit;
```

Payload shape (jsonb):
```ts
{
  urgent: {
    sustained_low_hrv_members: { member_id, handle, days_low }[];
    open_adaptive_escalations: number;
    pending_form_checks: { count: number; avg_wait_hours: number };
  };
  patterns: {
    code: 'hrv_cluster_day' | 'rpe_drift_program_week' | 'engine_reject_streak' | 'form_check_decline';
    summary_da: string;
    affected_member_ids: string[];
  }[];
  yesterday: {
    sessions_completed: number;
    sessions_skipped: number;
    prs_noted: number;
    form_checks_uploaded: number;
    adaptive_modifiers: number;
    adaptive_accepted: number;
  };
}
```

---

## 5. Components & file layout

```
src/app/api/cron/
├── draft-form-check-replies/route.ts    [NEW — 30-min cron]
├── coach-morning-report/route.ts        [NEW — daily 05:00 UTC]
└── cohort-patterns-weekly/route.ts      [NEW — Sunday 18:00 UTC]

src/app/coach/
├── morning/page.tsx                     [NEW — MM-1 surface]
└── patterns/page.tsx                    [NEW — MM-3 on-demand]

src/lib/coach/
├── draft-reply-claude.ts                [NEW — Anthropic SDK wrapper]
├── voice-samples.ts                     [NEW — sample picker + RLS reads]
├── morning-report.ts                    [NEW — payload builder (pure)]
├── morning-report.test.ts               [NEW — payload shape + ranking]
├── cohort-patterns.ts                   [NEW — pattern detectors (pure)]
└── cohort-patterns.test.ts              [NEW — detector logic]

src/components/coach/
├── FormCheckReviewWithDraft.tsx         [NEW — extends existing modal]
├── MorningReportCard.tsx                [NEW]
└── CohortPatternRow.tsx                 [NEW]

src/lib/data/coach.ts                    [EXTEND — getMorningReport, getPendingDraftReplies]
src/lib/email/morning-report.ts          [NEW — Resend template]
```

Estimated ~1500 lines new code, ~200 modified.

---

## 6. Reasoning layer — drafted reply contract

The reply generator follows the same pattern as `program-generator-
claude.ts` and `adaptive/reasoning-claude.ts`:

- Frozen system prompt (cached, ephemeral) defines Munk's voice
  rules + structured output schema
- User payload: form-check video keyframes + ai_score blob +
  3 voice samples
- Zod schema for the response: `{ reply_da: string, tone:
  enum, confidence: number }`
- Returns null on any failure — caller renders the form-check
  modal without a draft (Munk writes from scratch as today)

System prompt skeleton (Danish, monochrome, ~600 tokens cached):
```
Du skriver et coach-svar i Munks stil. Korte sætninger. Direkte.
Aldrig "lad os" — sig hvad medlem skal gøre. Maks 4 sætninger.
Start med det positive (én sætning). Så det vigtigste cue. Slut
med en konkret handling til næste session.

Eksempler på Munks stemme:
<example tone="corrective">{sample 1}</example>
<example tone="encouraging">{sample 2}</example>
<example tone="terse">{sample 3}</example>

AI-scoren er rådata. Brug den til at vælge cue, ikke til at
prædike. Skriv ALDRIG procentangivelser eller ai-jargon.
```

---

## 7. Privacy, safety, coach-in-the-loop principles

- **Nothing sends without Munk pressing Send.** Drafts are
  pre-staged but the email API call only fires from the form
  submit handler.
- **`drafted_by_ai` is private to Munk.** Members don't see this
  flag. The implicit deal: Munk edits every reply; the output is
  his.
- **Voice samples are coach-curated.** No automatic harvesting
  from member-side data. Munk explicitly adds samples to the pool.
- **Morning report contains no member PII beyond handles.** Same
  privacy boundary as the existing coach queue.
- **Pattern detection runs as service-role.** Per-member rows are
  re-fetched server-side; nothing PII-rich crosses to the client
  beyond what `/coach/members/[id]` already exposes.

---

## 8. Telemetry & observability

Five new events on top of Søjle 2's telemetry shim
(`lib/telemetry.ts`):

| Event | When | Properties |
|---|---|---|
| `coach_morning_report_viewed` | /coach/morning rendered | `report_date, urgent_count, pattern_count` |
| `coach_draft_reply_opened` | Form-check modal opens with a draft present | `form_check_id, draft_exists: boolean` |
| `coach_draft_reply_sent` | Send button fires | `form_check_id, edit_ratio: 0..1, send_seconds_since_open` |
| `coach_pattern_drilled_in` | Cohort pattern row clicked | `pattern_code, affected_count` |
| `coach_morning_report_emailed` | Resend send succeeded | `coach_id, report_date` |

Key dashboard questions Søjle 3 answers:
- **Voice fidelity**: median `edit_ratio` of `coach_draft_reply_sent`.
  If <0.2 (Munk keeps draft mostly verbatim), the voice model is
  good. If >0.6 (Munk rewrites most of it), the draft adds little.
- **Time per form-check**: median `send_seconds_since_open`. Target:
  <60s. Pre-Munk-Multiplier baseline (from current
  `coach_reviewed_at - created_at` deltas): ~3-5 minutes.
- **Morning report stickiness**: % of days `coach_morning_report_viewed`
  fires within 1h of report generation. Below 50%: Munk isn't
  reading it; surface or copy is wrong.

DB-side `drafted_by_ai` mirrors `coach_draft_reply_sent` so audit
queries can join without PostHog round-trips.

---

## 9. Rollout

Per-feature behind no flag (Munk is the only coach today); each
ships independently:

1. Migration 0043 (additive, no destructive changes).
2. Pure logic: morning-report payload builder + cohort pattern
   detectors. Unit-tested in isolation.
3. Draft reply Anthropic wrapper. Tested with mocked output.
4. 30-min draft cron. Idempotent: only drafts where reply is null.
5. Form-check review UI extension with the draft textarea.
6. Morning report cron + email template.
7. /coach/morning page.
8. /coach/patterns on-demand page.
9. Telemetry wiring.
10. Voice samples seeded with ~20 of Munk's past replies.

Each step is one focused commit, same cadence as Søjle 1 + 2.

---

## 10. Open questions for planning

- **OQ-1**: Voice few-shot sample pool — bootstrap manually with
  20 replies or curate by tone-tagging the existing
  `form_checks.coach_notes` corpus? **Recommend:** start with
  manual 20 (~1h work); auto-tagging is a v1 refinement.
- **OQ-2**: Draft cron cadence — every 30 min covers most cases
  (form-check upload → 30 min wait → draft ready), but burns
  Claude credits on members who upload and never get reviewed
  (rare but happens). **Recommend:** 30 min in v0; tune to "draft
  on review-open if missing" if we see waste.
- **OQ-3**: Morning report empty state — "Stille morgen" prose
  vs. "0 urgent" stats grid. Spec mocks the prose version; needs
  Munk gut-check. **Recommend:** prose. Honest > stats.
- **OQ-4**: Co-coach scope — at what member count does single-
  coach Munk become a hard ceiling? **Recommend:** track until
  active members >80 before designing co-coach mode. v0 stays
  single-coach.
- **OQ-5**: Form-check video processing — currently extracts 3
  keyframes client-side. Should we re-process to get 5-7 for the
  drafted reply context? **Recommend:** keep 3 in v0; revisit if
  draft quality complaints suggest the model is missing key
  moments.
- **OQ-6**: Member-facing draft disclosure — do we tell members
  "your coach used AI to draft this reply"? **Recommend:** no
  explicit disclosure. Munk edits every reply; the output is
  his. Could revisit if regulatory pressure or trust signals
  suggest otherwise.

---

## 11. Estimated effort (solo + Claude)

Eight phases mirroring Søjle 1 + 2's cadence:

| Phase | Description | Est. |
|---|---|---|
| MM-1 | Migration 0043 + voice-samples seed data (manual curation of 20 Munk replies) | 1.5 sessions |
| MM-2 | morning-report.ts pure payload builder + tests | 1 session |
| MM-3 | cohort-patterns.ts pure detectors + tests | 1 session |
| MM-4 | draft-reply-claude.ts wrapper + tests with mocked SDK | 1 session |
| MM-5 | 30-min draft cron + idempotency tests | 0.5 session |
| MM-6 | FormCheckReviewWithDraft component + integration into existing modal | 1.5 sessions |
| MM-7 | /coach/morning page + cron + email template | 1.5 sessions |
| MM-8 | /coach/patterns on-demand page + telemetry events | 1 session |

Total: ~9 sessions. Comparable to Søjle 2's 8-session budget.

**Critical path**: MM-4 (voice quality) and MM-6 (in-flow UX).
If the drafted replies feel off-brand, Munk won't trust the
flow and the time savings evaporate. We mitigate by:
- Voice samples seeded with Munk's actual past replies (not
  invented prose)
- A/B Munk can compare drafts side-by-side with his own
  off-the-cuff version in the early weeks
- The "edit_ratio" telemetry catches drift fast

---

## 12. Why this is the right "wauw" move after Søjle 1+2

Søjle 1 makes the engine work for the **member**.
Søjle 2 makes it inspectable for the **member**.
Søjle 3 makes Munk **5x as productive** without sacrificing the
"Munk personally reviews your form" promise.

A coaching-platform CEO seeing the product after Søjle 1+2 sees
a beautifully inspectable AI engine — impressive, but they could
imagine catching up in 18 months. After Søjle 3 they see
something else: **Munk talking to 200 members the way most coaches
talk to 20**, with telemetry showing he barely edits the drafts.
That's not catchable in 18 months. It's the operational moat
that turns the inspectable engine into a sustainable business.

The three pillars then form a wedge:
- Søjle 1: member sees value (better sessions)
- Søjle 2: member sees the **why** (trust)
- Søjle 3: Munk's roster grows without hiring (margins)

Søjle 4 (Crew Coaching Pyramid) closes the loop: members become
peer mentors, freeing Munk for the high-stakes 1:1s only he can do.
