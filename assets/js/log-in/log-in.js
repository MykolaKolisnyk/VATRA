(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_AUTH_ENTRY=ctx=>{
 const {q,url,translate,page,auth,replayAuthContent,busy,getMessage,captchaOptions,resetCaptcha,rememberAccount,goToFeed,clearFeedback,feedback,REMEMBERED_ACCOUNT_KEY,LOGGED_OUT_KEY}=ctx;
function readRememberedAccount(){
 try{
  const item=JSON.parse(localStorage.getItem(REMEMBERED_ACCOUNT_KEY)||"null");
  if(item?.v!==1||typeof item.email!=="string"||
   !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)||item.email.length>254||
   typeof item.name!=="string"||item.name.length>120)return null;
  return item;
 }catch(_){return null;}
}

function clearLoginFields(){
 const form=q("#login-form");if(!form)return;
 form.reset();
 for(const input of form.querySelectorAll("input")){
  input.value="";
  input.dispatchEvent(new Event("input",{bubbles:true}));
 }
}

async function authenticatePassword(email,password,form){
 const options=await captchaOptions(form);
 const {data,error}=await auth.auth.signInWithPassword({email,password,options});
 if(error)throw error;
 if(!data?.session||!data?.user?.email_confirmed_at){
  const confirmationError=new Error("Email not confirmed");
  confirmationError.code="email_not_confirmed";
  throw confirmationError;
 }
 rememberAccount(data.user);
 goToFeed();
}


function wireSavedAccountTooltip(button){
 if(!button)return;
 const tip=document.createElement("span");
 tip.id="vatra-saved-account-tooltip";
 tip.className="vatra-saved-tooltip vatra-home-saved-tooltip-001";
 tip.setAttribute("role","tooltip");
 tip.hidden=true;
 document.body.append(tip);
 let suppressRestore=false;
 const hide=()=>{tip.classList.remove("is-visible");tip.hidden=true;};


 const suppress=()=>{suppressRestore=true;hide();};
 const position=()=>{
  if(tip.hidden)return;
  const buttonBox=button.getBoundingClientRect();
  const view=window.visualViewport;
  const leftBound=(view?.offsetLeft||0)+12;
  const topBound=(view?.offsetTop||0)+12;
  const rightBound=(view?.offsetLeft||0)+(view?.width||innerWidth)-12;
  const bottomBound=(view?.offsetTop||0)+(view?.height||innerHeight)-12;
  if(buttonBox.bottom<topBound||buttonBox.top>bottomBound){hide();return;}
  const width=tip.offsetWidth,height=tip.offsetHeight;
  const left=Math.max(leftBound,Math.min(buttonBox.left+buttonBox.width/2-width/2,rightBound-width));
  const below=buttonBox.bottom+10;
  const above=buttonBox.top-height-10;
  const top=below+height<=bottomBound?below:above>=topBound?above:
   Math.max(topBound,Math.min(below,bottomBound-height));
  tip.style.left=Math.round(left)+"px";
  tip.style.top=Math.round(top)+"px";
 };
 const reveal=event=>{
  if(suppressRestore||event?.pointerType==="touch"||
   document.querySelector("#saved-account-remove-dialog")?.open)return;
  tip.textContent=button.getAttribute("data-vatra-tooltip")||button.getAttribute("aria-label")||"";
  if(!tip.textContent)return;
  tip.hidden=false;
  position();
  requestAnimationFrame(()=>{if(!tip.hidden)tip.classList.add("is-visible");});
 };
 button.addEventListener("pointerenter",reveal);
 button.addEventListener("pointermove",event=>{

  if(suppressRestore&&event.isTrusted&&event.pointerType!=="touch"&&
   (event.movementX||event.movementY)){
   suppressRestore=false;
   reveal(event);
  }
 });
 button.addEventListener("pointerleave",hide);
 button.addEventListener("focus",event=>{
  if(button.matches(":focus-visible"))reveal(event);
 });
 button.addEventListener("blur",()=>{
  hide();
  if(!document.querySelector("#saved-account-remove-dialog")?.open)
   suppressRestore=false;
 });
 button.addEventListener("click",suppress);
 window.addEventListener("resize",position,{passive:true});
 window.addEventListener("scroll",position,{passive:true,capture:true});
 document.addEventListener("scroll",position,{passive:true,capture:true});
 window.visualViewport?.addEventListener("resize",position,{passive:true});
 window.visualViewport?.addEventListener("scroll",position,{passive:true});
 document.addEventListener("keydown",event=>{if(event.key==="Escape")hide();});
 return {suppress,hide};
}
function wireRememberedAccount(){
 const remembered=readRememberedAccount();
 const panel=q("#saved-account-panel"),standard=q("#standard-login-panel"),back=q("#saved-switch-back");
 const overview=q("#saved-account-overview"),savedForm=q("#saved-login-form"),content=q("#saved-account-content");
 const returnButton=q("#saved-account-return");
 if(!panel||!standard||!back||!overview||!savedForm||!content||!returnButton)return;
 let signedOut=false;
 try{signedOut=sessionStorage.getItem(LOGGED_OUT_KEY)==="1";sessionStorage.removeItem(LOGGED_OUT_KEY);}catch(_){}
 if(signedOut)clearLoginFields();
 if(!remembered)return;
 const name=q("#saved-account-title"),email=q("#saved-account-email"),initials=q("#saved-account-initials");
 name.textContent=remembered.name;email.textContent=remembered.email;
 const removeButton=q("#saved-account-remove");
 let removeTooltip=null;
 if(removeButton){
  const label=translate("Вилучити збережений акаунт");
  removeButton.setAttribute("aria-label",label);
  removeButton.setAttribute("data-vatra-tooltip",label);
  removeTooltip=wireSavedAccountTooltip(removeButton);
 }
 const parts=remembered.name.split(/\s+/).filter(Boolean);
 initials.textContent=parts.length>1?(parts[0][0]+parts[parts.length-1][0]).toLocaleUpperCase():remembered.name.slice(0,1).toLocaleUpperCase();
 window.VATRA_AVATAR?.applyRemembered(q(".saved-account-avatar"),remembered.email);
 const password=q("#saved-password");
 const clearSaved=()=>{
  savedForm.reset();password.value="";password.dispatchEvent(new Event("input",{bubbles:true}));
 };

 const revealSavedContents=()=>{
  content.classList.remove("is-revealing");
  void content.offsetWidth;
  content.classList.add("is-revealing");
 };
 const showSaved=()=>{
  clearSaved();savedForm.hidden=true;overview.hidden=false;returnButton.hidden=true;
  standard.hidden=true;back.hidden=true;panel.hidden=false;
  document.body.dataset.savedLogin="overview";
  revealSavedContents();
 };
 const showOther=()=>{
  clearSaved();clearLoginFields();
  standard.hidden=false;panel.hidden=true;back.hidden=false;
  document.body.dataset.savedLogin="other";
  q("#email")?.focus({preventScroll:true});
 };
 q("#saved-account-continue")?.addEventListener("click",()=>{
  overview.hidden=true;savedForm.hidden=false;returnButton.hidden=false;
  document.body.dataset.savedLogin="password";
  revealSavedContents();
  password.focus({preventScroll:true});
 });
 q("#saved-account-return")?.addEventListener("click",showSaved);
 q("#saved-account-other")?.addEventListener("click",showOther);
 back.addEventListener("click",showSaved);
 const dialog=q("#saved-account-remove-dialog");
 removeButton?.addEventListener("click",()=>{
  removeTooltip?.suppress();
  dialog?.showModal?.();
 });

 dialog?.addEventListener("close",()=>removeTooltip?.suppress());
 q("#saved-remove-cancel")?.addEventListener("click",()=>{
  removeTooltip?.suppress();
  dialog?.close();
 });
 q("#saved-remove-confirm")?.addEventListener("click",()=>{
  try{localStorage.removeItem(REMEMBERED_ACCOUNT_KEY);}catch(_){}
  dialog?.close();clearSaved();clearLoginFields();
  back.hidden=true;panel.hidden=true;standard.hidden=false;
  delete document.body.dataset.savedLogin;
  q("#email")?.focus({preventScroll:true});
 });
 savedForm.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!password.value){feedback("Введіть пароль.","error");return;}
  busy(savedForm,true);
  try{await authenticatePassword(remembered.email,password.value,savedForm);}
  catch(error){
   const code=String(error?.code||"");
   const detail=String(error?.message||"").toLowerCase();
   const invalidPassword=code==="invalid_credentials"||detail.includes("invalid login credentials");
   feedback(invalidPassword?"Не вдалося увійти. Перевірте пароль.":getMessage(error),"error");
  }
  finally{resetCaptcha(savedForm);busy(savedForm,false);}
 });
 showSaved();
}
function wireLogin(){
 const form=q("#login-form");
 if(!form)return;

 window.addEventListener("pagehide",()=>{
  for(const id of ["#password","#saved-password"]){
   const input=q(id);if(input)input.value="";
  }
 },{once:true});
 form.addEventListener("submit",async e=>{
  e.preventDefault();clearFeedback();
  const email=q("#email").value.trim().toLowerCase(),password=q("#password").value;
  if(!email||!password){feedback("Введіть пошту та пароль.","error");return;}
  busy(form,true);
  try{
   await authenticatePassword(email,password,form);
  }catch(error){feedback(getMessage(error),"error");}finally{resetCaptcha(form);busy(form,false);}
 });
}

 return {wireLogin,wireRememberedAccount};
};
})();
