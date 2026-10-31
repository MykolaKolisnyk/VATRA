-- ВАТРА / Подарунки. Застосувати після VATRA/app-data-schema.sql.
-- Куплені подарунки видаються ЛИШЕ розробником після перевіреної оплати:
-- з адмінського SQL Editor / захищеного service_role workflow.
-- Браузер НЕ має прав INSERT/UPDATE/DELETE для gift_instances.
create extension if not exists pgcrypto;

create table if not exists public.vatra_gift_catalog(
 code text primary key,
 title text not null,
 category text not null check(category in ('holiday','premium')),
 enabled boolean not null default true,
 event_month integer,
 event_day integer,
 sort_order integer not null default 0,
 check (event_month is null or event_month between 1 and 12),
 check (event_day is null or event_day between 1 and 31)
);

insert into public.vatra_gift_catalog(code,title,category,event_month,event_day,sort_order) values
 ('halloween','Гарбузик ВАТРИ','holiday',10,31,10),
 ('newyear','Новорічна ялинка','holiday',1,1,20),
 ('independence','Серце України','holiday',8,24,30),
 ('warmth','Теплі обійми','premium',null,null,40),
 ('bouquet','Букет ВАТРИ','premium',null,null,50),
 ('spark','Іскра дружби','premium',null,null,60)
on conflict(code) do update set title=excluded.title,category=excluded.category,event_month=excluded.event_month,event_day=excluded.event_day,sort_order=excluded.sort_order;

create table if not exists public.vatra_gift_instances(
 id uuid primary key default gen_random_uuid(),
 code text not null references public.vatra_gift_catalog(code),
 owner_uid uuid not null references auth.users(id) on delete cascade,
 sender_uid uuid references auth.users(id) on delete set null,
 source text not null check(source in ('holiday','developer','transfer')),
 received_at timestamptz not null default now()
);
create index if not exists vatra_gift_owner_idx on public.vatra_gift_instances(owner_uid,received_at desc);

create table if not exists public.vatra_gift_claims(
 uid uuid not null references auth.users(id) on delete cascade,
 code text not null references public.vatra_gift_catalog(code),
 year smallint not null,
 claimed_at timestamptz not null default now(),
 primary key(uid,code,year)
);
create table if not exists public.vatra_gift_preferences(
 uid uuid primary key references auth.users(id) on delete cascade,
 visibility text not null default 'everyone' check(visibility in ('everyone','friends','only_me')),
 updated_at timestamptz not null default now()
);
alter table public.vatra_gift_catalog enable row level security;
alter table public.vatra_gift_instances enable row level security;
alter table public.vatra_gift_claims enable row level security;
alter table public.vatra_gift_preferences enable row level security;
revoke all on public.vatra_gift_catalog,public.vatra_gift_instances,public.vatra_gift_claims,public.vatra_gift_preferences from anon,authenticated;
grant select on public.vatra_gift_catalog to anon,authenticated;

create or replace function public.vatra_gifts_inventory()
returns jsonb language plpgsql security definer set search_path='' set row_security=off
as $gift$
declare actor uuid:=auth.uid(); result jsonb; vis text;
begin
 if actor is null then raise exception 'Потрібно увійти в акаунт';end if;
 select visibility into vis from public.vatra_gift_preferences where uid=actor;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'code',i.code,'title',c.title,'source',i.source,'sender',i.sender_uid,'receivedAt',i.received_at) order by i.received_at desc),'[]'::jsonb)
 into result from public.vatra_gift_instances i join public.vatra_gift_catalog c on c.code=i.code where i.owner_uid=actor;
 return jsonb_build_object('items',coalesce(result,'[]'::jsonb),'visibility',coalesce(vis,'everyone'));
end;
$gift$;

