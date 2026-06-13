-- =================================================================
-- MakeIt // HQ — øvelses-demo-assets (MoveKit v1-stopgap)
-- =================================================================
-- Sætter demo_asset_url på de 15 produktions-øvelser hvor MoveKit-
-- biblioteket havde et matchende klip (confidence="match" i
-- scripts/movekit-map.json). Assets hostes i public/exercise-demos/
-- (bundlet i deployet → SW-cachebart offline), så URL'en er relativ;
-- resolveDemoAssets() afleder .mp4 + -poster.jpg.
--
-- Proxy-øvelser (rdl, push-press, hip-thrust, standing-calf-raise) og
-- gap'et (front-squat) sættes IKKE her — afventer beslutning. De
-- falder tilbage til PhaseAnimator/AnatomyFigure indtil da.
--
-- Idempotent: UPDATE-by-slug, ingen effekt hvis slug ikke findes.
-- Se docs/EXERCISE_3D_RESEARCH.md §4.

update public.exercises set demo_asset_url = '/exercise-demos/' || slug || '.webm'
where slug in (
  'back-squat', 'deadlift', 'bench', 'paused-bench', 'ohp',
  'pull-up', 'row', 'lunge', 'khr', 'push-up',
  'dip', 'plank', 'barbell-curl', 'tricep-pushdown', 'lateral-raise'
);
