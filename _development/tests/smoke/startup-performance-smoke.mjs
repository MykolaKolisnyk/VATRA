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

{
 const source=await readFile("assets/js/friends.js","utf8");
 const start=source.indexOf("async function data(){"),end=source.indexOf("function online(id)",start);
 assert.ok(start>=0&&end>start);
 const calls=[],pending=[];
 const client={from(table){
  const chain={select(){return chain;},or(){return chain;},eq(){return chain;},order(){return chain;},limit(){
   calls.push(table);return new Promise(resolve=>pending.push(resolve));
  },in(_key,ids){calls.push(table);return new Promise(resolve=>pending.push(()=>resolve({data:ids.map(vatra_id=>({vatra_id})),error:null})));}};
  return chain;
 }};
 const factory=new Function("client","window",`
 let me=false,ownId="1",targetId="2",rows=[],ownRelations,names,photos,accountStates,presence,presenceBusy=false,presenceAvailable=false;
 const counterpart=item=>String(item.recipient_id);
 const validId=id=>/^\\d+$/.test(id);
 const stateFor=item=>item.status;
 `+source.slice(start,end)+`
 return {data,refreshPresence,setRows(value){rows=value;},getPresence(){return presence;},getRelations(){return ownRelations;}};
 `);
 const api=factory(client,{});
 const work=api.data();
 await Promise.resolve();
 assert.deepEqual(calls,["friendships","friendships"],"Independent friend relationship queries must start together");
 pending.shift()({data:[],error:null});
 pending.shift()({data:[{requester_id:1,recipient_id:3,status:"accepted"}],error:null});
 await work;assert.equal(api.getRelations().get("3"),"accepted");
 calls.length=0;api.setRows(Array.from({length:201},(_,i)=>({recipient_id:i+3,status:"accepted"})));
 const status=api.refreshPresence();
 await Promise.resolve();
 assert.deepEqual(calls,Array(3).fill("profile_presence"),"Presence batches must start together without additional requests");
 for(const finish of pending.splice(0))finish();
 await status;assert.equal(api.getPresence().size,201);
}

{
 const source=await readFile("assets/js/post-interactions.js","utf8");
 const start=source.indexOf(" const deletionQueuePrefix="),end=source.indexOf(" function deferPostDelete(",start);
 assert.ok(start>=0&&end>start);
 const keys=new Map(),prefix="vatra.post-delete.pending.v1.7.";
 const ids=Array.from({length:8},(_,i)=>"00000000-0000-4000-8000-"+String(i+1).padStart(12,"0"));
 ids.forEach(id=>keys.set(prefix+id,"1"));
 keys.set("vatra.post-delete.pending.v1.8."+ids[0],"1");
 keys.set(prefix+"invalid","1");
 const storage={get length(){return keys.size;},key:i=>[...keys.keys()][i],removeItem:k=>keys.delete(k)};
 const pending=[],removed=[];let active=0,max=0,calls=0;
 const client={from(table){assert.equal(table,"feed_posts");let id,owner;const chain={delete(){return chain;},eq(key,value){if(key==="id")id=value;else {assert.equal(key,"author_vatra_id");owner=value;}return chain;},select(){return chain;},maybeSingle(){assert.equal(owner,"7");calls++;active++;max=Math.max(max,active);return new Promise(resolve=>pending.push(()=>{active--;if(id===ids[1])resolve({error:new Error("temporary")});else resolve({data:{id,media_items:[{media_kind:"image",media_path:"7/posts/"+id+".webp"},{media_kind:"image",media_path:"8/posts/"+id+".webp"}]},error:null});}));}};return chain;}};
 const flush=new Function("localStorage","window","validId","validUUID","tr",source.slice(start,end)+"return flushPendingPostDeletes;")(storage,{VATRA_POST_MEDIA:{async removeGallery(c,items){removed.push(...items);}}},x=>/^\\d+$/.test(x),x=>/^[0-9a-f-]{36}$/.test(x),(uk,en)=>en);
 const a=flush(client,"7"),b=flush(client,7);assert.equal(a,b,"Concurrent startup consumers share one deletion flush");
 await Promise.resolve();assert.equal(calls,3,"Only three initial deletions may start");
 while(pending.length){pending.splice(0).forEach(f=>f());await Promise.resolve();await Promise.resolve();}
 await a;
 assert.equal(max,3);assert.equal(calls,8);assert.equal(removed.length,7);
 assert.ok(removed.every(x=>x.media_path.startsWith("7/posts/")));
 assert.equal(keys.size,3,"Retryable failures, invalid keys and other-account keys stay untouched");
 assert.ok(keys.has(prefix+ids[1]));
}
console.log("VATRA startup: bounded three-way delete recovery, single-flight and owner-scoped media cleanup passed.");
