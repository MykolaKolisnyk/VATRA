(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_COMMUNITY_CORE?.start(async (client,ownId,userId,{root,locale,t,$,idPattern,postPattern,clubURL,node,status})=>{
async function openDirectory(client,ownId,userId){
 document.title=t("Спільноти · VATRA","Communities · VATRA");
 const categories=[["music","Музика","Music"],["sport","Спорт","Sports"],["travel","Подорожі","Travel"],["technology","Технології","Technology"],["education","Освіта","Education"],["art","Мистецтво","Art"],["gaming","Відеоігри","Video games"],["business","Бізнес","Business"],["news","Новини та ЗМІ","News and media"],["cooking","Їжа та кулінарія","Food and cooking"],["transport","Автомобілі та транспорт","Cars and transport"],["cinema","Кіно та серіали","Movies and TV"],["animals","Тварини","Animals"],["photography","Фото та відео","Photography and video"],["regions","Міста та регіони","Cities and regions"],["fashion","Мода та стиль","Fashion and style"],["charity","Благодійність","Charity"],["science","Наука","Science"],["nature","Природа та екологія","Nature and environment"],["books","Книги та література","Books and literature"],["health","Здоров’я","Health"],["fitness","Фітнес","Fitness"],["family","Сім’я та діти","Family and children"],["home","Дім та сад","Home and garden"],["culture","Культура","Culture"],["history","Історія","History"],["humor","Гумор та меми","Humor and memes"],["shopping","Покупки","Shopping"],["finance","Фінанси","Finance"],["crafts","Хобі та рукоділля","Hobbies and crafts"],["beauty","Краса та догляд","Beauty and care"],["career","Робота та кар’єра","Jobs and careers"],["events","Події та розваги","Events and entertainment"],["psychology","Психологія","Psychology"],["politics","Політика та суспільство","Politics and society"],["military","Військова справа","Military affairs"],["spirituality","Релігія та духовність","Religion and spirituality"],["ai","Штучний інтелект","Artificial intelligence"],["social","Знайомства та спілкування","Meeting people and socializing"],["other","Інше","Other"]];
 // Built-in decorative topic artwork; keys are the permanent DB category IDs.
 const topicCovers={"music":"music","sport":"sport","travel":"travel","technology":"technology","education":"education","art":"art","gaming":"videogames","business":"business","news":"news","cooking":"food","transport":"transport","cinema":"movies","animals":"animals","photography":"photo-video","regions":"cities","fashion":"fashion","charity":"charity","science":"science"};
 const categoryNames=new Map(categories.map(([id,uk,en])=>[id,t(uk,en)]));
 const categoryLabel=id=>categoryNames.get(id)||categoryNames.get("other");
 const categoryInput=$("#community-category");
 const addCategoryOptions=(select,placeholder)=>{const first=node("option","vt-community-category-choice-001",placeholder);first.value="";select.append(first);for(const [id] of categories){const option=node("option","vt-community-category-choice-001",categoryLabel(id));option.value=id;select.append(option);}};
 addCategoryOptions(categoryInput,t("Оберіть категорію","Choose a category"));

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
  const category=categoryInput.value;
  if(!categoryNames.has(category)){status("#community-create-status",t("Оберіть категорію спільноти.","Choose a community category."),"error");categoryInput.focus();return;}
  if(Array.from(name).length<3||Array.from(name).length>80||Array.from(description).length>1200){
   status("#community-create-status",t("Назва: 3–80 символів. Опис: до 1200 символів.",
    "Name: 3–80 characters. Description: up to 1200 characters."),"error");
   return;
  }
  button.disabled=true;
  status("#community-create-status",t("Створення спільноти…","Creating community…"));
  try{

   const {data,error}=await client.from("communities").insert({name,description,category})
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
 let selectedCategory="";
 const search=$("#feed-search-input");
 if(search&&term)search.value=term;
 const queryDirectory=async(factory,keyword)=>{const run=request=>request.order("created_at",{ascending:false}).order("club_id",{ascending:false}).limit(100);if(!keyword)return run(factory());const pattern="%"+keyword.replace(/[\\%_]/g,"\\$&")+"%";const results=await Promise.all([run(factory().ilike("name",pattern)),run(factory().ilike("description",pattern))]);const failure=results.find(x=>x.error);if(failure)return failure;const unique=new Map(results.flatMap(x=>x.data||[]).map(club=>[String(club.club_id),club]));return {data:[...unique.values()].sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||""))).slice(0,100),error:null};};
 try{


  const PUBLIC_DIRECTORY_CACHE_ENABLED=true;
  let data=null;
  if(!term&&PUBLIC_DIRECTORY_CACHE_ENABLED&&client.functions?.invoke){
   try{
    const response=await client.functions.invoke("public-community-directory",{method:"GET"});
    if(!response.error&&Array.isArray(response.data?.data)&&response.data.data.every(club=>categoryNames.has(club.category)))data=response.data.data;
   }catch(_){}
  }
  if(!data){
   const result=await queryDirectory(()=>client.from("communities").select("club_id,name,description,created_at,category"),term);
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
  if(missing.length){try{const r=await client.from("communities").select("club_id,name,description,created_at,category").in("club_id",missing).limit(6);if(!r.error)for(const club of r.data||[])knownClubs.set(String(club.club_id),club);}catch(_){}}
  const input=$("#community-directory-search");
  if(input){input.value=term;input.placeholder=t("Пошук спільнот","Search communities");input.setAttribute("aria-label",input.placeholder);}
  const topics=$("#community-topics"),banner=$("#community-discovery-banner"),memberships=$("#community-memberships-preview");
  const topicGrid=node("div","ui-community-topic-grid-001");topicGrid.id="community-topic-grid";
  const topicHeader=node("div","ui-community-topic-heading-row-001"),topicActions=node("div","ui-community-topic-actions-001");
  const topicsToggle=node("button","vt-community-all-topics-001",t("Усі теми","All topics"));topicsToggle.type="button";topicsToggle.setAttribute("aria-expanded","false");topicsToggle.setAttribute("aria-controls",topicGrid.id);
  const clearTopic=node("button","vt-community-clear-topic-001",t("Скинути тему","Clear topic"));clearTopic.type="button";clearTopic.hidden=true;
  const topicHeading=node("h2","vt-community-topics-title-001",t("Пошук за темою","Find by topic"));topicHeading.id="community-topics-heading";
  topicGrid.setAttribute("role","region");topicGrid.setAttribute("aria-labelledby",topicHeading.id);
  const topicArrows=node("div","ui-community-topic-arrows-001");
  const makeArrow=(direction,label)=>{
   const control=node("button","ui-community-topic-arrow-001 ui-community-topic-arrow-"+direction+"-001");
   control.type="button";control.setAttribute("aria-label",label);control.setAttribute("aria-controls",topicGrid.id);
   const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),path=document.createElementNS(svg.namespaceURI,"path");
   svg.setAttribute("class","ui-community-topic-arrow-icon-"+direction+"-001");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");svg.setAttribute("aria-hidden","true");
   path.setAttribute("class","ui-community-topic-arrow-path-"+direction+"-001");path.setAttribute("d",direction==="left"?"m15 18-6-6 6-6":"m9 18 6-6-6-6");path.setAttribute("stroke","currentColor");path.setAttribute("stroke-width","2");path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");
   svg.append(path);control.append(svg);return control;
  };
  const previousTopic=makeArrow("left",t("Попередні теми","Previous topics")),nextTopic=makeArrow("right",t("Наступні теми","Next topics"));
  topicArrows.append(previousTopic,nextTopic);topicActions.append(clearTopic,topicArrows,topicsToggle);
  topicHeader.append(topicHeading,topicActions);
  topics.append(topicHeader,topicGrid);
  let topicsExpanded=false,collapsedScroll=0;
  const updateTopicArrows=()=>{
   const max=topicGrid.scrollWidth-topicGrid.clientWidth;
   previousTopic.disabled=topicsExpanded||topicGrid.scrollLeft<=1;
   nextTopic.disabled=topicsExpanded||max-topicGrid.scrollLeft<=1;
  };
  const scrollTopics=direction=>{
   if(topicsExpanded)return;
   const card=topicGrid.firstElementChild;if(!card)return;
   const step=card.getBoundingClientRect().width+(parseFloat(getComputedStyle(topicGrid).columnGap)||0);
   const count=Math.max(1,Math.floor(topicGrid.clientWidth/step)-1);
   topicGrid.scrollBy({left:direction*step*count,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  };
  previousTopic.addEventListener("click",()=>scrollTopics(-1));
  nextTopic.addEventListener("click",()=>scrollTopics(1));
  topicGrid.addEventListener("scroll",updateTopicArrows,{passive:true});
  window.addEventListener("resize",updateTopicArrows,{passive:true});
  if(typeof ResizeObserver==="function")new ResizeObserver(updateTopicArrows).observe(topicGrid);
  // Normal mouse wheels browse topics only while horizontal movement is possible.
  // Trackpads and touch use native scrolling; at either edge the page can scroll again.
  topicGrid.addEventListener("wheel",event=>{
   if(topicsExpanded||event.ctrlKey||event.shiftKey||Math.abs(event.deltaX)>=Math.abs(event.deltaY)||!event.deltaY)return;
   const max=topicGrid.scrollWidth-topicGrid.clientWidth;
   const scale=event.deltaMode===1?16:event.deltaMode===2?topicGrid.clientWidth:1;
   const target=Math.max(0,Math.min(max,topicGrid.scrollLeft+event.deltaY*scale));
   if(Math.abs(target-topicGrid.scrollLeft)<1)return;
   if(event.cancelable)event.preventDefault();
   topicGrid.scrollLeft=target;
  },{passive:false});
  const topicCards=new Map();
  const revealTopicCover=photo=>{
   const filename=photo.dataset.topicCover;
   if(filename)photo.style.backgroundImage="url("+JSON.stringify(root+"assets/communities-covers/"+filename+".webp")+")";
  };
  const coverObserver=typeof IntersectionObserver==="function"?new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){revealTopicCover(entry.target);coverObserver.unobserve(entry.target);}
  },{rootMargin:"180px"}):null;
  // Artwork is decorative, not a link or a native image. Keep filtering accessible.
  const suppressArtworkMenu=event=>{
   if(event.target?.closest?.(".ui-community-topic-001,.ui-community-discovery-banner-001"))event.preventDefault();
  };
  for(const surface of [topicGrid,banner])for(const name of ["contextmenu","dragstart"])surface?.addEventListener(name,suppressArtworkMenu);
  const syncTopics=()=>{
   clearTopic.hidden=!selectedCategory;
   for(const [id,tile] of topicCards)tile.setAttribute("aria-pressed",String(id===selectedCategory));
  };
  const chooseTopic=id=>{if(id&&!categoryNames.has(id))return;selectedCategory=id;term="";if(input)input.value="";syncTopics();clearTimeout(timer);void refresh();};
  clearTopic.addEventListener("click",()=>{chooseTopic("");topicsToggle.focus();});
  const showTopics=()=>{
   for(const [id] of categories){
    if(!topicCards.has(id)){
     const b=node("button","ui-community-topic-001");b.type="button";b.dataset.communityCategory=id;
     const filename=topicCovers[id];
     if(filename){
      const photo=node("span","ui-community-topic-photo-001");
      photo.setAttribute("aria-hidden","true");photo.dataset.topicCover=filename;
      b.append(photo);
     }
     b.append(node("span","vt-community-topic-name-001",categoryLabel(id)));
     b.addEventListener("click",()=>chooseTopic(selectedCategory===id?"":id));
     topicCards.set(id,b);
    }
    const tile=topicCards.get(id);
    if(tile.parentNode!==topicGrid)topicGrid.append(tile);
    const photo=tile.querySelector(".ui-community-topic-photo-001");
    if(photo&&!photo.style.backgroundImage){if(coverObserver)coverObserver.observe(photo);else revealTopicCover(photo);}
   }
   topicGrid.classList.toggle("is-expanded",topicsExpanded);
   topicArrows.hidden=topicsExpanded;
   topicsToggle.textContent=topicsExpanded?t("Згорнути","Show less"):t("Усі теми","All topics");
   topicsToggle.setAttribute("aria-expanded",String(topicsExpanded));syncTopics();updateTopicArrows();
  };
  topicsToggle.addEventListener("click",()=>{
   if(!topicsExpanded)collapsedScroll=topicGrid.scrollLeft;
   topicsExpanded=!topicsExpanded;showTopics();
   if(!topicsExpanded){topicGrid.scrollLeft=collapsedScroll;updateTopicArrows();}
  });
  showTopics();
  const renderMemberships=()=>{
   memberships.replaceChildren(node("h2","vt-community-memberships-title-001",t("Мої спільноти","My communities")));
   const ids=[...new Set([...owned,...following])];const available=ids.map(id=>knownClubs.get(id)).filter(Boolean).slice(0,6);
   for(const club of available){const item=node("a","ui-community-membership-link-001");item.href=clubURL(String(club.club_id));item.append(node("span","ui-community-membership-avatar-001",String(club.name||"V").slice(0,1).toLocaleUpperCase()),node("span","vt-community-membership-name-001",club.name));memberships.append(item);}
   if(!available.length)memberships.append(node("p","vt-community-memberships-empty-001",ids.length?t("Перегляньте свої підписки.","View your subscriptions."):t("Ваші спільноти з’являться тут.","Your communities will appear here.")));
  };
  const render=()=>{
   list.replaceChildren();banner.hidden=mode!=="all"||!!term;topics.hidden=mode!=="all"||!!term;
   syncTopics();
   $("#community-list-heading").textContent=selectedCategory?categoryLabel(selectedCategory):term?t("Результати пошуку","Search results"):mode==="followed"?t("Мої підписки","Following"):mode==="owned"?t("Керую","Managed"):t("Нові спільноти","New communities");renderMemberships();
   const query=term.toLocaleLowerCase();
   const visible=directory.filter(club=>(!selectedCategory||club.category===selectedCategory)&&(mode==="all"||(mode==="followed"?following:owned).has(String(club.club_id)))&&(!query||String(club.name||"").toLocaleLowerCase().includes(query)||String(club.description||"").toLocaleLowerCase().includes(query)));
   for(const club of visible){
   const number=String(club.club_id);
   if(!idPattern.test(number))continue;
   const card=node("article","ui-community-card-001");
   const head=node("div","ui-community-card-head-001");
   const nameLink=node("a","vt-community-card-name-001",club.name);nameLink.href=clubURL(number);head.append(nameLink);
   const mark=node("span","ui-community-card-avatar-001",String(club.name||"V").trim().slice(0,1).toLocaleUpperCase());
   const detail=node("div","ui-community-card-detail-001");detail.append(head,node("span","vt-community-card-category-001",categoryLabel(club.category)),node("p","vt-community-card-description-001",club.description||t("Без опису","No description")));
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
    const heading=selectedCategory?t("У цій категорії ще немає спільнот","No communities in this category yet"):term?t("Нічого не знайдено","No matches"):mode==="followed"?t("Ви ще не підписані на спільноти","You have not joined any communities"):mode==="owned"?t("У вас ще немає спільнот","You have no communities"):t("Тут починаються спільноти","Communities start here");
    const copy=selectedCategory?t("Оберіть іншу тему або створіть власну спільноту.","Choose another topic or create your own community."):term?t("За цим запитом спільнот не знайдено.","No communities match this search."):mode==="followed"?t("Знайдіть цікаві спільноти та приєднуйтеся до них.","Find communities you like and join them."):mode==="all"?t("Спільнот поки немає. Створіть першу!","No communities yet. Create the first one!"):t("Створіть місце для однодумців, друзів або свого проєкту.","Create a space for like-minded people, friends, or your project.");
    const call=node("button","community-create-toggle vt-community-directory-empty-action-001",selectedCategory?t("Усі теми","All topics"):term?t("Очистити пошук","Clear search"):mode==="followed"?t("Усі спільноти","All communities"):t("Створити спільноту","Create community"));
    call.type="button";call.addEventListener("click",()=>{if(selectedCategory){chooseTopic("");}else if(term){term="";if(input)input.value="";void refresh();}else if(mode==="followed"){filters.find(tab=>tab.dataset.communityFilter==="all")?.click();}else if(panel?.hidden)toggle?.click();else $("#community-name")?.focus();});
    box.append(icon,node("h3","vt-community-directory-empty-title-001",heading),node("p","vt-community-directory-empty-copy-001",copy),call);list.append(box);
   }
  };
  let revision=0,timer=null;
  const refresh=async()=>{
   const ticket=++revision;list.setAttribute("aria-busy","true");
   if(filterError&&mode!=="all"){list.setAttribute("aria-busy","false");render();return;}
   try{
    if(mode==="followed"&&!following.size){directory=[];render();return;}
    const result=await queryDirectory(()=>{let request=client.from("communities").select("club_id,name,description,created_at,category");if(selectedCategory)request=request.eq("category",selectedCategory);if(mode==="owned")request=request.eq("owner_id",userId);if(mode==="followed")request=request.in("club_id",[...following]);return request;},term);
    if(ticket!==revision)return;if(result.error)throw result.error;directory=result.data||[];for(const club of directory)knownClubs.set(String(club.club_id),club);render();
   }catch(_){if(ticket===revision)status("#community-list-status",t("Не вдалося завантажити список спільнот.","Could not load communities."),"error");}
   finally{if(ticket===revision)list.setAttribute("aria-busy","false");}
  };
  for(const filter of filters)filter.addEventListener("click",()=>{selectedCategory="";mode=filter.dataset.communityFilter;for(const tab of filters){const on=tab===filter;tab.classList.toggle("is-active",on);tab.setAttribute("aria-pressed",String(on));}clearTimeout(timer);void refresh();});
  input?.addEventListener("input",()=>{selectedCategory="";term=input.value.trim().slice(0,120);revision++;clearTimeout(timer);timer=setTimeout(refresh,250);});
  render();
 }catch(_){
  status("#community-list-status",t("Не вдалося завантажити список спільнот.",
   "Could not load communities."),"error");
 }finally{list.setAttribute("aria-busy","false");}
}
await openDirectory(client,ownId,userId);
});
})();
