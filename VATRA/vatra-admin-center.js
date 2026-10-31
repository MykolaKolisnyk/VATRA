/* ВАТРА • secure administration and report inbox, backed by Supabase RLS/RPC.
   Requires vatra-moderation-center.sql; no service-role token is present in the browser. */
import {initializeApp,getAuth,getDatabase} from './vatra-backend.js?v=20261031-7';
const auth=getAuth(initializeApp()),client=getDatabase(initializeApp()).client;
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
 shield:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 20 6v5.5c0 5.5-3.4 8.6-8 10-4.6-1.4-8-4.5-8-10V6l8-3.5Z"/><path d="m9 12 2 2 4-4"/></svg>',
 close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg>',
 search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
 back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg>'
};
const statuses={open:'Нова',reviewing:'Розглядається',resolved:'Вирішена',dismissed:'Відхилена'};
const reasons={spam:'Спам',harassment:'Переслідування',hate:'Мова ворожнечі',unsafe:'Небезпечний контент',other:'Інше'};
let staffRole='',roleUid='',roleChecked=false,roleResult=false,isRoleLoading=false,rolePromise=null,activeTab='reports',queueCount=0,tabInitialized=false,paintPending=false,loadingToken=0,caseLimit=300,auditLimit=200,adminOpen=false,adminPending=false,identities=new Map();
const signedUid=()=>auth.currentUser?.uid||null;
const errorText=e=>String(e?.message||'Перевірте з’єднання й налаштування Supabase.');
async function checkRole(force=false){
 const uid=signedUid();
 if(!uid){staffRole='';roleUid='';roleChecked=false;roleResult=false;return false;}
 if(!force&&roleChecked&&roleUid===uid)return roleResult;
 if(rolePromise)return rolePromise;
 isRoleLoading=true;
 rolePromise=(async()=>{
  try{
   const {data,error}=await client.rpc('vatra_staff_role');
   staffRole=error?'':String(data||'');
   roleResult=['owner','admin','moderator','support','verifier'].includes(staffRole);
   roleUid=uid;roleChecked=true;
  }catch{roleUid=uid;roleChecked=true;roleResult=false;staffRole='';}
  return roleResult;
 })();
 try{return await rolePromise;}
 finally{rolePromise=null;isRoleLoading=false;}
}
async function rpc(name,args){
 const {data,error}=await client.rpc(name,args);
 if(error)throw error;return data;
}
function time(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('uk-UA',{dateStyle:'medium',timeStyle:'short'});}
function adminFrame(content,title='Адмінпанель ВАТРИ'){
 return '<section class="vatra-control-center">'+
 '<header class="vatra-control-header"><div class="vatra-control-heading"><span class="vatra-control-emblem">'+icons.shield+'</span><div><p class="vatra-control-overline">ВАТРА · КЕРУВАННЯ</p><h2>'+title+'</h2><p>Скарги, безпека користувачів та спільнот</p></div></div><button type="button" class="vatra-control-back" data-control-back>'+icons.back+' Налаштування</button></header>'+content+'</section>';
}
function show(content,title,routeName){
 const feed=$('#feed');if(!feed)return;
 feed.innerHTML=adminFrame(content,title);
 document.body.dataset.page=routeName;
 $('#title')?.replaceChildren(document.createTextNode(title));
 if($('.quick-compose'))$('.quick-compose').hidden=true;
 if($('#sort'))$('#sort').hidden=true;
 if(typeof window.vatraRouteChanged==='function')window.vatraRouteChanged({page:routeName});
 document.title=title+' | ВАТРА';
 $('#feed [data-control-back]')?.addEventListener('click',()=>window.vatraRouter?.goPage('settings'));
 window.scrollTo({top:0});
}
function toastInline(element,message,success=false){
 if(!element)return;
 element.textContent=message;element.dataset.kind=success?'success':'error';
}
function askAction(label,detail,{danger=false}={}){
 return new Promise(resolve=>{
  const d=document.createElement('dialog');d.className='vatra-control-confirm';
  d.innerHTML='<div class="vatra-control-confirm-inner"><header><span class="vatra-control-emblem">'+icons.shield+'</span><h3>Підтвердіть дію</h3><button type="button" data-confirm-cancel aria-label="Закрити">'+icons.close+'</button></header>'+
    '<p>'+esc(label)+'</p><small>'+esc(detail)+'</small><footer><button type="button" class="vatra-control-cancel" data-confirm-cancel>Скасувати</button><button type="button" class="vatra-control-primary'+(danger?' is-danger':'')+'" data-confirm-yes>Підтвердити</button></footer></div>';
  document.body.append(d);
  d.querySelectorAll('[data-confirm-cancel]').forEach(b=>b.addEventListener('click',()=>d.close('cancel')));
  d.querySelector('[data-confirm-yes]').addEventListener('click',()=>d.close('yes'));
  d.addEventListener('click',e=>{if(e.target===d)d.close('cancel');});
  d.addEventListener('close',()=>{const accepted=d.returnValue==='yes';d.remove();resolve(accepted);},{once:true});
  d.showModal();
 });
}
function navbar(){
 return '<nav class="vatra-control-tabs" aria-label="Розділи адмінпанелі">'+
 [['reports','Скарги'],['accounts','Користувачі'],['communities','Спільноти'],['content','Контент'],['verification','Галочки'],['requests','Заявки'],['team','Команда'],['gifts','Замовлення подарунків'],['support','Техпідтримка'],['duties','Обов’язки'],['audit','Журнал']].filter(([key])=>staffRole==='owner'||(staffRole==='admin'?['reports','accounts','communities','content','verification','requests','duties'].includes(key):staffRole==='moderator'?['reports','content','duties'].includes(key):staffRole==='support'?['reports','support','duties'].includes(key):staffRole==='verifier'?['verification','requests','duties'].includes(key):false)).map(([key,label])=>
  '<button type="button" data-control-tab="'+key+'" class="'+(activeTab===key?'is-active':'')+'">'+label+(key==='reports'&&queueCount?'<span>'+queueCount+'</span>':'')+'</button>').join('')+'</nav>';
}
function activityStats(cases,accounts,groups){
 const open=cases.filter(x=>x.status==='open').length,review=cases.filter(x=>x.status==='reviewing').length;
 const userBans=accounts.filter(x=>x.active&&(!x.expires_at||new Date(x.expires_at)>new Date())).length;
 const groupBans=groups.filter(x=>x.active&&(!x.expires_at||new Date(x.expires_at)>new Date())).length;
 queueCount=open+review;
 return '<div class="vatra-control-stat-grid">'+[
  ['Нові скарги',open],['На розгляді',review],['Заблоковані акаунти',userBans],['Заблоковані спільноти',groupBans]
 ].map(([label,count])=>'<div class="vatra-control-stat"><strong>'+count+'</strong><span>'+label+'</span></div>').join('')+'</div>';
}
function selectData(items){return '<option value="">Оберіть строк</option>'+items.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('');}
function nameOf(id,group=false){
 const v=identities.get((group?'groups/':'publicProfiles/')+String(id||'')),uid=String(id||'');
 if(!v)return esc(uid);
 const title=String(v.name||[v.firstName,v.lastName].filter(Boolean).join(' ')||(group?'Спільнота ВАТРИ':'Користувач ВАТРИ'));
 return '<strong>'+esc(title)+'</strong>'+(v.handle?'<small>@'+esc(v.handle)+'</small>':'')+
 '<small class="vatra-control-person-id">ID: '+esc(uid)+'</small>';
}
async function loadIdentities(cases,accounts,groups,audit,team){
 const uuids=new Set(),groupIds=new Set();
 for(const x of accounts)if(x.user_id)uuids.add(x.user_id);
 for(const x of groups)if(x.group_id)groupIds.add(x.group_id);
 for(const x of cases){if(x.reporter_uid)uuids.add(x.reporter_uid);
  if(x.target_type==='profile'&&x.target_id)uuids.add(x.target_id);
  if(x.target_type==='group'&&x.target_id)groupIds.add(x.target_id);}
 for(const x of audit){if(x.actor_uid)uuids.add(x.actor_uid);
  if(/^[0-9a-f-]{36}$/i.test(x.target||''))uuids.add(x.target);}
 for(const x of team)if(x.user_id)uuids.add(x.user_id);
 const paths=[...uuids].slice(0,120).map(id=>'publicProfiles/'+id)
  .concat([...groupIds].slice(0,60).map(id=>'groups/'+id));
 identities=new Map();
 for(let i=0;i<paths.length;i+=60){
  const {data,error}=await client.from('app_data').select('path,value').in('path',paths.slice(i,i+60));
  if(error)break;
  for(const rec of data||[])identities.set(rec.path,rec.value||{});
 }
}
window.vatraStaffDisplay=id=>nameOf(id);
window.vatraStaffHandle=id=>String(identities.get('publicProfiles/'+id)?.handle||'');
function banForm(type,list){
 const user=type==='accounts',heading=user?'Блокування користувача':'Блокування спільноти';
 const control=user?'<input name="target" maxlength="41" placeholder="@псевдонім" autocomplete="off" required>':
 '<input name="target" maxlength="128" placeholder="ID спільноти" autocomplete="off" required>';
 const entries=list.slice(0,50).map(v=>'<article class="vatra-control-ban-row"><span>'+nameOf(user?v.user_id:v.group_id,!user)+'</span><small>'+(v.active?'Бан':'Розблоковано')+(v.expires_at?' · до '+time(v.expires_at):'')+'</small><p>'+esc(v.reason||'')+'</p></article>').join('');
 return '<div class="vatra-control-columns"><section class="vatra-control-card"><h3>'+heading+'</h3><p>Рішення записується у журнал. Заблоковані акаунти не можуть публікувати матеріали через базу ВАТРИ.</p>'+
 '<form autocomplete="off" data-control-ban="'+type+'"><label>'+(user?'Псевдонім (@)':'ID спільноти')+control+'</label>'+
 '<label>Причина<textarea name="reason" maxlength="500" rows="3" placeholder="Причина блокування або примітка" required></textarea></label>'+
 '<label>Строк<select name="hours"><option value="0">Безстроково</option><option value="24">24 години</option><option value="72">3 дні</option><option value="168">7 днів</option><option value="720">30 днів</option></select></label>'+
 '<div class="vatra-control-actions"><button class="vatra-control-primary is-danger" type="submit" name="operation" value="ban">Заблокувати</button><button class="vatra-control-secondary" type="submit" name="operation" value="unban">Зняти блокування</button></div><p role="status" class="vatra-control-status"></p></form></section>'+
 '<section class="vatra-control-card"><h3>Історія блокувань</h3><p>Показано останні рішення. Зняти блокування акаунта можна за його поточним @псевдонімом, спільноти — за ID.</p><div class="vatra-control-bans">'+(entries||'<p class="vatra-control-muted">Блокувань поки немає.</p>')+'</div></section></div>';
}
function contentForm(list){
 const entries=list.slice(0,60).map(c=>'<article class="vatra-control-ban-row"><span>'+esc(c.content_path)+'</span>'+
 '<small>'+(c.active?'Приховано':'Відновлено')+' · '+time(c.updated_at)+'</small><p>'+esc(c.reason||'')+'</p></article>').join('');
 return '<div class="vatra-control-columns"><section class="vatra-control-card"><h3>Керування контентом</h3>'+
 '<p>Приховування не видаляє дані. Дописи, коментарі та відео можна відновити, рішення фіксується в журналі.</p>'+
 '<form data-control-content><label>Шлях матеріалу<input name="path" maxlength="320" required placeholder="posts/ID або groupPosts/GROUP_ID/POST_ID"></label>'+
 '<p class="vatra-control-muted">Також: comments/POST_ID/COMMENT_ID, videos/VIDEO_ID.</p>'+
 '<label>Причина<textarea name="reason" maxlength="500" rows="3" placeholder="Чому матеріал обмежується?" required></textarea></label>'+
 '<div class="vatra-control-actions"><button class="vatra-control-primary is-danger" type="submit" name="operation" value="hide">Приховати</button>'+
 '<button class="vatra-control-secondary" type="submit" name="operation" value="restore">Відновити</button></div>'+
 '<p role="status" class="vatra-control-status"></p></form></section>'+
 '<section class="vatra-control-card"><h3>Модерація матеріалів</h3><div class="vatra-control-bans">'+
 (entries||'<p class="vatra-control-muted">Немає прихованих матеріалів.</p>')+'</div></section></div>';
}
function reportContentPath(c){
 const type=String(c.target_type||''),id=String(c.target_id||'');
 const bits=id.split('__');
 if(type==='post')return 'posts/'+id;
 if(type==='groupPost'&&bits.length===2)return 'groupPosts/'+bits[0]+'/'+bits[1];
 if(type==='comment'&&bits.length===2)return 'comments/'+bits[0]+'/'+bits[1];
 if(type==='video')return 'videos/'+id;
 return '';
}
function verificationForm(){
 return '<section class="vatra-control-card"><h3>Офіційні акаунти <span class="vatra-control-blue-check">'+icons.shield+'</span></h3><p>Видача за унікальним @псевдонімом. Статус назавжди прив’язується до UUID акаунта, доки його не відкличе адміністратор.</p>'+
 '<form data-control-verify><label>Псевдонім<input name="handle" required maxlength="25" autocomplete="off" placeholder="@псевдонім"></label>'+
 '<div class="vatra-control-actions"><button type="submit" class="vatra-control-primary" name="operation" value="grant">Видати галочку</button>'+
 '<button type="submit" class="vatra-control-secondary" name="operation" value="revoke">Забрати галочку</button></div><p role="status" class="vatra-control-status"></p></form></section>';
}
function reportFilters(){
 return '<div class="vatra-control-report-filters"><label>Статус<select id="vatraControlReportFilter"><option value="all">Усі скарги</option>'+
 Object.entries(statuses).map(([id,name])=>'<option value="'+id+'">'+name+'</option>').join('')+'</select></label>'+
 '<label>Пошук<input id="vatraControlReportSearch" type="search" placeholder="Причина, ID, текст…" aria-label="Пошук скарг"></label></div>';
}
function casesMarkup(rows){
 const list=rows.map(c=>'<article class="vatra-control-case" data-case-card data-status="'+esc(c.status)+'" data-search="'+esc((c.target_type+' '+c.target_id+' '+c.reason+' '+c.details+' '+c.reporter_uid).toLowerCase())+'">'+
 '<div class="vatra-control-case-title"><strong>Скарга №'+c.id+' · '+(c.target_type==='profile'?nameOf(c.target_id):c.target_type==='group'?nameOf(c.target_id,true):esc(c.target_id))+'</strong>'+
 '<span class="vatra-control-state state-'+esc(c.status)+'">'+esc(statuses[c.status]||c.status)+'</span></div>'+
 '<small>Відправник: '+nameOf(c.reporter_uid)+' · '+time(c.created_at)+'</small><small>Категорія: '+esc(reasons[c.reason]||c.reason)+'</small>'+
 '<p>'+esc(c.details||'Додаткового опису немає.')+'</p>'+
 '<button type="button" class="vatra-control-secondary" data-open-case="'+c.id+'">Розглянути та відповісти</button></article>').join('');
 return '<section class="vatra-control-card"><h3>Черга скарг <small>'+rows.length+'</small></h3>'+
 reportFilters()+'<div class="vatra-control-report-list">'+(list||'<p class="vatra-control-muted">Немає скарг.</p>')+'</div>'+
 '<p id="vatraControlReportEmpty" class="vatra-control-muted" hidden>За фільтрами скарг немає.</p>'+(rows.length>=caseLimit?'<button type="button" class="vatra-control-secondary" data-control-more-cases>Завантажити ще 300 скарг</button>':'')+'</section>';
}
function caseJumpLink(c){
 const type=String(c.target_type||''),target=String(c.target_id||'');
 let hash='';
 if(type==='profile')hash='#/profile/'+encodeURIComponent(target);
 else if(type==='group')hash='#/community/'+encodeURIComponent(target);
 else if(type==='post')hash='#post-'+encodeURIComponent(target);
 else if(type==='comment')hash='#post-'+encodeURIComponent(target.split('__')[0]);
 else if(type==='groupPost'){
  const pair=target.split('__');
  if(pair.length===2)hash='#post-'+encodeURIComponent('g_'+pair[0]+'_'+pair[1]);
 }
 if(!hash)return '';
 return '<a class="vatra-control-secondary vatra-control-target-link" target="_blank" rel="noopener noreferrer" href="'+hash+'">Переглянути матеріал</a>';
}
function caseDetail(c){
 return '<section class="vatra-control-card vatra-control-case-detail"><button class="vatra-control-link" data-case-back type="button">'+icons.back+' До списку скарг</button>'+
 '<h3>Скарга №'+c.id+'</h3>'+
 '<dl><div><dt>Мета скарги</dt><dd>'+esc(c.target_type)+' / '+(c.target_type==='profile'?nameOf(c.target_id):c.target_type==='group'?nameOf(c.target_id,true):esc(c.target_id))+'</dd></div>'+
 '<div><dt>Автор звернення</dt><dd>'+nameOf(c.reporter_uid)+'</dd></div>'+
 '<div><dt>Причина</dt><dd>'+esc(reasons[c.reason]||c.reason)+'</dd></div>'+
 '<div><dt>Дата</dt><dd>'+time(c.created_at)+'</dd></div></dl>'+
 '<p>'+esc(c.details||'Опис не надано.')+'</p><div class="vatra-control-actions">'+caseJumpLink(c)+(['profile','group'].includes(c.target_type)?'<button type="button" class="vatra-control-secondary" data-case-moderate="'+esc(c.target_type)+'" data-case-target="'+esc(c.target_id)+'">Керувати блокуванням</button>':'')+(reportContentPath(c)?'<button type="button" class="vatra-control-secondary" data-case-content="'+esc(reportContentPath(c))+'">Керувати матеріалом</button>':'')+'</div>'+
 '<form data-control-report="' +c.id+'"><label>Статус<select name="status">'+Object.entries(statuses).map(([v,label])=>'<option value="'+v+'"'+(c.status===v?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
 '<label>Відповідь користувачеві<textarea rows="5" name="response" maxlength="1500" placeholder="Поясніть рішення…">'+esc(c.admin_response||'')+'</textarea></label>'+
 '<p class="vatra-control-muted">Відповідь буде доступна автору звернення в розділі «Мої скарги».</p>'+
 '<div class="vatra-control-actions"><button class="vatra-control-primary" type="submit">Зберегти рішення</button></div><p role="status" class="vatra-control-status"></p></form></section>';
}
function auditMarkup(events){
 return '<section class="vatra-control-card"><h3>Журнал адміністратора</h3><p>Історія змін незворотна для користувачів інтерфейсу, але її захист залежить від налаштувань бази.</p><div class="vatra-control-audit">'+
 (events.map(a=>'<article><strong>'+esc(a.action)+'</strong><span>'+(/^[0-9a-f-]{36}$/i.test(a.target||'')?nameOf(a.target):nameOf(a.target,true))+'</span><small>'+time(a.created_at)+'</small><pre>'+esc(JSON.stringify(a.details||{},null,2))+'</pre><small>Виконавець: '+nameOf(a.actor_uid)+'</small></article>').join('')||'<p class="vatra-control-muted">Історія порожня.</p>')+'</div>'+(events.length>=auditLimit?'<button type="button" class="vatra-control-secondary" data-vatra-more-audit>Показати ще 200 дій</button>':'')+'</section>';
}
async function getRows(table,limit=300,orderBy='created_at'){
 const {data,error}=await client.from(table).select('*').order(orderBy,{ascending:false}).limit(limit);
 if(error)throw error;return Array.isArray(data)?data:[];
}

const giftNames={
 welcome:'Перша іскра ВАТРИ',halloween:'Гарбузик ВАТРИ',newyear:'Новорічна ялинка',
 independence:'Серце України',warmth:'Теплі обійми',bouquet:'Букет ВАТРИ',spark:'Іскра дружби',
 gold_pumpkin:'Золотий гарбуз',rose:'Квітка дружби',cocoa:'Тепле какао',cupcake:'Святковий кекс',
 lantern:'Ліхтарик ВАТРИ',ribbon:'Стрічка щастя',sun:'Сонечко',teddy:'Ведмедик ВАТРИ',
 hearts:'Два серця',firebird:'Вогняний птах'
};
function giftAdminMarkup(orders=[]){
 const pending=orders.filter(o=>o.status==='pending');
 return '<section class="vatra-control-card vatra-gift-admin">'+
 '<h3>Замовлення подарунків <small>'+pending.length+' нових</small></h3>'+
 '<p>Користувач надсилає заявку за ціною в гривнях. Зв’яжіться з ним у месенджері ВАТРИ, узгодьте оплату та видайте подарунок лише після фактичного отримання коштів.</p>'+
 '<div class="vatra-gift-admin-orders">'+
 (orders.length?orders.map(o=>'<article class="vatra-gift-admin-order"><div><strong>№'+esc(o.id)+' · '+esc(giftNames[o.code]||o.code)+'</strong><span>@'+esc(o.handle||'невідомий')+' · '+esc(o.price)+' грн</span><small>UID: '+esc(o.uid)+'</small><small>'+time(o.createdAt)+'</small></div>'+
 '<div><span class="vatra-control-state">'+esc(({pending:'Нове замовлення',fulfilled:'Видано',cancelled:'Скасовано'})[o.status]||o.status)+'</span>'+
 (o.status==='pending'?'<button type="button" class="vatra-control-secondary" data-vatra-gift-contact="'+esc(o.uid)+'">Написати користувачу</button><button type="button" class="vatra-control-primary" data-vatra-gift-fulfill="'+esc(o.id)+'">Оплату отримано · Видати</button>':'')+
 '</div></article>').join(''):'<p class="vatra-control-muted">Замовлень поки немає.</p>')+
 '</div></section>'+
 '<section class="vatra-control-card vatra-gift-admin"><h3>Видати подарунок за псевдонімом</h3>'+
 '<p>Спочатку перевірте @псевдонім користувача. Подарунок закріплюється за його UID, навіть якщо згодом псевдонім зміниться.</p>'+
 '<form id="vatraGiftAdminIssue"><label>Псевдонім<input name="handle" placeholder="@псевдонім" required autocomplete="off"></label><label>Подарунок<select name="code">'+Object.entries(giftNames).map(([c,n])=>'<option value="'+esc(c)+'">'+esc(n)+'</option>').join('')+'</select></label>'+
 '<label>Примітка<input name="reason" placeholder="Наприклад, підтверджено оплату" maxlength="500"></label>'+
 '<button type="submit" class="vatra-control-primary">Видати</button><p class="vatra-control-status" role="status"></p></form></section>'+
 '<section class="vatra-control-card vatra-gift-admin"><h3>Перевірити або забрати подарунок</h3>'+
 '<form id="vatraGiftAdminLookup"><label>Псевдонім<input name="handle" placeholder="@псевдонім" required autocomplete="off"></label><button type="submit" class="vatra-control-secondary">Знайти подарунки</button></form>'+
 '<div id="vatraGiftAdminInventory" role="status"></div></section>';
}
function installGiftAdminEvents(){
 document.querySelectorAll('[data-vatra-gift-contact]').forEach(button=>button.addEventListener('click',()=>{
  const uid=button.dataset.vatraGiftContact;
  if(uid)void window.vatraRouter?.startChatWith(uid);
 }));
 document.querySelectorAll('[data-vatra-gift-fulfill]').forEach(button=>button.addEventListener('click',async()=>{
  const id=Number(button.dataset.vatraGiftFulfill);
  if(!(await askAction('Підтвердити оплату та видати подарунок за замовленням №'+id+'?','Підтверджуйте тільки після фактичного отримання коштів.')))return;
  button.disabled=true;
  try{await rpc('vatra_gifts_admin_fulfill',{_order_id:id});await renderDashboard();}
  catch(e){button.disabled=false;alert(errorText(e));}
 }));
 const issue=$('#vatraGiftAdminIssue');
 issue?.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.currentTarget,handle=f.elements.handle.value.trim().replace(/^@/,''),code=f.elements.code.value,reason=f.elements.reason.value.trim();
  if(!(await askAction('Видати «'+(giftNames[code]||code)+'» користувачу @'+handle+'?','Подарунок буде прив’язано до UID знайденого акаунта.')))return;
  const button=f.querySelector('[type=submit]');button.disabled=true;
  try{const id=await rpc('vatra_gifts_admin_grant',{_handle:handle,_code:code,_reason:reason||'Видано власником ВАТРИ'});
   toastInline(f.querySelector('.vatra-control-status'),'Подарунок видано. ID: '+id,true);
  }catch(err){toastInline(f.querySelector('.vatra-control-status'),errorText(err));}
  finally{button.disabled=false;}
 });
 const lookup=$('#vatraGiftAdminLookup');
 lookup?.addEventListener('submit',async e=>{
  e.preventDefault();const handle=lookup.elements.handle.value.trim().replace(/^@/,'');
  const target=$('#vatraGiftAdminInventory');if(!target)return;
  target.textContent='Перевіряємо подарунки…';
  try{
   const data=await rpc('vatra_gifts_admin_inventory',{_handle:handle});
   const rows=data?.items||[];
   target.innerHTML='<p><strong>@'+esc(handle)+'</strong> · UID: '+esc(data.uid)+'</p>'+
     (rows.length?rows.map(item=>'<div class="vatra-gift-admin-instance"><span>'+esc(giftNames[item.code]||item.code)+' <small>'+esc(item.id)+'</small></span><button type="button" data-vatra-gift-revoke="'+esc(item.id)+'" data-vatra-gift-handle="'+esc(handle)+'">Забрати</button></div>').join(''):'<p>У користувача немає подарунків.</p>');
  }catch(err){target.textContent=errorText(err);}
 });
 $('#vatraGiftAdminInventory')?.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-vatra-gift-revoke]');if(!btn)return;
  const item=btn.dataset.vatraGiftRevoke,handle=btn.dataset.vatraGiftHandle;
  if(!(await askAction('Забрати подарунок користувача @'+handle+'?','ID подарунка: '+item,{danger:true})))return;
  btn.disabled=true;
  try{await rpc('vatra_gifts_admin_revoke',{_handle:handle,_item_id:item,_reason:'Відкликано власником ВАТРИ'});$('#vatraGiftAdminLookup')?.requestSubmit();}
  catch(err){btn.disabled=false;alert(errorText(err));}
 });
}
async function renderDashboard(){
 if(adminPending)return;
 if(!(await checkRole()))return;
 adminPending=true;
 const tabs=staffRole==='owner'?['reports','accounts','communities','content','verification','requests','team','gifts','support','duties','audit']:staffRole==='admin'?['reports','accounts','communities','content','verification','requests','duties']:staffRole==='moderator'?['reports','content','duties']:staffRole==='support'?['reports','support','duties']:['verification','requests','duties'];
 if(!tabs.includes(activeTab))activeTab=tabs[0];
 const token=++loadingToken;
 adminOpen=true;
 show(navbar()+'<div class="vatra-control-loading" role="status">Завантажуємо панель керування…</div>','Адмінпанель ВАТРИ','adminCenter');
 try{
  if(activeTab==='gifts'){
   const giftOrders=await rpc('vatra_gifts_admin_orders',{});
   if(token!==loadingToken||document.body.dataset.page!=='adminCenter')return;
   show(navbar()+giftAdminMarkup(Array.isArray(giftOrders)?giftOrders:[]),'Адмінпанель ВАТРИ','adminCenter');
   installTabs();installGiftAdminEvents();
   return;
  }
  const [cases,accounts,groups,audit,hidden,requests,team]=await Promise.all([
   getRows('vatra_moderation_cases',caseLimit),getRows('vatra_moderation_account_bans',150),
   getRows('vatra_moderation_group_bans',150),staffRole==='owner'?getRows('vatra_moderation_audit',auditLimit):Promise.resolve([]),getRows('vatra_moderation_hidden_content',150,'updated_at'),
   tabs.includes('requests')?getRows('vatra_verification_requests',300):Promise.resolve([]),
   staffRole==='owner'?getRows('vatra_staff_members',300,'appointed_at'):Promise.resolve([])
  ]);
  if(token!==loadingToken||document.body.dataset.page!=='adminCenter')return;
  await loadIdentities(cases,accounts,groups,audit,team);
  if(token!==loadingToken||document.body.dataset.page!=='adminCenter')return;
  const stat=activityStats(cases,accounts,groups);
  let content=activeTab==='reports'?casesMarkup(cases)
   :activeTab==='accounts'?banForm('accounts',accounts)
   :activeTab==='communities'?banForm('communities',groups)
   :activeTab==='content'?contentForm(hidden)
   :activeTab==='verification'?verificationForm()+(window.vatraAdminExtras?.groupForm?.()||'')
   :activeTab==='requests'?(window.vatraAdminExtras?.requests?.(requests)||'')
   :activeTab==='team'?(window.vatraAdminExtras?.team?.(team)||'')
   :activeTab==='support'?'<section class="vatra-control-card"><h3>Діалоги техпідтримки</h3><p>Службові звернення з призначеними операторами. Власник може читати всі розмови.</p><button type="button" class="vatra-control-primary" data-admin-open-support>Відкрити техпідтримку</button></section>'
   :activeTab==='duties'?(window.vatraAdminExtras?.policy?.(staffRole)||'')
   :auditMarkup(audit);
  show(navbar()+stat+content,'Адмінпанель ВАТРИ','adminCenter');
  installEvents({cases,accounts,groups,audit,hidden,requests,team});
 }catch(error){
  if(token!==loadingToken)return;
  show(navbar()+'<section class="vatra-control-card"><h3>Потрібне налаштування Supabase</h3><p>Панель відкривається лише після запуску <code>VATRA/vatra-moderation-center.sql</code> у SQL Editor. Також перевірте право адміністратора.</p><p class="vatra-control-error">'+esc(errorText(error))+'</p></section>','Адмінпанель ВАТРИ','adminCenter');
  installTabs();
 }finally{adminPending=false;}
}
function installTabs(){
 document.querySelectorAll('[data-control-tab]').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.controlTab;void renderDashboard();}));
}
function installEvents(data){
 installTabs();
 window.vatraAdminExtras?.install?.(data,()=>void renderDashboard(),askAction,rpc,toastInline);
 $('[data-vatra-more-audit]')?.addEventListener('click',()=>{auditLimit+=200;void renderDashboard();});
 $('[data-admin-open-support]')?.addEventListener('click',()=>void window.vatraOpenSupportDesk?.());
 $('[data-control-more-cases]')?.addEventListener('click',()=>{caseLimit+=300;void renderDashboard();});
 const filter=$('#vatraControlReportFilter'),search=$('#vatraControlReportSearch');
 function filterCases(){
  let count=0;
  document.querySelectorAll('[data-case-card]').forEach(card=>{
   card.hidden=(filter?.value!=='all'&&card.dataset.status!==filter.value)||
    (!!search?.value.trim()&&!card.dataset.search.includes(search.value.trim().toLowerCase()));
   if(!card.hidden)count++;
  });
  if($('#vatraControlReportEmpty'))$('#vatraControlReportEmpty').hidden=count>0;
 }
 filter?.addEventListener('change',filterCases);search?.addEventListener('input',filterCases);
 document.querySelectorAll('[data-open-case]').forEach(b=>b.addEventListener('click',()=>{
  const row=data.cases.find(c=>String(c.id)===b.dataset.openCase);
  if(!row)return;
  show(navbar()+caseDetail(row),'Розгляд скарги №'+row.id,'adminCenter');
  installTabs();
  $('[data-case-back]')?.addEventListener('click',()=>void renderDashboard());
  $('[data-case-moderate]')?.addEventListener('click',event=>{
    const button=event.currentTarget;
    activeTab=button.dataset.caseModerate==='profile'?'accounts':'communities';
    void renderDashboard().then(()=>{
      const form=$('form[data-control-ban]');if(!form)return;
      form.elements.target.value=button.dataset.caseTarget;
      form.elements.reason.value='За результатами скарги №'+row.id+': '+(reasons[row.reason]||row.reason);
      form.elements.target.focus();
    });
  });
  $('[data-case-content]')?.addEventListener('click',event=>{
    const button=event.currentTarget;activeTab='content';
    void renderDashboard().then(()=>{
      const form=$('form[data-control-content]');if(!form)return;
      form.elements.path.value=button.dataset.caseContent;
      form.elements.reason.value='За скаргою №'+row.id+': '+(reasons[row.reason]||row.reason);
      form.elements.path.focus();
    });
  });
  $('form[data-control-report]')?.addEventListener('submit',async e=>{
   e.preventDefault();
   const form=e.currentTarget,status=form.elements.status.value,response=form.elements.response.value.trim();
   if(!(await askAction('Зберегти рішення щодо скарги №'+row.id+'?', 'Статус: '+(statuses[status]||status))))return;
   const button=form.querySelector('[type=submit]');button.disabled=true;
   try{
    await rpc('vatra_admin_review_report',{_case_id:row.id,_status:status,_response:response});
    toastInline(form.querySelector('.vatra-control-status'),'Рішення записано. Автор скарги зможе прочитати відповідь.',true);
    setTimeout(()=>{if(document.body.dataset.page==='adminCenter')void renderDashboard();},900);
   }catch(error){toastInline(form.querySelector('.vatra-control-status'),errorText(error));}
   finally{button.disabled=false;}
  });
 }));
 document.querySelectorAll('form[data-control-ban]').forEach(form=>form.addEventListener('submit',async e=>{
  e.preventDefault();
  const submitter=e.submitter,ban=submitter?.value!=='unban',target=form.elements.target.value.trim(),reason=form.elements.reason.value.trim(),hours=Number(form.elements.hours.value)||0,type=form.dataset.controlBan;
  if(!target||ban&&reason.length<3){toastInline(form.querySelector('.vatra-control-status'),'Заповніть ціль і причину блокування.');return;}
  const label=ban?'Заблокувати':'Розблокувати';
  if(!(await askAction(label+' '+target+'?',reason||'Дію буде записано в журналі.',{danger:ban})))return;
  form.querySelectorAll('button').forEach(btn=>btn.disabled=true);
  try{
   const method=type==='accounts'?'vatra_admin_set_account_ban':'vatra_admin_set_group_ban';
   const args=type==='accounts'?{_handle:target,_ban:ban,_reason:reason,_hours:hours}:{_group_id:target,_ban:ban,_reason:reason,_hours:hours};
   await rpc(method,args);
   toastInline(form.querySelector('.vatra-control-status'),(ban?'Блокування застосовано.':'Блокування знято.'),true);
   setTimeout(()=>{if(document.body.dataset.page==='adminCenter')void renderDashboard();},900);
  }catch(error){toastInline(form.querySelector('.vatra-control-status'),errorText(error));}
  finally{form.querySelectorAll('button').forEach(btn=>btn.disabled=false);}
 }));
 $('form[data-control-content]')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,hide=e.submitter?.value!=='restore',path=form.elements.path.value.trim(),reason=form.elements.reason.value.trim();
  if(!path||hide&&reason.length<3){toastInline(form.querySelector('.vatra-control-status'),'Вкажіть матеріал та причину.');return;}
  if(!(await askAction((hide?'Приховати':'Відновити')+' матеріал '+path+'?',reason||'Рішення буде в журналі.',{danger:hide})))return;
  form.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   await rpc('vatra_admin_set_content_hidden',{_content_path:path,_hide:hide,_reason:reason});
   toastInline(form.querySelector('.vatra-control-status'),hide?'Матеріал приховано.':'Матеріал відновлено.',true);
   setTimeout(()=>{if(document.body.dataset.page==='adminCenter')void renderDashboard();},800);
  }catch(error){toastInline(form.querySelector('.vatra-control-status'),errorText(error));}
  finally{form.querySelectorAll('button').forEach(b=>b.disabled=false);}
 });
 $('form[data-control-verify]')?.addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget,grant=e.submitter?.value!=='revoke',handle=form.elements.handle.value.trim().replace(/^@/,'');
  if(!/^[\p{L}\p{N}._-]{2,24}$/u.test(handle)){toastInline(form.querySelector('.vatra-control-status'),'Перевірте @псевдонім.');return;}
  if(!(await askAction((grant?'Видати':'Забрати')+' галочку для @'+handle+'?', 'Статус буде прив’язаний до незмінного ID акаунта.')))return;
  form.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   await rpc('vatra_set_verification_by_handle',{_handle:handle,_verified:grant});
   toastInline(form.querySelector('.vatra-control-status'),(grant?'Галочку видано.':'Галочку відкликано.'),true);
  }catch(error){toastInline(form.querySelector('.vatra-control-status'),errorText(error));}
  finally{form.querySelectorAll('button').forEach(b=>b.disabled=false);}
 });
}
async function openAdmin(){
 if(!(await checkRole(true)))return;
 if(!adminOpen)activeTab='reports';
 await renderDashboard();
}
window.vatraAdminResetState=()=>{
 adminOpen=false;adminPending=false;activeTab='reports';caseLimit=300;auditLimit=200;identities.clear();loadingToken++;
};
// Restore an accidentally overwritten admin view only while the URL still points here.
let lastAdminRecover=0;
setInterval(()=>{
 if(!signedUid()||!adminOpen||adminPending||location.hash!=='#/admin'||document.body.dataset.page==='adminCenter')return;
 if(Date.now()-lastAdminRecover<7500)return;
 lastAdminRecover=Date.now();void renderDashboard();
},1900);
window.vatraOpenAdminCenter=openAdmin;
async function myReports(){
 if(!signedUid())return;
 show('<section class="vatra-control-card"><h3>Мої звернення до модерації</h3><p>Тут з’являються відповіді адміністратора на Ваші скарги.</p><p class="vatra-control-muted">Завантаження…</p></section>','Мої скарги','myReports');
 try{
  const {data,error}=await client.from('vatra_moderation_cases').select('id,target_type,target_id,reason,details,status,admin_response,created_at,reviewed_at').eq('reporter_uid',signedUid()).order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  if(document.body.dataset.page!=='myReports')return;
  show('<section class="vatra-control-card"><h3>Мої звернення</h3><p>Звернення, статус їх розгляду та відповіді ВАТРИ.</p><div class="vatra-control-report-list">'+
   ((data||[]).map(c=>'<article class="vatra-control-case"><div class="vatra-control-case-title"><strong>№'+c.id+' · '+esc(c.target_type)+'</strong><span class="vatra-control-state state-'+esc(c.status)+'">'+esc(statuses[c.status]||c.status)+'</span></div>'+
   '<small>'+time(c.created_at)+' · '+esc(reasons[c.reason]||c.reason)+'</small><p>'+esc(c.details||'Опис не додано.')+'</p>'+
   (c.admin_response?'<div class="vatra-control-reply"><strong>Відповідь ВАТРИ</strong><p>'+esc(c.admin_response)+'</p><small>'+time(c.reviewed_at)+'</small></div>':'')+'</article>').join('')||
    '<p class="vatra-control-muted">Ваших скарг поки немає.</p>')+
   '</div></section>','Мої скарги','myReports');
 }catch(error){
  show('<section class="vatra-control-card"><h3>Список звернень тимчасово недоступний</h3><p>Потрібна SQL-міграція адміністративної панелі.</p><p>'+esc(errorText(error))+'</p></section>','Мої скарги','myReports');
 }
}
window.vatraOpenMyReports=myReports;
async function installSettingsLinks(){
 const form=$('#profileSettingsForm'),nav=$('.vatra-settings-nav');
 if(!form||!nav||document.body.dataset.page!=='settings'||!signedUid())return;
 if(!nav.querySelector('[data-vatra-my-reports]')){
  const btn=document.createElement('button');
  btn.type='button';btn.className='vatra-settings-nav-button';btn.dataset.vatraMyReports='true';
  btn.textContent='Мої скарги';btn.addEventListener('click',()=>void myReports());nav.append(btn);
 }
 if(!nav.querySelector('[data-vatra-admin-entry]')&&await checkRole()){
  if(!nav.isConnected||document.body.dataset.page!=='settings')return;
  const button=document.createElement('button');button.type='button';
  button.className='vatra-settings-nav-button vatra-control-admin-entry';
  button.dataset.vatraAdminEntry='true';
  button.innerHTML=icons.shield+' Адмінпанель ВАТРИ';
  button.addEventListener('click',()=>void openAdmin());nav.append(button);
 }
}
new MutationObserver(()=>{
 if(paintPending)return;paintPending=true;
 requestAnimationFrame(()=>{paintPending=false;void installSettingsLinks();});
}).observe(document.body,{subtree:true,childList:true});
void installSettingsLinks();
// A compact count on the bell lets an admin notice new reports without opening settings.
// Poll while the site is open; it does not rely on push or background monitoring.
async function checkQueue(){
 if(!signedUid()||!(await checkRole())||!['owner','admin','moderator','support'].includes(staffRole))return;
 const {count,error}=await client.from('vatra_moderation_cases').select('id',{count:'exact',head:true}).eq('status','open');
 if(error)return;
 const bell=$('#notificationBell');if(!bell)return;
 let badge=bell.querySelector('.vatra-admin-report-count');
 if(!badge){badge=document.createElement('span');badge.className='vatra-admin-report-count';badge.setAttribute('aria-label','Нові скарги модерації');bell.append(badge);}
 badge.hidden=!count;badge.textContent=count>99?'99+':String(count||0);
}
setInterval(()=>{void checkQueue();},90000);
setTimeout(()=>{void checkQueue();},3000);


