-- =================================================================
-- MakeIt // HQ — demo_asset_url for de 188 udvidelses-øvelser
-- =================================================================
-- Videoerne hostes i Supabase Storage-bucket'en 'exercise-demos'
-- (public, migration 0033) i stedet for public/ — ~57 MB holdes ude
-- af repoet. Upload: scripts/upload-demos-to-storage.mjs.
-- resolveDemoAssets() afleder .mp4 + -poster.jpg fra .webm-URL'en.
--
-- Kør EFTER upload + efter 0052 (øvelserne skal eksistere).
-- Idempotent: UPDATE-by-slug.

update public.exercises
set demo_asset_url = 'https://wtxhsbrtzoukkhhtsqnu.supabase.co/storage/v1/object/public/exercise-demos/' || slug || '.webm'
where slug in (
  'abdominals-stretch-variation-four', 'abdominals-stretch-variation-one', 'abdominals-stretch-variation-three', 'abdominals-stretch-variation-two',
  'band-curl', 'band-high-face-pull', 'band-hip-abduction', 'band-kneeling-pulldown',
  'band-lateral-raise', 'band-pullover', 'band-romanian-deadlift', 'band-row',
  'band-seated-pulldown', 'band-shrug', 'band-single-arm-lateral-raise', 'band-wood-chopper',
  'barbell-banded-back-squat', 'barbell-behind-the-back-30-degree-shrug', 'barbell-clean-and-press', 'barbell-close-grip-bench-press',
  'barbell-drag-curl', 'barbell-front-rack-step-up-knee-drive', 'barbell-high-incline-bench-press', 'barbell-incline-bench-press',
  'barbell-muscle-snatch', 'barbell-power-snatch', 'barbell-pullover', 'barbell-rack-pull',
  'barbell-shrug', 'barbell-snatch', 'barbell-spinal-jefferson-curl', 'barbell-split-squat',
  'barbell-step-up-knee-drive', 'barbell-thruster', 'barbell-upright-row', 'barbell-wrist-curl',
  'bench-dips', 'bodyweight-alternating-lateral-lunge', 'bodyweight-alternating-reverse-lunges', 'bodyweight-box-squat',
  'bodyweight-deadlift', 'bodyweight-donkey-calf-raise', 'bodyweight-elevated-push-up', 'bodyweight-hip-abduction',
  'bodyweight-knee-push-ups', 'bodyweight-reverse-lunge', 'bodyweight-russian-twist', 'bodyweight-spinal-jefferson-curl',
  'bodyweight-squat', 'box-jump', 'bulgarian-split-squat', 'burpee',
  'cable-30-degree-shrug', 'cable-bar-curl', 'cable-bar-face-pull', 'cable-bench-chest-fly',
  'cable-bench-press', 'cable-bench-straight-leg-kickback', 'cable-chest-press', 'cable-decline-bench-press',
  'cable-incline-bench-press', 'cable-overhead-press', 'cable-pec-fly', 'cable-rope-kneeling-face-pull',
  'cable-rope-pushdown', 'cable-row-bar-standing-row', 'cable-seated-rope-face-pull', 'cable-side-bend',
  'cable-single-arm-neutral-grip-row', 'cable-single-arm-rope-pushdown', 'cable-single-arm-underhand-grip-row', 'cable-standing-low-to-high-wood-chopper',
  'cable-standing-single-arm-chest-press', 'cable-supinating-row', 'cable-wood-chopper', 'chin-ups',
  'decline-push-up', 'diamond-push-ups', 'dumbbell-alternating-forward-lunge', 'dumbbell-bench-press',
  'dumbbell-bulgarian-split-squat', 'dumbbell-chest-fly', 'dumbbell-concentration-curl', 'dumbbell-cross-body-romanian-deadlift',
  'dumbbell-curl', 'dumbbell-decline-bench-press', 'dumbbell-decline-chest-fly', 'dumbbell-decline-skullcrusher',
  'dumbbell-feet-elevated-glute-bridge', 'dumbbell-figure-four-heels-elevated-hip-thrust', 'dumbbell-front-raise', 'dumbbell-goblet-alternating-curtsy-lunge',
  'dumbbell-goblet-bulgarian-split-squat', 'dumbbell-goblet-forward-lunge', 'dumbbell-goblet-reverse-lunge', 'dumbbell-goblet-split-squat',
  'dumbbell-goblet-squat', 'dumbbell-hammer-curl', 'dumbbell-heels-elevated-hip-thrust', 'dumbbell-incline-bench-press',
  'dumbbell-incline-chest-fly', 'dumbbell-incline-curl', 'dumbbell-incline-front-raise', 'dumbbell-incline-hammer-curl',
  'dumbbell-laying-reverse-fly', 'dumbbell-leg-curl', 'dumbbell-preacher-curl', 'dumbbell-rear-delt-fly',
  'dumbbell-row-bilateral', 'dumbbell-row-unilateral', 'dumbbell-russian-twist', 'dumbbell-seated-overhead-press',
  'dumbbell-seated-overhead-tricep-extension', 'dumbbell-seated-rear-delt-fly', 'dumbbell-seated-shrug', 'dumbbell-shrug',
  'dumbbell-side-bend', 'dumbbell-single-arm-chest-press', 'dumbbell-single-arm-clean-and-press', 'dumbbell-single-arm-row',
  'dumbbell-single-leg-calf-raise', 'dumbbell-situp', 'dumbbell-skullcrusher', 'dumbbell-spinal-jefferson-curl',
  'dumbbell-standing-single-arm-curl', 'dumbbell-standing-single-arm-hammer-curl', 'dumbbell-sumo-squat', 'dumbbell-superman',
  'dumbbell-thruster', 'dumbbell-tricep-kickback', 'dumbbell-upright-row', 'dumbbell-wrist-curl',
  'dumbbell-wrist-extension', 'elbow-side-plank', 'ez-bar-preacher-curl', 'ez-bar-reverse-preacher-curl',
  'forward-lunge', 'good-mornings', 'incline-push-up', 'inverted-row',
  'jump-squats', 'kettlebell-alternating-curtsy-lunge', 'kettlebell-assisted-bulgarian-split-squat', 'kettlebell-bench-press',
  'kettlebell-curl', 'kettlebell-farmers-carry', 'kettlebell-front-raise', 'kettlebell-goblet-curl',
  'kettlebell-gorilla-row', 'kettlebell-incline-bench-press', 'kettlebell-romanian-deadlift', 'kettlebell-row',
  'kettlebell-row-single', 'kettlebell-seated-overhead-press', 'kettlebell-shrug', 'kettlebell-single-arm-row',
  'kettlebell-spinal-jefferson-curl', 'kettlebell-sumo-deadlift', 'kettlebell-swing', 'kettlebell-thruster',
  'kettlebell-windmill', 'landmine-t-bar-rows', 'machine-45-degree-back-extension', 'machine-cable-v-bar-push-downs',
  'machine-chest-press', 'machine-crunch', 'machine-dips', 'machine-face-pulls',
  'machine-front-military-press', 'machine-leg-extension', 'machine-leg-press', 'machine-neutral-row',
  'machine-pec-fly', 'machine-plate-loaded-leg-extension', 'machine-plate-loaded-t-bar-row', 'machine-pulldown',
  'machine-seated-cable-row', 'machine-underhand-row', 'mountain-climber', 'narrow-pulldown',
  'plate-forward-lunge', 'single-legged-romanian-deadlifts', 'smith-machine-close-grip-bench-press', 'smith-machine-incline-bench-press',
  'smith-machine-standing-shrugs', 'smith-machine-sumo-romanian-deadlift', 'supermans', 'wall-sit'
);
