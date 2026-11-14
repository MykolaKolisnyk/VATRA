// VATRA: avoid repeated RLS-scoped avatar path reads without crossing sessions.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const source=await readFile("assets/js/avatar.js","utf8");
const start=source.indexOf("const PATH_TTL_MS=15_000,PATH_MISSING_TTL_MS=5_000,PATH_CACHE_MAX=256;");
const end=source.indexOf("function safeUrl(input){",start);
assert.ok(start>=0&&end>start,"Find the real avatar path cache");
let now=Date.parse("2026-11-14T10:00:00Z");
class FakeDate extends Date{static now(){return now;}}
const env={Map,Set,WeakMap,Promise,String,Date:FakeDate};
runInNewContext(source.slice(start,end)+
 "\nglobalThis.pathTest={paths,invalidatePath};",env);
const {paths,invalidatePath}=env.pathTest;

function clientFixture(){
 let queries=0,listeners=[],finishes=[];
 const client={
  auth:{onAuthStateChange(fn){listeners.push(fn);}},
  from(table){
   assert.equal(table,"profile_media");
   return {select(fields){
    assert.equal(fields,"vatra_id,avatar_path");
    return {in(field,ids){
     assert.equal(field,"vatra_id");
     queries++;
     const requested=Array.from(ids);
     return new Promise(resolve=>finishes.push({requested,resolve}));
    }};
   }};
  }
 };
 return {
  client,
  get queries(){return queries;},
  get pending(){return finishes.length;},
  finish(rows=[],error=null){
   const next=finishes.shift();
   assert.ok(next,"Avatar query was not made");
   next.resolve({data:rows,error});
   return next.requested;
  },
  auth(event){for(const listener of listeners)listener(event);}
 };
}
{
 const f=clientFixture();
 const a=paths(f.client,["1","2","3"]);
 const b=paths(f.client,["2","3"]);
 assert.equal(f.queries,1,"Overlapping requests must share one SQL query");
 assert.deepEqual(f.finish([
  {vatra_id:1,avatar_path:"1/avatar/first.webp"},
  {vatra_id:2,avatar_path:"2/avatar/second.jpg"}
 ]),["1","2","3"]);
 const [r1,r2]=await Promise.all([a,b]);
 assert.equal(r1.error,null);
 assert.equal(r1.data.length,2);
 assert.equal(r2.data.length,1);
 assert.equal(r2.data[0].avatar_path,"2/avatar/second.jpg");
 assert.equal((await paths(f.client,["1","3"])).data.length,1);
 assert.equal(f.queries,1,"Positive and negative paths should be cached");

 // Missing avatars have a shorter TTL and can appear without a reload.
 now+=5_100;
 const updated=paths(f.client,["1","3"]);
 assert.deepEqual(f.finish([{vatra_id:3,avatar_path:"3/avatar/new.webp"}]),["3"]);
 assert.equal((await updated).data.length,2);
 assert.equal(f.queries,2);

 // Deleted or broken Storage assets must be invalidatable immediately.
 invalidatePath(f.client,"1");
 const refreshed=paths(f.client,["1"]);
 assert.deepEqual(f.finish([{vatra_id:1,avatar_path:"1/avatar/replaced.webp"}]),["1"]);
 assert.equal((await refreshed).data[0].avatar_path,"1/avatar/replaced.webp");
 now+=15_100;
 const stale=paths(f.client,["1"]);
 f.finish([]);
 assert.equal((await stale).data.length,0);
}
{
 const f=clientFixture();
 const old=paths(f.client,["7"]);
 assert.equal(f.queries,1);
 f.auth("TOKEN_REFRESHED");
 f.auth("SIGNED_OUT");
 f.finish([{vatra_id:7,avatar_path:"7/avatar/private.webp"}]);
 const stale=await old;
 assert.ok(stale.error,"Results started before an account switch must be rejected");
 f.auth("SIGNED_IN");
 const fresh=paths(f.client,["7"]);
 assert.equal(f.queries,2);
 f.finish([{vatra_id:7,avatar_path:"7/avatar/new.webp"}]);
 assert.equal((await fresh).data[0].avatar_path,"7/avatar/new.webp");
}
{
 const f=clientFixture();
 const failed=paths(f.client,["8"]);
 f.finish([],Error("temporary PostgREST failure"));
 assert.ok((await failed).error,"Errors must be reported");
 const retried=paths(f.client,["8"]);
 assert.equal(f.queries,2,"A database failure must never be cached");
 f.finish([{vatra_id:8,avatar_path:"8/avatar/good.jpg"}]);
 assert.equal((await retried).data.length,1);
 assert.equal((await paths(f.client,["bad","0","-1"])).data.length,0);
 assert.equal(f.queries,2,"Invalid IDs must not hit PostgREST");
}
console.log("VATRA avatar-path cache: overlap, TTL, invalidation, auth isolation and failure retry passed.");
