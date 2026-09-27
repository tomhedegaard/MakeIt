-- 0065_guardian_notices.sql
--
-- MakeIt Ung, del 3: tegn og varsling af forælderen
-- (docs/superpowers/specs/2026-09-27-makeit-ung-design.md, afsnit 4 og 5).
--
-- One row per message sent to a guardian about their young member.
-- The same row is what the young member sees in the app ("Vi har sendt
-- din forælder denne besked, fordi …"), so there is no hidden
-- monitoring: guardian and young member read the same row.
--
-- detail holds the observed numbers only (e.g. trained 13 of 14 days).
-- Never journal text, check-in answers or anything the young member
-- wrote. The message is rendered from signal + detail, so it is always
-- observational and never a diagnosis.
--
-- Signals are computed by fixed rules in src/lib/youth/signals.ts,
-- not by AI. Writes go through the service-role client only (the
-- youth-signals cron and the journal crisis hook); the young member's
-- "seen" mark is set by a server action that checks ownership.
--
-- Designed for local `npm run db:reset`. Do not apply to live until
-- Tom explicitly accepts `npm run db:push`.

create table if not exists public.guardian_notices (
  id                  uuid primary key default gen_random_uuid(),
  guardianship_id     uuid not null references public.guardianships(id) on delete cascade,
  guardian_member_id  uuid not null references public.members(id) on delete cascade,
  youth_member_id     uuid not null references public.members(id) on delete cascade,
  level               text not null check (level in ('acute', 'concern')),
  signal              text not null
                        check (signal in ('crisis_language', 'daily_training', 'double_sessions')),
  detail              jsonb not null default '{}'::jsonb,
  observed_from       date,
  observed_to         date,
  emailed_at          timestamptz,
  email_error         text check (email_error is null or char_length(email_error) <= 200),
  youth_seen_at       timestamptz,
  created_at          timestamptz not null default now()
);

-- Throttle lookups: latest notice per young member and signal.
create index if not exists guardian_notices_youth_signal_idx
  on public.guardian_notices (youth_member_id, signal, created_at desc);

create index if not exists guardian_notices_guardian_idx
  on public.guardian_notices (guardian_member_id, created_at desc);

comment on table public.guardian_notices is
  'MakeIt Ung: every message to a guardian, also shown to the young member. Observed numbers only, never journal text. Service-role writes only. Include in art. 20 export for both parties.';

alter table public.guardian_notices enable row level security;

drop policy if exists "guardian_notices guardian read" on public.guardian_notices;
create policy "guardian_notices guardian read"
  on public.guardian_notices for select to authenticated
  using (guardian_member_id = auth.uid());

drop policy if exists "guardian_notices youth read" on public.guardian_notices;
create policy "guardian_notices youth read"
  on public.guardian_notices for select to authenticated
  using (youth_member_id = auth.uid());
