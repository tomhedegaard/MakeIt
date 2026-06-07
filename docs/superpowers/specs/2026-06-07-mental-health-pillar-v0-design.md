# Mental Health Pillar v0 — Mind-check, AI mental coach, crew-shared mental graph

**Date:** 2026-06-07 · **Spec revision:** 1
**Status:** Draft (design) → autonomous execution authorized
**Phase:** Søjle 5 — extends 6-mdr wauw-planen with a fifth pillar: mental sundhed som performance + wellness + crew-praksis
**Module path:** new `src/lib/mind/*`, new `src/app/(app)/mind/*`, extends Adaptive Engine + Reps + buddy/coach pyramid + push + i18n

> Strategic context: Ægte sundhed = fysisk + psykisk. Søjle 1-4 byggede den fysiske maskine (Adaptive Engine, Open Brain, Munk Multiplier, Crew Coaching Pyramid). Søjle 5 bygger den mentale maskine — uden klinisk skraldespand, men med reel performance- og wellness-værdi. Differentiatoren: vi har allerede HRV + Adaptive + Crew. Ingen wellness-app har det. Ingen styrkeapp har mental data.

---

## 0. References to existing codebase (verified)

| Artifact | Path | Status / how MH-pillar uses it |
|---|---|---|
| Tier definitions | `src/lib/auth.ts:21` — `'Lifter' | 'Athlete' | 'Beast' | 'Legend'` | Shipped — drives privacy-progression. Lifter = privat. Athlete = buddy-share unlock. Beast = cirkler unlock. Legend = cirkel-leader. |
| Reps ledger | `supabase/migrations/0001_init.sql` — `reps_transactions(member_id, delta, reason, reference_type, reference_id)` | Shipped — new `reference_type` values: `mind_check_streak`, `mental_session_completed`, `journal_entry`, `mental_buddy_interaction`, `cirkel_participation` |
| Tier auto-promotion | `supabase/migrations/0009_tier_events.sql` — `bump_tier_after_reps_change()` trigger | Shipped — mental Reps emit through this; tier promotes automatically |
| Adaptive Engine snapshot | `src/lib/adaptive/snapshot.ts:56` — `readiness_bucket: ReadinessBucket | null` | Shipped — MH-6 extends snapshot with `mental_signal: { energy, stress, focus, freshness_days }`; reasoning prompt receives it (MH-6) |
| Adaptive reasoning prompt | `src/lib/adaptive/reasoning.ts:135` — reason narratives include `sustained_low_readiness`, `rpe_drift_rising` etc. | Shipped — adds `mental_state_low_energy_or_high_stress` reason narrative (MH-6) |
| HRV data + insights | `src/lib/hrv/insights.ts`, `src/lib/data/hrv.ts` | Shipped — MH-7 AI mental coach reads HRV trend; MH-6 fuses mental-signal with HRV in snapshot |
| Buddy infrastructure | `src/lib/data/buddy.ts`, `src/lib/data/buddy-pairing.ts` | Shipped — MH-8 layers mental-share on existing buddy pairing; no new pairing logic |
| Push | `src/lib/push.ts` — `sendPushToMember(memberId, {title, body, url, tag})` | Shipped — mind-check nudges, buddy-share alerts, AI-coach daily prompt notifications |
| Cron infra | `vercel.json` — daily/weekly slots active | Shipped — adds `/api/cron/mind-check-nudge` (evening), `/api/cron/mental-coach-daily` (morning), `/api/cron/mental-weekly-insights` (Sunday) |
| Coach review queue / escalation pattern | `hrv_alerts` queue + `src/app/coach/queue/*` | Shipped — MH-9 mental-safety escalations land in same queue with `kind = 'mental'` (consent-gated) |
| i18n | `src/i18n/config.ts` (da, en) + `messages/{locale}/*.json` | Shipped — new files: `Mind.json`, `MindCheck.json`, `MentalSessions.json`, `MentalSafety.json` |
| Demo-mode fallback | `src/lib/auth.ts` mock auth via `mi_session` cookie when no Supabase env | Shipped — every MH-feature ships with mock data so it works in demo before user runs migration 0046 |
| Claude wrapper pattern | `src/lib/hrv/insights-claude.ts`, `src/lib/adaptive/reasoning-claude.ts`, `src/lib/data/form-check-claude.ts` | Shipped — same wrapper pattern reused: `src/lib/mind/coach-claude.ts`, `src/lib/mind/session-generator-claude.ts`, `src/lib/mind/moderation-claude.ts` |
| `@anthropic-ai/sdk` | `package.json` 0.95.0 | Shipped — no new deps for AI features |

