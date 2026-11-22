create or replace view public.photo_album_summaries
with (security_invoker = true)
as
select a.id, a.owner_vatra_id, a.title, a.description,
 a.visibility, a.comments_mode, a.show_in_photos, a.created_at,
 (select count(*)::integer from public.album_photos p where p.album_id=a.id) as photo_count,
 (select p.media_path from public.album_photos p
  where p.album_id=a.id order by p.created_at desc, p.id desc limit 1) as cover_path
from public.photo_albums a;

revoke all on public.photo_album_summaries from public, anon;
grant select on public.photo_album_summaries to authenticated;
