-- 0061_nutrition_hq_estimate.sql
--
-- HQ-estimat i "Spiste noget andet"
-- (docs/superpowers/specs/2026-09-27-food-estimate-and-today-cards.md, del A).
--
-- A member takes a photo or writes the meal; HQ estimates kcal and the
-- three macros with an interval; the member approves (or edits) before
-- anything counts. The approved numbers land on the same off-plan
-- nutrition_logs row the manual flow writes (0039), plus:
--
--   carbs_g / fat_g           the two macros the manual flow never had
--   estimate_source           member | hq_photo | hq_text — lets coaches weigh
--                             a rough guess lower in the weekly signals
--   estimate_confidence       HQ's own high | medium | low
--   estimate_items            the ingredient list as approved (jsonb)
--   estimate_edited           the member changed HQ's numbers
--   estimate_kcal_low/_high   the interval shown on the approve button
--
-- The daily cap (spec A.2: 20 calls) is a new action on the existing
-- member_action_logs rate-limit table.
--
-- Additive only: every new column is nullable or defaulted, so the
-- existing manual flow and all readers keep working before and after.
--
-- Designed for local `npm run db:reset`. Do not apply to live until
-- Tom explicitly accepts `npm run db:push`.

alter table public.nutrition_logs
  add column if not exists carbs_g             integer check (carbs_g between 0 and 1000),
  add column if not exists fat_g               integer check (fat_g between 0 and 500),
  add column if not exists estimate_source     text not null default 'member'
                                                 check (estimate_source in ('member','hq_photo','hq_text')),
  add column if not exists estimate_confidence text check (estimate_confidence in ('high','medium','low')),
  add column if not exists estimate_items      jsonb,
  add column if not exists estimate_edited     boolean not null default false,
  add column if not exists estimate_kcal_low   integer check (estimate_kcal_low between 0 and 10000),
  add column if not exists estimate_kcal_high  integer check (estimate_kcal_high between 0 and 10000);

comment on column public.nutrition_logs.estimate_source is
  'Where the numbers came from: member (typed), hq_photo or hq_text (HQ estimate the member approved).';

-- The 20-per-day cap reuses the rate-limit substrate (0024, 0027):
-- one member_action_logs row per Claude call, action 'meal_estimate'.
alter table public.member_action_logs
  drop constraint if exists member_action_logs_action_check;

alter table public.member_action_logs
  add constraint member_action_logs_action_check
  check (action in (
    'plan_regen',
    'meal_swap',
    'weight_log',
    'pref_update',
    'kcal_adjustment',
    'meal_estimate'
  ));
