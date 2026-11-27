import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext,Script} from "node:vm";

const [script,css,html,profile,commentRow,sql,indexes,summarySql,redisPolicy,featureLoader]=await Promise.all([
 "assets/js/photo-albums.js","assets/css/photo-albums.css","profile.html",
 "assets/js/profile.js","assets/js/profile-avatar-comment-row.js",
 "_development/supabase/migrations/20261122122000_photo_albums_private_storage.sql",
 "_development/supabase/migrations/20261122123500_album_foreign_key_indexes.sql",
 "_development/supabase/migrations/20261122134500_photo_album_summary_view.sql",
 "_development/docs/redis-cache-policy.md","assets/js/feature-loader.js"
].map(path=>readFile(path,"utf8")));
assert.doesNotThrow(()=>new Script(script),"Album script must parse as JavaScript");
const window={};
runInNewContext(script,{window});
assert.equal(typeof window.VATRA_ALBUMS?.mount,"function","Album module must export a single mount API");

assert.ok(
 !html.includes('src="assets/js/photo-albums.js?rev=')&&
 !html.includes('href="assets/css/photo-albums.css?rev=')&&
 html.includes('assets/js/feature-loader.js?rev=')&&
 featureLoader.includes('assets/js/photo-albums.js?rev=')&&
 featureLoader.includes('assets/css/photo-albums.css?rev=')&&
 profile.includes('setupLazyProfileAlbums(client,ownId,targetId,user.id,isMine)')&&
 profile.includes('window.VATRA_FEATURES.load("albums")')&&
 script.includes('section.dataset.vatraAlbumsReady="true"'),
 "Photo albums must initialize once using existing authenticated profile state"
);
assert.ok(html.includes('data-profile-archive="archive-photos"')&&html.includes('data-profile-panel="archive-photos"')&&
 script.includes("tabs.append(postTab,albumTab)")&&!script.includes("const archiveTab=")&&
 script.includes("archiveSection.append(archivePane)")&&script.includes("archiveSection.prepend(bulk)")&&
 profile.includes('["saved","archive-stories","archive-posts","archive-photos"].includes(name)'),
 "Photo archive must be a separate owner-only profile archive section with existing bulk actions");
