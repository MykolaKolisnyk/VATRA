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
 for(let i=1;i<=12;i++)month.add(new Option(String(i).padStart(2,"0"),String(i).padStart(2,"0")));
 for(let i=1;i<=31;i++)day.add(new Option(String(i).padStart(2,"0"),String(i).padStart(2,"0")));
 for(let i=now.getFullYear();i>=1900;i--)year.add(new Option(String(i),String(i)));
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
 wirePasswordButtons();
 if(page==="register")fillBirthdays();
 if(page==="login"){
  wireLogin();
  /* Сесія вже зберігається в браузері. Не просимо входити повторно. */
  try{
   const {data,error}=await auth.auth.getUser();
   if(!error&&data?.user){window.location.replace(url("account.html"));return;}
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
   window.location.replace(url("account.html"));
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
     emailRedirectTo:new URL("account.html",new URL("/VATRA/",location.origin)).href,
     data:{first_name:first,last_name:last,full_name:first+" "+last,birthdate:birthday,gender:gender||null}
    }
   });
   if(error)throw error;
   form.reset();
   if(data?.session){window.location.replace(url("account.html"));return;}
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
   const {error}=await auth.auth.resetPasswordForEmail(email,{redirectTo:new URL("/VATRA/reset.html",location.origin).href});
   if(error)throw error;
   feedback("Якщо акаунт із такою адресою існує, на пошту надійде посилання для відновлення пароля.","success");
   form.reset();
  }catch(error){feedback(getMessage(error),"error");}finally{busy(form,false);}
 });
}
function wireReset(){
 const form=q("#reset-form");
 if(!form)return;
 const params=new URLSearchParams(location.search);
 const hash=new URLSearchParams(location.hash.substring(1));
 const hasRecovery=params.has("code")||params.get("type")==="recovery"||hash.get("type")==="recovery";
 if(params.get("error")||hash.get("error"))feedback("Посилання недійсне або застаріло. Запросіть нове.","error");
 if(!hasRecovery)feedback("Щоб змінити пароль, перейдіть за посиланням із листа. Якщо ви вже увійшли в акаунт, можете змінити пароль тут.");
 form.addEventListener("submit",async e=>{
  e.preventDefault();clearFeedback();
  const password=q("#password").value,again=q("#password-confirm").value;
  if(!validPassword(password)){feedback("Пароль має містити від 8 до 128 символів.","error");return;}
  if(password!==again){feedback("Паролі не збігаються.","error");return;}
  busy(form,true);
  try{
   const {data:{user},error:userErr}=await auth.auth.getUser();
   if(userErr||!user){feedback("Посилання вже недійсне. Запросіть новий лист для відновлення.","error");return;}
   const {error}=await auth.auth.updateUser({password});
   if(error)throw error;
   form.reset();
   feedback("Пароль оновлено. Тепер можете перейти до свого акаунта.","success");
   const link=q("#account-link");if(link)link.hidden=false;
  }catch(error){feedback(getMessage(error),"error");}finally{busy(form,false);}
 });
}
async function wireAccount(){
 const title=q("#account-title"),mail=q("#account-email");
 try{
  const {data:{user},error}=await auth.auth.getUser();
  if(error||!user){window.location.replace(url("auth.html"));return;}
  const name=String(user.user_metadata?.first_name||"").trim();
  title.textContent=name?(english?"Welcome, "+name+"!":"Вітаємо, "+name+"!"):translate("Вітаємо у VATRA!");
  mail.textContent=user.email||"";
 }catch(_){window.location.replace(url("auth.html"));return;}
 const logout=q("#logout");
 if(logout)logout.addEventListener("click",async()=>{
  logout.disabled=true;
  const {error}=await auth.auth.signOut({scope:"local"});
  if(error){feedback(getMessage(error),"error");logout.disabled=false;return;}
  window.location.replace(url("auth.html"));
 });
}
initialize().catch(()=>feedback("Сервіс авторизації тимчасово недоступний. Повторіть спробу пізніше.","error"));
})();