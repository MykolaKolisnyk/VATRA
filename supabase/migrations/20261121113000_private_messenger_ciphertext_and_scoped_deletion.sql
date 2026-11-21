-- VATRA private Messenger v1: encrypted payloads only.
-- Old public.direct_messages is preserved for migration and historical data.
BEGIN;
CREATE TABLE public.messenger_keys(
  vatra_id bigint PRIMARY KEY REFERENCES public.accounts(vatra_id) ON DELETE CASCADE,
  public_key jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messenger_public_jwk_shape CHECK (
    public_key->>'kty'='EC' AND public_key->>'crv'='P-256'
    AND length(public_key->>'x') BETWEEN 42 AND 44
    AND length(public_key->>'y') BETWEEN 42 AND 44
  )
);
CREATE TABLE public.messenger_messages(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id bigint NOT NULL REFERENCES public.accounts(vatra_id),
  recipient_id bigint NOT NULL REFERENCES public.accounts(vatra_id),
  ciphertext text,
  nonce text,
  salt text,
  sender_public_key jsonb,
  recipient_public_key jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_for_all_at timestamptz,
  deleted_for_sender_at timestamptz,
  deleted_for_recipient_at timestamptz,
  CONSTRAINT messenger_distinct_members CHECK(sender_id<>recipient_id),
  CONSTRAINT messenger_ciphertext_bounds CHECK(ciphertext IS NULL OR length(ciphertext) BETWEEN 16 AND 12000),
  CONSTRAINT messenger_payload_or_tombstone CHECK(
    (deleted_for_all_at IS NULL AND ciphertext IS NOT NULL AND nonce IS NOT NULL AND salt IS NOT NULL
      AND sender_public_key IS NOT NULL AND recipient_public_key IS NOT NULL)
    OR
    (deleted_for_all_at IS NOT NULL AND ciphertext IS NULL AND nonce IS NULL AND salt IS NULL
      AND sender_public_key IS NULL AND recipient_public_key IS NULL)
  )
);
CREATE INDEX messenger_message_sender_recent ON public.messenger_messages(sender_id,created_at DESC,id DESC);
CREATE INDEX messenger_message_recipient_recent ON public.messenger_messages(recipient_id,created_at DESC,id DESC);
ALTER TABLE public.messenger_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.messenger_keys FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.messenger_messages FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.messenger_keys TO authenticated;
GRANT SELECT,INSERT ON public.messenger_messages TO authenticated;
CREATE POLICY messenger_keys_read ON public.messenger_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY messenger_keys_create ON public.messenger_keys FOR INSERT TO authenticated WITH CHECK(
 vatra_id=(SELECT a.vatra_id FROM public.accounts a WHERE a.user_id=(SELECT auth.uid()))
);
CREATE POLICY messenger_keys_active_account ON public.messenger_keys AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT vatra_admin_private.allowed()))
 WITH CHECK ((SELECT vatra_admin_private.allowed()));
CREATE POLICY messenger_participant_read ON public.messenger_messages FOR SELECT TO authenticated USING (
 sender_id=(SELECT a.vatra_id FROM public.accounts a WHERE a.user_id=(SELECT auth.uid()))
 OR recipient_id=(SELECT a.vatra_id FROM public.accounts a WHERE a.user_id=(SELECT auth.uid()))
);
CREATE POLICY messenger_sender_insert ON public.messenger_messages FOR INSERT TO authenticated WITH CHECK(
 sender_id=(SELECT a.vatra_id FROM public.accounts a WHERE a.user_id=(SELECT auth.uid()))
 AND deleted_for_all_at IS NULL AND deleted_for_sender_at IS NULL AND deleted_for_recipient_at IS NULL
 AND NOT public.vatra_has_block_between(sender_id) AND NOT public.vatra_has_block_between(recipient_id)
 AND EXISTS(SELECT 1 FROM public.messenger_keys k WHERE k.vatra_id=sender_id AND k.public_key=sender_public_key)
 AND EXISTS(SELECT 1 FROM public.messenger_keys k WHERE k.vatra_id=recipient_id AND k.public_key=recipient_public_key)
);
CREATE POLICY messenger_messages_active_account ON public.messenger_messages AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT vatra_admin_private.allowed()))
 WITH CHECK ((SELECT vatra_admin_private.allowed()));
-- Never grant UPDATE/DELETE directly. This SECURITY DEFINER endpoint changes only allowed fields.
CREATE FUNCTION public.messenger_delete_message(p_id uuid,p_scope text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE own_id bigint; original public.messenger_messages%ROWTYPE;
BEGIN
 SELECT a.vatra_id INTO own_id FROM public.accounts a WHERE a.user_id=auth.uid();
 IF own_id IS NULL OR p_scope NOT IN ('mine','everyone') THEN RAISE EXCEPTION 'Invalid deletion request' USING ERRCODE='22023'; END IF;
 IF NOT vatra_admin_private.allowed() THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO original FROM public.messenger_messages WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR own_id NOT IN (original.sender_id,original.recipient_id)
 THEN RAISE EXCEPTION 'Message unavailable' USING ERRCODE='42501'; END IF;
 IF p_scope='everyone' THEN
   IF original.sender_id<>own_id THEN RAISE EXCEPTION 'Only the sender may revoke for everyone' USING ERRCODE='42501'; END IF;
   UPDATE public.messenger_messages SET ciphertext=NULL,nonce=NULL,salt=NULL,
    sender_public_key=NULL,recipient_public_key=NULL,deleted_for_all_at=coalesce(deleted_for_all_at,now())
   WHERE id=p_id;
 ELSE
   IF original.sender_id=own_id THEN
     UPDATE public.messenger_messages SET deleted_for_sender_at=coalesce(deleted_for_sender_at,now()) WHERE id=p_id;
   ELSE
     UPDATE public.messenger_messages SET deleted_for_recipient_at=coalesce(deleted_for_recipient_at,now()) WHERE id=p_id;
   END IF;
 END IF;
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.messenger_delete_message(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.messenger_delete_message(uuid,text) TO authenticated;
-- Server sends row change notices, never plaintext; RLS continues to enforce readership.
ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_messages;
COMMENT ON TABLE public.messenger_messages IS 'E2EE beta envelope; never write plaintext, never log message content. Server observes communication metadata.';
COMMIT;