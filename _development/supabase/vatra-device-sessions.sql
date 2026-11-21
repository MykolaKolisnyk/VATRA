begin;
create schema vatra_session_api;
revoke all on schema vatra_session_api from public,anon,authenticated;
grant usage on schema vatra_session_api to authenticated;
create function vatra_session_api.my_sessions()
returns table (browser_agent text, signed_in_at timestamptz, refreshed_at timestamptz, current_session boolean)
language sql stable security definer set search_path = ''
as $$
 select left(coalesce(s.user_agent,''),256),s.created_at,s.refreshed_at at time zone 'UTC',s.id::text=(auth.jwt()->>'session_id')
 from auth.sessions s
 where s.user_id=(select auth.uid())
   and (s.not_after is null or s.not_after>now())
   and exists(select 1 from auth.sessions c where c.user_id=(select auth.uid()) and c.id::text=(auth.jwt()->>'session_id') and (c.not_after is null or c.not_after>now()))
 order by (s.id::text=(auth.jwt()->>'session_id')) desc, coalesce(s.refreshed_at at time zone 'UTC',s.created_at) desc
 limit 100
$$;
revoke all on function vatra_session_api.my_sessions() from public,anon,authenticated;
grant execute on function vatra_session_api.my_sessions() to authenticated;
create function public.vatra_my_sessions()
returns table (browser_agent text, signed_in_at timestamptz, refreshed_at timestamptz, current_session boolean)
language sql stable security invoker set search_path = ''
as $$ select * from vatra_session_api.my_sessions() $$;
revoke all on function public.vatra_my_sessions() from public,anon,authenticated;
grant execute on function public.vatra_my_sessions() to authenticated;
commit;
