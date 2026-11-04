-- VATRA · private gift removal controls, 2026-11-03
-- Run AFTER app-data-schema.sql and vatra-gifts.sql.
-- Server-side ownership is mandatory. Official gifts are deleted only at owner request.
begin;

create or replace function public.vatra_gifts_discard(_item_id uuid)
returns boolean language plpgsql security definer set search_path='' set row_security=off
as $discard$
declare actor uuid:=auth.uid(); removed integer;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ';end if;
 if _item_id is null then raise exception 'Не вибрано подарунок';end if;
 delete from public.vatra_gift_instances where id=_item_id and owner_uid=actor;
 get diagnostics removed=row_count;
 if removed<>1 then raise exception 'Подарунок не знайдено у вашій колекції';end if;
 return true;
end;
$discard$;

create or replace function public.vatra_gifts_discard_all()
returns integer language plpgsql security definer set search_path='' set row_security=off
as $discard$
declare actor uuid:=auth.uid(); removed integer;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ';end if;
 delete from public.vatra_gift_instances where owner_uid=actor;
 get diagnostics removed=row_count;
 return removed;
end;
$discard$;


revoke all on function public.vatra_gifts_discard(uuid),public.vatra_gifts_discard_all() from public,anon;
grant execute on function public.vatra_gifts_discard(uuid),public.vatra_gifts_discard_all() to authenticated;
commit;
