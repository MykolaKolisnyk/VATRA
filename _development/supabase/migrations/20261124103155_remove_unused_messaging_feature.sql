DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.messenger_messages) OR EXISTS (SELECT 1 FROM public.direct_messages) THEN RAISE EXCEPTION 'Message records appeared after inspection; abort removal'; END IF; END $$;
DROP FUNCTION IF EXISTS public.messenger_delete_message(uuid,text) RESTRICT;
DROP TABLE public.messenger_messages RESTRICT;
DROP TABLE public.messenger_keys RESTRICT;
DROP TABLE public.direct_messages RESTRICT;
NOTIFY pgrst, 'reload schema';
