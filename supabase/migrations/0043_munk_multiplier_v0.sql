-- =====================================================================
-- Munk Multiplier v0 — coach productivity infrastructure
-- =====================================================================
-- Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §4
--
-- Three additive pieces:
--   1. form_checks +3 cols for AI-drafted coach replies
--   2. coach_voice_samples — few-shot pool for the draft generator
--   3. coach_morning_reports — daily payload built by cron, read by
--      /coach/morning page
--
-- All additive, no destructive changes. RLS gated to
-- public.is_current_user_coach() (already defined; used by existing
-- coach surfaces like 0036_coach_exercise_write.sql).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) AI-drafted form-check replies
-- ---------------------------------------------------------------------
-- The draft cron (MM-5) scans form_checks awaiting coach review and
-- pre-stages a Claude-generated reply in Munk's voice. The coach
-- review modal (MM-6) pre-fills its textarea with this draft;
-- Munk edits in place and sends. drafted_by_ai is set true when the
-- sent coach_notes started from ai_drafted_reply with high overlap
-- (heuristic — drives the edit-ratio telemetry from §8).
-- ---------------------------------------------------------------------

alter table public.form_checks
  add column if not exists ai_drafted_reply text,
  add column if not exists ai_drafted_reply_at timestamptz,
  add column if not exists drafted_by_ai boolean not null default false;

comment on column public.form_checks.ai_drafted_reply is
  'Claude-drafted coach reply in Munk''s voice. Populated by the draft cron; coach edits in place before sending.';
comment on column public.form_checks.ai_drafted_reply_at is
  'When the draft cron persisted ai_drafted_reply. Null until first draft pass.';
comment on column public.form_checks.drafted_by_ai is
  'True when the sent coach_notes started from ai_drafted_reply and the coach kept high character overlap. Drives "how much is Munk actually editing?" telemetry.';

-- ---------------------------------------------------------------------
-- 2) Coach voice few-shot pool
-- ---------------------------------------------------------------------
-- 20-30 hand-curated past Munk replies tagged by tone. The draft cron
-- picks 3 random samples per call as <example> blocks in Claude's
-- system prompt so the generated reply lands in Munk's voice rather
-- than generic coaching prose.
--
-- Coach-only read/write — no member-facing surface.
-- ---------------------------------------------------------------------

create table if not exists public.coach_voice_samples (
  id          uuid primary key default gen_random_uuid(),
  exercise_id uuid references public.exercises(id) on delete set null,
  reply_text  text not null,
  tone        text not null
                check (tone in ('encouraging', 'corrective', 'terse', 'playful')),
  curated_by  uuid references public.members(id),
  curated_at  timestamptz not null default now(),
  notes       text
);

create index if not exists idx_coach_voice_samples_tone
  on public.coach_voice_samples (tone);

comment on table public.coach_voice_samples is
  'Few-shot pool of Munk''s past replies. Read by the draft-reply Claude wrapper to keep drafted output on-brand.';
comment on column public.coach_voice_samples.tone is
  'Stylistic tag so the draft cron can balance samples across the four registers Munk actually uses.';
comment on column public.coach_voice_samples.notes is
  'Optional curator notes: why this sample is representative, what to avoid copying, etc.';

alter table public.coach_voice_samples enable row level security;

drop policy if exists "coach_voice_samples_coach_all" on public.coach_voice_samples;
create policy "coach_voice_samples_coach_all"
  on public.coach_voice_samples
  for all
  using (public.is_current_user_coach())
  with check (public.is_current_user_coach());

-- ---------------------------------------------------------------------
-- 3) Coach morning reports
-- ---------------------------------------------------------------------
-- One row per coach per day, materialised by the morning cron (MM-7)
-- at 05:00 UTC. The /coach/morning page reads the latest row;
-- optionally Resend emails it at 06:30 CET.
--
-- payload jsonb shape (documented in spec §4) — keeping shape outside
-- SQL so v1 can evolve fields without altering the table.
-- ---------------------------------------------------------------------

create table if not exists public.coach_morning_reports (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references public.members(id) on delete cascade,
  report_date   date not null,
  payload       jsonb not null,
  sent_email_at timestamptz,
  created_at    timestamptz not null default now(),
  unique (coach_id, report_date)
);

create index if not exists idx_coach_morning_reports_coach_date
  on public.coach_morning_reports (coach_id, report_date desc);

comment on table public.coach_morning_reports is
  'Daily coach morning report payload (urgent / patterns / yesterday). One row per coach per day; latest read by /coach/morning.';
comment on column public.coach_morning_reports.payload is
  'Structured jsonb — see spec §4 for shape. Kept loose so we can evolve fields without ALTER TABLE.';

alter table public.coach_morning_reports enable row level security;

drop policy if exists "coach_morning_reports_owner" on public.coach_morning_reports;
create policy "coach_morning_reports_owner"
  on public.coach_morning_reports
  for select
  using (coach_id = auth.uid());

-- No insert/update/delete policies — the cron writes via service-role
-- (createServiceClient pattern from src/lib/supabase/service.ts), so
-- RLS doesn't need a write policy at all.

commit;
