import {initializeApp,getAuth,getDatabase,onAuthStateChanged} from './vatra-backend.js?v=20261031-7';
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
 const community=kind==='community',deleted=d.deleted===true,disclosed=own&&d.canSeeDetails===true;
 const title=deleted?(community?'Спільноту видалено':'Сторінку видалено'):(community?'Спільноту заблоковано':'Сторінку заблоковано');
 const message=deleted?(community?'Цю спільноту видалено.':'Цю сторінку видалено.'):(community?'Цю спільноту заблоковано адміністрацією ВАТРИ.':'Цю сторінку заблоковано адміністрацією ВАТРИ.');
 const note=deleted?(own&&d.pending&&d.deleteAfter?'Ви можете скасувати видалення до '+fmt(d.deleteAfter)+'.':''):(own?'Докладніше про рішення — нижче.':'Ця сторінка тимчасово недоступна.');
 const detail=disclosed?'<dl class="vatra-suspended-details">'+
  (d.sinceAt?'<div><dt>Дата рішення</dt><dd>'+fmt(d.sinceAt)+'</dd></div>':'')+
  (!deleted?'<div><dt>Причина блокування</dt><dd>'+escape(d.reason||'Причину не вказано')+'</dd></div>':'')+
  '<div><dt>'+(deleted?'Видалення':'Термін')+'</dt><dd>'+(deleted?(d.pending?'Заплановано до '+fmt(d.deleteAfter):'Остаточно видалено'):(d.permanent?'Безстроково':d.expiresAt?'До '+fmt(d.expiresAt):'Не вказано'))+'</dd></div></dl>':'';
 if(own){
  return '<section class="vatra-suspended-page vatra-restriction-landing '+(deleted?'is-deleted':'is-blocked')+'" data-vatra-ban-page="'+escape(id)+'" aria-label="'+escape(title)+'">'+
   '<header class="vatra-restriction-header"><img src="vatra-header.svg?v=20261104-1" alt="ВАТРА" width="176" height="38"><span class="vatra-restriction-brand-status"><i></i> Українська соціальна мережа</span></header>'+
   '<div class="vatra-restriction-hero"><div class="vatra-restriction-copy">'+
    '<span class="vatra-restriction-chip">'+(deleted?'СТОРІНКА НЕДОСТУПНА':'ДОСТУП ОБМЕЖЕНО')+'</span>'+
    '<h1>'+(deleted?'Сторінку <em>видалено</em>':'Акаунт <em>заблоковано</em>')+'</h1>'+
    '<p class="vatra-restriction-lead">'+(deleted?'Профіль недоступний. Якщо видалення ще не завершене, Ви можете відновити акаунт у встановлений термін.':'Доступ до ВАТРИ обмежений рішенням адміністрації. Нижче наведено інформацію та можливість звернутися до техпідтримки.')+'</p>'+
    (detail||'<p class="vatra-restriction-note">'+escape(note||message)+'</p>')+
    '<div class="vatra-restriction-actions">'+
     (!deleted?'<button class="vatra-suspended-support" type="button" data-vatra-ban-support>Звернутися до техпідтримки</button>':'')+
     (deleted&&d.pending?'<button class="vatra-suspended-support" type="button" data-vatra-restore>Керувати видаленням</button>':'')+
    '</div></div>'+
    '<div class="vatra-restriction-art" aria-hidden="true"><div class="vatra-restriction-window"><div class="vatra-restriction-dots"><i></i><i></i><i></i><span></span></div><div class="vatra-restriction-glyph">'+(deleted?deletedStateIcon:blockedStateIcon)+'</div><strong>'+(deleted?'410':'403')+'</strong><div class="vatra-restriction-lines"><i></i><i></i></div></div><span class="vatra-restriction-float">Захист спільноти ВАТРА</span></div></div>'+
   '<footer class="vatra-restriction-footer"><strong>ВАТРА</strong><span>Твій простір для спілкування</span></footer></section>';
 }
 return '<section class="vatra-suspended-page '+(deleted?'is-deleted':'is-blocked')+'" data-vatra-ban-page="'+escape(id)+'" aria-label="'+escape(title)+'">'+
  '<header class="vatra-suspended-profile-head"><h2 class="vatra-suspended-person">'+escape(name||(community?'Спільнота ВАТРИ':'Користувач ВАТРИ'))+
  (handle?' <small>@'+escape(handle.replace(/^@/,''))+'</small>':'')+'</h2><p class="vatra-suspended-profile-subtitle">'+title+'</p></header>'+
  '<div class="vatra-suspended-notice" role="status"><strong>'+message+'</strong>'+(note?'<p>'+note+'</p>':'')+'</div>'+detail+
  '<div class="vatra-suspended-actions">'+(own&&deleted&&d.pending?'<button class="vatra-suspended-support" type="button" data-vatra-restore>Керувати видаленням</button>':own&&!deleted?'<button class="vatra-suspended-support" type="button" data-vatra-ban-support>Звернутися до техпідтримки</button>':'')+
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
  feed.removeAttribute('aria-busy');
  feed.innerHTML=html(kind,id,d,name|| (kind==='account'?document.querySelector('.vatra-profile-name-line h2')?.textContent:document.querySelector('.vatra-group-heading h2')?.textContent),handle);
  feed.dataset.vatraBanView=id;
  wire(feed);
 }
}
function wire(root){
 root.querySelector('[data-vatra-restore]')?.addEventListener('click',()=>{root.closest('#vatraSuspendedOwnScreen')?.setAttribute('hidden','');window.vatraRouter?.goPage('settings');setTimeout(()=>document.querySelector('[data-settings-target="account"]')?.click(),120);});
 root.querySelector('[data-vatra-ban-support]')?.addEventListener('click',()=>{
   restrictionSupportOpening=true;
   document.body.classList.add('vatra-restricted-support-mode');
   const overlay=document.getElementById('vatraSuspendedOwnScreen');
   if(overlay)overlay.hidden=true;
   const work=window.vatraOpenSupportDesk?.();
   if(work&&typeof work.catch==='function')void work.catch(()=>{
    restrictionSupportOpening=false;
    document.body.classList.remove('vatra-restricted-support-mode');
    if(overlay)overlay.hidden=false;
   });
 });
 root.querySelector('[data-vatra-ban-back]')?.addEventListener('click',()=>{
  if(history.length>1)history.back();else window.vatraRouter?.goPage('feed');
 });
}
function routeMatches(kind,id){return location.hash===(kind==='community'?'#/community/':'#/profile/')+encodeURIComponent(id);}
function waiting(kind,id,name,handle,error=false){
 if(!routeMatches(kind,id))return;
 const feed=document.querySelector('#feed');if(!feed)return;
 if(!error){feed.replaceChildren();feed.setAttribute('aria-busy','true');return;}
 feed.removeAttribute('aria-busy');
 feed.innerHTML='<section class="vatra-ban-load-error" role="alert"><p>Не вдалося відкрити сторінку. Перевірте з’єднання.</p><button type="button" data-vatra-ban-retry>Повторити</button></section>';
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
 document.querySelector('#feed')?.removeAttribute('aria-busy');
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
let ownCheckPromise=null,lastOwnCheckAt=0,verifiedOwnUid='',lastOwnResult=null,restrictionSupportOpening=false;
function accountCheckScreen(){
 let el=document.getElementById('vatraAccountCheckScreen');
 if(!el){
  el=document.createElement('div');el.id='vatraAccountCheckScreen';el.className='vatra-account-check-screen';
  el.setAttribute('aria-label','ВАТРА');
  // Quiet access gate. A denied session never reveals the regular app layout.
  el.innerHTML='<div class="vatra-access-error" hidden><p>Не вдалося підключитися до ВАТРИ. Перевірте з’єднання.</p><button type="button" data-vatra-check-retry>Повторити</button></div>';
  document.body.append(el);
  el.querySelector('[data-vatra-check-retry]').addEventListener('click',()=>{lastOwnCheckAt=0;void ownCheck();});
 }
 return el;
}
function rememberOwnState(id,value){
 try{
  const k='vatra-own-restriction:'+id;
  if(isBlocked(value))sessionStorage.setItem(k,JSON.stringify({value,time:Date.now()}));
  else sessionStorage.removeItem(k);
 }catch{}
}
function restoreOwnState(id){
 try{const item=JSON.parse(sessionStorage.getItem('vatra-own-restriction:'+id)||'null');
  return item&&Date.now()-item.time<43200000&&isBlocked(item.value)?item.value:null;
 }catch{return null;}
}
function syncRestrictedPresentation(){
 const restricted=isBlocked(lastOwnResult),support=restricted&&(restrictionSupportOpening||location.hash==='#/support');
 document.body.classList.toggle('vatra-restricted-support-mode',support);
 const shell=document.getElementById('vatraSuspendedOwnScreen');
 if(shell)shell.hidden=support||(lastOwnResult?.deleted===true&&location.hash==='#/settings');
}
window.vatraReturnToBanScreen=()=>{
 restrictionSupportOpening=false;
 document.body.classList.remove('vatra-restricted-support-mode');
 const shell=document.getElementById('vatraSuspendedOwnScreen');
 if(shell)shell.hidden=false;
 window.vatraRouter?.goPage('feed');
 syncRestrictedPresentation();
};
async function ownCheck(){
 const id=uid();
 if(lastUid!==id){
  lastUid=id;verifiedOwnUid='';lastOwnCheckAt=0;byKey.clear();lastOwnResult=null;restrictionSupportOpening=false;
  document.getElementById('vatraSuspendedOwnScreen')?.remove();
  if(!id){document.getElementById('vatraAccountCheckScreen')?.remove();document.body.classList.remove('vatra-restricted-support-mode');}
  else{
   const prior=restoreOwnState(id);
   if(prior){
    lastOwnResult=prior;
    inject('account',id,prior,{own:true,name:auth.currentUser?.displayName||'Ваш акаунт'});
    syncRestrictedPresentation();
   }
  }
 }
 if(!id)return;
 if(ownCheckPromise)return ownCheckPromise;
 const gate=accountCheckScreen();
 if(verifiedOwnUid!==id&&!isBlocked(lastOwnResult)){gate.hidden=false;gate.querySelector('.vatra-access-error').hidden=true;}
 else gate.hidden=true;
 ownCheckPromise=(async()=>{
  const result=await status('account',id,true);
  if(uid()!==id)return;
  if(!result){
   if(verifiedOwnUid!==id&&!isBlocked(lastOwnResult)){
    gate.hidden=false;gate.querySelector('.vatra-access-error').hidden=false;
   }
   return;
  }
  verifiedOwnUid=id;lastOwnResult=result;gate.hidden=true;rememberOwnState(id,result);
  if(isBlocked(result))inject('account',id,result,{own:true,name:auth.currentUser?.displayName||'Ваш акаунт'});
  else document.getElementById('vatraSuspendedOwnScreen')?.remove();
  syncRestrictedPresentation();
 })().finally(()=>{lastOwnCheckAt=Date.now();ownCheckPromise=null;});
 return ownCheckPromise;
}
// Auth event drives immediate restriction checks; timer is only fallback/refresh.
onAuthStateChanged(auth,()=>{void ownCheck();});
queueMicrotask(()=>void ownCheck());
setInterval(()=>{
 const id=uid();
 if(id!==lastUid){void ownCheck();return;}
 if(id&&!document.hidden&&Date.now()-lastOwnCheckAt>15000)void ownCheck();
},3000);
window.addEventListener('hashchange',()=>{restrictionSupportOpening=false;syncRestrictedPresentation();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void ownCheck();});

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
