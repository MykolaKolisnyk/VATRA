/* VATRA member profiles: canonical /VATRA/id123456789, read-only and RLS-protected. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://rjasunoawrxvetwadylh.supabase.co";
const PUBLIC_KEY="sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-";
const q=selector=>document.querySelector(selector);
const english=document.documentElement.lang==="en";
const locale=english?"en-US":"uk-UA";
const t=(uk,en)=>{
 if(!english)return uk;
 const translated=window.VATRA_LANGUAGE?.translate(uk);
 return translated&&translated!==uk?translated:en;
};
const home=new URL("../../",document.currentScript.src).href;
const validId=id=>typeof id==="string"&&/^[1-9][0-9]{0,18}$/.test(id);
const memberUrl=id=>home+"id"+id;
const localizeSocial=()=>{
 for(const element of document.querySelectorAll("[data-social-uk]"))
  element.textContent=english?element.dataset.socialEn:element.dataset.socialUk;
 const brand=document.querySelector(".feed-header-brand");
 if(brand)brand.setAttribute("aria-label",english?"VATRA — Feed":"VATRA — Стрічка");
 for(const control of document.querySelectorAll(".social-profile-tabs button:disabled"))
  control.title=t("У розробці","Coming soon");
 for(const input of document.querySelectorAll("[data-shell-placeholder-uk]")){
    input.placeholder=english?input.dataset.shellPlaceholderEn:input.dataset.shellPlaceholderUk;
   }
   for(const control of document.querySelectorAll("[data-shell-aria-uk]")){
    const title=english?control.dataset.shellAriaEn:control.dataset.shellAriaUk;
    control.setAttribute("aria-label",title);
    control.removeAttribute("title");
   }
   for(const pair of [
    [".ui-shell-header-notifications-001","Сповіщення — незабаром","Notifications — coming soon"],
    [".ui-shell-header-music-001","Музика — незабаром","Music — coming soon"]]){
    const control=document.querySelector(pair[0]);
    if(control){
     const title=english?pair[2]:pair[1];
     control.setAttribute("aria-label",title);
     control.removeAttribute("title");
    }
   }
   for(const link of document.querySelectorAll(".social-top-link")){
  const label=link.querySelector("[data-social-uk]");
  if(label){
   link.setAttribute("aria-label",label.textContent);
   link.removeAttribute("title");
  }
 }
};
const node=(tag,cls,value)=>{
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(value!==undefined)element.textContent=value;
 return element;
};
const dateText=value=>{
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat(locale,{
  day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
 }).format(date);
};
const setMenuLink=id=>{
 if(!validId(id))return;
 for(const link of document.querySelectorAll('a[href="profile"],a[href$="/profile"]')){
  link.href=memberUrl(id);
 }
};
const finish=()=>{
 q("#profile-app").hidden=false;
 q("#profile-loading").hidden=true;
 document.body.dataset.authReady="true";
 document.body.dataset.feedReady="true";
  document.body.classList.remove("vatra-shell-pending");
};
const gateError=message=>{
 const loader=q("#profile-loading");
 if(!loader)return;
 loader.dataset.loadingError="true";
 loader.setAttribute("role","alert");
 const label=loader.querySelector(".vatra-auth-loading-caption");
 if(label)label.textContent=message;
 if(loader.querySelector(".vatra-auth-loading-retry"))return;
 const retry=node("button","vatra-auth-loading-retry vt-profile-retry-001",t("Повторити","Retry"));
 retry.type="button";
 retry.addEventListener("click",()=>location.reload());
 loader.querySelector(".vatra-auth-loading-content")?.append(retry);
};
function missingProfile(){
 // Preserve the cover/avatar but never invent profile actions or member details.
 const name=q("#profile-heading");
 if(name){name.removeAttribute("data-i18n");
  name.textContent=t("Користувача не знайдено","User not found");}
 q("#profile-status")?.remove();
 q("#profile-last-seen")?.remove();
 q("#profile-online-dot")?.remove();
 q(".profile-actions")?.remove();
 q(".social-profile-tabs")?.remove();
 q(".profile-panels")?.remove();
 document.title=t("Користувача не знайдено · VATRA","User not found · VATRA");
 finish();
}
async function loadPosts(client,targetId,ownId,userId,append=false){
 const list=q("#profile-posts"),empty=q("#profile-posts-empty"),more=q("#profile-posts-more");
 if(!list||list.dataset.loading==="true")return;
 const offset=append?Number(list.dataset.offset||0):0;
 list.dataset.loading="true";list.setAttribute("aria-busy","true");
 if(more)more.disabled=true;
 try{
  let query=client.from("feed_posts")
   .select("id,author_vatra_id,body,created_at,visibility,media_kind,media_path,shared_post_kind,shared_post_id")
   .eq("author_vatra_id",targetId);
  if(typeof query.is==="function")query=query.is("archived_at",null);
  const {data,error}=await query.order("created_at",{ascending:false})
   .order("id",{ascending:false}).range(offset,offset+11);
  if(error)throw error;
  const rows=data||[];
  if(!append)list.replaceChildren();
  for(const post of rows){
   const article=node("article","feed-post-card ui-profile-post-card-001");
   article.dataset.postId=post.id;
   const header=node("div","feed-post-header ui-profile-post-header-001");
   const identity=node("div","feed-post-author ui-profile-post-author-001");
   const name=node("a","feed-post-name vt-profile-post-name-001 feed-post-profile-link",
    q("#profile-heading").textContent);
   name.href=memberUrl(targetId);
   const stamp=node("time","feed-post-date vt-profile-post-date-001",dateText(post.created_at));
   stamp.dateTime=post.created_at;
   const meta=node("div","feed-post-meta-row ui-profile-post-meta-row-001");
   meta.append(stamp);window.VATRA_POST_INTERACTIONS?.appendAudience(meta,post.visibility,false);
   identity.append(name,meta);
   const avatar=node("a","feed-avatar feed-post-avatar vt-profile-post-avatar-001 feed-post-profile-avatar",
    q("#profile-avatar").textContent||"V");
   avatar.href=memberUrl(targetId);
   avatar.setAttribute("aria-label",t("Переглянути профіль","View profile"));
   const profileAvatar=q("#profile-avatar");
   if(profileAvatar.classList.contains("has-photo")){
    avatar.style.backgroundImage=profileAvatar.style.backgroundImage;
    avatar.classList.add("has-photo");avatar.textContent="";
   }
   header.append(avatar,identity);
   if(String(ownId)===String(targetId)){
    const archive=node("button","vt-profile-post-archive-001",t("В архів","Archive"));
    archive.type="button";archive.addEventListener("click",async()=>{
     archive.disabled=true;
     const {data,error}=await client.from("feed_posts").update({archived_at:new Date().toISOString()})
      .eq("id",post.id).eq("author_vatra_id",ownId).select("id").maybeSingle();
     if(error||!data){archive.disabled=false;return;}
     void loadPosts(client,targetId,ownId,userId);
    });
    const remove=node("button","vt-profile-post-remove-001",t("Видалити","Delete"));
    remove.type="button";remove.addEventListener("click",async()=>{
     if(!confirm(t("Видалити цю публікацію?","Delete this post?")))return;
     remove.disabled=true;
     const {data,error}=await client.from("feed_posts").delete().eq("id",post.id)
      .eq("author_vatra_id",ownId).select("id");
     if(error||!data?.length){remove.disabled=false;return;}
     if(post.media_path)void window.VATRA_POST_MEDIA?.remove(client,post);
     void loadPosts(client,targetId,ownId,userId);
    });
    header.append(archive,remove);
   }
   article.append(header);
   if(post.body){
    const body=node("p","feed-post-body vt-profile-post-body-001",post.body);
    window.VATRA_POST_MEDIA?.linkifyHashtags(body);
    article.append(body);
    window.VATRA_POST_MEDIA?.collapsibleBody(body);
   }
   if(post.media_kind&&post.media_path)void window.VATRA_POST_MEDIA?.mount(client,post,article);
   if(post.shared_post_id)void window.VATRA_POST_INTERACTIONS?.renderSharedPreview(client,post,article);
   window.VATRA_POST_INTERACTIONS?.mount(client,{...post,kind:"person"},article,{
    ownId,userId,onShared:()=>{if(String(ownId)===String(targetId))
     void loadPosts(client,targetId,ownId,userId);}
   });
   list.append(article);
  }
  list.dataset.offset=String(offset+rows.length);
  empty.hidden=list.querySelector(".feed-post-card")!==null;
  if(!empty.hidden)empty.textContent=t("Публікацій поки немає.","No posts yet.");
  if(more){
   more.hidden=rows.length<12;
   if(!more.dataset.bound){
    more.dataset.bound="true";
    more.addEventListener("click",()=>void loadPosts(client,targetId,ownId,userId,true));
   }
  }
 }catch(_){
  if(!append)list.replaceChildren();
  empty.textContent=t("Не вдалося завантажити публікації. Спробуйте оновити сторінку.",
   "Could not load posts. Try refreshing this page.");
  empty.hidden=false;
 }finally{
  list.dataset.loading="false";list.setAttribute("aria-busy","false");
  if(more)more.disabled=false;
 }
}
function setupProfileExtraSections(client,ownId,targetId,userId,isMine){
 const savedTab=q("#profile-tab-saved"),archiveWrap=q("#profile-archive-wrap"),
  toggle=q("#profile-archive-toggle"),menu=q("#profile-archive-menu");
 savedTab.hidden=!isMine;archiveWrap.hidden=!isMine;
 const empty=(selector,content)=>{const element=q(selector);element.textContent=content;element.hidden=false;};
 const makeRow=(list,heading,description)=>{
  const article=node("article","profile-extra-row ui-profile-extra-row-001");
  article.append(node("strong","vt-profile-extra-title-001",heading),
   node("p","vt-profile-extra-copy-001",description));
  list.append(article);return article;
 };
 const displaySavedMedia=(article,item)=>{
  if(!item?.media_path||!["image","video"].includes(item.media_kind))return;
  // Reuse the same secure, signed-URL media viewer as the live Feed.
  void window.VATRA_POST_MEDIA?.mount(client,item,article);
 };
 const displayShared=(article,item)=>{
  if(item?.shared_post_id)void window.VATRA_POST_INTERACTIONS?.renderSharedPreview(client,item,article);
 };
 const namedAuthors=async rows=>{
  const ids=[...new Set(rows.map(p=>String(p.author_vatra_id)).filter(validId))];
  if(!ids.length)return new Map();
  const {data,error}=await client.from("vatra_public_profiles")
   .select("vatra_id,display_name").in("vatra_id",ids);
  return new Map(!error?(data||[]).map(x=>[String(x.vatra_id),String(x.display_name||"").trim()]):[]);
 };
 const namedCommunities=async rows=>{
  const ids=[...new Set(rows.map(p=>String(p.club_id)).filter(validId))];
  if(!ids.length)return new Map();
  const {data,error}=await client.from("communities").select("club_id,name").in("club_id",ids);
  return new Map(!error?(data||[]).map(x=>[String(x.club_id),String(x.name||"").trim()]):[]);
 };
 const saved=async()=>{
  if(!isMine)return;
  const list=q("#profile-saved-list"),note=q("#profile-saved-empty");
  list.replaceChildren();note.hidden=true;
  try{
   const {data,error}=await client.from("post_saves")
    .select("post_id,post_kind,saved_at").eq("owner_vatra_id",ownId)
    .order("saved_at",{ascending:false}).limit(30);
   if(error)throw error;
   const rows=data||[];
   const persons=rows.filter(row=>row.post_kind==="person").map(row=>row.post_id);
   const groups=rows.filter(row=>row.post_kind==="group").map(row=>row.post_id);
   const fetched=await Promise.all([
    persons.length?client.from("feed_posts").select("id,body,author_vatra_id,media_kind,media_path,shared_post_kind,shared_post_id,created_at").in("id",persons):Promise.resolve({data:[]}),
    groups.length?client.from("vatra_community_posts").select("id,body,author_vatra_id,club_id,media_kind,media_path,created_at").in("id",groups):Promise.resolve({data:[]})
   ]);
   const map=new Map(fetched.flatMap((x,i)=>(x.data||[]).map(p=>[(i?"group":"person")+":"+p.id,p])));
   const all=[...map.values()];
   const [people,communities]=await Promise.all([namedAuthors(all),namedCommunities(all.filter(x=>x.club_id))]);
   for(const save of rows){
    const post=map.get(save.post_kind+":"+save.post_id);if(!post)continue;
    const author=people.get(String(post.author_vatra_id))||t("Учасник VATRA","VATRA member");
    const community=save.post_kind==="group"?communities.get(String(post.club_id)):null;
    const heading=community?community+" · "+author:author;
    const article=makeRow(list,heading,post.body||t("Медіапублікація","Media post"));
    displaySavedMedia(article,post);
    displayShared(article,post);
    const groupSaved=save.post_kind==="group"&&validId(post.club_id);
    const a=node("a","vt-profile-saved-link-001",groupSaved?
     t("Відкрити спільноту","Open community"):t("Відкрити допис","Open post"));
    a.href=groupSaved?new URL("club"+post.club_id,home).href:
     new URL("feed?post="+encodeURIComponent(post.id),home).href;
    const remove=node("button","vt-profile-saved-remove-001",t("Прибрати зі збереженого","Remove from saved"));
    remove.type="button";
    remove.addEventListener("click",async()=>{
     remove.disabled=true;
     const result=await client.from("post_saves").delete().eq("owner_vatra_id",ownId)
      .eq("post_kind",save.post_kind).eq("post_id",save.post_id);
     if(result.error){remove.disabled=false;return;}
     article.remove();
     if(!list.children.length)empty("#profile-saved-empty",t("Збережених публікацій поки немає.","No saved posts yet."));
    });
    article.append(a,remove);
   }
   if(!list.children.length)empty("#profile-saved-empty",t("Збережених публікацій поки немає.","No saved posts yet."));
  }catch(_){empty("#profile-saved-empty",t("Не вдалося завантажити збережене.","Could not load saved posts."));}
 };
 const stories=async()=>{
  if(!isMine)return;
  const list=q("#profile-archive-stories-list"),note=q("#profile-archive-stories-empty");
  list.replaceChildren();note.hidden=true;
  try{
   const {data,error}=await client.from("vatra_stories").select("id,body,theme,created_at,expires_at")
    .eq("author_vatra_id",ownId).lte("expires_at",new Date().toISOString())
    .order("created_at",{ascending:false}).limit(50);
   if(error)throw error;
   for(const item of data||[])makeRow(list,dateText(item.created_at),item.body);
   if(!list.children.length)empty("#profile-archive-stories-empty",t("Історій в архіві ще немає.","No archived stories yet."));
  }catch(_){empty("#profile-archive-stories-empty",t("Не вдалося завантажити архів історій.","Could not load story archive."));}
 };
 const archivedPosts=async()=>{
  if(!isMine)return;
  const list=q("#profile-archive-posts-list"),note=q("#profile-archive-posts-empty");
  list.replaceChildren();note.hidden=true;
  try{
   const {data,error}=await client.from("feed_posts")
    .select("id,author_vatra_id,body,media_kind,media_path,shared_post_kind,shared_post_id,created_at,archived_at")
    .eq("author_vatra_id",ownId).not("archived_at","is",null)
    .order("archived_at",{ascending:false}).limit(40);
   if(error)throw error;
   const people=await namedAuthors(data||[]);
   for(const item of data||[]){
    const article=makeRow(list,people.get(String(item.author_vatra_id))||t("Моя публікація","My post"),
     item.body||t("Медіапублікація","Media post"));
    const stamp=node("time","vt-profile-extra-stamp-001",dateText(item.created_at));
    stamp.dateTime=item.created_at;article.append(stamp);
    displaySavedMedia(article,item);
    displayShared(article,item);
    const restore=node("button","vt-profile-restore-post-001",t("Повернути в публікації","Restore post"));
    restore.type="button";
    restore.addEventListener("click",async()=>{
     restore.disabled=true;
     const {data:updated,error:err}=await client.from("feed_posts").update({archived_at:null})
      .eq("id",item.id).eq("author_vatra_id",ownId).select("id").maybeSingle();
     if(err||!updated){restore.disabled=false;return;}
     article.remove();
     if(!list.children.length)empty("#profile-archive-posts-empty",t("В архіві немає публікацій.","No archived posts."));
    });
    const permanent=node("button","vt-profile-permanent-delete-001",t("Видалити назавжди","Delete permanently"));
    permanent.type="button";permanent.addEventListener("click",async()=>{
     if(!confirm(t("Видалити публікацію назавжди?","Delete post permanently?")))return;
     permanent.disabled=true;
     const {data:deleted,error:err}=await client.from("feed_posts").delete()
      .eq("id",item.id).eq("author_vatra_id",ownId).select("id");
     if(err||!deleted?.length){permanent.disabled=false;return;}
     if(item.media_path)void window.VATRA_POST_MEDIA?.remove(client,item);
     article.remove();
     if(!list.children.length)empty("#profile-archive-posts-empty",t("В архіві немає публікацій.","No archived posts."));
    });
    article.append(restore,permanent);
   }
   if(!list.children.length)empty("#profile-archive-posts-empty",t("В архіві немає публікацій.","No archived posts."));
  }catch(_){empty("#profile-archive-posts-empty",t("Не вдалося завантажити архів.","Could not load archive."));}
 };
 const dispatch=name=>{
  toggle?.classList.toggle("social-profile-tab-active",name==="archive-stories"||name==="archive-posts");
  if(name==="saved")void saved();
  if(name==="archive-stories")void stories();
  if(name==="archive-posts")void archivedPosts();
 };
 window.VATRA_PROFILE_EXTRA_TAB=dispatch;
 if(!isMine)return;
 // The tab strip scrolls horizontally; portal this menu so it is never clipped.
 document.body.append(menu);
 const close=()=>{menu.hidden=true;toggle.setAttribute("aria-expanded","false");};
 const position=()=>{
  if(menu.hidden)return;
  const anchor=toggle.getBoundingClientRect();
  const width=menu.getBoundingClientRect().width||175;
  menu.style.left=Math.round(Math.max(10,Math.min(anchor.left,innerWidth-width-10)))+"px";
  menu.style.top=Math.round(Math.min(anchor.bottom+6,innerHeight-menu.offsetHeight-10))+"px";
 };
 toggle.addEventListener("click",()=>{
  menu.hidden=!menu.hidden;toggle.setAttribute("aria-expanded",String(!menu.hidden));
  if(!menu.hidden)position();
 });
 for(const button of menu.querySelectorAll("[data-profile-archive]")){
  button.addEventListener("click",()=>{
   window.VATRA_PROFILE_CHOOSE_TAB?.(button.dataset.profileArchive);
   dispatch(button.dataset.profileArchive);close();
  });
 }
 document.addEventListener("pointerdown",event=>{if(!archiveWrap.contains(event.target)&&!menu.contains(event.target))close();});
 window.addEventListener("resize",position,{passive:true});
 window.addEventListener("scroll",close,{passive:true});
 menu.addEventListener("keydown",event=>{if(event.key==="Escape"){close();toggle.focus();}});

}
function setupProfileGallery(client,targetId){
 for(const settings of [
  {kind:"image",tab:"#profile-tab-photos",list:"#profile-photo-gallery",empty:"#profile-photos-empty",more:"#profile-photos-more"},
  {kind:"video",tab:"#profile-tab-videos",list:"#profile-video-gallery",empty:"#profile-videos-empty",more:"#profile-videos-more"}
 ]){
  const tab=q(settings.tab),list=q(settings.list),empty=q(settings.empty),more=q(settings.more);
  if(!tab||!list||!empty||!more)continue;
  let loaded=false,busy=false,offset=0;
  const load=async(append=false)=>{
   if(busy)return;
   busy=true;list.setAttribute("aria-busy","true");more.disabled=true;
   if(!append){offset=0;list.replaceChildren();}
   empty.hidden=true;
   try{
    let query=client.from("feed_posts")
     .select("id,author_vatra_id,media_kind,media_path")
     .eq("author_vatra_id",targetId).eq("media_kind",settings.kind);
    if(typeof query.is==="function")query=query.is("archived_at",null);
    const {data,error}=await query.order("created_at",{ascending:false}).order("id",{ascending:false})
     .range(offset,offset+11);
    if(error)throw error;
    const rows=(data||[]).filter(item=>!!item.media_path);
    for(const post of rows){
     const tile=node("article","profile-media-tile ui-profile-media-tile-001");
     tile.setAttribute("aria-label",settings.kind==="image"?t("Фото","Photo"):t("Відео","Video"));
     list.append(tile);
     void window.VATRA_POST_MEDIA?.mount(client,post,tile);
    }
    offset+=(data||[]).length;
    loaded=true;more.hidden=(data||[]).length<12;
    if(!list.children.length){
     empty.textContent=settings.kind==="image"?t("Фотографій поки немає.","No photos yet."):
      t("Відео поки немає.","No videos yet.");
     empty.hidden=false;
    }
   }catch(_){
    empty.textContent=t("Не вдалося завантажити медіа.","Could not load media.");
    empty.hidden=false;
   }finally{busy=false;list.setAttribute("aria-busy","false");more.disabled=false;}
  };
  tab.addEventListener("click",()=>{if(!loaded)void load();});
  more.addEventListener("click",()=>void load(true));
 }
}
function bindPostComposer(client,user,ownId){
 const trigger=q("#profile-write-post");
 const dialog=q("#profile-compose-dialog");
 const form=q("#profile-compose-form");
 const input=q("#profile-compose-text");
 const submit=q("#profile-compose-submit");
 const cancel=q("#profile-compose-cancel");
 const counter=q("#profile-compose-counter");
 const visibility=q("#profile-compose-visibility");
 const status=q("#profile-compose-status");
 if(!trigger||!dialog||!form||!input||!submit||!validId(ownId))return;
 let publishing=false,picker=null;
 const update=()=>{
  const length=Array.from(input.value).length;
  counter.textContent=length+" / 2000";
  submit.disabled=publishing||(!input.value.trim()&&!picker?.getFile())||length>2000;
 };
 const clearStatus=()=>{status.textContent="";status.hidden=true;};
 picker=window.VATRA_POST_MEDIA?.bindPicker({
  input:"#profile-compose-media",choose:"#profile-compose-media-choose",
  clear:"#profile-compose-media-remove",preview:"#profile-compose-media-preview",
  onError:text=>{status.textContent=text;status.hidden=!text;},onChange:update
 });
 trigger.addEventListener("click",()=>{
  clearStatus();
  dialog.showModal();
  update();
  input.focus();
 });
 cancel.addEventListener("click",()=>{if(!publishing)dialog.close();});
 dialog.addEventListener("cancel",event=>{if(publishing)event.preventDefault();});
 dialog.addEventListener("close",()=>{clearStatus();trigger.focus({preventScroll:true});});
 input.addEventListener("input",update);
 input.addEventListener("keydown",event=>{
  if((event.ctrlKey||event.metaKey)&&event.key==="Enter"&&!submit.disabled){
   event.preventDefault();
   form.requestSubmit();
  }
 });
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(publishing)return;
  const body=input.value.trim(),file=picker?.getFile();
  if((!body&&!file)||Array.from(body).length>2000){
   status.textContent=t("Додайте текст, фото або відео (до 2000 символів).","Add text, a photo or video (up to 2000 characters).");
   status.hidden=false;return;
  }
  publishing=true;
  update();
  clearStatus();
  let uploaded=null;
  try{
   if(file)uploaded=await window.VATRA_POST_MEDIA.upload(client,ownId,file);
   const {error}=await client.from("feed_posts").insert({
    author_id:user.id,author_vatra_id:ownId,body,
    visibility:["public","friends","only_me"].includes(visibility?.value)?visibility.value:"public",
    ...(uploaded||{})
   });
   if(error)throw error;
   input.value="";picker?.reset();
   dialog.close();
   await loadPosts(client,ownId,ownId,user.id);
  }catch(error){
   if(uploaded)try{await window.VATRA_POST_MEDIA.remove(client,uploaded);}catch(_){}
   status.textContent=error?.message||t("Не вдалося опублікувати допис. Повторіть спробу.",
    "Could not publish the post. Please try again.");
   status.hidden=false;
  }finally{publishing=false;update();}
 });
 update();
}

function setupProfileInteractions(client,ownId,targetId,isMine){
 const friendButton=q("#profile-friend-button"),messageButton=q("#profile-message-button");
 const actionStatus=q("#profile-action-status");
 const friends=q("#profile-friends-list"),friendsEmpty=q("#profile-friends-empty");
 const inbox=q("#profile-inbox-list"),inboxEmpty=q("#profile-inbox-empty");
 const dialog=q("#profile-message-dialog"),conversation=q("#profile-message-history");
 const messageText=q("#profile-message-text"),messageStatus=q("#profile-message-status");
 const send=q("#profile-message-send");
 const validPeer=id=>validId(String(id))&&String(id)!==String(ownId);
 const show=(el,txt)=>{el.textContent=txt;el.hidden=!txt;};
 const makePerson=(id,description)=>{
  const row=node("div","profile-person ui-profile-person-"+id);
  const avatar=node("span","profile-person-avatar vt-profile-person-avatar-"+id,"V");
  avatar.setAttribute("aria-hidden","true");
  const info=node("div","profile-person-details ui-profile-person-details-"+id);
  const link=node("a","vt-profile-person-link-"+id,"VATRA ID "+id);
  link.href=memberUrl(id);
  info.append(link,node("small","vt-profile-person-description-"+id,description));
  row.append(avatar,info);
  return row;
 };
 let loadFriends=async()=>{},loadInbox=async()=>{};
 const tabs=[...document.querySelectorAll("[data-profile-tab]")];
 function choose(name){
  if(!isMine&&["saved","archive-stories","archive-posts"].includes(name))return;
  if(name==="messages"&&!isMine)return;
  for(const tab of tabs){
   const active=tab.dataset.profileTab===name;
   tab.classList.toggle("social-profile-tab-active",active);
   tab.setAttribute("aria-selected",String(active));
   tab.tabIndex=active?0:-1;
  }
  for(const panel of document.querySelectorAll("[data-profile-panel]")){
   panel.hidden=panel.dataset.profilePanel!==name;
  }
  if(name==="friends")void loadFriends();
  if(name==="messages")void loadInbox();
  window.VATRA_PROFILE_EXTRA_TAB?.(name);
 }
 window.VATRA_PROFILE_CHOOSE_TAB=choose;
 for(const tab of tabs){
  tab.addEventListener("click",()=>choose(tab.dataset.profileTab));
  tab.addEventListener("keydown",e=>{
   if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
   const visible=tabs.filter(x=>!x.hidden);
   const next=visible[(visible.indexOf(tab)+(e.key==="ArrowRight"?1:-1)+visible.length)%visible.length];
   e.preventDefault();next.focus();choose(next.dataset.profileTab);
  });
 }
 // Inbox remains reachable via its private conversation flow, not as a profile tab.
 if(isMine&&location.hash==="#profile-messages-section")choose("messages");
 if(!validId(ownId))return;
 let activePeer=null,sending=false;
 const messagesQuery=peer=>"and(sender_id.eq."+ownId+",recipient_id.eq."+peer+
  "),and(sender_id.eq."+peer+",recipient_id.eq."+ownId+")";
 const loadConversation=async()=>{
  if(!validPeer(activePeer))return;
  conversation.replaceChildren(node("p","vt-profile-message-loading-001",t("Завантаження…","Loading…")));
  try{
   const {data,error}=await client.from("vatra_direct_messages")
    .select("sender_id,recipient_id,body,created_at")
    .or(messagesQuery(activePeer)).order("created_at",{ascending:false}).limit(50);
   if(error)throw error;
   conversation.replaceChildren();
   if(!data?.length)conversation.append(node("p","vt-profile-message-empty-001",
    t("Повідомлень ще немає.","No messages yet.")));
   for(const m of (data||[]).slice().reverse()){
    const bubble=node("div","profile-message-bubble ui-profile-message-bubble-001");
    // Member message text stays escaped; only known VATRA post URLs become links.
    const source=String(m.body||"");
    const postLink=new RegExp("https://mykolakolisnyk[.]github[.]io/VATRA/feed[?]post=[a-f0-9-]{36}","ig");
    let cursor=0,match;
    while((match=postLink.exec(source))!==null){
     bubble.append(document.createTextNode(source.slice(cursor,match.index)));
     const url=new URL(match[0]),link=node("a","vt-profile-message-post-link-001",
      t("Переглянути допис","View post"));
     if(url.origin==="https://mykolakolisnyk.github.io"&&url.pathname==="/VATRA/feed")
      link.href=url.href;
     bubble.append(link);cursor=match.index+match[0].length;
    }
    bubble.append(document.createTextNode(source.slice(cursor)));
    bubble.dataset.own=String(m.sender_id)===String(ownId)?"true":"false";
    const time=node("time","vt-profile-message-time-001",dateText(m.created_at));
    time.dateTime=m.created_at;
    bubble.append(time);conversation.append(bubble);
   }
   conversation.scrollTop=conversation.scrollHeight;
  }catch(_){
   conversation.replaceChildren(node("p","vt-profile-message-error-001",
    t("Не вдалося завантажити розмову.","Could not load conversation.")));
  }
 };
 const openConversation=async peer=>{
  if(!validPeer(peer))return;
  activePeer=String(peer);
  q("#profile-message-title").textContent=t("Повідомлення · VATRA ID ","Messages · VATRA ID ")+activePeer;
  messageText.value="";show(messageStatus,"");
  if(!dialog.open)dialog.showModal();
  await loadConversation();
  messageText.focus();
 };
 q("#profile-message-close").addEventListener("click",()=>{if(!sending)dialog.close();});
 q("#profile-message-refresh").addEventListener("click",()=>void loadConversation());
 q("#profile-message-form").addEventListener("submit",async event=>{
  event.preventDefault();
  if(sending||!validPeer(activePeer))return;
  const body=messageText.value.trim();
  if(!body||Array.from(body).length>2000){
   show(messageStatus,t("Потрібно 1–2000 символів.","Please enter 1–2000 characters."));return;
  }
  sending=true;send.disabled=true;show(messageStatus,"");
  try{
   const {error}=await client.from("vatra_direct_messages").insert({
    sender_id:ownId,recipient_id:activePeer,body
   });
   if(error)throw error;
   messageText.value="";
   await loadConversation();
   show(messageStatus,t("Повідомлення надіслано.","Message sent."));
  }catch(_){show(messageStatus,t("Не вдалося надіслати.","Failed to send message."));}
  finally{sending=false;send.disabled=false;}
 });
 if(!isMine){
  messageButton.hidden=false;
  messageButton.addEventListener("click",()=>void openConversation(targetId));
  friendButton.hidden=false;
  let relation=null,busy=false;
  const pair="and(requester_id.eq."+ownId+",recipient_id.eq."+targetId+
   "),and(requester_id.eq."+targetId+",recipient_id.eq."+ownId+")";
  const refreshFriend=async()=>{
   const {data,error}=await client.from("vatra_friendships")
    .select("id,requester_id,recipient_id,status").or(pair).maybeSingle();
   if(error)throw error;
   relation=data;
   const outgoing=String(relation?.requester_id)===String(ownId);
   friendButton.dataset.friendState=relation?.status==="accepted"?"friends":
    relation?.status==="pending"?(outgoing?"outgoing":"incoming"):"none";
   q("#profile-friend-label").textContent=relation?.status==="accepted"?t("У друзях · Видалити","Friends · Remove"):
    relation?.status==="pending"?(outgoing?t("Заявку надіслано · Скасувати","Request sent · Cancel"):
     t("Прийняти заявку","Accept request")):t("Додати в друзі","Add friend");
  };
  q("#profile-friend-label").textContent=t("Додати в друзі","Add friend");
  void refreshFriend().catch(()=>show(actionStatus,t("Статус дружби недоступний.","Friendship status unavailable.")));
  friendButton.addEventListener("click",async()=>{
   if(busy)return;
   busy=true;friendButton.disabled=true;show(actionStatus,"");
   try{
    const result=!relation?
     await client.from("vatra_friendships").insert({requester_id:ownId,recipient_id:targetId}):
     relation.status==="pending"&&String(relation.recipient_id)===String(ownId)?
      await client.from("vatra_friendships").update({status:"accepted"}).eq("id",relation.id):
      await client.from("vatra_friendships").delete().eq("id",relation.id);
    if(result.error)throw result.error;
    await refreshFriend();
    show(actionStatus,t("Статус дружби оновлено.","Friendship updated."));
   }catch(_){show(actionStatus,t("Не вдалося виконати дію.","Could not complete the action."));}
   finally{busy=false;friendButton.disabled=false;}
  });
 }
 loadFriends=async()=>{
  friends.replaceChildren();friendsEmpty.hidden=true;
  if(!isMine){
   show(friendsEmpty,t("Списки друзів інших користувачів приватні.","Other members' friend lists are private."));
   return;
  }
  try{
   const {data,error}=await client.from("vatra_friendships")
    .select("id,requester_id,recipient_id,status,created_at")
    .or("requester_id.eq."+ownId+",recipient_id.eq."+ownId)
    .order("created_at",{ascending:false}).limit(100);
   if(error)throw error;
   for(const item of data||[]){
    const incoming=String(item.recipient_id)===String(ownId);
    const other=String(incoming?item.requester_id:item.recipient_id);
    const status=item.status==="accepted"?t("У друзях","Friends"):
     incoming?t("Вхідна заявка","Incoming request"):t("Вихідна заявка","Outgoing request");
    const row=makePerson(other,status);
    const action=node("button","profile-person-action vt-profile-friend-action-"+other,
     item.status==="pending"&&incoming?t("Прийняти","Accept"):
     item.status==="accepted"?t("Видалити","Remove"):t("Скасувати","Cancel"));
    action.type="button";
    action.addEventListener("click",async()=>{
     action.disabled=true;
     try{
      const {error:changeError}=await (item.status==="pending"&&incoming?
       client.from("vatra_friendships").update({status:"accepted"}).eq("id",item.id):
       client.from("vatra_friendships").delete().eq("id",item.id));
      if(changeError)throw changeError;
      await loadFriends();
     }catch(_){action.disabled=false;show(friendsEmpty,t("Не вдалося оновити друзів.","Could not update friends."));}
    });
    row.append(action);friends.append(row);
   }
   if(!data?.length)show(friendsEmpty,t("Друзів і заявок поки немає.","No friends or requests yet."));
  }catch(_){show(friendsEmpty,t("Не вдалося завантажити друзів.","Could not load friends."));}
 };
 loadInbox=async()=>{
  inbox.replaceChildren();inboxEmpty.hidden=true;
  if(!isMine)return;
  try{
   const {data,error}=await client.from("vatra_direct_messages")
    .select("sender_id,recipient_id,created_at")
    .or("sender_id.eq."+ownId+",recipient_id.eq."+ownId)
    .order("created_at",{ascending:false}).limit(200);
   if(error)throw error;
   const seen=new Set();
   for(const item of data||[]){
    const other=String(item.sender_id)===String(ownId)?String(item.recipient_id):String(item.sender_id);
    if(seen.has(other))continue;
    seen.add(other);
    const row=makePerson(other,t("Останній діалог: ","Latest conversation: ")+dateText(item.created_at));
    const action=node("button","profile-person-action vt-profile-message-open-"+other,t("Написати","Message"));
    action.type="button";
    action.addEventListener("click",()=>void openConversation(other));
    row.append(action);inbox.append(row);
   }
   if(!seen.size)show(inboxEmpty,t("Діалогів поки немає.","No conversations yet."));
  }catch(_){show(inboxEmpty,t("Не вдалося завантажити повідомлення.","Could not load messages."));}
 };
}


function setupProfileEdit(client,targetId,isMine,initialStatus,signupGender){
 const displayed=q("#profile-status"),statusText=q("#profile-status-text");
 let saved=String(initialStatus||"").slice(0,140);
 const render=()=>{
  statusText.textContent=saved||(isMine?t("Додайте статус","Add a status"):"");
  displayed.hidden=!saved&&!isMine;
  displayed.disabled=!isMine;
  displayed.classList.toggle("is-editable",isMine);
  if(isMine)displayed.setAttribute("aria-label",t("Змінити статус","Edit status"));
 };
 render();
 if(!isMine)return;
 const dialog=q("#profile-status-dialog"),input=q("#profile-status-input"),
  count=q("#profile-status-counter"),save=q("#profile-status-save"),note=q("#profile-status-error");
 input.placeholder=t("Напишіть статус","Write a status");
 const counter=()=>{count.textContent=Array.from(input.value).length+" / 140";};
 const openStatus=()=>{input.value=saved;counter();note.hidden=true;dialog.showModal();input.focus();};
 displayed.addEventListener("click",openStatus);
 input.addEventListener("input",counter);
 q("#profile-status-cancel").addEventListener("click",()=>dialog.close());
 q("#profile-status-form").addEventListener("submit",async event=>{
  event.preventDefault();if(save.disabled)return;
  const next=input.value.trim();
  if(Array.from(next).length>140){note.textContent=t("Статус надто довгий.","Status is too long.");note.hidden=false;return;}
  save.disabled=true;note.hidden=true;
  try{
   const {data,error}=await client.from("vatra_public_profiles")
    .update({status_text:next||null}).eq("vatra_id",targetId).select("status_text").maybeSingle();
   if(error||!data)throw error||new Error("Not persisted");
   saved=String(data.status_text||"");render();dialog.close();
  }catch(_){note.textContent=t("Статус не збережено. Спробуйте ще раз.","Could not save status. Retry.");note.hidden=false;}
  finally{save.disabled=false;}
 });
 const edit=q("#profile-edit-open"),mediaDialog=q("#profile-edit-dialog");
 edit.hidden=false;
 edit.addEventListener("click",()=>mediaDialog.showModal());
 q("#profile-edit-cancel").addEventListener("click",()=>mediaDialog.close());
 q("#profile-edit-form").addEventListener("submit",event=>{event.preventDefault();mediaDialog.close();});
}
function setupProfilePresence(client,targetId,ownId,signupGender){
 const dot=q("#profile-online-dot"),caption=q("#profile-last-seen");
 if(!dot||!caption||!window.VATRA_PRESENCE)return;
 const refresh=async()=>{
  if(String(targetId)===String(ownId))
   await window.VATRA_PRESENCE.start(client,ownId,signupGender);
  const record=await window.VATRA_PRESENCE.load(client,targetId);
  const state=window.VATRA_PRESENCE.format(record,english);
  dot.hidden=!state.online;
  caption.textContent=state.text;
  caption.hidden=state.online||!state.text;
  if(state.date)caption.dateTime=state.date.toISOString();
  dot.setAttribute("aria-label",english?"Online now":"Зараз у мережі");
 };
 void refresh();
 // One small profile-specific read per two minutes; avoid polling the whole Feed.
 const timer=setInterval(()=>{if(!document.hidden)void refresh();},120000);
 window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
}

/* Only the signed-in owner can change profile images; Storage policies and
   vatra_profile_media RLS enforce this independently of the UI. */
