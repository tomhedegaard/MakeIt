-- =================================================================
-- MakeIt // HQ — wiring for MoveKit-batch 2026-10
-- =================================================================
-- 1. demo_asset_url for de 369 øvelser fra 0066. Videoerne ligger i
--    Storage-bucket'en 'exercise-demos' (upload:
--    scripts/upload-demos-to-storage.mjs). Blokken er skrevet af
--    scripts/gen-demo-urls.mjs ud fra scripts/movekit-manifest.json.
-- 2. front-squat får sit bundlede loop (public/exercise-demos/).
-- 3. Eksisterende øvelser flyttes til de nye kategorier Power og
--    Mobilitet, så samme slags øvelse ikke ligger to steder.
--
-- Kør EFTER upload, EFTER 0066 og EFTER deploy af koden: front-squat-
-- filen og labels for de nye kategorier findes først i det deploy.
-- Idempotent: UPDATE-by-slug med guards, ingen skemaændring.

-- BEGIN demo-urls 2026-10
update public.exercises
set demo_asset_url = 'https://wtxhsbrtzoukkhhtsqnu.supabase.co/storage/v1/object/public/exercise-demos/' || slug || '.webm'
where demo_asset_url is null
  and slug in (
    '90-90-hip-switches', 'adductor-groin-stretch', 'alternating-hammer-curl', 'arc-trainer',
    'archer-push-up', 'arm-circles-front-back', 'arnold-press', 'assault-bike',
    'assisted-pistol-squat', 'b-stance-hip-thrust', 'back-extension', 'backpack-curls',
    'backpack-row', 'backstroke-swim', 'band-assisted-pull-up', 'band-external-rotation',
    'band-glute-bridge', 'band-good-morning', 'band-leg-curl', 'band-overhead-press',
    'band-pull-through', 'band-shoulder-dislocates', 'band-squat', 'band-straight-arm-pulldown',
    'band-tricep-kickbacks', 'banded-ankle-dorsiflexion-mobilization', 'banded-clamshell', 'banded-eccentric-tibialis-raise',
    'barbell-bent-over-row-overhand', 'barbell-clean-and-jerk', 'barbell-floor-press', 'barbell-glute-bridge',
    'barbell-hack-squat', 'barbell-landmine-row', 'barbell-lunge', 'barbell-rear-delt-row',
    'barbell-reverse-lunge', 'barbell-skullcrusher', 'barbell-stiff-leg-deadlifts', 'barbell-walking-lunge',
    'battle-ropes', 'bayesian-curl', 'behind-the-neck-press', 'belt-squat',
    'bent-knee-soleus-raise', 'bicycle-crunches', 'bird-dog', 'bodyweight-deficit-reverse-lunge',
    'bodyweight-squat-to-stand', 'bounds', 'bradford-press', 'breaststroke-swim',
    'broad-jump', 'broomstick-pass-throughs', 'butterfly-swim', 'cable-bar-pushdown',
    'cable-chop', 'cable-external-rotation', 'cable-front-raise', 'cable-high-to-low-fly',
    'cable-hip-abduction', 'cable-kickback', 'cable-low-single-arm-lateral-raise', 'cable-low-to-high-fly',
    'cable-overhead-straight-bar-extensions', 'cable-pallof-press', 'cable-pull-through', 'cable-rope-hammer-curl',
    'cable-rope-overhead-tricep-extension', 'cable-rope-pullover', 'cable-single-arm-rear-delt-row', 'cable-single-leg-laying-leg-curl',
    'cable-tricep-kickback', 'cable-wrist-curl', 'captains-chair-knee-raise', 'chest-supported-dumbbell-row',
    'chest-supported-t-bar-row', 'close-grip-barbell-curl', 'close-grip-incline-push-up', 'controlled-forearm-pronation-supination',
    'copenhagen-plank', 'cossack-squat', 'cross-body-cable-tricep-extension', 'cross-body-hammer-curl',
    'crunches', 'cuban-press', 'cycling-cooldown', 'cycling-intervals',
    'cycling-sprint', 'cycling-warmup', 'dead-bug', 'dead-bug-weighted',
    'dead-hang', 'decline-barbell-bench-press', 'decline-crunch', 'decline-machine-chest-press',
    'decline-sit-up', 'deficit-barbell-romanian-deadlift', 'deficit-deadlift', 'deficit-dumbbell-romanian-deadlift',
    'double-kettlebell-clean-and-press', 'dumbbell-back-extension', 'dumbbell-close-grip-push-up', 'dumbbell-cossack-squat',
    'dumbbell-deadlift', 'dumbbell-decline-crunch-behind-head', 'dumbbell-farmer-carry', 'dumbbell-front-squat',
    'dumbbell-front-squat-tempo', 'dumbbell-halo', 'dumbbell-hammer-preacher-curl', 'dumbbell-incline-row',
    'dumbbell-lateral-lunge', 'dumbbell-lying-single-arm-rear-lateral-raise', 'dumbbell-neutral-grip-bent-over-row', 'dumbbell-neutral-high-incline-bench-press',
    'dumbbell-overhead-squat', 'dumbbell-pullover', 'dumbbell-push-press', 'dumbbell-reverse-lunge',
    'dumbbell-seated-full-lateral-raise', 'dumbbell-seated-lateral-raises', 'dumbbell-side-plank', 'dumbbell-single-arm-incline-bench-preacher-curl',
    'dumbbell-single-arm-neutral-overhead-press', 'dumbbell-single-arm-upright-row', 'dumbbell-single-leg-hip-thrust', 'dumbbell-squat',
    'dumbbell-step-up-low', 'dumbbell-stiff-leg-deadlift', 'dumbbell-suitcase-carry', 'dumbbell-tibialis-raise',
    'dumbbell-turkish-get-up', 'dumbbell-walking-lunges', 'dumbbell-windmill', 'eccentric-calf-lowers',
    'elliptical', 'ez-bar-skullcrusher', 'fire-hydrants', 'floor-press',
    'freestyle-swim', 'frog-pump', 'frog-rock-backs', 'front-foot-elevated-split-squat',
    'front-plank', 'front-raise-and-pullover', 'glute-bridge', 'glute-kickback-machine',
    'goblet-squat-prying-hold', 'half-kneeling-hip-flexor-rock', 'hammer-strength-high-row', 'hammer-strength-iso-lateral-row',
    'hamstring-curl', 'hang-clean', 'hang-power-clean', 'hang-snatch',
    'heel-and-toe-walks', 'heel-elevated-dumbbell-front-squat', 'hiking', 'hill-climb-repeats',
    'hip-circles', 'hip-hinge-drill', 'hip-hinge-speed-romanian-deadlift', 'horizontal-leg-press-calf-press',
    'incline-dumbbell-fly-with-twist', 'incline-machine-chest-press', 'incline-push-up-depth-jump', 'incline-treadmill-walk',
    'indoor-cycling-spin', 'jm-press', 'jump-rope', 'jumping-jack',
    'kettlebell-calf-raise', 'kettlebell-goblet-squat', 'kettlebell-halo', 'kettlebell-hip-thrust',
    'kettlebell-renegade-rows', 'kettlebell-suitcase-carry', 'kettlebell-turkish-get-up', 'kettlebell-walking-lunges',
    'kickstand-dumbbell-romanian-deadlift', 'kneeling-cable-crunch', 'landmine-press', 'lat-pulldown',
    'lateral-raise-to-front-raise', 'leaning-cable-lateral-raise', 'leaning-single-arm-dumbbell-lateral-raise', 'leg-swings-front-to-back',
    'lever-lateral-wide-pulldown', 'loaded-wrist-extensor-eccentric', 'loaded-wrist-flexor-eccentric', 'long-run',
    'lunge-sprint', 'lying-cambered-barbell-row', 'lying-leg-curl', 'lying-single-arm-lateral-raise',
    'machine-assisted-pull-up', 'machine-back-extension', 'machine-goblet-sissy-squat', 'machine-hack-squat',
    'machine-hip-abduction', 'machine-hip-adduction', 'machine-hip-thrust', 'machine-horizontal-leg-press',
    'machine-lat-pullover', 'machine-lateral-raise', 'machine-preacher-curl', 'machine-tricep-extension',
    'man-maker', 'meadows-row', 'medicine-ball-throw', 'muscle-up',
    'neck-curl', 'neck-extension', 'neutral-grip-dumbbell-bench-press', 'neutral-grip-lat-pulldown',
    'neutral-grip-pull-up', 'nordic-hamstring-curl', 'open-book-rotation', 'pallof-press',
    'pause-squat', 'pendlay-row', 'pendulum-squat-v-squat', 'pike-push-up',
    'pistol-squat', 'plate-front-raise', 'plate-pinch', 'plyometric-kettlebell-push-up',
    'pogo-hops', 'power-clean', 'press-sit-up', 'prone-lateral-raises',
    'prone-y-t-raises', 'prying-goblet-squat', 'push-jerk', 'quadruped-thoracic-rotation',
    'reverse-crunch', 'reverse-grip-barbell-bench-press', 'reverse-grip-barbell-curl', 'reverse-grip-incline-push-up',
    'reverse-grip-tricep-pushdown', 'reverse-hack-squat', 'reverse-hyperextension', 'reverse-pec-deck',
    'rkc-plank', 'romanian-deadlift-hamstring-sweeps', 'rowing-intervals', 'rowing-machine-steady-state',
    'rowing-sprint', 'running-cooldown', 'running-intervals', 'scapular-pull-up',
    'seal-row', 'seated-ankle-circles', 'seated-barbell-military-press', 'seated-calf-raise',
    'seated-chin-tuck-neck-retraction', 'seated-dumbbell-curl', 'seated-lateral-neck-flexion-hold', 'seated-leg-curl',
    'seated-pelvic-tilt-anterior-posterior', 'seated-shoulder-rolls-scapular-retraction', 'seated-thoracic-extension-chest-opener', 'seated-wrist-flexor-stretch',
    'selectorized-overhead-press-machine', 'selectorized-torso-rotation-machine', 'shadow-boxing', 'side-plank-lateral-raise',
    'single-arm-cable-fly', 'single-arm-dumbbell-bench-press', 'single-arm-dumbbell-overhead-press', 'single-arm-incline-lateral-raise',
    'single-arm-kettlebell-military-press-to-side', 'single-arm-landmine-press', 'single-arm-landmine-row', 'single-arm-lat-pulldown',
    'single-arm-overhead-cable-extension', 'single-arm-tricep-extension', 'single-leg-back-extension', 'single-leg-balance',
    'single-leg-balance-reach', 'single-leg-barbell-squat', 'single-leg-bound', 'single-leg-dumbbell-romanian-deadlift',
    'single-leg-glute-bridge', 'single-leg-hip-thrust', 'single-leg-hop', 'single-leg-kettlebell-romanian-deadlift-deficit',
    'single-leg-press', 'single-leg-standing-calf-raise', 'single-leg-step-down', 'sissy-squat',
    'sit-up', 'skater-bound', 'ski-erg', 'sled-pull',
    'sled-push', 'slider-leg-curl', 'smith-machine-bench-press', 'smith-machine-bent-over-row',
    'smith-machine-calf-raise', 'smith-machine-decline-bench-press', 'smith-machine-front-squat', 'smith-machine-overhead-press',
    'smith-machine-seated-overhead-press', 'smith-machine-squat', 'snap-down-landing', 'snatch-grip-deadlift',
    'snatch-grip-high-pull', 'snatch-pull', 'spider-curl', 'spiderman-stretch',
    'split-jerk', 'split-squat-isometric-hold', 'squat-thrusts', 'stability-ball-leg-curl',
    'stair-climber', 'standing-alternating-dumbbell-overhead-press', 'standing-cable-hip-abduction', 'standing-dumbbell-overhead-press',
    'standing-neutral-grip-dumbbell-overhead-press', 'standing-wall-shoulder-opening-stretch', 'steady-state-ride', 'step-down-to-balance',
    'straight-arm-lat-pulldown', 'straight-arm-rope-pulldown-light', 'straight-bar-bench-mid-row', 'swim-kick-drill',
    'swim-pull-drill', 'swim-sprint-intervals', 'tate-press', 'tempo-run',
    'thoracic-extension-over-foam-roller', 'tibialis-raise', 'toes-to-bar', 'towel-doorframe-row',
    'towel-isometric-curls', 'towel-slide-leg-curl', 'trail-run', 'trap-bar-carry',
    'trap-bar-deadlift', 'trap-bar-shrug', 'treadmill-run', 'trx-row',
    'trx-squat', 'tuck-jump', 'turkish-get-up', 'two-arm-kettlebell-military-press',
    'underhand-barbell-row', 'v-up', 'versaclimber', 'walking-knee-hugs',
    'walking-lunge-with-twist', 'wall-ball', 'weighted-parallel-bar-straight-leg-raise', 'weighted-pull-ups',
    'wide-grip-barbell-bench-press', 'wide-grip-barbell-curl', 'wide-grip-lat-pulldown', 'wide-grip-pull-up',
    'wide-grip-seated-cable-row', 'wide-incline-push-up', 'wide-push-up', 'worlds-greatest-stretch',
    'wrist-roller', 'yates-row', 'z-press', 'zercher-squat',
    'zottman-curl'
  );
