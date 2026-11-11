/* VATRA shared post attachments. All object paths remain in separate private buckets. */
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const tr=(uk,en)=>document.documentElement.lang==="en"?en:uk;
 const formats={
  "image/jpeg":{kind:"image",ext:"jpg",bucket:"vatra-post-images",limit:6291456},
  "image/png":{kind:"image",ext:"png",bucket:"vatra-post-images",limit:6291456},
  "image/webp":{kind:"image",ext:"webp",bucket:"vatra-post-images",limit:6291456},
  "video/mp4":{kind:"video",ext:"mp4",bucket:"vatra-videos",limit:52428800},
  "video/webm":{kind:"video",ext:"webm",bucket:"vatra-videos",limit:52428800}
 };
 const validId=id=>/^[1-9][0-9]{0,18}$/.test(String(id||""));
 const formatFor=file=>{
  const info=formats[file?.type];
  if(!info||!file?.size)throw Error(tr("Виберіть JPEG, PNG, WebP, MP4 або WebM.","Choose JPEG, PNG, WebP, MP4 or WebM."));
  if(file.size>info.limit)throw Error(info.kind==="image"?
   tr("Фото має бути до 6 МБ.","Photo must be under 6 MB."):
   tr("Відео має бути до 50 МБ.","Video must be under 50 MB."));
  return info;
 };
 const name=(path,kind,id)=>{
  const ext=kind==="image"?"(?:jpg|png|webp)":"(?:mp4|webm)";
  return validId(id)&&typeof path==="string"&&
   new RegExp("^"+id+"/posts/[a-f0-9-]{36}\\."+ext+"$").test(path);
 };
 const bucketFor=kind=>kind==="image"?"vatra-post-images":"vatra-videos";

 /* Render hashtag anchors as DOM nodes; never parse user-submitted HTML. */
 function linkifyHashtags(paragraph){
  if(!paragraph||typeof paragraph.textContent!=="string")return;
  const original=paragraph.textContent;
  if(!original.includes("#"))return;
  const expression=/(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]{1,64})/gu;
  const result=document.createDocumentFragment();
  const siteRoot=location.pathname.startsWith("/VATRA/")?"/VATRA/":"/";
  let offset=0,found=false,match;
  while((match=expression.exec(original))!==null){
   const start=match.index+match[1].length;
   result.append(document.createTextNode(original.slice(offset,start)));
   const tag="#"+match[2];
   const link=document.createElement("a");
   link.className="vt-feed-post-hashtag-001";
   link.href=siteRoot+"feed?q="+encodeURIComponent(tag);
   link.textContent=tag;
   link.setAttribute("aria-label",tr("Пошук дописів за хештегом ","Search posts with hashtag ")+tag);
   result.append(link);
   offset=start+tag.length;
   found=true;
  }
  if(found){
   result.append(document.createTextNode(original.slice(offset)));
   paragraph.replaceChildren(result);
  }
 }

 function bindPicker(ids){
  const input=document.querySelector(ids.input),choose=document.querySelector(ids.choose);
  const clear=document.querySelector(ids.clear),preview=document.querySelector(ids.preview);
  const showError=typeof ids.onError==="function"?ids.onError:()=>{};
  const changed=typeof ids.onChange==="function"?ids.onChange:()=>{};
  if(!input||!choose||!clear||!preview)throw Error("VATRA media picker markup is incomplete");
  let selected=null,blob=null;
  const reset=()=>{
   selected=null;input.value="";
   if(blob){URL.revokeObjectURL(blob);blob=null;}
   preview.replaceChildren();preview.hidden=true;clear.hidden=true;changed();
  };
  const render=file=>{
   reset();if(!file)return;
   try{formatFor(file);}catch(error){showError(error.message);return;}
   selected=file;blob=URL.createObjectURL(file);
   const info=formats[file.type];
   const media=document.createElement(info.kind==="image"?"img":"video");
   media.className=info.kind==="image"?"vatra-compose-preview-image":"vatra-compose-preview-video";
   media.src=blob;
   if(info.kind==="video"){media.controls=true;media.preload="metadata";}
   else media.alt=tr("Попередній перегляд фото","Photo preview");
   const caption=document.createElement("span");caption.className="vatra-compose-preview-caption";
   caption.textContent=file.name;
   preview.append(media,caption);preview.hidden=false;clear.hidden=false;changed();
  };
  choose.addEventListener("click",()=>input.click());
  input.addEventListener("change",()=>render(input.files?.[0]));
  clear.addEventListener("click",reset);
  return {getFile:()=>selected,reset};
 }
 async function upload(client,id,file){
  const format=formatFor(file);
  if(!validId(id))throw Error(tr("VATRA ID недоступний.","VATRA ID unavailable."));
  const path=id+"/posts/"+crypto.randomUUID()+"."+format.ext;
  const {error}=await client.storage.from(format.bucket).upload(path,file,{
   contentType:file.type,cacheControl:"3600",upsert:false
  });
  if(error)throw Error(tr("Не вдалося завантажити файл. Спробуйте знову.","Could not upload media. Try again."));
  return {media_kind:format.kind,media_path:path};
 }
 async function remove(client,attachment){
  if(!attachment?.media_kind||!attachment?.media_path)return;
  const bucket=bucketFor(attachment.media_kind);
  return client.storage.from(bucket).remove([attachment.media_path]);
 }

 /* One accessible fullscreen dialog is reused by every post and upload. */
 let mediaDialog=null,mediaDialogContent=null;
 function openFullMedia(url,kind){
  if(!mediaDialog){
   mediaDialog=document.createElement("dialog");
   mediaDialog.id="vatra-post-media-viewer";
   mediaDialog.className="vatra-post-media-viewer ui-vatra-post-media-viewer-001";
   mediaDialog.setAttribute("aria-label",tr("Перегляд медіа","Media viewer"));
   const frame=document.createElement("div");
   frame.className="vatra-post-media-viewer-frame ui-vatra-post-media-viewer-frame-001";
   const close=document.createElement("button");
   close.className="vt-vatra-post-media-close-001";close.type="button";
   close.textContent="×";close.setAttribute("aria-label",tr("Закрити","Close"));
   close.addEventListener("click",()=>mediaDialog.close());
   mediaDialogContent=document.createElement("div");
   mediaDialogContent.className="ui-vatra-post-media-viewer-content-001";
   frame.append(close,mediaDialogContent);mediaDialog.append(frame);
   mediaDialog.addEventListener("click",event=>{if(event.target===mediaDialog)mediaDialog.close();});
   mediaDialog.addEventListener("close",()=>{
    const video=mediaDialogContent.querySelector("video");
    if(video){video.pause();video.removeAttribute("src");video.load();}
    mediaDialogContent.replaceChildren();
   });
   document.body.append(mediaDialog);
  }
  const element=document.createElement(kind==="video"?"video":"img");
  element.className=kind==="video"?"ui-vatra-post-expanded-video-001":"ui-vatra-post-expanded-image-001";
  if(kind==="video"){element.controls=true;element.autoplay=true;element.playsInline=true;}
  else element.alt=tr("Фото публікації","Post photo");
  element.src=url;mediaDialogContent.replaceChildren(element);
  mediaDialog.showModal();
 }
 async function mount(client,post,container){
  const kind=post?.media_kind,path=post?.media_path,id=post?.author_vatra_id;
  if(!["image","video"].includes(kind)||!name(path,kind,id)||!container)return;
  const slot=document.createElement("div");slot.className="feed-post-media ui-feed-post-media-001";
  container.append(slot);
  try{
   const {data,error}=await client.storage.from(bucketFor(kind)).createSignedUrl(path,3600);
   if(error||!data?.signedUrl)throw Error("Storage signing failed");
   const url=new URL(data.signedUrl);
   if(url.protocol!=="https:"||url.hostname!=="rjasunoawrxvetwadylh.supabase.co")
    throw Error("Unexpected signed asset URL");
   if(!slot.isConnected)return;
   const el=document.createElement(kind==="image"?"img":"video");
   el.className=kind==="image"?"feed-post-media-image ui-feed-post-media-image-001":
    "feed-post-media-video ui-feed-post-media-video-001";
   if(kind==="image"){
    el.alt=tr("Фото до публікації","Post photo");
    el.loading="lazy";el.decoding="async";
    const open=document.createElement("button");
    open.className="vt-feed-post-media-open-001";open.type="button";
    open.setAttribute("aria-label",tr("Відкрити фото на весь екран","View photo fullscreen"));
    open.addEventListener("click",()=>openFullMedia(url.href,"image"));
    open.append(el);el.src=url.href;slot.replaceChildren(open);
   }else{
    el.controls=true;el.preload="metadata";el.playsInline=true;el.src=url.href;
    const expand=document.createElement("button");expand.type="button";
    expand.className="vt-feed-post-video-expand-001";
    expand.textContent=tr("На весь екран","Fullscreen");
    expand.addEventListener("click",()=>openFullMedia(url.href,"video"));
    slot.replaceChildren(el,expand);
   }
  }catch(_){
   if(slot.isConnected){
    const notice=document.createElement("p");notice.className="vt-feed-post-media-error-001";
    notice.textContent=tr("Медіафайл тимчасово недоступний.","Media temporarily unavailable.");
    slot.replaceChildren(notice);
   }
  }
 }
 window.VATRA_POST_MEDIA={bindPicker,upload,remove,mount,linkifyHashtags};
})();
