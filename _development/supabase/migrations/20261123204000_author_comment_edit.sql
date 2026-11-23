-- VATRA: author-editable post comments without exposing privileged fields.
-- Deploy only after RLS and browser smoke tests; no existing comments are rewritten.
BEGIN;
GRANT UPDATE(body) ON TABLE public.post_comments TO authenticated;
CREATE POLICY "vatra_comment_author_edit_body"
 ON public.post_comments FOR UPDATE TO authenticated
 USING (author_id=(SELECT auth.uid()) AND moderation_status='visible')
 WITH CHECK (author_id=(SELECT auth.uid()) AND moderation_status='visible');
COMMIT;
