import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(path,"utf8");
const [postMedia,postInteractions,profile,postCss,profileCss,profileHtml]=await Promise.all([
 read("assets/js/post-media.js"),
 read("assets/js/post-interactions.js"),
 read("assets/js/profile.js"),
 read("assets/css/feed.css"),
 read("assets/css/profile.css"),
 read("profile.html")
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
console.log("VATRA media viewer layout checks passed.");