**Critical reuse insight:** Reps + tier auto-promotion + push + i18n + Claude wrappers + demo-mode are all mature. The new surface is: (1) one migration 0046 for `mind_check_logs` + `journal_entries` + `mental_sessions` + `mental_session_completions` + `mental_settings`; (2) `src/lib/mind/*` lib; (3) `/mind/*` routes; (4) Adaptive-snapshot extension; (5) three cron jobs.

---

## 1. Overview & positioning

Today, MakeIt has zero mental signal. Members can log a brutal HRV reading, train through it, and the app never asks how they actually feel. Søjle 5 closes that gap.

The pillar makes three things real:

1. **Daily mental signal (60s mind-check).** Three sliders — energy, stress, focus — plus an optional 280-char note. Builds a mental graph parallel to the HRV graph. Becomes part of Adaptive Engine readiness.
2. **AI mental coach + AI-generated micro-sessions.** Claude reads your mind-check + HRV + week and writes a daily personal reflection (`/mind/today`). Library of 1–3 min AI-generated sessions (breathing, focus-priming, recovery wind-down, post-session debrief) — text+visual in v0 (audio narration deferred to voice decision).
3. **Crew as mental infrastructure (tier-gated).** Lifter = private. Athlete unlocks buddy-share of mind-check signal (consent both ways). Beast unlocks cirkler (asynkron group check-ins). Legend leads cirkler. Journal-text is always private. No exception.

**Positioning is explicit: NOT clinical.** We do not screen with PHQ-9/GAD-7, we do not diagnose, we do not replace therapy. We DO provide a safety pipeline (MH-9): Claude moderation on every input and output, crisis-keyword detection, surfaces emergency resources, and offers consent-gated escalation to a human coach (never automatic).

**Why this is moat.** Three properties stack only at MakeIt:

- **Datafusion** — mental signal × HRV × training load × Adaptive Engine. Calm has meditation. WHOOP has HRV. Trainerize has training. Nobody fuses all three.
- **Munk + Claude + voice TBD** — AI-personal daily reflection trained on member's actual training week is a category that doesn't exist in wellness apps.
- **Crew progression** — privacy as a tier unlock turns mental sharing into a status moment, not a permission dialog. Nobody else has the pyramid to do this.

---

## 2. Goals & non-goals

### Goals (v0, by end of MH-10)

- Every member has access to `/mind` with a daily 60-second mind-check. Streak tracked. Graph of last 30 days.
- `/mind/journal` private journaling. 1 entry/day max, 2000 chars. Always private to author. Streak tracked.
- `/mind/sessions` library of ≥8 hero AI-generated text+visual sessions (4 categories: breathing, focus, recovery, debrief). 1–3 min each. Completion tracked.
- `/mind/today` daily AI reflection generated by Claude from member's mind-check + HRV + training week. Surfaced 06:30 local time via push.
- Adaptive Engine consumes mental signal (MH-6). Low-energy + high-stress for 3+ days lowers `readiness_bucket` by one and adds `mental_state_low_energy_or_high_stress` to reasoning narrative.
- Tier-gated crew-sharing live: Athlete buddy-share, Beast cirkler, Legend cirkel-leader role. All opt-in even after tier unlock.
- Safety pipeline live: Claude moderation on journal entries + AI-coach outputs; crisis keywords surface resources + offer coach-escalation with explicit consent.
- Reps awarded for: 3/7/30-day mind-check streak, mental session completion, journal entry, mental buddy interaction (when unlocked), cirkel participation. Tier auto-promotes through existing ledger trigger.

### Non-goals (v0)

- **Clinical screening / diagnosis** — no PHQ-9, GAD-7, PSS, etc. Sliders are signal, not assessment. Explicit disclaimer in onboarding.
- **Voice/audio narration** — sessions render text + visual (breathing-ring animation, typography). Audio URL column stored, not played in v0. Voice decision deferred per user.
- **Member-authored sessions** — all sessions AI-generated in v0. v1 may add coach-authored.
- **Group video calls** — cirkler are asynkron text-based group check-ins. Synchronous group is v1.
- **External therapist marketplace** — no integration with clinical providers. Resources surface in safety pipeline are static links (Livslinien DK, etc.).
- **Cross-tier mental matching** — buddy mental-share is same-pair-as-training-buddy in v0; cross-tier mental pairing deferred.
- **Real-time emotional support chat** — coach DM exists via existing messaging; mental module doesn't add live chat surface.
- **Wearables-derived emotion signal** — we read HRV (we already have it), no skin-conductance / sleep-stages integration in v0.

