begin;
create table vatra_session_api.browser_sessions(
 session_id uuid primary key references auth.sessions(id) on delete cascade,
 browser_key uuid not null
);
alter table vatra_session_api.browser_sessions enable row level security;
revoke all on table vatra_session_api.browser_sessions from public,anon,authenticated;
create index browser_sessions_key_idx on vatra_session_api.browser_sessions(browser_key);
create function vatra_session_api.register_browser_session(expected_session uuid,browser_key uuid)
returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare caller uuid:=auth.uid();
begin
 if caller is null or expected_session is null or browser_key is null or
    coalesce(auth.jwt()->>'session_id','')<>expected_session::text then return false; end if;
 perform 1 from auth.sessions s where s.id=expected_session and s.user_id=caller and (s.not_after is null or s.not_after>now()) for share;
 if not found then return false; end if;
 insert into vatra_session_api.browser_sessions(session_id,browser_key)
 values(expected_session,register_browser_session.browser_key) on conflict(session_id) do nothing;
 return exists(select 1 from vatra_session_api.browser_sessions b where b.session_id=expected_session and b.browser_key=register_browser_session.browser_key);
end
$$;
revoke all on function vatra_session_api.register_browser_session(uuid,uuid) from public,anon,authenticated;
grant execute on function vatra_session_api.register_browser_session(uuid,uuid) to authenticated;
create function public.vatra_register_browser_session(expected_session uuid,browser_key uuid)
returns boolean language sql volatile security invoker set search_path=''
as $$ select vatra_session_api.register_browser_session(expected_session,browser_key) $$;
revoke all on function public.vatra_register_browser_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.vatra_register_browser_session(uuid,uuid) to authenticated;

create function vatra_session_api.my_sessions_v3()
returns table(session_id uuid,browser_agent text,signed_in_at timestamptz,refreshed_at timestamptz,current_session boolean,session_count integer)
language sql stable security definer set search_path=''
as $$
 with own_sessions as (
  select s.id,left(coalesce(s.user_agent,''),256) agent,s.created_at,s.refreshed_at at time zone 'UTC' refreshed,
   s.id::text=(auth.jwt()->>'session_id') current_one,
   case when b.browser_key is not null then 'browser:'||b.browser_key::text else 'session:'||s.id::text end group_key
  from auth.sessions s left join vatra_session_api.browser_sessions b on b.session_id=s.id
  where s.user_id=(select auth.uid()) and (s.not_after is null or s.not_after>now())
  and exists(select 1 from auth.sessions c where c.user_id=(select auth.uid()) and c.id::text=(auth.jwt()->>'session_id') and (c.not_after is null or c.not_after>now()))
 ), ranked as (
  select *,row_number() over(partition by group_key order by current_one desc,greatest(refreshed,created_at) desc,id) rank,
   max(created_at) over(partition by group_key) latest_login,
   max(refreshed) over(partition by group_key) latest_refresh,
   bool_or(current_one) over(partition by group_key) is_current,
   (count(*) over(partition by group_key))::integer total_sessions
  from own_sessions
 )
 select id,agent,latest_login,latest_refresh,is_current,total_sessions from ranked where rank=1
 order by is_current desc,greatest(latest_refresh,latest_login) desc,id limit 100
$$;
revoke all on function vatra_session_api.my_sessions_v3() from public,anon,authenticated;
grant execute on function vatra_session_api.my_sessions_v3() to authenticated;
create function public.vatra_my_sessions_v3()
returns table(session_id uuid,browser_agent text,signed_in_at timestamptz,refreshed_at timestamptz,current_session boolean,session_count integer)
language sql stable security invoker set search_path=''
as $$ select * from vatra_session_api.my_sessions_v3() $$;
revoke all on function public.vatra_my_sessions_v3() from public,anon,authenticated;
grant execute on function public.vatra_my_sessions_v3() to authenticated;

create function vatra_session_api.revoke_browser_sessions(target_session uuid)
returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare caller uuid:=auth.uid(); current_id text:=auth.jwt()->>'session_id'; target_key uuid; affected integer;
begin
 if caller is null or current_id is null or target_session is null or target_session::text=current_id then return false; end if;
 perform 1 from auth.sessions c where c.user_id=caller and c.id::text=current_id and (c.not_after is null or c.not_after>now()) for update;
 if not found then return false; end if;
 select b.browser_key into target_key from auth.sessions s left join vatra_session_api.browser_sessions b on b.session_id=s.id
 where s.id=target_session and s.user_id=caller and (s.not_after is null or s.not_after>now());
 if not found then return false; end if;
 if target_key is not null and exists(select 1 from vatra_session_api.browser_sessions b where b.session_id::text=current_id and b.browser_key=target_key) then return false; end if;
 delete from auth.sessions s where s.user_id=caller and s.id::text<>current_id and
 (s.id=target_session or (target_key is not null and exists(select 1 from vatra_session_api.browser_sessions b where b.session_id=s.id and b.browser_key=target_key)));
 get diagnostics affected=row_count;
 return affected>0;
end
$$;
revoke all on function vatra_session_api.revoke_browser_sessions(uuid) from public,anon,authenticated;
grant execute on function vatra_session_api.revoke_browser_sessions(uuid) to authenticated;
create function public.vatra_revoke_browser_sessions(target_session uuid)
returns boolean language sql volatile security invoker set search_path=''
as $$ select vatra_session_api.revoke_browser_sessions(target_session) $$;
revoke all on function public.vatra_revoke_browser_sessions(uuid) from public,anon,authenticated;
grant execute on function public.vatra_revoke_browser_sessions(uuid) to authenticated;
commit;
