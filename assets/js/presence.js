/* VATRA member presence: a throttled, owner-only heartbeat.
   Browser time is display-only; the database stamps the real activity time. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const validId=x=>/^[1-9][0-9]{0,18}$/.test(String(x??""));
const grammar=gender=>gender==="male"?"masculine":gender==="female"?"feminine":"neutral";
const activeWindow=240000; // Allow a slow connection and missed heartbeat.
let started=null;
function start(client,ownId,gender){
 if(!client||!validId(ownId))return Promise.resolve(false);
 if(started)return started;
 let available=true;
 const table="profile_presence";
 const update=async()=>{
  if(!available||document.visibilityState==="hidden")return false;
  try{
   const {error}=await client.from(table).update({last_seen_at:new Date().toISOString()})
    .eq("vatra_id",ownId);
   if(error)throw error;
   return true;
  }catch(_){return false;}
 };
 started=(async()=>{
  try{
   const {data,error}=await client.from(table).select("vatra_id,form")
    .eq("vatra_id",ownId).maybeSingle();
   if(error)throw error;
   if(!data){
    const result=await client.from(table).insert({vatra_id:ownId});
    if(result.error)throw result.error;
   }else await update();
   // No more than one write per two minutes while visible.
   let lastTouch=Date.now();
   const pulse=()=>{
    if(document.visibilityState==="hidden"||Date.now()-lastTouch<120000)return;
    lastTouch=Date.now();void update();
   };
   setInterval(pulse,60000);
   document.addEventListener("visibilitychange",pulse,{passive:true});
   return true;
  }catch(_){available=false;return false;}
 })();
 return started;
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
