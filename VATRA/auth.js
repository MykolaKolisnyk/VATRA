import { initializeApp, getAuth, onAuthStateChanged, sendPasswordResetEmail, getDatabase, ref, set, sendOtp, verifyOtp, signUpWithPassword, signInWithPassword, verifyPasswordCredentials, setAccountPassword } from './vatra-backend.js?v=20261031-7';

// Prevent the browser from restoring an old scroll position on the sign-in page.
if('scrollRestoration' in history)history.scrollRestoration='manual';
window.scrollTo(0,0);
const app=initializeApp(),auth=getAuth(app),db=getDatabase(app);
const $=s=>document.querySelector(s);
const selectedMethod=()=>document.querySelector('input[name="authMethod"]:checked')?.value||$('#method').value||'email';


const PHONE_COUNTRIES = [{"iso":"UA","name":"Україна","dial":"+380"}];
function countryFlag(iso){return String(iso||'').toUpperCase().replace(/[A-Z]/g,c=>String.fromCodePoint(127397+c.charCodeAt(0)));}
function enhancePhoneInput(input,selectId){
 if(!input||document.getElementById(selectId))return;
 // Keep +380 for normalization, but render a fixed Ukrainian flag and code instead of a dropdown.
 const select=document.createElement('select');select.id=selectId;select.className='phone-country-code';select.setAttribute('aria-label','Код країни');select.hidden=true;
 const c=PHONE_COUNTRIES[0]||{iso:'UA',name:'Україна',dial:'+380'};
 const option=document.createElement('option');option.value=c.dial;option.textContent=c.dial;option.dataset.iso=c.iso;select.append(option);select.value=c.dial;
 const row=document.createElement('div');row.className='phone-number-control';
 const fixed=document.createElement('div');fixed.className='phone-country-static';fixed.setAttribute('aria-label','Україна, код +380');
 fixed.innerHTML='<svg class="phone-country-flag" viewBox="0 0 30 20" role="img" aria-label="Прапор України"><rect width="30" height="10" fill="#0057B8"></rect><rect y="10" width="30" height="10" fill="#FFD700"></rect></svg><span>+380</span>';
 input.parentNode.insertBefore(row,input);row.append(fixed,select,input);
 input.placeholder='93X XXX XX XX';
}
function normalizePhone(input,select){
 const raw=String(input?.value||'').trim();
 if(raw.startsWith('+'))return '+'+raw.slice(1).replace(/\D/g,'');
 if(raw.startsWith('00'))return '+'+raw.slice(2).replace(/\D/g,'');
 let digits=raw.replace(/\D/g,'');
 const dial=select?.value||'+380',dialDigits=dial.slice(1);
 if(digits.startsWith(dialDigits)&&digits.length>dialDigits.length+4)return '+'+digits;
 if(digits.startsWith('0')&&dial!=='+39')digits=digits.slice(1);
 return dial+digits;
}
function setPhoneInputFromFullNumber(input,select,value){
 const raw=String(value||'').trim();if(!raw)return;
 const normalized=raw.replace(/[\s().-]/g,'');
 if(!normalized.startsWith('+')){input.value=raw;return;}
 const match=PHONE_COUNTRIES.filter(c=>normalized.startsWith(c.dial)).sort((a,b)=>b.dial.length-a.dial.length)[0];
 if(match){const preferred=match.dial==='+1'?'US':match.iso;const optionIndex=[...select.options].findIndex(o=>o.dataset.iso===preferred);if(optionIndex>=0)select.selectedIndex=optionIndex;else select.value=match.dial;input.value=normalized.slice(match.dial.length).replace(/\D/g,'');}
 else input.value=normalized;
}
function syncPhoneInputMode(input,select,method){
 if(!input)return;
 const phone=method==='phone';
 if(select)select.hidden=true;
 const phoneRow=input.closest('.phone-number-control');
 const countryPrefix=phoneRow?.querySelector('.phone-country-static');
 if(phoneRow){
  phoneRow.hidden=false;
  phoneRow.classList.toggle('phone-number-control--email',!phone);
  phoneRow.style.display=phone?'flex':'block';
 }
 if(countryPrefix){
  countryPrefix.hidden=!phone;
  countryPrefix.style.display=phone?'flex':'none';
 }
 input.type=phone?'tel':'email';
 input.autocomplete=phone?'tel':'email';
 input.inputMode=phone?'tel':'email';
 input.placeholder=phone?'930 657 340':'name@example.com';
 input.setAttribute('aria-label',phone?'Номер телефону':'Електронна пошта');
 input.style.flex=phone?'1 1 auto':'1 1 100%';
 input.style.width=phone?'auto':'100%';
 input.style.minWidth='0';
}
function syncAuthMethodUI(method){
 const selected=method==='phone'?'phone':'email';
 document.querySelectorAll('input[name="authMethod"]').forEach(radio=>{radio.checked=radio.value===selected;});
 const methodSelect=$('#method');
 if(methodSelect)methodSelect.value=selected;
 syncPhoneInputMode($('#email'),$('#countryCode'),selected);
 const label=$('#contactLabel');
 if(label)label.textContent=selected==='phone'?'Номер телефону':'Електронна пошта';
}
function currentAuthContact(){
 return selectedMethod()==='phone'
  ? normalizePhone($('#email'),$('#countryCode'))
  : $('#email').value.trim().toLowerCase();
}


async function finishRegistration({user,contact,isPhone,dob,first,last,name,gender}){
 const uid=user?.uid||user?.id;
 if(!uid)throw new Error('Supabase не повернув ідентифікатор нового акаунта. Перевір Authentication → Providers.');
 const handle=(first+'.'+last).toLocaleLowerCase('uk-UA').replace(/[^\p{L}\p{N}]+/gu,'.').replace(/^\.|\.$/g,'').slice(0,15)+'-'+uid.replace(/-/g,'').slice(0,8);
 const createdAt=Date.now();
 const profile={firstName:first,lastName:last,name,handle,gender,bio:'',avatarUrl:'',coverUrl:'',city:'',location:'',phone:isPhone?contact:'',phoneVisibility:'private',birthdayVisibility:'private',cityVisibility:'private',locationVisibility:'private',profileVisibility:'public',searchable:true,allowMessages:true,createdAt};
 await set(ref(db,'publicProfiles/'+uid),{firstName:first,lastName:last,name,handle,gender,bio:'',avatarUrl:'',coverUrl:'',birthdayVisibility:'private',cityVisibility:'private',locationVisibility:'private',profileVisibility:'public',searchable:true,allowMessages:true,createdAt,updatedAt:createdAt});
 await set(ref(db,'users/'+uid),profile);
 await set(ref(db,'privateUsers/'+uid),{dateOfBirth:dob,phone:isPhone?contact:null,updatedAt:Date.now()});

 location.replace('index.html');
}

