/* VATRA Password recovery: page-specific behavior; shared utilities are in auth-core.js. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_AUTH_ENTRY=ctx=>{
 const {q,url,translate,english,auth,replayAuthContent,busy,getMessage,captchaOptions,resetCaptcha,clearFeedback,feedback,passwordIssue}=ctx;
function wireForgot(){
 const form=q("#forgot-form");
 const step=q("#recovery-step");
 const emailField=q("#email");
 const recoveryEmail=q("#recovery-email");
 const address=q("#recovery-address");
 const codeField=q("#recovery-token");
 const resend=q("#recovery-resend");
 const countdown=q("#recovery-countdown");
 const changeEmail=q("#recovery-change-email");
 if(!form||!step||!emailField||!recoveryEmail||!codeField||!resend||!changeEmail)return;
 const COOLDOWN_MS=60000;
 let lastSent=0,timer=null,sending=false;
 const hideEmailNotes=hide=>{
  const note=q("#recovery-note");if(note)note.hidden=hide;
 };
 const refreshCooldown=()=>{
  const remaining=Math.max(0,Math.ceil((lastSent+COOLDOWN_MS-Date.now())/1000));
  resend.disabled=sending||remaining>0;
  countdown.textContent=remaining?(english?"Try again in ":"Повторити через ")+
   Math.floor(remaining/60)+":"+String(remaining%60).padStart(2,"0"):"";
  if(!remaining&&timer){clearInterval(timer);timer=null;}
 };
 const startCooldown=sentAt=>{
  lastSent=sentAt;
  if(timer){clearInterval(timer);timer=null;}
  refreshCooldown();
  if(lastSent+COOLDOWN_MS>Date.now())timer=setInterval(refreshCooldown,1000);
 };
 const enterCode=(email,sentAt)=>{
  emailField.value=email;
  recoveryEmail.value=email;
  address.textContent=email;
  form.hidden=true;
  hideEmailNotes(true);
  step.hidden=false;
  // Keep validation and server errors directly below the active step title.
  const status=q("#response"),heading=q("#recovery-step-heading");
  if(status&&heading)heading.after(status);
  q("#recovery-code-form").hidden=false;
  q("#reset-form").hidden=true;
  q("#recovery-tools").hidden=false;
  q("#recovery-step .recovery-step-caption").hidden=false;
  startCooldown(sentAt);
  replayAuthContent(q(".forgot-panel-content"));
  codeField.focus({preventScroll:true});
  step.scrollIntoView({behavior:"smooth",block:"nearest"});
 };
 const editEmail=()=>{
  form.hidden=false;step.hidden=true;hideEmailNotes(false);
  const status=q("#response");
  if(status&&step.contains(status))form.before(status);
  clearFeedback();
  replayAuthContent(q(".forgot-panel-content"));
  try{sessionStorage.removeItem("vatra-recovery-pending");}catch(_){}
  emailField.focus({preventScroll:true});
  form.scrollIntoView({behavior:"smooth",block:"nearest"});
 };
 const requestCode=async(email,repeat=false)=>{
  if(sending)return;
  sending=true;
  resend.disabled=true;
  if(!repeat)busy(form,true);
  clearFeedback();
  try{
   const captchaScope=repeat?step:form;
   const captcha=await captchaOptions(captchaScope);
   const {error}=await auth.auth.resetPasswordForEmail(email,{
    redirectTo:new URL("reset",location.href).href,
    ...captcha
   });
   if(error)throw error;
   const sentAt=Date.now();
   try{
    sessionStorage.setItem("vatra-recovery-email",email);
    sessionStorage.setItem("vatra-recovery-pending",JSON.stringify({email,sentAt}));
   }catch(_){}
   // The code step already explains what happens next. Avoid a duplicate green
   // success banner after the first request; retain feedback for an explicit resend.
   if(repeat)feedback("Якщо акаунт існує, новий код надіслано. Використайте код з останнього листа.","success");
   if(repeat){codeField.value="";codeField.dispatchEvent(new Event("input",{bubbles:true}));}
   enterCode(email,sentAt);
  }catch(error){
   feedback(getMessage(error),"error");
  }finally{
   resetCaptcha(repeat?step:form);
   sending=false;
   if(!repeat)busy(form,false);
   refreshCooldown();
  }
 };
 form.addEventListener("submit",event=>{
  event.preventDefault();
  const email=emailField.value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
   feedback("Вкажіть правильну електронну пошту.","error");emailField.focus();return;
  }
  requestCode(email);
 });
 resend.addEventListener("click",()=>{
  if(sending||Date.now()<lastSent+COOLDOWN_MS)return;
  const email=recoveryEmail.value.trim().toLowerCase();
  if(email)requestCode(email,true);
 });
 changeEmail.addEventListener("click",editEmail);
 window.addEventListener("pagehide",()=>{if(timer)clearInterval(timer);});
 // A refreshed tab returns to the code field; never store the code itself.
 try{
  const saved=JSON.parse(sessionStorage.getItem("vatra-recovery-pending")||"null");
  if(saved&&typeof saved.email==="string"&&Number.isFinite(saved.sentAt)
   &&saved.sentAt<=Date.now()&&Date.now()-saved.sentAt<3600000){
   enterCode(saved.email,saved.sentAt);
  }
 }catch(_){}
 wireReset();
}
function wireReset(){
 const form=q("#reset-form"),codeForm=q("#recovery-code-form");
 if(!form||!codeForm)return;
 const params=new URLSearchParams(location.search);
 const hash=new URLSearchParams(location.hash.substring(1));
 const tokenHash=params.get("token_hash");
 const openedLink=params.has("code")||params.get("type")==="recovery"||hash.get("type")==="recovery"||hash.has("access_token");
 const linkFailed=Boolean(params.get("error")||hash.get("error"));
 // A pre-existing login session is not evidence of a password recovery.
 let recoveryVerifiedUserId=null;
 const emailInput=q("#recovery-email");
 const tokenInput=q("#recovery-token");
 // Password managers may focus the first new-password input on their own.
 // Ignore that implicit focus while the newly revealed fields are empty,
 // but float normally as soon as the user clicks, tabs or types.
 const newPasswordFields=[...form.querySelectorAll('input.control[type="password"]')];
 const activatePasswordHint=input=>input.closest(".vatra-input-shell")?.classList.remove("is-awaiting-user-input");
 for(const input of newPasswordFields){
  for(const event of ["pointerdown","keydown","input"])
   input.addEventListener(event,()=>activatePasswordHint(input));
 }
 document.addEventListener("keydown",event=>{
  if(event.key!=="Tab")return;
  requestAnimationFrame(()=>{
   const focused=document.activeElement;
   if(newPasswordFields.includes(focused))activatePasswordHint(focused);
  });
 });
 try{emailInput.value=sessionStorage.getItem("vatra-recovery-email")||"";}catch(_){}
 // Programmatic session-prefill must also update the shared floating-hint state.
 emailInput.dispatchEvent(new Event("input",{bubbles:true}));
 const reveal=verifiedUser=>{
  if(!verifiedUser?.id)return;
  recoveryVerifiedUserId=verifiedUser.id;
  codeForm.hidden=true;
  form.hidden=false;
  // Preserve centered captions even if the browser auto-focuses a blank password field.
  for(const input of newPasswordFields){
   const shell=input.closest(".vatra-input-shell");
   shell?.classList.toggle("is-awaiting-user-input",!input.value);
  }
  const tools=q("#recovery-tools");if(tools)tools.hidden=true;
  const caption=q("#recovery-step .recovery-step-caption");if(caption)caption.hidden=true;
  const heading=q("#recovery-step-heading");
  if(heading){
   heading.textContent=english?"Set a new password":"Встановіть новий пароль";
   heading.tabIndex=-1; // Announce the new step without focusing an empty input.
  }
  clearFeedback();
  replayAuthContent(q(".forgot-panel-content"));
  heading?.focus({preventScroll:true});
 };
 if(linkFailed){
  feedback("Посилання недійсне або застаріло. Запросіть нове.","error");
 }else if(tokenHash){
  // Token hashes can be redeemed in a different browser without the PKCE
  // verifier from the device where reset was requested.
  history.replaceState(history.state,"",location.pathname);
  if(params.get("type")!=="recovery"||tokenHash.length>2048){
   feedback("Посилання недійсне або застаріло. Запросіть нове.","error");
  }else{
   void (async()=>{
    try{
     const {data,error}=await auth.auth.verifyOtp({token_hash:tokenHash,type:"recovery"});
     if(error||!data?.session?.user?.id)throw error||new Error("Recovery verification failed");
     reveal(data.session.user);
    }catch(_){feedback("Посилання недійсне або застаріло. Запросіть нове.","error");}
   })();
  }
 }else if(openedLink){
  // Legacy callbacks are allowed only after PASSWORD_RECOVERY, never SIGNED_IN.
  auth.auth.onAuthStateChange((event,session)=>{
   if(event==="PASSWORD_RECOVERY"&&session?.user?.id)reveal(session.user);
  });
 }
 codeForm.addEventListener("submit",async e=>{
  e.preventDefault();clearFeedback();
  const email=emailInput.value.trim().toLowerCase();
  const token=tokenInput.value.replace(/\s+/g,"");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){feedback("Вкажіть правильну електронну пошту.","error");(emailInput.type==="hidden"?q("#recovery-change-email"):emailInput)?.focus();return;}
  if(!/^\d{6,10}$/.test(token)){feedback("Введіть код із листа (6–10 цифр).","error");tokenInput.focus();return;}
  busy(codeForm,true);
  try{
   const {data,error}=await auth.auth.verifyOtp({email,token,type:"recovery"});
   if(error||!data?.session?.user?.id)throw error||new Error("Verification failed");
   tokenInput.value="";
   tokenInput.dispatchEvent(new Event("input",{bubbles:true}));
   reveal(data.session.user);
  }catch(_){feedback("Неправильний або прострочений код. Перевірте лист або запросіть новий.","error");}
  finally{busy(codeForm,false);}
 });
 form.addEventListener("submit",async e=>{
  e.preventDefault();clearFeedback();
  if(!recoveryVerifiedUserId){
   feedback("Спочатку підтвердьте відновлення через лист або одноразовий код.","error");
   form.hidden=true;codeForm.hidden=false;return;
  }
  const password=q("#password").value,again=q("#password-confirm").value;
  const passwordProblem=passwordIssue(password);
  if(passwordProblem){feedback(passwordProblem,"error");q("#password")?.focus({preventScroll:true});return;}
  if(password!==again){feedback("Паролі не збігаються.","error");return;}
  busy(form,true);
  try{
   const {data:{user},error:userErr}=await auth.auth.getUser();
   if(userErr||!user||user.id!==recoveryVerifiedUserId){feedback("Підтвердження закінчилося. Запросіть новий код для відновлення.","error");form.hidden=true;codeForm.hidden=false;return;}
   const {error}=await auth.auth.updateUser({password});
   if(error)throw error;
   // This one-time recovery session must not become a normal signed-in account.
   recoveryVerifiedUserId=null;
   try{await auth.auth.signOut?.({scope:"local"});}catch(_){}
   form.reset();
   form.hidden=true;
   feedback("Пароль оновлено. Увійдіть з новим паролем.","success");
   const link=q("#account-link");if(link)link.hidden=false;
   const parent=q("#recovery-success-link");if(parent)parent.hidden=false;
   replayAuthContent(q(".forgot-panel-content"));
   try{
    sessionStorage.removeItem("vatra-recovery-email");
    sessionStorage.removeItem("vatra-recovery-pending");
   }catch(_){}
  }catch(error){feedback(getMessage(error),"error");}finally{busy(form,false);}
 });
}

 return {wireForgot,wireReset};
};
})();
