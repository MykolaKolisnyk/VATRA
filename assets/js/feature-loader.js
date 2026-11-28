(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript?.src||location.href);
const features=Object.freeze({
 "form-select":{css:"assets/css/form-select.css?rev=8efc6efbacbe4e3ec8c03b739d508f7985057d7d",js:"assets/js/form-select.js?rev=a57b98862251836396eeec08e2d27d0778cf3da0",key:"VATRA_FORM_SELECT"},
 albums:{css:"assets/css/photo-albums.css?rev=d173acc7faec74b33482af60793cb107e3b54eb8",js:"assets/js/photo-albums.js?rev=d48e620b647729cf5eed5bf4495684b80273998b",key:"VATRA_ALBUMS"},
 story:{css:"assets/css/story-editor.css?rev=f60b09930c66318e1d19dfbef884331df1f57451",js:"assets/js/story-editor.js?rev=b0800d2dfc764c18dce7b82133cd9389aa846f9a",key:"VATRA_STORY_EDITOR"},
 composer:{css:"assets/css/post-composer.css?rev=a1036096ca552c5ac0c7f51c0f58522441bdba94",js:"assets/js/post-composer-ui.js?rev=f0d7d3846bb7804712992f96ec1e948dff5639c0",key:"VATRA_COMPOSER_UI"},
 gift:{css:"assets/css/gifts.css",js:"assets/js/gift-viewer.js?rev=a9252a6ee75ae9b880b0bec7bf179c3937a5c532",key:"VATRA_GIFT_VIEWER"},
 "profile-gallery":{js:"assets/js/profile-gallery.js?rev=107fc433a724266e5f29b9b2d95375c99a7e15a0",key:"VATRA_PROFILE_GALLERY"},
 "cover-editor":{js:"assets/js/profile-cover-editor.js?rev=95d2182c4b03c53a74e7b9ebdbc9761d585898b9",key:"VATRA_PROFILE_COVER_EDITOR"},
 "avatar-editor":{js:"assets/js/profile-avatar-editor.js?rev=633a59bbf180682416062cae5f853e5de3f80c2f",key:"VATRA_PROFILE_AVATAR_EDITOR"},
 "cover-viewer":{js:"assets/js/profile-cover-viewer.js?rev=76c58fa2ec10543ad3e015b57a4b53b4037b78ca",key:"VATRA_PROFILE_COVER_VIEWER"},
 "avatar-comment-row":{js:"assets/js/profile-avatar-comment-row.js?rev=44af46d5f9ba80b6ffde68e7785b7e828e12d0f7",key:"VATRA_PROFILE_AVATAR_COMMENT_ROW"}
});
const pending=new Map();
const loadedStyles=new Set();
function stylesheet(source){
 if(loadedStyles.has(source))return Promise.resolve();
 const href=new URL(source,root).href;
 if(typeof document.querySelectorAll==="function"&&
  [...document.querySelectorAll('link[rel="stylesheet"]')].some(link=>link.href===href)){
  loadedStyles.add(source);return Promise.resolve();
 }
 return new Promise((resolve,reject)=>{
  const link=document.createElement("link");
  link.rel="stylesheet";link.href=href;
  link.dataset.vatraLazyStylesheet=source;
  link.onload=()=>{loadedStyles.add(source);resolve();};
  link.onerror=()=>{link.remove();reject(new Error("VATRA stylesheet unavailable"));};
  document.head.append(link);
 });
}
function script(source){
 return new Promise((resolve,reject)=>{
  const element=document.createElement("script");
  element.src=new URL(source,root).href;
  element.async=true;element.dataset.vatraLazyScript=source;
  element.onload=resolve;
  element.onerror=()=>{element.remove();reject(new Error("VATRA feature unavailable"));};
  document.head.append(element);
 });
}
function load(name){
 const definition=features[name];
 if(!definition)return Promise.reject(new Error("Unknown VATRA feature"));
 if(pending.has(name))return pending.get(name);
 const task=(definition.css?stylesheet(definition.css):Promise.resolve()).then(async()=>{
  if(name==="composer")await load("form-select");
  if(!window[definition.key])await script(definition.js);
  if(!window[definition.key])throw new Error("VATRA feature did not initialize");
  return window[definition.key];
 }).catch(error=>{pending.delete(name);throw error;});
 pending.set(name,task);return task;
}
window.VATRA_FEATURES=Object.freeze({load});
})();