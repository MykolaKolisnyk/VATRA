-- VATRA · creator gifts / owner-controlled marketplace
-- 2026-11-03. Apply AFTER VATRA/vatra-gifts.sql and VATRA/app-data-schema.sql
-- No payment gateway or escrow is implemented. A request is NOT proof of payment.
-- Owners only transfer a gift when they decide to finish a negotiated sale.

create extension if not exists pgcrypto;

create table if not exists public.vatra_creator_gifts (
 id uuid primary key default gen_random_uuid(),
 creator_uid uuid not null references auth.users(id) on delete cascade,
 owner_uid uuid not null references auth.users(id) on delete cascade,
 image_path text not null,
 title text not null check (char_length(trim(title)) between 3 and 60),
 description text not null check (char_length(trim(description)) between 15 and 350),
 price_uah integer not null check (price_uah between 10 and 5000),
 listed boolean not null default false,
 created_at timestamptz not null default now(),
 changed_at timestamptz not null default now(),
 transferred_at timestamptz,
 sender_uid uuid references auth.users(id) on delete set null
);
create unique index if not exists vatra_creator_gifts_unique_asset on public.vatra_creator_gifts(creator_uid,image_path);
create index if not exists vatra_creator_gifts_market_idx on public.vatra_creator_gifts(listed,created_at desc);
create index if not exists vatra_creator_gifts_owner_idx on public.vatra_creator_gifts(owner_uid,created_at desc);
create index if not exists vatra_creator_gifts_creator_idx on public.vatra_creator_gifts(creator_uid,created_at desc);
-- Keep gift/order history for accounting and fraud review when owners remove a gift.
alter table public.vatra_creator_gifts add column if not exists deleted_at timestamptz;


create table if not exists public.vatra_creator_gift_orders (
 id uuid primary key default gen_random_uuid(),
 gift_id uuid not null references public.vatra_creator_gifts(id) on delete cascade,
 buyer_uid uuid not null references auth.users(id) on delete cascade,
 seller_uid uuid not null references auth.users(id) on delete cascade,
 price_uah integer not null check (price_uah between 10 and 5000),
 status text not null default 'pending' check (status in ('pending','declined','withdrawn','completed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (buyer_uid <> seller_uid)
);
create unique index if not exists vatra_creator_orders_one_pending
 on public.vatra_creator_gift_orders(gift_id,buyer_uid) where status='pending';
create index if not exists vatra_creator_orders_seller_idx on public.vatra_creator_gift_orders(seller_uid,status,created_at desc);
create index if not exists vatra_creator_orders_buyer_idx on public.vatra_creator_gift_orders(buyer_uid,status,created_at desc);

alter table public.vatra_creator_gifts enable row level security;
alter table public.vatra_creator_gift_orders enable row level security;
revoke all on public.vatra_creator_gifts,public.vatra_creator_gift_orders from public,anon,authenticated;

create or replace function public.vatra_creator_gifts_create(
 _title text,_description text,_price_uah integer,_image_path text,_listed boolean default true
) returns uuid language plpgsql security definer set search_path='' set row_security=off
as $create$
declare actor uuid:=auth.uid(); new_id uuid; mime text; bytes integer;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ'; end if;
 if _title is null or char_length(trim(_title)) not between 3 and 60 then
  raise exception 'Назва повинна мати 3–60 символів';end if;
 if _description is null or char_length(trim(_description)) not between 15 and 350 then
  raise exception 'Опис повинен мати 15–350 символів';end if;
 if _price_uah is null or _price_uah not between 10 and 5000 then
  raise exception 'Дозволена ціна від 10 до 5 000 грн';end if;
 if _image_path is null or not (
   _image_path like actor::text||'/gifts/%'
   and _image_path ~ '^[0-9a-f-]{36}/gifts/[a-zA-Z0-9_-]{8,90}\.(png|jpg|jpeg|webp)$'
 ) then raise exception 'Неправильний шлях до власного зображення'; end if;
 select coalesce(metadata->>'mimetype',''),coalesce((metadata->>'size')::integer,0)
 into mime,bytes from storage.objects
 where bucket_id='vatra-media' and name=_image_path limit 1;
 if mime not in ('image/jpeg','image/png','image/webp') or bytes not between 100 and 2097152 then
  raise exception 'Завантажте PNG, JPEG або WebP до 2 МБ';end if;
 if exists(select 1 from public.vatra_creator_gifts
           where creator_uid=actor and image_path=_image_path) then
  raise exception 'Це зображення вже використано для подарунка';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(actor::text));
 if (select count(*) from public.vatra_creator_gifts
     where creator_uid=actor and created_at>now()-interval '24 hours')>=5 then
  raise exception 'Дозволено не більше 5 нових подарунків на добу';end if;
 insert into public.vatra_creator_gifts(creator_uid,owner_uid,image_path,title,description,price_uah,listed)
 values(actor,actor,_image_path,trim(_title),trim(_description),_price_uah,coalesce(_listed,true))
 returning id into new_id;
 return new_id;
end;
$create$;

create or replace function public.vatra_creator_gifts_mine()
 returns jsonb language plpgsql security definer set search_path='' set row_security=off
as $mine$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'title',title,'description',description,'price',price_uah,
  'imagePath',image_path,'creator',creator_uid,'owner',owner_uid,
  'listed',listed,'createdAt',created_at
 ) order by created_at desc),'[]'::jsonb)
 into result from public.vatra_creator_gifts where owner_uid=actor and deleted_at is null;
 return result;
