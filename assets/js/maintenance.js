(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const root=new URL("../../",document.currentScript.src);
 if(new URLSearchParams(location.search).get("preview")==="1")return;
 let busy=false;
 async function check(){
  if(busy)return;
  busy=true;
  try{
   if(await window.VATRA_MAINTENANCE_STATUS?.()===false)location.replace(root.href);
  }catch(_){}finally{busy=false;}
 }
 void check();
 setInterval(()=>{if(document.visibilityState==="visible")void check();},30000);
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void check();});
 window.addEventListener("online",()=>void check());
})();
