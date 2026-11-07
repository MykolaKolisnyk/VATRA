/* VATRA: single offline fallback for all pages and both JSON languages. */
const CACHE="vatra-offline-shell";
const ROOT="/VATRA/";
const OFFLINE=ROOT+"offline.html";
const ASSETS=[
 OFFLINE,
 ROOT+"assets/js/lang.js",
 ROOT+"assets/i18n/uk.json",
 ROOT+"assets/i18n/en.json",
 ROOT+"assets/logo/vatra-logo.svg",
 ROOT+"assets/fonts/Onest-Variable.ttf"
];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith("vatra-offline-shell")&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(ROOT))return;
 if(request.mode==="navigate"){
  event.respondWith((async()=>{
   try{return await fetch(request);}
   catch(_){
    return await caches.match(OFFLINE)||new Response("VATRA: Offline",{
     status:503,headers:{"Content-Type":"text/plain;charset=utf-8"}
    });
   }
  })());
  return;
 }
 if(ASSETS.includes(url.pathname)&&request.method==="GET"){
  event.respondWith((async()=>{
   try{
    const fresh=await fetch(request);
    if(fresh.ok){
     const cache=await caches.open(CACHE);
     await cache.put(url.pathname,fresh.clone());
    }
    return fresh;
   }catch(_){
    return await caches.match(url.pathname)||Response.error();
   }
  })());
 }
});