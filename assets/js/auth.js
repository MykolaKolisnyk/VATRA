/* VATRA • shared authentication. Public publishable key only; never embed server secrets. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://rjasunoawrxvetwadylh.supabase.co";
const PUBLIC_KEY="sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-";
const page=document.body.dataset.page||"login";
const translate=text=>window.VATRA_LANGUAGE?.translate(text)||text;
const english=document.documentElement.lang==="en";
const q=(selector)=>document.querySelector(selector);
const url=(filename)=>new URL(filename,document.baseURI).href;
let auth=null;
let validateRegistrationStep=()=>true;
function goToMyAccount(){
 // Until dedicated profile routes exist, show the real account page.
 window.location.replace(url("account.html"));
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
 if(code==="weak_password"||text.includes("password should")||text.includes("password is too"))return "Пароль: 12–128 символів, мала й велика латинські літери, цифра та спеціальний символ.";
 if(code==="over_email_send_rate_limit"||code==="over_request_rate_limit"||text.includes("rate limit"))return "Забагато спроб. Спробуйте трохи пізніше.";
 if(code==="email_exists"||code==="user_already_exists")return "Акаунт із такою поштою вже може існувати. Спробуйте увійти або відновити пароль.";
 if(code==="signup_disabled")return "Реєстрацію тимчасово вимкнено в налаштуваннях сервера.";
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
   const consentText=wrapper.classList.contains("check-terms")?wrapper.querySelector("span"):null;
   (consentText||wrapper).append(error);
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
 if(control.type==="password"&&form.id!=="login-form"&&!validPassword(value))return "Пароль: 12–128 символів, мала й велика латинські літери, цифра та спеціальний символ.";
 if(control.id==="password-confirm"&&value!==q("#password")?.value)return "Паролі не збігаються.";
 return "";
}
/* One floating hint per input. Native placeholder text is hidden only after
   this control is initialized, so no second label can overlap the cursor.
   Validation messages remain outside the positioned input shell. */
