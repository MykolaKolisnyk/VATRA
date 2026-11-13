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
 const storyPathValid=(path,kind,id)=>{
  if(!validId(id)||typeof path!=="string"||!["image","video"].includes(kind))return false;
  const extension=kind==="image"?"(?:jpg|png|webp)":"(?:mp4|webm)";
  return new RegExp("^"+id+"/stories/[0-9a-f-]{36}\\."+extension+"$").test(path);
 };

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
 async function uploadStory(client,id,file){
  const format=formatFor(file);
  if(!validId(id))throw Error(tr("VATRA ID недоступний.","VATRA ID unavailable."));
  const path=id+"/stories/"+crypto.randomUUID()+"."+format.ext;
  const {error}=await client.storage.from(format.bucket).upload(path,file,{
   contentType:file.type,cacheControl:"300",upsert:false
  });
  if(error)throw Error(tr("Не вдалося завантажити медіа історії.","Could not upload story media."));
  return {media_kind:format.kind,media_path:path};
 }
 async function remove(client,attachment){
  if(!attachment?.media_kind||!attachment?.media_path)return;
  const bucket=bucketFor(attachment.media_kind);
  return client.storage.from(bucket).remove([attachment.media_path]);
 }

 const signedURLs=new Map();
 let firstImages=0;
 async function signed(client,kind,path,ttl=3600){
  const key=ttl+":"+kind+":"+path,entry=signedURLs.get(key);
  if(entry&&entry.expiry>Date.now())return entry.promise;
  const promise=client.storage.from(bucketFor(kind)).createSignedUrl(path,ttl).then(({data,error})=>{
   if(error||!data?.signedUrl)throw error||new Error("Missing signed URL");
   const url=new URL(data.signedUrl);
   if(url.protocol!=="https:"||url.hostname!=="rjasunoawrxvetwadylh.supabase.co")
    throw Error("Unexpected signed asset URL");
   return url.href;
  }).catch(error=>{signedURLs.delete(key);throw error;});
  signedURLs.set(key,{expiry:Date.now()+Math.max(30,ttl-30)*1000,promise});
  return promise;
 }
 async function renderStory(client,story,slot,preview=false,allowExpired=false){
  if(!slot)return;
  const request=String(Number(slot.dataset.storyRequest||"0")+1);
  slot.dataset.storyRequest=request;
  slot.replaceChildren();slot.hidden=true;
  const {media_kind:kind,media_path:path,author_vatra_id:id}=story||{};
  if(!storyPathValid(path,kind,id))return;
  if(!allowExpired&&story.expires_at&&Date.parse(story.expires_at)<=Date.now())return;
  slot.hidden=false;
  if(!preview)slot.textContent=tr("Завантаження медіа…","Loading media…");
  try{
   // Story tokens are short-lived even if the user closes the viewer.
   const src=await signed(client,kind,path,300);
   if(!slot.isConnected||slot.dataset.storyRequest!==request)return;
   const element=document.createElement(kind==="image"?"img":"video");
   element.className=preview?"vt-story-media-preview-001":"vt-story-media-expanded-001";
   element.src=src;
   if(kind==="image"){
    element.alt=tr("Медіа історії","Story photo");
    element.decoding="async";
   }else{
    element.playsInline=true;element.preload="metadata";
    element.controls=!preview;
    element.muted=preview;
    if(preview)element.setAttribute("aria-hidden","true");
   }
   slot.replaceChildren(element);
  }catch(_){
   if(!slot.isConnected||slot.dataset.storyRequest!==request)return;
   if(preview){slot.hidden=true;slot.replaceChildren();}
   else slot.textContent=tr("Медіафайл історії недоступний.","Story media is unavailable.");
  }
 }
 function collapsibleBody(paragraph){
  if(!paragraph||paragraph.dataset.vatraCollapsed)return;
  const full=paragraph.textContent||"";
  if(Array.from(full).length<=440)return;
  const compact=Array.from(full).slice(0,350).join("").trimEnd()+"…";
  const button=document.createElement("button");
  button.type="button";button.className="vt-feed-post-read-more-001";
  button.setAttribute("aria-expanded","false");
  button.textContent=tr("Показати більше","Show more");
  paragraph.dataset.vatraCollapsed="true";
  let expanded=false;
  const update=()=>{
   paragraph.textContent=expanded?full:compact;
   linkifyHashtags(paragraph);
   button.textContent=expanded?tr("Показати менше","Show less"):tr("Показати більше","Show more");
   button.setAttribute("aria-expanded",String(expanded));
  };
  button.addEventListener("click",()=>{expanded=!expanded;update();});
  paragraph.insertAdjacentElement("afterend",button);
  update();
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
   close.setAttribute("aria-label",tr("Закрити","Close"));
   const closeIcon=document.createElementNS("http://www.w3.org/2000/svg","svg");
   closeIcon.setAttribute("class","ui-vatra-post-media-close-icon-001");
   closeIcon.setAttribute("viewBox","0 0 24 24");closeIcon.setAttribute("width","21");
   closeIcon.setAttribute("height","21");closeIcon.setAttribute("fill","none");
   closeIcon.setAttribute("stroke","currentColor");closeIcon.setAttribute("stroke-width","1.8");
   closeIcon.setAttribute("stroke-linecap","round");
   const cross=document.createElementNS("http://www.w3.org/2000/svg","path");
   cross.setAttribute("class","ui-vatra-post-media-close-path-001");
   cross.setAttribute("d","M6 6l12 12M18 6 6 18");
   closeIcon.append(cross);close.append(closeIcon);
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
  const slot=document.createElement("div");
  slot.className="feed-post-media ui-feed-post-media-001 is-loading-media";
  const placeholder=document.createElement("span");
  placeholder.className="vatra-post-media-placeholder ui-vatra-post-media-placeholder-001";
  placeholder.setAttribute("aria-hidden","true");
  slot.append(placeholder);container.append(slot);
  const priority=++firstImages;
  let begun=false;
  async function load(){
   if(begun)return;begun=true;
   try{
    const src=await signed(client,kind,path);
    if(!slot.isConnected)return;
    if(kind==="image"){
     // Decode outside the DOM: never show half-loaded pixels or a black slab.
     const image=new Image();
     image.className="feed-post-media-image ui-feed-post-media-image-001";
     image.alt=tr("Фото до публікації","Post photo");
     image.decoding="async";image.loading="eager";
     if(priority<=2)image.fetchPriority="high";
     image.src=src;
     if(typeof image.decode==="function"){
      try{await image.decode();}catch(_){
       if(!image.complete||!image.naturalWidth)throw Error("Image unavailable");
      }
     }else await new Promise((resolve,reject)=>{
      if(image.complete)return image.naturalWidth?resolve():reject(Error("Invalid image"));
      image.addEventListener("load",resolve,{once:true});
      image.addEventListener("error",()=>reject(Error("Image unavailable")),{once:true});
     });
     if(!slot.isConnected)return;
     const frame=document.createElement("button");
     frame.className="vt-feed-post-media-open-001";frame.type="button";
     frame.setAttribute("aria-label",tr("Відкрити фото на весь екран","View photo fullscreen"));
     frame.addEventListener("click",()=>openFullMedia(src,"image"));
     frame.append(image);
     slot.replaceChildren(frame);slot.classList.remove("is-loading-media");
     slot.classList.add("is-ready-media");
    }else{
     const video=document.createElement("video");
     video.className="feed-post-media-video ui-feed-post-media-video-001";
     video.controls=true;video.preload="metadata";video.playsInline=true;
     video.src=src;
     const expand=document.createElement("button");expand.type="button";
     expand.className="vt-feed-post-video-expand-001";
     expand.textContent=tr("На весь екран","Fullscreen");
     expand.addEventListener("click",()=>openFullMedia(src,"video"));
     const reveal=()=>{
      if(!slot.isConnected)return;
      slot.replaceChildren(video,expand);
      slot.classList.remove("is-loading-media");slot.classList.add("is-ready-media");
     };
     if(video.readyState>=1)reveal();
     else video.addEventListener("loadedmetadata",reveal,{once:true});
     video.addEventListener("error",()=>failure(tr("Відео недоступне.","Video unavailable.")),{once:true});
    }
   }catch(_){failure(tr("Медіафайл тимчасово недоступний.","Media temporarily unavailable."));}
  }
  function failure(message){
   if(!slot.isConnected)return;
   slot.classList.remove("is-loading-media");
   const notice=document.createElement("p");
   notice.className="vt-feed-post-media-error-001";notice.textContent=message;
   slot.replaceChildren(notice);
  }
  // Off-screen media should not compete for bandwidth with the visible Feed.
  if(priority<=2||typeof IntersectionObserver==="undefined")void load();
  else{
   const observer=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();void load();}
   },{rootMargin:"440px 0px",threshold:0});
   observer.observe(slot);
  }
 }
 window.VATRA_POST_MEDIA={bindPicker,upload,uploadStory,remove,mount,renderStory,linkifyHashtags,collapsibleBody};
})();
