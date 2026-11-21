-- Applied in Supabase project VATRA as migration 20261113144650.
-- Counts only rows visible under the caller's RLS policies.
-- Replaces one SELECT COUNT per root comment in the comment viewer.
CREATE OR REPLACE FUNCTION public.comment_reply_counts(
 p_kind text,
 p_post_id uuid,
 p_parents uuid[]
)
RETURNS TABLE(parent_id uuid,reply_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$
 SELECT c.parent_comment_id, count(*)::bigint
 FROM public.vatra_post_comments c
 WHERE p_kind IN ('person','group')
   AND c.post_kind=p_kind AND c.post_id=p_post_id
   AND c.parent_comment_id=ANY(p_parents)
   AND cardinality(p_parents) BETWEEN 1 AND 24
 GROUP BY c.parent_comment_id
$$;
REVOKE ALL ON FUNCTION public.comment_reply_counts(text,uuid,uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.comment_reply_counts(text,uuid,uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.comment_reply_counts(text,uuid,uuid[]) TO authenticated;
