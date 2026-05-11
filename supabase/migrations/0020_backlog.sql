-- =================================================================
-- MakeIt // HQ — backlog table for admin-managed roadmap
-- =================================================================
-- Lightweight issue/todo tracker bundled into /coach/system so the
-- founder + ops crew can capture features/changes/fixes without
-- jumping to a separate tool. RLS gates everything to admins.
--
-- Schema decisions:
--   - kind: enum-like CHECK with three buckets — feature (new
--     functionality), change (modify existing), fix (bug).
--     Could be split into more but three keeps the UI legible.
--   - status: open → in_progress → done, plus a wontfix terminal
--     state for items deliberately dropped.
--   - priority: low / medium / high / critical. medium is default.
--   - completed_at: auto-stamped via a trigger when status flips
--     to/from "done" — clearer than ad-hoc filtering on
--     updated_at + status.
--   - created_by FK to members so we can attribute who added
--     what; on member delete it nulls out instead of cascading
--     the backlog item (keep history even if the admin leaves).

create table if not exists public.backlog_items (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('feature', 'change', 'fix')),
  title        text not null check (char_length(title) between 3 and 200),
  description  text check (char_length(description) <= 2000),
  priority     text not null default 'medium'
                 check (priority in ('low', 'medium', 'high', 'critical')),
  status       text not null default 'open'
                 check (status in ('open', 'in_progress', 'done', 'wontfix')),
  created_at   timestamptz not null default now(),
  created_by   uuid references public.members(id) on delete set null,
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists backlog_items_status_idx
  on public.backlog_items (status);
create index if not exists backlog_items_kind_idx
  on public.backlog_items (kind);
create index if not exists backlog_items_created_at_idx
  on public.backlog_items (created_at desc);

-- updated_at touch trigger — reuses the helper added in 0001_init.
drop trigger if exists backlog_items_touch_updated_at on public.backlog_items;
create trigger backlog_items_touch_updated_at
  before update on public.backlog_items
  for each row execute procedure public.touch_updated_at();

-- Auto-stamp completed_at when status crosses the done boundary
-- in either direction. Keeps the "shipped on" timestamp accurate
-- without trusting the caller to remember to set it.
create or replace function public.backlog_set_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'done'
     and (old.status is distinct from 'done') then
    new.completed_at := now();
  elsif new.status is distinct from 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists backlog_completed_at_stamp on public.backlog_items;
create trigger backlog_completed_at_stamp
  before insert or update of status on public.backlog_items
  for each row execute procedure public.backlog_set_completed_at();

-- ---------------------------------------------------------------- *
-- RLS — admin-only on every operation. is_current_user_admin() is
-- the helper added in 0019.
-- ---------------------------------------------------------------- *
alter table public.backlog_items enable row level security;

create policy "admin read backlog"
  on public.backlog_items for select
  to authenticated
  using (public.is_current_user_admin());

create policy "admin insert backlog"
  on public.backlog_items for insert
  to authenticated
  with check (public.is_current_user_admin());

create policy "admin update backlog"
  on public.backlog_items for update
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

create policy "admin delete backlog"
  on public.backlog_items for delete
  to authenticated
  using (public.is_current_user_admin());
