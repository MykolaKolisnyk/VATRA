/* VATRA • Group conversations. Uses the same Supabase-backed app_data layer.
   Apply vatra-group-chats.sql BEFORE using this module. */
import {initializeApp,getAuth,getDatabase,onAuthStateChanged,ref,get,set,push,onValue} from './vatra-backend.js?v=20261031-7';

const groupAuth=getAuth(initializeApp()),groupDb=getDatabase(initializeApp());
let myUid='',groupIndex={},groupReads={},activeGroupId='',activeGroupMessages={},activeGroupMeta=null;
let stopIndex=null,stopReads=null,stopMessages=null,stopMetadata=null;
let groupRoster=[],groupIsOpening=false;
const $=selector=>document.querySelector(selector);
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function when(ts){const t=Number(ts)||0;return t?new Date(t).toLocaleString('uk-UA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';}
function notify(message){const out=$('#vatraGroupChatNotice');if(out){out.textContent=message;out.hidden=false;}else{const note=document.createElement('div');note.className='vatra-group-toast';note.textContent=message;document.body.append(note);setTimeout(()=>note.remove(),4500);}}
function eligibleMessage(value){return value&&typeof value==='object'&&typeof value.text==='string'&&value.senderUid;}
function unreadCount(){return Object.entries(groupIndex).filter(([id,g])=>g?.lastMessage?.senderUid&&g.lastMessage.senderUid!==myUid&&Number(g.lastMessage.createdAt||0)>Number(groupReads[id]||0)).length;}
function refreshBadge(){window.vatraGroupUnreadCount=unreadCount();window.vatraRefreshMessageBadge?.();}
function setStateOfActiveGroup(){
 const section=$('.vatra-messenger .vatra-group-chat-block');if(!section)return;
 section.querySelectorAll('[data-open-vatra-group]').forEach(b=>b.classList.toggle('active',b.dataset.openVatraGroup===activeGroupId));
}
function renderGroupList(){
 const block=$('.vatra-messenger .vatra-group-chat-block');
 if(!block)return;
 const entries=Object.entries(groupIndex).sort((a,b)=>(Number(b[1]?.updatedAt)||0)-(Number(a[1]?.updatedAt)||0));
 const html=entries.map(([id,g])=>{
  const unread=g?.lastMessage?.senderUid!==myUid&&Number(g?.lastMessage?.createdAt||0)>Number(groupReads[id]||0);
  const count=Object.keys(g?.members||{}).length;
  return '<button type="button" class="vatra-group-row'+(id===activeGroupId?' active':'')+'" data-open-vatra-group="'+esc(id)+'">'+
   '<span class="vatra-group-avatar" aria-hidden="true">♧</span><span class="vatra-group-copy"><b>'+esc(g.title||'Бесіда')+'</b><small>'+esc(g.lastMessage?.text||(count+' учасників'))+'</small></span>'+
   (unread?'<span class="vatra-group-unread" aria-label="Нове повідомлення"></span>':'')+
   '</button>';
 }).join('');
 const list=block.querySelector('#vatraGroupChatRows');
 if(list)list.innerHTML=html||'<p class="vatra-group-empty">Бесід поки немає. Створіть першу.</p>';
 setStateOfActiveGroup();refreshBadge();
}
function mount(){
 if(!myUid)return;
 const side=$('.vatra-messenger .vatra-messenger-sidebar');
 if(!side)return;
 let block=side.querySelector('.vatra-group-chat-block');
 if(!block){
  block=document.createElement('section');
  block.className='vatra-group-chat-block';
  block.innerHTML='<div class="vatra-group-chat-heading"><h3>Групові бесіди</h3><button type="button" id="vatraGroupChatCreate" aria-label="Створити групову бесіду">＋ Створити</button></div><div id="vatraGroupChatRows" class="vatra-group-chat-rows"></div>';
  const footer=side.querySelector('.vatra-messenger-footer');
  if(footer)footer.before(block);else side.append(block);
 }
 renderGroupList();
 if(activeGroupId)renderGroupWindow();
}
function ensureDialog(){
 let dialog=$('#vatraGroupCreateDialog');
 if(dialog)return dialog;
 dialog=document.createElement('dialog');
 dialog.id='vatraGroupCreateDialog';dialog.className='vatra-group-dialog';
 dialog.innerHTML='<form id="vatraGroupCreateForm"><header><div><small>ПОВІДОМЛЕННЯ ВАТРИ</small><h2>Нова групова бесіда</h2></div><button class="vatra-group-dialog-close" type="button" data-close-vatra-group aria-label="Закрити">×</button></header>'+
  '<label for="vatraGroupTitle">Назва бесіди</label><input id="vatraGroupTitle" name="title" type="text" minlength="3" maxlength="70" placeholder="Наприклад, Наші друзі" required>'+
  '<label class="vatra-group-members-label">Учасники <span id="vatraGroupSelectedCount">0 обрано</span></label>'+
  '<input id="vatraGroupFriendSearch" type="search" placeholder="Пошук серед друзів" aria-label="Пошук друзів">'+
  '<div id="vatraGroupFriends" class="vatra-group-friends"><p>Завантажуємо друзів…</p></div>'+
  '<p id="vatraGroupCreateError" class="vatra-group-form-error" role="alert" hidden></p>'+
  '<footer><button type="button" class="vatra-group-secondary" data-close-vatra-group>Скасувати</button><button class="vatra-group-primary" type="submit">Створити бесіду</button></footer></form>';
 document.body.append(dialog);
 dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('[data-close-vatra-group]'))dialog.close();});
 dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();});
 dialog.querySelector('#vatraGroupFriendSearch').addEventListener('input',filterFriends);
 dialog.querySelector('#vatraGroupFriends').addEventListener('change',updateSelectedCount);
 dialog.querySelector('form').addEventListener('submit',createConversation);
 return dialog;
}
function updateSelectedCount(){
 const root=$('#vatraGroupFriends');
 const count=root?root.querySelectorAll('input[type=checkbox]:checked').length:0;
 const label=$('#vatraGroupSelectedCount');if(label)label.textContent=count+' обрано';
}
function filterFriends(){
 const input=$('#vatraGroupFriendSearch');
 const q=(input?.value||'').trim().toLocaleLowerCase('uk-UA');
 $('#vatraGroupFriends')?.querySelectorAll('[data-vatra-friend-name]').forEach(item=>{item.hidden=!item.dataset.vatraFriendName.includes(q);});
}
async function openCreateDialog(){
 if(groupIsOpening)return;
 groupIsOpening=true;
 const dialog=ensureDialog(),form=dialog.querySelector('form');
 form.reset();$('#vatraGroupFriends').innerHTML='<p>Завантажуємо друзів…</p>';
 $('#vatraGroupCreateError').hidden=true;updateSelectedCount();
 dialog.showModal();$('#vatraGroupTitle').focus();
 try{
  const snapshot=await get(ref(groupDb,'friends/'+myUid));
  const friendIds=Object.keys(snapshot.val()||{}).filter(id=>id!==myUid&&snapshot.val()?.[id]).slice(0,150);
  const friendRows=await Promise.all(friendIds.map(async id=>{
   try{
    const user=(await get(ref(groupDb,'publicProfiles/'+id))).val();
    const name=String(user?.name||user?.displayName||'Користувач ВАТРИ');
    return {id,name,handle:String(user?.handle||'')};
   }catch{return null;}
  }));
  groupRoster=friendRows.filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'uk-UA'));
  const root=$('#vatraGroupFriends');
  if(!root||!dialog.open)return;
  root.innerHTML=groupRoster.length?groupRoster.map(friend=>'<label class="vatra-group-friend" data-vatra-friend-name="'+esc((friend.name+' '+friend.handle).toLocaleLowerCase('uk-UA'))+'"><input type="checkbox" value="'+esc(friend.id)+'"><span class="vatra-group-friend-avatar">◎</span><span><b>'+esc(friend.name)+'</b><small>'+esc(friend.handle?'@'+friend.handle:'У друзях')+'</small></span></label>').join(''):'<p>У списку друзів поки немає користувачів для запрошення.</p>';
  updateSelectedCount();
 }catch(error){if(dialog.open)$('#vatraGroupFriends').innerHTML='<p>Не вдалося завантажити друзів. Перевірте з’єднання та доступ до Supabase.</p>';}
 finally{groupIsOpening=false;}
}
async function createConversation(e){
 e.preventDefault();if(!myUid)return;
 const form=e.currentTarget,btn=form.querySelector('[type=submit]'),error=$('#vatraGroupCreateError');
 const title=String(form.elements.title.value||'').trim();
 const ids=[...new Set([...form.querySelectorAll('#vatraGroupFriends input:checked')].map(el=>el.value))].filter(id=>groupRoster.some(f=>f.id===id));
 if(title.length<3||title.length>70||ids.length<1||ids.length>19){
  error.hidden=false;error.textContent='Введіть назву (3–70 символів) і оберіть від 1 до 19 друзів.';return;
 }
 const members={[myUid]:true};ids.forEach(id=>members[id]=true);
 btn.disabled=true;error.hidden=true;
 try{
  const conversation=push(ref(groupDb,'groupConversations'));
  const createdAt=Date.now();
  await set(conversation,{title,ownerUid:myUid,members,createdAt});
  ensureDialog().close();
  activeGroupId=conversation.key;
  mount();
  renderGroupWindow();
 }catch(err){
  error.hidden=false;
  error.textContent=String(err?.message||'Помилка створення. Перевірте vatra-group-chats.sql у Supabase.');
 }finally{btn.disabled=false;}
}
function stopActiveGroupWatchers(){
 stopMessages?.();stopMessages=null;
 stopMetadata?.();stopMetadata=null;
 activeGroupMessages={};activeGroupMeta=null;
}
function openGroup(id){
 if(!myUid||!groupIndex[id])return;
 if(activeGroupId!==id){stopActiveGroupWatchers();activeGroupId=id;}
 stopMessages?.();stopMetadata?.();
 stopMetadata=onValue(ref(groupDb,'groupConversations/'+id),snapshot=>{
  const item=snapshot.val();
  if(!item||!item.members?.[myUid]){
   stopActiveGroupWatchers();activeGroupId='';mount();notify('Ви більше не є учасником цієї бесіди.');return;
  }
  activeGroupMeta=item;
  renderGroupWindow();
 },error=>notify('Не вдалося перевірити учасників бесіди: '+error.message));
 stopMessages=onValue(ref(groupDb,'groupMessages/'+id),snapshot=>{
  activeGroupMessages=snapshot.val()||{};
  renderGroupMessages();
  markGroupRead(id);
 },error=>notify('Не вдалося отримати повідомлення: '+error.message));
 renderGroupWindow();setStateOfActiveGroup();
}
function renderGroupWindow(){
 if(!activeGroupId||!$('.vatra-messenger-shell'))return;
 const g=activeGroupMeta||groupIndex[activeGroupId];
 if(!g)return;
 const shell=$('.vatra-messenger-shell');
 let win=shell.querySelector('.vatra-group-chat-window');
 if(!win){
  const original=shell.querySelector('.vatra-messenger-empty,article.chat-window');
  if(!original)return;
  const article=document.createElement('article');article.className='post chat-window vatra-group-chat-window';
  original.replaceWith(article);win=article;
 }
 const count=Object.keys(g.members||{}).length;
 win.innerHTML='<header class="vatra-group-window-head"><button type="button" class="vatra-group-back" data-leave-vatra-group aria-label="До списку бесід">‹</button>'+
  '<span class="vatra-group-avatar" aria-hidden="true">♧</span><span><b>'+esc(g.title||'Групова бесіда')+'</b><small>'+count+' учасників</small></span></header>'+
  '<div id="vatraGroupMessageList" class="chat-messages vatra-group-message-list" aria-live="polite"></div>'+
  '<form id="vatraGroupSendForm" class="chat-send vatra-group-send"><input name="message" maxlength="2000" required placeholder="Написати в бесіду…" aria-label="Нове повідомлення"><button class="primary" type="submit">Надіслати</button></form>'+
  '<p id="vatraGroupChatNotice" role="status" hidden></p>';
 win.querySelector('form').addEventListener('submit',sendGroupMessage);
 renderGroupMessages();setStateOfActiveGroup();
}
function renderGroupMessages(){
 const container=$('#vatraGroupMessageList');if(!container||!activeGroupId)return;
 const arr=Object.entries(activeGroupMessages).filter(([,m])=>eligibleMessage(m))
  .map(([id,m])=>({...m,id})).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)).slice(-150);
 const knownRoster=Object.fromEntries(groupRoster.map(x=>[x.id,x.name]));
 container.innerHTML=arr.length?arr.map(m=>{
  const mine=m.senderUid===myUid;
  const sender=mine?'Ви':knownRoster[m.senderUid]||'Учасник';
  return '<div class="vatra-group-bubble'+(mine?' mine':'')+'"><div class="vatra-group-bubble-meta"><b>'+esc(sender)+'</b><small>'+esc(when(m.createdAt))+'</small></div><p>'+esc(m.text)+'</p></div>';
 }).join(''):'<div class="vatra-group-no-messages"><b>Бесіда створена</b><p>Напишіть перше повідомлення своїм друзям.</p></div>';
 container.scrollTop=container.scrollHeight;
}
async function sendGroupMessage(e){
 e.preventDefault();if(!myUid||!activeGroupId)return;
 const form=e.currentTarget,input=form.elements.message,button=form.querySelector('button[type=submit]');
 const text=String(input.value||'').trim();
 if(!text)return;
 button.disabled=true;$('#vatraGroupChatNotice').hidden=true;
 try{
  await set(push(ref(groupDb,'groupMessages/'+activeGroupId)),{senderUid:myUid,text:text.slice(0,2000),createdAt:Date.now()});
  input.value='';
 }catch(error){notify('Повідомлення не відправлено. Перевірте SQL для бесід. '+String(error?.message||''));}
 finally{button.disabled=false;input.focus();}
}
function markGroupRead(id){
 if(!myUid||id!==activeGroupId||document.hidden)return;
 const last=Math.max(0,...Object.values(activeGroupMessages).map(m=>Number(m?.createdAt)||0));
 if(!last||Number(groupReads[id]||0)>=last)return;
 const stamp=Date.now();groupReads={...groupReads,[id]:stamp};
 refreshBadge();renderGroupList();
 set(ref(groupDb,'groupChatReads/'+myUid+'/'+id),stamp).catch(error=>console.debug('[VATRA] group read receipt',error.message));
}
document.addEventListener('click',event=>{
 const create=event.target.closest('#vatraGroupChatCreate');
 if(create){event.preventDefault();void openCreateDialog();return;}
 const open=event.target.closest('[data-open-vatra-group]');
 if(open){event.preventDefault();openGroup(open.dataset.openVatraGroup);return;}
 const back=event.target.closest('[data-leave-vatra-group]');
 if(back){
  event.preventDefault();stopActiveGroupWatchers();activeGroupId='';
  const shell=$('.vatra-messenger-shell'),win=shell?.querySelector('.vatra-group-chat-window');
  if(win){win.outerHTML='<section class="vatra-messenger-empty"><h2>Ваші повідомлення</h2><p>Оберіть діалог або групову бесіду.</p></section>';}
  setStateOfActiveGroup();return;
 }
 if(event.target.closest('[data-open-chat],[data-message-user],#backChats')){
  if(activeGroupId){stopActiveGroupWatchers();activeGroupId='';}
 }
},true);
window.addEventListener('vatra:messenger-rendered',mount);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&activeGroupId)markGroupRead(activeGroupId);});
onAuthStateChanged(groupAuth,user=>{
 const uid=user?.uid||'';
 if(uid===myUid)return;
 stopIndex?.();stopReads?.();stopActiveGroupWatchers();
 myUid=uid;activeGroupId='';groupIndex={};groupReads={};groupRoster=[];
 if(!uid){refreshBadge();return;}
 stopIndex=onValue(ref(groupDb,'groupChatIndex/'+uid),snapshot=>{
  groupIndex=snapshot.val()||{};
  if(activeGroupId&&!groupIndex[activeGroupId]){
   stopActiveGroupWatchers();activeGroupId='';
  }
  mount();refreshBadge();
 },error=>console.warn('[VATRA] Group chat index:',error.message));
 stopReads=onValue(ref(groupDb,'groupChatReads/'+uid),snapshot=>{
  groupReads=snapshot.val()||{};
  renderGroupList();refreshBadge();
 },error=>console.warn('[VATRA] Group chat reads:',error.message));
});
