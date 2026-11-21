
create schema if not exists vatra_admin_private;
revoke all on schema vatra_admin_private from public,anon,authenticated;
grant usage on schema vatra_admin_private to authenticated;
create table vatra_admin_private.owner(user_id uuid primary key);
revoke all on vatra_admin_private.owner from public,anon,authenticated;
alter table vatra_admin_private.owner enable row level security;
insert into vatra_admin_private.owner select user_id from public.accounts where vatra_id=1;
do $$begin if (select count(*) from vatra_admin_private.owner)<>1 then raise exception 'VATRA owner missing';end if;end$$;
create function vatra_admin_private.is_owner() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from vatra_admin_private.owner where user_id=auth.uid())$$;
create function vatra_admin_private.allowed() returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.accounts a join public.account_states s on s.vatra_id=a.vatra_id where a.user_id=auth.uid() and (s.state='deleted' or (s.state='blocked' and (s.blocked_until is null or s.blocked_until>now()))))
$$;
revoke all on function vatra_admin_private.is_owner(),vatra_admin_private.allowed() from public,anon,authenticated;
grant execute on function vatra_admin_private.is_owner(),vatra_admin_private.allowed() to authenticated;
create function public.vatra_admin_access() returns boolean language sql stable security invoker set search_path='' as $$select vatra_admin_private.is_owner()$$;
revoke all on function public.vatra_admin_access() from public,anon,authenticated;
grant execute on function public.vatra_admin_access() to authenticated;
create table public.vatra_admin_audit(id bigint generated always as identity primary key, actor_id uuid not null, target_vatra_id bigint, event text not null, reason text not null default '', created_at timestamptz not null default now());
alter table public.vatra_admin_audit enable row level security;
revoke all on public.vatra_admin_audit from public,anon,authenticated;
grant select(id,target_vatra_id,event,reason,created_at) on public.vatra_admin_audit to authenticated;
create policy owner_audit_read on public.vatra_admin_audit for select to authenticated using((select vatra_admin_private.is_owner()));
alter table public.profile_reports add column admin_resolution text not null default '', add column admin_resolved_at timestamptz;
create table public.vatra_onboarding_done(vatra_id bigint primary key references public.accounts(vatra_id) on delete cascade, completed_at timestamptz not null default now());
alter table public.vatra_onboarding_done enable row level security;
revoke all on public.vatra_onboarding_done from public,anon,authenticated;
grant select(vatra_id),insert(vatra_id) on public.vatra_onboarding_done to authenticated;
create policy onboarding_own_read on public.vatra_onboarding_done for select to authenticated using(exists(select 1 from public.accounts a where a.user_id=auth.uid() and a.vatra_id=vatra_onboarding_done.vatra_id));
create policy onboarding_own_insert on public.vatra_onboarding_done for insert to authenticated with check((select vatra_admin_private.allowed()) and exists(select 1 from public.accounts a where a.user_id=auth.uid() and a.vatra_id=vatra_onboarding_done.vatra_id));

