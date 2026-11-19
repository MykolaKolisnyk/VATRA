/* Private business correspondence, separated from personal conversations. */
export async function renderBusinessInbox({target,client,t,make,link,btn,card,tabs,heading,companySelector,selected,roleOf,ownId,message,err,initialMode,onMode,browseCompany}){
 let mode=initialMode==="manage"?"manage":"mine",thread=null,seq=0,loading=false;let displayCompany=browseCompany||null;const allowed=["owner","admin","manager"].includes(roleOf(selected));
 const body=make("div","ui-business-inbox-body-001"),nav=tabs([["mine",t("Мої звернення","My inquiries")],...(allowed?[["manage",t("Звернення до спільноти","Community inbox")]]:[])],key=>{mode=key;thread=null;displayCompany=key==="mine"?browseCompany:null;onMode(key);void load();});
 for(const b of nav.children){const active=b.dataset.tab===mode;b.classList.toggle("is-active",active);b.setAttribute("aria-pressed",String(active));}
 target.append(heading(t("Повідомлення","Messages"),t("Приватне спілкування клієнтів із компаніями VATRA.","Private correspondence between customers and VATRA companies.")),nav,body);
 const empty=copy=>make("p","vt-business-empty-001",copy),format=time=>new Intl.DateTimeFormat(document.documentElement.lang||"uk",{dateStyle:"short",timeStyle:"short"}).format(new Date(time));
 const columns="id,company_id,customer_vatra_id,last_activity_at,business_companies(id,name,club_id)";
 async function load(){
  const token=++seq;body.replaceChildren();const shell=make("div","ui-business-inbox-shell-001"),list=card("ui-business-conversation-list-001"),pane=card("ui-business-conversation-001");
  if(mode==="manage"){if(!selected){body.append(empty(t("Спочатку створіть компанію.","Create a company first.")));return;}body.append(companySelector());if(!allowed){body.append(empty(t("Скринька доступна власнику, адміністратору та менеджеру.","The inbox is available to owners, administrators and managers.")));return;}}
  body.append(shell);shell.append(list,pane);
  list.append(make("h3","vt-business-panel-title-001",t("Діалоги","Conversations")),btn(t("Оновити","Refresh"),"vt-business-secondary-001",()=>void load()));
  pane.append(empty(t("Виберіть діалог або відкрийте сторінку компанії, щоб написати їй.","Choose a conversation or open a company page to send a message.")));
  try{
   let q=client.from("business_inquiries").select(columns).order("last_activity_at",{ascending:false}).limit(100);q=mode==="manage"?q.eq("company_id",selected):q.eq("customer_vatra_id",ownId);if(browseCompany)q=q.eq("company_id",browseCompany);
   const r=await q;if(token!==seq||!shell.isConnected)return;if(r.error)throw r.error;const rows=r.data||[];
   if(mode==="mine"&&displayCompany&&!rows.some(row=>row.company_id===displayCompany)){
    const existing=await client.from("business_inquiries").select(columns).eq("company_id",displayCompany).eq("customer_vatra_id",ownId).maybeSingle();if(existing.error)throw existing.error;
    if(token!==seq)return;if(existing.data)rows.unshift(existing.data);else if(!roleOf(displayCompany)){const c=await client.from("business_companies").select("id,name,club_id").eq("id",displayCompany).maybeSingle();if(token!==seq)return;if(c.data)rows.unshift({id:null,company_id:c.data.id,business_companies:c.data});}
   }
   if(!rows.length)list.append(make("p","vt-business-heading-copy-001",t("Діалогів поки немає.","No conversations yet.")));
   const openRow=row=>{thread=row.id;displayCompany=mode==="mine"?row.company_id:null;for(const b of list.querySelectorAll("[data-thread]"))b.setAttribute("aria-pressed",String(b.dataset.thread===(row.id||row.company_id)));void open(row,pane,token);};
   for(const row of rows){const label=mode==="manage"?"VATRA ID "+row.customer_vatra_id:row.business_companies?.name||t("Компанія","Company"),b=btn("","vt-business-conversation-item-001",()=>openRow(row));b.dataset.thread=row.id||row.company_id;b.setAttribute("aria-pressed","false");b.append(make("strong","vt-business-conversation-name-001",label),make("span","vt-business-conversation-date-001",row.last_activity_at?format(row.last_activity_at):t("Новий діалог","New conversation")));list.append(b);}
   const start=rows.find(row=>thread&&row.id===thread)||rows.find(row=>displayCompany&&row.company_id===displayCompany);if(start)openRow(start);
  }catch(_){if(token===seq&&shell.isConnected)pane.replaceChildren(empty(err));}
 }
 async function open(row,pane,token){
  const generation=(Number(pane.dataset.generation)||0)+1;pane.dataset.generation=String(generation);
  const current=()=>token===seq&&pane.isConnected&&pane.dataset.generation===String(generation);
  pane.replaceChildren();const header=make("header","ui-business-conversation-header-001"),name=mode==="manage"?"VATRA ID "+row.customer_vatra_id:row.business_companies?.name||t("Компанія","Company"),label=make("h3","vt-business-panel-title-001",name);header.append(label,link(t("Профіль","Profile"),mode==="manage"?"id"+row.customer_vatra_id:"club"+row.business_companies?.club_id,"vt-business-page-link-001"));
  const stream=make("div","ui-business-message-stream-001"),status=make("p","vt-business-local-status-001"),form=make("form","ui-business-message-compose-001"),input=make("textarea","ui-business-post-input-001"),send=make("button","vt-business-primary-001",t("Надіслати","Send"));
  status.setAttribute("role","status");status.hidden=true;input.rows=2;input.maxLength=2000;input.required=true;input.placeholder=t("Напишіть повідомлення…","Write a message…");input.setAttribute("aria-label",input.placeholder);send.type="submit";form.append(input,send);pane.append(header,stream,make("p","vt-business-inbox-note-001",t("Не надсилайте паролі, платіжні реквізити або документи.","Do not send passwords, payment details or identity documents.")),status,form);
  function showStatus(copy,error=false){status.hidden=!copy;status.dataset.kind=error?"error":"info";status.textContent=copy;}
  async function history(){
   if(!current())return;stream.replaceChildren();if(!row.id){stream.append(make("p","vt-business-heading-copy-001",t("Напишіть компанії своє перше повідомлення.","Send the company your first message.")));return;}
   const result=await client.from("business_inquiry_messages").select("id,sender_side,body,created_at").eq("inquiry_id",row.id).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(100);
   if(!current())return;if(result.error){showStatus(err,true);return;}const messages=(result.data||[]).slice().reverse();if(messages.length===100)stream.append(make("p","vt-business-heading-copy-001",t("Показано останні 100 повідомлень.","Showing the latest 100 messages.")));if(!messages.length)stream.append(make("p","vt-business-heading-copy-001",t("Повідомлень поки немає.","No messages yet.")));
   for(const item of messages){const bubble=make("article","ui-business-message-001"),mine=item.sender_side===(mode==="manage"?"company":"customer");bubble.dataset.side=mine?"mine":"other";bubble.append(make("p","vt-business-message-body-001",item.body));const time=make("time","vt-business-message-time-001",format(item.created_at));time.dateTime=item.created_at;bubble.append(time);stream.append(bubble);}stream.scrollTop=stream.scrollHeight;
  }
  header.append(btn(t("Оновити","Refresh"),"vt-business-secondary-001",()=>void history().catch(()=>showStatus(err,true))));
  form.addEventListener("submit",async e=>{e.preventDefault();const copy=input.value.trim();if(!copy||send.disabled||!current())return;send.disabled=true;showStatus("");
   try{
    if(!row.id){if(mode!=="mine")throw Error("thread");let created=await client.from("business_inquiries").insert({company_id:row.company_id}).select("id").single();if(created.error?.code==="23505")created=await client.from("business_inquiries").select("id").eq("company_id",row.company_id).eq("customer_vatra_id",ownId).single();if(created.error||!created.data)throw Error("thread");row.id=created.data.id;}
    const result=await client.from("business_inquiry_messages").insert({inquiry_id:row.id,body:copy});if(result.error)throw result.error;if(!current())return;input.value="";thread=row.id;await history();
   }catch(_){if(current())showStatus(t("Не вдалося надіслати повідомлення. Діалог може бути обмежений або перевищено ліміт.","Could not send the message. The conversation may be restricted or the rate limit reached."),true);}finally{send.disabled=false;}
  });try{await history();}catch(_){if(current())showStatus(err,true);}
 }
 await load();
}
