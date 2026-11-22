(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const BUCKET="album-photos",PHOTO_LIMIT=8,MAX_SIZE=31457280;
 const validId=id=>/^[1-9][0-9]{0,18}$/.test(String(id||""));
 const validUUID=id=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(id||""));
 const lang=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
 const t=(uk,en)=>lang()==="en"?en:uk;
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
  el.setAttribute("stroke-width","1.7");el.setAttribute("stroke-linecap","round");
  el.setAttribute("stroke-linejoin","round");el.setAttribute("aria-hidden","true");
  const paths={
   albums:"M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 11h18",
   image:"M4 4h16v16H4zM7 16l4-5 3 3 2-2 3 4M8.5 8.5h.01",
   plus:"M12 5v14M5 12h14",back:"m15 18-6-6 6-6",
   close:"M5 5l14 14M19 5 5 19",
   comments:"M20 11a8 8 0 0 1-8 8 8 8 0 0 1-4-1l-5 2 2-5a8 8 0 1 1 15-4z",
   upload:"M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4",
   settings:"M4 7h16M7 7v4M4 17h16M17 13v4",
   trash:"M4 7h16M10 11v7m4-7v7M6 7l1 14h10l1-14M9 7V4h6v3",
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
  const section=document.querySelector("#profile-photos-section");
  if(!section||section.dataset.vatraAlbumsReady==="true"||!validId(targetId))return;
  section.dataset.vatraAlbumsReady="true";
  const heading=section.querySelector(".vatra-profile-photos-title-001");
  const gallery=section.querySelector("#profile-photo-gallery");
  const empty=section.querySelector("#profile-photos-empty");
  const more=section.querySelector("#profile-photos-more");
  if(!heading||!gallery||!empty||!more)return;
  const postPane=make("div","ui-vatra-albums-post-pane-001");
  const albumPane=make("div","ui-vatra-albums-pane-001");
  const albumGrid=make("div","ui-vatra-albums-grid-001");
  const featured=make("section","ui-vatra-albums-featured-001");
  const controls=make("div","ui-vatra-albums-controls-001");
  const tabs=make("div","ui-vatra-albums-tabs-001");
  const postTab=button("vatra-albums-tab-001 is-active",t("Знімки","Photos"),()=>switchTab("photos"));
  const albumTab=button("vatra-albums-tab-001",t("Альбоми","Albums"),()=>switchTab("albums"));
  postTab.setAttribute("aria-pressed","true");albumTab.setAttribute("aria-pressed","false");
  const create=addIcon(button("vatra-albums-primary-001",t("Створити альбом","Create album"),()=>editAlbum(null)),"plus");
  create.hidden=!isMine;
  tabs.append(postTab,albumTab);controls.append(tabs,create);
  postPane.append(gallery,empty,more,featured);
  albumPane.append(albumGrid);albumPane.hidden=true;
  heading.after(controls,postPane,albumPane);
  const uploadInput=make("input","ui-vatra-albums-file-input-001");
  uploadInput.type="file";uploadInput.multiple=true;uploadInput.accept="image/jpeg,image/png,image/webp";uploadInput.hidden=true;
  section.append(uploadInput);
  const state={albums:[],previews:[],selected:null,currentPhoto:null,avatar:null,tab:"photos",busy:false,loaded:false,rev:0};
  const signed=new Map();
  async function signedUrl(path){
   const old=signed.get(path);
   if(old&&old.until>Date.now())return old.url;
   const {data,error}=await client.storage.from(BUCKET).createSignedUrl(path,120);
   if(error||!data?.signedUrl)throw error||Error("Photo URL unavailable");
   signed.set(path,{url:data.signedUrl,until:Date.now()+100000});
   if(signed.size>160)signed.delete(signed.keys().next().value);
   return data.signedUrl;
  }
  function paintImage(image,path){
   image.alt="";image.loading="lazy";image.decoding="async";
   if(!path)return;
   void signedUrl(path).then(url=>{if(image.isConnected&&image.dataset.path===path)image.src=url;})
    .catch(()=>{image.classList.add("is-unavailable");});
   image.dataset.path=path;
  }
  function loading(el){
   el.replaceChildren(make("p","vatra-albums-hint-001",t("Завантаження альбомів…","Loading albums…")));
  }
  function albumUrl(id){
   const url=new URL(location.href);url.searchParams.set("album",id);url.searchParams.delete("photo");
   return url.href;
  }
  function switchTab(which){
   state.tab=which;postTab.classList.toggle("is-active",which==="photos");
   albumTab.classList.toggle("is-active",which==="albums");
   postTab.setAttribute("aria-pressed",String(which==="photos"));
   albumTab.setAttribute("aria-pressed",String(which==="albums"));
   postPane.hidden=which!=="photos";albumPane.hidden=which!=="albums";
   create.hidden=!isMine||which!=="albums";
   if(which==="albums"){if(!state.loaded)void loadAlbums();else renderAlbumPane();}
   else if(state.loaded)renderFeatured();
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
  options(visibility,[["public",t("Учасники VATRA","VATRA members")],
   ["friends",t("Мої друзі","My friends")],["private",t("Лише я","Only me")]]);
  options(comments,[["everyone",t("Усі, хто бачить альбом","Anyone who can view the album")],
   ["friends",t("Тільки друзі","Friends only")],["off",t("Вимкнені","Off")]]);
  const showWrap=make("label","ui-vatra-albums-check-wrap-001");
  const showInPhotos=make("input","ui-vatra-albums-check-001");showInPhotos.type="checkbox";showInPhotos.checked=true;
  showWrap.append(showInPhotos,make("span","vatra-albums-check-label-001",t("Показувати знімки у вкладці «Знімки»","Show photos in the Photos tab")));
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
  const photoDialog=make("dialog","ui-vatra-album-viewer-001");
  const photoStage=make("div","ui-vatra-album-viewer-stage-001");
  const photoImage=make("img","ui-vatra-album-viewer-image-001");photoImage.alt=t("Фото з альбому","Album photo");
  const photoClose=addIcon(button("vatra-album-viewer-close-001","",()=>photoDialog.close()),"close");
  photoClose.setAttribute("aria-label",t("Закрити фото","Close photo"));
  const photoBottom=make("div","ui-vatra-album-viewer-bottom-001");
  const photoCaption=make("span","vatra-album-viewer-caption-001");
  const photoDelete=addIcon(button("vatra-album-viewer-delete-001",t("Видалити","Delete"),()=>void removePhoto()),"trash");
  photoDelete.hidden=!isMine;photoBottom.append(photoCaption,photoDelete);
  photoStage.append(photoClose,photoImage,photoBottom);photoDialog.append(photoStage);
  photoDialog.addEventListener("click",e=>{if(e.target===photoDialog)photoDialog.close();});
  photoDialog.addEventListener("close",()=>{photoImage.removeAttribute("src");state.currentPhoto=null;});
  document.body.append(photoDialog);
  const commentsDialog=make("dialog","ui-vatra-album-comments-dialog-001");
  const commentsBox=make("section","ui-vatra-album-comments-box-001");
  const commentsHead=make("div","ui-vatra-album-comments-head-001");
  const commentsTitle=make("h3","vatra-album-comments-title-001");
  const commentsClose=addIcon(button("vatra-album-comments-close-001","",()=>commentsDialog.close()),"close");
  commentsClose.setAttribute("aria-label",t("Закрити","Close"));commentsHead.append(commentsTitle,commentsClose);
  const commentsList=make("div","ui-vatra-album-comments-list-001");
  const commentsForm=make("form","ui-vatra-album-comments-form-001");
  const commentsInput=make("textarea","ui-vatra-album-comments-input-001");
  commentsInput.maxLength=1000;commentsInput.rows=2;commentsInput.required=true;
  commentsInput.placeholder=t("Ваш коментар…","Write a comment…");
  const commentsSend=button("vatra-albums-primary-001",t("Надіслати","Send"));commentsSend.type="submit";
  commentsForm.append(commentsInput,commentsSend);
  commentsBox.append(commentsHead,commentsList,commentsForm);commentsDialog.append(commentsBox);
  document.body.append(commentsDialog);
  let commentAlbum=null;
  async function loadComments(album){
   commentsTitle.textContent=t("Обговорення альбому","Album discussion");
   loading(commentsList);
   try{
    const {data,error}=await client.from("photo_album_comments")
      .select("id,author_vatra_id,author_id,body,created_at")
      .eq("album_id",album.id).order("created_at",{ascending:true}).limit(100);
    if(error)throw error;
    const ids=[...new Set((data||[]).map(r=>Number(r.author_vatra_id)))];
    const result=ids.length?await window.VATRA_PUBLIC_NAMES?.get(client,ids):null;
    const names=new Map((result?.data||[]).map(r=>[String(r.vatra_id),r.display_name]));
    commentsList.replaceChildren();
    if(!data?.length)commentsList.append(make("p","vatra-albums-hint-001",t("Коментарів поки немає. Почніть розмову.","No comments yet. Start the conversation.")));
    for(const item of data||[]){
     const row=make("article","ui-vatra-album-comment-001");
     const info=make("div","ui-vatra-album-comment-author-001");
     const author=make("a","vatra-album-comment-name-001",names.get(String(item.author_vatra_id))||t("Учасник VATRA","VATRA member"));
     author.href=new URL("id"+item.author_vatra_id,new URL(".",location.href)).href;
     info.append(author,make("time","vatra-album-comment-date-001",
      new Intl.DateTimeFormat(lang()==="en"?"en-US":"uk-UA",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.created_at))));
     row.append(info,make("p","vatra-album-comment-body-001",item.body));
     if(isMine||String(item.author_id)===String(userId)){
      const remove=button("vatra-album-comment-delete-001",t("Видалити","Delete"),async()=>{
       if(!await askDelete(t("Видалити коментар?","Delete comment?"),t("Коментар буде видалено без відновлення.","This comment cannot be restored.")))return;
       const {error:e}=await client.from("photo_album_comments").delete().eq("id",item.id);
       if(e)notify(t("Не вдалося видалити коментар.","Could not delete comment."));
       else void loadComments(album);
      });
      row.append(remove);
     }
     commentsList.append(row);
    }
   }catch(_){commentsList.replaceChildren(make("p","vatra-albums-error-001",t("Не вдалося завантажити коментарі.","Could not load comments.")));}
  }
  async function openComments(album){
   commentAlbum=album;
   commentsInput.value="";
   commentsForm.hidden=album.comments_mode==="off";
   if(album.comments_mode==="friends"&&!isMine){
    const {data,error}=await client.from("friendships").select("id")
     .eq("status","accepted")
     .or("and(requester_id.eq."+ownId+",recipient_id.eq."+targetId+"),and(recipient_id.eq."+ownId+",requester_id.eq."+targetId+")").limit(1);
    commentsForm.hidden=!!error||!data?.length;
   }
   commentsDialog.showModal();void loadComments(album);
  }
  commentsForm.addEventListener("submit",async e=>{
   e.preventDefault();if(!commentAlbum||!validId(ownId)||!validUUID(userId))return;
   const body=commentsInput.value.trim();if(!body||body.length>1000)return;
   commentsSend.disabled=true;
   try{
    const {error}=await client.from("photo_album_comments").insert({
     album_id:commentAlbum.id,author_id:userId,author_vatra_id:Number(ownId),body
    });
    if(error)throw error;
    commentsInput.value="";await loadComments(commentAlbum);
   }catch(_){notify(t("Не вдалося надіслати коментар.","Could not send comment."));}
   finally{commentsSend.disabled=false;}
  });
  async function openPhoto(row,album){
   state.currentPhoto=row;
   photoCaption.textContent=album.title;
   photoDelete.hidden=!isMine;
   photoImage.removeAttribute("src");
   photoDialog.showModal();
   try{const url=await signedUrl(row.media_path);if(photoDialog.open&&state.currentPhoto===row)photoImage.src=url;}
   catch(_){notify(t("Фото недоступне.","Photo unavailable."));photoDialog.close();}
  }
  async function removePhoto(){
   const row=state.currentPhoto;
   if(!isMine||!row||state.busy)return;
   if(!await askDelete(t("Видалити фотографію?","Delete photo?"),t("Цю дію неможливо скасувати.","This action cannot be undone.")))return;
   state.busy=true;
   try{
    const {error}=await client.from("album_photos").delete().eq("id",row.id).eq("owner_vatra_id",ownId);
    if(error)throw error;
    await client.storage.from(BUCKET).remove([row.media_path]);
    signed.delete(row.media_path);photoDialog.close();await loadAlbums();renderAlbumPane();
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
    const {error}=await client.from("photo_albums").delete().eq("id",album.id).eq("owner_vatra_id",ownId);
    if(error)throw error;
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
   card.addEventListener("click",()=>{state.selected=album.id;history.replaceState(history.state,"",albumUrl(album.id));renderAlbumPane();});
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
     make("span","vatra-albums-card-count-001",t("Фотографій: ","Photos: ")+(state.avatar?.url?1:0)));
    virtual.append(cover,label);virtual.addEventListener("click",()=>window.VATRA_OPEN_PROFILE_AVATAR?.());
    grid.append(virtual);
    for(const album of state.albums){
     const photos=state.previews.filter(p=>p.album_id===album.id);
     grid.append(albumCard({...album,count:photos.length},photos[0]));
    }
    albumPane.append(grid);
    if(isMine&&!state.albums.length){
     const note=make("p","vatra-albums-hint-001",t("Створіть перший альбом для подорожей, близьких людей або улюблених подій.","Create your first collection for travels, people or favorite moments."));
     albumPane.append(note);
    }
    return;
   }
   const album=state.albums.find(a=>a.id===state.selected);
   if(!album){state.selected=null;renderAlbumPane();return;}
   const head=make("div","ui-vatra-albums-detail-header-001");
   const back=addIcon(button("vatra-albums-back-001",t("Усі альбоми","All albums"),()=>{
    state.selected=null;renderAlbumPane();
    const u=new URL(location.href);u.searchParams.delete("album");history.replaceState(history.state,"",u);
   }),"back");
   const titleBox=make("div","ui-vatra-albums-detail-copy-001");
   titleBox.append(make("h3","vatra-albums-detail-title-001",album.title));
   if(album.description)titleBox.append(make("p","vatra-albums-detail-description-001",album.description));
   titleBox.append(make("span","vatra-albums-detail-privacy-001",album.visibility==="private"?t("Лише я","Only me"):
    album.visibility==="friends"?t("Для друзів","Friends"):t("Для учасників VATRA","VATRA members")));
   const actions=make("div","ui-vatra-albums-detail-actions-001");
   const commentBtn=addIcon(button("vatra-albums-icon-button-001",t("Обговорення","Discussion"),()=>void openComments(album)),"comments");
   actions.append(commentBtn);
   const share=button("vatra-albums-icon-button-001",t("Поділитися","Share"),async()=>{
    try{
     await navigator.clipboard.writeText(albumUrl(album.id));
     notify(t("Посилання на альбом скопійовано.","Album link copied."),"success");
    }catch(_){notify(t("Не вдалося скопіювати посилання.","Could not copy link."));}
   });
   actions.append(share);
   if(isMine){
    actions.append(addIcon(button("vatra-albums-icon-button-001",t("Редагувати","Edit"),()=>editAlbum(album)),"settings"),
     addIcon(button("vatra-albums-icon-button-001",t("Додати фото","Add photos"),()=>uploadInput.click()),"upload"),
     addIcon(button("vatra-albums-delete-button-001",t("Видалити альбом","Delete album"),()=>void removeAlbum(album)),"trash"));
   }
   head.append(back,titleBox,actions);albumPane.append(head);
   const grid=make("div","ui-vatra-album-photos-grid-001");
   const photos=state.previews.filter(p=>p.album_id===album.id);
   if(!photos.length){
    const blank=make("div","ui-vatra-album-photos-empty-001");
    blank.append(svg("ui-vatra-albums-empty-image-001","image"),
     make("p","vatra-albums-hint-001",t("У цьому альбомі поки немає фотографій.","This album has no photos yet.")));
    if(isMine)blank.append(button("vatra-albums-primary-001",t("Завантажити фото","Upload photos"),()=>uploadInput.click()));
    albumPane.append(blank);
   }else{
    for(const photo of photos){
     const tile=button("vatra-album-photo-tile-001","");
     const img=make("img","ui-vatra-album-photo-image-001");paintImage(img,photo.media_path);
     tile.append(img);tile.setAttribute("aria-label",t("Відкрити фотографію","Open photo"));
     tile.addEventListener("click",()=>void openPhoto(photo,album));grid.append(tile);
    }
    albumPane.append(grid);
   }
  }
  function renderFeatured(){
   featured.replaceChildren();
   const selected=state.albums.filter(a=>a.show_in_photos);
   const photos=state.previews.filter(p=>selected.some(a=>a.id===p.album_id)).slice(0,18);
   if(!photos.length)return;
   const head=make("div","ui-vatra-albums-featured-head-001");
   head.append(make("h3","vatra-albums-section-heading-001",t("З альбомів","From albums")));
   const open=button("vatra-albums-text-button-001",t("Дивитися альбоми","Browse albums"),()=>switchTab("albums"));
   head.append(open);featured.append(head);
   const grid=make("div","ui-vatra-album-photos-grid-001");
   for(const photo of photos){
    const album=selected.find(a=>a.id===photo.album_id);
    if(!album)continue;
    const tile=button("vatra-album-photo-tile-001","");
    const img=make("img","ui-vatra-album-photo-image-001");paintImage(img,photo.media_path);
    tile.append(img);tile.setAttribute("aria-label",t("Відкрити фотографію","Open photo"));
    tile.addEventListener("click",()=>void openPhoto(photo,album));grid.append(tile);
   }
   featured.append(grid);
  }
  async function loadAlbums(){
   const ticket=++state.rev;
   if(state.tab==="albums")loading(albumPane);
   const [albumsResult,avatarResult]=await Promise.all([
    client.from("photo_albums")
     .select("id,title,description,visibility,comments_mode,show_in_photos,created_at")
     .eq("owner_vatra_id",targetId).order("created_at",{ascending:false}).limit(200),
    client.from("profile_media").select("avatar_path").eq("vatra_id",targetId).maybeSingle()
   ]);
   if(ticket!==state.rev)return;
   if(albumsResult.error){
    albumPane.replaceChildren(make("p","vatra-albums-error-001",t("Не вдалося завантажити альбоми.","Could not load albums.")));
    return;
   }
   state.avatar=null;
   const av=avatarResult.data?.avatar_path;
   if(typeof av==="string"&&av.startsWith(targetId+"/avatar/")){
    const url=client.storage.from("avatars").getPublicUrl(av)?.data?.publicUrl;
    if(url)state.avatar={url};
   }
   state.albums=albumsResult.data||[];
   state.previews=[];
   const ids=state.albums.map(a=>a.id);
   if(ids.length){
    const {data,error}=await client.from("album_photos")
     .select("id,album_id,media_path,created_at,caption").in("album_id",ids)
     .order("created_at",{ascending:false}).limit(1000);
    if(ticket!==state.rev)return;
    if(!error)state.previews=data||[];
    else notify(t("Не вдалося завантажити фотографії альбомів.","Could not load album photos."));
   }
   state.loaded=true;
   renderFeatured();
   if(state.tab==="albums")renderAlbumPane();
  }
  uploadInput.addEventListener("change",async()=>{
   const album=state.albums.find(a=>a.id===state.selected);
   const files=[...uploadInput.files||[]];uploadInput.value="";
   if(!album||!isMine||!files.length||state.busy)return;
   if(files.length>PHOTO_LIMIT){notify(t("За раз можна додати не більше 8 фото.","Choose up to 8 photos at a time."));return;}
   if(files.some(f=>!["image/jpeg","image/png","image/webp"].includes(f.type)||!f.size||f.size>MAX_SIZE)){
    notify(t("Потрібні JPG, PNG або WebP до 30 МБ.","Use JPG, PNG or WebP up to 30 MB."));return;
   }
   state.busy=true;let done=0;
   try{
    for(const file of files){
     const ext=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";
     const path=ownId+"/albums/"+album.id+"/"+crypto.randomUUID()+"."+ext;
     const {error:uploadError}=await client.storage.from(BUCKET).upload(path,file,
      {contentType:file.type,cacheControl:"120",upsert:false});
     if(uploadError){notify(t("Не вдалося завантажити одне з фото.","One photo could not be uploaded."));break;}
     const {error:insertError}=await client.from("album_photos").insert({
      album_id:album.id,owner_vatra_id:Number(ownId),media_path:path
     });
     if(insertError){
      await client.storage.from(BUCKET).remove([path]);
      notify(t("Не вдалося зберегти фото.","Could not save the photo."));break;
     }
     done++;
    }
    if(done)notify(t("Додано фото: ","Photos added: ")+done,"success");
   }finally{state.busy=false;await loadAlbums();renderAlbumPane();}
  });
  const photoTab=document.querySelector("#profile-tab-photos");
  photoTab&&new MutationObserver(()=>{
   if(photoTab.getAttribute("aria-selected")==="true"&&!state.loaded)void loadAlbums();
  }).observe(photoTab,{attributes:true,attributeFilter:["aria-selected"]});
  const requested=new URLSearchParams(location.search).get("album");
  if(requested&&validUUID(requested)){
   state.selected=requested;
   queueMicrotask(()=>{photoTab?.click();switchTab("albums");void loadAlbums();});
  }
  window.addEventListener("vatra:profile-media-changed",()=>{if(state.loaded)void loadAlbums();});
 }
 window.VATRA_ALBUMS={mount};
})();