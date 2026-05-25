# Crew Coaching Pyramid v0 — AI buddy pairing, co-coach sandbox, coaching skill tree

**Date:** 2026-05-25 · **Spec revision:** 1
**Status:** Draft (design)
**Phase:** Søjle 4 af 4 i 6-mdr wauw-planen — turns Reps tiers from cosmetic to functional coaching ladder
**Module path:** new `src/lib/pairing/*`, new `src/lib/coaching/*`, extends existing Reps + tier-events + push + i18n infrastructure

> Strategic context: [`~/.claude/plans/hvis-vi-skal-have-dreamy-spring.md`](../../../.claude/plans/hvis-vi-skal-have-dreamy-spring.md) — fjerde søjle. Skala-moat + uddannelses-moat. Princippet: crewet lærer at coache hinanden under Munks supervision, og kvaliteten af din coaching bestemmer din progression.

---

## 0. References to existing codebase (verified)

| Artifact | Path | Status |
|---|---|---|
| Tier definitions | `src/lib/auth.ts:21` — `'Lifter' | 'Athlete' | 'Beast' | 'Legend'` | Shipped — pyramid maps unlocks to these |
| Tier promotion engine | `supabase/migrations/0009_tier_events.sql` — `bump_tier_after_reps_change()` trigger + `tier_for_balance(balance)` function | Shipped — coaching events emit Reps; tier promotes automatically |
| Reps ledger | `supabase/migrations/0001_init.sql:154` — `reps_transactions(member_id, delta, reason, reference_type, reference_id)` | Shipped — new `reference_type` values: `buddy_engagement`, `coaching_review`, `lesson_completed` |
| Tier-event surfacing | `src/lib/data/tier-events.ts:28-36` — `getLatestUnseenPromotion(memberId)` | Shipped — co-coach unlock surfaces via this |
| Coach role check | `src/lib/auth.ts:63` (`Member.isCoach`) + RLS `is_current_user_coach()` + `members.is_coach` column | Shipped — **extends with `coach_tier` column** (§4) |
| Form-check review queue | `src/app/coach/queue/*` + `src/lib/data/coach.ts:51-66` + `src/app/coach/queue/actions.ts:18-92` (`reviewFormCheckAction`) | Shipped — **template for co-coach review UI + idempotent persist pattern** |
| Coach review email | `reviewFormCheckAction` → `sendCoachReviewEmail()` via Resend (gated by `notif_form_check_review` pref) | Shipped — co-coach reviews use same path with different copy |
| Messaging infra | `src/lib/data/messages.ts:31-43` — `conversations(member_id, coach_id, last_message_at)` + `messages(conversation_id, sender_id, kind, body, media_path)` | Shipped — **buddy DMs reuse `conversations` with `coach_id` repurposed as `partner_id`** (or new `buddy_threads` table — see §6 decision) |
| Web push | `src/lib/push.ts` — `sendPushToMember(memberId, {title, body, url, tag})` with auto-cleanup of dead endpoints | Shipped — buddy reactions + co-coach assignments use this |
| HRV alert queue | `hrv_alerts(member_id, conditions_met, status)` — Munk's existing review queue | Shipped — **co-coach `escalate_to_coach` actions land here**, just authored by co-coach instead of engine |
| i18n setup | `src/i18n/config.ts` (locales: `["da", "en"]`, default da) + `messages/{locale}/*.json` | Shipped — new files: `Buddy.json`, `CoachSchool.json`, `Pyramid.json` |
| Cron infra | `vercel.json` existing daily slots | Shipped — adds `/api/cron/buddy-rematch-weekly` Sundays + `/api/cron/coach-quality-snapshot-weekly` Sundays |

**Critical reuse insight:** Reps tier promotion is fully automatic via DB trigger. Coaching → Reps → tier upgrade flows without new orchestration code. Push + Resend + i18n are mature. The new surface is: pairing engine, sandbox UI, skill-tree content, and one new role column.

---

## 1. Overview & positioning

Today, Reps tiers (Lifter → Athlete → Beast → Legend) are cosmetic: they show on the dashboard, unlock cosmetic rewards in the shop, and gate nothing functional. v0 makes them the **coaching education ladder**:

