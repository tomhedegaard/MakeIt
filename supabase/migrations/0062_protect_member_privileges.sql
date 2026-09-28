-- 0062_protect_member_privileges.sql
--
-- Security fix. 0001's policy "members can update own" lets an
-- authenticated member UPDATE every column on their own row. Nothing
-- stopped a client from setting its own is_coach / is_admin (coach
-- policies then open every member's HRV, form-checks and plans),
-- tier / coach_tier (Coach School access), or stripe_customer_id —
-- and because members is readable to all authed users, another
-- member's customer id can be read and planted to open their Stripe
-- billing portal.
--
-- Same shape as 0059's invite_consumed_at guard: a BEFORE UPDATE
-- trigger that rejects changes to privileged columns unless the
-- statement runs as a server role. Legitimate writers are unaffected:
--   - tier: bump_tier_after_reps_change() is SECURITY DEFINER (postgres)
--   - coach_tier: coach-school actions use the service-role client
--   - stripe_customer_id: billing now writes with the service-role client
--   - is_coach / is_admin: set by Tom in SQL (0019)
--
-- Designed for local `npm run db:reset`. Do not apply to live until
-- Tom explicitly accepts `npm run db:push`.

create or replace function public.protect_member_privileges()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.id                 is distinct from old.id
     or new.is_coach           is distinct from old.is_coach
     or new.is_admin           is distinct from old.is_admin
     or new.coach_tier         is distinct from old.coach_tier
     or new.tier               is distinct from old.tier
     or new.stripe_customer_id is distinct from old.stripe_customer_id
  then
    raise exception 'members privilege columns are not client-writable';
  end if;
  return new;
end;
$$;

drop trigger if exists members_protect_privileges on public.members;
create trigger members_protect_privileges
  before update on public.members
  for each row execute function public.protect_member_privileges();

comment on function public.protect_member_privileges() is
  'Rejects client (authenticated) changes to id, is_coach, is_admin, coach_tier, tier and stripe_customer_id on members. Server roles pass.';
