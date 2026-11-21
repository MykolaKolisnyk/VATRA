-- Applied to production Supabase on 2026-11-13 as migration 20261113171114.
-- Community catalog is public under existing SELECT RLS; creation is owner-only.
-- No UPDATE/DELETE grants; INSERT requires owner_id=auth.uid() via RLS.
GRANT SELECT ON TABLE public.communities TO anon, authenticated;
GRANT INSERT ON TABLE public.communities TO authenticated;
