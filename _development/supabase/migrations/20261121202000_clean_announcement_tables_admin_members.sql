begin;
alter table public.vatra_announcements rename to announcements;
alter table public.vatra_announcement_views rename to announcement_views;
alter sequence public.vatra_announcements_id_seq rename to announcements_id_seq;
alter index public.vatra_announcements_pkey rename to announcements_pkey;
alter index public.vatra_announcement_views_pkey rename to announcement_views_pkey;
alter index public.vatra_announcements_active_created_idx rename to announcements_active_created_idx;
alter index public.vatra_announcement_views_member_idx rename to announcement_views_member_idx;
alter table public.announcements rename constraint vatra_announcement_time_check to announcement_time_check;
alter table public.announcements rename constraint vatra_announcements_body_en_check to announcements_body_en_check;
alter table public.announcements rename constraint vatra_announcements_body_uk_check to announcements_body_uk_check;
alter table public.announcements rename constraint vatra_announcements_target_path_check to announcements_target_path_check;
alter table public.announcements rename constraint vatra_announcements_title_en_check to announcements_title_en_check;
alter table public.announcements rename constraint vatra_announcements_title_uk_check to announcements_title_uk_check;
alter table public.announcement_views rename constraint vatra_announcement_views_announcement_id_fkey to announcement_views_announcement_id_fkey;
alter policy vatra_announcement_read on public.announcements rename to announcement_read;
alter policy vatra_announcement_owner_insert on public.announcements rename to announcement_owner_insert;
alter policy vatra_announcement_owner_update on public.announcements rename to announcement_owner_update;
alter policy vatra_announcement_owner_delete on public.announcements rename to announcement_owner_delete;
alter policy vatra_announcement_views_own_read on public.announcement_views rename to announcement_views_own_read;
alter policy vatra_announcement_views_own_insert on public.announcement_views rename to announcement_views_own_insert;
CREATE OR REPLACE FUNCTION vatra_admin_private.manage(p_action text, p_id bigint DEFAULT NULL::bigint, p_reason text DEFAULT ''::text, p_days integer DEFAULT NULL::integer, p_report uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; why text:=btrim(coalesce(p_reason,'')); until_at timestamptz;
begin
 if not vatra_admin_private.is_owner() then raise exception 'VATRA_ADMIN_REQUIRED' using errcode='42501';end if;
 if p_action='dashboard' then
  return jsonb_build_object('accounts',(select count(*) from public.accounts),'verified',(select count(*) from public.verified_accounts),'blocked',(select count(*) from public.account_states where state='blocked' and (blocked_until is null or blocked_until>now())),'posts',(select count(*) from public.feed_posts),'communities',(select count(*) from public.communities),'market_pending',(select count(*) from public.marketplace_listings where moderation_status='pending'),'verification_pending',(select count(*) from public.verification_requests where status='pending'),'reports_pending',(select count(*) from public.profile_reports where admin_resolved_at is null));
 elsif p_action='members' then
  return jsonb_build_object('total',(select count(*) from public.accounts),
   'items',coalesce((select jsonb_agg(to_jsonb(q)) from (
    select a.vatra_id,coalesce(nullif(pr.display_name,''),'Учасник') as name,a.created_at,
     exists(select 1 from public.verified_accounts v where v.vatra_id=a.vatra_id) as verified,
     case when st.state='blocked' and st.blocked_until<=now() then 'active'
      else coalesce(st.state,'active') end as state,st.blocked_until
    from public.accounts a
    left join public.public_profiles pr on pr.vatra_id=a.vatra_id
    left join public.account_states st on st.vatra_id=a.vatra_id
    order by a.created_at desc,a.vatra_id desc
    limit 50
   ) q),'[]'::jsonb));
 elsif p_action='requests' then
  return coalesce((select jsonb_agg(to_jsonb(q)) from (select v.vatra_id,v.reason,v.created_at,p.display_name from public.verification_requests v left join public.public_profiles p using(vatra_id) where v.status='pending' order by v.created_at limit 100) q),'[]'::jsonb);
 elsif p_action='reports' then
  return coalesce((select jsonb_agg(to_jsonb(q)) from (select id,target_vatra_id,category,reason,details,created_at from public.profile_reports where admin_resolved_at is null order by created_at limit 100) q),'[]'::jsonb);
 elsif p_action='lookup' then
  if p_id is null then raise exception 'VATRA_ID_REQUIRED';end if;
  select jsonb_build_object('vatra_id',a.vatra_id,'name',coalesce(pr.display_name,'VATRA'),'created_at',a.created_at,'verified',exists(select 1 from public.verified_accounts v where v.vatra_id=a.vatra_id),'state',case when s.state='blocked' and s.blocked_until<=now() then 'active' else coalesce(s.state,'active') end,'blocked_until',s.blocked_until,'request_status',v.status) into result from public.accounts a left join public.public_profiles pr using(vatra_id) left join public.account_states s using(vatra_id) left join public.verification_requests v using(vatra_id) where a.vatra_id=p_id;
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
   update public.verification_requests set status='approved' where vatra_id=p_id;
  elsif p_action='unverify' then
   delete from public.verified_accounts where vatra_id=p_id;
   update public.verification_requests set status='rejected' where vatra_id=p_id;
  elsif p_action='reject_verification' then
   update public.verification_requests set status='rejected' where vatra_id=p_id and status='pending';
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
 insert into public.admin_audit(actor_id,target_vatra_id,event,reason) values(auth.uid(),p_id,p_action,why);
 return jsonb_build_object('ok',true);
end $function$
;
commit;
