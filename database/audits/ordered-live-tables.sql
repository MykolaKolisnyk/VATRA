-- Read-only каталог таблиць ВАТРА в логічному порядку.
WITH ranked AS (
 SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled,
        coalesce(s.n_live_tup,0)::bigint AS approximate_rows,
        obj_description(c.oid,'pg_class') AS description,
        CASE
         WHEN c.relname='app_data' THEN 1
         WHEN c.relname IN ('profiles','private_profiles') OR c.relname LIKE 'vatra_account_%' THEN 2
         WHEN c.relname LIKE 'vatra_scheduled_%' THEN 3
         WHEN c.relname LIKE 'vatra_gift_%' THEN 4
         WHEN c.relname LIKE 'vatra_promotion%' THEN 5
         WHEN c.relname LIKE 'vatra_moderation_%' THEN 6
         WHEN c.relname LIKE 'vatra_staff_%' OR c.relname LIKE 'vatra_network_%'
           OR c.relname LIKE 'vatra_verification_%' OR c.relname LIKE 'vatra_verified_%' THEN 7
         WHEN c.relname LIKE 'vatra_support_%' THEN 8
         ELSE 9 END AS section_number
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 LEFT JOIN pg_stat_user_tables s ON s.relid=c.oid
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
)
SELECT section_number,
 CASE section_number
  WHEN 1 THEN 'Ядро'
  WHEN 2 THEN 'Акаунти'
  WHEN 3 THEN 'Дописи'
  WHEN 4 THEN 'Подарунки'
  WHEN 5 THEN 'Реклама'
  WHEN 6 THEN 'Модерація'
  WHEN 7 THEN 'Команда та верифікація'
  WHEN 8 THEN 'Підтримка'
  ELSE 'Система'
 END AS section,table_name,approximate_rows,rls_enabled,description
FROM ranked ORDER BY section_number,table_name;
