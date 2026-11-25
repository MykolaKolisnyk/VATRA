(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const validId=x=>/^[1-9][0-9]{0,18}$/.test(String(x??""));
const grammar=gender=>gender==="male"?"masculine":gender==="female"?"feminine":"neutral";
const activeWindow=150000;
const HEARTBEAT_INTERVAL_MS=45000,RETRY_INTERVAL_MS=12000;
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
 stop();
 const state={client,id,controller:new AbortController(),interval:null,
  authSubscription:null,updating:false,promise:null,lastSuccessAt:0,lastAttemptAt:0,failed:false};
 active=state;
 const touchKey="vatra:presence-touch:"+id;
 const readTouch=()=>{
  try{const value=Number(sessionStorage.getItem(touchKey)||0);return value<=Date.now()?value:0;}
  catch(_){return 0;}
 };
 const rememberTouch=()=>{
  try{sessionStorage.setItem(touchKey,String(Date.now()));}catch(_){}
 };
 state.lastSuccessAt=readTouch();
 const update=async()=>{
  if(active!==state||state.updating||document.visibilityState==="hidden")return false;
  state.updating=true;state.lastAttemptAt=Date.now();
  try{
   const {data,error}=await client.from("profile_presence")
    .upsert({vatra_id:id,last_seen_at:new Date().toISOString(),form:grammar(gender)},
     {onConflict:"vatra_id"}).select("vatra_id").maybeSingle();
   if(error||String(data?.vatra_id)!==id)throw error||Error("Presence heartbeat not confirmed");
   if(active!==state)return false;
   state.lastSuccessAt=Date.now();state.failed=false;
   rememberTouch();
   return true;
  }catch(_){
   if(active===state){state.failed=true;state.lastAttemptAt=Date.now();}
   return false;
  }finally{state.updating=false;}
 };
 const pulse=(force=false)=>{
  if(active!==state||state.updating||document.visibilityState==="hidden")return;
  const now=Date.now();
  const due=now-state.lastSuccessAt>=HEARTBEAT_INTERVAL_MS;
  const attemptGap=state.failed?RETRY_INTERVAL_MS:Math.min(HEARTBEAT_INTERVAL_MS,force?5000:HEARTBEAT_INTERVAL_MS);
  if((!due&&!state.failed)||now-state.lastAttemptAt<attemptGap)return;
  void update();
 };
 try{
  state.authSubscription=client.auth?.onAuthStateChange?.(event=>{
   if(event==="SIGNED_OUT"&&active===state)stop();
  })?.data?.subscription||null;
 }catch(_){}
 const pause=()=>{
  if(state.interval!==null){clearInterval(state.interval);state.interval=null;}
 };
 const resume=()=>{
  if(active!==state||document.visibilityState==="hidden")return;
  if(state.interval===null)state.interval=setInterval(()=>pulse(false),20000);
  pulse(true);
 };
 window.addEventListener("pagehide",event=>{
  if(active!==state)return;
  if(event?.persisted)pause();else stop();
 },{signal:state.controller.signal});
 window.addEventListener("pageshow",resume,{signal:state.controller.signal});
 window.addEventListener("focus",resume,{signal:state.controller.signal});
 window.addEventListener("online",resume,{signal:state.controller.signal});
 document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden")pause();else resume();
 },{passive:true,signal:state.controller.signal});
 if(document.visibilityState!=="hidden")state.interval=setInterval(()=>pulse(false),20000);
 state.promise=(async()=>{
  if(Date.now()-state.lastSuccessAt>=HEARTBEAT_INTERVAL_MS)return update();
  return true;
 })();
 return state.promise;
}


const PRESENCE_READ_TTL_MS=15_000,PRESENCE_MISSING_TTL_MS=5_000,PRESENCE_CACHE_MAX=64;
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
  if(previous.pending){
   state.entries.delete(key);state.entries.set(key,previous);
   return previous.pending.then(value=>value?{...value}:null);
  }
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

   }
   return record?{...record}:null;
  }catch(_){return null;}
  finally{

   if(state.entries.get(key)===entry)state.entries.delete(key);
  }
 })();
 entry.pending=request;
 state.entries.set(key,entry);
 while(state.entries.size>PRESENCE_CACHE_MAX){
  const oldest=[...state.entries].find(([,candidate])=>!candidate.pending)?.[0]??state.entries.keys().next().value;
  const expired=state.entries.get(oldest);
  expired.controller?.abort();
  state.entries.delete(oldest);
 }
 return request;
}
function plural(n,one,few,many){
 const last=n%100,tail=n%10;
 return n+" "+(tail===1&&last!==11?one:tail>=2&&tail<=4&&(last<12||last>14)?few:many);
}
function relative(value,english=false,now=Date.now()){
 const date=value instanceof Date?value:new Date(value);
 if(!Number.isFinite(date.getTime()))return "";
 const ms=Math.max(0,now-date.getTime());
 if(ms<300000)return english?"just now":"щойно";
 const minutes=Math.floor(ms/300000)*5;
 if(ms<3600000)return english?minutes+" minutes ago":plural(minutes,"хвилину","хвилини","хвилин")+" тому";
 const hours=Math.floor(ms/3600000);
 if(ms<86400000)return english?hours+" hour"+(hours===1?"":"s")+" ago":plural(hours,"годину","години","годин")+" тому";
 const days=Math.floor(ms/86400000);
 if(ms<2592000000)return english?days+" day"+(days===1?"":"s")+" ago":plural(days,"день","дні","днів")+" тому";
 const months=Math.floor(ms/2592000000);
 if(ms<31536000000)return english?months+" month"+(months===1?"":"s")+" ago":plural(months,"місяць","місяці","місяців")+" тому";
 const years=Math.floor(ms/31536000000);
 return english?years+" year"+(years===1?"":"s")+" ago":plural(years,"рік","роки","років")+" тому";
}
function format(record,english=false){
 const date=record?.last_seen_at?new Date(record.last_seen_at):null;
 if(!date||!Number.isFinite(date.getTime()))return {online:false,text:"",date:null};
 const elapsed=Date.now()-date.getTime();
 const online=elapsed>=-30000&&elapsed<=activeWindow;
 if(online)return {online:true,text:"",date};
 const ago=relative(date,english);
 const verb=record.form==="masculine"?"Заходив":record.form==="feminine"?"Заходила":null;
 return {online:false,text:english?"Last seen "+ago:verb?verb+" "+ago:"Остання активність: "+ago,date};
}

window.VATRA_PRESENCE={start,load,format,grammar,relative};
})();
