-- =====================================================================
-- ВАТРА | ЄДИНИЙ SQL: СУМІСНА МІГРАЦІЯ ТА ОЧИЩЕННЯ (2026-11-03)
-- =====================================================================
-- ВАЖЛИВО: перед запуском зробіть ПОВНУ резервну копію Supabase.
-- Цей файл не перемикає JavaScript на нову схему, не видаляє app_data.
-- Поточна ВАТРА продовжує читати/писати через app_data.
-- Нові захищені таблиці отримують копії (дзеркало) з app_data.
-- Якщо синхронізація зламається, тригер НЕ блокує запис сайту:
-- помилка фіксується в закритій vatra_v2_sync_errors.
-- Усі таблиці v2 недоступні anon/authenticated до окремої міграції RLS.
-- Порожні communities/community_members видаляються ЛИШЕ після
-- перевірок використання та архівування; інакше залишаються.
-- Старі profiles/private_profiles з реальними даними не видаляються.
-- Цей файл не проходив повноцінного E2E-тестування в production.
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(hashtext('vatra-v2-compatible-one-sql'));

DO $preflight$
BEGIN
  IF to_regclass('public.app_data') IS NULL THEN
    RAISE EXCEPTION 'ВАТРА: відсутня public.app_data. Міграція скасована.';
  END IF;
  IF to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'ВАТРА: відсутня auth.users. Міграція скасована.';
  END IF;
END
$preflight$;

-- 1. ПРОФІЛІ ТА ДРУЗІ — сумісні з уже виконаним етапом ВАТРА 2.0
CREATE TABLE IF NOT EXISTS public.vatra_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL, first_name text, last_name text,
  handle text, gender text, bio text, avatar_url text, cover_url text,
  profile_visibility text NOT NULL DEFAULT 'public',
  searchable boolean NOT NULL DEFAULT true,
  allow_messages boolean NOT NULL DEFAULT true,
  public_snapshot jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL,
  copied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.vatra_private_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth date, phone text, pending_phone text,
  private_sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_lists jsonb NOT NULL DEFAULT '{}'::jsonb,
  notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  private_snapshot jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL,
  copied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.vatra_friends (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  copied_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vatra_friends_not_self CHECK (user_id <> friend_id),
  CONSTRAINT vatra_friends_pk PRIMARY KEY(user_id,friend_id)
);

