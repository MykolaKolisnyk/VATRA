/* VATRA Create account: page-specific behavior; shared utilities are in auth-core.js. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_AUTH_ENTRY=ctx=>{
 const {q,url,translate,english,auth,page,replayAuthContent,busy,getMessage,captchaOptions,resetCaptcha,rememberAccount,goToFeed,clearFeedback,feedback,passwordIssue,validateCreateAccountStep}=ctx;
function wireHoverHelp(){
 const helps=[...document.querySelectorAll(".create-account-help")];
 let active=null;
 const timers=new Map();
 const dismiss=help=>{
  clearTimeout(timers.get(help));
  timers.delete(help);
  help.open=false;
  help.removeAttribute("data-side");
  const panel=help.querySelector(".create-account-help-panel");
  if(panel){panel.style.top="";panel.style.bottom="";}
  if(active===help)active=null;
 };
 const reveal=help=>{
  for(const other of helps)if(other!==help&&other.open)dismiss(other);
  clearTimeout(timers.get(help));
  timers.delete(help);
  help.open=true;active=help;
  const summary=help.querySelector("summary");
  const panel=help.querySelector(".create-account-help-panel");
  if(!summary||!panel)return;
  const rect=summary.getBoundingClientRect();
  const availableRight=window.innerWidth-rect.right;
  const availableLeft=rect.left;
  const side=availableRight>=355?"right":availableLeft>=355?"left":"below";
  help.dataset.side=side;
  panel.style.top="";panel.style.bottom="";
  requestAnimationFrame(()=>{
   if(!help.open)return;
   const bounds=panel.getBoundingClientRect();
   if(bounds.bottom>window.innerHeight-12){
    if(side==="below"&&rect.top>bounds.height+16){
     panel.style.top="auto";
     panel.style.bottom="calc(100% + 10px)";
    }else{
     const current=parseFloat(getComputedStyle(panel).top)||0;
     panel.style.top=Math.max(12-help.getBoundingClientRect().top,
       current-(bounds.bottom-window.innerHeight+12))+"px";
    }
   }
  });
 };
 const schedule=help=>{
  clearTimeout(timers.get(help));
  timers.set(help,setTimeout(()=>dismiss(help),125));
 };
 for(const help of helps){
  const summary=help.querySelector("summary");
  help.addEventListener("pointerenter",()=>reveal(help));
  help.addEventListener("pointerleave",()=>schedule(help));
  help.addEventListener("focusin",()=>reveal(help));
  help.addEventListener("focusout",event=>{
   if(!help.contains(event.relatedTarget))schedule(help);
  });
  summary?.addEventListener("click",event=>{
   event.preventDefault();
   if(matchMedia("(hover: none)").matches){
    if(!help.open)reveal(help);
   }
  });
 }
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&active)dismiss(active);
 });
 document.addEventListener("pointerdown",event=>{
  if(active&&!active.contains(event.target))dismiss(active);
 });
}

function wireCreateAccountWizard(){
 const form=q("#signup-form"),first=q('[data-create-account-step="1"]'),second=q('[data-create-account-step="2"]');
 const next=q("#create-account-next"),back=q("#create-account-back"),progress=q(".signup-progress");
 if(!form||!first||!second||!next||!back||!progress)return;
 function show(step,animate=false){
  document.body.dataset.createAccountStep=String(step);
  first.hidden=step!==1;
  second.hidden=step!==2;
  for(const header of document.querySelectorAll("[data-step-heading]"))
   header.hidden=Number(header.dataset.stepHeading)!==step;
  progress.setAttribute("aria-valuenow",String(step));
  if(animate)replayAuthContent(q(".signup-form-panel .narrow-form"));
 }
 next.addEventListener("click",()=>{
  if(!validateCreateAccountStep(first))return;
  show(2,true);
  q("#email")?.focus({preventScroll:true});
 });
 back.addEventListener("click",()=>{
  show(1,true);
  q("#first-name")?.focus({preventScroll:true});
 });
 form.addEventListener("reset",()=>show(1,true));
 show(1);
}

function validDate(year,month,day){
 const y=Number(year),m=Number(month),d=Number(day);
 if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)||y<1900||m<1||m>12||d<1)return false;
 const date=new Date(Date.UTC(y,m-1,d));
 if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return false;
 return date.getTime()<=Date.now();
}
function fillBirthdays(){
 const month=q("#birth-month"),day=q("#birth-day"),year=q("#birth-year");
 if(!month||!day||!year)return;
 const now=new Date();
 const locale=window.VATRA_LANGUAGE?.locale||"uk";
  const dateLocales={uk:"uk-UA",en:"en-US",pl:"pl-PL",de:"de-DE",fr:"fr-FR",it:"it-IT",ka:"ka-GE",bg:"bg-BG"};
  const names=new Intl.DateTimeFormat(dateLocales[locale]||"uk-UA",{month:"long"});
 for(let i=1;i<=12;i++){
  const number=String(i).padStart(2,"0");
  const name=names.format(new Date(2024,i-1,1));
  month.add(new Option(name[0].toUpperCase()+name.slice(1),number));
 }
 for(let i=1;i<=31;i++)day.add(new Option(String(i).padStart(2,"0"),String(i).padStart(2,"0")));
 for(let i=now.getFullYear();i>=1900;i--)year.add(new Option(String(i),String(i)));
}
/* Accessible VATRA dropdowns use native select values and validation; the
   browser's native OS popup is replaced by a consistent Onest listbox. */
