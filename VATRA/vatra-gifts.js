/* ВАТРА · оригінальні подарунки. Усі операції з власністю — тільки через RPC у Supabase. */
import {initializeApp,getAuth,getDatabase} from './vatra-backend.js?v=20261031-7';
const client=getDatabase(initializeApp()).client,auth=getAuth(initializeApp());
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const catalog=[
 {code:'halloween',title:'Гарбузик ВАТРИ',event:'31 жовтня',type:'holiday'},
 {code:'newyear',title:'Новорічна ялинка',event:'1 січня',type:'holiday'},
 {code:'independence',title:'Серце України',event:'24 серпня',type:'holiday'},
 {code:'warmth',title:'Теплі обійми',type:'premium',price:30},
 {code:'bouquet',title:'Букет ВАТРИ',type:'premium',price:35},
 {code:'spark',title:'Іскра дружби',type:'premium',price:20},
 {code:'welcome',title:'Перша іскра ВАТРИ',type:'free',event:'Після реєстрації'},
 {code:'gold_pumpkin',title:'Золотий гарбуз',type:'premium',price:20},
 {code:'rose',title:'Квітка дружби',type:'premium',price:20},
 {code:'cocoa',title:'Тепле какао',type:'premium',price:25},
 {code:'cupcake',title:'Святковий кекс',type:'premium',price:30},
 {code:'lantern',title:'Ліхтарик ВАТРИ',type:'premium',price:35},
 {code:'ribbon',title:'Стрічка щастя',type:'premium',price:20},
 {code:'sun',title:'Сонечко',type:'premium',price:25},
 {code:'teddy',title:'Ведмедик ВАТРИ',type:'premium',price:40},
 {code:'hearts',title:'Два серця',type:'premium',price:30},
 {code:'firebird',title:'Вогняний птах',type:'premium',price:75}
];
const paths={
 halloween:'<path d="M82 70q-20-17-42-3c-18 13-18 47 2 65 21 21 59 27 84 11 28-19 31-61 10-76-17-12-38-8-54 3Z" fill="#FF9B34" stroke="#D76022" stroke-width="3"/><path d="M80 73q-22 20-14 56m40-55q17 18 9 56" fill="none" stroke="#E77926" stroke-width="5"/><path d="M82 67q-5-18 3-27m0 20q18-17 33-10" fill="none" stroke="#598C58" stroke-width="8" stroke-linecap="round"/><path d="m55 93 11-9 8 13Zm42 1 12-11 7 15Z" fill="#55334B"/><path d="M69 116q17 16 35-1" fill="none" stroke="#55334B" stroke-width="5" stroke-linecap="round"/><path d="M119 55q22-18 27 8m-16-21 5-15" fill="none" stroke="#A9A3F9" stroke-width="3" stroke-linecap="round"/>',
 newyear:'<path d="M84 26 44 85h21l-31 42h99l-30-42h20Z" fill="#43AD80" stroke="#167D67" stroke-width="4" stroke-linejoin="round"/><path d="M83 30 77 16l-10 20 21-8Z" fill="#FFD65D" stroke="#F3A531" stroke-width="2"/><path d="M62 58q23 15 44 1M49 96q31 21 70 0" fill="none" stroke="#DFF7DC" stroke-width="6" stroke-linecap="round"/><circle cx="69" cy="76" r="6" fill="#F15F82"/><circle cx="102" cy="85" r="7" fill="#F9C74F"/><circle cx="74" cy="111" r="7" fill="#75B8FF"/><circle cx="103" cy="116" r="5" fill="#F37877"/><path d="M78 128v20h13v-20" fill="#C68652" stroke="#996039" stroke-width="2"/>',
 independence:'<path d="M83 141C60 124 26 105 28 76c2-33 42-38 55-15 13-23 53-18 55 15 2 30-31 47-55 65Z" fill="#2C8DDA" stroke="#125FBC" stroke-width="3"/><path d="M28 82c6 22 32 40 55 59 24-19 47-37 55-59Z" fill="#FFD456"/><path d="M83 62v53m-12-20 12 9 12-9m-12 10-13 10m13-10 13 10M70 82v10m26-10v10" stroke="#FEFCF0" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M71 75q12-16 24 0" stroke="#FEFCF0" stroke-width="3" fill="none"/>',
 warmth:'<ellipse cx="83" cy="118" rx="46" ry="29" fill="#D1A789"/><circle cx="83" cy="72" r="39" fill="#F4D2B4" stroke="#D49B7A" stroke-width="3"/><circle cx="49" cy="42" r="16" fill="#E7B795"/><circle cx="116" cy="42" r="16" fill="#E7B795"/><circle cx="49" cy="43" r="7" fill="#F6DDCA"/><circle cx="116" cy="43" r="7" fill="#F6DDCA"/><ellipse cx="67" cy="72" rx="5" ry="6" fill="#554447"/><ellipse cx="98" cy="72" rx="5" ry="6" fill="#554447"/><ellipse cx="83" cy="88" rx="14" ry="11" fill="#FBE6CF"/><path d="M77 85q6-7 12 0-4 8-12 0Z" fill="#77535D"/><path d="M52 110q25 31 61 0" fill="none" stroke="#FCEDDF" stroke-width="13" stroke-linecap="round"/><path d="M57 132q26 10 52 0" fill="none" stroke="#A36E5B" stroke-width="4"/>',
 bouquet:'<path d="m55 69 28 79 29-79-29 23Z" fill="#CDE9F8" stroke="#6598BE" stroke-width="3"/><path d="M58 105q25 8 49 0" stroke="#F09BB4" stroke-width="9"/><path d="M83 138V79M83 106l-19-31M83 102l21-31" stroke="#488C69" stroke-width="4"/><circle cx="62" cy="64" r="17" fill="#FF92AE"/><circle cx="82" cy="48" r="17" fill="#F8CB5D"/><circle cx="106" cy="65" r="17" fill="#9AA9F6"/><circle cx="60" cy="62" r="7" fill="#FFF1CF"/><circle cx="82" cy="46" r="7" fill="#FFF1CF"/><circle cx="106" cy="63" r="7" fill="#FFF1CF"/><path d="m66 105 17 9 17-9" fill="none" stroke="#F08BA1" stroke-width="7" stroke-linecap="round"/>',
 spark:'<circle cx="83" cy="83" r="54" fill="#EAF5FF" stroke="#99C8F4" stroke-width="2"/><path d="m83 30 13 39 42 14-42 13-13 39-13-39-42-13 42-14Z" fill="#FFCE5E" stroke="#F1A938" stroke-width="3" stroke-linejoin="round"/><circle cx="83" cy="83" r="10" fill="#FFFCDF"/><path d="M47 45 39 38m79 14 9-8M44 121l-8 8m81-9 8 9" stroke="#6FA9EB" stroke-width="4" stroke-linecap="round"/>'
};

