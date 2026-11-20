
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://cxrcycxrlkufozomsxcs.supabase.co";
const PUBLIC_KEY="sb_publishable_oKypZDxi8PP1oxSylfh5wQ_H6HxeM-i";
const root=new URL("../../",document.currentScript.src).href;
const activeLocale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
const dateLocales={uk:"uk-UA",en:"en-US",pl:"pl-PL",de:"de-DE",fr:"fr-FR",it:"it-IT",ka:"ka-GE",bg:"bg-BG"};
const locale=dateLocales[activeLocale]||"uk-UA";
const t=(uk,en)=>{
 if(activeLocale==="uk")return uk;
 if(activeLocale==="en")return en;
 const translated=window.VATRA_LANGUAGE?.translate?.(uk);
 return typeof translated==="string"&&translated!==uk?translated:uk;
};
const $=selector=>document.querySelector(selector);
const idPattern=/^[1-9][0-9]{0,18}$/;
const postPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clubURL=id=>root+"club"+id;
const node=(tag,cls,text)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
};
const status=(selector,text,kind)=>{
 const el=$(selector);
 if(!el)return;
 el.textContent=text;
 el.hidden=false;
 if(kind)el.dataset.kind=kind;
};
const gateError=message=>{
 const loader=$("#community-loading");
 if(!loader)return;
 loader.dataset.loadingError="true";
 loader.setAttribute("role","alert");
 const caption=loader.querySelector(".vatra-auth-loading-caption");
 if(caption)caption.textContent=message;
 if(loader.querySelector(".vatra-auth-loading-retry"))return;
 const retry=node("button","vatra-auth-loading-retry vt-community-retry-001",t("Повторити","Retry"));
 retry.type="button";
 retry.addEventListener("click",()=>location.reload());
 loader.querySelector(".vatra-auth-loading-content")?.append(retry);
};
async function loadHeaderPhoto(client,id,email){
 if(!idPattern.test(String(id||"")))return;
 try{
  const {data,error}=await client.from("profile_media")
   .select("avatar_path").eq("vatra_id",id).maybeSingle();
  if(error)return;
  window.VATRA_AVATAR?.fromPath(client,email,id,data?.avatar_path||null);
  if(typeof data?.avatar_path!=="string"||!data.avatar_path.startsWith(id+"/avatar/"))return;
  const image=client.storage.from("avatars").getPublicUrl(data.avatar_path)?.data?.publicUrl;
  if(!image)return;
  const url=new URL(image);
  if(url.protocol!=="https:"||url.hostname!=="cxrcycxrlkufozomsxcs.supabase.co")return;
  const target=$("#feed-header-avatar");
  if(target){target.style.backgroundImage="url("+JSON.stringify(image)+")";
   target.classList.add("has-photo");target.textContent="";}
 }catch(_){}
}
async function start(init){
 await window.VATRA_LANGUAGE?.ready;
 for(const element of document.querySelectorAll("[data-community-uk]")){
  element.textContent=t(element.dataset.communityUk,element.dataset.communityEn);
 }
 for(const button of document.querySelectorAll("[data-community-filter]")){
  const key=button.dataset.communityFilter,ns="http://www.w3.org/2000/svg";
  const paths={all:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9 9l7-3-3 7-7 3z",followed:"M12 21s-9-5-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12Z",owned:"M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-2a8 8 0 0 1 16 0v2"};
  const icon=node("span","vatra-discovery-nav-icon ui-vatra-community-nav-icon-"+key),svg=document.createElementNS(ns,"svg"),part=document.createElementNS(ns,"path");
  svg.setAttribute("class","ui-vatra-community-nav-svg-"+key);svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.7");svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");svg.setAttribute("aria-hidden","true");part.setAttribute("class","ui-vatra-community-nav-path-"+key);part.setAttribute("d",paths[key]||paths.all);svg.append(part);icon.append(svg);
  const label=node("span","vt-vatra-community-nav-label-"+key,button.textContent);button.replaceChildren(icon,label);
 }
 for(const element of document.querySelectorAll("[data-social-uk]")){
  element.textContent=t(element.dataset.socialUk,element.dataset.socialEn);
 }
 const brand=document.querySelector(".feed-header-brand");
 if(brand)brand.setAttribute("aria-label",t("VATRA — Стрічка","VATRA — Feed"));
 for(const input of document.querySelectorAll("[data-shell-placeholder-uk]")){
    input.placeholder=t(input.dataset.shellPlaceholderUk,input.dataset.shellPlaceholderEn);
   }
   for(const control of document.querySelectorAll("[data-shell-aria-uk]")){
    const title=t(control.dataset.shellAriaUk,control.dataset.shellAriaEn);
    control.setAttribute("aria-label",title);
    control.removeAttribute("title");
   }
   for(const pair of [
    [".ui-shell-header-notifications-001","Сповіщення — незабаром","Notifications — coming soon"],
    [".ui-shell-header-music-001","Музика — незабаром","Music — coming soon"]]){
    const control=document.querySelector(pair[0]);
    if(control){
     const title=t(pair[1],pair[2]);
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
 const name=$("#community-name"),description=$("#community-description");
 if(name)name.placeholder=t("Наприклад, Українська музика","For example, Ukrainian music");
 if(description)description.placeholder=t("Про що ваша спільнота?","What is your community about?");
 if(!window.supabase?.createClient){
  gateError(t("Не вдалося відкрити VATRA","Could not open VATRA"));
  return;
 }
 try{
  const client=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
   auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}
  });
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user?.id||!data.user.email_confirmed_at){
   const id=location.pathname.match(/\/club([1-9][0-9]{0,18})$/)?.[1]||new URLSearchParams(location.search).get("club_id");
   if(!data?.user?.id&&id&&document.querySelector("#club-heading")&&await window.VATRA_GUEST?.club(client,id))return;
   location.replace(root);return;
  }
  const user=data.user,meta=user.user_metadata||{};
  const ownName=[meta.first_name,meta.last_name].filter(x=>typeof x==="string"&&x.trim())
    .map(x=>x.trim()).join(" ")||String(meta.full_name||"").trim()||
    t("Учасник VATRA","VATRA member");
  const cleanName=Array.from(ownName).slice(0,100).join("");
  const headerName=Array.from((typeof meta.first_name==="string"&&meta.first_name.trim()?meta.first_name.trim():cleanName.trim().split(/\s+/)[0])||"VATRA").slice(0,28).join("");
  const nameParts=cleanName.split(/\s+/).filter(Boolean);
  const first=(Array.from(nameParts[0]||"V")[0]||"V");
  const last=nameParts.length>1?(Array.from(nameParts[nameParts.length-1])[0]||""):"";
  const avatar=(first+last).toLocaleUpperCase(locale);
  window.VATRA_AVATAR?.setHeader({client,email:user.email,name:headerName,initials:avatar});
  window.VATRA_AVATAR?.applyRemembered($("#feed-header-avatar"),user.email);
  const {data:account}=await client.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();
  const ownId=account?.vatra_id==null?null:String(account.vatra_id);
  if(ownId){
   void window.VATRA_PRESENCE?.start(client,ownId,meta.gender);
   window.VATRA_NOTIFICATIONS?.start(client,ownId);
  }
   if(ownId)void loadHeaderPhoto(client,ownId,user.email);
  const headerId=$("#feed-header-id");
  if(headerId)headerId.textContent=ownId?"VATRA ID "+ownId:"";
  for(const link of document.querySelectorAll('a[href="profile"],a[href$="/profile"]')){
   if(ownId&&idPattern.test(ownId))link.href=root+"id"+ownId;
  }
  const form=$("#feed-search-form");
  form?.addEventListener("submit",event=>{
   event.preventDefault();
   const value=$("#feed-search-input").value.trim().slice(0,120);
   location.href=root+"feed"+(value?"?q="+encodeURIComponent(value):"");
  });
  const menu=$(".feed-account-menu");
  document.addEventListener("click",event=>{if(menu?.open&&!menu.contains(event.target))menu.open=false;});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&menu?.open)menu.open=false;});
  $("#feed-logout")?.addEventListener("click",async()=>{
   const button=$("#feed-logout");button.disabled=true;
   const {error:signOutError}=await client.auth.signOut({scope:"local"});
   if(signOutError){button.disabled=false;return;}
   try{sessionStorage.setItem("vatra-just-signed-out","1");}catch(_){}
   window.VATRA_AVATAR?.clearHeader();
   location.replace(root);
  });

  await init(client,ownId,user.id,{root,locale,t,$,idPattern,postPattern,clubURL,node,status});
  $("#community-app").hidden=false;
  $("#community-loading").hidden=true;
  document.body.dataset.authReady="true";
  document.body.dataset.feedReady="true";
   document.body.classList.remove("vatra-shell-pending");
 }catch(_){
  gateError(t("Не вдалося відкрити сторінку. Оновіть її.","Could not open this page. Please refresh."));
 }
}
let started=false;
window.VATRA_COMMUNITY_CORE=Object.freeze({start(init){
 if(started||typeof init!=="function")return;
 started=true;void start(init);
}});
})();
