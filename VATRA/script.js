import { ensureIdentity, prepareSession, encryptMessage, decryptMessage, formatFingerprint } from './vatra-e2ee.js?v=2';
import { setupNavigation } from './navigation.js?v=20261030-21';
import { initializeApp, getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail, getDatabase, ref, push, createPost, set, update, onValue, remove, get, uploadMedia, updatePhoneNumber, verifyPhoneChange } from './vatra-backend.js?v=20261030-1';

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
 $('.vatra-emoji-wrap .emoji-picker').forEach(panel=>{panel.hidden=true;panel.closest('.vatra-emoji-wrap')?.querySelector('[data-emoji-toggle]')?.setAttribute('aria-expanded','false');});
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 $('.vatra-emoji-wrap .emoji-picker').forEach(panel=>{panel.hidden=true;panel.closest('.vatra-emoji-wrap')?.querySelector('[data-emoji-toggle]')?.setAttribute('aria-expanded','false');});
});
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function localISODate(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
function initials(n='ВАТРА'){return n.trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase('uk-UA')||'В';}
function askConfirm(message){return new Promise(resolve=>{const d=$('#vatraConfirmDialog');$('#vatraConfirmMessage').textContent=message;const yes=$('#vatraConfirmYes'),no=$('#vatraConfirmNo');yes.onclick=()=>{d.close();resolve(true)};no.onclick=()=>{d.close();resolve(false)};d.addEventListener('cancel',()=>resolve(false),{once:true});d.showModal();});}
function askText(title,initial=''){return new Promise(resolve=>{const d=$('#vatraTextDialog'),input=$('#vatraTextInput');$('#vatraTextTitle').textContent=title;$('#vatraTextLabel').textContent=title;input.value=initial||'';const yes=$('#vatraTextYes'),no=$('#vatraTextNo');yes.onclick=()=>{const value=input.value.trim();d.close();resolve(value)};no.onclick=()=>{d.close();resolve(null)};d.addEventListener('cancel',()=>resolve(null),{once:true});d.showModal();input.focus();input.select();});}
function toastMsg(s){toast.textContent=s;toast.classList.add('show');clearTimeout(window.vatraToast);window.vatraToast=setTimeout(()=>toast.classList.remove('show'),3600);}
window.addEventListener('unhandledrejection',event=>{console.error('Unhandled application operation:',event.reason);try{toastMsg(niceError(event.reason));}catch{}});
window.addEventListener('error',event=>{if(!event.error)return;console.error('Application runtime error:',event.error);try{toastMsg('Сталася помилка. Спробуйте ще раз або оновіть сторінку.');}catch{}});

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

function niceError(e){const c=e?.code||'';if(c==='SCHEMA_NOT_READY')return 'База ВАТРИ ще не налаштована повністю. У правильному Supabase-проєкті виконайте актуальний файл VATRA OLD/app-data-schema.sql.';if(c==='PERMISSION_DENIED')return 'Supabase відхилив запис через правила доступу (RLS). Перевірте SQL-схему app_data та політики доступу в тому самому проєкті Supabase.'+(e?.dbCode?' Код: '+String(e.dbCode).replace(/[^A-Za-z0-9_-]/g,'').slice(0,24)+'.':'');if(c==='DATABASE_ERROR')return 'Не вдалося зберегти дані ВАТРИ'+(e?.dbCode?' (код '+String(e.dbCode).replace(/[^A-Za-z0-9_-]/g,'').slice(0,24)+')':'')+'. Спробуйте ще раз; якщо повториться, надішліть цей код розробнику.';if(c==='NETWORK_ERROR')return 'Немає з’єднання із сервером ВАТРИ. Перевірте інтернет і спробуйте ще раз.';return ({'auth/no-session':'Сесія завершилася. Увійдіть до ВАТРИ ще раз.','auth/author-mismatch':'Не вдалося підтвердити власника допису. Оновіть сторінку та увійдіть у свій акаунт знову.','auth/email-already-in-use':'Ця електронна пошта вже зареєстрована. Спробуйте увійти.','auth/invalid-email':'Введіть коректну адресу електронної пошти.','auth/weak-password':'Створіть пароль завдовжки щонайменше 12 символів (краще 16+), із великими й малими латинськими літерами, цифрою та спецсимволом.','auth/invalid-credential':'Неправильна електронна пошта або пароль.','auth/invalid-login-credentials':'Неправильна електронна пошта або пароль.','auth/user-not-found':'Акаунт із такою адресою не знайдено.','auth/wrong-password':'Неправильний пароль.','auth/too-many-requests':'Забагато спроб входу. Зачекайте й спробуйте пізніше.','auth/network-request-failed':'Не вдалося з’єднатися із сервером. Перевірте інтернет.','auth/operation-not-allowed':'Вхід через email вимкнений. У налаштуваннях авторизації увімкніть вхід через email і пароль.','auth/unauthorized-domain':'Цей домен не дозволений у налаштуваннях авторизації для цього домену.','auth/user-disabled':'Цей акаунт вимкнено. Зверніться до підтримки.','PERMISSION_DENIED':'Запит відхилено правилами доступу до бази даних.'})[c]||'Не вдалося виконати дію. Спробуйте ще раз.';}
function openAuth(mode='login'){location.href=mode==='register'?'auth.html?mode=register':mode==='reset'?'auth.html?mode=reset':'auth.html';}
function publicProfileData(p={}){const out={name:String(p.name||'Користувач ВАТРИ').slice(0,40),firstName:String(p.firstName||'').slice(0,40),lastName:String(p.lastName||'').slice(0,40),handle:String(p.handle||'user').slice(0,24),bio:String(p.bio||'').slice(0,500),status:String(p.status||'').slice(0,100),avatarUrl:String(p.avatarUrl||''),avatarHistory:p.profileVisibility==='private'?[]:(Array.isArray(p.avatarHistory)?p.avatarHistory.filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)).slice(-30):[]),isOnline:p.isOnline===true,lastSeenAt:Number(p.lastSeenAt)||0,profilePhotos:p.profileVisibility==='private'?[]:(Array.isArray(p.profilePhotos)?p.profilePhotos.filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)).slice(-40):[]),profileVisibility:p.profileVisibility==='private'?'private':'public',searchable:p.searchable!==false,birthdayVisibility:String(p.birthdayVisibility||'private'),cityVisibility:String(p.cityVisibility||'private'),locationVisibility:String(p.locationVisibility||'private'),phoneVisibility:String(p.phoneVisibility||'private'),workplaceVisibility:String(p.workplaceVisibility||'private'),educationVisibility:String(p.educationVisibility||'private'),hometownVisibility:String(p.hometownVisibility||'private'),allowMessages:p.allowMessages!==false,createdAt:Number(p.createdAt)||0,updatedAt:Number(p.updatedAt)||Number(p.createdAt)||0};if(p.birthdayVisibility==='public'&&p.dateOfBirth)out.birthdayPublic=String(p.dateOfBirth);if(p.cityVisibility==='public'&&p.city)out.city=String(p.city).slice(0,80);if(p.locationVisibility==='public'&&p.location)out.location=String(p.location).slice(0,120);if(p.phoneVisibility==='public'&&p.phone)out.phone=String(p.phone).slice(0,24);if(p.website)out.website=String(p.website).slice(0,180);if(p.workplace&&p.workplaceVisibility==='public')out.workplace=String(p.workplace).slice(0,120);if(p.education&&p.educationVisibility==='public')out.education=String(p.education).slice(0,120);if(p.hometown&&p.hometownVisibility==='public')out.hometown=String(p.hometown).slice(0,80);return out;}
function friendProfileData(p={}){const out={updatedAt:Number(p.updatedAt)||Number(p.createdAt)||0,isOnline:p.isOnline===true,lastSeenAt:Number(p.lastSeenAt)||0,avatarHistory:Array.isArray(p.avatarHistory)?p.avatarHistory.filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)).slice(-30):[]};if(p.status)out.status=String(p.status).slice(0,100);if(p.birthdayVisibility==='friends'&&p.dateOfBirth)out.birthdayPublic=String(p.dateOfBirth);if(p.cityVisibility==='friends'&&p.city)out.city=String(p.city).slice(0,80);if(p.locationVisibility==='friends'&&p.location)out.location=String(p.location).slice(0,120);if(p.phoneVisibility==='friends'&&p.phone)out.phone=String(p.phone).slice(0,24);if(p.workplaceVisibility==='friends'&&p.workplace)out.workplace=String(p.workplace).slice(0,120);if(p.educationVisibility==='friends'&&p.education)out.education=String(p.education).slice(0,120);if(p.hometownVisibility==='friends'&&p.hometown)out.hometown=String(p.hometown).slice(0,80);return out;}