- **Lifter** — receives coaching. Gets buddy on tier-up.
- **Athlete** — has a buddy. Can send accountability nudges + reactions. Unlocks 3 micro-lessons on "supporting your buddy".
- **Beast** — eligible to apply as co-coach. Runs sandbox mode (shadow-reviews real adaptations against Munk's decisions). Hits 80% agreement over 50 cases → goes live with 2-3 assigned members. Unlocks 4 advanced lessons.
- **Legend** — pod leader. Reviews co-coaches' reviews. Closest to Munk. Long-term revenue share path (v2, not v0).

Four functional pieces, all in v0:

1. **AI Buddy Pairing** — automated matching engine. Re-pairs weekly. Buddies see each other's daily readiness, can send 🔥, comment on PRs, send accountability nudges.
2. **Coaching Skill Tree** — micro-lessons (video + quiz + practice). Unlocked per tier. Munk records video; Claude evaluates practice scenarios.
3. **Co-coach Sandbox → Live pipeline** — Beasts review the same adaptations that hit Munk's queue, in shadow mode. Decisions compared to Munk's. Quality threshold unlocks live assignments.
4. **Coach Quality Scorecard** — per-co-coach metrics: Munk-agreement %, member satisfaction (1-5 thumbs after each intervention), response time, intervention frequency. Drives sandbox→live promotion + demotion.

**Brand positioning.** Co-coaches are **Munk's lieutenants**, not independent operators. They never set load or rewrite programs (Adaptive Engine owns that). They provide cues, motivation, accountability, and the first-pass eye on adaptation decisions. The Munk brand stays the apex. The pyramid scales the *attention*, not the authority.

**Why this is moat.** Three competitive properties stack:
- **Network effect** — more members ⇒ more buddies ⇒ richer pairing pool ⇒ better matches.
- **Supply-side scaling** — Beasts/Legends absorb coaching workload, freeing Munk to scale.
- **Training data flywheel** — every co-coach decision compared to Munk becomes few-shot data for the Adaptive Engine's reasoning prompt.

No competitor in strength coaching has all three. Trainerize has tools, not crew. WHOOP has data, not coaching. Facebook groups have crew, not structure.

---

## 2. Goals & non-goals

### Goals (v0)

- Every Athlete-tier member has exactly one buddy at any time.
- Buddies see each other's daily readiness, can send reactions + nudges + DMs through a dedicated buddy thread.
- Beasts can apply for co-coach. Approved Beasts get sandbox access to shadow-review live adaptations from `hrv_alerts` queue.
- Beasts reaching 80% Munk-agreement on 50+ shadow cases auto-qualify for live assignment review (2-3 members each).
- Every co-coach intervention is scorecarded by the member (one-tap 👍/👎/💬).
- Munk has a `/coach/co-coaches` overview: pod status, quality scores, recent escalations, certification actions.
- 5 micro-lessons live by M5: 3 for Athlete tier, 2 for Beast tier. Each = 60-180s Munk video + 3 quiz questions + 1 practice scenario evaluated by Claude.
- Coaching events emit Reps via existing ledger → tier promotion happens automatically through DB trigger.

### Non-goals (v0)

- **Beast self-promotion** — going live requires Munk's explicit approval, not just agreement-score threshold. v0 surfaces the readiness; Munk one-taps approval.
- **Legend pod-leader features** — Legend tier exists; v0 doesn't ship pod-review UI (deferred to v1). v0 Legends function as senior Beasts.
- **Revenue share** — Reps + status only. Cash share for Legends is post-M6.
- **Custom lessons** — Munk records all lesson videos in v0; no member-authored content. (Members write practice scenarios via the quiz, but those aren't published.)
- **Cross-tier buddy pairs** — only same-tier pairs in v0 (cross-tier is intentional in the wauw-plan thesis, but adds matching complexity; v0 demonstrates same-tier value, v1 opens cross-tier).
- **Group buddy chats** — pairs only. Pod-level chats are Legend feature, v1.
- **External co-coach recruitment** — co-coaches must be Beast-tier members. No external coach onboarding in v0.
- **Co-coach load/programming authority** — co-coaches cannot edit programs or session loads. Only cues, comments, escalations.
- **AI-generated lesson content** — Munk records all videos. Claude only evaluates practice scenarios.

### Out of scope (other Søjle work)

- Søjle 1 (Adaptive Engine) — produces the queue co-coaches review. This spec consumes that output.
- Søjle 2 (Open Brain UI) — buddy and co-coach surfaces live inside the dashboard rebuild.
- Søjle 3 (Munk Multiplier) — Munk's mobile coach PWA is shared infrastructure; co-coach UI is a tier-aware variant of the same screens.

---

## 3. Tier-mapping table (functional unlocks)

| Tier | Buddy | Co-coach role | Lessons unlocked | Reps-earning paths |
|---|---|---|---|---|
| **Lifter** | Not paired | None | None | Existing (sync streaks, PRs, sessions) |
| **Athlete** | One buddy, AI-matched, re-paired weekly | None | "Sådan giver du et form-cue", "Hvornår sender du et nudge", "At rumme en dårlig dag" (3) | +5 Reps per weekly buddy interaction streak; +20 per completed lesson |
| **Beast** | Buddy + can apply for co-coach | Sandbox by application; live for 2-3 members after Munk approval | All Athlete lessons + "Squat depth: 4 ting jeg leder efter", "Hvornår siger jeg tag-en-dag-fri", "Eskalation: hvornår er noget over min pay grade" (3 more, total 6) | +10 Reps per shadow case ≥80% agreement; +25 per live intervention with member 👍; +50 per Munk-stikprøve thumbs up |
| **Legend** | Buddy + can apply for co-coach (priority) | Live by default after Munk approval; up to 5 members | All Beast lessons + "Pod-ledelse" (1 more, total 7) | All Beast paths + 2× multiplier on coaching Reps |

Tier promotion remains balance-based (existing trigger). Crossing into Athlete fires the buddy-pair onboarding. Crossing into Beast fires the co-coach application invite.

---

## 4. Schema changes

One migration: `supabase/migrations/0042_crew_coaching_pyramid_v0.sql`.

```sql
-- 1) Coach tier column (extends existing role system)
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS coach_tier text
    CHECK (coach_tier IS NULL OR coach_tier IN ('munk', 'legend_live', 'beast_live', 'beast_sandbox'));
-- Note: is_coach stays. coach_tier null = not a coach (most members).
-- 'munk' for Mikael; 'legend_live'/'beast_live' for active co-coaches; 'beast_sandbox' for in-training.

-- 2) Buddy pairs
CREATE TABLE buddy_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_a uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_b uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  paired_at timestamptz NOT NULL DEFAULT now(),
  unpaired_at timestamptz,
  pairing_reason jsonb,  -- {algo_version, scores, top_factors[]}
  CONSTRAINT buddy_pairs_distinct CHECK (member_a < member_b),
  CONSTRAINT buddy_pairs_unique_active UNIQUE (member_a, unpaired_at),
  CONSTRAINT buddy_pairs_unique_active_b UNIQUE (member_b, unpaired_at)
);
-- (member_a < member_b ensures one row per unordered pair)

CREATE TABLE buddy_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES buddy_pairs(id) ON DELETE CASCADE,
  from_member uuid NOT NULL REFERENCES members(id),
  to_member uuid NOT NULL REFERENCES members(id),
  kind text NOT NULL CHECK (kind IN ('reaction_fire', 'reaction_strong', 'reaction_eyes',
                                      'nudge_session', 'nudge_sleep', 'comment')),
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON buddy_interactions (pair_id, created_at DESC);

-- 3) Co-coach assignments (live members each co-coach reviews)
CREATE TABLE co_coach_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  assigned_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  assigned_by uuid REFERENCES members(id),  -- Munk's id
  UNIQUE (coach_member_id, assigned_member_id, ended_at)
);

-- 4) Coach reviews (sandbox + live)
CREATE TABLE coach_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('sandbox', 'live')),
  source_type text NOT NULL CHECK (source_type IN ('hrv_alert', 'form_check', 'adaptation')),
  source_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approve', 'modify', 'escalate', 'reject')),
  decision_payload jsonb,  -- co-coach's proposed cue/comment/action
  reasoning text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  -- For sandbox: what Munk actually did
  munk_decision text,
  munk_decision_payload jsonb,
  agreement_score numeric(3,2)  -- 0..1, computed by comparison function
);
CREATE INDEX ON coach_reviews (reviewer_id, mode, submitted_at DESC);

-- 5) Lessons + progress
CREATE TABLE coaching_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  required_tier text NOT NULL CHECK (required_tier IN ('athlete', 'beast', 'legend')),
  title_da text NOT NULL,
  video_url text NOT NULL,
  duration_sec int,
  quiz jsonb NOT NULL,  -- array of {question, choices[], correct_index, explanation}
  practice_scenario jsonb,  -- {prompt, context, rubric_for_claude}
  reps_award int NOT NULL DEFAULT 20,
  published_at timestamptz
);

CREATE TABLE lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES coaching_lessons(id),
  quiz_score numeric(3,2),
  practice_eval jsonb,  -- Claude's evaluation
  completed_at timestamptz,
  UNIQUE (member_id, lesson_id)
);

-- 6) Coach quality scorecards (snapshot-based, weekly cron)
CREATE TABLE coach_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  agreement_with_munk numeric(3,2),  -- last 50 sandbox+spot-checked live cases
  member_satisfaction numeric(3,2),  -- avg of 1-5 thumbs from members
  response_time_p50_minutes int,
  intervention_count_week int,
  status text NOT NULL CHECK (status IN ('healthy', 'watch', 'demoted')),
  notes text  -- optional Munk note
);
CREATE INDEX ON coach_quality_scores (coach_member_id, snapshot_at DESC);

-- 7) RLS for all new tables
ALTER TABLE buddy_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_coach_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_quality_scores ENABLE ROW LEVEL SECURITY;

-- Policies (abbreviated; full policies in migration):
--   buddy_pairs:           members see their own pair (member_a = auth.uid() OR member_b = auth.uid())
--   buddy_interactions:    same as above, via pair_id join
--   co_coach_assignments:  assigned_member sees their coach; coach sees assigned members; Munk sees all
--   coach_reviews:         reviewer sees own; Munk sees all
--   coaching_lessons:      public read where published_at IS NOT NULL
--   lesson_progress:       owner reads own
--   coach_quality_scores:  coach reads own; Munk reads all
```

---

## 5. AI Buddy Pairing

**Function:** `src/lib/pairing/match.ts` — `assignBuddiesForTier(tier: 'athlete' | 'beast' | 'legend')`.

**Algorithm (v0):**
1. Pool = all members with `tier = tier` AND no active pair.
2. Compute feature vector per member:
   - Training phase (week mod 4, deload Y/N)
   - HRV pattern hash (rolling 14-day shape — flat / improving / oscillating)
   - Timezone (members.timezone or fallback Copenhagen)
   - Language preference
   - Goal focus (strength / hypertrophy / hybrid)
   - Last-30-day session frequency
   - Reps trajectory (gaining momentum / stable / declining — proxy for engagement)
3. Greedy match optimising for **complementarity**, not similarity:
   - Same timezone (±2h) and language → hard constraint
   - Engagement balance: pair one "gaining momentum" with one "stable" (boosts mutual accountability) > pair two of same direction
   - Goal focus: tolerate mismatch (cross-goal pairs report higher accountability in the buddy-coaching literature)
   - Training phase: prefer offset (your buddy's heavy week is your deload — different days to encourage each other)
4. Pairs with `pairing_reason` jsonb capturing the top 3 factors. Used for the "Why this buddy?" UX.

**Re-pairing cron:** `/api/cron/buddy-rematch-weekly` Sundays 20:00 CET. Triggers re-pair for any pair where:
- Either member sent 0 interactions in the last 14 days, OR
- Either member's `member_satisfaction` (asked monthly via 1-tap "Is this buddy working out?") rated ≤2/5

When re-pairing, the previous pair is ended (`unpaired_at = now()`), feature vectors recomputed, and the global matching re-run.

**Cold-start:** first 4 Athletes get paired on Munk's manual judgment via `/coach/buddies/seed` (single-use). After that, automated.

---

## 6. Buddy interaction surface

Decision: **reuse `conversations` + `messages`** instead of a new `buddy_threads` table. Rationale: messages already supports text/image/audio/video kinds, signed-URL media, read receipts. Add column `conversations.thread_type` ∈ {`coach`, `buddy`}, repurpose `coach_id` as `partner_id` semantically (column rename is too disruptive for v0; we add a view).

```sql
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS thread_type text NOT NULL DEFAULT 'coach'
    CHECK (thread_type IN ('coach', 'buddy'));

CREATE OR REPLACE VIEW buddy_threads AS
  SELECT id, member_id, coach_id AS partner_id, last_message_at, unread_count
  FROM conversations WHERE thread_type = 'buddy';
```

**Buddy reactions** = `buddy_interactions` table (not `messages`) — reactions are first-class engagement signals for pairing health, distinct from chat. They show in the buddy thread UI but live in their own table for easy querying.

**Routes:**
- `/buddy` — buddy overview: name, tier, today's readiness emoji, 3 most recent interactions, "Send 🔥" tap, "Open chat" link
- `/buddy/chat` — reuses message UI, scoped to buddy thread
- `/buddy/why` — explains the pairing ("Du og Mads matchede fordi I begge er midt i en hypertrofi-blok, men har modsat træningsmønster — det skaber gode accountability-vinduer.")

---

## 7. Co-coach sandbox & live pipeline

**Sandbox flow:**
1. Beast applies via `/coach-school/apply` (1-click after completing required lessons + 4 weeks at Beast tier minimum).
2. On Munk approval (`/coach/co-coaches/applications`), `coach_tier = 'beast_sandbox'`.
3. Sandbox UI (`/coach-school/sandbox`) shows the same `hrv_alerts` Munk sees, BUT:
   - Sandbox sees alerts after Munk has decided them (read-only on Munk's queue side)
   - Beast submits their would-have decision via `coach_reviews` with `mode = 'sandbox'`
   - On submit, Munk's actual decision reveals; agreement score computed and saved
4. Aggregate over rolling 50 sandbox cases. Threshold = 80% agreement.
5. When threshold met, system flags Beast as "live-ready" on Munk's `/coach/co-coaches` view. Munk one-taps "Promote to live".
6. `coach_tier → 'beast_live'`. Auto-assigns 2-3 members via `co_coach_assignments` (members chosen by complementarity to Beast's training history).

**Live flow:**
1. Live co-coach sees alerts from their assigned members first (queue priority).
2. Decisions execute immediately (e.g., approve adaptation, send cue to member).
3. Member receives 1-tap "Was this helpful?" 👍/👎 (saved as `member_satisfaction` signal).
4. Munk gets a daily-digest summary of co-coach decisions on Monday (`coach_quality_snapshot_weekly` cron Sunday 18:00 CET feeds Monday's digest).
5. Munk can spot-check any decision via `/coach/co-coaches/{id}/recent` — agreement-flag any decision retroactively (becomes additional `agreement_score` data point).

**Quality scorecard cron** (`/api/cron/coach-quality-snapshot-weekly`, Sundays 18:00 CET):
- For each `coach_tier IN ('beast_sandbox', 'beast_live', 'legend_live')`:
  - Insert `coach_quality_scores` snapshot row
  - If `mode = 'live'` AND `agreement_with_munk < 0.65` over last 50 cases → status = 'demoted', auto-revert `coach_tier` to previous sandbox-pending state, send email to coach AND Munk
  - If `member_satisfaction < 3.0` over ≥10 ratings → status = 'watch', send email to coach (no action)
  - Else status = 'healthy'

---

## 8. Coaching skill tree

**Lesson surface:** `/coach-school` — tree view, locked/unlocked by tier. Each unlocked lesson:
- 60-180s video (Munk-recorded, served from existing media bucket)
- 3 multiple-choice quiz questions (instant feedback)
- 1 practice scenario: short text prompt + member free-text response → Claude evaluates per rubric → returns score + 2-3 sentence feedback in Danish

**Claude evaluation prompt** uses the same cached pattern as `program-generator-claude.ts`. System prompt = the lesson's rubric. User message = the member's free-text response. Structured output:

```ts
const PracticeEvaluation = z.object({
  score: z.enum(['needs_work', 'on_track', 'strong']),
  feedback_da: z.string().max(280),
  specific_strength: z.string().optional(),
  specific_improvement: z.string().optional(),
});
```

**Reps reward:** +20 Reps per first-time lesson completion. Score doesn't gate Reps in v0 (we reward attempt). Lesson can be retaken; only first attempt awards Reps.

**v0 lesson content (Munk records during M5):**
1. Athlete: "Sådan giver du et form-cue der lander"
2. Athlete: "Hvornår sender du et nudge — og hvornår er det støj"
3. Athlete: "At rumme en dårlig dag uden at fikse den"
4. Beast: "Squat depth: 4 ting jeg leder efter"
5. Beast: "Hvornår siger jeg 'tag en dag fri'?"

Lessons 6-7 (Beast: escalation; Legend: pod-ledelse) ship in v1.

---

## 9. Safety rails

**Peer-coaching has injury implications. Treated seriously.**

- **No load/programming authority** — co-coaches cannot mutate `session_sets`, `programs`, or `session_exercises`. UI doesn't surface edit affordances. DB RLS additionally denies.
- **Claude moderation on first-30-days messages** — for `coach_tier = 'beast_sandbox'` OR within 30 days of `beast_live` promotion, all outgoing co-coach messages route through a Claude moderation check (cached system prompt = the brand voice + safety rules). Hits one of {medical_claim, injury_advice, demotivating_tone, off_topic_promotion} → message held, co-coach sees "Munk skal lige se den her først".
- **"Eskalér til Munk" always visible** — both for the member receiving co-coaching and for the co-coach. Two-tap path. Escalation creates `hrv_alerts` row with `conditions_met.escalation_from` set.
- **Injury keyword auto-eskalation** — outgoing co-coach messages mentioning "smerte", "ondt i", "kan ikke bøje", "skadet" auto-escalate to Munk for review before delivery.
- **One-strike demotion for safety violations** — if Munk retroactively marks a co-coach decision as unsafe (new "Mark as unsafe" action on `/coach/co-coaches/{id}/recent`), `coach_tier` reverts to sandbox + required remedial lesson before re-application.

---

## 10. Reps integration

New Reps `reference_type` values, all using existing `reps_transactions` ledger:

| reference_type | delta | trigger | idempotency key |
|---|---|---|---|
| `buddy_interaction_streak` | +5 | Weekly cron; member sent ≥3 interactions in a calendar week | `(member_id, 'buddy_interaction_streak', week_iso)` |
| `lesson_completed` | +20 | First-time lesson completion | `(member_id, 'lesson_completed', lesson_id)` |
| `coach_review_sandbox` | +10 | Sandbox case with agreement_score ≥0.8 | `(member_id, 'coach_review_sandbox', coach_review_id)` |
| `coach_review_live` | +25 | Live intervention with member thumbs-up | `(member_id, 'coach_review_live', coach_review_id)` |
| `coach_review_munk_thumbs_up` | +50 | Munk spot-checks a live review and approves | `(member_id, 'coach_review_munk_thumbs_up', coach_review_id)` |
| `co_coach_promotion` | +200 | One-time: sandbox → live promotion | `(member_id, 'co_coach_promotion', null)` |
| `legend_multiplier_bonus` | 2× | Applied at trigger time for Legend-tier coaches on the above | composite |

All idempotent via existing ledger pattern (`where not exists` on `(member_id, reference_type, reference_id)`).

The DB trigger handles tier upgrades automatically. No new orchestration code.

---

## 11. Telemetry & observability

New events (extend Søjle 0 telemetry):
- `buddy.paired` `{ pair_id, algo_version, factors[] }`
- `buddy.unpaired` `{ pair_id, reason }` — `inactive`, `dissatisfaction`, `tier_change`
- `buddy.interaction` `{ pair_id, kind }`
- `coach.sandbox.submitted` `{ reviewer_id, source_type, agreement_score, ms_to_decide }`
- `coach.live.submitted` `{ reviewer_id, source_type, member_id }`
- `coach.live.thumbs` `{ reviewer_id, review_id, value }`
- `lesson.started` / `lesson.completed` `{ member_id, lesson_id, score }`
- `coach_quality.snapshot` `{ coach_id, agreement, satisfaction, status }`
- `safety.moderation_held` `{ reviewer_id, reason }`
- `safety.escalation_triggered` `{ from, to_munk_alert_id, trigger }`

**Munk's `/coach/co-coaches` ops view:**
- Pod overview: each active co-coach with current quality status + small spark
- Pending applications (Beasts that hit threshold)
- Recent escalations from co-coaches
- Recent demotions (last 30 days)
- "Mark as unsafe" log

---

## 12. Rollout

Four-step ramp, gated on metrics:

1. **M4 — Buddy pairing only.** Pair all Athletes via cron. No co-coach UI yet. Goal: validate matching quality (target: >60% of pairs send ≥1 interaction/week).
2. **M5 weeks 1-2 — Co-coach sandbox.** Open application to 3 hand-picked Beasts. They run sandbox-only for 4 weeks. Lesson tree v1 launches alongside.
3. **M5 weeks 3-4 — First Beasts go live.** Munk approves 1-2 Beasts based on agreement score + intuition. Each gets 2 assigned members. Watch carefully.
4. **M6 — Open the gates (carefully).** Up to 3 live co-coaches. Public case study features one buddy pair + one co-coach.

**Kill criteria:**
- Any safety incident attributed to a co-coach intervention → sandbox-mode-only for everyone until root cause done.
- Member-reported "creepy buddy" or harassment → de-pair, ban interaction, write code-of-conduct, gate buddy launch on it.
- Co-coach quality scores degrading over time (week-over-week trend) → narrow lesson tree, retrain reasoning prompt.

---

## 13. Open questions for planning

1. **What is the consent model for being paired with a buddy?** Should Athletes opt in, or is it on by default at tier promotion? v0 leans opt-in via Athlete-tier consent flow ("Vil du have en buddy?") — same pattern as Adaptive Engine opt-in.
2. **Privacy on shared readiness** — buddies see each other's readiness *bucket* only (very_low / low / normal / high / very_high), never raw lnRMSSD or RHR. Agreed?
3. **Cross-tier interaction** — even though v0 only pairs same-tier, can a Lifter receive co-coaching from a Beast they're not paired with (open marketplace)? v0: no — co-coach assignments are Munk-controlled, not market-discovered.
4. **What does Munk do at scale ≥1000 members?** Co-coaches absorb ~70% of routine, but Munk still needs to spot-check. Spec assumes manual; v1 may need sampling tools.
5. **Legend → revenue share design.** Out of scope for v0 but blocking long-term retention of Legends. Needs decision in Q4 2026.

---

## 14. Estimated effort (solo + Claude)

| Stage | Days |
|---|---|
| Migration + RLS | 1 |
| Buddy matching engine + cron | 2 |
| Buddy UI (`/buddy`, chat reuse, "why this buddy") | 2 |
| Sandbox + agreement scoring | 2.5 |
| Live assignment pipeline + UI | 1.5 |
| Lesson tree UI + Claude practice eval | 2 |
| Munk's `/coach/co-coaches` ops view | 1.5 |
| Quality-score cron + demotion logic | 1 |
| Safety: Claude moderation + injury-keyword auto-eskalation | 1.5 |
| Reps integration (idempotent triggers) | 0.5 |
| Lesson content recording (Munk's time, ~5 hours but blocking) | n/a |
| **Total** | **~15.5 working days** |

Fits M4 (buddy v1) + M5 (sandbox + lessons) + M6 (first live co-coaches) in the 6-mdr plan.
