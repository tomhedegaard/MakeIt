-- 0058_mental_sessions_personal_rls.sql
--
-- personal-<memberId>-<date> rows hold body_md + prompt_seed for one
-- member. 0046 modelled the table as a shared catalog and used
-- mental_sessions_authed_read (any authenticated SELECT). That leaks
-- personal scripts via the browser client.
--
-- Split SELECT: library slugs stay readable by authenticated members;
-- personal slugs are owner-only. No new column — the slug is the key.
--
-- Munk write stays Munk-only but is recast from FOR ALL to
-- INSERT/UPDATE/DELETE so it no longer grants SELECT of personal rows.
-- No coach-read of personal scripts (no UI requires it).
--
-- Do not edit 0046 in place. Designed for local `npm run db:reset`.
-- Do not apply to live until Tom explicitly accepts `npm run db:push`.

drop policy if exists "mental_sessions_authed_read" on public.mental_sessions;

drop policy if exists "mental_sessions_library_read" on public.mental_sessions;
create policy "mental_sessions_library_read"
  on public.mental_sessions
  for select
  using (
    auth.role() = 'authenticated'
    and slug not like 'personal-%'
  );

drop policy if exists "mental_sessions_personal_owner_read" on public.mental_sessions;
create policy "mental_sessions_personal_owner_read"
  on public.mental_sessions
  for select
  using (
    auth.uid() is not null
    and slug like ('personal-' || auth.uid()::text || '-%')
  );

drop policy if exists "mental_sessions_munk_write" on public.mental_sessions;
drop policy if exists "mental_sessions_munk_insert" on public.mental_sessions;
drop policy if exists "mental_sessions_munk_update" on public.mental_sessions;
drop policy if exists "mental_sessions_munk_delete" on public.mental_sessions;

create policy "mental_sessions_munk_insert"
  on public.mental_sessions
  for insert
  with check (public.is_current_user_munk());

create policy "mental_sessions_munk_update"
  on public.mental_sessions
  for update
  using (public.is_current_user_munk())
  with check (public.is_current_user_munk());

create policy "mental_sessions_munk_delete"
  on public.mental_sessions
  for delete
  using (public.is_current_user_munk());

comment on table public.mental_sessions is
  '1-10 min mental sessions. Library slugs (not personal-*) are the shared catalog. personal-<member_id>-<date> rows are owner-only (body_md + prompt_seed).';