end;
$mine$;

create or replace function public.vatra_creator_gifts_market()
 returns jsonb language plpgsql security definer set search_path='' set row_security=off
as $market$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',id,'title',title,'description',description,'price',price_uah,
 'imagePath',image_path,'creator',creator_uid,'owner',owner_uid,'createdAt',created_at
 ) order by created_at desc),'[]'::jsonb)
 into result from (
  select id,title,description,price_uah,image_path,creator_uid,owner_uid,created_at
  from public.vatra_creator_gifts where listed=true and deleted_at is null
  order by created_at desc limit 100
 ) found;
 return result;
end;
$market$;

create or replace function public.vatra_creator_gifts_public(_owner uuid)
 returns jsonb language plpgsql security definer set search_path='' set row_security=off
as $pub$
declare actor uuid:=auth.uid(); vis text; result jsonb;
begin
 if _owner is null then return '[]'::jsonb;end if;
 select visibility into vis from public.vatra_gift_preferences where uid=_owner;
 vis:=coalesce(vis,'everyone');
 if actor is distinct from _owner and
  not (vis='everyone' or (vis='friends' and actor is not null
    and public.vatra_data_is_friend(_owner::text,actor))) then
  return '[]'::jsonb;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',id,'title',title,'description',description,'price',price_uah,
 'imagePath',image_path,'creator',creator_uid,'owner',owner_uid,'listed',listed
 ) order by created_at desc),'[]'::jsonb)
 into result from public.vatra_creator_gifts where owner_uid=_owner and deleted_at is null;
 return result;
end;
$pub$;

create or replace function public.vatra_creator_gifts_set_listing(
 _gift_id uuid,_price_uah integer,_listed boolean
) returns boolean language plpgsql security definer set search_path='' set row_security=off
as $listing$
declare actor uuid:=auth.uid(); prev_price integer; changed integer;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ';end if;
 if _price_uah is null or _price_uah not between 10 and 5000 then
  raise exception 'Дозволена ціна від 10 до 5 000 грн';end if;
 select price_uah into prev_price from public.vatra_creator_gifts
  where id=_gift_id and owner_uid=actor and deleted_at is null for update;
 if not found then raise exception 'Подарунок Вам не належить';end if;
 update public.vatra_creator_gifts set price_uah=_price_uah,listed=coalesce(_listed,false),changed_at=now()
  where id=_gift_id and owner_uid=actor and deleted_at is null;
 if prev_price<>_price_uah or not coalesce(_listed,false) then
  update public.vatra_creator_gift_orders set status='declined',updated_at=now()
  where gift_id=_gift_id and status='pending';
 end if;
 return true;
end;
$listing$;

create or replace function public.vatra_creator_gifts_send(
 _gift_id uuid,_recipient uuid
) returns boolean language plpgsql security definer set search_path='' set row_security=off
as $send$
declare actor uuid:=auth.uid(); changed integer;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ';end if;
 if _recipient is null or actor=_recipient then raise exception 'Неправильний отримувач';end if;
 if not exists(select 1 from auth.users where id=_recipient) then raise exception 'Отримувача не знайдено';end if;
 if not public.vatra_data_is_friend(actor::text,_recipient) then
  raise exception 'Надіслати подарунок можна лише другу';end if;
 update public.vatra_creator_gifts
 set owner_uid=_recipient,sender_uid=actor,listed=false,transferred_at=now(),changed_at=now()
 where id=_gift_id and owner_uid=actor and deleted_at is null;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Ви вже не володієте подарунком';end if;
 update public.vatra_creator_gift_orders set status='declined',updated_at=now()
 where gift_id=_gift_id and status='pending';
 return true;
end;
$send$;

create or replace function public.vatra_creator_gifts_order_request(_gift_id uuid)
 returns uuid language plpgsql security definer set search_path='' set row_security=off
