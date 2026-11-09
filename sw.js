/* VATRA: single offline fallback for all pages and both JSON languages. */
const CACHE="vatra-offline-shell-v43";
const ROOT=new URL("./",self.location.href).pathname;
const OFFLINE=ROOT+"offline.html";
const ASSETS=[
 OFFLINE,
 ROOT+"assets/js/lang.js",
 ROOT+"assets/js/errors.js",
 ROOT+"assets/css/auth.css",
 ROOT+"assets/i18n/uk.json",
 ROOT+"assets/i18n/en.json",
 ROOT+"assets/logo/vatra-logo.svg",
 ROOT+"assets/logo/vatra-app-icon.svg",
 ROOT+"favicon.svg",
 ROOT+"assets/fonts/Onest-Variable.ttf"
];
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // The fallback document is essential. Icons, fonts and translations are
  // optional: a temporary missing asset must not abort worker installation.
  await cache.add(OFFLINE);
  await Promise.allSettled(ASSETS.filter(path=>path!==OFFLINE).map(path=>cache.add(path)));
  await self.skipWaiting();
 })());
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