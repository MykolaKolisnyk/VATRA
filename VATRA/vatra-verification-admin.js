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
  if(!confirm((value?'Видати':'Забрати')+' офіційну галочку акаунту @'+handle+'?'))return;
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