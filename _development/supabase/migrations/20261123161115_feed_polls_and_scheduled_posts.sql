-- VATRA: atomic polls and server-side scheduled feed posts.
-- Deploy this migration before enabling the matching frontend.
-- Additive tables and an optional feed_posts.poll column; preserve existing posts.
BEGIN;

CREATE SCHEMA IF NOT EXISTS vatra_scheduler;
REVOKE ALL ON SCHEMA vatra_scheduler FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.vatra_poll_valid(value jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $body$
DECLARE option_text text;
BEGIN
 IF value IS NULL THEN RETURN true; END IF;
 IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF jsonb_typeof(value->'question') IS DISTINCT FROM 'string'
  OR char_length(btrim(value->>'question')) NOT BETWEEN 1 AND 240 THEN RETURN false; END IF;
 IF jsonb_typeof(value->'options') IS DISTINCT FROM 'array'
  OR jsonb_array_length(value->'options') NOT BETWEEN 2 AND 10 THEN RETURN false; END IF;
 IF jsonb_typeof(value->'multiple') IS DISTINCT FROM 'boolean'
  OR jsonb_typeof(value->'anonymous') IS DISTINCT FROM 'boolean'
  OR jsonb_typeof(value->'allow_revote') IS DISTINCT FROM 'boolean' THEN RETURN false; END IF;
 IF value ? 'closes_at' AND jsonb_typeof(value->'closes_at') NOT IN ('string','null') THEN RETURN false; END IF;
 IF EXISTS (
  SELECT 1 FROM jsonb_array_elements(value->'options') AS choices(item)
  WHERE jsonb_typeof(item) <> 'string'
 ) THEN RETURN false; END IF;
 FOR option_text IN SELECT jsonb_array_elements_text(value->'options') LOOP
  IF char_length(btrim(option_text)) NOT BETWEEN 1 AND 120 THEN RETURN false; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT lower(btrim(choice))) FROM jsonb_array_elements_text(value->'options') AS answer(choice))
     <> jsonb_array_length(value->'options') THEN RETURN false; END IF;
 RETURN true;
EXCEPTION WHEN others THEN RETURN false;
END;
$body$;
REVOKE ALL ON FUNCTION public.vatra_poll_valid(jsonb) FROM PUBLIC, anon, authenticated;
-- INSERT checks must be able to evaluate this pure immutable validator.
GRANT EXECUTE ON FUNCTION public.vatra_poll_valid(jsonb) TO authenticated;

ALTER TABLE public.feed_posts
 ADD COLUMN IF NOT EXISTS poll jsonb;
ALTER TABLE public.feed_posts
 ADD CONSTRAINT vatra_feed_post_poll_shape CHECK (public.vatra_poll_valid(poll));
ALTER TABLE public.feed_posts DROP CONSTRAINT feed_posts_body_length;
ALTER TABLE public.feed_posts
 ADD CONSTRAINT feed_posts_body_length CHECK (
  char_length(btrim(body)) <= 2000
  AND (char_length(btrim(body)) >= 1 OR media_path IS NOT NULL
   OR (jsonb_typeof(media_items)='array' AND jsonb_array_length(media_items)>0)
   OR poll IS NOT NULL)
 );

CREATE OR REPLACE FUNCTION public.vatra_feed_poll_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $body$
BEGIN
 IF TG_OP='UPDATE' AND NEW.poll IS DISTINCT FROM OLD.poll THEN
  RAISE EXCEPTION 'Published polls cannot be changed' USING ERRCODE='23514';
 END IF;
 IF TG_OP='INSERT' AND NEW.poll IS NOT NULL
    AND NULLIF(NEW.poll->>'closes_at','') IS NOT NULL THEN
  IF (NEW.poll->>'closes_at')::timestamptz <= now() THEN
   RAISE EXCEPTION 'Poll must close in the future' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END;
