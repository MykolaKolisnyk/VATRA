(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
function mount({client,ownId,userId,q,t,status,fileAvatar,fileTypes,uploadImage,
 encodeProfileCrop,clamp,canvasPoint,parentBusy}){
 const crop=q("#profile-avatar-crop-dialog"),finish=q("#profile-avatar-finish-dialog");
 const canvas=q("#profile-avatar-crop-canvas"),zoom=q("#profile-avatar-crop-zoom");
 const preview=q("#profile-avatar-finish-preview"),save=q("#profile-avatar-finish-save");
 let source=null,sourceFile=null,sourceURL=null,previewURL=null,cropped=null;
 let selection=null,drag=null,transitioning=false,finishing=false,cropLoading=false,sourceMime="image/webp";
 const release=()=>{if(sourceURL)URL.revokeObjectURL(sourceURL);if(previewURL)URL.revokeObjectURL(previewURL);sourceURL=previewURL=null;source=sourceFile=cropped=selection=drag=null;fileAvatar.value="";preview.removeAttribute("src");};
 const constrain=()=>{const max=Math.min(canvas.width,canvas.height);selection.size=clamp(selection.size,max/5,max);selection.x=clamp(selection.x,0,canvas.width-selection.size);selection.y=clamp(selection.y,0,canvas.height-selection.size);zoom.value=String(max/selection.size);};
 const draw=()=>{if(!source||!selection)return;constrain();const ctx=canvas.getContext("2d"),{x,y,size}=selection;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);ctx.save();ctx.fillStyle="rgba(15,23,42,.58)";ctx.beginPath();ctx.rect(0,0,canvas.width,canvas.height);ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2,true);ctx.fill("evenodd");ctx.restore();ctx.fillStyle="#fff";
  for(const [cx,cy] of [[x,y],[x+size,y],[x,y+size],[x+size,y+size]])ctx.fillRect(cx-4,cy-4,8,8);
 };
 const closeStep=(from,to)=>{transitioning=true;from.close();to.showModal();transitioning=false;};
 const startCrop=async file=>{if(parentBusy()||finishing||cropLoading||crop.open||finish.open)return;
  if(!fileTypes[file?.type]||!file?.size||file.size>31457280){status(t("Оберіть JPEG, PNG або WebP до 30 МБ.","Choose a JPEG, PNG or WebP under 30 MB."),true);fileAvatar.value="";return;}
  cropLoading=true;release();sourceFile=file;sourceMime=file.type;const img=new Image();const url=URL.createObjectURL(file);sourceURL=url;
  try{img.src=url;await img.decode();if(sourceURL!==url)return;source=img;const ratio=Math.min(1,720/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));const size=Math.min(canvas.width,canvas.height);selection={x:(canvas.width-size)/2,y:(canvas.height-size)/2,size};zoom.value="1";q("#profile-avatar-publish-post").checked=false;q("#profile-avatar-publish-story").checked=false;draw();crop.showModal();}catch(_){release();status(t("Не вдалося відкрити фото.","Could not open photo."),true);}
  finally{cropLoading=false;}
 };
 const point=e=>canvasPoint(canvas,e);
 canvas.addEventListener("pointerdown",e=>{if(!selection)return;e.preventDefault();const p=point(e),{x,y,size}=selection,r=canvas.getBoundingClientRect(),hit=14*canvas.width/r.width;const corners=[[x,y,-1,-1],[x+size,y,1,-1],[x,y+size,-1,1],[x+size,y+size,1,1]];const corner=corners.find(([cx,cy])=>Math.hypot(p.x-cx,p.y-cy)<=hit);if(!corner&&(p.x<x||p.x>x+size||p.y<y||p.y>y+size))return;drag={id:e.pointerId,p,start:{...selection},corner};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener("pointermove",e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e),dx=p.x-drag.p.x,dy=p.y-drag.p.y,{x,y,size}=drag.start; if(drag.corner){const [,,sx,sy]=drag.corner,ax=sx<0?x+size:x,ay=sy<0?y+size:y;const available=Math.min(sx<0?ax:canvas.width-ax,sy<0?ay:canvas.height-ay);const next=clamp(size+(dx*sx+dy*sy)/2,Math.min(canvas.width,canvas.height)/5,available);selection={x:sx<0?ax-next:ax,y:sy<0?ay-next:ay,size:next};}else selection={x:x+dx,y:y+dy,size};draw();});
 for(const event of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(event,()=>{drag=null;});
 canvas.addEventListener("keydown",e=>{if(!selection)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(e.key==="+"||e.key==="="||e.key==="-"){e.preventDefault();const old=selection.size,size=clamp(old*(e.key==="-"?1.1:.9),Math.min(canvas.width,canvas.height)/5,Math.min(canvas.width,canvas.height));selection={x:selection.x+(old-size)/2,y:selection.y+(old-size)/2,size};draw();return;}if(!delta)return;e.preventDefault();selection.x+=delta[0]*(e.shiftKey?20:5);selection.y+=delta[1]*(e.shiftKey?20:5);draw();});
 zoom.addEventListener("input",()=>{if(!selection)return;const size=Math.min(canvas.width,canvas.height)/Number(zoom.value),centerX=selection.x+selection.size/2,centerY=selection.y+selection.size/2;selection={x:centerX-size/2,y:centerY-size/2,size};draw();});
 q("#profile-avatar-crop-next").addEventListener("click",async()=>{if(!source||!selection)return;const next=q("#profile-avatar-crop-next");next.disabled=true;
  try{const width=Math.min(1024,Math.max(1,Math.round(selection.size*source.naturalWidth/canvas.width))),rect={x:selection.x*source.naturalWidth/canvas.width,y:selection.y*source.naturalHeight/canvas.height,w:selection.size*source.naturalWidth/canvas.width,h:selection.size*source.naturalHeight/canvas.height};const file=await encodeProfileCrop(source,rect,width,width,"profile-photo",sourceMime);if(!crop.open)return;cropped=file;if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(cropped);preview.src=previewURL;closeStep(crop,finish);}catch(_){status(t("Не вдалося створити мініатюру.","Could not create thumbnail."),true);}finally{next.disabled=false;}
 });
 q("#profile-avatar-crop-cancel").addEventListener("click",()=>crop.close());q("#profile-avatar-finish-back").addEventListener("click",()=>{if(!finishing)closeStep(finish,crop);});
 for(const d of [crop,finish]){d.addEventListener("close",()=>{if(!transitioning&&!crop.open&&!finish.open&&!finishing&&!cropLoading)release();});d.addEventListener("cancel",e=>{if(finishing)e.preventDefault();});}
 save.addEventListener("click",async()=>{if(!cropped||finishing)return;finishing=true;save.disabled=true;q("#profile-avatar-finish-back").disabled=true;const photo=cropped,wantPost=q("#profile-avatar-publish-post").checked,wantStory=q("#profile-avatar-publish-story").checked;try{
  if(!await uploadImage(photo,"avatar",sourceFile))return;
  const failures=[];if(wantPost){let uploaded=null;try{uploaded=await window.VATRA_POST_MEDIA.uploadGallery(client,ownId,[photo]);const r=await client.from("feed_posts").insert({author_id:userId,author_vatra_id:ownId,body:"",visibility:"friends",media_items:uploaded});if(r.error)throw r.error;}catch(_){if(uploaded)try{await window.VATRA_POST_MEDIA.removeGallery(client,uploaded);}catch(_){}failures.push(t("допис","post"));}}
  if(wantStory){let uploaded=null;try{uploaded=await window.VATRA_POST_MEDIA.uploadStory(client,ownId,photo);const r=await client.from("stories").insert({author_vatra_id:ownId,body:"",theme:0,...uploaded});if(r.error)throw r.error;}catch(_){if(uploaded)try{await window.VATRA_POST_MEDIA.remove(client,uploaded);}catch(_){}failures.push(t("історію","story"));}}
  finish.close();release();if(failures.length){status(t("Фото змінено, але не вдалося опублікувати: ","Photo updated, but could not publish: ")+failures.join(", "),true);}else if(wantPost||wantStory){
   try{sessionStorage.setItem("vatra-profile-photo-toast",JSON.stringify({account:ownId,text:t("Фото профілю змінено.","Profile photo updated.")}));}catch(_){}
   window.dispatchEvent(new Event("vatra:profile-media-changed"));
   status(t("Фото профілю змінено.","Profile photo updated."));
  }else status(t("Фото профілю змінено.","Profile photo updated."));
 }finally{finishing=false;save.disabled=false;q("#profile-avatar-finish-back").disabled=false;}});
 return Object.freeze({start:startCrop,busy:()=>finishing||cropLoading||crop.open||finish.open});
}
window.VATRA_PROFILE_AVATAR_EDITOR=Object.freeze({mount});
})();
