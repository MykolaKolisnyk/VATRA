# VATRA — Redis caching policy

## Cache only public, reusable, short-lived data

VATRA remains a static GitHub Pages client using Supabase Auth, PostgREST/RLS,
Realtime, and Storage CDN. Redis is optional and **not** the source of truth.

VATRA's Redis caches contain only minimal public data:
- **Latest community directory**: `vatra:public:communities:v2:latest100`,
  up to 100 community IDs/names/descriptions/dates/category IDs, TTL 15 seconds.
- **Single public community details**: `vatra:public:community:v2:<club_id>`,
  one public community's ID/name/description/date/category ID, TTL 15 seconds. The
  existing Edge Function accepts a strictly validated POST with numeric
  `club_id`. Missing clubs are never cached. Redis failures fall back to
  the same public PostgREST query.
- **Public profile display names**: `vatra:public:profile-name:v1:<vatra_id>`,
  only `vatra_id` and `display_name` (no email, phone, status, avatar,
  preferences, session, permissions or private data), TTL 120 seconds.
  This Edge endpoint requires a verified user JWT and uses caller RLS.
- **Avatar metadata in the browser**: Feed, friend lists and notifications reuse `profile_media` avatar paths for 15 seconds (missing paths for 5 seconds), deduplicate overlapping reads and cap the LRU at 256 entries per Supabase client. Account transitions invalidate cached and in-flight results; failed reads are never cached. The friend lists split larger ID sets into 100-ID batches to avoid truncating results. The short-lived 10-second account-state cache is also invalidated after auth transitions and rejects stale in-flight results. These RLS-scoped values are never sent to Redis.
- **Comment and Feed cursor caches**: repeated RLS-scoped comment thread pages reuse a bounded 4-second browser-memory cache (32 pages). Feed source cursors are reused for 3 seconds (16 pages), keyed by viewer-specific filters and follow/friend lists. Both combine simultaneous requests, reject stale auth-session responses and clear after successful relevant local writes; network/SQL failures are never cached. Comment likes invalidate comment pages, and new comments invalidate both comment pages and engagement. These are **not** Redis caches; changes made by other users may remain invisible for at most their short TTL.
- **Browser-only short caches**: public names for 90 seconds per Supabase client (missing names for 15 seconds, overlapping requests deduplicated and cleared on sign-in/sign-out); per-viewer
  with a session-local 5-minute circuit breaker after a failed Redis Edge request
  (only a retry timestamp is stored, not private data); per-viewer
  post engagement for 3 seconds with write invalidation; Storage signed
  media URLs in limited memory until shortly before expiry. The authenticated
  site-wide live-search also reuses identical queries for 8 seconds (maximum
  24 search terms per Supabase client), with immediate invalidation on account
  changes and no caching of failed RLS queries. These are not shared Redis keys.
- Searches, member follows, feed, private posts, blocks, friendships, saves,
  notifications, sessions, authentication tokens, password-reset codes and
  private messages are **never** put into a shared Redis cache
- Cache only rows readable under the `anon` RLS policy. Never use service-role
  credentials for cached queries.
- The **old** Supabase project returned `X-VATRA-Cache: hit` on 2026-11-13.
  Do not assume Redis credentials were transferred to VATRA-DE. On 2026-11-20,
  the new project's `public-profile-names` endpoint returned HTTP 503, so the
  browser fell back to RLS PostgREST. The community directory returned 200,
  which by itself does **not** prove a Redis cache hit. Confirm live `hit`/`miss`
  headers before describing Redis as enabled in VATRA-DE. Search requests and
  cache failures always use direct Supabase PostgREST.

## Configure Redis in VATRA-DE (server side only)

Redis is optional. Prefer a provider with TLS (`rediss://`) and measured
low-latency access from Supabase Frankfurt. Do not copy plaintext connection
credentials into public GitHub Pages files or use Redis for private data.

1. In your Redis provider, obtain the **host, port and password**.
2. In **VATRA → Supabase → Edge Functions → Secrets** for project
   `cxrcycxrlkufozomsxcs`, configure for the current **Free-tier**
   database (Redis Cloud VATRA, Frankfurt):
   - `REDIS_URL=redis://default:<URL_ENCODED_PASSWORD>@<HOST>:<PORT>`
   - `REDIS_ENABLED=true`
   The password is the technical Redis database credential, not a VATRA user password.
   This is a temporary plaintext connection: the Redis AUTH
   exchange and public cache traffic are unencrypted on the network. Before public
   launch, upgrade to TLS and change to `rediss://` and
   rotate the Redis password.
3. Never commit Redis credentials or expose them in frontend JavaScript. Configure
   the URL directly in Supabase Edge Function Secrets. With plaintext Redis, cache
   **only public data**, and rotate the Redis password before public launch.
4. Deploy `public-community-directory` and `public-profile-names` with
   JWT verification enabled (default). Test misses, hits, 15/120-second expiry,
   unavailable Redis, and any Cache-Control headers.
5. `PUBLIC_DIRECTORY_CACHE_ENABLED=true` permits the public
   community listing to attempt its Edge cache endpoint. This flag does not
   guarantee the remote Redis is configured or active. The public club detail page
   also opts into the same Edge Function's POST mode. Search always bypasses
   Redis; direct PostgREST is the fallback. Monitor **p50/p95 latency**,
   hit rate and errors; revert the new detail lookup if the Edge hop
   outweighs caching benefits.

## Upgrade to paid Redis Cloud

Enable TLS in Redis Cloud and update `REDIS_URL` to `rediss://...`.
Do not add the credentials to GitHub
Pages. Additional caches must be separately reviewed for visibility/RLS and
invalidation semantics.

## Why this is optional

For a new/empty community directory, a direct PostgREST query is normally
faster than an extra Edge Function hop. Redis becomes worthwhile when many
members request the **same public** result and the hit ratio outweighs the
extra network and cold-start overhead. Measure before enabling. Avoid cache
pollution, per-search-term keys or permanent entries.


## Free-tier routing (2026-11-22)

The owner requested Redis Cloud Free before public release.
On the official GitHub Pages host `assets/js/host.js` now enables
`VATRA_NAME_CACHE_EDGE_ENABLED` and `VATRA_COMMUNITY_EDGE_ENABLED`
by default, unless explicitly set to `false` before host.js loads.
These are public non-secret switches; Redis only operates when the two
Supabase Edge Function secrets above are present and the Redis TCP connection works.

`public-profile-names` uses an authenticated JWT and a five-minute
client-side cooldown after failed Edge requests; the direct RLS query
remains the fallback. Communities use anonymous RLS-readable metadata.
The Redis code has already been deployed to both Edge Functions.
Confirm live `X-VATRA-Cache: miss` followed by `hit` before claiming
the Redis Cloud database is connected.

Do not place likes, per-viewer flags, private comments, post bodies,
private albums, signed URLs, friendships, messages or user secrets in
shared plaintext Redis. Existing viewer-scoped caches remain in browser
memory. No Redis secret is stored in the repository.

During the later paid-plan migration, set a TLS `rediss://` URL and
rotate any credential used without
encryption, and retest authenticated/direct fallback, expiration and hit
rates before public launch.
