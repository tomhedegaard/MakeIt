-- =================================================================
-- MakeIt // HQ — Landing waitlist
-- =================================================================
-- Conversion fix fra Scanfit-teardown (docs/research/
-- SCANFIT_LANDING_INSPIRATION.md): landingssiden havde ingen
-- handling for besøgende uden invite-kode. Denne tabel opsamler
-- venteliste-emails fra den offentlige landingsside.
--
-- Writes går KUN gennem service-role-klienten (server action) —
-- ingen anon insert-policy, så tabellen er lukket for direkte
-- client-writes. Ingen select-policy for medlemmer; kun coach
-- (Munk) kan læse listen.
-- =================================================================

create table if not exists public.waitlist_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (length(email) between 3 and 320),
  source      text not null default 'landing',
  locale      text,
  created_at  timestamptz not null default now()
);

-- Én række pr. email — server-actionen normaliserer til lowercase
-- før insert, så et plain unique index rækker (og matcher
-- PostgREST's on_conflict=email upsert). Gentilmelding er en
-- stille no-op, så vi ikke lækker om en email allerede er på listen.
create unique index if not exists waitlist_signups_email_uidx
  on public.waitlist_signups (email);

alter table public.waitlist_signups enable row level security;

drop policy if exists "waitlist_coach_read" on public.waitlist_signups;
create policy "waitlist_coach_read"
  on public.waitlist_signups
  for select
  using (public.is_current_user_coach());
