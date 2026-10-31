/* VATRA: role-specific admin widgets. Loaded before vatra-admin-center.js. */
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roles={admin:'Адміністратор',moderator:'Модератор',support:'Техпідтримка',verifier:'Верифікатор'};
window.vatraAdminExtras={
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