-- =================================================================
-- MakeIt // HQ — member action log (rate-limit substrate)
-- =================================================================
-- Append-only log of rate-limited member actions. Counted in
-- rolling windows (24h / 7d) to enforce per-action quotas:
--
--   plan_regen   1 / day, 3 / 7d   (Claude is the costly path)
--   meal_swap    5 / day, 15 / 7d
--   weight_log   1 / day           (idempotent — same-day overwrite,
--                                   second log replaces the first)
--   pref_update  20 / day          (essentially unlimited under
--                                   normal use; abuse guard only)
--
-- Schema kept neutral — limit numbers live in app code so we can
-- tune without DDL. Tier-differentiated limits (Trial / Crew /
-- 1:1 Coaching) plug in as a lookup on top of these entries
-- without a schema change.
--
-- RLS: each member reads/inserts their own. Updates + deletes
-- denied (immutable audit log). Coaches read across the crew via
-- the additive is_current_user_coach() helper for adherence
-- analysis.

create table if not exists public.member_action_logs (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  action      text not null
                check (action in ('plan_regen', 'meal_swap', 'weight_log', 'pref_update')),
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_action_logs_recent
  on public.member_action_logs (member_id, action, created_at desc);

alter table public.member_action_logs enable row level security;

create policy "action_logs read own"
  on public.member_action_logs for select
  to authenticated
  using (member_id = auth.uid());

create policy "action_logs insert own"
  on public.member_action_logs for insert
  to authenticated
  with check (member_id = auth.uid());

create policy "action_logs coach read"
  on public.member_action_logs for select
  to authenticated
  using (public.is_current_user_coach());
