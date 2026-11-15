/* Offline regression: dark, hover-free, arrowless VATRA form scrollbars. */
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
 "Language scrollbar must keep a dark graphite thumb on a transparent track");
assert.ok(!base.includes(".language-scroll-track:hover")&&
 !base.includes(".language-scroll-thumb:hover"),
 "Language scrollbar must not react with a background or changed color on hover");
assert.ok(base.includes("@property --vatra-form-scroll-alpha")&&
 base.includes("transition:--vatra-form-scroll-alpha .46s ease")&&
 base.includes("scrollbar-color:rgb(64 70 79 / var(--vatra-form-scroll-alpha)) transparent"),
 "Native form scrollbars must retain dark fade animation");
assert.ok(base.includes("@supports selector(::-webkit-scrollbar)")&&
 base.includes("::-webkit-scrollbar-button")&&
 base.includes("display:none!important;width:0!important;height:0!important"),
 "Chromium/Opera form lists must suppress native top/bottom arrow buttons");
for(const scope of [".captcha-dialog",".vatra-select-list",".vt-tour-card-001",
 ".vatra-search-history",".profile-photo-comments",".profile-compose-dialog",
 ".vatra-post-composer-edit",".vatra-notification-panel","textarea"])
 assert.ok(base.includes(scope),"Missing shared scrollbar scope: "+scope);
for(const css of [signup,feed,profile])
 assert.ok(!css.includes("scrollbar-color:var(--scroll-thumb) var(--scroll-track)")&&
  !css.includes("linear-gradient(180deg,#8bb1f6,#8274d7)"),
  "Old blue and purple scrollbar overrides must not return");
assert.ok(lang.includes('dialog.addEventListener("pointerenter"')&&
 lang.includes('dialog.addEventListener("pointerleave"')&&
 lang.includes('if (pointerInsideDialog || dragging) return;')&&
 lang.includes('scrollTrack.classList.add("is-dragging")'),
 "Language picker thumb must remain visible while pointer is inside or dragging");
const start=lang.indexOf("/* One delegated controller for all VATRA scrolling forms.");
assert.ok(start>=0,"Shared hover scroll controller must exist");
let clockId=0;
const tasks=new Map(),listeners=new Map();
const document={addEventListener(name,fn){listeners.set(name,fn);},activeElement:null};
const context={document,WeakMap,WeakSet,
 clearTimeout:id=>tasks.delete(id),
 setTimeout:(fn,ms)=>{assert.equal(ms,1050);const id=++clockId;tasks.set(id,fn);return id;}};
runInNewContext(lang.slice(start),context);
const classes=new Set();
const element={
 matches:selector=>selector.includes(".vatra-select-list"),
 closest:()=>element,
 classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)},
 scrollHeight:400,clientHeight:200
};
const child={closest:()=>element};
const fire=(name,args)=>{
 assert.ok(listeners.has(name),"Missing delegated "+name+" listener");
 listeners.get(name)(args);
};
fire("pointerover",{pointerType:"mouse",target:child});
assert.equal(classes.has("vatra-form-scroll-active"),true);
assert.equal(tasks.size,0,"Hover must not schedule an idle hide timer");
fire("scroll",{target:element});
assert.equal(tasks.size,0,"Scrolling while hovered must not start fade");
fire("wheel",{target:child});
assert.equal(tasks.size,0,"Wheel input while hovered must keep thumb visible");
fire("pointerout",{pointerType:"mouse",target:child,relatedTarget:{closest:()=>element}});
assert.equal(classes.has("vatra-form-scroll-active"),true,
 "Moving between options inside a form must not hide the thumb");
fire("pointerout",{pointerType:"mouse",target:child,relatedTarget:null});
assert.equal(classes.has("vatra-form-scroll-active"),false,
 "Leaving the form must fade its thumb immediately via CSS");
fire("scroll",{target:element});
assert.equal(tasks.size,1,"Keyboard/touch scrolling outside a form gets a temporary thumb");
for(const fn of [...tasks.values()])fn();
tasks.clear();
assert.equal(classes.has("vatra-form-scroll-active"),false,
 "A non-hovered thumb must eventually fade after activity");
document.activeElement=element;
fire("keydown",{key:"PageDown"});
assert.equal(tasks.size,1,"Keyboard scrolling must still reveal the thumb");
fire("keydown",{key:"a"});
assert.equal(tasks.size,1,"Typing ordinary text must not create additional timers");
fire("pointerover",{pointerType:"mouse",target:child});
assert.equal(tasks.size,0,"Entering the form must cancel the pending fade timer");
assert.equal(classes.has("vatra-form-scroll-active"),true);
fire("pointerout",{pointerType:"mouse",target:child,relatedTarget:null});
assert.equal(classes.has("vatra-form-scroll-active"),false);
console.log("VATRA forms: graphite, arrowless and hover-present scrollbars verified offline.");
