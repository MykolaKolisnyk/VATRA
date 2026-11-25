import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const read=path=>readFile(path,"utf8");
const [postMedia,postInteractions,profile,profileGallery,postCss,profileCss,profileHtml,verifiedScript,notifications]=await Promise.all([
 read("assets/js/post-media.js"),
 read("assets/js/post-interactions.js"),
 read("assets/js/profile.js"),
 read("assets/js/profile-gallery.js"),
 read("assets/css/feed.css"),
 read("assets/css/profile.css"),
 read("profile.html"),
 read("assets/js/verified.js"),
 read("assets/js/notifications.js")
]);

assert.ok(
 !postMedia.includes("updateMediaBackdrop")&&
 postCss.includes(".ui-vatra-post-expanded-image-001{width:100%;height:100%;flex:0 0 100%;object-position:center}")&&
 postCss.includes("object-fit:contain")&&
 !postCss.includes(".ui-vatra-post-media-viewer-content-001::before")&&
 !postCss.includes("--vatra-post-media-backdrop"),
 "Fullscreen post photos must preserve their full proportions without legacy overlays"
);
assert.ok(
 postInteractions.includes("filterRow.remove();note.remove();side.append(shell)")&&
 postInteractions.includes("panel.insertBefore(filterRow,entries);panel.insertBefore(note,entries)")&&
 postInteractions.includes("dialog.showModal();content.scrollTop=0"),
 "Photo comments must hide sorting and normal comments must start at the top"
);
assert.ok(
 !profileHtml.includes('id="profile-photo-comment-sort"')&&
 !profileHtml.includes('class="profile-photo-comment-filters')&&
 !profile.includes("commentSort.value")&&
 profile.includes('photoCommentSort="relevant"'),
 "Avatar comments must not display sorting controls"
);
assert.ok(
 profileHtml.includes('id="profile-photo-comments-sentinel"')&&
 !profileHtml.includes('id="profile-photo-comments-more"')&&
 profile.includes('photoCommentObserver.observe(photoCommentSentinel)')&&
 profile.includes('photoCommentLoading||!photoCommentHasMore')&&
 !profile.includes("photoCommentsMore")&&
 !profileCss.includes(".vatra-profile-photo-comments-more-001"),
 "Photo comments must load on scroll without a manual Show more button or duplicate requests"
);
assert.ok(
 profile.includes('async function focusLinkedAvatarComment(path,ticket)')&&
 profile.includes('if(!append)await focusLinkedAvatarComment(path,ticket)')&&
 profile.includes('.eq("id",id).eq("owner_vatra_id",targetId).eq("avatar_path",path)')&&
 notifications.includes('url.searchParams.set("image",photoPath.split("/").pop())')&&
 profileCss.includes('.profile-photo-comment.is-linked-comment'),
 "Photo-comment notifications must target the correct historical photo and highlighted comment"
);
assert.ok(
 !profileCss.includes("--vatra-profile-photo-backdrop")&&
 !profile.includes("--vatra-profile-photo-backdrop")&&
 profileCss.includes("object-fit:contain")&&
 profile.includes("Math.min(roomW/mediaImage.naturalWidth,roomH/mediaImage.naturalHeight)"),
 "Portrait and landscape avatar photos must preserve aspect ratio against a solid matte"
);
assert.ok(
 postMedia.includes('ui-vatra-post-media-footer-001')&&
 postMedia.includes('restoreOwnerMenu?.()')&&
 postMedia.includes('tr("Фото з публікації","Photo from a post")')&&
 postInteractions.includes('optionsPanel.prepend(saved)')&&
 postInteractions.includes('row.append(like,commentsButton,share);shell.append(row)')&&
 !postInteractions.includes('row.append(like,commentsButton,share,saved)')&&
 postCss.includes('color:#e43d56;background:transparent')&&
 profileCss.includes('color:#e43d56')&&
 profileHtml.includes('data-social-uk="Збережене"')&&
 profileHtml.includes('class="ui-profile-photo-more-chevron-001"'),
 "Photo viewers must share the footer, preserve owner permissions, move Save into actions, and show red likes"
);
assert.ok(
 profileCss.includes("ui-profile-photo-content-001:hover")&&
 postCss.includes("ui-vatra-post-media-viewer-content-001:hover")&&
 profile.includes("file.size>31457280")&&
 postMedia.includes("limit:31457280")&&
 postInteractions.includes("31457280"),
 "Photo uploads must respect the new 30 MB bucket limit and gallery arrows must fade on hover"
);
assert.ok(
 profile.includes('ui-profile-photo-empty-state-001')&&
 profileCss.includes('.profile-photo-comments.is-empty{display:flex;align-items:center;justify-content:center')&&
 postInteractions.includes('function emptyPhotoComments()')&&
 postInteractions.includes('entries.append(emptyPhotoComments());')&&
 postInteractions.includes('vatra-post-media-empty-icon-001')&&
 postCss.includes('.vatra-post-media-empty-expanded-001{display:none}')&&
 postCss.includes('.vatra-post-comment-list:has(> .vatra-post-comments-empty-001:only-child)')&&
 postCss.includes('.vatra-post-media-empty-expanded-001{display:block}'),
 "Post media must match the original avatar viewer's centered empty-comments illustration without changing normal feed comments"
);
assert.ok(
 postCss.includes('.vatra-post-comments-toggle-001{display:none!important}')&&
 postCss.includes('.vatra-post-shares-count-001{display:none!important}')&&
 postCss.includes('.vatra-post-comment-attach-001{display:none!important}')&&
 postCss.includes('.vatra-post-comment-send-001:disabled{opacity:.42;cursor:not-allowed}')&&
 postCss.includes('.ui-vatra-post-media-more-toggle-001::after')&&
 postCss.includes('grid-template-columns:32px minmax(0,1fr)!important')&&
 postCss.includes('.ui-vatra-post-expanded-image-001{width:100%;height:100%;flex:0 0 100%;object-position:center}'),
 "Fullscreen post media must mirror the original avatar actions, composer, and footer while keeping contained images"
);
assert.ok(
 postCss.includes('body.feed-page .ui-vatra-post-media-viewer-content-001{\n box-sizing:border-box;flex:1 1 0;height:auto;min-height:0;\n padding:0\n}')&&
 postCss.includes('body.feed-page .ui-vatra-post-media-viewer-content-001{padding:0}')&&
 postCss.includes('.ui-vatra-post-expanded-image-001{width:100%;height:100%;flex:0 0 100%;object-position:center}')&&
 postCss.includes('object-fit:contain'),
 "Fullscreen post photos must reach the viewer edges without black padding stripes while preserving their proportions"
);
assert.ok(
 !postMedia.includes("setPhotoBackdrop")&&
 !postMedia.includes("has-photo-backdrop")&&
 !postCss.includes(".has-photo-backdrop")&&
 !postCss.includes("--vatra-post-photo-fill")&&
 !postCss.includes("filter:blur(36px)")&&
 postCss.includes("overflow:hidden;background:#111419")&&
 profileCss.includes("overflow:hidden;background:#111419")&&
 !postCss.includes("html:has(body.feed-page){scrollbar-gutter:stable}")&&
 postCss.includes("object-fit:contain"),
 "Post and avatar viewers must use the same solid dark image matte, without blurred duplicates or the removed right gutter"
);
assert.ok(
 postCss.includes("body.feed-page .ui-vatra-post-media-side-001 .vatra-post-interactions{")&&
 postCss.includes("body.feed-page .ui-vatra-post-media-side-001 .vatra-post-comments-panel{")&&
 postCss.includes("body.feed-page :is(.ui-vatra-post-media-author-001,.profile-media-viewer .profile-photo-info){")&&
 postCss.includes("height:70px;min-height:70px;padding:12px 16px;")&&
 postCss.includes(".ui-vatra-post-media-author-001 .feed-post-avatar{")&&
 postCss.includes("body.feed-page :is(.ui-vatra-post-media-side-001 .vatra-post-action-row,.profile-media-viewer .profile-photo-actions){")&&
 postCss.includes("min-height:50px;gap:8px;margin:0;padding:5px 13px;")&&
 postCss.includes("body.feed-page :is(.ui-vatra-post-media-side-001 .vatra-post-comment-form,.profile-media-viewer .profile-photo-comment-form){")&&
 postCss.includes("min-height:68px;")&&
 postCss.includes("grid-template-columns:32px minmax(0,1fr)!important")&&
 postCss.includes("body.feed-page :is(.ui-vatra-post-media-footer-001,.ui-profile-photo-footer-001){")&&
 postCss.includes("body.feed-page :is(.ui-vatra-post-media-footer-actions-001 > button,.ui-profile-photo-footer-actions-001 button,.ui-profile-photo-footer-actions-001 a){")&&
 postCss.includes("body.feed-page :is(.ui-vatra-post-media-side-001 .vatra-post-comment-list,.profile-avatar-engagement .profile-photo-comments){")&&
 !profileCss.includes("body.profile-page .profile-photo-info{")&&
 !profileCss.includes("body.profile-page .profile-photo-actions{")&&
 profileCss.includes("body.profile-page .profile-photo-comment-form{"),
 "Both media viewers must use the same canonical sidebar header, actions, comments, composer and footer metrics"
);
const responsiveMediaRules=new Set([
 "body.feed-page :is(.ui-vatra-post-media-side-001 .vatra-post-comment-form,.profile-media-viewer .profile-photo-comment-form){",
 "body.feed-page :is(.ui-vatra-post-media-footer-001,.ui-profile-photo-footer-001){"
]);
for(const selector of [
 "body.feed-page .ui-vatra-post-media-side-001 .vatra-post-interactions{",
 "body.feed-page .ui-vatra-post-media-side-001 .vatra-post-comments-panel{",
 "body.feed-page .ui-vatra-post-media-side-001 .vatra-post-comment-form{",
 "body.feed-page :is(.ui-vatra-post-media-author-001,.profile-media-viewer .profile-photo-info){",
 "body.feed-page :is(.ui-vatra-post-media-side-001 .vatra-post-action-row,.profile-media-viewer .profile-photo-actions){",
 ...responsiveMediaRules
]){
 assert.equal(postCss.split(selector).length-1,responsiveMediaRules.has(selector)?2:1,
  "Media viewer CSS may have one canonical desktop rule and one responsive adjustment only: "+selector);
}
assert.ok(
 postCss.includes("body.feed-page :is(.ui-vatra-post-media-side-001 .vatra-post-comment-form,.profile-media-viewer .profile-photo-comment-form){padding:8px 12px!important}")&&
 postCss.includes("body.feed-page :is(.ui-vatra-post-media-footer-001,.ui-profile-photo-footer-001){min-height:47px;padding:6px 10px;gap:5px}"),
 "Shared mobile photo panels must keep their intentional responsive spacing"
);
assert.ok(
 profile.indexOf("uploading=false")>=0&&
 profile.indexOf("uploading=false")<profile.indexOf("if(!canEdit)return;")&&
 profile.includes('if(!avatarDeleteInProgress&&!uploading)mediaDialog.close();'),
 "Visitor avatar close must never access uninitialized owner-only upload state"
);
assert.ok(
 profileGallery.includes('.or("media_kind.eq."+settings.kind+",media_items.cs."+contains)')&&
 profileGallery.includes('JSON.stringify([{media_kind:settings.kind}])')&&
 !profileGallery.includes('query=query.eq("media_kind",settings.kind)')&&
 profileGallery.includes('for(const item of settings.clip?items.slice(0,1):items)')&&
 profileGallery.includes('{...post,media_items:[item]}:post')&&
 profileGallery.includes('window.addEventListener("vatra:profile-media-changed",()=>{')&&
 profileGallery.includes('refreshedAt=0;\n   if(busy){refreshQueued=true;return;}\n   activate();')&&
 profileGallery.includes('if(refreshQueued){refreshQueued=false;if(tab.getAttribute("aria-selected")==="true")void load();}')&&
 profile.includes('window.dispatchEvent(new Event("vatra:profile-media-changed"))')&&
  profile.includes('setupLazyProfileGallery(client,targetId,ownId,user.id)'),
 "Photo, video and clip profile tabs must load every visible post media attachment, including new media_items-only posts and refreshed uploads"
);
assert.ok(
 profile.includes('window.VATRA_VERIFIED?.attach(client,owner,targetId)')&&
 verifiedScript.includes(".vatra-profile-photo-owner-001")&&
 profileCss.includes('body.profile-page .vatra-profile-photo-owner-001{\n display:inline-flex;align-items:center;gap:5px;max-width:100%;min-width:0;')&&
 postCss.includes('body .vatra-verified-name{'),
 "Avatar photo header must reuse the real verified-account badge and match the post author name alignment"
);
assert.ok(
 postMedia.includes('paragraph.append(document.createTextNode(" "),button);')&&
 postMedia.includes('expanded?full.trimEnd():compact')&&
 !postMedia.includes('paragraph.insertAdjacentElement("afterend",button)')&&
 postCss.includes('body.feed-page .feed-post-body > .vatra-feed-post-read-more-001{')&&
 postCss.includes('display:inline;margin:0;padding:0;border:0;background:transparent;')&&
 postCss.includes('body.feed-page:not(.community-page) .feed-post-card > .feed-post-body{')&&
 postCss.includes('font:480 14.5px/1.65 "Onest",system-ui,sans-serif;letter-spacing:.001em')&&
 !profileCss.includes('.profile-posts-section .feed-post-body{'),
 "Feed and Profile must use identical post typography with inline, accessible expand/collapse controls"
);
const interactions=await read("assets/js/post-interactions.js");
const albums=await read("assets/js/photo-albums.js");
assert.ok(
 profileHtml.includes("profile-avatar-engagement ui-profile-avatar-engagement-001 vatra-media-side-unified-001")&&
 profileHtml.includes("profile-photo-info ui-profile-photo-info-001 vatra-media-author-unified-001")&&
 profileHtml.includes("profile-photo-actions ui-profile-photo-actions-001 vatra-media-actions-unified-001")&&
 profileHtml.includes("profile-photo-comments ui-profile-photo-comments-001 vatra-media-comments-unified-001")&&
 profileHtml.includes("profile-photo-comment-form ui-profile-photo-comment-form-001 vatra-media-form-unified-001")&&
 profileHtml.includes("vatra-media-composer-row-unified-001")&&
 (profileHtml.match(/id="profile-photo-comment-send"/g)||[]).length===1&&
 profileHtml.includes("ui-profile-photo-send-icon-001")&&
 profileHtml.includes('class="ui-profile-photo-composer-actions-001" hidden')&&
 profile.includes('q("#profile-photo-comment-send").setAttribute("aria-label"')&&
 profile.includes("ui-profile-photo-empty-state-001 vatra-media-empty-unified-001")&&
 postMedia.includes("ui-vatra-post-media-side-001 vatra-media-side-unified-001")&&
 postMedia.includes("ui-vatra-post-media-author-001 vatra-media-author-unified-001")&&
 postMedia.includes("await verifyAuthor()")&&
 interactions.includes('row.classList.add("vatra-media-actions-unified-001")')&&
 interactions.includes('row.classList.remove("vatra-media-actions-unified-001")')&&
 interactions.includes("vatra-post-comment-list ui-vatra-post-comment-list-001 vatra-media-comments-unified-001")&&
 interactions.includes("vatra-post-comment-form ui-vatra-post-comment-form-001 vatra-media-form-unified-001")&&
 albums.includes("ui-vatra-album-photo-side-001 vatra-media-side-unified-001")&&
 albums.includes("ui-vatra-album-photo-author-001 vatra-media-author-unified-001")&&
 albums.includes("ui-vatra-album-photo-actions-001 vatra-media-actions-unified-001")&&
 albums.includes("ui-vatra-album-comments-list-001 vatra-media-comments-unified-001")&&
 albums.includes("ui-vatra-album-comments-form-001 vatra-media-form-unified-001")&&
 albums.includes("vatra-album-comments-emoji-panel-001")&&
 albums.includes("vatra-media-empty-icon-unified-001")&&
 postCss.includes("body.feed-page .vatra-media-side-unified-001 .vatra-media-author-unified-001{")&&
 postCss.includes("body.feed-page .vatra-media-side-unified-001 .vatra-media-actions-unified-001{")&&
 postCss.includes("body.feed-page .vatra-media-side-unified-001 .vatra-media-comments-unified-001{")&&
 postCss.includes("body.feed-page .vatra-media-side-unified-001 .vatra-media-form-unified-001{")&&
 postCss.includes(".vatra-media-send-unified-001")&&
 !profileHtml.includes('id="profile-photo-comment-send" class="vatra-profile-photo-comment-send-001"'),
 "Avatar, post and album photo viewer must share the same author/actions/empty/composer contract"
);
console.log("VATRA media viewer layout checks passed.");