function wireSelects(){
 const selects=[...document.querySelectorAll("#birth-day,#birth-month,#birth-year,#gender")];
 let opened=null;
 function close(focus=false){
  if(!opened)return;
  const {trigger,list,root,resetRail}=opened;
  resetRail();
  list.hidden=true;trigger.setAttribute("aria-expanded","false");
  root.classList.remove("is-open","opens-up");
  opened=null;
  if(focus)trigger.focus();
 }
 for(const select of selects){
  const root=document.createElement("div");
  root.className="vatra-select ui-select-wrapper-"+select.id;
  select.parentNode.insertBefore(root,select);
  root.append(select);
  const required=select.required;
  select.required=false; // validateBirthday() checks the original select values on submit
  select.classList.add("vatra-select-native");
  select.tabIndex=-1;
  select.setAttribute("aria-hidden","true");
  const trigger=document.createElement("button");
  trigger.type="button";
  trigger.className="control vatra-select-trigger vatra-select-trigger-"+select.id;
  trigger.setAttribute("aria-haspopup","listbox");
  trigger.setAttribute("aria-expanded","false");
  trigger.setAttribute("aria-label",select.getAttribute("aria-label")||"");
  const display=document.createElement("span");
  display.className="vatra-select-display-"+select.id;
  trigger.append(display);
  const list=document.createElement("div");
  list.className="vatra-select-list ui-select-options-"+select.id;
  list.hidden=true;
  list.setAttribute("role","listbox");
  list.setAttribute("aria-label",select.getAttribute("aria-label")||"");
  const scrollArea=document.createElement("div");
  scrollArea.className="vatra-select-scroll-area ui-select-scroll-"+select.id;
  scrollArea.setAttribute("role","presentation");
  list.append(scrollArea);
  const rail=document.createElement("div");
  rail.className="vatra-select-scroll-rail ui-select-rail-"+select.id;
  rail.hidden=true;
  rail.setAttribute("aria-hidden","true");
  const thumb=document.createElement("span");
  thumb.className="vatra-select-scroll-thumb ui-select-thumb-"+select.id;
  rail.append(thumb);
  list.append(rail);
  let pointerInside=false,dragging=false,hideTimer=null,grabY=0;
  function resetRail(){
   clearTimeout(hideTimer);hideTimer=null;pointerInside=false;dragging=false;
   rail.classList.remove("is-visible","is-dragging");
  }
  function updateRail(){
   if(list.hidden)return;
   const overflow=scrollArea.scrollHeight-scrollArea.clientHeight;
   if(overflow<=1){rail.hidden=true;rail.classList.remove("is-visible");return;}
   rail.hidden=false;
   const height=rail.clientHeight;
   if(height<=0)return;
   const thumbHeight=Math.min(height,Math.max(26,
    height*scrollArea.clientHeight/scrollArea.scrollHeight));
   const travel=Math.max(0,height-thumbHeight);
   thumb.style.height=thumbHeight+"px";
   thumb.style.transform="translateY("+
    (travel*(scrollArea.scrollTop/overflow))+"px)";
  }
  function showRail(){
   updateRail();
   if(rail.hidden)return;
   rail.classList.add("is-visible");
   clearTimeout(hideTimer);hideTimer=null;
   if(!pointerInside&&!dragging)hideTimer=setTimeout(
    ()=>rail.classList.remove("is-visible"),1000);
  }
  list.addEventListener("pointerenter",e=>{
   if(e.pointerType==="mouse"||e.pointerType==="pen"){
    pointerInside=true;showRail();
   }
  });
  list.addEventListener("pointerleave",e=>{
   if(e.pointerType==="mouse"||e.pointerType==="pen"){
    pointerInside=false;
    if(!dragging){clearTimeout(hideTimer);rail.classList.remove("is-visible");}
   }
  });
  scrollArea.addEventListener("scroll",()=>{updateRail();showRail();},{passive:true});
  rail.addEventListener("pointerdown",e=>{
   if(e.button!==0||rail.hidden)return;
   e.preventDefault();e.stopPropagation();
   const thumbRect=thumb.getBoundingClientRect();
   grabY=e.clientY>=thumbRect.top&&e.clientY<=thumbRect.bottom?
    e.clientY-thumbRect.top:thumbRect.height/2;
   dragging=true;rail.classList.add("is-dragging");
   showRail();rail.setPointerCapture(e.pointerId);
   moveRail(e);
  });
  function moveRail(e){
   const limit=scrollArea.scrollHeight-scrollArea.clientHeight;
   const space=rail.clientHeight-thumb.getBoundingClientRect().height;
   if(limit<=0||space<=0)return;
   const y=Math.max(0,Math.min(space,e.clientY-rail.getBoundingClientRect().top-grabY));
   scrollArea.scrollTop=y/space*limit;
   updateRail();
  }
  rail.addEventListener("pointermove",e=>{if(dragging)moveRail(e);});
  function stopDrag(e){
   if(!dragging)return;
   dragging=false;rail.classList.remove("is-dragging");
   if(rail.hasPointerCapture(e.pointerId))rail.releasePointerCapture(e.pointerId);
   pointerInside=list.matches(":hover");
   if(pointerInside)showRail();
   else{clearTimeout(hideTimer);rail.classList.remove("is-visible");}
  }
  rail.addEventListener("pointerup",stopDrag);
  rail.addEventListener("pointercancel",stopDrag);
  rail.addEventListener("wheel",e=>{
   scrollArea.scrollTop+=e.deltaY;
   showRail();e.preventDefault();
  },{passive:false});
  const choices=[...select.options].filter(opt=>!opt.disabled&&(opt.value||!required));
  for(const [optionIndex,opt] of choices.entries()){
   const item=document.createElement("button");
   item.type="button";
   item.className="vatra-select-option vatra-select-"+select.id+"-item-"+(optionIndex+1);
   item.dataset.value=opt.value;
   item.setAttribute("role","option");
   item.setAttribute("aria-selected",String(select.value===opt.value));
   item.tabIndex=-1;
   item.textContent=opt.textContent;
   item.addEventListener("click",()=>{
    select.value=opt.value;
    select.dispatchEvent(new Event("change",{bubbles:true}));
    close(true);
   });
   scrollArea.append(item);
  }
  root.append(trigger,list);
  const caption=document.querySelector('label[for="'+select.id+'"]');
  if(caption){
    caption.addEventListener("click",event=>{
      event.preventDefault();
      trigger.focus();
      trigger.click();
    });
  }
  const update=()=>{
   const current=select.selectedOptions[0];
   display.textContent=current?.textContent||"";
   trigger.classList.toggle("is-placeholder",!select.value);
   for(const item of scrollArea.children){
    item.setAttribute("aria-selected",String(item.dataset.value===select.value));
   }
  };
  select.addEventListener("change",update);
  select.form?.addEventListener("reset",()=>requestAnimationFrame(update));
  update();
  function open(){
   if(opened?.trigger===trigger){close();return;}
   close();
   const rect=trigger.getBoundingClientRect();
   const below=window.innerHeight-rect.bottom-12;
   const above=rect.top-12;
   const upwards=below<230&&above>below;
   const room=upwards?above:below;
   list.style.maxHeight=Math.max(100,Math.min(304,room-10))+"px";
   root.classList.toggle("opens-up",upwards);
   list.hidden=false;
   trigger.setAttribute("aria-expanded","true");
   root.classList.add("is-open");
   opened={trigger,list,root,select,choices,resetRail};
   const active=list.querySelector('[aria-selected="true"]');
   if(active)active.scrollIntoView({block:"nearest"});
   requestAnimationFrame(()=>{
    if(opened?.list!==list)return;
    updateRail();
    if(list.matches(":hover")){pointerInside=true;showRail();}
   });
  }
  trigger.addEventListener("click",open);
  trigger.addEventListener("keydown",e=>{
   if(e.key==="Escape"){if(opened?.trigger===trigger){e.preventDefault();close();}return;}
   if(e.key===" "||e.key==="Enter"){e.preventDefault();open();return;}
   const values=choices.map(o=>o.value);
   let index=values.indexOf(select.value);
   if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){
    e.preventDefault();
    if(!opened||opened.trigger!==trigger)open();
    if(e.key==="ArrowDown")index=Math.min(values.length-1,index+1);
    else if(e.key==="ArrowUp")index=Math.max(0,index<0?0:index-1);
    else if(e.key==="Home")index=0;else index=values.length-1;
    if(index>=0){
     select.value=values[index];
     select.dispatchEvent(new Event("change",{bubbles:true}));
     scrollArea.children[index]?.scrollIntoView({block:"nearest"});
    }
   }else if(e.key.length===1&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
    const search=e.key.toLocaleLowerCase();
    const match=choices.find(o=>o.textContent.toLocaleLowerCase().startsWith(search));
    if(match){select.value=match.value;select.dispatchEvent(new Event("change",{bubbles:true}));}
   }
  });
  if(required)root.dataset.required="true";
 }
 document.addEventListener("pointerdown",e=>{
  if(opened&&!opened.root.contains(e.target))close();
 });
 document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&opened)close(true);
 });
 window.addEventListener("resize",()=>close());
}
function validateBirthday(){
 const year=q("#birth-year")?.value,month=q("#birth-month")?.value,day=q("#birth-day")?.value;
 if(!validDate(year,month,day))return null;
 const y=Number(year),m=Number(month),d=Number(day);
 const now=new Date();
 const age=now.getFullYear()-y-(now.getMonth()+1<m||(now.getMonth()+1===m&&now.getDate()<d)?1:0);
 if(age<13)return "ВАТРА наразі доступна користувачам від 13 років.";
 return [year,month,day].join("-");
}

