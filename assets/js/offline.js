/* VATRA — offline retry behavior; script is cached by the service worker. */
(()=>{
 "use strict";
 document.querySelector("#retry").addEventListener("click",()=>location.reload());
 window.addEventListener("online",()=>location.reload());
 
})();