### Out of scope (other Søjle work)

- Søjle 1 (Adaptive Engine) — consumes mental signal in readiness calc; the engine itself isn't rewritten.
- Søjle 4 (Crew Pyramid) — supplies tier + buddy pairing; mental module is a consumer.

---

## 3. Privacy & tier-progression table

Privacy is the spine. Every read of mental data passes through tier + opt-in check. RLS enforces.

| Tier | Mind-check | Journal | Sessions | AI coach output | Buddy mental-share | Cirkler |
|---|---|---|---|---|---|---|
| **Lifter** | Self only | Self only | Self only | Self only | Locked | Locked |
| **Athlete** | Self + buddy-share (opt-in, mutual) | Self only | Self only | Self only | Unlocked, opt-in | Locked |
| **Beast** | Self + buddy-share + cirkel-aggregate | Self only | Self + cirkel-shared-completion-count | Self only | Unlocked | Unlocked (member of one cirkel) |
| **Legend** | Same as Beast | Self only | Same as Beast | Self only | Unlocked | Can lead a cirkel |

**Hard rules (enforced in RLS + middleware):**

- Journal free-text is *never* readable by anyone but the author. Period. Not by coach, not by Munk, not in cirkler. Coach escalation in MH-9 surfaces a structured summary the *member writes themselves*, not the raw journal.
- Mind-check sharing is per-buddy and mutual: A sees B's signal only if A has opted in to share AND B has accepted share. Either side toggling off revokes both.
- Cirkler share aggregate-only by default (rolling 7-day average per metric, count of sessions). Individual daily values inside a cirkel require a second opt-in.
- Privacy state changes are logged (`mental_settings_log`) and reversible. Tier promotion never auto-opts a member in to sharing; it only *enables* the toggle.

---

## 4. Schema changes — migration 0046

