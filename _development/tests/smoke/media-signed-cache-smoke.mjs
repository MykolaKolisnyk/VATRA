// VATRA: signed Storage URLs are viewer-bound capabilities, never global assets.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const source=await readFile("assets/js/post-media.js","utf8");
const interactions=await readFile("assets/js/post-interactions.js","utf8");
assert.ok(source.includes("collapsibleBody,signed};"),"Expose the shared signed URL helper");
assert.ok(source.includes("if(missing.length>1)await preSignGallery(client,missing,ttl);")&&source.includes("await preSignVisible(client,imageTiles)"),
 "Only multiple uncached visible previews may trigger bulk signing");
assert.ok(interactions.includes("getSigned(client,kind,path,300)")&&
 interactions.includes('client.storage.from(bucket).createSignedUrl(path,300)'),
 "Comment attachments must still use the helper with a safe direct fallback");

const start=source.indexOf(" const signedURLCaches=new WeakMap();");
const end=source.indexOf(" async function renderStory(",start);
assert.ok(start>=0&&end>start,"Find session-scoped Storage URL cache");
const context={Map,WeakMap,Set,Date,URL,Promise,Number,setTimeout,clearTimeout,
 location:{origin:"https://example.test"},
 bucketFor:kind=>kind==="image"?"post-images":"videos"};
runInNewContext(source.slice(start,end)+
 "\nglobalThis.mediaCacheTest={signed,preSignGallery,preSignVisible,forgetFailedSignedURL};",context);
const {signed,preSignGallery,preSignVisible}=context.mediaCacheTest;
const host="https://cxrcycxrlkufozomsxcs.supabase.co";
const path="7/comments/example.png";
function makeClient(owner,allowedBuckets=["post-images"]){
 let calls=0,bulkCalls=0,authHandler=null;
 const client={
  auth:{onAuthStateChange(handler){authHandler=handler;
   return {data:{subscription:{unsubscribe(){}}}};}},
  storage:{from:bucket=>{
   assert.ok(allowedBuckets.includes(bucket),"Unexpected Storage bucket: "+bucket);
   return {
    async createSignedUrl(item,ttl){
     if(allowedBuckets.includes("videos"))assert.equal(bucket,/\.(mp4|webm)$/.test(item)?"videos":"post-images");
     calls++;
     assert.ok([300,301,3600].includes(ttl));
     return {data:{signedUrl:host+"/storage/v1/object/sign/"+
      bucket+"/"+item+"?token="+owner+"-"+calls},error:null};
    },
    async createSignedUrls(items,ttl){
     bulkCalls++;
     assert.equal(ttl,300);
     return {data:items.map(item=>({path:item,signedUrl:host+
      "/storage/v1/object/sign/"+bucket+"/"+item+"?token="+owner+"-bulk-"+bulkCalls})),
      error:null};
    }
   };
  }}
 };
 return {client,get calls(){return calls;},get bulkCalls(){return bulkCalls;},
  event(name){assert.ok(authHandler,"Auth listener must be installed");
   authHandler(name,{user:null});}};
}
// A single viewer gets single-flight deduplication and a short cache hit.
const a=makeClient("A"),b=makeClient("B");
const [first,parallel]=await Promise.all([
 signed(a.client,"image",path,300),signed(a.client,"image",path,300)]);
