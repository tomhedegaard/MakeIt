-- =================================================================
-- MakeIt // HQ — automatic tier promotion based on Reps balance
-- =================================================================
-- A member's tier (Lifter / Athlete / Beast / Legend) is now derived
-- from their Reps balance via a trigger that fires on every
-- reps_transactions insert/delete. The tier column on public.members
-- becomes the source of truth for display, but it's recomputed every
-- time the balance changes — so it can't drift.
--
-- Thresholds (matches /reps page):
--   0–999       → Lifter
--   1.000–4.999 → Athlete
--   5.000–14.999 → Beast
--   15.000+     → Legend

-- ---------------------------------------------------------------- *
-- Pure function: balance → tier name
-- ---------------------------------------------------------------- *
create or replace function public.tier_for_balance(balance integer)
returns text
language sql
immutable
as $$
  select case
    when balance >= 15000 then 'Legend'
    when balance >= 5000  then 'Beast'
    when balance >= 1000  then 'Athlete'
    else 'Lifter'
  end;
$$;

grant execute on function public.tier_for_balance(integer) to authenticated;

-- ---------------------------------------------------------------- *
-- Trigger function — recompute the affected member's tier
-- ---------------------------------------------------------------- *
create or replace function public.bump_tier_after_reps_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_balance   integer;
  v_new_tier  text;
begin
  -- INSERT → use NEW; DELETE → use OLD; (no UPDATE handled — ledger
  -- rows are append-only by convention).
  v_member_id := coalesce(new.member_id, old.member_id);
  if v_member_id is null then
    return null;
  end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.reps_transactions
  where member_id = v_member_id;

  v_new_tier := public.tier_for_balance(v_balance);

  update public.members
     set tier = v_new_tier
   where id = v_member_id
     and tier is distinct from v_new_tier;

  return null; -- AFTER row trigger — return value ignored
end;
$$;

-- ---------------------------------------------------------------- *
-- Wire the trigger to reps_transactions
-- ---------------------------------------------------------------- *
drop trigger if exists reps_tier_promotion on public.reps_transactions;
create trigger reps_tier_promotion
  after insert or delete on public.reps_transactions
  for each row execute function public.bump_tier_after_reps_change();

-- ---------------------------------------------------------------- *
-- Backfill — bring every existing member's tier in line with their
-- current balance. Idempotent: WHERE filters to only rows that need
-- to change.
-- ---------------------------------------------------------------- *
update public.members m
   set tier = public.tier_for_balance(
     coalesce(
       (select sum(delta) from public.reps_transactions where member_id = m.id),
       0
     )
   )
 where tier is distinct from public.tier_for_balance(
   coalesce(
     (select sum(delta) from public.reps_transactions where member_id = m.id),
     0
   )
 );
