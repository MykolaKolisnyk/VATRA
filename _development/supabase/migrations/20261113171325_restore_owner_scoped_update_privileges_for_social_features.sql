-- Applied to production Supabase on 2026-11-13 as migration 20261113171325.
-- Existing authenticated RLS UPDATE policies restrict each action to its owner.
-- Restores notification read state, friendships acceptance, cover/avatar changes,
-- status edit and presence recording. No anon writes.
GRANT UPDATE ON TABLE public.vatra_friendships TO authenticated;
GRANT UPDATE ON TABLE public.vatra_profile_media TO authenticated;
GRANT UPDATE ON TABLE public.vatra_public_profiles TO authenticated;
GRANT UPDATE ON TABLE public.member_notifications TO authenticated;
GRANT UPDATE ON TABLE public.profile_presence TO authenticated;