$body$;
DROP TRIGGER IF EXISTS vatra_feed_poll_guard ON public.feed_posts;
CREATE TRIGGER vatra_feed_poll_guard BEFORE INSERT OR UPDATE OF poll
 ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION public.vatra_feed_poll_guard();

CREATE TABLE IF NOT EXISTS public.post_poll_votes (
 post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
 voter_id uuid NOT NULL REFERENCES public.accounts(user_id) ON DELETE CASCADE,
 voter_vatra_id bigint NOT NULL REFERENCES public.member_directory(vatra_id) ON DELETE CASCADE,
 choices smallint[] NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (post_id,voter_id)
);
ALTER TABLE public.post_poll_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.post_poll_votes FROM PUBLIC, anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.post_poll_votes TO authenticated;
CREATE POLICY "Read only own poll votes" ON public.post_poll_votes FOR SELECT TO authenticated
 USING (voter_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.feed_posts p WHERE p.id=post_id));
CREATE POLICY "Insert own poll vote" ON public.post_poll_votes FOR INSERT TO authenticated
 WITH CHECK (voter_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.feed_posts p WHERE p.id=post_id));
CREATE POLICY "Update own poll vote" ON public.post_poll_votes FOR UPDATE TO authenticated
 USING (voter_id=(SELECT auth.uid())) WITH CHECK (voter_id=(SELECT auth.uid()));
CREATE POLICY "Remove own poll vote" ON public.post_poll_votes FOR DELETE TO authenticated
 USING (voter_id=(SELECT auth.uid()));

-- Keep private auth UUIDs only in post_poll_votes (RLS: viewer's own vote).
-- A separate, server-maintained choice table exposes VATRA profile IDs only
-- when the poll explicitly identifies its voters.
CREATE TABLE IF NOT EXISTS public.post_poll_visible_choices (
 post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
 voter_vatra_id bigint NOT NULL REFERENCES public.member_directory(vatra_id) ON DELETE CASCADE,
 choices smallint[] NOT NULL,
 PRIMARY KEY (post_id,voter_vatra_id)
);
ALTER TABLE public.post_poll_visible_choices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.post_poll_visible_choices FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.post_poll_visible_choices TO authenticated;
CREATE POLICY "Read nonanonymous choices on visible posts" ON public.post_poll_visible_choices
 FOR SELECT TO authenticated USING (
  EXISTS (
   SELECT 1 FROM public.feed_posts p WHERE p.id=post_id
    AND p.archived_at IS NULL AND p.poll IS NOT NULL
    AND (p.poll->>'anonymous')='false'
  )
 );
CREATE OR REPLACE VIEW public.post_poll_voters WITH (security_invoker=true) AS
 SELECT votes.post_id,votes.choices,votes.voter_vatra_id AS vatra_id,
  coalesce(nullif(btrim(profiles.display_name),''),
   'VATRA ID '||votes.voter_vatra_id::text) AS display_name
 FROM public.post_poll_visible_choices votes
 JOIN public.feed_posts posts ON posts.id=votes.post_id
 LEFT JOIN public.public_profiles profiles ON profiles.vatra_id=votes.voter_vatra_id
 WHERE posts.poll IS NOT NULL AND (posts.poll->>'anonymous')='false'
  AND posts.archived_at IS NULL;
REVOKE ALL ON public.post_poll_voters FROM PUBLIC, anon;
GRANT SELECT ON public.post_poll_voters TO authenticated;

CREATE OR REPLACE FUNCTION vatra_scheduler.sync_visible_poll_choices()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $body$
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') THEN
  DELETE FROM public.post_poll_visible_choices
   WHERE post_id=OLD.post_id AND voter_vatra_id=OLD.voter_vatra_id;
 END IF;
 IF TG_OP IN ('INSERT','UPDATE') AND EXISTS (
  SELECT 1 FROM public.feed_posts p
   WHERE p.id=NEW.post_id AND (p.poll->>'anonymous')='false'
 ) THEN
  INSERT INTO public.post_poll_visible_choices(post_id,voter_vatra_id,choices)
  VALUES(NEW.post_id,NEW.voter_vatra_id,NEW.choices)
  ON CONFLICT(post_id,voter_vatra_id) DO UPDATE
   SET choices=excluded.choices;
 END IF;
 RETURN NULL;
END;
$body$;
REVOKE ALL ON FUNCTION vatra_scheduler.sync_visible_poll_choices()
 FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS vatra_sync_visible_poll_choices ON public.post_poll_votes;
CREATE TRIGGER vatra_sync_visible_poll_choices
 AFTER INSERT OR UPDATE OR DELETE ON public.post_poll_votes
 FOR EACH ROW EXECUTE FUNCTION vatra_scheduler.sync_visible_poll_choices();

CREATE TABLE IF NOT EXISTS public.post_poll_counts (
 post_id uuid PRIMARY KEY REFERENCES public.feed_posts(id) ON DELETE CASCADE,
 counts jsonb NOT NULL DEFAULT '[]'::jsonb,
 total_voters bigint NOT NULL DEFAULT 0 CHECK(total_voters>=0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT post_poll_counts_shape CHECK(jsonb_typeof(counts)='array')
);
ALTER TABLE public.post_poll_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.post_poll_counts FROM PUBLIC, anon;
GRANT SELECT ON public.post_poll_counts TO authenticated;
CREATE POLICY "Read counts for visible polls" ON public.post_poll_counts FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.feed_posts p WHERE p.id=post_id AND p.poll IS NOT NULL));

