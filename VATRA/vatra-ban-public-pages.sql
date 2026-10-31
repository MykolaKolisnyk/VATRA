-- VATRA: public suspension pages without deleting profiles or communities from discovery.
-- Apply AFTER vatra-staff-verification.sql and vatra-support-desk.sql.
begin;
drop policy if exists vatra_mod_restrict_content_select on public.app_data;
create policy vatra_mod_restrict_content_select on public.app_data as restrictive
for select to anon, authenticated using (
 -- Keep community metadata and public profiles visible so friends/search keep names.
 -- Block community content/interactions, not the community identity record.
 (path !~ '^(groupPosts|groupMedia)/[^/]+'
  or not public.vatra_moderation_group_blocked(split_part(path,'/',2)))
 and (path !~ '^(posts|groupPosts|comments|videos)/'
  or not public.vatra_moderation_account_blocked(
    case when coalesce(value->>'authorUid',value->>'uid','') ~ '^[0-9a-fA-F-]{36}$'
      then coalesce(value->>'authorUid',value->>'uid')::uuid else null end))
);
-- The preexisting hidden-content policy still protects removed material.
-- Public can see only minimal state. Reason, duration and timestamps are
-- disclosed to the affected account, community creator or authorized staff.
create or replace function public.vatra_public_ban_status(_kind text,_target text)
returns jsonb language plpgsql stable security definer
set search_path='' set row_security=off as $ban$
declare target_uid uuid; ban_reason text; until_at timestamptz; since_at timestamptz;
        ban_active boolean; entitled boolean:=false; gid jsonb;
begin
 if _kind='account' then
  if coalesce(_target,'') !~ '^[0-9a-fA-F-]{36}$' then return jsonb_build_object('blocked',false); end if;
  target_uid:=_target::uuid;
  select active and (expires_at is null or expires_at>now()),reason,expires_at,updated_at
   into ban_active,ban_reason,until_at,since_at
   from public.vatra_moderation_account_bans where user_id=target_uid;
  entitled := (auth.uid()=target_uid) or
   coalesce(public.vatra_has_permission('view_reports'),false);
 elsif _kind='community' then
  if coalesce(_target,'') !~ '^[a-zA-Z0-9_-]{1,128}$' then return jsonb_build_object('blocked',false); end if;
  select active and (expires_at is null or expires_at>now()),reason,expires_at,updated_at
   into ban_active,ban_reason,until_at,since_at
   from public.vatra_moderation_group_bans where group_id=_target;
  select value into gid from public.app_data where path='groups/'||_target;
  entitled := (auth.uid() is not null and coalesce(gid->>'ownerUid','')=auth.uid()::text) or
   coalesce(public.vatra_has_permission('view_reports'),false);
 else return jsonb_build_object('blocked',false);
 end if;
 if coalesce(ban_active,false)=false then return jsonb_build_object('blocked',false); end if;
 return jsonb_build_object('blocked',true,'kind',_kind,'target',_target,
 'reason',case when entitled then ban_reason else null end,
 'expiresAt',case when entitled then until_at else null end,
 'sinceAt',case when entitled then since_at else null end,
 'permanent',case when entitled then until_at is null else null end,
 'canSeeDetails',entitled);
end $ban$;
revoke all on function public.vatra_public_ban_status(text,text) from public;
grant execute on function public.vatra_public_ban_status(text,text) to anon,authenticated;
commit;