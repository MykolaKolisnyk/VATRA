-- Allow reports to identify a particular avatar gallery photo, including historical photos.
-- Existing profile/post reports keep their previous RLS, data and deduplication rules.
BEGIN;
ALTER TABLE public.profile_reports ADD COLUMN IF NOT EXISTS photo_path text;
ALTER TABLE public.profile_reports DROP CONSTRAINT IF EXISTS vatra_profile_reports_category_check;
ALTER TABLE public.profile_reports ADD CONSTRAINT vatra_profile_reports_category_check
 CHECK (category IN ('underage','harassment','self_harm','hateful','regulated','adult','fraud',
                    'fake','intellectual_property','other','specific_post','specific_photo'));
ALTER TABLE public.profile_reports DROP CONSTRAINT IF EXISTS vatra_profile_reports_reporter_user_id_target_vatra_id_cate_key;
CREATE UNIQUE INDEX IF NOT EXISTS profile_reports_unique_target_reason_photo
 ON public.profile_reports(reporter_user_id,target_vatra_id,category,reason,COALESCE(photo_path,''));
ALTER TABLE public.profile_reports ADD CONSTRAINT profile_reports_photo_reference_check CHECK (
 (category = 'specific_photo' AND photo_path ~* ('^' || target_vatra_id::text ||
  '/avatar/[a-z0-9_-]+[.](jpg|jpeg|png|webp)$'))
 OR (category <> 'specific_photo' AND photo_path IS NULL)
);
COMMIT;
