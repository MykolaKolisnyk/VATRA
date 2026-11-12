/* VATRA member profile.
 * Personal information, detailed view and editor are initialized first;
 * the profile page then boots with shared VATRA utilities.
 * Keep these feature sections in this one page-owned module.
 */

/* ==================== PERSONAL INFORMATION + EDITOR ==================== */
/* VATRA editable personal information. Supabase RLS, not DOM filtering, is authoritative. */
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const tr=(uk,en)=>document.documentElement.lang==="en"?en:uk;
 const select=selector=>document.querySelector(selector);
 const groups=[
  {id:"profile",label:["Профіль","Profile"],icon:"user-round",fields:[
   ["short_bio","Коротка інформація","Short bio","long"],
   ["relationship","Сімейний стан","Relationship status"],
   ["hometown","Рідне місто","Hometown"],
   ["languages","Знання мов","Languages"],
   ["family","Родина","Family","long"]
  ]},
  {id:"contacts",label:["Контакти","Contacts"],icon:"at-sign",fields:[
   ["city","Місто","City"],["address","Адреса","Address"],
   ["mobile_phone","Мобільний телефон","Mobile phone"],
   ["additional_phone","Додатковий телефон","Additional phone"],
   ["website","Особистий сайт","Personal website"]
  ]},
  {id:"interests",label:["Захоплення","Interests"],icon:"heart",fields:[
   ["activities","Діяльність","Activities","long"],
   ["hobbies","Захоплення","Hobbies","long"],
   ["favorite_music","Улюблена музика","Favorite music","long"],
   ["favorite_movies","Улюблені фільми","Favorite movies","long"],
   ["favorite_tv","Улюблені телешоу","Favorite TV shows","long"],
   ["favorite_books","Улюблені книги","Favorite books","long"],
   ["favorite_games","Улюблені ігри","Favorite games","long"],
   ["favorite_quotes","Улюблені цитати","Favorite quotes","long"],
   ["about_me","Про себе","About me","long"]
  ]},
  {id:"education",label:["Освіта","Education"],icon:"graduation-cap",fields:[
   ["school","Школа або ліцей","School"],
   ["university","Університет","University"],
   ["education_extra","Додаткова освіта","Additional education","long"]
  ]},
  {id:"career",label:["Кар'єра","Career"],icon:"briefcase-business",fields:[
   ["workplace","Місце роботи","Workplace"],
   ["job_title","Посада","Job title"],
   ["career_extra","Досвід роботи","Career experience","long"]
  ]},
  {id:"military",label:["Військова служба","Military service"],icon:"shield",fields:[
   ["military_service","Інформація про службу","Service information","long"]
  ]},
  {id:"personal",label:["Життєва позиція","Life perspectives"],icon:"compass",fields:[
   ["political_views","Політичні погляди","Political views"],
   ["worldview","Світогляд","Worldview"],
   ["life_priorities","Головне в житті","Life priorities"],
   ["important_in_people","Головне в людях","Important qualities in people"],
   ["attitude_to_smoking","Ставлення до паління","Attitude to smoking"],
   ["attitude_to_alcohol","Ставлення до алкоголю","Attitude to alcohol"],
   ["inspiration","Надихають","Inspirations","long"]
  ]}
 ];
 const audiences=[
  ["public","Для всіх","Everyone"],
  ["friends","Для друзів","Friends"],
  ["only_me","Лише для мене","Only me"]
 ];
 const make=(tag,cls,content)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(content!==undefined)e.textContent=content;
  return e;
 };
 const lang=pair=>tr(pair[0],pair[1]);
 const opt=(value,label)=>{
  const element=document.createElement("option");element.value=value;element.textContent=label;
  return element;
 };
 const svg=(kind)=>{
  const paths={
   user:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-2a8 8 0 0 1 16 0v2",
   lock:"M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z",
   eye:"M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
   arrow:"M19 12H5m7 7-7-7 7-7",
   edit:"M13.5 5.5 18.5 10.5M4 20l4-1 10-10a2.5 2.5 0 0 0-3.5-3.5l-10 10L4 20Z",
   photo:"M4 5h16v14H4zM8.5 9a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6ZM4 16l5-5 4 4 3-3 4 4",
   check:"M5 12l4 4L19 6",
   "user-round":"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-2a8 8 0 0 1 16 0v2",
   "at-sign":"M16 8v5c0 2.3 4 2.2 4-2a8 8 0 1 0-3 6M16 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
   "map-pin":"M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
   heart:"M20.8 5.7a5.4 5.4 0 0 0-7.6 0L12 7l-1.2-1.3a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.6",
   globe:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2c-3 3-4.5 6.3-4.5 10S9 19 12 22M12 2c3 3 4.5 6.3 4.5 10S15 19 12 22",
   link:"M10.5 13.5l3-3M8.5 16.5H7a5 5 0 0 1 0-10h4M15.5 7.5H17a5 5 0 0 1 0 10h-4",
   "book-open":"M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1m0-14c3-2 6-2 9-1v14c-3-1-6-1-9 1M12 6v14",
   "graduation-cap":"m2 8 10-5 10 5-10 5L2 8Zm4 4v5c3 2.5 9 2.5 12 0v-5M22 8v7",
   "briefcase-business":"M4 7h16a2 2 0 0 1 2 2v10H2V9a2 2 0 0 1 2-2Zm4 0V4h8v3M2 13c6 4 14 4 20 0",
   users:"M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-2a7 7 0 0 1 14 0v2M16 4a4 4 0 0 1 0 8M18 15a6 6 0 0 1 4 6",
   compass:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4 6-2.5 5.5L8 16l2.5-5.5L16 8Z",
   music:"M9 17V5l12-2v12M9 8l12-2M9 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
   phone:"M6 2h4l1 5-3 2a17 17 0 0 0 7 7l2-3 5 1v4a3 3 0 0 1-3 3C10 21 3 14 3 5a3 3 0 0 1 3-3",
   sparkles:"m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z",
   film:"M4 4h16v16H4zM8 4v16M16 4v16M4 9h4m8 0h4M4 15h4m8 0h4",
   "gamepad-2":"M8 8h8c3 0 5 2 6 7l-2 4c-1 2-3 2-5 0l-2-2h-2l-2 2c-2 2-4 2-5 0l-2-4c1-5 3-7 6-7Zm1 4v5m-2.5-2.5h5M17 13h.01M19 15h.01",
   "quote":"M4 6h6v6l-3 5H4l3-5H4V6Zm10 0h6v6l-3 5h-3l3-5h-3V6",
   "file-text":"M6 2h8l5 5v15H6zM14 2v5h5M9 12h7M9 16h7"
  };
  const ns="http://www.w3.org/2000/svg",element=document.createElementNS(ns,"svg");
  element.setAttribute("class","ui-vatra-profile-information-icon-"+kind);
  element.setAttribute("viewBox","0 0 24 24");
  element.setAttribute("width","18");element.setAttribute("height","18");
  element.setAttribute("fill","none");element.setAttribute("stroke","currentColor");
  element.setAttribute("stroke-width","1.8");element.setAttribute("stroke-linecap","round");
  element.setAttribute("stroke-linejoin","round");element.setAttribute("aria-hidden","true");
  const line=document.createElementNS(ns,"path");
  line.setAttribute("class","ui-vatra-profile-information-path-"+kind);
  line.setAttribute("d",paths[kind]||paths.user);element.append(line);return element;
 };
 let openEditor=()=>{};
 async function init({client,ownId,targetId,isMine}){
  const card=select("#profile-about-card");
  const paragraph=select("#profile-about-text");
  // Visibility and accepted friendship are independent RLS-checked reads.
  // Start both together so closed profiles do not pay an extra network round trip.
  const preferenceQuery=client.from("vatra_profile_preferences")
   .select("profile_visibility").eq("vatra_id",targetId).maybeSingle();
  const friendshipQuery=!isMine&&ownId?
   client.from("vatra_friendships")
    .select("id").or(
     "and(requester_id.eq."+ownId+",recipient_id.eq."+targetId+"),"+
     "and(requester_id.eq."+targetId+",recipient_id.eq."+ownId+")"
    ).eq("status","accepted").limit(1):
   Promise.resolve({data:[],error:null});
  const [preference,friendship]=await Promise.all([preferenceQuery,friendshipQuery]);
  // Failed checks never imply a public profile or an accepted friendship.
  let accountVisibility=preference.error?"friends":preference.data?.profile_visibility||"public";
  const isFriend=!friendship.error&&!!friendship.data?.length;
  const locked=!isMine&&accountVisibility==="friends"&&!isFriend;
  const result=locked?{data:[],error:null}:await client.from("vatra_profile_details")
   .select("field_key,field_value,visibility").eq("vatra_id",targetId);
  const rows=result.error?[]:result.data||[];
  const saved=new Map(rows.map(x=>[x.field_key,{
   value:String(x.field_value||""),visibility:x.visibility||"friends"
  }]));
  const draft=new Map([...saved.entries()].map(([key,value])=>[key,{...value}]));
  const title=select("#profile-about-heading");
  if(title){
   title.textContent=tr("Про мене","About me");
   title.dataset.socialUk="Про мене";
   title.dataset.socialEn="About me";
  }
  const fieldsByKey=new Map(groups.flatMap(group=>group.fields).map(field=>[field[0],field]));
  const featured=["city","hometown","relationship","website"];
  const fieldIcons={
   city:"map-pin",hometown:"map-pin",relationship:"heart",website:"link",
   short_bio:"file-text",about_me:"file-text",family:"users",languages:"globe",
   address:"map-pin",mobile_phone:"phone",additional_phone:"phone",
   school:"graduation-cap",university:"graduation-cap",education_extra:"book-open",
   workplace:"briefcase-business",job_title:"briefcase-business",career_extra:"briefcase-business",
   activities:"sparkles",hobbies:"heart",favorite_music:"music",
   favorite_movies:"film",favorite_tv:"film",favorite_books:"book-open",
   favorite_games:"gamepad-2",favorite_quotes:"quote",military_service:"shield",
   political_views:"compass",worldview:"compass",life_priorities:"compass",
   important_in_people:"users",attitude_to_smoking:"compass",attitude_to_alcohol:"compass",
   inspiration:"sparkles"
  };
  const fallback=[
   "activities","hobbies","languages","school","university",
   "workplace","job_title","family","about_me","favorite_music","favorite_movies",
   "favorite_books","favorite_games","inspiration","worldview","life_priorities",
   "important_in_people","education_extra","career_extra","favorite_tv",
   "favorite_quotes","military_service","political_views","attitude_to_smoking",
   "attitude_to_alcohol","address","mobile_phone","additional_phone"
  ];
  const sections=make("div","profile-information-groups ui-profile-information-groups-001");
  const more=make("button","vt-profile-about-more-001",tr("Докладніше","More details"));
  more.type="button";more.id="profile-about-more";
  more.append(svg("arrow"));
  more.setAttribute("aria-haspopup","dialog");
  const modal=make("dialog","vatra-profile-details-dialog ui-vatra-profile-details-dialog-001");
  modal.id="vatra-profile-details-dialog";
  modal.setAttribute("aria-labelledby","vatra-profile-details-heading");
  const modalHeader=make("div","vatra-profile-details-header ui-vatra-profile-details-header-001");
  const modalTitles=make("div","ui-vatra-profile-details-titles-001");
  const modalEyebrow=make("span","vt-vatra-profile-details-eyebrow-001",tr("ПРО МЕНЕ · VATRA","ABOUT ME · VATRA"));
  const modalTitle=make("h2","vt-vatra-profile-details-title-001",tr("Докладна інформація","Detailed information"));
  modalTitle.id="vatra-profile-details-heading";
  modalTitles.append(modalEyebrow,modalTitle);
  const closeModal=make("button","vt-vatra-profile-details-close-001","×");
  closeModal.type="button";
  closeModal.setAttribute("aria-label",tr("Закрити докладну інформацію","Close detailed information"));
  modalHeader.append(modalTitles,closeModal);
  const modalContent=make("div","vatra-profile-details-content ui-vatra-profile-details-content-001");
  modal.append(modalHeader,modalContent);
  document.body.append(modal);
  closeModal.addEventListener("click",()=>modal.close());
  modal.addEventListener("click",event=>{
   if(event.target===modal)modal.close();
  });
  const visibleField=key=>String(saved.get(key)?.value||"").trim();
  const safeWebsite=value=>{
   try{
    const candidate=/^https?:\/\//i.test(value)?value:"https://"+value;
    const parsed=new URL(candidate);
    if(!["http:","https:"].includes(parsed.protocol)||!parsed.hostname.includes("."))return null;
    return parsed.href;
   }catch(_){return null;}
  };
  const itemFor=(key,detailed)=>{
   const field=fieldsByKey.get(key),data=saved.get(key);
   if(!field||!visibleField(key))return null;
   const item=make("div",detailed?
    "vatra-profile-details-row ui-profile-detail-row-"+key:
    "profile-information-item ui-profile-information-item-"+key);
   // Keep the reading view typography-first. Icons stay in the editor,
   // where they help navigation, not beside every public profile fact.
   if(key==="short_bio"){
    return detailed?make("p","vt-profile-detail-bio-001",data.value):null;
   }
   const label=make("span",detailed?
    "vt-profile-detail-label-"+key:"vt-profile-information-label-"+key,tr(field[1],field[2]));
   const content=make("span",detailed?
    "vt-profile-detail-value-"+key:"vt-profile-information-value-"+key);
   if(key==="website"){
    const href=safeWebsite(data.value.trim());
    if(href){
     const link=make("a",detailed?"vt-profile-detail-website-001":"vt-profile-about-website-001",data.value.trim());
     link.href=href;link.target="_blank";link.rel="noopener noreferrer nofollow";
     content.append(link);
    }else content.textContent=data.value;
   }else content.textContent=data.value;
   item.append(label,content);
   return item;
  };
  const renderDetails=()=>{
   modalContent.replaceChildren();
   modalEyebrow.textContent=tr("ПРО МЕНЕ · VATRA","ABOUT ME · VATRA");
   modalTitle.textContent=tr("Докладна інформація","Detailed information");
   closeModal.setAttribute("aria-label",tr("Закрити докладну інформацію","Close detailed information"));
   const detailGroups=[
    {id:"overview",label:["Основне","Overview"],keys:featured},
    ...groups.map(group=>({
     id:group.id,label:group.label,
     keys:group.fields.map(field=>field[0]).filter(key=>!featured.includes(key))
    }))
   ];
   let count=0;
   for(const group of detailGroups){
    const keys=group.keys.filter(key=>visibleField(key));
    if(!keys.length)continue;
    const section=make("section","vatra-profile-details-section ui-vatra-profile-details-section-"+group.id);
    const head=make("h3","vt-vatra-profile-details-section-title-"+group.id,lang(group.label));
    const headingRow=make("div","vatra-profile-details-section-head ui-vatra-profile-details-section-head-"+group.id);
    headingRow.append(head);section.append(headingRow);
    for(const key of keys){section.append(itemFor(key,true));count++;}
    modalContent.append(section);
   }
   if(count&&isMine){
    const footer=make("div","vatra-profile-details-footer ui-vatra-profile-details-footer-001");
    const edit=make("button","vt-vatra-profile-details-edit-001",tr("Редагувати інформацію","Edit information"));
    edit.type="button";edit.append(svg("edit"));
    edit.addEventListener("click",()=>{modal.close();openEditor();});
    footer.append(edit);modalContent.append(footer);
   }
   if(!count){
    const empty=make("div","vatra-profile-details-empty ui-vatra-profile-details-empty-001");
    empty.append(svg("user"),make("p","vt-vatra-profile-details-empty-label-001",
     isMine?tr("Відомостей поки немає. Додайте те, чим бажаєте поділитися.",
      "No details yet. Add what you would like to share."):
      tr("Користувач ще не додав доступної вам інформації.",
       "This member has not shared any information with you.")));
    if(isMine){
     const edit=make("button","vt-vatra-profile-details-edit-001",tr("Редагувати сторінку","Edit profile"));
     edit.type="button";
     edit.addEventListener("click",()=>{modal.close();openEditor();});
     empty.append(edit);
    }
    modalContent.append(empty);
   }
  };
  more.addEventListener("click",()=>{
   if(locked)return;
   renderDetails();modal.showModal();closeModal.focus({preventScroll:true});
  });
  const renderInfo=()=>{
   sections.replaceChildren();
   if(!card||!paragraph)return;
   more.hidden=true;
   if(result.error){
    paragraph.hidden=false;
    paragraph.textContent=tr("Не вдалося завантажити інформацію.","Could not load profile information.");
    return;
   }
   if(locked){
    paragraph.hidden=false;
    paragraph.textContent=tr("Інформація доступна лише друзям.","Information is available to friends only.");
    return;
   }
   // Short biography is centered on its own, with no "Short bio" label.
   // An empty bio must occupy no space in either the owner's or visitor's page.
   const bio=visibleField("short_bio");
   paragraph.textContent=bio;
   paragraph.hidden=!bio;
   // Only one location can appear in the preview: current city takes priority.
   const locationKey=visibleField("city")?"city":visibleField("hometown")?"hometown":null;
   const selected=[locationKey,"relationship","website"].filter(key=>key&&visibleField(key));
   // Missing priority fields are replaced with other available, RLS-filtered values.
   for(const key of fallback){
    if(selected.length>=3)break;
    if(visibleField(key)&&!selected.includes(key))selected.push(key);
   }
   for(const key of selected.slice(0,3))sections.append(itemFor(key,false));
   const additional=[...fieldsByKey.keys()].filter(key=>
    key!=="short_bio"&&visibleField(key)&&!selected.includes(key));
   const hasLongPreview=selected.some(key=>visibleField(key).length>32);
   more.hidden=!additional.length&&!hasLongPreview;
  };
  if(card){card.append(sections,more);renderInfo();}
  if(locked){
   select(".social-profile-tabs")?.setAttribute("hidden","");
   select(".profile-panels")?.setAttribute("hidden","");
   select("#profile-status")?.setAttribute("hidden","");
   const status=select("#profile-status-text");if(status)status.textContent="";
   const notice=make("section","profile-locked-notice ui-profile-locked-notice-001");
   notice.setAttribute("role","status");
   notice.append(svg("lock"));
   const copy=make("div","ui-profile-locked-notice-content-001");
   copy.append(make("h2","vt-profile-locked-heading-001",
    tr("Ця сторінка закрита","This profile is private")));
   copy.append(make("p","vt-profile-locked-description-001",
    tr("Публікації, фотографії та інформацію бачать лише друзі користувача.",
     "Only this member's friends can see posts, photos and personal information.")));
   notice.append(copy);
   select(".profile-hero")?.insertAdjacentElement("afterend",notice);
  }
  if(!isMine)return {locked};
  const main=select("#feed-main");
  if(!main)return {locked:false};
  const hero=select(".profile-hero"),panels=select(".profile-panels");
  const workspace=make("section","profile-edit-workspace ui-profile-edit-workspace-001");
  workspace.id="profile-edit-workspace";workspace.hidden=true;
  const heading=make("header","profile-editor-header ui-profile-editor-header-001");
  const back=make("button","vt-profile-editor-back-001");
  back.type="button";back.append(svg("arrow"),make("span","vt-profile-editor-back-label-001",tr("Моя сторінка","My profile")));
  const titles=make("div","ui-profile-editor-titles-001");
  titles.append(
   make("span","vt-profile-editor-eyebrow-001",tr("ОСОБИСТИЙ ПРОСТІР  /  VATRA","YOUR SPACE  /  VATRA")),
   make("h1","vt-profile-editor-title-001",tr("Редагувати сторінку","Edit your profile")),
   make("p","vt-profile-editor-subtitle-001",tr(
    "Ваша історія — ваші правила. Заповнюйте профіль у власному ритмі й керуйте видимістю кожного поля.",
    "Your story, your rules. Share what matters and control the audience of each detail.")));
  const privacyPill=make("span","vt-profile-editor-privacy-pill-001");
  privacyPill.append(svg("lock"),make("span","vt-profile-editor-privacy-pill-label-001",
   tr("Приватність під контролем","Privacy in your hands")));
  heading.append(back,titles,privacyPill);
  const layout=make("div","profile-editor-layout ui-profile-editor-layout-001");
  const primary=make("section","profile-editor-main ui-profile-editor-main-001");
  const form=make("form","profile-editor-form ui-profile-editor-form-001");
  form.id="profile-editor-form";
  const titleRow=make("div","profile-editor-section-head ui-profile-editor-section-head-001");
  const groupTitleWrap=make("div","ui-profile-editor-section-title-wrap-001");
  const chapter=make("span","vt-profile-editor-chapter-001");
  const groupTitle=make("h2","vt-profile-editor-section-title-001");
  groupTitleWrap.append(chapter,groupTitle);
  const media=make("button","vt-profile-editor-media-button-001");
  media.type="button";media.append(svg("photo"),make("span","vt-profile-editor-media-button-text-001",tr("Фото й обкладинка","Photos and cover")));
  titleRow.append(groupTitleWrap,media);
  const summary=make("p","vt-profile-editor-section-description-001");
  const separator=make("div","profile-editor-label-row ui-profile-editor-label-row-001");
  separator.append(
   make("span","vt-profile-editor-label-row-title-001",tr("Ваші відомості","Your details")),
   make("span","vt-profile-editor-label-row-caption-001",tr("Кожне поле має свою аудиторію","Every field has its own audience")));
  const fields=make("div","profile-editor-fields ui-profile-editor-fields-001");
  const saveRow=make("div","profile-editor-footer ui-profile-editor-footer-001");
  const feedback=make("p","vt-profile-editor-feedback-001");feedback.setAttribute("role","status");feedback.hidden=true;
  const save=make("button","vt-profile-editor-save-001",tr("Зберегти зміни","Save changes"));
  save.type="submit";saveRow.append(feedback,save);
  form.append(titleRow,summary,separator,fields,saveRow);primary.append(form);
  const sidebar=make("nav","profile-editor-sidebar ui-profile-editor-sidebar-001");
  sidebar.setAttribute("aria-label",tr("Розділи редагування","Edit sections"));
  const navHeading=make("div","ui-profile-editor-nav-heading-001");
  navHeading.append(
   make("span","vt-profile-editor-nav-eyebrow-001",tr("РОЗДІЛИ","SECTIONS")),
   make("strong","vt-profile-editor-nav-title-001",tr("Ваш профіль","Your profile")),
   make("span","vt-profile-editor-nav-subtitle-001",tr("7 розділів · усе під контролем","7 sections · in your control")));
  sidebar.append(navHeading);
  const menu=make("div","ui-profile-editor-nav-menu-001");
  const navButtons=new Map();
  for(const [index,group] of groups.entries()){
   const btn=make("button","profile-editor-nav-link vt-profile-editor-nav-"+group.id);
   btn.type="button";btn.dataset.group=group.id;
   const navIcon=make("span","ui-vatra-profile-editor-nav-symbol-"+group.id);
   navIcon.append(svg(group.icon));
   btn.append(navIcon,
    make("span","vt-profile-editor-nav-index-"+group.id,String(index+1).padStart(2,"0")),
    make("span","vt-profile-editor-nav-label-"+group.id,lang(group.label)));
   const marker=make("span","vt-profile-editor-nav-dot-"+group.id);
   marker.setAttribute("aria-hidden","true");btn.append(marker);
   btn.addEventListener("click",()=>switchGroup(group.id));
   navButtons.set(group.id,btn);menu.append(btn);
  }
  const navFoot=make("div","ui-profile-editor-nav-footer-001");
  navFoot.append(svg("lock"),make("span","vt-profile-editor-nav-footer-label-001",
   tr("Видимість ваших даних налаштовується окремо.",
    "Each piece of information has its own visibility.")));
  sidebar.append(menu,navFoot);layout.append(sidebar,primary);
  workspace.append(heading,layout);main.append(workspace);
  let selected="profile",visibility=accountVisibility;
  const hasChanges=()=>[...draft.keys()].some(key=>
   (draft.get(key)?.value||"")!==(saved.get(key)?.value||"")||
   (draft.get(key)?.visibility||"friends")!==(saved.get(key)?.visibility||"friends"))||
   visibility!==accountVisibility;
  const close=()=>{
   if(hasChanges()&&!confirm(tr("Незбережені зміни буде втрачено. Вийти?","Discard unsaved changes?")))return;
   draft.clear();
   for(const [key,value] of saved)draft.set(key,{...value});
   visibility=accountVisibility;
   workspace.hidden=true;hero.hidden=false;panels.hidden=false;
   scrollTo({top:0,behavior:"instant"});
  };
  back.addEventListener("click",close);
  const mediaDialog=select("#profile-edit-dialog");
  media.addEventListener("click",()=>mediaDialog?.showModal());
  const note=msg=>{
   feedback.hidden=!msg;
   feedback.textContent=msg;feedback.dataset.kind="error";
  };
  const showGroup=id=>{
   const group=groups.find(x=>x.id===id);
   if(!group)return;
   selected=id;
   groupTitle.textContent=lang(group.label);
   chapter.textContent=String(groups.indexOf(group)+1).padStart(2,"0")+"  /  "+String(groups.length).padStart(2,"0");
   summary.textContent=id==="profile"?
    tr("Основне про вас і налаштування доступу до всієї сторінки.",
     "Basic details and visibility for your profile."):
    tr("Для кожного поля доступні три рівні приватності.",
     "Each field supports three visibility levels.");
   media.hidden=id!=="profile";
   for(const [name,btn] of navButtons){
    const active=name===id;
    btn.classList.toggle("is-active",active);btn.setAttribute("aria-current",active?"page":"false");
   }
   fields.replaceChildren();feedback.hidden=true;
   if(id==="profile"){
    const privacy=make("div","profile-editor-privacy ui-profile-editor-privacy-001");
    const privacySymbol=make("div","ui-profile-editor-privacy-symbol-001");
    privacySymbol.append(svg("lock"));
    const copy=make("div","ui-profile-editor-privacy-copy-001");
    copy.append(make("strong","vt-profile-editor-privacy-heading-001",
     tr("Хто може бачити мою сторінку","Who can view my profile")),
     make("small","vt-profile-editor-privacy-help-001",
      tr("Закриту сторінку та її публікації бачитимуть тільки підтверджені друзі.",
       "Only confirmed friends can view a private page and its posts.")));
    const change=make("select","ui-profile-editor-page-visibility-001");
    change.id="profile-editor-page-visibility";
    change.setAttribute("aria-label",tr("Видимість сторінки","Page visibility"));
    change.append(opt("public",tr("Відкрита сторінка","Public profile")),
     opt("friends",tr("Закрита · лише друзі","Private · friends only")));
    change.value=visibility;change.addEventListener("change",()=>{visibility=change.value;});
    privacy.append(privacySymbol,copy,change);fields.append(privacy);
   }
   for(const [key,uk,en,kind] of group.fields){
    const row=make("div","profile-editor-field ui-profile-editor-field-"+key);
    row.dataset.long=kind==="long"?"true":"false";
    const lab=make("label","vt-profile-editor-label-"+key,tr(uk,en));
    lab.prepend(svg(fieldIcons[key]||"file-text"));
    const input=make(kind==="long"?"textarea":"input",
     "ui-profile-editor-input-"+key);
    input.id="profile-editor-"+key;
    lab.htmlFor=input.id;
    if(kind==="long"){input.rows=3;}else{input.type="text";}
    input.maxLength=1000;input.spellcheck=true;
    input.placeholder=kind==="long"?
     tr("Поділіться тим, що має значення для вас…","Share what matters to you…"):
     tr("Вкажіть інформацію","Add details");
    const current=draft.get(key)||{value:"",visibility:"friends"};
    input.value=current.value;
    const disclosure=make("label","ui-profile-editor-disclosure-"+key);
    disclosure.append(make("span","vt-profile-editor-disclosure-label-"+key,
     tr("Хто бачить","Visible to")));
    const selectBox=make("select","ui-profile-editor-visibility-"+key);
    selectBox.id="profile-editor-visibility-"+key;
    selectBox.setAttribute("aria-label",tr("Видимість поля: ","Visibility of field: ")+tr(uk,en));
    for(const [value,labelUa,labelEn] of audiences)
     selectBox.append(opt(value,tr(labelUa,labelEn)));
    selectBox.value=current.visibility;
    disclosure.append(selectBox);
    const control=make("div","ui-profile-editor-field-control-"+key);
    control.append(input,disclosure);
    row.append(lab,control);fields.append(row);
    const update=()=>draft.set(key,{value:input.value,visibility:selectBox.value});
    input.addEventListener("input",update);selectBox.addEventListener("change",update);
   }
   // Deliberately preserve unsaved draft values while switching sections.
  };
  // Switch editor chapters immediately. showGroup preserves unsaved draft data.
  const switchGroup=id=>{
   if(id!==selected)showGroup(id);
  };
  form.addEventListener("submit",async event=>{
   event.preventDefault();if(save.disabled)return;
   save.disabled=true;feedback.hidden=true;feedback.dataset.kind="";
   // One save persists edits across every section, not only the visible tab.
   const records=groups.flatMap(group=>group.fields).map(field=>{
    const key=field[0],item=draft.get(key)||{value:"",visibility:"friends"};
    return {vatra_id:ownId,field_key:key,field_value:item.value.trim(),
     visibility:item.visibility,updated_at:new Date().toISOString()};
   }).filter(record=>{
    const previous=saved.get(record.field_key)||{value:"",visibility:"friends"};
    return record.field_value!==previous.value||
     (record.field_value&&record.visibility!==previous.visibility);
   });
   try{
    const additions=records.filter(x=>x.field_value);
    const deletions=records.filter(x=>!x.field_value).map(x=>x.field_key);
    if(additions.length){
     const result=await client.from("vatra_profile_details")
      .upsert(additions,{onConflict:"vatra_id,field_key"}).select("field_key");
     if(result.error||result.data?.length!==additions.length)
      throw result.error||new Error("Profile fields not saved");
    }
    if(deletions.length){
     const result=await client.from("vatra_profile_details")
      .delete().eq("vatra_id",ownId).in("field_key",deletions);
     if(result.error)throw result.error;
    }
    if(visibility!==accountVisibility){
     const result=await client.from("vatra_profile_preferences")
      .upsert({vatra_id:ownId,profile_visibility:visibility,
       updated_at:new Date().toISOString()},{onConflict:"vatra_id"})
      .select("profile_visibility").maybeSingle();
     if(result.error||result.data?.profile_visibility!==visibility)
      throw result.error||new Error("Profile preference not saved");
    }
    for(const record of records){
     if(record.field_value)saved.set(record.field_key,{
      value:record.field_value,visibility:record.visibility});
     else saved.delete(record.field_key);
     draft.set(record.field_key,{
      value:record.field_value,visibility:record.visibility});
    }
    // Keep local state in sync for the next editor visit.
    accountVisibility=visibility;
    renderInfo();
    feedback.hidden=false;feedback.dataset.kind="success";
    feedback.textContent=tr("Зміни збережено.","Changes saved.");
   }catch(_){
    note(tr("Не вдалося зберегти всі зміни. Повторіть спробу.",
     "Could not save all changes. Please retry."));
   }finally{save.disabled=false;}
  });
  openEditor=()=>{
   hero.hidden=true;panels.hidden=true;
   workspace.hidden=false;showGroup("profile");
   scrollTo({top:0,behavior:"instant"});
   back.focus({preventScroll:true});
  };
  showGroup("profile");
  return {locked:false};
 }
 window.VATRA_PROFILE_DETAILS={init,open:()=>openEditor()};
})();

