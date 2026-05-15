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

-- =================================================================
-- Backfill for the remaining 15 lifts (added 2026-05-15).
-- Same pattern: eccentric → isometric/peak → concentric, with the
-- primary tier rotating across the rep to show recruitment shifts.
-- =================================================================

-- Front Squat: quads dominate throughout — that's the entire point of
-- the front-rack position. Glutes pick up secondary share on the drive.
update public.exercises
   set phases = $$[
     {"name":"Descent","duration_ms":1400,"primary":["quads"],"secondary":["glutes","abs"],"tertiary":["adductors","lower_back"]},
     {"name":"Bund","duration_ms":400,"primary":["quads","glutes"],"secondary":["abs","adductors"],"tertiary":["lower_back","calves_back"]},
     {"name":"Drive","duration_ms":1000,"primary":["quads"],"secondary":["glutes","abs"],"tertiary":["adductors","calves_back"]}
   ]$$::jsonb
 where slug = 'front-squat';

-- Romanian Deadlift: hamstrings dominate the descent (lengthening
-- under load); glutes flip to primary at lockout. Hip-hinge classic.
update public.exercises
   set phases = $$[
     {"name":"Descent","duration_ms":1800,"primary":["hamstrings"],"secondary":["glutes","lower_back"],"tertiary":["lats","forearms"]},
     {"name":"Stretch","duration_ms":400,"primary":["hamstrings","glutes"],"secondary":["lower_back"],"tertiary":["lats","forearms"]},
     {"name":"Drive","duration_ms":900,"primary":["glutes","hamstrings"],"secondary":["lower_back"],"tertiary":["lats","traps","forearms"]}
   ]$$::jsonb
 where slug = 'rdl';

-- Paused Bench: long bottom dwell is the whole point. Max chest
-- stretch in the pause before triceps take over for lockout.
update public.exercises
   set phases = $$[
     {"name":"Descent","duration_ms":1500,"primary":["chest"],"secondary":["front_delts","triceps"],"tertiary":["lats","forearms"]},
     {"name":"Pause","duration_ms":1000,"primary":["chest","front_delts"],"secondary":["triceps"],"tertiary":["lats","abs","forearms"]},
     {"name":"Drive","duration_ms":1100,"primary":["chest","triceps"],"secondary":["front_delts"],"tertiary":["forearms","lats"]}
   ]$$::jsonb
 where slug = 'paused-bench';

-- Push Press: 4 phases because the leg drive is distinct. Dip → drive
-- → press → lockout. Quads + glutes do the early work, then upper
-- body takes over once the bar is moving.
update public.exercises
   set phases = $$[
     {"name":"Dip","duration_ms":500,"primary":["quads"],"secondary":["glutes","abs"],"tertiary":["calves_back","front_delts"]},
     {"name":"Drive","duration_ms":500,"primary":["quads","glutes"],"secondary":["calves_back","front_delts"],"tertiary":["abs","triceps"]},
     {"name":"Press","duration_ms":1000,"primary":["front_delts","triceps"],"secondary":["chest","traps"],"tertiary":["abs","forearms"]},
     {"name":"Lockout","duration_ms":700,"primary":["triceps","traps"],"secondary":["front_delts"],"tertiary":["abs","forearms"]}
   ]$$::jsonb
 where slug = 'push-press';

-- Barbell Row: pull-dominant. Lats + rear delts during the pull, top
-- squeeze engages traps fully, controlled eccentric.
update public.exercises
   set phases = $$[
     {"name":"Pull","duration_ms":1000,"primary":["lats","rear_delts"],"secondary":["biceps","forearms"],"tertiary":["traps","lower_back"]},
     {"name":"Squeeze","duration_ms":400,"primary":["lats","rear_delts","traps"],"secondary":["biceps"],"tertiary":["forearms","lower_back"]},
     {"name":"Return","duration_ms":1100,"primary":["lats"],"secondary":["rear_delts","forearms"],"tertiary":["biceps","lower_back"]}
   ]$$::jsonb
 where slug = 'row';

-- Walking Lunge: classic 3-phase per leg. Quads eat the descent,
-- glutes take over to drive back up.
update public.exercises
   set phases = $$[
     {"name":"Descent","duration_ms":1200,"primary":["quads"],"secondary":["glutes","hamstrings"],"tertiary":["adductors","abs","calves_back"]},
     {"name":"Bottom","duration_ms":300,"primary":["quads","glutes"],"secondary":["adductors","hamstrings"],"tertiary":["abs","calves_back"]},
     {"name":"Drive","duration_ms":1000,"primary":["glutes","quads"],"secondary":["hamstrings","adductors"],"tertiary":["abs","calves_back"]}
   ]$$::jsonb
 where slug = 'lunge';

-- Hanging Knee Raise: abs lift, brief peak hold, controlled lower.
-- Forearms work as grip throughout (lit secondary on lift/lower).
update public.exercises
   set phases = $$[
     {"name":"Lift","duration_ms":800,"primary":["abs"],"secondary":["obliques","forearms"],"tertiary":[]},
     {"name":"Top","duration_ms":400,"primary":["abs","obliques"],"secondary":["forearms"],"tertiary":[]},
     {"name":"Lower","duration_ms":1100,"primary":["abs"],"secondary":["forearms"],"tertiary":["obliques"]}
   ]$$::jsonb
 where slug = 'khr';