assert.equal(a.calls,1,"Concurrent matching requests must share a single RPC");
assert.equal(first,parallel);
assert.equal(await signed(a.client,"image",path,300),first);
assert.equal(a.calls,1,"Reopening an attachment should reuse its signed URL");
// Same path, different client: must be signed again with that viewer's RLS.
const other=await signed(b.client,"image",path,300);
assert.equal(b.calls,1,"Each client must sign its own private media");
assert.notEqual(first,other,"Clients must not share private bearer URLs");
// Same client, new login/logout: a different session must never reuse a URL.
a.event("SIGNED_OUT");
const afterSignOut=await signed(a.client,"image",path,300);
assert.equal(a.calls,2);
assert.notEqual(afterSignOut,first);
a.event("SIGNED_IN");
const afterSignIn=await signed(a.client,"image",path,300);
assert.equal(a.calls,3);
assert.notEqual(afterSignIn,afterSignOut);
await signed(a.client,"image",path,301);
assert.equal(a.calls,4,"Different TTL requests must be isolated");
// INITIAL_SESSION is emitted asynchronously when Supabase registers an auth
// listener; it must not cancel a viewer's first legitimate media request.
{
 let resolve,handler;
 const client={
  auth:{onAuthStateChange(fn){handler=fn;return {data:{subscription:{}}};}},
  storage:{from:()=>({createSignedUrl:()=>new Promise(r=>{resolve=r;})})}
 };
 const pending=signed(client,"image","8/comments/initial.png",300);
 await Promise.resolve();
 handler("INITIAL_SESSION",{user:{id:"same"}});
 resolve({data:{signedUrl:host+"/storage/v1/object/sign/post-images/8/comments/initial.png?token=same"},error:null});
 assert.match(await pending,/token=same$/);
}
// A change of user during signing must reject the old in-flight result.
{
 let resolve,handler;
 const client={
  auth:{onAuthStateChange(fn){handler=fn;return {data:{subscription:{}}};}},
  storage:{from:()=>({createSignedUrl:()=>new Promise(r=>{resolve=r;})})}
 };
 const pending=signed(client,"image","8/comments/wait.png",300);
 await Promise.resolve();
 handler("SIGNED_OUT",{user:null});
 resolve({data:{signedUrl:host+"/storage/v1/object/sign/post-images/8/comments/wait.png?token=old"},error:null});
 await assert.rejects(pending,/Session changed/);
}
// Batch signed thumbnails share the same viewer's cache and dedupe paths.
{
 const c=makeClient("C"),item={media_kind:"image",media_path:"9/posts/photo.jpg"};
 await preSignGallery(c.client,[item,item],300);
 assert.equal(c.bulkCalls,1);
 assert.equal(await signed(c.client,"image",item.media_path,300),
  host+"/storage/v1/object/sign/post-images/9/posts/photo.jpg?token=C-bulk-1");
 assert.equal(c.calls,0,"A batch-signed thumbnail should not need its own RPC");
 c.event("SIGNED_OUT");
 await signed(c.client,"image",item.media_path,300);
 assert.equal(c.calls,1,"A previous viewer's gallery signature must be discarded");
}
{
 let handler,resolve;
 const client={
  auth:{onAuthStateChange(fn){handler=fn;return {data:{subscription:{}}};}},
  storage:{from:()=>({createSignedUrls:()=>new Promise(r=>{resolve=r;}),
   createSignedUrl:async()=>({data:{signedUrl:host+"/storage/v1/object/sign/post-images/9/posts/photo.jpg?token=new"},error:null})})}
 };
 const item={media_kind:"image",media_path:"9/posts/photo.jpg"};
 const pending=preSignGallery(client,[item],300);
 await Promise.resolve();
 handler("SIGNED_IN",{user:{id:"new"}});
 resolve({data:[{path:item.media_path,
  signedUrl:host+"/storage/v1/object/sign/post-images/9/posts/photo.jpg?token=old"}],error:null});
 await pending;
 assert.match(await signed(client,"image",item.media_path,300),/token=new$/,
  "An in-flight batch must not refill a new user's URL cache");
}
// Any Storage error or untrusted host must not be cached.
{
 let attempts=0;
 const client={storage:{from:()=>({
  async createSignedUrl(){
   attempts++;
   if(attempts===1)return {data:null,error:Error("Storage failure")};
   return {data:{signedUrl:host+"/storage/v1/object/sign/post-images/8/comments/item.jpg?token=safe"},error:null};
  }
 })}};
 await assert.rejects(signed(client,"image","8/comments/item.jpg",300));
 assert.match(await signed(client,"image","8/comments/item.jpg",300),/^https:\/\//);
 assert.equal(attempts,2,"Failed Storage calls must never be cached");
 const invalid={storage:{from:()=>({createSignedUrl:async()=>({
  data:{signedUrl:"https://untrusted.example.invalid/media.png"},error:null
 })})}};
 await assert.rejects(signed(invalid,"image","9/comments/unsafe.png",300));
}

{
 let complete,batchCalls=0;
 const paths=[{media_kind:"image",media_path:"9/posts/a.jpg"},
  {media_kind:"image",media_path:"9/posts/b.jpg"}];
 const client={storage:{from:()=>({
  createSignedUrls(items){
   batchCalls++;
   return new Promise(resolve=>{complete=()=>resolve({
    data:items.map(path=>({path,signedUrl:host+
     "/storage/v1/object/sign/post-images/"+path+"?token=shared"})),error:null
   });});
  },
  createSignedUrl(){throw Error("Unexpected duplicate individual signature");}
 })}};
 const first=preSignGallery(client,paths,300);
 const concurrent=preSignGallery(client,[...paths].reverse(),300);
 await Promise.resolve();
 assert.equal(batchCalls,1,"Concurrent matching gallery batches must share one Storage request");
 complete();
 await Promise.all([first,concurrent]);
 for(const item of paths)
  assert.match(await signed(client,"image",item.media_path,300),/token=shared$/);
}

console.log("VATRA signed media cache: viewer isolation, auth invalidation, in-flight races, gallery deduplication and fallback passed.");

{
 let active=0,peak=0,calls=0;
 const client={storage:{from:()=>({async createSignedUrl(path){
  active++;calls++;peak=Math.max(peak,active);
  await new Promise(resolve=>setTimeout(resolve,2));active--;
  return {data:{signedUrl:host+"/storage/v1/object/sign/post-images/"+path+"?token=test"},error:null};
 }})}};
 await Promise.all(Array.from({length:12},(_,i)=>signed(client,"image","9/posts/"+i+".jpg",300)));
 assert.equal(calls,12);
 assert.ok(peak<=4,"Signing must not flood Storage with parallel requests");
}
{
 const isolated={Map,WeakMap,Set,Date,URL,Promise,Number,location:{origin:"https://example.test"},
  setTimeout:(fn)=>setTimeout(fn,5),clearTimeout,bucketFor:()=> "post-images"};
 runInNewContext(source.slice(start,end)+"\nglobalThis.test={signed};",isolated);
 let calls=0;
 const client={storage:{from:()=>({createSignedUrl(path){
  if(++calls===1)return new Promise(()=>{});
  return Promise.resolve({data:{signedUrl:host+"/storage/v1/object/sign/post-images/"+path+"?token=retry"},error:null});
 }})}};
 await assert.rejects(isolated.test.signed(client,"image","9/posts/slow.jpg",300),/timed out/);
 assert.match(await isolated.test.signed(client,"image","9/posts/slow.jpg",300),/token=retry$/);
}
console.log("VATRA media: bounded signing concurrency, timeout and retry verified.");

{
 let handler,finish,calls=0;
 const session={user:{id:"same"},access_token:"same-session"};
 const client={auth:{onAuthStateChange(fn){handler=fn;}},storage:{from:()=>({
  createSignedUrl(path){calls++;return new Promise(resolve=>{finish=()=>resolve({data:{signedUrl:host+"/storage/v1/object/sign/post-images/"+path+"?token=same"},error:null});});}
 })}};
 const pending=signed(client,"image","9/posts/repeated.jpg",300);
 await Promise.resolve();
 handler("INITIAL_SESSION",session);handler("SIGNED_IN",session);
 finish();
 const url=await pending;
 assert.equal(await signed(client,"image","9/posts/repeated.jpg",300),url);
 assert.equal(calls,1,"Repeated identical session must not discard valid media URLs");
}
{
 const item=path=>({media_kind:"image",media_path:path});
 const a=item("9/posts/a.jpg"),b=item("9/posts/b.jpg"),c=item("9/posts/c.jpg");
 const batches=[],complete=[];
 const client={storage:{from:()=>({
  createSignedUrls(paths){batches.push([...paths]);return new Promise(resolve=>complete.push(()=>resolve({
   data:paths.map(path=>({path,signedUrl:host+"/storage/v1/object/sign/post-images/"+path+"?token=overlap"})),error:null
  })));},
  createSignedUrl(){throw Error("A pending batch must not trigger an individual duplicate");}
 })}};
 const first=preSignGallery(client,[a,b],300);
 const second=preSignGallery(client,[b,c],300);
 const single=signed(client,"image",b.media_path,300);
 await Promise.resolve();
 assert.equal(batches.length,2);
 assert.equal(batches.flat().filter(path=>path===b.media_path).length,1);
 complete.forEach(fn=>fn());
 await Promise.all([first,second]);
 assert.match(await single,/token=overlap$/);
}
console.log("VATRA media: repeated session and overlapping batch signing deduplication verified.");

{
 const {forgetFailedSignedURL}=context.mediaCacheTest;
 const c=makeClient("retry"),d=makeClient("other");
 const old=await signed(c.client,"image",path,300);
 const other=await signed(d.client,"image",path,300);
 await forgetFailedSignedURL(c.client,"image",path,old,300);
 const fresh=await signed(c.client,"image",path,300);
 assert.notEqual(fresh,old,"An image download failure must discard its failed URL");
 assert.equal(c.calls,2);
 await forgetFailedSignedURL(c.client,"image",path,old,300);
 assert.equal(await signed(c.client,"image",path,300),fresh,"A late error must not discard a replacement URL");
 assert.equal(await signed(d.client,"image",path,300),other,"Other viewer caches must remain independent");
 assert.equal(d.calls,1);
}
console.log("VATRA media: failed image URL invalidation and fresh retry verified.");


// Inline video requests are deferred; a failed media download returns the
// real retry button, discards only its failed URL, and leaves autoplay denial alone.
{
 const a=source.indexOf(" async function mount(client,post,container){");
 const b=source.indexOf(" async function openPostPhoto(",a);
 assert.ok(a>=0&&b>a);
 const el=tag=>({tag,children:[],dataset:{},isConnected:true,parentNode:null,events:{},
  classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},
  append(...children){for(const c of children){c.parentNode=this;this.children.push(c);}},
  replaceChildren(...children){for(const c of this.children)c.parentNode=null;this.children=[];this.append(...children);},
  addEventListener(k,fn){this.events[k]=fn;},pause(){},load(){},
  play(){return Promise.reject(Error("Autoplay blocked"));}});
 let signedCalls=0,invalidated=[],opened=[];
 const env={document:{createElement:el,createElementNS:(_ns,tag)=>el(tag)},
  tr:(_uk,en)=>en,name:()=>true,
  registerFeedPhotos:(_client,post)=>assert.equal(post.media_kind,"video"),
  signed:async()=>host+"/video?token="+(++signedCalls),
  forgetFailedSignedURL:async(_client,kind,p,url)=>{invalidated.push({kind,p,url});},
  openFullMedia:(url)=>opened.push(url)};
 runInNewContext(source.slice(a,b)+"\nglobalThis.mountVideo=mount;",env);
 const card=el("article");
 await env.mountVideo({}, {author_vatra_id:9,media_kind:"video",media_path:"9/posts/a.mp4"},card);
 const slot=card.children[0],play=slot.children[0];
 assert.equal(signedCalls,0);
 await play.events.click();
 const video=slot.children[0],expand=slot.children[1];
 assert.equal(video.tag,"video");assert.equal(video.controls,true);
 assert.equal(signedCalls,1);
 await Promise.resolve();
 assert.equal(slot.children[0],video,"Autoplay rejection alone is not a download failure");
 video.error={code:2};video.events.error();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(slot.children[0],play);assert.equal(play.disabled,false);
 assert.equal(play.children[1].textContent,"Retry loading video");
 assert.equal(invalidated.length,1);assert.match(invalidated[0].url,/token=1$/);
 await play.events.click();
 assert.equal(signedCalls,2);assert.equal(slot.children[0].tag,"video");
 await slot.children[1].events.click();
 assert.equal(signedCalls,3);assert.match(opened[0],/token=3$/);
}
console.log("VATRA inline video: deferred request, actual download failure, fresh retry and fullscreen renewal passed.");