/* ==================== MEMBER PROFILE + MEDIA + POSTS ==================== */
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
 const brand=document.querySelector(".feed-header-brand");
 if(brand)brand.setAttribute("aria-label",english?"VATRA — Feed":"VATRA — Стрічка");
 for(const control of document.querySelectorAll(".social-profile-tabs button:disabled"))
  control.title=t("У розробці","Coming soon");
 for(const input of document.querySelectorAll("[data-shell-placeholder-uk]")){
    input.placeholder=english?input.dataset.shellPlaceholderEn:input.dataset.shellPlaceholderUk;
   }
   for(const control of document.querySelectorAll("[data-shell-aria-uk]")){
    const title=english?control.dataset.shellAriaEn:control.dataset.shellAriaUk;
    control.setAttribute("aria-label",title);
    control.removeAttribute("title");
   }
   for(const pair of [
    [".ui-shell-header-notifications-001","Сповіщення — незабаром","Notifications — coming soon"],
    [".ui-shell-header-music-001","Музика — незабаром","Music — coming soon"]]){
    const control=document.querySelector(pair[0]);
    if(control){
     const title=english?pair[2]:pair[1];
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
  document.body.classList.remove("vatra-shell-pending");
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
 // Preserve the cover/avatar but never invent profile actions or member details.
 const name=q("#profile-heading");
 if(name){name.removeAttribute("data-i18n");
  name.textContent=t("Користувача не знайдено","User not found");}
 q("#profile-status")?.remove();
 q("#profile-last-seen")?.remove();
 q("#profile-online-dot")?.remove();
 q(".profile-actions")?.remove();
 q(".social-profile-tabs")?.remove();
 q(".profile-panels")?.remove();
 document.title=t("Користувача не знайдено · VATRA","User not found · VATRA");
 finish();
}
let profilePostsRequest=0;
async function loadPosts(client,targetId,ownId,userId,append=false){
 const list=q("#profile-posts"),empty=q("#profile-posts-empty"),more=q("#profile-posts-more");
 if(!list||(append&&list.dataset.loading==="true"))return;
 const ticket=++profilePostsRequest;
 const offset=append?Number(list.dataset.offset||0):0;
 const year=Number(q("#profile-post-filter-year")?.value||0);
 const month=Number(q("#profile-post-filter-month")?.value||0);
 list.dataset.loading="true";list.setAttribute("aria-busy","true");
 if(!append){
  list.replaceChildren();
  empty.textContent=t("Завантаження публікацій…","Loading posts…");
  empty.hidden=false;
  list.dataset.offset="0";
  if(more)more.hidden=true;
 }
 if(more)more.disabled=true;
 try{
  let query=client.from("feed_posts")
   .select("id,author_vatra_id,body,created_at,visibility,media_kind,media_path,shared_post_kind,shared_post_id")
   .eq("author_vatra_id",targetId);
  if(typeof query.is==="function")query=query.is("archived_at",null);
  // Filter on the database before pagination: a page never contains posts
  // outside the selected local year/month, and RLS remains authoritative.
  if(year>=2026&&year<=9999){
   const start=new Date(year,month?month-1:0,1);
   const end=month?new Date(year,month,1):new Date(year+1,0,1);
   query=query.gte("created_at",start.toISOString())
    .lt("created_at",end.toISOString());
  }
  const {data,error}=await query.order("created_at",{ascending:false})
   .order("id",{ascending:false}).range(offset,offset+11);
  if(ticket!==profilePostsRequest)return;
  if(error)throw error;
  const rows=data||[];
  if(!append)list.replaceChildren();
  for(const post of rows){
   const article=node("article","feed-post-card ui-profile-post-card-001");
   article.dataset.postId=post.id;
   const header=node("div","feed-post-header ui-profile-post-header-001");
   const identity=node("div","feed-post-author ui-profile-post-author-001");
   const name=node("a","feed-post-name vt-profile-post-name-001 feed-post-profile-link",
    q("#profile-heading").textContent);
   name.href=memberUrl(targetId);
   const stamp=node("time","feed-post-date vt-profile-post-date-001",dateText(post.created_at));
   stamp.dateTime=post.created_at;
   const meta=node("div","feed-post-meta-row ui-profile-post-meta-row-001");
   meta.append(stamp);window.VATRA_POST_INTERACTIONS?.appendAudience(meta,post.visibility,false);
   identity.append(name,meta);
   const avatar=node("a","feed-avatar feed-post-avatar vt-profile-post-avatar-001 feed-post-profile-avatar",
    q("#profile-avatar").textContent||"V");
   avatar.href=memberUrl(targetId);
   avatar.setAttribute("aria-label",t("Переглянути профіль","View profile"));
   const profileAvatar=q("#profile-avatar");
   if(profileAvatar.classList.contains("has-photo")){
    avatar.style.backgroundImage=profileAvatar.style.backgroundImage;
    avatar.classList.add("has-photo");avatar.textContent="";
   }
   header.append(avatar,identity);
   if(String(ownId)===String(targetId)){
    const archive=node("button","vt-profile-post-archive-001",t("В архів","Archive"));
    archive.type="button";archive.addEventListener("click",async()=>{
     archive.disabled=true;
     const {data,error}=await client.from("feed_posts").update({archived_at:new Date().toISOString()})
      .eq("id",post.id).eq("author_vatra_id",ownId).select("id").maybeSingle();
     if(error||!data){archive.disabled=false;return;}
     void loadPosts(client,targetId,ownId,userId);
    });
    const remove=node("button","vt-profile-post-remove-001",t("Видалити","Delete"));
    remove.type="button";remove.addEventListener("click",async()=>{
     if(!confirm(t("Видалити цю публікацію?","Delete this post?")))return;
     remove.disabled=true;
     const {data,error}=await client.from("feed_posts").delete().eq("id",post.id)
      .eq("author_vatra_id",ownId).select("id");
     if(error||!data?.length){remove.disabled=false;return;}
     if(post.media_path)void window.VATRA_POST_MEDIA?.remove(client,post);
     void loadPosts(client,targetId,ownId,userId);
    });
    header.append(archive,remove);
   }
   article.append(header);
   if(post.body){
    const body=node("p","feed-post-body vt-profile-post-body-001",post.body);
    window.VATRA_POST_MEDIA?.linkifyHashtags(body);
    article.append(body);
    window.VATRA_POST_MEDIA?.collapsibleBody(body);
   }
   if(post.media_kind&&post.media_path)void window.VATRA_POST_MEDIA?.mount(client,post,article);
   if(post.shared_post_id)void window.VATRA_POST_INTERACTIONS?.renderSharedPreview(client,post,article);
   window.VATRA_POST_INTERACTIONS?.mount(client,{...post,kind:"person"},article,{
    ownId,userId,onShared:()=>{if(String(ownId)===String(targetId))
     void loadPosts(client,targetId,ownId,userId);}
   });
   list.append(article);
  }
  list.dataset.offset=String(offset+rows.length);
  empty.hidden=list.querySelector(".feed-post-card")!==null;
  if(!empty.hidden)empty.textContent=year?
   t("За вибраний період публікацій немає.","No posts in the selected period."):
   t("Публікацій поки немає.","No posts yet.");
  if(more){
   more.hidden=rows.length<12;
   if(!more.dataset.bound){
    more.dataset.bound="true";
    more.addEventListener("click",()=>void loadPosts(client,targetId,ownId,userId,true));
   }
  }
 }catch(_){
  if(ticket!==profilePostsRequest)return;
  if(!append)list.replaceChildren();
  empty.textContent=t("Не вдалося завантажити публікації. Спробуйте оновити сторінку.",
   "Could not load posts. Try refreshing this page.");
  empty.hidden=false;
 }finally{
  if(ticket===profilePostsRequest){
   list.dataset.loading="false";list.setAttribute("aria-busy","false");
   if(more)more.disabled=false;
  }
 }
}
function setupProfilePostFilters(client,targetId,ownId,userId){
 const wrap=q(".profile-post-filter-wrap"),toggle=q("#profile-post-filter-button");
 const panel=q("#profile-post-filter-panel"),year=q("#profile-post-filter-year");
 const month=q("#profile-post-filter-month"),reset=q("#profile-post-filter-reset");
 const status=q("#profile-post-filter-status");
 if(!wrap||!toggle||!panel||!year||!month||!reset||!status)return;
 const option=(value,label)=>{
  const item=document.createElement("option");
  item.value=String(value);item.textContent=label;return item;
 };
 year.replaceChildren(option("",t("Усі роки","All years")));
 const current=new Date().getFullYear();
 for(let value=Math.max(2026,current);value>=2026;value--)
  year.append(option(value,String(value)));
 month.replaceChildren(option("",t("Усі місяці","All months")));
 for(let index=0;index<12;index++){
  const label=new Intl.DateTimeFormat(locale,{month:"long"}).format(new Date(2026,index,1));
  month.append(option(index+1,label.charAt(0).toLocaleUpperCase(locale)+label.slice(1)));
 }
 month.disabled=true;
 const close=()=>{
  panel.hidden=true;toggle.setAttribute("aria-expanded","false");
 };
 const refresh=()=>{
  if(!year.value){month.value="";month.disabled=true;}
  else month.disabled=false;
  const active=!!year.value;
  toggle.dataset.active=String(active);
  status.hidden=!active;
  if(active){
   const selected=month.value?
    new Intl.DateTimeFormat(locale,{month:"long",year:"numeric"})
     .format(new Date(Number(year.value),Number(month.value)-1,1)):
    year.value;
   status.textContent=t("Публікації за ","Posts for ")+selected;
  }else status.textContent="";
  void loadPosts(client,targetId,ownId,userId);
 };
 toggle.addEventListener("click",()=>{
  panel.hidden=!panel.hidden;
  toggle.setAttribute("aria-expanded",String(!panel.hidden));
 });
 year.addEventListener("change",refresh);
 month.addEventListener("change",refresh);
 reset.addEventListener("click",()=>{
  year.value="";month.value="";refresh();close();
 });
 document.addEventListener("click",event=>{
  if(!panel.hidden&&!wrap.contains(event.target))close();
 });
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!panel.hidden){close();toggle.focus();}
 });
}
function setupProfileExtraSections(client,ownId,targetId,userId,isMine){
 const savedTab=q("#profile-tab-saved"),archiveWrap=q("#profile-archive-wrap"),
  toggle=q("#profile-archive-toggle"),menu=q("#profile-archive-menu");
 savedTab.hidden=!isMine;archiveWrap.hidden=!isMine;
 const empty=(selector,content)=>{const element=q(selector);element.textContent=content;element.hidden=false;};
 const makeRow=(list,heading,description)=>{
  const article=node("article","profile-extra-row ui-profile-extra-row-001");
  article.append(node("strong","vt-profile-extra-title-001",heading),
   node("p","vt-profile-extra-copy-001",description));
  list.append(article);return article;
 };
 const displaySavedMedia=(article,item)=>{
  if(!item?.media_path||!["image","video"].includes(item.media_kind))return;
  // Reuse the same secure, signed-URL media viewer as the live Feed.
  void window.VATRA_POST_MEDIA?.mount(client,item,article);
 };
 const displayShared=(article,item)=>{
  if(item?.shared_post_id)void window.VATRA_POST_INTERACTIONS?.renderSharedPreview(client,item,article);
 };
 const namedAuthors=async rows=>{
  const ids=[...new Set(rows.map(p=>String(p.author_vatra_id)).filter(validId))];
  if(!ids.length)return new Map();
  const {data,error}=await client.from("vatra_public_profiles")
   .select("vatra_id,display_name").in("vatra_id",ids);
  return new Map(!error?(data||[]).map(x=>[String(x.vatra_id),String(x.display_name||"").trim()]):[]);
 };
 const namedCommunities=async rows=>{
  const ids=[...new Set(rows.map(p=>String(p.club_id)).filter(validId))];
  if(!ids.length)return new Map();
  const {data,error}=await client.from("communities").select("club_id,name").in("club_id",ids);
  return new Map(!error?(data||[]).map(x=>[String(x.club_id),String(x.name||"").trim()]):[]);
 };
 const saved=async()=>{
  if(!isMine)return;
  const list=q("#profile-saved-list"),note=q("#profile-saved-empty");
  list.replaceChildren();note.hidden=true;
  try{
   const {data,error}=await client.from("post_saves")
    .select("post_id,post_kind,saved_at").eq("owner_vatra_id",ownId)
    .order("saved_at",{ascending:false}).limit(30);
   if(error)throw error;
   const rows=data||[];
   const persons=rows.filter(row=>row.post_kind==="person").map(row=>row.post_id);
   const groups=rows.filter(row=>row.post_kind==="group").map(row=>row.post_id);
   const fetched=await Promise.all([
    persons.length?client.from("feed_posts").select("id,body,author_vatra_id,media_kind,media_path,shared_post_kind,shared_post_id,created_at").in("id",persons):Promise.resolve({data:[]}),
    groups.length?client.from("vatra_community_posts").select("id,body,author_vatra_id,club_id,media_kind,media_path,created_at").in("id",groups):Promise.resolve({data:[]})
   ]);
   const map=new Map(fetched.flatMap((x,i)=>(x.data||[]).map(p=>[(i?"group":"person")+":"+p.id,p])));
   const all=[...map.values()];
   const [people,communities]=await Promise.all([namedAuthors(all),namedCommunities(all.filter(x=>x.club_id))]);
   for(const save of rows){
    const post=map.get(save.post_kind+":"+save.post_id);if(!post)continue;
    const author=people.get(String(post.author_vatra_id))||t("Учасник VATRA","VATRA member");
    const community=save.post_kind==="group"?communities.get(String(post.club_id)):null;
    const heading=community?community+" · "+author:author;
    const article=makeRow(list,heading,post.body||t("Медіапублікація","Media post"));
    displaySavedMedia(article,post);
    displayShared(article,post);
    const groupSaved=save.post_kind==="group"&&validId(post.club_id);
    const a=node("a","vt-profile-saved-link-001",groupSaved?
     t("Відкрити спільноту","Open community"):t("Відкрити допис","Open post"));
    a.href=groupSaved?new URL("club"+post.club_id,home).href:
     new URL("feed?post="+encodeURIComponent(post.id),home).href;
    const remove=node("button","vt-profile-saved-remove-001",t("Прибрати зі збереженого","Remove from saved"));
    remove.type="button";
    remove.addEventListener("click",async()=>{
     remove.disabled=true;
     const result=await client.from("post_saves").delete().eq("owner_vatra_id",ownId)
      .eq("post_kind",save.post_kind).eq("post_id",save.post_id);
     if(result.error){remove.disabled=false;return;}
     article.remove();
     if(!list.children.length)empty("#profile-saved-empty",t("Збережених публікацій поки немає.","No saved posts yet."));
    });
    article.append(a,remove);
   }
   if(!list.children.length)empty("#profile-saved-empty",t("Збережених публікацій поки немає.","No saved posts yet."));
  }catch(_){empty("#profile-saved-empty",t("Не вдалося завантажити збережене.","Could not load saved posts."));}
 };
 const stories=async()=>{
  if(!isMine)return;
  const list=q("#profile-archive-stories-list"),note=q("#profile-archive-stories-empty");
  list.replaceChildren();note.hidden=true;
  try{
   const {data,error}=await client.from("vatra_stories").select("id,body,theme,created_at,expires_at")
    .eq("author_vatra_id",ownId).lte("expires_at",new Date().toISOString())
    .order("created_at",{ascending:false}).limit(50);
   if(error)throw error;
   for(const item of data||[])makeRow(list,dateText(item.created_at),item.body);
   if(!list.children.length)empty("#profile-archive-stories-empty",t("Історій в архіві ще немає.","No archived stories yet."));
  }catch(_){empty("#profile-archive-stories-empty",t("Не вдалося завантажити архів історій.","Could not load story archive."));}
 };
 const archivedPosts=async()=>{
  if(!isMine)return;
  const list=q("#profile-archive-posts-list"),note=q("#profile-archive-posts-empty");
  list.replaceChildren();note.hidden=true;
  try{
   const {data,error}=await client.from("feed_posts")
    .select("id,author_vatra_id,body,media_kind,media_path,shared_post_kind,shared_post_id,created_at,archived_at")
    .eq("author_vatra_id",ownId).not("archived_at","is",null)
    .order("archived_at",{ascending:false}).limit(40);
   if(error)throw error;
   const people=await namedAuthors(data||[]);
   for(const item of data||[]){
    const article=makeRow(list,people.get(String(item.author_vatra_id))||t("Моя публікація","My post"),
     item.body||t("Медіапублікація","Media post"));
    const stamp=node("time","vt-profile-extra-stamp-001",dateText(item.created_at));
    stamp.dateTime=item.created_at;article.append(stamp);
    displaySavedMedia(article,item);
    displayShared(article,item);
    const restore=node("button","vt-profile-restore-post-001",t("Повернути в публікації","Restore post"));
    restore.type="button";
    restore.addEventListener("click",async()=>{
     restore.disabled=true;
     const {data:updated,error:err}=await client.from("feed_posts").update({archived_at:null})
      .eq("id",item.id).eq("author_vatra_id",ownId).select("id").maybeSingle();
     if(err||!updated){restore.disabled=false;return;}
     article.remove();
     if(!list.children.length)empty("#profile-archive-posts-empty",t("В архіві немає публікацій.","No archived posts."));
    });
    const permanent=node("button","vt-profile-permanent-delete-001",t("Видалити назавжди","Delete permanently"));
    permanent.type="button";permanent.addEventListener("click",async()=>{
     if(!confirm(t("Видалити публікацію назавжди?","Delete post permanently?")))return;
     permanent.disabled=true;
     const {data:deleted,error:err}=await client.from("feed_posts").delete()
      .eq("id",item.id).eq("author_vatra_id",ownId).select("id");
     if(err||!deleted?.length){permanent.disabled=false;return;}
     if(item.media_path)void window.VATRA_POST_MEDIA?.remove(client,item);
     article.remove();
     if(!list.children.length)empty("#profile-archive-posts-empty",t("В архіві немає публікацій.","No archived posts."));
    });
    article.append(restore,permanent);
   }
   if(!list.children.length)empty("#profile-archive-posts-empty",t("В архіві немає публікацій.","No archived posts."));
  }catch(_){empty("#profile-archive-posts-empty",t("Не вдалося завантажити архів.","Could not load archive."));}
 };
 const dispatch=name=>{
  toggle?.classList.toggle("social-profile-tab-active",name==="archive-stories"||name==="archive-posts");
  if(name==="saved")void saved();
  if(name==="archive-stories")void stories();
  if(name==="archive-posts")void archivedPosts();
 };
 window.VATRA_PROFILE_EXTRA_TAB=dispatch;
 if(!isMine)return;
 // The tab strip scrolls horizontally; portal this menu so it is never clipped.
 document.body.append(menu);
 const close=()=>{menu.hidden=true;toggle.setAttribute("aria-expanded","false");};
 const position=()=>{
  if(menu.hidden)return;
  const anchor=toggle.getBoundingClientRect();
  const width=menu.getBoundingClientRect().width||175;
  menu.style.left=Math.round(Math.max(10,Math.min(anchor.left,innerWidth-width-10)))+"px";
  menu.style.top=Math.round(Math.min(anchor.bottom+6,innerHeight-menu.offsetHeight-10))+"px";
 };
 toggle.addEventListener("click",()=>{
  menu.hidden=!menu.hidden;toggle.setAttribute("aria-expanded",String(!menu.hidden));
  if(!menu.hidden)position();
 });
 for(const button of menu.querySelectorAll("[data-profile-archive]")){
  button.addEventListener("click",()=>{
   window.VATRA_PROFILE_CHOOSE_TAB?.(button.dataset.profileArchive);
   dispatch(button.dataset.profileArchive);close();
  });
 }
 document.addEventListener("pointerdown",event=>{if(!archiveWrap.contains(event.target)&&!menu.contains(event.target))close();});
 window.addEventListener("resize",position,{passive:true});
 window.addEventListener("scroll",close,{passive:true});
 menu.addEventListener("keydown",event=>{if(event.key==="Escape"){close();toggle.focus();}});

}
function setupProfileGallery(client,targetId){
 for(const settings of [
  {kind:"image",tab:"#profile-tab-photos",list:"#profile-photo-gallery",empty:"#profile-photos-empty",more:"#profile-photos-more"},
  {kind:"video",tab:"#profile-tab-videos",list:"#profile-video-gallery",empty:"#profile-videos-empty",more:"#profile-videos-more"}
 ]){
  const tab=q(settings.tab),list=q(settings.list),empty=q(settings.empty),more=q(settings.more);
  if(!tab||!list||!empty||!more)continue;
  let loaded=false,busy=false,offset=0;
  const load=async(append=false)=>{
   if(busy)return;
   busy=true;list.setAttribute("aria-busy","true");more.disabled=true;
   if(!append){
    offset=0;
    const placeholders=Array.from({length:3},(_,i)=>{
     const tile=node("div","profile-media-placeholder ui-profile-media-placeholder-"+settings.kind+"-"+i);
     tile.setAttribute("aria-hidden","true");return tile;
    });
    list.replaceChildren(...placeholders);
   }
   empty.hidden=true;
   try{
    let query=client.from("feed_posts")
     .select("id,author_vatra_id,media_kind,media_path")
     .eq("author_vatra_id",targetId).eq("media_kind",settings.kind);
    if(typeof query.is==="function")query=query.is("archived_at",null);
    const {data,error}=await query.order("created_at",{ascending:false}).order("id",{ascending:false})
     .range(offset,offset+11);
    if(error)throw error;
    const rows=(data||[]).filter(item=>!!item.media_path);
    if(!append)list.replaceChildren();
    for(const post of rows){
     const tile=node("article","profile-media-tile ui-profile-media-tile-001");
     tile.setAttribute("aria-label",settings.kind==="image"?t("Фото","Photo"):t("Відео","Video"));
     list.append(tile);
     void window.VATRA_POST_MEDIA?.mount(client,post,tile);
    }
    offset+=(data||[]).length;
    loaded=true;more.hidden=(data||[]).length<12;
    if(!list.children.length){
     empty.textContent=settings.kind==="image"?t("Фотографій поки немає.","No photos yet."):
      t("Відео поки немає.","No videos yet.");
     empty.hidden=false;
    }
   }catch(_){
    if(!append)list.replaceChildren();
    empty.textContent=t("Не вдалося завантажити медіа.","Could not load media.");
    empty.hidden=false;
   }finally{busy=false;list.setAttribute("aria-busy","false");more.disabled=false;}
  };
  tab.addEventListener("click",()=>{if(!loaded)void load();});
  more.addEventListener("click",()=>void load(true));
 }
}
function bindPostComposer(client,user,ownId){
 const trigger=q("#profile-write-post");
 const dialog=q("#profile-compose-dialog");
 const form=q("#profile-compose-form");
 const input=q("#profile-compose-text");
 const submit=q("#profile-compose-submit");
 const cancel=q("#profile-compose-cancel");
 const counter=q("#profile-compose-counter");
 const visibility=q("#profile-compose-visibility");
 const status=q("#profile-compose-status");
 if(!trigger||!dialog||!form||!input||!submit||!validId(ownId))return;
 let publishing=false,picker=null;
 const update=()=>{
  const length=Array.from(input.value).length;
  counter.textContent=length+" / 2000";
  submit.disabled=publishing||(!input.value.trim()&&!picker?.getFile())||length>2000;
 };
 const clearStatus=()=>{status.textContent="";status.hidden=true;};
 picker=window.VATRA_POST_MEDIA?.bindPicker({
  input:"#profile-compose-media",choose:"#profile-compose-media-choose",
  clear:"#profile-compose-media-remove",preview:"#profile-compose-media-preview",
  onError:text=>{status.textContent=text;status.hidden=!text;},onChange:update
 });
 trigger.addEventListener("click",()=>{
  clearStatus();
  dialog.showModal();
  update();
  input.focus();
 });
 cancel.addEventListener("click",()=>{if(!publishing)dialog.close();});
 dialog.addEventListener("cancel",event=>{if(publishing)event.preventDefault();});
 dialog.addEventListener("close",()=>{clearStatus();trigger.focus({preventScroll:true});});
 input.addEventListener("input",update);
 input.addEventListener("keydown",event=>{
  if((event.ctrlKey||event.metaKey)&&event.key==="Enter"&&!submit.disabled){
   event.preventDefault();
   form.requestSubmit();
  }
 });
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(publishing)return;
  const body=input.value.trim(),file=picker?.getFile();
  if((!body&&!file)||Array.from(body).length>2000){
   status.textContent=t("Додайте текст, фото або відео (до 2000 символів).","Add text, a photo or video (up to 2000 characters).");
   status.hidden=false;return;
  }
  publishing=true;
  update();
  clearStatus();
  let uploaded=null;
  try{
   if(file)uploaded=await window.VATRA_POST_MEDIA.upload(client,ownId,file);
   const {error}=await client.from("feed_posts").insert({
    author_id:user.id,author_vatra_id:ownId,body,
    visibility:["public","friends","only_me"].includes(visibility?.value)?visibility.value:"public",
    ...(uploaded||{})
   });
   if(error)throw error;
   input.value="";picker?.reset();
   dialog.close();
   await loadPosts(client,ownId,ownId,user.id);
  }catch(error){
   if(uploaded)try{await window.VATRA_POST_MEDIA.remove(client,uploaded);}catch(_){}
   status.textContent=error?.message||t("Не вдалося опублікувати допис. Повторіть спробу.",
    "Could not publish the post. Please try again.");
   status.hidden=false;
  }finally{publishing=false;update();}
 });
 update();
}


