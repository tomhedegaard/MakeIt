-- =================================================================
-- MakeIt // HQ — member language preference
-- =================================================================
-- Stores the chosen UI locale on the member row so the language
-- choice follows the user across devices. The mi_locale cookie stays
-- the render-time source of truth; this column re-seeds that cookie
-- on login (see src/app/auth/callback/route.ts).

alter table public.members
  add column if not exists locale text not null default 'da'
  check (locale in ('da', 'en'));
