-- =================================================================
-- MakeIt // HQ — App Store Fase 2: platform på push-subscriptions
-- =================================================================
-- De native shells (Capacitor, Fase 3) registrerer APNs/FCM-tokens i
-- samme tabel som web-push. platform-kolonnen lader senderen route:
--   web     → web-push (VAPID)  — endpoint er en https-URL
--   ios     → APNs              — endpoint er device-token (Fase 3)
--   android → FCM               — endpoint er device-token (Fase 3)
--
-- Idempotent: ADD COLUMN IF NOT EXISTS. Eksisterende rækker er alle
-- web-push og defaulter korrekt til 'web'.
-- Se docs/APP_STORE_PLAN.md §Fase 2.

alter table public.push_subscriptions
  add column if not exists platform text not null default 'web';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'push_subscriptions_platform_check'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_platform_check
      check (platform in ('web', 'ios', 'android'));
  end if;
end $$;
