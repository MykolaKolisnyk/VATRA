import { initializeApp, getAuth, onAuthStateChanged, sendPasswordResetEmail, getDatabase, ref, set, sendOtp, verifyOtp } from './vatra-backend.js?v=20261024-4';
const app=initializeApp(),auth=getAuth(app),db=getDatabase(app);
const $=s=>document.querySelector(s);
let mode='login',submitting=false,codeSent=false,captchaWidget=null;
const TURNSTILE_SITE_KEY=''; // Optional: set a real Turnstile site key and enable server-side verification for stronger protection.
const errors={
 'auth/email-already-in-use':'Ця пошта вже зареєстрована. Увійди у свій акаунт.',
 'auth/invalid-email':'Введи коректну електронну пошту.',
 'auth/too-many-requests':'Забагато спроб. Зачекай і спробуй пізніше.',
 'auth/network-request-failed':'Немає з’єднання з інтернетом.',
 'auth/operation-not-allowed':'Цей спосіб авторизації ще не увімкнений у налаштуваннях.',
 'auth/invalid-credential':'Код неправильний або вже застарів.',
 'auth/user-not-found':'Акаунт не знайдено. Спочатку створи акаунт.',
 'auth/weak-password':'Пароль занадто слабкий.'
};
let challengeAnswer=null,challengePassed=false;
function resetHumanChallenge(){
 challengePassed=false;challengeAnswer=2+Math.floor(Math.random()*8)+2+Math.floor(Math.random()*8);
 const a=2+Math.floor(Math.random()*8),b=2+Math.floor(Math.random()*8);challengeAnswer=a+b;
 const options=new Set([challengeAnswer]);while(options.size<3)options.add(challengeAnswer+Math.floor(Math.random()*7)-3);const choices=[...options].sort(()=>Math.random()-.5);
 const wrap=$('#captchaWrap');if(!wrap)return;
 wrap.innerHTML='<div class="human-captcha"><div class="human-captcha-title"><span aria-hidden="true">✳</span><span>Швидка перевірка</span><span class="human-captcha-tag">Захист ВАТРИ</span></div><p>Щоб продовжити, обери правильну відповідь:</p><div class="human-captcha-question">'+a+' + '+b+' = ?</div><div class="human-captcha-options">'+choices.map(n=>'<button type="button" class="human-captcha-option" data-captcha-answer="'+n+'">'+n+'</button>').join('')+'</div><p class="human-captcha-status" id="humanCaptchaStatus" aria-live="polite">Це додаткова перевірка від автоматизованих запитів.</p></div>';
 wrap.querySelectorAll('[data-captcha-answer]').forEach(btn=>btn.addEventListener('click',()=>{wrap.querySelectorAll('[data-captcha-answer]').forEach(x=>x.classList.remove('is-correct','is-wrong'));if(Number(btn.dataset.captchaAnswer)===challengeAnswer){challengePassed=true;btn.classList.add('is-correct');$('#humanCaptchaStatus').textContent='Перевірку пройдено.';$('#humanCaptchaStatus').classList.add('is-passed');}else{btn.classList.add('is-wrong');$('#humanCaptchaStatus').textContent='Не зовсім. Спробуй ще раз.';challengePassed=false;}}));
}
function captchaToken(){if(!TURNSTILE_SITE_KEY)return '';try{return window.turnstile&&captchaWidget!==null?window.turnstile.getResponse(captchaWidget):'';}catch{return '';}}
function renderCaptcha(){if(!TURNSTILE_SITE_KEY)return;const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.onload=()=>{if(window.turnstile&&!captchaWidget)captchaWidget=window.turnstile.render('#turnstileWidget',{sitekey:TURNSTILE_SITE_KEY,theme:'light'});};document.head.append(script);}
function show(m){mode=m;codeSent=false;resetHumanChallenge();$('#otpWrap').hidden=true;$('#otp').value='';$('#loginTab').classList.toggle('selected',m==='login');$('#registerTab').classList.toggle('selected',m==='register');const reg=m==='register',reset=m==='reset';$('#firstNameWrap').hidden=!reg;$('#lastNameWrap').hidden=!reg;$('#birthdayWrap').hidden=!reg;$('#birthday').required=reg;$('#confirmWrap').hidden=true;$('#password').required=false;$('#confirm').required=false;$('#password').closest('.field').hidden=true;$('#forgot').hidden=reg;$('#forgot').textContent='Відновити доступ через email';$('#firstName').required=reg;$('#lastName').required=reg;$('#email').required=true;$('#method').disabled=reset;$('#method').closest('.field').hidden=reset;$('#eyebrow').textContent=reg?'ТВОЯ ІСТОРІЯ ПОЧИНАЄТЬСЯ ТУТ':'РАДІ БАЧИТИ ЗНОВУ';$('#title').textContent=reg?'Створи акаунт ВАТРИ':'З поверненням до ВАТРИ';$('#desc').textContent=reg?'Вкажи свої дані — ми надішлемо одноразовий код для підтвердження.':'Отримай одноразовий код на пошту або телефон, щоб увійти без пароля.';$('#submit').textContent='Надіслати код';$('#bottom').hidden=false;$('#bottom').innerHTML=reg?'Вже маєш акаунт? <button id="switch" type="button">Увійти</button>':'Ще немає акаунта? <button id="switch" type="button">Зареєструватися</button>';$('#switch').onclick=()=>show(reg?'login':'register');$('#error').textContent='';$('#error').classList.remove('success');$('#email').type=$('#method').value==='phone'?'tel':'email';$('#email').autocomplete=$('#method').value==='phone'?'tel':'email';$('#email').placeholder=$('#method').value==='phone'?'+380XXXXXXXXX':'name@example.com';$('#contactLabel').textContent=$('#method').value==='phone'?'Номер телефону з кодом країни':'Електронна пошта';$('#birthday').max=new Date().toISOString().slice(0,10);}
$('#method').addEventListener('change',()=>{codeSent=false;$('#otpWrap').hidden=true;$('#submit').textContent='Надіслати код';$('#email').type=$('#method').value==='phone'?'tel':'email';$('#email').autocomplete=$('#method').value==='phone'?'tel':'email';$('#email').placeholder=$('#method').value==='phone'?'+380XXXXXXXXX':'name@example.com';$('#contactLabel').textContent=$('#method').value==='phone'?'Номер телефону з кодом країни':'Електронна пошта';$('#error').textContent='';});
$('#loginTab').onclick=()=>show('login');$('#registerTab').onclick=()=>show('register');
$('#forgot').onclick=async()=>{if($('#method').value==='phone'){show('reset');$('#method').value='email';$('#method').dispatchEvent(new Event('change'));return;}const email=$('#email').value.trim().toLowerCase();if(!email){$('#error').textContent='Спочатку введи свою електронну пошту.';return;}try{await sendPasswordResetEmail(auth,email);$('#error').textContent='Якщо акаунт існує, інструкція для відновлення надійде на пошту.';$('#error').classList.add('success');}catch(e){$('#error').textContent=errors[e.code]||'Не вдалося надіслати лист.';}};
$('#showPassword').closest('.field').hidden=true;
onAuthStateChanged(auth,u=>{if(u&&!submitting)location.replace('index.html');});
$('#authForm').addEventListener('submit',async e=>{
 e.preventDefault();if(submitting)return;
 if(!challengePassed){$('#error').textContent='Спочатку пройди коротку перевірку від ботів.';$('#captchaWrap').scrollIntoView({behavior:'smooth',block:'center'});return;}
 const btn=$('#submit'),contact=$('#email').value.trim(),isPhone=$('#method').value==='phone',dob=$('#birthday').value,token=captchaToken();
 $('#error').textContent='';$('#error').classList.remove('success');
 if(isPhone&&!/^\+[1-9]\d{7,14}$/.test(contact)){ $('#error').textContent='Введи номер у міжнародному форматі, наприклад +380XXXXXXXXX.';return;}
 if(!isPhone&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)){ $('#error').textContent='Введи коректну адресу електронної пошти.';return;}
 const reg=mode==='register';
 if(reg){
  const first=$('#firstName').value.trim(),last=$('#lastName').value.trim();
  if(first.length<2||last.length<2){$('#error').textContent='Вкажи ім’я та прізвище (не менше 2 символів кожне).';return;}
  if(!dob){$('#error').textContent='Вкажи дату народження: день, місяць і рік.';$('#birthday').focus();return;}
  const birthDate=new Date(dob+'T00:00:00'),today=new Date();let age=today.getFullYear()-birthDate.getFullYear();if(today.getMonth()<birthDate.getMonth()||(today.getMonth()===birthDate.getMonth()&&today.getDate()<birthDate.getDate()))age--;
  if(Number.isNaN(birthDate.getTime())||birthDate>today||age<13){$('#error').textContent='ВАТРА доступна з 13 років. Перевір дату народження.';return;}
 }
 const old=btn.textContent;submitting=true;btn.disabled=true;btn.textContent=codeSent?'Перевіряємо код…':'Надсилаємо код…';
 try{
  const first=$('#firstName').value.trim(),last=$('#lastName').value.trim(),name=(first+' '+last).trim();
  const userData=reg?{name,displayName:name,firstName:first,lastName:last,dateOfBirth:dob}: {};
  if(!codeSent){
   await sendOtp({email:isPhone?undefined:contact,phone:isPhone?contact:undefined,shouldCreateUser:reg,userData,captchaToken:token});
   codeSent=true;$('#otpWrap').hidden=false;$('#otp').required=true;$('#submit').textContent='Підтвердити код';$('#desc').textContent='Код надіслано. Перевір пошту або SMS та введи його нижче.';$('#error').textContent='Код надіслано. Перевір також папку «Спам», якщо це email.';$('#error').classList.add('success');$('#otp').focus();return;
  }
  const otp=$('#otp').value.trim();if(!/^\d{4,8}$/.test(otp)){ $('#error').textContent='Введи код підтвердження з повідомлення.';return;}
  const verified=await verifyOtp({email:isPhone?undefined:contact,phone:isPhone?contact:undefined,token:otp,captchaToken:token});
  if(reg){
   const user=verified.user,uid=user.uid,handle=(first+'.'+last).toLocaleLowerCase('uk-UA').replace(/[^\p{L}\p{N}]+/gu,'.').replace(/^\.|\.$/g,'').slice(0,24);
   const profile={firstName:first,lastName:last,name,handle,bio:'',avatarUrl:'',coverUrl:'',city:'',location:'',phone:isPhone?contact:'',phoneVisibility:'private',birthdayVisibility:'private',cityVisibility:'private',locationVisibility:'private',profileVisibility:'public',searchable:true,allowMessages:true,createdAt:Date.now()};
   await set(ref(db,'users/'+uid),profile);
   await set(ref(db,'publicProfiles/'+uid),{firstName:first,lastName:last,name,handle,bio:'',avatarUrl:'',coverUrl:'',birthdayVisibility:'private',cityVisibility:'private',locationVisibility:'private',profileVisibility:'public',searchable:true,allowMessages:true,createdAt:profile.createdAt,updatedAt:profile.createdAt});
   await set(ref(db,'privateUsers/'+uid),{dateOfBirth:dob,phone:isPhone?contact:null,updatedAt:Date.now()});
  }
  location.replace('index.html');
 }catch(err){submitting=false;$('#error').textContent=errors[err.code]||err.message||'Не вдалося виконати дію. Перевір інтернет і налаштування авторизації.';$('#error').classList.remove('success');if(window.turnstile&&captchaWidget!==null)window.turnstile.reset(captchaWidget);}
 finally{btn.disabled=false;btn.textContent=codeSent?'Підтвердити код':'Надіслати код';submitting=false;}
});
renderCaptcha();show(location.pathname.toLowerCase().endsWith('register.html')?'register':'login');