-- END demo-urls 2026-10

-- front-squat: klippet fandtes ikke i den første MoveKit-pakke.
-- En coach-upload (Storage-URL) overskrives ikke.
update public.exercises
set demo_asset_url = '/exercise-demos/front-squat.webm'
where slug = 'front-squat'
  and (demo_asset_url is null or demo_asset_url like '/exercise-demos/%');

-- Olympiske løft og plyometri → Power. Kun rækker der stadig har den
-- oprindelige kategori, så en coach-rettelse ikke overskrives.
update public.exercises
set category = 'power', pattern = 'olympic'
where slug in (
    'barbell-snatch', 'barbell-power-snatch', 'barbell-muscle-snatch',
    'barbell-clean-and-press', 'dumbbell-single-arm-clean-and-press'
  )
  and category = 'full-body';

update public.exercises
set category = 'power', pattern = 'jump'
where slug = 'box-jump'
  and category = 'full-body';

update public.exercises
set category = 'power', pattern = 'jump'
where slug = 'jump-squats'
  and category = 'lower-body';

-- Mavestræk → Mobilitet.
update public.exercises
set category = 'mobility', pattern = 'mobility'
where slug in (
    'abdominals-stretch-variation-one', 'abdominals-stretch-variation-two',
    'abdominals-stretch-variation-three', 'abdominals-stretch-variation-four'
  )
  and category = 'core';