function watch(path,cb){let lastErrorSignature='';return onValue(ref(db,path),s=>{lastErrorSignature='';cb(s.val()||{});},err=>{console.error('Database read failed:',path,err);const signature=String(err?.code||'')+'|'+niceError(err);if(signature!==lastErrorSignature){lastErrorSignature=signature;toastMsg(`Не вдалося завантажити дані (${path}): ${niceError(err)}`);}});}
function stopListeners(){unsubscribers.forEach(fn=>fn());unsubscribers=[];}
function renderLoadingSkeletons(){if(!feed)return;$('#empty').hidden=true;feed.innerHTML='<div class="vatra-skeleton" aria-label="Завантаження новин"><div class="vatra-skeleton-head"><span class="vatra-skeleton-avatar"></span><div class="vatra-skeleton-lines"><span class="vatra-skeleton-line medium"></span><span class="vatra-skeleton-line short"></span></div></div><span class="vatra-skeleton-line" style="margin-top:18px;width:94%"></span><span class="vatra-skeleton-line medium" style="margin-top:9px"></span><div class="vatra-skeleton-block"></div></div>'.repeat(3);}
let initialLoaded=new Set(),initialDataReady=false;
function markInitialLoaded(key){initialLoaded.add(key);if(['publicProfiles','users','posts','friends','groups'].every(k=>initialLoaded.has(k))&&!initialDataReady){initialDataReady=true;render();}}
function listenData(){stopListeners();if(!currentUser)return;initialLoaded=new Set();initialDataReady=false;renderLoadingSkeletons();window.setTimeout(()=>{if(!initialDataReady){initialDataReady=true;render();toastMsg('Деякі дані ще не завантажилися. Перевірте з’єднання й доступ до таблиці app_data в Supabase.');}},6500);
 unsubscribers.push(watch('verifiedUsers',v=>{verifiedUsers=v||{};if(page==='feed'||page==='profile'||page==='publicProfile'||page==='friends'||page==='explore'||page==='groups')render();}));
 unsubscribers.push(watch('publicProfiles',v=>{users=v;markInitialLoaded('publicProfiles');updateIdentity();render();}));
 unsubscribers.push(watch('friendProfiles',v=>{friendProfiles=v||{};if(page==='publicProfile')render();}));
 unsubscribers.push(watch(`users/${currentUser.uid}`,v=>{markInitialLoaded('users');const profile=v||{};currentProfile={...profile,privateSections:privateProfileSections,dateOfBirth:privateDateOfBirth,phone:privatePhone,pendingPhone:privatePendingPhone,lastSeenAt:Number(users[currentUser.uid]?.lastSeenAt)||Number(profile.lastSeenAt)||0,isOnline:users[currentUser.uid]?.isOnline===true};updateIdentity();const publicData=publicProfileData(currentProfile);if(JSON.stringify(users[currentUser.uid]||{})!==JSON.stringify(publicData))set(ref(db,`publicProfiles/${currentUser.uid}`),publicData).catch(err=>console.warn('Profile sync failed:',err));const friendData=friendProfileData(currentProfile);if(JSON.stringify(friendProfiles[currentUser.uid]||{})!==JSON.stringify(friendData))set(ref(db,`friendProfiles/${currentUser.uid}`),friendData).catch(err=>console.warn('Friend profile sync failed:',err));if(page==='settings'||page==='profile')render();else renderGettingStarted();}));
 unsubscribers.push(watch('posts',v=>{posts=v;markInitialLoaded('posts');if(page==='feed'||page==='saved'||page==='profile'||page==='notifications')render();updateNotificationBadges();}));unsubscribers.push(watch('postLikes',v=>{likes=v;if(page==='feed'||page==='saved'||page==='profile'||page==='notifications')render();updateNotificationBadges();}));unsubscribers.push(watch('postSaves',v=>{postSaves=v||{};if(page==='feed'||page==='saved'||page==='profile')render();}));unsubscribers.push(watch('postShares',v=>{postShares=v||{};if(page==='feed'||page==='saved'||page==='profile')render();}));unsubscribers.push(watch('comments',v=>{comments=v;if(page==='feed'||page==='saved'||page==='profile'||page==='notifications')render();updateNotificationBadges();}));unsubscribers.push(watch('pollVotes',v=>{pollVotes=v||{};if(page==='feed'||page==='saved'||page==='profile')render();}));
 unsubscribers.push(watch(`saved/${currentUser.uid}`,v=>{saved=v;Object.keys(saved||{}).forEach(id=>{if(!postSaves[id]?.[currentUser.uid])set(ref(db,`postSaves/${id}/${currentUser.uid}`),{createdAt:Date.now()}).catch(error=>console.warn('Save counter index unavailable; apply app-data-schema.sql:',error));});if(page==='feed'||page==='saved'||page==='profile')render();}));unsubscribers.push(watch(`following/${currentUser.uid}`,v=>{following=v;if(page==='feed'||page==='explore'||page==='profile')render();}));unsubscribers.push(watch('videos',v=>{videos=v; if(page==='videos')render();}));unsubscribers.push(watch('groups',v=>{groups=v;markInitialLoaded('groups');if(page==='groups'||page==='groupSettings')render();}));unsubscribers.push(watch('groupAdmins',v=>{groupAdmins=v;if(page==='groups'||page==='groupSettings')render();}));unsubscribers.push(watch('groupModerators',v=>{groupModerators=v||{};if(page==='groups'||page==='groupSettings')render();}));unsubscribers.push(watch(`groupMembers`,v=>{groupMembers=v;if(page==='groups'||page==='groupSettings'||page==='feed'||page==='saved'||page==='profile')render();}));unsubscribers.push(watch('groupPosts',v=>{groupPostsCache=v||{};if(page==='feed'||page==='saved'||page==='profile')render();}));unsubscribers.push(watch(`friendRequests/${currentUser.uid}`,v=>{friendRequests=v; if(page==='explore'||page==='friends'||page==='notifications')render();updateNotificationBadges();}));unsubscribers.push(watch(`friends/${currentUser.uid}`,v=>{friends=v;markInitialLoaded('friends');if(page==='explore'||page==='friends'||page==='profile')render();else renderGettingStarted();}));unsubscribers.push(watch(`userChats/${currentUser.uid}`,v=>{
 chatOwnedIndex=v||{};rebuildVisibleChatIndex();
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
   lastMessage:last?{text:last.encrypted?'🔒 Зашифроване повідомлення':String(last.text||'').slice(0,120),senderUid:last.senderUid,createdAt:last.createdAt}:null};
 }
 chatLiveIndex=live;rebuildVisibleChatIndex();
 if((page==='messages'&&!activeChat)||page==='notifications')render();
 updateNotificationBadges();
}));unsubscribers.push(watch('activityReadAt/'+currentUser.uid,v=>{activityReadAt=Number(v)||0;if(page==='notifications')renderNotifications();updateNotificationBadges();}));unsubscribers.push(watch('chatReads/'+currentUser.uid,v=>{chatReads=v||{};if(page==='notifications')renderNotifications();updateNotificationBadges();}));unsubscribers.push(watch(`blockedUsers/${currentUser.uid}`,v=>{blockedUsers=v||{};if(page==='publicProfile'&&activeProfileUid)renderPublicProfile(activeProfileUid);else if(['feed','saved','profile','explore','messages','notifications','groups','videos','friends','settings'].includes(page))render();}));
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
function profilePresenceMarkup(profile={},isSelf=false){const stamp=Number(profile.lastSeenAt)||0,online=isSelf||(profile.isOnline===true&&stamp>0&&Date.now()-stamp<120000);if(online)return '<span class="vatra-profile-presence is-online"><i></i>Онлайн</span>';if(!stamp)return '<span class="vatra-profile-presence"><i></i>Ще не заходив(-ла)</span>';const date=new Date(stamp),now=new Date(),time=date.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'}),sameDay=date.toDateString()===now.toDateString(),yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1).toDateString()===date.toDateString(),label=sameDay?'сьогодні о '+time:yesterday?'вчора о '+time:date.toLocaleDateString('uk-UA',{day:'numeric',month:'short',year:date.getFullYear()===now.getFullYear()?undefined:'numeric'})+' о '+time;return '<span class="vatra-profile-presence"><i></i>Був(-ла) в мережі '+esc(label)+'</span>';}
function applyUserPreferences(profile={}){const root=document.documentElement,body=document.body,scale=profile.fontScale==='large'?'large':'normal',density=profile.contentDensity==='compact'?'compact':'comfortable',accent=({blue:'#0757f5',teal:'#087f83',violet:'#7255d8'})[profile.accentColor]||'#0757f5';body.dataset.vatraFontScale=scale;body.dataset.vatraDensity=density;body.dataset.vatraReduceMotion=profile.reduceMotion===true?'true':'false';root.style.setProperty('--vatra-user-accent',accent);root.style.setProperty('--v-blue',accent);root.style.setProperty('--v-blue-hover',accent);root.style.setProperty('--blue',accent);}
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
  return '<div class="comment '+(c.replyTo?'comment-reply':'')+'">'+context+'<div class="comment-main">'+authorLink+'<div class="comment-body"><div class="comment-copy">'+nameLink+' <span>'+esc(c.text)+'</span>'+(c.editedAt?' · змінено':'')+'</div><div class="comment-actions">'+actions+'</div></div></div>'+form+'</div>';
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
function renderPostImages(p){const urls=postImages(p);if(!urls.length)return '';return '<div class="post-photo-grid count-'+Math.min(urls.length,4)+'">'+urls.map((url,index)=>'<button type="button" class="post-photo-item" data-open-photo="'+esc(p.id)+'" data-photo-urls="'+esc(JSON.stringify(urls))+'" data-photo-index="'+index+'" aria-label="Відкрити фото '+(index+1)+' з '+urls.length+'"><img src="'+esc(url)+'" alt="Фото до допису '+(index+1)+'" loading="lazy" decoding="async"></button>').join('')+'</div>';}
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
  dialog.innerHTML='<div class="vatra-media-viewer-shell"><header class="vatra-media-viewer-topbar"><div class="vatra-media-viewer-brand"><button type="button" class="vatra-viewer-close" aria-label="Закрити">×</button><span class="vatra-viewer-mark">В</span><b>ВАТРА</b></div><div class="vatra-media-viewer-tools"><button type="button" data-viewer-zoom="-1" aria-label="Зменшити">−</button><output data-viewer-zoom-value>100%</output><button type="button" data-viewer-zoom="1" aria-label="Збільшити">＋</button><button type="button" data-viewer-fullscreen aria-label="На весь екран">⛶</button></div></header><div class="vatra-media-viewer-layout"><main class="vatra-media-viewer-stage"><button type="button" class="vatra-media-viewer-step prev" data-post-photo-step="-1" '+(photos.length<2?'disabled':'')+' aria-label="Попереднє фото">‹</button><img class="vatra-media-viewer-image" src="'+esc(photos[index])+'" alt="Фото '+(index+1)+' з '+photos.length+'"><button type="button" class="vatra-media-viewer-step next" data-post-photo-step="1" '+(photos.length<2?'disabled':'')+' aria-label="Наступне фото">›</button><div class="vatra-media-viewer-counter">'+(index+1)+' / '+photos.length+'</div></main><aside class="vatra-media-viewer-side"><div class="vatra-media-viewer-post-head">'+avatar(name,u.avatarUrl)+'<div><button type="button" class="comment-author-name" '+((p?.authorUid||ownerUid)?'data-view-profile="'+esc(p?.authorUid||ownerUid)+'"':'')+'>'+esc(name)+'</button><small>@'+esc(handle)+' · '+(p?.createdAt?timeAgo(p.createdAt):'Фото профілю')+'</small></div></div>'+(p?.text?'<p class="vatra-media-viewer-caption">'+safeText(p.text)+'</p>':'<p class="vatra-media-viewer-caption">'+(p?'Фото до допису':'Фото профілю')+'</p>')+(postId?'<div class="vatra-media-viewer-context"><span>'+Object.keys(likes[postId]||{}).length+' вподобань</span><span>'+cs.length+' коментарів</span></div><section class="vatra-media-viewer-comments"><h3>Коментарі</h3><div class="vatra-media-viewer-comment-list">'+renderComments(p,cs)+'</div><form class="vatra-media-viewer-comment-form" data-media-comment="'+esc(postId)+'">'+emojiControl()+'<textarea name="comment" data-emoji-input maxlength="300" rows="2" placeholder="Написати коментар…" required></textarea><button type="submit" class="primary">Надіслати</button></form></section>':'<div class="vatra-media-viewer-photo-note">Фото профілю · використовуйте стрілки або клавіші ← → для перегляду</div>')+'</aside></div></div>';
 };
 const step=delta=>{index=(index+delta+photos.length)%photos.length;draw();};
 dialog.addEventListener('click',async event=>{
  if(event.target.closest('.vatra-viewer-close')||event.target===dialog){dialog.close();return;}
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
 const commentActors={};cs.forEach(c=>{if(c.uid&&!commentActors[c.uid])commentActors[c.uid]={createdAt:c.createdAt,name:c.name,avatarUrl:c.avatarUrl};});
 const likeMap=likes[p.id]||{},saveMap=postSaves[p.id]||{},shareMap=postShares[p.id]||{},canEdit=p.authorUid===currentUser?.uid&&p.source!=='group',editing=canEdit&&editingPostId===p.id;
 const likeIcon='<path d="M20.8 8.7c0 5.2-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z"/>',commentIcon='<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5A7.5 7.5 0 0 1 10.5 4H12a8 8 0 0 1 8 7.5Z"/>',shareIcon='<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M5 13v7h14v-7"/>',saveIcon='<path d="M6 4.5h12v16l-6-4-6 4v-16Z"/>';
 const actions=postActionItem('like',p.id,liked?'Вподобано':'Вподобати',Object.keys(likeMap).length,likeIcon,liked,postActorStack(likeMap,'Хто вподобав допис'))+postActionItem('comment',p.id,'Коментувати',cs.length,commentIcon,false,postActorStack(commentActors,'Хто коментував допис'))+postActionItem('share',p.id,'Поділитися',Object.keys(shareMap).length,shareIcon,false,postActorStack(shareMap,'Хто поділився дописом'))+postActionItem('save',p.id,isSaved?'Збережено':'Зберегти',Object.keys(saveMap).length,saveIcon,isSaved,postActorStack(saveMap,'Хто зберіг допис'));
 return '<article class="post" id="post-'+esc(p.id)+'"><div class="post-head">'+avatar(postAuthorName,postAuthorAvatar)+'<div class="author"><b>'+(p.authorUid&&p.authorUid!==currentUser?.uid?'<button class="author-link" data-view-profile="'+esc(p.authorUid)+'">'+esc(postAuthorName)+'</button>'+verifiedBadge(p.authorUid):esc(postAuthorName)+verifiedBadge(p.authorUid))+'</b><small>@'+esc(p.authorHandle||'user')+' · '+timeAgo(p.createdAt)+(p.editedAt?' · змінено':'')+(p.groupName?' · '+esc(p.groupName):'')+'</small></div>'+(canEdit||(currentUser&&p.authorUid!==currentUser.uid)?'<details class="post-menu"><summary class="dots" aria-label="Дії з дописом">•••</summary><div class="post-menu-panel">'+(canEdit?'<button type="button" data-edit-post="'+esc(p.id)+'">Редагувати</button><button type="button" class="danger-link" data-delete="'+esc(p.id)+'">Видалити</button>':'')+(currentUser&&p.authorUid!==currentUser.uid?'<button type="button" data-report-post="'+esc(p.id)+'">Поскаржитися</button><button type="button" class="danger-link" data-block-user="'+esc(p.authorUid)+'">Заблокувати автора</button>':'')+'</div></details>':'')+'</div>'+(editing?renderPostEditForm(p):renderPostBody(p))+renderPoll(p)+'<div class="post-actions">'+actions+'</div><div class="comments">'+renderComments(p,cs)+'</div>'+(p.commentOpen?'<form class="comment-form" data-form="'+esc(p.id)+'">'+emojiControl()+'<input name="comment" data-emoji-input maxlength="300" placeholder="Написати коментар…" required><button type="submit">Надіслати</button></form>':'')+'</article>';
}
function allPosts(){let arr=Object.entries(posts).map(([id,p])=>({...p,id,source:'user'})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));const joined=Object.entries(groupMembers).filter(([gid,m])=>m&&m[currentUser?.uid]).map(([gid])=>gid);for(const gid of joined){const g=groups[gid];Object.entries(groupPostsCache[gid]||{}).forEach(([id,p])=>arr.push({...p,id:'g_'+gid+'_'+id,groupId:gid,groupName:g?.name||'Спільнота',source:'group'}));}arr=arr.filter(p=>p.authorUid===currentUser?.uid||(!blockedUsers[p.authorUid]&&(!!friends[p.authorUid]||!!following[p.authorUid]||(p.source==='group'&&joined.includes(p.groupId)))));arr.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));if(page==='saved')arr=arr.filter(p=>saved[p.id]);if(page==='profile')arr=arr.filter(p=>p.authorUid===currentUser?.uid);if(query){const q=query.toLocaleLowerCase('uk-UA');arr=arr.filter(p=>`${p.authorName} ${p.authorHandle} ${p.text} ${p.groupName||''}`.toLocaleLowerCase('uk-UA').includes(q));}if(page==='feed'&&filter==='popular')arr.sort((a,b)=>Object.keys(likes[b.id]||{}).length-Object.keys(likes[a.id]||{}).length||(b.createdAt||0)-(a.createdAt||0));return arr;}
function setFeed(html,empty=false){feed.innerHTML=html;$('#empty').hidden=!empty;}
function renderBlockedUsersList(){const box=$('#blockedUsersList');if(!box)return;const entries=Object.entries(blockedUsers).filter(([,value])=>!!value);box.innerHTML=entries.map(([uid])=>{const u=users[uid]||{};return `<div class="blocked-user-row">${avatar(u.name||'Користувач',u.avatarUrl)}<span><b>${esc(u.name||'Користувач ВАТРИ')}</b><small>@${esc(u.handle||'user')}</small></span><button class="pill" data-unblock-user="${esc(uid)}">Розблокувати</button></div>`;}).join('')||'<p class="empty-inline">Немає заблокованих користувачів.</p>';}
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
 if(String(text||'').length<=180)return '<p class="vatra-profile-bio">'+safe+'</p>';
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
 return '<div class="vatra-profile-detail"><span>'+label+'</span>'+linked+'</div>';
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
 if(['friends','photos','videos'].includes(action))goPage(action);
 else if(action==='posts')document.getElementById('vatraProfilePosts')?.scrollIntoView({behavior:'smooth',block:'start'});
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
 const gallery=[...(Array.isArray(currentProfile.profilePhotos)?currentProfile.profilePhotos.map((url,index)=>({url,index,source:'profile',createdAt:0})).filter(item=>item.url):[]),...mine.flatMap(p=>postImages(p).map((url,index)=>({url,createdAt:p.createdAt,source:'post',id:p.id,index})))];
 const history=Array.isArray(currentProfile.avatarHistory)?currentProfile.avatarHistory.map((url,index)=>({url,index})).filter(x=>x.url&&x.url!==currentProfile.avatarUrl).slice(-30).reverse():[];
 const avatarPhotos=[currentProfile.avatarUrl,...history.map(item=>item.url)].filter(Boolean);
 const historyHtml=history.length?'<div class="avatar-history-grid">'+history.map(item=>'<div class="avatar-history-item"><img class="post-image" loading="lazy" decoding="async" src="'+esc(item.url)+'" alt="Попереднє фото профілю"><button type="button" class="pill" data-restore-avatar="'+item.index+'">Поставити аватар</button></div>').join('')+'</div>':'<p class="muted profile-empty-hint">Тут з’являтимуться попередні фото профілю, які Ви вирішите залишити.</p>';
 const galleryUrls=gallery.map(item=>item.url);
 const galleryHtml=gallery.length?'<div class="profile-photo-gallery">'+gallery.slice(0,4).map((photo,index)=>'<div class="profile-photo-tile"><button type="button" class="profile-gallery-open" data-open-profile-gallery="'+esc(uid)+'" data-photo-urls="'+esc(JSON.stringify(galleryUrls))+'" data-photo-index="'+index+'" aria-label="Відкрити фото '+(index+1)+'"><img loading="lazy" decoding="async" src="'+esc(photo.url)+'" alt="Фото профілю"></button><small>'+(photo.source==='profile'?'Фото профілю':timeAgo(photo.createdAt))+'</small>'+(photo.source==='profile'?'<button type="button" class="profile-photo-remove" data-delete-profile-photo="'+photo.index+'">Прибрати</button>':'')+'</div>').join('')+'</div>'+(gallery.length>4?'<button type="button" class="vatra-profile-link profile-gallery-all" id="profileOpenAllPhotos">Відкрити повний альбом ('+gallery.length+')</button>':''):'<p class="muted profile-empty-hint">У цьому альбомі поки немає фотографій.</p>'
 const friendIds=Object.keys(friends||{}).filter(id=>id&&id!==uid&&users[id]&&!blockedUsers[id]);
 const friendPreview=friendIds.slice(0,6).map(id=>{const u=users[id]||{};return '<button type="button" class="vatra-profile-friend" data-view-profile="'+esc(id)+'">'+avatar(u.name||'Користувач',u.avatarUrl,'vatra-profile-friend-avatar')+'<span>'+esc(u.name||'Користувач')+'</span></button>';}).join('');
 const friendBlock='<section class="vatra-profile-card vatra-profile-friends"><div class="vatra-profile-card-head"><h3>Друзі</h3><b>'+friendIds.length+'</b></div>'+(friendPreview?'<div class="vatra-profile-friend-grid">'+friendPreview+'</div>':'<p class="muted">Друзі з’являться тут після додавання.</p>')+'<button type="button" class="vatra-profile-link" id="profileAllFriends">Усі друзі →</button></section>';
 const detailHtml=detail('День народження',birthday)+detail('Місто',currentProfile.city,'city')+detail('Місце проживання',currentProfile.location,'location')+detail('Місце роботи',currentProfile.workplace,'workplace')+detail('Навчання',currentProfile.education,'education')+detail('Рідне місто',currentProfile.hometown,'hometown')+detail('Телефон',currentProfile.phone||privatePhone)+detail('Вебсайт',currentProfile.website);
 const hasDetails=!!(birthday||currentProfile.city||currentProfile.location||currentProfile.workplace||currentProfile.education||currentProfile.hometown||currentProfile.phone||privatePhone||currentProfile.website);
 const myVideos=Object.values(videos||{}).filter(v=>v&&v.authorUid===uid).length;
 const stats='<div class="vatra-profile-stats"><button type="button" data-profile-stat="friends"><b>'+friendIds.length+'</b><span>Друзі</span></button><div><b>'+Object.keys(following||{}).length+'</b><span>Підписки</span></div><button type="button" data-profile-stat="photos"><b>'+gallery.length+'</b><span>Фотографії</span></button><button type="button" data-profile-stat="videos"><b>'+myVideos+'</b><span>Відео</span></button><button type="button" data-profile-stat="posts"><b>'+mine.length+'</b><span>Дописи</span></button></div>';
 const profileHtml='<section class="vatra-profile-layout">'+
  '<aside class="vatra-profile-sidebar">'+
   '<section class="vatra-profile-card vatra-profile-avatar-card"><button type="button" class="vatra-profile-avatar-open" data-avatar-viewer="'+esc(uid)+'" data-avatar-urls="'+esc(JSON.stringify(avatarPhotos))+'">'+avatar(name,currentProfile.avatarUrl,'vatra-profile-photo')+'</button><button class="primary wide" id="editProfile">Редагувати профіль</button><label class="vatra-profile-link vatra-profile-change-photo" for="avatarUpload">Змінити фотографію</label><input id="avatarUpload" type="file" accept="image/*" hidden></section>'+
   friendBlock+
   '<details class="vatra-profile-card vatra-profile-history"><summary>Історія фото профілю <span>'+history.length+'</span></summary>'+historyHtml+'</details>'+
  '</aside>'+
  '<div class="vatra-profile-main">'+
   '<section class="vatra-profile-card vatra-profile-overview">'+
    '<div class="vatra-profile-title-row"><div class="vatra-profile-title-info"><div class="vatra-profile-name-line"><h2>'+esc(name)+verifiedBadge(uid)+'</h2>'+profilePresenceMarkup(currentProfile,true)+'</div>'+
    '<div class="vatra-profile-status-row">'+(currentProfile.status?'<p class="profile-status vatra-profile-status">'+esc(currentProfile.status)+'</p>':'<p class="vatra-profile-status is-empty">Додайте свій статус</p>')+'<button type="button" class="vatra-profile-status-edit" id="profileStatusEdit">'+(currentProfile.status?'Змінити статус':'Додати статус')+'</button></div>'+
    '<p class="profile-handle">@'+esc(currentProfile.handle||'user')+'</p></div></div>'+
    profileBioMarkup(currentProfile.bio||'Додайте коротку інформацію про себе в налаштуваннях профілю.')+
    '<div class="vatra-profile-details">'+(hasDetails?detailHtml:'<p class="muted">Додайте інформацію про себе та виберіть, що буде видно іншим.</p>')+'</div>'+
    stats+
   '</section>'+
   '<section class="vatra-profile-card vatra-profile-photos"><div class="vatra-profile-card-head"><h3>Мої фотографії <span>'+gallery.length+'</span></h3><button type="button" class="vatra-profile-link" id="profileViewPhotos">Усі фото</button><button type="button" class="vatra-profile-link" id="profileAddPhoto">＋ Додати фото</button><input id="profilePhotoUpload" type="file" accept="image/*" multiple hidden></div>'+galleryHtml+'</section>'+
   '<section class="vatra-profile-card vatra-profile-compose"><button type="button" class="vatra-profile-compose-trigger" id="profilePrompt">'+avatar(name,currentProfile.avatarUrl,'vatra-profile-compose-avatar')+'<span>Що у Вас нового?</span><b>＋</b></button></section>'+
   '<section class="vatra-profile-posts" id="vatraProfilePosts"><div class="vatra-profile-post-tabs"><span class="vatra-profile-tab-current">Мої публікації</span><button type="button" class="vatra-profile-new-post" id="profileCreatePost">＋ Новий допис</button></div>'+
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
function renderExplore(){
 const attribute=profileAttributeSearch;
 const norm=x=>String(x||'').trim().toLocaleLowerCase('uk-UA');
 const list=Object.entries(users).filter(([id,u])=>{
  if(id===currentUser?.uid||blockedUsers[id]||u.searchable===false)return false;
  if(attribute){const visible=norm(visibleProfileSearchValue(id,u,attribute.field)),target=norm(attribute.value);return !!visible&&!!target&&(visible===target||visible.includes(target)||target.includes(visible));}
  return !query||norm(u.name+' '+u.handle+' '+u.bio).includes(norm(query));
 });
 const title=attribute?'<h3>Люди: '+esc(attribute.value)+'</h3><p class="muted">Знайдено за відкритими даними профілів. Приватна інформація не використовується.</p><button type="button" class="vatra-profile-search-clear" data-clear-profile-search>Показати всіх людей</button>':'<h3>Знайомтеся зі спільнотою ВАТРИ</h3><p class="muted">Шукайте людей за ім’ям або псевдонімом.</p>';
 setFeed('<article class="post vatra-explore-search-header">'+title+'</article>'+list.map(([id,u])=>'<article class="post person-card">'+avatar(u.name||'Користувач',u.avatarUrl)+'<div class="author"><b>'+esc(u.name||'Користувач')+'</b><small>@'+esc(u.handle||'user')+'</small><p>'+esc(u.bio||'')+'</p></div><button class="follow" data-follow="'+esc(id)+'">'+(following[id]?'Відписатися':'＋ Підписатися')+'</button><button class="pill" data-friend-request="'+esc(id)+'">'+(friends[id]?'✓ Друг':friendRequests[id]?'Запит надіслано':'＋ Додати в друзі')+'</button><button class="pill" data-view-profile="'+esc(id)+'">Профіль</button><button class="pill" data-message-user="'+esc(id)+'">Написати</button></article>').join(''),!list.length);
 if(!list.length)$('#empty').innerHTML='<h3>Нікого не знайдено</h3><p>Людей із такими відкритими даними поки немає.</p>';
}
document.addEventListener('click',event=>{
 if(!event.target.closest('[data-clear-profile-search]'))return;
 profileAttributeSearch=null;query='';const search=$('#search');if(search)search.value='';renderExplore();
});
function renderFriends(){
  const incoming=Object.entries(friendRequests).filter(([uid,r])=>r&&!friends[uid]&&!blockedUsers[uid]&&r.status==='pending'&&r.direction==='incoming');
  const list=Object.entries(friends).filter(([uid])=>!blockedUsers[uid]);
  setFeed(`<article class="post"><h3>Запити в друзі</h3>${incoming.length?incoming.map(([uid])=>{const u=users[uid]||{};return `<div class="person-card">${avatar(u.name||'Користувач',u.avatarUrl)}<div class="author"><b>${esc(u.name||'Користувач')}</b><small>@${esc(u.handle||'user')}</small></div><button class="primary" data-accept-friend="${esc(uid)}">Прийняти</button><button class="pill" data-decline-friend="${esc(uid)}">Відхилити</button></div>`}).join(''):'<p class="muted">Немає нових запитів.</p>'}</article><article class="post"><h3>Ваші друзі <span class="count-badge">${list.length}</span></h3>${list.length?list.map(([uid])=>{const u=users[uid]||{};return `<div class="person-card">${avatar(u.name||'Користувач',u.avatarUrl)}<div class="author"><b>${esc(u.name||'Користувач')}</b><small>@${esc(u.handle||'user')}</small></div><button class="pill" data-view-profile="${esc(uid)}">Профіль</button><button class="pill" data-message-user="${esc(uid)}">Написати</button><button class="danger-link" data-remove-friend="${esc(uid)}">Видалити з друзів</button></div>`}).join(''):'<p class="muted">Друзів поки немає. Знайдіть людей через пошук.</p>'}</article>`);
}
function renderPublicProfile(uid){
 activeProfileUid=uid;page='publicProfile';document.body.dataset.page=page;
 const u=users[uid]||{};
 const friendData=friendProfiles[uid]||{};
 if(blockedUsers[uid]){
  page='publicProfile';
  setFeed('<article class="post"><button class="text-link" id="backExplore">← Назад</button><h2>Профіль приховано</h2><p>Ви заблокували цього користувача. Його дописи й профіль приховані для Вас.</p><button class="pill" data-unblock-user="'+esc(uid)+'">Розблокувати</button></article>');
  $('#backExplore').onclick=()=>goPage('explore');return;
 }
 if(!users[uid])return toastMsg('Профіль не знайдено.');
 if(u.profileVisibility==='private'&&!friends[uid]&&uid!==currentUser?.uid){
  setFeed('<article class="post"><button class="text-link" id="backExplore">← Назад</button><div class="profile-panel">'+avatar(u.name||'Користувач',u.avatarUrl)+'<div><h2>'+esc(u.name||'Користувач ВАТРИ')+verifiedBadge(uid)+'</h2><p>@'+esc(u.handle||'user')+'</p><p>Ця сторінка закрита. Додайте користувача в друзі, щоб побачити більше.</p></div></div><button class="primary" data-friend-request="'+esc(uid)+'">＋ Додати в друзі</button><button class="pill" data-report-user="'+esc(uid)+'">Поскаржитися</button><button class="danger-link" data-block-user="'+esc(uid)+'">Заблокувати</button></article>');
  $('#backExplore').onclick=()=>goPage('explore');return;
 }
 page='publicProfile';
 const arr=Object.entries(posts).map(([id,p])=>({...p,id})).filter(p=>p.authorUid===uid&&!blockedUsers[p.authorUid]).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 const isFriend=!!friends[uid],req=!!friendRequests[uid],canSeeFriends=isFriend||uid===currentUser?.uid;
 const birthday=u.birthdayVisibility==='public'?u.birthdayPublic:(canSeeFriends&&u.birthdayVisibility==='friends'?friendData.birthdayPublic:'');
 const city=u.cityVisibility==='public'?u.city:(canSeeFriends&&u.cityVisibility==='friends'?friendData.city:'');
 const location=u.locationVisibility==='public'?u.location:(canSeeFriends&&u.locationVisibility==='friends'?friendData.location:'');
 const phone=u.phoneVisibility==='public'?u.phone:(canSeeFriends&&u.phoneVisibility==='friends'?friendData.phone:'');
 const workplace=u.workplaceVisibility==='public'?u.workplace:(canSeeFriends&&u.workplaceVisibility==='friends'?friendData.workplace:'');
 const education=u.educationVisibility==='public'?u.education:(canSeeFriends&&u.educationVisibility==='friends'?friendData.education:'');
 const hometown=u.hometownVisibility==='public'?u.hometown:(canSeeFriends&&u.hometownVisibility==='friends'?friendData.hometown:'');
 const detail=(label,value,field='')=>profileDetailMarkup(label,value,field);
 const birthdayLabel=birthday?new Date(birthday+'T00:00:00').toLocaleDateString('uk-UA',{day:'numeric',month:'long',year:'numeric'}):'';
 const publicPhotos=Array.isArray(u.profilePhotos)?u.profilePhotos.filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)).slice(-40).reverse():[];
 const avatarPhotos=[u.avatarUrl,...(Array.isArray(u.avatarHistory)?u.avatarHistory:(canSeeFriends&&Array.isArray(friendData.avatarHistory)?friendData.avatarHistory:[])).slice().reverse()].filter(Boolean);
 const postPhotos=arr.flatMap(p=>postImages(p));
 const photoUrls=[...new Set(publicPhotos.concat(postPhotos))];
 const photoHtml=photoUrls.length?'<div class="profile-photo-gallery">'+photoUrls.slice(0,4).map((url,index)=>'<div class="profile-photo-tile"><button type="button" class="profile-gallery-open" data-open-profile-gallery="'+esc(uid)+'" data-photo-urls="'+esc(JSON.stringify(photoUrls))+'" data-photo-index="'+index+'" aria-label="Відкрити фото '+(index+1)+'"><img class="profile-gallery-image" loading="lazy" decoding="async" src="'+esc(url)+'" alt="Фото користувача"></button></div>').join('')+'</div>'+(photoUrls.length>4?'<button type="button" class="vatra-profile-link profile-gallery-all" data-open-profile-gallery="'+esc(uid)+'" data-photo-urls="'+esc(JSON.stringify(photoUrls))+'" data-photo-index="0">Переглянути всі ('+photoUrls.length+')</button>':''):'<p class="muted profile-empty-hint">Користувач поки не додав фотографій.</p>';
 const hasDetails=!!(birthdayLabel||city||location||workplace||education||hometown||phone||u.website);
 const videoCount=Object.values(videos||{}).filter(v=>v&&v.authorUid===uid).length;
 const actions='<div class="vatra-profile-public-actions"><button class="primary" data-friend-request="'+esc(uid)+'">'+(isFriend?'✓ Друг':req?'Запит надіслано':'＋ Додати в друзі')+'</button><button class="pill" data-follow="'+esc(uid)+'">'+(following[uid]?'Відписатися':'＋ Підписатися')+'</button><button class="pill" data-message-user="'+esc(uid)+'">Написати</button><button class="text-link" data-report-user="'+esc(uid)+'">Поскаржитися</button><button class="danger-link" data-block-user="'+esc(uid)+'">Заблокувати</button></div>';
 const html='<section class="vatra-profile-layout vatra-profile-public-layout">'+
  '<aside class="vatra-profile-sidebar"><section class="vatra-profile-card vatra-profile-avatar-card"><button type="button" class="vatra-profile-avatar-open" data-avatar-viewer="'+esc(uid)+'" data-avatar-urls="'+esc(JSON.stringify(avatarPhotos))+'">'+avatar(u.name||'Користувач',u.avatarUrl,'vatra-profile-photo')+'</button>'+actions+'</section></aside>'+
  '<div class="vatra-profile-main">'+
   '<section class="vatra-profile-card vatra-profile-overview">'+
    '<div class="vatra-profile-title-row"><div class="vatra-profile-title-info"><div class="vatra-profile-name-line"><h2>'+esc(u.name||'Користувач ВАТРИ')+verifiedBadge(uid)+'</h2>'+profilePresenceMarkup({isOnline:u.isOnline===true||friendData.isOnline===true,lastSeenAt:Number(u.lastSeenAt)||Number(friendData.lastSeenAt)||0})+'</div>'+
    (u.status?'<p class="profile-status vatra-profile-status">'+esc(u.status)+'</p>':'')+
    '<p class="profile-handle">@'+esc(u.handle||'user')+'</p></div><button type="button" class="text-link" id="backExplore">← Назад</button></div>'+
    (u.bio?profileBioMarkup(u.bio):'')+
    '<div class="vatra-profile-details">'+(hasDetails?detail('День народження',birthdayLabel)+detail('Місто',city,'city')+detail('Місце проживання',location,'location')+detail('Місце роботи',workplace,'workplace')+detail('Навчання',education,'education')+detail('Рідне місто',hometown,'hometown')+detail('Телефон',phone)+detail('Вебсайт',u.website):'<p class="muted">Користувач поки не додав відкритої інформації.</p>')+'</div>'+
    '<div class="vatra-profile-stats"><div><b>'+arr.length+'</b><span>Дописи</span></div><div><b>'+photoUrls.length+'</b><span>Фотографії</span></div><div><b>'+videoCount+'</b><span>Відео</span></div></div>'+
   '</section>'+
   '<section class="vatra-profile-card vatra-profile-photos"><div class="vatra-profile-card-head"><h3>Фотографії <span>'+photoUrls.length+'</span></h3></div>'+photoHtml+'</section>'+
   '<section class="vatra-profile-posts"><div class="vatra-profile-post-tabs"><span class="vatra-profile-tab-current">Публікації</span></div>'+(arr.map(postCard).join('')||'<article class="post vatra-profile-empty-post"><p class="muted">Цей користувач ще нічого не опублікував.</p></article>')+'</section>'+
  '</div>'+
 '</section>';
 setFeed(html,false);
 $('#backExplore').onclick=()=>goPage('explore');
}