/* Inform the affected person about an actual server-enforced publication ban.
   This does not pretend to disable Supabase Auth sign-in. */
async function refreshOwnRestriction(){
 const uid=signedUid(),existing=document.querySelector('#vatraOwnRestriction');
 if(!uid){existing?.remove();return;}
 try{
  const {data,error}=await client.from('vatra_moderation_account_bans')
    .select('active,reason,expires_at').eq('user_id',uid).maybeSingle();
  if(error)return;
  const active=data?.active&&(!data.expires_at||new Date(data.expires_at)>new Date());
  if(!active){existing?.remove();return;}
  let box=existing;
  if(!box){box=document.createElement('aside');box.id='vatraOwnRestriction';box.className='vatra-own-restriction';box.setAttribute('role','status');document.body.append(box);}
  const until=data.expires_at?'До '+time(data.expires_at):'Без визначеного строку';
  box.replaceChildren();
  const head=document.createElement('strong');head.textContent='Дії акаунта обмежено адміністрацією ВАТРИ';
  const description=document.createElement('span');
  description.textContent='Публікації та взаємодії тимчасово недоступні. '+until+'. Причина: '+(data.reason||'не вказана')+'.';
  box.append(head,description);
 }catch(error){console.warn('[VATRA moderation] Could not verify own restriction',error?.message);}
}
setTimeout(()=>{void refreshOwnRestriction();},4400);
setInterval(()=>{void refreshOwnRestriction();},120000);


/* Restore admin and report deep links after Supabase finishes session recovery. */
function restoreModerationDeepLink(){
 if(!signedUid())return;
 if(location.hash==='#/admin'&&document.body.dataset.page!=='adminCenter')void openAdmin();
 if(location.hash==='#/my-reports'&&document.body.dataset.page!=='myReports')void myReports();
 if(document.body.dataset.page==='settings')void installSettingsLinks();
}
for(const delay of [1200,2800,5200,8500])setTimeout(restoreModerationDeepLink,delay);