-- 2. ОКРЕМІ ДОМЕННІ ТАБЛИЦІ. JSONB-знімок зберігає неперенесені
-- властивості, щоб не втрачати фото, налаштування та метадані.
CREATE TABLE IF NOT EXISTS public.vatra_posts (
  source_path text PRIMARY KEY,
  post_id text NOT NULL, community_id text,
  author_uid text, visibility text, body text,
  payload jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.vatra_communities (
  source_path text PRIMARY KEY,
  community_id text NOT NULL,
  owner_uid text, title text, visibility text,
  payload jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.vatra_community_members (
  source_path text PRIMARY KEY,
  community_id text NOT NULL,
  member_uid text,
  role text,
  payload jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.vatra_videos (
  source_path text PRIMARY KEY,
  video_id text NOT NULL,
  author_uid text, title text,
  payload jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.vatra_chats (
  source_path text PRIMARY KEY,
  chat_id text NOT NULL,
  members jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL
);
-- Лише записи, що зберігаються окремим шляхом. Повідомлення всередині
-- chats/<id> поки залишаються в JSONB цієї таблиці та у app_data.
CREATE TABLE IF NOT EXISTS public.vatra_chat_messages (
  source_path text PRIMARY KEY,
  chat_id text NOT NULL,
  message_id text NOT NULL,
  sender_uid text,
  is_encrypted boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.vatra_group_conversations (
  source_path text PRIMARY KEY,
  conversation_id text NOT NULL,
  owner_uid text,title text,
  members jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.vatra_group_messages (
  source_path text PRIMARY KEY,
  conversation_id text NOT NULL,
  message_id text,
  payload jsonb NOT NULL,
  source_updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.vatra_v2_sync_errors (
  source_path text PRIMARY KEY,
  sqlstate text,
  error_message text,
  errors integer NOT NULL DEFAULT 1,
  last_error_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vatra_posts_author_idx ON public.vatra_posts(author_uid);
CREATE INDEX IF NOT EXISTS vatra_posts_community_idx ON public.vatra_posts(community_id);
CREATE INDEX IF NOT EXISTS vatra_community_members_group_idx
  ON public.vatra_community_members(community_id);
CREATE INDEX IF NOT EXISTS vatra_community_members_uid_idx
  ON public.vatra_community_members(member_uid);
CREATE INDEX IF NOT EXISTS vatra_videos_author_idx ON public.vatra_videos(author_uid);
CREATE INDEX IF NOT EXISTS vatra_chat_messages_chat_idx
  ON public.vatra_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS vatra_group_messages_conversation_idx
  ON public.vatra_group_messages(conversation_id);

-- Захист: поки сайт не перейшов на нові RPC та RLS, нові дані
-- доступні тільки адміністратору / службі БД.
DO $secure$
DECLARE name text;
BEGIN
  FOREACH name IN ARRAY ARRAY[
    'vatra_users','vatra_private_profiles','vatra_friends',
    'vatra_posts','vatra_communities','vatra_community_members',
    'vatra_videos','vatra_chats','vatra_chat_messages',
    'vatra_group_conversations','vatra_group_messages','vatra_v2_sync_errors'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',name);
  END LOOP;
END
$secure$;

-- 3. ТОЧКОВА СИНХРОНІЗАЦІЯ ПІДТВЕРДЖЕНИХ ДРУЗІВ.
-- Перевіряємо ОБИДВА списки; односторонній запит не стає дружбою.
CREATE OR REPLACE FUNCTION public.vatra_v2_sync_friend_uid(p_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' SET row_security = off
AS $friend$
BEGIN
  DELETE FROM public.vatra_friends
  WHERE user_id=p_uid OR friend_id=p_uid;

  WITH own_edges AS (
    SELECT e.key AS friend_uid
    FROM public.app_data a
    CROSS JOIN LATERAL jsonb_each(
      CASE WHEN jsonb_typeof(a.value)='object' THEN a.value
           ELSE '{}'::jsonb END
    ) e(key,value)
    WHERE a.path='friends/'||p_uid::text
      AND e.key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND e.value::text IN ('true','"true"')
      AND e.key <> p_uid::text
  ), mutual AS (
    SELECT DISTINCT o.friend_uid::uuid AS friend_id
    FROM own_edges o
    JOIN public.app_data b
      ON b.path='friends/'||o.friend_uid
     AND b.value->>p_uid::text='true'
    JOIN auth.users u ON u.id=p_uid
    JOIN auth.users f ON f.id=o.friend_uid::uuid
  ), directed AS (
    SELECT p_uid AS user_id, friend_id FROM mutual
    UNION ALL
    SELECT friend_id AS user_id, p_uid FROM mutual
  )
  INSERT INTO public.vatra_friends (user_id,friend_id)
  SELECT user_id,friend_id FROM directed
  ON CONFLICT (user_id,friend_id) DO NOTHING;
END
$friend$;

-- 4. ОНОВЛЕННЯ ОДНОГО ШЛЯХУ app_data.
CREATE OR REPLACE FUNCTION public.vatra_v2_sync_path(
  p_path text, p_value jsonb, p_updated_at timestamptz
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' SET row_security = off
AS $sync$
DECLARE
  uid uuid;
  c_parts text[];
  stamp timestamptz := coalesce(p_updated_at,now());
BEGIN
  IF p_path ~* '^publicProfiles/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    uid := split_part(p_path,'/',2)::uuid;
    IF p_value IS NULL OR jsonb_typeof(p_value)='null' THEN
      DELETE FROM public.vatra_users WHERE user_id=uid;
    ELSIF jsonb_typeof(p_value)='object' THEN
      INSERT INTO public.vatra_users(
        user_id,display_name,first_name,last_name,handle,gender,bio,
        avatar_url,cover_url,profile_visibility,searchable,allow_messages,
        public_snapshot,source_updated_at,copied_at
      ) VALUES (
        uid,coalesce(nullif(p_value->>'name',''),'Користувач ВАТРИ'),
        nullif(p_value->>'firstName',''),nullif(p_value->>'lastName',''),
        nullif(p_value->>'handle',''),nullif(p_value->>'gender',''),
        nullif(p_value->>'bio',''),nullif(p_value->>'avatarUrl',''),
        nullif(p_value->>'coverUrl',''),
        CASE WHEN p_value->>'profileVisibility'='private' THEN 'private' ELSE 'public' END,
        p_value->>'searchable' IS DISTINCT FROM 'false',
        p_value->>'allowMessages' IS DISTINCT FROM 'false',
        p_value,stamp,clock_timestamp()
      ) ON CONFLICT (user_id) DO UPDATE SET
        display_name=excluded.display_name, first_name=excluded.first_name,
        last_name=excluded.last_name,handle=excluded.handle,
        gender=excluded.gender,bio=excluded.bio,avatar_url=excluded.avatar_url,
        cover_url=excluded.cover_url,profile_visibility=excluded.profile_visibility,
        searchable=excluded.searchable,allow_messages=excluded.allow_messages,
        public_snapshot=excluded.public_snapshot,
        source_updated_at=excluded.source_updated_at,
        copied_at=excluded.copied_at;
    END IF;

  ELSIF p_path ~* '^privateUsers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    uid := split_part(p_path,'/',2)::uuid;
    IF p_value IS NULL OR jsonb_typeof(p_value)='null' THEN
      DELETE FROM public.vatra_private_profiles WHERE user_id=uid;
    ELSIF jsonb_typeof(p_value)='object' THEN
      INSERT INTO public.vatra_private_profiles(
        user_id,date_of_birth,phone,pending_phone,private_sections,
        record_lists,notification_preferences,private_snapshot,
        source_updated_at,copied_at
      ) VALUES (
        uid,
        CASE WHEN p_value->>'dateOfBirth' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
             THEN (p_value->>'dateOfBirth')::date ELSE NULL END,
        nullif(p_value->>'phone',''),nullif(p_value->>'pendingPhone',''),
        CASE WHEN jsonb_typeof(p_value->'privateSections')='object'
             THEN p_value->'privateSections' ELSE '{}'::jsonb END,
        CASE WHEN jsonb_typeof(p_value->'recordLists')='object'
             THEN p_value->'recordLists' ELSE '{}'::jsonb END,
        CASE WHEN jsonb_typeof(p_value->'notificationPreferences')='object'
             THEN p_value->'notificationPreferences' ELSE '{}'::jsonb END,
        p_value,stamp,clock_timestamp()
      ) ON CONFLICT(user_id) DO UPDATE SET
        date_of_birth=excluded.date_of_birth,phone=excluded.phone,
        pending_phone=excluded.pending_phone,private_sections=excluded.private_sections,
        record_lists=excluded.record_lists,
        notification_preferences=excluded.notification_preferences,
        private_snapshot=excluded.private_snapshot,
        source_updated_at=excluded.source_updated_at,copied_at=excluded.copied_at;
    END IF;

  ELSIF p_path ~* '^friends/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    PERFORM public.vatra_v2_sync_friend_uid(split_part(p_path,'/',2)::uuid);

  ELSIF p_path ~ '^posts/[^/]+$' OR p_path ~ '^groupPosts/[^/]+/[^/]+$' THEN
    DELETE FROM public.vatra_posts WHERE source_path=p_path;
    IF p_value IS NOT NULL AND jsonb_typeof(p_value)='object' THEN
      c_parts:=string_to_array(p_path,'/');
      INSERT INTO public.vatra_posts(
        source_path,post_id,community_id,author_uid,visibility,body,
        payload,source_updated_at
      ) VALUES (
        p_path,c_parts[array_length(c_parts,1)],
        CASE WHEN c_parts[1]='groupPosts' THEN c_parts[2] ELSE NULL END,
        coalesce(p_value->>'authorUid',p_value->>'uid'),
        coalesce(p_value->>'visibility','public'),
        coalesce(p_value->>'text',p_value->>'content'),p_value,stamp
      );
    END IF;

  ELSIF p_path ~ '^groups/[^/]+$' THEN
    DELETE FROM public.vatra_communities WHERE source_path=p_path;
    IF p_value IS NOT NULL AND jsonb_typeof(p_value)='object' THEN
      INSERT INTO public.vatra_communities(
        source_path,community_id,owner_uid,title,visibility,payload,source_updated_at
      ) VALUES (
        p_path,split_part(p_path,'/',2),p_value->>'ownerUid',
        p_value->>'name',coalesce(p_value->>'visibility','public'),p_value,stamp
      );
    END IF;

  ELSIF p_path ~ '^groupMembers/[^/]+/[^/]+$' THEN
    DELETE FROM public.vatra_community_members WHERE source_path=p_path;
    IF p_value IS NOT NULL AND jsonb_typeof(p_value)<>'null'
      AND p_value::text NOT IN ('false','"false"') THEN
      INSERT INTO public.vatra_community_members(
        source_path,community_id,member_uid,role,payload,source_updated_at
      ) VALUES (
        p_path,split_part(p_path,'/',2),split_part(p_path,'/',3),
        CASE WHEN jsonb_typeof(p_value)='object' THEN p_value->>'role' ELSE NULL END,
        p_value,stamp
      );
    END IF;

  ELSIF p_path ~ '^videos/[^/]+$' THEN
    DELETE FROM public.vatra_videos WHERE source_path=p_path;
    IF p_value IS NOT NULL AND jsonb_typeof(p_value)='object' THEN
      INSERT INTO public.vatra_videos(
        source_path,video_id,author_uid,title,payload,source_updated_at
      ) VALUES (
        p_path,split_part(p_path,'/',2),
        p_value->>'authorUid',coalesce(p_value->>'title',p_value->>'caption'),p_value,stamp
      );
    END IF;

  ELSIF p_path ~ '^chats/[^/]+$' THEN
    DELETE FROM public.vatra_chats WHERE source_path=p_path;
    IF p_value IS NOT NULL AND jsonb_typeof(p_value)='object' THEN
      INSERT INTO public.vatra_chats(
        source_path,chat_id,members,payload,source_updated_at
      ) VALUES (
        p_path,split_part(p_path,'/',2),
        CASE WHEN jsonb_typeof(p_value->'members')='object'
             THEN p_value->'members' ELSE '{}'::jsonb END,p_value,stamp
      );
    END IF;

  ELSIF p_path ~ '^chats/[^/]+/messages/[^/]+$' THEN
    DELETE FROM public.vatra_chat_messages WHERE source_path=p_path;
    IF p_value IS NOT NULL AND jsonb_typeof(p_value)='object' THEN
      INSERT INTO public.vatra_chat_messages(
        source_path,chat_id,message_id,sender_uid,is_encrypted,
        payload,source_updated_at
      ) VALUES (
        p_path,split_part(p_path,'/',2),split_part(p_path,'/',4),
        p_value->>'senderUid',p_value ? 'encrypted',p_value,stamp
      );
    END IF;
  ELSIF p_path ~ '^groupConversations/[^/]+$' THEN
    DELETE FROM public.vatra_group_conversations WHERE source_path=p_path;
    IF p_value IS NOT NULL AND jsonb_typeof(p_value)='object' THEN
      INSERT INTO public.vatra_group_conversations(
        source_path,conversation_id,owner_uid,title,members,payload,source_updated_at
      ) VALUES (
        p_path,split_part(p_path,'/',2),p_value->>'ownerUid',p_value->>'title',
        CASE WHEN jsonb_typeof(p_value->'members')='object'
             THEN p_value->'members' ELSE '{}'::jsonb END,p_value,stamp
      );
    END IF;

  ELSIF p_path ~ '^groupMessages/[^/]+(/[^/]+)?$' THEN
    DELETE FROM public.vatra_group_messages WHERE source_path=p_path;
    IF p_value IS NOT NULL AND jsonb_typeof(p_value)='object' THEN
      INSERT INTO public.vatra_group_messages(
        source_path,conversation_id,message_id,payload,source_updated_at
      ) VALUES (
        p_path,split_part(p_path,'/',2),
        CASE WHEN p_path ~ '^groupMessages/[^/]+/[^/]+$'
             THEN split_part(p_path,'/',3) ELSE NULL END,p_value,stamp
      );
    END IF;
  END IF;
END
$sync$;

-- Доступ до внутрішніх функцій синхронізації заборонений клієнтам.
REVOKE ALL ON FUNCTION public.vatra_v2_sync_friend_uid(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vatra_v2_sync_path(text,jsonb,timestamptz)
  FROM PUBLIC, anon, authenticated;

-- Тригер не зупинить основну операцію на сайті через помилку дзеркала.
CREATE OR REPLACE FUNCTION public.vatra_v2_after_app_data()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path='' SET row_security=off
AS $trigger$
DECLARE key_path text;
BEGIN
  key_path:=CASE WHEN TG_OP='DELETE' THEN OLD.path ELSE NEW.path END;
  -- Не витрачаємо запити на дані, які ще не мають v2-дзеркала.
  IF key_path !~* '^(publicProfiles|privateUsers|friends)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND key_path !~ '^((posts|groups|videos|groupConversations)/[^/]+|groupPosts/[^/]+/[^/]+|groupMembers/[^/]+/[^/]+|groupMessages/[^/]+(/[^/]+)?|chats/[^/]+|chats/[^/]+/messages/[^/]+)$' THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  BEGIN
    IF TG_OP='DELETE' THEN
      PERFORM public.vatra_v2_sync_path(OLD.path,NULL,now());
    ELSE
      PERFORM public.vatra_v2_sync_path(NEW.path,NEW.value,NEW.updated_at);
    END IF;
    DELETE FROM public.vatra_v2_sync_errors
    WHERE source_path=key_path;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.vatra_v2_sync_errors(
        source_path,sqlstate,error_message,errors,last_error_at
      ) VALUES(key_path,SQLSTATE,SQLERRM,1,now())
      ON CONFLICT(source_path) DO UPDATE SET
        sqlstate=excluded.sqlstate,error_message=excluded.error_message,
        errors=public.vatra_v2_sync_errors.errors+1,last_error_at=now();
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ВАТРА: не вдалося зафіксувати помилку синхронізації (SQLSTATE=%)',SQLSTATE;
    END;
  END;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$trigger$;
REVOKE ALL ON FUNCTION public.vatra_v2_after_app_data()
  FROM PUBLIC, anon, authenticated;

-- Блокуємо тільки записи app_data під час первинного узгодження.
-- Читання сайту не блокується; запис може коротко зачекати.
LOCK TABLE public.app_data IN SHARE ROW EXCLUSIVE MODE;
DROP TRIGGER IF EXISTS vatra_v2_compat_mirror ON public.app_data;
CREATE TRIGGER vatra_v2_compat_mirror
AFTER INSERT OR UPDATE OR DELETE ON public.app_data
FOR EACH ROW EXECUTE FUNCTION public.vatra_v2_after_app_data();

-- 5. ІНІЦІАЛЬНЕ ПЕРЕНЕСЕННЯ. Невідомі / складені кореневі JSON
-- залишаються у app_data та НЕ видаляються. Для підозрілих форм —
-- окрема міграція; не можна мовчки викидати дані.
DO $backfill$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT path,value,updated_at FROM public.app_data
    WHERE path ~* '^(publicProfiles|privateUsers|friends)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR path ~ '^posts/[^/]+$'
      OR path ~ '^groupPosts/[^/]+/[^/]+$'
      OR path ~ '^groups/[^/]+$'
      OR path ~ '^groupMembers/[^/]+/[^/]+$'
      OR path ~ '^videos/[^/]+$'
      OR path ~ '^chats/[^/]+$'
      OR path ~ '^chats/[^/]+/messages/[^/]+$'
      OR path ~ '^groupConversations/[^/]+$'
      OR path ~ '^groupMessages/[^/]+(/[^/]+)?$'
    ORDER BY CASE WHEN path LIKE 'friends/%' THEN 1 ELSE 0 END,path
  LOOP
    PERFORM public.vatra_v2_sync_path(r.path,r.value,r.updated_at);
  END LOOP;
END
$backfill$;

-- 6. АРХІВУЄМО І ПРИБИРАЄМО ТІЛЬКИ ПУСТІ ТА ДОВЕДЕНО
-- НЕЗАЛЕЖНІ СТАРІ ТАБЛИЦІ СПІЛЬНОТ. Якщо умови не виконані,
-- пропускаємо очищення, нові таблиці залишаються робочими дзеркалами.
CREATE SCHEMA IF NOT EXISTS vatra_archive;
REVOKE ALL ON SCHEMA vatra_archive FROM PUBLIC, anon, authenticated;

DO $legacy$
DECLARE
  old_communities bigint;
  old_members bigint;
  blocked boolean;
BEGIN
  IF to_regclass('public.communities') IS NULL
    OR to_regclass('public.community_members') IS NULL THEN
    RAISE NOTICE 'ВАТРА: старі таблиці спільнот уже відсутні або не повним комплектом';
    RETURN;
  END IF;
  LOCK TABLE public.community_members,public.communities
    IN ACCESS EXCLUSIVE MODE;
  SELECT count(*) INTO old_communities FROM public.communities;
  SELECT count(*) INTO old_members FROM public.community_members;
  IF old_communities<>0 OR old_members<>0 THEN
    RAISE NOTICE 'ВАТРА: старі спільноти не порожні; залишено без змін';
    RETURN;
  END IF;
  -- Перевірка інших таблиць / політик / SQL-функцій та view.
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint f
    WHERE f.contype='f'
      AND f.confrelid IN ('public.communities'::regclass,
                           'public.community_members'::regclass)
      AND f.conrelid NOT IN ('public.communities'::regclass,
                              'public.community_members'::regclass)
    UNION ALL
    SELECT 1 FROM pg_policies pol
    WHERE pol.schemaname='public'
      AND pol.tablename NOT IN ('communities','community_members')
      AND (coalesce(pol.qual,'')||' '||coalesce(pol.with_check,'')) ~*
          '\m(public\.)?(communities|community_members)\M'
    UNION ALL
    SELECT 1 FROM pg_views v
    WHERE v.schemaname='public'
      AND v.definition ~* '\m(public\.)?(communities|community_members)\M'
    UNION ALL
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname NOT IN (
        'vatra_can_join_community',
        'vatra_is_current_community_owner',
        'vatra_is_current_community_member'
      )
      AND p.prosrc ~* '\m(public\.)?(communities|community_members)\M'
  ) INTO blocked;
  IF blocked THEN
    RAISE NOTICE 'ВАТРА: є можливі зовнішні залежності старих спільнот; видалення пропущено';
    RETURN;
  END IF;
  -- Спроба окремою під-транзакцією. Помилка повністю відкотить
  -- тільки очищення; решта міграції завершиться.
  BEGIN
    IF to_regclass('vatra_archive.communities_backup_v2_20261103') IS NULL THEN
      EXECUTE 'CREATE TABLE vatra_archive.communities_backup_v2_20261103 AS SELECT * FROM public.communities';
    END IF;
    IF to_regclass('vatra_archive.community_members_backup_v2_20261103') IS NULL THEN
      EXECUTE 'CREATE TABLE vatra_archive.community_members_backup_v2_20261103 AS SELECT * FROM public.community_members';
    END IF;
    REVOKE ALL ON vatra_archive.communities_backup_v2_20261103
      FROM PUBLIC, anon, authenticated;
    REVOKE ALL ON vatra_archive.community_members_backup_v2_20261103
      FROM PUBLIC, anon, authenticated;
    DROP TABLE public.community_members RESTRICT;
    DROP TABLE public.communities RESTRICT;
    DROP FUNCTION IF EXISTS public.vatra_can_join_community(uuid) RESTRICT;
    DROP FUNCTION IF EXISTS public.vatra_is_current_community_owner(uuid) RESTRICT;
    DROP FUNCTION IF EXISTS public.vatra_is_current_community_member(uuid) RESTRICT;
    RAISE NOTICE 'ВАТРА: порожні старі спільноти архівовано і видалено';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ВАТРА: очищення старих спільнот пропущено через залежність або іншу помилку: %',SQLSTATE;
  END;
END
$legacy$;

-- Легкі описи. Старі profiles/private_profiles навмисно залишено.
COMMENT ON TABLE public.vatra_users IS
 'ВАТРА 2.0 · Публічні профілі; дзеркало app_data/publicProfiles.';
COMMENT ON TABLE public.vatra_private_profiles IS
 'ВАТРА 2.0 · Приватні профілі; тільки адміністратор, не для загального читання.';
COMMENT ON TABLE public.vatra_friends IS
 'ВАТРА 2.0 · Підтверджені двосторонні дружби; дзеркало friends/';
COMMENT ON TABLE public.vatra_posts IS
 'ВАТРА 2.0 · Дописи профілів і спільнот; поки read-only дзеркало app_data.';
COMMENT ON TABLE public.vatra_communities IS
 'ВАТРА 2.0 · Спільноти; дзеркало groups/ з app_data.';
COMMENT ON TABLE public.vatra_community_members IS
 'ВАТРА 2.0 · Членство спільнот; дзеркало groupMembers/ з app_data.';
COMMENT ON TABLE public.vatra_videos IS
 'ВАТРА 2.0 · Відео і кліпи; дзеркало videos/ з app_data.';
COMMENT ON TABLE public.vatra_chats IS
 'ВАТРА 2.0 · Чати; закрите дзеркало включно з шифрованими повідомленнями.';
COMMENT ON TABLE public.vatra_chat_messages IS
 'ВАТРА 2.0 · Окремі рядки повідомлень; ніколи не розшифровує E2EE.';
COMMENT ON TABLE public.vatra_group_conversations IS
 'ВАТРА 2.0 · Групові бесіди, дзеркало groupConversations/ з app_data.';
COMMENT ON TABLE public.vatra_group_messages IS
 'ВАТРА 2.0 · Повідомлення групових бесід, дзеркало groupMessages/ з app_data.';
COMMENT ON TABLE public.vatra_v2_sync_errors IS
 'ВАТРА 2.0 · Закритий журнал помилок дзеркалювання; перевіряти перед переключенням сайту.';

COMMIT;

-- 7. ПІДСУМКОВА ПЕРЕВІРКА: окремий результат із наявністю та кількістю.
SELECT 'vatra_users' AS v2_table,count(*) AS mirrored_rows FROM public.vatra_users
UNION ALL SELECT 'vatra_private_profiles',count(*) FROM public.vatra_private_profiles
UNION ALL SELECT 'vatra_friends',count(*) FROM public.vatra_friends
UNION ALL SELECT 'vatra_posts',count(*) FROM public.vatra_posts
UNION ALL SELECT 'vatra_communities',count(*) FROM public.vatra_communities
UNION ALL SELECT 'vatra_community_members',count(*) FROM public.vatra_community_members
UNION ALL SELECT 'vatra_videos',count(*) FROM public.vatra_videos
UNION ALL SELECT 'vatra_chats',count(*) FROM public.vatra_chats
UNION ALL SELECT 'vatra_chat_messages',count(*) FROM public.vatra_chat_messages
UNION ALL SELECT 'vatra_group_conversations',count(*) FROM public.vatra_group_conversations
UNION ALL SELECT 'vatra_group_messages',count(*) FROM public.vatra_group_messages
UNION ALL SELECT 'vatra_v2_sync_errors',count(*) FROM public.vatra_v2_sync_errors
ORDER BY v2_table;

-- Точні джерела і діючі RPC залишаються у app_data до окремого
-- перевіреного переключення JavaScript/RLS/API. Архів не є full backup.
