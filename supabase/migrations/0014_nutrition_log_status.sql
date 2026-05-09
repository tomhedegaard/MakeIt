-- =================================================================
-- MakeIt // HQ — nutrition log status (eaten | skipped)
-- =================================================================
-- Adds a status column so the daily check-in can distinguish "ate
-- the planned meal", "ate something different" (still status='eaten',
-- with notes/photo), and "skipped this meal entirely". Adherence and
-- streak calculations join here.

alter table public.nutrition_logs
  add column if not exists status text not null default 'eaten'
    check (status in ('eaten','skipped'));

create index if not exists idx_nutrition_logs_member_date_status
  on public.nutrition_logs(member_id, logged_for_date desc, status);
