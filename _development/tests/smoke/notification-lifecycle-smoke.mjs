// Isolated browser-style checks against the production notifications code.
// No network or production Supabase calls are made by this test.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const code=await readFile("assets/js/notifications/notifications.js","utf8");
function section(start,end){
 const i=code.indexOf(start),j=code.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,"Missing live notification function: "+start);
 return code.slice(i,j);
}
const unread=section("function hiddenNotificationKinds(id){","async function fetchRows");
const lifecycle=section("function stop(){","async function pageLoad(append=false){");
const render=section("async function renderRows(","function positionPanel(){");
assert.ok(render.includes("return rows;"),"The panel must receive the displayed rows");

// Match production's safe placeholder contract without mounting the full UI.
const format=(uk,_english,values)=>uk.replace(/\{(name|count|page|id)\}/g,
 (_,key)=>String(values[key]??""));
const countCalls=[],removedChannels=[],timers=new Map(),cleared=[];
const listeners=[],guardStarts=[],guardEnds=[];
let timerId=0;
const preferences=new Map();
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
 localStorage:{getItem:key=>preferences.get(key)||null},
 window:{addEventListener(name,fn,opts){listeners.push({name,fn,opts});},VATRA_ACCOUNT_SESSION(client,id){guardStarts.push([client.label,id]);},VATRA_ACCOUNT_END(client,id){guardEnds.push([client.label,id]);}},
 document:{hidden:false,addEventListener(name,fn,opts){listeners.push({name,fn,opts});}},
 setInterval(fn){const id=++timerId;timers.set(id,fn);return id;},
 clearInterval(id){cleared.push(id);timers.delete(id);},
 headerUI(){},closePanel(){},pick:()=>null,
 t:(uk)=>uk,
 format
};
runInNewContext(`
let client=null,ownId=null,bell=globalThis.testBell,badge=globalThis.testBadge;
let panel=globalThis.testPanel,panelItems=null;
let open=false,liveChannel=null,refreshBusy=false,refreshQueued=false;
let notificationRun=null,panelLoadPending=null,panelLoadQueued=false;
let sectionPage=0,sectionLoading=false,sectionQueued=false,sectionScope=null;
const validId=id=>/^[1-9][0-9]{0,18}$/.test(String(id));
const notificationTemplates={post_like:[],friend_request:[]};
${unread}
${lifecycle}
globalThis.notices={start,stop,unreadCount,applyDisplayFilter,run:()=>notificationRun};
`,Object.assign(context,{testBell:bell,testBadge:badge,testPanel:panel}));
const notices=context.notices;
const filters=[];
const mockQuery={not(...args){filters.push(args);return this;}};
preferences.set("vatra:notification-display:12",JSON.stringify(["post_like","invalid)"]));
assert.equal(notices.applyDisplayFilter(mockQuery,"12"),mockQuery);
assert.deepEqual(filters,[["kind","in","(post_like)"]]);
assert.equal(notices.applyDisplayFilter(mockQuery,"13"),mockQuery);
assert.equal(filters.length,1,"Notification preferences must be account-specific");
preferences.clear();
const first=clientFor("A"),second=clientFor("B");
notices.start(first,"12");
assert.equal(countCalls.length,1);
assert.equal(countCalls[0].id,"12");
assert.equal(context.window.VATRA_ACCOUNT_CONTEXT.client,first);
assert.equal(context.window.VATRA_ACCOUNT_CONTEXT.id,"12");
assert.deepEqual(guardStarts,[["A","12"]]);
const oldRun=notices.run();
notices.start(second,"13");
assert.equal(countCalls.length,2);
assert.equal(countCalls[1].id,"13");
assert.equal(context.window.VATRA_ACCOUNT_CONTEXT.client,second);
assert.deepEqual(guardStarts,[["A","12"],["B","13"]]);
assert.deepEqual(guardEnds,[["A","12"]]);
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
assert.equal(guardStarts.length,2,"Same session must not recheck owner access");
const fire=(name,event={})=>{for(const listener of listeners.filter(x=>x.name===name&&!x.opts?.signal?.aborted))listener.fn(event);};
context.document.hidden=true;fire("visibilitychange");
assert.equal(timers.size,0,"Hidden tabs must suspend notification polling");
context.document.hidden=false;fire("visibilitychange");
assert.equal(timers.size,1,"Foreground restores one poll timer");
fire("pagehide",{persisted:true});assert.equal(timers.size,0);
fire("pageshow",{persisted:true});assert.equal(timers.size,1);
second.state.authHandler("SIGNED_OUT");
assert.equal(context.window.VATRA_ACCOUNT_CONTEXT,undefined);
assert.deepEqual(guardEnds,[["A","12"],["B","13"]]);
assert.equal(notices.run(),null,"Sign-out must discard the viewer");
assert.equal(badge.hidden,true);
assert.equal(removedChannels.length,2);
assert.equal(cleared.length,4);
assert.equal(timers.size,0);

