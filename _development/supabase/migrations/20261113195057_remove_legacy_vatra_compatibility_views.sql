-- Applied to VATRA Supabase as migration 20261113195057.
-- These are 21 legacy RLS-invoker compatibility views, not physical tables.
-- RESTRICT refuses to drop a view if an unexamined dependency exists.
DROP VIEW IF EXISTS public.vatra_account_states RESTRICT;
DROP VIEW IF EXISTS public.vatra_avatar_comment_likes RESTRICT;
DROP VIEW IF EXISTS public.vatra_avatar_comments RESTRICT;
DROP VIEW IF EXISTS public.vatra_avatar_likes RESTRICT;
DROP VIEW IF EXISTS public.vatra_blocks RESTRICT;
DROP VIEW IF EXISTS public.vatra_community_follows RESTRICT;
DROP VIEW IF EXISTS public.vatra_community_posts RESTRICT;
DROP VIEW IF EXISTS public.vatra_direct_messages RESTRICT;
DROP VIEW IF EXISTS public.vatra_directory RESTRICT;
DROP VIEW IF EXISTS public.vatra_friendships RESTRICT;
DROP VIEW IF EXISTS public.vatra_post_comment_likes RESTRICT;
DROP VIEW IF EXISTS public.vatra_post_comments RESTRICT;
DROP VIEW IF EXISTS public.vatra_post_like_members RESTRICT;
DROP VIEW IF EXISTS public.vatra_post_likes RESTRICT;
DROP VIEW IF EXISTS public.vatra_profile_details RESTRICT;
DROP VIEW IF EXISTS public.vatra_profile_gifts RESTRICT;
DROP VIEW IF EXISTS public.vatra_profile_media RESTRICT;
DROP VIEW IF EXISTS public.vatra_profile_preferences RESTRICT;
DROP VIEW IF EXISTS public.vatra_profile_reports RESTRICT;
DROP VIEW IF EXISTS public.vatra_public_profiles RESTRICT;
DROP VIEW IF EXISTS public.vatra_stories RESTRICT;
