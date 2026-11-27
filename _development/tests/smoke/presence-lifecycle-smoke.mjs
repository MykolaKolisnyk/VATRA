// VATRA: isolated heartbeat lifecycle and retry test. Never contacts live Supabase.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const source=await readFile("assets/js/presence.js","utf8");
const first=source.indexOf("let active=null;"),end=source.indexOf("const PRESENCE_READ_TTL_MS=",first);
assert.ok(first>=0&&end>first,"Locate the session-bound heartbeat");
let now=1_000_000;
class Clock extends Date{
 constructor(...args){super(...(args.length?args:[now]));}
 static now(){return now;}
}
const intervals=new Map(),listeners=[],writes=[];
let timerId=0;
const document={
 visibilityState:"visible",
 addEventListener(name,handler,options){listeners.push({name,handler,options});}
};
const window={
 navigator:{userAgent:"Desktop browser",userAgentData:{mobile:false}},
 addEventListener(name,handler,options){listeners.push({name,handler,options});}
};
function fire(name,event={}){
 for(const entry of listeners.filter(x=>x.name===name&&!x.options?.signal?.aborted))entry.handler(event);
}
function tick(){
 for(const callback of intervals.values())callback();
}
function makeClient(label){
 const state={callback:null,unsubscribed:false};
 const client={
  from(table){
   assert.equal(table,"profile_presence");
   return {upsert(row,options){
    assert.equal(options.onConflict,"vatra_id");
    assert.ok(row.last_seen_at);
    assert.equal(row.device_type,window.navigator.userAgentData.mobile?"mobile":"desktop");
    assert.ok(["masculine","feminine","neutral"].includes(row.form));
    return {select(columns){
     assert.equal(columns,"vatra_id");
     return {maybeSingle(){
      return new Promise(resolve=>writes.push({label,id:String(row.vatra_id),form:row.form,resolve}));
     }};
    }};
   }};
  },
  auth:{onAuthStateChange(callback){
   state.callback=callback;
   return {data:{subscription:{unsubscribe(){state.unsubscribed=true;state.callback=null;}}}};
  }}
 };
 return {client,state};
}
const context={
 Date:Clock,Promise,AbortController,
 sessionStorage:{getItem(){return null;},setItem(){}},
 setInterval(callback){const id=++timerId;intervals.set(id,callback);return id;},
 clearInterval(id){intervals.delete(id);},
 window,document
};
runInNewContext(`
const validId=x=>/^[1-9][0-9]{0,18}$/.test(String(x??""));
const grammar=gender=>gender==="male"?"masculine":gender==="female"?"feminine":"neutral";
const activeWindow=150000,HEARTBEAT_INTERVAL_MS=45000,RETRY_INTERVAL_MS=12000;
${source.slice(first,end)}
globalThis.presenceTest={start,stop,deviceType,active:()=>active};
`,context);
const presence=context.presenceTest;
assert.equal(presence.deviceType({userAgent:"Mozilla Android",userAgentData:{mobile:true}}),"mobile");
assert.equal(presence.deviceType({userAgent:"Desktop",platform:"MacIntel",maxTouchPoints:5}),"mobile");
assert.equal(presence.deviceType({userAgent:"Desktop",userAgentData:{mobile:false}}),"desktop");
assert.equal(presence.deviceType({}),null);
const a=makeClient("A"),b=makeClient("B");
const started=presence.start(a.client,"12","male");
await new Promise(resolve=>setImmediate(resolve));
assert.equal(writes.length,1,"Start must send one confirmed heartbeat");
assert.equal(writes[0].id,"12");assert.equal(writes[0].form,"masculine");
writes[0].resolve({data:{vatra_id:"12"},error:null});
assert.equal(await started,true);
assert.equal(intervals.size,1);
assert.equal(await presence.start(a.client,"12","male"),true);
assert.equal(intervals.size,1,"Repeated owner start must not create another timer");

// Failed writes cannot postpone the next attempt by a full minute.
now+=46000;tick();
assert.equal(writes.length,2);
now+=30000;tick();
assert.equal(writes.length,2,"Never overlap in-flight heartbeats");
writes[1].resolve({data:null,error:Error("Temporary outage")});
await new Promise(resolve=>setImmediate(resolve));
now+=9000;tick();
assert.equal(writes.length,2,"Retry must be throttled");
now+=4000;tick();
assert.equal(writes.length,3,"Failure must retry promptly after short backoff");
writes[2].resolve({data:{vatra_id:"12"},error:null});
await new Promise(resolve=>setImmediate(resolve));

// Hidden tabs do not write, but returning to the foreground refreshes activity.
document.visibilityState="hidden";fire("visibilitychange");
assert.equal(intervals.size,0,"Hidden tabs must not retain a heartbeat interval");
now+=120000;tick();
assert.equal(writes.length,3);
document.visibilityState="visible";fire("visibilitychange");
assert.equal(intervals.size,1,"Visibility resume restores exactly one interval");
assert.equal(writes.length,4);
writes[3].resolve({data:{vatra_id:"12"},error:null});
await new Promise(resolve=>setImmediate(resolve));

// The back-forward cache must not permanently orphan presence tracking.
now+=60000;fire("pagehide",{persisted:true});
assert.equal(presence.active()?.id,"12");
assert.equal(intervals.size,0,"BFCache suspends heartbeat");
fire("pageshow",{persisted:true});
assert.equal(intervals.size,1);assert.equal(writes.length,5);
writes[4].resolve({data:{vatra_id:"12"},error:null});
await new Promise(resolve=>setImmediate(resolve));
const old=presence.active();
const next=presence.start(b.client,"13");
assert.equal(old.controller.signal.aborted,true);
assert.equal(a.state.unsubscribed,true);
assert.equal(intervals.size,1,"Switching viewers must replace the previous timer");
assert.equal(writes.length,6);
assert.equal(writes[5].form,"neutral");
writes[5].resolve({data:{vatra_id:"13"},error:null});
assert.equal(await next,true);
b.state.callback("SIGNED_OUT");
assert.equal(presence.active(),null);
assert.equal(intervals.size,0);
assert.equal(b.state.unsubscribed,true);

// Unconfirmed 0-row writes must not be mistaken for a successful heartbeat.
const again=presence.start(b.client,"13","female");
assert.equal(writes.length,7);
writes[6].resolve({data:null,error:null});
assert.equal(await again,false);
now+=13000;tick();
assert.equal(writes.length,8,"Missing row confirmation must trigger retry");
writes[7].resolve({data:{vatra_id:"13"},error:null});
await new Promise(resolve=>setImmediate(resolve));
fire("pagehide",{persisted:false});
assert.equal(presence.active(),null);
assert.equal(intervals.size,0);
console.log("VATRA presence: confirmed heartbeat, short retry, foreground/BFCache resume, auth isolation and pagehide cleanup passed.");
