-- =================================================================
-- MakeIt // HQ — Munk Multiplier MM-7: morning-report email toggle
-- =================================================================
-- Per-coach opt-out for the daily morning-report email (sent ~06:30
-- CET by the coach-morning-report cron). Defaults true to match the
-- "all on" beta behaviour; mirrors the notif_* convention from 0012.
-- The cron still materialises the coach_morning_reports row regardless
-- of this flag — the toggle only gates the Resend email.

alter table public.members
  add column if not exists notif_morning_report boolean not null default true;

comment on column public.members.notif_morning_report is
  'Per-coach opt-in for the daily morning-report email (MM-7). The coach_morning_reports row is still written when false; only the email send is gated.';
