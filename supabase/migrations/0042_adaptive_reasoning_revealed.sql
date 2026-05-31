-- =====================================================================
-- Open Brain UI v0 — telemetry column for "Vis tankegang" reveals
-- =====================================================================
-- Spec: docs/superpowers/specs/2026-05-26-open-brain-ui-v0-design.md §6
--
-- Set the first time the member expands the inline reasoning panel on
-- their AdaptationCard. Drives the dashboard question "does revealing
-- the reasoning correlate with higher accept rates?" without requiring
-- a PostHog round-trip — answerable via a simple SQL join against
-- accepted_by_member.
--
-- Additive only. The column is nullable; absence means "never revealed".
-- =====================================================================

begin;

alter table public.hrv_session_modifiers
  add column if not exists reasoning_revealed_at timestamptz;

comment on column public.hrv_session_modifiers.reasoning_revealed_at is
  'First time the member expanded "Vis tankegang" on this modifier. Null = never revealed. Drives Søjle 2 telemetry.';

commit;
