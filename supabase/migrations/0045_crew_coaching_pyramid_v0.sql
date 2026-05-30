-- =================================================================
-- MakeIt // HQ — Søjle 4: Crew Coaching Pyramid v0 (CC-1)
-- =================================================================
-- Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §4
--
-- Foundation migration for the coaching pyramid: AI buddy pairing,
-- co-coach sandbox + live pipeline, and the coaching skill tree.
--
-- All changes are additive. No code surface yet — CC-2 onward layers
-- engines, crons, and UI on this schema.
--
-- Structure:
--   1. is_current_user_munk() helper (mirrors is_current_user_admin)
--   2. members.coach_tier column
--   3. buddy_pairs + buddy_interactions
--   4. co_coach_assignments
--   5. coach_reviews (sandbox + live)
--   6. coaching_lessons + lesson_progress
--   7. coach_quality_scores (weekly snapshot)
--   8. RLS policies for every new table
--   9. Bootstrap: set Munk's coach_tier='munk'
-- =================================================================

-- ---------------------------------------------------------------------
-- 1) is_current_user_munk() — Munk-only RLS predicate
-- ---------------------------------------------------------------------
-- The Crew Coaching Pyramid introduces co-coaches (beast_live /
-- legend_live). is_current_user_coach() returns true for them too once
-- they're promoted, so policies that should stay head-coach-only
-- (assigning co-coaches, reading quality scores across all coaches)
-- need a tighter predicate. Mirrors the is_current_user_admin pattern.
create or replace function public.is_current_user_munk()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select coach_tier = 'munk' from public.members where id = auth.uid()),
    false
  );
$$;
grant execute on function public.is_current_user_munk() to authenticated;

-- ---------------------------------------------------------------------
-- 2) members.coach_tier — extends the existing role system
-- ---------------------------------------------------------------------
-- Null = not a coach (most members). is_coach stays as the broad gate;
-- coach_tier names the pyramid level.
alter table public.members
  add column if not exists coach_tier text
    check (coach_tier is null or coach_tier in ('munk', 'legend_live', 'beast_live', 'beast_sandbox'));

comment on column public.members.coach_tier is
  'Crew Coaching Pyramid (Søjle 4) tier. Null for crew members; "munk" for the head coach; "legend_live"/"beast_live" for active co-coaches; "beast_sandbox" for in-training co-coaches.';

-- ---------------------------------------------------------------------
-- 3) Buddy pairs + interactions (AI buddy pairing — same-tier crew)
-- ---------------------------------------------------------------------
create table if not exists public.buddy_pairs (
  id              uuid primary key default gen_random_uuid(),
  member_a        uuid not null references public.members(id) on delete cascade,
  member_b        uuid not null references public.members(id) on delete cascade,
  paired_at       timestamptz not null default now(),
  unpaired_at     timestamptz,
  pairing_reason  jsonb,   -- { algo_version, scores, top_factors[] }
  constraint buddy_pairs_distinct check (member_a < member_b),
  -- A given member can only appear in one active pair (unpaired_at IS NULL)
  -- at a time. Once unpaired_at gets a value, a new pair can be created.
  constraint buddy_pairs_unique_active_a unique (member_a, unpaired_at),
  constraint buddy_pairs_unique_active_b unique (member_b, unpaired_at)
);

create index if not exists idx_buddy_pairs_member_a on public.buddy_pairs (member_a);
create index if not exists idx_buddy_pairs_member_b on public.buddy_pairs (member_b);

comment on table public.buddy_pairs is
  'AI-matched same-tier buddy pair. One row per unordered pair (member_a < member_b). unpaired_at preserves history.';

create table if not exists public.buddy_interactions (
  id           uuid primary key default gen_random_uuid(),
  pair_id      uuid not null references public.buddy_pairs(id) on delete cascade,
  from_member  uuid not null references public.members(id),
  to_member    uuid not null references public.members(id),
  kind         text not null check (kind in (
                 'reaction_fire', 'reaction_strong', 'reaction_eyes',
                 'nudge_session', 'nudge_sleep', 'comment'
               )),
  body         text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_buddy_interactions_pair_time
  on public.buddy_interactions (pair_id, created_at desc);

comment on table public.buddy_interactions is
  'Reactions, nudges, and comments exchanged between buddies. The buddy timeline reads from here.';

-- ---------------------------------------------------------------------
-- 4) Co-coach assignments (live members each co-coach reviews)
-- ---------------------------------------------------------------------
create table if not exists public.co_coach_assignments (
  id                  uuid primary key default gen_random_uuid(),
  coach_member_id     uuid not null references public.members(id) on delete cascade,
  assigned_member_id  uuid not null references public.members(id) on delete cascade,
  assigned_at         timestamptz not null default now(),
  ended_at            timestamptz,
  assigned_by         uuid references public.members(id),   -- Munk's id
  -- Same idempotency trick as buddy_pairs: at most one active
  -- assignment per (coach, member) pair until ended_at gets a value.
  constraint co_coach_assignments_unique_active
    unique (coach_member_id, assigned_member_id, ended_at)
);

