-- =================================================================
-- MakeIt // HQ — HRV lifestyle-log uniqueness (V2.1)
-- =================================================================
-- One lifestyle log per member per day per event type, so a day's
-- entry is editable (upsert) rather than duplicated. Idempotent.
create unique index if not exists idx_hrv_lifestyle_logs_unique
  on public.hrv_lifestyle_logs (member_id, logged_for_date, event_type);
