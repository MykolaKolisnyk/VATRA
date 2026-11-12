/* VATRA • shared authentication. Public publishable key only; never embed server secrets. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://rjasunoawrxvetwadylh.supabase.co";
const PUBLIC_KEY="sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-";
const page=document.body.dataset.page||"login";
// Capture the original callback URL before the Supabase SDK consumes the query.
// An older PKCE link opened on a new device must show an explanation, not a silent redirect.
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
/* Run a single reveal on the changing content, not the surrounding card. */
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
function sessionCheckWithTimeout(){
 // No artificial loading delay: fall back to sign-in if a stale network request stalls.
 return Promise.race([
  auth.auth.getUser(),
  new Promise(resolve=>setTimeout(()=>resolve({data:{user:null},error:new Error("Session check timed out")}),8000))
 ]);
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
 // Save identity labels and an optional PUBLIC avatar link only, not passwords,
 // auth UUIDs, OTPs or session tokens. Preserve an earlier photo for this email.
 const avatarUrl=window.VATRA_AVATAR?.getRemembered(email);
 const entry={v:1,email,name};
 if(avatarUrl)entry.avatarUrl=avatarUrl;
 try{localStorage.setItem(REMEMBERED_ACCOUNT_KEY,JSON.stringify(entry));}catch(_){}
}
function goToFeed(){
 // After a verified sign-in or sign-up, Feed is the VATRA home screen.
 // The dedicated /verify endpoint redeems email links and returns to Feed.
 navigatingAuth=true;
 window.location.replace(url("feed"));
}
function feedback(text,type="info"){
 const box=q("#response");
 if(!box)return;
 box.textContent=translate(text);box.dataset.type=type;box.hidden=false;
 const initial=text;
 window.VATRA_LANGUAGE?.ready?.then(()=>{if(box.textContent===initial)box.textContent=translate(initial);});
 box.setAttribute("role",type==="error"?"alert":"status");
 box.scrollIntoView({block:"nearest",behavior:"smooth"});
}
function clearFeedback(){const box=q("#response");if(box){box.hidden=true;box.textContent="";}}
function busy(form,isBusy){
 form.querySelectorAll("button[type=submit]").forEach(btn=>{
  btn.disabled=isBusy;
  if(isBusy){btn.dataset.oldLabel=btn.textContent;btn.textContent=translate("Зачекайте…");}
  else if(btn.dataset.oldLabel){btn.textContent=btn.dataset.oldLabel;delete btn.dataset.oldLabel;}
 });
}
function getMessage(error){
 const code=String(error?.code||"");
 const text=String(error?.message||"").toLowerCase();
 if(code==="invalid_credentials"||text.includes("invalid login credentials"))return "Неправильна електронна пошта або пароль.";
 if(code==="email_not_confirmed"||text.includes("email not confirmed"))return "Підтвердьте електронну пошту за посиланням із листа.";
 if(code==="same_password"||code==="same_password_as_old"||
  text.includes("same as the old password")||text.includes("different from the old password"))
  return english?"Choose a new password that differs from the previous one.":"Виберіть новий пароль, який відрізняється від попереднього.";
 if(code==="weak_password"||text.includes("password should")||text.includes("password is too"))return english?"The password does not meet the server's security requirements. Check the rules below the password field.":"Пароль не відповідає вимогам сервера. Перевірте правила під полем пароля.";
 if(code==="over_email_send_rate_limit"||code==="over_request_rate_limit"||text.includes("rate limit"))return "Забагато спроб. Спробуйте трохи пізніше.";
 if(code==="email_exists"||code==="user_already_exists")return "Акаунт із такою поштою вже може існувати. Спробуйте увійти або відновити пароль.";
 if(code==="signup_disabled")return english?"Account creation is temporarily unavailable.":"Створення акаунтів тимчасово недоступне.";
 if(code==="otp_expired"||code==="otp_disabled")return "Посилання для підтвердження недійсне або застаріло. Запросіть нове.";
 if(code==="captcha_required"||code==="captcha_failed"||text.includes("captcha verification"))return "Завершіть перевірку безпеки й повторіть спробу.";
 if(code==="captcha_cancelled")return "Перевірку безпеки скасовано.";
 if(["captcha_unavailable","captcha_timeout","captcha_expired"].includes(code))return "Не вдалося завершити перевірку безпеки. Повторіть спробу або перевірте з’єднання.";
 if(code==="network_error"||text.includes("failed to fetch")||text.includes("network"))return "Немає з'єднання із сервером. Перевірте інтернет і повторіть спробу.";
 return "Не вдалося виконати дію. Перевірте введені дані та спробуйте ще раз.";
}
/* Field errors automatically disappear after 5.5 seconds or on edit.
   Submitting still checks all required values even after visual errors expire. */
