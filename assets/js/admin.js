let dialog=null;
export function clearPanel(){dialog?.close();dialog?.remove();dialog=null;}
export function openPanel(current,isCurrent,ui){
 if(dialog?.open||!isCurrent())return;
 const {root,t,node,button,icon,valid}=ui;
 const client=current.client,d=node("dialog","ui-vatra-admin-dialog-001"),header=node("header","ui-vatra-admin-header-001"),body=node("div","ui-vatra-admin-body-001"),nav=node("nav","ui-vatra-admin-nav-001"),content=node("main","ui-vatra-admin-content-001"),status=node("p","vatra-admin-status-001");dialog=d;d.setAttribute("aria-label","ADMIN PANEL");status.setAttribute("role","status");
 const heading=node("div","ui-vatra-admin-heading-001");heading.append(icon(),node("h1","vatra-admin-title-001","ADMIN PANEL"),node("span","vatra-admin-owner-001","VATRA ID 1"));header.append(heading,button("vatra-admin-close-001",t("Закрити","Close"),()=>d.close()));body.append(nav,content);d.append(header,status,body);document.body.append(d);
 d.addEventListener("close",()=>{d.remove();if(dialog===d)dialog=null;},{once:true});
 let tab="dashboard",renderEpoch=0;
 const say=(s,bad=false)=>{status.textContent=s;status.dataset.error=String(bad);};
 async function rpc(action,params={}){if(!isCurrent()||dialog!==d||!d.open)throw Error("Inactive admin session");const {data,error}=await client.rpc("vatra_admin_manage",{p_action:action,...params});if(error||!isCurrent()||dialog!==d||!d.open)throw error||Error("Inactive admin session");return data;}
 const safeDate=v=>v?new Date(v).toLocaleString():"—";
 const box=(title)=>{const el=node("section","ui-vatra-admin-box-001");el.append(node("h2","vatra-admin-box-title-001",title));return el;};
 const err=()=>say(t("Не вдалося виконати дію. Перевірте доступ і дані.","Could not complete the action. Check access and data."),true);
 const reasonField=()=>{const w=node("label","ui-vatra-admin-field-001"),i=node("textarea","ui-vatra-admin-reason-001");i.maxLength=1000;i.placeholder=t("Причина рішення (не менше 3 символів)","Decision reason (at least 3 characters)");w.append(node("span","vatra-admin-label-001",t("Причина","Reason")),i);return {w,i};};
 async function mutate(action,params,reason,refresh,btn){if(reason.trim().length<3){say(t("Вкажіть причину рішення.","Enter a decision reason."),true);return;}if(!confirm(t("Підтвердити адміністративну дію?","Confirm this administrative action?")))return;btn.disabled=true;try{await rpc(action,{...params,p_reason:reason.trim()});say(t("Рішення збережено.","Decision saved."));await refresh();}catch(_){err();}finally{btn.disabled=false;}}
 function actionButton(label,action,params,reason,refresh,danger=false){const b=button(danger?"vatra-admin-danger-001":"vatra-admin-primary-001",label,()=>void mutate(action,params(),reason.value,refresh,b));return b;}
 const tabs=[["dashboard",t("Огляд","Overview")],["users",t("Користувачі","Members")],["requests",t("Верифікація","Verification")],["reports",t("Скарги на профілі","Profile reports")],["market",t("Маркетплейс","Marketplace")],["maintenance",t("Технічні роботи","Maintenance")],["history",t("Журнал дій","Audit log")]];
 const navButtons=new Map();for(const [key,label] of tabs){const b=button("vatra-admin-nav-button-"+key,label,()=>void render(key));navButtons.set(key,b);nav.append(b);}
 async function users(host,selected=""){
 const form=node("form","ui-vatra-admin-lookup-001"),label=node("label","ui-vatra-admin-field-001"),input=node("input","ui-vatra-admin-id-input-001");input.inputMode="numeric";input.placeholder="123";input.value=selected;input.required=true;input.pattern="[1-9][0-9]{0,18}";label.append(node("span","vatra-admin-label-001","VATRA ID"),input);const find=node("button","vatra-admin-primary-001",t("Знайти","Find"));find.type="submit";form.append(label,find);const result=node("div","ui-vatra-admin-member-result-001");host.append(form,result);let searchEpoch=0;
 async function lookup(){const id=input.value.trim();if(!valid(id))return;const n=++searchEpoch;find.disabled=true;result.replaceChildren();try{const row=await rpc("lookup",{p_id:id});if(n!==searchEpoch||!result.isConnected)return;if(!row){result.textContent=t("Користувача не знайдено.","Member not found.");return;}
 const card=box(row.name+" · ID "+row.vatra_id),profile=node("a","vatra-admin-profile-link-001",t("Відкрити профіль","Open profile"));profile.href=new URL("id"+row.vatra_id,root).href;profile.target="_blank";profile.rel="noopener";card.append(profile,node("p","vatra-admin-member-created-001",t("Дата реєстрації: ","Registered: ")+safeDate(row.created_at)),node("p","vatra-admin-member-state-001",t("Стан: ","Status: ")+({active:t("Активний","Active"),blocked:t("Заблоковано","Blocked"),deleted:t("Видалено","Deleted")}[row.state]||row.state)+(row.state==="blocked"&&row.blocked_until?" · "+safeDate(row.blocked_until):"")),node("p","vatra-admin-member-verified-001",row.verified?t("Синя галочка активна","Verified badge active"):t("Без верифікації","Not verified")));
 const reason=reasonField(),actions=node("div","ui-vatra-admin-actions-001"),duration=node("select","ui-vatra-admin-duration-001"),durationLabel=node("label","ui-vatra-admin-field-002");for(const [v,l] of [["",t("Безстроково","Indefinite")],["1",t("1 день","1 day")],["7",t("7 днів","7 days")],["30",t("30 днів","30 days")],["90",t("90 днів","90 days")]])duration.append(new Option(l,v));durationLabel.append(node("span","vatra-admin-label-002",t("Строк блокування","Restriction period")),duration);
 card.append(reason.w);if(row.state!=="deleted"){if(!row.verified)actions.append(actionButton(t("Видати галочку","Grant badge"),"verify",()=>({p_id:id}),reason.i,lookup));else if(id!=="1")actions.append(actionButton(t("Зняти галочку","Revoke badge"),"unverify",()=>({p_id:id}),reason.i,lookup,true));if(id!=="1"){if(row.state==="blocked")actions.append(actionButton(t("Розблокувати","Unblock"),"unblock",()=>({p_id:id}),reason.i,lookup));else{card.append(durationLabel);actions.append(actionButton(t("Заблокувати акаунт","Block account"),"block",()=>({p_id:id,p_days:duration.value?Number(duration.value):null}),reason.i,lookup,true));}}}
 card.append(actions);result.append(card);
 }catch(_){err();}finally{find.disabled=false;}}
 form.addEventListener("submit",e=>{e.preventDefault();void lookup();});if(selected)await lookup();}
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
 async function render(key,selected=""){tab=key;const stamp=++renderEpoch;for(const [id,b] of navButtons)b.setAttribute("aria-pressed",String(id===key));content.replaceChildren();say("");const host=node("div","ui-vatra-admin-view-001");content.append(host);try{
 if(key==="dashboard"){const data=await rpc("dashboard");if(stamp!==renderEpoch)return;const grid=node("div","ui-vatra-admin-stats-001");for(const [k,label] of [["accounts",t("Користувачі","Members")],["verified",t("Верифіковані","Verified")],["blocked",t("Заблоковані","Blocked")],["posts",t("Публікації","Posts")],["communities",t("Спільноти","Communities")],["market_pending",t("Товари на перевірці","Listings awaiting review")],["verification_pending",t("Заявки на галочку","Verification requests")],["reports_pending",t("Скарги на профілі","Profile reports")]]){const tile=node("section","ui-vatra-admin-stat-001");tile.append(node("strong","vatra-admin-stat-number-001",String(data[k]??0)),node("span","vatra-admin-stat-label-001",label));grid.append(tile);}host.append(grid);}
 else if(key==="users")await users(host,selected);
 else if(key==="requests"||key==="reports"){const rows=await rpc(key);if(stamp!==renderEpoch)return;const refresh=()=>render(key);if(!rows.length)host.append(node("p","vatra-admin-empty-001",t("Немає відкритих звернень.","No open requests.")));for(const row of rows){const id=String(row.vatra_id??row.target_vatra_id),c=box((row.display_name||"VATRA")+" · ID "+id),reason=reasonField(),actions=node("div","ui-vatra-admin-actions-001");c.append(node("p","vatra-admin-request-copy-001",[row.category,row.reason,row.details].filter(Boolean).join("\n")),node("p","vatra-admin-request-date-001",safeDate(row.created_at)),reason.w);actions.append(button("vatra-admin-secondary-001",t("Керувати акаунтом","Manage member"),()=>void render("users",id)));if(key==="requests"){actions.append(actionButton(t("Схвалити та видати галочку","Approve and grant badge"),"verify",()=>({p_id:id}),reason.i,refresh),actionButton(t("Відхилити","Reject"),"reject_verification",()=>({p_id:id}),reason.i,refresh,true));}else actions.append(actionButton(t("Закрити скаргу","Resolve report"),"resolve_report",()=>({p_report:row.id}),reason.i,refresh));c.append(actions);host.append(c);}}
 else if(key==="market")await marketView(host,()=>isCurrent()&&dialog===d&&d.open&&stamp===renderEpoch);
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
 else if(key==="history"){const {data,error}=await client.from("admin_audit").select("id,target_vatra_id,event,reason,created_at").order("created_at",{ascending:false}).limit(100);if(error)throw error;if(stamp!==renderEpoch)return;const names={verify:t("Видано галочку","Badge granted"),unverify:t("Знято галочку","Badge revoked"),block:t("Заблоковано","Blocked"),unblock:t("Розблоковано","Unblocked"),reject_verification:t("Відхилено заявку","Verification rejected"),resolve_report:t("Закрито скаргу","Report resolved")};if(!data?.length)host.append(node("p","vatra-admin-empty-001",t("Журнал поки порожній.","No activity yet.")));for(const row of data||[]){const c=box((names[row.event]||row.event)+" · ID "+(row.target_vatra_id??"—"));c.append(node("p","vatra-admin-audit-reason-001",row.reason),node("p","vatra-admin-audit-date-001",safeDate(row.created_at)));host.append(c);}}
 }catch(_){if(stamp===renderEpoch)err();}}
 d.showModal();void render("dashboard");
}