const shown=Array.from({length:7},(_,i)=>({
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
  return {rows:shown.slice(0,opts.size).map(row=>({...row})),hasNext:shown.length>opts.size};
 },
 authorNames:async()=>({names:new Map([["14","Member"]]),avatars:new Map(),states:new Map(),forms:new Map()}),
 t:(uk)=>uk,format,
 pick:()=>status,
 unreadCount:async()=>{},
};
runInNewContext(`
let notificationRun={id:"13",client:globalThis.mockClient};
let panel={hidden:false},open=true,panelItems=globalThis.mockList;
let panelLoadPending=null,panelLoadQueued=false;
const make=globalThis.make,createRow=globalThis.createRow,fetchRows=globalThis.fetchRows;
const authorNames=globalThis.authorNames,t=globalThis.t,format=globalThis.format,pick=globalThis.pick;
const unreadCount=globalThis.unreadCount;
${render}
globalThis.panelTest={panelLoad};
`,Object.assign(panelContext,{mockClient:panelClient,mockList:panelList}));
await Promise.all(Array.from({length:9},()=>panelContext.panelTest.panelLoad()));
await new Promise(resolve=>setImmediate(resolve));
assert.equal(queries.length,2,"Concurrent panel refreshes must coalesce to at most two queries");
assert.ok(queries.every(query=>query.size===3),"The drawer must request only three notifications per refresh");
assert.deepEqual(writes,[shown.slice(0,3).map(row=>row.id)],
 "The drawer must acknowledge exactly three visible unread notifications, not the entire inbox");
assert.equal(panelList.children.length,3,"Only three rows may be rendered in the drawer");
assert.ok(shown.slice(3).every(row=>row.read_at===null),"Notifications outside the drawer must remain unread");
// Slow full-inbox reads must not render notifications from a previous viewer.
const fullInbox=section("async function pageLoad(append=false){","function pageUI(){");
let finishOld;
const fullList={children:[],replaceChildren(...entries){this.children=entries;},
 append(node){this.children.push(node);},setAttribute(){}};
const fullEmpty={hidden:true,textContent:""};
const fullMore={hidden:true,disabled:false};
let oldAuthors=0;
const fullCtx={
 Promise,Array,Set,Map,Date,
 pick:selector=>selector==="#notifications-list"?fullList:
  selector==="#notifications-empty"?fullEmpty:fullMore,
 fetchRows:()=>new Promise(resolve=>{finishOld=resolve;}),
 authorNames:async()=>{oldAuthors++;return {names:new Map(),avatars:new Map(),states:new Map()};},
 createRow:()=>({id:"stale"}),t:uk=>uk,format,
};
runInNewContext(`
let notificationRun={id:"12",client:{}},sectionPage=0,sectionLoading=false;
let sectionFilter="all",sectionSort="new",sectionQueued=false,sectionScope=null;
const pick=globalThis.pick,fetchRows=globalThis.fetchRows;
const authorNames=globalThis.authorNames,createRow=globalThis.createRow,t=globalThis.t,format=globalThis.format;
${fullInbox}
globalThis.inboxTest={
 pageLoad,
 switchAccount(){notificationRun={id:"13",client:{}};sectionLoading=false;sectionQueued=false;sectionScope=null;}
};
`,fullCtx);
const readingOld=fullCtx.inboxTest.pageLoad(false);
fullCtx.inboxTest.switchAccount();
finishOld({rows:[{id:"old-notice",actor_vatra_id:"12"}],hasNext:false});
await readingOld;
assert.equal(fullList.children.length,0,"Old-account inbox content must not reappear");
assert.equal(oldAuthors,0,"Do not fetch author details after a viewer change");
const friendshipLifecycle=await readFile("_development/supabase/migrations/20261124081500_resolve_friend_request_notifications.sql","utf8");
assert.ok(
 friendshipLifecycle.includes("AFTER DELETE OR UPDATE OF status ON public.friendships")&&
 friendshipLifecycle.includes("IF OLD.status = 'pending' THEN")&&
 friendshipLifecycle.includes("IF NEW.status = 'accepted' THEN")&&
 friendshipLifecycle.includes("TG_OP = 'DELETE' AND OLD.status = 'pending'")&&
 friendshipLifecycle.includes("a.user_id = (SELECT auth.uid())")&&
 friendshipLifecycle.includes("AND a.vatra_id = OLD.recipient_id")&&
 friendshipLifecycle.includes("ON CONFLICT (recipient_vatra_id, event_key) DO NOTHING")&&
 friendshipLifecycle.includes("NOT EXISTS (")&&
 friendshipLifecycle.includes("f.id = n.target_id AND f.status = 'pending'")&&
 friendshipLifecycle.includes("REVOKE ALL ON FUNCTION private.notify_friend_declined()"),
 "Resolved friend invitations must clear stale notices on accept/cancel/decline, but only recipient declines notify the sender"
);
console.log("VATRA notifications: in-flight coalescing, session teardown, no stale badge, three-row acknowledgment and stale full-inbox protection passed.");

{
 const fixedNow=Date.UTC(2026,10,24,12);
 const dateLocales={uk:"uk-UA",en:"en-GB",pl:"pl-PL",de:"de-DE",fr:"fr-FR",it:"it-IT",ka:"ka-GE",bg:"bg-BG"};
 let locale="uk";
 class Clock extends Date{static now(){return fixedNow;}}
 let formatterCreations=0;
 const CountingIntl={RelativeTimeFormat:function(...args){formatterCreations++;return new Intl.RelativeTimeFormat(...args);}};
 const ctx={Date:Clock,Intl:CountingIntl,Math,Object,Number,dateLocales,language:()=>locale,t:(uk,en)=>locale==="en"?en:uk};
 const time=runInNewContext(section("const plural=(n,a,b,c)=>","const hrefFor=r=>")+"\ntimeValue;",ctx);
 const stamp=age=>new Date(fixedNow-age).toISOString();
 for(const code of ["pl","de","fr","it","ka","bg"]){
  locale=code;
  const formatter=new Intl.RelativeTimeFormat(dateLocales[code],{numeric:"always"});
  for(const [age,amount,unit] of [[300000,5,"minute"],[7200000,2,"hour"],[86400000,1,"day"],[5184000000,2,"month"],[63072000000,2,"year"]]){
   assert.equal(time(stamp(age)),formatter.format(-amount,unit),code+" "+unit);
  }
 }
 assert.equal(formatterCreations,6,"Reuse one formatter per supported locale");
 locale="uk";assert.equal(time(stamp(300000)),"5 хвилин тому");
 locale="en";assert.equal(time(stamp(7200000)),"2 hours ago");
 assert.equal(time("invalid"),"");
 console.log("VATRA notification timestamps: six additional locales and UK/EN compatibility passed.");
}

{
 const shell=await readFile("assets/js/social-shell.js","utf8");
 const start=shell.indexOf(" const soundFiles="),end=shell.indexOf(" function setupHeaderDismiss(",start);
 const prefs=new Map(),played=[];
 let now=1000;
 class Audio{constructor(url){this.url=url;}play(){played.push(this.url);return Promise.resolve();}}
 const env={window:{Audio,VATRA_AUTH_MEMBER_ID:"12"},document:{hidden:false},Audio,URL,soundRoot:new URL("https://example.test/"),Date:{now:()=>now},localStorage:{getItem:key=>prefs.get(key)||null}};
 runInNewContext(shell.slice(start,end),env);
 const play=env.window.VATRA_SOUNDS.play;
 prefs.set("vatra:sound:12:notification","off");
 assert.equal(play("notification"),false);assert.equal(play("newFollower"),false);
 assert.equal(play("like"),true);
 now+=400;env.window.VATRA_AUTH_MEMBER_ID="13";
 assert.equal(play("notification"),true);
 now+=400;prefs.set("vatra:sound:13:like","off");
 assert.equal(play("like"),false);assert.equal(play("newFollower"),true);
 now+=400;env.document.hidden=true;assert.equal(play("notification"),false);
 assert.equal(played.length,3);
 assert.ok(code.includes('!hiddenNotificationKinds(run.id).includes(String(payload?.new?.kind||""))'));
 const settings=await readFile("assets/js/settings.js","utf8");
 assert.ok(settings.includes('key="vatra:sound:"+ownId+":"+kind')&&settings.includes('localStorage.setItem(key,control.checked?"on":"off")'));
 console.log("VATRA sound preferences: actual playback gating, independent categories, account isolation and hidden realtime notifications passed.");
}
