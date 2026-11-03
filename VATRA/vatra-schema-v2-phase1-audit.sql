-- VATRA v2 | PHASE 1 AUDIT (read-only) / 2026-11-03
-- Run AFTER vatra-schema-v2-phase1.sql in Supabase SQL Editor.
-- Only aggregate counts and pass/fail checks; no personal data is returned.
-- Live app_data edits after the snapshot can legitimately cause drift.
-- DO NOT switch the website to v2 until a separate sync stage is deployed
-- and this audit, privacy rules and real browser tests all pass.

WITH public_source AS (
  SELECT split_part(path,'/',2)::uuid AS id, value
  FROM public.app_data
  WHERE path ~* '^publicProfiles/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
),
private_source AS (
  SELECT split_part(path,'/',2)::uuid AS id, value
  FROM public.app_data
  WHERE path ~* '^privateUsers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
),
friend_edges AS (
  SELECT
    split_part(a.path, '/', 2)::uuid AS user_id,
    CASE WHEN kv.key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN kv.key::uuid ELSE NULL END AS friend_id,
    kv.value AS flag
  FROM public.app_data a
  CROSS JOIN LATERAL jsonb_each(
    CASE WHEN jsonb_typeof(a.value)='object' THEN a.value
      ELSE '{}'::jsonb END
  ) AS kv(key,value)
  WHERE a.path ~* '^friends/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
),
expected_friends AS (
  SELECT DISTINCT e.user_id, e.friend_id
  FROM friend_edges e
  JOIN friend_edges r
    ON r.user_id=e.friend_id AND r.friend_id=e.user_id
  JOIN auth.users u ON u.id=e.user_id
  JOIN auth.users f ON f.id=e.friend_id
  WHERE e.flag='true'::jsonb AND r.flag='true'::jsonb
    AND e.user_id <> e.friend_id
),
results AS (
  SELECT 'public profiles'::text AS entity,
    (SELECT count(*) FROM public_source) AS source_rows,
    (SELECT count(*) FROM public.vatra_users) AS normalized_rows,
    (SELECT count(*) FROM (
      SELECT id FROM public_source
      EXCEPT SELECT user_id FROM public.vatra_users
    ) x) AS missing_rows,
    (SELECT count(*) FROM (
      SELECT user_id FROM public.vatra_users
      EXCEPT SELECT id FROM public_source
    ) x) AS extra_rows,
    (SELECT count(*) FROM public_source s
      JOIN public.vatra_users p ON p.user_id=s.id
      WHERE p.public_snapshot IS DISTINCT FROM s.value) AS changed_payloads
  UNION ALL
  SELECT 'private profiles',
    (SELECT count(*) FROM private_source),
    (SELECT count(*) FROM public.vatra_private_profiles),
    (SELECT count(*) FROM (
      SELECT id FROM private_source
      EXCEPT SELECT user_id FROM public.vatra_private_profiles
    ) x),
    (SELECT count(*) FROM (
      SELECT user_id FROM public.vatra_private_profiles
      EXCEPT SELECT id FROM private_source
    ) x),
    (SELECT count(*) FROM private_source s
      JOIN public.vatra_private_profiles p ON p.user_id=s.id
      WHERE p.private_snapshot IS DISTINCT FROM s.value)
  UNION ALL
  SELECT 'confirmed directed friends',
    (SELECT count(*) FROM expected_friends),
    (SELECT count(*) FROM public.vatra_friends),
    (SELECT count(*) FROM (
      SELECT user_id,friend_id FROM expected_friends
      EXCEPT SELECT user_id,friend_id FROM public.vatra_friends
    ) x),
    (SELECT count(*) FROM (
      SELECT user_id,friend_id FROM public.vatra_friends
      EXCEPT SELECT user_id,friend_id FROM expected_friends
    ) x),
    0::bigint
)
SELECT entity, source_rows, normalized_rows, missing_rows, extra_rows,
  changed_payloads,
  (source_rows=normalized_rows AND missing_rows=0
    AND extra_rows=0 AND changed_payloads=0) AS parity_at_check
FROM results
ORDER BY entity;

-- In public schema, each v2 table is RLS-enabled and has NO client grants.
SELECT
  c.relname AS v2_table,
  c.relrowsecurity AS rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_can_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') AS user_can_select,
  has_table_privilege('authenticated', c.oid, 'INSERT') AS user_can_insert,
  has_table_privilege('authenticated', c.oid, 'UPDATE') AS user_can_update,
  has_table_privilege('authenticated', c.oid, 'DELETE') AS user_can_delete
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('vatra_users','vatra_private_profiles','vatra_friends')
ORDER BY c.relname;
