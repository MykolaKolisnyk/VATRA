-- Isolated database only. This test never claims production jobs.
-- Run after installing vatra-account-lifecycle-staged.sql on a disposable
-- Supabase instance with no real users. No Auth user or Storage object is deleted.
begin;
do $$
declare u uuid:=gen_random_uuid(); v bigint:=9223372036854770000; claimed record; renewed timestamptz; reclaimed record;
begin
 if exists(select 1 from private.vatra_account_deletion_jobs) then
  raise exception 'Use an empty disposable lifecycle database';
 end if;
 if has_function_privilege('authenticated','public.vatra_account_lifecycle_transition(uuid,uuid,text,integer)','EXECUTE')
  or has_function_privilege('anon','public.vatra_account_lifecycle_transition(uuid,uuid,text,integer)','EXECUTE')
  or has_function_privilege('authenticated','public.vatra_account_lifecycle_claim(integer)','EXECUTE')
  or has_function_privilege('anon','public.vatra_account_lifecycle_claim(integer)','EXECUTE')
  or has_function_privilege('authenticated','public.vatra_account_lifecycle_renew(uuid,uuid)','EXECUTE')
  or has_function_privilege('anon','public.vatra_account_lifecycle_renew(uuid,uuid)','EXECUTE') then
  raise exception 'Unexpected browser privilege';
 end if;
 begin
  perform public.vatra_account_lifecycle_transition(u,gen_random_uuid(),'status',null);
  raise exception 'Expected invalid session rejection';
 exception when insufficient_privilege then null; end;
 insert into private.vatra_account_deletion_jobs(user_id,vatra_id,requested_at,restore_until,state)
 values(u,v,clock_timestamp(),clock_timestamp()+interval '7 days','pending');
 if exists(select 1 from public.vatra_account_lifecycle_claim(1)) then
  raise exception 'Future deletion was claimed too early';
 end if;
 update private.vatra_account_deletion_jobs set requested_at=clock_timestamp()-interval '8 days',
  restore_until=clock_timestamp()-interval '1 day' where user_id=u;
 select * into claimed from public.vatra_account_lifecycle_claim(1);
 if claimed.user_id is distinct from u or claimed.lease_id is null then
  raise exception 'Expired deletion was not claimed';
 end if;
 if exists(select 1 from public.vatra_account_lifecycle_claim(1)) then
  raise exception 'Unexpired lease was claimed twice';
 end if;
 renewed:=public.vatra_account_lifecycle_renew(u,claimed.lease_id);
 if renewed<=clock_timestamp() then raise exception 'Lease renewal failed'; end if;
 begin
  perform public.vatra_account_lifecycle_renew(u,gen_random_uuid());
  raise exception 'Wrong lease was renewed';
 exception when sqlstate '55000' then null; end;
 update private.vatra_account_deletion_jobs set lease_until=clock_timestamp()-interval '1 second' where user_id=u;
 begin
  perform public.vatra_account_lifecycle_renew(u,claimed.lease_id);
  raise exception 'Expired lease was renewed';
 exception when sqlstate '55000' then null; end;
 select * into reclaimed from public.vatra_account_lifecycle_claim(1);
 if reclaimed.user_id is distinct from u or reclaimed.lease_id is null or reclaimed.lease_id=claimed.lease_id then
  raise exception 'Expired lease could not be retried';
 end if;
 begin
  perform public.vatra_account_lifecycle_renew(u,claimed.lease_id);
  raise exception 'Replaced lease was renewed';
 exception when sqlstate '55000' then null; end;
 if public.vatra_account_lifecycle_renew(u,reclaimed.lease_id)<=clock_timestamp() then
  raise exception 'Reclaimed lease could not be renewed';
 end if;
end $$;
rollback;
