-- =================================================================
-- MakeIt // HQ — modul-entitlements (Fase A)
-- =================================================================
-- Udvider subscriptions.product_kind med de fire tilkøbsmoduler og
-- tilføjer member_module_trials (anti-abuse for pr.-modul trial).
-- member_module_trials skrives kun af webhooken (service role);
-- klienter læser kun egne rækker (RLS).

-- ---------------------------------------------------------------- *
-- 1) Udvid product_kind-CHECK: crew/one_on_one + train/nutrition/hrv/mind
-- ---------------------------------------------------------------- *
alter table public.subscriptions
  drop constraint if exists subscriptions_product_kind_check;

alter table public.subscriptions
  add constraint subscriptions_product_kind_check
  check (product_kind in (
    'crew', 'one_on_one', 'train', 'nutrition', 'hrv', 'mind'
  ));

-- ---------------------------------------------------------------- *
-- 2) member_module_trials — ét trial pr. (medlem, modul)
-- ---------------------------------------------------------------- *
create table if not exists public.member_module_trials (
  member_id        uuid not null references public.members(id) on delete cascade,
  module_kind      text not null check (module_kind in ('train','nutrition','hrv','mind')),
  first_trialed_at timestamptz not null default now(),
  primary key (member_id, module_kind)
);

alter table public.member_module_trials enable row level security;

create policy "module_trials: own read"
  on public.member_module_trials for select
  to authenticated
  using (member_id = auth.uid());

create policy "module_trials: coach read"
  on public.member_module_trials for select
  to authenticated
  using (public.is_current_user_coach());

-- (Ingen insert/update/delete-policies for klient-roller — webhooken
--  bruger service-role, som bypasser RLS. Samme mønster som 0005.)
