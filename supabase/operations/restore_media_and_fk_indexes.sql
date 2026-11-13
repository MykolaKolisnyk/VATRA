-- VATRA production repair, applied 2026-11-13 via Supabase migrations.
-- Run only when provisioning an equivalent environment. This file is a
-- re-runnable record, not a replacement for existing historical migrations.
-- Keep established bucket IDs until all deployed clients are migrated.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
 ('vatra-avatars','vatra-avatars',true,6291456,array['image/jpeg','image/png','image/webp']),
 ('vatra-covers','vatra-covers',true,6291456,array['image/jpeg','image/png','image/webp']),
 ('vatra-post-images','vatra-post-images',false,6291456,array['image/jpeg','image/png','image/webp']),
 ('vatra-videos','vatra-videos',false,52428800,array['video/mp4','video/webm'])
on conflict (id) do nothing;

do $$
begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_image_read_public') then
  create policy profile_image_read_public on storage.objects for select to anon,authenticated
  using(bucket_id in ('vatra-avatars','vatra-covers'));
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_image_upload_owner') then
  create policy profile_image_upload_owner on storage.objects for insert to authenticated
  with check (
   ((bucket_id='vatra-avatars' and (storage.foldername(name))[2]='avatar')
    or (bucket_id='vatra-covers' and (storage.foldername(name))[2]='cover'))
   and array_length(storage.foldername(name),1)=2
   and (storage.foldername(name))[1] in (
    select a.vatra_id::text from public.accounts a where a.user_id=(select auth.uid())
   )
  );
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_image_delete_owner') then
  create policy profile_image_delete_owner on storage.objects for delete to authenticated
  using(
   bucket_id in ('vatra-avatars','vatra-covers')
   and (storage.foldername(name))[1] in (
    select a.vatra_id::text from public.accounts a where a.user_id=(select auth.uid())
   )
  );
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='attachment_upload_owner') then
  create policy attachment_upload_owner on storage.objects for insert to authenticated
  with check (
   bucket_id in ('vatra-post-images','vatra-videos')
   and (storage.foldername(name))[2] in ('posts','stories','comments')
   and array_length(storage.foldername(name),1)=2
   and (storage.foldername(name))[1] in (
    select a.vatra_id::text from public.accounts a where a.user_id=(select auth.uid())
   )
  );
 end if;
end $$;

-- Referenced by Auth deletion/cascade and member-oriented lookups.
create index if not exists communities_owner_lookup_idx on public.communities(owner_id);
create index if not exists feed_posts_auth_owner_idx on public.feed_posts(author_id);
create index if not exists notification_actor_lookup_idx on public.member_notifications(actor_vatra_id);
create index if not exists avatar_comments_auth_author_idx on public.vatra_avatar_comments(author_id);
create index if not exists avatar_likes_auth_liker_idx on public.vatra_avatar_likes(liker_id);
create index if not exists post_comments_parent_fk_idx on public.vatra_post_comments(parent_comment_id) where parent_comment_id is not null;
create index if not exists post_like_members_liker_fk_idx on public.vatra_post_like_members(liker_vatra_id);
