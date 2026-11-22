import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext,Script} from "node:vm";
const [loader,profile,feed,albums,profileHtml,feedHtml,giftsHtml,catalog,viewer]=await Promise.all([
 "assets/js/feature-loader.js","assets/js/profile.js","assets/js/feed.js",
 "assets/js/photo-albums.js","profile.html","feed.html","gifts.html",
 "assets/js/gift-catalog.js","assets/js/gift-viewer.js"
].map(path=>readFile(path,"utf8")));
for(const source of [loader,profile,feed,albums,catalog,viewer])
 assert.doesNotThrow(()=>new Script(source),"VATRA feature source must parse");
for(const [page,html] of [["profile",profileHtml],["feed",feedHtml]]){
 assert.ok(html.includes('assets/js/feature-loader.js?rev='),
  page+" must include the shared feature loader");
 for(const asset of [
  'src="assets/js/story-editor.js?rev=','src="assets/js/post-composer-ui.js"',
  'href="assets/css/story-editor.css?rev=','href="assets/css/post-composer.css"'
 ])assert.ok(!html.includes(asset),page+" loads "+asset+" before it is needed");
}
for(const asset of ['src="assets/js/photo-albums.js?rev=','href="assets/css/photo-albums.css?rev='])
 assert.ok(!profileHtml.includes(asset),"Profile must not eagerly load "+asset);
for(const html of [profileHtml,giftsHtml]){
 assert.ok(html.includes('assets/js/gift-catalog.js?rev='),"Gift catalogue must initialize with its page");
 assert.ok(!html.includes('src="assets/js/gift-viewer.js'),"Viewer must not load eagerly");
 assert.ok(html.includes('assets/js/feature-loader.js?rev='),"Gift-opening pages need shared loader");
}
assert.ok(!profileHtml.includes('href="assets/css/gifts.css"'),"Profile must defer gift styles");
assert.ok(giftsHtml.includes('href="assets/css/gifts.css"'),"Collection cards retain gift styles");
assert.ok(loader.includes("gift-viewer.js?rev=")&&loader.includes('css:"assets/css/gifts.css"')&&
 profile.includes('VATRA_FEATURES.load("gift")'),"Gift viewer loads on click");
for(const asset of ["photo-albums.js?rev=","photo-albums.css?rev=",
 "story-editor.js?rev=","story-editor.css?rev=","post-composer-ui.js","post-composer.css"])
 assert.ok(loader.includes(asset),"Loader must own fingerprinted asset "+asset);
assert.ok(profile.includes('setupLazyProfileAlbums(client,ownId,targetId,user.id,isMine)')&&
 profile.includes('if(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(album||"")))activate();')&&albums.includes("activatePhotos();"),
 "Lazy albums must initialize on tab selection and preserve direct album/photo links");
assert.ok(profile.includes('VATRA_FEATURES.load("story")')&&
 feed.includes('VATRA_FEATURES.load("story")')&&
 profile.includes('VATRA_FEATURES.load("composer")')&&
 feed.includes('VATRA_FEATURES.load("composer")')&&
 profile.includes('q("#profile-compose-media")?.click()')&&
 feed.includes('q("#feed-compose-media")?.click()'),
 "Both authenticated routes must load story and composer only on demand, while quick-media file pickers retain user activation");
function fakeBrowser(failFirstStyle=false,preloadedGiftStyle=false){
 const window={},requests=[];let rejectOnce=failFirstStyle;
 const document={
  currentScript:{src:"https://example.com/VATRA/assets/js/feature-loader.js"},
  querySelectorAll(){return preloadedGiftStyle?[{href:"https://example.com/VATRA/assets/css/gifts.css"}]:[];},
  head:{append(el){
   requests.push({tag:el.tagName,src:el.src||el.href});
   queueMicrotask(()=>{
    if(el.tagName==="LINK"&&rejectOnce){rejectOnce=false;el.onerror?.();return;}
    if(el.tagName==="SCRIPT"){
     if(el.src.includes("photo-albums.js"))window.VATRA_ALBUMS={mount(){}};
     if(el.src.includes("story-editor.js"))window.VATRA_STORY_EDITOR={mount(){}};
     if(el.src.includes("post-composer-ui.js"))window.VATRA_COMPOSER_UI={bind(){}};
     if(el.src.includes("gift-viewer.js"))window.VATRA_GIFT_VIEWER={open(){}};
    }
    el.onload?.();
   });
  }},
  createElement(tag){return {tagName:tag.toUpperCase(),dataset:{},remove(){}};}
 };
 runInNewContext(loader,{window,document,URL,Promise,Error});
 return {window,requests};
}
const browser=fakeBrowser();
assert.equal(browser.requests.length,0,"No lazy feature should download at initial load");
const first=browser.window.VATRA_FEATURES.load("albums");
assert.strictEqual(browser.window.VATRA_FEATURES.load("albums"),first,
 "Concurrent feature requests must share one Promise");
await first;
assert.deepEqual(browser.requests.map(r=>r.tag),["LINK","SCRIPT"],
 "Stylesheet must be available before script");
assert.ok(browser.requests.every(r=>r.src.startsWith("https://example.com/VATRA/assets/")),
 "Lazy assets must resolve against the GitHub Pages app root");
await browser.window.VATRA_FEATURES.load("albums");
assert.equal(browser.requests.length,2,"Loaded features must not fetch again");
await browser.window.VATRA_FEATURES.load("story");
await browser.window.VATRA_FEATURES.load("composer");
assert.equal(browser.requests.length,6,"Independent features load only when requested");
await browser.window.VATRA_FEATURES.load("gift");
assert.equal(browser.requests.length,8,"Gift viewer is requested only on demand");
const giftPage=fakeBrowser(false,true);
await giftPage.window.VATRA_FEATURES.load("gift");
assert.deepEqual(giftPage.requests.map(x=>x.tag),["SCRIPT"],"Existing gift stylesheet must be reused");
const retry=fakeBrowser(true);
await assert.rejects(retry.window.VATRA_FEATURES.load("albums"));
await retry.window.VATRA_FEATURES.load("albums");
assert.deepEqual(retry.requests.map(x=>x.tag),["LINK","LINK","SCRIPT"],
 "Failure must recover on retry");
await assert.rejects(browser.window.VATRA_FEATURES.load("unknown"));
console.log("VATRA lazy features: no eager payload, CSS before JS, deduplication, deep links and retry passed.");
