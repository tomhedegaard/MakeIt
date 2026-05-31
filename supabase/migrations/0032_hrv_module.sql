-- =================================================================
-- MakeIt // HQ — HRV module (Phase 1)
-- =================================================================
-- Adds 7 tables for the HRV measurement module: settings, session
-- modifiers, alerts, readings, lifestyle logs, weekly insights,
-- streak events. All RLS-enabled. Additive only — no changes to
-- existing tables. Idempotent — safe to re-run.
--
-- Table-creation order respects FK dependencies:
--   hrv_settings -> hrv_session_modifiers -> hrv_alerts
--   -> hrv_readings -> hrv_lifestyle_logs -> hrv_weekly_insights
--   -> hrv_streak_events

-- ---------- hrv_settings ----------
create table if not exists public.hrv_settings (
  member_id uuid primary key references public.members(id) on delete cascade,
  preferred_source text default 'camera_ppg'
    check (preferred_source in ('camera_ppg', 'polar_h10')),
  session_suggestion_enabled boolean default true,
  cycle_tracking_enabled boolean default false,
  share_to_coach boolean default true,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- hrv_session_modifiers ----------
create table if not exists public.hrv_session_modifiers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  session_id uuid references public.sessions(id),
  program_id uuid references public.programs(id),
  modifier_type text not null check (modifier_type in
    ('top_set_reduction', 'volume_reduction', 'deload_week_insertion', 'paused_session')),
  applied_value jsonb,
  reason text not null check (reason in
    ('hrv_low_readiness_b_prong', 'hrv_sustained_low_d_prong', 'coach_pause_from_alert')),
  accepted_by_member boolean,
  created_at timestamptz default now()
);
create index if not exists idx_hrv_session_modifiers_member
  on public.hrv_session_modifiers (member_id, created_at desc);

-- ---------- hrv_alerts ----------
create table if not exists public.hrv_alerts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  triggered_at timestamptz default now(),
  conditions_met jsonb not null,
  status text not null default 'open'
    check (status in ('open', 'reviewed_noted', 'reviewed_actioned', 'auto_resolved')),
  coach_note_text text,
  session_modifier_id uuid references public.hrv_session_modifiers(id),
  reviewed_at timestamptz,
  reviewed_by uuid references public.members(id)
);
create index if not exists idx_hrv_alerts_open
  on public.hrv_alerts (status, triggered_at desc) where status = 'open';

-- ---------- hrv_readings ----------
create table if not exists public.hrv_readings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  measured_at timestamptz not null,
  source text not null check (source in ('camera_ppg', 'polar_h10')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  quality_warnings jsonb,
  rr_intervals jsonb not null,
  rmssd_ms numeric(6,2) not null,
  ln_rmssd numeric(8,4) not null,
  mean_hr_bpm numeric(5,2),
  rolling_7d_mean_lnrmssd numeric(8,4),
  baseline_60d_mean_lnrmssd numeric(8,4),
  baseline_60d_swc numeric(8,4),
  warm_up_state text not null
    check (warm_up_state in ('discovery', 'provisional', 'active')),
  readiness_bucket text
    check (readiness_bucket in ('very_low', 'low', 'normal', 'high', 'very_high')),
  cycle_phase text
    check (cycle_phase in ('menstrual', 'follicular', 'ovulatory', 'luteal')),
  timezone text not null,
  is_sick boolean default false,
  inserted_at timestamptz default now()
);
create index if not exists idx_hrv_readings_member_measured
  on public.hrv_readings (member_id, measured_at desc);
create index if not exists idx_hrv_readings_member_valid
  on public.hrv_readings (member_id, is_sick) where is_sick = false;

-- ---------- hrv_lifestyle_logs ----------
create table if not exists public.hrv_lifestyle_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  logged_for_date date not null,
  event_type text not null check (event_type in
    ('alcohol_drinks', 'sleep_hours', 'feeling', 'late_meal', 'sick', 'menstrual_start')),
  value jsonb not null,
  inserted_at timestamptz default now()
);
create index if not exists idx_hrv_lifestyle_logs_member
  on public.hrv_lifestyle_logs (member_id, logged_for_date desc);

