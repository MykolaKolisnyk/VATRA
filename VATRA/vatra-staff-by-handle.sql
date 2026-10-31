-- VATRA: owner appoints and removes staff by current unique @handle.
-- The role is always tied to auth.users.id, so handle changes preserve it.
begin;
create or replace function public.vatra_owner_set_staff_by_handle(_handle text,_role text)
returns jsonb language plpgsql security definer
set search_path='' set row_security=off as $staff$
declare normalized text; resolved uuid; result jsonb;
begin
 if public.vatra_staff_role()<>'owner' then
  raise exception 'Лише власник ВАТРИ може призначати працівників.';
 end if;
 normalized:=lower(btrim(regexp_replace(coalesce(_handle,''),'^@','')));
 if normalized !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then
  raise exception 'Введіть чинний @псевдонім користувача.';
 end if;
 select split_part(path,'/',2)::uuid into resolved
 from public.app_data
 where path ~ '^publicProfiles/[0-9a-fA-F-]{36}$'
   and lower(btrim(value->>'handle'))=normalized
 limit 1;
 if resolved is null then raise exception 'Акаунт @% не знайдено.',normalized; end if;
 result:=public.vatra_owner_set_staff(resolved,_role);
 return jsonb_build_object('user_id',resolved,'handle',normalized,'role',_role,'result',result);
end $staff$;
revoke all on function public.vatra_owner_set_staff_by_handle(text,text) from PUBLIC,anon;
grant execute on function public.vatra_owner_set_staff_by_handle(text,text) to authenticated;
commit;