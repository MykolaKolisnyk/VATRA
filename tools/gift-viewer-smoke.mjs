/* VATRA gifts: released First Flame only, offline asset and decorative viewer regression. */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const read=path=>readFile(path,"utf8");
const [js,gifts,profile,css,profileCss]=await Promise.all([
 read("assets/js/gift-viewer.js"),read("assets/js/gifts.js"),
 read("assets/js/profile.js"),read("assets/css/gifts.css"),
 read("assets/css/profile.css")
]);
const png=await readFile("assets/gifts/first-flame.png");
assert.deepEqual(Array.from(png.subarray(0,8)),[137,80,78,71,13,10,26,10],
 "The supplied First flame artwork must be the real PNG asset");
const context={window:{},URL,document:{
 currentScript:{src:"https://example.com/VATRA/assets/js/gift-viewer.js"},
 documentElement:{lang:"uk"}
}};
runInNewContext(js,context);
const {all,byCode,fileUrl}=context.window.VATRA_GIFTS_CATALOG;
assert.equal(all.length,1,"Only the actually released First Flame belongs in the catalogue");
assert.equal(byCode("first_flame").image,"first-flame.png");
assert.equal(fileUrl(byCode("first_flame")),
 "https://example.com/VATRA/assets/gifts/first-flame.png");
assert.equal(all[0].code,"first_flame");
assert.equal(byCode("unreleased"),null);
assert.equal(fileUrl(null),null);
assert.ok(!js.includes("first-flame.svg")&&!profile.includes("first-flame.svg"),
 "No code may point to the replaced SVG");
assert.ok(profile.includes('new URL("assets/gifts/first-flame.png",home)'),
 "Profile previews use the same supplied PNG");
assert.ok(gifts.includes('make("span","vatra-gifts-card-art')&&
 !gifts.includes('make("img","ui-vatra-gifts-card-art'),
 "Collection cards use decorative non-draggable CSS artwork");
assert.ok(profile.includes('node("span","profile-gift-art')&&
 !profile.includes('node("img","profile-gift-art'),
 "Member gift previews must also be decorative");
assert.ok(js.includes('make("span","vatra-gift-viewer-picture')&&
 js.includes('stage.addEventListener("contextmenu",event=>event.preventDefault())'),
 "Full-screen decorative stage must not offer ordinary image interactions");
assert.ok(css.includes("width:100vw;height:100dvh;max-width:none;max-height:none"),
 "Gift dialog must fill the viewport, not cap out at half-screen");
assert.ok(css.includes("grid-template-rows:auto minmax(0,1fr) auto"),
 "Scene must expand between the header and footer");
assert.ok(css.includes('animation:vatraGiftDrift')&&
 css.includes("@media(prefers-reduced-motion:reduce)"),
 "First Flame embers must animate while respecting reduced-motion preference");
for(const shape of ["ember","spark"])
 assert.ok(css.includes('data-shape="'+shape+'"'),"Missing flame effect: "+shape);
assert.equal((css.match(/\.vatra-gift-particle\[data-shape=/g)||[]).length,2,
 "Only First Flame embers and sparks should have particle styles");
assert.ok(!js.includes("themeKinds")&&!js.includes("populateEffects")&&
 !gifts.includes("is-symbol"),"Do not keep future gift engines or symbolic fallbacks");
assert.ok(profileCss.includes("background-position:center;background-size:contain"),
 "Profile gift thumbnails must position original art accurately");
console.log("VATRA gifts: only released First Flame, PNG, embers and fullscreen decorative display verified offline.");
