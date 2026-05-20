-- =================================================================
-- MakeIt // HQ — program builder: day-blueprint tables + coach write
-- =================================================================
-- The `programs` table (0001) only carried template metadata (code,
-- name, weeks, level). Actual workout structure lived per-member in
-- `sessions`, hand-built. The program builder needs the structure to
-- live ON the template so a coach composes it once and generates a
-- member's whole block on assignment.
--
-- Two new tables:
--   program_days           — a weekly day-blueprint (Dag A, Dag B…)
--   program_day_exercises  — exercises in a day, with the set scheme
--                            stored as jsonb (templates aren't
--                            queried granularly — only iterated at
--                            generation time)
--
-- Plus coach write access on `programs` + `program_assignments` so
-- the builder can create templates and assign them.

-- ---------- program_days ----------
create table if not exists public.program_days (
  id                uuid primary key default gen_random_uuid(),
  program_id        uuid not null references public.programs(id) on delete cascade,
  position          integer not null,
  day_label         text not null,            -- "Dag A"
  title             text not null,            -- "Squat — tung"
  estimated_minutes integer,
  created_at        timestamptz not null default now()
);
create index if not exists idx_program_days_program
  on public.program_days(program_id);

-- ---------- program_day_exercises ----------
-- `sets` jsonb shape: [{ "reps": 5, "weight": 100, "rpe": 8, "rest_sec": 180 }]
create table if not exists public.program_day_exercises (
  id              uuid primary key default gen_random_uuid(),
  program_day_id  uuid not null references public.program_days(id) on delete cascade,
  exercise_id     uuid references public.exercises(id),
  exercise_name   text not null,
  cue             text,
  position        integer not null,
  sets            jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists idx_program_day_exercises_day
  on public.program_day_exercises(program_day_id);

-- ---------- RLS: new tables ----------
alter table public.program_days enable row level security;
alter table public.program_day_exercises enable row level security;

drop policy if exists "program_days readable to authed" on public.program_days;
create policy "program_days readable to authed"
  on public.program_days for select to authenticated using (true);
drop policy if exists "coach manage program_days" on public.program_days;
create policy "coach manage program_days"
  on public.program_days for all to authenticated
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());

drop policy if exists "program_day_exercises readable to authed" on public.program_day_exercises;
create policy "program_day_exercises readable to authed"
  on public.program_day_exercises for select to authenticated using (true);
drop policy if exists "coach manage program_day_exercises" on public.program_day_exercises;
create policy "coach manage program_day_exercises"
  on public.program_day_exercises for all to authenticated
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());

-- ---------- RLS: coach write on programs ----------
-- 0001 only allowed authed SELECT of *published* programs. Coaches
-- need to see their own drafts + create + edit templates.
drop policy if exists "coach read all programs" on public.programs;
create policy "coach read all programs"
  on public.programs for select to authenticated
  using (public.is_current_user_coach());
drop policy if exists "coach insert programs" on public.programs;
create policy "coach insert programs"
  on public.programs for insert to authenticated
  with check (public.is_current_user_coach());
drop policy if exists "coach update programs" on public.programs;
create policy "coach update programs"
  on public.programs for update to authenticated
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());

-- ---------- RLS: coach write on program_assignments ----------
-- 0001 gave members "own" rows; 0004 gave coaches SELECT. Assigning a
-- program to a member needs coach INSERT + UPDATE on any member's row.
drop policy if exists "coach insert program_assignments" on public.program_assignments;
create policy "coach insert program_assignments"
  on public.program_assignments for insert to authenticated
  with check (public.is_current_user_coach());
drop policy if exists "coach update program_assignments" on public.program_assignments;
create policy "coach update program_assignments"
  on public.program_assignments for update to authenticated
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());
