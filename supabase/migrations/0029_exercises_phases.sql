-- =================================================================
-- MakeIt // HQ — exercises.phases
-- =================================================================
-- Per-exercise list of movement phases (eccentric / isometric /
-- concentric) used by the front-end to animate the AnatomyFigure
-- through a rep cycle. Each phase carries its own primary /
-- secondary / tertiary muscle arrays so the highlight shifts as the
-- rep progresses — e.g. squat descent emphasizes quads, drive
-- emphasizes glutes.
--
-- Shape:
--   [
--     {
--       "name": "Descent",
--       "duration_ms": 1500,
--       "primary": ["quads"],
--       "secondary": ["glutes", "hamstrings"],
--       "tertiary": ["adductors", "abs"]
--     },
--     ...
--   ]
--
-- Empty array (default) → UI falls back to static primary_muscles /
-- secondary_muscles / tertiary_muscles. Adoption is gradual.

alter table public.exercises
  add column if not exists phases jsonb not null default '[]'::jsonb;
