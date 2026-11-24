// VATRA: signed Storage URLs are viewer-bound capabilities, never global assets.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const source=await readFile("assets/js/post-media.js","utf8");
const interactions=await readFile("assets/js/post-interactions.js","utf8");
assert.ok(source.includes("collapsibleBody,signed};"),"Expose the shared signed URL helper");
assert.ok(source.includes("if(imageTiles.length>2)await preSignGallery(client,imageTiles);"),
 "Small galleries must avoid the expensive bulk-sign endpoint");
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
 "\nglobalThis.mediaCacheTest={signed,preSignGallery,forgetFailedSignedURL};",context);
const {signed,preSignGallery}=context.mediaCacheTest;
const host="https://cxrcycxrlkufozomsxcs.supabase.co";
const path="7/comments/example.png";
function makeClient(owner){
 let calls=0,bulkCalls=0,authHandler=null;
 const client={
  auth:{onAuthStateChange(handler){authHandler=handler;
   return {data:{subscription:{unsubscribe(){}}}};}},
  storage:{from:bucket=>{
   assert.equal(bucket,"post-images");
   return {
    async createSignedUrl(item,ttl){
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
