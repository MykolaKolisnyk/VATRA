let dialog=null;
export function clearPanel(){dialog?.close();dialog?.remove();dialog=null;}
export function openPanel(current,isCurrent,ui){
 if(dialog?.open||!isCurrent())return;
 const {root,t,node,button,icon,valid}=ui;
 const client=current.client,d=node("dialog","ui-vatra-admin-dialog-001"),header=node("header","ui-vatra-admin-header-001"),body=node("div","ui-vatra-admin-body-001"),nav=node("nav","ui-vatra-admin-nav-001"),content=node("main","ui-vatra-admin-content-001");
 dialog=d;d.setAttribute("aria-labelledby","vatra-admin-panel-title");nav.setAttribute("aria-label",t("Розділи адміністрації","Administration sections"));
 const heading=node("div","ui-vatra-admin-heading-001"),brand=node("span","ui-vatra-admin-brand-001");
 brand.append(icon());
 const headingText=node("div","ui-vatra-admin-heading-text-001"),eyebrow=node("span","vatra-admin-eyebrow-001",t("VATRA / Адміністрування","VATRA / Administration"));
 const title=node("h1","vatra-admin-title-001",t("Центр керування","Control center"));title.id="vatra-admin-panel-title";
 headingText.append(eyebrow,title);heading.append(brand,headingText);
 const owner=node("span","vatra-admin-owner-001",t("Власник · ID 1","Owner · ID 1")),close=button("vatra-admin-close-001",t("Закрити","Close"),()=>d.close());
 close.setAttribute("aria-label",t("Закрити панель адміністратора","Close administration panel"));
 const headerActions=node("div","ui-vatra-admin-header-actions-001");headerActions.append(owner,close);header.append(heading,headerActions);
 body.append(nav,content);d.append(header,body);document.body.append(d);
 let confirmationDialog=null;
 d.addEventListener("close",()=>{confirmationDialog?.close();d.remove();if(dialog===d)dialog=null;},{once:true});
 let tab="dashboard",renderEpoch=0,latestDashboard=null;
 const say=(value,bad=false)=>{if(value)window.VATRA_TOAST?.show(value,bad?"error":"success");};
 async function rpc(action,params={}){if(!isCurrent()||dialog!==d||!d.open)throw Error("Inactive admin session");const {data,error}=await client.rpc("vatra_admin_manage",{p_action:action,...params});if(error||!isCurrent()||dialog!==d||!d.open)throw error||Error("Inactive admin session");return data;}
 async function read(action,payload={}){
  if(!isCurrent()||dialog!==d||!d.open)throw Error("Inactive admin session");
  const {data,error}=await client.rpc("admin_console_read",{p_action:action,p_payload:payload});
  if(error||!isCurrent()||dialog!==d||!d.open)throw error||Error("Inactive admin session");
  return data;
 }
 const safeDate=value=>{const date=value?new Date(value):null;return date&&!Number.isNaN(date.getTime())?date.toLocaleString(document.documentElement.lang==="en"?"en-GB":"uk-UA",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";};
 const box=title=>{const el=node("section","ui-vatra-admin-box-001");el.append(node("h2","vatra-admin-box-title-001",title));return el;};
 const err=()=>say(t("Не вдалося виконати дію. Перевірте доступ і дані.","Could not complete the action. Check access and data."),true);
 const reasonField=()=>{const w=node("label","ui-vatra-admin-field-001"),i=node("textarea","ui-vatra-admin-reason-001");i.maxLength=1000;i.placeholder=t("Поясніть причину рішення (щонайменше 3 символи)","Explain the decision (at least 3 characters)");w.append(node("span","vatra-admin-label-001",t("Причина рішення","Decision reason")),i);return {w,i};};
 async function confirmDecision(action,params,label,reason){
  return new Promise(resolve=>{
   if(!isCurrent()||!d.open){resolve(false);return;}
   const modal=node("dialog","ui-vatra-admin-confirm-dialog-001");
   confirmationDialog=modal;
   modal.setAttribute("aria-label",t("Підтвердження адміністративної дії","Confirm administrative action"));
   const heading=node("h2","vatra-admin-confirm-title-001",t("Підтвердження рішення","Confirm decision"));
   const actionLine=node("p","vatra-admin-confirm-action-001",label+(params.p_id?" · ID "+params.p_id:""));
   const reasonLine=node("p","vatra-admin-confirm-reason-001",t("Причина: ","Reason: ")+reason);
   const caution=node("p","vatra-admin-confirm-caution-001",t("Ця дія буде записана в журнал. Перевірте акаунт і причину.","This action will be audited. Check the account and reason."));
   const actions=node("div","ui-vatra-admin-confirm-actions-001");
   const cancel=button("vatra-admin-secondary-001",t("Скасувати","Cancel"),()=>modal.close());
   const approve=button("vatra-admin-danger-001",t("Підтвердити","Confirm"),()=>{if(approve.disabled)return;confirmed=true;modal.close();});
   let confirmed=false,check=null;
   if(action==="block"&&params.p_id){
    const prompt=node("label","ui-vatra-admin-confirm-id-001"),input=node("input","vatra-admin-confirm-id-input-001");
    input.type="text";input.inputMode="numeric";input.autocomplete="off";input.placeholder="ID "+params.p_id;
    prompt.append(node("span","vatra-admin-confirm-hint-001",t("Введіть VATRA ID для підтвердження блокування: ","Enter the VATRA ID to confirm blocking: ")+params.p_id),input);
    approve.disabled=true;input.addEventListener("input",()=>{approve.disabled=input.value.trim()!==String(params.p_id);});
    check=prompt;
   }
   actions.append(cancel,approve);modal.append(heading,actionLine,reasonLine,caution);
   if(check)modal.append(check);
   modal.append(actions);
   modal.addEventListener("close",()=>{if(confirmationDialog===modal)confirmationDialog=null;modal.remove();resolve(confirmed);},{once:true});
   document.body.append(modal);modal.showModal();
  });
 }
 async function mutate(action,params,reason,refresh,btn,label){
  if(reason.trim().length<3){say(t("Вкажіть причину рішення.","Enter a decision reason."),true);return;}
  if(!await confirmDecision(action,params,label,reason.trim()))return;
  btn.disabled=true;
  try{
   await rpc(action,{...params,p_reason:reason.trim()});
   say(t("Рішення збережено.","Decision saved."));
   await refresh();
  }catch(_){err();}finally{btn.disabled=false;}
 }
 function actionButton(label,action,params,reason,refresh,danger=false){const b=button(danger?"vatra-admin-danger-001":"vatra-admin-primary-001",label,()=>void mutate(action,params(),reason.value,refresh,b,label));return b;}
 const symbols={
 dashboard:["M3 3h8v8H3z","M13 3h8v5h-8z","M13 10h8v11h-8z","M3 13h8v8H3z"],
 users:["M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8","M20 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75"],
 requests:["M12 2 9.4 4.5 6 4.6l-.5 3.3L3 10l1.2 3.2L3.8 17l3.4.8L9 20.8l3-1.5 3 1.5 1.8-3 3.4-.8-.4-3.8L21 10l-2.5-2.1-.5-3.3-3.4-.1z","m9 12 2 2 4-4"],
 reports:["M5 3v18","M5 4h13l-2 5 2 5H5"],
 market:["M3 10h18l-1-6H4z","M5 10v11h14V10","M9 21v-7h6v7"],
 maintenance:["M12 2v4","M12 18v4","M4.93 4.93l2.83 2.83","M16.24 16.24l2.83 2.83","M2 12h4","M18 12h4","M4.93 19.07l2.83-2.83","M16.24 7.76l2.83-2.83","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"],
 announcements:["M3 11h4l10-5v12L7 13H3z","M7 13l2 7h3l-2-6","M20 9a4 4 0 0 1 0 6"],
 analytics:["M3 3v18h18","m6-5 4-4 4 3 5-7"],
 monitor:["M2 12h4l3-7 5 14 3-7h5"],
 history:["M3 12a9 9 0 1 0 3-6.7","M3 3v5h5","M12 7v5l4 2"]
 };
 const iconFor=key=>{
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("width","19");svg.setAttribute("height","19");
  svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.75");
  svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");svg.setAttribute("aria-hidden","true");
  for(const path of symbols[key]||[]){const p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("d",path);svg.append(p);}
  return svg;
 };
 const sections=[
  {title:t("Робочий простір","Workspace"),items:[["dashboard",t("Огляд","Overview")],["users",t("Користувачі","Members")],["analytics",t("Аналітика","Analytics")]]},
  {title:t("Модерація","Moderation"),items:[["requests",t("Верифікація","Verification")],["reports",t("Скарги","Reports")],["market",t("Маркетплейс","Marketplace")]]},
  {title:t("Керування системою","Platform settings"),items:[["announcements",t("Оголошення","Announcements")],["maintenance",t("Технічні роботи","Maintenance")],["monitor",t("Моніторинг","Monitoring")],["history",t("Журнал дій","Audit log")]]}
 ];
 const navButtons=new Map();
 for(const section of sections){
  const group=node("div","ui-vatra-admin-nav-section-001");
  group.append(node("span","vatra-admin-nav-group-title-001",section.title));
  for(const [key,label] of section.items){
   const b=button("vatra-admin-nav-button-"+key,"",()=>void render(key));b.dataset.adminTab=key;
   const caption=node("span","vatra-admin-nav-button-label-001",label),count=node("span","vatra-admin-nav-count-001");
   count.hidden=true;count.setAttribute("aria-hidden","true");
   b.append(iconFor(key),caption,count);b.setAttribute("aria-pressed","false");
   navButtons.set(key,b);group.append(b);
  }
  nav.append(group);
 }
 const pageDescriptions={
  dashboard:t("Актуальний стан VATRA та завдання, які потребують уваги.","Live VATRA metrics and tasks that need attention."),
  users:t("Пошук по всій базі, фільтри, сторінки та деталі кожного акаунта.","Search all accounts, filter and review member details."),
  analytics:t("Реєстрації, публікації та активність за останні 14 днів.","Registrations, posts and activity during the past 14 days."),
  requests:t("Заявки на підтвердження профілів та видачу позначки.","Review requests for verified badges."),
  reports:t("Скарги на профілі, що очікують рішення.","Profile reports awaiting a decision."),
  market:t("Перевірка товарів, скарг та обмежень продавців.","Review listings, reports and seller restrictions."),
  announcements:t("Оновлення й нові можливості, які побачать учасники після входу.","Updates and new features shown to members after sign-in."),
  maintenance:t("Керуйте тимчасовим режимом технічних робіт.","Control temporary maintenance mode."),
  monitor:t("З’єднання з базою, сховище та системні показники.","Database connection, storage and platform diagnostics."),
  history:t("Прозора історія адміністративних рішень.","Traceable history of administrative decisions.")
 };
 const pageLabels=Object.fromEntries(sections.flatMap(group=>group.items));
 const refreshNavCounts=data=>{for(const [key,field] of [["requests","verification_pending"],["reports","reports_pending"],["market","market_pending"]]){
  const badge=navButtons.get(key)?.querySelector(".vatra-admin-nav-count-001");
  if(badge){const value=Number(data?.[field]||0);badge.hidden=value<=0;badge.textContent=String(value);}
 }};
 async function users(host,selected=""){
  const intro=node("div","ui-vatra-admin-users-intro-001");
  intro.append(node("h3","vatra-admin-section-title-001",t("Каталог користувачів","Member directory")),node("p","vatra-admin-hint-001",t("Пошук по всій базі за ім’ям або VATRA ID, фільтри та сторінки по 25 акаунтів.","Search all accounts by name or VATRA ID with filters and 25 members per page.")));
  host.append(intro);
  const searchForm=node("form","ui-vatra-admin-lookup-001"),label=node("label","ui-vatra-admin-field-001"),query=node("input","ui-vatra-admin-id-input-001");
  query.type="search";query.autocomplete="off";query.placeholder=t("Ім’я або VATRA ID","Name or VATRA ID");query.maxLength=90;query.value=selected;
  label.append(node("span","vatra-admin-label-001",t("Пошук серед усіх акаунтів","Search all accounts")),query);
  const statusFilter=node("select","ui-vatra-admin-duration-001");
  statusFilter.setAttribute("aria-label",t("Фільтр за статусом","Filter by status"));
  for(const [key,label]of [["all",t("Усі статуси","All statuses")],["active",t("Активні","Active")],["blocked",t("Заблоковані","Blocked")],["verified",t("Верифіковані","Verified")]])statusFilter.append(new Option(label,key));
  statusFilter.value="all";
  const submit=node("button","vatra-admin-primary-001",t("Знайти","Search"));submit.type="submit";
  searchForm.append(label,statusFilter,submit);host.append(searchForm);
  const result=node("div","ui-vatra-admin-member-result-001"),directory=box(t("Результати пошуку","Search results"));
  const count=node("span","vatra-admin-directory-count-001"),list=node("div","ui-vatra-admin-directory-list-001");
  const head=node("div","ui-vatra-admin-directory-heading-001");head.append(count);
  directory.append(head,list);
  const pagination=node("div","ui-vatra-admin-directory-pagination-001");
  const prev=button("vatra-admin-secondary-001",t("Попередня","Previous"),()=>{if(page>0){page--;void load();}});
  const next=button("vatra-admin-secondary-001",t("Наступна","Next"),()=>{page++;void load();});
  const pager=node("span","vatra-admin-directory-page-001");
  pagination.append(prev,pager,next);directory.append(pagination);
  host.append(result,directory);
  const states={active:t("Активний","Active"),blocked:t("Заблокований","Blocked"),deleted:t("Видалений","Deleted")};
  const statePill=value=>{const pill=node("span","vatra-admin-state-pill-001",states[value]||value||"—");pill.dataset.state=value||"active";return pill;};
  let page=0,total=0,epoch=0,memberEpoch=0,searchTimer=0,openedId="";
  async function detail(id){
   if(!valid(id)){say(t("Вкажіть правильний VATRA ID.","Enter a valid VATRA ID."),true);return;}
   openedId=String(id);
   const ticket=++memberEpoch;result.replaceChildren(node("p","vatra-admin-loading-001",t("Завантаження профілю…","Loading member…")));
   try{
    const [row,stats]=await Promise.all([rpc("lookup",{p_id:String(id)}),read("member_detail",{id:String(id)})]);
    if(ticket!==memberEpoch||!host.isConnected)return;
    if(!row){result.replaceChildren(node("p","vatra-admin-empty-001",t("Користувача не знайдено.","Member not found.")));return;}
    const card=box(row.name+" · ID "+row.vatra_id),meta=node("div","ui-vatra-admin-member-meta-001");
    const profile=node("a","vatra-admin-profile-link-001",t("Відкрити профіль","Open profile"));
    profile.href=new URL("id"+row.vatra_id,root).href;profile.target="_blank";profile.rel="noopener";
    meta.append(statePill(row.state),node("span","vatra-admin-member-date-001",t("Реєстрація: ","Registered: ")+safeDate(row.created_at)),node("span","vatra-admin-member-badge-001",row.verified?t("✓ Верифіковано","✓ Verified"):t("Без верифікації","Not verified")));
    card.append(meta,profile);
    const metrics=node("div","ui-vatra-admin-member-stats-001");
    for(const [label,value]of [
     [t("Дописи","Posts"),stats?.posts],[t("Коментарі","Comments"),stats?.comments],
     [t("Історії","Stories"),stats?.stories],[t("Скарги","Reports"),stats?.reports]]){
     const tile=node("div","ui-vatra-admin-member-stat-001");
     tile.append(node("strong","vatra-admin-member-stat-number-001",String(value??0)),node("span","vatra-admin-member-stat-label-001",label));
     metrics.append(tile);
    }
    card.append(metrics,node("p","vatra-admin-member-presence-001",t("Остання активність: ","Last activity: ")+safeDate(stats?.last_seen_at)));
    const actionsHistory=Array.isArray(stats?.recent_actions)?stats.recent_actions:[];
    if(actionsHistory.length){
     const records=node("details","ui-vatra-admin-member-history-001"),caption=node("summary","vatra-admin-member-history-title-001",t("Останні адміністративні рішення","Recent administrative decisions"));
     records.append(caption);
     for(const item of actionsHistory)records.append(node("p","vatra-admin-member-history-line-001",safeDate(item.created_at)+" · "+item.event+" · "+item.reason));
     card.append(records);
    }
    const tools=node("section","ui-vatra-admin-member-tools-001");
    tools.append(node("h3","vatra-admin-tools-title-001",t("Керування акаунтом","Account controls")),node("p","vatra-admin-hint-001",t("Рішення підтверджуються, потребують причини та записуються в журнал.","Actions require confirmation, a reason and an audit entry.")));
    const reason=reasonField(),actions=node("div","ui-vatra-admin-actions-001"),duration=node("select","ui-vatra-admin-duration-001"),durationLabel=node("label","ui-vatra-admin-field-002");
    for(const [v,label]of [["",t("Безстроково","Indefinite")],["1",t("1 день","1 day")],["7",t("7 днів","7 days")],["30",t("30 днів","30 days")],["90",t("90 днів","90 days")]])duration.append(new Option(label,v));
    durationLabel.append(node("span","vatra-admin-label-002",t("Строк блокування","Block duration")),duration);
    tools.append(reason.w);
    const refresh=async()=>{await load();await detail(id);};
    if(row.state!=="deleted"){
     if(!row.verified)actions.append(actionButton(t("Верифікувати","Verify"),"verify",()=>({p_id:id}),reason.i,refresh));
     else if(String(id)!=="1")actions.append(actionButton(t("Зняти верифікацію","Revoke verification"),"unverify",()=>({p_id:id}),reason.i,refresh,true));
     if(String(id)!=="1"){
      if(row.state==="blocked")actions.append(actionButton(t("Розблокувати","Unblock"),"unblock",()=>({p_id:id}),reason.i,refresh));
      else{tools.append(durationLabel);actions.append(actionButton(t("Заблокувати","Block"),"block",()=>({p_id:id,p_days:duration.value?Number(duration.value):null}),reason.i,refresh,true));}
     }
    }
    if(String(id)==="1")tools.append(node("p","vatra-admin-owner-note-001",t("Власника VATRA захищено від блокування.","The VATRA owner cannot be blocked.")));
    tools.append(actions);card.append(tools);result.replaceChildren(card);
    result.scrollIntoView({behavior:"smooth",block:"nearest"});
   }catch(_){if(ticket===memberEpoch&&host.isConnected){result.replaceChildren(node("p","vatra-admin-empty-001",t("Не вдалося отримати деталі акаунта.","Could not load account details.")));err();}}
  }
  async function load(){
   if(!host.isConnected)return;
   const ticket=++epoch;
   prev.disabled=true;next.disabled=true;submit.disabled=true;
   list.replaceChildren(node("p","vatra-admin-loading-001",t("Завантаження сторінки…","Loading page…")));
   try{
    const response=await read("members_page",{query:query.value.trim(),status:statusFilter.value,page});
    if(ticket!==epoch||!host.isConnected)return;
    const rows=Array.isArray(response?.items)?response.items:[];
    total=Number(response?.total||0);
    const pages=Math.max(1,Math.ceil(total/25));
    page=Math.min(page,pages-1);
    count.textContent=t("Знайдено: ","Results: ")+total+t(" · На цій сторінці: "," · On this page: ")+rows.length;
    pager.textContent=t("Сторінка ","Page ")+(page+1)+" / "+pages;
    prev.disabled=page===0;next.disabled=(page+1)>=pages;
    list.replaceChildren();
    if(!rows.length){list.append(node("p","vatra-admin-empty-001",t("За цими умовами користувачів не знайдено.","No members match these filters.")));return;}
    for(const row of rows){
     const item=button("ui-vatra-admin-directory-row-001","",()=>void detail(String(row.vatra_id)));
     const identity=node("span","ui-vatra-admin-directory-identity-001"),initial=node("span","vatra-admin-directory-avatar-001",String(row.name||"V").trim().charAt(0).toLocaleUpperCase());
     const name=node("span","vatra-admin-directory-name-001",row.name||"VATRA"),idLabel=node("span","vatra-admin-directory-id-001","ID "+row.vatra_id);
     identity.append(initial,name,idLabel);
     const badges=node("span","ui-vatra-admin-directory-badges-001");badges.append(statePill(row.state));
     if(row.verified)badges.append(node("span","vatra-admin-directory-verified-001",t("✓ Галочка","✓ Verified")));
     const date=node("span","vatra-admin-directory-date-001",safeDate(row.created_at));
     const arrow=node("span","vatra-admin-directory-arrow-001","›");arrow.setAttribute("aria-hidden","true");
     item.append(identity,badges,date,arrow);list.append(item);
    }
   }catch(_){if(ticket===epoch&&host.isConnected){list.replaceChildren(node("p","vatra-admin-empty-001",t("Не вдалося завантажити користувачів.","Could not load members.")));err();}}
   finally{if(ticket===epoch){submit.disabled=false;prev.disabled=page===0;next.disabled=(page+1)*25>=total;}}
  }
  const search=()=>{page=0;void load();};
  searchForm.addEventListener("submit",event=>{event.preventDefault();clearTimeout(searchTimer);search();});
  query.addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,350);});
  statusFilter.addEventListener("change",()=>{clearTimeout(searchTimer);search();});
  await load();
  if(selected&&valid(selected))await detail(selected);
 }
 async function marketView(host,active){
  async function authorize(){
   if(!active())return false;
   const owner=await client.rpc("vatra_admin_access");
   if(owner.error||owner.data!==true||!active())return false;
   const role=await client.from("marketplace_moderators").select("user_id").limit(1);
   return active()&&!role.error&&Boolean(role.data?.length);
  }
  const columns="id,seller_vatra_id,title,description,category,price,currency,city,image_path,image_paths,status,created_at,item_condition,listing_type,subcategory,details,moderation_status,moderation_reason,moderation_flags,rules_accepted_at";
  const labels={pending:t("На перевірці","Pending review"),approved:t("Схвалені","Approved"),rejected:t("Відхилені","Rejected"),report:t("Скарги","Reports"),appeal:t("Оскарження","Appeals"),suspensions:t("Обмежені продавці","Seller restrictions"),history:t("Історія рішень","Decision history")};
  const toolbar=box(t("Модерація маркетплейсу","Marketplace moderation")),tabs=node("div","ui-vatra-admin-market-tabs-001"),area=node("div","ui-vatra-admin-market-area-001"),nav=node("div","ui-vatra-admin-actions-001");
  toolbar.append(tabs,nav);host.append(toolbar,area);
  let kind="pending",page=0,version=0,locked=false;const buttons=new Map(),size=30;
  const current=v=>active()&&v===version;
  const empty=label=>area.replaceChildren(node("p","vatra-admin-empty-001",label));
  for(const [key,label] of Object.entries(labels)){const b=button("vatra-admin-market-tab-001",label,()=>{if(locked)return;kind=key;page=0;void refresh();});buttons.set(key,b);tabs.append(b);}
  const prev=button("vatra-admin-secondary-001",t("Назад","Previous"),()=>{if(!locked&&page){page--;void refresh();}}),next=button("vatra-admin-secondary-001",t("Далі","Next"),()=>{if(!locked){page++;void refresh();}}),indicator=node("span","vatra-admin-market-meta-001");
  nav.append(button("vatra-admin-secondary-001",t("Оновити","Refresh"),()=>{if(!locked)void refresh();}),prev,indicator,next);
  async function write(v,work){
   if(locked||!current(v))return;locked=true;
   try{
    if(!await authorize()||!current(v))throw Error("Inactive moderator");
    const result=await work();
    if(result.error||!result.data)throw result.error||Error("No affected row");
    if(current(v)){say(t("Рішення збережено.","Decision saved."));locked=false;await refresh();}
   }catch(_){if(current(v))err();}finally{locked=false;}
  }
  const text=(copy,cls="vatra-admin-market-meta-001")=>node("p",cls,copy||"");
  function listing(row,v){
   const c=box(row.title||t("Оголошення","Listing")),detail=node("div","ui-vatra-admin-market-detail-001");detail.hidden=true;
   c.append(text(["VATRA ID "+row.seller_vatra_id,[row.price,row.currency].filter(x=>x!=null).join(" "),row.city,[row.category,row.subcategory].filter(Boolean).join(" / "),labels[row.moderation_status],safeDate(row.created_at)].filter(Boolean).join(" · ")));
   const show=button("vatra-admin-secondary-001",t("Перевірити оголошення","Review listing"),async()=>{
    detail.hidden=!detail.hidden;show.setAttribute("aria-expanded",String(!detail.hidden));
    if(detail.hidden||detail.dataset.ready)return;detail.dataset.ready="true";
    const photos=node("div","ui-vatra-admin-market-photos-001"),note=text(t("Завантаження фотографій…","Loading photos…")),reason=reasonField(),check=node("input","ui-vatra-admin-market-check-001"),label=node("label","ui-vatra-admin-market-review-001"),actions=node("div","ui-vatra-admin-actions-001");
    note.setAttribute("role","status");check.type="checkbox";check.disabled=true;label.append(check,node("span","vatra-admin-market-check-copy-001",t("Перевірив назву, опис, категорію та всі фотографії.","I reviewed the title, description, category and all photos.")));
    let ready=false;const approve=button("vatra-admin-primary-001",t("Схвалити","Approve"),()=>decide("approved")),reject=button("vatra-admin-danger-001",t("Відхилити","Reject"),()=>decide("rejected"));
    function sync(){approve.disabled=!ready||!check.checked||row.moderation_status==="approved";reject.disabled=row.moderation_status==="rejected";}
    check.addEventListener("change",sync);sync();
    async function decide(state){
     if(locked||!current(v)||(state==="approved"&&(!ready||!check.checked)))return;
     const why=reason.i.value.trim();if(state==="rejected"&&why.length<3){say(t("Вкажіть причину відхилення.","Enter a rejection reason."),true);return;}
     if(!confirm(t("Підтвердити рішення щодо товару?","Confirm listing decision?")))return;
     approve.disabled=reject.disabled=true;
     await write(v,()=>client.from("marketplace_listings").update({moderation_status:state,moderation_reason:state==="rejected"?why:""}).eq("id",row.id).eq("moderation_status",row.moderation_status).select("id").maybeSingle());sync();
    }
    detail.append(text(row.description,"vatra-admin-market-description-001"),text([row.listing_type,row.item_condition,...Object.entries(row.details||{}).filter(([,x])=>typeof x==="string").map(([k,x])=>k+": "+x)].filter(Boolean).join(" · ")));
    if(row.moderation_reason)detail.append(text(row.moderation_reason));
    if(row.moderation_flags?.length)detail.append(text(t("Сигнали правил: ","Rule signals: ")+row.moderation_flags.join(", ")));
    if(!row.rules_accepted_at)detail.append(text(t("Час прийняття правил не зафіксовано.","Rules acceptance time not recorded.")));
    actions.append(approve,reject);detail.append(photos,note,label,reason.w,actions);
    const raw=[...new Set([...(Array.isArray(row.image_paths)?row.image_paths:[]),row.image_path].filter(Boolean))];
    const paths=raw.filter(p=>typeof p==="string"&&p.startsWith(String(row.seller_vatra_id)+"/")&&/^[1-9][0-9]*\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(p)).slice(0,10);
    const results=await Promise.all(paths.map(async path=>{
     const img=node("img","ui-vatra-admin-market-photo-001");img.alt=row.title||t("Фото товару","Listing photo");photos.append(img);
     try{if(!current(v))return false;const r=await client.storage.from("marketplace-images").createSignedUrl(path,900);if(r.error||!r.data?.signedUrl||!current(v))return false;img.src=r.data.signedUrl;await img.decode();return true;}catch(_){return false;}
    }));
    if(!current(v))return;ready=raw.length===paths.length&&results.every(Boolean);check.disabled=!ready;note.textContent=ready?(paths.length?t("Усі фотографії завантажено.","All photos loaded."):t("Оголошення без фотографій.","Listing has no photos.")):t("Не всі фотографії доступні. Оновіть список перед схваленням.","Some photos are unavailable. Refresh before approving.");sync();
   });show.setAttribute("aria-expanded","false");c.append(show,detail);return c;
  }
  function caseCard(row,v){
   const c=box(labels[row.kind]+" · VATRA ID "+row.seller_vatra_id),reason=reasonField(),related=node("div","ui-vatra-admin-market-detail-001"),actions=node("div","ui-vatra-admin-actions-001");
   c.append(text(row.reason,"vatra-admin-market-description-001"),text(safeDate(row.created_at)),button("vatra-admin-secondary-001",t("Переглянути товар","Review listing"),async()=>{try{if(!current(v)||!await authorize()||!current(v))return;const r=await client.from("marketplace_listings").select(columns).eq("id",row.listing_id).maybeSingle();if(!current(v))return;if(r.error)throw r.error;related.replaceChildren(r.data?listing(r.data,v):text(t("Оголошення більше недоступне.","Listing unavailable.")));}catch(_){if(current(v))err();}}),related,reason.w);
   for(const [state,caption,cls] of [["resolved",t("Вирішено","Resolved"),"vatra-admin-primary-001"],["dismissed",t("Відхилити звернення","Dismiss case"),"vatra-admin-danger-001"]])actions.append(button(cls,caption,async()=>{const why=reason.i.value.trim();if(why.length<3){say(t("Вкажіть пояснення.","Enter an explanation."),true);return;}if(!confirm(t("Підтвердити рішення?","Confirm resolution?")))return;await write(v,()=>client.from("marketplace_cases").update({state,resolution:why}).eq("id",row.id).eq("state","open").select("id").maybeSingle());}));c.append(actions);return c;
  }
  function restrictionForm(v){
   const c=box(t("Обмежити продавця","Restrict seller")),id=node("input","ui-vatra-admin-id-input-001"),reason=reasonField(),label=node("label","ui-vatra-admin-field-001");id.inputMode="numeric";id.placeholder="VATRA ID";label.append(node("span","vatra-admin-label-001","VATRA ID"),id);reason.i.maxLength=500;c.append(label,reason.w,button("vatra-admin-danger-001",t("Обмежити","Restrict"),async()=>{const value=id.value.trim(),why=reason.i.value.trim();if(!valid(value)||value==="1"||why.length<3){say(t("Перевірте ID та причину. Власника обмежити не можна.","Check ID and reason. The owner cannot be restricted."),true);return;}if(!confirm(t("Обмежити продавця?","Restrict seller?")))return;await write(v,()=>client.from("marketplace_suspensions").insert({seller_vatra_id:value,reason:why}).select("seller_vatra_id").maybeSingle());}));return c;
  }
  async function refresh(){
   const v=++version;for(const [key,b] of buttons)b.setAttribute("aria-pressed",String(key===kind));
   prev.disabled=next.disabled=true;indicator.textContent=t("Сторінка ","Page ")+(page+1);empty(t("Завантаження…","Loading…"));
   try{
    if(!await authorize()){if(current(v))empty(t("Немає доступу до модерації маркетплейсу.","Marketplace moderator access unavailable."));return;}if(!current(v))return;
    let q;
    if(kind==="report"||kind==="appeal")q=client.from("marketplace_cases").select("id,listing_id,seller_vatra_id,kind,reason,state,created_at").eq("kind",kind).eq("state","open").order("created_at",{ascending:true}).order("id");
    else if(kind==="suspensions")q=client.from("marketplace_suspensions").select("seller_vatra_id,reason").order("seller_vatra_id");
    else if(kind==="history")q=client.from("marketplace_moderation_history").select("id,listing_id,seller_vatra_id,event,reason,created_at").order("created_at",{ascending:false}).order("id");
    else q=client.from("marketplace_listings").select(columns).eq("moderation_status",kind).order("created_at",{ascending:kind==="pending"}).order("id");
    const result=await q.range(page*size,page*size+size);if(!current(v))return;if(result.error)throw result.error;
    const rows=result.data||[];area.replaceChildren();prev.disabled=page===0;next.disabled=rows.length<=size;
    if(kind==="suspensions")area.append(restrictionForm(v));
    if(!rows.length)area.append(text(t("Записів немає.","No records."),"vatra-admin-empty-001"));
    for(const row of rows.slice(0,size)){
     if(kind==="report"||kind==="appeal")area.append(caseCard(row,v));
     else if(kind==="suspensions"){const c=box("VATRA ID "+row.seller_vatra_id);c.append(text(row.reason,"vatra-admin-market-description-001"),button("vatra-admin-secondary-001",t("Зняти обмеження","Remove restriction"),async()=>{if(!confirm(t("Зняти обмеження?","Remove restriction?")))return;await write(v,()=>client.from("marketplace_suspensions").delete().eq("seller_vatra_id",row.seller_vatra_id).select("seller_vatra_id").maybeSingle());}));area.append(c);}
     else if(kind==="history"){const names={pending:labels.pending,approved:labels.approved,rejected:labels.rejected,suspended:t("Обмежено","Restricted"),unsuspended:t("Обмеження знято","Restriction removed"),report_submitted:t("Скаргу подано","Report submitted"),report_resolved:t("Скаргу вирішено","Report resolved"),report_dismissed:t("Скаргу відхилено","Report dismissed"),appeal_submitted:t("Оскарження подано","Appeal submitted"),appeal_resolved:t("Оскарження вирішено","Appeal resolved"),appeal_dismissed:t("Оскарження відхилено","Appeal dismissed")};const c=box((names[row.event]||row.event)+" · VATRA ID "+row.seller_vatra_id);c.append(text(row.reason,"vatra-admin-market-description-001"),text(safeDate(row.created_at)));area.append(c);}
     else area.append(listing(row,v));
    }
   }catch(_){if(current(v)){empty(t("Не вдалося завантажити дані.","Could not load data."));err();}}
  }
  await refresh();
 }

 async function announcementPanel(host,active){
  const form=box(t("Нове оголошення VATRA","New VATRA announcement")),fields=node("form","ui-vatra-admin-announcement-form-001");
  const intro=node("p","vatra-admin-announcement-intro-001",t("Оголошення показується один раз кожному користувачу після входу. Не відображається на сторінках авторизації.","Each announcement appears once per member after sign-in, never on authentication pages."));
  form.append(intro,fields);host.append(form);
  const createField=(tag,cls,label,max,required=true)=>{
   const wrap=node("label","ui-vatra-admin-announcement-field-001"),element=node(tag,cls),name=node("span","vatra-admin-announcement-label-001",label);
   element.maxLength=max;element.required=required;
   if(tag==="textarea"){element.rows=3;}else element.type="text";
   wrap.append(name,element);fields.append(wrap);return element;
  };
  const titleUk=createField("input","vatra-admin-announcement-title-uk-001",t("Заголовок українською","Ukrainian title"),110);
  const titleEn=createField("input","vatra-admin-announcement-title-en-001",t("Заголовок англійською","English title"),110);
  const bodyUk=createField("textarea","vatra-admin-announcement-body-uk-001",t("Опис українською","Ukrainian description"),360);
  const bodyEn=createField("textarea","vatra-admin-announcement-body-en-001",t("Опис англійською","English description"),360);
  const path=createField("input","vatra-admin-announcement-path-001",t("Внутрішній шлях (необов'язково), наприклад feed або profile","Internal path (optional), e.g. feed or profile"),200,false);
  const schedule=node("div","ui-vatra-admin-announcement-schedule-001"),startsLabel=node("label","ui-vatra-admin-announcement-field-001"),endsLabel=node("label","ui-vatra-admin-announcement-field-001");
  const starts=node("input","vatra-admin-announcement-starts-001"),ends=node("input","vatra-admin-announcement-ends-001");
  starts.type="datetime-local";ends.type="datetime-local";
  startsLabel.append(node("span","vatra-admin-announcement-label-001",t("Початок показу (порожньо = зараз)","Start time (empty = now)")),starts);
  endsLabel.append(node("span","vatra-admin-announcement-label-001",t("Кінець показу (необов’язково)","End time (optional)")),ends);
  schedule.append(startsLabel,endsLabel);fields.append(schedule);
  const publish=node("label","ui-vatra-admin-announcement-publish-001"),enabled=node("input","vatra-admin-announcement-enabled-001");
  enabled.type="checkbox";publish.append(enabled,node("span","vatra-admin-announcement-publish-copy-001",t("Опублікувати для користувачів","Publish to members")));fields.append(publish);
  const actions=node("div","ui-vatra-admin-actions-001"),save=node("button","vatra-admin-primary-001",t("Створити оголошення","Create announcement"));
  save.type="submit";
  const cancel=button("vatra-admin-secondary-001",t("Скасувати редагування","Cancel editing"),reset);
  cancel.hidden=true;actions.append(save,cancel);fields.append(actions);
  const list=node("div","ui-vatra-admin-announcement-list-001");host.append(list);
  let editing=null,busy=false;
  function reset(){editing=null;fields.reset();starts.value="";ends.value="";cancel.hidden=true;save.textContent=t("Створити оголошення","Create announcement");}
  const localInput=value=>{if(!value)return "";const date=new Date(value);if(Number.isNaN(date.getTime()))return "";return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  const validPath=value=>!value||(/^[A-Za-z0-9][A-Za-z0-9/_?&=.#%-]*$/.test(value)&&!value.includes(".."));
  async function refresh(){
   if(!active())return;
   const {data,error}=await client.from("announcements").select("id,title_uk,title_en,body_uk,body_en,target_path,active,starts_at,ends_at,created_at").order("created_at",{ascending:false}).limit(60);
   if(error)throw error;
   if(!active())return;
   list.replaceChildren();
   if(!data?.length){list.append(node("p","vatra-admin-empty-001",t("Оголошень ще немає.","No announcements yet.")));return;}
   for(const row of data){
    const card=box(document.documentElement.lang==="en"?row.title_en:row.title_uk);
    const now=Date.now(),future=row.starts_at&&Date.parse(row.starts_at)>now,expired=row.ends_at&&Date.parse(row.ends_at)<=now;
    const stateLabel=!row.active?t("Вимкнене","Inactive"):future?t("Заплановано","Scheduled"):expired?t("Завершено","Finished"):t("Активне","Active");
    const state=node("p","vatra-admin-announcement-state-001",stateLabel);
    state.dataset.active=String(row.active);
    const copy=node("p","vatra-admin-announcement-body-001",document.documentElement.lang==="en"?row.body_en:row.body_uk);
    const date=node("p","vatra-admin-announcement-date-001",safeDate(row.created_at));
    card.append(state,copy,date);
    if(row.starts_at)card.append(node("p","vatra-admin-announcement-date-001",t("Початок: ","Starts: ")+safeDate(row.starts_at)));
    if(row.ends_at)card.append(node("p","vatra-admin-announcement-date-001",t("Кінець: ","Ends: ")+safeDate(row.ends_at)));
    if(row.target_path)card.append(node("p","vatra-admin-announcement-link-001",row.target_path));
    const buttons=node("div","ui-vatra-admin-actions-001");
    buttons.append(button("vatra-admin-secondary-001",t("Попередній перегляд","Preview"),()=>{
     const title=document.documentElement.lang==="en"?row.title_en:row.title_uk;
     const message=document.documentElement.lang==="en"?row.body_en:row.body_uk;
     window.VATRA_TOAST?.show(message,"new",{title,duration:6000});
    }));
    buttons.append(button("vatra-admin-secondary-001",t("Редагувати","Edit"),()=>{
     editing=row.id;titleUk.value=row.title_uk;titleEn.value=row.title_en;bodyUk.value=row.body_uk;bodyEn.value=row.body_en;path.value=row.target_path||"";enabled.checked=row.active;starts.value=localInput(row.starts_at);ends.value=localInput(row.ends_at);
     cancel.hidden=false;save.textContent=t("Зберегти зміни","Save changes");titleUk.focus();
    }));
    const toggle=button("vatra-admin-secondary-001",row.active?t("Вимкнути","Deactivate"):t("Опублікувати","Publish"),async()=>{
     if(busy||!active()||!confirm(row.active?t("Приховати оголошення?","Unpublish this announcement?"):t("Показати оголошення користувачам?","Show this announcement to members?")))return;
     busy=true;toggle.disabled=true;
     try{
      const {data,error}=await client.from("announcements").update({active:!row.active}).eq("id",row.id).select("id").single();
      if(error||!data)throw error||Error("Update not applied");
      if(active()){say(t("Стан оголошення оновлено.","Announcement status updated."));await refresh();}
     }catch(_){if(active())err();}finally{busy=false;toggle.disabled=false;}
    });
    buttons.append(toggle);
    const remove=button("vatra-admin-danger-001",t("Видалити","Delete"),async()=>{
     if(busy||!active()||!confirm(t("Назавжди видалити оголошення?","Permanently delete this announcement?")))return;
     busy=true;remove.disabled=true;
     try{
      const {data,error}=await client.from("announcements").delete().eq("id",row.id).select("id").single();
      if(error||!data)throw error||Error("Delete not applied");
      if(editing===row.id)reset();
      if(active()){say(t("Оголошення видалено.","Announcement deleted."));await refresh();}
     }catch(_){if(active())err();}finally{busy=false;remove.disabled=false;}
    });
    buttons.append(remove);card.append(buttons);list.append(card);
   }
  }
  fields.addEventListener("submit",async event=>{
   event.preventDefault();
   if(busy||!active())return;
   const target=path.value.trim();
   if(!validPath(target)){say(t("Посилання має бути внутрішнім шляхом VATRA без .. і протоколу.","Use an internal VATRA path without .. or a protocol."),true);return;}
   const startTime=starts.value?new Date(starts.value):new Date(),endTime=ends.value?new Date(ends.value):null;
   if(Number.isNaN(startTime.getTime())||(endTime&&Number.isNaN(endTime.getTime()))||(endTime&&endTime<=startTime)){
    say(t("Перевірте дати: кінець показу має бути пізніше початку.","Check dates: the end must be after the start."),true);starts.focus();return;
   }
   const payload={title_uk:titleUk.value.trim(),title_en:titleEn.value.trim(),body_uk:bodyUk.value.trim(),body_en:bodyEn.value.trim(),target_path:target||null,active:enabled.checked,starts_at:startTime.toISOString(),ends_at:endTime?endTime.toISOString():null};
   if(Object.values(payload).some(v=>typeof v==="string"&&v.length===0)){say(t("Заповніть усі назви й описи двома мовами.","Complete both language titles and descriptions."),true);return;}
   busy=true;save.disabled=true;
   try{
    const query=editing?client.from("announcements").update(payload).eq("id",editing):client.from("announcements").insert(payload);
    const {data,error}=await query.select("id").single();
    if(error||!data)throw error||Error("Write not applied");
    if(active()){say(editing?t("Оголошення оновлено.","Announcement updated."):t("Оголошення створено.","Announcement created."));reset();await refresh();}
   }catch(_){if(active())err();}finally{busy=false;save.disabled=false;}
  });
  try{await refresh();}catch(_){if(active())err();}
 }
 async function analyticsView(host){
  const data=await read("analytics");
  if(!host.isConnected)return;
  const daily=Array.isArray(data?.daily)?data.daily:[];
  const grid=node("div","ui-vatra-admin-analytics-cards-001");
  for(const [label,value,description] of [
   [t("Заходили за 24 години","Seen in 24 hours"),data?.active_24h,t("Зафіксовано останню активність","Based on recorded presence")],
   [t("Заходили за 7 днів","Seen in 7 days"),data?.active_7d,t("Унікальні профілі з активністю","Unique profiles with presence")],
   [t("Дописи за 7 днів","Posts in 7 days"),data?.posts_7d,t("Створені дописи","Created posts")],
   [t("Коментарі за 7 днів","Comments in 7 days"),data?.comments_7d,t("Створені коментарі","Created comments")]
  ]){
   const c=node("article","ui-vatra-admin-analytics-stat-001");
   c.append(node("span","vatra-admin-analytics-stat-label-001",label),node("strong","vatra-admin-analytics-stat-number-001",Number(value||0).toLocaleString(document.documentElement.lang==="en"?"en-GB":"uk-UA")),node("span","vatra-admin-analytics-stat-note-001",description));
   grid.append(c);
  }
  host.append(grid);
  const panel=box(t("Динаміка за 14 днів","14-day activity"));
  const legend=node("div","ui-vatra-admin-chart-legend-001");
  for(const [key,label]of [["signups",t("Реєстрації","Registrations")],["posts",t("Дописи","Posts")],["comments",t("Коментарі","Comments")]]){
   const item=node("span","vatra-admin-chart-legend-item-001",label);item.dataset.series=key;legend.append(item);
  }
  panel.append(legend);
  if(!daily.length){panel.append(node("p","vatra-admin-empty-001",t("Поки немає даних для графіка.","Chart data is not available.")));host.append(panel);return;}
  const peak=Math.max(1,...daily.flatMap(row=>["signups","posts","comments"].map(k=>Number(row[k]||0))));
  const chart=node("div","ui-vatra-admin-chart-001");
  chart.setAttribute("role","img");chart.setAttribute("aria-label",t("Кількість реєстрацій, дописів та коментарів за останні 14 днів","Daily registrations, posts and comments over 14 days"));
  for(const row of daily){
   const col=node("div","ui-vatra-admin-chart-day-001"),bars=node("div","ui-vatra-admin-chart-bars-001");
   for(const key of ["signups","posts","comments"]){
    const value=Math.max(0,Number(row[key]||0)),bar=node("span","vatra-admin-chart-bar-001");
    bar.dataset.series=key;bar.style.height=(value===0?2:Math.max(4,Math.round(100*value/peak)))+"%";
    bar.title=String(row.date)+" · "+key+": "+value;bars.append(bar);
   }
   const date=new Date(row.date+"T12:00:00Z");
   col.append(bars,node("span","vatra-admin-chart-date-001",date.toLocaleDateString(document.documentElement.lang==="en"?"en-GB":"uk-UA",{day:"2-digit",month:"2-digit"})));chart.append(col);
  }
  panel.append(chart,node("p","vatra-admin-hint-001",t("Дані згруповано за датами України. Активність означає останню зафіксовану появу, а не одночасний онлайн.","Dates use the Kyiv timezone. Presence records recent activity, not concurrent online users.")));
  host.append(panel);
 }
 async function monitorView(host){
  const started=performance.now();
  const health=await read("health");
  if(!host.isConnected)return;
  const elapsed=Math.max(0,Math.round(performance.now()-started));
  const state=node("div","ui-vatra-admin-monitor-status-001");
  state.append(node("span","vatra-admin-monitor-dot-001"),node("strong","vatra-admin-monitor-headline-001",t("База даних відповідає","Database is responding")),node("span","vatra-admin-monitor-time-001",t("Перевірено: ","Checked: ")+safeDate(health?.checked_at)));
  host.append(state);
  const metrics=node("div","ui-vatra-admin-analytics-cards-001");
  const mb=health?.database_size_bytes==null?"—":(Number(health.database_size_bytes)/1048576).toFixed(1)+" MB";
  for(const [label,value]of [
   [t("Відповідь RPC","RPC round trip"),elapsed+" мс"],
   [t("З’єднання з БД","DB connections"),String(health?.db_connections??"—")],
   [t("Розмір БД","Database size"),mb],
   [t("Адміндії за 24 год","Admin actions, 24h"),String(health?.audit_24h??0)]
  ]){const card=node("article","ui-vatra-admin-analytics-stat-001");card.append(node("span","vatra-admin-analytics-stat-label-001",label),node("strong","vatra-admin-analytics-stat-number-001",value));metrics.append(card);}
  host.append(metrics);
  const storage=box(t("Налаштування сховища","Storage configuration"));
  const buckets=Array.isArray(health?.storage_buckets)?health.storage_buckets:[];
  const units=t("Ліміт одного файлу","Per-file limit");
  if(buckets.length){for(const bucket of buckets){
   const row=node("div","ui-vatra-admin-monitor-row-001");
   row.append(node("strong","vatra-admin-monitor-row-name-001",bucket.name),node("span","vatra-admin-monitor-row-value-001",units+": "+(bucket.limit_bytes==null?t("Не встановлено","Unspecified"):Math.round(Number(bucket.limit_bytes)/1048576)+" MB")));
   storage.append(row);
  }}else storage.append(node("p","vatra-admin-empty-001",t("Не вдалося отримати ліміти сховища.","Storage limits are not available.")));
  const safeguards=box(t("Стан адміністрування","Administration status"));
  safeguards.append(
   node("p","vatra-admin-monitor-info-001",t("Доступ до діагностики перевіряється сервером за ID власника. Дії модерації записуються до журналу.","Access is verified by the server for the owner. Moderation actions are audited.")),
   node("p","vatra-admin-monitor-info-001",t("Режим технічних робіт: ","Maintenance mode: ")+(health?.maintenance?t("увімкнено","enabled"):t("вимкнено","disabled"))),
   node("p","vatra-admin-monitor-info-001",t("Відкриті скарги: ","Open profile reports: ")+String(health?.moderation_pending??0)),
   node("p","vatra-admin-monitor-limitation-001",t("Ця діагностика не є системою збору браузерних помилок чи перевіркою доступності всіх зовнішніх сервісів. Такі події тут не відстежуються.","These checks do not collect browser errors or prove the availability of all external services.")));
  host.append(storage,safeguards);
 }
 async function moderationView(host,key,active){
  const tabs=node("div","ui-vatra-admin-filter-tabs-001"),area=node("div","ui-vatra-admin-moderation-list-001");
  host.append(tabs,area);
  let mode="pending",epoch=0;
  const buttons=new Map();
  for(const [value,label]of [["pending",t("Очікують рішення","Pending")],["resolved",t("Історія рішень","Decision history")]]){
   const tabButton=button("vatra-admin-filter-tab-001",label,()=>{mode=value;void reload();});tabButton.dataset.adminMode=value;
   buttons.set(value,tabButton);tabs.append(tabButton);
  }
  async function reload(){
   if(!active())return;
   const ticket=++epoch;
   for(const [value,btn]of buttons)btn.setAttribute("aria-pressed",String(value===mode));
   area.replaceChildren(node("p","vatra-admin-loading-001",t("Завантаження заявок…","Loading cases…")));
   try{
    const rows=mode==="pending"?await rpc(key):await read(key==="requests"?"requests_history":"reports_history");
    if(!active()||ticket!==epoch)return;
    area.replaceChildren();
    if(!Array.isArray(rows)||!rows.length){area.append(node("p","vatra-admin-empty-001",mode==="pending"?t("Зараз немає відкритих звернень.","No open cases right now."):t("Історія рішень поки порожня.","No past decisions yet.")));return;}
    for(const row of rows){
     const id=String(row.vatra_id??row.target_vatra_id),label=key==="requests"?(row.display_name||"VATRA"):t("Скарга на профіль","Profile report");
     const card=box(label+" · ID "+id),top=node("div","ui-vatra-admin-case-meta-001");
     const statusText=mode==="pending"?t("На перевірці","Pending"):key==="requests"?(row.status==="approved"?t("Схвалено","Approved"):t("Відхилено","Rejected")):t("Закрито","Resolved");
     const badge=node("span","vatra-admin-case-status-001",statusText);badge.dataset.pending=String(mode==="pending");
     top.append(badge,node("span","vatra-admin-request-date-001",safeDate(row.created_at)));card.append(top);
     const bodyText=[row.category,row.reason,row.details].filter(Boolean).join("\n");
     if(bodyText)card.append(node("p","vatra-admin-request-copy-001",bodyText));
     if(mode==="resolved"){
      if(row.admin_resolution)card.append(node("p","vatra-admin-case-resolution-001",t("Рішення: ","Decision: ")+row.admin_resolution));
      if(row.admin_resolved_at)card.append(node("p","vatra-admin-request-date-001",t("Закрито: ","Resolved: ")+safeDate(row.admin_resolved_at)));
     }
     const actions=node("div","ui-vatra-admin-actions-001");
     actions.append(button("vatra-admin-secondary-001",t("Картка акаунта","Member profile"),()=>void render("users",id)));
     if(mode==="pending"){
      const reason=reasonField();
      card.append(reason.w);
      const refresh=()=>reload();
      if(key==="requests"){
       actions.append(actionButton(t("Схвалити","Approve"),"verify",()=>({p_id:id}),reason.i,refresh),
        actionButton(t("Відхилити","Reject"),"reject_verification",()=>({p_id:id}),reason.i,refresh,true));
      }else actions.append(actionButton(t("Закрити скаргу","Resolve report"),"resolve_report",()=>({p_report:row.id}),reason.i,refresh));
     }
     card.append(actions);area.append(card);
    }
   }catch(_){if(active()&&ticket===epoch){area.replaceChildren(node("p","vatra-admin-empty-001",t("Дані модерації недоступні.","Moderation data is unavailable.")));err();}}
  }
  await reload();
 }
 async function auditView(host,active){
  const panel=box(t("Рішення адміністратора","Administration history"));
  const controls=node("div","ui-vatra-admin-audit-controls-001");
  const selection=node("select","ui-vatra-admin-duration-001");
  selection.setAttribute("aria-label",t("Тип адміністративної дії","Administration action type"));
  const labels={all:t("Усі дії","All actions"),verify:t("Верифікація","Grant badge"),unverify:t("Скасування верифікації","Revoke badge"),block:t("Блокування","Block"),unblock:t("Розблокування","Unblock"),reject_verification:t("Відхилення заявки","Reject request"),resolve_report:t("Закриття скарги","Resolve report")};
  for(const [key,label]of Object.entries(labels))selection.append(new Option(label,key));
  selection.value="all";controls.append(selection);panel.append(controls);
  const list=node("div","ui-vatra-admin-audit-list-001"),pagination=node("div","ui-vatra-admin-directory-pagination-001");
  const prev=button("vatra-admin-secondary-001",t("Назад","Previous"),()=>{if(page>0){page--;void load();}});
  const next=button("vatra-admin-secondary-001",t("Далі","Next"),()=>{page++;void load();});
  const note=node("span","vatra-admin-directory-page-001");
  pagination.append(prev,note,next);panel.append(list,pagination);host.append(panel);
  let page=0,epoch=0;
  async function load(){
   if(!active())return;const ticket=++epoch;
   prev.disabled=true;next.disabled=true;
   list.replaceChildren(node("p","vatra-admin-loading-001",t("Завантаження журналу…","Loading audit log…")));
   try{
    const res=await read("audit_page",{page,event:selection.value});
    if(!active()||epoch!==ticket)return;
    const rows=Array.isArray(res?.items)?res.items:[],total=Number(res?.total||0),pages=Math.max(1,Math.ceil(total/25));
    note.textContent=t("Сторінка ","Page ")+(page+1)+" / "+pages+t(" · Записів: "," · Entries: ")+total;
    prev.disabled=page===0;next.disabled=(page+1)>=pages;
    list.replaceChildren();
    if(!rows.length){list.append(node("p","vatra-admin-empty-001",t("Записів не знайдено.","No entries found.")));return;}
    for(const item of rows){
     const entry=node("div","ui-vatra-admin-audit-entry-001"),text=node("div","ui-vatra-admin-audit-copy-001");
     text.append(node("strong","vatra-admin-audit-event-001",labels[item.event]||item.event),node("span","vatra-admin-audit-reason-001",item.reason));
     const meta=node("div","ui-vatra-admin-audit-meta-001");
     meta.append(node("time","vatra-admin-audit-date-001",safeDate(item.created_at)));
     if(item.target_vatra_id){const open=button("vatra-admin-secondary-001","ID "+item.target_vatra_id,()=>void render("users",String(item.target_vatra_id)));meta.append(open);}
     entry.append(text,meta);list.append(entry);
    }
   }catch(_){if(active()&&epoch===ticket){list.replaceChildren(node("p","vatra-admin-empty-001",t("Журнал тимчасово недоступний.","Audit log is unavailable.")));err();}}
  }
  selection.addEventListener("change",()=>{page=0;void load();});await load();
 }
 async function render(key,selected=""){
  if(!Object.hasOwn(pageLabels,key))return;
  tab=key;const stamp=++renderEpoch;
  for(const [id,b] of navButtons)b.setAttribute("aria-pressed",String(id===key));
  content.replaceChildren();body.scrollTop=0;
  const toolbar=node("div","ui-vatra-admin-page-header-001"),heading=node("div","ui-vatra-admin-page-heading-001");
  heading.append(node("h2","vatra-admin-page-title-001",pageLabels[key]),node("p","vatra-admin-page-description-001",pageDescriptions[key]));
  const reload=button("vatra-admin-refresh-001","",()=>void render(key,selected));
  reload.append(iconFor("history"),node("span","vatra-admin-refresh-label-001",t("Оновити","Refresh")));
  toolbar.append(heading,reload);content.append(toolbar);
  const host=node("div","ui-vatra-admin-view-001");content.append(host);
  host.append(node("p","vatra-admin-loading-001",t("Завантаження даних…","Loading data…")));
  if(key!=="dashboard")host.replaceChildren();
  try{
   if(key==="dashboard"){
    const data=await rpc("dashboard");if(stamp!==renderEpoch)return;
    latestDashboard=data;refreshNavCounts(data);
    host.replaceChildren();
    const pendingTotal=Number(data?.verification_pending||0)+Number(data?.reports_pending||0)+Number(data?.market_pending||0);
    const strip=node("div","ui-vatra-admin-overview-status-001");
    const freshness=node("span","vatra-admin-overview-freshness-001",t("Оновлено: ","Updated: ")+new Date().toLocaleTimeString(document.documentElement.lang==="en"?"en-GB":"uk-UA",{hour:"2-digit",minute:"2-digit"}));
    const queueNote=node("span","vatra-admin-overview-queue-note-001",pendingTotal?t("Потребують розгляду: ","Awaiting review: ")+pendingTotal:t("Усі черги опрацьовано","All moderation queues are clear"));
    queueNote.dataset.pending=String(pendingTotal>0);
    strip.append(freshness,queueNote);host.append(strip);
    const grid=node("div","ui-vatra-admin-stats-001");
    const metrics=[
     ["accounts",t("Користувачі","Members"),"users",t("Зареєстровані акаунти","Registered accounts")],
     ["verified",t("Верифіковані","Verified"),"requests",t("З підтвердженою позначкою","Members with a verified badge")],
     ["posts",t("Публікації","Posts"),"dashboard",t("Створені дописи","Published posts")],
     ["communities",t("Спільноти","Communities"),"dashboard",t("Створені спільноти","Created communities")]
    ];
    for(const [field,label,target,note] of metrics){
     const tile=target==="dashboard"?node("div","ui-vatra-admin-stat-001"):button("ui-vatra-admin-stat-001","",()=>void render(target));
     tile.dataset.tone=field;
     const top=node("span","ui-vatra-admin-stat-top-001");
     top.append(iconFor(target==="dashboard"?"dashboard":target),node("span","vatra-admin-stat-label-001",label));
     tile.append(top,node("strong","vatra-admin-stat-number-001",Number(data?.[field]||0).toLocaleString(document.documentElement.lang==="en"?"en-GB":"uk-UA")),node("span","vatra-admin-stat-note-001",note));
     if(target!=="dashboard"){const arrow=node("span","vatra-admin-stat-arrow-001","↗");arrow.setAttribute("aria-hidden","true");tile.append(arrow);}
     grid.append(tile);
    }
    host.append(grid);
    const two=node("div","ui-vatra-admin-overview-columns-001");
    const tasks=box(t("Потребує уваги","Needs attention"));
    const tasksHeader=node("div","ui-vatra-admin-box-toolbar-001");
    tasksHeader.append(node("span","vatra-admin-queue-summary-001",pendingTotal?t("Очікує рішення: ","Open cases: ")+pendingTotal:t("Нових звернень немає","Nothing pending")));
    tasks.append(tasksHeader);
    for(const [field,label,description,target] of [
     ["verification_pending",t("Заявки на верифікацію","Verification requests"),t("Перевірити профілі й ухвалити рішення","Review profiles and decide"),"requests"],
     ["reports_pending",t("Скарги на профілі","Profile reports"),t("Опрацювати скарги користувачів","Handle member reports"),"reports"],
     ["market_pending",t("Товари на модерації","Listings awaiting review"),t("Перевірити товари маркетплейсу","Review marketplace listings"),"market"]
    ]){
     const item=button("ui-vatra-admin-queue-row-001","",()=>void render(target));
     const textWrap=node("span","ui-vatra-admin-queue-info-001");
     textWrap.append(node("strong","vatra-admin-queue-title-001",label),node("span","vatra-admin-queue-description-001",description));
     const number=node("strong","vatra-admin-queue-number-001",String(data?.[field]??0));
     if(Number(data?.[field])>0)number.dataset.attention="true";
     item.append(textWrap,number);tasks.append(item);
    }
    const tools=box(t("Швидкі дії","Quick actions"));
    const shortcutGrid=node("div","ui-vatra-admin-shortcut-grid-001");tools.append(shortcutGrid);
    for(const [label,description,target,iconKey] of [
     [t("Знайти користувача","Find a member"),t("Переглянути профіль, статус або доступ","View profile, status and access"),"users","users"],
     [t("Нове оголошення","New announcement"),t("Повідомити про оновлення VATRA","Share a VATRA update"),"announcements","announcements"],
     [t("Технічні роботи","Maintenance"),t("Увімкнути або вимкнути режим","Enable or disable the mode"),"maintenance","maintenance"],
     [t("Журнал рішень","Audit log"),t("Перевірити останні дії","Review previous decisions"),"history","history"]
    ]){
     const item=button("ui-vatra-admin-shortcut-001","",()=>void render(target));
     const symbol=node("span","vatra-admin-shortcut-icon-001");symbol.append(iconFor(iconKey));
     const copy=node("span","ui-vatra-admin-shortcut-copy-001");
     copy.append(node("strong","vatra-admin-shortcut-title-001",label),node("span","vatra-admin-shortcut-note-001",description));
     const arrow=node("span","vatra-admin-shortcut-arrow-001","›");arrow.setAttribute("aria-hidden","true");
     item.append(symbol,copy,arrow);shortcutGrid.append(item);
    }
    two.append(tasks,tools);host.append(two);
   }
 else if(key==="users")await users(host,selected);
 else if(key==="analytics")await analyticsView(host);
 else if(key==="requests"||key==="reports")await moderationView(host,key,()=>isCurrent()&&dialog===d&&d.open&&stamp===renderEpoch);
 else if(key==="market")await marketView(host,()=>isCurrent()&&dialog===d&&d.open&&stamp===renderEpoch);
 else if(key==="announcements")await announcementPanel(host,()=>isCurrent()&&dialog===d&&d.open&&stamp===renderEpoch);
 else if(key==="maintenance"){
  const c=box(t("Технічні роботи","Maintenance"));
  c.append(node("p","vatra-admin-maintenance-copy-001",t("Увімкнення тимчасово перенаправляє відвідувачів на сторінку технічних робіт. Доступ адміністратора зберігається.","Enabling redirects visitors to the maintenance page temporarily. Administrator access is retained.")));
  const state=node("p","vatra-admin-maintenance-state-001",t("Перевірка стану…","Checking status…"));state.setAttribute("role","status");c.append(state);
  const actions=node("div","ui-vatra-admin-actions-001"),toggle=button("vatra-admin-primary-001","",async()=>{
   if(toggle.disabled||!isCurrent()||dialog!==d||!d.open)return;
   const next=!enabled;
   if(!confirm(next?t("Увімкнути технічні роботи для відвідувачів VATRA?","Enable maintenance for VATRA visitors?"):t("Вимкнути технічні роботи?","Disable maintenance?")))return;
   toggle.disabled=true;
   try{
    const result=await client.from("site_maintenance").update({enabled:next}).eq("id",1).select("enabled").single();
    if(result.error||result.data?.enabled!==next)throw result.error||Error("Maintenance not changed");
    if(!isCurrent()||!toggle.isConnected)return;
    enabled=next;paint();say(t("Режим оновлено.","Maintenance status updated."));window.dispatchEvent(new Event("vatra-maintenance-changed"));
   }catch(_){err();}finally{toggle.disabled=false;}
  });toggle.disabled=true;
  const preview=node("a","vatra-admin-profile-link-001",t("Переглянути сторінку","Preview page"));preview.href=new URL("maintenance.html?preview=1",root).href;preview.target="_blank";preview.rel="noopener";
  actions.append(toggle,preview);c.append(actions);host.append(c);
  let enabled=false;
  function paint(){state.textContent=enabled?t("Стан: увімкнено","Status: enabled"):t("Стан: вимкнено","Status: disabled");toggle.textContent=enabled?t("Вимкнути технічні роботи","Disable maintenance"):t("Увімкнути технічні роботи","Enable maintenance");}
  const result=await client.from("site_maintenance").select("enabled").eq("id",1).single();
  if(result.error||typeof result.data?.enabled!=="boolean")throw result.error||Error("Missing status");
  if(stamp!==renderEpoch)return;
  enabled=result.data.enabled;paint();toggle.disabled=false;
 }
 else if(key==="monitor")await monitorView(host);
 else if(key==="history")await auditView(host,()=>isCurrent()&&dialog===d&&d.open&&stamp===renderEpoch);
 }catch(_){if(stamp===renderEpoch){host.replaceChildren(node("p","vatra-admin-empty-001",t("Не вдалося завантажити розділ. Перевірте з’єднання і натисніть «Оновити».","Could not load this section. Check your connection and select Refresh.")));err();}}}
 d.showModal();void render("dashboard");
}
