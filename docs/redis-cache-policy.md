# VATRA — Redis caching policy

## Cache only public, reusable, short-lived data

VATRA remains a static GitHub Pages client using Supabase Auth, PostgREST/RLS,
Realtime, and Storage CDN. Redis is optional and **not** the source of truth.

The first opt-in Redis cache is the public community directory:
- Key: `vatra:public:communities:v1:latest100`
- Contents: the latest 100 **public** community IDs, names, descriptions, dates
- TTL: 15 seconds. PostgreSQL is read again on a miss or Redis outage
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
5. `PUBLIC_DIRECTORY_CACHE_ENABLED=true` is now enabled for the public
   community listing after a confirmed Redis hit. Search always bypasses the
   cache, and the existing direct PostgREST path is the fallback. Monitor
   **p50/p95 latency**, cache hit rate, and errors; revert to `false` if the
   extra Edge hop outweighs caching benefits.

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
