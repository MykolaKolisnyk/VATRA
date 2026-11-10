/* VATRA member profile by public numeric ID; never expose Supabase Auth UUIDs. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://rjasunoawrxvetwadylh.supabase.co";
const PUBLIC_KEY="sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-";
const q=selector=>document.querySelector(selector);
const english=document.documentElement.lang==="en";
const locale=english?"en-US":"uk-UA";
const t=(uk,en)=>{if(!english)return uk;const value=window.VATRA_LANGUAGE?.translate(uk);return value&&value!==uk?value:en;};
const home=new URL("./",location.href).href;
const validId=id=>typeof id==="string"&&/^[1-9][0-9]{0,18}$/.test(id);
const profileURL=id=>new URL("id"+id,home).href;
function setAllOwnProfileLinks(id){
 for(const link of document.querySelectorAll('a[href="profile"],a[href="profile.html"]')){
  link.href=profileURL(id);
 }
}
function node(tag,className,value){
 const element=document.createElement(tag);
 if(className)element.className=className;
 if(value!==undefined)element.textContent=value;
 return element;
}
function dateLabel(value){
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat(locale,{
  day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
 }).format(date);
}
async function renderPosts(client,id,name,initial){
 const posts=q("#profile-posts");
 const empty=q("#profile-posts-empty");
 q("#profile-posts-title").textContent=t("Публікації","Posts");
 const {data,error}=await client.from("feed_posts")
  .select("id,author_vatra_id,body,created_at").eq("author_vatra_id",id)
  .order("created_at",{ascending:false}).limit(30);
 if(error)throw error;
 posts.replaceChildren();
 for(const post of data||[]){
  const card=node("article","feed-post-card ui-profile-post-card-001");
  const head=node("div","feed-post-header ui-profile-post-header-001");
  const avatar=node("span","feed-avatar feed-post-avatar vt-profile-post-avatar-001",initial);
  avatar.setAttribute("aria-hidden","true");
  const info=node("div","feed-post-author ui-profile-post-author-001");
  const author=node("strong","feed-post-name vt-profile-post-name-001",name);
  const stamp=node("time","feed-post-date vt-profile-post-date-001","VATRA ID "+id+" · "+dateLabel(post.created_at));
  stamp.dateTime=post.created_at;
  info.append(author,stamp);
  head.append(avatar,info);
  card.append(head,node("p","feed-post-body vt-profile-post-body-001",post.body));
  posts.append(card);
 }
 empty.hidden=posts.childElementCount>0;
 if(!empty.hidden)empty.textContent=t("Цей користувач ще не має публікацій.","This member has no posts yet.");
}
async function start(){
 await window.VATRA_LANGUAGE?.ready;
 if(!window.supabase?.createClient){
  q(".vatra-auth-loading-caption").textContent=t("Не вдалося відкрити VATRA","Could not open VATRA");return;
 }
 try{
  const client=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
   auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}
  });
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user?.id||!data.user.email_confirmed_at){location.replace(home);return;}
  const user=data.user,metadata=user.user_metadata||{};
  const name=[metadata.first_name,metadata.last_name].filter(x=>typeof x==="string"&&x.trim()).map(x=>x.trim()).join(" ")
   ||String(metadata.full_name||"").trim()||t("Учасник VATRA","VATRA member");
  const cleanName=Array.from(name).slice(0,100).join("");
  const ownInitial=(Array.from(cleanName)[0]||"V").toLocaleUpperCase(locale);
  const {data:ownProfile,error:ownError}=await client.from("accounts")
   .select("vatra_id").eq("user_id",user.id).maybeSingle();
  if(ownError||ownProfile?.vatra_id==null)throw ownError||new Error("No owner VATRA ID");
  const ownId=String(ownProfile.vatra_id);
  if(!validId(ownId))throw new Error("Invalid own VATRA ID");

  const pathId=location.pathname.match(/\/id([1-9][0-9]{0,18})$/)?.[1]||null;
  const queryId=new URLSearchParams(location.search).get("vatra_id");
  const requestedId=pathId||queryId||ownId;
  const validRequested=validId(requestedId);
  // The shared top bar and "My page" always link to the signed-in user's ID.
  setAllOwnProfileLinks(ownId);
  q("#feed-header-avatar").textContent=ownInitial;
  q("#feed-menu-name").textContent=cleanName;
  q("#feed-header-id").textContent="VATRA ID "+ownId;

  const isOwner=requestedId===ownId;
  let memberExists=isOwner;
  if(validRequested&&!isOwner){
   const lookup=await client.from("vatra_directory")
    .select("vatra_id").eq("vatra_id",requestedId).maybeSingle();
   if(lookup.error)throw lookup.error;
   memberExists=String(lookup.data?.vatra_id)===requestedId;
  }
  if(validRequested){
   const canonical=profileURL(requestedId);
   if(location.pathname!==new URL(canonical).pathname||location.search){
    history.replaceState(history.state,"",canonical);
   }
  }
  const title=q(".vt-profile-title-001"),heading=q("#profile-heading"),
   detail=q("#profile-about-text"),avatar=q("#profile-avatar");
  const memberName=isOwner?cleanName:t("Учасник VATRA","VATRA member");
  if(!validRequested||!memberExists){
   title.textContent=t("Профіль не знайдено","Profile not found");
   heading.textContent=t("Профіль не знайдено","Profile not found");
   q("#profile-vatra-id").textContent=validRequested?"VATRA ID "+requestedId:"";
   detail.textContent=t("Користувача з таким VATRA ID не знайдено.","There is no member with that VATRA ID.");
   q("#profile-posts-section").hidden=true;
   document.title=t("Профіль не знайдено · VATRA","Profile not found · VATRA");
  }else{
   title.textContent=isOwner?t("Моя сторінка","My page"):t("Профіль","Profile");
   heading.textContent=memberName;
   q("#profile-vatra-id").textContent="VATRA ID "+requestedId;
   avatar.textContent=isOwner?ownInitial:"V";
   if(!isOwner)detail.textContent=t(
    "Публічна сторінка користувача VATRA. Тут відображаються його публікації.",
    "This member's public VATRA page. Their posts appear below.");
   document.title=memberName+" · VATRA";
  }
  q("#profile-app").hidden=false;q("#profile-loading").hidden=true;
  document.body.dataset.authReady="true";document.body.dataset.feedReady="true";
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
   const {error}=await client.auth.signOut({scope:"local"});
   if(error){button.disabled=false;return;}
   try{sessionStorage.setItem("vatra-just-signed-out","1");}catch(_){}
   location.replace(home);
  });
  if(memberExists&&validRequested){
   try{await renderPosts(client,requestedId,memberName,isOwner?ownInitial:"V");}
   catch(_){q("#profile-posts-empty").hidden=false;
    q("#profile-posts-empty").textContent=t("Не вдалося завантажити публікації.","Could not load posts.");}
  }
 }catch(_){
  q(".vatra-auth-loading-caption").textContent=t("Не вдалося завантажити сторінку. Оновіть її.","Could not load this page. Please refresh.");
 }
}
void start();
})();