-- Counts are initialized inside the post INSERT transaction, never by clients.
CREATE OR REPLACE FUNCTION vatra_scheduler.initialize_poll()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $body$
BEGIN
 IF NEW.poll IS NOT NULL THEN
  INSERT INTO public.post_poll_counts(post_id,counts)
   SELECT NEW.id,coalesce(jsonb_agg(0 ORDER BY ord),'[]'::jsonb)
    FROM jsonb_array_elements(NEW.poll->'options') WITH ORDINALITY AS opt(value,ord);
 END IF;
 RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION vatra_scheduler.initialize_poll() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS vatra_initialize_poll ON public.feed_posts;
CREATE TRIGGER vatra_initialize_poll AFTER INSERT ON public.feed_posts
 FOR EACH ROW EXECUTE FUNCTION vatra_scheduler.initialize_poll();

CREATE OR REPLACE FUNCTION public.vatra_validate_vote()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $body$
DECLARE poll_data jsonb; vote_index smallint;
BEGIN
 IF TG_OP='DELETE' THEN
  SELECT p.poll INTO poll_data FROM public.feed_posts p WHERE p.id=OLD.post_id AND p.archived_at IS NULL;
  IF poll_data IS NOT NULL AND (
    (poll_data->>'allow_revote')::boolean IS FALSE
    OR (NULLIF(poll_data->>'closes_at','') IS NOT NULL
      AND (poll_data->>'closes_at')::timestamptz <= now())
  ) THEN
   RAISE EXCEPTION 'Voting is closed or withdrawal is disabled' USING ERRCODE='23514';
  END IF;
  RETURN OLD;
 END IF;
 IF NEW.voter_id IS DISTINCT FROM (SELECT auth.uid()) THEN
  RAISE EXCEPTION 'Vote must belong to the signed-in account' USING ERRCODE='42501';
 END IF;
 IF TG_OP='UPDATE' AND (NEW.post_id IS DISTINCT FROM OLD.post_id
  OR NEW.voter_id IS DISTINCT FROM OLD.voter_id
  OR NEW.voter_vatra_id IS DISTINCT FROM OLD.voter_vatra_id
  OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
  RAISE EXCEPTION 'Vote identity cannot change' USING ERRCODE='23514';
 END IF;
 SELECT p.poll INTO poll_data FROM public.feed_posts p
  WHERE p.id=NEW.post_id AND p.archived_at IS NULL;
 IF poll_data IS NULL THEN RAISE EXCEPTION 'Poll is unavailable' USING ERRCODE='23514'; END IF;
 IF NULLIF(poll_data->>'closes_at','') IS NOT NULL
  AND (poll_data->>'closes_at')::timestamptz <= now() THEN
  RAISE EXCEPTION 'Poll is closed' USING ERRCODE='23514';
 END IF;
 IF TG_OP='UPDATE' AND (poll_data->>'allow_revote')::boolean IS FALSE THEN
  RAISE EXCEPTION 'The poll author disabled changing votes' USING ERRCODE='23514';
 END IF;
 IF coalesce(cardinality(NEW.choices),0)<1 OR cardinality(NEW.choices)>10
  OR ((poll_data->>'multiple')::boolean IS FALSE AND cardinality(NEW.choices)<>1)
  OR cardinality(NEW.choices)<>(SELECT count(DISTINCT c) FROM unnest(NEW.choices) AS c) THEN
  RAISE EXCEPTION 'Invalid number of choices' USING ERRCODE='23514';
 END IF;
 FOREACH vote_index IN ARRAY NEW.choices LOOP
  IF vote_index IS NULL OR vote_index<0
    OR vote_index>=jsonb_array_length(poll_data->'options') THEN
   RAISE EXCEPTION 'Choice is outside poll options' USING ERRCODE='23514';
  END IF;
 END LOOP;
 IF TG_OP='INSERT' THEN
  SELECT a.vatra_id INTO NEW.voter_vatra_id FROM public.accounts a
   WHERE a.user_id=NEW.voter_id;
  IF NEW.voter_vatra_id IS NULL THEN
   RAISE EXCEPTION 'Voter account is unavailable' USING ERRCODE='42501';
  END IF;
  NEW.created_at=now();
 END IF;
 NEW.updated_at=now();
 RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION public.vatra_validate_vote() FROM PUBLIC, anon;
DROP TRIGGER IF EXISTS vatra_poll_vote_guard ON public.post_poll_votes;
CREATE TRIGGER vatra_poll_vote_guard BEFORE INSERT OR UPDATE OR DELETE
 ON public.post_poll_votes FOR EACH ROW EXECUTE FUNCTION public.vatra_validate_vote();

-- Atomic counter increments/decrements serialize through the single counts row.
-- This avoids leaking voter identities when polls are marked anonymous.
CREATE OR REPLACE FUNCTION vatra_scheduler.refresh_vote_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $body$
DECLARE ix smallint;
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') THEN
  FOREACH ix IN ARRAY OLD.choices LOOP
   UPDATE public.post_poll_counts
    SET counts=jsonb_set(counts,ARRAY[ix::text],
      to_jsonb(greatest(0,(counts->>ix)::bigint-1)),false),
     updated_at=now()
    WHERE post_id=OLD.post_id;
  END LOOP;
 END IF;
 IF TG_OP IN ('INSERT','UPDATE') THEN
  FOREACH ix IN ARRAY NEW.choices LOOP
   UPDATE public.post_poll_counts
    SET counts=jsonb_set(counts,ARRAY[ix::text],
      to_jsonb((counts->>ix)::bigint+1),false),
     updated_at=now()
    WHERE post_id=NEW.post_id;
  END LOOP;
 END IF;
 IF TG_OP='INSERT' THEN
  UPDATE public.post_poll_counts SET total_voters=total_voters+1,updated_at=now() WHERE post_id=NEW.post_id;
 ELSIF TG_OP='DELETE' THEN
  UPDATE public.post_poll_counts SET total_voters=greatest(0,total_voters-1),updated_at=now() WHERE post_id=OLD.post_id;
 END IF;
 RETURN NULL;
END;
$body$;
REVOKE ALL ON FUNCTION vatra_scheduler.refresh_vote_counts() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS vatra_poll_vote_counts ON public.post_poll_votes;
CREATE TRIGGER vatra_poll_vote_counts AFTER INSERT OR UPDATE OR DELETE
 ON public.post_poll_votes FOR EACH ROW EXECUTE FUNCTION vatra_scheduler.refresh_vote_counts();

CREATE TABLE IF NOT EXISTS public.scheduled_feed_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 author_id uuid NOT NULL REFERENCES public.accounts(user_id) ON DELETE CASCADE,
 author_vatra_id bigint NOT NULL REFERENCES public.member_directory(vatra_id) ON DELETE CASCADE,
 body text NOT NULL DEFAULT '',
 visibility text NOT NULL DEFAULT 'public'
  CHECK(visibility IN ('public','friends','only_me')),
 media_items jsonb NOT NULL DEFAULT '[]'::jsonb,
 poll jsonb,
 publish_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'queued'
  CHECK(status IN ('queued','cancelled','published','failed')),
 published_post_id uuid REFERENCES public.feed_posts(id) ON DELETE SET NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 last_error text,
 next_attempt_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT scheduled_feed_post_content CHECK(
  char_length(btrim(body))<=2000
  AND (char_length(btrim(body))>0 OR jsonb_array_length(media_items)>0 OR poll IS NOT NULL)
 ),
 CONSTRAINT scheduled_feed_post_media_shape CHECK (
  jsonb_typeof(media_items)='array' AND jsonb_array_length(media_items)<=12
  AND jsonb_array_length(jsonb_path_query_array(media_items,
   '$[*]?(@."media_kind" == "video")'::jsonpath))<=4
 ),
 CONSTRAINT scheduled_feed_post_poll_shape CHECK(public.vatra_poll_valid(poll))
);
CREATE INDEX IF NOT EXISTS scheduled_feed_posts_due_idx
 ON public.scheduled_feed_posts(publish_at,id) WHERE status='queued';
