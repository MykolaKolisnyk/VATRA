
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript?.src||"assets/js/friends.js");
const q=s=>document.querySelector(s);
const language=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
const t=(uk,english)=>{
 const locale=language();
 if(locale==="uk")return uk;
 const translated=window.VATRA_LANGUAGE?.translate?.(uk);
 return typeof translated==="string"&&translated!==uk?translated:
  locale==="en"?english:uk;
};
const validId=id=>/^[1-9][0-9]{0,18}$/.test(String(id??""));
const make=(tag,cls,label)=>{
 const node=document.createElement(tag);node.className=cls;
 if(label!==undefined)node.textContent=label;return node;
};
let client=null,ownId=null,targetId=null,rows=[],names=new Map(),photos=new Map(),accountStates=new Map();
let current="accepted",search="",busy=false,me=true;
let presence=new Map(),presenceBusy=false,presenceAvailable=false;
function stateFor(item){
 if(item.status==="accepted")return "accepted";
 if(String(item.recipient_id)===String(targetId))return "incoming";
 return "outgoing";
}
function counterpart(item){
 return String(item.requester_id)===String(targetId)?
  String(item.recipient_id):String(item.requester_id);
}
async function data(){
 const result=await client.from("friendships")
  .select("id,requester_id,recipient_id,status,created_at")
  .or("requester_id.eq."+targetId+",recipient_id.eq."+targetId)
  .order("created_at",{ascending:false}).limit(350);
 if(result.error)throw result.error;
 rows=result.data||[];
 const ids=[...new Set(rows.map(counterpart).filter(validId))];

 const batches=[];
 for(let i=0;i<ids.length;i+=100)batches.push(ids.slice(i,i+100));
 const [profiles,media,states]=await Promise.all([
  Promise.allSettled(batches.map(batch=>
   window.VATRA_PUBLIC_NAMES?.get?.(client,batch)||
   client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",batch))),
  Promise.allSettled(batches.map(batch=>
   window.VATRA_AVATAR?.paths?.(client,batch)||
   client.from("profile_media").select("vatra_id,avatar_path").in("vatra_id",batch))),
  Promise.allSettled(batches.map(batch=>
   window.VATRA_AVATAR?.states?.(client,batch)||Promise.resolve(new Map())))
 ]);
 accountStates=new Map();names=new Map();photos=new Map();
 for(const result of states)if(result.status==="fulfilled")
  for(const [id,state] of result.value)accountStates.set(String(id),state);
 for(const result of profiles)if(result.status==="fulfilled"&&!result.value.error)
  for(const profile of result.value.data||[])
   names.set(String(profile.vatra_id),String(profile.display_name||"").trim().slice(0,100));
 for(const result of media)if(result.status==="fulfilled"&&!result.value.error)
  for(const entry of result.value.data||[]){
   const id=String(entry.vatra_id),path=entry.avatar_path;
   if(accountStates.has(id)||typeof path!=="string"||!path.startsWith(id+"/avatar/"))continue;
   try{
    const url=client.storage.from("avatars").getPublicUrl(path)?.data?.publicUrl;
    const parsed=new URL(url);
    if(parsed.protocol==="https:"&&parsed.hostname==="rjasunoawrxvetwadylh.supabase.co")
     photos.set(id,parsed.href);
   }catch(_){}
  }
}
async function refreshPresence(){
 if(!me||presenceBusy||!client)return;
 presenceBusy=true;
 try{
  const ids=[...new Set(rows.filter(item=>stateFor(item)==="accepted").map(counterpart).filter(validId))];
  const next=new Map();
  for(let i=0;i<ids.length;i+=100){
   const {data,error}=await client.from("profile_presence").select("vatra_id,last_seen_at,form").in("vatra_id",ids.slice(i,i+100));
   if(error){presenceAvailable=false;return;}
   for(const entry of data||[])next.set(String(entry.vatra_id),entry);
  }
  presence=next;presenceAvailable=true;
 }catch(_){presenceAvailable=false;}finally{presenceBusy=false;}
}
function online(id){return !accountStates.has(id)&&Boolean(window.VATRA_PRESENCE?.format(presence.get(id)).online);}
function actionButton(label,cls,callback){
 const button=make("button",cls,label);button.type="button";
 button.addEventListener("click",async()=>{
  if(busy)return;busy=true;button.disabled=true;
  let persisted=false;
  try{
   await callback();persisted=true;
   await data();await refreshPresence();render();
  }catch(_){
   const empty=q("#friends-empty");

   empty.textContent=persisted?
    t("Дію виконано, але список не оновився. Оновіть сторінку.",
     "Action completed, but the list could not refresh. Reload the page."):
    t("Не вдалося виконати дію.","Could not complete the action.");
   empty.hidden=false;
  }finally{busy=false;button.disabled=false;}
 });
 return button;
}
async function removeRow(item){
 if(!me)return;
 const {data,error}=await client.from("friendships").delete()
  .eq("id",item.id).or("requester_id.eq."+ownId+",recipient_id.eq."+ownId)
  .select("id").maybeSingle();

 if(error||String(data?.id)!==String(item.id))
  throw error||Error("Friendship was not removed");
}
async function accept(item){
 if(!me||String(item.recipient_id)!==ownId)return;
 const {data,error}=await client.from("friendships")
  .update({status:"accepted"}).eq("id",item.id).eq("recipient_id",ownId)
  .eq("status","pending").select("id");
 if(error||!data?.length)throw error||Error("Request is no longer available");
}
function person(item,index){
 const id=counterpart(item),state=accountStates.get(id);
 const name=state==="deleted"?t("Акаунт видалено","Account deleted"):
  state==="blocked"?t("Акаунт заблоковано","Account blocked"):
  names.get(id)||t("Учасник VATRA","VATRA member");
 const article=make("article","vatra-friends-person ui-vatra-friends-person-"+index);
 const avatar=make("a","vatra-friends-portrait vt-vatra-friends-portrait-"+index);
 avatar.href=new URL("id"+id,root).href;avatar.setAttribute("aria-label",name);
 window.VATRA_AVATAR?.fallback(avatar,state||"default");
 const photo=state?null:photos.get(id);
 if(photo){
  const image=new Image();
  image.onload=()=>{
   if(!avatar.isConnected)return;
   window.VATRA_AVATAR?.clearFallback(avatar);
   avatar.style.backgroundImage="url("+JSON.stringify(photo)+")";avatar.classList.add("has-photo");
  };image.src=photo;
 }
 if(online(id)){const dot=make("span","ui-vatra-friends-online-dot-"+index);dot.setAttribute("aria-label",t("Онлайн","Online"));avatar.append(dot);}
 const details=make("div","vatra-friends-details ui-vatra-friends-details-"+index);
 const profile=make("a","vt-vatra-friends-name-"+index,name);
 profile.href=new URL("id"+id,root).href;
 if(!state)void window.VATRA_VERIFIED?.attach(client,profile,id);
 const secondary=make("span","vt-vatra-friends-subtitle-"+index,
  stateFor(item)==="accepted"?(online(id)?t("Онлайн","Online"):(window.VATRA_PRESENCE?.format(presence.get(id),language()==="en").text||t("Друг у VATRA","VATRA friend"))):
  stateFor(item)==="incoming"?t("Хоче додатися до друзів","Wants to add you"):
  t("Запит надіслано","Request sent"));
 details.append(profile,secondary);
 const actions=make("div","vatra-friends-person-actions ui-vatra-friends-person-actions-"+index);
 if(!state&&stateFor(item)==="accepted"){
  const message=make("a","vt-vatra-friends-message-"+index,t("Написати","Message"));
  message.href=new URL("id"+id+"?message=1",root).href;actions.append(message);
 }
 if(me&&stateFor(item)==="incoming"){
  actions.append(actionButton(t("Прийняти","Accept"),
   "vt-vatra-friends-accept-"+index,()=>accept(item)));
 }
 if(me){
  const label=stateFor(item)==="accepted"?t("Видалити з друзів","Remove friend"):
   stateFor(item)==="incoming"?t("Відхилити","Decline"):t("Скасувати запит","Cancel request");
  actions.append(actionButton(label,"vt-vatra-friends-remove-"+index,()=>removeRow(item)));
 }
 article.append(avatar,details,actions);
 return article;
}
function switchTo(mode){
 if(!["accepted","online","incoming","outgoing"].includes(mode))return;
 if(!me&&mode!=="accepted")return;
 current=mode;
 for(const tab of document.querySelectorAll("[data-friends-tab]")){
  const active=tab.dataset.friendsTab===mode;
  tab.classList.toggle("is-active",active);tab.setAttribute("aria-pressed",String(active));
 }
 const searchBox=q("#friends-search");
 if(searchBox){searchBox.placeholder=mode==="incoming"?t("Пошук у вхідних запитах","Search received requests"):mode==="outgoing"?t("Пошук у вихідних запитах","Search sent requests"):t("Пошук серед друзів","Search friends");searchBox.setAttribute("aria-label",searchBox.placeholder);}
 render();
}
function render(){
 const list=q("#friends-list"),empty=q("#friends-empty");
 list.replaceChildren();empty.hidden=true;list.setAttribute("aria-busy","true");
 const visible=rows.filter(item=>current==="online"?stateFor(item)==="accepted"&&online(counterpart(item)):stateFor(item)===current).filter(item=>{
  const id=counterpart(item),name=names.get(id)||"";
  return !search||id.includes(search)||name.toLocaleLowerCase().includes(search);
 });
 for(const item of visible)list.append(person(item,list.children.length+1));
 if(!visible.length){
  empty.textContent=search?t("За запитом нічого не знайдено.","No matches for your search."):
   current==="online"?(!presenceAvailable?t("Статус онлайн тимчасово недоступний.","Online status is temporarily unavailable."):t("Наразі немає друзів онлайн.","No friends online right now.")):
   current==="accepted"?t("Друзів поки немає.","No friends yet."):
   current==="incoming"?t("Немає нових запитів у друзі.","No new friend requests."):
   t("Немає надісланих запитів.","No sent requests.");
  empty.hidden=false;
 }
 const heading=q("#friends-heading");if(heading)
  heading.textContent=t("Друзі","Friends");
 for(const tab of document.querySelectorAll("[data-friends-tab]")){
  const mode=tab.dataset.friendsTab;
  const count=rows.filter(item=>mode==="online"?stateFor(item)==="accepted"&&online(counterpart(item)):stateFor(item)===mode).length;
  tab.replaceChildren(make("span","vt-vatra-friends-tab-label-"+mode,t(tab.dataset.socialUk,tab.dataset.socialEn)),make("span","vt-vatra-friends-tab-count-"+mode,mode==="online"&&!presenceAvailable?"—":count));
 }
 list.setAttribute("aria-busy","false");
}
async function boot(){
 if(document.body?.dataset.page!=="friends")return;
 await window.VATRA_LANGUAGE?.ready;
 if(!window.supabase?.createClient)return;
 client=window.supabase.createClient("https://rjasunoawrxvetwadylh.supabase.co",
  "sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}});
 try{
  const {data:auth,error:authError}=await client.auth.getUser();
  if(authError||!auth?.user?.id||!auth.user.email_confirmed_at){location.replace(root.href);return;}
  const user=auth.user;
  const account=await client.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();
  if(account.error||!validId(account.data?.vatra_id))throw Error("Missing member ID");
  ownId=String(account.data.vatra_id);
  const target=new URLSearchParams(location.search).get("member");
  targetId=validId(target)?target:ownId;
  me=targetId===ownId;
  const name=String(user.user_metadata?.first_name||user.user_metadata?.full_name||"VATRA").trim();
  window.VATRA_AVATAR?.setHeader({client,email:user.email,name:name.split(/\s+/)[0].slice(0,28),
   initials:name.slice(0,1).toLocaleUpperCase(),id:ownId});
  window.VATRA_AVATAR?.applyRemembered(q("#feed-header-avatar"),user.email);
  for(const el of document.querySelectorAll("[data-social-uk]"))
   el.textContent=t(el.dataset.socialUk,el.dataset.socialEn);
  for(const a of document.querySelectorAll('a[href="profile"]'))
   a.href=new URL("id"+ownId,root).href;
  q("#feed-logout")?.addEventListener("click",async()=>{
   await client.auth.signOut({scope:"local"});
   window.VATRA_AVATAR?.clearHeader();location.replace(root.href);
  });
  q("#feed-search-form")?.addEventListener("submit",event=>{
   event.preventDefault();const term=q("#feed-search-input")?.value.trim()||"";
   location.assign(new URL("feed"+(term?"?q="+encodeURIComponent(term):""),root).href);
  });
  if(!me){


   for(const el of document.querySelectorAll("[data-friends-tab]"))
    el.hidden=true;
   q("#friends-search").disabled=true;
   q("#friends-find").disabled=true;
   q(".vatra-friends-sidebar").classList.add("is-private");
  }
  document.title=t("Друзі · VATRA","Friends · VATRA");
  q("#feed-app").hidden=false;q("#feed-loading").hidden=true;
  document.body.dataset.authReady="true";document.body.classList.remove("vatra-shell-pending");
  window.VATRA_NOTIFICATIONS?.start(client,ownId);
  void window.VATRA_PRESENCE?.start(client,ownId,user.user_metadata?.gender);
  for(const btn of document.querySelectorAll("[data-friends-tab]"))
   btn.addEventListener("click",()=>switchTo(btn.dataset.friendsTab));

  q("#friends-search")?.addEventListener("input",event=>{
   search=String(event.target.value||"").trim().slice(0,100).toLocaleLowerCase();render();
  });
  const findPeople=event=>{
   const input=q("#feed-search-input");
   if(input){event.preventDefault();input.focus();input.select();}
  };
  q("#friends-find")?.addEventListener("click",findPeople);
  if(!me){
   const empty=q("#friends-empty");
   empty.textContent=t("Списки друзів інших користувачів приватні.",
    "Other members' friend lists are private.");
   empty.hidden=false;
   q("#friends-list").setAttribute("aria-busy","false");
   return;
  }
  try{await data();await refreshPresence();render();
   const clock=setInterval(async()=>{if(!document.hidden){try{await refreshPresence();render();}catch(_){}}},60000);
   window.addEventListener("pagehide",()=>clearInterval(clock),{once:true});
  }
  catch(_){
   const empty=q("#friends-empty");
   empty.textContent=t("Не вдалося завантажити друзів.","Could not load friends.");
   empty.hidden=false;q("#friends-list").setAttribute("aria-busy","false");
  }
 }catch(_){
  q("#feed-loading").textContent=t("Не вдалося відкрити друзів. Оновіть сторінку.","Could not open friends. Refresh.");
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else void boot();
})();
