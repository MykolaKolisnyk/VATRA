import { supabase } from './supabase-client.js';
const $=s=>document.querySelector(s);
let mode='login',submitting=false;\n$('#birthday').max=new Date().toISOString().slice(0,10);
function show(next){
  mode=next;const reg=mode==='register',reset=mode==='reset';
  $('#loginTab').classList.toggle('selected',mode==='login');$('#registerTab').classList.toggle('selected',reg);
  $('#firstNameWrap').hidden=!reg;$('#lastNameWrap').hidden=!reg;$('#birthdayWrap').hidden=!reg;$('#confirmWrap').hidden=!reg;
  $('#birthday').required=reg;$('#password').hidden=reset;$('#password').required=!reset;$('#confirm').required=reg;
  $('#forgot').hidden=reg||reset;$('#bottom').hidden=reset;
  $('#eyebrow').textContent=reg?'ТВОЯ ІСТОРІЯ ПОЧИНАЄТЬСЯ ТУТ':reset?'ВІДНОВЛЕННЯ ДОСТУПУ':'РАДІ БАЧИТИ ЗНОВУ';
  $('#title').textContent=reg?'Створи акаунт ВАТРИ':reset?'Віднови пароль':'З поверненням до ВАТРИ';
  $('#desc').textContent=reg?'Створи профіль, щоб ділитися новинами та знаходити друзів.':reset?'Вкажи пошту, і ми надішлемо посилання для відновлення.':'Увійди, щоб бачити новини друзів і спільнот, на які підписаний.';
  $('#submit').textContent=reg?'Створити акаунт':reset?'Надіслати посилання':'Увійти';
  $('#bottom').innerHTML=reg?'Вже маєш акаунт? <button id="switch" type="button">Увійти</button>':'Ще немає акаунта? <button id="switch" type="button">Зареєструватися</button>';
  const sw=$('#switch');if(sw)sw.onclick=()=>show(reg?'login':'register');
  $('#error').textContent='';$('#error').classList.remove('success');
}
$('#loginTab').onclick=()=>show('login');$('#registerTab').onclick=()=>show('register');$('#forgot').onclick=()=>show('reset');
$('#showPassword').onclick=()=>{const p=$('#password');p.type=p.type==='password'?'text':'password';$('#showPassword').textContent=p.type==='password'?'Показати':'Сховати';};
supabase.auth.onAuthStateChange((_event,session)=>{if(session&&!submitting)location.replace('index.html');});
$('#authForm').addEventListener('submit',async e=>{
  e.preventDefault();if(submitting)return;
  const btn=$('#submit'),email=$('#email').value.trim().toLowerCase(),password=$('#password').value,dob=$('#birthday').value;
  $('#error').textContent='';
  if(!$('#email').validity.valid){$('#error').textContent='Введи коректну адресу електронної пошти.';return;}
  if(mode==='register'){
    const first=$('#firstName').value.trim(),last=$('#lastName').value.trim();
    if(first.length<2||last.length<2){$('#error').textContent='Вкажи ім’я та прізвище (не менше 2 символів кожне).';return;}
    if(!dob){$('#error').textContent='Вкажи дату народження.';return;}
    const birthDate=new Date(dob+'T00:00:00'),today=new Date();let age=today.getFullYear()-birthDate.getFullYear();if(today.getMonth()<birthDate.getMonth()||(today.getMonth()===birthDate.getMonth()&&today.getDate()<birthDate.getDate()))age--;
    if(Number.isNaN(birthDate.getTime())||birthDate>today||age<13){$('#error').textContent='ВАТРА доступна з 13 років. Перевір дату народження.';return;}
    if(password.length<10||!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password)){$('#error').textContent='Пароль має містити щонайменше 10 символів, велику й малу латинські літери та цифру.';return;}
    if(password!==$('#confirm').value){$('#error').textContent='Паролі не збігаються.';return;}
  }
  const old=btn.textContent;btn.disabled=true;submitting=true;btn.textContent='Зачекай…';
  try{
    let result;
    if(mode==='reset'){result=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/auth.html'});}
    else if(mode==='register'){
      const first=$('#firstName').value.trim(),last=$('#lastName').value.trim();
      const username=(first+'.'+last).toLocaleLowerCase('uk-UA').replace(/[^\p{L}\p{N}]+/gu,'.').replace(/^\.|\.$/g,'').slice(0,24);
      result=await supabase.auth.signUp({email,password,options:{data:{first_name:first,last_name:last,username,date_of_birth:dob}}});
    }else result=await supabase.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    if(mode==='reset'){$('#error').textContent='Якщо акаунт із цією адресою існує, лист для відновлення надіслано.';$('#error').classList.add('success');return;}
    if(mode==='register'&&!result.data.session){$('#error').textContent='Перевір пошту та підтверди реєстрацію. Після цього увійди у ВАТРУ.';$('#error').classList.add('success');return;}
    location.replace('index.html');
  }catch(err){$('#error').textContent=err.message||'Не вдалося виконати дію. Перевір інтернет і налаштування Supabase.';}
  finally{submitting=false;btn.disabled=false;btn.textContent=old;}
});
show('login');