{
 const start=postMedia.indexOf(" const photoMatteChecks="),end=postMedia.indexOf(" function clearPhotoSlide(",start);
 assert.ok(start>=0&&end>start);
 let alpha=255,tainted=false;
 const ctx={setTimeout,document:{createElement(){return {width:0,height:0,getContext(){return {drawImage(){},getImageData(){if(tainted)throw Error("CORS");return {data:new Uint8ClampedArray([0,0,0,alpha])};}};}};}}};
 runInNewContext(postMedia.slice(start,end)+"\nglobalThis.geometry={photoMatte,fitPhotoViewer};",ctx);
 const {fitPhotoViewer,photoMatte}=ctx.geometry;
 for(const [w,h] of [[1024,1024],[6000,4000],[4000,6000],[7680,4320],[500,1800]]){
  const vars={},dialog={dataset:{},style:{setProperty:(k,v)=>vars[k]=v}},stage={dataset:{}};
  fitPhotoViewer(dialog,stage,{naturalWidth:w,naturalHeight:h},"photo.png");
  const landscape=w/h>=1.35&&w/h<=2.2;
  assert.equal(dialog.dataset.photoSized,landscape?"true":undefined);
  if(landscape){assert.equal(Number(vars["--vatra-photo-ratio"]),w/h);assert.equal(Number(vars["--vatra-photo-inverse"]),h/w);}
 }
 assert.ok(postCss.includes('[data-photo-sized="true"]')&&postCss.includes('var(--vatra-photo-inverse)')&&postCss.includes('var(--vatra-photo-ratio)'));
 const albumsCss=await read("assets/css/photo-albums.css");
 for(const [source,selector] of [[postCss,".vatra-post-media-viewer{"],[profileCss,"body.profile-page .profile-media-viewer{"],[albumsCss,"body.profile-page .ui-vatra-album-viewer-001{"]]){
  const rule=source.slice(source.indexOf(selector)).split("}")[0];
  assert.ok(rule.includes("inset:0")&&rule.includes("width:100vw")&&rule.includes("height:100dvh")&&rule.includes("max-width:none")&&rule.includes("max-height:none")&&rule.includes("margin:0")&&rule.includes("border-radius:0"),"All three photo viewers retain the fullscreen fallback");
 }
 for(const src of ["a.png","a.webp","a.jpg"]){
  alpha=255;assert.equal(await photoMatte({src,naturalWidth:1,naturalHeight:1}),"dark");
  alpha=0;assert.equal(await photoMatte({src,naturalWidth:1,naturalHeight:1}),"white");
  alpha=128;assert.equal(await photoMatte({src,naturalWidth:1,naturalHeight:1}),"white");
 }
 tainted=true;assert.equal(await photoMatte({src:"private.png",naturalWidth:1,naturalHeight:1}),"dark");
 tainted=false;
 assert.ok(postMedia.includes("duration:300")&&postMedia.includes("prefers-reduced-motion: reduce"));
 assert.ok(postMedia.includes("(-sign*distance)")&&postMedia.includes("(sign*distance)"));
 assert.ok(profile.includes("renderGalleryPhoto(delta)")&&albums.includes("openPhoto(next,nextAlbum,dir)"));
 assert.ok(postCss.includes('[data-photo-matte="dark"]{background:#111419}')&&postCss.includes('[data-photo-matte="white"]{background:#fff}'));
 const logoRule=postCss.match(/\.vatra-photo-viewer-brand-001\{[^}]+\}/)?.[0]||"";
 assert.ok(logoRule.includes("background:transparent")&&!logoRule.includes("border-radius")&&!logoRule.includes("box-shadow"),"Viewer logo must not have a white disc or shadow");
 assert.ok(profileCss.includes("overflow:hidden;padding:0"));
}
console.log("VATRA photos: aspect-adaptive landscape viewer, fullscreen fallback, dark matte and directional transitions verified.");

assert.ok(postMedia.includes('authorName.split(/\\s+/)[0]')&&postMedia.includes('function preparePhotoControls(')&&postCss.includes('transition:scale .24s')&&postCss.includes('.vatra-photo-viewer-brand-001'),"Photo viewer controls must be shared and personal captions use first names");
{
 const source=postMedia.match(/function photoZoomLevel\(value,step\)\{[^\n]+\}/)?.[0];assert.ok(source);const context={};runInNewContext(source+";globalThis.zoom=photoZoomLevel;",context);
 let value=1;for(let i=0;i<20;i++)value=context.zoom(value,1);assert.equal(value,3);for(let i=0;i<20;i++)value=context.zoom(value,-1);assert.equal(value,1);assert.equal(context.zoom(1,1),1.25);
}
