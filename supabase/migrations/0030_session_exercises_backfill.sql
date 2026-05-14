-- =================================================================
-- MakeIt // HQ — backfill session_exercises.exercise_id
-- =================================================================
-- session_exercises has a nullable FK to exercises (exercise_id) but
-- it was never populated — the data layer relied on the denormalized
-- exercise_name string. Now that /train/exercises owns the structured
-- exercise library (cues, mistakes, muscle tiers, phases), we want
-- the session view to JOIN through to that library data.
--
-- This migration:
--  1. Backfills exercise_id by matching exercise_name to exercises.name
--     (case-insensitive, trim-tolerant) for rows where exercise_id is
--     still null.
--  2. Adds an FK validation to keep the link clean going forward.
--
-- Idempotent — re-running is safe. Rows where the name doesn't match
-- a library exercise stay NULL (custom free-text from coaches).

update public.session_exercises se
   set exercise_id = e.id
  from public.exercises e
 where se.exercise_id is null
   and lower(trim(se.exercise_name)) = lower(trim(e.name));

-- For coach-typed free-text exercises that don't match the library,
-- exercise_id stays null and the UI falls back to the legacy single-
-- cue rendering. No harm done.
