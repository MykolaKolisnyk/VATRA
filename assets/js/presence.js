/* VATRA member presence: a throttled, owner-only heartbeat.
   Browser time is display-only; the database stamps the real activity time. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const validId=x=>/^[1-9][0-9]{0,18}$/.test(String(x??""));
const grammar=gender=>gender==="male"?"masculine":gender==="female"?"feminine":"neutral";
const activeWindow=240000; // Allow a slow connection and missed heartbeat.
let active=null;
function stop(){
 const state=active;
 if(!state)return;
 active=null;
 state.controller.abort();
 if(state.interval!==null)clearInterval(state.interval);
 try{state.authSubscription?.unsubscribe?.();}catch(_){}
}
function start(client,ownId,gender){
 if(!client||!validId(ownId))return Promise.resolve(false);
 const id=String(ownId);
 if(active?.client===client&&active.id===id)return active.promise;
 stop(); // A different viewer must not inherit the previous heartbeat timer.
 const state={client,id,controller:new AbortController(),interval:null,
  authSubscription:null,updating:false,promise:null};
 active=state;
 const table="profile_presence";
 const update=async()=>{
  if(active!==state||state.updating||document.visibilityState==="hidden")return false;
  state.updating=true;
  try{
   const {error}=await client.from(table).update({last_seen_at:new Date().toISOString()})
    .eq("vatra_id",id);
   if(error)throw error;
   return active===state;
  }catch(_){return false;}
  finally{state.updating=false;}
 };
 // Register cleanup before the initial DB read: sign-out may race with it.
 try{
  state.authSubscription=client.auth?.onAuthStateChange?.(event=>{
   if(event==="SIGNED_OUT"&&active===state)stop();
  })?.data?.subscription||null;
 }catch(_){}
 window.addEventListener("pagehide",()=>{if(active===state)stop();},
  {once:true,signal:state.controller.signal});
 state.promise=(async()=>{
  try{
   const {data,error}=await client.from(table).select("vatra_id,form")
    .eq("vatra_id",id).maybeSingle();
   if(active!==state)return false;
   if(error)throw error;
   if(!data){
    const result=await client.from(table).insert({vatra_id:id});
    if(active!==state)return false;
    if(result.error)throw result.error;
   }else await update();
   if(active!==state)return false;
   // A visible tab sends no more than one heartbeat per two minutes.
   let lastTouch=Date.now();
   const pulse=()=>{
    if(active!==state||document.visibilityState==="hidden"||
     Date.now()-lastTouch<120000)return;
    lastTouch=Date.now();
    void update();
   };
   state.interval=setInterval(pulse,60000);
   document.addEventListener("visibilitychange",pulse,
    {passive:true,signal:state.controller.signal});
   return true;
  }catch(_){
   if(active===state)stop();
   return false;
  }
 })();
 return state.promise;
}
// RLS-protected presence belongs to a single Supabase client/session.
// Reuse only overlapping reads and a short snapshot; live status is always
// recalculated by format(), and profile polling still refreshes every 2 min.
const PRESENCE_READ_TTL_MS=8_000,PRESENCE_MISSING_TTL_MS=3_000,PRESENCE_CACHE_MAX=64;
const presenceReadCaches=new WeakMap();
function presenceReadState(client){
 let state=presenceReadCaches.get(client);
 if(state)return state;
 state={entries:new Map(),generation:0};
 presenceReadCaches.set(client,state);
 if(typeof client.auth?.onAuthStateChange==="function"){
  client.auth.onAuthStateChange(event=>{
   if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;
   state.generation++;
   for(const entry of state.entries.values())entry.controller?.abort();
   state.entries.clear();
  });
 }
 return state;
}
async function load(client,targetId){
 if(!client||!validId(targetId))return null;
 const key=String(targetId),state=presenceReadState(client);
 const previous=state.entries.get(key);
 if(previous){
  if(previous.pending)return previous.pending;
  if(previous.expires>Date.now()){
   state.entries.delete(key);state.entries.set(key,previous);
   return previous.value?{...previous.value}:null;
  }
  state.entries.delete(key);
 }
 const generation=state.generation;
 const controller=new AbortController();
 const entry={pending:null,controller,expires:0,value:null};
 const request=(async()=>{
  try{
   let query=client.from("profile_presence")
    .select("last_seen_at,form").eq("vatra_id",key).maybeSingle();
   if(typeof query.abortSignal==="function")query=query.abortSignal(controller.signal);
   const {data,error}=await query;
   if(controller.signal.aborted||state.generation!==generation||error)return null;
   const record=data?{last_seen_at:data.last_seen_at,form:data.form}:null;
   if(state.entries.get(key)===entry){
    state.entries.delete(key);
    state.entries.set(key,{value:record,expires:Date.now()+
     (record?PRESENCE_READ_TTL_MS:PRESENCE_MISSING_TTL_MS)});
    while(state.entries.size>PRESENCE_CACHE_MAX)
     state.entries.delete(state.entries.keys().next().value);
   }
   return record?{...record}:null;
  }catch(_){return null;}
  finally{
   // An old request must never delete a newer viewer's cached result.
   if(state.entries.get(key)===entry)state.entries.delete(key);
  }
 })();
 entry.pending=request;
 state.entries.set(key,entry);
 while(state.entries.size>PRESENCE_CACHE_MAX){
  const oldest=state.entries.keys().next().value;
  const expired=state.entries.get(oldest);
  expired.controller?.abort();
  state.entries.delete(oldest);
 }
 return request;
}
function format(record,english=false){
 const date=record?.last_seen_at?new Date(record.last_seen_at):null;
 if(!date||!Number.isFinite(date.getTime()))return {online:false,text:"",date:null};
 const now=new Date(),elapsed=now.getTime()-date.getTime();
 const online=elapsed>=-30000&&elapsed<=activeWindow;
 if(online)return {online:true,text:"",date};
 const locale=english?"en-GB":"uk-UA";
 const time=new Intl.DateTimeFormat(locale,{hour:"2-digit",minute:"2-digit"}).format(date);
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
 const yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1).getTime();
 const dateStart=new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime();
 const shortDate=new Intl.DateTimeFormat(locale,{day:"2-digit",month:"2-digit",year:"numeric"}).format(date);
 if(english){
  const when=dateStart===today?"today at "+time:dateStart===yesterday?"yesterday at "+time:shortDate+" at "+time;
  return {online:false,text:"Last seen "+when,date};
 }
 const verb=record.form==="masculine"?"Заходив":record.form==="feminine"?"Заходила":"Були в мережі";
 const when=dateStart===today?"сьогодні о "+time:dateStart===yesterday?"вчора о "+time:shortDate+" о "+time;
 return {online:false,text:verb+" "+when,date};
}
window.VATRA_PRESENCE={start,load,format,grammar};
})();
