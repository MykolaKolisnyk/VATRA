-- VATRA dedicated public media buckets. Existing vatra-media URLs remain valid.
-- Story uploads remain in the separate PRIVATE bucket vatra-stories.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
 ('vatra-photos','vatra-photos',true,15728640,ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']),
 ('vatra-videos','vatra-videos',true,52428800,ARRAY['video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v']),
 ('vatra-avatars','vatra-avatars',true,15728640,ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']),
 ('vatra-covers','vatra-covers',true,15728640,ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']),
 ('vatra-gifts','vatra-gifts',true,15728640,ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do nothing;

drop policy if exists vatra_split_public_read on storage.objects;
create policy vatra_split_public_read on storage.objects for select to anon,authenticated
 using (bucket_id in ('vatra-photos','vatra-videos','vatra-avatars','vatra-covers','vatra-gifts'));

drop policy if exists vatra_split_owner_insert on storage.objects;
create policy vatra_split_owner_insert on storage.objects for insert to authenticated
 with check ((storage.foldername(name))[1]=(select auth.uid())::text and (
  (bucket_id='vatra-photos' and (storage.foldername(name))[2] in ('posts','comments','community-photos')) or
  (bucket_id='vatra-videos' and (storage.foldername(name))[2] in ('videos','community-videos')) or
  (bucket_id='vatra-avatars' and (storage.foldername(name))[2]='avatars') or
  (bucket_id='vatra-covers' and (storage.foldername(name))[2]='covers') or
  (bucket_id='vatra-gifts' and (storage.foldername(name))[2]='gifts')
 ));

drop policy if exists vatra_split_owner_delete on storage.objects;
create policy vatra_split_owner_delete on storage.objects for delete to authenticated
 using (bucket_id in ('vatra-photos','vatra-videos','vatra-avatars','vatra-covers','vatra-gifts')
  and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists vatra_split_owner_update on storage.objects;
create policy vatra_split_owner_update on storage.objects for update to authenticated
 using (bucket_id in ('vatra-photos','vatra-videos','vatra-avatars','vatra-covers','vatra-gifts')
  and (storage.foldername(name))[1]=(select auth.uid())::text)
 with check (bucket_id in ('vatra-photos','vatra-videos','vatra-avatars','vatra-covers','vatra-gifts')
  and (storage.foldername(name))[1]=(select auth.uid())::text);
