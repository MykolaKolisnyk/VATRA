/* VATRA Support Desk: access-controlled ticket chat and official help inbox. */
import {initializeApp,getAuth,getDatabase} from './vatra-backend.js?v=20261031-7';
const app=initializeApp(),auth=getAuth(app),db=getDatabase(app).client;
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=x=>{const d=new Date(x);return isNaN(d.getTime())?'—':d.toLocaleString('uk-UA',{dateStyle:'medium',timeStyle:'short'});};
const icons={head:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 13v-2a8 8 0 0 1 16 0v2M4 13H2v5h5v-5H4Zm16 0h2v5h-5v-5h3ZM20 18a4 4 0 0 1-4 4h-4"/></svg>',
back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m14 5-7 7 7 7"/></svg>'};
let role='',ownerUid='',selected=null,tickets=[],refreshing=false,timer=null,renderToken=0,lastMessageId=0,activePanel='user',lastSignedUid='',people=new Map();
async function getRole(){const {data,error}=await db.rpc('vatra_staff_role');role=error?'':String(data||'');return role;}
async function invoke(method,args){const {data,error}=await db.rpc(method,args);if(error)throw error;return data;}
function current(){return auth.currentUser?.uid||'';}
function inside(){return document.body.dataset.page==='supportDesk';}
function show(html){
 const feed=$('#feed');if(!feed)return;
 document.body.dataset.page='supportDesk';
 $('#sort')?.setAttribute('hidden','');$('.quick-compose')?.setAttribute('hidden','');
 feed.innerHTML='<section class="vatra-support-page"><header class="vatra-support-header"><span class="vatra-support-icon">'+icons.head+'</span>'+
 '<div><p>ВАТРА · СЛУЖБА ДОПОМОГИ</p><h2>Технічна підтримка</h2><small>Особисті звернення до техпідтримки ВАТРИ</small></div>'+
 '<button type="button" class="vatra-support-back" data-support-back>'+icons.back+' Назад</button></header>'+html+'</section>';
 document.title='Техпідтримка | ВАТРА';
 window.vatraRouteChanged?.({page:'supportDesk'});
 $('[data-support-back]')?.addEventListener('click',()=>window.vatraRouter?.goPage('settings'));
}
function info(message){return '<p class="vatra-support-info">'+esc(message)+'</p>';}
function person(uid){
 const p=people.get(String(uid||'')),id=String(uid||'');
 if(!p)return '<span class="vatra-support-user-missing">Користувач ВАТРИ</span>';
 const full=p.name||[p.firstName,p.lastName].filter(Boolean).join(' ')||'Користувач ВАТРИ';
 return '<span class="vatra-support-user"><b>'+esc(full)+'</b>'+(p.handle?'<small>@'+esc(p.handle)+'</small>':'')+'</span>';
}
async function fetchPeople(ids){
 const missing=[...new Set(ids.filter(Boolean).map(String))].filter(id=>!people.has(id)&&/^[a-f0-9-]{36}$/i.test(id));
 for(let i=0;i<missing.length;i+=65){
  const chunk=missing.slice(i,i+65);
  const {data,error}=await db.from('app_data').select('path,value').in('path',chunk.map(x=>'publicProfiles/'+x));
  if(error)break;
  for(const id of chunk)people.set(id,{});
  for(const entry of data||[])people.set(entry.path.slice(15),entry.value||{});
 }
}
function renderInbox(){
 const staff=['owner','support'].includes(role),canSeeAll=role==='owner';
 const card=tickets.map(t=>'<button type="button" class="vatra-support-ticket'+(selected===t.id?' is-selected':'')+'" data-ticket="'+t.id+'">'+
  '<span class="vatra-support-ticket-row"><strong>№'+t.id+' · '+esc(t.subject)+'</strong><span class="vatra-support-state state-'+esc(t.status)+'">'+({open:'Нове',in_progress:'В роботі',resolved:'Вирішене',closed:'Закрите'}[t.status]||esc(t.status))+'</span></span>'+
  '<small>'+time(t.last_activity_at)+'</small>'+(staff?'<span class="vatra-support-ticket-person">Заявник: '+person(t.requester_uid)+'</span>':'')+
  (staff?'<span class="vatra-support-ticket-person">Призначено: '+(t.assigned_uid?person(t.assigned_uid):'Очікує призначення')+'</span>':'')+'</button>').join('');
 return '<div class="vatra-support-grid"><aside class="vatra-support-list"><div class="vatra-support-list-head"><h3>'+(canSeeAll?'Усі звернення':staff?'Моя черга':'Мої звернення')+'</h3>'+
 (!staff?'<button class="vatra-support-create" type="button" data-support-new>Нове звернення</button>':'')+'</div>'+
 '<div class="vatra-support-list-items">'+(card||info(staff?'Наразі немає призначених звернень.':'Ваших звернень поки немає.'))+'</div></aside>'+
 '<div class="vatra-support-conversation" id="vatraSupportConversation">'+
 (selected?'<p class="vatra-support-info">Завантажуємо листування…</p>':
 '<div class="vatra-support-welcome">'+icons.head+'<h3>Зв’яжіться з ВАТРОЮ</h3><p>Опишіть проблему, і відповідальний працівник відповість у цьому діалозі. Власник ВАТРИ має доступ до службової переписки для контролю роботи команди.</p>'+
 (staff?'': '<button class="vatra-support-create" type="button" data-support-new>Написати підтримці</button>')+'</div>')+'</div></div>';
}
async function loadTickets(){
 const uid=current();if(!uid||refreshing)return;
 refreshing=true;
 try{
  const {data,error}=await db.from('vatra_support_tickets').select('*').order('last_activity_at',{ascending:false}).limit(250);
  if(error)throw error;
  tickets=data||[];
  await fetchPeople(tickets.flatMap(t=>[t.requester_uid,t.assigned_uid]));
  if(!inside())return;
  const oldSelection=selected;
  const focused=$('#vatraSupportConversation textarea:focus');
  const existing=$('.vatra-support-list-items');
  if(existing){
   const scroll=existing.scrollTop;
   const wrap=document.createElement('div');wrap.innerHTML=renderInbox();
   const newList=wrap.querySelector('.vatra-support-list-items');
   existing.replaceChildren(...newList.children);existing.scrollTop=scroll;
   existing.querySelectorAll('[data-ticket]').forEach(b=>b.onclick=()=>selectTicket(Number(b.dataset.ticket)));
  }
  if(oldSelection&&!tickets.some(t=>t.id===oldSelection)){
   selected=null;if(!focused){const c=$('#vatraSupportConversation');if(c)c.innerHTML=info('Це звернення більше не доступне.');}
  }
  if(selected)await loadMessages(selected,true);
 }catch(e){
  if(inside()){const list=$('.vatra-support-list-items');if(list&&!tickets.length)list.innerHTML=info('Не вдалося завантажити звернення. Переконайтеся, що встановлено SQL-модуль техпідтримки. '+e.message);}
 }finally{refreshing=false;}
}
function showNewTicket(){
 const d=document.createElement('dialog');d.className='vatra-support-new-dialog';
 d.innerHTML='<header><h3>Написати у техпідтримку ВАТРИ</h3><button data-support-close type="button" aria-label="Закрити">'+icons.back+'</button></header>'+
 '<form><label>Тема звернення<input name="subject" required minlength="5" maxlength="160" placeholder="Коротко опишіть проблему"></label>'+
 '<label>Ваше повідомлення<textarea name="body" required maxlength="4000" rows="6" placeholder="Що сталося та як ми можемо допомогти?"></textarea></label>'+
 '<p>Ваше звернення отримує призначений працівник техпідтримки. Власник ВАТРИ може переглянути цей службовий діалог.</p>'+
 '<span role="status" class="vatra-support-error"></span><footer><button type="button" data-support-close>Скасувати</button><button class="vatra-support-create" type="submit">Надіслати</button></footer></form>';
 document.body.append(d);d.showModal();
 d.addEventListener('close',()=>d.remove());
 d.querySelectorAll('[data-support-close]').forEach(b=>b.onclick=()=>d.close());
 const form=d.querySelector('form');form.onsubmit=async ev=>{
  ev.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;
  try{
   const id=await invoke('vatra_support_open',{_subject:form.elements.subject.value.trim(),_message:form.elements.body.value.trim()});
   d.close();selected=Number(id);await loadTickets();await selectTicket(Number(id));
  }catch(err){d.querySelector('.vatra-support-error').textContent=err.message||'Не вдалося надіслати повідомлення.';}
  finally{submit.disabled=false;}
 };
}
async function selectTicket(id){
 if(!tickets.find(t=>t.id===id))return;
 selected=id;lastMessageId=0;
 document.querySelectorAll('[data-ticket]').forEach(b=>b.classList.toggle('is-selected',Number(b.dataset.ticket)===id));
 if(['owner','support'].includes(role)){void invoke('vatra_support_staff_view',{_ticket:id}).catch(()=>{});}
 void invoke('vatra_support_mark_read',{_ticket:id}).then(()=>window.dispatchEvent(new CustomEvent('vatra:support-read'))).catch(()=>{});
 await loadMessages(id,false);
}
async function loadMessages(id,quiet=false){
 if(!inside()||selected!==id)return;
 const {data,error}=await db.from('vatra_support_messages').select('id,ticket_id,sender_uid,body,created_at').eq('ticket_id',id).order('id',{ascending:true}).limit(500);
 const target=$('#vatraSupportConversation'),ticket=tickets.find(t=>t.id===id);
 if(error||!target||!ticket)return;
 const messages=data||[],latest=messages.length?Number(messages[messages.length-1].id):0;
 await fetchPeople(messages.map(m=>m.sender_uid));
 if(quiet&&lastMessageId===latest&&target.querySelector('form[data-support-reply]'))return;
 const currentDraft=quiet?target.querySelector('form[data-support-reply] textarea')?.value||'':'';
 const msgs=messages.map(m=>{
  const mine=m.sender_uid===current(),fromUser=m.sender_uid===ticket.requester_uid;
  return '<div class="vatra-support-bubble '+(mine?'is-mine':'')+'"><small>'+person(m.sender_uid)+' · '+time(m.created_at)+'</small><p>'+esc(m.body)+'</p></div>';
 }).join('');
 const canReply=ticket.status!=='closed'&&(ticket.requester_uid===current()||role==='owner'||(role==='support'&&ticket.assigned_uid===current()));
 const staff=['owner','support'].includes(role);
 const action=(staff?'<div class="vatra-support-management">'+
 (ticket.assigned_uid===null&&role==='support'?'<button type="button" data-support-claim>Взяти звернення</button>':'')+
 (role==='owner'?'<input type="text" data-support-assign maxlength="81" placeholder="@псевдонім працівника"><button type="button" data-support-set-employee>Призначити</button>':'')+
 (ticket.status!=='closed'?'<button type="button" data-support-resolve>Позначити вирішеним</button>':'')+'</div>':'');
 target.innerHTML='<div class="vatra-support-thread-head"><h3>№'+ticket.id+' · '+esc(ticket.subject)+'</h3><small>Статус: '+esc(ticket.status)+' · '+time(ticket.created_at)+'</small></div>'+
 '<div class="vatra-support-thread-messages" aria-live="polite">'+(msgs||info('Ще немає повідомлень.'))+'</div>'+
 action+(canReply?'<form data-support-reply><textarea name="body" required maxlength="4000" rows="3" placeholder="Написати відповідь…"></textarea><button type="submit" class="vatra-support-create">Надіслати</button></form>':
 '<p class="vatra-support-info">Відповіді в цьому зверненні зараз недоступні.</p>');
 lastMessageId=latest;
 const thread=target.querySelector('.vatra-support-thread-messages');if(thread)thread.scrollTop=thread.scrollHeight;
 const form=target.querySelector('form[data-support-reply]');
 if(form){form.elements.body.value=currentDraft;form.onsubmit=async ev=>{
  ev.preventDefault();const msg=form.elements.body.value.trim();if(!msg)return;
  const button=form.querySelector('[type=submit]');button.disabled=true;
  try{await invoke('vatra_support_reply',{_ticket:id,_body:msg});form.elements.body.value='';lastMessageId=0;await loadMessages(id,false);}
  catch(err){button.title=err.message||'Помилка';button.disabled=false;}
 };}
 target.querySelector('[data-support-claim]')?.addEventListener('click',async()=>{
  try{await invoke('vatra_support_claim',{_ticket:id});await loadTickets();await loadMessages(id,false);}catch(err){target.title=err.message;}
 });
 target.querySelector('[data-support-set-employee]')?.addEventListener('click',async()=>{
  const employee=target.querySelector('[data-support-assign]').value.trim();
  if(!/^@?[\p{L}\p{N}._-]{3,80}$/u.test(employee))return;
  try{await invoke('vatra_support_assign_by_handle',{_ticket:id,_handle:employee});await loadTickets();await loadMessages(id,false);}catch(err){target.title=err.message;}
 });
 target.querySelector('[data-support-resolve]')?.addEventListener('click',async()=>{
  try{await invoke('vatra_support_status',{_ticket:id,_status:'resolved'});await loadTickets();await loadMessages(id,false);}catch(err){target.title=err.message;}
 });
}
async function openSupport(requestedId=null){
 if(!current())return;
 if(lastSignedUid!==current()){tickets=[];lastSignedUid=current();}
 const token=++renderToken;selected=null;await getRole();if(token!==renderToken)return;
 show(renderInbox());
 document.querySelectorAll('[data-support-new]').forEach(b=>b.onclick=showNewTicket);
 await loadTickets();
 if(requestedId&&tickets.some(t=>t.id===Number(requestedId)))await selectTicket(Number(requestedId));
 if(location.hash!=='#/support')history.pushState({vatra:true},'',location.pathname+location.search+'#/support');
 window.scrollTo(0,0);
}
window.vatraOpenSupportDesk=openSupport;
function attachNavigation(){
 const nav=$('.vatra-settings-nav');
 if(nav&&document.body.dataset.page==='settings'&&!nav.querySelector('[data-support-settings-link]')){
  const button=document.createElement('button');button.type='button';button.className='vatra-settings-nav-button';button.dataset.supportSettingsLink='true';
  button.textContent='Зв’язатися з техпідтримкою';button.onclick=()=>void openSupport();nav.append(button);
 }
 const help=document.querySelector('[data-vatra-help],button[data-page="help"]');
 if(help&&!help.dataset.supportWired){help.dataset.supportWired='1';help.addEventListener('click',()=>void openSupport());}
}
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;attachNavigation();});}).observe(document.body,{subtree:true,childList:true});
attachNavigation();
timer=setInterval(()=>{if(inside()&&current())void loadTickets();},9000);
if(location.hash==='#/support'){let attempts=0;const clock=setInterval(()=>{if(++attempts>20||document.body.dataset.page==='supportDesk'){clearInterval(clock);return;}if(current())void openSupport();},450);}
