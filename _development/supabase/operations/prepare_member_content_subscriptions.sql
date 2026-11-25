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
 (kind IN ('friend_request','friend_accepted','friend_declined','post_like','comment_like','avatar_like','avatar_comment_like','member_post','member_story','post_comment','post_reply','avatar_comment','album_comment','album_photo_like','post_share','post_mention','comment_mention'));
ALTER TABLE public.member_notifications DROP CONSTRAINT member_notifications_target_kind_check;
ALTER TABLE public.member_notifications ADD CONSTRAINT member_notifications_target_kind_check CHECK
 (target_kind IN ('friend','person','group','post_comment','avatar','avatar_comment','story','album_photo','album_comment'));
CREATE POLICY member_content_notifications_current_access ON public.member_notifications
 AS RESTRICTIVE FOR SELECT TO authenticated USING (
 CASE WHEN kind='member_post' THEN EXISTS (
  SELECT 1 FROM public.feed_posts p WHERE p.id=target_id AND p.author_vatra_id=actor_vatra_id
   AND p.archived_at IS NULL AND NOT p.is_clip AND p.visibility<>'only_me'
   AND COALESCE(p.media_kind,'')<>'video' AND NOT (COALESCE(p.media_items,'[]'::jsonb) @> '[{"media_kind":"video"}]'::jsonb)
   AND COALESCE(p.shared_post_kind,'person')='person')
 WHEN kind='member_story' THEN EXISTS (
  SELECT 1 FROM public.stories s WHERE s.id=target_id AND s.author_vatra_id=actor_vatra_id
   AND s.expires_at>now() AND COALESCE(s.media_kind,'')<>'video')
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
  IF NEW.expires_at<=now() OR COALESCE(NEW.media_kind,'')='video' THEN RETURN NEW; END IF;
 ELSE
  IF NEW.archived_at IS NOT NULL OR NEW.is_clip OR NEW.visibility NOT IN ('public','friends') OR COALESCE(NEW.media_kind,'')='video' OR COALESCE(NEW.media_items,'[]'::jsonb) @> '[{"media_kind":"video"}]'::jsonb OR COALESCE(NEW.shared_post_kind,'person')<>'person' THEN RETURN NEW; END IF;
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

CREATE FUNCTION private.vatra_notice_members_allowed(viewer bigint,actor bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT viewer IS NOT NULL AND actor IS NOT NULL AND viewer<>actor
 AND NOT EXISTS (SELECT 1 FROM public.member_blocks b WHERE
  (b.blocker_vatra_id=viewer AND b.blocked_vatra_id=actor) OR
  (b.blocker_vatra_id=actor AND b.blocked_vatra_id=viewer))
 AND NOT EXISTS (SELECT 1 FROM public.account_states a WHERE a.vatra_id IN(viewer,actor)
 AND (a.state='deleted' OR (a.state='blocked' AND (a.blocked_until IS NULL OR a.blocked_until>now()))))
$fn$;
CREATE FUNCTION private.vatra_notice_post_allowed(viewer bigint,post_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT EXISTS(SELECT 1 FROM public.feed_posts p WHERE p.id=post_uuid AND p.archived_at IS NULL
 AND NOT p.is_clip AND COALESCE(p.media_kind,'')<>'video'
 AND NOT (COALESCE(p.media_items,'[]'::jsonb) @> '[{"media_kind":"video"}]'::jsonb)
 AND COALESCE(p.shared_post_kind,'person')='person'
 AND (viewer=p.author_vatra_id OR (private.vatra_notice_members_allowed(viewer,p.author_vatra_id)
 AND ((p.visibility='public' AND COALESCE((SELECT pref.profile_visibility FROM public.profile_preferences pref
 WHERE pref.vatra_id=p.author_vatra_id),'public')='public')
 OR (p.visibility IN('public','friends') AND EXISTS(SELECT 1 FROM public.friendships f WHERE f.status='accepted'
 AND ((f.requester_id=viewer AND f.recipient_id=p.author_vatra_id) OR (f.recipient_id=viewer AND f.requester_id=p.author_vatra_id))))))))
$fn$;
CREATE FUNCTION private.vatra_notice_interaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE actor bigint; owner_id bigint; reply_owner bigint; recipient bigint;
 event_kind text; target_type text; target_uuid uuid; context_uuid uuid; album_uuid uuid; original_uuid uuid;
BEGIN
 IF TG_TABLE_SCHEMA<>'public' OR TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Invalid notification trigger'; END IF;
 IF TG_TABLE_NAME='post_comments' THEN
  IF NEW.post_kind<>'person' OR NEW.moderation_status='hidden' THEN RETURN NEW; END IF;
  SELECT a.vatra_id INTO actor FROM public.accounts a WHERE a.user_id=NEW.author_id AND a.vatra_id=NEW.author_vatra_id;
  SELECT p.author_vatra_id INTO owner_id FROM public.feed_posts p WHERE p.id=NEW.post_id;
  IF NOT COALESCE(private.vatra_notice_post_allowed(actor,NEW.post_id),false) THEN RETURN NEW; END IF;
  SELECT c.author_vatra_id INTO reply_owner FROM public.post_comments c
   WHERE c.id=NEW.parent_comment_id AND c.post_id=NEW.post_id AND c.post_kind='person' AND c.moderation_status<>'hidden';
  target_type:='post_comment';target_uuid:=NEW.id;context_uuid:=NEW.post_id;
  FOR recipient IN SELECT DISTINCT v FROM unnest(ARRAY[owner_id,reply_owner]) v WHERE v IS NOT NULL LOOP
   IF private.vatra_notice_members_allowed(recipient,actor) AND private.vatra_notice_post_allowed(recipient,context_uuid) THEN
    event_kind:=CASE WHEN recipient=reply_owner THEN 'post_reply' ELSE 'post_comment' END;
    INSERT INTO public.member_notifications(recipient_vatra_id,actor_vatra_id,kind,target_kind,target_id,context_id,event_key)
    VALUES(recipient,actor,event_kind,target_type,target_uuid,context_uuid,event_kind||':'||owner_id||':'||target_uuid)
    ON CONFLICT(recipient_vatra_id,event_key) DO NOTHING;
   END IF;
  END LOOP;
  RETURN NEW;
 ELSIF TG_TABLE_NAME='avatar_comments' THEN
  IF NEW.moderation_status='hidden' OR NEW.avatar_path NOT LIKE NEW.owner_vatra_id::text||'/avatar/%' THEN RETURN NEW; END IF;
  SELECT a.vatra_id INTO actor FROM public.accounts a WHERE a.user_id=NEW.author_id AND a.vatra_id=NEW.author_vatra_id;
  owner_id:=NEW.owner_vatra_id;
  IF private.vatra_notice_members_allowed(owner_id,actor) THEN
   INSERT INTO public.member_notifications(recipient_vatra_id,actor_vatra_id,kind,target_kind,target_id,avatar_owner_vatra_id,event_key)
   VALUES(owner_id,actor,'avatar_comment','avatar_comment',NEW.id,owner_id,'avatar_comment:'||NEW.id)
   ON CONFLICT(recipient_vatra_id,event_key) DO NOTHING;
  END IF;
  RETURN NEW;
 ELSIF TG_TABLE_NAME='photo_album_comments' THEN
  IF NEW.photo_id IS NULL THEN RETURN NEW; END IF;
  SELECT a.vatra_id INTO actor FROM public.accounts a WHERE a.user_id=NEW.author_id AND a.vatra_id=NEW.author_vatra_id;
  SELECT p.owner_vatra_id,p.album_id INTO owner_id,album_uuid FROM public.album_photos p
   WHERE p.id=NEW.photo_id AND p.album_id=NEW.album_id AND p.archived_at IS NULL;
  event_kind:='album_comment';target_type:='album_comment';target_uuid:=NEW.id;context_uuid:=NEW.photo_id;
 ELSIF TG_TABLE_NAME='album_photo_likes' THEN
  SELECT a.vatra_id INTO actor FROM public.accounts a WHERE a.user_id=NEW.liker_id;
  SELECT p.owner_vatra_id,p.album_id INTO owner_id,album_uuid FROM public.album_photos p
   WHERE p.id=NEW.photo_id AND p.archived_at IS NULL;
  event_kind:='album_photo_like';target_type:='album_photo';target_uuid:=NEW.photo_id;context_uuid:=NEW.photo_id;
 ELSIF TG_TABLE_NAME='feed_posts' THEN
  IF NEW.shared_post_kind IS DISTINCT FROM 'person' OR NEW.shared_post_id IS NULL THEN RETURN NEW; END IF;
  actor:=NEW.author_vatra_id;original_uuid:=NEW.shared_post_id;
  SELECT p.author_vatra_id INTO owner_id FROM public.feed_posts p WHERE p.id=original_uuid;
  IF NOT COALESCE(private.vatra_notice_post_allowed(actor,original_uuid),false)
   OR NOT COALESCE(private.vatra_notice_post_allowed(owner_id,NEW.id),false) THEN RETURN NEW; END IF;
  IF private.vatra_notice_members_allowed(owner_id,actor) THEN
   INSERT INTO public.member_notifications(recipient_vatra_id,actor_vatra_id,kind,target_kind,target_id,context_id,event_key)
   VALUES(owner_id,actor,'post_share','person',NEW.id,original_uuid,'post_share:'||actor||':'||NEW.id)
   ON CONFLICT(recipient_vatra_id,event_key) DO NOTHING;
  END IF;
  RETURN NEW;
 ELSE RAISE EXCEPTION 'Invalid notification source';
 END IF;
 IF private.vatra_notice_members_allowed(owner_id,actor) AND album_uuid IS NOT NULL THEN
  INSERT INTO public.member_notifications(recipient_vatra_id,actor_vatra_id,kind,target_kind,target_id,context_id,event_key)
  VALUES(owner_id,actor,event_kind,target_type,target_uuid,context_uuid,event_kind||':'||owner_id||':'||album_uuid||':'||target_uuid||':'||actor)
  ON CONFLICT(recipient_vatra_id,event_key) DO NOTHING;
 END IF;
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION private.vatra_notice_members_allowed(bigint,bigint),private.vatra_notice_post_allowed(bigint,uuid),private.vatra_notice_interaction() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER vatra_notify_person_comment AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION private.vatra_notice_interaction();
CREATE TRIGGER vatra_notify_avatar_comment AFTER INSERT ON public.avatar_comments FOR EACH ROW EXECUTE FUNCTION private.vatra_notice_interaction();
CREATE TRIGGER vatra_notify_album_comment AFTER INSERT ON public.photo_album_comments FOR EACH ROW EXECUTE FUNCTION private.vatra_notice_interaction();
CREATE TRIGGER vatra_notify_album_photo_like AFTER INSERT ON public.album_photo_likes FOR EACH ROW EXECUTE FUNCTION private.vatra_notice_interaction();
CREATE TRIGGER vatra_notify_person_share AFTER INSERT ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION private.vatra_notice_interaction();
CREATE FUNCTION private.vatra_notice_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE actor bigint; owner_id bigint; post_uuid uuid; mentioned bigint; raw_id text; event_kind text; target_type text;
BEGIN
 IF TG_TABLE_SCHEMA<>'public' OR TG_OP<>'INSERT' OR TG_TABLE_NAME NOT IN ('feed_posts','post_comments') THEN
  RAISE EXCEPTION 'Invalid mention source';
 END IF;
 IF TG_TABLE_NAME='feed_posts' THEN
  post_uuid:=NEW.id;owner_id:=NEW.author_vatra_id;event_kind:='post_mention';target_type:='person';
 ELSE
  IF NEW.post_kind<>'person' OR NEW.moderation_status='hidden' THEN RETURN NEW; END IF;
  post_uuid:=NEW.post_id;event_kind:='comment_mention';target_type:='post_comment';
  SELECT author_vatra_id INTO owner_id FROM public.feed_posts WHERE id=post_uuid;
 END IF;
 SELECT a.vatra_id INTO actor FROM public.accounts a WHERE a.user_id=NEW.author_id AND a.vatra_id=NEW.author_vatra_id;
 IF actor IS NULL OR NOT private.vatra_notice_post_allowed(actor,post_uuid) THEN RETURN NEW; END IF;
 FOR raw_id IN SELECT DISTINCT parts[1] FROM regexp_matches(COALESCE(NEW.body,''),'(?:^|[^[:alnum:]_])@id([1-9][0-9]{0,18})(?![[:alnum:]_])','gi') AS hits(parts) LIMIT 10 LOOP
  IF raw_id::numeric>9223372036854775807 THEN CONTINUE; END IF;
  SELECT vatra_id INTO mentioned FROM public.accounts WHERE vatra_id=raw_id::bigint;
  IF private.vatra_notice_members_allowed(mentioned,actor) AND private.vatra_notice_post_allowed(mentioned,post_uuid)
   AND NOT EXISTS (SELECT 1 FROM public.member_notifications n WHERE n.recipient_vatra_id=mentioned AND n.actor_vatra_id=actor AND n.target_id=NEW.id AND n.kind IN ('post_comment','post_reply','post_share','member_post')) THEN
   INSERT INTO public.member_notifications(recipient_vatra_id,actor_vatra_id,kind,target_kind,target_id,context_id,event_key)
   VALUES(mentioned,actor,event_kind,target_type,NEW.id,post_uuid,event_kind||':'||owner_id||':'||NEW.id)
   ON CONFLICT(recipient_vatra_id,event_key) DO NOTHING;
  END IF;
 END LOOP;
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION private.vatra_notice_mentions() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER vatra_z_notify_person_mention AFTER INSERT ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION private.vatra_notice_mentions();
CREATE TRIGGER vatra_z_notify_comment_mention AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION private.vatra_notice_mentions();
CREATE POLICY member_interaction_notifications_current_access ON public.member_notifications
 AS RESTRICTIVE FOR SELECT TO authenticated USING (
 CASE WHEN kind IN ('post_comment','post_reply','comment_mention') THEN EXISTS (
 SELECT 1 FROM public.post_comments c JOIN public.feed_posts p ON p.id=c.post_id
 WHERE c.id=member_notifications.target_id AND c.post_id=member_notifications.context_id
 AND c.post_kind='person' AND c.moderation_status<>'hidden' AND p.archived_at IS NULL AND NOT p.is_clip
 AND COALESCE(p.media_kind,'')<>'video' AND NOT (COALESCE(p.media_items,'[]'::jsonb) @> '[{"media_kind":"video"}]'::jsonb)
 AND NOT public.vatra_has_block_between(c.author_vatra_id))
 WHEN kind='post_mention' THEN EXISTS (
 SELECT 1 FROM public.feed_posts p WHERE p.id=member_notifications.target_id AND p.id=member_notifications.context_id AND p.archived_at IS NULL AND NOT p.is_clip AND COALESCE(p.media_kind,'')<>'video' AND NOT (COALESCE(p.media_items,'[]'::jsonb) @> '[{"media_kind":"video"}]'::jsonb) AND NOT public.vatra_has_block_between(p.author_vatra_id))
 WHEN kind='avatar_comment' THEN EXISTS (
 SELECT 1 FROM public.avatar_comments c WHERE c.id=member_notifications.target_id
 AND c.owner_vatra_id=member_notifications.recipient_vatra_id AND c.moderation_status<>'hidden'
 AND NOT public.vatra_has_block_between(c.author_vatra_id))
 WHEN kind='album_comment' THEN EXISTS (
 SELECT 1 FROM public.photo_album_comments c JOIN public.album_photos p ON p.id=c.photo_id AND p.album_id=c.album_id
 WHERE c.id=member_notifications.target_id AND p.id=member_notifications.context_id
 AND p.owner_vatra_id=member_notifications.recipient_vatra_id AND p.archived_at IS NULL
 AND NOT public.vatra_has_block_between(c.author_vatra_id))
 WHEN kind='album_photo_like' THEN EXISTS (
 SELECT 1 FROM public.album_photos p WHERE p.id=member_notifications.target_id
 AND p.owner_vatra_id=member_notifications.recipient_vatra_id AND p.archived_at IS NULL
 AND NOT public.vatra_has_block_between(member_notifications.actor_vatra_id))
 WHEN kind='post_share' THEN EXISTS (
 SELECT 1 FROM public.feed_posts p JOIN public.feed_posts original ON original.id=p.shared_post_id
 WHERE p.id=member_notifications.target_id AND original.id=member_notifications.context_id
 AND p.shared_post_kind='person' AND p.archived_at IS NULL AND original.archived_at IS NULL
 AND NOT p.is_clip AND NOT original.is_clip AND COALESCE(p.media_kind,'')<>'video'
 AND COALESCE(original.media_kind,'')<>'video' AND NOT (COALESCE(original.media_items,'[]'::jsonb) @> '[{"media_kind":"video"}]'::jsonb)
 AND NOT public.vatra_has_block_between(p.author_vatra_id))
 ELSE true END
);
COMMIT;
