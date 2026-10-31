import { ensureIdentity, prepareSession, encryptMessage, decryptMessage } from './vatra-e2ee.js?v=2';
import { setupNavigation } from './navigation.js?v=20261030-22';
import { openVatraPhotoStudio } from './vatra-photo-studio.js?v=20261031-2';
import { setupPostComposer } from './vatra-post-composer.js?v=20261031-1';
import { vatraShowMusic, vatraMusicRouteChanged } from './vatra-music.js?v=20261030-5';
import { initializeApp, getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail, getDatabase, ref, push, createPost, set, update, onValue, remove, get, uploadMedia, updatePhoneNumber, verifyPhoneChange, acceptFriendRequest, removeFriendship, repairMyFriendships, listProfileFriends } from './vatra-backend.js?v=20261030-5';

const app=initializeApp(), auth=getAuth(app), db=getDatabase(app);
window.__vatraBackendLoaded=true;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const navigation=setupNavigation(p=>goPage(p));
const modal=$('#composer'), authDialog=$('#authDialog'), feed=$('#feed'), toast=$('#toast');
let verifiedUsers={},currentUser=null,currentProfile={},privateDateOfBirth='',privatePhone='',privatePendingPhone='',privateProfileSections={},activityReadAt=0,chatReads={},users={},friendProfiles={},posts={},likes={},comments={},pollVotes={},postSaves={},postShares={},saved={},following={},blockedUsers={},videos={},groups={},groupMembers={},groupAdmins={},groupModerators={},groupPostsCache={},friendRequests={},friends={},chatIndex={},chatLiveIndex={},chatOwnedIndex={},activeChat=null,activeChatBlocked=false,activeProfileUid=null,reportingTarget=null,chatMessages={},unsubscribers=[],page='feed',filter='all',query='',authMode='login',imageFile=null,videoFile=null,groupId=null,editingPostId=null,replyingComment=null,imageFiles=[],editPostFiles=[],editPostPreviewUrls=[],imagePreviewUrls=[];
let profileAttributeSearch=null;
const MAX_POST_TEXT=20000,MAX_IMAGE=15*1024*1024,MAX_VIDEO=50*1024*1024,EMOJIS=['😀','😂','🥰','😍','😊','😉','😎','😭','❤️','🔥','👍','🙏','🎉','🤔','😢','👏','💙','✨','🌻','🇺🇦'];const VATRA_EMOJI_CATEGORIES=[
 {id:'popular',label:'Часті',icon:'★',emojis:['😀','😂','🥰','😍','😊','😉','😎','😭','❤️','🔥','👍','🙏','🎉','🤔','😢','👏','💙','✨','🌻','🇺🇦','🫶','💯','🥹','🙌','🤝','🫡','😴','✅']},
 {id:'smileys',label:'Обличчя',icon:'☺',emojis:['😀','😃','😄','😁','😆','😅','🤣','😂','🥹','😊','😇','🙂','🙃','😉','😍','🥰','😘','😗','😋','😛','😜','🤪','😝','🫠','🤗','🤭','🫢','🤫','🤔','🫡','🤩','🥳','😎','🥸','😒','🙄','😔','😕','🙁','☹️','😣','😖','😫','🥺','😢','😭','😤','😠','😡','🤯','😳','😱','😨','😴','😪','🤤','🤒','🤕','🤢','🤧','🥶','🥵','😷']},
 {id:'gestures',label:'Жести',icon:'✋',emojis:['👍','👎','👏','🙌','🫶','🤝','🙏','👋','🤚','✋','🖐️','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✊','👊','🤛','🤜','💪','🫵','🖖','💅','🧠','👀','🗣️']},
 {id:'hearts',label:'Почуття',icon:'♥',emojis:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','🩷','🩵','🩶','💖','💗','💓','💞','💕','💘','💝','💟','❣️','❤️‍🔥','💔','💯','💢','💥','✨','💫','⭐','🌟','💦','💤']},
 {id:'nature',label:'Природа',icon:'☀',emojis:['🌻','🌹','🌷','🌸','🌼','🌺','🍀','🌲','🌳','🌿','🍁','🍂','🍃','🌈','☀️','🌤️','⛅','🌧️','⛈️','❄️','☃️','🔥','🌊','🌍','🌎','🌏','🌙','🌕','⭐','🌟','🐱','🐶','🦊','🐻','🐼','🐸','🦋','🐝','🐦','🦉']},
 {id:'things',label:'Предмети',icon:'♫',emojis:['🎉','🎊','🎁','🎂','🎈','🎀','🎵','🎶','🎧','🎤','🎸','🎹','🥁','📷','📸','🎥','🎬','📱','💻','⌨️','📚','📖','✏️','📝','💡','🔔','🔑','🗝️','📌','📍','🧭','🕹️','🎮','🏆','🥇','⚽','🏀','🚗','🚆','✈️','🏠','🛡️','🇺🇦','✅','❌','❗','❓']}
];
const VATRA_EMOJI_TAGS={'❤️':'серце любов кохання','🔥':'вогонь полум’я','🇺🇦':'україна прапор','😂':'сміх смішно','😭':'сльози плач','😍':'кохання захоплення','🎉':'свято радість','💙':'синє серце','👍':'лайк подобається','🙏':'дякую молитва','🫶':'серце руки','🌻':'соняшник','🎵':'музика','📷':'фото камера','💡':'ідея','🎮':'ігри'};
const VATRA_SMILE_SVG='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M8 14.5q4 4 8 0"/><path d="M8.5 9.5h.01M15.5 9.5h.01"/></svg>';
function emojiControl(){
 return '<div class="emoji-picker-wrap vatra-emoji-wrap"><button type="button" class="emoji-toggle vatra-emoji-trigger" data-emoji-toggle aria-label="Вибрати емодзі" aria-haspopup="dialog" aria-expanded="false">'+VATRA_SMILE_SVG+'</button><div class="emoji-picker vatra-emoji-popover" hidden></div></div>';
}
function renderVatraEmojiPanel(panel){
 const text=(panel.querySelector('[data-emoji-search]')?.value||'').trim().toLocaleLowerCase('uk-UA');
 const selected=VATRA_EMOJI_CATEGORIES.find(group=>group.id===panel.dataset.category)||VATRA_EMOJI_CATEGORIES[0];
 const choices=text?[...new Set(VATRA_EMOJI_CATEGORIES.flatMap(group=>group.emojis.filter(emoji=>(emoji+' '+group.label+' '+(VATRA_EMOJI_TAGS[emoji]||'')).toLocaleLowerCase('uk-UA').includes(text))))]:selected.emojis;
 panel.querySelectorAll('[data-emoji-category]').forEach(button=>{
  const active=button.dataset.emojiCategory===selected.id;
  button.classList.toggle('active',active);
  button.setAttribute('aria-pressed',String(active));
 });
 const grid=panel.querySelector('[data-emoji-grid]');
 if(grid)grid.innerHTML=choices.length?choices.slice(0,140).map(emoji=>'<button type="button" data-insert-emoji="'+emoji+'" aria-label="Додати '+emoji+'">'+emoji+'</button>').join(''):'<p class="vatra-emoji-empty">Нічого не знайдено</p>';
}
function prepareVatraEmojiPanel(panel){
 if(panel.dataset.initialized)return;
 panel.dataset.initialized='true';panel.dataset.category='popular';
 panel.innerHTML='<div class="vatra-emoji-head"><strong>Емодзі</strong><button type="button" data-emoji-close aria-label="Закрити панель">×</button></div>'+
  '<label class="vatra-emoji-search"><span aria-hidden="true">⌕</span><input type="search" data-emoji-search placeholder="Пошук емодзі" aria-label="Пошук емодзі" autocomplete="off"></label>'+
  '<div class="vatra-emoji-categories" role="group" aria-label="Категорії емодзі">'+VATRA_EMOJI_CATEGORIES.map(g=>'<button type="button" data-emoji-category="'+g.id+'" title="'+g.label+'" aria-label="'+g.label+'" aria-pressed="false">'+g.icon+'</button>').join('')+'</div>'+
  '<div class="vatra-emoji-subtitle"></div><div class="emoji-quick-grid vatra-emoji-grid" data-emoji-grid></div>';
 panel.querySelector('[data-emoji-search]')?.addEventListener('input',()=>renderVatraEmojiPanel(panel));
 renderVatraEmojiPanel(panel);
}
document.addEventListener('click',event=>{
 if(event.target.closest('.vatra-emoji-wrap'))return;
 $$('.vatra-emoji-wrap .emoji-picker').forEach(panel=>{panel.hidden=true;panel.closest('.vatra-emoji-wrap')?.querySelector('[data-emoji-toggle]')?.setAttribute('aria-expanded','false');});
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 $$('.vatra-emoji-wrap .emoji-picker').forEach(panel=>{panel.hidden=true;panel.closest('.vatra-emoji-wrap')?.querySelector('[data-emoji-toggle]')?.setAttribute('aria-expanded','false');});
});
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function localISODate(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
function initials(n='ВАТРА'){return n.trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase('uk-UA')||'В';}
function askConfirm(message){return new Promise(resolve=>{const d=$('#vatraConfirmDialog');$('#vatraConfirmMessage').textContent=message;const yes=$('#vatraConfirmYes'),no=$('#vatraConfirmNo');yes.onclick=()=>{d.close();resolve(true)};no.onclick=()=>{d.close();resolve(false)};d.addEventListener('cancel',()=>resolve(false),{once:true});d.showModal();});}
function askText(title,initial=''){return new Promise(resolve=>{const d=$('#vatraTextDialog'),input=$('#vatraTextInput');$('#vatraTextTitle').textContent=title;$('#vatraTextLabel').textContent=title;input.value=initial||'';const yes=$('#vatraTextYes'),no=$('#vatraTextNo');yes.onclick=()=>{const value=input.value.trim();d.close();resolve(value)};no.onclick=()=>{d.close();resolve(null)};d.addEventListener('cancel',()=>resolve(null),{once:true});d.showModal();input.focus();input.select();});}
function toastMsg(s){toast.textContent=s;toast.classList.add('show');clearTimeout(window.vatraToast);window.vatraToast=setTimeout(()=>toast.classList.remove('show'),3600);}
// Only user actions display errors through their own catch handlers.
// Unexpected background exceptions are diagnostic events, not a reason to
// repeatedly cover an otherwise usable page with a generic error banner.
let lastUnhandledToastAt=0;
window.addEventListener('unhandledrejection',event=>{
 console.error('[ВАТРА] Необроблена операція:',event.reason);
 const code=String(event.reason?.code||'');
 if(!['SCHEMA_NOT_READY','PERMISSION_DENIED','NETWORK_ERROR','DATABASE_ERROR'].includes(code))return;
 const now=Date.now();
 if(now-lastUnhandledToastAt<60000)return;
 lastUnhandledToastAt=now;
 try{toastMsg(niceError(event.reason));}catch(error){console.error('[ВАТРА] Не вдалося показати помилку:',error);}
});
window.addEventListener('error',event=>{
 if(!event.error)return;
 // Exact source, line and stack remain in the browser console for debugging.
 // Avoid repeated generic user-facing toasts from background render failures.
 console.error('[ВАТРА] Помилка JavaScript:',event.error);
});

function safeText(s){return esc(s).replace(/__(.+?)__/g,'<u>$1</u>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/_(.+?)_/g,'<em>$1</em>').replace(/~~(.+?)~~/g,'<s>$1</s>').replace(/^&gt; ?(.+)$/gm,'<span class="post-inline-quote">$1</span>').replace(/(#[\p{L}\p{N}_]+)/gu,'<button type="button" class="tag" data-tag="$1">$1</button>').replace(/\n/g,'<br>');}
function authRequired(){if(currentUser)return true;location.href='auth.html';return false;}
async function blockUser(uid){if(!authRequired()||!uid||uid===currentUser.uid)return;if(blockedUsers[uid])return toastMsg('Цей користувач уже заблокований.');if(!(await askConfirm('Заблокувати користувача? Його дописи зникнуть зі стрічки, а цей діалог буде зупинено.')))return;const chat=chatKey(currentUser.uid,uid);try{await set(ref(db,`blockedUsers/${currentUser.uid}/${uid}`),true);}catch(err){return toastMsg(`Не вдалося заблокувати: ${niceError(err)}`);}blockedUsers[uid]=true;const cleanup=[remove(ref(db,`friends/${currentUser.uid}/${uid}`)),remove(ref(db,`friends/${uid}/${currentUser.uid}`)),remove(ref(db,`friendRequests/${currentUser.uid}/${uid}`)),remove(ref(db,`friendRequests/${uid}/${currentUser.uid}`)),remove(ref(db,`following/${currentUser.uid}/${uid}`)),remove(ref(db,`userChats/${currentUser.uid}/${chat}`))];let chatMarkerFailed=false;try{const chatSnap=await get(ref(db,`chats/${chat}`));if(chatSnap.exists())cleanup.push(set(ref(db,`chatBlocks/${chat}/${currentUser.uid}`),true));}catch(err){chatMarkerFailed=true;console.warn('Chat block marker could not be set:',err);}const results=await Promise.allSettled(cleanup);if(activeChat===uid)activeChatBlocked=true;if(page==='publicProfile'&&activeProfileUid)renderPublicProfile(activeProfileUid);else render();const failed=results.filter(x=>x.status==='rejected');toastMsg(failed.length||chatMarkerFailed?'Профіль приховано, але частину зв’язків або блокування чату не вдалося підтвердити. Перевірте опубліковані правила доступу до бази даних.':'Користувача заблоковано; його дописи й діалог приховані.');}
async function unblockUser(uid){if(!authRequired()||!uid)return;const chat=chatKey(currentUser.uid,uid);try{await remove(ref(db,`blockedUsers/${currentUser.uid}/${uid}`));blockedUsers[uid]=false;const snap=await get(ref(db,`chats/${chat}`));if(snap.exists())await remove(ref(db,`chatBlocks/${chat}/${currentUser.uid}`));if(activeChat===uid)activeChatBlocked=false;if(page==='publicProfile'&&activeProfileUid)renderPublicProfile(activeProfileUid);else if(page==='settings')renderSettings();else render();toastMsg('Користувача розблоковано.');}catch(err){toastMsg(`Не вдалося розблокувати: ${niceError(err)}`);}}
function submitReport(targetType,targetId){if(!authRequired()||!targetType||!targetId)return;reportingTarget={type:targetType,id:String(targetId).slice(0,128)};const labels={profile:'профіль користувача',post:'допис',comment:'коментар',groupPost:'допис у спільноті',video:'відео'};$('#reportTargetLabel').textContent=`Скарга на ${labels[targetType]||'матеріал'}. Виберіть причину й опиши проблему, якщо потрібно.`;$('#reportError').textContent='';$('#reportForm').reset();$('#reportDialog').showModal();$('#reportReason').focus();}

function isVatraStrongPassword(password){
 const p=String(password||'');
 return p.length>=12&&/[a-z]/.test(p)&&/[A-Z]/.test(p)&&/[0-9]/.test(p)&&/[!@#$%^&*()_+=[\]{};:'"|<>?,.\/~\-]/.test(p);
}
(function setupModalPasswordStrength(){
 const input=$('#authPassword'),field=$('#passwordField'),hint=$('#passwordHint');
 if(!input||!field||field.dataset.strengthReady)return;
 field.dataset.strengthReady='1';
 input.minLength=12;
 input.placeholder='Щонайменше 12 символів';
 if(hint)hint.textContent='Для захисту: 12+ символів, мала й велика латинські літери, цифра та спеціальний символ. Рекомендовано 16–20 символів або довга парольна фраза. Не використовуйте ім’я, дату народження чи пароль з інших сайтів.';
 const meter=document.createElement('div');meter.className='modal-password-strength';meter.innerHTML='<div class="modal-password-head"><strong>Надійність пароля</strong><span class="modal-password-status">Ще не введено</span></div><div class="modal-password-track"><span></span></div><div class="modal-password-rules"><span data-rule="length">12+ символів</span><span data-rule="lower">мала літера a–z</span><span data-rule="upper">велика літера A–Z</span><span data-rule="number">цифра 0–9</span><span data-rule="symbol">спецсимвол</span></div>';
 field.append(meter);
 const update=()=>{
  const p=input.value,checks={length:p.length>=12,lower:/[a-z]/.test(p),upper:/[A-Z]/.test(p),number:/[0-9]/.test(p),symbol:/[!@#$%^&*()_+=\[\]{};:'"|<>?,.\/~\-]/.test(p)};
  const score=Object.values(checks).filter(Boolean).length;
  const bar=meter.querySelector('.modal-password-track span'),status=meter.querySelector('.modal-password-status');
  bar.style.width=(score*20)+'%';bar.dataset.level=score<3?'weak':score<5?'medium':'strong';
  status.textContent=!p?'Ще не введено':score<3?'Слабкий':score<5?'Середній':'Сильний';
  Object.entries(checks).forEach(([key,ok])=>meter.querySelector('[data-rule="'+key+'"]').classList.toggle('is-met',ok&&!!p));
 };
 input.addEventListener('input',update);update();
})();

function niceError(e){const c=e?.code||'';if(c==='FRIENDS_SQL_REQUIRED')return 'ВАТРА потребує оновлення взаємної дружби: у Supabase SQL Editor виконайте файл VATRA/friends-mutual-fix.sql.';if(c==='CHAT_SQL_REQUIRED'||c==='CHAT_SQL_CONSTRAINT')return e.message;if(c==='SCHEMA_NOT_READY')return 'База ВАТРИ ще не налаштована повністю. У правильному Supabase-проєкті виконайте актуальний файл VATRA/app-data-schema.sql.';if(c==='PERMISSION_DENIED')return 'Supabase відхилив запис через правила доступу (RLS). Перевірте SQL-схему app_data та політики доступу в тому самому проєкті Supabase.'+(e?.dbCode?' Код: '+String(e.dbCode).replace(/[^A-Za-z0-9_-]/g,'').slice(0,24)+'.':'');if(c==='DATABASE_ERROR')return 'Не вдалося зберегти дані ВАТРИ'+(e?.dbCode?' (код '+String(e.dbCode).replace(/[^A-Za-z0-9_-]/g,'').slice(0,24)+')':'')+'. Спробуйте ще раз; якщо повториться, надішліть цей код розробнику.';if(c==='NETWORK_ERROR')return 'Немає з’єднання із сервером ВАТРИ. Перевірте інтернет і спробуйте ще раз.';return ({'auth/no-session':'Сесія завершилася. Увійдіть до ВАТРИ ще раз.','auth/author-mismatch':'Не вдалося підтвердити власника допису. Оновіть сторінку та увійдіть у свій акаунт знову.','auth/email-already-in-use':'Ця електронна пошта вже зареєстрована. Спробуйте увійти.','auth/invalid-email':'Введіть коректну адресу електронної пошти.','auth/weak-password':'Створіть пароль завдовжки щонайменше 12 символів (краще 16+), із великими й малими латинськими літерами, цифрою та спецсимволом.','auth/invalid-credential':'Неправильна електронна пошта або пароль.','auth/invalid-login-credentials':'Неправильна електронна пошта або пароль.','auth/user-not-found':'Акаунт із такою адресою не знайдено.','auth/wrong-password':'Неправильний пароль.','auth/too-many-requests':'Забагато спроб входу. Зачекайте й спробуйте пізніше.','auth/network-request-failed':'Не вдалося з’єднатися із сервером. Перевірте інтернет.','auth/operation-not-allowed':'Вхід через email вимкнений. У налаштуваннях авторизації увімкніть вхід через email і пароль.','auth/unauthorized-domain':'Цей домен не дозволений у налаштуваннях авторизації для цього домену.','auth/user-disabled':'Цей акаунт вимкнено. Зверніться до підтримки.','PERMISSION_DENIED':'Запит відхилено правилами доступу до бази даних.'})[c]||'Не вдалося виконати дію. Спробуйте ще раз.';}
function openAuth(mode='login'){location.href=mode==='register'?'auth.html?mode=register':mode==='reset'?'auth.html?mode=reset':'auth.html';}
function vatraFieldVisibility(value, fallback='private'){
 return ['public','friends','private'].includes(value)?value:fallback;
}
function publicProfileData(p={}){
 const out={
  name:String(p.name||'Користувач ВАТРИ').slice(0,40),firstName:String(p.firstName||'').slice(0,40),
  lastName:String(p.lastName||'').slice(0,40),handle:String(p.handle||'user').slice(0,24),
  bio:'',status:'',avatarUrl:String(p.avatarUrl||''),
  photoUploadedAt:p.profileVisibility==='private'?{}:Object.fromEntries(Object.entries(p.photoUploadedAt||{}).filter(([url,t])=>/^https:\/\//.test(url)&&Number.isFinite(Number(t))).slice(-120)),
   photoAlbums:p.profileVisibility==='private'?[]:vatraGetAlbums(p),
   avatarHistory:p.profileVisibility==='private'?[]:(Array.isArray(p.avatarHistory)?p.avatarHistory.filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)).slice(-30):[]),
  isOnline:p.isOnline===true,lastSeenAt:Number(p.lastSeenAt)||0,
  profilePhotos:p.profileVisibility==='private'?[]:(Array.isArray(p.profilePhotos)?p.profilePhotos.filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)).slice(-120):[]),
  profileVisibility:p.profileVisibility==='private'?'private':'public',searchable:p.searchable!==false,
  birthdayVisibility:vatraFieldVisibility(p.birthdayVisibility),cityVisibility:vatraFieldVisibility(p.cityVisibility),
  locationVisibility:vatraFieldVisibility(p.locationVisibility),phoneVisibility:vatraFieldVisibility(p.phoneVisibility),
  workplaceVisibility:vatraFieldVisibility(p.workplaceVisibility),educationVisibility:vatraFieldVisibility(p.educationVisibility),
  hometownVisibility:vatraFieldVisibility(p.hometownVisibility),
  bioVisibility:vatraFieldVisibility(p.bioVisibility,'public'),
  statusVisibility:vatraFieldVisibility(p.statusVisibility,'public'),
  websiteVisibility:vatraFieldVisibility(p.websiteVisibility,'public'),
  allowMessages:p.allowMessages!==false,createdAt:Number(p.createdAt)||0,
  updatedAt:Number(p.updatedAt)||Number(p.createdAt)||0
 };
 if(out.bioVisibility==='public')out.bio=String(p.bio||'').slice(0,500);
 if(out.statusVisibility==='public')out.status=String(p.status||'').slice(0,100);
 if(out.birthdayVisibility==='public'&&p.dateOfBirth)out.birthdayPublic=String(p.dateOfBirth);
 for(const [field,maxLength] of Object.entries({city:80,location:120,phone:24,workplace:120,education:120,hometown:80,website:180})){
  if(out[field+'Visibility']==='public'&&p[field])out[field]=String(p[field]).slice(0,maxLength);
 }
 out.extraVisibility={};out.publicSections={};
 if(out.profileVisibility!=='private'){
  for(const section of Object.values(VATRA_PROFILE_EXTRA_SECTIONS)){
   for(const key of Object.keys(section.fields)){
    if(vatraFieldVisibility(p.extraVisibility?.[key])!=='public')continue;
    const value=String(p.privateSections?.[key]||'').trim();
    if(value){out.extraVisibility[key]='public';out.publicSections[key]=value.slice(0,500);}
   }
  }
 }
 return out;
}
function friendProfileData(p={}){
 const out={updatedAt:Number(p.updatedAt)||Number(p.createdAt)||0,isOnline:p.isOnline===true,
  lastSeenAt:Number(p.lastSeenAt)||0,
  avatarHistory:Array.isArray(p.avatarHistory)?p.avatarHistory.filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)).slice(-30):[],
  friendSections:{},extraVisibility:{}
 };
 if(vatraFieldVisibility(p.statusVisibility,'public')==='friends'&&p.status)out.status=String(p.status).slice(0,100);
 if(vatraFieldVisibility(p.bioVisibility,'public')==='friends'&&p.bio)out.bio=String(p.bio).slice(0,500);
 if(vatraFieldVisibility(p.websiteVisibility,'public')==='friends'&&p.website)out.website=String(p.website).slice(0,180);
 if(vatraFieldVisibility(p.birthdayVisibility)==='friends'&&p.dateOfBirth)out.birthdayPublic=String(p.dateOfBirth);
 for(const [field,maxLength] of Object.entries({city:80,location:120,phone:24,workplace:120,education:120,hometown:80})){
  if(vatraFieldVisibility(p[field+'Visibility'])==='friends'&&p[field])out[field]=String(p[field]).slice(0,maxLength);
 }
 for(const section of Object.values(VATRA_PROFILE_EXTRA_SECTIONS)){
  for(const key of Object.keys(section.fields)){
   if(vatraFieldVisibility(p.extraVisibility?.[key])!=='friends')continue;
   const value=String(p.privateSections?.[key]||'').trim();
   if(value){out.friendSections[key]=value.slice(0,500);out.extraVisibility[key]='friends';}
  }
 }
 return out;
}

let lastReadToastAt=0;
function watch(path,cb){
 let lastErrorSignature='';
 return onValue(ref(db,path),s=>{
  cb(s.val()||{});
  lastErrorSignature='';
 },err=>{
  console.error('[ВАТРА] Не вдалося прочитати:',path,err);
  const signature=String(err?.code||'')+'|'+niceError(err);
  if(signature===lastErrorSignature)return;
  lastErrorSignature=signature;
  // One meaningful notification across simultaneous listeners, not one
  // toast for each subscribed section during a temporary connectivity issue.
  const now=Date.now();
  if(now-lastReadToastAt<60000)return;
  lastReadToastAt=now;
  toastMsg(`Не вдалося оновити дані ВАТРИ: ${niceError(err)}`);
 });
}
function stopListeners(){unsubscribers.forEach(fn=>fn());unsubscribers=[];}
function renderLoadingSkeletons(){
 if(!feed)return;
 const type=['friends','messages','settings','profile','saved','photos','videos','groups','music','notifications','explore'].includes(page)?page:'feed';
 const line=(size='')=>'<i class="vatra-sk-line '+size+'"></i>';
 const avatar='<i class="vatra-sk-avatar"></i>';
 const rows=n=>Array.from({length:n},()=>'<div class="vatra-sk-person">'+avatar+'<div>'+line('medium')+line('short')+'</div></div>').join('');
 const post=()=>'<article class="vatra-sk-card vatra-sk-post"><div class="vatra-sk-person">'+avatar+'<div>'+line('medium')+line('short')+'</div></div><div class="vatra-sk-copy">'+line()+line()+line('medium')+'</div><div class="vatra-sk-image"></div><div class="vatra-sk-actions">'+line('medium')+line('medium')+'</div></article>';
 const people='<section class="vatra-sk-card vatra-sk-people">'+line('medium')+'<div class="vatra-sk-search"></div>'+rows(4)+'</section>';
 const messenger='<section class="vatra-sk-card vatra-sk-messenger"><div class="vatra-sk-contact-list"><div class="vatra-sk-search"></div>'+rows(5)+'</div><div class="vatra-sk-chat-preview"><div class="vatra-sk-person">'+avatar+'<div>'+line('medium')+'</div></div><div class="vatra-sk-bubble"></div><div class="vatra-sk-bubble mine"></div><div class="vatra-sk-chat-input"></div></div></section>';
 const settings='<div class="vatra-sk-settings"><section class="vatra-sk-card vatra-sk-form">'+line('medium')+Array.from({length:4},()=>'<div class="vatra-sk-field">'+line('short')+'<div class="vatra-sk-input"></div></div>').join('')+'</section><aside class="vatra-sk-card vatra-sk-side">'+rows(4)+'</aside></div>';
 const simple='<section class="vatra-sk-card vatra-sk-simple">'+line('medium')+line()+line('medium')+'<div class="vatra-sk-image"></div></section>';
 const placeholders={friends:people,messages:messenger,settings,profile:settings,saved:post()+post(),photos:simple,videos:simple,groups:simple,music:simple,notifications:people,explore:people};
 $('#empty').hidden=true;feed.setAttribute('aria-busy','true');
 feed.innerHTML='<div class="vatra-sk-screen" role="status" aria-label="Завантаження розділу"><span class="vatra-sk-accessible">Завантаження…</span>'+(placeholders[type]||post()+post()+post())+'</div>';
}
let initialLoaded=new Set(),initialDataReady=false,vatraPageDataReady={saved:false,friends:false,messages:false};
let friendsLoaded=false,friendRequestsLoaded=false,lastFriendRepairSignature='';
function maybeRepairAcceptedFriendships(){
 if(!currentUser||!friendsLoaded||!friendRequestsLoaded)return;
 // A previously interrupted accept may have written the receiver's own list
 // but left the verified incoming request. Repair only those exact pairs.
 const pending=Object.entries(friendRequests||{}).filter(([uid,r])=>friends[uid]===true&&r?.status==='pending'&&r?.direction==='incoming'&&r?.from===uid&&r?.to===currentUser.uid).map(([uid])=>uid).sort();
 if(!pending.length)return;
 const signature=currentUser.uid+':'+pending.join(',');
 if(signature===lastFriendRepairSignature)return;
 lastFriendRepairSignature=signature;
 repairMyFriendships().then(n=>{if(n)toastMsg('Взаємну дружбу відновлено для '+n+' запитів.');})
  .catch(error=>console.warn('[ВАТРА] Потрібне оновлення SQL або перевірка дружби:',error));
}
function markInitialLoaded(key){initialLoaded.add(key);if(['publicProfiles','users','posts','friends','groups'].every(k=>initialLoaded.has(k))&&!initialDataReady){initialDataReady=true;render();}}
function listenData(){stopListeners();if(!currentUser)return;vatraSoundSources.clear();vatraSoundKnown.clear();vatraSoundPrimed=false;vatraSoundOpenedAt=Date.now();initialLoaded=new Set();initialDataReady=false;vatraPageDataReady={saved:false,friends:false,messages:false};friendsLoaded=false;friendRequestsLoaded=false;lastFriendRepairSignature='';renderLoadingSkeletons();window.setTimeout(()=>{if(!initialDataReady){initialDataReady=true;render();toastMsg('Деякі дані ще не завантажилися. Перевірте з’єднання й доступ до таблиці app_data в Supabase.');}},6500);
 unsubscribers.push(watch('verifiedUsers',v=>{verifiedUsers=v||{};if(page==='feed'||page==='profile'||page==='publicProfile'||page==='friends'||page==='explore'||page==='groups')render();}));
 unsubscribers.push(watch('publicProfiles',v=>{users=v;markInitialLoaded('publicProfiles');updateIdentity();if(page==='publicProfile'&&activeProfileUid)renderPublicProfile(activeProfileUid);else if(page!=='settings'||!$('#profileSettingsForm'))render();}));
 unsubscribers.push(watch('friendProfiles',v=>{friendProfiles=v||{};if(page==='publicProfile'&&activeProfileUid)renderPublicProfile(activeProfileUid);}));
 unsubscribers.push(watch(`users/${currentUser.uid}`,v=>{markInitialLoaded('users');const profile=v||{};currentProfile={...profile,privateSections:privateProfileSections,dateOfBirth:privateDateOfBirth,phone:privatePhone,pendingPhone:privatePendingPhone,lastSeenAt:Number(users[currentUser.uid]?.lastSeenAt)||Number(profile.lastSeenAt)||0,isOnline:users[currentUser.uid]?.isOnline===true};updateIdentity();if(!vatraSettingsSaving){const publicData=publicProfileData(currentProfile);if(JSON.stringify(users[currentUser.uid]||{})!==JSON.stringify(publicData))set(ref(db,`publicProfiles/${currentUser.uid}`),publicData).catch(err=>console.warn('Profile sync failed:',err));const friendData=friendProfileData(currentProfile);if(JSON.stringify(friendProfiles[currentUser.uid]||{})!==JSON.stringify(friendData))set(ref(db,`friendProfiles/${currentUser.uid}`),friendData).catch(err=>console.warn('Friend profile sync failed:',err));}if(page==='profile'||(page==='settings'&&!$('#profileSettingsForm')))render();else renderGettingStarted();}));
 unsubscribers.push(watch('posts',v=>{posts=v;markInitialLoaded('posts');if(['feed','saved','profile','notifications','explore','myVideos'].includes(page))render();updateNotificationBadges();}));unsubscribers.push(watch('postLikes',v=>{likes=v;vatraSoundSourceLoaded('postLikes');if(['feed','saved','profile','notifications','explore'].includes(page))render();updateNotificationBadges();}));unsubscribers.push(watch('postSaves',v=>{postSaves=v||{};if(['feed','saved','profile','explore'].includes(page))render();}));unsubscribers.push(watch('postShares',v=>{postShares=v||{};if(['feed','saved','profile','explore'].includes(page))render();}));unsubscribers.push(watch('comments',v=>{comments=v;vatraSoundSourceLoaded('comments');if(['feed','saved','profile','notifications','explore'].includes(page))render();updateNotificationBadges();}));unsubscribers.push(watch('pollVotes',v=>{pollVotes=v||{};if(page==='feed'||page==='saved'||page==='profile')render();}));
 unsubscribers.push(watch(`saved/${currentUser.uid}`,v=>{saved=v;vatraPageDataReady.saved=true;Object.keys(saved||{}).forEach(id=>{if(!postSaves[id]?.[currentUser.uid])set(ref(db,`postSaves/${id}/${currentUser.uid}`),{createdAt:Date.now()}).catch(error=>console.warn('Save counter index unavailable; apply app-data-schema.sql:',error));});if(page==='feed'||page==='saved'||page==='profile')render();}));unsubscribers.push(watch(`following/${currentUser.uid}`,v=>{following=v;if(page==='feed'||page==='explore'||page==='profile')render();}));unsubscribers.push(watch('videos',v=>{videos=v; if(page==='videos'||page==='myVideos')render();}));unsubscribers.push(watch('groups',v=>{groups=v;markInitialLoaded('groups');if(page==='groups'||page==='groupSettings'||page==='explore')render();}));unsubscribers.push(watch('groupAdmins',v=>{groupAdmins=v;if(page==='groups'||page==='groupSettings')render();}));unsubscribers.push(watch('groupModerators',v=>{groupModerators=v||{};if(page==='groups'||page==='groupSettings')render();}));unsubscribers.push(watch(`groupMembers`,v=>{groupMembers=v;if(page==='groups'||page==='groupSettings'||page==='feed'||page==='saved'||page==='profile')render();}));unsubscribers.push(watch('groupPosts',v=>{groupPostsCache=v||{};if(page==='feed'||page==='saved'||page==='profile')render();}));unsubscribers.push(watch(`friendRequests/${currentUser.uid}`,v=>{friendRequests=v;vatraPageDataReady.friends=true;vatraSoundSourceLoaded('friendRequests');friendRequestsLoaded=true;maybeRepairAcceptedFriendships();if(page==='publicProfile'&&activeProfileUid)renderPublicProfile(activeProfileUid);else if(page==='explore'||page==='friends'||page==='notifications')render();updateNotificationBadges();}));unsubscribers.push(watch(`friends/${currentUser.uid}`,v=>{friends=v;friendsLoaded=true;maybeRepairAcceptedFriendships();markInitialLoaded('friends');if(page==='publicProfile'&&activeProfileUid)renderPublicProfile(activeProfileUid);else if(page==='explore'||page==='friends'||page==='profile')render();else renderGettingStarted();}));unsubscribers.push(watch(`userChats/${currentUser.uid}`,v=>{
 vatraPageDataReady.messages=true;chatOwnedIndex=v||{};vatraSoundSourceLoaded('userChats');rebuildVisibleChatIndex();
 if((page==='messages'&&!activeChat)||page==='notifications')render();
 updateNotificationBadges();
}));
unsubscribers.push(watch('chats',v=>{
 const uid=currentUser?.uid;if(!uid)return;
 const live={};
 for(const [key,c] of Object.entries(v||{})){
  if(!c?.members?.[uid])continue;
  const otherUid=Object.keys(c.members).find(k=>k!==uid);
  if(!otherUid)continue;
  const arr=Object.values(c.messages||{}).filter(m=>m&&typeof m==='object').sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  const last=arr.at(-1);
  live[key]={otherUid,updatedAt:Number(last?.createdAt)||Number(c.createdAt)||0,
   lastMessage:last?{text:last.encrypted?SECURE_PREVIEW:String(last.text||'').slice(0,120),senderUid:last.senderUid,createdAt:last.createdAt}:null};
 }
 chatLiveIndex=live;vatraSoundSourceLoaded('chats');rebuildVisibleChatIndex();
 if((page==='messages'&&!activeChat)||page==='notifications')render();
 updateNotificationBadges();
}));unsubscribers.push(watch('activityReadAt/'+currentUser.uid,v=>{activityReadAt=Number(v)||0;if(page==='notifications')renderNotifications();updateNotificationBadges();}));unsubscribers.push(watch('chatReads/'+currentUser.uid,v=>{chatReads=v||{};if(page==='notifications')renderNotifications();updateNotificationBadges();}));unsubscribers.push(watch(`blockedUsers/${currentUser.uid}`,v=>{blockedUsers=v||{};if(page==='publicProfile'&&activeProfileUid)renderPublicProfile(activeProfileUid);else if(['feed','saved','profile','explore','messages','notifications','groups','videos','friends'].includes(page))render();}));
}
let presenceHeartbeat=null;
async function updatePresence(isOnline=true){
 if(!currentUser)return;
 const stamp=Date.now(),patch={isOnline:!!isOnline,lastSeenAt:stamp},uid=currentUser.uid;
 if(currentProfile)Object.assign(currentProfile,patch);
 if(users[uid])Object.assign(users[uid],patch);
 try{await Promise.all([update(ref(db,'publicProfiles/'+uid),patch),update(ref(db,'friendProfiles/'+uid),patch)]);}
 catch(error){console.warn('Presence update failed:',error);}
}
function startPresence(){if(presenceHeartbeat)clearInterval(presenceHeartbeat);updatePresence(true);presenceHeartbeat=window.setInterval(()=>{if(document.visibilityState==='visible')updatePresence(true);},45000);}
window.addEventListener('pagehide',()=>{if(currentUser)updatePresence(false);});
document.addEventListener('visibilitychange',()=>{if(currentUser)updatePresence(document.visibilityState==='visible');});
function profilePresenceMarkup(profile={},isSelf=false){const stamp=Number(profile.lastSeenAt)||0,online=isSelf||(profile.isOnline===true&&stamp>0&&Date.now()-stamp<120000);if(online)return '<span class="vatra-profile-presence is-online">Онлайн</span>';if(!stamp)return '<span class="vatra-profile-presence"><i></i>Ще не заходив(-ла)</span>';const date=new Date(stamp),now=new Date(),time=date.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'}),sameDay=date.toDateString()===now.toDateString(),yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1).toDateString()===date.toDateString(),label=sameDay?'сьогодні о '+time:yesterday?'вчора о '+time:date.toLocaleDateString('uk-UA',{day:'numeric',month:'short',year:date.getFullYear()===now.getFullYear()?undefined:'numeric'})+' о '+time;return '<span class="vatra-profile-presence"><i></i>Був(-ла) в мережі '+esc(label)+'</span>';}
function applyUserPreferences(profile={}){
 const root=document.documentElement,body=document.body;
 const theme=['dark','auto'].includes(profile.themeMode)?profile.themeMode:'light';
 const autoDark=theme==='auto'&&window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
 body.dataset.vatraFontScale='normal';
 body.dataset.vatraDensity='comfortable';
 body.dataset.vatraReduceMotion='false';
 body.dataset.vatraTheme=theme;
 body.dataset.vatraThemeEffective=theme==='dark'||autoDark?'dark':'light';
 body.dataset.vatraCardStyle='soft';
 body.dataset.vatraHighContrast='false';
 body.dataset.vatraReduceTransparency='true';
 for(const name of ['--vatra-user-accent','--v-blue','--v-blue-hover','--blue'])root.style.setProperty(name,'#0757f5');
 root.style.colorScheme=body.dataset.vatraThemeEffective;
}
if(window.matchMedia){
 window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{
  if(currentProfile?.themeMode==='auto')applyUserPreferences(currentProfile);
 });
}
function updateIdentity(){applyUserPreferences(currentProfile);const name=currentProfile.name||currentUser?.displayName||'Користувач ВАТРИ',avatar=currentProfile.avatarUrl||'';$('#authButton').textContent=currentUser?'Вийти':'Увійти';['#topAvatar','#composeAvatar','#modalAvatar'].forEach(sel=>{const el=$(sel);if(!el)return;el.textContent=avatar?'':'В';el.style.backgroundImage=avatar?`url("${avatar}")`:'';el.style.backgroundSize='cover';el.style.backgroundPosition='center';el.style.color=avatar?'transparent':'';});$('#modalName').textContent=name;$('#prompt').textContent=currentUser?`Що нового, ${name.split(' ')[0]}?`:'Увійдіть, щоб створити допис';const w=$('.welcome h2');if(w)w.textContent=currentUser?`Привіт, ${name.split(' ')[0]}!`:'Раді бачити у ВАТРІ!';}
function verifiedBadge(uid){return verifiedUsers?.[uid]?.verified===true?'<span class="vatra-verified-badge" title="Офіційний акаунт ВАТРИ" aria-label="Офіційний акаунт ВАТРИ"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.4 12.5 3l3-.1.9 2.8 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.8-3-.1-2.5 1.6-2.5-1.6-3 .1-.9-2.8-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.8 3 .1L10 1.4Z" fill="currentColor"/><path d="m6.2 10.2 2.4 2.4 5.2-5.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>':'';}
function timeAgo(ts){if(!ts)return'щойно';const d=Date.now()-ts;if(d<60000)return'щойно';if(d<3600000)return`${Math.floor(d/60000)} хв тому`;if(d<86400000)return`${Math.floor(d/3600000)} год тому`;return new Date(ts).toLocaleDateString('uk-UA',{day:'numeric',month:'short'});}
function avatar(name,url='',cls='blue'){const own=!!currentUser&&(name===currentProfile.name||name===currentUser.displayName),fallback=(cls==='vatra-profile-photo'||cls==='vatra-profile-compose-avatar'||own)?'В':initials(name);return '<div class="avatar '+esc(cls)+'" '+(url?'style="background-image:url(\''+esc(url)+'\');background-size:cover;background-position:center;color:transparent"':'')+'>'+esc(fallback)+'</div>';}
function renderComments(p,cs){
 return cs.map(c=>{
  const mine=c.uid===currentUser?.uid,canDelete=mine||p.authorUid===currentUser?.uid,parent=c.replyTo?comments[p.id]?.[c.replyTo]:null,author=c.uid===currentUser?.uid?currentProfile:(users[c.uid]||{});
  const authorName=c.name||author.name||'Користувач ВАТРИ',authorAvatar=c.uid===currentUser?.uid?(currentProfile.avatarUrl||''):(author.avatarUrl||c.avatarUrl||'');
  const authorLink=c.uid?'<button type="button" class="comment-author-avatar" data-view-profile="'+esc(c.uid)+'" aria-label="Відкрити профіль '+esc(authorName)+'">'+avatar(authorName,authorAvatar,'comment-avatar')+'</button>':avatar(authorName,authorAvatar,'comment-avatar');
  const nameLink=c.uid?'<button type="button" class="comment-author-name" data-view-profile="'+esc(c.uid)+'">'+esc(authorName)+'</button>':'<b>'+esc(authorName)+'</b>';
  const replying=replyingComment?.postId===p.id&&replyingComment?.commentId===c.id,context=c.replyTo?'<small class="reply-context">↳ Відповідь на '+esc(parent?.name||'видалений коментар')+'</small>':'';
  const actions=(mine?'<button type="button" data-edit-comment="'+esc(p.id)+'" data-comment-id="'+esc(c.id)+'">Редагувати</button>':'')+(currentUser?'<button type="button" data-reply-comment="'+esc(p.id)+'" data-comment-id="'+esc(c.id)+'">Відповісти</button>':'')+(canDelete?'<button type="button" class="danger-link" data-delete-comment="'+esc(p.id)+'" data-comment-id="'+esc(c.id)+'">Видалити</button>':'')+(currentUser&&!mine?'<button type="button" data-report-comment="'+esc(p.id)+'" data-comment-id="'+esc(c.id)+'">Поскаржитися</button><button type="button" class="danger-link" data-block-user="'+esc(c.uid)+'">Заблокувати автора</button>':'');
  const form=replying?'<form class="comment-form reply-form" data-reply-form="'+esc(c.id)+'" data-reply-post="'+esc(p.id)+'">'+emojiControl()+'<input name="comment" data-emoji-input maxlength="300" placeholder="Відповісти '+esc(authorName)+'…" required><button type="submit">Надіслати</button><button type="button" class="text-link" data-cancel-reply>×</button></form>':'';
  return '<div class="comment vatra-comment-item '+(c.replyTo?'comment-reply':'')+'"><div class="comment-main">'+authorLink+'<div class="comment-body"><div class="vatra-comment-head">'+nameLink+(c.createdAt?'<time>'+esc(timeAgo(c.createdAt))+'</time>':'')+(c.editedAt?'<small>змінено</small>':'')+'</div>'+context+'<div class="comment-copy"><span>'+esc(c.text||'')+'</span></div><div class="comment-actions">'+actions+'</div></div></div>'+form+'</div>';
 }).join('');
}
function renderPoll(p){
 const options=Object.entries(p.pollOptions||{}).filter(([,label])=>typeof label==='string'&&label.trim());
 if(options.length<2)return '';
 const votes=pollVotes[p.id]||{},total=Object.keys(votes).length,mine=currentUser?votes[currentUser.uid]:null,reveal=!!mine;
 const choices=options.map(([key,label])=>{const count=Object.values(votes).filter(v=>v===key).length,percent=total?Math.round(count*100/total):0,width=reveal?percent:0;return '<button type="button" class="poll-choice '+(mine===key?'selected':'')+'" data-poll-vote="'+esc(p.id)+'" data-option="'+esc(key)+'" aria-pressed="'+(mine===key)+'"><span class="poll-choice-fill" style="width:'+width+'%"></span><span class="poll-choice-label">'+esc(label)+'</span><b class="poll-choice-percent">'+(reveal?percent+'%':'')+'</b></button>';}).join('');
 const hint=mine?'Ваш голос збережено. Можна обрати інший варіант.':currentUser?'Оберіть варіант, щоб переглянути результати.':'Увійдіть, щоб проголосувати.';
 return '<section class="poll-card" aria-label="Опитування"><div class="poll-card-heading"><b>Опитування</b><span>'+total+' голосів</span></div><div class="poll-choices">'+choices+'</div><p class="poll-hint">'+hint+'</p></section>';
}
function postImages(p){const urls=Array.isArray(p?.imageUrls)?p.imageUrls.filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)):[];if(!urls.length&&p?.imageUrl)urls.push(p.imageUrl);return [...new Set(urls)].slice(0,10);}
function renderPostImages(p){
 const urls=postImages(p);if(!urls.length)return '';
 const shown=urls.slice(0,4),extra=urls.length-shown.length;
 return '<div class="post-photo-grid count-'+shown.length+' vatra-post-photo-uniform">'+shown.map((url,index)=>'<button type="button" class="post-photo-item" data-open-photo="'+esc(p.id)+'" data-photo-urls="'+esc(JSON.stringify(urls))+'" data-photo-index="'+index+'" aria-label="Відкрити фото '+(index+1)+' з '+urls.length+'"><img src="'+esc(url)+'" alt="Фото до допису '+(index+1)+'" loading="lazy" decoding="async">'+(extra>0&&index===3?'<span class="vatra-post-photo-more">+'+extra+' фото</span>':'')+'</button>').join('')+'</div>';
}
function clearEditPostPreviews(){editPostPreviewUrls.forEach(url=>URL.revokeObjectURL(url));editPostPreviewUrls.length=0;}
function renderEditPostPreviews(form){
 const box=form?.querySelector('[data-edit-photo-preview]');if(!box)return;
 clearEditPostPreviews();
 box.innerHTML=editPostFiles.map((file,index)=>{
  const url=URL.createObjectURL(file);editPostPreviewUrls.push(url);
  return '<div class="post-edit-photo new-photo"><img src="'+url+'" alt="Нове фото"><div class="post-edit-photo-actions"><button type="button" data-edit-new-post-photo="'+index+'">Редагувати</button><button type="button" data-remove-edit-new-photo="'+index+'" aria-label="Прибрати нове фото">×</button></div></div>';
 }).join('');
}
function renderPostEditForm(p){
 const urls=postImages(p);
 const existing=urls.map((url,index)=>
  '<div class="post-edit-photo" data-edit-existing-photo><img src="'+esc(url)+'" alt="Фото '+(index+1)+'"><button type="button" data-remove-edit-photo="'+index+'" aria-label="Прибрати фото">×</button><small>'+(index+1)+'</small></div>'
 ).join('');
 return '<form class="post-edit-form post-edit-form-vatra" data-edit-post-form="'+esc(p.id)+'" data-existing-images="'+esc(JSON.stringify(urls))+'">'+
  '<div class="post-edit-toolbar"><button type="button" data-post-format="bold" title="Жирний"><b>B</b></button><button type="button" data-post-format="italic" title="Курсив"><i>I</i></button><button type="button" data-post-format="underline" title="Підкреслений"><u>U</u></button><button type="button" data-post-format="strike" title="Закреслений"><s>S</s></button><button type="button" data-post-format="quote" title="Цитата">❝</button><button type="button" data-post-format="list" title="Список">•</button><button type="button" data-post-format="hashtag" title="Хештег">#</button><span>Форматування</span>'+emojiControl()+'</div>'+
  '<textarea name="text" maxlength="20000" rows="8" data-emoji-input placeholder="Відредагуйте текст допису…">'+esc(p.text||'')+'</textarea>'+
  '<label class="vatra-post-audience vatra-post-edit-audience"><span>Хто бачить допис</span><select name="visibility" aria-label="Аудиторія допису"><option value="public"'+((p.visibility||'public')==='public'?' selected':'')+'>Для всіх</option><option value="friends"'+(p.visibility==='friends'?' selected':'')+'>Для друзів</option><option value="private"'+(p.visibility==='private'?' selected':'')+'>Лише для себе</option></select></label>'+
  '<div class="post-edit-media"><div class="post-edit-media-head"><b>Фотографії допису</b><label class="post-edit-add-photo">＋ Додати фото<input type="file" accept="image/*" multiple data-edit-post-photos hidden></label></div>'+
  '<div class="post-edit-gallery">'+existing+'</div><div class="post-edit-new-gallery" data-edit-photo-preview></div>'+
  '<small class="post-edit-hint">До 10 фотографій у публікації. Нові фото можна обрізати й відредагувати перед збереженням.</small></div>'+
  '<div class="post-edit-actions"><button class="primary" type="submit">Зберегти зміни</button><button class="pill" type="button" data-cancel-post-edit>Скасувати</button></div></form>';
}
function openPostPhotoViewer(urls,startIndex=0,postId='',ownerUid=''){
 const photos=[...new Set((Array.isArray(urls)?urls:[]).filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)))];if(!photos.length)return;
 let index=Math.max(0,Math.min(Number(startIndex)||0,photos.length-1)),zoom=1;
 const dialog=document.createElement('dialog');dialog.className='vatra-post-photo-viewer';document.body.append(dialog);
 const getPost=()=>postId?posts[postId]||null:null;
 const getOwner=()=>{const p=getPost(),uid=p?.authorUid||ownerUid;return uid?(uid===currentUser?.uid?currentProfile:(users[uid]||{})):{};};
 const draw=()=>{
  const p=getPost(),u=getOwner(),name=u.name||p?.authorName||'Користувач ВАТРИ',handle=u.handle||p?.authorHandle||'user';
  const cs=postId?Object.entries(comments[postId]||{}).map(([id,c])=>({...c,id})).filter(c=>c.uid===currentUser?.uid||!blockedUsers[c.uid]).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)):[];
  zoom=1;
  dialog.innerHTML='<div class="vatra-media-viewer-shell"><header class="vatra-media-viewer-topbar"><div class="vatra-media-viewer-brand"><button type="button" class="vatra-viewer-close" aria-label="Закрити">×</button><span class="vatra-viewer-mark">В</span><b>ВАТРА</b></div><div class="vatra-media-viewer-tools"><button type="button" data-viewer-zoom="-1" aria-label="Зменшити">−</button><output data-viewer-zoom-value>100%</output><button type="button" data-viewer-zoom="1" aria-label="Збільшити">＋</button><button type="button" data-viewer-fullscreen aria-label="На весь екран">⛶</button></div></header><div class="vatra-media-viewer-layout"><main class="vatra-media-viewer-stage"><button type="button" class="vatra-media-viewer-step prev" data-post-photo-step="-1" '+(photos.length<2?'disabled':'')+' aria-label="Попереднє фото">‹</button><img class="vatra-media-viewer-image" src="'+esc(photos[index])+'" alt="Фото '+(index+1)+' з '+photos.length+'"><button type="button" class="vatra-media-viewer-step next" data-post-photo-step="1" '+(photos.length<2?'disabled':'')+' aria-label="Наступне фото">›</button><div class="vatra-media-viewer-counter">'+(index+1)+' / '+photos.length+'</div></main><aside class="vatra-media-viewer-side"><div class="vatra-media-viewer-post-head">'+avatar(name,u.avatarUrl)+'<div><button type="button" class="comment-author-name" '+((p?.authorUid||ownerUid)?'data-view-profile="'+esc(p?.authorUid||ownerUid)+'"':'')+'>'+esc(name)+'</button><small>@'+esc(handle)+' · '+(p?.createdAt?timeAgo(p.createdAt):'Фото профілю')+'</small></div></div>'+(p?.text?'<p class="vatra-media-viewer-caption">'+safeText(p.text)+'</p>':'<p class="vatra-media-viewer-caption">'+(p?'Фото до допису':'Фото профілю')+'</p>')+(postId?'<div class="vatra-media-viewer-context"><button type="button" class="vatra-media-like'+(likes[postId]?.[currentUser?.uid]?' is-liked':'')+'" data-vatra-media-like="'+esc(postId)+'">♡ Вподобано '+Object.keys(likes[postId]||{}).length+'</button><button type="button" class="vatra-media-share" data-vatra-media-share="'+esc(postId)+'">Поділитися</button><span>'+cs.length+' коментарів</span></div><section class="vatra-media-viewer-comments"><h3>Коментарі</h3><div class="vatra-media-viewer-comment-list">'+renderComments(p,cs)+'</div><form class="vatra-media-viewer-comment-form" data-media-comment="'+esc(postId)+'">'+emojiControl()+'<textarea name="comment" data-emoji-input maxlength="300" rows="2" placeholder="Написати коментар…" required></textarea><button type="submit" class="primary">Надіслати</button></form></section>':'<div class="vatra-media-viewer-photo-note">Фото профілю · використовуйте стрілки або клавіші ← → для перегляду</div>')+'</aside></div></div>';
 };
 const step=delta=>{index=(index+delta+photos.length)%photos.length;draw();};
 dialog.addEventListener('click',async event=>{
  if(event.target.closest('.vatra-viewer-close')||event.target===dialog){dialog.close();return;}
  const mediaLike=event.target.closest('[data-vatra-media-like]');
  if(mediaLike){if(!authRequired())return;const id=mediaLike.dataset.vatraMediaLike,path='postLikes/'+id+'/'+currentUser.uid;try{const snap=await get(ref(db,path));if(snap.exists())await remove(ref(db,path));else await set(ref(db,path),{createdAt:Date.now()});const latest=await get(ref(db,'postLikes/'+id));likes[id]=latest.val()||{};draw();}catch(error){toastMsg(niceError(error));}return;}
  const mediaShare=event.target.closest('[data-vatra-media-share]');
  if(mediaShare){const id=mediaShare.dataset.vatraMediaShare,url=location.origin+location.pathname+'#post-'+encodeURIComponent(id);try{if(navigator.share)await navigator.share({title:'ВАТРА',url});else{await navigator.clipboard.writeText(url);toastMsg('Посилання на допис скопійовано.');}}catch(error){if(error?.name!=='AbortError')toastMsg('Не вдалося поділитися посиланням.');}return;}
  const next=event.target.closest('[data-post-photo-step]');if(next){step(Number(next.dataset.postPhotoStep));return;}
  const z=event.target.closest('[data-viewer-zoom]');if(z){zoom=Math.max(1,Math.min(3,zoom+Number(z.dataset.viewerZoom)*.2));const image=dialog.querySelector('.vatra-media-viewer-image');if(image)image.style.transform='scale('+zoom+')';dialog.querySelector('[data-viewer-zoom-value]').textContent=Math.round(zoom*100)+'%';return;}
  if(event.target.closest('[data-viewer-fullscreen]')){const stage=dialog.querySelector('.vatra-media-viewer-stage');try{if(!document.fullscreenElement)await stage?.requestFullscreen?.();else await document.exitFullscreen?.();}catch(error){toastMsg('Повноекранний режим недоступний у цьому браузері.');}}
 });
 dialog.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-media-comment]');if(!form)return;
  event.preventDefault();event.stopPropagation();if(!authRequired())return;
  const value=String(new FormData(form).get('comment')||'').trim(),id=form.dataset.mediaComment;if(!value)return;
  try{await set(push(ref(db,'comments/'+id)),{uid:currentUser.uid,name:currentProfile.name||currentUser.displayName||'Користувач ВАТРИ',avatarUrl:currentProfile.avatarUrl||'',text:value.slice(0,300),createdAt:Date.now()});const snap=await get(ref(db,'comments/'+id));comments[id]=snap.val()||{};draw();}
  catch(error){toastMsg(niceError(error));}
 });
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight')step(1);else if(event.key==='ArrowLeft')step(-1);});
 dialog.addEventListener('close',()=>{if(document.fullscreenElement)document.exitFullscreen?.();dialog.remove();});
 draw();dialog.showModal();
}
function renderCollapsiblePostText(text){
 const full=String(text||'');
 if(!full)return '';
 const shouldCollapse=full.length>650||full.split('\n').length>7;
 return '<div class="vatra-post-text-container'+(shouldCollapse?' is-collapsible':'')+'"><p class="post-text'+(shouldCollapse?' vatra-post-text-clamped':'')+'">'+safeText(full)+'</p>'+(shouldCollapse?'<button type="button" class="vatra-post-text-toggle" data-toggle-post-text aria-expanded="false">Показати повністю</button>':'')+'</div>';
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-toggle-post-text]');
 if(!button)return;
 const block=button.closest('.vatra-post-text-container');
 if(!block)return;
 const expanded=block.classList.toggle('is-expanded');
 button.textContent=expanded?'Згорнути':'Показати повністю';
 button.setAttribute('aria-expanded',String(expanded));
});
function renderPostBody(p){
 return renderCollapsiblePostText(p.text)+renderPostImages(p)+(p.videoUrl?'<video class="post-image" controls playsinline preload="metadata" src="'+esc(p.videoUrl)+'"></video>':'');
}
function postActorStack(map,label){
 const entries=Object.entries(map||{}).sort((a,b)=>(Number(b[1]?.createdAt)||0)-(Number(a[1]?.createdAt)||0)).slice(0,3);
 if(!entries.length)return '';
 return '<span class="post-actor-stack" aria-label="'+esc(label)+'">'+entries.map(([uid,record])=>{const person=uid===currentUser?.uid?currentProfile:(users[uid]||{}),name=person.name||record?.name||'Користувач ВАТРИ',photo=person.avatarUrl||record?.avatarUrl||'';return '<button type="button" class="post-actor-link" data-view-profile="'+esc(uid)+'" title="'+esc(name)+'" aria-label="Профіль: '+esc(name)+'">'+avatar(name,photo,'post-actor-avatar')+'</button>';}).join('')+'</span>';
}
function postActionItem(kind,id,label,count,icon,active=false,actors=''){return '<div class="post-action-item"><button type="button" class="post-action-button '+(active?'is-active':'')+'" data-'+kind+'="'+esc(id)+'" aria-label="'+esc(label)+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+icon+'</svg><span>'+label+'</span><b class="post-action-count">'+count+'</b></button>'+actors+'</div>';}
function postCard(p){
 const liveAuthor=p.authorUid===currentUser?.uid?currentProfile:(users[p.authorUid]||null),postAuthorName=liveAuthor?.name||p.authorName||'Користувач ВАТРИ',postAuthorAvatar=liveAuthor?(liveAuthor.avatarUrl||''):(p.authorAvatar||'');
 const liked=!!likes[p.id]?.[currentUser?.uid],isSaved=!!saved[p.id],cs=Object.entries(comments[p.id]||{}).map(([id,c])=>({...c,id})).filter(c=>c.uid===currentUser?.uid||!blockedUsers[c.uid]).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
 const likeMap=likes[p.id]||{},saveMap=postSaves[p.id]||{},shareMap=postShares[p.id]||{},canEdit=p.authorUid===currentUser?.uid&&p.source!=='group',editing=canEdit&&editingPostId===p.id;
 const likeIcon='<path d="M20.8 8.7c0 5.2-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z"/>',commentIcon='<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5A7.5 7.5 0 0 1 10.5 4H12a8 8 0 0 1 8 7.5Z"/>',shareIcon='<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M5 13v7h14v-7"/>',saveIcon='<path d="M6 4.5h12v16l-6-4-6 4v-16Z"/>';
 const actions=postActionItem('like',p.id,liked?'Вподобано':'Вподобати',Object.keys(likeMap).length,likeIcon,liked,postActorStack(likeMap,'Хто вподобав допис'))+postActionItem('comment',p.id,'Коментувати',cs.length,commentIcon,false)+postActionItem('share',p.id,'Поділитися',Object.keys(shareMap).length,shareIcon,false)+postActionItem('save',p.id,isSaved?'Збережено':'Зберегти',Object.keys(saveMap).length,saveIcon,isSaved);
 return '<article class="post" id="post-'+esc(p.id)+'"><div class="post-head">'+avatar(postAuthorName,postAuthorAvatar)+'<div class="author"><b>'+(p.authorUid&&p.authorUid!==currentUser?.uid?'<button class="author-link" data-view-profile="'+esc(p.authorUid)+'">'+esc(postAuthorName)+'</button>'+verifiedBadge(p.authorUid):esc(postAuthorName)+verifiedBadge(p.authorUid))+'</b><small>@'+esc(p.authorHandle||'user')+' · '+timeAgo(p.createdAt)+(p.editedAt?' · змінено':'')+(p.visibility==='private'?' · Лише для себе':p.visibility==='friends'?' · Для друзів':'')+(p.groupName?' · '+esc(p.groupName):'')+'</small></div>'+(canEdit||(currentUser&&p.authorUid!==currentUser.uid)?'<details class="post-menu"><summary class="dots" aria-label="Дії з дописом" title="Дії з дописом"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="19" cy="12" r="1.75"/></svg></summary><div class="post-menu-panel">'+(canEdit?'<button type="button" data-edit-post="'+esc(p.id)+'">Редагувати</button><button type="button" class="danger-link" data-delete="'+esc(p.id)+'">Видалити</button>':'')+(currentUser&&p.authorUid!==currentUser.uid?'<button type="button" data-report-post="'+esc(p.id)+'">Поскаржитися</button><button type="button" class="danger-link" data-block-user="'+esc(p.authorUid)+'">Заблокувати автора</button>':'')+'</div></details>':'')+'</div>'+(editing?renderPostEditForm(p):renderPostBody(p))+renderPoll(p)+'<div class="post-actions">'+actions+'</div>'+(cs.length?'<div class="comments vatra-post-comments"><div class="vatra-comments-heading">Коментарі <span>'+cs.length+'</span></div>'+renderComments(p,cs)+'</div>':'')+(p.commentOpen?'<form class="comment-form" data-form="'+esc(p.id)+'">'+emojiControl()+'<input name="comment" data-emoji-input maxlength="300" placeholder="Написати коментар…" required><button type="submit">Надіслати</button></form>':'')+'</article>';
}
function allPosts(){
 const uid=currentUser?.uid;
 const memberGroups=new Set(Object.entries(groups||{}).filter(([gid,g])=>g&&(g.ownerUid===uid||!!groupMembers[gid]?.[uid])).map(([gid])=>gid));
 const arr=Object.entries(posts||{}).map(([id,p])=>({...p,id,source:'user'}));
 for(const gid of memberGroups){
  const g=groups[gid];
  Object.entries(groupPostsCache[gid]||{}).forEach(([id,p])=>arr.push({...p,id:'g_'+gid+'_'+id,groupId:gid,groupName:g?.name||'Спільнота',source:'group'}));
 }
 let result=arr.filter(p=>{
  if(!p||!p.authorUid||blockedUsers[p.authorUid])return false;
  if(p.source==='group')return memberGroups.has(p.groupId);
  return p.authorUid===uid||!!friends[p.authorUid];
 });
 if(page==='saved')result=result.filter(p=>saved[p.id]);
 if(page==='profile')result=result.filter(p=>p.authorUid===uid);
 if(query){
  const q=query.toLocaleLowerCase('uk-UA');
  result=result.filter(p=>(String(p.authorName||'')+' '+String(p.authorHandle||'')+' '+String(p.text||'')+' '+String(p.groupName||'')).toLocaleLowerCase('uk-UA').includes(q));
 }
 result.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 return result;
}
function setFeed(html,empty=false){feed.removeAttribute('aria-busy');feed.innerHTML=html;$('#empty').hidden=!empty;}
function renderBlockedUsersList(){const box=$('#blockedUsersList');if(!box)return;const entries=Object.entries(blockedUsers).filter(([,value])=>!!value);box.innerHTML=entries.map(([uid])=>{const u=users[uid]||{};return `<div class="blocked-user-row">${avatar(u.name||'Користувач',u.avatarUrl)}<span><b>${esc(u.name||'Користувач ВАТРИ')}</b><small>@${esc(u.handle||'user')}</small></span><button class="pill" data-unblock-user="${esc(uid)}">Розблокувати</button></div>`;}).join('')||'<p class="empty-inline">Немає заблокованих користувачів.</p>';}
function renderSaved(){
 const postsToShow=allPosts();
 const visible=postsToShow.length;
 const content='<section class="vatra-saved-page"><header class="vatra-saved-header"><div class="vatra-saved-headline"><span class="vatra-saved-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4.5h12v15.5l-6-4-6 4V4.5Z"/></svg></span><div><h2>Збережене</h2><p>Дописи, до яких можна повернутися пізніше.</p></div></div><span class="vatra-saved-count">'+visible+' '+(visible===1?'допис':visible<5?'дописи':'дописів')+'</span></header>'+
 (visible?'<div class="vatra-saved-list">'+postsToShow.map(postCard).join('')+'</div>':
 '<div class="vatra-saved-empty"><span class="vatra-saved-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4.5h12v15.5l-6-4-6 4V4.5Z"/></svg></span><h3>Поки немає збережених дописів</h3><p>Натисніть «Зберегти» під дописом — він з’явиться тут.</p><button type="button" class="vatra-saved-browse">Перейти до новин</button></div>')+'</section>';
 setFeed(content,false);
 feed.querySelector('.vatra-saved-browse')?.addEventListener('click',()=>goPage('feed'));
}
function renderFeed(){const arr=allPosts();setFeed(arr.map(postCard).join(''),!arr.length);if(!arr.length)$('#empty').innerHTML=`<h3>${page==='saved'?'Тут поки порожньо':page==='profile'?'Ще немає дописів':'Стрічка пуста'}</h3><p>${page==='saved'?'Зберігай дописи, щоб повернутися до них пізніше.':page==='profile'?'Ваші публікації з’являтимуться тут.':'Новин поки немає. Дописи друзів і спільнот, за якими Ви стежите, з’являться тут.'}</p>${currentUser&&page==='feed'?'<button class="primary" id="emptyCreate">＋ Створити допис</button>':''}`;$('#emptyCreate')?.addEventListener('click',openComposer);}
function avatarPhotoKey(url){
 let hash=2166136261;
 for(let i=0;i<String(url||'').length;i++){hash^=String(url).charCodeAt(i);hash=Math.imul(hash,16777619);}
 return (hash>>>0).toString(36);
}
async function openAvatarViewer(ownerUid,photoUrls,startIndex=0){
 const photos=[...new Set((Array.isArray(photoUrls)?photoUrls:[]).filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)))];
 if(!photos.length)return toastMsg('Для цього профілю ще немає фотографій.');
 let index=Math.max(0,Math.min(Number(startIndex)||0,photos.length-1)),zoom=1;
 const dialog=document.createElement('dialog');dialog.className='vatra-avatar-viewer';
 document.body.append(dialog);
 const owner=ownerUid===currentUser?.uid?currentProfile:(users[ownerUid]||{});
 const ownerName=owner.name||'Користувач ВАТРИ';
 const render=async()=>{
  const url=photos[index],key=avatarPhotoKey(url);zoom=1;
  dialog.innerHTML='<div class="vatra-media-viewer-shell"><header class="vatra-media-viewer-topbar"><div class="vatra-media-viewer-brand"><button type="button" class="vatra-avatar-viewer-close" aria-label="Закрити">×</button><span class="vatra-viewer-mark">В</span><b>ВАТРА</b></div><div class="vatra-media-viewer-tools"><button type="button" data-avatar-zoom="-1" aria-label="Зменшити">−</button><output data-avatar-zoom-value>100%</output><button type="button" data-avatar-zoom="1" aria-label="Збільшити">＋</button><button type="button" data-avatar-fullscreen aria-label="На весь екран">⛶</button></div></header><div class="vatra-avatar-viewer-body"><div class="vatra-avatar-viewer-stage"><button type="button" class="vatra-avatar-viewer-nav prev" data-avatar-step="-1" '+(photos.length<2?'disabled':'')+' aria-label="Попереднє фото">‹</button><img class="vatra-media-viewer-image" src="'+esc(url)+'" alt="Фото профілю '+esc(ownerName)+'"><button type="button" class="vatra-avatar-viewer-nav next" data-avatar-step="1" '+(photos.length<2?'disabled':'')+' aria-label="Наступне фото">›</button></div><aside class="vatra-avatar-viewer-side"><div class="vatra-avatar-viewer-owner">'+avatar(ownerName,owner.avatarUrl)+'<span><b>'+esc(ownerName)+'</b><small>Фото профілю · '+(index+1)+' з '+photos.length+'</small></span></div><div class="vatra-avatar-viewer-counter">'+(index+1)+' / '+photos.length+'</div><div class="vatra-avatar-viewer-actions"><button type="button" class="vatra-avatar-like" data-avatar-like><span>♥</span> <b data-avatar-like-count>…</b></button></div><section class="vatra-avatar-comments"><h3>Коментарі</h3><div class="vatra-avatar-comment-list" data-avatar-comment-list><p class="muted">Завантажуємо…</p></div><form data-avatar-comment-form><textarea name="comment" data-emoji-input rows="2" maxlength="500" placeholder="Написати коментар до фото…" required></textarea>'+emojiControl()+'<button type="submit" class="primary">Надіслати</button></form></section></aside></div>';
  const likeRef=ref(db,'avatarLikes/'+ownerUid+'/'+key),commentRef=ref(db,'avatarComments/'+ownerUid+'/'+key);
  try{
   const [likeSnap,commentSnap]=await Promise.all([get(likeRef),get(commentRef)]);
   const likeMap=likeSnap.val()||{},commentMap=commentSnap.val()||{};
   const likeButton=dialog.querySelector('[data-avatar-like]');
   likeButton.classList.toggle('is-liked',!!likeMap[currentUser?.uid]);
   likeButton.querySelector('b').textContent=Object.keys(likeMap).length+' вподобань';
   dialog.querySelector('[data-avatar-comment-list]').innerHTML=Object.entries(commentMap).sort((a,b)=>(a[1]?.createdAt||0)-(b[1]?.createdAt||0)).map(([id,c])=>{
    const user=c.uid===currentUser?.uid?currentProfile:(users[c.uid]||{}),canDelete=c.uid===currentUser?.uid||ownerUid===currentUser?.uid;
    return '<div class="vatra-avatar-comment">'+avatar(user.name||c.name||'Користувач',user.avatarUrl||c.avatarUrl)+'<div><b>'+esc(user.name||c.name||'Користувач')+'</b><p>'+esc(c.text||'')+'</p><small>'+timeAgo(c.createdAt)+'</small></div>'+(canDelete?'<button type="button" data-delete-avatar-comment="'+esc(id)+'" aria-label="Видалити коментар">×</button>':'')+'</div>';
   }).join('')||'<p class="muted">Поки немає коментарів. Будьте першим.</p>';
   dialog.dataset.photoKey=key;dialog.dataset.ownerUid=ownerUid;
  }catch(error){
   dialog.querySelector('[data-avatar-comment-list]').innerHTML='<p class="muted">Не вдалося завантажити взаємодії з фото: '+esc(niceError(error))+'</p>';
  }
 };
 dialog.addEventListener('click',async event=>{
  const close=event.target.closest('.vatra-avatar-viewer-close');if(close){dialog.close();return;}
  const zoomButton=event.target.closest('[data-avatar-zoom]');if(zoomButton){zoom=Math.max(1,Math.min(3,zoom+Number(zoomButton.dataset.avatarZoom)*.2));const image=dialog.querySelector('.vatra-media-viewer-image');if(image)image.style.transform='scale('+zoom+')';dialog.querySelector('[data-avatar-zoom-value]').textContent=Math.round(zoom*100)+'%';return;}
  if(event.target.closest('[data-avatar-fullscreen]')){const stage=dialog.querySelector('.vatra-avatar-viewer-stage');try{if(!document.fullscreenElement)await stage?.requestFullscreen?.();else await document.exitFullscreen?.();}catch(error){toastMsg('Повноекранний режим недоступний у цьому браузері.');}return;}
  const step=event.target.closest('[data-avatar-step]');if(step){index=(index+Number(step.dataset.avatarStep)+photos.length)%photos.length;await render();return;}
  const like=event.target.closest('[data-avatar-like]');if(like){
   if(!authRequired())return;
   const key=avatarPhotoKey(photos[index]),path='avatarLikes/'+ownerUid+'/'+key+'/'+currentUser.uid;
   try{const snap=await get(ref(db,path));if(snap.exists())await remove(ref(db,path));else await set(ref(db,path),{uid:currentUser.uid,createdAt:Date.now()});await render();}
   catch(error){toastMsg(niceError(error));}
   return;
  }
  const removeComment=event.target.closest('[data-delete-avatar-comment]');if(removeComment){
   if(!authRequired())return;
   const path='avatarComments/'+ownerUid+'/'+avatarPhotoKey(photos[index])+'/'+removeComment.dataset.deleteAvatarComment;
   try{await remove(ref(db,path));await render();}catch(error){toastMsg(niceError(error));}
   return;
  }
  if(event.target===dialog)dialog.close();
 });
 dialog.addEventListener('keydown',async event=>{
  if(event.key==='ArrowRight'&&photos.length>1){index=(index+1)%photos.length;await render();}
  else if(event.key==='ArrowLeft'&&photos.length>1){index=(index-1+photos.length)%photos.length;await render();}
 });
 let avatarSwipeStartX=null;
 dialog.addEventListener('touchstart',event=>{avatarSwipeStartX=event.changedTouches?.[0]?.clientX??null;},{passive:true});
 dialog.addEventListener('touchend',async event=>{if(avatarSwipeStartX===null)return;const end=event.changedTouches?.[0]?.clientX??avatarSwipeStartX,delta=end-avatarSwipeStartX;avatarSwipeStartX=null;if(Math.abs(delta)<45||photos.length<2)return;index=(index+(delta<0?1:-1)+photos.length)%photos.length;await render();},{passive:true});
 dialog.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-avatar-comment-form]');if(!form)return;
  event.preventDefault();if(!authRequired())return;
  const textValue=String(new FormData(form).get('comment')||'').trim();if(!textValue)return;
  try{
   await set(push(ref(db,'avatarComments/'+ownerUid+'/'+avatarPhotoKey(photos[index]))),{uid:currentUser.uid,name:currentProfile.name||currentUser.displayName||'Користувач ВАТРИ',avatarUrl:currentProfile.avatarUrl||'',text:textValue.slice(0,500),createdAt:Date.now()});
   await render();
  }catch(error){toastMsg(niceError(error));}
 });
 dialog.addEventListener('close',()=>dialog.remove());
 await render();dialog.showModal();
}
function profileBioMarkup(text){
 const safe=esc(text||'');
 if(String(text||'').length<=95)return '<p class="vatra-profile-bio">'+safe+'</p>';
 return '<div class="vatra-profile-bio-block"><p class="vatra-profile-bio" id="vatraProfileBio">'+safe+'</p><button type="button" class="vatra-profile-bio-toggle" data-toggle-profile-bio aria-controls="vatraProfileBio" aria-expanded="false">Показати весь опис</button></div>';
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-toggle-profile-bio]');
 if(!button)return;
 const block=button.closest('.vatra-profile-bio-block');
 if(!block)return;
 const expanded=block.classList.toggle('is-expanded');
 button.setAttribute('aria-expanded',String(expanded));
 button.textContent=expanded?'Згорнути опис':'Показати весь опис';
});

