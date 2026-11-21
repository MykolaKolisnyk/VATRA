-- VATRA: multi-file post galleries. Applied to project rjasunoawrxvetwadylh.
-- Retains existing posts; no user data is deleted.
alter table public.feed_posts
 add column if not exists media_items jsonb not null default '[]'::jsonb;
alter table public.vatra_community_posts
 add column if not exists media_items jsonb not null default '[]'::jsonb;

-- A post may carry 12 assets total, including no more than 4 videos.
alter table public.feed_posts add constraint feed_posts_gallery_limits
 check (jsonb_typeof(media_items)='array'
  and jsonb_array_length(media_items)<=12
  and jsonb_array_length(jsonb_path_query_array(media_items,'$[*] ? (@.media_kind == "video")'))<=4);
alter table public.vatra_community_posts add constraint vatra_community_posts_gallery_limits
 check (jsonb_typeof(media_items)='array'
  and jsonb_array_length(media_items)<=12
  and jsonb_array_length(jsonb_path_query_array(media_items,'$[*] ? (@.media_kind == "video")'))<=4);

-- Viewer must have RLS-based access to the parent post. A referenced
-- object must also belong to that post's author and match its media bucket.
create policy vatra_gallery_media_read_allowed
on storage.objects for select to authenticated using (
 bucket_id in ('vatra-post-images','vatra-videos') and (
  exists (
   select 1 from public.feed_posts p
   where split_part(objects.name,'/',1)=p.author_vatra_id::text
    and exists (
     select 1 from jsonb_array_elements(p.media_items) item
     where item->>'media_path'=objects.name
      and ((item->>'media_kind'='image' and bucket_id='vatra-post-images')
        or (item->>'media_kind'='video' and bucket_id='vatra-videos'))
    )
  )
  or exists (
   select 1 from public.vatra_community_posts p
   where split_part(objects.name,'/',1)=p.author_vatra_id::text
    and exists (
     select 1 from jsonb_array_elements(p.media_items) item
     where item->>'media_path'=objects.name
      and ((item->>'media_kind'='image' and bucket_id='vatra-post-images')
        or (item->>'media_kind'='video' and bucket_id='vatra-videos'))
    )
  )
 )
);
