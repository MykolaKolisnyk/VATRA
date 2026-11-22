// VATRA public announcements cache: JWT/RLS, bounded public rows, graceful SQL fallback.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const source=await readFile("assets/js/announcements.js","utf8");
const edge=await readFile("_development/supabase/functions/public-announcements/index.ts","utf8");
assert.ok(source.includes('client.functions.invoke("public-announcements",{method:"GET"})'));
assert.ok(edge.includes('client.auth.getUser(authorization.slice(7))')&&
 edge.includes('.eq("active", true).lte("starts_at", now)')&&
 edge.includes('const TTL_SECONDS = 10')&&
 edge.includes('if (!cache) return reply([], "disabled", 503)'));
assert.ok(!edge.includes("SUPABASE_SECRET_KEYS")&&!edge.includes("SERVICE_ROLE_KEY"));
assert.ok(!edge.includes('from("announcement_views")'));
const start=source.indexOf("let announcementRetryAt=0;");
const end=source.indexOf("export async function start(",start);
assert.ok(start>=0&&end>start);
const context={window:{VATRA_ANNOUNCEMENT_EDGE_ENABLED:true},Date,Array,Promise};
runInNewContext(source.slice(start,end)+"\nglobalThis.testLoad=activeAnnouncements;",context);
let edgeCalls=0,directCalls=0;
const rows=[{id:1,title_uk:"Update"}];
const client={
 functions:{invoke:async(name,opts)=>{edgeCalls++;assert.equal(name,"public-announcements");assert.equal(opts.method,"GET");return {data:{data:rows},error:null};}},
 from:()=>{directCalls++;throw Error("Cache hit should not query SQL");}
};
const cacheHit=await context.testLoad(client,new Date().toISOString());
assert.equal(cacheHit.data.length,1);assert.equal(edgeCalls,1);assert.equal(directCalls,0);
const failContext={window:{VATRA_ANNOUNCEMENT_EDGE_ENABLED:true},Date,Array,Promise};
runInNewContext(source.slice(start,end)+"\nglobalThis.testLoad=activeAnnouncements;",failContext);
let failingCalls=0,fallbackCalls=0;
const fallback={functions:{invoke:async()=>{failingCalls++;return {error:Error("Redis down")};}},
 from:table=>{assert.equal(table,"announcements");fallbackCalls++;return {
 select:()=>({eq:()=>({lte:()=>({order:()=>({limit:async()=>({data:rows,error:null})})})})})
 };}};
await failContext.testLoad(fallback,new Date().toISOString());
await failContext.testLoad(fallback,new Date().toISOString());
assert.equal(failingCalls,1,"Retry cooldown should avoid repeated Edge failures");
assert.equal(fallbackCalls,2,"Direct authenticated RLS read must remain available");
console.log("VATRA announcements: Redis hit, authorization contract, active-only data and fallback passed.");
