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
commit;