function renderPhotos(){
 if(!currentUser){setFeed('<article class="post"><h2>Мої фотографії</h2><p>Увійдіть, щоб переглядати власні фотографії.</p><button class="primary" id="photosLogin">Увійти</button></article>');$('#photosLogin')?.addEventListener('click',()=>openAuth('login'));return;}
 const uid=currentUser.uid;
 const album=(Array.isArray(currentProfile.profilePhotos)?currentProfile.profilePhotos:[]).filter(url=>typeof url==='string'&&/^https?:\/\//i.test(url)).map((url,index)=>({url,index}));
 const published=Object.entries(posts||{}).filter(([,p])=>p&&p.authorUid===uid).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0)).flatMap(([id,p])=>postImages(p).map(url=>({url,id,date:p.createdAt||0})));
 const all=[...album.map(x=>x.url),...published.map(x=>x.url)];
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
function openGroupSettings(id){if(!authRequired())return;const g=groups[id];if(!g)return;const canManage=g.ownerUid===currentUser.uid||!!groupAdmins[id]?.[currentUser.uid]||!!groupModerators[id]?.[currentUser.uid];if(!canManage)return toastMsg('У Вас немає прав керувати цією спільнотою.');if(groupDetailsUnsub){groupDetailsUnsub();groupDetailsUnsub=null;}groupId=id;page='groupSettings';document.body.dataset.page=page;$('#title').textContent='Керування спільнотою';$('#subtitle').textContent=g.name||'';$('.heading .eyebrow').textContent='СПІЛЬНОТА';$$('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page==='groups'));const composer=$('.quick-compose');if(composer)composer.hidden=true;const sort=$('#sort');if(sort)sort.hidden=true;renderGroupSettings(id);}
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

let activeSecureSession=null,secureChatAttempt=0,chatRenderToken=0;
const SECURE_PREVIEW='🔒 Зашифроване повідомлення';
async function readE2EEKey(uid){const snap=await get(ref(db,'e2eeKeys/'+uid));return snap.val();}
async function publishE2EEKey(uid,record){return set(ref(db,'e2eeKeys/'+uid),record);}
function updateChatSecurityStatus(text,ready=false){
 const status=$('#chatSecurityStatus'),form=$('#sendMessageForm'),input=form?.elements?.message,button=form?.querySelector('button.primary');
 if(status){status.textContent=text;status.dataset.ready=ready?'true':'false';}
 if(input){input.disabled=!ready;input.placeholder=ready?'Захищене повідомлення…':'Очікуємо захищене з’єднання…';}
 if(button)button.disabled=!ready;
 const keys=$('#chatSecurityKeys');
 if(keys){keys.hidden=!ready;if(ready&&activeSecureSession){keys.textContent='Ваш ключ: '+formatFingerprint(activeSecureSession.ownFingerprint)+' · Ключ співрозмовника: '+formatFingerprint(activeSecureSession.peerFingerprint)+'. Для підтвердження особи звірте код іншим надійним каналом.';}}
}
async function activateSecureChat(key,peerUid){
 const attempt=++secureChatAttempt;activeSecureSession=null;
 updateChatSecurityStatus('🔐 Перевіряємо захищені ключі…',false);
 try{
  const secure=await prepareSession(currentUser.uid,peerUid,key,readE2EEKey,publishE2EEKey);
  if(attempt!==secureChatAttempt||activeChat!==peerUid||page!=='messages'||!$('#chatMessages'))return;
  activeSecureSession=secure;
  updateChatSecurityStatus('🔒 Наскрізне шифрування активне на цьому пристрої · перевірте коди безпеки.',true);
 }catch(err){
  if(attempt!==secureChatAttempt||activeChat!==peerUid)return;
  updateChatSecurityStatus('⚠️ E2EE недоступне: '+(err?.message||'невідома помилка')+' Нові повідомлення не надсилаються відкритим текстом.',false);
 }
 await renderChatBubbles(key);
}
async function syncChatPreview(key,otherUid){
 const snap=await get(ref(db,'chats/'+key+'/messages')),items=Object.entries(snap.val()||{}).map(([id,m])=>({...m,id})).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)),last=items[items.length-1],updatedAt=last?.createdAt||Date.now();
 const lastMessage=last?{text:last.encrypted?SECURE_PREVIEW:String(last.text||'').slice(0,120),senderUid:last.senderUid,createdAt:last.createdAt}:null;
 await update(ref(db,'userChats/'+currentUser.uid+'/'+key),{otherUid,updatedAt,lastMessage});
}

function vatraMessengerSidebar(chats){
 const people=Object.keys(friends||{}).filter(uid=>uid!==currentUser?.uid&&!blockedUsers[uid]&&users[uid]&&users[uid].allowMessages!==false);
 const rows=chats.map(([id,c])=>{
  const other=users[c.otherUid]||{},name=other.name||'Користувач ВАТРИ';
  const active=c.otherUid===activeChat;
  return '<div class="vatra-messenger-contact" data-messenger-row data-messenger-name="'+esc(name.toLocaleLowerCase('uk-UA'))+'"><button class="vatra-messenger-contact-main '+(active?'active':'')+'" type="button" data-open-chat="'+esc(c.otherUid)+'">'+avatar(name,other.avatarUrl)+'<span><b>'+esc(name)+'</b><small>'+esc(c.lastMessage?.text||'Захищене повідомлення')+'</small></span><time>'+timeAgo(c.updatedAt)+'</time></button><button class="vatra-messenger-delete" type="button" data-delete-chat="'+esc(id)+'" aria-label="Прибрати діалог із '+esc(name)+'">×</button></div>';
 }).join('');
 return '<aside class="vatra-messenger-sidebar" aria-label="Список діалогів"><header class="vatra-messenger-heading"><h2>Повідомлення</h2><span>'+chats.length+'</span></header><label class="vatra-messenger-search"><span aria-hidden="true">⌕</span><input id="vatraChatSearch" type="search" placeholder="Пошук діалогів" aria-label="Пошук діалогів"></label><div class="vatra-messenger-selector"><strong>Усі діалоги</strong><button id="vatraNewChatToggle" type="button" aria-expanded="false">＋ Новий</button></div><div class="vatra-messenger-contacts" id="vatraMessengerContacts">'+(rows||'<p class="vatra-messenger-nodata">Немає розпочатих діалогів.</p>')+'</div><div class="vatra-messenger-new" id="vatraMessengerNew" hidden><h3>Написати другу</h3>'+(people.map(uid=>{const u=users[uid];return '<button type="button" data-message-user="'+esc(uid)+'">'+avatar(u.name||'Користувач',u.avatarUrl)+'<span>'+esc(u.name||'Користувач')+'</span></button>';}).join('')||'<p>Спочатку додайте друзів у ВАТРІ.</p>')+'</div><footer class="vatra-messenger-footer"><span>🔒 Захищені розмови ВАТРИ</span></footer></aside>';
}
function vatraMessengerControls(){
 const toggle=$('#vatraNewChatToggle'),picker=$('#vatraMessengerNew'),search=$('#vatraChatSearch');
 if(toggle&&picker)toggle.addEventListener('click',()=>{
  picker.hidden=!picker.hidden;
  toggle.setAttribute('aria-expanded',String(!picker.hidden));
 });
 search?.addEventListener('input',()=>{
  const q=search.value.toLocaleLowerCase('uk-UA').trim();
  $$('#vatraMessengerContacts [data-messenger-row]').forEach(item=>{item.hidden=!item.dataset.messengerName.includes(q);});
 });
}

