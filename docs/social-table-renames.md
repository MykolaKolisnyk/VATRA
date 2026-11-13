# VATRA — physical social table renames (2026-11-13)

> **Current state — 13 November 2026:** All 27 physical public tables are named without the old `vatra_` prefix. The 21 legacy `vatra_` compatibility views were removed (migration `20261113195057`) after dependency checks; the historical migration notes below describe earlier states. Four new Storage buckets — `avatars`, `covers`, `post-images`, `videos` — were created with matching limits and privacy plus 10 mirrored RLS policies (migration `20261113195123`). New browser code uses these IDs. Old Storage buckets and their existing files remain available for planned cleanup; files were **not** copied automatically. Storage files must only be removed using Supabase Storage API or Dashboard, never directly through SQL.


Migration `20261113175644_rename_fourteen_social_tables_with_rls_compatibility.sql`
has already been applied to the Supabase database. This is **not** a
data-copy migration; PostgreSQL keeps the physical relation identities,
rows, indexes, foreign keys, grants, RLS policies, and table triggers.

| Previously physical | Physical table now |
|---|---|
| `vatra_avatar_comment_likes` | `avatar_comment_likes` |
| `vatra_avatar_comments` | `avatar_comments` |
| `vatra_avatar_likes` | `avatar_likes` |
| `vatra_blocks` | `member_blocks` |
| `vatra_community_follows` | `community_follows` |
| `vatra_community_posts` | `community_posts` |
| `vatra_direct_messages` | `direct_messages` |
| `vatra_friendships` | `friendships` |
| `vatra_post_comment_likes` | `post_comment_likes` |
| `vatra_post_comments` | `post_comments` |
| `vatra_post_likes` | `post_likes` |
| `vatra_profile_media` | `profile_media` |
| `vatra_public_profiles` | `public_profiles` |
| `vatra_stories` | `stories` |

All 14 former names are still simple, automatically updatable views
created with `security_invoker=true`; each gets exactly the operations
(SELECT, INSERT, UPDATE, DELETE) previously granted to `authenticated`.
The underlying RLS rules continue to restrict owners, blocks and visibility.
No `anon` permissions were added.

Nine PostgreSQL SQL / PLpgSQL functions were changed in the same transaction,
including notification trigger routing via `TG_TABLE_NAME`. A database
inspection confirmed all 14 real tables have `relrowsecurity=true`, old
aliases have `security_invoker=true`, and no tracked function definition
still references an old physical table.

The browser now uses the physical new names in feed, profile, clubs, friends,
notifications, comments, likes, messaging and story code. Existing sessions
with old scripts may use the legacy view paths until refreshed; realtime
subscriptions on previous physical table names may need a page refresh.

## Completed final two physical profile table renames

Migration `20261113180825_rename_last_two_profile_upsert_tables.sql` physically
renamed `vatra_profile_details` to `profile_details` and
`vatra_profile_preferences` to `profile_preferences`. Both preserve their
unique keys, ownership RLS, grants and data. Old names are RLS-invoker legacy
views with original permissions, but clients using PostgREST `upsert` must
now use the new physical names. The profile editor and browser mocks were
updated. SQL transaction smoke tests verified authenticated `INSERT ...
ON CONFLICT DO UPDATE` on both new tables and were rolled back.

**All 27 physical public tables are now named without `vatra_`.** A direct
PostgreSQL catalog check returned 0 remaining physical `vatra_*` tables,
27/27 protected by RLS and 21 read-compatible legacy views.

Storage bucket names are unchanged pending storage migration, and historical
SQL migration filenames and legacy RPC/function names may still use VATRA
branding; this migration concerns **physical table names**, not every string
containing the word VATRA.

The earlier compatibility views were subsequently removed using explicit
`DROP VIEW ... RESTRICT` after checking database dependencies. New clients
use physical tables; stale cached clients using former view paths require a
refresh.
