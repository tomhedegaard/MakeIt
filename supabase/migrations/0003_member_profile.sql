-- =================================================================
-- MakeIt // HQ — member profile (onboarding)
-- =================================================================
-- Adds the columns we collect during onboarding so the program
-- generator can produce a personalised week. Nullable until completed.

alter table public.members
  add column if not exists goal_focus       text
    check (goal_focus is null or goal_focus in (
      'strength', 'hypertrophy', 'hybrid',
      'squat_spec', 'bench_spec', 'deadlift_spec'
    )),
  add column if not exists experience_level text
    check (experience_level is null or experience_level in (
      'beginner', 'intermediate', 'advanced'
    )),
  add column if not exists weekly_frequency integer
    check (weekly_frequency is null or weekly_frequency between 2 and 6),
  add column if not exists equipment_level  text
    check (equipment_level is null or equipment_level in (
      'full', 'home_rack', 'minimal'
    )),
  add column if not exists max_squat_kg     numeric(6,2),
  add column if not exists max_bench_kg     numeric(6,2),
  add column if not exists max_deadlift_kg  numeric(6,2),
  add column if not exists max_ohp_kg       numeric(6,2),
  add column if not exists notes_injuries   text,
  add column if not exists onboarded_at     timestamptz;
