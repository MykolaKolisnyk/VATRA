import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import {createHash,webcrypto} from "node:crypto";
const source=await readFile("sw.js","utf8");
const base="https://example.com/VATRA/",cacheEntries=new Map(),handlers=new Map();
let online=true,networkCalls=0,cacheWrites=0,body="console.log('v1')",networkGate=null;
const background=[];
let now=Date.now();
class Clock extends Date{static now(){return now;}}
const hash=s=>createHash("sha1").update("blob "+Buffer.byteLength(s)+"\u0000").update(s).digest("hex");
const cache={
 async match(request){return cacheEntries.get(typeof request==="string"?request:request.url)?.clone();},
 async put(request,response){cacheWrites++;cacheEntries.set(request.url,response);},
 async keys(){return [...cacheEntries.keys()].map(url=>new Request(url));},
 async delete(request){return cacheEntries.delete(request.url);}
};
const self={location:new URL(base+"sw.js"),addEventListener:(name,fn)=>handlers.set(name,fn)};
runInNewContext(source,{URL,Request,Response,TextEncoder,Uint8Array,Array,Promise,Date:Clock,crypto:webcrypto,self,
 caches:{open:async()=>cache,match:async()=>null},
 fetch:async()=>{networkCalls++;if(networkGate)await networkGate;if(!online)throw Error("offline");return new Response(body,{status:200});}});
function request(path){
 let result;handlers.get("fetch")({request:new Request(base+path),respondWith(p){result=p;},waitUntil(p){background.push(p);}});return result;
}
const first="assets/js/clips.js?rev="+hash(body);
assert.equal(await (await request(first)).text(),body);
assert.equal(networkCalls,1);assert.equal(cacheWrites,1);
await request(first);assert.equal(networkCalls,1,"Versioned assets are reused without network");
online=false;assert.equal(await (await request(first)).text(),body);
online=true;body="console.log('v2')";
const wrong="assets/js/clips.js?rev="+"a".repeat(40);
await request(wrong);assert.equal(cacheWrites,1,"Never save a mismatched body under the requested fingerprint");
const second="assets/js/clips.js?rev="+hash(body);
assert.equal(await (await request(second)).text(),body);
assert.equal(cacheWrites,2);assert.equal(await (await request(first)).text(),"console.log('v1')");
const localePath="assets/i18n/uk.json";
body='{"version":1}';
assert.equal(await (await request(localePath)).text(),body);
const localeCalls=networkCalls;
body='{"version":2}';
assert.equal(await (await request(localePath)).text(),'{"version":1}',"Cached public translations should load without waiting for network");
await Promise.allSettled(background.splice(0));
assert.equal(networkCalls,localeCalls+1,"Cached translations must revalidate in the background");
assert.equal(await (await request(localePath)).text(),'{"version":2}',"Revalidated locale should appear on the following navigation");
await Promise.allSettled(background.splice(0));
const calls=networkCalls;
await request("assets/js/core.js");await request("assets/js/core.js");
assert.equal(networkCalls,calls+2,"Unversioned assets remain network-first, respecting native HTTP caching");
assert.ok(source.includes("const INSTALL_ASSETS=["),"Service worker install must use a small, bounded offline shell");
assert.ok(!source.includes("Promise.allSettled(ASSETS.filter"),"Service worker must not eagerly fetch heavy artwork and font assets");
assert.equal(request("private/messages.json"),undefined,"Private non-asset requests bypass worker cache");
for(let i=0;i<85;i++){body="console.log("+i+")";await request("assets/js/clips.js?rev="+hash(body));}
assert.ok([...cacheEntries.keys()].filter(url=>new URL(url).searchParams.has("rev")).length<=80,"Versioned entries remain bounded");
console.log("VATRA static cache: body verification, old versions, offline reuse, revalidation and bounded storage passed.");

{
 let release;
 networkGate=new Promise(resolve=>{release=resolve;});
 body="console.log('concurrent')";
 const path="assets/js/clips.js?rev="+hash(body),before=networkCalls;
 const a=request(path),b=request(path);
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.equal(networkCalls,before+1,"Concurrent misses for an immutable asset share one network request");
 release();networkGate=null;
 assert.equal(await (await a).text(),body);
 assert.equal(await (await b).text(),body);
}
{
 let result;
 const before=networkCalls;
 handlers.get("fetch")({request:{url:base+"feed",method:"GET",mode:"navigate"},
  preloadResponse:Promise.resolve(new Response("preloaded navigation")),respondWith(p){result=p;}});
 assert.equal(await (await result).text(),"preloaded navigation");
 assert.equal(networkCalls,before,"Do not fetch a navigation a second time after successful browser preload");
 handlers.get("fetch")({request:{url:base+"feed",method:"GET",mode:"navigate"},
  preloadResponse:Promise.reject(Error("Preload unavailable")),respondWith(p){result=p;}});
 assert.equal(await (await result).text(),body);
 assert.equal(networkCalls,before+1,"Failed preload must fall back to a real navigation request");
}
{
 let release;
 networkGate=new Promise(resolve=>{release=resolve;});
 now+=60001;
 const before=networkCalls;
 const a=request(localePath),b=request(localePath);
 await Promise.all([a,b]);
 assert.equal(networkCalls,before+1,"Concurrent locale cache hits share one background refresh");
 release();networkGate=null;
 await Promise.allSettled(background.splice(0));
}
console.log("VATRA navigation preload and concurrent static requests: OK.");

{
 const localePaths=["pl","de","fr","it","ka","bg"].map(code=>"assets/i18n/"+code+".json");
 for(const path of [...localePaths,"assets/fonts/Onest-Variable.ttf","assets/logo/logo_app-icon.webp"]){
  body="public version one";
  assert.equal(await (await request(path)).text(),body);
  body="public version two";
  const before=networkCalls;
  assert.equal(await (await request(path)).text(),"public version one","Reusable public assets render before network");
  await Promise.allSettled(background.splice(0));
  assert.equal(networkCalls,before+1);
  assert.equal(await (await request(path)).text(),body);
  assert.equal(networkCalls,before+1,"Repeated navigation must not revalidate the same public asset within one minute");
 }
 assert.equal(request("https://cxrcycxrlkufozomsxcs.supabase.co/storage/v1/object/sign/post-images/private.webp"),undefined);
 assert.equal(request("https://cxrcycxrlkufozomsxcs.supabase.co/rest/v1/feed_posts"),undefined);
 assert.equal(request("assets/private/user-photo.webp"),undefined);
}
console.log("VATRA all eight language packs, shared font/logo reuse and private-resource exclusion: OK.");
