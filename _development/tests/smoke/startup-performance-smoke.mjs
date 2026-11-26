import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const auth=await readFile("assets/js/auth-core.js","utf8");
const start=auth.indexOf("async function authFetch("),end=auth.indexOf("async function sessionCheckWithTimeout(",start);
assert.ok(start>=0&&end>start);
const fakeFetch=(input,init)=>new Promise((resolve,reject)=>{
 if(init.signal.aborted){reject(new Error("aborted"));return;}
 init.signal.addEventListener("abort",()=>reject(new Error("aborted")),{once:true});
 if(input==="fast")resolve("ok");
});
const authFetch=new Function("fetch",auth.slice(start,end)+"return authFetch;")(fakeFetch);
assert.equal(await authFetch("fast",{},100),"ok");
await assert.rejects(authFetch("slow",{},5),/aborted/);
const cancel=new AbortController();const pending=authFetch("slow",{signal:cancel.signal},1000);cancel.abort();await assert.rejects(pending,/aborted/);
assert.ok(auth.includes("global:{fetch:authFetch}"));
const profile=await readFile("assets/js/profile.js","utf8");
assert.ok(profile.includes("const pendingDeleteFlush=Promise.resolve().then(")&&profile.includes("pendingDeleteFlush.then(()=>loadPosts("));
assert.ok(profile.indexOf("const pendingDeleteFlush=Promise.resolve().then(")<profile.indexOf("const prepared=profileDeadline(window.VATRA_PROFILE_DETAILS.prepare"));
const community=await readFile("assets/js/community-core.js","utf8");
assert.ok(community.indexOf("const initialAuth=Promise.resolve().then(")<community.indexOf("await window.VATRA_LANGUAGE?.ready;"));
assert.ok(community.includes("const startup=await initialAuth;"));
const core=await readFile("assets/js/core.js","utf8");
const begin=core.indexOf("function sectionDeadline("),finish=core.indexOf("async function boot(init)",begin);
assert.ok(begin>=0&&finish>begin);
const sectionDeadline=new Function(core.slice(begin,finish)+"return sectionDeadline;")();
assert.equal(await sectionDeadline(Promise.resolve("ok"),100),"ok");
await assert.rejects(sectionDeadline(new Promise(()=>{}),5),{code:"VATRA_FEED_TIMEOUT"});
assert.ok(core.includes("sectionDeadline(client.auth.getUser())"));
console.log("VATRA startup: bounded Auth requests, cancellation, parallel profile setup and community initialization passed.");

assert.ok(core.indexOf("bindViewer?.(client,user.id)")>core.indexOf("ownId=String(accountResult.data.vatra_id)"),"Verified viewer must bind the existing tab cache before section initialization");

for(const [file,accountAnchor,binding] of [
 ["friends",'ownId=String(account.data.vatra_id);','bindViewer?.(client,user.id)'],
 ["gifts",'const id=String(account.data.vatra_id);','bindViewer?.(client,user.id)'],
 ["notifications",'const id=String(account.vatra_id);','bindViewer?.(clientRef,user.id)'],
 ["community-core",'const ownId=account?.vatra_id==null?null:String(account.vatra_id);','bindViewer?.(client,user.id)']
]){
 const source=await readFile("assets/js/"+file+".js","utf8");
 assert.ok(source.includes(accountAnchor)&&source.indexOf(binding)>source.indexOf(accountAnchor),file+" must bind cache after account lookup");
}