const VATRA_SEARCH_FIELDS=new Set(['city','location','workplace','education','hometown']);
function profileDetailMarkup(label,value,field=''){
 if(!value)return '';
 const safe=esc(value);
 const linked=VATRA_SEARCH_FIELDS.has(field)
  ?'<button type="button" class="vatra-profile-attribute-link" data-profile-search-field="'+field+'" data-profile-search-value="'+safe+'" title="Знайти людей за цими даними">'+safe+'</button>'
  :'<b>'+safe+'</b>';
 const iconKey=({'День народження':'birthday','Місто':'city','Місце проживання':'location','Місце роботи':'workplace','Навчання':'education','Рідне місто':'hometown','Телефон':'phone','Вебсайт':'website'})[label]||field;
 return '<div class="vatra-profile-detail"><span class="vatra-profile-detail-label">'+vatraProfileSvgIcon(iconKey)+esc(label)+'</span>'+linked+'</div>';
}
function visibleProfileSearchValue(uid,u,field){
 if(!VATRA_SEARCH_FIELDS.has(field))return '';
 if(u?.profileVisibility==='private'&&!friends[uid])return '';
 if(u?.[field+'Visibility']==='public')return String(u[field]||'');
 if(u?.[field+'Visibility']==='friends'&&friends[uid])return String(friendProfiles[uid]?.[field]||'');
 return '';
}
document.addEventListener('click',event=>{
 const attr=event.target.closest('[data-profile-search-field]');
 if(attr){
  const key=attr.dataset.profileSearchField,value=String(attr.dataset.profileSearchValue||'').trim();
  if(!VATRA_SEARCH_FIELDS.has(key)||!value)return;
  profileAttributeSearch={field:key,value};
  query='';const input=$('#search');if(input)input.value='';
  goPage('explore');return;
 }
 const stat=event.target.closest('[data-profile-stat]');
 if(!stat)return;
 const action=stat.dataset.profileStat;
 if(['friends','photos','videos'].includes(action))goPage(action==='videos'?'myVideos':action);
 else if(action==='posts')document.getElementById('vatraProfilePosts')?.scrollIntoView({behavior:'smooth',block:'start'});
});

