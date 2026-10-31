-- VATRA community galleries: direct media entries in public.app_data.
-- All media stored in Supabase Storage; app_data contains URLs/metadata only.
-- Run after app-data-schema.sql. Existing RLS remains active.
drop policy if exists vatra_group_media_read on public.app_data;
create policy vatra_group_media_read on public.app_data for select to anon,authenticated
using (
  path ~ '^groupMedia/[^/]+/[^/]+$'
  and exists (
    select 1 from public.app_data g where g.path='groups/'||split_part(path,'/',2)
      and (
        coalesce(g.value->>'visibility','public')<>'private'
        or public.vatra_data_is_group_member(split_part(path,'/',2),(select auth.uid()))
      )
  )
);
drop policy if exists vatra_group_media_add on public.app_data;
create policy vatra_group_media_add on public.app_data for insert to authenticated
with check(
  path ~ '^groupMedia/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$'
  and value->>'authorUid'=(select auth.uid())::text
  and value->>'kind' in ('photo','video')
  and jsonb_typeof(value)='object'
  and length(value::text)<4000
  and value->>'url' ~ '^https://[^ ]{10,1800}$'
  and (
    public.vatra_data_is_group_owner(split_part(path,'/',2),(select auth.uid()))
    or exists (select 1 from public.app_data a where a.path='groupAdmins/'||split_part(path,'/',2)||'/'||(select auth.uid())::text and a.value='true'::jsonb)
    or exists (select 1 from public.app_data a where a.path='groupModerators/'||split_part(path,'/',2)||'/'||(select auth.uid())::text and a.value='true'::jsonb
      and exists (select 1 from public.app_data g where g.path='groups/'||split_part(path,'/',2)
        and coalesce((g.value->>'moderatorsCanPost')::boolean,true)))
  )
);
drop policy if exists vatra_group_media_remove on public.app_data;
create policy vatra_group_media_remove on public.app_data for delete to authenticated
using (
 path ~ '^groupMedia/[^/]+/[^/]+$'
 and (
  value->>'authorUid'=(select auth.uid())::text
  or public.vatra_data_is_group_owner(split_part(path,'/',2),(select auth.uid()))
  or exists (select 1 from public.app_data a where a.path='groupAdmins/'||split_part(path,'/',2)||'/'||(select auth.uid())::text and a.value='true'::jsonb)
 )
);
-- No update policy: media entries are append/remove, avoiding concurrent overwrites.
-- Group album titles and the default post-gallery option are stored on groups/<id>
-- and already follow the group owner/admin RLS rules.