const SIGNUP_PENDING_KEY="vatra-signup-confirmation";
const SIGNUP_AUTH_CHANNEL="vatra-auth-verified";
let signupAuthWatchStarted=false,signupVerificationBusy=false,signupAccountNavigating=false;

function isExpectedConfirmedSignup(user){
 return !!(signupPending?.email&&user?.id&&user?.email_confirmed_at&&
  typeof user.email==="string"&&
  user.email.trim().toLowerCase()===signupPending.email.trim().toLowerCase());
}
async function verifyPendingSignupSession(){
 if(page!=="create-account"||!auth||!signupPending||signupVerificationBusy||signupAccountNavigating||
  q("#signup-confirmation")?.hidden!==false)return;
 const expected=signupPending;
 signupVerificationBusy=true;
 try{
  const {data,error}=await auth.auth.getUser(); // Verified via Supabase Auth server.
  if(error||signupPending!==expected||!isExpectedConfirmedSignup(data?.user)||
   q("#signup-confirmation")?.hidden!==false)return;
  signupAccountNavigating=true;
  try{sessionStorage.removeItem(SIGNUP_PENDING_KEY);}catch(_){}
  goToFeed();
 }catch(_){
 }finally{signupVerificationBusy=false;}
}
function watchSignupConfirmation(){
 if(page!=="create-account"||!auth||signupAuthWatchStarted)return;
 signupAuthWatchStarted=true;
 const check=()=>{void verifyPendingSignupSession();};
 const onAuth=event=>{
  if(["INITIAL_SESSION","SIGNED_IN","TOKEN_REFRESHED","USER_UPDATED"].includes(event))
   setTimeout(check,0); // Avoid awaiting other Supabase calls inside the Auth callback.
 };
 const subscription=auth.auth.onAuthStateChange?.(onAuth)?.data?.subscription;
 let channel=null;
 if(typeof BroadcastChannel!=="undefined"){
  try{
   channel=new BroadcastChannel(SIGNUP_AUTH_CHANNEL);
   channel.addEventListener("message",event=>{
    if(event.data?.type==="check-confirmed-session")check();
   });
  }catch(_){}
 }
 const onVisibility=()=>{if(!document.hidden)check();};
 const onStorage=event=>{
  if(event.key?.startsWith("sb-")&&event.key.endsWith("-auth-token"))check();
 };
 window.addEventListener("focus",check);
 window.addEventListener("pageshow",check);
 window.addEventListener("storage",onStorage);
 document.addEventListener("visibilitychange",onVisibility);
 window.addEventListener("pagehide",()=>{
  channel?.close();
  subscription?.unsubscribe?.();
  window.removeEventListener("focus",check);
  window.removeEventListener("pageshow",check);
  window.removeEventListener("storage",onStorage);
  document.removeEventListener("visibilitychange",onVisibility);
 },{once:true});
 check();
}
function announceVerifiedAccount(){
 if(typeof BroadcastChannel==="undefined")return;
 try{
  const channel=new BroadcastChannel(SIGNUP_AUTH_CHANNEL);
  channel.postMessage({type:"check-confirmed-session"}); // No email, ID or token.
  channel.close();
 }catch(_){}
}

