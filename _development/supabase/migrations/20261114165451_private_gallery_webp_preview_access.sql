-- VATRA private WebP gallery thumbnails.
-- Applied to Supabase project rjasunoawrxvetwadylh as migration 20261114165451.
-- Only authenticated viewers who can read the parent post through RLS
-- may sign its referenced thumbnail. The originals remain private.
CREATE POLICY gallery_private_webp_previews_read
ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
USING (
 bucket_id='post-images'
 AND storage.extension(name)='webp'
 AND (storage.foldername(name))[2]='posts'
 AND array_length(storage.foldername(name),1)=2
 AND (
  EXISTS (
   SELECT 1 FROM public.feed_posts p
   WHERE split_part(objects.name,'/',1)=p.author_vatra_id::text
    AND EXISTS (
     SELECT 1 FROM jsonb_array_elements(p.media_items) item
     WHERE item->>'media_kind'='image'
      AND item->>'preview_path'=objects.name
      AND split_part(item->>'media_path','/',1)=p.author_vatra_id::text
      AND split_part(item->>'media_path','/',2)='posts'
    )
  )
  OR EXISTS (
   SELECT 1 FROM public.community_posts p
   WHERE split_part(objects.name,'/',1)=p.author_vatra_id::text
    AND EXISTS (
     SELECT 1 FROM jsonb_array_elements(p.media_items) item
     WHERE item->>'media_kind'='image'
      AND item->>'preview_path'=objects.name
      AND split_part(item->>'media_path','/',1)=p.author_vatra_id::text
      AND split_part(item->>'media_path','/',2)='posts'
    )
  )
 )
);
