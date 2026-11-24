-- Keep request notifications aligned with the friendship state.
-- Request acceptance, decline and cancellation remove the obsolete incoming request.
BEGIN;
CREATE OR REPLACE FUNCTION private.notify_friend_declined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF OLD.status = 'pending' THEN
    IF TG_OP = 'DELETE' THEN
      DELETE FROM public.member_notifications
       WHERE recipient_vatra_id = OLD.recipient_id
         AND kind = 'friend_request'
         AND event_key = 'friend_request:' || OLD.id::text;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status = 'accepted' THEN
        DELETE FROM public.member_notifications
         WHERE recipient_vatra_id = OLD.recipient_id
           AND kind = 'friend_request'
           AND event_key = 'friend_request:' || OLD.id::text;
      END IF;
    END IF;
  END IF;

  -- Only the recipient may decline. Withdrawing a sent request sends no decline alert.
  IF TG_OP = 'DELETE' AND OLD.status = 'pending'
     AND EXISTS (
       SELECT 1 FROM public.accounts a
       WHERE a.user_id = (SELECT auth.uid())
         AND a.vatra_id = OLD.recipient_id
     )
  THEN
    INSERT INTO public.member_notifications
      (recipient_vatra_id, actor_vatra_id, kind, target_kind, target_id, event_key)
    VALUES
      (OLD.requester_id, OLD.recipient_id, 'friend_declined', 'friend', OLD.id,
       'friend_declined:' || OLD.id::text)
    ON CONFLICT (recipient_vatra_id, event_key) DO NOTHING;
  END IF;

  IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;
  RETURN OLD;
END;
$function$;

REVOKE ALL ON FUNCTION private.notify_friend_declined() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS vatra_notify_friend_declined ON public.friendships;
CREATE TRIGGER vatra_notify_friend_declined
  AFTER DELETE OR UPDATE OF status ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION private.notify_friend_declined();

-- Existing historical notices must not pretend a pending request still exists.
DELETE FROM public.member_notifications n
WHERE n.kind = 'friend_request'
  AND NOT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.id = n.target_id AND f.status = 'pending'
  );
COMMIT;
