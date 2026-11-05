import {initializeApp,getAuth,getDatabase} from '../backend/client.js?v=20261104-8';
const app=initializeApp(),auth=getAuth(app),db=getDatabase(app).client;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mark='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="m23 12-2.44-2.78.34-3.68-3.61-.82L15.4 1.5 12 2.96 8.6 1.5 6.71 4.72l-3.61.81.34 3.69L1 12l2.44 2.78-.34 3.69 3.61.82L8.6 22.5l3.4-1.46 3.4 1.46 1.9-3.22 3.6-.82-.34-3.68Z"/><path fill="#fff" d="m10 15.5-3.5-3.5 1.41-1.41L10 12.67l5.59-5.59L17 8.5Z"/></svg>';
window.vatraVerifiedGroupIds=new Set();window.vatraTrustedNotices=[];
window.vatraGroupBadge=id=>window.vatraVerifiedGroupIds.has(String(id))?'<span class="vatra-verified-badge vatra-verified-group-badge" data-vatra-verification-kind="community" tabindex="0" role="link">'+mark+'</span>':'';
let tooltip=null,hideTimer=null,queued=false,lastUid='',lastCheck=0;
function badgeIsInteractive(b){
 if(!b)return false;
 if(b.dataset.vatraVerificationKind==='community')return !!b.closest('.vatra-group-heading-copy');
 return !!b.closest('.vatra-profile-name-line,.profile-panel');
}
function badgeSubjectName(el){
 const heading=el.closest('h2')||el.closest('.vatra-profile-name-line,.vatra-group-heading-copy,.profile-panel')?.querySelector('h2');
 if(!heading)return '';
 return Array.from(heading.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).filter(Boolean).join(' ').slice(0,90);
}
function showTip(el){
 clearTimeout(hideTimer);tooltip?.remove();
 tooltip=document.createElement('div');tooltip.className='vatra-verified-tooltip';tooltip.id='vatraVerifiedTooltip';tooltip.setAttribute('role','tooltip');
 const isGroup=el.dataset.vatraVerificationKind==='community',name=badgeSubjectName(el);
 const title=document.createElement('strong');title.textContent=isGroup?'Верифікована спільнота':'Верифікована сторінка';
 const detail=document.createElement('span');detail.className='vatra-verification-tooltip-detail';
 detail.textContent=name?(isGroup?'Спільноту «'+name+'»':'Сторінку «'+name+'»')+' підтверджено ВАТРОЮ.':(isGroup?'Цю спільноту':'Цю сторінку')+' підтверджено ВАТРОЮ.';
 const learn=document.createElement('button');learn.type='button';learn.dataset.vatraHowVerified='';learn.textContent='Дізнайтеся більше про верифікацію';
 tooltip.append(title,detail,learn);document.body.append(tooltip);
 const rect=el.getBoundingClientRect(),w=tooltip.offsetWidth||315,h=tooltip.offsetHeight||112;
 tooltip.style.left=Math.max(8,Math.min(innerWidth-w-8,rect.left+rect.width/2-w/2))+'px';
 tooltip.style.top=(rect.bottom+h+10>innerHeight?Math.max(8,rect.top-h-10):rect.bottom+10)+'px';
 tooltip.onmouseenter=()=>clearTimeout(hideTimer);tooltip.onmouseleave=()=>delayHide();
}
function delayHide(){clearTimeout(hideTimer);hideTimer=setTimeout(()=>{tooltip?.remove();tooltip=null;},320);}
document.addEventListener('mouseover',e=>{
 const b=e.target.closest('.vatra-verified-badge');
 if(b&&badgeIsInteractive(b)){clearTimeout(hideTimer);if(!tooltip||window.vatraBadgeHover!==b){window.vatraBadgeHover=b;showTip(b);}}
 else if(!e.target.closest('.vatra-verified-tooltip')){window.vatraBadgeHover=null;delayHide();}
},true);
document.addEventListener('click',e=>{
 const b=e.target.closest('.vatra-verified-badge,[data-vatra-how-verified]');
 if(!b||(b.matches('.vatra-verified-badge')&&!badgeIsInteractive(b)))return;e.preventDefault();e.stopImmediatePropagation();tooltip?.remove();document.querySelectorAll('.vatra-post-photo-viewer[open],.vatra-avatar-viewer[open]').forEach(d=>d.close());showGuide();
},true);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&badgeIsInteractive(e.target.closest('.vatra-verified-badge'))){e.preventDefault();e.stopPropagation();showGuide();}},true);
function closeBtn(){return '<button type="button" data-verification-close aria-label="Закрити"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M5 5 19 19M19 5 5 19"/></svg></button>';}
function showGuide(fromHistory=false){
 const feed=document.querySelector('#feed');if(!feed)return;
 document.body.dataset.page='verificationGuide';
 document.querySelector('.quick-compose')?.setAttribute('hidden','');
 document.querySelector('#sort')?.setAttribute('hidden','');
 const sections=[
  ['Навіщо потрібна синя галочка?','<p>Верифікація допомагає впізнати офіційну сторінку публічної особи, автора, бренду або спільноти. Вона підтверджує справжність власника чи представника, але не означає, що ВАТРА підтримує всі його дописи.</p>'],
  ['Основні критерії для синьої галочки','<ul><li><strong>Щонайменше 5 000 справжніх підписників</strong> сторінки або спільноти. Накручені, бот-акаунти й заблоковані підписники не враховуються.</li><li><strong>Принаймні 1 власна публічна публікація за останні 30 календарних днів</strong>: оригінальний допис, відео або інший доступний у ВАТРІ формат. Репости та перепублікації чужого контенту не зараховуються.</li><li>Оформлений сторінку або спільнота: справжня назва, аватар, актуальний опис, тематичні публікації та відсутність порушень правил.</li><li>Посилання на офіційний сайт, інші підтверджені сторінки або публічні згадки допомагають встановити справжність власника.</li></ul>'],
  ['Як подати заявку?','<p>У вебверсії відкрийте <strong>Налаштування → Верифікація акаунта</strong>, а для спільноти — її налаштування. Заявку від імені спільноти може подавати лише творець. Опишіть свою діяльність, додайте посилання, які підтверджують вашу особу, бренд або організацію, і надішліть заявку на розгляд.</p>'],
  ['Що відбувається після заявки?','<p>Уповноважені адміністратори ВАТРИ розглядають дані й вирішують, чи відповідає сторінка умовам. Відповідь надходить у сповіщення. Виконання числових критеріїв дозволяє подати обґрунтовану заявку, але <strong>не гарантує автоматичного присвоєння</strong> галочки.</p>'],
  ['Чи можуть забрати галочку?','<p>Так. Статус можуть переглянути, якщо підписників стало менше 5 000, протягом останніх 30 днів немає власних публічних матеріалів, виявлено накрутку, порушення правил або власник більше не представляє зазначену організацію. За повторного виконання вимог можна звернутися знову.</p>'],
  ['Чи є винятки?','<p>Для офіційних установ, зареєстрованих організацій або осіб із переконливими незалежними доказами публічної діяльності адміністрація може окремо розглянути підтвердження справжності. Така перевірка не є автоматичною і потребує достатніх доказів.</p>'],
  ['Скільки коштує верифікація?','<p><strong>Безкоштовно.</strong> ВАТРА не продає сині галочки. Не надсилайте паролі, коди входу, банківські реквізити чи приватні документи стороннім особам.</p>']
 ];
 feed.innerHTML='<section class="vatra-verification-page"><header class="vatra-verification-page-header">'+
  '<p>ВАТРА · ПІДТВЕРДЖЕННЯ СТОРІНОК</p><h1>Верифікація у ВАТРІ: правила та умови</h1>'+
  '<p>Дізнайтеся, як отримати офіційну галочку для сторінки або спільноти.</p></header>'+
  '<article class="vatra-verification-page-body">'+sections.map(x=>'<section class="vatra-verification-guide-section"><h2>'+x[0]+'</h2>'+x[1]+'</section>').join('')+
  '<div class="vatra-verification-page-actions"><button type="button" class="primary" data-verification-apply>Подати заявку</button>'+
  '<button type="button" class="pill" data-verification-back>Повернутися</button></div></article></section>';
 if(!fromHistory&&location.hash!=='#/verification')history.pushState({vatra:true},'',location.pathname+location.search+'#/verification');
 document.title='Верифікація: вимоги та заявка | ВАТРА';
 feed.querySelector('[data-verification-back]').onclick=()=>{if(history.length>1)history.back();else window.vatraRouter?.goPage('feed');};
 feed.querySelector('[data-verification-apply]').onclick=()=>showApplication();
 window.scrollTo(0,0);
}
window.vatraVerificationGuide=showGuide;
function showApplication(selectedKind='choose',selectedGroup=''){
 if(!auth.currentUser){window.vatraRouter?.goPage('settings');return;}
 const d=document.createElement('dialog');d.className='vatra-verification-dialog';
 d.innerHTML='<header><div><p>ВАТРА · ЗАЯВКА</p><h2>Отримати офіційну галочку</h2></div>'+closeBtn()+'</header>'+
 '<form class="vatra-verification-application"><label>Об’єкт верифікації<select name="kind"><option value="account">Мій акаунт</option><option value="community">Моя спільнота</option></select></label>'+
 '<label data-community-id hidden>ID спільноти<input name="group" maxlength="128" placeholder="ID власної спільноти"></label>'+
 '<div class="vatra-verification-criteria-note"><strong>Перед поданням перевірте умови</strong><span>Від 5 000 справжніх підписників, хоча б 1 власний публічний допис за останні 30 днів, заповнена сторінка та відсутність накрутки. Для офіційних організацій можливий окремий розгляд документально підтвердженої справжності.</span></div>'+ 
 '<label>Чому потрібна верифікація?<textarea name="explanation" maxlength="2000" minlength="30" rows="5" required placeholder="Опишіть діяльність та підставу (від 30 символів)"></textarea></label>'+
 '<label>Посилання на підтвердження (необов’язково)<input name="reference" maxlength="400" type="url" placeholder="https://..."></label>'+
 '<p class="vatra-verification-note">Не надсилайте паролі й документи. Відповідь прийде в сповіщеннях ВАТРИ.</p><p class="vatra-verification-status" role="status"></p>'+
 '<footer><button type="button" data-verification-close>Скасувати</button><button class="primary" type="submit">Надіслати заявку</button></footer></form>';
 document.body.append(d);d.showModal();d.addEventListener('close',()=>d.remove());
 d.querySelectorAll('[data-verification-close]').forEach(b=>b.onclick=()=>d.close());
 const f=d.querySelector('form');f.elements.kind.onchange=()=>{d.querySelector('[data-community-id]').hidden=f.elements.kind.value!=='community';};
 if(selectedKind==='community'||selectedKind==='account'){
 f.elements.kind.value=selectedKind;f.elements.group.value=selectedGroup;f.elements.kind.onchange();
 f.elements.kind.closest('label').hidden=true;
}
 const groupInput=f.elements.group;groupInput.setAttribute('list','vatraOwnedCommunityOptions');
 const list=document.createElement('datalist');list.id='vatraOwnedCommunityOptions';groupInput.after(list);
 void db.from('app_data').select('path,value').like('path','groups/%').limit(800).then(({data,error})=>{
  if(error||!list.isConnected)return;
  (data||[]).filter(x=>/^groups\/[^/]+$/.test(x.path)&&x.value?.ownerUid===auth.currentUser?.uid).forEach(x=>{
   const option=document.createElement('option');option.value=x.path.slice(7);option.label=x.value.name||option.value;list.append(option);
  });
 }).catch(()=>{});
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
 document.querySelectorAll('.vatra-verified-badge').forEach(b=>{
  const enabled=badgeIsInteractive(b);
  b.tabIndex=enabled?0:-1;
  if(enabled)b.setAttribute('role','link');else b.removeAttribute('role');
 });
 document.querySelectorAll('[data-open-group]').forEach(el=>{
  const id=el.dataset.openGroup,found=el.querySelector('.vatra-verified-group-badge');
  if(!window.vatraVerifiedGroupIds.has(id)){found?.remove();return;}
  if(found)return;
  const markHolder=document.createElement('span');markHolder.innerHTML=window.vatraGroupBadge(id);
  const badge=markHolder.firstElementChild;
  const slot=el.matches('.vatra-community-name,.vatra-search-person-name,.author-link')?el:el.querySelector('.vatra-community-name,.vatra-search-person-name,.author-link,small');
  if(badge&&slot)slot.append(badge);
 });
 document.querySelectorAll('[data-vatra-group-badge-slot]').forEach(el=>{
  const id=el.dataset.vatraGroupBadgeSlot,verified=window.vatraVerifiedGroupIds.has(String(id))?'1':'0';
  if(el.dataset.verifiedRendered===verified)return;
  el.dataset.verifiedRendered=verified;
  el.innerHTML=window.vatraGroupBadge(id);
 });
}
function installSettings(){
 const nav=document.querySelector('.vatra-settings-nav'),form=document.querySelector('#profileSettingsForm');
 if(!nav||!form||document.body.dataset.page!=='settings')return;
 let pane=form.querySelector('#vatraVerificationPane');
 if(!pane){
  pane=document.createElement('section');pane.id='vatraVerificationPane';pane.className='vatra-settings-pane';
  pane.dataset.settingsSection='verification';pane.hidden=true;
  const save=form.querySelector('.settings-savebar');
  if(save)save.before(pane);else form.append(pane);
  pane.innerHTML='<section class="settings-card vatra-public-verification-card">'+
   '<h3>Верифікація акаунта</h3><p>Для синьої галочки зазвичай потрібно від 5 000 підписників і щонайменше 1 власний публічний допис за 30 днів. Результат розгляду отримаєте у сповіщеннях.</p>'+
   '<div><button type="button" data-vatra-apply-account>Подати заявку</button>'+
   '<button type="button" data-vatra-how-verified>Умови верифікації</button></div></section>';
  pane.querySelector('[data-vatra-apply-account]').onclick=()=>showApplication('account');
  nav.addEventListener('click',event=>{
   if(event.target.closest('[data-settings-target]')){pane.hidden=true;nav.querySelector('[data-vatra-verification-request]')?.classList.remove('active');}
  });
 }
 const misplaced=form.querySelector('#vatraVerificationCard');
 misplaced?.remove();
 if(!nav.querySelector('[data-vatra-verification-request]')){
  const button=document.createElement('button');button.className='vatra-settings-nav-button';button.type='button';
  button.dataset.vatraVerificationRequest='1';button.textContent='Верифікація акаунта';
  button.onclick=()=>{
   form.querySelectorAll('.vatra-settings-pane').forEach(section=>section.hidden=true);
   nav.querySelectorAll('.vatra-settings-nav-button').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-current','false');});
   pane.hidden=false;button.classList.add('active');button.setAttribute('aria-current','page');
  };
  nav.append(button);
 }
}
async function installCommunityVerification(){
 const form=document.querySelector('#groupSettingsForm'),hash=location.hash.match(/^#\/community\/([^/]+)\/settings$/);
 if(!form||!hash||form.dataset.communityVerificationChecked)return;
 form.dataset.communityVerificationChecked='1';
 const id=decodeURIComponent(hash[1]);
 try{const {data,error}=await db.from('app_data').select('value').eq('path','groups/'+id).maybeSingle();
  if(error||data?.value?.ownerUid!==auth.currentUser?.uid||!form.isConnected)return;
 }catch{return;}
 const card=document.createElement('section');
 card.id='vatraCommunityVerificationCard';card.className='settings-card vatra-public-verification-card';
 card.innerHTML='<h3>Верифікація спільноти</h3><p>Творець може подати заявку, якщо спільнота має від 5 000 справжніх підписників та принаймні 1 власну публічну публікацію за останні 30 днів.</p>'+
 '<div><button type="button" data-community-apply>Подати заявку</button><button type="button" data-vatra-how-verified>Умови верифікації</button></div>';
 const save=form.querySelector('.settings-savebar');if(save)save.before(card);else form.append(card);
 card.querySelector('[data-community-apply]').onclick=()=>showApplication('community',id);
}
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;injectGroupBadges();installSettings();installCommunityVerification();});}).observe(document.body,{childList:true,subtree:true});
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
let verificationDeepLinkAttempts=0;
const guideTimer=setInterval(()=>{if(location.hash!=='#/verification'||document.body.dataset.page==='verificationGuide'||verificationDeepLinkAttempts++>=15){clearInterval(guideTimer);return;}if(document.querySelector('#feed'))showGuide(true);},450);