create index if not exists idx_co_coach_assignments_coach
  on public.co_coach_assignments (coach_member_id);
create index if not exists idx_co_coach_assignments_assigned
  on public.co_coach_assignments (assigned_member_id);

comment on table public.co_coach_assignments is
  'Munk-assigned live coach↔member links. A co-coach reviews their assigned members'' HRV alerts, form-checks, and adaptive escalations alongside Munk.';

-- ---------------------------------------------------------------------
-- 5) Coach reviews (sandbox + live)
-- ---------------------------------------------------------------------
create table if not exists public.coach_reviews (
  id                     uuid primary key default gen_random_uuid(),
  reviewer_id            uuid not null references public.members(id) on delete cascade,
  mode                   text not null check (mode in ('sandbox', 'live')),
  source_type            text not null check (source_type in ('hrv_alert', 'form_check', 'adaptation')),
  source_id              uuid not null,
  decision               text not null check (decision in ('approve', 'modify', 'escalate', 'reject')),
  decision_payload       jsonb,    -- co-coach's proposed cue / comment / action
  reasoning              text,
  submitted_at           timestamptz not null default now(),
  -- For sandbox mode: what Munk actually did (the ground truth).
  munk_decision          text,
  munk_decision_payload  jsonb,
  agreement_score        numeric(3,2)   -- 0..1, computed by the agreement function
);

create index if not exists idx_coach_reviews_reviewer_mode
  on public.coach_reviews (reviewer_id, mode, submitted_at desc);

comment on table public.coach_reviews is
  'A co-coach''s decision on an hrv_alert / form_check / adaptation. Sandbox rows carry Munk''s parallel decision + an agreement_score, which drives the quality scorecard and promotion gate.';

-- ---------------------------------------------------------------------
-- 6) Coaching lessons + per-member progress
-- ---------------------------------------------------------------------
create table if not exists public.coaching_lessons (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  required_tier      text not null check (required_tier in ('athlete', 'beast', 'legend')),
  title_da           text not null,
  video_url          text not null,
  duration_sec       int,
  quiz               jsonb not null,        -- [{question, choices[], correct_index, explanation}]
  practice_scenario  jsonb,                  -- {prompt, context, rubric_for_claude}
  reps_award         int not null default 20,
  published_at       timestamptz
);

create index if not exists idx_coaching_lessons_required_tier
  on public.coaching_lessons (required_tier)
  where published_at is not null;

comment on table public.coaching_lessons is
  'Coaching skill-tree lessons. Members unlock by tier; published_at = visibility gate. Quiz + practice scenario fields keep the renderer + Claude-eval contract loose.';

create table if not exists public.lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members(id) on delete cascade,
  lesson_id     uuid not null references public.coaching_lessons(id),
  quiz_score    numeric(3,2),
  practice_eval jsonb,                       -- Claude's evaluation jsonb
  completed_at  timestamptz,
  unique (member_id, lesson_id)
);

create index if not exists idx_lesson_progress_member
  on public.lesson_progress (member_id);

comment on table public.lesson_progress is
  'Per-(member, lesson) progress: quiz score, Claude practice evaluation, completion timestamp. Drives tier unlocks + reps awards.';

-- ---------------------------------------------------------------------
-- 7) Coach quality scorecards (weekly snapshot cron)
-- ---------------------------------------------------------------------
create table if not exists public.coach_quality_scores (
  id                       uuid primary key default gen_random_uuid(),
  coach_member_id          uuid not null references public.members(id) on delete cascade,
  snapshot_at              timestamptz not null default now(),
  agreement_with_munk      numeric(3,2),   -- last 50 sandbox + spot-checked live cases
  member_satisfaction      numeric(3,2),   -- avg of 1-5 thumbs from members
  response_time_p50_minutes int,
  intervention_count_week  int,
  status                   text not null check (status in ('healthy', 'watch', 'demoted')),
  notes                    text             -- optional Munk note
);

create index if not exists idx_coach_quality_scores_coach
  on public.coach_quality_scores (coach_member_id, snapshot_at desc);

comment on table public.coach_quality_scores is
  'Weekly quality snapshot per active co-coach. The demotion cron (CC-8) writes here; Munk reviews via /coach/co-coaches.';

-- ---------------------------------------------------------------------
-- 8) RLS — enable on every new table, then policies.
-- ---------------------------------------------------------------------
alter table public.buddy_pairs           enable row level security;
alter table public.buddy_interactions    enable row level security;
alter table public.co_coach_assignments  enable row level security;
alter table public.coach_reviews         enable row level security;
alter table public.coaching_lessons      enable row level security;
alter table public.lesson_progress       enable row level security;
alter table public.coach_quality_scores  enable row level security;

