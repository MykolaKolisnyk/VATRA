/* VATRA — creator-made gifts. User data and transfers are controlled by Supabase RPC.
   A purchase request does not charge a card. VATRA does not verify off-platform payment. */
import {initializeApp,getDatabase,getAuth} from './vatra-backend.js?v=20261031-7';
const client=getDatabase(initializeApp()).client,auth=getAuth(initializeApp());
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const priceString=n=>new Intl.NumberFormat('uk-UA').format(Number(n)||0)+' грн';
const validPath=s=>/^[0-9a-f-]{36}\/gifts\/[A-Za-z0-9_-]{8,90}\.(png|jpg|jpeg|webp)$/.test(String(s||''));
const imageUrl=path=>validPath(path)?client.storage.from('vatra-media').getPublicUrl(path).data?.publicUrl||'':'';
const rpc=async(name,params={})=>{const {data,error}=await client.rpc(name,params);if(error)throw error;return data;};
const shapeIcons={
 heart:'<path d="M12 21s-9-5.5-9-11.3C3 5.3 8.6 3 12 7c3.4-4 9-1.7 9 2.7C21 15.5 12 21 12 21Z"/>',
 star:'<path d="m12 2 3.3 6.8L23 10l-5.5 5.2 1.4 7.5L12 19l-6.9 3.7 1.4-7.5L1 10l7.7-1.2L12 2Z"/>',
 flame:'<path d="M13 2C8 7 16 9 11 13c-1-3-4-4-4-4-1 5-4 7-4 10a9 9 0 0 0 18 0c0-6-5-11-8-17Z"/>'
};
const artIcon=kind=>'<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">'+(shapeIcons[kind]||shapeIcons.heart)+'</svg>';
let canvasShape='heart',canvasColor='#f0658e',canvasBackground='#edf4ff',previewUrl='',renderSerial=0;
const actor=()=>auth.currentUser?.uid||'';
function toast(message,isError=false){
 const box=document.querySelector('#vatraCreatorStatus')||document.querySelector('[data-vatra-gift-message]');
 if(box){box.textContent=message;box.classList.toggle('is-error',isError);}
 else window.vatraGiftToast?.(message,isError);
}
function canvasDraw(){
 const c=document.querySelector('#vatraCreatorCanvas');if(!c)return;
 const x=c.getContext('2d');if(!x)return;
 const w=512;x.clearRect(0,0,w,w);
 const grad=x.createLinearGradient(0,0,w,w);grad.addColorStop(0,canvasBackground);grad.addColorStop(1,'#ffffff');
 x.fillStyle=grad;x.fillRect(0,0,w,w);
 x.save();x.translate(256,253);
 x.shadowColor='rgba(39,62,96,.21)';x.shadowBlur=32;x.shadowOffsetY=12;
 x.fillStyle=canvasColor;x.strokeStyle='rgba(47,56,92,.23)';x.lineWidth=7;x.lineJoin='round';
 x.beginPath();
 if(canvasShape==='heart'){
  x.moveTo(0,153);x.bezierCurveTo(-40,116,-159,27,-158,-66);
  x.bezierCurveTo(-155,-148,-56,-166,0,-88);
  x.bezierCurveTo(56,-166,155,-148,158,-66);
  x.bezierCurveTo(159,27,40,116,0,153);
 }else if(canvasShape==='star'){
  const steps=10;for(let i=0;i<steps;i++){const angle=i*Math.PI/5-Math.PI/2,rad=i%2?78:164;const px=Math.cos(angle)*rad,py=Math.sin(angle)*rad;if(i===0)x.moveTo(px,py);else x.lineTo(px,py);}x.closePath();
 }else{
  x.moveTo(-12,160);x.bezierCurveTo(-141,132,-170,22,-87,-82);
  x.bezierCurveTo(-93,-15,-36,-13,-26,-43);
  x.bezierCurveTo(-5,-94,-18,-136,21,-174);
  x.bezierCurveTo(11,-87,157,-32,126,76);
  x.bezierCurveTo(102,156,34,177,-12,160);
 }
 x.fill();x.stroke();x.shadowColor='transparent';x.shadowBlur=0;x.shadowOffsetY=0;
 x.beginPath();x.strokeStyle='rgba(255,255,255,.78)';x.lineWidth=16;x.lineCap='round';
 x.moveTo(-65,-72);x.quadraticCurveTo(-34,-116,7,-98);x.stroke();
 x.restore();
 x.fillStyle='rgba(255,255,255,.95)';
 for(const [cx,cy,r] of [[95,75,5],[411,114,9],[69,339,7],[417,390,5]]){x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();}
}
function editor(){
 return '<section class="vatra-creator-editor"><div class="vatra-creator-section-heading"><div><h2>Створити власний подарунок</h2><p>Намалюйте його в редакторі або завантажте фото з комп’ютера.</p></div></div>'+
 '<form id="vatraCreatorForm"><div class="vatra-creator-editor-layout"><div class="vatra-creator-image-creator">'+
 '<div class="vatra-creator-art-preview"><canvas id="vatraCreatorCanvas" width="512" height="512" aria-label="Попередній перегляд намальованого подарунка"></canvas><img id="vatraCreatorUploadedPreview" alt="Завантажений подарунок" hidden></div>'+
 '<div class="vatra-creator-shape-list" role="group" aria-label="Форма подарунка">'+
 [['heart','Серце'],['star','Зірка'],['flame','Вогник']].map(([kind,label])=>'<button type="button" data-vatra-creator-shape="'+kind+'" class="'+(kind===canvasShape?'is-active':'')+'">'+artIcon(kind)+'<span>'+label+'</span></button>').join('')+'</div>'+
 '<div class="vatra-creator-colors"><label>Колір малюнка <input type="color" id="vatraCreatorShapeColor" value="'+esc(canvasColor)+'"></label><label>Фон <input type="color" id="vatraCreatorBackground" value="'+esc(canvasBackground)+'"></label></div>'+
 '<label class="vatra-creator-upload">Або завантажити PNG, JPEG чи WebP до 2 МБ<input id="vatraCreatorImageFile" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<button type="button" class="vatra-creator-reset-file" data-vatra-creator-use-drawing>Використати малюнок редактора</button></div>'+
 '<div class="vatra-creator-fields"><label>Назва подарунка <input name="title" type="text" minlength="3" maxlength="60" required placeholder="Наприклад, Зірка дружби"></label>'+
 '<label>Опис <textarea name="description" minlength="15" maxlength="350" rows="4" required placeholder="Що символізує ваш подарунок і для кого він?"></textarea></label>'+
 '<label>Ціна, грн <input name="price" type="number" min="10" max="5000" step="1" value="50" required></label>'+
 '<p class="vatra-creator-price-hint">Встановіть від 10 до 5 000 грн. Ціна не означає, що на сайті вже підключена оплата.</p>'+
 '<label class="vatra-creator-check"><input name="listed" type="checkbox" checked><span>Показати подарунок у каталозі авторських робіт</span></label>'+
 '<label class="vatra-creator-check"><input name="rights" type="checkbox" required><span>Підтверджую, що маю право використовувати це зображення</span></label>'+
 '<p class="vatra-creator-disclaimer">Не завантажуйте чужі роботи без дозволу. Покупці надсилатимуть заявки, а передача відбуватиметься лише після вашого підтвердження. ВАТРА поки не приймає платежі за ці подарунки.</p>'+
 '<button type="submit" class="vatra-creator-submit">Створити подарунок</button><p id="vatraCreatorStatus" role="status"></p>'+
 '</div></div></form></section>';
}
function card(item,mine=false){
 const image=imageUrl(item.imagePath);
 return '<article class="vatra-creator-card" data-creator-id="'+esc(item.id)+'">'+
 '<button type="button" class="vatra-creator-preview-open" data-vatra-creator-open="'+esc(item.id)+'">'+
 (image?'<img loading="lazy" decoding="async" src="'+esc(image)+'" alt="'+esc(item.title)+'">':'<span aria-hidden="true">✦</span>')+'</button>'+
 '<h3>'+esc(item.title)+'</h3><p>'+esc(item.description)+'</p><strong>'+priceString(item.price)+'</strong>'+
 (mine?'<div class="vatra-creator-list-status">'+(item.listed?'У продажу':'Не виставлено')+'</div>'+
 '<form class="vatra-creator-listing" data-creator-listing="'+esc(item.id)+'"><label>Ціна <input type="number" name="price" min="10" max="5000" value="'+Number(item.price)+'" required></label>'+
 '<label class="vatra-creator-check"><input type="checkbox" name="listed" '+(item.listed?'checked':'')+'> У каталозі</label>'+
 '<button type="submit">Зберегти</button></form><button type="button" data-creator-send="'+esc(item.id)+'">Подарувати другу</button>':
  item.owner===actor()?'<span class="vatra-creator-own-label">Ваш подарунок</span>':
  '<button type="button" class="vatra-creator-buy" data-creator-order="'+esc(item.id)+'">Запросити купівлю</button>')+'</article>';
}
function orderRow(o){
 const selling=o.seller===actor(),other=selling?o.buyer:o.seller;
 const state={pending:'Очікує домовленості',completed:'Подарунок передано',declined:'Відхилено',withdrawn:'Відкликано'}[o.status]||'Заявка';
 const controls=o.status==='pending'?selling?'<button type="button" data-creator-action="complete" data-creator-order-id="'+esc(o.id)+'" class="vatra-creator-order-complete">Підтвердити передачу</button><button type="button" data-creator-action="decline" data-creator-order-id="'+esc(o.id)+'">Відхилити</button>':'<button type="button" data-creator-action="withdraw" data-creator-order-id="'+esc(o.id)+'">Відкликати</button>':'';
 return '<article class="vatra-creator-order"><div><strong>'+esc(o.title)+'</strong><small>'+state+' · '+priceString(o.price)+'</small><small>'+(selling?'Покупець':'Продавець')+': <a href="#/profile/'+esc(other)+'">відкрити профіль для спілкування</a></small></div><div>'+controls+'</div></article>';
}
async function confirmAction(text,positive){
 return await new Promise(resolve=>{
  const d=document.createElement('dialog');d.className='vatra-creator-confirm';
  d.innerHTML='<h2>Підтвердження ВАТРИ</h2><p>'+esc(text)+'</p><footer><button type="button" data-choice="no">Назад</button><button type="button" class="vatra-creator-confirm-main" data-choice="yes">'+esc(positive)+'</button></footer>';
  let yes=false;d.onclick=e=>{const b=e.target.closest('[data-choice]');if(!b)return;yes=b.dataset.choice==='yes';d.close();};
  d.onclose=()=>{d.remove();resolve(yes);};document.body.append(d);d.showModal();
 });
}
async function loadAll(){
 const [mine,market,orders]=await Promise.all([
  rpc('vatra_creator_gifts_mine'),rpc('vatra_creator_gifts_market'),rpc('vatra_creator_gifts_orders')
 ]);
 return {mine:Array.isArray(mine)?mine:[],market:Array.isArray(market)?market:[],orders:Array.isArray(orders)?orders:[]};
}
let cached={mine:[],market:[],orders:[]};
async function render(){
 const root=document.querySelector('#vatraCreatorGiftsMount');
 if(!root||document.body.dataset.page!=='gifts')return;
 const serial=++renderSerial;
 root.innerHTML=editor()+'<section class="vatra-creator-collection"><div class="vatra-creator-section-heading"><h2>Мої авторські подарунки</h2></div><div id="vatraCreatorOwnGrid" class="vatra-creator-grid"></div>'+
 '<div id="vatraCreatorSendPanel" hidden class="vatra-creator-send-panel"></div></section>'+
 '<section class="vatra-creator-collection"><div class="vatra-creator-section-heading"><h2>Каталог авторських подарунків</h2><p>Ціну встановлює власник. ВАТРА не перевіряє оплату поза платформою.</p></div><div id="vatraCreatorMarketGrid" class="vatra-creator-grid"></div></section>'+
 '<section class="vatra-creator-collection"><div class="vatra-creator-section-heading"><h2>Заявки та домовленості</h2></div><div id="vatraCreatorOrders"></div></section>';
 requestAnimationFrame(canvasDraw);
 try{
  const data=await loadAll();if(serial!==renderSerial||!root.isConnected)return;
  cached=data;
  root.querySelector('#vatraCreatorOwnGrid').innerHTML=data.mine.length?data.mine.map(x=>card(x,true)).join(''):'<p class="vatra-creator-empty">Ще немає авторських подарунків. Створіть перший вище.</p>';
  root.querySelector('#vatraCreatorMarketGrid').innerHTML=data.market.length?data.market.map(x=>card(x,false)).join(''):'<p class="vatra-creator-empty">Поки немає подарунків, виставлених на продаж.</p>';
  root.querySelector('#vatraCreatorOrders').innerHTML=data.orders.length?data.orders.map(orderRow).join(''):'<p class="vatra-creator-empty">Активних заявок поки немає.</p>';
 }catch(error){
  if(serial!==renderSerial||!root.isConnected)return;
  root.querySelector('#vatraCreatorOwnGrid').innerHTML='<p class="vatra-creator-empty">Розділ потребує серверної міграції VATRA/vatra-gifts-creators.sql у Supabase. Поки її не застосовано, створення і продаж недоступні.</p>';
  root.querySelector('#vatraCreatorMarketGrid').innerHTML='';
  root.querySelector('#vatraCreatorOrders').innerHTML='';
  root.querySelector('.vatra-creator-submit').disabled=true;
  console.warn('[ВАТРА] Creator gifts RPC is unavailable:',error.message);
 }
}
async function renderMine(){
 const root=document.querySelector('#vatraCreatorGiftsMine');if(!root)return;
 root.innerHTML='<div class="vatra-creator-section-heading"><h2>Мої авторські подарунки</h2><button type="button" data-vatra-gifts-tab="creators">Створити подарунок</button></div>';
 try{
  const gifts=await rpc('vatra_creator_gifts_mine');if(!root.isConnected)return;
  root.innerHTML+='<div class="vatra-creator-grid">'+(gifts.length?gifts.slice(0,4).map(x=>card(x,false)).join(''):'<p class="vatra-creator-empty">Ще немає власних авторських подарунків.</p>')+'</div>';
 }catch{root.innerHTML+='<p class="vatra-creator-empty">Авторські подарунки з’являться після налаштування серверного модуля.</p>';}
}
window.vatraCreatorGiftsRender=render;
window.vatraCreatorGiftsRenderMine=renderMine;
async function fileToPng(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2097152)throw Error('Оберіть PNG, JPEG або WebP до 2 МБ');
 let img;const url=URL.createObjectURL(file);
 try{
  img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Не вдалося відкрити зображення'));image.src=url;});
  if(img.naturalWidth<96||img.naturalHeight<96)throw Error('Малюнок має бути хоча б 96 × 96 пікселів');
  const cn=document.createElement('canvas');cn.width=cn.height=512;
  const ctx=cn.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,512,512);
  const factor=Math.min(512/img.naturalWidth,512/img.naturalHeight),w=img.naturalWidth*factor,h=img.naturalHeight*factor;
  ctx.drawImage(img,(512-w)/2,(512-h)/2,w,h);
  const blob=await new Promise(resolve=>cn.toBlob(resolve,'image/png'));
  if(!blob||blob.size>2097152)throw Error('Зображення завелике після обробки, спробуйте інше');
  return blob;
 }finally{URL.revokeObjectURL(url);}
}
function fileFromCanvas(){
 const cn=document.querySelector('#vatraCreatorCanvas');
 return new Promise(resolve=>cn?.toBlob(resolve,'image/png'));
}
document.addEventListener('click',async event=>{
 const shape=event.target.closest('[data-vatra-creator-shape]');
 if(shape){canvasShape=shape.dataset.vatraCreatorShape;document.querySelectorAll('[data-vatra-creator-shape]').forEach(b=>b.classList.toggle('is-active',b===shape));canvasDraw();return;}
 if(event.target.closest('[data-vatra-creator-use-drawing]')){
  const input=document.querySelector('#vatraCreatorImageFile');if(input)input.value='';
  const img=document.querySelector('#vatraCreatorUploadedPreview');if(img)img.hidden=true;
  document.querySelector('#vatraCreatorCanvas')?.removeAttribute('hidden');
  if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';canvasDraw();return;
 }
 const toSend=event.target.closest('[data-creator-send]');
 if(toSend){
  const friends=(window.vatraGiftFriends?.()||[]).filter(x=>x&&x.uid&&x.uid!==actor());
  const panel=document.querySelector('#vatraCreatorSendPanel');if(!panel)return;
  panel.hidden=false;
  panel.innerHTML='<h3>Подарувати другу</h3><p>Цей подарунок перейде в колекцію іншого користувача без оплати.</p>'+
   '<form id="vatraCreatorSendForm" data-id="'+esc(toSend.dataset.creatorSend)+'"><label>Оберіть друга<select name="recipient" required><option value="">Оберіть користувача</option>'+
   friends.map(x=>'<option value="'+esc(x.uid)+'">'+esc(x.name||x.uid)+'</option>').join('')+
   '</select></label><button type="submit">Передати подарунок</button><button type="button" data-creator-send-cancel>Скасувати</button></form>';
  panel.scrollIntoView({behavior:'smooth',block:'nearest'});return;
 }
 if(event.target.closest('[data-creator-send-cancel]')){document.querySelector('#vatraCreatorSendPanel').hidden=true;return;}
 const publicGift=event.target.closest('[data-vatra-creator-public-open]');
 if(publicGift){
  const owner=publicGift.dataset.vatraCreatorOwner;
  try{
   const items=await rpc('vatra_creator_gifts_public',{_owner:owner});
   const gift=(Array.isArray(items)?items:[]).find(x=>x.id===publicGift.dataset.vatraCreatorPublicOpen);
   if(!gift)return;
   let d=document.getElementById('vatraCreatorDetailDialog');
   if(!d){d=document.createElement('dialog');d.id='vatraCreatorDetailDialog';d.className='vatra-creator-detail';document.body.append(d);}
   d.innerHTML='<button type="button" class="vatra-creator-close" data-creator-detail-close aria-label="Закрити">×</button>'+
     '<img src="'+esc(imageUrl(gift.imagePath))+'" alt="'+esc(gift.title)+'"><div><h2>'+esc(gift.title)+'</h2><p>'+esc(gift.description)+'</p><strong>'+priceString(gift.price)+'</strong></div>';
   d.showModal();
  }catch(err){console.warn('[ВАТРА] Подарунок недоступний:',err.message);}
  return;
 }
 const open=event.target.closest('[data-vatra-creator-open]');
 if(open){
  const gift=[...cached.mine,...cached.market].find(x=>x.id===open.dataset.vatraCreatorOpen);if(!gift)return;
  let d=document.getElementById('vatraCreatorDetailDialog');if(!d){d=document.createElement('dialog');d.id='vatraCreatorDetailDialog';d.className='vatra-creator-detail';document.body.append(d);}
  d.innerHTML='<button type="button" class="vatra-creator-close" data-creator-detail-close aria-label="Закрити">×</button>'+
    '<img src="'+esc(imageUrl(gift.imagePath))+'" alt="'+esc(gift.title)+'"><div><h2>'+esc(gift.title)+'</h2><p>'+esc(gift.description)+'</p><strong>'+priceString(gift.price)+'</strong></div>';
  d.showModal();return;
 }
 if(event.target.closest('[data-creator-detail-close]')){document.getElementById('vatraCreatorDetailDialog')?.close();return;}
 const order=event.target.closest('[data-creator-order]');
 if(order){
  const gift=cached.market.find(x=>x.id===order.dataset.creatorOrder);if(!gift)return;
  if(!await confirmAction('Надіслати власнику заявку на подарунок «'+gift.title+'» за '+priceString(gift.price)+'? Це НЕ оплата. Для купівлі потрібно домовитися з продавцем.','Надіслати заявку'))return;
  order.disabled=true;
  try{await rpc('vatra_creator_gifts_order_request',{_gift_id:gift.id});toast('Заявку надіслано. Відкрийте профіль продавця для домовленості.');await render();}
  catch(e){toast(e.message||'Не вдалося надіслати заявку.',true);order.disabled=false;}
  return;
 }
 const action=event.target.closest('[data-creator-action]');
 if(action){
  const o=cached.orders.find(x=>x.id===action.dataset.creatorOrderId);if(!o)return;
  const type=action.dataset.creatorAction;
  const msg=type==='complete'?'УВАГА: Ви підтверджуєте передачу подарунка покупцеві. ВАТРА не перевіряла оплату. Передавайте лише після того, як особисто переконаєтесь в оплаті або вирішите подарувати безкоштовно.':type==='decline'?'Відхилити заявку на цей подарунок?':'Відкликати свою заявку?';
  if(!await confirmAction(msg,type==='complete'?'Передати подарунок':'Підтвердити'))return;
  action.disabled=true;
  try{await rpc('vatra_creator_gifts_order_action',{_order_id:o.id,_action:type});await render();toast(type==='complete'?'Подарунок передано.':'Заявку оновлено.');}
  catch(e){toast(e.message||'Помилка обробки заявки',true);action.disabled=false;}
 }
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el?.id==='vatraCreatorImageFile'){
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  const file=el.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2097152){toast('PNG, JPEG або WebP до 2 МБ',true);el.value='';return;}
  previewUrl=URL.createObjectURL(file);
  const img=document.querySelector('#vatraCreatorUploadedPreview'),canvas=document.querySelector('#vatraCreatorCanvas');
  if(img){img.src=previewUrl;img.hidden=false;}if(canvas)canvas.hidden=true;
 }
});
document.addEventListener('input',event=>{
 if(event.target.id==='vatraCreatorShapeColor'){canvasColor=event.target.value;canvasDraw();}
 if(event.target.id==='vatraCreatorBackground'){canvasBackground=event.target.value;canvasDraw();}
});
document.addEventListener('submit',async event=>{
 const form=event.target;
 if(form.id==='vatraCreatorForm'){
  event.preventDefault();
  if(!form.reportValidity())return;
  const price=Number(form.elements.price.value);
  if(!Number.isInteger(price)||price<10||price>5000){toast('Ціна має бути від 10 до 5 000 грн',true);return;}
  const submit=form.querySelector('[type="submit"]');submit.disabled=true;
  let path='';
  try{
   const file=form.querySelector('#vatraCreatorImageFile')?.files?.[0];
   const blob=file?await fileToPng(file):await fileFromCanvas();
   if(!blob||blob.size>2097152)throw Error('Не вдалося підготувати зображення до 2 МБ');
   path=actor()+'/gifts/'+crypto.randomUUID()+'.png';
   const {error}=await client.storage.from('vatra-media').upload(path,blob,{contentType:'image/png',cacheControl:'31536000',upsert:false});
   if(error)throw error;
   await rpc('vatra_creator_gifts_create',{
    _title:form.elements.title.value.trim(),_description:form.elements.description.value.trim(),
    _price_uah:price,_image_path:path,_listed:form.elements.listed.checked
   });
   await render();toast('Подарунок створено й додано до вашої колекції.');
  }catch(err){
   // A response can be lost after a successful server commit: never delete its image blindly.
   toast(err.message||'Не вдалося створити подарунок. Перевірте колекцію перед повторним створенням.',true);submit.disabled=false;
  }return;
 }
 if(form.matches('[data-creator-listing]')){
  event.preventDefault();if(!form.reportValidity())return;
  const price=Number(form.elements.price.value),id=form.dataset.creatorListing;
  const b=form.querySelector('[type="submit"]');b.disabled=true;
  try{await rpc('vatra_creator_gifts_set_listing',{_gift_id:id,_price_uah:price,_listed:form.elements.listed.checked});await render();toast('Налаштування подарунка збережено.');}
  catch(e){toast(e.message||'Помилка збереження',true);b.disabled=false;}return;
 }
 if(form.id==='vatraCreatorSendForm'){
  event.preventDefault();if(!form.reportValidity())return;
  const recipient=form.elements.recipient.value;
  if(!await confirmAction('Передати цей подарунок другу без оплати? Після передачі він перейде до його колекції.','Передати'))return;
  const b=form.querySelector('[type="submit"]');b.disabled=true;
  try{await rpc('vatra_creator_gifts_send',{_gift_id:form.dataset.id,_recipient:recipient});await render();toast('Подарунок передано другу.');}
  catch(e){toast(e.message||'Не вдалося передати подарунок',true);b.disabled=false;}
 }
});
