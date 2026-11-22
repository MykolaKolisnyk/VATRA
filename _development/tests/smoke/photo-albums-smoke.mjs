import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext,Script} from "node:vm";

const [script,css,html,profile,sql,indexes,summarySql,redisPolicy]=await Promise.all([
 "assets/js/photo-albums.js","assets/css/photo-albums.css","profile.html",
 "assets/js/profile.js","_development/supabase/migrations/20261122122000_photo_albums_private_storage.sql",
 "_development/supabase/migrations/20261122123500_album_foreign_key_indexes.sql",
 "_development/supabase/migrations/20261122134500_photo_album_summary_view.sql",
 "_development/docs/redis-cache-policy.md"
].map(path=>readFile(path,"utf8")));
assert.doesNotThrow(()=>new Script(script),"Album script must parse as JavaScript");
const window={};
runInNewContext(script,{window});
assert.equal(typeof window.VATRA_ALBUMS?.mount,"function","Album module must export a single mount API");

assert.ok(
 html.includes('assets/js/photo-albums.js?rev=')&&
 html.includes('assets/css/photo-albums.css?rev=')&&
 profile.includes('window.VATRA_ALBUMS?.mount({client,targetId,ownId,isMine,userId:user.id})')&&
 script.includes('section.dataset.vatraAlbumsReady="true"'),
 "Photo albums must initialize once using existing authenticated profile state"
);
for(const marker of [
 'photo_albums").insert','photo_albums").update','photo_albums").delete',
 'album_photos").insert','album_photos").delete','photo_album_comments").insert',
 'photo_album_comments").delete','show_in_photos','visibility','comments_mode',
 'createSignedUrl(path,120)','upload(path,file,','remove([row.media_path])',
 'window.VATRA_OPEN_PROFILE_AVATAR','navigator.clipboard.writeText(albumUrl(album.id))',
 'const requested=new URLSearchParams(location.search).get("album")'
]){
 assert.ok(script.includes(marker),"Album implementation missing core function: "+marker);
}
assert.ok(
 sql.includes("alter table public.photo_albums enable row level security")&&
 sql.includes("alter table public.album_photos enable row level security")&&
 sql.includes("alter table public.photo_album_comments enable row level security")&&
 sql.includes("revoke all on public.photo_albums,public.album_photos,public.photo_album_comments from anon")&&
 sql.includes("create policy vatra_albums_reader")&&
 sql.includes("create policy vatra_album_storage_read")&&
 sql.includes("bucket_id='album-photos'")&&
 sql.includes("values('album-photos','album-photos',false,31457280")&&
 sql.includes("create policy vatra_album_storage_owner_upload")&&
 sql.includes("create policy vatra_album_storage_owner_delete")&&
 sql.includes("vatra_admin_private.allowed()"),
 "Albums must persist with owner-only writes, scoped reads and private Storage RLS"
);
assert.ok(
 !sql.includes("security definer")&&
 !sql.includes("service_role")&&
 !script.includes(".getPublicUrl(path)")&&
 !script.includes('storage.from("album-photos").getPublicUrl')&&
 !script.includes("REDIS_URL"),
 "Album access must not rely on elevated keys, public storage URLs or shared Redis"
);
assert.ok(indexes.includes("album_photos_owner_vatra_id_idx")&&
 indexes.includes("photo_album_comments_author_id_idx")&&
 indexes.includes("photo_album_comments_author_vatra_id_idx"),
 "New album foreign keys must be indexed"
);
assert.ok(
 summarySql.includes("security_invoker = true")&&
 summarySql.includes("revoke all on public.photo_album_summaries from public, anon")&&
 summarySql.includes("grant select on public.photo_album_summaries to authenticated")&&
 summarySql.includes("where p.album_id=a.id order by p.created_at desc")&&
 summarySql.includes("count(*)::integer"),
 "Album summary must obey viewer RLS and return indexed covers with exact counts"
);
assert.ok(
 script.includes('client.from("photo_album_summaries")')&&
 script.includes('.limit(FEATURED_LIMIT)')&&
 script.includes("const PAGE_SIZE=36,FEATURED_LIMIT=18")&&
 script.includes(".range(offset,offset+PAGE_SIZE)")&&
 script.includes("state.photoHasMore")&&
 script.includes("state.photosBusy")&&
 script.includes("new IntersectionObserver(entries=>")&&
 script.includes("pendingSignatures.has(path)")&&
 script.includes('client.auth?.onAuthStateChange?.(event=>')&&
 !script.includes('.in("album_id",ids)\n     .order("created_at",{ascending:false}).limit(1000)')&&
 css.includes(".vatra-albums-more-photos-001{"),
 "Album photos must be bounded, progressively paged, lazily signed and invalidated after auth"
);
assert.ok(
 css.includes("body.profile-page .ui-vatra-albums-grid-001{")&&
 css.includes("body.profile-page .ui-vatra-albums-dialog-001{")&&
 css.includes("body.profile-page .ui-vatra-album-viewer-001{")&&
 css.includes("@media(max-width:440px)")&&
 script.includes("formDialog.showModal()")&&
 script.includes("photoDialog.showModal()")&&
 script.includes('photoClose.setAttribute("aria-label"'),
 "Album UI must be VATRA-scoped, responsive and keyboard-dismissable"
);
assert.ok(
 redisPolicy.includes("never")&&
 redisPolicy.includes("Search requests and")&&
 !script.includes("redis"),
 "Album privacy cannot be implemented by a shared public Redis cache"
);
console.log("VATRA albums: syntax, navigation, CRUD, private Storage, RLS, responsive UI and cache isolation passed.");
