-- A specific_photo report must always identify a concrete profile-owned avatar path.
BEGIN;
ALTER TABLE public.profile_reports DROP CONSTRAINT IF EXISTS profile_reports_photo_reference_check;
ALTER TABLE public.profile_reports ADD CONSTRAINT profile_reports_photo_reference_check
 CHECK (
  (category = 'specific_photo' AND photo_path IS NOT NULL
   AND photo_path ~* ('^' || target_vatra_id::text ||
    '/avatar/[a-z0-9_-]+[.](jpg|jpeg|png|webp)$'))
  OR (category <> 'specific_photo' AND photo_path IS NULL)
 );
COMMIT;
