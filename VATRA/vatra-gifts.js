/* ВАТРА · оригінальні подарунки. Усі операції з власністю — тільки через RPC у Supabase. */
import {initializeApp,getAuth,getDatabase} from './vatra-backend.js?v=20261031-7';
const client=getDatabase(initializeApp()).client,auth=getAuth(initializeApp());
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const catalog=[
 {code:'halloween',title:'Гарбузик ВАТРИ',event:'31 жовтня',type:'holiday'},
 {code:'newyear',title:'Новорічна ялинка',event:'1 січня',type:'holiday'},
 {code:'independence',title:'Серце України',event:'24 серпня',type:'holiday'},
 {code:'warmth',title:'Теплі обійми',event:'У розробника',type:'premium'},
 {code:'bouquet',title:'Букет ВАТРИ',event:'У розробника',type:'premium'},
 {code:'spark',title:'Іскра дружби',event:'У розробника',type:'premium'}
];
const paths={
 halloween:'<path d="M82 70q-20-17-42-3c-18 13-18 47 2 65 21 21 59 27 84 11 28-19 31-61 10-76-17-12-38-8-54 3Z" fill="#FF9B34" stroke="#D76022" stroke-width="3"/><path d="M80 73q-22 20-14 56m40-55q17 18 9 56" fill="none" stroke="#E77926" stroke-width="5"/><path d="M82 67q-5-18 3-27m0 20q18-17 33-10" fill="none" stroke="#598C58" stroke-width="8" stroke-linecap="round"/><path d="m55 93 11-9 8 13Zm42 1 12-11 7 15Z" fill="#55334B"/><path d="M69 116q17 16 35-1" fill="none" stroke="#55334B" stroke-width="5" stroke-linecap="round"/><path d="M119 55q22-18 27 8m-16-21 5-15" fill="none" stroke="#A9A3F9" stroke-width="3" stroke-linecap="round"/>',
 newyear:'<path d="M84 26 44 85h21l-31 42h99l-30-42h20Z" fill="#43AD80" stroke="#167D67" stroke-width="4" stroke-linejoin="round"/><path d="M83 30 77 16l-10 20 21-8Z" fill="#FFD65D" stroke="#F3A531" stroke-width="2"/><path d="M62 58q23 15 44 1M49 96q31 21 70 0" fill="none" stroke="#DFF7DC" stroke-width="6" stroke-linecap="round"/><circle cx="69" cy="76" r="6" fill="#F15F82"/><circle cx="102" cy="85" r="7" fill="#F9C74F"/><circle cx="74" cy="111" r="7" fill="#75B8FF"/><circle cx="103" cy="116" r="5" fill="#F37877"/><path d="M78 128v20h13v-20" fill="#C68652" stroke="#996039" stroke-width="2"/>',
 independence:'<path d="M83 141C60 124 26 105 28 76c2-33 42-38 55-15 13-23 53-18 55 15 2 30-31 47-55 65Z" fill="#2C8DDA" stroke="#125FBC" stroke-width="3"/><path d="M28 82c6 22 32 40 55 59 24-19 47-37 55-59Z" fill="#FFD456"/><path d="M83 62v53m-12-20 12 9 12-9m-12 10-13 10m13-10 13 10M70 82v10m26-10v10" stroke="#FEFCF0" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M71 75q12-16 24 0" stroke="#FEFCF0" stroke-width="3" fill="none"/>',
 warmth:'<ellipse cx="83" cy="118" rx="46" ry="29" fill="#D1A789"/><circle cx="83" cy="72" r="39" fill="#F4D2B4" stroke="#D49B7A" stroke-width="3"/><circle cx="49" cy="42" r="16" fill="#E7B795"/><circle cx="116" cy="42" r="16" fill="#E7B795"/><circle cx="49" cy="43" r="7" fill="#F6DDCA"/><circle cx="116" cy="43" r="7" fill="#F6DDCA"/><ellipse cx="67" cy="72" rx="5" ry="6" fill="#554447"/><ellipse cx="98" cy="72" rx="5" ry="6" fill="#554447"/><ellipse cx="83" cy="88" rx="14" ry="11" fill="#FBE6CF"/><path d="M77 85q6-7 12 0-4 8-12 0Z" fill="#77535D"/><path d="M52 110q25 31 61 0" fill="none" stroke="#FCEDDF" stroke-width="13" stroke-linecap="round"/><path d="M57 132q26 10 52 0" fill="none" stroke="#A36E5B" stroke-width="4"/>',
 bouquet:'<path d="m55 69 28 79 29-79-29 23Z" fill="#CDE9F8" stroke="#6598BE" stroke-width="3"/><path d="M58 105q25 8 49 0" stroke="#F09BB4" stroke-width="9"/><path d="M83 138V79M83 106l-19-31M83 102l21-31" stroke="#488C69" stroke-width="4"/><circle cx="62" cy="64" r="17" fill="#FF92AE"/><circle cx="82" cy="48" r="17" fill="#F8CB5D"/><circle cx="106" cy="65" r="17" fill="#9AA9F6"/><circle cx="60" cy="62" r="7" fill="#FFF1CF"/><circle cx="82" cy="46" r="7" fill="#FFF1CF"/><circle cx="106" cy="63" r="7" fill="#FFF1CF"/><path d="m66 105 17 9 17-9" fill="none" stroke="#F08BA1" stroke-width="7" stroke-linecap="round"/>',
 spark:'<circle cx="83" cy="83" r="54" fill="#EAF5FF" stroke="#99C8F4" stroke-width="2"/><path d="m83 30 13 39 42 14-42 13-13 39-13-39-42-13 42-14Z" fill="#FFCE5E" stroke="#F1A938" stroke-width="3" stroke-linejoin="round"/><circle cx="83" cy="83" r="10" fill="#FFFCDF"/><path d="M47 45 39 38m79 14 9-8M44 121l-8 8m81-9 8 9" stroke="#6FA9EB" stroke-width="4" stroke-linecap="round"/>'
};
function art(code){
 return '<svg class="vatra-gift-art" viewBox="0 0 166 166" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+esc(catalog.find(x=>x.code===code)?.title||'Подарунок ВАТРИ')+'"><ellipse cx="83" cy="152" rx="40" ry="6" fill="#24446D" opacity=".08"/>'+(paths[code]||paths.spark)+'</svg>';
}
let opened=0,selectedTab='mine',selectedReceiver='',inventory={items:[],visibility:'everyone'},networkReady=false,showing=false,notice='';
const available=()=>auth.currentUser?.uid;
function safeData(data){return data&&Array.isArray(data.items)?data:{items:[],visibility:'everyone'};}
function friends(){return (window.vatraGiftFriends?.()||[]).filter(x=>x&&x.uid&&x.uid!==available());}
async function call(fn,args){const {data,error}=await client.rpc(fn,args||{});if(error)throw error;return data;}
function status(message,error=false){
 const el=document.querySelector('[data-vatra-gift-message]');
 if(el){el.textContent=message;el.classList.toggle('is-error',error);}
}
function card(item,owned=false){
 const artType=catalog.find(x=>x.code===item.code)||catalog[5];
 return '<article class="vatra-gift-card">'+
  '<div class="vatra-gift-image">'+art(item.code)+'</div><h3>'+esc(artType.title)+'</h3>'+
  '<p>'+esc(owned?(item.source==='holiday'?'Святковий подарунок':item.source==='developer'?'Придбано у ВАТРІ':'Від друга'):artType.type==='holiday'?'Безкоштовно · '+artType.event:'Платний · у розробника')+'</p>'+
  (owned?'<button type="button" data-vatra-send-item="'+esc(item.id)+'">Подарувати другу</button>':
    artType.type==='premium'?'<button type="button" data-vatra-buy>Як придбати</button>':
    '<span class="vatra-gift-free-label">Видається у свято</span>')+'</article>';
}
function view(){
 const box=document.querySelector('#feed');
 if(!box||document.body.dataset.page!=='gifts')return;
 showing=true;
 const own=inventory.items||[],tab=selectedTab,ff=friends();
 const opts=ff.map(f=>'<option value="'+esc(f.uid)+'" '+(f.uid===selectedReceiver?'selected':'')+'>'+esc(f.name||f.uid)+'</option>').join('');
 box.innerHTML='<section class="vatra-gifts-page"><header class="vatra-gifts-header"><div><p class="vatra-gifts-eyebrow">КОЛЕКЦІЯ ВАТРИ</p><h1>Подарунки</h1><p>Збирайте оригінальні подарунки ВАТРИ та даруйте їх друзям.</p></div><div class="vatra-gift-summary">'+own.length+' <small>у колекції</small></div></header>'+
  '<nav class="vatra-gifts-tabs" aria-label="Розділи подарунків"><button data-vatra-gifts-tab="mine" '+(tab==='mine'?'aria-current="page"':'')+'>Мої подарунки</button><button data-vatra-gifts-tab="catalog" '+(tab==='catalog'?'aria-current="page"':'')+'>Усі подарунки</button></nav>'+
  '<div class="vatra-gift-notice" data-vatra-gift-message role="status">'+esc(notice)+'</div>'+
  (tab==='mine'?'<div class="vatra-gift-privacy"><label for="vatraGiftPrivacy">Кому видно мої подарунки</label><select id="vatraGiftPrivacy" data-vatra-gift-visibility><option value="everyone" '+(inventory.visibility==='everyone'?'selected':'')+'>Усім</option><option value="friends" '+(inventory.visibility==='friends'?'selected':'')+'>Лише друзям</option><option value="only_me" '+(inventory.visibility==='only_me'?'selected':'')+'>Лише мені</option></select></div>'+
   (own.length?'<div class="vatra-gifts-grid">'+own.map(x=>card(x,true)).join('')+'</div>':'<div class="vatra-gift-empty">У Вашій колекції ще немає подарунків. Святкові подарунки ВАТРА видає автоматично у визначені дні.</div>'):
   '<p class="vatra-gifts-intro">Святкові подарунки безкоштовні в день події. Платні подарунки видає розробник після підтвердженої покупки.</p><div class="vatra-gifts-grid">'+catalog.map(x=>card(x,false)).join('')+'</div>')+
  '<div class="vatra-gift-send" id="vatraGiftSend" hidden><div><h2>Подарувати другу</h2><p>Після надсилання подарунок зникне з Вашої колекції та з’явиться в отримувача.</p></div><label>Одержувач<select data-vatra-gift-recipient><option value="">Оберіть друга</option>'+opts+'</select></label><div class="vatra-gift-send-actions"><button type="button" data-vatra-gift-cancel>Скасувати</button><button type="button" class="vatra-gift-primary" data-vatra-gift-confirm>Надіслати</button></div></div></section>';
}
async function show(uid){
 const gen=++opened;showing=false;networkReady=false;notice='';
 const box=document.querySelector('#feed');if(!box||document.body.dataset.page!=='gifts')return;
 box.innerHTML='<section class="vatra-gifts-page vatra-gift-loading"><h1>Подарунки</h1><p>Завантаження колекції…</p></section>';
 if(!uid){box.innerHTML='<section class="vatra-gifts-page"><h1>Подарунки</h1><p>Увійдіть до ВАТРИ, щоб переглядати й дарувати подарунки.</p></section>';return;}
 try{
  await call('vatra_gifts_claim_holiday');
  const data=await call('vatra_gifts_inventory');if(gen!==opened)return;
  inventory=safeData(data);networkReady=true;view();
 }catch(err){
  if(gen!==opened)return;
  box.innerHTML='<section class="vatra-gifts-page"><h1>Подарунки</h1><p>Систему подарунків ще не активовано в Supabase. Розробник має виконати SQL-міграцію <code>vatra-gifts.sql</code>.</p><p class="vatra-gift-muted">Поки сервер не налаштований, чужі або вигадані подарунки не відображаються.</p></section>';
  console.warn('[ВАТРА подарунки]',err.message);
 }
}
window.vatraRenderGifts=show;
window.vatraGiftsArt=art;
document.addEventListener('click',async e=>{
 const tab=e.target.closest('[data-vatra-gifts-tab]');if(tab){selectedTab=tab.dataset.vatraGiftsTab;notice='';view();return;}
 if(e.target.closest('[data-vatra-buy]')){
  status('Платні подарунки продає тільки розробник ВАТРИ. Для придбання зверніться до техпідтримки; видавання можливе лише після підтвердження оплати.');
  return;
 }
 const gift=e.target.closest('[data-vatra-send-item]');
 if(gift){
  if(!networkReady)return;
  const item=inventory.items.find(x=>x.id===gift.dataset.vatraSendItem);
  if(!item)return;
  const pane=document.getElementById('vatraGiftSend');if(!pane)return;
  pane.dataset.itemId=item.id;pane.hidden=false;pane.scrollIntoView({block:'nearest',behavior:'smooth'});return;
 }
 if(e.target.closest('[data-vatra-gift-cancel]')){
  document.querySelector('#vatraGiftSend').hidden=true;return;
 }
 if(e.target.closest('[data-vatra-gift-confirm]')){
  const pane=document.querySelector('#vatraGiftSend'),select=pane?.querySelector('[data-vatra-gift-recipient]');
  const id=pane?.dataset.itemId,receiver=select?.value;if(!id||!receiver){status('Оберіть друга, якому хочете подарувати.',true);return;}
  const btn=e.target;btn.disabled=true;
  try{await call('vatra_gifts_send',{_item_id:id,_recipient:receiver});notice='Подарунок успішно передано другу.';pane.hidden=true;await show(available());}
  catch(err){status(err.message||'Не вдалося передати подарунок.',true);}
  finally{btn.disabled=false;}
 }
});
document.addEventListener('change',async e=>{
 if(!e.target.matches('[data-vatra-gift-visibility]'))return;
 const el=e.target;const next=el.value;el.disabled=true;
 try{await call('vatra_gifts_set_visibility',{_visibility:next});inventory.visibility=next;status('Приватність подарунків збережено.');}
 catch(err){el.value=inventory.visibility;status(err.message||'Не вдалося зберегти приватність.',true);}
 finally{el.disabled=false;}
});
async function refreshPreview(el,owner){
 const id=String(owner||'');if(!/^[0-9a-f-]{36}$/i.test(id))return;
 const existing=el.dataset.giftPreviewFor;if(existing===id)return;
 el.dataset.giftPreviewFor=id;el.innerHTML='<h3>Подарунки</h3><p class="vatra-gift-muted">Завантаження…</p>';
 try{
  const data=await call('vatra_gifts_public',{_owner:id});
  if(!el.isConnected||el.dataset.giftPreviewFor!==id)return;
  const arr=Array.isArray(data)?data:[];
  el.innerHTML='<h3>Подарунки <small>'+arr.length+'</small></h3>'+
    (arr.length?'<div class="vatra-gift-preview-row">'+arr.slice(0,3).map(x=>art(x.code)).join('')+'</div>':'<p class="vatra-gift-muted">Немає доступних подарунків</p>')+
    (available()===id?'<button type="button" data-page="gifts" class="vatra-gift-preview-link">Усі подарунки</button>':'');
 }catch{el.innerHTML='<h3>Подарунки</h3><p class="vatra-gift-muted">Поки недоступні</p>';}
}
let previewScheduled=false;
function scanPreviews(){
 previewScheduled=false;
 const p=document.body.dataset.page;if(p!=='profile'&&p!=='publicProfile')return;
 const id=window.vatraGiftProfileUid?.();if(!id)return;
 const parent=document.querySelector('#feed .vatra-profile-sidebar');
 if(!parent)return;
 let el=parent.querySelector('.vatra-gift-preview-card');
 if(!el){el=document.createElement('section');el.className='vatra-profile-card vatra-gift-preview-card';parent.append(el);}
 if(el.dataset.giftPreviewFor!==id)void refreshPreview(el,id);
}
function queuePreview(){if(previewScheduled)return;previewScheduled=true;requestAnimationFrame(scanPreviews);}
const feed=document.querySelector('#feed');
if(feed)new MutationObserver(queuePreview).observe(feed,{childList:true,subtree:false});
window.addEventListener('vatra:started',queuePreview);
