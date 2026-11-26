begin;
create function vatra_session_api.my_sessions_v2()
returns table(session_id uuid,browser_agent text,signed_in_at timestamptz,refreshed_at timestamptz,current_session boolean)
language sql stable security definer set search_path=''
as $$
 select s.id,left(coalesce(s.user_agent,''),256),s.created_at,s.refreshed_at at time zone 'UTC',s.id::text=(auth.jwt()->>'session_id')
 from auth.sessions s
 where s.user_id=(select auth.uid())
 and (s.not_after is null or s.not_after>now())
 and exists(select 1 from auth.sessions c where c.user_id=(select auth.uid()) and c.id::text=(auth.jwt()->>'session_id') and (c.not_after is null or c.not_after>now()))
 order by (s.id::text=(auth.jwt()->>'session_id')) desc,coalesce(s.refreshed_at at time zone 'UTC',s.created_at) desc
 limit 100
$$;
revoke all on function vatra_session_api.my_sessions_v2() from public,anon,authenticated;
grant execute on function vatra_session_api.my_sessions_v2() to authenticated;
create function public.vatra_my_sessions_v2()
returns table(session_id uuid,browser_agent text,signed_in_at timestamptz,refreshed_at timestamptz,current_session boolean)
language sql stable security invoker set search_path=''
as $$ select * from vatra_session_api.my_sessions_v2() $$;
revoke all on function public.vatra_my_sessions_v2() from public,anon,authenticated;
grant execute on function public.vatra_my_sessions_v2() to authenticated;
create function vatra_session_api.revoke_session(target_session uuid)
returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare caller uuid:=auth.uid(); current_id text:=auth.jwt()->>'session_id'; affected integer;
begin
 if caller is null or current_id is null or target_session is null or target_session::text=current_id then return false; end if;
 perform 1 from auth.sessions c where c.user_id=caller and c.id::text=current_id and (c.not_after is null or c.not_after>now()) for share;
 if not found then return false; end if;
 delete from auth.sessions s where s.id=target_session and s.user_id=caller and s.id::text<>current_id;
 get diagnostics affected=row_count;
 return affected=1;
end
$$;
revoke all on function vatra_session_api.revoke_session(uuid) from public,anon,authenticated;
grant execute on function vatra_session_api.revoke_session(uuid) to authenticated;
create function public.vatra_revoke_session(target_session uuid)
returns boolean language sql volatile security invoker set search_path=''
as $$ select vatra_session_api.revoke_session(target_session) $$;
revoke all on function public.vatra_revoke_session(uuid) from public,anon,authenticated;
grant execute on function public.vatra_revoke_session(uuid) to authenticated;
commit;
