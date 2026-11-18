
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://rjasunoawrxvetwadylh.supabase.co";
const PUBLIC_KEY="sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-";
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
  if(url.protocol!=="https:"||url.hostname!=="rjasunoawrxvetwadylh.supabase.co")return;
  const target=$("#feed-header-avatar");
  if(target){target.style.backgroundImage="url("+JSON.stringify(image)+")";
   target.classList.add("has-photo");target.textContent="";}
 }catch(_){}
}
async function start(){
 await window.VATRA_LANGUAGE?.ready;
 const mode=document.body.dataset.page;
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
  window.VATRA_AVATAR?.setHeader({email:user.email,name:headerName,initials:avatar});
  window.VATRA_AVATAR?.applyRemembered($("#feed-header-avatar"),user.email);
  const {data:account}=await client.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();
  const ownId=account?.vatra_id==null?null:String(account.vatra_id);
  if(ownId){
   void window.VATRA_PRESENCE?.start(client,ownId,meta.gender);
   window.VATRA_NOTIFICATIONS?.start(client,ownId);
  }
   if(ownId)void loadHeaderPhoto(client,ownId,user.email);
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
   window.VATRA_AVATAR?.clearHeader();
   location.replace(root);
  });

  if(mode==="club")await openClub(client,ownId,user.id);
  else await openDirectory(client,ownId,user.id);
  $("#community-app").hidden=false;
  $("#community-loading").hidden=true;
  document.body.dataset.authReady="true";
  document.body.dataset.feedReady="true";
   document.body.classList.remove("vatra-shell-pending");
 }catch(_){
  gateError(t("Не вдалося відкрити сторінку. Оновіть її.","Could not open this page. Please refresh."));
 }
}
async function openDirectory(client,ownId,userId){
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

   const {data,error}=await client.from("communities").insert({name,description})
    .select("club_id").single();
   if(error||!data?.club_id)throw error||new Error("missing club ID");
   const number=String(data.club_id);
   if(!idPattern.test(number))throw new Error("unexpected club ID");
   if(!window.VATRA_NAVIGATE?.to(clubURL(number)))location.assign(clubURL(number));
  }catch(_){
   status("#community-create-status",t("Не вдалося створити спільноту. Повторіть спробу.",
    "Could not create the community. Please retry."),"error");
   button.disabled=false;
  }
 });
 const list=$("#community-list");
 let term=(new URLSearchParams(location.search).get("q")||"").trim().slice(0,120);
 const search=$("#feed-search-input");
 if(search&&term)search.value=term;
 const queryDirectory=async(factory,keyword)=>{const run=request=>request.order("created_at",{ascending:false}).order("club_id",{ascending:false}).limit(100);if(!keyword)return run(factory());const pattern="%"+keyword.replace(/[\\%_]/g,"\\$&")+"%";const results=await Promise.all([run(factory().ilike("name",pattern)),run(factory().ilike("description",pattern))]);const failure=results.find(x=>x.error);if(failure)return failure;const unique=new Map(results.flatMap(x=>x.data||[]).map(club=>[String(club.club_id),club]));return {data:[...unique.values()].sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||""))).slice(0,100),error:null};};
 try{


  const PUBLIC_DIRECTORY_CACHE_ENABLED=true;
  let data=null;
  if(!term&&PUBLIC_DIRECTORY_CACHE_ENABLED&&client.functions?.invoke){
   try{
    const response=await client.functions.invoke("public-community-directory",{method:"GET"});
    if(!response.error&&Array.isArray(response.data?.data))data=response.data.data;
   }catch(_){}
  }
  if(!data){
   const result=await queryDirectory(()=>client.from("communities").select("club_id,name,description,created_at"),term);
   if(result.error)throw result.error;
   data=result.data||[];
  }
  let directory=(data||[]);const knownClubs=new Map(directory.map(club=>[String(club.club_id),club]));const filters=[...document.querySelectorAll("[data-community-filter]")];
  let mode="all",following=new Set(),owned=new Set(),filterError=false;
  const results=await Promise.allSettled([
   ownId?client.from("community_follows").select("club_id").eq("member_vatra_id",ownId):Promise.resolve({data:[]}),
   client.from("communities").select("club_id").eq("owner_id",userId)
  ]);
  if(results[0].status==="fulfilled"&&!results[0].value.error)following=new Set((results[0].value.data||[]).map(x=>String(x.club_id)));else filterError=true;
  if(results[1].status==="fulfilled"&&!results[1].value.error)owned=new Set((results[1].value.data||[]).map(x=>String(x.club_id)));else filterError=true;
  const missing=[...new Set([...owned,...following])].filter(id=>!knownClubs.has(id)).slice(0,6);
  if(missing.length){try{const r=await client.from("communities").select("club_id,name,description,created_at").in("club_id",missing).limit(6);if(!r.error)for(const club of r.data||[])knownClubs.set(String(club.club_id),club);}catch(_){}}
  const input=$("#community-directory-search");
  if(input){input.value=term;input.placeholder=t("Пошук спільнот","Search communities");input.setAttribute("aria-label",input.placeholder);}
  const topics=$("#community-topics"),banner=$("#community-discovery-banner"),memberships=$("#community-memberships-preview");
  const topicGrid=node("div","ui-community-topic-grid-001");
  topics.append(node("h2","vt-community-topics-title-001",t("Пошук за темою","Find by topic")),topicGrid);
  for(const [uk,en,path] of [["Музика","Music","M9 18V5l12-3v13M9 18a3 2 0 1 1-6 0 3 2 0 0 1 6 0M21 15a3 2 0 1 1-6 0 3 2 0 0 1 6 0"],["Спорт","Sports","M5 20 19 4M4 5l15 15M4 12h16"],["Подорожі","Travel","M3 19 10 5l5 10 3-5 4 9z"],["Технології","Technology","M3 4h18v13H3zM8 21h8M12 17v4"],["Освіта","Education","m2 9 10-5 10 5-10 5zM6 11v7l6 3 6-3v-7"],["Мистецтво","Art","M12 3a9 9 0 1 0 0 18c3 0 0-5 4-5h2a5 5 0 0 0 3-4 9 9 0 0 0-9-9zM7 10h.1M11 7h.1M16 8h.1"]]){
   const b=node("button","ui-community-topic-001");b.type="button";
   const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),p=document.createElementNS("http://www.w3.org/2000/svg","path");
   svg.setAttribute("class","ui-community-topic-icon-001");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.7");svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");svg.setAttribute("aria-hidden","true");p.setAttribute("class","ui-community-topic-path-001");p.setAttribute("d",path);svg.append(p);
   b.append(svg,node("span","vt-community-topic-name-001",t(uk,en)));
   b.addEventListener("click",()=>{term=t(uk,en);input.value=term;filters.find(tab=>tab.dataset.communityFilter==="all")?.click();});topicGrid.append(b);
  }
  const renderMemberships=()=>{
   memberships.replaceChildren(node("h2","vt-community-memberships-title-001",t("Мої спільноти","My communities")));
   const ids=[...new Set([...owned,...following])];const available=ids.map(id=>knownClubs.get(id)).filter(Boolean).slice(0,6);
   for(const club of available){const item=node("a","ui-community-membership-link-001");item.href=clubURL(String(club.club_id));item.append(node("span","ui-community-membership-avatar-001",String(club.name||"V").slice(0,1).toLocaleUpperCase()),node("span","vt-community-membership-name-001",club.name));memberships.append(item);}
   if(!available.length)memberships.append(node("p","vt-community-memberships-empty-001",ids.length?t("Перегляньте свої підписки.","View your subscriptions."):t("Ваші спільноти з’являться тут.","Your communities will appear here.")));
  };
  const render=()=>{
   list.replaceChildren();banner.hidden=mode!=="all"||!!term;topics.hidden=mode!=="all"||!!term;
   $("#community-list-heading").textContent=term?t("Результати пошуку","Search results"):mode==="followed"?t("Мої підписки","Following"):mode==="owned"?t("Керую","Managed"):t("Нові спільноти","New communities");renderMemberships();
   const query=term.toLocaleLowerCase();
   const visible=directory.filter(club=>(mode==="all"||(mode==="followed"?following:owned).has(String(club.club_id)))&&(!query||String(club.name||"").toLocaleLowerCase().includes(query)||String(club.description||"").toLocaleLowerCase().includes(query)));
   for(const club of visible){
   const number=String(club.club_id);
   if(!idPattern.test(number))continue;
   const card=node("article","ui-community-card-001");
   const head=node("div","ui-community-card-head-001");
   const nameLink=node("a","vt-community-card-name-001",club.name);nameLink.href=clubURL(number);head.append(nameLink);
   const mark=node("span","ui-community-card-avatar-001",String(club.name||"V").trim().slice(0,1).toLocaleUpperCase());
   const detail=node("div","ui-community-card-detail-001");detail.append(head,node("p","vt-community-card-description-001",club.description||t("Без опису","No description")));
   const cover=node("a","ui-community-card-cover-001");cover.href=clubURL(number);cover.setAttribute("aria-label",club.name);cover.append(mark);
   const foot=node("div","ui-community-card-actions-001"),open=node("a","vt-community-card-open-001",t("Переглянути","View"));open.href=clubURL(number);foot.append(open);
   if(ownId&&!owned.has(number)&&!filterError){
    const join=node("button","vt-community-card-join-001",following.has(number)?t("Відписатися","Unfollow"):t("Приєднатися","Join"));join.type="button";join.setAttribute("aria-pressed",String(following.has(number)));
    join.addEventListener("click",async()=>{join.disabled=true;try{const result=following.has(number)?await client.from("community_follows").delete().eq("club_id",number).eq("member_vatra_id",ownId):await client.from("community_follows").insert({club_id:number,member_vatra_id:ownId});if(result.error)throw result.error;if(following.has(number))following.delete(number);else following.add(number);render();}catch(_){status("#community-list-status",t("Не вдалося змінити підписку.","Could not update subscription."),"error");}finally{join.disabled=false;}});foot.append(join);
   }
   detail.append(foot);card.append(cover,detail);list.append(card);
  }
   const error=mode!=="all"&&filterError;
   status("#community-list-status",error?t("Не вдалося перевірити всі підписки.","Could not verify all memberships."):"",error?"error":"");
   $("#community-list-status").hidden=!error;
   if(!visible.length&&!error){
    const box=node("div","ui-community-directory-empty-001");
    const icon=node("span","ui-community-directory-empty-icon-001");icon.setAttribute("aria-hidden","true");
    const heading=term?t("Нічого не знайдено","No matches"):mode==="followed"?t("Ви ще не підписані на спільноти","You have not joined any communities"):mode==="owned"?t("У вас ще немає спільнот","You have no communities"):t("Тут починаються спільноти","Communities start here");
    const copy=term?t("Спробуйте інший пошуковий запит.","Try another search."):mode==="followed"?t("Знайдіть цікаві спільноти та приєднуйтеся до них.","Find communities you like and join them."):t("Створіть місце для однодумців, друзів або свого проєкту.","Create a space for like-minded people, friends, or your project.");
    const call=node("button","community-create-toggle vt-community-directory-empty-action-001",term?t("Очистити пошук","Clear search"):mode==="followed"?t("Усі спільноти","All communities"):t("Створити спільноту","Create community"));
    call.type="button";call.addEventListener("click",()=>{if(term){term="";if(input)input.value="";void refresh();}else if(mode==="followed"){filters.find(tab=>tab.dataset.communityFilter==="all")?.click();}else if(panel?.hidden)toggle?.click();else $("#community-name")?.focus();});
    box.append(icon,node("h3","vt-community-directory-empty-title-001",heading),node("p","vt-community-directory-empty-copy-001",copy),call);list.append(box);
   }
  };
  let revision=0,timer=null;
  const refresh=async()=>{
   const ticket=++revision;list.setAttribute("aria-busy","true");
   if(filterError&&mode!=="all"){list.setAttribute("aria-busy","false");render();return;}
   try{
    if(mode==="followed"&&!following.size){directory=[];render();return;}
    const result=await queryDirectory(()=>{let request=client.from("communities").select("club_id,name,description,created_at");if(mode==="owned")request=request.eq("owner_id",userId);if(mode==="followed")request=request.in("club_id",[...following]);return request;},term);
    if(ticket!==revision)return;if(result.error)throw result.error;directory=result.data||[];for(const club of directory)knownClubs.set(String(club.club_id),club);render();
   }catch(_){if(ticket===revision)status("#community-list-status",t("Не вдалося завантажити список спільнот.","Could not load communities."),"error");}
   finally{if(ticket===revision)list.setAttribute("aria-busy","false");}
  };
  for(const filter of filters)filter.addEventListener("click",()=>{mode=filter.dataset.communityFilter;for(const tab of filters){const on=tab===filter;tab.classList.toggle("is-active",on);tab.setAttribute("aria-pressed",String(on));}clearTimeout(timer);void refresh();});
  input?.addEventListener("input",()=>{term=input.value.trim().slice(0,120);revision++;clearTimeout(timer);timer=setTimeout(refresh,250);});
  render();
 }catch(_){
  status("#community-list-status",t("Не вдалося завантажити список спільнот.",
   "Could not load communities."),"error");
 }finally{list.setAttribute("aria-busy","false");}
}

