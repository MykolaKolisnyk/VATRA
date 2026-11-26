# Lifecycle implementation progress — staged, not deployed

The database inventory on 2026-11-26 found seven Storage buckets (avatars and covers are public; album-photos, business-media, marketplace-images, post-images and videos are private). The public bucket URLs and pre-issued signed URLs require special handling during deactivation. Direct FK cascade is insufficient: post_comments.author_vatra_id does not cascade, and other author/member references are not direct FKs. There is also an existing deleted-account marker trigger; it must be reconciled with the required deletion semantics, without erasing sanctions or reusing VATRA IDs.

This commit adds the private job table, service-only transitions, server-side deadline, row-lock coordination, bounded claim and lease retry, and a disposable-database SQL test. This is a candidate SQL foundation, NOT a deployed migration, a completed backend, or a purge worker. It deliberately returns ready:false. The existing UI release gate stays false.

Additional hardening: live schema confirms auth.sessions.not_after is timestamptz. The candidate transition now checks it before and after acquiring account/job locks. Recovery windows are exact 24-hour periods rather than timezone-dependent calendar intervals. Added service-only renewal of an unexpired lease with the matching lease ID; the isolated test checks invalid, expired and replaced leases. No SQL tests have been run against a disposable instance yet.

Still required before enabling:
- implement trusted identity verification and fresh password/MFA at the Edge boundary, and validate all configured session lifetime/refresh semantics;
- deny deactivated accounts access via all RLS, RPCs, Realtime, Storage and frontend routes (without blocking owner recovery), and review public and signed media URLs;
- explicitly define ownership and retention for shared communities, moderation and third-party records, and enumerate direct/indirect references, Storage originals/derivatives and service-owned paths;
- implement and verify a leased worker with fenced retry and verified cleanup, using Storage API rather than deleting object metadata, then Auth hard-delete; schedule independently of page visits;
- run isolation, concurrency, deadline, old-token, all-bucket, retry and full purge tests on disposable accounts, plus browser tests and translation review.

References:
https://supabase.com/docs/guides/auth/managing-user-data
https://supabase.com/docs/guides/storage/buckets/fundamentals
https://supabase.com/docs/guides/storage/management/delete-objects

Added a separate PostgreSQL 17 CI database with a minimal schema fixture and tests for recovery periods, invalid/expired sessions, cross-account isolation, moderation, duplicate requests, expiry, immediate requests and leases. Fixed invalid dollar quoting in the renewal function. This is not full Supabase integration, no production migrations or data changes; CI outcome must be verified.

A staged status-only Edge gateway is now in `functions/account-lifecycle/`. It validates the bearer with Auth, derives user and session IDs from the verified token, calls the service-only status RPC, and rejects mutations regardless of client input. The frontend remains disabled and the gateway has not been deployed. The pure handler smoke test mocks Auth/RPC, so real Supabase integration, fresh password/MFA, full deactivation and cleanup remain release blockers.

A read-only live catalog review confirmed the existing moderation predicate `vatra_security_private.allowed()` is used by restrictive policies on social tables and `storage.objects`; `avatar_photo_tags` lacks that common restriction. Added a separate staged candidate preserving moderation and denying accounts with a pending/purging lifecycle job, plus a restrictive tag policy. The isolated PostgreSQL CI uses representative tables and simulated JWT identity to verify actual row-level read/write denial, restoration and unrelated-member isolation. This is not a full production migration. Account metadata/recovery bootstrap, visibility of deactivated authors to other users, guest access, security-definer RPCs, Edge caches, signed and public media URLs, session revocation and worker races still require review. No live policies or rows changed.