/* Profile sidebar: the same six named friends and three real gifts for every
   accessible profile. Pending friend requests never appear in public previews. */
async function setupProfileSocialCards(client,ownId,targetId,isMine){
 const friendsPreview=q("#profile-friends-preview-list");
 const friendsAll=q("#profile-friends-list");
 const giftsPreview=q("#profile-gifts-preview-list");
 const giftsAll=q("#profile-gifts-list");
 const communityList=q("#profile-communities-list");
 if(!friendsPreview||!giftsPreview)return;
 const previewEmpty=(selector,message)=>{
  const el=q(selector);if(el){el.textContent=message;el.hidden=false;}
 };
 const firstName=value=>String(value||"").trim().split(/\s+/)[0]||t("Учасник","Member");
 const asset=new URL("assets/gifts/first-flame.svg",home).href;
 const loading=(el,value)=>{
  el.replaceChildren(node("p","vt-profile-mini-loading-001",value));
 };
 loading(friendsPreview,t("Завантаження друзів…","Loading friends…"));
 loading(giftsPreview,t("Завантаження подарунків…","Loading gifts…"));
 let cachedFriends=[],cachedGifts=[],communitiesLoaded=false;
 function personCard(member,compact){
  const id=String(member.id);
  const link=node("a",compact?"profile-friend-tile vt-profile-friend-tile-"+id:
   "profile-friend-full vt-profile-friend-full-"+id);
  link.href=memberUrl(id);link.setAttribute("aria-label",member.name);
  const photo=node("span","profile-friend-portrait vt-profile-friend-portrait-"+id);
  photo.setAttribute("aria-hidden","true");
  if(member.avatar){
   photo.style.backgroundImage="url("+JSON.stringify(member.avatar)+")";
   photo.classList.add("has-photo");
  }
  const label=node("span","vt-profile-friend-name-"+id,compact?firstName(member.name):member.name);
  link.append(photo,label);return link;
 }
 const showFriends=()=>{
  friendsAll.replaceChildren();
  if(cachedFriends.length){
   for(const friend of cachedFriends)friendsAll.append(personCard(friend,false));
   q("#profile-friends-empty").hidden=true;
  }else previewEmpty("#profile-friends-empty",t("Друзів поки немає.","No friends yet."));
 };
 window.VATRA_PROFILE_SHOW_FRIENDS=showFriends;
 const showGifts=()=>{
  giftsAll.replaceChildren();
  if(cachedGifts.length){
   for(const gift of cachedGifts)giftsAll.append(giftCard(gift,false));
   q("#profile-gifts-empty").hidden=true;
  }else previewEmpty("#profile-gifts-empty",t("Подарунків поки немає.","No gifts yet."));
 };
 window.VATRA_PROFILE_SHOW_GIFTS=showGifts;
 function giftCard(gift,compact){
  const item=node("article",compact?"profile-gift-tile ui-profile-gift-preview-item-001":
   "profile-gift-full ui-profile-gift-full-item-001");
  const img=node("img","profile-gift-art ui-profile-gift-art-001");
  img.src=asset;img.alt=t("Перший вогник VATRA","First VATRA flame");
  img.width=compact?82:116;img.height=compact?82:116;img.loading="lazy";
  const title=node("strong","vt-profile-gift-name-001",t("Перший вогник","First flame"));
  const sub=node("small","vt-profile-gift-caption-001",t("За приєднання до VATRA","For joining VATRA"));
  item.append(img,title,sub);return item;
 }
 q("#profile-friends-all")?.addEventListener("click",()=>window.VATRA_PROFILE_CHOOSE_TAB?.("friends"));
 q("#profile-gifts-all")?.addEventListener("click",()=>window.VATRA_PROFILE_CHOOSE_TAB?.("gifts"));
 window.VATRA_PROFILE_SHOW_COMMUNITIES=async()=>{
  if(communitiesLoaded)return;
  communitiesLoaded=true;
  communityList.replaceChildren();
  try{
   const {data:follows,error}=await client.from("vatra_community_follows")
    .select("club_id,created_at").eq("member_vatra_id",targetId)
    .order("created_at",{ascending:false}).limit(150);
   if(error)throw error;
   const ids=[...new Set((follows||[]).map(x=>String(x.club_id)).filter(validId))];
   if(ids.length){
    const {data:groups,error:groupError}=await client.from("communities")
     .select("club_id,name,description").in("club_id",ids);
    if(groupError)throw groupError;
    const indexed=new Map((groups||[]).map(x=>[String(x.club_id),x]));
    for(const id of ids){
     const info=indexed.get(id);if(!info)continue;
     const a=node("a","profile-community-link vt-profile-community-link-"+id);
     a.href=new URL("club"+id,home).href;
     a.append(node("span","profile-community-symbol vt-profile-community-symbol-"+id,"V"),
      node("span","vt-profile-community-name-"+id,String(info.name||"").trim()||t("Спільнота","Community")));
     communityList.append(a);
    }
   }
   if(!communityList.children.length)previewEmpty("#profile-communities-empty",t("Підписок поки немає.","No community subscriptions yet."));
  }catch(_){
   communitiesLoaded=false;
   previewEmpty("#profile-communities-empty",t("Не вдалося завантажити спільноти.","Could not load communities."));
  }
 };
 const jobs=await Promise.allSettled([
  client.from("vatra_friendships").select("requester_id,recipient_id,created_at")
   .eq("status","accepted")
   .or("requester_id.eq."+targetId+",recipient_id.eq."+targetId)
   .order("created_at",{ascending:false}).limit(300),
  client.from("vatra_profile_gifts").select("id,gift_code,created_at")
   .eq("recipient_vatra_id",targetId).order("created_at",{ascending:false}).limit(100)
 ]);
 if(jobs[0].status==="fulfilled"&&!jobs[0].value.error){
  const friendships=jobs[0].value.data||[];
  const ids=[...new Set(friendships.map(f=>String(f.requester_id)===String(targetId)?
   String(f.recipient_id):String(f.requester_id)).filter(validId))];
  const [names,photos]=await Promise.allSettled([
   ids.length?client.from("vatra_public_profiles").select("vatra_id,display_name").in("vatra_id",ids):Promise.resolve({data:[]}),
   ids.length?client.from("vatra_profile_media").select("vatra_id,avatar_path").in("vatra_id",ids):Promise.resolve({data:[]})
  ]);
  const namesMap=new Map(names.status==="fulfilled"&&!names.value.error?
   (names.value.data||[]).map(x=>[String(x.vatra_id),String(x.display_name||"").trim()]):[]);
  const mediaMap=new Map(photos.status==="fulfilled"&&!photos.value.error?
   (photos.value.data||[]).map(x=>[String(x.vatra_id),String(x.avatar_path||"")]):[]);
  cachedFriends=ids.map(id=>{
   const path=mediaMap.get(id);
   let avatar=null;
   if(path&&path.startsWith(id+"/avatar/")){
    const {data}=client.storage.from("vatra-avatars").getPublicUrl(path);
    avatar=data?.publicUrl||null;
   }
   return {id,name:namesMap.get(id)||t("Учасник VATRA","VATRA member"),avatar};
  });
  friendsPreview.replaceChildren();
  for(const friend of cachedFriends.slice(0,6))friendsPreview.append(personCard(friend,true));
  if(!cachedFriends.length)previewEmpty("#profile-friends-preview-empty",t("Друзів поки немає.","No friends yet."));
 }else{
  friendsPreview.replaceChildren();
  previewEmpty("#profile-friends-preview-empty",t("Друзі тимчасово недоступні.","Friends are temporarily unavailable."));
 }
 if(jobs[1].status==="fulfilled"&&!jobs[1].value.error){
  cachedGifts=(jobs[1].value.data||[]).filter(x=>x.gift_code==="first_flame");
  giftsPreview.replaceChildren();
  for(const gift of cachedGifts.slice(0,3))giftsPreview.append(giftCard(gift,true));
  if(!cachedGifts.length)previewEmpty("#profile-gifts-preview-empty",t("Подарунків поки немає.","No gifts yet."));
 }else{
  giftsPreview.replaceChildren();
  previewEmpty("#profile-gifts-preview-empty",t("Не вдалося завантажити подарунки.","Could not load gifts."));
 }
}

