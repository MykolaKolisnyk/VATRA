/* VATRA: single offline fallback for all pages and both JSON languages. */
const CACHE="vatra-offline-shell-v55";
const ROOT=new URL("./",self.location.href).pathname;
const OFFLINE=ROOT+"offline.html";
const ASSETS=[
 OFFLINE,
 ROOT+"assets/js/lang.js",
 ROOT+"assets/js/public-name-cache.js",
 ROOT+"assets/css/base.css",
 ROOT+"assets/css/not-found.css",
 ROOT+"assets/js/not-found.js",
 ROOT+"assets/css/offline.css",
 ROOT+"assets/js/offline.js",
 ROOT+"assets/css/sign-in.css",
 ROOT+"assets/css/create-account.css",
 ROOT+"assets/css/recovery.css",
 ROOT+"assets/js/auth-core.js",
 ROOT+"assets/js/sign-in.js",
 ROOT+"assets/js/create-account.js",
 ROOT+"assets/i18n/uk.json",
 ROOT+"assets/i18n/en.json",
 ROOT+"assets/logo/vatra-logo.svg",
 ROOT+"assets/logo/vatra-symbol.svg",
 ROOT+"assets/logo/vatra-app-icon.svg",
 ROOT+"assets/fonts/Onest-Variable.ttf"
];
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // The fallback document is essential. Icons, fonts and translations are
  // optional: a temporary missing asset must not abort worker installation.
  await cache.add(new Request(OFFLINE,{cache:"reload"}));
  await Promise.allSettled(ASSETS.filter(path=>path!==OFFLINE)
   .map(path=>cache.add(new Request(path,{cache:"reload"}))));
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
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(ROOT))return;
 if(request.mode==="navigate"){
  event.respondWith((async()=>{
   try{
    // Revalidate HTML; do not store member pages or private state.
    return await fetch(request,{cache:"no-cache"});
   }catch(_){
    return await caches.match(OFFLINE)||new Response("VATRA: Offline",{
     status:503,headers:{"Content-Type":"text/plain;charset=utf-8"}
    });
   }
  })());
  return;
 }
 const staticAsset=url.pathname.startsWith(ROOT+"assets/")&&
  /\.(?:css|js|json|svg|ttf|woff2?)$/i.test(url.pathname);
 if(!staticAsset&&!ASSETS.includes(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   // Always revalidate source files; cache-first served obsolete base.css
   // together with newer profile/feed CSS, hiding avatars and active states.
   const fresh=await fetch(request,{cache:"no-cache"});
   if(fresh.ok)await cache.put(request,fresh.clone()).catch(()=>{});
   return fresh;
  }catch(_){
   // Use last valid static file only when offline.
   return await cache.match(request)||
    (url.search?await cache.match(url.pathname):null)||
    Response.error();
  }
 })());
});
