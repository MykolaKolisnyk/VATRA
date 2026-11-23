(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
function mount({q,t,coverPhoto,getCoverUrl,getSavedCoverPath,getPublicPath,allowed,closeAvatarMenu}){
 const coverViewerDialog=q("#profile-cover-viewer"),coverStage=q("#profile-cover-viewer-stage");
 const coverImage=q("#profile-cover-viewer-image"),coverOriginal=q("#profile-cover-viewer-original");
 let coverEpoch=0,coverFlight=null,coverAnimation=null;
 const clearCoverFlight=()=>{
  coverFlight?.remove();coverFlight=null;
  coverAnimation?.cancel();coverAnimation=null;
 };
 const openCover=()=>{
  if(!allowed())return;
  const url=getCoverUrl();
  if(!allowed()||!url||!coverPhoto.complete||!coverPhoto.naturalWidth||coverViewerDialog.open)return;
  closeAvatarMenu();
  const ticket=++coverEpoch,source=coverPhoto.currentSrc||url;
  const origin=coverPhoto.getBoundingClientRect();
  clearCoverFlight();coverViewerDialog.classList.remove("is-ready");
  coverOriginal.hidden=true;coverOriginal.removeAttribute("href");
  coverImage.alt=t("Обкладинка профілю","Profile cover photo");
  let decoded=false,arrived=false,finished=false,decoding=false;
  const finish=()=>{
   if(finished||ticket!==coverEpoch||!coverViewerDialog.open||!decoded||!arrived)return;
   finished=true;


   coverViewerDialog.classList.add("is-ready");
   clearCoverFlight();
  };
  const markDecoded=()=>{
   if(ticket!==coverEpoch||!coverViewerDialog.open)return;
   decoded=true;finish();
  };
  const prepareImage=()=>{
   if(decoding||ticket!==coverEpoch||!coverImage.naturalWidth)return;
   decoding=true;
   if(typeof coverImage.decode==="function"){
    void coverImage.decode().then(markDecoded).catch(()=>{
     if(ticket===coverEpoch&&coverImage.complete&&coverImage.naturalWidth)markDecoded();
    });
   }else markDecoded();
  };
  coverImage.onload=prepareImage;
  coverImage.onerror=()=>{if(ticket===coverEpoch&&coverViewerDialog.open)coverViewerDialog.close();};
  coverImage.src=source;
  coverViewerDialog.showModal();
  const destination=coverStage.getBoundingClientRect();
  const flight=coverPhoto.cloneNode(false);
  flight.removeAttribute("id");flight.removeAttribute("hidden");
  flight.className="ui-profile-cover-flight-001";
  flight.alt="";flight.setAttribute("aria-hidden","true");
  flight.style.left=origin.left+"px";flight.style.top=origin.top+"px";
  flight.style.width=origin.width+"px";flight.style.height=origin.height+"px";
  coverViewerDialog.append(flight);coverFlight=flight;
  const arrivedAtCenter=()=>{if(ticket!==coverEpoch||!coverViewerDialog.open)return;arrived=true;finish();};
  if(matchMedia("(prefers-reduced-motion: reduce)").matches||typeof flight.animate!=="function"){
   flight.style.left=destination.left+"px";flight.style.top=destination.top+"px";
   flight.style.width=destination.width+"px";flight.style.height=destination.height+"px";
   arrivedAtCenter();
  }else{
   coverAnimation=flight.animate([
    {transform:"translate(0px,0px) scale(1,1)",borderRadius:"0px"},
    {transform:"translate("+(destination.left-origin.left)+"px,"+
     (destination.top-origin.top)+"px) scale("+
     (destination.width/Math.max(1,origin.width))+","+
     (destination.height/Math.max(1,origin.height))+")",
     borderRadius:"12px"}
   ],{duration:460,easing:"cubic-bezier(.22,1,.36,1)",fill:"forwards"});
   void coverAnimation.finished.then(arrivedAtCenter).catch(()=>{});
  }
  if(coverImage.complete&&coverImage.naturalWidth)queueMicrotask(prepareImage);


  const originalPath=getSavedCoverPath()?.replace(/\.(jpe?g|png|webp)$/i,"-original.$1");
  const originalUrl=originalPath?getPublicPath(originalPath,"cover"):null;
  if(originalUrl&&originalUrl!==source){
   const probe=new Image();
   probe.onload=()=>{if(ticket!==coverEpoch||!coverViewerDialog.open)return;
    coverOriginal.href=originalUrl;coverOriginal.hidden=false;};
   probe.src=originalUrl;
  }
 };
 coverViewerDialog.querySelector("#profile-cover-viewer-close").addEventListener("click",()=>coverViewerDialog.close());
 coverViewerDialog.addEventListener("click",event=>{if(event.target===coverViewerDialog)coverViewerDialog.close();});
 coverViewerDialog.addEventListener("close",()=>{
  coverEpoch++;clearCoverFlight();coverViewerDialog.classList.remove("is-ready");
  coverImage.onload=coverImage.onerror=null;coverImage.removeAttribute("src");
  coverOriginal.hidden=true;coverOriginal.removeAttribute("href");
 });
 return Object.freeze({open:openCover});
}
window.VATRA_PROFILE_COVER_VIEWER=Object.freeze({mount});
})();
