-- VATRA · private gift removal controls, 2026-11-03
-- Run AFTER app-data-schema.sql, vatra-gifts.sql, and latest vatra-gifts-creators.sql.
-- Server-side ownership is mandatory. Official gifts are deleted only at owner request.
-- Creator gifts are SOFT deleted: order and seller history are preserved.
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

alter table public.vatra_creator_gifts add column if not exists deleted_at timestamptz;

create or replace function public.vatra_creator_gifts_discard(_gift_id uuid)
returns boolean language plpgsql security definer set search_path='' set row_security=off
as $discard$
declare actor uuid:=auth.uid(); changed integer;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ';end if;
 if _gift_id is null then raise exception 'Не вибрано подарунок';end if;
 update public.vatra_creator_gifts
 set deleted_at=now(),listed=false,changed_at=now()
 where id=_gift_id and owner_uid=actor and deleted_at is null;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Подарунок не належить Вам або вже прибраний';end if;
 update public.vatra_creator_gift_orders
 set status='declined',updated_at=now()
 where gift_id=_gift_id and status='pending';
 return true;
end;
$discard$;

create or replace function public.vatra_creator_gifts_discard_all()
returns integer language plpgsql security definer set search_path='' set row_security=off
as $discard$
declare actor uuid:=auth.uid(); changed integer;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ';end if;
 update public.vatra_creator_gifts
 set deleted_at=now(),listed=false,changed_at=now()
 where owner_uid=actor and deleted_at is null;
 get diagnostics changed=row_count;
 update public.vatra_creator_gift_orders o
 set status='declined',updated_at=now()
 from public.vatra_creator_gifts g
 where o.gift_id=g.id and g.owner_uid=actor and g.deleted_at is not null and o.status='pending';
 return changed;
end;
$discard$;

revoke all on function
 public.vatra_gifts_discard(uuid),
 public.vatra_gifts_discard_all(),
 public.vatra_creator_gifts_discard(uuid),
 public.vatra_creator_gifts_discard_all() from public,anon;
grant execute on function
 public.vatra_gifts_discard(uuid),
 public.vatra_gifts_discard_all(),
 public.vatra_creator_gifts_discard(uuid),
 public.vatra_creator_gifts_discard_all() to authenticated;

commit;