function renderMessages(){
 if(!currentUser){setFeed('<article class="post"><h3>Увійдіть, щоб користуватися повідомленнями</h3><button class="primary" id="chatLogin">Увійти</button></article>');$('#chatLogin').onclick=()=>openAuth('login');return;}
 const chats=Object.entries(chatIndex).filter(([,c])=>Boolean(c?.lastMessage?.text)&&!blockedUsers[c.otherUid]).sort((a,b)=>(b[1]?.updatedAt||0)-(a[1]?.updatedAt||0));
 if(!activeChat){
  setFeed('<section class="vatra-messenger"><div class="vatra-messenger-shell">'+vatraMessengerSidebar(chats)+'<section class="vatra-messenger-empty" aria-label="Оберіть діалог"><div class="vatra-messenger-empty-icon" aria-hidden="true">✉</div><h2>Ваші повідомлення</h2><p>Виберіть діалог ліворуч або почніть нову розмову з другом.</p><small>Нові повідомлення передаються з наскрізним шифруванням.</small></section></div></section>');
  vatraMessengerControls();
  return;
 }
 const other=users[activeChat]||{},key=chatKey(currentUser.uid,activeChat),chatUnavailable=!!blockedUsers[activeChat]||activeChatBlocked;
 setFeed(`<section class="vatra-messenger"><div class="vatra-messenger-shell">${vatraMessengerSidebar(chats)}<article class="post chat-window"><div class="chat-top"><button class="text-link" id="backChats">← Повідомлення</button>${avatar(other.name||'Користувач',other.avatarUrl)}<b>${esc(other.name||'Користувач ВАТРИ')}</b>${blockedUsers[activeChat]?`<button class="pill" data-unblock-user="${esc(activeChat)}">Розблокувати</button>`:`<button class="danger-link" data-block-user="${esc(activeChat)}">Заблокувати</button>`}<button class="text-link" data-report-user="${esc(activeChat)}">Поскаржитися</button></div><section class="chat-security" aria-live="polite"><div class="chat-security-row"><span id="chatSecurityStatus" data-ready="false">🔐 Готуємо захищений чат…</span><button type="button" class="chat-security-refresh" id="chatSecurityRefresh">Перевірити ключі</button></div><details class="chat-security-verify"><summary>Коди безпеки та обмеження</summary><p id="chatSecurityKeys" hidden></p><p>Шифрування працює лише на пристроях учасників. Перевірте коди іншим каналом. Нові ключі не синхронізуються між пристроями; попередні повідомлення могли зберігатися відкритим текстом.</p></details></section><p id="chatBlockNotice" class="empty-inline" ${chatUnavailable?'':'hidden'}>Надсилання повідомлень зупинене: один із учасників заблокував іншого.</p><div id="chatMessages" class="chat-messages">Завантаження повідомлень…</div><form id="sendMessageForm" class="chat-send" ${chatUnavailable?'hidden':''}>${emojiControl()}<input name="message" data-emoji-input maxlength="2000" placeholder="Написати повідомлення…" autocomplete="off" required><button class="primary">Надіслати</button></form></article></div></section>`);
 vatraMessengerControls();
 $('#backChats').onclick=()=>{activeChat=null;editingMessageId=null;stopChatListener();renderMessages();};
 startChatListener(key);markChatRead(key);updateChatSecurityStatus("🔐 Перевіряємо ключі…",false);activateSecureChat(key,activeChat);$("#chatSecurityRefresh")?.addEventListener("click",()=>activateSecureChat(key,activeChat));
 $('#sendMessageForm').onsubmit=async e=>{
  e.preventDefault();
  if(activeChatBlocked||blockedUsers[activeChat])return toastMsg('Надсилання в цьому чаті зупинено.');
  const form=e.currentTarget,input=form.elements.message,text=input.value.trim(),recipient=activeChat,submit=form.querySelector('button.primary');
  if(!text||submit.disabled)return;
  const session=activeSecureSession;
  if(!session||session.peerUid!==recipient||session.chatId!==key){toastMsg('E2EE ще не готове. Відкритий текст не надсилається.');return;}
  submit.disabled=true;let written=false;
  try{
   const createdAt=Date.now(),encrypted=await encryptMessage(session,text,currentUser.uid,createdAt);
   const cRef=ref(db,'chats/'+key),snap=await get(cRef);
   if(!snap.exists())await set(cRef,{members:{[currentUser.uid]:true,[recipient]:true},createdAt});
   const msgRef=push(ref(db,'chats/'+key+'/messages'));
   await set(msgRef,{senderUid:currentUser.uid,encrypted,createdAt});
   written=true;if(input.value.trim()===text)input.value='';
   const lastMessage={text:SECURE_PREVIEW,senderUid:currentUser.uid,createdAt},summary={otherUid:recipient,updatedAt:createdAt,lastMessage};
   await update(ref(db,'userChats/'+currentUser.uid+'/'+key),summary);
  }catch(err){toastMsg(written?'Зашифроване повідомлення надіслано, але список діалогів не оновився.':'Не вдалося надіслати захищене повідомлення: '+(err?.message||niceError(err)));}
  finally{submit.disabled=false;}
 };
}
let chatUnsub=null,chatBlockUnsub=null,groupDetailsUnsub=null,editingMessageId=null;
function stopChatListener(){
 secureChatAttempt++;chatRenderToken++;activeSecureSession=null;
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
   }catch(error){canRead=false;textValue='🔒 Повідомлення недоступне: '+(error?.message||'помилка розшифрування');}
  }else{textValue=String(m.text||'');}
  const editing=mine&&editingMessageId===m.id&&canRead;
  const stamp=timeAgo(m.createdAt)+(m.editedAt?' · змінено':'')+(encrypted?' · 🔒 E2EE':' · ⚠️ не зашифровано');
  return '<div class="message-bubble '+(mine?'mine':'')+'">'+
   (editing?'<form class="message-edit-form" data-edit-message-form="'+esc(m.id)+'"><input name="text" maxlength="2000" value="'+esc(textValue)+'" required><button class="pill">Зберегти</button><button type="button" class="text-link" data-cancel-edit>Скасувати</button></form>':
   '<p>'+ (canRead?safeText(textValue):esc(textValue))+'</p><small>'+stamp+'</small>'+
   (mine?'<div class="message-actions">'+(canRead?'<button data-edit-message="'+esc(m.id)+'">Редагувати</button>':'')+'<button data-delete-message="'+esc(m.id)+'">Видалити</button></div>':''))+
   '</div>';
 }));
 if(token!==chatRenderToken||!$('#chatMessages')||chatKey(currentUser.uid,activeChat)!==key)return;
 el.innerHTML=html.join('')||'<p class="muted">Напишіть перше захищене повідомлення 🔒</p>';
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
function notificationItems(){if(!currentUser)return [];const items=[],uid=currentUser.uid;Object.entries(posts).forEach(([postId,p])=>{if(p.authorUid!==uid)return;Object.entries(likes[postId]||{}).forEach(([actor,value])=>{const createdAt=Number(value&&typeof value==='object'?value.createdAt:0);if(actor!==uid&&!blockedUsers[actor]&&createdAt)items.push({id:'like_'+postId+'_'+actor,type:'like',actorUid:actor,createdAt,postId,unread:createdAt>activityReadAt});});Object.entries(comments[postId]||{}).forEach(([commentId,c])=>{const createdAt=Number(c.createdAt)||0;if(c.uid!==uid&&!blockedUsers[c.uid]&&createdAt)items.push({id:'comment_'+postId+'_'+commentId,type:'comment',actorUid:c.uid,createdAt,postId,excerpt:String(c.text||'').slice(0,100),unread:createdAt>activityReadAt});});});Object.entries(friendRequests).forEach(([actor,r])=>{if(!r||actor===uid||blockedUsers[actor]||r.status!=='pending'||r.direction!=='incoming')return;const createdAt=Number(r.createdAt)||0;items.push({id:'friend_'+actor,type:'friend',actorUid:actor,createdAt,unread:createdAt>activityReadAt});});Object.entries(chatIndex).forEach(([key,c])=>{const m=c&&c.lastMessage;if(!m||!m.text||m.senderUid===uid||blockedUsers[c.otherUid])return;const createdAt=Number(m.createdAt)||0;items.push({id:'message_'+key,type:'message',actorUid:c.otherUid,createdAt,chatUid:c.otherUid,excerpt:String(m.text).slice(0,100),unread:createdAt>Number(chatReads[key]||0)});});return items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));}
function updateNotificationBadges(){const items=notificationItems(),count=items.filter(x=>x.unread).length,incoming=Object.entries(friendRequests).filter(([uid,x])=>x&&!friends[uid]&&!blockedUsers[uid]&&x.status==='pending'&&x.direction==='incoming').length;['notificationBadge','notificationNavBadge'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.textContent=count>99?'99+':String(count);el.hidden=count===0;});const friendBadge=document.getElementById('friendsNavBadge');if(friendBadge){friendBadge.textContent=incoming>99?'99+':String(incoming);friendBadge.hidden=incoming===0;}}
function markChatRead(key){if(!currentUser||!key)return;const latest=chatIndex[key]&&chatIndex[key].lastMessage,stamp=Math.max(Date.now(),Number(latest&&latest.createdAt)||0);if(Number(chatReads[key]||0)>=stamp-1000)return;chatReads={...chatReads,[key]:stamp};updateNotificationBadges();set(ref(db,'chatReads/'+currentUser.uid+'/'+key),stamp).catch(err=>console.warn('Chat read receipt failed:',err));}
function markNotificationsRead(){if(!currentUser)return;const stamp=Date.now(),unreadChats=Object.entries(chatIndex).filter(([key,c])=>c&&c.lastMessage&&c.lastMessage.senderUid!==currentUser.uid&&Number(c.lastMessage.createdAt||0)>Number(chatReads[key]||0)).map(([key])=>key);activityReadAt=stamp;unreadChats.forEach(key=>{chatReads={...chatReads,[key]:stamp};});updateNotificationBadges();renderNotifications();Promise.all([set(ref(db,'activityReadAt/'+currentUser.uid),stamp),...unreadChats.map(key=>set(ref(db,'chatReads/'+currentUser.uid+'/'+key),stamp))]).catch(err=>toastMsg(niceError(err)));}
function renderNotifications(){const items=notificationItems().slice(0,50);const rows=items.map(n=>{const u=users[n.actorUid]||{},name=esc(u.name||'Користувач ВАТРИ'),when=timeAgo(n.createdAt);let title='',target='';if(n.type==='like'){title=name+' вподобав(-ла) Ваш допис';target='data-notification-post="'+esc(n.postId)+'"';}else if(n.type==='comment'){title=name+' прокоментував(-ла) Ваш допис: «'+esc(n.excerpt)+'»';target='data-notification-post="'+esc(n.postId)+'"';}else if(n.type==='friend'){title=name+' надіслав(-ла) запит у друзі';target='data-notification-friends="true"';}else{title='Нове повідомлення від '+name+': «'+esc(n.excerpt)+'»';target='data-notification-chat="'+esc(n.chatUid)+'"';}return '<button class="notification-item '+(n.unread?'is-unread':'')+'" '+target+'>'+avatar(u.name||'Користувач',u.avatarUrl)+'<span class="notification-copy"><b>'+title+'</b><small>'+when+'</small></span>'+(n.unread?'<span class="notification-dot" aria-label="Нове"></span>':'')+'</button>';}).join('');setFeed('<article class="post notifications-page"><div class="notifications-heading"><div><p class="eyebrow">ВАШЕ КОЛО</p><h2>Сповіщення</h2><p class="muted">Запити в друзі, реакції на Ваші дописи та нові повідомлення.</p></div><span class="count-badge">'+items.filter(x=>x.unread).length+' нових</span></div><div class="notification-list">'+(rows||'<div class="empty-inline">Поки немає сповіщень. Нові реакції, запити й повідомлення з’являться тут.</div>')+'</div></article>');}
function renderGettingStarted(){
 const box=$('#gettingStartedMobile'),side=$('#gettingStarted');if(side){side.hidden=true;side.innerHTML='';}
 if(!box)return;if(!currentUser||page!=='feed'){box.hidden=true;box.innerHTML='';return;}
 let dismissed=false;try{dismissed=localStorage.getItem('vatra-guide-hidden-v1-'+currentUser.uid)==='1';}catch{}
 const ownPosts=Object.values(posts||{}).filter(p=>p&&p.authorUid===currentUser.uid),profileReady=!!(currentProfile.bio||currentProfile.city||currentProfile.workplace||currentProfile.education);
 const tasks=[{title:'Додайте фото профілю',desc:'Друзі зможуть упізнати Вас.',done:!!currentProfile.avatarUrl,action:'profile',cta:'Відкрити профіль'},{title:'Заповніть інформацію',desc:'Додайте опис або місто.',done:profileReady,action:'settings',cta:'Налаштувати профіль'},{title:'Опублікуйте перший допис',desc:'Поділіться думкою, фото чи опитуванням.',done:ownPosts.length>0,action:'create',cta:'Створити допис'},{title:'Знайдіть друзів',desc:'Запросіть знайомих до свого кола.',done:Object.keys(friends||{}).length>0,action:'explore',cta:'Знайти людей'}];
 const done=tasks.filter(t=>t.done).length,pending=tasks.filter(t=>!t.done);if(dismissed||!pending.length){box.hidden=true;box.innerHTML='';return;}
 box.hidden=false;box.innerHTML='<div class="getting-head"><span class="getting-mark"><img src="vatra-flame.svg?v=20261029-2" alt="" class="vatra-ui-flame"></span><div><p class="eyebrow">ШВИДКИЙ СТАРТ</p><h3>Почніть користуватися ВАТРОЮ</h3><p>'+done+' із '+tasks.length+' кроків · залишилося '+pending.length+'</p></div><button type="button" class="getting-dismiss" data-onboard-dismiss aria-label="Приховати швидкий старт">×</button></div><div class="getting-progress"><span style="width:'+(done/tasks.length*100)+'%"></span></div><div class="getting-tasks">'+pending.map((t,i)=>'<div class="getting-task"><span class="task-number">'+(done+i+1)+'</span><div class="task-copy"><b>'+t.title+'</b><small>'+t.desc+'</small></div><button type="button" data-onboard="'+t.action+'" aria-label="'+t.cta+'">›</button></div>').join('')+'</div><button type="button" class="getting-help" data-onboard="guide">Короткий тур ВАТРОЮ</button>';
}function openVatraGuide(){
 let overlay=$('#vatraTourOverlay');
 if(!overlay){overlay=document.createElement('div');overlay.id='vatraTourOverlay';overlay.className='vatra-tour-overlay';overlay.innerHTML='<section class="vatra-tour-card" role="dialog" aria-modal="true" aria-labelledby="vatraTourTitle"><div class="vatra-tour-top"><span class="vatra-tour-kicker">ПЕРШІ КРОКИ У ВАТРІ</span><button type="button" class="vatra-tour-skip" data-tour-skip>Пропустити</button></div><div class="vatra-tour-progress"><span id="vatraTourProgress"></span></div><div class="vatra-tour-count" id="vatraTourCount"></div><h2 id="vatraTourTitle"></h2><p id="vatraTourText"></p><div class="vatra-tour-actions"><button type="button" class="pill" id="vatraTourPrev">Назад</button><button type="button" class="primary" id="vatraTourNext">Далі</button></div></section>';document.body.append(overlay);}
 const steps=[{selector:'.sidebar .brand, .mobile-brand',title:'Ласкаво просимо до ВАТРИ',text:'Логотип повертає Вас до простору ВАТРИ. Основні розділи знаходяться в навігації ліворуч або в нижній панелі телефона.'},{page:'feed',selector:'.sidebar nav [data-page="feed"], .mobile-nav [data-page="feed"]',title:'Новини — тут Ваша стрічка',text:'Натисніть на пункт «Новини» в меню. Тут з’являються дописи друзів і спільнот, за якими Ви стежите.'},{page:'profile',selector:'.sidebar nav [data-page="profile"], .mobile-nav [data-page="profile"]',title:'Мій профіль — Ваша сторінка',text:'Це саме кнопка «Мій профіль». Тут Ваші дописи, фото та інформація; редагування приватних даних знаходиться в налаштуваннях.'},{page:'friends',selector:'.sidebar nav [data-page="friends"], .mobile-nav [data-page="friends"]',title:'Друзі',text:'Знаходьте знайомих, надсилайте запити та приймай запрошення.'},{page:'messages',selector:'.sidebar nav [data-page="messages"], .mobile-nav [data-page="messages"]',title:'Повідомлення',text:'Приватні розмови з друзями — у цьому розділі.'},{page:'groups',selector:'.sidebar nav [data-page="groups"], .mobile-nav [data-page="groups"]',title:'Спільноти',text:'Знаходьте учасників, переглядай підписників і команду спільноти. Керування відкривається окремим екраном кнопкою «Керувати спільнотою».'},{page:'feed',selector:'.quick-compose',title:'Створюй дописи',text:'Діліться думками, фото, відео та опитуваннями.'},{page:'settings',selector:'.sidebar nav [data-page="settings"], .mobile-nav [data-page="settings"]',title:'Налаштування і приватність',text:'Керуйте даними профілю, видимістю особистої інформації та безпекою.'},{page:'notifications',selector:'.sidebar nav [data-page="notifications"], .mobile-nav [data-page="notifications"]',title:'Сповіщення',text:'Тут побачиш запити в друзі та інші важливі події.'},{page:'saved',selector:'.sidebar nav [data-page="saved"], .mobile-nav [data-page="saved"]',title:'Збережене',text:'Зберігай дописи, до яких хочете повернутися пізніше.'},{page:'feed',selector:'.search',title:'Пошук',text:'Знаходьте людей і дописи за іменем або ключовими словами.'}];
 let index=0,highlighted=null;const clean=()=>{if(highlighted){highlighted.classList.remove('vatra-tour-highlight');delete highlighted.dataset.tourLabel;}highlighted=null;};const close=(completed=false)=>{clean();overlay.classList.remove('is-visible');overlay.setAttribute('aria-hidden','true');if(completed&&index===steps.length-1&&currentUser){const key='vatra-guide-completed-v2-'+currentUser.uid;try{localStorage.setItem(key,'1')}catch{}set(ref(db,'privateUsers/'+currentUser.uid+'/vatraGuideCompletedAt'),Date.now()).catch(()=>{});}};
 const showStep=()=>{clean();const st=steps[index];if(st.page&&page!==st.page)goPage(st.page);highlighted=[...document.querySelectorAll(st.selector)].find(el=>el.getClientRects().length>0);if(highlighted){highlighted.dataset.tourLabel='← Саме тут';highlighted.classList.add('vatra-tour-highlight');highlighted.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});}$('#vatraTourCount').textContent='Крок '+(index+1)+' із '+steps.length;$('#vatraTourTitle').textContent=st.title;$('#vatraTourText').textContent=st.text;$('#vatraTourProgress').style.width=((index+1)/steps.length*100)+'%';$('#vatraTourPrev').disabled=index===0;$('#vatraTourNext').textContent=index===steps.length-1?'Завершити':'Далі';};
 overlay.querySelector('[data-tour-skip]').onclick=()=>close(false);$('#vatraTourPrev').onclick=()=>{if(index>0){index--;showStep()}};$('#vatraTourNext').onclick=()=>{if(index<steps.length-1){index++;showStep()}else close(true)};overlay.setAttribute('aria-hidden','false');overlay.classList.add('is-visible');showStep();
}
function render(){if(!feed)return;document.body.dataset.page=page;if(currentUser&&!initialDataReady){renderLoadingSkeletons();return;}renderGettingStarted();if(page==='notifications')return renderNotifications();if(page==='settings')return renderSettings();if(page==='groupSettings')return renderGroupSettings(groupId);if(page==='friends')return renderFriends();if(page==='publicProfile')return; if(page==='videos')return renderVideos();if(page==='photos')return renderPhotos();if(page==='groups')return groupId&&groups[groupId]?renderGroupDetails(groupId):renderGroups();if(page==='messages')return renderMessages();if(page==='explore')return renderExplore();if(page==='profile')return renderProfile();renderFeed();}
const pages={friends:['ВАШЕ КОЛО','Друзі','Керуйте запитами та знаходьте знайомих.'],notifications:['ВАШЕ КОЛО','Сповіщення','Запити в друзі, реакції на Ваші дописи та нові повідомлення.'],feed:['ВАШЕ КОЛО','Новини','Дописи друзів і спільнот, за якими Ви стежите.'],photos:['МОЇ МОМЕНТИ','Фотографії','Ваш альбом і зображення з дописів.'],videos:['ДИВІТЬСЯ ТА ВІДКРИВАЙТЕ','Короткі відео','Живі моменти від людей з усієї України.'],explore:['ЗНАХОДЬТЕ СВОЄ','Відкриття','Знайомтеся з людьми та відкривайте цікаві дописи.'],messages:['БУДЬТЕ НА ЗВʼЯЗКУ','Повідомлення','Приватні розмови з людьми ВАТРИ.'],groups:['РАЗОМ ЦІКАВІШЕ','Спільноти','Знаходьте людей, з якими є про що говорити.'],saved:['ТЕ, ЩО ВАЖЛИВО','Збережене','Дописи, до яких хочеться повернутися.'],profile:['ВАША ІСТОРІЯ','Профіль','Ваш простір у ВАТРІ.'],settings:['НАЛАШТУВАННЯ','Налаштування профілю','Керуйте інформацією, фотографіями та приватністю сторінки.'],groupSettings:['СПІЛЬНОТА','Керування спільнотою','Налаштовуй опис, діяльність і команду спільноти.']};
function goPage(p){if(!pages[p])p='feed';if(p!=='explore')profileAttributeSearch=null;navigation.setPage(p);if(p==='settings'&&!authRequired())return;const main=$('.layout>.main');if(main){main.classList.remove('vatra-page-enter');void main.offsetWidth;main.classList.add('vatra-page-enter');}page=p;if(groupDetailsUnsub){groupDetailsUnsub();groupDetailsUnsub=null;}if(p!=='messages')stopChatListener();groupId=null;const c=pages[p]||pages.feed;$('#title').textContent=c[1];$('#subtitle').textContent=c[2];$('.heading .eyebrow').textContent=c[0];$$('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===p));$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter&&p==='feed'));const composer=$('.quick-compose');if(composer)composer.hidden=p!=='feed';const sort=$('#sort');if(sort)sort.hidden=p!=='feed';if(p==='messages')activeChat=null;render();if(p==='notifications')markNotificationsRead();}
function resetPollComposer(){const fields=$('#pollOptionFields');fields.innerHTML='<label class="poll-option-field"><span>1</span><input maxlength="80" placeholder="Перший варіант" aria-label="Перший варіант відповіді"><button type="button" data-remove-poll-option aria-label="Видалити варіант">×</button></label><label class="poll-option-field"><span>2</span><input maxlength="80" placeholder="Другий варіант" aria-label="Другий варіант відповіді"><button type="button" data-remove-poll-option aria-label="Видалити варіант">×</button></label>';$('#pollComposer').hidden=true;$('#togglePoll').setAttribute('aria-expanded','false');}
$('#togglePoll').addEventListener('click',()=>{const box=$('#pollComposer'),show=box.hidden;box.hidden=!show;$('#togglePoll').setAttribute('aria-expanded',String(show));if(show)$('#pollOptionFields input')?.focus();});
$('#addPollOption').addEventListener('click',()=>{const fields=$('#pollOptionFields'),n=fields.querySelectorAll('input').length;if(n>=6)return toastMsg('В опитуванні може бути до 6 варіантів.');const row=document.createElement('label');row.className='poll-option-field';row.innerHTML='<span>'+String(n+1)+'</span><input maxlength="80" placeholder="Варіант '+String(n+1)+'" aria-label="Варіант відповіді '+String(n+1)+'"><button type="button" data-remove-poll-option aria-label="Видалити варіант">×</button>';fields.append(row);row.querySelector('input').focus();});
$('#pollOptionFields').addEventListener('click',e=>{const button=e.target.closest('[data-remove-poll-option]');if(!button)return;const fields=$('#pollOptionFields');if(fields.querySelectorAll('input').length<=2)return toastMsg('В опитуванні потрібно щонайменше 2 варіанти.');button.closest('.poll-option-field').remove();});
function clearComposerPhotoPreviews(){imagePreviewUrls.forEach(url=>URL.revokeObjectURL(url));imagePreviewUrls.length=0;}
function renderComposerPhotoPreviews(){
 clearComposerPhotoPreviews();
 const box=$('#preview');if(!box)return;
 box.innerHTML=imageFiles.map((file,index)=>{const url=URL.createObjectURL(file);imagePreviewUrls.push(url);return '<div class="composer-photo-preview"><img src="'+url+'" alt="Фото '+(index+1)+'"><div class="composer-photo-actions"><button type="button" data-edit-composer-photo="'+index+'">Редагувати</button><button type="button" data-remove-composer-photo="'+index+'" aria-label="Прибрати фото">×</button></div><small>'+(index+1)+' / '+imageFiles.length+'</small></div>';}).join('');
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
function openComposer(){if(!authRequired())return;imageFiles=[];clearComposerPhotoPreviews();editPostFiles=[];videoFile=null;$('#postText').value='';$('#count').textContent='0 / '+MAX_POST_TEXT;$('#preview').innerHTML='';$('#modalPhoto').value='';$('#photo').value='';const note=$('#photoNote');if(note)note.textContent='';resetPollComposer();modal.showModal();setTimeout(()=>$('#postText').focus(),60);}
function loadImage(file,cb){if(!file)return false;if(!file.type.startsWith('image/')){toastMsg('Виберіть файл зображення.');return false;}if(file.size>MAX_IMAGE){toastMsg('Фото має бути меншим за 15 МБ.');return false;}const r=new FileReader();r.onload=()=>cb(r.result);r.onerror=()=>toastMsg('Не вдалося прочитати файл зображення.');r.readAsDataURL(file);return true;}
async function uploadImage(file,maxSide=1200,quality=.78,category='posts'){if(!file||!file.type?.startsWith('image/'))throw new Error('Виберіть файл зображення.');if(file.size>15*1024*1024)throw new Error('Фото має бути меншим за 15 МБ.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Не вдалося прочитати фото.'));r.readAsDataURL(file);});const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Файл зображення пошкоджений.'));i.src=data;});const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Не вдалося обробити зображення.');ctx.drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Не вдалося підготувати фото.')),'image/jpeg',quality));const optimized=new File([blob],(file.name||'photo').replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg',lastModified:Date.now()});return await uploadMedia(optimized,category);}
async function getImageEditor(file,mode='avatar'){
 if(!file||!file.type?.startsWith('image/'))throw new Error('Виберіть файл зображення.');
 if(file.size>MAX_IMAGE)throw new Error('Фото має бути меншим за 15 МБ.');
 const objectUrl=URL.createObjectURL(file);
 const title=mode==='cover'?'Редагування обкладинки':mode==='gallery'?'Редагування фотографії':'Редагування аватара';
 const hint=mode==='avatar'?'Налаштуйте портрет, обріжте зайве та додайте стиль ВАТРИ.':'Відредагуйте кадр, вигляд і за бажанням додайте напис на фото.';
 const dialog=document.createElement('dialog');
 dialog.className='vatra-image-editor '+(mode==='cover'?'is-cover':mode==='gallery'?'is-gallery':'is-avatar');
 dialog.setAttribute('aria-labelledby','vatraImageEditorTitle');
 dialog.innerHTML='<div class="vatra-image-editor-head"><div><p class="eyebrow">ФОТО ВАТРИ</p><h2 id="vatraImageEditorTitle">'+title+'</h2></div><button type="button" class="vatra-image-editor-close" aria-label="Закрити">×</button></div>'+
 '<div class="vatra-image-editor-layout"><div class="vatra-image-stage '+(mode==='cover'?'is-cover':mode==='gallery'?'is-gallery':'is-avatar')+'"><img alt="Попередній перегляд фото"><div class="vatra-image-stage-grid" aria-hidden="true"></div><div class="vatra-image-overlay-preview" hidden></div></div>'+
 '<aside class="vatra-image-editor-tools"><p class="vatra-image-editor-hint">'+hint+'</p>'+
 '<section class="vatra-editor-section"><b>Фільтри ВАТРИ</b><div class="vatra-image-filter-presets" role="group" aria-label="Фільтри">'+
 '<button type="button" class="active" data-vatra-filter="original">Оригінал</button><button type="button" data-vatra-filter="vivid">Яскравий</button><button type="button" data-vatra-filter="warm">Теплий</button><button type="button" data-vatra-filter="cool">Холодний</button><button type="button" data-vatra-filter="mono">Ч/Б</button><button type="button" data-vatra-filter="sepia">Сепія</button><button type="button" data-vatra-filter="soft">М’який</button><button type="button" data-vatra-filter="cinema">Кіно</button><button type="button" data-vatra-filter="vintage">Вінтаж</button><button type="button" data-vatra-filter="summer">Літо</button><button type="button" data-vatra-filter="night">Ніч</button><button type="button" data-vatra-filter="matte">Мат</button><button type="button" data-vatra-filter="sunset">Захід сонця</button><button type="button" data-vatra-filter="arctic">Арктика</button><button type="button" data-vatra-filter="rose">Рожевий</button><button type="button" data-vatra-filter="emerald">Смарагд</button><button type="button" data-vatra-filter="golden">Золотий</button><button type="button" data-vatra-filter="lavender">Лаванда</button><button type="button" data-vatra-filter="film">Плівка</button><button type="button" data-vatra-filter="noir">Нуар</button><button type="button" data-vatra-filter="neon">Неон</button><button type="button" data-vatra-filter="pastel">Пастель</button><button type="button" data-vatra-filter="forest">Ліс</button><button type="button" data-vatra-filter="copper">Мідь</button></div></section>'+
 '<section class="vatra-editor-section"><b>Кадрування</b>'+
 '<label class="vatra-image-control"><span>Масштаб <output data-range-output="zoom">100%</output></span><input type="range" id="vatraEditZoom" min="100" max="300" value="100"></label>'+
 '<label class="vatra-image-control"><span>Горизонталь <output data-range-output="x">0</output></span><input type="range" id="vatraEditX" min="-100" max="100" value="0"></label>'+
 '<label class="vatra-image-control"><span>Вертикаль <output data-range-output="y">0</output></span><input type="range" id="vatraEditY" min="-100" max="100" value="0"></label>'+
 '<div class="vatra-image-rotate"><span>Повернути фото</span><div><button type="button" data-vatra-rotate="-90" aria-label="Повернути ліворуч">↶</button><button type="button" data-vatra-rotate="90" aria-label="Повернути праворуч">↻</button></div></div></section>'+
 '<section class="vatra-editor-section"><b>Корекція кольору</b>'+
 '<label class="vatra-image-control"><span>Яскравість <output data-range-output="brightness">100%</output></span><input type="range" id="vatraEditBrightness" min="50" max="160" value="100"></label>'+
 '<label class="vatra-image-control"><span>Контраст <output data-range-output="contrast">100%</output></span><input type="range" id="vatraEditContrast" min="50" max="160" value="100"></label>'+
 '<label class="vatra-image-control"><span>Насиченість <output data-range-output="saturation">100%</output></span><input type="range" id="vatraEditSaturation" min="0" max="180" value="100"></label></section>'+
 '<section class="vatra-editor-section vatra-editor-text"><b>Текст на фото</b>'+
 '<input type="text" id="vatraEditText" maxlength="80" placeholder="Додайте напис або цитату…">'+
 '<div class="vatra-editor-text-options"><label>Колір <input id="vatraEditTextColor" type="color" value="#ffffff"></label><label>Контур <input id="vatraEditTextStroke" type="color" value="#18283f"></label><label>Розмір <input id="vatraEditTextSize" type="range" min="16" max="64" value="32"></label>'+
 '<label>Розташування <select id="vatraEditTextPosition"><option value="bottom">Унизу</option><option value="center">По центру</option><option value="top">Угорі</option></select></label>'+
 '<label>Вирівнювання <select id="vatraEditTextAlign"><option value="center">По центру</option><option value="left">Ліворуч</option><option value="right">Праворуч</option></select></label>'+
 '<label>Шрифт <select id="vatraEditTextFont"><option value="Inter">Inter</option><option value="Georgia">Georgia</option><option value="Arial">Arial</option><option value="monospace">Моноширинний</option></select></label></div></section>'+
 '<p class="vatra-image-editor-status" aria-live="polite"></p></aside></div>'+
 '<div class="vatra-image-editor-actions"><button type="button" class="pill" data-vatra-edit-cancel>Скасувати</button><button type="button" class="primary" data-vatra-edit-apply>Застосувати фото</button></div>';
 document.body.append(dialog);
 const preview=dialog.querySelector('.vatra-image-stage img');
 const overlayPreview=dialog.querySelector('.vatra-image-overlay-preview');
 const stage=dialog.querySelector('.vatra-image-stage');
 const zoom=dialog.querySelector('#vatraEditZoom'),xInput=dialog.querySelector('#vatraEditX'),yInput=dialog.querySelector('#vatraEditY');
 const brightnessInput=dialog.querySelector('#vatraEditBrightness'),contrastInput=dialog.querySelector('#vatraEditContrast'),saturationInput=dialog.querySelector('#vatraEditSaturation');
 const textInput=dialog.querySelector('#vatraEditText'),textColor=dialog.querySelector('#vatraEditTextColor'),textStroke=dialog.querySelector('#vatraEditTextStroke'),textSize=dialog.querySelector('#vatraEditTextSize'),textPosition=dialog.querySelector('#vatraEditTextPosition'),textAlign=dialog.querySelector('#vatraEditTextAlign'),textFont=dialog.querySelector('#vatraEditTextFont');
 const state={zoom:1,x:0,y:0,rotation:0,brightness:100,saturation:100,contrast:100,sepia:0,filter:'original',text:'',textColor:'#ffffff',textStroke:'#18283f',textSize:32,textPosition:'bottom',textAlign:'center',textFont:'Inter'};
 let finished=false;
 return await new Promise(resolve=>{
  const finish=result=>{
   if(finished)return;finished=true;if(dialog.open)dialog.close();dialog.remove();URL.revokeObjectURL(objectUrl);resolve(result);
  };
  const output=(key,value)=>{const el=dialog.querySelector('[data-range-output="'+key+'"]');if(el)el.textContent=value;};
  const drawPreview=()=>{
   preview.style.transform='translate('+state.x*.17+'%,'+state.y*.17+'%) scale('+state.zoom+') rotate('+state.rotation+'deg)';
   preview.style.filter='brightness('+state.brightness+'%) saturate('+state.saturation+'%) contrast('+state.contrast+'%) sepia('+state.sepia+'%)';
   output('zoom',Math.round(state.zoom*100)+'%');output('x',String(Math.round(state.x)));output('y',String(Math.round(state.y)));
   output('brightness',state.brightness+'%');output('contrast',state.contrast+'%');output('saturation',state.saturation+'%');
   overlayPreview.textContent=state.text;overlayPreview.hidden=!state.text;
   overlayPreview.style.color=state.textColor;overlayPreview.style.fontSize=Math.max(12,Math.round(state.textSize*.72))+'px';
   overlayPreview.style.fontFamily=state.textFont+',sans-serif';overlayPreview.style.setProperty('text-align',state.textAlign,'important');overlayPreview.style.textShadow='0 2px 7px '+state.textStroke;
   overlayPreview.dataset.position=state.textPosition;
  };
  preview.onload=drawPreview;preview.onerror=()=>{dialog.querySelector('.vatra-image-editor-status').textContent='Не вдалося відкрити це фото.';};preview.src=objectUrl;
  const ranges=[zoom,xInput,yInput,brightnessInput,contrastInput,saturationInput,textSize];
  ranges.forEach(input=>input.addEventListener('input',()=>{
   if(input===zoom)state.zoom=Number(zoom.value)/100;
   if(input===xInput)state.x=Number(xInput.value);
   if(input===yInput)state.y=Number(yInput.value);
   if(input===brightnessInput)state.brightness=Number(brightnessInput.value);
   if(input===contrastInput)state.contrast=Number(contrastInput.value);
   if(input===saturationInput)state.saturation=Number(saturationInput.value);
   if(input===textSize)state.textSize=Number(textSize.value);
   drawPreview();
  }));
  textInput.addEventListener('input',()=>{state.text=textInput.value.trim();drawPreview();});
  textColor.addEventListener('input',()=>{state.textColor=textColor.value;drawPreview();});
  textStroke.addEventListener('input',()=>{state.textStroke=textStroke.value;drawPreview();});
  textPosition.addEventListener('change',()=>{state.textPosition=textPosition.value;drawPreview();});
  textAlign.addEventListener('change',()=>{state.textAlign=textAlign.value;drawPreview();});
  textFont.addEventListener('change',()=>{state.textFont=textFont.value;drawPreview();});
  let dragState=null;stage.style.touchAction='none';stage.style.cursor='grab';
  stage.addEventListener('pointerdown',event=>{
   if(event.button!==undefined&&event.button!==0)return;
   dragState={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,baseX:state.x,baseY:state.y};
   try{stage.setPointerCapture(event.pointerId)}catch{}stage.style.cursor='grabbing';event.preventDefault();
  });
  stage.addEventListener('pointermove',event=>{
   if(!dragState||dragState.pointerId!==event.pointerId)return;
   const rect=stage.getBoundingClientRect();if(!rect.width||!rect.height)return;
   state.x=Math.max(-100,Math.min(100,dragState.baseX+(event.clientX-dragState.startX)/rect.width*150));
   state.y=Math.max(-100,Math.min(100,dragState.baseY+(event.clientY-dragState.startY)/rect.height*150));
   xInput.value=String(Math.round(state.x));yInput.value=String(Math.round(state.y));drawPreview();
  });
  const endCropDrag=event=>{if(!dragState||event.pointerId!==dragState.pointerId)return;dragState=null;stage.style.cursor='grab';try{stage.releasePointerCapture(event.pointerId)}catch{}};
  stage.addEventListener('pointerup',endCropDrag);stage.addEventListener('pointercancel',endCropDrag);
  stage.addEventListener('lostpointercapture',()=>{dragState=null;stage.style.cursor='grab'});
  const filters={
   original:[100,100,100,0],vivid:[106,142,118,0],warm:[108,116,104,12],cool:[100,94,106,0],
   mono:[100,0,112,0],sepia:[104,92,104,75],soft:[108,84,88,0],cinema:[94,118,132,5],
   vintage:[105,78,105,30],summer:[112,135,110,0],night:[82,118,128,0],matte:[108,88,88,5],
   sunset:[112,128,108,26],arctic:[106,82,125,0],rose:[108,122,105,18],emerald:[102,128,115,0],
   golden:[113,124,106,24],lavender:[106,96,112,12],film:[96,108,120,18],noir:[91,0,142,0],
   neon:[108,155,128,0],pastel:[112,76,92,4],forest:[94,118,120,8],copper:[104,112,118,32]
  };
  dialog.querySelectorAll('[data-vatra-filter]').forEach(button=>button.addEventListener('click',()=>{
   dialog.querySelectorAll('[data-vatra-filter]').forEach(b=>b.classList.toggle('active',b===button));
   state.filter=button.dataset.vatraFilter;[state.brightness,state.saturation,state.contrast,state.sepia]=filters[state.filter]||filters.original;
   brightnessInput.value=String(state.brightness);saturationInput.value=String(state.saturation);contrastInput.value=String(state.contrast);drawPreview();
  }));
  dialog.querySelectorAll('[data-vatra-rotate]').forEach(button=>button.addEventListener('click',()=>{
   state.rotation=(state.rotation+Number(button.dataset.vatraRotate)+360)%360;drawPreview();
  }));
  dialog.querySelector('.vatra-image-editor-close').addEventListener('click',()=>finish(null));
  dialog.querySelector('[data-vatra-edit-cancel]').addEventListener('click',()=>finish(null));
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
  dialog.addEventListener('click',event=>{if(event.target===dialog)finish(null);});
  dialog.querySelector('[data-vatra-edit-apply]').addEventListener('click',async()=>{
   const button=dialog.querySelector('[data-vatra-edit-apply]');
   if(!preview.complete||!preview.naturalWidth){dialog.querySelector('.vatra-image-editor-status').textContent='Зачекайте, фото ще завантажується.';return;}
   button.disabled=true;button.textContent='Обробляємо…';
   try{
    const outW=mode==='cover'?1600:mode==='gallery'?1200:800;
    const outH=mode==='cover'?500:mode==='gallery'?900:800;
    const canvas=document.createElement('canvas');canvas.width=outW;canvas.height=outH;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Не вдалося обробити фото.');
    ctx.fillStyle='#f3f6fb';ctx.fillRect(0,0,outW,outH);
    const iw=preview.naturalWidth,ih=preview.naturalHeight,rad=state.rotation*Math.PI/180;
    const bw=iw*Math.abs(Math.cos(rad))+ih*Math.abs(Math.sin(rad));
    const bh=iw*Math.abs(Math.sin(rad))+ih*Math.abs(Math.cos(rad));
    const scale=Math.max(outW/bw,outH/bh)*state.zoom;
    ctx.save();ctx.translate(outW/2+state.x*outW*.0018,outH/2+state.y*outH*.0018);ctx.rotate(rad);
    ctx.filter='brightness('+state.brightness+'%) saturate('+state.saturation+'%) contrast('+state.contrast+'%) sepia('+state.sepia+'%)';
    ctx.drawImage(preview,-iw*scale/2,-ih*scale/2,iw*scale,ih*scale);ctx.restore();
    if(state.text){
     const maxWidth=outW*.88,lineHeight=state.textSize*1.25,words=state.text.split(/\s+/),lines=[];let line='';
     ctx.save();ctx.font='800 '+state.textSize+'px '+state.textFont+',sans-serif';ctx.textAlign=state.textAlign;ctx.textBaseline='middle';ctx.lineJoin='round';
     for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}
     if(line)lines.push(line);
     const startY=state.textPosition==='top'?outH*.12:state.textPosition==='center'?outH/2:outH*.88;
     const blockHeight=(lines.length-1)*lineHeight;
     ctx.shadowColor=state.textStroke;ctx.shadowBlur=7;ctx.lineWidth=Math.max(2,state.textSize*.13);ctx.strokeStyle=state.textStroke;ctx.fillStyle=state.textColor;
     const textX=state.textAlign==='left'?outW*.07:state.textAlign==='right'?outW*.93:outW/2;
     lines.forEach((txt,i)=>{const y=startY-blockHeight/2+i*lineHeight;ctx.strokeText(txt,textX,y,maxWidth);ctx.fillText(txt,textX,y,maxWidth);});
     ctx.restore();
    }
    const blob=await new Promise((ok,bad)=>canvas.toBlob(b=>b?ok(b):bad(new Error('Не вдалося підготувати фото.')),'image/jpeg',.9));
    const result=new File([blob],(file.name||'vatra-photo').replace(/\.[^.]+$/,'')+'-vatra.jpg',{type:'image/jpeg',lastModified:Date.now()});
    finish(result);
   }catch(error){dialog.querySelector('.vatra-image-editor-status').textContent=error.message||'Не вдалося обробити фото.';button.disabled=false;button.textContent='Застосувати фото';}
  });
  if(mode==='cover')stage.classList.add('is-cover');if(mode==='gallery')stage.classList.add('is-gallery');
  dialog.showModal();
 });
}
async function uploadAvatar(e){const f=e.target.files?.[0];if(!f)return;if(!authRequired())return;try{const edited=await getImageEditor(f,'avatar');if(!edited)return;toastMsg('Обробляємо фото…');const avatarUrl=await uploadImage(edited,512,.9,'avatars');const history=Array.isArray(currentProfile.avatarHistory)?currentProfile.avatarHistory.slice():[];if(currentProfile.avatarUrl&&currentProfile.avatarUrl!==avatarUrl)history.push(currentProfile.avatarUrl);const avatarHistory=history.filter((url,i,arr)=>url&&arr.indexOf(url)===i).slice(-30);await update(ref(db,`users/${currentUser.uid}`),{avatarUrl,avatarHistory});currentProfile.avatarUrl=avatarUrl;currentProfile.avatarHistory=avatarHistory;await set(ref(db,`publicProfiles/${currentUser.uid}`),publicProfileData(currentProfile));updateIdentity();render();toastMsg('Фото профілю збережено.');}catch(err){toastMsg(err.message||niceError(err));}finally{e.target.value='';}}
async function uploadCover(e){const f=e.target.files?.[0];if(!f)return;if(!authRequired())return;try{const edited=await getImageEditor(f,'cover');if(!edited)return;toastMsg('Обробляємо обкладинку…');const coverUrl=await uploadImage(edited,1600,.9,'covers');await update(ref(db,`users/${currentUser.uid}`),{coverUrl});currentProfile.coverUrl=coverUrl;await set(ref(db,`publicProfiles/${currentUser.uid}`),publicProfileData(currentProfile));render();toastMsg('Обкладинку профілю збережено.');}catch(err){toastMsg(err.message||niceError(err));}finally{e.target.value='';}}
async function uploadProfilePhoto(e){
 const input=e.currentTarget,files=Array.from(input.files||[]).filter(Boolean);
 if(!files.length)return;
 if(!authRequired()){input.value='';return;}
 if(files.length>10){toastMsg('Можна вибрати до 10 фотографій за раз.');input.value='';return;}
 const previous=Array.isArray(currentProfile.profilePhotos)?currentProfile.profilePhotos.slice():[];
 if(previous.length+files.length>40){toastMsg('В альбомі може бути до 40 фотографій.');input.value='';return;}
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
  const savedPhotos=[...new Set([...previous,...uploaded])].slice(-40);
  await update(ref(db,'users/'+currentUser.uid),{profilePhotos:savedPhotos,updatedAt:Date.now()});
  currentProfile.profilePhotos=savedPhotos;
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

let vatraSettingsSection='profile';
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
 const navTitle=document.createElement('div');navTitle.className='vatra-settings-nav-title';
 navTitle.innerHTML='<b>Особисті дані</b><small>Налаштування Вашої сторінки</small>';
 nav.append(navTitle);
 const backToProfile=$('#settingsBack');if(backToProfile)navTitle.append(backToProfile);
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
  const grid=makeCard(section,titles[section],'Необов’язкові приватні нотатки. Вони не публікуються у Вашому профілі.');
  for(const [key,labelText] of fields){
   const label=document.createElement('label');label.textContent=labelText;
   const textarea=document.createElement('textarea');textarea.name='private_'+key;textarea.maxLength=500;textarea.rows=2;textarea.placeholder='Не заповнено';textarea.value=String(currentProfile.privateSections?.[key]||'').slice(0,500);
   label.append(textarea);grid.append(label);
  }
 }
 sections.privacy.append(privacyCard,adminCard);
 sections.appearance.append(appearanceCard);
 const blocked=page.querySelector('.blocked-users-card'),legal=page.querySelector('.settings-legal-card');
 if(blocked)sections.privacy.append(blocked);
 if(legal)sections.documents.append(legal);
 const info=document.createElement('p');info.className='vatra-settings-private-note';info.textContent='Приватні поля зберігаються окремо від відкритої інформації профілю.';
 sections.service.append(info.cloneNode(true));
 sections.life.append(info);
 // Всі поля залишаються частиною однієї форми; перевірка значень уже виконується в обробнику збереження.
 form.noValidate=true;
 form.addEventListener('invalid',event=>{
  const section=event.target.closest('.vatra-settings-pane');
  if(section)choose(section.dataset.settingsSection);
 },true);
 choose(vatraSettingsSection);
}

