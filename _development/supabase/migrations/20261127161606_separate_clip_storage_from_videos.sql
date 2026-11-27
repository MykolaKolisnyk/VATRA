insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('videos','videos',false,52428800,array['video/mp4','video/webm']),
       ('clips','clips',false,52428800,array['video/mp4','video/webm'])
on conflict (id) do nothing;

alter table public.feed_posts
 drop constraint vatra_clip_single_video,
 add constraint vatra_clip_single_video check (
  not is_clip or coalesce((
   media_kind is null and media_path is null and shared_post_id is null
   and jsonb_array_length(media_items)=1
   and media_items->0->>'media_kind'='video'
   and split_part(media_items->0->>'media_path','/',1)=author_vatra_id::text
   and (media_items->0->>'media_path') ~ '^[1-9][0-9]*/clips/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm)$'
  ),false)
 ),
 add constraint vatra_regular_feed_no_clip_path check (
  is_clip or not jsonb_path_exists(media_items,'$[*] ? (@.media_path like_regex "^[1-9][0-9]*/clips/")')
 );
alter table public.community_posts add constraint vatra_community_no_clip_path
 check (not jsonb_path_exists(media_items,'$[*] ? (@.media_path like_regex "^[1-9][0-9]*/clips/")'));
alter table public.scheduled_feed_posts add constraint vatra_scheduled_no_clip_path
 check (not jsonb_path_exists(media_items,'$[*] ? (@.media_path like_regex "^[1-9][0-9]*/clips/")'));

create policy clips_upload_owner on storage.objects for insert to authenticated
with check (
 bucket_id='clips'
 and name ~ '^[1-9][0-9]*/clips/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm)$'
 and exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id::text=split_part(name,'/',1))
);
create policy clips_read_allowed on storage.objects for select to authenticated
using (
 bucket_id='clips'
 and name ~ '^[1-9][0-9]*/clips/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm)$'
 and (
  exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id::text=split_part(objects.name,'/',1))
  or exists (select 1 from public.feed_posts p where p.is_clip and p.archived_at is null and p.author_vatra_id::text=split_part(objects.name,'/',1) and p.media_items->0->>'media_path'=objects.name)
 )
);
create policy clips_delete_owner on storage.objects for delete to authenticated
using (
 bucket_id='clips'
 and name ~ '^[1-9][0-9]*/clips/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm)$'
 and exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id::text=split_part(objects.name,'/',1))
);
