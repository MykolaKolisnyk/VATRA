/* VATRA: suspended account/community state and full public explanation pages. */
import {initializeApp,getAuth,getDatabase} from './vatra-backend.js?v=20261031-7';
const auth=getAuth(initializeApp()),client=getDatabase(initializeApp()).client;
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byKey=new Map(),ongoing=new Map();let lastUid='';
const key=(kind,id)=>kind+':'+id;
const uid=()=>auth.currentUser?.uid||'';
const isBlocked=d=>d?.blocked===true||d?.deleted===true;
const now=()=>Date.now();
function cached(kind,id){const d=byKey.get(key(kind,id));return d&&now()-d.at<15000?d.value:null;}
async function status(kind,id,force=false){
 if(!id)return {blocked:false};
 const k=key(kind,id),entry=byKey.get(k);
 if(!force&&entry&&now()-entry.at<15000)return entry.value;
 if(ongoing.has(k))return ongoing.get(k);
 const request=(async()=>{
  try{const {data,error}=await client.rpc('vatra_public_ban_status',{_kind:kind,_target:id});
    if(error)throw error;
    const value=data&&typeof data==='object'?data:{blocked:false};
    byKey.set(k,{value,at:now()});return value;
  }catch(error){console.warn('[VATRA ban status]',error.message);return null;}
  finally{ongoing.delete(k);}
 })();
 ongoing.set(k,request);return request;
}
function fmt(ts){const date=new Date(ts);return isNaN(date.getTime())?'—':date.toLocaleString('uk-UA',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function html(kind,id,d,name,handle,own=false){
 const community=kind==='community',deleted=d.deleted===true,disclosed=own===true&&d.canSeeDetails===true;
 const title=deleted?(community?'Цю спільноту видалено':'Цю сторінку видалено'):(community?'Цю спільноту заблоковано ВАТРОЮ':'Цей акаунт заблоковано ВАТРОЮ');
 const icon=deleted?'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3-7 8-7s8 2.5 8 7M4 4l16 16"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 21 6v5.7c0 5-3.2 8.7-9 10.3-5.8-1.6-9-5.3-9-10.3V6l9-4Z"/><path d="M12 7v5m0 4h.01"/></svg>';
 const detail=disclosed?'<dl class="vatra-suspended-details">'+
  (d.sinceAt?'<div><dt>Дата рішення</dt><dd>'+fmt(d.sinceAt)+'</dd></div>':'')+
  (!deleted?'<div><dt>Причина блокування</dt><dd>'+escape(d.reason||'Причину не вказано')+'</dd></div>':'')+
  '<div><dt>'+(deleted?'Видалення':'Термін')+'</dt><dd>'+(deleted?(d.pending?'Заплановано до '+fmt(d.deleteAfter):'Остаточно видалено'):(d.permanent?'Безстроково':d.expiresAt?'До '+fmt(d.expiresAt):'Не вказано'))+'</dd></div></dl>':'';
 const description=deleted?(own&&d.pending?'Ваш акаунт заплановано до видалення. Ви можете скасувати це в налаштуваннях до завершення строку.':'Користувач видалив свою сторінку у ВАТРІ.'):own?'Адміністрація ВАТРИ обмежила доступ до Вашого акаунта. Нижче наведено рішення.':'Ця сторінка тимчасово недоступна.';
 return '<section class="vatra-suspended-page '+(deleted?'is-deleted':'is-blocked')+'" data-vatra-ban-page="'+escape(id)+'" aria-label="'+escape(title)+'">'+
 '<header class="vatra-suspended-profile-head"><p class="vatra-suspended-person">'+escape(name||(community?'Спільнота ВАТРИ':'Користувач ВАТРИ'))+
 (handle?' <small>@'+escape(handle.replace(/^@/,''))+'</small>':'')+'</p><p class="vatra-suspended-profile-subtitle">'+(deleted?'Сторінку видалено':community?'Спільноту заблоковано':'Акаунт заблоковано')+'</p></header>'+
 '<div class="vatra-suspended-content"><div class="vatra-suspended-logo">'+icon+'</div><p class="vatra-suspended-overline">'+(deleted?'СТАТУС СТОРІНКИ':'ОФІЦІЙНЕ РІШЕННЯ ВАТРИ')+'</p>'+
 '<h1>'+title+'</h1><p class="vatra-suspended-description">'+description+'</p></div>'+detail+
 '<div class="vatra-suspended-actions">'+(own&&deleted&&d.pending?'<button class="vatra-suspended-support" type="button" data-vatra-restore>Керувати видаленням</button>':!deleted?'<button class="vatra-suspended-support" type="button" data-vatra-ban-support>Звернутися до техпідтримки</button>':'')+
 (!own?'<button class="vatra-suspended-back" type="button" data-vatra-ban-back>Назад</button>':'')+'</div></section>';
}
function inject(kind,id,d,{own=false,name='',handle=''}={}){
 const valid=kind==='community'?location.hash==='#/community/'+encodeURIComponent(id):own?uid()===id:location.hash==='#/profile/'+encodeURIComponent(id);
 if(!valid)return;
 if(own){
  let shell=document.querySelector('#vatraSuspendedOwnScreen');
  if(!shell){shell=document.createElement('div');shell.id='vatraSuspendedOwnScreen';shell.className='vatra-suspended-own-screen';document.body.append(shell);}
  shell.innerHTML=html(kind,id,d,'Ваш акаунт','',true);
  shell.hidden=location.hash==='#/support'||(d.deleted&&location.hash==='#/settings');
  wire(shell);
 }else{
  const feed=document.querySelector('#feed');if(!feed)return;
  feed.innerHTML=html(kind,id,d,name|| (kind==='account'?document.querySelector('.vatra-profile-name-line h2')?.textContent:document.querySelector('.vatra-group-heading h2')?.textContent),handle);
  feed.dataset.vatraBanView=id;
  wire(feed);
 }
}
function wire(root){
 root.querySelector('[data-vatra-restore]')?.addEventListener('click',()=>{root.closest('#vatraSuspendedOwnScreen')?.setAttribute('hidden','');window.vatraRouter?.goPage('settings');setTimeout(()=>document.querySelector('[data-settings-target="account"]')?.click(),120);});
 root.querySelector('[data-vatra-ban-support]')?.addEventListener('click',()=>{
 const overlay=document.querySelector('#vatraSuspendedOwnScreen');if(overlay)overlay.hidden=true;
 void window.vatraOpenSupportDesk?.();
});
 root.querySelector('[data-vatra-ban-back]')?.addEventListener('click',()=>{
  if(history.length>1)history.back();else window.vatraRouter?.goPage('feed');
 });
}
function routeMatches(kind,id){return location.hash===(kind==='community'?'#/community/':'#/profile/')+encodeURIComponent(id);}
function waiting(kind,id,name,handle,error=false){
 if(!routeMatches(kind,id))return;
 const feed=document.querySelector('#feed');if(!feed)return;
 feed.innerHTML='<section class="vatra-suspended-page vatra-suspended-pending"><div class="vatra-suspended-logo"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div><h1>'+(error?'Не вдалося перевірити сторінку':'Перевіряємо статус сторінки…')+'</h1><p class="vatra-suspended-description">'+(error?'Немає відповіді від сервера. Спробуйте повторити перевірку.':'Перевіряємо, чи доступний профіль.')+'</p>'+(error?'<button type="button" class="vatra-suspended-support" data-vatra-ban-retry>Спробувати знову</button>':'')+'</section>';
 feed.querySelector('[data-vatra-ban-retry]')?.addEventListener('click',()=>{byKey.delete(key(kind,id));guard(kind,id,name,handle);});
}
function showRegular(kind,id){
 if(!routeMatches(kind,id))return;
 if(kind==='community')window.vatraRouter?.renderGroupDetails?.(id);
 else window.vatraRouter?.renderPublicProfile?.(id);
}
async function inspect(kind,id,name='',handle=''){
 const d=await status(kind,id);
 if(!routeMatches(kind,id))return;
 if(!d){waiting(kind,id,name,handle,true);return;}
 if(isBlocked(d))inject(kind,id,d,{name,handle});
 else showRegular(kind,id);
}
function guard(kind,id,name='',handle=''){
 if(!id)return false;
 const k=key(kind,id),record=byKey.get(k);
 if(record&&now()-record.at<15000){
  if(isBlocked(record.value)){inject(kind,id,record.value,{name,handle});return true;}
  return false;
 }
 waiting(kind,id,name,handle);
 void inspect(kind,id,name,handle);
 return true;
}
window.vatraBanGuardProfile=(id,name,handle)=>guard('account',id,name,handle);
window.vatraBanGuardCommunity=(id,name)=>guard('community',id,name);
window.vatraBanRefresh=async(kind,id)=>{
 byKey.delete(key(kind,id));
 const d=await status(kind,id,true);
 if(isBlocked(d))inject(kind,id,d,{own:kind==='account'&&uid()===id});
 else {document.querySelector('#vatraSuspendedOwnScreen')?.remove();}
 return d;
};
async function ownCheck(){
 const currentUid=uid();
 if(lastUid!==currentUid){lastUid=currentUid;byKey.clear();document.querySelector('#vatraSuspendedOwnScreen')?.remove();}
 if(!currentUid)return;
 const result=await status('account',currentUid,true);
 if(isBlocked(result))inject('account',currentUid,result,{own:true,name:auth.currentUser?.displayName||auth.currentUser?.user_metadata?.name||'Ваш акаунт'});
 else document.querySelector('#vatraSuspendedOwnScreen')?.remove();
 const shell=document.querySelector('#vatraSuspendedOwnScreen');
 if(shell)shell.hidden=location.hash==='#/support'||(shell.querySelector('.is-deleted')&&location.hash==='#/settings');
}
setTimeout(()=>void ownCheck(),2600);
setInterval(()=>void ownCheck(),13000);
window.addEventListener('hashchange',()=>{const shell=document.querySelector('#vatraSuspendedOwnScreen');if(shell)shell.hidden=location.hash==='#/support'||(shell.querySelector('.is-deleted')&&location.hash==='#/settings');});

setInterval(()=>{const el=document.querySelector('#vatraSuspendedOwnScreen');if(el)el.hidden=location.hash==='#/support'||(el.querySelector('.is-deleted')&&location.hash==='#/settings');},950);

const blockedStateIcon='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2l9 4v6c0 5-3.2 8.4-9 10-5.8-1.6-9-5-9-10V6z"/><path d="M12 7v6m0 3h.01"/></svg>';
const deletedStateIcon='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3-7 8-7s8 2.5 8 7M3 3l18 18"/></svg>';
let listScanTimer=0;
function scanListAvatars(){
 const feed=document.getElementById('feed');if(!feed)return;
 const anchors=feed.querySelectorAll('.vatra-friends-row [data-view-profile],.vatra-search-person-row [data-view-profile],.vatra-profile-friend[data-view-profile],.vatra-public-friend-person[data-view-profile],.vatra-group-member[data-view-profile]');
 let found=0;
 for(const el of anchors){
  const id=el.dataset.viewProfile,avatar=el.querySelector('.avatar');if(!id||!avatar||el.dataset.vatraStateChecked===id||++found>60)continue;
  el.dataset.vatraStateChecked=id;
  const apply=state=>{
   if(!el.isConnected)return;
   el.classList.remove('vatra-avatar-check-pending');
   if(!isBlocked(state))return;
   avatar.removeAttribute('style');
   avatar.classList.add('vatra-restricted-avatar');
   avatar.innerHTML=state.deleted?deletedStateIcon:blockedStateIcon;
   el.classList.add('vatra-avatar-restricted');
   el.title=state.deleted?'Сторінку видалено':'Акаунт заблоковано ВАТРОЮ';
  };
  const c=cached('account',id);
  if(c){apply(c);continue;}
  el.classList.add('vatra-avatar-check-pending');
  void status('account',id).then(apply);
 }
}
const listObserver=new MutationObserver(()=>{clearTimeout(listScanTimer);listScanTimer=setTimeout(scanListAvatars,30);});
if(document.getElementById('feed'))listObserver.observe(document.getElementById('feed'),{childList:true,subtree:true});
setTimeout(scanListAvatars,300);
