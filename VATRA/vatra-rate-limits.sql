-- VATRA • Server-side rate limits, 3 November 2026.
-- Run once in Supabase SQL Editor AFTER app-data-schema.sql.
-- This migration DOES NOT disable existing RLS or modify any existing posts/comments.
-- Limits: 10 new posts / 5 minutes, 20 new comments / minute (per account).
-- Server time is authoritative; changing the browser or request payload cannot reset limits.

begin;

create table if not exists public.vatra_request_buckets (
  account_uid uuid not null,
  action_kind text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 0 check (request_count between 0 and 100000),
  primary key (account_uid, action_kind, bucket_start)
);
alter table public.vatra_request_buckets enable row level security;
revoke all on public.vatra_request_buckets from public, anon, authenticated;
create index if not exists vatra_request_buckets_expiry on public.vatra_request_buckets(bucket_start);

create or replace function public.vatra_consume_rate_limit(
  _uid uuid, _kind text, _max_count integer, _window_seconds integer
)
returns void language plpgsql security definer
set search_path = '' set row_security = off as $vatra_rate$
declare
  slot timestamptz;
  count_after integer;
begin
  if _uid is null or _uid is distinct from auth.uid()
     or _max_count not between 1 and 1000
     or _window_seconds not between 1 and 86400 then
    raise exception 'VATRA RATE: invalid request' using errcode='P0001';
  end if;
  -- Serialize concurrent writes from this user, including different devices.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_uid::text || ':' || _kind, 0));
  slot := to_timestamp(floor(extract(epoch from clock_timestamp()) / _window_seconds) * _window_seconds);
  insert into public.vatra_request_buckets(account_uid,action_kind,bucket_start,request_count)
  values (_uid,_kind,slot,1)
  on conflict (account_uid,action_kind,bucket_start) do update
    set request_count=public.vatra_request_buckets.request_count+1
    where public.vatra_request_buckets.request_count < _max_count
  returning request_count into count_after;
  if count_after is null then
    raise exception 'VATRA RATE: too many requests; please try again later' using errcode='P0001';
  end if;
end;
$vatra_rate$;
revoke all on function public.vatra_consume_rate_limit(uuid,text,integer,integer)
  from public,anon,authenticated;

create or replace function public.vatra_content_rate_guard()
returns trigger language plpgsql security definer
set search_path = '' set row_security = off as $vatra_guard$
declare
  actor uuid := auth.uid();
  old_items jsonb;
  item_id text;
  item jsonb;
  reported_uid uuid;
begin
  if actor is null then
    raise exception 'VATRA RATE: authentication required' using errcode='P0001';
  end if;

  -- Individual user posts, and posts under a community.
  if new.path ~ '^(posts/[^/]+|groupPosts/[^/]+/[^/]+)$' then
    if tg_op = 'INSERT' then
      if coalesce(new.value->>'authorUid','') <> actor::text then
        raise exception 'VATRA RATE: invalid author' using errcode='P0001';
      end if;
      perform public.vatra_consume_rate_limit(actor,'post',10,300);
    end if;
    return new;
  end if;

  -- Individual comments. Existing comments can be edited without consuming quota.
  if new.path ~ '^comments/[^/]+/[^/]+$' then
    if tg_op = 'INSERT' then
      if coalesce(new.value->>'uid','') <> actor::text then
        raise exception 'VATRA RATE: invalid comment author' using errcode='P0001';
      end if;
      perform public.vatra_consume_rate_limit(actor,'comment',20,60);
    end if;
    return new;
  end if;

  -- Compatibility with older clients that store a whole post's comment map in one row.
  if new.path ~ '^comments/[^/]+$' then
    if jsonb_typeof(new.value) <> 'object' then return new; end if;
    old_items := case when tg_op='UPDATE' and jsonb_typeof(old.value)='object'
                     then old.value else '{}'::jsonb end;
    for item_id in select jsonb_object_keys(new.value) loop
      if not(old_items ? item_id) then
        item := new.value -> item_id;
        if coalesce(item->>'uid','') <> actor::text then
          raise exception 'VATRA RATE: invalid comment author' using errcode='P0001';
        end if;
        perform public.vatra_consume_rate_limit(actor,'comment',20,60);
      end if;
    end loop;
  end if;
  return new;
end;
$vatra_guard$;
revoke all on function public.vatra_content_rate_guard() from public,anon,authenticated;
drop trigger if exists vatra_content_rate_limit on public.app_data;
create trigger vatra_content_rate_limit
  before insert or update of value on public.app_data
  for each row
  when (new.path ~ '^(posts/[^/]+|groupPosts/[^/]+/[^/]+|comments/[^/]+(/[^/]+)?)$')
  execute function public.vatra_content_rate_guard();

commit;

-- Diagnostic: should show one enabled trigger.
select tgname,tgenabled
from pg_catalog.pg_trigger
where tgrelid='public.app_data'::regclass and tgname='vatra_content_rate_limit';
