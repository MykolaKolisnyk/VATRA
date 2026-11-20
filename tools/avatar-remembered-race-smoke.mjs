// Offline regression: a delayed old avatar must not remove a newer verified photo.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const code=await readFile("assets/js/avatar.js","utf8");
const origin="https://cxrcycxrlkufozomsxcs.supabase.co";
const oldUrl=origin+"/storage/v1/object/public/avatars/21/avatar/old.webp";
const newUrl=origin+"/storage/v1/object/public/avatars/21/avatar/new.webp";
const email="member@example.com";
const values=new Map(),header=new Map(),images=[];
values.set("vatra-remembered-account",JSON.stringify({
 v:1,email,name:"Member",avatarUrl:oldUrl
}));
const storage=values=>({
 getItem:key=>values.get(key)||null,
 setItem:(key,value)=>values.set(key,value),
 removeItem:key=>values.delete(key)
});
class FakeImage{
 constructor(){images.push(this);}
 set src(url){this.source=url;}
 get src(){return this.source;}
}
const context={
 window:{},document:{readyState:"loading",addEventListener(){}},
 localStorage:storage(values),sessionStorage:storage(header),
 URL,Date,JSON,String,Number,Promise,Map,Set,WeakMap,Image:FakeImage,
 getComputedStyle:()=>({getPropertyValue:()=>""})
};
runInNewContext(code,context);
const avatar=context.window.VATRA_AVATAR;
assert.ok(avatar,"The real avatar helper must be loaded");
function element(){
 const classes=new Set();
 return {
  id:"feed-header-avatar",isConnected:true,dataset:{vatraHeaderUrl:""},
  textContent:"V",classList:{
   add:name=>classes.add(name),remove:name=>classes.delete(name),
   contains:name=>classes.has(name)
  },
  style:{
   backgroundImage:"",
   removeProperty(name){if(name==="background-image")this.backgroundImage="";}
  }
 };
}
function verifyNewPortrait(el){
 assert.equal(el.dataset.vatraHeaderUrl,newUrl);
 assert.equal(el.classList.contains("has-photo"),true);
 assert.ok(el.style.backgroundImage.includes("new.webp"));
}
// The previous remembered image was requested, but the newly verified image
// completed first. Its delayed error must not clear DOM state or the new cache.
{
 const el=element();
 avatar.applyRemembered(el,email);
 const pending=images.at(-1);
 assert.equal(pending.source,oldUrl);
 assert.equal(avatar.cache(email,newUrl),true);
 el.dataset.vatraHeaderUrl=newUrl;
 el.classList.add("has-photo");
 el.style.backgroundImage='url("'+newUrl+'")';
 pending.onerror();
 verifyNewPortrait(el);
 assert.equal(avatar.getRemembered(email),newUrl);
}
// Even when the persistent cache has not yet caught up, a stale successful
// callback must not overwrite an authenticated portrait already painted.
{
 avatar.cache(email,oldUrl);
 const el=element();
 avatar.applyRemembered(el,email);
 const pending=images.at(-1);
 el.dataset.vatraHeaderUrl=newUrl;
 el.classList.add("has-photo");
 el.style.backgroundImage='url("'+newUrl+'")';
 pending.onload();
 verifyNewPortrait(el);
}
// Real failures should still invalidate the actual stale remembered URL.
{
 avatar.cache(email,oldUrl);
 const el=element();
 avatar.applyRemembered(el,email);
 images.at(-1).onerror();
 assert.equal(avatar.getRemembered(email),null);
 assert.equal(el.classList.contains("has-photo"),false);
}
console.log("VATRA remembered avatar: stale load/error callbacks cannot overwrite newer photos.");
