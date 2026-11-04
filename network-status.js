(function(){
 if(window.__vatraNetworkStatusLoaded)return;
 window.__vatraNetworkStatusLoaded=true;
 let overlay,restoreTimer;
 function ensure(){
  if(overlay)return overlay;
  overlay=document.createElement('section');
  overlay.id='vatraOfflineScreen';overlay.className='vatra-offline-screen';
  overlay.hidden=true;overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');
  overlay.innerHTML='<div class="vatra-offline-card"><div class="vatra-offline-mascot" aria-hidden="true"><img class="vatra-offline-flame" src="vatra-flame.svg?v=20261028-3" alt=""></div><p class="vatra-offline-kicker">ВАТРА · НА ЗВ’ЯЗКУ</p><h1 id="vatraOfflineTitle">Наш вогник загубив зв’язок</h1><p class="vatra-offline-lead" id="vatraOfflineMessage">Схоже, інтернет тимчасово зник. Нічого страшного — перевіримо з’єднання й повернемося до твоїх історій.</p><div class="vatra-offline-guide"><strong>Що можна зробити:</strong><ol><li>Перевір Wi-Fi або мобільний інтернет.</li><li>Якщо користуєшся VPN, спробуй перепід’єднати його.</li><li>Коли з’єднання з’явиться, натисни кнопку нижче.</li></ol></div><div class="vatra-offline-actions"><button type="button" class="vatra-offline-retry" id="vatraOfflineRetry">Перевірити з’єднання</button></div><p class="vatra-offline-status" id="vatraOfflineStatus" aria-live="polite">ВАТРИК чекає на повернення зв’язку.</p></div>';
  overlay.querySelector('#vatraOfflineRetry').addEventListener('click',async()=>{
   const status=overlay.querySelector('#vatraOfflineStatus'),button=overlay.querySelector('#vatraOfflineRetry');
   if(!navigator.onLine){status.textContent='З’єднання ще немає. Перевір Wi-Fi, роутер або VPN і спробуй знову.';return;}
   button.disabled=true;status.textContent='Перевіряємо доступність сторінки…';
   try{
    const response=await fetch(location.href,{method:'HEAD',cache:'no-store',credentials:'same-origin'});
    if(!response.ok)throw new Error('page-unreachable');
    status.textContent='Сайт доступний. Відновлюємо відображення без перезавантаження сторінки.';
    hideOffline(true);
    window.dispatchEvent(new CustomEvent('vatra:retry-connection'));
   }catch{
    status.textContent='Інтернет є, але сторінка поки не відповідає. Перевір VPN або спробуй пізніше.';
   }finally{button.disabled=false;}
  });
  document.body.appendChild(overlay);return overlay;
 }
 function showOffline(kind='offline',reason=''){
  const el=ensure();
  window.clearTimeout(restoreTimer);
  const title=el.querySelector('#vatraOfflineTitle'),message=el.querySelector('#vatraOfflineMessage'),status=el.querySelector('#vatraOfflineStatus');
  if(kind==='unreachable'){
   title.textContent='ВАТРА не може з’єднатися із сервером';
   message.textContent='Інтернет ніби є, але ВАТРА поки не отримує відповідь. Це може бути тимчасова проблема мережі або сервера.';
   status.textContent='Перевір інтернет і натисни «Перевірити з’єднання». Якщо проблема не зникає, спробуй пізніше.';
  }else{
   title.textContent='Наш вогник загубив зв’язок';
   message.textContent='Схоже, інтернет тимчасово зник. Нічого страшного — перевіримо з’єднання й повернемося до твоїх історій.';
   status.textContent='ВАТРИК чекає на повернення зв’язку.';
  }
  el.hidden=false;document.body.classList.add('vatra-offline-active');
 }
 function hideOffline(restored=false){
  if(!overlay)return;
  window.clearTimeout(restoreTimer);
  if(restored){
   const status=overlay.querySelector('#vatraOfflineStatus');
   if(status)status.textContent='З’єднання відновлено! Повертаємося до ВАТРИ.';
   restoreTimer=window.setTimeout(()=>{overlay.hidden=true;document.body.classList.remove('vatra-offline-active');},1800);
   return;
  }
  overlay.hidden=true;document.body.classList.remove('vatra-offline-active');
 }
 window.addEventListener('offline',()=>showOffline('offline'));
 window.addEventListener('online',()=>hideOffline(true));
 window.addEventListener('vatra:connection',event=>{
  if(!navigator.onLine){showOffline('offline');return;}
  if(event.detail?.online)hideOffline(true);
  else showOffline('unreachable',event.detail?.reason||'');
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!navigator.onLine)showOffline('offline');});
 if(!navigator.onLine)showOffline('offline');
})();