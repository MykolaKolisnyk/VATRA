// Isolated browser-style checks against the production notifications code.
// No network or production Supabase calls are made by this test.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const code=await readFile("assets/js/notifications.js","utf8");
function section(start,end){
 const i=code.indexOf(start),j=code.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,"Missing live notification function: "+start);
 return code.slice(i,j);
}
const unread=section("async function unreadCount(){","async function fetchRows");
const lifecycle=section("function stop(){","async function pageLoad(append=false){");
const render=section("async function renderRows(","function positionPanel(){");
assert.ok(render.includes("return rows;"),"The panel must receive the displayed rows");

const countCalls=[],removedChannels=[],timers=new Map(),cleared=[];
const listeners=[];
let timerId=0;
const bell={attrs:new Map(),setAttribute(k,v){this.attrs.set(k,v);}};
const badge={hidden:true,textContent:""};
const panel={hidden:true};
function clientFor(label){
 const state={authHandler:null,channel:null};
 return {
  label,state,
  from(table){
   assert.equal(table,"member_notifications");
   return {select(){return {eq(_key,id){return {is(){return new Promise(resolve=>
    countCalls.push({label,id,resolve}));}};}};}};
  },
  channel(name){
   const channel={name,on(_event,_config,handler){this.handler=handler;return this;},
    subscribe(callback){callback("SUBSCRIBED");return this;}};
   state.channel=channel;return channel;
  },
  removeChannel(channel){removedChannels.push({label,channel});},
  auth:{onAuthStateChange(handler){
   state.authHandler=handler;
   return {data:{subscription:{unsubscribe(){state.authHandler=null;}}}};
  }}
 };
}
const context={
 URL,Date,Promise,AbortController,Map,Set,
 window:{addEventListener(name,fn,opts){listeners.push({name,fn,opts});}},
 document:{hidden:false,addEventListener(name,fn,opts){listeners.push({name,fn,opts});}},
 setInterval(fn){const id=++timerId;timers.set(id,fn);return id;},
 clearInterval(id){cleared.push(id);timers.delete(id);},
 headerUI(){},closePanel(){},
 t:(uk)=>uk
};
runInNewContext(`
let client=null,ownId=null,bell=globalThis.testBell,badge=globalThis.testBadge;
let panel=globalThis.testPanel,panelItems=null;
let open=false,liveChannel=null,refreshBusy=false,refreshQueued=false;
let notificationRun=null,panelLoadPending=null,panelLoadQueued=false;
${unread}
${lifecycle}
globalThis.notices={start,stop,unreadCount,run:()=>notificationRun};
`,Object.assign(context,{testBell:bell,testBadge:badge,testPanel:panel}));
const notices=context.notices;
const first=clientFor("A"),second=clientFor("B");
notices.start(first,"12");
assert.equal(countCalls.length,1);
assert.equal(countCalls[0].id,"12");
const oldRun=notices.run();
notices.start(second,"13");
assert.equal(countCalls.length,2);
assert.equal(countCalls[1].id,"13");
assert.equal(oldRun.controller.signal.aborted,true,"Old event handlers must be aborted");
assert.equal(removedChannels.length,1,"Old realtime channel should be removed");
assert.equal(cleared.length,1,"Old interval must be cleared");
countCalls[0].resolve({count:99,error:null});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(badge.hidden,true,"Old-account count cannot be displayed after switching");
await Promise.all([notices.unreadCount(),notices.unreadCount(),notices.unreadCount()]);
assert.equal(countCalls.length,2,"Concurrent counts must share one in-flight query");
countCalls[1].resolve({count:2,error:null});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(countCalls.length,3,"A burst should schedule exactly one trailing refresh");
assert.equal(countCalls[2].id,"13");
countCalls[2].resolve({count:3,error:null});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(badge.textContent,"3");
assert.equal(badge.hidden,false);
notices.start(second,"13");
assert.equal(countCalls.length,3,"Starting the same viewer twice must be a no-op");
second.state.authHandler("SIGNED_OUT");
assert.equal(notices.run(),null,"Sign-out must discard the viewer");
assert.equal(badge.hidden,true);
assert.equal(removedChannels.length,2);
assert.equal(cleared.length,2);
assert.equal(timers.size,0);

const shown=Array.from({length:6},(_,i)=>({
 id:"notice-"+i,actor_vatra_id:"14",created_at:"2026-11-14T00:00:00Z",read_at:null
}));
const panelList={
 children:[],attrs:{},
 replaceChildren(...elements){this.children=elements;},
 setAttribute(name,value){this.attrs[name]=value;},
 querySelectorAll(){return this.children;}
};
const status={hidden:true,textContent:""};
const writes=[],queries=[];
const panelClient={from(table){
 assert.equal(table,"member_notifications");
 return {update(data){
  assert.ok(data.read_at);
  return {eq(_col,id){
   assert.equal(id,"13");
   return {in(_key,ids){return {async is(){
    writes.push(Array.from(ids));
    for(const row of shown)if(ids.includes(row.id))row.read_at="now";
    return {error:null};
   }};}};
  }};
 }};
}};
const panelContext={
 Promise,Array,Date,Map,Set,
 make(_tag,_cls){return {append(){},setAttribute(){},classList:{remove(){}}};},
 createRow(record){return {id:record.id,classList:{remove(){}}};},
 fetchRows:async opts=>{
  queries.push(opts);
  return {rows:shown.map(row=>({...row})),hasNext:false};
 },
 authorNames:async()=>({names:new Map([["14","Member"]]),avatars:new Map(),states:new Map()}),
 t:(uk)=>uk,
 pick:()=>status,
 unreadCount:async()=>{},
};
runInNewContext(`
let notificationRun={id:"13",client:globalThis.mockClient};
let panel={hidden:false},open=true,panelItems=globalThis.mockList;
let panelLoadPending=null,panelLoadQueued=false;
const make=globalThis.make,createRow=globalThis.createRow,fetchRows=globalThis.fetchRows;
const authorNames=globalThis.authorNames,t=globalThis.t,pick=globalThis.pick;
const unreadCount=globalThis.unreadCount;
${render}
globalThis.panelTest={panelLoad};
`,Object.assign(panelContext,{mockClient:panelClient,mockList:panelList}));
await Promise.all(Array.from({length:9},()=>panelContext.panelTest.panelLoad()));
await new Promise(resolve=>setImmediate(resolve));
assert.equal(queries.length,2,"Concurrent panel refreshes must coalesce to at most two queries");
assert.deepEqual(writes,[shown.map(row=>row.id)],
 "The drawer must acknowledge exactly the six visible unread notifications");
console.log("VATRA notifications: in-flight coalescing, session teardown, no stale badge, six-row acknowledgment passed.");
