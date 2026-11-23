-- VATRA: notify the requester when their pending friend invitation is declined.
-- This migration is intentionally independent of the polling/scheduling branch.
BEGIN;
ALTER TABLE public.member_notifications DROP CONSTRAINT member_notifications_kind_check;
ALTER TABLE public.member_notifications ADD CONSTRAINT member_notifications_kind_check
 CHECK(kind IN ('friend_request','friend_accepted','friend_declined','post_like',
                'comment_like','avatar_like','avatar_comment_like'));

CREATE OR REPLACE FUNCTION private.notify_friend_declined()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- A withdrawn or declined pending request must not linger in the receiver's inbox.
  IF OLD.status='pending' THEN
    DELETE FROM public.member_notifications
     WHERE recipient_vatra_id=OLD.recipient_id
       AND event_key='friend_request:'||OLD.id::text;
  END IF;
  -- Only declining recipients trigger this notice. Cancelling a sent request does not.
  IF OLD.status='pending' AND EXISTS (
     SELECT 1 FROM public.accounts a
     WHERE a.user_id=(SELECT auth.uid()) AND a.vatra_id=OLD.recipient_id
  ) THEN
    INSERT INTO public.member_notifications
      (recipient_vatra_id,actor_vatra_id,kind,target_kind,target_id,event_key)
    VALUES (OLD.requester_id,OLD.recipient_id,'friend_declined','friend',OLD.id,
            'friend_declined:'||OLD.id::text)
    ON CONFLICT (recipient_vatra_id,event_key) DO NOTHING;
  END IF;
  RETURN OLD;
END;
$function$;
REVOKE ALL ON FUNCTION private.notify_friend_declined() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS vatra_notify_friend_declined ON public.friendships;
CREATE TRIGGER vatra_notify_friend_declined
 AFTER DELETE ON public.friendships
 FOR EACH ROW EXECUTE FUNCTION private.notify_friend_declined();
COMMIT;
