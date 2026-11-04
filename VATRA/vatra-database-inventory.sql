-- ВАТРА: звіт про логічну структуру бази (READ ONLY).
-- Категорії наведено за призначенням; на картках Schema Visualizer
-- їх не можна автоматично розставити чи створити папки одним SQL.
-- estimated_rows приблизні, не точний COUNT(*).
WITH mapping(group_code, group_name, table_name, purpose, lifecycle) AS (
  VALUES
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
), tables AS (
  SELECT n.nspname schema_name, c.relname table_name, c.oid relation_id,
    c.relrowsecurity AS rls_enabled,
    COALESCE(st.n_live_tup,0) AS estimated_rows,
    pg_total_relation_size(c.oid) AS bytes_total,
    obj_description(c.oid,'pg_class') AS table_comment
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  LEFT JOIN pg_stat_user_tables st ON st.relid=c.oid
  WHERE n.nspname IN ('public','vatra_archive')
    AND c.relkind IN ('r','p')
)
SELECT
  CASE WHEN t.schema_name='vatra_archive' THEN '98 · Архів'
    WHEN m.group_code IS NULL THEN '99 · Інші'
    ELSE m.group_code||' · '||m.group_name END AS section,
  t.schema_name||'.'||t.table_name AS table_name,
  COALESCE(m.purpose,'Не класифіковано') AS purpose,
  COALESCE(m.lifecycle,CASE WHEN t.schema_name='vatra_archive'
    THEN 'АРХІВ' ELSE 'ПЕРЕВІРИТИ' END) AS status,
  t.estimated_rows,
  pg_size_pretty(t.bytes_total) AS size,
  (SELECT count(*) FROM pg_constraint f
    WHERE f.contype='f'
      AND (f.conrelid=t.relation_id OR f.confrelid=t.relation_id)
  ) AS foreign_key_links,
  t.rls_enabled,
  t.table_comment
FROM tables t
LEFT JOIN mapping m ON m.table_name=t.table_name
 AND t.schema_name='public'
ORDER BY CASE WHEN t.schema_name='vatra_archive' THEN '98'
    ELSE COALESCE(m.group_code,'99') END, t.table_name;
