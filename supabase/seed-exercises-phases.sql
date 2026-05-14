-- =================================================================
-- MakeIt // HQ — exercise phases seed
-- =================================================================
-- Run AFTER seed-exercises.sql + migration 0029.
-- Populates exercises.phases for the headline lifts. Other exercises
-- keep phases = [] (UI falls back to the static muscle tiers).
--
-- Phase durations are calibrated for visual rhythm — ~3-4 seconds
-- total per rep, biased toward the eccentric where the work happens.
-- Tune as feedback comes in.

-- Back Squat: descent emphasizes quads (lengthening under load),
-- bottom is brief max stretch, drive flips primary to glutes as the
-- hip extends.
update public.exercises
   set phases = $$[
     {"name":"Descent","duration_ms":1500,"primary":["quads"],"secondary":["glutes","hamstrings"],"tertiary":["adductors","abs","lower_back"]},
     {"name":"Bund","duration_ms":400,"primary":["quads","glutes"],"secondary":["adductors","hamstrings"],"tertiary":["lower_back","abs"]},
     {"name":"Drive","duration_ms":1100,"primary":["glutes","quads"],"secondary":["hamstrings","lower_back"],"tertiary":["abs","adductors","calves_back"]}
   ]$$::jsonb
 where slug = 'back-squat';

-- Conventional Deadlift: setup tension before bar leaves the floor
-- emphasizes lats (keeping bar tight), floor break is hamstring +
-- glute + quad coordination, lockout is glute-dominant.
update public.exercises
   set phases = $$[
     {"name":"Setup","duration_ms":600,"primary":["lats"],"secondary":["hamstrings","traps"],"tertiary":["forearms","abs","glutes"]},
     {"name":"Floor break","duration_ms":1300,"primary":["hamstrings","glutes","quads"],"secondary":["lower_back","lats"],"tertiary":["forearms","traps","abs"]},
     {"name":"Lockout","duration_ms":1000,"primary":["glutes","lower_back"],"secondary":["hamstrings","traps"],"tertiary":["lats","abs","forearms"]}
   ]$$::jsonb
 where slug = 'deadlift';

-- Bench Press: lowering loads the chest stretch, pause/touch is
-- max chest tension, drive transitions to triceps + delts for lockout.
update public.exercises
   set phases = $$[
     {"name":"Descent","duration_ms":1400,"primary":["chest"],"secondary":["front_delts","triceps"],"tertiary":["lats","forearms"]},
     {"name":"Touch","duration_ms":300,"primary":["chest","front_delts"],"secondary":["triceps"],"tertiary":["lats","forearms","abs"]},
     {"name":"Drive","duration_ms":1000,"primary":["chest","triceps"],"secondary":["front_delts"],"tertiary":["forearms","lats"]}
   ]$$::jsonb
 where slug = 'bench';

-- Overhead Press: pressing off the front rack loads delts heavily,
-- the press through the sticking point recruits triceps, lockout
-- shifts to triceps + traps holding the bar overhead.
update public.exercises
   set phases = $$[
     {"name":"Pres start","duration_ms":900,"primary":["front_delts"],"secondary":["triceps","chest"],"tertiary":["abs","traps"]},
     {"name":"Mid-range","duration_ms":900,"primary":["front_delts","triceps"],"secondary":["traps"],"tertiary":["abs","chest","forearms"]},
     {"name":"Lockout","duration_ms":700,"primary":["triceps","traps"],"secondary":["front_delts"],"tertiary":["abs","forearms"]}
   ]$$::jsonb
 where slug = 'ohp';

-- Pull-up: dead hang loads lats stretch, mid-pull is full lat +
-- biceps recruitment, top hold engages rear delts + traps for
-- scapular retraction.
update public.exercises
   set phases = $$[
     {"name":"Hang","duration_ms":600,"primary":["lats"],"secondary":["forearms"],"tertiary":["abs","traps"]},
     {"name":"Træk","duration_ms":1500,"primary":["lats","biceps"],"secondary":["forearms","rear_delts"],"tertiary":["abs","traps"]},
     {"name":"Top","duration_ms":500,"primary":["lats","rear_delts"],"secondary":["biceps","traps"],"tertiary":["forearms","abs"]}
   ]$$::jsonb
 where slug = 'pull-up';
