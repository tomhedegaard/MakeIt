-- 0063_makeit_ung.sql
--
-- MakeIt Ung, del 1: konti og samtykke
-- (docs/superpowers/specs/2026-09-27-makeit-ung-design.md, afsnit 2 og 6).
--
-- members.account_type separates adult members from young members
-- (15–17). A young member's account is created by the server when they
-- accept a guardian's invitation; the guardian holds the agreement and
-- the per-area consent (værgemålsloven § 42: a minor cannot take on the
-- subscription).
--
-- guardianships holds the invitation, both consents and withdrawals.
-- The young member's birth date lives here, not on members, because
-- members is readable to every signed-in member.
--
-- Writes go through server actions with the service-role client only:
-- no client insert/update/delete policies. account_type is added to the
-- 0062 privilege guard so a young member cannot flip themselves to adult.
--
-- Designed for local `npm run db:reset`. Do not apply to live until
-- Tom explicitly accepts `npm run db:push`.

alter table public.members
  add column if not exists account_type text not null default 'adult'
    check (account_type in ('adult', 'youth'));

comment on column public.members.account_type is
  'adult = MakeIt // HQ (18+). youth = MakeIt Ung (15–17), created from a guardianship. Server-written only (0062 guard).';

create table if not exists public.guardianships (
  id                    uuid primary key default gen_random_uuid(),
  guardian_member_id    uuid not null references public.members(id) on delete cascade,
  youth_member_id       uuid references public.members(id) on delete set null,
  youth_first_name      text not null check (char_length(youth_first_name) between 1 and 60),
  youth_email           text not null check (char_length(youth_email) between 3 and 254),
  youth_birth_date      date not null,
  status                text not null default 'invited'
                          check (status in ('invited', 'active', 'withdrawn', 'expired')),
  -- Per-area consent. Training is the product itself and always on.
  -- The effective consent for an area is guardian AND youth.
  guardian_consent_recovery boolean not null default false,
  guardian_consent_mind     boolean not null default false,
  youth_consent_recovery    boolean not null default false,
  youth_consent_mind        boolean not null default false,
  guardian_declared_at  timestamptz not null,   -- "Jeg har forældremyndigheden"
  youth_consented_at    timestamptz,
  withdrawn_at          timestamptz,
  withdrawn_by          text check (withdrawn_by in ('guardian', 'youth')),
  invite_token_hash     text not null unique,
  invite_expires_at     timestamptz not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists guardianships_guardian_idx on public.guardianships (guardian_member_id);
create index if not exists guardianships_youth_idx on public.guardianships (youth_member_id);

-- One open guardianship per young e-mail at a time.
create unique index if not exists guardianships_open_email_idx
  on public.guardianships (lower(youth_email))
  where status in ('invited', 'active');

comment on table public.guardianships is
  'MakeIt Ung: guardian invitation, per-area consent from guardian and young member, withdrawal. Service-role writes only. Include in art. 20 export for both parties.';

alter table public.guardianships enable row level security;

drop policy if exists "guardianships guardian read" on public.guardianships;
create policy "guardianships guardian read"
  on public.guardianships for select to authenticated
  using (guardian_member_id = auth.uid());

drop policy if exists "guardianships youth read" on public.guardianships;
create policy "guardianships youth read"
  on public.guardianships for select to authenticated
  using (youth_member_id = auth.uid());

-- ---------------------------------------------------------------- *
-- Extend the 0062 privilege guard with account_type
-- ---------------------------------------------------------------- *

create or replace function public.protect_member_privileges()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.id                 is distinct from old.id
     or new.is_coach           is distinct from old.is_coach
     or new.is_admin           is distinct from old.is_admin
     or new.coach_tier         is distinct from old.coach_tier
     or new.tier               is distinct from old.tier
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.account_type       is distinct from old.account_type
  then
    raise exception 'members privilege columns are not client-writable';
  end if;
  return new;
end;
$$;