-- ---------- hrv_weekly_insights ----------
create table if not exists public.hrv_weekly_insights (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  week_start date not null,
  summary_text text not null,
  correlation_cards jsonb not null,
  claude_model_id text not null,
  tokens_used int,
  generated_at timestamptz default now(),
  unique (member_id, week_start)
);

-- ---------- hrv_streak_events ----------
create table if not exists public.hrv_streak_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  milestone int not null check (milestone in (7, 14, 30, 90)),
  reps_awarded int not null,
  triggered_at timestamptz default now(),
  unique (member_id, milestone)
);

-- ---------- Row Level Security ----------
alter table public.hrv_settings           enable row level security;
alter table public.hrv_session_modifiers  enable row level security;
alter table public.hrv_alerts             enable row level security;
alter table public.hrv_readings           enable row level security;
alter table public.hrv_lifestyle_logs     enable row level security;
alter table public.hrv_weekly_insights    enable row level security;
alter table public.hrv_streak_events      enable row level security;

-- Member-owned policies
drop policy if exists "members_own_settings" on public.hrv_settings;
create policy "members_own_settings" on public.hrv_settings
  for all using (member_id = auth.uid());

drop policy if exists "members_own_session_modifiers" on public.hrv_session_modifiers;
create policy "members_own_session_modifiers" on public.hrv_session_modifiers
  for select using (member_id = auth.uid());

drop policy if exists "members_read_own_alerts" on public.hrv_alerts;
create policy "members_read_own_alerts" on public.hrv_alerts
  for select using (member_id = auth.uid());

drop policy if exists "members_own_readings" on public.hrv_readings;
create policy "members_own_readings" on public.hrv_readings
  for all using (member_id = auth.uid());

drop policy if exists "members_own_lifestyle_logs" on public.hrv_lifestyle_logs;
create policy "members_own_lifestyle_logs" on public.hrv_lifestyle_logs
  for all using (member_id = auth.uid());

drop policy if exists "members_own_weekly_insights" on public.hrv_weekly_insights;
create policy "members_own_weekly_insights" on public.hrv_weekly_insights
  for select using (member_id = auth.uid());

drop policy if exists "members_own_streak_events" on public.hrv_streak_events;
create policy "members_own_streak_events" on public.hrv_streak_events
  for select using (member_id = auth.uid());

-- Coach opt-in read policies (coach reads individual data only when member opted in)
drop policy if exists "coach_reads_opted_readings" on public.hrv_readings;
create policy "coach_reads_opted_readings" on public.hrv_readings
  for select using (
    public.is_current_user_coach()
    and exists (
      select 1 from public.hrv_settings s
      where s.member_id = hrv_readings.member_id
        and s.share_to_coach = true
    )
  );

drop policy if exists "coach_reads_opted_lifestyle_logs" on public.hrv_lifestyle_logs;
create policy "coach_reads_opted_lifestyle_logs" on public.hrv_lifestyle_logs
  for select using (
    public.is_current_user_coach()
    and exists (
      select 1 from public.hrv_settings s
      where s.member_id = hrv_lifestyle_logs.member_id
        and s.share_to_coach = true
    )
  );

drop policy if exists "coach_reads_opted_weekly_insights" on public.hrv_weekly_insights;
create policy "coach_reads_opted_weekly_insights" on public.hrv_weekly_insights
  for select using (
    public.is_current_user_coach()
    and exists (
      select 1 from public.hrv_settings s
      where s.member_id = hrv_weekly_insights.member_id
        and s.share_to_coach = true
    )
  );

drop policy if exists "coach_reads_opted_session_modifiers" on public.hrv_session_modifiers;
create policy "coach_reads_opted_session_modifiers" on public.hrv_session_modifiers
  for select using (
    public.is_current_user_coach()
    and exists (
      select 1 from public.hrv_settings s
      where s.member_id = hrv_session_modifiers.member_id
        and s.share_to_coach = true
    )
  );

-- Coach always reads + manages alerts (the entire point of the coach role)
drop policy if exists "coach_manages_alerts" on public.hrv_alerts;
create policy "coach_manages_alerts" on public.hrv_alerts
  for all using (public.is_current_user_coach());

drop policy if exists "coach_reads_streak_events" on public.hrv_streak_events;
create policy "coach_reads_streak_events" on public.hrv_streak_events
  for select using (public.is_current_user_coach());
