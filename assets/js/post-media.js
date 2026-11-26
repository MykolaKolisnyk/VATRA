(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const language=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
 const tr=(uk,english)=>{
  const locale=language();
  if(locale==="uk")return uk;
  if(locale==="en")return english;
  const translated=window.VATRA_LANGUAGE?.translate?.(uk);
  return typeof translated==="string"&&translated!==uk?translated:uk;
 };
 const formats={
  "image/jpeg":{kind:"image",ext:"jpg",bucket:"post-images",limit:31457280},
  "image/png":{kind:"image",ext:"png",bucket:"post-images",limit:31457280},
  "image/webp":{kind:"image",ext:"webp",bucket:"post-images",limit:31457280},
  "video/mp4":{kind:"video",ext:"mp4",bucket:"videos",limit:52428800},
  "video/webm":{kind:"video",ext:"webm",bucket:"videos",limit:52428800}
 };
 const validId=id=>/^[1-9][0-9]{0,18}$/.test(String(id||""));
 const formatFor=file=>{
  const info=formats[file?.type];
  if(!info||!file?.size)throw Error(tr("Виберіть JPEG, PNG, WebP, MP4 або WebM.","Choose JPEG, PNG, WebP, MP4 or WebM."));
  if(file.size>info.limit)throw Error(info.kind==="image"?
   tr("Фото має бути до 30 МБ.","Photo must be under 30 MB."):
   tr("Відео має бути до 50 МБ.","Video must be under 50 MB."));
  return info;
 };
 const name=(path,kind,id)=>{
  const ext=kind==="image"?"(?:jpg|png|webp)":"(?:mp4|webm)";
  return validId(id)&&typeof path==="string"&&
   new RegExp("^"+id+"/posts/[a-f0-9-]{36}\\."+ext+"$").test(path);
 };
 const bucketFor=kind=>kind==="image"?"post-images":"videos";
 const storyPathValid=(path,kind,id)=>{
  if(!validId(id)||typeof path!=="string"||!["image","video"].includes(kind))return false;
  const extension=kind==="image"?"(?:jpg|png|webp)":"(?:mp4|webm)";
  return new RegExp("^"+id+"/stories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\."+extension+"$").test(path);
 };


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
   link.className="vatra-feed-post-hashtag-001";
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
    const count=document.createElement("p");count.className="vatra-gallery-selection-count-001";
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
    remove.className="vatra-gallery-picker-remove-"+index;
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
    const label=document.createElement("small");label.className="vatra-gallery-picker-name-"+index;
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
   if(item.media_kind==="image"){
    imagePaths.push(item.media_path);

    if(typeof item.preview_path==="string"&&item.preview_path!==item.media_path)
     imagePaths.push(item.preview_path);
   }else videoPaths.push(item.media_path);
  }
  const results=await Promise.allSettled([
   imagePaths.length?Promise.resolve().then(()=>client.storage.from("post-images").remove([...new Set(imagePaths)])):Promise.resolve(),
   videoPaths.length?Promise.resolve().then(()=>client.storage.from("videos").remove([...new Set(videoPaths)])):Promise.resolve()
  ]);
  return results.every(result=>result.status==="fulfilled"&&!result.value?.error);
 }
 async function uploadGallery(client,id,files){
  validateGallery(files);
  const uploaded=[];
  try{


   for(let offset=0;offset<files.length;offset+=2){
    const batch=files.slice(offset,offset+2);
    const results=await Promise.allSettled(batch.map(file=>upload(client,id,file)));
    for(const result of results)if(result.status==="fulfilled")uploaded.push(result.value);
    const failure=results.find(result=>result.status==="rejected");
    if(failure)throw failure.reason;
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



 async function makeImagePreview(file){

  if(!file||file.size<256*1024)return null;
  let image=null,release=()=>{};
  try{
   if(typeof createImageBitmap==="function"){
    try{
     image=await createImageBitmap(file);
     if(!image?.width||!image?.height){image?.close?.();image=null;}
     else release=()=>image.close?.();
    }catch(_){ }
   }
   if(!image){
    if(typeof Image!=="function"||typeof URL==="undefined"||
       typeof URL.createObjectURL!=="function")return null;
    const objectURL=URL.createObjectURL(file),fallback=new Image();
    try{
     if(typeof fallback.decode==="function"){
      fallback.src=objectURL;
      await fallback.decode();
     }else{
      await new Promise((resolve,reject)=>{
       fallback.onload=resolve;fallback.onerror=reject;fallback.src=objectURL;
      });
     }
     image=fallback;release=()=>URL.revokeObjectURL(objectURL);
    }catch(_){URL.revokeObjectURL(objectURL);return null;}
   }
   const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
   if(!width||!height)return null;


   for(const [longEdge,quality] of [[960,0.75],[768,0.66],[640,0.58],[480,0.5]]){
    const scale=Math.min(1,longEdge/Math.max(width,height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(width*scale));
    canvas.height=Math.max(1,Math.round(height*scale));
    const context=canvas.getContext("2d");
    if(!context)return null;
    context.drawImage(image,0,0,canvas.width,canvas.height);
    let blob;
    try{blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",quality));}
    catch(_){continue;}
    if(blob?.type==="image/webp"&&blob.size<=400*1024&&blob.size<file.size*0.8)
     return blob;
   }
   return null;
  }catch(_){return null;}
  finally{release();}
 }
 async function upload(client,id,file){
  const format=formatFor(file);
  if(!validId(id))throw Error(tr("VATRA ID недоступний.","VATRA ID unavailable."));
  const path=id+"/posts/"+crypto.randomUUID()+"."+format.ext;


  const previewJob=format.kind==="image"?makeImagePreview(file):Promise.resolve(null);
  const {error}=await client.storage.from(format.bucket).upload(path,file,{
   contentType:file.type,cacheControl:"3600",upsert:false
  });
  if(error)throw Error(tr("Не вдалося завантажити файл. Спробуйте знову.","Could not upload media. Try again."));
  const item={media_kind:format.kind,media_path:path};
  const preview=await previewJob;
  if(preview){
   const previewPath=id+"/posts/"+crypto.randomUUID()+".webp";
   try{
    const {error:previewError}=await client.storage.from("post-images").upload(previewPath,preview,{
     contentType:"image/webp",cacheControl:"3600",upsert:false
    });
    if(!previewError)item.preview_path=previewPath;
   }catch(_){ }
  }
  return item;
 }
 async function uploadStory(client,id,file){
  const format=formatFor(file);
  if(!validId(id))throw Error(tr("VATRA ID недоступний.","VATRA ID unavailable."));
  const path=String(id)+"/stories/"+crypto.randomUUID().toLowerCase()+"."+format.ext;
  if(!storyPathValid(path,format.kind,String(id)))throw Error("Invalid story media path");
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

 const signedURLCaches=new WeakMap();


 function signedCacheFor(client){
  let state=signedURLCaches.get(client);
  if(state)return state;
  state={signedURLs:new Map(),singlePending:new Map(),bulkPending:new Map(),previewBatches:new Map(),version:0,active:0,queue:[],viewer:null,token:null};
  signedURLCaches.set(client,state);
  if(typeof client.auth?.onAuthStateChange==="function"){
   client.auth.onAuthStateChange((event,session)=>{
    const viewer=session?.user?.id||null,token=session?.access_token||null;
    if(event==="INITIAL_SESSION"){state.viewer=viewer;state.token=token;return;}
    if(event==="SIGNED_IN"&&viewer&&token&&viewer===state.viewer&&token===state.token)return;
    state.viewer=viewer;state.token=token;
    state.version++;
    state.signedURLs.clear();
    state.singlePending.clear();
    state.bulkPending.clear();
    state.previewBatches.clear();
    for(const queued of state.queue.splice(0))queued.cancel();
   });
  }
  return state;
 }

 const cachedSignedURL=(signedURLs,key)=>{
  const entry=signedURLs.get(key);
  if(!entry)return null;
  if(entry.expiry<=Date.now()){signedURLs.delete(key);return null;}
  signedURLs.delete(key);signedURLs.set(key,entry);
  return entry;
 };
 const trimSignedCache=signedURLs=>{
  const now=Date.now();
  for(const [key,entry] of signedURLs)
   if(entry.expiry<=now)signedURLs.delete(key);
  while(signedURLs.size>256)signedURLs.delete(signedURLs.keys().next().value);
 };
 let firstImages=0;
 const SIGN_LIMIT=4,SIGN_TIMEOUT=12000;
 function scheduleSigning(state,version,task){
  return new Promise((resolve,reject)=>{
   const start=()=>{
    if(state.version!==version){reject(Error("Session changed while signing media"));return;}
    state.active++;
    let timer;
    const deadline=new Promise((_,fail)=>{timer=setTimeout(()=>fail(Error("Media signing timed out")),SIGN_TIMEOUT);});
    Promise.race([Promise.resolve().then(()=>{if(state.version!==version)throw Error("Session changed while signing media");return task();}),deadline]).then(resolve,reject).finally(()=>{
     clearTimeout(timer);state.active--;
     while(state.active<SIGN_LIMIT&&state.queue.length)state.queue.shift()();
    });
   };
   start.cancel=()=>reject(Error("Session changed while signing media"));
   if(state.active<SIGN_LIMIT)start();else state.queue.push(start);
  });
 }


 async function preSignGallery(client,items,ttl=3600){
  const state=signedCacheFor(client),signedURLs=state.signedURLs;
  const version=state.version,grouped=new Map(),waiting=new Set();
  for(const item of items||[]){
   const kind=item?.media_kind,path=item?.media_path;
   if(!["image","video"].includes(kind)||typeof path!=="string")continue;
   const key=ttl+":"+kind+":"+path;
   const cached=cachedSignedURL(signedURLs,key),pending=state.singlePending.get(key)||state.bulkPending.get(key);
   if(cached){waiting.add(cached.promise);continue;}
   if(pending){waiting.add(pending);continue;}
   if(!grouped.has(kind))grouped.set(kind,new Set());
   grouped.get(kind).add(path);
  }
  for(const [kind,pathSet] of grouped){
   const allPaths=[...pathSet],bucket=client.storage.from(bucketFor(kind));
   if(typeof bucket.createSignedUrls!=="function")continue;
   for(let offset=0;offset<allPaths.length;offset+=100){
   const paths=allPaths.slice(offset,offset+100),keys=paths.map(path=>ttl+":"+kind+":"+path);
   const pending=(async()=>{
    const {data,error}=await scheduleSigning(state,version,()=>bucket.createSignedUrls(paths,ttl));
    if(error||!Array.isArray(data)||state.version!==version)return;
    for(let i=0;i<paths.length;i++){
     const item=data[i];
     if(!item?.signedUrl||item.error||(item.path&&item.path!==paths[i]))continue;
     try{
      const url=new URL(item.signedUrl,location.origin);
      if(url.protocol!=="https:"||url.hostname!=="cxrcycxrlkufozomsxcs.supabase.co")continue;
      signedURLs.set(keys[i],{expiry:Date.now()+Math.max(0,ttl-30)*1000,promise:Promise.resolve(url.href)});
     }catch(_){}
    }
    trimSignedCache(signedURLs);
   })();
   for(const key of keys)state.bulkPending.set(key,pending);
   waiting.add(pending);
   void pending.finally(()=>{
    for(const key of keys)if(state.bulkPending.get(key)===pending)state.bulkPending.delete(key);
   }).catch(()=>{});
   }
  }
  await Promise.allSettled([...waiting]);
  trimSignedCache(signedURLs);
 }
 function preSignVisible(client,items,ttl=3600){
  const state=signedCacheFor(client),version=state.version;
  let batch=state.previewBatches.get(ttl);
  if(!batch){
   batch={items:new Map(),promise:null};
   state.previewBatches.set(ttl,batch);
   batch.promise=Promise.resolve().then(async()=>{
    if(state.previewBatches.get(ttl)===batch)state.previewBatches.delete(ttl);
    if(state.version!==version)return false;
    const missing=[...batch.items.values()].filter(item=>{
     const key=ttl+":image:"+item.media_path;
     return !cachedSignedURL(state.signedURLs,key)&&!state.singlePending.has(key)&&!state.bulkPending.has(key);
    });
    if(missing.length>1)await preSignGallery(client,missing,ttl);
    return state.version===version;
   });
  }
  for(const item of items||[]){
   if(item?.media_kind==="image"&&typeof item.media_path==="string")
    batch.items.set(item.media_path,item);
  }
  return batch.promise;
 }
 async function signed(client,kind,path,ttl=3600){
  const state=signedCacheFor(client),signedURLs=state.signedURLs;
  const version=state.version,key=ttl+":"+kind+":"+path;
  const bulk=state.bulkPending.get(key);
  if(bulk){await bulk.catch(()=>{});if(state.version!==version)throw Error("Session changed while signing media");}
  const entry=cachedSignedURL(signedURLs,key);
  if(entry)return entry.promise;
  const pending=state.singlePending.get(key);
  if(pending)return pending;
  const expiry=Date.now()+Math.max(0,ttl-30)*1000;
  const promise=scheduleSigning(state,version,()=>client.storage.from(bucketFor(kind)).createSignedUrl(path,ttl)).then(({data,error})=>{

   if(state.version!==version)throw Error("Session changed while signing media");
   if(error||!data?.signedUrl)throw error||new Error("Missing signed URL");
   const url=new URL(data.signedUrl);
   if(url.protocol!=="https:"||url.hostname!=="cxrcycxrlkufozomsxcs.supabase.co")
    throw Error("Unexpected signed asset URL");
   signedURLs.set(key,{expiry,promise:Promise.resolve(url.href)});
   trimSignedCache(signedURLs);
   return url.href;
  }).finally(()=>{
   if(state.singlePending.get(key)===promise)state.singlePending.delete(key);
  });
  state.singlePending.set(key,promise);
  return promise;
 }
 async function forgetFailedSignedURL(client,kind,path,failedURL,ttl=3600){
  const state=signedURLCaches.get(client),key=ttl+":"+kind+":"+path;
  const entry=state?.signedURLs.get(key);
  if(!entry)return;
  try{
   const url=await entry.promise;
   if(url===failedURL&&state.signedURLs.get(key)===entry)state.signedURLs.delete(key);
  }catch(_){}
 }
 function clearStory(slot){
  if(!slot)return;
  const request=String(Number(slot.dataset.storyRequest||"0")+1);
  slot.dataset.storyRequest=request;
  const video=slot.querySelector?.("video");
  if(video){video.pause();video.removeAttribute("src");video.load();}
  slot.replaceChildren();slot.hidden=true;
  return request;
 }
 async function renderStory(client,story,slot,preview=false,allowExpired=false){
  if(!slot)return;
  const request=clearStory(slot);
  const {media_kind:kind,media_path:path,author_vatra_id:id}=story||{};
  if(!storyPathValid(path,kind,id))return;
  if(!allowExpired&&story.expires_at&&Date.parse(story.expires_at)<=Date.now())return;
  slot.hidden=false;
  if(!preview)slot.textContent=tr("Завантаження медіа…","Loading media…");
  try{
   if(preview&&kind==="image"){
    if(!await preSignVisible(client,[{media_kind:kind,media_path:path}],300))throw Error("Session changed while signing media");
    if(!slot.isConnected||slot.dataset.storyRequest!==request)return;
   }
   const src=await signed(client,kind,path,300);
   if(!slot.isConnected||slot.dataset.storyRequest!==request)return;
   const element=document.createElement(kind==="image"?"img":"video");
   element.className=preview?"vatra-story-media-preview-001":"vatra-story-media-expanded-001";
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
  button.type="button";button.className="vatra-feed-post-read-more-001";
  button.setAttribute("aria-expanded","false");
  button.textContent=tr("Показати більше","Show more");
  paragraph.dataset.vatraCollapsed="true";
  let expanded=false;
  const update=()=>{
   paragraph.textContent=expanded?full.trimEnd():compact;
   linkifyHashtags(paragraph);
   if(!expanded)paragraph.append(document.createTextNode(" "),button);
  };
  button.addEventListener("click",()=>{
   expanded=true;
   paragraph.dataset.vatraCollapsed="expanded";
   update();
  },{once:true});
  update();
 }

 let mediaDialog=null,mediaDialogContent=null,mediaSide=null,restoreMediaPanel=null,restoreOwnerMenu=null,mediaCaption=null,mediaFooterActions=null,mediaFooterShare=null,mediaFooterDelete=null,mediaFooterDownload=null,mediaFooterOpenPost=null;
 const photoSlides=new WeakMap();
 const photoMatteChecks=new WeakMap(),photoOriginalReaders=new WeakMap();
 async function readPhotoAlpha(image,isCurrent=()=>true){
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
  if(!ctx)throw Error("Canvas unavailable");
  const width=image.naturalWidth,height=image.naturalHeight,tile=512;
  let count=0;
  try{
   for(let y=0;y<height;y+=tile)for(let x=0;x<width;x+=tile){
    if(!isCurrent())return "unknown";
    const w=Math.min(tile,width-x),h=Math.min(tile,height-y);
    canvas.width=w;canvas.height=h;
    ctx.drawImage(image.bitmap||image,x,y,w,h,0,0,w,h);
    const pixels=ctx.getImageData(0,0,w,h).data;
    for(let i=3;i<pixels.length;i+=4)if(pixels[i]<255)return "white";
    if(++count%8===0)await new Promise(resolve=>setTimeout(resolve,0));
   }
   return "dark";
  }finally{canvas.width=canvas.height=0;}
 }
 async function photoMatte(image,isCurrent=()=>true,readOriginal=photoOriginalReaders.get(image)){
  try{return await readPhotoAlpha(image,isCurrent);}catch(_){}
  if(!isCurrent())return "unknown";
  const src=image.currentSrc||image.src;
  const inspect=async blob=>{
   if(!blob||!isCurrent())return "unknown";
   if(typeof createImageBitmap==="function"){
    try{
     const bitmap=await createImageBitmap(blob);
     try{return await readPhotoAlpha({naturalWidth:bitmap.width,naturalHeight:bitmap.height,bitmap},isCurrent);}
     finally{bitmap.close();}
    }catch(_){}
   }
   const url=URL.createObjectURL(blob);
   try{
    const copy=new Image();copy.src=url;await copy.decode();
    return await readPhotoAlpha(copy,isCurrent);
   }finally{URL.revokeObjectURL(url);}
  };
  if(typeof readOriginal==="function"){
   let timer;
   try{
    const blob=await Promise.race([Promise.resolve().then(readOriginal),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),8000);})]);
    const matte=await inspect(blob);if(matte!=="unknown")return matte;
   }catch(_){}finally{clearTimeout(timer);}
  }
  if(src&&isCurrent()){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch(src,{mode:"cors",signal:controller.signal});
    if(response.ok)return await inspect(await response.blob());
   }catch(_){}finally{clearTimeout(timer);}
  }
  return "unknown";
 }
 function fitPhotoViewer(dialog,stage,image,path){
  if(!dialog||!stage||!image?.naturalWidth||!image.naturalHeight)return;
  if(dialog.open&&image.complete){
   const src=image.src||image.currentSrc,previous=photoMatteChecks.get(stage);
   if(previous?.image===image&&previous.src===src){
    if(previous.result)stage.dataset.photoMatte=previous.result;
    return previous.pending;
   }else{
    const state={image,src,result:null};photoMatteChecks.set(stage,state);
    stage.dataset.photoMatte="unknown";
    const current=()=>photoMatteChecks.get(stage)===state&&dialog.open&&image.isConnected&&(image.src||image.currentSrc)===src;
    let deadline,settled=false;
    state.pending=Promise.race([
     photoMatte(image,()=>current()&&!settled),
     new Promise(resolve=>{deadline=setTimeout(()=>resolve("unknown"),1200);})
    ]).catch(()=>"unknown").then(matte=>{
     settled=true;clearTimeout(deadline);
     if(!current()){if(photoMatteChecks.get(stage)===state)photoMatteChecks.delete(stage);return;}
     state.result=matte==="dark"?"dark":"white";
     stage.dataset.photoMatte=state.result;
    });
    return state.pending;
   }
  }
 }
 function clearPhotoSlide(stage){
  const previous=photoSlides.get(stage);
  if(previous){previous.cancel();photoSlides.delete(stage);}
 }
 function beginPhotoSlide(stage,image,direction){
  clearPhotoSlide(stage);
  if(!direction||!image?.naturalWidth||!image.complete||window.matchMedia?.("(prefers-reduced-motion: reduce)").matches||typeof image.animate!=="function")return ()=>{};
  const ghost=document.createElement("img");
  ghost.className="vatra-photo-slide-outgoing-001";ghost.alt="";ghost.setAttribute("aria-hidden","true");
  ghost.src=image.currentSrc||image.src;
  ghost.style.background=stage.dataset.photoMatte==="white"?"#fff":"#111419";
  stage.append(ghost);
  let animation=null,incoming=null,timer=null;
  const state={cancel(){clearTimeout(timer);animation?.cancel();incoming?.cancel();ghost.remove();}};
  photoSlides.set(stage,state);
  timer=setTimeout(()=>{if(photoSlides.get(stage)===state)clearPhotoSlide(stage);},15000);
  return next=>{
   if(photoSlides.get(stage)!==state||!next?.naturalWidth||!stage.isConnected)return;
   clearTimeout(timer);
   const distance=Math.max(1,stage.clientWidth),sign=direction>0?1:-1;
   const options={duration:300,easing:"cubic-bezier(.22,.61,.36,1)",fill:"both"};
   animation=ghost.animate([{transform:"translateX(0)"},{transform:"translateX("+(-sign*distance)+"px)"}],options);
   incoming=next.animate([{transform:"translateX("+(sign*distance)+"px)"},{transform:"translateX(0)"}],options);
   incoming.finished.then(()=>{if(photoSlides.get(stage)===state)clearPhotoSlide(stage);},()=>{});
  };
 }
 const photoControls=new WeakMap();
 function photoZoomLevel(value,step){return Math.max(1,Math.min(3,Math.round((value+step*.25)*100)/100));}
 function preparePhotoControls(dialog,stage,image){
  const close=dialog.querySelector(".vatra-post-media-close-001,.profile-media-viewer-close,.vatra-album-viewer-close-001");
  if(!close?.parentElement)return null;
  let state=photoControls.get(dialog);
  if(!state){
   const logo=document.createElement("span");logo.className="vatra-photo-viewer-brand-001";logo.setAttribute("role","img");logo.setAttribute("aria-label","VATRA");close.after(logo);
   const bar=document.createElement("div");bar.className="ui-vatra-photo-zoom-controls-001";bar.setAttribute("role","group");bar.setAttribute("aria-label",tr("Масштаб фотографії","Photo zoom"));
   const make=(kind,label)=>{
    const button=document.createElement("button");button.type="button";button.className="vatra-photo-zoom-button-001 vatra-photo-zoom-"+kind+"-001";button.setAttribute("aria-label",label);
    const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg"),path=document.createElementNS(ns,"path");svg.setAttribute("class","ui-vatra-photo-zoom-icon-001");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.8");svg.setAttribute("stroke-linecap","round");svg.setAttribute("aria-hidden","true");path.setAttribute("class","ui-vatra-photo-zoom-path-001");path.setAttribute("d","M21 21l-5.1-5.1M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM7.5 10.5h6"+(kind==="in"?"M10.5 7.5v6":""));svg.append(path);button.append(svg);return button;
   };
   const plus=make("in",tr("Наблизити","Zoom in")),minus=make("out",tr("Віддалити","Zoom out"));
   const wrap=(button,kind)=>{const item=document.createElement("span");item.className="vatra-photo-zoom-wrap-"+kind+"-001";item.append(button);return item;};
   const count=document.createElement("output");count.className="vatra-photo-zoom-value-001";count.setAttribute("aria-live","polite");
   bar.append(wrap(plus,"in"),wrap(minus,"out"),count);
   bar.addEventListener("mousedown",event=>{if(event.button===0)event.preventDefault();});
   bar.addEventListener("dblclick",event=>{event.preventDefault();event.stopPropagation();});
   bar.addEventListener("selectstart",event=>event.preventDefault());
   bar.addEventListener("dragstart",event=>event.preventDefault());
   close.parentElement.append(bar);
   state={target:null,value:1,ready:false};
   state.paint=()=>{plus.disabled=!state.ready||state.value>=3;minus.disabled=!state.ready||state.value<=1;count.value=Math.round(state.value*100)+"%";if(state.target)state.target.style.scale=state.value===1?"":String(state.value);};
   plus.onclick=()=>{if(state.ready){state.value=photoZoomLevel(state.value,1);state.paint();}};
   minus.onclick=()=>{if(state.ready){state.value=photoZoomLevel(state.value,-1);state.paint();}};
   dialog.addEventListener("close",()=>{if(state.target)state.target.style.removeProperty("scale");state.target=null;state.ready=false;state.value=1;state.paint();});
   photoControls.set(dialog,state);
  }
  if(state.target)state.target.style.removeProperty("scale");
  state.target=image.closest(".ui-profile-photo-canvas-001")||image;state.target.classList.add("vatra-photo-zoom-target-001");state.value=1;state.ready=false;state.paint();return state;
 }
 const photoLoads=new WeakMap();
 function watchPhotoViewer(dialog,stage,image,path,finish=()=>{},readOriginal=null){
  if(readOriginal)photoOriginalReaders.set(image,readOriginal);else photoOriginalReaders.delete(image);
  photoLoads.get(stage)?.abort();
  photoMatteChecks.delete(stage);stage.dataset.photoMatte="unknown";
  const controller=new AbortController();photoLoads.set(stage,controller);
  const controls=preparePhotoControls(dialog,stage,image);
  const loaded=()=>{if(controller.signal.aborted||!dialog.open||!image.isConnected)return;if(controls){controls.ready=true;controls.paint();}finish(image);void fitPhotoViewer(dialog,stage,image,path);};
  if(image.complete&&image.naturalWidth)queueMicrotask(loaded);else image.addEventListener("load",loaded,{once:true,signal:controller.signal});
 }
function openFullMedia(url,kind,container,post=null,client=null,fromPhotos=false,direction=0,sourcePath=null){
  if(!mediaDialog){
   mediaDialog=document.createElement("dialog");
   mediaDialog.id="vatra-post-media-viewer";
   mediaDialog.className="vatra-post-media-viewer ui-vatra-post-media-viewer-001";
   mediaDialog.setAttribute("aria-label",tr("Перегляд медіа","Media viewer"));
   const frame=document.createElement("div");
   frame.className="vatra-post-media-viewer-frame ui-vatra-post-media-viewer-frame-001";
   const close=document.createElement("button");
   close.className="vatra-post-media-close-001";close.type="button";
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
   mediaCaption=document.createElement("span");
   mediaCaption.className="vatra-post-media-caption-001";
   const footer=document.createElement("footer");
   footer.className="ui-vatra-post-media-footer-001";
   mediaFooterActions=document.createElement("nav");
   mediaFooterActions.className="ui-vatra-post-media-footer-actions-001";
   mediaFooterActions.setAttribute("aria-label",tr("Дії з фотографією","Photo actions"));
   mediaFooterDownload=document.createElement("button");
   mediaFooterDownload.type="button";
   mediaFooterDownload.className="vatra-post-media-footer-download-001";
   mediaFooterDownload.textContent=document.documentElement.lang==="en"?"Download":"Завантажити";
   mediaFooterDownload.addEventListener("click",async()=>{
    const image=mediaDialogContent.querySelector("img"),source=image?.currentSrc||image?.src;
    if(!source||mediaFooterDownload.disabled)return;
    mediaFooterDownload.disabled=true;
    try{
     const response=await fetch(source,{credentials:"omit",cache:"no-store"});
     if(!response.ok)throw Error("Download unavailable");
     const data=await response.blob();
     const ext=data.type==="image/png"?"png":data.type==="image/webp"?"webp":"jpg";
     const url=URL.createObjectURL(data),anchor=document.createElement("a");
     anchor.className="vatra-post-media-download-link-001";
     anchor.href=url;anchor.download="vatra-photo."+ext;
     document.body.append(anchor);anchor.click();anchor.remove();
     setTimeout(()=>URL.revokeObjectURL(url),20000);
    }catch(_){
     window.VATRA_TOAST?.show?.(document.documentElement.lang==="en"?"Could not download photo.":"Не вдалося завантажити фотографію.");
    }finally{mediaFooterDownload.disabled=false;}
   });
   mediaFooterOpenPost=document.createElement("button");
   mediaFooterOpenPost.type="button";
   mediaFooterOpenPost.className="vatra-post-media-footer-open-post-001";
   mediaFooterOpenPost.addEventListener("click",()=>{
    const url=mediaFooterOpenPost.dataset.href;
    if(url)location.assign(url);
   });
   mediaFooterOpenPost.textContent=document.documentElement.lang==="en"?"Go to post":"Перейти до публікації";
   mediaFooterShare=document.createElement("button");
   mediaFooterShare.type="button";
   mediaFooterShare.className="vatra-post-media-footer-share-001";
   mediaFooterShare.textContent=tr("Поділитися","Share");
   mediaFooterShare.addEventListener("click",()=>mediaSide.querySelector(".vatra-post-share-toggle-001")?.click());
   mediaFooterDelete=document.createElement("button");
   mediaFooterDelete.type="button";
   mediaFooterDelete.className="vatra-post-media-footer-delete-001";
   mediaFooterDelete.textContent=tr("Видалити","Delete");
   mediaFooterDelete.hidden=true;
   mediaFooterDelete.addEventListener("click",()=>mediaFooterActions.querySelector(".vatra-post-owner-delete-001")?.click());
   mediaFooterActions.append(mediaFooterDownload,mediaFooterOpenPost,mediaFooterShare,mediaFooterDelete);
   footer.append(mediaCaption,mediaFooterActions);
   frame.append(close,mediaDialogContent,footer);
   mediaSide=document.createElement("aside");mediaSide.className="ui-vatra-post-media-side-001 vatra-media-side-unified-001";mediaDialog.append(frame,mediaSide);
   mediaDialog.addEventListener("click",event=>{if(event.target===mediaDialog)mediaDialog.close();});
   mediaDialog.addEventListener("close",()=>{
    const video=mediaDialogContent.querySelector("video");
    if(video){video.pause();video.removeAttribute("src");video.load();}
    clearPhotoSlide(mediaDialogContent);photoLoads.get(mediaDialogContent)?.abort();mediaDialogContent.ontouchstart=mediaDialogContent.ontouchcancel=mediaDialogContent.ontouchend=null;delete mediaDialogContent.dataset.photoMatte;
    mediaDialogContent.replaceChildren();restoreOwnerMenu?.();restoreOwnerMenu=null;restoreMediaPanel?.();restoreMediaPanel=null;mediaSide.replaceChildren();mediaFooterDelete.hidden=true;
   });
   document.body.append(mediaDialog);
  }
  const element=document.createElement(kind==="video"?"video":"img");
  element.className=kind==="video"?"ui-vatra-post-expanded-video-001":"ui-vatra-post-expanded-image-001";
  if(kind==="video"){element.controls=true;element.autoplay=true;element.playsInline=true;}
  else element.alt=tr("Фото публікації","Post photo");
  const finishSlide=beginPhotoSlide(mediaDialogContent,mediaDialogContent.querySelector("img:not(.vatra-photo-slide-outgoing-001)"),kind==="image"?direction:0);
  const ghost=mediaDialogContent.querySelector(".vatra-photo-slide-outgoing-001");
  element.src=url;mediaDialogContent.replaceChildren(element,...(ghost?[ghost]:[]));
  if(kind==="image"){const path=sourcePath||post?.media_path;watchPhotoViewer(mediaDialog,mediaDialogContent,element,path||url,finishSlide,path&&client?async()=>{const {data,error}=await client.storage.from("post-images").download(path);if(error)throw error;return data;}:null);}
  else{delete mediaDialogContent.dataset.photoMatte;}
  restoreOwnerMenu?.();restoreOwnerMenu=null;restoreMediaPanel?.();restoreMediaPanel=null;mediaSide.replaceChildren();
  const postCard=container?.closest(".feed-post-card")||container?.querySelector(".feed-post-card");
  const head=container?.querySelector(".feed-post-header")||postCard?.querySelector(".feed-post-header");
  const identity=head?.querySelector(".feed-post-author"),avatar=head?.querySelector(".feed-post-avatar");
  const postId=container?.dataset.postId||postCard?.dataset.postId;
  const postKind=container?.dataset.postKind||postCard?.dataset.postKind;
  const clubFromPage=location.pathname.match(/(?:^|\/)club([1-9][0-9]*)(?:\/|$)/)?.[1];
  const clubFromLink=(container?.querySelector('a[href*="club"]')?.getAttribute("href")||
   postCard?.querySelector('a[href*="club"]')?.getAttribute("href")||"").match(/(?:^|\/)club([1-9][0-9]*)(?:[?\/]|$)/)?.[1];
  const clubId=container?.dataset.clubId||postCard?.dataset.clubId||clubFromPage||clubFromLink;
  const groupPost=postKind==="group"||!!clubFromPage;
  const validClub=/^[1-9][0-9]*$/.test(String(clubId||""));
  const base=location.pathname.startsWith("/VATRA/")?new URL("/VATRA/",location.origin):new URL("/",location.origin);
  const validPost=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(postId||""));
  mediaFooterDelete.onclick=null;
  mediaFooterDownload.hidden=kind!=="image";
  mediaFooterOpenPost.hidden=!validPost||(groupPost&&!validClub);
  if(validPost&&(!groupPost||validClub)){
   const profileOwner=container?.dataset.vatraMediaOwnerId||postCard?.dataset.vatraMediaOwnerId;
   const inProfile=document.body.classList.contains("profile-page")&&/^[1-9][0-9]*$/.test(String(profileOwner||""));
   const path=groupPost?"club"+clubId+"?post="+encodeURIComponent(postId):
    (inProfile?"id"+profileOwner:"feed")+"?post="+encodeURIComponent(postId);
   mediaFooterOpenPost.dataset.href=new URL(path,base).href;
  }
  const ownerId=container?.dataset.vatraMediaOwnerId||postCard?.dataset.vatraMediaOwnerId;
  const viewerId=container?.dataset.vatraViewerId||postCard?.dataset.vatraViewerId;
  const authorName=String(head?.querySelector(".feed-post-name")?.textContent||"").trim();
  const label=kind==="video"?tr("Відео з публікації","Video from a post"):tr("Фото з публікації","Photo from a post");
  mediaCaption.textContent=ownerId&&viewerId&&ownerId===viewerId?label:
   authorName?label+" "+(groupPost?authorName:authorName.split(/\s+/)[0]):label;
  if(identity){const info=document.createElement("header");info.className="ui-vatra-post-media-author-001 vatra-media-author-unified-001";if(avatar)info.append(avatar.cloneNode(true));info.append(identity.cloneNode(true));mediaSide.append(info);}
  if(post){
   const description=document.createElement("div");description.className="vatra-media-description-001";
   const copy=document.createElement("p");copy.className="vatra-media-description-copy-001";copy.textContent=String(post.body||"");copy.hidden=!copy.textContent;
   description.append(copy);
   const mine=!!client&&!groupPost&&ownerId&&viewerId&&ownerId===viewerId;
   if(mine){
    const edit=document.createElement("button");edit.type="button";edit.className="vatra-media-description-edit-001";edit.textContent=tr("Редагувати опис","Edit description");
    const form=document.createElement("form");form.className="vatra-media-description-form-001";form.hidden=true;
    const input=document.createElement("textarea");input.className="vatra-media-description-input-001";input.maxLength=2000;input.rows=3;input.setAttribute("aria-label",edit.textContent);
    const save=document.createElement("button");save.type="submit";save.className="vatra-media-description-save-001";save.textContent=tr("Зберегти","Save");
    const cancel=document.createElement("button");cancel.type="button";cancel.className="vatra-media-description-cancel-001";cancel.textContent=tr("Скасувати","Cancel");
    form.append(input,save,cancel);description.append(edit,form);
    edit.onclick=()=>{input.value=String(post.body||"");form.hidden=false;copy.hidden=true;edit.hidden=true;input.focus();};
    const finish=()=>{form.hidden=true;edit.hidden=false;copy.hidden=!copy.textContent;};
    cancel.onclick=finish;
    form.onsubmit=async event=>{event.preventDefault();if(save.disabled)return;save.disabled=cancel.disabled=true;
     try{const body=input.value.trim();const {data,error}=await client.from("feed_posts").update({body}).eq("id",post.id).eq("author_vatra_id",ownerId).select("id,body").maybeSingle();if(error||!data)throw Error("Not saved");post.body=data.body;copy.textContent=data.body;
     const visible=postCard&&!postCard.classList.contains("ui-vatra-photo-source-context-001")?postCard:[...document.querySelectorAll(".feed-post-card")].find(card=>card!==container&&card.dataset.postId===String(post.id));
     if(visible){let paragraph=visible.querySelector(".feed-post-body");if(data.body){if(!paragraph){paragraph=document.createElement("p");paragraph.className="feed-post-body vatra-feed-post-body-001";visible.querySelector(".feed-post-header")?.after(paragraph);}delete paragraph.dataset.vatraCollapsed;paragraph.textContent=data.body;linkifyHashtags(paragraph);collapsibleBody(paragraph);}else paragraph?.remove();}
     finish();window.dispatchEvent(new Event("vatra:profile-media-changed"));}
     catch(_){window.VATRA_TOAST?.show?.(tr("Не вдалося зберегти.","Could not save."),"error");}
     finally{save.disabled=cancel.disabled=false;}
    };
   }
   if(copy.textContent||mine)mediaSide.append(description);
  }
  restoreMediaPanel=container?window.VATRA_POST_INTERACTIONS?.attachMediaPanel?.(container,mediaSide):null;
  mediaSide.hidden=!restoreMediaPanel;
  mediaFooterShare.hidden=!restoreMediaPanel;
  mediaFooterActions.querySelector(".vatra-post-media-set-avatar-001")?.remove();
  if(fromPhotos&&kind==="image"&&client&&ownerId&&ownerId===viewerId){
   const more=document.createElement("details");more.className="vatra-post-media-set-avatar-001";
   const trigger=document.createElement("summary");trigger.className="vatra-post-media-set-avatar-trigger-001";trigger.textContent=tr("Більше","More");
   const action=document.createElement("button");action.type="button";action.className="vatra-post-media-set-avatar-action-001";action.textContent=tr("Зробити фотографією профілю","Make profile photo");
   action.onclick=async()=>{try{const response=await fetch(url,{credentials:"omit"});if(!response.ok)throw Error("Unavailable");const blob=await response.blob();mediaDialog.close();await window.VATRA_USE_PHOTO_AS_AVATAR?.(blob);}catch(_){window.VATRA_TOAST?.show?.(tr("Не вдалося відкрити фото.","Could not open photo."),"error");}};
   more.append(trigger,action);mediaFooterActions.append(more);
  }
  const sourceMenu=container?.querySelector(".feed-post-header > details[data-vatra-post-owner-menu]");
  if(sourceMenu){
   const marker=document.createElement("span");
   marker.className="ui-vatra-post-media-menu-origin-001";
   marker.hidden=true;
   sourceMenu.before(marker);
   const summary=sourceMenu.querySelector("summary");
   const moreLabel=document.createElement("span");
   moreLabel.className="vatra-post-media-more-label-001";
   moreLabel.textContent=tr("Більше","More");
   summary.prepend(moreLabel);
   summary.classList.add("ui-vatra-post-media-more-toggle-001");
   sourceMenu.open=false;
   mediaFooterActions.append(sourceMenu);
   mediaFooterDelete.hidden=!sourceMenu.querySelector(".vatra-post-owner-delete-001");
   restoreOwnerMenu=()=>{
    sourceMenu.open=false;
    summary.classList.remove("ui-vatra-post-media-more-toggle-001");
    moreLabel.remove();
    if(marker.isConnected)marker.replaceWith(sourceMenu);
    else sourceMenu.remove();
   };
  }else mediaFooterDelete.hidden=true;
  if(!mediaDialog.open)mediaDialog.showModal();
 }

 function loadImageSource(image,src){
  return new Promise((resolve,reject)=>{
   let done=false;
   const finish=success=>{
    if(done)return;done=true;
    clearTimeout(timer);
    image.removeEventListener("load",loaded);
    image.removeEventListener("error",failed);
    if(success)resolve();else reject(Error("Image unavailable"));
   };
   const loaded=()=>finish(image.naturalWidth>0);
   const failed=()=>finish(false);
   const timer=setTimeout(failed,15000);
   image.addEventListener("load",loaded,{once:true});
   image.addEventListener("error",failed,{once:true});
   image.src=src;
   if(image.complete)loaded();
  });
 }
 const pendingMedia=new Map();
 function mediaConnectionConstrained(){
  const connection=typeof navigator==="undefined"?null:navigator.connection;
  return connection?.saveData===true||["slow-2g","2g","3g"].includes(connection?.effectiveType);
 }
 let mediaIntersection=null,mediaMountObserver=null;
 let mediaScanQueued=false;
 function removeMediaTarget(slot){
  const entry=pendingMedia.get(slot);
  if(!entry)return;
  if(entry.observed)mediaIntersection?.unobserve(slot);
  clearTimeout(entry.timer);
  pendingMedia.delete(slot);
  if(!pendingMedia.size){
   mediaIntersection?.disconnect();mediaIntersection=null;
   mediaMountObserver?.disconnect();mediaMountObserver=null;
  }
 }
 function startMediaTarget(slot){
  const entry=pendingMedia.get(slot);
  if(!entry)return;
  removeMediaTarget(slot);
  if(slot.isConnected)void entry.load();
 }
 function scanMediaTargets(){
  for(const [slot,entry] of pendingMedia){
   if(!slot.isConnected){
    if(entry.observed)removeMediaTarget(slot);
    else if(entry.timer===null)entry.timer=setTimeout(()=>removeMediaTarget(slot),15000);
    continue;
   }
   if(entry.observed)continue;
   clearTimeout(entry.timer);
   if((entry.priority<=2&&!mediaConnectionConstrained())||typeof IntersectionObserver!=="function"){
    startMediaTarget(slot);continue;
   }
   if(!mediaIntersection)mediaIntersection=new IntersectionObserver(entries=>{
    for(const item of entries)
     if(item.isIntersecting||item.intersectionRatio>0)startMediaTarget(item.target);
   },{rootMargin:mediaConnectionConstrained()?"0px":"440px 0px",threshold:0});
   entry.observed=true;mediaIntersection.observe(slot);
  }
 }
 function watchMediaTarget(slot,priority,load){
  if(pendingMedia.has(slot))return;
  const entry={priority,load,observed:false,timer:null};
  pendingMedia.set(slot,entry);
  if(mediaScanQueued)return;
  mediaScanQueued=true;
  queueMicrotask(()=>{
   mediaScanQueued=false;
   scanMediaTargets();
   if(!pendingMedia.size)return;
   if(!mediaMountObserver&&typeof MutationObserver==="function"){
    mediaMountObserver=new MutationObserver(records=>{
     if(records.some(record=>record.removedNodes.length)||
        [...pendingMedia.values()].some(value=>!value.observed))scanMediaTargets();
    });
    mediaMountObserver.observe(document.documentElement,{childList:true,subtree:true});
   }
  });
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
   tile.className="vatra-post-gallery-tile vatra-post-gallery-tile-"+index;
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
    const extra=document.createElement("span");extra.className="vatra-post-gallery-extra-001";
    extra.textContent="+"+(media.length-5);tile.append(extra);
   }
   tile.addEventListener("click",()=>{
    if(tile.getAttribute("aria-busy")==="true")return;
    if(tile.classList.contains("is-gallery-unavailable")){void loadTiles(true);return;}
    if(item.media_kind==="image"&&isFeedPhotoCard(container))void openFeedPhoto(client,container,item.media_path);
    else void openGallery(index);
   });
   slot.append(tile);
   return {item,tile,index};
  });
  container.append(slot);
  const priority=++firstImages;
  let begun=false;
  async function loadTiles(retry=false){
   if((begun&&!retry)||!slot.isConnected)return;
   begun=true;
   const previewPath=item=>item.media_kind==="image"&&
    name(item.preview_path,"image",id)&&item.preview_path.endsWith(".webp")?
    item.preview_path:null;
   const activeTiles=retry?tiles.filter(({tile})=>tile.classList.contains("is-gallery-unavailable")):tiles;
   const imageTiles=activeTiles.filter(({item})=>item.media_kind==="image").map(({item})=>({
    media_kind:"image",media_path:previewPath(item)||item.media_path
   }));
   if(!await preSignVisible(client,imageTiles)||!slot.isConnected)return;
   await Promise.allSettled(activeTiles.map(async({item,tile,index})=>{
    tile.classList.remove("is-gallery-unavailable");
    tile.querySelector(".vatra-gallery-unavailable-001")?.remove();
    tile.setAttribute("aria-busy","true");
    try{
     if(item.media_kind==="video"){
      tile.classList.add("is-gallery-ready");
      tile.querySelector('[class^="ui-vatra-post-gallery-skeleton-"]')?.remove();
      return;
     }
     const preview=previewPath(item);
     let element=null;
     for(const path of preview?[preview,item.media_path]:[item.media_path]){
      try{
       const src=await signed(client,"image",path);
       if(!tile.isConnected)return;
       const candidate=document.createElement("img");
       candidate.className="ui-vatra-post-gallery-media-"+index;
       candidate.alt=tr("Фото публікації","Post photo");
       candidate.loading="eager";
       candidate.decoding="async";
       if(priority===1&&index===0&&!mediaConnectionConstrained())candidate.fetchPriority="high";
       candidate.classList.add("is-gallery-pending");
       tile.prepend(candidate);
       try{await loadImageSource(candidate,src);}
       catch(error){candidate.remove();await forgetFailedSignedURL(client,"image",path,src);throw error;}
       candidate.classList.remove("is-gallery-pending");
       element=candidate;break;
      }catch(_){}
     }
     if(!element)throw Error("Image unavailable");
     if(!tile.isConnected)return;
     if(index===0){
      const width=element.naturalWidth,height=element.naturalHeight;
      if(width&&height)slot.dataset.orientation=width>height*1.25?"wide":"portrait";
     }
     tile.classList.remove("is-gallery-unavailable");
     tile.classList.add("is-gallery-ready");
     tile.querySelector('[class^="ui-vatra-post-gallery-skeleton-"]')?.remove();
    }catch(_){
     if(!tile.isConnected)return;
     tile.classList.add("is-gallery-unavailable");
     tile.querySelector('[class^="ui-vatra-post-gallery-skeleton-"]')?.remove();
     const notice=document.createElement("span");
     notice.className="vatra-gallery-unavailable-001";
     notice.textContent=tr("Медіафайл тимчасово недоступний.","Media temporarily unavailable.");
     tile.append(notice);
    }finally{tile.removeAttribute("aria-busy");}
   }));
  }
  watchMediaTarget(slot,priority,loadTiles);
  async function openGallery(startIndex){
   let index=startIndex,active=true;
   const current=media[index];
   try{
    const initial=await signed(client,current.media_kind,current.media_path);
    if(!slot.isConnected)return;
    feedPhotoSession?.abort();feedPhotoSession=null;photoSourceTicket++;restoreMediaPanel?.();restoreMediaPanel=null;photoSourceCleanup?.();photoSourceCleanup=null;
    openFullMedia(initial,current.media_kind,container,post,client,false,0,current.media_path);
   }catch(_){return;}
   const controller=new AbortController();
   mediaDialog.addEventListener("close",()=>{active=false;controller.abort();},{once:true});
   const makeNav=(dir,label)=>{
    const button=document.createElement("button");button.type="button";
    button.className="vatra-post-gallery-nav-"+(dir<0?"prev":"next");
    button.setAttribute("aria-label",label);
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("class","ui-vatra-post-gallery-nav-icon-"+(dir<0?"prev":"next"));
    svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("width","22");svg.setAttribute("height","22");
    svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");
    svg.setAttribute("stroke-width","2");svg.setAttribute("stroke-linecap","round");
    const path=document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("class","ui-vatra-post-gallery-nav-path-"+(dir<0?"prev":"next"));
    path.setAttribute("d",dir<0?"m15 18-6-6 6-6":"m9 18 6-6-6-6");
    svg.append(path);button.append(svg);return button;
   };
   let renderTicket=0;
   const render=async(direction=0)=>{
    const token=++renderTicket,item=media[index];
    try{
     const url=await signed(client,item.media_kind,item.media_path);
     if(!active||token!==renderTicket||!mediaDialog.open)return;
     const element=document.createElement(item.media_kind==="video"?"video":"img");
     element.className=item.media_kind==="video"?"ui-vatra-post-expanded-video-001":"ui-vatra-post-expanded-image-001";
     if(item.media_kind==="video"){element.controls=true;element.playsInline=true;}
     else element.alt=tr("Фото публікації","Post photo");
     if(item.media_kind==="image"){await loadImageSource(element,url);if(!active||token!==renderTicket||!mediaDialog.open)return;}
     else element.src=url;
     const prev=makeNav(-1,tr("Попередній файл","Previous media"));
     const next=makeNav(1,tr("Наступний файл","Next media"));
     const counter=document.createElement("span");
     counter.className="vatra-post-gallery-counter-001";
     counter.textContent=(index+1)+" / "+media.length;
     prev.disabled=index===0;next.disabled=index>=media.length-1;
     prev.hidden=next.hidden=media.length<2;
     counter.hidden=media.length<2;
     prev.addEventListener("click",()=>{if(index>0){index--;void render(-1);}});
     next.addEventListener("click",()=>{if(index<media.length-1){index++;void render(1);}});
     const currentVideo=mediaDialogContent.querySelector("video");
     currentVideo?.pause();
     const finishSlide=beginPhotoSlide(mediaDialogContent,mediaDialogContent.querySelector("img:not(.vatra-photo-slide-outgoing-001)"),item.media_kind==="image"?direction:0);
     const ghost=mediaDialogContent.querySelector(".vatra-photo-slide-outgoing-001");
     mediaDialogContent.replaceChildren(element,...(ghost?[ghost]:[]),prev,next,counter);
     if(item.media_kind==="image")watchPhotoViewer(mediaDialog,mediaDialogContent,element,item.media_path,finishSlide,async()=>{const {data,error}=await client.storage.from("post-images").download(item.media_path);if(error)throw error;return data;});
     else{delete mediaDialogContent.dataset.photoMatte;}
    }catch(_){}
   };
   mediaDialog.addEventListener("keydown",event=>{
    if(event.target?.closest?.("input,textarea,select,video,[contenteditable]"))return;
    if(event.key==="ArrowLeft"&&index>0){event.preventDefault();index--;void render(-1);}
    if(event.key==="ArrowRight"&&index<media.length-1){event.preventDefault();index++;void render(1);}
   },{signal:controller.signal});
   void render();
  }
  return true;
 }
 const feedPhotoCards=new WeakMap();
 let feedPhotoSession=null;
 function isFeedPhotoCard(card){
  const root=card.closest("#feed-posts,#profile-posts");
  return !!root&&card.matches(".feed-post-card");
 }
 function registerFeedPhotos(client,post,card){
  if(!card.matches(".feed-post-card"))return;
  const raw=Array.isArray(post?.media_items)&&post.media_items.length?post.media_items.slice(0,GALLERY_LIMIT):
   [{media_kind:post?.media_kind,media_path:post?.media_path}];
  const items=raw.filter(item=>item?.media_kind==="image"&&name(item.media_path,"image",post.author_vatra_id));
  feedPhotoCards.set(card,{client,post,items});
 }
 async function openFeedPhoto(client,card,path){
  if(!isFeedPhotoCard(card))return;
  const record=feedPhotoCards.get(card);
  if(record?.client!==client)return;
  const entries=record.items.map(item=>({container:card,post:record.post,item}));
  let index=entries.findIndex(entry=>entry.container===card&&entry.item.media_path===path);
  if(index<0)return;
  feedPhotoSession?.abort();
  photoSourceTicket++;restoreMediaPanel?.();restoreMediaPanel=null;photoSourceCleanup?.();photoSourceCleanup=null;
  const controller=new AbortController();feedPhotoSession=controller;
  let busy=false;
  const current=()=>!controller.signal.aborted;
  const render=async(next,direction=0)=>{
   if(busy||!current()||!entries[next]?.container.isConnected)return;
   busy=true;
   const entry=entries[next];
   try{
    const url=await signed(client,"image",entry.item.media_path);
    if(!current()||!entry.container.isConnected)return;
    if(direction&&!mediaDialog?.open)return;
    const restoreNavigationFocus=direction&&mediaDialogContent.contains(document.activeElement);
    openFullMedia(url,"image",entry.container,entry.post,client,false,direction,entry.item.media_path);
    index=next;
    if(entries.length>1)photoNavigation(mediaDialogContent,index,entries.length,step);
    if(restoreNavigationFocus||direction&&!mediaDialog.contains(document.activeElement)){
     const preferred=mediaDialogContent.querySelector(direction>0?".vatra-post-gallery-nav-next:not(:disabled)":".vatra-post-gallery-nav-prev:not(:disabled)");
     (preferred||mediaDialogContent.querySelector(".vatra-post-gallery-nav-prev:not(:disabled),.vatra-post-gallery-nav-next:not(:disabled)")||mediaDialog.querySelector(".vatra-post-media-close-001"))?.focus({preventScroll:true});
    }
   }catch(_){
    window.VATRA_TOAST?.show?.(tr("Не вдалося відкрити фото.","Could not open photo."),"error");
   }finally{busy=false;}
  };
  const step=dir=>{
   let next=index+dir;
   while(entries[next]&&!entries[next].container.isConnected)next+=dir;
   if(entries[next])void render(next,dir);
  };
  await render(index);
  if(!current()||!mediaDialog?.open){controller.abort();return;}
  mediaDialog.addEventListener("close",()=>controller.abort(),{once:true,signal:controller.signal});
  mediaDialog.addEventListener("keydown",event=>{
   if(event.target?.closest?.("input,textarea,select,[contenteditable]"))return;
   if(entries.length>1&&(event.key==="ArrowLeft"||event.key==="ArrowRight")){event.preventDefault();step(event.key==="ArrowLeft"?-1:1);}
  },{signal:controller.signal});
 }
 async function mount(client,post,container){
  if(!container)return;
  registerFeedPhotos(client,post,container);
  if(post?.author_vatra_id!=null)container.dataset.vatraMediaOwnerId=String(post.author_vatra_id);
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
  if(kind==="video"){


   const play=document.createElement("button");
   play.className="vatra-feed-post-video-play-001";
   play.type="button";
   const symbol=document.createElementNS("http://www.w3.org/2000/svg","svg");
   symbol.setAttribute("class","ui-feed-post-video-play-icon-001");
   symbol.setAttribute("viewBox","0 0 24 24");
   symbol.setAttribute("fill","currentColor");
   symbol.setAttribute("aria-hidden","true");
   const shape=document.createElementNS("http://www.w3.org/2000/svg","path");
   shape.setAttribute("class","ui-feed-post-video-play-shape-001");
   shape.setAttribute("d","M8 5v14l11-7Z");
   symbol.append(shape);
   const label=document.createElement("span");
   label.className="vatra-feed-post-video-play-label-001";
   label.textContent=tr("Відтворити відео","Play video");
   play.append(symbol,label);
   let pending=false;
   const retry=()=>{
    if(!slot.isConnected)return;
    pending=false;play.disabled=false;
    label.textContent=tr("Повторити завантаження відео","Retry loading video");
    slot.replaceChildren(play);
   };
   play.addEventListener("click",async()=>{
    if(pending)return;
    pending=true;play.disabled=true;
    label.textContent=tr("Завантаження відео…","Loading video…");
    try{
     const src=await signed(client,"video",path);
     if(!slot.isConnected)return;
     const video=document.createElement("video");
     video.className="feed-post-media-video ui-feed-post-media-video-001";
     video.controls=true;video.preload="metadata";video.playsInline=true;
     const expand=document.createElement("button");expand.type="button";
     expand.className="vatra-feed-post-video-expand-001";
     expand.textContent=tr("На весь екран","Fullscreen");
     const recover=async()=>{
      if(!slot.isConnected||video.parentNode!==slot||video.error?.code===1)return;
      await forgetFailedSignedURL(client,"video",path,src);
      if(!slot.isConnected||video.parentNode!==slot)return;
      video.pause();retry();video.removeAttribute("src");video.load();
     };
     video.addEventListener("error",()=>void recover(),{once:true});
     expand.addEventListener("click",async()=>{
      if(expand.disabled)return;
      expand.disabled=true;
      try{
       const current=await signed(client,"video",path);
       if(expand.isConnected){video.pause();openFullMedia(current,"video",container,post,client);}
      }catch(_){await recover();}
      finally{expand.disabled=false;}
     });
     slot.replaceChildren(video,expand);
     video.src=src;
     void video.play().catch(()=>{});
    }catch(_){retry();}
   });
   slot.classList.remove("is-loading-media");
   slot.classList.add("is-ready-media");
   slot.replaceChildren(play);
   return;
  }
  const priority=++firstImages;
  let begun=false;
  async function load(){
   if(begun)return;begun=true;
   try{
    if(!await preSignVisible(client,[{media_kind:"image",media_path:path}])||!slot.isConnected)return;
    const src=await signed(client,"image",path);
    if(!slot.isConnected)return;

    const image=new Image();
    image.className="feed-post-media-image ui-feed-post-media-image-001";
    image.alt=tr("Фото до публікації","Post photo");
    image.decoding="async";image.loading="eager";
    if(priority<=2&&!mediaConnectionConstrained())image.fetchPriority="high";
    try{await loadImageSource(image,src);}
    catch(error){await forgetFailedSignedURL(client,"image",path,src);throw error;}
    if(!slot.isConnected)return;
    const frame=document.createElement("button");
    frame.className="vatra-feed-post-media-open-001";frame.type="button";
    frame.setAttribute("aria-label",tr("Відкрити фото на весь екран","View photo fullscreen"));
    frame.addEventListener("click",async()=>{
     try{
      const current=await signed(client,"image",path);
      if(frame.isConnected){if(isFeedPhotoCard(container))await openFeedPhoto(client,container,path);else openFullMedia(current,"image",container,post,client);}
     }catch(_){failure(tr("Медіафайл тимчасово недоступний.","Media temporarily unavailable."));}
    });
    frame.append(image);
    slot.replaceChildren(frame);slot.classList.remove("is-loading-media");
    slot.classList.add("is-ready-media");
   }catch(_){failure(tr("Медіафайл тимчасово недоступний.","Media temporarily unavailable."));}
  }
  function failure(message){
   if(!slot.isConnected)return;
   slot.classList.remove("is-loading-media");
   const notice=document.createElement("p");
   notice.className="vatra-feed-post-media-error-001";notice.textContent=message;
   slot.replaceChildren(notice);
   const retry=document.createElement("button");retry.type="button";retry.className="vatra-feed-post-media-open-001";
   retry.textContent=tr("Повторити","Retry");
   retry.addEventListener("click",()=>{begun=false;slot.classList.add("is-loading-media");slot.replaceChildren(placeholder);void load();});
   slot.append(retry);
  }

  watchMediaTarget(slot,priority,load);
 }
 let photoSourceCleanup=null,photoSourceTicket=0;
 function photoMenuIcon(kind){
  const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
  svg.setAttribute("class","vatra-photo-menu-icon-001");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.85");svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");svg.setAttribute("aria-hidden","true");
  const paths={dots:"M5 12h.01M12 12h.01M19 12h.01",download:"M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",post:"M5 3h14v18H5zM8 8h8M8 12h8M8 16h5",avatar:"M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-3a8 8 0 0 1 16 0v3",select:"M8 12l3 3 5-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",trash:"M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7",album:"M3 7h7l2 2h9v11H3z",share:"M13 5l7 7-7 7v-4.3c-5 0-8.4 1.7-10 4.3.3-7 3.4-10.8 10-10.8V5Z",move:"M3 7h7l2 2h9v11H3zM8 14h8m-3-3 3 3-3 3",archive:"M3 5h18v4H3zM5 9v12h14V9m-9 4h4",pin:"m16 3 5 5-4 1-3 5v3l-2 2-7-7 2-2h3l5-3 1-4ZM8 16l-5 5",restore:"M3 12a9 9 0 1 1 3 7M3 5v7h7"};
  const path=document.createElementNS(ns,"path");path.setAttribute("d",paths[kind]||paths.album);if(kind==="dots")path.setAttribute("stroke-width","4");svg.append(path);return svg;
 }
 function photoNavigation(stage,index,total,step,hasMore=false){
  const buttons=[-1,1].map(dir=>{const button=document.createElement("button");button.type="button";button.className="vatra-post-gallery-nav-"+(dir<0?"prev":"next");button.setAttribute("aria-label",dir<0?tr("Попередній файл","Previous media"):tr("Наступний файл","Next media"));
   const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");
   const path=document.createElementNS("http://www.w3.org/2000/svg","path");path.setAttribute("d",dir<0?"m15 18-6-6 6-6":"m9 18 6-6-6-6");svg.append(path);button.append(svg);button.disabled=dir<0?index===0:index>=total-1&&!hasMore;button.hidden=total<2&&!hasMore;button.onclick=()=>step(dir);return button;});
  const count=document.createElement("span");count.className="vatra-post-gallery-counter-001";count.textContent=(index+1)+" / "+total+(hasMore?"+":"");count.hidden=total<2&&!hasMore;stage.append(...buttons,count);
  let start=null;
  stage.ontouchstart=event=>{start=event.touches.length===1&&!event.target?.closest?.("button,video")?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;};
  stage.ontouchcancel=()=>{start=null;};
  stage.ontouchend=event=>{const p=start;start=null;if(!p||event.changedTouches.length!==1)return;const touch=event.changedTouches[0],dx=touch.clientX-p.x,dy=touch.clientY-p.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)step(dx<0?1:-1);};
 }
 async function openPostPhoto(client,post,item,settings={}){
  if(!client||!post||item?.media_kind!=="image"||
   !name(item?.media_path,"image",post.author_vatra_id))return;
  feedPhotoSession?.abort();feedPhotoSession=null;
  const ticket=++photoSourceTicket;let src;
  try{src=await signed(client,"image",item.media_path);}catch(_){return;}
  if(ticket!==photoSourceTicket)return;
  const host=document.createElement("article");
  host.className="feed-post-card ui-vatra-photo-source-context-001";
  host.dataset.postId=post.id;
  host.dataset.vatraMediaOwnerId=String(post.author_vatra_id);
  host.dataset.vatraViewerId=String(settings.ownId||"");host.dataset.postKind="person";
  host.style.cssText="position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none";
  const header=document.createElement("header");
  header.className="feed-post-header ui-vatra-photo-source-header-001";
  const sourceAvatar=document.querySelector("#profile-avatar");
  const avatar=document.createElement("a");
  avatar.className="feed-post-avatar ui-vatra-photo-source-avatar-001";
  avatar.href=new URL("id"+post.author_vatra_id,new URL(".",location.href)).href;
  avatar.setAttribute("aria-label",String(document.querySelector("#profile-heading")?.textContent||"VATRA").trim());
  const avatarImage=sourceAvatar?.style.backgroundImage||"";
  if(sourceAvatar?.classList.contains("has-photo")&&avatarImage){
   avatar.style.backgroundImage=avatarImage;avatar.classList.add("has-photo");
  }
  const author=document.createElement("div");
  author.className="feed-post-author ui-vatra-photo-source-author-001";
  const display=document.createElement("span");
  display.className="feed-post-name vatra-photo-source-name-001";
  display.textContent=String(document.querySelector("#profile-heading")?.textContent||"").trim()||"VATRA";
  author.append(display);
  const verifyAuthor=()=>window.VATRA_VERIFIED?.attach?.(client,display,post.author_vatra_id);
  const postedAt=Date.parse(post.created_at||"");
  if(Number.isFinite(postedAt)){
   const when=document.createElement("time");when.className="feed-post-date ui-vatra-photo-source-date-001";
   when.dateTime=new Date(postedAt).toISOString();
   when.textContent=window.VATRA_PRESENCE?.relative?.(post.created_at,document.documentElement.lang==="en")||
    new Intl.DateTimeFormat(document.documentElement.lang==="en"?"en-US":"uk-UA",
     {dateStyle:"medium",timeStyle:"short"}).format(postedAt);
   author.append(when);
  }
  header.append(avatar,author);host.append(header);
  const priorDialogs=new Set(document.querySelectorAll("dialog.vatra-post-share-dialog"));
  document.body.append(host);
  window.VATRA_POST_INTERACTIONS?.mount?.(client,{...post,kind:"person"},host,{
   ownId:settings.ownId,userId:settings.userId
  });
  const createdDialogs=[...document.querySelectorAll("dialog.vatra-post-share-dialog")]
   .filter(dialog=>!priorDialogs.has(dialog));
  try{
   try{await verifyAuthor();}catch(_){}
   if(ticket!==photoSourceTicket){host.remove();createdDialogs.forEach(dialog=>dialog.remove());return;}
   restoreMediaPanel?.();restoreMediaPanel=null;photoSourceCleanup?.();
   openFullMedia(src,"image",host,post,client,true,settings.direction||0,item.media_path);
   if(mediaDialog?.open){
    const controller=new AbortController();
    photoSourceCleanup=()=>{controller.abort();host.remove();createdDialogs.forEach(dialog=>dialog.remove());};
    mediaDialog.addEventListener("close",()=>{photoSourceTicket++;restoreMediaPanel?.();restoreMediaPanel=null;photoSourceCleanup?.();photoSourceCleanup=null;},{once:true,signal:controller.signal});
    const items=settings.items||[{post,item}],index=items.findIndex(entry=>entry.post.id===post.id&&entry.item.media_path===item.media_path);
    let stepping=false;
    const step=async dir=>{
     if(stepping||ticket!==photoSourceTicket||!mediaDialog.open)return;
     stepping=true;
     try{
      let entry=items[index+dir];
      if(!entry&&dir>0&&settings.hasMore?.()){await settings.loadMore?.();if(ticket!==photoSourceTicket||!mediaDialog.open)return;entry=items[index+dir];}
      if(entry)await openPostPhoto(client,entry.post,entry.item,{...settings,items,direction:dir});
      else if(ticket===photoSourceTicket&&mediaDialog.open){
       mediaDialogContent.querySelectorAll(".vatra-post-gallery-nav-prev,.vatra-post-gallery-nav-next,.vatra-post-gallery-counter-001").forEach(el=>el.remove());
       photoNavigation(mediaDialogContent,Math.max(0,index),items.length,step,!!settings.hasMore?.());
      }
     }finally{stepping=false;}
    };
    photoNavigation(mediaDialogContent,Math.max(0,index),items.length,step,!!settings.hasMore?.());
    if(!mediaDialog.contains(document.activeElement))mediaDialog.querySelector(".vatra-post-media-close-001")?.focus({preventScroll:true});
    mediaDialog.addEventListener("keydown",event=>{if(event.target?.closest?.("textarea,input,[contenteditable]"))return;if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();step(event.key==="ArrowLeft"?-1:1);}},{signal:controller.signal});
    if(String(settings.ownId)===String(post.author_vatra_id)&&settings.removePhoto){mediaFooterDelete.hidden=false;mediaFooterDelete.onclick=()=>settings.removePhoto(post,item);}
   }else{host.remove();createdDialogs.forEach(dialog=>dialog.remove());}
  }catch(_){host.remove();createdDialogs.forEach(dialog=>dialog.remove());}
 }
 window.addEventListener("resize",()=>{if(mediaDialog?.open){const image=mediaDialogContent.querySelector("img:not(.vatra-photo-slide-outgoing-001)");if(image)fitPhotoViewer(mediaDialog,mediaDialogContent,image);}}, {passive:true});
 window.VATRA_POST_MEDIA={photoMatte,fitPhotoViewer,beginPhotoSlide,clearPhotoSlide,watchPhotoViewer,bindPicker,bindGalleryPicker,validateGallery,upload,uploadGallery,removeGallery,uploadStory,remove,mount,clearStory,openPostPhoto,photoNavigation,photoMenuIcon,renderStory,linkifyHashtags,collapsibleBody,signed};
})();