const VATRA_PROFILE_EXTRA_SECTIONS={
 interests:{title:'Захоплення',fields:{hobbies:'Захоплення',activities:'Діяльність',music:'Улюблена музика',films:'Улюблені фільми',books:'Улюблені книги',games:'Улюблені ігри'}},
 service:{title:'Військова служба',fields:{serviceNotes:'Про службу'}},
 life:{title:'Життєва позиція',fields:{lifeNotes:'Погляди та переконання',values:'Головне в житті',inspiration:'Надихають'}}
};
const VATRA_PROFILE_SVG_PATHS={"birthday":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 3v4M17 3v4M3 10h18\"/>","city":"<path d=\"M3 21V7l7-4v18M10 10l11-4v15M6 10v2m0 3v2m8-4v2m4-5v2m0 3v2\"/>","location":"<path d=\"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"2.4\"/>","workplace":"<rect x=\"3\" y=\"7\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18\"/>","education":"<path d=\"m2 9 10-5 10 5-10 5L2 9Zm4 2v6c4 3 8 3 12 0v-6M22 9v7\"/>","hometown":"<path d=\"m3 11 9-8 9 8v10H3V11Zm6 10v-7h6v7\"/>","phone":"<path d=\"M6 3h4l1 5-3 2a17 17 0 0 0 6 6l2-3 5 1v4a3 3 0 0 1-3 3A16 16 0 0 1 3 6a3 3 0 0 1 3-3Z\"/>","website":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18\"/>","interests":"<path d=\"m12 2 2.8 6.3L22 9l-5.2 4.6 1.5 7.2L12 17.1l-6.3 3.7 1.5-7.2L2 9l7.2-.7L12 2Z\"/>","hobbies":"<path d=\"m12 2 2.6 6 6.4.6-4.8 4.3 1.3 6.6L12 16l-5.5 3.5 1.3-6.6L3 8.6 9.4 8 12 2Z\"/>","activities":"<rect x=\"3\" y=\"7\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18\"/>","music":"<path d=\"M9 18V5l11-2v13M9 9l11-2\"/><ellipse cx=\"6\" cy=\"18\" rx=\"3\" ry=\"2\"/><ellipse cx=\"17\" cy=\"16\" rx=\"3\" ry=\"2\"/>","films":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"15\" rx=\"2\"/><path d=\"M3 10h18M7 5l3 5m3-5 3 5m-7 3 5 3-5 3v-6Z\"/>","books":"<path d=\"M12 6C9 4 6 4 3 5v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v15\"/>","games":"<path d=\"M7 9h10a5 5 0 0 1 4.8 6.5l-1 3a2 2 0 0 1-3 1L14 17h-4l-3.8 2.5a2 2 0 0 1-3-1l-1-3A5 5 0 0 1 7 9Z\"/><path d=\"M7 12v4m-2-2h4M16 13h.01M18 15h.01\"/>","service":"<path d=\"M12 2 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z\"/><path d=\"m9 12 2 2 4-4\"/>","life":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m15.5 8.5-2 5-5 2 2-5 5-2Z\"/>","values":"<path d=\"M12 21 4 12a5 5 0 0 1 8-6 5 5 0 0 1 8 6l-8 9Z\"/>","inspiration":"<path d=\"M9 18h6M10 21h4M9 15c0-2-4-3-4-7a7 7 0 0 1 14 0c0 4-4 5-4 7v1H9v-1Z\"/>","serviceNotes":"<path d=\"M12 2 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z\"/><path d=\"m9 12 2 2 4-4\"/>","lifeNotes":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m15.5 8.5-2 5-5 2 2-5 5-2Z\"/>"};
function vatraProfileSvgIcon(key){const paths=VATRA_PROFILE_SVG_PATHS[key];return paths?'<span class="vatra-profile-line-icon" aria-hidden="true" style="display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 18px!important;width:18px!important;height:18px!important;min-width:18px!important;max-width:18px!important;min-height:18px!important;max-height:18px!important;vertical-align:middle!important;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="display:block!important;width:18px!important;height:18px!important;min-width:18px!important;max-width:18px!important;min-height:18px!important;max-height:18px!important;flex:0 0 18px!important;fill:none!important;stroke:currentColor!important;" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false">'+paths+'</svg></span>':'';}
const VATRA_PROFILE_OPEN_SECTIONS=new Set();
function vatraExtraSectionsMarkup(values={},visibility={},owner=false,profileId='self',canSeeFriends=false){
 const output=[];
 for(const [section,data] of Object.entries(VATRA_PROFILE_EXTRA_SECTIONS)){
  const rows=[];
  for(const [key,label] of Object.entries(data.fields)){
   const value=String(values?.[key]||'').trim();
   if(!value)continue;
   const isPublic=visibility?.[key]==='public';
   const isFriendOnly=visibility?.[key]==='friends';
   if(!owner&&!isPublic&&!(canSeeFriends&&isFriendOnly))continue;
   rows.push('<div class="vatra-profile-extra-row'+(section==='interests'&&key==='hobbies'?' vatra-profile-extra-intro':'')+'">'+(section==='interests'&&key==='hobbies'?'':'<dt>'+vatraProfileSvgIcon(key)+'<span>'+esc(label)+'</span></dt>')+'<dd>'+safeText(value)+(owner&&!isPublic?'<small class="vatra-profile-extra-privacy">'+(isFriendOnly?'Для друзів':'Лише для себе')+'</small>':'')+'</dd></div>');
  }
  if(!rows.length)continue;
  const key=String(profileId)+':'+section,expanded=VATRA_PROFILE_OPEN_SECTIONS.has(key);
  const bodyId='vatra-profile-fold-'+(owner?'self-':'other-')+section;
  const count=rows.length;
  output.push('<section class="vatra-profile-extra-card vatra-profile-extra-fold'+(expanded?' is-open':'')+'" style="display:block!important;min-width:0!important;width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;overflow:hidden!important;border:1px solid #e1e9f2!important;border-radius:9px!important;">'+
   '<button type="button" class="vatra-profile-extra-trigger" style="display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;width:100%!important;max-width:100%!important;min-width:0!important;min-height:39px!important;height:auto!important;margin:0!important;padding:7px 10px!important;border:0!important;background:transparent!important;text-align:left!important;box-shadow:none!important;" data-vatra-profile-fold="'+esc(key)+'" aria-expanded="'+expanded+'" aria-controls="'+bodyId+'">'+
    '<span class="vatra-profile-extra-heading" style="display:inline-flex!important;align-items:center!important;flex:1 1 auto!important;min-width:0!important;gap:10px!important;">'+vatraProfileSvgIcon(section)+'<span class="vatra-profile-extra-heading-text" style="display:grid!important;gap:2px!important;min-width:0!important;"><strong style="display:block!important;font-size:13px!important;line-height:1.35!important;">'+esc(data.title)+'</strong><small style="display:block!important;font-size:11px!important;line-height:1.3!important;">'+count+' '+(count===1?'поле':count>=2&&count<=4?'поля':'полів')+'</small></span></span>'+
    '<svg class="vatra-profile-fold-chevron" xmlns="http://www.w3.org/2000/svg" width="18" height="18" style="display:block!important;width:18px!important;height:18px!important;max-width:18px!important;min-width:18px!important;max-height:18px!important;min-height:18px!important;flex:0 0 18px!important;fill:none!important;stroke:currentColor!important;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'+
   '</button><div class="vatra-profile-extra-body" style="max-width:100%!important;min-width:0!important;padding:10px 12px!important;" id="'+bodyId+'"'+(expanded?'':' hidden')+'><dl>'+rows.join('')+'</dl></div></section>');
 }
 return output.length?'<div class="vatra-profile-extras vatra-profile-extras-folded">'+output.join('')+'</div>':'';
}
document.addEventListener('click',event=>{
 const trigger=event.target.closest('[data-vatra-profile-fold]');
 if(!trigger)return;
 const card=trigger.closest('.vatra-profile-extra-fold'),body=card?.querySelector('.vatra-profile-extra-body');
 if(!card||!body)return;
 const expanded=trigger.getAttribute('aria-expanded')!=='true';
 trigger.setAttribute('aria-expanded',String(expanded));
 card.classList.toggle('is-open',expanded);
 body.hidden=!expanded;
 const key=trigger.dataset.vatraProfileFold;
 if(expanded)VATRA_PROFILE_OPEN_SECTIONS.add(key);else VATRA_PROFILE_OPEN_SECTIONS.delete(key);
});
function renderProfile(){
 if(!currentUser){
  setFeed('<article class="post"><h3>Увійдіть, щоб відкрити профіль</h3><button class="primary" id="profileLogin">Увійти</button></article>');
  $('#profileLogin')?.addEventListener('click',()=>openAuth('login'));return;
 }
 const uid=currentUser.uid;
 const name=currentProfile.name||currentUser.displayName||'Користувач ВАТРИ';
 const mine=Object.entries(posts).map(([id,p])=>({...p,id})).filter(p=>p.authorUid===uid).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 const birthday=currentProfile.dateOfBirth?new Date(currentProfile.dateOfBirth+'T00:00:00').toLocaleDateString('uk-UA',{day:'numeric',month:'long',year:'numeric'}):'';
 const detail=(label,value,field='')=>profileDetailMarkup(label,value,field);
 const gallery=[...(Array.isArray(currentProfile.profilePhotos)?currentProfile.profilePhotos.map((url,index)=>({url,index,source:'profile',createdAt:Number(currentProfile.photoUploadedAt?.[url])||index+1})).filter(item=>item.url):[]),...mine.flatMap(p=>postImages(p).map((url,index)=>({url,createdAt:p.createdAt,source:'post',id:p.id,index})))].sort((a,b)=>b.createdAt-a.createdAt);
 const history=Array.isArray(currentProfile.avatarHistory)?currentProfile.avatarHistory.map((url,index)=>({url,index})).filter(x=>x.url&&x.url!==currentProfile.avatarUrl).slice(-30).reverse():[];
 const avatarPhotos=[currentProfile.avatarUrl,...history.map(item=>item.url)].filter(Boolean);
 const historyHtml=history.length?'<div class="avatar-history-grid">'+history.map(item=>'<div class="avatar-history-item"><img class="post-image" loading="lazy" decoding="async" src="'+esc(item.url)+'" alt="Попереднє фото профілю"><button type="button" class="pill" data-restore-avatar="'+item.index+'">Поставити аватар</button></div>').join('')+'</div>':'<p class="muted profile-empty-hint">Тут з’являтимуться попередні фото профілю, які Ви вирішите залишити.</p>';
 const galleryUrls=gallery.map(item=>item.url);
 const galleryHtml=gallery.length?'<div class="profile-photo-gallery">'+gallery.slice(0,4).map((photo,index)=>'<div class="profile-photo-tile"><button type="button" class="profile-gallery-open" data-open-profile-gallery="'+esc(uid)+'" data-photo-urls="'+esc(JSON.stringify(galleryUrls))+'" data-photo-index="'+index+'" aria-label="Відкрити фото '+(index+1)+'"><img loading="lazy" decoding="async" src="'+esc(photo.url)+'" alt="Фото профілю"></button><small>'+(photo.source==='profile'?'Фото профілю':timeAgo(photo.createdAt))+'</small>'+(photo.source==='profile'?'<button type="button" class="profile-photo-remove" data-delete-profile-photo="'+photo.index+'">Прибрати</button>':'')+'</div>').join('')+'</div>'+(gallery.length>4?'<button type="button" class="vatra-profile-link profile-gallery-all" id="profileOpenAllPhotos">Відкрити повний альбом ('+gallery.length+')</button>':''):'<p class="muted profile-empty-hint">У цьому альбомі поки немає фотографій.</p>'
 const friendIds=Object.keys(friends||{}).filter(id=>id&&id!==uid&&users[id]&&!blockedUsers[id]);
 const friendPreview=friendIds.slice(0,6).map(vatraProfileFriendThumb).join('');
 const friendBlock='<section class="vatra-profile-card vatra-profile-friends"><div class="vatra-profile-card-head"><h3>Друзі</h3><b>'+friendIds.length+'</b></div>'+(friendPreview?'<div class="vatra-profile-friend-grid" style="display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-auto-flow:row!important;">'+friendPreview+'</div>':'<p class="muted">Друзі з’являться тут після додавання.</p>')+'<button type="button" class="vatra-profile-link" id="profileAllFriends">Усі друзі →</button></section>';
 const detailHtml=detail('День народження',birthday)+detail('Місто',currentProfile.city,'city')+detail('Місце проживання',currentProfile.location,'location')+detail('Місце роботи',currentProfile.workplace,'workplace')+detail('Навчання',currentProfile.education,'education')+detail('Рідне місто',currentProfile.hometown,'hometown')+detail('Телефон',currentProfile.phone||privatePhone)+detail('Вебсайт',currentProfile.website);
 const hasDetails=!!(birthday||currentProfile.city||currentProfile.location||currentProfile.workplace||currentProfile.education||currentProfile.hometown||currentProfile.phone||privatePhone||currentProfile.website);
 const myVideos=Object.values(videos||{}).filter(v=>v&&v.authorUid===uid).length;
 const stats='<div class="vatra-profile-stats"><button type="button" data-profile-stat="friends"><b>'+friendIds.length+'</b><span>Друзі</span></button><button type="button" data-profile-stat="photos"><b>'+gallery.length+'</b><span>Фотографії</span></button><button type="button" data-profile-stat="videos"><b>'+myVideos+'</b><span>Відео</span></button><button type="button" data-profile-stat="posts"><b>'+mine.length+'</b><span>Дописи</span></button></div>';
 const profileHtml='<section class="vatra-profile-layout">'+
  '<aside class="vatra-profile-sidebar">'+
   '<section class="vatra-profile-card vatra-profile-avatar-card">'+
    '<div class="vatra-avatar-hover-wrap" id="vatraAvatarWrap">'+
     '<button type="button" class="vatra-profile-avatar-open" data-avatar-viewer="'+esc(uid)+'" data-avatar-urls="'+esc(JSON.stringify(avatarPhotos))+'" aria-label="Переглянути фото профілю">'+avatar(name,currentProfile.avatarUrl,'vatra-profile-photo')+'</button>'+
     '<div class="vatra-avatar-hover-menu" id="vatraAvatarMenu" role="group" aria-label="Керування фото профілю">'+
      '<button type="button" data-avatar-photo-action="change">Змінити фотографію</button>'+
      '<button type="button" data-avatar-photo-action="edit"'+(currentProfile.avatarUrl?'':' disabled')+'>Редагувати</button>'+
      '<button type="button" class="vatra-avatar-remove" data-avatar-photo-action="remove"'+(currentProfile.avatarUrl?'':' disabled')+'>Видалити</button>'+
     '</div>'+
     '<button type="button" class="vatra-avatar-touch-toggle" data-avatar-menu-toggle aria-expanded="false" aria-controls="vatraAvatarMenu">Дії з фото</button>'+
    '</div>'+
    '<button type="button" class="vatra-profile-edit" id="editProfile">Редагувати профіль</button>'+
    '<input id="avatarUpload" type="file" accept="image/*" hidden></section>'+
   friendBlock+

  '</aside>'+
  '<div class="vatra-profile-main">'+
   '<section class="vatra-profile-card vatra-profile-overview vatra-profile-summary-compact">'+
    '<div class="vatra-profile-title-row"><div class="vatra-profile-title-info"><div class="vatra-profile-name-line"><h2>'+esc(name)+verifiedBadge(uid)+'</h2>'+profilePresenceMarkup(currentProfile,true)+'</div>'+
    '<div class="vatra-profile-status-row">'+(currentProfile.status?'<p class="profile-status vatra-profile-status">'+esc(currentProfile.status)+'</p>':'<p class="vatra-profile-status is-empty">Додайте свій статус</p>')+'<button type="button" class="vatra-profile-status-edit" id="profileStatusEdit">'+(currentProfile.status?'Змінити статус':'Додати статус')+'</button></div>'+
    '<p class="profile-handle">@'+esc(currentProfile.handle||'user')+'</p></div></div>'+
    profileBioMarkup(currentProfile.bio||'Додайте коротку інформацію про себе в налаштуваннях профілю.')+
    '<div class="vatra-profile-details">'+(hasDetails?detailHtml:'<p class="muted">Додайте інформацію про себе та виберіть, що буде видно іншим.</p>')+'</div>'+vatraExtraSectionsMarkup(currentProfile.privateSections||privateProfileSections,currentProfile.extraVisibility||{},true,uid)+
    stats+
   '</section>'+
   '<section class="vatra-profile-card vatra-profile-photos"><div class="vatra-profile-card-head"><h3>Мої фотографії <span>'+gallery.length+'</span></h3><button type="button" class="vatra-profile-link" id="profileViewPhotos">Усі фото</button><button type="button" class="vatra-profile-link" id="profileAddPhoto">＋ Додати фото</button><input id="profilePhotoUpload" type="file" accept="image/*" multiple hidden></div>'+galleryHtml+'</section>'+
   '<section class="vatra-profile-card vatra-profile-compose"><button type="button" class="vatra-profile-compose-trigger" id="profilePrompt">'+avatar(name,currentProfile.avatarUrl,'vatra-profile-compose-avatar')+'<span>Що у Вас нового?</span><b>＋</b></button></section>'+
   '<section class="vatra-profile-posts vatra-profile-posts-clean" id="vatraProfilePosts"><div class="vatra-profile-post-tabs"><div class="vatra-profile-posts-title"><h3>Мої дописи</h3><span>'+mine.length+'</span></div><button type="button" class="vatra-profile-new-post" id="profileCreatePost">＋ Створити допис</button></div>'+
    (mine.map(postCard).join('')||'<article class="post vatra-profile-empty-post"><h3>Поки немає дописів</h3><p class="muted">Ваші записи з’являться тут. Поділіться першою історією у ВАТРІ.</p><button type="button" class="primary" id="profileFirstPost">Створити допис</button></article>')+
   '</section>'+
  '</div>'+
 '</section>';
 setFeed(profileHtml,false);
 $('#editProfile')?.addEventListener('click',editProfile);
 $('#profileStatusEdit')?.addEventListener('click',editProfileStatus);
 $('#profileAllFriends')?.addEventListener('click',()=>goPage('friends'));
 $('#avatarUpload')?.addEventListener('change',uploadAvatar);
 $('#profileCreatePost')?.addEventListener('click',openComposer);
 $('#profilePrompt')?.addEventListener('click',openComposer);
 $('#profileFirstPost')?.addEventListener('click',openComposer);
 $('#profileViewPhotos')?.addEventListener('click',()=>goPage('photos'));
 $('#profileOpenAllPhotos')?.addEventListener('click',()=>goPage('photos'));
 $('#profileAddPhoto')?.addEventListener('click',()=>{if(authRequired())$('#profilePhotoUpload')?.click();});
 $('#profilePhotoUpload')?.addEventListener('change',uploadProfilePhoto);
}
function vatraExploreIcon(name){
 const paths={
  follow:'<path d="M12 5v14M5 12h14"/>',
  following:'<path d="M20 6 9 17l-5-5"/>',
  friend:'<path d="M20 6 9 17l-5-5"/>',
  addFriend:'<circle cx="9" cy="8" r="3"/><path d="M3 19v-2a6 6 0 0 1 12 0v2M19 8v6m-3-3h6"/>',
  profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  message:'<path d="M4 5h16v12H8l-4 3V5Z"/><path d="M8 10h8M8 13h5"/>'
 };
 return '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="display:block!important;width:16px!important;height:16px!important;min-width:16px!important;max-width:16px!important;min-height:16px!important;max-height:16px!important;flex:0 0 16px!important;fill:none!important;stroke:currentColor!important;" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||'')+'</svg>';
}
let vatraSearchCategory='all';
function vatraExplorePersonMarkup(id,u){
 const uid=esc(id),name=esc(u.name||'Користувач ВАТРИ'),handle=esc(u.handle||'user');
 const friend=!!friends[id],requested=!!friendRequests[id];
 return '<article class="vatra-search-person-row">'+
  '<button type="button" class="vatra-search-person-photo" data-view-profile="'+uid+'">'+avatar(u.name||'Користувач',u.avatarUrl)+'</button>'+
  '<div class="vatra-search-person-body"><button type="button" class="vatra-search-person-name" data-view-profile="'+uid+'">'+name+verifiedBadge(id)+'</button>'+
   '<small>@'+handle+'</small>'+
   (u.bio?'<p>'+esc(String(u.bio).slice(0,135))+'</p>':'')+
   '<button type="button" class="vatra-search-message" data-message-user="'+uid+'">'+vatraExploreIcon('message')+'<span>Написати</span></button>'+
  '</div><div class="vatra-search-person-actions">'+
   ''+
   (!friend&&!requested?'<button type="button" class="vatra-search-add-friend" data-friend-request="'+uid+'">Додати в друзі</button>':friend?'<span class="vatra-search-friend-state">✓ Друзі</span>':friendRequests[id]?.direction==='incoming'?'<button type="button" class="vatra-search-add-friend" data-accept-friend="'+uid+'">Прийняти запит</button>':'<span class="vatra-search-friend-state">Запит надіслано</span>')+
  '</div></article>';
}
function renderExplore(){
 const attribute=profileAttributeSearch,needle=String(attribute?.value||query||'').trim().toLocaleLowerCase('uk-UA');
 const norm=s=>String(s||'').toLocaleLowerCase('uk-UA');
 const people=Object.entries(users||{}).filter(([id,u])=>{
  if(id===currentUser?.uid||blockedUsers[id]||u?.searchable===false)return false;
  if(attribute){const value=norm(visibleProfileSearchValue(id,u,attribute.field));return !!value&&!!needle&&(value===needle||value.includes(needle));}
  return !needle||norm((u?.name||'')+' '+(u?.handle||'')+' '+(u?.bio||'')).includes(needle);
 });
 const publicGroups=Object.entries(groups||{}).filter(([id,g])=>g?.name&&(g.visibility!=='private'||g.ownerUid===currentUser?.uid||!!groupMembers[id]?.[currentUser?.uid]))
  .filter(([,g])=>!needle||norm((g.name||'')+' '+(g.category||'')+' '+(g.description||'')).includes(needle));
 const matchingPosts=allPosts().filter(p=>!needle||norm((p.text||'')+' '+(p.authorName||'')+' '+(p.authorHandle||'')).includes(needle));
 const categories=[['all','Усі'],['people','Люди'],['posts','Дописи'],['groups','Спільноти']];
 if(!categories.some(([key])=>key===vatraSearchCategory))vatraSearchCategory='all';
 const compact=vatraSearchCategory==='all',renderAll=vatraSearchCategory==='all';
 const groupItem=([id,g])=>'<article class="vatra-search-group-row"><button type="button" data-open-group="'+esc(id)+'" class="vatra-search-group-avatar">'+esc(String(g.name).trim().charAt(0).toLocaleUpperCase('uk-UA'))+'</button><div><button type="button" data-open-group="'+esc(id)+'" class="vatra-search-person-name">'+esc(g.name)+'</button><small>'+esc(g.category||'Спільнота ВАТРИ')+'</small></div><button type="button" class="vatra-search-subscribe" data-open-group="'+esc(id)+'">Відкрити</button></article>';
 const peopleHTML=people.slice(0,compact?3:100).map(([id,u])=>vatraExplorePersonMarkup(id,u)).join('');
 const groupsHTML=publicGroups.slice(0,compact?3:100).map(groupItem).join('');
 const postsHTML=matchingPosts.slice(0,compact?2:50).map(postCard).join('');
 const section=(key,title,length,content)=>'<section class="vatra-search-section"><div class="vatra-search-section-head"><h3>'+title+' <span>'+length+'</span></h3>'+(compact&&length>3?'<button type="button" data-vatra-search-category="'+key+'">Показати всіх</button>':'')+'</div>'+(content||'<p class="vatra-search-empty">Нічого не знайдено.</p>')+'</section>';
 const content=compact?section('people','Люди',people.length,peopleHTML)+section('groups','Спільноти',publicGroups.length,groupsHTML)+section('posts','Дописи з доступної стрічки',matchingPosts.length,postsHTML):
 vatraSearchCategory==='people'?section('people','Люди',people.length,peopleHTML):
 vatraSearchCategory==='groups'?section('groups','Спільноти',publicGroups.length,groupsHTML):
 section('posts','Дописи з доступної стрічки',matchingPosts.length,postsHTML);
 const searchValue=attribute?attribute.value:query;
 const header='<div class="vatra-search-top"><h2>Результати пошуку</h2><form id="vatraSearchForm" class="vatra-search-form"><label><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input name="term" value="'+esc(searchValue)+'" placeholder="Пошук у ВАТРІ" aria-label="Пошуковий запит"></label><button type="submit">Знайти</button></form>'+(attribute?'<button type="button" class="vatra-profile-search-clear" data-clear-profile-search>Скинути фільтр</button>':'')+'</div>';
 const rail='<aside class="vatra-search-rail"><nav aria-label="Категорії пошуку">'+categories.map(([key,label])=>'<button type="button" data-vatra-search-category="'+key+'" class="'+(vatraSearchCategory===key?'active':'')+'">'+label+'</button>').join('')+'</nav></aside>';
 setFeed('<div class="vatra-search-layout"><div class="vatra-search-main">'+header+content+'</div>'+rail+'</div>',false);
 $('#vatraSearchForm')?.addEventListener('submit',event=>{
  event.preventDefault();query=String(new FormData(event.currentTarget).get('term')||'').trim();profileAttributeSearch=null;
  const globalSearch=$('#search');if(globalSearch)globalSearch.value=query;renderExplore();
 });
 $$('#feed [data-vatra-search-category]').forEach(button=>button.addEventListener('click',()=>{
  vatraSearchCategory=button.dataset.vatraSearchCategory;renderExplore();
 }));
}

