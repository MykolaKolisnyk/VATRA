-- VATRA: bounded per-account translation requests.
-- Run in Supabase SQL Editor before deploying vatra-translate Edge Function.
begin;
create table if not exists public.vatra_translation_quota (
 user_id uuid not null references auth.users(id) on delete cascade,
 bucket timestamptz not null,
 hits integer not null default 0 check(hits >= 0),
 primary key(user_id,bucket)
);
alter table public.vatra_translation_quota enable row level security;
revoke all on public.vatra_translation_quota from anon,authenticated;
create or replace function public.vatra_claim_translation_quota()
returns boolean
language plpgsql volatile security definer
set search_path='' set row_security=off
as $body$
declare
 who uuid:=auth.uid();
 slot timestamptz:=date_trunc('hour',now());
 result integer;
begin
 if who is null then return false; end if;
 insert into public.vatra_translation_quota(user_id,bucket,hits)
 values(who,slot,1)
 on conflict(user_id,bucket) do update
 set hits=public.vatra_translation_quota.hits+1
 where public.vatra_translation_quota.hits<40
 returning hits into result;
 delete from public.vatra_translation_quota
 where user_id=who and bucket<now()-interval '3 days';
 return result is not null;
end;
$body$;
revoke all on function public.vatra_claim_translation_quota() from public,anon;
grant execute on function public.vatra_claim_translation_quota() to authenticated;
commit;