```sql
-- Privacy + state per member
create table public.mental_settings (
  member_id uuid primary key references public.members(id) on delete cascade,
  buddy_share_enabled boolean not null default false,
  cirkel_share_aggregate_enabled boolean not null default false,
  cirkel_share_daily_enabled boolean not null default false,
  ai_coach_enabled boolean not null default true,
  notif_mind_check_evening boolean not null default true,
  notif_ai_coach_morning boolean not null default true,
  notif_buddy_mental_alert boolean not null default true,
  last_mind_check_at timestamptz,
  current_streak_days int not null default 0,
  longest_streak_days int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Daily mind-check log (one row per member per day, soft-enforced by unique index)
create table public.mind_check_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  logged_at timestamptz not null default now(),
  logged_date date not null default (now() at time zone 'UTC')::date,
  energy smallint not null check (energy between 1 and 5),
  stress smallint not null check (stress between 1 and 5),
  focus smallint not null check (focus between 1 and 5),
  note text check (length(note) <= 280),
  source text not null default 'manual' check (source in ('manual', 'morning_nudge', 'evening_nudge', 'post_session')),
  created_at timestamptz not null default now()
);
create unique index mind_check_logs_member_date_idx on public.mind_check_logs(member_id, logged_date);
create index mind_check_logs_member_date_desc_idx on public.mind_check_logs(member_id, logged_date desc);

-- Private journal entries
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  logged_at timestamptz not null default now(),
  logged_date date not null default (now() at time zone 'UTC')::date,
  prompt text,                          -- the AI-suggested prompt (nullable for freeform)
  body text not null check (length(body) between 1 and 2000),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','clean','flagged','crisis')),
  moderation_reason text,
  created_at timestamptz not null default now()
);
create unique index journal_entries_member_date_idx on public.journal_entries(member_id, logged_date);
create index journal_entries_member_logged_at_desc_idx on public.journal_entries(member_id, logged_at desc);

-- Mental session catalog (AI-generated, can be regenerated)
create table public.mental_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null check (category in ('breathing','focus','recovery','debrief')),
  title text not null,
  subtitle text,
  duration_seconds int not null check (duration_seconds between 60 and 600),
  body_md text not null,                -- markdown script rendered as text+visual
  visual_pattern text not null check (visual_pattern in ('box_breath_4_4_4_4','coherence_5_5','wave_4_8','still_focus','none')),
  audio_url text,                       -- nullable; v0 doesn't render audio
  voice text,                           -- voice key once decided
  generated_by text not null default 'claude' check (generated_by in ('claude','human','imported')),
  prompt_seed jsonb,                    -- seed used by Claude for reproducibility
  locale text not null default 'da' check (locale in ('da','en')),
  is_hero boolean not null default false,
  published_at timestamptz default now(),
  created_at timestamptz not null default now()
);
create index mental_sessions_category_idx on public.mental_sessions(category, locale, is_hero desc, published_at desc);

-- Session completion (also drives Reps)
create table public.mental_session_completions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  session_id uuid not null references public.mental_sessions(id) on delete cascade,
  completed_at timestamptz not null default now(),
  completed_date date not null default (now() at time zone 'UTC')::date,
  context text check (context in ('library','prescribed_by_coach','suggested_by_adaptive','pre_session','post_session')),
  created_at timestamptz not null default now()
);
create unique index mental_session_completions_unique_per_day_idx
  on public.mental_session_completions(member_id, session_id, completed_date);

-- AI mental coach daily output
create table public.mental_coach_outputs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  for_date date not null,
  body_md text not null,
  prompt_seed jsonb,
  moderation_status text not null default 'clean' check (moderation_status in ('clean','flagged')),
  created_at timestamptz not null default now()
);
create unique index mental_coach_outputs_member_date_idx on public.mental_coach_outputs(member_id, for_date);

-- Cirkel groups (Beast+)
create table public.mental_cirkler (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_id uuid references public.members(id) on delete set null,
  max_members int not null default 6 check (max_members between 3 and 10),
  created_at timestamptz not null default now()
);

create table public.mental_cirkel_members (
  cirkel_id uuid not null references public.mental_cirkler(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  joined_at timestamptz not null default now(),
  daily_share_opt_in boolean not null default false,
  primary key (cirkel_id, member_id)
);

-- Privacy state change log (for auditability of opt-in/out)
create table public.mental_settings_log (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);

-- RLS (essential surfaces; full DDL in migration file)
alter table public.mental_settings enable row level security;
alter table public.mind_check_logs enable row level security;
alter table public.journal_entries enable row level security;
alter table public.mental_sessions enable row level security;
alter table public.mental_session_completions enable row level security;
alter table public.mental_coach_outputs enable row level security;
alter table public.mental_cirkler enable row level security;
alter table public.mental_cirkel_members enable row level security;
alter table public.mental_settings_log enable row level security;

-- Members read/write own rows; journal_entries never readable except by author.
-- Mind_check_logs readable by buddy IF mutual opt-in (helper: mind_check_visible_to(viewer, owner)).
-- Mental_sessions readable by all authenticated members.
-- Coach role can read mental_coach_outputs.moderation_status='flagged' aggregate (no body) for safety review.
```

A helper function `public.mind_check_visible_to(viewer uuid, owner uuid) returns boolean` implements the mutual-opt-in + buddy-pair check, used by RLS policy on `mind_check_logs`.

---

## 5. Mind-check surface (MH-2)

**Route:** `/mind/check`. Mounted in `(app)` group. Pushed via `/api/cron/mind-check-nudge` (20:00 local, only if not logged today).

Three sliders + one optional note. ~60 seconds end-to-end:

```
┌─ Energi ────────────────────────  3 / 5
│ ●━━━━○━━━━○  (slider 1-5, anchored low="udmattet" / high="opladt")
├─ Stress ───────────────────────  2 / 5
│ ●━━○━━━━━━━  (low="rolig" / high="pumpet")
├─ Fokus ────────────────────────  4 / 5
│ ●━━━━━━━○━  (low="spredt" / high="laserskarp")
├─ En sætning (valgfri)
│ [_______________________________]  280 chars
└─ Gem
```

After submit: 30-day mental graph (3 lines: energy, stress, focus inverted so up=good), streak counter, "din mentale uge i ét billede" — 7-day sparkline. Adaptive integration runs in background (snapshot recompute scheduled).

**Server action:** `submitMindCheckAction(memberId, {energy, stress, focus, note, source})` in `src/app/(app)/mind/actions.ts`. Idempotent on `(member_id, logged_date)` unique index — same-day resubmit updates the row, doesn't insert duplicate. Updates `mental_settings.last_mind_check_at` and `current_streak_days`.

