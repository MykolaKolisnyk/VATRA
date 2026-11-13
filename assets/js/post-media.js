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


 // A balanced gallery: twelve attachments total, with at most four videos.
 // The storage buckets still enforce their own 6 MB photo / 50 MB video caps.
 const GALLERY_LIMIT=12,VIDEO_LIMIT=4,TOTAL_LIMIT=160*1024*1024;
 function validateGallery(files){
  if(files.length>GALLERY_LIMIT)throw Error(tr("До 12 фото та відео в одному дописі.","Up to 12 media files per post."));
  if(files.filter(file=>formatFor(file).kind==="video").length>VIDEO_LIMIT)
   throw Error(tr("В одному дописі можна додати не більше 4 відео.","Up to 4 videos per post."));
  if(files.reduce((sum,file)=>sum+file.size,0)>TOTAL_LIMIT)
   throw Error(tr("Загальний розмір медіа має бути до 160 МБ.","Media total must be under 160 MB."));
  files.forEach(formatFor);
  return files;
 }
 function bindGalleryPicker(ids){
  const input=document.querySelector(ids.input),choose=document.querySelector(ids.choose);
  const clear=document.querySelector(ids.clear),preview=document.querySelector(ids.preview);
  const showError=typeof ids.onError==="function"?ids.onError:()=>{};
  const changed=typeof ids.onChange==="function"?ids.onChange:()=>{};
  if(!input||!choose||!clear||!preview)throw Error("Gallery picker markup is incomplete");
  input.multiple=true;
  let selected=[],urls=[];
  const release=()=>{urls.forEach(url=>URL.revokeObjectURL(url));urls=[];};
  function display(){
   release();preview.replaceChildren();
   clear.hidden=!selected.length;preview.hidden=!selected.length;
   if(selected.length){
    const count=document.createElement("p");count.className="vt-vatra-gallery-selection-count-001";
    count.textContent=selected.length+" / "+GALLERY_LIMIT+" · "+
     selected.filter(file=>formats[file.type]?.kind==="video").length+" "+tr("відео","videos");
    preview.append(count);
   }
   const grid=document.createElement("div");grid.className="vatra-gallery-picker-grid ui-vatra-gallery-picker-grid-001";
   selected.forEach((file,index)=>{
    const tile=document.createElement("div");tile.className="vatra-gallery-picker-tile ui-vatra-gallery-picker-tile-"+index;
    const url=URL.createObjectURL(file);urls.push(url);
    const media=document.createElement(formats[file.type].kind==="video"?"video":"img");
    media.className="ui-vatra-gallery-picker-media-"+index;media.src=url;
    if(media.tagName==="VIDEO"){media.preload="metadata";media.muted=true;media.playsInline=true;}
    else media.alt=tr("Фото для публікації","Selected post photo");
    const remove=document.createElement("button");remove.type="button";
    remove.className="vt-vatra-gallery-picker-remove-"+index;
    remove.setAttribute("aria-label",tr("Прибрати файл ","Remove file ")+file.name);
    const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");
    icon.setAttribute("class","ui-vatra-gallery-picker-remove-icon-"+index);
    icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("width","16");icon.setAttribute("height","16");
    icon.setAttribute("fill","none");icon.setAttribute("stroke","currentColor");
    icon.setAttribute("stroke-width","1.8");icon.setAttribute("aria-hidden","true");
    const iconPath=document.createElementNS("http://www.w3.org/2000/svg","path");
    iconPath.setAttribute("class","ui-vatra-gallery-picker-remove-path-"+index);
    iconPath.setAttribute("d","M6 6l12 12M18 6 6 18");
    icon.append(iconPath);remove.append(icon);
    remove.addEventListener("click",()=>{
     selected.splice(index,1);display();changed();
    });
    const label=document.createElement("small");label.className="vt-vatra-gallery-picker-name-"+index;
    label.textContent=file.name;
    tile.append(media,remove,label);grid.append(tile);
   });
   preview.append(grid);
  }
  const reset=()=>{selected=[];input.value="";display();changed();};
  choose.addEventListener("click",()=>input.click());
  input.addEventListener("change",()=>{
   try{
    const incoming=Array.from(input.files||[]);
    validateGallery([...selected,...incoming]);
    selected=[...selected,...incoming];showError("");display();changed();
   }catch(error){showError(error.message);}
   input.value="";
  });
  clear.addEventListener("click",reset);
  return {getFiles:()=>[...selected],getFile:()=>selected[0]||null,reset};
 }
 async function removeGallery(client,items){
  const imagePaths=[],videoPaths=[];
  for(const item of items||[]){
   if(!item||!["image","video"].includes(item.media_kind)||!item.media_path)continue;
   (item.media_kind==="image"?imagePaths:videoPaths).push(item.media_path);
  }
  await Promise.allSettled([
   imagePaths.length?client.storage.from("vatra-post-images").remove(imagePaths):Promise.resolve(),
   videoPaths.length?client.storage.from("vatra-videos").remove(videoPaths):Promise.resolve()
  ]);
 }
 async function uploadGallery(client,id,files){
  validateGallery(files);
  const uploaded=[];
  try{
   for(const file of files){
    const item=await upload(client,id,file);
    uploaded.push(item);
   }
   return uploaded;
  }catch(error){
   await removeGallery(client,uploaded);
   throw error;
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

 async function mountGallery(client,post,container){
  const id=post.author_vatra_id;
  const media=Array.isArray(post.media_items)?post.media_items.slice(0,GALLERY_LIMIT).filter(item=>
   item&&["image","video"].includes(item.media_kind)&&name(item.media_path,item.media_kind,id)):[];
  if(!media.length)return false;
  const slot=document.createElement("div");
  slot.className="feed-post-media vatra-post-gallery ui-vatra-post-gallery-001";
  slot.dataset.layout=String(media.length>=5?5:media.length);
  slot.setAttribute("aria-label",tr("Медіагалерея публікації","Post media gallery"));
  const previews=media.slice(0,5);
  const tiles=previews.map((item,index)=>{
   const tile=document.createElement("button");
   tile.className="vatra-post-gallery-tile vt-vatra-post-gallery-tile-"+index;
   tile.type="button";
   tile.setAttribute("aria-label",tr("Відкрити файл ","Open media ")+(index+1));
   tile.dataset.kind=item.media_kind;
   const skeleton=document.createElement("span");
   skeleton.className="ui-vatra-post-gallery-skeleton-"+index;
   skeleton.setAttribute("aria-hidden","true");
   tile.append(skeleton);
   if(item.media_kind==="video"){
    const badge=document.createElementNS("http://www.w3.org/2000/svg","svg");
    badge.setAttribute("class","ui-vatra-post-gallery-play-"+index);
    badge.setAttribute("viewBox","0 0 24 24");
    badge.setAttribute("fill","currentColor");badge.setAttribute("aria-hidden","true");
    const play=document.createElementNS("http://www.w3.org/2000/svg","path");
    play.setAttribute("class","ui-vatra-post-gallery-play-path-"+index);
    play.setAttribute("d","M9 5v14l11-7Z");badge.append(play);tile.append(badge);
   }
   if(index===4&&media.length>5){
    const extra=document.createElement("span");extra.className="vt-vatra-post-gallery-extra-001";
    extra.textContent="+"+(media.length-5);tile.append(extra);
   }
   tile.addEventListener("click",()=>void openGallery(index));
   slot.append(tile);
   return {item,tile,index};
  });
  container.append(slot);
  let begun=false;
  async function loadTiles(){
   if(begun)return;begun=true;
   await Promise.allSettled(tiles.map(async({item,tile,index})=>{
    try{
     const src=await signed(client,item.media_kind,item.media_path);
     if(!tile.isConnected)return;
     const element=document.createElement(item.media_kind==="image"?"img":"video");
     element.className="ui-vatra-post-gallery-media-"+index;
     if(item.media_kind==="image"){element.alt=tr("Фото публікації","Post photo");element.decoding="async";}
     else{element.muted=true;element.playsInline=true;element.preload="metadata";}
     element.src=src;
     tile.prepend(element);
     tile.classList.add("is-gallery-ready");
     const skeleton=tile.querySelector('[class^="ui-vatra-post-gallery-skeleton-"]');
     skeleton?.remove();
    }catch(_){tile.classList.add("is-gallery-unavailable");}
   }));
  }
  if(typeof IntersectionObserver==="undefined")void loadTiles();
  else{
   const observer=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();void loadTiles();}
   },{rootMargin:"350px 0px"});
   observer.observe(slot);
  }
  async function openGallery(startIndex){
   let index=startIndex,active=true;
   const current=media[index];
   try{
    const initial=await signed(client,current.media_kind,current.media_path);
    if(!slot.isConnected)return;
    openFullMedia(initial,current.media_kind);
   }catch(_){return;}
   const controller=new AbortController();
   mediaDialog.addEventListener("close",()=>{active=false;controller.abort();},{once:true});
   const makeNav=(dir,label)=>{
    const button=document.createElement("button");button.type="button";
    button.className="vt-vatra-post-gallery-nav-"+(dir<0?"prev":"next");
    button.setAttribute("aria-label",label);
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("class","ui-vatra-post-gallery-nav-icon-"+(dir<0?"prev":"next"));
    svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("width","22");svg.setAttribute("height","22");
    svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");
    svg.setAttribute("stroke-width","2");svg.setAttribute("stroke-linecap","round");
    const path=document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("class","ui-vatra-post-gallery-nav-path-"+(dir<0?"prev":"next"));
    path.setAttribute("d",dir<0?"m15 5-7 7 7 7":"m9 5 7 7-7 7");
    svg.append(path);button.append(svg);return button;
   };
   let renderTicket=0;
   const render=async()=>{
    const token=++renderTicket,item=media[index];
    try{
     const url=await signed(client,item.media_kind,item.media_path);
     if(!active||token!==renderTicket||!mediaDialog.open)return;
     const element=document.createElement(item.media_kind==="video"?"video":"img");
     element.className=item.media_kind==="video"?"ui-vatra-post-expanded-video-001":"ui-vatra-post-expanded-image-001";
     if(item.media_kind==="video"){element.controls=true;element.playsInline=true;}
     else element.alt=tr("Фото публікації","Post photo");
     element.src=url;
     const prev=makeNav(-1,tr("Попередній файл","Previous media"));
     const next=makeNav(1,tr("Наступний файл","Next media"));
     const counter=document.createElement("span");
     counter.className="vt-vatra-post-gallery-counter-001";
     counter.textContent=(index+1)+" / "+media.length;
     prev.disabled=index===0;next.disabled=index===media.length-1;
     prev.addEventListener("click",()=>{if(index>0){index--;void render();}});
     next.addEventListener("click",()=>{if(index<media.length-1){index++;void render();}});
     const currentVideo=mediaDialogContent.querySelector("video");
     currentVideo?.pause();
     mediaDialogContent.replaceChildren(element,prev,next,counter);
    }catch(_){}
   };
   mediaDialog.addEventListener("keydown",event=>{
    if(event.key==="ArrowLeft"&&index>0){event.preventDefault();index--;void render();}
    if(event.key==="ArrowRight"&&index<media.length-1){event.preventDefault();index++;void render();}
   },{signal:controller.signal});
   void render();
  }
  return true;
 }
 async function mount(client,post,container){
  if(Array.isArray(post?.media_items)&&post.media_items.length){
   await mountGallery(client,post,container);return;
  }
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
 window.VATRA_POST_MEDIA={bindPicker,bindGalleryPicker,validateGallery,upload,uploadGallery,removeGallery,uploadStory,remove,mount,renderStory,linkifyHashtags,collapsibleBody};
})();
