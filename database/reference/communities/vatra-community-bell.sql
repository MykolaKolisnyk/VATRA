begin;
create or replace function public.vatra_group_notify_access(_path text,_value jsonb)
returns boolean language sql stable security definer
set search_path='' set row_security=off as $vatra$
select auth.uid() is not null
 and _path ~ '^groupNotifications/[0-9a-fA-F-]{36}/[^/]+$'
 and split_part(_path,'/',2)=auth.uid()::text
 and jsonb_typeof(_value)='object';
$vatra$;
revoke all on function public.vatra_group_notify_access(text,jsonb) from public,anon;
grant execute on function public.vatra_group_notify_access(text,jsonb) to authenticated;
drop policy if exists vatra_group_notify_select on public.app_data;
create policy vatra_group_notify_select on public.app_data for select to authenticated
using(public.vatra_group_notify_access(path,value));
drop policy if exists vatra_group_notify_insert on public.app_data;
create policy vatra_group_notify_insert on public.app_data for insert to authenticated
with check(public.vatra_group_notify_access(path,value));
drop policy if exists vatra_group_notify_update on public.app_data;
create policy vatra_group_notify_update on public.app_data for update to authenticated
using(public.vatra_group_notify_access(path,value))
with check(public.vatra_group_notify_access(path,value));
drop policy if exists vatra_group_notify_delete on public.app_data;
create policy vatra_group_notify_delete on public.app_data for delete to authenticated
using(public.vatra_group_notify_access(path,value));
commit;