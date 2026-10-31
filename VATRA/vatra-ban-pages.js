/* VATRA: suspended account/community state and full public explanation pages. */
import {initializeApp,getAuth,getDatabase} from './vatra-backend.js?v=20261031-4';
const auth=getAuth(initializeApp()),client=getDatabase(initializeApp()).client;
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byKey=new Map(),ongoing=new Map();let lastUid='';
const key=(kind,id)=>kind+':'+id;
const uid=()=>auth.currentUser?.uid||'';
const isBlocked=d=>d?.blocked===true;
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
 const community=kind==='community',title=community?'Цю спільноту заблоковано ВАТРОЮ':'Цей акаунт заблоковано ВАТРОЮ';
 const reason=d.canSeeDetails&&d.reason?'<div><dt>Причина блокування</dt><dd>'+escape(d.reason)+'</dd></div>':'';
 const term=d.canSeeDetails?'<div><dt>Термін</dt><dd>'+(d.permanent?'Безстроково':d.expiresAt?'До '+fmt(d.expiresAt):'Інформація про строк недоступна')+'</dd></div>':'';
 return '<section class="vatra-suspended-page" data-vatra-ban-page="'+escape(id)+'">'+
 '<div class="vatra-suspended-logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 2 21 6v5.7c0 5-3.2 8.7-9 10.3-5.8-1.6-9-5.3-9-10.3V6l9-4Z"/><path d="M12 7v5m0 4h.01"/></svg></div>'+
 '<p class="vatra-suspended-overline">ОФІЦІЙНЕ РІШЕННЯ ВАТРИ</p><h1>'+title+'</h1>'+
 '<p class="vatra-suspended-person">'+escape(name|| (community?'Спільнота ВАТРИ':'Користувач ВАТРИ'))+
 (handle?' <small>@'+escape(handle.replace(/^@/,''))+'</small>':'')+'</p>'+
 '<p class="vatra-suspended-description">'+(own?'Ваш акаунт тимчасово обмежено адміністрацією.':'Сторінка залишається доступною в пошуку та списках, але її публікації й взаємодії наразі обмежені адміністрацією ВАТРИ.')+'</p>'+
 (reason||term?'<dl class="vatra-suspended-details">'+(d.sinceAt&&d.canSeeDetails?'<div><dt>Дата рішення</dt><dd>'+fmt(d.sinceAt)+'</dd></div>':'')+reason+term+'</dl>':'<p class="vatra-suspended-description">Додаткові відомості про причину та строк доступні власнику акаунта або спільноти.</p>')+
 '<div class="vatra-suspended-actions"><button class="vatra-suspended-support" type="button" data-vatra-ban-support>Звернутися до техпідтримки</button>'+
 (!own?'<button class="vatra-suspended-back" type="button" data-vatra-ban-back>Назад</button>':'')+'</div></section>';
}
function inject(kind,id,d,{own=false,name='',handle=''}={}){
 const valid=kind==='community'?location.hash==='#/community/'+encodeURIComponent(id):own?uid()===id:location.hash==='#/profile/'+encodeURIComponent(id);
 if(!valid)return;
 if(own){
  let shell=document.querySelector('#vatraSuspendedOwnScreen');
  if(!shell){shell=document.createElement('div');shell.id='vatraSuspendedOwnScreen';shell.className='vatra-suspended-own-screen';document.body.append(shell);}
  shell.innerHTML=html(kind,id,d,'Ваш акаунт','',true);
  shell.hidden=location.hash==='#/support';
  wire(shell);
 }else{
  const feed=document.querySelector('#feed');if(!feed)return;
  feed.innerHTML=html(kind,id,d,name|| (kind==='account'?document.querySelector('.vatra-profile-name-line h2')?.textContent:document.querySelector('.vatra-group-heading h2')?.textContent),handle);
  feed.dataset.vatraBanView=id;
  wire(feed);
 }
}
function wire(root){
 root.querySelector('[data-vatra-ban-support]')?.addEventListener('click',()=>window.vatraOpenSupportDesk?.());
 root.querySelector('[data-vatra-ban-back]')?.addEventListener('click',()=>{
  if(history.length>1)history.back();else window.vatraRouter?.goPage('feed');
 });
}
async function inspect(kind,id,own=false,name='',handle=''){
 const d=await status(kind,id);
 if(d&&isBlocked(d)){inject(kind,id,d,{own,name,handle});return true;}
 return false;
}
function guard(kind,id,name='',handle=''){
 const d=cached(kind,id);
 if(isBlocked(d)){inject(kind,id,d,{name,handle});return true;}
 void inspect(kind,id,false,name,handle);
 return false;
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
 if(isBlocked(result))inject('account',currentUid,result,{own:true});
 else document.querySelector('#vatraSuspendedOwnScreen')?.remove();
 const shell=document.querySelector('#vatraSuspendedOwnScreen');
 if(shell)shell.hidden=location.hash==='#/support';
}
setTimeout(()=>void ownCheck(),2600);
setInterval(()=>void ownCheck(),13000);
window.addEventListener('hashchange',()=>{const shell=document.querySelector('#vatraSuspendedOwnScreen');if(shell)shell.hidden=location.hash==='#/support';});
