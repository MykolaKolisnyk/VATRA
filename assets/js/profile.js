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
 q("#profile-tab-posts").hidden=true;
 q("#profile-about-card").hidden=false;
 q(".profile-actions").hidden=true;
 q("#profile-heading").textContent=t("Профіль не знайдено","Profile not found");
 q("#profile-vatra-id").textContent="";
 q("#profile-avatar").textContent="?";
 q("#profile-about-heading").textContent=t("Недоступний профіль","Unavailable profile");
 q("#profile-about-text").textContent=t(
  "Такого VATRA ID немає. Перевірте адресу профілю.",
  "This VATRA ID does not exist. Check the profile address.");
 q("#profile-posts-section").hidden=true;
 const createLink=q("#profile-write-post");
 if(createLink)createLink.hidden=true;
 document.title=t("Профіль не знайдено · VATRA","Profile not found · VATRA");
 finish();
}
async function loadPosts(client,targetId){
 const list=q("#profile-posts"),empty=q("#profile-posts-empty");
 q("#profile-posts-title").textContent=t("Публікації","Posts");
 list.setAttribute("aria-busy","true");
 try{
  const {data,error}=await client.from("feed_posts")
   .select("id,author_vatra_id,body,created_at")
   .eq("author_vatra_id",targetId)
   .order("created_at",{ascending:false})
   .order("id",{ascending:false}).range(0,14);
  if(error)throw error;
  list.replaceChildren();
  for(const post of data||[]){
   const article=node("article","feed-post-card ui-profile-post-card-001");
   const header=node("div","feed-post-header ui-profile-post-header-001");
   const identity=node("div","feed-post-author ui-profile-post-author-001");
   identity.append(
    node("strong","feed-post-name vt-profile-post-name-001",q("#profile-heading").textContent),
    node("time","feed-post-date vt-profile-post-date-001",dateText(post.created_at))
   );
   identity.querySelector("time").dateTime=post.created_at;
   const avatar=node("span","feed-avatar feed-post-avatar vt-profile-post-avatar-001",q("#profile-avatar").textContent||"V");
   avatar.setAttribute("aria-hidden","true");
   header.append(avatar,identity);
   article.append(header,node("p","feed-post-body vt-profile-post-body-001",post.body));
   list.append(article);
  }
  empty.hidden=(data||[]).length>0;
  if(!empty.hidden)empty.textContent=t("Публікацій поки немає.","No posts yet.");
 }catch(_){
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
 let publishing=false;
 const update=()=>{
  const length=Array.from(input.value).length;
  counter.textContent=length+" / 2000";
  submit.disabled=publishing||length===0||length>2000;
 };
 const clearStatus=()=>{status.textContent="";status.hidden=true;};
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
  const body=input.value.trim();
  if(!body||Array.from(body).length>2000){
   status.textContent=t("Допис має містити від 1 до 2000 символів.","A post must contain 1–2000 characters.");
   status.hidden=false;return;
  }
  publishing=true;
  update();
  clearStatus();
  try{
   const {error}=await client.from("feed_posts").insert({
    author_id:user.id,author_vatra_id:ownId,body
   });
   if(error)throw error;
   input.value="";
   dialog.close();
   await loadPosts(client,ownId);
  }catch(_){
   status.textContent=t("Не вдалося опублікувати допис. Повторіть спробу.",
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
  // Never expose the internal Supabase auth UUID or the intermediate /profile URL.
  const canonical=memberUrl(targetId);
  if(location.pathname!==new URL(canonical).pathname||location.search||location.hash){
   history.replaceState(history.state,"",canonical);
  }
  // Keep the real member loading state until the first posts request completes.
  await loadPosts(client,targetId);
  finish();
 }catch(_){
  gateError(t("Не вдалося завантажити профіль. Оновіть сторінку.",
   "Could not load this profile. Please refresh."));
 }
}
void start();
})();