/* Multi-step profile reporting, with server-owned reporter identity and
   insert-only RLS. Reports are private moderation data, not public posts. */
function setupProfileReports(client,ownId,targetId,isMine,locked){
 if(isMine)return;
 const dialog=q("#profile-report-dialog"),open=q("#profile-report-open");
 const back=q("#profile-report-back"),close=q("#profile-report-close");
 const content=q("#profile-report-content"),error=q("#profile-report-error");
 const footer=q("#profile-report-footer"),submit=q("#profile-report-submit");
 if(!dialog||!open)return;
 let step="kind",kind="profile",category="",reason="",sending=false;
 const base=[
  ["underage","Проблема стосується людини, молодшої за 18 років","A person under 18 is involved"],
  ["harassment","Цькування, переслідування чи жорстоке поводження","Bullying or harassment"],
  ["self_harm","Самогубство чи самоушкодження","Suicide or self-harm"],
  ["hateful","Жорстокий, ненависницький або тривожний контент","Violent, hateful or disturbing content"],
  ["regulated","Продаж або просування товарів з обмеженим доступом","Restricted goods"],
  ["adult","Контент для дорослих","Adult content"],
  ["fraud","Шахрайство або неправдива інформація","Fraud or false information"],
  ["fake","Фальшивий профіль","Fake profile"],
  ["intellectual_property","Інтелектуальна власність","Intellectual property"],
  ["other","Інше","Something else"]
 ];
 const specific={
  underage:[
   ["Погроза поширити мої оголені зображення","Threat to share my intimate images"],
   ["Схоже на сексуальну експлуатацію","Possible sexual exploitation"],
   ["Поширення оголених зображень іншої людини","Sharing someone's intimate images"],
   ["Цькування чи переслідування","Bullying or harassment"],
   ["Фізичне насильство","Physical violence"]],
  harassment:[["Цькування чи переслідування","Bullying or stalking"],["Погрози","Threats"],["Образи або приниження","Abuse or humiliation"]],
  fake:[["Видає себе за мене","Impersonates me"],["Видає себе за іншу людину","Impersonates someone else"],["Підроблена особа або організація","Fake identity or organization"]],
  fraud:[["Шахрайська схема","Scam"],["Оманлива інформація","Misleading information"],["Підозріле посилання","Suspicious link"]]
 };
 const option=(label,action)=>{
  const button=node("button","profile-report-option ui-profile-report-option-001");
  button.type="button";
  button.append(node("span","vt-profile-report-option-label-001",label),
   node("span","vt-profile-report-option-arrow-001","›"));
  button.addEventListener("click",action);content.append(button);
 };
 const paragraph=(value,cl="vt-profile-report-copy-001")=>content.append(node("p",cl,value));
 const heading=value=>content.append(node("h3","vt-profile-report-prompt-001",value));
 const message=value=>{error.textContent=value;error.hidden=!value;};
 const render=()=>{
  content.replaceChildren();message("");
  back.hidden=step==="kind"||step==="success";
  footer.hidden=step!=="review";
  if(step==="kind"){
   heading(t("На що ви хочете поскаржитися?","What would you like to report?"));
   paragraph(t("Якщо є безпосередня небезпека, зверніться по екстрену допомогу.","If someone is in immediate danger, contact emergency services."));
   option(t("Певна інформація про цей профіль","Something about this profile"),()=>{kind="profile";step="category";render();});
   option(t("Конкретний допис","A specific post"),()=>{kind="post";step="category";render();});
  }else if(step==="category"){
   heading(t("Чому ви скаржитеся на цей профіль?","Why are you reporting this profile?"));
   for(const [code,uk,en] of base)option(t(uk,en),()=>{category=kind==="post"?"specific_post":code;reason=t(uk,en);step="reason";render();});
  }else if(step==="reason"){
   heading(t("Який із варіантів найліпше описує проблему?","Which option best describes the issue?"));
   const choices=specific[category]||[
    ["Порушення правил спільноти VATRA","Violates VATRA community rules"],
    ["Небезпечний або неприйнятний контент","Unsafe or inappropriate content"],
    ["Інша проблема","Another problem"]
   ];
   for(const [uk,en] of choices)option(t(uk,en),()=>{reason=t(uk,en);step="review";render();});
  }else if(step==="review"){
   heading(t("Ви збираєтеся надіслати скаргу","You're about to submit a report"));
   paragraph(t("Скарга надходить на перевірку. Надсилання не означає автоматичного видалення контенту.","Your report is reviewed. Submitting does not automatically remove content."));
   const group=node("div","profile-report-review ui-profile-report-review-001");
   const chosen=base.find(x=>x[0]===category);
   group.append(node("small","vt-profile-report-category-label-001",t("Причина скарги","Report category")),
    node("strong","vt-profile-report-category-value-001",category==="specific_post"?t("Конкретний допис","Specific post"):chosen?t(chosen[1],chosen[2]):reason));
   group.append(node("small","vt-profile-report-reason-label-001",t("Уточнення","Details")),
    node("strong","vt-profile-report-reason-value-001",reason));
   content.append(group);
   const label=node("label","vt-profile-report-details-label-001",t("Додаткова інформація (необов’язково)","Additional details (optional)"));
   label.setAttribute("for","profile-report-details");
   const input=node("textarea","ui-profile-report-details-001");
   input.id="profile-report-details";input.maxLength=1500;input.rows=4;
   input.placeholder=t("Опишіть, що сталося…","Describe what happened…");
   input.value=dialog.dataset.reportDraft||"";
   input.addEventListener("input",()=>{dialog.dataset.reportDraft=input.value;});
   content.append(label,input);
  }else if(step==="success"){
   heading(t("Дякуємо за скаргу","Thank you for your report"));
   paragraph(t("Скаргу надіслано для перевірки. Дякуємо, що допомагаєте підтримувати безпеку VATRA.","Your report was submitted for review. Thank you for helping keep VATRA safe."));
   const done=node("button","vt-profile-report-done-001",t("Готово","Done"));
   done.type="button";done.addEventListener("click",()=>dialog.close());content.append(done);
  }
 };
 const launch=()=>{
  step="kind";kind="profile";category="";reason="";sending=false;dialog.dataset.reportDraft="";
  render();dialog.showModal();close.focus({preventScroll:true});
 };
 open.addEventListener("click",launch);
 if(locked){
  const notice=q(".profile-locked-notice");
  if(notice){
   const button=node("button","vt-profile-report-locked-001",t("Поскаржитися","Report"));
   button.type="button";button.addEventListener("click",launch);notice.append(button);
  }
 }
 close.addEventListener("click",()=>dialog.close());
 back.addEventListener("click",()=>{step=step==="review"?"reason":step==="reason"?"category":"kind";render();});
 submit.addEventListener("click",async()=>{
  if(sending||step!=="review")return;
  sending=true;submit.disabled=true;message("");
  try{
   const {error:insertError}=await client.from("vatra_profile_reports").insert({
    target_vatra_id:Number(targetId),category,reason,
    details:String(dialog.dataset.reportDraft||"").trim().slice(0,1500)
   });
   if(insertError){
    if(insertError.code==="23505"){message(t("Ви вже надсилали таку скаргу.","You've already sent this report."));return;}
    throw insertError;
   }
   step="success";render();
  }catch(_){message(t("Не вдалося надіслати скаргу. Спробуйте ще раз.","Could not submit the report. Please retry."));}
  finally{sending=false;submit.disabled=false;}
 });
 dialog.addEventListener("close",()=>{dialog.dataset.reportDraft="";message("");});
}

