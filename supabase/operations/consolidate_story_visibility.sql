-- Applied to VATRA's live Supabase project on 2026-11-13.
-- Re-run only if an environment still has the two legacy permissive rules.
-- The separate restrictive block policy must be retained.
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vatra_stories'
           AND policyname='story_read_friends')
 AND EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vatra_stories'
           AND policyname='Story archive read by owner') THEN
  CREATE POLICY story_read_access ON public.vatra_stories FOR SELECT TO authenticated
  USING (
   EXISTS (
    SELECT 1 FROM public.accounts a WHERE a.vatra_id=vatra_stories.author_vatra_id
      AND a.user_id=(SELECT auth.uid())
   )
   OR (expires_at>now() AND (
    EXISTS (
     SELECT 1 FROM public.vatra_friendships f JOIN public.accounts me ON me.vatra_id=f.recipient_id
     WHERE me.user_id=(SELECT auth.uid()) AND f.status='accepted'
      AND f.requester_id=vatra_stories.author_vatra_id
    )
    OR EXISTS (
     SELECT 1 FROM public.vatra_friendships f JOIN public.accounts me ON me.vatra_id=f.requester_id
     WHERE me.user_id=(SELECT auth.uid()) AND f.status='accepted'
      AND f.recipient_id=vatra_stories.author_vatra_id
    )
   ))
  );
  DROP POLICY "Story archive read by owner" ON public.vatra_stories;
  DROP POLICY story_read_friends ON public.vatra_stories;
 END IF;
END $$;
