-- Applied to Supabase project rjasunoawrxvetwadylh on 2026-11-13.
-- Both community indexes were unused because the table is currently empty.
-- This is a structural duplicate, not only a "never used" guess:
--   community_posts_club_newest_idx (club_id, created_at DESC, id DESC)
-- fully covers the leading columns of:
--   vatra_community_posts_club_idx (club_id, created_at DESC)
-- Keep the longer index for pagination and club filtering.
DROP INDEX IF EXISTS public.vatra_community_posts_club_idx;
