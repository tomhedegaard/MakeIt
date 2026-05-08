-- =================================================================
-- MakeIt // HQ — coach write access on sessions for program editing
-- =================================================================
-- 0004 gave coaches additive SELECT on session_*; this migration
-- gives them additive UPDATE / INSERT / DELETE so the program-editor
-- in /coach/sessions/[id]/edit can persist changes.
--
-- The original "own X" policies stay intact — Postgres OR's the
-- additive policies, so a coach gets write access to ANY member's
-- session, while a regular member still only writes their own.

-- ---------------------------------------------------------------- *
-- sessions
-- ---------------------------------------------------------------- *
create policy "coach update sessions"
  on public.sessions for update
  to authenticated
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());

create policy "coach insert sessions"
  on public.sessions for insert
  to authenticated
  with check (public.is_current_user_coach());

create policy "coach delete sessions"
  on public.sessions for delete
  to authenticated
  using (public.is_current_user_coach());

-- ---------------------------------------------------------------- *
-- session_exercises
-- ---------------------------------------------------------------- *
create policy "coach update session_exercises"
  on public.session_exercises for update
  to authenticated
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());

create policy "coach insert session_exercises"
  on public.session_exercises for insert
  to authenticated
  with check (public.is_current_user_coach());

create policy "coach delete session_exercises"
  on public.session_exercises for delete
  to authenticated
  using (public.is_current_user_coach());

-- ---------------------------------------------------------------- *
-- session_sets
-- ---------------------------------------------------------------- *
create policy "coach update session_sets"
  on public.session_sets for update
  to authenticated
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());

create policy "coach insert session_sets"
  on public.session_sets for insert
  to authenticated
  with check (public.is_current_user_coach());

create policy "coach delete session_sets"
  on public.session_sets for delete
  to authenticated
  using (public.is_current_user_coach());
