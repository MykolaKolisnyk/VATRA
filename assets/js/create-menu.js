(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
for(const root of document.querySelectorAll("[data-create-menu]")){
 const trigger=root.querySelector("[data-create-toggle]"),panel=root.querySelector("[data-create-panel]");
 if(!trigger||!panel)continue;
 let timer=null,clicked=false;
 const cancel=()=>{clearTimeout(timer);timer=null;};
 const open=()=>{cancel();panel.hidden=false;trigger.setAttribute("aria-expanded","true");};
 const close=(focus=false)=>{cancel();panel.hidden=true;clicked=false;trigger.setAttribute("aria-expanded","false");if(focus)trigger.focus({preventScroll:true});};
 root.addEventListener("pointerenter",event=>{if(event.pointerType==="mouse"||event.pointerType==="pen")open();});
 root.addEventListener("pointerleave",event=>{if(event.pointerType==="mouse"||event.pointerType==="pen"){cancel();timer=setTimeout(()=>close(),150);}});
 trigger.addEventListener("click",()=>{if(!panel.hidden&&clicked)close();else{clicked=true;open();}});
 trigger.addEventListener("keydown",event=>{if(event.key==="ArrowDown"){event.preventDefault();open();panel.querySelector("button")?.focus();}});
 panel.addEventListener("click",event=>{if(event.target.closest("button"))close(true);});
 root.addEventListener("focusout",event=>{if(event.relatedTarget&&!root.contains(event.relatedTarget))close();});
 document.addEventListener("pointerdown",event=>{if(!root.contains(event.target))close();});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!panel.hidden){event.preventDefault();close(true);}});
}
})();
