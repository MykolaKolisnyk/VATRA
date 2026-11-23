(()=>{
"use strict";
const language=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
const t=(uk,english)=>{
 const locale=language();
 if(locale==="uk")return uk;
 const translated=window.VATRA_LANGUAGE?.translate?.(uk);
 return typeof translated==="string"&&translated!==uk?translated:
  locale==="en"?english:uk;
};
const make=(tag,cls,label)=>{
 const el=document.createElement(tag);el.className=cls;
 if(label!==undefined)el.textContent=label;return el;
};
const vectorIcon=(name,cls)=>{
 const ns="http://www.w3.org/2000/svg";
 const svg=document.createElementNS(ns,"svg");
 svg.setAttribute("class",cls);svg.setAttribute("viewBox","0 0 24 24");
 svg.setAttribute("width","18");svg.setAttribute("height","18");
 svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");
 svg.setAttribute("stroke-width","1.8");svg.setAttribute("stroke-linecap","round");
 svg.setAttribute("stroke-linejoin","round");svg.setAttribute("aria-hidden","true");
 const path=document.createElementNS(ns,"path");
 path.setAttribute("class",cls.replace("-icon-","-path-"));
 path.setAttribute("d",{
  back:"m14.5 5-7 7 7 7",
  drafts:"M5 6h14M5 12h14M5 18h9",
  media:"M3 5h18v14H3zM6 16l4-4 3 3 3-4 3 4M8 9h.01",
  poll:"M4 4h16v16H4zM8 15V11M12 15V7M16 15v-4",
  calendar:"M4 6h16v15H4zM4 10h16M8 3v5M16 3v5",
  plus:"M12 5v14M5 12h14",
  close:"M6 6l12 12M18 6 6 18"
 }[name]);
 svg.append(path);return svg;
};
const iconUpload=()=>{
 const ns="http://www.w3.org/2000/svg";
 const svg=document.createElementNS(ns,"svg");
 svg.setAttribute("class","ui-vatra-post-upload-symbol-001");
 svg.setAttribute("viewBox","0 0 64 64");svg.setAttribute("width","74");svg.setAttribute("height","74");
 svg.setAttribute("fill","none");svg.setAttribute("aria-hidden","true");
 for(const [index,[d,color,width]] of [
  ["M16 41V20a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v21","#5b75d3",3.4],
  ["M18 42l9-10 7 7 5-6 8 9","#71b0d9",3.4],
  ["M33 13V4M29 8h8","#df83bc",2.8],
  ["M12 49h40","#5b75d3",3.4]
 ].entries()){
  const path=document.createElementNS(ns,"path");
  path.setAttribute("class","ui-vatra-post-upload-path-"+index);
  path.setAttribute("d",d);
  path.setAttribute("stroke",color);path.setAttribute("stroke-width",width);
  path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");
  svg.append(path);
 }
 return svg;
};
function bind({prefix,ownerId,getFile,client}){
 const q=s=>document.querySelector(s);
 const dialog=q("#"+prefix+"-compose-dialog"),form=q("#"+prefix+"-compose-form");
 const title=q("#"+prefix+"-compose-title"),textarea=q("#"+prefix+"-compose-text");
 const select=q("#"+prefix+"-compose-visibility"),cancel=q("#"+prefix+"-compose-cancel");
 const submit=q("#"+prefix+"-compose-"+(prefix==="feed"?"save":"submit"));
 const counter=q("#"+prefix+"-compose-counter");
 const picker=q("#"+prefix+"-compose-media"),choose=q("#"+prefix+"-compose-media-choose");
 const mediaControls=choose?.closest(".vatra-compose-media-controls");
 const mediaPreview=q("#"+prefix+"-compose-media-preview");
 const error=q("#"+prefix+"-compose-"+(prefix==="feed"?"error":"status"));
 const actions=submit?.closest(prefix==="feed"?".feed-compose-actions":".profile-compose-actions");
 if(!dialog||!form||!title||!textarea||!submit||!cancel||!actions||!mediaControls)return null;
 if(dialog.dataset.vatraComposerReady)return null;
 dialog.dataset.vatraComposerReady="true";
 dialog.classList.add("vatra-post-composer-dialog");

 const storeKey="vatra-post-drafts-v1:"+String(ownerId);
 let stage="edit",selectedId=null,view="compose";
 const read=()=>{try{
  const result=JSON.parse(localStorage.getItem(storeKey)||"[]");
  return Array.isArray(result)?result.filter(x=>x&&typeof x.body==="string").slice(0,12):[];
 }catch(_){return [];}};
 const persist=rows=>{try{localStorage.setItem(storeKey,JSON.stringify(rows.slice(0,12)));return true;}catch(_){return false;}};
 const header=make("header","vatra-post-composer-head ui-vatra-post-composer-head-001");
 const back=make("button","vatra-post-composer-back-001");
 back.append(vectorIcon("back","ui-vatra-post-composer-back-icon-001"),
  make("span","vatra-post-composer-back-label-001",t("Редагувати","Edit")));
 back.type="button";back.hidden=true;
 title.textContent=(language()==="uk"?"Нова публікація":t("Новий пост","New post"));
 const drafts=make("button","vatra-post-composer-drafts-001");
 drafts.append(vectorIcon("drafts","ui-vatra-post-composer-drafts-icon-001"),
  make("span","vatra-post-composer-drafts-label-001",t("Чернетки","Drafts")));
 drafts.type="button";drafts.setAttribute("aria-label",t("Мої чернетки на цьому пристрої","Drafts on this device"));
 cancel.replaceChildren(vectorIcon("close","ui-vatra-post-composer-cancel-icon-001"));
 cancel.setAttribute("aria-label",t("Закрити редактор","Close editor"));
 header.append(back,title,drafts,cancel);

 const edit=make("section","vatra-post-composer-edit ui-vatra-post-composer-edit-001");
 const zone=make("div","vatra-post-composer-zone ui-vatra-post-composer-zone-001");
 zone.append(iconUpload());
 zone.append(make("h3","vatra-post-composer-zone-title-001",t("Додайте фото або відео","Add a photo or video")));
 const upload=make("button","vatra-post-composer-upload-001",t("Завантажити з пристрою","Upload from device"));
 upload.type="button";upload.addEventListener("click",()=>choose.click());
 zone.append(upload);
 zone.append(make("p","vatra-post-composer-zone-note-001",
  t("Фото JPG, PNG, WebP або відео MP4, WebM",
   "Photos JPG, PNG, WebP or video MP4, WebM")));

 mediaControls.classList.add("vatra-post-composer-media-controls");
 zone.append(mediaControls,mediaPreview);
 const mediaTools=make("div","vatra-post-composer-media-tools ui-vatra-post-composer-media-tools-001");
 const addMedia=make("button","vatra-post-composer-add-media-001");
 addMedia.type="button";
 addMedia.append(vectorIcon("media","ui-vatra-post-composer-add-media-icon-001"),
  make("span","vatra-post-composer-add-media-label-001",t("Додайте фото або відео","Add a photo or video")));
 addMedia.addEventListener("click",()=>choose.click());
 mediaTools.append(addMedia);
 const pollToggle=make("button","vatra-post-composer-poll-toggle-001");
 pollToggle.type="button";
 pollToggle.append(vectorIcon("poll","ui-vatra-post-composer-poll-icon-001"),
  make("span","vatra-post-composer-poll-label-001",t("Опитування","Poll")));
 pollToggle.setAttribute("aria-expanded","false");
 mediaTools.prepend(pollToggle);
 const pollSection=make("section","vatra-post-composer-poll ui-vatra-post-composer-poll-001");
 pollSection.hidden=true;
 const pollHeading=make("h3","vatra-post-composer-poll-heading-001",t("Опитування","Poll"));
 const pollQuestion=make("input","vatra-post-composer-poll-question-001");
 pollQuestion.type="text";pollQuestion.maxLength=240;
 pollQuestion.placeholder=t("Запитання опитування","Poll question");
 pollQuestion.setAttribute("aria-label",pollQuestion.placeholder);
 const pollOptions=make("div","vatra-post-composer-poll-options-001");
 const pollAdd=make("button","vatra-post-composer-poll-add-001");
 pollAdd.type="button";
 pollAdd.append(vectorIcon("plus","ui-vatra-post-composer-poll-add-icon-001"),
  make("span","vatra-post-composer-poll-add-label-001",t("Додати варіант","Add option")));
 const pollSettings=make("div","vatra-post-composer-poll-settings-001");
 const pollCheck=(field,uk,en)=>{
  const label=make("label","vatra-post-composer-poll-setting-001 vatra-post-composer-poll-setting-"+field);
  const check=make("input","vatra-post-composer-poll-check-"+field);
  check.type="checkbox";label.append(check,make("span","vatra-post-composer-poll-text-"+field,t(uk,en)));
  pollSettings.append(label);return check;
 };
 const pollMultiple=pollCheck("multiple","Можна вибрати кілька варіантів","Allow multiple choices");
 const pollAnonymous=pollCheck("anonymous","Анонімне голосування","Anonymous voting");
 const pollRevote=pollCheck("revote","Дозволити зміну голосу","Allow changing a vote");
 pollRevote.checked=true;
 const pollEndLabel=make("label","vatra-post-composer-poll-end-label-001",
  t("Завершити опитування (необов’язково)","Poll end time (optional)"));
 const pollEnd=make("input","vatra-post-composer-poll-end-001");
 pollEnd.type="datetime-local";pollEnd.setAttribute("aria-label",pollEndLabel.textContent);
 pollEndLabel.append(pollEnd);
 const pollHint=make("p","vatra-post-composer-poll-hint-001",
  t("Мінімум два різні варіанти відповіді.","Provide at least two different answers."));
 pollSection.append(pollHeading,pollQuestion,pollOptions,pollAdd,pollSettings,pollEndLabel,pollHint);
 let pollEnabled=false,optionInputs=[],optionSerial=0;
 function addPollOption(value=""){
  if(optionInputs.length>=10)return;
  const index=optionSerial++;
  const row=make("div","vatra-post-composer-poll-option-row ui-vatra-post-poll-option-"+index);
  const input=make("input","vatra-post-composer-poll-option-input ui-vatra-post-poll-input-"+index);
  input.type="text";input.maxLength=120;input.value=value;
  input.placeholder=t("Варіант відповіді","Answer option")+" "+(index+1);
  input.setAttribute("aria-label",input.placeholder);
  input.addEventListener("input",onPollChange);
  const remove=make("button","vatra-post-composer-poll-option-remove ui-vatra-post-poll-remove-"+index);
  remove.type="button";remove.setAttribute("aria-label",t("Прибрати варіант","Remove option"));
  remove.append(vectorIcon("close","ui-vatra-post-poll-remove-icon-"+index));
  remove.addEventListener("click",()=>{
   optionInputs=optionInputs.filter(x=>x!==input);row.remove();
   optionInputs.forEach((node,i)=>{node.placeholder=t("Варіант відповіді","Answer option")+" "+(i+1);node.setAttribute("aria-label",node.placeholder);});
   onPollChange();
  });
  row.append(input,remove);pollOptions.append(row);optionInputs.push(input);
  onPollChange();
 }
 function getPoll(){
  if(!pollEnabled)return null;
  const question=pollQuestion.value.trim();
  const options=optionInputs.map(input=>input.value.trim()).filter(Boolean);
  if(!question||options.length<2||options.length>10||
   (new Set(options.map(x=>x.toLocaleLowerCase()))).size!==options.length)return null;
  const closesAt=pollEnd.value?new Date(pollEnd.value):null;
  if(closesAt&&(!Number.isFinite(closesAt.getTime())||closesAt.getTime()<=Date.now()))return null;
  const plannedAt=scheduleToggle.checked?getScheduledAt():null;
  if(closesAt&&plannedAt&&closesAt.getTime()<=new Date(plannedAt).getTime())return null;
  return {question,options,multiple:pollMultiple.checked,
   anonymous:pollAnonymous.checked,allow_revote:pollRevote.checked,
   closes_at:closesAt?closesAt.toISOString():null};
 }
 function onPollChange(){
  pollAdd.disabled=optionInputs.length>=10;
  pollOptions.querySelectorAll(".vatra-post-composer-poll-option-remove").forEach(button=>{
   button.disabled=optionInputs.length<=2;
  });
  const deadline=pollEnd.value?new Date(pollEnd.value).getTime():null;
  const planned=getScheduledAt();
  const deadlineConflict=pollEnabled&&Number.isFinite(deadline)&&planned&&
   deadline<=new Date(planned).getTime();
  pollHint.textContent=deadlineConflict?
   t("Опитування має завершитися після публікації.","Poll must end after publication."):
   pollEnabled&&!getPoll()?
   t("Заповніть запитання та мінімум два різні варіанти.","Enter a question and two distinct answers."):
   t("Мінімум два різні варіанти відповіді.","Provide at least two different answers.");
  sync();textarea.dispatchEvent(new Event("input",{bubbles:true}));
 }
 const togglePoll=enabled=>{
  pollEnabled=!!enabled;pollSection.hidden=!pollEnabled;
  pollToggle.setAttribute("aria-expanded",String(pollEnabled));
  pollToggle.classList.toggle("is-active",pollEnabled);
  edit.classList.toggle("has-poll",pollEnabled);
  if(pollEnabled&&!optionInputs.length){addPollOption();addPollOption();}
  onPollChange();
  if(pollEnabled)pollQuestion.focus({preventScroll:true});
 };
 pollToggle.addEventListener("click",()=>togglePoll(!pollEnabled));
 pollAdd.addEventListener("click",()=>{addPollOption();onPollChange();optionInputs.at(-1)?.focus();});
 for(const field of [pollQuestion,pollMultiple,pollAnonymous,pollRevote,pollEnd])
  field.addEventListener("input",onPollChange);
 zone.addEventListener("click",event=>{
  if(!zone.classList.contains("has-media")&&
   !event.target.closest("button,.vatra-compose-media-preview"))choose.click();
 });
 zone.addEventListener("dragover",event=>{
  if(!Array.from(event.dataTransfer?.types||[]).includes("Files"))return;
  event.preventDefault();zone.classList.add("is-dragging");event.dataTransfer.dropEffect="copy";
 });
 zone.addEventListener("dragleave",event=>{
  if(!zone.contains(event.relatedTarget))zone.classList.remove("is-dragging");
 });
 zone.addEventListener("drop",event=>{
  zone.classList.remove("is-dragging");
  if(!event.dataTransfer?.files?.length)return;
  event.preventDefault();
  try{
   const transfer=new DataTransfer();
   for(const file of event.dataTransfer.files)transfer.items.add(file);
   picker.files=transfer.files;
   picker.dispatchEvent(new Event("change",{bubbles:true}));
  }catch(_){showNotice(t("Не вдалося додати файли перетягуванням. Скористайтеся кнопкою.",
   "Could not add files by dragging. Use the upload button."));}
 });
 const textWrap=make("div","vatra-post-composer-text-wrap ui-vatra-post-composer-text-wrap-001");
 const label=form.querySelector('label[for="'+prefix+'-compose-text"]');
 if(label)textWrap.append(label);
 textarea.placeholder=t("Напишіть що-небудь…","Write something…");
 textarea.rows=4;
 textWrap.append(textarea,counter);
 edit.append(zone,mediaTools,textWrap,pollSection);

 const settings=make("section","vatra-post-composer-settings ui-vatra-post-composer-settings-001");
 settings.hidden=true;
 settings.append(make("h3","vatra-post-composer-settings-title-001",t("Налаштування публікації","Post settings")));
 const summary=make("p","vatra-post-composer-settings-summary-001");
 summary.textContent=t("Перевірте допис та виберіть, хто його побачить.","Review your post and choose who can see it.");
 settings.append(summary);
 const audience=form.querySelector('label[for="'+prefix+'-compose-visibility"]');
 if(audience){audience.classList.add("vatra-post-composer-audience");settings.append(audience);}
 const localOnly=make("p","vatra-post-composer-settings-note-001",
  t("Публікація з’явиться одразу після натискання «Опублікувати».",
   "Your post will appear as soon as you press Publish."));
 settings.append(localOnly);
 const scheduleBox=make("div","vatra-post-composer-schedule-box-001");
 const scheduleLabel=make("label","vatra-post-composer-schedule-toggle-label-001");
 const scheduleToggle=make("input","vatra-post-composer-schedule-toggle-001");
 scheduleToggle.type="checkbox";
 scheduleLabel.append(scheduleToggle,vectorIcon("calendar","ui-vatra-post-composer-schedule-icon-001"),
  make("span","vatra-post-composer-schedule-title-001",t("Запланувати публікацію","Schedule publication")));
 const scheduleInput=make("input","vatra-post-composer-schedule-date-001");
 scheduleInput.type="datetime-local";scheduleInput.setAttribute("aria-label",
  t("Дата і час публікації","Publication date and time"));
 scheduleInput.hidden=true;
 const scheduleHint=make("p","vatra-post-composer-schedule-hint-001");
 scheduleHint.hidden=true;
 const isoLocal=(date)=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
 const getScheduledAt=()=>{
  if(!scheduleToggle.checked)return null;
  const date=new Date(scheduleInput.value);
  return Number.isFinite(date.getTime())&&date.getTime()>Date.now()+120000?date.toISOString():null;
 };
 const syncSchedule=()=>{
  const active=scheduleToggle.checked;
  scheduleInput.hidden=!active;scheduleHint.hidden=!active;
  if(active){scheduleInput.min=isoLocal(new Date(Date.now()+180000));
   if(!scheduleInput.value)scheduleInput.value=isoLocal(new Date(Date.now()+600000));}
  const planned=getScheduledAt();
  const pollDeadline=pollEnabled&&pollEnd.value?new Date(pollEnd.value).getTime():null;
  const deadlineConflict=!!(planned&&Number.isFinite(pollDeadline)&&
   pollDeadline<=new Date(planned).getTime());
  scheduleHint.textContent=active?
   (deadlineConflict?t("Опитування має завершитися після публікації.",
      "Poll must end after publication."):
    planned?t("Публікацію автоматично додасть сервер у вибраний час.",
      "The server will publish automatically at the selected time."):
    t("Виберіть майбутню дату щонайменше через дві хвилини.",
      "Choose a time at least two minutes in the future.")):"";
  submit.textContent=active?t("Запланувати","Schedule"):t("Опублікувати","Publish");
  localOnly.hidden=active;
  sync();
 };
 scheduleLabel.addEventListener("change",syncSchedule);
 scheduleInput.addEventListener("change",syncSchedule);
 scheduleBox.append(scheduleLabel,scheduleInput,scheduleHint);
 settings.append(scheduleBox);
 const draftsPanel=make("section","vatra-post-composer-drafts-panel ui-vatra-post-composer-drafts-001");
 draftsPanel.hidden=true;
 const draftList=make("div","vatra-post-composer-draft-list ui-vatra-post-composer-draft-list-001");
 draftsPanel.append(make("h3","vatra-post-composer-draft-title-001",
  t("Ваші чернетки","Your drafts")));
 draftsPanel.append(make("p","vatra-post-composer-draft-info-001",
  t("Чернетки зберігаються лише в цьому браузері. Фото та відео не зберігаються.",
   "Drafts are saved in this browser only. Photos and videos are not stored.")));
 draftsPanel.append(draftList);
 const scheduleHeading=make("h3","vatra-post-composer-queue-heading-001",t("Заплановані публікації","Scheduled posts"));
 const scheduleList=make("div","vatra-post-composer-queue-list-001");
 draftsPanel.append(scheduleHeading,scheduleList);
 async function renderScheduled(){
  scheduleList.replaceChildren(make("p","vatra-post-composer-queue-status-001",t("Завантаження…","Loading…")));
  if(!client)return;
  try{
   const {data,error}=await client.from("scheduled_feed_posts")
    .select("id,body,poll,publish_at,status")
    .eq("author_vatra_id",ownerId).in("status",["queued","failed"])
    .order("publish_at",{ascending:true}).limit(30);
   if(error)throw error;
   scheduleList.replaceChildren();
   for(const item of data||[]){
    const row=make("div","vatra-post-composer-queue-item-001");
    const subject=make("span","vatra-post-composer-queue-subject-001",
     String(item.body||item.poll?.question||t("Публікація з медіа","Media post")).slice(0,90));
    const time=make("time","vatra-post-composer-queue-time-001",
     new Intl.DateTimeFormat(language()==="uk"?"uk-UA":"en-GB",
      {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(item.publish_at)));
    time.dateTime=item.publish_at;
    if(item.status==="failed")time.append(" · "+t("Помилка","Failed"));
    row.append(subject,time);
    if(item.status==="queued"){
     const reschedule=make("button","vatra-post-composer-queue-edit-001",
      t("Редагувати","Edit"));
     reschedule.type="button";
     const dateEditor=make("div","vatra-post-composer-queue-editor-001");
     dateEditor.hidden=true;
     const dateInput=make("input","vatra-post-composer-queue-date-001");
     dateInput.type="datetime-local";dateInput.value=isoLocal(new Date(item.publish_at));
     dateInput.setAttribute("aria-label",t("Дата і час публікації","Publication date and time"));
     const saveTime=make("button","vatra-post-composer-queue-save-001",t("Зберегти","Save"));
     saveTime.type="button";
     const closeTime=make("button","vatra-post-composer-queue-close-001",t("Скасувати","Cancel"));
     closeTime.type="button";
     closeTime.addEventListener("click",()=>{dateEditor.hidden=true;reschedule.hidden=false;});
     reschedule.addEventListener("click",()=>{
      dateInput.min=isoLocal(new Date(Date.now()+180000));
      reschedule.hidden=true;dateEditor.hidden=false;dateInput.focus({preventScroll:true});
     });
     saveTime.addEventListener("click",async()=>{
      const selected=new Date(dateInput.value);
      if(!Number.isFinite(selected.getTime())||selected.getTime()<=Date.now()+120000){
       showNotice(t("Виберіть майбутню дату щонайменше через дві хвилини.",
        "Choose a time at least two minutes in the future."));return;
      }
      if(item.poll?.closes_at&&selected.getTime()>=new Date(item.poll.closes_at).getTime()){
       showNotice(t("Опитування має завершитися після публікації.",
        "Poll must end after publication."));return;
      }
      saveTime.disabled=true;
      try{
       const result=await client.from("scheduled_feed_posts")
        .update({publish_at:selected.toISOString()}).eq("id",item.id).eq("status","queued")
        .select("id").maybeSingle();
       if(result.error||!result.data)throw result.error||Error("Schedule already published");
       showNotice("");await renderScheduled();
      }catch(_){
       showNotice(t("Не вдалося зберегти дату публікації.","Could not save publication date."));
       saveTime.disabled=false;
      }
     });
     dateEditor.append(dateInput,saveTime,closeTime);
     row.append(reschedule,dateEditor);

     const cancelQueue=make("button","vatra-post-composer-queue-cancel-001",t("Скасувати","Cancel"));
     cancelQueue.type="button";
     cancelQueue.addEventListener("click",async()=>{
      cancelQueue.disabled=true;
      try{
       const result=await client.from("scheduled_feed_posts")
        .update({status:"cancelled"}).eq("id",item.id).eq("status","queued")
        .select("id,media_items").maybeSingle();
       if(result.error||!result.data)throw result.error||Error("Schedule already published");
       if(result.data.media_items?.length){
        try{await window.VATRA_POST_MEDIA?.removeGallery?.(client,result.data.media_items);}catch(_){}
       }
       void renderScheduled();
      }catch(_){
       showNotice(t("Не вдалося скасувати публікацію.","Could not cancel the post."));
       cancelQueue.disabled=false;
      }
     });
     row.append(cancelQueue);
    }
    scheduleList.append(row);
   }
   if(!data?.length)scheduleList.append(make("p","vatra-post-composer-queue-empty-001",
    t("Запланованих дописів поки немає.","No scheduled posts yet.")));
  }catch(_){
   scheduleList.replaceChildren(make("p","vatra-post-composer-queue-error-001",
    t("Не вдалося завантажити заплановані дописи.","Could not load scheduled posts.")));
  }
 }

 const footer=make("div","vatra-post-composer-footer ui-vatra-post-composer-footer-001");
 const left=make("div","vatra-post-composer-footer-left ui-vatra-post-composer-footer-left-001");
 const tips=make("button","vatra-post-composer-tips-001",t("ⓘ  Поради щодо публікації","ⓘ  Posting tips"));
 tips.type="button";
 const tip=make("p","vatra-post-composer-tip-001",
  t("Діліться своїм, поважайте приватність інших та обирайте видимість допису перед публікацією.",
   "Share your own content, respect others' privacy, and choose your post's visibility before publishing."));
 tip.hidden=true;
 tips.addEventListener("click",()=>{tip.hidden=!tip.hidden;});
 const draftSave=make("button","vatra-post-composer-draft-save-001",t("Зберегти чернетку","Save draft"));
 draftSave.type="button";
 const next=make("button","vatra-post-composer-next-001",t("Далі","Next"));
 next.type="button";
 const footerActions=make("div","vatra-post-composer-footer-actions ui-vatra-post-composer-footer-actions-001");
 left.append(tips,tip);footerActions.append(draftSave,next,submit);
 footer.append(left,footerActions);
 actions.remove();
 const notice=make("p","vatra-post-composer-notice-001");notice.hidden=true;
 const showNotice=value=>{notice.textContent=value;notice.hidden=!value;};
 function sync(){
  const hasMedia=!!(typeof getFile==="function"&&getFile());
  const hasContent=!!textarea.value.trim()||hasMedia;
  next.disabled=!(hasContent||getPoll())||(pollEnabled&&!getPoll());
  if(stage==="settings")submit.disabled=(pollEnabled&&!getPoll())||
   (scheduleToggle.checked&&!getScheduledAt());
  const selected=!!mediaPreview?.querySelector(".vatra-gallery-picker-tile");
  zone.classList.toggle("has-media",selected);
  mediaTools.classList.toggle("has-media",selected);
  addMedia.setAttribute("aria-label",selected?
   t("Додайте фото або відео","Add a photo or video"):
   t("Додайте фото або відео","Add a photo or video"));
 }
 function setStage(name){
  if(name==="settings"&&!textarea.value.trim()&&!(typeof getFile==="function"&&getFile())&&!getPoll())return false;
  view="compose";stage=name;
  edit.hidden=name!=="edit";settings.hidden=name!=="settings";draftsPanel.hidden=true;
  back.hidden=name==="edit";drafts.hidden=name!=="edit";
  title.textContent=name==="settings"?t("Налаштування","Settings"):
   (language()==="uk"?"Нова публікація":t("Новий пост","New post"));
  if(name==="settings"){
   syncSchedule();
   const body=textarea.value.trim(),selected=mediaPreview?.querySelectorAll(".vatra-gallery-picker-tile").length||0;
   const preview=body||getPoll()?.question||t("Публікація з медіа","Media post");
   summary.textContent=preview.slice(0,155)+(preview.length>155?"…":"")+
    (selected?" · 📎 "+selected:"");
  }
  next.hidden=name!=="edit";draftSave.hidden=name!=="edit";submit.hidden=name!=="settings";
  tips.hidden=name!=="edit";tip.hidden=true;showNotice("");
  sync();return true;
 }
 function renderDrafts(){
  draftList.replaceChildren();
  for(const item of read()){
   const row=make("div","vatra-post-composer-draft ui-vatra-post-composer-draft-"+String(item.id).replace(/[^a-z0-9]/gi,""));
   const pickDraft=make("button","vatra-post-composer-draft-open-001",
    (item.body||item.poll?.question||t("Без тексту","No text")).slice(0,85));
   pickDraft.type="button";pickDraft.addEventListener("click",()=>{
    selectedId=item.id;textarea.value=item.body;
    if(select)select.value=["public","friends","only_me"].includes(item.visibility)?item.visibility:"public";
    textarea.dispatchEvent(new Event("input",{bubbles:true}));
    togglePoll(!!item.poll);
    if(item.poll){
     pollQuestion.value=item.poll.question||"";
     optionInputs=[];pollOptions.replaceChildren();
     for(const option of item.poll.options||[])addPollOption(option);
     pollMultiple.checked=!!item.poll.multiple;pollAnonymous.checked=!!item.poll.anonymous;
     pollRevote.checked=item.poll.allow_revote!==false;
     pollEnd.value=item.poll.closes_at?isoLocal(new Date(item.poll.closes_at)):"";
    }
    scheduleToggle.checked=!!item.scheduled_at;
    scheduleInput.value=item.scheduled_at?isoLocal(new Date(item.scheduled_at)):"";
    setStage("edit");textarea.focus();
   });
   const remove=make("button","vatra-post-composer-draft-remove-001");
   remove.append(vectorIcon("close","ui-vatra-post-composer-draft-remove-icon-001"));
   remove.type="button";remove.setAttribute("aria-label",t("Видалити чернетку","Delete draft"));
   remove.addEventListener("click",()=>{persist(read().filter(x=>x.id!==item.id));renderDrafts();});
   row.append(pickDraft,remove);draftList.append(row);
  }
  if(!draftList.children.length)draftList.append(make("p","vatra-post-composer-draft-empty-001",
   t("Чернеток поки немає.","No drafts yet.")));
 }
 drafts.addEventListener("click",()=>{
  view="drafts";edit.hidden=true;settings.hidden=true;draftsPanel.hidden=false;
  back.hidden=false;drafts.hidden=true;next.hidden=true;draftSave.hidden=true;
  tips.hidden=true;submit.hidden=true;
  title.textContent=t("Чернетки","Drafts");renderDrafts();void renderScheduled();showNotice("");
 });
 back.addEventListener("click",()=>setStage("edit"));
 next.addEventListener("click",()=>{if(setStage("settings"))select?.focus({preventScroll:true});});
 textarea.addEventListener("input",sync);
 picker?.addEventListener("change",()=>queueMicrotask(sync));
 q("#"+prefix+"-compose-media-remove")?.addEventListener("click",()=>queueMicrotask(sync));
 mediaPreview?.addEventListener("click",()=>queueMicrotask(sync));
 draftSave.addEventListener("click",()=>{
  const body=textarea.value.trim();
  if(!body&&!getPoll()){showNotice(t("Напишіть текст для збереження чернетки.","Write some text to save as a draft."));return;}
  const drafts=read(),now=Date.now(),id=selectedId||String(now);
  const others=drafts.filter(x=>x.id!==id);
  const worked=persist([{id,body:body.slice(0,2000),visibility:select?.value||"public",poll:getPoll(),scheduled_at:getScheduledAt(),at:now},...others]);
  if(worked){selectedId=id;showNotice(picker?.files?.length?
   t("Текст збережено. Доданий файл потрібно вибрати знову при публікації.",
    "Text saved. You must reselect your file when publishing."):
   t("Чернетку збережено в цьому браузері.","Draft saved in this browser."));}
  else showNotice(t("Неможливо зберегти чернетку в цьому браузері.","Could not store the draft in this browser."));
 });
 dialog.addEventListener("close",()=>{setStage("edit");showNotice("");});
 dialog.addEventListener("cancel",()=>{if(!submit.disabled)setStage("edit");});
 form.prepend(header,edit,settings,draftsPanel);
 form.append(error,notice,footer);
 setStage("edit");
 return {
  open(){setStage("edit");edit.scrollTop=0;textarea.focus({preventScroll:true});},
  reset(){
   if(selectedId){persist(read().filter(x=>x.id!==selectedId));selectedId=null;}
   pollEnabled=false;pollSection.hidden=true;optionInputs=[];pollOptions.replaceChildren();
   pollQuestion.value="";pollEnd.value="";pollMultiple.checked=false;
   pollAnonymous.checked=false;pollRevote.checked=true;pollToggle.classList.remove("is-active");
   scheduleToggle.checked=false;scheduleInput.value="";syncSchedule();
   setStage("edit");
  },
  getPoll,getScheduledAt,hasInvalidPoll:()=>pollEnabled&&!getPoll(),
  hasInvalidSchedule:()=>scheduleToggle.checked&&!getScheduledAt(),
  step(){return stage;},setStage,sync
 };
}
window.VATRA_COMPOSER_UI={bind};
})();
