(function(){
 if(window.__vatraNetworkStatusLoaded)return;window.__vatraNetworkStatusLoaded=true;
 let bar;
 function ensure(){if(bar)return bar;bar=document.createElement('div');bar.id='vatraNetworkStatus';bar.className='vatra-network-status';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');document.body.appendChild(bar);return bar;}
 function setState(online,restored=false){
  const el=ensure();el.classList.remove('is-offline','is-online','is-visible');
  if(!online){el.textContent='Немає з’єднання з інтернетом. Зміни можуть не зберігатися.';el.classList.add('is-offline','is-visible');return;}
  if(restored){el.textContent='З’єднання відновлено. ВАТРА знову синхронізується.';el.classList.add('is-online','is-visible');window.setTimeout(()=>{if(navigator.onLine)el.classList.remove('is-visible');},4200);}
  else el.classList.remove('is-visible');
 }
 window.addEventListener('offline',()=>setState(false));
 window.addEventListener('online',()=>setState(true,true));
 if(!navigator.onLine)setState(false);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!navigator.onLine)setState(false);});
})();