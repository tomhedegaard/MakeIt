-- =================================================================
-- MakeIt // HQ — chat-media storage
-- =================================================================
-- Private bucket for chat attachments (images, audio messages,
-- video messages). Path layout: {conversation_id}/{message_id}.{ext}
-- so RLS can join through conversations to check participation.
--
-- Playback always via time-limited signed URLs — bucket is never
-- publicly listable.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,             -- private
  104857600,         -- 100 MB ceiling (covers reasonable video lengths)
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac',
    'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'
  ]
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------- *
-- RLS — storage.objects policies scoped to this bucket.
-- The first folder segment of every path is the conversation_id.
-- We join to conversations and require the auth user to be either
-- the member_id or the coach_id of that conversation.
-- ---------------------------------------------------------------- *

drop policy if exists "chat-media upload participant" on storage.objects;
create policy "chat-media upload participant"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-media'
    and exists (
      select 1
      from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.member_id = auth.uid() or c.coach_id = auth.uid())
    )
  );

drop policy if exists "chat-media read participant" on storage.objects;
create policy "chat-media read participant"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-media'
    and exists (
      select 1
      from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.member_id = auth.uid() or c.coach_id = auth.uid())
    )
  );

-- Sender can delete their own attachments (e.g. retract a message).
-- The "own" check goes through messages: we trust the sender_id on
-- the message row, since RLS on messages already enforces that
-- sender_id = auth.uid() at insert time.
drop policy if exists "chat-media delete own" on storage.objects;
create policy "chat-media delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-media'
    and exists (
      select 1
      from public.messages m
      where m.media_path = name
        and m.sender_id = auth.uid()
    )
  );
