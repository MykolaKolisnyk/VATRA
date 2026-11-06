-- VATRA / 2026-11-06: keep internal RLS helper functions off the public RPC surface.
-- Existing callers were checked against pg_policies and pg_proc before this change:
-- all references to these four helpers are inside SECURITY DEFINER routines owned by postgres.
-- Do NOT revoke public.vatra_data_can_read / public.vatra_data_can_write:
-- app_data RLS policies invoke those directly as anon and authenticated.
-- This migration changes EXECUTE grants only; it does not alter user data,
-- table policies, SQL function bodies, or RLS enablement.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.vatra_data_can_read_post(text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vatra_data_is_friend(text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vatra_data_is_group_member(text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vatra_data_is_group_owner(text, uuid)
  FROM PUBLIC, anon, authenticated;

COMMIT;
