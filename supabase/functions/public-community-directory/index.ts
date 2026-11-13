// VATRA public community directory. Only public names/descriptions are cacheable.
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
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  return connection?.isOpen ? connection : null;
}

function validateCached(value: unknown): Community[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  if (!value.every((c) =>
    c && typeof c === "object" && Number.isSafeInteger(c.club_id) &&
    c.club_id > 0 && typeof c.name === "string" && c.name.length <= 80 &&
    (c.description === null ||
     (typeof c.description === "string" && c.description.length <= 1200)) &&
    typeof c.created_at === "string"
  )) return null;
  return value as Community[];
}

function reply(data: Community[], cache: string) {
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
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: CORS });
  const url = new URL(request.url);
  if (url.search || url.pathname.split("/").at(-1) !== "public-community-directory")
    return new Response("Invalid request", { status: 400, headers: CORS });

  const cache = await redis();
  if (cache) {
    try {
      const raw = await cache.get(CACHE_KEY);
      if (raw) {
        const entries = validateCached(JSON.parse(raw));
        if (entries) return reply(entries, "hit");
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
  const { data, error } = await client.from("communities")
    .select("club_id,name,description,created_at")
    .order("created_at", { ascending: false })
    .order("club_id", { ascending: false }).limit(100);
  if (error) return new Response("Directory temporarily unavailable", { status: 503, headers: CORS });

  const entries = validateCached(data) || [];
  if (cache) {
    try { await cache.set(CACHE_KEY, JSON.stringify(entries), { EX: TTL_SECONDS }); }
    catch (_) { /* Redis outage never blocks a public directory. */ }
  }
  return reply(entries, cache ? "miss" : "disabled");
});
