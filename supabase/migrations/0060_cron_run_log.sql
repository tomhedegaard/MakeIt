-- 0060_cron_run_log.sql
--
-- Append-only ops log for watched Vercel crons. One row per run.
-- Used to detect «silent empty»: 3 consecutive successful runs with
-- candidates>0 and generated==0 (spec B3).
--
-- Write path: service-role only (cron routes). No client INSERT.
-- Read path: coaches (system page is admin-gated in the app).
-- Not member data — omit from art. 20 export.
--
-- Designed for local `npm run db:reset`. Do not apply to live until
-- Tom explicitly accepts `npm run db:push`.

create table if not exists public.cron_run_log (
  id          uuid primary key default gen_random_uuid(),
  cron        text not null,
  ok          boolean not null,
  generated   integer not null default 0,
  failed      integer not null default 0,
  candidates  integer not null default 0,
  ran_at      timestamptz not null default now()
);

create index if not exists cron_run_log_cron_ran_at_idx
  on public.cron_run_log (cron, ran_at desc);

comment on table public.cron_run_log is
  'One row per watched cron run. Service-role writes; coaches read. Used for silent-empty health.';
comment on column public.cron_run_log.generated is
  'Useful primary work for that cron (Claude outputs, persisted+no_change evals, drafts, reports written).';
comment on column public.cron_run_log.candidates is
  'How many members/rows the cron had work for. 0 = nothing to do, not an empty failure.';

alter table public.cron_run_log enable row level security;

drop policy if exists cron_run_log_coach_read on public.cron_run_log;
create policy cron_run_log_coach_read
  on public.cron_run_log
  for select
  to authenticated
  using (public.is_current_user_coach());

-- 0059's invite_admitted_only loop only covers tables that existed
-- at apply time. New RLS tables need the same restrictive gate.
drop policy if exists invite_admitted_only on public.cron_run_log;
create policy invite_admitted_only
  on public.cron_run_log
  as restrictive
  for all
  to authenticated
  using (public.is_current_user_invite_admitted())
  with check (public.is_current_user_invite_admitted());
