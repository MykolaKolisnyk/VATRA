-- ВАТРА: впорядкування назв і описів у каталозі PostgreSQL.
-- Не видаляє, не переносить, не перейменовує таблиці.
-- Не змінює жодного запису, RLS, ролі, ключі або тригери.
-- Залишає сторонні наявні коментарі без змін.
-- Запускати в Supabase SQL Editor.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $vatra$
DECLARE r record; rel_oid oid; old_note text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
    ('01', 'Головне сховище', 'app_data', 'Канонічне сховище даних поточної версії сайту', 'НЕ ВИДАЛЯТИ'),
    ('02', 'Акаунти та друзі', 'profiles', 'Старі профілі з даними та зовнішніми зв''язками', 'ЗБЕРЕГТИ'),
    ('02', 'Акаунти та друзі', 'private_profiles', 'Старі приватні профілі з персональними даними', 'ЗБЕРЕГТИ'),
    ('02', 'Акаунти та друзі', 'vatra_account_lifecycle', 'Життєвий цикл акаунта та відкладене видалення', 'ЗБЕРЕГТИ'),
    ('02', 'Акаунти та друзі', 'vatra_account_tombstones', 'Позначки видалених акаунтів', 'ЗБЕРЕГТИ'),
    ('03', 'Спільноти та контент', 'vatra_scheduled_posts', 'Публікації за розкладом та статус доставки', 'ЗБЕРЕГТИ'),
    ('04', 'Подарунки та реклама', 'vatra_gift_catalog', 'Каталог подарунків', 'ЗБЕРЕГТИ'),
    ('04', 'Подарунки та реклама', 'vatra_gift_instances', 'Видані подарунки', 'ЗБЕРЕГТИ'),
    ('04', 'Подарунки та реклама', 'vatra_gift_claims', 'Отримання подарунків', 'ЗБЕРЕГТИ'),
    ('04', 'Подарунки та реклама', 'vatra_gift_orders', 'Замовлення подарунків', 'ЗБЕРЕГТИ'),
    ('04', 'Подарунки та реклама', 'vatra_gift_preferences', 'Видимість подарунків', 'ЗБЕРЕГТИ'),
    ('04', 'Подарунки та реклама', 'vatra_gift_audit', 'Історія дій із подарунками', 'ЗБЕРЕГТИ'),
    ('04', 'Подарунки та реклама', 'vatra_promotions', 'Заявки на просування та підтверджені розміщення', 'ЗБЕРЕГТИ'),
    ('05', 'Безпека та верифікація', 'vatra_moderation_cases', 'Скарги та рішення модерації', 'ЗБЕРЕГТИ'),
    ('05', 'Безпека та верифікація', 'vatra_moderation_account_bans', 'Блокування акаунтів', 'ЗБЕРЕГТИ'),
    ('05', 'Безпека та верифікація', 'vatra_moderation_group_bans', 'Обмеження спільнот', 'ЗБЕРЕГТИ'),
    ('05', 'Безпека та верифікація', 'vatra_moderation_audit', 'Журнал дій модераторів', 'ЗБЕРЕГТИ'),
    ('05', 'Безпека та верифікація', 'vatra_moderation_hidden_content', 'Приховані матеріали', 'ЗБЕРЕГТИ'),
    ('05', 'Безпека та верифікація', 'vatra_verification_admins', 'Адміністратори підтвердження акаунтів', 'ЗБЕРЕГТИ'),
    ('05', 'Безпека та верифікація', 'vatra_verification_requests', 'Заявки на підтвердження', 'ЗБЕРЕГТИ'),
    ('05', 'Безпека та верифікація', 'vatra_verified_groups', 'Перевірені спільноти', 'ЗБЕРЕГТИ'),
    ('05', 'Безпека та верифікація', 'vatra_verified_notices', 'Сповіщення верифікації', 'ЗБЕРЕГТИ'),
    ('05', 'Безпека та верифікація', 'vatra_network_owners', 'Власники мережі', 'ЗБЕРЕГТИ'),
    ('05', 'Безпека та верифікація', 'vatra_staff_members', 'Співробітники та їхні ролі', 'ЗБЕРЕГТИ'),
    ('06', 'Техпідтримка', 'vatra_support_tickets', 'Звернення до техпідтримки', 'ЗБЕРЕГТИ'),
    ('06', 'Техпідтримка', 'vatra_support_messages', 'Повідомлення техпідтримки', 'ЗБЕРЕГТИ'),
    ('06', 'Техпідтримка', 'vatra_support_alerts', 'Сповіщення техпідтримки', 'ЗБЕРЕГТИ'),
    ('07', 'Інфраструктура', 'vatra_otp_codes', 'Захищені коди підтвердження', 'ЗБЕРЕГТИ'),
    ('07', 'Інфраструктура', 'vatra_request_buckets', 'Ліміти запитів та захист від спаму', 'ЗБЕРЕГТИ')
    ) AS mapping(group_code, group_name, table_name, purpose, lifecycle)
  LOOP
    SELECT c.oid, obj_description(c.oid, 'pg_class')
      INTO rel_oid, old_note
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=r.table_name
      AND c.relkind IN ('r','p');
    IF rel_oid IS NULL THEN
      RAISE NOTICE 'ВАТРА: таблицю public.% пропущено, її немає', r.table_name;
      CONTINUE;
    END IF;
    IF old_note IS NULL OR left(old_note, 8)='ВАТРА | ' THEN
      EXECUTE format('COMMENT ON TABLE public.%I IS %L',
        r.table_name,
        'ВАТРА | '||r.group_code||' · '||r.group_name||
        ' | '||r.purpose||' | '||r.lifecycle);
    ELSE
      RAISE NOTICE 'ВАТРА: попередній опис % збережений', r.table_name;
    END IF;
  END LOOP;
END $vatra$;
COMMIT;
-- Каталог із логічними групами: vatra-database-inventory.sql
