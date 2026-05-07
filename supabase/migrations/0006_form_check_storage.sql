-- =================================================================
-- MakeIt // HQ — form-check video storage (Supabase Storage)
-- =================================================================
-- Private bucket for form-check videos. Members upload to their own
-- folder (path prefix = auth.uid()), read their own back; coaches
-- read all. Playback uses time-limited signed URLs — bucket is
-- never publicly listable.

-- ---------------------------------------------------------------- *
-- Bucket
-- ---------------------------------------------------------------- *
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'form-check-videos',
  'form-check-videos',
  false,                -- private
  104857600,            -- 100 MB
  array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------- *
-- RLS — storage.objects policies scoped to this bucket
-- ---------------------------------------------------------------- *

-- Members upload only into a folder named after their auth.uid()
drop policy if exists "form-check upload own" on storage.objects;
create policy "form-check upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'form-check-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Members read back their own uploads
drop policy if exists "form-check read own" on storage.objects;
create policy "form-check read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'form-check-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Coaches read every video in the bucket (additive — OR'd with own-read)
drop policy if exists "form-check coach read all" on storage.objects;
create policy "form-check coach read all"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'form-check-videos'
    and public.is_current_user_coach()
  );

-- Members can delete their own uploads (cleanup / replace)
drop policy if exists "form-check delete own" on storage.objects;
create policy "form-check delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'form-check-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
