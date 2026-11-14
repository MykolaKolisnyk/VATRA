/* VATRA network status: non-destructive banner plus pre-cached offline page. */
(() => {
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const scriptUrl=new URL(document.currentScript?.src||"assets/js/network.js",document.baseURI);
 const projectBase=new URL("../../",scriptUrl);
 document.addEventListener("DOMContentLoaded",()=>{
  const english=document.documentElement.lang==="en";
  const label=english?"No internet connection. Check your connection.":"Немає підключення до інтернету. Перевірте мережу.";
  const banner=document.createElement("div");
  banner.className="network-status vt-network-status";
  banner.setAttribute("role","status");
  banner.setAttribute("aria-live","polite");
  banner.hidden=true;
  banner.textContent=label;
  document.body.append(banner);
  const update=()=>{
   banner.hidden=navigator.onLine;
   document.body.classList.toggle("is-offline",!navigator.onLine);
  };
  window.addEventListener("offline",update);
  window.addEventListener("online",update);
  update();
  if("serviceWorker" in navigator&&window.isSecureContext&&location.protocol!=="file:"){
   const worker=navigator.serviceWorker;
   // Refresh a previously controlled page when updated code takes over.
   // Never discard input edits or an open dialog during this transition.
   if(worker.controller){
    let edited=false;
    const recordEdit=event=>{
     if(event.target?.closest?.("input,textarea,[contenteditable]"))edited=true;
    };
    document.addEventListener("input",recordEdit,true);
    document.addEventListener("change",recordEdit,true);
    worker.addEventListener("controllerchange",()=>{
     if(!navigator.onLine||edited||document.querySelector("dialog[open]"))return;
     location.reload();
    },{once:true});
   }
   worker.register(new URL("sw.js",projectBase).href,{
    scope:projectBase.pathname,updateViaCache:"none"
   }).catch(()=>{});
  }
 });
})();