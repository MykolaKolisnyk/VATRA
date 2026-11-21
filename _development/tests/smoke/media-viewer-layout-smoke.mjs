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
 postMedia.includes("updateMediaBackdrop(url,kind)")&&
 postMedia.includes("updateMediaBackdrop(url,item.media_kind)")&&
 postCss.includes(".ui-vatra-post-expanded-image-001{width:100%;height:100%}")&&
 postCss.includes("object-fit:contain"),
 "Fullscreen post photos must fill available space without cropping"
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
 profileCss.includes("--vatra-profile-photo-backdrop")&&
 profileCss.includes("object-fit:contain")&&
 profile.includes("Math.min(roomW*.995/mediaImage.naturalWidth,roomH*.995/mediaImage.naturalHeight)"),
 "Avatar photos must preserve their original aspect ratio"
);
console.log("VATRA media viewer layout checks passed.");
