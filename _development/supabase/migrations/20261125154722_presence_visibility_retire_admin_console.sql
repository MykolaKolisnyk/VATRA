alter table public.profile_preferences add column presence_visibility text not null default 'public' check (presence_visibility in ('public','friends','private'));
create policy profile_presence_visibility_gate on public.profile_presence as restrictive for select to authenticated using (
 exists(select 1 from public.accounts a where a.vatra_id=profile_presence.vatra_id and a.user_id=(select auth.uid()))
 or coalesce((select p.presence_visibility from public.profile_preferences p where p.vatra_id=profile_presence.vatra_id),'public')='public'
 or (
  (select p.presence_visibility from public.profile_preferences p where p.vatra_id=profile_presence.vatra_id)='friends'
  and exists(select 1 from public.friendships f join public.accounts viewer on (viewer.vatra_id=f.requester_id or viewer.vatra_id=f.recipient_id)
  where viewer.user_id=(select auth.uid()) and f.status='accepted' and ((f.requester_id=profile_presence.vatra_id and f.recipient_id=viewer.vatra_id) or (f.recipient_id=profile_presence.vatra_id and f.requester_id=viewer.vatra_id)))
 )
);
drop function public.admin_console_read(text,jsonb) restrict;
drop function public.vatra_admin_manage(text,bigint,text,integer,uuid) restrict;
drop function public.vatra_admin_access() restrict;
drop function vatra_admin_private.console_read(text,jsonb) restrict;
drop function vatra_admin_private.manage(text,bigint,text,integer,uuid) restrict;
