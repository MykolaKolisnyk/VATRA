-- Applied to Supabase project rjasunoawrxvetwadylh as migration
-- 20261113165546_restore_authenticated_feed_posts_data_api_permissions.
-- A previously restrictive table ACL allowed DELETE only for authenticated,
-- resulting in "permission denied for table feed_posts" on publishing.
-- Supabase Data API requires table-level grants in addition to RLS.
--
-- Keep RLS and all owner-/audience-scoped policies intact; do NOT grant anon.
GRANT SELECT, INSERT, UPDATE ON TABLE public.feed_posts TO authenticated;
