-- VATRA per-photo discussion and implicit personal album. Existing records untouched.
begin;

alter table public.photo_albums
 add column if not exists is_personal boolean not null default false;
create unique index if not exists photo_albums_one_personal_per_owner_idx
 on public.photo_albums(owner_vatra_id) where is_personal;

alter table public.photo_album_comments
 add column if not exists photo_id uuid references public.album_photos(id) on delete cascade;
create index if not exists photo_album_comments_photo_newest_idx
 on public.photo_album_comments(photo_id,created_at desc,id desc)
 where photo_id is not null;

-- A comment on an individual photograph must refer to a photograph
-- belonging to that same album; caller's original album RLS remains enforced.
create policy vatra_album_comment_photo_matches_album on public.photo_album_comments
 as restrictive for all to authenticated
 using (
  photo_id is null or exists(
   select 1 from public.album_photos p
   where p.id=photo_id and p.album_id=photo_album_comments.album_id
  )
 )
 with check (
  photo_id is null or exists(
   select 1 from public.album_photos p
   where p.id=photo_id and p.album_id=photo_album_comments.album_id
  )
 );

-- Likes belong to one individual photo, not to the containing album.
create table if not exists public.album_photo_likes (
 photo_id uuid not null references public.album_photos(id) on delete cascade,
 liker_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(photo_id,liker_id)
);
create index if not exists album_photo_likes_liker_id_idx
 on public.album_photo_likes(liker_id);
alter table public.album_photo_likes enable row level security;
revoke all on public.album_photo_likes from anon;
grant select,insert,delete on public.album_photo_likes to authenticated;
create policy vatra_album_photo_likes_read on public.album_photo_likes
 for select to authenticated using (
  exists(select 1 from public.album_photos p where p.id=photo_id)
 );
create policy vatra_album_photo_likes_insert on public.album_photo_likes
 for insert to authenticated with check (
  liker_id=(select auth.uid())
  and exists(select 1 from public.album_photos p where p.id=photo_id)
 );
create policy vatra_album_photo_likes_remove on public.album_photo_likes
 for delete to authenticated using (liker_id=(select auth.uid()));
create policy vatra_album_photo_likes_active on public.album_photo_likes
 as restrictive for all to authenticated
 using ((select vatra_admin_private.allowed()))
 with check ((select vatra_admin_private.allowed()));

-- Append new field at the end to preserve existing PostgREST consumers.
create or replace view public.photo_album_summaries
 with (security_invoker = true) as
select a.id,a.owner_vatra_id,a.title,a.description,a.visibility,
 a.comments_mode,a.show_in_photos,a.created_at,
 (select count(*)::integer from public.album_photos p
  where p.album_id=a.id) as photo_count,
 (select p.media_path from public.album_photos p
  where p.album_id=a.id order by p.created_at desc,p.id desc limit 1) as cover_path,
 a.is_personal
from public.photo_albums a;
revoke all on public.photo_album_summaries from public,anon;
grant select on public.photo_album_summaries to authenticated;
commit;
