(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_SECTION_CORE?.start(async ({root,locale,t,$,make,link,btn,valid,title,subtitle,action,content,notice,client,user,ownId,message,empty,card,field,submit,confirmRemove,tabs,dialog,nameOf,sectionIcon,sectionIconButton,discoveryIcons})=>{
let renderTicket=0;
function sessionDevice(agent){
 const a=String(agent||"");
 const browser=/OPR\/|Opera/i.test(a)?"Opera":/Edg(?:A|iOS)?\//i.test(a)?"Edge":/Firefox\/|FxiOS\//i.test(a)?"Firefox":/Chrome\/|CriOS\//i.test(a)?"Chrome":/Safari\//i.test(a)?"Safari":t("Браузер або застосунок","Browser or app");
 const os=/Windows/i.test(a)?"Windows":/Android/i.test(a)?"Android":/iPhone|iPad|iPod/i.test(a)?"iOS / iPadOS":/Macintosh|Mac OS/i.test(a)?"macOS":/Linux/i.test(a)?"Linux":"";
 return browser+(os?" · "+os:"");
}
async function renderDevices(panel){
 const c=card("ui-vatra-id-devices-001"),head=make("div","ui-vatra-id-devices-head-001"),list=make("div","ui-vatra-id-device-list-001");
 head.append(make("h2","vt-vatra-id-device-heading-001",t("Пристрої та сеанси","Devices and sessions")));
 const refresh=btn(t("Оновити","Refresh"),"vt-vatra-id-device-refresh-001",()=>void load());
 head.append(refresh);c.append(head,make("p","vt-vatra-id-device-note-001",t("Входи у ваш акаунт. Один пристрій може мати кілька сеансів.","Sign-ins to your account. A device may have multiple sessions.")),list);
 const logout=btn(t("Завершити всі інші сеанси","Sign out all other sessions"),"vt-vatra-id-device-revoke-001",async()=>{
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
  if(refresh.disabled)return;refresh.disabled=true;list.setAttribute("aria-busy","true");
  try{
   const {data,error}=await client.rpc("vatra_my_sessions");if(error)throw error;if(!c.isConnected)return;
   list.replaceChildren();
   const date=value=>{const d=new Date(value);return value&&Number.isFinite(d.getTime())?new Intl.DateTimeFormat(locale==="en"?"en-GB":"uk-UA",{dateStyle:"medium",timeStyle:"short"}).format(d):"—";};
   for(const [index,entry] of (data||[]).entries()){
    const row=make("div","ui-vatra-id-device-row-001"),symbol=make("span","ui-vatra-id-device-symbol-001"),ns="http://www.w3.org/2000/svg",icon=document.createElementNS(ns,"svg"),path=document.createElementNS(ns,"path");
    icon.setAttribute("class","ui-vatra-id-device-icon-001");icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("width","25");icon.setAttribute("height","25");icon.setAttribute("fill","none");icon.setAttribute("stroke","currentColor");icon.setAttribute("stroke-width","1.7");icon.setAttribute("stroke-linecap","round");icon.setAttribute("stroke-linejoin","round");icon.setAttribute("aria-hidden","true");
    path.setAttribute("class","ui-vatra-id-device-path-"+index);path.setAttribute("d",/Android|iPhone|iPad/i.test(entry.browser_agent||"")?"M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 15h2":"M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm7 14v3m-4 0h8");
    icon.append(path);symbol.append(icon);
    const details=make("div","ui-vatra-id-device-details-001");details.append(make("strong","vt-vatra-id-device-name-001",sessionDevice(entry.browser_agent)),make("span","vt-vatra-id-device-time-001",t("Вхід: ","Signed in: ")+date(entry.signed_in_at)));
    if(entry.refreshed_at)details.append(make("span","vt-vatra-id-device-activity-001",t("Оновлення сеансу: ","Session refreshed: ")+date(entry.refreshed_at)));
    row.append(symbol,details);if(entry.current_session)row.append(make("span","vt-vatra-id-device-current-001",t("Поточний","Current")));list.append(row);
   }
   if(!data?.length)list.append(empty(t("Немає доступних відомостей про сеанси.","No session details available.")));
  }catch(_){if(c.isConnected)list.replaceChildren(empty(t("Не вдалося завантажити сеанси.","Could not load sessions.")));}
  finally{refresh.disabled=false;list.setAttribute("aria-busy","false");}
 }
 await load();
}
async function account(){
 title.textContent="VATRA ID";subtitle.textContent="";
 const layout=make("div","ui-vatra-id-layout-001"),side=card("ui-vatra-id-sidebar-001"),panel=make("div","ui-vatra-id-content-001");
 const nav=tabs([["personal",t("Мої дані","My data")],["security",t("Безпека","Security")],["verification",t("Верифікація","Verification")]],id=>{if(location.hash.slice(1)===id)void show(id);else location.hash=id;});side.append(make("h2","vt-vatra-id-menu-title-001","VATRA ID"),nav,link(t("Повернутися до VATRA","Return to VATRA"),"id"+ownId,"vt-vatra-id-back-001"));layout.append(side,panel);content.append(layout);
 const show=async(id)=>{const ticket=++renderTicket;panel.replaceChildren();message("");for(const b of nav.children){b.classList.toggle("is-active",b.dataset.tab===id);b.setAttribute("aria-pressed",String(b.dataset.tab===id));}
 if(id==="security"){const c=card("ui-vatra-id-security-001");c.append(make("h2","vt-vatra-id-heading-001",t("Безпека акаунта","Account security")),make("p","vt-vatra-id-email-001",user.email||""),make("p","vt-vatra-id-email-status-001",user.email_confirmed_at?t("Електронну пошту підтверджено","Email confirmed"):t("Пошта не підтверджена","Email not confirmed")),link(t("Відновлення пароля","Password recovery"),"forgot","vt-vatra-id-password-001"));panel.append(c);await renderDevices(panel);return;}
 if(id==="verification"){const c=card("ui-vatra-id-verification-001");c.append(make("h2","vt-vatra-id-heading-001",t("Верифікація сторінки","Profile verification")));panel.append(c);
  const [v,request]=await Promise.all([client.from("verified_accounts").select("vatra_id").eq("vatra_id",ownId).maybeSingle(),client.from("verification_requests").select("status,created_at").eq("vatra_id",ownId).maybeSingle()]);if(ticket!==renderTicket)return;
  if(v.error||request.error){c.append(empty(t("Статус верифікації недоступний.","Verification status unavailable.")));return;}
  if(v.data){c.append(make("p","vt-vatra-id-verification-result-001",t("Вашу сторінку верифіковано.","Your profile is verified.")));return;}
  if(request.data){const status={pending:t("Заявка на розгляді","Application pending"),approved:t("Заявку схвалено; галочка з’явиться після підтвердження VATRA.","Application approved; awaiting VATRA confirmation."),rejected:t("Заявку відхилено","Application rejected")}[request.data.status];c.append(make("p","vt-vatra-id-verification-result-001",status));return;}
  c.append(make("p","vt-vatra-id-verification-copy-001",t("Подайте заявку на підтвердження справжності сторінки. Рішення приймає адміністрація VATRA. Не додавайте паролі, номери документів або банківські дані.","Apply to confirm the authenticity of your profile. VATRA reviews applications. Do not include passwords, ID numbers or bank details.")));
  const form=make("form","ui-vatra-id-verification-form-001"),reason=field(form,"verify-reason",t("Чому ваша сторінка потребує верифікації?","Why does your profile need verification?"),"textarea",1000,true);reason.minLength=10;c.append(form);submit(form,t("Подати заявку","Apply"),async()=>{const {error}=await client.from("verification_requests").insert({vatra_id:ownId,reason:reason.value.trim()});if(error)throw error;await show("verification");});return;}
 const c=card("ui-vatra-id-personal-001"),identity=make("div","ui-vatra-id-identity-001"),avatar=make("span","ui-vatra-id-avatar-001");window.VATRA_AVATAR?.fallback(avatar,"default");const info=make("div","ui-vatra-id-identity-info-001"),display=make("h2","vt-vatra-id-heading-001",await nameOf(ownId));if(ticket!==renderTicket)return;info.append(display,make("span","vt-vatra-id-number-001","VATRA ID "+ownId));identity.append(avatar,info);c.append(identity);
 void client.from("profile_media").select("avatar_path").eq("vatra_id",ownId).maybeSingle().then(({data,error})=>{if(!error&&data?.avatar_path&&data.avatar_path.startsWith(ownId+"/avatar/")&&avatar.isConnected){const url=client.storage.from("avatars").getPublicUrl(data.avatar_path).data?.publicUrl;if(url){avatar.style.backgroundImage="url("+JSON.stringify(url)+")";avatar.classList.add("has-photo");}}}).catch(()=>{});
 const form=make("form","ui-vatra-id-personal-form-001"),first=field(form,"first-name",t("Ім’я","First name"),"text",40,true),last=field(form,"last-name",t("Прізвище","Last name"),"text",40,true);first.value=user.user_metadata?.first_name||display.textContent.split(" ")[0]||"";last.value=user.user_metadata?.last_name||display.textContent.split(" ").slice(1).join(" ");const note=make("p","vt-vatra-section-form-note-001",t("VATRA ID залишається незмінним. Ім’я та прізвище відображатимуться у профілі.","Your VATRA ID remains unchanged. Your name is displayed on your profile."));form.append(note);c.append(form);panel.append(c);
 submit(form,t("Зберегти зміни","Save changes"),async()=>{const a=first.value.trim(),b=last.value.trim(),name=a+" "+b;if(a.length<1||b.length<1||name.length>80){message(t("Заповніть ім’я та прізвище (до 80 символів разом).","Enter first and last name (up to 80 characters in total)."),true);return;}
 const {data,error}=await client.from("public_profiles").update({display_name:name}).eq("vatra_id",ownId).select("display_name").maybeSingle();if(error||data?.display_name!==name)throw error||Error("name not saved");display.textContent=name;const auth=await client.auth.updateUser({data:{first_name:a,last_name:b,full_name:name}});if(auth.error){message(t("Ім’я у профілі змінено, але не вдалося синхронізувати акаунт. Повторіть збереження.","Profile name changed, but account sync failed. Save again."),true);return;}user=auth.data.user||user;window.VATRA_AVATAR?.setHeader({client,email:user.email,name:a.slice(0,28),initials:(a[0]+b[0]).toLocaleUpperCase(),id:ownId});message(t("Зміни збережено.","Changes saved."));});
 };
 const open=()=>{const id=location.hash.slice(1);return show(["personal","security","verification"].includes(id)?id:"personal");};
 window.addEventListener("hashchange",()=>void open());await open();
}
await account();
});
})();
