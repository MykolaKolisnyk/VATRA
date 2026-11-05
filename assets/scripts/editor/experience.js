// Shared VATRA page/settings editor: readable cards, contextual SVGs and opt-in place suggestions.
// Field queries use only the city typed into the form; no device geolocation.
// Render all field icons from the single central VATRA icon sprite.
function svg(key){return window.vatraIcon?.(key,'vatra-editor-icon')||'';}
const kinds={
 firstName:'profile',lastName:'profile',handle:'profile',gender:'gender',
 city:'pin',location:'pin',hometown:'pin',workplace:'career',education:'education',
 bio:'document',phone:'phone',dateOfBirth:'calendar',website:'website',
 profileVisibility:'privacy',searchable:'search',birthdayVisibility:'calendar',
 cityVisibility:'pin',locationVisibility:'pin',phoneVisibility:'phone',
 workplaceVisibility:'career',educationVisibility:'education',hometownVisibility:'pin',
 bioVisibility:'document',statusVisibility:'quote',websiteVisibility:'website',
 familyStatus:'friends',spokenLanguages:'language',familyNotes:'document',
 activities:'star',hobbies:'leaf',music:'music',tv:'video',films:'video',
 books:'document',games:'game',quotes:'quote',serviceNotes:'shield',
 politics:'language',worldview:'website',values:'heart',peopleValues:'friends',
 smoking:'leaf',alcohol:'info',inspiration:'star',lifeNotes:'document'
};
function iconType(control){
 const key=(control.name||'').replace(/^private_|extraVisibility_/,'');
 return kinds[key]||((control.closest('[data-vatra-record-editor]')?.dataset.vatraRecordEditor)==='educationRecords'?'education':'info');
}
function decorateLabel(label){
 if(label.dataset.vatraEditorDecorated||label.classList.contains('settings-check')||label.classList.contains('vatra-extra-visibility')||label.classList.contains('vatra-record-visibility'))return;
 const control=label.querySelector(':scope > input,:scope > select,:scope > textarea');
 if(!control||control.type==='checkbox'||control.type==='radio'||control.type==='file')return;
 const textNodes=[...label.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
 const leading=textNodes.find(node=>node.compareDocumentPosition(control)&Node.DOCUMENT_POSITION_FOLLOWING);
 if(!leading)return;
 const title=leading.textContent.trim();if(!title)return;
 const heading=document.createElement('span');heading.className='vatra-editor-field-heading';
 heading.innerHTML='<span class="vatra-editor-field-icon" data-kind="'+iconType(control)+'">'+svg(iconType(control))+'</span><span></span>';
 heading.lastElementChild.textContent=title;
 label.insertBefore(heading,label.firstChild);leading.remove();label.dataset.vatraEditorDecorated='1';
}
function decoratePane(pane){
 pane.querySelectorAll('.settings-card').forEach(card=>{
  const heading=card.querySelector(':scope > h3');
  if(!heading||heading.querySelector('.vatra-editor-heading-icon'))return;
  const key=pane.dataset.settingsSection||'info';
  heading.insertAdjacentHTML('afterbegin','<span class="vatra-editor-heading-icon" data-kind="'+key+'">'+svg(key)+'</span>');
 });
 pane.querySelectorAll('.settings-grid > label,.vatra-record-fields > label').forEach(decorateLabel);
 pane.querySelectorAll('.vatra-extra-setting-title').forEach(title=>{
  if(title.querySelector('.vatra-editor-field-icon'))return;
  const input=title.closest('.vatra-extra-setting')?.querySelector('[name^="private_"]');
  const kind=input?iconType(input):'info';
  title.insertAdjacentHTML('afterbegin','<span class="vatra-editor-field-icon" data-kind="'+kind+'">'+svg(kind)+'</span>');
 });
}
function setupPlaceSuggestions(page){
 const root=page.querySelector('#profileSettingsForm');if(!root||root.dataset.vatraPlaceSuggestInstalled)return;
 root.dataset.vatraPlaceSuggestInstalled='1';
 let lastFetch=0,controller=null,sequence=0,timer=null,activeInput=null;
 const cache=new Map();
 const pick=(input)=>{
  if(input.matches('input[name="education"]'))return 'education';
  if(input.matches('input[data-vatra-record-field="title"]') && input.closest('[data-vatra-record-editor="educationRecords"]'))return 'education';
  if(input.matches('input[name="workplace"]') || input.matches('input[data-vatra-record-field="title"]') && input.closest('[data-vatra-record-editor="careerRecords"]'))return 'workplace';
  if(input.matches('input[name="city"],input[name="hometown"]'))return 'city';
  return null;
 };
 const getList=input=>{
  let list=input.parentElement.querySelector(':scope > .vatra-place-suggestions');
  if(!list){
   list=document.createElement('div');list.className='vatra-place-suggestions';list.setAttribute('role','listbox');list.hidden=true;
   list.id='vatra-places-'+Math.random().toString(36).slice(2);
   input.parentElement.append(list);input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');input.setAttribute('autocomplete','off');
  }
  return list;
 };
 const hide=input=>{
  if(!input)return;
  const list=input.parentElement.querySelector(':scope > .vatra-place-suggestions');
  if(list)list.hidden=true;input.setAttribute('aria-expanded','false');
 };
 const show=(input,items,message)=>{
  if(!input.isConnected||activeInput!==input)return;
  const list=getList(input);list.replaceChildren();
  if(message&&!items.length){const row=document.createElement('p');row.className='vatra-place-empty';row.textContent=message;list.append(row);}
  items.forEach(item=>{
   const button=document.createElement('button');button.type='button';button.className='vatra-place-option';button.setAttribute('role','option');
   button.innerHTML='<span class="vatra-place-option-icon">'+svg(pick(input)==='education'?'education':pick(input)==='city'?'pin':'career')+'</span><span class="vatra-place-option-copy"><b></b><small></small></span>';
   button.querySelector('b').textContent=item.name;
   button.querySelector('small').textContent=item.place;
   button.addEventListener('mousedown',event=>event.preventDefault());
   button.addEventListener('click',()=>{
    input.value=item.name;input.dispatchEvent(new Event('input',{bubbles:true}));
    hide(input);input.focus();
   });
   list.append(button);
  });
  const foot=document.createElement('small');foot.className='vatra-place-attribution';foot.textContent='Пошук OpenStreetMap · каталог може бути неповним. Можна ввести свій варіант.';
  list.append(foot);list.hidden=false;input.setAttribute('aria-expanded','true');
 };
 const search=async(input)=>{
  const kind=pick(input);if(!kind||activeInput!==input)return;
  const city=root.querySelector('input[name="city"]')?.value.trim().slice(0,80)||'';
  const typed=input.value.trim().slice(0,100);
  if(!typed&&!city){show(input,[],kind==='city'?'Почніть вводити назву міста.':'Вкажіть місто у розділі «Контакти», щоб переглянути місцеві пропозиції.');return;}
  const q=([typed||(kind==='education'?'школа':kind==='workplace'?'компанія':'місто'),kind==='city'?'':city].filter(Boolean)).join(' ');
  const key=kind+'|'+q.toLocaleLowerCase('uk');
  const current=++sequence;
  if(cache.has(key)){show(input,cache.get(key),'Не знайдено в каталозі. Можна вписати назву вручну.');return;}
  controller?.abort();controller=new AbortController();
  const list=getList(input);list.replaceChildren();
  const loading=document.createElement('p');loading.className='vatra-place-empty';loading.textContent='Шукаємо варіанти…';list.append(loading);list.hidden=false;
  input.setAttribute('aria-expanded','true');
  try{
   const gap=Math.max(0,1050-(Date.now()-lastFetch));if(gap)await new Promise(resolve=>setTimeout(resolve,gap));
   if(current!==sequence||!input.isConnected)return;
   lastFetch=Date.now();
   const params=new URLSearchParams({q,limit:'8',lang:'uk'});
   const response=await fetch('https://photon.komoot.io/api/?'+params.toString(),{signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error('Каталог тимчасово недоступний.');
   const data=await response.json();
   if(current!==sequence||activeInput!==input)return;
   const seen=new Set();
   const results=(data.features||[]).filter(item=>{
    const p=item.properties||{},name=String(p.name||'').trim();
    if(!name||seen.has(name.toLocaleLowerCase('uk')))return false;
    if(kind==='education' && !['school','college','university','kindergarten','library','education'].includes(String(p.osm_value||'').toLowerCase())
       && !/школ|універс|ліце|гімназ|коледж|інститут|академ|освіт/i.test(name))return false;
    seen.add(name.toLocaleLowerCase('uk'));return true;
   }).slice(0,8).map(item=>{
    const p=item.properties||{};return{name:String(p.name).slice(0,120),
    place:[p.city||p.district,p.state,p.country].filter(Boolean).join(' · ').slice(0,170)};
   });
   cache.set(key,results);show(input,results,'Не знайдено в каталозі. Можна вписати назву вручну.');
  }catch(error){
   if(current!==sequence||error?.name==='AbortError')return;
   show(input,[],'Каталог зараз недоступний. Введіть назву вручну.');
  }
 };
 root.addEventListener('focusin',event=>{
  const input=event.target;if(!(input instanceof HTMLInputElement)||!pick(input))return;
  activeInput=input;clearTimeout(timer);timer=setTimeout(()=>search(input),180);
 });
 root.addEventListener('input',event=>{
  const input=event.target;if(!(input instanceof HTMLInputElement)||!pick(input))return;
  activeInput=input;clearTimeout(timer);timer=setTimeout(()=>search(input),750);
 });
 root.addEventListener('keydown',event=>{
  const input=event.target;if(!(input instanceof HTMLInputElement)||!pick(input))return;
  const list=input.parentElement.querySelector(':scope > .vatra-place-suggestions');if(!list||list.hidden)return;
  const options=[...list.querySelectorAll('.vatra-place-option')];
  if(event.key==='Escape'){hide(input);return;}
  if(event.key==='ArrowDown'&&options.length){event.preventDefault();options[0].focus();}
 });
 root.addEventListener('focusout',event=>{
  const input=event.target;if(!(input instanceof HTMLInputElement)||!pick(input))return;
  setTimeout(()=>{if(!input.parentElement?.contains(document.activeElement))hide(input);},140);
 });
}
export function enhanceVatraSettings(page,{editMode=false,uid=''}={}){
 if(!page||page.dataset.vatraEditorEnhanced)return;
 page.dataset.vatraEditorEnhanced='1';page.classList.add('vatra-editor-polished');
 const workspace=page.querySelector('.vatra-settings-workspace');
 if(!workspace)return;
 const top=document.createElement('header');top.className='vatra-editor-page-header';
 top.innerHTML='<span class="vatra-editor-page-symbol">'+svg(editMode?'edit':'appearance')+'</span><div><small>ВАТРА · '+(editMode?'ВАША СТОРІНКА':'ПАРАМЕТРИ')+'</small><h1>'+(editMode?'Редагування сторінки':'Налаштування ВАТРИ')+'</h1><p>'+(editMode?'Заповнюйте інформацію про себе й обирайте, хто може її бачити. Всі зміни зберігаються кнопкою внизу.':'Налаштуйте приватність, сповіщення, мову та безпеку Вашого акаунта.')+'</p></div>';
 workspace.before(top);
 if(editMode&&/^[0-9a-f-]{36}$/i.test(uid)){
  const identity=document.createElement('div');identity.className='vatra-editor-id-card';
  identity.innerHTML='<span class="vatra-editor-id-icon">'+svg('profile')+'</span><span class="vatra-editor-id-copy"><b>ID користувача</b><small>Постійний номер у базі ВАТРИ. Для посилання на сторінку використовується @псевдонім.</small><code></code></span><button type="button" class="vatra-editor-id-button" aria-label="Скопіювати ID">Скопіювати</button>';
  identity.querySelector('code').textContent=uid;
  identity.querySelector('button').addEventListener('click',async ()=>{
   try{await navigator.clipboard.writeText(uid);identity.querySelector('button').textContent='Скопійовано ✓';}
   catch{identity.querySelector('button').textContent='Виділіть ID для копіювання';}
  });
  top.after(identity);
 }

 page.querySelectorAll('.vatra-settings-pane').forEach(decoratePane);
 const nav=page.querySelector('.vatra-settings-nav');
 nav?.querySelectorAll('[data-settings-target]').forEach(button=>{
  const key=button.dataset.settingsTarget;
  if(!button.querySelector('svg'))button.insertAdjacentHTML('afterbegin','<svg class="vatra-settings-nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(icons[key]||icons.info)+'</svg>');
  button.dataset.vatraAccent=key;
 });
 const title=nav?.querySelector('.vatra-settings-nav-heading');if(title)title.textContent=editMode?'РОЗДІЛИ СТОРІНКИ':'РОЗДІЛИ НАЛАШТУВАНЬ';
 const paneDescriptions={profile:'Основні дані сторінки, фото та особиста інформація.',contacts:'Контакти й місто. Інформація відображається відповідно до приватності.',education:'Додайте навчальні заклади або знайдіть їх за назвою.',career:'Додайте місця роботи й інформацію про діяльність.',interests:'Захоплення, які Ви хочете показати на сторінці.',service:'Військова служба — за бажанням та з окремою видимістю.',life:'Погляди та особисті пріоритети — необов’язкові поля.'};
 page.querySelectorAll('.vatra-settings-pane').forEach(pane=>{
  const id=pane.dataset.settingsSection;if(!paneDescriptions[id])return;
  const intro=document.createElement('p');intro.className='vatra-editor-pane-subtitle';intro.textContent=paneDescriptions[id];
  pane.prepend(intro);
 });
 // New record rows are rebuilt dynamically; decorate their labels after each insertion.
 page.addEventListener('click',event=>{
  if(event.target.closest('[data-vatra-record-add],[data-vatra-record-remove]'))queueMicrotask(()=>page.querySelectorAll('.vatra-settings-pane').forEach(decoratePane));
 });
 setupPlaceSuggestions(page);
}