**Demo mode:** `src/lib/mind/mock.ts` produces 30 days of plausible mind-check history. UI works without DB.

---

## 6. Journal surface (MH-3)

**Route:** `/mind/journal`. List of past entries (own-only). One entry per day. 2000 chars max. Markdown rendered.

Prompt rotation (7 prompts, weighted by mind-check signal):
- "Hvad var bedst ved i dag?"
- "Hvad tager du med fra dagens træning?"
- "Hvad bekymrer dig lige nu?"
- "Hvem hjalp dig — og fortjener tak?"
- "En ting du er stolt af denne uge."
- "Hvis du kunne sige noget til dig selv fra i morges, hvad ville det være?"
- "Skriv frit." (escape hatch)

If today's mind-check shows stress ≥4, prompts skew to gratitude/grounding. Energy ≤2, skew to compassion. Engine in `src/lib/mind/prompts.ts`.

**Server action:** `submitJournalEntryAction(memberId, {body, prompt})`. Calls moderation (MH-9 safe path: `moderateJournalEntry(body)`). On `crisis` status, hides entry from history view, surfaces resources modal, offers coach-escalation (with explicit consent only). On `flagged`, entry saved but flagged for member's own review (e.g., very negative self-talk patterns trigger a gentle nudge to consider a session).

**Reps:** Streak award (3 days +5, 7 days +20, 30 days +100) via `awardJournalStreak` in `src/lib/mind/reps.ts`. Same idempotent pattern as buddy/coach Reps (existing `reference_type` + `reference_id` constraint).

---

## 7. Sessions library + AI generation (MH-4, MH-5)

**MH-4: Daily micro-session.** Personalized 1–3 min session generated by Claude for today, based on mind-check + HRV + last training session. Surfaced on `/mind/today`. One per day per member. Caching: same input + date → same output (deterministic seed).

`src/lib/mind/session-generator-claude.ts` — wrapper around Claude. Returns `{title, subtitle, body_md, visual_pattern, duration_seconds, prompt_seed}`. Stored in `mental_sessions` with `slug = personal-<memberid>-<date>`, `is_hero=false`. Not surfaced in library; only via `/mind/today`.

**MH-5: Hero library.** 8 evergreen AI-generated hero sessions seeded into migration 0046 + a `scripts/seed-mental-sessions.mjs`:

- *Breathing (2):* "Box breath 4-4-4-4 — for indre ro", "Coherence 5-5 — for HRV-løft"
- *Focus (2):* "Pre-session priming — 90 sek inden løft", "Genstart efter pause — fra hjerne-tåge til klart sigte"
- *Recovery (2):* "Vind ned efter beast-mode", "Sov bedre — body scan 4 min"
- *Debrief (2):* "Hvad gik godt? Hvad næste gang?", "Når træningen var dårlig"

Each hero session: title, subtitle, 6–12 paragraphs of body_md (the script), a visual_pattern key, duration_seconds. `is_hero=true`, `locale='da'` initially, en-versions follow.

**Renderer:** `src/components/mental/SessionRunner.tsx` — full-screen overlay, paragraph-paced typography, breathing-ring animation tied to `visual_pattern`. No audio in v0.

**Completion:** Tap-through completes; Reps awarded (+10 hero session, +5 personal). Idempotent on `(member_id, session_id, completed_date)`.

---

## 8. AI mental coach (MH-7)

**Cron:** `/api/cron/mental-coach-daily` runs 06:00 UTC. For every member with `mental_coach_enabled=true` and a mind-check in the last 48h, calls `generateMentalCoachOutput(memberId, forDate)`.

Input bundled by `src/lib/mind/coach-context.ts`:
- Last 7 days mind-check (energy/stress/focus medians + trend)
- HRV trend (existing `src/lib/hrv/progress.ts`)
- Training week summary (existing `src/lib/data/training-week.ts`)
- Last 3 journal-entry prompts answered (not bodies — just which prompts)
- Member's tier + name

Claude prompt (`src/lib/mind/coach-claude.ts`): 200–400 word personal reflection in Danish, second-person, voice-agnostic placeholder (`[COACH_VOICE]` slot fillable later). Three-section structure: *Det jeg ser hos dig i dag* → *Et spørgsmål til dig* → *En lille ting at gøre i dag*.

Output stored in `mental_coach_outputs`. Push notification 06:30 local. UI: `/mind/today` page renders the markdown with hero-typography.

