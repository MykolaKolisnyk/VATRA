const CACHE="vatra-offline-shell-v82";
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
 ROOT+"assets/vatryk/vatryk_offline.webp",
 ROOT+"assets/js/offline.js",
 ROOT+"assets/css/sign-in.css",
 ROOT+"assets/css/create-account.css",
 ROOT+"assets/css/recovery.css",
 ROOT+"assets/js/auth-core.js",
 ROOT+"assets/js/sign-in.js",
 ROOT+"assets/js/create-account.js",
 ROOT+"assets/i18n/uk.json",
 ROOT+"assets/i18n/en.json",
 ROOT+"assets/logo/logo.svg",
 ROOT+"assets/logo/logo_symbol.svg",
 ROOT+"assets/logo/logo_app-icon.svg",
 ROOT+"assets/logo/logo_app-icon.webp",
 ROOT+"assets/vatryk/vatryk_detective.webp",
 ROOT+"assets/fonts/Onest-Variable.ttf"
];
const INSTALL_ASSETS=[
 OFFLINE,
 ROOT+"assets/css/offline.css",
 ROOT+"assets/vatryk/vatryk_offline.webp",
 ROOT+"assets/js/offline.js",
 ROOT+"assets/css/base.css",
 ROOT+"assets/logo/logo_symbol.svg"
];
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.add(new Request(OFFLINE,{cache:"reload"}));
  await Promise.allSettled(INSTALL_ASSETS.filter(path=>path!==OFFLINE)
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
async function matchesAssetRevision(response,revision){
 try{
  const data=new Uint8Array(await response.arrayBuffer());
  const prefix=new TextEncoder().encode("blob "+data.length+"\u0000");
  const bytes=new Uint8Array(prefix.length+data.length);bytes.set(prefix);bytes.set(data,prefix.length);
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-1",bytes));
  return Array.from(digest,n=>n.toString(16).padStart(2,"0")).join("")===revision;
 }catch(_){return false;}
}
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(ROOT))return;
 if(request.mode==="navigate"){
  event.respondWith((async()=>{
   try{
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
 const revision=url.searchParams.get("rev")||"";
 const fingerprinted=staticAsset&&/^[a-f0-9]{40}$/.test(revision)&&url.searchParams.size===1&&/\.(?:js|css)$/i.test(url.pathname);
 if(!staticAsset&&!ASSETS.includes(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(fingerprinted){
   const cached=await cache.match(request);
   if(cached)return cached;
   try{
    const fresh=await fetch(request,{cache:"no-cache"});
    if(fresh.ok&&await matchesAssetRevision(fresh.clone(),revision)){
     await cache.put(request,fresh.clone()).catch(()=>{});
     const keys=(await cache.keys()).filter(key=>new URL(key.url).searchParams.has("rev"));
     if(keys.length>80)await Promise.allSettled(keys.slice(0,keys.length-80).map(key=>cache.delete(key)));
    }
    return fresh;
   }catch(_){return Response.error();}
  }
  const translation=staticAsset&&(url.pathname===ROOT+"assets/i18n/uk.json"||
   url.pathname===ROOT+"assets/i18n/en.json");
  if(translation){
   const saved=await cache.match(request);
   if(saved){
    const refresh=fetch(request).then(fresh=>{
     if(fresh.ok)return cache.put(request,fresh.clone());
    }).catch(()=>{});
    event.waitUntil?.(refresh);
    return saved;
   }
  }
  try{
   const fresh=await fetch(request);
   if(fresh.ok)await cache.put(request,fresh.clone()).catch(()=>{});
   return fresh;
  }catch(_){
   return await cache.match(request)||
    (url.search?await cache.match(url.pathname):null)||
    Response.error();
  }
 })());
});
