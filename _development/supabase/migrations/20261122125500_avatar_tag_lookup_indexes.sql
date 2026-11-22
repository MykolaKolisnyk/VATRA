create index if not exists avatar_photo_tags_tagged_vatra_id_idx
 on public.avatar_photo_tags(tagged_vatra_id);
create index if not exists avatar_photo_tags_created_by_idx
 on public.avatar_photo_tags(created_by);
