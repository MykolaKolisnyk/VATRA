begin;
do $vatra$
declare signature text;
begin
 for signature in select unnest(array[
  'public.vatra_gifts_place_order(text)',
  'public.vatra_gifts_my_orders()',
  'public.vatra_gifts_admin_orders()',
  'public.vatra_gifts_admin_contact_order(bigint,text)',
  'public.vatra_gifts_admin_fulfill(bigint)'
 ]) loop
  if to_regprocedure(signature) is not null then
   execute format('revoke all on function %s from public,anon,authenticated',signature);
  end if;
 end loop;
end;
$vatra$;
commit;
