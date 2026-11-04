-- VATRA private Stories. Run in Supabase SQL Editor in the production project.
-- Unlike the existing vatra-media bucket, this bucket is intentionally PRIVATE.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vatra-stories','vatra-stories',false,52428800,
 array['image/jpeg','image/png','image/webp','image/gif','image/avif',
       'video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update set public=false;
drop policy if exists vatra_stories_owner_insert on storage.objects;
create policy vatra_stories_owner_insert on storage.objects for insert to authenticated
with check (
 bucket_id='vatra-stories'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and (storage.foldername(name))[2]='stories'
);
drop policy if exists vatra_stories_authorized_select on storage.objects;
create policy vatra_stories_authorized_select on storage.objects for select to authenticated
using (
 bucket_id='vatra-stories'
 and (storage.foldername(name))[2]='stories'
 and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or exists (
   select 1 from public.app_data p
   where p.path='posts/'||split_part(split_part(name,'/',3),'.',1)
     and p.value->>'kind'='story'
     and p.value->>'mediaBucket'='vatra-stories'
     and p.value->>'mediaPath'=name
     and p.value->>'authorUid'=(storage.foldername(name))[1]
     and (p.value->>'createdAt') ~ '^[0-9]{13}$'
     and (p.value->>'expiresAt') ~ '^[0-9]{13}$'
     and (p.value->>'expiresAt')::bigint > floor(extract(epoch from now())*1000)::bigint
     and public.vatra_data_can_read_post(
       split_part(split_part(name,'/',3),'.',1),(select auth.uid())
     )
  )
 )
);
drop policy if exists vatra_stories_owner_delete on storage.objects;
create policy vatra_stories_owner_delete on storage.objects for delete to authenticated
using (
 bucket_id='vatra-stories' and (storage.foldername(name))[1]=(select auth.uid())::text
);
-- No update policy: every uploaded Stories file is immutable.
