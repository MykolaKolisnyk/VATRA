import { withSupabase } from "npm:@supabase/server@1";

type StoryValue = {
  kind?: unknown;
  authorUid?: unknown;
  createdAt?: unknown;
  mediaUrl?: unknown;
  mediaBucket?: unknown;
  mediaPath?: unknown;
};
type StoryRow = { path: string; value: StoryValue };
const DAY_MS = 24 * 60 * 60 * 1000;
const BUCKET = "vatra-media";
const PREFIX = "/storage/v1/object/public/" + BUCKET + "/";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function storyIsExpired(row: StoryRow, now = Date.now()): boolean {
  const created = Number(row?.value?.createdAt);
  return /^posts\/[^/]+$/.test(row?.path || "") &&
    row.value?.kind === "story" &&
    typeof row.value?.authorUid === "string" && UUID.test(row.value.authorUid) &&
    Number.isFinite(created) && created > 0 && now >= created + DAY_MS;
}

/** Refuse any URL that is not an upload to the authenticated author's own bucket folder. */
/** Only delete the file whose name embeds the exact story id and author. */
export function storyPrivateMediaPath(row: StoryRow): string | null {
 const owner=row?.value?.authorUid;
 if(typeof owner!=="string"||!UUID.test(owner))return null;
 if(!/^posts\/[a-zA-Z0-9_-]{12,64}$/.test(row.path))return null;
 if(row.value.mediaBucket!=="vatra-stories"||typeof row.value.mediaPath!=="string")return null;
 const id=row.path.slice(6);
 const path=row.value.mediaPath;
 const prefix=owner+"/stories/"+id+".";
 if(!path.startsWith(prefix))return null;
 const ext=path.slice(prefix.length);
 return ["jpg","png","webp","gif","avif","mp4","webm","mov","ogv","m4v"].includes(ext)?path:null;
}
export function storyMediaPath(row: StoryRow, supabaseUrl: string): string | null {
  const owner = row?.value?.authorUid;
  if (typeof owner !== "string" || !UUID.test(owner)) return null;
  if (typeof row?.value?.mediaUrl !== "string") return null;
  try {
    const origin = new URL(supabaseUrl).origin;
    const media = new URL(row.value.mediaUrl);
    if (media.origin !== origin || !media.pathname.startsWith(PREFIX)) return null;
    const path = decodeURIComponent(media.pathname.slice(PREFIX.length));
    const parts = path.split("/");
    if (parts.length !== 3 || parts[0] !== owner) return null;
    if (!["posts", "videos", "stories", "story-videos"].includes(parts[1])) return null;
    if (!/^[a-zA-Z0-9._-]+$/.test(parts[2])) return null;
    return path;
  } catch {
    return null;
  }
}

/**
 * Invoke only from a trusted service-to-service caller using the secret apikey.
 * Never make this function accessible with an anon/publishable key.
 * Stories created by existing clients are stored in public.app_data as posts/<id>.
 */
export default {
  fetch: withSupabase({ auth: "secret" }, async (request, context) => {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }
    const serviceUrl = Deno.env.get("SUPABASE_URL");
    if (!serviceUrl) return Response.json({ error: "Missing SUPABASE_URL" }, { status: 500 });
    let dryRun = false;
    try {
      const input = await request.json();
      dryRun = input?.dryRun === true;
    } catch { /* Scheduled requests may use an empty JSON body. */ }

    const { data, error } = await context.supabaseAdmin
      .from("app_data")
      .select("path,value")
      .like("path", "posts/%")
      .contains("value", { kind: "story" })
      .order("updated_at", { ascending: true })
      .limit(100);
    if (error) {
      console.error("[VATRA] story cleanup query failed", error.message);
      return Response.json({ error: "Unable to list expired stories" }, { status: 500 });
    }

    const expired = (Array.isArray(data) ? data : [])
      .filter((row): row is StoryRow => storyIsExpired(row as StoryRow));
    let deleted = 0, failed = 0;
    for (const row of expired) {
      if (dryRun) continue;
      try {
        const privatePath=storyPrivateMediaPath(row);
        const path=privatePath||storyMediaPath(row,serviceUrl);
        if(row.value.mediaBucket==="vatra-stories"&&!privatePath)
          throw new Error("Invalid private story path");

        if (path) {
          // Storage API deletes the binary. NEVER delete directly from storage.objects.
          const { error: mediaError } = await context.supabaseAdmin
            .storage.from(privatePath?"vatra-stories":BUCKET).remove([path]);
          if (mediaError) throw mediaError;
        }
        const { error: rowError } = await context.supabaseAdmin
          .from("app_data").delete()
          .eq("path", row.path)
          .eq("value->>kind", "story");
        if (rowError) throw rowError;
        deleted++;
      } catch (error) {
        failed++;
        console.warn("[VATRA] story cleanup skipped failed row", error);
      }
    }
    return Response.json({ dryRun, expired: expired.length, deleted, failed });
  }),
};