// Cleanup reports Storage errors without skipping another bucket.
{
 const begin=source.indexOf(" async function removeGallery(");
 const finish=source.indexOf(" async function uploadGallery(",begin);
 assert.ok(begin>=0&&finish>begin);
 const env={};runInNewContext(source.slice(begin,finish)+"\nglobalThis.cleanup=removeGallery;",env);
 const items=[{media_kind:"image",media_path:"a.jpg",preview_path:"a.webp"},{media_kind:"image",media_path:"a.jpg"},{media_kind:"video",media_path:"b.mp4"}];
 const calls=[];
 const client={storage:{from:bucket=>({async remove(paths){calls.push([bucket,...paths]);return {error:bucket==="videos"?Error("Storage unavailable"):null};}})}};
 assert.equal(await env.cleanup(client,items),false);
 assert.equal(JSON.stringify(calls),JSON.stringify([["post-images","a.jpg","a.webp"],["videos","b.mp4"]]));
 assert.equal(await env.cleanup({storage:{from:()=>({remove:()=>Promise.reject(Error("Network"))})}},items),false);
 assert.equal(await env.cleanup({storage:{from:()=>({remove:async()=>({error:null})})}},items),true);
 assert.equal(await env.cleanup(client,[]),true);
}
console.log("VATRA media cleanup: deduplication, Storage errors, rejected requests and empty selection passed.");


