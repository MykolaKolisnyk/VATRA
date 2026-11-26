-- STAGED ONLY. Do not execute on production; requires review of ALL remaining
-- RLS/RPC/Realtime/cache/public-object/author-visibility and recovery surfaces.
begin;
set local lock_timeout='3s';
-- Replace the existing moderation predicate without altering its grants or
-- the original moderation semantics. Any pending or purging job denies access,
-- even after its recovery deadline and before a worker claims it.
create or replace function vatra_security_private.allowed() returns boolean
language sql stable security definer set search_path=''
as $$
 select not exists(select 1 from public.accounts a join public.account_states s on s.vatra_id=a.vatra_id
  where a.user_id=auth.uid() and (s.state='deleted' or (s.state='blocked' and (s.blocked_until is null or s.blocked_until>now()))))
 and not exists(select 1 from private.vatra_account_deletion_jobs j where j.user_id=auth.uid())
$$;
-- Identified gap in the current schema. Restrictive AND existing owner/viewer
-- permissions; never replaces the original ownership checks.
create policy vatra_lifecycle_active_account on public.avatar_photo_tags
 as restrictive for all to authenticated
 using((select vatra_security_private.allowed()))
 with check((select vatra_security_private.allowed()));
commit;
