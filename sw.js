/* VATRA offline navigation fallback (same-origin only). */
const CACHE="vatra-offline-shell-v1";
const OFFLINE_UA="/VATRA/ua/offline.html";
const OFFLINE_EN="/VATRA/en/offline.html";
const ASSETS=[OFFLINE_UA,OFFLINE_EN,"/VATRA/assets/logo/vatra-logo.svg","/VATRA/assets/fonts/Onest-Variable.ttf"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith("vatra-offline-shell-")&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 if(event.request.mode!=="navigate"||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  try{return await fetch(event.request);}
  catch(_){
   const url=new URL(event.request.url);
   const accepted=(event.request.headers.get("accept-language")||"").toLowerCase();
   const lang=url.pathname.startsWith("/VATRA/en/")?"en":url.pathname.startsWith("/VATRA/ua/")?"uk":null;
   const saved=lang||(accepted.startsWith("uk")||accepted.startsWith("ru-ua")?"uk":"en");
   const fallback=await caches.match(saved==="en"?OFFLINE_EN:OFFLINE_UA);
   return fallback||new Response("VATRA: Offline",{status:503,headers:{"Content-Type":"text/plain;charset=utf-8"}});
  }
 })());
});