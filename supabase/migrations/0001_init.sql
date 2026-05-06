-- =================================================================
-- MakeIt // HQ — initial schema (closed beta foundation)
-- =================================================================
-- Run this in your Supabase SQL editor (or via Supabase CLI).
-- All tables enable RLS. Auth is handled by Supabase Auth — public.members
-- is a profile table that mirrors auth.users via a trigger.

-- ---------- Members (profiles) ----------
create table if not exists public.members (
  id              uuid primary key references auth.users(id) on delete cascade,
  handle          text unique not null,
  display_name    text,
  email           text,
  tier            text not null default 'Lifter'
                     check (tier in ('Lifter','Athlete','Beast','Legend')),
  bio             text,
  avatar_url      text,
  joined_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_members_handle on public.members(handle);

-- ---------- Invite codes ----------
create table if not exists public.invite_codes (
  code            text primary key,
  created_by      uuid references public.members(id) on delete set null,
  used_by         uuid references public.members(id) on delete set null,
  used_at         timestamptz,
  expires_at      timestamptz,
  max_uses        integer not null default 1,
  uses_count      integer not null default 0,
  note            text,
  created_at      timestamptz not null default now()
);

-- ---------- Exercises (library) ----------
create table if not exists public.exercises (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  cue             text,
  primary_muscle  text,
  video_url       text,
  thumbnail_url   text,
  created_at      timestamptz not null default now()
);

-- ---------- Programs (templates) ----------
create table if not exists public.programs (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  name            text not null,
  type            text not null,                 -- Strength / Hypertrophy / Hybrid / Specialization
  description     text,
  weeks           integer not null,
  level           text,                          -- Beginner / Intermediate / Advanced
  coach_id        uuid references public.members(id),
  is_published    boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------- Program assignment ----------
create table if not exists public.program_assignments (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.members(id) on delete cascade,
  program_id      uuid not null references public.programs(id),
  status          text not null default 'active'
                     check (status in ('active','paused','completed','abandoned')),
  current_week    integer not null default 1,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create unique index if not exists idx_one_active_program_per_member
  on public.program_assignments(member_id) where status = 'active';

-- ---------- Sessions (a single planned/logged workout) ----------
create table if not exists public.sessions (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references public.members(id) on delete cascade,
  program_id        uuid references public.programs(id),
  week              integer,
  day_label         text,
  title             text not null,
  scheduled_for     date,
  started_at        timestamptz,
  completed_at      timestamptz,
  estimated_minutes integer,
  status            text not null default 'scheduled'
                       check (status in ('scheduled','active','completed','skipped')),
  created_at        timestamptz not null default now()
);
create index if not exists idx_sessions_member_status on public.sessions(member_id, status);
create index if not exists idx_sessions_scheduled on public.sessions(scheduled_for);

-- ---------- Session exercises ----------
create table if not exists public.session_exercises (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  exercise_id     uuid references public.exercises(id),
  exercise_name   text not null,
  cue             text,
  position        integer not null
);
create index if not exists idx_session_exercises_session on public.session_exercises(session_id);

-- ---------- Sets (planned + logged in one row) ----------
create table if not exists public.session_sets (
  id                  uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises(id) on delete cascade,
  position            integer not null,
  target_reps         integer,
  target_weight       numeric(6,2),
  target_rpe          numeric(3,1),
  rest_sec            integer,
  logged_reps         integer,
  logged_weight       numeric(6,2),
  logged_rpe          numeric(3,1),
  logged_at           timestamptz
);
create index if not exists idx_session_sets_ex on public.session_sets(session_exercise_id);

-- ---------- Posts (community feed) ----------
create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.members(id) on delete cascade,
  content         text not null,
  tag             text check (tag in ('PR','Note','Form-check')),
  is_pr           boolean not null default false,
  form_check_id   uuid,                          -- soft-fk, set after insert
  created_at      timestamptz not null default now()
);
create index if not exists idx_posts_recent on public.posts(created_at desc);

-- ---------- Reactions (Reps on posts) ----------
create table if not exists public.post_reactions (
  post_id         uuid not null references public.posts(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (post_id, member_id)
);

-- ---------- Comments ----------
create table if not exists public.post_comments (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.posts(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete cascade,
  content         text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_comments_post on public.post_comments(post_id, created_at);

-- ---------- Reps ledger ----------
create table if not exists public.reps_transactions (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.members(id) on delete cascade,
  delta           integer not null,              -- positive earn, negative spend
  reason          text not null,
  reference_type  text,
  reference_id    uuid,
  created_at      timestamptz not null default now()
);
create index if not exists idx_reps_member on public.reps_transactions(member_id, created_at desc);

-- Helper view for reps balance
create or replace view public.member_reps_balance as
select m.id as member_id,
       coalesce(sum(t.delta), 0)::integer as balance
from public.members m
left join public.reps_transactions t on t.member_id = m.id
group by m.id;

-- ---------- Challenges ----------
create table if not exists public.challenges (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  description     text,
  goal_metric     text,                          -- 'volume_kg' | 'sessions_count' | 'pr_count'
  goal_target     numeric,
  reward_text     text,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  created_at      timestamptz not null default now()
);

create table if not exists public.challenge_participants (
  challenge_id    uuid not null references public.challenges(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  current_progress numeric not null default 0,
  primary key (challenge_id, member_id)
);

-- ---------- Form-checks ----------
create table if not exists public.form_checks (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid not null references public.members(id) on delete cascade,
  exercise_id         uuid references public.exercises(id),
  exercise_name       text,
  video_url           text,
  ai_score            integer,
  ai_headline         text,
  ai_pos              jsonb,
  ai_neg              jsonb,
  ai_fix              text,
  coach_reviewed_by   uuid references public.members(id),
  coach_reviewed_at   timestamptz,
  coach_notes         text,
  created_at          timestamptz not null default now()
);

-- =================================================================
-- Triggers
-- =================================================================

-- Auto-create a public.members row on auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  unique_handle text;
  i integer := 0;
begin
  -- derive handle from email or raw_user_meta_data.handle
  base_handle := lower(coalesce(
    nullif(new.raw_user_meta_data->>'handle', ''),
    split_part(new.email, '@', 1)
  ));
  base_handle := regexp_replace(base_handle, '[^a-z0-9_]', '', 'g');
  if base_handle = '' then
    base_handle := 'lifter';
  end if;

  unique_handle := base_handle;
  while exists (select 1 from public.members where handle = unique_handle) loop
    i := i + 1;
    unique_handle := base_handle || i::text;
  end loop;

  insert into public.members (id, handle, email, display_name)
  values (new.id, unique_handle, new.email, new.raw_user_meta_data->>'display_name');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at touch
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists members_touch_updated_at on public.members;
create trigger members_touch_updated_at
  before update on public.members
  for each row execute procedure public.touch_updated_at();

-- =================================================================
-- RLS — Row Level Security
-- =================================================================

alter table public.members            enable row level security;
alter table public.invite_codes       enable row level security;
alter table public.exercises          enable row level security;
alter table public.programs           enable row level security;
alter table public.program_assignments enable row level security;
alter table public.sessions           enable row level security;
alter table public.session_exercises  enable row level security;
alter table public.session_sets       enable row level security;
alter table public.posts              enable row level security;
alter table public.post_reactions     enable row level security;
alter table public.post_comments      enable row level security;
alter table public.reps_transactions  enable row level security;
alter table public.challenges         enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.form_checks        enable row level security;

-- Members: any authed user can read all members; only update own row
create policy "members readable to authed"
  on public.members for select
  to authenticated using (true);
create policy "members can update own"
  on public.members for update
  to authenticated using (id = auth.uid());

-- Invite codes: only service role (no client policies = denied)
-- (policies intentionally omitted; clients must validate via server action / RPC)

-- Exercise + Program library: all authed read; only service role write
create policy "exercises readable to authed"
  on public.exercises for select to authenticated using (true);
create policy "programs readable to authed"
  on public.programs for select to authenticated using (is_published);

-- Program assignments / sessions / sets: only owner
create policy "own program assignments"
  on public.program_assignments for all
  to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

create policy "own sessions"
  on public.sessions for all
  to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

create policy "own session_exercises"
  on public.session_exercises for all
  to authenticated using (
    exists (select 1 from public.sessions s where s.id = session_id and s.member_id = auth.uid())
  );

create policy "own session_sets"
  on public.session_sets for all
  to authenticated using (
    exists (
      select 1 from public.session_exercises se
      join public.sessions s on s.id = se.session_id
      where se.id = session_exercise_id and s.member_id = auth.uid()
    )
  );

-- Posts: all authed read; only owner write (insert/update/delete)
create policy "posts readable to authed"
  on public.posts for select to authenticated using (true);
create policy "posts insert own"
  on public.posts for insert to authenticated
  with check (member_id = auth.uid());
create policy "posts update own"
  on public.posts for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "posts delete own"
  on public.posts for delete to authenticated
  using (member_id = auth.uid());

-- Reactions
create policy "reactions readable" on public.post_reactions for select to authenticated using (true);
create policy "reactions insert own" on public.post_reactions for insert to authenticated
  with check (member_id = auth.uid());
create policy "reactions delete own" on public.post_reactions for delete to authenticated
  using (member_id = auth.uid());

-- Comments
create policy "comments readable" on public.post_comments for select to authenticated using (true);
create policy "comments insert own" on public.post_comments for insert to authenticated
  with check (member_id = auth.uid());
create policy "comments update own" on public.post_comments for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "comments delete own" on public.post_comments for delete to authenticated
  using (member_id = auth.uid());

-- Reps ledger: owner can read, no client write (server-side via service role)
create policy "reps read own" on public.reps_transactions for select to authenticated
  using (member_id = auth.uid());

-- Challenges: all authed read
create policy "challenges read" on public.challenges for select to authenticated using (true);

-- Challenge participants: any authed read; member can join/leave own
create policy "challenge_participants read" on public.challenge_participants for select to authenticated using (true);
create policy "challenge_participants insert own" on public.challenge_participants for insert to authenticated
  with check (member_id = auth.uid());
create policy "challenge_participants delete own" on public.challenge_participants for delete to authenticated
  using (member_id = auth.uid());

-- Form-checks: only owner
create policy "form_checks own" on public.form_checks for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- Allow authenticated users to read public.member_reps_balance via the underlying members policy
grant select on public.member_reps_balance to authenticated;
