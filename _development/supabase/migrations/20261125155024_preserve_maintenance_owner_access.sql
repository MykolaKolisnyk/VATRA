create function public.vatra_maintenance_access() returns boolean language sql stable security invoker set search_path='' as $$select vatra_admin_private.is_owner() and vatra_admin_private.allowed()$$;
revoke all on function public.vatra_maintenance_access() from public,anon,authenticated;
grant execute on function public.vatra_maintenance_access() to authenticated;
