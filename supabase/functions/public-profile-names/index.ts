// VATRA authenticated public-name cache. No private profile fields or session data.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient as createSupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import { createClient as createRedisClient } from "npm:redis@5.0.1";

type PublicName = { vatra_id: number; display_name: string };
const TTL_SECONDS = 120;
const MAX_IDS = 48;
const PREFIX = "vatra:public:profile-name:v1:";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
let redisConnection: Promise<ReturnType<typeof createRedisClient> | null> | null = null;
let retryAfter = 0;

function validId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function validRow(value: unknown): value is PublicName {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return validId(row.vatra_id) && typeof row.display_name === "string" &&
    row.display_name.length > 0 && row.display_name.length <= 160;
}
function cacheAllowed(): boolean {
  const url = Deno.env.get("REDIS_URL") || "";
  if (Deno.env.get("REDIS_ENABLED") !== "true" || !url) return false;
  if (url.startsWith("rediss://")) return true;
  // Public display names only: plaintext Redis is an explicit development-only opt-in.
  return url.startsWith("redis://") && Deno.env.get("REDIS_ALLOW_PLAINTEXT_DEV") === "true";
}
async function redis() {
  if (!cacheAllowed() || Date.now() < retryAfter) return null;
  if (!redisConnection) {
    redisConnection = (async () => {
      const client = createRedisClient({
        url: Deno.env.get("REDIS_URL")!,
        disableOfflineQueue: true,
        socket: { connectTimeout: 700, reconnectStrategy: false },
      });
      client.on("error", () => { /* Never log Redis credentials. */ });
      await client.connect();
      return client;
    })().catch(() => {
      redisConnection = null;
      retryAfter = Date.now() + 60_000;
      return null;
    });
  }
  const connection = await redisConnection;
  if (connection?.isOpen) return connection;
  redisConnection = null;
  retryAfter = Date.now() + 60_000;
  return null;
}
function reply(data: PublicName[], cache: string, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status, headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-VATRA-Cache": cache,
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return reply([], "invalid", 405);
  if (new URL(request.url).search) return reply([], "invalid", 400);
  let body: unknown;
  try { body = await request.json(); }
  catch (_) { return reply([], "invalid", 400); }
  const payload = body as { ids?: unknown } | null;
  if (!payload || !Array.isArray(payload.ids) || !payload.ids.length ||
      payload.ids.length > MAX_IDS || !payload.ids.every(validId)) {
    return reply([], "invalid", 400);
  }
  const ids = [...new Set(payload.ids as number[])];
  const authorization = request.headers.get("Authorization") || "";
  if (!/^Bearer [^\s]+$/i.test(authorization)) return reply([], "unauthorized", 401);
  const url = Deno.env.get("SUPABASE_URL");
  const publishable = Deno.env.get("SUPABASE_ANON_KEY") ||
    JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default;
  if (!url || !publishable) return reply([], "unavailable", 503);
  const client = createSupabaseClient(url, publishable, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Verify an actual user; the public/anon API key alone must not enable this endpoint.
  const token = authorization.slice(7);
  const { data: authResult, error: authError } = await client.auth.getUser(token);
  if (authError || !authResult?.user) return reply([], "unauthorized", 401);

  const cache = await redis();
  if (!cache) return reply([], "disabled", 503); // Browser falls back directly to RLS PostgREST.
  const entries = new Map<number, PublicName>();
  const missing: number[] = [];
  try {
    const raw = await cache.mGet(ids.map(id => PREFIX + id));
    ids.forEach((id, index) => {
      try {
        const value = raw[index] ? JSON.parse(raw[index]!) : null;
        if (validRow(value) && value.vatra_id === id) entries.set(id, value);
        else missing.push(id);
      } catch (_) { missing.push(id); }
    });
  } catch (_) {
    return reply([], "unavailable", 503);
  }

  if (missing.length) {
    // User JWT is forwarded to PostgREST: normal authenticated RLS and GRANTs apply.
    const { data, error } = await client.from("public_profiles")
      .select("vatra_id,display_name").in("vatra_id", missing);
    if (error) return reply([], "unavailable", 503);
    const returned = new Set(missing);
    const fresh = (data || []).filter(validRow)
      .filter(item => returned.has(item.vatra_id));
    for (const row of fresh) entries.set(row.vatra_id, row);
    if (fresh.length) {
      try {
        const writes = cache.multi();
        fresh.forEach(row => writes.set(PREFIX + row.vatra_id, JSON.stringify(row), { EX: TTL_SECONDS }));
        await writes.exec();
      } catch (_) { /* A failed write must not fail the authenticated read. */ }
    }
  }
  return reply(ids.filter(id => entries.has(id)).map(id => entries.get(id)!), missing.length ? "miss" : "hit");
});
