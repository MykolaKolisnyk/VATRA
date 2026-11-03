-- ВАТРА · ОЧИЩЕННЯ ДУБЛІКАТІВ І ВПОРЯДКУВАННЯ ТАБЛИЦЬ
-- Дата: 2026-11-03
-- ЦЕ НЕ ПЕРЕПИСУЄ САЙТ. САЙТ ЗАЛИШАЄТЬСЯ НА public.app_data
-- І НА ДІЮЧИХ ТАБЛИЦЯХ ПОДАРУНКІВ, ПІДТРИМКИ, МОДЕРАЦІЇ ТОЩО.
-- Прибирає ТІЛЬКИ дублюючі таблиці з попередньої пробної міграції.
-- Залишає архів у приватній схемі vatra_archive.
-- Якщо перевірки не пройдуть — ВСЯ транзакція відкочується.
-- Без CASCADE. ПЕРЕД ЗАПУСКОМ ПОТРІБНА ПОВНА РЕЗЕРВНА КОПІЯ.
-- Бажано спершу виконати на тестовій копії Supabase.

BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='90s';
SELECT pg_advisory_xact_lock(hashtext('VATRA-20261103-clean-duplicate-mirrors'));
LOCK TABLE public.app_data IN SHARE ROW EXCLUSIVE MODE;

CREATE SCHEMA IF NOT EXISTS vatra_archive;
REVOKE ALL ON SCHEMA vatra_archive FROM PUBLIC, anon, authenticated;

DO $check$
DECLARE
 names text[] := ARRAY[
   'vatra_users','vatra_private_profiles','vatra_friends',
   'vatra_posts','vatra_communities','vatra_community_members',
   'vatra_videos','vatra_chats','vatra_chat_messages',
   'vatra_group_conversations','vatra_group_messages',
   'vatra_v2_sync_errors'
 ];
 mirrors text[] := ARRAY[
   'vatra_posts','vatra_communities','vatra_community_members',
   'vatra_videos','vatra_chats','vatra_chat_messages',
   'vatra_group_conversations','vatra_group_messages'
 ];
 name text;
 count_present integer;
 mismatches bigint;
 error_count bigint;
 dependency text;
 triggers_count bigint;
 policies_count bigint;
