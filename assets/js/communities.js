(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_COMMUNITY_CORE?.start(async (client,ownId,userId,{root,locale,t,$,idPattern,postPattern,clubURL,node,status})=>{
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
    const copy=term?t("За цим запитом спільнот не знайдено.","No communities match this search."):mode==="followed"?t("Знайдіть цікаві спільноти та приєднуйтеся до них.","Find communities you like and join them."):mode==="all"?t("Спільнот поки немає. Створіть першу!","No communities yet. Create the first one!"):t("Створіть місце для однодумців, друзів або свого проєкту.","Create a space for like-minded people, friends, or your project.");
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
await openDirectory(client,ownId,userId);
});
})();