document.addEventListener('click',event=>{
 if(!event.target.closest('[data-clear-profile-search]'))return;
 profileAttributeSearch=null;query='';const search=$('#search');if(search)search.value='';renderExplore();
});
let vatraFriendsTab='all';
function vatraFriendsOnline(u={}){
 const t=Number(u.lastSeenAt)||0;return u.isOnline===true&&t>0&&Date.now()-t<120000;
}
function vatraFriendsRow(uid,kind='friend'){
 const u=users[uid]||{},id=esc(uid),name=esc(u.name||'Користувач ВАТРИ');
 const actions=kind==='incoming'?'<button type="button" class="vatra-friends-action primary" data-accept-friend="'+id+'">Прийняти</button><button type="button" class="vatra-friends-action pill" data-decline-friend="'+id+'">Відхилити</button>':
 kind==='outgoing'?'<span class="vatra-friends-request-wait">Очікує відповіді</span>':
 '<button type="button" class="vatra-friends-action pill" data-message-user="'+id+'">Написати</button><button type="button" class="vatra-friends-action pill" data-view-profile="'+id+'">Профіль</button>'+(kind==='friend'?'<div class="vatra-friends-more-wrap"><button type="button" class="vatra-friends-more" data-vatra-friends-more aria-expanded="false" aria-label="Додаткові дії">⋯</button><div class="vatra-friends-more-menu" hidden><button type="button" data-remove-friend="'+id+'">Видалити з друзів</button></div></div>':'');
 const presence=vatraFriendsOnline(u)?'<span class="vatra-friends-presence-online">Онлайн</span>':Number(u.lastSeenAt)?'<span class="vatra-friends-presence-last">Був(-ла) '+esc(timeAgo(Number(u.lastSeenAt)))+'</span>':'';
 return '<article class="vatra-friends-row" data-friend-search="'+esc((u.name||'')+' '+(u.handle||''))+'">'+
  '<button type="button" class="vatra-friends-photo" data-view-profile="'+id+'" aria-label="Відкрити профіль '+name+'">'+avatar(u.name||'Користувач',u.avatarUrl)+'</button>'+
  '<div class="vatra-friends-info"><button type="button" class="vatra-friends-name" data-view-profile="'+id+'">'+name+'</button><small>@'+esc(u.handle||'user')+'</small>'+presence+'</div>'+
  '<div class="vatra-friends-row-actions">'+actions+'</div></article>';
}
function renderFriends(){
 const valid=([uid])=>uid&&uid!==currentUser?.uid&&!blockedUsers[uid]&&!!users[uid];
 const all=Object.entries(friends||{}).filter(valid);
 const online=all.filter(([uid])=>vatraFriendsOnline(users[uid]));
 const incoming=Object.entries(friendRequests||{}).filter(([uid,r])=>valid([uid])&&r?.status==='pending'&&r.direction==='incoming');
 const outgoing=Object.entries(friendRequests||{}).filter(([uid,r])=>valid([uid])&&r?.status==='pending'&&r.direction==='outgoing');
 const data={all,online,incoming,outgoing};
 if(!data[vatraFriendsTab])vatraFriendsTab='all';
 const selected=data[vatraFriendsTab];
 const tabs=[['all','Мої друзі',all.length],['online','Онлайн',online.length],['incoming','Вхідні запити',incoming.length],['outgoing','Вихідні запити',outgoing.length]];
 const headers={all:'Мої друзі',online:'Друзі онлайн',incoming:'Вхідні запити',outgoing:'Вихідні запити'};
 const candidates=Object.entries(users||{}).filter(([uid,u])=>uid!==currentUser?.uid&&u?.name&&u.searchable!==false&&!blockedUsers[uid]&&!friends[uid]&&!friendRequests[uid]).slice(0,5);
 const recommendation=candidates.map(([uid,u])=>'<div class="vatra-friends-suggestion"><button type="button" data-view-profile="'+esc(uid)+'">'+avatar(u.name,u.avatarUrl)+'<span><b>'+esc(u.name)+'</b><small>@'+esc(u.handle||'user')+'</small></span></button><button type="button" class="vatra-friends-add" data-friend-request="'+esc(uid)+'" aria-label="Додати в друзі '+esc(u.name)+'">＋</button></div>').join('');
 const nav=([id,label,n])=>'<button type="button" data-vatra-friends-tab="'+id+'" class="'+(vatraFriendsTab===id?'is-active':'')+'"><span>'+label+'</span><small>'+n+'</small></button>';
 setFeed('<div class="vatra-friends-layout"><section class="vatra-friends-main"><div class="vatra-friends-top"><h2>'+headers[vatraFriendsTab]+'</h2><button type="button" class="vatra-friends-find" data-vatra-find-people>Знайти друзів</button></div>'+
 '<div class="vatra-friends-tabs">'+tabs.slice(0,2).map(nav).join('')+'</div>'+
 '<div class="vatra-friends-search"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input id="vatraFriendsFilter" type="search" autocomplete="off" placeholder="Введіть ім’я або псевдонім" aria-label="Пошук серед друзів"></div>'+
 '<div class="vatra-friends-results">'+(selected.map(([uid])=>vatraFriendsRow(uid,vatraFriendsTab==='incoming'?'incoming':vatraFriendsTab==='outgoing'?'outgoing':'friend')).join('')||'<p class="vatra-friends-empty">У цьому розділі поки немає користувачів.</p>')+'</div><p id="vatraFriendsNoMatch" class="vatra-friends-empty" hidden>За запитом нікого не знайдено.</p></section>'+
 '<aside class="vatra-friends-side"><section class="vatra-friends-panel"><h3>Розділи</h3>'+tabs.map(t=>'<div class="vatra-friends-side-item">'+nav(t)+'</div>').join('')+'<button class="vatra-friends-side-search" type="button" data-vatra-find-people>Пошук людей</button></section>'+
 (recommendation?'<section class="vatra-friends-panel"><h3>Можливі знайомства</h3>'+recommendation+'<button type="button" class="vatra-friends-side-search" data-vatra-find-people>Показати всіх</button></section>':'')+'</aside></div>',false);
 $$('#feed [data-vatra-friends-tab]').forEach(btn=>btn.addEventListener('click',()=>{vatraFriendsTab=btn.dataset.vatraFriendsTab;renderFriends();}));
 $$('#feed [data-vatra-find-people]').forEach(btn=>btn.addEventListener('click',()=>goPage('explore')));
 $('#vatraFriendsFilter')?.addEventListener('input',event=>{
  const q=event.target.value.trim().toLocaleLowerCase('uk-UA');let visible=0;
  $$('#feed .vatra-friends-row').forEach(row=>{row.hidden=!String(row.dataset.friendSearch||'').toLocaleLowerCase('uk-UA').includes(q);if(!row.hidden)visible++;});
  const empty=$('#vatraFriendsNoMatch');if(empty)empty.hidden=visible>0||selected.length===0;
 });
 $$('#feed [data-vatra-friends-more]').forEach(btn=>btn.addEventListener('click',()=>{const menu=btn.parentElement.querySelector('.vatra-friends-more-menu');menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',String(!menu.hidden));}));
}
function vatraProfileFriendThumb(uid){
 const u=users[uid]||{},name=u.name||'Користувач';
 return '<button type="button" class="vatra-profile-friend" data-view-profile="'+esc(uid)+'" title="'+esc(name)+'">'+avatar(name,u.avatarUrl,'vatra-profile-friend-avatar')+'<span>'+esc(name)+'</span></button>';
}
let vatraProfileFriendsCache=new Map();

function renderPublicFriendsPage(ownerUid,ids){
 if(!ownerUid||activeProfileUid!==ownerUid)return;
 const u=users[ownerUid]||{},list=(Array.isArray(ids)?ids:[]).filter(id=>users[id]&&!blockedUsers[id]);
 page='publicProfile';document.body.dataset.page=page;
 const rows=list.map(id=>{
  const p=users[id],name=p.name||'Користувач ВАТРИ';
  return '<article class="vatra-public-friend-row" data-friend-filter="'+esc((name+' '+(p.handle||'')).toLocaleLowerCase('uk-UA'))+'">'+
   '<button type="button" data-view-profile="'+esc(id)+'" class="vatra-public-friend-person">'+avatar(name,p.avatarUrl,'vatra-public-friend-avatar')+
   '<span><b>'+esc(name)+'</b><small>@'+esc(p.handle||'user')+'</small></span></button>'+
   '<button type="button" data-view-profile="'+esc(id)+'" class="vatra-public-friend-open">Профіль</button></article>';
 }).join('');
 setFeed('<section class="vatra-public-friends-page"><header class="vatra-public-friends-head">'+
  '<button id="vatraFriendsBackToProfile" type="button" aria-label="Повернутися до профілю">←</button>'+
  '<div><h2>Друзі · '+esc(u.name||'Користувач ВАТРИ')+'</h2><small>'+list.length+' у списку</small></div></header>'+
  '<label class="vatra-public-friends-search"><span aria-hidden="true">⌕</span><input type="search" id="vatraPublicFriendsSearch" placeholder="Пошук серед друзів" aria-label="Пошук серед друзів"></label>'+
  '<div class="vatra-public-friends-list">'+(rows||'<p class="vatra-public-friends-empty">Немає доступних друзів.</p>')+'</div>'+
  '<p class="vatra-public-friends-empty" id="vatraPublicFriendsEmpty" hidden>Нікого не знайдено.</p></section>',false);
 $('#vatraFriendsBackToProfile').onclick=()=>renderPublicProfile(ownerUid);
 $('#vatraPublicFriendsSearch').oninput=e=>{
  const term=e.target.value.trim().toLocaleLowerCase('uk-UA');let n=0;
  $('#feed [data-friend-filter]').forEach(row=>{row.hidden=!row.dataset.friendFilter.includes(term);if(!row.hidden)n++;});
  $('#vatraPublicFriendsEmpty').hidden=n>0||list.length===0;
 };
 window.scrollTo(0,0);
}

async function loadPublicFriends(ownerUid){
 const container=$('#vatraPublicFriendList'),count=$('#vatraPublicFriendCount');
 if(!container||!count)return;
 try{
  let cached=vatraProfileFriendsCache.get(ownerUid),ids=cached?.ids;
  if(!Array.isArray(ids)||Date.now()-cached.at>30000){
   ids=await listProfileFriends(ownerUid);
   vatraProfileFriendsCache.set(ownerUid,{ids,at:Date.now()});
  }
  if(activeProfileUid!==ownerUid||!document.body.contains(container))return;
  const known=ids.filter(id=>users[id]&&!blockedUsers[id]);
  count.textContent=String(known.length);
  const makeFriend=vatraProfileFriendThumb;
  container.innerHTML=known.length?known.slice(0,6).map(makeFriend).join(''):'<p class="muted">Немає доступних друзів.</p>';
  const allButton=$('#vatraPublicAllFriends');
  if(allButton)allButton.onclick=()=>renderPublicFriendsPage(ownerUid,known);
 }catch(err){
  if(activeProfileUid!==ownerUid||!document.body.contains(container))return;
  count.textContent='—';
  container.textContent=err?.code==='FRIENDS_SQL_REQUIRED'?'Список друзів стане доступним після оновлення SQL у Supabase.':'Список друзів зараз недоступний.';
  const allButton=$('#vatraPublicAllFriends');if(allButton)allButton.onclick=()=>toastMsg(container.textContent);
  console.warn('[ВАТРА] Помилка списку друзів:',err);
 }
}

function vatraPublicProfileActions(uid){
 const id=esc(uid),request=friendRequests[uid],pending=request?.status==='pending';
 const relation=friends[uid]
  ?'<span class="vatra-public-relation is-friend" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5L20 6"/></svg>У друзях</span>'
  :pending&&request.direction==='incoming'
   ?'<button type="button" class="vatra-public-relation-action" data-accept-friend="'+id+'">Прийняти запит</button>'
   :pending?'<span class="vatra-public-relation is-pending" role="status">Запит надіслано</span>'
   :'<button type="button" class="vatra-public-relation-action" data-friend-request="'+id+'">Додати в друзі</button>';
 return '<div class="vatra-profile-public-actions" role="group" aria-label="Дії з профілем">'+
  '<button type="button" class="vatra-public-message-action" data-message-user="'+id+'">'+
   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v12H8l-4 3V5.5Z"/><path d="M8 10h8m-8 3h5"/></svg>Написати</button>'+
  relation+'<details class="vatra-public-actions-more"><summary aria-label="Інші дії з профілем" title="Інші дії">'+
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.65"/><circle cx="12" cy="12" r="1.65"/><circle cx="19" cy="12" r="1.65"/></svg></summary>'+
  '<div class="vatra-public-actions-dropdown"><button type="button" data-report-user="'+id+'">Поскаржитися</button>'+
  '<button type="button" class="is-danger" data-block-user="'+id+'">Заблокувати</button></div></details></div>';
}
document.addEventListener('click',event=>{
 document.querySelectorAll('.vatra-public-actions-more[open]').forEach(menu=>{
  if(!menu.contains(event.target))menu.open=false;
 });
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 document.querySelectorAll('.vatra-public-actions-more[open]').forEach(menu=>{
  menu.open=false;menu.querySelector('summary')?.focus();
 });
});

function renderPublicProfile(uid){
 if(!uid)return;
 if(uid===currentUser?.uid){activeProfileUid=null;goPage('profile');return;}
 activeProfileUid=uid;page='publicProfile';document.body.dataset.page=page;
 // The news-feed composer publishes only to the signed-in user's own feed.
 // Never leave it above somebody else's profile after opening a user card.
 const composer=$('.quick-compose');if(composer)composer.hidden=true;
 const sort=$('#sort');if(sort)sort.hidden=true;
 const u=users[uid]||{};
 const friendData=friendProfiles[uid]||{};
 if(blockedUsers[uid]){
  page='publicProfile';
  setFeed('<article class="post"><button class="text-link" id="backExplore">← Назад</button><h2>Профіль приховано</h2><p>Ви заблокували цього користувача. Його дописи й профіль приховані для Вас.</p><button class="pill" data-unblock-user="'+esc(uid)+'">Розблокувати</button></article>');
  $('#backExplore').onclick=()=>goPage('explore');return;
 }
 if(!users[uid])return toastMsg('Профіль не знайдено.');
 if(u.profileVisibility==='private'&&!friends[uid]&&uid!==currentUser?.uid){
  setFeed('<article class="post"><button class="text-link" id="backExplore">← Назад</button><div class="profile-panel">'+avatar(u.name||'Користувач',u.avatarUrl)+'<div><h2>'+esc(u.name||'Користувач ВАТРИ')+verifiedBadge(uid)+'</h2><p>@'+esc(u.handle||'user')+'</p><p>Ця сторінка закрита. Додайте користувача в друзі, щоб побачити більше.</p></div></div>'+vatraPublicProfileActions(uid)+'</article>');
  $('#backExplore').onclick=()=>goPage('explore');return;
 }
 page='publicProfile';
 const arr=Object.entries(posts).map(([id,p])=>({...p,id})).filter(p=>p.authorUid===uid&&!blockedUsers[p.authorUid]).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 const isFriend=!!friends[uid],req=!!friendRequests[uid],canSeeFriends=isFriend||uid===currentUser?.uid;
 const birthday=u.birthdayVisibility==='public'?u.birthdayPublic:(canSeeFriends&&u.birthdayVisibility==='friends'?friendData.birthdayPublic:'');
 const visibleBio=u.bioVisibility==='public'||!u.bioVisibility?u.bio:(canSeeFriends&&u.bioVisibility==='friends'?friendData.bio:'');
 const visibleStatus=u.statusVisibility==='public'||!u.statusVisibility?u.status:(canSeeFriends&&u.statusVisibility==='friends'?friendData.status:'');
 const visibleWebsite=u.websiteVisibility==='public'||!u.websiteVisibility?u.website:(canSeeFriends&&u.websiteVisibility==='friends'?friendData.website:'');
 const city=u.cityVisibility==='public'?u.city:(canSeeFriends&&u.cityVisibility==='friends'?friendData.city:'');
 const location=u.locationVisibility==='public'?u.location:(canSeeFriends&&u.locationVisibility==='friends'?friendData.location:'');
 const phone=u.phoneVisibility==='public'?u.phone:(canSeeFriends&&u.phoneVisibility==='friends'?friendData.phone:'');
 const workplace=u.workplaceVisibility==='public'?u.workplace:(canSeeFriends&&u.workplaceVisibility==='friends'?friendData.workplace:'');
 const education=u.educationVisibility==='public'?u.education:(canSeeFriends&&u.educationVisibility==='friends'?friendData.education:'');
 const hometown=u.hometownVisibility==='public'?u.hometown:(canSeeFriends&&u.hometownVisibility==='friends'?friendData.hometown:'');
 const detail=(label,value,field='')=>profileDetailMarkup(label,value,field);
 const birthdayLabel=birthday?new Date(birthday+'T00:00:00').toLocaleDateString('uk-UA',{day:'numeric',month:'long',year:'numeric'}):'';
 const publicPhotos=Array.isArray(u.profilePhotos)?u.profilePhotos.filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)).slice(-120).reverse():[];
 const avatarPhotos=[u.avatarUrl,...(Array.isArray(u.avatarHistory)?u.avatarHistory:(canSeeFriends&&Array.isArray(friendData.avatarHistory)?friendData.avatarHistory:[])).slice().reverse()].filter(Boolean);
 const postPhotos=arr.flatMap(p=>postImages(p));
 const photoUrls=[...new Set([...publicPhotos.map((url,index)=>({url,date:Number(u.photoUploadedAt?.[url])||index+1})),...arr.flatMap(p=>postImages(p).map(url=>({url,date:p.createdAt||0})))].sort((a,b)=>b.date-a.date).map(item=>item.url))];
 const publicAlbumMarkup=vatraGetAlbums(u).length?'<div class="vatra-public-album-grid">'+vatraGetAlbums(u).map(a=>'<button type="button" class="vatra-public-album-card" data-open-profile-gallery="'+esc(uid)+'" data-photo-urls="'+esc(JSON.stringify(a.photos))+'" data-photo-index="0"'+(!a.photos.length?' disabled':'')+'><span class="vatra-public-album-cover">'+(a.photos.length?'<img src="'+esc(a.photos[a.photos.length-1])+'" loading="lazy" alt="Обкладинка альбому">':'▧')+'</span><b>'+esc(a.name)+'</b><small>'+a.photos.length+' фото</small></button>').join('')+'</div>':'';
  const photoHtml=photoUrls.length?'<div class="profile-photo-gallery">'+photoUrls.slice(0,4).map((url,index)=>'<div class="profile-photo-tile"><button type="button" class="profile-gallery-open" data-open-profile-gallery="'+esc(uid)+'" data-photo-urls="'+esc(JSON.stringify(photoUrls))+'" data-photo-index="'+index+'" aria-label="Відкрити фото '+(index+1)+'"><img class="profile-gallery-image" loading="lazy" decoding="async" src="'+esc(url)+'" alt="Фото користувача"></button></div>').join('')+'</div>'+(photoUrls.length>4?'<button type="button" class="vatra-profile-link profile-gallery-all" data-open-profile-gallery="'+esc(uid)+'" data-photo-urls="'+esc(JSON.stringify(photoUrls))+'" data-photo-index="0">Переглянути всі ('+photoUrls.length+')</button>':''):'<p class="muted profile-empty-hint">Користувач поки не додав фотографій.</p>';
 const hasDetails=!!(birthdayLabel||city||location||workplace||education||hometown||phone||visibleWebsite);
 const videoCount=Object.values(videos||{}).filter(v=>v&&v.authorUid===uid).length;
 const actions=vatraPublicProfileActions(uid);
 const html='<section class="vatra-profile-layout vatra-profile-public-layout">'+
  '<aside class="vatra-profile-sidebar"><section class="vatra-profile-card vatra-profile-avatar-card"><button type="button" class="vatra-profile-avatar-open" data-avatar-viewer="'+esc(uid)+'" data-avatar-urls="'+esc(JSON.stringify(avatarPhotos))+'">'+avatar(u.name||'Користувач',u.avatarUrl,'vatra-profile-photo')+'</button>'+actions+'</section><section class="vatra-profile-card vatra-profile-friends vatra-profile-public-friends"><div class="vatra-profile-card-head"><h3>Друзі</h3><b id="vatraPublicFriendCount">…</b></div><div id="vatraPublicFriendList" class="vatra-profile-friend-grid" style="display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-auto-flow:row!important;"><p class="muted">Завантажуємо список друзів…</p></div><button type="button" class="vatra-profile-link" id="vatraPublicAllFriends">Усі друзі →</button></section></aside>'+
  '<div class="vatra-profile-main">'+
   '<section class="vatra-profile-card vatra-profile-overview vatra-profile-summary-compact">'+
    '<div class="vatra-profile-title-row"><div class="vatra-profile-title-info"><div class="vatra-profile-name-line"><h2>'+esc(u.name||'Користувач ВАТРИ')+verifiedBadge(uid)+'</h2>'+profilePresenceMarkup({isOnline:u.isOnline===true||friendData.isOnline===true,lastSeenAt:Number(u.lastSeenAt)||Number(friendData.lastSeenAt)||0})+'</div>'+
    (visibleStatus?'<div class="vatra-profile-status-row"><p class="profile-status vatra-profile-status">'+esc(visibleStatus)+'</p></div>':'')+
    '<p class="profile-handle">@'+esc(u.handle||'user')+'</p></div><button type="button" class="text-link" id="backExplore">← Назад</button></div>'+
    (visibleBio?profileBioMarkup(visibleBio):'')+
    '<div class="vatra-profile-details">'+(hasDetails?detail('День народження',birthdayLabel)+detail('Місто',city,'city')+detail('Місце проживання',location,'location')+detail('Місце роботи',workplace,'workplace')+detail('Навчання',education,'education')+detail('Рідне місто',hometown,'hometown')+detail('Телефон',phone)+detail('Вебсайт',visibleWebsite):'<p class="muted">Користувач поки не додав відкритої інформації.</p>')+'</div>'+vatraExtraSectionsMarkup({...u.publicSections,...(canSeeFriends?friendData.friendSections:{})},{...u.extraVisibility,...(canSeeFriends?friendData.extraVisibility:{})},false,uid,canSeeFriends)+
    '<div class="vatra-profile-stats"><div><b>'+arr.length+'</b><span>Дописи</span></div><div><b>'+photoUrls.length+'</b><span>Фотографії</span></div><div><b>'+videoCount+'</b><span>Відео</span></div></div>'+
   '</section>'+
   '<section class="vatra-profile-card vatra-profile-photos"><div class="vatra-profile-card-head"><h3>Фотографії <span>'+photoUrls.length+'</span></h3></div>'+publicAlbumMarkup+photoHtml+'</section>'+
   '<section class="vatra-profile-posts vatra-profile-posts-clean"><div class="vatra-profile-post-tabs"><div class="vatra-profile-posts-title"><h3>Дописи</h3><span>'+arr.length+'</span></div></div>'+(arr.map(postCard).join('')||'<article class="post vatra-profile-empty-post"><p class="muted">Цей користувач ще нічого не опублікував.</p></article>')+'</section>'+
  '</div>'+
 '</section>';
 setFeed(html,false);
 loadPublicFriends(uid);
 $('#backExplore').onclick=()=>goPage('explore');
}


/* Albums are part of each VATRA profile, never tied to a third-party account. */
let vatraSelectedAlbumId='';
function vatraGetAlbums(profile=currentProfile){
 return (Array.isArray(profile?.photoAlbums)?profile.photoAlbums:[]).slice(0,12)
  .filter(a=>a&&/^[\w-]{8,80}$/.test(String(a.id||'')))
  .map(a=>({id:String(a.id),name:String(a.name||'Новий альбом').slice(0,60),createdAt:Number(a.createdAt)||0,
   photos:[...new Set((Array.isArray(a.photos)?a.photos:[]).filter(url=>typeof url==='string'&&/^https:\/\//i.test(url)).slice(0,40))]}));
}
async function vatraSaveAlbums(albums){
 if(!currentUser||!authRequired())return;
 const safe=vatraGetAlbums({photoAlbums:albums});
 await update(ref(db,'users/'+currentUser.uid),{photoAlbums:safe,updatedAt:Date.now()});
 currentProfile.photoAlbums=safe;
 await set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile));
}
function vatraAlbumManager(){
 const root=document.querySelector('.vatra-photos-page'),tabs=root?.querySelector('.vatra-photos-tabs'),grid=root?.querySelector('#vatraPhotosGrid');
 if(!root||!tabs||!grid||!currentUser)return;
 const albums=vatraGetAlbums(),selected=albums.find(a=>a.id===vatraSelectedAlbumId);
 const source=[...new Set([
  ...(Array.isArray(currentProfile.profilePhotos)?currentProfile.profilePhotos.slice().reverse():[]),
  ...Object.entries(posts||{}).filter(([,p])=>p?.authorUid===currentUser.uid&&p.visibility!=='private'&&p.visibility!=='friends')
    .sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0)).flatMap(([,p])=>postImages(p))
 ])].filter(url=>typeof url==='string'&&/^https:\/\//i.test(url));
 const panel=document.createElement('section');panel.className='vatra-album-management';
 panel.innerHTML='<div class="vatra-album-manager-head"><h3>Мої альбоми <small>'+albums.length+' / 12</small></h3>'+
  '<button type="button" class="vatra-album-create" data-vatra-album-create>＋ Створити альбом</button></div>'+
  '<div class="vatra-public-album-grid vatra-album-own-grid">'+albums.map(a=>
   '<button type="button" class="vatra-public-album-card'+(selected?.id===a.id?' is-active':'')+'" data-vatra-open-album="'+esc(a.id)+'">'+
   '<span class="vatra-public-album-cover">'+(a.photos.length?'<img loading="lazy" src="'+esc(a.photos[a.photos.length-1])+'" alt="Обкладинка альбому">':'▧')+'</span>'+
   '<b>'+esc(a.name)+'</b><small>'+a.photos.length+' фото · Публічний</small></button>').join('')+
  (albums.length?'':'<p class="muted">Створіть альбом, щоб згрупувати улюблені фотографії. Його зможуть переглядати інші користувачі.</p>')+'</div>'+
  (selected?'<div class="vatra-album-current"><h3>'+esc(selected.name)+'</h3><p>Фотографії цього альбому видно відвідувачам Вашого профілю.</p>'+
   '<div class="vatra-album-management-actions"><button type="button" data-vatra-album-rename>Перейменувати</button>'+
    '<button type="button" data-vatra-album-pick>Додати наявні фото</button>'+
    '<button type="button" data-vatra-album-upload>Завантажити нові</button>'+
    '<button type="button" class="is-danger" data-vatra-album-delete>Видалити альбом</button>'+
    '<button type="button" data-vatra-album-back>Усі фото</button>'+
    '<input id="vatraAlbumUploadInput" type="file" data-vatra-album-upload-id="'+esc(selected.id)+'" accept="image/*" multiple hidden></div>'+
   '<div class="vatra-album-chooser" data-vatra-album-chooser hidden><h3>Оберіть фото для альбому</h3>'+
    '<p>Можна додати власні завантажені фото та фотографії з Ваших дописів.</p>'+
    '<div class="vatra-album-chooser-grid">'+source.filter(url=>!selected.photos.includes(url)).map((url,i)=>
      '<button type="button" data-vatra-album-photo="'+i+'"><img loading="lazy" src="'+esc(url)+'" alt="Фото"><span>＋ Додати</span></button>').join('')+'</div></div></div>':'');
 tabs.after(panel);
 const original=grid.innerHTML;
 const reveal=()=>{
  if(!selected)return;
  const urls=selected.photos.slice().reverse(),data=esc(JSON.stringify(urls));
  grid.innerHTML=urls.map((url,i)=>'<div class="vatra-album-photo"><button type="button" class="vatra-photo-tile" data-open-profile-gallery="'+esc(currentUser.uid)+'" data-photo-urls="'+data+'" data-photo-index="'+i+'"><img src="'+esc(url)+'" loading="lazy" decoding="async" alt="Фото альбому '+(i+1)+'"></button>'+
   '<button type="button" class="vatra-album-unlink" data-vatra-album-unlink="'+i+'">Прибрати з альбому</button></div>').join('')||'<p class="vatra-empty-panel">Цей альбом поки порожній. Додайте фото.</p>';
 };
 if(selected)reveal();
 const commit=async(next,message)=>{
  try{await vatraSaveAlbums(albums.map(a=>a.id===selected.id?next:a));renderPhotos();toastMsg(message);}
  catch(error){toastMsg(niceError(error));}
 };
 panel.addEventListener('click',async e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-vatra-album-create')){
   if(albums.length>=12)return toastMsg('Можна створити до 12 альбомів.');
   const title=await askText('Назва нового альбому','Новий альбом');
   if(title===null)return;
   const name=title.trim().slice(0,60);if(!name)return toastMsg('Введіть назву альбому.');
   const id='album_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
   try{await vatraSaveAlbums([...albums,{id,name,photos:[],createdAt:Date.now()}]);vatraSelectedAlbumId=id;renderPhotos();toastMsg('Альбом створено.');}catch(err){toastMsg(niceError(err));}
   return;
  }
  if(button.dataset.vatraOpenAlbum){vatraSelectedAlbumId=button.dataset.vatraOpenAlbum;renderPhotos();return;}
  if(!selected)return;
  if(button.hasAttribute('data-vatra-album-back')){vatraSelectedAlbumId='';renderPhotos();return;}
  if(button.hasAttribute('data-vatra-album-pick')){const choose=panel.querySelector('[data-vatra-album-chooser]');choose.hidden=!choose.hidden;return;}
  if(button.hasAttribute('data-vatra-album-upload')){panel.querySelector('#vatraAlbumUploadInput')?.click();return;}
  if(button.hasAttribute('data-vatra-album-rename')){
   const title=await askText('Назва альбому',selected.name);
   if(title!==null&&title.trim())await commit({...selected,name:title.trim().slice(0,60)},'Альбом перейменовано.');
   return;
  }
  if(button.hasAttribute('data-vatra-album-delete')){
   if(!(await askConfirm('Видалити альбом «'+selected.name+'»? Самі фотографії залишаться в профілі або дописах.')))return;
   try{await vatraSaveAlbums(albums.filter(a=>a.id!==selected.id));vatraSelectedAlbumId='';renderPhotos();toastMsg('Альбом видалено.');}catch(err){toastMsg(niceError(err));}
   return;
  }
  if(button.hasAttribute('data-vatra-album-photo')){
   const choices=source.filter(url=>!selected.photos.includes(url)),url=choices[Number(button.dataset.vatraAlbumPhoto)];
   if(!url)return;
   if(selected.photos.length>=40)return toastMsg('До альбому можна додати до 40 фото.');
   await commit({...selected,photos:[...selected.photos,url]},'Фото додано до альбому.');return;
  }
 });
 grid.addEventListener('click',async e=>{
  const b=e.target.closest('[data-vatra-album-unlink]');if(!b||!selected)return;
  const url=selected.photos.slice().reverse()[Number(b.dataset.vatraAlbumUnlink)];
  if(url)await commit({...selected,photos:selected.photos.filter(x=>x!==url)},'Фото прибрано з альбому.');
 });
 const upload=panel.querySelector('#vatraAlbumUploadInput');
 if(upload)upload.addEventListener('change',uploadProfilePhoto);
 tabs.addEventListener('click',()=>{vatraSelectedAlbumId='';});
}

function renderPhotos(){
 if(!currentUser){setFeed('<article class="post"><h2>Мої фотографії</h2><p>Увійдіть, щоб переглядати власні фотографії.</p><button class="primary" id="photosLogin">Увійти</button></article>');$('#photosLogin')?.addEventListener('click',()=>openAuth('login'));return;}
 const uid=currentUser.uid;
 const album=(Array.isArray(currentProfile.profilePhotos)?currentProfile.profilePhotos:[]).filter(url=>typeof url==='string'&&/^https?:\/\//i.test(url)).map((url,index)=>({url,index,date:Number(currentProfile.photoUploadedAt?.[url])||index+1})).sort((a,b)=>b.date-a.date);
 const published=Object.entries(posts||{}).filter(([,p])=>p&&p.authorUid===uid).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0)).flatMap(([id,p])=>postImages(p).map(url=>({url,id,date:p.createdAt||0})));
 const all=[...album.map(x=>({url:x.url,date:x.date})),...published.map(x=>({url:x.url,date:x.date}))].sort((a,b)=>b.date-a.date).map(x=>x.url);
 const unique=[...new Set(all)];
 const tile=(url,meta,index)=>'<button type="button" class="vatra-photo-tile" data-open-profile-gallery="'+esc(uid)+'" data-photo-urls="'+esc(JSON.stringify(unique))+'" data-photo-index="'+unique.indexOf(url)+'" aria-label="Переглянути фотографію '+(index+1)+'"><img src="'+esc(url)+'" loading="lazy" decoding="async" alt="Фото '+(index+1)+'"></button>';
 setFeed('<section class="vatra-photos-page"><div class="vatra-photos-toolbar"><div><h2>Мої фотографії</h2><p>'+unique.length+' фото · Ваш альбом і фотографії з дописів</p></div><div class="vatra-photos-tools"><button type="button" class="primary" id="vatraPhotosUpload">＋ Додати фото</button><input type="file" id="vatraPhotosFile" accept="image/*" multiple hidden></div></div><div class="vatra-photos-tabs" role="tablist" aria-label="Альбоми"><button type="button" role="tab" aria-selected="true" class="active" data-vatra-photo-tab="all">Усі фото ('+unique.length+')</button><button type="button" role="tab" aria-selected="false" data-vatra-photo-tab="album">Альбом ('+album.length+')</button><button type="button" role="tab" aria-selected="false" data-vatra-photo-tab="posts">З дописів ('+published.length+')</button></div><div class="vatra-photo-grid" id="vatraPhotosGrid">'+(unique.map((url,i)=>tile(url,null,i)).join('')||'<p class="vatra-empty-panel">Ви ще не додавали фотографій. Завантажте перше фото.</p>')+'</div></section>');
 const grid=$('#vatraPhotosGrid');
 $$('.vatra-photos-tabs [data-vatra-photo-tab]').forEach(button=>button.onclick=()=>{
  $$('.vatra-photos-tabs [data-vatra-photo-tab]').forEach(el=>{el.classList.toggle('active',el===button);el.setAttribute('aria-selected',String(el===button));});
  const kind=button.dataset.vatraPhotoTab;
  const urls=[...new Set(kind==='album'?album.map(x=>x.url):kind==='posts'?published.map(x=>x.url):unique)];
  grid.innerHTML=urls.map((url,i)=>tile(url,null,i)).join('')||'<p class="vatra-empty-panel">У цьому розділі фотографій поки немає.</p>';
 });
 $('#vatraPhotosUpload').onclick=()=>$('#vatraPhotosFile')?.click();
 $('#vatraPhotosFile').addEventListener('change',uploadProfilePhoto);
 vatraAlbumManager();
}

function renderMyVideos(){
 if(!currentUser){
  setFeed('<section class="vatra-my-videos"><div class="vatra-my-videos-header"><h2>Мої відео</h2><p>Увійдіть, щоб побачити власні відеозаписи.</p><button type="button" class="primary" id="myVideosSignIn">Увійти</button></div></section>');
  $('#myVideosSignIn')?.addEventListener('click',()=>openAuth('login'));return;
 }
 const uid=currentUser.uid,unique=new Set();
 const uploaded=Object.entries(videos||{}).filter(([,v])=>v?.authorUid===uid&&v.videoUrl).map(([id,v])=>({id,url:v.videoUrl,createdAt:v.createdAt||0,text:v.text||'',origin:'shorts'}));
 const published=Object.entries(posts||{}).filter(([,p])=>p?.authorUid===uid&&p.videoUrl).map(([id,p])=>({id,url:p.videoUrl,createdAt:p.createdAt||0,text:p.text||'',origin:'post'}));
 const items=uploaded.concat(published).filter(v=>{if(typeof v.url!=='string'||!/^https?:\/\//i.test(v.url)||unique.has(v.url))return false;unique.add(v.url);return true;}).sort((a,b)=>b.createdAt-a.createdAt);
 const videosHtml=items.map(v=>'<article class="vatra-my-video"><div class="vatra-my-video-info"><b>'+(v.origin==='shorts'?'ВАТРА Shorts':'Відео з допису')+'</b><small>'+timeAgo(v.createdAt)+'</small></div><video controls playsinline preload="metadata" src="'+esc(v.url)+'"></video>'+(v.text?'<p>'+safeText(v.text)+'</p>':'')+(v.origin==='shorts'?'<button type="button" class="danger-link" data-delete-video="'+esc(v.id)+'">Видалити відео</button>':'')+'</article>').join('');
 setFeed('<section class="vatra-my-videos"><div class="vatra-my-videos-header"><div><h2>Мої відео <span>'+items.length+'</span></h2><p>Ваші відео з ВАТРА Shorts і власних дописів.</p></div><div class="vatra-my-videos-tools"><button type="button" class="primary" id="myVideosUpload">＋ Завантажити</button><button type="button" class="pill" id="myVideosShorts">ВАТРА Shorts</button><input id="myVideosFile" type="file" accept="video/*" hidden></div></div><div class="vatra-my-videos-grid">'+(videosHtml||'<p class="vatra-my-video-empty">Ви ще не додали відео.</p>')+'</div></section>',false);
 $('#myVideosUpload')?.addEventListener('click',()=>$('#myVideosFile')?.click());
 $('#myVideosFile')?.addEventListener('change',uploadVideo);
 $('#myVideosShorts')?.addEventListener('click',()=>goPage('videos'));
}
function renderVideos(){const arr=Object.entries(videos).map(([id,v])=>({...v,id})).filter(v=>!blockedUsers[v.authorUid]).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));setFeed(`<article class="post"><h3>ВАТРА Shorts</h3><p class="muted">Діліться короткими відео до 4 МБ. Відео зберігаються у файловому сховищі.</p>${currentUser?'<button class="primary" id="uploadVideoBtn">＋ Завантажити відео</button><input id="videoUpload" type="file" accept="video/*" hidden>':'<button class="primary" id="videoLogin">Увійти, щоб завантажити</button>'}</article>${arr.map(v=>`<article class="post">${avatar(v.authorName||'Користувач',v.authorAvatar)}<div class="author"><b>${esc(v.authorName||'Користувач')}</b><small>@${esc(v.authorHandle||'user')} · ${timeAgo(v.createdAt)}</small></div>${v.text?`<p class="post-text">${safeText(v.text)}</p>`:''}<video class="post-image" controls playsinline preload="metadata" src="${esc(v.videoUrl)}"></video>${v.authorUid===currentUser?.uid?`<button class="danger-link" data-delete-video="${esc(v.id)}">Видалити відео</button>`:currentUser?`<button class="pill" data-report-video="${esc(v.id)}">Поскаржитися</button><button class="danger-link" data-block-user="${esc(v.authorUid)}">Заблокувати автора</button>`:''}</article>`).join('')}`,!arr.length);if(!arr.length)$('#empty').innerHTML='<h3>Ще немає відео</h3><p>Опублікуйте перше коротке відео.</p>';$('#videoLogin')?.addEventListener('click',()=>openAuth('login'));$('#uploadVideoBtn')?.addEventListener('click',()=>$('#videoUpload').click());$('#videoUpload')?.addEventListener('change',uploadVideo);}
function renderGroups(){
 const arr=Object.entries(groups||{}).filter(([id,g])=>g&&g.name&&(g.visibility!=='private'||g.ownerUid===currentUser?.uid||!!groupMembers[id]?.[currentUser?.uid])).map(([id,g])=>({...g,id})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 const joined=id=>!!groupMembers[id]?.[currentUser?.uid]||groups[id]?.ownerUid===currentUser?.uid;
 const item=g=>{
  const n=Object.values(groupMembers[g.id]||{}).filter(Boolean).length;
  const isMine=joined(g.id);
  return '<article class="vatra-community-row" data-community-item data-community-own="'+String(isMine)+'" data-community-search="'+esc((g.name+' '+(g.category||'')).toLocaleLowerCase('uk-UA'))+'"><button type="button" class="vatra-community-avatar" data-open-group="'+esc(g.id)+'" aria-label="Відкрити '+esc(g.name)+'">'+esc(g.name.trim().slice(0,1).toLocaleUpperCase('uk-UA'))+'</button><div class="vatra-community-text"><button type="button" data-open-group="'+esc(g.id)+'" class="vatra-community-name">'+esc(g.name)+'</button><small>'+esc(g.category||'Спільнота ВАТРИ')+' · '+n+' учасн.</small><p>'+esc((g.description||'').slice(0,120))+'</p></div><button type="button" class="vatra-community-open" data-open-group="'+esc(g.id)+'">Відкрити</button></article>';
 };
 const ranking=arr.slice().sort((a,b)=>Object.values(groupMembers[b.id]||{}).filter(Boolean).length-Object.values(groupMembers[a.id]||{}).filter(Boolean).length).slice(0,5);
 setFeed('<section class="vatra-communities-layout"><div class="vatra-communities-main"><label class="vatra-community-search"><span aria-hidden="true">⌕</span><input id="vatraCommunitySearch" type="search" placeholder="Пошук спільнот" aria-label="Пошук спільнот"></label><div class="vatra-community-list-card"><div class="vatra-community-section-head"><h2>Спільноти</h2><span>'+arr.length+'</span></div><div class="vatra-community-tabs" role="group" aria-label="Фільтр спільнот"><button type="button" class="active" data-community-tab="all">Усі спільноти</button><button type="button" data-community-tab="mine">Мої спільноти</button></div><div class="vatra-community-rows" id="vatraCommunityRows">'+arr.map(item).join('')+'</div><p id="vatraCommunityEmpty" class="vatra-empty-panel" '+(arr.length?'hidden':'')+'>Спільнот поки немає. Ви можете створити першу.</p></div></div><aside class="vatra-communities-rail"><div class="vatra-side-card"><button type="button" class="primary wide" id="createGroup">＋ Створити спільноту</button><p>Збирайте людей навколо спільних інтересів.</p></div><div class="vatra-side-card"><h3>Активні спільноти</h3>'+(ranking.map(g=>'<button type="button" class="vatra-popular-row" data-open-group="'+esc(g.id)+'"><span>'+esc(g.name.trim().slice(0,1).toLocaleUpperCase('uk-UA'))+'</span><b>'+esc(g.name)+'</b><small>'+Object.values(groupMembers[g.id]||{}).filter(Boolean).length+'</small></button>').join('')||'<p>Тут будуть спільноти з найбільшою кількістю учасників.</p>')+'</div></aside></section>',false);
 $('#createGroup')?.addEventListener('click',createGroup);
 const search=$('#vatraCommunitySearch'),rows=$$('#vatraCommunityRows [data-community-item]');
 let tab='all';
 const apply=()=>{
  const q=String(search?.value||'').trim().toLocaleLowerCase('uk-UA');
  let visible=0;
  rows.forEach(node=>{const ok=(tab!=='mine'||node.dataset.communityOwn==='true')&&(!q||node.dataset.communitySearch.includes(q));node.hidden=!ok;if(ok)visible++;});
  $('#vatraCommunityEmpty').hidden=visible>0;
  if(!visible)$('#vatraCommunityEmpty').textContent=q?'За Вашим запитом спільнот не знайдено.':tab==='mine'?'Ви ще не долучилися до спільнот.':'Спільнот поки немає.';
 };
 search?.addEventListener('input',apply);
 $$('.vatra-community-tabs [data-community-tab]').forEach(button=>button.onclick=()=>{
  tab=button.dataset.communityTab;
  $$('.vatra-community-tabs [data-community-tab]').forEach(b=>b.classList.toggle('active',b===button));
  apply();
 });
}
function renderGroupDetails(id){
 if(groupDetailsUnsub){groupDetailsUnsub();groupDetailsUnsub=null;}
 const g=groups[id];if(!g){goPage('groups');return;}
 groupId=id;
 const member=!!groupMembers[id]?.[currentUser?.uid],isOwner=g.ownerUid===currentUser?.uid,isAdmin=!!groupAdmins[id]?.[currentUser?.uid],canManage=isOwner||isAdmin||!!groupModerators[id]?.[currentUser?.uid];
 groupDetailsUnsub=watch(`groupPosts/${id}`,v=>{
  if(page!=='groups'||groupId!==id)return;
  const arr=Object.entries(v).map(([pid,p])=>({...p,id:pid})).filter(p=>!blockedUsers[p.authorUid]).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const members=Object.entries(groupMembers[id]||{}),adminIds=groupAdmins[id]||{},modIds=groupModerators[id]||{},owner=users[g.ownerUid]||{},adminNames=Object.keys(adminIds).map(uid=>({uid,name:users[uid]?.name||'Учасник ВАТРИ'})),modNames=Object.keys(modIds).map(uid=>({uid,name:users[uid]?.name||'Учасник ВАТРИ'}));
  setFeed(`<article class="post community-hero"><button class="text-link" id="backGroups">← Усі спільноти</button><div class="community-cover large"><span class="community-mark">◎</span><span class="community-members">${members.length} учасник${members.length===1?'':members.length<5?'и':'ів'}</span></div><div class="community-detail-title"><div><p class="eyebrow">СПІЛЬНОТА</p><h2>${esc(g.name)}</h2><p>${esc(g.description||'Спільнота ВАТРИ')}</p></div>${member?'<span class="role-badge member-badge">Учасник</span>':''}</div><div class="community-stats"><div><b>${members.length}</b><span>Учасників</span></div><div><b>${Object.keys(adminIds).length}</b><span>Адміністраторів</span></div><div><b>${arr.length}</b><span>Дописи</span></div></div><div class="community-actions"><button class="pill" data-join-group="${esc(id)}">${member?'Вийти зі спільноти':'＋ Приєднатися'}</button>${isOwner?'<span class="role-badge owner-badge">Творець</span>':''}${isAdmin&&!isOwner?'<span class="role-badge admin-badge">Адміністратор</span>':''}</div><div class="community-team"><span>Творець: <button data-view-profile="${esc(g.ownerUid)}">${esc(owner.name||'Учасник ВАТРИ')}</button></span><span>Адміністратори: ${adminNames.length?adminNames.map(a=>`<button data-view-profile="${esc(a.uid)}">${esc(a.name)}</button>`).join(' · '):'ще не призначені'}</span><span>Модератори: ${modNames.length?modNames.map(a=>`<button data-view-profile="${esc(a.uid)}">${esc(a.name)}</button>`).join(' · '):'ще не призначені'}</span></div><section class="community-member-preview"><h3>Учасники спільноти</h3><div class="community-member-list">${members.filter(([uid])=>uid!==g.ownerUid).map(([uid])=>{const u=users[uid]||{};return `<button class="community-member-chip" data-view-profile="${esc(uid)}">${avatar(u.name||'Учасник',u.avatarUrl)}<span>${esc(u.name||'Учасник ВАТРИ')}</span></button>`;}).join('')||'<p class="muted">Поки немає учасників.</p>'}</div></section>${canManage?`<button class="primary" data-manage-group="${esc(id)}">Керувати спільнотою</button>`:''}</article><aside class="vatra-community-detail-aside"><div class="vatra-side-card"><h3>Про спільноту</h3><p>${esc(g.description||'Спільнота ВАТРИ')}</p>${g.category?'<p><b>Тема:</b> '+esc(g.category)+'</p>':''}<p><b>Учасники:</b> ${members.length}</p><p><b>Створено:</b> ${timeAgo(g.createdAt)}</p></div><div class="vatra-side-card"><h3>Команда</h3><button type="button" data-view-profile="${esc(g.ownerUid)}">${esc(owner.name||'Творець спільноти')}</button><p>Адміністраторів: ${Object.keys(adminIds).length}</p></div></aside>${member?'<article class="post group-compose"><form id="groupPostForm"><textarea name="text" maxlength="20000" placeholder="Написати у спільноту…" required></textarea><button class="primary">Опублікувати</button></form></article>':'<article class="post"><p class="muted">Приєднайтеся до спільноти, щоб публікувати дописи й долучатися до обговорення.</p></article>'}${arr.map(p=>`<article class="post"><div class="post-head">${avatar(p.authorName,users[p.authorUid]?.avatarUrl)}<div class="author"><b>${esc(p.authorName)}</b><small>${timeAgo(p.createdAt)}</small></div>${(p.authorUid===currentUser?.uid||canManage)?`<button class="dots" data-delete-group-post="${esc(id)}" data-post-id="${esc(p.id)}" aria-label="Видалити допис">•••</button>`:''}</div>${currentUser&&p.authorUid!==currentUser.uid?`<div class="post-actions"><button class="pill" data-report-group-post="${esc(id)}" data-post-id="${esc(p.id)}">Поскаржитися</button><button class="danger-link" data-block-user="${esc(p.authorUid)}">Заблокувати автора</button></div>`:''}${renderCollapsiblePostText(p.text)}${p.imageUrl?`<img class="post-image" src="${esc(p.imageUrl)}" alt="">`:''}</article>`).join('')}`,!arr.length);
  if(!arr.length)$('#empty').innerHTML='<h3>Перший допис ще попереду</h3><p>Напишіть перший допис або запроси учасників у спільноту.</p>';
  $('#backGroups').onclick=()=>goPage('groups');
  $('#groupPostForm')?.addEventListener('submit',async e=>{e.preventDefault();const text=new FormData(e.currentTarget).get('text').trim();if(!text)return;if(text.length>MAX_POST_TEXT)return toastMsg('Максимальна довжина допису — 20 000 символів.');try{await set(push(ref(db,`groupPosts/${id}`)),{authorUid:currentUser.uid,authorName:currentProfile.name||currentUser.displayName||'Користувач',text,createdAt:Date.now()});e.currentTarget.reset();toastMsg('Дописи спільноти оновлено.');}catch(err){toastMsg(niceError(err));}});
  $$('[data-group-settings]').forEach(form=>form.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),name=String(fd.get('name')||'').trim(),description=String(fd.get('description')||'').trim();if(name.length<2)return toastMsg('Назва має містити щонайменше 2 символи.');try{await update(ref(db,`groups/${id}`),{name:name.slice(0,60),description:description.slice(0,500),updatedAt:Date.now()});toastMsg('Спільноту оновлено.');}catch(err){toastMsg(niceError(err));}}));
 });
}
function openGroupSettings(id){if(!authRequired())return;const g=groups[id];if(!g)return;const canManage=g.ownerUid===currentUser.uid||!!groupAdmins[id]?.[currentUser.uid]||!!groupModerators[id]?.[currentUser.uid];if(!canManage)return toastMsg('У Вас немає прав керувати цією спільнотою.');if(groupDetailsUnsub){groupDetailsUnsub();groupDetailsUnsub=null;}groupId=id;page='groupSettings';document.body.dataset.page=page;$('#title').textContent='Керування спільнотою';$('#subtitle').textContent=g.name||'';$('.heading .eyebrow').textContent='СПІЛЬНОТА';$$('button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page==='groups'));const composer=$('.quick-compose');if(composer)composer.hidden=true;const sort=$('#sort');if(sort)sort.hidden=true;renderGroupSettings(id);}
function renderGroupSettings(id){
 const g=groups[id];if(!g){page='groups';groupId=null;return renderGroups();}
 const isOwner=g.ownerUid===currentUser?.uid,isAdmin=!!groupAdmins[id]?.[currentUser?.uid],isMod=!!groupModerators[id]?.[currentUser?.uid],canEditSettings=isOwner||isAdmin,canManageRoles=isOwner||isAdmin;
 if(!isOwner&&!isAdmin&&!isMod){page='groups';groupId=null;return renderGroupDetails(id);}
 const members=Object.entries(groupMembers[id]||{}).filter(([uid,val])=>val&&uid&&uid!==g.ownerUid),admins=groupAdmins[id]||{},mods=groupModerators[id]||{},owner=users[g.ownerUid]||{};
 setFeed(`<section class="settings-page community-settings-page"><div class="settings-intro"><div><p class="eyebrow">КЕРУВАННЯ</p><h2>${esc(g.name)}</h2><p>Ця сторінка доступна творцю та команді спільноти. Тут можна змінити дані й керувати ролями.</p></div><button class="pill" id="groupSettingsBack">← До спільноти</button></div><form id="groupSettingsForm" class="settings-form"><section class="settings-card"><h3>Основна інформація</h3><div class="settings-grid"><label>Назва спільноти<input name="name" maxlength="60" required value="${esc(g.name||'')}" ${canEditSettings?'':'disabled'}></label><label>Напрям діяльності<input name="category" maxlength="80" value="${esc(g.category||'')}" placeholder="Наприклад, спорт, освіта, хобі" ${canEditSettings?'':'disabled'}></label><label class="span-two">Опис<textarea name="description" maxlength="500" rows="4" ${canEditSettings?'':'disabled'}>${esc(g.description||'')}</textarea></label><label>Тип спільноти<select name="visibility" ${canEditSettings?'':'disabled'}><option value="public" ${g.visibility!=='private'?'selected':''}>Відкрита</option><option value="private" ${g.visibility==='private'?'selected':''}>Закрита</option></select></label></div>${canEditSettings?'<div class="settings-savebar"><span>Зміни збережуться для всіх учасників.</span><button class="primary" type="submit">Зберегти зміни</button></div>':''}<p id="groupSettingsStatus" class="auth-error" role="status"></p></section></form><section class="settings-card"><h3>Команда спільноти</h3><p class="muted">Творець має повний доступ. Адміністратори та модератори можуть допомагати з управлінням і дописами.</p><div class="community-role-row"><span class="role-badge owner-badge">Творець</span><button class="community-member-chip" data-view-profile="${esc(g.ownerUid)}">${avatar(owner.name||'Творець',owner.avatarUrl)}<span>${esc(owner.name||'Творець спільноти')}</span></button></div><div class="community-member-list">${members.map(([uid])=>{const u=users[uid]||{},isMemberOwner=uid===g.ownerUid,isMemberAdmin=!!admins[uid],isMemberMod=!!mods[uid];return `<div class="community-member-row">${avatar(u.name||'Учасник',u.avatarUrl)}<div class="author"><b>${esc(u.name||'Учасник')}</b><small>@${esc(u.handle||'user')}</small></div>${isMemberOwner?'<span class="role-badge owner-badge">Творець</span>':isMemberAdmin?'<span class="role-badge admin-badge">Адміністратор</span>':isMemberMod?'<span class="role-badge moderator-badge">Модератор</span>':''}${canManageRoles&&!isMemberOwner?`<button class="pill" data-toggle-group-admin="${esc(id)}" data-member-uid="${esc(uid)}">${isMemberAdmin?'Зняти адміністратора':'Призначити адміністратором'}</button><button class="pill" data-toggle-group-moderator="${esc(id)}" data-member-uid="${esc(uid)}">${isMemberMod?'Зняти модератора':'Призначити модератором'}</button><button class="danger-link" data-remove-group-member="${esc(id)}" data-member-uid="${esc(uid)}">Видалити</button>`:''}</div>`;}).join('')||'<p class="muted">Учасників ще немає.</p>'}</div>${isOwner?`<div class="settings-savebar"><button type="button" class="danger-link" data-delete-group="${esc(id)}">Видалити спільноту</button></div>`:''}</section></section>`);
 $('#groupSettingsBack').onclick=()=>renderGroupDetails(id);
 $('#groupSettingsForm')?.addEventListener('submit',async e=>{e.preventDefault();if(!canEditSettings)return;const fd=new FormData(e.currentTarget),name=String(fd.get('name')||'').trim(),description=String(fd.get('description')||'').trim(),category=String(fd.get('category')||'').trim(),visibility=String(fd.get('visibility')||'public');if(name.length<2){$('#groupSettingsStatus').textContent='Назва має містити щонайменше 2 символи.';return;}const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Зберігаємо…';try{await update(ref(db,`groups/${id}`),{name:name.slice(0,60),description:description.slice(0,500),category:category.slice(0,80),visibility,updatedAt:Date.now()});$('#groupSettingsStatus').textContent='Зміни збережено.';toastMsg('Спільноту оновлено.');}catch(err){$('#groupSettingsStatus').textContent=niceError(err);}finally{btn.disabled=false;btn.textContent='Зберегти зміни';}});
}
function chatKey(uid1,uid2){return [uid1,uid2].sort().join('_');}
function rebuildVisibleChatIndex(){
 const combined={...chatOwnedIndex,...chatLiveIndex};
 for(const [key,item] of Object.entries(combined)){
  const hiddenAt=Number(chatOwnedIndex[key]?.hiddenAt)||0;
  const lastActivity=Number(chatLiveIndex[key]?.updatedAt)||0;
  if(hiddenAt&&lastActivity<=hiddenAt)delete combined[key];
 }
 chatIndex=combined;
}

let activeSecureSession=null,secureChatAttempt=0,chatRenderToken=0,secureAutoRetries=0,secureRetryTimer=null;
const SECURE_PREVIEW='Повідомлення';
async function readE2EEKey(uid){const snap=await get(ref(db,'e2eeKeys/'+uid));return snap.val();}
async function publishE2EEKey(uid,record){return set(ref(db,'e2eeKeys/'+uid),record);}
function updateChatSecurityStatus(text,ready=false){
 const status=$('#chatSecurityStatus'),form=$('#sendMessageForm'),input=form?.elements?.message,button=form?.querySelector('button.primary');
 if(status){status.textContent=text;status.dataset.ready=ready?'true':'false';}
 if(input){input.disabled=!ready;input.placeholder=ready?'Захищене повідомлення…':'Очікуємо захищене з’єднання…';}
 if(button)button.disabled=!ready;
 const retry=$('#chatSecurityRefresh');
 if(retry)retry.hidden=ready||!text.startsWith('⚠️');
}
async function activateSecureChat(key,peerUid){
 const attempt=++secureChatAttempt;activeSecureSession=null;
 updateChatSecurityStatus('🔐 Перевіряємо захищені ключі…',false);
 try{
  const secure=await prepareSession(currentUser.uid,peerUid,key,readE2EEKey,publishE2EEKey);
  if(attempt!==secureChatAttempt||activeChat!==peerUid||page!=='messages'||!$('#chatMessages'))return;
  activeSecureSession=secure;
  if(secureRetryTimer){clearTimeout(secureRetryTimer);secureRetryTimer=null;}
  secureAutoRetries=0;
  updateChatSecurityStatus('🔒 Захищений чат',true);
 }catch(err){
  if(attempt!==secureChatAttempt||activeChat!==peerUid)return;
  console.warn('[ВАТРА] Захищене з’єднання недоступне:',err);
  const details=err?.code==='PEER_NOT_READY'?'Співрозмовнику потрібно один раз відкрити повідомлення у ВАТРІ.':err?.code==='MISSING_DEVICE_KEY'||err?.code==='OWN_KEY_MISMATCH'?'Цей пристрій не має доступу до попередньої захищеної розмови. Відкрийте її у браузері, де листування вже працювало.':'Перевірте з’єднання або налаштування браузера.';
  updateChatSecurityStatus('⚠️ Повідомлення поки недоступні. '+details,false);
  if(err?.code==='PEER_NOT_READY'&&secureAutoRetries<3){
   secureAutoRetries++;
   if(secureRetryTimer)clearTimeout(secureRetryTimer);
   secureRetryTimer=setTimeout(()=>{
    secureRetryTimer=null;
    if(page==='messages'&&currentUser&&activeChat===peerUid&&!activeSecureSession)activateSecureChat(key,peerUid);
   },15000);
  }
 }
 await renderChatBubbles(key);
}
async function syncChatPreview(key,otherUid){
 const snap=await get(ref(db,'chats/'+key+'/messages')),items=Object.entries(snap.val()||{}).map(([id,m])=>({...m,id})).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)),last=items[items.length-1],updatedAt=last?.createdAt||Date.now();
 const lastMessage=last?{text:last.encrypted?SECURE_PREVIEW:String(last.text||'').slice(0,120),senderUid:last.senderUid,createdAt:last.createdAt}:null;
 await update(ref(db,'userChats/'+currentUser.uid+'/'+key),{otherUid,updatedAt,lastMessage});
}

let vatraChatUnreadOnly=false;
function vatraMessengerSidebar(chats){
 const people=Object.keys(friends||{}).filter(uid=>uid!==currentUser?.uid&&!blockedUsers[uid]&&users[uid]&&users[uid].allowMessages!==false);
 const unreadCount=chats.filter(([id,c])=>c.lastMessage?.senderUid!==currentUser?.uid&&Number(c.lastMessage?.createdAt||0)>Number(chatReads[id]||0)).length;
 const rows=chats.map(([id,c])=>{
  const other=users[c.otherUid]||{},name=other.name||'Користувач ВАТРИ',active=c.otherUid===activeChat;
  const unread=c.lastMessage?.senderUid!==currentUser?.uid&&Number(c.lastMessage?.createdAt||0)>Number(chatReads[id]||0);
  const preview=(c.lastMessage?.senderUid===currentUser?.uid?'Ви: ':'')+String(c.lastMessage?.text||'Почніть розмову');
  return '<div class="vatra-messenger-contact" data-messenger-row data-unread="'+unread+'" data-messenger-name="'+esc(name.toLocaleLowerCase('uk-UA'))+'"><button class="vatra-messenger-contact-main '+(active?'active':'')+'" type="button" data-open-chat="'+esc(c.otherUid)+'">'+avatar(name,other.avatarUrl)+'<span class="vatra-messenger-contact-copy"><b>'+esc(name)+'</b><small>'+esc(preview)+'</small></span><span class="vatra-messenger-contact-side"><time>'+timeAgo(c.updatedAt)+'</time>'+(unread?'<i class="vatra-messenger-unread-dot" aria-label="Непрочитане"></i>':'')+'</span></button><button class="vatra-messenger-delete" type="button" data-delete-chat="'+esc(id)+'" aria-label="Прибрати діалог із '+esc(name)+'">×</button></div>';
 }).join('');
 return '<aside class="vatra-messenger-sidebar" aria-label="Список діалогів"><header class="vatra-messenger-heading"><h2>Месенджер</h2><button id="vatraNewChatToggle" class="vatra-messenger-new-trigger" type="button" aria-expanded="false" aria-controls="vatraMessengerNew" title="Нова розмова" aria-label="Нова розмова"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-7.5"/><path d="m13 11 7-7 2 2-7 7-4 1 2-3Z"/></svg></button></header>'+
 '<label class="vatra-messenger-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4 4"/></svg><input id="vatraChatSearch" type="search" placeholder="Пошук" aria-label="Пошук діалогів"></label>'+
 '<div class="vatra-messenger-selector"><button type="button" id="vatraChatsAll" class="vatra-messenger-filter '+(!vatraChatUnreadOnly?'active':'')+'" aria-pressed="'+(!vatraChatUnreadOnly)+'">Усі</button><button type="button" id="vatraChatsUnread" class="vatra-messenger-filter '+(vatraChatUnreadOnly?'active':'')+'" aria-pressed="'+vatraChatUnreadOnly+'">Непрочитані'+(unreadCount?' <span>'+unreadCount+'</span>':'')+'</button></div>'+
 '<div class="vatra-messenger-contacts" id="vatraMessengerContacts">'+(rows||'<p class="vatra-messenger-nodata">Поки немає діалогів. Почніть нову розмову.</p>')+'</div><p class="vatra-messenger-nodata" id="vatraChatNoResults" hidden>Нічого не знайдено.</p>'+
 '<div class="vatra-messenger-new" id="vatraMessengerNew" hidden><h3>Нова розмова</h3>'+(people.map(uid=>{const u=users[uid];return '<button type="button" data-message-user="'+esc(uid)+'">'+avatar(u.name||'Користувач',u.avatarUrl)+'<span>'+esc(u.name||'Користувач')+'</span></button>';}).join('')||'<p>Спочатку додайте друзів у ВАТРІ.</p>')+'</div>'+
 '<footer class="vatra-messenger-footer"><label for="vatraChatsUnreadFooter">Лише непрочитані</label><input type="checkbox" id="vatraChatsUnreadFooter" role="switch" '+(vatraChatUnreadOnly?'checked':'')+' aria-label="Лише непрочитані діалоги"></footer></aside>';
}
function vatraMessengerControls(){
 const toggle=$('#vatraNewChatToggle'),picker=$('#vatraMessengerNew'),search=$('#vatraChatSearch');
 const all=$('#vatraChatsAll'),unread=$('#vatraChatsUnread'),footer=$('#vatraChatsUnreadFooter'),list=$('#vatraMessengerContacts'),noResults=$('#vatraChatNoResults');
 const apply=()=>{
  const q=(search?.value||'').trim().toLocaleLowerCase('uk-UA');let count=0;
  list?.querySelectorAll('[data-messenger-row]').forEach(row=>{row.hidden=(vatraChatUnreadOnly&&row.dataset.unread!=='true')||!row.dataset.messengerName.includes(q);if(!row.hidden)count++;});
  if(noResults)noResults.hidden=count>0||!list?.querySelector('[data-messenger-row]');
  all?.classList.toggle('active',!vatraChatUnreadOnly);unread?.classList.toggle('active',vatraChatUnreadOnly);
  all?.setAttribute('aria-pressed',String(!vatraChatUnreadOnly));unread?.setAttribute('aria-pressed',String(vatraChatUnreadOnly));
  if(footer)footer.checked=vatraChatUnreadOnly;
 };
 const change=only=>{vatraChatUnreadOnly=only;apply();};
 all?.addEventListener('click',()=>change(false));unread?.addEventListener('click',()=>change(true));
 footer?.addEventListener('change',()=>change(footer.checked));search?.addEventListener('input',apply);
 if(toggle&&picker)toggle.addEventListener('click',()=>{picker.hidden=!picker.hidden;toggle.setAttribute('aria-expanded',String(!picker.hidden));if(!picker.hidden)picker.querySelector('button')?.focus();});
 picker?.addEventListener('keydown',e=>{if(e.key==='Escape'){picker.hidden=true;toggle?.setAttribute('aria-expanded','false');toggle?.focus();}});
 apply();
}
function renderMessages(){
 if(!currentUser){setFeed('<article class="post"><h3>Увійдіть, щоб користуватися месенджером</h3><button class="primary" id="chatLogin">Увійти</button></article>');$('#chatLogin').onclick=()=>openAuth('login');return;}
 const chats=Object.entries(chatIndex).filter(([,c])=>Boolean(c?.lastMessage?.text)&&!blockedUsers[c.otherUid]).sort((a,b)=>(b[1]?.updatedAt||0)-(a[1]?.updatedAt||0));
 if(!activeChat){
  setFeed('<section class="vatra-messenger"><div class="vatra-messenger-shell">'+vatraMessengerSidebar(chats)+'<section class="vatra-messenger-empty" aria-label="Оберіть діалог"><div class="vatra-messenger-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h16v11H8l-4 3V6Z"/><path d="M8 10h8M8 13h5"/></svg></div><h2>Ваш месенджер</h2><p>Виберіть діалог ліворуч або почніть нову розмову з другом.</p><small>Виберіть контакт, щоб почати листування.</small></section></div></section>');
  vatraMessengerControls();
  return;
 }
 const other=users[activeChat]||{},key=chatKey(currentUser.uid,activeChat),chatUnavailable=!!blockedUsers[activeChat]||activeChatBlocked;
 setFeed(`<section class="vatra-messenger"><div class="vatra-messenger-shell">${vatraMessengerSidebar(chats)}<article class="post chat-window"><header class="chat-top"><button type="button" class="vatra-chat-back" id="backChats" aria-label="До списку діалогів" title="До діалогів"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button><button type="button" class="vatra-chat-person" data-view-profile="${esc(activeChat)}" title="Відкрити профіль">${avatar(other.name||'Користувач',other.avatarUrl)}<span><b>${esc(other.name||'Користувач ВАТРИ')}</b><small>${other.handle?'@'+esc(other.handle):'Особистий чат'}</small></span></button><details class="vatra-chat-actions-menu"><summary aria-label="Дії з діалогом" title="Дії з діалогом"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></summary><div class="vatra-chat-header-actions">${blockedUsers[activeChat]?`<button type="button" data-unblock-user="${esc(activeChat)}">Розблокувати</button>`:`<button type="button" data-block-user="${esc(activeChat)}">Заблокувати</button>`}<button type="button" data-report-user="${esc(activeChat)}">Поскаржитися</button></div></details></header><p id="chatBlockNotice" class="empty-inline" ${chatUnavailable?'':'hidden'}>Надсилання недоступне: один із учасників заблокував іншого.</p><div id="chatMessages" class="chat-messages" aria-busy="true"><div class="vatra-sk-chat-loading" role="status" aria-label="Завантаження повідомлень"><span class="vatra-sk-accessible">Завантаження повідомлень…</span><i class="vatra-sk-bubble"></i><i class="vatra-sk-bubble mine"></i></div></div><form id="sendMessageForm" class="chat-send" ${chatUnavailable?'hidden':''}>${emojiControl()}<input name="message" data-emoji-input maxlength="2000" placeholder="Повідомлення" autocomplete="off" aria-label="Текст повідомлення" required><button class="primary vatra-chat-send-button" type="submit" aria-label="Надіслати повідомлення" title="Надіслати"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 16-8-4 16-4-6-8-2Z"/><path d="m12 14 8-10"/></svg></button></form><p id="chatSendError" class="vatra-chat-send-error" role="alert" hidden></p></article></div></section>`);
 vatraMessengerControls();
 $('#backChats').onclick=()=>{activeChat=null;editingMessageId=null;stopChatListener();renderMessages();};
 startChatListener(key);markChatRead(key);
  // Only for reading old ciphertext on a device with the original key.
  // New ordinary messages do not depend on peer key initialization.
  const legacyAttempt=++secureChatAttempt,legacyPeer=activeChat;
  prepareSession(currentUser.uid,legacyPeer,key,readE2EEKey,publishE2EEKey).then(session=>{
   if(legacyAttempt!==secureChatAttempt||activeChat!==legacyPeer||page!=='messages')return;
   activeSecureSession=session;void renderChatBubbles(key);
  }).catch(error=>console.debug('[ВАТРА] Попередні повідомлення не прочитати на цьому пристрої:',error?.code||'key'));
 $('#sendMessageForm').onsubmit=async e=>{
  e.preventDefault();
  if(activeChatBlocked||blockedUsers[activeChat])return toastMsg('Надсилання в цьому чаті зупинено.');
  const form=e.currentTarget,input=form.elements.message,text=input.value.trim(),recipient=activeChat,submit=form.querySelector('button.primary');
  if(!text||submit.disabled)return;
  const errorBox=$('#chatSendError');if(errorBox){errorBox.hidden=true;errorBox.textContent='';}
  submit.disabled=true;let written=false;
  try{
   const createdAt=Date.now();
   const root=ref(db,'chats/'+key),snapshot=await get(root);
   if(!snapshot.exists())await set(root,{members:{[currentUser.uid]:true,[recipient]:true},createdAt});
   const messageRef=push(ref(db,'chats/'+key+'/messages'));
   await set(messageRef,{senderUid:currentUser.uid,text,createdAt});
   written=true;if(input.value.trim()===text)input.value='';
   const lastMessage={text:text.slice(0,120),senderUid:currentUser.uid,createdAt};
   try{await update(ref(db,'userChats/'+currentUser.uid+'/'+key),{otherUid:recipient,updatedAt:createdAt,lastMessage});}
   catch(summaryError){console.warn('[ВАТРА] Індекс діалогів не оновився:',summaryError);toastMsg('Повідомлення надіслано, але список розмов оновиться пізніше.');}
  }catch(err){
   const code=String(err?.code||''),sqlFailure=code==='CHAT_SQL_REQUIRED'||code==='CHAT_SQL_CONSTRAINT'||err?.dbCode==='P0001';
   const message=sqlFailure
    ?code==='CHAT_SQL_REQUIRED'
      ?'Повідомлення не відправлено: у Supabase ще діє старе правило чату. Застосуйте файл chat-message-mode-update.sql у SQL Editor.'
      :'Повідомлення не відправлено: Supabase відхилив запис правилом SQL (P0001). Перевірте chat-message-mode-update.sql і журнал Supabase.'
    :'Повідомлення не відправлено: '+niceError(err);
   if(!written){if(errorBox){errorBox.textContent=message;errorBox.hidden=false;}else toastMsg(message);}
   console.error('[ВАТРА] Помилка надсилання повідомлення',err);
  }finally{submit.disabled=false;}
 };
}
let chatUnsub=null,chatBlockUnsub=null,groupDetailsUnsub=null,editingMessageId=null;
function stopChatListener(){
 secureChatAttempt++;chatRenderToken++;activeSecureSession=null;secureAutoRetries=0;
 if(secureRetryTimer){clearTimeout(secureRetryTimer);secureRetryTimer=null;}
 if(chatUnsub){chatUnsub();chatUnsub=null;}
 if(chatBlockUnsub){chatBlockUnsub();chatBlockUnsub=null;}
 activeChatBlocked=false;
}
async function renderChatBubbles(key){
 const el=$('#chatMessages'),uid=currentUser?.uid;
 if(!el||!uid||!activeChat||chatKey(uid,activeChat)!==key)return;
 const token=++chatRenderToken;
 const arr=Object.entries(chatMessages||{}).filter(([,m])=>m&&typeof m==='object').map(([id,m])=>({...m,id})).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
 const html=await Promise.all(arr.map(async m=>{
  const mine=m.senderUid===uid,encrypted=!!m.encrypted;
  let textValue='',canRead=true;
  if(encrypted){
   try{
    if(!activeSecureSession)throw new Error('Ключ ще не готовий.');
    textValue=await decryptMessage(activeSecureSession,m);
   }catch(error){canRead=false;textValue='Попереднє повідомлення недоступне на цьому пристрої.';}
  }else{textValue=String(m.text||'');}
  const editing=mine&&editingMessageId===m.id&&canRead;
  const stamp=timeAgo(m.createdAt)+(m.editedAt?' · змінено':'');
  const author=mine?currentProfile:(users[activeChat]||{});
  const authorName=author.name||(mine?'Ви':'Користувач ВАТРИ');
  return '<div class="vatra-chat-message-row '+(mine?'is-mine':'is-peer')+'"><span class="vatra-chat-message-avatar">'+avatar(authorName,author.avatarUrl||'')+'</span><div class="message-bubble '+(mine?'mine':'')+'"><div class="vatra-chat-message-meta"><b>'+esc(authorName)+'</b><time>'+esc(stamp)+'</time></div>'+
   (editing?'<form class="message-edit-form" data-edit-message-form="'+esc(m.id)+'"><input name="text" maxlength="2000" value="'+esc(textValue)+'" required><button class="pill">Зберегти</button><button type="button" class="text-link" data-cancel-edit>Скасувати</button></form>':
   '<p>'+(canRead?safeText(textValue):esc(textValue))+'</p>'+
   (mine?'<div class="message-actions">'+(canRead?'<button data-edit-message="'+esc(m.id)+'">Редагувати</button>':'')+'<button data-delete-message="'+esc(m.id)+'">Видалити</button></div>':''))+
   '</div></div>';
 }));
 if(token!==chatRenderToken||!$('#chatMessages')||chatKey(currentUser.uid,activeChat)!==key)return;
 el.removeAttribute('aria-busy');el.innerHTML=html.join('')||'<div class="vatra-chat-first-message"><b>Розмова починається тут</b><p>Напишіть перше повідомлення.</p></div>';
 el.scrollTop=el.scrollHeight;
}
function startChatListener(key){
 stopChatListener();
 chatMessages={};
 chatUnsub=watch('chats/'+key+'/messages',v=>{
  chatMessages=v||{};
  markChatRead(key);
  renderChatBubbles(key).catch(error=>{const el=$('#chatMessages');if(el)el.textContent='Помилка відображення повідомлень: '+(error?.message||'невідома помилка');});
 });
 chatBlockUnsub=watch('chatBlocks/'+key,v=>{
  activeChatBlocked=Object.keys(v||{}).length>0;
  const unavailable=activeChatBlocked||!!blockedUsers[activeChat],notice=$('#chatBlockNotice'),form=$('#sendMessageForm');
  if(notice)notice.hidden=!unavailable;if(form)form.hidden=unavailable;
 });
}

let vatraAudio=null,vatraAudioReady=false,vatraLastBeep=0;
let vatraSoundSources=new Set(),vatraSoundKnown=new Set(),vatraSoundPrimed=false,vatraSoundOpenedAt=0;
const vatraRequiredSoundSources=['postLikes','comments','friendRequests','userChats','chats'];
function vatraUnlockSound(){
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  if(!vatraAudio)vatraAudio=new C();
  if(vatraAudio.state==='running')vatraAudioReady=true;
  else vatraAudio.resume().then(()=>{vatraAudioReady=vatraAudio.state==='running';}).catch(()=>{});
 }catch(error){console.debug('[ВАТРА] Аудіо недоступне',error);}
}
window.addEventListener('pointerdown',vatraUnlockSound,{once:true,capture:true});
window.addEventListener('keydown',vatraUnlockSound,{once:true,capture:true});
function vatraBeep(type){
 if(!currentUser||currentProfile.notificationSounds===false||!vatraAudioReady||vatraAudio?.state!=='running'||Date.now()-vatraLastBeep<1100)return;
 vatraLastBeep=Date.now();
 try{const now=vatraAudio.currentTime+.01,notes=type==='message'?[[660,0,.11],[880,.13,.13]]:[[740,0,.1],[555,.13,.14]];
  for(const [frequency,offset,duration] of notes){
   const oscillator=vatraAudio.createOscillator(),gain=vatraAudio.createGain(),t=now+offset;
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,t);
   gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.05,t+.015);
   gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
   oscillator.connect(gain);gain.connect(vatraAudio.destination);oscillator.start(t);oscillator.stop(t+duration+.015);
  }
 }catch(err){console.warn('[ВАТРА] Не відтворено сигнал',err);}
}
function vatraSoundSourceLoaded(x){vatraSoundSources.add(x);}
function vatraMonitorSounds(items){
 if(!vatraRequiredSoundSources.every(x=>vatraSoundSources.has(x)))return;
 if(!vatraSoundPrimed){vatraSoundKnown=new Set(items.map(x=>x.id+':'+x.createdAt));vatraSoundPrimed=true;return;}
 let newMessage=false,newOther=false;
 for(const item of items){
  const key=item.id+':'+item.createdAt;
  if(vatraSoundKnown.has(key))continue;vatraSoundKnown.add(key);
  if(!item.unread||item.createdAt<vatraSoundOpenedAt||Date.now()-item.createdAt>120000)continue;
  if(item.type==='message')newMessage=true;else newOther=true;
 }
 if(vatraSoundKnown.size>500)vatraSoundKnown=new Set([...vatraSoundKnown].slice(-250));
 if(newMessage||newOther)vatraBeep(newMessage?'message':'notification');
}

