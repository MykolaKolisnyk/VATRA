-- Applied to VATRA Supabase as migration 20261113195123.
-- Create new canonical buckets with the old privacy, MIME and size settings.
-- Never mutate storage.objects metadata directly: those are real files in object storage.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
SELECT m.new_id,m.new_id,b.public,b.file_size_limit,b.allowed_mime_types
FROM (VALUES
 ('vatra-avatars','avatars'),('vatra-covers','covers'),
 ('vatra-post-images','post-images'),('vatra-videos','videos')
) AS m(old_id,new_id)
JOIN storage.buckets b ON b.id=m.old_id
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets existing WHERE existing.id=m.new_id);

-- Mirror the existing ten Storage RLS policies for the new IDs. Old and new
-- policies coexist during the frontend rollout; new ones never match old IDs.
DO $migration$
DECLARE
 p record;
 new_policy_name text;
 new_qual text;
 new_check text;
 roles_sql text;
BEGIN
 FOR p IN
  SELECT policyname,permissive,cmd,roles,qual,with_check
  FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects'
   AND policyname IN (
    'attachment_upload_owner','profile_image_delete_owner',
    'profile_image_read_public','profile_image_upload_owner',
    'vatra_comments_media_read_allowed','vatra_gallery_media_read_allowed',
    'vatra_posts_media_delete_owner','vatra_posts_media_read_authenticated',
    'vatra_stories_media_delete_owner','vatra_stories_media_read_allowed'
   )
 LOOP
  new_policy_name=regexp_replace(p.policyname,'^vatra_','')||'_clean_buckets';
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage'
   AND tablename='objects' AND policyname=new_policy_name) THEN
   RAISE EXCEPTION 'Storage policy % already exists',new_policy_name;
  END IF;
  IF p.permissive<>'PERMISSIVE' OR
    p.cmd NOT IN ('SELECT','INSERT','DELETE','UPDATE') OR
    (p.qual IS NULL AND p.with_check IS NULL) THEN
   RAISE EXCEPTION 'Unexpected Storage policy structure %',p.policyname;
  END IF;
  new_qual=p.qual;
  new_check=p.with_check;
  new_qual=replace(replace(replace(replace(new_qual,
   'vatra-avatars','avatars'),'vatra-covers','covers'),
   'vatra-post-images','post-images'),'vatra-videos','videos');
  new_check=replace(replace(replace(replace(new_check,
   'vatra-avatars','avatars'),'vatra-covers','covers'),
   'vatra-post-images','post-images'),'vatra-videos','videos');
  roles_sql=array_to_string(ARRAY(SELECT quote_ident(role_name)
    FROM unnest(p.roles) role_name),', ');
  EXECUTE format('CREATE POLICY %I ON storage.objects AS PERMISSIVE FOR %s TO %s%s%s',
   new_policy_name,p.cmd,roles_sql,
   CASE WHEN new_qual IS NULL THEN '' ELSE format(' USING (%s)',new_qual) END,
   CASE WHEN new_check IS NULL THEN '' ELSE format(' WITH CHECK (%s)',new_check) END);
 END LOOP;
END;
$migration$;