function renderSettings(){const p=currentProfile||{};const [first='',...rest]=String(p.name||currentUser?.displayName||'').split(' ');const last=rest.join(' ');const dobInput=$('#settingsBirthday');setFeed(`<section class="settings-page"><div class="settings-intro"><div><p class="eyebrow">ВАША СТОРІНКА</p><h2>Налаштування профілю</h2><p>Ви вирішуєте, яку інформацію бачать інші та як Вас можуть знайти у ВАТРІ.</p></div><button class="pill" id="settingsBack">← До профілю</button></div><form id="profileSettingsForm" class="settings-form"><section class="settings-card"><h3>Фотографії</h3><p class="muted">Фото стискаються в браузері й зберігаються у файловому сховищі.</p><div class="settings-photo-row"><div class="settings-avatar" id="settingsAvatarPreview" style="${p.avatarUrl?`background-image:url('${esc(p.avatarUrl)}')`:''}">${p.avatarUrl?'':'В'}</div><div><label class="primary file-pick" for="settingsAvatarFile">Завантажити аватар</label><input id="settingsAvatarFile" type="file" accept="image/*" hidden><p class="field-hint">Рекомендовано квадратне фото. До 12 МБ перед стисканням.</p><button type="button" class="text-link" id="removeAvatar">Прибрати фото</button></div></div></section><section class="settings-card"><h3>Основна інформація</h3><div class="settings-grid"><label>Ім’я<input name="firstName" maxlength="40" required value="${esc(p.firstName||first)}"></label><label>Прізвище<input name="lastName" maxlength="40" required value="${esc(p.lastName||last)}"></label><label>Псевдонім (@)<input name="handle" maxlength="24" required value="${esc(p.handle||'')}"><small>2–24 символи: літери, цифри, крапка, _ або -</small></label><label>Місто / населений пункт<input name="city" maxlength="80" value="${esc(p.city||'')}" placeholder="Наприклад, Ужгород"></label><label class="span-two">Місце проживання / додатково<input name="location" maxlength="120" value="${esc(p.location||'')}" placeholder="Район, область або інший опис (необов’язково)"></label><label>Місце роботи<input name="workplace" maxlength="120" value="${esc(p.workplace||'')}" placeholder="Компанія або професія"></label><label>Місце навчання<input name="education" maxlength="120" value="${esc(p.education||'')}" placeholder="Заклад освіти"></label><label>Рідне місто<input name="hometown" maxlength="80" value="${esc(p.hometown||'')}" placeholder="Де Ви виросли"></label><label class="span-two">Про себе<textarea name="bio" maxlength="500" rows="4" placeholder="Розкажи трохи про себе…">${esc(p.bio||'')}</textarea><small>До 500 символів</small></label><label>Номер телефону<input id="settingsPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(p.pendingPhone||privatePendingPhone||p.phone||privatePhone||'')}" placeholder="+380XXXXXXXXX"><small>Новий номер зберігається до підтвердження; для активації надішліть SMS-код.</small><button class="text-link" type="button" id="sendPhoneVerification">Надіслати код на телефон</button><div id="phoneVerificationWrap" hidden><input id="phoneVerificationCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Код із SMS"><button class="pill" type="button" id="confirmPhoneVerification">Підтвердити номер</button></div><small id="phoneVerificationStatus" class="field-hint"></small></label><label>Дата народження<input id="settingsBirthday" name="dateOfBirth" type="date" min="1900-01-01" max="${localISODate()}" value="${esc(p.dateOfBirth||'')}"><small>Зберігається в приватному вузлі профілю.</small></label><label>Посилання на сайт<input name="website" type="url" maxlength="180" value="${esc(p.website||'')}" placeholder="https://…"></label></div></section><section class="settings-card official-admin-card" id="officialAdminCard" hidden><h3>Офіційні акаунти</h3><p class="muted">Цей розділ доступний лише адміністратору ВАТРИ. Позначка відображається біля імені та прізвища в дописах і профілі.</p><label>Акаунт для перевірки<select id="officialTargetUser"><option value="">Оберіть користувача…</option>${Object.entries(users||{}).filter(([uid,u])=>uid&&u&&u.name).sort((a,b)=>String(a[1].name).localeCompare(String(b[1].name),'uk')).map(([uid,u])=>'<option value="'+esc(uid)+'">'+esc(u.name)+' · @'+esc(u.handle||'user')+'</option>').join('')}</select></label><label class="settings-check"><input id="officialAccountToggle" type="checkbox"> Позначити як офіційний акаунт</label><button class="primary" id="saveOfficialAccount" type="button">Зберегти статус</button><p id="officialAccountStatus" class="field-hint">Оберіть акаунт, щоб переглянути його поточний статус.</p></section><section class="settings-card interface-settings-card"><h3>Вигляд ВАТРИ</h3><p class="muted">Налаштуйте читабельність, щільність сторінок і акцентний колір.</p><div class="settings-grid"><label>Розмір тексту<select name="fontScale"><option value="normal" ${(p.fontScale||'normal')==='normal'?'selected':''}>Звичайний</option><option value="large" ${p.fontScale==='large'?'selected':''}>Збільшений</option></select></label><label>Щільність сторінок<select name="contentDensity"><option value="comfortable" ${(p.contentDensity||'comfortable')==='comfortable'?'selected':''}>Зручна</option><option value="compact" ${p.contentDensity==='compact'?'selected':''}>Компактна</option></select></label><label>Акцентний колір<select name="accentColor"><option value="blue" ${(p.accentColor||'blue')==='blue'?'selected':''}>Синій ВАТРИ</option><option value="teal" ${p.accentColor==='teal'?'selected':''}>Бірюзовий</option><option value="violet" ${p.accentColor==='violet'?'selected':''}>Фіолетовий</option></select></label><label class="settings-check"><input type="checkbox" name="reduceMotion" ${p.reduceMotion===true?'checked':''}> Зменшити анімації</label></div></section><section class="settings-card"><h3>Приватність сторінки</h3><p class="muted">Ці параметри визначають поведінку інтерфейсу ВАТРИ. Приватні поля не показуються іншим без Вашого дозволу. Обмеження доступу додатково перевіряються на сервері.</p><div class="settings-grid"><label>Хто бачить сторінку<select name="profileVisibility"><option value="public" ${p.profileVisibility!=='private'?'selected':''}>Усі користувачі</option><option value="private" ${p.profileVisibility==='private'?'selected':''}>Закрита — лише друзі</option></select></label><label>Чи можна знайти мене в пошуку<select name="searchable"><option value="yes" ${p.searchable!==false?'selected':''}>Так, показувати в пошуку</option><option value="no" ${p.searchable===false?'selected':''}>Ні, не показувати</option></select></label><label>Дата народження у профілі<select name="birthdayVisibility"><option value="private" ${(p.birthdayVisibility||'private')==='private'?'selected':''}>Прихована</option><option value="friends" ${p.birthdayVisibility==='friends'?'selected':''}>Лише друзям</option><option value="public" ${p.birthdayVisibility==='public'?'selected':''}>Усім</option></select></label><label>Місто у профілі<select name="cityVisibility"><option value="private" ${(p.cityVisibility||'private')==='private'?'selected':''}>Приховане</option><option value="friends" ${p.cityVisibility==='friends'?'selected':''}>Лише друзям</option><option value="public" ${p.cityVisibility==='public'?'selected':''}>Усім</option></select></label><label>Місце проживання<select name="locationVisibility"><option value="private" ${(p.locationVisibility||'private')==='private'?'selected':''}>Приховане</option><option value="friends" ${p.locationVisibility==='friends'?'selected':''}>Лише друзям</option><option value="public" ${p.locationVisibility==='public'?'selected':''}>Усім</option></select></label><label>Номер телефону<select name="phoneVisibility"><option value="private" ${(p.phoneVisibility||'private')==='private'?'selected':''}>Прихований</option><option value="friends" ${p.phoneVisibility==='friends'?'selected':''}>Лише друзям</option><option value="public" ${p.phoneVisibility==='public'?'selected':''}>Усім</option></select><small>Показується лише якщо номер підтверджений і доступний у профілі.</small></label><label>Місце роботи<select name="workplaceVisibility"><option value="private" ${(p.workplaceVisibility||'private')==='private'?'selected':''}>Приховане</option><option value="friends" ${p.workplaceVisibility==='friends'?'selected':''}>Лише друзям</option><option value="public" ${p.workplaceVisibility==='public'?'selected':''}>Усім</option></select></label><label>Місце навчання<select name="educationVisibility"><option value="private" ${(p.educationVisibility||'private')==='private'?'selected':''}>Приховане</option><option value="friends" ${p.educationVisibility==='friends'?'selected':''}>Лише друзям</option><option value="public" ${p.educationVisibility==='public'?'selected':''}>Усім</option></select></label><label>Рідне місто<select name="hometownVisibility"><option value="private" ${(p.hometownVisibility||'private')==='private'?'selected':''}>Приховане</option><option value="friends" ${p.hometownVisibility==='friends'?'selected':''}>Лише друзям</option><option value="public" ${p.hometownVisibility==='public'?'selected':''}>Усім</option></select></label></div><label class="settings-check"><input type="checkbox" name="allowMessages" ${p.allowMessages!==false?'checked':''}> Дозволяти іншим користувачам писати мені</label></section><div class="settings-savebar"><span>Не забудьте зберегти зміни.</span><button class="primary" type="submit">Зберегти налаштування</button></div><p id="settingsError" class="auth-error" role="alert"></p></form><section class="settings-card blocked-users-card"><h3>Заблоковані користувачі</h3><p class="muted">Їхні дописи приховані, а повідомлення з ними зупинені.</p><div id="blockedUsersList"></div></section><section class="settings-card settings-legal-card"><h3>Документи ВАТРИ</h3><p class="muted">Переглядайте правила спільноти, умови користування та інформацію про обробку персональних даних.</p><div class="settings-legal-links"><a class="pill" href="#rules" data-legal-open="rules">Правила ВАТРИ</a><a class="pill" href="#privacy" data-legal-open="privacy">Політика конфіденційності</a><a class="pill" href="#terms" data-legal-open="terms">Умови використання</a></div></section></section>`);vatraOrganizeSettings();enhanceProfileDatePicker($('#settingsBirthday'));renderBlockedUsersList();$('#settingsBack').onclick=()=>goPage('profile');$('#sendPhoneVerification').onclick=async()=>{const phone=$('#settingsPhone').value.trim(),status=$('#phoneVerificationStatus'),btn=$('#sendPhoneVerification');if(!/^\+[1-9]\d{7,14}$/.test(phone)){status.textContent='Введіть номер у міжнародному форматі, наприклад +380XXXXXXXXX.';return;}btn.disabled=true;status.textContent='Надсилаємо SMS-код…';try{await updatePhoneNumber(phone);await update(ref(db,`privateUsers/${currentUser.uid}`),{pendingPhone:phone,updatedAt:Date.now()});privatePendingPhone=phone;currentProfile.pendingPhone=phone;$('#phoneVerificationWrap').hidden=false;status.textContent='Код надіслано. Перевірте SMS.';$('#confirmPhoneVerification').dataset.phone=phone;}catch(err){status.textContent=niceError(err);}finally{btn.disabled=false;}};
$('#confirmPhoneVerification').onclick=async()=>{const phone=$('#confirmPhoneVerification').dataset.phone,token=$('#phoneVerificationCode').value.trim(),status=$('#phoneVerificationStatus'),btn=$('#confirmPhoneVerification');if(!phone||!/^\d{4,8}$/.test(token)){status.textContent='Введіть код із SMS.';return;}btn.disabled=true;status.textContent='Перевіряємо код…';try{await verifyPhoneChange(phone,token);privatePhone=phone;privatePendingPhone='';currentProfile.phone=phone;currentProfile.pendingPhone='';await update(ref(db,'privateUsers/'+currentUser.uid),{dateOfBirth:privateDateOfBirth||null,phone:phone,pendingPhone:null,updatedAt:Date.now()});await set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile));await set(ref(db,'friendProfiles/'+currentUser.uid),friendProfileData(currentProfile));status.textContent='Номер підтверджено й збережено.';toastMsg('Номер телефону підтверджено.');}catch(err){status.textContent=niceError(err);}finally{btn.disabled=false;}};