function wireFloatingHints(){
 if(page!=="login"&&page!=="register")return;
 const syncAll=[];
 for(const field of document.querySelectorAll("#login-form .field:has(input.control),#signup-form .field:has(input.control)")){
  const input=field.querySelector("input.control");
  const shell=input?.closest(".vatra-input-shell");
  const hint=shell?.querySelector(":scope > .vatra-floating-hint");
  if(!input||!shell||!hint)continue;
  const sync=()=>{
   const autofilled=input.matches(":-webkit-autofill");
   shell.classList.toggle("is-floating",
    document.activeElement===input||Boolean(input.value)||autofilled);
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
function wireOrbitTooltips(){
 if(page!=="login")return;
 const panel=q(".intro-side");
 if(!panel)return;
 const icons=[...panel.querySelectorAll(".orbit-icon")];
 for(const icon of icons){
  const tip=icon.querySelector(".orbit-tooltip");
  if(!tip)continue;
  const place=()=>{
   tip.classList.remove("is-below");
   tip.style.removeProperty("--tip-shift");
   tip.style.removeProperty("max-height");
   tip.style.removeProperty("overflow-y");
   const box=icon.getBoundingClientRect();
   const bounds=panel.getBoundingClientRect();
   const top=Math.max(12,bounds.top+12);
   const bottom=Math.min(window.innerHeight-12,bounds.bottom-12);
   const needed=tip.getBoundingClientRect().height;
   const above=box.top-top-13;
   const below=bottom-box.bottom-13;
   const openBelow=above<needed&&below>above;
   if(openBelow)tip.classList.add("is-below");
   const available=openBelow?below:above;
   if(available<needed){
    tip.style.maxHeight=Math.max(44,Math.floor(available))+"px";
    tip.style.overflowY="auto";
   }
   const tipWidth=tip.getBoundingClientRect().width;
   const center=box.left+box.width/2;
   const minLeft=Math.max(12,bounds.left+10);
   const maxRight=Math.min(window.innerWidth-12,bounds.right-10);
   const desired=center-tipWidth/2;
   const left=Math.min(Math.max(desired,minLeft),Math.max(minLeft,maxRight-tipWidth));
   tip.style.setProperty("--tip-shift",Math.round(left-desired)+"px");
  };
  icon.addEventListener("mouseenter",place);
  icon.addEventListener("focus",place);
  icon.addEventListener("mouseleave",()=>{
   if(!icon.matches(":focus-visible"))tip.classList.remove("is-below");
  });
  window.addEventListener("resize",()=>{
   if(icon.matches(":hover, :focus-visible"))place();
  },{passive:true});
  document.addEventListener("scroll",()=>{
   if(icon.matches(":hover, :focus-visible"))place();
  },{passive:true,capture:true});
 }
}
/* Hover/focus help is mutually exclusive and not a click-to-toggle drawer. */
function wireHoverHelp(){
 const helps=[...document.querySelectorAll(".reg-help")];
 let active=null;
 const timers=new Map();
 const dismiss=help=>{
  clearTimeout(timers.get(help));
  timers.delete(help);
  help.open=false;
  help.removeAttribute("data-side");
  const panel=help.querySelector(".reg-help-panel");
  if(panel){panel.style.top="";panel.style.bottom="";}
  if(active===help)active=null;
 };
 const reveal=help=>{
  for(const other of helps)if(other!==help&&other.open)dismiss(other);
  clearTimeout(timers.get(help));
  timers.delete(help);
  help.open=true;active=help;
  const summary=help.querySelector("summary");
  const panel=help.querySelector(".reg-help-panel");
  if(!summary||!panel)return;
  const rect=summary.getBoundingClientRect();
  const availableRight=window.innerWidth-rect.right;
  const availableLeft=rect.left;
  const side=availableRight>=355?"right":availableLeft>=355?"left":"below";
  help.dataset.side=side;
  panel.style.top="";panel.style.bottom="";
  // Keep the complete help bubble within the visible viewport.
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
   // Touch devices have no hover: retaining tap access keeps the hint usable.
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
   if(control.closest("[data-register-step]")?.hidden)continue;
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
 if(page==="register")validateRegistrationStep=validateScope;
 form.addEventListener("submit",event=>{
  if(page==="register"&&document.body.dataset.registrationStep==="1"){
   event.preventDefault();
   event.stopImmediatePropagation();
   q("#register-next")?.click();
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
function wireRegistrationWizard(){
 const form=q("#signup-form"),first=q('[data-register-step="1"]'),second=q('[data-register-step="2"]');
 const next=q("#register-next"),back=q("#register-back"),progress=q(".signup-progress");
 if(!form||!first||!second||!next||!back||!progress)return;
 function show(step){
  document.body.dataset.registrationStep=String(step);
  first.hidden=step!==1;
  second.hidden=step!==2;
  for(const header of document.querySelectorAll("[data-step-heading]"))
   header.hidden=Number(header.dataset.stepHeading)!==step;
  for(const label of document.querySelectorAll("[data-step-label]"))
   label.hidden=Number(label.dataset.stepLabel)!==step;
  progress.setAttribute("aria-valuenow",String(step));
  // Previous input values and any inline errors are retained when going back.
 }
 next.addEventListener("click",()=>{
  if(!validateRegistrationStep(first))return;
  show(2);
  q("#email")?.focus({preventScroll:true});
 });
 back.addEventListener("click",()=>{
  show(1);
  q("#first-name")?.focus({preventScroll:true});
 });
 form.addEventListener("reset",()=>show(1));
 show(1);
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
function validPassword(value){
 return typeof value==="string"&&value.length>=12&&value.length<=128
  &&/[a-z]/.test(value)&&/[A-Z]/.test(value)&&/[0-9]/.test(value)
  &&/[!@#$%^&*()_+\-=\[\]{};'\\:"|<>?,.\/\x60~]/.test(value);
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
 const names=new Intl.DateTimeFormat(english?"en-US":"uk-UA",{month:"long"});
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
  const {trigger,list,root}=opened;
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
  trigger.className="control vatra-select-trigger vt-select-trigger-"+select.id;
  trigger.setAttribute("aria-haspopup","listbox");
  trigger.setAttribute("aria-expanded","false");
  trigger.setAttribute("aria-label",select.getAttribute("aria-label")||"");
  const display=document.createElement("span");
  display.className="vt-select-display-"+select.id;
  trigger.append(display);
  const list=document.createElement("div");
  list.className="vatra-select-list ui-select-options-"+select.id;
  list.hidden=true;
  list.setAttribute("role","listbox");
  list.setAttribute("aria-label",select.getAttribute("aria-label")||"");
  const choices=[...select.options].filter(opt=>!opt.disabled&&(opt.value||!required));
  for(const [optionIndex,opt] of choices.entries()){
   const item=document.createElement("button");
   item.type="button";
   item.className="vatra-select-option vt-select-"+select.id+"-item-"+(optionIndex+1);
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
   list.append(item);
  }
  root.append(trigger,list);
  // The visible registration caption also opens the custom gender selector.
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
   for(const item of list.children){
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
   opened={trigger,list,root,select,choices};
   const active=list.querySelector('[aria-selected="true"]');
   if(active)active.scrollIntoView({block:"nearest"});
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
     list.children[index]?.scrollIntoView({block:"nearest"});
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
async function initialize(){
 wireOrbitTooltips();
 /* Initial language translations must finish before wiring localized controls. */
 await window.VATRA_LANGUAGE?.ready;
 /* Build the interface independently of the authentication service status. */
 wirePasswordButtons();
 wireFloatingHints();
 if(page==="register"){fillBirthdays();wireSelects();wireHoverHelp();}
 wireFieldValidation();
 if(page==="register"){wireRegistrationWizard();restoreSignupConfirmation();}
 if(!window.supabase?.createClient){
  feedback("Не вдалося завантажити модуль входу. Перевірте з'єднання та оновіть сторінку.","error");
  return;
 }
 try{
  auth=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
   auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true,flowType:"pkce"}
  });
 }catch(_){
  feedback("Не вдалося підключитися до сервісу авторизації.","error");return;
 }
 if(page==="login"){
  wireLogin();
  /* Сесія вже зберігається в браузері. Не просимо входити повторно. */
  try{
   const {data,error}=await auth.auth.getUser();
   if(!error&&data?.user){await goToMyAccount();return;}
  }catch(_){/* Якщо немає зв'язку, форма входу залишається доступною. */}
 }
 if(page==="register")wireRegister();
 if(page==="forgot")wireForgot();
 if(page==="reset")wireReset();
 if(page==="account"){
  try{sessionStorage.removeItem(SIGNUP_PENDING_KEY);}catch(_){}
  await wireAccount();
 }
 document.body.dataset.authReady="true";
}
async function captchaOptions(scope){
 if(!window.VATRA_CAPTCHA?.enabled)return {};
 const token=await window.VATRA_CAPTCHA.token(scope);
 if(!token){const error=new Error("captcha_required");error.code="captcha_required";throw error;}
 return {captchaToken:token};
}
function resetCaptcha(scope){window.VATRA_CAPTCHA?.reset(scope);}
function wireLogin(){
 const form=q("#login-form");
 if(!form)return;
 form.addEventListener("submit",async e=>{
  e.preventDefault();clearFeedback();
  const email=q("#email").value.trim().toLowerCase(),password=q("#password").value;
  if(!email||!password){feedback("Введіть пошту та пароль.","error");return;}
  busy(form,true);
  try{
   const options=await captchaOptions(form);
   const {error}=await auth.auth.signInWithPassword({email,password,options});
   if(error)throw error;
   await goToMyAccount();
  }catch(error){feedback(getMessage(error),"error");}finally{resetCaptcha(form);busy(form,false);}
 });
}
const SIGNUP_PENDING_KEY="vatra-signup-confirmation";
function maskSignupEmail(email){
 const parts=email.split("@");
 if(parts.length!==2)return "";
 const name=parts[0];
 return (name.length>2?name.slice(0,2):name.slice(0,1))+"•••@"+parts[1];
}
function showSignupConfirmation(address){
 const screen=q("#signup-confirmation");
 const formPane=q(".signup-form-panel .narrow-form");
 if(!screen||!formPane)return;
 formPane.hidden=true;
 screen.hidden=false;
 const target=q("#signup-confirmation-address");
 const row=q(".signup-confirmation-address-row");
 if(target&&row){target.textContent=address||"";row.hidden=!address;}
 document.body.dataset.signupConfirmation="pending";
 screen.scrollIntoView({block:"nearest",behavior:"smooth"});
}
function restoreSignupConfirmation(){
 q("#signup-confirmation-restart")?.addEventListener("click",()=>{
  try{sessionStorage.removeItem(SIGNUP_PENDING_KEY);}catch(_){}
 });
 try{
  const pending=JSON.parse(sessionStorage.getItem(SIGNUP_PENDING_KEY)||"null");
  if(pending&&typeof pending.address==="string"&&Number.isFinite(pending.sentAt)
   &&pending.sentAt<=Date.now()&&Date.now()-pending.sentAt<86400000){
   showSignupConfirmation(pending.address);
  }else sessionStorage.removeItem(SIGNUP_PENDING_KEY);
 }catch(_){}
}
function markSignupPending(email){
 const address=maskSignupEmail(email),sentAt=Date.now();
 try{sessionStorage.setItem(SIGNUP_PENDING_KEY,JSON.stringify({address,sentAt}));}catch(_){}
 showSignupConfirmation(address);
}
function wireRegister(){
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
  if(!validPassword(password)){feedback("Пароль: 12–128 символів, мала й велика латинські літери, цифра та спеціальний символ.","error");return;}
  if(password!==again){feedback("Паролі не збігаються.","error");return;}
  if(!q("#consent").checked){feedback("Для створення акаунта потрібно прийняти умови використання.","error");return;}
  busy(form,true);
  try{
   const captcha=await captchaOptions(form);
   const {data,error}=await auth.auth.signUp({
    email,password,
    options:{
     ...captcha,
     emailRedirectTo:new URL("account.html",location.href).href,
     data:{first_name:first,last_name:last,full_name:first+" "+last,birthdate:birthday,gender:gender||null,preferred_locale:english?"en":"uk"}
    }
   });
   if(error)throw error;
   form.reset();
   if(data?.session){await goToMyAccount();return;}
   markSignupPending(email);
  }catch(error){feedback(getMessage(error),"error");}finally{resetCaptcha(form);busy(form,false);}
 });
}
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
  q("#recovery-code-form").hidden=false;
  q("#reset-form").hidden=true;
  q("#recovery-tools").hidden=false;
  q("#recovery-step .recovery-step-caption").hidden=false;
  startCooldown(sentAt);
  codeField.focus({preventScroll:true});
  step.scrollIntoView({behavior:"smooth",block:"nearest"});
 };
 const editEmail=()=>{
  form.hidden=false;step.hidden=true;hideEmailNotes(false);
  clearFeedback();
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
    redirectTo:new URL("reset.html",location.href).href,
    ...captcha
   });
   if(error)throw error;
   const sentAt=Date.now();
   try{
    sessionStorage.setItem("vatra-recovery-email",email);
    sessionStorage.setItem("vatra-recovery-pending",JSON.stringify({email,sentAt}));
   }catch(_){}
   feedback(repeat?
    "Якщо акаунт існує, новий код надіслано. Використайте код з останнього листа.":
    "Якщо акаунт із такою адресою існує, лист із кодом надіслано. Введіть код нижче.","success");
   if(repeat)codeField.value="";
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
 const openedLink=params.has("code")||params.get("type")==="recovery"||hash.get("type")==="recovery"||hash.has("access_token");
 const emailInput=q("#recovery-email");
 const tokenInput=q("#recovery-token");
 try{emailInput.value=sessionStorage.getItem("vatra-recovery-email")||"";}catch(_){}
 const reveal=()=>{
  codeForm.hidden=true;
  form.hidden=false;
  const tools=q("#recovery-tools");if(tools)tools.hidden=true;
  const caption=q("#recovery-step .recovery-step-caption");if(caption)caption.hidden=true;
  const heading=q("#recovery-step-heading");if(heading)heading.textContent=english?"Set a new password":"Встановіть новий пароль";
  clearFeedback();
  q("#password")?.focus({preventScroll:true});
 };
 if(params.get("error")||hash.get("error")){
  feedback("Посилання недійсне або застаріло. Запросіть нове.","error");
 }
 if(openedLink){
  /* Supabase PKCE/hash callback may settle after client initialization. */
  auth.auth.onAuthStateChange((event,session)=>{
   if(event==="PASSWORD_RECOVERY"&&session)reveal();
  });
  auth.auth.getUser().then(({data,error})=>{
   if(!error&&data?.user)reveal();
  }).catch(()=>{});
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
   if(error||!data?.session)throw error||new Error("Verification failed");
   tokenInput.value="";
   reveal();
  }catch(_){feedback("Неправильний або прострочений код. Перевірте лист або запросіть новий.","error");}
  finally{busy(codeForm,false);}
 });
 form.addEventListener("submit",async e=>{
  e.preventDefault();clearFeedback();
  const password=q("#password").value,again=q("#password-confirm").value;
  if(!validPassword(password)){feedback("Пароль: 12–128 символів, мала й велика латинські літери, цифра та спеціальний символ.","error");return;}
  if(password!==again){feedback("Паролі не збігаються.","error");return;}
  busy(form,true);
  try{
   const {data:{user},error:userErr}=await auth.auth.getUser();
   if(userErr||!user){feedback("Підтвердження закінчилося. Запросіть новий код для відновлення.","error");form.hidden=true;codeForm.hidden=false;return;}
   const {error}=await auth.auth.updateUser({password});
   if(error)throw error;
   form.reset();
   form.hidden=true;
   feedback("Пароль оновлено. Тепер можете перейти до свого акаунта.","success");
   const link=q("#account-link");if(link)link.hidden=false;
   const parent=q("#recovery-success-link");if(parent)parent.hidden=false;
   try{
    sessionStorage.removeItem("vatra-recovery-email");
    sessionStorage.removeItem("vatra-recovery-pending");
   }catch(_){}
  }catch(error){feedback(getMessage(error),"error");}finally{busy(form,false);}
 });
}
async function wireAccount(){
 const title=q("#account-title"),mail=q("#account-email");
 try{
  const {data:{user},error}=await auth.auth.getUser();
  if(error||!user){window.location.replace(new URL("./",location.href).href);return;}
  const name=String(user.user_metadata?.first_name||"").trim();
  title.textContent=name?(english?"Welcome, "+name+"!":"Вітаємо, "+name+"!"):translate("Вітаємо у VATRA!");
  mail.textContent=user.email||"";
  /* VATRA ID — permanent sequential public number, assigned only by the database. */
  const idBox=q("#vatra-id");
  if(idBox){
   const {data:profile,error:profileError}=await auth
    .from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();
   if(!profileError&&profile&&Number.isSafeInteger(Number(profile.vatra_id))){
    idBox.textContent="VATRA ID "+String(profile.vatra_id);
    idBox.hidden=false;
   }else{
    idBox.hidden=true;
   }
  }
 }catch(_){window.location.replace(new URL("./",location.href).href);return;}
 const logout=q("#logout");
 if(logout)logout.addEventListener("click",async()=>{
  logout.disabled=true;
  const {error}=await auth.auth.signOut({scope:"local"});
  if(error){feedback(getMessage(error),"error");logout.disabled=false;return;}
  window.location.replace(new URL("./",location.href).href);
 });
}
initialize().catch(()=>feedback("Сервіс авторизації тимчасово недоступний. Повторіть спробу пізніше.","error"));
})();