function enhanceDatePicker(input){
 if(!input||input.dataset.datePickerEnhanced)return;
 input.dataset.datePickerEnhanced='1';
 const now=new Date();
 input.hidden=true;
 input.max=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 const wrap=document.createElement('div');
 wrap.className='birthday-selects';
 wrap.setAttribute('role','group');
 wrap.setAttribute('aria-label','Дата народження');
 const day=document.createElement('select'),month=document.createElement('select'),year=document.createElement('select');
 day.setAttribute('aria-label','День народження');
 month.setAttribute('aria-label','Місяць народження');
 year.setAttribute('aria-label','Рік народження');
 const option=(value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;};
 day.append(option('','День'));
 month.append(option('','Місяць'));
 ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'].forEach((label,index)=>month.append(option(String(index+1).padStart(2,'0'),label)));
 year.append(option('','Рік'));
 for(let y=now.getFullYear();y>=1900;y--)year.append(option(String(y),String(y)));
 wrap.append(day,month,year);
 input.insertAdjacentElement('afterend',wrap);
 const hint=document.createElement('small');
 hint.className='birthday-picker-hint';
 hint.textContent='Оберіть день, місяць і рік. Реєстрація доступна з 13 років; дата за замовчуванням приватна.';
 wrap.insertAdjacentElement('afterend',hint);
 const daysInMonth=()=>{if(!year.value||!month.value)return 31;const y=Number(year.value),m=Number(month.value),count=new Date(y,m,0).getDate();return y===now.getFullYear()&&m===now.getMonth()+1?Math.min(count,now.getDate()):count;};
 const rebuildDays=(preserve=true)=>{
  const old=preserve?day.value:'';
  day.replaceChildren(option('','День'));
  for(let d=1;d<=daysInMonth();d++)day.append(option(String(d).padStart(2,'0'),String(d)));
  if(old&&Number(old)<=daysInMonth())day.value=old;
  else day.value='';
 };
 const syncFromInput=()=>{
  const parts=(input.value||'').split('-');
  if(parts.length===3){
   year.value=parts[0];month.value=parts[1];rebuildDays(false);day.value=parts[2];
  }else{day.value='';month.value='';year.value='';rebuildDays(false);}
  syncToInput(false);
 };
 const syncToInput=(update=true)=>{
  const complete=!!day.value&&!!month.value&&!!year.value;
  if(!complete){input.value='';day.setCustomValidity('Оберіть день, місяць і рік.');hint.classList.remove('is-invalid');return;}
  const y=Number(year.value),m=Number(month.value),d=Number(day.value),date=new Date(y,m-1,d);
  const valid=date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d&&date<=now;
  if(!valid){input.value='';day.setCustomValidity('Перевірте дату народження.');hint.classList.add('is-invalid');hint.textContent='Перевірте дату: такого дня немає в обраному місяці або дата в майбутньому.';return;}
  day.setCustomValidity('');hint.classList.remove('is-invalid');
  hint.textContent='Оберіть день, місяць і рік. Реєстрація доступна з 13 років; дата за замовчуванням приватна.';
  input.value=year.value+'-'+month.value+'-'+day.value;
  if(update)input.dispatchEvent(new Event('change',{bubbles:true}));
 };
 month.addEventListener('change',()=>{rebuildDays(true);syncToInput();});
 year.addEventListener('change',()=>{rebuildDays(true);syncToInput();});
 day.addEventListener('change',()=>syncToInput());
 input.addEventListener('change',syncFromInput);
 syncFromInput();
}

