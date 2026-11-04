-- ВАТРА · АУДИТ СТАРИХ ТАБЛИЦЬ БЕЗ ЗМІН БАЗИ
-- 2026-11-03 · READ ONLY
-- Виконати в Supabase SQL Editor. Один результат: таблиці та можливі
-- залежності. Нуль записів сам по собі НЕ означає, що таблиця зайва.
-- Не видаляє таблиць, даних, політик, функцій, тригерів.

WITH targets(tablename,purpose) AS (
  VALUES
   ('app_data','Головне активне сховище. Не видаляти'),
   ('profiles','Старі публічні профілі; перевірити записи та FK'),
   ('private_profiles','Старі приватні профілі; персональні дані'),
   ('communities','Старі спільноти; можуть використовуватися RLS-функціями'),
   ('community_members','Старе членство спільнот; можуть використовуватися RLS-функціями')
), rels AS (
  SELECT t.tablename,t.purpose,c.oid AS relid,c.relrowsecurity AS rls_enabled,
    coalesce(st.n_live_tup,0)::bigint AS approx_rows,
    CASE WHEN c.oid IS NULL THEN NULL ELSE pg_size_pretty(pg_total_relation_size(c.oid)) END AS table_size
  FROM targets t
  LEFT JOIN pg_namespace n ON n.nspname='public'
  LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=t.tablename
       AND c.relkind IN ('r','p')
  LEFT JOIN pg_stat_user_tables st ON st.relid=c.oid
)
SELECT
 r.tablename AS table_name,
 CASE WHEN r.relid IS NULL THEN 'НЕ ІСНУЄ' ELSE 'ІСНУЄ' END AS table_status,
 r.purpose,
 r.approx_rows,
 r.table_size,
 r.rls_enabled,
 (SELECT count(*) FROM pg_constraint f
   WHERE f.contype='f' AND f.confrelid=r.relid AND f.conrelid<>r.relid) AS inbound_fk,
 (SELECT count(*) FROM pg_constraint f
   WHERE f.contype='f' AND f.conrelid=r.relid) AS outbound_fk,
 (SELECT count(*) FROM pg_trigger tr
   WHERE tr.tgrelid=r.relid AND NOT tr.tgisinternal) AS custom_triggers,
 (SELECT count(*) FROM pg_policy pol WHERE pol.polrelid=r.relid) AS own_rls_policies,
 (SELECT count(*) FROM pg_proc fn
   JOIN pg_namespace n ON n.oid=fn.pronamespace
   WHERE n.nspname NOT IN ('pg_catalog','information_schema')
     AND fn.prosrc ~* ('\m' || r.tablename || '\M')) AS function_text_mentions,
 (SELECT coalesce(jsonb_agg(
    jsonb_build_object('function', fn.oid::regprocedure::text, 'schema', n.nspname)
    ORDER BY n.nspname, fn.proname), '[]'::jsonb)
   FROM pg_proc fn JOIN pg_namespace n ON n.oid=fn.pronamespace
   WHERE n.nspname NOT IN ('pg_catalog','information_schema')
     AND fn.prosrc ~* ('\m' || r.tablename || '\M')) AS functions_that_mention_table,
 (SELECT count(*) FROM pg_views v
   WHERE v.definition ~* ('\m' || r.tablename || '\M')) AS view_text_mentions,
 (SELECT count(*) FROM pg_policies pol
   WHERE pol.schemaname <> 'information_schema'
     AND (coalesce(pol.qual,'') || ' ' || coalesce(pol.with_check,''))
      ~* ('\m' || r.tablename || '\M')) AS policy_text_mentions,
 (SELECT coalesce(jsonb_agg(
    jsonb_build_object('from_table', n.nspname||'.'||c.relname,
      'constraint', f.conname) ORDER BY f.conname), '[]'::jsonb)
   FROM pg_constraint f
   JOIN pg_class c ON c.oid=f.conrelid
   JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE f.contype='f' AND f.confrelid=r.relid
     AND f.conrelid<>r.relid) AS inbound_fk_details
FROM rels r
ORDER BY CASE r.tablename
  WHEN 'app_data' THEN 0
  WHEN 'profiles' THEN 1
  WHEN 'private_profiles' THEN 2
  WHEN 'communities' THEN 3
  ELSE 4 END;
