-- Applied to Supabase as 20261113180825; completes physical vatra_* renames.
-- Real PostgREST upserts use new physical names. Legacy simple views
-- retain their original table-level operation privileges and underlying RLS.
BEGIN;
ALTER TABLE public.vatra_profile_details RENAME TO profile_details;
ALTER TABLE public.vatra_profile_preferences RENAME TO profile_preferences;
CREATE VIEW public.vatra_profile_details WITH (security_invoker = true) AS
 SELECT * FROM public.profile_details;
CREATE VIEW public.vatra_profile_preferences WITH (security_invoker = true) AS
 SELECT * FROM public.profile_preferences;
REVOKE ALL ON TABLE public.vatra_profile_details,public.vatra_profile_preferences
 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.vatra_profile_details TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.vatra_profile_preferences TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