Object.assign(paths,{
 welcome:'<circle cx="83" cy="84" r="51" fill="#E4F1FF" stroke="#95BFEF" stroke-width="3"/><path d="M83 26 97 69 141 83 97 97 83 142 68 97 24 83 68 69Z" fill="#2F8DF6" stroke="#0757F5" stroke-width="3"/><circle cx="83" cy="83" r="18" fill="#fff"/><path d="m76 83 6 7 12-15" stroke="#0757F5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="m37 43-7-11m103 11 8-13M32 120l-11 10m108-8 12 8" stroke="#FFD05A" stroke-width="5" stroke-linecap="round"/>',
 gold_pumpkin:'<path d="M83 68Q43 37 30 81C18 130 61 146 83 135c27 13 69-9 54-54-10-39-32-40-54-13Z" fill="#F9BB42" stroke="#DA8A24" stroke-width="4"/><path d="M83 69q-13 32 0 65m15-64q28 29 12 63M67 70q-24 25-13 60" stroke="#E49E34" stroke-width="4" fill="none"/><path d="M83 65q-5-19 9-28" stroke="#628955" stroke-width="10" stroke-linecap="round"/><path d="m55 92 14-8 7 13m22 0 13-13 8 14" stroke="#8B4B24" stroke-width="5" stroke-linecap="round"/><path d="M69 114q15 14 30 0" stroke="#8B4B24" stroke-width="4" fill="none"/>',
 rose:'<path d="M82 87v57M82 113l-22-14m22 30 21-18" stroke="#43875A" stroke-width="5" stroke-linecap="round"/><path d="M58 99q20-9 23 12-16 6-23-12Zm45 12q-17-15-20 6 19 6 20-6Z" fill="#6FBF82"/><path d="M81 89c-37-9-38-43-18-54 9-7 17-5 20 1 22-13 40 10 30 28 1 14-14 28-32 25Z" fill="#ED7088" stroke="#BC3E65" stroke-width="3"/><path d="M70 60q15-23 31-2-17 3-18 19-20-11-13-17" fill="#FCA7B7"/>',
 cocoa:'<path d="M47 74h67v54c0 12-11 21-34 21s-33-9-33-21Z" fill="#8CC8F3" stroke="#4688BD" stroke-width="4"/><path d="M113 82h10q27 0 13 27-8 14-24 5" stroke="#4688BD" stroke-width="9" fill="none"/><ellipse cx="80" cy="74" rx="33" ry="11" fill="#87534B"/><ellipse cx="80" cy="70" rx="26" ry="7" fill="#D1A38E"/><path d="M64 47q-12-17 0-28m18 28q-12-18 0-28m18 28q-12-18 0-28" stroke="#A6C8D6" stroke-width="4" fill="none" stroke-linecap="round"/><path d="m69 110 12 13 15-13" stroke="#fff" stroke-width="4" fill="none"/>',
 cupcake:'<path d="m50 95 11 50h44l11-50Z" fill="#E6B5F3" stroke="#A77DC2" stroke-width="3"/><path d="M45 97q-19-20 4-31 0-26 28-26 17-20 35 0 27 0 27 24 20 13-1 33Z" fill="#FFF0D6" stroke="#E5BD9C" stroke-width="3"/><path d="M83 46V25" stroke="#ED83A3" stroke-width="5"/><path d="M76 24q7-12 14 0-7 12-14 0Z" fill="#F6B451"/><circle cx="66" cy="78" r="5" fill="#78ACF1"/><circle cx="99" cy="69" r="5" fill="#EE8DA3"/><circle cx="85" cy="88" r="5" fill="#F5BB59"/>',
 lantern:'<path d="M59 50h48v89H59Z" fill="#FFDE8D" stroke="#7F6AA7" stroke-width="5"/><path d="M69 40V26h27v14M53 51l29-20 31 20" stroke="#7F6AA7" stroke-width="5" fill="none"/><path d="M76 94q-17-19 8-36 18 16 6 36 22 5 6 29H70Q54 105 76 94" fill="#FF904D"/><path d="M66 140h34M60 51h46" stroke="#7F6AA7" stroke-width="5"/><circle cx="116" cy="58" r="6" fill="#F5B846"/>',
 ribbon:'<path d="M83 84 51 43q-20-17-22 8-2 25 30 31L36 110l35-11 12 41 12-41 35 11-23-28q32-6 30-31-2-25-22-8Z" fill="#86B9F0" stroke="#4D83C7" stroke-width="3" stroke-linejoin="round"/><circle cx="83" cy="83" r="18" fill="#F4A9B9" stroke="#D67A91" stroke-width="3"/><circle cx="83" cy="83" r="6" fill="#FFF4F0"/>',
 sun:'<circle cx="83" cy="82" r="34" fill="#FAD467" stroke="#EEA73A" stroke-width="3"/><path d="M83 18v21m0 87v22M17 82h22m87 0h21M36 36l16 16m62 62 15 15m0-93-15 16m-62 62-16 15" stroke="#F6B645" stroke-width="8" stroke-linecap="round"/><circle cx="70" cy="77" r="4" fill="#72564D"/><circle cx="96" cy="77" r="4" fill="#72564D"/><path d="M71 92q12 12 24 0" fill="none" stroke="#72564D" stroke-width="4" stroke-linecap="round"/>',
 teddy:'<circle cx="54" cy="51" r="20" fill="#B38C71"/><circle cx="111" cy="51" r="20" fill="#B38C71"/><circle cx="83" cy="87" r="51" fill="#D5AD87" stroke="#AD7F62" stroke-width="3"/><circle cx="52" cy="53" r="9" fill="#F4D9B9"/><circle cx="112" cy="53" r="9" fill="#F4D9B9"/><circle cx="67" cy="81" r="5" fill="#493D41"/><circle cx="99" cy="81" r="5" fill="#493D41"/><ellipse cx="83" cy="100" rx="18" ry="14" fill="#F3D6B9"/><path d="M77 97q6-7 12 0l-6 7Z" fill="#775050"/><path d="M66 132q17 12 34 0" stroke="#FAF2E4" stroke-width="8" stroke-linecap="round"/>',
 hearts:'<path d="M61 130C42 116 19 92 25 69c5-23 29-25 37-10 8-15 34-13 37 10 7 23-15 46-37 61Z" fill="#F4A0AC" stroke="#CE6887" stroke-width="3"/><path d="M105 130C85 116 63 92 69 69c5-23 29-25 37-10 9-15 34-13 38 10 6 23-17 46-39 61Z" fill="#E26082" stroke="#BC3F68" stroke-width="3"/><path d="M90 83q9-17 22-16" stroke="#FFC3D1" stroke-width="6" stroke-linecap="round"/>',
 firebird:'<path d="M88 121q-12 24-37 29 10-33 2-42-17 10-37-6 35-17 45-39-4-23 28-32 0 29 25 45 18-4 29-22-1 32-27 49 4 18-28 18Z" fill="#F6A046" stroke="#D65D34" stroke-width="4"/><path d="M76 115q-8-24 10-40 4 22 16 23" fill="#FFDD75"/><circle cx="105" cy="53" r="5" fill="#3B415E"/><path d="m114 62 17 6-17 6Z" fill="#E3B946"/><path d="M66 138q4-19-2-35m19 28q13-18 8-36" stroke="#B94648" stroke-width="5" stroke-linecap="round"/>'
});
function art(code){
 return '<svg class="vatra-gift-art" viewBox="0 0 166 166" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+esc(catalog.find(x=>x.code===code)?.title||'Подарунок ВАТРИ')+'"><ellipse cx="83" cy="152" rx="40" ry="6" fill="#24446D" opacity=".08"/>'+(paths[code]||paths.spark)+'</svg>';
}
let opened=0,selectedTab='mine',selectedReceiver='',inventory={items:[],visibility:'everyone'},networkReady=false,showing=false,notice='',orders=[];
const available=()=>auth.currentUser?.uid;
function safeData(data){return data&&Array.isArray(data.items)?data:{items:[],visibility:'everyone'};}
function friends(){return (window.vatraGiftFriends?.()||[]).filter(x=>x&&x.uid&&x.uid!==available());}
async function call(fn,args){const {data,error}=await client.rpc(fn,args||{});if(error)throw error;return data;}
function status(message,error=false){
 const el=document.querySelector('[data-vatra-gift-message]');
 if(el){el.textContent=message;el.classList.toggle('is-error',error);}
}

