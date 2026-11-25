drop table public.admin_audit restrict;
alter schema vatra_admin_private rename to vatra_security_private;
alter table vatra_security_private.owner rename to site_owner;
create or replace function vatra_security_private.is_owner() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from vatra_security_private.site_owner where user_id=auth.uid())$$;
create or replace function public.vatra_maintenance_access() returns boolean language sql stable security invoker set search_path='' as $$select vatra_security_private.is_owner() and vatra_security_private.allowed()$$;
alter table public.profile_reports rename column admin_resolution to resolution;
alter table public.profile_reports rename column admin_resolved_at to resolved_at;
do $$
declare p record;
begin
 for p in select schemaname,tablename,policyname from pg_policies where schemaname='public' and policyname like 'vatra_admin_active_account%' loop
  execute format('alter policy %I on %I.%I rename to %I',p.policyname,p.schemaname,p.tablename,replace(p.policyname,'vatra_admin_active_account','vatra_active_account'));
 end loop;
end$$;
