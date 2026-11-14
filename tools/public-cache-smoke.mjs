// VATRA public-name cache: per-viewer isolation and efficient RLS-scoped reads.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source=await readFile("assets/js/public-name-cache.js","utf8");
let now=Date.parse("2026-11-14T09:00:00Z");
class TestDate extends Date {static now(){return now;}}
function build(){
 const window={};
 runInNewContext(source,{window,Date:TestDate,Number,String,Map,Set,WeakMap,Promise,Error});
 return window.VATRA_PUBLIC_NAMES;
}
function userClient(author){
 let calls=[],handler;
 const client={
  auth:{onAuthStateChange(fn){handler=fn;return {data:{subscription:{unsubscribe(){}}}};}},
  functions:{invoke:async(_name,opts)=>{
   assert.equal(_name,"public-profile-names");
   const ids=opts.body.ids;
   calls.push(ids);
   return {data:{data:ids.filter(id=>id!==9).map(id=>({
    vatra_id:id,display_name:author+" "+id
   }))},error:null};
  }},
  from:()=>{throw Error("Edge cache must avoid unnecessary direct SQL");}
 };
 return {client,calls,event(name){assert.ok(handler);handler(name,{user:null});}};
}
// Two concurrent overlapping batches should fetch each ID at most once.
{
 const names=build(),a=userClient("A");
 const [one,two]=await Promise.all([
  names.get(a.client,[1,2,3]),names.get(a.client,[2,3,4])
 ]);
 assert.equal(one.error,null);
 assert.equal(two.error,null);
 assert.equal(one.data.length,3);
 assert.equal(two.data.length,3);
 assert.equal(a.calls.length,2,"Only first batch and truly new ID should query Edge");
 assert.deepEqual(a.calls.flat().slice().sort((x,y)=>x-y),[1,2,3,4]);
 assert.equal((await names.get(a.client,[2,4])).data.length,2);
 assert.equal(a.calls.length,2,"Known names should hit memory without network");
 const b=userClient("B");
 const second=await names.get(b.client,[1,2]);
 assert.equal(b.calls.length,1,"Different Supabase clients must fetch independently");
 assert.equal(second.data[0].display_name,"B 1");
 a.event("INITIAL_SESSION");
 await names.get(a.client,[1]);
 assert.equal(a.calls.length,2,"INITIAL_SESSION should preserve first-page cache");
 a.event("SIGNED_OUT");
 await names.get(a.client,[1]);
 assert.equal(a.calls.length,3,"Sign-out must invalidate old cached names");
 a.event("SIGNED_IN");
 await names.get(a.client,[1]);
 assert.equal(a.calls.length,4,"Sign-in must refresh the new user's names");
}
// Missing IDs are negatively cached only briefly (not forever).
{
 const names=build(),a=userClient("C");
 assert.equal((await names.get(a.client,[9])).data.length,0);
 assert.equal((await names.get(a.client,[9])).data.length,0);
 assert.equal(a.calls.length,1,"Unavailable public IDs should not generate repeated reads");
 now+=16_000;
 assert.equal((await names.get(a.client,[9])).data.length,0);
 assert.equal(a.calls.length,2,"Missing-name entries should expire quickly");
}
// A session change during an unresolved request must not refill the new cache.
{
 const names=build();
 let resolveRequest,handler,reads=0;
 const client={
  auth:{onAuthStateChange(fn){handler=fn;return {data:{subscription:{}}};}},
  functions:{invoke:()=>{
   reads++;
   return new Promise(resolve=>{resolveRequest=resolve;});
  }}
 };
 const pending=names.get(client,[10]);
 handler("SIGNED_OUT",{user:null});
 resolveRequest({data:{data:[{vatra_id:10,display_name:"Former viewer"}]},error:null});
 const stale=await pending;
 assert.ok(stale.error,"A stale result must not be returned after session change");
 const current=names.get(client,[10]);
 assert.equal(reads,2,"Former viewer's in-flight data must not become new session cache");
 resolveRequest({data:{data:[{vatra_id:10,display_name:"Current viewer"}]},error:null});
 assert.equal((await current).data[0].display_name,"Current viewer");
}
// Redis outage uses PostgREST RLS directly, with a cooldown and no failed caches.
{
 const names=build();
 let edgeCalls=0,directCalls=0;
 const client={
  functions:{invoke:async()=>{edgeCalls++;return {data:null,error:Error("Redis down")};}},
  from:table=>{
   assert.equal(table,"public_profiles");
   return {select:columns=>{
    assert.equal(columns,"vatra_id,display_name");
    return {in:async(_key,ids)=>{
     directCalls++;
     assert.equal(_key,"vatra_id");
     return {data:ids.map(id=>({vatra_id:Number(id),display_name:"З бази"})),error:null};
    }};
   }};
  }
 };
 assert.equal((await names.get(client,[3])).data[0].display_name,"З бази");
 assert.equal((await names.get(client,[4])).data[0].display_name,"З бази");
 assert.equal(edgeCalls,1,"Redis outage must trigger 60s cooldown");
 assert.equal(directCalls,2);
 now+=61_000;
 await names.get(client,[5]);
 assert.equal(edgeCalls,2,"Edge may be retried after cooldown");
}
// Don't cache SQL errors, invalid inputs or unrelated IDs.
{
 const names=build();
 let calls=0;
 const client={from:()=>({select:()=>({in:async()=>{
  calls++;return {data:[],error:Error("database error")};
 }})})};
 const invalid=await names.get(client,[-1,"0","bad",null]);
 assert.equal(invalid.data.length,0);
 assert.equal(invalid.error,null);
 assert.equal(calls,0);
 assert.ok((await names.get(client,[18])).error);
 assert.ok((await names.get(client,[18])).error);
 assert.equal(calls,2,"Failure must not become a cache miss");
}
console.log("VATRA public-name cache: overlapping singleflight, viewer isolation, auth races, negative TTL, Redis fallback passed.");