// One observer serves all pending photo/gallery targets, including cards
// constructed in a detached fragment. Removed cards never initiate a download.
{
 const begin=source.indexOf(" const pendingMedia=new Map();");
 const finish=source.indexOf(" async function mountGallery(",begin);
 assert.ok(begin>=0&&finish>begin);
 const observers=[],mutations=[],timers=new Map(),microtasks=[],loaded=[];
 let timerId=0;
 class Viewport{
  constructor(callback,options){this.callback=callback;this.options=options;this.targets=new Set();observers.push(this);}
  observe(slot){this.targets.add(slot);}
  unobserve(slot){this.targets.delete(slot);}
  disconnect(){this.targets.clear();}
 }
 class Mounts{
  constructor(callback){this.callback=callback;this.disconnected=false;mutations.push(this);}
  observe(){}
  disconnect(){this.disconnected=true;}
 }
 const env={IntersectionObserver:Viewport,MutationObserver:Mounts,document:{documentElement:{}},
  queueMicrotask:fn=>microtasks.push(fn),setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},
  clearTimeout:id=>timers.delete(id)};
 runInNewContext(source.slice(begin,finish)+"\nglobalThis.watch=watchMediaTarget;",env);
 const watch=(slot,priority)=>env.watch(slot,priority,()=>loaded.push(slot.id));
 const eager={id:"eager",isConnected:true},detached={id:"fragment",isConnected:false};
 const cards=Array.from({length:20},(_,i)=>({id:i,isConnected:true}));
 watch(eager,1);watch(detached,2);cards.forEach(slot=>watch(slot,3));
 assert.equal(microtasks.length,1,"Register a render batch in one microtask");
 microtasks.shift()();
 assert.deepEqual(loaded,["eager"]);
 assert.equal(observers.length,1);
 assert.equal(observers[0].options.rootMargin,"440px 0px");
 assert.equal(observers[0].targets.size,20);
 assert.equal(mutations.length,1);
 assert.equal(timers.size,1);
 detached.isConnected=true;
 mutations[0].callback([{removedNodes:[],addedNodes:[detached]}]);
 assert.deepEqual(loaded,["eager","fragment"]);
 assert.equal(timers.size,0);
 cards[0].isConnected=false;
 mutations[0].callback([{removedNodes:[cards[0]],addedNodes:[]}]);
 assert.equal(observers[0].targets.has(cards[0]),false);
 observers[0].callback([{target:cards[0],isIntersecting:true}]);
 assert.equal(loaded.includes(0),false,"Removed cards cannot start a request");
 observers[0].callback([{target:cards[1],isIntersecting:true},{target:cards[2],isIntersecting:false}]);
 assert.deepEqual(loaded,["eager","fragment",1]);
 assert.equal(observers[0].targets.has(cards[1]),false);
 for(const slot of cards.slice(2))slot.isConnected=false;
 mutations[0].callback([{removedNodes:cards.slice(2),addedNodes:[]}]);
 assert.equal(observers[0].targets.size,0);
 assert.equal(mutations[0].disconnected,true);
 const abandoned={id:"abandoned",isConnected:false};
 watch(abandoned,3);microtasks.shift()();
 const expire=[...timers.values()][0];expire();
 assert.equal(timers.size,0);
 assert.equal(loaded.includes("abandoned"),false);
 assert.equal(mutations[1].disconnected,true);
 env.navigator={connection:{effectiveType:"2g",saveData:false}};
 const slow={id:"slow",isConnected:true},offscreen={id:"offscreen",isConnected:true};
 const previousLoads=loaded.length;
 watch(slow,1);watch(offscreen,3);microtasks.shift()();
 const slowObserver=observers.at(-1);
 assert.equal(slowObserver.options.rootMargin,"0px");
 assert.equal(loaded.length,previousLoads,"Even the first photo waits for viewport on 2G");
 slowObserver.callback([{target:slow,isIntersecting:true},{target:offscreen,isIntersecting:false}]);
 assert.equal(loaded.at(-1),"slow");assert.equal(loaded.includes("offscreen"),false);
 offscreen.isConnected=false;
 mutations.at(-1).callback([{removedNodes:[offscreen]}]);
 env.navigator.connection={effectiveType:"4g",saveData:true};
 const saver={id:"saver",isConnected:true};
 watch(saver,1);microtasks.shift()();
 assert.equal(observers.at(-1).options.rootMargin,"0px");
 assert.equal(loaded.includes("saver"),false,"Save-Data disables eager media");
 saver.isConnected=false;
 mutations.at(-1).callback([{removedNodes:[saver]}]);
 // Non-IntersectionObserver environments retain an eager fallback.
 env.IntersectionObserver=undefined;
 watch({id:"fallback",isConnected:true},3);microtasks.shift()();
 assert.equal(loaded.at(-1),"fallback");
}
console.log("VATRA media: shared viewport observer, batched mounts, removal cleanup and eager fallback passed.");


