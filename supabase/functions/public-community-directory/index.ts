// VATRA public community directory and single-club metadata. Only public names/descriptions are cacheable.
// Redis credentials must live in Supabase Edge Function secrets, never in GitHub Pages.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient as createSupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import { createClient as createRedisClient } from "npm:redis@5.0.1";

type Community = {
  club_id: number;
  name: string;
  description: string | null;
  created_at: string;
};

const CACHE_KEY = "vatra:public:communities:v1:latest100";
const TTL_SECONDS = 15;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
let redisConnection: Promise<ReturnType<typeof createRedisClient> | null> | null = null;
let redisRetryAt = 0;

function cacheEnabled(): boolean {
  const url = Deno.env.get("REDIS_URL") || "";
  if (Deno.env.get("REDIS_ENABLED") !== "true" || !url) return false;
  if (url.startsWith("rediss://")) return true;
  // The Redis Cloud Free tier lacks TLS. This opt-in is for public test data only.
  return url.startsWith("redis://") &&
    Deno.env.get("REDIS_ALLOW_PLAINTEXT_DEV") === "true";
}

async function redis() {
  if (!cacheEnabled() || Date.now() < redisRetryAt) return null;
  if (!redisConnection) {
    redisConnection = (async () => {
      const client = createRedisClient({
        url: Deno.env.get("REDIS_URL")!,
        disableOfflineQueue: true,
        socket: { connectTimeout: 700, reconnectStrategy: false },
      });
      client.on("error", () => {
        // Never print connection strings, credentials or public IP addresses.
      });
      await client.connect();
      return client;
    })().catch(() => {
      redisRetryAt = Date.now() + 60_000;
      redisConnection = null;
      return null;
    });
  }
  const connection = await redisConnection;
  if (connection?.isOpen) return connection;
  // A previously connected free-tier instance can close idle sockets.
  // Avoid hanging on an offline queue and reconnect after a short cooldown.
  redisConnection = null;
  redisRetryAt = Date.now() + 60_000;
  return null;
}

function validateCommunity(value: unknown): value is Community {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as Record<string, unknown>;
  return typeof c.club_id === "number" && Number.isSafeInteger(c.club_id) &&
    c.club_id > 0 && typeof c.name === "string" && c.name.length <= 80 &&
    (c.description === null ||
     (typeof c.description === "string" && c.description.length <= 1200)) &&
    typeof c.created_at === "string";
}

function validateCached(value: unknown): Community[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  return value.every(validateCommunity) ? value as Community[] : null;
}

function reply(data: Community[] | Community | null, cache: string) {
  return new Response(JSON.stringify({ data }), {
    headers: {
      ...CORS, "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-VATRA-Cache": cache,
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "GET" && request.method !== "POST")
    return new Response("Method Not Allowed", { status: 405, headers: CORS });
  const url = new URL(request.url);
  if (url.search || url.pathname.split("/").at(-1) !== "public-community-directory")
    return new Response("Invalid request", { status: 400, headers: CORS });

  // GET returns the latest public catalog. POST accepts exactly one numeric
  // club ID and never a caller-selected column, filter or visibility mode.
  let clubId: number | null = null;
  if (request.method === "POST") {
    try {
      const input = await request.text();
      if (input.length > 256) throw Error("Oversized request");
      const value: unknown = JSON.parse(input);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw Error("Malformed request");
      const record = value as Record<string, unknown>;
      if (Object.keys(record).length !== 1 ||
          typeof record.club_id !== "number" ||
          !Number.isSafeInteger(record.club_id) || record.club_id <= 0)
        throw Error("Invalid community ID");
      clubId = record.club_id;
    } catch (_) {
      return new Response("Invalid community ID", { status: 400, headers: CORS });
    }
  }

  const cacheKey = clubId === null ? CACHE_KEY : "vatra:public:community:v1:" + clubId;
  const cache = await redis();
  if (cache) {
    try {
      const raw = await cache.get(cacheKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (clubId === null) {
          const entries = validateCached(parsed);
          if (entries) return reply(entries, "hit");
        } else if (validateCommunity(parsed) && parsed.club_id === clubId) {
          return reply(parsed, "hit");
        }
      }
    } catch (_) {
      // Redis is an optional accelerator; PostgreSQL remains authoritative.
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishable = Deno.env.get("SUPABASE_ANON_KEY") ||
    JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default;
  if (!supabaseUrl || !publishable) {
    return new Response("Public directory unavailable", { status: 503, headers: CORS });
  }

  // Anonymous DB role is deliberate: only rows explicitly public under RLS.
  const client = createSupabaseClient(supabaseUrl, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (clubId !== null) {
    const { data, error } = await client.from("communities")
      .select("club_id,name,description,created_at")
      .eq("club_id", clubId).maybeSingle();
    if (error) return new Response("Community temporarily unavailable", { status: 503, headers: CORS });
    if (!data) return reply(null, cache ? "miss" : "disabled");
    if (!validateCommunity(data) || data.club_id !== clubId)
      return new Response("Unexpected community response", { status: 503, headers: CORS });
    if (cache) {
      try { await cache.set(cacheKey, JSON.stringify(data), { EX: TTL_SECONDS }); }
      catch (_) { /* PostgreSQL remains authoritative if Redis is offline. */ }
    }
    return reply(data, cache ? "miss" : "disabled");
  }

  const { data, error } = await client.from("communities")
    .select("club_id,name,description,created_at")
    .order("created_at", { ascending: false })
    .order("club_id", { ascending: false }).limit(100);
  if (error) return new Response("Directory temporarily unavailable", { status: 503, headers: CORS });

  const entries = validateCached(data) || [];
  if (cache) {
    try { await cache.set(cacheKey, JSON.stringify(entries), { EX: TTL_SECONDS }); }
    catch (_) { /* Redis outage never blocks a public directory. */ }
  }
  return reply(entries, cache ? "miss" : "disabled");
});
