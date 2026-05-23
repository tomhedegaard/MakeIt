-- =================================================================
-- MakeIt // HQ — exercise demo-asset storage (Supabase Storage)
-- =================================================================
-- Public bucket for exercise demo loops. Each exercise has a trio:
--   {slug}.webm, {slug}.mp4, {slug}-poster.jpg
-- Library content shown to every member — public so <video src>
-- loads directly and the CDN can cache it. Only coaches can write.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-demos',
  'exercise-demos',
  true,                 -- public read
  5242880,              -- 5 MB (brief targets <400 KB/loop)
  array['video/webm', 'video/mp4', 'image/jpeg']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read on object rows. (Public file serving on a public bucket
-- does not consult this — this only governs storage.objects row visibility.)
drop policy if exists "exercise-demos public read" on storage.objects;
create policy "exercise-demos public read"
  on storage.objects for select
  to public
  using (bucket_id = 'exercise-demos');

-- Coaches insert. upsert:true on the client needs INSERT + UPDATE.
drop policy if exists "exercise-demos coach insert" on storage.objects;
create policy "exercise-demos coach insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'exercise-demos'
    and public.is_current_user_coach()
  );

drop policy if exists "exercise-demos coach update" on storage.objects;
create policy "exercise-demos coach update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'exercise-demos'
    and public.is_current_user_coach()
  )
  with check (
    bucket_id = 'exercise-demos'
    and public.is_current_user_coach()
  );

drop policy if exists "exercise-demos coach delete" on storage.objects;
create policy "exercise-demos coach delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'exercise-demos'
    and public.is_current_user_coach()
  );
