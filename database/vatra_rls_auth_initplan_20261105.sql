-- VATRA Supabase RLS performance: cache the request identity once per SQL statement.
-- Based on Supabase lint 0003_auth_rls_initplan, November 5, 2026.
-- Keep every existing predicate and assigned role: permissions must not widen.
-- Only replace direct auth.uid() calls with (select auth.uid()).
-- Running this migration does not change CAPTCHA or SMS authentication.

alter policy vatra_mod_restrict_content_insert on public.app_data
 with check (
  (path !~ '^(posts|comments|postLikes|pollVotes|postShares|postSaves|videos|groupPosts|groupMedia|groups|groupMembers|groupAdmins|groupModerators|chats|userChats|following)/'
   or not public.vatra_moderation_account_blocked((select auth.uid())))
  and
  (path !~ '^(groups|groupPosts|groupMedia|groupMembers|groupAdmins|groupModerators)/[^/]+'
   or not public.vatra_moderation_group_blocked(split_part(path, '/', 2)))
 );

alter policy vatra_mod_restrict_content_update on public.app_data
 using (
  (path !~ '^(posts|comments|postLikes|pollVotes|postShares|postSaves|videos|groupPosts|groupMedia|groups|groupMembers|groupAdmins|groupModerators|chats|userChats|following)/'
   or not public.vatra_moderation_account_blocked((select auth.uid())))
  and
  (path !~ '^(groups|groupPosts|groupMedia|groupMembers|groupAdmins|groupModerators)/[^/]+'
   or not public.vatra_moderation_group_blocked(split_part(path, '/', 2)))
 )
 with check (
  (path !~ '^(posts|comments|postLikes|pollVotes|postShares|postSaves|videos|groupPosts|groupMedia|groups|groupMembers|groupAdmins|groupModerators|chats|userChats|following)/'
   or not public.vatra_moderation_account_blocked((select auth.uid())))
  and
  (path !~ '^(groups|groupPosts|groupMedia|groupMembers|groupAdmins|groupModerators)/[^/]+'
   or not public.vatra_moderation_group_blocked(split_part(path, '/', 2)))
 );

alter policy vatra_mod_account_bans_read on public.vatra_moderation_account_bans
 using (public.vatra_moderation_is_admin() or user_id = (select auth.uid()));

alter policy vatra_mod_case_read on public.vatra_moderation_cases
 using (public.vatra_has_permission('view_reports') or reporter_uid = (select auth.uid()));

alter policy vatra_staff_read on public.vatra_staff_members
 using (user_id = (select auth.uid()) or public.vatra_has_permission('staff'));

alter policy vatra_verification_requests_select on public.vatra_verification_requests
 using (applicant_uid = (select auth.uid()) or public.vatra_has_permission('review_verification'));

alter policy vatra_verified_notices_read on public.vatra_verified_notices
 using (recipient_uid = (select auth.uid()));

alter policy vatra_support_tickets_read on public.vatra_support_tickets
 using (
  requester_uid = (select auth.uid())
  or public.vatra_staff_role() = 'owner'
  or (public.vatra_staff_role() = 'support'
      and (assigned_uid = (select auth.uid()) or assigned_uid is null))
 );

alter policy vatra_promo_read on public.vatra_promotions
 using (
  requester_uid = (select auth.uid())
  or (status = 'active' and payment_verified_at is not null
      and starts_at <= now() and ends_at > now())
 );

alter policy vatra_support_alerts_own_read on public.vatra_support_alerts
 using (recipient_uid = (select auth.uid()));
