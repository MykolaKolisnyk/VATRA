(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript?.src||"assets/js/notifications.js");
const pick=s=>document.querySelector(s);
const language=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
const dateLocales={uk:"uk-UA",en:"en-GB",pl:"pl-PL",de:"de-DE",fr:"fr-FR",it:"it-IT",ka:"ka-GE",bg:"bg-BG"};
const t=(uk,english)=>{
 const current=language();
 if(current==="uk")return uk;
 const translated=window.VATRA_LANGUAGE?.translate?.(uk);
 return typeof translated==="string"&&translated!==uk?translated:
  current==="en"?english:uk;
};

const format=(uk,english,values)=>t(uk,english).replace(/\{(name|count|page|id)\}/g,
 (_,key)=>String(values[key]??""));
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
let open=false,liveChannel=null,refreshBusy=false,refreshQueued=false;
let notificationRun=null,panelLoadPending=null,panelLoadQueued=false;
let sectionPage=0,sectionFilter="all",sectionSort="new",sectionLoading=false,sectionQueued=false,sectionScope=null;
const pageURL=()=>new URL("notifications",root).href;
const plural=(n,a,b,c)=>{const x=n%100,d=n%10;return n+" "+(d===1&&x!==11?a:d>=2&&d<=4&&(x<12||x>14)?b:c)};
const relativeFormatters=new Map();
const timeValue=date=>{
 const d=new Date(date),ms=Math.max(0,Date.now()-d.getTime());if(!Number.isFinite(d.getTime()))return "";
 if(ms<60000)return t("щойно","just now");
 const n=Math.floor(ms/60000),h=Math.floor(ms/3600000),days=Math.floor(ms/86400000);
 const code=language();
 if(code!=="uk"&&code!=="en"&&Object.hasOwn(dateLocales,code)){
  let relative=relativeFormatters.get(code);
  if(!relative){relative=new Intl.RelativeTimeFormat(dateLocales[code],{numeric:"always"});relativeFormatters.set(code,relative);}
  const [amount,unit]=ms<3600000?[n,"minute"]:ms<86400000?[h,"hour"]:days<30?[days,"day"]:days<365?[Math.floor(days/30),"month"]:[Math.floor(days/365),"year"];
  return relative.format(-amount,unit);
 }
 if(ms<3600000)return language()==="en"?n+" minute"+(n===1?"":"s")+" ago":plural(n,"хвилину","хвилини","хвилин")+" тому";
 if(ms<86400000)return language()==="en"?h+" hour"+(h===1?"":"s")+" ago":plural(h,"годину","години","годин")+" тому";
 if(days<30)return language()==="en"?days+" days ago":plural(days,"день","дні","днів")+" тому";
 const m=Math.floor(days/30);if(days<365)return language()==="en"?m+" months ago":plural(m,"місяць","місяці","місяців")+" тому";
 const y=Math.floor(days/365);return language()==="en"?y+" years ago":plural(y,"рік","роки","років")+" тому";
};
const interactionKinds=new Set(["post_comment","post_reply","avatar_comment","album_comment","album_photo_like","post_share","post_mention","comment_mention"]);
const exactNoticeUUID=id=>/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(String(id||""));
const memberRoute=(owner,params)=>{
 if(!validId(owner))return null;
 const u=new URL("id"+owner,root);for(const [key,value] of Object.entries(params))if(value)u.searchParams.set(key,value);return u.href;
};
const hrefFor=r=>{
 if(["post_comment","post_reply","album_comment","album_photo_like","post_share","post_mention","comment_mention"].includes(r.kind)){
  const bits=String(r.event_key||"").split(":");
  if(bits[0]!==r.kind||!validId(bits[1])||!exactNoticeUUID(r.target_id))return null;
  if(r.kind==="post_share"||r.kind==="post_mention")return memberRoute(r.actor_vatra_id,{post:r.target_id});
  if(["post_comment","post_reply","comment_mention"].includes(r.kind))return exactNoticeUUID(r.context_id)?memberRoute(bits[1],{post:r.context_id,comment:r.target_id}):null;
  return exactNoticeUUID(bits[2])&&exactNoticeUUID(r.context_id)?memberRoute(bits[1],{album:bits[2],photo:r.context_id,comment:r.kind==="album_comment"?r.target_id:null}):null;
 }
 if(r.kind==="post_like"&&r.target_kind==="person")return exactNoticeUUID(r.target_id)?memberRoute(ownId,{post:r.target_id}):null;
 if(r.kind==="comment_like"&&r.target_kind==="post_comment")return null;
 if(r.kind==="avatar_comment"||r.kind==="avatar_comment_like")return null;
 if(r.kind==="avatar_like"){
  const owner=r.avatar_owner_vatra_id||ownId,bits=String(r.event_key||"").split(":"),path=bits.length>=4?bits.slice(2,-1).join(":"):"";
  if(validId(owner)&&path.startsWith(owner+"/avatar/")&&/^[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(path.split("/").pop()))return memberRoute(owner,{photo:"avatar",image:path.split("/").pop()});
  return null;
 }
 if(["member_post","member_story"].includes(r.kind)){
  const u=new URL("id"+r.actor_vatra_id,root);u.searchParams.set(r.kind==="member_story"?"story":"post",r.target_id);return u.href;
 }
 if(["friend_request","friend_accepted","friend_declined"].includes(r.kind))
  return new URL("id"+r.actor_vatra_id,root).href;
 if(["avatar","avatar_comment"].includes(r.target_kind)){
  const u=new URL("id"+(r.avatar_owner_vatra_id||ownId),root);u.searchParams.set("photo","avatar");
  if(r.target_kind==="avatar_comment"&&r.target_id)u.searchParams.set("comment",r.target_id);
  return u.href;
 }
 const u=new URL("feed",root);
 if(r.context_id||r.target_id)u.searchParams.set("post",r.context_id||r.target_id);
 if(r.target_kind==="post_comment"&&r.target_id)u.searchParams.set("comment",r.target_id);
 return u.href;
};
const notificationTemplates={
 friend_request:["{name} хоче додатися до вас у друзі","{name} wants to add you as a friend"],
 friend_accepted:["{name} прийняв вашу заявку в друзі","{name} accepted your friend request"],
 friend_declined:["{name} відхилив вашу заявку в друзі","{name} declined your friend request"],
 post_like:["{name} вподобав вашу публікацію","{name} liked your post"],
 comment_like:["{name} вподобав ваш коментар","{name} liked your comment"],
 avatar_like:["{name} вподобав ваше фото профілю","{name} liked your profile photo"],
 avatar_comment_like:["{name} вподобав ваш коментар під фото","{name} liked your photo comment"],
 member_post:["{name} поділився публікацією","{name} shared a post"],
 member_story:["{name} поділився історією","{name} shared a story"],
 post_comment:["{name} прокоментував вашу публікацію","{name} commented on your post"],
 post_reply:["{name} відповів на ваш коментар","{name} replied to your comment"],
 avatar_comment:["{name} прокоментував ваше фото профілю","{name} commented on your profile photo"],
 album_comment:["{name} прокоментував вашу фотографію","{name} commented on your photo"],
 album_photo_like:["{name} вподобав вашу фотографію","{name} liked your photo"],
 post_share:["{name} поширив вашу публікацію","{name} shared your post"],
 post_mention:["{name} згадав вас у публікації","{name} mentioned you in a post"],
 comment_mention:["{name} згадав вас у коментарі","{name} mentioned you in a comment"]
};
const feminineEvents={
 friend_accepted:"{name} прийняла вашу заявку в друзі",
 friend_declined:"{name} відхилила вашу заявку в друзі",
 post_like:"{name} вподобала вашу публікацію",
 comment_like:"{name} вподобала ваш коментар",
 avatar_like:"{name} вподобала ваше фото профілю",
 avatar_comment_like:"{name} вподобала ваш коментар під фото",
 member_post:"{name} поділилася публікацією",
 member_story:"{name} поділилася історією",
 post_comment:"{name} прокоментувала вашу публікацію",
 post_reply:"{name} відповіла на ваш коментар",
 avatar_comment:"{name} прокоментувала ваше фото профілю",
 album_comment:"{name} прокоментувала вашу фотографію",
 album_photo_like:"{name} вподобала вашу фотографію",
 post_share:"{name} поширила вашу публікацію",
 post_mention:"{name} згадала вас у публікації",
 comment_mention:"{name} згадала вас у коментарі"
};
const neutralEvents={
 friend_accepted:"Вашу заявку в друзі прийнято: {name}",
 friend_declined:"Вашу заявку в друзі відхилено: {name}",
 post_like:"Вашу публікацію вподобано: {name}",
 comment_like:"Ваш коментар вподобано: {name}",
 avatar_like:"Ваше фото профілю вподобано: {name}",
 avatar_comment_like:"Ваш коментар під фото вподобано: {name}",
 member_post:"Нова публікація: {name}",
 member_story:"Нова історія: {name}",
 post_comment:"Новий коментар до вашої публікації від {name}",
 post_reply:"Нова відповідь на ваш коментар від {name}",
 avatar_comment:"Новий коментар до вашого фото профілю від {name}",
 album_comment:"Новий коментар до вашої фотографії від {name}",
 album_photo_like:"Вашу фотографію вподобано: {name}",
 post_share:"Вашу публікацію поширено: {name}",
 post_mention:"Вас згадано у публікації: {name}",
 comment_mention:"Вас згадано у коментарі: {name}"
};
const messageFor=(kind,name,form)=>{
 const first=String(name||"").trim().split(/\s+/u)[0]||name;
 const [uk,en]=notificationTemplates[kind]||["{name}: нова подія","{name}: new activity"];
 const text=form==="feminine"?feminineEvents[kind]||uk:
  form==="masculine"?uk:neutralEvents[kind]||uk;
 return language()==="uk"?format(text,en,{name:first}):format(uk,en,{name:first});
};
async function authorNames(rows){
 const ids=[...new Set(rows.map(x=>String(x.actor_vatra_id)).filter(validId))];
 const names=new Map(),avatars=new Map(),states=new Map(),forms=new Map();
 if(ids.length)try{
  const results=await Promise.allSettled([
   (window.VATRA_PUBLIC_NAMES?.get(client,ids)||
    client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",ids)),
   (window.VATRA_AVATAR?.paths?.(client,ids)||
    client.from("profile_media").select("vatra_id,avatar_path").in("vatra_id",ids)),
   window.VATRA_AVATAR?.states(client,ids)||Promise.resolve(new Map()),
   Promise.resolve().then(()=>client.from("profile_presence").select("vatra_id,form").in("vatra_id",ids))
  ]);
  if(results[2].status==="fulfilled")for(const [id,state] of results[2].value)states.set(id,state);
  if(results[3].status==="fulfilled"&&!results[3].value.error)
   for(const row of results[3].value.data||[])forms.set(String(row.vatra_id),row.form);
  const profiles=results[0].status==="fulfilled"?results[0].value:{error:true};
  const media=results[1].status==="fulfilled"?results[1].value:{error:true};
  if(!profiles.error)for(const item of profiles.data||[])
   names.set(String(item.vatra_id),String(item.display_name||"").trim().slice(0,100));
  if(!media.error)for(const item of media.data||[]){
   const id=String(item.vatra_id),path=item.avatar_path;
   if(states.has(id)||typeof path!=="string"||!path.startsWith(id+"/avatar/"))continue;
   const url=client.storage.from("avatars").getPublicUrl(path)?.data?.publicUrl;
   if(!url)continue;
   try{
    const parsed=new URL(url);
    if(parsed.protocol==="https:"&&parsed.hostname==="cxrcycxrlkufozomsxcs.supabase.co")avatars.set(id,parsed.href);
   }catch(_){}
  }
 }catch(_){}
 return {names,avatars,states,forms};
}
function hiddenNotificationKinds(id){
 try{const value=JSON.parse(localStorage.getItem("vatra:notification-display:"+id)||"[]");return Array.isArray(value)?value.filter(x=>typeof x==="string"&&Object.hasOwn(notificationTemplates,x)):[];}catch(_){return [];}
}
function applyDisplayFilter(query,id){
 const hidden=hiddenNotificationKinds(id);return hidden.length?query.not("kind","in","("+hidden.join(",")+")"):query;
}
async function unreadCount(){
 const run=notificationRun;
 if(!run||!badge||!bell)return;


 if(refreshBusy){refreshQueued=true;return;}
 refreshBusy=true;
 try{
  const {count,error}=await applyDisplayFilter(run.client.from("member_notifications")
   .select("id",{count:"exact",head:true}).eq("recipient_vatra_id",run.id).is("read_at",null),run.id);
  if(error)throw error;
  if(run!==notificationRun)return; 
  const n=Number(count||0);
  badge.hidden=n===0;badge.textContent=n>99?"99+":String(n);
  bell.setAttribute("aria-label",n?format("Сповіщення: {count} непрочитаних","Notifications: {count} unread",{count:n}):
   t("Сповіщення","Notifications"));
 }catch(_){if(run===notificationRun)badge.hidden=true;}
 finally{
  if(run===notificationRun){
   refreshBusy=false;
   if(refreshQueued){refreshQueued=false;void unreadCount();}
  }
 }
}
async function fetchRows({page,size,filter="all",sort="new"}){
 const run=notificationRun;
 if(!run)return {rows:[],hasNext:false};
 let query=run.client.from("member_notifications").select(
  "id,actor_vatra_id,kind,target_kind,target_id,context_id,avatar_owner_vatra_id,event_key,read_at,created_at")
  .eq("recipient_vatra_id",run.id);
 query=applyDisplayFilter(query,run.id);
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
 const run=notificationRun;
 if(!run)return false;
 try{
  const {error}=await run.client.from("member_notifications").update({read_at:new Date().toISOString()})
   .eq("recipient_vatra_id",run.id).eq("id",id).is("read_at",null);
  if(error)throw error;
  if(run!==notificationRun)return false;
  void unreadCount();return true;
 }catch(_){return false;}
}
async function remove(id){
 const run=notificationRun;
 if(!run)throw Error("Notification session unavailable");
 const {error}=await run.client.from("member_notifications").delete()
  .eq("recipient_vatra_id",run.id).eq("id",id);
 if(error)throw error;
 if(run===notificationRun)void unreadCount();
}
function renderEmpty(node){
 node.replaceChildren();
 const art=make("span","vatra-notice-empty-illustration-001");
 art.append(icon("bell-off","M10 20a2 2 0 0 0 4 0M18 13V9a6 6 0 0 0-9.8-4.6M6 9c0 5-1 6-3 8h14M3 3l18 18M18 13c0 1 .2 2 .6 2.7"));
 node.append(art,make("strong","vatra-notice-empty-title-001",t("Поки немає сповіщень","No notifications yet")),make("span","vatra-notice-empty-description-001",t("Нові сповіщення з'являться тут.","New notifications will appear here.")));
 node.hidden=false;
}
const noticeUUID=x=>/^[0-9a-f-]{36}$/i.test(String(x||""));
async function noticePreviewURL(run,path){
 if(run!==notificationRun)throw Error("Notification viewer changed");
 const shared=window.VATRA_POST_MEDIA?.signed;
 if(typeof shared==="function")return shared(run.client,"image",path,300);
 const cache=run.previewURLs||(run.previewURLs=new Map());
 const previous=cache.get(path);
 if(previous&&(previous.pending||previous.expires>Date.now())){
  cache.delete(path);cache.set(path,previous);return previous.promise;
 }
 if(previous)cache.delete(path);
 const entry={pending:true,expires:0,promise:null};
 entry.promise=Promise.resolve().then(async()=>{
  if(run!==notificationRun)throw Error("Notification viewer changed");
  const result=await run.client.storage.from("post-images").createSignedUrl(path,300);
  if(run!==notificationRun||result.error||!result.data?.signedUrl)throw Error("Notification preview unavailable");
  const url=new URL(result.data.signedUrl);
  if(url.protocol!=="https:"||url.hostname!=="cxrcycxrlkufozomsxcs.supabase.co")throw Error("Unexpected notification preview URL");
  entry.expires=Date.now()+270000;
  return url.href;
 }).finally(()=>{
  entry.pending=false;
  if(!entry.expires&&cache.get(path)===entry)cache.delete(path);
  for(const [key,value] of cache){
   if(cache.size<=64)break;
   if(!value.pending)cache.delete(key);
  }
 });
 cache.set(path,entry);
 return entry.promise;
}
async function enrichInteraction(record,body,link){
 const run=notificationRun,kind=record.kind;
 if(!run||!exactNoticeUUID(record.target_id))return;
 const read=async(table,fields,id)=>{
  const r=await run.client.from(table).select(fields).eq("id",id).maybeSingle();
  if(run!==notificationRun||r.error||!r.data)throw Error("Notification content unavailable");
  return r.data;
 };
 try{
  let content=null,photoPath="",bucket="",owner=null,post=null;
  if(["post_comment","post_reply","comment_like","comment_mention"].includes(kind)){
   content=await read("post_comments","id,body,post_id,post_kind,media_kind,media_path",record.target_id);
   if(content.post_kind==="group"&&kind==="comment_like"){
    const url=new URL("feed",root);url.searchParams.set("post",content.post_id);url.searchParams.set("comment",content.id);link.href=url.href;
    if(run===notificationRun&&body.isConnected){const card=make("div","vatra-notice-preview-001");card.textContent=t("Коментар: ","Comment: ")+String(content.body||"").slice(0,175);body.insertBefore(card,body.querySelector(".vatra-notification-time"));}return;
   }
   if(content.post_kind!=="person"||!exactNoticeUUID(content.post_id))return;
   post=await read("feed_posts","id,author_vatra_id,body,media_kind,media_path,media_items,is_clip",content.post_id);
   owner=post.author_vatra_id;
   const url=memberRoute(owner,{post:post.id,comment:content.id});if(url)link.href=url;
   const media=Array.isArray(post.media_items)?post.media_items.find(x=>x?.media_kind==="image"):null;
   photoPath=String(media?.media_path||(post.media_kind==="image"?post.media_path:"")||"");bucket="post-images";
   if(kind==="post_comment"&&photoPath)link.textContent+=t(" з фото"," with a photo");
   if(["post_reply","comment_like","comment_mention"].includes(kind)){
    const mine=String(owner)===String(run.id);
    let name="";
    if(!mine&&validId(owner)){const result=await window.VATRA_PUBLIC_NAMES?.get(run.client,[owner]);name=String(result?.data?.[0]?.display_name||"").trim().split(/\s+/u)[0];}
    const withPhoto=!!photoPath;
    const suffix=mine?(withPhoto?t(" під вашою публікацією з фото"," under your photo post"):t(" під вашою публікацією"," under your post")):
     (name?(withPhoto?t(" під публікацією з фото користувача "," under a photo post by "):t(" під публікацією користувача "," under a post by "))+name:t(" під публікацією"," under a post"));
    if(run===notificationRun)link.textContent+=suffix;
   }
  }else if(["avatar_comment","avatar_comment_like"].includes(kind)){
   content=await read("avatar_comments","id,body,owner_vatra_id,avatar_path",record.target_id);owner=content.owner_vatra_id;
   photoPath=String(content.avatar_path||"");bucket="avatars";
   if(!validId(owner)||!photoPath.startsWith(owner+"/avatar/")||!/^[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(photoPath.split("/").pop()))return;
   const url=memberRoute(owner,{photo:"avatar",image:photoPath.split("/").pop(),comment:content.id});if(url)link.href=url;
   if(kind==="avatar_comment_like"&&String(owner)!==String(run.id)){
    const result=await window.VATRA_PUBLIC_NAMES?.get(run.client,[owner]);
    const name=String(result?.data?.[0]?.display_name||"").trim().split(/\s+/u)[0];
    if(name&&run===notificationRun)link.textContent+=t(" користувача "," of ")+name;
   }
  }else if(["album_comment","album_photo_like"].includes(kind)){
   if(kind==="album_comment")content=await read("photo_album_comments","id,body,album_id,photo_id",record.target_id);
   const photo=await read("album_photos","id,album_id,owner_vatra_id,media_path,caption,archived_at",content?.photo_id||record.target_id);
   if(photo.archived_at||!validId(photo.owner_vatra_id)||!exactNoticeUUID(photo.album_id))return;
   if(content&&content.album_id!==photo.album_id)return;
   owner=photo.owner_vatra_id;photoPath=String(photo.media_path||"");bucket="album-photos";
   const url=memberRoute(owner,{album:photo.album_id,photo:photo.id,comment:content?.id});if(url)link.href=url;
   if(!content)content={body:photo.caption||""};
  }else if(kind==="post_mention"){
   content=await read("feed_posts","id,body,media_kind,media_path,media_items,author_vatra_id",record.target_id);
   const media=Array.isArray(content.media_items)?content.media_items.find(x=>x?.media_kind==="image"):null;
   photoPath=String(media?.media_path||(content.media_kind==="image"?content.media_path:"")||"");bucket="post-images";
  }else if(kind==="member_story"){
   content=await read("stories","id,body,author_vatra_id,media_kind,media_path,expires_at",record.target_id);
   if(Date.parse(content.expires_at)<=Date.now()||String(content.author_vatra_id)!==String(record.actor_vatra_id))return;
   if(content.media_kind==="image"){photoPath=String(content.media_path||"");bucket="post-images";owner=content.author_vatra_id;}
  }else if(kind==="post_share"){
   content=await read("feed_posts","id,body,media_kind,media_path,media_items,author_vatra_id",record.target_id);
   const original=await read("feed_posts","id,body,media_kind,media_path,media_items",record.context_id);
   const media=Array.isArray(original.media_items)?original.media_items.find(x=>x?.media_kind==="image"):null;
   photoPath=String(media?.media_path||(original.media_kind==="image"?original.media_path:"")||"");bucket="post-images";
   if(!String(content.body||"").trim())content=original;
  }else return;
  if(run!==notificationRun||!body.isConnected)return;
  const excerpt=String(content?.body||"").trim().slice(0,175);
  const card=make("div","vatra-notice-preview-001");
  card.textContent=excerpt||t("Відкрити вміст","Open content");
  body.insertBefore(card,body.querySelector(".vatra-notification-time"));
  let url=null;
  if(bucket==="avatars"&&/^\d+\/avatar\/[A-Za-z0-9._-]+$/.test(photoPath))url=run.client.storage.from(bucket).getPublicUrl(photoPath)?.data?.publicUrl;
  else if(bucket==="post-images"&&/^\d+\/(?:posts|comments|stories)\/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i.test(photoPath))url=await noticePreviewURL(run,photoPath);
  else if(bucket==="album-photos"&&photoPath.startsWith(String(owner)+"/")&&photoPath.length<=300&&!photoPath.includes("..")){
   const signed=await run.client.storage.from(bucket).createSignedUrl(photoPath,120);
   if(!signed.error&&signed.data?.signedUrl){const candidate=new URL(signed.data.signedUrl);if(candidate.protocol==="https:"&&candidate.hostname==="cxrcycxrlkufozomsxcs.supabase.co")url=candidate.href;}
  }
  if(url&&run===notificationRun&&card.isConnected){const thumb=make("img","vatra-notice-preview-thumb-001");thumb.alt=t("Фото","Photo");thumb.loading="lazy";thumb.decoding="async";thumb.src=url;card.append(thumb);}
 }catch(_){}
}
async function enrichNotice(record,body,link){
 if(interactionKinds.has(record.kind)||["comment_like","avatar_comment_like","member_story"].includes(record.kind))return enrichInteraction(record,body,link);
 const run=notificationRun;
 if(!run||!["post_like","comment_like","avatar_like","avatar_comment_like","member_post"].includes(record.kind))return;
 try{
  const kind=record.kind;let content=null,photoPath="",bucket="post-images";
  if(kind==="avatar_like"){
   const bits=String(record.event_key||"").split(":");
   photoPath=bits.length>=4?bits.slice(2,-1).join(":"):"";
   if(!photoPath.startsWith(String(record.avatar_owner_vatra_id||ownId)+"/avatar/"))photoPath="";
   bucket="avatars";
  }else if(noticeUUID(record.target_id)){
   const table=kind==="comment_like"?"post_comments":kind==="avatar_comment_like"?"avatar_comments":
    record.target_kind==="group"?"community_posts":"feed_posts";
   const fields=kind==="comment_like"?"id,body,post_kind,post_id,media_kind,media_path":
    kind==="avatar_comment_like"?"id,body,owner_vatra_id,avatar_path":
    "id,body,media_kind,media_path,media_items";
   const result=await run.client.from(table).select(fields).eq("id",record.target_id).maybeSingle();
   if(run!==notificationRun||!body.isConnected||result.error||!result.data)return;
   content=result.data;
   if(kind==="comment_like"&&content.post_id){
    const url=new URL("feed",root);url.searchParams.set("post",content.post_id);
    url.searchParams.set("comment",record.target_id);link.href=url.href;
   }
   if(kind==="avatar_comment_like"){
    photoPath=String(content.avatar_path||"");bucket="avatars";
    const url=new URL("id"+content.owner_vatra_id,root);
    url.searchParams.set("photo","avatar");
    if(photoPath)url.searchParams.set("image",photoPath.split("/").pop());
    url.searchParams.set("comment",record.target_id);link.href=url.href;
   }else{
    const media=Array.isArray(content.media_items)?content.media_items.find(x=>x?.media_kind==="image"):null;
    photoPath=String(media?.media_path||(content.media_kind==="image"?content.media_path:"")||"");
   }
  }
  if(bucket==="avatars"&&photoPath&&kind==="avatar_like"){
   const url=new URL("id"+(record.avatar_owner_vatra_id||ownId),root);
   url.searchParams.set("photo","avatar");
   url.searchParams.set("image",photoPath.split("/").pop());
   link.href=url.href;
  }
  if(run!==notificationRun||!body.isConnected)return;
  const excerpt=String(content?.body||"").trim().slice(0,175);
  const label=kind==="comment_like"||kind==="avatar_comment_like"?
   t("Коментар: ","Comment: "):["post_like","member_post"].includes(kind)?t("Публікація: ","Post: "):"";
  const card=make("div","vatra-notice-preview-001");
  card.textContent=excerpt?label+excerpt+(String(content.body).length>175?"…":""):
   kind==="avatar_like"?t("Фото профілю","Profile photo"):t("Переглянути публікацію","View the post");
  body.insertBefore(card,body.querySelector(".vatra-notification-time"));
  if(bucket==="avatars"&&/^\d+\/avatar\/[A-Za-z0-9._-]+$/.test(photoPath)){
   const publicUrl=run.client.storage.from("avatars").getPublicUrl(photoPath)?.data?.publicUrl;
   if(publicUrl){const thumb=make("img","vatra-notice-preview-thumb-001");thumb.alt=t("Фото","Photo");thumb.loading="lazy";thumb.decoding="async";thumb.src=publicUrl;card.prepend(thumb);}
  }else if(bucket==="post-images"&&/^\d+\/(?:posts|comments)\/[A-Za-z0-9._-]+\.(?:jpg|png|webp)$/i.test(photoPath)){
   const signedUrl=await noticePreviewURL(run,photoPath);
   if(run===notificationRun&&card.isConnected){
    const thumb=make("img","vatra-notice-preview-thumb-001");
    thumb.alt=t("Фото","Photo");thumb.loading="lazy";thumb.decoding="async";thumb.src=signedUrl;card.prepend(thumb);
   }
  }
 }catch(_){}
}
async function friendActions(record,actions,onChange){
 const run=notificationRun;if(!run||!noticeUUID(record.target_id))return;
 try{
  const {data,error}=await run.client.from("friendships").select("id,status")
   .eq("id",record.target_id).eq("recipient_id",run.id).eq("status","pending").maybeSingle();
  if(error||!data||run!==notificationRun||!actions.isConnected)return;
  const row=make("div","vatra-notice-friend-controls-001");
  const accept=make("button","vatra-notice-friend-accept-001");
  accept.type="button";
  accept.append(icon("friend-plus","M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20v-2a7 7 0 0 1 11-5.8M18 14v7m-3.5-3.5h7"));
  accept.append(make("span","vatra-notice-friend-accept-copy-001",t("Прийняти","Accept")));
  accept.setAttribute("aria-label",t("Прийняти заявку в друзі","Accept friend request"));
  const reject=make("button","vatra-notice-friend-reject-001");
  reject.type="button";reject.append(icon("friend-reject","M5 5l14 14M19 5 5 19"));
  reject.setAttribute("aria-label",t("Відхилити заявку в друзі","Decline friend request"));
  row.append(accept,reject);actions.prepend(row);
  const decide=async accepted=>{
   accept.disabled=true;reject.disabled=true;
   try{
    const q=accepted?run.client.from("friendships").update({status:"accepted"}):
     run.client.from("friendships").delete();
    const {data:changed,error:err}=await q.eq("id",record.target_id)
     .eq("recipient_id",run.id).eq("status","pending").select("id").maybeSingle();
    if(err||!changed)throw err||Error("Friendship request unavailable");
    await remove(record.id);await onChange();
   }catch(_){
    accept.disabled=false;reject.disabled=false;
    window.VATRA_TOAST?.show?.(t("Не вдалося опрацювати заявку в друзі.","Could not process the friend request."),"error");
   }
  };
  accept.addEventListener("click",()=>void decide(true));
  reject.addEventListener("click",()=>void decide(false));
 }catch(_){}
}
function createRow(record,name,index,onChange,photoUrl,accountState=null,form=null){
 const article=make("article","vatra-notification-row ui-vatra-notification-row-"+index);
 if(!record.read_at)article.classList.add("is-unread");
 const mark=make("span","vatra-notification-unread ui-vatra-notification-unread-"+index);
 mark.setAttribute("aria-hidden","true");
 const badgeIcon=make("span","vatra-notification-kind ui-vatra-notification-kind-"+index);
 const path=record.kind==="friend_accepted"?
  "M12.5 11.8a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM3.5 20v-1.1a7 7 0 0 1 11-5.6M15.5 17l2.3 2.3 4.2-4.7":
  record.kind==="friend_request"?
  "M12 11.8a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM3.5 20v-1.2a7.1 7.1 0 0 1 11.1-5.7M18 14v7m-3.5-3.5h7":
  record.kind.endsWith("_like")?
  "M8 10.5 12.3 3c.6-1 2.1-.6 2.1.8v4.7h4.3a2.8 2.8 0 0 1 2.7 3.4l-1.6 6.7a2.8 2.8 0 0 1-2.7 2.1H8V10.5ZM3 10.5h5v10H3z":
  "M4 5h16v13H9l-5 3V5ZM8 10h8M8 14h5";
 badgeIcon.append(icon("event-"+index,path));
 const avatar=make("a","vatra-notification-avatar ui-vatra-notification-avatar-"+index);
 avatar.href=new URL("id"+record.actor_vatra_id,root).href;
 avatar.setAttribute("aria-label",name);
 window.VATRA_AVATAR?.fallback(avatar,accountState||"default");
 if(photoUrl&&!accountState){
  const picture=new Image();
  picture.decoding="async";
  picture.onload=()=>{
   if(!avatar.isConnected)return;
   window.VATRA_AVATAR?.clearFallback(avatar);
   avatar.style.backgroundImage="url("+JSON.stringify(photoUrl)+")";
   avatar.classList.add("has-photo");
  };
  picture.onerror=()=>avatar.classList.remove("has-photo");
  picture.src=photoUrl;
 }
 const body=make("div","vatra-notification-content ui-vatra-notification-content-"+index);
 const link=make("a","vatra-notification-link vatra-notification-link-"+index,messageFor(record.kind,name,form));
 const initialHref=hrefFor(record);if(initialHref)link.href=initialHref;
 let enrichment;
 link.addEventListener("click",async event=>{
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  if(!link.hasAttribute("href")||["avatar_comment","avatar_comment_like","comment_like"].includes(record.kind))await enrichment;
  if(!link.hasAttribute("href"))return;
  if(!record.read_at)await markRead(record.id);


  if(!window.VATRA_NAVIGATE?.to(link.href))location.assign(link.href);
 });
 const timestamp=make("time","vatra-notification-time vatra-notification-time-"+index,
  timeValue(record.created_at));
 timestamp.dateTime=record.created_at;
 body.append(link,timestamp);
 enrichment=Promise.resolve().then(()=>enrichNotice(record,body,link));
 const actions=make("div","vatra-notification-actions ui-vatra-notification-actions-"+index);
 const deleteButton=make("button","vatra-notification-delete vatra-notification-delete-"+index);
 deleteButton.type="button";
 deleteButton.append(icon("delete-"+index,"M5 5l14 14M19 5 5 19"));
 deleteButton.setAttribute("aria-label",t("Видалити сповіщення","Delete notification"));
 deleteButton.setAttribute("data-vatra-hint",t("Видалити","Delete"));
 deleteButton.addEventListener("click",async()=>{
  deleteButton.disabled=true;
  try{await remove(record.id);await onChange();}
  catch(_){deleteButton.disabled=false;}
 });
 actions.append(deleteButton);
 if(record.kind==="friend_request")void friendActions(record,actions,onChange);
 const avatarStack=make("div","vatra-notification-avatar-stack ui-vatra-notification-avatar-stack-"+index);
 avatarStack.append(avatar,badgeIcon);
 article.append(mark,avatarStack,body,actions);
 article.addEventListener("click",event=>{if(event.target.closest("a,button,input,select,textarea"))return;link.click();});
 return article;
}
async function renderRows(list,status,opts,onChange,prev,next,pageLabel){

 const placeholders=Array.from({length:Math.min(3,opts.size)},(_,i)=>{
  const row=make("div","vatra-notification-skeleton ui-notification-skeleton-"+i);
  row.setAttribute("aria-hidden","true");
  const avatar=make("span","vatra-notification-skeleton-avatar ui-notification-skeleton-avatar-"+i);
  const body=make("span","vatra-notification-skeleton-lines ui-notification-skeleton-lines-"+i);
  body.append(make("span","vatra-notification-skeleton-line ui-notification-skeleton-line-a-"+i),
   make("span","vatra-notification-skeleton-line short ui-notification-skeleton-line-b-"+i));
  row.append(avatar,body);return row;
 });
 list.replaceChildren(...placeholders);
 status.hidden=true;list.setAttribute("aria-busy","true");
 try{
  const run=notificationRun;
  const {rows,hasNext}=await fetchRows(opts);
  if(run!==notificationRun)return [];
  const {names,avatars,states,forms}=await authorNames(rows);
  if(run!==notificationRun)return [];
  const nodes=rows.map((record,i)=>{
   const id=String(record.actor_vatra_id),state=states.get(id);
   const name=state==="deleted"?t("Акаунт видалено","Account deleted"):
    state==="blocked"?t("Акаунт заблоковано","Account blocked"):
    names.get(id)||format("Учасник VATRA ID {id}","VATRA member ID {id}",{id});
   return createRow(record,name,String(opts.page*opts.size+i+1),
    onChange,avatars.get(id),state,forms.get(id));
  });
  list.replaceChildren(...nodes);
  if(!rows.length){
   renderEmpty(status);
  }
  if(prev)prev.disabled=opts.page===0;
  if(next)next.disabled=!hasNext;
  if(pageLabel)pageLabel.textContent=format("Сторінка {page}","Page {page}",{page:opts.page+1});
  return rows;
 }catch(_){
  status.textContent=t("Не вдалося завантажити сповіщення. Спробуйте ще раз.",
   "Could not load notifications. Please retry.");
  status.hidden=false;if(prev)prev.disabled=true;if(next)next.disabled=true;
  return [];
 }finally{list.setAttribute("aria-busy","false");}
}
async function panelLoad(){
 const run=notificationRun;
 if(!panel||!open||!run)return;
 if(panelLoadPending){panelLoadQueued=true;return panelLoadPending;}

 const task=(async()=>{
  const list=panelItems;
  const rows=await renderRows(list,pick("#vatra-notification-panel-empty"),
   {page:0,size:5},panelLoad,null,null,null);
  if(!open||run!==notificationRun)return;

  const unread=rows.filter(row=>!row.read_at).map(row=>row.id);
  if(unread.length)try{
   const {error}=await run.client.from("member_notifications")
    .update({read_at:new Date().toISOString()})
    .eq("recipient_vatra_id",run.id).in("id",unread).is("read_at",null);
   if(error)throw error;
   if(!open||run!==notificationRun)return;
   for(const node of list.querySelectorAll(".is-unread"))node.classList.remove("is-unread");
   void unreadCount();
  }catch(_){ }
 })();
 panelLoadPending=task;
 try{await task;}
 finally{
  if(panelLoadPending===task){
   panelLoadPending=null;
   const again=panelLoadQueued;panelLoadQueued=false;
   if(again&&open&&run===notificationRun)void panelLoad();
  }
 }
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
 if(!notificationRun)return;
 const menu=pick(".feed-account-menu");if(menu?.open)menu.open=false;
 open=true;window.VATRA_HIDE_SHELL_TOOLTIP?.();
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
 badge=make("span","vatra-notification-count vatra-notification-count-001");
 badge.hidden=true;badge.setAttribute("aria-hidden","true");bell.append(badge);
 panel=make("section","vatra-notification-panel ui-vatra-notification-panel-001");
 panel.id="vatra-notification-panel";panel.hidden=true;
 panel.setAttribute("role","dialog");
 panel.setAttribute("aria-label",t("Ваші сповіщення","Your notifications"));
 const heading=make("div","vatra-notification-panel-heading ui-vatra-notification-panel-heading-001");
 const title=make("h2","vatra-notification-title-001",t("Сповіщення","Notifications"));
 const settings=make("a","vatra-notification-settings-001");
 settings.href=new URL("settings#notifications",root).href;
 settings.append(icon("settings","M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM20 12a8 8 0 0 0-.2-1.8l1.5-1.4-2-3.4-2 .7A8 8 0 0 0 14.4 5L14 3h-4l-.4 2A8 8 0 0 0 6.7 6l-2-.7-2 3.4 1.5 1.4a8 8 0 0 0 0 3.8l-1.5 1.4 2 3.4 2-.7A8 8 0 0 0 9.6 19l.4 2h4l.4-2a8 8 0 0 0 2.9-1.1l2 .7 2-3.4-1.5-1.4A8 8 0 0 0 20 12Z"));
 settings.setAttribute("aria-label",t("Налаштування сповіщень","Notification settings"));
 heading.append(title,settings);
 panelItems=make("div","vatra-notification-list ui-vatra-notification-panel-list-001");
 const empty=make("p","vatra-notification-panel-empty-001");
 empty.id="vatra-notification-panel-empty";empty.hidden=true;
 const footer=make("a","vatra-notification-all-001",t("Відкрити всі сповіщення","View all notifications"));
 footer.href=pageURL();
 panel.append(heading,panelItems,empty,footer);
 document.body.append(panel);
 bell.setAttribute("aria-controls",panel.id);
 bell.addEventListener("click",()=>{if(open)closePanel();else openPanel();});
 document.addEventListener("pointerdown",event=>{
  if(open&&!bell.contains(event.target)&&!panel.contains(event.target))closePanel();
 });
 document.addEventListener("keydown",event=>{
  if(open&&event.key==="Escape"){closePanel();bell.focus();}
 });
 let positionPending=false;
 const schedulePosition=()=>{
  if(!open||positionPending)return;
  positionPending=true;
  requestAnimationFrame(()=>{positionPending=false;positionPanel();});
 };
 window.addEventListener("resize",schedulePosition,{passive:true});
 window.addEventListener("scroll",schedulePosition,{passive:true});
 window.visualViewport?.addEventListener("resize",schedulePosition,{passive:true});
}


const SITE_SEARCH_TTL_MS=8_000,SITE_SEARCH_MAX=24;
const siteSearchCaches=new WeakMap();
const emptySiteSearch=()=>({people:[],communities:[],posts:[],products:[],clips:[],photos:[],videos:[]});
function siteSearchState(viewer){
 let state=siteSearchCaches.get(viewer);
 if(state)return state;
 state={entries:new Map(),generation:0};
 siteSearchCaches.set(viewer,state);
 if(typeof viewer.auth?.onAuthStateChange==="function"){
  viewer.auth.onAuthStateChange(event=>{

   if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;
   state.generation++;
   for(const entry of state.entries.values())entry.controller?.abort();
   state.entries.clear();
  });
 }
 return state;
}


function consumeSiteSearch(entry,signal,state,key){
 if(!signal){entry.uncancelable=true;return entry.pending;}
 if(signal.aborted)return Promise.resolve(emptySiteSearch());
 entry.consumers++;
 return new Promise((resolve,reject)=>{
  let finished=false;
  const finish=(value,failed=false)=>{
   if(finished)return;
   finished=true;signal.removeEventListener("abort",onAbort);
   entry.consumers--;
   if(failed)reject(value);else resolve(value);
  };
  const onAbort=()=>{
   finish(emptySiteSearch());
   if(entry.consumers===0&&!entry.uncancelable){
    entry.controller.abort();
    if(state.entries.get(key)===entry)state.entries.delete(key);
   }
  };
  signal.addEventListener("abort",onAbort,{once:true});
  entry.pending.then(value=>finish(value),error=>finish(error,true));
 });
}
async function querySite(viewer,phrase,signal){
 const request=viewer.rpc("search_site",{p_query:phrase,p_limit:20});
 const {data,error}=await (typeof request.abortSignal==="function"?request.abortSignal(signal):request);
 if(signal.aborted)return {result:emptySiteSearch(),cacheable:false};
 if(error)throw error;
 if(!data||typeof data!=="object")throw Error("Invalid search response");
 const result=emptySiteSearch();
 for(const key of Object.keys(result))result[key]=Array.isArray(data[key])?data[key].slice(0,20):[];
 return {result,cacheable:true};
}
async function findSite(term,signal){
 const phrase=String(term||"").trim().slice(0,120);
 const viewer=client;
 if(signal?.aborted||!viewer||(phrase.length<2&&!/^[1-9]$/.test(phrase)))return emptySiteSearch();
 const state=siteSearchState(viewer),key=phrase.toLocaleLowerCase();
 const previous=state.entries.get(key);
 if(previous){
  if(previous.pending){

   state.entries.delete(key);state.entries.set(key,previous);
   return consumeSiteSearch(previous,signal,state,key);
  }
  if(previous.expires>Date.now()){
   state.entries.delete(key);state.entries.set(key,previous);
   return previous.result;
  }
  state.entries.delete(key);
 }
 const generation=state.generation;
 const entry={pending:null,expires:0,controller:new AbortController(),
  consumers:0,uncancelable:false};
 let pending;
 pending=querySite(viewer,phrase,entry.controller.signal).then(({result,cacheable})=>{

  if(state.generation!==generation)return emptySiteSearch();
  if(state.entries.get(key)===entry){
   state.entries.delete(key);
   if(cacheable&&!entry.controller.signal.aborted)
    state.entries.set(key,{result,expires:Date.now()+SITE_SEARCH_TTL_MS});
  }
  return result;
 }).catch(error=>{
  if(state.entries.get(key)===entry)state.entries.delete(key);
  throw error;
 });
 entry.pending=pending;
 state.entries.set(key,entry);
 while(state.entries.size>SITE_SEARCH_MAX){
  const oldest=state.entries.keys().next().value;
  const expired=state.entries.get(oldest);

  if(expired?.pending&&expired.consumers===0&&!expired.uncancelable)
   expired.controller.abort();
  state.entries.delete(oldest);
 }
 return consumeSiteSearch(entry,signal,state,key);
}
window.VATRA_SITE_SEARCH={search:findSite,avatarUrl:(id,path)=>{if(!client||!path||typeof path!=="string"||!path.startsWith(String(id)+"/avatar/"))return null;return client.storage.from("avatars").getPublicUrl(path).data?.publicUrl||null;},attachVerified:(target,id)=>{if(client)void window.VATRA_VERIFIED?.attach(client,target,id);}};

function stop(){
 const run=notificationRun;
 if(!run)return;
 notificationRun=null;
 run.controller.abort();
 if(run.timer!==null)clearInterval(run.timer);
 try{run.authSubscription?.unsubscribe?.();}catch(_){}
 if(liveChannel)try{run.client.removeChannel?.(liveChannel);}catch(_){}
 liveChannel=null;
 closePanel();
 panelItems?.replaceChildren();
 pick("#notifications-list")?.replaceChildren();
 badge.hidden=true;badge.textContent="";
 bell.setAttribute("aria-label",t("Сповіщення","Notifications"));
 refreshBusy=false;refreshQueued=false;
 panelLoadPending=null;panelLoadQueued=false;
 sectionPage=0;sectionLoading=false;sectionQueued=false;sectionScope=null;
 client=null;ownId=null;
 window.VATRA_AUTH_MEMBER_ID=null;
 if(window.VATRA_ACCOUNT_CONTEXT?.client===run.client&&window.VATRA_ACCOUNT_CONTEXT.id===run.id)delete window.VATRA_ACCOUNT_CONTEXT;
 window.VATRA_ACCOUNT_END?.(run.client,run.id);
 window.VATRA_SEARCH_HISTORY?.setViewer(null);
}
function incomingToast(row){
 if(!row||!window.VATRA_TOAST?.show)return;
 const kind=String(row.kind||"");
 const sender=String(row.actor_vatra_id||"");
 const href=/^[1-9]\d*$/.test(sender)?"id"+sender:"notifications";
 if(kind==="friend_request")window.VATRA_TOAST.show(t("Нова заявка у друзі","You have a new friend request"),"friends",{href,actionLabel:t("Переглянути","View")});
 else if(kind==="friend_accepted")window.VATRA_TOAST.show(t("Вашу заявку в друзі прийнято","Your friend request was accepted"),"friends",{href,actionLabel:t("Переглянути","View")});
 else if(kind==="gift"||kind==="profile_gift")window.VATRA_TOAST.show(t("Ви отримали подарунок!","You've received a gift!"),"gift",{href:"gifts",actionLabel:t("Переглянути","View")});
 else if(kind==="friend_declined")window.VATRA_TOAST.show(t("Вашу заявку в друзі відхилено","Your friend request was declined"),"friends",{href,actionLabel:t("Переглянути","View")});
}
function start(c,id){
 if(!c||!validId(id))return;
 if(notificationRun?.client===c&&notificationRun.id===String(id))return;
 stop(); 
 client=c;ownId=String(id);

 window.VATRA_AUTH_MEMBER_ID=ownId;

 window.VATRA_ACCOUNT_CONTEXT={client:c,id:ownId};
 void window.VATRA_ACCOUNT_SESSION?.(c,ownId);
 window.VATRA_SEARCH_HISTORY?.setViewer(ownId);
 headerUI();
 if(!bell)return;
 const run={client:c,id:ownId,controller:new AbortController(),timer:null,authSubscription:null};
 notificationRun=run;
 void unreadCount();

 let subscribed=false,lastRefresh=Date.now(),lastPoll=Date.now();
 const refresh=(force=false)=>{
  if(notificationRun!==run||document.hidden||(!force&&Date.now()-lastRefresh<15000))return;
  lastRefresh=Date.now();void unreadCount();if(open)void panelLoad();
 };
 const poll=()=>{
  if(document.hidden)return;
  const now=Date.now(),period=subscribed?300000:120000;
  if(now-lastPoll<period)return;
  lastPoll=now;refresh();
 };
 const pause=()=>{
  if(run.timer!==null){clearInterval(run.timer);run.timer=null;}
 };
 const resume=()=>{
  if(notificationRun!==run||document.hidden)return;
  if(run.timer===null)run.timer=setInterval(poll,60000);
  refresh();
 };
 window.addEventListener("focus",resume,{passive:true,signal:run.controller.signal});
 window.addEventListener("pageshow",resume,{signal:run.controller.signal});
 document.addEventListener("visibilitychange",()=>{
  if(document.hidden)pause();else resume();
 },{passive:true,signal:run.controller.signal});
 window.addEventListener("pagehide",event=>{if(event.persisted)pause();else stop();},{signal:run.controller.signal});
 if(!document.hidden)run.timer=setInterval(poll,60000);
 try{
  if(typeof c.channel==="function")
   liveChannel=c.channel("vatra-notices-"+run.id)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"member_notifications",
     filter:"recipient_vatra_id=eq."+run.id},payload=>{
       if(notificationRun!==run)return;
       refresh(true);
       if(!document.hidden){
        window.VATRA_SOUNDS?.play?.(["friend_request","friend_accepted","friend_declined"].includes(payload?.new?.kind)?"newFollower":"notification");
        incomingToast(payload?.new);
       }
      })
    .subscribe(status=>{if(notificationRun===run)subscribed=status==="SUBSCRIBED";});
 }catch(_){subscribed=false;}

 try{
  run.authSubscription=c.auth?.onAuthStateChange?.(event=>{
   if(event==="SIGNED_OUT"&&notificationRun===run)stop();
  })?.data?.subscription||null;
 }catch(_){}
}
async function pageLoad(append=false){
 const run=notificationRun;
 const list=pick("#notifications-list"),empty=pick("#notifications-empty");
 const more=pick("#notifications-more");
 if(!list||!run)return;
 if(sectionLoading){if(!append)sectionQueued=true;return;}
 sectionLoading=true;more.disabled=true;list.setAttribute("aria-busy","true");
 const filter=sectionFilter,sort=sectionSort,scope=JSON.stringify([filter,sort]);
 const isCurrent=()=>run===notificationRun&&filter===sectionFilter&&sort===sectionSort;
 const page=append?sectionPage+1:0,size=30;
 if(!append){if(sectionScope!==scope)list.replaceChildren();empty.hidden=true;}
 try{
  const result=await fetchRows({page,size,filter,sort});
  if(!isCurrent())return;
  const authors=await authorNames(result.rows);
  if(!isCurrent())return;
  if(!append)list.replaceChildren();
  for(const row of result.rows){
   const index=list.children.length+1,id=String(row.actor_vatra_id);
   const state=authors.states.get(id);
   const name=state==="deleted"?t("Акаунт видалено","Account deleted"):
    state==="blocked"?t("Акаунт заблоковано","Account blocked"):
    authors.names.get(id)||format("Учасник VATRA ID {id}","VATRA member ID {id}",{id});
   list.append(createRow(row,name,String(index),()=>pageLoad(false),authors.avatars.get(id),state,authors.forms.get(id)));
  }
  sectionPage=page;sectionScope=scope;
  more.hidden=!result.hasNext;
  if(!list.children.length){
   renderEmpty(empty);
  }
 }catch(_){
  if(!isCurrent())return;
  if(!append){list.replaceChildren();sectionScope=null;}
  empty.hidden=false;
  empty.textContent=t("Не вдалося завантажити сповіщення. Спробуйте ще раз.",
   "Could not load notifications. Please retry.");
 }finally{
  if(run===notificationRun){
   sectionLoading=false;more.disabled=false;list.setAttribute("aria-busy","false");
   if(sectionQueued){sectionQueued=false;void pageLoad(false);}
  }
 }
}
function pageUI(){
 for(const btn of document.querySelectorAll("[data-notification-filter]")){
  btn.addEventListener("click",()=>{
   sectionFilter=btn.dataset.notificationFilter;sectionPage=0;
   for(const other of document.querySelectorAll("[data-notification-filter]"))
    other.setAttribute("aria-pressed",String(other===btn));
   void pageLoad(false);
  });
 }
 pick("#notifications-sort")?.addEventListener("change",event=>{
  sectionSort=event.target.value==="old"?"old":"new";
  sectionPage=0;void pageLoad(false);
 });
 pick("#notifications-more")?.addEventListener("click",()=>void pageLoad(true));
 void pageLoad(false);
}
async function pageBoot(){
 if(document.body?.dataset.page!=="notifications")return;
 if(!window.supabase?.createClient)return;
 const clientRef=window.supabase.createClient("https://cxrcycxrlkufozomsxcs.supabase.co",
  "sb_publishable_oKypZDxi8PP1oxSylfh5wQ_H6HxeM-i",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}});
 try{
  const [{data,error}]=await Promise.all([clientRef.auth.getUser(),window.VATRA_LANGUAGE?.ready]);
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
  window.VATRA_AVATAR?.setHeader({email:user.email,name:displayName.split(/\s+/)[0].slice(0,28),
   initials:displayName.slice(0,1).toLocaleUpperCase(),id});
  if(avatar)window.VATRA_AVATAR?.applyRemembered(avatar,user.email);
  const headerId=pick("#feed-header-id");if(headerId)headerId.textContent="VATRA ID "+id;
  for(const link of document.querySelectorAll('a[href="profile"]'))link.href=new URL("id"+id,root).href;
  pick("#feed-logout")?.addEventListener("click",async()=>{
   await clientRef.auth.signOut({scope:"local"});
   window.VATRA_AVATAR?.clearHeader();location.replace(root.href);
  });
  const form=pick("#feed-search-form");
  form?.addEventListener("submit",event=>{
   event.preventDefault();
   const query=pick("#feed-search-input")?.value.trim()||"";
   location.href=new URL("feed"+(query?"?q="+encodeURIComponent(query):""),root).href;
  });
  pick("#feed-app").hidden=false;pick("#feed-loading").hidden=true;
  document.body.dataset.authReady="true";document.body.classList.remove("vatra-shell-pending");
  start(clientRef,id);pageUI();
 }catch(_){
  const loader=pick("#feed-loading");if(loader){loader.textContent=t("Не вдалося завантажити сповіщення. Оновіть сторінку.","Could not load notifications. Refresh.");}
 }
}
window.addEventListener("vatra-notification-display-changed",()=>{void unreadCount();if(document.body?.dataset.page==="notifications")void pageLoad(false);});
window.VATRA_NOTIFICATIONS={start,pageBoot};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",pageBoot,{once:true});
else void pageBoot();
})();
