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
async function load(client,targetId){
 if(!client||!validId(targetId))return null;
 try{
  const {data,error}=await client.from("profile_presence")
   .select("last_seen_at,form").eq("vatra_id",targetId).maybeSingle();
  return error?null:data||null;
 }catch(_){return null;}
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
