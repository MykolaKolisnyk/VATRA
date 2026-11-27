(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://cxrcycxrlkufozomsxcs.supabase.co";
const PUBLIC_KEY="sb_publishable_oKypZDxi8PP1oxSylfh5wQ_H6HxeM-i";
const page=document.body.dataset.page||"login";
const initialAuthQuery=new URLSearchParams(location.search);
const initialAuthHash=new URLSearchParams(location.hash.slice(1));
const initialAccountCallback=page==="verify"&&(initialAuthQuery.has("token_hash")||
 initialAuthQuery.has("code")||initialAuthQuery.has("error")||
 initialAuthHash.has("access_token")||initialAuthHash.has("error"));
const initialAccountCallbackError=page==="verify"&&
 (initialAuthQuery.has("error")||initialAuthHash.has("error"));
const translate=text=>window.VATRA_LANGUAGE?.translate(text)||text;
const english=document.documentElement.lang==="en";
const q=(selector)=>document.querySelector(selector);
const url=(filename)=>new URL(filename,document.baseURI).href;

function replayAuthContent(node){
 if(!node||window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)return;
 node.style.animation="none";
 void node.offsetWidth;
 node.style.removeProperty("animation");
}
let auth=null;
let validateCreateAccountStep=()=>true;
let pageHooks={};
function validateBirthday(){return pageHooks.validateBirthday?.()??null;}
let navigatingAuth=false;
const markAuthReady=()=>{if(!navigatingAuth)document.body.dataset.authReady="true";};
async function authFetch(input,init={},timeoutMs=15000){
 const controller=new AbortController();
 const upstream=init.signal||(typeof Request==="function"&&input instanceof Request?input.signal:null);
 const cancel=()=>controller.abort(upstream?.reason);
 if(upstream?.aborted)cancel();else upstream?.addEventListener("abort",cancel,{once:true});
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{return await fetch(input,{...init,signal:controller.signal});}
 finally{clearTimeout(timer);upstream?.removeEventListener("abort",cancel);}
}
async function sessionCheckWithTimeout(){
 let timer;
 try{
  return await Promise.race([
   auth.auth.getUser(),
   new Promise(resolve=>{timer=setTimeout(()=>resolve({data:{user:null},error:new Error("Session check timed out")}),8000);})
  ]);
 }finally{clearTimeout(timer);}
}
const REMEMBERED_ACCOUNT_KEY="vatra-remembered-account";
const LOGGED_OUT_KEY="vatra-just-signed-out";
function rememberAccount(user){
 if(!user?.id||!user.email_confirmed_at||typeof user.email!=="string")return;
 const email=user.email.trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return;
 window.VATRA_AVATAR?.clearHeader(email);
 const metadata=user.user_metadata||{};
 const name=[metadata.first_name,metadata.last_name].filter(x=>typeof x==="string"&&x.trim()).join(" ").trim().slice(0,120)||email.split("@")[0];
 const avatarUrl=window.VATRA_AVATAR?.getRemembered(email);
 const entry={v:1,email,name};
 if(avatarUrl)entry.avatarUrl=avatarUrl;
 try{localStorage.setItem(REMEMBERED_ACCOUNT_KEY,JSON.stringify(entry));}catch(_){}
}
function goToFeed(){
 navigatingAuth=true;
 window.location.replace(url("feed"));
}
function feedback(text,type="info",options={}){
 const message=translate(text);
 if(window.VATRA_TOAST?.show)window.VATRA_TOAST.show(message,type,options);
 else (window.VATRA_PENDING_TOASTS??=[]).push([message,type,options]);
}
function clearFeedback(){window.VATRA_TOAST?.clear?.();}
function busy(form,isBusy){
 form.querySelectorAll("button[type=submit]").forEach(btn=>{
  btn.disabled=isBusy;
  if(isBusy)btn.setAttribute("aria-busy","true");
  else btn.removeAttribute("aria-busy");
 });
}
function getMessage(error){
 window.VATRA_SERVICE_NOTICE?.report(error,{access:false});
 const code=String(error?.code||"");
 const text=String(error?.message||"").toLowerCase();
 if(code==="invalid_credentials"||text.includes("invalid login credentials"))return "Неправильна електронна пошта або пароль.";
 if(code==="email_not_confirmed"||text.includes("email not confirmed"))return "Підтвердьте електронну пошту за посиланням із листа.";
 if(code==="same_password"||code==="same_password_as_old"||
  text.includes("same as the old password")||text.includes("different from the old password"))
  return "Виберіть новий пароль, який відрізняється від попереднього.";
 if(code==="weak_password"||text.includes("password should")||text.includes("password is too"))return "Пароль не відповідає вимогам сервера. Перевірте правила під полем пароля.";
 if(code==="over_email_send_rate_limit"||code==="over_request_rate_limit"||text.includes("rate limit"))return "Забагато спроб. Спробуйте трохи пізніше.";
 if(code==="email_exists"||code==="user_already_exists")return "Акаунт із такою поштою вже може існувати. Спробуйте увійти або відновити пароль.";
 if(code==="signup_disabled")return "Створення акаунтів тимчасово недоступне.";
 if(code==="otp_expired"||code==="otp_disabled")return "Посилання для підтвердження недійсне або застаріло. Запросіть нове.";
 if(code==="captcha_required"||code==="captcha_failed"||text.includes("captcha verification"))return "Завершіть перевірку безпеки й повторіть спробу.";
 if(code==="captcha_cancelled")return "Перевірку безпеки скасовано.";
 if(["captcha_unavailable","captcha_timeout","captcha_expired"].includes(code))return "Не вдалося завершити перевірку безпеки. Повторіть спробу або перевірте з’єднання.";
 if(code==="network_error"||text.includes("failed to fetch")||text.includes("network"))return "Немає з'єднання із сервером. Перевірте інтернет і повторіть спробу.";
 return "Не вдалося виконати дію. Перевірте введені дані та спробуйте ще раз.";
}


const FIELD_ERROR_DURATION_MS=5500;
const fieldErrorTimers=new WeakMap();
function showFieldError(control,message){
 if(!control)return;
 const wrapper=control.closest(".vatra-select,.field,.check-terms");
 const visual=control.closest(".vatra-select")?.querySelector(".vatra-select-trigger");
 if(!wrapper)return;
 clearTimeout(fieldErrorTimers.get(control));
 fieldErrorTimers.delete(control);
 wrapper.classList.toggle("is-invalid",Boolean(message));
 if(message){
  control.setAttribute("aria-invalid","true");visual?.setAttribute("aria-invalid","true");
  fieldErrorTimers.set(control,setTimeout(()=>showFieldError(control,""),FIELD_ERROR_DURATION_MS));
 }else{
  control.removeAttribute("aria-invalid");visual?.removeAttribute("aria-invalid");
  control.removeAttribute("aria-describedby");
 }
}
function requiredFieldText(control){
 const uk={
  "first-name":"Вкажіть ім’я.","last-name":"Вкажіть прізвище.",
  "email":"Введіть електронну пошту.","recovery-email":"Введіть електронну пошту.",
  "password":"Введіть пароль.","saved-password":"Введіть пароль.",
  "password-confirm":"Повторіть пароль.","recovery-token":"Введіть код підтвердження з листа."
 };
 const en={
  "first-name":"Enter your first name.","last-name":"Enter your last name.",
  "email":"Enter your email address.","recovery-email":"Enter your email address.",
  "password":"Enter your password.","saved-password":"Enter your password.",
  "password-confirm":"Confirm your password.","recovery-token":"Enter the verification code from your email."
 };
 const chosen=document.documentElement.lang==="en"?en:uk;
 return chosen[control.id]||translate("Заповніть обов’язкове поле.");
}
function validationText(control,form){
 if(control.disabled)return "";
 const value=control.type==="password"?String(control.value||""):String(control.value||"").trim();
 if(control.type==="checkbox"){
  return control.required&&!control.checked?"Щоб продовжити, прийміть умови використання.":"";
 }
 if(!value&&control.required)return requiredFieldText(control);
 if(!value)return "";
 if(control.type==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return "Введіть правильну електронну пошту.";
 if(control.id==="first-name"&&(value.length<2||value.length>60))return "Ім’я має містити від 2 до 60 символів.";
 if(control.id==="last-name"&&(value.length<2||value.length>60))return "Прізвище має містити від 2 до 60 символів.";
 if(control.id==="password-confirm"&&value!==q("#password")?.value)return "Паролі не збігаються.";
 if(control.type==="password"&&form.id!=="login-form")return passwordIssue(value);
 return "";
}


function wireFloatingHints(){
 if(!["login","create-account","forgot","reset"].includes(page))return;
 const syncAll=[];
 for(const field of document.querySelectorAll("#login-form .field:has(input.control),#saved-login-form .saved-account-field:has(input.control),#signup-form .field:has(input.control),#forgot-form .field:has(input.control),#recovery-code-form .field:has(input.control),#reset-form .field:has(input.control)")){
  const input=field.querySelector("input.control");
  const shell=input?.closest(".vatra-input-shell");
  const hint=shell?.querySelector(":scope > .vatra-floating-hint");
  if(!input||!shell||!hint)continue;
  const sync=()=>{
   shell.classList.toggle("is-floating",Boolean(input.value));
  };
  for(const event of ["focus","blur","input","change","animationstart"])
   input.addEventListener(event,sync);
  input.form?.addEventListener("reset",()=>requestAnimationFrame(sync));
  syncAll.push(sync);
  sync();
 }
 window.addEventListener("pageshow",()=>syncAll.forEach(sync=>sync()));
}


function wireFieldValidation(){
 const form=document.querySelector("#login-form,#signup-form,#forgot-form,#reset-form");
 if(!form)return;
 form.noValidate=true;
 const controls=[...form.querySelectorAll("input,select")].filter(c=>c.id&&!["hidden"].includes(c.type));
 const check=control=>{
  if(control.id?.startsWith("birth-")){
   const day=q("#birth-day")?.value,month=q("#birth-month")?.value,year=q("#birth-year")?.value;
   const value=day&&month&&year?validateBirthday():null;
   const correctDate=typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
   const message=!day?"Оберіть день народження.":!month?"Оберіть місяць народження.":!year?"Оберіть рік народження.":correctDate?"":typeof value==="string"?value:"Вкажіть правильну дату народження.";
   const invalid=!day?q("#birth-day"):!month?q("#birth-month"):!year?q("#birth-year"):control;
   if(message)showFieldError(invalid,message);
   return {control:invalid,message};
  }
  const message=validationText(control,form);
  showFieldError(control,message);
  return {control,message};
 };
 for(const control of controls){
  const clear=()=>{
   showFieldError(control,"");
   if(control.id?.startsWith("birth-"))for(const id of ["#birth-day","#birth-month","#birth-year"])showFieldError(q(id),"");
  };
  control.addEventListener("input",clear);
  control.addEventListener("change",clear);
 }
 const validateScope=scope=>{
  let first=null;
  for(const control of controls)showFieldError(control,"");
  for(const control of controls){
   if(scope&&!scope.contains(control))continue;
   if(control.closest("[data-create-account-step]")?.hidden)continue;
   if(control.id.startsWith("birth-")&&control.id!=="birth-day")continue;
   const result=check(control);
   if(result.message){first=result;break;}
  }
  if(first){
   feedback(first.message,"error",{group:"auth-validation"});
   const focus=first.control.closest(".vatra-select")?.querySelector(".vatra-select-trigger")||first.control;
   focus.focus({preventScroll:true});
   focus.scrollIntoView({behavior:"smooth",block:"center"});
  }
  return !first;
 };
 if(page==="create-account")validateCreateAccountStep=validateScope;
 form.addEventListener("submit",event=>{
  if(page==="create-account"&&document.body.dataset.createAccountStep==="1"){
   event.preventDefault();
   event.stopImmediatePropagation();
   q("#create-account-next")?.click();
   return;
  }
  if(!validateScope(form)){
   event.preventDefault();
   event.stopImmediatePropagation();
  }
 },true);
}


function wirePasswordButtons(){
 document.querySelectorAll("[data-password-toggle]").forEach(button=>{
  const input=document.getElementById(button.dataset.passwordToggle);
  if(!input)return;
  const sync=()=>{
   const hasText=input.value.length>0;
   button.hidden=!hasText;
   if(!hasText&&input.type!=="password"){
    input.type="password";
    button.textContent=translate("Показати");
    button.setAttribute("aria-label",translate("Показати пароль"));
    button.setAttribute("aria-pressed","false");
   }
  };
  for(const event of ["input","change","animationstart"])input.addEventListener(event,sync);
  input.form?.addEventListener("reset",()=>requestAnimationFrame(sync));
  window.addEventListener("pageshow",sync);
  button.addEventListener("click",()=>{
   if(!input.value)return;
   const reveal=input.type==="password";
   input.type=reveal?"text":"password";
   button.textContent=translate(reveal?"Приховати":"Показати");
   button.setAttribute("aria-label",translate(reveal?"Приховати пароль":"Показати пароль"));
   button.setAttribute("aria-pressed",String(reveal));
   sync();
  });
  sync();
 });
}


function passwordIssue(value){
 if(typeof value!=="string"||value.length<12)return "Використайте щонайменше 12 символів.";
 if(value.length>128)return "Використайте не більше 128 символів.";
 if(!/[a-z]/.test(value))return "Додайте малу латинську літеру (a–z).";
 if(!/[A-Z]/.test(value))return "Додайте велику латинську літеру (A–Z).";
 if(!/[0-9]/.test(value))return "Додайте цифру (0–9).";
 if(!/[!@#$%^&*()_+\-=\[\]{};'\\:"|<>?,.\/\x60~]/.test(value))
  return "Додайте спеціальний символ (наприклад, ! або @).";
 return "";
}
function validPassword(value){return passwordIssue(value)==="";}
async function initialize(){
 try{

 let authInitError="";
 if(!window.supabase?.createClient){
  authInitError="Не вдалося завантажити модуль входу. Перевірте з'єднання та оновіть сторінку.";
 }else{
  try{
   auth=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
    global:{fetch:authFetch},
    auth:{autoRefreshToken:page!=="reset"&&page!=="forgot",
     persistSession:page!=="reset"&&page!=="forgot",
     detectSessionInUrl:page!=="forgot",flowType:"pkce"}
   });
  }catch(_){
   authInitError="Не вдалося підключитися до сервісу авторизації.";
  }
 }
 const initialSession=auth&&(page==="login"||page==="create-account")
  ?sessionCheckWithTimeout().catch(error=>({data:{user:null},error})):null;
 await window.VATRA_LANGUAGE?.ready;

 wirePasswordButtons();
 wireFloatingHints();
 if(authInitError){feedback(authInitError,"error");return;}
 const entry=window.VATRA_AUTH_ENTRY;
 if(typeof entry!=="function")throw new Error("Missing page-specific authentication controller");
 pageHooks=entry({q,url,translate,english,page,auth,replayAuthContent,busy,getMessage,
  captchaOptions,resetCaptcha,rememberAccount,goToFeed,clearFeedback,feedback,
  passwordIssue,validateCreateAccountStep:scope=>validateCreateAccountStep(scope),
  REMEMBERED_ACCOUNT_KEY,LOGGED_OUT_KEY,initialAccountCallback,initialAccountCallbackError,
  announceVerifiedAccount})||{};
 pageHooks.prepareUI?.();
 wireFieldValidation();
 pageHooks.setupFlow?.();
 if(page==="login"){
  pageHooks.wireLogin?.();
  try{
   const {data,error}=await initialSession;
   if(!error&&data?.user?.email_confirmed_at){await goToFeed();return;}
  }catch(_){ }
  pageHooks.wireRememberedAccount?.();
 }
 if(page==="create-account"){
  try{
   const {data,error}=await initialSession;
   if(!error&&data?.user?.email_confirmed_at&&
    (!pageHooks.hasSignupPending?.()||pageHooks.isExpectedConfirmedSignup?.(data.user))){
    try{sessionStorage.removeItem(SIGNUP_PENDING_KEY);}catch(_){}
    await goToFeed();return;
   }
  }catch(_){}
  pageHooks.wireCreateAccount?.();
  pageHooks.watchSignupConfirmation?.();
  pageHooks.syncSignupCountdown?.();
 }
 if(page==="forgot")pageHooks.wireForgot?.();
 if(page==="reset")pageHooks.wireReset?.();
 if(page==="verify"){
  const confirmation=await pageHooks.acceptEmailConfirmation();
  if(confirmation.failed)pageHooks.showAccountConfirmationFailure();
  else{
   try{sessionStorage.removeItem(SIGNUP_PENDING_KEY);}catch(_){}
   await pageHooks.wireAccount(confirmation.cameFromLink);
  }
 }
 }finally{
  markAuthReady();
 }
}
async function captchaOptions(scope){
 if(!window.VATRA_CAPTCHA?.enabled){const error=new Error("captcha_unavailable");error.code="captcha_unavailable";throw error;}
 const token=await window.VATRA_CAPTCHA.token(scope);
 if(!token){const error=new Error("captcha_required");error.code="captcha_required";throw error;}
 return {captchaToken:token};
}
function resetCaptcha(scope){window.VATRA_CAPTCHA?.reset(scope);}
const SIGNUP_PENDING_KEY="vatra-signup-confirmation";
const SIGNUP_AUTH_CHANNEL="vatra-auth-verified";
function announceVerifiedAccount(){
 if(typeof BroadcastChannel==="undefined")return;
 try{const channel=new BroadcastChannel(SIGNUP_AUTH_CHANNEL);
  channel.postMessage({type:"check-confirmed-session"});channel.close();}catch(_){}
}
initialize().catch(()=>{
 feedback("Сервіс авторизації тимчасово недоступний. Повторіть спробу пізніше.","error");
 markAuthReady();
});
})();