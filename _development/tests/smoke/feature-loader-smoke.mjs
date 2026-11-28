import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext,Script} from "node:vm";
const [loader,profile,feed,albums,gallery,coverEditor,avatarEditor,coverViewer,commentRows,profileHtml,feedHtml,giftsHtml,catalog,viewer]=await Promise.all([
 "assets/js/feature-loader.js","assets/js/profile/profile.js","assets/js/feed.js",
 "assets/js/photo-albums.js","assets/js/profile/profile-gallery.js","assets/js/profile/profile-cover-editor.js","assets/js/profile/profile-avatar-editor.js","assets/js/profile/profile-cover-viewer.js","assets/js/profile/profile-avatar-comment-row.js","profile.html","feed.html","gifts.html",
 "assets/js/gifts/gift-catalog.js","assets/js/gifts/gift-viewer.js"
].map(path=>readFile(path,"utf8")));
for(const source of [loader,profile,feed,albums,gallery,coverEditor,avatarEditor,coverViewer,commentRows,catalog,viewer])
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
 assert.ok(html.includes('assets/js/gifts/gift-catalog.js?rev='),"Gift catalogue must initialize with its page");
 assert.ok(!html.includes('src="assets/js/gifts/gift-viewer.js'),"Viewer must not load eagerly");
 assert.ok(html.includes('assets/js/feature-loader.js?rev='),"Gift-opening pages need shared loader");
}
assert.ok(!profileHtml.includes('href="assets/css/gifts/gifts.css"'),"Profile must defer gift styles");
assert.ok(!profileHtml.includes('src="assets/js/profile/profile-avatar-comment-row.js'),
 "Avatar comment cards must not preload during profile render");
assert.ok(loader.includes('assets/js/profile/profile-avatar-comment-row.js?rev=')&&
 loader.includes('key:"VATRA_PROFILE_AVATAR_COMMENT_ROW"')&&
 profile.includes('rows.length?await window.VATRA_FEATURES.load("avatar-comment-row"):null')&&
 commentRows.includes('window.VATRA_PROFILE_AVATAR_COMMENT_ROW=Object.freeze({create})')&&
 commentRows.includes('client.from("avatar_comments").delete()')&&
 commentRows.includes('.eq("id",item.id).eq("author_id",userId).select("id").maybeSingle()')&&
 commentRows.includes('client.from("avatar_comment_likes").insert('),
 "Comment cards must load on demand and retain ownership-filtered deletion and reactions");
assert.ok(!profileHtml.includes('src="assets/js/profile/profile-cover-viewer.js'),
 "Cover viewer must not load eagerly");
assert.ok(loader.includes('assets/js/profile/profile-cover-viewer.js?rev=')&&
 loader.includes('key:"VATRA_PROFILE_COVER_VIEWER"')&&
 profile.includes('VATRA_FEATURES.load("cover-viewer")')&&
 profile.includes('coverView.addEventListener("click",()=>void openCover())')&&
 coverViewer.includes('window.VATRA_PROFILE_COVER_VIEWER=Object.freeze({mount})')&&
 coverViewer.includes('const flight=coverPhoto.cloneNode(false)'),
 "Cover viewer must preserve its full-screen transition while loading only on click");
assert.ok(!profileHtml.includes('src="assets/js/profile/profile-avatar-editor.js'),
 "Profile must not eagerly load the avatar editor");
assert.ok(loader.includes('assets/js/profile/profile-avatar-editor.js?rev=')&&
 loader.includes('key:"VATRA_PROFILE_AVATAR_EDITOR"')&&
 profile.includes('VATRA_FEATURES.load("avatar-editor")')&&
 profile.includes('startAvatarEditor(fileAvatar.files[0])')&&
 avatarEditor.includes('window.VATRA_PROFILE_AVATAR_EDITOR=Object.freeze({mount})')&&
 avatarEditor.includes('uploadImage(photo,"avatar",sourceFile)')&&
 avatarEditor.includes('visibility:"friends",media_items:uploaded')&&
 avatarEditor.includes('cropLoading=true;release()')&&
 avatarEditor.includes('!finishing&&!cropLoading')&&
 avatarEditor.includes('window.dispatchEvent(new Event("vatra:profile-media-changed"))'),
 "Avatar crop editor loads only after choosing a file and preserves optional post/story publication");
