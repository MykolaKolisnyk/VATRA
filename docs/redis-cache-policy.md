# VATRA — Redis caching policy

## Cache only public, reusable, short-lived data

VATRA remains a static GitHub Pages client using Supabase Auth, PostgREST/RLS,
Realtime, and Storage CDN. Redis is optional and **not** the source of truth.

VATRA's Redis caches contain only minimal public data:
- **Latest community directory**: `vatra:public:communities:v1:latest100`,
  up to 100 community IDs/names/descriptions/dates, TTL 15 seconds.
- **Single public community details**: `vatra:public:community:v1:<club_id>`,
  one public community's ID/name/description/date, TTL 15 seconds. The
  existing Edge Function accepts a strictly validated POST with numeric
  `club_id`. Missing clubs are never cached. Redis failures fall back to
  the same public PostgREST query.
- **Public profile display names**: `vatra:public:profile-name:v1:<vatra_id>`,
  only `vatra_id` and `display_name` (no email, phone, status, avatar,
  preferences, session, permissions or private data), TTL 120 seconds.
  This Edge endpoint requires a verified user JWT and uses caller RLS.
- **Avatar metadata in the browser**: Feed, friend lists and notifications reuse `profile_media` avatar paths for 15 seconds (missing paths for 5 seconds), deduplicate overlapping reads and cap the LRU at 256 entries per Supabase client. Account transitions invalidate cached and in-flight results; failed reads are never cached. The friend lists split larger ID sets into 100-ID batches to avoid truncating results. The short-lived 10-second account-state cache is also invalidated after auth transitions and rejects stale in-flight results. These RLS-scoped values are never sent to Redis.
- **Browser-only short caches**: public names for 90 seconds per Supabase client (missing names for 15 seconds, overlapping requests deduplicated and cleared on sign-in/sign-out); per-viewer
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
- Redis cache was enabled for the public, unfiltered community directory
  after the authenticated Edge test returned `X-VATRA-Cache: hit` on 2026-11-13.
  Search requests and cache failures always use direct Supabase PostgREST.

## Opt in on Redis Cloud Free (development only)

Free Redis Cloud currently has 30 MB storage, 30 connections and a limited
throughput budget; its endpoint does not support TLS. There is also no
Redis Cloud REST API on Free. The Edge Function uses TCP from a server-side
runtime, not from the browser.

1. In Redis Cloud, note the **database endpoint, port and password**.
2. In **Supabase → Edge Functions → Secrets** for project `rjasunoawrxvetwadylh`,
   set:
   - `REDIS_URL=redis://default:<URL_ENCODED_PASSWORD>@<HOST>:<PORT>`
   - `REDIS_ENABLED=true`
   - `REDIS_ALLOW_PLAINTEXT_DEV=true`
3. Never commit these secrets, expose them in frontend JavaScript, or share a
   Redis password in a chat. With plaintext Redis, use **public data only**.
4. Deploy `supabase/functions/public-community-directory` with
   JWT verification enabled (default). Test misses, hits, 15-second expiry,
   unavailable Redis, and any Cache-Control headers.
5. `PUBLIC_DIRECTORY_CACHE_ENABLED=true` is enabled for the public
   community listing after a confirmed Redis hit. The public club detail page
   also opts into the same Edge Function's POST mode. Search always bypasses
   Redis; direct PostgREST is the fallback. Monitor **p50/p95 latency**,
   hit rate and errors; revert the new detail lookup if the Edge hop
   outweighs caching benefits.

## Upgrade to paid Redis Cloud

Enable TLS in Redis Cloud and update `REDIS_URL` to `rediss://...`.
Set `REDIS_ALLOW_PLAINTEXT_DEV=false`. Do not add the credentials to GitHub
Pages. Additional caches must be separately reviewed for visibility/RLS and
invalidation semantics.

## Why this is optional

For a new/empty community directory, a direct PostgREST query is normally
faster than an extra Edge Function hop. Redis becomes worthwhile when many
members request the **same public** result and the hit ratio outweighs the
extra network and cold-start overhead. Measure before enabling. Avoid cache
pollution, per-search-term keys or permanent entries.
