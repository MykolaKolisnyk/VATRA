(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_SECTION_CORE?.start(async ({root,locale,t,$,make,link,btn,valid,title,subtitle,action,content,notice,client,user,ownId,message,empty,card,field,submit,confirmRemove,tabs,dialog,nameOf,sectionIcon,sectionIconButton,discoveryIcons})=>{
let renderTicket=0;
const idPaths={
 shield:"M12 3 20 6v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3Zm-4 9 3 3 5-6",
 mail:"M3 6h18v12H3zM3 7l9 6 9-6",
 back:"M19 12H5m7-7-7 7 7 7",
 next:"m9 6 6 6-6 6",
 copy:"M8 8h12v12H8zM16 8V4H4v12h4",
 clock:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2",
 devices:"M3 4h14v12H3zM10 16v4m-4 0h8m5-9h3v10h-5v-5",
 ban:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM5 5l14 14",
 restore:"M3 10a9 9 0 1 1 2 8M3 4v6h6",
 calendar:"M4 6h16v15H4zM4 10h16M8 3v5m8-5v5"
};
function idIcon(key){
 if(!idPaths[key])return sectionIcon(key);
 const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg"),path=document.createElementNS(ns,"path");
 for(const [k,v] of Object.entries({class:"ui-vatra-id-icon-"+key,viewBox:"0 0 24 24",width:"24",height:"24",fill:"none",stroke:"currentColor","stroke-width":"1.8","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"}))svg.setAttribute(k,v);
 path.setAttribute("class","ui-vatra-id-icon-path-"+key);path.setAttribute("d",idPaths[key]);svg.append(path);return svg;
}
const idSymbol=key=>{const el=make("span","ui-vatra-id-action-symbol-001");el.append(idIcon(key));return el;};
function idAction(label,description,key,handler){
 const b=btn("","vatra-id-action-row-001",handler),copy=make("span","ui-vatra-id-action-copy-001");
 copy.append(make("strong","vatra-id-action-label-001",label));if(description)copy.append(make("span","vatra-id-action-description-001",description));
 b.append(idSymbol(key),copy,idIcon("next"));return b;
}

function sessionDevice(agent){
 const a=String(agent||"");
 const browser=/OPR\/|Opera/i.test(a)?"Opera":/Edg(?:A|iOS)?\//i.test(a)?"Edge":/Firefox\/|FxiOS\//i.test(a)?"Firefox":/Chrome\/|CriOS\//i.test(a)?"Chrome":/Safari\//i.test(a)?"Safari":t("Браузер або застосунок","Browser or app");
 const os=/Windows/i.test(a)?"Windows":/Android/i.test(a)?"Android":/iPhone|iPad|iPod/i.test(a)?"iOS / iPadOS":/Macintosh|Mac OS/i.test(a)?"macOS":/Linux/i.test(a)?"Linux":"";
 return browser+(os?" · "+os:"");
}
async function renderDevices(panel){
 const c=card("ui-vatra-id-devices-001"),head=make("div","ui-vatra-id-devices-head-001"),list=make("div","ui-vatra-id-device-list-001");
 head.append(make("h2","vatra-id-device-heading-001",t("Пристрої та сеанси","Devices and sessions")));
 const refresh=btn(t("Оновити","Refresh"),"vatra-id-device-refresh-001",()=>void load());
 head.append(refresh);c.append(head,list);
 const logout=btn(t("Завершити всі інші сеанси","Sign out all other sessions"),"vatra-id-device-revoke-001",async()=>{
  if(logout.disabled)return;logout.disabled=true;
  try{
   if(!await confirmRemove(t("Завершити інші сеанси?","Sign out other sessions?"),t("На інших пристроях потрібно буде увійти повторно. Поточний сеанс залишиться.","Other devices will need to sign in again. Your current session stays active."),t("Завершити","Sign out")))return;
   const {error}=await client.auth.signOut({scope:"others"});if(error)throw error;
   message(t("Інші сеанси завершено. Доступ на них остаточно припиниться після спливу чинних токенів.","Other sessions revoked. Their current access tokens remain valid until expiry."));
   await load();
  }catch(_){message(t("Не вдалося завершити інші сеанси.","Could not revoke other sessions."),true);}finally{logout.disabled=false;}
 });
 c.append(logout);panel.append(c);
 async function load(){
  if(refresh.disabled)return;refresh.disabled=true;refresh.setAttribute("aria-busy","true");list.setAttribute("aria-busy","true");
  try{
   await window.VATRA_REGISTER_BROWSER_SESSION?.(client,ownId);
   let {data,error}=await client.rpc("vatra_my_sessions_v3");
   if(error?.code==="PGRST202"||error?.code==="42883")({data,error}=await client.rpc("vatra_my_sessions_v2"));
   if(error?.code==="PGRST202"||error?.code==="42883")({data,error}=await client.rpc("vatra_my_sessions"));
   if(error)throw error;if(!c.isConnected)return;
   list.replaceChildren();
   const date=value=>{const d=new Date(value);return value&&Number.isFinite(d.getTime())?new Intl.DateTimeFormat(locale==="en"?"en-GB":"uk-UA",{dateStyle:"medium",timeStyle:"short"}).format(d):"—";};
   for(const [index,entry] of (data||[]).entries()){
    const row=make("div","ui-vatra-id-device-row-001"),symbol=make("span","ui-vatra-id-device-symbol-001"),ns="http://www.w3.org/2000/svg",icon=document.createElementNS(ns,"svg"),path=document.createElementNS(ns,"path");
    icon.setAttribute("class","ui-vatra-id-device-icon-001");icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("width","25");icon.setAttribute("height","25");icon.setAttribute("fill","none");icon.setAttribute("stroke","currentColor");icon.setAttribute("stroke-width","1.7");icon.setAttribute("stroke-linecap","round");icon.setAttribute("stroke-linejoin","round");icon.setAttribute("aria-hidden","true");
    path.setAttribute("class","ui-vatra-id-device-path-"+index);path.setAttribute("d",/Android|iPhone|iPad/i.test(entry.browser_agent||"")?"M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 15h2":"M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm7 14v3m-4 0h8");
    icon.append(path);symbol.append(icon);
    const details=make("div","ui-vatra-id-device-details-001");details.append(make("strong","vatra-id-device-name-001",sessionDevice(entry.browser_agent)),make("span","vatra-id-device-time-001",t("Вхід: ","Signed in: ")+date(entry.signed_in_at)));
    const activity=entry.refreshed_at&&Date.parse(entry.refreshed_at)>Date.parse(entry.signed_in_at)?entry.refreshed_at:entry.signed_in_at;
    details.append(make("span","vatra-id-device-activity-001",t("Остання активність: ","Last activity: ")+date(activity)));
    row.append(symbol,details);
    if(entry.current_session)row.append(make("span","vatra-id-device-current-001",t("Поточний","Current")));
    else if(typeof entry.session_id==="string"&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(entry.session_id)){
     const revoke=btn(t("Завершити сеанс","Sign out session"),"vatra-id-device-single-revoke-001",async()=>{
      if(revoke.disabled||!c.isConnected)return;revoke.disabled=true;
      try{
       if(!await confirmRemove(t("Завершити цей сеанс?","Sign out this session?"),t("На цьому пристрої потрібно буде увійти повторно.","You will need to sign in again on this device."),t("Завершити сеанс","Sign out session")))return;
       if(!c.isConnected)return;
       const result=Number.isInteger(entry.session_count)?await client.rpc("vatra_revoke_browser_sessions",{target_session:entry.session_id}):await client.rpc("vatra_revoke_session",{target_session:entry.session_id});
       if(result.error||result.data!==true)throw result.error||Error("Session was not revoked");
       if(c.isConnected){await load();message(t("Сеанс завершено. Доступ остаточно припиниться після спливу чинного токена.","Session revoked. Access ends when the existing token expires."));}
      }catch(_){if(c.isConnected)message(t("Не вдалося завершити сеанс.","Could not revoke session."),true);}
      finally{revoke.disabled=false;}
     });
     revoke.setAttribute("aria-label",t("Завершити сеанс","Sign out session")+" · "+sessionDevice(entry.browser_agent));row.append(revoke);
    }
    list.append(row);
   }
   if(!data?.length)list.append(empty(t("Немає доступних відомостей про сеанси.","No session details available.")));
  }catch(_){if(c.isConnected)list.replaceChildren(empty(t("Не вдалося завантажити сеанси.","Could not load sessions.")));}
  finally{refresh.disabled=false;refresh.removeAttribute("aria-busy");list.setAttribute("aria-busy","false");}
 }
 await load();
}
function accountCredentials(panel,ticket,section){
 const security=card("ui-vatra-id-security-001"),contact=card("ui-vatra-id-contact-001");
 const row=(host,key,heading,description,handler)=>{
  const line=make("div","ui-vatra-id-credential-row-001"),copy=make("div","ui-vatra-id-credential-copy-001");
  copy.append(make("strong","vatra-id-credential-label-001",heading),make("span","vatra-id-credential-note-001",description));
  const button=btn(t("Змінити","Change"),"vatra-preferences-action-001",handler);
  button.setAttribute("aria-label",heading+" · "+t("Змінити","Change"));button.dataset.credential=key;
  line.append(idSymbol(key==="email"?"mail":"key"),copy,button);host.append(line);return copy.lastElementChild;
 };
 const openForm=heading=>{const {d,form}=dialog(heading);d.addEventListener("close",()=>{form.reset();d.remove();},{once:true});return {d,form};};
 const closeSuccess=(d,copy)=>{if(!d.open)return;d.addEventListener("close",()=>{if(ticket===renderTicket)message(copy);},{once:true});d.close();};
 const failure=(error)=>error?.code==="weak_password"?t("Пароль не відповідає вимогам сервера. Перевірте правила під полем пароля.","The password does not meet the server's security requirements. Check the rules below the password field."):
  error?.code==="same_password"?t("Виберіть новий пароль, який відрізняється від попереднього.","Choose a new password that differs from the previous one."):
  error?.code==="reauthentication_not_valid"?t("Неправильний або прострочений код. Перевірте лист або запросіть новий.","Incorrect or expired code. Check your email or request another one."):
  error?.code==="invalid_credentials"||error?.code==="invalid_current_password"?t("Неправильна електронна пошта або пароль.","Incorrect email address or password."):
  t("Не вдалося зберегти зміни.","Could not save changes.");
 contact.append(make("h2","vatra-id-heading-001",t("Контактні дані","Contact details")));
 let emailNote=row(contact,"email",t("Основна пошта","Primary email"),user.email||"",()=>{
  const {d,form}=openForm(t("Змінити електронну пошту","Change email"));
  const email=field(form,"new-email",t("Нова електронна пошта","New email"),"email",254,true);email.autocomplete="email";
  form.append(make("p","vatra-section-form-note-001",t("Підтвердьте зміну пошти за посиланнями з листів.","Confirm the email change using the links in your emails.")));
  submit(form,t("Зберегти зміни","Save changes"),async()=>{
   const value=email.value.trim();if(value.toLowerCase()===(user.email||"").toLowerCase()){message(t("Вкажіть іншу електронну пошту.","Enter a different email address."),true);return;}
   const {data,error}=await client.auth.updateUser({email:value},{emailRedirectTo:new URL("verify",root).href});
   if(error){message(failure(error),true);return;}
   if(data?.user?.id===user.id){user=data.user;if(emailNote.isConnected)emailNote.textContent=user.email||"";}
   closeSuccess(d,t("Перевірте електронну пошту для підтвердження зміни.","Check your email to confirm the change."));
  });d.showModal();
 });
 security.append(make("h2","vatra-id-heading-001",t("Безпека акаунта","Account security")));
 row(security,"password",t("Пароль","Password"),t("Для безпеки не використовуйте пароль з інших сервісів.","For your security, avoid reusing passwords from other services."),()=>{
  const {d,form}=openForm(t("Змінити пароль","Change password"));
  const current=field(form,"current-password",t("Поточний пароль","Current password"),"password",128,true),next=field(form,"new-password",t("Новий пароль","New password"),"password",128,true),repeat=field(form,"repeat-password",t("Повторіть пароль","Confirm password"),"password",128,true);
  current.autocomplete="current-password";next.autocomplete=repeat.autocomplete="new-password";next.minLength=repeat.minLength=12;
  form.append(make("p","vatra-section-form-note-001",t("Від 12 символів: мала й велика латинські літери, цифра та спеціальний символ. Не повторюйте пароль з інших сайтів.","At least 12 characters: uppercase and lowercase Latin letters, a digit and a symbol. Do not reuse passwords.")));
  const nonce=field(form,"password-nonce",t("Введіть код підтвердження з листа.","Enter the verification code from your email."),"text",10,false);nonce.inputMode="numeric";nonce.autocomplete="one-time-code";nonce.pattern="[0-9]{6,10}";nonce.parentElement.hidden=true;
  const sendCode=btn(t("Надіслати код","Send code"),"vatra-preferences-action-001",async()=>{
   if(sendCode.disabled)return;sendCode.disabled=true;try{const {error}=await client.auth.reauthenticate();if(error){message(failure(error),true);return;}if(d.open)message(t("Введіть код підтвердження з листа.","Enter the verification code from your email."));}catch(error){if(d.open)message(failure(error),true);}finally{sendCode.disabled=false;}
  });sendCode.hidden=true;form.append(sendCode);
  submit(form,t("Зберегти пароль","Save password"),async()=>{
   const value=next.value;
   if(value!==repeat.value){message(t("Паролі не збігаються.","Passwords do not match."),true);return;}
   if(value===current.value){message(t("Виберіть новий пароль, який відрізняється від попереднього.","Choose a new password that differs from the previous one."),true);return;}
   if(value.length<12||value.length>128||!/[a-z]/.test(value)||!/[A-Z]/.test(value)||!/[0-9]/.test(value)||!/[!@#$%^&*()_+\-=\[\]{};'\\:"|<>?,.\/\x60~]/.test(value)){
    message(t("Пароль не відповідає вимогам сервера. Перевірте правила під полем пароля.","The password does not meet the server's security requirements. Check the rules below the password field."),true);return;
   }
   const attributes={password:value,current_password:current.value};if(!nonce.parentElement.hidden)attributes.nonce=nonce.value.trim();
   const {data,error}=await client.auth.updateUser(attributes);
   if(error?.code==="reauthentication_needed"){nonce.parentElement.hidden=false;nonce.required=true;sendCode.hidden=false;message(t("Для зміни пароля потрібне підтвердження електронною поштою.","Email verification is required to change your password."));nonce.focus();return;}
   if(error){message(failure(error),true);return;}
   if(data?.user?.id===user.id)user=data.user;
   form.reset();closeSuccess(d,t("Зміни збережено.","Changes saved."));
  });d.showModal();
 });
 security.append(link(t("Забули пароль?","Forgot password?"),"forgot","vatra-id-password-001"));
 panel.append(section==="personal"?contact:security);
}
async function account(){
 title.textContent="VATRA ID";subtitle.textContent="";
 const layout=make("div","ui-vatra-id-layout-001"),rail=make("aside","ui-vatra-id-rail-001"),side=card("ui-vatra-id-sidebar-001"),panel=make("div","ui-vatra-id-content-001");
 const brand=make("div","ui-vatra-id-brand-001"),logo=make("img","ui-vatra-id-brand-logo-001");logo.src=new URL("assets/logo/logo_symbol.svg",root).href;logo.alt="VATRA";brand.append(logo,make("span","vatra-id-brand-label-001","ID"));
 const sections=[["home",t("Головна","Home")],["personal",t("Мої дані","My data")],["security",t("Безпека","Security")]];
 const go=id=>{if(location.hash.slice(1)===id)void show(id);else location.hash=id;};
 const nav=tabs(sections,go);
 for(const b of nav.children){const key={home:"house",personal:"person",security:"shield"}[b.dataset.tab];const label=make("span","vatra-id-nav-label-001",b.textContent);b.replaceChildren(idIcon(key),label);}
 side.append(brand,nav);
 const back=link("","feed","vatra-id-back-001");back.append(idIcon("back"),make("span","vatra-id-back-label-001",t("Повернутися у VATRA","Return to VATRA")));
 const returnCard=card("ui-vatra-id-return-001");returnCard.append(back);
 const legal=make("nav","ui-vatra-id-legal-001");legal.setAttribute("aria-label",t("Документи та допомога","Documents and help"));legal.append(link(t("Конфіденційність","Privacy"),"privacy","vatra-id-legal-link-001"),link(t("Умови","Terms"),"terms","vatra-id-legal-link-001"),link(t("Допомога","Help"),"mailto:vatra.support@gmail.com","vatra-id-legal-link-001"));
 rail.append(side,returnCard,legal);layout.append(rail,panel);content.append(layout);
 const identityCard=async(ticket,home=false)=>{
  const c=card("ui-vatra-id-personal-001"),identity=make("div","ui-vatra-id-identity-001"),avatar=make("span","ui-vatra-id-avatar-001");window.VATRA_AVATAR?.fallback(avatar,"default");
  const info=make("div","ui-vatra-id-identity-info-001"),display=make("h2","vatra-id-heading-001",await nameOf(ownId));if(ticket!==renderTicket)return null;
  const number=make("div","ui-vatra-id-number-row-001"),copy=btn("","vatra-id-copy-001",async()=>{try{await navigator.clipboard.writeText(ownId);message(t("ID скопійовано.","ID copied."));}catch(_){message(t("Не вдалося скопіювати ID.","Could not copy ID."),true);}});
  copy.append(idIcon("copy"));copy.setAttribute("aria-label",t("Копіювати ID","Copy ID"));number.append(make("span","vatra-id-number-001","ID: "+ownId),copy);
  info.append(display,number);identity.append(avatar,info);
  if(home){const edit=btn("","vatra-id-identity-open-001",()=>go("personal"));edit.append(idIcon("next"));edit.setAttribute("aria-label",t("Мої дані","My data"));identity.append(edit);}
  c.append(identity);
 void client.from("profile_media").select("avatar_path").eq("vatra_id",ownId).maybeSingle().then(({data,error})=>{if(!error&&data?.avatar_path&&data.avatar_path.startsWith(ownId+"/avatar/")&&avatar.isConnected){const url=client.storage.from("avatars").getPublicUrl(data.avatar_path).data?.publicUrl;if(url){avatar.style.backgroundImage="url("+JSON.stringify(url)+")";avatar.classList.add("has-photo");}}}).catch(()=>{});

  return {c,display};
 };
 const deletion=()=>{
  const c=card("ui-vatra-id-deletion-001");c.append(make("h2","vatra-id-heading-001",t("Дії з акаунтом","Account actions")));
  const remove=idAction(t("Видалення акаунту VATRA ID","Delete VATRA ID account"),t("Назавжди або з періодом для відновлення.","Permanently or with a recovery period."),"trash",()=>{
   const {d,form}=dialog(t("Видалення акаунту","Delete account"));d.addEventListener("close",()=>{form.reset();d.remove();},{once:true});
   form.append(make("p","vatra-section-form-note-001",t("Оберіть, коли акаунт і його дані мають бути остаточно видалені.","Choose when your account and its data will be permanently deleted.")));
   const choices=make("fieldset","ui-vatra-id-delete-choices-001"),legend=make("legend","vatra-id-delete-legend-001",t("Термін відновлення","Recovery period"));choices.append(legend);
   for(const [days,label] of [[0,t("Видалити назавжди зараз","Delete permanently now")],[7,t("7 днів","7 days")],[30,t("30 днів","30 days")],[90,t("90 днів","90 days")],[180,t("180 днів","180 days")]]){
    const row=make("label","ui-vatra-id-delete-option-001"),radio=make("input","ui-vatra-id-delete-radio-001");radio.type="radio";radio.name="recovery-days";radio.value=String(days);radio.checked=days===30;row.append(radio,make("span","vatra-id-delete-option-label-001",label));choices.append(row);
   }
   const explain=make("p","vatra-section-form-note-001",t("Після завершення вибраного терміну відновлення буде неможливим.","After the selected period, recovery will no longer be possible."));
   form.append(choices,explain,make("p","vatra-id-lifecycle-unavailable-001",t("Видалення поки недоступне: серверне очищення даних ще перевіряється.","Deletion is not yet available: server-side data cleanup is still being verified.")));
   const controls=make("div","ui-vatra-id-delete-controls-001"),cancel=btn(t("Скасувати","Cancel"),"vatra-preferences-action-001",()=>d.close()),confirm=btn(t("Видалити акаунт","Delete account"),"vatra-id-delete-confirm-001",()=>{});confirm.disabled=true;controls.append(cancel,confirm);form.append(controls);d.showModal();
  });remove.classList.add("is-danger");c.append(remove);panel.append(c);
 };
 const show=async(id)=>{
  const ticket=++renderTicket;panel.replaceChildren();message("");for(const b of nav.children){b.classList.toggle("is-active",b.dataset.tab===id);b.setAttribute("aria-pressed",String(b.dataset.tab===id));}
  if(id==="security"){
   const c=card("ui-vatra-id-protection-001");c.append(idSymbol("shield"),make("h2","vatra-id-heading-001",t("Безпека акаунту","Account security")),make("p","vatra-section-form-note-001",t("Перевіряйте активні сеанси та використовуйте надійний унікальний пароль.","Review active sessions and use a strong unique password.")));panel.append(c);
   accountCredentials(panel,ticket,"security");await renderDevices(panel);return;
  }
  const data=await identityCard(ticket,id==="home");if(!data||ticket!==renderTicket)return;const {c,display}=data;panel.append(c);
  if(id==="home"){
   const quick=card("ui-vatra-id-quick-001");quick.append(make("h2","vatra-id-heading-001",t("Швидкі дії","Quick actions")));
   quick.append(idAction(t("Мої дані","My data"),t("Ім’я, прізвище, стать і дата народження","Name, gender and date of birth"),"person",()=>go("personal")),idAction(t("Пароль","Password"),t("Змінити пароль","Change password"),"key",()=>go("security")),idAction(t("Основна пошта","Primary email"),user.email||"","mail",()=>go("personal")),idAction(t("Пристрої та сеанси","Devices and sessions"),t("Керування активними входами","Manage active sign-ins"),"devices",()=>go("security")));panel.append(quick);
   const protection=card("ui-vatra-id-protection-summary-001");protection.append(idAction(t("Безпека","Security"),t("Перевірте захист акаунту","Review account protection"),"shield",()=>go("security")));panel.append(protection);await renderDevices(panel);return;
  }
  const form=make("form","ui-vatra-id-personal-form-001"),first=field(form,"first-name",t("Ім’я","First name"),"text",40,true),last=field(form,"last-name",t("Прізвище","Last name"),"text",40,true);
  first.value=user.user_metadata?.first_name||display.textContent.split(" ")[0]||"";last.value=user.user_metadata?.last_name||display.textContent.split(" ").slice(1).join(" ");
  const gender=make("select","ui-vatra-section-input-gender"),genderWrap=make("div","ui-vatra-section-field-gender"),genderLabel=make("label","vatra-section-label-gender",t("Стать","Gender"));gender.id="vatra-section-gender";genderLabel.htmlFor=gender.id;
  for(const [value,label] of [["",t("Не вказувати","Not specified")],["female",t("Жіноча","Female")],["male",t("Чоловіча","Male")],["other",t("Користувацька","Custom")]])gender.add(new Option(label,value));
  gender.value=["female","male","other"].includes(user.user_metadata?.gender)?user.user_metadata.gender:"";genderWrap.append(genderLabel,gender);form.append(genderWrap);
  const birth=field(form,"birthdate",t("Дата народження","Date of birth"),"date",10,true);birth.min="1900-01-01";const now=new Date();const cutoff=new Date(now.getFullYear()-13,now.getMonth(),now.getDate());birth.max=[cutoff.getFullYear(),String(cutoff.getMonth()+1).padStart(2,"0"),String(cutoff.getDate()).padStart(2,"0")].join("-");birth.value=user.user_metadata?.birthdate||"";
  form.append(make("p","vatra-section-form-note-001",t("VATRA ID залишається незмінним. Ім’я та прізвище відображатимуться у профілі.","Your ID remains unchanged. Your name is displayed on your profile.")));c.append(form);
  submit(form,t("Зберегти зміни","Save changes"),async()=>{
   const a=first.value.trim(),b=last.value.trim(),name=a+" "+b;
   if(!a||!b||name.length>80||!/^\d{4}-\d{2}-\d{2}$/.test(birth.value)||birth.value<birth.min||birth.value>birth.max){message(t("Перевірте ім’я, прізвище та дату народження. VATRA доступна від 13 років.","Check your name and date of birth. VATRA is available from age 13."),true);return;}
   const value=new Date(birth.value+"T00:00:00Z");if(!Number.isFinite(value.getTime())||value.toISOString().slice(0,10)!==birth.value){message(t("Вкажіть правильну дату народження.","Enter a valid date of birth."),true);return;}
   const {data,error}=await client.from("public_profiles").update({display_name:name}).eq("vatra_id",ownId).select("display_name").maybeSingle();if(error||data?.display_name!==name)throw error||Error("name not saved");display.textContent=name;
   const auth=await client.auth.updateUser({data:{first_name:a,last_name:b,full_name:name,gender:gender.value||null,birthdate:birth.value}});if(auth.error){message(t("Ім’я у профілі змінено, але не вдалося синхронізувати акаунт. Повторіть збереження.","Profile name changed, but account sync failed. Save again."),true);return;}
   user=auth.data.user||user;window.VATRA_AVATAR?.setHeader({client,email:user.email,name:a.slice(0,28),initials:(a[0]+b[0]).toLocaleUpperCase(),id:ownId});message(t("Зміни збережено.","Changes saved."));
  });
  accountCredentials(panel,ticket,"personal");deletion();
 };
 const open=()=>{const id=location.hash.slice(1);window.scrollTo(0,0);return show(sections.some(([key])=>key===id)?id:"home");};
 window.addEventListener("hashchange",()=>void open());await open();
}
async function preferences(){
 title.textContent=t("Налаштування","Settings");subtitle.textContent="";
 const layout=make("div","ui-vatra-preferences-layout-001"),panel=make("div","ui-vatra-preferences-content-001"),side=card("ui-vatra-preferences-nav-001");
 const sections=[["general",t("Загальні","General")],["privacy",t("Приватність","Privacy")],["notifications",t("Сповіщення","Notifications")],["blocked",t("Чорний список","Blocked members")]];
 const menu=tabs(sections,id=>{if(location.hash==="#"+id)void show(id);else location.hash=id;});
 const security=link(t("Безпека","Security"),"vatra-id#security","vatra-preferences-id-link-001");
 const brand=make("span","vatra-preferences-id-badge-001");const logo=make("img","vatra-preferences-id-logo-001");logo.src="assets/logo/logo_symbol.svg";logo.alt="";brand.append(logo,document.createTextNode("ID"));security.append(brand);side.append(menu,security);layout.append(panel,side);content.append(layout);
 const prefKey="vatra:notification-display:"+ownId;
 const notificationKinds=[
 ["feedback",t("Зворотний зв’язок","Feedback"),[
 ["post_like",t("Вподобання дописів","Post likes"),t("Реакції на ваші публікації.","Reactions to your posts.")],
 ["comment_like",t("Вподобання коментарів","Comment likes"),""],
 ["avatar_like",t("Вподобання фотографій профілю","Profile photo likes"),""],
 ["avatar_comment_like",t("Вподобання коментарів до фото","Photo comment likes"),""],
 ["album_photo_like",t("Вподобання фото в альбомах","Album photo likes"),""],
 ["post_comment",t("Коментарі до публікацій","Post comments"),""],
 ["post_reply",t("Відповіді на коментарі","Comment replies"),""],
 ["avatar_comment",t("Коментарі до фото профілю","Profile photo comments"),""],
 ["album_comment",t("Коментарі до фото в альбомах","Album photo comments"),""],
 ["post_share",t("Поширення публікацій","Post shares"),""]]],
 ["events",t("Події","Events"),[
 ["friend_request",t("Запити в друзі","Friend requests"),""],
 ["friend_accepted",t("Прийняті запити","Accepted requests"),""],
 ["friend_declined",t("Відхилені запити","Declined requests"),""],
 ["post_mention",t("Згадки у публікаціях","Post mentions"),""],
 ["comment_mention",t("Згадки у коментарях","Comment mentions"),""]]],
 ["updates",t("Оновлення","Updates"),[
 ["member_post",t("Нові публікації","New posts"),""],
 ["member_story",t("Нові історії","New stories"),""]]]
 ];
 function settingsCard(heading){const c=card("ui-vatra-preferences-card-001");c.append(make("h2","vatra-preferences-heading-001",heading));return c;}
 function row(c,heading,description,control,key){const line=make("div","ui-vatra-preferences-row-001"),copy=make("div","ui-vatra-preferences-row-copy-001"),label=make("label","vatra-preferences-label-001",heading);if(key){control.id="vatra-preference-"+key;label.htmlFor=control.id;}copy.append(label);if(description)copy.append(make("p","vatra-preferences-description-001",description));line.append(copy,control);c.append(line);return line;}
 async function show(id){
  const ticket=++renderTicket;panel.replaceChildren();message("");
  for(const b of menu.children){b.classList.toggle("is-active",b.dataset.tab===id);b.setAttribute("aria-pressed",String(b.dataset.tab===id));}
  if(id==="general"){
   const c=settingsCard(t("Загальні","General")),language=btn(t("Змінити","Change"),"vatra-preferences-action-001",()=>window.VATRA_LANGUAGE?.openPicker?.());
   row(c,t("Мова","Language"),new Intl.DisplayNames([locale],{type:"language"}).of(locale),language);
   panel.append(c);const accountCard=settingsCard("VATRA ID");row(accountCard,t("Особисті дані","Personal data"),t("Керування іменем та акаунтом.","Manage your name and account."),link(t("Відкрити","Open"),"vatra-id#personal","vatra-preferences-action-001"));row(accountCard,t("Безпека акаунта","Account security"),t("Пароль, електронна пошта, пристрої та сеанси.","Password, email, devices and sessions."),link(t("Відкрити","Open"),"vatra-id#security","vatra-preferences-action-001"));panel.append(accountCard);return;
  }
  if(id==="privacy"){
   const profile=settingsCard(t("Моя сторінка","My profile")),activity=settingsCard(t("Активність","Activity"));
   const visibility=make("select","ui-vatra-preferences-select-001"),presence=make("select","ui-vatra-preferences-select-001");
   visibility.append(new Option(t("Відкритий","Public"),"public"),new Option(t("Лише друзі","Friends only"),"friends"));
   presence.append(new Option(t("Усі користувачі","All members"),"public"),new Option(t("Лише друзі","Friends only"),"friends"),new Option(t("Лише я","Only me"),"private"));
   visibility.disabled=presence.disabled=true;
   row(profile,t("Тип профілю","Profile visibility"),t("Кому доступна інформація вашої сторінки.","Who can access information on your profile."),visibility,"visibility");
   row(activity,t("Хто бачить, що я онлайн","Who can see when I am online"),t("Видимість статусу онлайн та останньої активності. Налаштування закритого профілю також діють.","Visibility of online status and last activity. Closed-profile restrictions also apply."),presence,"presence");
   panel.append(profile,activity);
   const result=await client.from("profile_preferences").select("profile_visibility,presence_visibility").eq("vatra_id",ownId).maybeSingle();if(ticket!==renderTicket)return;
   if(result.error){message(t("Не вдалося завантажити приватність.","Could not load privacy settings."),true);return;}
   const saved={profile_visibility:result.data?.profile_visibility||"public",presence_visibility:result.data?.presence_visibility||"public"};
   visibility.value=saved.profile_visibility;presence.value=saved.presence_visibility;visibility.disabled=presence.disabled=false;
   for(const [key,control] of [["profile_visibility",visibility],["presence_visibility",presence]])control.addEventListener("change",async()=>{const desired=control.value;visibility.disabled=presence.disabled=true;message("");
    try{const result=await client.from("profile_preferences").upsert({vatra_id:ownId,[key]:desired,updated_at:new Date().toISOString()},{onConflict:"vatra_id"}).select(key).maybeSingle();if(result.error||result.data?.[key]!==desired)throw Error("Preference not saved");saved[key]=desired;if(ticket===renderTicket)message(t("Зміни збережено.","Changes saved."));}
    catch(_){control.value=saved[key];if(ticket===renderTicket)message(t("Не вдалося зберегти зміни.","Could not save changes."),true);}finally{visibility.disabled=presence.disabled=false;}
   });return;
  }
  if(id==="notifications"){
   let hidden=[];try{const value=JSON.parse(localStorage.getItem(prefKey)||"[]");if(Array.isArray(value))hidden=value.filter(x=>typeof x==="string");}catch(_){}
   for(const [,heading,kinds] of notificationKinds){const c=settingsCard(heading);panel.append(c);
   for(const [key,label,description] of kinds){const control=make("input","ui-vatra-preferences-toggle-001");control.type="checkbox";control.setAttribute("role","switch");control.checked=!hidden.includes(key);row(c,label,description,control,key);
    control.addEventListener("change",()=>{const before=hidden;const next=control.checked?hidden.filter(x=>x!==key):[...new Set([...hidden,key])];try{localStorage.setItem(prefKey,JSON.stringify(next));hidden=next;window.dispatchEvent(new Event("vatra-notification-display-changed"));message(t("Зміни збережено.","Changes saved."));}catch(_){control.checked=!before.includes(key);message(t("Не вдалося зберегти зміни.","Could not save changes."),true);}});}
   }return;
  }
  const c=settingsCard(t("Чорний список","Blocked members")),form=make("form","ui-vatra-preferences-block-form-001"),idInput=field(form,"blocked-id","VATRA ID","text",19,true);idInput.inputMode="numeric";idInput.pattern="[1-9][0-9]{0,18}";c.append(form);
  const list=make("div","ui-vatra-preferences-block-list-001");list.setAttribute("aria-live","polite");c.append(list);panel.append(c);
  submit(form,t("Додати до чорного списку","Block member"),async()=>{if(ticket!==renderTicket)return;const value=idInput.value.trim();if(!valid(value)||value===ownId){message(t("Вкажіть VATRA ID іншого користувача.","Enter another member's VATRA ID."),true);return;}if(!await confirmRemove(t("Заблокувати користувача?","Block member?"),t("Спілкування з цим користувачем буде обмежено.","Interactions with this member will be restricted."),t("Заблокувати","Block")))return;const r=await client.from("member_blocks").insert({blocker_vatra_id:ownId,blocked_vatra_id:value});if(r.error)throw r.error;if(ticket===renderTicket){idInput.value="";await readList();}});
  let generation=0;
  async function readList(){const n=++generation;list.replaceChildren(empty(t("Завантаження…","Loading…")));const result=await client.from("member_blocks").select("blocked_vatra_id,created_at").eq("blocker_vatra_id",ownId).order("created_at",{ascending:false}).limit(500);if(ticket!==renderTicket||n!==generation)return;
   if(result.error){list.replaceChildren(empty(t("Не вдалося завантажити чорний список.","Could not load blocked members.")));return;}
   const items=result.data||[];list.replaceChildren();if(!items.length){const state=make("div","ui-vatra-preferences-block-empty-001"),symbol=sectionIcon("person");symbol.setAttribute("aria-hidden","true");state.append(symbol,make("p","vatra-preferences-block-empty-label-001",t("Ваш чорний список порожній","Your blocked list is empty")));list.append(state);return;}
   const names=await Promise.all(items.map(x=>nameOf(String(x.blocked_vatra_id)).catch(()=>t("Учасник VATRA","VATRA member"))));if(ticket!==renderTicket||n!==generation)return;
   for(const [i,item] of items.entries()){const id=String(item.blocked_vatra_id),line=make("div","ui-vatra-preferences-block-row-001"),info=make("div","ui-vatra-preferences-block-copy-001");info.append(link(names[i],"id"+id,"vatra-preferences-block-name-001"),make("span","vatra-preferences-description-001","VATRA ID "+id));const remove=btn(t("Розблокувати","Unblock"),"vatra-preferences-action-001",async()=>{if(remove.disabled||ticket!==renderTicket)return;remove.disabled=true;try{const r=await client.from("member_blocks").delete().eq("blocker_vatra_id",ownId).eq("blocked_vatra_id",id).select("blocked_vatra_id").maybeSingle();if(r.error||!r.data)throw Error("Not removed");if(ticket===renderTicket)await readList();}catch(_){if(ticket===renderTicket)message(t("Не вдалося розблокувати користувача.","Could not unblock member."),true);}finally{remove.disabled=false;}});line.append(info,remove);list.append(line);}
  }
  await readList();
 }
 const open=()=>{const id=location.hash.slice(1);window.scrollTo(0,0);return show(sections.some(([key])=>key===id)?id:"general").catch(()=>message(t("Не вдалося завантажити налаштування.","Could not load settings."),true));};
 window.addEventListener("hashchange",()=>void open());await open();
}
if(location.pathname.endsWith("/settings")||new URLSearchParams(location.search).get("view")==="settings")await preferences();else await account();
});
})();