{
 const c=makeClient("LRU"),pathFor=i=>"9/posts/lru-"+i+".webp";
 for(let i=0;i<256;i++)await signed(c.client,"image",pathFor(i),300);
 const hot=await signed(c.client,"image",pathFor(0),300);
 await signed(c.client,"image",pathFor(256),300);
 assert.equal(await signed(c.client,"image",pathFor(0),300),hot);
 assert.equal(c.calls,257,"Recently accessed URL remains cached after reaching capacity");
 await signed(c.client,"image",pathFor(1),300);
 assert.equal(c.calls,258,"Least recently used URL is evicted first");
 c.event("SIGNED_OUT");
 await signed(c.client,"image",pathFor(0),300);
 assert.equal(c.calls,259,"LRU ordering never bypasses session invalidation");
}
{
 const picker=await readFile("assets/js/comment-picker.js","utf8");
 assert.ok(picker.includes("export const emojiGroups=")&&!picker.includes("stickerFile")&&!picker.includes("export const packs="));
}
console.log("VATRA media: LRU signed URLs and emoji-only picker verified.");

{
 const c=makeClient("burst");
 const tasks=Array.from({length:260},(_,i)=>signed(c.client,"image","9/posts/burst-"+i+".jpg",300));
 await Promise.all([...tasks,signed(c.client,"image","9/posts/burst-0.jpg",300)]);
 assert.equal(c.calls,260,"In-flight signatures survive cache pressure");
 const items=Array.from({length:205},(_,i)=>({media_kind:"image",media_path:"9/posts/batch-"+i+".jpg"}));
 await preSignGallery(c.client,items,300);
 assert.equal(c.bulkCalls,3,"Bulk signatures are limited to groups of 100");
}
{
 let auth,active=0;const resolve=[];
 const c={auth:{onAuthStateChange(fn){auth=fn;}},storage:{from:()=>({createSignedUrl:path=>{
  active++;return new Promise(done=>resolve.push(()=>done({data:{signedUrl:host+"/"+path},error:null})));
 }})}};
 const jobs=Array.from({length:10},(_,i)=>signed(c,"image","9/posts/queued-"+i+".jpg",300));
 const all=Promise.allSettled(jobs);
 await Promise.resolve();assert.equal(active,4);
 auth("SIGNED_OUT",null);
 assert.ok((await Promise.allSettled(jobs.slice(4))).every(x=>x.status==="rejected"));
 resolve.forEach(fn=>fn());
 assert.ok((await all).every(x=>x.status==="rejected"));
 assert.equal(active,4,"Old queued requests must never reach Storage");
}
console.log("VATRA media: bounded bulk requests, cache pressure and queued session cancellation passed.");