function setupProfileInteractions(client,ownId,targetId,isMine){
 const friendButton=q("#profile-friend-button"),messageButton=q("#profile-message-button");
 const actionStatus=q("#profile-action-status");
 const friends=q("#profile-friends-list"),friendsEmpty=q("#profile-friends-empty");
 const inbox=q("#profile-inbox-list"),inboxEmpty=q("#profile-inbox-empty");
 const dialog=q("#profile-message-dialog"),conversation=q("#profile-message-history");
 const messageText=q("#profile-message-text"),messageStatus=q("#profile-message-status");
 const send=q("#profile-message-send");
 const validPeer=id=>validId(String(id))&&String(id)!==String(ownId);
 const show=(el,txt)=>{el.textContent=txt;el.hidden=!txt;};
 const makePerson=(id,description)=>{
  const row=node("div","profile-person ui-profile-person-"+id);
  const avatar=node("span","profile-person-avatar vt-profile-person-avatar-"+id,"V");
  avatar.setAttribute("aria-hidden","true");
  const info=node("div","profile-person-details ui-profile-person-details-"+id);
  const link=node("a","vt-profile-person-link-"+id,"VATRA ID "+id);
  link.href=memberUrl(id);
  info.append(link,node("small","vt-profile-person-description-"+id,description));
  row.append(avatar,info);
  return row;
 };
 let loadFriends=async()=>{},loadInbox=async()=>{};
 const tabs=[...document.querySelectorAll("[data-profile-tab]")];
 function choose(name){
  if(!isMine&&["saved","archive-stories","archive-posts"].includes(name))return;
  if(name==="messages"&&!isMine)return;

  for(const tab of tabs){
   const active=tab.dataset.profileTab===name;
   tab.classList.toggle("social-profile-tab-active",active);
   tab.setAttribute("aria-selected",String(active));
   tab.tabIndex=active?0:-1;
  }
  for(const panel of document.querySelectorAll("[data-profile-panel]")){
   panel.hidden=panel.dataset.profilePanel!==name;
  }
  if(name==="friends"&&window.VATRA_PROFILE_SHOW_FRIENDS)void window.VATRA_PROFILE_SHOW_FRIENDS();
  else if(name==="friends")void loadFriends();
  if(name==="gifts")void window.VATRA_PROFILE_SHOW_GIFTS?.();
  if(name==="communities")void window.VATRA_PROFILE_SHOW_COMMUNITIES?.();
  if(name==="messages")void loadInbox();
  window.VATRA_PROFILE_EXTRA_TAB?.(name);
 }
 window.VATRA_PROFILE_CHOOSE_TAB=choose;
 for(const tab of tabs){
  tab.addEventListener("click",()=>choose(tab.dataset.profileTab));
  tab.addEventListener("keydown",e=>{
   if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
   const visible=tabs.filter(x=>!x.hidden);
   const next=visible[(visible.indexOf(tab)+(e.key==="ArrowRight"?1:-1)+visible.length)%visible.length];
   e.preventDefault();next.focus();choose(next.dataset.profileTab);
  });
 }
 // Inbox remains reachable via its private conversation flow, not as a profile tab.
 if(isMine&&location.hash==="#profile-messages-section")choose("messages");
 if(!validId(ownId))return;
 let activePeer=null,sending=false;
 const messagesQuery=peer=>"and(sender_id.eq."+ownId+",recipient_id.eq."+peer+
  "),and(sender_id.eq."+peer+",recipient_id.eq."+ownId+")";
 const loadConversation=async()=>{
  if(!validPeer(activePeer))return;
  conversation.replaceChildren(node("p","vt-profile-message-loading-001",t("Завантаження…","Loading…")));
  try{
   const {data,error}=await client.from("vatra_direct_messages")
    .select("sender_id,recipient_id,body,created_at")
    .or(messagesQuery(activePeer)).order("created_at",{ascending:false}).limit(50);
   if(error)throw error;
   conversation.replaceChildren();
   if(!data?.length)conversation.append(node("p","vt-profile-message-empty-001",
    t("Повідомлень ще немає.","No messages yet.")));
   for(const m of (data||[]).slice().reverse()){
    const bubble=node("div","profile-message-bubble ui-profile-message-bubble-001");
    // Member message text stays escaped; only known VATRA post URLs become links.
    const source=String(m.body||"");
    const postLink=new RegExp("https://mykolakolisnyk[.]github[.]io/VATRA/feed[?]post=[a-f0-9-]{36}","ig");
    let cursor=0,match;
    while((match=postLink.exec(source))!==null){
     bubble.append(document.createTextNode(source.slice(cursor,match.index)));
     const url=new URL(match[0]),link=node("a","vt-profile-message-post-link-001",
      t("Переглянути допис","View post"));
     if(url.origin==="https://mykolakolisnyk.github.io"&&url.pathname==="/VATRA/feed")
      link.href=url.href;
     bubble.append(link);cursor=match.index+match[0].length;
    }
    bubble.append(document.createTextNode(source.slice(cursor)));
    bubble.dataset.own=String(m.sender_id)===String(ownId)?"true":"false";
    const time=node("time","vt-profile-message-time-001",dateText(m.created_at));
    time.dateTime=m.created_at;
    bubble.append(time);conversation.append(bubble);
   }
   conversation.scrollTop=conversation.scrollHeight;
  }catch(_){
   conversation.replaceChildren(node("p","vt-profile-message-error-001",
    t("Не вдалося завантажити розмову.","Could not load conversation.")));
  }
 };
 const openConversation=async peer=>{
  if(!validPeer(peer))return;
  activePeer=String(peer);
  q("#profile-message-title").textContent=t("Повідомлення · VATRA ID ","Messages · VATRA ID ")+activePeer;
  messageText.value="";show(messageStatus,"");
  if(!dialog.open)dialog.showModal();
  await loadConversation();
  messageText.focus();
 };
 q("#profile-message-close").addEventListener("click",()=>{if(!sending)dialog.close();});
 q("#profile-message-refresh").addEventListener("click",()=>void loadConversation());
 q("#profile-message-form").addEventListener("submit",async event=>{
  event.preventDefault();
  if(sending||!validPeer(activePeer))return;
  const body=messageText.value.trim();
  if(!body||Array.from(body).length>2000){
   show(messageStatus,t("Потрібно 1–2000 символів.","Please enter 1–2000 characters."));return;
  }
  sending=true;send.disabled=true;show(messageStatus,"");
  try{
   const {error}=await client.from("vatra_direct_messages").insert({
    sender_id:ownId,recipient_id:activePeer,body
   });
   if(error)throw error;
   messageText.value="";
   await loadConversation();
   show(messageStatus,t("Повідомлення надіслано.","Message sent."));
  }catch(_){show(messageStatus,t("Не вдалося надіслати.","Failed to send message."));}
  finally{sending=false;send.disabled=false;}
 });
 if(!isMine){
  messageButton.hidden=false;
  messageButton.addEventListener("click",()=>void openConversation(targetId));
  friendButton.hidden=false;
  let relation=null,busy=false;
  const pair="and(requester_id.eq."+ownId+",recipient_id.eq."+targetId+
   "),and(requester_id.eq."+targetId+",recipient_id.eq."+ownId+")";
  const refreshFriend=async()=>{
   const {data,error}=await client.from("vatra_friendships")
    .select("id,requester_id,recipient_id,status").or(pair).maybeSingle();
   if(error)throw error;
   relation=data;
   const outgoing=String(relation?.requester_id)===String(ownId);
   friendButton.dataset.friendState=relation?.status==="accepted"?"friends":
    relation?.status==="pending"?(outgoing?"outgoing":"incoming"):"none";
   q("#profile-friend-label").textContent=relation?.status==="accepted"?t("У друзях · Видалити","Friends · Remove"):
    relation?.status==="pending"?(outgoing?t("Заявку надіслано · Скасувати","Request sent · Cancel"):
     t("Прийняти заявку","Accept request")):t("Додати в друзі","Add friend");
  };
  q("#profile-friend-label").textContent=t("Додати в друзі","Add friend");
  void refreshFriend().catch(()=>show(actionStatus,t("Статус дружби недоступний.","Friendship status unavailable.")));
  friendButton.addEventListener("click",async()=>{
   if(busy)return;
   busy=true;friendButton.disabled=true;show(actionStatus,"");
   try{
    const result=!relation?
     await client.from("vatra_friendships").insert({requester_id:ownId,recipient_id:targetId}):
     relation.status==="pending"&&String(relation.recipient_id)===String(ownId)?
      await client.from("vatra_friendships").update({status:"accepted"}).eq("id",relation.id):
      await client.from("vatra_friendships").delete().eq("id",relation.id);
    if(result.error)throw result.error;
    await refreshFriend();
    show(actionStatus,t("Статус дружби оновлено.","Friendship updated."));
   }catch(_){show(actionStatus,t("Не вдалося виконати дію.","Could not complete the action."));}
   finally{busy=false;friendButton.disabled=false;}
  });
 }
 loadFriends=async()=>{
  friends.replaceChildren();friendsEmpty.hidden=true;
  if(!isMine){
   show(friendsEmpty,t("Списки друзів інших користувачів приватні.","Other members' friend lists are private."));
   return;
  }
  try{
   const {data,error}=await client.from("vatra_friendships")
    .select("id,requester_id,recipient_id,status,created_at")
    .or("requester_id.eq."+ownId+",recipient_id.eq."+ownId)
    .order("created_at",{ascending:false}).limit(100);
   if(error)throw error;
   for(const item of data||[]){
    const incoming=String(item.recipient_id)===String(ownId);
    const other=String(incoming?item.requester_id:item.recipient_id);
    const status=item.status==="accepted"?t("У друзях","Friends"):
     incoming?t("Вхідна заявка","Incoming request"):t("Вихідна заявка","Outgoing request");
    const row=makePerson(other,status);
    const action=node("button","profile-person-action vt-profile-friend-action-"+other,
     item.status==="pending"&&incoming?t("Прийняти","Accept"):
     item.status==="accepted"?t("Видалити","Remove"):t("Скасувати","Cancel"));
    action.type="button";
    action.addEventListener("click",async()=>{
     action.disabled=true;
     try{
      const {error:changeError}=await (item.status==="pending"&&incoming?
       client.from("vatra_friendships").update({status:"accepted"}).eq("id",item.id):
       client.from("vatra_friendships").delete().eq("id",item.id));
      if(changeError)throw changeError;
      await loadFriends();
     }catch(_){action.disabled=false;show(friendsEmpty,t("Не вдалося оновити друзів.","Could not update friends."));}
    });
    row.append(action);friends.append(row);
   }
   if(!data?.length)show(friendsEmpty,t("Друзів і заявок поки немає.","No friends or requests yet."));
  }catch(_){show(friendsEmpty,t("Не вдалося завантажити друзів.","Could not load friends."));}
 };
 loadInbox=async()=>{
  inbox.replaceChildren();inboxEmpty.hidden=true;
  if(!isMine)return;
  try{
   const {data,error}=await client.from("vatra_direct_messages")
    .select("sender_id,recipient_id,created_at")
    .or("sender_id.eq."+ownId+",recipient_id.eq."+ownId)
    .order("created_at",{ascending:false}).limit(200);
   if(error)throw error;
   const seen=new Set();
   for(const item of data||[]){
    const other=String(item.sender_id)===String(ownId)?String(item.recipient_id):String(item.sender_id);
    if(seen.has(other))continue;
    seen.add(other);
    const row=makePerson(other,t("Останній діалог: ","Latest conversation: ")+dateText(item.created_at));
    const action=node("button","profile-person-action vt-profile-message-open-"+other,t("Написати","Message"));
    action.type="button";
    action.addEventListener("click",()=>void openConversation(other));
    row.append(action);inbox.append(row);
   }
   if(!seen.size)show(inboxEmpty,t("Діалогів поки немає.","No conversations yet."));
  }catch(_){show(inboxEmpty,t("Не вдалося завантажити повідомлення.","Could not load messages."));}
 };
}


