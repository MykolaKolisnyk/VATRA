(function(){
'use strict';
const input=document.getElementById('search');
if(!input)return;
const box=input.closest('.search');
if(!box)return;
const key='vatra-search-history-v2';
const esc=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let recent=[];
try{const value=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(value))recent=value.filter(x=>typeof x==='string'&&x.trim()).slice(0,12);}catch{}
const panel=document.createElement('div');
panel.id='vatraSearchHistory';panel.className='vatra-search-history';panel.setAttribute('role','group');
panel.setAttribute('aria-label','Історія пошуку');panel.hidden=true;
box.appendChild(panel);
function persist(){try{localStorage.setItem(key,JSON.stringify(recent));}catch{}}
function draw(){
 if(!recent.length){
  panel.innerHTML='<div class="vatra-search-history-empty">Недавніх запитів немає</div>';
  return;
 }
 panel.innerHTML='<div class="vatra-search-history-heading"><strong>Недавні пошуки</strong><button type="button" data-vatra-search-clear>Очистити</button></div>'+
 recent.map((query,i)=>'<div class="vatra-search-history-row"><button type="button" data-vatra-search-choice="'+i+'"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg><span>'+esc(query)+'</span></button><button type="button" data-vatra-search-remove="'+i+'" aria-label="Видалити запит '+esc(query)+'">×</button></div>').join('');
}
function open(){draw();panel.hidden=false;box.classList.add('vatra-search-is-open');input.setAttribute('aria-expanded','true');}
function close(){panel.hidden=true;box.classList.remove('vatra-search-is-open');input.setAttribute('aria-expanded','false');}
function save(value){
 const query=String(value||'').trim().slice(0,120);
 if(!query)return;
 recent=[query,...recent.filter(x=>x.toLocaleLowerCase('uk-UA')!==query.toLocaleLowerCase('uk-UA'))].slice(0,12);
 persist();
}
input.setAttribute('aria-controls','vatraSearchHistory');
input.setAttribute('aria-expanded','false');
input.addEventListener('focus',open);
input.addEventListener('keydown',event=>{
 if(event.key==='Escape'){close();return;}
 if(event.key==='Enter'){
  save(input.value);close();
 }
});
panel.addEventListener('pointerdown',event=>event.preventDefault());
panel.addEventListener('click',event=>{
 const remove=event.target.closest('[data-vatra-search-remove]');
 if(remove){recent.splice(Number(remove.dataset.vatraSearchRemove),1);persist();draw();input.focus();return;}
 const clear=event.target.closest('[data-vatra-search-clear]');
 if(clear){recent=[];persist();draw();input.focus();return;}
 const choice=event.target.closest('[data-vatra-search-choice]');
 if(choice){
  const item=recent[Number(choice.dataset.vatraSearchChoice)];
  if(!item)return;
  input.value=item;
  save(item);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  close();
 }
});
document.addEventListener('pointerdown',event=>{
 if(!box.contains(event.target))close();
});
window.addEventListener('popstate',close);
})();