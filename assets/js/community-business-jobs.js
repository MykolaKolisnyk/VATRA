/* Company vacancy and candidate workflow, loaded only in the Jobs section. */
export async function renderBusinessJobs({target,client,t,make,link,btn,card,field,submit,dialog,tabs,heading,companySelector,selected,roleOf,ownId,message,confirmRemove,err,initialMode,onMode,browseCompany=null}){
 const jobFields="id,company_id,title,description,city,employment_type,status,created_at,business_companies(name,club_id)";
 const types=[["full-time",t("Повна зайнятість","Full-time")],["part-time",t("Часткова зайнятість","Part-time")],["contract",t("Проєктна робота","Contract")],["internship",t("Стажування","Internship")],["remote",t("Дистанційна робота","Remote")]];
 const statuses={submitted:t("Надіслано","Submitted"),reviewed:t("Переглянуто","Reviewed"),shortlisted:t("У списку кандидатів","Shortlisted"),declined:t("Відхилено","Declined"),withdrawn:t("Відкликано","Withdrawn")};
 const employer=["owner","admin","manager"].includes(roleOf(selected));let mode=["browse","applications","manage"].includes(initialMode)?initialMode:"browse",ticket=0;
 const area=make("div","ui-business-jobs-area-001"),nav=tabs([["browse",t("Вакансії спільноти","Community jobs")],["applications",t("Мої відгуки","My applications")],...(employer?[["manage",t("Керування вакансіями","Manage jobs")]]:[])],key=>{mode=key;onMode(key);void load();});
 for(const b of nav.children){const active=b.dataset.tab===mode;b.classList.toggle("is-active",active);b.setAttribute("aria-pressed",String(active));}
 target.append(heading(t("Вакансії","Jobs"),t("Знаходьте роботу та працівників у VATRA.","Find jobs and employees in VATRA.")),nav,area);
 const empty=text=>make("p","vt-business-empty-001",text);
 function editor(job=null){
  if(!employer||!selected)return;
  const {d,form}=dialog(job?t("Редагувати вакансію","Edit job"):t("Створити вакансію","Create job"));d.addEventListener("close",()=>d.remove(),{once:true});
  const title=field(form,"job-title",t("Назва посади","Job title"),"text",120,true),description=field(form,"job-description",t("Опис і вимоги","Description and requirements"),"textarea",4000,true),city=field(form,"job-city",t("Місто","City"),"text",100);
  title.minLength=2;description.minLength=10;
  const label=make("label","vt-business-job-type-label-001",t("Тип зайнятості","Employment type")),type=make("select","ui-business-select-001");type.id="business-job-type";label.htmlFor=type.id;type.required=true;
  for(const [value,text] of types){const o=make("option","vt-business-job-type-option-001",text);o.value=value;type.append(o);}form.append(label,type);
  if(job){title.value=job.title;description.value=job.description;city.value=job.city;type.value=job.employment_type;}
  submit(form,job?t("Зберегти","Save"):t("Опублікувати вакансію","Publish job"),async()=>{
   const payload={title:title.value.trim(),description:description.value.trim(),city:city.value.trim(),employment_type:type.value};if(payload.title.length<2||payload.description.length<10){message(t("Вкажіть назву й повний опис вакансії.","Provide the title and full job description."),true);return;}
   const r=job?await client.from("business_jobs").update(payload).eq("id",job.id).eq("company_id",selected).select("id").single():await client.from("business_jobs").insert({...payload,company_id:selected}).select("id").single();
   if(r.error||!r.data)throw Error("job save");d.close();await load();
  });d.showModal();
 }
 function apply(job){
  const {d,form}=dialog(t("Відгукнутися на вакансію","Apply for job"));d.addEventListener("close",()=>d.remove(),{once:true});
  form.append(make("p","vt-business-heading-copy-001",t("Компанія отримає ваш VATRA ID і повідомлення. Не додавайте паспортні, банківські чи інші чутливі дані.","The company will receive your VATRA ID and message. Do not include passport, banking or other sensitive data.")));
  const note=field(form,"job-note",t("Супровідне повідомлення (необов’язково)","Cover message (optional)"),"textarea",1500);
  submit(form,t("Надіслати відгук","Send application"),async()=>{
   const r=await client.from("business_job_applications").insert({job_id:job.id,note:note.value.trim()});
   if(r.error){message(r.error.code==="23505"?t("Ви вже відгукувалися на цю вакансію.","You already applied for this job."):err,true);return;}d.close();await load();
  });d.showModal();
 }
 function jobCard(job){
  const box=card("ui-business-job-card-001"),actions=make("div","ui-business-job-actions-001");
  box.append(make("h3","vt-business-panel-title-001",job.title),link(job.business_companies?.name||t("Компанія","Company"),"club"+job.business_companies?.club_id,"vt-business-company-link-001"),make("p","vt-business-company-meta-001",[types.find(x=>x[0]===job.employment_type)?.[1],job.city,job.status==="closed"?t("Закрито","Closed"):t("Відкрита","Open")].filter(Boolean).join(" · ")),make("p","vt-business-post-body-001",job.description),actions);return {box,actions};
 }
 async function updateStatus(table,id,status,button,after){
  button.disabled=true;message("");
  try{const r=await client.from(table).update({status}).eq("id",id).select("id").single();if(r.error||!r.data)throw Error("status");await after();}catch(_){message(err,true);}finally{button.disabled=false;}
 }
 async function candidates(job){
  const {d,form}=dialog(t("Відгуки кандидатів","Candidate applications"));d.addEventListener("close",()=>d.remove(),{once:true});form.addEventListener("submit",e=>e.preventDefault());
  const list=make("div","ui-business-jobs-area-001");form.append(list);d.showModal();
  const loadCandidates=async()=>{
   const r=await client.from("business_job_applications").select("id,member_vatra_id,note,status,created_at").eq("job_id",job.id).order("created_at",{ascending:false}).limit(100);
   if(!d.open)return;list.replaceChildren();if(r.error){list.append(empty(err));return;}if(!r.data?.length){list.append(empty(t("Відгуків ще немає.","No applications yet.")));return;}
   for(const row of r.data){const item=card("ui-business-job-card-001");item.append(link("VATRA ID "+row.member_vatra_id,"id"+row.member_vatra_id,"vt-business-company-link-001"),make("p","vt-business-company-meta-001",statuses[row.status]||row.status),make("p","vt-business-post-body-001",row.note||t("Без повідомлення","No message")));
    if(row.status!=="withdrawn"){const actions=make("div","ui-business-job-actions-001");for(const [state,label] of [["reviewed",t("Переглянуто","Reviewed")],["shortlisted",t("До списку","Shortlist")],["declined",t("Відхилити","Decline")]]){const b=btn(label,"vt-business-secondary-001",()=>void updateStatus("business_job_applications",row.id,state,b,loadCandidates));b.disabled=row.status===state;actions.append(b);}item.append(actions);}list.append(item);
   }
  };await loadCandidates();
 }
 async function load(){
  const token=++ticket;area.replaceChildren();
  const body=make("div","ui-business-jobs-area-001");area.append(body);
  try{
   if(mode==="manage"){
    if(!selected){body.append(empty(t("Спочатку створіть компанію.","Create a company first.")));return;}
    body.append(companySelector());
    if(!employer){body.append(empty(t("Для керування вакансіями потрібна роль власника, адміністратора або менеджера.","An owner, administrator or manager role is required.")));return;}
    body.append(btn(t("Створити вакансію","Create job"),"vt-business-primary-001",()=>editor()));
    const r=await client.from("business_jobs").select(jobFields).eq("company_id",selected).order("created_at",{ascending:false}).limit(100);
    if(r.error)throw r.error;if(token!==ticket||!body.isConnected)return;if(!r.data?.length)body.append(empty(t("Компанія ще не має вакансій.","The company has no jobs yet.")));
    for(const job of r.data||[]){const {box,actions}=jobCard(job);actions.append(btn(t("Редагувати","Edit"),"vt-business-secondary-001",()=>editor(job)),btn(t("Відгуки кандидатів","Applications"),"vt-business-secondary-001",()=>void candidates(job)));
     const state=job.status==="open"?"closed":"open",b=btn(state==="closed"?t("Закрити","Close"):t("Відкрити знову","Reopen"),"vt-business-secondary-001",()=>void updateStatus("business_jobs",job.id,state,b,load));actions.append(b);body.append(box);
    }
   }else if(mode==="applications"){
    let q=client.from("business_job_applications").select("id,job_id,status,note,created_at,business_jobs!inner("+jobFields+")").eq("member_vatra_id",ownId).order("created_at",{ascending:false}).limit(100);if(browseCompany)q=q.eq("business_jobs.company_id",browseCompany);const r=await q;
    if(r.error)throw r.error;if(token!==ticket||!body.isConnected)return;if(!r.data?.length)body.append(empty(t("Ви ще не відгукувалися на вакансії.","You have not applied for any jobs.")));
    for(const row of r.data||[]){if(!row.business_jobs)continue;const {box,actions}=jobCard(row.business_jobs);box.append(make("p","vt-business-company-meta-001",statuses[row.status]||row.status));if(["submitted","reviewed","shortlisted"].includes(row.status)){const b=btn(t("Відкликати відгук","Withdraw application"),"vt-business-secondary-001",async()=>{if(await confirmRemove(t("Відкликати відгук?","Withdraw application?"),t("Відгук буде відкликано.","The application will be withdrawn."),t("Відкликати","Withdraw")))void updateStatus("business_job_applications",row.id,"withdrawn",b,load);});actions.append(b);}body.append(box);}
   }else{
    const search=make("input","ui-business-directory-search-001");search.type="search";search.placeholder=t("Пошук вакансій","Search jobs");search.setAttribute("aria-label",search.placeholder);search.maxLength=120;const list=make("div","ui-business-jobs-area-001");body.append(search,list);let seq=0,timer;
    async function browse(){const key=++seq,term=search.value.trim().replace(/[%_]/g,"");let q=client.from("business_jobs").select(jobFields).eq("status","open").order("created_at",{ascending:false}).limit(50);if(browseCompany)q=q.eq("company_id",browseCompany);if(term)q=q.ilike("title","%"+term+"%");const [r,own]=await Promise.all([q,client.from("business_job_applications").select("job_id,status").eq("member_vatra_id",ownId)]);
     if(key!==seq||token!==ticket||!list.isConnected)return;list.replaceChildren();if(r.error||own.error){list.append(empty(err));return;}const applied=new Map((own.data||[]).map(row=>[row.job_id,row.status]));if(!r.data?.length)list.append(empty(t("Вакансій не знайдено.","No jobs found.")));
     for(const job of r.data||[]){const {box,actions}=jobCard(job);if(!roleOf(job.company_id)){if(applied.has(job.id))actions.append(make("span","vt-business-company-meta-001",statuses[applied.get(job.id)]||t("Ви вже відгукнулися","Already applied")));else actions.append(btn(t("Відгукнутися","Apply"),"vt-business-primary-001",()=>apply(job)));}list.append(box);}
    }search.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>void browse(),250);});await browse();
   }
  }catch(_){if(token===ticket&&body.isConnected)body.replaceChildren(empty(err));}
 }
 await load();
}