// Separate visible cards arriving in one render turn share a single batch.
// Single previews remain single-sign requests, cached items do not rebatch,
// and an auth change before the queued batch dispatch prevents any request.
{
 const c=makeClient("visible"),item=media_path=>({media_kind:"image",media_path});
 const a=item("9/posts/visible-a.jpg"),b=item("9/posts/visible-b.jpg"),d=item("9/posts/visible-c.jpg");
 await Promise.all([preSignVisible(c.client,[a],300),preSignVisible(c.client,[b,a],300),preSignVisible(c.client,[d],300)]);
 assert.equal(c.bulkCalls,1);
 for(const row of [a,b,d])await signed(c.client,"image",row.media_path,300);
 assert.equal(c.calls,0,"Three visible previews must use one Storage request, not three");
 const next=item("9/posts/visible-next.jpg");
 await preSignVisible(c.client,[a,next],300);
 await signed(c.client,"image",next.media_path,300);
 assert.equal(c.bulkCalls,1);assert.equal(c.calls,1,"One uncached preview uses a single signature");
 const queued=preSignVisible(c.client,[item("9/posts/old-a.jpg"),item("9/posts/old-b.jpg")],300);
 c.event("SIGNED_OUT");
 assert.equal(await queued,false);assert.equal(c.bulkCalls,1,"Old viewer's queued previews must not reach Storage");
}
console.log("VATRA visible preview batching: cross-card request reduction, cache hits and session cancellation verified.");

