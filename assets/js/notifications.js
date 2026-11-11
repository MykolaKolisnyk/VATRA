/* VATRA private notifications: one bell on every authenticated page, plus a full inbox.
   Events are emitted by database triggers. Clients have no INSERT permission. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript?.src||"assets/js/notifications.js");
const pick=s=>document.querySelector(s);
const en=()=>document.documentElement.lang==="en";
const t=(uk,english)=>en()?english:uk;
const validId=id=>/^[1-9][0-9]{0,18}$/.test(String(id??""));
const make=(tag,cls,text)=>{
 const el=document.createElement(tag);
 el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
};
const icon=(key,path)=>{
 const ns="http://www.w3.org/2000/svg";
 const svg=document.createElementNS(ns,"svg");
 svg.setAttribute("class","ui-notification-icon-"+key);
 svg.setAttribute("viewBox","0 0 24 24");
 svg.setAttribute("width","19");svg.setAttribute("height","19");
 svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");
 svg.setAttribute("stroke-width","1.8");svg.setAttribute("stroke-linecap","round");
 svg.setAttribute("stroke-linejoin","round");svg.setAttribute("aria-hidden","true");
 const line=document.createElementNS(ns,"path");
 line.setAttribute("class","ui-notification-path-"+key);line.setAttribute("d",path);
 svg.append(line);return svg;
};
let client=null,ownId=null,bell=null,badge=null,panel=null,panelItems=null;
let open=false,panelPage=0,sessionStarted=false,liveChannel=null,refreshBusy=false;
let sectionPage=0,sectionFilter="all",sectionSort="new";
const pageURL=()=>new URL("notifications.html",root).href;
const timeValue=date=>{
 const parsed=new Date(date);if(!Number.isFinite(parsed.getTime()))return "";
 return new Intl.DateTimeFormat(en()?"en-GB":"uk-UA",
  {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(parsed);
};
const hrefFor=record=>{
 const path=record.kind==="friend_request"||record.kind==="friend_accepted"?
  "id"+record.actor_vatra_id:
  record.target_kind==="avatar"||record.target_kind==="avatar_comment"?
   "id"+(record.avatar_owner_vatra_id||ownId):
   record.target_kind==="group"?"communities":
    "feed"+(record.context_id||record.target_id?"?post="+encodeURIComponent(record.context_id||record.target_id):"");
 return new URL(path,root).href;
};
const messageFor=(kind,name)=>{
 const k={
  friend_request:[name+" хоче додатися до вас у друзі",name+" wants to add you as a friend"],
  friend_accepted:[name+": вашу заявку в друзі прийнято",name+" accepted your friend request"],
  post_like:[name+": вподобайка вашої публікації",name+" liked your post"],
  comment_like:[name+": вподобайка вашого коментаря",name+" liked your comment"],
  avatar_like:[name+": вподобайка вашого фото профілю",name+" liked your profile photo"],
  avatar_comment_like:[name+": вподобайка коментаря під фото",name+" liked your photo comment"]
 };
 return t(...(k[kind]||[name+": нова подія",name+": new activity"]));
};
async function authorNames(rows){
 const ids=[...new Set(rows.map(x=>String(x.actor_vatra_id)).filter(validId))];
 const names=new Map(),avatars=new Map();
 if(ids.length)try{
  const [profiles,media]=await Promise.all([
   client.from("vatra_public_profiles").select("vatra_id,display_name").in("vatra_id",ids),
   client.from("vatra_profile_media").select("vatra_id,avatar_path").in("vatra_id",ids)
  ]);
  if(!profiles.error)for(const item of profiles.data||[])
   names.set(String(item.vatra_id),String(item.display_name||"").trim().slice(0,100));
  if(!media.error)for(const item of media.data||[]){
   const id=String(item.vatra_id),path=item.avatar_path;
   if(typeof path!=="string"||!path.startsWith(id+"/avatar/"))continue;
   const url=client.storage.from("vatra-avatars").getPublicUrl(path)?.data?.publicUrl;
   if(!url)continue;
   try{
    const parsed=new URL(url);
    if(parsed.protocol==="https:"&&parsed.hostname==="rjasunoawrxvetwadylh.supabase.co")avatars.set(id,parsed.href);
   }catch(_){}
  }
 }catch(_){}
 return {names,avatars};
}
async function unreadCount(){
 if(!client||!ownId||refreshBusy)return;
 refreshBusy=true;
 try{
  const {count,error}=await client.from("member_notifications")
   .select("id",{count:"exact",head:true}).eq("recipient_vatra_id",ownId).is("read_at",null);
  if(error)throw error;
  const n=Number(count||0);
  badge.hidden=n===0;badge.textContent=n>99?"99+":String(n);
  bell.setAttribute("aria-label",n?t("Сповіщення: "+n+" непрочитаних","Notifications: "+n+" unread"):
   t("Сповіщення","Notifications"));
 }catch(_){badge.hidden=true;}
 finally{refreshBusy=false;}
}
async function fetchRows({page,size,filter="all",sort="new"}){
 let query=client.from("member_notifications").select(
  "id,actor_vatra_id,kind,target_kind,target_id,context_id,avatar_owner_vatra_id,read_at,created_at")
  .eq("recipient_vatra_id",ownId);
 if(filter==="unread")query=query.is("read_at",null);
 if(filter==="read")query=query.not("read_at","is",null);
 const oldest=sort==="old";
 const start=page*size;
 const {data,error}=await query.order("created_at",{ascending:oldest})
  .order("id",{ascending:oldest}).range(start,start+size);
 if(error)throw error;
 const entries=data||[];
 return {rows:entries.slice(0,size),hasNext:entries.length>size};
}
async function markRead(id){
 try{
  const {error}=await client.from("member_notifications").update({read_at:new Date().toISOString()})
   .eq("recipient_vatra_id",ownId).eq("id",id).is("read_at",null);
  if(error)throw error;void unreadCount();return true;
 }catch(_){return false;}
}
async function remove(id){
 const {error}=await client.from("member_notifications").delete()
  .eq("recipient_vatra_id",ownId).eq("id",id);
 if(error)throw error;
 void unreadCount();
}
function createRow(record,name,index,onChange,photoUrl){
 const article=make("article","vatra-notification-row ui-vatra-notification-row-"+index);
 if(!record.read_at)article.classList.add("is-unread");
 const mark=make("span","vatra-notification-unread ui-vatra-notification-unread-"+index);
 mark.setAttribute("aria-hidden","true");
 const badgeIcon=make("span","vatra-notification-kind ui-vatra-notification-kind-"+index);
 const path=record.kind.startsWith("friend")?
  "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 12.5-6.5M19 14v6m-3-3h6":
  record.kind.includes("comment")?
  "M4 5h16v13H9l-5 3V5ZM8 10h8M8 14h5":
  "M20.8 5.9c-1.4-1.7-4.1-1.7-5.6 0L12 9.1 8.8 5.9c-1.5-1.7-4.2-1.7-5.6 0-1.5 1.8-1.1 4.6.6 6.3L12 20l8.2-7.8c1.7-1.7 2.1-4.5.6-6.3Z";
 badgeIcon.append(icon("event-"+index,path));
 const avatar=make("a","vatra-notification-avatar ui-vatra-notification-avatar-"+index);
 avatar.href=new URL("id"+record.actor_vatra_id,root).href;
 avatar.setAttribute("aria-label",name);
 if(photoUrl){
  const picture=new Image();
  picture.onload=()=>{
   if(!avatar.isConnected)return;
   avatar.style.backgroundImage="url("+JSON.stringify(photoUrl)+")";avatar.classList.add("has-photo");
  };
  picture.src=photoUrl;
 }
 const body=make("div","vatra-notification-content ui-vatra-notification-content-"+index);
 const link=make("a","vatra-notification-link vt-vatra-notification-link-"+index,messageFor(record.kind,name));
 link.href=hrefFor(record);
 link.addEventListener("click",async event=>{
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  if(!record.read_at)await markRead(record.id);
  location.assign(link.href);
 });
 const timestamp=make("time","vatra-notification-time vt-vatra-notification-time-"+index,
  timeValue(record.created_at));
 timestamp.dateTime=record.created_at;
 body.append(link,timestamp);
 const actions=make("div","vatra-notification-actions ui-vatra-notification-actions-"+index);
 if(!record.read_at){
  const seen=make("button","vatra-notification-mark vt-vatra-notification-mark-"+index,
   t("Прочитано","Mark read"));
  seen.type="button";
  seen.addEventListener("click",async()=>{
   seen.disabled=true;await markRead(record.id);await onChange();
  });
  actions.append(seen);
 }
 const deleteButton=make("button","vatra-notification-delete vt-vatra-notification-delete-"+index);
 deleteButton.type="button";
 deleteButton.append(icon("delete-"+index,"M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6m4-6v6"));
 deleteButton.setAttribute("aria-label",t("Видалити сповіщення","Delete notification"));
 deleteButton.title=t("Видалити","Delete");
 deleteButton.addEventListener("click",async()=>{
  deleteButton.disabled=true;
  try{await remove(record.id);await onChange();}
  catch(_){deleteButton.disabled=false;}
 });
 actions.append(deleteButton);
 article.append(mark,avatar,badgeIcon,body,actions);
 return article;
}
async function renderRows(list,status,opts,onChange,prev,next,pageLabel){
 list.replaceChildren();
 status.hidden=true;list.setAttribute("aria-busy","true");
 try{
  const {rows,hasNext}=await fetchRows(opts);
  const {names,avatars}=await authorNames(rows);
  const nodes=rows.map((record,i)=>createRow(record,
   names.get(String(record.actor_vatra_id))||t("Учасник VATRA ID ","VATRA member ID ")+record.actor_vatra_id,
   String(opts.page*opts.size+i+1),onChange,avatars.get(String(record.actor_vatra_id))));
  list.replaceChildren(...nodes);
  if(!rows.length){
   status.textContent=t("Сповіщень поки немає.","No notifications yet.");
   status.hidden=false;
  }
  prev.disabled=opts.page===0;next.disabled=!hasNext;
  pageLabel.textContent=t("Сторінка ","Page ")+(opts.page+1);
 }catch(_){
  status.textContent=t("Не вдалося завантажити сповіщення. Спробуйте ще раз.",
   "Could not load notifications. Please retry.");
  status.hidden=false;prev.disabled=true;next.disabled=true;
 }finally{list.setAttribute("aria-busy","false");}
}
async function panelLoad(){
 if(!panel||!open)return;
 const list=panelItems;
 const opts={page:panelPage,size:5};
 await renderRows(list,pick("#vatra-notification-panel-empty"),opts,panelLoad,
  pick("#vatra-notification-prev"),pick("#vatra-notification-next"),pick("#vatra-notification-page"));
}
function positionPanel(){
 if(!open||!panel||!bell)return;
 const r=bell.getBoundingClientRect();
 const width=Math.min(390,innerWidth-24);
 panel.style.width=width+"px";
 panel.style.left=Math.round(Math.max(12,Math.min(innerWidth-width-12,r.right-width)))+"px";
 const headerBottom=document.querySelector(".feed-header")?.getBoundingClientRect().bottom??r.bottom;
 const top=Math.max(0,Math.round(headerBottom));
 panel.style.top=top+"px";
 panel.style.maxHeight=Math.max(180,innerHeight-top-12)+"px";
}
function closePanel(){
 if(!open)return;open=false;panel.hidden=true;
 bell?.setAttribute("aria-expanded","false");
}
function openPanel(){
 const menu=pick(".feed-account-menu");if(menu?.open)menu.open=false;
 open=true;panelPage=0;window.VATRA_HIDE_SHELL_TOOLTIP?.();
 panel.hidden=false;positionPanel();
 bell.setAttribute("aria-expanded","true");
 void panelLoad();
}
function headerUI(){
 bell=pick(".ui-feed-notifications-button-001");
 if(!bell||bell.dataset.vatraNotificationsReady)return;
 bell.dataset.vatraNotificationsReady="true";
 bell.removeAttribute("data-vatra-coming-soon");
 bell.setAttribute("aria-haspopup","dialog");bell.setAttribute("aria-expanded","false");
 bell.setAttribute("aria-label",t("Сповіщення","Notifications"));
 badge=make("span","vatra-notification-count vt-vatra-notification-count-001");
 badge.hidden=true;badge.setAttribute("aria-hidden","true");bell.append(badge);
 panel=make("section","vatra-notification-panel ui-vatra-notification-panel-001");
 panel.id="vatra-notification-panel";panel.hidden=true;
 panel.setAttribute("role","dialog");
 panel.setAttribute("aria-label",t("Ваші сповіщення","Your notifications"));
 const heading=make("div","vatra-notification-panel-heading ui-vatra-notification-panel-heading-001");
 const title=make("h2","vt-vatra-notification-title-001",t("Сповіщення","Notifications"));
 const close=make("button","vt-vatra-notification-close-001");
 close.type="button";close.append(icon("close","M5 5l14 14M19 5 5 19"));
 close.setAttribute("aria-label",t("Закрити сповіщення","Close notifications"));
 close.addEventListener("click",()=>{closePanel();bell.focus();});
 heading.append(title,close);
 panelItems=make("div","vatra-notification-list ui-vatra-notification-panel-list-001");
 const empty=make("p","vt-vatra-notification-panel-empty-001");
 empty.id="vatra-notification-panel-empty";empty.hidden=true;
 const controls=make("div","vatra-notification-pager ui-vatra-notification-pager-001");
 const prev=make("button","vt-vatra-notification-prev-001",t("Назад","Previous"));
 prev.id="vatra-notification-prev";prev.type="button";
 const page=make("span","vt-vatra-notification-page-001");
 page.id="vatra-notification-page";
 const next=make("button","vt-vatra-notification-next-001",t("Далі","Next"));
 next.id="vatra-notification-next";next.type="button";
 prev.addEventListener("click",()=>{panelPage=Math.max(0,panelPage-1);void panelLoad();});
 next.addEventListener("click",()=>{panelPage++;void panelLoad();});
 controls.append(prev,page,next);
 const footer=make("a","vt-vatra-notification-all-001",t("Відкрити всі сповіщення","View all notifications"));
 footer.href=pageURL();
 panel.append(heading,panelItems,empty,controls,footer);
 document.body.append(panel);
 bell.setAttribute("aria-controls",panel.id);
 bell.addEventListener("click",()=>{if(open)closePanel();else openPanel();});
 document.addEventListener("pointerdown",event=>{
  if(open&&!bell.contains(event.target)&&!panel.contains(event.target))closePanel();
 });
 document.addEventListener("keydown",event=>{
  if(open&&event.key==="Escape"){closePanel();bell.focus();}
 });
 window.addEventListener("resize",positionPanel,{passive:true});
 window.addEventListener("scroll",positionPanel,{passive:true});
 window.visualViewport?.addEventListener("resize",positionPanel,{passive:true});
}
/* Search is shared by every authenticated VATRA screen through this existing
   client. The RLS on profiles, posts, communities and friend posts is authoritative. */
