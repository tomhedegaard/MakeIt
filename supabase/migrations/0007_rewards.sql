-- =================================================================
-- MakeIt // HQ — Reps reward shop
-- =================================================================
-- Catalog of redeemable rewards + a transactional ledger of
-- redemptions. The redeem_reward() RPC is SECURITY DEFINER so a
-- single call atomically: validates balance, validates stock, locks
-- the reward row, decrements stock, writes a negative reps_transaction,
-- and inserts a redemption row. RLS on reward_redemptions stays strict
-- (members read own; coaches read all + can update fulfillment).

-- ---------------------------------------------------------------- *
-- Catalog
-- ---------------------------------------------------------------- *
create table if not exists public.rewards (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  description     text,
  cost_reps       integer not null check (cost_reps > 0),
  kind            text not null check (kind in ('drop','experience','digital','physical')),
  stock           integer,                    -- null = unlimited
  drop_at         timestamptz,                -- "available from"; null = always available
  image_url       text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists idx_rewards_active on public.rewards(is_active);
create index if not exists idx_rewards_kind   on public.rewards(kind);

-- ---------------------------------------------------------------- *
-- Redemption ledger
-- ---------------------------------------------------------------- *
create table if not exists public.reward_redemptions (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references public.members(id) on delete cascade,
  reward_id             uuid not null references public.rewards(id),
  cost_reps             integer not null,
  reward_name_snapshot  text not null,         -- frozen at redemption time
  status                text not null default 'pending'
    check (status in ('pending','approved','shipped','fulfilled','cancelled')),
  fulfillment_notes     text,
  redeemed_at           timestamptz not null default now(),
  fulfilled_at          timestamptz,
  fulfilled_by          uuid references public.members(id)
);

create index if not exists idx_redemptions_member  on public.reward_redemptions(member_id, redeemed_at desc);
create index if not exists idx_redemptions_status  on public.reward_redemptions(status);

-- ---------------------------------------------------------------- *
-- RLS
-- ---------------------------------------------------------------- *
alter table public.rewards            enable row level security;
alter table public.reward_redemptions enable row level security;

-- Catalog: any authed user can browse active rewards.
create policy "rewards: read active"
  on public.rewards for select
  to authenticated
  using (is_active);

create policy "rewards: coach read all"
  on public.rewards for select
  to authenticated
  using (public.is_current_user_coach());

-- Redemptions: own read; coach read all; coach update fulfillment.
create policy "redemptions: own read"
  on public.reward_redemptions for select
  to authenticated
  using (member_id = auth.uid());

create policy "redemptions: coach read all"
  on public.reward_redemptions for select
  to authenticated
  using (public.is_current_user_coach());

create policy "redemptions: coach update"
  on public.reward_redemptions for update
  to authenticated
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());

-- (No insert/delete policies for client roles — must go through the
--  redeem_reward RPC, which is SECURITY DEFINER and enforces invariants.)

-- ---------------------------------------------------------------- *
-- Atomic redemption — the only way to spend Reps.
-- ---------------------------------------------------------------- *
create or replace function public.redeem_reward(p_reward_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid;
  v_balance integer;
  v_reward record;
  v_redemption_id uuid;
begin
  v_member := auth.uid();
  if v_member is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  -- Lock the reward row to serialize concurrent redemptions of the
  -- same reward (so stock decrements correctly under contention).
  select id, name, cost_reps, stock, is_active, drop_at
    into v_reward
  from public.rewards
  where id = p_reward_id
  for update;

  if v_reward.id is null or not v_reward.is_active then
    raise exception 'reward unavailable' using errcode = 'P0001';
  end if;

  if v_reward.drop_at is not null and v_reward.drop_at > now() then
    raise exception 'reward not yet available' using errcode = 'P0001';
  end if;

  if v_reward.stock is not null and v_reward.stock <= 0 then
    raise exception 'reward sold out' using errcode = 'P0001';
  end if;

  -- Compute current balance.
  select coalesce(sum(delta), 0) into v_balance
  from public.reps_transactions
  where member_id = v_member;

  if v_balance < v_reward.cost_reps then
    raise exception 'insufficient reps (have %, need %)', v_balance, v_reward.cost_reps
      using errcode = 'P0001';
  end if;

  -- Decrement stock if limited.
  if v_reward.stock is not null then
    update public.rewards
       set stock = stock - 1
     where id = p_reward_id;
  end if;

  -- Negative ledger entry.
  insert into public.reps_transactions
    (member_id, delta, reason, reference_type, reference_id)
  values
    (v_member, -v_reward.cost_reps,
     'Redeemed: ' || v_reward.name,
     'reward', p_reward_id);

  -- Redemption record (status = pending until coach fulfils).
  insert into public.reward_redemptions
    (member_id, reward_id, cost_reps, reward_name_snapshot)
  values
    (v_member, p_reward_id, v_reward.cost_reps, v_reward.name)
  returning id into v_redemption_id;

  return v_redemption_id;
end;
$$;

grant execute on function public.redeem_reward(uuid) to authenticated;

-- ---------------------------------------------------------------- *
-- Seed catalog (idempotent)
-- ---------------------------------------------------------------- *
insert into public.rewards (slug, name, description, cost_reps, kind, stock, drop_at) values
  ('limited-cuff-olive',
   'Limited Cuff — Olive',
   'Olive-grøn HookIt cuff. Kun 80 stk lavet i denne farve. Sendes med GLS efter coach-godkendelse.',
   1200, 'drop', 80, null),
  ('1on1-formcheck',
   '1:1 Form-check med Mikael',
   'Privat 30-minutters videosession med head coach Mikael Munk. Live-feedback på dine tungeste sæt.',
   2000, 'experience', null, null),
  ('custom-broderet-strap',
   'Custom-broderet strap',
   'Få dit handle broderet på en sort StrapIt-strap. Lavet i hånden på Amagerbro, klar inden for 2 uger.',
   3500, 'physical', null, null),
  ('open-house-vip',
   'Open House VIP-pakke',
   'Træning + middag på Amagerbro lørdag 24/05 med crewet. 12 pladser.',
   8000, 'experience', 12, null)
on conflict (slug) do nothing;