get(ref(db,`admins/${currentUser.uid}`)).then(snap=>{const card=$('#officialAdminCard');if(!card)return;const isAdmin=snap.val()===true;if(isAdmin){card.hidden=false;const target=$('#officialTargetUser');if(target){target.value=currentUser.uid;$('#officialAccountToggle').checked=verifiedUsers?.[currentUser.uid]?.verified===true;$('#officialAccountStatus').textContent=$('#officialAccountToggle').checked?'Цей акаунт має офіційний статус.':'Цей акаунт поки не підтверджено.';target.onchange=()=>{const uid=target.value;$('#officialAccountToggle').checked=verifiedUsers?.[uid]?.verified===true;$('#officialAccountStatus').textContent=uid?(verifiedUsers?.[uid]?.verified===true?'Цей акаунт має офіційний статус.':'Цей акаунт поки не підтверджено.'):'Оберіть акаунт зі списку.';};}} }).catch(()=>{});
$('#saveOfficialAccount').onclick=async()=>{const targetUid=$('#officialTargetUser').value,enabled=$('#officialAccountToggle').checked,btn=$('#saveOfficialAccount'),status=$('#officialAccountStatus');if(!targetUid){status.textContent='Спочатку оберіть акаунт.';return;}btn.disabled=true;status.textContent='Зберігаємо статус…';try{await set(ref(db,`verifiedUsers/${targetUid}`),{verified:enabled,updatedAt:Date.now(),verifiedBy:currentUser.uid});status.textContent=enabled?'Офіційний статус увімкнено.':'Офіційний статус знято.';toastMsg(status.textContent);}catch(err){status.textContent='Не вдалося змінити статус. Перевірте права адміністратора.';toastMsg(niceError(err));}finally{btn.disabled=false;}};
$('#settingsAvatarFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{toastMsg('Стискаємо й зберігаємо фото…');const edited=await getImageEditor(f,'avatar');if(!edited)return;const avatarUrl=await uploadImage(edited,512,.9,'avatars');const history=Array.isArray(currentProfile.avatarHistory)?currentProfile.avatarHistory.slice():[];if(currentProfile.avatarUrl&&currentProfile.avatarUrl!==avatarUrl)history.push(currentProfile.avatarUrl);const avatarHistory=history.filter((url,i,arr)=>url&&arr.indexOf(url)===i).slice(-30);await update(ref(db,`users/${currentUser.uid}`),{avatarUrl,avatarHistory,updatedAt:Date.now()});currentProfile.avatarUrl=avatarUrl;currentProfile.avatarHistory=avatarHistory;await set(ref(db,`publicProfiles/${currentUser.uid}`),publicProfileData(currentProfile));const preview=$('#settingsAvatarPreview');preview.style.backgroundImage=`url('${avatarUrl}')`;preview.textContent='';updateIdentity();toastMsg('Аватар збережено. Попередні фото залишилися в історії профілю.');}catch(err){toastMsg(err.message||niceError(err));}finally{e.target.value='';}};$('#removeAvatar').onclick=async()=>{try{await update(ref(db,`users/${currentUser.uid}`),{avatarUrl:''});currentProfile.avatarUrl='';await set(ref(db,`publicProfiles/${currentUser.uid}`),publicProfileData(currentProfile));$('#settingsAvatarPreview').style.backgroundImage='';$('#settingsAvatarPreview').textContent=initials(currentProfile.name||'ВАТРА');updateIdentity();toastMsg('Фото прибрано.');}catch(e){toastMsg(niceError(e));}};$('#profileSettingsForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,fd=new FormData(f);const firstName=String(fd.get('firstName')||'').trim(),lastName=String(fd.get('lastName')||'').trim(),handle=String(fd.get('handle')||'').trim().replace(/^@/,''),bio=String(fd.get('bio')||'').trim(),city=String(fd.get('city')||'').trim(),location=String(fd.get('location')||'').trim(),website=String(fd.get('website')||'').trim(),workplace=String(fd.get('workplace')||'').trim(),education=String(fd.get('education')||'').trim(),hometown=String(fd.get('hometown')||'').trim(),submittedPhone=String(fd.get('phone')||'').trim(),dateOfBirth=String(fd.get('dateOfBirth')||'');if(firstName.length<2||lastName.length<2){$('#settingsError').textContent='Ім’я та прізвище мають містити щонайменше 2 символи.';return;}if((firstName+' '+lastName).length>40){$('#settingsError').textContent='Ім’я та прізвище разом мають бути не довші за 40 символів.';return;}if(!/^[\p{L}\p{N}._-]{2,24}$/u.test(handle)){ $('#settingsError').textContent='Перевірте псевдонім: 2–24 символи, літери, цифри, крапка, _ або -.';return;}if(website&&!/^https?:\/\//i.test(website)){ $('#settingsError').textContent='Посилання має починатися з https:// або http://.';return;}if(dateOfBirth){const bd=new Date(dateOfBirth+'T00:00:00'),now=new Date();if(Number.isNaN(bd.getTime())||bd>now){$('#settingsError').textContent='Перевірте дату народження.';return;}let age=now.getFullYear()-bd.getFullYear();if(now.getMonth()<bd.getMonth()||(now.getMonth()===bd.getMonth()&&now.getDate()<bd.getDate()))age--;if(age<13){$('#settingsError').textContent='ВАТРА доступна з 13 років.';return;}}const values={firstName,lastName,name:`${firstName} ${lastName}`,handle,bio:bio.slice(0,500),city,location,website,workplace:workplace.slice(0,120),education:education.slice(0,120),hometown:hometown.slice(0,80),profileVisibility:fd.get('profileVisibility')==='private'?'private':'public',searchable:fd.get('searchable')!=='no',birthdayVisibility:String(fd.get('birthdayVisibility')||'private'),birthdayPublic:(String(fd.get('birthdayVisibility')||'private')==='public'?dateOfBirth:''),cityVisibility:String(fd.get('cityVisibility')||'private'),locationVisibility:String(fd.get('locationVisibility')||'private'),phoneVisibility:String(fd.get('phoneVisibility')||'private'),workplaceVisibility:String(fd.get('workplaceVisibility')||'private'),educationVisibility:String(fd.get('educationVisibility')||'private'),hometownVisibility:String(fd.get('hometownVisibility')||'private'),allowMessages:fd.get('allowMessages')==='on',fontScale:fd.get('fontScale')==='large'?'large':'normal',contentDensity:fd.get('contentDensity')==='compact'?'compact':'comfortable',accentColor:['teal','violet'].includes(fd.get('accentColor'))?fd.get('accentColor'):'blue',reduceMotion:fd.get('reduceMotion')==='on',updatedAt:Date.now()};if(submittedPhone&&submittedPhone!==privatePhone&&!/^\+[1-9]\d{7,14}$/.test(submittedPhone)){ $('#settingsError').textContent='Введіть номер у міжнародному форматі, наприклад +380XXXXXXXXX. Після збереження його потрібно буде підтвердити SMS-кодом.';return;}const pendingPhone=submittedPhone&&submittedPhone!==privatePhone?submittedPhone:'';const privateSections={};for(const key of ['hobbies','activities','music','films','books','games','serviceNotes','lifeNotes','values','inspiration'])privateSections[key]=String(fd.get('private_'+key)||'').trim().slice(0,500);try{const btn=f.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Зберігаємо…';await updateProfile(currentUser,{displayName:values.name});await update(ref(db,`users/${currentUser.uid}`),values);currentProfile={...currentProfile,...values};await set(ref(db,`publicProfiles/${currentUser.uid}`),publicProfileData(currentProfile));await update(ref(db,`privateUsers/${currentUser.uid}`),{dateOfBirth:dateOfBirth||null,phone:privatePhone||null,pendingPhone:pendingPhone||null,privateSections,updatedAt:Date.now()});privateProfileSections=privateSections;currentProfile.privateSections=privateSections;privatePendingPhone=pendingPhone;privateDateOfBirth=dateOfBirth;currentProfile={...currentProfile,...values,dateOfBirth,phone:privatePhone,pendingPhone:privatePendingPhone};await set(ref(db,`publicProfiles/${currentUser.uid}`),publicProfileData(currentProfile));await set(ref(db,`friendProfiles/${currentUser.uid}`),friendProfileData(currentProfile));updateIdentity();if(pendingPhone){goPage('settings');const phoneStatus=$('#phoneVerificationStatus');if(phoneStatus)phoneStatus.textContent='Номер збережено як непідтверджений. Натисніть «Надіслати код на телефон», щоб підтвердити його.';toastMsg('Зміни збережено. Номер залишився в налаштуваннях і очікує підтвердження SMS.');}else{toastMsg('Налаштування профілю збережено.');goPage('profile');}}catch(err){$('#settingsError').textContent=niceError(err); }finally{const btn=f.querySelector('[type=submit]');if(btn){btn.disabled=false;btn.textContent='Зберегти налаштування';}}};}
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

$('#postForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!authRequired())return;
 const postError=$('#postError');if(postError){postError.hidden=true;postError.textContent='';}
 const text=$('#postText').value.trim(),pollVisible=!$('#pollComposer').hidden,entered=pollVisible?[...$('#pollOptionFields').querySelectorAll('input')].map(input=>input.value.trim()).filter(Boolean):[];
 if(entered.length===1)return toastMsg('Для опитування додайте щонайменше 2 варіанти.');
 if(!text&&!imageFiles.length&&!entered.length)return toastMsg('Додайте текст, фото або опитування.');
 if(text.length>MAX_POST_TEXT)return toastMsg('Максимальна довжина допису — 20 000 символів.');
 const pollOptions=entered.length>=2?Object.fromEntries(entered.map((label,index)=>['option_'+(index+1),label.slice(0,80)])):null;
 const btn=e.submitter||e.currentTarget.querySelector('[type="submit"]');btn.disabled=true;btn.textContent='Публікуємо…';
 try{
  const pRef=push(ref(db,'posts')),imageUrls=[];
  for(const file of imageFiles)imageUrls.push(await uploadImage(file,1600,.84,'posts'));
  const postData={authorUid:String(currentUser.uid),authorName:currentProfile.name||currentUser.displayName||'Користувач ВАТРИ',authorHandle:currentProfile.handle||'user',authorAvatar:currentProfile.avatarUrl||'',text,imageUrl:imageUrls[0]||'',imageUrls,visibility:'public',createdAt:Date.now(),updatedAt:Date.now()};
  if(!postData.authorUid)throw new Error('Сесія завершилася. Увійдіть у ВАТРУ ще раз.');
  if(pollOptions)postData.pollOptions=pollOptions;
  await createPost(pRef,postData);
  filter='all';query='';$('#search').value='';$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));
  goPage('feed');modal.close();imageFiles=[];clearComposerPhotoPreviews();$('#photo').value='';$('#modalPhoto').value='';toastMsg('Допис опубліковано!');
 }catch(err){
  console.error('VATRA post publish failed:',err?.dbCode||err?.code||err);
  const message=niceError(err);if(postError){postError.textContent=message;postError.hidden=false;}else toastMsg(message);
 }finally{btn.disabled=false;btn.textContent='Опублікувати';}
});
$$('[data-page]').forEach(b=>b.addEventListener('click',()=>goPage(b.dataset.page)));$$('.tab').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;goPage('feed');});$('#search').addEventListener('input',e=>{query=e.target.value.trim();profileAttributeSearch=null;if(query){if(page!=='explore')goPage('explore');else render();}else{if(page==='explore')render();else if(page==='saved'||page==='profile')goPage('feed');else render();}});$('#search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();goPage('explore');}});$('#moment')?.addEventListener('click',openComposer);$$('[data-action="compose"]').forEach(b=>b.addEventListener('click',openComposer));$$('[data-tag]').forEach(b=>b.addEventListener('click',()=>{query=b.dataset.tag;$('#search').value=query;goPage('feed');}));
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
 b=e.target.closest('[data-remove-friend]');if(b){const uid=b.dataset.removeFriend;if(!(await askConfirm('Видалити цю людину з друзів?')))return;try{await Promise.all([remove(ref(db,`friends/${currentUser.uid}/${uid}`)),remove(ref(db,`friends/${uid}/${currentUser.uid}`)),remove(ref(db,`friendRequests/${currentUser.uid}/${uid}`)),remove(ref(db,`friendRequests/${uid}/${currentUser.uid}`))]);toastMsg('Друга видалено зі списку.');}catch(err){toastMsg(niceError(err));}return;}
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
 b=e.target.closest('[data-view-profile]');if(b){renderPublicProfile(b.dataset.viewProfile);return;}b=e.target.closest('[data-friend-request]');if(b){if(!authRequired())return;const uid=b.dataset.friendRequest;try{if(friends[uid])return toastMsg('Ви вже друзі.');await set(ref(db,`friendRequests/${uid}/${currentUser.uid}`),{from:currentUser.uid,to:uid,status:'pending',direction:'incoming',createdAt:Date.now()});await set(ref(db,`friendRequests/${currentUser.uid}/${uid}`),{from:currentUser.uid,to:uid,status:'pending',direction:'outgoing',createdAt:Date.now()});toastMsg('Запит у друзі надіслано.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-accept-friend]');if(b){
 const uid=b.dataset.acceptFriend,request=friendRequests[uid];
 if(!uid||!request||request.status!=='pending'||request.direction!=='incoming')return toastMsg('Цей запит уже неактуальний. Оновіть список друзів.');
 b.disabled=true;b.textContent='Додаємо…';
 try{
  await update(ref(db,`friends/${currentUser.uid}`),{[uid]:true});
  await update(ref(db,`friends/${uid}`),{[currentUser.uid]:true});
  await remove(ref(db,`friendRequests/${currentUser.uid}/${uid}`));
  friends[uid]=true;delete friendRequests[uid];renderFriends();updateNotificationBadges();
  try{await remove(ref(db,`friendRequests/${uid}/${currentUser.uid}`));}
  catch(cleanupError){console.warn('Could not remove sender-side friend request mirror:',cleanupError);}
  toastMsg('Запит прийнято. Ви тепер друзі.');
 }catch(err){toastMsg(niceError(err));renderFriends();}
 return;
}b=e.target.closest('[data-decline-friend]');if(b){const uid=b.dataset.declineFriend;try{await remove(ref(db,`friendRequests/${currentUser.uid}/${uid}`));await remove(ref(db,`friendRequests/${uid}/${currentUser.uid}`));toastMsg('Запит відхилено.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-poll-vote]');if(b){if(!authRequired())return;const postId=b.dataset.pollVote,option=b.dataset.option,choices=posts[postId]?.pollOptions||{};if(!Object.prototype.hasOwnProperty.call(choices,option))return toastMsg('Цей варіант опитування недоступний.');try{await set(ref(db,'pollVotes/'+postId+'/'+currentUser.uid),option);toastMsg('Ваш голос зараховано.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-like]');if(b){if(!authRequired())return;const id=b.dataset.like,path=`postLikes/${id}/${currentUser.uid}`;try{if(likes[id]?.[currentUser.uid])await remove(ref(db,path));else await set(ref(db,path),{createdAt:Date.now()});}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-save]');if(b){if(!authRequired())return;const id=b.dataset.save,path=`saved/${currentUser.uid}/${id}`,publicIndex=`postSaves/${id}/${currentUser.uid}`;try{if(saved[id]){await remove(ref(db,path));try{await remove(ref(db,publicIndex));}catch(indexError){console.warn('Save counter index unavailable:',indexError);}}else{await set(ref(db,path),true);try{await set(ref(db,publicIndex),{createdAt:Date.now()});}catch(indexError){console.warn('Save counter index unavailable:',indexError);}}}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-comment]');if(b){if(!authRequired())return;const p=posts[b.dataset.comment];if(p)p.commentOpen=!p.commentOpen;render();$(`[data-form="${CSS.escape(b.dataset.comment)}"] input`)?.focus();return;}b=e.target.closest('[data-share]');if(b){const id=b.dataset.share,url=`${location.origin}${location.pathname}#post-${encodeURIComponent(id)}`;let didShare=false;try{if(navigator.share){await navigator.share({title:'ВАТРА',text:posts[id]?.text||'Допис у ВАТРІ',url});didShare=true;}else{await navigator.clipboard.writeText(url);didShare=true;toastMsg('Посилання скопійовано.');}}catch{}if(didShare&&currentUser){try{const path=`postShares/${id}/${currentUser.uid}`,existing=await get(ref(db,path));if(!existing.exists())await set(ref(db,path),{createdAt:Date.now()});}catch(error){console.warn('Share index unavailable; apply app-data-schema.sql:',error);}}return;}b=e.target.closest('[data-delete]');if(b){if(!authRequired()||!(await askConfirm('Видалити цей допис?')))return;const id=b.dataset.delete;try{const likeIds=Object.keys(likes[id]||{}),commentIds=Object.keys(comments[id]||{});await Promise.all([...likeIds.map(uid=>remove(ref(db,`postLikes/${id}/${uid}`))),...commentIds.map(cid=>remove(ref(db,`comments/${id}/${cid}`))),remove(ref(db,`pollVotes/${id}`))]);await remove(ref(db,`posts/${id}`));toastMsg('Допис видалено.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-follow]');if(b){if(!authRequired())return;const uid=b.dataset.follow,path=`following/${currentUser.uid}/${uid}`;try{if(following[uid])await remove(ref(db,path));else await set(ref(db,path),true);toastMsg(following[uid]?'Ви відписалися.':'Ви підписалися!');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-message-user]');if(b){startChatWith(b.dataset.messageUser);return;}b=e.target.closest('[data-join-group]');if(b){if(!authRequired())return;const id=b.dataset.joinGroup,path=`groupMembers/${id}/${currentUser.uid}`;try{if(groupMembers[id]?.[currentUser.uid]){if(groups[id]?.ownerUid===currentUser.uid)return toastMsg('Творець не може вийти зі своєї спільноти.');if(groupAdmins[id]?.[currentUser.uid])await remove(ref(db,`groupAdmins/${id}/${currentUser.uid}`));await remove(ref(db,path));}else await set(ref(db,path),true);toastMsg(groupMembers[id]?.[currentUser.uid]?'Ви вийшли зі спільноти.':'Ви приєдналися до спільноти!');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-manage-group]');if(b){openGroupSettings(b.dataset.manageGroup);return;}b=e.target.closest('[data-open-group]');if(b){renderGroupDetails(b.dataset.openGroup);return;}b=e.target.closest('[data-edit-group]');if(b){editGroup(b.dataset.editGroup);return;}b=e.target.closest('[data-delete-group]');if(b){if(groups[b.dataset.deleteGroup]?.ownerUid!==currentUser?.uid)return toastMsg('Видалити може лише творець спільноти.');if(!(await askConfirm('Видалити спільноту?')))return;const id=b.dataset.deleteGroup;try{await set(ref(db,`groupMembers/${id}/${currentUser.uid}`),true);const adminIds=Object.keys(groupAdmins[id]||{}).filter(uid=>uid!==currentUser.uid),memberIds=Object.keys(groupMembers[id]||{}).filter(uid=>uid!==currentUser.uid),postIds=Object.keys(groupPostsCache[id]||{});await Promise.all(adminIds.map(uid=>remove(ref(db,`groupAdmins/${id}/${uid}`))));await Promise.all([...memberIds.map(uid=>remove(ref(db,`groupMembers/${id}/${uid}`))),...postIds.map(pid=>remove(ref(db,`groupPosts/${id}/${pid}`)))]);await remove(ref(db,`groupMembers/${id}/${currentUser.uid}`));await remove(ref(db,`groups/${id}`));toastMsg('Спільноту видалено.');}catch(err){toastMsg(niceError(err));}return;}b=e.target.closest('[data-delete-video]');if(b){if(!(await askConfirm('Видалити відео?')))return;try{await remove(ref(db,`videos/${b.dataset.deleteVideo}`));toastMsg('Відео видалено.');}catch(err){toastMsg(niceError(err));}return;}});
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
  await update(ref(db,'posts/'+id),{text,imageUrl:imageUrls[0]||'',imageUrls,editedAt:Date.now(),updatedAt:Date.now()});
  editingPostId=null;editPostFiles=[];clearEditPostPreviews();toastMsg('Допис оновлено.');render();
 }catch(err){toastMsg(niceError(err));}
 finally{if(submit){submit.disabled=false;submit.textContent='Зберегти зміни';}}
 return;
}const edit=e.target.closest('[data-edit-message-form]');if(edit){
 e.preventDefault();
 const text=String(new FormData(edit).get('text')||'').trim();
 if(!text)return toastMsg('Повідомлення не може бути порожнім.');
 const key=chatKey(currentUser.uid,activeChat),session=activeSecureSession;
 if(!session||session.chatId!==key)return toastMsg('Без захищеного ключа редагування повідомлень недоступне.');
 try{
  const path='chats/'+key+'/messages/'+edit.dataset.editMessageForm;
  const previous=(await get(ref(db,path))).val();
  if(!previous||previous.senderUid!==currentUser.uid)throw new Error('Редагувати можна лише власне повідомлення.');
  const encrypted=await encryptMessage(session,text,currentUser.uid,Number(previous.createdAt));
  await set(ref(db,path),{senderUid:currentUser.uid,createdAt:previous.createdAt,encrypted,editedAt:Date.now()});
  editingMessageId=null;
  await syncChatPreview(key,activeChat);
  renderChatBubbles(key);
 }catch(error){toastMsg('Не вдалося зберегти захищене повідомлення: '+(error?.message||niceError(error)));}
 return;
}const form=e.target.closest('[data-form]');if(!form)return;e.preventDefault();if(!authRequired())return;const text=new FormData(form).get('comment').trim();if(!text)return;const id=form.dataset.form;try{await set(push(ref(db,`comments/${id}`)),{uid:currentUser.uid,name:currentProfile.name||currentUser.displayName||'Користувач',avatarUrl:currentProfile.avatarUrl||'',text,createdAt:Date.now()});if(posts[id])posts[id].commentOpen=false;render();}catch(err){toastMsg(niceError(err));}});
$('#reportCancel').onclick=()=>$('#reportDialog').close();$('#reportClose').onclick=()=>$('#reportDialog').close();$('#reportDialog').addEventListener('close',()=>{reportingTarget=null;$('#reportForm').reset();$('#reportError').textContent='';});$('#reportForm').addEventListener('submit',async e=>{e.preventDefault();if(!authRequired()||!reportingTarget)return;const fd=new FormData(e.currentTarget),target=reportingTarget,path=`reports/${currentUser.uid}/${target.type}/${target.id}`,reason=String(fd.get('reason')||''),details=String(fd.get('details')||'').trim().slice(0,500),button=e.currentTarget.querySelector('[type=submit]');button.disabled=true;button.textContent='Надсилаємо…';try{const existing=await get(ref(db,path));if(existing.exists()){toastMsg('Ви вже надсилав(-ла) скаргу на цей матеріал.');$('#reportDialog').close();return;}await set(ref(db,path),{reporterUid:currentUser.uid,targetType:target.type,targetId:target.id,reason,details,createdAt:Date.now()});$('#reportDialog').close();toastMsg('Скаргу збережено. Перегляд модератором потребує серверної черги.');}catch(err){$('#reportError').textContent=niceError(err);}finally{button.disabled=false;button.textContent='Надіслати скаргу';}});
onAuthStateChanged(auth,user=>{if(!user){location.replace('auth.html');return;}chatLiveIndex={};chatOwnedIndex={};chatIndex={};currentUser=user;startPresence();ensureIdentity(user.uid,readE2EEKey,publishE2EEKey).catch(error=>console.warn('VATRA E2EE identity not ready:',error?.code||'unavailable'));const guideKey='vatra-guide-completed-v2-'+user.uid;let locallyCompleted=false;try{locallyCompleted=localStorage.getItem(guideKey)==='1';}catch{}if(!locallyCompleted){get(ref(db,'privateUsers/'+user.uid+'/vatraGuideCompletedAt')).then(snap=>{if(snap.exists()){try{localStorage.setItem(guideKey,'1')}catch{}return;}setTimeout(()=>{if(currentUser?.uid===user.uid)openVatraGuide()},900);}).catch(()=>{setTimeout(()=>{if(currentUser?.uid===user.uid)openVatraGuide()},900);});}currentProfile={};privateProfileSections={};privateDateOfBirth='';activityReadAt=0;chatReads={};saved={};following={};blockedUsers={};activeProfileUid=null;activeChatBlocked=false;if(user){get(ref(db,`privateUsers/${user.uid}`)).then(async ps=>{privateDateOfBirth=ps.val()?.dateOfBirth||user.user_metadata?.dateOfBirth||'';privatePhone=ps.val()?.phone||user.phone||'';privatePendingPhone=ps.val()?.pendingPhone||'';privateProfileSections=ps.val()?.privateSections||{};currentProfile.privateSections=privateProfileSections;if(!ps.exists()&&privateDateOfBirth)await set(ref(db,`privateUsers/${user.uid}`),{dateOfBirth:privateDateOfBirth,updatedAt:Date.now()});currentProfile.dateOfBirth=privateDateOfBirth;currentProfile.phone=privatePhone;currentProfile.pendingPhone=privatePendingPhone;const pd=publicProfileData(currentProfile),fd=friendProfileData(currentProfile);if(JSON.stringify(users[user.uid]||{})!==JSON.stringify(pd))set(ref(db,`publicProfiles/${user.uid}`),pd).catch(()=>{});if(JSON.stringify(friendProfiles[user.uid]||{})!==JSON.stringify(fd))set(ref(db,`friendProfiles/${user.uid}`),fd).catch(()=>{});if(page==='settings')renderSettings();else if(page==='profile')renderProfile();}).catch(()=>{});listenData();get(ref(db,`users/${user.uid}`)).then(async snap=>{if(snap.exists())return;const meta=user.user_metadata||{},name=meta.name||meta.displayName||user.displayName||'Користувач ВАТРИ',handle=(meta.firstName&&meta.lastName?meta.firstName+'.'+meta.lastName:name).toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/giu,'.').slice(0,24);const profile={name,firstName:meta.firstName||name.split(' ')[0],lastName:meta.lastName||name.split(' ').slice(1).join(' '),handle,bio:'',birthdayVisibility:'private',profileVisibility:'public',searchable:true,createdAt:Date.now()};await set(ref(db,`users/${user.uid}`),profile);await set(ref(db,`publicProfiles/${user.uid}`),publicProfileData(profile));}).catch(e=>console.warn('Profile init:',e));}else{stopListeners();stopChatListener();if(groupDetailsUnsub){groupDetailsUnsub();groupDetailsUnsub=null;}posts={};likes={};comments={};postSaves={};postShares={};saved={};following={};blockedUsers={};users={};videos={};groups={};groupAdmins={};groupModerators={};chatIndex={};activeChat=null;activeProfileUid=null;activeChatBlocked=false;}updateIdentity();render();});
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
  const rows=items.map(n=>{
   const u=users[n.actorUid]||{},name=esc(u.name||'Користувач ВАТРИ'),when=timeAgo(n.createdAt);let title='',attr='';
   if(n.type==='like'){title=name+' вподобав(-ла) Ваш допис';attr='data-notification-post="'+esc(n.postId)+'"';}
   else if(n.type==='comment'){title=name+' прокоментував(-ла) допис';attr='data-notification-post="'+esc(n.postId)+'"';}
   else if(n.type==='friend'){title=name+' надіслав(-ла) запит у друзі';attr='data-notification-friends="true"';}
   else{title='Нове повідомлення від '+name;attr='data-notification-chat="'+esc(n.chatUid)+'"';}
   return '<button type="button" class="topbar-notification-row '+(n.unread?'is-unread':'')+'" '+attr+'>'+avatar(u.name||'Користувач',u.avatarUrl)+'<span><b>'+title+'</b><small>'+when+'</small></span>'+(n.unread?'<i></i>':'')+'</button>';
  }).join('');
  box.innerHTML='<div class="topbar-popover-head"><div><b>Сповіщення</b><small>'+items.filter(n=>n.unread).length+' нових</small></div><button type="button" class="text-link" data-notifications-view-all>Усі</button></div>'+(rows||'<p class="topbar-popover-empty">Поки немає сповіщень.</p>');
 }
 function renderAccountDropdown(){
  const box=q('#accountDropdown');if(!box)return;
  const name=currentProfile.name||currentUser?.displayName||'Мій акаунт';
  box.innerHTML=currentUser
   ?'<div class="account-popover-profile">'+avatar(name,currentProfile.avatarUrl)+'<span><b>'+esc(name)+'</b><small>@'+esc(currentProfile.handle||'user')+'</small></span></div><button type="button" data-account-action="profile"><span>♙</span>Мій профіль</button><button type="button" data-account-action="settings"><span>⚙</span>Налаштування</button><button type="button" class="account-logout" data-account-action="logout"><span>↪</span>Вийти з акаунта</button>'
   :'<button type="button" data-account-action="login">Увійти</button><button type="button" data-account-action="register">Створити акаунт</button>';
 }
 const bell=q('#notificationBell'),avatarButton=q('#topAvatar');
 bell?.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  const box=q('#notificationDropdown'),willOpen=!!box?.hidden;closeTopbarMenus();
  if(box&&willOpen){renderNotificationDropdown();box.hidden=false;bell.setAttribute('aria-expanded','true');}
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
 function getImageEditor(){
  let dialog=q('#vatraImageEditor');if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.id='vatraImageEditor';dialog.className='vatra-image-editor';
  dialog.innerHTML='<form class="vatra-image-editor-form"><div class="vatra-image-editor-head"><div><p class="eyebrow">РЕДАКТОР ФОТО</p><h2 id="vatraImageEditorTitle">Редагувати зображення</h2></div><button type="button" class="vatra-image-editor-close" aria-label="Закрити">×</button></div><div class="vatra-image-editor-layout"><div class="vatra-image-stage"><img id="vatraImageEditorPreview" alt="Попередній перегляд фото"></div><div class="vatra-image-editor-tools"><b>Фільтри</b><div class="vatra-photo-filters"><button type="button" data-photo-filter="normal" class="active">Оригінал</button><button type="button" data-photo-filter="vivid">Яскравий</button><button type="button" data-photo-filter="warm">Теплий</button><button type="button" data-photo-filter="mono">Ч/Б</button><button type="button" data-photo-filter="soft">М’який</button><button type="button" data-photo-filter="cool">Холодний</button></div><label class="vatra-editor-range">Масштаб <output id="vatraZoomValue">1.00×</output><input id="vatraPhotoZoom" type="range" min="1" max="2.5" step="0.05" value="1"></label><label class="vatra-editor-range">Горизонтальне обрізання <output id="vatraXValue">50%</output><input id="vatraPhotoX" type="range" min="0" max="100" value="50"></label><label class="vatra-editor-range">Вертикальне обрізання <output id="vatraYValue">50%</output><input id="vatraPhotoY" type="range" min="0" max="100" value="50"></label><button type="button" class="pill vatra-photo-rotate" id="vatraPhotoRotate">↻ Повернути на 90°</button><p class="field-hint">Перетягуйте повзунки, щоб вибрати частину зображення. Обробка відбувається у Вашому браузері.</p></div></div><div class="vatra-image-editor-actions"><button type="button" class="pill" id="vatraPhotoCancel">Скасувати</button><button type="submit" class="primary" id="vatraPhotoSave">Зберегти фото</button></div></form>';
  document.body.append(dialog);
  dialog.querySelector('.vatra-image-editor-close').addEventListener('click',()=>dialog.close());
  dialog.querySelector('#vatraPhotoCancel').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{if(activeEdit?.objectUrl)URL.revokeObjectURL(activeEdit.objectUrl);activeEdit=null;dialog.classList.remove('is-cover');});
  dialog.querySelectorAll('[data-photo-filter]').forEach(button=>button.addEventListener('click',()=>{
   if(!activeEdit)return;activeEdit.filter=button.dataset.photoFilter;
   dialog.querySelectorAll('[data-photo-filter]').forEach(x=>x.classList.toggle('active',x===button));updatePhotoPreview();
  }));
  ['#vatraPhotoZoom','#vatraPhotoX','#vatraPhotoY'].forEach(id=>dialog.querySelector(id).addEventListener('input',()=>{
   if(!activeEdit)return;
   activeEdit.zoom=Number(dialog.querySelector('#vatraPhotoZoom').value);activeEdit.x=Number(dialog.querySelector('#vatraPhotoX').value);activeEdit.y=Number(dialog.querySelector('#vatraPhotoY').value);
   text(dialog.querySelector('#vatraZoomValue'),activeEdit.zoom.toFixed(2)+'×');text(dialog.querySelector('#vatraXValue'),activeEdit.x+'%');text(dialog.querySelector('#vatraYValue'),activeEdit.y+'%');updatePhotoPreview();
  }));
  dialog.querySelector('#vatraPhotoRotate').addEventListener('click',()=>{if(!activeEdit)return;activeEdit.rotate=(activeEdit.rotate+90)%360;updatePhotoPreview();});
  dialog.querySelector('form').addEventListener('submit',async event=>{
   event.preventDefault();if(!activeEdit||!authRequired())return;
   const save=dialog.querySelector('#vatraPhotoSave'),oldLabel=save.textContent;save.disabled=true;save.textContent='Обробляємо…';
   try{
    const state=activeEdit,isAvatar=state.target==='avatar',width=isAvatar?1000:1600,height=isAvatar?1000:500;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Не вдалося запустити редактор зображень.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.filter=photoFilters[state.filter]||'none';
    const rotated=state.rotate%180!==0,displayW=rotated?state.image.naturalHeight:state.image.naturalWidth,displayH=rotated?state.image.naturalWidth:state.image.naturalHeight;
    const scale=Math.max(width/displayW,height/displayH)*state.zoom,destW=displayW*scale,destH=displayH*scale;
    const offsetX=(width-destW)*(state.x/100),offsetY=(height-destH)*(state.y/100);
    ctx.save();ctx.translate(offsetX+destW/2,offsetY+destH/2);ctx.rotate(state.rotate*Math.PI/180);
    ctx.drawImage(state.image,-state.image.naturalWidth*scale/2,-state.image.naturalHeight*scale/2,state.image.naturalWidth*scale,state.image.naturalHeight*scale);ctx.restore();ctx.filter='none';
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Не вдалося підготувати обрізане фото.')),'image/jpeg',.9));
    const file=new File([blob],'vatra-'+state.target+'-'+Date.now()+'.jpg',{type:'image/jpeg',lastModified:Date.now()});
    if(isAvatar){
     const avatarUrl=await uploadImage(file,512,.84,'avatars'),history=Array.isArray(currentProfile.avatarHistory)?currentProfile.avatarHistory.slice():[];
     if(currentProfile.avatarUrl&&currentProfile.avatarUrl!==avatarUrl)history.push(currentProfile.avatarUrl);
     const avatarHistory=history.filter((url,i,arr)=>url&&arr.indexOf(url)===i).slice(-30);
     await update(ref(db,'users/'+currentUser.uid),{avatarUrl,avatarHistory});currentProfile.avatarUrl=avatarUrl;currentProfile.avatarHistory=avatarHistory;
     await set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile));updateIdentity();toastMsg('Фото профілю збережено.');
    }else{
     const coverUrl=await uploadImage(file,1500,.84,'covers');await update(ref(db,'users/'+currentUser.uid),{coverUrl});currentProfile.coverUrl=coverUrl;
     await set(ref(db,'publicProfiles/'+currentUser.uid),publicProfileData(currentProfile));toastMsg('Обкладинку збережено.');
    }
    dialog.close();render();
   }catch(error){toastMsg(error.message||niceError(error));}
   finally{save.disabled=false;save.textContent=oldLabel;}
  });
  return dialog;
 }
 function updatePhotoPreview(){
  if(!activeEdit)return;const image=q('#vatraImageEditorPreview');if(!image)return;
  image.style.filter=photoFilters[activeEdit.filter]||'none';image.style.objectPosition=activeEdit.x+'% '+activeEdit.y+'%';image.style.transform='scale('+activeEdit.zoom+') rotate('+activeEdit.rotate+'deg)';
 }
 function openPhotoEditor(file,target){
  if(!file||!file.type?.startsWith('image/'))return toastMsg('Оберіть файл зображення.');
  if(file.size>15*1024*1024)return toastMsg('Фото має бути меншим за 15 МБ.');
  const dialog=getImageEditor(),objectUrl=URL.createObjectURL(file),image=new Image();dialog.classList.toggle('is-cover',target==='cover');
  image.onload=()=>{
   activeEdit={file,target,image,objectUrl,filter:'normal',zoom:1,x:50,y:50,rotate:0};
   const preview=dialog.querySelector('#vatraImageEditorPreview');preview.src=objectUrl;preview.style.objectFit='cover';
   text(dialog.querySelector('#vatraImageEditorTitle'),target==='avatar'?'Обрізати фото профілю':'Обрізати обкладинку');
   dialog.querySelector('#vatraPhotoZoom').value='1';dialog.querySelector('#vatraPhotoX').value='50';dialog.querySelector('#vatraPhotoY').value='50';
   text(dialog.querySelector('#vatraZoomValue'),'1.00×');text(dialog.querySelector('#vatraXValue'),'50%');text(dialog.querySelector('#vatraYValue'),'50%');
   dialog.querySelectorAll('[data-photo-filter]').forEach(b=>b.classList.toggle('active',b.dataset.photoFilter==='normal'));
   updatePhotoPreview();if(!dialog.open)dialog.showModal();
  };
  image.onerror=()=>{URL.revokeObjectURL(objectUrl);toastMsg('Не вдалося відкрити це зображення.');};image.src=objectUrl;
 }
 document.addEventListener('change',event=>{
  const input=event.target;if(!input||!input.id)return;
  const map={avatarUpload:'avatar',settingsAvatarFile:'avatar'},target=map[input.id];
  if(!target||!input.files||!input.files[0])return;
  const file=input.files[0];event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();input.value='';openPhotoEditor(file,target);
 },true);
 window.addEventListener('keydown',event=>{if(event.key==='Escape')closeTopbarMenus();});
})();