{
 const validation=source.slice(source.indexOf(" const storyPathValid="),source.indexOf(" function linkifyHashtags("));
 const storyEnd=source.indexOf(" function collapsibleBody(",end);
 assert.ok(validation.includes("new RegExp")&&storyEnd>end);
 const env={Map,WeakMap,Set,Date,URL,Promise,Number,setTimeout,clearTimeout,
  location:{origin:"https://example.test"},bucketFor:kind=>kind==="image"?"post-images":"videos",
  validId:id=>/^[1-9][0-9]{0,18}$/.test(String(id||"")),
  tr:uk=>uk,document:{createElement:tag=>({tag,setAttribute(){}})}};
 const networkPolicy=source.slice(source.indexOf(" function mediaConnectionConstrained(){"),source.indexOf(" let mediaIntersection="));
 runInNewContext(validation+networkPolicy+source.slice(start,storyEnd)+"\nglobalThis.test={renderStory,clearStory};",env);
 const {renderStory,clearStory}=env.test;
 const slot=()=>({dataset:{},isConnected:true,children:[],replaceChildren(...items){this.children=items;}});
 const story=n=>({author_vatra_id:"9",media_kind:"image",media_path:"9/stories/00000000-0000-0000-0000-"+String(n).padStart(12,"0")+".jpg"});
 const c=makeClient("story"),one=slot(),two=slot(),three=slot();
 await Promise.all([renderStory(c.client,story(1),one,true),renderStory(c.client,story(2),two,true),renderStory(c.client,story(3),three,true)]);
 assert.equal(c.bulkCalls,1,"Three visible photo stories share one Storage signing request");
 assert.equal(c.calls,0);
 assert.match(one.children[0].src,/story-bulk-1$/);
 assert.match(two.children[0].src,/story-bulk-1$/);
 assert.match(three.children[0].src,/story-bulk-1$/);
 const opened=slot();
 await renderStory(c.client,story(1),opened);
 assert.equal(c.calls,0,"Opening an already signed story reuses its URL");
 assert.equal(opened.children[0].src,one.children[0].src);
 await renderStory(c.client,story(4),slot(),true);
 assert.equal(c.calls,1,"A single missing story uses one individual request");
 const invalid=slot();
 await renderStory(c.client,{...story(5),media_path:"9/posts/invalid.jpg"},invalid,true);
 assert.equal(c.calls,1);assert.equal(invalid.hidden,true);
 const stale=slot(),pending=renderStory(c.client,story(6),stale,true);
 c.event("SIGNED_OUT");await pending;
 assert.equal(c.calls,1,"Signing cancelled before batch dispatch must not reach Storage");
 assert.equal(stale.children.length,0);
 let paused=0,unloaded=0,removed=0;
 const video={pause(){paused++;},removeAttribute(key){assert.equal(key,"src");removed++;},load(){unloaded++;}};
 const closing=slot();closing.children=[video];closing.querySelector=key=>key==="video"?closing.children[0]:null;
 const oldRequest=closing.dataset.storyRequest;
 clearStory(closing);
 assert.notEqual(closing.dataset.storyRequest,oldRequest);
 assert.deepEqual([paused,removed,unloaded],[1,1,1]);
 assert.equal(closing.hidden,true);assert.equal(closing.children.length,0);
 let finish;
 const deferred={storage:{from:()=>({createSignedUrl:()=>new Promise(resolve=>{finish=resolve;})})}};
 const late=slot(),work=renderStory(deferred,story(7),late);
 await Promise.resolve();
 assert.equal(typeof finish,"function");
 clearStory(late);
 finish({data:{signedUrl:host+"/storage/v1/object/sign/post-images/"+story(7).media_path+"?token=late"},error:null});
 await work;
 assert.equal(late.children.length,0,"A closed story must not mount a late signed URL");
 assert.equal(late.hidden,true);
 await renderStory(deferred,story(7),late);
 assert.equal(late.children.length,1,"Reopening works and reuses the signed URL");
 const videoStory={...story(8),media_kind:"video",media_path:story(8).media_path.replace(".jpg",".mp4")};
 const vc=makeClient("video-story",["post-images","videos"]),preview=slot();
 env.navigator={connection:{effectiveType:"2g",saveData:false}};
 await renderStory(vc.client,videoStory,preview,true);
 assert.equal(vc.calls,0,"Constrained video story preview must not request a signed URL");
 assert.equal(preview.hidden,true);
 const explicit=slot();await renderStory(vc.client,videoStory,explicit);
 assert.equal(vc.calls,1,"Opening a story explicitly must still sign its video");
 assert.equal(explicit.children[0]?.tag,"video");
 assert.equal(explicit.children[0]?.controls,true);
 env.navigator.connection={effectiveType:"4g",saveData:true};
 await renderStory(vc.client,{...videoStory,media_path:videoStory.media_path.replace("000008","000009")},slot(),true);
 assert.equal(vc.calls,1,"Data saver must prevent speculative video metadata");
 env.navigator.connection.saveData=false;
 const normal=slot();await renderStory(vc.client,videoStory,normal,true);
 assert.equal(normal.children[0].tag,"video","Normal network retains video previews");
 env.navigator.connection.saveData=true;
 const photo=slot();await renderStory(vc.client,story(10),photo,true);
 assert.equal(vc.calls,2,"Constrained networks must still load photo previews");
 assert.equal(photo.children[0]?.tag,"img");
}
console.log("VATRA story photo previews: shared signing, cache reuse, path validation and session isolation passed.");

{
 const player=await readFile("assets/js/vatra-player.js","utf8");
 assert.doesNotThrow(()=>new Function(player));
 const helper=player.slice(player.indexOf("const clamp="),player.indexOf("function attach("));
 const env={localStorage:{getItem:()=>null}};
 runInNewContext(helper+";globalThis.test={time,volumePreference};",env);
 assert.equal(env.test.time(0),"0:00");assert.equal(env.test.time(65),"1:05");assert.equal(env.test.time(3661),"1:01:01");assert.equal(env.test.time(Infinity),"0:00");
 assert.equal(env.test.volumePreference(),1);
 env.localStorage.getItem=()=>".35";assert.equal(env.test.volumePreference(),.35);
 env.localStorage.getItem=()=>"-3";assert.equal(env.test.volumePreference(),0);
 env.localStorage.getItem=()=>"9";assert.equal(env.test.volumePreference(),1);
 env.localStorage.getItem=()=>"invalid";assert.equal(env.test.volumePreference(),1);
 env.localStorage.getItem=()=>{throw Error("storage blocked");};assert.equal(env.test.volumePreference(),1);
 for(const mode of ["inline","viewer","story"])assert.ok(source.includes('VATRA_PLAYER?.attach(')&&source.includes('mode:"'+mode+'"'));
 const clip=await readFile("assets/js/clips.js","utf8");assert.ok(clip.includes('VATRA_PLAYER?.attach(video,{mode:"clip"})'));
 assert.ok(player.includes("video.controls=false")&&player.includes("requestPictureInPicture")&&player.includes("requestFullscreen"));
 for(const file of ["feed.html","profile.html","club.html","clips.html"]){const html=await readFile(file,"utf8");assert.ok(html.indexOf("assets/js/vatra-player.js?rev=")<html.indexOf("assets/js/post-media.js?rev="));assert.ok(html.includes("assets/css/vatra-player.css?rev="));}
 console.log("VATRA Player: helpers, route wiring, native fallback and modes checked.");
}