**Failure modes:**
- No mind-check in 48h → skip generation, push *"Vi mangler din mind-check for at vide hvor du er"* nudge instead.
- Claude error → fall back to a deterministic template (`src/lib/mind/coach-fallback.ts`) that still cites HRV trend + last session. Never empty.
- Moderation flagged on output → discard, do not push, log.

---

## 9. Adaptive Engine integration (MH-6)

Mental signal feeds readiness. Specifically:

In `src/lib/adaptive/snapshot.ts`, extend snapshot with:

```ts
mental_signal: {
  energy_median_7d: number | null;       // 1-5, last 7 days
  stress_median_7d: number | null;
  focus_median_7d: number | null;
  low_for_days: number;                  // consecutive days with energy<=2 OR stress>=4
  freshness_days: number;                // days since last mind-check
}
```

Computed in `src/lib/mind/snapshot-contribution.ts` and merged into `snapshotForMember(memberId)`.

**Readiness adjustment rule (MH-6 §a):** if `low_for_days >= 3` and existing HRV-derived readiness is *green* or *yellow*, drop one bucket. If already *red*, hold. If `freshness_days > 3`, do nothing (data too stale to trust).

**Reasoning prompt (MH-6 §b):** Add narrative key `mental_state_low_energy_or_high_stress` to `src/lib/adaptive/reason-narratives.ts`. Reasoning input in `reasoning.ts:172` receives `mental_signal` block.

**Adaptive UI (consumes existing surface):** the existing "why this load" explanation surface (`src/lib/adaptive/explanation.ts`) renders the mental narrative when applicable. No new UI route.

**Test coverage:** new `src/lib/mind/snapshot-contribution.test.ts` + mock-scenarios update in `src/lib/adaptive/mock-scenarios.ts` (3 new scenarios: low_energy_3d, high_stress_3d, stale_no_mental).

---

## 10. Crew mental-share (MH-8)

**Buddy mental-share (Athlete+).** Toggle on `/mind/settings` (only visible if tier >= Athlete AND member has a buddy). When BOTH buddies opt-in, each sees the other's mind-check summary on `/buddy`:

```
Buddy: Sofie ⚡
Mental: energi 3 · stress 2 · fokus 4
Sidst tjekket: i morges
```

No journal text. No graph beyond 7-day sparkline. Tap-through opens existing `/buddy/why` with an added "send en kort hilsen"-action that uses existing `messages` infrastructure (kind `mental_nudge`).

**Cron:** `/api/cron/buddy-mental-weekly-checkin` Mondays 07:00. If a buddy pair has both opted in but neither has interacted for 7 days, push a gentle nudge.

**Reps:** `mental_buddy_interaction` event awards +3 Reps per week (capped) — same idempotency pattern as existing buddy reactions.

**Cirkler (MH-10).** Asynkron group: 3–6 members + Legend leader. Members post a weekly check-in (1 paragraph max, optionally with mind-check median). Others react with 🔥/💪/❤. Stored as new `mental_cirkel_posts` table (in MH-10 migration extension, not 0046). Aggregate-only mind-check share is default; individual daily values require a second opt-in.

Legend leader has lightweight moderation tools: hide post (member can still see own), promote insightful posts to top.

**Reps:** `cirkel_participation` per weekly post +10, +5 per reaction given (capped).

---

## 11. Safety pipeline (MH-9)

Mental content — even non-clinical — needs a safety layer from day 1. We do NOT defer this to a late phase. The pipeline is wired in MH-3 (journal) and MH-7 (AI coach output) and hardened in MH-9.

**Layers:**

1. **Keyword pre-filter** (`src/lib/mind/crisis-keywords.ts`) — fast regex over journal body + AI output. Categories: self-harm, suicidal ideation, severe distress, substance crisis. Conservative: false positives are fine; false negatives are not.
2. **Claude moderation** (`src/lib/mind/moderation-claude.ts`) — only for entries that pass keyword filter or are short enough to be ambiguous. Claude returns `{status: 'clean'|'flagged'|'crisis', categories: string[], reason: string}`. Crisis tier triggers resources surface immediately.
3. **Resources surface** — full-screen modal with: emergency numbers (Livslinien 70 201 201, Psykiatrisk Skadestue), a "tal med en ven"-prompt, and an explicit opt-in "skal jeg fortælle Munk at du har det svært?" — if accepted, generates a *member-written* short summary and lands it in coach queue with `kind='mental'`, status `pending`. Munk sees only the member's chosen wording, not the raw journal.
4. **No automatic coach escalation. Ever.** Even a "crisis" classification only *offers* escalation. The member chooses.
5. **AI coach output moderation.** Every `mental_coach_outputs` row is moderated before push. Flagged outputs are discarded silently; member sees fallback content. Logged to `mental_coach_outputs.moderation_status='flagged'`.
6. **Disclaimer in onboarding.** First time `/mind` is opened: "MakeIt's mental modul er IKKE klinisk behandling. Hvis du har det meget skidt, ring Livslinien 70 201 201 eller din egen læge." Single tap-through. Stored as `members.acknowledged_mental_disclaimer_at`.