function setupProfileEdit(client,targetId,isMine,initialStatus,signupGender){
 const displayed=q("#profile-status"),statusText=q("#profile-status-text");
 let saved=String(initialStatus||"").slice(0,140);
 const render=()=>{
  statusText.textContent=saved||(isMine?t("Додайте статус","Add a status"):"");
  displayed.hidden=!saved&&!isMine;
  displayed.disabled=!isMine;
  displayed.classList.toggle("is-editable",isMine);
  if(isMine)displayed.setAttribute("aria-label",t("Змінити статус","Edit status"));
 };
 render();
 if(!isMine)return;
 const dialog=q("#profile-status-dialog"),input=q("#profile-status-input"),
  count=q("#profile-status-counter"),save=q("#profile-status-save"),note=q("#profile-status-error");
 input.placeholder=t("Напишіть статус","Write a status");
 const counter=()=>{count.textContent=Array.from(input.value).length+" / 140";};
 const openStatus=()=>{input.value=saved;counter();note.hidden=true;dialog.showModal();input.focus();};
 displayed.addEventListener("click",openStatus);
 input.addEventListener("input",counter);
 q("#profile-status-cancel").addEventListener("click",()=>dialog.close());
 q("#profile-status-form").addEventListener("submit",async event=>{
  event.preventDefault();if(save.disabled)return;
  const next=input.value.trim();
  if(Array.from(next).length>140){note.textContent=t("Статус надто довгий.","Status is too long.");note.hidden=false;return;}
  save.disabled=true;note.hidden=true;
  try{
   const {data,error}=await client.from("vatra_public_profiles")
    .update({status_text:next||null}).eq("vatra_id",targetId).select("status_text").maybeSingle();
   if(error||!data)throw error||new Error("Not persisted");
   saved=String(data.status_text||"");render();dialog.close();
  }catch(_){note.textContent=t("Статус не збережено. Спробуйте ще раз.","Could not save status. Retry.");note.hidden=false;}
  finally{save.disabled=false;}
 });
 const edit=q("#profile-edit-open"),mediaDialog=q("#profile-edit-dialog");
 edit.hidden=false;
 edit.addEventListener("click",()=>{
  if(window.VATRA_PROFILE_DETAILS?.open)window.VATRA_PROFILE_DETAILS.open();
  else mediaDialog.showModal();
 });
 q("#profile-edit-cancel").addEventListener("click",()=>mediaDialog.close());
 q("#profile-edit-form").addEventListener("submit",event=>{event.preventDefault();mediaDialog.close();});
}
function setupProfilePresence(client,targetId,ownId,signupGender){
 const dot=q("#profile-online-dot"),caption=q("#profile-last-seen");
 if(!dot||!caption||!window.VATRA_PRESENCE)return;
 const refresh=async()=>{
  if(String(targetId)===String(ownId))
   await window.VATRA_PRESENCE.start(client,ownId,signupGender);
  const record=await window.VATRA_PRESENCE.load(client,targetId);
  const state=window.VATRA_PRESENCE.format(record,english);
  dot.hidden=!state.online;
  caption.textContent=state.text;
  caption.hidden=state.online||!state.text;
  if(state.date)caption.dateTime=state.date.toISOString();
  dot.setAttribute("aria-label",english?"Online now":"Зараз у мережі");
 };
 void refresh();
 // One small profile-specific read per two minutes; avoid polling the whole Feed.
 const timer=setInterval(()=>{if(!document.hidden)void refresh();},120000);
 window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
}

/* Only the signed-in owner can change profile images; Storage policies and
   vatra_profile_media RLS enforce this independently of the UI. */
