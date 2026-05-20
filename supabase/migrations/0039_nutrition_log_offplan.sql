-- =================================================================
-- MakeIt // HQ — off-plan quick-log columns on nutrition_logs
-- =================================================================
-- Backs the "Spiste noget andet" flow: a member who ate something
-- outside the plan logs it fast with just a calorie + protein
-- estimate. The row keeps status='eaten' so it counts toward the
-- cooking streak (honesty > broken streaks) — the existing streak
-- trigger in 0015 already pays out for any 'eaten' row.
--
--   - off_plan : discriminates a deliberate off-plan log from a
--     planned-meal log. Planned logs have meal_id set; the older
--     "frit måltid" logs have meal_id null but no macros. off_plan
--     is the explicit, queryable marker for the new flow.
--   - kcal / protein_g : member's own estimate. Only populated for
--     off-plan logs; planned logs read macros from nutrition_meals.
--     Ranges are sanity caps, not nutrition science.
--
-- The optional "what did you eat" label reuses the existing notes
-- column — no new column needed.

alter table public.nutrition_logs
  add column if not exists off_plan  boolean not null default false,
  add column if not exists kcal      integer check (kcal between 0 and 10000),
  add column if not exists protein_g integer check (protein_g between 0 and 500);
