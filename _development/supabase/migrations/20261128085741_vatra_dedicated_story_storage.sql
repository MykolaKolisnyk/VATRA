insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('stories','stories',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']);

alter table public.stories
 drop constraint vatra_stories_media_fields_check,
 add constraint vatra_stories_media_fields_check check ((
   (media_kind is null and media_path is null)
   or (media_kind='image' and media_path is not null and media_path ~ ('^'||author_vatra_id::text||'/(stories|story-media)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$'))
   or (media_kind='video' and media_path is not null and media_path ~ ('^'||author_vatra_id::text||'/(stories|story-media)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm)$'))
 ) is true);

create policy stories_bucket_upload_owner on storage.objects for insert to authenticated
with check (bucket_id='stories' and name ~ '^[1-9][0-9]{0,18}/story-media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp|mp4|webm)$' and exists (select 1 from public.accounts a where a.user_id = (select auth.uid()) and a.vatra_id::text = split_part(objects.name,'/',1)));

create policy stories_bucket_read_allowed on storage.objects for select to authenticated
using (bucket_id='stories' and name ~ '^[1-9][0-9]{0,18}/story-media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp|mp4|webm)$' and (
 exists (select 1 from public.accounts a where a.user_id = (select auth.uid()) and a.vatra_id::text = split_part(objects.name,'/',1))
 or exists (select 1 from public.stories s where s.media_path=objects.name and s.author_vatra_id::text=split_part(objects.name,'/',1)
  and ((s.media_kind='image' and storage.extension(objects.name) in ('jpg','png','webp'))
    or (s.media_kind='video' and storage.extension(objects.name) in ('mp4','webm'))))
));

create policy stories_bucket_delete_owner on storage.objects for delete to authenticated
using (bucket_id='stories' and name ~ '^[1-9][0-9]{0,18}/story-media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp|mp4|webm)$' and exists (select 1 from public.accounts a where a.user_id = (select auth.uid()) and a.vatra_id::text = split_part(objects.name,'/',1)));
