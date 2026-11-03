-- VATRA v2 | PHASE 1 ROLLBACK
-- Run ONLY before any live website reads/writes the new v2 tables.
-- This removes only the three new phase-1 tables, never public.app_data.
-- Requires an independent full database backup like any schema change.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
BEGIN
  IF to_regclass('public.vatra_users') IS NULL
    OR to_regclass('public.vatra_private_profiles') IS NULL
    OR to_regclass('public.vatra_friends') IS NULL THEN
    RAISE EXCEPTION 'VATRA v2: phase-1 tables not all present. Do not drop an unknown partial schema';
  END IF;
  -- Reject when any non-internal triggers were added to the new tables.
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE NOT t.tgisinternal
      AND t.tgrelid IN (
        'public.vatra_users'::regclass,
        'public.vatra_private_profiles'::regclass,
        'public.vatra_friends'::regclass
      )
  ) THEN
    RAISE EXCEPTION 'VATRA v2: additional triggers are installed. Do not roll back a later migration';
  END IF;
END;
$guard$;

DROP TABLE public.vatra_friends RESTRICT;
DROP TABLE public.vatra_private_profiles RESTRICT;
DROP TABLE public.vatra_users RESTRICT;
COMMIT;

-- Legacy production storage is unchanged by this operation.
SELECT to_regclass('public.app_data') IS NOT NULL AS legacy_storage_intact;
