// Behavioral regression: public single-club Redis path and PostgREST fallback.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source=await readFile("assets/js/communities.js","utf8");
const edge=await readFile("supabase/functions/public-community-directory/index.ts","utf8");
const begin=source.indexOf("async function fetchPublicClub(client,number){");
const end=source.indexOf("async function openClub(",begin);
assert.ok(begin>=0&&end>begin,"Find the standalone public-club lookup");
const context={Number,Object};
runInNewContext(source.slice(begin,end)+"\nglobalThis.testLookup=fetchPublicClub;",context);
const lookup=context.testLookup;
const club={club_id:17,name:"Відкрита спільнота",description:"Тест",created_at:"2026-11-13T00:00:00Z"};
function direct(result){
 return {from:table=>{
  assert.equal(table,"communities");
  return {select:fields=>{
   assert.equal(fields,"club_id,name,description,created_at");
   return {eq:(column,id)=>{
    assert.equal(column,"club_id");assert.ok(String(id));
    return {maybeSingle:async()=>result};
   }};
  }};
 }};
}
{
 let directCalls=0,edgeCalls=0;
 const client={
  functions:{invoke:async(name,opts)=>{
   edgeCalls++;assert.equal(name,"public-community-directory");
   assert.equal(opts.body.club_id,17);
   return {data:{data:club},error:null};
  }},
  from:()=>{directCalls++;throw Error("No extra SQL request after Edge hit");}
 };
 const answer=await lookup(client,"17");
 assert.equal(answer.data.name,club.name);
 assert.equal(edgeCalls,1);assert.equal(directCalls,0);
}
{
 const client={functions:{invoke:async()=>({data:{data:null},error:null})},
  from:()=>{throw Error("Verified absence should not trigger duplicate SQL");}};
 assert.equal((await lookup(client,"19")).data,null);
}
{
 let fallback=0;
 const client={functions:{invoke:async()=>({error:Error("Redis unavailable")})},
  from:()=>{fallback++;return direct({data:club,error:null}).from("communities");}};
 const answer=await lookup(client,"17");
 assert.equal(answer.data.name,club.name);
 assert.equal(fallback,1);
}
{
 const client={functions:{invoke:async()=>({data:{data:{...club,club_id:18}},error:null})},
  from:direct({data:club,error:null}).from};
 const answer=await lookup(client,"17");
 assert.equal(answer.data.club_id,17,"Unexpected Edge club IDs must fail back to RLS");
}
{
 let invoked=0;
 const client={functions:{invoke:async()=>{invoked++;throw Error("Unsafe float ID");}},
  from:direct({data:null,error:null}).from};
 const answer=await lookup(client,"9007199254740993");
 assert.equal(invoked,0);
 assert.equal(answer.data,null);
}
assert.ok(edge.includes('request.method !== "GET" && request.method !== "POST"')&&
 edge.includes('Object.keys(record).length !== 1')&&
 edge.includes('Number.isSafeInteger(record.club_id)')&&
 edge.includes('const cacheKey = clubId === null ? CACHE_KEY')&&
 edge.includes('.eq("club_id", clubId).maybeSingle()')&&
 edge.includes('validateCommunity(parsed) && parsed.club_id === clubId')&&
 edge.includes('"Cache-Control": "no-store"')&&
 !edge.includes("SUPABASE_SERVICE_ROLE_KEY"),
 "Single-club Edge cache must validate IDs, respect RLS and avoid secret/service-role exposure");
console.log("VATRA club Redis cache: hit, absent, outage fallback, mismatched ID, oversized ID passed.");
