(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
async function mount({root,t,make,link,btn,valid,title,subtitle,content,client,user,ownId,message,card,field,submit,tabs,dialog,nameOf,confirmRemove,sectionIcon,discoveryIcons}){
 title.textContent=t("Бізнес-інструменти спільноти","Community business tools");subtitle.textContent="";
 const fields="id,club_id,name,category,category_code,description,city,contact_email,website,created_at,updated_at,logo_path,cover_path";
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const current=new URL(location.href),requestedSection=current.searchParams.get("tools");
 const clubId=current.pathname.match(/\/club([1-9][0-9]{0,18})$/)?.[1]||current.searchParams.get("club_id");
 let scopeCompany=null,scopeRole=null,scopePending=false;
 const clubPattern=/^[1-9][0-9]{0,18}$/;
 if(!clubPattern.test(clubId||"")){message(t("Спільноту не знайдено.","Community not found."),true);return;}
 const result=await client.from("business_companies").select(fields).eq("club_id",clubId).maybeSingle();
 if(result.error||!result.data){location.replace(new URL("communities",root).href);return;}
 scopeCompany=result.data;
 const member=await client.from("business_members").select("company_id,member_vatra_id,role,status").eq("company_id",scopeCompany.id).eq("member_vatra_id",ownId).maybeSingle();
 if(member.error){message(t("Не вдалося перевірити доступ до інструментів.","Could not check access to tools."),true);return;}
 scopeRole=member.data?.status==="active"?member.data.role:null;scopePending=member.data?.status==="pending";
 const publicSections=["stores","booking","jobs","ratings","inbox"];
 const canManageSection=key=>({overview:["owner","admin","manager","editor"],team:["owner","admin"],analytics:["owner","admin","manager","editor"],inbox:["owner","admin","manager"],jobs:["owner","admin","manager"],booking:["owner","admin","manager"],stores:["owner"]})[key]?.includes(scopeRole)||false;
 title.textContent=scopeCompany.name;subtitle.textContent=t("Бізнес-інструменти спільноти","Community business tools");
 const roleName=role=>({owner:t("Власник","Owner"),admin:t("Адміністратор","Administrator"),manager:t("Менеджер","Manager"),editor:t("Редактор","Editor")})[role]||"";
 let view="overview",members=[],companies=new Map(),selected=scopeRole?scopeCompany.id:null,renderVersion=0,working=false,openingEditor=false,browseCompany=scopeCompany.id;
 let categories=[],categoriesPromise=null,jobMode="browse",bookingMode="browse",storeMode="browse",inboxMode="mine";
 const main=make("section","ui-club-business-detail-content-001");content.append(main);
 function navigate(key,mode){browseCompany=scopeCompany.id;const allowed=canManageSection(key);if(key==="jobs")jobMode=mode==="manage"&&allowed?"manage":"browse";if(key==="booking")bookingMode=mode==="manage"&&allowed?"manage":"browse";if(key==="stores")storeMode=mode==="manage"&&allowed?"manage":"browse";if(key==="inbox")inboxMode=mode==="manage"&&allowed?"manage":"mine";setNav(key);return render();}
 const heading=(label,copy,minor=false)=>{const block=make("header","ui-business-heading-001"+(minor?" ui-business-subheading-001":""));block.append(make(minor?"h3":"h2",minor?"vt-business-subheading-001":"vt-business-heading-001",label));if(copy)block.append(make("p","vt-business-heading-copy-001",copy));return block;};
 const roleOf=id=>members.find(m=>m.company_id===id&&m.status==="active")?.role;
 const err=t("Не вдалося виконати дію. Спробуйте ще раз.","Could not complete the action. Please try again.");
 function setNav(key){view=key;}
 async function refresh(){
  const roles=await client.from("business_members").select("company_id,member_vatra_id,role,status").eq("company_id",scopeCompany.id).eq("member_vatra_id",ownId);
  if(roles.error)throw roles.error;members=roles.data||[];
  const ids=[...new Set(members.map(m=>m.company_id))];companies=new Map();
  if(ids.length){const result=await client.from("business_companies").select(fields).in("id",ids);if(result.error)throw result.error;for(const row of result.data||[])companies.set(row.id,row);}
  const active=members.filter(m=>m.status==="active"&&companies.has(m.company_id));
  if(!active.some(m=>m.company_id===selected))selected=active[0]?.company_id||null;
  scopeRole=active[0]?.role||null;scopePending=members.some(m=>m.status==="pending");if(companies.has(scopeCompany.id))scopeCompany=companies.get(scopeCompany.id);
 }
 async function loadCategories(){
  if(categories.length)return categories;
  if(!categoriesPromise)categoriesPromise=(async()=>{
   const r=await client.from("business_categories").select("code,group_code,group_uk,group_en,name_uk,name_en,sort_order").order("sort_order").limit(500);
   if(r.error||!r.data?.length)throw Error("categories");
   categories=r.data;return categories;
  })().finally(()=>{categoriesPromise=null;});
  return categoriesPromise;
 }
 const categoryName=c=>{const row=categories.find(x=>x.code===c.category_code);return row?t(row.name_uk,row.name_en):c.category;};
 function categoryPicker(form,existing){
  const wrap=make("div","ui-business-category-wrap-001"),label=make("label","vt-business-category-label-001",t("Категорія компанії","Company category"));
  const control=make("div","ui-business-category-control-001"),input=make("input","ui-business-category-search-001"),code=make("input","ui-business-category-value-001");
  const pop=make("div","ui-business-category-popover-001"),list=make("div","ui-business-category-list-001"),hint=make("p","vt-business-category-hint-001");
  label.htmlFor=input.id="business-category-search";input.type="text";input.autocomplete="off";input.required=true;input.maxLength=80;input.placeholder=t("Оберіть або знайдіть категорію","Select or search for a category");
  input.setAttribute("role","combobox");input.setAttribute("aria-autocomplete","list");input.setAttribute("aria-expanded","false");input.setAttribute("aria-controls","business-category-options");
  code.type="hidden";code.id="business-category";list.id="business-category-options";list.setAttribute("role","listbox");list.setAttribute("aria-label",label.textContent);pop.hidden=true;
  hint.setAttribute("role","status");hint.hidden=true;
  const toggle=btn("","vt-business-category-toggle-001",()=>{if(pop.hidden){input.focus();open(true);}else close();});toggle.append(sectionIcon("down"));toggle.setAttribute("aria-label",t("Показати всі категорії","Show all categories"));toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-controls",list.id);
  let matches=[],active=-1;
  const name=row=>t(row.name_uk,row.name_en);
  const initial=categories.find(row=>row.code===existing?.category_code);
  if(initial){code.value=initial.code;input.value=name(initial);}
  function validate(){input.setCustomValidity(code.value?"":t("Виберіть категорію зі списку.","Choose a category from the list."));}
  function close(){pop.hidden=true;input.setAttribute("aria-expanded","false");toggle.setAttribute("aria-expanded","false");input.removeAttribute("aria-activedescendant");active=-1;}
  function pick(row){code.value=row.code;input.value=name(row);validate();close();input.focus();}
  function highlight(index){const options=[...list.querySelectorAll('[role="option"]')];if(!options.length)return;active=Math.max(0,Math.min(index,options.length-1));for(let i=0;i<options.length;i++)options[i].classList.toggle("is-highlighted",i===active);input.setAttribute("aria-activedescendant",options[active].id);options[active].scrollIntoView({block:"nearest"});}
  function open(all=false){
   const term=all?"":input.value.trim().toLocaleLowerCase();matches=categories.filter(row=>[row.name_uk,row.name_en,row.group_uk,row.group_en].some(x=>x.toLocaleLowerCase().includes(term)));
   list.replaceChildren();active=-1;input.removeAttribute("aria-activedescendant");let last="";
   for(const [i,row] of matches.entries()){if(last!==row.group_code){last=row.group_code;const group=make("div","vt-business-category-group-001",t(row.group_uk,row.group_en));group.setAttribute("role","presentation");list.append(group);}
    const option=make("div","ui-business-category-option-001",name(row));option.id="business-category-option-"+i;option.setAttribute("role","option");option.setAttribute("aria-selected",String(code.value===row.code));option.addEventListener("pointerdown",e=>e.preventDefault());option.addEventListener("click",()=>pick(row));list.append(option);
   }
   hint.textContent=matches.length?"":t("Категорій не знайдено.","No matching categories.");hint.hidden=!!matches.length;pop.hidden=false;input.setAttribute("aria-expanded","true");toggle.setAttribute("aria-expanded","true");
  }
  input.addEventListener("focus",()=>{if(!code.value)open(!input.value);});
  input.addEventListener("click",()=>{if(pop.hidden)open(Boolean(code.value));});
  input.addEventListener("input",()=>{code.value="";validate();open();});
  input.addEventListener("keydown",e=>{if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(pop.hidden)open(Boolean(code.value));highlight(active<0?(e.key==="ArrowDown"?0:matches.length-1):active+(e.key==="ArrowDown"?1:-1));}
   else if(e.key==="Enter"&&!pop.hidden){e.preventDefault();if(active>=0&&matches[active])pick(matches[active]);}
   else if(e.key==="Escape"&&!pop.hidden){e.preventDefault();e.stopPropagation();close();}
  });
  wrap.addEventListener("focusout",e=>{if(!wrap.contains(e.relatedTarget))close();});
  toggle.addEventListener("pointerdown",e=>e.preventDefault());
  control.append(input,toggle);pop.append(list,hint);wrap.append(label,control,code,pop);form.append(wrap);validate();return code;
 }
 function companyLink(c){return link(c.name,"club"+c.club_id,"vt-business-company-link-001");}
 function safeWebsite(value){try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password?u.href:"";}catch(_){return "";}}
 const brandUrls=new Map();
 async function brandUrl(path,id,kind){
  if(typeof path!=="string"||!path.startsWith(id+"/"+kind+"/")||!/[a-f0-9-]{36}[.](jpg|png|webp)$/.test(path))return null;
  const cached=brandUrls.get(path);if(cached&&cached.until>Date.now())return cached.promise;
  const promise=(async()=>{try{const {data,error}=await client.storage.from("business-media").createSignedUrl(path,900);if(error||!data?.signedUrl)throw Error("media");return data.signedUrl;}catch(_){brandUrls.delete(path);return null;}})();brandUrls.set(path,{promise,until:Date.now()+780000});return promise;
 }
 function brandImage(host,c,kind){
  const path=c[kind+"_path"];if(!path)return;
  void (async()=>{const url=await brandUrl(path,c.id,kind);if(!url||!host.isConnected)return;const img=make("img","ui-business-brand-display-001");img.alt=kind==="logo"?t("Логотип компанії","Company logo"):t("Обкладинка компанії","Company cover");img.decoding="async";img.addEventListener("error",()=>{img.remove();if(kind==="cover")host.remove();},{once:true});img.src=url;host.append(img);})();
 }
 function companyAvatar(c,cls="ui-business-company-avatar-001"){const avatar=make("span",cls,(c.name||"V").trim().slice(0,1).toLocaleUpperCase());brandImage(avatar,c,"logo");return avatar;}
 async function editBrand(c){
  if(!["owner","admin","editor"].includes(roleOf(c.id)))return;
  try{const module=await import(new URL("assets/js/business-brand.js?rev=6a1765ba2b76a433b0e6a0e8797197db73d93e61",root).href);await module.openBusinessBrand({company:c,client,t,make,btn,dialog,field,submit,message,onSaved:async()=>{location.reload();}});}catch(_){message(err,true);}
 }
 async function operation(fn){
  if(working)return;working=true;message("");
  try{await fn();await refresh();await render();}catch(_){message(err,true);}finally{working=false;}
 }
 async function openEditor(existing){
  const role=existing?roleOf(existing.id):null;if(!existing||!["owner","admin","editor"].includes(role))return;
  if(openingEditor||document.querySelector(".ui-business-editor-001[open]"))return;openingEditor=true;
  try{await loadCategories();}catch(_){message(t("Не вдалося завантажити категорії. Спробуйте ще раз.","Could not load categories. Please try again."),true);return;}finally{openingEditor=false;}
  const d=make("dialog","ui-vatra-section-dialog-001 ui-business-editor-001"),head=make("header","ui-vatra-section-dialog-head-001"),headingText=make("h2","vt-vatra-section-dialog-title-001",t("Редагувати спільноту","Edit community"));
  headingText.id="business-editor-title";d.setAttribute("aria-labelledby",headingText.id);
  let saving=false;const close=btn("×","vt-vatra-section-dialog-close-001",()=>{if(!saving)d.close();});close.setAttribute("aria-label",t("Закрити","Close"));head.append(headingText,close);
  const scroll=make("div","ui-vatra-section-dialog-scroll-001 ui-business-editor-scroll-001"),form=make("form","ui-business-editor-form-001");form.id="business-company-form";
  const note=make("p","vt-business-form-note-001",t("Інформацію бачитимуть користувачі VATRA. Особистий профіль не зміниться.","VATRA members will see this information. Your personal profile will not change."));
  const basics=make("section","ui-business-editor-section-001"),contacts=make("section","ui-business-editor-section-001");
  basics.append(make("h3","vt-business-editor-section-title-001",t("Основна інформація","Basic information")));
  const name=field(basics,"business-name",t("Назва спільноти","Community name"),"text",80,true);
  const category=categoryPicker(basics,existing);
  const description=field(basics,"business-description",t("Опис спільноти","Community description"),"textarea",1200);description.rows=3;description.placeholder=t("Чим займається ваша компанія?","What does your company do?");
  contacts.append(make("h3","vt-business-editor-section-title-001",t("Контакти","Contact details")));
  const city=field(contacts,"business-city",t("Місто","City"),"text",100),email=field(contacts,"business-email",t("Публічна електронна пошта","Public email"),"email",254),website=field(contacts,"business-website",t("Вебсайт","Website"),"url",300);website.placeholder="https://";
  name.minLength=3;name.placeholder=t("Наприклад, BARBER STUDIO","e.g. BARBER STUDIO");
  name.value=existing.name;description.value=existing.description;city.value=existing.city;email.value=existing.contact_email;website.value=existing.website;
  form.append(note,basics,contacts);scroll.append(form);
  const footer=make("footer","ui-business-editor-footer-001"),status=make("p","vt-business-editor-status-001");status.setAttribute("role","alert");status.hidden=true;
  const actions=make("div","ui-business-editor-actions-001"),cancel=btn(t("Скасувати","Cancel"),"vt-business-secondary-001",()=>{if(!saving)d.close();}),save=make("button","vt-vatra-section-submit-001 vt-business-editor-save-001",t("Зберегти зміни","Save changes"));save.type="submit";save.setAttribute("form",form.id);actions.append(cancel,save);footer.append(status,actions);
  const showError=copy=>{status.textContent=copy;status.hidden=!copy;};
  form.addEventListener("submit",async e=>{
   e.preventDefault();if(saving)return;showError("");
   const chosen=categories.find(row=>row.code===category.value);
   const payload={name:name.value.trim(),category:chosen?.name_uk||"",category_code:chosen?.code,description:description.value.trim(),city:city.value.trim(),contact_email:email.value.trim(),website:website.value.trim()};
   if(payload.name.length<3||!chosen||(payload.website&&!safeWebsite(payload.website))){showError(t("Перевірте назву, категорію та вебсайт.","Check name, category and website."));return;}
   saving=true;save.disabled=cancel.disabled=close.disabled=true;
   try{
    const result=await client.from("business_companies").update(payload).eq("id",existing.id).select("id").single();
    if(result.error||!result.data?.id)throw Error("save");
    selected=result.data.id;d.close();setNav("overview");
    try{await refresh();const h=document.querySelector("#club-heading");if(h)h.textContent=payload.name;const desc=document.querySelector("#club-description");if(desc)desc.textContent=payload.description||t("Опису поки немає.","No description yet.");document.title=payload.name+" · VATRA";await render();message(t("Зміни збережено.","Changes saved."));}catch(_){message(t("Компанію збережено, але не вдалося оновити список.","Company saved, but the list could not be refreshed."),true);}
   }catch(_){showError(t("Не вдалося зберегти компанію. Спробуйте ще раз.","Could not save the company. Please try again."));}finally{saving=false;save.disabled=cancel.disabled=close.disabled=false;}
  });
  d.addEventListener("cancel",e=>{if(saving)e.preventDefault();});d.addEventListener("close",()=>d.remove(),{once:true});d.append(head,scroll,footer);document.body.append(d);d.showModal();
 }

 function companySelector(){const context=make("div","ui-business-tool-context-001");context.append(make("strong","vt-business-tool-context-name-001",scopeCompany.name),make("span","vt-business-tool-context-role-001",roleName(scopeRole)));return context;}
 function showInvites(target){
  const invited=members.filter(m=>m.status==="pending"&&companies.has(m.company_id));if(!invited.length)return;
  const box=card("ui-business-invites-001");box.append(make("h3","vt-business-panel-title-001",t("Запрошення до команди","Team invitations")));
  for(const m of invited){const row=make("div","ui-business-invite-row-001"),copy=make("div","ui-business-invite-copy-001");copy.append(companyLink(companies.get(m.company_id)),make("p","vt-business-company-meta-001",roleName(m.role)));
   const buttons=make("div","ui-business-invite-actions-001");
   buttons.append(btn(t("Прийняти","Accept"),"vt-business-primary-001",()=>void operation(async()=>{const r=await client.from("business_members").update({status:"active"}).eq("company_id",m.company_id).eq("member_vatra_id",ownId).eq("status","pending").select("company_id").single();if(r.error||!r.data)throw Error("accept");selected=m.company_id;})),btn(t("Відхилити","Decline"),"vt-business-secondary-001",()=>void operation(async()=>{const r=await client.from("business_members").delete().eq("company_id",m.company_id).eq("member_vatra_id",ownId).select("company_id").single();if(r.error||!r.data)throw Error("decline");})));
   row.append(copy,buttons);box.append(row);
  }target.append(box);
 }
 function statusLine(text=""){const status=make("p","vt-business-local-status-001",text);status.setAttribute("role","status");status.hidden=!text;return status;}
 function setStatus(node,copy,error=false){node.textContent=copy;node.hidden=!copy;node.dataset.kind=error?"error":"info";}
 async function loadMetrics(id){
  const {data,error}=await client.from("business_metrics").select("community_follower_count,community_post_count,rating_count,rating_total").eq("company_id",id).single();
  if(error||!data)throw Error("metrics");return {...data,follower_count:data.community_follower_count,post_count:data.community_post_count};
 }
 function metricValue(n){return n!=null&&Number.isFinite(Number(n))?new Intl.NumberFormat(document.documentElement.lang||"uk").format(Number(n)):"—";}
 function ratingValue(metrics){const n=Number(metrics.rating_count),total=Number(metrics.rating_total);return Number.isFinite(n)&&n>0&&Number.isFinite(total)?new Intl.NumberFormat(document.documentElement.lang||"uk",{minimumFractionDigits:1,maximumFractionDigits:1}).format(total/n)+" / 5":"—";}
 async function renderRating(id,target){
  const panel=card("ui-business-rating-card-001"),summary=make("div","ui-business-rating-summary-001"),star=make("span","ui-business-rating-star-001","★"),score=make("strong","vt-business-rating-score-001","—"),count=make("p","vt-business-company-meta-001"),status=statusLine(),actions=make("div","ui-business-rating-actions-001");
  const text=make("div","ui-business-rating-copy-001");text.append(score,count);summary.append(star,text);panel.append(make("h3","vt-business-panel-title-001",t("Оцінки клієнтів","Customer ratings")),summary,make("p","vt-business-heading-copy-001",t("Оцінити компанію можна після завершеного запису на послугу.","You can rate a company after a completed appointment.")),status,actions);target.append(panel);
  async function load(){
   setStatus(status,"");actions.replaceChildren();
   try{
    const metrics=await loadMetrics(id);if(!panel.isConnected)return;score.textContent=ratingValue(metrics);
    count.textContent=Number(metrics.rating_count)>0?metricValue(metrics.rating_count)+" · "+t("оцінок","ratings"):t("Оцінок ще немає","No ratings yet");
    if(roleOf(id))return;
    const own=await client.from("business_ratings").select("appointment_id,stars").eq("company_id",id).eq("customer_vatra_id",ownId).maybeSingle();if(own.error)throw own.error;if(!panel.isConnected)return;
    let appointment=own.data?.appointment_id;
    if(!appointment){const r=await client.from("business_appointments").select("id,business_booking_slots!inner(company_id)").eq("customer_vatra_id",ownId).eq("status","completed").eq("business_booking_slots.company_id",id).limit(1);if(r.error)throw r.error;appointment=r.data?.[0]?.id;}
    if(!appointment||!panel.isConnected)return;
    const form=make("form","ui-business-rating-form-001"),label=make("label","vt-business-selector-label-001",t("Ваша оцінка","Your rating")),select=make("select","ui-business-select-001 ui-business-rating-select-001");select.id="business-customer-rating";label.htmlFor=select.id;select.required=true;
    const placeholder=make("option","vt-business-rating-option-001",t("Оберіть оцінку","Select a rating"));placeholder.value="";select.append(placeholder);
    for(let n=5;n>=1;n--){const o=make("option","vt-business-rating-option-001","★".repeat(n)+" · "+n+"/5");o.value=String(n);select.append(o);}select.value=own.data?String(own.data.stars):"";
    const save=make("button","vt-business-primary-001",own.data?t("Оновити оцінку","Update rating"):t("Оцінити","Rate"));save.type="submit";form.append(label,select,save);
    form.addEventListener("submit",async e=>{e.preventDefault();if(save.disabled||!select.value)return;save.disabled=true;setStatus(status,"");
     try{const p=own.data?client.from("business_ratings").update({stars:Number(select.value)}).eq("appointment_id",appointment).select("appointment_id").single():client.from("business_ratings").insert({appointment_id:appointment,company_id:id,stars:Number(select.value)}).select("appointment_id").single();const result=await p;if(result.error||!result.data)throw Error("rating");await load();setStatus(status,t("Оцінку збережено.","Rating saved."));}catch(_){setStatus(status,err,true);}finally{save.disabled=false;}
    });actions.append(form);
    if(own.data){const remove=btn(t("Видалити оцінку","Remove rating"),"vt-business-secondary-001",async()=>{if(!await confirmRemove(t("Видалити оцінку?","Remove rating?"),t("Ваша оцінка не враховуватиметься у рейтингу.","Your rating will no longer count."),t("Видалити","Remove")))return;remove.disabled=true;try{const r=await client.from("business_ratings").delete().eq("appointment_id",appointment).select("appointment_id").single();if(r.error||!r.data)throw Error("delete");await load();}catch(_){setStatus(status,err,true);}finally{remove.disabled=false;}});actions.append(remove);}
   }catch(_){setStatus(status,err,true);}
  }
  await load();
 }
 async function showAnalytics(target){
  target.append(heading(t("Аналітика","Analytics"),t("Поточні показники сторінки компанії.","Current company page metrics.")));
  if(!selected){target.append(make("p","vt-business-empty-001",t("Спочатку створіть компанію.","Create a company first.")));return;}
  target.append(companySelector());const metrics=await loadMetrics(selected);if(!target.isConnected)return;
  const grid=make("div","ui-business-metrics-001");
  for(const [key,label] of [["follower_count",t("Підписники","Followers")],["post_count",t("Публікації","Posts")]]){const el=card("ui-business-metric-001");el.append(make("p","vt-business-metric-label-001",label),make("strong","vt-business-metric-value-001",metricValue(metrics[key])));grid.append(el);}
  const rating=card("ui-business-metric-001");rating.append(make("p","vt-business-metric-label-001",t("Рейтинг клієнтів","Customer rating")),make("strong","vt-business-metric-value-001",ratingValue(metrics)),make("p","vt-business-company-meta-001",metricValue(metrics.rating_count)+" · "+t("оцінок","ratings")));grid.append(rating);
  target.append(grid,make("p","vt-business-heading-copy-001",t("Перегляди й охоплення ще не вимірюються. Рейтинг розраховується за оцінками після завершених записів.","Views and reach are not measured yet. Ratings are based on completed appointments.")));
 }
 async function dashboard(target){
  target.append(heading(t("Налаштування спільноти","Community settings"),t("Оформлення, інформація та доступ до бізнес-інструментів.","Branding, information and access to business tools.")));showInvites(target);
  if(!selected||!companies.has(selected))return;
  const c=companies.get(selected),role=roleOf(selected),panel=card("ui-business-dashboard-company-001"),identity=make("div","ui-business-dashboard-identity-001"),info=make("div","ui-business-dashboard-info-001"),actions=make("div","ui-business-dashboard-actions-001");
  info.append(make("h3","vt-business-dashboard-company-name-001",c.name),make("p","vt-business-company-meta-001",[categoryName(c),c.city].filter(Boolean).join(" · ")),make("p","vt-business-dashboard-role-001",roleName(role)));identity.append(companyAvatar(c),info);panel.append(identity);
  if(["owner","admin","editor"].includes(role))actions.append(btn(t("Редагувати інформацію","Edit information"),"vt-business-primary-001",()=>openEditor(c)),btn(t("Логотип та обкладинка","Logo and cover"),"vt-business-secondary-001",()=>void editBrand(c)));
  if(actions.children.length)panel.append(actions);target.append(panel);
 }
 async function team(target,version){
  showInvites(target);if(!selected){target.append(make("p","vt-business-empty-001",t("Спочатку створіть компанію або прийміть запрошення.","Create a company or accept an invitation first.")));return;}
  target.append(companySelector());const role=roleOf(selected),companyId=selected;
  if(!["owner","admin"].includes(role)){const own=card("ui-business-team-card-001");own.append(make("h3","vt-business-panel-title-001",roleName(role)),make("p","vt-business-heading-copy-001",t("Переглядати склад команди можуть власник і адміністратор. Запрошувати та вилучати учасників може лише власник.","The owner and administrators can view the team. Only the owner can invite or remove members.")));target.append(own);return;}
  const result=await client.from("business_members").select("company_id,member_vatra_id,role,status").eq("company_id",companyId).order("created_at");
  if(version!==renderVersion)return;if(result.error)throw result.error;
  const box=card("ui-business-team-card-001");box.append(make("h3","vt-business-panel-title-001",t("Учасники","Members")));
  for(const m of result.data||[]){const row=make("div","ui-business-team-row-001"),details=make("div","ui-business-team-member-001"),person=link("VATRA ID "+m.member_vatra_id,"id"+m.member_vatra_id,"vt-business-team-name-001");
   details.append(person,make("p","vt-business-team-role-001",roleName(m.role)+(m.status==="pending"?" · "+t("Запрошення","Invited"):"")));row.append(details);
   if(role==="owner"&&m.role!=="owner")row.append(btn(t("Вилучити","Remove"),"vt-business-secondary-001",async()=>{if(!await confirmRemove(t("Вилучити учасника?","Remove member?"),t("Учасник втратить доступ до компанії.","The member will lose company access."),t("Вилучити","Remove")))return;void operation(async()=>{const r=await client.from("business_members").delete().eq("company_id",companyId).eq("member_vatra_id",String(m.member_vatra_id)).select("company_id").single();if(r.error||!r.data)throw Error("remove");});}));
   box.append(row);
  }target.append(box);
  if(role==="owner"){const form=make("form","ui-business-invite-form-001");form.append(make("h3","vt-business-panel-title-001",t("Запросити учасника","Invite a member")));
   const userId=field(form,"business-invite-id","VATRA ID","text",19,true);userId.inputMode="numeric";userId.pattern="[1-9][0-9]{0,18}";
   const lab=make("label","vt-business-invite-role-label-001",t("Роль","Role")),select=make("select","ui-business-select-001");
   select.id="business-invite-role";lab.htmlFor=select.id;
   for(const value of ["admin","manager","editor"]){const o=make("option","vt-business-role-option-001",roleName(value));o.value=value;select.append(o);}
   form.append(lab,select);
   submit(form,t("Надіслати запрошення","Send invitation"),async()=>{const id=userId.value.trim();if(!valid(id)||id===ownId){message(t("Вкажіть VATRA ID іншого учасника.","Enter another member's VATRA ID."),true);return;}
    const r=await client.from("business_members").insert({company_id:companyId,member_vatra_id:id,role:select.value});if(r.error)throw r.error;await refresh();await render();
   });const panel=card("ui-business-team-card-001");panel.append(form);target.append(panel);
  }
 }
 async function render(){
  const version=++renderVersion;const url=new URL(location.href);url.searchParams.delete("company");url.searchParams.delete("for");url.searchParams.delete("section");url.searchParams.delete("post");url.searchParams.set("tools",view);const mode={jobs:jobMode,booking:bookingMode,stores:storeMode,inbox:inboxMode}[view];if(mode==="manage")url.searchParams.set("mode","manage");else url.searchParams.delete("mode");history.replaceState(history.state,"",url);main.replaceChildren();const target=make("div","ui-business-view-001");main.append(target);
  try{if(!publicSections.includes(view)&&!canManageSection(view)&&!(view==="overview"&&scopePending)){target.append(make("p","vt-business-empty-001",t("Цей інструмент недоступний для вашої ролі.","This tool is unavailable for your role.")));return;}
  if(view==="ratings"){target.append(heading(t("Оцінки спільноти","Community ratings")));await renderRating(scopeCompany.id,target);}
  else if(view==="overview"){await dashboard(target);
  }else if(view==="team"){target.append(heading(t("Команда","Team")));await team(target,version);}
  else if(view==="analytics")await showAnalytics(target);
  else if(view==="inbox"){const module=await import(new URL("assets/js/business-inbox.js?rev=36b80ca47a96909ee4f8626ce7285ea0d7513a3f",root).href);if(version!==renderVersion)return;await module.renderBusinessInbox({target,client,t,make,link,btn,card,tabs,heading,companySelector,selected,roleOf,ownId,message,err,initialMode:inboxMode,onMode:key=>{inboxMode=key;},browseCompany});}
  else if(view==="stores"){const module=await import(new URL("assets/js/business-stores.js?rev=ee38d66f08a9fd24eca4a0abd44966711063cf4a",root).href);if(version!==renderVersion)return;await module.renderBusinessStores({target,client,t,make,link,btn,card,tabs,heading,companySelector,selected,roleOf,ownId,message,confirmRemove,err,initialMode:storeMode,onMode:key=>{storeMode=key;},browseCompany});}
  else if(view==="booking"){const module=await import(new URL("assets/js/business-bookings.js?rev=47eb1f5ab0c6c0bc4e5d7e84e8cdf88d35a7dcb1",root).href);if(version!==renderVersion)return;await module.renderBusinessBookings({target,client,t,make,link,btn,card,field,submit,dialog,tabs,heading,companySelector,selected,roleOf,ownId,message,confirmRemove,err,initialMode:bookingMode,onMode:key=>{bookingMode=key;},browseCompany});}
  else if(view==="jobs"){const module=await import(new URL("assets/js/business-jobs.js?rev=63b1d0b95e701adff890bad5853fb083a60c2f3e",root).href);if(version!==renderVersion)return;await module.renderBusinessJobs({target,client,t,make,link,btn,card,field,submit,dialog,tabs,heading,companySelector,selected,roleOf,ownId,message,confirmRemove,err,initialMode:jobMode,onMode:key=>{jobMode=key;},browseCompany});}
  else{target.append(make("p","vt-business-empty-001",t("Інструмент недоступний.","Tool unavailable.")));}}catch(_){if(version===renderVersion)target.replaceChildren(make("p","vt-business-empty-001",err));}
 }
 try{await Promise.all([refresh(),loadCategories().catch(()=>[])]);browseCompany=scopeCompany.id;const section=publicSections.includes(requestedSection)||canManageSection(requestedSection)||scopePending&&requestedSection==="overview"?requestedSection:(scopeRole||scopePending?"overview":"stores");await navigate(section,current.searchParams.get("mode"));}catch(_){main.replaceChildren(make("p","vt-business-empty-001",err));}
}
window.VATRA_BUSINESS_TOOLS=Object.freeze({mount});

})();