-- Hip Thrust: drive → lockout squeeze → controlled eccentric. Glutes
-- carry the whole rep; abs spike at top to prevent hyperextension.
update public.exercises
   set phases = $$[
     {"name":"Drive","duration_ms":900,"primary":["glutes"],"secondary":["hamstrings","quads"],"tertiary":["abs"]},
     {"name":"Lockout","duration_ms":700,"primary":["glutes"],"secondary":["abs","hamstrings"],"tertiary":["quads","lower_back"]},
     {"name":"Descent","duration_ms":1100,"primary":["glutes"],"secondary":["hamstrings"],"tertiary":["quads","abs"]}
   ]$$::jsonb
 where slug = 'hip-thrust';

-- Push-up: chest eats the descent stretch, bottom is max chest
-- tension, drive shifts toward triceps for lockout.
update public.exercises
   set phases = $$[
     {"name":"Descent","duration_ms":1100,"primary":["chest"],"secondary":["front_delts","triceps"],"tertiary":["abs","forearms"]},
     {"name":"Bottom","duration_ms":300,"primary":["chest","front_delts"],"secondary":["triceps"],"tertiary":["abs"]},
     {"name":"Drive","duration_ms":900,"primary":["chest","triceps"],"secondary":["front_delts"],"tertiary":["abs","forearms"]}
   ]$$::jsonb
 where slug = 'push-up';

-- Dip: chest-focus version assumed (forward lean). Chest dominates
-- descent, triceps take over for lockout.
update public.exercises
   set phases = $$[
     {"name":"Descent","duration_ms":1200,"primary":["chest"],"secondary":["front_delts","triceps"],"tertiary":["abs","forearms"]},
     {"name":"Bottom","duration_ms":300,"primary":["chest","triceps"],"secondary":["front_delts"],"tertiary":["abs"]},
     {"name":"Drive","duration_ms":1000,"primary":["chest","triceps"],"secondary":["front_delts"],"tertiary":["forearms","abs"]}
   ]$$::jsonb
 where slug = 'dip';

-- Plank: isometric — two phases show recruitment shift as primary
-- fatigue forces supporting chain to take over. Pedagogical, not
-- mechanical: abs stay primary throughout, but the support tier
-- expands as time-under-tension increases.
update public.exercises
   set phases = $$[
     {"name":"Tidlig hold","duration_ms":1800,"primary":["abs"],"secondary":["obliques"],"tertiary":["lower_back","glutes"]},
     {"name":"Udholdenhed","duration_ms":1800,"primary":["abs"],"secondary":["obliques","lower_back","glutes"],"tertiary":["front_delts"]}
   ]$$::jsonb
 where slug = 'plank';

-- Barbell Curl: biceps drive → peak squeeze → controlled eccentric.
-- Forearms work as grip + secondary mover throughout.
update public.exercises
   set phases = $$[
     {"name":"Drive","duration_ms":700,"primary":["biceps"],"secondary":["forearms"],"tertiary":["front_delts"]},
     {"name":"Squeeze","duration_ms":500,"primary":["biceps"],"secondary":["forearms"],"tertiary":[]},
     {"name":"Eccentric","duration_ms":1100,"primary":["biceps"],"secondary":["forearms"],"tertiary":["front_delts"]}
   ]$$::jsonb
 where slug = 'barbell-curl';

-- Tricep Pushdown: cable lockout pattern. Triceps drive → lockout →
-- controlled return. Lats stabilize the elbows; tertiary share.
update public.exercises
   set phases = $$[
     {"name":"Pres","duration_ms":700,"primary":["triceps"],"secondary":["forearms"],"tertiary":["lats"]},
     {"name":"Lockout","duration_ms":400,"primary":["triceps"],"secondary":["forearms"],"tertiary":["lats"]},
     {"name":"Return","duration_ms":900,"primary":["triceps"],"secondary":["forearms"],"tertiary":["lats"]}
   ]$$::jsonb
 where slug = 'tricep-pushdown';

-- Lateral Raise: short ROM, 3 quick phases. Side delts dominate; traps
-- + rear delts contribute at the top where the lever arm is hardest.
update public.exercises
   set phases = $$[
     {"name":"Drive","duration_ms":700,"primary":["front_delts"],"secondary":["traps"],"tertiary":["forearms"]},
     {"name":"Top","duration_ms":400,"primary":["front_delts","traps"],"secondary":["rear_delts"],"tertiary":["forearms"]},
     {"name":"Eccentric","duration_ms":900,"primary":["front_delts"],"secondary":["traps"],"tertiary":["forearms"]}
   ]$$::jsonb
 where slug = 'lateral-raise';

-- Standing Calf Raise: short, snappy. Gastroc dominates throughout;
-- shin (calves_front) shows tertiary stabilization at top stretch.
update public.exercises
   set phases = $$[
     {"name":"Drive","duration_ms":500,"primary":["calves_back"],"secondary":["calves_front"],"tertiary":["glutes"]},
     {"name":"Top","duration_ms":500,"primary":["calves_back"],"secondary":["calves_front"],"tertiary":["abs"]},
     {"name":"Eccentric","duration_ms":1100,"primary":["calves_back"],"secondary":["calves_front"],"tertiary":["glutes"]}
   ]$$::jsonb
 where slug = 'standing-calf-raise';
