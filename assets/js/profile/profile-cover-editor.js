(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
function mount({q,t,status,fileCover,photoURLs,fileTypes,uploadImage,encodeProfileCrop,clamp,canvasPoint,isAvatarBusy}){
 const coverDialog=q("#profile-cover-edit-dialog"),coverCanvas=q("#profile-cover-crop-canvas"),coverZoom=q("#profile-cover-crop-zoom");
 const coverCropPanel=q("#profile-cover-crop-panel"),coverPreviewPanel=q("#profile-cover-preview-panel"),coverPreviewCanvas=q("#profile-cover-preview-image");
 const coverStep=q("#profile-cover-edit-step"),coverSave=q("#profile-cover-edit-save"),coverClose=q("#profile-cover-edit-close");
 const coverDesktop=q("#profile-cover-preview-desktop"),coverMobile=q("#profile-cover-preview-mobile"),coverCard=q("#profile-cover-preview-card");
 const desktopRatio=2000/580,mobileRatio=390/185;
 let coverSource=null,coverSourceFile=null,coverSourceURL=null,coverSelection=null,coverDrag=null,coverLoading=false,coverSaving=false,coverPreviewing=false,coverSourceMime="image/webp";
 const coverNote=text=>{if(text)status(text,true);};
 const coverRelease=()=>{if(coverSourceURL)URL.revokeObjectURL(coverSourceURL);coverSourceURL=null;coverSource=coverSourceFile=coverSelection=coverDrag=null;fileCover.value="";coverCanvas.width=coverCanvas.height=1;coverPreviewCanvas.width=coverPreviewCanvas.height=1;};
 const cropLimit=()=>Math.min(coverCanvas.width,coverCanvas.height*desktopRatio);
 const constrainCover=()=>{if(!coverSelection)return;const max=cropLimit();coverSelection.width=clamp(coverSelection.width,max/5,max);const height=coverSelection.width/desktopRatio;coverSelection.x=clamp(coverSelection.x,0,coverCanvas.width-coverSelection.width);coverSelection.y=clamp(coverSelection.y,0,coverCanvas.height-height);coverZoom.value=String(max/coverSelection.width);};
 const drawCover=()=>{
  if(!coverSource||!coverSelection)return;
  constrainCover();
  const ctx=coverCanvas.getContext("2d"),{x,y,width:w}=coverSelection;
  const h=w/desktopRatio,mobileW=h*mobileRatio,mobileX=x+(w-mobileW)/2;
  ctx.clearRect(0,0,coverCanvas.width,coverCanvas.height);
  ctx.drawImage(coverSource,0,0,coverCanvas.width,coverCanvas.height);
  ctx.save();
  ctx.fillStyle="rgba(15,23,42,.68)";
  ctx.beginPath();ctx.rect(0,0,coverCanvas.width,coverCanvas.height);ctx.rect(x,y,w,h);ctx.fill("evenodd");

  ctx.fillStyle="rgba(15,23,42,.25)";
  ctx.fillRect(x,y,mobileX-x,h);
  ctx.fillRect(mobileX+mobileW,y,x+w-mobileX-mobileW,h);
  const scale=coverCanvas.width/Math.max(1,coverCanvas.getBoundingClientRect().width);
  ctx.lineWidth=Math.max(1,scale);ctx.strokeStyle="#fff";ctx.strokeRect(x,y,w,h);
  ctx.strokeStyle="#b9d6ff";ctx.strokeRect(mobileX,y,mobileW,h);
  const handle=Math.max(3,4*scale);ctx.fillStyle="#fff";
  for(const [cx,cy] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]])ctx.fillRect(cx-handle/2,cy-handle/2,handle,handle);
  ctx.restore();
 };
 const readCoverRect=()=>{
  constrainCover();const {x,y,width:w}=coverSelection,h=w/desktopRatio;
  return{x:x*coverSource.naturalWidth/coverCanvas.width,
   y:y*coverSource.naturalHeight/coverCanvas.height,
   w:w*coverSource.naturalWidth/coverCanvas.width,
   h:h*coverSource.naturalHeight/coverCanvas.height};
 };
 const paintCoverPreview=()=>{
  if(!coverSource||!coverSelection)return;
  const mobile=coverCard.dataset.device==="mobile",selected=readCoverRect();
  const visibleWidth=selected.h*mobileRatio;
  const rect=mobile?
   {x:selected.x+(selected.w-visibleWidth)/2,y:selected.y,w:visibleWidth,h:selected.h}:selected;
  coverPreviewCanvas.width=mobile?390:1000;
  coverPreviewCanvas.height=mobile?185:290;
  coverPreviewCanvas.getContext("2d").drawImage(coverSource,rect.x,rect.y,rect.w,rect.h,0,0,coverPreviewCanvas.width,coverPreviewCanvas.height);
  const previewAvatar=q("#profile-cover-preview-avatar");
  previewAvatar.style.backgroundImage=photoURLs.avatar?"url("+JSON.stringify(photoURLs.avatar)+")":"";
  const heading=q("#profile-heading");
  q("#profile-cover-preview-name").textContent=heading.querySelector(".vatra-verified-name-text")?.textContent||heading.textContent.trim();
 };
 const selectCoverDevice=mobile=>{coverCard.dataset.device=mobile?"mobile":"desktop";coverDesktop.setAttribute("aria-pressed",String(!mobile));coverMobile.setAttribute("aria-pressed",String(mobile));paintCoverPreview();};
 const showCoverStep=show=>{
  coverPreviewing=show;coverCropPanel.hidden=show;coverPreviewPanel.hidden=!show;
  q("#profile-cover-edit-title").textContent=show?t("Попередній перегляд","Preview"):t("Редагування обкладинки","Edit cover");
  coverStep.textContent=show?t("Повернутися до редагування","Back to editing"):t("Попередній перегляд","Preview");
  if(show)selectCoverDevice(false);else drawCover();
 };
 const startCoverCrop=async file=>{
  if(isAvatarBusy()||coverLoading||coverSaving||coverDialog.open)return;
  if(!fileTypes[file?.type]||!file?.size||file.size>31457280){status(t("Оберіть JPEG, PNG або WebP до 30 МБ.","Choose a JPEG, PNG or WebP under 30 MB."),true);fileCover.value="";return;}
  coverRelease();coverSourceFile=file;coverSourceMime=file.type;coverLoading=true;const img=new Image(),url=URL.createObjectURL(file);coverSourceURL=url;
  try{img.src=url;await img.decode();if(coverSourceURL!==url)return;coverSource=img;const scale=Math.min(1,900/Math.max(img.naturalWidth,img.naturalHeight));
   coverCanvas.width=Math.max(1,Math.round(img.naturalWidth*scale));coverCanvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const w=cropLimit();coverSelection={width:w,x:(coverCanvas.width-w)/2,y:(coverCanvas.height-w/desktopRatio)/2};coverZoom.value="1";coverNote("");showCoverStep(false);coverDialog.showModal();drawCover();
  }catch(_){coverRelease();status(t("Не вдалося відкрити обкладинку.","Could not open cover image."),true);}finally{coverLoading=false;}
 };
 coverStep.addEventListener("click",()=>{if(!coverSaving)showCoverStep(!coverPreviewing);});
 coverDesktop.addEventListener("click",()=>selectCoverDevice(false));coverMobile.addEventListener("click",()=>selectCoverDevice(true));
 coverClose.addEventListener("click",()=>{if(!coverSaving)coverDialog.close();});
 coverDialog.addEventListener("cancel",e=>{if(coverSaving)e.preventDefault();});
 coverDialog.addEventListener("close",()=>{if(!coverDialog.open&&!coverSaving)coverRelease();});
 coverZoom.addEventListener("input",()=>{if(!coverSelection)return;const w=cropLimit()/Number(coverZoom.value),old=coverSelection.width;coverSelection={width:w,x:coverSelection.x+(old-w)/2,y:coverSelection.y+(old-w)/(2*desktopRatio)};drawCover();});
 coverCanvas.addEventListener("pointerdown",e=>{if(!coverSelection||!e.isPrimary||e.button!==0)return;e.preventDefault();const p=canvasPoint(coverCanvas,e),{x,y,width:w}=coverSelection,h=w/desktopRatio,hit=15*coverCanvas.width/Math.max(1,coverCanvas.getBoundingClientRect().width);
  const corner=[[x,y,-1,-1],[x+w,y,1,-1],[x,y+h,-1,1],[x+w,y+h,1,1]].find(([cx,cy])=>Math.hypot(p.x-cx,p.y-cy)<=hit);
  coverDrag={id:e.pointerId,p,start:{...coverSelection},corner};coverCanvas.setPointerCapture(e.pointerId);
 });
 coverCanvas.addEventListener("pointermove",e=>{if(!coverDrag||coverDrag.id!==e.pointerId)return;const p=canvasPoint(coverCanvas,e),dx=p.x-coverDrag.p.x,dy=p.y-coverDrag.p.y,{x,y,width:w}=coverDrag.start;
  if(coverDrag.corner){const [,,sx,sy]=coverDrag.corner,ax=sx<0?x+w:x,ay=sy<0?y+w/desktopRatio:y,available=Math.min(sx<0?ax:coverCanvas.width-ax,(sy<0?ay:coverCanvas.height-ay)*desktopRatio),next=clamp(w+(dx*sx+dy*sy/desktopRatio)/(1+1/(desktopRatio*desktopRatio)),Math.min(cropLimit()/5,available),available);coverSelection={width:next,x:sx<0?ax-next:ax,y:sy<0?ay-next/desktopRatio:ay};}
  else coverSelection={width:w,x:x+dx,y:y+dy};drawCover();
 });
 for(const event of ["pointerup","pointercancel","lostpointercapture"])coverCanvas.addEventListener(event,()=>{coverDrag=null;});
 coverCanvas.addEventListener("keydown",e=>{if(!coverSelection)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;e.preventDefault();coverSelection.x+=delta[0]*(e.shiftKey?20:5);coverSelection.y+=delta[1]*(e.shiftKey?20:5);drawCover();});
 coverSave.addEventListener("click",async()=>{
  if(!coverSource||!coverSelection||coverSaving||isAvatarBusy())return;coverSaving=true;coverSave.disabled=coverStep.disabled=coverClose.disabled=true;coverNote("");
  try{const rect=readCoverRect();
   const file=await encodeProfileCrop(coverSource,rect,2000,580,"profile-cover",coverSourceMime);
   if(!await uploadImage(file,"cover",coverSourceFile))return;
   coverDialog.close();coverRelease();status(t("Обкладинку профілю змінено.","Profile cover updated."));
  }catch(_){coverNote(t("Не вдалося зберегти обкладинку. Спробуйте ще раз.","Could not save cover. Try again."));}
  finally{coverSaving=false;coverSave.disabled=coverStep.disabled=coverClose.disabled=false;}
 });
 return Object.freeze({start:startCoverCrop,busy:()=>coverLoading||coverSaving||coverDialog.open});

}
window.VATRA_PROFILE_COVER_EDITOR=Object.freeze({mount});
})();
