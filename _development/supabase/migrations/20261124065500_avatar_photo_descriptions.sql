-- Captions belong to one stored avatar, not the currently active profile_media row.
begin;
create table public.avatar_photo_descriptions (
 owner_vatra_id bigint not null references public.member_directory(vatra_id) on delete cascade,
 avatar_path text not null,
 caption text not null default '' check(char_length(caption)<=2000),
 primary key(owner_vatra_id,avatar_path),
 check(avatar_path ~ ('^'||owner_vatra_id::text||'/avatar/[A-Za-z0-9_-]+[.](jpg|jpeg|png|webp)$'))
);
alter table public.avatar_photo_descriptions enable row level security;
revoke all on public.avatar_photo_descriptions from public,anon,authenticated;
grant select,insert,update,delete on public.avatar_photo_descriptions to authenticated;
create function public.vatra_avatar_description_preserve_source() returns trigger
 language plpgsql set search_path='' as $$
begin
 if (new.owner_vatra_id,new.avatar_path) is distinct from (old.owner_vatra_id,old.avatar_path) then
  raise exception 'Avatar source is immutable' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function public.vatra_avatar_description_preserve_source() from public,anon,authenticated;
create trigger vatra_avatar_description_preserve_source before update on public.avatar_photo_descriptions
 for each row execute function public.vatra_avatar_description_preserve_source();
create policy avatar_description_read on public.avatar_photo_descriptions for select to authenticated using (
 exists(select 1 from storage.objects o where o.bucket_id='avatars' and o.name=avatar_path)
 and (
 exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=owner_vatra_id)
 or (not public.vatra_has_block_between(owner_vatra_id) and (
 coalesce((select p.profile_visibility from public.profile_preferences p where p.vatra_id=owner_vatra_id),'public')='public'
 or exists(select 1 from public.accounts a join public.friendships f on
 (f.requester_id=a.vatra_id and f.recipient_id=owner_vatra_id) or (f.recipient_id=a.vatra_id and f.requester_id=owner_vatra_id)
 where a.user_id=(select auth.uid()) and f.status='accepted')))));
create policy avatar_description_owner_insert on public.avatar_photo_descriptions for insert to authenticated with check (
 exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=owner_vatra_id)
 and exists(select 1 from storage.objects o where o.bucket_id='avatars' and o.name=avatar_path));
create policy avatar_description_owner_update on public.avatar_photo_descriptions for update to authenticated using (
 exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=owner_vatra_id))
 with check (exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=owner_vatra_id)
 and exists(select 1 from storage.objects o where o.bucket_id='avatars' and o.name=avatar_path));
create policy avatar_description_owner_delete on public.avatar_photo_descriptions for delete to authenticated using (
 exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=owner_vatra_id));
create policy avatar_description_active on public.avatar_photo_descriptions as restrictive for all to authenticated
 using((select vatra_admin_private.allowed())) with check((select vatra_admin_private.allowed()));
-- Preserve immutable Storage objects and comments during logical album moves.
alter table public.album_photos add column archived_at timestamptz;
alter table public.album_photos drop constraint album_photo_path_check;
alter table public.album_photos add constraint album_photo_path_check check (
 media_path ~ ('^'||owner_vatra_id::text||'/albums/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$'));
alter table public.album_photos add constraint album_photos_id_album_unique unique(id,album_id);
alter table public.photo_album_comments drop constraint photo_album_comments_photo_id_fkey;
alter table public.photo_album_comments add constraint photo_album_comments_photo_album_fkey
 foreign key(photo_id,album_id) references public.album_photos(id,album_id)
 on update cascade on delete cascade;
create or replace function public.vatra_album_photo_preserve_source()
returns trigger language plpgsql set search_path='' as $$
declare old_visibility text; new_visibility text;
begin
 if tg_op='INSERT' then
  if split_part(new.media_path,'/',3)<>new.album_id::text then
   raise exception 'New photo must use its album storage path' using errcode='23514';
  end if;
  return new;
 end if;
 if (new.id,new.owner_vatra_id,new.media_path,new.created_at)
    is distinct from (old.id,old.owner_vatra_id,old.media_path,old.created_at) then
  raise exception 'Photo source is immutable' using errcode='23514';
 end if;
 if new.album_id is distinct from old.album_id then
  select a.visibility into old_visibility from public.photo_albums a
   where a.id=old.album_id and a.owner_vatra_id=old.owner_vatra_id;
  select a.visibility into new_visibility from public.photo_albums a
   where a.id=new.album_id and a.owner_vatra_id=new.owner_vatra_id;
  if old_visibility is null or new_visibility is null then
   raise exception 'Album unavailable' using errcode='42501';
  end if;
  if array_position(array['private','friends','public'],new_visibility)>
     array_position(array['private','friends','public'],old_visibility) then
   raise exception 'Moving a photo must not expand its audience' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
drop trigger vatra_album_photo_preserve_source on public.album_photos;
create trigger vatra_album_photo_preserve_source before insert or update on public.album_photos
 for each row execute function public.vatra_album_photo_preserve_source();
revoke all on function public.vatra_album_photo_preserve_source() from public,anon,authenticated;
create policy vatra_album_photos_archive_visibility on public.album_photos
 as restrictive for select to authenticated using (
 archived_at is null or exists(select 1 from public.accounts a
  where a.user_id=(select auth.uid()) and a.vatra_id=owner_vatra_id));
create index album_photos_archive_owner_idx on public.album_photos(owner_vatra_id,archived_at desc,id)
 where archived_at is not null;
create index album_photos_active_album_idx on public.album_photos(album_id,created_at desc,id)
 where archived_at is null;
create or replace view public.photo_album_summaries with (security_invoker=true) as
select a.id,a.owner_vatra_id,a.title,a.description,a.visibility,a.comments_mode,
 a.show_in_photos,a.created_at,
 (select count(*)::integer from public.album_photos p where p.album_id=a.id and p.archived_at is null) as photo_count,
 (select p.media_path from public.album_photos p where p.album_id=a.id and p.archived_at is null
  order by p.created_at desc,p.id desc limit 1) as cover_path,a.is_personal
from public.photo_albums a;
revoke truncate,references,trigger on public.album_photos from public,anon,authenticated;
commit;