---

## 12. Reps integration

All mental Reps emit through existing `reps_transactions` ledger; tier promotion runs automatically through `bump_tier_after_reps_change()` trigger. New `reference_type` values:

| reference_type | Event | Delta | Cap |
|---|---|---|---|
| `mind_check_streak` | 3-day streak hit | +5 | 1 per 3-day window |
| `mind_check_streak` | 7-day streak hit | +20 | 1 per 7-day window |
| `mind_check_streak` | 30-day streak hit | +100 | 1 per 30-day window |
| `mental_session_completed` | Hero session | +10 | 3/day |
| `mental_session_completed` | Personal daily session | +5 | 1/day |
| `journal_entry` | Daily journal entry | +5 | 1/day |
| `mental_buddy_interaction` | Weekly buddy mental nudge | +3 | 1/week |
| `cirkel_participation` | Weekly cirkel post | +10 | 1/week |
| `cirkel_participation` | Cirkel reaction given | +1 | 5/week |
| `mental_milestone_30d` | 30-day continuous engagement | +50 | one-off |
| `mental_milestone_90d` | 90-day continuous engagement | +200 | one-off |

`reference_id` is the source row's UUID (mind_check_logs.id, mental_session_completions.id, etc.) — idempotency comes free from the existing unique-per-source constraint pattern used by buddy/coach Reps.

`src/lib/mind/reps.ts` exposes `award*` helpers; called from server actions + crons.

---

## 13. Telemetry & observability

Mirror Søjle 4's approach. Server-only `console.info` lines tagged `[mind]` for production log capture.

Key events:
- `mind_check_logged` (member_id, source, energy, stress, focus, streak_after)
- `mental_session_completed` (member_id, session_slug, context, duration_seconds)
- `journal_entry_submitted` (member_id, length, moderation_status)
- `mental_coach_output_generated` (member_id, model, latency_ms, moderation_status)
- `mental_coach_output_fallback` (member_id, reason)
- `mental_buddy_share_toggled` (member_id, new_value)
- `mental_safety_resource_shown` (member_id, trigger: keyword|claude_crisis|claude_flagged)
- `mental_safety_escalation_accepted` (member_id) — escalated to coach queue with consent

Weekly summary cron `/api/cron/mental-weekly-insights` Sundays 18:00 produces `mental_weekly_insights` rows (per-member 7-day medians, streak deltas, sessions completed) for use in MH-7 input bundle.

---

## 14. Rollout & phases (Approach A)

