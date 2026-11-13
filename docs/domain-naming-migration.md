# VATRA domain naming migration — safe rollout

## Completed: three physical table renames

Migration `20261113174336` changed these **physical** PostgreSQL table names
without dropping any rows or disabling row-level security:

| Former table | Physical table now | Old-client compatibility |
|---|---|---|
| `vatra_directory` | `member_directory` | legacy RLS-invoker SELECT view |
| `vatra_account_states` | `account_states` | legacy RLS-invoker SELECT view |
| `vatra_profile_gifts` | `profile_gifts` | legacy RLS-invoker SELECT view |

The temporary new-name read-only views introduced by migration `20261113171916`
were dropped and replaced atomically with the renamed physical tables. Three
`private` signup / deleted-account / ban-state trigger function bodies now write
to the physical tables. Existing RLS policies, table ACLs, triggers and object
identities followed the rename. Old names are read-only views, with explicit
`security_invoker=true` and least-privilege SELECT grants. Do not attempt
`INSERT ... ON CONFLICT` into the old-name views; internal functions already
write to the new physical tables.

Production role checks confirmed: underlying tables have RLS enabled; anon can
read only the directory (both old and new paths); gifts and account states can
be selected only by authenticated roles. Sign-up and account deletion must
still be tested end-to-end with real members before release.

## Completed: two additional physical table renames

Migration `20261113174858` renamed `vatra_post_like_members` to
`post_like_members` and `vatra_profile_reports` to `profile_reports`.
The private sync trigger now writes to the new physical like-member table.
The old like-member name is an RLS-invoker SELECT-only view, and the old
report name remains an automatically updatable RLS-invoker INSERT view for
authenticated clients. The new browser reports directly to `profile_reports`.
No user data was deleted.

## Remaining legacy names / proposed names

| Legacy table | Proposed domain table |
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
| `vatra_profile_details` | `profile_details` |
| `vatra_profile_media` | `profile_media` |
| `vatra_profile_preferences` | `profile_preferences` |
| `vatra_public_profiles` | `public_profiles` |
| `vatra_stories` | `stories` |

The remaining legacy names need individual dependency audits and **write-compatible** migration paths:
RLS, foreign keys, SQL functions, triggers, Realtime, and static clients may all
depend on the physical table names. In particular, read-only aliases are not a substitute for
migrating inserts/updates and conflict-handling behavior. Never batch DROP
CASCADE, never turn off RLS to make a rename work, and don't rename all 27
tables in a single deployment.

## Storage naming — not yet migrated

The database currently contains objects under `vatra-avatars`,
`vatra-covers`, `vatra-post-images`, and `vatra-videos`.
Storage bucket IDs appear in browser uploads, download URLs, storage RLS,
and persisted `media_path` / `media_items` references.
Renaming buckets in-place or deleting them can break existing files.
Migration requires: new bucket creation, copy+verify **every** object and
metadata, parallel read support, atomic switch of upload paths and RLS,
and a rollback window. Leave original buckets intact until verified.

## Checklist for remaining physical names

1. Back up physical tables and Storage objects and record row/object counts.
2. Inventory every JavaScript string, PostgREST function, SQL function,
   trigger, check constraint, FK, RLS policy, Storage policy and Realtime
   subscription using the old name.
3. Create and test compatibility paths for old and new clients, including
   offline caches/service workers. SQL DML with `ON CONFLICT` does not simply
   work through an arbitrary compatibility view.
4. Verify with real RLS roles and production-like test accounts.
5. Roll out code, monitor errors and query latency, then retire old names only
   after the compatibility window. Never delete user data to simplify naming.

**Priority order:** authentication and publishing correctness, efficient
batch reads, owner-grant and media fixes, then safe schema naming.
