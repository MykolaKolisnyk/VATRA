# VATRA database performance review — 2026-11-25

## Scope and safety

Read-only inspection of the shared VATRA PostgreSQL 17.12 database. No production DDL, data modifications, cache configuration changes, or Realtime publication changes were made. This is a review plan, not an automatically applied migration. Test in an isolated staging database with authenticated owner, non-owner, moderator, blocked and restricted-account fixtures before scheduling production deployment.

## Observations

- Performance advisor: 2 multiple-permissive-policy warnings, 24 unused-index informational findings. No equivalent index pairs found using matching access method, indexed attributes, opclasses, collations, options, predicates and expressions.
- The database is young and small. Do not drop indexes solely on the basis of current zero scan counts, particularly foreign-key and integrity-supporting indexes.
- Feed, friendship and unread notification indexes already show substantial use. No broad additional indexes justified yet.
- Historical pg_stat_statements snapshot: Realtime publication subscription queries 603 calls / 101.60 s and 648 calls / 68.98 s; admin access RPC 1,236 calls / 25.20 s; search_site 23 calls / 12.00 s (521.719 ms mean). These are cumulative SQL statistics, not end-user latency. Do not reset counters or change publication membership just to improve these numbers.

## Search candidate

The accompanying search-site.sql separates exact numeric VATRA ID lookups from name/status pattern matching and compares the bigint column without converting it to text. Numeric overflow is guarded before the bigint cast, preserving out-of-range exact-ID behavior. The seven result categories, wildcard escaping, existing filters, limits, SECURITY INVOKER and grants remain unchanged.

Read-only validation: 10 parsing cases passed, and the complete proposed SELECT returned equal JSONB to the existing function in 11 synthetic-input comparisons. These comparisons used the SQL administrative context, not an authenticated role fixture. Both simple EXPLAIN probes currently choose sequential scans on the tiny profiles table; index eligibility is a scaling improvement, not demonstrated latency gain.

## RLS consolidation candidates (not applied)

PostgreSQL combines permissive policies for the same role and operation with OR, while restrictive policies remain AND conditions. The following is a proposed staging-only change based on the observed policy definitions. Verify the definitions have not changed before applying. Use a transaction with a short lock_timeout; preserve all other policies and triggers.

```sql
begin;
set local lock_timeout = '2s';

alter policy vatra_friends_read_accepted_or_own on public.friendships
using (
  exists (
    select 1 from public.accounts a
    where a.user_id = (select auth.uid())
      and a.vatra_id = any(array[friendships.requester_id, friendships.recipient_id])
  )
  or (
    status = 'accepted'
    and not exists (
      select 1 from public.profile_preferences p
      where p.vatra_id = any(array[friendships.requester_id, friendships.recipient_id])
        and p.profile_visibility <> 'public'
    )
  )
);
drop policy vatra_friends_read_public_accepted on public.friendships;

alter policy vatra_market_update on public.marketplace_listings
using (
  seller_id = (select auth.uid())
  or (select vatra_market_private.is_moderator())
)
with check (
  seller_id = (select auth.uid())
  or (select vatra_market_private.is_moderator())
);
drop policy market_moderator_update on public.marketplace_listings;

-- Review only: rollback by default. Generate a reviewed migration separately.
rollback;
```

Truth-table verification: 729 combinations of TRUE/FALSE/NULL across permissive and restrictive predicates, zero mismatches for SELECT and UPDATE acceptance. This is logical equivalence, not a substitute for database integration tests. Keep `block_hide_friendships`, `vatra_admin_active_account`, existing SELECT/INSERT/DELETE policies and marketplace moderation triggers unchanged. Do not introduce new grants or SECURITY DEFINER functions.

## Release checklist

1. Generate a migration with Supabase CLI against staging, retain original policy/function definitions as rollback, verify staging migration history.
2. Run authenticated access tests with both own and other accounts, pending/public/private friendships, block and suspension cases, seller and moderator old/new row updates. Compare complete search results under the same roles.
3. Run advisors before/after and compare EXPLAIN (ANALYZE, BUFFERS) only for safe SELECT operations on staging; capture workload and elapsed time before claiming speedups.
4. Deploy only after review of the shared VATRA/VATRA-BETA database impact. Re-run advisors and monitor latency. Keep existing indexes and Redis/Storage settings until evidence supports a targeted change.
