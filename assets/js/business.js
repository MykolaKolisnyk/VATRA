(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_SECTION_CORE?.start(async ({root,t,make,link,btn,valid,title,subtitle,content,client,user,ownId,message,card,field,submit,tabs,dialog,nameOf,confirmRemove,sectionIcon,discoveryIcons})=>{
 title.textContent="VATRA Business";subtitle.textContent="";
 const fields="id,name,category,description,city,contact_email,website,created_at,updated_at";
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const current=new URL(location.href),requested=current.searchParams.get("company");
 const roleName=role=>({owner:t("Власник","Owner"),admin:t("Адміністратор","Administrator"),manager:t("Менеджер","Manager"),editor:t("Редактор","Editor")})[role]||"";
 const sections=[
  ["overview",t("Огляд","Overview"),"all"],
  ["companies",t("Компанії","Companies"),"briefcase"],
  ["team",t("Команда","Team"),"friends"],
  ["stores",t("Магазини","Stores"),"bag"],
  ["ads",t("Реклама","Advertising"),"share"],
  ["analytics",t("Аналітика","Analytics"),"catalog"],
  ["jobs",t("Вакансії","Jobs"),"listings"],
  ["booking",t("Бронювання","Bookings"),"watch"]
 ];
 const moduleCopy={
  stores:t("Каталоги товарів та послуг компаній.","Company product and service catalogues."),
  ads:t("Просування компаній, товарів і публікацій.","Promote companies, products and posts."),
  analytics:t("Перегляди, охоплення та аудиторія.","Views, reach and audience."),
  jobs:t("Пошук працівників та роботи.","Find employees and jobs."),
  booking:t("Запис клієнтів на послуги.","Customer service appointments.")
 };
 let view="overview",members=[],companies=new Map(),selected=null,renderVersion=0,working=false;
 const workspace=make("div","vatra-discovery-workspace ui-business-workspace-001");
 const sidebar=make("aside","vatra-discovery-sidebar ui-business-sidebar-001"),main=make("section","vatra-discovery-content ui-business-content-001");
 const create=btn(t("Створити компанію","Create company"),"vatra-discovery-primary vt-business-create-001",()=>openEditor());
 const nav=tabs(sections.map(x=>x.slice(0,2)),key=>{view=key;void render();},"vatra-discovery-tabs ui-business-nav-001");
 discoveryIcons(nav,Object.fromEntries(sections.map(x=>[x[0],x[2]])));
 sidebar.append(make("h1","vatra-discovery-title vt-business-title-001","VATRA Business"),nav,create);
 workspace.append(sidebar,main);content.append(workspace);
 const heading=(label,copy)=>{const block=make("header","ui-business-heading-001");block.append(make("h2","vt-business-heading-001",label));if(copy)block.append(make("p","vt-business-heading-copy-001",copy));return block;};
 const roleOf=id=>members.find(m=>m.company_id===id&&m.status==="active")?.role;
 const err=t("Не вдалося виконати дію. Спробуйте ще раз.","Could not complete the action. Please try again.");
 function setNav(key){view=key;for(const b of nav.children){const active=b.dataset.tab===key;b.classList.toggle("is-active",active);b.setAttribute("aria-pressed",String(active));}}
 async function refresh(){
  const roles=await client.from("business_members").select("company_id,member_vatra_id,role,status").eq("member_vatra_id",ownId);
  if(roles.error)throw roles.error;members=roles.data||[];
  const ids=[...new Set(members.map(m=>m.company_id))];companies=new Map();
  if(ids.length){const result=await client.from("business_companies").select(fields).in("id",ids);if(result.error)throw result.error;for(const row of result.data||[])companies.set(row.id,row);}
  const active=members.filter(m=>m.status==="active"&&companies.has(m.company_id));
  if(!active.some(m=>m.company_id===selected))selected=active[0]?.company_id||null;
 }
 function companyLink(c){return link(c.name,"business?company="+encodeURIComponent(c.id),"vt-business-company-link-001");}
 function safeWebsite(value){try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password?u.href:"";}catch(_){return "";}}
 function tile(c,role){
  const el=card("ui-business-company-card-001"),symbol=make("span","ui-business-company-avatar-001",(c.name||"V").trim().slice(0,1).toLocaleUpperCase()),identity=make("div","ui-business-company-identity-001");
  identity.append(companyLink(c),make("p","vt-business-company-meta-001",[c.category,c.city].filter(Boolean).join(" · ")));
  if(role)identity.append(make("p","vt-business-company-role-001",roleName(role)));
  el.append(symbol,identity);
  if(role)el.append(btn(t("Керувати","Manage"),"vt-business-secondary-001",()=>{selected=c.id;setNav("overview");void render();}));
  return el;
 }
 async function operation(fn){
  if(working)return;working=true;message("");
  try{await fn();await refresh();await render();}catch(_){message(err,true);}finally{working=false;}
 }
 function openEditor(existing=null){
  const role=existing?roleOf(existing.id):null;if(existing&&!["owner","admin","editor"].includes(role))return;
  const {d,form}=dialog(existing?t("Редагувати компанію","Edit company"):t("Створити компанію","Create company"));
  d.classList.add("ui-business-editor-001");d.addEventListener("close",()=>d.remove(),{once:true});
  form.append(make("p","vt-business-form-note-001",t("Ці дані будуть видимі іншим користувачам VATRA. Особистий профіль не зміниться.","This information will be visible to other VATRA members. Your personal profile will not change.")));
  const name=field(form,"business-name",t("Назва компанії","Company name"),"text",100,true);
  const category=field(form,"business-category",t("Категорія","Category"),"text",80,true);
  const description=field(form,"business-description",t("Про компанію","About the company"),"textarea",2000);
  const city=field(form,"business-city",t("Місто","City"),"text",100);
  const email=field(form,"business-email",t("Публічна електронна пошта","Public email"),"email",254);
  const website=field(form,"business-website",t("Вебсайт (https://)","Website (https://)"),"url",300);
  name.minLength=category.minLength=2;
  if(existing){name.value=existing.name;category.value=existing.category;description.value=existing.description;city.value=existing.city;email.value=existing.contact_email;website.value=existing.website;}
  submit(form,existing?t("Зберегти","Save"):t("Створити","Create"),async()=>{
   const payload={name:name.value.trim(),category:category.value.trim(),description:description.value.trim(),city:city.value.trim(),contact_email:email.value.trim(),website:website.value.trim()};
   if(payload.name.length<2||payload.category.length<2||(payload.website&&!safeWebsite(payload.website))){message(t("Перевірте назву, категорію та вебсайт.","Check name, category and website."),true);return;}
   const result=existing?await client.from("business_companies").update(payload).eq("id",existing.id).select("id").single():await client.from("business_companies").insert(payload).select("id").single();
   if(result.error||!result.data?.id)throw Error("save");
   selected=result.data.id;d.close();setNav("overview");
   try{await refresh();await render();}catch(_){message(t("Компанію збережено, але не вдалося оновити список.","Company saved, but the list could not be refreshed."),true);}
  });d.showModal();
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
 function showCompany(c,target,controls=true){
  const box=card("ui-business-company-profile-001"),cover=make("div","ui-business-company-cover-001"),inner=make("div","ui-business-company-profile-info-001");
  const avatar=make("span","ui-business-company-profile-avatar-001",c.name.trim().slice(0,1).toLocaleUpperCase());
  inner.append(avatar,make("h2","vt-business-company-profile-name-001",c.name),make("p","vt-business-company-meta-001",[c.category,c.city].filter(Boolean).join(" · ")));
  const description=make("p","vt-business-company-description-001",c.description||t("Опис компанії поки не додано.","No company description yet."));inner.append(description);
  if(c.contact_email)inner.append(make("p","vt-business-company-contact-001",c.contact_email));
  const url=safeWebsite(c.website);if(url){const a=make("a","vt-business-company-site-001",t("Вебсайт компанії","Company website"));a.href=url;a.target="_blank";a.rel="noopener noreferrer";inner.append(a);}
  const role=roleOf(c.id);if(controls&&["owner","admin","editor"].includes(role))inner.append(btn(t("Редагувати інформацію","Edit information"),"vt-business-secondary-001",()=>openEditor(c)));
  box.append(cover,inner);target.append(box);
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
  try{if(view==="overview"){
   target.append(heading(t("Бізнес-центр","Business centre"),t("Керуйте компаніями зі свого акаунта VATRA.","Manage companies from your VATRA account.")));
   showInvites(target);
   if(selected&&companies.has(selected)){target.append(companySelector());showCompany(companies.get(selected),target);const c=companies.get(selected);target.append(link(t("Відкрити сторінку компанії","Open company page"),"business?company="+encodeURIComponent(c.id),"vt-business-page-link-001"));}
   else target.append(make("p","vt-business-empty-001",t("У вас поки немає компаній. Створіть першу сторінку або прийміть запрошення.","You have no companies yet. Create your first page or accept an invitation.")));
   const list=make("div","ui-business-company-grid-001");for(const m of members.filter(x=>x.status==="active")){const c=companies.get(m.company_id);if(c)list.append(tile(c,m.role));}
   if(list.children.length)target.append(heading(t("Мої компанії","My companies")),list);
  }else if(view==="companies"){
   target.append(heading(t("Компанії VATRA","VATRA companies")));
   const filter=make("input","ui-business-directory-search-001");filter.type="search";filter.placeholder=t("Пошук компаній","Search companies");filter.setAttribute("aria-label",filter.placeholder);
   const grid=make("div","ui-business-company-grid-001");target.append(filter,grid);let ticket=0,timer;
   const load=async()=>{const ownTicket=++ticket;const term=filter.value.trim().slice(0,100).replace(/[%_]/g,"");let q=client.from("business_companies").select(fields).order("created_at",{ascending:false}).limit(50);
    if(term)q=q.ilike("name","%"+term+"%");const r=await q;if(version!==renderVersion||ownTicket!==ticket)return;grid.replaceChildren();if(r.error){grid.append(make("p","vt-business-empty-001",err));return;}for(const c of r.data||[])grid.append(tile(c,roleOf(c.id)));if(!grid.children.length)grid.append(make("p","vt-business-empty-001",t("Компаній не знайдено.","No companies found.")));
   };filter.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>void load(),250);});await load();
  }else if(view==="team"){target.append(heading(t("Команда","Team")));await team(target,version);}
  else{const item=sections.find(x=>x[0]===view);target.append(heading(item[1],moduleCopy[view]));const panel=card("ui-business-module-001");panel.append(sectionIcon(item[2]),make("h3","vt-business-panel-title-001",t("Функція в розробці","In development")),make("p","vt-business-heading-copy-001",t("Цей інструмент ще не доступний. Дані та показники не генеруються.","This tool is not available yet. No data or metrics are generated.")));target.append(panel);}}catch(_){if(version===renderVersion)target.replaceChildren(make("p","vt-business-empty-001",err));}
 }
 async function showPublic(id){
  const result=await client.from("business_companies").select(fields).eq("id",id).maybeSingle();main.replaceChildren();
  main.append(link(t("До бізнес-центру","Back to business centre"),"business","vt-business-page-link-001"));
  if(result.error){main.append(make("p","vt-business-empty-001",err));return;}
  if(!result.data){main.append(make("p","vt-business-empty-001",t("Компанію не знайдено.","Company not found.")));return;}
  showCompany(result.data,main,false);
 }
 try{await refresh();if(requested){if(uuid.test(requested))await showPublic(requested);else main.append(make("p","vt-business-empty-001",t("Компанію не знайдено.","Company not found.")));}
 else await render();}catch(_){main.replaceChildren(make("p","vt-business-empty-001",err));}
});
})();