async function findSite(term){
 const phrase=String(term||"").trim().slice(0,120);
 if(!client||phrase.length<2)return {people:[],communities:[],posts:[]};
 const escaped=phrase.replace(/[\\%_]/g,ch=>String.fromCharCode(92)+ch);
 const pattern="%"+escaped+"%";
 const requests=[
  client.from("vatra_public_profiles").select("vatra_id,display_name,status_text").ilike("display_name",pattern).limit(4),
  client.from("vatra_public_profiles").select("vatra_id,display_name,status_text").ilike("status_text",pattern).limit(4),
  client.from("communities").select("club_id,name,description").ilike("name",pattern).limit(4),
  client.from("communities").select("club_id,name,description").ilike("description",pattern).limit(4),
  client.from("feed_posts").select("id,body,created_at").ilike("body",pattern).is("archived_at",null).limit(4),
  client.from("vatra_community_posts").select("id,body,club_id,created_at").ilike("body",pattern).limit(3)
 ];
 const all=await Promise.allSettled(requests);
 const rows=i=>all[i].status==="fulfilled"&&!all[i].value.error?(all[i].value.data||[]):[];
 const people=[...new Map([...rows(0),...rows(1)].map(x=>[String(x.vatra_id),x])).values()].slice(0,4);
 const communities=[...new Map([...rows(2),...rows(3)].map(x=>[String(x.club_id),x])).values()].slice(0,4);
 const posts=[...rows(4).map(x=>({...x,kind:"person"})),...rows(5).map(x=>({...x,kind:"group"}))].slice(0,5);
 return {people,communities,posts};
}
window.VATRA_SITE_SEARCH={search:findSite};

