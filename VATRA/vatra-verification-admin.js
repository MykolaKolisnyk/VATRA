/* VATRA: owner-controlled blue check admin panel. Requires vatra-unique-handles-verification.sql */
import {initializeApp,getAuth,getDatabase} from './vatra-backend.js?v=20261031-4';
const auth=getAuth(initializeApp()),client=getDatabase(initializeApp()).client;
let checkedUid='',isAdmin=false,checking=false;
async function ensureAdmin(){
 const uid=auth.currentUser?.uid||'';
 if(!uid){checkedUid='';isAdmin=false;return false;}
 if(checkedUid===uid)return isAdmin;
 if(checking)return false;
 checking=true;
 try{
  const {data,error}=await client.rpc('vatra_is_verification_admin');
  if(error)throw error;
  checkedUid=uid;isAdmin=data===true;
 }catch(error){checkedUid=uid;isAdmin=false;console.info('[VATRA] Verification administration is unavailable until the secure SQL migration is installed.');}
 finally{checking=false;}
 return isAdmin;
}
/* VATRA-branded confirmation; never invoke the browser's native confirm(). */
function confirmVerification(handle,grant){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');
  dialog.className='vatra-verify-confirm-dialog';
  dialog.setAttribute('aria-labelledby','vatraVerifyConfirmHeading');
  dialog.setAttribute('aria-describedby','vatraVerifyConfirmDescription');
  const verb=grant?'Видати галочку':'Забрати галочку';
  dialog.innerHTML=
   '<section class="vatra-verify-confirm-content">'+
    '<header class="vatra-verify-confirm-header">'+
     '<span class="vatra-verify-confirm-symbol" aria-hidden="true">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2.5 2.7 1.4 3-.2.9 2.9 2.5 1.8-1.1 2.9 1.1 2.9-2.5 1.8-.9 2.9-3-.2L12 20.2l-2.7-1.5-3 .2-.9-2.9-2.5-1.8L4 11.3 2.9 8.4l2.5-1.8.9-2.9 3 .2L12 2.5Z"/><path d="m8.3 11.3 2.4 2.3 5.1-5.2"/></svg>'+
     '</span>'+
     '<div><p class="vatra-verify-confirm-kicker">ВАТРА · ВЕРИФІКАЦІЯ</p>'+
      '<h2 id="vatraVerifyConfirmHeading">'+(grant?'Підтвердити видачу':'Підтвердити відкликання')+'</h2>'+
     '</div>'+
     '<button type="button" class="vatra-verify-confirm-close" data-vatra-verify-cancel aria-label="Закрити">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5 19 19M19 5 5 19"/></svg>'+
     '</button>'+
    '</header>'+
    '<p id="vatraVerifyConfirmDescription" class="vatra-verify-confirm-description">'+
      (grant?'Надати офіційний статус акаунту':'Прибрати офіційний статус акаунта')+
      ' <strong data-vatra-verify-handle></strong>?</p>'+
    '<p class="vatra-verify-confirm-note">'+(grant
      ?'Синя галочка зберігатиметься за ID користувача, навіть якщо він змінить псевдонім.'
      :'Після відкликання синя галочка більше не показуватиметься поруч з іменем.')+'</p>'+
    '<footer class="vatra-verify-confirm-actions">'+
      '<button type="button" class="vatra-verify-confirm-cancel" data-vatra-verify-cancel>Скасувати</button>'+
      '<button type="button" class="vatra-verify-confirm-submit" data-vatra-verify-confirm>'+
        '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.2 4.2L19 6.5"/></svg>'+
        verb+
      '</button>'+
    '</footer>'+
   '</section>';
  dialog.querySelector('[data-vatra-verify-handle]').textContent='@'+handle;
  document.body.append(dialog);
  dialog.querySelectorAll('[data-vatra-verify-cancel]').forEach(button=>button.addEventListener('click',()=>dialog.close('cancel')));
  dialog.querySelector('[data-vatra-verify-confirm]').addEventListener('click',()=>dialog.close('confirm'));
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close('cancel');});
  dialog.addEventListener('close',()=>{
   const approved=dialog.returnValue==='confirm';
   dialog.remove();
   resolve(approved);
  },{once:true});
  dialog.showModal();
  dialog.querySelector('[data-vatra-verify-confirm]').focus();
 });
}

let frame=false;
async function paint(){
 if(document.body.dataset.page!=='settings')return;
 const form=document.querySelector('#profileSettingsForm');
 if(!form||form.querySelector('#vatraVerifyAdmin'))return;
 if(!(await ensureAdmin()))return;
 if(!form.isConnected||document.body.dataset.page!=='settings')return;
 const section=document.createElement('section');
 section.className='settings-card vatra-verification-panel';section.id='vatraVerifyAdmin';
 section.innerHTML='<h3>Верифікація офіційних акаунтів</h3><p class="muted">Видавайте та відкликайте синю галочку за унікальним @псевдонімом. Галочка зберігається за ID акаунта після зміни псевдоніма.</p>'+
  '<label>Псевдонім (@)<input type="text" name="targetHandle" maxlength="25" placeholder="@псевдонім" autocomplete="off"></label>'+
  '<div class="vatra-verification-actions"><button type="button" class="primary" data-verify-choice="true">Видати галочку</button>'+
  '<button type="button" class="pill" data-verify-choice="false">Забрати галочку</button></div>'+
  '<p class="vatra-verification-result" role="status" aria-live="polite"></p>';
 const savebar=form.querySelector('.settings-savebar');
 if(savebar)savebar.before(section);else form.append(section);
 section.addEventListener('click',async e=>{
  const button=e.target.closest('[data-verify-choice]');if(!button)return;
  const handle=section.querySelector('input').value.trim().replace(/^@/,'');
  const status=section.querySelector('.vatra-verification-result'),value=button.dataset.verifyChoice==='true';
  if(!/^[\p{L}\p{N}._-]{2,24}$/u.test(handle)){status.textContent='Введіть правильний @псевдонім (2–24 символи).';return;}
  if(!(await confirmVerification(handle,value)))return;
  section.querySelectorAll('button').forEach(b=>b.disabled=true);
  status.textContent='Перевіряємо акаунт у Supabase…';
  try{
   const {data,error}=await client.rpc('vatra_set_verification_by_handle',{_handle:handle,_verified:value});
   if(error)throw error;
   const row=Array.isArray(data)?data[0]:data;
   status.textContent=(value?'Галочку видано':'Галочку відкликано')+' для @'+(row?.handle||handle)+'. Статус закріплений за ID акаунта.';
  }catch(error){status.textContent='Не вдалося змінити верифікацію: '+(error?.message||'Перевірте SQL та права.');}
  finally{section.querySelectorAll('button').forEach(b=>b.disabled=false);}
 });
}
new MutationObserver(()=>{if(frame)return;frame=true;requestAnimationFrame(()=>{frame=false;void paint();});}).observe(document.body,{subtree:true,childList:true});
void paint();