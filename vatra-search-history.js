(function(){
'use strict';
const targets=[
 ['#search','global'],['#vatraFriendsFilter','friends'],
 ['#vatraPublicFriendsSearch','friends'],['#vatraCommunitySearch','communities'],
 ['#vatraChatSearch','messages']
];
const wired=new WeakSet();
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setup(input,scope){
 if(wired.has(input))return;wired.add(input);
 const container=input.closest('label')||input.parentElement;
 if(!container)return;
 container.classList.add('vatra-search-history-anchor');
 const key='vatra-search-history-v3:'+scope;
 let recent=[];
 try{
  const data=JSON.parse(localStorage.getItem(key)||'[]');
  if(Array.isArray(data))recent=data.filter(v=>typeof v==='string'&&v.trim()).slice(0,12);
 }catch{}
 const panel=document.createElement('div');
 panel.className='vatra-search-history';
 panel.id='vatra-search-history-'+scope;
 panel.setAttribute('role','group');
 panel.setAttribute('aria-label','Недавні запити');
 panel.hidden=true;
 container.append(panel);
 input.setAttribute('aria-expanded','false');
 input.setAttribute('aria-controls',panel.id);
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify(recent));}catch{}};
 const save=query=>{
  const value=String(query||'').trim().slice(0,120);
  if(!value)return;
  recent=[value,...recent.filter(v=>v.toLocaleLowerCase('uk-UA')!==value.toLocaleLowerCase('uk-UA'))].slice(0,12);
  persist();
 };
 const draw=()=>{
  panel.innerHTML=recent.length
   ?'<div class="vatra-search-history-heading"><strong>Недавні пошуки</strong><button type="button" data-history-clear>Очистити</button></div>'+
    recent.map((v,i)=>'<div class="vatra-search-history-row"><button type="button" data-history-select="'+i+'"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg><span>'+escapeHTML(v)+'</span></button><button type="button" data-history-remove="'+i+'" aria-label="Видалити запит '+escapeHTML(v)+'">×</button></div>').join('')
   :'<div class="vatra-search-history-empty">Недавніх запитів немає</div>';
 };
 const open=()=>{draw();panel.hidden=false;input.setAttribute('aria-expanded','true');};
 const close=()=>{panel.hidden=true;input.setAttribute('aria-expanded','false');};
 input.addEventListener('focus',open);
 input.addEventListener('change',()=>save(input.value));
 input.addEventListener('keydown',event=>{
  if(event.key==='Escape'){close();return;}
  if(event.key==='Enter'){save(input.value);close();}
 });
 input.addEventListener('blur',()=>save(input.value));
 panel.addEventListener('pointerdown',event=>event.preventDefault());
 panel.addEventListener('click',event=>{
  const remove=event.target.closest('[data-history-remove]');
  if(remove){recent.splice(Number(remove.dataset.historyRemove),1);persist();draw();return;}
  if(event.target.closest('[data-history-clear]')){recent=[];persist();draw();return;}
  const selected=event.target.closest('[data-history-select]');
  if(!selected)return;
  const value=recent[Number(selected.dataset.historySelect)];
  if(!value)return;
  input.value=value;save(value);input.dispatchEvent(new Event('input',{bubbles:true}));
  close();input.focus({preventScroll:true});
 });
 document.addEventListener('pointerdown',event=>{if(!container.contains(event.target))close();});
 window.addEventListener('popstate',close);
}
function install(){
 for(const [selector,scope] of targets){
  document.querySelectorAll(selector).forEach(input=>setup(input,scope));
 }
}
let queued=false;
const observer=new MutationObserver(()=>{
 if(queued)return;queued=true;
 requestAnimationFrame(()=>{queued=false;install();});
});
observer.observe(document.body,{childList:true,subtree:true});
install();
})();