function notificationItems(){if(!currentUser)return [];const items=[],uid=currentUser.uid;Object.entries(posts).forEach(([postId,p])=>{if(p.authorUid!==uid)return;Object.entries(likes[postId]||{}).forEach(([actor,value])=>{const createdAt=Number(value&&typeof value==='object'?value.createdAt:0);if(actor!==uid&&!blockedUsers[actor]&&createdAt)items.push({id:'like_'+postId+'_'+actor,type:'like',actorUid:actor,createdAt,postId,unread:createdAt>activityReadAt});});Object.entries(comments[postId]||{}).forEach(([commentId,c])=>{const createdAt=Number(c.createdAt)||0;if(c.uid!==uid&&!blockedUsers[c.uid]&&createdAt)items.push({id:'comment_'+postId+'_'+commentId,type:'comment',actorUid:c.uid,createdAt,postId,excerpt:String(c.text||'').slice(0,100),unread:createdAt>activityReadAt});});});Object.entries(friendRequests).forEach(([actor,r])=>{if(!r||actor===uid||blockedUsers[actor]||r.status!=='pending'||r.direction!=='incoming')return;const createdAt=Number(r.createdAt)||0;items.push({id:'friend_'+actor,type:'friend',actorUid:actor,createdAt,unread:createdAt>activityReadAt});});Object.entries(chatIndex).forEach(([key,c])=>{const m=c&&c.lastMessage;if(!m||!m.text||m.senderUid===uid||blockedUsers[c.otherUid])return;const createdAt=Number(m.createdAt)||0;items.push({id:'message_'+key,type:'message',actorUid:c.otherUid,createdAt,chatUid:c.otherUid,excerpt:String(m.text).slice(0,100),unread:createdAt>Number(chatReads[key]||0)});});return items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));}
function updateNotificationBadges(){const items=notificationItems();vatraMonitorSounds(items);const count=items.filter(x=>x.unread).length,incoming=Object.entries(friendRequests).filter(([uid,x])=>x&&!friends[uid]&&!blockedUsers[uid]&&x.status==='pending'&&x.direction==='incoming').length;['notificationBadge','notificationNavBadge'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.textContent=count>99?'99+':String(count);el.hidden=count===0;});const friendBadge=document.getElementById('friendsNavBadge');if(friendBadge){friendBadge.textContent=incoming>99?'99+':String(incoming);friendBadge.hidden=incoming===0;}}
function markChatRead(key){if(!currentUser||!key)return;const latest=chatIndex[key]&&chatIndex[key].lastMessage,stamp=Math.max(Date.now(),Number(latest&&latest.createdAt)||0);if(Number(chatReads[key]||0)>=stamp-1000)return;chatReads={...chatReads,[key]:stamp};updateNotificationBadges();set(ref(db,'chatReads/'+currentUser.uid+'/'+key),stamp).catch(err=>console.warn('Chat read receipt failed:',err));}
function markNotificationsRead(){if(!currentUser)return;const stamp=Date.now(),unreadChats=Object.entries(chatIndex).filter(([key,c])=>c&&c.lastMessage&&c.lastMessage.senderUid!==currentUser.uid&&Number(c.lastMessage.createdAt||0)>Number(chatReads[key]||0)).map(([key])=>key);activityReadAt=stamp;unreadChats.forEach(key=>{chatReads={...chatReads,[key]:stamp};});updateNotificationBadges();renderNotifications();Promise.all([set(ref(db,'activityReadAt/'+currentUser.uid),stamp),...unreadChats.map(key=>set(ref(db,'chatReads/'+currentUser.uid+'/'+key),stamp))]).catch(err=>toastMsg(niceError(err)));}
function renderNotifications(){const items=notificationItems().slice(0,50);const rows=items.map(n=>{const u=users[n.actorUid]||{},name=esc(u.name||'Користувач ВАТРИ'),when=timeAgo(n.createdAt);let title='',target='';if(n.type==='like'){title=name+' вподобав(-ла) Ваш допис';target='data-notification-post="'+esc(n.postId)+'"';}else if(n.type==='comment'){title=name+' прокоментував(-ла) Ваш допис: «'+esc(n.excerpt)+'»';target='data-notification-post="'+esc(n.postId)+'"';}else if(n.type==='friend'){title=name+' надіслав(-ла) запит у друзі';target='data-notification-friends="true"';}else{title='Нове повідомлення від '+name+': «'+esc(n.excerpt)+'»';target='data-notification-chat="'+esc(n.chatUid)+'"';}return '<button class="notification-item '+(n.unread?'is-unread':'')+'" '+target+'>'+avatar(u.name||'Користувач',u.avatarUrl)+'<span class="notification-copy"><b>'+title+'</b><small>'+when+'</small></span>'+(n.unread?'<span class="notification-dot" aria-label="Нове"></span>':'')+'</button>';}).join('');setFeed('<article class="post notifications-page"><div class="notifications-heading"><div><p class="eyebrow">ВАШЕ КОЛО</p><h2>Сповіщення</h2><p class="muted">Запити в друзі, реакції на Ваші дописи та нові повідомлення.</p></div><div class="vatra-notification-settings"><span class="count-badge">'+items.filter(x=>x.unread).length+' нових</span><button type="button" data-vatra-sound-toggle class="vatra-notification-sound" aria-pressed="'+String(currentProfile.notificationSounds!==false)+'">'+(currentProfile.notificationSounds!==false?'♫ Звуки увімкнені':'♪ Звуки вимкнені')+'</button></div></div><div class="notification-list">'+(rows||'<div class="empty-inline">Поки немає сповіщень. Нові реакції, запити й повідомлення з’являться тут.</div>')+'</div></article>');}
function renderGettingStarted(){
 const box=$('#gettingStartedMobile'),side=$('#gettingStarted');if(side){side.hidden=true;side.innerHTML='';}
 if(!box)return;if(!currentUser||page!=='feed'){box.hidden=true;box.innerHTML='';return;}
 let dismissed=false;try{dismissed=localStorage.getItem('vatra-guide-hidden-v1-'+currentUser.uid)==='1';}catch{}
 const ownPosts=Object.values(posts||{}).filter(p=>p&&p.authorUid===currentUser.uid),profileReady=!!(currentProfile.bio||currentProfile.city||currentProfile.workplace||currentProfile.education);
 const tasks=[{title:'Додайте фото профілю',desc:'Друзі зможуть упізнати Вас.',done:!!currentProfile.avatarUrl,action:'profile',cta:'Відкрити профіль'},{title:'Заповніть інформацію',desc:'Додайте опис або місто.',done:profileReady,action:'settings',cta:'Налаштувати профіль'},{title:'Опублікуйте перший допис',desc:'Поділіться думкою, фото чи опитуванням.',done:ownPosts.length>0,action:'create',cta:'Створити допис'},{title:'Знайдіть друзів',desc:'Запросіть знайомих до свого кола.',done:Object.keys(friends||{}).length>0,action:'explore',cta:'Знайти людей'}];
 const done=tasks.filter(t=>t.done).length,pending=tasks.filter(t=>!t.done);if(dismissed||!pending.length){box.hidden=true;box.innerHTML='';return;}
 box.hidden=false;box.innerHTML='<div class="getting-head"><span class="getting-mark"><img src="vatra-flame.svg?v=20261029-2" alt="" class="vatra-ui-flame"></span><div><p class="eyebrow">ШВИДКИЙ СТАРТ</p><h3>Почніть користуватися ВАТРОЮ</h3><p>'+done+' із '+tasks.length+' кроків · залишилося '+pending.length+'</p></div><button type="button" class="getting-dismiss" data-onboard-dismiss aria-label="Приховати швидкий старт">×</button></div><div class="getting-progress"><span style="width:'+(done/tasks.length*100)+'%"></span></div><div class="getting-tasks">'+pending.map((t,i)=>'<div class="getting-task"><span class="task-number">'+(done+i+1)+'</span><div class="task-copy"><b>'+t.title+'</b><small>'+t.desc+'</small></div><button type="button" data-onboard="'+t.action+'" aria-label="'+t.cta+'">›</button></div>').join('')+'</div><button type="button" class="getting-help" data-onboard="guide">Короткий тур ВАТРОЮ</button>';
}
function openVatraGuide(){
 if(!currentUser||document.querySelector('#vatraTourOverlay.is-visible'))return;
 const steps=[
  {number:'01',tag:'ЛАСКАВО ПРОСИМО',title:'Вітаємо у ВАТРІ',text:'Український простір для спілкування. Тут можна ділитися новинами, підтримувати зв’язок із друзями та керувати власним профілем.',icon:'В'},
  {number:'02',tag:'ПРОФІЛЬ',title:'Створіть свою сторінку',text:'Додайте фото, короткий опис і ту інформацію, якою хочете поділитися. У налаштуваннях оберіть, кому видно особисті поля.',icon:'◌'},
  {number:'03',tag:'НОВИНИ ТА СПІЛЬНОТИ',title:'Діліться важливим',text:'Публікуйте дописи з фото та опитуваннями. Стежте за друзями й долучайтеся до спільнот за інтересами.',icon:'▤'},
  {number:'04',tag:'ДРУЗІ ТА ПОВІДОМЛЕННЯ',title:'Залишайтеся на зв’язку',text:'Знайдіть знайомих, надішліть запит у друзі та спілкуйтеся в особистих повідомленнях. Діалоги доступні їхнім учасникам.',icon:'✉'},
  {number:'05',tag:'ВАШ КОНТРОЛЬ',title:'Ви керуєте ВАТРОЮ',text:'Змінюйте приватність, налаштовуйте вигляд сторінки, переглядайте сповіщення та зберігайте цікаві дописи для себе.',icon:'⚙'}
 ];
 let index=0;
 const overlay=document.createElement('div');
 overlay.id='vatraTourOverlay';overlay.className='vatra-tour-overlay vatra-onboarding-modern';
 overlay.setAttribute('aria-hidden','false');
 overlay.innerHTML='<section class="vatra-tour-card" role="dialog" aria-modal="true" aria-labelledby="vatraTourTitle" aria-describedby="vatraTourText" tabindex="-1">'+
 '<header class="vatra-tour-top"><span class="vatra-tour-kicker">ПЕРШИЙ ЗАПУСК</span><button type="button" class="vatra-tour-skip" data-tour-skip>Пропустити</button></header>'+
 '<div class="vatra-tour-brand"><span class="vatra-tour-brand-icon" id="vatraTourIcon" aria-hidden="true">В</span><span>ВАТРА <small>Ваш простір спілкування</small></span></div>'+
 '<div class="vatra-tour-count" id="vatraTourCount"></div><h2 id="vatraTourTitle"></h2><p id="vatraTourText"></p>'+
 '<div class="vatra-tour-progress" role="progressbar" aria-label="Прогрес знайомства" aria-valuemin="0" aria-valuemax="5" aria-valuenow="1"><span id="vatraTourProgress"></span></div>'+
 '<footer class="vatra-tour-actions"><button type="button" class="pill" id="vatraTourPrev">Назад</button><button type="button" class="primary" id="vatraTourNext">Далі</button></footer>'+
 '</section>';
 document.body.append(overlay);
 const previousFocus=document.activeElement;
 const finish=()=>{
  overlay.classList.remove('is-visible');overlay.setAttribute('aria-hidden','true');
  document.removeEventListener('keydown',onKey);
  overlay.remove();
  if(currentUser){
   const key='vatra-guide-completed-v2-'+currentUser.uid;
   try{localStorage.setItem(key,'1');}catch{}
   update(ref(db,'privateUsers/'+currentUser.uid),{vatraGuideCompletedAt:Date.now()}).catch(error=>console.warn('[ВАТРА] Не вдалося зберегти завершення туру:',error));
  }
  if(previousFocus?.isConnected)previousFocus.focus();
 };
 const draw=()=>{
  const item=steps[index];
  overlay.querySelector('#vatraTourIcon').textContent=item.icon;
  overlay.querySelector('.vatra-tour-kicker').textContent=item.tag;
  overlay.querySelector('#vatraTourCount').textContent='Крок '+(index+1)+' з '+steps.length;
  overlay.querySelector('#vatraTourTitle').textContent=item.title;
  overlay.querySelector('#vatraTourText').textContent=item.text;
  overlay.querySelector('#vatraTourProgress').style.width=((index+1)/steps.length*100)+'%';
  overlay.querySelector('.vatra-tour-progress').setAttribute('aria-valuenow',String(index+1));
  overlay.querySelector('#vatraTourPrev').disabled=index===0;
  overlay.querySelector('#vatraTourNext').textContent=index===steps.length-1?'Почати користуватися':'Далі →';
 };
 const onKey=event=>{
  if(event.key==='Escape'){event.preventDefault();finish();}
  if(event.key==='Tab'){
   const controls=[...overlay.querySelectorAll('button:not([disabled])')];
   const first=controls[0],last=controls[controls.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 };
 document.addEventListener('keydown',onKey);
 overlay.querySelector('[data-tour-skip]').addEventListener('click',finish);
 overlay.querySelector('#vatraTourPrev').addEventListener('click',()=>{if(index){index--;draw();}});
 overlay.querySelector('#vatraTourNext').addEventListener('click',()=>{if(index<steps.length-1){index++;draw();}else finish();});
 draw();overlay.classList.add('is-visible');overlay.querySelector('#vatraTourNext').focus();
}
function vatraSetupScrollUp(){
 const button=document.getElementById('vatraScrollToTop');
 if(!button)return;
 const update=()=>{button.hidden=(window.scrollY||document.documentElement.scrollTop||0)<420;};
 button.addEventListener('click',()=>window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth'}));
 window.addEventListener('scroll',update,{passive:true});
 update();
}
vatraSetupScrollUp();
function render(){if(!feed)return;document.body.dataset.page=page;if(page==='explore'&&document.activeElement?.closest('#vatraSearchForm'))return;if(currentUser&&(!initialDataReady||(page==='saved'&&!vatraPageDataReady.saved)||(page==='friends'&&!vatraPageDataReady.friends)||(page==='messages'&&!vatraPageDataReady.messages))){renderLoadingSkeletons();return;}renderGettingStarted();if(page==='music')return vatraShowMusic(currentUser?.uid);if(page==='notifications')return renderNotifications();if(page==='saved')return renderSaved();if(page==='settings')return renderSettings();if(page==='groupSettings')return renderGroupSettings(groupId);if(page==='friends')return renderFriends();if(page==='publicProfile')return; if(page==='myVideos')return renderMyVideos();if(page==='videos')return renderVideos();if(page==='photos')return renderPhotos();if(page==='groups')return groupId&&groups[groupId]?renderGroupDetails(groupId):renderGroups();if(page==='messages')return renderMessages();if(page==='explore')return renderExplore();if(page==='profile')return renderProfile();renderFeed();}
const pages={music:['ВАТРА · МУЗИКА','Музика','Слухайте українські пісні й артистів в офіційному Spotify.'],friends:['ВАШЕ КОЛО','Друзі','Керуйте запитами та знаходьте знайомих.'],notifications:['ВАШЕ КОЛО','Сповіщення','Запити в друзі, реакції на Ваші дописи та нові повідомлення.'],feed:['ВАШЕ КОЛО','Новини','Дописи друзів і спільнот, за якими Ви стежите.'],photos:['МОЇ МОМЕНТИ','Фотографії','Ваш альбом і зображення з дописів.'],videos:['ДИВІТЬСЯ ТА ВІДКРИВАЙТЕ','ВАТРА Shorts','Живі моменти від людей з усієї України.'],myVideos:['МОЇ ВІДЕО','Відео','Ваші власні відеозаписи.'],explore:['ЗНАХОДЬТЕ СВОЄ','Відкриття','Знайомтеся з людьми та відкривайте цікаві дописи.'],messages:['БУДЬТЕ НА ЗВʼЯЗКУ','Месенджер','Приватні розмови з людьми ВАТРИ.'],groups:['РАЗОМ ЦІКАВІШЕ','Спільноти','Знаходьте людей, з якими є про що говорити.'],saved:['ТЕ, ЩО ВАЖЛИВО','Збережене','Дописи, до яких хочеться повернутися.'],profile:['ВАША ІСТОРІЯ','Профіль','Ваш простір у ВАТРІ.'],settings:['НАЛАШТУВАННЯ','Налаштування профілю','Керуйте інформацією, фотографіями та приватністю сторінки.'],groupSettings:['СПІЛЬНОТА','Керування спільнотою','Налаштовуй опис, діяльність і команду спільноти.']};
function goPage(p){if(!pages[p])p='feed';const previousPage=page;const entering=p!==previousPage;if(entering){if(p==='settings')vatraSettingsSection='profile';if(p==='friends')vatraFriendsTab='all';if(p==='feed')filter='all';if(p!=='explore'&&p!=='feed'){query='';const input=$('#search');if(input)input.value='';}if(p!=='messages')editingMessageId=null;if(p!=='profile'&&p!=='publicProfile')activeProfileUid=null;}if(p!=='explore')profileAttributeSearch=null;navigation.setPage(p);if(p==='settings'&&!authRequired())return;const main=$('.layout>.main');if(main){main.classList.remove('vatra-page-enter');void main.offsetWidth;main.classList.add('vatra-page-enter');}page=p;vatraMusicRouteChanged(p==='music');if(groupDetailsUnsub){groupDetailsUnsub();groupDetailsUnsub=null;}if(p!=='messages')stopChatListener();groupId=null;const c=pages[p]||pages.feed;$('#title').textContent=c[1];$('#subtitle').textContent=c[2];$('.heading .eyebrow').textContent=c[0];$$('button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===p));$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter&&p==='feed'));const composer=$('.quick-compose');if(composer)composer.hidden=p!=='feed';const sort=$('#sort');if(sort)sort.hidden=p!=='feed';if(p==='messages'&&previousPage!=='messages'){activeChat=null;vatraChatUnreadOnly=false;}render();window.scrollTo(0,0);if(p==='notifications')markNotificationsRead();}
window.addEventListener('vatra:navigate',event=>{if(['music','notifications'].includes(event.detail))goPage(event.detail);});
function resetPollComposer(){const fields=$('#pollOptionFields');fields.innerHTML='<label class="poll-option-field"><span>1</span><input maxlength="80" placeholder="Перший варіант" aria-label="Перший варіант відповіді"><button type="button" data-remove-poll-option aria-label="Видалити варіант">×</button></label><label class="poll-option-field"><span>2</span><input maxlength="80" placeholder="Другий варіант" aria-label="Другий варіант відповіді"><button type="button" data-remove-poll-option aria-label="Видалити варіант">×</button></label>';$('#pollComposer').hidden=true;$('#togglePoll').setAttribute('aria-expanded','false');}
$('#togglePoll').addEventListener('click',()=>{const box=$('#pollComposer'),show=box.hidden;box.hidden=!show;$('#togglePoll').setAttribute('aria-expanded',String(show));if(show)$('#pollOptionFields input')?.focus();});
$('#addPollOption').addEventListener('click',()=>{const fields=$('#pollOptionFields'),n=fields.querySelectorAll('input').length;if(n>=6)return toastMsg('В опитуванні може бути до 6 варіантів.');const row=document.createElement('label');row.className='poll-option-field';row.innerHTML='<span>'+String(n+1)+'</span><input maxlength="80" placeholder="Варіант '+String(n+1)+'" aria-label="Варіант відповіді '+String(n+1)+'"><button type="button" data-remove-poll-option aria-label="Видалити варіант">×</button>';fields.append(row);row.querySelector('input').focus();});
$('#pollOptionFields').addEventListener('click',e=>{const button=e.target.closest('[data-remove-poll-option]');if(!button)return;const fields=$('#pollOptionFields');if(fields.querySelectorAll('input').length<=2)return toastMsg('В опитуванні потрібно щонайменше 2 варіанти.');button.closest('.poll-option-field').remove();});
function clearComposerPhotoPreviews(){imagePreviewUrls.forEach(url=>URL.revokeObjectURL(url));imagePreviewUrls.length=0;}
function renderComposerPhotoPreviews(){
 clearComposerPhotoPreviews();
 const box=$('#preview');if(!box)return;
 box.innerHTML=imageFiles.map((file,index)=>{const url=URL.createObjectURL(file);imagePreviewUrls.push(url);return '<div class="composer-photo-preview"><img src="'+url+'" alt="Фото '+(index+1)+'"><div class="composer-photo-actions"><button type="button" data-edit-composer-photo="'+index+'">Редагувати</button><button type="button" data-remove-composer-photo="'+index+'" aria-label="Прибрати фото">×</button></div><small>'+(index+1)+' / '+imageFiles.length+'</small></div>';}).join('');
 postComposerUI.refreshMedia();
}
async function selectPostPhotos(fileList){
 const files=Array.from(fileList||[]).filter(file=>file&&file.type?.startsWith('image/'));
 if(!files.length)return;
 const available=Math.max(0,10-imageFiles.length);
 if(files.length>available)toastMsg('До одного допису можна додати не більше 10 фото. Зайві файли не додано.');
 let added=0;
 for(const file of files.slice(0,available)){
  if(file.size>MAX_IMAGE){toastMsg('Фото «'+String(file.name||'').slice(0,60)+'» завелике. Максимум — 15 МБ на файл.');continue;}
  imageFiles.push(file);added++;
 }
 renderComposerPhotoPreviews();
 const note=$('#photoNote');if(note)note.textContent=imageFiles.length?'Додано фото: '+imageFiles.length+' із 10':'';
 if(added)toastMsg(added===1?'Фото додано до допису.':'Додано '+added+' фото до одного допису.');
}
const postComposerUI=setupPostComposer({modal,getUid:()=>currentUser?.uid,getPhotos:()=>imageFiles,getUrls:()=>imagePreviewUrls,getVideo:()=>videoFile,setVideo:file=>{videoFile=file;},addPhotos:selectPostPhotos,resetPoll:resetPollComposer,toast:toastMsg,maxVideo:MAX_VIDEO,maxText:MAX_POST_TEXT});
function openComposer(){if(!authRequired())return;imageFiles=[];clearComposerPhotoPreviews();editPostFiles=[];videoFile=null;$('#postText').value='';$('#count').textContent='0 / '+MAX_POST_TEXT;$('#preview').innerHTML='';$('#modalPhoto').value='';$('#composerMediaFiles').value='';$('#composerVideo').value='';$('#photo').value='';const note=$('#photoNote');if(note)note.textContent='';resetPollComposer();$('#postVisibility').value='public';$('#postVisibility').dispatchEvent(new Event('change'));modal.showModal();postComposerUI.onOpen();}
function loadImage(file,cb){if(!file)return false;if(!file.type.startsWith('image/')){toastMsg('Виберіть файл зображення.');return false;}if(file.size>MAX_IMAGE){toastMsg('Фото має бути меншим за 15 МБ.');return false;}const r=new FileReader();r.onload=()=>cb(r.result);r.onerror=()=>toastMsg('Не вдалося прочитати файл зображення.');r.readAsDataURL(file);return true;}
async function uploadImage(file,maxSide=1200,quality=.78,category='posts'){if(!file||!file.type?.startsWith('image/'))throw new Error('Виберіть файл зображення.');if(file.size>15*1024*1024)throw new Error('Фото має бути меншим за 15 МБ.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Не вдалося прочитати фото.'));r.readAsDataURL(file);});const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Файл зображення пошкоджений.'));i.src=data;});const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Не вдалося обробити зображення.');ctx.drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Не вдалося підготувати фото.')),'image/jpeg',quality));const optimized=new File([blob],(file.name||'photo').replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg',lastModified:Date.now()});return await uploadMedia(optimized,category);}
async function getImageEditor(file,mode='avatar'){return await openVatraPhotoStudio(file,mode);}
 async function uploadAvatar(e){const f=e.target.files?.[0];if(!f)return;if(!authRequired())return;try{const edited=await getImageEditor(f,'avatar');if(!edited)return;toastMsg('Обробляємо фото…');const avatarUrl=await uploadImage(edited,512,.9,'avatars');const history=Array.isArray(currentProfile.avatarHistory)?currentProfile.avatarHistory.slice():[];if(currentProfile.avatarUrl&&currentProfile.avatarUrl!==avatarUrl)history.push(currentProfile.avatarUrl);const avatarHistory=history.filter((url,i,arr)=>url&&arr.indexOf(url)===i).slice(-30);await update(ref(db,`users/${currentUser.uid}`),{avatarUrl,avatarHistory});currentProfile.avatarUrl=avatarUrl;currentProfile.avatarHistory=avatarHistory;await set(ref(db,`publicProfiles/${currentUser.uid}`),publicProfileData(currentProfile));updateIdentity();render();toastMsg('Фото профілю збережено.');}catch(err){toastMsg(err.message||niceError(err));}finally{e.target.value='';}}
