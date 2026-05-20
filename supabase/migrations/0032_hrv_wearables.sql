-- =================================================================
-- MakeIt // HQ — HRV wearable layer (W1)
-- =================================================================
-- Adds the OAuth-connection table and adapts hrv_readings for
-- wearable-sourced data (WHOOP/Oura/Polar). Additive, idempotent.
-- Writes to hrv_wearable_connections are service-role-only by design
-- (RLS gives members select-only — see spec §9).

-- ---------- hrv_wearable_connections ----------
create table if not exists public.hrv_wearable_connections (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  provider text not null check (provider in ('whoop', 'oura', 'polar')),
  provider_user_id text,
  access_token text not null,            -- AES-256-GCM ciphertext (base64)
  refresh_token text,                    -- AES-256-GCM ciphertext (base64)
  token_expires_at timestamptz,
  is_primary boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'needs_reauth', 'revoked')),
  connected_at timestamptz default now(),
  last_synced_at timestamptz,
  unique (member_id, provider)
);
create index if not exists idx_hrv_wearable_conn_member
  on public.hrv_wearable_connections (member_id);
create index if not exists idx_hrv_wearable_conn_sync
  on public.hrv_wearable_connections (status) where status = 'active';
create unique index if not exists idx_hrv_wearable_conn_one_primary
  on public.hrv_wearable_connections (member_id) where is_primary = true;

-- ---------- hrv_readings alterations ----------
alter table public.hrv_readings alter column rr_intervals drop not null;
alter table public.hrv_readings alter column timezone drop not null;
alter table public.hrv_readings drop constraint if exists hrv_readings_source_check;
alter table public.hrv_readings add constraint hrv_readings_source_check
  check (source in ('whoop', 'oura', 'polar', 'apple_health', 'camera_ppg'));
alter table public.hrv_readings add column if not exists provider_recorded_at timestamptz;
-- resting_hr_bpm: wearables report resting HR (distinct from mean HR);
-- the alert logic needs an RHR baseline, so it gets its own column.
alter table public.hrv_readings add column if not exists resting_hr_bpm numeric(5,2);
alter table public.hrv_readings add column if not exists connection_id uuid
  references public.hrv_wearable_connections(id) on delete set null;
create index if not exists idx_hrv_readings_connection
  on public.hrv_readings (connection_id);

-- ---------- retire camera-era hrv_settings.preferred_source ----------
alter table public.hrv_settings drop column if exists preferred_source;

-- ---------- RLS ----------
alter table public.hrv_wearable_connections enable row level security;
drop policy if exists "members_read_own_connections" on public.hrv_wearable_connections;
create policy "members_read_own_connections" on public.hrv_wearable_connections
  for select using (member_id = auth.uid());
