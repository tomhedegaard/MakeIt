-- =================================================================
-- MakeIt // HQ — HRV V2.5 Reps milestones
-- =================================================================
-- (a) Adds hrv_streak_events.seen_at — read-receipt for the /hrv
--     milestone toast (clears the celebration after one view).
--
-- (b) Installs award_hrv_sync_streak_reps() — an AFTER INSERT
--     trigger on hrv_readings that pays sync-streak Reps as the
--     member crosses 7 / 14 / 30 / 90 distinct UTC dates of synced
--     readings.
--
--     Streak semantics:
--       - distinct (measured_at at time zone 'UTC')::date, all
--         providers, all sources — member-level.
--       - one-time per (member_id, milestone): two-layer
--         idempotency via the unique constraint on
--         hrv_streak_events AND a where-not-exists check on
--         reps_transactions.reference_type. The ledger is the
--         source of truth; the event row is a denormalised
--         convenience for the /hrv UI.
--       - count crosses multiple milestones in one insert? All
--         unpaid milestones are paid in the same trigger
--         invocation.
--       - short-circuit once the 90-day milestone is recorded —
--         no more milestones to pay, skip the COUNT.
--
-- No backfill — members already past a milestone at deploy time
-- are paid at their next sync that crosses the next threshold.
-- See spec §9.2.
--
-- Additive, idempotent — safe to re-run.
-- =================================================================

-- ---------- hrv_streak_events: seen_at ----------
alter table public.hrv_streak_events
  add column if not exists seen_at timestamptz;

comment on column public.hrv_streak_events.seen_at is
  'When the member dismissed the /hrv milestone toast; null until seen. Drives §5.2 of the V2.5 spec.';

-- ---------- trigger function ----------
create or replace function public.award_hrv_sync_streak_reps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_distinct_days integer := 0;
  v_milestone     integer;
  v_payout        integer;
  v_streak_ref    text;
begin
  -- Short-circuit: if the 90-day milestone is already recorded,
  -- there is nothing more to pay. Avoids a COUNT on every sync
  -- past day 90. We probe hrv_streak_events rather than caching a
  -- "max milestone reached" column on members so the milestone
  -- state stays local to one table — fewer cross-table writes,
  -- simpler RLS story.
  if exists (
    select 1 from public.hrv_streak_events
    where member_id = new.member_id and milestone = 90
  ) then
    return new;
  end if;

  -- Distinct UTC dates across ALL of the member's readings,
  -- including NEW. Uses idx_hrv_readings_member_measured.
  select count(distinct (measured_at at time zone 'UTC')::date)
    into v_distinct_days
    from public.hrv_readings
   where member_id = new.member_id;

  -- Pay every unpaid milestone the member has now passed.
  foreach v_milestone in array array[7, 14, 30, 90] loop
    if v_distinct_days >= v_milestone then
      v_payout := case v_milestone
                    when 7  then 50
                    when 14 then 100
                    when 30 then 200
                    when 90 then 500
                  end;
      v_streak_ref := 'hrv_sync_streak_' || v_milestone::text;

      -- Single CTE: gate the ledger insert on whether the event-row
      -- insert actually wrote a row. The unique constraint on
      -- hrv_streak_events(member_id, milestone) is the serialization
      -- point — under concurrent inserts, only one transaction's
      -- ON CONFLICT path returns a row, so only one will pay the
      -- ledger. The downstream WHERE NOT EXISTS on reps_transactions
      -- remains as belt-and-suspenders against backfill or replay
      -- paths that bypass the trigger.
      with inserted_event as (
        insert into public.hrv_streak_events
          (member_id, milestone, reps_awarded)
        values (new.member_id, v_milestone, v_payout)
        on conflict (member_id, milestone) do nothing
        returning 1
      )
      insert into public.reps_transactions
        (member_id, delta, reason, reference_type, reference_id)
      select new.member_id, v_payout,
             'HRV sync-streak: ' || v_milestone::text || ' dage',
             v_streak_ref, new.id
       where exists (select 1 from inserted_event)
         and not exists (
           select 1 from public.reps_transactions
           where member_id      = new.member_id
             and reference_type = v_streak_ref
         );
    end if;
  end loop;

  return new;
end;
$$;

-- ---------- trigger ----------
drop trigger if exists hrv_readings_streak_reps on public.hrv_readings;
create trigger hrv_readings_streak_reps
  after insert on public.hrv_readings
  for each row execute function public.award_hrv_sync_streak_reps();

-- ---------- read-side RPC: distinct-day count ----------
-- PostgREST cannot express count(distinct expr) in a select.
-- This RPC mirrors the trigger's COUNT — single source of truth
-- for "how many distinct UTC dates has this member synced".
-- security invoker (the default) — the caller's RLS applies and
-- only own-row hrv_readings are visible. No security definer
-- needed because the function only reads.
create or replace function public.get_hrv_distinct_day_count(p_member_id uuid)
returns integer
language sql
stable
parallel safe
as $$
  select count(distinct (measured_at at time zone 'UTC')::date)::integer
    from public.hrv_readings
   where member_id = p_member_id;
$$;

grant execute on function public.get_hrv_distinct_day_count(uuid)
  to authenticated;
