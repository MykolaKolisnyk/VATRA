-- Applied in Supabase project rjasunoawrxvetwadylh as migration
-- 20261113171916_add_nonbreaking_domain_named_rls_invoker_read_views.
-- Stage 1: RLS-preserving, read-only aliases for domain-named API paths.
-- Keep original physical tables for signup triggers, foreign keys, old JS,
-- and cached service-worker deployments. No data copy, no downtime.
CREATE VIEW public.member_directory WITH (security_invoker = true) AS
 SELECT vatra_id FROM public.vatra_directory;
CREATE VIEW public.account_states WITH (security_invoker = true) AS
 SELECT vatra_id,state,blocked_until FROM public.vatra_account_states;
CREATE VIEW public.profile_gifts WITH (security_invoker = true) AS
 SELECT id,recipient_vatra_id,gift_code,created_at FROM public.vatra_profile_gifts;

REVOKE ALL ON TABLE public.member_directory,public.account_states,public.profile_gifts
 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.member_directory TO anon,authenticated;
GRANT SELECT ON TABLE public.account_states,public.profile_gifts TO authenticated;