{
 const player=await readFile("assets/js/vatra-player.js","utf8");
 const create=tag=>{
  const classes=new Set(),events={},el={tag,children:[],parentNode:null,dataset:{},attrs:{},isConnected:true,style:{setProperty(){}},
   classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,on){if(on)classes.add(k);else classes.delete(k);}},
   setAttribute(k,v){this.attrs[k]=v;},matches(){return false;},addEventListener(k,fn){(events[k]??=[]).push(fn);},
   emit(k,e={}){for(const fn of events[k]||[])fn(e);},click(){this.emit("click");},
   append(...items){for(const item of items){item.remove();item.parentNode=this;this.children.push(item);}},
   prepend(item){item.remove();item.parentNode=this;this.children.unshift(item);},
   insertBefore(item,before){item.remove();item.parentNode=this;this.children.splice(this.children.indexOf(before),0,item);},
   replaceChildren(...items){for(const item of this.children)item.parentNode=null;this.children=[];this.append(...items);},
   remove(){if(this.parentNode){const p=this.parentNode;p.children.splice(p.children.indexOf(this),1);this.parentNode=null;}}
  };return el;
 };
 const state=new Map([["vatra:player-volume",".4"]]);
 const document={documentElement:{lang:"uk"},createElement:create,createElementNS(ns,tag){const el=create(tag);el.namespaceURI=ns;return el;},pictureInPictureEnabled:false};
 const window={VATRA_HOST_ALLOWED:true,getComputedStyle:()=>({getPropertyValue:()=>"1"})};
 const storage={getItem:k=>state.get(k)??null,setItem:(k,v)=>state.set(k,v)};
 const env={document,window,localStorage:storage,setTimeout:()=>1,clearTimeout(){}};
 runInNewContext(player,env);
 const parent=create("div"),video=create("video");Object.assign(video,{controls:true,paused:true,ended:false,volume:1,muted:false,duration:120,currentTime:0,playbackRate:1,play(){this.paused=false;this.emit("play");return Promise.resolve();},pause(){this.paused=true;this.emit("pause");}});parent.append(video);
 const root=window.VATRA_PLAYER.attach(video,{mode:"viewer"});
 assert.ok(root);assert.equal(parent.children[0],root);assert.equal(root.children[0],video);assert.equal(video.controls,false);assert.equal(video.volume,.4);
 const find=(node,part)=>node.className==="vatra-player-"+part+"-001"?node:node.children.map(child=>find(child,part)).find(Boolean);
 const play=find(root,"play"),seek=find(root,"seek"),volume=find(root,"volume"),speed=find(root,"speed"),mute=find(root,"mute");
 play.click();assert.equal(video.paused,false);assert.equal(play.attrs["aria-label"],"Пауза");
 play.click();assert.equal(video.paused,true);
 seek.value="75";seek.emit("input");assert.equal(video.currentTime,75);
 volume.value=".7";volume.emit("input");assert.equal(video.volume,.7);assert.equal(state.get("vatra:player-volume"),"0.7");
 mute.click();assert.equal(video.muted,true);
 speed.value="1.5";speed.emit("change");assert.equal(video.playbackRate,1.5);
 let consumed=false;root.emit("keydown",{target:root,key:"ArrowLeft",preventDefault(){consumed=true;},stopPropagation(){}});assert.equal(video.currentTime,70);assert.equal(consumed,true);
 assert.equal(find(root,"pip").hidden,true);assert.equal(window.VATRA_PLAYER.attach(video),root,"Duplicate attachment must not wrap the video again");
 const fallback=create("video");fallback.controls=true;parent.append(fallback);window.getComputedStyle=()=>({getPropertyValue:()=>""});
 assert.equal(window.VATRA_PLAYER.attach(fallback),null);assert.equal(fallback.parentNode,parent);assert.equal(fallback.controls,true);
 console.log("VATRA Player: actual control events, keyboard seek, volume persistence and missing stylesheet fallback verified.");
}
