import { initializeApp, getAuth, onAuthStateChanged, sendPasswordResetEmail, getDatabase, ref, get, set, sendOtp, signUpWithPassword, resendSignupOtp, verifyOtp, signInWithPassword, verifyPasswordCredentials, setAccountPassword, setRememberMe, getRememberMe } from './vatra-backend.js?v=20261104-8';

// Prevent the browser from restoring an old scroll position on the sign-in page.
if('scrollRestoration' in history)history.scrollRestoration='manual';
window.scrollTo(0,0);
const app=initializeApp(),auth=getAuth(app),db=getDatabase(app);
const $=s=>document.querySelector(s);
// SMS is intentionally unavailable until a real SMS provider is configured and tested.
const VATRA_SMS_AUTH_ENABLED=false;
// Keep new-account SMS signup off until the provider is commissioned. Recovery
// may attempt SMS for an existing, verified phone (server decides availability).
const VATRA_SMS_RECOVERY_UI_ENABLED=true;
const selectedMethod=()=>(VATRA_SMS_AUTH_ENABLED||mode==='login')?(document.querySelector('input[name="authMethod"]:checked')?.value||$('#method')?.value||'email'):'email';
function vatraSignupLanguage(){
 const supported=['uk','en','pl','de','fr','es','pt','it'];
 let language=window.vatraLanguage?.language||'';
 if(!language){
  try{language=new URL(location.href).searchParams.get('lang')||localStorage.getItem('vatra-language')||'';}catch{}
 }
 return supported.includes(language)?language:'en';
}



const PHONE_COUNTRIES = [
 {iso:'UA',name:'Україна',dial:'+380'},
 {iso:'PL',name:'Польща',dial:'+48'},
 {iso:'DE',name:'Німеччина',dial:'+49'},
 {iso:'FR',name:'Франція',dial:'+33'},
 {iso:'ES',name:'Іспанія',dial:'+34'},
 {iso:'PT',name:'Португалія',dial:'+351'},
 {iso:'IT',name:'Італія',dial:'+39'},
 {iso:'GB',name:'Велика Британія',dial:'+44'},
 {iso:'US',name:'США',dial:'+1'}
];
/* Use crisp SVG flags in the selected country and each menu row.
   Native <option> nodes cannot reliably render HTML/SVG, so the native
   select remains the single source of truth and this is its visual control. */
function countryFlagSvg(iso){
 const flags={
  UA:'<path fill="#2879c5" d="M0 0h28v10H0z"/><path fill="#ffd64d" d="M0 10h28v10H0z"/>',
  PL:'<path fill="#fff" d="M0 0h28v10H0z"/><path fill="#dc3c53" d="M0 10h28v10H0z"/>',
  DE:'<path fill="#222" d="M0 0h28v7H0z"/><path fill="#d64240" d="M0 7h28v7H0z"/><path fill="#ffca44" d="M0 14h28v6H0z"/>',
  FR:'<path fill="#2159ad" d="M0 0h9v20H0z"/><path fill="#fff" d="M9 0h10v20H9z"/><path fill="#d94a4a" d="M19 0h9v20h-9z"/>',
  GB:'<path fill="#244d9c" d="M0 0h28v20H0z"/><path stroke="#fff" stroke-width="5" d="m0 0 28 20M28 0 0 20"/><path stroke="#d94655" stroke-width="2" d="m0 0 28 20M28 0 0 20"/><path stroke="#fff" stroke-width="7" d="M14 0v20M0 10h28"/><path stroke="#dc3d52" stroke-width="3.5" d="M14 0v20M0 10h28"/>',
  ES:'<path fill="#c83a48" d="M0 0h28v5H0zM0 15h28v5H0z"/><path fill="#f8c84b" d="M0 5h28v10H0z"/>',
  PT:'<path fill="#218a69" d="M0 0h12v20H0z"/><path fill="#d54245" d="M12 0h16v20H12z"/><circle cx="12" cy="10" r="4" stroke="#f4cf65" fill="none" stroke-width="1.8"/>',
  IT:'<path fill="#26966e" d="M0 0h9v20H0z"/><path fill="#fff" d="M9 0h10v20H9z"/><path fill="#d64c50" d="M19 0h9v20h-9z"/>',
  US:'<path fill="#fff" d="M0 0h28v20H0z"/><path fill="#c43b4b" d="M0 0h28v2H0zm0 4h28v2H0zm0 4h28v2H0zm0 4h28v2H0zm0 4h28v2H0z"/><path fill="#244d9c" d="M0 0h12v11H0z"/><path fill="#fff" d="M2 2h2v2H2zm4 0h2v2H6zm3 3h2v2H9zm-7 2h2v2H2zm4 0h2v2H6z"/>'
 };
 return '<svg viewBox="0 0 28 20" width="28" height="20" class="vatra-phone-flag" aria-hidden="true" focusable="false"><rect width="28" height="20" rx="2" fill="#fff"/>'+(flags[iso]||flags.UA)+'</svg>';
}

