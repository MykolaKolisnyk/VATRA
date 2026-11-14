// VATRA regression: engagement RPC should not repeat within short same-client windows.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const full=await readFile("assets/js/post-interactions.js","utf8");
const start=full.indexOf(" const engagementQueryCache=new WeakMap(),engagementAuthBound=new WeakSet();");
const end=full.indexOf("function appendAudience(",start);
assert.ok(start>=0&&end>start,"Find the exact engagement implementation");
const isolated=full.slice(start,end)+"\nglobalThis.cacheTest={prefetchEngagement,invalidateEngagement};";
const uuid="94fe25a7-77d5-4abf-b077-cdd932161a52";
const request=[{id:uuid,kind:"person"}];
function instance(){
 const ctx={validUUID:value=>typeof value==="string"&&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)};
 runInNewContext(isolated,ctx);
 return ctx.cacheTest;
}
{
 const c=instance();
 let requests=0;
 const client={rpc:async(name,args)=>{
  assert.equal(name,"post_engagement_page");
  assert.equal(args.p_posts.length,1);
  requests++;
  return {data:[{post_kind:"person",post_id:uuid,like_count:2,
   comment_count:1,share_count:0,viewer_liked:false,viewer_saved:false}],error:null};
 }};
 const [first,parallel]=await Promise.all([
  c.prefetchEngagement(client,request),c.prefetchEngagement(client,request)]);
 assert.equal(first.size,1);
 assert.equal(parallel.size,1);
 assert.equal(requests,1,"Simultaneous requests must share the same RPC");
 const cached=await c.prefetchEngagement(client,[...request]);
 assert.equal(cached.size,1);
 assert.equal(requests,1,"Short in-memory cache should avoid a second RPC");
 c.invalidateEngagement(client);
 await c.prefetchEngagement(client,request);
 assert.equal(requests,2,"A successful write must invalidate the cache");
}
{
 const c=instance();
 let resolveRequest,requests=0;
 const client={rpc:()=>{
  requests++;
  return new Promise(resolve=>{resolveRequest=resolve;});
 }};
 const pending=c.prefetchEngagement(client,request);
 c.invalidateEngagement(client);
 resolveRequest({data:[{post_kind:"person",post_id:uuid,like_count:1}],error:null});
 await pending;
 const second=c.prefetchEngagement(client,request);
 assert.equal(requests,2,"In-flight stale responses must not refill an invalidated cache");
 resolveRequest({data:[],error:null});
 await second;
}
{
 const c=instance();
 let calls=0;
 const client={rpc:async()=>{calls++;return {error:Error("unavailable"),data:null};}};
 assert.equal((await c.prefetchEngagement(client,request)).size,0);
 assert.equal((await c.prefetchEngagement(client,request)).size,0);
 assert.equal(calls,2,"Failed RPC must never be cached");
}
{
 const c=instance();
 let listener,complete,calls=0;
 const client={
  auth:{onAuthStateChange(fn){listener=fn;}},
  rpc:()=>{
   calls++;
   return new Promise(resolve=>{complete=resolve;});
  }
 };
 const old=c.prefetchEngagement(client,request);
 assert.equal(calls,1);
 listener("INITIAL_SESSION");listener("TOKEN_REFRESHED");
 // Token refresh does not change viewer identity; the in-flight request survives.
 const shared=c.prefetchEngagement(client,request);
 assert.equal(calls,1);
 listener("SIGNED_OUT");
 complete({data:[{post_kind:"person",post_id:uuid,viewer_liked:true}],error:null});
 assert.equal((await old).size,0,"Pre-logout engagement must not render afterward");
 assert.equal((await shared).size,0,"Other waiters must also reject stale responses");
 const next=c.prefetchEngagement(client,request);
 assert.equal(calls,2,"A fresh session must read its own reaction snapshot");
 complete({data:[{post_kind:"person",post_id:uuid,viewer_liked:false}],error:null});
 assert.equal((await next).get("person:"+uuid).viewer_liked,false);
}
console.log("VATRA engagement cache: single-flight, short hit, invalidation failure fallback and auth transitions passed.");