create function vatra_admin_private.manage(p_action text,p_id bigint default null,p_reason text default '',p_days integer default null,p_report uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; why text:=btrim(coalesce(p_reason,'')); until_at timestamptz;
begin
 if not vatra_admin_private.is_owner() then raise exception 'VATRA_ADMIN_REQUIRED' using errcode='42501';end if;
 if p_action='dashboard' then
  return jsonb_build_object('accounts',(select count(*) from public.accounts),'verified',(select count(*) from public.verified_accounts),'blocked',(select count(*) from public.account_states where state='blocked' and (blocked_until is null or blocked_until>now())),'posts',(select count(*) from public.feed_posts),'communities',(select count(*) from public.communities),'market_pending',(select count(*) from public.vatra_marketplace_listings where moderation_status='pending'),'verification_pending',(select count(*) from public.vatra_verification_requests where status='pending'),'reports_pending',(select count(*) from public.profile_reports where admin_resolved_at is null));
 elsif p_action='requests' then
  return coalesce((select jsonb_agg(to_jsonb(q)) from (select v.vatra_id,v.reason,v.created_at,p.display_name from public.vatra_verification_requests v left join public.public_profiles p using(vatra_id) where v.status='pending' order by v.created_at limit 100) q),'[]'::jsonb);
 elsif p_action='reports' then
  return coalesce((select jsonb_agg(to_jsonb(q)) from (select id,target_vatra_id,category,reason,details,created_at from public.profile_reports where admin_resolved_at is null order by created_at limit 100) q),'[]'::jsonb);
 elsif p_action='lookup' then
  if p_id is null then raise exception 'VATRA_ID_REQUIRED';end if;
  select jsonb_build_object('vatra_id',a.vatra_id,'name',coalesce(pr.display_name,'VATRA'),'created_at',a.created_at,'verified',exists(select 1 from public.verified_accounts v where v.vatra_id=a.vatra_id),'state',case when s.state='blocked' and s.blocked_until<=now() then 'active' else coalesce(s.state,'active') end,'blocked_until',s.blocked_until,'request_status',v.status) into result from public.accounts a left join public.public_profiles pr using(vatra_id) left join public.account_states s using(vatra_id) left join public.vatra_verification_requests v using(vatra_id) where a.vatra_id=p_id;
  return coalesce(result,'null'::jsonb);
 end if;
 if char_length(why)<3 or char_length(why)>1000 then raise exception 'VATRA_REASON_REQUIRED';end if;
 if p_action='resolve_report' then
  update public.profile_reports set admin_resolution=why,admin_resolved_at=now() where id=p_report and admin_resolved_at is null returning target_vatra_id into p_id;
  if not found then raise exception 'VATRA_REPORT_UNAVAILABLE';end if;
 else
  if p_id is null or not exists(select 1 from public.accounts a where a.vatra_id=p_id) then raise exception 'VATRA_ACCOUNT_NOT_FOUND';end if;
  if p_id=1 and p_action in ('block','unblock','unverify') then raise exception 'VATRA_OWNER_PROTECTED';end if;
  if p_action='verify' then
   insert into public.verified_accounts(vatra_id) values(p_id) on conflict do nothing;
   update public.vatra_verification_requests set status='approved' where vatra_id=p_id;
  elsif p_action='unverify' then
   delete from public.verified_accounts where vatra_id=p_id;
   update public.vatra_verification_requests set status='rejected' where vatra_id=p_id;
  elsif p_action='reject_verification' then
   update public.vatra_verification_requests set status='rejected' where vatra_id=p_id and status='pending';
   if not found then raise exception 'VATRA_REQUEST_UNAVAILABLE';end if;
  elsif p_action='block' then
   if p_days is not null and p_days not in (1,7,30,90) then raise exception 'VATRA_BAD_DURATION';end if;
   if exists(select 1 from public.account_states where vatra_id=p_id and state='deleted') then raise exception 'VATRA_DELETED_ACCOUNT';end if;
   until_at:=case when p_days is null then null else now()+make_interval(days=>p_days) end;
   insert into public.account_states(vatra_id,state,blocked_until,changed_at) values(p_id,'blocked',until_at,now()) on conflict(vatra_id) do update set state='blocked',blocked_until=excluded.blocked_until,changed_at=now();
  elsif p_action='unblock' then
   delete from public.account_states where vatra_id=p_id and state='blocked';
  else raise exception 'VATRA_UNKNOWN_ADMIN_ACTION';end if;
 end if;
 insert into public.vatra_admin_audit(actor_id,target_vatra_id,event,reason) values(auth.uid(),p_id,p_action,why);
 return jsonb_build_object('ok',true);
end $$;
revoke all on function vatra_admin_private.manage(text,bigint,text,integer,uuid) from public,anon,authenticated;
grant execute on function vatra_admin_private.manage(text,bigint,text,integer,uuid) to authenticated;
create function public.vatra_admin_manage(p_action text,p_id bigint default null,p_reason text default '',p_days integer default null,p_report uuid default null) returns jsonb language sql security invoker set search_path='' as $$select vatra_admin_private.manage(p_action,p_id,p_reason,p_days,p_report)$$;
revoke all on function public.vatra_admin_manage(text,bigint,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.vatra_admin_manage(text,bigint,text,integer,uuid) to authenticated;
-- Existing authenticated sessions are constrained by RLS, without deleting accounts.
do $$declare tbl record;begin
 for tbl in select tablename from pg_tables where schemaname='public' and rowsecurity and tablename not in ('accounts','account_states') loop
 execute format('create policy vatra_admin_active_account on public.%I as restrictive for all to authenticated using ((select vatra_admin_private.allowed())) with check ((select vatra_admin_private.allowed()))',tbl.tablename);
 end loop;
end$$;
create policy vatra_admin_active_account on public.accounts as restrictive for insert to authenticated with check((select vatra_admin_private.allowed()));
create policy vatra_admin_active_account_update on public.accounts as restrictive for update to authenticated using((select vatra_admin_private.allowed())) with check((select vatra_admin_private.allowed()));
create policy vatra_admin_active_account_delete on public.accounts as restrictive for delete to authenticated using((select vatra_admin_private.allowed()));
create policy vatra_admin_active_account on storage.objects as restrictive for all to authenticated using((select vatra_admin_private.allowed())) with check((select vatra_admin_private.allowed()));
