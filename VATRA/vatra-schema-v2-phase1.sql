-- VATRA v2 | PHASE 1 / 2026-11-03
-- Additive, one-time normalization snapshot: profiles + confirmed friendships.
-- Source of truth is STILL public.app_data. This migration does NOT change the website,
-- app_data, existing functions, existing policies or the authentication system.
-- Before production use: take an independent FULL database backup.
-- Run as database administrator via Supabase SQL Editor. Review the verification query.
-- Do not rerun: it intentionally rejects previously existing v2 tables.
-- This is a SNAPSHOT, not live synchronization. Do not switch readers yet.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '90s';

DO $guard$
BEGIN
  IF to_regclass('public.app_data') IS NULL THEN
    RAISE EXCEPTION 'VATRA v2: source table public.app_data is missing';
  END IF;
  IF to_regclass('public.vatra_users') IS NOT NULL
    OR to_regclass('public.vatra_private_profiles') IS NOT NULL
    OR to_regclass('public.vatra_friends') IS NOT NULL THEN
    RAISE EXCEPTION 'VATRA v2: a destination table already exists. Stop and inspect; do not overwrite it';
  END IF;
  -- This phase understands the current one-row-per-profile layout only.
  IF EXISTS (
    SELECT 1 FROM public.app_data
    WHERE path IN ('publicProfiles', 'privateUsers', 'friends')
  ) THEN
    RAISE EXCEPTION 'VATRA v2: a legacy combined root exists. Do not silently skip its contents';
  END IF;
  -- Reject profile rows with invalid UUID paths and malformed source objects.
  IF EXISTS (
    SELECT 1 FROM public.app_data
    WHERE (
      path LIKE 'publicProfiles/%' AND
      path !~* '^publicProfiles/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) OR (
      path LIKE 'privateUsers/%' AND
      path !~* '^privateUsers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
  ) THEN
    RAISE EXCEPTION 'VATRA v2: nested or non-UUID profile paths require a separate migration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.app_data
    WHERE (path ~* '^(publicProfiles|privateUsers)/[0-9a-f-]{36}$')
      AND jsonb_typeof(value) IS DISTINCT FROM 'object'
  ) THEN
    RAISE EXCEPTION 'VATRA v2: a profile source row is not a JSON object';
  END IF;
END;
$guard$;

-- Only fields from publicProfiles go here. Never copy users/ or privateUsers/
-- into this public-profile projection.
CREATE TABLE public.vatra_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  first_name text,
  last_name text,
  handle text,
  gender text,
  bio text,
  avatar_url text,
  cover_url text,
  profile_visibility text NOT NULL DEFAULT 'public'
    CHECK (profile_visibility IN ('public', 'private')),
  searchable boolean NOT NULL DEFAULT true,
  allow_messages boolean NOT NULL DEFAULT true,
  public_snapshot jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL,
  copied_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vatra_users_handle_idx
  ON public.vatra_users (lower(handle))
  WHERE handle IS NOT NULL;
CREATE INDEX vatra_users_discovery_idx
  ON public.vatra_users (profile_visibility, searchable);

-- Private profile data must never be exposed by broad public SELECT policies.
-- Keeping a private source snapshot makes this initial extraction lossless.
CREATE TABLE public.vatra_private_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth date,
  phone text,
  pending_phone text,
  private_sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_lists jsonb NOT NULL DEFAULT '{}'::jsonb,
  notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  private_snapshot jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL,
  copied_at timestamptz NOT NULL DEFAULT now()
);

-- Two directed rows represent one verified, reciprocal friendship.
-- A pending/one-sided request never becomes a confirmed friend here.
CREATE TABLE public.vatra_friends (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  copied_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vatra_friends_not_self CHECK (user_id <> friend_id),
  CONSTRAINT vatra_friends_pk PRIMARY KEY (user_id, friend_id)
);
CREATE INDEX vatra_friends_reverse_idx
  ON public.vatra_friends (friend_id, user_id);

-- Client access: DENY by default until per-operation RLS and tests are ready.
ALTER TABLE public.vatra_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vatra_private_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vatra_friends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE
  public.vatra_users,
  public.vatra_private_profiles,
  public.vatra_friends
