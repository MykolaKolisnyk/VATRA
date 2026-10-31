/* VATRA support notifications: own unread alerts, site-only badges and bell entries. */
import {initializeApp,getAuth,getDatabase} from './vatra-backend.js?v=20261031-7';
const auth=getAuth(initializeApp()),db=getDatabase(initializeApp()).client;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let alerts=[],tickets=new Map(),count=0,lastUser='',busy=false,changedAt=0,queued=false;
const icon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13v-2a8 8 0 0 1 16 0v2M4 13H2v5h5v-5H4Zm16 0h2v5h-5v-5h3ZM20 18a4 4 0 0 1-4 4h-4"/></svg>';
function format(date){const d=new Date(date);return isNaN(d.getTime())?'':d.toLocaleString('uk-UA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
function label(ticket){return ticket?.subject||'Нове звернення до техпідтримки';}
async function refresh(){
 const id=auth.currentUser?.uid||'';
 if(!id){alerts=[];count=0;lastUser='';render();return;}
 if(id!==lastUser){lastUser=id;alerts=[];tickets.clear();count=0;}
 if(busy)return;busy=true;
 try{
  const [{data,error},{count:total,error:countError}]=await Promise.all([
   db.from('vatra_support_alerts').select('id,ticket_id,created_at').is('read_at',null).order('created_at',{ascending:false}).limit(12),
   db.from('vatra_support_alerts').select('id',{count:'exact',head:true}).is('read_at',null)
  ]);
  if(error||countError)throw error||countError;
  if(id!==auth.currentUser?.uid)return;
  alerts=data||[];count=total||0;
  const ids=[...new Set(alerts.map(x=>x.ticket_id))].filter(n=>!tickets.has(n));
  if(ids.length){
   const {data:td,error:te}=await db.from('vatra_support_tickets').select('id,subject').in('id',ids);
   if(!te)for(const t of td||[])tickets.set(t.id,t);
  }
  changedAt=Date.now();
 }catch(err){console.warn('[VATRA support notifications]',err.message);}
 finally{busy=false;render();}
}
function badge(n,cls){
 return n>0?'<span class="'+cls+'" aria-label="'+n+' непрочитаних звернень">'+(n>99?'99+':n)+'</span>':'';
}
function renderBell(){
 const bell=document.querySelector('#notificationBell');
 if(!bell)return;
 let dot=bell.querySelector('.vatra-support-header-badge');
 if(!dot){dot=document.createElement('span');dot.className='vatra-support-header-badge';bell.append(dot);}
 const display=count>99?'99+':String(count);if(dot.textContent!==display)dot.textContent=display;dot.hidden=count===0;
}
function renderLinks(){
 const selectors=['[data-account-action="support"]','[data-support-settings-link]','[data-control-tab="support"]','[data-admin-open-support]'];
 for(const selector of selectors){
  for(const el of document.querySelectorAll(selector)){
   let b=el.querySelector('.vatra-support-unread-count');
   if(!b){b=document.createElement('span');b.className='vatra-support-unread-count';el.append(b);}
   b.hidden=count===0;const val=count>99?'99+':String(count);if(b.textContent!==val)b.textContent=val;
  }
 }
}
function renderDrop(){
 const box=document.querySelector('#notificationDropdown');
 if(!box||box.hidden)return;
 const scroll=box.querySelector('.vatra-notification-popup-scroll');
 if(!scroll)return;
 let panel=scroll.querySelector('.vatra-support-alert-panel');
 if(!count){panel?.remove();return;}
 const signature=lastUser+'/'+alerts.map(x=>x.id).join(',')+'/'+count;
 if(panel?.dataset.signature===signature)return;
 if(!panel){panel=document.createElement('section');panel.className='vatra-support-alert-panel';scroll.prepend(panel);}
 panel.dataset.signature=signature;
 panel.innerHTML='<h4>'+icon+' Техпідтримка <span>'+count+' нових</span></h4>'+
 alerts.map(a=>'<button type="button" data-vatra-support-alert="'+a.ticket_id+'"><b>№'+a.ticket_id+' · '+esc(label(tickets.get(a.ticket_id)))+'</b><small>'+format(a.created_at)+'</small></button>').join('')+
 (count>alerts.length?'<button type="button" data-vatra-support-alert="0">Переглянути всі звернення</button>':'');
}
function render(){renderBell();renderLinks();renderDrop();}
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-vatra-support-alert]');
 if(!button)return;
 e.preventDefault();
 document.querySelector('#notificationDropdown')?.setAttribute('hidden','');
 document.querySelector('#notificationBell')?.setAttribute('aria-expanded','false');
 void window.vatraOpenSupportDesk?.(Number(button.dataset.vatraSupportAlert)||null);
},true);
const observer=new MutationObserver(()=>{
 if(queued)return;queued=true;
 requestAnimationFrame(()=>{queued=false;render();});
});
observer.observe(document.body,{subtree:true,childList:true});
window.addEventListener('vatra:support-read',()=>void refresh());
window.addEventListener('focus',()=>void refresh());
setInterval(()=>void refresh(),8000);
setTimeout(()=>void refresh(),1600);
window.vatraSupportRefreshAlerts=()=>void refresh();
