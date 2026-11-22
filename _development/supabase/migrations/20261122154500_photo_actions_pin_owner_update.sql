begin;
alter table public.album_photos add column if not exists pinned_at timestamptz;
create index if not exists album_photos_album_pinned_idx
 on public.album_photos(album_id,pinned_at desc nulls last,created_at desc,id desc);
create policy vatra_album_photos_owner_update on public.album_photos
 for update to authenticated
 using (exists(
  select 1 from public.accounts me
  where me.user_id=(select auth.uid())
    and me.vatra_id=album_photos.owner_vatra_id
 ))
 with check (exists(
  select 1 from public.accounts me
  join public.photo_albums album on album.owner_vatra_id=me.vatra_id
  where me.user_id=(select auth.uid()) and
    album.id=album_photos.album_id and
    me.vatra_id=album_photos.owner_vatra_id
 ));
create or replace function public.vatra_album_photo_preserve_source()
returns trigger language plpgsql
set search_path=public as $$
begin
 if (new.id,new.album_id,new.owner_vatra_id,new.media_path,new.created_at)
    is distinct from
    (old.id,old.album_id,old.owner_vatra_id,old.media_path,old.created_at) then
  raise exception 'Photo source is immutable';
 end if;
 return new;
end $$;
create trigger vatra_album_photo_preserve_source
 before update on public.album_photos
 for each row execute function public.vatra_album_photo_preserve_source();
commit;