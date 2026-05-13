-- =================================================================
-- MakeIt // HQ — add kcal_adjustment to member_action_logs enum
-- =================================================================
-- The adaptive-kcal engine runs lazily on first /nutrition visit
-- each ISO week. To prevent re-firing on every page reload (or
-- on a regenerate during the same week), we log each adjustment
-- as a member_action_log row and skip if one already exists for
-- the current week.
--
-- This migration extends the CHECK constraint on member_action_logs
-- .action to include the new value. Postgres allows ALTERing a
-- CHECK only via drop + add.

alter table public.member_action_logs
  drop constraint if exists member_action_logs_action_check;

alter table public.member_action_logs
  add constraint member_action_logs_action_check
  check (action in (
    'plan_regen',
    'meal_swap',
    'weight_log',
    'pref_update',
    'kcal_adjustment'
  ));
