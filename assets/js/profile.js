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
 q("#profile-vatra-id")?.remove();
 q(".profile-actions")?.remove();
 q(".social-profile-tabs")?.remove();
 q(".profile-panels")?.remove();
 document.title=t("Користувача не знайдено · VATRA","User not found · VATRA");
 finish();
}
async function loadPosts(client,targetId){
 const list=q("#profile-posts"),empty=q("#profile-posts-empty");
 q("#profile-posts-title").textContent=t("Публікації","Posts");
 list.setAttribute("aria-busy","true");
 try{
  const {data,error}=await client.from("feed_posts")
   .select("id,author_vatra_id,body,created_at,media_kind,media_path")
   .eq("author_vatra_id",targetId)
   .order("created_at",{ascending:false})
   .order("id",{ascending:false}).range(0,14);
  if(error)throw error;
  list.replaceChildren();
  for(const post of data||[]){
   const article=node("article","feed-post-card ui-profile-post-card-001");
   const header=node("div","feed-post-header ui-profile-post-header-001");
   const identity=node("div","feed-post-author ui-profile-post-author-001");
   const name=node("a","feed-post-name vt-profile-post-name-001 feed-post-profile-link",
    q("#profile-heading").textContent);
   name.href=memberUrl(targetId);
   const stamp=node("time","feed-post-date vt-profile-post-date-001",
    "VATRA ID "+targetId+" · "+dateText(post.created_at));
   stamp.dateTime=post.created_at;
   identity.append(name,stamp);
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
   article.append(header);
   if(post.body)article.append(node("p","feed-post-body vt-profile-post-body-001",post.body));
   if(post.media_kind&&post.media_path)void window.VATRA_POST_MEDIA?.mount(client,post,article);
   list.append(article);
  }
  empty.hidden=(data||[]).length>0;
  if(!empty.hidden)empty.textContent=t("Публікацій поки немає.","No posts yet.");
 }catch(_){
  list.replaceChildren();
  empty.textContent=t("Не вдалося завантажити публікації. Спробуйте оновити сторінку.",
   "Could not load posts. Try refreshing this page.");
  empty.hidden=false;
 }finally{list.setAttribute("aria-busy","false");}
}
function bindPostComposer(client,user,ownId){
 const trigger=q("#profile-write-post");
 const dialog=q("#profile-compose-dialog");
 const form=q("#profile-compose-form");
 const input=q("#profile-compose-text");
 const submit=q("#profile-compose-submit");
 const cancel=q("#profile-compose-cancel");
 const counter=q("#profile-compose-counter");
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
    author_id:user.id,author_vatra_id:ownId,body,...(uploaded||{})
   });
   if(error)throw error;
   input.value="";picker?.reset();
   dialog.close();
   await loadPosts(client,ownId);
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
 }
 for(const tab of tabs){
  tab.addEventListener("click",()=>choose(tab.dataset.profileTab));
  tab.addEventListener("keydown",e=>{
   if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
   const visible=tabs.filter(x=>!x.hidden);
   const next=visible[(visible.indexOf(tab)+(e.key==="ArrowRight"?1:-1)+visible.length)%visible.length];
   e.preventDefault();next.focus();choose(next.dataset.profileTab);
  });
 }
 q("#profile-tab-messages").hidden=!isMine;
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
    const bubble=node("div","profile-message-bubble ui-profile-message-bubble-001",m.body);
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
   friendButton.textContent=relation?.status==="accepted"?t("У друзях · Видалити","Friends · Remove"):
    relation?.status==="pending"?(outgoing?t("Заявку надіслано · Скасувати","Request sent · Cancel"):
     t("Прийняти заявку","Accept request")):t("Додати в друзі","Add friend");
  };
  friendButton.textContent=t("Додати в друзі","Add friend");
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


/* Only the signed-in owner can change profile images; Storage policies and
   vatra_profile_media RLS enforce this independently of the UI. */
