(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_SECTION_CORE?.start(async ({root,t,make,link,btn,valid,title,subtitle,content,client,user,ownId,message,card,field,submit,tabs,dialog,nameOf,confirmRemove,sectionIcon,discoveryIcons})=>{
 title.textContent="VATRA Business";subtitle.textContent="";
 const fields="id,name,category,category_code,description,city,contact_email,website,created_at,updated_at";
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const current=new URL(location.href),requested=current.searchParams.get("company");
 const roleName=role=>({owner:t("Власник","Owner"),admin:t("Адміністратор","Administrator"),manager:t("Менеджер","Manager"),editor:t("Редактор","Editor")})[role]||"";
 const sections=[
  ["overview",t("Мої компанії","My companies"),"all"],
  ["companies",t("Компанії","Companies"),"briefcase"],
  ["following",t("Мої підписки","Following"),"bookmark"],
  ["posts",t("Публікації","Posts"),"listings"],
  ["team",t("Команда","Team"),"friends"],
  ["stores",t("Магазини","Stores"),"bag"],
  ["ads",t("Реклама","Advertising"),"share"],
  ["analytics",t("Аналітика","Analytics"),"catalog"],
  ["jobs",t("Вакансії","Jobs"),"listings"],
  ["booking",t("Бронювання","Bookings"),"watch"]
 ];
 const canPublish=id=>["owner","admin","editor"].includes(roleOf(id));
 const moduleCopy={
  stores:t("Каталоги товарів та послуг компаній.","Company product and service catalogues."),
  ads:t("Просування компаній, товарів і публікацій.","Promote companies, products and posts."),
  analytics:t("Перегляди, охоплення та аудиторія.","Views, reach and audience."),
  jobs:t("Пошук працівників та роботи.","Find employees and jobs."),
  booking:t("Запис клієнтів на послуги.","Customer service appointments.")
 };
 let view="overview",members=[],companies=new Map(),selected=null,renderVersion=0,working=false,openingEditor=false;
 let categories=[],categoriesPromise=null,jobMode="browse",bookingMode="browse";
 const workspace=make("div","vatra-discovery-workspace ui-business-workspace-001");
 const sidebar=make("aside","vatra-discovery-sidebar ui-business-sidebar-001"),main=make("section","vatra-discovery-content ui-business-content-001");
 const create=btn(t("Створити компанію","Create company"),"vatra-discovery-primary vt-business-create-001",()=>openEditor());
 const nav=make("nav","ui-business-nav-001");nav.setAttribute("aria-label",t("Навігація бізнес-центром","Business centre navigation"));
 const businessPaths={
  companies:"M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16M17 10h3a1 1 0 0 1 1 1v10M2 21h20M8 7h1m3 0h1M8 11h1m3 0h1M8 15h1m3 0h1m-4 6v-3h3v3",
  analytics:"M4 20V4m0 16h16M8 16v-5m5 5V7m5 9v-7",
  ads:"M4 10v5h4l10 4V6L8 10H4Zm4 5 2 5h3l-2-4m7-5h3",
  booking:"M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM7 2v4m10-4v4M3 9h18m-14 5h3m4 0h3m-10 3h3",
  stores:"M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 13v8h14v-8m-9 8v-5h4v5",
  jobs:"M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2"
 };
 function businessIcon(key){const svg=sectionIcon(sections.find(x=>x[0]===key)?.[2]||"all"),path=svg.querySelector("path");svg.setAttribute("class","ui-business-icon-"+key);path?.setAttribute("class","ui-business-icon-path-"+key);if(businessPaths[key])path?.setAttribute("d",businessPaths[key]);return svg;}
 function navigate(key,mode){if(key==="jobs")jobMode=mode||"browse";if(key==="booking")bookingMode=mode||"browse";setNav(key);void render();}
 function navGroup(label,keys){
  const group=make("div","ui-business-nav-group-001"),items=sections.filter(x=>keys.includes(x[0])).sort((a,b)=>keys.indexOf(a[0])-keys.indexOf(b[0]));
  group.append(make("p","vt-business-nav-caption-001",label));
  const bar=tabs(items.map(x=>x.slice(0,2)),key=>navigate(key),"vatra-discovery-tabs ui-business-nav-items-001");
  discoveryIcons(bar,Object.fromEntries(items.map(x=>[x[0],x[2]])));
  for(const b of bar.children){b.querySelector(".vatra-discovery-nav-icon")?.replaceChildren(businessIcon(b.dataset.tab));if(["stores","ads"].includes(b.dataset.tab))b.append(make("span","vt-business-nav-soon-001",t("Скоро","Soon")));}
  group.append(bar);nav.append(group);
 }
 navGroup(t("Керування","Management"),["overview","posts","team","analytics"]);
 navGroup(t("Каталог","Discover"),["companies","following","jobs","booking"]);
 navGroup(t("У розробці","In development"),["stores","ads"]);
 sidebar.append(make("h1","vatra-discovery-title vt-business-title-001","VATRA Business"),create,nav);
 setNav("overview");
 workspace.append(sidebar,main);content.append(workspace);
 const heading=(label,copy)=>{const block=make("header","ui-business-heading-001");block.append(make("h2","vt-business-heading-001",label));if(copy)block.append(make("p","vt-business-heading-copy-001",copy));return block;};
 const roleOf=id=>members.find(m=>m.company_id===id&&m.status==="active")?.role;
 const err=t("Не вдалося виконати дію. Спробуйте ще раз.","Could not complete the action. Please try again.");
 function setNav(key){view=key;for(const b of nav.querySelectorAll("button[data-tab]")){const active=b.dataset.tab===key;b.classList.toggle("is-active",active);b.setAttribute("aria-pressed",String(active));}}
 async function refresh(){
  const roles=await client.from("business_members").select("company_id,member_vatra_id,role,status").eq("member_vatra_id",ownId);
  if(roles.error)throw roles.error;members=roles.data||[];
  const ids=[...new Set(members.map(m=>m.company_id))];companies=new Map();
  if(ids.length){const result=await client.from("business_companies").select(fields).in("id",ids);if(result.error)throw result.error;for(const row of result.data||[])companies.set(row.id,row);}
  const active=members.filter(m=>m.status==="active"&&companies.has(m.company_id));
  if(!active.some(m=>m.company_id===selected))selected=active[0]?.company_id||null;
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
 function companyLink(c){return link(c.name,"business?company="+encodeURIComponent(c.id),"vt-business-company-link-001");}
 function safeWebsite(value){try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password?u.href:"";}catch(_){return "";}}
 function tile(c,role){
  const el=card("ui-business-company-card-001"),symbol=make("span","ui-business-company-avatar-001",(c.name||"V").trim().slice(0,1).toLocaleUpperCase()),identity=make("div","ui-business-company-identity-001");
  identity.append(companyLink(c),make("p","vt-business-company-meta-001",[categoryName(c),c.city].filter(Boolean).join(" · ")));
  if(role)identity.append(make("p","vt-business-company-role-001",roleName(role)));
  el.append(symbol,identity);
  if(role)el.append(btn(t("Керувати","Manage"),"vt-business-secondary-001",()=>{selected=c.id;setNav("overview");void render();}));
  return el;
 }
 async function operation(fn){
  if(working)return;working=true;message("");
  try{await fn();await refresh();await render();}catch(_){message(err,true);}finally{working=false;}
 }
 async function openEditor(existing=null){
  const role=existing?roleOf(existing.id):null;if(existing&&!["owner","admin","editor"].includes(role))return;
  if(openingEditor||document.querySelector(".ui-business-editor-001[open]"))return;openingEditor=true;create.disabled=true;
  try{await loadCategories();}catch(_){message(t("Не вдалося завантажити категорії. Спробуйте ще раз.","Could not load categories. Please try again."),true);return;}finally{openingEditor=false;create.disabled=false;}
  const d=make("dialog","ui-vatra-section-dialog-001 ui-business-editor-001"),head=make("header","ui-vatra-section-dialog-head-001"),headingText=make("h2","vt-vatra-section-dialog-title-001",existing?t("Редагувати компанію","Edit company"):t("Створити компанію","Create company"));
  headingText.id="business-editor-title";d.setAttribute("aria-labelledby",headingText.id);
  let saving=false;const close=btn("×","vt-vatra-section-dialog-close-001",()=>{if(!saving)d.close();});close.setAttribute("aria-label",t("Закрити","Close"));head.append(headingText,close);
  const scroll=make("div","ui-vatra-section-dialog-scroll-001 ui-business-editor-scroll-001"),form=make("form","ui-business-editor-form-001");form.id="business-company-form";
  const note=make("p","vt-business-form-note-001",t("Інформацію бачитимуть користувачі VATRA. Особистий профіль не зміниться.","VATRA members will see this information. Your personal profile will not change."));
  const basics=make("section","ui-business-editor-section-001"),contacts=make("section","ui-business-editor-section-001");
  basics.append(make("h3","vt-business-editor-section-title-001",t("Основна інформація","Basic information")));
  const name=field(basics,"business-name",t("Назва компанії","Company name"),"text",100,true);
  const category=categoryPicker(basics,existing);
  const description=field(basics,"business-description",t("Опис компанії","Company description"),"textarea",2000);description.rows=3;description.placeholder=t("Чим займається ваша компанія?","What does your company do?");
  contacts.append(make("h3","vt-business-editor-section-title-001",t("Контакти","Contact details")));
  const city=field(contacts,"business-city",t("Місто","City"),"text",100),email=field(contacts,"business-email",t("Публічна електронна пошта","Public email"),"email",254),website=field(contacts,"business-website",t("Вебсайт","Website"),"url",300);website.placeholder="https://";
  name.minLength=2;name.placeholder=t("Наприклад, BARBER STUDIO","e.g. BARBER STUDIO");
  if(existing){name.value=existing.name;description.value=existing.description;city.value=existing.city;email.value=existing.contact_email;website.value=existing.website;}
  form.append(note,basics,contacts);scroll.append(form);
  const footer=make("footer","ui-business-editor-footer-001"),status=make("p","vt-business-editor-status-001");status.setAttribute("role","alert");status.hidden=true;
  const actions=make("div","ui-business-editor-actions-001"),cancel=btn(t("Скасувати","Cancel"),"vt-business-secondary-001",()=>{if(!saving)d.close();}),save=make("button","vt-vatra-section-submit-001 vt-business-editor-save-001",existing?t("Зберегти зміни","Save changes"):t("Створити компанію","Create company"));save.type="submit";save.setAttribute("form",form.id);actions.append(cancel,save);footer.append(status,actions);
  const showError=copy=>{status.textContent=copy;status.hidden=!copy;};
  form.addEventListener("submit",async e=>{
   e.preventDefault();if(saving)return;showError("");
   const chosen=categories.find(row=>row.code===category.value);
   const payload={name:name.value.trim(),category:chosen?.name_uk||"",category_code:chosen?.code,description:description.value.trim(),city:city.value.trim(),contact_email:email.value.trim(),website:website.value.trim()};
   if(payload.name.length<2||!chosen||(payload.website&&!safeWebsite(payload.website))){showError(t("Перевірте назву, категорію та вебсайт.","Check name, category and website."));return;}
   saving=true;save.disabled=cancel.disabled=close.disabled=true;
   try{
    const result=existing?await client.from("business_companies").update(payload).eq("id",existing.id).select("id").single():await client.from("business_companies").insert(payload).select("id").single();
    if(result.error||!result.data?.id)throw Error("save");
    selected=result.data.id;d.close();setNav("overview");
    try{await refresh();await render();message(existing?t("Зміни збережено.","Changes saved."):t("Компанію створено.","Company created."));}catch(_){message(t("Компанію збережено, але не вдалося оновити список.","Company saved, but the list could not be refreshed."),true);}
   }catch(_){showError(t("Не вдалося зберегти компанію. Спробуйте ще раз.","Could not save the company. Please try again."));}finally{saving=false;save.disabled=cancel.disabled=close.disabled=false;}
  });
  d.addEventListener("cancel",e=>{if(saving)e.preventDefault();});d.addEventListener("close",()=>d.remove(),{once:true});d.append(head,scroll,footer);document.body.append(d);d.showModal();
 }

 function companySelector(){
  const active=members.filter(m=>m.status==="active"&&companies.has(m.company_id));
  const wrapper=make("label","ui-business-selector-001"),select=make("select","ui-business-select-001");wrapper.append(make("span","vt-business-selector-label-001",t("Активна компанія","Active company")),select);
  for(const m of active){const option=make("option","vt-business-select-option-001",companies.get(m.company_id).name+" · "+roleName(m.role));option.value=m.company_id;select.append(option);}
  select.value=selected||"";select.addEventListener("change",()=>{selected=select.value;void render();});return wrapper;
 }
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
  const {data,error}=await client.from("business_metrics").select("follower_count,post_count").eq("company_id",id).single();
  if(error||!data)throw Error("metrics");return data;
 }
 function metricValue(n){return Number.isFinite(Number(n))?new Intl.NumberFormat(document.documentElement.lang||"uk").format(Number(n)):"—";}
 async function followControls(c,target){
  const panel=make("div","ui-business-follow-panel-001"),count=make("span","vt-business-follow-count-001"),status=statusLine();
  panel.append(count,status);target.append(panel);
  try{
   const [metrics,own]=await Promise.all([loadMetrics(c.id),client.from("business_followers").select("company_id").eq("company_id",c.id).eq("member_vatra_id",ownId).maybeSingle()]);
   if(own.error)throw own.error;if(!panel.isConnected)return;
   let following=Boolean(own.data);
   const toggle=btn("","vt-business-primary-001",async()=>{
    toggle.disabled=true;setStatus(status,"");
    try{
     const result=following?await client.from("business_followers").delete().eq("company_id",c.id).eq("member_vatra_id",ownId):await client.from("business_followers").insert({company_id:c.id});
     if(result.error)throw result.error;
     following=!following;paint();
     try{const next=await loadMetrics(c.id);count.textContent=metricValue(next.follower_count)+" "+t("· підписники","· followers");}catch(_){count.textContent=t("Не вдалося оновити статистику.","Could not refresh statistics.");}
    }catch(_){setStatus(status,err,true);}finally{toggle.disabled=false;}
   });
   function paint(){toggle.textContent=following?t("Ви підписані · Відписатися","Following · Unfollow"):t("Підписатися","Follow");toggle.setAttribute("aria-pressed",String(following));}
   paint();count.textContent=metricValue(metrics.follower_count)+" "+t("· підписники","· followers");panel.prepend(toggle);
  }catch(_){setStatus(status,err,true);}
 }
 async function renderPosts(id,target,editable=false){
  const container=make("section","ui-business-posts-001");container.append(heading(t("Публікації компанії","Company posts")));target.append(container);
  const list=make("div","ui-business-post-list-001"),status=statusLine();let ticket=0;
  async function load(){
   const version=++ticket;const result=await client.from("business_posts").select("id,body,created_at").eq("company_id",id).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(50);
   if(version!==ticket||!container.isConnected)return;
   if(result.error){setStatus(status,err,true);return;}
   list.replaceChildren();
   if(!result.data?.length)list.append(make("p","vt-business-empty-001",t("Публікацій поки немає.","No posts yet.")));
   for(const post of result.data||[]){
    const item=card("ui-business-post-card-001"),date=make("time","vt-business-post-date-001",new Date(post.created_at).toLocaleString(document.documentElement.lang||"uk"));date.dateTime=post.created_at;
    item.append(date,make("p","vt-business-post-body-001",post.body));
    if(editable&&canPublish(id)){const remove=btn(t("Видалити","Delete"),"vt-business-secondary-001",async()=>{
     remove.disabled=true;try{if(!await confirmRemove(t("Видалити публікацію?","Delete post?"),t("Цю дію неможливо скасувати.","This action cannot be undone."),t("Видалити","Delete")))return;
      const r=await client.from("business_posts").delete().eq("id",post.id).eq("company_id",id).select("id").single();
      if(r.error||!r.data)throw Error("delete");await load();
     }catch(_){setStatus(status,err,true);}finally{remove.disabled=false;}
    });item.append(remove);}list.append(item);
   }
  }
  if(editable&&canPublish(id)){
   const form=make("form","ui-business-post-form-001"),lab=make("label","vt-business-post-label-001",t("Нова публікація","New post")),input=make("textarea","ui-business-post-input-001");
   input.id="business-post-body";lab.htmlFor=input.id;input.rows=4;input.maxLength=3000;input.required=true;input.placeholder=t("Поділіться новинами своєї компанії…","Share company news…");
   const publish=make("button","vt-business-primary-001",t("Опублікувати","Publish"));publish.type="submit";
   form.append(lab,input,publish);form.addEventListener("submit",async e=>{e.preventDefault();if(publish.disabled)return;const body=input.value.trim();if(!body)return;
    publish.disabled=true;setStatus(status,"");
    try{const r=await client.from("business_posts").insert({company_id:id,body});if(r.error)throw r.error;input.value="";await load();}
    catch(_){setStatus(status,err,true);}finally{publish.disabled=false;}
   });container.append(form);
  }
  container.append(status,list);await load();
 }
 async function showAnalytics(target){
  target.append(heading(t("Аналітика","Analytics"),t("Поточні показники сторінки компанії.","Current company page metrics.")));
  if(!selected){target.append(make("p","vt-business-empty-001",t("Спочатку створіть компанію.","Create a company first.")));return;}
  target.append(companySelector());const metrics=await loadMetrics(selected);if(!target.isConnected)return;
  const grid=make("div","ui-business-metrics-001");
  for(const [key,label] of [["follower_count",t("Підписники","Followers")],["post_count",t("Публікації","Posts")]]){const el=card("ui-business-metric-001");el.append(make("p","vt-business-metric-label-001",label),make("strong","vt-business-metric-value-001",metricValue(metrics[key])));grid.append(el);}
  target.append(grid,make("p","vt-business-heading-copy-001",t("Перегляди й охоплення ще не вимірюються; відображаються лише фактичні підписки та публікації.","Views and reach are not measured yet; only actual followers and posts are shown.")));
 }
 async function showFollowing(target){
  target.append(heading(t("Мої підписки","Following")));
  const r=await client.from("business_followers").select("company_id").eq("member_vatra_id",ownId).order("created_at",{ascending:false}).limit(100);
  if(r.error)throw r.error;if(!target.isConnected)return;
  const ids=(r.data||[]).map(x=>x.company_id);
  if(!ids.length){target.append(make("p","vt-business-empty-001",t("Ви ще не підписані на компанії.","You do not follow companies yet.")));return;}
  const result=await client.from("business_companies").select(fields).in("id",ids);if(result.error)throw result.error;if(!target.isConnected)return;
  const grid=make("div","ui-business-company-grid-001");for(const c of result.data||[])grid.append(tile(c,roleOf(c.id)));target.append(grid);
 }
 function showCompany(c,target){
  const box=card("ui-business-company-profile-001"),inner=make("div","ui-business-company-profile-info-001"),identity=make("div","ui-business-profile-identity-001"),copy=make("div","ui-business-profile-copy-001");
  const avatar=make("span","ui-business-company-profile-avatar-001",c.name.trim().slice(0,1).toLocaleUpperCase());
  copy.append(make("h2","vt-business-company-profile-name-001",c.name),make("p","vt-business-company-meta-001",[categoryName(c),c.city].filter(Boolean).join(" · ")));
  identity.append(avatar,copy);inner.append(identity);box.append(inner);target.append(box);
  const details=card("ui-business-profile-details-001");details.append(make("h3","vt-business-panel-title-001",t("Про компанію","About the company")),make("p","vt-business-company-description-001",c.description||t("Опис компанії поки не додано.","No company description yet.")));
  if(c.contact_email){const email=make("span","vt-business-company-contact-001",c.contact_email);details.append(make("p","vt-business-selector-label-001",t("Електронна пошта","Email")),email);}
  const url=safeWebsite(c.website);if(url){const a=make("a","vt-business-company-site-001",t("Вебсайт компанії","Company website"));a.href=url;a.target="_blank";a.rel="noopener noreferrer";details.append(a);}
  target.append(details);return inner;
 }
 async function dashboard(target){
  target.append(heading(t("Мій бізнес","My business"),t("Керуйте своїми компаніями та їхніми інструментами.","Manage your companies and their tools.")));showInvites(target);
  if(!selected||!companies.has(selected)){
   const box=card("ui-business-welcome-001");box.append(businessIcon("companies"),make("h3","vt-business-panel-title-001",t("Створіть свою першу компанію","Create your first company")),make("p","vt-business-heading-copy-001",t("Додайте сторінку компанії, щоб публікувати новини, шукати працівників і приймати записи клієнтів.","Create a company page to publish news, find staff and accept appointments.")),btn(t("Створити компанію","Create company"),"vt-business-primary-001",()=>openEditor()));target.append(box);return;
  }
  const id=selected,c=companies.get(id),role=roleOf(id),canEdit=["owner","admin","editor"].includes(role),canManage=["owner","admin","manager"].includes(role);
  const panel=card("ui-business-dashboard-company-001"),head=make("div","ui-business-dashboard-head-001"),identity=make("div","ui-business-dashboard-identity-001"),info=make("div","ui-business-dashboard-info-001"),actions=make("div","ui-business-dashboard-actions-001");
  info.append(make("p","vt-business-dashboard-role-001",roleName(role)),make("h3","vt-business-dashboard-company-name-001",c.name),make("p","vt-business-company-meta-001",[categoryName(c),c.city].filter(Boolean).join(" · ")));
  identity.append(make("span","ui-business-company-avatar-001",c.name.trim().slice(0,1).toLocaleUpperCase()),info);
  head.append(identity,companySelector());actions.append(link(t("Публічна сторінка","Public page"),"business?company="+encodeURIComponent(id),"vt-business-secondary-001 vt-business-page-action-001"));
  if(canEdit)actions.append(btn(t("Редагувати інформацію","Edit information"),"vt-business-primary-001",()=>openEditor(c)));
  panel.append(head,actions);target.append(panel);
  const metrics=make("div","ui-business-metrics-001"),counter={};for(const [key,label] of [["follower_count",t("Підписники","Followers")],["post_count",t("Публікації","Posts")]]){const el=card("ui-business-metric-001"),value=make("strong","vt-business-metric-value-001","—");counter[key]=value;el.append(make("p","vt-business-metric-label-001",label),value);metrics.append(el);}target.append(metrics);
  const tools=make("div","ui-business-dashboard-tools-001");
  const tool=(key,label,copy,mode)=>{const b=btn("","ui-business-tool-001",()=>navigate(key,mode)),symbol=make("span","ui-business-tool-icon-001"),body=make("span","ui-business-tool-copy-001");symbol.append(businessIcon(key));body.append(make("strong","vt-business-tool-title-001",label),make("span","vt-business-tool-description-001",copy));b.append(symbol,body,sectionIcon("down"));tools.append(b);};
  if(canEdit)tool("posts",t("Публікації","Posts"),t("Створюйте дописи від імені компанії","Publish on behalf of your company"));
  if(canManage){tool("jobs",t("Вакансії компанії","Company jobs"),t("Публікуйте вакансії та розглядайте відгуки","Publish jobs and review applications"),"manage");tool("booking",t("Календар компанії","Company calendar"),t("Додавайте час та керуйте записами","Add times and manage appointments"),"manage");}
  if(["owner","admin"].includes(role))tool("team",t("Команда","Team"),t("Ролі та доступ до компанії","Company roles and access"));
  tool("analytics",t("Аналітика","Analytics"),t("Переглядайте фактичні показники","View actual metrics"));
  target.append(heading(t("Інструменти компанії","Company tools")),tools);
  try{const totals=await loadMetrics(id);if(target.isConnected)for(const key of Object.keys(counter))counter[key].textContent=metricValue(totals[key]);}catch(_){if(target.isConnected)metrics.append(make("p","vt-business-heading-copy-001",t("Не вдалося завантажити показники.","Could not load metrics.")));}
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
  const version=++renderVersion;const url=new URL(location.href);if(url.searchParams.has("company")){url.searchParams.delete("company");history.replaceState(history.state,"",url);}main.replaceChildren();const target=make("div","ui-business-view-001");main.append(target);
  try{if(view==="overview"){await dashboard(target);
  }else if(view==="companies"){
   target.append(heading(t("Компанії VATRA","VATRA companies")));
   const filter=make("input","ui-business-directory-search-001");filter.type="search";filter.placeholder=t("Пошук компаній","Search companies");filter.setAttribute("aria-label",filter.placeholder);
   const grid=make("div","ui-business-company-grid-001");target.append(filter,grid);let ticket=0,timer;
   const load=async()=>{const ownTicket=++ticket;const term=filter.value.trim().slice(0,100).replace(/[%_]/g,"");let q=client.from("business_companies").select(fields).order("created_at",{ascending:false}).limit(50);
    if(term)q=q.ilike("name","%"+term+"%");const r=await q;if(version!==renderVersion||ownTicket!==ticket)return;grid.replaceChildren();if(r.error){grid.append(make("p","vt-business-empty-001",err));return;}for(const c of r.data||[])grid.append(tile(c,roleOf(c.id)));if(!grid.children.length)grid.append(make("p","vt-business-empty-001",t("Компаній не знайдено.","No companies found.")));
   };filter.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>void load(),250);});await load();
  }else if(view==="team"){target.append(heading(t("Команда","Team")));await team(target,version);}
  else if(view==="following")await showFollowing(target);
  else if(view==="analytics")await showAnalytics(target);
  else if(view==="booking"){const module=await import(new URL("assets/js/business-bookings.js?rev=da94aaa6005dc249128ba0bd527d15adf3e16b7f",root).href);if(version!==renderVersion)return;await module.renderBusinessBookings({target,client,t,make,link,btn,card,field,submit,dialog,tabs,heading,companySelector,selected,roleOf,ownId,message,confirmRemove,err,initialMode:bookingMode,onMode:key=>{bookingMode=key;}});}
  else if(view==="jobs"){const module=await import(new URL("assets/js/business-jobs.js?rev=9aaa1591223f8926b7ccab49f9b5f6ed513e03d7",root).href);if(version!==renderVersion)return;await module.renderBusinessJobs({target,client,t,make,link,btn,card,field,submit,dialog,tabs,heading,companySelector,selected,roleOf,ownId,message,confirmRemove,err,initialMode:jobMode,onMode:key=>{jobMode=key;}});}
  else if(view==="posts"){if(!selected){target.append(heading(t("Публікації","Posts")),make("p","vt-business-empty-001",t("Спочатку створіть компанію.","Create a company first.")));}else{target.append(companySelector());await renderPosts(selected,target,true);}}
  else{const item=sections.find(x=>x[0]===view);target.append(heading(item[1],moduleCopy[view]));const panel=card("ui-business-module-001");panel.append(sectionIcon(item[2]),make("h3","vt-business-panel-title-001",t("Функція в розробці","In development")),make("p","vt-business-heading-copy-001",t("Цей інструмент ще не доступний. Дані та показники не генеруються.","This tool is not available yet. No data or metrics are generated.")));target.append(panel);}}catch(_){if(version===renderVersion)target.replaceChildren(make("p","vt-business-empty-001",err));}
 }
 async function showPublic(id){
  setNav("companies");const version=++renderVersion;const result=await client.from("business_companies").select(fields).eq("id",id).maybeSingle();if(version!==renderVersion)return;main.replaceChildren();
  main.append(link(t("До бізнес-центру","Back to business centre"),"business","vt-business-page-link-001"));
  if(result.error){main.append(make("p","vt-business-empty-001",err));return;}
  if(!result.data){main.append(make("p","vt-business-empty-001",t("Компанію не знайдено.","Company not found.")));return;}
  const target=make("div","ui-business-view-001 ui-business-public-view-001");main.append(target);const profile=showCompany(result.data,target);
  await Promise.all([followControls(result.data,profile),renderPosts(id,target,false)]);
 }
 try{await Promise.all([refresh(),loadCategories().catch(()=>[])]);if(requested){if(uuid.test(requested))await showPublic(requested);else main.append(make("p","vt-business-empty-001",t("Компанію не знайдено.","Company not found.")));}
 else await render();}catch(_){main.replaceChildren(make("p","vt-business-empty-001",err));}
});
})();
