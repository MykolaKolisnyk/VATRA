-- Applied to VATRA Supabase as migration 20261113185828.
-- Shared comment-thread paging now computes friends once and likes once.
-- SECURITY INVOKER preserves existing RLS/GRANTs and the RPC return signature.
CREATE OR REPLACE FUNCTION public.vatra_comment_thread_page(p_kind text, p_post_id uuid, p_sort text DEFAULT 'relevant'::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 12, p_parent uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, author_vatra_id bigint, body text, created_at timestamp with time zone, moderation_status text, likes bigint, parent_comment_id uuid, media_kind text, media_path text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
 WITH friend_ids AS MATERIALIZED (
  SELECT CASE
   WHEN f.requester_id = a.vatra_id THEN f.recipient_id
   ELSE f.requester_id
  END AS friend_id
  FROM public.friendships f
  JOIN public.accounts a ON a.user_id = (SELECT auth.uid())
  WHERE p_parent IS NULL AND p_sort = 'relevant'
   AND f.status = 'accepted'
   AND (f.requester_id = a.vatra_id OR f.recipient_id = a.vatra_id)
 )
 SELECT c.id,c.author_vatra_id,c.body,c.created_at,c.moderation_status,
  comment_likes.likes,c.parent_comment_id,c.media_kind,c.media_path
 FROM public.post_comments c
 LEFT JOIN LATERAL (
  SELECT count(*)::bigint AS likes
  FROM public.post_comment_likes cl
  WHERE cl.comment_id = c.id
 ) comment_likes ON true
 WHERE c.post_kind = p_kind AND c.post_id = p_post_id
  AND ((p_parent IS NULL AND c.parent_comment_id IS NULL)
    OR (p_parent IS NOT NULL AND c.parent_comment_id = p_parent))
  AND (p_sort = 'all' OR c.moderation_status = 'visible')
 ORDER BY
  CASE WHEN p_parent IS NOT NULL THEN c.created_at END ASC NULLS LAST,
  CASE WHEN p_parent IS NULL AND p_sort = 'relevant'
    AND c.author_vatra_id IN (SELECT friend_id FROM friend_ids)
   THEN 1 ELSE 0 END DESC,
  CASE WHEN p_parent IS NULL AND p_sort = 'relevant'
   THEN comment_likes.likes ELSE 0 END DESC,
  c.created_at DESC,c.id DESC
 LIMIT least(greatest(coalesce(p_limit,12),1),12)
 OFFSET least(greatest(coalesce(p_offset,0),0),10000)
$function$;