async function setupProfileMedia(client,ownId,targetId,isMine,userId,ownerEmail,locked=false,preloadedMedia=null){
 const cover=q("#profile-cover-image"),coverPhoto=q("#profile-cover-photo"),avatar=q("#profile-avatar");
 const buttonAvatar=q("#profile-avatar-upload-button"),buttonCover=q("#profile-cover-upload-button");
 const fileAvatar=q("#profile-avatar-file"),fileCover=q("#profile-cover-file");
 const message=q("#profile-media-status");
 const avatarWrap=q("#profile-avatar-wrap"),avatarTrigger=q("#profile-avatar-trigger");
 const avatarMenu=q("#profile-avatar-menu"),storyButton=q("#profile-avatar-story");
 const photoButton=q("#profile-avatar-photo"),deleteStoryButton=q("#profile-avatar-story-delete"),coverView=q("#profile-cover-view");
 const mediaDialog=q("#profile-media-viewer"),mediaImage=q("#profile-media-viewer-image");
 const mediaHeading=q("#profile-media-viewer-heading"),storyDialog=q("#profile-story-viewer");
 const storyHeading=q("#profile-story-viewer-heading"),storyBody=q("#profile-story-viewer-text");
 const bucketFor=kind=>kind==="avatar"?"vatra-avatars":"vatra-covers";
 let saved=null,activeStory=null;
 const photoURLs={avatar:null,cover:null};
 const canViewPhoto=!locked;
 const status=(text,error=false)=>{
  message.textContent=text;message.hidden=!text;
  message.dataset.status=error?"error":"ok";
 };
 const getPublicPath=(path,kind)=>{
  if(typeof path!=="string"||!path.startsWith(targetId+"/"))return null;
  try{
   const result=client.storage.from(bucketFor(kind)).getPublicUrl(path);
   const url=result?.data?.publicUrl;
   if(!url)return null;
   const parsed=new URL(url);
   if(parsed.protocol!=="https:"||parsed.hostname!=="rjasunoawrxvetwadylh.supabase.co")return null;
   return url;
  }catch(_){return null;}
 };
 const setImage=(el,url)=>{
  el.style.backgroundImage="url("+JSON.stringify(url)+")";
  el.classList.add("has-photo");
 };
 const resetImage=el=>{
  el.classList.remove("has-photo");el.style.removeProperty("background-image");
 };
 const validPhoto=url=>new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(true);
  image.onerror=()=>resolve(false);
  image.src=url;
 });
 const closeAvatarMenu=()=>{
  avatarWrap.classList.remove("is-menu-open");
  avatarTrigger.setAttribute("aria-expanded","false");
 };
 const syncAvatarMenu=()=>{
  const hasPhoto=!!photoURLs.avatar,hasStory=!!activeStory;
  avatarWrap.classList.toggle("has-active-story",hasStory);
  avatarMenu.hidden=!canViewPhoto||!hasStory;
  storyButton.hidden=!canViewPhoto||!hasStory;
  photoButton.hidden=!canViewPhoto||!hasPhoto;
  deleteStoryButton.hidden=!hasStory||!isMine||!activeStory?.id;
  avatarTrigger.disabled=!canViewPhoto||(!hasPhoto&&!hasStory);
  avatarTrigger.setAttribute("aria-haspopup",hasStory?"menu":"false");
  avatarTrigger.setAttribute("aria-label",hasStory?
   t("Переглянути історію або фото","View story or photo"):
   t("Переглянути фото","View photo"));
  if(!hasPhoto&&!hasStory)closeAvatarMenu();
 };

 const interaction=q("#profile-avatar-engagement"),likesButton=q("#profile-photo-like");
 const likesCount=q("#profile-photo-like-count"),commentList=q("#profile-photo-comments");
 const commentForm=q("#profile-photo-comment-form"),commentInput=q("#profile-photo-comment-text");
 const commentSend=q("#profile-photo-comment-send"),commentStatus=q("#profile-photo-status");
 const shareButton=q("#profile-photo-share");
 const commentSort=q("#profile-photo-comment-sort"),photoCommentsMore=q("#profile-photo-comments-more");
 const commentSortNote=q("#profile-photo-comment-sort-note");
 let likeBusy=false,commentBusy=false,activityTicket=0,photoCommentOffset=0,photoCommentLoading=false;
 const photoPath=()=>saved?.avatar_path||null;
 const feedback=(value,bad=false)=>{
  commentStatus.hidden=!value;commentStatus.textContent=value;commentStatus.dataset.kind=bad?"error":"ok";
 };
 const updatePhotoSortCopy=()=>{
  q(".vt-profile-photo-sort-label-001").textContent=t("Показувати:","Show:");
  const options=commentSort.options;
  options[0].textContent=t("Найактуальніші","Most relevant");
  options[1].textContent=t("Найновіші","Newest");
  options[2].textContent=t("Усі коментарі","All comments");
  commentSortNote.textContent=commentSort.value==="relevant"?
   t("Спочатку друзі та коментарі з найбільшою кількістю вподобань.",
     "Friends and most-liked comments first."):
   commentSort.value==="newest"?
   t("Від нових до старих, без позначеного спаму.",
     "Newest first, excluding marked spam."):
   t("Усі доступні коментарі, включно з можливим спамом.",
     "All available comments, including potential spam.");
  photoCommentsMore.textContent=t("Показати ще","Show more");
 };
 updatePhotoSortCopy();
 async function reloadPhotoActivity(append=false,refreshLikes=true){
  const path=photoPath(),ticket=++activityTicket;
  if(!path)return;
  if(!append){photoCommentOffset=0;commentList.replaceChildren();photoCommentsMore.hidden=true;}
  commentList.setAttribute("aria-busy","true");photoCommentsMore.disabled=true;
  if(!append)feedback(t("Завантаження коментарів…","Loading comments…"));
  try{
   const commentsPromise=client.rpc("vatra_avatar_comment_page",{
    p_owner:Number(targetId),p_avatar_path:path,p_sort:commentSort.value,
    p_offset:photoCommentOffset,p_limit:12
   });
   const likesPromise=refreshLikes?Promise.all([
    client.from("vatra_avatar_likes").select("liker_id",{count:"exact",head:true})
     .eq("owner_vatra_id",targetId).eq("avatar_path",path),
    client.from("vatra_avatar_likes").select("liker_id")
     .eq("owner_vatra_id",targetId).eq("avatar_path",path).eq("liker_id",userId).limit(1)
   ]):Promise.resolve(null);
   const [comments,likeResults]=await Promise.all([commentsPromise,likesPromise]);
   if(comments.error)throw comments.error;
   if(likeResults){
    if(likeResults[0].error||likeResults[1].error)throw likeResults[0].error||likeResults[1].error;
    const liked=!!likeResults[1].data?.length;
    likesCount.textContent=String(likeResults[0].count||0);
    likesButton.setAttribute("aria-pressed",String(liked));
    likesButton.classList.toggle("is-liked",liked);
   }
   if(ticket!==activityTicket||path!==photoPath())return;
   const rows=comments.data||[];
   const {names,images}=await window.VATRA_POST_INTERACTIONS?.authorMap(client,rows)
    ||{names:new Map(),images:new Map()};
   const ids=rows.map(x=>x.id);
   let ownCommentLikes=new Set();
   if(ids.length){
    const reaction=await client.from("vatra_avatar_comment_likes").select("comment_id")
     .in("comment_id",ids).eq("liker_id",userId);
    if(!reaction.error)ownCommentLikes=new Set((reaction.data||[]).map(x=>x.comment_id));
   }
   if(ticket!==activityTicket||path!==photoPath())return;
   if(!append&&!rows.length)commentList.append(node("p","vt-profile-photo-no-comments-001",
    t("Коментарів поки немає.","No comments yet.")));
   for(const item of rows){
    const id=String(item.author_vatra_id);
    const member=names.get(id)||t("Учасник VATRA","VATRA member");
    const card=node("article","profile-photo-comment ui-profile-photo-comment-001");
    const head=node("div","profile-photo-comment-head ui-profile-photo-comment-head-001");
    const avatar=node("a","profile-photo-comment-avatar ui-profile-photo-comment-avatar-001",
     member.split(/\s+/).slice(0,2).map(x=>Array.from(x)[0]||"").join("").toLocaleUpperCase(locale));
    avatar.href=memberUrl(id);avatar.setAttribute("aria-label",member);
    if(images.has(id)){
     avatar.style.backgroundImage="url("+JSON.stringify(images.get(id))+")";
     avatar.classList.add("has-photo");avatar.textContent="";
    }
    const meta=node("div","profile-photo-comment-meta ui-profile-photo-comment-meta-001");
    const author=node("a","vt-profile-photo-comment-name-001",member);
    author.href=memberUrl(id);
    const stamp=node("time","vt-profile-photo-comment-time-001",dateText(item.created_at));
    stamp.dateTime=item.created_at;meta.append(author,stamp);head.append(avatar,meta);
    card.append(head,node("p","vt-profile-photo-comment-body-001",item.body));
    if(item.moderation_status==="possible_spam")
     card.append(node("small","vt-profile-photo-comment-spam-001",t("Можливий спам","Potential spam")));
    const reaction=node("button","vt-profile-photo-comment-like-001");
    reaction.type="button";
    let countValue=Number(item.likes)||0,reacted=ownCommentLikes.has(item.id);
    const paint=()=>{
     reaction.textContent=(reacted?"♥ ":"♡ ")+t("Подобається","Like")+
      (countValue?" · "+countValue:"");
     reaction.setAttribute("aria-pressed",String(reacted));
    };
    paint();
    reaction.addEventListener("click",async()=>{
     if(reaction.disabled)return;
     reaction.disabled=true;
     try{
      const result=reacted?
       await client.from("vatra_avatar_comment_likes").delete()
        .eq("comment_id",item.id).eq("liker_id",userId):
       await client.from("vatra_avatar_comment_likes").insert({comment_id:item.id,liker_id:userId});
      if(result.error)throw result.error;
      reacted=!reacted;countValue+=reacted?1:-1;paint();
     }catch(_){feedback(t("Не вдалося вподобати коментар.","Could not like the comment."),true);}
     finally{reaction.disabled=false;}
    });
    card.append(reaction);commentList.append(card);
   }
   photoCommentOffset+=rows.length;
   photoCommentsMore.hidden=rows.length<12;feedback("");
  }catch(_){
   if(ticket===activityTicket)feedback(t("Коментарі поки недоступні.","Comments are temporarily unavailable."),true);
  }finally{
   if(ticket===activityTicket){commentList.setAttribute("aria-busy","false");photoCommentsMore.disabled=false;}
  }
 }
 commentSort.addEventListener("change",()=>{updatePhotoSortCopy();void reloadPhotoActivity(false,false);});
 photoCommentsMore.addEventListener("click",()=>void reloadPhotoActivity(true,false));
 likesButton.addEventListener("click",async()=>{
  const path=photoPath();if(likeBusy||!path||!validId(ownId))return;
  likeBusy=true;likesButton.disabled=true;feedback("");
  try{
   const query=likesButton.getAttribute("aria-pressed")==="true"?
    client.from("vatra_avatar_likes").delete().eq("avatar_path",path).eq("liker_id",userId):
    client.from("vatra_avatar_likes").insert({owner_vatra_id:targetId,avatar_path:path,liker_id:userId});
   const {error}=await query;if(error)throw error;
   await reloadPhotoActivity();
  }catch(_){feedback(t("Не вдалося змінити вподобання.","Could not update like."),true);}
  finally{likeBusy=false;likesButton.disabled=false;}
 });
 commentForm.addEventListener("submit",async event=>{
  event.preventDefault();
  const path=photoPath(),body=commentInput.value.trim();
  if(commentBusy||!path||!body||Array.from(body).length>1000||!validId(ownId))return;
  commentBusy=true;commentSend.disabled=true;feedback("");
  try{
   const {error}=await client.from("vatra_avatar_comments").insert({
    owner_vatra_id:targetId,avatar_path:path,author_id:userId,author_vatra_id:ownId,body
   });
   if(error)throw error;
   commentInput.value="";await reloadPhotoActivity();
  }catch(_){feedback(t("Не вдалося додати коментар.","Could not add comment."),true);}
  finally{commentBusy=false;commentSend.disabled=false;}
 });
 shareButton.addEventListener("click",async()=>{
  const link=new URL("id"+targetId,home);link.searchParams.set("photo","avatar");
  try{
   if(navigator.share)await navigator.share({url:link.href});
   else if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(link.href);
    feedback(t("Посилання скопійовано.","Link copied."));
   }else feedback(link.href);
  }catch(error){if(error?.name!=="AbortError")feedback(t("Не вдалося поділитися.","Could not share."),true);}
 });
 q("#profile-photo-like-label").textContent=t("Подобається","Like");
 q("#profile-photo-share-label").textContent=t("Поділитися","Share");
 q("#profile-photo-comments-heading").textContent=t("Коментарі","Comments");
 q("#profile-photo-comment-text").placeholder=t("Написати коментар…","Write a comment…");
 q("#profile-photo-comment-send").textContent=t("Надіслати","Send");
 q(".vt-profile-photo-comment-label-001").textContent=t("Ваш коментар","Your comment");
 q("#profile-photo-kind").textContent=t("Фото","Photo");
 const openMedia=kind=>{
  if(!canViewPhoto)return;
  const url=photoURLs[kind];
  if(!url)return;
  mediaHeading.textContent=kind==="avatar"?t("Фото","Photo"):t("Обкладинка","Cover photo");
  mediaDialog.dataset.kind=kind;
  interaction.hidden=kind!=="avatar";
  if(kind==="avatar"){
   q("#profile-photo-owner").textContent=q("#profile-heading").textContent;
   void reloadPhotoActivity();
  }else activityTicket++;
  mediaImage.alt=mediaHeading.textContent+" — "+q("#profile-heading").textContent;
  mediaImage.src=url;
  closeAvatarMenu();
  mediaDialog.showModal();
 };
 window.VATRA_OPEN_PROFILE_AVATAR=()=>{if(canViewPhoto)openMedia("avatar");};
 const openStory=()=>{
  if(!canViewPhoto||!activeStory)return;
  if(Date.parse(activeStory.expires_at)<=Date.now()){
   activeStory=null;syncAvatarMenu();return;
  }
  storyHeading.textContent=q("#profile-heading").textContent;
  storyBody.textContent=activeStory.body;
  storyDialog.dataset.theme=String(activeStory.theme||0);
  closeAvatarMenu();
  storyDialog.showModal();
 };
 coverView.addEventListener("click",()=>openMedia("cover"));
 photoButton.addEventListener("click",()=>openMedia("avatar"));
 storyButton.addEventListener("click",openStory);
 deleteStoryButton.addEventListener("click",async()=>{
  if(!isMine||!activeStory?.id||deleteStoryButton.disabled)return;
  if(!window.confirm(t("Видалити цю історію?","Delete this story?")))return;
  const removingId=activeStory.id;
  deleteStoryButton.disabled=true;
  try{
   const result=await client.from("vatra_stories").delete()
    .eq("id",removingId).eq("author_vatra_id",ownId).select("id");
   if(result.error||!result.data?.some(row=>row.id===removingId))
    throw result.error||new Error("Story not deleted");
   activeStory=null;
   const next=await client.from("vatra_stories").select("id,body,theme,expires_at")
    .eq("author_vatra_id",ownId).gt("expires_at",new Date().toISOString())
    .order("created_at",{ascending:false}).limit(1);
   if(!next.error&&next.data?.[0])activeStory=next.data[0];
   if(storyDialog.open)storyDialog.close();
   closeAvatarMenu();syncAvatarMenu();
   status(t("Історію видалено.","Story deleted."));
  }catch(_){
   status(t("Не вдалося видалити історію. Спробуйте ще раз.",
    "Could not delete the story. Please retry."),true);
  }finally{deleteStoryButton.disabled=false;}
 });
 q("#profile-media-viewer-close").addEventListener("click",()=>mediaDialog.close());
 q("#profile-story-viewer-close").addEventListener("click",()=>storyDialog.close());
 mediaDialog.addEventListener("click",event=>{if(event.target===mediaDialog)mediaDialog.close();});
 storyDialog.addEventListener("click",event=>{if(event.target===storyDialog)storyDialog.close();});
 avatarTrigger.addEventListener("click",()=>{
  if(!canViewPhoto)return;
  if(activeStory){
   avatarWrap.classList.toggle("is-menu-open");
   avatarTrigger.setAttribute("aria-expanded",String(avatarWrap.classList.contains("is-menu-open")));
  }else if(photoURLs.avatar)openMedia("avatar");
 });
 avatarWrap.addEventListener("pointerleave",closeAvatarMenu);
 avatarWrap.addEventListener("keydown",event=>{
  if(event.key==="Escape"){
   closeAvatarMenu();avatarTrigger.focus();
  }else if(event.key==="ArrowDown"&&!avatarMenu.hidden){
   const item=[storyButton,photoButton,deleteStoryButton].find(button=>!button.hidden);
   if(item){event.preventDefault();item.focus();}
  }
 });
 document.addEventListener("pointerdown",event=>{
  if(!avatarWrap.contains(event.target))closeAvatarMenu();
 });
 // A real <img> is independent of the decorative CSS fallback, masks and pseudoelements.
 coverPhoto.addEventListener("load",()=>{
  if(!photoURLs.cover)return;
  coverPhoto.hidden=false;
  cover.classList.add("has-photo");
  coverView.hidden=!canViewPhoto;
 });
 coverPhoto.addEventListener("error",()=>{
  coverPhoto.hidden=true;coverView.hidden=true;
  cover.classList.remove("has-photo");
 });
 const display=record=>{
  photoURLs.cover=record?.cover_path?getPublicPath(record.cover_path,"cover"):null;
  photoURLs.avatar=record?.avatar_path?getPublicPath(record.avatar_path,"avatar"):null;
  if(isMine)window.VATRA_AVATAR?.fromPath(client,ownerEmail,ownId,record?.avatar_path||null);
  cover.style.removeProperty("background-image");
  cover.style.removeProperty("--vatra-cover-image");
  cover.classList.remove("has-photo");
  coverView.hidden=true;
  coverPhoto.hidden=true;
  if(photoURLs.cover)coverPhoto.src=photoURLs.cover;
  else coverPhoto.removeAttribute("src");
  const coverReady=photoURLs.cover&&typeof coverPhoto.decode==="function"?
   coverPhoto.decode().then(()=>{
    if(!photoURLs.cover)return;
    coverPhoto.hidden=false;cover.classList.add("has-photo");coverView.hidden=!canViewPhoto;
   }).catch(()=>{}):Promise.resolve();
  resetImage(avatar);
  const fallback=(q("#profile-heading")?.textContent||"V").trim().split(/\s+/)
   .map(word=>Array.from(word)[0]||"").slice(0,2).join("").toLocaleUpperCase()||"V";
  avatar.textContent=fallback;
  for(const postAvatar of document.querySelectorAll("#profile-posts .feed-post-avatar")){
   resetImage(postAvatar);postAvatar.textContent=fallback;
  }
  const candidate=photoURLs.avatar;
  let avatarReady=Promise.resolve();
  if(candidate)avatarReady=validPhoto(candidate).then(valid=>{
   if(photoURLs.avatar!==candidate)return;
   if(!valid){photoURLs.avatar=null;syncAvatarMenu();return;}
   setImage(avatar,candidate);avatar.textContent="";
   for(const postAvatar of document.querySelectorAll("#profile-posts .feed-post-avatar")){
    setImage(postAvatar,candidate);postAvatar.textContent="";
   }
   if(isMine){
    const menuAvatar=q("#feed-header-avatar");
    if(menuAvatar){setImage(menuAvatar,candidate);menuAvatar.textContent="";}
   }
  });
  syncAvatarMenu();
  return Promise.allSettled([avatarReady,coverReady]);
 };
 try{
  // Public profile photos are not part of friends-only posts or About fields.
  const request=()=>client.from("vatra_profile_media")
   .select("avatar_path,cover_path").eq("vatra_id",targetId).maybeSingle();
  let response=await (preloadedMedia||request());
  if(response?.error||!response?.data)response=await request();
  if(!response?.error&&response?.data){saved=response.data;await display(response.data);}
 }catch(_){/* Keep the profile usable when its public photos are unavailable. */}
 finally{
  cover.classList.remove("is-loading-media");
  avatarWrap.classList.remove("is-loading-media");
 }
 // No story request or interaction on a locked profile.
 if(!locked)try{
  const {data,error}=await client.from("vatra_stories")
   .select("id,body,theme,expires_at")
   .eq("author_vatra_id",targetId)
   .gt("expires_at",new Date().toISOString())
   .order("created_at",{ascending:false})
   .limit(1);
  if(!error&&Array.isArray(data)&&typeof data[0]?.body==="string")
   activeStory=data[0];
 }catch(_){/* An inaccessible story must not prevent loading the profile. */}
 syncAvatarMenu();
 if(!isMine||!validId(ownId))return;
 buttonAvatar.hidden=false;buttonCover.hidden=false;
 const fileTypes={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
 let uploading=false;
 async function uploadImage(file,kind){
  if(uploading)return;
  const ext=fileTypes[file?.type];
  if(!ext||!file?.size||file.size>6291456){
   status(t("Оберіть JPEG, PNG або WebP до 6 МБ.","Choose a JPEG, PNG or WebP under 6 MB."),true);return;
  }
  uploading=true;buttonAvatar.disabled=true;buttonCover.disabled=true;
  status(t("Завантажуємо зображення…","Uploading image…"));
  const filename=typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function"?
   crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),
    value=>value.toString(16).padStart(2,"0")).join("");
  const path=ownId+"/"+kind+"/"+filename+"."+ext;
  try{
   const {error:uploadError}=await client.storage.from(bucketFor(kind)).upload(path,file,{
    contentType:file.type,cacheControl:"3600",upsert:false
   });
   if(uploadError)throw uploadError;
   const column=kind==="avatar"?"avatar_path":"cover_path";
   const values={[column]:path,updated_at:new Date().toISOString()};
   const operation=saved?
    client.from("vatra_profile_media").update(values).eq("vatra_id",ownId)
     .select("vatra_id,"+column).maybeSingle():
    client.from("vatra_profile_media").insert({vatra_id:ownId,...values})
     .select("vatra_id,"+column).maybeSingle();
   const {data:stored,error:dbError}=await operation;
   if(dbError||String(stored?.[column]||"")!==path){
    // Do not remove the uploaded binary: the database may have committed while
    // its response was lost. Retain it for recovery rather than leave a broken
    // cover/avatar pointer to a physically deleted object.
    throw dbError||new Error("Profile media update did not persist");
   }
   // Never delete the former avatar or cover on replacement. The user may
   // restore it later; a separate version-history workflow controls retention.
   saved={...saved,...values};
   display(saved);
   if(kind==="avatar")window.VATRA_AVATAR?.fromPath(client,ownerEmail,ownId,path);
   status(t("Зображення збережено.","Image saved."));
  }catch(_){status(t("Не вдалося завантажити зображення. Спробуйте ще раз.",
   "Could not upload the image. Please retry."),true);}
  finally{
   uploading=false;buttonAvatar.disabled=false;buttonCover.disabled=false;
   fileAvatar.value="";fileCover.value="";
  }
 }
 buttonAvatar.addEventListener("click",()=>fileAvatar.click());
 buttonCover.addEventListener("click",()=>fileCover.click());
 fileAvatar.addEventListener("change",()=>{if(fileAvatar.files?.[0])void uploadImage(fileAvatar.files[0],"avatar");});
 fileCover.addEventListener("change",()=>{if(fileCover.files?.[0])void uploadImage(fileCover.files[0],"cover");});

}
async function loadOwnHeaderAvatar(client,ownId,email){
 if(!validId(ownId))return;
 try{
  const {data,error}=await client.from("vatra_profile_media")
   .select("avatar_path").eq("vatra_id",ownId).maybeSingle();
  if(error)return;
  // The shared cache validates the URL and warms the image once. Avoid a
  // second onerror handler that could clear a perfectly valid cached header
  // while a new profile route is still completing its media requests.
  window.VATRA_AVATAR?.fromPath(client,email,ownId,data?.avatar_path||null);
 }catch(_){/* Keep the known header portrait until it can be refreshed. */}
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
  const nameParts=cleanOwnName.split(/\s+/).filter(Boolean);
  const first=Array.from(nameParts[0]||"V")[0]||"V";
  const last=nameParts.length>1?(Array.from(nameParts[nameParts.length-1])[0]||""):"";
  const ownAvatar=(first+last).toLocaleUpperCase(locale);
  const {data:account,error:accountError}=await client.from("accounts")
   .select("vatra_id").eq("user_id",user.id).maybeSingle();
  const ownId=!accountError&&account?.vatra_id!=null?String(account.vatra_id):null;
  if(ownId){
   void window.VATRA_PRESENCE?.start(client,ownId,metadata.gender);
   window.VATRA_NOTIFICATIONS?.start(client,ownId);
  }
  const headerName=Array.from((typeof metadata.first_name==="string"&&metadata.first_name.trim()?metadata.first_name.trim():cleanOwnName.trim().split(/\s+/)[0])||"VATRA").slice(0,28).join("");
  window.VATRA_AVATAR?.setHeader({email:user.email,name:headerName,initials:ownAvatar,id:ownId});
  setMenuLink(ownId);
  // Keep the signed-in user's avatar even when a visited VATRA ID does not exist.
  window.VATRA_AVATAR?.applyRemembered(q("#feed-header-avatar"),user.email);
  void loadOwnHeaderAvatar(client,ownId,user.email);
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
   window.VATRA_AVATAR?.clearHeader();
   location.replace(home);
  });

  const query=new URLSearchParams(location.search);
  const requested=query.get("vatra_id")||
   location.pathname.match(/\/id([1-9][0-9]{0,18})$/)?.[1]||null;
  const targetId=requested||ownId;
  if(!validId(targetId)){missingProfile();return;}
  // Fetch the directory record and the RLS-safe public display name together.
  // Do not render the result before the directory confirms this ID exists.
  // Public display names are optional: a failed public lookup must not turn
  // an otherwise valid profile into a blank error page.
  const [directoryOutcome,publicOutcome]=await Promise.allSettled([
   client.from("vatra_directory")
    .select("vatra_id").eq("vatra_id",targetId).maybeSingle(),
   Promise.resolve().then(()=>client.from("vatra_public_profiles")
    .select("display_name,status_text").eq("vatra_id",targetId).maybeSingle())
  ]);
  if(directoryOutcome.status==="rejected")throw directoryOutcome.reason;
  const {data:member,error:directoryError}=directoryOutcome.value;
  if(directoryError)throw directoryError;
  if(!member){missingProfile();return;}
  const isMine=targetId===ownId;
  const createLink=q("#profile-write-post");
  if(createLink)createLink.hidden=!isMine;
  q("#profile-tab-friends").hidden=true;
  q("#profile-report-open").hidden=isMine;
  if(isMine)bindPostComposer(client,user,ownId);
  // The account creation trigger publishes only registered first/last names
  // to vatra_public_profiles. Birthdate, gender, email and auth UUID remain private.
  let publicName="",publicStatus="";
  const {data:publicProfile,error:publicError}=publicOutcome.status==="fulfilled"?
   publicOutcome.value:{data:null,error:true};
  if(!publicError&&typeof publicProfile?.display_name==="string"){
   publicName=publicProfile.display_name.trim();
   publicStatus=String(publicProfile.status_text||"").slice(0,140);
  }
  const fallback=t("Учасник VATRA","VATRA member")+" · ID "+targetId;
  const name=publicName||(isMine?cleanOwnName:fallback);
  q("#profile-heading").textContent=name;
  q("#profile-avatar").textContent=isMine?ownAvatar:(publicName?(
    publicName.trim().split(/\s+/).filter(Boolean).map(x=>Array.from(x)[0]).slice(0,2).join("").toLocaleUpperCase(locale)
   ):"V");
  setupProfileEdit(client,targetId,isMine,publicStatus,metadata.gender);
 
  if(isMine){
   q("#profile-about-text").textContent=t(
    "Інформацію про себе поки не додано.",
    "You have not added profile details yet.");
  }
  if(!isMine){
   q("#profile-about-heading").textContent=t("Про мене","About me");
   q("#profile-about-text").textContent=t(
    "Користувач ще не додав інформацію про себе.",
    "This member has not added profile details yet.");
  }
  // The browser tab identifies the member actually being viewed, not the generic
  // profile page. Never use the signed-in visitor's name for another member.
  const titleName=String(publicName||(isMine?cleanOwnName:t("Учасник VATRA","VATRA member")))
   .replace(/\s+/g," ").trim().slice(0,100)||t("Учасник VATRA","VATRA member");
  document.title=titleName+" · VATRA";
  // Start public avatar/cover loading before private detail and friendship checks.
  const preloadedMedia=Promise.resolve().then(()=>client.from("vatra_profile_media")
   .select("avatar_path,cover_path").eq("vatra_id",targetId).maybeSingle())
   .catch(()=>({data:null,error:true}));
  const access=await window.VATRA_PROFILE_DETAILS?.init({client,ownId,targetId,isMine});
  const locked=access?.locked===true;
  setupProfileInteractions(client,ownId,targetId,isMine);
  setupProfileReports(client,ownId,targetId,isMine,locked);
  if(!locked)void setupProfileSocialCards(client,ownId,targetId,isMine).catch(()=>{
   const f=q("#profile-friends-preview-empty"),g=q("#profile-gifts-preview-empty");
   if(f){f.textContent=t("Не вдалося завантажити друзів.","Could not load friends.");f.hidden=false;}
   if(g){g.textContent=t("Не вдалося завантажити подарунки.","Could not load gifts.");g.hidden=false;}
  });
  if(!locked){
   setupProfileExtraSections(client,ownId,targetId,user.id,isMine);
   setupProfileGallery(client,targetId);
   setupProfilePostFilters(client,targetId,ownId,user.id);
  }
  // Keep the skeleton until both real photos have loaded, rather than flashing
  // default avatar/cover followed by the user's real artwork.
  const mediaPromise=setupProfileMedia(client,ownId,targetId,isMine,user.id,user.email,locked,preloadedMedia);
  const sharedPhoto=new URLSearchParams(location.search).get("photo")==="avatar";
  const canonical=memberUrl(targetId);
  if(location.pathname!==new URL(canonical).pathname||location.search||location.hash){
   history.replaceState(history.state,"",canonical);
  }
  const list=q("#profile-posts");
  if(list){
   for(let i=0;i<2;i++){
    const card=node("div","feed-post-placeholder ui-profile-post-placeholder-00"+(i+1));
    card.setAttribute("aria-hidden","true");
    card.append(node("span","feed-post-placeholder-head ui-profile-post-placeholder-head-00"+(i+1)),
     node("span","feed-post-placeholder-line ui-profile-post-placeholder-line-00"+(i+1)));
    list.append(card);
   }
  }
  if(!locked)setupProfilePresence(client,targetId,ownId,metadata.gender);
  const postsPromise=locked?Promise.resolve():loadPosts(client,targetId,ownId,user.id);
  // Closed profiles show their public header media before the loading view clears.
  // Posts, stories and private details continue to respect the locked gate.
  if(locked)await mediaPromise;
  finish();
  void mediaPromise.catch(()=>{
   q("#profile-cover-image")?.classList.remove("is-loading-media");
   q("#profile-avatar-wrap")?.classList.remove("is-loading-media");
  });
  if(sharedPhoto&&!locked)void mediaPromise.then(()=>window.VATRA_OPEN_PROFILE_AVATAR?.());
  void postsPromise;
 }catch(error){
  console.error("[VATRA] Profile initialization failed:",error);
  gateError(t("Не вдалося завантажити профіль. Оновіть сторінку.",
   "Could not load this profile. Please refresh."));
 }
}
void start();
})();
