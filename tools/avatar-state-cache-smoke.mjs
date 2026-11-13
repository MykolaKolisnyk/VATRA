// VATRA: authenticated avatar account-state cache never outlives its short TTL.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const src=await readFile("assets/js/avatar.js","utf8");
const start=src.indexOf("const STATE_TTL_MS=10_000,STATE_CACHE_MAX=256;");
const end=src.indexOf("function safeUrl(input){",start);
assert.ok(start>=0&&end>start,"Find the state cache module");
let now=Date.parse("2026-11-13T19:00:00Z");
class FakeDate extends Date { static now(){return now;} }
const env={Map,Set,WeakMap,Promise,String,Date:FakeDate};
runInNewContext(src.slice(start,end)+"\nglobalThis.stateTest=states;",env);
const states=env.stateTest;
{
 let queries=0,complete;
 const client={from:table=>{
  assert.equal(table,"account_states");
  return {select:fields=>{
   assert.equal(fields,"vatra_id,state,blocked_until");
   return {in:(key,ids)=>{
    queries++;
    assert.equal(key,"vatra_id");
    assert.deepEqual(Array.from(ids),["1","2","3"]);
    return new Promise(resolve=>{complete=resolve;});
   }};
  }};
 }};
 const reqA=states(client,["1","2","3"]);
 const reqB=states(client,["2","3"]);
 assert.equal(queries,1,"Overlapping in-flight lookups should be batched");
 complete({data:[
  {vatra_id:1,state:"deleted",blocked_until:null},
  {vatra_id:2,state:"blocked",blocked_until:new Date(now+5_000).toISOString()}
 ],error:null});
 const [first,second]=await Promise.all([reqA,reqB]);
 assert.equal(first.get("1"),"deleted");
 assert.equal(first.get("2"),"blocked");
 assert.equal(second.get("2"),"blocked");
 assert.equal(first.has("3"),false);
 now+=6_000;
 const cached=await states(client,["1","2","3"]);
 assert.equal(queries,1,"Positive and negative states must avoid duplicate SQL");
 assert.equal(cached.get("1"),"deleted");
 assert.equal(cached.has("2"),false,"Blocked-until timestamp must be re-evaluated");
 now+=5_000;
 const again=states(client,["1","2","3"]);
 assert.equal(queries,2,"Expired cache must be revalidated");
 complete({data:[],error:null});
 assert.equal((await again).size,0);
}
{
 let calls=0;
 const client={from:()=>({select:()=>({in:async()=>{calls++;return {data:[],error:Error("database error")};}})})};
 assert.equal((await states(client,[17])).size,0);
 assert.equal((await states(client,[17])).size,0);
 assert.equal(calls,2,"Database failures should never be cached");
 assert.equal((await states(client,[-7,"0","bad"])).size,0);
 assert.equal(calls,2,"Invalid member IDs should not hit PostgreSQL");
}
console.log("VATRA account-state cache: batch dedupe, negative TTL, expiry, blocked-until, and failure retry passed.");