async function uploadCover(e){const f=e.target.files?.[0];if(!f)return;if(!authRequired())return;try{const edited=await getImageEditor(f,'cover');if(!edited)return;toastMsg('Обробляємо обкладинку…');const coverUrl=await uploadImage(edited,1600,.9,'covers');await update(ref(db,`users/${currentUser.uid}`),{coverUrl});currentProfile.coverUrl=coverUrl;await set(ref(db,`publicProfiles/${currentUser.uid}`),publicProfileData(currentProfile));render();toastMsg('Обкладинку профілю збережено.');}catch(err){toastMsg(err.message||niceError(err));}finally{e.target.value='';}}
async function uploadProfilePhoto(e){
 const input=e.currentTarget,files=Array.from(input.files||[]).filter(Boolean);
  const albumId=input.dataset.vatraAlbumUploadId||'';
 if(!files.length)return;
 if(!authRequired()){input.value='';return;}
 if(files.length>10){toastMsg('Можна вибрати до 10 фотографій за раз.');input.value='';return;}
 const previous=Array.isArray(currentProfile.profilePhotos)?currentProfile.profilePhotos.slice():[];
 if(previous.length+files.length>120){toastMsg('До профілю можна завантажити до 120 фотографій.');input.value='';return;}
 const uploaded=[];
 try{
  for(const file of files){
   if(!file.type.startsWith('image/')||file.size>MAX_IMAGE){toastMsg('Пропущено файл: потрібне зображення до 15 МБ.');continue;}
   try{const edited=await getImageEditor(file,'gallery');
   if(!edited)continue;
   toastMsg('Завантажуємо фотографії до альбому…');
   uploaded.push(await uploadImage(edited,1600,.9,'posts'));}
   catch(error){console.warn('Photo skipped:',error);toastMsg('Не вдалося завантажити одне з фото. Продовжуємо решту.');}
  }
  if(!uploaded.length)return;
  const savedPhotos=[...new Set([...previous,...uploaded])].slice(-120);
  const photoUploadedAt={...(currentProfile.photoUploadedAt||{})};uploaded.forEach((url,i)=>{photoUploadedAt[url]=Date.now()+i;});
  const photoAlbums=vatraGetAlbums(currentProfile).map(a=>a.id===albumId?{...a,photos:[...new Set([...a.photos,...uploaded])].slice(-40)}:a);
  await update(ref(db,'users/'+currentUser.uid),{profilePhotos:savedPhotos,photoUploadedAt,photoAlbums,updatedAt:Date.now()});
  currentProfile.profilePhotos=savedPhotos;currentProfile.photoUploadedAt=photoUploadedAt;currentProfile.photoAlbums=photoAlbums;
  await set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile));
  render();toastMsg('Фотографії додано до Вашого альбому: '+uploaded.length+'.');
 }catch(error){toastMsg('Не всі фотографії вдалося зберегти: '+(error?.message||niceError(error)));}
 finally{input.value='';}
}
async function deleteProfilePhoto(index){
 if(!currentUser||!authRequired())return;
 const photos=Array.isArray(currentProfile.profilePhotos)?currentProfile.profilePhotos.slice():[];
 if(!Number.isInteger(index)||index<0||index>=photos.length)return;
 if(!(await askConfirm('Прибрати це фото з альбому профілю?')))return;
 photos.splice(index,1);
 try{
  await update(ref(db,'users/'+currentUser.uid),{profilePhotos:photos,updatedAt:Date.now()});
  currentProfile.profilePhotos=photos;await set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile));
  render();toastMsg('Фото прибрано з альбому.');
 }catch(error){toastMsg(error.message||niceError(error));}
}
async function editProfile(){goPage('settings');}
async function editProfileStatus(){
 if(!authRequired())return;
 const next=await askText('Статус профілю',currentProfile.status||'');
 if(next===null)return;
 const status=next.slice(0,100);
 try{
  await update(ref(db,'users/'+currentUser.uid),{status,updatedAt:Date.now()});
  currentProfile.status=status;
  await Promise.all([
   set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile)),
   set(ref(db,'friendProfiles/'+currentUser.uid),friendProfileData(currentProfile))
  ]);
  render();toastMsg('Статус профілю оновлено.');
 }catch(error){toastMsg(niceError(error));}
}

function enhanceProfileDatePicker(input){
 if(!input||input.dataset.datePickerEnhanced)return;
 input.dataset.datePickerEnhanced='1';input.hidden=true;
 const now=new Date();input.max=localISODate(now);input.min='1900-01-01';
 const wrap=document.createElement('div');wrap.className='birthday-selects';wrap.setAttribute('role','group');wrap.setAttribute('aria-label','Дата народження');
 const day=document.createElement('select'),month=document.createElement('select'),year=document.createElement('select');
 day.setAttribute('aria-label','День народження');month.setAttribute('aria-label','Місяць народження');year.setAttribute('aria-label','Рік народження');
 const opt=(value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;};
 day.append(opt('','День'));
 month.append(opt('','Місяць'));['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'].forEach((m,i)=>month.append(opt(String(i+1).padStart(2,'0'),m)));
 year.append(opt('','Рік'));for(let y=now.getFullYear();y>=1900;y--)year.append(opt(String(y),String(y)));
 wrap.append(day,month,year);input.insertAdjacentElement('afterend',wrap);
 const hint=document.createElement('small');hint.className='birthday-picker-hint';hint.textContent='Дата народження прихована за замовчуванням. Реєстрація доступна з 13 років.';wrap.insertAdjacentElement('afterend',hint);
 const rebuildDays=(preserve=true)=>{const old=preserve?day.value:'';day.replaceChildren(opt('','День'));const count=year.value&&month.value?new Date(Number(year.value),Number(month.value),0).getDate():31;const allowed=year.value&&month.value&&Number(year.value)===now.getFullYear()&&Number(month.value)===now.getMonth()+1?Math.min(count,now.getDate()):count;for(let d=1;d<=allowed;d++)day.append(opt(String(d).padStart(2,'0'),String(d)));day.value=old&&Number(old)<=allowed?old:'';};
 const fromInput=()=>{const parts=(input.value||'').split('-');if(parts.length===3){year.value=parts[0];month.value=parts[1];rebuildDays(false);day.value=parts[2];}else{day.value='';month.value='';year.value='';rebuildDays(false);}};
 const toInput=()=>{if(!day.value||!month.value||!year.value){input.value='';day.setCustomValidity('Оберіть день, місяць і рік.');hint.classList.remove('is-invalid');return;}const y=Number(year.value),m=Number(month.value),d=Number(day.value),date=new Date(y,m-1,d);const valid=date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d&&date<=now;if(!valid){day.setCustomValidity('Перевірте день народження.');input.value='';hint.classList.add('is-invalid');hint.textContent='Перевірте дату: такого дня немає в цьому місяці або дата в майбутньому.';return;}day.setCustomValidity('');hint.classList.remove('is-invalid');hint.textContent='Дата народження прихована за замовчуванням. Реєстрація доступна з 13 років.';input.value=year.value+'-'+month.value+'-'+day.value;input.dispatchEvent(new Event('change',{bubbles:true}));};
 month.addEventListener('change',()=>{rebuildDays(true);toInput();});year.addEventListener('change',()=>{rebuildDays(true);toInput();});day.addEventListener('change',toInput);input.addEventListener('change',fromInput);fromInput();
}

function vatraPrivacyOptions(value,defaultValue='private'){
 const selected=vatraFieldVisibility(value,defaultValue);
 return [['public','Для всіх'],['friends','Для друзів'],['private','Лише для себе']].map(([key,label])=>'<option value="'+key+'"'+(selected===key?' selected':'')+'>'+label+'</option>').join('');
}
let vatraSettingsSection='profile',vatraSettingsSaving=false;
function vatraOrganizeSettings(){
 const page=$('.settings-page'),form=$('#profileSettingsForm');if(!page||!form)return;
 const cards=[...form.children].filter(node=>node.classList.contains('settings-card'));
 const [photoCard,basicCard,adminCard,appearanceCard,privacyCard]=cards;
 const mainGrid=basicCard?.querySelector('.settings-grid');
 const savebar=form.querySelector('.settings-savebar');
 if(!mainGrid||!savebar)return;
 const tabs=[
  ['profile','Профіль'],['contacts','Контакти'],['interests','Захоплення'],
  ['education','Освіта'],['career',"Кар'єра"],['service','Військова служба'],
  ['life','Життєва позиція'],['privacy','Приватність'],['appearance','Вигляд ВАТРИ'],['documents','Документи']
 ];
 const workspace=document.createElement('div');workspace.className='vatra-settings-workspace';
 form.before(workspace);workspace.append(form);
 const nav=document.createElement('nav');nav.className='vatra-settings-nav';nav.setAttribute('aria-label','Розділи налаштувань профілю');
 page.querySelector('.settings-intro')?.remove();
 workspace.append(nav);
 const sections={};
 for(const [id,title] of tabs){
  const pane=document.createElement('section');pane.className='vatra-settings-pane';pane.dataset.settingsSection=id;pane.setAttribute('aria-label',title);pane.hidden=id!==vatraSettingsSection;
  sections[id]=pane;form.insertBefore(pane,savebar);
  const button=document.createElement('button');button.type='button';button.className='vatra-settings-nav-button';button.textContent=title;button.dataset.settingsTarget=id;button.classList.toggle('active',id===vatraSettingsSection);button.setAttribute('aria-current',id===vatraSettingsSection?'page':'false');
  nav.append(button);
 }
 const choose=id=>{
  vatraSettingsSection=id;
  for(const [key,pane] of Object.entries(sections))pane.hidden=key!==id;
  nav.querySelectorAll('[data-settings-target]').forEach(button=>{
   const active=button.dataset.settingsTarget===id;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');
  });
 };
 nav.addEventListener('click',event=>{
  const button=event.target.closest('[data-settings-target]');if(button){choose(button.dataset.settingsTarget);}
 });
 const makeCard=(id,title,desc='')=>{
  const card=document.createElement('section');card.className='settings-card vatra-settings-custom-card';
  const h=document.createElement('h3');h.textContent=title;card.append(h);
  if(desc){const note=document.createElement('p');note.className='muted';note.textContent=desc;card.append(note);}
  const grid=document.createElement('div');grid.className='settings-grid';card.append(grid);
  sections[id].append(card);return grid;
 };
 sections.profile.append(photoCard,basicCard);
 const groupSpecs=[
  ['contacts','Контакти',['city','location','hometown','phone','website']],
  ['education','Освіта',['education']],
  ['career',"Кар'єра",['workplace']]
 ];
 for(const [section,title,fields] of groupSpecs){
  const grid=makeCard(section,title);
  for(const field of fields){
   const original=[...mainGrid.querySelectorAll('label')].find(label=>label.querySelector('[name="'+field+'"]'));
   if(original)grid.append(original);
  }
 }
 const fieldSpecs={
  interests:[['hobbies','Захоплення'],['activities','Діяльність'],['music','Улюблена музика'],['films','Улюблені фільми'],['books','Улюблені книги'],['games','Улюблені ігри']],
  service:[['serviceNotes','Про військову службу']],
  life:[['lifeNotes','Життєва позиція'],['values','Головне в житті'],['inspiration','Надихають']]
 };
 for(const [section,fields] of Object.entries(fieldSpecs)){
  const titles={interests:'Захоплення',service:'Військова служба',life:'Життєва позиція'};
  const grid=makeCard(section,titles[section],'Заповнені поля видно Вам у профілі. Для показу іншим окремо увімкніть їхню публічність.');
  for(const [key,labelText] of fields){
   const label=document.createElement('label');label.textContent=labelText;
   const textarea=document.createElement('textarea');textarea.name='private_'+key;textarea.maxLength=500;textarea.rows=2;textarea.placeholder='Не заповнено';textarea.value=String(currentProfile.privateSections?.[key]||'').slice(0,500);
   label.append(textarea);
   const vis=document.createElement('label');vis.className='vatra-extra-visibility';vis.textContent='Хто бачить це поле';
   const select=document.createElement('select');select.name='extraVisibility_'+key;
   for(const [value,title] of [['public','Для всіх'],['friends','Для друзів'],['private','Лише для себе']]){
    const opt=document.createElement('option');opt.value=value;opt.textContent=title;select.append(opt);
   }
   select.value=vatraFieldVisibility(currentProfile.extraVisibility?.[key]);
   vis.append(select);
   const wrap=document.createElement('div');wrap.className='vatra-extra-setting';wrap.append(label,vis);grid.append(wrap);
  }
 }
 sections.privacy.append(privacyCard,adminCard);
 sections.appearance.append(appearanceCard);
 const looks=appearanceCard.querySelector('.settings-grid');
 const prefSelect=(name,label,options,current)=>{
  const row=document.createElement('label');row.textContent=label;
  const select=document.createElement('select');select.name=name;
  for(const [value,title] of options){const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option);}
  select.value=current;row.append(select);return row;
 };
 looks.append(prefSelect('themeMode','Тема оформлення',[['light','Світла'],['dark','Темна'],['auto','Як у системі']],currentProfile.themeMode||'light'));
 const blocked=page.querySelector('.blocked-users-card'),legal=page.querySelector('.settings-legal-card');
 if(blocked)sections.privacy.append(blocked);
 if(legal){
  legal.classList.add('vatra-official-documents');
  legal.innerHTML='<div class="vatra-legal-heading"><div><span class="vatra-legal-kicker">НОРМАТИВНА ІНФОРМАЦІЯ</span><h3>Документи ВАТРИ</h3><p>Правила платформи, умови використання та відомості про обробку персональних даних. Ознайомтеся з текстом документа перед використанням відповідних можливостей.</p></div></div>'+
  '<div class="vatra-legal-rows">'+[
   ['01','rules','Правила спільноти ВАТРИ','Норми поведінки, обмеження контенту та порядок модерації.'],
   ['02','terms','Умови користування','Права та обов’язки користувачів, умови доступу до сервісу.'],
   ['03','privacy','Політика конфіденційності','Категорії персональних даних, їх обробка та права користувачів.']
  ].map(([num,id,title,description])=>'<a href="#'+id+'" data-legal-open="'+id+'" class="vatra-legal-row"><span class="vatra-legal-number">'+num+'</span><span class="vatra-legal-title"><b>'+title+'</b><small>'+description+'</small></span><span class="vatra-legal-open">Ознайомитися</span></a>').join('')+
  '</div><p class="vatra-legal-footnote">Текст документів відкривається для читання у ВАТРІ. Дата набрання чинності й реквізити визначаються самим документом; ця сторінка не є підтвердженням юридичної експертизи.</p>';
  sections.documents.append(legal);
 }
 const info=document.createElement('p');info.className='vatra-settings-private-note';info.textContent='Приватні поля зберігаються окремо від відкритої інформації профілю.';
 sections.service.append(info.cloneNode(true));
 sections.life.append(info);
 // Всі поля залишаються частиною однієї форми; перевірка значень уже виконується в обробнику збереження.
 form.noValidate=true;
 // Background profile/presence updates must not erase unsaved typed settings.
 const markSettingsDirty=()=>{if(vatraSettingsSaving)return;form.dataset.vatraDirty='true';const note=form.querySelector('.settings-savebar span');if(note){note.textContent='Є незбережені зміни.';note.dataset.state='dirty';}};
 form.addEventListener('input',markSettingsDirty);
 form.addEventListener('change',markSettingsDirty);
 form.addEventListener('invalid',event=>{
  const section=event.target.closest('.vatra-settings-pane');
  if(section)choose(section.dataset.settingsSection);
 },true);
 choose(vatraSettingsSection);
}

function renderSettings(){const p=currentProfile||{};const [first='',...rest]=String(p.name||currentUser?.displayName||'').split(' ');const last=rest.join(' ');const dobInput=$('#settingsBirthday');setFeed(`<section class="settings-page"><div class="settings-intro"><div><p class="eyebrow">ВАША СТОРІНКА</p><h2>Налаштування профілю</h2><p>Ви вирішуєте, яку інформацію бачать інші та як Вас можуть знайти у ВАТРІ.</p></div></div><form id="profileSettingsForm" class="settings-form"><section class="settings-card"><h3>Фотографії</h3><p class="muted">Фото стискаються в браузері й зберігаються у файловому сховищі.</p><div class="settings-photo-row"><div class="settings-avatar" id="settingsAvatarPreview" style="${p.avatarUrl?`background-image:url('${esc(p.avatarUrl)}')`:''}">${p.avatarUrl?'':'В'}</div><div><label class="primary file-pick" for="settingsAvatarFile">Завантажити аватар</label><input id="settingsAvatarFile" type="file" accept="image/*" hidden><p class="field-hint">Рекомендовано квадратне фото. До 12 МБ перед стисканням.</p><button type="button" class="text-link" id="removeAvatar">Прибрати фото</button></div></div></section><section class="settings-card"><h3>Основна інформація</h3><div class="settings-grid"><label>Ім’я<input name="firstName" maxlength="40" required value="${esc(p.firstName||first)}"></label><label>Прізвище<input name="lastName" maxlength="40" required value="${esc(p.lastName||last)}"></label><label>Псевдонім (@)<input name="handle" maxlength="24" required value="${esc(p.handle||'')}"><small>2–24 символи: літери, цифри, крапка, _ або -</small></label><label>Місто / населений пункт<input name="city" maxlength="80" value="${esc(p.city||'')}" placeholder="Наприклад, Ужгород"></label><label class="span-two">Місце проживання / додатково<input name="location" maxlength="120" value="${esc(p.location||'')}" placeholder="Район, область або інший опис (необов’язково)"></label><label>Місце роботи<input name="workplace" maxlength="120" value="${esc(p.workplace||'')}" placeholder="Компанія або професія"></label><label>Місце навчання<input name="education" maxlength="120" value="${esc(p.education||'')}" placeholder="Заклад освіти"></label><label>Рідне місто<input name="hometown" maxlength="80" value="${esc(p.hometown||'')}" placeholder="Де Ви виросли"></label><label class="span-two">Про себе<textarea name="bio" maxlength="500" rows="4" placeholder="Розкажи трохи про себе…">${esc(p.bio||'')}</textarea><small>До 500 символів</small></label><label>Номер телефону<input id="settingsPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(p.pendingPhone||privatePendingPhone||p.phone||privatePhone||'')}" placeholder="+380XXXXXXXXX"><small>Новий номер зберігається до підтвердження; для активації надішліть SMS-код.</small><button class="text-link" type="button" id="sendPhoneVerification">Надіслати код на телефон</button><div id="phoneVerificationWrap" hidden><input id="phoneVerificationCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Код із SMS"><button class="pill" type="button" id="confirmPhoneVerification">Підтвердити номер</button></div><small id="phoneVerificationStatus" class="field-hint"></small></label><label>Дата народження<input id="settingsBirthday" name="dateOfBirth" type="date" min="1900-01-01" max="${localISODate()}" value="${esc(p.dateOfBirth||'')}"><small>Зберігається в приватному вузлі профілю.</small></label><label>Посилання на сайт<input name="website" type="url" maxlength="180" value="${esc(p.website||'')}" placeholder="https://…"></label></div></section><section class="settings-card official-admin-card" id="officialAdminCard" hidden><h3>Офіційні акаунти</h3><p class="muted">Цей розділ доступний лише адміністратору ВАТРИ. Позначка відображається біля імені та прізвища в дописах і профілі.</p><label>Акаунт для перевірки<select id="officialTargetUser"><option value="">Оберіть користувача…</option>${Object.entries(users||{}).filter(([uid,u])=>uid&&u&&u.name).sort((a,b)=>String(a[1].name).localeCompare(String(b[1].name),'uk')).map(([uid,u])=>'<option value="'+esc(uid)+'">'+esc(u.name)+' · @'+esc(u.handle||'user')+'</option>').join('')}</select></label><label class="settings-check"><input id="officialAccountToggle" type="checkbox"> Позначити як офіційний акаунт</label><button class="primary" id="saveOfficialAccount" type="button">Зберегти статус</button><p id="officialAccountStatus" class="field-hint">Оберіть акаунт, щоб переглянути його поточний статус.</p></section><section class="settings-card interface-settings-card"><h3>Вигляд ВАТРИ</h3><p class="muted">Оберіть тему оформлення ВАТРИ.</p><div class="settings-grid"></div></section><section class="settings-card"><h3>Приватність сторінки</h3><p class="muted">Ці параметри визначають поведінку інтерфейсу ВАТРИ. Приватні поля не показуються іншим без Вашого дозволу. Обмеження доступу додатково перевіряються на сервері.</p><div class="settings-grid"><label>Хто бачить сторінку<select name="profileVisibility"><option value="public" ${p.profileVisibility!=='private'?'selected':''}>Усі користувачі</option><option value="private" ${p.profileVisibility==='private'?'selected':''}>Закрита — лише друзі</option></select></label><label>Чи можна знайти мене в пошуку<select name="searchable"><option value="yes" ${p.searchable!==false?'selected':''}>Так, показувати в пошуку</option><option value="no" ${p.searchable===false?'selected':''}>Ні, не показувати</option></select></label><label>Дата народження у профілі<select name="birthdayVisibility"><option value="private" ${(p.birthdayVisibility||'private')==='private'?'selected':''}>Лише для себе</option><option value="friends" ${p.birthdayVisibility==='friends'?'selected':''}>Для друзів</option><option value="public" ${p.birthdayVisibility==='public'?'selected':''}>Для всіх</option></select></label><label>Місто у профілі<select name="cityVisibility"><option value="private" ${(p.cityVisibility||'private')==='private'?'selected':''}>Лише для себе</option><option value="friends" ${p.cityVisibility==='friends'?'selected':''}>Для друзів</option><option value="public" ${p.cityVisibility==='public'?'selected':''}>Для всіх</option></select></label><label>Місце проживання<select name="locationVisibility"><option value="private" ${(p.locationVisibility||'private')==='private'?'selected':''}>Лише для себе</option><option value="friends" ${p.locationVisibility==='friends'?'selected':''}>Для друзів</option><option value="public" ${p.locationVisibility==='public'?'selected':''}>Для всіх</option></select></label><label>Номер телефону<select name="phoneVisibility"><option value="private" ${(p.phoneVisibility||'private')==='private'?'selected':''}>Лише для себе</option><option value="friends" ${p.phoneVisibility==='friends'?'selected':''}>Для друзів</option><option value="public" ${p.phoneVisibility==='public'?'selected':''}>Для всіх</option></select><small>Показується лише якщо номер підтверджений і доступний у профілі.</small></label><label>Місце роботи<select name="workplaceVisibility"><option value="private" ${(p.workplaceVisibility||'private')==='private'?'selected':''}>Лише для себе</option><option value="friends" ${p.workplaceVisibility==='friends'?'selected':''}>Для друзів</option><option value="public" ${p.workplaceVisibility==='public'?'selected':''}>Для всіх</option></select></label><label>Місце навчання<select name="educationVisibility"><option value="private" ${(p.educationVisibility||'private')==='private'?'selected':''}>Лише для себе</option><option value="friends" ${p.educationVisibility==='friends'?'selected':''}>Для друзів</option><option value="public" ${p.educationVisibility==='public'?'selected':''}>Для всіх</option></select></label><label>Рідне місто<select name="hometownVisibility"><option value="private" ${(p.hometownVisibility||'private')==='private'?'selected':''}>Лише для себе</option><option value="friends" ${p.hometownVisibility==='friends'?'selected':''}>Для друзів</option><option value="public" ${p.hometownVisibility==='public'?'selected':''}>Для всіх</option></select></label><label>Опис профілю<select name="bioVisibility">${vatraPrivacyOptions(p.bioVisibility,'public')}</select></label><label>Статус<select name="statusVisibility">${vatraPrivacyOptions(p.statusVisibility,'public')}</select></label><label>Вебсайт<select name="websiteVisibility">${vatraPrivacyOptions(p.websiteVisibility,'public')}</select></label></div><label class="settings-check"><input type="checkbox" name="allowMessages" ${p.allowMessages!==false?'checked':''}> Дозволяти іншим користувачам писати мені</label></section><div class="settings-savebar"><span role="status" aria-live="polite">Після змін натисніть «Зберегти налаштування».</span><button class="primary" type="submit">Зберегти налаштування</button></div><p id="settingsError" class="auth-error" role="alert"></p></form><section class="settings-card blocked-users-card"><h3>Заблоковані користувачі</h3><p class="muted">Їхні дописи приховані, а повідомлення з ними зупинені.</p><div id="blockedUsersList"></div></section><section class="settings-card settings-legal-card"><h3>Документи ВАТРИ</h3><p class="muted">Переглядайте правила спільноти, умови користування та інформацію про обробку персональних даних.</p><div class="settings-legal-links"><a class="pill" href="#rules" data-legal-open="rules">Правила ВАТРИ</a><a class="pill" href="#privacy" data-legal-open="privacy">Політика конфіденційності</a><a class="pill" href="#terms" data-legal-open="terms">Умови використання</a></div></section></section>`);vatraOrganizeSettings();enhanceProfileDatePicker($('#settingsBirthday'));renderBlockedUsersList();$('#sendPhoneVerification').onclick=async()=>{const phone=$('#settingsPhone').value.trim(),status=$('#phoneVerificationStatus'),btn=$('#sendPhoneVerification');if(!/^\+[1-9]\d{7,14}$/.test(phone)){status.textContent='Введіть номер у міжнародному форматі, наприклад +380XXXXXXXXX.';return;}btn.disabled=true;status.textContent='Надсилаємо SMS-код…';try{await updatePhoneNumber(phone);await update(ref(db,`privateUsers/${currentUser.uid}`),{pendingPhone:phone,updatedAt:Date.now()});privatePendingPhone=phone;currentProfile.pendingPhone=phone;$('#phoneVerificationWrap').hidden=false;status.textContent='Код надіслано. Перевірте SMS.';$('#confirmPhoneVerification').dataset.phone=phone;}catch(err){status.textContent=niceError(err);}finally{btn.disabled=false;}};
$('#confirmPhoneVerification').onclick=async()=>{const phone=$('#confirmPhoneVerification').dataset.phone,token=$('#phoneVerificationCode').value.trim(),status=$('#phoneVerificationStatus'),btn=$('#confirmPhoneVerification');if(!phone||!/^\d{4,8}$/.test(token)){status.textContent='Введіть код із SMS.';return;}btn.disabled=true;status.textContent='Перевіряємо код…';try{await verifyPhoneChange(phone,token);privatePhone=phone;privatePendingPhone='';currentProfile.phone=phone;currentProfile.pendingPhone='';await update(ref(db,'privateUsers/'+currentUser.uid),{dateOfBirth:privateDateOfBirth||null,phone:phone,pendingPhone:null,updatedAt:Date.now()});await set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile));await set(ref(db,'friendProfiles/'+currentUser.uid),friendProfileData(currentProfile));status.textContent='Номер підтверджено й збережено.';toastMsg('Номер телефону підтверджено.');}catch(err){status.textContent=niceError(err);}finally{btn.disabled=false;}};

