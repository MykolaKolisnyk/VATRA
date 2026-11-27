(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const BUCKET="album-photos",PHOTO_LIMIT=8,MAX_SIZE=31457280;
 const validId=id=>/^[1-9][0-9]{0,18}$/.test(String(id||""));
 const validUUID=id=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(id||""));
 const lang=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
 const t=(uk,en)=>{const translated=window.VATRA_LANGUAGE?.translate?.(uk);return translated&&translated!==uk?translated:lang()==="en"?en:uk;};
 const make=(tag,cls,text)=>{
  const el=document.createElement(tag);el.className=cls;
  if(text!==undefined)el.textContent=String(text);return el;
 };
 const button=(cls,text,fn)=>{
  const el=make("button",cls,text);el.type="button";
  if(fn)el.addEventListener("click",fn);return el;
 };
 const notify=(text,kind="error")=>{
  if(window.VATRA_TOAST?.show)window.VATRA_TOAST.show(text,kind);
  else (window.VATRA_PENDING_TOASTS??=[]).push([text,kind]);
 };
 const svg=(cls,type)=>{
  const el=document.createElementNS("http://www.w3.org/2000/svg","svg");
  el.setAttribute("class",cls);el.setAttribute("viewBox","0 0 24 24");
  el.setAttribute("width","22");el.setAttribute("height","22");
  el.setAttribute("fill","none");el.setAttribute("stroke","currentColor");
  el.setAttribute("stroke-width",type==="edit"?"1.8":"1.85");el.setAttribute("stroke-linecap","round");
  el.setAttribute("stroke-linejoin","round");el.setAttribute("aria-hidden","true");
  const paths={
   albums:"M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 11h18",
   image:"M4 4h16v16H4zM7 16l4-5 3 3 2-2 3 4M8.5 8.5h.01",
   plus:"M12 5v14M5 12h14",back:"m15 18-6-6 6-6",
   close:"M5 5 19 19M19 5 5 19",
   comments:"M20.5 11.3c0 4.8-3.9 8.6-8.6 8.6-1.4 0-2.9-.3-4.2-1L3 20l1.6-4.5a8.5 8.5 0 1 1 15.9-4.2Z",
   heart:"M20.8 4.8a5.4 5.4 0 0 0-7.7 0L12 6l-1.1-1.2a5.4 5.4 0 0 0-7.7 7.6L12 21l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z",
   like:"M8 10.5 12.3 3c.6-1 2.1-.6 2.1.8v4.7h4.3a2.8 2.8 0 0 1 2.7 3.4l-1.6 6.7a2.8 2.8 0 0 1-2.7 2.1H8V10.5ZM3 10.5h5v10H3z",
   share:"M13 5l7 7-7 7v-4.3c-5 0-8.4 1.7-10 4.3.3-7 3.4-10.8 10-10.8V5Z",
   send:"M4 12h15m-6-6 6 6-6 6",
   smile:"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 14c2.2 3 5.8 3 8 0M9 10h.01M15 10h.01",
   upload:"M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4",
   settings:"M4 7h16M7 7v4M4 17h16M17 13v4",
   edit:"M14.5 5.5l4 4M3 21l5-1L20.5 7.5a2.83 2.83 0 0 0-4-4L4 16l-1 5Z",
   trash:"M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7",
   shield:"M12 2l8 4v6c0 5-3.3 8-8 10-4.7-2-8-5-8-10V6z"
  };
  for(const d of [paths[type]||paths.image]){
   const p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("d",d);el.append(p);
  }
  return el;
 };
 const addIcon=(el,type)=>{
  el.prepend(svg("ui-vatra-album-symbol-001",type));return el;
 };
 function mount({client,targetId,ownId,isMine,userId}){
  const section=document.querySelector("#profile-photos-section"),archiveSection=document.querySelector("#profile-archive-photos-section");
  if(!section||!archiveSection||section.dataset.vatraAlbumsReady==="true"||!validId(targetId))return;
  section.dataset.vatraAlbumsReady="true";
  const gallery=section.querySelector("#profile-photo-gallery");
  const empty=section.querySelector("#profile-photos-empty");
  const more=section.querySelector("#profile-photos-more");
  if(!gallery||!empty||!more)return;
  const postPane=make("div","ui-vatra-albums-post-pane-001");
  const albumPane=make("div","ui-vatra-albums-pane-001");
  const albumGrid=make("div","ui-vatra-albums-grid-001");
  const featured=make("section","ui-vatra-albums-featured-001");
  const controls=make("div","ui-vatra-albums-controls-001");
  const tabs=make("div","ui-vatra-albums-tabs-001");
  const archivePane=make("section","vatra-album-archive-pane-001");archivePane.hidden=true;
  const postTab=button("vatra-albums-tab-001 is-active",t("Фотографії","Photos"),()=>switchTab("photos"));
  const albumTab=button("vatra-albums-tab-001",t("Альбоми","Albums"),()=>switchTab("albums"));
  postTab.setAttribute("aria-pressed","true");albumTab.setAttribute("aria-pressed","false");
  const create=addIcon(button("vatra-albums-primary-001",t("Створити альбом","Create album"),()=>editAlbum(null)),"plus");
  create.hidden=true;
  const uploadDirect=addIcon(button("vatra-albums-direct-upload-001",t("Додати фотографії","Add photos"),()=>{
   state.uploadMode="personal";uploadInput.click();
  }),"upload");
  uploadDirect.hidden=!isMine;
  tabs.append(postTab,albumTab);controls.append(tabs,uploadDirect,create);
  postPane.append(gallery,empty,more,featured);
  albumPane.append(albumGrid);albumPane.hidden=true;
  section.prepend(controls,postPane,albumPane);
  if(isMine)archiveSection.append(archivePane);
  const uploadInput=make("input","ui-vatra-albums-file-input-001");
  uploadInput.type="file";uploadInput.multiple=true;uploadInput.accept="image/jpeg,image/png,image/webp";uploadInput.hidden=true;
  section.append(uploadInput);
  const PAGE_SIZE=18,FEATURED_LIMIT=12;
  const state={albums:[],previews:[],featuredOffset:0,featuredHasMore:false,featuredBusy:false,photos:[],avatarList:[],avatarOffset:0,avatarHasMore:false,avatarBusy:false,uploadMode:"album",photoAlbumId:null,photoOffset:0,photoHasMore:false,
   photosBusy:false,photoTicket:0,selected:null,pendingPhotoId:null,currentPhoto:null,avatar:null,tab:"photos",
   busy:false,loaded:false,avatarChecked:false,rev:0};
  const queryPhotoElements=selector=>[...section.querySelectorAll(selector),...archiveSection.querySelectorAll(selector)];
  const selectedPhotos=new Map();
  let selectionMode=false;
  const bulk=make("div","vatra-album-bulk-controls-001");bulk.hidden=true;
  let archivedRows=[],archiveOffset=0,archiveTicket=0,archiveHasMore=false;
  const bulkMove=button("vatra-albums-secondary-001",t("Перемістити","Move"),()=>void chooseDestination([...selectedPhotos.values()]));
  const bulkArchive=button("vatra-albums-secondary-001",t("Архівувати","Archive"),()=>void archivePhotos([...selectedPhotos.values()],state.tab==="archive"));
  const bulkCount=make("span","vatra-album-bulk-count-001");
  const bulkCancel=button("vatra-albums-secondary-001",t("Скасувати","Cancel"),()=>endSelection());
  const bulkDownload=button("vatra-albums-secondary-001",t("Завантажити","Download"),async()=>{if(state.busy)return;state.busy=true;try{for(const row of [...selectedPhotos.values()]){if(row.source==="avatar"||row.source==="post")await downloadSource(row);else await downloadPhoto(row);}}finally{state.busy=false;}});
  const bulkDelete=button("vatra-albums-danger-001",t("Видалити","Delete"),async()=>{
   await deleteSelected([...selectedPhotos.values()]);
  });
  const bulkMore=make("details","vatra-album-bulk-menu-001");
  const bulkMoreTrigger=make("summary","vatra-album-bulk-more-001",t("Більше","More"));
  const bulkMenu=make("div","vatra-album-bulk-menu-items-001");bulkMenu.append(bulkDownload,bulkMove,bulkArchive,bulkDelete);
  for(const item of [bulkDownload,bulkMove,bulkArchive,bulkDelete])item.addEventListener("click",()=>{bulkMore.open=false;});
  for(const [item,kind] of [[bulkDownload,"download"],[bulkMove,"move"],[bulkArchive,"archive"],[bulkDelete,"trash"]])decoratePhotoAction(item,kind);
  bulkMore.append(bulkMoreTrigger,bulkMenu);bulk.append(bulkCount,bulkCancel,bulkMore);controls.after(bulk);
  function updateSelection(){bulk.hidden=!selectionMode;bulkCount.textContent=t("Вибрано: ","Selected: ")+selectedPhotos.size;if(selectionMode)for(const menu of queryPhotoElements(".ui-vatra-album-tile-menu-001[open]"))menu.open=false;bulkDownload.disabled=bulkDelete.disabled=bulkMove.disabled=bulkArchive.disabled=!selectedPhotos.size;
   const mixed=[...selectedPhotos.values()].some(row=>row.source);
   bulkMove.hidden=bulkArchive.hidden=mixed;
   bulkMove.disabled=bulkArchive.disabled=mixed||!selectedPhotos.size;
   const archiveLabel=bulkArchive.querySelector(".vatra-photo-menu-label-001");if(archiveLabel)archiveLabel.textContent=state.tab==="archive"?t("Відновити","Restore"):t("Архівувати","Archive");
   const deleteLabel=bulkDelete.querySelector(".vatra-photo-menu-label-001");if(deleteLabel)deleteLabel.textContent=t("Видалити","Delete")+" ("+selectedPhotos.size+")";
   queryPhotoElements("[data-vatra-select-photo]").forEach(el=>{el.hidden=!selectionMode;const checked=selectedPhotos.has(el.dataset.vatraSelectPhoto);el.setAttribute("aria-pressed",String(checked));el.closest(".profile-media-tile,.ui-vatra-album-photo-card-001")?.classList.toggle("vatra-photo-selected-001",checked);});
   section.classList.toggle("vatra-album-selection-active-001",selectionMode&&state.tab!=="archive");
   archiveSection.classList.toggle("vatra-album-selection-active-001",selectionMode&&state.tab==="archive");
   if(!selectionMode)bulkMore.open=false;
  }
  async function deleteSelected(rows){
   if(!isMine||state.busy||!rows.length)return;
   if(!await askDelete(t("Видалити вибрані фотографії?","Delete selected photos?"),t("Цю дію неможливо скасувати.","This action cannot be undone.")+(rows.some(row=>row.source==="post")?" "+t("Якщо допис залишиться порожнім, його також буде видалено.","If a post becomes empty, it will also be deleted."):"")))return;
   state.busy=true;let failed=false;
   try{
    const albumRows=rows.filter(row=>!row.source),postRows=rows.filter(row=>row.source==="post"),avatars=rows.filter(row=>row.source==="avatar");
    if(albumRows.length){const {data,error}=await client.from("album_photos").delete().eq("owner_vatra_id",ownId).in("id",albumRows.map(row=>row.id)).select("id,media_path");
     if(error||data?.length!==albumRows.length)failed=true;
     if(data?.length){for(const row of data)signed.delete(row.media_path);const removed=await client.storage.from(BUCKET).remove(data.map(row=>row.media_path));if(removed.error)failed=true;}
    }
    const postIds=[...new Set(postRows.map(row=>row.post_id))];
    for(const id of postIds){
     if(!validUUID(id)){failed=true;continue;}
     try{
      const {data:post,error}=await client.from("feed_posts").select("id,body,poll,media_kind,media_path,media_items").eq("author_vatra_id",ownId).eq("id",id).maybeSingle();
      if(error||!post)throw Error("Unavailable");
      const items=Array.isArray(post.media_items)?post.media_items:[],paths=new Set(postRows.filter(row=>row.post_id===id).map(row=>row.media_path));
      const removed=items.filter(item=>item.media_kind==="image"&&paths.has(item.media_path));
      const legacy=post.media_kind==="image"&&paths.has(post.media_path);
      if(!removed.length&&!legacy)throw Error("Unavailable");
      const remaining=items.filter(item=>!removed.includes(item));
      const changes={media_items:remaining};if(legacy){changes.media_path=null;changes.media_kind=null;}
      let query=(!remaining.length&&!(legacy?null:post.media_path)&&!String(post.body||"").trim()&&!post.poll)?client.from("feed_posts").delete():client.from("feed_posts").update(changes);
      query=query.eq("id",id).eq("author_vatra_id",ownId).eq("media_items",JSON.stringify(items));
      query=post.media_path===null?query.is("media_path",null):query.eq("media_path",post.media_path);
      query=query.eq("body",post.body||"");
      query=post.poll===null?query.is("poll",null):query.eq("poll",JSON.stringify(post.poll));
      const {data:updated,error:writeError}=await query.select("id").maybeSingle();if(writeError||!updated)throw Error("Not saved");
      if(!await window.VATRA_POST_MEDIA.removeGallery(client,[...removed,...(legacy?[{media_kind:"image",media_path:post.media_path}]:[])]))failed=true;
     }catch(_){failed=true;}
    }
    if(avatars.length&&!await window.VATRA_DELETE_AVATAR_BATCH?.(avatars.map(row=>row.media_path)))failed=true;
    const viewer=document.querySelector("#vatra-post-media-viewer");if(viewer?.open)viewer.close();
    if(photoDialog.open)photoDialog.close();
    endSelection();window.dispatchEvent(new Event("vatra:profile-media-changed"));
    await refreshPhotoLists();
   }catch(_){failed=true;}
   finally{state.busy=false;}
   notify(failed?t("Не всі фотографії видалено.","Not all photos were deleted."):t("Фотографію видалено.","Photo deleted."),failed?"error":"success");
  }
  document.addEventListener("vatra:delete-post-photo",event=>{const row=event.detail;if(isMine&&row?.source==="post"&&row.media_path?.startsWith(ownId+"/posts/")&&validUUID(row.post_id))void deleteSelected([row]);});
  for(const panel of [section,archiveSection])panel.addEventListener("keydown",event=>{if(event.key==="Escape"){for(const menu of queryPhotoElements(".ui-vatra-album-tile-menu-001[open]"))menu.open=false;bulkMore.open=false;}});
  document.addEventListener("pointerdown",event=>{for(const menu of queryPhotoElements(".ui-vatra-album-tile-menu-001[open],.vatra-album-bulk-menu-001[open]"))if(!menu.contains(event.target))menu.open=false;});
  function endSelection(){selectionMode=false;selectedPhotos.clear();updateSelection();}
  function selectPhoto(row){if(!isMine||state.busy||!row?.id)return;selectionMode=true;if(selectedPhotos.has(row.id))selectedPhotos.delete(row.id);else selectedPhotos.set(row.id,row);updateSelection();}
  async function downloadSource(row){
   const bucket=row.source==="avatar"?"avatars":row.source==="post"?"post-images":null;if(!bucket)return;
   if(!row.media_path?.startsWith(ownId+"/"))return;
   try{const {data,error}=await client.storage.from(bucket).download(row.media_path);if(error||!data)throw Error("Unavailable");
    const url=URL.createObjectURL(data),link=make("a","vatra-album-download-link-001");link.href=url;link.download=row.media_path.split("/").pop()||"photo.jpg";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);}
   catch(_){notify(t("Не вдалося завантажити фотографію.","Could not download photo."));}
  }
  section.addEventListener("vatra:select-post-photo",event=>{const row=event.detail;if(!isMine||row?.source!=="post"||!row.media_path?.startsWith(ownId+"/posts/")||!validUUID(row.post_id))return;selectPhoto(row);});
  section.addEventListener("vatra:photo-tiles-rendered",()=>updateSelection());
  const signed=new Map(),pendingSignatures=new Map();
  let signatureGeneration=0;
  client.auth?.onAuthStateChange?.(event=>{
   if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;
   signatureGeneration++;signed.clear();pendingSignatures.clear();
  });
  async function signedUrl(path){
   const old=signed.get(path);
   if(old&&old.until>Date.now())return old.url;
   if(pendingSignatures.has(path))return pendingSignatures.get(path);
   const generation=signatureGeneration;
   const task=(async()=>{
    const {data,error}=await client.storage.from(BUCKET).createSignedUrl(path,120);
    if(error||!data?.signedUrl)throw error||Error("Photo URL unavailable");
    if(signatureGeneration!==generation)throw Error("Session changed");
    signed.set(path,{url:data.signedUrl,until:Date.now()+100000});
    if(signed.size>160)signed.delete(signed.keys().next().value);
    return data.signedUrl;
   })();
   pendingSignatures.set(path,task);
   try{return await task;}
   finally{if(pendingSignatures.get(path)===task)pendingSignatures.delete(path);}
  }
  async function revealImage(image){
   const path=image.dataset.path;
   if(!path)return;
   try{
    const url=await signedUrl(path);
    if(image.isConnected&&image.dataset.path===path)image.src=url;
   }catch(_){if(image.isConnected)image.classList.add("is-unavailable");}
  }
  const imageObserver=typeof IntersectionObserver==="function"?
   new IntersectionObserver(entries=>{
    for(const entry of entries){
     if(!entry.isIntersecting)continue;
     imageObserver.unobserve(entry.target);
     void revealImage(entry.target);
    }
   },{rootMargin:"220px 0px"}):null;
  function paintImage(image,path){
   image.alt="";image.loading="lazy";image.decoding="async";
   if(!path)return;
   image.dataset.path=path;
   if(imageObserver)imageObserver.observe(image);
   else queueMicrotask(()=>void revealImage(image));
  }
  function loading(el){
   const skeleton=make("div","vatra-section-skeleton-001 ui-vatra-album-skeleton-001");skeleton.dataset.layout="tiles";skeleton.setAttribute("aria-hidden","true");for(let i=0;i<6;i++){const item=make("span","vatra-section-skeleton-item-001");item.append(make("span","vatra-skeleton-block vatra-section-skeleton-visual-001"));skeleton.append(item);}el.replaceChildren(skeleton);
  }
  function albumUrl(id){
   const url=new URL(location.href);url.searchParams.set("album",id);url.searchParams.delete("photo");
   return url.href;
  }
  function switchTab(which){
   if(which==="archive"&&!isMine)return;
   endSelection();state.tab=which;archiveTicket++;archivePane.hidden=which!=="archive";
   if(which==="archive")archiveSection.prepend(bulk);else controls.after(bulk);
   postTab.classList.toggle("is-active",which==="photos");
   albumTab.classList.toggle("is-active",which==="albums");
   postTab.setAttribute("aria-pressed",String(which==="photos"));
   albumTab.setAttribute("aria-pressed",String(which==="albums"));
   postPane.hidden=which!=="photos";albumPane.hidden=which!=="albums";
   create.hidden=!isMine||which!=="albums";
   uploadDirect.hidden=!isMine||which!=="photos";
   if(which==="archive"){void (async()=>{if(!state.loaded)await loadAlbums();if(state.tab==="archive"&&!archiveSection.hidden)await loadArchive();})();return;}
   if(which==="albums"){if(!state.loaded)void loadAlbums();else renderAlbumPane();}
   else if(!state.loaded)void loadAlbums();
   else{renderFeatured();if(!state.avatarChecked&&window.VATRA_CAN_VIEW_PROFILE_AVATAR===true)void loadAvatarPage();}
  }
  const formDialog=make("dialog","ui-vatra-albums-dialog-001");
  const form=make("form","ui-vatra-albums-form-001");
  form.noValidate=true;
  const formHeader=make("div","ui-vatra-albums-dialog-header-001");
  const formTitle=make("h3","vatra-albums-dialog-title-001");
  const formX=addIcon(button("vatra-albums-dialog-close-001","",()=>formDialog.close()),"close");
  formX.setAttribute("aria-label",t("Закрити","Close"));
  formHeader.append(formTitle,formX);
  function labeled(label,field){
   const wrap=make("label","ui-vatra-albums-field-001");
   wrap.append(make("span","vatra-albums-field-label-001",label),field);
   return wrap;
  }
  const title=make("input","ui-vatra-albums-title-input-001");
  title.maxLength=128;title.required=true;
  const description=make("textarea","ui-vatra-albums-description-input-001");
  description.maxLength=512;description.rows=3;
  const visibility=make("select","ui-vatra-albums-visibility-select-001");
  const comments=make("select","ui-vatra-albums-comments-select-001");
  const options=(select,items)=>items.forEach(([value,label])=>{
   const option=make("option","vatra-albums-option-001",label);option.value=value;select.append(option);
  });
  options(visibility,[["public",t("Учасники VATRA","VATRA users")],
   ["friends",t("Мої друзі","My friends")],["private",t("Лише я","Only me")]]);
  options(comments,[["everyone",t("Усі, хто бачить альбом","Anyone who can view the album")],
   ["friends",t("Тільки друзі","Friends only")],["off",t("Вимкнені","Off")]]);
  const showWrap=make("label","ui-vatra-albums-check-wrap-001");
  const showInPhotos=make("input","ui-vatra-albums-check-001");showInPhotos.type="checkbox";showInPhotos.checked=true;
  showWrap.append(showInPhotos,make("span","vatra-albums-check-label-001",t("Показувати фотографії у вкладці «Фотографії»","Show photos in the Photos tab")));
  const hint=make("p","vatra-albums-privacy-hint-001",t("Приватність застосовується до альбому й усіх його фотографій.","Privacy applies to the album and all its photos."));
  const message=make("p","vatra-albums-form-error-001");message.hidden=true;
  const formFooter=make("div","ui-vatra-albums-dialog-actions-001");
  const cancel=button("vatra-albums-secondary-001",t("Скасувати","Cancel"),()=>formDialog.close());
  const save=button("vatra-albums-primary-001",t("Створити","Create"));
  save.type="submit";formFooter.append(cancel,save);
  form.append(formHeader,labeled(t("Назва альбому","Album name"),title),
   labeled(t("Опис (необов'язково)","Description (optional)"),description),
   labeled(t("Хто бачить альбом","Who can see the album"),visibility),
   labeled(t("Коментарі","Comments"),comments),showWrap,hint,message,formFooter);
  formDialog.append(form);document.body.append(formDialog);
  formDialog.addEventListener("click",e=>{if(e.target===formDialog)formDialog.close();});
  let editing=null;
  function editAlbum(album){
   if(!isMine||state.busy)return;
   editing=album;
   formTitle.textContent=album?t("Налаштування альбому","Album settings"):t("Новий альбом","New album");
   title.value=album?.title||"";description.value=album?.description||"";
   visibility.value=album?.visibility||"public";comments.value=album?.comments_mode||"everyone";
   showInPhotos.checked=album?.show_in_photos??true;
   save.textContent=album?t("Зберегти","Save"):t("Створити альбом","Create album");
   message.hidden=true;message.textContent="";
   formDialog.showModal();title.focus();
  }
  form.addEventListener("submit",async event=>{
   event.preventDefault();if(state.busy)return;
   const name=title.value.trim(),body=description.value.trim();
   if(!name||name.length>128){message.textContent=t("Вкажіть назву до 128 символів.","Enter a title up to 128 characters.");message.hidden=false;title.focus();return;}
   state.busy=true;save.disabled=true;message.hidden=true;
   const values={title:name,description:body,visibility:visibility.value,comments_mode:comments.value,
    show_in_photos:showInPhotos.checked,updated_at:new Date().toISOString()};
   try{
    const query=editing?client.from("photo_albums").update(values).eq("id",editing.id).eq("owner_vatra_id",ownId):
     client.from("photo_albums").insert({...values,owner_vatra_id:Number(ownId)});
    const {data,error}=await query.select("id").single();if(error||!data)throw error||Error("Save failed");
    const id=data.id;
    formDialog.close();state.selected=id;
    await loadAlbums();
    switchTab("albums");notify(t("Альбом збережено.","Album saved."),"success");
   }catch(_){message.textContent=t("Не вдалося зберегти альбом.","Could not save album.");message.hidden=false;}
   finally{state.busy=false;save.disabled=false;}
  });
  const confirmDialog=make("dialog","ui-vatra-albums-confirm-001");
  const confirmTitle=make("h3","vatra-albums-confirm-heading-001");
  const confirmNote=make("p","vatra-albums-confirm-note-001");
  const confirmActions=make("div","ui-vatra-albums-confirm-actions-001");
  const confirmCancel=button("vatra-albums-secondary-001",t("Скасувати","Cancel"));
  const confirmDelete=button("vatra-albums-danger-001",t("Видалити","Delete"));
  confirmActions.append(confirmCancel,confirmDelete);confirmDialog.append(confirmTitle,confirmNote,confirmActions);
  document.body.append(confirmDialog);
  let settle=null;
  const resolveConfirm=answer=>{if(!settle)return;const cb=settle;settle=null;confirmDialog.close();cb(answer);};
  confirmCancel.addEventListener("click",()=>resolveConfirm(false));
  confirmDelete.addEventListener("click",()=>resolveConfirm(true));
  confirmDialog.addEventListener("cancel",e=>{e.preventDefault();resolveConfirm(false);});
  function askDelete(titleText,note){
   if(settle)return Promise.resolve(false);
   confirmTitle.textContent=titleText;confirmNote.textContent=note;
   confirmDialog.showModal();
   return new Promise(resolve=>{settle=resolve;});
  }
  const photoDialog=make("dialog","vatra-post-media-viewer ui-vatra-album-viewer-001");
  const photoStage=make("div","vatra-post-media-viewer-frame ui-vatra-album-viewer-stage-001");
  const photoImage=make("img","ui-vatra-post-expanded-image-001 ui-vatra-album-viewer-image-001");photoImage.alt=t("Фотографія","Photograph");
  const photoContent=make("div","ui-vatra-post-media-viewer-content-001 ui-vatra-album-viewer-media-001");
  const photoLoading=make("div","vatra-album-photo-loading-001 vatra-skeleton-block is-skeleton");
  photoLoading.setAttribute("role","status");
  photoContent.append(photoImage,photoLoading);
  photoImage.addEventListener("load",()=>{photoLoading.hidden=true;});
  photoImage.addEventListener("error",()=>{
   photoLoading.hidden=false;photoLoading.classList.remove("vatra-skeleton-block","is-skeleton");
   photoLoading.textContent=t("Не вдалося завантажити фотографію.","Could not load photograph.");
  });
  const photoSide=make("aside","ui-vatra-post-media-side-001 ui-vatra-album-photo-side-001 vatra-media-side-unified-001");
  const photoAuthor=make("header","ui-vatra-post-media-author-001 ui-vatra-album-photo-author-001 vatra-media-author-unified-001");
  const photoAuthorImage=make("a","vatra-album-photo-author-avatar-001");
  photoAuthorImage.href=new URL("id"+targetId,new URL(".",location.href)).href;
  photoAuthorImage.setAttribute("aria-label",t("Профіль автора","Author profile"));
  const photoAuthorName=make("a","vatra-album-photo-author-name-001",t("Користувач VATRA","VATRA user"));
  photoAuthorName.href=new URL("id"+targetId,new URL(".",location.href)).href;
  const photoAuthorCopy=make("div","vatra-album-photo-author-copy-001");
  const photoAuthorDate=make("time","vatra-album-photo-author-date-001");
  photoAuthorCopy.append(photoAuthorName,photoAuthorDate);
  photoAuthor.append(photoAuthorImage,photoAuthorCopy);
  const photoActions=make("div","ui-vatra-album-photo-actions-001 vatra-media-actions-unified-001");
  const photoClose=addIcon(button("vatra-album-viewer-close-001","",()=>photoDialog.close()),"close");
  photoClose.setAttribute("aria-label",t("Закрити фото","Close photo"));
  const photoBottom=make("footer","ui-vatra-post-media-footer-001 ui-vatra-album-viewer-bottom-001");
  const photoCaption=make("span","vatra-album-viewer-caption-001");
  let photoLikeTicket=0,photoLiked=false,photoLikeCount=0,photoLikeBusy=false;
  const photoLike=addIcon(button("vatra-album-viewer-like-001",t("Подобається","Like"),()=>void togglePhotoLike()),"like");
  photoLike.setAttribute("aria-pressed","false");
  const photoLikeNumber=make("span","vatra-album-viewer-like-number-001","");
  photoLike.append(photoLikeNumber);
  function paintPhotoLike(){
   photoLike.setAttribute("aria-pressed",String(photoLiked));
   photoLike.classList.toggle("is-liked",photoLiked);
   photoLikeNumber.textContent=String(photoLikeCount);
  }
  async function loadPhotoLikes(photo){
   const ticket=++photoLikeTicket;photoLike.disabled=true;
   const [countResult,meResult]=await Promise.all([
    client.from("album_photo_likes").select("photo_id",{head:true,count:"exact"}).eq("photo_id",photo.id),
    client.from("album_photo_likes").select("photo_id")
     .eq("photo_id",photo.id).eq("liker_id",userId).maybeSingle()
   ]);
   if(ticket!==photoLikeTicket||state.currentPhoto!==photo)return;
   if(!countResult.error)photoLikeCount=Math.max(0,Number(countResult.count)||0);
   if(!meResult.error)photoLiked=!!meResult.data;
   photoLike.disabled=!!countResult.error||!!meResult.error;paintPhotoLike();
  }
  async function togglePhotoLike(){
   const photo=state.currentPhoto;
   if(!photo||photoLikeBusy||!validUUID(userId))return;
   photoLikeBusy=true;photoLike.disabled=true;
   const previous=photoLiked,oldCount=photoLikeCount;
   photoLiked=!photoLiked;photoLikeCount=Math.max(0,photoLikeCount+(photoLiked?1:-1));
   paintPhotoLike();
   try{
    const {error}=await (previous?
     client.from("album_photo_likes").delete().eq("photo_id",photo.id).eq("liker_id",userId):
     client.from("album_photo_likes").insert({photo_id:photo.id,liker_id:userId}));
    if(error)throw error;
   }catch(_){
    if(state.currentPhoto===photo){
     photoLiked=previous;photoLikeCount=oldCount;paintPhotoLike();
     notify(t("Не вдалося змінити реакцію.","Could not update like."));
    }
   }finally{photoLikeBusy=false;if(state.currentPhoto===photo)photoLike.disabled=false;}
  }
  const photoDelete=addIcon(button("vatra-album-viewer-delete-001",t("Видалити","Delete"),()=>void removePhoto()),"trash");
  const photoComments=addIcon(button("vatra-album-viewer-comments-001",t("Коментувати","Comment"),()=>commentsInput.focus()),"comments");
  const photoShare=button("vatra-album-viewer-share-001",t("Поділитися","Share"),()=>void sharePhoto(state.currentPhoto,state.albums.find(a=>a.id===state.currentPhoto?.album_id)));
  const photoMore=make("details","ui-vatra-album-photo-menu-001");
  const photoMoreTrigger=make("summary","vatra-album-photo-menu-trigger-001",t("Більше","More"));
  const photoMoreItems=make("div","ui-vatra-album-photo-menu-items-001");
  photoMore.append(photoMoreTrigger,photoMoreItems);
  const photoActionShare=addIcon(button("vatra-album-share-action-001","",()=>void sharePhoto(state.currentPhoto,state.albums.find(a=>a.id===state.currentPhoto?.album_id))),"share");
  photoActionShare.setAttribute("aria-label",t("Поділитися","Share"));
  photoComments.hidden=true;
  photoDelete.hidden=!isMine;photoActions.append(photoLike,photoActionShare,photoComments);
  photoBottom.append(photoCaption,photoShare,photoDelete,photoMore);
  photoStage.append(photoClose,photoContent,photoBottom);
  const photoCaptionEditor=window.VATRA_POST_MEDIA.mediaDescription({kind:"album-photo",limit:300,translate:t,onSave:async caption=>{
   const row=state.currentPhoto;if(!isMine||!row)throw Error("Not permitted");
   const {data,error}=await client.from("album_photos").update({caption}).eq("id",row.id).eq("owner_vatra_id",ownId).select("id,caption").maybeSingle();
   if(error||!data)throw Error("Not saved");row.caption=data.caption;for(const item of [...state.photos,...state.previews])if(item.id===row.id)item.caption=data.caption;return data.caption;
  },onError:()=>notify(t("Не вдалося зберегти.","Could not save."))});
  const photoDescription=photoCaptionEditor.root;
  const paintDescription=()=>{photoCaptionEditor.paint(state.currentPhoto?.caption,isMine);photoSide.scrollTop=0;};
  photoSide.append(photoAuthor,photoActions,photoDescription);
  photoDialog.append(photoStage,photoSide);
  photoDialog.addEventListener("click",e=>{if(e.target===photoDialog)photoDialog.close();});
  photoDialog.addEventListener("close",()=>{
   window.VATRA_POST_MEDIA?.clearPhotoSlide(photoContent);delete photoDialog.dataset.photoSized;
   photoLikeTicket++;photoImage.removeAttribute("src");state.currentPhoto=null;photoCaptionEditor.reset();photoMore.open=false;
   if(commentsBox.parentElement===photoSide){commentsDialog.append(commentsBox);commentsClose.hidden=false;}
  });
  document.body.append(photoDialog);
  const commentsDialog=make("dialog","ui-vatra-album-comments-dialog-001");
  const commentsBox=make("section","ui-vatra-album-comments-box-001");
  const commentsHead=make("div","ui-vatra-album-comments-head-001");
  const commentsTitle=make("h3","vatra-album-comments-title-001");
  const commentsClose=addIcon(button("vatra-album-comments-close-001","",()=>commentsDialog.close()),"close");
  commentsClose.setAttribute("aria-label",t("Закрити","Close"));commentsHead.append(commentsTitle,commentsClose);
  const commentsList=make("div","ui-vatra-album-comments-list-001 vatra-media-comments-unified-001");
  const commentsForm=make("form","ui-vatra-album-comments-form-001 vatra-media-form-unified-001");
  const commentsInput=make("textarea","ui-vatra-album-comments-input-001");
  commentsInput.maxLength=2000;commentsInput.rows=1;commentsInput.required=true;
  commentsInput.placeholder=t("Ваш коментар…","Write a comment…");
  const commentsSend=button("vatra-albums-primary-001 vatra-media-send-unified-001","");
  commentsSend.type="submit";commentsSend.disabled=true;
  commentsSend.setAttribute("aria-label",t("Надіслати","Send"));
  commentsSend.append(svg("ui-vatra-album-comment-send-icon-001","send"));
  const commentsAvatar=make("span","vatra-album-comment-composer-avatar-001");
  commentsAvatar.setAttribute("aria-hidden","true");
  const commentsComposer=make("div","vatra-media-composer-row-unified-001 vatra-album-comments-composer-001");
  const commentsEmoji=button("vatra-album-comments-emoji-001","");
  commentsEmoji.append(svg("ui-vatra-album-comment-emoji-icon-001","smile"));
  commentsEmoji.setAttribute("aria-label",t("Емодзі","Emoji"));
  commentsEmoji.setAttribute("aria-expanded","false");
  const emojiPanel=make("div","vatra-album-comments-emoji-panel-001");emojiPanel.hidden=true;
  for(const symbol of ["😀","😂","😍","🥰","❤️","👍","🔥","👏","😊","😢","😮","🤔","🎉","🙌","💙","💛","✨","🙏"]){
   const item=button("vatra-album-comments-emoji-option-001",symbol,()=>{
    const start=commentsInput.selectionStart??commentsInput.value.length,end=commentsInput.selectionEnd??start;
    if(commentsInput.value.length-(end-start)+symbol.length>2000)return;
    commentsInput.setRangeText(symbol,start,end,"end");
    commentsInput.dispatchEvent(new Event("input"));commentsInput.focus();emojiPanel.hidden=true;
    commentsEmoji.setAttribute("aria-expanded","false");
   });
   emojiPanel.append(item);
  }
  commentsEmoji.addEventListener("click",()=>{
   emojiPanel.hidden=!emojiPanel.hidden;
   commentsEmoji.setAttribute("aria-expanded",String(!emojiPanel.hidden));
  });
  commentsInput.addEventListener("input",()=>{commentsSend.disabled=!commentsInput.value.trim();});
  commentsComposer.append(commentsAvatar,commentsInput,commentsEmoji,commentsSend);
  commentsForm.append(commentsComposer,emojiPanel);
  commentsBox.append(commentsHead,commentsList,commentsForm);commentsDialog.append(commentsBox);
  document.body.append(commentsDialog);
  let commentAlbum=null,commentPhoto=null,commentOffset=0,commentsTicket=0,commentLoading=false;
  const commentsMore=button("vatra-albums-more-photos-001",t("Ще коментарі","More comments"),()=>void loadComments(commentAlbum,commentPhoto,true));
  commentsMore.hidden=true;commentsBox.insertBefore(commentsMore,commentsForm);
  const discussionOpen=()=>commentsDialog.open||(photoDialog.open&&commentsBox.parentElement===photoSide);
  const loadOnCommentScroll=()=>{
   if(!discussionOpen()||commentLoading||commentsMore.hidden||!commentAlbum)return;
   const scroll=commentsBox.parentElement===photoSide?photoSide:commentsList;
   if(scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight<=320)
    void loadComments(commentAlbum,commentPhoto,true);
  };
  commentsList.addEventListener("scroll",loadOnCommentScroll,{passive:true});photoSide.addEventListener("scroll",loadOnCommentScroll,{passive:true});
  const stopComments=()=>{commentsTicket++;commentLoading=false;commentsMore.hidden=true;commentAlbum=null;commentPhoto=null;};
  commentsDialog.addEventListener("close",stopComments);
  photoDialog.addEventListener("close",()=>{if(commentPhoto)stopComments();});
  const sameDiscussion=(album,photo)=>commentAlbum?.id===album?.id&&
   (commentPhoto?.id||null)===(photo?.id||null);
  async function paintAvatars(nodes,ticket){
   if(!nodes.length||!window.VATRA_AVATAR?.paths)return;
   const ids=[...new Set(nodes.map(node=>node.dataset.vatraId).filter(validId))];
   const result=await window.VATRA_AVATAR.paths(client,ids);
   if(ticket!==commentsTicket)return;
   const photos=new Map();
   for(const record of result?.data||[]){
    const id=String(record.vatra_id),path=record.avatar_path;
    if(!validId(id)||typeof path!=="string"||!path.startsWith(id+"/avatar/"))continue;
    const url=client.storage.from("avatars").getPublicUrl(record.avatar_path)?.data?.publicUrl;
    if(url)photos.set(id,url);
   }
   for(const node of nodes){
    if(!node.isConnected)continue;
    const url=photos.get(node.dataset.vatraId);
    if(url){node.style.backgroundImage="url("+JSON.stringify(url)+")";node.classList.add("has-photo");}
   }
  }
  async function paintComposerAvatar(){
   if(!validId(ownId)||!window.VATRA_AVATAR?.paths)return;
   const result=await window.VATRA_AVATAR.paths(client,[ownId]);
   const avatarPath=result?.data?.find(row=>String(row.vatra_id)===String(ownId))?.avatar_path;
   if(typeof avatarPath!=="string"||!avatarPath.startsWith(ownId+"/avatar/")||!commentsAvatar.isConnected)return;
   const url=client.storage.from("avatars").getPublicUrl(avatarPath)?.data?.publicUrl;
   if(url)commentsAvatar.style.backgroundImage="url("+JSON.stringify(url)+")";
  }
  function commentRow(item,names){
   const row=make("article","ui-vatra-album-comment-001");
   row.dataset.commentId=String(item.id);
   const info=make("div","ui-vatra-album-comment-author-001");
   const author=make("a","vatra-album-comment-name-001",names.get(String(item.author_vatra_id))||t("Користувач VATRA","VATRA user"));
   author.href=new URL("id"+item.author_vatra_id,new URL(".",location.href)).href;
   const portrait=make("a","vatra-album-comment-avatar-001");
   portrait.href=author.href;portrait.dataset.vatraId=String(item.author_vatra_id);
   portrait.setAttribute("aria-label",t("Профіль автора коментаря","Comment author profile"));
   info.append(author,make("time","vatra-album-comment-date-001",
    new Intl.DateTimeFormat(lang()==="en"?"en-US":"uk-UA",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.created_at))));
   row.append(portrait,info,make("p","vatra-album-comment-body-001",item.body));
   if(isMine||String(item.author_id)===String(userId)){
    const remove=button("vatra-album-comment-delete-001",t("Видалити","Delete"),async()=>{
     if(!await askDelete(t("Видалити коментар?","Delete comment?"),t("Коментар буде видалено без відновлення.","This comment cannot be restored.")))return;
     remove.disabled=true;
     const {error}=await client.from("photo_album_comments").delete().eq("id",item.id);
     if(error){remove.disabled=false;notify(t("Не вдалося видалити коментар.","Could not delete comment."));}
     else{row.remove();commentOffset=Math.max(0,commentOffset-1);}
    });
    row.append(remove);
   }
   return row;
  }
  async function loadComments(album,photo=null,append=false){
   if(!album||(append&&commentLoading))return;
   const ticket=++commentsTicket;
   commentLoading=true;commentsMore.disabled=true;
   if(!append){commentOffset=0;commentsMore.hidden=true;loading(commentsList);}
   try{
    const offset=commentOffset;
    let query=client.from("photo_album_comments")
     .select("id,author_vatra_id,author_id,body,created_at")
     .eq("album_id",album.id);
    query=photo?query.eq("photo_id",photo.id):query.is("photo_id",null);
    const {data,error}=await query.order("created_at",{ascending:false})
     .order("id",{ascending:false}).range(offset,offset+10);
    if(error)throw error;
    if(!sameDiscussion(album,photo)||ticket!==commentsTicket)return;
    const rows=(data||[]).slice(0,10),pageCount=rows.length;
    const params=new URLSearchParams(location.search),linked=params.get("comment");
    const focus=!append&&photo&&params.get("album")===album.id&&params.get("photo")===photo.id&&validUUID(linked);
    if(focus&&!rows.some(row=>row.id===linked)){
     const match=await client.from("photo_album_comments").select("id,author_vatra_id,author_id,body,created_at").eq("album_id",album.id).eq("photo_id",photo.id).eq("id",linked).maybeSingle();
     if(!match.error&&match.data&&sameDiscussion(album,photo)&&ticket===commentsTicket)rows.unshift(match.data);
    }
    if(!sameDiscussion(album,photo)||ticket!==commentsTicket)return;
    const ids=[...new Set(rows.map(r=>Number(r.author_vatra_id)))];
    const result=ids.length?await window.VATRA_PUBLIC_NAMES?.get(client,ids):null;
    if(!sameDiscussion(album,photo)||ticket!==commentsTicket)return;
    const names=new Map((result?.data||[]).map(r=>[String(r.vatra_id),r.display_name]));
    if(!append)commentsList.replaceChildren();
    if(!append&&!rows.length){
    const empty=make("div","vatra-media-empty-unified-001");
    const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");
    icon.setAttribute("class","vatra-media-empty-icon-unified-001");
    icon.setAttribute("viewBox","0 0 48 48");icon.setAttribute("fill","none");
    icon.setAttribute("stroke","currentColor");icon.setAttribute("stroke-width","2.6");
    icon.setAttribute("stroke-linecap","round");icon.setAttribute("stroke-linejoin","round");
    icon.setAttribute("aria-hidden","true");
    const path=document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d","M16 7h22a5 5 0 0 1 5 5v17a5 5 0 0 1-5 5h-4v8l-10-8h-8a5 5 0 0 1-5-5V12a5 5 0 0 1 5-5ZM6 15a5 5 0 0 0-4 5v14a5 5 0 0 0 5 5h5v5l6-5");
    icon.append(path);
    empty.append(icon,make("p","vatra-album-comments-empty-text-001",t("Коментарів поки немає. Будьте першими!","No comments yet. Be the first!")));
    commentsList.append(empty);
   }
    const portraits=[];
    for(const item of rows){
     if(append&&[...commentsList.querySelectorAll("[data-comment-id]")].some(el=>el.dataset.commentId===String(item.id)))continue;
     const row=commentRow(item,names);commentsList.append(row);
     const portrait=row.querySelector(".vatra-album-comment-avatar-001");if(portrait)portraits.push(portrait);
    }
    void paintAvatars(portraits,ticket);
    commentOffset+=pageCount;commentsMore.hidden=(data||[]).length<=10;
    if(focus){const target=[...commentsList.querySelectorAll("[data-comment-id]")].find(el=>el.dataset.commentId===linked);if(target){target.classList.add("is-linked-comment");target.scrollIntoView({block:"center",behavior:"auto"});}}
   }catch(_){
    if(ticket===commentsTicket&&!append&&sameDiscussion(album,photo))
     commentsList.replaceChildren(make("p","vatra-albums-error-001",t("Не вдалося завантажити коментарі.","Could not load comments.")));
    else if(ticket===commentsTicket)notify(t("Не вдалося завантажити коментарі.","Could not load comments."));
   }finally{if(ticket===commentsTicket){commentLoading=false;commentsMore.disabled=false;}}
  }
  async function openComments(album,photo=null){
   commentAlbum=album;commentPhoto=photo;commentOffset=0;commentsMore.hidden=true;commentsList.scrollTop=0;
   commentsTitle.textContent=photo?t("Коментарі до фотографії","Photo comments"):t("Коментарі до альбому","Album comments");
   commentsInput.value="";commentsSend.disabled=true;emojiPanel.hidden=true;
   commentsEmoji.setAttribute("aria-expanded","false");void paintComposerAvatar();
   commentsForm.hidden=album.comments_mode==="off";
   if(album.comments_mode==="friends"&&!isMine){
    const {data,error}=await client.from("friendships").select("id")
     .eq("status","accepted")
     .or("and(requester_id.eq."+ownId+",recipient_id.eq."+targetId+"),and(recipient_id.eq."+ownId+",requester_id.eq."+targetId+")").limit(1);
    commentsForm.hidden=!!error||!data?.length;
   }
   if(!sameDiscussion(album,photo)||(photo&&!photoDialog.open))return;
   const inline=!!photo&&photoDialog.open&&state.currentPhoto?.id===photo.id;
   commentsClose.hidden=inline;
   if(inline)photoSide.append(commentsBox);
   else commentsDialog.showModal();
   void loadComments(album,photo);
  }
  commentsForm.addEventListener("submit",async e=>{
   e.preventDefault();if(!commentAlbum||!validId(ownId)||!validUUID(userId)||commentsSend.disabled)return;
   const body=commentsInput.value.trim();if(!body||body.length>2000)return;
   const album=commentAlbum,photo=commentPhoto;
   const pending=make("article","ui-vatra-album-comment-001");
   pending.append(make("p","vatra-album-comment-body-001",body),
    make("small","vatra-albums-hint-001",t("Публікується…","Publishing…")));
   commentsList.querySelector(".vatra-albums-hint-001")?.remove();
   commentsList.prepend(pending);
   commentsSend.disabled=true;
   try{
    const {data,error}=await client.from("photo_album_comments").insert({
     album_id:album.id,photo_id:photo?.id||null,author_id:userId,
     author_vatra_id:Number(ownId),body
    }).select("id,author_vatra_id,author_id,body,created_at").single();
    if(error||!data)throw error||Error("Comment not saved");
    commentsInput.value="";
    if(sameDiscussion(album,photo)){
     const ownName=document.querySelector(".feed-account-name, .feed-header-name");
     const names=new Map([[String(ownId),ownName?.textContent?.trim()||t("Ви","You")]]);
     pending.replaceWith(commentRow(data,names));
     commentOffset++;commentsList.scrollTop=0;
    }else pending.remove();
   }catch(_){pending.remove();notify(t("Не вдалося надіслати коментар.","Could not send comment."));}
   finally{commentsSend.disabled=!commentsInput.value.trim();}
  });
  function photoUrl(row,album){
   const url=new URL(location.href);url.searchParams.set("album",album.id);
   url.searchParams.set("photo",row.id);return url.href;
  }
  async function sharePhoto(row,album){
   if(!row||!album)return;
   const link=photoUrl(row,album);
   try{
    if(navigator.share)await navigator.share({url:link});
    else if(navigator.clipboard?.writeText){
     await navigator.clipboard.writeText(link);
     notify(t("Посилання на фотографію скопійовано.","Photo link copied."),"success");
    }else notify(link,"success");
   }catch(error){if(error?.name!=="AbortError")notify(t("Не вдалося поділитися.","Could not share."));}
  }
  async function downloadPhoto(row){
   if(!row)return;
   try{
    const {data,error}=await client.storage.from(BUCKET).download(row.media_path);
    if(error||!data)throw error||Error("File unavailable");
    const url=URL.createObjectURL(data);
    const anchor=make("a","vatra-album-download-link-001");
    anchor.href=url;anchor.download=row.media_path.split("/").pop()||"photo.jpg";
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),20000);
   }catch(_){notify(t("Не вдалося завантажити фотографію.","Could not download photo."));}
  }
  function goToAlbum(album){
   if(photoDialog.open)photoDialog.close();
   if(state.tab==="archive")window.VATRA_PROFILE_CHOOSE_TAB?.("photos");
   state.selected=album.id;switchTab("albums");
   const url=new URL(location.href);url.searchParams.set("album",album.id);
   url.searchParams.delete("photo");history.replaceState(history.state,"",url);
   void loadAlbumPage(album.id);
  }
  async function togglePin(row){
   if(!isMine||!row)return;
   const value=row.pinned_at?null:new Date().toISOString();
   try{
    const {data,error}=await client.from("album_photos").update({pinned_at:value})
     .eq("id",row.id).eq("owner_vatra_id",Number(ownId)).select("id,pinned_at").maybeSingle();
    if(error||!data)throw error||Error("Update not permitted");
    row.pinned_at=data.pinned_at;
    for(const item of [...state.photos,...state.previews])
     if(item.id===row.id)item.pinned_at=data.pinned_at;
    photoMoreItems.replaceChildren(...photoActionButtons(row,state.albums.find(a=>a.id===row.album_id)));
    if(state.tab==="archive")await loadArchive();else if(state.tab==="albums")renderAlbumPane();else renderFeatured();
    notify(value?t("Фотографію закріплено.","Photo pinned."):t("Закріплення знято.","Photo unpinned."),"success");
   }catch(_){notify(t("Не вдалося змінити закріплення.","Could not update pin."));}
  }
  async function refreshPhotoLists(){
   endSelection();await loadAlbums();
   if(state.tab==="archive")await loadArchive();
   else if(state.tab==="albums"&&state.selected)await loadAlbumPage(state.selected);
  }
  async function archivePhotos(rows,restore=false){
   if(!isMine||state.busy||!rows.length)return;
   state.busy=true;let failed=false;
   try{
    const ids=rows.map(row=>row.id);
    const {data,error}=await client.from("album_photos").update({archived_at:restore?null:new Date().toISOString()})
     .eq("owner_vatra_id",ownId).in("id",ids).select("id");
    if(error||data?.length!==ids.length)failed=true;
    if(photoDialog.open)photoDialog.close();
    for(const row of rows)signed.delete(row.media_path);
    await refreshPhotoLists();
   }catch(_){failed=true;}
   finally{state.busy=false;}
   notify(failed?t("Не вдалося зберегти.","Could not save."):restore?t("Фотографії відновлено.","Photos restored."):t("Фотографії архівовано.","Photos archived."),failed?"error":"success");
  }
  async function chooseDestination(rows){
   if(!isMine||state.busy||!rows.length||document.querySelector(".vatra-album-move-dialog-001[open]"))return;
   const ranks={private:0,friends:1,public:2};
   const sources=rows.map(row=>state.albums.find(a=>a.id===row.album_id));
   if(sources.some(a=>!a))return;
   const allowed=state.albums.filter(a=>!a.is_personal&&sources.every(source=>ranks[a.visibility]<=ranks[source.visibility])&&rows.some(row=>row.album_id!==a.id));
   const dialog=make("dialog","ui-vatra-albums-dialog-001 vatra-album-move-dialog-001");
   const box=make("div","ui-vatra-albums-form-001");
   const title=make("h3","vatra-albums-dialog-title-001",t("Перемістити фотографії","Move photos"));
   const note=make("p","vatra-albums-privacy-hint-001",t("Доступні альбоми з таким самим або суворішим рівнем приватності.","Available albums have the same or stricter privacy."));
   const select=make("select","ui-vatra-albums-visibility-select-001");select.setAttribute("aria-label",title.textContent);
   for(const album of allowed){const opt=make("option","vatra-albums-option-001",album.title);opt.value=album.id;select.append(opt);}
   const actions=make("div","ui-vatra-albums-dialog-actions-001");
   const cancel=button("vatra-albums-secondary-001",t("Скасувати","Cancel"),()=>dialog.close());
   const save=button("vatra-albums-primary-001",t("Перемістити","Move"),async()=>{
    if(state.busy||!allowed.some(a=>a.id===select.value))return;
    const ids=rows.filter(row=>row.album_id!==select.value).map(row=>row.id);if(!ids.length)return;
    state.busy=true;save.disabled=cancel.disabled=true;
    try{const {data,error}=await client.from("album_photos").update({album_id:select.value,pinned_at:null})
     .eq("owner_vatra_id",ownId).in("id",ids).select("id");
     if(error||data?.length!==ids.length)throw Error("Move failed");
     dialog.close();if(photoDialog.open)photoDialog.close();await refreshPhotoLists();notify(t("Фотографії переміщено.","Photos moved."),"success");
    }catch(_){notify(t("Не вдалося перемістити фотографії.","Could not move photos."));}
    finally{state.busy=false;save.disabled=cancel.disabled=false;}
   });
   save.disabled=!allowed.length;select.disabled=!allowed.length;
   actions.append(cancel,save);box.append(title,note,select,actions);dialog.append(box);document.body.append(dialog);
   dialog.addEventListener("cancel",event=>{if(state.busy)event.preventDefault();});
   dialog.addEventListener("close",()=>dialog.remove(),{once:true});dialog.showModal();
  }
  async function loadArchive(append=false){
   if(!isMine||archiveSection.hidden)return;const ticket=++archiveTicket;
   if(!append){archivedRows=[];archiveOffset=0;loading(archivePane);}
   try{
    const {data,error}=await client.from("album_photos").select("id,album_id,media_path,created_at,caption,pinned_at,archived_at")
     .eq("owner_vatra_id",ownId).not("archived_at","is",null).order("archived_at",{ascending:false}).order("id",{ascending:false}).range(archiveOffset,archiveOffset+PAGE_SIZE);
    if(error)throw error;if(ticket!==archiveTicket||state.tab!=="archive"||archiveSection.hidden)return;
    const page=(data||[]).slice(0,PAGE_SIZE);archivedRows.push(...page);archiveOffset+=page.length;
    const grid=make("div","ui-vatra-album-photos-grid-001");
    for(const row of archivedRows){const album=state.albums.find(a=>a.id===row.album_id);if(album)grid.append(makePhotoTile(row,album));}
    archivePane.replaceChildren(grid);
    if(!archivedRows.length)archivePane.append(make("p","vatra-albums-hint-001",t("Архів порожній.","Archive is empty.")));
    archiveHasMore=(data||[]).length>PAGE_SIZE;
    if(archiveHasMore)archivePane.append(button("vatra-albums-more-photos-001",t("Ще фотографії","More photos"),()=>void loadArchive(true)));
    updateSelection();
   }catch(_){if(ticket===archiveTicket)archivePane.replaceChildren(make("p","vatra-albums-hint-001",t("Не вдалося завантажити фото.","Could not load photos.")));}
  }
  function decoratePhotoAction(el,kind){const icon=window.VATRA_POST_MEDIA?.photoMenuIcon(kind);if(icon){const label=make("span","vatra-photo-menu-label-001",el.textContent);el.replaceChildren(icon,label);}return el;}
  function photoActionButtons(row,album){
   if(!row||!album)return [];
   const items=[
    [t("Завантажити","Download"),()=>void downloadPhoto(row),false],
    [t("Перейти до альбому","Go to album"),()=>goToAlbum(album),false],
    [t("Поділитися","Share"),()=>void sharePhoto(row,album),false]
   ];
   if(isMine)items.push(
    [t("Зробити фотографією профілю","Make profile photo"),async()=>{
     try{const {data,error}=await client.storage.from(BUCKET).download(row.media_path);if(error||!data)throw Error("Photo unavailable");if(photoDialog.open)photoDialog.close();await window.VATRA_USE_PHOTO_AS_AVATAR?.(data);}
     catch(_){notify(t("Не вдалося відкрити фото.","Could not open photo."));}
    },false],
    [t("Перемістити","Move"),()=>void chooseDestination([row]),false],
    [row.archived_at?t("Відновити","Restore"):t("Архівувати","Archive"),()=>void archivePhotos([row],!!row.archived_at),false],
    [row.pinned_at?t("Відкріпити","Unpin"):t("Закріпити","Pin"),()=>void togglePin(row),false],
    [t("Видалити","Delete"),()=>void removePhoto(row),true]
   );
   return items.map(([label,fn,danger],index)=>{
    const kind=["download","album","share","avatar","move",row.archived_at?"restore":"archive","pin","trash"][index];
    const item=decoratePhotoAction(button(danger?"vatra-album-photo-menu-danger-001":"vatra-album-photo-menu-item-001",label,fn),kind);
    item.addEventListener("click",()=>{photoMore.open=false;});
    return item;
   });
  }
  function comparePhotos(a,b){
   const pinnedA=a.pinned_at?Date.parse(a.pinned_at):0;
   const pinnedB=b.pinned_at?Date.parse(b.pinned_at):0;
   return pinnedB-pinnedA||Date.parse(b.created_at)-Date.parse(a.created_at)||
    String(b.id).localeCompare(String(a.id));
  }
  function makePhotoTile(photo,album){
   const wrap=make("div","ui-vatra-album-photo-card-001");
   const tile=button("vatra-album-photo-tile-001","");
   const img=make("img","ui-vatra-album-photo-image-001");paintImage(img,photo.media_path);
   tile.append(img);
   tile.setAttribute("aria-label",t("Відкрити фотографію","Open photograph"));
   tile.addEventListener("click",()=>{if(selectionMode&&isMine)selectPhoto(photo);else void openPhoto(photo,album);});
   wrap.append(tile);
   if(isMine){
    const mark=button("vatra-album-select-photo-001","",()=>selectPhoto(photo));mark.dataset.vatraSelectPhoto=photo.id;mark.hidden=!selectionMode;mark.setAttribute("aria-label",t("Вибрати фотографію","Select photo"));mark.setAttribute("aria-pressed",String(selectedPhotos.has(photo.id)));wrap.append(mark);
   }
   if(photo.pinned_at)wrap.append(make("span","vatra-album-photo-pin-001",t("Закріплено","Pinned")));
   const menu=make("details","ui-vatra-album-tile-menu-001");
   const trigger=make("summary","vatra-album-tile-menu-trigger-001","•••");
   trigger.setAttribute("aria-label",t("Дії з фотографією","Photo actions"));
   const dots=window.VATRA_POST_MEDIA?.photoMenuIcon("dots");if(dots)trigger.replaceChildren(dots);
   const list=make("div","ui-vatra-album-tile-menu-items-001");
   for(const action of photoActionButtons(photo,album)){
    action.addEventListener("click",()=>{menu.open=false;});
    list.append(action);
   }
   if(isMine)list.append(decoratePhotoAction(button("vatra-album-photo-menu-item-001",t("Вибрати декілька","Select multiple"),()=>{menu.open=false;selectPhoto(photo);}),"select"));
   menu.append(trigger,list);wrap.append(menu);
   window.VATRA_POST_MEDIA.bindPhotoTileMenu(menu,trigger);
   return wrap;
  }
  async function openPhoto(row,album,direction=0){
   const finishSlide=window.VATRA_POST_MEDIA?.beginPhotoSlide(photoContent,photoImage,direction);
   state.currentPhoto=row;paintDescription();
   photoCaption.textContent=album.is_personal?t("Фото користувача","Member photo"):
    t("Фото з альбому «","Photo from album “")+album.title+(lang()==="en"?"”":"»");
   photoDelete.hidden=!isMine;
   photoImage.removeAttribute("src");photoLiked=false;photoLikeCount=0;
   photoLoading.hidden=false;photoLoading.classList.add("vatra-skeleton-block","is-skeleton");photoLoading.textContent="";
   photoLike.disabled=true;paintPhotoLike();
   photoMoreItems.replaceChildren(...photoActionButtons(row,album));
   photoAuthorImage.style.backgroundImage=state.avatar?.url?"url("+JSON.stringify(state.avatar.url)+")":"";
   photoAuthorImage.classList.toggle("has-photo",!!state.avatar?.url);
   photoAuthorName.textContent=document.querySelector("#profile-heading")?.textContent?.trim()||t("Користувач VATRA","VATRA user");
   const when=Date.parse(row.created_at||"");
   photoAuthorDate.hidden=!Number.isFinite(when);
   if(Number.isFinite(when)){
    photoAuthorDate.dateTime=new Date(when).toISOString();
    photoAuthorDate.textContent=window.VATRA_PRESENCE?.relative?.(row.created_at,lang()==="en")||
     new Intl.DateTimeFormat(lang()==="en"?"en-US":"uk-UA",{dateStyle:"medium",timeStyle:"short"}).format(when);
   }
   void window.VATRA_VERIFIED?.attach?.(client,photoAuthorName,targetId);
   if(!photoDialog.open)photoDialog.showModal();void loadPhotoLikes(row);void openComments(album,row);
   photoContent.querySelectorAll(".vatra-post-gallery-nav-prev,.vatra-post-gallery-nav-next,.vatra-post-gallery-counter-001").forEach(el=>el.remove());
   const currentItems=()=>state.tab==="archive"?archivedRows:state.tab==="albums"?state.photos:state.previews;
   const hasMore=()=>state.tab==="archive"?archiveHasMore:state.tab==="albums"?state.photoHasMore:state.featuredHasMore;
   const index=currentItems().findIndex(item=>item.id===row.id);
   let stepping=false;
   const step=async dir=>{
    if(stepping||!photoDialog.open||state.currentPhoto!==row)return;stepping=true;
    try{
     let next=currentItems()[index+dir];
     if(!next&&dir>0&&hasMore()){
      if(state.tab==="archive")await loadArchive(true);else if(state.tab==="albums")await loadAlbumPage(album.id,true);else await loadFeaturedPage(true);
      if(!photoDialog.open||state.currentPhoto!==row)return;
      next=currentItems()[index+dir];
     }
     const nextAlbum=state.albums.find(a=>a.id===next?.album_id);
     if(next&&nextAlbum)await openPhoto(next,nextAlbum,dir);
     else{photoContent.querySelectorAll(".vatra-post-gallery-nav-prev,.vatra-post-gallery-nav-next,.vatra-post-gallery-counter-001").forEach(el=>el.remove());window.VATRA_POST_MEDIA?.photoNavigation(photoContent,index,currentItems().length,step,hasMore());}
    }finally{stepping=false;}
   };
   if(index>=0)window.VATRA_POST_MEDIA?.photoNavigation(photoContent,index,currentItems().length,step,hasMore());
   photoDialog.onkeydown=event=>{if(event.target.closest("textarea,input,[contenteditable]"))return;if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();step(event.key==="ArrowLeft"?-1:1);}};
   void (async()=>{
    try{
     const result=await window.VATRA_PUBLIC_NAMES?.get?.(client,[Number(targetId)]);
     if(photoDialog.open&&state.currentPhoto===row&&result?.data?.[0]?.display_name)
      photoAuthorName.textContent=result.data[0].display_name;
     if(photoDialog.open&&state.currentPhoto===row)void window.VATRA_VERIFIED?.attach?.(client,photoAuthorName,targetId);
    }catch(_){}
   })();
   try{const url=await signedUrl(row.media_path);if(photoDialog.open&&state.currentPhoto===row){photoImage.src=url;window.VATRA_POST_MEDIA?.watchPhotoViewer(photoDialog,photoContent,photoImage,finishSlide);}}
   catch(_){if(photoDialog.open&&state.currentPhoto===row){notify(t("Фото недоступне.","Photo unavailable."));photoDialog.close();}}
  }
  async function removePhoto(row=state.currentPhoto){
   if(!isMine||!row||state.busy)return;
   if(!await askDelete(t("Видалити фотографію?","Delete photo?"),t("Цю дію неможливо скасувати.","This action cannot be undone.")))return;
   state.busy=true;
   try{
    const {data,error}=await client.from("album_photos").delete().eq("id",row.id).eq("owner_vatra_id",ownId).select("id").maybeSingle();
    if(error||!data)throw error||Error("Not deleted");
    signed.delete(row.media_path);
    if(photoDialog.open&&state.currentPhoto?.id===row.id)photoDialog.close();
    state.photos=state.photos.filter(item=>item.id!==row.id);state.previews=state.previews.filter(item=>item.id!==row.id);archivedRows=archivedRows.filter(item=>item.id!==row.id);
    const cleanup=client.storage.from(BUCKET).remove([row.media_path]);
    const [removed]=await Promise.all([cleanup,refreshPhotoLists()]);
    if(removed.error)throw removed.error;
    notify(t("Фотографію видалено.","Photo deleted."),"success");
   }catch(_){notify(t("Не вдалося видалити фотографію.","Could not delete photo."));}
   finally{state.busy=false;}
  }
  async function removeAlbum(album){
   if(!isMine||state.busy)return;
   if(!await askDelete(t("Видалити альбом?","Delete album?"),t("Усі фото й коментарі альбому будуть видалені. Відновлення неможливе.","All photos and comments will be deleted permanently.")))return;
   state.busy=true;
   try{
    const {data:photos,error:photoError}=await client.from("album_photos")
     .select("media_path").eq("album_id",album.id).limit(1000);
    if(photoError)throw photoError;
    if((photos||[]).length>=1000)throw Error("Cannot safely purge an oversized album");
    const {data:deleted,error}=await client.from("photo_albums").delete().eq("id",album.id).eq("owner_vatra_id",ownId).select("id").maybeSingle();
    if(error||!deleted)throw error||Error("Not deleted");
    for(let i=0;i<(photos||[]).length;i+=50)
     await client.storage.from(BUCKET).remove(photos.slice(i,i+50).map(p=>p.media_path));
    state.selected=null;await loadAlbums();switchTab("albums");
    notify(t("Альбом видалено.","Album deleted."),"success");
   }catch(_){notify(t("Не вдалося видалити альбом.","Could not delete album."));}
   finally{state.busy=false;}
  }
  function albumCard(album,photo){
   const card=button("vatra-albums-card-001","");
   const cover=make("span","ui-vatra-albums-cover-001");
   const img=make("img","ui-vatra-albums-cover-image-001");
   if(photo)paintImage(img,photo.media_path);else cover.classList.add("is-empty");
   cover.append(img);
   if(!photo)cover.append(svg("ui-vatra-albums-placeholder-icon-001","albums"));
   const details=make("span","ui-vatra-albums-card-copy-001");
   details.append(make("strong","vatra-albums-card-title-001",album.title),
    make("span","vatra-albums-card-count-001",t("Фотографій: ","Photos: ")+(album.count||0)));
   card.append(cover,details);
   card.addEventListener("click",()=>{
    endSelection();state.selected=album.id;history.replaceState(history.state,"",albumUrl(album.id));
    state.photos=[];state.photoAlbumId=album.id;state.photoHasMore=false;state.photosBusy=true;
    renderAlbumPane();void loadAlbumPage(album.id);
   });
   return card;
  }
  function renderAlbumPane(){
   albumPane.replaceChildren();
   if(!state.selected){
    const intro=make("div","ui-vatra-albums-intro-001");
    intro.append(make("h3","vatra-albums-section-heading-001",t("Ваші історії в альбомах","Stories in albums")));
    if(!isMine)intro.firstChild.textContent=t("Альбоми користувача","Member albums");
    intro.append(make("p","vatra-albums-intro-copy-001",t("Зберігайте важливі миті в окремих колекціях.","Keep memorable moments in their own collections.")));
    albumPane.append(intro);
    const grid=make("div","ui-vatra-albums-grid-001");
    const virtual=button("vatra-albums-card-001","");
    const cover=make("span","ui-vatra-albums-cover-001");
    if(state.avatar?.url){const img=make("img","ui-vatra-albums-cover-image-001");img.src=state.avatar.url;img.alt="";cover.append(img);}
    else{cover.classList.add("is-empty");cover.append(svg("ui-vatra-albums-placeholder-icon-001","image"));}
    const label=make("span","ui-vatra-albums-card-copy-001");
    label.append(make("strong","vatra-albums-card-title-001",t("Фото профілю","Profile photos")),
     make("span","vatra-albums-card-count-001",t("Фотографій: ","Photos: ")+(state.avatarList.length?state.avatarList.length+(state.avatarHasMore?"+":""):(state.avatar?.url?1:0))));
    virtual.append(cover,label);virtual.addEventListener("click",()=>window.VATRA_OPEN_PROFILE_AVATAR?.());
    grid.append(virtual);
    const visibleAlbums=state.albums.filter(album=>!album.is_personal);
    for(const album of visibleAlbums)
     grid.append(albumCard({...album,count:album.photo_count},album.cover_path?{media_path:album.cover_path}:null));
    albumPane.append(grid);
    if(isMine&&!visibleAlbums.length){
     const note=make("p","vatra-albums-hint-001",t("Створіть перший альбом для подорожей, близьких людей або улюблених подій.","Create your first collection for travels, people or favorite moments."));
     albumPane.append(note);
    }
    return;
   }
   const album=state.albums.find(a=>a.id===state.selected&&!a.is_personal);
   if(!album){state.selected=null;renderAlbumPane();return;}
   const head=make("div","ui-vatra-albums-detail-header-001");
   const back=addIcon(button("vatra-albums-back-001",t("Усі альбоми","All albums"),()=>{
    endSelection();state.selected=null;renderAlbumPane();
    const u=new URL(location.href);u.searchParams.delete("album");history.replaceState(history.state,"",u);
   }),"back");
   const titleBox=make("div","ui-vatra-albums-detail-copy-001");
   titleBox.append(make("h3","vatra-albums-detail-title-001",album.title));
   if(album.description)titleBox.append(make("p","vatra-albums-detail-description-001",album.description));
   titleBox.append(make("span","vatra-albums-detail-privacy-001",album.visibility==="private"?t("Лише я","Only me"):
    album.visibility==="friends"?t("Для друзів","Friends"):t("Для учасників VATRA","VATRA users")));
   const actions=make("div","ui-vatra-albums-detail-actions-001");
   const commentBtn=addIcon(button("vatra-albums-icon-button-001",t("Коментарі альбому","Album comments"),()=>void openComments(album,null)),"comments");
   actions.append(commentBtn);
   const share=button("vatra-albums-icon-button-001",t("Поділитися","Share"),async()=>{
    try{
     await navigator.clipboard.writeText(albumUrl(album.id));
     notify(t("Посилання на альбом скопійовано.","Album link copied."),"success");
    }catch(_){notify(t("Не вдалося скопіювати посилання.","Could not copy link."));}
   });
   actions.append(share);
   if(isMine){
    actions.append(addIcon(button("vatra-albums-icon-button-001",t("Редагувати","Edit"),()=>editAlbum(album)),"edit"),
     addIcon(button("vatra-albums-icon-button-001",t("Додати фотографії","Add photos"),()=>{state.uploadMode="album";uploadInput.click();}),"upload"),
     addIcon(button("vatra-albums-delete-button-001",t("Видалити альбом","Delete album"),()=>void removeAlbum(album)),"trash"));
   }
   head.append(back,titleBox,actions);albumPane.append(head);
   const grid=make("div","ui-vatra-album-photos-grid-001");
   const photos=state.photoAlbumId===album.id?[...state.photos].sort(comparePhotos):[];
   if(!photos.length){
    const blank=make("div","ui-vatra-album-photos-empty-001");
    blank.append(svg("ui-vatra-albums-empty-image-001","image"),
     make("p","vatra-albums-hint-001",state.photosBusy||album.photo_count>0?
      t("Завантаження фотографій…","Loading photos…"):
      t("У цьому альбомі поки немає фотографій.","This album has no photos yet.")));
    if(isMine&&!state.photosBusy&&album.photo_count===0)
     blank.append(button("vatra-albums-primary-001",t("Додати фотографії","Add photos"),()=>{state.uploadMode="album";uploadInput.click();}));
    albumPane.append(blank);
   }else{
    for(const photo of photos)grid.append(makePhotoTile(photo,album));
    albumPane.append(grid);
    if(state.photoHasMore){
     const morePhotos=button("vatra-albums-more-photos-001",
      t("Показати ще фото","Show more photos"),()=>void loadAlbumPage(album.id,true));
     morePhotos.disabled=state.photosBusy;albumPane.append(morePhotos);
    }
   }
  }
  async function loadAlbumPage(albumId,append=false){
   if(state.photosBusy&&append)return;
   const ticket=++state.photoTicket;
   state.photosBusy=true;state.photoAlbumId=albumId;
   if(!append){state.photoOffset=0;state.photos=[];}
   try{
    const offset=state.photoOffset;
    const {data,error}=await client.from("album_photos")
     .select("id,album_id,media_path,created_at,caption,pinned_at")
     .eq("album_id",albumId).is("archived_at",null).order("pinned_at",{ascending:false,nullsFirst:false})
     .order("created_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+PAGE_SIZE);
    if(error)throw error;
    if(ticket!==state.photoTicket||state.selected!==albumId)return;
    const page=(data||[]).slice(0,PAGE_SIZE);
    state.photos=append?[...state.photos,...page]:page;
    state.photoOffset+=page.length;
    state.photoHasMore=(data||[]).length>PAGE_SIZE;
    if(!append&&state.pendingPhotoId){
     const photoId=state.pendingPhotoId;state.pendingPhotoId=null;
     let photo=state.photos.find(item=>item.id===photoId);
     if(!photo){
      const lookup=await client.from("album_photos")
       .select("id,album_id,media_path,created_at,caption,pinned_at")
       .eq("album_id",albumId).eq("id",photoId).is("archived_at",null).maybeSingle();
      if(!lookup.error)photo=lookup.data;
     }
     const album=state.albums.find(item=>item.id===albumId);
     if(photo&&album&&ticket===state.photoTicket&&state.selected===albumId)void openPhoto(photo,album);
    }
   }catch(_){
    if(ticket===state.photoTicket)notify(t("Не вдалося завантажити фото.","Could not load photos."));
   }finally{
    if(ticket===state.photoTicket){state.photosBusy=false;if(state.tab==="albums")renderAlbumPane();}
   }
  }
  function renderFeatured(){
   featured.replaceChildren();queueMicrotask(updateSelection);
   if(window.VATRA_CAN_VIEW_PROFILE_AVATAR===true&&state.avatarList.length){
    const avatarGroup=make("section","ui-vatra-albums-source-group-001");
    avatarGroup.append(make("h3","vatra-albums-section-heading-001",t("Фото профілю","Profile photos")));
    const grid=make("div","ui-vatra-album-photos-grid-001");
    for(const photo of state.avatarList){
     const tile=button("vatra-album-photo-tile-001","");
     const img=make("img","ui-vatra-album-photo-image-001");
     img.src=photo.url;img.alt=t("Фото профілю","Profile photo");
     img.loading="lazy";img.decoding="async";
     tile.append(img);tile.setAttribute("aria-label",t("Відкрити фото профілю","Open profile photo"));
     const selectionRow={id:"avatar:"+photo.path,source:"avatar",media_path:photo.path};
     tile.addEventListener("click",()=>{if(selectionMode&&isMine)selectPhoto(selectionRow);else window.VATRA_OPEN_PROFILE_AVATAR?.(photo.path);});
     if(isMine){
      const wrap=make("div","ui-vatra-album-photo-card-001");wrap.append(tile);
      const mark=button("vatra-album-select-photo-001","○",()=>selectPhoto(selectionRow));mark.dataset.vatraSelectPhoto=selectionRow.id;mark.hidden=!selectionMode;mark.setAttribute("aria-label",t("Вибрати фотографію","Select photo"));wrap.append(mark);
      const menu=make("details","ui-vatra-album-tile-menu-001"),trigger=make("summary","vatra-album-tile-menu-trigger-001","•••"),list=make("div","ui-vatra-album-tile-menu-items-001");
      trigger.setAttribute("aria-label",t("Дії з фотографією","Photo actions"));
      const dots=window.VATRA_POST_MEDIA?.photoMenuIcon("dots");if(dots)trigger.replaceChildren(dots);
      const action=(label,fn)=>{const kind=label===t("Видалити","Delete")?"trash":label===t("Завантажити","Download")?"download":label===t("Вибрати декілька","Select multiple")?"select":"avatar";const item=decoratePhotoAction(button(kind==="trash"?"vatra-album-photo-menu-danger-001":"vatra-album-photo-menu-item-001",label,()=>{menu.open=false;void fn();}),kind);list.append(item);};
      action(t("Завантажити","Download"),async()=>{try{const {data,error}=await client.storage.from("avatars").download(photo.path);if(error||!data)throw Error("Unavailable");const url=URL.createObjectURL(data),link=make("a","vatra-album-download-link-001");link.href=url;link.download=photo.path.split("/").pop();document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);}catch(_){notify(t("Не вдалося завантажити фотографію.","Could not download photo."));}});
      if(state.avatar?.path!==photo.path)action(t("Зробити фотографією профілю","Make profile photo"),()=>window.VATRA_SET_HISTORY_AVATAR?.(photo.path));
      action(t("Відкрити фото профілю","Open profile photo"),()=>window.VATRA_OPEN_PROFILE_AVATAR?.(photo.path));
      action(t("Вибрати декілька","Select multiple"),()=>selectPhoto(selectionRow));
      action(t("Видалити","Delete"),()=>deleteSelected([selectionRow]));
      menu.append(trigger,list);wrap.append(menu);
      window.VATRA_POST_MEDIA.bindPhotoTileMenu(menu,trigger);
      grid.append(wrap);
     }else grid.append(tile);
    }
    avatarGroup.append(grid);
    if(state.avatarHasMore){
     const next=button("vatra-albums-more-photos-001",
      t("Ще фотографії профілю","More profile photos"),()=>void loadAvatarPage(true));
     next.disabled=state.avatarBusy;avatarGroup.append(next);
    }
    featured.append(avatarGroup);
   }
   const selected=state.albums.filter(a=>a.show_in_photos);
   const photos=state.previews.filter(p=>selected.some(a=>a.id===p.album_id)).sort(comparePhotos);
   if(!photos.length)return;
   const head=make("div","ui-vatra-albums-featured-head-001");
   head.append(make("h3","vatra-albums-section-heading-001",t("Фотографії користувача й альбомів","User and album photos")));
   const open=button("vatra-albums-text-button-001",t("Усі альбоми","All albums"),()=>switchTab("albums"));
   head.append(open);featured.append(head);
   const grid=make("div","ui-vatra-album-photos-grid-001");
   for(const photo of photos){
    const album=selected.find(a=>a.id===photo.album_id);
    if(!album)continue;
    grid.append(makePhotoTile(photo,album));
   }
   featured.append(grid);
   if(state.featuredHasMore){
    const next=button("vatra-albums-more-photos-001",t("Ще фотографії","More photos"),
     ()=>void loadFeaturedPage(true));
    next.disabled=state.featuredBusy;featured.append(next);
   }
  }
  async function loadFeaturedPage(append=false){
   if(state.featuredBusy)return;
   const ids=state.albums.filter(album=>album.show_in_photos).map(album=>album.id);
   if(!ids.length){state.previews=[];state.featuredHasMore=false;renderFeatured();return;}
   state.featuredBusy=true;
   const offset=append?state.featuredOffset:0;
   try{
    const {data,error}=await client.from("album_photos")
     .select("id,album_id,media_path,created_at,caption,pinned_at").in("album_id",ids).is("archived_at",null)
     .order("pinned_at",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false}).order("id",{ascending:false})
     .range(offset,offset+FEATURED_LIMIT);
    if(error)throw error;
    const rows=(data||[]).slice(0,FEATURED_LIMIT);
    state.previews=append?[...state.previews,...rows]:rows;
    state.featuredOffset=offset+rows.length;
    state.featuredHasMore=(data||[]).length>FEATURED_LIMIT;
   }catch(_){if(!append)state.previews=[];}
   finally{state.featuredBusy=false;if(state.tab==="photos")renderFeatured();}
  }
  async function loadAvatarPage(append=false){
   if(window.VATRA_CAN_VIEW_PROFILE_AVATAR!==true||state.avatarBusy)return;
   state.avatarBusy=true;state.avatarChecked=true;
   try{
    const folder=targetId+"/avatar",bucket=client.storage.from("avatars");
    const offset=append?state.avatarOffset:0;
    const {data,error}=await bucket.list(folder,{limit:24,offset,
     sortBy:{column:"created_at",order:"desc"}});
    if(error)throw error;
    if(!append){state.avatarList=[];state.avatarOffset=0;}
    const seen=new Set(state.avatarList.map(item=>item.path));
    for(const item of data||[]){
     if(!/^[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(item.name||"")||
       /-original\.(?:jpe?g|png|webp)$/i.test(item.name||""))continue;
     const path=folder+"/"+item.name,url=bucket.getPublicUrl(folder+"/"+item.name)?.data?.publicUrl;
     if(url&&!seen.has(path)){state.avatarList.push({path,url});seen.add(path);}
    }
    state.avatarOffset=offset+(data||[]).length;
    state.avatarHasMore=(data||[]).length===24&&state.avatarOffset<2000;
   }catch(_){state.avatarHasMore=false;
    if(!state.avatarList.length&&state.avatar?.url&&state.avatar?.path)
     state.avatarList=[{path:state.avatar.path,url:state.avatar.url}];
   }finally{state.avatarBusy=false;if(state.tab==="photos")renderFeatured();else if(state.tab==="albums"&&state.loaded)renderAlbumPane();}
  }
  let albumsLoading=null;
  async function loadAlbums(){
   if(albumsLoading)return albumsLoading;
   const ticket=++state.rev;
   if(state.tab==="albums")loading(albumPane);
   const task=(async()=>{
    const [albumsResult,avatarResult]=await Promise.all([
     client.from("photo_album_summaries")
      .select("id,title,description,visibility,comments_mode,show_in_photos,created_at,photo_count,cover_path,is_personal")
      .eq("owner_vatra_id",targetId).order("created_at",{ascending:false}).limit(200),
     client.from("profile_media").select("avatar_path").eq("vatra_id",targetId).maybeSingle()
    ]);
    if(ticket!==state.rev)return;
    if(albumsResult.error){
     albumPane.replaceChildren(make("p","vatra-albums-error-001",
      t("Не вдалося завантажити альбоми.","Could not load albums.")));
     return;
    }
    state.avatar=null;
    const av=avatarResult.data?.avatar_path;
    if(typeof av==="string"&&av.startsWith(targetId+"/avatar/")){
     const url=client.storage.from("avatars").getPublicUrl(av)?.data?.publicUrl;
     if(url)state.avatar={url,path:av};
    }
    state.albums=albumsResult.data||[];
    state.previews=[];state.featuredOffset=0;state.featuredHasMore=false;
    await loadFeaturedPage();
    if(ticket!==state.rev)return;
    state.loaded=true;
    renderFeatured();
    if(window.VATRA_CAN_VIEW_PROFILE_AVATAR===true&&!state.avatarChecked)
     void loadAvatarPage();
    if(state.selected&&state.albums.some(a=>a.id===state.selected&&!a.is_personal)){
     state.photos=[];state.photoAlbumId=state.selected;state.photosBusy=true;
     if(state.tab==="albums")renderAlbumPane();
     void loadAlbumPage(state.selected);
    }else{
     state.selected=null;
     if(state.tab==="albums")renderAlbumPane();
    }
   })();
   albumsLoading=task;
   try{await task;}finally{if(albumsLoading===task)albumsLoading=null;}
  }
  async function ensurePersonalAlbum(){
   const existing=state.albums.find(album=>album.is_personal);
   if(existing)return existing;
   const found=await client.from("photo_albums")
    .select("id").eq("owner_vatra_id",Number(ownId)).eq("is_personal",true).maybeSingle();
   if(found.error)throw found.error;
   if(found.data)return found.data;
   const values={owner_vatra_id:Number(ownId),title:t("Фото користувача","User photos"),
    description:"",visibility:"public",comments_mode:"everyone",
    show_in_photos:true,is_personal:true};
   const result=await client.from("photo_albums").insert(values).select("id").single();
   if(result.error){
    const retry=await client.from("photo_albums").select("id")
     .eq("owner_vatra_id",Number(ownId)).eq("is_personal",true).maybeSingle();
    if(!retry.error&&retry.data)return retry.data;
    throw result.error;
   }
   return result.data;
  }
  const uploadDialog=make("dialog","ui-vatra-album-upload-dialog-001");
  const uploadBox=make("section","ui-vatra-album-upload-box-001");
  const uploadHead=make("div","ui-vatra-album-upload-head-001");
  const uploadHeading=make("h3","vatra-album-upload-heading-001",t("Завантаження фотографій","Uploading photos"));
  const uploadStatus=make("p","vatra-album-upload-status-001");
  const uploadBar=make("progress","vatra-album-upload-bar-001");uploadBar.max=1;uploadBar.value=0;
  const uploadGrid=make("div","ui-vatra-album-upload-grid-001");
  const uploadFinish=button("vatra-album-upload-finish-001",t("Закрити","Close"),()=>uploadDialog.close());
  uploadFinish.disabled=true;
  uploadHead.append(uploadHeading,uploadStatus);
  uploadBox.append(uploadHead,uploadBar,uploadGrid,uploadFinish);uploadDialog.append(uploadBox);
  document.body.append(uploadDialog);
  let uploadPreviewUrls=[];
  uploadDialog.addEventListener("cancel",event=>{if(!uploadFinish.disabled)uploadDialog.close();else event.preventDefault();});
  uploadDialog.addEventListener("close",()=>{
   for(const url of uploadPreviewUrls)URL.revokeObjectURL(url);
   uploadPreviewUrls=[];uploadGrid.replaceChildren();
  });
  function showUploadBatch(files){
   uploadGrid.replaceChildren();uploadPreviewUrls=[];
   uploadBar.max=files.length;uploadBar.value=0;uploadFinish.disabled=true;
   uploadStatus.textContent=t("Завантажено 0 із ","Uploaded 0 of ")+files.length;
   const rows=files.map(file=>{
    const card=make("article","ui-vatra-album-upload-file-001");
    const image=make("img","vatra-album-upload-preview-001");
    const url=URL.createObjectURL(file);uploadPreviewUrls.push(url);
    image.src=url;image.alt="";image.decoding="async";
    const name=make("span","vatra-album-upload-file-name-001",file.name);
    const status=make("span","vatra-album-upload-file-status-001",t("У черзі","Queued"));
    card.append(image,name,status);uploadGrid.append(card);
    return status;
   });
   uploadDialog.showModal();
   return rows;
  }
  uploadInput.addEventListener("change",async()=>{
   const direct=state.uploadMode==="personal";
   const files=[...uploadInput.files||[]];uploadInput.value="";
   if(!isMine||!validId(ownId)||!files.length||state.busy)return;
   if(files.length>PHOTO_LIMIT){notify(t("За раз можна додати не більше 8 фотографій.","Choose up to 8 photos at a time."));return;}
   if(files.some(f=>!["image/jpeg","image/png","image/webp"].includes(f.type)||!f.size||f.size>MAX_SIZE)){
    notify(t("Потрібні JPG, PNG або WebP до 30 МБ.","Use JPG, PNG or WebP up to 30 MB."));return;
   }
   state.busy=true;uploadDirect.disabled=true;let done=0,failed=0;
   const progressRows=showUploadBatch(files);
   const updateProgress=()=>{
    uploadBar.value=done+failed;
    uploadStatus.textContent=t("Завантажено ","Uploaded ")+done+
     t(" із "," of ")+files.length+(failed?t(" · помилок: "," · failed: ")+failed:"");
   };
   try{
    const album=direct?await ensurePersonalAlbum():state.albums.find(a=>a.id===state.selected);
    if(!album)throw Error("Album unavailable");
    const uploadOne=async(file,index)=>{
     const status=progressRows[index];
     status.textContent=t("Завантажується…","Uploading…");
     const ext=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";
     const path=ownId+"/albums/"+album.id+"/"+crypto.randomUUID()+"."+ext;
     const {error:uploadError}=await client.storage.from(BUCKET).upload(path,file,
      {contentType:file.type,cacheControl:"120",upsert:false});
     if(uploadError)throw uploadError;
     const {error:insertError}=await client.from("album_photos").insert({
      album_id:album.id,owner_vatra_id:Number(ownId),media_path:path
     });
     if(insertError){
      await client.storage.from(BUCKET).remove([path]).catch(()=>{});
      throw insertError;
     }
     status.textContent=t("Завантажено","Uploaded");
     done++;updateProgress();return true;
    };
    for(let i=0;i<files.length;i+=2){
     const results=await Promise.allSettled(files.slice(i,i+2).map((file,k)=>uploadOne(file,i+k)));
     for(let k=0;k<results.length;k++){
      if(results[k].status==="rejected"){
       progressRows[i+k].textContent=t("Помилка","Failed");
       failed++;updateProgress();
      }
     }
    }
    if(done)notify(t("Додано фотографій: ","Photos added: ")+done,"success");
    else notify(t("Не вдалося додати фотографії.","Could not add photos."));
    if(direct){state.selected=null;state.tab="photos";}
    await loadAlbums();
    if(!direct&&state.tab==="albums"&&state.selected)renderAlbumPane();
    else{switchTab("photos");renderFeatured();}
   }catch(_){
    notify(t("Не вдалося додати фотографії.","Could not add photos."));
    if(!done){failed=Math.max(failed,files.length);updateProgress();}
   }finally{
    state.busy=false;uploadDirect.disabled=false;state.uploadMode="album";
    uploadFinish.disabled=false;
    uploadFinish.textContent=t("Готово","Done");
   }
  });
  const photoTab=document.querySelector("#profile-tab-photos");
  const syncArchive=()=>{
   if(!isMine)return;
   if(!archiveSection.hidden){if(state.tab!=="archive")switchTab("archive");}
   else if(state.tab==="archive")switchTab("photos");
  };
  const activatePhotos=()=>{
   if(photoTab?.getAttribute("aria-selected")==="true"&&!state.loaded)void loadAlbums();
  };
  if(photoTab)new MutationObserver(activatePhotos).observe(photoTab,
   {attributes:true,attributeFilter:["aria-selected"]});
  if(isMine)new MutationObserver(syncArchive).observe(archiveSection,{attributes:true,attributeFilter:["hidden"]});
  syncArchive();activatePhotos();
  const photoParams=new URLSearchParams(location.search);
  const requested=photoParams.get("album");
  if(requested&&validUUID(requested)){
   const incomingPhoto=photoParams.get("photo");
   state.pendingPhotoId=validUUID(incomingPhoto)?incomingPhoto:null;
   state.selected=requested;
   queueMicrotask(()=>{photoTab?.click();switchTab("albums");});
  }
  window.addEventListener("vatra:profile-media-changed",()=>{state.avatarChecked=false;state.avatarList=[];state.avatarOffset=0;if(state.loaded)void loadAlbums();});
 }
 window.VATRA_ALBUMS={mount};
})();