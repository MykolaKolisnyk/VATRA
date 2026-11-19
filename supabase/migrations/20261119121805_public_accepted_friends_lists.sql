begin;
-- Accepted friendships on two public profiles are visible to active signed-in members.
-- Existing participant policies and restrictive block/active-account checks remain intact.
create policy vatra_friends_read_public_accepted on public.friendships
as permissive for select to authenticated using (
 status='accepted'
 and not exists (
  select 1 from public.profile_preferences p
  where p.vatra_id in (requester_id,recipient_id) and p.profile_visibility<>'public'
 )
);
commit;