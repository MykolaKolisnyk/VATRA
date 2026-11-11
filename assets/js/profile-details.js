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
  const preference=await client.from("vatra_profile_preferences")
   .select("profile_visibility").eq("vatra_id",targetId).maybeSingle();
  // A preferences query failure must not be treated as an open account.
  let accountVisibility=preference.error?"friends":preference.data?.profile_visibility||"public";
  let isFriend=false;
  if(!isMine&&ownId){
   const friendship=await client.from("vatra_friendships")
    .select("id").or(
     "and(requester_id.eq."+ownId+",recipient_id.eq."+targetId+"),"+
     "and(requester_id.eq."+targetId+",recipient_id.eq."+ownId+")"
    ).eq("status","accepted").limit(1);
   isFriend=!friendship.error&&!!friendship.data?.length;
  }
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
   "short_bio","activities","hobbies","languages","school","university",
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
   const badge=make("span",detailed?
    "vatra-profile-detail-icon ui-vatra-profile-detail-icon-"+key:
    "vatra-profile-summary-icon ui-vatra-profile-summary-icon-"+key);
   badge.append(svg(fieldIcons[key]||"file-text"));
   badge.setAttribute("aria-hidden","true");
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
   item.append(badge,label,content);
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
    const sectionIcon=make("span","vatra-profile-details-section-icon ui-vatra-profile-details-section-icon-"+group.id);
    sectionIcon.append(svg(group.id==="overview"?"user":groups.find(x=>x.id===group.id)?.icon||"file-text"));
    headingRow.append(sectionIcon,head);section.append(headingRow);
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
   // Only one location can appear in the preview: current city takes priority.
   const locationKey=visibleField("city")?"city":visibleField("hometown")?"hometown":null;
   const selected=[locationKey,"relationship","website"].filter(key=>key&&visibleField(key));
   // Missing priority fields are replaced with other available, RLS-filtered values.
   for(const key of fallback){
    if(selected.length>=3)break;
    if(visibleField(key)&&!selected.includes(key))selected.push(key);
   }
   for(const key of selected.slice(0,3))sections.append(itemFor(key,false));
   const additional=[...fieldsByKey.keys()].filter(key=>visibleField(key)&&!selected.includes(key));
   const hasLongPreview=selected.some(key=>visibleField(key).length>32);
   more.hidden=locked||!!result.error||(!additional.length&&!hasLongPreview);
   paragraph.hidden=selected.length>0;
   if(!selected.length)paragraph.textContent=isMine?
    tr("Розкажіть трохи про себе. Ви самі визначаєте, хто це побачить.",
     "Tell others a little about yourself. You control who sees it."):
    tr("Користувач ще не додав доступної вам інформації.",
     "This member has not shared any information with you.");
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
  // Let the outgoing section dissolve while the next one softly appears.
  // Native view transitions do not delay Supabase saves or form navigation.
  let activeChapterTransition=null;
  const switchGroup=id=>{
   if(id===selected)return;
   if(workspace.hidden){showGroup(id);return;}
   const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
   if(!reduced&&typeof document.startViewTransition==="function"){
    document.documentElement.classList.add("vatra-editor-switching");
    try{
     const change=document.startViewTransition(()=>showGroup(id));
     activeChapterTransition=change;
     void change.finished.catch(()=>{}).finally(()=>{
      if(activeChapterTransition===change){
       activeChapterTransition=null;
       document.documentElement.classList.remove("vatra-editor-switching");
      }
     });
    }catch(_){
     document.documentElement.classList.remove("vatra-editor-switching");
     showGroup(id);
    }
   }else{
    showGroup(id);
    if(!reduced)window.VATRA_MOTION?.reveal(fields);
   }
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
