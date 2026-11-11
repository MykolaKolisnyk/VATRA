/* VATRA shared avatar: public-image cache only, never credentials or auth tokens. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const KEY="vatra-remembered-account";
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
function applyRemembered(element,email){
 if(!element)return;
 const url=getRemembered(email);
 element.classList.remove("has-photo");
 element.style.removeProperty("background-image");
 if(!url)return;
 const picture=new Image();
 picture.onload=()=>{
  if(!element.isConnected||getRemembered(email)!==url)return;
  element.style.backgroundImage="url("+JSON.stringify(url)+")";
  element.classList.add("has-photo");
 };
 picture.onerror=()=>{
  if(!element.isConnected)return;
  element.classList.remove("has-photo");
  element.style.removeProperty("background-image");
  cache(email,null);
 };
 picture.src=url;
}
window.VATRA_AVATAR={cache,getRemembered,fromPath,applyRemembered};
})();