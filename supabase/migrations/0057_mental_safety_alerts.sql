-- 0057_mental_safety_alerts.sql
--
-- Dedicated coach-visible table for member-initiated mental-safety
-- escalations. Do NOT reuse hrv_alerts as a suicide-signal bus.
--
-- Members INSERT/SELECT/UPDATE their own rows (user-scoped client).
-- Coaches SELECT all + UPDATE status. No service-role required.
-- The summary is member-written. Raw journal text is never stored.
--
-- Designed for local `npm run db:reset`. Do not apply to live until
-- Tom explicitly accepts `npm run db:push`.

create table if not exists public.mental_safety_alerts (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  summary     text not null check (char_length(summary) between 4 and 1000),
  status      text not null default 'open'
              check (status in ('open', 'seen', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists mental_safety_alerts_open_idx
  on public.mental_safety_alerts (status, created_at desc)
  where status = 'open';

create index if not exists mental_safety_alerts_member_created_idx
  on public.mental_safety_alerts (member_id, created_at desc);

comment on table public.mental_safety_alerts is
  'Member-authored mental-safety summaries. Never contains journal body. Not a push/mail notify bus.';

alter table public.mental_safety_alerts enable row level security;

drop policy if exists "mental_safety_alerts_owner_write" on public.mental_safety_alerts;
create policy "mental_safety_alerts_owner_write"
  on public.mental_safety_alerts
  for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

drop policy if exists "mental_safety_alerts_coach_read" on public.mental_safety_alerts;
create policy "mental_safety_alerts_coach_read"
  on public.mental_safety_alerts
  for select
  using (public.is_current_user_coach());

drop policy if exists "mental_safety_alerts_coach_status" on public.mental_safety_alerts;
create policy "mental_safety_alerts_coach_status"
  on public.mental_safety_alerts
  for update
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());