-- buddy_pairs: each member sees their own pairs. Service-role writes.
drop policy if exists "buddy_pairs_own_read" on public.buddy_pairs;
create policy "buddy_pairs_own_read"
  on public.buddy_pairs
  for select
  using (member_a = auth.uid() or member_b = auth.uid() or public.is_current_user_munk());

-- buddy_interactions: see interactions on pairs you're in.
drop policy if exists "buddy_interactions_own_read" on public.buddy_interactions;
create policy "buddy_interactions_own_read"
  on public.buddy_interactions
  for select
  using (
    exists (
      select 1 from public.buddy_pairs bp
       where bp.id = buddy_interactions.pair_id
         and (bp.member_a = auth.uid() or bp.member_b = auth.uid())
    )
    or public.is_current_user_munk()
  );

-- buddy_interactions: a member can insert their own outgoing message
-- on a pair they participate in.
drop policy if exists "buddy_interactions_own_insert" on public.buddy_interactions;
create policy "buddy_interactions_own_insert"
  on public.buddy_interactions
  for insert
  with check (
    from_member = auth.uid()
    and exists (
      select 1 from public.buddy_pairs bp
       where bp.id = buddy_interactions.pair_id
         and (bp.member_a = auth.uid() or bp.member_b = auth.uid())
         and bp.unpaired_at is null
    )
  );

-- co_coach_assignments: assigned member sees their coach; coach sees
-- their assigned members; Munk sees all. Munk-only writes.
drop policy if exists "co_coach_assignments_own_read" on public.co_coach_assignments;
create policy "co_coach_assignments_own_read"
  on public.co_coach_assignments
  for select
  using (
    coach_member_id = auth.uid()
    or assigned_member_id = auth.uid()
    or public.is_current_user_munk()
  );

drop policy if exists "co_coach_assignments_munk_write" on public.co_coach_assignments;
create policy "co_coach_assignments_munk_write"
  on public.co_coach_assignments
  for all
  using (public.is_current_user_munk())
  with check (public.is_current_user_munk());

-- coach_reviews: reviewer sees + writes own; Munk reads all and writes
-- the munk_decision / agreement_score fields.
drop policy if exists "coach_reviews_own_read" on public.coach_reviews;
create policy "coach_reviews_own_read"
  on public.coach_reviews
  for select
  using (reviewer_id = auth.uid() or public.is_current_user_munk());

drop policy if exists "coach_reviews_own_insert" on public.coach_reviews;
create policy "coach_reviews_own_insert"
  on public.coach_reviews
  for insert
  with check (reviewer_id = auth.uid());

drop policy if exists "coach_reviews_munk_update" on public.coach_reviews;
create policy "coach_reviews_munk_update"
  on public.coach_reviews
  for update
  using (public.is_current_user_munk())
  with check (public.is_current_user_munk());

-- coaching_lessons: every authed user reads published lessons; Munk writes.
drop policy if exists "coaching_lessons_published_read" on public.coaching_lessons;
create policy "coaching_lessons_published_read"
  on public.coaching_lessons
  for select
  using (published_at is not null or public.is_current_user_munk());

drop policy if exists "coaching_lessons_munk_write" on public.coaching_lessons;
create policy "coaching_lessons_munk_write"
  on public.coaching_lessons
  for all
  using (public.is_current_user_munk())
  with check (public.is_current_user_munk());

-- lesson_progress: owner reads + writes own; Munk reads all (for audits).
drop policy if exists "lesson_progress_own_all" on public.lesson_progress;
create policy "lesson_progress_own_all"
  on public.lesson_progress
  for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

drop policy if exists "lesson_progress_munk_read" on public.lesson_progress;
create policy "lesson_progress_munk_read"
  on public.lesson_progress
  for select
  using (public.is_current_user_munk());

-- coach_quality_scores: the coach reads their own; Munk reads all.
-- Writes happen via service-role (the quality cron).
drop policy if exists "coach_quality_scores_own_read" on public.coach_quality_scores;
create policy "coach_quality_scores_own_read"
  on public.coach_quality_scores
  for select
  using (coach_member_id = auth.uid() or public.is_current_user_munk());

-- ---------------------------------------------------------------------
-- 9) Bootstrap: tag Munk with coach_tier='munk' so is_current_user_munk()
--    returns true for him immediately. Idempotent.
-- ---------------------------------------------------------------------
update public.members
   set coach_tier = 'munk'
 where (lower(handle) = 'munk' or email = 'munk@nowmakeit.eu')
   and (coach_tier is null or coach_tier <> 'munk');
