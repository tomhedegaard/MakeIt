-- =================================================================
-- MakeIt // HQ — session actions (Reps award)
-- =================================================================
-- Adds a SECURITY DEFINER function that lets a member award themselves
-- Reps when they finish their own session — without weakening RLS on
-- the reps_transactions ledger.
-- Idempotent: calling it twice for the same session is a no-op.

create or replace function public.award_session_reps(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_amount    integer := 250;
begin
  -- Only the session's owner can award; only after the session is completed.
  select member_id into v_member_id
  from public.sessions
  where id = p_session_id
    and member_id = auth.uid()
    and status = 'completed';

  if v_member_id is null then
    return 0;
  end if;

  -- Idempotent: if a transaction already exists for this session, no-op.
  if exists (
    select 1 from public.reps_transactions
    where reference_type = 'session'
      and reference_id   = p_session_id
  ) then
    return 0;
  end if;

  insert into public.reps_transactions (member_id, delta, reason, reference_type, reference_id)
  values (v_member_id, v_amount, 'Session completed', 'session', p_session_id);

  return v_amount;
end;
$$;

grant execute on function public.award_session_reps(uuid) to authenticated;

-- ---------------------------------------------------------------
-- Helper: validate an invite code from the anon role at sign-up
-- (so we can reject obviously invalid codes before sending mail).
-- ---------------------------------------------------------------
create or replace function public.is_invite_valid(p_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invite_codes
    where code = upper(p_code)
      and (expires_at is null or expires_at > now())
      and uses_count < max_uses
  );
$$;

grant execute on function public.is_invite_valid(text) to anon, authenticated;