async function setupClubSocial(client,clubId,ownId,userId){
 const follow=$("#club-follow"),compose=$("#club-compose-open"),list=$("#club-posts");
 const empty=$("#club-posts-empty"),more=$("#club-posts-more"),dialog=$("#club-compose-dialog");
 const form=$("#club-compose-form"),input=$("#club-compose-text"),status=$("#club-compose-error");
 if(!follow||!compose||!list||!ownId||!idPattern.test(ownId))return;
 let isFollowing=false,busy=false,focusRequestedPost=true,postsLoading=false,postsOffset=0,refreshQueued=false;
 const renderedPostIds=new Set();
 const CLUB_PAGE_SIZE=12;
 const show=(el,text)=>{el.textContent=text;el.hidden=!text;};
 const picker=window.VATRA_POST_MEDIA?.bindGalleryPicker({
  input:"#club-compose-media",choose:"#club-compose-media-choose",
  clear:"#club-compose-media-remove",preview:"#club-compose-media-preview",
  onError:text=>show(status,text)
 });
 const refreshFollowing=async()=>{
  const {data,error}=await client.from("community_follows")
   .select("club_id").eq("club_id",clubId).eq("member_vatra_id",ownId).maybeSingle();
  if(error)throw error;
  isFollowing=!!data;
  follow.textContent=isFollowing?t("Відписатися","Unfollow"):t("Підписатися","Follow");
  compose.hidden=!isFollowing;
 };
 const loadClubPosts=async(append=false)=>{
  if(postsLoading){if(!append)refreshQueued=true;return;}
  postsLoading=true;
  if(!append){postsOffset=0;renderedPostIds.clear();list.replaceChildren();empty.hidden=true;}
  if(more){more.disabled=true;if(!append)more.hidden=true;}
  try{
   const {data,error}=await client.from("community_posts")
    .select("id,author_vatra_id,body,created_at,media_kind,media_path,media_items")
    .eq("club_id",clubId).order("created_at",{ascending:false})
    .order("id",{ascending:false}).range(postsOffset,postsOffset+CLUB_PAGE_SIZE-1);
   if(error)throw error;
   const fetched=data||[],rows=[...fetched];
   postsOffset+=fetched.length;
   if(more)more.hidden=fetched.length<CLUB_PAGE_SIZE;

   const linkedId=new URLSearchParams(location.search).get("post");
   if(!append&&focusRequestedPost&&postPattern.test(linkedId||"")&&!rows.some(post=>post.id===linkedId)){
    const direct=await client.from("community_posts")
     .select("id,author_vatra_id,body,created_at,media_kind,media_path,media_items")
     .eq("club_id",clubId).eq("id",linkedId).maybeSingle();
    if(!direct.error&&direct.data)rows.unshift(direct.data);
   }
   const engagementPromise=window.VATRA_POST_INTERACTIONS?.prefetchEngagement(
    client,rows.map(post=>({...post,kind:"group"})))||Promise.resolve(new Map());
   const names=new Map();
   const ids=[...new Set(rows.map(p=>String(p.author_vatra_id)))];
   if(ids.length){
    try{
     const {data:people}=await (window.VATRA_PUBLIC_NAMES?.get(client,ids)||
      client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",ids));
     for(const member of people||[])names.set(String(member.vatra_id),member.display_name);
    }catch(_){}
   }
   const engagement=await engagementPromise;
   const batch=document.createDocumentFragment();
   for(const post of rows){
    if(renderedPostIds.has(post.id))continue;
    renderedPostIds.add(post.id);
    const id=String(post.author_vatra_id);
    const article=node("article","feed-post-card ui-club-post-card-001");
    article.dataset.postId=post.id;
    const head=node("div","feed-post-header ui-club-post-head-001");
    const profile=node("a","feed-post-name vt-club-post-author-001",
     names.get(id)||t("Учасник VATRA","VATRA member"));
    profile.href=root+"id"+id;
    if(names.has(id))void window.VATRA_VERIFIED?.attach(client,profile,id);
    const time=node("time","feed-post-date vt-club-post-date-001",new Intl.DateTimeFormat(locale,{
     day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
    }).format(new Date(post.created_at)));
    time.dateTime=post.created_at;
    const meta=node("div","feed-post-meta-row ui-club-post-meta-row-001");
    meta.append(time);window.VATRA_POST_INTERACTIONS?.appendAudience(meta,null,true);
    head.append(profile,meta);
    article.append(head);
   if(post.body){
     const body=node("p","feed-post-body vt-club-post-body-001",post.body);
     window.VATRA_POST_MEDIA?.linkifyHashtags(body);
     article.append(body);
    }
   if(post.media_items?.length||(post.media_kind&&post.media_path))void window.VATRA_POST_MEDIA?.mount(client,post,article);
    window.VATRA_POST_INTERACTIONS?.mount(client,{...post,kind:"group",club_id:clubId},article,{
     ownId,userId,engagement:engagement.get("group:"+post.id),
     onShared:()=>void loadClubPosts()
    });
    batch.append(article);
   }
   list.append(batch);
   if(focusRequestedPost){
    focusRequestedPost=false;
    const target=postPattern.test(linkedId||"")?
     [...list.querySelectorAll("[data-post-id]")].find(el=>el.dataset.postId===linkedId):null;
    if(target){
     target.classList.add("is-linked-post");
     requestAnimationFrame(()=>target.scrollIntoView({block:"center",behavior:"smooth"}));
    }
   }
   if(!list.querySelector(".feed-post-card"))show(empty,isFollowing?
    t("У спільноті ще немає дописів. Створіть перший!","No community posts yet. Start the conversation!"):
    t("Підпишіться на спільноту, щоб читати її дописи.","Follow to read community posts."));
  }catch(_){show(empty,t("Не вдалося завантажити публікації.","Could not load community posts."));}
  finally{
   postsLoading=false;if(more)more.disabled=false;
   if(refreshQueued){refreshQueued=false;void loadClubPosts(false);}
  }
 };
 if(more){
  more.addEventListener("click",()=>void loadClubPosts(true));
  if(typeof IntersectionObserver==="function"){
   const pager=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)&&!more.hidden&&!postsLoading)
     void loadClubPosts(true);
   },{rootMargin:"400px 0px"});
   pager.observe(more);
  }
 }
 follow.hidden=false;
 try{await refreshFollowing();}catch(_){show(empty,t("Не вдалося перевірити підписку.","Could not check your subscription."));follow.disabled=true;}
 follow.addEventListener("click",async()=>{
  if(busy)return;
  busy=true;follow.disabled=true;
  try{
   const {error}=isFollowing?
    await client.from("community_follows").delete().eq("club_id",clubId).eq("member_vatra_id",ownId):
    await client.from("community_follows").insert({club_id:clubId,member_vatra_id:ownId});
   if(error)throw error;
   await refreshFollowing();
   await loadClubPosts();
  }catch(_){show(empty,t("Не вдалося змінити підписку.","Could not update subscription."));}
  finally{follow.disabled=false;busy=false;}
 });
 compose.addEventListener("click",()=>{
  status.hidden=true;dialog.showModal();input.focus();
 });
 $("#club-compose-cancel").addEventListener("click",()=>dialog.close());
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  const body=input.value.trim(),files=picker?.getFiles()||[],save=$("#club-compose-save");
  if(!isFollowing||save.disabled)return;
  if((!body&&!files.length)||Array.from(body).length>2000){
   show(status,t("Додайте текст, фото або відео (до 2000 символів).",
    "Add text, a photo or a video (up to 2000 characters)."));return;
  }
  save.disabled=true;status.hidden=true;
  let uploaded=null;
  try{
   if(files.length)uploaded=await window.VATRA_POST_MEDIA.uploadGallery(client,ownId,files);
   const {error}=await client.from("community_posts").insert({
    club_id:clubId,author_vatra_id:ownId,body,media_items:uploaded||[]
   });
   if(error)throw error;
   input.value="";picker?.reset();dialog.close();
   await loadClubPosts();
  }catch(error){
   if(uploaded)try{await window.VATRA_POST_MEDIA.removeGallery(client,uploaded);}catch(_){}
   show(status,error?.message||t("Не вдалося опублікувати допис.","Could not publish community post."));
  }finally{save.disabled=false;}
 });
 await loadClubPosts();
}

