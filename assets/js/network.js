/* VATRA network status: non-destructive banner plus pre-cached offline page. */
(() => {
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
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
  if("serviceWorker" in navigator&&location.protocol==="https:"){
   navigator.serviceWorker.register("/VATRA/sw.js",{scope:"/VATRA/"}).catch(()=>{});
  }
 });
})();