let mode='login',submitting=false,captchaWidget=null,authCooldownTimer=null,pendingHumanAction=null,suppressAuthRedirect=false;
const AUTH_COOLDOWN_KEY='vatra-auth-rate-limit-until-v1';
const TURNSTILE_SITE_KEY=''; // Optional: set a real Turnstile site key and enable server-side verification for stronger protection.
const errors={
 'auth/email-already-in-use':'Ця електронна пошта або номер телефону вже використовується. Увійдіть до наявного акаунта або відновіть пароль.',
 'auth/invalid-email':'Введіть коректну електронну пошту.',
 'auth/email-not-authorized':'Supabase зараз надсилає тестові листи лише на дозволені адреси. Для реєстрації всіх користувачів налаштуй власний SMTP у Supabase → Authentication → SMTP Settings.',
 'auth/otp-delivery-failed':'Supabase не зміг надіслати код. Для email потрібен власний SMTP; для SMS — увімкнений Phone provider і налаштований SMS-провайдер. Перевір Authentication → Logs.',
 'auth/email-delivery-failed':'Supabase не зміг надіслати лист. Для публічної реєстрації налаштуй власний SMTP у Supabase → Authentication → SMTP Settings, підтвердь домен відправника, перевір шаблон листа на {{ .Token }} та журнал Authentication → Logs.',
 'auth/sms-delivery-failed':'Supabase не зміг надіслати SMS. Перевір Supabase → Authentication → Providers → Phone: Phone OTP має бути увімкнений, SMS-провайдер — налаштований (облікові дані, баланс і відправник). Причина зазвичай є в Authentication → Logs.',
 'auth/too-many-requests':'Supabase тимчасово обмежив запити. Зачекайте щонайменше 5 хвилин і не натискайте повторно. Для email через стандартну пошту Supabase може знадобитися до години; адміністратору слід перевірити Authentication → Rate Limits і налаштувати власний SMTP.',
 'auth/network-request-failed':'Немає з’єднання з інтернетом.',
 'auth/operation-not-allowed':'Цей спосіб авторизації ще не увімкнений у налаштуваннях.',
 'auth/invalid-credential':'Пароль неправильний або акаунт не знайдено. Перевірте дані та спробуйте ще раз.',
 'auth/confirmation-required':'Щоб реєстрація працювала без коду, у Supabase Dashboard → Authentication → Providers вимкніть Confirm email і Confirm phone. Унікальність контакту перевірятиме сам Supabase.',
 'auth/user-not-found':'Акаунт не знайдено. Спочатку створіть акаунт.',
 'auth/weak-password':'Пароль занадто слабкий.',
 'auth/invalid-phone-number':'Перевірте номер у міжнародному форматі, наприклад +380XXXXXXXXX.',
 'auth/invalid-otp':'Код неправильний. Перевірте цифри та спробуйте ще раз.',
 'auth/otp-expired':'Термін дії коду завершився. Запросіть новий код.',
 'auth/unknown':'Не вдалося надіслати або перевірити код. Перевірте налаштування SMS-провайдера та спробуйте ще раз.',
 'vatra/rate-limited':'Забагато кодів за останню годину. Спробуйте пізніше.',
 'vatra/wait-resend':'Зачекайте 30 секунд перед повторним надсиланням.',
 'vatra/delivery-not-configured':'Надсилання email або SMS ВАТРИ ще не налаштоване на сервері.',
 'vatra/service-not-configured':'Сервер підтвердження ВАТРИ ще не налаштований. Потрібно розгорнути функцію та додати секрети пошти/SMS у Supabase.',
 'vatra/delivery-failed':'Supabase не доставив код. Для email потрібен налаштований SMTP і шаблон із {{ .Token }}; для SMS — увімкнений Phone provider та SMS-провайдер. Причину перевірте у Supabase → Authentication → Logs.',
 'vatra/invalid-code':'Код неправильний. Перевірте його та спробуйте ще раз.',
 'vatra/code-expired':'Термін дії коду завершився. Надішліть новий код.',
 'vatra/too-many-attempts':'Забагато неправильних спроб. Надішліть новий код.',
 'vatra/verify-failed':'Не вдалося підтвердити код. Перевірте налаштування ВАТРИ.',
 'vatra/registration-data':'Перевірте ім’я, прізвище та пароль.',
 'vatra/account-creation-failed':'Не вдалося створити акаунт. Спробуйте пізніше.'
};
let challengeAnswer=null,challengePassed=false,previousAdditionKey='';
function closeHumanCaptcha(){
 const wrap=$('#captchaWrap');if(!wrap)return;
 wrap.classList.remove('captcha-modal');wrap.hidden=true;wrap.removeAttribute('role');wrap.removeAttribute('aria-modal');wrap.removeAttribute('aria-label');document.body.classList.remove('captcha-modal-open');
}
function openHumanCaptcha(){
 const wrap=$('#captchaWrap');if(!wrap)return;
 resetHumanChallenge();if(wrap.parentElement!==document.body)document.body.appendChild(wrap);wrap.hidden=false;wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','Швидка перевірка');wrap.classList.add('captcha-modal');document.body.classList.add('captcha-modal-open');
 wrap.querySelector('button[data-captcha-answer]')?.focus();
}
function resetHumanChallenge(notice=''){
 challengePassed=false;
 const wrap=$('#captchaWrap');if(!wrap)return;
 let a=1+Math.floor(Math.random()*9),b=1+Math.floor(Math.random()*9);
 let pairKey=[a,b].sort((x,y)=>x-y).join('+');
 for(let attempt=0;pairKey===previousAdditionKey&&attempt<12;attempt++){
  a=1+Math.floor(Math.random()*9);b=1+Math.floor(Math.random()*9);
  pairKey=[a,b].sort((x,y)=>x-y).join('+');
 }
 if(pairKey===previousAdditionKey){
  b=b%9+1;
  pairKey=[a,b].sort((x,y)=>x-y).join('+');
 }
 previousAdditionKey=pairKey;
 challengeAnswer=a+b;
 const choiceSet=new Set([challengeAnswer]);
 while(choiceSet.size<4){
  const distractor=1+Math.floor(Math.random()*20);
  choiceSet.add(distractor);
 }
 const choices=[...choiceSet].sort(()=>Math.random()-.5);
 wrap.innerHTML='<div class="human-captcha"><div class="human-captcha-title"><img src="vatra-flame.svg?v=20261028-3" class="vatra-mini-mark" alt="" aria-hidden="true"><span>Швидка перевірка</span><span class="human-captcha-tag">Захист ВАТРИ</span></div><p class="human-captcha-question">Скільки буде '+a+' + '+b+'?</p><div class="human-captcha-options">'+choices.map(value=>'<button type="button" class="human-captcha-option" data-captcha-answer="'+value+'">'+value+'</button>').join('')+'</div><p class="human-captcha-status'+(notice?' is-wrong':'')+'" id="humanCaptchaStatus" aria-live="assertive">'+(notice||'Обчисліть суму та виберіть правильну відповідь.')+'</p><button type="button" class="human-captcha-cancel" id="humanCaptchaCancel">Скасувати</button></div>';
 wrap.querySelector('#humanCaptchaCancel').addEventListener('click',()=>{
  pendingHumanAction=null;
  closeHumanCaptcha();
 });
 wrap.querySelectorAll('[data-captcha-answer]').forEach(btn=>btn.addEventListener('click',()=>{
  const isCorrect=Number(btn.dataset.captchaAnswer)===challengeAnswer;
  if(!isCorrect){
   window.__vatraCaptchaFailures=(window.__vatraCaptchaFailures||0)+1;
   const delay=Math.min(2500,350*window.__vatraCaptchaFailures);
   resetHumanChallenge('Відповідь неправильна. Старі варіанти скасовано — згенеровано нове питання.');
   wrap.querySelectorAll('[data-captcha-answer]').forEach(option=>option.disabled=true);
   window.setTimeout(()=>wrap.querySelectorAll('[data-captcha-answer]').forEach(option=>option.disabled=false),delay);
   return;
  }
  window.__vatraCaptchaFailures=0;
  challengePassed=true;
  wrap.querySelectorAll('[data-captcha-answer]').forEach(x=>x.classList.remove('is-correct','is-wrong'));
  btn.classList.add('is-correct');
  $('#humanCaptchaStatus').textContent='Правильно! Продовжуємо…';
  $('#humanCaptchaStatus').classList.add('is-passed');
  if(window.__vatraCaptchaTimer)clearTimeout(window.__vatraCaptchaTimer);
  window.__vatraCaptchaTimer=window.setTimeout(()=>{
   closeHumanCaptcha();
   $('#authForm').requestSubmit();
  },300);
 }));
 if(wrap.classList.contains('captcha-modal'))wrap.querySelector('[data-captcha-answer]')?.focus();
}

function captchaToken(){if(!TURNSTILE_SITE_KEY)return '';try{return window.turnstile&&captchaWidget!==null?window.turnstile.getResponse(captchaWidget):'';}catch{return '';}}

function authCooldownRemaining(){
 try{return Math.max(0,Number(sessionStorage.getItem(AUTH_COOLDOWN_KEY)||0)-Date.now());}catch{return 0;}
}
function authSubmitLabel(){
 return mode==='login'?'Увійти':mode==='register'?'Створити акаунт':mode==='reset'?'Надіслати посилання':mode==='new-password'?'Зберегти новий пароль':'Увійти';
}
function refreshAuthCooldown(){
 const button=$('#submit');if(!button)return;
 const remaining=authCooldownRemaining();
 if(remaining>0){button.disabled=true;button.textContent='Тимчасове обмеження · '+Math.ceil(remaining/1000)+' с';return;}
 if(authCooldownTimer){clearInterval(authCooldownTimer);authCooldownTimer=null;}
 try{sessionStorage.removeItem(AUTH_COOLDOWN_KEY);}catch{}
 button.disabled=!!submitting;
 button.textContent=authSubmitLabel();
}
function startAuthRateLimitCooldown(seconds=300){
 try{sessionStorage.setItem(AUTH_COOLDOWN_KEY,String(Date.now()+seconds*1000));}catch{}
 if(authCooldownTimer){clearInterval(authCooldownTimer);authCooldownTimer=null;}
 refreshAuthCooldown();
 authCooldownTimer=setInterval(refreshAuthCooldown,1000);
}