async function setupProfileMedia(client,ownId,targetId,isMine,userId,ownerEmail){
 const cover=q("#profile-cover-image"),coverPhoto=q("#profile-cover-photo"),avatar=q("#profile-avatar");
 const buttonAvatar=q("#profile-avatar-upload-button"),buttonCover=q("#profile-cover-upload-button");
 const fileAvatar=q("#profile-avatar-file"),fileCover=q("#profile-cover-file");
 const message=q("#profile-media-status");
 const avatarWrap=q("#profile-avatar-wrap"),avatarTrigger=q("#profile-avatar-trigger");
 const avatarMenu=q("#profile-avatar-menu"),storyButton=q("#profile-avatar-story");
 const photoButton=q("#profile-avatar-photo"),deleteStoryButton=q("#profile-avatar-story-delete"),coverView=q("#profile-cover-view");
 const mediaDialog=q("#profile-media-viewer"),mediaImage=q("#profile-media-viewer-image");
 const mediaHeading=q("#profile-media-viewer-heading"),storyDialog=q("#profile-story-viewer");
 const storyHeading=q("#profile-story-viewer-heading"),storyBody=q("#profile-story-viewer-text");
 const bucketFor=kind=>kind==="avatar"?"vatra-avatars":"vatra-covers";
 let saved=null,activeStory=null;
 const photoURLs={avatar:null,cover:null};
 const status=(text,error=false)=>{
  message.textContent=text;message.hidden=!text;
  message.dataset.status=error?"error":"ok";
 };
 const getPublicPath=(path,kind)=>{
  if(typeof path!=="string"||!path.startsWith(targetId+"/"))return null;
  try{
   const result=client.storage.from(bucketFor(kind)).getPublicUrl(path);
   const url=result?.data?.publicUrl;
   if(!url)return null;
   const parsed=new URL(url);
   if(parsed.protocol!=="https:"||parsed.hostname!=="rjasunoawrxvetwadylh.supabase.co")return null;
   return url;
  }catch(_){return null;}
 };
 const setImage=(el,url)=>{
  el.style.backgroundImage="url("+JSON.stringify(url)+")";
  el.classList.add("has-photo");
 };
 const resetImage=el=>{
  el.classList.remove("has-photo");el.style.removeProperty("background-image");
 };
 const validPhoto=url=>new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(true);
  image.onerror=()=>resolve(false);
  image.src=url;
 });
 const closeAvatarMenu=()=>{
  avatarWrap.classList.remove("is-menu-open");
  avatarTrigger.setAttribute("aria-expanded","false");
 };
 const syncAvatarMenu=()=>{
  const hasPhoto=!!photoURLs.avatar,hasStory=!!activeStory;
  avatarWrap.classList.toggle("has-active-story",hasStory);
  avatarMenu.hidden=!hasStory;
  storyButton.hidden=!hasStory;
  photoButton.hidden=!hasPhoto;
  deleteStoryButton.hidden=!hasStory||!isMine||!activeStory?.id;
  avatarTrigger.disabled=!hasPhoto&&!hasStory;
  avatarTrigger.setAttribute("aria-haspopup",hasStory?"menu":"false");
  avatarTrigger.setAttribute("aria-label",hasStory?
   t("Переглянути історію або фото","View story or photo"):
   t("Переглянути фото","View photo"));
  if(!hasPhoto&&!hasStory)closeAvatarMenu();
 };

 const interaction=q("#profile-avatar-engagement"),likesButton=q("#profile-photo-like");
 const likesCount=q("#profile-photo-like-count"),commentList=q("#profile-photo-comments");
 const commentForm=q("#profile-photo-comment-form"),commentInput=q("#profile-photo-comment-text");
 const commentSend=q("#profile-photo-comment-send"),commentStatus=q("#profile-photo-status");
 const shareButton=q("#profile-photo-share");
 const commentSort=q("#profile-photo-comment-sort"),photoCommentsMore=q("#profile-photo-comments-more");
 const commentSortNote=q("#profile-photo-comment-sort-note");
 let likeBusy=false,commentBusy=false,activityTicket=0,photoCommentOffset=0,photoCommentLoading=false;
 const photoPath=()=>saved?.avatar_path||null;
 const feedback=(value,bad=false)=>{
  commentStatus.hidden=!value;commentStatus.textContent=value;commentStatus.dataset.kind=bad?"error":"ok";
 };
 const updatePhotoSortCopy=()=>{
  q(".vt-profile-photo-sort-label-001").textContent=t("Показувати:","Show:");
  const options=commentSort.options;
  options[0].textContent=t("Найактуальніші","Most relevant");
  options[1].textContent=t("Найновіші","Newest");
  options[2].textContent=t("Усі коментарі","All comments");
  commentSortNote.textContent=commentSort.value==="relevant"?
   t("Спочатку друзі та коментарі з найбільшою кількістю вподобань.",
     "Friends and most-liked comments first."):
   commentSort.value==="newest"?
   t("Від нових до старих, без позначеного спаму.",
     "Newest first, excluding marked spam."):
   t("Усі доступні коментарі, включно з можливим спамом.",
     "All available comments, including potential spam.");
  photoCommentsMore.textContent=t("Показати ще","Show more");
 };
 updatePhotoSortCopy();
 async function reloadPhotoActivity(append=false,refreshLikes=true){
  const path=photoPath(),ticket=++activityTicket;
  if(!path)return;
  if(!append){photoCommentOffset=0;commentList.replaceChildren();photoCommentsMore.hidden=true;}
  commentList.setAttribute("aria-busy","true");photoCommentsMore.disabled=true;
  if(!append)feedback(t("Завантаження коментарів…","Loading comments…"));
  try{
   const commentsPromise=client.rpc("vatra_avatar_comment_page",{
    p_owner:Number(targetId),p_avatar_path:path,p_sort:commentSort.value,
    p_offset:photoCommentOffset,p_limit:12
   });
   const likesPromise=refreshLikes?Promise.all([
    client.from("vatra_avatar_likes").select("liker_id",{count:"exact",head:true})
     .eq("owner_vatra_id",targetId).eq("avatar_path",path),
    client.from("vatra_avatar_likes").select("liker_id")
     .eq("owner_vatra_id",targetId).eq("avatar_path",path).eq("liker_id",userId).limit(1)
   ]):Promise.resolve(null);
   const [comments,likeResults]=await Promise.all([commentsPromise,likesPromise]);
   if(comments.error)throw comments.error;
   if(likeResults){
    if(likeResults[0].error||likeResults[1].error)throw likeResults[0].error||likeResults[1].error;
    const liked=!!likeResults[1].data?.length;
    likesCount.textContent=String(likeResults[0].count||0);
    likesButton.setAttribute("aria-pressed",String(liked));
    likesButton.classList.toggle("is-liked",liked);
   }
   if(ticket!==activityTicket||path!==photoPath())return;
   const rows=comments.data||[];
   const {names,images}=await window.VATRA_POST_INTERACTIONS?.authorMap(client,rows)
    ||{names:new Map(),images:new Map()};
   const ids=rows.map(x=>x.id);
   let ownCommentLikes=new Set();
   if(ids.length){
    const reaction=await client.from("vatra_avatar_comment_likes").select("comment_id")
     .in("comment_id",ids).eq("liker_id",userId);
    if(!reaction.error)ownCommentLikes=new Set((reaction.data||[]).map(x=>x.comment_id));
   }
   if(ticket!==activityTicket||path!==photoPath())return;
   if(!append&&!rows.length)commentList.append(node("p","vt-profile-photo-no-comments-001",
    t("Коментарів поки немає.","No comments yet.")));
   for(const item of rows){
    const id=String(item.author_vatra_id);
    const member=names.get(id)||t("Учасник VATRA","VATRA member");
    const card=node("article","profile-photo-comment ui-profile-photo-comment-001");
    const head=node("div","profile-photo-comment-head ui-profile-photo-comment-head-001");
    const avatar=node("a","profile-photo-comment-avatar ui-profile-photo-comment-avatar-001",
     member.split(/\s+/).slice(0,2).map(x=>Array.from(x)[0]||"").join("").toLocaleUpperCase(locale));
    avatar.href=memberUrl(id);avatar.setAttribute("aria-label",member);
    if(images.has(id)){
     avatar.style.backgroundImage="url("+JSON.stringify(images.get(id))+")";
     avatar.classList.add("has-photo");avatar.textContent="";
    }
    const meta=node("div","profile-photo-comment-meta ui-profile-photo-comment-meta-001");
    const author=node("a","vt-profile-photo-comment-name-001",member);
    author.href=memberUrl(id);
    const stamp=node("time","vt-profile-photo-comment-time-001",dateText(item.created_at));
    stamp.dateTime=item.created_at;meta.append(author,stamp);head.append(avatar,meta);
    card.append(head,node("p","vt-profile-photo-comment-body-001",item.body));
    if(item.moderation_status==="possible_spam")
     card.append(node("small","vt-profile-photo-comment-spam-001",t("Можливий спам","Potential spam")));
    const reaction=node("button","vt-profile-photo-comment-like-001");
    reaction.type="button";
    let countValue=Number(item.likes)||0,reacted=ownCommentLikes.has(item.id);
    const paint=()=>{
     reaction.textContent=(reacted?"♥ ":"♡ ")+t("Подобається","Like")+
      (countValue?" · "+countValue:"");
     reaction.setAttribute("aria-pressed",String(reacted));
    };
    paint();
    reaction.addEventListener("click",async()=>{
     if(reaction.disabled)return;
     reaction.disabled=true;
     try{
      const result=reacted?
       await client.from("vatra_avatar_comment_likes").delete()
        .eq("comment_id",item.id).eq("liker_id",userId):
       await client.from("vatra_avatar_comment_likes").insert({comment_id:item.id,liker_id:userId});
      if(result.error)throw result.error;
      reacted=!reacted;countValue+=reacted?1:-1;paint();
     }catch(_){feedback(t("Не вдалося вподобати коментар.","Could not like the comment."),true);}
     finally{reaction.disabled=false;}
    });
    card.append(reaction);commentList.append(card);
   }
   photoCommentOffset+=rows.length;
   photoCommentsMore.hidden=rows.length<12;feedback("");
  }catch(_){
   if(ticket===activityTicket)feedback(t("Коментарі поки недоступні.","Comments are temporarily unavailable."),true);
  }finally{
   if(ticket===activityTicket){commentList.setAttribute("aria-busy","false");photoCommentsMore.disabled=false;}
  }
 }
 commentSort.addEventListener("change",()=>{updatePhotoSortCopy();void reloadPhotoActivity(false,false);});
 photoCommentsMore.addEventListener("click",()=>void reloadPhotoActivity(true,false));
 likesButton.addEventListener("click",async()=>{
  const path=photoPath();if(likeBusy||!path||!validId(ownId))return;
  likeBusy=true;likesButton.disabled=true;feedback("");
  try{
   const query=likesButton.getAttribute("aria-pressed")==="true"?
    client.from("vatra_avatar_likes").delete().eq("avatar_path",path).eq("liker_id",userId):
    client.from("vatra_avatar_likes").insert({owner_vatra_id:targetId,avatar_path:path,liker_id:userId});
   const {error}=await query;if(error)throw error;
   await reloadPhotoActivity();
  }catch(_){feedback(t("Не вдалося змінити вподобання.","Could not update like."),true);}
  finally{likeBusy=false;likesButton.disabled=false;}
 });
 commentForm.addEventListener("submit",async event=>{
  event.preventDefault();
  const path=photoPath(),body=commentInput.value.trim();
  if(commentBusy||!path||!body||Array.from(body).length>1000||!validId(ownId))return;
  commentBusy=true;commentSend.disabled=true;feedback("");
  try{
   const {error}=await client.from("vatra_avatar_comments").insert({
    owner_vatra_id:targetId,avatar_path:path,author_id:userId,author_vatra_id:ownId,body
   });
   if(error)throw error;
   commentInput.value="";await reloadPhotoActivity();
  }catch(_){feedback(t("Не вдалося додати коментар.","Could not add comment."),true);}
  finally{commentBusy=false;commentSend.disabled=false;}
 });
 shareButton.addEventListener("click",async()=>{
  const link=new URL("id"+targetId,home);link.searchParams.set("photo","avatar");
  try{
   if(navigator.share)await navigator.share({url:link.href});
   else if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(link.href);
    feedback(t("Посилання скопійовано.","Link copied."));
   }else feedback(link.href);
  }catch(error){if(error?.name!=="AbortError")feedback(t("Не вдалося поділитися.","Could not share."),true);}
 });
 q("#profile-photo-like-label").textContent=t("Подобається","Like");
 q("#profile-photo-share-label").textContent=t("Поділитися","Share");
 q("#profile-photo-comments-heading").textContent=t("Коментарі","Comments");
 q("#profile-photo-comment-text").placeholder=t("Написати коментар…","Write a comment…");
 q("#profile-photo-comment-send").textContent=t("Надіслати","Send");
 q(".vt-profile-photo-comment-label-001").textContent=t("Ваш коментар","Your comment");
 q("#profile-photo-kind").textContent=t("Фото","Photo");
 const openMedia=kind=>{
  const url=photoURLs[kind];
  if(!url)return;
  mediaHeading.textContent=kind==="avatar"?t("Фото","Photo"):t("Обкладинка","Cover photo");
  mediaDialog.dataset.kind=kind;
  interaction.hidden=kind!=="avatar";
  if(kind==="avatar"){
   q("#profile-photo-owner").textContent=q("#profile-heading").textContent;
   void reloadPhotoActivity();
  }else activityTicket++;
  mediaImage.alt=mediaHeading.textContent+" — "+q("#profile-heading").textContent;
  mediaImage.src=url;
  closeAvatarMenu();
  mediaDialog.showModal();
 };
 window.VATRA_OPEN_PROFILE_AVATAR=()=>openMedia("avatar");
 const openStory=()=>{
  if(!activeStory)return;
  if(Date.parse(activeStory.expires_at)<=Date.now()){
   activeStory=null;syncAvatarMenu();return;
  }
  storyHeading.textContent=q("#profile-heading").textContent;
  storyBody.textContent=activeStory.body;
  storyDialog.dataset.theme=String(activeStory.theme||0);
  closeAvatarMenu();
  storyDialog.showModal();
 };
 coverView.addEventListener("click",()=>openMedia("cover"));
 photoButton.addEventListener("click",()=>openMedia("avatar"));
 storyButton.addEventListener("click",openStory);
 deleteStoryButton.addEventListener("click",async()=>{
  if(!isMine||!activeStory?.id||deleteStoryButton.disabled)return;
  if(!window.confirm(t("Видалити цю історію?","Delete this story?")))return;
  const removingId=activeStory.id;
  deleteStoryButton.disabled=true;
  try{
   const result=await client.from("vatra_stories").delete()
    .eq("id",removingId).eq("author_vatra_id",ownId).select("id");
   if(result.error||!result.data?.some(row=>row.id===removingId))
    throw result.error||new Error("Story not deleted");
   activeStory=null;
   const next=await client.from("vatra_stories").select("id,body,theme,expires_at")
    .eq("author_vatra_id",ownId).gt("expires_at",new Date().toISOString())
    .order("created_at",{ascending:false}).limit(1);
   if(!next.error&&next.data?.[0])activeStory=next.data[0];
   if(storyDialog.open)storyDialog.close();
   closeAvatarMenu();syncAvatarMenu();
   status(t("Історію видалено.","Story deleted."));
  }catch(_){
   status(t("Не вдалося видалити історію. Спробуйте ще раз.",
    "Could not delete the story. Please retry."),true);
  }finally{deleteStoryButton.disabled=false;}
 });
 q("#profile-media-viewer-close").addEventListener("click",()=>mediaDialog.close());
 q("#profile-story-viewer-close").addEventListener("click",()=>storyDialog.close());
 mediaDialog.addEventListener("click",event=>{if(event.target===mediaDialog)mediaDialog.close();});
 storyDialog.addEventListener("click",event=>{if(event.target===storyDialog)storyDialog.close();});
 avatarTrigger.addEventListener("click",()=>{
  if(activeStory){
   avatarWrap.classList.toggle("is-menu-open");
   avatarTrigger.setAttribute("aria-expanded",String(avatarWrap.classList.contains("is-menu-open")));
  }else if(photoURLs.avatar)openMedia("avatar");
 });
 avatarWrap.addEventListener("pointerleave",closeAvatarMenu);
 avatarWrap.addEventListener("keydown",event=>{
  if(event.key==="Escape"){
   closeAvatarMenu();avatarTrigger.focus();
  }else if(event.key==="ArrowDown"&&!avatarMenu.hidden){
   const item=[storyButton,photoButton,deleteStoryButton].find(button=>!button.hidden);
   if(item){event.preventDefault();item.focus();}
  }
 });
 document.addEventListener("pointerdown",event=>{
  if(!avatarWrap.contains(event.target))closeAvatarMenu();
 });
 // A real <img> is independent of the decorative CSS fallback, masks and pseudoelements.
 coverPhoto.addEventListener("load",()=>{
  if(!photoURLs.cover)return;
  coverPhoto.hidden=false;
  cover.classList.add("has-photo");
  coverView.hidden=false;
 });
 coverPhoto.addEventListener("error",()=>{
  coverPhoto.hidden=true;coverView.hidden=true;
  cover.classList.remove("has-photo");
 });
 const display=record=>{
  photoURLs.cover=record?.cover_path?getPublicPath(record.cover_path,"cover"):null;
  photoURLs.avatar=record?.avatar_path?getPublicPath(record.avatar_path,"avatar"):null;
  if(isMine)window.VATRA_AVATAR?.fromPath(client,ownerEmail,ownId,record?.avatar_path||null);
  cover.style.removeProperty("background-image");
  cover.style.removeProperty("--vatra-cover-image");
  cover.classList.remove("has-photo");
  coverView.hidden=true;
  coverPhoto.hidden=true;
  if(photoURLs.cover)coverPhoto.src=photoURLs.cover;
  else coverPhoto.removeAttribute("src");
  const coverReady=photoURLs.cover&&typeof coverPhoto.decode==="function"?
   coverPhoto.decode().then(()=>{
    if(!photoURLs.cover)return;
    coverPhoto.hidden=false;cover.classList.add("has-photo");coverView.hidden=false;
   }).catch(()=>{}):Promise.resolve();
  resetImage(avatar);
  const fallback=(q("#profile-heading")?.textContent||"V").trim().split(/\s+/)
   .map(word=>Array.from(word)[0]||"").slice(0,2).join("").toLocaleUpperCase()||"V";
  avatar.textContent=fallback;
  for(const postAvatar of document.querySelectorAll("#profile-posts .feed-post-avatar")){
   resetImage(postAvatar);postAvatar.textContent=fallback;
  }
  const candidate=photoURLs.avatar;
  let avatarReady=Promise.resolve();
  if(candidate)avatarReady=validPhoto(candidate).then(valid=>{
   if(photoURLs.avatar!==candidate)return;
   if(!valid){photoURLs.avatar=null;syncAvatarMenu();return;}
   setImage(avatar,candidate);avatar.textContent="";
   for(const postAvatar of document.querySelectorAll("#profile-posts .feed-post-avatar")){
    setImage(postAvatar,candidate);postAvatar.textContent="";
   }
   if(isMine){
    const menuAvatar=q("#feed-header-avatar");
    if(menuAvatar){setImage(menuAvatar,candidate);menuAvatar.textContent="";}
   }
  });
  syncAvatarMenu();
  return Promise.allSettled([avatarReady,coverReady]);
 };
 try{
  const {data,error}=await client.from("vatra_profile_media")
   .select("avatar_path,cover_path").eq("vatra_id",targetId).maybeSingle();
  if(!error&&data){saved=data;await display(data);}
 }catch(_){/* Profile itself still loads when images are unavailable. */}
 finally{
  cover.classList.remove("is-loading-media");
  avatarWrap.classList.remove("is-loading-media");
 }
 // Story visibility is enforced by existing Supabase RLS: own or accepted
 // friends only. Never show a ring for expired or inaccessible stories.
 try{
  const {data,error}=await client.from("vatra_stories")
   .select("id,body,theme,expires_at")
   .eq("author_vatra_id",targetId)
   .gt("expires_at",new Date().toISOString())
   .order("created_at",{ascending:false})
   .limit(1);
  if(!error&&Array.isArray(data)&&typeof data[0]?.body==="string")
   activeStory=data[0];
 }catch(_){/* An inaccessible story must not prevent loading the profile. */}
 syncAvatarMenu();
 if(!isMine||!validId(ownId))return;
 buttonAvatar.hidden=false;buttonCover.hidden=false;
 const fileTypes={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
 let uploading=false;
 async function uploadImage(file,kind){
  if(uploading)return;
  const ext=fileTypes[file?.type];
  if(!ext||!file?.size||file.size>6291456){
   status(t("Оберіть JPEG, PNG або WebP до 6 МБ.","Choose a JPEG, PNG or WebP under 6 MB."),true);return;
  }
  uploading=true;buttonAvatar.disabled=true;buttonCover.disabled=true;
  status(t("Завантажуємо зображення…","Uploading image…"));
  const filename=typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function"?
   crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),
    value=>value.toString(16).padStart(2,"0")).join("");
  const path=ownId+"/"+kind+"/"+filename+"."+ext;
  try{
   const {error:uploadError}=await client.storage.from(bucketFor(kind)).upload(path,file,{
    contentType:file.type,cacheControl:"3600",upsert:false
   });
   if(uploadError)throw uploadError;
   const column=kind==="avatar"?"avatar_path":"cover_path";
   const values={[column]:path,updated_at:new Date().toISOString()};
   const operation=saved?
    client.from("vatra_profile_media").update(values).eq("vatra_id",ownId)
     .select("vatra_id,"+column).maybeSingle():
    client.from("vatra_profile_media").insert({vatra_id:ownId,...values})
     .select("vatra_id,"+column).maybeSingle();
   const {data:stored,error:dbError}=await operation;
   if(dbError||String(stored?.[column]||"")!==path){
    // Do not remove the uploaded binary: the database may have committed while
    // its response was lost. Retain it for recovery rather than leave a broken
    // cover/avatar pointer to a physically deleted object.
    throw dbError||new Error("Profile media update did not persist");
   }
   // Never delete the former avatar or cover on replacement. The user may
   // restore it later; a separate version-history workflow controls retention.
   saved={...saved,...values};
   display(saved);
   if(kind==="avatar")window.VATRA_AVATAR?.fromPath(client,ownerEmail,ownId,path);
   status(t("Зображення збережено.","Image saved."));
  }catch(_){status(t("Не вдалося завантажити зображення. Спробуйте ще раз.",
   "Could not upload the image. Please retry."),true);}
  finally{
   uploading=false;buttonAvatar.disabled=false;buttonCover.disabled=false;
   fileAvatar.value="";fileCover.value="";
  }
 }
 buttonAvatar.addEventListener("click",()=>fileAvatar.click());
 buttonCover.addEventListener("click",()=>fileCover.click());
 fileAvatar.addEventListener("change",()=>{if(fileAvatar.files?.[0])void uploadImage(fileAvatar.files[0],"avatar");});
 fileCover.addEventListener("change",()=>{if(fileCover.files?.[0])void uploadImage(fileCover.files[0],"cover");});

}
async function loadOwnHeaderAvatar(client,ownId,email){
 if(!validId(ownId))return;
 try{
  const {data,error}=await client.from("vatra_profile_media")
   .select("avatar_path").eq("vatra_id",ownId).maybeSingle();
  const path=data?.avatar_path;
  if(error)return;
  window.VATRA_AVATAR?.fromPath(client,email,ownId,path||null);
  if(typeof path!=="string"||!path.startsWith(ownId+"/avatar/"))return;
  const url=client.storage.from("vatra-avatars").getPublicUrl(path)?.data?.publicUrl;
  if(!url)return;
  const parsed=new URL(url);
  if(parsed.protocol!=="https:"||parsed.hostname!=="rjasunoawrxvetwadylh.supabase.co")return;
  const el=q("#feed-header-avatar");
  if(!el)return;
  const check=new Image();
  check.onload=()=>{
   if(!el.isConnected)return;
   el.style.backgroundImage="url("+JSON.stringify(url)+")";
   el.classList.add("has-photo");el.textContent="";
  };
  check.onerror=()=>{
   el.classList.remove("has-photo");el.style.removeProperty("background-image");
   window.VATRA_AVATAR?.cache(email,null);
  };
  check.src=url;
 }catch(_){/* Use the normal initials avatar when the image is unavailable. */}
}
async function start(){
 await window.VATRA_LANGUAGE?.ready;
 localizeSocial();
 if(!window.supabase?.createClient){
  gateError(t("Не вдалося відкрити VATRA","Could not open VATRA"));return;
 }
 try{
  const client=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
   auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}
  });
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user?.id||!data.user.email_confirmed_at){location.replace(home);return;}
  const user=data.user,metadata=user.user_metadata||{};
  const ownName=[metadata.first_name,metadata.last_name]
   .filter(value=>typeof value==="string"&&value.trim())
   .map(value=>value.trim()).join(" ")
   ||String(metadata.full_name||"").trim()||t("Учасник VATRA","VATRA member");
  const cleanOwnName=Array.from(ownName).slice(0,100).join("");
  const nameParts=cleanOwnName.split(/\s+/).filter(Boolean);
  const first=Array.from(nameParts[0]||"V")[0]||"V";
  const last=nameParts.length>1?(Array.from(nameParts[nameParts.length-1])[0]||""):"";
  const ownAvatar=(first+last).toLocaleUpperCase(locale);
  const {data:account,error:accountError}=await client.from("accounts")
   .select("vatra_id").eq("user_id",user.id).maybeSingle();
  const ownId=!accountError&&account?.vatra_id!=null?String(account.vatra_id):null;
  if(ownId){
   void window.VATRA_PRESENCE?.start(client,ownId,metadata.gender);
   window.VATRA_NOTIFICATIONS?.start(client,ownId);
  }
  const headerName=Array.from((typeof metadata.first_name==="string"&&metadata.first_name.trim()?metadata.first_name.trim():cleanOwnName.trim().split(/\s+/)[0])||"VATRA").slice(0,28).join("");
  window.VATRA_AVATAR?.setHeader({email:user.email,name:headerName,initials:ownAvatar,id:ownId});
  setMenuLink(ownId);
  // Keep the signed-in user's avatar even when a visited VATRA ID does not exist.
  window.VATRA_AVATAR?.applyRemembered(q("#feed-header-avatar"),user.email);
  void loadOwnHeaderAvatar(client,ownId,user.email);
  const form=q("#feed-search-form");
  form?.addEventListener("submit",event=>{
   event.preventDefault();
   const search=q("#feed-search-input").value.trim().slice(0,120);
   location.href=new URL("feed"+(search?"?q="+encodeURIComponent(search):""),home).href;
  });
  const menu=q(".feed-account-menu");
  document.addEventListener("click",event=>{
   if(menu?.open&&!menu.contains(event.target))menu.open=false;
  });
  document.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&menu?.open)menu.open=false;
  });
  q("#feed-logout").addEventListener("click",async()=>{
   const button=q("#feed-logout");button.disabled=true;
   const {error:signOutError}=await client.auth.signOut({scope:"local"});
   if(signOutError){button.disabled=false;return;}
   try{sessionStorage.setItem("vatra-just-signed-out","1");}catch(_){}
   window.VATRA_AVATAR?.clearHeader();
   location.replace(home);
  });

  const query=new URLSearchParams(location.search);
  const requested=query.get("vatra_id")||
   location.pathname.match(/\/id([1-9][0-9]{0,18})$/)?.[1]||null;
  const targetId=requested||ownId;
  if(!validId(targetId)){missingProfile();return;}
  const {data:member,error:directoryError}=await client.from("vatra_directory")
   .select("vatra_id").eq("vatra_id",targetId).maybeSingle();
  if(directoryError)throw directoryError;
  if(!member){missingProfile();return;}
  const isMine=targetId===ownId;
  const createLink=q("#profile-write-post");
  if(createLink)createLink.hidden=!isMine;
  q("#profile-tab-friends").hidden=isMine;
  if(isMine)bindPostComposer(client,user,ownId);
  // The account creation trigger publishes only registered first/last names
  // to vatra_public_profiles. Birthdate, gender, email and auth UUID remain private.
  let publicName="",publicStatus="";
  try{
   const {data:publicProfile,error:publicError}=await client.from("vatra_public_profiles")
    .select("display_name,status_text").eq("vatra_id",targetId).maybeSingle();
   if(!publicError&&typeof publicProfile?.display_name==="string"){
    publicName=publicProfile.display_name.trim();
    publicStatus=String(publicProfile.status_text||"").slice(0,140);
   }
  }catch(_){}
  const fallback=t("Учасник VATRA","VATRA member")+" · ID "+targetId;
  const name=publicName||(isMine?cleanOwnName:fallback);
  q("#profile-heading").textContent=name;
  q("#profile-avatar").textContent=isMine?ownAvatar:(publicName?(
    publicName.trim().split(/\s+/).filter(Boolean).map(x=>Array.from(x)[0]).slice(0,2).join("").toLocaleUpperCase(locale)
   ):"V");
  setupProfileEdit(client,targetId,isMine,publicStatus,metadata.gender);
 
  if(isMine){
   q("#profile-about-text").textContent=t(
    "Інформацію про себе поки не додано.",
    "You have not added profile details yet.");
  }
  if(!isMine){
   q("#profile-about-heading").textContent=t("Інформація","Information");
   q("#profile-about-text").textContent=t(
    "Користувач ще не додав інформацію про себе.",
    "This member has not added profile details yet.");
  }
  document.title=(isMine?t("Моя сторінка","My page"):t("Профіль","Profile"))+" · VATRA";
  setupProfileInteractions(client,ownId,targetId,isMine);
  setupProfileExtraSections(client,ownId,targetId,user.id,isMine);
  setupProfileGallery(client,targetId);
  // Keep the skeleton until both real photos have loaded, rather than flashing
  // default avatar/cover followed by the user's real artwork.
  const mediaPromise=setupProfileMedia(client,ownId,targetId,isMine,user.id,user.email);
  const sharedPhoto=new URLSearchParams(location.search).get("photo")==="avatar";
  const canonical=memberUrl(targetId);
  if(location.pathname!==new URL(canonical).pathname||location.search||location.hash){
   history.replaceState(history.state,"",canonical);
  }
  const list=q("#profile-posts");
  if(list){
   for(let i=0;i<2;i++){
    const card=node("div","feed-post-placeholder ui-profile-post-placeholder-00"+(i+1));
    card.setAttribute("aria-hidden","true");
    card.append(node("span","feed-post-placeholder-head ui-profile-post-placeholder-head-00"+(i+1)),
     node("span","feed-post-placeholder-line ui-profile-post-placeholder-line-00"+(i+1)));
    list.append(card);
   }
  }
  setupProfilePresence(client,targetId,ownId,metadata.gender);
  const postsPromise=loadPosts(client,targetId,ownId,user.id);
  try{await mediaPromise;}catch(_){
   q("#profile-cover-image")?.classList.remove("is-loading-media");
   q("#profile-avatar-wrap")?.classList.remove("is-loading-media");
  }
  finish();
  if(sharedPhoto)window.VATRA_OPEN_PROFILE_AVATAR?.();
  void postsPromise;
 }catch(_){
  gateError(t("Не вдалося завантажити профіль. Оновіть сторінку.",
   "Could not load this profile. Please refresh."));
 }
}
void start();
})();