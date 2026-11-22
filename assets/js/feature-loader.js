(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript?.src||location.href);
const features=Object.freeze({
 albums:{css:"assets/css/photo-albums.css?rev=0887cf4cfa2d7c442e7774f8520170e6da6d3353",js:"assets/js/photo-albums.js?rev=9092f4df4539418fb1d16744a05914482fdc5501",key:"VATRA_ALBUMS"},
 story:{css:"assets/css/story-editor.css?rev=9536346d0f48121648b02ca6a816596d5faa16df",js:"assets/js/story-editor.js?rev=ebaa9990cc5873d74531e8bd9a13b2449c3030e2",key:"VATRA_STORY_EDITOR"},
 composer:{css:"assets/css/post-composer.css",js:"assets/js/post-composer-ui.js",key:"VATRA_COMPOSER_UI"},
 gift:{css:"assets/css/gifts.css",js:"assets/js/gift-viewer.js?rev=a9252a6ee75ae9b880b0bec7bf179c3937a5c532",key:"VATRA_GIFT_VIEWER"}
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
 const task=stylesheet(definition.css).then(async()=>{
  if(!window[definition.key])await script(definition.js);
  if(!window[definition.key])throw new Error("VATRA feature did not initialize");
  return window[definition.key];
 }).catch(error=>{pending.delete(name);throw error;});
 pending.set(name,task);return task;
}
window.VATRA_FEATURES=Object.freeze({load});
})();