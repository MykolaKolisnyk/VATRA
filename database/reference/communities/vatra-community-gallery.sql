-- VATRA community gallery data in public.app_data (Supabase, RLS).
-- Uses SECURITY DEFINER helpers to avoid recursively querying app_data from its own RLS policies.
create or replace function public.vatra_group_media_can_read(_group_id text)
returns boolean language sql stable security definer set search_path='' set row_security=off
as $vatra$
 select exists (
  select 1 from public.app_data g where g.path='groups/'||_group_id
   and (
    coalesce(g.value->>'visibility','public')<>'private'
    or public.vatra_data_is_group_member(_group_id,(select auth.uid()))
   )
 );
$vatra$;

create or replace function public.vatra_group_media_can_manage(_group_id text,_allow_mod boolean)
returns boolean language sql stable security definer set search_path='' set row_security=off
as $vatra$
 select (select auth.uid()) is not null and exists (
  select 1 from public.app_data g where g.path='groups/'||_group_id
  and (
   g.value->>'ownerUid'=(select auth.uid())::text
   or exists (select 1 from public.app_data a where a.path='groupAdmins/'||_group_id||'/'||(select auth.uid())::text and a.value='true'::jsonb)
   or (_allow_mod and coalesce((g.value->>'moderatorsCanPost')::boolean,true)
       and exists (select 1 from public.app_data m where m.path='groupModerators/'||_group_id||'/'||(select auth.uid())::text and m.value='true'::jsonb))
  )
 );
$vatra$;
revoke all on function public.vatra_group_media_can_read(text) from public,anon;
revoke all on function public.vatra_group_media_can_manage(text,boolean) from public,anon;
grant execute on function public.vatra_group_media_can_read(text) to authenticated,anon;
grant execute on function public.vatra_group_media_can_manage(text,boolean) to authenticated;

drop policy if exists vatra_group_media_read on public.app_data;
create policy vatra_group_media_read on public.app_data for select to anon,authenticated
 using (path ~ '^groupMedia/[^/]+/[^/]+$'
    and public.vatra_group_media_can_read(split_part(path,'/',2)));

drop policy if exists vatra_group_media_add on public.app_data;
create policy vatra_group_media_add on public.app_data for insert to authenticated
 with check(
   path ~ '^groupMedia/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$'
   and jsonb_typeof(value)='object'
   and value->>'authorUid'=(select auth.uid())::text
   and value->>'kind' in ('photo','video')
   and length(value::text)<4000
   and value->>'url' ~ '^https://[^ ]{10,1800}$'
   and public.vatra_group_media_can_manage(split_part(path,'/',2),true)
 );

drop policy if exists vatra_group_media_remove on public.app_data;
create policy vatra_group_media_remove on public.app_data for delete to authenticated
 using (
   path ~ '^groupMedia/[^/]+/[^/]+$'
   and (
     value->>'authorUid'=(select auth.uid())::text
     or public.vatra_group_media_can_manage(split_part(path,'/',2),false)
   )
 );
-- No client-side update policy. Deletion of a gallery entry does not remove
-- its Storage object: other posts may still refer to the same file.
