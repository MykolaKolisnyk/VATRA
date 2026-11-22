import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(path,"utf8");
const [postMedia,postInteractions,profile,postCss,profileCss,profileHtml,verifiedScript]=await Promise.all([
 read("assets/js/post-media.js"),
 read("assets/js/post-interactions.js"),
 read("assets/js/profile.js"),
 read("assets/css/feed.css"),
 read("assets/css/profile.css"),
 read("profile.html"),
 read("assets/js/verified.js")
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
 postCss.includes('.vatra-post-comment-send-001:disabled{display:none!important}')&&
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
for(const selector of [
 "body.feed-page .ui-vatra-post-media-side-001 .vatra-post-interactions{",
 "body.feed-page .ui-vatra-post-media-side-001 .vatra-post-comments-panel{",
 "body.feed-page .ui-vatra-post-media-side-001 .vatra-post-comment-form{",
 "body.feed-page :is(.ui-vatra-post-media-author-001,.profile-media-viewer .profile-photo-info){",
 "body.feed-page :is(.ui-vatra-post-media-side-001 .vatra-post-action-row,.profile-media-viewer .profile-photo-actions){",
 "body.feed-page :is(.ui-vatra-post-media-side-001 .vatra-post-comment-form,.profile-media-viewer .profile-photo-comment-form){",
 "body.feed-page :is(.ui-vatra-post-media-footer-001,.ui-profile-photo-footer-001){"
]){
 assert.equal(postCss.split(selector).length-1,1,
  "Media viewer CSS must use one canonical layout rule, without duplicate overrides: "+selector);
}
assert.ok(
 profile.indexOf("uploading=false")>=0&&
 profile.indexOf("uploading=false")<profile.indexOf("if(!canEdit)return;")&&
 profile.includes('if(!avatarDeleteInProgress&&!uploading)mediaDialog.close();'),
 "Visitor avatar close must never access uninitialized owner-only upload state"
);
assert.ok(
 profile.includes('.or("media_kind.eq."+settings.kind+",media_items.cs."+contains)')&&
 profile.includes('JSON.stringify([{media_kind:settings.kind}])')&&
 !profile.includes('query=query.eq("media_kind",settings.kind)')&&
 profile.includes('for(const item of settings.clip?items.slice(0,1):items)')&&
 profile.includes('{...post,media_items:[item]}:post')&&
 profile.includes('window.addEventListener("vatra:profile-media-changed",activate)')&&
 profile.includes('window.dispatchEvent(new Event("vatra:profile-media-changed"))'),
 "Photo, video and clip profile tabs must load every visible post media attachment, including new media_items-only posts and refreshed uploads"
);
assert.ok(
 profile.includes('window.VATRA_VERIFIED?.attach(client,owner,targetId)')&&
 verifiedScript.includes(".vatra-profile-photo-owner-001")&&
 profileCss.includes('body.profile-page .vatra-profile-photo-owner-001{\n display:inline-flex;align-items:center;gap:5px;max-width:100%;min-width:0;')&&
 postCss.includes('body .vatra-verified-name{'),
 "Avatar photo header must reuse the real verified-account badge and match the post author name alignment"
);
console.log("VATRA media viewer layout checks passed.");