CREATE INDEX IF NOT EXISTS scheduled_feed_posts_owner_idx
 ON public.scheduled_feed_posts(author_id,created_at DESC);
ALTER TABLE public.scheduled_feed_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scheduled_feed_posts FROM PUBLIC, anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.scheduled_feed_posts TO authenticated;
CREATE POLICY "Read own scheduled posts" ON public.scheduled_feed_posts FOR SELECT TO authenticated
 USING (author_id=(SELECT auth.uid()));
CREATE POLICY "Queue only own scheduled posts" ON public.scheduled_feed_posts FOR INSERT TO authenticated
 WITH CHECK(status='queued' AND attempts=0 AND published_post_id IS NULL AND
  author_id=(SELECT auth.uid()) AND EXISTS (
   SELECT 1 FROM public.accounts a WHERE a.user_id=author_id AND a.vatra_id=author_vatra_id));
CREATE POLICY "Change own pending schedules" ON public.scheduled_feed_posts FOR UPDATE TO authenticated
 USING(author_id=(SELECT auth.uid()) AND status='queued')
 WITH CHECK(author_id=(SELECT auth.uid()) AND status IN ('queued','cancelled'));
CREATE POLICY "Delete own inactive schedules" ON public.scheduled_feed_posts FOR DELETE TO authenticated
 USING(author_id=(SELECT auth.uid()) AND status IN ('cancelled','failed'));

