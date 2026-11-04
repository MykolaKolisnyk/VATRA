-- VATRA | Safe security + FK index tune-up, 2026-11-03
-- Verified against live project rjasunoawrxvetwadylh.
-- Does not modify table data, API routes, RLS policy bodies or auth settings.
-- All changes transactionally applied with timeouts.

BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='90s';

-- Add selective FK indexes missing from the real schema.
CREATE INDEX IF NOT EXISTS vatra_gift_claims_code_fk_idx ON public.vatra_gift_claims(code);
CREATE INDEX IF NOT EXISTS vatra_gift_instances_code_fk_idx ON public.vatra_gift_instances(code);
CREATE INDEX IF NOT EXISTS vatra_gift_instances_sender_fk_idx ON public.vatra_gift_instances(sender_uid);
CREATE INDEX IF NOT EXISTS vatra_gift_orders_code_fk_idx ON public.vatra_gift_orders(code);
CREATE INDEX IF NOT EXISTS vatra_gift_orders_handler_fk_idx ON public.vatra_gift_orders(handled_by);
CREATE INDEX IF NOT EXISTS vatra_scheduled_posts_author_fk_idx ON public.vatra_scheduled_posts(author_uid);
CREATE INDEX IF NOT EXISTS vatra_support_alerts_ticket_fk_idx ON public.vatra_support_alerts(ticket_id);
CREATE INDEX IF NOT EXISTS vatra_support_messages_sender_fk_idx ON public.vatra_support_messages(sender_uid);
CREATE INDEX IF NOT EXISTS vatra_verification_requests_applicant_fk_idx ON public.vatra_verification_requests(applicant_uid);

-- These four SECURITY DEFINER routines are trigger/event-trigger
-- implementation functions, not public JSON RPC endpoints.
-- Revoke web-role invocation while preserving their trigger definitions.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vatra_moderation_queue_report()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vatra_validate_group_post_author()
  FROM PUBLIC, anon, authenticated;

-- Gift-changing / private-inventory RPCs require a signed-in user.
-- Keep authenticated and service_role grants untouched.
-- Do not touch public vatra_gifts_public(uuid) used for public display.
REVOKE EXECUTE ON FUNCTION public.vatra_gifts_claim_holiday()
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vatra_gifts_inventory()
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vatra_gifts_send(uuid,uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vatra_gifts_set_visibility(text)
  FROM PUBLIC, anon;

COMMIT;

-- Live verification: all nine indices and all eight anon restrictions.
SELECT
  (SELECT count(*) FROM pg_class ix JOIN pg_namespace n
   ON n.oid=ix.relnamespace
   WHERE n.nspname='public' AND ix.relkind='i'
     AND ix.relname IN (
       'vatra_gift_claims_code_fk_idx',
       'vatra_gift_instances_code_fk_idx',
       'vatra_gift_instances_sender_fk_idx',
       'vatra_gift_orders_code_fk_idx',
       'vatra_gift_orders_handler_fk_idx',
       'vatra_scheduled_posts_author_fk_idx',
       'vatra_support_alerts_ticket_fk_idx',
       'vatra_support_messages_sender_fk_idx',
       'vatra_verification_requests_applicant_fk_idx'
     )
  ) AS new_fk_indexes,
  (SELECT count(*) FROM pg_proc p
   JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public'
     AND p.proname IN (
       'handle_new_user','rls_auto_enable',
       'vatra_moderation_queue_report','vatra_validate_group_post_author',
       'vatra_gifts_claim_holiday','vatra_gifts_inventory',
       'vatra_gifts_send','vatra_gifts_set_visibility'
     )
     AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
  ) AS anon_protected_functions;
