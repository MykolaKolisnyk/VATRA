



(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const tr=(uk,en)=>document.documentElement.lang==="en"?en:uk;
 const select=selector=>document.querySelector(selector);


 window.VATRA_PROFILE_CONFIRM=({title,description,action,tone="danger"})=>{
  const dialog=select("#profile-confirm-dialog");
  const heading=select("#profile-confirm-heading");
  const detail=select("#profile-confirm-description");
  const accept=select("#profile-confirm-accept");
  const cancel=select("#profile-confirm-cancel");
  const close=select("#profile-confirm-close");
  if(!dialog||!heading||!detail||!accept||!cancel||!close||dialog.open)
   return Promise.resolve(false);
  heading.textContent=String(title||"");
  detail.textContent=String(description||"");
  accept.textContent=String(action||tr("Підтвердити","Confirm"));
  cancel.textContent=tr("Скасувати","Cancel");
  dialog.dataset.tone=tone==="primary"?"primary":"danger";
  return new Promise(resolve=>{
   const events=new AbortController();
   const finish=approved=>{
    events.abort();
    if(dialog.open)dialog.close();
    resolve(approved);
   };
   accept.addEventListener("click",()=>finish(true),{signal:events.signal});
   cancel.addEventListener("click",()=>finish(false),{signal:events.signal});
   close.addEventListener("click",()=>finish(false),{signal:events.signal});
   dialog.addEventListener("close",()=>finish(false),{signal:events.signal});
   dialog.addEventListener("click",event=>{
    if(event.target===dialog)finish(false);
   },{signal:events.signal});
   dialog.showModal();
   cancel.focus({preventScroll:true});
  });
 };
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
 const choices={
  relationship:[["Неодружений / незаміжня","Single"],["Зустрічаюся","In a relationship"],["Заручений / заручена","Engaged"],["Одружений / заміжня","Married"],["У цивільному шлюбі","In a domestic partnership"],["Закоханий / закохана","In love"],["Усе складно","It's complicated"],["В активному пошуку","Looking for a relationship"],["Розлучений / розлучена","Divorced"],["Вдівець / вдова","Widowed"]],
  political_views:[["Ліберальні","Liberal"],["Консервативні","Conservative"],["Соціал-демократичні","Social democratic"],["Соціалістичні","Socialist"],["Лібертаріанські","Libertarian"],["Центристські","Centrist"],["Національно-демократичні","National democratic"],["Помірковані","Moderate"],["Аполітичні","Apolitical"],["Інші","Other"]],
  worldview:[["Православ’я","Orthodox Christianity"],["Католицизм","Catholicism"],["Греко-католицизм","Greek Catholicism"],["Протестантизм","Protestantism"],["Іслам","Islam"],["Юдаїзм","Judaism"],["Буддизм","Buddhism"],["Індуїзм","Hinduism"],["Атеїзм","Atheism"],["Агностицизм","Agnosticism"],["Світський гуманізм","Secular humanism"],["Інший","Other"]],
  life_priorities:[["Родина та діти","Family and children"],["Здоров’я","Health"],["Кар’єра та фінанси","Career and finances"],["Саморозвиток","Personal development"],["Свобода та незалежність","Freedom and independence"],["Наука та знання","Science and knowledge"],["Творчість","Creativity"],["Дружба та стосунки","Friendship and relationships"],["Допомога людям","Helping others"],["Інше","Other"]],
  important_in_people:[["Доброта та чесність","Kindness and honesty"],["Розум та освіченість","Intelligence and education"],["Вірність та надійність","Loyalty and reliability"],["Сміливість та завзятість","Courage and determination"],["Гумор та життєлюбство","Humor and love of life"],["Повага та емпатія","Respect and empathy"],["Краса та здоров’я","Beauty and health"],["Інше","Other"]],
  attitude_to_smoking:[["Різко негативне","Strongly negative"],["Негативне","Negative"],["Компромісне","Compromising"],["Нейтральне","Neutral"],["Позитивне","Positive"]],
  attitude_to_alcohol:[["Різко негативне","Strongly negative"],["Негативне","Negative"],["Компромісне","Compromising"],["Нейтральне","Neutral"],["Позитивне","Positive"]]
 };
 const languages=["Українська","English","Polski","Deutsch","Français","Italiano","Español","Português","Čeština","Slovenčina","Magyar","Română","Български","ქართული","Lietuvių","Latviešu","Eesti","Nederlands","Svenska","Norsk","Dansk","Suomi","Ελληνικά","Türkçe","Русский","Беларуская","العربية","עברית","中文","日本語","한국어","हिन्दी"];
 const cities=["Київ","Харків","Одеса","Львів","Дніпро","Запоріжжя","Ужгород","Мукачево","Івано-Франківськ","Тернопіль","Чернівці","Луцьк","Рівне","Хмельницький","Вінниця","Житомир","Черкаси","Чернігів","Суми","Полтава","Кропивницький","Миколаїв","Херсон","Донецьк","Луганськ","Сімферополь","Севастополь","Кривий Ріг","Кременчук","Біла Церква","Кам’янець-Подільський","Берегове","Хуст","Тячів","Рахів","Свалява","Варшава","Краків","Прага","Берлін","Відень","Братислава","Будапешт","Лондон","Париж"];
 const choiceLabel=(key,value)=>{const match=choices[key]?.find(pair=>pair.includes(value));return match?tr(match[0],match[1]):value;};
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
   "file-text":"M6 2h8l5 5v15H6zM14 2v5h5M9 12h7M9 16h7",
   x:"M6 6l12 12M18 6 6 18"
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
 async function init({client,ownId,targetId,isMine,blockAccess=null}){
  const card=select("#profile-about-card");
  const paragraph=select("#profile-about-text");
  const emptyInfo=select("#profile-about-empty");


  const preferenceQuery=client.from("profile_preferences")
   .select("profile_visibility").eq("vatra_id",targetId).maybeSingle();
  const friendshipQuery=!isMine&&ownId?
   client.from("friendships")
    .select("id").or(
     "and(requester_id.eq."+ownId+",recipient_id.eq."+targetId+"),"+
     "and(requester_id.eq."+targetId+",recipient_id.eq."+ownId+")"
    ).eq("status","accepted").limit(1):
   Promise.resolve({data:[],error:null});
  const [preference,friendship]=await Promise.all([preferenceQuery,friendshipQuery]);

  let accountVisibility=preference.error?"friends":preference.data?.profile_visibility||"public";
  const isFriend=!friendship.error&&!!friendship.data?.length;
  const blocked=!isMine&&(blockAccess?.blockedByThem||blockAccess?.blockedByMe);
  const locked=!isMine&&(blocked||(accountVisibility==="friends"&&!isFriend));
  const result=locked?{data:[],error:null}:await client.from("profile_details")
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
  const closeModal=make("button","vt-vatra-profile-details-close-001");
  closeModal.append(svg("x"));
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
   }else content.textContent=choiceLabel(key,data.value);
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
   card.classList.remove("is-empty");
   if(emptyInfo)emptyInfo.hidden=true;
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


   const bio=visibleField("short_bio");
   paragraph.textContent=bio;
   paragraph.hidden=!bio;

   const locationKey=visibleField("city")?"city":visibleField("hometown")?"hometown":null;
   const selected=[locationKey,"relationship","website"].filter(key=>key&&visibleField(key));

   for(const key of fallback){
    if(selected.length>=3)break;
    if(visibleField(key)&&!selected.includes(key))selected.push(key);
   }
   for(const key of selected.slice(0,3))sections.append(itemFor(key,false));
   const noDetails=!bio&&!selected.length;
   card.classList.toggle("is-empty",noDetails);
   if(emptyInfo)emptyInfo.hidden=!noDetails;
   const additional=[...fieldsByKey.keys()].filter(key=>
    key!=="short_bio"&&visibleField(key)&&!selected.includes(key));
   const hasLongPreview=selected.some(key=>visibleField(key).length>32);
   more.hidden=!additional.length&&!hasLongPreview;
  };
  if(card){card.append(sections,more);renderInfo();}
  if(locked){
   if(!blocked)select(".social-profile-tabs")?.setAttribute("hidden","");
   select(".profile-panels")?.setAttribute("hidden","");
   if(blocked)document.body.dataset.memberBlocked="true";
   select("#profile-status")?.setAttribute("hidden","");
   const status=select("#profile-status-text");if(status)status.textContent="";
   const notice=make("section","profile-locked-notice ui-profile-locked-notice-001");
   notice.setAttribute("role","status");
   if(blocked)notice.dataset.lockReason="block";
   notice.append(svg("lock"));
   const copy=make("div","ui-profile-locked-notice-content-001");
   copy.append(make("h2","vt-profile-locked-heading-001",
    blockAccess?.blockedByThem?
     tr("Доступ до сторінки обмежено","Access to this profile is restricted"):
    blockAccess?.blockedByMe?
     tr("Ви заблокували цього користувача","You blocked this member"):
     tr("Ця сторінка закрита","This profile is private")));
   copy.append(make("p","vt-profile-locked-description-001",
    blockAccess?.blockedByThem?
     tr("Користувач обмежив вам доступ до своєї сторінки.",
      "This member has restricted your access to their profile."):
    blockAccess?.blockedByMe?
     tr("Ви можете розблокувати користувача за допомогою іконки вище.",
      "Use the icon above to unblock this member."):
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
   make("strong","vt-profile-editor-nav-title-001",tr("Особисті дані","Personal details")),
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
  sidebar.append(menu,navFoot);layout.append(primary,sidebar);
  workspace.append(heading,layout);main.append(workspace);
  let selected="profile",visibility=accountVisibility;
  const hasChanges=()=>[...draft.keys()].some(key=>
   (draft.get(key)?.value||"")!==(saved.get(key)?.value||"")||
   (draft.get(key)?.visibility||"friends")!==(saved.get(key)?.visibility||"friends"))||
   visibility!==accountVisibility;
  const close=async()=>{
   closeEditorMenu();
   if(hasChanges()&&!await window.VATRA_PROFILE_CONFIRM({
    title:tr("Вийти без збереження?","Leave without saving?"),
    description:tr("Незбережені зміни у вашому профілі буде втрачено.",
     "Your unsaved profile changes will be lost."),
    action:tr("Вийти","Leave")
   }))return;
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
  const recordDialog=make("dialog","vatra-profile-editor-record-dialog ui-profile-editor-record-dialog-001");
  recordDialog.setAttribute("aria-labelledby","profile-editor-record-title");
  const recordForm=make("form","ui-profile-editor-record-form-001");
  const recordHead=make("header","ui-profile-editor-record-head-001");
  const recordTitle=make("h2","vt-profile-editor-record-title-001");
  recordTitle.id="profile-editor-record-title";
  const recordClose=make("button","vt-profile-editor-record-close-001");recordClose.type="button";recordClose.append(svg("x"));recordClose.setAttribute("aria-label",tr("Закрити","Close"));
  recordHead.append(recordTitle,recordClose);
  const recordFields=make("div","profile-editor-fields ui-profile-editor-record-fields-001");
  const recordFoot=make("footer","ui-profile-editor-record-footer-001");
  const recordCancel=make("button","vt-profile-editor-record-cancel-001",tr("Скасувати","Cancel"));recordCancel.type="button";
  const recordSave=make("button","vt-profile-editor-record-save-001",tr("Зберегти","Save"));recordSave.type="submit";
  recordFoot.append(recordCancel,recordSave);recordForm.append(recordHead,recordFields,recordFoot);recordDialog.append(recordForm);document.body.append(recordDialog);
  let recordSnapshot=null;
  const cancelRecord=()=>{
   closeEditorMenu();
   if(recordSnapshot)for(const [key,value] of recordSnapshot){if(value)draft.set(key,value);else draft.delete(key);}
   recordSnapshot=null;if(recordDialog.open)recordDialog.close();
  };
  recordClose.addEventListener("click",cancelRecord);recordCancel.addEventListener("click",cancelRecord);
  recordDialog.addEventListener("cancel",event=>{event.preventDefault();cancelRecord();});
  recordDialog.addEventListener("click",event=>{if(event.target===recordDialog)cancelRecord();});
  recordDialog.addEventListener("close",()=>{if(recordSnapshot)cancelRecord();});
  recordForm.addEventListener("submit",event=>{
   event.preventDefault();closeEditorMenu();recordSnapshot=null;recordDialog.close();showGroup(selected);form.requestSubmit(save);
  });
  let editorMenu=null,editorMenuSerial=0;
  const menuArrow=()=>{
   const ns="http://www.w3.org/2000/svg",icon=document.createElementNS(ns,"svg"),path=document.createElementNS(ns,"path");
   icon.setAttribute("class","ui-profile-editor-dropdown-arrow-001");icon.setAttribute("viewBox","0 0 20 20");icon.setAttribute("aria-hidden","true");
   path.setAttribute("class","ui-profile-editor-dropdown-arrow-path-001");path.setAttribute("d","m5.5 8 4.5 4.5L14.5 8");path.setAttribute("fill","none");path.setAttribute("stroke","currentColor");path.setAttribute("stroke-width","1.7");path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");icon.append(path);return icon;
  };
  const closeEditorMenu=()=>{
   const state=editorMenu;if(!state)return;
   editorMenu=null;
   state.anchor.setAttribute("aria-expanded","false");
   state.anchor.removeAttribute("aria-activedescendant");state.anchor.removeAttribute("aria-controls");
   state.wrapper.classList.remove("is-open");
   if(typeof state.panel.hidePopover==="function")try{state.panel.hidePopover();}catch(_){}
   state.panel.remove();
  };
  const positionEditorMenu=()=>{
   const state=editorMenu;if(!state)return;
   if(!state.anchor.isConnected||!state.anchor.getClientRects().length){closeEditorMenu();return;}
   const rect=state.wrapper.getBoundingClientRect(),v=window.visualViewport;
   const left=v?.offsetLeft||0,top=v?.offsetTop||0,width=v?.width||window.innerWidth,height=v?.height||window.innerHeight;
   if(rect.bottom<top||rect.top>top+height){closeEditorMenu();return;}
   const compact=state.wrapper.dataset.variant==="compact";
   const w=Math.min(Math.max(rect.width,compact?190:0),width-16);
   const x=Math.max(left+8,Math.min(compact?rect.right-w:rect.left,left+width-w-8));
   const down=top+height-rect.bottom-9,up=rect.top-top-9;

   state.panel.style.width=Math.round(w)+"px";
   const desired=Math.min(300,state.panel.scrollHeight+2);
   const above=down<Math.min(desired,160)&&up>down;
   const space=Math.max(0,above?up:down);
   if(space<45){closeEditorMenu();return;}
   state.panel.style.maxHeight=Math.floor(Math.min(300,space))+"px";state.panel.style.left=Math.round(x)+"px";
   state.panel.style.top=Math.round(above?rect.top-state.panel.offsetHeight-6:rect.bottom+6)+"px";
  };
  const markEditorOption=(state,index,scroll=false)=>{
   if(index<0||index>=state.buttons.length||state.items[index].disabled)return;
   state.index=index;
   state.buttons.forEach((button,i)=>button.classList.toggle("is-highlighted",i===state.index));
   const button=state.buttons[state.index];
   state.anchor.setAttribute("aria-activedescendant",button.id);
   if(scroll){

    const bounds=state.panel.getBoundingClientRect(),option=button.getBoundingClientRect();
    if(option.top<bounds.top)state.panel.scrollTop+=option.top-bounds.top;
    else if(option.bottom>bounds.bottom)state.panel.scrollTop+=option.bottom-bounds.bottom;
   }
  };
  const chooseEditorOption=(state,index)=>{
   if(editorMenu!==state)return;
   const item=state.items[index];if(!item||item.disabled)return;
   closeEditorMenu();state.choose(item.value);
  };
  const openEditorMenu=(anchor,wrapper,items,choose,selectedValue,keyboard=false)=>{
   closeEditorMenu();
   const panel=make("div","ui-profile-editor-dropdown-panel-001");
   panel.id="vatra-editor-options-"+(++editorMenuSerial);panel.setAttribute("role","listbox");
   panel.setAttribute("aria-label",anchor.getAttribute("aria-label")||tr("Варіанти","Options"));
   const state={anchor,wrapper,items,choose,panel,selectedValue,buttons:[],index:-1,search:"",searchTime:0};
   editorMenu=state;anchor.setAttribute("aria-expanded","true");anchor.setAttribute("aria-controls",panel.id);wrapper.classList.add("is-open");
   items.forEach((item,index)=>{
    const button=make("button","vt-profile-editor-dropdown-option-001");
    button.id=panel.id+"-"+index;button.type="button";button.tabIndex=-1;button.setAttribute("role","option");
    const selected=item.value===selectedValue;button.setAttribute("aria-selected",String(selected));button.classList.toggle("is-selected",selected);
    if(item.icon){const symbol=svg(item.icon);symbol.classList.add("ui-profile-editor-option-symbol-001");button.append(symbol);}
    button.append(make("span","vt-profile-editor-dropdown-option-label-001",item.text));
    if(selected){const check=svg("check");check.classList.add("ui-profile-editor-option-check-001");button.append(check);}
    button.disabled=Boolean(item.disabled);
    button.addEventListener("pointerdown",event=>event.preventDefault());
    button.addEventListener("pointerenter",event=>{if(event.pointerType==="mouse"&&!button.disabled)markEditorOption(state,index);});
    button.addEventListener("click",()=>chooseEditorOption(state,index));
    panel.append(button);state.buttons.push(button);
   });
   if(!items.length)panel.append(make("p","vt-profile-editor-dropdown-empty-001",tr("Немає збігів. Можна ввести власне значення.","No matches. You can enter your own value.")));
   const host=anchor.closest("dialog[open]")||document.body;
   host.append(panel);
   if(typeof panel.showPopover==="function"){
    panel.setAttribute("popover","manual");
    try{panel.showPopover();}catch(_){panel.removeAttribute("popover");}
   }
   positionEditorMenu();
   if(editorMenu===state&&keyboard&&items.length){
    const index=items.findIndex(item=>!item.disabled&&item.value===selectedValue);
    markEditorOption(state,index<0?items.findIndex(item=>!item.disabled):index,true);
   }
   return state;
  };
  const dropdownKeys=(anchor,open,event,editable=false)=>{
   const current=editorMenu?.anchor===anchor?editorMenu:null;
   if(event.key==="Tab"){if(current)closeEditorMenu();return;}
   if(event.key==="Escape"&&current){event.preventDefault();event.stopPropagation();closeEditorMenu();return;}
   if(event.key==="ArrowDown"||event.key==="ArrowUp"){
    event.preventDefault();
    const step=event.key==="ArrowUp"?-1:1;
    if(!current){
     const state=open(true);
     if(editorMenu===state&&step===-1&&state.index<0){
      const enabled=state.items.map((item,i)=>item.disabled?-1:i).filter(i=>i>=0);
      markEditorOption(state,enabled[enabled.length-1]??-1,true);
     }
    }else{
     const enabled=current.items.map((item,i)=>item.disabled?-1:i).filter(i=>i>=0);
     const index=enabled.indexOf(current.index);
     if(enabled.length)markEditorOption(current,enabled[index<0?(step===1?0:enabled.length-1):Math.max(0,Math.min(enabled.length-1,index+step))],true);
    }
    return;
   }
   if(current&&(event.key==="Home"||event.key==="End")&&!editable){
    event.preventDefault();const enabled=current.items.map((item,i)=>item.disabled?-1:i).filter(i=>i>=0);
    markEditorOption(current,enabled[event.key==="Home"?0:enabled.length-1]??-1,true);return;
   }
   if(event.key==="Enter"||(!editable&&event.key===" ")){
    if(current){
     event.preventDefault();
     let index=current.index;
     if(index<0&&!editable){
      index=current.items.findIndex(item=>!item.disabled&&item.value===current.selectedValue);
      if(index<0)index=current.items.findIndex(item=>!item.disabled);
     }
     if(index>=0)chooseEditorOption(current,index);else closeEditorMenu();
     return;
    }
    if(!editable){event.preventDefault();open(true);return;}
   }
   if(!editable&&event.key.length===1&&event.key!==" "&&!event.ctrlKey&&!event.altKey&&!event.metaKey){
    event.preventDefault();const state=current||open(false);
    if(editorMenu!==state)return;
    const now=Date.now();state.search=(now-state.searchTime>700?"":state.search)+event.key.toLocaleLowerCase();state.searchTime=now;
    const index=state.items.findIndex(item=>!item.disabled&&item.text.toLocaleLowerCase().startsWith(state.search));
    if(index>=0)markEditorOption(state,index,true);
   }
  };
  const audienceIcon=value=>value==="public"?"globe":value==="only_me"?"lock":"users";
  const enhanceEditorSelect=(native,variant="normal")=>{
   const id=native.id,wrapper=make("div","vatra-editor-select ui-profile-editor-select-"+id);
   wrapper.dataset.variant=variant;
   const button=make("button","vt-profile-editor-select-trigger-001");button.type="button";button.id=id;
   button.setAttribute("role","combobox");button.setAttribute("aria-haspopup","listbox");button.setAttribute("aria-expanded","false");
   button.setAttribute("aria-label",native.getAttribute("aria-label")||tr("Обрати значення","Choose a value"));
   const caption=make("span","vt-profile-editor-select-value-001");
   const iconWrap=make("span","ui-profile-editor-select-symbol-001");
   if(variant==="compact")button.append(iconWrap);
   button.append(caption,menuArrow());
   native.id=id+"-native";native.hidden=true;native.tabIndex=-1;native.setAttribute("aria-hidden","true");
   native.before(wrapper);wrapper.append(native,button);
   const sync=()=>{
    const option=native.options[native.selectedIndex];
    caption.textContent=option?.textContent||tr("Не вибрано","Not selected");
    button.classList.toggle("is-placeholder",!native.value);
    button.disabled=native.disabled;
    if(variant==="compact")iconWrap.replaceChildren(svg(audienceIcon(native.value)));
   };
   const open=keyboard=>{
    const items=Array.from(native.options).map(option=>({value:option.value,text:option.textContent,disabled:option.disabled,icon:variant==="compact"?audienceIcon(option.value):null}));
    return openEditorMenu(button,wrapper,items,value=>{native.value=value;native.dispatchEvent(new Event("change",{bubbles:true}));sync();},native.value,keyboard);
   };
   native.addEventListener("change",sync);sync();
   button.addEventListener("click",()=>{if(editorMenu?.anchor===button)closeEditorMenu();else open(false);});
   button.addEventListener("keydown",event=>dropdownKeys(button,open,event));
   button.addEventListener("blur",event=>{if(editorMenu?.anchor===button&&!editorMenu.panel.contains(event.relatedTarget))closeEditorMenu();});
   return {sync,focus:()=>button.focus()};
  };
  const enhanceCityInput=input=>{
   const wrapper=make("div","vatra-editor-city ui-profile-editor-city-"+input.id);
   const arrow=make("button","vt-profile-editor-city-toggle-001");arrow.type="button";arrow.tabIndex=-1;
   arrow.setAttribute("aria-label",tr("Список міст","City suggestions"));arrow.append(menuArrow());
   input.before(wrapper);wrapper.append(input,arrow);
   input.setAttribute("role","combobox");input.setAttribute("aria-autocomplete","list");input.setAttribute("aria-expanded","false");input.setAttribute("aria-haspopup","listbox");
   input.setAttribute("aria-label",input.id.endsWith("hometown")?tr("Рідне місто","Hometown"):tr("Місто","City"));
   const open=(keyboard=false,all=false)=>{
    const query=all?"":input.value.trim().toLocaleLowerCase();
    const items=cities.filter(city=>!query||city.toLocaleLowerCase().includes(query)).map(city=>({value:city,text:city}));
    return openEditorMenu(input,wrapper,items,value=>{input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}));closeEditorMenu();},input.value,keyboard);
   };
   input.addEventListener("input",()=>open(false));
   input.addEventListener("click",()=>{if(editorMenu?.anchor!==input)open(false,true);});
   input.addEventListener("keydown",event=>dropdownKeys(input,keyboard=>open(keyboard),event,true));
   input.addEventListener("blur",event=>{if(editorMenu?.anchor===input&&!wrapper.contains(event.relatedTarget)&&!editorMenu.panel.contains(event.relatedTarget))closeEditorMenu();});
   arrow.addEventListener("pointerdown",event=>event.preventDefault());
   arrow.addEventListener("click",()=>{input.focus({preventScroll:true});if(editorMenu?.anchor===input)closeEditorMenu();else open(false,true);});
  };
  document.addEventListener("pointerdown",event=>{
   if(editorMenu&&!editorMenu.wrapper.contains(event.target)&&!editorMenu.panel.contains(event.target))closeEditorMenu();
  },true);
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&editorMenu){event.preventDefault();event.stopPropagation();closeEditorMenu();}},true);
  window.addEventListener("scroll",event=>{if(editorMenu&&(!(event.target instanceof Node)||!editorMenu.panel.contains(event.target)))positionEditorMenu();},{capture:true,passive:true});
  window.addEventListener("resize",positionEditorMenu,{passive:true});
  window.visualViewport?.addEventListener("resize",positionEditorMenu,{passive:true});
  window.visualViewport?.addEventListener("scroll",positionEditorMenu,{passive:true});
  const buildField=([key,uk,en,kind],destination)=>{
   const row=make("div","profile-editor-field ui-profile-editor-field-"+key);
   row.dataset.long=kind==="long"?"true":"false";
   const lab=make("label","vt-profile-editor-label-"+key,tr(uk,en));
   const current=draft.get(key)||{value:"",visibility:"friends"};
   const disclosure=make("div","ui-profile-editor-disclosure-"+key);
   disclosure.append(make("span","vt-profile-editor-disclosure-label-"+key,tr("Хто бачить","Visible to")));
   const selectBox=make("select","ui-profile-editor-visibility-"+key);
   selectBox.id="profile-editor-visibility-"+key;
   selectBox.setAttribute("aria-label",tr("Видимість поля: ","Visibility of field: ")+tr(uk,en));
   for(const [value,labelUa,labelEn] of audiences)selectBox.append(opt(value,tr(labelUa,labelEn)));
   selectBox.value=current.visibility;
   if(!selectBox.value)selectBox.value="friends";
   disclosure.append(selectBox);
   const control=make("div","ui-profile-editor-field-control-"+key);
   const inputId="profile-editor-"+key;
   let readValue;
   if(key==="languages"){
    const selectedLanguages=[...new Set(current.value.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean))];
    const wrap=make("div","ui-profile-editor-language-box-001");
    const chips=make("div","ui-profile-editor-language-chips-001");
    const picker=make("select","ui-profile-editor-input-languages");picker.id=inputId;
    picker.setAttribute("aria-label",tr(uk,en));let pickerView=null;
    const render=()=>{
     chips.replaceChildren();picker.replaceChildren(opt("",tr("Додати мову","Add a language")));
     for(const value of selectedLanguages){
      const chip=make("button","vt-profile-editor-language-chip-001");chip.type="button";
      chip.append(make("span","vt-profile-editor-language-chip-label-001",value),svg("x"));
      chip.setAttribute("aria-label",tr("Видалити мову: ","Remove language: ")+value);
      chip.addEventListener("click",()=>{selectedLanguages.splice(selectedLanguages.indexOf(value),1);render();update();pickerView?.focus();});
      chips.append(chip);
     }
     chips.hidden=!selectedLanguages.length;
     for(const value of languages)if(!selectedLanguages.includes(value))picker.append(opt(value,value));
     picker.value="";pickerView?.sync();
    };
    readValue=()=>selectedLanguages.join(", ");
    const update=()=>draft.set(key,{value:readValue(),visibility:selectBox.value});
    picker.addEventListener("change",()=>{if(picker.value&&readValue().length+picker.value.length+2<=1000){selectedLanguages.push(picker.value);render();update();}});
    render();wrap.append(chips,picker);control.append(wrap);pickerView=enhanceEditorSelect(picker);
   }else{
    const menu=choices[key];
    const input=make(menu?"select":kind==="long"?"textarea":"input","ui-profile-editor-input-"+key);
    input.id=inputId;input.setAttribute("aria-label",tr(uk,en));
    if(menu){
     input.append(opt("",tr("Не вибрано","Not selected")));
     for(const pair of menu)input.append(opt(pair[0],lang(pair)));
     if(current.value&&!menu.some(pair=>pair[0]===current.value))input.append(opt(current.value,choiceLabel(key,current.value)));
    }else{
     if(kind==="long")input.rows=3;
     else input.type=["mobile_phone","additional_phone"].includes(key)?"tel":"text";
     input.maxLength=1000;input.spellcheck=kind==="long";
     input.placeholder=key==="short_bio"?tr("Розкажіть про себе","Tell us about yourself"):"";
     if(key==="city"||key==="hometown"){
      input.autocomplete="off";
     }
    }
    input.value=current.value;readValue=()=>input.value;
    control.append(input);input.addEventListener(menu?"change":"input",()=>update());
    if(menu)enhanceEditorSelect(input);else if(key==="city"||key==="hometown")enhanceCityInput(input);
   }
   lab.htmlFor=inputId;control.append(disclosure);row.append(lab,control);destination.append(row);
   function update(){draft.set(key,{value:readValue(),visibility:selectBox.value});}
   selectBox.addEventListener("change",update);enhanceEditorSelect(selectBox,"compact");
  };
  const showGroup=id=>{
   const group=groups.find(x=>x.id===id);
   if(!group)return;
   closeEditorMenu();selected=id;
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
    const identity=make("section","ui-profile-editor-identity-001");
    const coverPreview=make("div","ui-profile-editor-cover-preview-001");
    const avatarPreview=make("span","ui-profile-editor-avatar-preview-001");
    const coverButton=make("button","vt-profile-editor-cover-change-001",tr("Змінити обкладинку","Change cover"));coverButton.type="button";
    const avatarButton=make("button","vt-profile-editor-avatar-change-001",tr("Змінити фото","Change photo"));avatarButton.type="button";
    const updatePreview=()=>{
     const profileCover=select("#profile-cover-image"),profileAvatar=select("#profile-avatar");
     coverPreview.style.backgroundImage=profileCover?.style.backgroundImage||"";
     const image=select("#profile-cover-photo");
     if(image?.getAttribute("src")&&!image.hidden)coverPreview.style.backgroundImage="url("+JSON.stringify(image.src)+")";
     avatarPreview.style.backgroundImage=profileAvatar?.style.backgroundImage||"";
     if(profileAvatar?.classList.contains("has-photo"))avatarPreview.classList.add("has-photo");else avatarPreview.classList.remove("has-photo");
    };
    updatePreview();
    const observe=new MutationObserver(updatePreview);
    for(const target of [select("#profile-cover-image"),select("#profile-cover-photo"),select("#profile-avatar")])if(target)observe.observe(target,{attributes:true,attributeFilter:["style","class","src","hidden"]});
    const sectionObserver=new MutationObserver(()=>{if(!identity.isConnected){observe.disconnect();sectionObserver.disconnect();}});
    sectionObserver.observe(fields,{childList:true});
    coverButton.addEventListener("click",()=>{mediaDialog?.showModal();select("#profile-cover-upload-button")?.focus();});
    avatarButton.addEventListener("click",()=>{mediaDialog?.showModal();select("#profile-avatar-upload-button")?.focus();});
    coverPreview.append(coverButton,avatarPreview);
    const identityInfo=make("div","ui-profile-editor-identity-info-001");
    const nameLine=make("div","ui-profile-editor-identity-name-row-001");
    nameLine.append(make("strong","vt-profile-editor-identity-name-001",select("#profile-heading")?.querySelector(".vatra-verified-name-text")?.textContent||select("#profile-heading")?.textContent.trim()||"VATRA"));
    const idLink=make("a","vt-profile-editor-id-link-001",tr("Змінити ім’я у VATRA ID","Edit name in VATRA ID"));idLink.href=new URL("vatra-id",location.href).href;
    nameLine.append(idLink);identityInfo.append(avatarButton,nameLine);
    const verification=make("div","ui-profile-editor-verification-row-001");
    const verifyLabel=make("span","vt-profile-editor-verification-label-001",tr("Верифікація","Verification"));
    const verifyState=make("span","vt-profile-editor-verification-state-001",tr("Перевірка статусу…","Checking status…"));
    const verifyLink=make("a","vt-profile-editor-verification-link-001",tr("Подати заявку","Apply"));verifyLink.href=new URL("vatra-id#verification",location.href).href;
    verification.append(verifyLabel,verifyState,verifyLink);identityInfo.append(verification);identity.append(coverPreview,identityInfo);fields.append(identity);
    void (async()=>{try{const {data,error}=await client.from("verified_accounts").select("vatra_id").eq("vatra_id",ownId).maybeSingle();if(error)throw error;verifyState.textContent=data?tr("Сторінку верифіковано","Verified profile"):tr("Сторінка не верифікована","Not verified");verifyLink.hidden=Boolean(data);}catch(_){verifyState.textContent=tr("Статус недоступний","Status unavailable");}})();
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
    privacy.append(privacySymbol,copy,change);fields.append(privacy);enhanceEditorSelect(change,"page");
   }
   if(["education","career","military"].includes(id)){
    const info=make("div","ui-profile-editor-records-001");
    const values=group.fields.filter(field=>String(draft.get(field[0])?.value||"").trim());
    if(values.length){
     for(const field of values){
      const row=make("div","ui-profile-editor-record-summary-"+field[0]);
      row.append(make("span","vt-profile-editor-record-label-"+field[0],tr(field[1],field[2])),make("span","vt-profile-editor-record-value-"+field[0],draft.get(field[0]).value));
      info.append(row);
     }
    }else info.append(make("p","vt-profile-editor-record-empty-001",tr("Інформацію ще не додано.","No information added yet.")));
    const edit=make("button","vt-profile-editor-record-open-001",values.length?tr("Редагувати","Edit"):tr("Додати","Add"));edit.type="button";
    edit.addEventListener("click",()=>{
     recordTitle.textContent=values.length?tr("Редагувати інформацію","Edit details"):tr("Додати інформацію","Add details");
     recordFields.replaceChildren();
     recordSnapshot=new Map(group.fields.map(field=>[field[0],draft.has(field[0])?{...draft.get(field[0])}:null]));
     for(const field of group.fields)buildField(field,recordFields);
     recordDialog.showModal();
    });
    info.append(edit);fields.append(info);
   }else for(const field of group.fields)buildField(field,fields);

  };

  const switchGroup=id=>{
   if(id!==selected){showGroup(id);workspace.scrollIntoView({block:"start",behavior:"instant"});}
  };
  form.addEventListener("submit",async event=>{
   event.preventDefault();closeEditorMenu();if(save.disabled)return;
   save.disabled=true;feedback.hidden=true;feedback.dataset.kind="";

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
     const result=await client.from("profile_details")
      .upsert(additions,{onConflict:"vatra_id,field_key"}).select("field_key");
     if(result.error||result.data?.length!==additions.length)
      throw result.error||new Error("Profile fields not saved");
    }
    if(deletions.length){
     const result=await client.from("profile_details")
      .delete().eq("vatra_id",ownId).in("field_key",deletions);
     if(result.error)throw result.error;
    }
    if(visibility!==accountVisibility){
     const result=await client.from("profile_preferences")
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



(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://cxrcycxrlkufozomsxcs.supabase.co";
const PUBLIC_KEY="sb_publishable_oKypZDxi8PP1oxSylfh5wQ_H6HxeM-i";
const q=selector=>document.querySelector(selector);
const activeLocale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
const english=activeLocale==="en";
const dateLocales={uk:"uk-UA",en:"en-US",pl:"pl-PL",de:"de-DE",fr:"fr-FR",it:"it-IT",ka:"ka-GE",bg:"bg-BG"};
const locale=dateLocales[activeLocale]||"uk-UA";
const t=(uk,en)=>{
 if(activeLocale==="uk")return uk;
 const translated=window.VATRA_LANGUAGE?.translate?.(uk);
 return typeof translated==="string"&&translated!==uk?translated:(english?en:uk);
};
const home=new URL("../../",document.currentScript.src).href;
const validId=id=>typeof id==="string"&&/^[1-9][0-9]{0,18}$/.test(id);
const memberUrl=id=>home+"id"+encodeURIComponent(id);
const localizeSocial=()=>{
 for(const element of document.querySelectorAll("[data-social-uk]"))
  element.textContent=t(element.dataset.socialUk,element.dataset.socialEn);
 const brand=document.querySelector(".feed-header-brand");
 if(brand)brand.setAttribute("aria-label",t("VATRA — Стрічка","VATRA — Feed"));
 for(const control of document.querySelectorAll(".social-profile-tabs button:disabled"))
  control.title=t("У розробці","Coming soon");
 for(const input of document.querySelectorAll("[data-shell-placeholder-uk]")){
    input.placeholder=t(input.dataset.shellPlaceholderUk,input.dataset.shellPlaceholderEn);
   }
   for(const control of document.querySelectorAll("[data-shell-aria-uk]")){
    const title=t(control.dataset.shellAriaUk,control.dataset.shellAriaEn);
    control.setAttribute("aria-label",title);
    if(control.classList.contains("profile-safety-action"))control.title=title;
    else control.removeAttribute("title");
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
  day:"numeric",month:"short",year:"numeric"
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
function missingProfile(state="not-found"){

 const titles={
  "not-found":t("Користувача не знайдено","User not found"),
  deleted:t("Акаунт видалено","Account deleted"),
  blocked:t("Акаунт заблоковано","Account blocked")
 };
 const title=titles[state]||titles["not-found"];

 document.body.dataset.vatraProfileUnavailable=state;
 const name=q("#profile-heading");
 if(name){name.removeAttribute("data-i18n");name.textContent=title;}
 const portrait=q("#profile-avatar"),wrap=q("#profile-avatar-wrap");
 const cover=q("#profile-cover-image"),systemCover=q("#profile-cover-system");
 const coverPhoto=q("#profile-cover-photo"),coverView=q("#profile-cover-view");
 if(cover)cover.classList.remove("has-photo");
 if(systemCover){

  systemCover.dataset.vatraCoverState=state;
  systemCover.hidden=false;
 }
 if(coverPhoto){coverPhoto.hidden=true;coverPhoto.removeAttribute("src");}
 if(coverView)coverView.hidden=true;
 window.VATRA_AVATAR?.fallback(portrait,state);
 if(wrap){
  wrap.dataset.vatraSystemAvatar="true";
  wrap.dataset.vatraRingKind=state;
 }
 const button=q("#profile-avatar-trigger");
 if(button){button.disabled=true;button.setAttribute("aria-label",title);}

 q("#profile-status")?.remove();
 q("#profile-last-seen")?.remove();

 q(".profile-actions")?.remove();
 q("#profile-edit-open")?.remove();
 q(".ui-profile-tab-row-001")?.remove();
 q(".profile-panels")?.remove();
 document.title=title;
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
   .select("id,author_vatra_id,body,created_at,visibility,media_kind,media_path,media_items,shared_post_kind,shared_post_id,pinned_at,comments_enabled")
   .eq("author_vatra_id",targetId).eq("is_clip",false);
  if(typeof query.is==="function")query=query.is("archived_at",null);


  if(year>=2026&&year<=9999){
   const start=new Date(year,month?month-1:0,1);
   const end=month?new Date(year,month,1):new Date(year+1,0,1);
   query=query.gte("created_at",start.toISOString())
    .lt("created_at",end.toISOString());
  }
  const {data,error}=await query.order("pinned_at",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false})
   .order("id",{ascending:false}).range(offset,offset+11);
  if(ticket!==profilePostsRequest)return;
  if(error)throw error;
  const rows=data||[];
  const engagement=await (window.VATRA_POST_INTERACTIONS?.prefetchEngagement(
   client,rows.map(post=>({...post,kind:"person"})))||Promise.resolve(new Map()));
  if(ticket!==profilePostsRequest)return;
  if(!append)list.replaceChildren();
  const batch=document.createDocumentFragment();
  for(const post of rows){
   const article=node("article","feed-post-card ui-profile-post-card-001");
   article.dataset.postId=post.id;
   const header=node("div","feed-post-header ui-profile-post-header-001");
   const identity=node("div","feed-post-author ui-profile-post-author-001");
   const name=node("a","feed-post-name vt-profile-post-name-001 feed-post-profile-link",
    q("#profile-heading").textContent);
   name.href=memberUrl(targetId);
   void window.VATRA_VERIFIED?.attach(client,name,post.author_vatra_id);
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
    window.VATRA_POST_INTERACTIONS?.addOwnerMenu(header,{
     source:"profile",client,post:{...post,kind:"person"},ownId,onChange:()=>void loadPosts(client,targetId,ownId,userId),
     onArchive:async()=>{
      const {data,error}=await client.from("feed_posts")
       .update({archived_at:new Date().toISOString(),pinned_at:null})
       .eq("id",post.id).eq("author_vatra_id",ownId).select("id").maybeSingle();
      if(error||!data)return;
      void loadPosts(client,targetId,ownId,userId);
     },
     onDelete:async()=>{
      if(!await window.VATRA_PROFILE_CONFIRM({
       title:t("Видалити публікацію?","Delete this post?"),
       description:t("Публікацію буде видалено з вашої сторінки без можливості відновлення.",
        "This post will be removed from your profile permanently."),
       action:t("Видалити","Delete")
      }))return;
      const {data,error}=await client.from("feed_posts").delete().eq("id",post.id)
       .eq("author_vatra_id",ownId).select("id");
      if(error||!data?.length)return;
      if(post.media_path)void window.VATRA_POST_MEDIA?.remove(client,post);
      if(post.media_items?.length)void window.VATRA_POST_MEDIA?.removeGallery(client,post.media_items);
      void loadPosts(client,targetId,ownId,userId);
     }
    });
   }
   article.append(header);
   if(post.pinned_at)article.append(node("div","vt-vatra-profile-post-pinned-001",t("Закріплена публікація","Pinned post")));
   if(post.body){
    const body=node("p","feed-post-body vt-profile-post-body-001",post.body);
    window.VATRA_POST_MEDIA?.linkifyHashtags(body);
    article.append(body);
    window.VATRA_POST_MEDIA?.collapsibleBody(body);
   }
   if(post.media_items?.length||(post.media_kind&&post.media_path))void window.VATRA_POST_MEDIA?.mount(client,post,article);
   if(post.shared_post_id)void window.VATRA_POST_INTERACTIONS?.renderSharedPreview(client,post,article);
   window.VATRA_POST_INTERACTIONS?.mount(client,{...post,kind:"person"},article,{
    ownId,userId,engagement:engagement.get("person:"+post.id),
    onShared:()=>{if(String(ownId)===String(targetId))
     void loadPosts(client,targetId,ownId,userId);}
   });
   batch.append(article);
  }
  list.append(batch);
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
   if(!more.dataset.autoPageBound&&typeof IntersectionObserver==="function"){
    more.dataset.autoPageBound="true";
    const postPager=new IntersectionObserver(entries=>{
     if(entries.some(entry=>entry.isIntersecting)&&!more.hidden&&!more.disabled&&
      list.dataset.loading!=="true"&&document.visibilityState!=="hidden"){
      void loadPosts(client,targetId,ownId,userId,true);
     }
    },{rootMargin:"0px 0px 240px 0px"});
    postPager.observe(more);
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
  if(!item?.media_items?.length&&(!item?.media_path||!["image","video"].includes(item.media_kind)))return;

  void window.VATRA_POST_MEDIA?.mount(client,item,article);
 };
 const displayShared=(article,item)=>{
  if(item?.shared_post_id)void window.VATRA_POST_INTERACTIONS?.renderSharedPreview(client,item,article);
 };
 const namedAuthors=async rows=>{
  const ids=[...new Set(rows.map(p=>String(p.author_vatra_id)).filter(validId))];
  if(!ids.length)return new Map();
  const {data,error}=await (window.VATRA_PUBLIC_NAMES?.get(client,ids)||
   client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",ids));
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
    groups.length?client.from("community_posts").select("id,body,author_vatra_id,club_id,media_kind,media_path,created_at").in("id",groups):Promise.resolve({data:[]})
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
    if(people.has(String(post.author_vatra_id)))void window.VATRA_VERIFIED?.attach(client,article.querySelector(".vt-profile-extra-title-001"),post.author_vatra_id);
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
   const {data,error}=await client.from("stories").select("id,body,theme,created_at,expires_at,media_kind,media_path")
    .eq("author_vatra_id",ownId).lte("expires_at",new Date().toISOString())
    .order("created_at",{ascending:false}).limit(50);
   if(error)throw error;
   for(const item of data||[]){
    const article=makeRow(list,dateText(item.created_at),item.body||
     (item.media_kind==="video"?t("Відеоісторія","Video story"):
      item.media_kind==="image"?t("Фотоісторія","Photo story"):
       t("Історія","Story")));
    const view=node("button","vt-profile-archived-story-open-001",
     t("Переглянути історію","View story"));
    view.type="button";
    view.addEventListener("click",()=>{
     const dialog=q("#profile-story-viewer");
     const text=q("#profile-story-viewer-text");
     q("#profile-story-viewer-heading").textContent=dateText(item.created_at);
     text.textContent=item.body||"";text.hidden=!item.body;
     dialog.dataset.theme=String(item.theme||0);
     dialog.showModal();

     void window.VATRA_POST_MEDIA?.renderStory(client,
      {...item,author_vatra_id:ownId},q("#profile-story-viewer-media"),false,true);
    });
    article.append(view);
   }
   if(!list.children.length)empty("#profile-archive-stories-empty",t("Історій в архіві ще немає.","No archived stories yet."));
  }catch(_){empty("#profile-archive-stories-empty",t("Не вдалося завантажити архів історій.","Could not load story archive."));}
 };
 const archivedPosts=async()=>{
  if(!isMine)return;
  const list=q("#profile-archive-posts-list"),note=q("#profile-archive-posts-empty");
  list.replaceChildren();note.hidden=true;
  try{
   const {data,error}=await client.from("feed_posts")
    .select("id,author_vatra_id,body,media_kind,media_path,media_items,shared_post_kind,shared_post_id,created_at,archived_at")
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
     if(!await window.VATRA_PROFILE_CONFIRM({
      title:t("Видалити назавжди?","Delete permanently?"),
      description:t("Цю публікацію буде остаточно видалено з архіву.",
       "This post will be permanently deleted from your archive."),
      action:t("Видалити","Delete")
     }))return;
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
  {kind:"video",tab:"#profile-tab-videos",list:"#profile-video-gallery",empty:"#profile-videos-empty",more:"#profile-videos-more"},
  {kind:"video",clip:true,tab:"#profile-tab-clips",list:"#profile-clips-gallery",empty:"#profile-clips-empty",more:"#profile-clips-more"}
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
     .select("id,author_vatra_id,media_kind,media_path,media_items")
     .eq("author_vatra_id",targetId).eq("is_clip",!!settings.clip);
    if(!settings.clip)query=query.eq("media_kind",settings.kind);
    if(typeof query.is==="function")query=query.is("archived_at",null);
    const {data,error}=await query.order("created_at",{ascending:false}).order("id",{ascending:false})
     .range(offset,offset+11);
    if(error)throw error;
    const rows=(data||[]).filter(item=>settings.clip?
     item.media_items?.[0]?.media_kind==="video"&&!!item.media_items[0].media_path:!!item.media_path);
    if(!append)list.replaceChildren();
    for(const post of rows){
     const tile=node("article","profile-media-tile ui-profile-media-tile-001");
     tile.setAttribute("aria-label",settings.clip?t("Кліп","Clip"):settings.kind==="image"?t("Фото","Photo"):t("Відео","Video"));
     list.append(tile);
     if(settings.clip){
      const open=node("a","vt-profile-clip-open-001",t("Відкрити кліп","Open clip"));
      open.href=new URL("clips?clip="+encodeURIComponent(post.id),home).href;
      void window.VATRA_POST_MEDIA?.mount(client,post,tile).then(()=>{if(tile.isConnected)tile.append(open);});
     }else void window.VATRA_POST_MEDIA?.mount(client,post,tile);
    }
    offset+=(data||[]).length;
    loaded=true;more.hidden=(data||[]).length<12;
    if(!list.children.length){
     empty.textContent=settings.clip?t("Кліпів поки немає.","No clips yet."):settings.kind==="image"?t("Фотографій поки немає.","No photos yet."):
      t("Відео поки немає.","No videos yet.");
     empty.hidden=false;
    }
   }catch(_){
    if(!append)list.replaceChildren();
    empty.textContent=t("Не вдалося завантажити медіа.","Could not load media.");
    empty.hidden=false;
   }finally{busy=false;list.setAttribute("aria-busy","false");more.disabled=false;}
  };
  const activate=()=>{if(!loaded)void load();};
  new MutationObserver(()=>{if(tab.getAttribute("aria-selected")==="true")activate();}).observe(tab,{attributes:true,attributeFilter:["aria-selected"]});
  if(tab.getAttribute("aria-selected")==="true")activate();
  more.addEventListener("click",()=>void load(true));
 }
}
function bindProfileStoryComposer(client,ownId){
 window.VATRA_STORY_EDITOR.mount({dialog:q("#profile-story-compose-dialog"),trigger:q("#profile-add-story"),client,id:ownId,prefix:"profile-story-compose",onPublished:()=>location.reload()});
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
  submit.disabled=publishing||(!input.value.trim()&&!picker?.getFiles()?.length)||length>2000;
 };
 const clearStatus=()=>{status.textContent="";status.hidden=true;};
 picker=window.VATRA_POST_MEDIA?.bindGalleryPicker({
  input:"#profile-compose-media",choose:"#profile-compose-media-choose",
  clear:"#profile-compose-media-remove",preview:"#profile-compose-media-preview",
  onError:text=>{status.textContent=text;status.hidden=!text;},
  onChange:()=>{update();composerUI?.sync();}
 });
 const composerUI=window.VATRA_COMPOSER_UI?.bind({prefix:"profile",ownerId:ownId,getFile:()=>picker?.getFiles()?.length>0});
 q("#profile-quick-media")?.addEventListener("click",()=>{
  trigger.click();q("#profile-compose-media-choose")?.click();
 });
 trigger.addEventListener("click",()=>{
  clearStatus();
  dialog.showModal();
  update();
  composerUI?.open();
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
  const body=input.value.trim(),files=picker?.getFiles()||[];
  if((!body&&!files.length)||Array.from(body).length>2000){
   status.textContent=t("Додайте текст, фото або відео (до 2000 символів).","Add text, a photo or video (up to 2000 characters).");
   status.hidden=false;return;
  }
  publishing=true;
  update();
  clearStatus();
  let uploaded=null;
  try{
   if(files.length)uploaded=await window.VATRA_POST_MEDIA.uploadGallery(client,ownId,files);
   const {error}=await client.from("feed_posts").insert({
    author_id:user.id,author_vatra_id:ownId,body,
    visibility:["public","friends","only_me"].includes(visibility?.value)?visibility.value:"public",
    media_items:uploaded||[]
   });
   if(error)throw error;
   input.value="";picker?.reset();composerUI?.reset();
   dialog.close();
   await loadPosts(client,ownId,ownId,user.id);
  }catch(error){
   if(uploaded)try{await window.VATRA_POST_MEDIA.removeGallery(client,uploaded);}catch(_){}
   status.textContent=error?.message||t("Не вдалося опублікувати допис. Повторіть спробу.",
    "Could not publish the post. Please try again.");
   status.hidden=false;
  }finally{publishing=false;update();}
 });
 update();
}



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
 const allFriendsButton=q("#profile-friends-all"),findFriendsButton=q("#profile-friends-find");
 const toggleFriendActions=hasFriends=>{
  if(allFriendsButton)allFriendsButton.hidden=isMine&&!hasFriends;
  if(findFriendsButton)findFriendsButton.hidden=!isMine||!!hasFriends;
 };
 toggleFriendActions(true);
 findFriendsButton?.addEventListener("click",()=>{
  const search=q("#feed-search-input");
  if(search){
   search.focus({preventScroll:true});
   search.scrollIntoView({block:"nearest",behavior:"smooth"});
  }else location.assign(new URL("feed",home).href);
 });
 const firstName=value=>String(value||"").trim().split(/\s+/)[0]||t("Учасник","Member");
 const giftInfo=code=>window.VATRA_GIFTS_CATALOG?.byCode(code)||null;
 const loading=(el,value)=>{
  el.replaceChildren(node("p","vt-profile-mini-loading-001",value));
 };
 loading(friendsPreview,t("Завантаження друзів…","Loading friends…"));
 loading(giftsPreview,t("Завантаження подарунків…","Loading gifts…"));
 let cachedFriends=[],cachedGifts=[],communitiesLoaded=false;
 let allFriendsPending=null,allGiftsPending=null;
 function personCard(member,compact){
  const id=String(member.id);
  const link=node("a",compact?"profile-friend-tile vt-profile-friend-tile-"+id:
   "profile-friend-full vt-profile-friend-full-"+id);
  link.href=memberUrl(id);link.setAttribute("aria-label",member.name);
  const photo=node("span","profile-friend-portrait vt-profile-friend-portrait-"+id);
  photo.setAttribute("aria-hidden","true");
  window.VATRA_AVATAR?.fallback(photo,member.state||"default");
  if(member.avatar&&!member.state){
   window.VATRA_AVATAR?.clearFallback(photo);
   photo.style.backgroundImage="url("+JSON.stringify(member.avatar)+")";
   photo.classList.add("has-photo");
  }
  const label=node("span","vt-profile-friend-name-"+id,compact?firstName(member.name):member.name);
  if(!member.state)void window.VATRA_VERIFIED?.attach(client,label,id);
  link.append(photo,label);return link;
 }
 async function resolveFriendships(friendships){
  const ids=[...new Set(friendships.map(f=>String(f.requester_id)===String(targetId)?
   String(f.recipient_id):String(f.requester_id)).filter(validId))];



  const batches=[];
  for(let i=0;i<ids.length;i+=100)batches.push(ids.slice(i,i+100));
  const [names,photos,statesResult]=await Promise.all([
   Promise.allSettled(batches.map(batch=>window.VATRA_PUBLIC_NAMES?.get(client,batch)||
    client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",batch))),
   Promise.allSettled(batches.map(batch=>window.VATRA_AVATAR?.paths?.(client,batch)||
    client.from("profile_media").select("vatra_id,avatar_path").in("vatra_id",batch))),
   Promise.allSettled(batches.map(batch=>window.VATRA_AVATAR?.states?.(client,batch)||
    Promise.resolve(new Map())))
  ]);
  const friendStates=new Map(),namesMap=new Map(),mediaMap=new Map();
  for(const result of statesResult)if(result.status==="fulfilled")
   for(const [id,state] of result.value||[])friendStates.set(String(id),state);
  for(const result of names)if(result.status==="fulfilled"&&!result.value.error)
   for(const item of result.value.data||[])
    namesMap.set(String(item.vatra_id),String(item.display_name||"").trim());
  for(const result of photos)if(result.status==="fulfilled"&&!result.value.error)
   for(const item of result.value.data||[])
    mediaMap.set(String(item.vatra_id),String(item.avatar_path||""));
  return ids.map(id=>{
   const state=friendStates.get(id)||null,path=mediaMap.get(id);
   let avatar=null;
   if(!state&&path&&path.startsWith(id+"/avatar/")){
    const {data}=client.storage.from("avatars").getPublicUrl(path);
    avatar=data?.publicUrl||null;
   }
   const name=state==="deleted"?t("Акаунт видалено","Account deleted"):
    state==="blocked"?t("Акаунт заблоковано","Account blocked"):
    namesMap.get(id)||t("Учасник VATRA","VATRA member");
   return {id,name,avatar,state};
  });
 }
 const showFriends=async()=>{
  loading(friendsAll,t("Завантаження друзів…","Loading friends…"));
  try{
   if(!allFriendsPending){
    allFriendsPending=(async()=>{
     const {data,error}=await client.from("friendships")
      .select("requester_id,recipient_id,created_at")
      .eq("status","accepted")
      .or("requester_id.eq."+targetId+",recipient_id.eq."+targetId)
      .order("created_at",{ascending:false}).limit(300);
     if(error)throw error;
     return resolveFriendships(data||[]);
    })().catch(error=>{allFriendsPending=null;throw error;});
   }
   const members=await allFriendsPending;
   friendsAll.replaceChildren();
   if(members.length){
    for(const friend of members)friendsAll.append(personCard(friend,false));
    q("#profile-friends-empty").hidden=true;
   }else previewEmpty("#profile-friends-empty",t("Друзів поки немає.","No friends yet."));
  }catch(_){
   friendsAll.replaceChildren();
   previewEmpty("#profile-friends-empty",t("Друзі тимчасово недоступні.","Friends temporarily unavailable."));
  }
 };
 window.VATRA_PROFILE_SHOW_FRIENDS=showFriends;
 const showGifts=async()=>{
  loading(giftsAll,t("Завантаження подарунків…","Loading gifts…"));
  try{
   if(!allGiftsPending){
    allGiftsPending=(async()=>{
     const {data,error}=await client.from("profile_gifts")
      .select("id,gift_code,created_at").eq("recipient_vatra_id",targetId)
      .order("created_at",{ascending:false}).limit(100);
     if(error)throw error;
     return (data||[]).filter(x=>giftInfo(x.gift_code));
    })().catch(error=>{allGiftsPending=null;throw error;});
   }
   const gifts=await allGiftsPending;
   giftsAll.replaceChildren();
   if(gifts.length){
    for(const gift of gifts)giftsAll.append(giftCard(gift,false));
    q("#profile-gifts-empty").hidden=true;
   }else previewEmpty("#profile-gifts-empty",t("Подарунків поки немає.","No gifts yet."));
  }catch(_){
   giftsAll.replaceChildren();
   previewEmpty("#profile-gifts-empty",t("Подарунки тимчасово недоступні.","Gifts temporarily unavailable."));
  }
 };
 window.VATRA_PROFILE_SHOW_GIFTS=showGifts;
 q("#profile-gifts-dialog-close").addEventListener("click",()=>q("#profile-gifts-dialog").close());
 function giftCard(gift,compact){
  const item=node("button",compact?"profile-gift-tile ui-profile-gift-preview-item-001":
   "profile-gift-full ui-profile-gift-full-item-001");
  const info=giftInfo(gift.gift_code);
  item.type="button";
  item.setAttribute("aria-label",t("Переглянути подарунок: ","View gift: ")+t(info.uk,info.en));
  item.addEventListener("click",()=>window.VATRA_GIFT_VIEWER?.open(info.code));
  const art=node("span","profile-gift-art ui-profile-gift-art-001");
  art.setAttribute("aria-hidden","true");
  art.style.backgroundImage="url("+JSON.stringify(window.VATRA_GIFTS_CATALOG.fileUrl(info))+")";
  art.addEventListener("dragstart",event=>event.preventDefault());
  art.addEventListener("contextmenu",event=>event.preventDefault());
  const title=node("strong","vt-profile-gift-name-001",t(info.uk,info.en));
  const sub=node("small","vt-profile-gift-caption-001",info.exclusive?t(info.eventUk,info.eventEn):t("За приєднання до VATRA","For joining VATRA"));
  item.append(art);if(!compact)item.append(title,sub);return item;
 }
 q("#profile-friends-all")?.addEventListener("click",()=>{
  location.assign(new URL("friends"+(isMine?"":"?member="+targetId),home).href);
 });
 let giftDialogEpoch=0;
 q("#profile-gifts-dialog").addEventListener("close",()=>{giftDialogEpoch++;});
 q("#profile-gifts-all")?.addEventListener("click",()=>{
  const dialog=q("#profile-gifts-dialog"),list=q("#profile-gifts-dialog-list"),more=q("#profile-gifts-dialog-more");
  if(dialog.open)return;const epoch=++giftDialogEpoch;dialog.showModal();let offset=0,busy=false,done=false;
  list.replaceChildren();more.hidden=true;
  async function load(){
   if(busy||done||!dialog.open)return;busy=true;more.disabled=true;
   try{
    const result=await client.from("profile_gifts").select("id,gift_code,created_at",{count:"exact"}).eq("recipient_vatra_id",targetId).order("created_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+29);
    if(result.error)throw result.error;if(!dialog.open||epoch!==giftDialogEpoch)return;
    const rows=result.data||[];offset+=rows.length;done=rows.length<30||(Number.isFinite(result.count)&&offset>=result.count);
    q("#profile-gifts-dialog-count").textContent=Number.isFinite(result.count)?String(result.count):"";
    for(const gift of rows){const info=giftInfo(gift.gift_code);if(!info)continue;const row=node("article","ui-profile-gift-dialog-row-001"),date=node("time","vt-profile-gift-dialog-date-001",dateText(gift.created_at));date.dateTime=gift.created_at;row.append(date,giftCard(gift,false));list.append(row);}
    if(!list.children.length&&done)list.append(node("p","vt-profile-gift-dialog-empty-001",t("Подарунків поки немає.","No gifts yet.")));
    more.hidden=done;
   }catch(_){if(epoch===giftDialogEpoch&&dialog.open){list.append(node("p","vt-profile-gift-dialog-empty-001",t("Не вдалося завантажити подарунки.","Could not load gifts.")));more.hidden=false;}}finally{busy=false;if(epoch===giftDialogEpoch)more.disabled=false;}
  }
  more.onclick=()=>void load();void load();
 });
 window.VATRA_PROFILE_SHOW_COMMUNITIES=async()=>{
  if(communitiesLoaded)return;
  communitiesLoaded=true;
  communityList.replaceChildren();
  try{
   const {data:follows,error}=await client.from("community_follows")
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
  client.from("friendships").select("requester_id,recipient_id,created_at")
   .eq("status","accepted")
   .or("requester_id.eq."+targetId+",recipient_id.eq."+targetId)
   .order("created_at",{ascending:false}).limit(4),
  client.from("profile_gifts").select("id,gift_code,created_at")
   .eq("recipient_vatra_id",targetId).order("created_at",{ascending:false}).limit(3)
 ]);
 if(jobs[0].status==="fulfilled"&&!jobs[0].value.error){
  cachedFriends=await resolveFriendships(jobs[0].value.data||[]);
  friendsPreview.replaceChildren();
  for(const friend of cachedFriends.slice(0,4))friendsPreview.append(personCard(friend,true));
  toggleFriendActions(cachedFriends.length>0);
  if(!cachedFriends.length)previewEmpty("#profile-friends-preview-empty",t("Друзів поки немає.","No friends yet."));
 }else{
  friendsPreview.replaceChildren();
  toggleFriendActions(false);
  previewEmpty("#profile-friends-preview-empty",t("Друзі тимчасово недоступні.","Friends are temporarily unavailable."));
 }
 if(jobs[1].status==="fulfilled"&&!jobs[1].value.error){
  cachedGifts=(jobs[1].value.data||[]).filter(x=>giftInfo(x.gift_code));
  giftsPreview.replaceChildren();
  for(const gift of cachedGifts.slice(0,3))giftsPreview.append(giftCard(gift,true));
  if(!cachedGifts.length)previewEmpty("#profile-gifts-preview-empty",t("Подарунків поки немає.","No gifts yet."));
 }else{
  giftsPreview.replaceChildren();
  previewEmpty("#profile-gifts-preview-empty",t("Не вдалося завантажити подарунки.","Could not load gifts."));
 }
}


function setupProfileBlocks(client,ownId,targetId,isMine,blockAccess){
 const button=q("#profile-block-toggle");
 if(!button||isMine||!validId(ownId)||!validId(targetId))return;
 button.hidden=false;
 let blocked=!!blockAccess?.blockedByMe,busy=false;
 const paint=()=>{
  const label=blocked?t("Розблокувати користувача","Unblock member"):
   t("Заблокувати користувача","Block member");
  button.dataset.blocked=String(blocked);
  button.setAttribute("aria-label",label);
  button.title=label;
 };
 paint();
 button.addEventListener("click",async()=>{
  if(busy)return;
  const approved=await window.VATRA_PROFILE_CONFIRM(blocked?{
   title:t("Розблокувати користувача?","Unblock this member?"),
   description:t("Користувач знову зможе переглядати доступний йому вміст вашої сторінки та звертатися до вас.",
    "This member will be able to view your accessible profile content and contact you again."),
   action:t("Розблокувати","Unblock"),tone:"primary"
  }:{
   title:t("Заблокувати користувача?","Block this member?"),
   description:t("Він бачитиме лише вашу обкладинку, аватар та ім’я. Публікації, історії, інформація профілю й особисті повідомлення будуть недоступні.",
    "They will see only your cover, avatar and name. Posts, stories, profile details and direct messages will be unavailable."),
   action:t("Заблокувати","Block"),tone:"danger"
  });
  if(!approved)return;
  busy=true;button.disabled=true;
  const status=q("#profile-action-status");
  try{
   const operation=blocked?
    client.from("member_blocks").delete()
     .eq("blocker_vatra_id",ownId).eq("blocked_vatra_id",targetId)
     .select("blocked_vatra_id").maybeSingle():
    client.from("member_blocks").insert({
     blocker_vatra_id:Number(ownId),blocked_vatra_id:Number(targetId)
    });
   const {data,error}=await operation;

   if(error||(blocked&&String(data?.blocked_vatra_id)!==String(targetId)))
    throw error||Error("Member was not unblocked");
   location.reload();
  }catch(_){
   if(status){
    status.textContent=t("Не вдалося змінити блокування. Спробуйте ще раз.",
     "Could not update blocking. Please retry.");
    status.hidden=false;
   }
  }finally{busy=false;button.disabled=false;}
 });
}


function setupProfileReports(client,ownId,targetId,isMine,locked){
 if(isMine)return;
 const dialog=q("#profile-report-dialog"),open=q("#profile-report-open");
 const back=q("#profile-report-back"),close=q("#profile-report-close");
 const content=q("#profile-report-content"),error=q("#profile-report-error");
 const footer=q("#profile-report-footer"),submit=q("#profile-report-submit");
 if(!dialog||!open)return;
 let step="kind",kind="profile",category="",reason="",sending=false,photoPath=null;
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
   if(kind==="photo"){
    heading(t("Чому ви скаржитеся на цю фотографію?","Why are you reporting this photo?"));
    for(const [uk,en] of [
     ["Спам","Spam"],["Образи або цькування","Harassment or bullying"],
     ["Насильство чи жорстокість","Violence or gore"],
     ["Відверте зображення","Nudity or sexual content"],
     ["Порушення авторських прав","Copyright infringement"],
     ["Шахрайство чи обман","Scam or fraud"],["Інша причина","Another reason"]
    ])option(t(uk,en),()=>{category="specific_photo";reason=t(uk,en);step="review";render();});
   }else{
    heading(t("Чому ви скаржитеся на цей профіль?","Why are you reporting this profile?"));
    for(const [code,uk,en] of base)option(t(uk,en),()=>{category=kind==="post"?"specific_post":code;reason=t(uk,en);step="reason";render();});
   }
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
    node("strong","vt-profile-report-category-value-001",
     category==="specific_photo"?t("Фотографія профілю","Profile photo"):
     category==="specific_post"?t("Конкретний допис","Specific post"):chosen?t(chosen[1],chosen[2]):reason));
   if(kind==="photo"&&photoPath){
    const preview=node("img","ui-profile-report-photo-preview-001");
    preview.alt=t("Фото, на яке надсилається скарга","Photo being reported");
    preview.src=client.storage.from("avatars").getPublicUrl(photoPath).data?.publicUrl||"";
    group.append(preview);
   }
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
 const launch=(selectedPhoto=null)=>{
  const photo=typeof selectedPhoto==="string"&&
   new RegExp("^"+String(targetId)+"/avatar/[A-Za-z0-9_-]+\\.(?:jpe?g|png|webp)$","i").test(selectedPhoto)?
    selectedPhoto:null;
  photoPath=photo;step=photo?"category":"kind";kind=photo?"photo":"profile";
  category="";reason="";sending=false;dialog.dataset.reportDraft="";
  render();dialog.showModal();close.focus({preventScroll:true});
 };
 open.addEventListener("click",()=>launch());
 window.VATRA_REPORT_PROFILE_PHOTO=path=>{if(!locked)launch(path);};

 close.addEventListener("click",()=>dialog.close());
 back.addEventListener("click",()=>{
  if(kind==="photo"){
   if(step==="category"){dialog.close();return;}
   step="category";
  }else step=step==="review"?"reason":step==="reason"?"category":"kind";
  render();
 });
 submit.addEventListener("click",async()=>{
  if(sending||step!=="review")return;
  sending=true;submit.disabled=true;message("");
  try{
   const {error:insertError}=await client.from("profile_reports").insert({
    target_vatra_id:Number(targetId),category,reason,
    details:String(dialog.dataset.reportDraft||"").trim().slice(0,1500),
    ...(kind==="photo"?{photo_path:photoPath}:{})
   });
   if(insertError){
    if(insertError.code==="23505"){message(t("Ви вже надсилали таку скаргу.","You've already sent this report."));return;}
    throw insertError;
   }
   step="success";render();
  }catch(_){message(t("Не вдалося надіслати скаргу. Спробуйте ще раз.","Could not submit the report. Please retry."));}
  finally{sending=false;submit.disabled=false;}
 });
 dialog.addEventListener("close",()=>{dialog.dataset.reportDraft="";photoPath=null;message("");});
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

 if(isMine&&location.hash==="#profile-messages-section")choose("messages");
 if(!validId(ownId))return;
 let activePeer=null,sending=false,conversationRequestSeq=0;
 const messagesQuery=peer=>"and(sender_id.eq."+ownId+",recipient_id.eq."+peer+
  "),and(sender_id.eq."+peer+",recipient_id.eq."+ownId+")";
 const loadConversation=async()=>{
  if(!validPeer(activePeer)||!dialog.open)return;
  const requestPeer=String(activePeer),requestSeq=++conversationRequestSeq;
  const isCurrent=()=>requestSeq===conversationRequestSeq&&activePeer===requestPeer&&dialog.open;
  conversation.replaceChildren(node("p","vt-profile-message-loading-001",t("Завантаження…","Loading…")));
  try{
   const {data,error}=await client.from("direct_messages")
    .select("sender_id,recipient_id,body,created_at")
    .or(messagesQuery(requestPeer)).order("created_at",{ascending:false}).limit(50);
   if(!isCurrent())return;
   if(error)throw error;
   conversation.replaceChildren();
   if(!data?.length)conversation.append(node("p","vt-profile-message-empty-001",
    t("Повідомлень ще немає.","No messages yet.")));
   for(const m of (data||[]).slice().reverse()){
    const bubble=node("div","profile-message-bubble ui-profile-message-bubble-001");

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
   if(!isCurrent())return;
   conversation.replaceChildren(node("p","vt-profile-message-error-001",
    t("Не вдалося завантажити розмову.","Could not load conversation.")));
  }
 };
 const openConversation=async peer=>{
  if(sending||!validPeer(peer))return;
  activePeer=String(peer);
  q("#profile-message-title").textContent=t("Повідомлення · VATRA ID ","Messages · VATRA ID ")+activePeer;
  messageText.value="";show(messageStatus,"");
  if(!dialog.open)dialog.showModal();
  await loadConversation();
  if(dialog.open&&activePeer===String(peer))messageText.focus();
 };
 q("#profile-message-close").addEventListener("click",()=>{if(!sending)dialog.close();});
 dialog.addEventListener("close",()=>{
  if(!dialog.open){conversationRequestSeq++;activePeer=null;}
 });
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
   const {error}=await client.from("direct_messages").insert({
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
   const {data,error}=await client.from("friendships")
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
     await client.from("friendships").insert({requester_id:ownId,recipient_id:targetId})
      .select("id").maybeSingle():
     relation.status==="pending"&&String(relation.recipient_id)===String(ownId)?
      await client.from("friendships").update({status:"accepted"}).eq("id",relation.id)
       .eq("recipient_id",ownId).eq("status","pending").select("id").maybeSingle():
      await client.from("friendships").delete().eq("id",relation.id)
       .or("requester_id.eq."+ownId+",recipient_id.eq."+ownId)
       .select("id").maybeSingle();

    if(result.error||!result.data?.id||
     (relation&&String(result.data.id)!==String(relation.id)))
     throw result.error||Error("Friendship was not changed");
    try{
     await refreshFriend();
     show(actionStatus,t("Статус дружби оновлено.","Friendship updated."));
    }catch(_){
     show(actionStatus,t("Дію виконано, але статус не оновився. Оновіть сторінку.",
      "Action completed, but status could not refresh. Reload the page."));
    }
   }catch(_){show(actionStatus,t("Не вдалося виконати дію.","Could not complete the action."));}
   finally{busy=false;friendButton.disabled=false;}
  });
 }
 loadFriends=async()=>{
  friends.replaceChildren();friendsEmpty.hidden=true;
  if(!isMine){
   location.assign(new URL("friends?member="+targetId,home).href);
   return;
  }
  try{
   const {data,error}=await client.from("friendships")
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
      const accepting=item.status==="pending"&&incoming;
      const {data:changed,error:changeError}=await (accepting?
       client.from("friendships").update({status:"accepted"}).eq("id",item.id)
        .eq("recipient_id",ownId).eq("status","pending").select("id").maybeSingle():
       client.from("friendships").delete().eq("id",item.id)
        .or("requester_id.eq."+ownId+",recipient_id.eq."+ownId)
        .select("id").maybeSingle());
      if(changeError||String(changed?.id)!==String(item.id))
       throw changeError||Error("Friendship was not changed");

      try{await loadFriends();}
      catch(_){show(friendsEmpty,t("Дію виконано, але список не оновився. Оновіть сторінку.",
       "Action completed, but the list did not refresh. Reload the page."));}
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
   const {data,error}=await client.from("direct_messages")
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
  statusText.textContent=saved?(Array.from(saved).length>80?Array.from(saved).slice(0,79).join("")+"…":saved):(isMine?t("Додайте статус","Add a status"):"");
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
 const counter=()=>{count.textContent=Array.from(input.value).length+" / 80";};
 const openStatus=()=>{input.value=Array.from(saved).slice(0,80).join("");counter();note.hidden=true;dialog.showModal();input.focus();};
 displayed.addEventListener("click",openStatus);
 input.addEventListener("input",counter);
 q("#profile-status-cancel").addEventListener("click",()=>dialog.close());
 q("#profile-status-form").addEventListener("submit",async event=>{
  event.preventDefault();if(save.disabled)return;
  const next=input.value.trim();
  if(Array.from(next).length>80){note.textContent=t("Статус надто довгий.","Status is too long.");note.hidden=false;return;}
  save.disabled=true;note.hidden=true;
  try{
   const {data,error}=await client.from("public_profiles")
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
 const caption=q("#profile-last-seen");
 if(!caption||!window.VATRA_PRESENCE)return;
 const refresh=async()=>{
  try{
   // The session initializes its own heartbeat independently; viewing another profile never touches its timestamp.
   const record=await window.VATRA_PRESENCE.load(client,targetId);
   const state=window.VATRA_PRESENCE.format(record,english);
   caption.textContent=state.online?t("У мережі","Online"):state.text||t("Статус мережі невідомий","Online status unavailable");
   caption.hidden=false;caption.dataset.online=String(state.online);
   if(state.date)caption.setAttribute("title",state.date.toLocaleString(english?"en-GB":"uk-UA"));else caption.removeAttribute("title");
  }catch(_){caption.textContent=t("Статус мережі невідомий","Online status unavailable");caption.dataset.online="false";caption.removeAttribute("title");}
 };
 void refresh();

 const timer=setInterval(()=>{if(!document.hidden)void refresh();},30000);
 const onVisible=()=>{if(!document.hidden)void refresh();};document.addEventListener("visibilitychange",onVisible);
 window.addEventListener("pagehide",()=>{clearInterval(timer);document.removeEventListener("visibilitychange",onVisible);},{once:true});
}


async function setupProfileMedia(client,ownId,targetId,isMine,userId,ownerEmail,locked=false,preloadedMedia=null){
 const cover=q("#profile-cover-image"),coverPhoto=q("#profile-cover-photo"),systemCover=q("#profile-cover-system"),avatar=q("#profile-avatar");
 const buttonAvatar=q("#profile-avatar-upload-button"),buttonCover=q("#profile-cover-upload-button");
 const fileAvatar=q("#profile-avatar-file"),fileCover=q("#profile-cover-file");
 const message=q("#profile-media-status");
 const avatarWrap=q("#profile-avatar-wrap"),avatarTrigger=q("#profile-avatar-trigger");
 const avatarMenu=q("#profile-avatar-menu"),storyButton=q("#profile-avatar-story");
 const deleteStoryButton=q("#profile-avatar-story-delete"),coverView=q("#profile-cover-view");
 const canEdit=isMine&&!locked&&validId(ownId),plus=q("#profile-avatar-plus"),coverChange=q("#profile-cover-change"),changePhoto=q("#profile-avatar-change"),removePhoto=q("#profile-avatar-remove"),addStory=q("#profile-add-story");
 avatarWrap.classList.toggle("is-owner-avatar",canEdit);plus.hidden=!canEdit;coverChange.hidden=!canEdit;
 const mediaDialog=q("#profile-media-viewer"),mediaImage=q("#profile-media-viewer-image");
 const mediaHeading=q("#profile-media-viewer-heading"),storyDialog=q("#profile-story-viewer");
 const storyHeading=q("#profile-story-viewer-heading"),storyBody=q("#profile-story-viewer-text");
 const storyMedia=q("#profile-story-viewer-media");
 const bucketFor=kind=>kind==="avatar"?"avatars":"covers";
 let saved=null,activeStory=null;
 const photoURLs={avatar:null,cover:null};
 const visitorStory=q("#profile-visitor-story");
 const prevPhoto=q("#profile-avatar-prev"),nextPhoto=q("#profile-avatar-next"),galleryToolbar=q("#profile-avatar-gallery-toolbar"),galleryCount=q("#profile-avatar-gallery-count"),galleryDelete=q("#profile-avatar-gallery-delete");
 let gallery=[],galleryIndex=0,galleryEpoch=0,menuTimer=null,pendingAvatarUndo=null,avatarDeleteInProgress=false;
 const deletedNotice=q("#profile-photo-deleted-notice");
 const deletedMessage=q("#profile-photo-deleted-message");
 const restoreAvatarButton=q("#profile-photo-restore");
 const discardAvatarUndo=()=>{
  const backup=pendingAvatarUndo;if(!backup)return;
  pendingAvatarUndo=null;
  if(backup.previewUrl)URL.revokeObjectURL(backup.previewUrl);
  // Only a finalized deletion loses person tags; an undo preserves them.
  void client.from("avatar_photo_tags").delete().eq("owner_vatra_id",ownId)
   .eq("avatar_path",backup.path).then(()=>{}).catch(()=>{});
 };
 const hideAvatarUndo=()=>{
  deletedNotice.hidden=true;mediaDialog.classList.remove("is-photo-deleted");
 };
 const galleryDates=new Map();
 const photoContent=q("#profile-photo-content"),photoCanvas=q("#profile-photo-canvas");
 const photoFooter=q("#profile-photo-footer"),footerShare=q("#profile-photo-footer-share");
 const footerMore=q("#profile-photo-footer-more");
 const footerReport=q("#profile-photo-report");
 const footerMenu=q("#profile-photo-footer-menu"),originalLink=q("#profile-photo-original");
 const setCurrent=q("#profile-photo-set-current"),tagMarkers=q("#profile-photo-tag-markers");
 const tagPicker=q("#profile-photo-tag-picker"),tagSearch=q("#profile-photo-tag-search");
 const tagResults=q("#profile-photo-tag-results"),tagCancel=q("#profile-photo-tag-cancel"),tagStatus=q("#profile-photo-tag-status");
 let tagMode=false,tagPosition=null,tagEpoch=0,searchEpoch=0,searchTimer=null;
 const reportTag=message=>{tagStatus.textContent=message||"";tagStatus.hidden=!message;};
 const closeMore=()=>{footerMenu.classList.remove("is-open");footerMore.setAttribute("aria-expanded","false");};
 const closeTagPicker=()=>{tagPicker.hidden=true;tagPosition=null;tagSearch.value="";tagResults.replaceChildren();searchEpoch++;};
 const resetTagMode=()=>{tagMode=false;photoCanvas.classList.remove("is-tagging");closeTagPicker();};
 const fitPhoto=()=>{
  if(!mediaImage.complete||!mediaImage.naturalWidth||!mediaImage.naturalHeight)return;
  const style=getComputedStyle(photoContent);
  const roomW=photoContent.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  const roomH=photoContent.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
  if(roomW<=0||roomH<=0)return;
  const avatarPhoto=["avatar","avatar-history"].includes(mediaDialog.dataset.kind);
  // Avatars preserve their existing VK-style scale; covers are centered
  // at a comfortable size instead of filling the entire browser width.
  const scale=avatarPhoto?
   Math.min(roomW*.96/mediaImage.naturalWidth,roomH*.96/mediaImage.naturalHeight):
   mediaDialog.dataset.kind==="cover"?
    Math.min(Math.min(roomW,1140)/mediaImage.naturalWidth,
     Math.min(roomH*.76,680)/mediaImage.naturalHeight):
    Math.min(roomW/mediaImage.naturalWidth,roomH/mediaImage.naturalHeight);
  photoCanvas.style.width=Math.max(1,Math.floor(mediaImage.naturalWidth*scale))+"px";
  photoCanvas.style.height=Math.max(1,Math.floor(mediaImage.naturalHeight*scale))+"px";
 };
 mediaImage.addEventListener("load",fitPhoto);
 const photoResizeObserver=typeof ResizeObserver==="function"?new ResizeObserver(fitPhoto):null;
 photoResizeObserver?.observe(photoContent);
 window.addEventListener("resize",fitPhoto,{passive:true});
 footerMore.addEventListener("click",()=>{const open=!footerMenu.classList.contains("is-open");closeMore();footerMenu.classList.toggle("is-open",open);footerMore.setAttribute("aria-expanded",String(open));});
 mediaDialog.addEventListener("click",event=>{if(!event.target.closest?.(".ui-profile-photo-more-wrap-001"))closeMore();});
 footerShare.addEventListener("click",()=>{closeMore();q("#profile-photo-share").click();});
 originalLink.addEventListener("click",closeMore);
 footerReport.addEventListener("click",()=>{
  closeMore();
  if(isMine||locked||!mediaDialog.open)return;
  const selected=gallery[galleryIndex];
  if(selected)window.VATRA_REPORT_PROFILE_PHOTO?.(selected);
 });
 document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeMore();closeTagPicker();}});

 window.VATRA_AVATAR?.fallback(avatar,"default");
 avatarWrap.dataset.vatraSystemAvatar="true";
 avatarWrap.dataset.vatraRingKind="default";
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
   if(parsed.protocol!=="https:"||parsed.hostname!=="cxrcycxrlkufozomsxcs.supabase.co")return null;
   return url;
  }catch(_){return null;}
 };
 const setImage=(el,url)=>{
  window.VATRA_AVATAR?.clearFallback(el);
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
 const closeAvatarMenu=()=>{clearTimeout(menuTimer);avatarWrap.classList.remove("is-menu-open");avatarTrigger.setAttribute("aria-expanded","false");plus.setAttribute("aria-expanded","false");};
 const positionAvatarMenu=()=>{
  if(avatarMenu.hidden)return;
  const anchor=(canEdit?plus:avatarTrigger).getBoundingClientRect(),wrap=avatarWrap.getBoundingClientRect();
  const viewport=window.visualViewport, left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,right=left+(viewport?.width||innerWidth),bottom=top+(viewport?.height||innerHeight);
  const w=avatarMenu.offsetWidth,h=Math.max(avatarMenu.scrollHeight,avatarMenu.offsetHeight),gap=5,padding=12;
  const above=anchor.top-top-padding,below=bottom-anchor.bottom-padding;
  const upwards=below<h+gap&&above>below;
  const room=Math.max(44,(upwards?above:below)-gap);
  avatarMenu.style.setProperty("--avatar-menu-max-height",Math.floor(room)+"px");
  const height=Math.min(h,room);
  const x=Math.max(left+padding,Math.min(anchor.right-w,right-padding-w));
  const y=upwards?Math.max(top+padding,anchor.top-gap-height):anchor.bottom+gap;
  avatarMenu.style.setProperty("--avatar-menu-left",Math.round(x-wrap.left)+"px");
  avatarMenu.style.setProperty("--avatar-menu-top",Math.round(y-wrap.top)+"px");
 };
 const showAvatarMenu=()=>{clearTimeout(menuTimer);if(avatarMenu.hidden)return;positionAvatarMenu();avatarWrap.classList.add("is-menu-open");plus.setAttribute("aria-expanded","true");if(!canEdit)avatarTrigger.setAttribute("aria-expanded","true");};
 const repositionAvatarMenu=()=>{if(avatarWrap.classList.contains("is-menu-open"))positionAvatarMenu();};
 window.addEventListener("resize",repositionAvatarMenu,{passive:true});window.addEventListener("scroll",repositionAvatarMenu,{passive:true});window.visualViewport?.addEventListener("resize",repositionAvatarMenu,{passive:true});
 const scheduleMenuClose=()=>{clearTimeout(menuTimer);menuTimer=setTimeout(()=>{if(!avatarMenu.contains(document.activeElement))closeAvatarMenu();},160);};
 const syncAvatarMenu=()=>{
  const hasPhoto=!!photoURLs.avatar,hasStory=!!activeStory;
  avatarWrap.classList.toggle("has-active-story",hasStory);
  avatarMenu.hidden=!canViewPhoto||!canEdit;
  visitorStory.hidden=!canViewPhoto||canEdit||!hasStory||!hasPhoto;
  storyButton.hidden=!canViewPhoto||!hasStory;
  deleteStoryButton.hidden=!hasStory||!isMine||!activeStory?.id;
  addStory.hidden=!canEdit;changePhoto.hidden=!canEdit;removePhoto.hidden=!canEdit||!hasPhoto;
  const changeLabel=changePhoto.querySelector("span");changeLabel.textContent=hasPhoto?t("Змінити фото","Change photo"):t("Завантажити фото","Upload photo");
  avatarTrigger.disabled=!canViewPhoto||(!hasPhoto&&!hasStory&&!canEdit);
  avatarTrigger.setAttribute("aria-haspopup",hasPhoto||hasStory?"dialog":"menu");
  avatarTrigger.setAttribute("aria-label",hasPhoto?t("Відкрити фото профілю","Open profile photo"):hasStory?t("Переглянути історію","View story"):t("Дії з фото профілю","Profile photo actions"));
  if(!canEdit&&!hasPhoto&&!hasStory)closeAvatarMenu();
 };

 const interaction=q("#profile-avatar-engagement"),likesButton=q("#profile-photo-like");
 const likesCount=q("#profile-photo-like-count"),commentList=q("#profile-photo-comments");
 const commentForm=q("#profile-photo-comment-form"),commentInput=q("#profile-photo-comment-text");
 const commentSend=q("#profile-photo-comment-send"),commentStatus=q("#profile-photo-status");
 const shareButton=q("#profile-photo-share");
 const commentSort=q("#profile-photo-comment-sort"),photoCommentsMore=q("#profile-photo-comments-more");
 const commentSortNote=q("#profile-photo-comment-sort-note"),commentFilters=q(".ui-profile-photo-comment-filters-001");
 let likeBusy=false,commentBusy=false,activityTicket=0,photoCommentOffset=0,photoCommentLoading=false;
 const photoPath=()=>["avatar","avatar-history"].includes(mediaDialog.dataset.kind)?gallery[galleryIndex]||null:null;

 const tagFailure=(error,fallback,retry)=>{
  if(!window.VATRA_SERVICE_NOTICE?.report(error,{retry}))reportTag(fallback);
 };
 const loadTags=async()=>{
  const selected=photoPath(),ticket=++tagEpoch;
  tagMarkers.replaceChildren();
  if(!selected)return;
  const {data,error}=await client.from("avatar_photo_tags")
   .select("id,tagged_vatra_id,x_pct,y_pct").eq("owner_vatra_id",targetId)
   .eq("avatar_path",selected).order("created_at",{ascending:true});
  if(ticket!==tagEpoch||selected!==photoPath())return;
  if(error){tagFailure(error,t("Не вдалося завантажити позначки.","Could not load tags."),loadTags);return;}
  if(!data?.length)return;
  const ids=[...new Set(data.map(item=>item.tagged_vatra_id))];
  const result=await client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",ids);
  if(ticket!==tagEpoch||selected!==photoPath())return;
  const names=new Map((result.data||[]).map(item=>[String(item.vatra_id),item.display_name]));
  for(const tag of data){
   const id=String(tag.tagged_vatra_id),label=names.get(id)||"VATRA ID "+id;
   const wrapper=document.createElement("div");wrapper.className="ui-profile-photo-tag-group-001";
   wrapper.style.left=Number(tag.x_pct)+"%";wrapper.style.top=Number(tag.y_pct)+"%";
   const anchor=document.createElement("a");anchor.className="vt-profile-photo-tag-marker-001";
   anchor.href=memberUrl(id);anchor.setAttribute("aria-label",t("Перейти до профілю: ","View profile: ")+label);
   anchor.textContent="•";
   const tooltip=document.createElement("span");tooltip.className="vt-profile-photo-tag-name-001";tooltip.textContent=label;
   anchor.append(tooltip);wrapper.append(anchor);
   if(canEdit||id===String(ownId)){
    const remove=document.createElement("button");remove.className="vt-profile-photo-tag-remove-001";
    remove.type="button";remove.textContent="×";
    remove.setAttribute("aria-label",t("Прибрати позначку: ","Remove tag: ")+label);
    remove.addEventListener("click",async()=>{
     remove.disabled=true;
     const {error:deleteError}=await client.from("avatar_photo_tags").delete().eq("id",tag.id);
     if(deleteError){remove.disabled=false;tagFailure(deleteError,t("Не вдалося прибрати позначку.","Could not remove tag."),loadTags);}
     else void loadTags();
    });
    wrapper.append(remove);
   }
   tagMarkers.append(wrapper);
  }
 };
 let searchTimerId=0;
 const searchPeople=async()=>{
  const term=tagSearch.value.trim().replace(/[%_\\]/g,"").slice(0,50),ticket=++searchEpoch;
  tagResults.replaceChildren();
  if(term.length<2){
   const hint=document.createElement("p");hint.className="vt-profile-photo-tag-message-001";
   hint.textContent=t("Введіть щонайменше 2 символи.","Enter at least 2 characters.");
   tagResults.append(hint);return;
  }
  const {data,error}=await client.from("public_profiles").select("vatra_id,display_name")
   .ilike("display_name","%"+term+"%").limit(8);
  if(ticket!==searchEpoch||tagPicker.hidden)return;
  if(error){tagFailure(error,t("Пошук недоступний.","Search unavailable."),searchPeople);return;}
  if(!data?.length){
   const hint=document.createElement("p");hint.className="vt-profile-photo-tag-message-001";
   hint.textContent=t("Нікого не знайдено.","No members found.");tagResults.append(hint);return;
  }
  for(const member of data){
   const button=document.createElement("button");button.type="button";
   button.className="vt-profile-photo-tag-result-001";button.setAttribute("role","option");
   button.textContent=String(member.display_name||"VATRA")+" · VATRA ID "+member.vatra_id;
   button.addEventListener("click",async()=>{
    const selected=photoPath(),point=tagPosition;
    if(!selected||!point||!canEdit)return;
    button.disabled=true;
    const {error:insertError}=await client.from("avatar_photo_tags").insert({
     owner_vatra_id:Number(targetId),avatar_path:selected,tagged_vatra_id:Number(member.vatra_id),
     x_pct:point.x,y_pct:point.y,created_by:userId
    });
    if(insertError){button.disabled=false;tagFailure(insertError,t("Не вдалося позначити людину або вона вже позначена.","Could not tag this member or they are already tagged."),loadTags);return;}
    closeTagPicker();resetTagMode();reportTag("");void loadTags();
   });
   tagResults.append(button);
  }
 };
 photoCanvas.addEventListener("click",event=>{
  if(!canEdit||!tagMode||event.target!==mediaImage||!photoPath())return;
  const rect=mediaImage.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  tagPosition={x:Math.max(0,Math.min(100,Math.round((event.clientX-rect.left)/rect.width*10000)/100)),
   y:Math.max(0,Math.min(100,Math.round((event.clientY-rect.top)/rect.height*10000)/100))};
  tagPicker.hidden=false;tagSearch.value="";tagResults.replaceChildren();
  reportTag("");tagSearch.focus();void searchPeople();
 });
 tagSearch.addEventListener("input",()=>{
  clearTimeout(searchTimerId);searchTimerId=setTimeout(searchPeople,240);
 });
 tagCancel.addEventListener("click",closeTagPicker);
 setCurrent.addEventListener("click",async()=>{
  if(!canEdit||!photoPath()||photoPath()===saved?.avatar_path)return;
  const path=photoPath();closeMore();setCurrent.disabled=true;
  const result=await client.from("profile_media")
   .update({avatar_path:path,updated_at:new Date().toISOString()})
   .eq("vatra_id",ownId).select("avatar_path").maybeSingle();
  setCurrent.disabled=false;
  if(result.error||result.data?.avatar_path!==path){
   tagFailure(result.error||{status:500},t("Не вдалося змінити фото профілю.","Could not update profile photo."),()=>setCurrent.click());
   return;
  }
  saved={...saved,avatar_path:path};
  window.VATRA_AVATAR?.invalidatePath?.(client,ownId);
  window.VATRA_AVATAR?.fromPath?.(client,ownerEmail,ownId,path);
  await display(saved);renderGalleryPhoto();
  status(t("Фотографію профілю оновлено.","Profile photo updated."));
 });

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
  if(!append){photoCommentOffset=0;commentList.replaceChildren();commentList.classList.remove("is-empty");photoCommentsMore.hidden=true;commentFilters.hidden=true;}
  commentList.setAttribute("aria-busy","true");photoCommentsMore.disabled=true;
  if(!append)feedback(t("Завантаження коментарів…","Loading comments…"));
  try{
   const commentsPromise=client.rpc("vatra_avatar_comment_page",{
    p_owner:Number(targetId),p_avatar_path:path,p_sort:commentSort.value,
    p_offset:photoCommentOffset,p_limit:12
   });
   const likesPromise=refreshLikes?Promise.all([
    client.from("avatar_likes").select("liker_id",{count:"exact",head:true})
     .eq("owner_vatra_id",targetId).eq("avatar_path",path),
    client.from("avatar_likes").select("liker_id")
     .eq("owner_vatra_id",targetId).eq("avatar_path",path).eq("liker_id",userId).limit(1)
   ]):Promise.resolve(null);
   const [comments,likeResults]=await Promise.all([commentsPromise,likesPromise]);
   if(ticket!==activityTicket||path!==photoPath())return;
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
    const reaction=await client.from("avatar_comment_likes").select("comment_id")
     .in("comment_id",ids).eq("liker_id",userId);
    if(!reaction.error)ownCommentLikes=new Set((reaction.data||[]).map(x=>x.comment_id));
   }
   if(ticket!==activityTicket||path!==photoPath())return;
   commentList.classList.toggle("is-empty",!append&&!rows.length);
   if(!append&&!rows.length){
    const placeholder=node("div","ui-profile-photo-empty-state-001"),symbol=document.createElementNS("http://www.w3.org/2000/svg","svg"),p=document.createElementNS("http://www.w3.org/2000/svg","path");
    symbol.setAttribute("class","ui-profile-photo-empty-icon-001");symbol.setAttribute("viewBox","0 0 48 48");symbol.setAttribute("fill","none");symbol.setAttribute("stroke","currentColor");symbol.setAttribute("stroke-width","2.6");symbol.setAttribute("stroke-linecap","round");symbol.setAttribute("stroke-linejoin","round");symbol.setAttribute("aria-hidden","true");p.setAttribute("d","M16 7h22a5 5 0 0 1 5 5v17a5 5 0 0 1-5 5h-4v8l-10-8h-8a5 5 0 0 1-5-5V12a5 5 0 0 1 5-5ZM6 15a5 5 0 0 0-4 5v14a5 5 0 0 0 5 5h5v5l6-5");symbol.append(p);
    placeholder.append(symbol,node("p","vt-profile-photo-no-comments-001",t("Коментарів поки немає. Будьте першими!","No comments yet. Be the first!")));commentList.append(placeholder);
   }
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
    if(names.has(id))void window.VATRA_VERIFIED?.attach(client,author,id);
    const stamp=node("time","vt-profile-photo-comment-time-001",dateText(item.created_at));
    stamp.dateTime=item.created_at;meta.append(author,node("p","vt-profile-photo-comment-body-001",item.body),stamp);head.append(avatar,meta);
    card.append(head);
    if(item.moderation_status==="possible_spam")
     card.append(node("small","vt-profile-photo-comment-spam-001",t("Можливий спам","Potential spam")));
    const reaction=node("button","vt-profile-photo-comment-like-001");
    reaction.type="button";
    const reactionIcon=document.createElementNS("http://www.w3.org/2000/svg","svg");
    reactionIcon.setAttribute("class","ui-profile-photo-comment-heart-001");
    reactionIcon.setAttribute("viewBox","0 0 24 24");
    reactionIcon.setAttribute("width","16");reactionIcon.setAttribute("height","16");
    reactionIcon.setAttribute("stroke","currentColor");
    reactionIcon.setAttribute("stroke-width","1.8");
    reactionIcon.setAttribute("stroke-linejoin","round");
    reactionIcon.setAttribute("aria-hidden","true");
    const heartPath=document.createElementNS("http://www.w3.org/2000/svg","path");
    heartPath.setAttribute("class","ui-profile-photo-comment-heart-path-001");
    heartPath.setAttribute("d","M20.6 8.5c0 4.5-8.6 10-8.6 10s-8.6-5.5-8.6-10a4.6 4.6 0 0 1 8.6-2.2 4.6 4.6 0 0 1 8.6 2.2Z");
    reactionIcon.append(heartPath);
    const reactionLabel=node("span","vt-profile-photo-comment-like-label-001");
    reaction.append(reactionIcon,reactionLabel);
    let countValue=Number(item.likes)||0,reacted=ownCommentLikes.has(item.id);
    const paint=()=>{
     reactionIcon.setAttribute("fill",reacted?"currentColor":"none");
     reactionLabel.textContent=countValue?String(countValue):"";reaction.setAttribute("aria-label",t("Подобається коментар","Like comment"));
     reaction.setAttribute("aria-pressed",String(reacted));
    };
    paint();
    reaction.addEventListener("click",async()=>{
     if(reaction.disabled)return;
     reaction.disabled=true;
     try{
      const result=reacted?
       await client.from("avatar_comment_likes").delete()
        .eq("comment_id",item.id).eq("liker_id",userId):
       await client.from("avatar_comment_likes").insert({comment_id:item.id,liker_id:userId});
      if(result.error)throw result.error;
      reacted=!reacted;countValue+=reacted?1:-1;paint();
     }catch(_){feedback(t("Не вдалося вподобати коментар.","Could not like the comment."),true);}
     finally{reaction.disabled=false;}
    });
    card.append(reaction);commentList.append(card);
   }
   photoCommentOffset+=rows.length;
   commentFilters.hidden=photoCommentOffset===0;
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
    client.from("avatar_likes").delete().eq("avatar_path",path).eq("liker_id",userId):
    client.from("avatar_likes").insert({owner_vatra_id:targetId,avatar_path:path,liker_id:userId});
   const {error}=await query;if(error)throw error;
   if(path===photoPath()&&mediaDialog.open)await reloadPhotoActivity();
  }catch(_){if(path===photoPath()&&mediaDialog.open)feedback(t("Не вдалося змінити вподобання.","Could not update like."),true);}
  finally{likeBusy=false;likesButton.disabled=false;}
 });
 commentForm.addEventListener("submit",async event=>{
  event.preventDefault();
  const path=photoPath(),body=commentInput.value.trim();
  if(commentBusy||!path||!body||Array.from(body).length>1000||!validId(ownId))return;
  commentBusy=true;commentSend.disabled=true;feedback("");
  try{
   const {error}=await client.from("avatar_comments").insert({
    owner_vatra_id:targetId,avatar_path:path,author_id:userId,author_vatra_id:ownId,body
   });
   if(error)throw error;
   if(path===photoPath()&&mediaDialog.open){resetPhotoComposer();await reloadPhotoActivity();}
  }catch(_){if(path===photoPath()&&mediaDialog.open)feedback(t("Не вдалося додати коментар.","Could not add comment."),true);}
  finally{commentBusy=false;commentSend.disabled=!commentInput.value.trim();}
 });
 shareButton.addEventListener("click",async()=>{
  const link=new URL("id"+targetId,home);link.searchParams.set("photo","avatar");const path=photoPath();if(path)link.searchParams.set("image",path.split("/").pop());
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
 q("#profile-photo-comment-text").placeholder=t("Коментувати…","Comment…");
 q("#profile-photo-comment-send").textContent=t("Надіслати","Send");
 q(".vt-profile-photo-comment-label-001").textContent=t("Ваш коментар","Your comment");
 const composerAvatar=q("#profile-photo-composer-avatar"),emojiToggle=q("#profile-photo-emoji-toggle"),emojiPanel=q("#profile-photo-emoji-panel"),cancelComment=q("#profile-photo-comment-cancel");
 const setEmojiOpen=open=>{emojiPanel.hidden=!open;emojiToggle.setAttribute("aria-expanded",String(open));};
 const resetPhotoComposer=()=>{commentForm.classList.remove("is-expanded");commentInput.value="";setEmojiOpen(false);commentSend.disabled=true;};
 const syncComposerAvatar=()=>{const headAvatar=q("#feed-header-avatar");if(headAvatar){composerAvatar.style.backgroundImage=headAvatar.style.backgroundImage;composerAvatar.classList.toggle("has-photo",!!headAvatar.style.backgroundImage);}};
 const expandComposer=()=>{commentForm.classList.add("is-expanded");syncComposerAvatar();};
 commentInput.addEventListener("focus",expandComposer);commentInput.addEventListener("input",()=>{commentSend.disabled=commentBusy||!commentInput.value.trim();});
 cancelComment.addEventListener("click",()=>{resetPhotoComposer();cancelComment.blur();});
 emojiToggle.addEventListener("click",()=>{expandComposer();setEmojiOpen(emojiPanel.hidden);});
 for(const emoji of ["😀","😂","😍","🥰","❤️","👍","🔥","👏","😊","😢","😮","🤔","🎉","🙌","💙","💛","✨","🙏","😎","🤝","😅","😁","🫶","💯"]){const b=node("button","vt-profile-photo-emoji-001",emoji);b.type="button";b.addEventListener("click",()=>{const start=commentInput.selectionStart??commentInput.value.length,end=commentInput.selectionEnd??start;if(commentInput.value.length-(end-start)+emoji.length>1000)return;commentInput.setRangeText(emoji,start,end,"end");commentInput.focus();commentInput.dispatchEvent(new Event("input"));setEmojiOpen(false);});emojiPanel.append(b);}
 mediaDialog.addEventListener("click",e=>{if(!emojiPanel.hidden&&!emojiPanel.contains(e.target)&&!emojiToggle.contains(e.target))setEmojiOpen(false);});
 mediaDialog.addEventListener("close",resetPhotoComposer);
 const listAvatarGallery=async()=>{
  const current=saved?.avatar_path,folder=targetId+"/avatar",bucket=client.storage.from("avatars"),files=[];
  if(typeof bucket.list!=="function")return current?[current]:[];
  for(let offset=0;offset<2000;offset+=100){
   const {data,error}=await bucket.list(folder,{limit:100,offset,sortBy:{column:"created_at",order:"desc"}});
   if(error)throw error;if(!Array.isArray(data))break;
   for(const item of data)if(/^[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(item.name||"")&&!/-original\.(?:jpe?g|png|webp)$/i.test(item.name||"")){const path=folder+"/"+item.name;files.push(path);if(Number.isFinite(Date.parse(item.created_at)))galleryDates.set(path,item.created_at);}
   if(data.length<100)break;
  }
  return [...new Set([...(current?[current]:[]),...files])].filter(path=>getPublicPath(path,"avatar"));
 };
 const renderGalleryPhoto=()=>{
  const path=gallery[galleryIndex],url=getPublicPath(path,"avatar");if(!url)return;
  const current=path===saved?.avatar_path;
  mediaDialog.dataset.kind=current?"avatar":"avatar-history";
  interaction.hidden=false;activityTicket++;
  const displayName=String(q("#profile-heading").textContent||"").trim();
  const photoTitle=t("Фото профілю · ","Profile photo · ")+displayName;
  mediaHeading.textContent=photoTitle;mediaHeading.hidden=true;
  mediaDialog.setAttribute("aria-label",photoTitle);
  mediaDialog.dataset.imageFormat=/\.(?:png|webp)$/i.test(path)?"png":"jpeg";
  photoCanvas.style.removeProperty("width");photoCanvas.style.removeProperty("height");
  // A gallery entry is the circular thumbnail; -original is the full photo.
  // Legacy images without a companion still open their existing file.
  const sourcePath=path.replace(/\.(jpe?g|png|webp)$/i,"-original.$1");
  const sourceUrl=getPublicPath(sourcePath,"avatar");
  mediaImage.onerror=()=>{
   if(mediaImage.src!==sourceUrl||gallery[galleryIndex]!==path)return;
   mediaImage.onerror=null;mediaImage.src=url;originalLink.href=url;
  };
  mediaImage.alt=photoTitle;mediaImage.src=sourceUrl||url;
  if(mediaImage.complete)queueMicrotask(fitPhoto);
  originalLink.href=sourceUrl||url;photoFooter.hidden=false;
  resetTagMode();closeMore();reportTag("");tagMarkers.replaceChildren();tagEpoch++;
  likesCount.textContent="0";likesButton.setAttribute("aria-pressed","false");likesButton.classList.remove("is-liked");
  commentInput.value="";
  prevPhoto.hidden=nextPhoto.hidden=gallery.length<2;
  prevPhoto.disabled=galleryIndex===0;nextPhoto.disabled=galleryIndex>=gallery.length-1;
  galleryToolbar.hidden=false;
  galleryCount.textContent=gallery.length===1?photoTitle:
   photoTitle+" · "+(galleryIndex+1)+t(" із "," of ")+gallery.length;
  galleryDelete.hidden=!canEdit;
  footerReport.hidden=isMine||locked;
  setCurrent.hidden=!canEdit||current;
  footerShare.textContent=t("Поділитися","Share");
  footerReport.textContent=t("Поскаржитися на фото","Report photo");
  galleryDelete.textContent=t("Видалити","Delete");
  footerMore.firstChild.textContent=t("Більше ","More ");
  setCurrent.textContent=t("Зробити фотографією профілю","Make profile photo");
  originalLink.textContent=t("Відкрити оригінал","Open original");
  const owner=q("#profile-photo-owner"),ownerPhoto=q("#profile-photo-owner-avatar"),date=q("#profile-photo-kind");
  owner.textContent=q("#profile-heading").textContent;owner.href=memberUrl(targetId);
  ownerPhoto.href=owner.href;ownerPhoto.setAttribute("aria-label",owner.textContent);
  ownerPhoto.style.backgroundImage=photoURLs.avatar?"url("+JSON.stringify(photoURLs.avatar)+")":"";
  ownerPhoto.classList.toggle("has-photo",!!photoURLs.avatar);
  const uploaded=galleryDates.get(path);const elapsed=uploaded?Math.max(0,Date.now()-Date.parse(uploaded)):Infinity;date.textContent=uploaded?(elapsed<60000?t("Щойно","Just now"):elapsed<86400000?new Intl.RelativeTimeFormat(locale,{numeric:"auto"}).format(-Math.floor(elapsed/(elapsed<3600000?60000:3600000)),elapsed<3600000?"minute":"hour"):dateText(uploaded)):"";date.hidden=!uploaded;if(uploaded)date.dateTime=uploaded;else date.removeAttribute("datetime");
  resetPhotoComposer();syncComposerAvatar();void reloadPhotoActivity();void loadTags();
 };
 const stepPhoto=delta=>{if(pendingAvatarUndo)return;const index=galleryIndex+delta;if(index<0||index>=gallery.length)return;galleryIndex=index;renderGalleryPhoto();};
 prevPhoto.addEventListener("click",()=>stepPhoto(-1));nextPhoto.addEventListener("click",()=>stepPhoto(1));
 document.addEventListener("keydown",event=>{if(!mediaDialog.open||!["avatar","avatar-history"].includes(mediaDialog.dataset.kind)||event.target.matches?.("input,textarea,select,[contenteditable]")||document.querySelector("dialog[open]:not(#profile-media-viewer)"))return;if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();stepPhoto(event.key==="ArrowLeft"?-1:1);}});
 let swipeStart=null;mediaImage.addEventListener("touchstart",event=>{swipeStart=event.touches[0]?.clientX??null;},{passive:true});
 mediaImage.addEventListener("touchend",event=>{if(swipeStart===null)return;const dx=(event.changedTouches[0]?.clientX??swipeStart)-swipeStart;swipeStart=null;if(Math.abs(dx)>55&&["avatar","avatar-history"].includes(mediaDialog.dataset.kind))stepPhoto(dx<0?1:-1);},{passive:true});
 // Covers use their own dialog and the already-rendered banner, never avatar data.
 // Legacy square uploads keep the same crop in the profile and in the viewer.
 const coverViewerDialog=q("#profile-cover-viewer"),coverStage=q("#profile-cover-viewer-stage");
 const coverImage=q("#profile-cover-viewer-image"),coverOriginal=q("#profile-cover-viewer-original");
 let coverEpoch=0,coverFlight=null,coverAnimation=null;
 const clearCoverFlight=()=>{
  coverFlight?.remove();coverFlight=null;
  coverAnimation?.cancel();coverAnimation=null;
 };
 const openCover=()=>{
  const url=photoURLs.cover;
  if(!canViewPhoto||!url||!coverPhoto.complete||!coverPhoto.naturalWidth||coverViewerDialog.open)return;
  closeAvatarMenu();
  const ticket=++coverEpoch,source=coverPhoto.currentSrc||url;
  const origin=coverPhoto.getBoundingClientRect();
  clearCoverFlight();coverViewerDialog.classList.remove("is-ready");
  coverOriginal.hidden=true;coverOriginal.removeAttribute("href");
  coverImage.alt=t("Обкладинка профілю","Profile cover photo");
  let decoded=false,arrived=false,finished=false,decoding=false;
  const finish=()=>{
   if(finished||ticket!==coverEpoch||!coverViewerDialog.open||!decoded||!arrived)return;
   finished=true;
   // An atomic handoff avoids two semi-transparent pictures overlapping
   // and prevents a delayed image decode from flashing a blank frame.
   coverViewerDialog.classList.add("is-ready");
   clearCoverFlight();
  };
  const markDecoded=()=>{
   if(ticket!==coverEpoch||!coverViewerDialog.open)return;
   decoded=true;finish();
  };
  const prepareImage=()=>{
   if(decoding||ticket!==coverEpoch||!coverImage.naturalWidth)return;
   decoding=true;
   if(typeof coverImage.decode==="function"){
    void coverImage.decode().then(markDecoded).catch(()=>{
     if(ticket===coverEpoch&&coverImage.complete&&coverImage.naturalWidth)markDecoded();
    });
   }else markDecoded();
  };
  coverImage.onload=prepareImage;
  coverImage.onerror=()=>{if(ticket===coverEpoch&&coverViewerDialog.open)coverViewerDialog.close();};
  coverImage.src=source;
  coverViewerDialog.showModal();
  const destination=coverStage.getBoundingClientRect();
  const flight=coverPhoto.cloneNode(false);
  flight.removeAttribute("id");flight.removeAttribute("hidden");
  flight.className="ui-profile-cover-flight-001";
  flight.alt="";flight.setAttribute("aria-hidden","true");
  flight.style.left=origin.left+"px";flight.style.top=origin.top+"px";
  flight.style.width=origin.width+"px";flight.style.height=origin.height+"px";
  coverViewerDialog.append(flight);coverFlight=flight;
  const arrivedAtCenter=()=>{if(ticket!==coverEpoch||!coverViewerDialog.open)return;arrived=true;finish();};
  if(matchMedia("(prefers-reduced-motion: reduce)").matches||typeof flight.animate!=="function"){
   flight.style.left=destination.left+"px";flight.style.top=destination.top+"px";
   flight.style.width=destination.width+"px";flight.style.height=destination.height+"px";
   arrivedAtCenter();
  }else{
   coverAnimation=flight.animate([
    {transform:"translate(0px,0px) scale(1,1)",borderRadius:"0px"},
    {transform:"translate("+(destination.left-origin.left)+"px,"+
     (destination.top-origin.top)+"px) scale("+
     (destination.width/Math.max(1,origin.width))+","+
     (destination.height/Math.max(1,origin.height))+")",
     borderRadius:"12px"}
   ],{duration:460,easing:"cubic-bezier(.22,1,.36,1)",fill:"forwards"});
   void coverAnimation.finished.then(arrivedAtCenter).catch(()=>{});
  }
  if(coverImage.complete&&coverImage.naturalWidth)queueMicrotask(prepareImage);
  // Opening a cover never switches to an unverified -original image.
  // New uploads can still open their real, separately saved full original.
  const originalPath=saved?.cover_path?.replace(/\.(jpe?g|png|webp)$/i,"-original.$1");
  const originalUrl=originalPath?getPublicPath(originalPath,"cover"):null;
  if(originalUrl&&originalUrl!==source){
   const probe=new Image();
   probe.onload=()=>{if(ticket!==coverEpoch||!coverViewerDialog.open)return;
    coverOriginal.href=originalUrl;coverOriginal.hidden=false;};
   probe.src=originalUrl;
  }
 };
 const openMedia=kind=>{
  if(kind!=="avatar"||!canViewPhoto)return;
  const url=photoURLs.avatar;if(!url)return;
  closeAvatarMenu();const ticket=++galleryEpoch;
  gallery=saved?.avatar_path?[saved.avatar_path]:[];galleryIndex=0;
  if(!gallery.length)return;
  renderGalleryPhoto();mediaDialog.showModal();
  void listAvatarGallery().then(paths=>{
   if(ticket!==galleryEpoch||!mediaDialog.open)return;
   const selected=gallery[galleryIndex];gallery=paths;
   const requested=new URLSearchParams(location.search).get("image");
   const shared=requested&&/^[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(requested)?
    gallery.findIndex(p=>p.endsWith("/"+requested)):-1;
   galleryIndex=shared>=0?shared:Math.max(0,gallery.indexOf(selected));
   renderGalleryPhoto();
  }).catch(()=>{});
 };
 coverView.addEventListener("click",openCover);
 q("#profile-cover-viewer-close").addEventListener("click",()=>coverViewerDialog.close());
 coverViewerDialog.addEventListener("click",event=>{if(event.target===coverViewerDialog)coverViewerDialog.close();});
 coverViewerDialog.addEventListener("close",()=>{
  coverEpoch++;clearCoverFlight();coverViewerDialog.classList.remove("is-ready");
  coverImage.onload=coverImage.onerror=null;coverImage.removeAttribute("src");
  coverOriginal.hidden=true;coverOriginal.removeAttribute("href");
 });
 mediaDialog.addEventListener("close",()=>{
  galleryEpoch++;activityTicket++;tagEpoch++;resetTagMode();closeMore();
  hideAvatarUndo();discardAvatarUndo();
 });
 window.VATRA_OPEN_PROFILE_AVATAR=()=>{if(canViewPhoto)openMedia("avatar");};
 const openStory=()=>{
  if(!canViewPhoto||!activeStory)return;
  if(Date.parse(activeStory.expires_at)<=Date.now()){
   activeStory=null;syncAvatarMenu();return;
  }
  storyHeading.textContent=q("#profile-heading").textContent;
  storyBody.textContent=activeStory.body||"";
  storyBody.hidden=!String(activeStory.body||"").trim();
  storyDialog.dataset.theme=String(activeStory.theme||0);
  closeAvatarMenu();
  storyDialog.showModal();
  void window.VATRA_POST_MEDIA?.renderStory(client,
   {...activeStory,author_vatra_id:targetId},storyMedia);
 };
 storyButton.addEventListener("click",openStory);
 visitorStory.addEventListener("click",openStory);
 deleteStoryButton.addEventListener("click",async()=>{
  if(!isMine||!activeStory?.id||deleteStoryButton.disabled)return;
  if(!await window.VATRA_PROFILE_CONFIRM({
   title:t("Видалити історію?","Delete this story?"),
   description:t("Історію буде видалено для всіх без можливості відновлення.",
    "This story will be removed for everyone and cannot be restored."),
   action:t("Видалити","Delete")
  }))return;
  const removingId=activeStory.id,removingStory={...activeStory};
  deleteStoryButton.disabled=true;
  try{
   const result=await client.from("stories").delete()
    .eq("id",removingId).eq("author_vatra_id",ownId).select("id");
   if(result.error||!result.data?.some(row=>row.id===removingId))
    throw result.error||new Error("Story not deleted");

   if(removingStory.media_path)try{
    await window.VATRA_POST_MEDIA?.remove(client,removingStory);
   }catch(_){}
   activeStory=null;
   const next=await client.from("stories").select("id,body,theme,expires_at,media_kind,media_path")
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
 q("#profile-media-viewer-close").addEventListener("click",()=>{
  if(!avatarDeleteInProgress&&!uploading)mediaDialog.close();
 });
 mediaDialog.addEventListener("cancel",event=>{
  if(avatarDeleteInProgress||(pendingAvatarUndo&&uploading))event.preventDefault();
 });
 q("#profile-story-viewer-close").addEventListener("click",()=>storyDialog.close());
 storyDialog.addEventListener("close",()=>{
  const video=storyMedia?.querySelector("video");
  if(video)video.pause();
 });
 mediaDialog.addEventListener("click",event=>{
  if(event.target===mediaDialog&&!avatarDeleteInProgress&&!uploading)mediaDialog.close();
 });
 storyDialog.addEventListener("click",event=>{if(event.target===storyDialog)storyDialog.close();});
 let openedByHover=false;
 avatarTrigger.addEventListener("click",()=>{if(!canViewPhoto)return;if(photoURLs.avatar)openMedia("avatar");else if(activeStory)openStory();else if(canEdit)showAvatarMenu();});
 plus.addEventListener("pointerenter",event=>{if(event.pointerType==="mouse"){openedByHover=true;showAvatarMenu();}});
 plus.addEventListener("pointerleave",scheduleMenuClose);
 plus.addEventListener("click",()=>{if(openedByHover){openedByHover=false;showAvatarMenu();}else if(avatarWrap.classList.contains("is-menu-open"))closeAvatarMenu();else showAvatarMenu();});
 avatarMenu.addEventListener("pointerenter",()=>clearTimeout(menuTimer));avatarMenu.addEventListener("pointerleave",scheduleMenuClose);
 avatarWrap.addEventListener("pointerleave",()=>{openedByHover=false;scheduleMenuClose();});
 addStory.addEventListener("click",closeAvatarMenu);
 avatarWrap.addEventListener("focusout",event=>{if(!avatarWrap.contains(event.relatedTarget))closeAvatarMenu();});
 avatarWrap.addEventListener("keydown",event=>{
  if(event.key==="Escape"){event.preventDefault();closeAvatarMenu();(canEdit?plus:avatarTrigger).focus();}
  else if(event.key==="ArrowDown"&&!avatarMenu.hidden){showAvatarMenu();const item=[...avatarMenu.querySelectorAll("button")].find(button=>!button.hidden);if(item){event.preventDefault();item.focus();}}
 });
 document.addEventListener("pointerdown",event=>{
  if(!avatarWrap.contains(event.target))closeAvatarMenu();
 });

 coverPhoto.addEventListener("load",()=>{
  if(!photoURLs.cover||coverPhoto.src!==photoURLs.cover)return;
  coverPhoto.hidden=false;
  if(systemCover)systemCover.hidden=true;
  cover.classList.add("has-photo");
  coverView.hidden=!canViewPhoto;
 });
 coverPhoto.addEventListener("error",()=>{
  coverPhoto.hidden=true;coverView.hidden=true;
  if(systemCover)systemCover.hidden=false;
  cover.classList.remove("has-photo");
 });
 const display=record=>{
  if(systemCover){

   systemCover.dataset.vatraCoverState="default";
   systemCover.hidden=false;
  }
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
    coverPhoto.hidden=false;if(systemCover)systemCover.hidden=true;
    cover.classList.add("has-photo");coverView.hidden=!canViewPhoto;
   }).catch(()=>{}):Promise.resolve();
  resetImage(avatar);
  window.VATRA_AVATAR?.fallback(avatar,"default");
  avatarWrap.dataset.vatraSystemAvatar="true";
  avatarWrap.dataset.vatraRingKind="default";
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
   avatarWrap.dataset.vatraSystemAvatar="false";
   avatarWrap.removeAttribute("data-vatra-ring-kind");
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

  const request=()=>client.from("profile_media")
   .select("avatar_path,cover_path").eq("vatra_id",targetId).maybeSingle();
  let response=await (preloadedMedia||request());
  if(response?.error||!response?.data)response=await request();



  if(response?.error||!response?.data){
   const findPublic=async(kind)=>{
    const folder=targetId+"/"+(kind==="avatar"?"avatar":"cover");
    const bucket=client.storage.from(bucketFor(kind));
    if(typeof bucket.list!=="function")return null;
    const {data:items,error}=await bucket.list(folder,{
     limit:10,sortBy:{column:"created_at",order:"desc"}
    });
    if(error)return null;
    const file=(items||[]).find(item=>/^[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(item.name||""));
    return file?folder+"/"+file.name:null;
   };
   const results=await Promise.allSettled([findPublic("avatar"),findPublic("cover")]);
   const media={
    avatar_path:results[0].status==="fulfilled"?results[0].value:null,
    cover_path:results[1].status==="fulfilled"?results[1].value:null
   };
   if(media.avatar_path||media.cover_path)response={data:media,error:null};
  }
  if(!response?.error&&response?.data){saved=response.data;await display(response.data);}
 }catch(_){}
 finally{
  cover.classList.remove("is-loading-media");
  avatarWrap.classList.remove("is-loading-media");
 }

 if(!locked)try{
  const {data,error}=await client.from("stories")
   .select("id,body,theme,expires_at,media_kind,media_path")
   .eq("author_vatra_id",targetId)
   .gt("expires_at",new Date().toISOString())
   .order("created_at",{ascending:false})
   .limit(1);
  if(!error&&Array.isArray(data)&&typeof data[0]?.body==="string")
   activeStory=data[0];
 }catch(_){}
 syncAvatarMenu();
 if(!canEdit)return;
 buttonAvatar.hidden=false;buttonCover.hidden=false;
 const fileTypes={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
 let uploading=false;
 async function uploadImage(file,kind,originalFile=null){
  if(uploading)return false;
  const ext=fileTypes[file?.type];
  if(!ext||!file?.size||file.size>6291456){
   status(t("Оберіть JPEG, PNG або WebP до 6 МБ.","Choose a JPEG, PNG or WebP under 6 MB."),true);return false;
  }
  uploading=true;buttonAvatar.disabled=true;buttonCover.disabled=true;coverChange.disabled=true;changePhoto.disabled=true;removePhoto.disabled=true;
  status(t("Завантажуємо зображення…","Uploading image…"));
  const filename=typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function"?
   crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),
    value=>value.toString(16).padStart(2,"0")).join("");
  const path=ownId+"/"+kind+"/"+filename+"."+ext;
  const originalExt=fileTypes[originalFile?.type];
  const originalPath=originalExt?ownId+"/"+kind+"/"+filename+"-original."+originalExt:null;
  const uploadedPaths=[];let committed=false;
  try{
   if(originalFile&&!originalPath)throw Error("Unsupported source format");
   if(originalPath){
    const {error:originalError}=await client.storage.from(bucketFor(kind)).upload(originalPath,originalFile,{
     contentType:originalFile.type,cacheControl:"3600",upsert:false
    });
    if(originalError)throw originalError;
    uploadedPaths.push(originalPath);
   }
   const {error:uploadError}=await client.storage.from(bucketFor(kind)).upload(path,file,{
    contentType:file.type,cacheControl:"3600",upsert:false
   });
   if(uploadError)throw uploadError;
   uploadedPaths.push(path);
   const column=kind==="avatar"?"avatar_path":"cover_path";
   const values={[column]:path,updated_at:new Date().toISOString()};
   const operation=saved?
    client.from("profile_media").update(values).eq("vatra_id",ownId)
     .select("vatra_id,"+column).maybeSingle():
    client.from("profile_media").insert({vatra_id:ownId,...values})
     .select("vatra_id,"+column).maybeSingle();
   const {data:stored,error:dbError}=await operation;
   if(dbError||String(stored?.[column]||"")!==path){



    throw dbError||new Error("Profile media update did not persist");
   }


   committed=true;
   saved={...saved,...values};
   await display(saved);
   if(kind==="avatar"){
    window.VATRA_AVATAR?.invalidatePath?.(client,ownId);
    window.VATRA_AVATAR?.fromPath(client,ownerEmail,ownId,path);
   }
   status(t("Зображення збережено.","Image saved."));return true;
  }catch(_){
   if(!committed&&uploadedPaths.length)try{await client.storage.from(bucketFor(kind)).remove(uploadedPaths);}catch(_){}
   status(t("Не вдалося завантажити зображення. Спробуйте ще раз.",
    "Could not upload the image. Please retry."),true);return false;}
  finally{
   uploading=false;buttonAvatar.disabled=false;buttonCover.disabled=false;coverChange.disabled=false;changePhoto.disabled=false;removePhoto.disabled=false;
   fileAvatar.value="";fileCover.value="";
  }
 }
 const crop=q("#profile-avatar-crop-dialog"),finish=q("#profile-avatar-finish-dialog"),canvas=q("#profile-avatar-crop-canvas"),zoom=q("#profile-avatar-crop-zoom"),preview=q("#profile-avatar-finish-preview"),save=q("#profile-avatar-finish-save"),finishError=q("#profile-avatar-finish-error");
 let source=null,sourceFile=null,sourceURL=null,previewURL=null,cropped=null,selection=null,drag=null,transitioning=false,finishing=false,sourceMime="image/webp",coverSourceMime="image/webp";
 const release=()=>{if(sourceURL)URL.revokeObjectURL(sourceURL);if(previewURL)URL.revokeObjectURL(previewURL);sourceURL=previewURL=null;source=sourceFile=cropped=selection=drag=null;fileAvatar.value="";preview.removeAttribute("src");};
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const encodeProfileCrop=async(image,rect,width,height,name,mime="image/webp")=>{const out=document.createElement("canvas");out.width=width;out.height=height;const context=out.getContext("2d");if(!context)throw Error("Canvas unavailable");context.drawImage(image,rect.x,rect.y,rect.w,rect.h,0,0,width,height);const blob=await new Promise(resolve=>out.toBlob(resolve,fileTypes[mime]?mime:"image/webp",.94));if(!blob||!fileTypes[blob.type])throw Error("Image encoding failed");return new File([blob],name+"."+fileTypes[blob.type],{type:blob.type});};
 const constrain=()=>{const max=Math.min(canvas.width,canvas.height);selection.size=clamp(selection.size,max/5,max);selection.x=clamp(selection.x,0,canvas.width-selection.size);selection.y=clamp(selection.y,0,canvas.height-selection.size);zoom.value=String(max/selection.size);};
 const draw=()=>{if(!source||!selection)return;constrain();const ctx=canvas.getContext("2d"),{x,y,size}=selection;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);ctx.save();ctx.fillStyle="rgba(15,23,42,.58)";ctx.beginPath();ctx.rect(0,0,canvas.width,canvas.height);ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2,true);ctx.fill("evenodd");ctx.restore();ctx.fillStyle="#fff";
  for(const [cx,cy] of [[x,y],[x+size,y],[x,y+size],[x+size,y+size]])ctx.fillRect(cx-4,cy-4,8,8);
 };
 const closeStep=(from,to)=>{transitioning=true;from.close();to.showModal();transitioning=false;};
 const startCrop=async file=>{if(uploading||finishing||crop.open||finish.open||coverLoading||coverSaving||coverDialog.open)return;
  if(!fileTypes[file?.type]||!file?.size||file.size>6291456){status(t("Оберіть JPEG, PNG або WebP до 6 МБ.","Choose a JPEG, PNG or WebP under 6 MB."),true);fileAvatar.value="";return;}
  release();sourceFile=file;sourceMime=file.type;const img=new Image();const url=URL.createObjectURL(file);sourceURL=url;
  try{img.src=url;await img.decode();if(sourceURL!==url)return;source=img;const ratio=Math.min(1,720/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));const size=Math.min(canvas.width,canvas.height);selection={x:(canvas.width-size)/2,y:(canvas.height-size)/2,size};zoom.value="1";q("#profile-avatar-publish-post").checked=false;q("#profile-avatar-publish-story").checked=false;finishError.hidden=true;draw();crop.showModal();}catch(_){release();status(t("Не вдалося відкрити фото.","Could not open photo."),true);}
 };
 const canvasPoint=(surface,e)=>{const r=surface.getBoundingClientRect();return{x:(e.clientX-r.left)*surface.width/r.width,y:(e.clientY-r.top)*surface.height/r.height};};
 const point=e=>canvasPoint(canvas,e);
 canvas.addEventListener("pointerdown",e=>{if(!selection)return;e.preventDefault();const p=point(e),{x,y,size}=selection,r=canvas.getBoundingClientRect(),hit=14*canvas.width/r.width;const corners=[[x,y,-1,-1],[x+size,y,1,-1],[x,y+size,-1,1],[x+size,y+size,1,1]];const corner=corners.find(([cx,cy])=>Math.hypot(p.x-cx,p.y-cy)<=hit);if(!corner&&(p.x<x||p.x>x+size||p.y<y||p.y>y+size))return;drag={id:e.pointerId,p,start:{...selection},corner};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener("pointermove",e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e),dx=p.x-drag.p.x,dy=p.y-drag.p.y,{x,y,size}=drag.start; if(drag.corner){const [,,sx,sy]=drag.corner,ax=sx<0?x+size:x,ay=sy<0?y+size:y;const available=Math.min(sx<0?ax:canvas.width-ax,sy<0?ay:canvas.height-ay);const next=clamp(size+(dx*sx+dy*sy)/2,Math.min(canvas.width,canvas.height)/5,available);selection={x:sx<0?ax-next:ax,y:sy<0?ay-next:ay,size:next};}else selection={x:x+dx,y:y+dy,size};draw();});
 for(const event of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(event,()=>{drag=null;});
 canvas.addEventListener("keydown",e=>{if(!selection)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(e.key==="+"||e.key==="="||e.key==="-"){e.preventDefault();const old=selection.size,size=clamp(old*(e.key==="-"?1.1:.9),Math.min(canvas.width,canvas.height)/5,Math.min(canvas.width,canvas.height));selection={x:selection.x+(old-size)/2,y:selection.y+(old-size)/2,size};draw();return;}if(!delta)return;e.preventDefault();selection.x+=delta[0]*(e.shiftKey?20:5);selection.y+=delta[1]*(e.shiftKey?20:5);draw();});
 zoom.addEventListener("input",()=>{if(!selection)return;const size=Math.min(canvas.width,canvas.height)/Number(zoom.value),centerX=selection.x+selection.size/2,centerY=selection.y+selection.size/2;selection={x:centerX-size/2,y:centerY-size/2,size};draw();});
 q("#profile-avatar-crop-next").addEventListener("click",async()=>{if(!source||!selection)return;const next=q("#profile-avatar-crop-next");next.disabled=true;
  try{const width=Math.min(1024,Math.max(1,Math.round(selection.size*source.naturalWidth/canvas.width))),rect={x:selection.x*source.naturalWidth/canvas.width,y:selection.y*source.naturalHeight/canvas.height,w:selection.size*source.naturalWidth/canvas.width,h:selection.size*source.naturalHeight/canvas.height};const file=await encodeProfileCrop(source,rect,width,width,"profile-photo",sourceMime);if(!crop.open)return;cropped=file;if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(cropped);preview.src=previewURL;closeStep(crop,finish);}catch(_){status(t("Не вдалося створити мініатюру.","Could not create thumbnail."),true);}finally{next.disabled=false;}
 });
 q("#profile-avatar-crop-cancel").addEventListener("click",()=>crop.close());q("#profile-avatar-finish-back").addEventListener("click",()=>{if(!finishing)closeStep(finish,crop);});
 for(const d of [crop,finish]){d.addEventListener("close",()=>{if(!transitioning&&!crop.open&&!finish.open&&!finishing)release();});d.addEventListener("cancel",e=>{if(finishing)e.preventDefault();});}
 save.addEventListener("click",async()=>{if(!cropped||finishing)return;finishing=true;save.disabled=true;q("#profile-avatar-finish-back").disabled=true;finishError.hidden=true;const photo=cropped,wantPost=q("#profile-avatar-publish-post").checked,wantStory=q("#profile-avatar-publish-story").checked;try{
  if(!await uploadImage(photo,"avatar",sourceFile)){finishError.textContent=t("Не вдалося зберегти фото. Повторіть спробу.","Could not save photo. Try again.");finishError.hidden=false;return;}
  const failures=[];if(wantPost){let uploaded=null;try{uploaded=await window.VATRA_POST_MEDIA.uploadGallery(client,ownId,[photo]);const r=await client.from("feed_posts").insert({author_id:userId,author_vatra_id:ownId,body:"",visibility:"friends",media_items:uploaded});if(r.error)throw r.error;}catch(_){if(uploaded)try{await window.VATRA_POST_MEDIA.removeGallery(client,uploaded);}catch(_){}failures.push(t("допис","post"));}}
  if(wantStory){let uploaded=null;try{uploaded=await window.VATRA_POST_MEDIA.uploadStory(client,ownId,photo);const r=await client.from("stories").insert({author_vatra_id:ownId,body:"",theme:0,...uploaded});if(r.error)throw r.error;}catch(_){if(uploaded)try{await window.VATRA_POST_MEDIA.remove(client,uploaded);}catch(_){}failures.push(t("історію","story"));}}
  finish.close();release();if(failures.length){status(t("Фото збережено, але не вдалося опублікувати: ","Photo saved, but could not publish: ")+failures.join(", "),true);}else if(wantPost||wantStory)location.reload();
 }finally{finishing=false;save.disabled=false;q("#profile-avatar-finish-back").disabled=false;}});
 const updateCurrentAvatar=async next=>{
  const r=await client.from("profile_media")
   .update({avatar_path:next,updated_at:new Date().toISOString()})
   .eq("vatra_id",ownId).select("vatra_id,avatar_path").maybeSingle();
  if(r.error||!r.data||r.data.avatar_path!==next)throw Error("Avatar change not saved");
  saved={...saved,avatar_path:next};
 };
 const avatarType=path=>/\.png$/i.test(path)?"image/png":/\.webp$/i.test(path)?"image/webp":"image/jpeg";
 async function removeAvatarPath(path){
  if(uploading||finishing||pendingAvatarUndo||!canEdit||
   !path||!path.startsWith(ownId+"/avatar/"))return;
  closeAvatarMenu();
  if(!await window.VATRA_PROFILE_CONFIRM({
   title:t("Видалити фото?","Delete photo?"),
   description:t("Після видалення ви зможете відновити фото в переглядачі, поки не закриєте його.",
    "You can restore the deleted photo in this viewer until you close it."),
   action:t("Видалити","Delete")
  }))return;
  uploading=true;avatarDeleteInProgress=true;galleryEpoch++;removePhoto.disabled=galleryDelete.disabled=true;
  const previous=saved?.avatar_path||null;
  let changed=false,previewUrl=null;
  try{
   const storage=client.storage.from("avatars");
   // Download before removing; never offer an Undo that cannot re-upload.
   const thumb=await storage.download(path);
   if(thumb.error||!(thumb.data instanceof Blob))throw Error("Could not back up avatar");
   const originalPath=path.replace(/\.(jpe?g|png|webp)$/i,"-original.$1");
   const full=await storage.download(originalPath);
   const missingOriginal=full.error&&(
    String(full.error.status||full.error.statusCode||"")==="404"||
    /not found|does not exist|No such file/i.test(String(full.error.message||"")));
   if(full.error&&!missingOriginal)throw full.error;
   const fullBlob=full.error?null:full.data;
   if(fullBlob&&!(fullBlob instanceof Blob))throw Error("Invalid avatar original backup");
   previewUrl=URL.createObjectURL(fullBlob||thumb.data);
   if(!mediaDialog.open){
    const paths=await listAvatarGallery();
    gallery=[...new Set([path,...paths])];
    galleryIndex=gallery.indexOf(path);
    renderGalleryPhoto();mediaDialog.showModal();
   }
   const galleryBefore=[...gallery],indexBefore=galleryIndex;
   if(path===previous){
    const paths=await listAvatarGallery(),next=paths.find(p=>p!==path)||null;
    await updateCurrentAvatar(next);changed=true;
   }
   const removed=await storage.remove([path,...(fullBlob?[originalPath]:[])]);
   if(removed.error)throw removed.error;
   gallery=gallery.filter(p=>p!==path);
   galleryIndex=Math.max(0,Math.min(galleryIndex,gallery.length-1));
   pendingAvatarUndo={path,previous,galleryBefore,indexBefore,originalPath,
    thumbnail:thumb.data,original:fullBlob,previewUrl,thumbnailRestored:false,originalRestored:!fullBlob};
   previewUrl=null;
   if(changed){
    window.VATRA_AVATAR?.invalidatePath?.(client,ownId);
    try{await display(saved);}catch(_){/* The deleted photo remains safely recoverable. */}
   }
   deletedMessage.textContent=t("Фотографію видалено.","Photo deleted.");
   restoreAvatarButton.textContent=t("Відновити","Restore");
   restoreAvatarButton.disabled=false;
   mediaDialog.classList.add("is-photo-deleted");deletedNotice.hidden=false;
   closeMore();tagMarkers.replaceChildren();tagEpoch++;activityTicket++;
   mediaImage.onerror=null;mediaImage.src=pendingAvatarUndo.previewUrl;
   prevPhoto.disabled=nextPhoto.disabled=true;
   fitPhoto();
   status(t("Фото видалено. Його можна відновити до закриття переглядача.",
    "Photo deleted. You can restore it before closing the viewer."));
  }catch(error){
   if(changed)try{
    await updateCurrentAvatar(previous);window.VATRA_AVATAR?.invalidatePath?.(client,ownId);
    await display(saved);
   }catch(_){}
   if(previewUrl)URL.revokeObjectURL(previewUrl);
   status(t("Не вдалося безпечно видалити фото. Спробуйте ще раз.",
    "Could not safely delete the photo. Please try again."),true);
  }finally{uploading=false;avatarDeleteInProgress=false;removePhoto.disabled=galleryDelete.disabled=false;}
 }
 restoreAvatarButton.addEventListener("click",async()=>{
  const undo=pendingAvatarUndo;
  if(!undo||!canEdit||uploading)return;
  uploading=true;restoreAvatarButton.disabled=true;
  try{
   const storage=client.storage.from("avatars");
   if(!undo.thumbnailRestored){
    const r=await storage.upload(undo.path,undo.thumbnail,
     {contentType:avatarType(undo.path),upsert:false});
    if(r.error)throw r.error;
    undo.thumbnailRestored=true;
   }
   if(undo.original&&!undo.originalRestored){
    const r=await storage.upload(undo.originalPath,undo.original,
     {contentType:avatarType(undo.originalPath),upsert:false});
    if(r.error)throw r.error;
    undo.originalRestored=true;
   }
   if(undo.path===undo.previous)await updateCurrentAvatar(undo.path);
   gallery=undo.galleryBefore;
   galleryIndex=undo.indexBefore;
   pendingAvatarUndo=null;hideAvatarUndo();
   if(undo.previewUrl)URL.revokeObjectURL(undo.previewUrl);
   window.VATRA_AVATAR?.invalidatePath?.(client,ownId);
   try{await display(saved);}catch(_){}
   renderGalleryPhoto();
   status(t("Фотографію відновлено.","Photo restored."));
  }catch(_){
   status(t("Не вдалося відновити фото. Повторіть спробу, не закриваючи переглядач.",
    "Could not restore the photo. Retry without closing this viewer."),true);
  }finally{uploading=false;restoreAvatarButton.disabled=false;}
 });
 removePhoto.addEventListener("click",()=>void removeAvatarPath(saved?.avatar_path));
 galleryDelete.addEventListener("click",()=>void removeAvatarPath(gallery[galleryIndex]));
 buttonAvatar.addEventListener("click",()=>fileAvatar.click());changePhoto.addEventListener("click",()=>{closeAvatarMenu();fileAvatar.click();});
 buttonCover.addEventListener("click",()=>fileCover.click());coverChange.addEventListener("click",()=>fileCover.click());
 fileAvatar.addEventListener("change",()=>{if(fileAvatar.files?.[0])void startCrop(fileAvatar.files[0]);});

 // Cover thumbnail is exactly 2000 × 580; preserve the unedited source for fullscreen.
 const coverDialog=q("#profile-cover-edit-dialog"),coverCanvas=q("#profile-cover-crop-canvas"),coverZoom=q("#profile-cover-crop-zoom");
 const coverCropPanel=q("#profile-cover-crop-panel"),coverPreviewPanel=q("#profile-cover-preview-panel"),coverPreviewCanvas=q("#profile-cover-preview-image");
 const coverStep=q("#profile-cover-edit-step"),coverSave=q("#profile-cover-edit-save"),coverClose=q("#profile-cover-edit-close"),coverError=q("#profile-cover-edit-error");
 const coverDesktop=q("#profile-cover-preview-desktop"),coverMobile=q("#profile-cover-preview-mobile"),coverCard=q("#profile-cover-preview-card");
 const desktopRatio=2000/580,mobileRatio=390/185;
 let coverSource=null,coverSourceFile=null,coverSourceURL=null,coverSelection=null,coverDrag=null,coverLoading=false,coverSaving=false,coverPreviewing=false;
 const coverNote=text=>{coverError.textContent=text;coverError.hidden=!text;};
 const coverRelease=()=>{if(coverSourceURL)URL.revokeObjectURL(coverSourceURL);coverSourceURL=null;coverSource=coverSourceFile=coverSelection=coverDrag=null;fileCover.value="";coverCanvas.width=coverCanvas.height=1;coverPreviewCanvas.width=coverPreviewCanvas.height=1;};
 const cropLimit=()=>Math.min(coverCanvas.width,coverCanvas.height*desktopRatio);
 const constrainCover=()=>{if(!coverSelection)return;const max=cropLimit();coverSelection.width=clamp(coverSelection.width,max/5,max);const height=coverSelection.width/desktopRatio;coverSelection.x=clamp(coverSelection.x,0,coverCanvas.width-coverSelection.width);coverSelection.y=clamp(coverSelection.y,0,coverCanvas.height-height);coverZoom.value=String(max/coverSelection.width);};
 const drawCover=()=>{
  if(!coverSource||!coverSelection)return;
  constrainCover();
  const ctx=coverCanvas.getContext("2d"),{x,y,width:w}=coverSelection;
  const h=w/desktopRatio,mobileW=h*mobileRatio,mobileX=x+(w-mobileW)/2;
  ctx.clearRect(0,0,coverCanvas.width,coverCanvas.height);
  ctx.drawImage(coverSource,0,0,coverCanvas.width,coverCanvas.height);
  ctx.save();
  ctx.fillStyle="rgba(15,23,42,.68)";
  ctx.beginPath();ctx.rect(0,0,coverCanvas.width,coverCanvas.height);ctx.rect(x,y,w,h);ctx.fill("evenodd");
  // Desktop displays all of the 2000×580 crop; mobile displays its center.
  ctx.fillStyle="rgba(15,23,42,.25)";
  ctx.fillRect(x,y,mobileX-x,h);
  ctx.fillRect(mobileX+mobileW,y,x+w-mobileX-mobileW,h);
  const scale=coverCanvas.width/Math.max(1,coverCanvas.getBoundingClientRect().width);
  ctx.lineWidth=Math.max(1,scale);ctx.strokeStyle="#fff";ctx.strokeRect(x,y,w,h);
  ctx.strokeStyle="#b9d6ff";ctx.strokeRect(mobileX,y,mobileW,h);
  const handle=Math.max(3,4*scale);ctx.fillStyle="#fff";
  for(const [cx,cy] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]])ctx.fillRect(cx-handle/2,cy-handle/2,handle,handle);
  ctx.restore();
 };
 const readCoverRect=()=>{
  constrainCover();const {x,y,width:w}=coverSelection,h=w/desktopRatio;
  return{x:x*coverSource.naturalWidth/coverCanvas.width,
   y:y*coverSource.naturalHeight/coverCanvas.height,
   w:w*coverSource.naturalWidth/coverCanvas.width,
   h:h*coverSource.naturalHeight/coverCanvas.height};
 };
 const paintCoverPreview=()=>{
  if(!coverSource||!coverSelection)return;
  const mobile=coverCard.dataset.device==="mobile",selected=readCoverRect();
  const visibleWidth=selected.h*mobileRatio;
  const rect=mobile?
   {x:selected.x+(selected.w-visibleWidth)/2,y:selected.y,w:visibleWidth,h:selected.h}:selected;
  coverPreviewCanvas.width=mobile?390:1000;
  coverPreviewCanvas.height=mobile?185:290;
  coverPreviewCanvas.getContext("2d").drawImage(coverSource,rect.x,rect.y,rect.w,rect.h,0,0,coverPreviewCanvas.width,coverPreviewCanvas.height);
  const previewAvatar=q("#profile-cover-preview-avatar");
  previewAvatar.style.backgroundImage=photoURLs.avatar?"url("+JSON.stringify(photoURLs.avatar)+")":"";
  const heading=q("#profile-heading");
  q("#profile-cover-preview-name").textContent=heading.querySelector(".vatra-verified-name-text")?.textContent||heading.textContent.trim();
 };
 const selectCoverDevice=mobile=>{coverCard.dataset.device=mobile?"mobile":"desktop";coverDesktop.setAttribute("aria-pressed",String(!mobile));coverMobile.setAttribute("aria-pressed",String(mobile));paintCoverPreview();};
 const showCoverStep=show=>{
  coverPreviewing=show;coverCropPanel.hidden=show;coverPreviewPanel.hidden=!show;
  q("#profile-cover-edit-title").textContent=show?t("Попередній перегляд","Preview"):t("Редагування обкладинки","Edit cover");
  coverStep.textContent=show?t("Повернутися до редагування","Back to editing"):t("Попередній перегляд","Preview");
  if(show)selectCoverDevice(false);else drawCover();
 };
 const startCoverCrop=async file=>{
  if(uploading||finishing||coverLoading||coverSaving||coverDialog.open||crop.open||finish.open)return;
  if(!fileTypes[file?.type]||!file?.size||file.size>6291456){status(t("Оберіть JPEG, PNG або WebP до 6 МБ.","Choose a JPEG, PNG or WebP under 6 MB."),true);fileCover.value="";return;}
  coverRelease();coverSourceFile=file;coverSourceMime=file.type;coverLoading=true;const img=new Image(),url=URL.createObjectURL(file);coverSourceURL=url;
  try{img.src=url;await img.decode();if(coverSourceURL!==url)return;coverSource=img;const scale=Math.min(1,900/Math.max(img.naturalWidth,img.naturalHeight));
   coverCanvas.width=Math.max(1,Math.round(img.naturalWidth*scale));coverCanvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const w=cropLimit();coverSelection={width:w,x:(coverCanvas.width-w)/2,y:(coverCanvas.height-w/desktopRatio)/2};coverZoom.value="1";coverNote("");showCoverStep(false);coverDialog.showModal();drawCover();
  }catch(_){coverRelease();status(t("Не вдалося відкрити обкладинку.","Could not open cover image."),true);}finally{coverLoading=false;}
 };
 coverStep.addEventListener("click",()=>{if(!coverSaving)showCoverStep(!coverPreviewing);});
 coverDesktop.addEventListener("click",()=>selectCoverDevice(false));coverMobile.addEventListener("click",()=>selectCoverDevice(true));
 coverClose.addEventListener("click",()=>{if(!coverSaving)coverDialog.close();});
 coverDialog.addEventListener("cancel",e=>{if(coverSaving)e.preventDefault();});
 coverDialog.addEventListener("close",()=>{if(!coverDialog.open&&!coverSaving)coverRelease();});
 coverZoom.addEventListener("input",()=>{if(!coverSelection)return;const w=cropLimit()/Number(coverZoom.value),old=coverSelection.width;coverSelection={width:w,x:coverSelection.x+(old-w)/2,y:coverSelection.y+(old-w)/(2*desktopRatio)};drawCover();});
 coverCanvas.addEventListener("pointerdown",e=>{if(!coverSelection||!e.isPrimary||e.button!==0)return;e.preventDefault();const p=canvasPoint(coverCanvas,e),{x,y,width:w}=coverSelection,h=w/desktopRatio,hit=15*coverCanvas.width/Math.max(1,coverCanvas.getBoundingClientRect().width);
  const corner=[[x,y,-1,-1],[x+w,y,1,-1],[x,y+h,-1,1],[x+w,y+h,1,1]].find(([cx,cy])=>Math.hypot(p.x-cx,p.y-cy)<=hit);
  coverDrag={id:e.pointerId,p,start:{...coverSelection},corner};coverCanvas.setPointerCapture(e.pointerId);
 });
 coverCanvas.addEventListener("pointermove",e=>{if(!coverDrag||coverDrag.id!==e.pointerId)return;const p=canvasPoint(coverCanvas,e),dx=p.x-coverDrag.p.x,dy=p.y-coverDrag.p.y,{x,y,width:w}=coverDrag.start;
  if(coverDrag.corner){const [,,sx,sy]=coverDrag.corner,ax=sx<0?x+w:x,ay=sy<0?y+w/desktopRatio:y,available=Math.min(sx<0?ax:coverCanvas.width-ax,(sy<0?ay:coverCanvas.height-ay)*desktopRatio),next=clamp(w+(dx*sx+dy*sy/desktopRatio)/(1+1/(desktopRatio*desktopRatio)),Math.min(cropLimit()/5,available),available);coverSelection={width:next,x:sx<0?ax-next:ax,y:sy<0?ay-next/desktopRatio:ay};}
  else coverSelection={width:w,x:x+dx,y:y+dy};drawCover();
 });
 for(const event of ["pointerup","pointercancel","lostpointercapture"])coverCanvas.addEventListener(event,()=>{coverDrag=null;});
 coverCanvas.addEventListener("keydown",e=>{if(!coverSelection)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;e.preventDefault();coverSelection.x+=delta[0]*(e.shiftKey?20:5);coverSelection.y+=delta[1]*(e.shiftKey?20:5);drawCover();});
 coverSave.addEventListener("click",async()=>{
  if(!coverSource||!coverSelection||coverSaving||uploading)return;coverSaving=true;coverSave.disabled=coverStep.disabled=coverClose.disabled=true;coverNote("");
  try{const rect=readCoverRect();
   const file=await encodeProfileCrop(coverSource,rect,2000,580,"profile-cover",coverSourceMime);
   if(!await uploadImage(file,"cover",coverSourceFile))throw Error("Cover upload failed");
   coverDialog.close();coverRelease();
  }catch(_){coverNote(t("Не вдалося зберегти обкладинку. Спробуйте ще раз.","Could not save cover. Try again."));}
  finally{coverSaving=false;coverSave.disabled=coverStep.disabled=coverClose.disabled=false;}
 });
 fileCover.addEventListener("change",()=>{if(fileCover.files?.[0])void startCoverCrop(fileCover.files[0]);});

}
async function loadOwnHeaderAvatar(client,ownId,email){
 if(!validId(ownId))return {data:null,error:Error("Invalid member ID")};
 try{

  const response=await client.from("profile_media")
   .select("avatar_path,cover_path").eq("vatra_id",ownId).maybeSingle();
  if(response.error)return response;



  window.VATRA_AVATAR?.fromPath(client,email,ownId,response.data?.avatar_path||null);
  return response;
 }catch(error){

  return {data:null,error};
 }
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
  if(error||!data?.user?.id||!data.user.email_confirmed_at){
   const id=location.pathname.match(/\/id([1-9][0-9]{0,18})$/)?.[1];
   if(!data?.user?.id&&id&&await window.VATRA_GUEST?.profile(client,id))return;
   location.replace(home);return;
  }
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
  window.VATRA_AVATAR?.setHeader({client,email:user.email,name:headerName,initials:ownAvatar,id:ownId});
  setMenuLink(ownId);

  window.VATRA_AVATAR?.applyRemembered(q("#feed-header-avatar"),user.email);
  const ownHeaderMedia=loadOwnHeaderAvatar(client,ownId,user.email);
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

  const requested=location.pathname.match(/\/id([1-9][0-9]{0,18})$/)?.[1]||null;
  const targetId=requested||ownId;
  if(!validId(targetId)){missingProfile();return;}




  const [directoryOutcome,publicOutcome,stateOutcome]=await Promise.allSettled([
   client.from("member_directory")
    .select("vatra_id").eq("vatra_id",targetId).maybeSingle(),
   Promise.resolve().then(()=>client.from("public_profiles")
    .select("display_name,status_text").eq("vatra_id",targetId).maybeSingle()),
   window.VATRA_AVATAR?.states(client,[targetId])||Promise.resolve(new Map())
  ]);
  const publicState=stateOutcome.status==="fulfilled"?stateOutcome.value.get(targetId):null;
  if(publicState==="deleted"||publicState==="blocked"){missingProfile(publicState);return;}
  if(directoryOutcome.status==="rejected")throw directoryOutcome.reason;
  const {data:member,error:directoryError}=directoryOutcome.value;
  if(directoryError)throw directoryError;
  if(!member){missingProfile("not-found");return;}
  const isMine=targetId===ownId;
  const blockAccess={blockedByMe:false,blockedByThem:false};
  if(!isMine&&validId(ownId)){
   try{
    const {data:blocks,error:blockError}=await client.from("member_blocks")
     .select("blocker_vatra_id,blocked_vatra_id")
     .or("and(blocker_vatra_id.eq."+ownId+",blocked_vatra_id.eq."+targetId+"),"+
         "and(blocker_vatra_id.eq."+targetId+",blocked_vatra_id.eq."+ownId+")")
     .limit(2);
    if(!blockError)for(const item of blocks||[]){
     if(String(item.blocker_vatra_id)===ownId)blockAccess.blockedByMe=true;
     if(String(item.blocker_vatra_id)===targetId)blockAccess.blockedByThem=true;
    }
   }catch(_){}
  }
  const createLink=q("#profile-write-post");
  if(createLink)createLink.hidden=!isMine;
  const storyAction=q("#profile-add-story");
  if(storyAction)storyAction.hidden=!isMine;
  const quickComposer=q("#profile-quick-compose");
  if(quickComposer)quickComposer.hidden=!isMine;
  q("#profile-tab-friends").hidden=true;
  q("#profile-report-open").hidden=isMine;
  if(isMine){
   bindPostComposer(client,user,ownId);
   bindProfileStoryComposer(client,ownId);
  }


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


  const titleName=String(publicName||(isMine?cleanOwnName:t("Учасник VATRA","VATRA member")))
   .replace(/\s+/g," ").trim().slice(0,100)||t("Учасник VATRA","VATRA member");
  document.title=titleName;

  const preloadedMedia=isMine?ownHeaderMedia:
   Promise.resolve().then(()=>client.from("profile_media")
    .select("avatar_path,cover_path").eq("vatra_id",targetId).maybeSingle())
    .catch(()=>({data:null,error:true}));
  const access=await window.VATRA_PROFILE_DETAILS?.init({client,ownId,targetId,isMine,blockAccess});
  const locked=access?.locked===true;
  const memberBlocked=blockAccess.blockedByMe||blockAccess.blockedByThem;
  if(!memberBlocked&&(publicName||isMine))void window.VATRA_VERIFIED?.attach(client,q("#profile-heading"),targetId);

  document.body.dataset.profileLocked=String(locked);
  if(memberBlocked){
   const nav=q(".social-profile-tabs");
   if(nav)nav.hidden=false;
   for(const tab of nav?.querySelectorAll("[data-profile-tab],#profile-archive-wrap")||[])
    tab.hidden=true;
  }
  if(!memberBlocked)setupProfileInteractions(client,ownId,targetId,isMine);
  setupProfileReports(client,ownId,targetId,isMine,locked);
  setupProfileBlocks(client,ownId,targetId,isMine,blockAccess);
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


  const mediaPromise=setupProfileMedia(client,ownId,targetId,isMine,user.id,user.email,locked,preloadedMedia);
  if(isMine)void mediaPromise.then(()=>{
   const source=q("#profile-avatar"),preview=q("#profile-compose-avatar");
   if(!source||!preview)return;
   const image=source.classList.contains("has-photo")?source.style.backgroundImage:"";
   preview.style.backgroundImage=image||"var(--vatra-default-avatar)";
   preview.classList.toggle("has-photo",!!image);
  }).catch(()=>{});
  const requestedAction=new URLSearchParams(location.search);
  const sharedPhoto=requestedAction.get("photo")==="avatar";
  const requestedMessage=requestedAction.get("message")==="1"&&!isMine&&!memberBlocked;
  const requestedItem=String(requestedAction.get("item")||"").replace(/\s+/g," ").trim().slice(0,100);



  const canonical=new URL(memberUrl(targetId));
  const remaining=new URLSearchParams(location.search);
  remaining.delete("vatra_id");
  remaining.delete("message");remaining.delete("item");
  const tail=remaining.toString();
  canonical.search=tail?"?"+tail:"";
  canonical.hash=location.hash;
  if(location.href!==canonical.href)
   history.replaceState(history.state,"",canonical.href);
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


  if(locked)await mediaPromise;
  finish();
  void mediaPromise.catch(()=>{
   q("#profile-cover-image")?.classList.remove("is-loading-media");
   q("#profile-avatar-wrap")?.classList.remove("is-loading-media");
  });
  if(sharedPhoto&&!locked)void mediaPromise.then(()=>window.VATRA_OPEN_PROFILE_AVATAR?.());
  if(requestedMessage&&!q("#profile-message-button")?.hidden){
   q("#profile-message-button")?.click();
   const draft=q("#profile-message-text");
   if(draft&&requestedItem)draft.value=t("Вітаю! Мене цікавить оголошення «","Hello! I am interested in the listing “")+requestedItem+t("». Воно ще актуальне?","”. Is it still available?");
  }
  void postsPromise;
 }catch(error){
  console.error("[VATRA] Profile initialization failed:",error);
  gateError(t("Не вдалося завантажити профіль. Оновіть сторінку.",
   "Could not load this profile. Please refresh."));
 }
}
void start();
})();