async function setupProfileMedia(client,ownId,targetId,isMine,userId){
 const cover=q("#profile-cover-image"),avatar=q("#profile-avatar");
 const buttonAvatar=q("#profile-avatar-upload-button"),buttonCover=q("#profile-cover-upload-button");
 const fileAvatar=q("#profile-avatar-file"),fileCover=q("#profile-cover-file");
 const message=q("#profile-media-status");
 const avatarWrap=q("#profile-avatar-wrap"),avatarTrigger=q("#profile-avatar-trigger");
 const avatarMenu=q("#profile-avatar-menu"),storyButton=q("#profile-avatar-story");
 const photoButton=q("#profile-avatar-photo"),coverView=q("#profile-cover-view");
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
 let likeBusy=false,commentBusy=false,activityTicket=0;
 const photoPath=()=>saved?.avatar_path||null;
 const feedback=(value,bad=false)=>{
  commentStatus.hidden=!value;commentStatus.textContent=value;commentStatus.dataset.kind=bad?"error":"ok";
 };
 async function reloadPhotoActivity(){
  const path=photoPath(),ticket=++activityTicket;
  if(!path)return;
  commentList.setAttribute("aria-busy","true");feedback(t("Завантаження коментарів…","Loading comments…"));
  try{
   const [likes,comments]=await Promise.all([
    client.from("vatra_avatar_likes").select("liker_id")
     .eq("owner_vatra_id",targetId).eq("avatar_path",path).limit(2000),
    client.from("vatra_avatar_comments").select("id,author_vatra_id,body,created_at")
     .eq("owner_vatra_id",targetId).eq("avatar_path",path)
     .order("created_at",{ascending:false}).limit(100)
   ]);
   if(likes.error||comments.error)throw likes.error||comments.error;
   if(ticket!==activityTicket||path!==photoPath())return;
   const liked=(likes.data||[]).some(row=>row.liker_id===userId);
   likesCount.textContent=likes.data?.length===2000?"2000+":String(likes.data?.length||0);
   likesButton.setAttribute("aria-pressed",String(liked));
   likesButton.classList.toggle("is-liked",liked);
   const authors=[...new Set((comments.data||[]).map(row=>String(row.author_vatra_id)).filter(validId))];
   const names=new Map();
   if(authors.length){
    const {data}=await client.from("vatra_public_profiles").select("vatra_id,display_name").in("vatra_id",authors);
    for(const row of data||[])names.set(String(row.vatra_id),row.display_name);
   }
   if(ticket!==activityTicket||path!==photoPath())return;
   commentList.replaceChildren();
   if(!comments.data?.length){
    commentList.append(node("p","vt-profile-photo-no-comments-001",
     t("Коментарів поки немає.","No comments yet.")));
   }
   for(const item of comments.data||[]){
    const card=node("article","profile-photo-comment ui-profile-photo-comment-001");
    const name=node("strong","vt-profile-photo-comment-name-001",
     names.get(String(item.author_vatra_id))||t("Учасник VATRA","VATRA member"));
    const stamp=node("time","vt-profile-photo-comment-time-001",dateText(item.created_at));
    stamp.dateTime=item.created_at;
    card.append(name,stamp,node("p","vt-profile-photo-comment-body-001",item.body));
    commentList.append(card);
   }
   feedback("");
  }catch(_){
   if(ticket===activityTicket)feedback(t("Коментарі поки недоступні.","Comments are temporarily unavailable."),true);
  }finally{if(ticket===activityTicket)commentList.setAttribute("aria-busy","false");}
 }
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
   const item=[storyButton,photoButton].find(button=>!button.hidden);
   if(item){event.preventDefault();item.focus();}
  }
 });
 document.addEventListener("pointerdown",event=>{
  if(!avatarWrap.contains(event.target))closeAvatarMenu();
 });
 const display=record=>{
  photoURLs.cover=record?.cover_path?getPublicPath(record.cover_path,"cover"):null;
  photoURLs.avatar=record?.avatar_path?getPublicPath(record.avatar_path,"avatar"):null;
  coverView.hidden=!photoURLs.cover;
  // Render the real cover as one rectangular background layer, never a decorative pseudo-element.
  if(photoURLs.cover)setImage(cover,photoURLs.cover);
  else{cover.style.removeProperty("background-image");cover.classList.remove("has-photo");}
  if(photoURLs.avatar){
   setImage(avatar,photoURLs.avatar);avatar.textContent="";
   // Posts may load before profile media; update their avatars after the
   // photo arrives so the same post looks identical on the Feed and profile.
   for(const postAvatar of document.querySelectorAll("#profile-posts .feed-post-avatar")){
    setImage(postAvatar,photoURLs.avatar);
    postAvatar.textContent="";
   }
   if(isMine){
    const menuAvatar=q("#feed-header-avatar");
    if(menuAvatar){setImage(menuAvatar,photoURLs.avatar);menuAvatar.textContent="";}
   }
  }
  syncAvatarMenu();
 };
 try{
  const {data,error}=await client.from("vatra_profile_media")
   .select("avatar_path,cover_path").eq("vatra_id",targetId).maybeSingle();
  if(!error&&data){saved=data;display(data);}
 }catch(_){/* Profile itself still loads when images are unavailable. */}
 finally{
  cover.classList.remove("is-loading-media");
  avatarWrap.classList.remove("is-loading-media");
 }
 // Story visibility is enforced by existing Supabase RLS: own or accepted
 // friends only. Never show a ring for expired or inaccessible stories.
 try{
  const {data,error}=await client.from("vatra_stories")
   .select("body,theme,expires_at")
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
    client.from("vatra_profile_media").update(values).eq("vatra_id",ownId):
    client.from("vatra_profile_media").insert({vatra_id:ownId,...values});
   const {error:dbError}=await operation;
   if(dbError){
    try{await client.storage.from(bucketFor(kind)).remove([path]);}catch(_){}
    throw dbError;
   }
   const previous=saved?.[column];
   saved={...saved,...values};
   display(saved);
   status(t("Зображення збережено.","Image saved."));
   if(previous&&previous!==path){
    try{await client.storage.from(bucketFor(kind)).remove([previous]);}catch(_){}
   }
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
async function loadOwnHeaderAvatar(client,ownId){
 if(!validId(ownId))return;
 try{
  const {data,error}=await client.from("vatra_profile_media")
   .select("avatar_path").eq("vatra_id",ownId).maybeSingle();
  const path=data?.avatar_path;
  if(error||typeof path!=="string"||!path.startsWith(ownId+"/avatar/"))return;
  const url=client.storage.from("vatra-avatars").getPublicUrl(path)?.data?.publicUrl;
  if(!url)return;
  const parsed=new URL(url);
  if(parsed.protocol!=="https:"||parsed.hostname!=="rjasunoawrxvetwadylh.supabase.co")return;
  const el=q("#feed-header-avatar");
  if(!el)return;
  el.style.backgroundImage="url("+JSON.stringify(url)+")";
  el.classList.add("has-photo");
  el.textContent="";
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
  q("#feed-header-avatar").textContent=ownAvatar;
  q("#feed-menu-name").textContent=Array.from((typeof metadata.first_name==="string"&&metadata.first_name.trim()?metadata.first_name.trim():cleanOwnName.trim().split(/\s+/)[0])||"VATRA").slice(0,28).join("");
  q("#feed-header-id").textContent=ownId?"VATRA ID "+ownId:"";
  setMenuLink(ownId);
  // Keep the signed-in user's avatar even when a visited VATRA ID does not exist.
  void loadOwnHeaderAvatar(client,ownId);
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
  if(isMine)bindPostComposer(client,user,ownId);
  // The account creation trigger publishes only registered first/last names
  // to vatra_public_profiles. Birthdate, gender, email and auth UUID remain private.
  let publicName="";
  try{
   const {data:publicProfile,error:publicError}=await client.from("vatra_public_profiles")
    .select("display_name").eq("vatra_id",targetId).maybeSingle();
   if(!publicError&&typeof publicProfile?.display_name==="string")
    publicName=publicProfile.display_name.trim();
  }catch(_){}
  const fallback=t("Учасник VATRA","VATRA member")+" · ID "+targetId;
  const name=publicName||(isMine?cleanOwnName:fallback);
  q("#profile-heading").textContent=name;
  q("#profile-avatar").textContent=isMine?ownAvatar:(publicName?(
    publicName.trim().split(/\s+/).filter(Boolean).map(x=>Array.from(x)[0]).slice(0,2).join("").toLocaleUpperCase(locale)
   ):"V");
  q("#profile-vatra-id").textContent="VATRA ID "+targetId;
 
  if(isMine){
   q("#profile-about-text").textContent=t(
    "Інформацію про себе поки не додано.",
    "You have not added profile details yet.");
  }
  if(!isMine){
   q("#profile-about-heading").textContent=t("Профіль користувача","Member profile");
   q("#profile-about-text").textContent=t(
    "Користувач ще не додав інформацію про себе.",
    "This member has not added profile details yet.");
  }
  document.title=(isMine?t("Моя сторінка","My page"):t("Профіль","Profile"))+" · VATRA";
  setupProfileInteractions(client,ownId,targetId,isMine);
  /* Keep the real profile cover and avatar fallback visible while media arrives. */
  // Media and Stories can arrive after the identity is verified; do not hold
  // the entire profile behind a splash while these secondary requests run.
  const mediaPromise=setupProfileMedia(client,ownId,targetId,isMine,user.id);
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
  finish();
  void loadPosts(client,targetId);
  void mediaPromise.then(()=>{
   if(sharedPhoto)window.VATRA_OPEN_PROFILE_AVATAR?.();
  }).catch(()=>{
   q("#profile-cover-image")?.classList.remove("is-loading-media");
   q("#profile-avatar-wrap")?.classList.remove("is-loading-media");
  });
 }catch(_){
  gateError(t("Не вдалося завантажити профіль. Оновіть сторінку.",
   "Could not load this profile. Please refresh."));
 }
}
void start();
})();