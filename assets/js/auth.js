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
function vatraProfileUrl(id){
 return new URL("/VATRA/id"+String(id),location.origin).href;
}
async function goToMyProfile(){
 try{
  const {data:{user},error}=await auth.auth.getUser();
  if(error||!user)throw error||new Error("Unauthenticated");
  const {data,error:accountError}=await auth.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();
  if(accountError||!data||!Number.isSafeInteger(Number(data.vatra_id)))throw accountError||new Error("No VATRA ID");
  window.location.replace(vatraProfileUrl(data.vatra_id));
 }catch(_){
  window.location.replace(url("account.html"));
 }
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
 if(code==="weak_password"||text.includes("password should")||text.includes("password is too"))return "Пароль недостатньо надійний. Використайте довший пароль із літерами та цифрами.";
 if(code==="over_email_send_rate_limit"||code==="over_request_rate_limit"||text.includes("rate limit"))return "Забагато спроб. Спробуйте трохи пізніше.";
 if(code==="email_exists"||code==="user_already_exists")return "Акаунт із такою поштою вже може існувати. Спробуйте увійти або відновити пароль.";
 if(code==="signup_disabled")return "Реєстрацію тимчасово вимкнено в налаштуваннях сервера.";
 if(code==="otp_expired"||code==="otp_disabled")return "Посилання для підтвердження недійсне або застаріло. Запросіть нове.";
 if(code==="network_error"||text.includes("failed to fetch")||text.includes("network"))return "Немає з'єднання із сервером. Перевірте інтернет і повторіть спробу.";
 return "Не вдалося виконати дію. Перевірте введені дані та спробуйте ще раз.";
}
/* Show field-level errors in the same language and keep labels visible. */
function showFieldError(control,message){
 if(!control)return;
 const wrapper=control.closest(".field,.check-terms");
 if(!wrapper)return;
 let error=wrapper.querySelector(".field-error");
 if(message){
  if(!error){
   error=document.createElement("small");
   error.className="field-error";
   error.id="vatra-error-"+control.id;
   error.setAttribute("role","alert");
   wrapper.append(error);
  }
  error.textContent=translate(message);
  window.VATRA_LANGUAGE?.ready?.then(()=>{if(error.isConnected)error.textContent=translate(message);});
  wrapper.classList.add("is-invalid");
  control.setAttribute("aria-invalid","true");
  control.setAttribute("aria-describedby",error.id);
 }else{
  wrapper.classList.remove("is-invalid");
  control.removeAttribute("aria-invalid");
  control.removeAttribute("aria-describedby");
  error?.remove();
 }
}
function validationText(control,form){
 if(control.disabled)return "";
 const value=String(control.value||"").trim();
 if(control.type==="checkbox"){
  return control.required&&!control.checked?"Щоб продовжити, прийміть умови використання.":"";
 }
 if(!value&&control.required)return "Заповніть це поле.";
 if(!value)return "";
 if(control.type==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return "Введіть правильну електронну пошту.";
 if((control.id==="first-name"||control.id==="last-name")&&(value.length<2||value.length>60))return "Використайте від 2 до 60 символів.";
 if(control.type==="password"&&form.id!=="login-form"&&!validPassword(value))return "Пароль має містити щонайменше 8 символів.";
 if(control.id==="password-confirm"&&value!==q("#password")?.value)return "Паролі не збігаються.";
 return "";
}
/* Keep the original field caption in sync with typing, autofill, and browser back/forward. */
function wireFloatingLabels(){
 const fields=[...document.querySelectorAll(".field:has(input.control)")];
 for(const field of fields){
  const input=field.querySelector("input.control");
  if(!input)continue;
  input.removeAttribute("placeholder");
  const sync=()=>field.classList.toggle("has-value",Boolean(input.value));
  input.addEventListener("input",sync);
  input.addEventListener("change",sync);
  input.addEventListener("blur",sync);
  input.addEventListener("animationstart",sync);
  input.form?.addEventListener("reset",()=>requestAnimationFrame(sync));
  sync();
 }
 window.addEventListener("pageshow",()=>{
  for(const field of fields){
   const input=field.querySelector("input.control");
   field.classList.toggle("has-value",Boolean(input?.value));
  }
 });
}
function wireFieldValidation(){
 const form=document.querySelector("#login-form,#signup-form,#forgot-form,#reset-form");
 if(!form)return;
 form.noValidate=true;
 let attempted=false;
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
  const change=()=>{
   if(attempted||control.getAttribute("aria-invalid")==="true")check(control);
  };
  control.addEventListener("input",change);
  control.addEventListener("change",change);
  control.addEventListener("blur",()=>{
   if(control.type!=="checkbox")check(control);
  });
 }
 form.addEventListener("submit",event=>{
  attempted=true;
  let first=null;
  for(const control of controls){
   if(control.id.startsWith("birth-")&&control.id!=="birth-day")continue;
   if(!check(control)&&!first)first=control;
  }
  if(first){
   event.preventDefault();
   event.stopImmediatePropagation();
   const focus=first.closest(".vatra-select")?.querySelector(".vatra-select-trigger")||first;
   focus.focus({preventScroll:true});
   focus.scrollIntoView({behavior:"smooth",block:"center"});
  }
 },true);
}
function wirePasswordButtons(){
 document.querySelectorAll("[data-password-toggle]").forEach(button=>{
  button.addEventListener("click",()=>{
   const input=document.getElementById(button.dataset.passwordToggle);
   if(!input)return;
   const reveal=input.type==="password";
   input.type=reveal?"text":"password";
   button.textContent=translate(reveal?"Приховати":"Показати");
   button.setAttribute("aria-label",translate(reveal?"Приховати пароль":"Показати пароль"));
   button.setAttribute("aria-pressed",String(reveal));
  });
 });
}
function validPassword(value){return value.length>=8&&value.length<=128;}
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
  root.className="vatra-select";
  select.parentNode.insertBefore(root,select);
  root.append(select);
  const required=select.required;
  select.required=false; // validateBirthday() checks the original select values on submit
  select.classList.add("vatra-select-native");
  select.tabIndex=-1;
  select.setAttribute("aria-hidden","true");
  const trigger=document.createElement("button");
  trigger.type="button";
  trigger.className="control vatra-select-trigger";
  trigger.setAttribute("aria-haspopup","listbox");
  trigger.setAttribute("aria-expanded","false");
  trigger.setAttribute("aria-label",select.getAttribute("aria-label")||"");
  const display=document.createElement("span");
  trigger.append(display);
  const list=document.createElement("div");
  list.className="vatra-select-list";
  list.hidden=true;
  list.setAttribute("role","listbox");
  list.setAttribute("aria-label",select.getAttribute("aria-label")||"");
  const choices=[...select.options].filter(opt=>!opt.disabled&&(opt.value||!required));
  for(const opt of choices){
   const item=document.createElement("button");
   item.type="button";
   item.className="vatra-select-option";
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
 /* Build the interface independently of the authentication service status. */
 wirePasswordButtons();
 wireFloatingLabels();
 if(page==="register"){fillBirthdays();wireSelects();}
 wireFieldValidation();
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
   if(!error&&data?.user){await goToMyProfile();return;}
  }catch(_){/* Якщо немає зв'язку, форма входу залишається доступною. */}
 }
 if(page==="register")wireRegister();
 if(page==="forgot")wireForgot();
 if(page==="reset")wireReset();
 if(page==="account")await wireAccount();
 document.body.dataset.authReady="true";
}
function wireLogin(){
 const form=q("#login-form");
 if(!form)return;
 form.addEventListener("submit",async e=>{
  e.preventDefault();clearFeedback();
  const email=q("#email").value.trim().toLowerCase(),password=q("#password").value;
  if(!email||!password){feedback("Введіть пошту та пароль.","error");return;}
  busy(form,true);
  try{
   const {error}=await auth.auth.signInWithPassword({email,password});
   if(error)throw error;
   await goToMyProfile();
  }catch(error){feedback(getMessage(error),"error");}finally{busy(form,false);}
 });
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
  if(!validPassword(password)){feedback("Пароль має містити від 8 до 128 символів.","error");return;}
  if(password!==again){feedback("Паролі не збігаються.","error");return;}
  if(!q("#consent").checked){feedback("Для створення акаунта потрібно прийняти умови використання.","error");return;}
  busy(form,true);
  try{
   const {data,error}=await auth.auth.signUp({
    email,password,
    options:{
     emailRedirectTo:new URL("account.html",location.href).href,
     data:{first_name:first,last_name:last,full_name:first+" "+last,birthdate:birthday,gender:gender||null,preferred_locale:english?"en":"uk"}
    }
   });
   if(error)throw error;
   form.reset();
   if(data?.session){await goToMyProfile();return;}
   feedback("Перевірте електронну пошту. Ми надіслали лист для підтвердження реєстрації. Після підтвердження ви зможете увійти.","success");
  }catch(error){feedback(getMessage(error),"error");}finally{busy(form,false);}
 });
}
function wireForgot(){
 const form=q("#forgot-form");
 if(!form)return;
 form.addEventListener("submit",async e=>{
  e.preventDefault();clearFeedback();
  const email=q("#email").value.trim().toLowerCase();
  if(!email){feedback("Вкажіть вашу електронну пошту.","error");return;}
  busy(form,true);
  try{
   const {error}=await auth.auth.resetPasswordForEmail(email,{redirectTo:new URL("reset.html",location.href).href});
   if(error)throw error;
   try{sessionStorage.setItem("vatra-recovery-email",email);}catch(_){}
   feedback("Якщо акаунт із такою адресою існує, ми надіслали лист. Введіть код із листа або відкрийте посилання для відновлення.","success");
   form.reset();
   const jump=q("#recovery-link");
   if(jump){jump.hidden=false;jump.href=url("reset.html");}
  }catch(error){feedback(getMessage(error),"error");}finally{busy(form,false);}
 });
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
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){feedback("Вкажіть правильну електронну пошту.","error");emailInput.focus();return;}
  if(!/^\d{6,8}$/.test(token)){feedback("Введіть код підтвердження з листа (6–8 цифр).","error");tokenInput.focus();return;}
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
  if(!validPassword(password)){feedback("Пароль має містити від 8 до 128 символів.","error");return;}
  if(password!==again){feedback("Паролі не збігаються.","error");return;}
  busy(form,true);
  try{
   const {data:{user},error:userErr}=await auth.auth.getUser();
   if(userErr||!user){feedback("Підтвердження закінчилося. Запросіть новий код для відновлення.","error");form.hidden=true;codeForm.hidden=false;return;}
   const {error}=await auth.auth.updateUser({password});
   if(error)throw error;
   form.reset();
   feedback("Пароль оновлено. Тепер можете перейти до свого акаунта.","success");
   const link=q("#account-link");if(link)link.hidden=false;
   try{sessionStorage.removeItem("vatra-recovery-email");}catch(_){}
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
    idBox.href=vatraProfileUrl(profile.vatra_id);
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