for(const marker of [
 'photo_albums").insert','photo_albums").update','photo_albums").delete',
 'album_photos").insert','album_photos").delete','photo_album_comments").insert',
 'photo_album_comments").delete','show_in_photos','visibility','comments_mode',
 'createSignedUrl(path,120)','upload(path,file,','remove([row.media_path])',
 'window.VATRA_OPEN_PROFILE_AVATAR','navigator.clipboard.writeText(albumUrl(album.id))',
 'const requested=photoParams.get("album")'
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
 script.includes('loadFeaturedPage(true)')&&
 script.includes('loadAvatarPage(true)')&&
 script.includes("const PAGE_SIZE=18,FEATURED_LIMIT=12")&&
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

const photoSchema=await readFile("_development/supabase/migrations/20261122140000_photo_per_image_comments_personal_album.sql","utf8");
const media=await readFile("assets/js/post-media.js","utf8");
const gallery=await readFile("assets/js/profile-gallery.js","utf8");
assert.ok(
 script.includes('t("Фотографії","Photos")')&&
 !script.includes('t("Знімки","Photos")')&&
 script.includes('state.uploadMode="personal"')&&
 script.includes("ensurePersonalAlbum()")&&
 script.includes("is_personal:true")&&
 script.includes('photo_id:photo?.id||null')&&
 script.includes('client.from("album_photo_likes")')&&
 script.includes('commentsList.prepend(pending)')&&
 script.includes('commentsList.prepend(commentRow')===false&&
 script.includes('const PAGE_SIZE=18,FEATURED_LIMIT=12')&&
 gallery.includes("openPostPhoto(client,post,item,{ownId,userId,items:photoEntries,removePhoto,hasMore:()=>hasMore,loadMore:()=>load(true)})")&&
 profile.includes("window.VATRA_OPEN_PROFILE_AVATAR=path=>")&&
 media.includes("openPostPhoto,photoNavigation,photoMenuIcon,renderStory"),
 "Source-aware photographs, direct uploads, per-photo interactions and incremental loading must remain intact"
);
assert.ok(
 photoSchema.includes("add column if not exists is_personal")&&
 photoSchema.includes("add column if not exists photo_id uuid references public.album_photos(id) on delete cascade")&&
 photoSchema.includes("vatra_album_comment_photo_matches_album")&&
 photoSchema.includes("create table if not exists public.album_photo_likes")&&
 photoSchema.includes("alter table public.album_photo_likes enable row level security")&&
 photoSchema.includes("security_invoker = true")&&
 !photoSchema.includes("security definer"),
 "Photo source metadata, per-photo comment relationship and like RLS migration must be present"
);

const actionsMigration=await readFile("_development/supabase/migrations/20261122154500_photo_actions_pin_owner_update.sql","utf8");
assert.ok(
 script.includes('vatra-post-media-viewer ui-vatra-album-viewer-001')&&
 script.includes('ui-vatra-post-media-side-001 ui-vatra-album-photo-side-001')&&
 script.includes("photoSide.append(commentsBox)")&&
 script.includes('t("Завантажити","Download")')&&
 script.includes('t("Перейти до альбому","Go to album")')&&
 script.includes('t("Закріпити","Pin")')&&
 script.includes('t("Видалити","Delete")')&&
 script.includes('ui-vatra-album-tile-menu-001')&&
 script.includes('photoActionButtons(photo,album)')&&
 script.includes('client.storage.from(BUCKET).download(row.media_path)')&&
 script.includes('state.pendingPhotoId')&&
 script.includes('photo_album_comments")')&&
 css.includes('.ui-vatra-album-photo-side-001')&&
 css.includes('.ui-vatra-album-tile-menu-items-001'),
 "Standalone photos must use consistent photo viewer layout with VK-style photo actions on tiles and in full screen"
);
assert.ok(
 script.includes("uploadBar.value=done+failed")&&
 script.includes('status.textContent=t("Завантажується…","Uploading…")')&&
 script.includes('uploadGrid.replaceChildren()')&&
 script.includes('photoLoading.hidden=false')&&
 script.includes('uploadPreviewUrls=[]'),
 "Photo upload and image-loading progress must be real and clean up previews"
);
assert.ok(
 actionsMigration.includes("pinned_at")&&
 actionsMigration.includes("vatra_album_photos_owner_update")&&
 actionsMigration.includes("vatra_album_photo_preserve_source")&&
 actionsMigration.includes("raise exception 'Photo source is immutable'")&&
 !actionsMigration.includes("security definer"),
 "Pinned photos must retain source identity and owner-only RLS updates"
);
assert.ok(!profile.includes("updateAvatarProgress")&&!html.includes('id="profile-avatar-upload-progress"'),"A single avatar must not display a file count");
assert.ok(commentRow.includes('client.from("avatar_comments").delete()')&&
 commentRow.includes('.eq("id",item.id).eq("author_id",userId).select("id").maybeSingle()')&&
 profile.includes('rows.length?await window.VATRA_FEATURES.load("avatar-comment-row"):null')&&
 profile.includes('avatarCommentPages.clear()')&&
 !html.includes('id="profile-photo-download"')&&!html.includes('id="profile-photo-open-album"'),
 "Avatar viewer must not include album/download actions");
assert.ok(
 media.includes('function mediaDescription({kind,limit,translate=tr,onSave,onError})')&&
 media.includes('if(post&&kind==="image"&&attachmentCount===1)')&&
 media.includes('description.paint(post.body,mine)')&&
 media.includes('client.from("feed_posts").update({body}).eq("id",post.id).eq("author_vatra_id",ownerId)')&&
 script.includes('VATRA_POST_MEDIA.mediaDescription({kind:"album-photo"')&&
 script.includes('photoCaptionEditor.paint(state.currentPhoto?.caption,isMine)')&&
 script.includes('client.from("album_photos").update({caption}).eq("id",row.id).eq("owner_vatra_id",ownId)')&&
 script.includes('photoCaptionEditor.reset()')&&
 profile.includes('VATRA_POST_MEDIA.mediaDescription({kind:"avatar-photo"')&&
 profile.includes('avatarCaption.paint(data?.caption,canEdit)')&&
 profile.includes('upsert({owner_vatra_id:ownId,avatar_path:path,caption}')&&
 profile.includes('avatarCaption.reset()')&&
 profile.includes("VATRA_USE_PHOTO_AS_AVATAR"),
 "Single-post, album and avatar descriptions must share the editor, preserve source identity, owner-scoped writes and avatar selection"
);

const feedCss=await readFile("assets/css/feed.css","utf8");
assert.ok(
 script.includes('const portrait=make("a","vatra-album-comment-avatar-001")')&&
 script.includes('void paintAvatars(portraits,ticket)')&&
 script.includes('window.VATRA_AVATAR.paths(client,ids)')&&
 script.includes('const commentsAvatar=make("span","vatra-album-comment-composer-avatar-001")')&&
 script.includes('void paintComposerAvatar()')&&
 script.includes('photoAuthorImage.classList.toggle("has-photo"')&&
 css.includes(".vatra-album-comment-avatar-001")&&
 css.includes(".vatra-album-comment-composer-avatar-001")&&
 css.includes(".ui-vatra-album-photo-author-001")&&
 media.includes('header.append(avatar,author);host.append(header)')&&
 media.includes('const head=container?.querySelector(".feed-post-header")||postCard?.querySelector(".feed-post-header")')&&
 feedCss.includes(".vatra-post-comment-send-001:disabled{opacity:.42;cursor:not-allowed}")&&
 !feedCss.includes(".vatra-post-comment-send-001:disabled{display:none!important}"),
 "All photo viewer contexts must preserve author portraits, composer controls and visible send buttons"
);
assert.ok(
 script.includes('commentsForm.append(commentsComposer,emojiPanel)')&&
 script.includes('commentsInput.addEventListener("input"')&&
 script.includes('commentsSend.disabled=!commentsInput.value.trim()')&&
 css.includes("body.profile-page .ui-vatra-album-comments-dialog-001 .vatra-album-comments-composer-001{")&&
 css.includes("body.profile-page .ui-vatra-album-comments-dialog-001 .vatra-media-send-unified-001:disabled{")&&
 css.includes("body.profile-page .ui-vatra-album-comments-dialog-001 .vatra-album-comments-emoji-panel-001[hidden]"),
 "Standalone album comment modal must retain a compact, accessible composer after photo-viewer unification"
);
console.log("VATRA albums: syntax, navigation, CRUD, private Storage, RLS, responsive UI and cache isolation passed.");

assert.ok(profile.includes('from("avatar_photo_descriptions")')&&profile.includes("loadAvatarDescription(path)"),"Avatar descriptions must be keyed by source image");
assert.ok(script.includes("selectedPhotos=new Map()")&&script.includes("selectPhoto(photo)")&&script.includes("bulkDelete"),"Album multi-selection must manage actual photo rows");

const photoActions=await readFile("_development/supabase/migrations/20261124065500_avatar_photo_descriptions.sql","utf8");
assert.ok(photoActions.includes("on update cascade on delete cascade")&&photoActions.includes("Moving a photo must not expand its audience")&&photoActions.includes("vatra_album_photos_archive_visibility"),"Logical moves preserve discussion and never widen the audience; archive is owner-only");
assert.ok(script.includes("chooseDestination")&&script.includes("loadArchive")&&script.includes('update({album_id:select.value,pinned_at:null})'),"Photo move and archive must use owner-scoped writes");

assert.ok(gallery.includes("vatra:select-post-photo")&&script.includes('source:"avatar"')&&script.includes("downloadSource(row)")&&script.includes("bulkMove.hidden=bulkArchive.hidden=mixed")&&script.includes("deleteSelected"),"Mixed source selection must allow safe source-specific deletion");

assert.ok(media.includes("photoNavigation")&&gallery.includes("items:photoEntries")&&gallery.includes("loadMore:()=>load(true)")&&script.includes("photoNavigation(photoContent"),"All photo viewers must navigate their source gallery");
assert.ok(script.includes("if(!await window.VATRA_POST_MEDIA.removeGallery(")&&script.includes("if(removed.error)throw removed.error;"),"Photo deletion must report Storage cleanup failures instead of false success");


// Profile gallery retry buttons must remain actionable; quick tab returns reuse
// the existing authenticated page, while a media mutation forces a fresh read.
{
 let requests=0,opened=0,observer,change;
 const el=()=>({attrs:new Map(),children:[],listeners:{},hidden:false,
  setAttribute(k,v){this.attrs.set(k,v)},getAttribute(k){return this.attrs.get(k)},
  append(...nodes){this.children.push(...nodes)},replaceChildren(...nodes){this.children=nodes},
  addEventListener(k,fn){this.listeners[k]=fn},dispatchEvent(){},closest(){return null}
 });
 const tab=el(),list=el(),empty=el(),more=el();
 tab.setAttribute("aria-selected","true");
 const elements={"#profile-tab-photos":tab,"#profile-photo-gallery":list,"#profile-photos-empty":empty,"#profile-photos-more":more};
 const mockWindow={VATRA_POST_MEDIA:{mount:async()=>{},openPostPhoto:()=>{opened++}},
  addEventListener(k,fn){if(k==="vatra:profile-media-changed")change=fn}};
 class Observer{constructor(fn){observer=fn}observe(){}}
 const post={id:"p",author_vatra_id:2,media_kind:"image",media_path:"2/posts/photo.jpg"};
 const client={from(){requests++;const chain={};for(const k of ["select","eq","or","is","order"])chain[k]=()=>chain;
  chain.range=async()=>({data:[post],error:null});return chain}};
 runInNewContext(gallery,{window:mockWindow,MutationObserver:Observer,CustomEvent:class{constructor(type){this.type=type}}});
 mockWindow.VATRA_PROFILE_GALLERY.mount({client,targetId:2,ownId:1,userId:"u",q:id=>elements[id],node:el,t:(uk,en)=>en,home:"https://example.test/"});
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 await settle();
 assert.equal(requests,1);
 assert.equal(list.children.length,1);
 const click=list.children[0].listeners.click;
 function hit(classes,busy=false,image=false){
  let stopped=false;
  const trigger={classList:{contains:c=>classes.includes(c)},getAttribute:()=>busy?"true":null,querySelector:()=>image?{}:null};
  click({target:{closest:()=>trigger},preventDefault(){stopped=true},stopPropagation(){},stopImmediatePropagation(){}});
  return stopped;
 }
 assert.equal(hit(["vatra-post-gallery-tile","is-gallery-unavailable"]),false);
 assert.equal(hit(["vatra-post-gallery-tile","is-gallery-ready"],true),false);
 assert.equal(hit(["vatra-feed-post-media-open-001"]),false);
 assert.equal(opened,0);
 assert.equal(hit(["vatra-post-gallery-tile","is-gallery-ready"]),true);
 assert.equal(hit(["vatra-feed-post-media-open-001"],false,true),true);
 assert.equal(opened,2);
 tab.setAttribute("aria-selected","false");observer();
 tab.setAttribute("aria-selected","true");observer();
 await settle();assert.equal(requests,1,"Quick tab return must not repeat the page query");
 change();await settle();assert.equal(requests,2,"Media change must invalidate gallery reuse");
 tab.setAttribute("aria-selected","false");change();await settle();assert.equal(requests,2,"Hidden tab must not fetch");
 tab.setAttribute("aria-selected","true");observer();await settle();assert.equal(requests,3,"Reopened invalidated gallery must refresh");
}
console.log("VATRA profile gallery: retry routing, quick tab reuse and mutation invalidation passed.");

{
 const profile=await readFile("assets/js/profile.js","utf8");
 const html=await readFile("profile.html","utf8");
 const css=await readFile("assets/css/photo-albums.css","utf8");
 const login=await readFile("assets/css/sign-in.css","utf8");
 assert.ok(gallery.includes('new URL("id"+targetId+"?post="'),"Gallery must link to the author's profile publication");
 assert.ok(profile.includes('if(focusPost)query=query.eq("id",focusPost)')&&profile.includes('?.("posts")'),"Profile deep link must select the publication tab and fetch the exact post");
 for(const id of ["messenger","gift","hide-news","post-notice","story-notice","remove-friend"])assert.ok(html.includes('id="profile-'+id+'"'));
 assert.ok(profile.includes("friendAction.hidden=accepted;messenger.hidden=false;gift.hidden=!accepted;"));
 assert.ok(css.includes(".vatra-album-select-photo-001[aria-pressed=true]::before"));
 assert.ok(gallery.includes('tile.addEventListener("pointerleave"'));
 assert.ok(login.includes("margin-block-start:clamp(7px,1.2vh,16px)"));
}
console.log("VATRA profile: deep-linked photos, selection marks, contact actions and responsive login copy verified.");
