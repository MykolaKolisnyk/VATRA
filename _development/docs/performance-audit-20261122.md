# VATRA — performance & cache audit (2026-11-22)

## Verified baseline (Supabase logs and live schema)

These are server-side observations, **not** measured end-to-end browser page loads.

| Endpoint (available recent logs) | Requests | Mean origin/execution time | p95 |
|---|---:|---:|---:|
| Edge `public-profile-names` | 125 HTTP 503 / 125 POST | 367 ms | 1,039 ms |
| `/storage/v1/object/list/avatars` | 112 | 3,058 ms | 10,060 ms |
| `/storage/v1/object/sign/post-images` (batch) | 599 | 1,341 ms | 4,510 ms |
| `/auth/v1/user` | 710 | 261 ms | 681 ms |
| `/rest/v1/profile_media` | 1,177 | 151 ms | 558 ms |

In the database, 9/10 nonempty post galleries contain **one image**, 1/10 contain two. Existing avatars and cover files (13 and 10 objects) all have corresponding `profile_media` rows. Unnecessary fallback listing after an ordinary missing database row creates particularly long delays.

## Implemented browser-side improvements

1. Public profile names use a **single direct, batched PostgREST/RLS read** with the existing bounded in-memory cache by default, instead of a failed Redis Edge call followed by a duplicate SQL read. Per-user authenticated fields are not moved into Redis. The Edge path is deliberately opt-in via `window.VATRA_NAME_CACHE_EDGE_ENABLED===true` before the names helper loads, and must remain disabled until TLS Redis and hit/miss behavior are verified in production.
2. For profile photos, an expected empty `profile_media` row no longer triggers a redundant query or two slow Storage LIST requests. Existing valid profile media still uses its persisted paths, and legacy orphan files were ruled out against the current live database at audit time.
3. Feed galleries with one/two photos skip the expensive bulk Storage signing endpoint. Existing per-viewer signed URL promises still dedupe concurrent requests and invalidate on account transitions. Larger galleries still batch.
4. Service Worker installation precaches only the minimum offline shell (instead of issuing >20 simultaneous requests, including heavy artwork and fonts). Versioned JS/CSS remain content-hash verified and cache-first. Unversioned static resources use normal HTTP caching while remaining network-first with offline fallback. Public i18n JSON uses cached-first + background revalidation, never private API responses.
5. Locale script fetch respects the browser/SW cache; all HTML fingerprints for modified versioned scripts were refreshed, and CDN preconnect was added to pages loading Supabase JS.
6. Added missing `avatar_photo_tags.tagged_vatra_id` and `created_by` foreign-key indexes in Supabase without changing RLS, user data or permissions.

## Important boundaries and follow-up

- Redis Cloud connection secrets are **not** available through the current Supabase connector; do not place `REDIS_URL` or passwords into browser JavaScript or GitHub. The project may still be disconnected. Keep direct RLS queries while endpoint errors persist.
- Supabase signed media and auth are still request-bound: do not replace RLS with a public bucket or a service-role proxy to gain speed.
- CI builds a minified `dist/` **artifact**, but current GitHub Pages branch publication is not yet proven to serve this artifact. The deployment source requires a separate verified rollout, not a silent switch to a new workflow.
- These changes remove avoidable calls; actual improvements in LCP, INP, TTFB and cold/warm visit duration need browser measurements on the live URL after deploy. Run automated browser smoke and authentication/data-access tests before merging.


## Follow-up optimization: album and community reads

- Album directories now use `photo_album_summaries`, an authenticated `security_invoker` view backed by existing owner/RLS policies. Album cover paths and exact image counts are derived in PostgreSQL via the indexed album-ID path, rather than downloading all images on every album open.
- Opening an album retrieves **36 photos per page** (with one lookahead row). A member can explicitly request more. The «Знімки» preview retrieves no more than 18 recent album photos. The previous query could return 1,000 full photo records before the first render.
- Private album thumbnails sign their URLs only when approaching the viewport; concurrent identical signatures reuse the same promise. Session transitions clear both in-memory URL and in-flight caches. The Service Worker does not cache these signed URLs.
- Public community directory and detail reads default to **one RLS-scoped PostgREST request**, rather than first invoking an unverified Edge Redis endpoint. After verifying a fast TLS Redis hit/miss in production, setting `window.VATRA_COMMUNITY_EDGE_ENABLED=true` before the page script runs explicitly opts back into the Edge path.
- No secret keys, private media, message content or user-specific authorization results are put in shared Redis.

The changes remove avoidable network operations; they do not claim an overall LCP/p95 improvement until the live GitHub Pages deployment is remeasured.
