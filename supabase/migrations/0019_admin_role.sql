-- =================================================================
-- MakeIt // HQ — admin role (superset of coach)
-- =================================================================
-- Adds an is_admin flag on members. Admins inherit all coach
-- permissions (the convention is `is_admin = true` ⇒ `is_coach =
-- true` — enforced at the promotion-SQL level, not as a CHECK
-- constraint, so a coach can be demoted from admin without
-- cascading flags).
--
-- The is_admin flag exists so coach-console pages that surface
-- credentials, integration status, or other sensitive operational
-- data (e.g. /coach/system) can be gated to the founder + trusted
-- core team without locking out coaches who only need form-check
-- review and member workflows.

alter table public.members
  add column if not exists is_admin boolean not null default false;

-- Stable helper — mirrors is_current_user_coach() (added in 0004).
-- Used in any future policy USING expressions that need admin-only
-- read/write access. Currently no policies reference it — the
-- /coach/system page reads via service-role or the existing coach
-- policies and gates UI access at the layout/page level — but
-- having the helper available keeps the pattern consistent.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.members where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_current_user_admin() to authenticated;

-- ---------------------------------------------------------------- *
-- Bootstrap: promote Mikael Munk to admin when he signs up.
-- Idempotent. Sets is_coach = true at the same time so a freshly-
-- onboarded admin doesn't fall out of the /coach layout.
-- ---------------------------------------------------------------- *
update public.members
   set is_admin = true,
       is_coach = true
 where lower(handle) = 'munk'
    or email  = 'munk@nowmakeit.eu';
