// Offline regression tests for VATRA's shared public-name cache.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source=await readFile("assets/js/public-name-cache.js","utf8");
function build(){
 const window={};
 runInNewContext(source,{window,Date,Number,String,Map,Set,Promise,Error});
 return window.VATRA_PUBLIC_NAMES;
}
{
 const names=build();
 let edgeCalls=0;
 const client={
  functions:{invoke:async(_name,options)=>{
   edgeCalls++;
   assert.equal(_name,"public-profile-names");
   assert.equal(options.body.ids.length,2);
   return {data:{data:[{vatra_id:1,display_name:"Перший"},{vatra_id:2,display_name:"Другий"}]},error:null};
  }},
  from:()=>{throw Error("PostgREST must not be queried on a cache hit");}
 };
 const [one,two]=await Promise.all([names.get(client,[1,2]),names.get(client,[1,2])]);
 assert.equal(edgeCalls,1,"Concurrent matching requests should share one Edge call");
 assert.equal(one.error,null);
 assert.equal(two.data.length,2);
 const again=await names.get(client,[2,1,2]);
 assert.equal(again.data.length,2);
 assert.equal(edgeCalls,1,"In-memory hits should not send new network requests");
}
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
 const first=await names.get(client,[3]);
 assert.equal(first.data[0].display_name,"З бази");
 assert.equal(edgeCalls,1);
 assert.equal(directCalls,1);
 const second=await names.get(client,[4]);
 assert.equal(second.data[0].display_name,"З бази");
 assert.equal(edgeCalls,1,"A Redis outage should activate a cooldown");
 assert.equal(directCalls,2);
}
{
 const names=build();
 const client={from:()=>{throw Error("Invalid identifiers must never query database");}};
 const empty=await names.get(client,[-1,"0","bad",null]);
 assert.equal(empty.data.length,0);
 assert.equal(empty.error,null);
}
console.log("VATRA public-name cache: deduplication, Redis fallback, cooldown and input validation passed.");