CREATE OR REPLACE FUNCTION public.vatra_scheduled_post_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $body$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.publish_at<=now()+interval '2 minutes' THEN
   RAISE EXCEPTION 'Schedule at least two minutes in advance' USING ERRCODE='23514';
  END IF;
  IF NEW.status<>'queued' OR NEW.attempts<>0
   OR NEW.published_post_id IS NOT NULL
   OR NEW.last_error IS NOT NULL OR NEW.next_attempt_at IS NOT NULL THEN
   RAISE EXCEPTION 'Only an untouched pending post may be scheduled' USING ERRCODE='23514';
  END IF;
  NEW.created_at=now();
 ELSIF (SELECT auth.uid()) IS NOT NULL THEN
  IF NEW.author_id IS DISTINCT FROM OLD.author_id
    OR NEW.author_vatra_id IS DISTINCT FROM OLD.author_vatra_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.published_post_id IS DISTINCT FROM OLD.published_post_id
    OR NEW.attempts IS DISTINCT FROM OLD.attempts
    OR NEW.last_error IS DISTINCT FROM OLD.last_error
    OR NEW.next_attempt_at IS DISTINCT FROM OLD.next_attempt_at THEN
   RAISE EXCEPTION 'Protected schedule fields cannot be edited' USING ERRCODE='42501';
  END IF;
  IF OLD.status<>'queued' OR NEW.status NOT IN ('queued','cancelled') THEN
   RAISE EXCEPTION 'Only pending schedules can be changed or cancelled' USING ERRCODE='23514';
  END IF;
  IF NEW.status='queued' AND NEW.publish_at<=now()+interval '2 minutes' THEN
   RAISE EXCEPTION 'Schedule at least two minutes in advance' USING ERRCODE='23514';
  END IF;
 END IF;
 IF NEW.poll IS NOT NULL AND NULLIF(NEW.poll->>'closes_at','') IS NOT NULL
  AND (NEW.poll->>'closes_at')::timestamptz <= NEW.publish_at THEN
  RAISE EXCEPTION 'Poll must end after publication time' USING ERRCODE='23514';
 END IF;
 NEW.updated_at=now();
 RETURN NEW;