const FIELD_ERROR_DURATION_MS=5500;
const fieldErrorTimers=new WeakMap();
function showFieldError(control,message){
 if(!control)return;
 const wrapper=control.closest(".field,.check-terms");
 if(!wrapper)return;
 let error=wrapper.querySelector(".field-error");
 clearTimeout(fieldErrorTimers.get(control));
 fieldErrorTimers.delete(control);
 if(message){
  if(!error){
   error=document.createElement("small");
   error.className="field-error vt-field-error-"+control.id;
   error.id="vatra-error-"+control.id;
   error.setAttribute("role","alert");
   // Consent validation occupies a dedicated row below the whole label,
   // never sits inside the inline link text.
   wrapper.append(error);
  }
  error.textContent=translate(message);
  window.VATRA_LANGUAGE?.ready?.then(()=>{if(error.isConnected)error.textContent=translate(message);});
  wrapper.classList.add("is-invalid");
  control.setAttribute("aria-invalid","true");
  control.setAttribute("aria-describedby",error.id);
  fieldErrorTimers.set(control,setTimeout(()=>showFieldError(control,""),FIELD_ERROR_DURATION_MS));
 }else{
  wrapper.classList.remove("is-invalid");
  control.removeAttribute("aria-invalid");
  control.removeAttribute("aria-describedby");
  error?.remove();
 }
}
function validationText(control,form){
 if(control.disabled)return "";
 const value=control.type==="password"?String(control.value||""):String(control.value||"").trim();
 if(control.type==="checkbox"){
  return control.required&&!control.checked?"Щоб продовжити, прийміть умови використання.":"";
 }
 if(!value&&control.required)return "Заповніть це поле.";
 if(!value)return "";
 if(control.type==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return "Введіть правильну електронну пошту.";
 if((control.id==="first-name"||control.id==="last-name")&&(value.length<2||value.length>60))return "Використайте від 2 до 60 символів.";
 if(control.id==="password-confirm"&&value!==q("#password")?.value)return english?"Passwords do not match.":"Паролі не збігаються.";
 if(control.type==="password"&&form.id!=="login-form")return passwordIssue(value);
 return "";
}
/* One floating hint per input. Native placeholder text is hidden only after
   this control is initialized, so no second label can overlap the cursor.
   Validation messages remain outside the positioned input shell. */
function wireFloatingHints(){
 if(!["login","create-account","forgot","reset"].includes(page))return;
 const syncAll=[];
 for(const field of document.querySelectorAll("#login-form .field:has(input.control),#saved-login-form .saved-account-field:has(input.control),#signup-form .field:has(input.control),#forgot-form .field:has(input.control),#recovery-code-form .field:has(input.control),#reset-form .field:has(input.control)")){
  const input=field.querySelector("input.control");
  const shell=input?.closest(".vatra-input-shell");
  const hint=shell?.querySelector(":scope > .vatra-floating-hint");
  if(!input||!shell||!hint)continue;
  const sync=()=>{
   // A real value lifts the hint. Focus is styled by CSS separately.
   // Some password managers retain :-webkit-autofill on a cleared input;
   // a blank field must never stay lifted after blur.
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
/* Keep rotating orbit icon tooltips fully inside the visible welcome panel.
   At the top of the orbit the tooltip opens below, not under browser chrome. */
function wireFieldValidation(){
 const form=document.querySelector("#login-form,#signup-form,#forgot-form,#reset-form");
 if(!form)return;
 form.noValidate=true;
 const controls=[...form.querySelectorAll("input,select")].filter(c=>c.id&&!["hidden"].includes(c.type));
 const check=control=>{
  if(control.id?.startsWith("birth-")){
   const valid=["birth-day","birth-month","birth-year"].every(id=>Boolean(q("#"+id)?.value));
   const start=q("#birth-day");
   const value=valid?validateBirthday():null;
   const correctDate=typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
   showFieldError(start,!valid?"Оберіть дату народження.":correctDate?"":typeof value==="string"?value:"Вкажіть правильну дату народження.");
   return Boolean(correctDate);
  }
  const message=validationText(control,form);
  showFieldError(control,message);
  return !message;
 };
 for(const control of controls){
  // Editing immediately clears the old error instead of repainting it on blur.
  const clear=()=>{
   showFieldError(control,"");
   if(control.id?.startsWith("birth-"))showFieldError(q("#birth-day"),"");
  };
  control.addEventListener("input",clear);
  control.addEventListener("change",clear);
 }
 const validateScope=scope=>{
  let first=null;
  for(const control of controls){
   if(scope&&!scope.contains(control))continue;
   if(control.closest("[data-create-account-step]")?.hidden)continue;
   if(control.id.startsWith("birth-")&&control.id!=="birth-day")continue;
   if(!check(control)&&!first)first=control;
  }
  if(first){
   const focus=first.closest(".vatra-select")?.querySelector(".vatra-select-trigger")||first;
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
/* Two-step VATRA registration. Form values stay in memory while navigating;
   no passwords or personal details are written to browser storage. */
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
/* The same password policy governs signup and both reset paths.
   Login deliberately accepts existing passwords, including older policies. */
function passwordIssue(value){
 if(typeof value!=="string"||value.length<12)return english?"Use at least 12 characters.":"Використайте щонайменше 12 символів.";
 if(value.length>128)return english?"Use no more than 128 characters.":"Використайте не більше 128 символів.";
 if(!/[a-z]/.test(value))return english?"Add a lowercase Latin letter (a–z).":"Додайте малу латинську літеру (a–z).";
 if(!/[A-Z]/.test(value))return english?"Add an uppercase Latin letter (A–Z).":"Додайте велику латинську літеру (A–Z).";
 if(!/[0-9]/.test(value))return english?"Add a digit (0–9).":"Додайте цифру (0–9).";
 if(!/[!@#$%^&*()_+\-=\[\]{};'\\:"|<>?,.\/\x60~]/.test(value))
  return english?"Add a special character (for example, ! or @).":"Додайте спеціальний символ (наприклад, ! або @).";
 return "";
}
function validPassword(value){return passwordIssue(value)==="";}
async function initialize(){
 try{
 /* Initial language translations must finish before wiring localized controls. */
 await window.VATRA_LANGUAGE?.ready;
 /* Shared controls initialize before authentication, so typing never depends
    on network availability. Each page module initializes only its own view. */
 wirePasswordButtons();
 wireFloatingHints();
 if(!window.supabase?.createClient){
  feedback("Не вдалося завантажити модуль входу. Перевірте з'єднання та оновіть сторінку.","error");
  return;
 }
 try{
  auth=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
   // Recovery OTP verifies the user's identity only to change their password.
   // It must NEVER persist a normal VATRA login session in localStorage.
   auth:{autoRefreshToken:page!=="reset"&&page!=="forgot",
    persistSession:page!=="reset"&&page!=="forgot",
    detectSessionInUrl:page!=="forgot",flowType:"pkce"}
  });
 }catch(_){
  feedback("Не вдалося підключитися до сервісу авторизації.","error");return;
 }
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
   const {data,error}=await sessionCheckWithTimeout();
   if(!error&&data?.user?.email_confirmed_at){await goToFeed();return;}
  }catch(_){/* Leave login available if the network is unreachable. */}
  pageHooks.wireRememberedAccount?.();
 }
 if(page==="create-account"){
  try{
   const {data,error}=await sessionCheckWithTimeout();
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