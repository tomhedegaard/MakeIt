-- =====================================================================
-- Adaptive Program Engine v0 — schema extensions
-- =====================================================================
-- Spec: docs/superpowers/specs/2026-05-25-adaptive-program-engine-v0-design.md
-- Builds on the existing hrv_session_modifiers / hrv_alerts plumbing
-- (0032_hrv_module.sql). The engine writes a hrv_session_modifiers row
-- per adapted session and, when human judgment is recommended, an
-- hrv_alerts row that links back via the existing session_modifier_id FK.
--
-- Migration is additive only — no destructive changes to existing data.
-- Backfill: none required (engine starts inserting from cron tick onward).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Extend modifier_type enum: 4 existing values → 7 total.
--    'no_change' is implicit (rows are not persisted when no action).
--    'escalate_to_coach' persists a row so the member sees a "coach
--    reviewing" placeholder; the matching hrv_alerts row carries the
--    detail for Munk's queue.
-- ---------------------------------------------------------------------
alter table public.hrv_session_modifiers
  drop constraint if exists hrv_session_modifiers_modifier_type_check;

alter table public.hrv_session_modifiers
  add constraint hrv_session_modifiers_modifier_type_check
  check (modifier_type in (
    'top_set_reduction',
    'volume_reduction',
    'deload_week_insertion',
    'paused_session',
    'exercise_swap_variant',
    'session_shorten',
    'escalate_to_coach'
  ));

-- ---------------------------------------------------------------------
-- 2) Extend reason enum with 'adaptive_v0'. Pre-existing reasons stay
--    valid so HRV alert-triggered modifiers (B-prong, D-prong, coach
--    pause) keep working unchanged.
-- ---------------------------------------------------------------------
alter table public.hrv_session_modifiers
  drop constraint if exists hrv_session_modifiers_reason_check;

alter table public.hrv_session_modifiers
  add constraint hrv_session_modifiers_reason_check
  check (reason in (
    'hrv_low_readiness_b_prong',
    'hrv_sustained_low_d_prong',
    'coach_pause_from_alert',
    'adaptive_v0'
  ));

-- ---------------------------------------------------------------------
-- 3) Add audit columns. `applied_value` already exists from 0032 and is
--    used for action parameters (e.g. {"percent": 10} for
--    top_set_reduction). The new columns carry the engine's decision
--    trail so we can explain to the member and retrain the reasoning
--    prompt from Munk's overrides.
-- ---------------------------------------------------------------------
alter table public.hrv_session_modifiers
  add column if not exists input_snapshot jsonb,
  add column if not exists rule_decision jsonb,
  add column if not exists reasoning_output jsonb,
  add column if not exists explanation_da text,
  add column if not exists confidence numeric(3,2),
  add column if not exists reviewed_by text
    check (reviewed_by is null
        or reviewed_by = 'auto'
        or reviewed_by = 'munk'
        or reviewed_by like 'co_coach:%'),
  add column if not exists reviewed_at timestamptz;

comment on column public.hrv_session_modifiers.input_snapshot is
  'Frozen jsonb snapshot of signals fed into the engine on the day this row was created. Used for audit + replay.';
comment on column public.hrv_session_modifiers.rule_decision is
  'Output of the deterministic rule layer (src/lib/adaptive/engine.ts).';
comment on column public.hrv_session_modifiers.reasoning_output is
  'Full output of the Claude reasoning layer when invoked. Null when reasoning layer was skipped or unavailable.';
comment on column public.hrv_session_modifiers.explanation_da is
  'Member-facing Danish explanation. Rendered in the "Why today is different" UI.';
comment on column public.hrv_session_modifiers.confidence is
  'Final confidence after reasoning layer (0..1). Used by ops dashboard + revert-rate analysis.';
comment on column public.hrv_session_modifiers.reviewed_by is
  '"auto" = engine signed off; "munk" = Munk approved; "co_coach:<member_id>" = co-coach approved. Null = pending review.';

-- ---------------------------------------------------------------------
-- 4) Member opt-in flag. Default off — v0 ships behind an explicit
--    consent flow that fires when warmUpState crosses provisional→active.
-- ---------------------------------------------------------------------
alter table public.hrv_settings
  add column if not exists adaptive_program_enabled boolean not null default false;