assert.ok(!profileHtml.includes('src="assets/js/profile/profile-cover-editor.js'),
 "Profile must not eagerly load the cover editor");
assert.ok(loader.includes('assets/js/profile/profile-cover-editor.js?rev=')&&
 loader.includes('key:"VATRA_PROFILE_COVER_EDITOR"')&&
 profile.includes('VATRA_FEATURES.load("cover-editor")')&&
 profile.includes('startCoverEditor(fileCover.files[0])')&&
 coverEditor.includes('window.VATRA_PROFILE_COVER_EDITOR=Object.freeze({mount})'),
 "Cover editor must load after choosing an image while retaining the crop UI");
assert.ok(!profileHtml.includes('src="assets/js/profile/profile-gallery.js'),
 "Profile galleries must not be included in the initial script list");
assert.ok(loader.includes('assets/js/profile/profile-gallery.js?rev=')&&
 profile.includes('setupLazyProfileGallery(client,targetId,ownId,user.id)')&&
 profile.includes('VATRA_FEATURES.load("profile-gallery")')&&
 gallery.includes('window.VATRA_PROFILE_GALLERY=Object.freeze({mount})')&&
 gallery.includes('window.addEventListener("vatra:profile-media-changed",()=>{')&&
 gallery.includes('tab.getAttribute("aria-selected")==="true"&&(!refreshedAt||Date.now()-refreshedAt>=REUSE_MS)')&&
 gallery.includes('if(busy){refreshQueued=true;return;}'),
 "Photo, video and clip galleries are initialized only after opening a media tab");
assert.ok(giftsHtml.includes('href="assets/css/gifts/gifts.css"'),"Collection cards retain gift styles");
assert.ok(loader.includes("gift-viewer.js?rev=")&&loader.includes('css:"assets/css/gifts/gifts.css"')&&
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
 profile.includes('const trigger=q("#profile-write-post")')&&
 profile.includes('trigger.addEventListener("click",()=>void openComposer())')&&
 feed.includes('q("#feed-compose-open").addEventListener("click",()=>void open())')&&
 feed.includes('const storyTrigger=q("#feed-create-menu-story")')&&
 feedHtml.includes('data-create-menu')&&profileHtml.includes('data-create-direct')&&
 !profileHtml.includes('data-create-menu')&&
 !feedHtml.includes('id="feed-quick-media"')&&!profileHtml.includes('id="profile-quick-media"')&&
 profile.includes('choose:"#profile-compose-media-choose"')&&feed.includes('choose:"#feed-compose-media-choose"'),
 "Both authenticated routes must defer story and composer loading; Feed offers both actions, profile opens the composer directly, and editor media pickers remain wired");
