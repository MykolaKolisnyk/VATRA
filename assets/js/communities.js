/* VATRA community directory and immutable numeric club URLs. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://rjasunoawrxvetwadylh.supabase.co";
const PUBLIC_KEY="sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-";
const root=new URL("../../",document.currentScript.src).href;
const english=document.documentElement.lang==="en";
const t=(uk,en)=>english?en:uk;
const $=selector=>document.querySelector(selector);
const idPattern=/^[1-9][0-9]{0,18}$/;
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
async function start(){
 await window.VATRA_LANGUAGE?.ready;
 const mode=document.body.dataset.page;
 for(const element of document.querySelectorAll("[data-community-uk]")){
  element.textContent=english?element.dataset.communityEn:element.dataset.communityUk;
 }
 for(const element of document.querySelectorAll("[data-social-uk]")){
  element.textContent=english?element.dataset.socialEn:element.dataset.socialUk;
 }
 const brand=document.querySelector(".feed-header-brand");
 if(brand)brand.setAttribute("aria-label",english?"VATRA — Feed":"VATRA — Стрічка");
 for(const input of document.querySelectorAll("[data-shell-placeholder-uk]")){
    input.placeholder=english?input.dataset.shellPlaceholderEn:input.dataset.shellPlaceholderUk;
   }
   for(const control of document.querySelectorAll("[data-shell-aria-uk]")){
    const title=english?control.dataset.shellAriaEn:control.dataset.shellAriaUk;
    control.setAttribute("aria-label",title);
    control.title=title;
   }
   for(const pair of [
    [".ui-shell-header-notifications-001","Сповіщення — незабаром","Notifications — coming soon"],
    [".ui-shell-header-music-001","Музика — незабаром","Music — coming soon"]]){
    const control=document.querySelector(pair[0]);
    if(control){
     const title=english?pair[2]:pair[1];
     control.setAttribute("aria-label",title);
     control.title=title;
    }
   }
   for(const link of document.querySelectorAll(".social-top-link")){
  const label=link.querySelector("[data-social-uk]");
  if(label){
   const pending=link.matches("button:disabled");
   const detail=pending?(english?" — coming soon":" — у розробці"):"";
   link.setAttribute("aria-label",label.textContent+detail);
   link.title=pending?(english?"Coming soon":"У розробці"):label.textContent;
  }
 }
 if(english){
  const name=$("#community-name"),description=$("#community-description");
  if(name)name.placeholder="For example, Ukrainian music";
  if(description)description.placeholder="What is your community about?";
 }
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
   location.replace(root);return;
  }
  const user=data.user,meta=user.user_metadata||{};
  const ownName=[meta.first_name,meta.last_name].filter(x=>typeof x==="string"&&x.trim())
    .map(x=>x.trim()).join(" ")||String(meta.full_name||"").trim()||
    t("Учасник VATRA","VATRA member");
  const cleanName=Array.from(ownName).slice(0,100).join("");
  $("#feed-menu-name").textContent=cleanName;
  const nameParts=cleanName.split(/\s+/).filter(Boolean);
  const first=(Array.from(nameParts[0]||"V")[0]||"V");
  const last=nameParts.length>1?(Array.from(nameParts[nameParts.length-1])[0]||""):"";
  const avatar=(first+last).toLocaleUpperCase(english?"en-US":"uk-UA");
  $("#feed-header-avatar").textContent=avatar;
  const sidebarName=$("#feed-sidebar-person-name"),sidebarAvatar=$("#feed-sidebar-person-avatar");
  if(sidebarName)sidebarName.textContent=cleanName;
  if(sidebarAvatar)sidebarAvatar.textContent=avatar;
  const {data:account}=await client.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();
  const ownId=account?.vatra_id==null?null:String(account.vatra_id);
  $("#feed-header-id").textContent=ownId?"VATRA ID "+ownId:"";
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
   location.replace(root);
  });
  // Show the ready page only after its first list or community data request.
  if(mode==="club")await openClub(client);
  else await openDirectory(client);
  $("#community-app").hidden=false;
  $("#community-loading").hidden=true;
  document.body.dataset.authReady="true";
  document.body.dataset.feedReady="true";
 }catch(_){
  gateError(t("Не вдалося відкрити сторінку. Оновіть її.","Could not open this page. Please refresh."));
 }
}
async function openDirectory(client){
 document.title=t("Спільноти · VATRA","Communities · VATRA");
 const form=$("#community-create-form"),button=$("#community-create-submit");
 const panel=$("#community-create-panel"),toggle=$("#community-create-toggle");
 toggle?.addEventListener("click",()=>{
  if(!panel)return;
  const opening=panel.hidden;
  panel.hidden=!opening;
  toggle.setAttribute("aria-expanded",String(opening));
  if(opening)$("#community-name")?.focus();
  else toggle.focus();
 });
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(button.disabled)return;
  const name=$("#community-name").value.trim();
  const description=$("#community-description").value.trim();
  if(Array.from(name).length<3||Array.from(name).length>80||Array.from(description).length>1200){
   status("#community-create-status",t("Назва: 3–80 символів. Опис: до 1200 символів.",
    "Name: 3–80 characters. Description: up to 1200 characters."),"error");
   return;
  }
  button.disabled=true;
  status("#community-create-status",t("Створення спільноти…","Creating community…"));
  try{
   // PostgreSQL GENERATED ALWAYS AS IDENTITY assigns the ID; the browser never picks it.
   const {data,error}=await client.from("communities").insert({name,description})
    .select("club_id").single();
   if(error||!data?.club_id)throw error||new Error("missing club ID");
   const number=String(data.club_id);
   if(!idPattern.test(number))throw new Error("unexpected club ID");
   location.assign(clubURL(number));
  }catch(_){
   status("#community-create-status",t("Не вдалося створити спільноту. Повторіть спробу.",
    "Could not create the community. Please retry."),"error");
   button.disabled=false;
  }
 });
 const list=$("#community-list");
 try{
  const {data,error}=await client.from("communities")
   .select("club_id,name,description,created_at")
   .order("created_at",{ascending:false}).order("club_id",{ascending:false}).limit(100);
  if(error)throw error;
  list.replaceChildren();
  for(const club of data||[]){
   const number=String(club.club_id);
   if(!idPattern.test(number))continue;
   const card=node("a","ui-community-card-001");
   card.href=clubURL(number);
   const head=node("div","ui-community-card-head-001");
   head.append(node("strong","vt-community-card-name-001",club.name),
    node("span","vt-community-card-id-001","Club ID "+number));
   card.append(head,node("p","vt-community-card-description-001",
    club.description||t("Без опису","No description")));
   list.append(card);
  }
  status("#community-list-status",(data||[]).length===0?
   t("Спільнот поки немає. Створіть першу!","No communities yet. Create the first one!"):"");
 }catch(_){
  status("#community-list-status",t("Не вдалося завантажити список спільнот.",
   "Could not load communities."),"error");
 }finally{list.setAttribute("aria-busy","false");}
}
async function openClub(client){
 const query=new URLSearchParams(location.search);
 const number=query.get("club_id")||location.pathname.match(/\/club([1-9][0-9]{0,18})$/)?.[1]||"";
 const displayError=()=>{
  $("#club-heading").textContent=t("Спільноту не знайдено","Community not found");
  $("#club-public-id").textContent="";
  $("#club-description").textContent=t("Ця спільнота не існує або її видалено.",
   "This community does not exist or was deleted.");
  document.title=t("Спільноту не знайдено · VATRA","Community not found · VATRA");
 };
 if(!idPattern.test(number)){displayError();return;}
 const {data,error}=await client.from("communities")
  .select("club_id,name,description,created_at").eq("club_id",number).maybeSingle();
 if(error){
  status("#club-status",t("Не вдалося завантажити спільноту.","Could not load the community."),"error");
  return;
 }
 if(!data){displayError();return;}
 $("#club-heading").textContent=data.name;
 $("#club-public-id").textContent="Club ID "+String(data.club_id);
 $("#club-description").textContent=data.description||
  t("Опису поки немає.","No description yet.");
 document.title=data.name+" · VATRA";
 const canonical=clubURL(String(data.club_id));
 if(location.pathname!==new URL(canonical).pathname||location.search||location.hash){
  history.replaceState(history.state,"",canonical);
 }
}
void start();
})();