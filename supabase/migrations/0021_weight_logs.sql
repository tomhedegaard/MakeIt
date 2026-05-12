-- =================================================================
-- MakeIt // HQ — bodyweight logs
-- =================================================================
-- Lightweight weekly weigh-in log. The meal planner uses the latest
-- entry as input to Mifflin-St Jeor (kcal estimation) and the
-- ugentlige adjust-engine (cut/bulk drift detection).
--
-- Design constraints:
--   - Daily granularity is allowed but the UX nudges weekly. We
--     keep timestamp precision so future "every Sunday morning"
--     trend logic can work on real dates rather than week buckets.
--   - kg as numeric(5,2) — enough range for 0.00–999.99 kg with
--     decigram precision. Real members log to one decimal (78.4 kg);
--     two decimals leaves room for body-composition scales.
--   - notes: optional one-liner ("morning fasted", "post training")
--     so members can annotate context without a separate diary.
--   - No "type" column. If we later want to distinguish fasted vs
--     post-meal weigh-ins we can add a CHECK enum without a data
--     migration headache — it'd be additive.
--
-- Adherence touchpoint: the ugentlige Reps-system COULD award a
-- small reward for a weekly log, but that lives in app code (the
-- Sunday cron) rather than a trigger here — keeps the schema
-- domain-pure and lets the reward policy evolve without DDL.

create table if not exists public.weight_logs (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  kg          numeric(5,2) not null check (kg > 0 and kg < 500),
  notes       text check (char_length(notes) <= 200),
  logged_at   timestamptz not null default now()
);

create index if not exists idx_weight_logs_member_recent
  on public.weight_logs (member_id, logged_at desc);

alter table public.weight_logs enable row level security;

create policy "weight_logs read own"
  on public.weight_logs for select
  to authenticated
  using (member_id = auth.uid());

create policy "weight_logs insert own"
  on public.weight_logs for insert
  to authenticated
  with check (member_id = auth.uid());

create policy "weight_logs update own"
  on public.weight_logs for update
  to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

create policy "weight_logs delete own"
  on public.weight_logs for delete
  to authenticated
  using (member_id = auth.uid());

-- Coaches read across the crew for adherence + trend reviews
-- (same pattern as 0004_coach for other member-data tables).
create policy "weight_logs coach read"
  on public.weight_logs for select
  to authenticated
  using (public.is_current_user_coach());