function card(item,owned=false){
 const info=catalog.find(x=>x.code===item.code)||catalog.find(x=>x.code==='spark');
 const price=Number(info.price)||0;
 return '<article class="vatra-gift-card"><div class="vatra-gift-image">'+art(item.code)+'</div><h3>'+esc(info.title)+'</h3>'+
 '<p>'+(owned?(item.source==='welcome'?'Подарунок за реєстрацію':item.source==='holiday'?'Подарунок ВАТРИ':item.source==='developer'?'Подарунок від ВАТРИ':'Подарунок від друга'):(price?'<b>'+price+' грн</b>':info.event?'Безкоштовно · '+esc(info.event):'Безкоштовно'))+'</p>'+
 (owned?'<button type="button" data-vatra-send-item="'+esc(item.id)+'">Подарувати другу</button>':
  price?'<button type="button" data-vatra-order="'+esc(item.code)+'">Замовити · '+price+' грн</button>':
  '<span class="vatra-gift-free-label">Видається ВАТРОЮ</span>')+'</article>';
}
function view(){
 const box=document.querySelector('#feed');if(!box||document.body.dataset.page!=='gifts')return;
 showing=true;const own=inventory.items||[],tab=selectedTab,ff=friends();
 const opts=ff.map(f=>'<option value="'+esc(f.uid)+'" '+(f.uid===selectedReceiver?'selected':'')+'>'+esc(f.name||f.uid)+'</option>').join('');
 const selected=tab==='free'?catalog.filter(x=>x.type!=='premium'):catalog.filter(x=>x.type==='premium');
 const markup=tab==='mine'
 ?'<div class="vatra-gift-privacy"><label for="vatraGiftPrivacy">Хто бачить мої подарунки</label><select id="vatraGiftPrivacy" data-vatra-gift-visibility><option value="everyone" '+(inventory.visibility==='everyone'?'selected':'')+'>Для всіх</option><option value="friends" '+(inventory.visibility==='friends'?'selected':'')+'>Для друзів</option><option value="only_me" '+(inventory.visibility==='only_me'?'selected':'')+'>Лише для мене</option></select></div>'+
  (own.length?'<div class="vatra-gifts-grid">'+own.map(x=>card(x,true)).join('')+'</div>':'<p class="vatra-gift-empty">Подарунків ще немає. Після реєстрації ВАТРА дарує першу іскру.</p>')
 :tab==='orders'?'<div class="vatra-gift-orders"><h2>Мої замовлення</h2>'+
  (orders.length?orders.map(o=>'<div class="vatra-gift-order-row"><span>№'+esc(o.id)+' · '+esc(catalog.find(x=>x.code===o.code)?.title||o.code)+' · <b>'+esc(o.price)+' грн</b></span><span>'+esc(({pending:'Очікує зв’язку',fulfilled:'Видано',cancelled:'Скасовано'})[o.status]||o.status)+'</span>'+(o.status==='pending'?'<button type="button" data-vatra-cancel-order="'+esc(o.id)+'">Скасувати</button>':'')+'</div>').join(''):'<p>Поки немає замовлень.</p>')+'</div>'
 :'<p class="vatra-gifts-intro">'+(tab==='premium'?'Після оформлення замовлення розробник ВАТРИ зв’яжеться з Вами та узгодить зручний спосіб оплати. Оплата на сайті не проводиться.':'Подарунок за реєстрацію видається один раз. Святкові подарунки доступні у день події.')+'</p><div class="vatra-gifts-grid">'+selected.map(x=>card(x)).join('')+'</div>';
 box.innerHTML='<section class="vatra-gifts-page"><header class="vatra-gifts-header"><div><button type="button" class="vatra-gift-return" data-vatra-return-profile>← До профілю</button><p class="vatra-gifts-eyebrow">КОЛЕКЦІЯ ВАТРИ</p><h1>Подарунки</h1><p>Збирайте оригінальні подарунки та передавайте друзям.</p></div><div class="vatra-gift-summary">'+own.length+' <small>у колекції</small></div></header>'+
 '<nav class="vatra-gifts-tabs" aria-label="Категорії подарунків">'+
 [['mine','Мої'],['free','Безкоштовні'],['premium','Платні'],['orders','Замовлення']].map(([id,label])=>'<button data-vatra-gifts-tab="'+id+'" '+(tab===id?'aria-current="page"':'')+'>'+label+'</button>').join('')+'</nav>'+
 '<div class="vatra-gift-notice" data-vatra-gift-message role="status">'+esc(notice)+'</div>'+markup+
 '<div class="vatra-gift-send" id="vatraGiftSend" hidden><div><h2>Подарувати другу</h2><p>Подарунок перейде до отримувача.</p></div><label>Одержувач<select data-vatra-gift-recipient><option value="">Оберіть друга</option>'+opts+'</select></label><div class="vatra-gift-send-actions"><button type="button" data-vatra-gift-cancel>Скасувати</button><button type="button" class="vatra-gift-primary" data-vatra-gift-confirm>Надіслати</button></div></div></section>';
}

