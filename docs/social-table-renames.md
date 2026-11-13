# VATRA — physical social table renames (2026-11-13)

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

## Still pending

The **only two physical public tables retaining a `vatra_` prefix** are
`vatra_profile_details` and `vatra_profile_preferences`. These use client
PostgREST `upsert(...,{onConflict:...})` calls, which cannot simply be routed
through an updatable view with the same conflict target. Switch the deployed
browser code to new physical tables before renaming these last two.

Storage bucket names are unchanged pending storage migration, and historical
SQL migration filenames and legacy RPC/function names may still use VATRA
branding; this migration concerns **physical table names**, not every string
containing the word VATRA.

Do not remove old views until old cached clients have expired and the
account, post, friend, notification and messaging integration tests pass.
