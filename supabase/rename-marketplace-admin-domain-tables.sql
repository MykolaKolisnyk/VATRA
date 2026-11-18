alter table public.vatra_admin_audit rename to admin_audit;
alter table public.vatra_market_cases rename to marketplace_cases;
alter table public.vatra_market_moderation_history rename to marketplace_moderation_history;
alter table public.vatra_market_moderators rename to marketplace_moderators;
alter table public.vatra_market_suspensions rename to marketplace_suspensions;
alter table public.vatra_marketplace_listings rename to marketplace_listings;
alter table public.vatra_onboarding_done rename to onboarding_done;
alter table public.vatra_verification_requests rename to verification_requests;
-- OID-bound policies, foreign keys, indexes and grants survive table renames.
-- SQL/PLpgSQL function bodies do not; rewrite their explicit table references.
do $migration$
declare f record; spec text;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind='f' and n.nspname in ('public','vatra_admin_private','vatra_market_private') and p.prosrc ~ 'vatra_(admin_audit|market_cases|market_moderation_history|market_moderators|market_suspensions|marketplace_listings|onboarding_done|verification_requests)' loop
  spec:=pg_get_functiondef(f.oid);
  spec:=replace(spec,'public.vatra_admin_audit','public.admin_audit');
  spec:=replace(spec,'public.vatra_market_cases','public.marketplace_cases');
  spec:=replace(spec,'public.vatra_market_moderation_history','public.marketplace_moderation_history');
  spec:=replace(spec,'public.vatra_market_moderators','public.marketplace_moderators');
  spec:=replace(spec,'public.vatra_market_suspensions','public.marketplace_suspensions');
  spec:=replace(spec,'public.vatra_marketplace_listings','public.marketplace_listings');
  spec:=replace(spec,'public.vatra_onboarding_done','public.onboarding_done');
  spec:=replace(spec,'public.vatra_verification_requests','public.verification_requests');
  execute spec;
 end loop;
end $migration$;
notify pgrst,'reload schema';
