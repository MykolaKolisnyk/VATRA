-- Deployment candidate. Run in an isolated PostgreSQL fixture before applying to VATRA.
BEGIN;
CREATE TABLE public.member_content_preferences (
 viewer_vatra_id bigint NOT NULL REFERENCES public.accounts(vatra_id) ON DELETE CASCADE,
 author_vatra_id bigint NOT NULL REFERENCES public.accounts(vatra_id) ON DELETE CASCADE,
 hide_posts boolean NOT NULL DEFAULT false,
 notify_posts boolean NOT NULL DEFAULT false,
 notify_stories boolean NOT NULL DEFAULT false,
 PRIMARY KEY (viewer_vatra_id, author_vatra_id),
 CHECK (viewer_vatra_id <> author_vatra_id)
);
CREATE INDEX member_content_preferences_post_subscribers
 ON public.member_content_preferences(author_vatra_id,viewer_vatra_id) WHERE notify_posts;
CREATE INDEX member_content_preferences_story_subscribers
 ON public.member_content_preferences(author_vatra_id,viewer_vatra_id) WHERE notify_stories;
ALTER TABLE public.member_content_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_content_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,DELETE ON public.member_content_preferences TO authenticated;
GRANT UPDATE(hide_posts,notify_posts,notify_stories) ON public.member_content_preferences TO authenticated;
CREATE POLICY content_preferences_read_own ON public.member_content_preferences
 FOR SELECT TO authenticated USING (viewer_vatra_id IN
 (SELECT a.vatra_id FROM public.accounts a WHERE a.user_id=(SELECT auth.uid())));
CREATE POLICY content_preferences_insert_own ON public.member_content_preferences
 FOR INSERT TO authenticated WITH CHECK (viewer_vatra_id IN
 (SELECT a.vatra_id FROM public.accounts a WHERE a.user_id=(SELECT auth.uid()))
 AND NOT public.vatra_has_block_between(author_vatra_id));
CREATE POLICY content_preferences_update_own ON public.member_content_preferences
 FOR UPDATE TO authenticated USING (viewer_vatra_id IN
 (SELECT a.vatra_id FROM public.accounts a WHERE a.user_id=(SELECT auth.uid())))
 WITH CHECK (viewer_vatra_id IN
 (SELECT a.vatra_id FROM public.accounts a WHERE a.user_id=(SELECT auth.uid()))
 AND NOT public.vatra_has_block_between(author_vatra_id));
CREATE POLICY content_preferences_delete_own ON public.member_content_preferences
 FOR DELETE TO authenticated USING (viewer_vatra_id IN
 (SELECT a.vatra_id FROM public.accounts a WHERE a.user_id=(SELECT auth.uid())));
ALTER TABLE public.member_notifications DROP CONSTRAINT member_notifications_kind_check;
ALTER TABLE public.member_notifications ADD CONSTRAINT member_notifications_kind_check CHECK
 (kind IN ('friend_request','friend_accepted','friend_declined','post_like','comment_like','avatar_like','avatar_comment_like','member_post','member_story'));
ALTER TABLE public.member_notifications DROP CONSTRAINT member_notifications_target_kind_check;
ALTER TABLE public.member_notifications ADD CONSTRAINT member_notifications_target_kind_check CHECK
 (target_kind IN ('friend','person','group','post_comment','avatar','avatar_comment','story'));
CREATE POLICY member_content_notifications_current_access ON public.member_notifications
 AS RESTRICTIVE FOR SELECT TO authenticated USING (
 CASE WHEN kind='member_post' THEN EXISTS (
  SELECT 1 FROM public.feed_posts p WHERE p.id=target_id AND p.author_vatra_id=actor_vatra_id
   AND p.archived_at IS NULL AND NOT p.is_clip AND p.visibility<>'only_me')
 WHEN kind='member_story' THEN EXISTS (
  SELECT 1 FROM public.stories s WHERE s.id=target_id AND s.author_vatra_id=actor_vatra_id
   AND s.expires_at>now())
 ELSE true END
);
CREATE OR REPLACE FUNCTION private.notify_member_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE is_story boolean:=TG_TABLE_NAME='stories'; public_post boolean:=false;
BEGIN
 IF TG_TABLE_SCHEMA<>'public' OR TG_OP<>'INSERT' OR TG_TABLE_NAME NOT IN ('feed_posts','stories') THEN
  RAISE EXCEPTION 'Invalid member content notification trigger';
 END IF;
 IF is_story THEN
  IF NEW.expires_at<=now() THEN RETURN NEW; END IF;
 ELSE
  IF NEW.archived_at IS NOT NULL OR NEW.is_clip OR NEW.visibility NOT IN ('public','friends') THEN RETURN NEW; END IF;
  public_post:=NEW.visibility='public';
 END IF;
 INSERT INTO public.member_notifications(recipient_vatra_id,actor_vatra_id,kind,target_kind,target_id,event_key)
 SELECT pref.viewer_vatra_id,NEW.author_vatra_id,
  CASE WHEN is_story THEN 'member_story' ELSE 'member_post' END,
  CASE WHEN is_story THEN 'story' ELSE 'person' END,NEW.id,
  CASE WHEN is_story THEN 'member_story:' ELSE 'member_post:' END || NEW.id::text
 FROM public.member_content_preferences pref
 WHERE pref.author_vatra_id=NEW.author_vatra_id
 AND CASE WHEN is_story THEN pref.notify_stories ELSE pref.notify_posts END
 AND NOT EXISTS (SELECT 1 FROM public.member_blocks b
  WHERE (b.blocker_vatra_id=pref.viewer_vatra_id AND b.blocked_vatra_id=NEW.author_vatra_id)
     OR (b.blocker_vatra_id=NEW.author_vatra_id AND b.blocked_vatra_id=pref.viewer_vatra_id))
 AND NOT EXISTS (SELECT 1 FROM public.account_states a
  WHERE a.vatra_id IN (NEW.author_vatra_id,pref.viewer_vatra_id)
   AND (a.state='deleted' OR (a.state='blocked' AND (a.blocked_until IS NULL OR a.blocked_until>now()))))
 AND (EXISTS (SELECT 1 FROM public.friendships f WHERE f.status='accepted'
  AND ((f.requester_id=pref.viewer_vatra_id AND f.recipient_id=NEW.author_vatra_id)
   OR (f.recipient_id=pref.viewer_vatra_id AND f.requester_id=NEW.author_vatra_id)))
  OR (public_post
   AND COALESCE((SELECT p.profile_visibility FROM public.profile_preferences p
     WHERE p.vatra_id=NEW.author_vatra_id),'public')='public'))
 ON CONFLICT (recipient_vatra_id,event_key) DO NOTHING;
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION private.notify_member_content() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER vatra_notify_member_post AFTER INSERT ON public.feed_posts
 FOR EACH ROW EXECUTE FUNCTION private.notify_member_content();
CREATE TRIGGER vatra_notify_member_story AFTER INSERT ON public.stories
 FOR EACH ROW EXECUTE FUNCTION private.notify_member_content();
COMMIT;