async function show(uid){
 const gen=++opened;showing=false;networkReady=false;
 const box=document.querySelector('#feed');if(!box||document.body.dataset.page!=='gifts')return;
 box.innerHTML='<section class="vatra-gifts-page vatra-gift-loading"><h1>Подарунки</h1><p>Завантаження колекції…</p></section>';
 if(!uid){box.innerHTML='<section class="vatra-gifts-page"><h1>Подарунки</h1><p>Увійдіть до ВАТРИ, щоб переглядати й дарувати подарунки.</p></section>';return;}
 try{
  await call('vatra_gifts_claim_welcome');
  await call('vatra_gifts_claim_holiday');
  const [data,userOrders]=await Promise.all([call('vatra_gifts_inventory'),call('vatra_gifts_my_orders')]);orders=Array.isArray(userOrders)?userOrders:[];if(gen!==opened)return;
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
 const previewLink=e.target.closest('.vatra-gift-preview-link');
 if(previewLink){const uid=previewLink.closest('[data-gift-preview-for]')?.dataset.giftPreviewFor;if(uid&&uid!==available())void showPublicGifts(uid);else window.vatraRouter?.goPage('gifts');return;}
 if(e.target.closest('[data-vatra-return-profile]')){window.vatraRouter?.goPage('profile');return;}
 if(e.target.closest('[data-vatra-public-gifts-close]')){document.getElementById('vatraPublicGiftDialog')?.close();return;}
 const tab=e.target.closest('[data-vatra-gifts-tab]');if(tab){selectedTab=tab.dataset.vatraGiftsTab;notice='';view();return;}
 const buy=e.target.closest('[data-vatra-order]');
 if(buy){
  const code=buy.dataset.vatraOrder,entry=catalog.find(x=>x.code===code);
  if(!entry||!entry.price)return;
  if(!confirm('Оформити замовлення «'+entry.title+'» за '+entry.price+' грн? Оплата на сайті не проводиться. Розробник ВАТРИ зв’яжеться з Вами.'))return;
  buy.disabled=true;
  try{
   const number=await call('vatra_gifts_place_order',{_code:code});
   orders=await call('vatra_gifts_my_orders');
   notice='Замовлення №'+number+' надіслано адміністрації ВАТРИ. Очікуйте повідомлення від розробника.';
   selectedTab='orders';view();
  }catch(err){status(err.message||'Помилка замовлення.',true);buy.disabled=false;}
  return;
 }
 const cancelOrder=e.target.closest('[data-vatra-cancel-order]');
 if(cancelOrder){
  if(!confirm('Скасувати замовлення №'+cancelOrder.dataset.vatraCancelOrder+'?'))return;
  try{await call('vatra_gifts_cancel_order',{_order_id:Number(cancelOrder.dataset.vatraCancelOrder)});orders=await call('vatra_gifts_my_orders');notice='Замовлення скасовано.';view();}
  catch(err){status(err.message||'Не вдалося скасувати замовлення.',true);}
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

async function showPublicGifts(uid){
 let dialog=document.getElementById('vatraPublicGiftDialog');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='vatraPublicGiftDialog';dialog.className='vatra-public-gift-dialog';document.body.append(dialog);}
 dialog.innerHTML='<div class="vatra-public-gift-header"><h2>Подарунки користувача</h2><button type="button" data-vatra-public-gifts-close>Закрити</button></div><p>Завантаження…</p>';
 dialog.showModal();
 try{
  const rows=await call('vatra_gifts_public',{_owner:uid});
  if(!dialog.open)return;
  const items=Array.isArray(rows)?rows:[];
  dialog.innerHTML='<div class="vatra-public-gift-header"><h2>Подарунки <small>'+items.length+'</small></h2><button type="button" data-vatra-public-gifts-close>Закрити</button></div>'+
  (items.length?'<div class="vatra-gifts-grid">'+items.map(x=>card(x,false).replace(/<button[^>]*data-vatra-order[^>]*>.*?<\/button>/g,'')).join('')+'</div>':'<p class="vatra-gift-empty">Подарунки недоступні або приховані власником.</p>');
 }catch(err){dialog.innerHTML='<div class="vatra-public-gift-header"><h2>Подарунки</h2><button type="button" data-vatra-public-gifts-close>Закрити</button></div><p>Не вдалося завантажити подарунки.</p>';}
}
async function refreshPreview(el,owner){
 const id=String(owner||'');if(!/^[0-9a-f-]{36}$/i.test(id))return;
 if(el.dataset.giftPreviewFor===id)return;
 el.dataset.giftPreviewFor=id;el.innerHTML='<h3>Подарунки</h3><p class="vatra-gift-muted">Завантаження…</p>';
 try{
  const arr=await call('vatra_gifts_public',{_owner:id});
  if(!el.isConnected||el.dataset.giftPreviewFor!==id)return;
  const items=Array.isArray(arr)?arr:[];
  el.innerHTML='<h3>Подарунки <small>'+items.length+'</small></h3>'+
  (items.length?'<div class="vatra-gift-preview-row">'+items.slice(0,3).map(x=>art(x.code)).join('')+'</div>':'<p class="vatra-gift-muted">Подарунків поки немає</p>')+
  '<button type="button" class="vatra-gift-preview-link">Усі подарунки →</button>';
 }catch{
  el.innerHTML='<h3>Подарунки</h3><p class="vatra-gift-muted">Система ще не підключена</p><button type="button" class="vatra-gift-preview-link">Усі подарунки →</button>';
 }
}

let previewScheduled=false;
function scanPreviews(){
 previewScheduled=false;
 const p=document.body.dataset.page;if(p!=='profile'&&p!=='publicProfile')return;
 const id=window.vatraGiftProfileUid?.();if(!id)return;
 const parent=document.querySelector('#feed .vatra-profile-sidebar');
 if(!parent)return;
 let el=parent.querySelector('.vatra-gift-preview-card');
 if(!el){el=document.createElement('section');el.className='vatra-profile-card vatra-gift-preview-card';const friendsCard=parent.querySelector('.vatra-profile-friends');if(friendsCard)friendsCard.after(el);else parent.append(el);}
 if(el.dataset.giftPreviewFor!==id)void refreshPreview(el,id);
}
function queuePreview(){if(previewScheduled)return;previewScheduled=true;requestAnimationFrame(scanPreviews);}
const feed=document.querySelector('#feed');
if(feed)new MutationObserver(queuePreview).observe(feed,{childList:true,subtree:false});
window.addEventListener('vatra:started',queuePreview);
/* Give the holiday gift on login to VATRA, even if the user opens News first. */
function holidayNowInKyiv(){
 try{
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const day=Number(parts.find(x=>x.type==='day')?.value);
  const month=Number(parts.find(x=>x.type==='month')?.value);
  return month===10&&day===31 || month===1&&day===1 || month===8&&day===24;
 }catch{return false;}
}
window.addEventListener('vatra:started',()=>{
 if(!available())return;
 void call('vatra_gifts_claim_welcome').catch(()=>{});
 if(!holidayNowInKyiv())return;
 void call('vatra_gifts_claim_holiday').then(claimed=>{
  if(Array.isArray(claimed)&&claimed.length){
   const source=document.querySelector('.vatra-gift-preview-card');
   if(source)source.removeAttribute('data-gift-preview-for');
   queuePreview();
  }
 }).catch(err=>console.info('[ВАТРА подарунки] Серверний модуль подарунків ще не підключений:',err.message));
});


if(document.body.dataset.page==='gifts')void window.vatraRenderGifts?.(available());
