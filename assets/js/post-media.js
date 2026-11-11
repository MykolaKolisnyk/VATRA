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
 function bindPicker(ids){
  const input=document.querySelector(ids.input),choose=document.querySelector(ids.choose);
  const clear=document.querySelector(ids.clear),preview=document.querySelector(ids.preview);
  const showError=typeof ids.onError==="function"?ids.onError:()=>{};
  if(!input||!choose||!clear||!preview)throw Error("VATRA media picker markup is incomplete");
  let selected=null,blob=null;
  const reset=()=>{
   selected=null;input.value="";
   if(blob){URL.revokeObjectURL(blob);blob=null;}
   preview.replaceChildren();preview.hidden=true;clear.hidden=true;
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
   preview.append(media,caption);preview.hidden=false;clear.hidden=false;
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
   if(kind==="image"){el.alt=tr("Фото до публікації","Post photo");el.loading="lazy";}
   else{el.controls=true;el.preload="metadata";el.playsInline=true;}
   el.src=url.href;slot.replaceChildren(el);
  }catch(_){
   if(slot.isConnected){
    const notice=document.createElement("p");notice.className="vt-feed-post-media-error-001";
    notice.textContent=tr("Медіафайл тимчасово недоступний.","Media temporarily unavailable.");
    slot.replaceChildren(notice);
   }
  }
 }
 window.VATRA_POST_MEDIA={bindPicker,upload,remove,mount};
})();