create or replace function public.vatra_gifts_public(_owner uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=off
as $gift$
declare actor uuid:=auth.uid(); vis text; allowed boolean:=false; result jsonb;
begin
 if _owner is null then return '[]'::jsonb;end if;
 select visibility into vis from public.vatra_gift_preferences where uid=_owner;
 vis:=coalesce(vis,'everyone');
 allowed:=actor=_owner or vis='everyone' or
 (vis='friends' and actor is not null and public.vatra_data_is_friend(_owner::text,actor));
 if not allowed then return '[]'::jsonb;end if;
 select coalesce(jsonb_agg(jsonb_build_object('code',i.code,'title',c.title,'receivedAt',i.received_at) order by i.received_at desc),'[]'::jsonb)
 into result from public.vatra_gift_instances i join public.vatra_gift_catalog c on c.code=i.code where i.owner_uid=_owner;
 return coalesce(result,'[]'::jsonb);
end;
$gift$;

create or replace function public.vatra_gifts_set_visibility(_visibility text)
returns text language plpgsql security definer set search_path='' set row_security=off
as $gift$
begin
 if auth.uid() is null then raise exception 'Потрібно увійти в акаунт';end if;
 if _visibility not in ('everyone','friends','only_me') then raise exception 'Невірна приватність';end if;
 insert into public.vatra_gift_preferences(uid,visibility,updated_at) values(auth.uid(),_visibility,now())
 on conflict(uid) do update set visibility=excluded.visibility,updated_at=now();
 return _visibility;
end;
$gift$;

create or replace function public.vatra_gifts_claim_holiday()
returns jsonb language plpgsql security definer set search_path='' set row_security=off
as $gift$
declare actor uuid:=auth.uid(); local_day date:=(now() at time zone 'Europe/Kyiv')::date; rowx record; claimed jsonb:='[]'::jsonb; inserted integer;
begin
 if actor is null then raise exception 'Потрібно увійти в акаунт';end if;
 for rowx in select code from public.vatra_gift_catalog
 where enabled and category='holiday' and event_month=extract(month from local_day)::integer and event_day=extract(day from local_day)::integer
 loop
  inserted:=0;
  insert into public.vatra_gift_claims(uid,code,year)
    values(actor,rowx.code,extract(year from local_day)::smallint)
    on conflict do nothing;
  get diagnostics inserted=row_count;
  if inserted=1 then
   insert into public.vatra_gift_instances(code,owner_uid,source) values(rowx.code,actor,'holiday');
   claimed:=claimed||jsonb_build_array(rowx.code);
  end if;
 end loop;
 return claimed;
end;
$gift$;

create or replace function public.vatra_gifts_send(_item_id uuid,_recipient uuid)
returns boolean language plpgsql security definer set search_path='' set row_security=off
as $gift$
declare actor uuid:=auth.uid(); changed integer;
begin
 if actor is null then raise exception 'Потрібно увійти в акаунт';end if;
 if _item_id is null or _recipient is null or _recipient=actor then raise exception 'Невірний отримувач';end if;
 if not exists(select 1 from auth.users where id=_recipient) then raise exception 'Отримувача не знайдено';end if;
 if not public.vatra_data_is_friend(actor::text,_recipient) then raise exception 'Подарунки можна надсилати друзям';end if;
 update public.vatra_gift_instances set owner_uid=_recipient,sender_uid=actor,source='transfer',received_at=now()
 where id=_item_id and owner_uid=actor;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Подарунок уже передано або він Вам не належить';end if;
 return true;
end;
$gift$;
revoke all on function public.vatra_gifts_inventory(),public.vatra_gifts_public(uuid),public.vatra_gifts_set_visibility(text),public.vatra_gifts_claim_holiday(),public.vatra_gifts_send(uuid,uuid) from public;
grant execute on function public.vatra_gifts_inventory(),public.vatra_gifts_set_visibility(text),public.vatra_gifts_claim_holiday(),public.vatra_gifts_send(uuid,uuid) to authenticated;
grant execute on function public.vatra_gifts_public(uuid) to anon,authenticated;
-- Адміністратор видає куплений подарунок лише після підтвердження оплати:
-- insert into public.vatra_gift_instances(code,owner_uid,source)
-- values ('warmth','<підтверджений UID покупця>'::uuid,'developer');
-- Не виконуйте цей приклад із незаповненим UID.
