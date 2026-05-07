-- =================================================================
-- MakeIt // HQ — subscriptions (Stripe)
-- =================================================================
-- Tracks Stripe customer mapping and active subscriptions per member.
-- Webhook updates these rows via service role; clients only read their
-- own (RLS).

alter table public.members
  add column if not exists stripe_customer_id text unique;

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  member_id              uuid not null references public.members(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id     text,
  stripe_price_id        text,
  product_kind           text not null check (product_kind in ('crew', 'one_on_one')),
  status                 text not null check (status in (
    'trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid','paused'
  )),
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_subs_member  on public.subscriptions(member_id);
create index if not exists idx_subs_status  on public.subscriptions(status);

-- updated_at touch
create or replace function public.touch_subscriptions_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists subs_touch_updated_at on public.subscriptions;
create trigger subs_touch_updated_at
  before update on public.subscriptions
  for each row execute procedure public.touch_subscriptions_updated_at();

-- ---------------------------------------------------------------- *
-- RLS: members can read their own subs; coaches read all; only the
-- service role (webhook) writes.
-- ---------------------------------------------------------------- *
alter table public.subscriptions enable row level security;

create policy "subscriptions: own read"
  on public.subscriptions for select
  to authenticated
  using (member_id = auth.uid());

create policy "subscriptions: coach read"
  on public.subscriptions for select
  to authenticated
  using (public.is_current_user_coach());

-- (No insert/update/delete policies for client roles — webhook uses
-- the service role which bypasses RLS.)

-- ---------------------------------------------------------------- *
-- Helper view: each member's currently-active subs by kind
-- ---------------------------------------------------------------- *
create or replace view public.member_active_subscriptions as
select
  s.member_id,
  s.product_kind,
  s.status,
  s.current_period_end,
  s.cancel_at_period_end,
  s.stripe_subscription_id
from public.subscriptions s
where s.status in ('trialing','active','past_due');

grant select on public.member_active_subscriptions to authenticated;
