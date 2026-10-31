(function(){
/* VATRA: role-specific admin widgets. Loaded before vatra-admin-center.js. */
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roles={admin:'Адміністратор',moderator:'Модератор',support:'Техпідтримка',verifier:'Верифікатор'};
const staffGuides={
 owner:{title:'Власник мережі',tasks:['Визначає правила платформи та перевіряє дії співробітників','Призначає і звільняє працівників виключно за UID','Контролює всі службові звернення, законність блокувань і відповіді користувачам','Забезпечує перегляд спірних рішень та відновлення помилково обмеженого доступу'],can:['Всі наявні модулі адмінпанелі','Перепризначати й переглядати службові звернення','Змінювати ролі персоналу'],cannot:['Використовувати персональні дані без службової причини','Вимагати паролі, коди доступу та приватні повідомлення користувачів']},
 admin:{title:'Адміністратор',tasks:['Розглядає скарги та документує рішення','Здійснює обґрунтовані блокування акаунтів і спільнот','Працює з заявками на верифікацію та модерацією контенту','Передає складні ситуації власнику'],can:['Застосовувати санкції та переглядати скарги','Схвалювати заявки на верифікацію'],cannot:['Призначати інших працівників','Знімати власника з посади','Читати звернення, призначені іншій техпідтримці, або особисті чати']},
 moderator:{title:'Модератор',tasks:['Перевіряє скарги на матеріали','Приховує порушення правил без безповоротного видалення','Фіксує причини та відновлює матеріали після перегляду рішення'],can:['Розглядати скарги','Приховувати й відновлювати контент'],cannot:['Блокувати акаунти чи спільноти','Видавати галочки','Призначати посади']},
 support:{title:'Спеціаліст техпідтримки',tasks:['Ввічливо відповідає на призначені звернення','Уточнює проблему та надає інструкції без розголошення даних','Вчасно позначає статус звернення й передає випадки власнику','Веде офіційне листування лише у службовому діалозі ВАТРИ'],can:['Відповідати в призначених діалогах','Приймати непризначені звернення','Розглядати скарги й повідомляти результат'],cannot:['Читати чужі або приватні чати користувачів','Вимагати пароль чи одноразові коди','Блокувати акаунти, спільноти або видавати галочки']},
 verifier:{title:'Спеціаліст із верифікації',tasks:['Перевіряє обґрунтованість офіційних акаунтів і спільнот','Працює лише з публічними доказами й відомостями заявки','Пояснює заявникові позитивне або негативне рішення'],can:['Видавати та відкликати галочки','Розглядати заявки на верифікацію'],cannot:['Блокувати користувачів','Керувати працівниками','Відкривати звернення техпідтримки']}
};
window.vatraAdminExtras={
 policy(role){
  const r=staffGuides[role]||staffGuides.support;
  const block=(header,entries)=>'<section class="vatra-control-card"><h3>'+e(header)+'</h3><ul class="vatra-staff-rules">'+entries.map(x=>'<li>'+e(x)+'</li>').join('')+'</ul></section>';
  return '<section class="vatra-control-card"><p class="vatra-control-overline">ОФІЦІЙНІ ПОСАДОВІ ІНСТРУКЦІЇ ВАТРИ</p><h3>'+e(r.title)+'</h3>'+
   '<p>Діють у межах доступу, наданого роллю в Supabase. Службові рішення й повідомлення підлягають перевірці власником мережі.</p>'+
   '<a href="https://github.com/MykolaKolisnyk/VATRA/blob/main/VATRA/STAFF-RULES.md" target="_blank" rel="noopener noreferrer">Відкрити повні правила персоналу</a></section>'+
   block('Обов’язки',r.tasks)+block('Дозволено',r.can)+block('Заборонено',r.cannot)+
   '<section class="vatra-control-card"><h3>Конфіденційність і відповідальність</h3><p>Працівник не має права передавати інформацію зі звернень стороннім, використати повноваження у власних інтересах або приховувати службові дії. Власник може відкликати посаду в будь-який момент. Всі дії виконуються за правилами ВАТРИ.</p></section>';
 },
 groupForm(){
  return '<section class="vatra-control-card"><h3>Верифікація спільнот</h3><p>Статус прив’язується до ID спільноти. Після схвалення власник отримає сповіщення.</p>'+
   '<form data-vatra-verify-community><label>ID спільноти<input name="group" required maxlength="128" placeholder="ID спільноти"></label>'+
   '<div class="vatra-control-actions"><button type="submit" class="vatra-control-primary" name="action" value="approve">Видати галочку</button>'+
   '<button type="submit" class="vatra-control-secondary" name="action" value="revoke">Зняти галочку</button></div>'+
   '<p class="vatra-control-status" role="status"></p></form></section>';
 },
 requests(items){
  const rows=(items||[]).map(x=>'<article class="vatra-control-case"><div class="vatra-control-case-title"><strong>Заявка №'+x.id+' · '+(x.target_kind==='account'?'Акаунт':'Спільнота')+'</strong>'+
   '<span class="vatra-control-state">'+e(x.status)+'</span></div><small>Заявник: '+e(x.applicant_uid)+' · ID: '+e(x.target_id)+'</small>'+
   '<p>'+e(x.explanation)+'</p>'+(x.reference_url?'<a rel="noopener noreferrer" href="'+e(x.reference_url)+'" target="_blank">Переглянути підтвердження</a>':'')+
   (x.status==='pending'?'<form data-vatra-review-request="'+x.id+'"><label>Пояснення рішення<textarea name="response" minlength="4" maxlength="1500" rows="3" required placeholder="Результат перевірки"></textarea></label>'+
    '<div class="vatra-control-actions"><button class="vatra-control-primary" type="submit" name="action" value="approve">Схвалити</button><button class="vatra-control-secondary" type="submit" name="action" value="reject">Відхилити</button></div>'+
    '<p class="vatra-control-status" role="status"></p></form>':'<p>Відповідь: '+e(x.response||'—')+'</p>')+'</article>').join('');
  return '<section class="vatra-control-card"><h3>Заявки на верифікацію</h3><p>Розглядайте особисті заявки та запити творців спільнот.</p>'+
  '<div class="vatra-control-report-list">'+(rows||'<p class="vatra-control-muted">Поки немає заявок.</p>')+'</div></section>';
 },
 team(rows){
  return '<div class="vatra-control-columns"><section class="vatra-control-card"><h3>Персонал ВАТРИ</h3><p>Лише власник може призначати та відкликати посади за UID.</p>'+
   '<form data-vatra-team><label>UID працівника<input type="text" name="uid" required maxlength="36" placeholder="UUID із Supabase Authentication"></label>'+
   '<label>Посада<select name="role">'+Object.entries(roles).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+
   '<option value="remove">Зняти всі права</option></select></label>'+
   '<p class="vatra-control-muted">Адміністратор — скарги, блокування й галочки. Модератор — скарги й матеріали. Техпідтримка — відповіді на скарги. Верифікатор — заявки й галочки. Лише власник керує командою.</p>'+
   '<button type="submit" class="vatra-control-primary">Зберегти роль</button><p class="vatra-control-status" role="status"></p></form></section>'+
   '<section class="vatra-control-card"><h3>Призначені працівники</h3>'+
   ((rows||[]).map(x=>'<article class="vatra-control-ban-row"><span>'+e(x.user_id)+'</span><small>'+e(roles[x.role]||x.role)+'</small>'+
   '<button type="button" data-vatra-staff-remove="'+e(x.user_id)+'" class="vatra-control-secondary">Зняти права</button></article>').join('')||
    '<p class="vatra-control-muted">Призначень немає.</p>')+'</section></div>';
 },
 install(data,refresh,ask,rpc,notify){
  document.querySelectorAll('form[data-vatra-review-request]').forEach(form=>form.addEventListener('submit',async ev=>{
   ev.preventDefault();const id=Number(form.dataset.vatraReviewRequest),approve=ev.submitter?.value==='approve',
    response=form.elements.response.value.trim(),status=form.querySelector('.vatra-control-status');
   if(response.length<4){notify(status,'Поясніть рішення.');return;}
   if(!(await ask((approve?'Схвалити':'Відхилити')+' заявку №'+id+'?',response,{danger:!approve})))return;
   form.querySelectorAll('button').forEach(x=>x.disabled=true);
   try{await rpc('vatra_review_verification',{_id:id,_approve:approve,_response:response});notify(status,'Рішення надіслано заявникові.',true);setTimeout(refresh,850);}
   catch(err){notify(status,err.message||'Помилка Supabase');}
   finally{form.querySelectorAll('button').forEach(x=>x.disabled=false);}
  }));
  document.querySelector('form[data-vatra-verify-community]')?.addEventListener('submit',async ev=>{
   ev.preventDefault();const form=ev.currentTarget,grant=ev.submitter?.value==='approve',
    group=form.elements.group.value.trim(),status=form.querySelector('.vatra-control-status');
   if(!(await ask((grant?'Видати':'Зняти')+' галочку спільноти '+group+'?','Зміна статусу зберігається за ID спільноти.')))return;
   try{await rpc('vatra_verify_group',{_group:group,_verified:grant});notify(status,'Статус спільноти оновлено.',true);}
   catch(err){notify(status,err.message||'Помилка Supabase');}
  });
  document.querySelector('form[data-vatra-team]')?.addEventListener('submit',async ev=>{
   ev.preventDefault();const form=ev.currentTarget,uid=form.elements.uid.value.trim(),role=form.elements.role.value,
    status=form.querySelector('.vatra-control-status');
   if(!/^[0-9a-f-]{36}$/i.test(uid)){notify(status,'Потрібен коректний UID акаунта.');return;}
   if(!(await ask('Змінити повноваження '+uid+'?',role==='remove'?'Зняти посаду':roles[role],{danger:role==='remove'})))return;
   try{await rpc('vatra_owner_set_staff',{_uid:uid,_role:role==='remove'?null:role});notify(status,'Повноваження оновлено.',true);setTimeout(refresh,900);}
   catch(err){notify(status,err.message||'Помилка Supabase');}
  });
  document.querySelectorAll('[data-vatra-staff-remove]').forEach(button=>button.addEventListener('click',async()=>{
   const uid=button.dataset.vatraStaffRemove;
   if(!(await ask('Зняти всі повноваження з '+uid+'?','Доступ до адмінпанелі буде відкликано.',{danger:true})))return;
   try{await rpc('vatra_owner_set_staff',{_uid:uid,_role:null});refresh();}
   catch(err){button.title=err.message||'Помилка';}
  }));
 }
};
})();
