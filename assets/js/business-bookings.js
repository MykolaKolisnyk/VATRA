/* Appointment scheduling is isolated and loaded only when opening Bookings. */
export async function renderBusinessBookings({target,client,t,make,link,btn,card,field,submit,dialog,tabs,heading,companySelector,selected,roleOf,ownId,message,confirmRemove,err,initialMode,onMode,browseCompany=null}){
 const slots="id,company_id,service_name,starts_at,reserved,cancelled,business_companies(name)";
 const statusNames={requested:t("Очікує підтвердження","Awaiting confirmation"),confirmed:t("Підтверджено","Confirmed"),declined:t("Відхилено","Declined"),cancelled:t("Скасовано","Cancelled"),completed:t("Завершено","Completed")};
 const manager=["owner","admin","manager"].includes(roleOf(selected));let mode=["browse","mine","manage"].includes(initialMode)?initialMode:"browse",ticket=0;
 const area=make("div","ui-business-bookings-area-001"),nav=tabs([["browse",t("Вільний час","Available times")],["mine",t("Мої записи","My appointments")],["manage",t("Календар компанії","Company calendar")]],key=>{mode=key;onMode(key);void load();});
 for(const b of nav.children){const active=b.dataset.tab===mode;b.classList.toggle("is-active",active);b.setAttribute("aria-pressed",String(active));}
 const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";
 target.append(heading(t("Бронювання","Bookings"),t("Онлайн-запис до компаній на доступний час.","Book available appointment times with companies.")),make("p","vt-business-heading-copy-001",t("Час показано у вашому часовому поясі: ","Times are shown in your time zone: ")+zone),nav,area);
 const future=(slot)=>Date.parse(slot.starts_at)>Date.now(),ended=slot=>Date.parse(slot.starts_at)+1800000<=Date.now();
 const format=iso=>new Intl.DateTimeFormat(document.documentElement.lang||"uk",{dateStyle:"medium",timeStyle:"short"}).format(new Date(iso));
 const empty=text=>make("p","vt-business-empty-001",text);
 function slotCard(slot){
  const box=card("ui-business-booking-card-001"),actions=make("div","ui-business-booking-actions-001");
  box.append(make("h3","vt-business-panel-title-001",slot.service_name),link(slot.business_companies?.name||t("Компанія","Company"),"business?company="+encodeURIComponent(slot.company_id),"vt-business-company-link-001"),make("p","vt-business-company-meta-001",format(slot.starts_at)+" · "+t("30 хв","30 min")),actions);return {box,actions};
 }
 function editor(){
  if(!selected||!manager)return;
  const {d,form}=dialog(t("Додати час для запису","Add appointment time"));d.addEventListener("close",()=>d.remove(),{once:true});
  form.append(make("p","vt-business-heading-copy-001",t("Тривалість одного запису — 30 хвилин. Оберіть майбутній час (00 або 30 хвилин).","Each appointment lasts 30 minutes. Choose a future time on the hour or half-hour.")));
  const service=field(form,"slot-service",t("Назва послуги","Service name"),"text",120,true),start=field(form,"slot-start",t("Дата й час ("+zone+")","Date and time ("+zone+")"),"datetime-local",30,true);service.minLength=2;start.step="1800";
  const round=new Date(Math.ceil((Date.now()+60000)/1800000)*1800000);const local=new Date(round.getTime()-round.getTimezoneOffset()*60000).toISOString().slice(0,16);start.min=local;start.value=local;
  submit(form,t("Додати вільний час","Add available time"),async()=>{
   const ts=new Date(start.value);
   if(service.value.trim().length<2||!Number.isFinite(ts.getTime())||ts.getTime()<=Date.now()||ts.getTime()>Date.now()+180*86400000||ts.getTime()%1800000!==0){message(t("Виберіть коректний майбутній час та назву послуги (до 180 днів).","Choose a valid future time and service name (within 180 days)."),true);return;}
   const r=await client.from("business_booking_slots").insert({company_id:selected,service_name:service.value.trim(),starts_at:ts.toISOString()});
   if(r.error){message(r.error.code==="23505"?t("На цей час уже створено запис.","A slot already exists at this time."):err,true);return;}d.close();await load();
  });d.showModal();
 }
 async function mutate(table,id,payload,b){
  b.disabled=true;message("");
  try{const r=await client.from(table).update(payload).eq("id",id).select("id").single();if(r.error||!r.data)throw Error("update");await load();}catch(_){message(err,true);}finally{b.disabled=false;}
 }
 function book(slot){
  const {d,form}=dialog(t("Підтвердити запит на запис","Confirm appointment request"));d.addEventListener("close",()=>d.remove(),{once:true});
  form.append(make("h3","vt-business-panel-title-001",slot.service_name),make("p","vt-business-heading-copy-001",format(slot.starts_at)+" · "+t("30 хв","30 min")),make("p","vt-business-heading-copy-001",t("Компанія отримає ваш VATRA ID. Запис набуде статусу підтвердженого після схвалення компанією.","The company receives your VATRA ID. The appointment is confirmed only after company approval.")));
  submit(form,t("Надіслати запит","Request appointment"),async()=>{
   const r=await client.from("business_appointments").insert({slot_id:slot.id});
   if(r.error){message(t("Не вдалося зайняти час. Можливо, його вже заброньовано.","Could not reserve this time. It may already be booked."),true);return;}d.close();mode="mine";onMode(mode);for(const b of nav.children){const active=b.dataset.tab===mode;b.classList.toggle("is-active",active);b.setAttribute("aria-pressed",String(active));}await load();
  });d.showModal();
 }
 async function load(){
  const token=++ticket;area.replaceChildren();const body=make("div","ui-business-bookings-area-001");area.append(body);
  try{
   if(mode==="manage"){
    if(!selected){body.append(empty(t("Спочатку створіть компанію.","Create a company first.")));return;}
    body.append(companySelector());if(!manager){body.append(empty(t("Календар доступний власнику, адміністратору та менеджеру.","The calendar requires an owner, administrator or manager role.")));return;}
    body.append(btn(t("Додати вільний час","Add available time"),"vt-business-primary-001",editor));
    const r=await client.from("business_booking_slots").select(slots+",business_appointments(id,customer_vatra_id,status,created_at)").eq("company_id",selected).gte("starts_at",new Date(Date.now()-30*86400000).toISOString()).order("starts_at").limit(100);
    if(r.error)throw r.error;if(token!==ticket||!body.isConnected)return;if(!r.data?.length)body.append(empty(t("Додайте перший доступний час.","Add your first available time.")));
    for(const slot of r.data||[]){const {box,actions}=slotCard(slot);actions.append(make("span","vt-business-company-meta-001",slot.cancelled?t("Приховано","Hidden"):slot.reserved?t("Зайнято","Reserved"):future(slot)?t("Вільно","Available"):t("Минулий час","Past")));
     if(!slot.reserved&&future(slot)){const b=btn(slot.cancelled?t("Відкрити час","Reopen time"):t("Приховати час","Hide time"),"vt-business-secondary-001",()=>void mutate("business_booking_slots",slot.id,{cancelled:!slot.cancelled},b));actions.append(b);}
     for(const entry of (slot.business_appointments||[]).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))){
      const row=make("div","ui-business-booking-customer-001"),controls=make("div","ui-business-booking-actions-001");row.append(link("VATRA ID "+entry.customer_vatra_id,"id"+entry.customer_vatra_id,"vt-business-company-link-001"),make("p","vt-business-company-meta-001",statusNames[entry.status]||entry.status),controls);
      const change=(status,label)=>{const b=btn(label,"vt-business-secondary-001",()=>void mutate("business_appointments",entry.id,{status},b));controls.append(b);};
      if(entry.status==="requested"){if(future(slot))change("confirmed",t("Підтвердити","Confirm"));change("declined",t("Відхилити","Decline"));}
      if(entry.status==="confirmed"){if(ended(slot))change("completed",t("Завершити","Complete"));change("cancelled",t("Скасувати","Cancel"));}
      box.append(row);
     }body.append(box);
    }
   }else if(mode==="mine"){
    const r=await client.from("business_appointments").select("id,status,created_at,business_booking_slots("+slots+")").eq("customer_vatra_id",ownId).order("created_at",{ascending:false}).limit(100);
    if(r.error)throw r.error;if(token!==ticket||!body.isConnected)return;if(!r.data?.length)body.append(empty(t("Ви ще не маєте записів.","You have no appointments yet.")));
    for(const row of r.data||[]){const slot=row.business_booking_slots;if(!slot)continue;const {box,actions}=slotCard(slot);actions.append(make("span","vt-business-company-meta-001",statusNames[row.status]||row.status));
     if(future(slot)&&["requested","confirmed"].includes(row.status)){const b=btn(t("Скасувати запис","Cancel appointment"),"vt-business-secondary-001",async()=>{if(await confirmRemove(t("Скасувати запис?","Cancel appointment?"),t("Час знову стане доступним для інших клієнтів.","The time will become available to other customers."),t("Скасувати","Cancel")))void mutate("business_appointments",row.id,{status:"cancelled"},b);});actions.append(b);}body.append(box);
    }
   }else{
    const search=make("input","ui-business-directory-search-001");search.type="search";search.maxLength=120;search.placeholder=t("Пошук послуг","Search services");search.setAttribute("aria-label",search.placeholder);const list=make("div","ui-business-bookings-area-001");body.append(search,list);let seq=0,timer;
    async function browse(){const key=++seq,term=search.value.trim().replace(/[%_]/g,"");let q=client.from("business_booking_slots").select(slots).eq("reserved",false).eq("cancelled",false).gt("starts_at",new Date().toISOString()).order("starts_at").limit(80);if(browseCompany)q=q.eq("company_id",browseCompany);if(term)q=q.ilike("service_name","%"+term+"%");const r=await q;
     if(key!==seq||token!==ticket||!list.isConnected)return;list.replaceChildren();if(r.error){list.append(empty(err));return;}if(!r.data?.length)list.append(empty(t("Вільного часу не знайдено.","No available times found.")));
     for(const slot of r.data||[]){const {box,actions}=slotCard(slot);if(!roleOf(slot.company_id))actions.append(btn(t("Записатися","Book"),"vt-business-primary-001",()=>book(slot)));list.append(box);}
    }search.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>void browse(),250);});await browse();
   }
  }catch(_){if(token===ticket&&body.isConnected)body.replaceChildren(empty(err));}
 }
 await load();
}
