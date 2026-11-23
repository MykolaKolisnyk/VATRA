import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext,Script} from "node:vm";
const [loader,profile,feed,albums,gallery,coverEditor,avatarEditor,profileHtml,feedHtml,giftsHtml,catalog,viewer]=await Promise.all([
 "assets/js/feature-loader.js","assets/js/profile.js","assets/js/feed.js",
 "assets/js/photo-albums.js","assets/js/profile-gallery.js","assets/js/profile-cover-editor.js","assets/js/profile-avatar-editor.js","profile.html","feed.html","gifts.html",
 "assets/js/gift-catalog.js","assets/js/gift-viewer.js"
].map(path=>readFile(path,"utf8")));
for(const source of [loader,profile,feed,albums,gallery,coverEditor,avatarEditor,catalog,viewer])
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
assert.ok(!profileHtml.includes('src="assets/js/profile-avatar-editor.js'),
 "Profile must not eagerly load the avatar editor");
assert.ok(loader.includes('assets/js/profile-avatar-editor.js?rev=')&&
 loader.includes('key:"VATRA_PROFILE_AVATAR_EDITOR"')&&
 profile.includes('VATRA_FEATURES.load("avatar-editor")')&&
 profile.includes('startAvatarEditor(fileAvatar.files[0])')&&
 avatarEditor.includes('window.VATRA_PROFILE_AVATAR_EDITOR=Object.freeze({mount})')&&
 avatarEditor.includes('uploadImage(photo,"avatar",sourceFile)')&&
 avatarEditor.includes('visibility:"friends",media_items:uploaded')&&
 avatarEditor.includes('window.dispatchEvent(new Event("vatra:profile-media-changed"))'),
 "Avatar crop editor loads only after choosing a file and preserves optional post/story publication");
assert.ok(!profileHtml.includes('src="assets/js/profile-cover-editor.js'),
 "Profile must not eagerly load the cover editor");
assert.ok(loader.includes('assets/js/profile-cover-editor.js?rev=')&&
 loader.includes('key:"VATRA_PROFILE_COVER_EDITOR"')&&
 profile.includes('VATRA_FEATURES.load("cover-editor")')&&
 profile.includes('startCoverEditor(fileCover.files[0])')&&
 coverEditor.includes('window.VATRA_PROFILE_COVER_EDITOR=Object.freeze({mount})'),
 "Cover editor must load after choosing an image while retaining the crop UI");
assert.ok(!profileHtml.includes('src="assets/js/profile-gallery.js'),
 "Profile galleries must not be included in the initial script list");
assert.ok(loader.includes('assets/js/profile-gallery.js?rev=')&&
 profile.includes('setupLazyProfileGallery(client,targetId,ownId,user.id)')&&
 profile.includes('VATRA_FEATURES.load("profile-gallery")')&&
 gallery.includes('window.VATRA_PROFILE_GALLERY=Object.freeze({mount})')&&
 gallery.includes('window.addEventListener("vatra:profile-media-changed",activate)'),
 "Photo, video and clip galleries are initialized only after opening a media tab");
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
function fakeBrowser(failFirstStyle=false,preloadedGiftStyle=false,failFirstGalleryScript=false,failFirstAvatarScript=false){
 const window={},requests=[];let rejectOnce=failFirstStyle,rejectGallery=failFirstGalleryScript,rejectAvatar=failFirstAvatarScript;
 const document={
  currentScript:{src:"https://example.com/VATRA/assets/js/feature-loader.js"},
  querySelectorAll(){return preloadedGiftStyle?[{href:"https://example.com/VATRA/assets/css/gifts.css"}]:[];},
  head:{append(el){
   requests.push({tag:el.tagName,src:el.src||el.href});
   queueMicrotask(()=>{
    if(el.tagName==="LINK"&&rejectOnce){rejectOnce=false;el.onerror?.();return;}
    if(el.tagName==="SCRIPT"){
     if(el.src.includes("profile-gallery.js")&&rejectGallery){
      rejectGallery=false;el.onerror?.();return;
     }
     if(el.src.includes("profile-gallery.js"))window.VATRA_PROFILE_GALLERY={mount(){}};
     if(el.src.includes("profile-cover-editor.js"))window.VATRA_PROFILE_COVER_EDITOR={mount(){}};
     if(el.src.includes("profile-avatar-editor.js")&&rejectAvatar){
      rejectAvatar=false;el.onerror?.();return;
     }
     if(el.src.includes("profile-avatar-editor.js"))window.VATRA_PROFILE_AVATAR_EDITOR={mount(){}};
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
const galleryTask=browser.window.VATRA_FEATURES.load("profile-gallery");
assert.strictEqual(browser.window.VATRA_FEATURES.load("profile-gallery"),galleryTask,
 "Concurrent gallery loads must share one Promise");
await galleryTask;
assert.equal(browser.requests.length,9,"Gallery JS loads only on demand");
assert.equal(browser.requests.at(-1).tag,"SCRIPT","Gallery has no separate stylesheet");
await browser.window.VATRA_FEATURES.load("profile-gallery");
assert.equal(browser.requests.length,9,"Gallery must not download twice");
await browser.window.VATRA_FEATURES.load("cover-editor");
assert.deepEqual(browser.requests.map(x=>x.tag).slice(-1),["SCRIPT"],
 "Cover editor must not fetch a redundant stylesheet");
assert.equal(browser.requests.length,10,"Cover editor is loaded only when requested");
await browser.window.VATRA_FEATURES.load("cover-editor");
assert.equal(browser.requests.length,10,"The cover editor is reused after its first load");
const avatarTask=browser.window.VATRA_FEATURES.load("avatar-editor");
assert.strictEqual(browser.window.VATRA_FEATURES.load("avatar-editor"),avatarTask,
 "Concurrent avatar editor loads must share one Promise");
await avatarTask;
assert.equal(browser.requests.length,11,"Avatar editor loads only on request");
assert.equal(browser.requests.at(-1).tag,"SCRIPT","Avatar editor reuses existing profile styles");
await browser.window.VATRA_FEATURES.load("avatar-editor");
assert.equal(browser.requests.length,11,"The avatar editor is reused after its first load");
const avatarRetry=fakeBrowser(false,false,false,true);
await assert.rejects(avatarRetry.window.VATRA_FEATURES.load("avatar-editor"));
await avatarRetry.window.VATRA_FEATURES.load("avatar-editor");
assert.deepEqual(avatarRetry.requests.map(x=>x.tag),["SCRIPT","SCRIPT"],
 "Avatar editor retries after an interrupted script request");
const galleryRetry=fakeBrowser(false,false,true);
await assert.rejects(galleryRetry.window.VATRA_FEATURES.load("profile-gallery"));
await galleryRetry.window.VATRA_FEATURES.load("profile-gallery");
assert.deepEqual(galleryRetry.requests.map(x=>x.tag),["SCRIPT","SCRIPT"],
 "Gallery network failures can recover on the next media-tab action");
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
