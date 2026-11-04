-- ВАТРА · безпечне прибирання порожніх застарілих таблиць спільнот.
-- 2026-11-03 · одна транзакція без втрати даних.
--
-- Поточний сайт працює через public.app_data (groups/, groupMembers/).
-- public.communities і public.community_members НЕ використовуються
-- актуальним JS-кодом VATRA, але старі SQL-функції та RLS-політики
-- досі пов'язані з ними.
--
-- Ця міграція:
--  * перевіряє, що обидві таблиці абсолютно порожні й не змінені;
--  * переносить оригінальні таблиці з усією структурою до vatra_archive;
--  * прибирає тільки старі політики, тригер і 4 пов'язані функції;
--  * не змінює app_data, profiles, private_profiles і жодного акаунта;
--  * використовує RESTRICT: невідомі зовнішні залежності зупинять
--    транзакцію, всі дії відкочуються.
--
-- Архівні таблиці залишаються з RLS увімкненим і без клієнтських
-- прав та політик. Їх можна повернути окремою міграцією.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(hashtext('vatra_retire_empty_legacy_community_tables_20261103'));

DO $preflight$
DECLARE
  community_total bigint;
  member_total bigint;
BEGIN
  IF to_regclass('public.app_data') IS NULL
    OR to_regclass('public.profiles') IS NULL
    OR to_regclass('public.private_profiles') IS NULL THEN
    RAISE EXCEPTION 'VATRA: головні сховища або профілі не знайдено, міграцію скасовано';
  END IF;

  IF to_regclass('public.communities') IS NULL
    OR to_regclass('public.community_members') IS NULL THEN
    RAISE EXCEPTION 'VATRA: обидві старі таблиці мають існувати до перенесення';
  END IF;

  IF to_regclass('vatra_archive.communities') IS NOT NULL
    OR to_regclass('vatra_archive.community_members') IS NOT NULL THEN
    RAISE EXCEPTION 'VATRA: архівні таблиці з такими назвами вже існують';
  END IF;

  LOCK TABLE public.community_members, public.communities IN ACCESS EXCLUSIVE MODE;

  SELECT count(*) INTO community_total FROM public.communities;
  SELECT count(*) INTO member_total FROM public.community_members;
  IF community_total <> 0 OR member_total <> 0 THEN
    RAISE EXCEPTION 'VATRA: старі таблиці не порожні: communities=%, community_members=%',
       community_total, member_total;
  END IF;

  -- Не торкаємось таблиць, якщо хтось додав інші політики.
  IF EXISTS (
    SELECT 1
    FROM pg_policy p
    WHERE (p.polrelid='public.communities'::regclass
           AND p.polname NOT IN (
             'communities_delete','communities_insert',
             'communities_read','communities_update'))
       OR (p.polrelid='public.community_members'::regclass
           AND p.polname NOT IN (
             'community_members_delete','community_members_insert',
             'community_members_owner_update','community_members_read'))
  ) THEN
    RAISE EXCEPTION 'VATRA: знайдено невідому RLS-політику на старих таблицях';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid IN (
      'public.communities'::regclass,
      'public.community_members'::regclass
    ) AND NOT t.tgisinternal
      AND t.tgname <> 'protect_community_membership_fields_trigger'
  ) THEN
    RAISE EXCEPTION 'VATRA: знайдено невідомий тригер на старих таблицях';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.contype='f'
      AND c.confrelid IN (
        'public.communities'::regclass,
        'public.community_members'::regclass
      )
      AND c.conrelid NOT IN (
        'public.communities'::regclass,
        'public.community_members'::regclass
      )
  ) THEN
    RAISE EXCEPTION 'VATRA: на старі таблиці посилаються інші таблиці';
  END IF;
END
$preflight$;

-- Політики належали тільки застарілому модулю спільнот.
DROP POLICY IF EXISTS communities_delete ON public.communities;
DROP POLICY IF EXISTS communities_insert ON public.communities;
DROP POLICY IF EXISTS communities_read ON public.communities;
DROP POLICY IF EXISTS communities_update ON public.communities;

DROP POLICY IF EXISTS community_members_delete ON public.community_members;
DROP POLICY IF EXISTS community_members_insert ON public.community_members;
DROP POLICY IF EXISTS community_members_owner_update ON public.community_members;
DROP POLICY IF EXISTS community_members_read ON public.community_members;

DROP TRIGGER IF EXISTS protect_community_membership_fields_trigger
  ON public.community_members;

-- Переміщуємо ОРИГІНАЛЬНІ таблиці, не копії. Збережено колонки,
-- індекси, ключі та увімкнений RLS.
ALTER TABLE public.community_members SET SCHEMA vatra_archive;
ALTER TABLE public.communities SET SCHEMA vatra_archive;

-- Застарілі функції більше не потрібні.
-- RESTRICT відмовиться видалити їх, якщо раптом є інші залежності.
DROP FUNCTION IF EXISTS public.vatra_can_join_community(uuid) RESTRICT;
DROP FUNCTION IF EXISTS public.vatra_is_current_community_member(uuid) RESTRICT;
DROP FUNCTION IF EXISTS public.vatra_is_current_community_owner(uuid) RESTRICT;
DROP FUNCTION IF EXISTS public.protect_community_membership_fields() RESTRICT;

-- Архів не доступний клієнтам; RLS зберігається.
REVOKE ALL ON TABLE vatra_archive.communities FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE vatra_archive.community_members FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE vatra_archive.communities IS
 'ВАТРА | АРХІВ | Порожня застаріла таблиця спільнот. Живі спільноти містяться в public.app_data.';
COMMENT ON TABLE vatra_archive.community_members IS
 'ВАТРА | АРХІВ | Порожня застаріла таблиця учасників. Живе членство міститься в public.app_data.';

COMMIT;

-- Підтвердження: обидві старі таблиці більше не захаращують public.
SELECT
  to_regclass('public.app_data') IS NOT NULL AS active_site_data_preserved,
  to_regclass('public.profiles') IS NOT NULL AS registration_profiles_preserved,
  to_regclass('public.private_profiles') IS NOT NULL AS private_profiles_preserved,
  to_regclass('public.communities') IS NULL AS old_communities_removed_from_public,
  to_regclass('public.community_members') IS NULL AS old_members_removed_from_public,
  to_regclass('vatra_archive.communities') IS NOT NULL AS communities_archived,
  to_regclass('vatra_archive.community_members') IS NOT NULL AS members_archived;