/* National digits only; lengths are ranges when the country has variable numbering. */
const VATRA_PHONE_RULES=Object.freeze({
 UA:{min:10,max:10,prefix:'0',placeholder:'0930657340'},
 PL:{min:9,max:9,placeholder:'501234567'},
 DE:{min:7,max:14,prefix:'0',placeholder:'015112345678'},
 FR:{min:10,max:10,prefix:'0',placeholder:'0612345678'},
 ES:{min:9,max:9,placeholder:'612345678'},
 PT:{min:9,max:9,placeholder:'912345678'},
 IT:{min:6,max:12,placeholder:'0212345678'},
 GB:{min:11,max:11,prefix:'0',placeholder:'07123456789'},
 US:{min:10,max:10,placeholder:'2025550123'}
});
function vatraPhoneCountry(select){
 const iso=select?.options?.[select.selectedIndex]?.dataset?.iso;
 return PHONE_COUNTRIES.find(c=>c.iso===iso)||
  PHONE_COUNTRIES.find(c=>c.dial===(select?.value||'+380'))||PHONE_COUNTRIES[0];
}
function vatraPhoneRule(select){
 return VATRA_PHONE_RULES[vatraPhoneCountry(select).iso]||VATRA_PHONE_RULES.UA;
}
function vatraPhoneLocalDigits(value,select){
 const text=String(value||'').trim(),c=vatraPhoneCountry(select),rule=vatraPhoneRule(select);
 let digits=text.replace(/\D/g,'');
 const international=text.startsWith('+')||text.startsWith('00')||digits.length>rule.max;
 if(text.startsWith('00'))digits=digits.slice(2);
 if(international&&digits.startsWith(c.dial.slice(1))){
  digits=digits.slice(c.dial.length-1);
  if(rule.prefix&&!digits.startsWith(rule.prefix))digits=rule.prefix+digits;
 }
 return digits.slice(0,rule.max);
}
function vatraApplyPhoneRule(input,select){
 if(!input)return;
 const rule=vatraPhoneRule(select),country=vatraPhoneCountry(select);
 input.type='tel';input.inputMode='numeric';input.autocomplete='tel-national';
 input.placeholder=rule.placeholder;input.maxLength=rule.max;input.minLength=rule.min;
 input.pattern='[0-9]{'+(rule.min===rule.max?rule.min:rule.min+','+rule.max)+'}';
 input.setAttribute('aria-label','Номер телефону без коду країни, лише цифри');
 input.setAttribute('aria-description','Місцевий номер для '+country.name+'. Код країни додано зліва.');
 input.value=vatraPhoneLocalDigits(input.value,select);
}
function vatraPhoneError(input,select){
 const digits=String(input?.value||''),c=vatraPhoneCountry(select),r=vatraPhoneRule(select);
 if(!/^\d+$/.test(digits))return 'Номер телефону має містити лише цифри.';
 if(r.prefix&&!digits.startsWith(r.prefix))
  return 'Номер для країни «'+c.name+'» має починатися з '+r.prefix+'.';
 if(digits.length<r.min||digits.length>r.max)
  return r.min===r.max?'Введіть '+r.min+' цифр номера для країни «'+c.name+'».':
   'Для країни «'+c.name+'» введіть від '+r.min+' до '+r.max+' цифр.';
 if(!/^\+[1-9]\d{7,14}$/.test(normalizePhone(input,select)))
  return 'Некоректний номер у міжнародному форматі.';
 return '';
}
function enhanceCountryMenu(select,row){
 const button=document.createElement('button');button.type='button';button.className='vatra-phone-country-trigger';
 button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
 button.setAttribute('aria-label','Оберіть країну та телефонний код');
 const menu=document.createElement('div');menu.id=select.id+'Menu';menu.className='vatra-phone-country-menu';menu.setAttribute('role','listbox');
 menu.setAttribute('aria-label','Країни та телефонні коди');menu.hidden=true;
 button.setAttribute('aria-controls',menu.id);
 for(const c of PHONE_COUNTRIES){
  const item=document.createElement('button');item.type='button';item.className='vatra-phone-country-option';
  item.setAttribute('role','option');item.dataset.iso=c.iso;item.dataset.dial=c.dial;
  item.innerHTML=countryFlagSvg(c.iso)+'<span>'+c.name+'</span><b>'+c.dial+'</b>';
  item.addEventListener('click',()=>{
   if(select.value!==c.dial){
    select.value=c.dial;
    const phoneInput=row.querySelector('input');if(phoneInput)phoneInput.value='';
   }
   select.dispatchEvent(new Event('change',{bubbles:true}));
   close();button.focus();
  });
  menu.append(item);
 }
 row.insertBefore(button,inputPlaceholderForCountry(row));row.append(menu);
 function update(){
  const option=select.options[select.selectedIndex],iso=option?.dataset.iso||'UA';
  const c=PHONE_COUNTRIES.find(country=>country.iso===iso)||PHONE_COUNTRIES[0];
  button.innerHTML=countryFlagSvg(c.iso)+'<span>'+c.dial+'</span><svg viewBox="0 0 20 20" aria-hidden="true" class="vatra-phone-chevron"><path d="m5 7 5 5 5-5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  button.title=c.name+' ('+c.dial+')';
  menu.querySelectorAll('[role="option"]').forEach(el=>el.setAttribute('aria-selected',String(el.dataset.iso===iso)));
 }
 function close(){menu.hidden=true;button.setAttribute('aria-expanded','false');}
 button.addEventListener('click',()=>{
  const wasOpen=!menu.hidden;
  menu.hidden=wasOpen;button.setAttribute('aria-expanded',String(!wasOpen));
  if(!wasOpen)menu.querySelector('[aria-selected="true"]')?.focus();
 });
 menu.addEventListener('keydown',event=>{
  const items=[...menu.querySelectorAll('[role="option"]')];
  const i=items.indexOf(document.activeElement);
  if(event.key==='Escape'){event.preventDefault();close();button.focus();}
  else if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();items[(i+(event.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();
  }else if(event.key==='Home'||event.key==='End'){
   event.preventDefault();items[event.key==='Home'?0:items.length-1]?.focus();
  }
 });
 document.addEventListener('pointerdown',event=>{if(!row.contains(event.target))close();});
 row.addEventListener('focusout',event=>{if(!row.contains(event.relatedTarget))close();});
 select.addEventListener('change',()=>{
  update();
  if(!row.classList.contains('phone-number-control--email'))
   vatraApplyPhoneRule(row.querySelector('input'),select);
 });
 update();return {button,menu,close};
}
function inputPlaceholderForCountry(row){return row.querySelector('input');}
function enhancePhoneInput(input,selectId){
 if(!input||document.getElementById(selectId))return;
 // Keep +380 for normalization, but render a fixed Ukrainian flag and code instead of a dropdown.
 const select=document.createElement('select');select.id=selectId;select.className='phone-country-code';select.setAttribute('aria-label','Країна і телефонний код');select.hidden=true;
 for(const c of PHONE_COUNTRIES){const option=document.createElement('option');option.value=c.dial;option.textContent=c.dial+' · '+c.name;option.dataset.iso=c.iso;select.append(option);}select.value='+380';
 select.setAttribute('aria-hidden','true');select.tabIndex=-1;
 const row=document.createElement('div');row.className='phone-number-control';
 input.parentNode.insertBefore(row,input);row.append(select,input);
 enhanceCountryMenu(select,row);
 input.addEventListener('beforeinput',e=>{
  if(input.type==='tel'&&e.data&&!e.isComposing&&!/^\d+$/.test(e.data))e.preventDefault();
 });
 input.addEventListener('paste',e=>{
  if(input.type!=='tel')return;
  e.preventDefault();
  input.value=vatraPhoneLocalDigits(e.clipboardData?.getData('text')||'',select);
  input.dispatchEvent(new Event('input',{bubbles:true}));
 });
 input.addEventListener('input',()=>{
  if(input.type!=='tel')return;
  const raw=input.value,clean=vatraPhoneLocalDigits(raw,select);
  if(raw!==clean){
   const before=raw.slice(0,input.selectionStart??raw.length).replace(/\D/g,'').length;
   input.value=clean;
   try{input.setSelectionRange(Math.min(before,clean.length),Math.min(before,clean.length));}catch{}
  }
 });
 input.placeholder='name@example.com';
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
 if(match){const preferred=match.dial==='+1'?'US':match.iso;const optionIndex=[...select.options].findIndex(o=>o.dataset.iso===preferred);if(optionIndex>=0)select.selectedIndex=optionIndex;else select.value=match.dial;input.value=vatraPhoneLocalDigits(normalized,select);select.dispatchEvent(new Event('change',{bubbles:true}));}
 else input.value=normalized;
}
function syncPhoneInputMode(input,select,method){
 if(!input)return;
 const phone=method==='phone';
 if(select){select.hidden=true;select.style.display='none';}
 const countryButton=input.closest('.phone-number-control')?.querySelector('.vatra-phone-country-trigger');
 const countryMenu=input.closest('.phone-number-control')?.querySelector('.vatra-phone-country-menu');
 if(countryButton)countryButton.hidden=!phone;
 if(!phone&&countryMenu)countryMenu.hidden=true;
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
 if(phone)vatraApplyPhoneRule(input,select);
 else {
  input.type='email';input.autocomplete='email';input.inputMode='email';
  input.placeholder='name@example.com';
  input.removeAttribute('pattern');input.removeAttribute('maxlength');input.removeAttribute('minlength');
  input.setAttribute('aria-label','Електронна пошта');
  input.removeAttribute('aria-description');
 }
 input.style.flex=phone?'1 1 auto':'1 1 100%';
 input.style.width=phone?'auto':'100%';
 input.style.minWidth='0';
}
function syncAuthMethodUI(method){
 const selected=(VATRA_SMS_AUTH_ENABLED||mode==='login')&&method==='phone'?'phone':'email';
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


function vatraLatinHandlePart(value){
 const translit={а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',е:'e',є:'ie',ж:'zh',з:'z',и:'y',і:'i',ї:'i',й:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ь:'',ю:'iu',я:'ia',ы:'y',э:'e',ъ:''};
 return [...String(value||'').toLocaleLowerCase('uk-UA')].map(ch=>translit[ch]??ch).join('').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'');
}
async function finishRegistration({user,contact,isPhone,dob,first,last,name,gender}){
 const uid=user?.uid||user?.id;
 if(!uid)throw new Error('Supabase не повернув ідентифікатор нового акаунта. Перевір Authentication → Providers.');
 // A client cannot create a VATRA page merely because a Supabase Auth row exists.
 // Require the server to confirm the email/phone OTP before any profile writes.
 const {data:verifiedData,error:verificationError}=await db.client.auth.getUser();
 const verifiedUser=verifiedData?.user;
 if(verificationError||verifiedUser?.id!==uid||!(isPhone?verifiedUser.phone_confirmed_at:(verifiedUser.email_confirmed_at||verifiedUser.confirmed_at))){
  throw new Error('Контакт ще не підтверджено кодом. Поверніться до кроку підтвердження.');
 }
 const latinName=[vatraLatinHandlePart(first),vatraLatinHandlePart(last)].filter(Boolean).join('.');
 const safePrefix=/^[a-z]/.test(latinName)?latinName:'user';
 const handle=safePrefix.slice(0,14).replace(/[._-]+$/,'')+'-'+uid.replace(/-/g,'').slice(0,8);
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
let pendingOtp=null,loginByCode=false,otpCooldownUntil=0,otpCooldownTimer=null;
function resetOtpStep(){
 pendingOtp=null;otpCooldownUntil=0;
 if(otpCooldownTimer){clearInterval(otpCooldownTimer);otpCooldownTimer=null;}
 $('#authForm')?.classList.remove('is-awaiting-code');
 const wrap=$('#otpWrap');if(wrap)wrap.hidden=true;
 const input=$('#otpCode');if(input){input.value='';input.required=false;input.readOnly=false;}
}
function otpNotice(message,error=false){
 const status=$('#otpStatus');if(!status)return;
 status.textContent=message;status.classList.toggle('is-error',error);
}
function syncOtpCooldown(){
 const button=$('#otpResend');if(!button)return;
 const left=Math.max(0,Math.ceil((otpCooldownUntil-Date.now())/1000));
 button.disabled=left>0||submitting;
 button.textContent=left?'Надіслати повторно через '+left+' с':'Надіслати код ще раз';
 if(!left&&otpCooldownTimer){clearInterval(otpCooldownTimer);otpCooldownTimer=null;}
}
function setOtpCooldown(){
 otpCooldownUntil=Date.now()+60000;
 if(otpCooldownTimer)clearInterval(otpCooldownTimer);
 otpCooldownTimer=setInterval(syncOtpCooldown,1000);syncOtpCooldown();
}
function syncLoginCodeMode(){
 const enabled=false; // Login always uses an account password.
 const toggle=$('#loginOtpToggle');
 if(toggle){toggle.hidden=true;toggle.setAttribute('aria-pressed','false');}
 if(mode==='login'){
  $('#password').closest('.field').hidden=enabled;
  $('#password').required=!enabled;
  $('#submit').textContent=enabled?'Надіслати код':'Увійти';
 }
}
async function startOtp(kind,details){
 if(details.isPhone&&!VATRA_SMS_AUTH_ENABLED)throw new Error('SMS-підтвердження ще не налаштоване. Використайте електронну пошту.');
 const {contact,isPhone}=details;
 const fields=isPhone?{phone:contact}:{email:contact};
 const requestedAt=Date.now();
 if(kind==='signup'){
  const signup=await signUpWithPassword({...fields,password:details.password,userData:details.userData});
  if(signup.session)throw new Error('У Supabase вимкнене підтвердження контактів. Увімкніть email confirmation перед реєстрацією.');
 }else await sendOtp({...fields,shouldCreateUser:false});
 pendingOtp={kind,requestedAt,...details};
 $('#authForm').classList.add('is-awaiting-code');
 $('#otpWrap').hidden=false;$('#otpCode').required=true;$('#otpCode').value='';
 $('#otpTitle').textContent=kind==='signup'?'Підтвердіть реєстрацію':'Підтвердіть вхід';
 $('#otpDestination').textContent='ВАТРА надіслала запит на '+(isPhone?'SMS для ':'лист для ')+contact+'. Введіть отриманий код.';
 $('#submit').textContent='Підтвердити код';$('#error').textContent='';
 otpNotice('Код діє обмежений час. Не повідомляйте його нікому.');
 setOtpCooldown();$('#otpCode').focus();
}
async function confirmOtp(){
 const challenge=pendingOtp;if(!challenge)return;
 const code=$('#otpCode').value.trim().replace(/\s/g,'');
 if(!challenge.verifiedUser&&!/^\d{6,8}$/.test(code)){otpNotice('Введіть код із 6–8 цифр.',true);return;}
 const button=$('#submit');submitting=true;suppressAuthRedirect=true;button.disabled=true;button.textContent='Перевіряємо код…';
 try{
  const contact=challenge.contact;
  const result=challenge.verifiedUser?{user:challenge.verifiedUser,session:true}:await verifyOtp(challenge.isPhone?{phone:contact,token:code,type:'sms'}:{email:contact,token:code,type:challenge.kind==='signup'?'signup':'email'});
  const user=result?.user,uid=user?.uid||user?.id;
  if(!uid||!result?.session)throw new Error('Supabase не підтвердив сесію. Повторіть спробу.');
  if(challenge.kind==='signup'){
   // A verified OTP is single-use. If writing the new page fails, retries must
   // finish the already-authenticated signup instead of consuming the code again.
   challenge.verifiedUser=user;
   // Confirmed owners of existing accounts may receive OTPs, but registration
   // must never overwrite their profile or change their password. Check once:
   // a partial first write could create users/{uid} before the other writes finish.
   if(!challenge.checkedNewAccount){
    const existing=await get(ref(db,'users/'+uid));
    const createdAt=Date.parse(user.created_at||user.createdAt||'');
    if(existing?.exists?.()||(Number.isFinite(createdAt)&&createdAt<challenge.requestedAt-60000)){
     pendingOtp=null;location.replace('index.html');return;
    }
    challenge.checkedNewAccount=true;
   }
   // Supabase signUp already stored the password; no second write needed.
   await finishRegistration({...challenge,user});
   pendingOtp=null;return;
  }
  setRememberMe($('#rememberMe')?.checked===true);
  pendingOtp=null;location.replace('index.html');
 }catch(err){
  if(challenge.verifiedUser){
   const otpField=$('#otpCode');otpField.required=false;otpField.readOnly=true;
   otpNotice('Контакт підтверджено, але завершення реєстрації не вдалося. Натисніть «Завершити реєстрацію» ще раз. '+(errors[err.code]||err.message||''),true);
  }else{
   otpNotice(errors[err.code]||err.message||'Код не вдалося перевірити.',true);
  }
  if(err.code==='auth/too-many-requests')startAuthRateLimitCooldown(300);
 }finally{
  submitting=false;suppressAuthRedirect=false;button.disabled=false;
  button.textContent=pendingOtp?(pendingOtp.verifiedUser?'Завершити реєстрацію':'Підтвердити код'):mode==='register'?'Отримати код':'Надіслати код';
  syncOtpCooldown();
 }
}
$('#otpChange')?.addEventListener('click',()=>{
 resetOtpStep();syncLoginCodeMode();$('#submit').textContent=mode==='register'?'Отримати код':'Надіслати код';
 $('#error').textContent='';$('#email').focus();
});
$('#otpResend')?.addEventListener('click',async()=>{
 if(!pendingOtp||Date.now()<otpCooldownUntil||submitting)return;
 const details=pendingOtp,button=$('#otpResend');button.disabled=true;
 try{
  const fields=details.isPhone?{phone:details.contact}:{email:details.contact};
  if(details.kind==='signup')await resendSignupOtp(fields);
  else await sendOtp({...fields,shouldCreateUser:false});
  otpNotice('Запит на новий код прийнято. Перевірте '+(details.isPhone?'SMS.':'пошту та «Спам».'));
  $('#otpCode').value='';setOtpCooldown();
 }catch(err){otpNotice(errors[err.code]||err.message||'Не вдалося повторно надіслати код.',true);syncOtpCooldown();}
});
// OTP is for new registrations and recovery, never ordinary login.

const AUTH_COOLDOWN_KEY='vatra-auth-rate-limit-until-v1';
const TURNSTILE_SITE_KEY=''; // Optional: set a real Turnstile site key and enable server-side verification for stronger protection.
const errors={
 'auth/email-already-in-use':'Цей контакт уже зареєстровано. Увійдіть до наявного акаунта.',
 'auth/invalid-email':'Введіть коректну електронну пошту.',
 'auth/email-not-authorized':'Supabase зараз надсилає тестові листи лише на дозволені адреси. Для реєстрації всіх користувачів налаштуй власний SMTP у Supabase → Authentication → SMTP Settings.',
 'auth/otp-delivery-failed':'Supabase не зміг надіслати код. Для email потрібен власний SMTP; для SMS — увімкнений Phone provider і налаштований SMS-провайдер. Перевір Authentication → Logs.',
 'auth/email-delivery-failed':'Supabase не зміг надіслати лист. Для публічної реєстрації налаштуй власний SMTP у Supabase → Authentication → SMTP Settings, підтвердь домен відправника, перевір шаблон листа на {{ .Token }} та журнал Authentication → Logs.',
 'auth/sms-delivery-failed':'Supabase не зміг надіслати SMS. Перевір Supabase → Authentication → Providers → Phone: Phone OTP має бути увімкнений, SMS-провайдер — налаштований (облікові дані, баланс і відправник). Причина зазвичай є в Authentication → Logs.',
 'auth/too-many-requests':'Supabase тимчасово обмежив запити. Зачекайте щонайменше 5 хвилин і не натискайте повторно. Для email через стандартну пошту Supabase може знадобитися до години; адміністратору слід перевірити Authentication → Rate Limits і налаштувати власний SMTP.',
 'auth/network-request-failed':'Немає з’єднання з інтернетом.',
 'auth/operation-not-allowed':'Цей спосіб авторизації ще не увімкнений у налаштуваннях.',
 'auth/invalid-credential':'Пароль неправильний або акаунт не знайдено. Перевірте дані та спробуйте ще раз.',
 'auth/user-not-found':'Акаунт не знайдено. Спочатку створіть акаунт.',
 'auth/weak-password':'Пароль занадто слабкий.',
 'auth/invalid-phone-number':'Перевірте номер у міжнародному форматі, наприклад +380XXXXXXXXX.',
 'auth/invalid-otp':'Код неправильний. Перевірте цифри та спробуйте ще раз.',
 'auth/otp-expired':'Термін дії коду завершився. Запросіть новий код.',
 'auth/unknown':'Не вдалося надіслати або перевірити код. Перевірте налаштування SMS-провайдера та спробуйте ще раз.',
};
function authContactErrorText(err,isPhone,flow){
 if(flow==='recovery'&&isPhone&&['auth/operation-not-allowed','auth/sms-delivery-failed'].includes(err?.code)){
  return 'SMS-відновлення зараз недоступне: потрібно підключити SMS-провайдера у Supabase. Скористайтеся відновленням через email.';
 }
 if(err?.code==='auth/email-already-in-use'){
  const contact=isPhone?'Номер телефону':'Електронна пошта';
  return flow==='register'
   ?contact+(isPhone?' уже зареєстрований.':' вже зареєстрована.')+' Увійдіть до наявного акаунта або відновіть пароль.'
   :'Цей контакт уже пов’язаний з акаунтом. Спробуйте увійти або відновити пароль.';
 }
 return errors[err?.code]||'Не вдалося виконати дію. Перевірте інтернет і налаштування авторизації.';
}
function syncExistingAccountHelp(visible){
 const help=$('#authExistingHelp');if(help)help.hidden=!visible;
}
$('#authGoLogin')?.addEventListener('click',()=>{
 const contact=$('#email')?.value||'';
 syncExistingAccountHelp(false);show('login');
 if($('#email'))$('#email').value=contact;
});
let challengeAnswer=null,challengePassed=false,previousAdditionKey='';
let humanPauseUntil=0;try{humanPauseUntil=Number(sessionStorage.getItem('vatra-human-check-pause')||0);}catch{}
let humanPauseTimer=null;
function vatrapauseHumanCheck(wrap){
 const remaining=Math.ceil((humanPauseUntil-Date.now())/1000);
 if(remaining<=0)return false;
 wrap.querySelectorAll('[data-captcha-answer]').forEach(option=>{option.disabled=true;});
 const text=wrap.querySelector('#humanCaptchaStatus');
 if(text)text.textContent='Забагато неправильних відповідей. Перевірка буде доступна через '+Math.ceil(remaining/60)+' хв.';
 clearTimeout(humanPauseTimer);
 humanPauseTimer=setTimeout(()=>{
  if(Date.now()>=humanPauseUntil){humanPauseUntil=0;sessionStorage.removeItem('vatra-human-check-pause');window.__vatraCaptchaFailures=0;if(wrap.classList.contains('captcha-modal'))resetHumanChallenge();}
  else vatrapauseHumanCheck(wrap);
 },Math.min(remaining*1000,20000));
 return true;
}
function closeHumanCaptcha(){
 const wrap=$('#captchaWrap');if(!wrap)return;
 wrap.classList.remove('captcha-modal');wrap.hidden=true;wrap.removeAttribute('role');wrap.removeAttribute('aria-modal');wrap.removeAttribute('aria-label');document.body.classList.remove('captcha-modal-open');
}
function openHumanCaptcha(){
 const wrap=$('#captchaWrap');if(!wrap)return;
 resetHumanChallenge();if(wrap.parentElement!==document.body)document.body.appendChild(wrap);wrap.hidden=false;wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','Швидка перевірка');wrap.classList.add('captcha-modal');document.body.classList.add('captcha-modal-open');
 // Focus the dialog container for keyboard/screen-reader access, never the
 // question text: global input-focus styles otherwise draw a misleading box.
 wrap.setAttribute('tabindex','-1');
 wrap.focus({preventScroll:true});
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
 const choices=[...choiceSet];
 for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 wrap.innerHTML='<div class="human-captcha"><div class="human-captcha-title"><img src="logo.png?v=20261103-2" class="vatra-mini-mark" alt="" aria-hidden="true"><span>Швидка перевірка</span><span class="human-captcha-tag">Захист ВАТРИ</span></div><p class="human-captcha-question">Скільки буде '+a+' + '+b+'?</p><div class="human-captcha-options">'+choices.map(value=>'<button type="button" class="human-captcha-option" data-captcha-answer="'+value+'">'+value+'</button>').join('')+'</div><p class="human-captcha-status'+(notice?' is-wrong':'')+'" id="humanCaptchaStatus" aria-live="assertive">'+(notice||'Обчисліть суму та виберіть правильну відповідь.')+'</p><button type="button" class="human-captcha-cancel" id="humanCaptchaCancel">Скасувати</button></div>';
 wrap.querySelector('#humanCaptchaCancel').addEventListener('click',()=>{
  pendingHumanAction=null;
  closeHumanCaptcha();
 });
 wrap.querySelectorAll('[data-captcha-answer]').forEach(btn=>btn.addEventListener('click',()=>{
  const isCorrect=Number(btn.dataset.captchaAnswer)===challengeAnswer;
  if(!isCorrect){
   window.__vatraCaptchaFailures=(window.__vatraCaptchaFailures||0)+1;
   if(window.__vatraCaptchaFailures>=5){
    humanPauseUntil=Date.now()+120000;
    try{sessionStorage.setItem('vatra-human-check-pause',String(humanPauseUntil));}catch{}
    resetHumanChallenge('Забагато неправильних відповідей.');
    vatrapauseHumanCheck(wrap);
    return;
   }
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
 if(vatrapauseHumanCheck(wrap))return;
 // Answer options remain visually neutral until the user chooses one.
}

function captchaToken(){if(!TURNSTILE_SITE_KEY)return '';try{return window.turnstile&&captchaWidget!==null?window.turnstile.getResponse(captchaWidget):'';}catch{return '';}}

function authCooldownRemaining(){
 try{return Math.max(0,Number(sessionStorage.getItem(AUTH_COOLDOWN_KEY)||0)-Date.now());}catch{return 0;}
}
function authSubmitLabel(){
 if(pendingOtp)return 'Підтвердити код';
 return mode==='login'?'Увійти':mode==='register'?'Отримати код':mode==='reset'?'Надіслати код':mode==='new-password'?'Зберегти новий пароль':'Увійти';
}
function refreshAuthCooldown(){
 const button=$('#submit');if(!button)return;
 if(pendingOtp){button.disabled=!!submitting;button.textContent='Підтвердити код';return;}
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
 resetOtpStep();const previousMode=mode;mode=m;document.body.dataset.authMode=m;
 if(previousMode!==m&&!(['login','register'].includes(previousMode)&&['login','register'].includes(m)))window.scrollTo(0,0);
 const switchingAccountMode=['login','register'].includes(previousMode)&&['login','register'].includes(m)&&previousMode!==m;
 if(switchingAccountMode){
  $('#email').value='';$('#password').value='';$('#confirm').value='';
  $('#firstName').value='';$('#lastName').value='';$('#birthday').value='';document.querySelectorAll('input[name="gender"]').forEach(el=>el.checked=false);
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
 if(description)description.content=m==='register'?'Реєстрація у ВАТРІ з підтвердженням електронної пошти.':m==='reset'?'Безпечне відновлення доступу до ВАТРИ.':'Вхід до ВАТРИ за кодом або паролем.';

 closeHumanCaptcha();resetHumanChallenge();
 
 const reg=m==='register',reset=m==='reset',newPassword=m==='new-password',hideContact=newPassword;
 const emailHint=document.querySelector('input[name="authMethod"][value="email"]')?.closest('label')?.querySelector('small');
 const phoneHint=document.querySelector('input[name="authMethod"][value="phone"]')?.closest('label')?.querySelector('small');
 if(emailHint)emailHint.textContent=reg?'Підтвердження email-кодом':'Вхід з паролем';
 if(phoneHint)phoneHint.textContent=reg?(VATRA_SMS_AUTH_ENABLED?'Підтвердження через SMS':'SMS-реєстрація поки недоступна'):'Вхід за номером і паролем';
 if(reset){const emailChoice=document.querySelector('input[name="authMethod"][value="email"]');if(emailChoice)emailChoice.checked=true;}
 document.querySelectorAll('input[name="authMethod"]').forEach(input=>{const card=input.closest('label')||input.parentElement;const isEmail=input.value==='email';if(card)card.hidden=reset&&!isEmail;input.disabled=!isEmail&&(reset||(reg&&!VATRA_SMS_AUTH_ENABLED));});
 $('#loginTab').classList.toggle('selected',m==='login');$('#registerTab').classList.toggle('selected',reg);
 $('#firstNameWrap').hidden=!reg;$('#lastNameWrap').hidden=!reg;$('#birthdayWrap').hidden=!reg;$('#genderWrap').hidden=!reg;document.querySelectorAll('input[name="gender"]').forEach(el=>el.required=reg);$('#birthday').required=reg;document.querySelectorAll('.birthday-selects select').forEach(select=>select.required=reg);
 $('#confirmWrap').hidden=!(reg||newPassword);$('#confirm').required=reg||newPassword;
 $('#firstName').required=reg;$('#lastName').required=reg;
 $('#password').required=!reset;$('#password').minLength=reg||newPassword?12:0;$('#password').placeholder='Введіть пароль';
 $('#passwordHelp').hidden=!reg;const meter=$('#passwordStrength');if(meter)meter.hidden=!reg;$('#password').closest('.field').hidden=reset;$('#forgot').hidden=reg||reset||newPassword;const rememberRow=$('#rememberRow');if(rememberRow)rememberRow.hidden=m!=='login';
 $('#email').required=!hideContact;$('#email').closest('.field').hidden=hideContact;$('#method').disabled=hideContact||reset;$('#method').closest('.field').hidden=hideContact||reset;$('#captchaWrap').hidden=true;$('#confirm').value='';
 $('#eyebrow').textContent=reg?'ВАША ІСТОРІЯ ПОЧИНАЄТЬСЯ ТУТ':reset?'ВІДНОВЛЕННЯ ДОСТУПУ':newPassword?'БЕЗПЕЧНЕ ВІДНОВЛЕННЯ':'РАДІ БАЧИТИ ЗНОВУ';
 $('#title').textContent=reg?'Створіть акаунт ВАТРИ':reset?'Відновіть пароль':newPassword?'Створіть новий пароль':'З поверненням до ВАТРИ';
 $('#desc').textContent=reg?'Заповніть дані та підтвердьте електронну пошту кодом VATRA. Після підтвердження створиться Ваша сторінка.':reset?'Вкажіть електронну пошту, щоб отримати інструкцію для відновлення пароля.':newPassword?'Створіть новий надійний пароль для свого акаунта.':'Увійдіть до свого акаунта за допомогою email або номера телефону та пароля.';
 $('#submit').textContent=reg?'Отримати код':newPassword?'Зберегти новий пароль':reset?'Надіслати код':'Увійти';$('#bottom').hidden=reset||newPassword;
 $('#bottom').innerHTML=reg?'Вже маєте акаунт? <button id="switch" type="button">Увійти</button>':'Ще немає акаунта? <button id="switch" type="button">Зареєструватися</button>';
 const modeSwitch=$('#bottom').querySelector('#switch');
 if(modeSwitch)modeSwitch.addEventListener('click',event=>{event.preventDefault();show(reg?'login':'register');});
 $('#legal').hidden=reg||reset||newPassword;
 $('#legalConsentWrap').hidden=!reg;$('#legalConsent').required=reg;$('#legalConsent').checked=false;
 $('#legal').innerHTML=reg?'':'<span class="legal-label">Документи ВАТРИ</span><div class="legal-links"><button type="button" data-legal="rules">Правила спільноти</button><button type="button" data-legal="privacy">Політика конфіденційності</button><button type="button" data-legal="terms">Умови користування</button></div>';
 $('#error').textContent='';$('#error').classList.remove('success');syncExistingAccountHelp(false);const activeMethod=selectedMethod();syncAuthMethodUI(activeMethod);
 $('#password').autocomplete=m==='login'?'current-password':'new-password';const today=new Date();$('#birthday').max=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');syncCaptchaVisibility();updatePasswordStrength();
 
 syncLoginCodeMode();refreshAuthCooldown();
}
document.querySelectorAll('input[name="authMethod"]').forEach(radio=>radio.addEventListener('change',()=>{
 const method=radio.value;
 syncAuthMethodUI(method);
 $('#email').value='';
 $('#submit').textContent=authSubmitLabel();
 $('#error').textContent='';syncExistingAccountHelp(false);
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
function currentRecoveryMethod(){return VATRA_SMS_RECOVERY_UI_ENABLED?(document.querySelector('input[name="recoveryMethod"]:checked')?.value||'email'):'email';}
let recoveryAnswer=0,recoveryPassed=false,recoveryStep='contact',recoveryPreviousPair='',recoveryFailures=0;
let recoveryOtpCooldownUntil=0,recoveryOtpCooldownTimer=null;
function syncRecoveryResend(){
 const button=$('#recoveryResendOtp');if(!button)return;
 const seconds=Math.max(0,Math.ceil((recoveryOtpCooldownUntil-Date.now())/1000));
 button.disabled=seconds>0;button.textContent=seconds?'Повторно через '+seconds+' с':'Надіслати код ще раз';
 if(!seconds&&recoveryOtpCooldownTimer){clearInterval(recoveryOtpCooldownTimer);recoveryOtpCooldownTimer=null;}
}
function beginRecoveryCooldown(){
 recoveryOtpCooldownUntil=Date.now()+60000;
 if(recoveryOtpCooldownTimer)clearInterval(recoveryOtpCooldownTimer);
 recoveryOtpCooldownTimer=setInterval(syncRecoveryResend,1000);syncRecoveryResend();
}
$('#recoveryResendOtp')?.addEventListener('click',async()=>{
 if(recoveryStep!=='verify'||Date.now()<recoveryOtpCooldownUntil)return;
 const button=$('#recoveryResendOtp'),isPhone=currentRecoveryMethod()==='phone';
 const contact=isPhone?normalizePhone($('#recoveryContact'),$('#recoveryCountryCode')):$('#recoveryContact').value.trim().toLowerCase();
 button.disabled=true;
 try{
  if(isPhone)await sendOtp({phone:contact,shouldCreateUser:false});
  else await sendPasswordResetEmail(auth,contact);
  $('#recoveryError').textContent='Запит на повторне надсилання прийнято. Перевірте '+(isPhone?'SMS.':'пошту та «Спам».');
  $('#recoveryError').classList.add('success');beginRecoveryCooldown();
 }catch(err){$('#recoveryError').textContent=errors[err.code]||err.message||'Не вдалося надіслати код.';$('#recoveryError').classList.remove('success');syncRecoveryResend();}
});
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
 if(!phone)$('#recoveryContact').placeholder='name@example.com';
 $('#recoverySubmit').textContent=recoveryStep==='verify'?'Підтвердити код і змінити пароль':phone?'Надіслати SMS-код':'Надіслати код на email';
 const phoneNote=$('#vatraRecoveryPhoneNote');if(phoneNote)phoneNote.hidden=!phone;
}
function openRecovery(){
 recoveryFailures=0;recoveryPreviousPair='';recoveryStep='contact';recoveryOtpCooldownUntil=0;if(recoveryOtpCooldownTimer){clearInterval(recoveryOtpCooldownTimer);recoveryOtpCooldownTimer=null;}$('#recoveryForm').reset();$('#recoveryError').textContent='';$('#recoveryError').classList.remove('success');
 $('#recoveryMethodWrap').hidden=false;$('#recoveryContact').readOnly=false;$('#recoveryContact').closest('.field').hidden=false;$('#recoveryProtection').hidden=false;
 $('#recoveryOtpWrap').hidden=true;$('#recoveryNewPasswordWrap').hidden=true;$('#recoveryConfirmWrap').hidden=true;
 $('#recoveryOtp').required=false;$('#recoveryNewPassword').required=false;$('#recoveryConfirmPassword').required=false;
 document.querySelectorAll('input[name="recoveryMethod"]').forEach(option=>{option.disabled=false;});
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
  if(phone){const invalid=vatraPhoneError($('#recoveryContact'),$('#recoveryCountryCode'));if(invalid){feedback(invalid);return;}}
  if(!phone&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)){feedback('Введіть коректну адресу електронної пошти.');return;}
  btn.disabled=true;btn.textContent='Надсилаємо…';
  try{
   if(phone)await sendOtp({phone:contact,shouldCreateUser:false});
   else await sendPasswordResetEmail(auth,contact.toLowerCase());
   recoveryStep='verify';$('#recoveryMethodWrap').hidden=true;$('#recoveryContact').readOnly=true;$('#recoveryProtection').hidden=true;
   $('#recoveryOtpWrap').hidden=false;$('#recoveryNewPasswordWrap').hidden=false;$('#recoveryConfirmWrap').hidden=false;
   $('#recoveryOtp').required=true;$('#recoveryNewPassword').required=true;$('#recoveryConfirmPassword').required=true;
   $('#recoveryOtpWrap label').textContent=phone?'Код із SMS':'Код із листа ВАТРИ';
   btn.textContent='Підтвердити код і змінити пароль';feedback('Якщо контакт прив’язаний до акаунта, перевірте '+(phone?'SMS.':'пошту: лист має містити код або посилання для відновлення.')+' Не передавайте код нікому.',true);beginRecoveryCooldown();return;
  }catch(err){feedback(authContactErrorText(err,phone,'recovery'));return;}
  finally{btn.disabled=false;if(recoveryStep==='contact')syncRecoveryMethod();}
 }
 const code=$('#recoveryOtp').value.trim(),password=$('#recoveryNewPassword').value,confirmation=$('#recoveryConfirmPassword').value;
 if(!/^\d{6,8}$/.test(code)){feedback('Введіть код із 6–8 цифр.');return;}
 if(!isStrongPassword(password)){feedback('Пароль має містити 12+ символів, великі й малі латинські літери, цифру та спецсимвол.');return;}
 if(password!==confirmation){feedback('Нові паролі не збігаються.');return;}
 btn.disabled=true;btn.textContent='Перевіряємо код…';submitting=true;
 try{
  await verifyOtp(phone?{phone:contact,token:code}:{email:contact,token:code,type:'recovery'});await setAccountPassword(password);
  feedback('Пароль змінено. Ви входите у ВАТРУ.',true);location.replace('index.html');
 }catch(err){feedback(errors[err.code]||'Не вдалося змінити пароль. Перевірте код і спробуйте ще раз.');}
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
onAuthStateChanged(auth,u=>{if(!u||submitting||$('#recoveryDialog').open||suppressAuthRedirect||pendingHumanAction||pendingOtp)return;if(mode==='register'){const notice=$('#error');if(notice)notice.textContent='Ви вже увійшли в акаунт. Для створення іншого акаунта вийдіть із поточного або відкрийте приватне вікно.';return;}const legalRequest=new URLSearchParams(location.search).get('legal');if(['rules','privacy','terms'].includes(legalRequest))return;if(new URLSearchParams(location.search).get('mode')==='new-password'){show('new-password');return;}location.replace('index.html');});
$('#authForm').addEventListener('submit',async e=>{
 e.preventDefault();if(submitting)return;
 if(pendingOtp){await confirmOtp();return;}
 if(pendingHumanAction&&challengePassed){
  pendingHumanAction=null;
  closeHumanCaptcha();
 }
 if(authCooldownRemaining()>0){refreshAuthCooldown();$('#error').textContent=errors['auth/too-many-requests'];return;}
 const btn=$('#submit'),isPhone=selectedMethod()==='phone',contact=isPhone?currentAuthContact():$('#email').value.trim().toLowerCase(),dob=$('#birthday').value,token=captchaToken();
 $('#error').textContent='';$('#error').classList.remove('success');syncExistingAccountHelp(false);

 if(mode!=='new-password'&&isPhone){
  const invalid=vatraPhoneError($('#email'),$('#countryCode'));
  if(invalid){$('#error').textContent=invalid;return;}
 }
 if(mode!=='new-password'&&!isPhone&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)){ $('#error').textContent='Введіть коректну адресу електронної пошти.';return;}
 const reg=mode==='register';
 if(reg&&auth.currentUser){$('#error').textContent='У цьому браузері вже відкрито інший акаунт. Вийдіть із нього або використайте приватне вікно для нової реєстрації.';return;}
 if(reg&&!$('#legalConsent').checked){$('#error').textContent='Щоб створити акаунт, підтвердьте згоду з Умовами користування та Правилами спільноти й ознайомлення з Політикою конфіденційності.';$('#legalConsentWrap').scrollIntoView({behavior:'smooth',block:'center'});$('#legalConsent').focus();return;}
 let first='',last='',name='';
 if(reg){
  first=$('#firstName').value.trim();last=$('#lastName').value.trim();name=(first+' '+last).trim();
  if(first.length<2||last.length<2){$('#error').textContent='Вкажіть ім’я та прізвище (не менше 2 символів кожне).';return;}
  if(!['male','female'].includes(document.querySelector('input[name="gender"]:checked')?.value)){$('#error').textContent='Оберіть стать: чоловік або жінка.';document.querySelector('input[name="gender"]')?.focus();return;}if(!dob){$('#error').textContent='Вкажіть дату народження: день, місяць і рік.';$('#birthday').focus();return;}
  const birthDate=new Date(dob+'T00:00:00'),today=new Date();let age=today.getFullYear()-birthDate.getFullYear();if(today.getMonth()<birthDate.getMonth()||(today.getMonth()===birthDate.getMonth()&&today.getDate()<birthDate.getDate()))age--;
  if(Number.isNaN(birthDate.getTime())||birthDate>today||age<13){$('#error').textContent='ВАТРА доступна з 13 років. Перевірте дату народження.';return;}
  const password=$('#password').value,confirmation=$('#confirm').value;
  if(!isStrongPassword(password)){$('#error').textContent='Створіть пароль на 12+ символів із малою й великою латинськими літерами, цифрою та спеціальним символом.';$('#password').focus();return;}
  if(password!==confirmation){$('#error').textContent='Паролі не збігаються.';$('#confirm').focus();return;}
 }
 if(((mode==='login'&&!loginByCode)||mode==='new-password')&&!$('#password').value){$('#error').textContent='Введіть пароль.';$('#password').focus();return;}
 if(mode==='new-password'){
  const newPass=$('#password').value,confirmation=$('#confirm').value;
  if(!isStrongPassword(newPass)){ $('#error').textContent='Пароль має містити 12+ символів, великі й малі латинські літери, цифру та спецсимвол.';$('#password').focus();return; }
  if(newPass!==confirmation){ $('#error').textContent='Паролі не збігаються.';$('#confirm').focus();return; }
 }
 if(mode==='login'&&!loginByCode&&!challengePassed){
  pendingHumanAction={mode,contact};
  submitting=true;suppressAuthRedirect=true;btn.disabled=true;btn.textContent='Перевіряємо дані…';
  try{
   await verifyPasswordCredentials(contact,$('#password').value);
   openHumanCaptcha();
  }catch(err){
   pendingHumanAction=null;
   $('#error').textContent=errors[err.code]||'Не вдалося перевірити облікові дані. Перевірте інтернет і спробуйте ще раз.';
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
 const old=btn.textContent;submitting=true;suppressAuthRedirect=true;btn.disabled=true;btn.textContent=mode==='login'?'Перевіряємо дані…':mode==='reset'?'Надсилаємо код…':mode==='new-password'?'Зберігаємо пароль…':'Надсилаємо код…';
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
   setRememberMe($('#rememberMe')?.checked===true);
   try { await signInWithPassword(auth,contact,$('#password').value); }
   catch (loginError) { setRememberMe(false); throw loginError; }
   location.replace('index.html');
   return;
  }
  const gender=document.querySelector('input[name="gender"]:checked')?.value||'';
  const userData={name,displayName:name,firstName:first,lastName:last,gender,dateOfBirth:dob,preferredLanguage:vatraSignupLanguage()};
  await startOtp('signup',{contact,isPhone,dob,first,last,name,gender,password:$('#password').value,userData});
  return;
  }catch(err){
  pendingHumanAction=null;suppressAuthRedirect=false;
  $('#error').textContent=authContactErrorText(err,isPhone,mode);
   syncExistingAccountHelp(mode==='register'&&err?.code==='auth/email-already-in-use');
  $('#error').classList.remove('success');
  if(err.code==='auth/too-many-requests')startAuthRateLimitCooldown(300);
  if(window.turnstile&&captchaWidget!==null)window.turnstile.reset(captchaWidget);
 }finally{submitting=false;if(!pendingHumanAction)suppressAuthRedirect=false;refreshAuthCooldown();}
});
enhanceDatePicker($('#birthday'));enhancePhoneInput($('#email'),'countryCode');enhancePhoneInput($('#recoveryContact'),'recoveryCountryCode');const captchaWrap=$('#captchaWrap');$('#confirmWrap').insertAdjacentElement('afterend',captchaWrap);renderCaptcha();if($('#rememberMe'))$('#rememberMe').checked=false;
$('#authForm').autocomplete='on';$('#email').autocomplete='email';$('#password').autocomplete='current-password';$('#confirm').autocomplete='new-password';
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
 if(mode!=='login'&&!authPasswordWasManuallyEdited&&document.activeElement!==$('#password')&&$('#password').value){$('#password').value='';changed=true;}
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
