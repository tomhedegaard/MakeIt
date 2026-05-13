-- =================================================================
-- MakeIt // HQ — nutrition skip-days
-- =================================================================
-- "I'm eating out Saturday" / "Travelling Mon-Wed" / "Fasting today"
-- → user marks the day as a skip, the planner doesn't generate meals
-- for that day, and the day-strip on /nutrition shows it as off-plan
-- instead of "missing meals you didn't follow."
--
-- Adherence math (logged vs planned) excludes skip-days from the
-- denominator so a member who pre-declared the skip isn't penalized.
--
-- Scoped to (member_id, date) — one record per day. reason is free
-- text but capped (UI label + audit). Unique constraint ensures a
-- day can't be doubly-skipped which would confuse aggregations.

create table if not exists public.nutrition_skip_days (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  skip_date   date not null,
  reason      text check (char_length(reason) <= 200),
  created_at  timestamptz not null default now()
);

create unique index if not exists nutrition_skip_days_member_date
  on public.nutrition_skip_days (member_id, skip_date);

alter table public.nutrition_skip_days enable row level security;

create policy "skip_days read own"
  on public.nutrition_skip_days for select
  to authenticated
  using (member_id = auth.uid());

create policy "skip_days insert own"
  on public.nutrition_skip_days for insert
  to authenticated
  with check (member_id = auth.uid());

create policy "skip_days delete own"
  on public.nutrition_skip_days for delete
  to authenticated
  using (member_id = auth.uid());

create policy "skip_days coach read"
  on public.nutrition_skip_days for select
  to authenticated
  using (public.is_current_user_coach());
