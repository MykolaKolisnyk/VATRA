// VATRA: shared active announcements only. Per-viewer read state stays outside Redis.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient as createSupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import { createClient as createRedisClient } from "npm:redis@5.0.1";

type Announcement = {
  id: number; title_uk: string; title_en: string; body_uk: string; body_en: string;
  target_path: string | null; active: boolean; starts_at: string;
  ends_at: string | null; created_at: string;
};
const KEY = "vatra:public:announcements:v1:active15";
const TTL_SECONDS = 10;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
let pendingRedis: Promise<ReturnType<typeof createRedisClient> | null> | null = null;
let retryAfter = 0;
const validRow = (value: unknown): value is Announcement => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "number" && Number.isSafeInteger(row.id) && row.id > 0 &&
    ["title_uk", "title_en", "body_uk", "body_en"].every(key =>
      typeof row[key] === "string" && (row[key] as string).length <= 4000) &&
    (row.target_path === null ||
      (typeof row.target_path === "string" && row.target_path.length <= 1024)) &&
    row.active === true && typeof row.starts_at === "string" &&
    Number.isFinite(Date.parse(row.starts_at)) &&
    (row.ends_at === null || (typeof row.ends_at === "string" &&
      Number.isFinite(Date.parse(row.ends_at)))) &&
    typeof row.created_at === "string" && Number.isFinite(Date.parse(row.created_at));
};
const withinWindow = (item: Announcement, now: number) =>
  Date.parse(item.starts_at) <= now &&
  (item.ends_at === null || Date.parse(item.ends_at) > now);
function validList(value: unknown): value is Announcement[] {
  return Array.isArray(value) && value.length <= 15 && value.every(validRow);
}
function reply(data: Announcement[], cache: string, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status, headers: { ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store", "X-VATRA-Cache": cache },
  });
}
async function redis() {
  const url = Deno.env.get("REDIS_URL") || "";
  if (Deno.env.get("REDIS_ENABLED") !== "true" ||
      !(url.startsWith("redis://") || url.startsWith("rediss://")) ||
      Date.now() < retryAfter) return null;
  if (!pendingRedis) {
    pendingRedis = (async () => {
      const client = createRedisClient({
        url, disableOfflineQueue: true,
        socket: { connectTimeout: 700, reconnectStrategy: false },
      });
      client.on("error", () => { /* Never log secrets. */ });
      await client.connect();
      return client;
    })().catch(() => {
      pendingRedis = null;
      retryAfter = Date.now() + 60_000;
      return null;
    });
  }
  const connection = await pendingRedis;
  if (connection?.isOpen) return connection;
  pendingRedis = null;
  retryAfter = Date.now() + 60_000;
  return null;
}
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "GET") return reply([], "invalid", 405);
  const path = new URL(request.url);
  if (path.search || path.pathname.split("/").at(-1) !== "public-announcements")
    return reply([], "invalid", 400);
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
  const { data: authResult, error: authError } = await client.auth.getUser(authorization.slice(7));
  if (authError || !authResult?.user) return reply([], "unauthorized", 401);
  const cache = await redis();
  if (!cache) return reply([], "disabled", 503);
  try {
    const raw = await cache.get(KEY);
    if (raw) {
      const data: unknown = JSON.parse(raw);
      if (validList(data)) return reply(data.filter(item => withinWindow(item, Date.now())), "hit");
    }
  } catch (_) {
    return reply([], "unavailable", 503);
  }
  const now = new Date().toISOString();
  // These filters select only published, currently active rows. Owner-only drafts
  // and each viewer's announcement_views never enter this shared cache.
  const { data, error } = await client.from("announcements")
    .select("id,title_uk,title_en,body_uk,body_en,target_path,active,starts_at,ends_at,created_at")
    .eq("active", true).lte("starts_at", now)
    .order("created_at", { ascending: false }).limit(15);
  if (error || !Array.isArray(data) || !data.every(validRow))
    return reply([], "unavailable", 503);
  const rows = data.filter(item => withinWindow(item, Date.now()));
  try {
    await cache.set(KEY, JSON.stringify(rows), { EX: TTL_SECONDS });
  } catch (_) {
    return reply(rows, "write-failed");
  }
  return reply(rows, "miss");
});
