/* VATRA shared avatar: public-image cache only, never credentials or auth tokens. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const KEY="vatra-remembered-account";
const HEADER_KEY="vatra-authenticated-header-v1";
const ORIGIN="https://rjasunoawrxvetwadylh.supabase.co";
const SYSTEM_AVATARS=Object.freeze({
 default:{1024:"/VATRA/assets/avatars/avatar-default.png",2048:"/VATRA/assets/avatars/avatar-default.png"},
 deleted:{1024:"/VATRA/assets/avatars/avatar-deleted.png",2048:"/VATRA/assets/avatars/avatar-deleted.png"},
 "not-found":{1024:"/VATRA/assets/avatars/avatar-not-found.png",2048:"/VATRA/assets/avatars/avatar-not-found.png"},
 blocked:{1024:"/VATRA/assets/avatars/avatar-blocked.png",2048:"/VATRA/assets/avatars/avatar-blocked.png"}
});
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
async function states(client,ids){
 const valid=[...new Set((ids||[]).map(String).filter(id=>/^[1-9][0-9]{0,18}$/.test(id)))].slice(0,100);
 const result=new Map();
 if(!valid.length||!client)return result;
 try{
  const {data,error}=await client.from("vatra_account_states")
   .select("vatra_id,state,blocked_until").in("vatra_id",valid);
  if(error)return result;
  for(const row of data||[]){
   const id=String(row.vatra_id);
   if(row.state==="deleted")result.set(id,"deleted");
   else if(row.state==="blocked"&&row.blocked_until&&Date.parse(row.blocked_until)>Date.now())
    result.set(id,"blocked");
  }
 }catch(_){}
 return result;
}
const accentCache=new Map();
const DEFAULT_ACCENT="#497bd4";
function portraitColor(image){
 const canvas=document.createElement("canvas");
 canvas.width=48;canvas.height=48;
 const context=canvas.getContext("2d",{willReadFrequently:true});
 if(!context)return DEFAULT_ACCENT;
 context.drawImage(image,0,0,48,48);
 const pixels=context.getImageData(0,0,48,48).data;
 const bins=Array.from({length:24},()=>({weight:0,sin:0,cos:0,saturation:0,lightness:0}));
 for(let i=0;i<pixels.length;i+=4){
  const alpha=pixels[i+3]/255;
  if(alpha<.72)continue;
  const r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255;
  const high=Math.max(r,g,b),low=Math.min(r,g,b),delta=high-low;
  const lightness=(high+low)/2;
  if(delta<.035||lightness<.08||lightness>.92)continue;
  const saturation=delta/(1-Math.abs(2*lightness-1));
  if(!Number.isFinite(saturation)||saturation<.13)continue;
  let hue=0;
  if(high===r)hue=((g-b)/delta)%6;
  else if(high===g)hue=(b-r)/delta+2;
  else hue=(r-g)/delta+4;
  hue=(hue*60+360)%360;
  const index=Math.min(23,Math.floor(hue/15));
  const weight=alpha*Math.pow(saturation,1.55)*
   (.5+Math.min(lightness,1-lightness))*
   (1+(.18*(1-Math.abs((Math.floor(i/4)%48)-23.5)/23.5)));
  const bin=bins[index],radians=hue*Math.PI/180;
  bin.weight+=weight;bin.sin+=Math.sin(radians)*weight;
  bin.cos+=Math.cos(radians)*weight;
  bin.saturation+=saturation*weight;bin.lightness+=lightness*weight;
 }
 let best=0;
 for(let i=1;i<bins.length;i++){
  if(bins[i].weight>bins[best].weight)best=i;
 }
 if(bins[best].weight<.08)return DEFAULT_ACCENT;
 // Keep one coherent hue family instead of averaging different colors into grey.
 let weight=0,sin=0,cos=0,saturation=0,lightness=0;
 for(const i of [(best+23)%24,best,(best+1)%24]){
  const b=bins[i];weight+=b.weight;sin+=b.sin;cos+=b.cos;
  saturation+=b.saturation;lightness+=b.lightness;
 }
 const hue=(Math.atan2(sin,cos)*180/Math.PI+360)%360;
 const finalSat=Math.max(.56,Math.min(.82,saturation/weight*1.13));
 const finalLight=Math.max(.39,Math.min(.57,lightness/weight));
 return "hsl("+Math.round(hue)+" "+Math.round(finalSat*100)+"% "+Math.round(finalLight*100)+"%)";
}
function accent(element,url){
 if(!element)return;
 const source=url||asset(),put=color=>{
  if(element.dataset.vatraAccentSource===source)
   element.style.setProperty("--vatra-avatar-accent",color);
 };
 element.dataset.vatraAccentSource=source;
 // Never show a grey ring, even while the photo is decoding.
 if(accentCache.has(source)){put(accentCache.get(source));return;}
 put(DEFAULT_ACCENT);
 const image=new Image();
 image.crossOrigin="anonymous";
 image.onload=()=>{
  let color=DEFAULT_ACCENT;
  try{color=portraitColor(image);}catch(_){/* CORS or decode failure: keep brand blue. */}
  accentCache.set(source,color);put(color);
 };
 image.onerror=()=>{accentCache.set(source,DEFAULT_ACCENT);put(DEFAULT_ACCENT);};
 image.src=source;
}

function safeUrl(input){
 if(typeof input!=="string")return null;
 try{
  const url=new URL(input);
  if(url.origin!==ORIGIN||url.search||url.hash)return null;
  if(!/^\/storage\/v1\/object\/public\/vatra-avatars\/[1-9][0-9]{0,18}\/avatar\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname))return null;
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
 const url=client?.storage?.from("vatra-avatars")?.getPublicUrl(path)?.data?.publicUrl;
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
window.VATRA_AVATAR={cache,getRemembered,fromPath,applyRemembered,setHeader,clearHeader,asset,fallback,clearFallback,states,accent};
})();