get(ref(db,`admins/${currentUser.uid}`)).then(snap=>{const card=$('#officialAdminCard');if(!card)return;const isAdmin=snap.val()===true;if(isAdmin){card.hidden=false;const target=$('#officialTargetUser');if(target){target.value=currentUser.uid;$('#officialAccountToggle').checked=verifiedUsers?.[currentUser.uid]?.verified===true;$('#officialAccountStatus').textContent=$('#officialAccountToggle').checked?'Цей акаунт має офіційний статус.':'Цей акаунт поки не підтверджено.';target.onchange=()=>{const uid=target.value;$('#officialAccountToggle').checked=verifiedUsers?.[uid]?.verified===true;$('#officialAccountStatus').textContent=uid?(verifiedUsers?.[uid]?.verified===true?'Цей акаунт має офіційний статус.':'Цей акаунт поки не підтверджено.'):'Оберіть акаунт зі списку.';};}} }).catch(()=>{});
$('#saveOfficialAccount').onclick=async()=>{const targetUid=$('#officialTargetUser').value,enabled=$('#officialAccountToggle').checked,btn=$('#saveOfficialAccount'),status=$('#officialAccountStatus');if(!targetUid){status.textContent='Спочатку оберіть акаунт.';return;}btn.disabled=true;status.textContent='Зберігаємо статус…';try{await set(ref(db,`verifiedUsers/${targetUid}`),{verified:enabled,updatedAt:Date.now(),verifiedBy:currentUser.uid});status.textContent=enabled?'Офіційний статус увімкнено.':'Офіційний статус знято.';toastMsg(status.textContent);}catch(err){status.textContent='Не вдалося змінити статус. Перевірте права адміністратора.';toastMsg(niceError(err));}finally{btn.disabled=false;}};
$('#settingsAvatarFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{toastMsg('Стискаємо й зберігаємо фото…');const edited=await getImageEditor(f,'avatar');if(!edited)return;const avatarUrl=await uploadImage(edited,512,.9,'avatars');const history=Array.isArray(currentProfile.avatarHistory)?currentProfile.avatarHistory.slice():[];if(currentProfile.avatarUrl&&currentProfile.avatarUrl!==avatarUrl)history.push(currentProfile.avatarUrl);const avatarHistory=history.filter((url,i,arr)=>url&&arr.indexOf(url)===i).slice(-30);await update(ref(db,`users/${currentUser.uid}`),{avatarUrl,avatarHistory,updatedAt:Date.now()});currentProfile.avatarUrl=avatarUrl;currentProfile.avatarHistory=avatarHistory;await set(ref(db,`publicProfiles/${currentUser.uid}`),publicProfileData(currentProfile));const preview=$('#settingsAvatarPreview');preview.style.backgroundImage=`url('${avatarUrl}')`;preview.textContent='';updateIdentity();toastMsg('Аватар збережено. Попередні фото залишилися в історії профілю.');}catch(err){toastMsg(err.message||niceError(err));}finally{e.target.value='';}};$('#removeAvatar').onclick=async()=>{try{await update(ref(db,`users/${currentUser.uid}`),{avatarUrl:''});currentProfile.avatarUrl='';await set(ref(db,`publicProfiles/${currentUser.uid}`),publicProfileData(currentProfile));$('#settingsAvatarPreview').style.backgroundImage='';$('#settingsAvatarPreview').textContent=initials(currentProfile.name||'ВАТРА');updateIdentity();toastMsg('Фото прибрано.');}catch(e){toastMsg(niceError(e));}};$('#profileSettingsForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,fd=new FormData(f);const firstName=String(fd.get('firstName')||'').trim(),lastName=String(fd.get('lastName')||'').trim(),handle=String(fd.get('handle')||'').trim().replace(/^@/,''),bio=String(fd.get('bio')||'').trim(),city=String(fd.get('city')||'').trim(),location=String(fd.get('location')||'').trim(),website=String(fd.get('website')||'').trim(),workplace=String(fd.get('workplace')||'').trim(),education=String(fd.get('education')||'').trim(),hometown=String(fd.get('hometown')||'').trim(),submittedPhone=String(fd.get('phone')||'').trim(),dateOfBirth=String(fd.get('dateOfBirth')||'');if(firstName.length<2||lastName.length<2){$('#settingsError').textContent='Ім’я та прізвище мають містити щонайменше 2 символи.';return;}if((firstName+' '+lastName).length>40){$('#settingsError').textContent='Ім’я та прізвище разом мають бути не довші за 40 символів.';return;}if(!/^[\p{L}\p{N}._-]{2,24}$/u.test(handle)){ $('#settingsError').textContent='Перевірте псевдонім: 2–24 символи, літери, цифри, крапка, _ або -.';return;}if(website&&!/^https?:\/\//i.test(website)){ $('#settingsError').textContent='Посилання має починатися з https:// або http://.';return;}if(dateOfBirth){const bd=new Date(dateOfBirth+'T00:00:00'),now=new Date();if(Number.isNaN(bd.getTime())||bd>now){$('#settingsError').textContent='Перевірте дату народження.';return;}let age=now.getFullYear()-bd.getFullYear();if(now.getMonth()<bd.getMonth()||(now.getMonth()===bd.getMonth()&&now.getDate()<bd.getDate()))age--;if(age<13){$('#settingsError').textContent='ВАТРА доступна з 13 років.';return;}}const extraVisibility={};for(const spec of Object.values(VATRA_PROFILE_EXTRA_SECTIONS))for(const key of Object.keys(spec.fields))extraVisibility[key]=vatraFieldVisibility(fd.get('extraVisibility_'+key));const values={extraVisibility,bioVisibility:vatraFieldVisibility(fd.get('bioVisibility'),'public'),statusVisibility:vatraFieldVisibility(fd.get('statusVisibility'),'public'),websiteVisibility:vatraFieldVisibility(fd.get('websiteVisibility'),'public'),firstName,lastName,name:`${firstName} ${lastName}`,handle,bio:bio.slice(0,500),city,location,website,workplace:workplace.slice(0,120),education:education.slice(0,120),hometown:hometown.slice(0,80),profileVisibility:fd.get('profileVisibility')==='private'?'private':'public',searchable:fd.get('searchable')!=='no',birthdayVisibility:String(fd.get('birthdayVisibility')||'private'),birthdayPublic:(String(fd.get('birthdayVisibility')||'private')==='public'?dateOfBirth:''),cityVisibility:String(fd.get('cityVisibility')||'private'),locationVisibility:String(fd.get('locationVisibility')||'private'),phoneVisibility:String(fd.get('phoneVisibility')||'private'),workplaceVisibility:String(fd.get('workplaceVisibility')||'private'),educationVisibility:String(fd.get('educationVisibility')||'private'),hometownVisibility:String(fd.get('hometownVisibility')||'private'),allowMessages:fd.get('allowMessages')==='on',themeMode:['dark','auto'].includes(fd.get('themeMode'))?fd.get('themeMode'):'light',updatedAt:Date.now()};if(submittedPhone&&submittedPhone!==privatePhone&&!/^\+[1-9]\d{7,14}$/.test(submittedPhone)){ $('#settingsError').textContent='Введіть номер у міжнародному форматі, наприклад +380XXXXXXXXX. Після збереження його потрібно буде підтвердити SMS-кодом.';return;}const pendingPhone=submittedPhone&&submittedPhone!==privatePhone?submittedPhone:'';const privateSections={};for(const key of ['hobbies','activities','music','films','books','games','serviceNotes','lifeNotes','values','inspiration'])privateSections[key]=String(fd.get('private_'+key)||'').trim().slice(0,500);try{
 const btn=f.querySelector('[type=submit]'),errBox=f.querySelector('#settingsError'),saveNote=f.querySelector('.settings-savebar span');
 if(vatraSettingsSaving)return;
 vatraSettingsSaving=true;
 if(errBox)errBox.textContent='';
 if(saveNote){saveNote.textContent='Зберігаємо зміни…';saveNote.dataset.state='saving';}
 btn.disabled=true;btn.textContent='Зберігаємо…';
 const uid=currentUser.uid;
 const draft={...currentProfile,...values,privateSections,extraVisibility,dateOfBirth,phone:privatePhone,pendingPhone:pendingPhone};
 // Save the actual account data and the private values before claiming success.
 // A failed write keeps the editor open with the entered values intact.
 await update(ref(db,`users/${uid}`),values);
 await update(ref(db,`privateUsers/${uid}`),{dateOfBirth:dateOfBirth||null,phone:privatePhone||null,pendingPhone:pendingPhone||null,privateSections,updatedAt:values.updatedAt});
 await set(ref(db,`publicProfiles/${uid}`),publicProfileData(draft));
 await set(ref(db,`friendProfiles/${uid}`),friendProfileData(draft));
 // Read back both canonical records to ensure this click actually persisted.
 const [accountSnap,privateSnap]=await Promise.all([get(ref(db,`users/${uid}`)),get(ref(db,`privateUsers/${uid}`))]);
 const storedAccount=accountSnap.val()||{},storedPrivate=privateSnap.val()||{};
 if(storedAccount.updatedAt!==values.updatedAt||storedPrivate.updatedAt!==values.updatedAt||
    JSON.stringify(storedPrivate.privateSections||{})!==JSON.stringify(privateSections)||
    JSON.stringify(storedAccount.extraVisibility||{})!==JSON.stringify(extraVisibility)){
  throw new Error('Сервер не підтвердив збереження всіх полів. Перевірте з’єднання та повторіть натискання.');
 }
 privateProfileSections=privateSections;
 privatePendingPhone=pendingPhone;
 privateDateOfBirth=dateOfBirth;
 currentProfile={...draft};
 try{await updateProfile(currentUser,{displayName:values.name});}catch(authError){console.warn('Display name in Auth will sync later:',authError);}
 updateIdentity();
 f.dataset.vatraDirty='false';
 if(saveNote){saveNote.textContent='✓ Зміни збережені';saveNote.dataset.state='saved';}
 if(pendingPhone){const status=$('#phoneVerificationStatus');if(status)status.textContent='Номер збережено, але ще не підтверджено. Натисніть «Надіслати код на телефон».';}
 toastMsg('Усі зміни збережені в Supabase.');
}catch(err){const message=String(err?.message||'').startsWith('Сервер не підтвердив')?err.message:niceError(err);const errBox=f.querySelector('#settingsError'),saveNote=f.querySelector('.settings-savebar span');if(errBox)errBox.textContent=message;if(saveNote){saveNote.textContent='Збереження не завершилося. Перевірте помилку та спробуйте ще раз.';saveNote.dataset.state='error';}toastMsg('Не вдалося зберегти всі налаштування: '+message);console.error('[ВАТРА] Збереження профілю:',err);}finally{vatraSettingsSaving=false;const btn=f.querySelector('[type=submit]');if(btn){btn.disabled=false;btn.textContent='Зберегти налаштування';}}};}
function createGroup(){if(!authRequired())return;$('#communityError').textContent='';$('#communityForm').reset();$('#communityDialog').showModal();setTimeout(()=>$('#communityName').focus(),40);}async function editGroup(id){if(!authRequired())return;const g=groups[id];if(!g||g.ownerUid!==currentUser.uid)return toastMsg('Редагувати може лише творець спільноти.');const name=await askText('Назва спільноти',g.name||'');if(name===null)return;const description=await askText('Опис спільноти',g.description||'');if(description===null)return;if(name.trim().length<2)return toastMsg('Назва має містити щонайменше 2 символи.');try{await update(ref(db,`groups/${id}`),{name:name.trim().slice(0,60),description:description.trim().slice(0,500),updatedAt:Date.now()});toastMsg('Спільноту оновлено.');render();}catch(e){toastMsg(niceError(e));}}
async function uploadVideo(e){const f=e.target.files?.[0];if(!f)return;if(!authRequired())return;if(!f.type.startsWith('video/'))return toastMsg('Виберіть відеофайл.');if(f.size>50*1024*1024)return toastMsg('Відео має бути меншим за 50 МБ.');const text=await askText('Підпис до відео (необов’язково)','');if(text===null){e.target.value='';return;}toastMsg('Завантажуємо відео…');try{const videoUrl=await uploadMedia(f,'videos');const vref=push(ref(db,'videos'));await set(vref,{authorUid:currentUser.uid,authorName:currentProfile.name||currentUser.displayName||'Користувач ВАТРИ',authorHandle:currentProfile.handle||'user',authorAvatar:currentProfile.avatarUrl||'',text:text.slice(0,300),videoUrl,createdAt:Date.now(),mimeType:f.type});toastMsg('Відео опубліковано!');render();}catch(err){toastMsg(niceError(err));}finally{e.target.value='';}}
async function startChatWith(uid){if(!authRequired()||uid===currentUser.uid)return;if(blockedUsers[uid])return toastMsg('Спочатку розблокуй цього користувача.');if(users[uid]?.allowMessages===false)return toastMsg('Цей користувач вимкнув вхідні повідомлення.');const key=chatKey(currentUser.uid,uid);try{const snap=await get(ref(db,`chats/${key}`));if(!snap.exists())await set(ref(db,`chats/${key}`),{members:{[currentUser.uid]:true,[uid]:true},createdAt:Date.now()});await update(ref(db,`userChats/${currentUser.uid}/${key}`),{otherUid:uid,updatedAt:Date.now()});activeChat=uid;goPage('messages');activeChat=uid;renderMessages();}catch(e){toastMsg(niceError(e));}}
$('#communityClose').onclick=()=>$('#communityDialog').close();$('#communityCancel').onclick=()=>$('#communityDialog').close();
$('#communityForm').addEventListener('submit',async e=>{e.preventDefault();if(!authRequired())return;const form=e.currentTarget,fd=new FormData(form),name=String(fd.get('name')||'').trim(),description=String(fd.get('description')||'').trim(),btn=form.querySelector('[type=submit]');if(name.length<2){$('#communityError').textContent='Назва має містити щонайменше 2 символи.';return;}btn.disabled=true;btn.textContent='Створюємо…';let groupRef=null;try{groupRef=push(ref(db,'groups'));await set(groupRef,{name:name.slice(0,60),description:description.slice(0,500),ownerUid:currentUser.uid,createdAt:Date.now()});try{await set(ref(db,`groupMembers/${groupRef.key}/${currentUser.uid}`),true);}catch(err){await remove(groupRef);throw err;}$('#communityDialog').close();form.reset();goPage('groups');toastMsg('Спільноту створено. Ви — її творець.');}catch(err){$('#communityError').textContent=niceError(err);}finally{btn.disabled=false;btn.textContent='Створити спільноту';}});$('#authForm').addEventListener('submit',async e=>{
 e.preventDefault();const email=$('#authEmail').value.trim().toLowerCase(),password=$('#authPassword').value,name=$('#authName').value.trim(),confirmPassword=$('#authConfirmPassword').value,btn=$('#authSubmit');
 $('#authError').textContent='';$('#authError').classList.remove('success');
 if(!email||!$('#authEmail').validity.valid){$('#authError').textContent='Введіть коректну адресу електронної пошти.';$('#authEmail').focus();return;}
 if(authMode==='register'&&name.trim().split(/\s+/).length<2){$('#authError').textContent='Вкажіть ім’я та прізвище.';$('#authName').focus();return;}
 if(authMode==='register'){const dob=$('#authBirthday').value;if(!dob){$('#authError').textContent='Вкажіть дату народження: день, місяць і рік.';$('#authBirthday').focus();return;}const bd=new Date(dob+'T00:00:00'),now=new Date();let age=now.getFullYear()-bd.getFullYear();if(now.getMonth()<bd.getMonth()||(now.getMonth()===bd.getMonth()&&now.getDate()<bd.getDate()))age--;if(Number.isNaN(bd.getTime())||bd>now||age<13){$('#authError').textContent='ВАТРА доступна з 13 років. Перевірте дату народження.';$('#authBirthday').focus();return;}}
 if(authMode==='register'&&!isVatraStrongPassword(password)){$('#authError').textContent='Створіть надійний пароль: від 12 символів, мала й велика латинські літери, цифра та спецсимвол.';$('#authPassword').focus();return;}
 if(authMode==='login'&&!password){$('#authError').textContent='Введіть пароль.';$('#authPassword').focus();return;}
 if(authMode==='reset'&&password.length>0){$('#authError').textContent='Для відновлення пароля введіть лише електронну пошту.';return;}
 if(authMode==='register'&&password!==confirmPassword){$('#authError').textContent='Паролі не збігаються. Перевірте обидва поля.';$('#authConfirmPassword').focus();return;}
 const modeAtSubmit=authMode;btn.disabled=true;$('#authSwitch').disabled=true;$('#resetPassword').disabled=true;btn.textContent=modeAtSubmit==='register'?'Створюємо акаунт…':modeAtSubmit==='reset'?'Надсилаємо…':'Входимо…';
 try{
  if(modeAtSubmit==='reset'){
   await sendPasswordResetEmail(auth,email);
   $('#authError').textContent='Якщо акаунт із цією адресою існує, на неї надіслано лист для відновлення пароля.';$('#authError').classList.add('success');return;
  }
  if(modeAtSubmit==='register'){
   const parts=name.trim().split(/\s+/);const cred=await createUserWithEmailAndPassword(auth,email,password,{displayName:name,name,firstName:parts[0],lastName:parts.slice(1).join(' '),dateOfBirth:$('#authBirthday').value});
   if(!cred.session){$('#authError').textContent='Supabase очікує підтвердження email. Код має надійти на вказану адресу. Якщо він не прийшов, перевірте SMTP і журнал Authentication → Logs у Supabase; не вимикайте підтвердження для обходу помилки.';return;}
   try{await updateProfile(cred.user,{displayName:name});}catch(profileErr){console.warn('Display name update deferred:',profileErr);}
   const handle=name.toLocaleLowerCase('uk-UA').replace(/[^\p{L}\p{N}]+/gu,'.').replace(/^\.|\.$/g,'').slice(0,24)||'user';
   try{const parts=name.trim().split(/\s+/);const profile={name,firstName:parts[0],lastName:parts.slice(1).join(' '),handle,bio:'',birthdayVisibility:'private',profileVisibility:'public',searchable:true,createdAt:Date.now()};await set(ref(db,`users/${cred.user.uid}`),profile);await set(ref(db,`publicProfiles/${cred.user.uid}`),publicProfileData(profile));await set(ref(db,`privateUsers/${cred.user.uid}`),{dateOfBirth:$('#authBirthday').value,updatedAt:Date.now()});}
   catch(profileDbErr){console.warn('Profile write will be retried by auth state handler:',profileDbErr);}
  }else{
   await signInWithEmailAndPassword(auth,email,password);
  }
  authDialog.close();$('#authForm').reset();toastMsg(modeAtSubmit==='register'?'Акаунт створено. Ласкаво просимо до ВАТРИ!':'Вхід виконано. Раді бачити Вас знову!');
 }catch(err){$('#authError').textContent=niceError(err);}
 finally{btn.disabled=false;$('#authSwitch').disabled=false;$('#resetPassword').disabled=false;btn.textContent=authMode==='register'?'Створити акаунт':authMode==='reset'?'Надіслати посилання':'Увійти';}
});
$('#passwordToggle').onclick=()=>{const input=$('#authPassword'),show=input.type==='password';input.type=show?'text':'password';$('#passwordToggle').textContent=show?'Сховати':'Показати';$('#passwordToggle').setAttribute('aria-label',show?'Сховати пароль':'Показати пароль');};
$('#resetPassword').onclick=()=>openAuth('reset');
$('#authSwitch').onclick=()=>openAuth(authMode==='register'?'login':'register');$('#authButton').onclick=()=>signOut(auth).then(()=>location.replace('auth.html')).catch(e=>toastMsg(niceError(e))); $('#authButton').textContent='Вийти';$('#authClose').onclick=()=>authDialog.close();
$('#create')?.addEventListener('click',openComposer);$('#prompt')?.addEventListener('click',openComposer);$('#postNow')?.addEventListener('click',openComposer);$('#mobileCreate')?.addEventListener('click',openComposer);$('#close').onclick=()=>modal.close();$('#postText').addEventListener('input',()=>$('#count').textContent=$('#postText').value.length+' / '+MAX_POST_TEXT);$('#photoBtn').onclick=()=>{if(!authRequired())return;if(!modal.open)openComposer();$('#modalPhoto').click();};
$('#photo').onchange=async e=>{const files=[...(e.target.files||[])];if(!files.length)return;if(!authRequired())return;e.target.value='';if(!modal.open)openComposer();await selectPostPhotos(files);};
$('#modalPhoto').onchange=async e=>{const files=[...(e.target.files||[])];e.target.value='';if(!authRequired())return;await selectPostPhotos(files);};
 $('#postVisibility').addEventListener('change',event=>{
  const descriptions={public:'Допис побачать усі користувачі ВАТРИ.',friends:'Лише взаємні друзі. Фото за прямими посиланнями можуть лишатися доступними.',private:'Лише Ви. Фото за прямими посиланнями можуть лишатися доступними.'};
  $('#postAudienceHint').textContent=descriptions[event.target.value]||descriptions.public;
 });