const SIGNUP_RESEND_COOLDOWN_MS=60000;
const SIGNUP_LINK_VALIDITY_MS=900000;
let signupPending=null,signupSending=false,signupTickTimer=null;
function maskSignupEmail(email){
 const at=email.lastIndexOf("@");
 if(at<=0||at===email.length-1)return "";
 const name=email.slice(0,at),domain=email.slice(at+1);
 let visible;
 if(name.length>=7)visible=name.slice(0,3)+"•••"+name.slice(-3);
 else if(name.length>=4)visible=name.slice(0,3)+"•••";
 else visible=name.slice(0,1)+"•••";
 return visible+"@"+domain;
}
function signupClock(ms){const s=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");}
function saveSignupPending(){try{sessionStorage.setItem(SIGNUP_PENDING_KEY,JSON.stringify(signupPending));}catch(_){}}
function syncSignupCountdown(){
 if(!signupPending)return;
 const expiry=q("#signup-confirmation-expiry");
 if(expiry)expiry.textContent=signupClock(signupPending.sentAt+SIGNUP_LINK_VALIDITY_MS-Date.now());
 const button=q("#signup-confirmation-resend");
 if(!button)return;
 const remaining=Math.max(0,(signupPending.nextAllowedAt||0)-Date.now());
 button.disabled=signupSending||remaining>0||!signupPending.email||!auth;
 button.textContent=signupSending?translate("Надсилаємо…"):remaining
  ?translate("Повторити через")+" "+signupClock(remaining):translate("Надіслати лист ще раз");
}
function showSignupMessage(message,error=false){
 const box=q("#signup-confirmation-feedback");if(!box)return;
 box.textContent=translate(message);box.dataset.type=error?"error":"success";box.hidden=false;
}
function showSignupConfirmation(pending){
 const screen=q("#signup-confirmation"),form=q(".signup-form-panel .narrow-form");
 if(!screen||!form)return;
 signupPending=pending;form.hidden=true;screen.hidden=false;
 replayAuthContent(screen);
 const badge=q("#signup-confirmation-address"),row=q(".signup-confirmation-address-row");
 if(badge&&row){badge.textContent=pending.address||"";row.hidden=!pending.address;}
 document.body.dataset.signupConfirmation="pending";
 q("#signup-confirmation-feedback").hidden=true;
 if(!signupTickTimer)signupTickTimer=setInterval(syncSignupCountdown,1000);
 syncSignupCountdown();
 screen.scrollIntoView({block:"nearest",behavior:"smooth"});
}
function restoreSignupConfirmation(){
 q("#signup-confirmation-resend")?.addEventListener("click",async()=>{
  if(signupSending||!signupPending||Date.now()<(signupPending.nextAllowedAt||0))return;
  if(!signupPending.email){showSignupMessage("Щоб надіслати лист, поверніться до створення акаунта й укажіть email.",true);return;}
  signupSending=true;const screen=q("#signup-confirmation");syncSignupCountdown();
  try{
   const captcha=await captchaOptions(screen);
   const {error}=await auth.auth.resend({type:"signup",email:signupPending.email,
    options:{...captcha,emailRedirectTo:new URL("verify",location.href).href}});
   if(error)throw error;
   const now=Date.now();signupPending.sentAt=now;signupPending.nextAllowedAt=now+SIGNUP_RESEND_COOLDOWN_MS;
   saveSignupPending();showSignupMessage("Лист надіслано повторно. Перевірте пошту.");
  }catch(error){showSignupMessage(getMessage(error),true);}
  finally{resetCaptcha(screen);signupSending=false;syncSignupCountdown();}
 });
 try{
  const pending=JSON.parse(sessionStorage.getItem(SIGNUP_PENDING_KEY)||"null");
  if(pending&&typeof pending.address==="string"&&Number.isFinite(pending.sentAt)&&
   pending.sentAt<=Date.now()&&Date.now()-pending.sentAt<86400000)showSignupConfirmation(pending);
  else sessionStorage.removeItem(SIGNUP_PENDING_KEY);
 }catch(_){}
 window.addEventListener("pagehide",()=>{if(signupTickTimer)clearInterval(signupTickTimer);signupTickTimer=null;},{once:true});
}
function markSignupPending(email){
 const now=Date.now();signupPending={email,address:maskSignupEmail(email),sentAt:now,nextAllowedAt:now+SIGNUP_RESEND_COOLDOWN_MS};
 saveSignupPending();showSignupConfirmation(signupPending);
}
function wireCreateAccount(){
 const form=q("#signup-form");
 if(!form)return;
 form.addEventListener("submit",async e=>{
  e.preventDefault();clearFeedback();
  const first=q("#first-name").value.trim(),last=q("#last-name").value.trim();
  const email=q("#email").value.trim().toLowerCase();
  const password=q("#password").value,again=q("#password-confirm").value;
  const birthday=validateBirthday();
  const gender=q("#gender").value;
  if(first.length<2||last.length<2||first.length>60||last.length>60){feedback("Вкажіть ім’я та прізвище (від 2 до 60 символів).","error");return;}
  if(!birthday){feedback("Вкажіть правильну дату народження.","error");return;}
  if(typeof birthday==="string"&&birthday.startsWith("ВАТРА")){feedback(birthday,"error");return;}
  if(!email.includes("@")){feedback("Вкажіть правильну електронну пошту.","error");return;}
  const passwordProblem=passwordIssue(password);
  if(passwordProblem){feedback(passwordProblem,"error");q("#password")?.focus({preventScroll:true});return;}
  if(password!==again){feedback("Паролі не збігаються.","error");return;}
  if(!q("#consent").checked){feedback("Для створення акаунта потрібно прийняти умови використання.","error");return;}
  busy(form,true);
  try{
   const captcha=await captchaOptions(form);
   const {data,error}=await auth.auth.signUp({
    email,password,
    options:{
     ...captcha,
     emailRedirectTo:new URL("verify",location.href).href,
     data:{first_name:first,last_name:last,full_name:first+" "+last,birthdate:birthday,gender:gender||null,preferred_locale:window.VATRA_LANGUAGE?.locale||"uk"}
    }
   });
   if(error)throw error;
   if(data?.session&&data?.user?.email_confirmed_at){rememberAccount(data.user);form.reset();goToFeed();return;}
   for(const selector of ["#password","#password-confirm"]){const field=q(selector);if(field){field.value="";field.dispatchEvent(new Event("input",{bubbles:true}));}}
   markSignupPending(email);
  }catch(error){feedback(getMessage(error),"error");}finally{resetCaptcha(form);busy(form,false);}
 });
}

 return {prepareUI:()=>{fillBirthdays();wireSelects();wireHoverHelp();},setupFlow:()=>{wireCreateAccountWizard();restoreSignupConfirmation();},validateBirthday,isExpectedConfirmedSignup,hasSignupPending:()=>!!signupPending,wireCreateAccount,watchSignupConfirmation,syncSignupCountdown};
};
})();
