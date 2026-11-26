-- STAGED ONLY: do not deploy or expose until the lifecycle security review,
-- storage cleanup worker and isolated integration tests are complete.
begin;
set local lock_timeout='3s';

create table private.vatra_account_deletion_jobs (
 user_id uuid primary key,
 vatra_id bigint not null unique,
 requested_at timestamptz not null,
 restore_until timestamptz not null,
 state text not null check (state in ('pending','purging')),
 lease_id uuid,
 lease_until timestamptz,
 attempts integer not null default 0 check (attempts>=0),
 check (restore_until>=requested_at),
 check ((lease_id is null)=(lease_until is null)),
 check (state='purging' or lease_id is null)
);
alter table private.vatra_account_deletion_jobs enable row level security;
revoke all on table private.vatra_account_deletion_jobs from public,anon,authenticated;
create index vatra_account_deletion_due_idx
 on private.vatra_account_deletion_jobs(state,restore_until,lease_until);

-- Only a trusted backend may call this function AFTER fresh proof of the
-- same user's password/MFA for mutations. Never grant EXECUTE to browser roles.
-- This phase intentionally has no auth/storage/production-content deletion.
create function public.vatra_account_lifecycle_transition(
 caller uuid, caller_session uuid, operation text, recovery_days integer default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 j private.vatra_account_deletion_jobs%rowtype;
 member bigint;
 stamp timestamptz;
begin
 if caller is null or caller_session is null or not exists(
  select 1 from auth.sessions s where s.id=caller_session and s.user_id=caller
   and (s.not_after is null or s.not_after>clock_timestamp())
 ) then raise exception 'Invalid session' using errcode='42501'; end if;
 if operation is null or operation not in ('status','request_deletion','restore') then
  raise exception 'Invalid operation' using errcode='22023';
 end if;
 -- Serializes requests and restoration for the same account.
 select a.vatra_id into member from public.accounts a where a.user_id=caller for update;
 if not found then raise exception 'Account unavailable' using errcode='42501'; end if;
 select * into j from private.vatra_account_deletion_jobs q where q.user_id=caller for update;
 stamp:=clock_timestamp();
 if not exists(select 1 from auth.sessions s where s.id=caller_session and s.user_id=caller
  and (s.not_after is null or s.not_after>stamp)) then
  raise exception 'Invalid session' using errcode='42501';
 end if;

 if operation='status' then
  if j.user_id is null then
   return jsonb_build_object('ok',true,'ready',false,'state','active');
  end if;
  return jsonb_build_object('ok',true,'ready',false,
   'state',case when j.state='pending' and stamp<j.restore_until then 'pending' else 'purging' end,
   'restore_until',j.restore_until);
 end if;
 if operation='request_deletion' then
  if recovery_days is null or recovery_days not in (0,7,30,90,180) then
   raise exception 'Invalid recovery period' using errcode='22023';
  end if;
  if j.user_id is not null then raise exception 'Deletion already requested' using errcode='55000'; end if;
  -- Moderation state is independent. Do not allow this path to erase sanctions.
  if exists(select 1 from public.account_states s where s.vatra_id=member and
    (s.state='deleted' or (s.state='blocked' and (s.blocked_until is null or s.blocked_until>stamp)))) then
   raise exception 'Account restricted' using errcode='42501';
  end if;
  insert into private.vatra_account_deletion_jobs(user_id,vatra_id,requested_at,restore_until,state)
  values(caller,member,stamp,stamp+make_interval(hours=>24*recovery_days),
    case when recovery_days=0 then 'purging' else 'pending' end)
  returning * into j;
  return jsonb_build_object('ok',true,'ready',false,'state',j.state,'restore_until',j.restore_until);
 end if;
 -- Expiry is checked on the server while holding the same row lock as the
 -- worker. It is never possible to restore after the deadline or a claim.
 if j.user_id is null or j.state<>'pending' or stamp>=j.restore_until then
  raise exception 'Recovery window closed' using errcode='55000';
 end if;
 delete from private.vatra_account_deletion_jobs q where q.user_id=caller;
 return jsonb_build_object('ok',true,'ready',false,'state','active');
end $$;
revoke all on function public.vatra_account_lifecycle_transition(uuid,uuid,text,integer)
 from public,anon,authenticated;
grant execute on function public.vatra_account_lifecycle_transition(uuid,uuid,text,integer) to service_role;

-- A scheduled trusted worker will claim at most a bounded batch.
-- A lease allows a crashed worker to retry; a claimed job cannot be restored.
-- There is deliberately NO scheduler registration or destructive worker in
-- this migration. A lease is not evidence of successful data deletion.
create function public.vatra_account_lifecycle_claim(batch_size integer default 10)
returns table(user_id uuid,vatra_id bigint,lease_id uuid,restore_until timestamptz)
language plpgsql security definer set search_path=''
as $$
declare stamp timestamptz:=clock_timestamp();
begin
 if batch_size is null or batch_size not between 1 and 25 then
  raise exception 'Invalid batch size' using errcode='22023';
 end if;
 return query
 with due as (
  select q.user_id from private.vatra_account_deletion_jobs q
  where q.restore_until<=stamp
   and (q.lease_until is null or q.lease_until<=stamp)
  order by q.restore_until,q.user_id
  for update skip locked limit batch_size
 ), claimed as (
  update private.vatra_account_deletion_jobs q
  set state='purging',lease_id=gen_random_uuid(),
   lease_until=stamp+interval '10 minutes',attempts=q.attempts+1
  from due where q.user_id=due.user_id
  returning q.user_id,q.vatra_id,q.lease_id,q.restore_until
 )
 select c.user_id,c.vatra_id,c.lease_id,c.restore_until from claimed c;
end $$;
revoke all on function public.vatra_account_lifecycle_claim(integer) from public,anon,authenticated;
grant execute on function public.vatra_account_lifecycle_claim(integer) to service_role;

-- A worker must verify/renew its own unexpired lease before each bounded
-- cleanup step. Stale workers cannot renew a lease reclaimed by another.
-- This does not authorize unfenced external Storage operations.
create function public.vatra_account_lifecycle_renew(
 job_user uuid, worker_lease uuid
) returns timestamptz
language plpgsql security definer set search_path=''
as $$
declare
 j private.vatra_account_deletion_jobs%rowtype;
 stamp timestamptz;
begin
 if job_user is null or worker_lease is null then
  raise exception 'Invalid lease' using errcode='22023';
 end if;
 select * into j from private.vatra_account_deletion_jobs q
 where q.user_id=job_user for update;
 stamp:=clock_timestamp();
 if j.user_id is null or j.state<>'purging' or
    j.lease_id is distinct from worker_lease or j.lease_until is null or j.lease_until<=stamp then
  raise exception 'Lease expired or replaced' using errcode='55000';
 end if;
 update private.vatra_account_deletion_jobs q
 set lease_until=stamp+interval '10 minutes'
 where q.user_id=job_user
 returning q.lease_until into stamp;
 return stamp;
end $$;
revoke all on function public.vatra_account_lifecycle_renew(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.vatra_account_lifecycle_renew(uuid,uuid) to service_role;

commit;
