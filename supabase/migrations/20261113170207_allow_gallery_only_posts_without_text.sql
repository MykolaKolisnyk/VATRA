-- Applied to Supabase project rjasunoawrxvetwadylh as migration
-- 20261113170207_allow_gallery_only_posts_without_text.
-- The gallery picker writes attachments into media_items (JSONB), while the
-- original body check allowed an empty body only with legacy media_path.
-- Keep the existing 2,000-character limit and reject truly empty posts.
BEGIN;

ALTER TABLE public.feed_posts
  DROP CONSTRAINT feed_posts_body_length;

ALTER TABLE public.feed_posts
  ADD CONSTRAINT feed_posts_body_length
  CHECK (
    char_length(btrim(body)) <= 2000
    AND (
      char_length(btrim(body)) >= 1
      OR media_path IS NOT NULL
      OR (jsonb_typeof(media_items) = 'array' AND jsonb_array_length(media_items) > 0)
    )
  );

ALTER TABLE public.vatra_community_posts
  DROP CONSTRAINT vatra_community_posts_body_check;

ALTER TABLE public.vatra_community_posts
  ADD CONSTRAINT vatra_community_posts_body_check
  CHECK (
    char_length(btrim(body)) <= 2000
    AND (
      char_length(btrim(body)) >= 1
      OR media_path IS NOT NULL
      OR (jsonb_typeof(media_items) = 'array' AND jsonb_array_length(media_items) > 0)
    )
  );

COMMIT;
