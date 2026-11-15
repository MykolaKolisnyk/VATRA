/* Offline checks for dark-grey, hover-free auto-hiding form scrollbars. */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const [base,lang,signup,feed,profile]=await Promise.all([
 "assets/css/base.css","assets/js/lang.js","assets/css/create-account.css",
 "assets/css/feed.css","assets/css/profile.css"
].map(path=>readFile(path,"utf8")));
assert.ok(base.includes(".language-scroll-track.is-visible")&&
 base.includes("background:#454b54")&&
 base.includes("background:transparent;cursor:pointer;touch-action:none;opacity:0"),
 "Language scrollbar must be dark graphite with an invisible track");
assert.ok(!base.includes(".language-scroll-track:hover")&&
 !base.includes(".language-scroll-thumb:hover"),
 "Language scroll track must have no hover decoration");
assert.ok(base.includes("@property --vatra-form-scroll-alpha")&&
 base.includes("transition:--vatra-form-scroll-alpha .46s ease")&&
 base.includes("scrollbar-color:rgb(64 70 79 / var(--vatra-form-scroll-alpha)) transparent"),
 "Native form scrollbars must fade using the registered graphite alpha");
for(const selector of [".captcha-dialog",".vatra-select-list",".vt-tour-card-001",
 ".vatra-search-history",".profile-photo-comments",".profile-compose-dialog",
 ".vatra-post-composer-edit",".vatra-notification-panel",".vatra-gift-viewer",
 "textarea"])
 assert.ok(base.includes(selector),"Missing shared form scrollbar scope: "+selector);
for(const css of [signup,feed,profile])
 assert.ok(!css.includes("scrollbar-color:var(--scroll-thumb) var(--scroll-track)")&&
  !css.includes("linear-gradient(180deg,#8bb1f6,#8274d7)"),
  "Legacy blue/purple form scrollbar style must be deleted");
const start=lang.indexOf("/* One passive, delegated controller");
assert.ok(start>=0,"Shared input controller must exist");
let clockId=0;
const tasks=new Map(),listeners=new Map();
const document={
 addEventListener(name,handler){listeners.set(name,handler);},
 activeElement:null
};
const context={
 document,WeakMap,clearTimeout:id=>tasks.delete(id),
 setTimeout:(fn,ms)=>{assert.equal(ms,1050);const id=++clockId;tasks.set(id,fn);return id;}
};
runInNewContext(lang.slice(start),context);
const classes=new Set();
const element={
 matches:selector=>selector.includes(".vatra-select-list"),
 classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)},
 scrollHeight:400,clientHeight:200
};
const fire=(type,target,extra={})=>{
 assert.ok(listeners.has(type),"Missing delegated "+type+" listener");
 listeners.get(type)({target,...extra});
};
fire("scroll",element);
assert.equal(classes.has("vatra-form-scroll-active"),true);
assert.equal(tasks.size,1);
fire("scroll",element);
assert.equal(tasks.size,1,"New activity must cancel the old hide timer");
const child={closest:()=>element};
fire("wheel",child);
assert.equal(classes.has("vatra-form-scroll-active"),true);
fire("pointerdown",child);
document.activeElement=element;
fire("keydown",element,{key:"PageDown"});
assert.equal(tasks.size,1,"All interactions must share one per-element fade timer");
for(const fn of [...tasks.values()])fn();
tasks.clear();
assert.equal(classes.has("vatra-form-scroll-active"),false,
 "Inactive scrollbar must be hidden after one timeout");
fire("keydown",element,{key:"a"});
assert.equal(tasks.size,0,"Typing must not expose scrollbars");
const plain={matches:()=>false};
fire("scroll",plain);
assert.equal(tasks.size,0,"Ordinary page scrolling must not activate form effects");
assert.ok(lang.includes('scrollTrack.addEventListener("pointerdown"')&&
 lang.includes('scrollTrack.classList.add("is-dragging")')&&
 lang.includes('clearTimeout(scrollbarFadeTimer)'),
 "Language thumb dragging and timer cleanup must remain intact");
console.log("VATRA form scrollbars: graphite, no-hover track, scroll/drag/keyboard fade verified offline.");
