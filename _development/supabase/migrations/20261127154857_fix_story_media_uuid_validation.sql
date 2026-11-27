SET LOCAL lock_timeout = '5s';
ALTER TABLE public.stories
 DROP CONSTRAINT vatra_stories_media_fields_check,
 ADD CONSTRAINT vatra_stories_media_fields_check CHECK ((
  (media_kind IS NULL AND media_path IS NULL)
  OR (media_kind = 'image' AND media_path IS NOT NULL AND media_path ~ ('^' || author_vatra_id::text || '/stories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$'))
  OR (media_kind = 'video' AND media_path IS NOT NULL AND media_path ~ ('^' || author_vatra_id::text || '/stories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm)$'))
 ) IS TRUE);
