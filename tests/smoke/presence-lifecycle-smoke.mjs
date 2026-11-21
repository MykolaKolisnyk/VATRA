// VATRA: test owner-only presence heartbeat lifetime with an isolated mock.
// This script never connects to production Supabase or edits any user record.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const source=await readFile("assets/js/presence.js","utf8");
const first=source.indexOf("let active=null;"),end=source.indexOf("async function load(client,targetId)",first);
assert.ok(first>=0&&end>first,"Find the current session-bound presence heartbeat");
let now=1000000;
class Clock extends Date {static now(){return now;}}
const intervalFns=new Map(),cleared=[],listeners=[],writes=[],reads=[];
let timerId=0;
const document={visibilityState:"visible",addEventListener(name,handler,options){
 listeners.push({name,handler,options});
}};
const window={addEventListener(name,handler,options){
 listeners.push({name,handler,options});
}};
function makeClient(label){
 const state={authCallback:null,unsubscribed:false};
 const client={label,state,from(table){
  assert.equal(table,"profile_presence");
  return {
   select(columns){
    assert.equal(columns,"vatra_id,form");
    return {eq(key,id){return {async maybeSingle(){
     reads.push({label,id});
     return {data:{vatra_id:id},error:null};
    }};}};
   },
   update(value){
    assert.ok(value.last_seen_at);
    return {eq(key,id){
     assert.equal(key,"vatra_id");
     return new Promise(resolve=>writes.push({label,id,resolve}));
    }};
   },
   insert(){throw Error("Present account should use one UPDATE, not INSERT");}
  };
 },auth:{onAuthStateChange(callback){
  state.authCallback=callback;
  return {data:{subscription:{unsubscribe(){state.unsubscribed=true;state.authCallback=null;}}}};
 }}};
 return client;
}
const context={
 Date:Clock,Promise,AbortController,setInterval(fn){const id=++timerId;intervalFns.set(id,fn);return id;},
 clearInterval(id){cleared.push(id);intervalFns.delete(id);},window,document
};
runInNewContext(`
const validId=x=>/^[1-9][0-9]{0,18}$/.test(String(x??""));
${source.slice(first,end)}
globalThis.presenceTest={start,stop,active:()=>active};
`,context);
const presence=context.presenceTest;
const a=makeClient("A"),b=makeClient("B");
const aRun=presence.start(a,"12","male");
await new Promise(resolve=>setImmediate(resolve));
assert.equal(writes.length,1,"Start should not duplicate the initial heartbeat");
assert.equal(writes[0].id,"12");
writes[0].resolve({error:null});
assert.equal(await aRun,true);
assert.equal(reads.length,1);
assert.equal(intervalFns.size,1);
const same=await presence.start(a,"12","male");
assert.equal(same,true);
assert.equal(reads.length,1,"Starting the same owner again must reuse its setup");
assert.equal(intervalFns.size,1,"Only one heartbeat timer is allowed");
now+=121000;
for(const timer of intervalFns.values())timer();
for(const l of listeners.filter(l=>l.name==="visibilitychange"))l.handler();
await new Promise(resolve=>setImmediate(resolve));
assert.equal(writes.length,2,"Timer and visibility events must not double-write");
now+=121000;
for(const timer of intervalFns.values())timer();
assert.equal(writes.length,2,"Do not create concurrent heartbeat updates");
const oldActive=presence.active();
const bRun=presence.start(b,"13");
await new Promise(resolve=>setImmediate(resolve));
assert.equal(oldActive.controller.signal.aborted,true);
assert.equal(a.state.unsubscribed,true);
assert.equal(intervalFns.size,0,"Switching account clears the old timer");
assert.equal(writes.length,3,"New viewer needs its own initial heartbeat");
assert.equal(writes[2].id,"13");
writes[1].resolve({error:null});
writes[2].resolve({error:null});
assert.equal(await bRun,true);
assert.equal(intervalFns.size,1);
document.visibilityState="hidden";
now+=121000;
for(const timer of intervalFns.values())timer();
await new Promise(resolve=>setImmediate(resolve));
assert.equal(writes.length,3,"Hidden tabs must not write presence");
document.visibilityState="visible";
b.state.authCallback("SIGNED_OUT");
assert.equal(presence.active(),null);
assert.equal(intervalFns.size,0);
assert.equal(b.state.unsubscribed,true);
const third=presence.start(b,"13");
await new Promise(resolve=>setImmediate(resolve));
assert.equal(writes.length,4,"Fresh session can restart after sign-out");
writes[3].resolve({error:null});
await third;
const current=presence.active();
const hide= listeners.findLast(l=>l.name==="pagehide"&&!l.options.signal.aborted);
assert.ok(hide,"The current pagehide handler must be registered");
hide.handler();
assert.equal(presence.active(),null);
assert.equal(current.controller.signal.aborted,true);
assert.equal(intervalFns.size,0);
console.log("VATRA presence: single heartbeat, hidden-tab pause, account isolation, sign-out/pagehide cleanup passed.");