| Phase | Scope | Migration / Code | Verifiable surface |
|---|---|---|---|
| **MH-1** | Schema + RLS + privacy/tier-gating + disclaimer onboarding + i18n scaffold | Migration 0046, `src/lib/mind/types.ts`, `mock.ts`, `messages/{da,en}/Mind.json` | `/mind/onboarding` disclaimer accept stores `acknowledged_mental_disclaimer_at` |
| **MH-2** | Mind-check UI + actions + 30-day graph + streak counter + evening nudge cron | `/mind/check`, `actions.ts`, `MindCheckForm.tsx`, `MentalGraph.tsx`, `/api/cron/mind-check-nudge` | Logging 60s flow works in demo mode; graph renders 30 days of mock data |
| **MH-3** | Journal entry + prompts engine + Reps streak + (lightweight) keyword pre-filter | `/mind/journal`, `prompts.ts`, `reps.ts`, `crisis-keywords.ts` | Journal saves, streak awards Reps, crisis keyword shows resources modal stub |
| **MH-4** | AI personal micro-session generator + `/mind/today` surface | `session-generator-claude.ts`, `coach-context.ts`, `SessionRunner.tsx` | Visit `/mind/today`, generate session inline, run breathing ring, complete |
| **MH-5** | Hero session library + 8 seeded sessions + `/mind/sessions` catalog | `scripts/seed-mental-sessions.mjs`, `/mind/sessions`, `SessionCard.tsx` | 8 hero sessions browseable; complete one; Reps awarded |
| **MH-6** | Adaptive Engine mental-signal contribution + reasoning narrative + tests | `snapshot-contribution.ts`, `snapshot.ts` extension, `reason-narratives.ts`, `mock-scenarios.ts` | Simulated low_for_days=3 drops readiness bucket; explanation surface shows mental narrative |
| **MH-7** | AI mental coach daily cron + fallback + push | `coach-claude.ts`, `coach-fallback.ts`, `/api/cron/mental-coach-daily`, push wiring | Cron fires in dev (manual trigger), output stored, `/mind/today` renders it |
| **MH-8** | Buddy mental-share toggle + buddy surface render + weekly cron | `mental-share-toggle.tsx`, `/buddy` extension, `/api/cron/buddy-mental-weekly-checkin` | Athlete-tier member sees toggle, opt-in mutually, buddy signal renders |
| **MH-9** | Full safety pipeline hardening: Claude moderation, crisis modal, coach-escalation consent flow, telemetry | `moderation-claude.ts`, `MentalSafetyModal.tsx`, escalation server action, coach queue `kind='mental'` integration | Submit journal with crisis-keyword phrasing → modal appears → consent escalates to coach queue |
| **MH-10** | Cirkler tables (extension migration) + Beast-tier cirkel join UI + weekly post flow + Reps milestones | Extension migration `0047_mental_cirkler_posts.sql`, `/mind/cirkler`, `CirkelFeed.tsx` | Beast can join cirkel, post weekly, react; aggregate share visible only on members' opt-in |

Each phase ships as one commit on `claude/makeit-online-platform-XF2UE` branch, mirroring CC-1..CC-10 cadence. After MH-10, EVAL.md commit. Then B-layer (wow amplifications): hero-session production-grade content polish, marketing-surface for landing, voice decision unblock if user comes back.

---

## 15. Known loose ends carried in

- **Voice decision deferred.** Sessions render text+visual only in v0. `mental_sessions.audio_url` + `voice` columns exist for fast-follow when user decides.
- **Migration 0045 still pending against live DB** (per project memory). Migration 0046 is additive and doesn't depend on 0045's data, but both must be applied together before the cron jobs hit live DB.
- **`db:types` not regenerated** since 0045. After 0046 lands, run `npm run db:types`. Until then, mental module uses hand-typed interfaces in `src/lib/mind/types.ts` mirroring the migration.

---

## 16. Estimated effort

Same cadence as Søjle 4 (~10 commits over ~3 weeks calendar with Claude). Solo + Claude assumption:

| Phase | Effort indicator |
|---|---|
| MH-1 | Migration + RLS + types + i18n — medium |
| MH-2 | UI flow + graph + actions — medium-large |
| MH-3 | Journal + prompts + Reps + keyword pre-filter — medium |
| MH-4 | Claude integration + session renderer — medium-large |
| MH-5 | 8 seeded sessions + library catalog — medium |
| MH-6 | Adaptive snapshot + reasoning + tests — medium |
| MH-7 | Cron + Claude + fallback + push — medium |
| MH-8 | Toggle + buddy surface + cron + Reps — small-medium |
| MH-9 | Safety pipeline hardening + escalation flow — large (high care) |
| MH-10 | Cirkler tables + UI + milestones — large |
| EVAL | Summary + B-prioritering — small |
| B-layer | Hero content polish + marketing — variable; stops before C |

---

## 17. Open questions (parked for after MH-10 eval)

1. **Voice.** Munk-stem? AI-generated (ElevenLabs)? Multi-voice (member picks)? Decision unblocks audio render and v1 session content.
2. **Cross-tier mental matching.** Athlete buddy-share is same-tier today. Cross-tier mental pairing (mentor-style) for v1?
3. **External resources localisering.** Resources surface lists Danish numbers only. EN-locale users get same numbers in v0; needs locale-aware switch for v1.
4. **Crisis classification false-positive rate.** Monitor in eval; tune keyword list + Claude prompt after first 30 days of real submissions.
5. **Cirkel-leader compensation.** Legends lead cirkler for free in v0. v1 may add Reps multiplier or revenue share — coordinate with Søjle 4 Legend revenue-share roadmap.
