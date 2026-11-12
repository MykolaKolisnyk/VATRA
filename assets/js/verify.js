/* VATRA Email confirmation: page-specific behavior; shared utilities are in auth-core.js. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_AUTH_ENTRY=ctx=>{
 const {q,url,translate,english,auth,page,initialAccountCallback,initialAccountCallbackError,goToFeed,feedback,getMessage,rememberAccount,announceVerifiedAccount,LOGGED_OUT_KEY}=ctx;
function showAccountConfirmationFailure(){
 const title=q("#account-title"),mail=q("#account-email");
 if(title)title.textContent=english?"Email confirmation needs attention":"Підтвердження пошти не завершено";
 if(mail)mail.textContent=english
  ?"If the address is confirmed, sign in with your email and password. Otherwise request a new confirmation email on the device where you registered."
  :"Якщо пошту вже підтверджено, увійдіть за email і паролем. Інакше запросіть новий лист на пристрої реєстрації.";
 const note=q(".vt-account-paragraph-03");if(note)note.hidden=true;
 const id=q("#vatra-id");if(id)id.hidden=true;
 const logout=q("#logout");if(logout)logout.hidden=true;
 const link=q(".vt-account-link-03");
 if(link){link.textContent=english?"Go to sign in":"Перейти до входу";link.href=url("./");}
}
async function acceptEmailConfirmation(){
 const query=new URLSearchParams(location.search);
 const hash=new URLSearchParams(location.hash.slice(1));
 const token=query.get("token_hash");
 const cameFromLink=Boolean(initialAccountCallback||token||query.has("code")||query.has("error")||hash.has("error")||hash.has("access_token"));
 if(!token)return {cameFromLink,failed:initialAccountCallbackError||query.has("error")||hash.has("error")};
 history.replaceState(history.state,"",location.pathname);
 const type=query.get("type");
 // Reject arbitrary query types: only Supabase Auth's documented email actions.
 const allowed=new Set(["email","magiclink","invite","email_change"]);
 if(!allowed.has(type)||token.length>2048)return {cameFromLink:true,failed:true};
 try{
  const {data,error}=await auth.auth.verifyOtp({token_hash:token,type});
  if(error||!data?.user?.id)return {cameFromLink:true,failed:true};
  return {cameFromLink:true,failed:false};
 }catch(_){return {cameFromLink:true,failed:true};}
}


async function wireAccount(cameFromLink=false){
 const title=q("#account-title"),mail=q("#account-email");
 try{
  const {data:{user},error}=await auth.auth.getUser();
  if(error||!user||!user.email_confirmed_at){
   if(cameFromLink){showAccountConfirmationFailure();return;}
   window.location.replace(new URL("./",location.href).href);return;
  }
  rememberAccount(user);
  const name=String(user.user_metadata?.first_name||"").trim();
  title.textContent=name?(english?"Welcome, "+name+"!":"Вітаємо, "+name+"!"):translate("Вітаємо у VATRA!");
  mail.textContent=user.email||"";
  // Notify other tabs after Supabase verifies the user, then enter the network.
  if(user.email_confirmed_at)announceVerifiedAccount();
  if(page==="verify"){goToFeed();return;}
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
 }catch(_){
  if(cameFromLink)showAccountConfirmationFailure();
  else window.location.replace(new URL("./",location.href).href);
  return;
 }
 const logout=q("#logout");
 if(logout)logout.addEventListener("click",async()=>{
  logout.disabled=true;
  const {error}=await auth.auth.signOut({scope:"local"});
  if(error){feedback(getMessage(error),"error");logout.disabled=false;return;}
  try{sessionStorage.setItem(LOGGED_OUT_KEY,"1");}catch(_){}
  window.location.replace(new URL("./",location.href).href);
 });
}

 return {showAccountConfirmationFailure,acceptEmailConfirmation,wireAccount};
};
})();
