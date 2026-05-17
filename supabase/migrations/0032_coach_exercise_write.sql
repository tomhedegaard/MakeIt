-- =================================================================
-- MakeIt // HQ — coach write access on the exercises library
-- =================================================================
-- 0001 made exercises readable to every authed user (using(true)) but
-- left writes to the service role only — the library was seeded via
-- SQL. The coach exercise editor (/coach/exercises) needs coaches to
-- create + edit exercises through the UI.
--
-- INSERT + UPDATE only. No DELETE policy: exercises are referenced by
-- session_exercises and program_day_exercises; coaches retire an
-- exercise by toggling is_published off, never by deleting it.
--
-- Reads already work — the existing "readable to authed" policy is
-- using(true), so coaches can see unpublished drafts without a new
-- policy.

create policy "coach insert exercises"
  on public.exercises for insert
  to authenticated
  with check (public.is_current_user_coach());

create policy "coach update exercises"
  on public.exercises for update
  to authenticated
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());
