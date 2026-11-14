// VATRA: authenticated Feed cursor reuse with bounded TTL and write invalidation.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const feed=await readFile("assets/js/feed.js","utf8");
const start=feed.indexOf(" const FEED_PAGE_TTL_MS=3_000,FEED_PAGE_MAX=16;");
const end=feed.indexOf(" const makeSourceState=()=>",start);
assert.ok(start>0&&end>start,"Find the real Feed cursor cache");
let now=Date.parse("2026-11-14T12:00:00Z");
class FakeDate extends Date{static now(){return now;}}
const scope={Date:FakeDate,Map,WeakMap,Promise,String,JSON,Error,Number};
runInNewContext(feed.slice(start,end)+
 "\nglobalThis.feedCacheTest={readFeedPage,invalidateFeedPages};",scope);
const {readFeedPage,invalidateFeedPages}=scope.feedCacheTest;
const key=JSON.stringify(["person","all","",0,["10","11"],[]]);
const row=body=>({id:"posted-id",body});
function viewer(){
 let listener,requests=0;
 return {client:{auth:{onAuthStateChange(fn){listener=fn;}}},
  get requests(){return requests;},
  query(data=[],error=null){
   return ()=>{requests++;return Promise.resolve({data,error});};
  },
  event(name){assert.ok(listener);listener(name);}
 };
}
{
 const a=viewer();
 const first=await readFeedPage(a.client,key,a.query([row("one")]));
 assert.equal(first.data.length,1);
 const cached=await readFeedPage(a.client,key,a.query([row("should not be read")]));
 assert.equal(a.requests,1,"Re-opening a filter should reuse its latest RLS cursor");
 cached.data[0].body="mutated by card";
 assert.equal((await readFeedPage(a.client,key,a.query([]))).data[0].body,"one");
 const different=await readFeedPage(a.client,key+"other filter",a.query([row("different")]));
 assert.equal(different.data[0].body,"different");
 assert.equal(a.requests,2,"Different source filters require independent cache keys");
 now+=3_100;
 assert.equal((await readFeedPage(a.client,key,a.query([row("fresh")]))).data[0].body,"fresh");
 assert.equal(a.requests,3,"Expired cursors must be refreshed");
 invalidateFeedPages(a.client);
 assert.equal((await readFeedPage(a.client,key,a.query([row("after write")]))).data[0].body,"after write");
 assert.equal(a.requests,4,"A new post, delete or archive must bypass old cursors");
}
{
 let resolveFirst,listener,calls=0;
 const client={auth:{onAuthStateChange(fn){listener=fn;}}};
 const first=readFeedPage(client,key,()=>{
  calls++;return new Promise(resolve=>{resolveFirst=resolve;});
 });
 const shared=readFeedPage(client,key,()=>{
  calls++;return Promise.resolve({data:[],error:null});
 });
 assert.equal(calls,1,"Two simultaneous cursor requests should share one promise");
 listener("TOKEN_REFRESHED");
 listener("SIGNED_OUT");
 resolveFirst({data:[row("previous viewer")],error:null});
 assert.ok((await first).error,"Previous session's query must not render");
 assert.ok((await shared).error,"Waiting queries must not render stale data");
 const next=await readFeedPage(client,key,()=>{
  calls++;return Promise.resolve({data:[row("new viewer")],error:null});
 });
 assert.equal(calls,2);
 assert.equal(next.data[0].body,"new viewer");
}
{
 const a=viewer(),b=viewer();
 const one=await readFeedPage(a.client,key,a.query([row("viewer 1")]));
 const two=await readFeedPage(b.client,key,b.query([row("viewer 2")]));
 assert.equal(one.data[0].body,"viewer 1");
 assert.equal(two.data[0].body,"viewer 2");
 const failed=await readFeedPage(a.client,key+"err",a.query(null,Error("network")));
 assert.ok(failed.error);
 const retried=await readFeedPage(a.client,key+"err",a.query([row("recovered")]));
 assert.equal(retried.data.length,1);
 assert.equal(a.requests,3,"PostgREST errors must never be cached");
}
console.log("VATRA Feed cursor cache: TTL, single-flight, RLS isolation, writes and retries passed.");
