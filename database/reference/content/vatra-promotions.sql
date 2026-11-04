-- VATRA: sponsored feed placements. Approval must follow independently verified payment.
-- Run after app-data-schema.sql and group permissions migrations.
create table if not exists public.vatra_promotions (
 id uuid primary key default gen_random_uuid(),
 requester_uid uuid not null,
 post_id text not null,
 days integer not null check(days in(1,3,7,30)),
 quoted_price_uah integer not null check(quoted_price_uah in(49,119,249,799)),
 status text not null default 'pending' check(status in('pending','active','rejected','expired')),
 created_at timestamptz not null default now(),
 starts_at timestamptz,
 ends_at timestamptz,
 payment_verified_at timestamptz,
 payment_reference text unique,
 constraint vatra_promo_active_paid check(status<>'active' or
  (payment_verified_at is not null and payment_reference is not null and starts_at is not null and ends_at>starts_at))
);
create index if not exists vatra_promotions_active_idx on public.vatra_promotions (status,ends_at);
create index if not exists vatra_promotions_owner_idx on public.vatra_promotions (requester_uid,created_at desc);
alter table public.vatra_promotions enable row level security;
revoke all on public.vatra_promotions from public,anon,authenticated;
grant select on public.vatra_promotions to authenticated;
drop policy if exists vatra_promo_read on public.vatra_promotions;
create policy vatra_promo_read on public.vatra_promotions for select to authenticated
 using(requester_uid=auth.uid() or(status='active' and payment_verified_at is not null and starts_at<=now() and ends_at>now()));

create or replace function public.vatra_promotion_request(_post_id text,_days integer)
returns uuid language plpgsql security definer set search_path='' set row_security=off
as $promo$
declare actor uuid:=auth.uid(); target jsonb; gid text; pid text; group_record jsonb; admin_record jsonb; role_record jsonb;
  new_id uuid; price integer; recent integer;
begin
 if actor is null then raise exception 'Необхідно увійти до ВАТРИ';end if;
 if _post_id is null or length(_post_id)<4 or length(_post_id)>140 then raise exception 'Недопустимий допис';end if;
 price:=case _days when 1 then 49 when 3 then 119 when 7 then 249 when 30 then 799 else null end;
 if price is null then raise exception 'Оберіть тариф просування';end if;
 if left(_post_id,2)='g_' then
  gid:=split_part(_post_id,'_',2);pid:=substring(_post_id from length(gid)+4);
  if gid='' or pid='' then raise exception 'Некоректний допис спільноти';end if;
  select value into target from public.app_data where path='groupPosts/'||gid||'/'||pid;
  select value into group_record from public.app_data where path='groups/'||gid;
  select value into admin_record from public.app_data where path='groupAdmins/'||gid;
  select value into role_record from public.app_data where path='groupModerators/'||gid;
  if target is null or group_record is null or coalesce(group_record->>'visibility','public')='private'
    or not(
     group_record->>'ownerUid'=actor::text
     or coalesce(admin_record?actor::text,false)
     or coalesce(role_record?actor::text,false)
    ) then raise exception 'Немає права просувати цей допис спільноти';end if;
 else
  if _post_id !~ '^[a-zA-Z0-9_-]{4,130}$' then raise exception 'Недопустимий допис';end if;
  select value into target from public.app_data where path='posts/'||_post_id;
  if target is null or target->>'authorUid'<>actor::text
    or coalesce(target->>'visibility','public')<>'public'
  then raise exception 'Можна просувати лише власний публічний допис';end if;
 end if;
 select count(*) into recent from public.vatra_promotions
 where requester_uid=actor and created_at>now()-interval '24 hours';
 if recent>=4 then raise exception 'Ліміт: не більше 4 заявок на просування за добу';end if;
 if exists(select 1 from public.vatra_promotions
  where post_id=_post_id and requester_uid=actor and status in('pending','active'))
 then raise exception 'Для цього допису вже є заявка або активне просування';end if;
 insert into public.vatra_promotions(requester_uid,post_id,days,quoted_price_uah)
 values(actor,_post_id,_days,price) returning id into new_id;
 return new_id;
end;
$promo$;
revoke all on function public.vatra_promotion_request(text,integer) from public,anon;
grant execute on function public.vatra_promotion_request(text,integer) to authenticated;
-- Promotion requests are NEVER marked paid/active by browser requests.
-- Only a trusted service_role payment webhook or audited administrator transaction
-- can set payment_reference, payment_verified_at, starts_at, ends_at, status='active'.
-- No card charges or transfers are implemented in this migration.
