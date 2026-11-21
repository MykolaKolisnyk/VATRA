/* VATRA Messenger: encrypted text, real RLS, scoped deletion, and realtime refresh. */
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const ROOT=new URL("./",location.href),URL_API="https://cxrcycxrlkufozomsxcs.supabase.co";
 const PUBLISHABLE="sb_publishable_oKypZDxi8PP1oxSylfh5wQ_H6HxeM-i";
 const $=selector=>document.querySelector(selector);
 const cryptoBox=()=>window.VATRA_MESSENGER_CRYPTO;
 const locale=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
 const translate=(uk,en)=>{const l=locale();if(l==="en")return en;const value=window.VATRA_LANGUAGE?.translate?.(uk);return typeof value==="string"&&value!==uk?value:uk;};
 const t=translate;
 const validId=value=>/^[1-9][0-9]{0,18}$/.test(String(value));
 const time=date=>new Intl.DateTimeFormat(locale()==="en"?"en-US":"uk-UA",{hour:"2-digit",minute:"2-digit"}).format(new Date(date));
 const day=date=>new Intl.DateTimeFormat(locale()==="en"?"en-US":"uk-UA",{day:"numeric",month:"long",year:"numeric"}).format(new Date(date));
 const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 const state={client:null,user:null,own:null,selected:null,rows:[],names:new Map(),locked:true,peerKey:null,peerChanged:false,keyDialogMode:"",pendingImport:null,
  refreshVersion:0,chatVersion:0,refreshPending:false,sendBusy:false,deleteId:null,subscription:null,poll:null};
 const ROWS="id,sender_id,recipient_id,ciphertext,nonce,salt,sender_public_key,recipient_public_key,created_at,deleted_for_all_at,deleted_for_sender_at,deleted_for_recipient_at";
 function status(text,error=false){const el=$("#messenger-inbox-status");el.textContent=text||"";el.dataset.error=String(!!error);}
 function sendStatus(text){const el=$("#messenger-send-status");el.textContent=text||"";el.hidden=!text;}
 function errorAt(selector,text){const el=$(selector);el.textContent=text;el.hidden=!text;}
 function localize(){
  for(const el of document.querySelectorAll("[data-messenger-uk]"))el.textContent=t(el.dataset.messengerUk,el.dataset.messengerEn);
  $("#messenger-search").placeholder=t("Пошук за ім'ям або VATRA ID","Search name or VATRA ID");
  $("#messenger-compose-text").placeholder=t("Напишіть повідомлення…","Type your message…");
  $("#messenger-passphrase").placeholder=t("Не менше 14 символів","At least 14 characters");
 }
 const ownRow=row=>String(row.sender_id)===state.own;
 const hiddenRow=row=>!!row.deleted_for_all_at||(ownRow(row)?!!row.deleted_for_sender_at:!!row.deleted_for_recipient_at);
 const other=row=>String(row.sender_id)===state.own?String(row.recipient_id):String(row.sender_id);
 const visibleRows=()=>state.rows.filter(row=>!hiddenRow(row));
 const nameFor=id=>state.names.get(String(id))||"VATRA ID "+id;
 const avatarFor=id=>Array.from(nameFor(id).trim().split(/\s+/).slice(0,2).map(x=>Array.from(x)[0]||"").join("").toLocaleUpperCase()).slice(0,2).join("")||"V";
 const openProfile=id=>new URL("id"+id,ROOT).href;
 function setPeerHeading(){
  const id=state.selected,name=id?nameFor(id):t("Оберіть розмову","Choose a conversation");
  $("#messenger-chat-heading").textContent=name;
  $("#messenger-details-name").textContent=name;
  $("#messenger-details-id").textContent=id?"VATRA ID "+id:"—";
  $("#messenger-peer-avatar").textContent=id?avatarFor(id):"V";
  $("#messenger-details-avatar").textContent=id?avatarFor(id):"V";
  $("#messenger-open-profile").href=id?openProfile(id):new URL("profile.html",ROOT).href;
  $("#messenger-peer-caption").textContent=id?
   t("Наскрізне шифрування · Бета","End-to-end encryption · Beta"):
   t("Шифрування між пристроями","Encryption between devices");
  $("#messenger-empty").hidden=!!id;
  $("#messenger-messages").hidden=!id;
  $("#messenger-composer-wrap").hidden=!id;
  $("#messenger-shell").dataset.activeChat=String(!!id);
 }
 async function loadNames(ids){
  const unknown=[...new Set(ids.map(String).filter(validId))].filter(id=>!state.names.has(id));
  if(!unknown.length)return;
  const result=await state.client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",unknown.slice(0,100));
  if(result.error)return;
  for(const record of result.data||[])state.names.set(String(record.vatra_id),String(record.display_name||"").trim()||"VATRA ID "+record.vatra_id);
 }
 async function loadPeerKey(){
  state.peerKey=null;state.peerChanged=false;
  const id=state.selected,el=$("#messenger-peer-fingerprint");
  if(!id){el.textContent="—";return;}
  const {data,error}=await state.client.from("messenger_keys").select("public_key").eq("vatra_id",id).maybeSingle();
  if(id!==state.selected)return;
  if(error){el.textContent=t("Помилка ключа","Key unavailable");sendStatus(t("Не вдалося перевірити ключ співрозмовника.","Could not verify recipient key."));return;}
  if(!data?.public_key){el.textContent="—";sendStatus(t("Співрозмовник ще не налаштував приватний месенджер.","The recipient hasn't set up private Messenger yet."));syncSend();return;}
  state.peerKey=data.public_key;
  try{
   const report=await cryptoBox().checkPeer(state.own,id,state.peerKey);
   if(id!==state.selected)return;
   el.textContent=report.actual;
   state.peerChanged=report.changed;
   document.querySelector("#messenger-peer-accept-change")?.remove();
   if(report.changed){
    sendStatus(t("УВАГА: відкритий ключ співрозмовника змінився. Перевірте відбиток поза VATRA.","WARNING: contact key changed. Verify the fingerprint outside VATRA."));
    const button=node("button","vatra-messenger-secondary",t("Підтвердити новий ключ","Trust this new key"));
    button.id="messenger-peer-accept-change";button.type="button";
    button.addEventListener("click",async()=>{
     const message=t("Ви особисто перевірили новий відбиток ключа співрозмовника поза VATRA?","Have you verified your contact's new key fingerprint outside VATRA?");
     if(!confirm(message))return;
     await cryptoBox().trustPeer(state.own,id,state.peerKey);
     state.peerChanged=false;button.remove();sendStatus("");syncSend();
    });
    $("#messenger-peer-fingerprint").after(button);
   }else sendStatus("");
  }catch(_){state.peerKey=null;sendStatus(t("Ключ співрозмовника недійсний.","Invalid contact key."));}
  syncSend();
 }
 function syncSend(){
  $("#messenger-send").disabled=state.sendBusy||state.locked||!state.peerKey||state.peerChanged||!$("#messenger-compose-text").value.trim();
 }
 function renderConversations(){
  const host=$("#messenger-conversations"),filter=$("#messenger-search").value.trim().toLocaleLowerCase();
  const latest=new Map();
  for(const row of visibleRows())if(!latest.has(other(row)))latest.set(other(row),row);
  if(state.selected&&!latest.has(state.selected))latest.set(state.selected,null);
  const fragment=document.createDocumentFragment();
  for(const [id,row] of latest){
   if(filter&&!(nameFor(id)+" "+id).toLocaleLowerCase().includes(filter))continue;
   const button=node("button","vatra-messenger-thread");button.type="button";button.dataset.peer=id;
   button.classList.toggle("is-selected",id===state.selected);button.setAttribute("aria-pressed",String(id===state.selected));
   const avatar=node("span","vatra-messenger-thread-avatar",avatarFor(id));avatar.setAttribute("aria-hidden","true");
   const content=node("span","vatra-messenger-thread-main");
   content.append(node("span","vatra-messenger-thread-name",nameFor(id)),
    node("span","vatra-messenger-thread-preview",row?t("Зашифроване повідомлення","Encrypted message"):t("Нова розмова","New conversation")));
   const stamp=node("span","vatra-messenger-thread-time",row?time(row.created_at):"");
   button.append(avatar,content,stamp);
   button.addEventListener("click",()=>void choosePeer(id));
   fragment.append(button);
  }
  host.replaceChildren(fragment);
  if(!host.children.length)host.append(node("p","vatra-messenger-inbox-status",filter?t("Нічого не знайдено.","Nothing found."):t("Поки немає розмов. Натисніть +, щоб почати.","No conversations yet. Press + to start.")));
 }
 async function renderMessages(){
  const id=state.selected,host=$("#messenger-messages"),version=++state.chatVersion;
  if(!id){host.replaceChildren();return;}
  const rows=visibleRows().filter(row=>other(row)===id).slice().reverse();
  const cached=new Map([...host.querySelectorAll("[data-message-id]")].map(el=>[el.dataset.messageId,el]));
  const nodes=[],wasNearBottom=host.scrollHeight-host.scrollTop-host.clientHeight<95;
  let previousDate="";
  for(const row of rows){
   if(version!==state.chatVersion||id!==state.selected)return;
   const thisDay=new Date(row.created_at).toDateString();
   if(thisDay!==previousDate){nodes.push(node("span","vatra-messenger-date-separator",day(row.created_at)));previousDate=thisDay;}
   if(cached.has(row.id)){nodes.push(cached.get(row.id));continue;}
   let plaintext;
   try{plaintext=await cryptoBox().decrypt(row,state.own);}
   catch(_){plaintext=t("Не вдалося розшифрувати для цього ключа.","Unable to decrypt for this key.");}
   if(version!==state.chatVersion||id!==state.selected)return;
   const item=node("article","vatra-messenger-message");item.dataset.messageId=row.id;
   item.dataset.own=String(ownRow(row));item.setAttribute("aria-label",ownRow(row)?t("Ваше повідомлення","Your message"):t("Повідомлення співрозмовника","Contact message"));
   const bubble=node("div","vatra-messenger-message-bubble",plaintext);
   const footer=node("span","vatra-messenger-message-time",time(row.created_at));
   const actions=node("div","vatra-messenger-message-actions");
   const remove=node("button","vatra-messenger-message-delete",t("Видалити","Delete"));remove.type="button";
   remove.setAttribute("aria-label",t("Видалити повідомлення","Delete message"));
   remove.addEventListener("click",()=>openDelete(row));actions.append(remove);
   item.append(bubble,footer,actions);nodes.push(item);
  }
  if(version!==state.chatVersion||id!==state.selected)return;
  // Move existing real nodes, don't blank the thread while network or crypto is running.
  host.replaceChildren(...nodes);
  if(wasNearBottom)host.scrollTop=host.scrollHeight;
 }
 async function refresh(){
  if(!state.client||!state.own)return;
  if(state.refreshPending){state.refreshVersion++;return;}
  state.refreshPending=true;
  const version=++state.refreshVersion;
  try{
   const {data,error}=await state.client.from("messenger_messages").select(ROWS)
    .or("sender_id.eq."+state.own+",recipient_id.eq."+state.own)
    .order("created_at",{ascending:false}).limit(300);
   if(error)throw error;
   if(version!==state.refreshVersion)return;
   state.rows=data||[];
   await loadNames(state.rows.map(other));
   renderConversations();await renderMessages();status("");
  }catch(_){status(t("Не вдалося оновити розмови. Спробуйте ще раз.","Could not refresh conversations. Retry."),true);}
  finally{
   state.refreshPending=false;
   if(version!==state.refreshVersion&&document.visibilityState!=="hidden")void refresh();
  }
 }
 function onChange(){if(document.visibilityState!=="hidden")void refresh();}
 async function choosePeer(id){
  if(!validId(id)||String(id)===state.own)return;
  state.selected=String(id);state.peerKey=null;state.peerChanged=false;state.chatVersion++;
  await loadNames([id]);setPeerHeading();renderConversations();
  const params=new URLSearchParams(location.search);params.set("to",id);
  history.replaceState(history.state,"",location.pathname+"?"+params.toString());
  await Promise.all([loadPeerKey(),renderMessages()]);
  syncSend();
 }
 async function beginNew(){
  $("#messenger-new-error").hidden=true;$("#messenger-recipient-id").value="";
  $("#messenger-new-dialog").showModal();$("#messenger-recipient-id").focus();
 }
 async function messageSend(event){
  event.preventDefault();
  const text=$("#messenger-compose-text").value.trim(),peer=state.selected;
  if(state.sendBusy||state.locked||!state.peerKey||state.peerChanged||!peer)return;
  if(!text||Array.from(text).length>2000){sendStatus(t("Максимум 2000 символів.","Maximum 2000 characters."));return;}
  state.sendBusy=true;syncSend();sendStatus("");
  try{
   const id=crypto.randomUUID();
   const envelope=await cryptoBox().encrypt(id,state.own,peer,state.peerKey,text);
   const {data,error}=await state.client.from("messenger_messages").insert(envelope).select("id").single();
   if(error||data?.id!==id)throw error||Error("Insert was not confirmed");
   $("#messenger-compose-text").value="";await refresh();
  }catch(_){sendStatus(t("Не вдалося надіслати зашифроване повідомлення. Перевірте доступ і ключ співрозмовника.","Encrypted send failed. Check access and contact key."));}
  finally{state.sendBusy=false;syncSend();}
 }
 function openDelete(row){
  state.deleteId=row.id;errorAt("#messenger-delete-error","");
  $("#messenger-delete-everyone").hidden=!ownRow(row);
  $("#messenger-delete-dialog").showModal();
 }
 async function doDelete(scope){
  const id=state.deleteId;if(!id)return;
  const mine=$("#messenger-delete-mine"),all=$("#messenger-delete-everyone");
  mine.disabled=all.disabled=true;errorAt("#messenger-delete-error","");
  try{
   const {data,error}=await state.client.rpc("messenger_delete_message",{p_id:id,p_scope:scope});
   if(error||data!==true)throw error||Error("Deletion was not confirmed");
   $("#messenger-delete-dialog").close();
   const bubble=[...$("#messenger-messages").querySelectorAll("[data-message-id]")].find(el=>el.dataset.messageId===id);
   bubble?.classList.add("is-removing");
   await new Promise(resolve=>setTimeout(resolve,270));
   await refresh();
  }catch(_){errorAt("#messenger-delete-error",t("Видалення не підтверджено сервером. Спробуйте ще раз.","Server did not confirm deletion. Retry."));}
  finally{mine.disabled=all.disabled=false;}
 }
 function keyDialog(mode){
  state.keyDialogMode=mode;
  $("#messenger-passphrase").value="";errorAt("#messenger-key-error","");
  const title=$("#messenger-key-title"),description=$("#messenger-key-description"),submit=$("#messenger-key-submit");
  if(mode==="create"){
   title.textContent=t("Створіть приватний ключ","Create a private key");
   description.textContent=t("Введіть унікальну парольну фразу від 14 символів. Вона захистить ваш ключ на цьому пристрої. VATRA її не зберігає. Після створення збережіть зашифровану резервну копію.","Use a unique passphrase of at least 14 characters. It protects your device key. VATRA never stores it. Save your encrypted backup.");
  }else if(mode==="import"){
   title.textContent=t("Відновіть ключ","Restore your key");
   description.textContent=t("Введіть парольну фразу з резервної копії.","Enter your backup passphrase.");
  }else{
   title.textContent=t("Розблокуйте повідомлення","Unlock messages");
   description.textContent=t("Ваш приватний ключ зашифрований на пристрої. Введіть парольну фразу для розмов.","Your device's private key is encrypted. Enter the passphrase to chat.");
  }
  submit.textContent=mode==="create"?t("Створити ключ","Create key"):mode==="import"?t("Відновити","Restore"):t("Розблокувати","Unlock");
  const dialog=$("#messenger-key-dialog");if(!dialog.open)dialog.showModal();$("#messenger-passphrase").focus();
 }
 async function downloadBackup(){
  const backup=await cryptoBox().exportBackup(state.own),blob=new Blob([backup],{type:"application/json"});
  const address=URL.createObjectURL(blob),a=node("a");
  a.href=address;a.download="VATRA-E2EE-key-"+state.own+".json";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(address),3000);
 }
 async function keySubmit(event){
  event.preventDefault();
  const mode=state.keyDialogMode,pass=$("#messenger-passphrase").value,button=$("#messenger-key-submit");
  if(Array.from(pass).length<14){errorAt("#messenger-key-error",t("Парольна фраза має містити щонайменше 14 символів.","Passphrase must have at least 14 characters."));return;}
  button.disabled=true;errorAt("#messenger-key-error","");
  try{
   if(mode==="create"){
    const pub=await cryptoBox().create(state.own,pass);
    const {error}=await state.client.from("messenger_keys").insert({vatra_id:Number(state.own),public_key:pub});
    if(error)throw error;
    await downloadBackup();
   }else if(mode==="import"){
    await cryptoBox().importBackup(state.own,state.pendingImport,pass,state.remotePublic);
    state.pendingImport=null;
   }else{
    const remote=state.remotePublic||(await cryptoBox().loadRecord(state.own))?.publicKey;
    await cryptoBox().unlock(state.own,pass,remote);
    if(!state.remotePublic){
     const {error}=await state.client.from("messenger_keys").insert({vatra_id:Number(state.own),public_key:remote});
     if(error)throw error;
    }
   }
   state.locked=false;$("#messenger-key-dialog").close();
   $("#messenger-security-line").textContent=t("Ваш локальний ключ розблоковано","Your local key is unlocked");
   await Promise.all([refresh(),state.selected?loadPeerKey():Promise.resolve()]);
  }catch(error){errorAt("#messenger-key-error",error?.message||t("Не вдалося відкрити ключ.","Could not open the key."));}
  finally{button.disabled=false;$("#messenger-passphrase").value="";syncSend();}
 }
 async function setupKeys(){
  const {data,error}=await state.client.from("messenger_keys").select("public_key").eq("vatra_id",state.own).maybeSingle();
  if(error)throw error;
  state.remotePublic=data?.public_key||null;
  const local=await cryptoBox().loadRecord(state.own);
  if(data&&!local){
   status(t("Цей пристрій не має вашого приватного ключа. Імпортуйте зашифровану копію.","This device has no private key. Import your encrypted backup."),true);
   keyDialog("unlock");return;
  }
  keyDialog(local?"unlock":"create");
 }
 async function init(){
  await window.VATRA_LANGUAGE?.ready;localize();
  if(!window.supabase?.createClient||!cryptoBox()||!crypto?.subtle||!indexedDB){status(t("Браузер не підтримує необхідні захищені функції.","Browser lacks required secure features."),true);return;}
  const client=window.supabase.createClient(URL_API,PUBLISHABLE,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}});
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user?.id||!data.user.email_confirmed_at){location.replace(new URL("./",ROOT).href);return;}
  const {data:account,error:accountError}=await client.from("accounts").select("vatra_id").eq("user_id",data.user.id).maybeSingle();
  if(accountError||!validId(account?.vatra_id)){status(t("Не знайдено ваш VATRA ID.","Your VATRA ID was not found."),true);return;}
  state.client=client;state.user=data.user;state.own=String(account.vatra_id);
  $("#messenger-my-profile").href=openProfile(state.own);
  client.auth.onAuthStateChange(event=>{
   if(event==="SIGNED_OUT"){cryptoBox().lock();state.locked=true;state.subscription?.unsubscribe();location.replace(ROOT.href);}
  });
  $("#messenger-new-button").addEventListener("click",beginNew);
  $("#messenger-empty-new").addEventListener("click",beginNew);
  $("#messenger-new-cancel").addEventListener("click",()=>$("#messenger-new-dialog").close());
  $("#messenger-new-form").addEventListener("submit",async e=>{
   e.preventDefault();const id=$("#messenger-recipient-id").value.trim();
   if(!validId(id)||id===state.own){errorAt("#messenger-new-error",t("Вкажіть інший коректний VATRA ID.","Enter another valid VATRA ID."));return;}
   const {data:person,error:err}=await client.from("public_profiles").select("vatra_id,display_name").eq("vatra_id",id).maybeSingle();
   if(err||!person){errorAt("#messenger-new-error",t("Користувача не знайдено.","User not found."));return;}
   state.names.set(id,person.display_name||"VATRA ID "+id);
   $("#messenger-new-dialog").close();await choosePeer(id);
  });
  $("#messenger-back").addEventListener("click",()=>{$("#messenger-shell").dataset.activeChat="false";});
  $("#messenger-details-toggle").addEventListener("click",()=>$("#messenger-shell").dataset.details="true");
  $("#messenger-details-close").addEventListener("click",()=>$("#messenger-shell").dataset.details="false");
  $("#messenger-search").addEventListener("input",renderConversations);
  $("#messenger-compose-text").addEventListener("input",syncSend);
  $("#messenger-compose-text").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#messenger-send-form").requestSubmit();}});
  $("#messenger-send-form").addEventListener("submit",messageSend);
  $("#messenger-delete-mine").addEventListener("click",()=>void doDelete("mine"));
  $("#messenger-delete-everyone").addEventListener("click",()=>void doDelete("everyone"));
  $("#messenger-delete-cancel").addEventListener("click",()=>$("#messenger-delete-dialog").close());
  $("#messenger-key-form").addEventListener("submit",keySubmit);
  $("#messenger-key-dialog").addEventListener("cancel",event=>{if(state.locked)event.preventDefault();});
  $("#messenger-export-key").addEventListener("click",()=>void downloadBackup().catch(()=>status(t("Не вдалося зберегти резервну копію.","Backup download failed."),true)));
  $("#messenger-import-key-file").addEventListener("change",async event=>{
   try{
    const file=event.target.files?.[0];if(!file)return;
    if(file.size>32768)throw Error("Занадто великий файл ключа.");
    state.pendingImport=await file.text();
    keyDialog("import");
   }catch(_){status(t("Непридатний файл резервної копії.","Invalid backup file."),true);}
   finally{event.target.value="";}
  });
  await refresh();
  const peer=new URLSearchParams(location.search).get("to");
  if(validId(peer)&&peer!==state.own)await choosePeer(peer);
  const draft=new URLSearchParams(location.search).get("draft");
  if(draft)$("#messenger-compose-text").value=draft.slice(0,2000);
  syncSend();
  await setupKeys();
  state.subscription=client.channel("vatra-messenger-"+state.own)
   .on("postgres_changes",{event:"*",schema:"public",table:"messenger_messages",filter:"sender_id=eq."+state.own},onChange)
   .on("postgres_changes",{event:"*",schema:"public",table:"messenger_messages",filter:"recipient_id=eq."+state.own},onChange)
   .subscribe();
  state.poll=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},25000);
  window.addEventListener("pagehide",()=>{clearInterval(state.poll);if(state.subscription)void client.removeChannel(state.subscription);});
  document.addEventListener("visibilitychange",onChange);
 }
 void init().catch(()=>status(t("Не вдалося запустити месенджер. Оновіть сторінку.","Messenger startup failed. Reload."),true));
})();