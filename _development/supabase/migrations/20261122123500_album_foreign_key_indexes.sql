-- Cover the album-related foreign keys flagged by Supabase Performance Advisor.
create index if not exists album_photos_owner_vatra_id_idx
 on public.album_photos(owner_vatra_id);
create index if not exists photo_album_comments_author_id_idx
 on public.photo_album_comments(author_id);
create index if not exists photo_album_comments_author_vatra_id_idx
 on public.photo_album_comments(author_vatra_id);
