import {initializeApp,getAuth,getDatabase} from './vatra-backend.js?v=20261031-4';
const app=initializeApp(),auth=getAuth(app),db=getDatabase(app).client;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mark='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.4 12.5 3l3-.1.9 2.8 2.4 1.8-1 2.8 1 2.8-2.4 1.8 1 2.8-2.4 1.8-.9 2.8-3-.1-2.5 1.6-2.5-1.6-3 .1-.9-2.8-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.8 3 .1L10 1.4Z" fill="currentColor"/><path d="m6.2 10.2 2.4 2.4 5.2-5.2" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
window.vatraVerifiedGroupIds=new Set();window.vatraTrustedNotices=[];
window.vatraGroupBadge=id=>window.vatraVerifiedGroupIds.has(String(id))?'<span class="vatra-verified-badge vatra-verified-group-badge" data-vatra-verification-kind="community" tabindex="0" role="link" title="Спільнота офіційно підтверджена ВАТРОЮ">'+mark+'</span>':'';
let tooltip=null,hideTimer=null,queued=false,lastUid='',lastCheck=0;
function showTip(el){
 tooltip?.remove();tooltip=document.createElement('div');tooltip.className='vatra-verified-tooltip';
 tooltip.innerHTML='<strong>'+(el.dataset.vatraVerificationKind==='community'?'Спільнота':'Користувач')+' офіційно підтверджен'+(el.dataset.vatraVerificationKind==='community'?'а':'ий')+' ВАТРОЮ</strong><button type="button" data-vatra-how-verified>Як отримати офіційну галочку?</button>';
 document.body.append(tooltip);const r=el.getBoundingClientRect(),w=285;
 tooltip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';
 tooltip.style.top=Math.min(innerHeight-90,r.bottom+9)+'px';
 tooltip.onmouseenter=()=>clearTimeout(hideTimer);tooltip.onmouseleave=()=>delayHide();
}
function delayHide(){clearTimeout(hideTimer);hideTimer=setTimeout(()=>{tooltip?.remove();tooltip=null;},320);}
document.addEventListener('mouseover',e=>{
 const b=e.target.closest('.vatra-verified-badge');
 if(b){clearTimeout(hideTimer);if(!tooltip||window.vatraBadgeHover!==b){window.vatraBadgeHover=b;showTip(b);}}
 else if(!e.target.closest('.vatra-verified-tooltip')){window.vatraBadgeHover=null;delayHide();}
},true);
document.addEventListener('click',e=>{
 const b=e.target.closest('.vatra-verified-badge,[data-vatra-how-verified]');
 if(!b)return;e.preventDefault();e.stopImmediatePropagation();tooltip?.remove();showGuide();
},true);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.vatra-verified-badge')){e.preventDefault();e.stopPropagation();showGuide();}},true);
function closeBtn(){return '<button type="button" data-verification-close aria-label="Закрити"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M5 5 19 19M19 5 5 19"/></svg></button>';}
function showGuide(){
 const d=document.createElement('dialog');d.className='vatra-verification-dialog';
 d.innerHTML='<header><div><p>ВАТРА · ДОВІРА</p><h2>Як стати верифікованим?</h2></div>'+closeBtn()+'</header>'+
 '<div class="vatra-verification-dialog-body"><p>Синя галочка означає, що ВАТРА офіційно перевірила справжність користувача або спільноти. Це не означає схвалення кожної публікації.</p>'+
 '<h3>Для користувача</h3><p>Заповніть профіль, використовуйте справжні дані, дотримуйтеся правил і поясніть свою публічну діяльність. Не надсилайте в заявці паролі, паспортні дані чи приватні документи.</p>'+
 '<h3>Для спільноти</h3><p>Творець спільноти подає заявку після заповнення назви, опису, аватара, обкладинки та інформації про організацію чи проєкт.</p>'+
 '<h3>Як проходить перевірка</h3><p>Подайте заявку в налаштуваннях, опишіть підставу й додайте публічне посилання. Команда ВАТРИ розгляне заявку й надішле рішення у сповіщеннях. Верифікація безкоштовна.</p>'+
 '<button type="button" class="primary" data-verification-apply>Подати заявку</button></div>';
 document.body.append(d);d.showModal();d.addEventListener('close',()=>d.remove());
 d.querySelector('[data-verification-close]').onclick=()=>d.close();
 d.querySelector('[data-verification-apply]').onclick=()=>{d.close();showApplication();};
 d.onclick=e=>{if(e.target===d)d.close();};
}
window.vatraVerificationGuide=showGuide;
function showApplication(){
 if(!auth.currentUser){window.vatraRouter?.goPage('settings');return;}
 const d=document.createElement('dialog');d.className='vatra-verification-dialog';
 d.innerHTML='<header><div><p>ВАТРА · ЗАЯВКА</p><h2>Отримати офіційну галочку</h2></div>'+closeBtn()+'</header>'+
 '<form class="vatra-verification-application"><label>Об’єкт верифікації<select name="kind"><option value="account">Мій акаунт</option><option value="community">Моя спільнота</option></select></label>'+
 '<label data-community-id hidden>ID спільноти<input name="group" maxlength="128" placeholder="ID власної спільноти"></label>'+
 '<label>Чому потрібна верифікація?<textarea name="explanation" maxlength="2000" minlength="30" rows="5" required placeholder="Опишіть діяльність та підставу (від 30 символів)"></textarea></label>'+
 '<label>Посилання на підтвердження (необов’язково)<input name="reference" maxlength="400" type="url" placeholder="https://..."></label>'+
 '<p class="vatra-verification-note">Не надсилайте паролі й документи. Відповідь прийде в сповіщеннях ВАТРИ.</p><p class="vatra-verification-status" role="status"></p>'+
 '<footer><button type="button" data-verification-close>Скасувати</button><button class="primary" type="submit">Надіслати заявку</button></footer></form>';
 document.body.append(d);d.showModal();d.addEventListener('close',()=>d.remove());
 d.querySelectorAll('[data-verification-close]').forEach(b=>b.onclick=()=>d.close());
 const f=d.querySelector('form');f.elements.kind.onchange=()=>{d.querySelector('[data-community-id]').hidden=f.elements.kind.value!=='community';};
 f.onsubmit=async e=>{
  e.preventDefault();const kind=f.elements.kind.value,target=kind==='account'?auth.currentUser.uid:f.elements.group.value.trim(),message=f.elements.explanation.value.trim(),url=f.elements.reference.value.trim(),status=f.querySelector('.vatra-verification-status'),submit=f.querySelector('[type=submit]');
  if(!target||message.length<30){status.textContent='Заповніть ID та пояснення від 30 символів.';return;}
  submit.disabled=true;status.textContent='Надсилаємо…';
  try{const {error}=await db.rpc('vatra_submit_verification',{_kind:kind,_target:target,_explanation:message,_url:url||null});if(error)throw error;
   status.textContent='Заявка надіслана. Очікуйте рішення в сповіщеннях.';status.dataset.ok='true';submit.hidden=true;
  }catch(err){status.textContent=err.message||'Не вдалося подати заявку.';}finally{submit.disabled=false;}
 };
}
window.vatraOpenVerificationRequest=showApplication;
function injectGroupBadges(){
 document.querySelectorAll('[data-open-group]').forEach(el=>{
  const id=el.dataset.openGroup,found=el.querySelector('.vatra-verified-group-badge');
  if(!window.vatraVerifiedGroupIds.has(id)){found?.remove();return;}
  if(found)return;
  const markHolder=document.createElement('span');markHolder.innerHTML=window.vatraGroupBadge(id);
  const badge=markHolder.firstElementChild;
  if(badge)el.append(badge);
 });
 document.querySelectorAll('[data-vatra-group-badge-slot]').forEach(el=>{
  const id=el.dataset.vatraGroupBadgeSlot;
  el.innerHTML=window.vatraGroupBadge(id);
 });
}
function installSettings(){
 const nav=document.querySelector('.vatra-settings-nav'),form=document.querySelector('#profileSettingsForm');
 if(!nav||!form||document.body.dataset.page!=='settings')return;
 if(!nav.querySelector('[data-vatra-verification-request]')){
  const button=document.createElement('button');button.className='vatra-settings-nav-button';button.type='button';
  button.dataset.vatraVerificationRequest='1';button.textContent='Верифікація';
  button.onclick=showApplication;nav.append(button);
 }
 if(!form.querySelector('#vatraVerificationCard')){
  const card=document.createElement('section');card.id='vatraVerificationCard';card.className='settings-card vatra-public-verification-card';
  card.innerHTML='<h3>Верифікація акаунта або спільноти</h3><p>Подайте заявку до адміністрації ВАТРИ та відстежуйте результат у сповіщеннях.</p><div><button type="button" data-vatra-verification-request-form>Подати заявку</button> <button type="button" data-vatra-how-verified>Як отримати галочку?</button></div>';
  const bar=form.querySelector('.settings-savebar');if(bar)bar.before(card);else form.append(card);
  card.querySelector('[data-vatra-verification-request-form]').onclick=showApplication;
 }
}
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;injectGroupBadges();installSettings();});}).observe(document.body,{childList:true,subtree:true});
async function fetchRemote(){
 const uid=auth.currentUser?.uid||'';
 if(uid!==lastUid){lastUid=uid;lastCheck=0;window.vatraTrustedNotices=[];}
 if(Date.now()-lastCheck<28000)return;lastCheck=Date.now();
 const jobs=[db.from('vatra_verified_groups').select('group_id').eq('verified',true).limit(4000)];
 if(uid)jobs.push(db.from('vatra_verified_notices').select('id,kind,title,body,target_kind,target_id,created_at').eq('recipient_uid',uid).order('created_at',{ascending:false}).limit(80));
 const responses=await Promise.all(jobs);
 if(!responses[0].error){window.vatraVerifiedGroupIds=new Set((responses[0].data||[]).map(v=>v.group_id));injectGroupBadges();}
 if(uid&&responses[1]&&!responses[1].error){
  const result=(responses[1].data||[]).map(v=>({id:'verified_notice_'+v.id,type:'verified',actorUid:'',title:v.title,excerpt:v.body,createdAt:new Date(v.created_at).getTime()||0,targetKind:v.target_kind,targetId:v.target_id}));
  if(JSON.stringify(result)!==JSON.stringify(window.vatraTrustedNotices)){window.vatraTrustedNotices=result;window.dispatchEvent(new Event('vatra:verified-notices'));}
 }
}
setTimeout(()=>void fetchRemote(),1600);setInterval(()=>void fetchRemote(),35000);
