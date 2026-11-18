import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import {createHash,webcrypto} from "node:crypto";
const source=await readFile("sw.js","utf8");
const base="https://example.com/VATRA/",cacheEntries=new Map(),handlers=new Map();
let online=true,networkCalls=0,cacheWrites=0,body="console.log('v1')";
const hash=s=>createHash("sha1").update("blob "+Buffer.byteLength(s)+"\u0000").update(s).digest("hex");
const cache={
 async match(request){return cacheEntries.get(typeof request==="string"?request:request.url)?.clone();},
 async put(request,response){cacheWrites++;cacheEntries.set(request.url,response);},
 async keys(){return [...cacheEntries.keys()].map(url=>new Request(url));},
 async delete(request){return cacheEntries.delete(request.url);}
};
const self={location:new URL(base+"sw.js"),addEventListener:(name,fn)=>handlers.set(name,fn)};
runInNewContext(source,{URL,Request,Response,TextEncoder,Uint8Array,Array,Promise,crypto:webcrypto,self,
 caches:{open:async()=>cache,match:async()=>null},
 fetch:async()=>{networkCalls++;if(!online)throw Error("offline");return new Response(body,{status:200});}});
function request(path){
 let result;handlers.get("fetch")({request:new Request(base+path),respondWith(p){result=p;}});return result;
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
const calls=networkCalls;
await request("assets/js/core.js");await request("assets/js/core.js");
assert.equal(networkCalls,calls+2,"Unversioned resources remain network-revalidated");
assert.equal(request("private/messages.json"),undefined,"Private non-asset requests bypass worker cache");
for(let i=0;i<85;i++){body="console.log("+i+")";await request("assets/js/clips.js?rev="+hash(body));}
assert.ok([...cacheEntries.keys()].filter(url=>new URL(url).searchParams.has("rev")).length<=80,"Versioned entries remain bounded");
console.log("VATRA static cache: body verification, old versions, offline reuse, revalidation and bounded storage passed.");
