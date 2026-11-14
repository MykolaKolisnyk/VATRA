/* VATRA shared avatar: public-image cache only, never credentials or auth tokens. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const KEY="vatra-remembered-account";
const HEADER_KEY="vatra-authenticated-header-v1";
const ORIGIN="https://rjasunoawrxvetwadylh.supabase.co";
const SYSTEM_AVATARS=Object.freeze({
 default:{1024:"/VATRA/assets/avatars/avatar-default.svg",2048:"/VATRA/assets/avatars/avatar-default.svg"},
 deleted:{1024:"/VATRA/assets/avatars/avatar-deleted.svg",2048:"/VATRA/assets/avatars/avatar-deleted.svg"},
 "not-found":{1024:"/VATRA/assets/avatars/avatar-not-found.svg",2048:"/VATRA/assets/avatars/avatar-not-found.svg"},
 blocked:{1024:"/VATRA/assets/avatars/avatar-blocked.svg",2048:"/VATRA/assets/avatars/avatar-blocked.svg"}
});
const SYSTEM_COVERS=Object.freeze({
 default:"/VATRA/assets/covers/cover-default.svg",
 deleted:"/VATRA/assets/covers/cover-deleted.svg",
 "not-found":"/VATRA/assets/covers/cover-not-found.svg",
 blocked:"/VATRA/assets/covers/cover-blocked.svg"
});
const coverAsset=(state="default")=>SYSTEM_COVERS[state]||SYSTEM_COVERS.default;
const asset=(state="default",size=1024)=>
 (SYSTEM_AVATARS[state]||SYSTEM_AVATARS.default)[size>=2048?2048:1024];
function fallback(element,state="default"){
 if(!element)return;
 const kind=Object.hasOwn(SYSTEM_AVATARS,state)?state:"default";
 element.dataset.vatraAvatarState=kind;
 element.classList.remove("has-photo");
 element.style.removeProperty("background-image");
 element.textContent="";
}
function clearFallback(element){
 if(element)element.removeAttribute("data-vatra-avatar-state");
}
const STATE_TTL_MS=10_000,STATE_CACHE_MAX=256;
// Scope short state snapshots and in-flight queries to one Supabase client.
const stateLookupCaches=new WeakMap();
function stateForClient(client){
 let bucket=stateLookupCaches.get(client);
 if(bucket)return bucket;
 bucket={rows:new Map(),pending:new Map(),generation:0};
 stateLookupCaches.set(client,bucket);
 if(typeof client.auth?.onAuthStateChange==="function"){
  client.auth.onAuthStateChange(event=>{
   if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;
   bucket.generation++;
   bucket.rows.clear();
   bucket.pending.clear();
  });
 }
 return bucket;
}
async function states(client,ids){
 const valid=[...new Set((ids||[]).map(String)
  .filter(id=>/^[1-9][0-9]{0,18}$/.test(id)))].slice(0,100);
 const result=new Map();
 if(!valid.length||!client)return result;
 const bucket=stateForClient(client),generation=bucket.generation;
 const now=Date.now();
 const missing=valid.filter(id=>{
  const entry=bucket.rows.get(id);
  if(entry&&entry.expires>now)return false;
  if(entry)bucket.rows.delete(id);
  return !bucket.pending.has(id);
 });
 if(missing.length){
  const task=(async()=>{
   const {data,error}=await client.from("account_states")
    .select("vatra_id,state,blocked_until").in("vatra_id",missing);
   if(error)throw error;
   // Never populate an authenticated cache with a previous session's result.
   if(bucket.generation!==generation)return;
   const found=new Map((data||[]).map(row=>[String(row.vatra_id),row]));
   const expires=Date.now()+STATE_TTL_MS;
   for(const id of missing){
    bucket.rows.delete(id);
    bucket.rows.set(id,{record:found.get(id)||null,expires});
   }
   while(bucket.rows.size>STATE_CACHE_MAX)
    bucket.rows.delete(bucket.rows.keys().next().value);
  })();
  for(const id of missing)bucket.pending.set(id,task);
  void task.finally(()=>{
   for(const id of missing)
    if(bucket.pending.get(id)===task)bucket.pending.delete(id);
  }).catch(()=>{});
 }
 // Reuse overlapping in-flight batches instead of issuing duplicate queries.
 const waiting=[...new Set(valid.map(id=>bucket.pending.get(id)).filter(Boolean))];
 if(waiting.length)await Promise.allSettled(waiting);
 if(bucket.generation!==generation)return new Map();
 for(const id of valid){
  const entry=bucket.rows.get(id);
  if(!entry||entry.expires<=Date.now())continue;
  const row=entry.record;
  if(row?.state==="deleted")result.set(id,"deleted");
  else if(row?.state==="blocked"&&row.blocked_until&&
   Date.parse(row.blocked_until)>Date.now())result.set(id,"blocked");
 }
 return result;
}
// Feed avatar paths are public bucket metadata, but profile_media queries
// still run under the current viewer's RLS: never share these rows via Redis.
const PATH_TTL_MS=15_000,PATH_MISSING_TTL_MS=5_000,PATH_CACHE_MAX=256;
const pathLookupCaches=new WeakMap();
function pathsFor(client){
 let state=pathLookupCaches.get(client);
 if(state)return state;
 state={rows:new Map(),pending:new Map(),generation:0};
 pathLookupCaches.set(client,state);
 if(typeof client.auth?.onAuthStateChange==="function"){
  client.auth.onAuthStateChange(event=>{
   if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;
   state.generation++;
   state.rows.clear();
   state.pending.clear();
  });
 }
 return state;
}
function cachedPath(state,id){
 const entry=state.rows.get(id);
 if(!entry)return undefined;
 if(entry.expires<=Date.now()){
  state.rows.delete(id);
  return undefined;
 }
 state.rows.delete(id);
 state.rows.set(id,entry);
 return entry.row;
}
function rememberPath(state,id,row){
 state.rows.delete(id);
 state.rows.set(id,{row,expires:Date.now()+(row?PATH_TTL_MS:PATH_MISSING_TTL_MS)});
 while(state.rows.size>PATH_CACHE_MAX)
  state.rows.delete(state.rows.keys().next().value);
}
async function paths(client,ids){
 const valid=[...new Set((ids||[]).map(String)
  .filter(id=>/^[1-9][0-9]{0,18}$/.test(id)))].slice(0,100);
 if(!valid.length)return {data:[],error:null};
 if(!client)return {data:[],error:Error("Missing Supabase client")};
 const state=pathsFor(client),generation=state.generation;
 const needed=[],waiting=new Set();
 for(const id of valid){
  if(cachedPath(state,id)!==undefined)continue;
  const pending=state.pending.get(id);
  if(pending)waiting.add(pending);
  else needed.push(id);
 }
 if(needed.length){
  const task=client.from("profile_media")
   .select("vatra_id,avatar_path").in("vatra_id",needed)
   .then(({data,error})=>{
    if(error)throw error;
    if(state.generation!==generation)return;
    const allowed=new Set(needed),found=new Map();
    for(const row of data||[]){
     const id=String(row.vatra_id);
     if(allowed.has(id)&&typeof row.avatar_path==="string"&&
      row.avatar_path.startsWith(id+"/avatar/"))
      found.set(id,{vatra_id:row.vatra_id,avatar_path:row.avatar_path});
    }
    for(const id of needed)rememberPath(state,id,found.get(id)||null);
   });
  for(const id of needed)state.pending.set(id,task);
  waiting.add(task);
  void task.finally(()=>{
   for(const id of needed)
    if(state.pending.get(id)===task)state.pending.delete(id);
  }).catch(()=>{});
 }
 try{
  await Promise.all(waiting);
  if(state.generation!==generation)
   throw Error("Session changed while loading avatar paths");
  return {data:valid.map(id=>cachedPath(state,id)).filter(Boolean),error:null};
 }catch(error){return {data:[],error};}
}
function invalidatePath(client,id){
 pathLookupCaches.get(client)?.rows.delete(String(id));
}
function safeUrl(input){
 if(typeof input!=="string")return null;
 try{
  const url=new URL(input);
  if(url.origin!==ORIGIN||url.search||url.hash)return null;
  if(!/^\/storage\/v1\/object\/public\/avatars\/[1-9][0-9]{0,18}\/avatar\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname))return null;
  return url.href;
 }catch(_){return null;}
}
function read(){
 try{
  const value=JSON.parse(localStorage.getItem(KEY)||"null");
  return value?.v===1&&typeof value.email==="string"&&
   typeof value.name==="string"?value:null;
 }catch(_){return null;}
}
const emailKey=email=>String(email||"").trim().toLowerCase();
function getRemembered(email){
 const saved=read();
 return saved&&emailKey(saved.email)===emailKey(email)?safeUrl(saved.avatarUrl):null;
}
function cache(email,url){
 const saved=read();
 if(!saved||emailKey(saved.email)!==emailKey(email))return false;
 const safe=url?safeUrl(url):null;
 if(url&&!safe)return false;
 if(safe)saved.avatarUrl=safe;
 else delete saved.avatarUrl;
 try{
  localStorage.setItem(KEY,JSON.stringify(saved));
  const entry=headerRead();
  if(entry&&emailKey(entry.email)===emailKey(email)){
   entry.avatarUrl=safe||null;saveHeader(entry);
  }
  return true;
 }catch(_){return false;}
}
function fromPath(client,email,id,path){
 if(!/^[1-9][0-9]{0,18}$/.test(String(id||"")))return false;
 if(path!==null&&path!==undefined&&
  (typeof path!=="string"||!path.startsWith(String(id)+"/avatar/")))return false;
 if(!path){
  const entry=headerRead();
  if(entry&&emailKey(entry.email)===emailKey(email)){
   entry.avatarUrl=null;saveHeader(entry);
   const el=document.querySelector("#feed-header-avatar");
   if(el){el.dataset.vatraHeaderUrl="";el.classList.remove("has-photo");
    el.style.removeProperty("background-image");el.textContent=entry.initials||"V";}
  }
  return cache(email,null);
 }
 const url=client?.storage?.from("avatars")?.getPublicUrl(path)?.data?.publicUrl;
 const safe=safeUrl(url);
 if(!safe)return false;
 const photo=new Image();
 photo.onload=()=>{
  cache(email,safe);
  const entry=headerRead();
  if(entry&&emailKey(entry.email)===emailKey(email)){
   entry.avatarUrl=safe;saveHeader(entry);paintHeader(entry);
  }
 };
 photo.onerror=()=>{
  const entry=headerRead();
  if(entry&&emailKey(entry.email)===emailKey(email)&&entry.avatarUrl===safe){
   entry.avatarUrl=null;saveHeader(entry);
  }
 };
 photo.src=safe;
 return true;
}
function headerRead(){
 try{
  const entry=JSON.parse(sessionStorage.getItem(HEADER_KEY)||"null");
  if(!entry||entry.v!==1||!entry.email||typeof entry.name!=="string"||
   Date.now()-entry.at>12*60*60*1000)return null;
  return entry;
 }catch(_){return null;}
}
function saveHeader(entry){
 try{sessionStorage.setItem(HEADER_KEY,JSON.stringify(entry));}catch(_){}
}
function paintHeader(entry,validate=true){
 const face=document.querySelector("#feed-header-avatar");
 const label=document.querySelector("#feed-menu-name");
 const id=document.querySelector("#feed-header-id");
 if(label)label.textContent=entry.name;
 if(id)id.textContent=entry.id?"VATRA ID "+entry.id:"";
 if(!face)return;
 if(!face.classList.contains("has-photo"))face.textContent=entry.initials||"V";
 const safe=safeUrl(entry.avatarUrl);
 if(!safe)return;
 if(face.dataset.vatraHeaderUrl===safe&&face.classList.contains("has-photo"))return;
 face.dataset.vatraHeaderUrl=safe;
 // The URL is safe and was confirmed during the previous page. Applying it
 // synchronously is essential: a new page must not paint the silhouette while
 // waiting for another image.onload event. Browser cache handles the pixels.
 face.style.backgroundImage="url("+JSON.stringify(safe)+")";
 face.classList.add("has-photo");face.textContent="";
 const photo=new Image();
 photo.onload=()=>{
  if(!face.isConnected||face.dataset.vatraHeaderUrl!==safe)return;
  face.style.backgroundImage="url("+JSON.stringify(safe)+")";
  face.classList.add("has-photo");face.textContent="";
 };
 photo.onerror=()=>{
  if(!face.isConnected||face.dataset.vatraHeaderUrl!==safe)return;
  face.classList.remove("has-photo");face.style.removeProperty("background-image");
  face.textContent=entry.initials||"V";
  face.dataset.vatraHeaderUrl="";
  const latest=headerRead();
  if(latest&&latest.avatarUrl===safe){
   latest.avatarUrl=null;saveHeader(latest);
  }
  if(validate)cache(entry.email,null);
 };
 photo.src=safe;
}
function primeHeader(){
 const entry=headerRead();
 if(entry&&document.body?.classList.contains("feed-page"))paintHeader(entry,true);
}
// Preload the last verified portrait while HTML is being parsed, ahead of the
// route's authentication and media queries. This does not reveal auth data.
const previousHeader=headerRead();
const cachedPhoto=safeUrl(previousHeader?.avatarUrl);
if(cachedPhoto&&document.head){
 const preload=document.createElement("link");
 preload.rel="preload";preload.as="image";preload.href=cachedPhoto;
 preload.className="ui-vatra-header-photo-preload-001";
 document.head.append(preload);
}
function setHeader({email,name,initials,id}){
 if(!email){
  // Older account fixtures may not expose an email. Render confirmed identity
  // without persisting a header against an unverifiable account.
  const label=document.querySelector("#feed-menu-name");
  const face=document.querySelector("#feed-header-avatar");
  const number=document.querySelector("#feed-header-id");
  if(label)label.textContent=String(name||"VATRA").slice(0,32);
  if(face&&!face.classList.contains("has-photo"))face.textContent=String(initials||"V").slice(0,3);
  if(number)number.textContent=id?"VATRA ID "+id:"";
  return;
 }
 const current=headerRead();
 const matching=current&&emailKey(current.email)===emailKey(email);
 const entry={v:1,at:Date.now(),email:emailKey(email),
  name:String(name||"VATRA").slice(0,32),initials:String(initials||"V").slice(0,3),
  id:id?String(id):"",avatarUrl:matching?current.avatarUrl:null};
 const verified=getRemembered(email);
 if(verified&&!entry.avatarUrl)entry.avatarUrl=verified;
 saveHeader(entry);paintHeader(entry);
}
function clearHeader(activeEmail){
 // Preserve the same user's cached header through reauthentication but never
 // show the previous account's identity after switching accounts in one tab.
 const saved=headerRead();
 if(activeEmail&&saved&&emailKey(saved.email)===emailKey(activeEmail))return;
 try{sessionStorage.removeItem(HEADER_KEY);}catch(_){}
}
function applyRemembered(element,email){
 if(!element)return;
 const url=getRemembered(email);
 if(!url)return;
 const active=headerRead();
 // A remembered-account picture may be older than the photo verified during
 // this tab's previous page. Never let its delayed onload overwrite the newer one.
 if(element.id==="feed-header-avatar"&&active&&
  emailKey(active.email)===emailKey(email)&&safeUrl(active.avatarUrl)&&
  safeUrl(active.avatarUrl)!==url)return;
 if(element.dataset.vatraHeaderUrl===url&&element.classList.contains("has-photo"))return;
 const picture=new Image();
 picture.onload=()=>{
  if(!element.isConnected||getRemembered(email)!==url)return;
  element.style.backgroundImage="url("+JSON.stringify(url)+")";
  element.classList.add("has-photo");element.textContent="";
  if(element.id==="feed-header-avatar"){
   element.dataset.vatraHeaderUrl=url;
   const entry=headerRead();
   if(entry&&emailKey(entry.email)===emailKey(email)){
    entry.avatarUrl=url;saveHeader(entry);
   }
  }
 };
 picture.onerror=()=>{
  if(!element.isConnected)return;
  if(element.dataset.vatraHeaderUrl!==url){
   element.classList.remove("has-photo");
   element.style.removeProperty("background-image");
  }
  cache(email,null);
 };
 picture.src=url;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",primeHeader,{once:true});
else primeHeader();
window.VATRA_AVATAR={cache,getRemembered,fromPath,applyRemembered,setHeader,clearHeader,asset,coverAsset,fallback,clearFallback,states,paths,invalidatePath};
})();