BEGIN
 IF to_regclass('public.app_data') IS NULL THEN
   RAISE EXCEPTION 'ВАТРА: робоча app_data не знайдена';
 END IF;

 SELECT count(*) INTO count_present
 FROM unnest(names) t(name)
 WHERE to_regclass('public.'||t.name) IS NOT NULL;
 IF count_present<>array_length(names,1) THEN
   RAISE EXCEPTION
     'ВАТРА: знайдено лише % з % очікуваних дзеркальних таблиць. Очищення зупинено',
     count_present,array_length(names,1);
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.app_data'::regclass
     AND tgname='vatra_v2_compat_mirror' AND NOT tgisinternal
 ) THEN
   RAISE EXCEPTION 'ВАТРА: не знайдено очікуваний тригер синхронізації — структура невідома';
 END IF;

 SELECT count(*) INTO error_count FROM public.vatra_v2_sync_errors;
 IF error_count<>0 THEN
   RAISE EXCEPTION 'ВАТРА: у журналі синхронізації % помилок — спочатку перевірити їх',
     error_count;
 END IF;

 SELECT count(*) INTO mismatches
 FROM public.vatra_users v
 LEFT JOIN public.app_data a
   ON a.path='publicProfiles/'||v.user_id::text
 WHERE a.path IS NULL OR a.value IS DISTINCT FROM v.public_snapshot;
 IF mismatches<>0 THEN
   RAISE EXCEPTION 'ВАТРА: копії публічних профілів відрізняються від джерела (%)',mismatches;
 END IF;

 SELECT count(*) INTO mismatches
 FROM public.vatra_private_profiles v
 LEFT JOIN public.app_data a
   ON a.path='privateUsers/'||v.user_id::text
 WHERE a.path IS NULL OR a.value IS DISTINCT FROM v.private_snapshot;
 IF mismatches<>0 THEN
   RAISE EXCEPTION 'ВАТРА: копії приватних профілів відрізняються від джерела (%)',mismatches;
 END IF;

 -- Друзі: звіряємо обидві сторони лише підтверджених дружб.
 WITH edges AS (
   SELECT split_part(a.path,'/',2)::uuid AS user_id,
     CASE WHEN e.key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       THEN e.key::uuid ELSE NULL END AS friend_id,
     e.value::text IN ('true','"true"') AS confirmed
   FROM public.app_data a
   CROSS JOIN LATERAL jsonb_each(
     CASE WHEN jsonb_typeof(a.value)='object'
       THEN a.value ELSE '{}'::jsonb END
   ) e
   WHERE a.path ~* '^friends/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 ), expected AS (
   SELECT DISTINCT e.user_id,e.friend_id
   FROM edges e JOIN edges r
     ON r.user_id=e.friend_id AND r.friend_id=e.user_id
   JOIN auth.users u ON u.id=e.user_id
   JOIN auth.users f ON f.id=e.friend_id
   WHERE e.confirmed AND r.confirmed AND e.user_id<>e.friend_id
 ), differences AS (
   (SELECT user_id,friend_id FROM expected
    EXCEPT SELECT user_id,friend_id FROM public.vatra_friends)
   UNION ALL
   (SELECT user_id,friend_id FROM public.vatra_friends
    EXCEPT SELECT user_id,friend_id FROM expected)
 )
 SELECT count(*) INTO mismatches FROM differences;
 IF mismatches<>0 THEN
   RAISE EXCEPTION 'ВАТРА: копії друзів не збігаються з підтвердженими дружбами (%)',
     mismatches;
 END IF;

 FOREACH name IN ARRAY mirrors LOOP
   EXECUTE format(
     'SELECT count(*) FROM public.%I v
        LEFT JOIN public.app_data a ON a.path=v.source_path
      WHERE a.path IS NULL OR a.value IS DISTINCT FROM v.payload',name)
     INTO mismatches;
   IF mismatches<>0 THEN
     RAISE EXCEPTION 'ВАТРА: копія % містить % змінених/зайвих записів',
       name,mismatches;
   END IF;
 END LOOP;

 -- Не видаляємо таблиці, які були вже використані іншими функціями,
 -- політиками або тригерами. Додаткові структури блокують RESTRICT.
 SELECT string_agg(p.oid::regprocedure::text,', ')
 INTO dependency
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public'
   AND p.proname NOT IN (
     'vatra_v2_sync_path','vatra_v2_sync_friend_uid','vatra_v2_after_app_data'
   )
   AND EXISTS (
     SELECT 1 FROM unnest(names) z(name)
     WHERE p.prosrc ~* ('\m'||z.name||'\M')
   );
 IF dependency IS NOT NULL THEN
   RAISE EXCEPTION 'ВАТРА: знайдено інші SQL-функції, що згадують дзеркальні таблиці: %',
     dependency;
 END IF;

 FOREACH name IN ARRAY names LOOP
   SELECT count(*) INTO triggers_count
   FROM pg_trigger t
   WHERE t.tgrelid=to_regclass('public.'||name) AND NOT t.tgisinternal;
   SELECT count(*) INTO policies_count
   FROM pg_policy p
   WHERE p.polrelid=to_regclass('public.'||name);
   IF triggers_count<>0 OR policies_count<>0 THEN
     RAISE EXCEPTION 'ВАТРА: для % існують додаткові тригери (%) або політики (%)',
       name,triggers_count,policies_count;
   END IF;

   IF to_regclass('vatra_archive.retired_20261103_'||name) IS NOT NULL THEN
     RAISE EXCEPTION 'ВАТРА: архів для % уже існує. Не перезаписуємо',name;
   END IF;
 END LOOP;

 -- Після ВСІХ перевірок архівуємо поточні записи в приватну схему.
 FOREACH name IN ARRAY names LOOP
   EXECUTE format(
     'CREATE TABLE vatra_archive.%I AS SELECT * FROM public.%I',
     'retired_20261103_'||name,name
   );
   EXECUTE format(
     'REVOKE ALL ON TABLE vatra_archive.%I FROM PUBLIC, anon, authenticated',
     'retired_20261103_'||name
   );
 END LOOP;
END
$check$;

-- Прибираємо лише наш механізм копіювання, а не чинні тригери ВАТРИ.
DROP TRIGGER IF EXISTS vatra_v2_compat_mirror ON public.app_data;
DROP FUNCTION IF EXISTS public.vatra_v2_after_app_data() RESTRICT;
DROP FUNCTION IF EXISTS public.vatra_v2_sync_path(text,jsonb,timestamptz) RESTRICT;
DROP FUNCTION IF EXISTS public.vatra_v2_sync_friend_uid(uuid) RESTRICT;

-- Видалення дублікатів. Кожен DROP із RESTRICT:
-- незнайома залежність зупинить і відкотить ВСЮ транзакцію.
DO $remove$
DECLARE name text;
BEGIN
 FOREACH name IN ARRAY ARRAY[
   'vatra_chat_messages','vatra_group_messages',
   'vatra_group_conversations','vatra_chats',
   'vatra_videos','vatra_community_members','vatra_communities',
   'vatra_posts','vatra_friends','vatra_private_profiles',
   'vatra_users','vatra_v2_sync_errors'
 ] LOOP
   EXECUTE format('DROP TABLE public.%I RESTRICT',name);
 END LOOP;
END
$remove$;

-- Класифікуємо тільки чинні таблиці через PostgreSQL-коментарі.
-- Це не змінює їхні імена, дані, API чи фізичне розташування.
DO $organize$
DECLARE r record; old_comment text; id oid;
BEGIN
 FOR r IN
   SELECT * FROM (VALUES
     ('01 · Ядро','app_data','Головне робоче сховище сайту'),
     ('02 · Акаунти','profiles','Профілі, стара структурована таблиця: зберегти до аудиту'),
     ('02 · Акаунти','private_profiles','Особисті дані: не видаляти без перевірки'),
     ('02 · Акаунти','vatra_account_lifecycle','Життєвий цикл акаунтів'),
     ('02 · Акаунти','vatra_account_tombstones','Позначки видалення акаунтів'),
     ('03 · Спільноти','communities','Стара таблиця спільнот: перевірити залежності'),
     ('03 · Спільноти','community_members','Старі учасники спільнот: перевірити залежності'),
     ('03 · Дописи','vatra_scheduled_posts','Заплановані публікації'),
     ('04 · Подарунки','vatra_gift_catalog','Каталог подарунків'),
     ('04 · Подарунки','vatra_gift_instances','Видані подарунки'),
     ('04 · Подарунки','vatra_gift_claims','Отримання подарунків'),
     ('04 · Подарунки','vatra_gift_preferences','Налаштування видимості подарунків'),
     ('04 · Подарунки','vatra_gift_orders','Замовлення подарунків'),
     ('04 · Подарунки','vatra_gift_audit','Історія дій з подарунками'),
     ('05 · Реклама','vatra_promotions','Просування дописів'),
     ('06 · Модерація','vatra_moderation_cases','Скарги'),
     ('06 · Модерація','vatra_moderation_account_bans','Блокування акаунтів'),
     ('06 · Модерація','vatra_moderation_group_bans','Блокування спільнот'),
     ('06 · Модерація','vatra_moderation_hidden_content','Приховані матеріали'),
     ('06 · Модерація','vatra_moderation_audit','Журнал модерації'),
     ('07 · Команда','vatra_staff_members','Учасники команди ВАТРИ'),
     ('07 · Команда','vatra_network_owners','Власники платформи'),
     ('07 · Команда','vatra_verification_admins','Адміністратори перевірок'),
     ('07 · Команда','vatra_verification_requests','Заявки на верифікацію'),
     ('07 · Команда','vatra_verified_groups','Підтверджені спільноти'),
     ('07 · Команда','vatra_verified_notices','Системні повідомлення верифікації'),
     ('08 · Підтримка','vatra_support_tickets','Звернення до техпідтримки'),
     ('08 · Підтримка','vatra_support_messages','Повідомлення техпідтримки'),
     ('08 · Підтримка','vatra_support_alerts','Сповіщення техпідтримки'),
     ('09 · Система','vatra_otp_codes','Одноразові коди'),
     ('09 · Система','vatra_request_buckets','Захист від надмірної кількості запитів')
   ) AS info(section,table_name,purpose)
 LOOP
   SELECT c.oid,obj_description(c.oid,'pg_class') INTO id,old_comment
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname=r.table_name
     AND c.relkind IN ('r','p');

   IF id IS NOT NULL
     AND (old_comment IS NULL OR left(old_comment,8)='ВАТРА | ')
   THEN
     EXECUTE format('COMMENT ON TABLE public.%I IS %L',
       r.table_name,'ВАТРА | '||r.section||' | '||r.purpose);
   END IF;
 END LOOP;
END
$organize$;
COMMIT;

-- Перевірка після виконання (тільки читання).
SELECT
 to_regclass('public.app_data') IS NOT NULL AS live_site_storage_preserved,
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND c.relname IN ('vatra_users','vatra_private_profiles','vatra_friends',
       'vatra_posts','vatra_communities','vatra_community_members',
       'vatra_videos','vatra_chats','vatra_chat_messages',
       'vatra_group_conversations','vatra_group_messages',
       'vatra_v2_sync_errors')
 ) AS remaining_duplicate_tables,
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='vatra_archive'
      AND c.relname LIKE 'retired_20261103_%'
 ) AS archived_table_copies;