comment on column public.hrv_settings.adaptive_program_enabled is
  'Member opt-in for the Adaptive Program Engine. Default off until consent flow runs.';

-- ---------------------------------------------------------------------
-- 5) Exercise variant map — drives the exercise_swap_variant action.
--    Curated by Munk via /coach/exercises. Public-read (members need
--    to see their swapped exercise's metadata via the join); admin
--    write is enforced at the data-layer level since exercises is
--    already coach-write-only.
-- ---------------------------------------------------------------------
create table if not exists public.exercise_variant_map (
  exercise_id          uuid not null references public.exercises(id) on delete cascade,
  lighter_variant_id   uuid not null references public.exercises(id) on delete cascade,
  variant_reason       text not null
    check (variant_reason in ('joint_friendly', 'unilateral', 'low_cns', 'time_efficient')),
  created_at           timestamptz not null default now(),
  primary key (exercise_id, lighter_variant_id),
  check (exercise_id <> lighter_variant_id)
);

create index if not exists idx_exercise_variant_map_exercise
  on public.exercise_variant_map (exercise_id);

alter table public.exercise_variant_map enable row level security;

-- Public read (any authenticated member can see the variant graph).
create policy exercise_variant_map_read
  on public.exercise_variant_map
  for select
  using (auth.role() = 'authenticated');

-- Coach-only write (mirrors 0036_coach_exercise_write.sql pattern).
create policy exercise_variant_map_coach_write
  on public.exercise_variant_map
  for all
  using (
    exists (
      select 1 from public.members
      where members.id = auth.uid() and members.is_coach = true
    )
  )
  with check (
    exists (
      select 1 from public.members
      where members.id = auth.uid() and members.is_coach = true
    )
  );

-- ---------------------------------------------------------------------
-- 6) Outcome view — joins each adaptive_v0 modifier with the actual
--    session result. Powers the ops dashboard (`/coach/system/adaptive`)
--    and the reasoning layer's "how did past adaptations work out"
--    context. Inherits RLS from underlying tables.
-- ---------------------------------------------------------------------
create or replace view public.adaptive_outcomes_v0 as
  select
    hsm.id                 as modifier_id,
    hsm.member_id,
    hsm.session_id,
    hsm.modifier_type,
    hsm.confidence,
    hsm.accepted_by_member,
    hsm.reviewed_by,
    hsm.created_at         as adapted_at,
    s.status               as session_status,
    s.completed_at,
    -- Average RPE delta on top sets (logged − target). Null if no logs.
    (
      select avg(ss.logged_rpe - ss.target_rpe)::numeric(4,2)
      from public.session_sets ss
      join public.session_exercises se on ss.session_exercise_id = se.id
      where se.session_id = hsm.session_id
        and ss.logged_rpe is not null
        and ss.target_rpe is not null
        and ss.position = 1
    )                      as top_set_rpe_delta,
    -- Completion ratio: logged sets / planned sets across the session.
    (
      select case
        when count(*) = 0 then null
        else (count(ss.logged_reps)::numeric / count(*))::numeric(4,3)
      end
      from public.session_sets ss
      join public.session_exercises se on ss.session_exercise_id = se.id
      where se.session_id = hsm.session_id
    )                      as completion_ratio,
    -- Next-day readiness bucket — does the adaptation correlate with
    -- recovery? Null if no reading exists for the day after the session.
    (
      select hr.readiness_bucket
      from public.hrv_readings hr
      where hr.member_id = hsm.member_id
        and hr.measured_at::date = (s.scheduled_for::date + interval '1 day')::date
      order by hr.measured_at desc
      limit 1
    )                      as next_day_readiness
  from public.hrv_session_modifiers hsm
  join public.sessions s on s.id = hsm.session_id
  where hsm.reason = 'adaptive_v0';

comment on view public.adaptive_outcomes_v0 is
  'Joins each adaptive engine modifier with session outcome metrics. Read by ops dashboard and reasoning layer context.';

commit;