$('#postForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!authRequired())return;
 const postError=$('#postError');if(postError){postError.hidden=true;postError.textContent='';}
 const text=$('#postText').value.trim(),pollVisible=!$('#pollComposer').hidden,entered=pollVisible?[...$('#pollOptionFields').querySelectorAll('input')].map(input=>input.value.trim()).filter(Boolean):[];
 if(entered.length===1)return toastMsg('Для опитування додайте щонайменше 2 варіанти.');
 if(!text&&!imageFiles.length&&!videoFile&&!entered.length)return toastMsg('Додайте текст, фото, відео або опитування.');
 if(text.length>MAX_POST_TEXT)return toastMsg('Максимальна довжина допису — 20 000 символів.');
 const requestedVisibility=$('#postVisibility').value;
  const postVisibility=['public','friends','private'].includes(requestedVisibility)?requestedVisibility:'public';
  const pollOptions=entered.length>=2?Object.fromEntries(entered.map((label,index)=>['option_'+(index+1),label.slice(0,80)])):null;
 const btn=e.submitter||e.currentTarget.querySelector('[type="submit"]');btn.disabled=true;btn.textContent='Публікуємо…';
 try{
  const pRef=push(ref(db,'posts')),imageUrls=[];
  for(const file of imageFiles)imageUrls.push(await uploadImage(file,1600,.84,'posts'));
   const postVideoUrl=videoFile?await uploadMedia(videoFile,'videos'):'';
  const postData={authorUid:String(currentUser.uid),authorName:currentProfile.name||currentUser.displayName||'Користувач ВАТРИ',authorHandle:currentProfile.handle||'user',authorAvatar:currentProfile.avatarUrl||'',text,imageUrl:imageUrls[0]||'',imageUrls,videoUrl:postVideoUrl,visibility:postVisibility,createdAt:Date.now(),updatedAt:Date.now()};
  if(!postData.authorUid)throw new Error('Сесія завершилася. Увійдіть у ВАТРУ ще раз.');
  if(pollOptions)postData.pollOptions=pollOptions;
  await createPost(pRef,postData);
  filter='all';query='';$('#search').value='';$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));
  postComposerUI.onPublished();goPage('feed');modal.close();imageFiles=[];videoFile=null;clearComposerPhotoPreviews();$('#photo').value='';$('#modalPhoto').value='';toastMsg('Допис опубліковано!');
 }catch(err){
  console.error('VATRA post publish failed:',err?.dbCode||err?.code||err);
  const message=niceError(err);if(postError){postError.textContent=message;postError.hidden=false;}toastMsg(message);
 }finally{btn.disabled=false;btn.textContent='Опублікувати';}
});
// Only actual navigation buttons may trigger route changes. <body data-page> is a CSS state marker, not a clickable page link.
$$('button[data-page]').forEach(b=>b.addEventListener('click',()=>goPage(b.dataset.page)));$$('.tab').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;goPage('feed');});$('#search').addEventListener('input',e=>{query=e.target.value.trim();profileAttributeSearch=null;if(query){if(page!=='explore')goPage('explore');else render();}else{if(page==='explore')render();else if(page==='saved'||page==='profile')goPage('feed');else render();}});$('#search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();goPage('explore');}});$('#moment')?.addEventListener('click',openComposer);$$('[data-action="compose"]').forEach(b=>b.addEventListener('click',openComposer));$$('[data-tag]').forEach(b=>b.addEventListener('click',()=>{query=b.dataset.tag;$('#search').value=query;goPage('feed');}));
document.addEventListener('click',async e=>{
 const avatarViewerButton=e.target.closest('[data-avatar-viewer]');if(avatarViewerButton){let photos=[];try{photos=JSON.parse(avatarViewerButton.dataset.avatarUrls||'[]');}catch{}await openAvatarViewer(avatarViewerButton.dataset.avatarViewer,photos,0);return;}
 const postPhotoButton=e.target.closest('[data-open-photo]');if(postPhotoButton){let urls=[];try{urls=JSON.parse(postPhotoButton.dataset.photoUrls||'[]');}catch{}openPostPhotoViewer(urls,Number(postPhotoButton.dataset.photoIndex)||0,postPhotoButton.dataset.openPhoto);return;}
 const profileGalleryButton=e.target.closest('[data-open-profile-gallery]');if(profileGalleryButton){let urls=[];try{urls=JSON.parse(profileGalleryButton.dataset.photoUrls||'[]');}catch{}openPostPhotoViewer(urls,Number(profileGalleryButton.dataset.photoIndex)||0,'',profileGalleryButton.dataset.openProfileGallery);return;}
 const tagButton=e.target.closest('[data-tag]');if(tagButton){query=String(tagButton.dataset.tag||'').trim();$('#search').value=query;filter='all';goPage('feed');return;}
 const editComposerPhoto=e.target.closest('[data-edit-composer-photo]');if(editComposerPhoto){const index=Number(editComposerPhoto.dataset.editComposerPhoto);if(!Number.isInteger(index)||index<0||index>=imageFiles.length)return;try{const edited=await getImageEditor(imageFiles[index],'gallery');if(edited){imageFiles[index]=edited;renderComposerPhotoPreviews();}}catch(error){toastMsg(error.message||niceError(error));}return;}
 const removeComposerPhoto=e.target.closest('[data-remove-composer-photo]');if(removeComposerPhoto){const index=Number(removeComposerPhoto.dataset.removeComposerPhoto);if(Number.isInteger(index)&&index>=0&&index<imageFiles.length){imageFiles.splice(index,1);renderComposerPhotoPreviews();const note=$('#photoNote');if(note)note.textContent=imageFiles.length?'Додано фото: '+imageFiles.length+' із 10':'';}return;}
 const deletePhotoButton=e.target.closest('[data-delete-profile-photo]');if(deletePhotoButton){await deleteProfilePhoto(Number(deletePhotoButton.dataset.deleteProfilePhoto));return;}
 const dismissGuideButton=e.target.closest('[data-onboard-dismiss]');if(dismissGuideButton){try{localStorage.setItem('vatra-guide-hidden-v1-'+currentUser.uid,'1');}catch{}renderGettingStarted();return;}
 const onboardingButton=e.target.closest('[data-onboard]');if(onboardingButton){const action=onboardingButton.dataset.onboard;if(action==='profile')goPage('profile');else if(action==='settings')goPage('settings');else if(action==='create')openComposer();else if(action==='explore')goPage('explore');else openVatraGuide();return;}
 const blockButton=e.target.closest('[data-block-user]');if(blockButton){await blockUser(blockButton.dataset.blockUser);return;}const unblockButton=e.target.closest('[data-unblock-user]');if(unblockButton){await unblockUser(unblockButton.dataset.unblockUser);return;}const reportProfile=e.target.closest('[data-report-user]');if(reportProfile){await submitReport('profile',reportProfile.dataset.reportUser);return;}const reportPost=e.target.closest('[data-report-post]');if(reportPost){await submitReport('post',reportPost.dataset.reportPost);return;}const reportComment=e.target.closest('[data-report-comment]');if(reportComment){await submitReport('comment',reportComment.dataset.reportComment+'__'+reportComment.dataset.commentId);return;}const reportGroupPost=e.target.closest('[data-report-group-post]');if(reportGroupPost){await submitReport('groupPost',reportGroupPost.dataset.reportGroupPost+'__'+reportGroupPost.dataset.postId);return;}const reportVideo=e.target.closest('[data-report-video]');if(reportVideo){await submitReport('video',reportVideo.dataset.reportVideo);return;}
 const replyButton=e.target.closest('[data-reply-comment]');if(replyButton){replyingComment={postId:replyButton.dataset.replyComment,commentId:replyButton.dataset.commentId};render();setTimeout(()=>document.querySelector('[data-reply-form="'+CSS.escape(replyingComment.commentId)+'"] input')?.focus(),20);return;}const cancelReply=e.target.closest('[data-cancel-reply]');if(cancelReply){replyingComment=null;render();return;}const notifPost=e.target.closest('[data-notification-post]');if(notifPost){const id=notifPost.dataset.notificationPost;goPage('feed');setTimeout(()=>document.getElementById('post-'+id)?.scrollIntoView({behavior:'smooth',block:'center'}),80);return;}const notifFriends=e.target.closest('[data-notification-friends]');if(notifFriends){goPage('friends');return;}const notifChat=e.target.closest('[data-notification-chat]');if(notifChat){activeChat=notifChat.dataset.notificationChat;goPage('messages');activeChat=notifChat.dataset.notificationChat;renderMessages();return;}let b=e.target.closest('[data-edit-comment]');if(b){if(!authRequired())return;const pid=b.dataset.editComment,cid=b.dataset.commentId,c=comments[pid]?.[cid];if(!c)return toastMsg('Коментар не знайдено.');if(c.uid!==currentUser.uid)return toastMsg('Можна змінювати лише власні коментарі.');const text=await askText('Редагувати коментар',c.text||'');if(text===null)return;const clean=text.trim();if(!clean)return toastMsg('Коментар не може бути порожнім.');try{await update(ref(db,'comments/'+pid+'/'+cid),{text:clean.slice(0,300),editedAt:Date.now()});toastMsg('Коментар оновлено.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-delete-comment]');if(b){if(!authRequired())return;const pid=b.dataset.deleteComment,cid=b.dataset.commentId,c=comments[pid]?.[cid],post=posts[pid];if(!c)return toastMsg('Коментар не знайдено.');if(c.uid!==currentUser.uid&&post?.authorUid!==currentUser.uid)return toastMsg('Не можна видалити чужий коментар.');if(!(await askConfirm('Видалити коментар?')))return;try{await remove(ref(db,'comments/'+pid+'/'+cid));toastMsg('Коментар видалено.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-edit-post]');if(b){editingPostId=b.dataset.editPost;editPostFiles=[];clearEditPostPreviews();render();return;}
 b=e.target.closest('[data-remove-edit-photo]');if(b){const removed=b.classList.toggle('is-removed');b.closest('.post-edit-photo')?.classList.toggle('is-removed',removed);b.setAttribute('aria-pressed',String(removed));b.textContent=removed?'↶':'×';return;}
 b=e.target.closest('[data-edit-new-post-photo]');if(b){const n=Number(b.dataset.editNewPostPhoto);if(!Number.isInteger(n)||n<0||n>=editPostFiles.length)return;try{const edited=await getImageEditor(editPostFiles[n],'gallery');if(edited){editPostFiles[n]=edited;renderEditPostPreviews(b.closest('[data-edit-post-form]'));}}catch(error){toastMsg(error.message||niceError(error));}return;}
 b=e.target.closest('[data-remove-edit-new-photo]');if(b){const n=Number(b.dataset.removeEditNewPhoto);if(Number.isInteger(n)&&n>=0&&n<editPostFiles.length){editPostFiles.splice(n,1);renderEditPostPreviews(b.closest('[data-edit-post-form]'));}return;}
 b=e.target.closest('[data-post-format]');if(b){const form=b.closest('[data-edit-post-form]'),input=form?.querySelector('textarea[name="text"]');if(!input)return;const kind=b.dataset.postFormat,start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length,selected=input.value.slice(start,end);let insert=selected;const wrappers={bold:['**','**'],italic:['_','_'],underline:['__','__'],strike:['~~','~~']};if(wrappers[kind])insert=wrappers[kind][0]+selected+wrappers[kind][1];else if(kind==='hashtag')insert=selected?(selected.startsWith('#')?selected:'#'+selected):'#';else if(kind==='quote'||kind==='list'){const prefix=kind==='quote'?'> ':'• ';insert=(selected||'Текст').split('\n').map(line=>prefix+line.replace(/^\s*(?:> |• )/, '')).join('\n');}input.setRangeText(insert,start,end,'select');input.focus();return;}
 b=e.target.closest('[data-cancel-post-edit]');if(b){editingPostId=null;editPostFiles=[];clearEditPostPreviews();render();return;}
 b=e.target.closest('[data-open-chat]');if(b){activeChat=b.dataset.openChat;editingMessageId=null;renderMessages();return;}
 b=e.target.closest('[data-delete-chat]');if(b){if(!(await askConfirm('Прибрати цей діалог зі свого списку повідомлень?')))return;try{await update(ref(db,`userChats/${currentUser.uid}/${b.dataset.deleteChat}`),{hiddenAt:Date.now()});toastMsg('Діалог прибрано зі списку. Він з’явиться знову після нового повідомлення.');}catch(err){toastMsg(niceError(err));}return;}
 b=e.target.closest('[data-remove-friend]');if(b){if(!authRequired())return;const uid=b.dataset.removeFriend;if(!(await askConfirm('Видалити цю людину з друзів в обох акаунтах?')))return;try{await removeFriendship(uid);toastMsg('Дружбу припинено для обох акаунтів.');}catch(err){toastMsg(niceError(err));}return;}
 b=e.target.closest('[data-remove-group-member]');if(b){const gid=b.dataset.removeGroupMember,uid=b.dataset.memberUid;if(groups[gid]?.ownerUid!==currentUser.uid&&!groupAdmins[gid]?.[currentUser.uid])return toastMsg('Видаляти учасників може лише творець або адміністратор.');if(!(await askConfirm('Видалити учасника зі спільноти?')))return;try{if(groupAdmins[gid]?.[uid])await remove(ref(db,`groupAdmins/${gid}/${uid}`));if(groupModerators[gid]?.[uid])await remove(ref(db,`groupModerators/${gid}/${uid}`));await remove(ref(db,`groupMembers/${gid}/${uid}`));toastMsg('Учасника видалено зі спільноти.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-toggle-group-admin]');if(b){if(groups[b.dataset.toggleGroupAdmin]?.ownerUid!==currentUser.uid&&!groupAdmins[b.dataset.toggleGroupAdmin]?.[currentUser.uid])return toastMsg('Призначати адміністраторів може лише творець або адміністратор.');const path=`groupAdmins/${b.dataset.toggleGroupAdmin}/${b.dataset.memberUid}`,wasAdmin=!!groupAdmins[b.dataset.toggleGroupAdmin]?.[b.dataset.memberUid];try{if(wasAdmin)await remove(ref(db,path));else{await set(ref(db,path),true);if(groupModerators[b.dataset.toggleGroupAdmin]?.[b.dataset.memberUid])await remove(ref(db,`groupModerators/${b.dataset.toggleGroupAdmin}/${b.dataset.memberUid}`));}toastMsg(wasAdmin?'Права адміністратора знято.':'Адміністратора призначено.');renderGroupSettings(b.dataset.toggleGroupAdmin);}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-toggle-group-moderator]');if(b){const gid=b.dataset.toggleGroupModerator,uid=b.dataset.memberUid;if(groups[gid]?.ownerUid!==currentUser.uid&&!groupAdmins[gid]?.[currentUser.uid])return toastMsg('Призначати модераторів може лише творець або адміністратор.');const path=`groupModerators/${gid}/${uid}`,wasMod=!!groupModerators[gid]?.[uid];try{if(wasMod)await remove(ref(db,path));else{await set(ref(db,`groupMembers/${gid}/${uid}`),true);await set(ref(db,path),true);if(groupAdmins[gid]?.[uid])await remove(ref(db,`groupAdmins/${gid}/${uid}`));}toastMsg(wasMod?'Права модератора знято.':'Модератора призначено.');renderGroupSettings(gid);}catch(err){toastMsg(niceError(err));}return;}
 b=e.target.closest('[data-delete-group-post]');if(b){const gid=b.dataset.deleteGroupPost,pid=b.dataset.postId;if(!(await askConfirm('Видалити цей допис спільноти?')))return;try{await remove(ref(db,`groupPosts/${gid}/${pid}`));toastMsg('Допис видалено.');}catch(err){toastMsg(niceError(err));}return;}
 b=e.target.closest('[data-edit-message]');if(b){editingMessageId=b.dataset.editMessage;renderMessages();return;}
 b=e.target.closest('[data-delete-message]');if(b){if(!(await askConfirm('Видалити повідомлення?')))return;try{const key=chatKey(currentUser.uid,activeChat);await remove(ref(db,`chats/${key}/messages/${b.dataset.deleteMessage}`));await syncChatPreview(key,activeChat);toastMsg('Повідомлення видалено.');}catch(err){toastMsg(niceError(err));}return;}
 b=e.target.closest('[data-cancel-edit]');if(b){editingMessageId=null;renderMessages();return;}
 b=e.target.closest('[data-emoji-toggle]');if(b){
  const panel=b.closest('.vatra-emoji-wrap')?.querySelector('.emoji-picker');
  if(!panel)return;
  const willOpen=panel.hidden;
  $$('.vatra-emoji-wrap .emoji-picker').forEach(other=>{other.hidden=true;other.closest('.vatra-emoji-wrap')?.querySelector('[data-emoji-toggle]')?.setAttribute('aria-expanded','false');});
  if(willOpen){
   prepareVatraEmojiPanel(panel);
   const bounds=b.getBoundingClientRect();panel.classList.toggle('vatra-emoji-align-right',window.innerWidth-bounds.left<350);
   panel.hidden=false;b.setAttribute('aria-expanded','true');
   panel.querySelector('[data-emoji-search]')?.focus();
  }
  return;
 }
 b=e.target.closest('[data-emoji-close]');if(b){
  const panel=b.closest('.emoji-picker');if(panel)panel.hidden=true;
  b.closest('.vatra-emoji-wrap')?.querySelector('[data-emoji-toggle]')?.setAttribute('aria-expanded','false');return;
 }
 b=e.target.closest('[data-emoji-category]');if(b){
  const panel=b.closest('.emoji-picker');if(!panel)return;
  panel.dataset.category=b.dataset.emojiCategory;
  const search=panel.querySelector('[data-emoji-search]');if(search)search.value='';
  renderVatraEmojiPanel(panel);return;
 }
 b=e.target.closest('[data-insert-emoji]');if(b){
  const form=b.closest('form'),input=form?.querySelector('[data-emoji-input]')||document.querySelector('#postText');
  if(!input)return;
  const emoji=b.dataset.insertEmoji||'';
  if(typeof input.setRangeText==='function')input.setRangeText(emoji,input.selectionStart??input.value.length,input.selectionEnd??input.value.length,'end');
  else input.value+=emoji;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.focus();
  const panel=b.closest('.emoji-picker');if(panel)panel.hidden=true;
  b.closest('.vatra-emoji-wrap')?.querySelector('[data-emoji-toggle]')?.setAttribute('aria-expanded','false');
  return;
 }
 b=e.target.closest('[data-view-profile]');if(b){const photoDialog=b.closest('.vatra-post-photo-viewer, .vatra-avatar-viewer');if(photoDialog?.open)photoDialog.close();const uid=b.dataset.viewProfile;if(uid===currentUser?.uid){activeProfileUid=null;goPage('profile');}else renderPublicProfile(uid);return;}b=e.target.closest('[data-friend-request]');if(b){if(!authRequired())return;const uid=b.dataset.friendRequest;try{if(!uid||uid===currentUser.uid)return;if(friends[uid])return toastMsg('Ви вже друзі.');if(friendRequests[uid]?.direction==='incoming')return toastMsg('Ця людина вже надіслала запит. Прийміть його в розділі «Друзі».');if(friendRequests[uid]?.status==='pending')return toastMsg('Запит уже надіслано.');await set(ref(db,`friendRequests/${uid}/${currentUser.uid}`),{from:currentUser.uid,to:uid,status:'pending',direction:'incoming',createdAt:Date.now()});await set(ref(db,`friendRequests/${currentUser.uid}/${uid}`),{from:currentUser.uid,to:uid,status:'pending',direction:'outgoing',createdAt:Date.now()});toastMsg('Запит у друзі надіслано.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-accept-friend]');if(b){
 if(!authRequired())return;
 const uid=b.dataset.acceptFriend,request=friendRequests[uid];
 if(!uid||!request||request.status!=='pending'||request.direction!=='incoming')return toastMsg('Цей запит уже неактуальний. Оновіть список друзів.');
 b.disabled=true;b.textContent='Додаємо…';
 try{
  if(!(await acceptFriendRequest(uid)))throw new Error('Не вдалося підтвердити взаємну дружбу.');
  // The database completes BOTH sides or rolls everything back.
  toastMsg('Запит прийнято. Ви тепер друзі в обох акаунтах.');
  if(page==='friends')renderFriends();
  else if(page==='notifications')renderNotifications();
  else if(page==='publicProfile'){friends[uid]=true;delete friendRequests[uid];if(activeProfileUid)renderPublicProfile(activeProfileUid);}
 }catch(err){toastMsg(niceError(err));b.disabled=false;b.textContent='Прийняти';}
 return;
}b=e.target.closest('[data-decline-friend]');if(b){const uid=b.dataset.declineFriend;try{await remove(ref(db,`friendRequests/${currentUser.uid}/${uid}`));await remove(ref(db,`friendRequests/${uid}/${currentUser.uid}`));toastMsg('Запит відхилено.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-poll-vote]');if(b){if(!authRequired())return;const postId=b.dataset.pollVote,option=b.dataset.option,choices=posts[postId]?.pollOptions||{};if(!Object.prototype.hasOwnProperty.call(choices,option))return toastMsg('Цей варіант опитування недоступний.');try{await set(ref(db,'pollVotes/'+postId+'/'+currentUser.uid),option);toastMsg('Ваш голос зараховано.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-like]');if(b){if(!authRequired())return;const id=b.dataset.like,path=`postLikes/${id}/${currentUser.uid}`;try{if(likes[id]?.[currentUser.uid])await remove(ref(db,path));else await set(ref(db,path),{createdAt:Date.now()});}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-save]');if(b){if(!authRequired())return;const id=b.dataset.save,path=`saved/${currentUser.uid}/${id}`,publicIndex=`postSaves/${id}/${currentUser.uid}`;try{if(saved[id]){await remove(ref(db,path));try{await remove(ref(db,publicIndex));}catch(indexError){console.warn('Save counter index unavailable:',indexError);}}else{await set(ref(db,path),true);try{await set(ref(db,publicIndex),{createdAt:Date.now()});}catch(indexError){console.warn('Save counter index unavailable:',indexError);}}}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-comment]');if(b){if(!authRequired())return;const p=posts[b.dataset.comment];if(p)p.commentOpen=!p.commentOpen;render();$(`[data-form="${CSS.escape(b.dataset.comment)}"] input`)?.focus();return;}b=e.target.closest('[data-share]');if(b){const id=b.dataset.share,url=`${location.origin}${location.pathname}#post-${encodeURIComponent(id)}`;let didShare=false;try{if(navigator.share){await navigator.share({title:'ВАТРА',text:posts[id]?.text||'Допис у ВАТРІ',url});didShare=true;}else{await navigator.clipboard.writeText(url);didShare=true;toastMsg('Посилання скопійовано.');}}catch{}if(didShare&&currentUser){try{const path=`postShares/${id}/${currentUser.uid}`,existing=await get(ref(db,path));if(!existing.exists())await set(ref(db,path),{createdAt:Date.now()});}catch(error){console.warn('Share index unavailable; apply app-data-schema.sql:',error);}}return;}b=e.target.closest('[data-delete]');if(b){if(!authRequired()||!(await askConfirm('Видалити цей допис?')))return;const id=b.dataset.delete;try{const likeIds=Object.keys(likes[id]||{}),commentIds=Object.keys(comments[id]||{});await Promise.all([...likeIds.map(uid=>remove(ref(db,`postLikes/${id}/${uid}`))),...commentIds.map(cid=>remove(ref(db,`comments/${id}/${cid}`))),remove(ref(db,`pollVotes/${id}`))]);await remove(ref(db,`posts/${id}`));toastMsg('Допис видалено.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-message-user]');if(b){startChatWith(b.dataset.messageUser);return;}b=e.target.closest('[data-join-group]');if(b){if(!authRequired())return;const id=b.dataset.joinGroup,path=`groupMembers/${id}/${currentUser.uid}`;try{if(groupMembers[id]?.[currentUser.uid]){if(groups[id]?.ownerUid===currentUser.uid)return toastMsg('Творець не може вийти зі своєї спільноти.');if(groupAdmins[id]?.[currentUser.uid])await remove(ref(db,`groupAdmins/${id}/${currentUser.uid}`));await remove(ref(db,path));}else await set(ref(db,path),true);toastMsg(groupMembers[id]?.[currentUser.uid]?'Ви вийшли зі спільноти.':'Ви приєдналися до спільноти!');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-manage-group]');if(b){openGroupSettings(b.dataset.manageGroup);return;}b=e.target.closest('[data-open-group]');if(b){renderGroupDetails(b.dataset.openGroup);return;}b=e.target.closest('[data-edit-group]');if(b){editGroup(b.dataset.editGroup);return;}b=e.target.closest('[data-delete-group]');if(b){if(groups[b.dataset.deleteGroup]?.ownerUid!==currentUser?.uid)return toastMsg('Видалити може лише творець спільноти.');if(!(await askConfirm('Видалити спільноту?')))return;const id=b.dataset.deleteGroup;try{await set(ref(db,`groupMembers/${id}/${currentUser.uid}`),true);const adminIds=Object.keys(groupAdmins[id]||{}).filter(uid=>uid!==currentUser.uid),memberIds=Object.keys(groupMembers[id]||{}).filter(uid=>uid!==currentUser.uid),postIds=Object.keys(groupPostsCache[id]||{});await Promise.all(adminIds.map(uid=>remove(ref(db,`groupAdmins/${id}/${uid}`))));await Promise.all([...memberIds.map(uid=>remove(ref(db,`groupMembers/${id}/${uid}`))),...postIds.map(pid=>remove(ref(db,`groupPosts/${id}/${pid}`)))]);await remove(ref(db,`groupMembers/${id}/${currentUser.uid}`));await remove(ref(db,`groups/${id}`));toastMsg('Спільноту видалено.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-delete-video]');if(b){if(!(await askConfirm('Видалити відео?')))return;try{await remove(ref(db,`videos/${b.dataset.deleteVideo}`));toastMsg('Відео видалено.');}catch(err){toastMsg(niceError(err));}return;}});
document.addEventListener('change',async event=>{
 const input=event.target.closest('[data-edit-post-photos]');
 if(!input)return;
 const form=input.closest('[data-edit-post-form]'),files=Array.from(input.files||[]);input.value='';
 if(!files.length||!form)return;
 const currentCount=postImages(posts[form.dataset.editPostForm]||{}).length-[...form.querySelectorAll('[data-remove-edit-photo].is-removed')].length+editPostFiles.length;
 const available=Math.max(0,10-currentCount);
 if(files.length>available)toastMsg('До одного допису можна додати не більше 10 фото.');
 for(const file of files.slice(0,available)){
  if(file.size>MAX_IMAGE){toastMsg('Фото має бути меншим за 15 МБ.');continue;}
  editPostFiles.push(file);
 }
 renderEditPostPreviews(form);
});
document.addEventListener('submit',async e=>{const replyForm=e.target.closest('[data-reply-form]');if(replyForm){e.preventDefault();if(!authRequired())return;const text=String(new FormData(replyForm).get('comment')||'').trim(),postId=replyForm.dataset.replyPost,parentId=replyForm.dataset.replyForm;if(!text)return;try{await set(push(ref(db,'comments/'+postId)),{uid:currentUser.uid,name:currentProfile.name||currentUser.displayName||'Користувач',avatarUrl:currentProfile.avatarUrl||'',text:text.slice(0,300),replyTo:parentId,createdAt:Date.now()});replyingComment=null;render();}catch(err){toastMsg(niceError(err));}return;}const postEdit=e.target.closest('[data-edit-post-form]');if(postEdit){
 e.preventDefault();const id=postEdit.dataset.editPostForm,text=String(new FormData(postEdit).get('text')||'').trim(),post=posts[id];
 if(!post)return toastMsg('Допис не знайдено.');
  const editVisibilityRaw=new FormData(postEdit).get('visibility');
  const editVisibility=['public','friends','private'].includes(editVisibilityRaw)?editVisibilityRaw:'public';
 if(text.length>MAX_POST_TEXT)return toastMsg('Максимальна довжина допису — 20 000 символів.');
 let oldUrls=[];try{oldUrls=JSON.parse(postEdit.dataset.existingImages||'[]');}catch{}
 const removed=[...postEdit.querySelectorAll('[data-remove-edit-photo].is-removed')].map(button=>Number(button.dataset.removeEditPhoto));
 const keptUrls=oldUrls.filter((url,index)=>!removed.includes(index)),addedUrls=[];
 if(keptUrls.length+editPostFiles.length>10)return toastMsg('У дописі може бути не більше 10 фотографій.');
 if(!text&&!keptUrls.length&&!editPostFiles.length&&!post.pollOptions)return toastMsg('Додайте текст, фото або опитування до допису.');
 const submit=postEdit.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='Зберігаємо…';
 try{
  for(const file of editPostFiles)addedUrls.push(await uploadImage(file,1600,.84,'posts'));
  const imageUrls=[...keptUrls,...addedUrls];
  await update(ref(db,'posts/'+id),{text,imageUrl:imageUrls[0]||'',imageUrls,visibility:editVisibility,editedAt:Date.now(),updatedAt:Date.now()});
  editingPostId=null;editPostFiles=[];clearEditPostPreviews();toastMsg('Допис оновлено.');render();
 }catch(err){toastMsg(niceError(err));}
 finally{if(submit){submit.disabled=false;submit.textContent='Зберегти зміни';}}
 return;
}const edit=e.target.closest('[data-edit-message-form]');if(edit){
 e.preventDefault();
 const text=String(new FormData(edit).get('text')||'').trim();
 if(!text)return toastMsg('Повідомлення не може бути порожнім.');
 const key=chatKey(currentUser.uid,activeChat),session=activeSecureSession;
 try{
  const path='chats/'+key+'/messages/'+edit.dataset.editMessageForm;
  const previous=(await get(ref(db,path))).val();
  if(!previous||previous.senderUid!==currentUser.uid)throw new Error('Редагувати можна лише власне повідомлення.');
  let payload={senderUid:currentUser.uid,createdAt:previous.createdAt,text,editedAt:Date.now()};
  if(previous.encrypted){
   if(!session||session.chatId!==key)throw new Error('Старе повідомлення можна змінити лише на пристрої з його ключем.');
   const encrypted=await encryptMessage(session,text,currentUser.uid,Number(previous.createdAt));
   payload={senderUid:currentUser.uid,createdAt:previous.createdAt,encrypted,editedAt:Date.now()};
  }
  await set(ref(db,path),payload);
  editingMessageId=null;
  await syncChatPreview(key,activeChat);
  void renderChatBubbles(key);
 }catch(error){toastMsg('Не вдалося зберегти повідомлення: '+niceError(error));}
 return;
}const form=e.target.closest('[data-form]');if(!form)return;e.preventDefault();if(!authRequired())return;const text=new FormData(form).get('comment').trim();if(!text)return;const id=form.dataset.form;try{await set(push(ref(db,`comments/${id}`)),{uid:currentUser.uid,name:currentProfile.name||currentUser.displayName||'Користувач',avatarUrl:currentProfile.avatarUrl||'',text,createdAt:Date.now()});if(posts[id])posts[id].commentOpen=false;render();}catch(err){toastMsg(niceError(err));}});
$('#reportCancel').onclick=()=>$('#reportDialog').close();$('#reportClose').onclick=()=>$('#reportDialog').close();$('#reportDialog').addEventListener('close',()=>{reportingTarget=null;$('#reportForm').reset();$('#reportError').textContent='';});$('#reportForm').addEventListener('submit',async e=>{e.preventDefault();if(!authRequired()||!reportingTarget)return;const fd=new FormData(e.currentTarget),target=reportingTarget,path=`reports/${currentUser.uid}/${target.type}/${target.id}`,reason=String(fd.get('reason')||''),details=String(fd.get('details')||'').trim().slice(0,500),button=e.currentTarget.querySelector('[type=submit]');button.disabled=true;button.textContent='Надсилаємо…';try{const existing=await get(ref(db,path));if(existing.exists()){toastMsg('Ви вже надсилав(-ла) скаргу на цей матеріал.');$('#reportDialog').close();return;}await set(ref(db,path),{reporterUid:currentUser.uid,targetType:target.type,targetId:target.id,reason,details,createdAt:Date.now()});$('#reportDialog').close();toastMsg('Скаргу збережено. Перегляд модератором потребує серверної черги.');}catch(err){$('#reportError').textContent=niceError(err);}finally{button.disabled=false;button.textContent='Надіслати скаргу';}});
onAuthStateChanged(auth,user=>{if(!user){location.replace('auth.html');return;}chatLiveIndex={};chatOwnedIndex={};chatIndex={};currentUser=user;startPresence();ensureIdentity(user.uid,readE2EEKey,publishE2EEKey).catch(error=>console.warn('VATRA E2EE identity not ready:',error?.code||'unavailable'));const guideKey='vatra-guide-completed-v2-'+user.uid;let locallyCompleted=false;try{locallyCompleted=localStorage.getItem(guideKey)==='1';}catch{}if(!locallyCompleted){get(ref(db,'privateUsers/'+user.uid+'/vatraGuideCompletedAt')).then(snap=>{if(snap.exists()){try{localStorage.setItem(guideKey,'1')}catch{}return;}setTimeout(()=>{if(currentUser?.uid===user.uid)openVatraGuide()},900);}).catch(()=>{setTimeout(()=>{if(currentUser?.uid===user.uid)openVatraGuide()},900);});}currentProfile={};privateProfileSections={};privateDateOfBirth='';activityReadAt=0;chatReads={};saved={};following={};blockedUsers={};activeProfileUid=null;activeChatBlocked=false;if(user){get(ref(db,`privateUsers/${user.uid}`)).then(async ps=>{privateDateOfBirth=ps.val()?.dateOfBirth||user.user_metadata?.dateOfBirth||'';privatePhone=ps.val()?.phone||user.phone||'';privatePendingPhone=ps.val()?.pendingPhone||'';privateProfileSections=ps.val()?.privateSections||{};currentProfile.privateSections=privateProfileSections;if(!ps.exists()&&privateDateOfBirth)await set(ref(db,`privateUsers/${user.uid}`),{dateOfBirth:privateDateOfBirth,updatedAt:Date.now()});currentProfile.dateOfBirth=privateDateOfBirth;currentProfile.phone=privatePhone;currentProfile.pendingPhone=privatePendingPhone;const pd=publicProfileData(currentProfile),fd=friendProfileData(currentProfile);if(JSON.stringify(users[user.uid]||{})!==JSON.stringify(pd))set(ref(db,`publicProfiles/${user.uid}`),pd).catch(()=>{});if(JSON.stringify(friendProfiles[user.uid]||{})!==JSON.stringify(fd))set(ref(db,`friendProfiles/${user.uid}`),fd).catch(()=>{});if(page==='settings'&&!$('#profileSettingsForm')?.dataset.vatraDirty)renderSettings();else if(page==='profile')renderProfile();}).catch(()=>{});listenData();get(ref(db,`users/${user.uid}`)).then(async snap=>{if(snap.exists())return;const meta=user.user_metadata||{},name=meta.name||meta.displayName||user.displayName||'Користувач ВАТРИ',handle=(meta.firstName&&meta.lastName?meta.firstName+'.'+meta.lastName:name).toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/giu,'.').slice(0,24);const profile={name,firstName:meta.firstName||name.split(' ')[0],lastName:meta.lastName||name.split(' ').slice(1).join(' '),handle,bio:'',birthdayVisibility:'private',profileVisibility:'public',searchable:true,createdAt:Date.now()};await set(ref(db,`users/${user.uid}`),profile);await set(ref(db,`publicProfiles/${user.uid}`),publicProfileData(profile));}).catch(e=>console.warn('Profile init:',e));}else{stopListeners();stopChatListener();if(groupDetailsUnsub){groupDetailsUnsub();groupDetailsUnsub=null;}posts={};likes={};comments={};postSaves={};postShares={};saved={};following={};blockedUsers={};users={};videos={};groups={};groupAdmins={};groupModerators={};chatIndex={};activeChat=null;activeProfileUid=null;activeChatBlocked=false;}updateIdentity();render();});
setTimeout(()=>{window.__vatraStarted=true;},450);


/* Functional header menus, in-app legal docs, and profile image editor. */
(()=>{
 const q=s=>document.querySelector(s);
 const text=(el,value)=>{if(el)el.textContent=value;};
 let legalSourcePromise=null,activeEdit=null;
 const photoFilters={normal:'none',vivid:'saturate(1.28) contrast(1.08)',warm:'sepia(.18) saturate(1.14)',mono:'grayscale(1)',soft:'brightness(1.06) saturate(.86)',cool:'hue-rotate(8deg) saturate(.9)'};
 function closeTopbarMenus(){
  const n=q('#notificationDropdown'),a=q('#accountDropdown');
  if(n)n.hidden=true;if(a)a.hidden=true;
  q('#notificationBell')?.setAttribute('aria-expanded','false');q('#topAvatar')?.setAttribute('aria-expanded','false');
 }
 function renderNotificationDropdown(){
  const box=q('#notificationDropdown');if(!box)return;
  if(!currentUser){box.innerHTML='<div class="topbar-popover-head"><b>Сповіщення</b></div><p class="topbar-popover-empty">Увійдіть, щоб бачити свої сповіщення.</p>';return;}
  const items=notificationItems().slice(0,7);
  const soundIsOn=currentProfile.notificationSounds!==false;
  const rows=items.map(n=>{
   const u=users[n.actorUid]||{},name=esc(u.name||'Користувач ВАТРИ'),when=timeAgo(n.createdAt);let title='',attr='';
   if(n.type==='like'){title=name+' вподобав(-ла) Ваш допис';attr='data-notification-post="'+esc(n.postId)+'"';}
   else if(n.type==='comment'){title=name+' прокоментував(-ла) допис';attr='data-notification-post="'+esc(n.postId)+'"';}
   else if(n.type==='friend'){title=name+' надіслав(-ла) запит у друзі';attr='data-notification-friends="true"';}
   else{title='Нове повідомлення від '+name;attr='data-notification-chat="'+esc(n.chatUid)+'"';}
   return '<button type="button" class="topbar-notification-row '+(n.unread?'is-unread':'')+'" '+attr+'>'+avatar(u.name||'Користувач',u.avatarUrl)+'<span><b>'+title+'</b><small>'+when+'</small></span>'+(n.unread?'<i></i>':'')+'</button>';
  }).join('');
  box.innerHTML='<div class="topbar-popover-head"><div><b>Сповіщення</b><small>'+items.filter(n=>n.unread).length+' нових</small></div><button type="button" class="text-link" data-notifications-view-all>Усі</button></div>'+(rows||'<p class="topbar-popover-empty">Поки немає сповіщень.</p>')+'<div class="vatra-sound-setting"><button type="button" data-vatra-sound-toggle aria-pressed="'+String(soundIsOn)+'">'+(soundIsOn?'♫ Звуки увімкнено':'♪ Звуки вимкнено')+'</button><small>Після першого натискання на сайті</small></div>';
 }
 function renderAccountDropdown(){
  const box=q('#accountDropdown');if(!box)return;
  const name=currentProfile.name||currentUser?.displayName||'Мій акаунт';
  box.innerHTML=currentUser
   ?'<div class="account-popover-profile">'+avatar(name,currentProfile.avatarUrl)+'<span><b>'+esc(name)+'</b><small>@'+esc(currentProfile.handle||'user')+'</small></span></div><button type="button" class="vatra-account-item" data-account-action="profile"><span class="vatra-account-item-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-3.6 3-5.5 7-5.5s6.3 1.9 7 5.5"/></svg></span><span>Мій профіль</span></button><button type="button" class="vatra-account-item" data-account-action="settings"><span class="vatra-account-item-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5v2M12 18.5v2M3.5 12h2m13 0h2M6 6l1.4 1.4m9.2 9.2L18 18m0-12-1.4 1.4m-9.2 9.2L6 18"/><circle cx="12" cy="12" r="5.3"/><circle cx="12" cy="12" r="1.8"/></svg></span><span>Налаштування</span></button><div class="vatra-account-divider" role="separator"></div><button type="button" class="vatra-account-item account-logout" data-account-action="logout"><span class="vatra-account-item-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 7l5 5-5 5M19 12H9"/></svg></span><span>Вийти з акаунта</span></button>'
   :'<button type="button" data-account-action="login">Увійти</button><button type="button" data-account-action="register">Створити акаунт</button>';
 }
 const bell=q('#notificationBell'),avatarButton=q('#topAvatar');
 bell?.addEventListener('click',event=>{
 event.preventDefault();event.stopPropagation();
 closeTopbarMenus();goPage('notifications');
});
 avatarButton?.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  const box=q('#accountDropdown'),willOpen=!!box?.hidden;closeTopbarMenus();
  if(box&&willOpen){renderAccountDropdown();box.hidden=false;avatarButton.setAttribute('aria-expanded','true');}
 });
 document.addEventListener('click',event=>{
  if(!event.target.closest('.topbar-popover')&&!event.target.closest('#notificationBell')&&!event.target.closest('#topAvatar'))closeTopbarMenus();
 });
 document.addEventListener('click',async event=>{
  const account=event.target.closest('[data-account-action]');
  if(account){
   closeTopbarMenus();const action=account.dataset.accountAction;
   if(action==='profile')goPage('profile');else if(action==='settings')goPage('settings');
   else if(action==='login')openAuth('login');else if(action==='register')openAuth('register');
   else if(action==='logout')q('#authButton')?.click();
   return;
  }
  if(event.target.closest('[data-notification-post],[data-notification-friends],[data-notification-chat]'))closeTopbarMenus();
  if(event.target.closest('[data-notifications-view-all]')){closeTopbarMenus();goPage('notifications');return;}
  const soundButton=event.target.closest('[data-vatra-sound-toggle]');
   if(soundButton&&currentUser){soundButton.disabled=true;const enable=currentProfile.notificationSounds===false;
    try{await update(ref(db,'users/'+currentUser.uid),{notificationSounds:enable});currentProfile.notificationSounds=enable;if(page==='notifications')renderNotifications();else renderNotificationDropdown();if(enable)vatraUnlockSound();}
    catch(error){soundButton.disabled=false;toastMsg(niceError(error));}return;
   }
  const legalLink=event.target.closest('[data-legal-open]');
  if(legalLink){event.preventDefault();openInAppLegal(legalLink.dataset.legalOpen);return;}
  const restore=event.target.closest('[data-restore-avatar]');
  if(restore){await restoreAvatarFromHistory(Number(restore.dataset.restoreAvatar));return;}
 });
 async function openInAppLegal(which){
  const selected=['rules','privacy','terms'].includes(which)?which:'rules';
  let dialog=q('#vatraSiteLegalDialog');
  if(!dialog){
   dialog=document.createElement('dialog');dialog.id='vatraSiteLegalDialog';dialog.className='vatra-site-legal-dialog';
   dialog.innerHTML='<div class="vatra-site-legal-head"><span class="vatra-legal-mark" aria-hidden="true">В</span><div><p class="eyebrow">ДОКУМЕНТИ ВАТРИ</p><h2>Правила та умови</h2></div><button type="button" class="vatra-site-legal-close" aria-label="Закрити">×</button></div><div class="vatra-site-legal-tabs" role="tablist"><button type="button" data-site-legal-tab="rules">Правила</button><button type="button" data-site-legal-tab="privacy">Конфіденційність</button><button type="button" data-site-legal-tab="terms">Умови</button></div><div class="vatra-site-legal-body" id="vatraSiteLegalBody"></div><div class="vatra-site-legal-actions"><button type="button" class="primary" data-site-legal-close>Зрозуміло</button></div>';
   document.body.append(dialog);
   dialog.querySelector('.vatra-site-legal-close').addEventListener('click',()=>dialog.close());
   dialog.querySelector('[data-site-legal-close]').addEventListener('click',()=>dialog.close());
   dialog.querySelectorAll('[data-site-legal-tab]').forEach(button=>button.addEventListener('click',()=>selectSiteLegal(button.dataset.siteLegalTab)));
   dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
   dialog.addEventListener('close',()=>{const body=dialog.querySelector('#vatraSiteLegalBody');if(body)body.scrollTop=0;});
  }
  const body=dialog.querySelector('#vatraSiteLegalBody');
  if(!body.dataset.loaded){
   try{
    if(!legalSourcePromise)legalSourcePromise=fetch('auth.html',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('Не вдалося завантажити документи.');return r.text();});
    const source=await legalSourcePromise,parsed=new DOMParser().parseFromString(source,'text/html');
    body.innerHTML=['rules','privacy','terms'].map(key=>{
     const article=parsed.getElementById('legal'+key.charAt(0).toUpperCase()+key.slice(1));
     return '<article id="siteLegal-'+key+'" class="site-legal-article" hidden>'+(article?article.innerHTML:'<p>Документ тимчасово недоступний.</p>')+'</article>';
    }).join('');body.dataset.loaded='1';
   }catch(error){body.innerHTML='<p class="topbar-popover-empty">Не вдалося завантажити документ. Перевірте з’єднання та повторіть спробу.</p>';body.dataset.loaded='1';}
  }
  selectSiteLegal(selected);if(!dialog.open)dialog.showModal();body.scrollTop=0;
 }
 function selectSiteLegal(key){
  const selected=['rules','privacy','terms'].includes(key)?key:'rules',dialog=q('#vatraSiteLegalDialog');if(!dialog)return;
  dialog.querySelectorAll('.site-legal-article').forEach(article=>{const active=article.id==='siteLegal-'+selected;article.hidden=!active;article.classList.toggle('is-active',active);});
  dialog.querySelectorAll('[data-site-legal-tab]').forEach(button=>button.classList.toggle('active',button.dataset.siteLegalTab===selected));
  const body=dialog.querySelector('#vatraSiteLegalBody');if(body)body.scrollTop=0;
 }
 async function restoreAvatarFromHistory(index){
  if(!authRequired())return;
  const history=Array.isArray(currentProfile.avatarHistory)?currentProfile.avatarHistory.slice():[],selected=history[index];
  if(!selected)return toastMsg('Це фото вже недоступне.');
  try{
   const old=currentProfile.avatarUrl;history.splice(index,1);if(old&&old!==selected)history.push(old);
   const avatarHistory=history.filter((url,i,arr)=>url&&arr.indexOf(url)===i).slice(-30);
   await update(ref(db,'users/'+currentUser.uid),{avatarUrl:selected,avatarHistory});
   currentProfile.avatarUrl=selected;currentProfile.avatarHistory=avatarHistory;
   await set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile));
   updateIdentity();render();toastMsg('Попереднє фото повернуто в профіль.');
  }catch(error){toastMsg(niceError(error));}
 }
 
/* Editing an existing avatar uses the same studio, then the existing cloud save. */
async function openPhotoEditor(file,target){
 if(!file||!file.type?.startsWith('image/'))return toastMsg('Оберіть зображення.');
 if(!authRequired())return;
 try{
  const edited=await getImageEditor(file,target);
  if(!edited)return;
  if(target==='avatar'){
   toastMsg('Зберігаємо фотографію профілю…');
   const avatarUrl=await uploadImage(edited,512,.9,'avatars');
   const history=Array.isArray(currentProfile.avatarHistory)?currentProfile.avatarHistory.slice():[];
   if(currentProfile.avatarUrl&&currentProfile.avatarUrl!==avatarUrl)history.push(currentProfile.avatarUrl);
   const avatarHistory=history.filter((url,index,arr)=>url&&arr.indexOf(url)===index).slice(-30);
   await update(ref(db,'users/'+currentUser.uid),{avatarUrl,avatarHistory});
   currentProfile.avatarUrl=avatarUrl;currentProfile.avatarHistory=avatarHistory;
   await set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile));
   updateIdentity();render();toastMsg('Фото профілю збережено.');
  }else if(target==='cover'){
   toastMsg('Зберігаємо обкладинку…');
   const coverUrl=await uploadImage(edited,1600,.9,'covers');
   await update(ref(db,'users/'+currentUser.uid),{coverUrl});
   currentProfile.coverUrl=coverUrl;
   await set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile));
   render();toastMsg('Обкладинку збережено.');
  }
 }catch(error){toastMsg(error?.message||niceError(error));}
}
 /* Avatar controls use existing Supabase profile fields and the existing image editor. */
document.addEventListener('click',async event=>{
 const toggle=event.target.closest('[data-avatar-menu-toggle]');
 if(toggle){
  event.preventDefault();
  const wrap=toggle.closest('.vatra-avatar-hover-wrap'),opened=!wrap?.classList.contains('is-open');
  wrap?.classList.toggle('is-open',opened);
  toggle.setAttribute('aria-expanded',String(opened));
  return;
 }
 const actionButton=event.target.closest('[data-avatar-photo-action]');
 if(actionButton){
  event.preventDefault();
  if(!currentUser||document.body.dataset.page!=='profile'||actionButton.disabled)return;
  const action=actionButton.dataset.avatarPhotoAction;
  if(action==='change'){
   document.getElementById('avatarUpload')?.click();
   return;
  }
  if(action==='edit'){
   const url=String(currentProfile.avatarUrl||'');
   if(!url)return toastMsg('Спочатку додайте фото профілю.');
   actionButton.disabled=true;
   try{
    const response=await fetch(url,{mode:'cors'});
    if(!response.ok)throw new Error('Сервер не надав поточне фото.');
    const blob=await response.blob();
    if(!blob.type.startsWith('image/'))throw new Error('Завантажено не зображення.');
    const file=new File([blob],'avatar-edit.jpg',{type:blob.type,lastModified:Date.now()});
    openPhotoEditor(file,'avatar');
   }catch(error){toastMsg('Не вдалося відкрити фото в редакторі: '+(error?.message||'спробуйте змінити фотографію.'));}
   finally{if(actionButton.isConnected)actionButton.disabled=false;}
   return;
  }
  if(action==='remove'){
   if(!currentProfile.avatarUrl)return toastMsg('Фото профілю вже відсутнє.');
   if(!(await askConfirm('Видалити поточну фотографію профілю?')))return;
   actionButton.disabled=true;
   try{
    await update(ref(db,'users/'+currentUser.uid),{avatarUrl:'',updatedAt:Date.now()});
    currentProfile.avatarUrl='';
    await set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile));
    updateIdentity();render();
    toastMsg('Фотографію профілю видалено.');
   }catch(error){toastMsg(niceError(error));}
   finally{if(actionButton.isConnected)actionButton.disabled=false;}
   return;
  }
 }
 if(!event.target.closest('.vatra-avatar-hover-wrap')){
  const wrap=document.getElementById('vatraAvatarWrap');
  wrap?.classList.remove('is-open');
  wrap?.querySelector('[data-avatar-menu-toggle]')?.setAttribute('aria-expanded','false');
 }
});
document.addEventListener('change',event=>{
  const input=event.target;if(!input||!input.id)return;
  const map={avatarUpload:'avatar',settingsAvatarFile:'avatar'},target=map[input.id];
  if(!target||!input.files||!input.files[0])return;
  const file=input.files[0];event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();input.value='';openPhotoEditor(file,target);
 },true);
 window.addEventListener('keydown',event=>{if(event.key==='Escape')closeTopbarMenus();});
})();

