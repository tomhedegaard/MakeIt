-- =================================================================
-- MakeIt // HQ — nutrition_profiles.meal_prep_mode
-- =================================================================
-- When true, the planner deliberately repeats 2-3 meals strategically
-- across the week (e.g. same lunch Mon+Wed, same dinner Tue+Thu) so
-- the member can batch-cook on Sunday and reduce daily decisions +
-- grocery cost. False (default) → varied meals every day.
--
-- Schema-neutral boolean — Claude prompt + UI surface handle the
-- semantic interpretation. Tier upgrade later could introduce
-- 'minimal' | 'moderate' | 'aggressive' enum; the boolean is
-- forward-compatible (TRUE maps to a sensible "moderate" default).

alter table public.nutrition_profiles
  add column if not exists meal_prep_mode boolean not null default false;