FROM PUBLIC, anon, authenticated;

-- Copy canonical public profile projections.
INSERT INTO public.vatra_users (
  user_id, display_name, first_name, last_name, handle, gender,
  bio, avatar_url, cover_url, profile_visibility, searchable,
  allow_messages, public_snapshot, source_updated_at
)
SELECT
  split_part(a.path, '/', 2)::uuid,
  coalesce(nullif(a.value->>'name', ''), 'Користувач ВАТРИ'),
  nullif(a.value->>'firstName', ''),
  nullif(a.value->>'lastName', ''),
  nullif(a.value->>'handle', ''),
  CASE WHEN a.value->>'gender' IN ('male', 'female')
    THEN a.value->>'gender' ELSE NULL END,
  nullif(a.value->>'bio', ''),
  nullif(a.value->>'avatarUrl', ''),
  nullif(a.value->>'coverUrl', ''),
  CASE WHEN a.value->>'profileVisibility' = 'private'
    THEN 'private' ELSE 'public' END,
  a.value->>'searchable' IS DISTINCT FROM 'false',
  a.value->>'allowMessages' IS DISTINCT FROM 'false',
  a.value,
  coalesce(a.updated_at, now())
FROM public.app_data a
WHERE a.path ~* '^publicProfiles/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Copy private profile projections. Invalid ISO dates cause a safe rollback.
INSERT INTO public.vatra_private_profiles (
  user_id, date_of_birth, phone, pending_phone,
  private_sections, record_lists, notification_preferences,
  private_snapshot, source_updated_at
)
SELECT
  split_part(a.path, '/', 2)::uuid,
  CASE
    WHEN a.value->>'dateOfBirth' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    THEN (a.value->>'dateOfBirth')::date
    ELSE NULL
  END,
  nullif(a.value->>'phone', ''),
  nullif(a.value->>'pendingPhone', ''),
  CASE WHEN jsonb_typeof(a.value->'privateSections') = 'object'
    THEN a.value->'privateSections' ELSE '{}'::jsonb END,
  CASE WHEN jsonb_typeof(a.value->'recordLists') = 'object'
    THEN a.value->'recordLists' ELSE '{}'::jsonb END,
  CASE WHEN jsonb_typeof(a.value->'notificationPreferences') = 'object'
    THEN a.value->'notificationPreferences' ELSE '{}'::jsonb END,
  a.value,
  coalesce(a.updated_at, now())
FROM public.app_data a
WHERE a.path ~* '^privateUsers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Copy only reciprocal TRUE/TRUE friendships.
-- CASE prevents casting non-UUID JSON object keys.
WITH edges AS (
  SELECT
    split_part(a.path, '/', 2)::uuid AS user_id,
    CASE WHEN kv.key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN kv.key::uuid ELSE NULL END AS friend_id,
    kv.value AS flag
  FROM public.app_data a
  CROSS JOIN LATERAL jsonb_each(
    CASE WHEN jsonb_typeof(a.value) = 'object' THEN a.value
      ELSE '{}'::jsonb END
  ) AS kv(key, value)
  WHERE a.path ~* '^friends/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
),
mutual AS (
  SELECT e.user_id, e.friend_id
  FROM edges e
  JOIN edges r
    ON r.user_id = e.friend_id
   AND r.friend_id = e.user_id
  WHERE e.flag = 'true'::jsonb
    AND r.flag = 'true'::jsonb
    AND e.user_id <> e.friend_id
),
valid_mutual AS (
  SELECT DISTINCT m.user_id, m.friend_id
  FROM mutual m
  JOIN auth.users u ON u.id = m.user_id
  JOIN auth.users f ON f.id = m.friend_id
)
INSERT INTO public.vatra_friends (user_id, friend_id)
SELECT user_id, friend_id FROM valid_mutual;

COMMIT;

-- Snapshot counts; run VATRA/vatra-schema-v2-phase1-audit.sql afterwards.
SELECT 'vatra_users' AS v2_table, count(*) AS copied_rows
FROM public.vatra_users
UNION ALL SELECT 'vatra_private_profiles', count(*)
FROM public.vatra_private_profiles
UNION ALL SELECT 'vatra_friends', count(*)
FROM public.vatra_friends;
