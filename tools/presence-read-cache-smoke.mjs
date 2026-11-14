// VATRA presence: isolated, RLS-session-scoped read cache regression.
// No live Supabase calls, data changes, or browser network traffic.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const source=await readFile("assets/js/presence.js","utf8");
const start=source.indexOf("const PRESENCE_READ_TTL_MS=8_000");
const end=source.indexOf("function format(record,",start);
assert.ok(start>0&&end>start,"Find real presence read-cache implementation");
let now=Date.parse("2026-11-14T12:00:00Z");
class MockDate extends Date{static now(){return now;}}
const scope={Date:MockDate,Map,WeakMap,Promise,AbortController,String,Error};
runInNewContext(`
const validId=x=>/^[1-9][0-9]{0,18}$/.test(String(x??""));
${source.slice(start,end)}
globalThis.presenceCacheTest={load,readState:presenceReadState};
`,scope);
const {load,readState}=scope.presenceCacheTest;

function viewer(label){
 const pending=[],authEvents=[];
 let calls=0;
 const client={
  auth:{onAuthStateChange(callback){authEvents.push(callback);}},
  from(table){
   assert.equal(table,"profile_presence");
   return {select(fields){
    assert.equal(fields,"last_seen_at,form");
    return {eq(key,id){
     assert.equal(key,"vatra_id");
     return {maybeSingle(){
      calls++;
      return {abortSignal(signal){
       return new Promise(resolve=>{
        const request={label,id,signal,done:false,
         finish(result){if(this.done)return;this.done=true;resolve(result);}};
        pending.push(request);
        if(signal.aborted)request.finish({data:null,error:Error("Aborted")});
        else signal.addEventListener("abort",()=>request.finish({
         data:null,error:Error("Aborted")
        }),{once:true});
       });
      }};
     }};
    }};
   }};
  }
 };
 return {client,pending,auth(event){for(const fn of authEvents)fn(event);},
  get calls(){return calls;},finish(data,error=null){
   const req=pending.shift();
   assert.ok(req,"There must be one pending presence query");
   req.finish({data,error});return req;
  }};
}
const profile=(id,form="neutral")=>({
 last_seen_at:"2026-11-14T12:00:00.000Z",form,
 vatra_id:"should-not-enter-cache"
});
const a=viewer("A"),b=viewer("B");
const first=load(a.client,"17"),shared=load(a.client,"17");
assert.equal(a.calls,1,"Two simultaneous readers need only one RLS request");
a.finish(profile(17,"masculine"));
const [a1,a2]=await Promise.all([first,shared]);
assert.equal(a1.form,"masculine");
assert.equal(a2.form,"masculine");
assert.equal(a1.vatra_id,undefined,"Cache exposes only the selected presence fields");
a1.form="mutated";
assert.equal((await load(a.client,"17")).form,"masculine",
 "Consumers must not mutate a shared cached record");
assert.equal(a.calls,1);
a.auth("TOKEN_REFRESHED");
assert.equal((await load(a.client,"17")).form,"masculine");
assert.equal(a.calls,1,"Token refresh must not flush valid same-session data");

// A different Supabase client never reuses the first viewer's RLS result.
const other=load(b.client,"17");
assert.equal(b.calls,1);
b.finish(profile(17,"feminine"));
assert.equal((await other).form,"feminine");
assert.equal((await load(a.client,"17")).form,"masculine");
now+=8_100;
const expired=load(a.client,"17");
assert.equal(a.calls,2,"Presence snapshots expire after eight seconds");
a.finish(profile(17,"feminine"));
assert.equal((await expired).form,"feminine");

// A missing row gets a shorter TTL, but temporary errors never get cached.
const missing=load(a.client,"22");
a.finish(null);assert.equal(await missing,null);
assert.equal(await load(a.client,"22"),null);
assert.equal(a.calls,3);
now+=3_100;
const found=load(a.client,"22");
assert.equal(a.calls,4);
a.finish(profile(22));
assert.equal((await found).form,"neutral");
const failed=load(a.client,"33");
a.finish(null,Error("RLS or network failure"));
assert.equal(await failed,null);
const retry=load(a.client,"33");
assert.equal(a.calls,6,"A failed response is not cached");
a.finish(profile(33,"masculine"));await retry;

// Logout aborts old requests and blocks stale data from the new account.
const old=load(a.client,"44");
const pendingRequest=a.pending[a.pending.length-1];
assert.ok(pendingRequest&&!pendingRequest.signal.aborted);
a.auth("SIGNED_OUT");
assert.equal(pendingRequest.signal.aborted,true);
assert.equal(await old,null);
assert.equal(readState(a.client).entries.size,0);
const newUser=load(a.client,"44");
assert.equal(a.calls,8,"New account must query again even with the same client");
a.finish(profile(44,"feminine"));
assert.equal((await newUser).form,"feminine");
assert.equal((await load(a.client,"44")).form,"feminine");
assert.equal((await load(a.client,"invalid")).form,undefined);
assert.equal(a.calls,8,"Invalid IDs never issue queries");

// Bounded memory, including a large burst of distinct visited profiles.
const many=Array.from({length:70},(_,i)=>String(100+i));
for(const id of many){
 const pendingLoad=load(a.client,id);
 a.finish(profile(Number(id)));await pendingLoad;
}
assert.ok(readState(a.client).entries.size<=64,
 "Presence snapshots must remain bounded in a long-running tab");
console.log("VATRA presence cache: single-flight, TTL, session isolation, abort, no stale rows and bounded memory passed.");
