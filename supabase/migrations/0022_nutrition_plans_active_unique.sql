-- =================================================================
-- MakeIt // HQ — nutrition_plans: partial unique on active plans
-- =================================================================
-- Original 0013 declared `unique (member_id, week_start)` as a hard
-- table constraint. The persist flow (in generatePlan / persistAiPlan)
-- ARCHIVES the existing plan for a week before inserting a new one
-- — but the unique constraint doesn't honor archived_at, so the
-- second insert for the same (member_id, week_start) tuple hits a
-- 23505 violation and throws.
--
-- Observed in production: first wizard submit landed an active plan;
-- subsequent regenerate-click archived the existing row but then
-- failed to insert the replacement, leaving the member with zero
-- active plans + one archived plan + no error visible to them.
--
-- Fix: drop the hard constraint, replace with a partial unique
-- index that only applies to rows where archived_at IS NULL. This
-- preserves the "one active plan per week" invariant while letting
-- archived history accumulate without conflict.

alter table public.nutrition_plans
  drop constraint if exists nutrition_plans_member_id_week_start_key;

create unique index if not exists nutrition_plans_active_member_week
  on public.nutrition_plans (member_id, week_start)
  where archived_at is null;