function renderCaptcha(){if(!TURNSTILE_SITE_KEY)return;const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.onload=()=>{if(window.turnstile&&!captchaWidget)captchaWidget=window.turnstile.render('#turnstileWidget',{sitekey:TURNSTILE_SITE_KEY,theme:'light'});};document.head.append(script);}
function show(m){
 const previousMode=mode;mode=m;document.body.dataset.authMode=m;
 if(previousMode!==m&&!(['login','register'].includes(previousMode)&&['login','register'].includes(m)))window.scrollTo(0,0);
 const switchingAccountMode=['login','register'].includes(previousMode)&&['login','register'].includes(m)&&previousMode!==m;
 if(switchingAccountMode){
  $('#email').value='';$('#password').value='';$('#confirm').value='';
  $('#firstName').value='';$('#lastName').value='';$('#birthday').value='';$('#gender').value='';
  document.querySelectorAll('.birthday-selects select').forEach(select=>{select.value='';select.setCustomValidity('');});
  const birthdayHint=document.querySelector('.birthday-picker-hint');if(birthdayHint){birthdayHint.classList.remove('is-invalid');birthdayHint.textContent='Оберіть день, місяць і рік. Реєстрація доступна з 13 років; дата за замовчуванням приватна.';}
  $('#legalConsent').checked=false;pendingHumanAction=null;challengePassed=false;
 }else if(previousMode!==m){
  $('#password').value='';$('#confirm').value='';
 }
 $('#loginTab').disabled=false;$('#registerTab').disabled=false;
 const pageUrl=new URL(location.href);
 if(m==='login'){
  if(pageUrl.pathname.toLowerCase().endsWith('/register.html'))pageUrl.searchParams.set('mode','login');
  else pageUrl.searchParams.delete('mode');
 }else pageUrl.searchParams.set('mode',m);
 if(pageUrl.href!==location.href)history.replaceState(null,'',pageUrl);
 document.title=m==='register'?'Реєстрація у ВАТРІ':m==='reset'?'Відновлення пароля — ВАТРА':m==='new-password'?'Новий пароль — ВАТРА':'Вхід до ВАТРИ';
 const description=document.querySelector('meta[name="description"]');
 if(description)description.content=m==='register'?'Створення акаунта ВАТРИ з перевіркою унікальності контакту й надійним паролем.':m==='reset'?'Безпечне відновлення доступу до ВАТРИ.':'Вхід до ВАТРИ за допомогою пошти або номера й пароля.';

 closeHumanCaptcha();resetHumanChallenge();
 
 const reg=m==='register',reset=m==='reset',newPassword=m==='new-password',hideContact=newPassword;
 const emailHint=document.querySelector('input[name="authMethod"][value="email"]')?.closest('label')?.querySelector('small');
 const phoneHint=document.querySelector('input[name="authMethod"][value="phone"]')?.closest('label')?.querySelector('small');
 if(emailHint)emailHint.textContent=reg?'Перевірка, чи пошта вже використовується':'Вхід за паролем';
 if(phoneHint)phoneHint.textContent=reg?'Перевірка, чи номер уже використовується':'Вхід за паролем · без SMS';
 if(reset){const emailChoice=document.querySelector('input[name="authMethod"][value="email"]');if(emailChoice)emailChoice.checked=true;}
 document.querySelectorAll('input[name="authMethod"]').forEach(input=>{const card=input.closest('label')||input.parentElement;const isEmail=input.value==='email';if(card)card.hidden=reset&&!isEmail;input.disabled=reset&&!isEmail;});
 $('#loginTab').classList.toggle('selected',m==='login');$('#registerTab').classList.toggle('selected',reg);
 $('#firstNameWrap').hidden=!reg;$('#lastNameWrap').hidden=!reg;$('#birthdayWrap').hidden=!reg;$('#genderWrap').hidden=!reg;$('#gender').required=reg;$('#birthday').required=reg;document.querySelectorAll('.birthday-selects select').forEach(select=>select.required=reg);
 $('#confirmWrap').hidden=!(reg||newPassword);$('#confirm').required=reg||newPassword;
 $('#firstName').required=reg;$('#lastName').required=reg;
 $('#password').required=!reset;$('#password').minLength=reg||newPassword?12:0;$('#password').placeholder='Введіть пароль';
 $('#passwordHelp').hidden=!reg;const meter=$('#passwordStrength');if(meter)meter.hidden=!reg;$('#password').closest('.field').hidden=reset;$('#forgot').hidden=reg||reset||newPassword;
 $('#email').required=!hideContact;$('#email').closest('.field').hidden=hideContact;$('#method').disabled=hideContact||reset;$('#method').closest('.field').hidden=hideContact||reset;$('#captchaWrap').hidden=true;$('#confirm').value='';
 $('#eyebrow').textContent=reg?'ВАША ІСТОРІЯ ПОЧИНАЄТЬСЯ ТУТ':reset?'ВІДНОВЛЕННЯ ДОСТУПУ':newPassword?'БЕЗПЕЧНЕ ВІДНОВЛЕННЯ':'РАДІ БАЧИТИ ЗНОВУ';
 $('#title').textContent=reg?'Створіть акаунт ВАТРИ':reset?'Відновіть пароль':newPassword?'Створіть новий пароль':'З поверненням до ВАТРИ';
 $('#desc').textContent=reg?'Заповніть профіль, оберіть email або телефон для входу та створіть надійний пароль. Так Ви зможете долучитися до ВАТРИ й ділитися своїми історіями.':reset?'Вкажіть електронну пошту, щоб отримати інструкцію для відновлення пароля.':newPassword?'Створіть новий надійний пароль для свого акаунта.':'Увійдіть до свого акаунта за допомогою пошти або номера телефону та пароля.';
 $('#submit').textContent=reg?'Створити акаунт':newPassword?'Зберегти новий пароль':reset?'Надіслати посилання':'Увійти';$('#bottom').hidden=reset||newPassword;
 $('#bottom').innerHTML=reg?'Вже маєте акаунт? <button id="switch" type="button">Увійти</button>':'Ще немає акаунта? <button id="switch" type="button">Зареєструватися</button>';
 const modeSwitch=$('#bottom').querySelector('#switch');
 if(modeSwitch)modeSwitch.addEventListener('click',event=>{event.preventDefault();show(reg?'login':'register');});
 $('#legal').hidden=reg||reset||newPassword;
 $('#legalConsentWrap').hidden=!reg;$('#legalConsent').required=reg;$('#legalConsent').checked=false;
 $('#legal').innerHTML=reg?'':'<span class="legal-label">Документи ВАТРИ</span><div class="legal-links"><button type="button" data-legal="rules">Правила спільноти</button><button type="button" data-legal="privacy">Політика конфіденційності</button><button type="button" data-legal="terms">Умови користування</button></div>';
 $('#error').textContent='';$('#error').classList.remove('success');const activeMethod=selectedMethod();syncAuthMethodUI(activeMethod);
 $('#password').autocomplete='new-password';const today=new Date();$('#birthday').max=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');syncCaptchaVisibility();updatePasswordStrength();
 
 refreshAuthCooldown();
}
document.querySelectorAll('input[name="authMethod"]').forEach(radio=>radio.addEventListener('change',()=>{
 const method=radio.value;
 syncAuthMethodUI(method);
 $('#email').value='';
 $('#submit').textContent=authSubmitLabel();
 $('#error').textContent='';
 syncCaptchaVisibility();
}));
$('#loginTab').addEventListener('click',()=>show('login'));
$('#registerTab').addEventListener('click',()=>show('register'));



