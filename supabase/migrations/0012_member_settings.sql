-- =================================================================
-- MakeIt // HQ — member self-serve settings
-- =================================================================
-- Notification preference toggles + bio column on public.members so
-- the /settings page can persist user choices. Defaults match the
-- "all on" beta behavior we ship today.

alter table public.members
  add column if not exists bio                       text,
  add column if not exists notif_form_check_review   boolean not null default true,
  add column if not exists notif_mention             boolean not null default true,
  add column if not exists notif_digest              boolean not null default true,
  add column if not exists notif_tier_up             boolean not null default true;
