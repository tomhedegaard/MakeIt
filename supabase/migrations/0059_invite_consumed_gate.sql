-- 0059_invite_consumed_gate.sql
--
-- Residual from PR #41: handle_new_user (0001) inserts public.members
-- on ANY auth.users row. A client with only the anon key can
-- supabase.auth.signUp and become a full member without a consumed
-- invite.
--
-- New members start un-admitted (invite_consumed_at is null).
-- Admission is a SECURITY DEFINER consume (trigger metadata or
-- consume_invite RPC). Existing members are backfilled so nobody
-- who already has a row is locked out.
--
-- Restrictive RLS hides every authenticated public table (and
-- storage.objects) from an un-admitted JWT. Service-role bypasses
-- RLS. invite_codes stays without client policies.
--
-- Do not edit 0001/0002 in place. Designed for local `npm run db:reset`.
-- Do not apply to live until Tom explicitly accepts `npm run db:push`.

-- ---------------------------------------------------------------- *
-- 1) Flag + backfill existing members
-- ---------------------------------------------------------------- *

alter table public.members
  add column if not exists invite_consumed_at timestamptz;

update public.members
set invite_consumed_at = coalesce(joined_at, now())
where invite_consumed_at is null;

comment on column public.members.invite_consumed_at is
  'Set when a valid invite is consumed for this member. Null = auth user exists but is not a closed-beta member. Existing rows backfilled in 0059.';

-- ---------------------------------------------------------------- *
-- 2) Protect the flag from client UPDATEs
-- ---------------------------------------------------------------- *

create or replace function public.protect_invite_consumed_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.invite_consumed_at is distinct from old.invite_consumed_at
  then
    if current_setting('makeit.allow_invite_consume', true) is not distinct from '1' then
      return new;
    end if;
    if current_user in ('postgres', 'supabase_admin', 'service_role') then
      return new;
    end if;
    raise exception 'invite_consumed_at is not client-writable';
  end if;
  return new;
end;
$$;

drop trigger if exists members_protect_invite_consumed_at on public.members;
create trigger members_protect_invite_consumed_at
  before update on public.members
  for each row execute function public.protect_invite_consumed_at();

-- ---------------------------------------------------------------- *
-- 3) Shared consume helper (used by handle_new_user + consume_invite)
-- ---------------------------------------------------------------- *

create or replace function public.try_consume_invite_for(p_user_id uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_row  public.invite_codes%rowtype;
begin
  if p_user_id is null or v_code = '' then
    return false;
  end if;

  if exists (
    select 1 from public.members
    where id = p_user_id
      and invite_consumed_at is not null
  ) then
    return true;
  end if;

  select * into v_row
  from public.invite_codes
  where code = v_code;

  if not found then
    return false;
  end if;

  perform set_config('makeit.allow_invite_consume', '1', true);

  if v_row.used_by = p_user_id then
    update public.members
    set invite_consumed_at = now()
    where id = p_user_id
      and invite_consumed_at is null;
    return true;
  end if;

  if v_row.expires_at is not null and v_row.expires_at <= now() then
    return false;
  end if;

  if v_row.uses_count >= v_row.max_uses then
    return false;
  end if;

  update public.invite_codes
  set uses_count = uses_count + 1,
      used_by    = p_user_id,
      used_at    = now()
  where code = v_code
    and uses_count = v_row.uses_count
    and (expires_at is null or expires_at > now())
    and uses_count < max_uses;

  if not found then
    return false;
  end if;

  update public.members
  set invite_consumed_at = now()
  where id = p_user_id;

  return true;
end;
$$;

revoke all on function public.try_consume_invite_for(uuid, text) from public, anon, authenticated;
-- service_role / postgres keep access via ownership; not granted to clients.

-- ---------------------------------------------------------------- *
-- 4) handle_new_user — same handle derivation as 0001, plus optional
--    consume from raw_user_meta_data. Never raises.
-- ---------------------------------------------------------------- *

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle   text;
  unique_handle text;
  i             integer := 0;
  v_invite      text;
begin
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

  insert into public.members (id, handle, email, display_name, invite_consumed_at)
  values (
    new.id,
    unique_handle,
    new.email,
    new.raw_user_meta_data->>'display_name',
    null
  );

  v_invite := coalesce(
    nullif(trim(new.raw_user_meta_data->>'invite'), ''),
    nullif(trim(new.raw_user_meta_data->>'invite_code'), ''),
    ''
  );

  if v_invite <> '' then
    perform public.try_consume_invite_for(new.id, v_invite);
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------- *
-- 5) RPCs for the authenticated app
-- ---------------------------------------------------------------- *

create or replace function public.consume_invite(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return public.try_consume_invite_for(auth.uid(), p_code);
end;
$$;

revoke all on function public.consume_invite(text) from public, anon;
grant execute on function public.consume_invite(text) to authenticated;

create or replace function public.is_current_user_invite_admitted()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where id = auth.uid()
      and invite_consumed_at is not null
  );
$$;

revoke all on function public.is_current_user_invite_admitted() from public, anon;
grant execute on function public.is_current_user_invite_admitted() to authenticated;

-- ---------------------------------------------------------------- *
-- 6) Restrictive RLS — un-admitted JWT sees nothing on member tables
-- ---------------------------------------------------------------- *

do $$
declare
  r record;
begin
  for r in
    select c.relname as tbl
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity
      and c.relname <> 'invite_codes'
  loop
    execute format(
      'drop policy if exists invite_admitted_only on public.%I',
      r.tbl
    );
    execute format(
      'create policy invite_admitted_only on public.%I
         as restrictive
         for all
         to authenticated
         using (public.is_current_user_invite_admitted())
         with check (public.is_current_user_invite_admitted())',
      r.tbl
    );
  end loop;
end
$$;

drop policy if exists invite_admitted_storage on storage.objects;
create policy invite_admitted_storage
  on storage.objects
  as restrictive
  for all
  to authenticated
  using (public.is_current_user_invite_admitted())
  with check (public.is_current_user_invite_admitted());
