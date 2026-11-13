// VATRA: reuse short-lived Storage signatures across post and comment media.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const source=await readFile("assets/js/post-media.js","utf8");
const interactions=await readFile("assets/js/post-interactions.js","utf8");
assert.ok(source.includes("collapsibleBody,signed};"),"Expose the existing cache without duplicating it");
assert.ok(interactions.includes("getSigned(client,kind,path,300)")&&
 interactions.includes('client.storage.from(bucket).createSignedUrl(path,300)'),
 "Comment attachments must use the shared cache, with a direct fallback");
const start=source.indexOf(" const signedURLs=new Map();");
const end=source.indexOf(" async function renderStory(",start);
assert.ok(start>=0&&end>start,"Find signed Storage URL cache implementation");
const context={Map,Date,URL,Promise,Number,location:{origin:"https://example.test"},
 bucketFor:kind=>kind==="image"?"post-images":"videos"};
runInNewContext(source.slice(start,end)+
 "\nglobalThis.mediaCacheTest={signed};",context);
const signed=context.mediaCacheTest.signed;
const host="https://rjasunoawrxvetwadylh.supabase.co";
let calls=0;
const client={storage:{from:bucket=>({
 createSignedUrl:async(path,ttl)=>{
  calls++;
  assert.equal(bucket,"post-images");
  assert.equal(path,"7/comments/example.png");
  assert.ok([300,301].includes(ttl));
  return {data:{signedUrl:host+"/storage/v1/object/sign/"+
   bucket+"/"+path+"?token="+calls},error:null};
 }
})}};
const a=await Promise.all([
 signed(client,"image","7/comments/example.png",300),
 signed(client,"image","7/comments/example.png",300)
]);
assert.equal(calls,1,"Concurrent callers must share the in-flight signing request");
assert.equal(a[0],a[1]);
assert.equal(await signed(client,"image","7/comments/example.png",300),a[0]);
assert.equal(calls,1,"Repeated comment opens should reuse the cached signature");
await signed(client,"image","7/comments/example.png",301);
assert.equal(calls,2,"Different expiry policies must not share cache keys");
let attempts=0;
const unstable={storage:{from:()=>({
 createSignedUrl:async()=>{
  attempts++;
  if(attempts===1)return {data:null,error:Error("Storage failure")};
  return {data:{signedUrl:host+"/storage/v1/object/sign/media/8/comments/item.jpg?token=safe"},error:null};
 }
})}};
await assert.rejects(signed(unstable,"image","8/comments/item.jpg",300));
assert.match(await signed(unstable,"image","8/comments/item.jpg",300),/^https:\/\//);
assert.equal(attempts,2,"Failed signings must not poison the cache");
const invalid={storage:{from:()=>({createSignedUrl:async()=>({
 data:{signedUrl:"https://untrusted.example.invalid/media.png"},error:null
})})}};
await assert.rejects(signed(invalid,"image","9/comments/unsafe.png",300));
console.log("VATRA signed media cache: reuse, in-flight deduplication, expiration keys, failures and host validation passed.");
