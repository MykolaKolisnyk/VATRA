(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript?.src||location.href);
const features=Object.freeze({
 albums:{css:"assets/css/photo-albums.css?rev=a8dfcd64071d2c319f8328d2da011833e49be04e",js:"assets/js/photo-albums.js?rev=3756056a0220dcac75ce52932d3374bcd9aec5b9",key:"VATRA_ALBUMS"},
 story:{css:"assets/css/story-editor.css?rev=9536346d0f48121648b02ca6a816596d5faa16df",js:"assets/js/story-editor.js?rev=ebaa9990cc5873d74531e8bd9a13b2449c3030e2",key:"VATRA_STORY_EDITOR"},
 composer:{css:"assets/css/post-composer.css?rev=c26566635080adbef9c89af2bf2813633eb4fc9a",js:"assets/js/post-composer-ui.js?rev=524917dad85c0582691b0b7f85185cf430b0dbbc",key:"VATRA_COMPOSER_UI"},
 gift:{css:"assets/css/gifts.css",js:"assets/js/gift-viewer.js?rev=a9252a6ee75ae9b880b0bec7bf179c3937a5c532",key:"VATRA_GIFT_VIEWER"},
 "profile-gallery":{js:"assets/js/profile-gallery.js?rev=2e276147513a80c25912d0b7f371798210a7a516",key:"VATRA_PROFILE_GALLERY"},
 "cover-editor":{js:"assets/js/profile-cover-editor.js?rev=95d2182c4b03c53a74e7b9ebdbc9761d585898b9",key:"VATRA_PROFILE_COVER_EDITOR"},
 "avatar-editor":{js:"assets/js/profile-avatar-editor.js?rev=48b7f406f71f4833379842d6b59bb804f5ee87ff",key:"VATRA_PROFILE_AVATAR_EDITOR"},
 "cover-viewer":{js:"assets/js/profile-cover-viewer.js?rev=2b1285daeb16ac2e55e71ea75eb6f05b226ebc91",key:"VATRA_PROFILE_COVER_VIEWER"},
 "avatar-comment-row":{js:"assets/js/profile-avatar-comment-row.js?rev=b25ffc338c31ff70bb2943df7739b153f3be1cf6",key:"VATRA_PROFILE_AVATAR_COMMENT_ROW"}
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