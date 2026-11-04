// Shared VATRA page/settings editor: readable cards, contextual SVGs and opt-in place suggestions.
// Field queries use only the city typed into the form; no device geolocation.
const icons={
 profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/>',
 photos:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.6"/><path d="m5 18 5-6 3 3 2-2 4 5"/>',
 contacts:'<path d="M4 5h16v14H4zM8 9h4m-4 4h8"/><circle cx="16" cy="9" r="2"/>',
 education:'<path d="m2 9 10-5 10 5-10 5L2 9Zm5 3v6c3 2 7 2 10 0v-6M22 9v8"/>',
 career:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18m-10 0v2h2v-2"/>',
 interests:'<path d="m12 3 2.7 6 6.5.6-5 4.3 1.5 6.3L12 17l-5.7 3.2 1.5-6.3-5-4.3 6.5-.6L12 3Z"/>',
 service:'<path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/>',
 life:'<path d="M12 22V7m0 8c-5 0-7-4-7-8 5 0 7 2 7 7m0-5c0-4 2-6 7-6 0 4-2 8-7 8"/>',
 privacy:'<path d="M12 2 20 5v7c0 5-3 8-8 10-5-2-8-5-8-10V5l8-3Z"/><path d="m9 12 2 2 4-4"/>',
 notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/>',
 appearance:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 language:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9Z"/>',
 account:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 documents:'<path d="M6 3h9l4 4v14H6V3Z"/><path d="M15 3v5h4M9 12h7m-7 4h7"/>',
 blocked:'<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
 pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 name:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/>',
 url:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
 message:'<path d="M4 5h16v12H9l-5 3V5Z"/><path d="M8 9h8M8 13h6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
 phone:'<path d="M7 2h5l1 5-3 2c1.5 3 3 4.5 6 6l2-3 4 1v5c0 2-2 3-4 3C9 21 3 15 3 6c0-2 1-4 4-4Z"/>',
 music:'<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 edit:'<path d="m16 4 4 4M4 20l4-1 12-12a3 3 0 0 0-4-4L4 15 4 20Z"/>'
};
function svg(key){return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">'+(icons[key]||icons.info)+'</svg>';}
const kinds={firstName:'name',lastName:'name',handle:'profile',gender:'profile',city:'pin',location:'pin',hometown:'pin',workplace:'career',education:'education',bio:'info',phone:'phone',dateOfBirth:'calendar',website:'url',
 profileVisibility:'privacy',searchable:'privacy',birthdayVisibility:'privacy',cityVisibility:'privacy',locationVisibility:'privacy',phoneVisibility:'privacy',workplaceVisibility:'privacy',educationVisibility:'privacy',hometownVisibility:'privacy',bioVisibility:'privacy',statusVisibility:'privacy',websiteVisibility:'privacy',
 familyStatus:'profile',spokenLanguages:'language',familyNotes:'profile',activities:'career',hobbies:'interests',music:'music',tv:'interests',films:'interests',books:'education',games:'interests',quotes:'info',serviceNotes:'service',
 politics:'life',worldview:'life',values:'life',peopleValues:'life',smoking:'life',alcohol:'life',inspiration:'interests',lifeNotes:'info'};
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
export function enhanceVatraSettings(page,{editMode=false}={}){
 if(!page||page.dataset.vatraEditorEnhanced)return;
 page.dataset.vatraEditorEnhanced='1';page.classList.add('vatra-editor-polished');
 const workspace=page.querySelector('.vatra-settings-workspace');
 if(!workspace)return;
 const top=document.createElement('header');top.className='vatra-editor-page-header';
 top.innerHTML='<span class="vatra-editor-page-symbol">'+svg(editMode?'edit':'appearance')+'</span><div><small>ВАТРА · '+(editMode?'ВАША СТОРІНКА':'ПАРАМЕТРИ')+'</small><h1>'+(editMode?'Редагування сторінки':'Налаштування ВАТРИ')+'</h1><p>'+(editMode?'Заповнюйте інформацію про себе й обирайте, хто може її бачити. Всі зміни зберігаються кнопкою внизу.':'Налаштуйте приватність, сповіщення, мову та безпеку Вашого акаунта.')+'</p></div>';
 workspace.before(top);
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