async function fetchPublicClub(client,number){


 const numeric=Number(number);
 if(Number.isSafeInteger(numeric)&&numeric>0&&client.functions?.invoke){
  try{
   const response=await client.functions.invoke("public-community-directory",{
    body:{club_id:numeric}
   });
   if(!response.error&&response.data&&
      Object.prototype.hasOwnProperty.call(response.data,"data")){
    const row=response.data.data;
    if(row===null)return {data:null,error:null};
    if(row&&typeof row==="object"&&Number(row.club_id)===numeric&&
       typeof row.name==="string"&&row.name.length<=80&&
       (row.description===null||typeof row.description==="string")&&
       typeof row.created_at==="string")
     return {data:row,error:null};
   }
  }catch(_){}
 }
 return client.from("communities")
  .select("club_id,name,description,created_at").eq("club_id",number).maybeSingle();
}

async function openClub(client,ownId,userId){
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
 const {data,error}=await fetchPublicClub(client,number);
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
 await setupClubSocial(client,String(data.club_id),ownId,userId);
 const linkedId=query.get("post");
 const suffix=postPattern.test(linkedId||"")?"?post="+encodeURIComponent(linkedId):"";
 const canonical=clubURL(String(data.club_id))+suffix;
 if(location.pathname!==new URL(canonical).pathname||location.search!==suffix||location.hash){
  history.replaceState(history.state,"",canonical);
 }
}
void start();
})();