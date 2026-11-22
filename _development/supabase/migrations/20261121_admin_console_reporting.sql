create extension if not exists pg_trgm with schema extensions;
create index if not exists admin_profiles_name_search_idx on public.public_profiles using gin ((lower(coalesce(display_name,''))) extensions.gin_trgm_ops);
create index if not exists admin_accounts_created_idx on public.accounts(created_at desc, vatra_id desc);
create index if not exists admin_audit_recent_idx on public.admin_audit(created_at desc,id desc);
create index if not exists admin_presence_recent_idx on public.profile_presence(last_seen_at desc);
create index if not exists admin_profile_reports_resolved_idx on public.profile_reports(admin_resolved_at desc) where admin_resolved_at is not null;

create or replace function vatra_admin_private.console_read(p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
 v_page integer := 0;
 v_limit constant integer := 25;
 v_q text := '';
 v_filter text := 'all';
 v_id bigint;
 v_total bigint;
 v_rows jsonb;
 v_data jsonb;
begin
 if not vatra_admin_private.is_owner() then
  raise exception 'VATRA_ADMIN_REQUIRED' using errcode='42501';
 end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then
  raise exception 'INVALID_ADMIN_PARAMETERS' using errcode='22023';
 end if;
 if p_payload ? 'page' and (p_payload->>'page' !~ '^[0-9]{1,6}
  raise exception 'INVALID_ADMIN_PAGE' using errcode='22023';
 end if;
 v_page:=least(500000,coalesce((p_payload->>'page')::integer,0));
 if p_action='members_page' then
  v_q:=lower(btrim(coalesce(p_payload->>'query','')));
  v_filter:=coalesce(p_payload->>'status','all');
  if char_length(v_q)>90 or v_filter not in ('all','active','blocked','verified') then
   raise exception 'INVALID_ADMIN_FILTER' using errcode='22023';
  end if;
  select count(*) into v_total from public.accounts a
   left join public.public_profiles pr on pr.vatra_id=a.vatra_id
   left join public.account_states st on st.vatra_id=a.vatra_id
   where (v_q='' or lower(coalesce(pr.display_name,'')) like '%'||v_q||'%' or a.vatra_id::text like v_q||'%')
    and (v_filter='all'
      or (v_filter='blocked' and st.state='blocked' and (st.blocked_until is null or st.blocked_until>now()))
      or (v_filter='active' and (st.state is null or st.state='active' or (st.state='blocked' and st.blocked_until<=now())))
      or (v_filter='verified' and exists(select 1 from public.verified_accounts v where v.vatra_id=a.vatra_id)));
  select coalesce(jsonb_agg(to_jsonb(row_data)),'[]'::jsonb) into v_rows
   from (
    select a.vatra_id,coalesce(nullif(pr.display_name,''),'Учасник') as name,a.created_at,
     exists(select 1 from public.verified_accounts v where v.vatra_id=a.vatra_id) as verified,
     case when st.state='blocked' and st.blocked_until<=now() then 'active'
      else coalesce(st.state,'active') end as state,st.blocked_until
    from public.accounts a
    left join public.public_profiles pr on pr.vatra_id=a.vatra_id
    left join public.account_states st on st.vatra_id=a.vatra_id
    where (v_q='' or lower(coalesce(pr.display_name,'')) like '%'||v_q||'%' or a.vatra_id::text like v_q||'%')
     and (v_filter='all'
       or (v_filter='blocked' and st.state='blocked' and (st.blocked_until is null or st.blocked_until>now()))
       or (v_filter='active' and (st.state is null or st.state='active' or (st.state='blocked' and st.blocked_until<=now())))
       or (v_filter='verified' and exists(select 1 from public.verified_accounts v where v.vatra_id=a.vatra_id)))
    order by a.created_at desc,a.vatra_id desc
    limit v_limit offset v_page*v_limit
   ) row_data;
  return jsonb_build_object('total',v_total,'items',v_rows,'page',v_page,'page_size',v_limit);
 elsif p_action='member_detail' then
  if coalesce(p_payload->>'id','') !~ '^[1-9][0-9]{0,18}$' then
   raise exception 'INVALID_MEMBER_ID' using errcode='22023';
  end if;
  v_id:=(p_payload->>'id')::bigint;
  if not exists(select 1 from public.accounts where vatra_id=v_id) then
   return 'null'::jsonb;
  end if;
  return jsonb_build_object(
   'posts',(select count(*) from public.feed_posts where author_vatra_id=v_id),
   'comments',(select count(*) from public.post_comments where author_vatra_id=v_id),
   'stories',(select count(*) from public.stories where author_vatra_id=v_id),
   'reports',(select count(*) from public.profile_reports where target_vatra_id=v_id),
   'last_seen_at',(select last_seen_at from public.profile_presence where vatra_id=v_id),
   'recent_actions',coalesce((select jsonb_agg(to_jsonb(x)) from
     (select event,reason,created_at from public.admin_audit where target_vatra_id=v_id order by created_at desc limit 5)x),'[]'::jsonb));
 elsif p_action='analytics' then
  with dates as (
    select generate_series(((now() at time zone 'Europe/Kyiv')::date-13),((now() at time zone 'Europe/Kyiv')::date),'1 day'::interval)::date as day
  ), signups as (
    select (created_at at time zone 'Europe/Kyiv')::date as day,count(*) as value
    from public.accounts
    where created_at>=now()-interval '15 days'
    group by 1
  ), posts as (
    select (created_at at time zone 'Europe/Kyiv')::date as day,count(*) as value
    from public.feed_posts where created_at>=now()-interval '15 days'
    group by 1
  ), comments as (
    select (created_at at time zone 'Europe/Kyiv')::date as day,count(*) as value
    from public.post_comments where created_at>=now()-interval '15 days'
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object('date',d.day,'signups',coalesce(s.value,0),'posts',coalesce(p.value,0),'comments',coalesce(c.value,0)) order by d.day),'[]'::jsonb)
  into v_data from dates d left join signups s using(day) left join posts p using(day) left join comments c using(day);
  return jsonb_build_object('daily',v_data,
   'active_24h',(select count(*) from public.profile_presence where last_seen_at>=now()-interval '24 hours'),
   'active_7d',(select count(*) from public.profile_presence where last_seen_at>=now()-interval '7 days'),
   'posts_7d',(select count(*) from public.feed_posts where created_at>=now()-interval '7 days'),
   'comments_7d',(select count(*) from public.post_comments where created_at>=now()-interval '7 days'));
 elsif p_action='health' then
  return jsonb_build_object(
   'checked_at',now(),
   'db_connections',(select numbackends from pg_catalog.pg_stat_database where datname=current_database()),
   'database_size_bytes',pg_catalog.pg_database_size(current_database()),
   'storage_buckets',coalesce((select jsonb_agg(jsonb_build_object('name',name,'limit_bytes',file_size_limit) order by name)
      from storage.buckets where name in ('avatars','covers','post-images','videos')),'[]'::jsonb),
   'maintenance',(select enabled from public.site_maintenance where id=1),
   'moderation_pending',(select count(*) from public.profile_reports where admin_resolved_at is null),
   'audit_24h',(select count(*) from public.admin_audit where created_at>=now()-interval '24 hours'));
 elsif p_action='requests_history' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_data from (
   select v.vatra_id,v.reason,v.created_at,v.status,p.display_name
   from public.verification_requests v left join public.public_profiles p using(vatra_id)
   where v.status<>'pending' order by v.created_at desc limit 50
  ) x;
  return v_data;
 elsif p_action='reports_history' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_data from (
   select id,target_vatra_id,category,reason,admin_resolution,created_at,admin_resolved_at
   from public.profile_reports where admin_resolved_at is not null order by admin_resolved_at desc limit 50
  ) x;
  return v_data;
 elsif p_action='audit_page' then
  v_q:=coalesce(p_payload->>'event','all');
  if char_length(v_q)>48 or v_q not in ('all','verify','unverify','block','unblock','reject_verification','resolve_report') then
   raise exception 'INVALID_AUDIT_FILTER' using errcode='22023';
  end if;
  select count(*) into v_total from public.admin_audit where v_q='all' or event=v_q;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_data from (
   select id,target_vatra_id,event,reason,created_at
   from public.admin_audit where v_q='all' or event=v_q
   order by created_at desc,id desc limit v_limit offset v_page*v_limit
  ) x;
  return jsonb_build_object('total',v_total,'page',v_page,'page_size',v_limit,'items',v_data);
 else
  raise exception 'UNKNOWN_ADMIN_READ_ACTION' using errcode='22023';
 end if;
end
$fn$;

revoke all on function vatra_admin_private.console_read(text,jsonb) from public;
grant usage on schema vatra_admin_private to authenticated;
grant execute on function vatra_admin_private.console_read(text,jsonb) to authenticated;

create or replace function public.admin_console_read(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb
language sql
security invoker
set search_path to ''
as $fn$select vatra_admin_private.console_read(p_action,p_payload)$fn$;
revoke all on function public.admin_console_read(text,jsonb) from public;
revoke all on function public.admin_console_read(text,jsonb) from anon;
grant execute on function public.admin_console_read(text,jsonb) to authenticated;
) then
  raise exception 'INVALID_ADMIN_PAGE' using errcode='22023';
 end if;
 v_page:=least(500000,coalesce((p_payload->>'page')::integer,0));
 if p_action='members_page' then
  v_q:=lower(btrim(coalesce(p_payload->>'query','')));
  v_filter:=coalesce(p_payload->>'status','all');
  if char_length(v_q)>90 or v_filter not in ('all','active','blocked','verified') then
   raise exception 'INVALID_ADMIN_FILTER' using errcode='22023';
  end if;
  select count(*) into v_total from public.accounts a
   left join public.public_profiles pr on pr.vatra_id=a.vatra_id
   left join public.account_states st on st.vatra_id=a.vatra_id
   where (v_q='' or lower(coalesce(pr.display_name,'')) like '%'||v_q||'%' or a.vatra_id::text like v_q||'%')
    and (v_filter='all'
      or (v_filter='blocked' and st.state='blocked' and (st.blocked_until is null or st.blocked_until>now()))
      or (v_filter='active' and (st.state is null or st.state='active' or (st.state='blocked' and st.blocked_until<=now())))
      or (v_filter='verified' and exists(select 1 from public.verified_accounts v where v.vatra_id=a.vatra_id)));
  select coalesce(jsonb_agg(to_jsonb(row_data)),'[]'::jsonb) into v_rows
   from (
    select a.vatra_id,coalesce(nullif(pr.display_name,''),'Учасник') as name,a.created_at,
     exists(select 1 from public.verified_accounts v where v.vatra_id=a.vatra_id) as verified,
     case when st.state='blocked' and st.blocked_until<=now() then 'active'
      else coalesce(st.state,'active') end as state,st.blocked_until
    from public.accounts a
    left join public.public_profiles pr on pr.vatra_id=a.vatra_id
    left join public.account_states st on st.vatra_id=a.vatra_id
    where (v_q='' or lower(coalesce(pr.display_name,'')) like '%'||v_q||'%' or a.vatra_id::text like v_q||'%')
     and (v_filter='all'
       or (v_filter='blocked' and st.state='blocked' and (st.blocked_until is null or st.blocked_until>now()))
       or (v_filter='active' and (st.state is null or st.state='active' or (st.state='blocked' and st.blocked_until<=now())))
       or (v_filter='verified' and exists(select 1 from public.verified_accounts v where v.vatra_id=a.vatra_id)))
    order by a.created_at desc,a.vatra_id desc
    limit v_limit offset v_page*v_limit
   ) row_data;
  return jsonb_build_object('total',v_total,'items',v_rows,'page',v_page,'page_size',v_limit);
 elsif p_action='member_detail' then
  if coalesce(p_payload->>'id','') !~ '^[1-9][0-9]{0,18}$' then
   raise exception 'INVALID_MEMBER_ID' using errcode='22023';
  end if;
  v_id:=(p_payload->>'id')::bigint;
  if not exists(select 1 from public.accounts where vatra_id=v_id) then
   return 'null'::jsonb;
  end if;
  return jsonb_build_object(
   'posts',(select count(*) from public.feed_posts where author_vatra_id=v_id),
   'comments',(select count(*) from public.post_comments where author_vatra_id=v_id),
   'stories',(select count(*) from public.stories where author_vatra_id=v_id),
   'reports',(select count(*) from public.profile_reports where target_vatra_id=v_id),
   'last_seen_at',(select last_seen_at from public.profile_presence where vatra_id=v_id),
   'recent_actions',coalesce((select jsonb_agg(to_jsonb(x)) from
     (select event,reason,created_at from public.admin_audit where target_vatra_id=v_id order by created_at desc limit 5)x),'[]'::jsonb));
 elsif p_action='analytics' then
  with dates as (
    select generate_series(((now() at time zone 'Europe/Kyiv')::date-13),((now() at time zone 'Europe/Kyiv')::date),'1 day'::interval)::date as day
  ), signups as (
    select (created_at at time zone 'Europe/Kyiv')::date as day,count(*) as value
    from public.accounts
    where created_at>=now()-interval '15 days'
    group by 1
  ), posts as (
    select (created_at at time zone 'Europe/Kyiv')::date as day,count(*) as value
    from public.feed_posts where created_at>=now()-interval '15 days'
    group by 1
  ), comments as (
    select (created_at at time zone 'Europe/Kyiv')::date as day,count(*) as value
    from public.post_comments where created_at>=now()-interval '15 days'
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object('date',d.day,'signups',coalesce(s.value,0),'posts',coalesce(p.value,0),'comments',coalesce(c.value,0)) order by d.day),'[]'::jsonb)
  into v_data from dates d left join signups s using(day) left join posts p using(day) left join comments c using(day);
  return jsonb_build_object('daily',v_data,
   'active_24h',(select count(*) from public.profile_presence where last_seen_at>=now()-interval '24 hours'),
   'active_7d',(select count(*) from public.profile_presence where last_seen_at>=now()-interval '7 days'),
   'posts_7d',(select count(*) from public.feed_posts where created_at>=now()-interval '7 days'),
   'comments_7d',(select count(*) from public.post_comments where created_at>=now()-interval '7 days'));
 elsif p_action='health' then
  return jsonb_build_object(
   'checked_at',now(),
   'db_connections',(select numbackends from pg_catalog.pg_stat_database where datname=current_database()),
   'database_size_bytes',pg_catalog.pg_database_size(current_database()),
   'storage_buckets',coalesce((select jsonb_agg(jsonb_build_object('name',name,'limit_bytes',file_size_limit) order by name)
      from storage.buckets where name in ('avatars','covers','post-images','videos')),'[]'::jsonb),
   'maintenance',(select enabled from public.site_maintenance where id=1),
   'moderation_pending',(select count(*) from public.profile_reports where admin_resolved_at is null),
   'audit_24h',(select count(*) from public.admin_audit where created_at>=now()-interval '24 hours'));
 elsif p_action='requests_history' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_data from (
   select v.vatra_id,v.reason,v.created_at,v.status,p.display_name
   from public.verification_requests v left join public.public_profiles p using(vatra_id)
   where v.status<>'pending' order by v.created_at desc limit 50
  ) x;
  return v_data;
 elsif p_action='reports_history' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_data from (
   select id,target_vatra_id,category,reason,admin_resolution,created_at,admin_resolved_at
   from public.profile_reports where admin_resolved_at is not null order by admin_resolved_at desc limit 50
  ) x;
  return v_data;
 elsif p_action='audit_page' then
  v_q:=coalesce(p_payload->>'event','all');
  if char_length(v_q)>48 or v_q not in ('all','verify','unverify','block','unblock','reject_verification','resolve_report') then
   raise exception 'INVALID_AUDIT_FILTER' using errcode='22023';
  end if;
  select count(*) into v_total from public.admin_audit where v_q='all' or event=v_q;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_data from (
   select id,target_vatra_id,event,reason,created_at
   from public.admin_audit where v_q='all' or event=v_q
   order by created_at desc,id desc limit v_limit offset v_page*v_limit
  ) x;
  return jsonb_build_object('total',v_total,'page',v_page,'page_size',v_limit,'items',v_data);
 else
  raise exception 'UNKNOWN_ADMIN_READ_ACTION' using errcode='22023';
 end if;
end
$fn$;

revoke all on function vatra_admin_private.console_read(text,jsonb) from public;
grant usage on schema vatra_admin_private to authenticated;
grant execute on function vatra_admin_private.console_read(text,jsonb) to authenticated;

create or replace function public.admin_console_read(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb
language sql
security invoker
set search_path to ''
as $fn$select vatra_admin_private.console_read(p_action,p_payload)$fn$;
revoke all on function public.admin_console_read(text,jsonb) from public;
revoke all on function public.admin_console_read(text,jsonb) from anon;
grant execute on function public.admin_console_read(text,jsonb) to authenticated;
