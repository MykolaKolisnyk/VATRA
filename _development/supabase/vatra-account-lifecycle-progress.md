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