function start(c,id){
 if(!c||!validId(id))return;
 if(sessionStarted&&ownId===String(id))return;
 client=c;ownId=String(id);
 headerUI();
 if(!bell)return;
 sessionStarted=true;
 void unreadCount();
 const refresh=()=>{if(document.hidden)return;void unreadCount();if(open)void panelLoad();};
 window.addEventListener("focus",refresh,{passive:true});
 document.addEventListener("visibilitychange",refresh,{passive:true});
 setInterval(refresh,30000);
 // Instant update when Realtime publication is available; polling is a fallback.
 try{
  if(typeof client.channel==="function")
   liveChannel=client.channel("vatra-notices-"+ownId)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"member_notifications",
     filter:"recipient_vatra_id=eq."+ownId},refresh).subscribe();
 }catch(_){}
}
async function pageLoad(){
 const list=pick("#notifications-list"),empty=pick("#notifications-empty");
 const prev=pick("#notifications-prev"),next=pick("#notifications-next");
 const label=pick("#notifications-page");
 if(!list)return;
 await renderRows(list,empty,{page:sectionPage,size:20,filter:sectionFilter,sort:sectionSort},pageLoad,prev,next,label);
}
function pageUI(){
 for(const btn of document.querySelectorAll("[data-notification-filter]")){
  btn.addEventListener("click",()=>{
   sectionFilter=btn.dataset.notificationFilter;sectionPage=0;
   for(const other of document.querySelectorAll("[data-notification-filter]"))
    other.setAttribute("aria-pressed",String(other===btn));
   void pageLoad();
  });
 }
 pick("#notifications-sort")?.addEventListener("change",event=>{
  sectionSort=event.target.value==="old"?"old":"new";sectionPage=0;void pageLoad();
 });
 pick("#notifications-prev")?.addEventListener("click",()=>{sectionPage=Math.max(0,sectionPage-1);void pageLoad();});
 pick("#notifications-next")?.addEventListener("click",()=>{sectionPage++;void pageLoad();});
 pick("#notifications-mark-all")?.addEventListener("click",async event=>{
  event.currentTarget.disabled=true;
  try{
   const {error}=await client.from("member_notifications")
    .update({read_at:new Date().toISOString()}).eq("recipient_vatra_id",ownId).is("read_at",null);
   if(error)throw error;await pageLoad();void unreadCount();
  }catch(_){}
  finally{event.currentTarget.disabled=false;}
 });
 void pageLoad();
}
async function pageBoot(){
 if(document.body?.dataset.page!=="notifications")return;
 await window.VATRA_LANGUAGE?.ready;
 if(!window.supabase?.createClient)return;
 const clientRef=window.supabase.createClient("https://rjasunoawrxvetwadylh.supabase.co",
  "sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}});
 try{
  const {data,error}=await clientRef.auth.getUser();
  if(error||!data?.user?.id||!data.user.email_confirmed_at){
   location.replace(root.href);return;
  }
  const user=data.user;
  const {data:account,error:accountError}=await clientRef.from("accounts")
   .select("vatra_id").eq("user_id",user.id).maybeSingle();
  if(accountError||!validId(account?.vatra_id))throw Error("Missing member ID");
  const id=String(account.vatra_id);
  for(const el of document.querySelectorAll("[data-social-uk]"))
   el.textContent=t(el.dataset.socialUk,el.dataset.socialEn);
  const displayName=String(user.user_metadata?.first_name||user.user_metadata?.full_name||"VATRA").trim();
  const avatar=pick("#feed-header-avatar");
  if(avatar){avatar.textContent=displayName.slice(0,1).toLocaleUpperCase();window.VATRA_AVATAR?.applyRemembered(avatar,user.email);}
  const name=pick("#feed-menu-name");if(name)name.textContent=displayName.split(/\s+/)[0].slice(0,28);
  const headerId=pick("#feed-header-id");if(headerId)headerId.textContent="VATRA ID "+id;
  for(const link of document.querySelectorAll('a[href="profile"]'))link.href=new URL("id"+id,root).href;
  pick("#feed-logout")?.addEventListener("click",async()=>{
   await clientRef.auth.signOut({scope:"local"});location.replace(root.href);
  });
  const form=pick("#feed-search-form");
  form?.addEventListener("submit",event=>{
   event.preventDefault();
   const query=pick("#feed-search-input")?.value.trim()||"";
   location.href=new URL("feed"+(query?"?q="+encodeURIComponent(query):""),root).href;
  });
  document.title=t("Сповіщення · VATRA","Notifications · VATRA");
  pick("#feed-app").hidden=false;pick("#feed-loading").hidden=true;
  document.body.dataset.authReady="true";document.body.classList.remove("vatra-shell-pending");
  start(clientRef,id);pageUI();
 }catch(_){
  const loader=pick("#feed-loading");if(loader){loader.textContent=t("Не вдалося завантажити сповіщення. Оновіть сторінку.","Could not load notifications. Refresh.");}
 }
}
window.VATRA_NOTIFICATIONS={start,pageBoot};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",pageBoot,{once:true});
else void pageBoot();
})();
