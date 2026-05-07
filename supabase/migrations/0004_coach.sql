-- =================================================================
-- MakeIt // HQ — coach role + cross-member read access
-- =================================================================
-- Adds an is_coach flag on members, a SECURITY DEFINER helper, and
-- additional RLS policies so coaches can read across the crew without
-- weakening the existing "own X" policies for regular members.

alter table public.members
  add column if not exists is_coach boolean not null default false;

-- Stable helper used in policy USING expressions.
create or replace function public.is_current_user_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_coach from public.members where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_current_user_coach() to authenticated;

-- ---------------------------------------------------------------- *
-- Additive coach SELECT policies. Postgres OR's policies on the
-- same table+role+command, so the existing "own X" policies remain
-- in effect for regular members.
-- ---------------------------------------------------------------- *

create policy "coach read sessions"
  on public.sessions for select
  to authenticated
  using (public.is_current_user_coach());

create policy "coach read session_exercises"
  on public.session_exercises for select
  to authenticated
  using (public.is_current_user_coach());

create policy "coach read session_sets"
  on public.session_sets for select
  to authenticated
  using (public.is_current_user_coach());

create policy "coach read program_assignments"
  on public.program_assignments for select
  to authenticated
  using (public.is_current_user_coach());

create policy "coach read reps_transactions"
  on public.reps_transactions for select
  to authenticated
  using (public.is_current_user_coach());

create policy "coach read form_checks"
  on public.form_checks for select
  to authenticated
  using (public.is_current_user_coach());

-- Coaches can mark form-checks as reviewed.
create policy "coach update form_checks"
  on public.form_checks for update
  to authenticated
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());

-- ---------------------------------------------------------------- *
-- Bootstrap: promote Anton (the head coach) when he signs up.
-- Idempotent — only flips the row if it exists.
-- ---------------------------------------------------------------- *
update public.members
   set is_coach = true
 where handle = 'anton'
    or email  = 'anton@nowmakeit.eu';
