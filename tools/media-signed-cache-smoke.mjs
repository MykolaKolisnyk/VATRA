// VATRA: signed Storage URLs are viewer-bound capabilities, never global assets.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const source=await readFile("assets/js/post-media.js","utf8");
const interactions=await readFile("assets/js/post-interactions.js","utf8");
assert.ok(source.includes("collapsibleBody,signed};"),"Expose the shared signed URL helper");
assert.ok(interactions.includes("getSigned(client,kind,path,300)")&&
 interactions.includes('client.storage.from(bucket).createSignedUrl(path,300)'),
 "Comment attachments must still use the helper with a safe direct fallback");

const start=source.indexOf(" const signedURLCaches=new WeakMap();");
const end=source.indexOf(" async function renderStory(",start);
assert.ok(start>=0&&end>start,"Find session-scoped Storage URL cache");
const context={Map,WeakMap,Set,Date,URL,Promise,Number,
 location:{origin:"https://example.test"},
 bucketFor:kind=>kind==="image"?"post-images":"videos"};
runInNewContext(source.slice(start,end)+
 "\nglobalThis.mediaCacheTest={signed,preSignGallery};",context);
const {signed,preSignGallery}=context.mediaCacheTest;
const host="https://rjasunoawrxvetwadylh.supabase.co";
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
console.log("VATRA signed media cache: viewer isolation, auth invalidation, in-flight races, gallery deduplication and fallback passed.");
