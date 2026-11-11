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
   check:"M5 12l4 4L19 6"
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
  const sections=make("div","profile-information-groups ui-profile-information-groups-001");
  const renderInfo=()=>{
   sections.replaceChildren();
   if(!card||!paragraph)return;
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
   let visible=0;
   for(const group of groups){
    const present=group.fields.filter(field=>saved.get(field[0])?.value);
    if(!present.length)continue;
    const box=make("section","profile-information-group ui-profile-information-group-"+group.id);
    box.append(make("h3","vt-profile-information-heading-"+group.id,lang(group.label)));
    for(const field of present){
     const data=saved.get(field[0]);
     const item=make("div","profile-information-item ui-profile-information-item-"+field[0]);
     const name=make("span","vt-profile-information-label-"+field[0],tr(field[1],field[2]));
     const val=make("span","vt-profile-information-value-"+field[0],data.value);
     item.append(name,val);
     if(isMine){
      const privateHint=make("span","vt-profile-information-audience-"+field[0],
       audiences.find(x=>x[0]===data.visibility)?.[document.documentElement.lang==="en"?2:1]||"");
      privateHint.title=tr("Видимість поля","Field visibility");item.append(privateHint);
     }
     box.append(item);visible++;
    }
    sections.append(box);
   }
   paragraph.hidden=visible>0;
   if(!visible)paragraph.textContent=isMine?
    tr("Додайте інформацію про себе, яку бажаєте показувати.","Add information you want to share."):
    tr("Користувач ще не додав доступної вам інформації.","No information is available to you.");
  };
  if(card){card.append(sections);renderInfo();}
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
  titles.append(make("h1","vt-profile-editor-title-001",tr("Редагування сторінки","Edit profile")),
   make("p","vt-profile-editor-subtitle-001",tr(
    "Заповнюйте лише те, чим хочете поділитися. Для кожного поля виберіть, хто його побачить.",
    "Share only what you choose. Set visibility separately for every field.")));
  heading.append(back,titles);
  const layout=make("div","profile-editor-layout ui-profile-editor-layout-001");
  const primary=make("section","profile-editor-main ui-profile-editor-main-001");
  const form=make("form","profile-editor-form ui-profile-editor-form-001");
  form.id="profile-editor-form";
  const titleRow=make("div","profile-editor-section-head ui-profile-editor-section-head-001");
  const groupTitle=make("h2","vt-profile-editor-section-title-001");
  const media=make("button","vt-profile-editor-media-button-001");
  media.type="button";media.append(svg("photo"),make("span","vt-profile-editor-media-button-text-001",tr("Фото й обкладинка","Photos and cover")));
  titleRow.append(groupTitle,media);
  const summary=make("p","vt-profile-editor-section-description-001");
  const fields=make("div","profile-editor-fields ui-profile-editor-fields-001");
  const saveRow=make("div","profile-editor-footer ui-profile-editor-footer-001");
  const feedback=make("p","vt-profile-editor-feedback-001");feedback.setAttribute("role","status");feedback.hidden=true;
  const save=make("button","vt-profile-editor-save-001",tr("Зберегти зміни","Save changes"));
  save.type="submit";saveRow.append(feedback,save);
  form.append(titleRow,summary,fields,saveRow);primary.append(form);
  const sidebar=make("nav","profile-editor-sidebar ui-profile-editor-sidebar-001");
  sidebar.setAttribute("aria-label",tr("Розділи редагування","Edit sections"));
  const navHeading=make("div","ui-profile-editor-nav-heading-001");
  navHeading.append(make("strong","vt-profile-editor-nav-title-001",tr("Інформація","Information")),
   make("span","vt-profile-editor-nav-subtitle-001",tr("Моя сторінка","My profile")));
  sidebar.append(navHeading);
  const menu=make("div","ui-profile-editor-nav-menu-001");
  const navButtons=new Map();
  for(const group of groups){
   const btn=make("button","profile-editor-nav-link vt-profile-editor-nav-"+group.id,lang(group.label));
   btn.type="button";btn.dataset.group=group.id;
   btn.addEventListener("click",()=>showGroup(group.id));
   navButtons.set(group.id,btn);menu.append(btn);
  }
  sidebar.append(menu);layout.append(primary,sidebar);
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
    privacy.append(copy,change);fields.append(privacy);
   }
   for(const [key,uk,en,kind] of group.fields){
    const row=make("div","profile-editor-field ui-profile-editor-field-"+key);
    const lab=make("label","vt-profile-editor-label-"+key,tr(uk,en));
    const input=make(kind==="long"?"textarea":"input",
     "ui-profile-editor-input-"+key);
    input.id="profile-editor-"+key;
    lab.htmlFor=input.id;
    if(kind==="long"){input.rows=3;}else{input.type="text";}
    input.maxLength=1000;input.spellcheck=true;
    input.placeholder=tr("Додайте інформацію","Add information");
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
