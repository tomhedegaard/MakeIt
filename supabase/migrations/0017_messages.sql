-- =================================================================
-- MakeIt // HQ — chat (1:1 messages between member and coach)
-- =================================================================
-- Asymmetric capability model:
--   Coach side:  text, image, audio, video
--   Member side: text, image, audio   (no video)
--
-- The constraint is enforced at THREE layers, defense in depth:
--   1. RLS insert policy below — DB rejects member-sent video
--   2. Server action — validates kind before insert
--   3. Composer UI — hides the video attach button for members
--
-- One conversation per (member, coach) pair. We assume a single head
-- coach for v1 (members.is_coach=true, typically MUNK-01); the
-- conversations.coach_id column is there so a future multi-coach
-- world doesn't need a schema migration.

/* ---------------------------------------------------------------- *
 * conversations
 * ---------------------------------------------------------------- */

create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.members(id) on delete cascade,
  coach_id        uuid not null references public.members(id) on delete restrict,
  created_at      timestamptz not null default now(),
  -- Mirrored from messages.created_at on insert (via trigger below)
  -- so the inbox list can sort by recency without joining.
  last_message_at timestamptz
);

-- One thread per (member, coach). A future feature could relax this
-- to "one active thread per pair" with archiving — keep the constraint
-- simple for v1.
create unique index if not exists idx_conversations_pair
  on public.conversations(member_id, coach_id);

create index if not exists idx_conversations_recent
  on public.conversations(last_message_at desc nulls last);

/* ---------------------------------------------------------------- *
 * messages
 * ---------------------------------------------------------------- */

create table if not exists public.messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references public.conversations(id) on delete cascade,
  sender_id           uuid not null references public.members(id) on delete cascade,
  kind                text not null check (kind in ('text','image','audio','video')),
  -- For text: the body. For media: optional caption.
  body                text,
  -- Storage path inside the chat-media bucket. Null for kind='text'.
  media_path          text,
  media_mime          text,
  -- Audio/video duration in seconds — surfaced on the bubble so the
  -- recipient knows what they're committing to before they tap play.
  media_duration_sec  integer,
  -- Set when the recipient last opens the thread; powers the
  -- inbox unread badge and the "Set" tick on the sender's bubble.
  read_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists idx_messages_conversation
  on public.messages(conversation_id, created_at);
-- For the inbox unread query (count where read_at is null and the
-- recipient is the requesting user — sender_id is the coach's id
-- when the recipient is a member, and vice versa).
create index if not exists idx_messages_unread
  on public.messages(conversation_id, read_at) where read_at is null;

/* ---------------------------------------------------------------- *
 * Mirror last_message_at onto the conversation
 * ---------------------------------------------------------------- */

create or replace function public.bump_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_bump_last on public.messages;
create trigger messages_bump_last
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

/* ---------------------------------------------------------------- *
 * RLS
 * ---------------------------------------------------------------- */

alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- Conversations: a member sees their own row; a coach sees all rows
-- where they're the coach_id. We keep this symmetric (no special
-- "head coach sees all" — the coach-id binding is already specific).
create policy "conv read participant"
  on public.conversations for select to authenticated
  using (member_id = auth.uid() or coach_id = auth.uid());

-- Members can create their own thread with the head coach. The head
-- coach can also create on behalf of a member (e.g. proactively
-- reaching out from /coach/members/[id]).
create policy "conv insert participant"
  on public.conversations for insert to authenticated
  with check (
    member_id = auth.uid()
    or (coach_id = auth.uid() and public.is_current_user_coach())
  );

-- Messages: visibility scoped to participants of the conversation.
create policy "messages read participant"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.member_id = auth.uid() or c.coach_id = auth.uid())
    )
  );

-- Insert: sender must be the auth user AND part of the conversation
-- AND (kind != 'video' OR sender is a coach). The kind check here is
-- the database-level fence preventing a malicious member from
-- bypassing the UI to send video.
create policy "messages insert sender"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.member_id = auth.uid() or c.coach_id = auth.uid())
    )
    and (
      kind in ('text','image','audio')
      or (kind = 'video' and public.is_current_user_coach())
    )
  );

-- Update: only the recipient can mark read_at (i.e. set read_at on
-- messages where they're NOT the sender).
create policy "messages mark read"
  on public.messages for update to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.member_id = auth.uid() or c.coach_id = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.member_id = auth.uid() or c.coach_id = auth.uid())
    )
  );

/* ---------------------------------------------------------------- *
 * Realtime — opt-in by adding the table to the supabase_realtime
 * publication. Without this, the postgres_changes channel doesn't
 * fire for inserts on these tables.
 * ---------------------------------------------------------------- */

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- alter publication ... add table is idempotent only via a try/catch
    begin
      execute 'alter publication supabase_realtime add table public.messages';
    exception when duplicate_object then null;
    end;
    begin
      execute 'alter publication supabase_realtime add table public.conversations';
    exception when duplicate_object then null;
    end;
  end if;
end$$;
