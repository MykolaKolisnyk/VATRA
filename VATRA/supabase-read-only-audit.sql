-- ВАТРА: ТІЛЬКИ ДІАГНОСТИКА. НЕ ВИДАЛЯЄ І НЕ ЗМІНЮЄ ЖОДНОЇ ТАБЛИЦІ.
-- Run in Supabase SQL Editor (Production) and inspect the result.
-- Usage counters are cumulative since PostgreSQL's last statistics reset,
-- and zero operations DO NOT prove a table can safely be deleted.
SELECT
  t.relname AS table_name,
  pg_size_pretty(pg_total_relation_size(t.oid)) AS total_size,
  pg_total_relation_size(t.oid) AS total_bytes,
  COALESCE(s.n_live_tup, 0) AS estimated_live_rows,
  COALESCE(s.seq_scan, 0) AS sequential_scans,
  COALESCE(s.idx_scan, 0) AS indexed_scans,
  COALESCE(s.n_tup_ins, 0) AS inserts_since_stats_reset,
  COALESCE(s.n_tup_upd, 0) AS updates_since_stats_reset,
  COALESCE(s.n_tup_del, 0) AS deletes_since_stats_reset,
  t.relrowsecurity AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policy p WHERE p.polrelid = t.oid) AS policy_count,
  (SELECT COUNT(*) FROM pg_constraint c
    WHERE c.contype = 'f' AND (c.conrelid = t.oid OR c.confrelid = t.oid)) AS foreign_key_links
FROM pg_class t
JOIN pg_namespace n ON n.oid = t.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = t.oid
WHERE n.nspname = 'public' AND t.relkind IN ('r', 'p')
ORDER BY pg_total_relation_size(t.oid) DESC, t.relname;

-- Statistics collection point / last reset. Older usage may not be counted.
SELECT datname AS database_name, stats_reset
FROM pg_stat_database
WHERE datname = current_database();

-- Which tables have policies? Missing RLS deserves investigation, not deletion.
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
