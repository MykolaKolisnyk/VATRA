create or replace function business_private.current_member() returns bigint
language sql stable security definer set search_path = ''
as $$
 select a.vatra_id from public.accounts a
 join auth.users u on u.id=a.user_id
 where a.user_id=(select auth.uid()) and u.email_confirmed_at is not null
 and not exists(select 1 from public.account_states s where s.vatra_id=a.vatra_id
  and s.state<>'active' and not (s.state='blocked' and s.blocked_until is not null and s.blocked_until<=now()));
$$;
revoke all on function business_private.current_member() from public, anon, authenticated;
grant execute on function business_private.current_member() to authenticated;