function resetModalScroll(dialog){
 if(!dialog)return;
 dialog.scrollTop=0;
 dialog.querySelectorAll('.developer-dialog-body,.legal-dialog-body,.legal-dialog-body article').forEach(area=>{area.scrollTop=0;});
}
function openDialogAnimated(dialog){
 if(!dialog)return;
 dialog.classList.remove('is-closing','is-opening');
 resetModalScroll(dialog);
 if(!dialog.open)dialog.showModal();
 resetModalScroll(dialog);
 requestAnimationFrame(()=>resetModalScroll(dialog));
 void dialog.offsetWidth;
 dialog.classList.add('is-opening');
 window.setTimeout(()=>dialog.classList.remove('is-opening'),260);
}
function closeDialogAnimated(dialog){
 if(!dialog||!dialog.open||dialog.classList.contains('is-closing'))return;
 dialog.classList.remove('is-opening');
 dialog.classList.add('is-closing');
 window.setTimeout(()=>{
  if(dialog.open)dialog.close();
  dialog.classList.remove('is-closing');
  resetModalScroll(dialog);
 },180);
}
document.querySelectorAll('[data-developer-open]').forEach(button=>button.addEventListener('click',()=>openDialogAnimated(document.getElementById('developerDialog'))));
document.getElementById('closeDeveloper').addEventListener('click',()=>closeDialogAnimated(document.getElementById('developerDialog')));
document.getElementById('closeDeveloperBottom').addEventListener('click',()=>closeDialogAnimated(document.getElementById('developerDialog')));
document.getElementById('developerDialog').addEventListener('click',event=>{if(event.target===document.getElementById('developerDialog'))closeDialogAnimated(document.getElementById('developerDialog'));});
document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialogAnimated(dialog);});dialog.addEventListener('close',()=>resetModalScroll(dialog));});
function openLegal(which){const selected=['rules','privacy','terms'].includes(which)?which:'rules',dialog=$('#legalDialog'),wasOpen=dialog.open,area=$('#legalScrollArea');['rules','privacy','terms'].forEach(key=>{const article=$('#legal'+key.charAt(0).toUpperCase()+key.slice(1));if(article){article.hidden=key!==selected;article.classList.toggle('is-active',key===selected);}});document.querySelectorAll('[data-legal-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.legalTab===selected);b.setAttribute('aria-selected',String(b.dataset.legalTab===selected));});if(area)area.scrollTop=0;if(!wasOpen)openDialogAnimated(dialog);else{area?.classList.remove('is-switching');void area?.offsetWidth;area?.classList.add('is-switching');requestAnimationFrame(()=>area?.classList.remove('is-switching'));}}
$('#legal').addEventListener('click',e=>{const b=e.target.closest('[data-legal]');if(b)openLegal(b.dataset.legal);});
$('#legalConsentWrap').addEventListener('click',e=>{const b=e.target.closest('[data-legal]');if(b){e.preventDefault();openLegal(b.dataset.legal);}});
document.querySelectorAll('[data-legal-tab]').forEach(b=>b.addEventListener('click',()=>openLegal(b.dataset.legalTab)));
$('#closeLegal').onclick=()=>closeDialogAnimated($('#legalDialog'));$('#closeLegalBottom').onclick=()=>closeDialogAnimated($('#legalDialog'));
$('#legalDialog').addEventListener('click',e=>{if(e.target===$('#legalDialog'))closeDialogAnimated($('#legalDialog'));});
function currentRecoveryMethod(){return document.querySelector('input[name="recoveryMethod"]:checked')?.value||'email';}
let recoveryAnswer=0,recoveryPassed=false,recoveryStep='contact',recoveryPreviousPair='',recoveryFailures=0;
function resetRecoveryChallenge(notice=''){
 let a=2+Math.floor(Math.random()*9),b=2+Math.floor(Math.random()*9);
 let pair=[a,b].sort((x,y)=>x-y).join('+');
 for(let attempt=0;pair===recoveryPreviousPair&&attempt<20;attempt++){
  a=2+Math.floor(Math.random()*9);b=2+Math.floor(Math.random()*9);
  pair=[a,b].sort((x,y)=>x-y).join('+');
 }
 if(pair===recoveryPreviousPair){a=(a%9)+2;pair=[a,b].sort((x,y)=>x-y).join('+');}
 recoveryPreviousPair=pair;recoveryAnswer=a+b;recoveryPassed=false;
 $('#recoveryMath').textContent=a+' + '+b+' = ?';
 const options=new Set([recoveryAnswer]);
 while(options.size<4){const distractor=1+Math.floor(Math.random()*19);if(distractor!==recoveryAnswer)options.add(distractor);}
 $('#recoveryAnswers').innerHTML=[...options].sort(()=>Math.random()-.5).map(n=>'<button type="button" class="recovery-answer" data-recovery-answer="'+n+'">'+n+'</button>').join('');
 $('#recoveryChallengeStatus').textContent=notice||'Ця перевірка допомагає захистити акаунти від автоматизованих запитів.';
 $('#recoveryChallengeStatus').classList.remove('is-passed');$('#recoveryChallengeStatus').classList.toggle('is-wrong',!!notice);
 $('#recoveryAnswers').querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
  const correct=Number(btn.dataset.recoveryAnswer)===recoveryAnswer;
  if(!correct){
   recoveryFailures++;
   const delay=Math.min(6000,600*Math.pow(2,Math.min(recoveryFailures-1,3)));
   resetRecoveryChallenge('Відповідь неправильна. Питання оновлено. Наступна спроба буде доступна через '+Math.ceil(delay/1000)+' с.');
   const answers=$('#recoveryAnswers').querySelectorAll('button');answers.forEach(option=>option.disabled=true);
   window.setTimeout(()=>$('#recoveryAnswers')?.querySelectorAll('button').forEach(option=>option.disabled=false),delay);
   return;
  }
  recoveryPassed=true;recoveryFailures=0;
  $('#recoveryAnswers').querySelectorAll('button').forEach(x=>x.classList.remove('is-correct','is-wrong'));
  btn.classList.add('is-correct');
  $('#recoveryChallengeStatus').textContent='Перевірку пройдено.';
  $('#recoveryChallengeStatus').classList.add('is-passed');$('#recoveryChallengeStatus').classList.remove('is-wrong');
 }));
}
function syncRecoveryMethod(){
 const phone=currentRecoveryMethod()==='phone';syncPhoneInputMode($('#recoveryContact'),$('#recoveryCountryCode'),phone?'phone':'email');
 $('#recoveryContactLabel').textContent=phone?'Номер телефону':'Електронна пошта';
 $('#recoverySubmit').textContent=recoveryStep==='verify'?'Підтвердити код і змінити пароль':phone?'Надіслати SMS-код':'Надіслати інструкцію';
}
function openRecovery(){
 recoveryFailures=0;recoveryPreviousPair='';recoveryStep='contact';$('#recoveryForm').reset();$('#recoveryError').textContent='';$('#recoveryError').classList.remove('success');
 $('#recoveryMethodWrap').hidden=false;$('#recoveryContact').readOnly=false;$('#recoveryContact').closest('.field').hidden=false;$('#recoveryProtection').hidden=false;
 $('#recoveryOtpWrap').hidden=true;$('#recoveryNewPasswordWrap').hidden=true;$('#recoveryConfirmWrap').hidden=true;
 $('#recoveryOtp').required=false;$('#recoveryNewPassword').required=false;$('#recoveryConfirmPassword').required=false;
 const method=selectedMethod(),radio=$('input[name="recoveryMethod"][value="'+method+'"]');if(radio)radio.checked=true;
 syncRecoveryMethod();if(method==='phone')setPhoneInputFromFullNumber($('#recoveryContact'),$('#recoveryCountryCode'),currentAuthContact());else $('#recoveryContact').value=$('#email').value.trim().toLowerCase();resetRecoveryChallenge();openDialogAnimated($('#recoveryDialog'));
}
$('#forgot').onclick=openRecovery;
$('#closeRecovery').onclick=()=>closeDialogAnimated($('#recoveryDialog'));
$('#recoveryDialog').addEventListener('click',e=>{if(e.target===$('#recoveryDialog'))closeDialogAnimated($('#recoveryDialog'));});
document.querySelectorAll('input[name="recoveryMethod"]').forEach(r=>r.addEventListener('change',()=>{
 $('#recoveryContact').value='';recoveryStep='contact';$('#recoveryOtpWrap').hidden=true;$('#recoveryNewPasswordWrap').hidden=true;$('#recoveryConfirmWrap').hidden=true;$('#recoveryProtection').hidden=false;
 $('#recoveryError').textContent='';syncRecoveryMethod();resetRecoveryChallenge();
}));
$('#showRecoveryPassword').addEventListener('click',()=>{
 const input=$('#recoveryNewPassword'),reveal=input.type==='password';input.type=reveal?'text':'password';
 $('#showRecoveryPassword').textContent=reveal?'Приховати':'Показати';$('#showRecoveryPassword').setAttribute('aria-pressed',String(reveal));
});
function isStrongPassword(p){return p.length>=12&&/[a-z]/.test(p)&&/[A-Z]/.test(p)&&/[0-9]/.test(p)&&/[!@#$%^&*()_+=\[\]{};:'"|<>?,.\/~\-]/.test(p);}
$('#recoveryForm').addEventListener('submit',async e=>{
 e.preventDefault();const btn=$('#recoverySubmit'),phone=currentRecoveryMethod()==='phone',contact=phone?normalizePhone($('#recoveryContact'),$('#recoveryCountryCode')):$('#recoveryContact').value.trim().toLowerCase();
 const feedback=(message,success=false)=>{$('#recoveryError').textContent=message;$('#recoveryError').classList.toggle('success',success);};
 if(recoveryStep==='contact'){
  if(!recoveryPassed){feedback('Спочатку пройдіть «Захист ВАТРИ».');return;}
  if(phone&&!/^\+[1-9]\d{7,14}$/.test(contact)){feedback('Введіть номер у міжнародному форматі, наприклад +380XXXXXXXXX.');return;}
  if(!phone&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)){feedback('Введіть коректну адресу електронної пошти.');return;}
  btn.disabled=true;btn.textContent='Надсилаємо…';
  try{
   if(!phone){
    await sendPasswordResetEmail(auth,contact.toLowerCase());
    feedback('Якщо акаунт існує, на пошту надійде посилання для створення нового пароля. Перевірте також папку «Спам».',true);return;
   }
   await sendOtp({phone:contact,shouldCreateUser:false});
   recoveryStep='verify';$('#recoveryMethodWrap').hidden=true;$('#recoveryContact').readOnly=true;$('#recoveryProtection').hidden=true;
   $('#recoveryOtpWrap').hidden=false;$('#recoveryNewPasswordWrap').hidden=false;$('#recoveryConfirmWrap').hidden=false;
   $('#recoveryOtp').required=true;$('#recoveryNewPassword').required=true;$('#recoveryConfirmPassword').required=true;
   btn.textContent='Підтвердити код і змінити пароль';feedback('Якщо номер прив’язаний до акаунта, код надіслано SMS. Не передавайте його нікому.',true);return;
  }catch(err){feedback(errors[err.code]||err.message||'Не вдалося надіслати повідомлення. Перевірте налаштування Supabase.');return;}
  finally{btn.disabled=false;if(recoveryStep==='contact')syncRecoveryMethod();}
 }
 const code=$('#recoveryOtp').value.trim(),password=$('#recoveryNewPassword').value,confirmation=$('#recoveryConfirmPassword').value;
 if(!/^\d{6}$/.test(code)){feedback('Введіть 6-значний код із SMS.');return;}
 if(!isStrongPassword(password)){feedback('Пароль має містити 12+ символів, великі й малі латинські літери, цифру та спецсимвол.');return;}
 if(password!==confirmation){feedback('Нові паролі не збігаються.');return;}
 btn.disabled=true;btn.textContent='Перевіряємо код…';submitting=true;
 try{
  await verifyOtp({phone:contact,token:code});await setAccountPassword(password);
  feedback('Пароль змінено. Ви входите у ВАТРУ.',true);location.replace('index.html');
 }catch(err){feedback(errors[err.code]||err.message||'Не вдалося змінити пароль. Перевірте код і спробуйте ще раз.');}
 finally{btn.disabled=false;btn.textContent='Підтвердити код і змінити пароль';submitting=false;}
});
$('#showPassword').closest('.field').hidden=false;
$('#showPassword').addEventListener('click',()=>{const input=$('#password');const reveal=input.type==='password';input.type=reveal?'text':'password';$('#showPassword').textContent=reveal?'Приховати':'Показати';$('#showPassword').setAttribute('aria-pressed',String(reveal));$('#showPassword').setAttribute('aria-label',reveal?'Приховати пароль':'Показати пароль');});
const strengthMarkup=document.createElement('div');strengthMarkup.className='password-strength';strengthMarkup.id='passwordStrength';strengthMarkup.setAttribute('aria-live','polite');strengthMarkup.innerHTML='<div class="password-strength-heading"><strong>Надійність пароля</strong><span class="password-strength-status">Ще не введено</span></div><div class="password-strength-track" aria-hidden="true"><span></span></div><div class="password-rules"><span data-rule="length">12+ символів</span><span data-rule="lower">мала латинська літера (a–z)</span><span data-rule="upper">велика латинська літера (A–Z)</span><span data-rule="number">цифра (0–9)</span><span data-rule="symbol">спецсимвол (!@#$…)</span></div><small class="password-strength-label">Для кращого захисту створіть довгий унікальний пароль. Не використовуйте ім’я, дату народження, прості слова чи пароль з інших сайтів.</small>';
$('#password').closest('.field').append(strengthMarkup);
function updatePasswordStrength(){
 const p=$('#password').value;
 const relevantMode=mode==='register';
 const showMeter=relevantMode&&p.length>0;
 $('#passwordHelp').hidden=!(relevantMode&&!p);
 strengthMarkup.hidden=!(relevantMode&&p.length>0);
 const checks={length:p.length>=12,lower:/[a-z]/.test(p),upper:/[A-Z]/.test(p),number:/[0-9]/.test(p),symbol:/[!@#$%^&*()_+=\[\]{};:'"|<>?,.\/~-]/.test(p)};
 const score=Object.values(checks).filter(Boolean).length;
 const bar=strengthMarkup.querySelector('.password-strength-track span');
 const label=strengthMarkup.querySelector('.password-strength-label');
 const status=strengthMarkup.querySelector('.password-strength-status');
 bar.style.width=(p?score*20:0)+'%';bar.dataset.level=score<3?'weak':score<5?'medium':'strong';
 Object.entries(checks).forEach(([key,ok])=>{const rule=strengthMarkup.querySelector('[data-rule="'+key+'"]');if(rule)rule.classList.toggle('is-met',!!p&&ok);});
 if(!p){
  status.textContent='Ще не введено';label.textContent='Коли почнете вводити пароль, тут з’явиться оцінка його надійності.';
  Object.keys(checks).forEach(key=>strengthMarkup.querySelector('[data-rule="'+key+'"]')?.classList.remove('is-met'));
  return;
 }
 status.textContent=score<3?'Слабкий':score<5?'Середній':'Сильний';
 label.textContent=score<3?'Пароль легко вгадати. Зробіть його довшим і додайте відсутні типи символів.':score<5?'Непогано. Виконайте решту вимог і зробіть пароль довшим.':'Добре. Використайте його лише у ВАТРІ й не передавайте іншим.';
}
let captchaVisibilityState=false,lastCaptchaCredential='';
function syncCaptchaVisibility(){
 const password=$('#password').value,confirmation=$('#confirm').value;
 const credential=mode+'|'+password+'|'+(mode==='register'?confirmation:'');
 const wrap=$('#captchaWrap');if(!wrap)return;
 if(challengePassed&&lastCaptchaCredential&&credential!==lastCaptchaCredential)challengePassed=false;
 if(!wrap.classList.contains('captcha-modal'))wrap.hidden=true;
 lastCaptchaCredential=credential;
}
$('#password').addEventListener('input',()=>{updatePasswordStrength();syncCaptchaVisibility();});
$('#confirm').addEventListener('input',syncCaptchaVisibility);
onAuthStateChanged(auth,u=>{if(!u||submitting||$('#recoveryDialog').open||suppressAuthRedirect||pendingHumanAction)return;const legalRequest=new URLSearchParams(location.search).get('legal');if(['rules','privacy','terms'].includes(legalRequest))return;if(new URLSearchParams(location.search).get('mode')==='new-password'){show('new-password');return;}location.replace('index.html');});
$('#authForm').addEventListener('submit',async e=>{
 e.preventDefault();if(submitting)return;
 if(pendingHumanAction&&challengePassed){
  pendingHumanAction=null;
  closeHumanCaptcha();
 }
 if(authCooldownRemaining()>0){refreshAuthCooldown();$('#error').textContent=errors['auth/too-many-requests'];return;}
 const btn=$('#submit'),isPhone=selectedMethod()==='phone',contact=isPhone?currentAuthContact():$('#email').value.trim().toLowerCase(),dob=$('#birthday').value,token=captchaToken();
 $('#error').textContent='';$('#error').classList.remove('success');

 if(mode!=='new-password'&&isPhone&&!/^\+[1-9]\d{7,14}$/.test(contact)){ $('#error').textContent='Введіть номер у міжнародному форматі, наприклад +380XXXXXXXXX.';return;}
 if(mode!=='new-password'&&!isPhone&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)){ $('#error').textContent='Введіть коректну адресу електронної пошти.';return;}
 const reg=mode==='register';
 if(reg&&!$('#legalConsent').checked){$('#error').textContent='Щоб створити акаунт, підтвердьте згоду з Умовами користування та Правилами спільноти й ознайомлення з Політикою конфіденційності.';$('#legalConsentWrap').scrollIntoView({behavior:'smooth',block:'center'});$('#legalConsent').focus();return;}
 let first='',last='',name='';
 if(reg){
  first=$('#firstName').value.trim();last=$('#lastName').value.trim();name=(first+' '+last).trim();
  if(first.length<2||last.length<2){$('#error').textContent='Вкажіть ім’я та прізвище (не менше 2 символів кожне).';return;}
  if(!['male','female'].includes($('#gender').value)){$('#error').textContent='Оберіть стать: чоловік або жінка.';$('#gender').focus();return;}if(!dob){$('#error').textContent='Вкажіть дату народження: день, місяць і рік.';$('#birthday').focus();return;}
  const birthDate=new Date(dob+'T00:00:00'),today=new Date();let age=today.getFullYear()-birthDate.getFullYear();if(today.getMonth()<birthDate.getMonth()||(today.getMonth()===birthDate.getMonth()&&today.getDate()<birthDate.getDate()))age--;
  if(Number.isNaN(birthDate.getTime())||birthDate>today||age<13){$('#error').textContent='ВАТРА доступна з 13 років. Перевірте дату народження.';return;}
  const password=$('#password').value,confirmation=$('#confirm').value;
  if(!isStrongPassword(password)){$('#error').textContent='Створіть пароль на 12+ символів із малою й великою латинськими літерами, цифрою та спеціальним символом.';$('#password').focus();return;}
  if(password!==confirmation){$('#error').textContent='Паролі не збігаються.';$('#confirm').focus();return;}
 }
 if((mode==='login'||mode==='new-password')&&!$('#password').value){$('#error').textContent='Введіть пароль.';$('#password').focus();return;}
 if(mode==='new-password'){
  const newPass=$('#password').value,confirmation=$('#confirm').value;
  if(!isStrongPassword(newPass)){ $('#error').textContent='Пароль має містити 12+ символів, великі й малі латинські літери, цифру та спецсимвол.';$('#password').focus();return; }
  if(newPass!==confirmation){ $('#error').textContent='Паролі не збігаються.';$('#confirm').focus();return; }
 }
 if(mode==='login'&&!challengePassed){
  pendingHumanAction={mode,contact};
  submitting=true;suppressAuthRedirect=true;btn.disabled=true;btn.textContent='Перевіряємо дані…';
  try{
   await verifyPasswordCredentials(contact,$('#password').value);
   openHumanCaptcha();
  }catch(err){
   pendingHumanAction=null;
   $('#error').textContent=errors[err.code]||err.message||'Не вдалося перевірити облікові дані. Перевірте інтернет і спробуйте ще раз.';
   $('#error').classList.remove('success');
   if(err.code==='auth/too-many-requests')startAuthRateLimitCooldown(300);
  }finally{
   submitting=false;suppressAuthRedirect=false;
   refreshAuthCooldown();
  }
  return;
 }
 if(mode==='register'&&!challengePassed){
  pendingHumanAction={mode,contact};
  openHumanCaptcha();
  return;
 }
 if(challengePassed)challengePassed=false;
 const old=btn.textContent;submitting=true;suppressAuthRedirect=true;btn.disabled=true;btn.textContent=mode==='login'?'Перевіряємо дані…':mode==='reset'?'Надсилаємо посилання…':mode==='new-password'?'Зберігаємо пароль…':'Перевіряємо дані…';
 try{

  if(mode==='new-password'){
   await setAccountPassword($('#password').value);
   $('#error').textContent='Пароль змінено успішно. Відкриваємо ВАТРУ…';$('#error').classList.add('success');location.replace('index.html');return;
  }
  if(mode==='reset'){
   await sendPasswordResetEmail(auth,contact);
   $('#error').textContent='Якщо акаунт існує, інструкція для відновлення надійде на пошту.';
   $('#error').classList.add('success');return;
  }
  if(mode==='login'){
   await signInWithPassword(auth,contact,$('#password').value);
   location.replace('index.html');
   return;
  }
  const gender=$('#gender').value;const userData={name,displayName:name,firstName:first,lastName:last,gender,dateOfBirth:dob};
  const signup=await signUpWithPassword(isPhone
   ?{phone:contact,password:$('#password').value,userData,captchaToken:token}
   :{email:contact,password:$('#password').value,userData,captchaToken:token});
  if(!signup?.user)throw new Error('Supabase не повернув нового користувача. Перевірте Authentication → Providers.');
  const registrationData={contact,isPhone,dob,first,last,name,gender};
  if(!signup.session){
   const err=new Error('Щоб створювати акаунти без кодів, у Supabase → Authentication → Providers вимкніть Confirm email і Confirm phone. Поки ці параметри ввімкнені, Supabase сам надсилає підтвердження, а клієнтський код не може безпечно обійти це правило.');
   err.code='auth/confirmation-required';throw err;
  }
  await finishRegistration({...registrationData,user:signup.user});
  location.replace('index.html');
  return;
 }catch(err){
  pendingHumanAction=null;suppressAuthRedirect=false;
  $('#error').textContent=errors[err.code]||err.message||'Не вдалося виконати дію. Перевірте інтернет і налаштування авторизації.';
  $('#error').classList.remove('success');
  if(err.code==='auth/too-many-requests')startAuthRateLimitCooldown(300);
  if(window.turnstile&&captchaWidget!==null)window.turnstile.reset(captchaWidget);
 }finally{submitting=false;if(!pendingHumanAction)suppressAuthRedirect=false;refreshAuthCooldown();}
});
enhanceDatePicker($('#birthday'));enhancePhoneInput($('#email'),'countryCode');enhancePhoneInput($('#recoveryContact'),'recoveryCountryCode');const captchaWrap=$('#captchaWrap');$('#confirmWrap').insertAdjacentElement('afterend',captchaWrap);renderCaptcha();$('#authForm').autocomplete='off';$('#email').autocomplete='off';$('#password').autocomplete='new-password';$('#confirm').autocomplete='new-password';
$('#password').value='';$('#confirm').value='';
const params=new URLSearchParams(location.search),requestedMode=params.get('mode');const initialMode=['login','register','reset','new-password'].includes(requestedMode)?requestedMode:(location.pathname.toLowerCase().endsWith('register.html')?'register':'login');const emailRadio=document.querySelector('input[name="authMethod"][value="email"]');if(emailRadio)emailRadio.checked=true;$('#method').value='email';show(initialMode);syncAuthMethodUI(selectedMethod());if(authCooldownRemaining()>0&&!authCooldownTimer)authCooldownTimer=setInterval(refreshAuthCooldown,1000);const requestedLegal=params.get('legal');if(['rules','privacy','terms'].includes(requestedLegal))openLegal(requestedLegal);

// Do not display stale/saved passwords on a fresh visit. Wait briefly for browser autofill,
// but preserve text once the user actually starts typing or pasting.
let authPasswordWasManuallyEdited=false,authConfirmWasManuallyEdited=false;
['keydown','beforeinput','paste','compositionstart'].forEach(type=>{
 $('#password').addEventListener(type,()=>{authPasswordWasManuallyEdited=true;});
 $('#confirm').addEventListener(type,()=>{authConfirmWasManuallyEdited=true;});
});
function clearUnrequestedPasswordAutofill(){
 let changed=false;
 if(!authPasswordWasManuallyEdited&&document.activeElement!==$('#password')&&$('#password').value){$('#password').value='';changed=true;}
 if(!authConfirmWasManuallyEdited&&document.activeElement!==$('#confirm')&&$('#confirm').value){$('#confirm').value='';changed=true;}
 if(changed){updatePasswordStrength();syncCaptchaVisibility();}
}
clearUnrequestedPasswordAutofill();
[120,450,1000].forEach(delay=>window.setTimeout(clearUnrequestedPasswordAutofill,delay));
window.addEventListener('pageshow',()=>window.setTimeout(clearUnrequestedPasswordAutofill,120));
function authResetScrollTop(){
 if(location.hash)return;
 window.scrollTo(0,0);
}
window.addEventListener('pageshow',authResetScrollTop);
window.addEventListener('load',authResetScrollTop,{once:true});
requestAnimationFrame(authResetScrollTop);
window.__vatraAuthReady = true;
