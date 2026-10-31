-- 0069_calorie_floor.sql
--
-- Kaloriegulv (spec 2026-09-27 §S, plan F.3). Den ugentlige justering
-- havde et gulv på 1.400 kcal ved cut, så eksisterende mål kan ligge
-- under det gulv, specen kræver. Indtil B2 kender køn og hvilestofskifte,
-- er gulvet 1.800 kcal for alle (beslutning 4, Tom 2026-10-06).
--
-- Kun profilens mål løftes. Ugens allerede planlagte måltider røres ikke;
-- næste plan bygges fra det løftede mål, og koden løfter også ved læsning
-- (`resolveDailyTargets`).

update public.nutrition_profiles
   set daily_kcal_target = 1800,
       updated_at = now()
 where daily_kcal_target < 1800;