as $order$
declare actor uuid:=auth.uid(); gift_record record; order_id uuid;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ';end if;
 select owner_uid,price_uah,listed into gift_record from public.vatra_creator_gifts
  where id=_gift_id and deleted_at is null for update;
 if not found or gift_record.listed=false then raise exception 'Оголошення вже недоступне';end if;
 if actor=gift_record.owner_uid then raise exception 'Власний подарунок купувати не потрібно';end if;
 if exists(select 1 from public.vatra_creator_gift_orders
    where gift_id=_gift_id and buyer_uid=actor and status='pending') then
  raise exception 'Ви вже подали заявку на цей подарунок';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(actor::text));
 if (select count(*) from public.vatra_creator_gift_orders
  where buyer_uid=actor and created_at>now()-interval '24 hours')>=20 then
  raise exception 'Ліміт — 20 нових заявок на добу';end if;
 insert into public.vatra_creator_gift_orders(gift_id,buyer_uid,seller_uid,price_uah)
 values(_gift_id,actor,gift_record.owner_uid,gift_record.price_uah)
 returning id into order_id;
 return order_id;
end;
$order$;

create or replace function public.vatra_creator_gifts_orders()
 returns jsonb language plpgsql security definer set search_path='' set row_security=off
as $orders$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',o.id,'giftId',o.gift_id,'title',g.title,'imagePath',g.image_path,
  'buyer',o.buyer_uid,'seller',o.seller_uid,'price',o.price_uah,
  'status',o.status,'createdAt',o.created_at
 ) order by o.created_at desc),'[]'::jsonb)
 into result
 from public.vatra_creator_gift_orders o join public.vatra_creator_gifts g on g.id=o.gift_id
 where o.buyer_uid=actor or o.seller_uid=actor;
 return result;
end;
$orders$;

create or replace function public.vatra_creator_gifts_order_action(
 _order_id uuid,_action text
) returns boolean language plpgsql security definer set search_path='' set row_security=off
as $action$
declare actor uuid:=auth.uid(); order_record record; gift_owner uuid;
begin
 if actor is null then raise exception 'Увійдіть у ВАТРУ';end if;
 if _action not in ('withdraw','decline','complete') then raise exception 'Непідтримувана дія';end if;
 select * into order_record from public.vatra_creator_gift_orders where id=_order_id for update;
 if not found or order_record.status<>'pending' then raise exception 'Заявку вже закрито';end if;
 if _action='withdraw' then
  if actor<>order_record.buyer_uid then raise exception 'Лише покупець може відкликати заявку';end if;
  update public.vatra_creator_gift_orders set status='withdrawn',updated_at=now() where id=_order_id;
  return true;
 end if;
 if actor<>order_record.seller_uid then raise exception 'Лише продавець може обробити заявку';end if;
 select owner_uid into gift_owner from public.vatra_creator_gifts
 where id=order_record.gift_id and deleted_at is null for update;
 if gift_owner is distinct from actor then raise exception 'Подарунок більше не належить продавцю';end if;
 if _action='decline' then
  update public.vatra_creator_gift_orders set status='declined',updated_at=now() where id=_order_id;
  return true;
 end if;
 -- Completing is ONLY the seller's explicit decision after an external agreement.
 -- It does not charge the buyer or assert that VATRA verified any payment.
 update public.vatra_creator_gifts
 set owner_uid=order_record.buyer_uid,sender_uid=actor,listed=false,
     transferred_at=now(),changed_at=now()
 where id=order_record.gift_id and owner_uid=actor and deleted_at is null;
 update public.vatra_creator_gift_orders set status='completed',updated_at=now() where id=_order_id;
 update public.vatra_creator_gift_orders set status='declined',updated_at=now()
 where gift_id=order_record.gift_id and id<>_order_id and status='pending';
 return true;
end;
$action$;

revoke all on function
 public.vatra_creator_gifts_create(text,text,integer,text,boolean),
 public.vatra_creator_gifts_mine(),public.vatra_creator_gifts_market(),
 public.vatra_creator_gifts_public(uuid),
 public.vatra_creator_gifts_set_listing(uuid,integer,boolean),
 public.vatra_creator_gifts_send(uuid,uuid),
 public.vatra_creator_gifts_order_request(uuid),
 public.vatra_creator_gifts_orders(),
 public.vatra_creator_gifts_order_action(uuid,text) from public;

grant execute on function
 public.vatra_creator_gifts_create(text,text,integer,text,boolean),
 public.vatra_creator_gifts_mine(),public.vatra_creator_gifts_market(),
 public.vatra_creator_gifts_public(uuid),
 public.vatra_creator_gifts_set_listing(uuid,integer,boolean),
 public.vatra_creator_gifts_send(uuid,uuid),
 public.vatra_creator_gifts_order_request(uuid),
 public.vatra_creator_gifts_orders(),
 public.vatra_creator_gifts_order_action(uuid,text) to authenticated;
