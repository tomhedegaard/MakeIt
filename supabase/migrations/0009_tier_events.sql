-- =================================================================
-- MakeIt // HQ — tier promotion events (audit + notification trail)
-- =================================================================
-- Whenever a member's tier changes (via the trigger from 0008), we
-- log a row here. The app reads recent unseen events and surfaces a
-- celebratory banner. An optional email is sent server-side.
--
-- Members read their own events; coaches read all (for analytics).

create table if not exists public.tier_events (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  from_tier   text not null,
  to_tier     text not null,
  balance_at  integer not null,
  promoted    boolean not null,           -- true = up; false = down
  seen_at     timestamptz,                -- null until member opens /reps
  emailed_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_tier_events_member on public.tier_events(member_id, created_at desc);
create index if not exists idx_tier_events_unseen on public.tier_events(member_id) where seen_at is null;

alter table public.tier_events enable row level security;

create policy "tier_events: own read"
  on public.tier_events for select
  to authenticated
  using (member_id = auth.uid());

create policy "tier_events: coach read"
  on public.tier_events for select
  to authenticated
  using (public.is_current_user_coach());

create policy "tier_events: own update (mark seen)"
  on public.tier_events for update
  to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- ---------------------------------------------------------------- *
-- Replace the 0008 trigger fn so it ALSO logs an event when tier
-- actually changes. Same effect on members.tier; idempotent on
-- repeat balance writes that don't move the tier.
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
  v_old_tier  text;
  v_new_tier  text;
  v_promoted  boolean;
begin
  v_member_id := coalesce(new.member_id, old.member_id);
  if v_member_id is null then return null; end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.reps_transactions
  where member_id = v_member_id;

  v_new_tier := public.tier_for_balance(v_balance);

  select tier into v_old_tier from public.members where id = v_member_id;

  if v_old_tier is null or v_old_tier = v_new_tier then
    return null;
  end if;

  -- Tier actually changed — write event + update member.
  v_promoted := case
    when v_old_tier = 'Lifter'                               and v_new_tier in ('Athlete','Beast','Legend') then true
    when v_old_tier = 'Athlete'                              and v_new_tier in ('Beast','Legend')           then true
    when v_old_tier = 'Beast'                                and v_new_tier = 'Legend'                      then true
    else false
  end;

  insert into public.tier_events (member_id, from_tier, to_tier, balance_at, promoted)
  values (v_member_id, v_old_tier, v_new_tier, v_balance, v_promoted);

  update public.members set tier = v_new_tier where id = v_member_id;
  return null;
end;
$$;

-- (Trigger from 0008 still wired to this function — no re-create needed.)