END;
$body$;
DROP TRIGGER IF EXISTS vatra_scheduled_post_guard ON public.scheduled_feed_posts;
CREATE TRIGGER vatra_scheduled_post_guard BEFORE INSERT OR UPDATE
 ON public.scheduled_feed_posts FOR EACH ROW EXECUTE FUNCTION public.vatra_scheduled_post_guard();

-- Restricted private worker. Running through pg_cron as the migration role
-- preserves transactional publication even when no users have the site open.
CREATE OR REPLACE FUNCTION vatra_scheduler.publish_due_posts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $body$
DECLARE queued public.scheduled_feed_posts%ROWTYPE; new_post uuid; published_count integer:=0;
BEGIN
 FOR queued IN
  SELECT * FROM public.scheduled_feed_posts
   WHERE status='queued' AND publish_at<=now()
    AND coalesce(next_attempt_at,publish_at)<=now()
   ORDER BY publish_at,id LIMIT 25 FOR UPDATE SKIP LOCKED
 LOOP
  BEGIN
   INSERT INTO public.feed_posts(author_id,author_vatra_id,body,visibility,media_items,poll)
    VALUES(queued.author_id,queued.author_vatra_id,queued.body,queued.visibility,queued.media_items,queued.poll)
    RETURNING id INTO new_post;
   UPDATE public.scheduled_feed_posts
    SET status='published',published_post_id=new_post,updated_at=now(),last_error=NULL
    WHERE id=queued.id;
   published_count:=published_count+1;
  EXCEPTION WHEN others THEN
   UPDATE public.scheduled_feed_posts
    SET attempts=least(attempts+1,5),
        status=CASE WHEN attempts>=4 THEN 'failed' ELSE 'queued' END,
        next_attempt_at=now()+interval '5 minutes',
        last_error=left(SQLERRM,400),updated_at=now()
    WHERE id=queued.id;
  END;
 END LOOP;
 RETURN published_count;
END;
$body$;
REVOKE ALL ON FUNCTION vatra_scheduler.publish_due_posts() FROM PUBLIC, anon, authenticated;

-- pg_cron is already enabled on the VATRA project.
SELECT cron.schedule('vatra-publish-scheduled-feed', '* * * * *',
 'SELECT vatra_scheduler.publish_due_posts();');
COMMIT;
