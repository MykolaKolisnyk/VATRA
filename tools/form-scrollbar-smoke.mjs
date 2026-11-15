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
 base.includes("scrollbar-width:thin!important")&&
 !base.includes("scrollbar-width:auto!important")&&
 base.includes("::-webkit-scrollbar-button")&&
 base.includes("display:none!important;width:0!important;height:0!important"),
 "Chromium/Opera form lists must suppress native top/bottom arrow buttons");
for(const scope of [".captcha-dialog",".vatra-select-scroll-area",".vt-tour-scroll-area-001",
 ".vatra-search-history",".profile-photo-comments",".profile-compose-dialog",
 ".vatra-post-composer-edit",".vatra-notification-panel","textarea"])
 assert.ok(base.includes(scope),"Missing shared scrollbar scope: "+scope);
assert.ok(signup.includes(".vatra-select-scroll-area")&&
 signup.includes("margin-right:12px")&&signup.includes("overflow:hidden")&&
 signup.includes("scrollbar-width:none!important")&&
 signup.includes(".vatra-select-scroll-area::-webkit-scrollbar,")&&
 signup.includes("display:none!important;width:0!important;height:0!important")&&
 signup.includes(".vatra-select-scroll-rail[hidden]")&&
 signup.includes(".vatra-select-scroll-rail.is-visible")&&
 signup.includes("background:#454b54"),
 "Date lists must hide browser arrows and use an inset, fadeable graphite VATRA rail");
const registerJs=await readFile("assets/js/create-account.js","utf8");
assert.ok(registerJs.includes('rail.className="vatra-select-scroll-rail ui-select-rail-"+select.id')&&
 registerJs.includes('scrollArea.addEventListener("scroll"')&&
 registerJs.includes('rail.addEventListener("pointerdown"')&&
 registerJs.includes('rail.addEventListener("wheel"')&&
 registerJs.includes('rail.setPointerCapture(e.pointerId)')&&
 registerJs.includes('requestAnimationFrame(()=>{')&&
 registerJs.includes('if(overflow<=1){rail.hidden=true;')&&
 registerJs.includes('rail.hidden=false;'),
 "VATRA date rail must track scrolling, support dragging and reveal before measuring");
assert.ok(feed.includes("margin:3px 8px 9px 0"),
 "Search history scrollbar should be inset from the popup edges");
const onboarding=await readFile("assets/css/onboarding.css","utf8");
const tour=await readFile("assets/js/onboarding.js","utf8");
assert.ok(onboarding.includes(".vt-tour-scroll-area-001")&&
 onboarding.includes("width:calc(100% - 10px);margin-right:10px")&&
 tour.includes("card.append(scrollArea)")&&tour.includes("scrollArea.append(actions)"),
 "Tour must scroll inside its rounded frame, not along its outside edge");
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
 matches:selector=>selector.includes(".vatra-select-scroll-area"),
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
