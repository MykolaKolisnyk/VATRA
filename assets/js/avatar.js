/* VATRA shared avatar: public-image cache only, never credentials or auth tokens. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const KEY="vatra-remembered-account";
const HEADER_KEY="vatra-authenticated-header-v1";
const ORIGIN="https://rjasunoawrxvetwadylh.supabase.co";
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
 if(!path)return cache(email,null);
 const url=client?.storage?.from("vatra-avatars")?.getPublicUrl(path)?.data?.publicUrl;
 return cache(email,url||null);
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
 // Keep the already cached photo in place while verifying it in the background.
 if(face.dataset.vatraHeaderUrl===safe&&face.classList.contains("has-photo"))return;
 const previous=face.dataset.vatraHeaderUrl;
 face.dataset.vatraHeaderUrl=safe;
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
  if(validate)cache(entry.email,null);
 };
 photo.src=safe;
}
function primeHeader(){
 const entry=headerRead();
 if(entry&&document.body?.classList.contains("feed-page"))paintHeader(entry,false);
}
function setHeader({email,name,initials,id}){
 if(!email)return;
 const current=headerRead();
 const matching=current&&emailKey(current.email)===emailKey(email);
 const entry={v:1,at:Date.now(),email:emailKey(email),
  name:String(name||"VATRA").slice(0,32),initials:String(initials||"V").slice(0,3),
  id:id?String(id):"",avatarUrl:matching?current.avatarUrl:null};
 const verified=getRemembered(email);
 if(verified)entry.avatarUrl=verified;
 saveHeader(entry);paintHeader(entry);
}
function clearHeader(){
 try{sessionStorage.removeItem(HEADER_KEY);}catch(_){}
}
function applyRemembered(element,email){
 if(!element)return;
 const url=getRemembered(email);
 if(!url)return;
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
window.VATRA_AVATAR={cache,getRemembered,fromPath,applyRemembered,setHeader,clearHeader};
})();