function fakeBrowser(failFirstStyle=false,preloadedGiftStyle=false,failFirstGalleryScript=false,failFirstAvatarScript=false){
 const window={},requests=[];let rejectOnce=failFirstStyle,rejectGallery=failFirstGalleryScript,rejectAvatar=failFirstAvatarScript;
 const document={
  currentScript:{src:"https://example.com/VATRA/assets/js/feature-loader.js"},
  querySelectorAll(){return preloadedGiftStyle?[{href:"https://example.com/VATRA/assets/css/gifts/gifts.css"}]:[];},
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
     if(el.src.includes("profile-cover-viewer.js"))window.VATRA_PROFILE_COVER_VIEWER={mount(){}};
     if(el.src.includes("profile-avatar-comment-row.js"))window.VATRA_PROFILE_AVATAR_COMMENT_ROW={create(){}};
     if(el.src.includes("photo-albums.js"))window.VATRA_ALBUMS={mount(){}};
     if(el.src.includes("story-editor.js"))window.VATRA_STORY_EDITOR={mount(){}};
     if(el.src.includes("form-select.js"))window.VATRA_FORM_SELECT={wireSelects(){}};
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
assert.equal(browser.requests.length,8,"Independent features load only when requested");
await browser.window.VATRA_FEATURES.load("gift");
assert.equal(browser.requests.length,10,"Gift viewer is requested only on demand");
const galleryTask=browser.window.VATRA_FEATURES.load("profile-gallery");
assert.strictEqual(browser.window.VATRA_FEATURES.load("profile-gallery"),galleryTask,
 "Concurrent gallery loads must share one Promise");
await galleryTask;
assert.equal(browser.requests.length,11,"Gallery JS loads only on demand");
assert.equal(browser.requests.at(-1).tag,"SCRIPT","Gallery has no separate stylesheet");
await browser.window.VATRA_FEATURES.load("profile-gallery");
assert.equal(browser.requests.length,11,"Gallery must not download twice");
await browser.window.VATRA_FEATURES.load("cover-editor");
assert.deepEqual(browser.requests.map(x=>x.tag).slice(-1),["SCRIPT"],
 "Cover editor must not fetch a redundant stylesheet");
assert.equal(browser.requests.length,12,"Cover editor is loaded only when requested");
await browser.window.VATRA_FEATURES.load("cover-editor");
assert.equal(browser.requests.length,12,"The cover editor is reused after its first load");
const avatarTask=browser.window.VATRA_FEATURES.load("avatar-editor");
assert.strictEqual(browser.window.VATRA_FEATURES.load("avatar-editor"),avatarTask,
 "Concurrent avatar editor loads must share one Promise");
await avatarTask;
assert.equal(browser.requests.length,13,"Avatar editor loads only on request");
assert.equal(browser.requests.at(-1).tag,"SCRIPT","Avatar editor reuses existing profile styles");
await browser.window.VATRA_FEATURES.load("avatar-editor");
assert.equal(browser.requests.length,13,"The avatar editor is reused after its first load");
await browser.window.VATRA_FEATURES.load("cover-viewer");
assert.equal(browser.requests.length,14,"Cover fullscreen viewer loads only after a request");
assert.equal(browser.requests.at(-1).tag,"SCRIPT","Cover viewer requires no extra stylesheet");
await browser.window.VATRA_FEATURES.load("cover-viewer");
assert.equal(browser.requests.length,14,"Cover fullscreen viewer is reused after first load");
const commentsTask=browser.window.VATRA_FEATURES.load("avatar-comment-row");
assert.strictEqual(browser.window.VATRA_FEATURES.load("avatar-comment-row"),commentsTask,
 "Concurrent avatar comment card loads share the same Promise");
await commentsTask;
assert.equal(browser.requests.length,15,"Avatar comment cards load only when requested");
assert.equal(browser.requests.at(-1).tag,"SCRIPT","Avatar comment UI has no extra stylesheet");
await browser.window.VATRA_FEATURES.load("avatar-comment-row");
assert.equal(browser.requests.length,15,"Avatar comment cards are reused");
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
// Avatar comment cards must preserve action ownership and cache invalidation.
class CommentElement{
 constructor(tag,cls="",copy=""){
  this.tagName=tag.toUpperCase();this.className=cls;this.textContent=copy;
  this.children=[];this.dataset={};this.style={};this.attributes={};this.listeners={};
  this.disabled=false;this.removed=false;
  const classes=new Set(String(cls).split(/\s+/).filter(Boolean));
  this.classList={
   add(value){classes.add(value);},remove(value){classes.delete(value);},
   contains(value){return classes.has(value);}
  };
 }
 append(...parts){this.children.push(...parts);}
 setAttribute(name,value){this.attributes[name]=String(value);}
 addEventListener(name,callback){this.listeners[name]=callback;}
 remove(){this.removed=true;}
}
const commentWindow={VATRA_PROFILE_CONFIRM:async()=>true,VATRA_VERIFIED:{attach(){}},
 addEventListener(){}};
let timeoutId=0;
const deletionTimers=new Map();
runInNewContext(commentRows,{
 window:commentWindow,
 document:{createElementNS(_namespace,tag){return new CommentElement(tag);}},
 setTimeout(fn){const id=++timeoutId;deletionTimers.set(id,fn);return id;},
 clearTimeout(id){deletionTimers.delete(id);}
},{filename:"profile-avatar-comment-row.js"});
const rowOps=[];let cacheInvalidations=0,deletedNotifications=0;
const apiClient={
 from(table){
  return {
   insert(values){rowOps.push({table,action:"insert",values});return Promise.resolve({error:null});},
   delete(){
    rowOps.push({table,action:"delete"});
    const filter={
     eq(field,value){rowOps.push({table,field,value});return this;},
     select(){return this;},
     async maybeSingle(){return {data:{id:"31"},error:null};},
     then(resolve){resolve({error:null});}
    };
    return filter;
   }
  };
 }
};
const rowItem={id:"31",author_vatra_id:"8",created_at:"2026-01-01T00:00:00Z",
 body:"Тестовий коментар",likes:2};
const context={
 client:apiClient,ownId:"9",userId:"user-8",locale:"uk-UA",
 names:new Map([["8","Автор"]]),images:new Map(),
 ownCommentLikes:new Set(),
 node:(tag,cls,copy)=>new CommentElement(tag,cls,copy),
 t:uk=>uk,memberUrl:id=>"/VATRA/id"+id,dateText:()=>("Дата"),
 feedback:()=>{},clearCommentCache:()=>{cacheInvalidations++;},
 onDelete:()=>{deletedNotifications++;}
};
const otherCard=commentWindow.VATRA_PROFILE_AVATAR_COMMENT_ROW.create(rowItem,context);
assert.equal(otherCard.children.filter(el=>el.className.includes("comment-delete")).length,0,
 "Other members must not get a delete button for an avatar comment");
const likeAction=otherCard.children.find(el=>el.className.includes("comment-like"));
await likeAction.listeners.click();
assert.equal(likeAction.attributes["aria-pressed"],"true","Like action must update only after success");
assert.equal(cacheInvalidations,1,"Comment reactions must invalidate cached comment pages");
const ownCard=commentWindow.VATRA_PROFILE_AVATAR_COMMENT_ROW.create(rowItem,
 {...context,ownId:"8"});
const deleteAction=ownCard.children.find(el=>el.className.includes("comment-delete"));
assert.ok(deleteAction,"Owner must keep the delete action");
await deleteAction.listeners.click();
assert.equal(ownCard.removed,false,"Deleting a comment must allow a short undo window");
const tombstones=ownCard.children.filter(el=>el.className.includes("photo-comment-deleted"));
const undo=tombstones.at(-1)?.children.find(el=>el.className.includes("comment-undo"));
assert.ok(undo,"The deleted comment must offer inline restore");
await undo.listeners.click();
assert.equal(deletionTimers.size,0,"Undo must cancel the pending server deletion");
assert.equal(ownCard.removed,false,"Restoring a comment must keep it visible");
await deleteAction.listeners.click();
assert.equal(deletionTimers.size,1,"A new delete must schedule one bounded operation");
for(const fn of deletionTimers.values())fn();
await new Promise(resolve=>setImmediate(resolve));
assert.equal(ownCard.removed,true,"After the undo interval the comment must disappear");
assert.equal(deletedNotifications,1,"Final deletion must update comment pagination");
assert.ok(rowOps.some(op=>op.table==="avatar_comments"&&op.field==="author_id"&&op.value==="user-8"),
 "Delete query must constrain the author id, not just the comment id");
console.log("VATRA lazy features: no eager payload, CSS before JS, deduplication, deep links, owner-only comment actions and retry passed.");
