(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript?.src||location.href);
const features=Object.freeze({
 albums:{css:"assets/css/photo-albums.css?rev=7288b5ccfc8c0dfd4c880f6167a7d8bd21aa38e1",js:"assets/js/photo-albums.js?rev=90c52a57f441eb05315b50e05eae3e6fd5dd68eb",key:"VATRA_ALBUMS"},
 story:{css:"assets/css/story-editor.css?rev=d746f453ab1b5384eb53eda2aafeca356a028a0c",js:"assets/js/story-editor.js?rev=1d5f2f8c1e8f7f3280d4a3eb828815a7f8fee10f",key:"VATRA_STORY_EDITOR"},
 composer:{css:"assets/css/post-composer.css?rev=de812db9fc973f3c6bb521e93fcd9b1e205df23f",js:"assets/js/post-composer-ui.js?rev=38aa08fe47c4601c973dfef47383c132146739aa",key:"VATRA_COMPOSER_UI"},
 gift:{css:"assets/css/gifts.css",js:"assets/js/gift-viewer.js?rev=a9252a6ee75ae9b880b0bec7bf179c3937a5c532",key:"VATRA_GIFT_VIEWER"},
 "profile-gallery":{js:"assets/js/profile-gallery.js?rev=f00fbc6f618ecf4d4ac111f279a8c5d0da590fd5",key:"VATRA_PROFILE_GALLERY"},
 "cover-editor":{js:"assets/js/profile-cover-editor.js?rev=95d2182c4b03c53a74e7b9ebdbc9761d585898b9",key:"VATRA_PROFILE_COVER_EDITOR"},
 "avatar-editor":{js:"assets/js/profile-avatar-editor.js?rev=633a59bbf180682416062cae5f853e5de3f80c2f",key:"VATRA_PROFILE_AVATAR_EDITOR"},
 "cover-viewer":{js:"assets/js/profile-cover-viewer.js?rev=e26a6692a25b9cfd46490a4dd71a0aee69d54c53",key:"VATRA_PROFILE_COVER_VIEWER"},
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
  if(!window[definition.key])await script(definition.js);
  if(!window[definition.key])throw new Error("VATRA feature did not initialize");
  return window[definition.key];
 }).catch(error=>{pending.delete(name);throw error;});
 pending.set(name,task);return task;
}
window.VATRA_FEATURES=Object.freeze({load});
})();