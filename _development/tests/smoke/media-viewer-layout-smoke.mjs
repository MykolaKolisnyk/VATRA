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
 postCss.includes(".ui-vatra-post-expanded-image-001{width:100%;height:100%}")&&
 postCss.includes("object-fit:contain")&&
 !postCss.includes(".ui-vatra-post-media-viewer-content-001::before")&&
 !postCss.includes("--vatra-post-media-backdrop"),
 "Fullscreen post photos must fit their frame against a solid dark background"
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
console.log("VATRA media viewer layout checks passed.");
