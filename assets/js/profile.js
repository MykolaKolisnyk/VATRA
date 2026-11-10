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
 for(const link of document.querySelectorAll(".social-top-link")){
  const label=link.querySelector("[data-social-uk]");
  if(label){link.setAttribute("aria-label",label.textContent);link.title=label.textContent;}
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
 q(".vt-profile-title-001").textContent=t("Профіль не знайдено","Profile not found");
 q("#profile-heading").textContent=t("Профіль не знайдено","Profile not found");
 q("#profile-vatra-id").textContent="";
 q("#profile-avatar").textContent="?";
 q(".vt-profile-about-heading-001").textContent=t("Недоступний профіль","Unavailable profile");
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
   header.append(identity);
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
  const ownAvatar=(Array.from(cleanOwnName)[0]||"V").toLocaleUpperCase(locale);
  const {data:account,error:accountError}=await client.from("accounts")
   .select("vatra_id").eq("user_id",user.id).maybeSingle();
  const ownId=!accountError&&account?.vatra_id!=null?String(account.vatra_id):null;
  q("#feed-header-avatar").textContent=ownAvatar;
  q("#feed-menu-name").textContent=cleanOwnName;
  const sideName=q("#feed-sidebar-person-name"),sideAvatar=q("#feed-sidebar-person-avatar");
  if(sideName)sideName.textContent=cleanOwnName;
  if(sideAvatar)sideAvatar.textContent=ownAvatar;
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
  if(!isMine){
   const ownPage=q(".ui-feed-nav-link-2"),profileTop=q(".ui-social-top-profile-001");
   for(const link of [ownPage,profileTop]){
    link?.classList.remove("feed-nav-active","social-top-active");
    link?.removeAttribute("aria-current");
   }
  }
  const name=isMine?cleanOwnName:t("Учасник VATRA","VATRA member");
  q("#profile-heading").textContent=name;
  q("#profile-avatar").textContent=isMine?ownAvatar:"V";
  q("#profile-vatra-id").textContent="VATRA ID "+targetId;
  q(".vt-profile-title-001").textContent=isMine?t("Моя сторінка","My page"):t("Профіль","Profile");
  if(!isMine){
   q(".vt-profile-about-heading-001").textContent=t("Профіль користувача","Member profile");
   q("#profile-about-text").textContent=t(
    "Публічна сторінка учасника VATRA. Тут відображаються його публікації.",
    "This VATRA member's public page displays their posts.");
  }
  document.title=(isMine?t("Моя сторінка","My page"):t("Профіль","Profile"))+" · VATRA";
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