/* VATRA — GitHub Pages permalink fallback and legacy URL redirects.
   Loaded synchronously before localization to avoid displaying the 404 page
   while resolving /idN or /clubN. */
(() => {
    /* Existing bookmarks and Supabase email links may use former locale folders. */
    // Old email links and saved .html URLs remain valid, but visitors see
    // the clean canonical route after the first navigation.
    // GitHub Pages serves this fallback for /idN and /clubN. Render the
    // corresponding static document in-place, so the browser never visits
    // /profile.html or /club.html on its way to a permanent public URL.
    const legacyProfile=location.pathname.match(/^\/VATRA\/id=([1-9][0-9]{0,18})$/);
    if(legacyProfile){
      // Older /id=123 links move to the current /id123 permalink.
      location.replace("/VATRA/id"+legacyProfile[1]+location.search+location.hash);
      return;
    }
    const dynamic=location.pathname.match(/^\/VATRA\/(id|club)([1-9][0-9]{0,18})$/);
    if(dynamic){
      document.documentElement.classList.add("vatra-dynamic-route-pending");
      // The fallback HTTP response is a 404 on GitHub Pages, but the browser
      // tab must never display a transient "404" label for valid permalinks.
      const titleGuard=new MutationObserver(()=>{
        const node=document.head.querySelector("title");
        if(node&&/^404\b/.test(node.textContent))node.textContent="VATRA";
      });
      titleGuard.observe(document.head,{childList:true,subtree:true,characterData:true});
      const file=dynamic[1]==="id"?"profile.html":"club.html";
      const mount=async()=>{
        try{
          const response=await fetch("/VATRA/"+file,{credentials:"same-origin"});
          if(!response.ok)throw new Error("route document unavailable");
          const markup=await response.text();
          if(!/^\s*<!doctype html>/i.test(markup))throw new Error("invalid route document");
          // Replace the router document with the real profile/club document.
          // Its own language handler and loading screen now start exactly once.
          titleGuard.disconnect();
          document.documentElement.classList.remove("vatra-dynamic-route-pending");
          document.open();
          document.write(markup);
          document.close();
        }catch(_){
          // On failure reveal the actual 404 page and initialize its locale.
          titleGuard.disconnect();
          document.documentElement.classList.remove("vatra-dynamic-route-pending");
          document.title="404 Сторінку не знайдено · VATRA";
          const locale=document.createElement("script");
          locale.className="ui-404-route-locale-recovery-001";
          locale.src="/VATRA/assets/js/lang.js";
          document.head.append(locale);
        }
      };
      if(document.readyState==="loading")
        document.addEventListener("DOMContentLoaded",mount,{once:true});
      else void mount();
      return;
    }
    // GitHub Pages may also route extensionless document URLs through 404.
    // Send the browser to the existing static HTML file immediately; lang.js
    // restores the clean extensionless URL with history.replaceState.
    const pageRoute=location.pathname.match(/^\/VATRA\/(feed|profile|communities|notifications|club|create-account|forgot|reset|verify|terms|privacy|cookies|offline)$/);
    if(pageRoute){
      location.replace("/VATRA/"+pageRoute[1]+".html"+location.search+location.hash);
      return;
    }

    const oldAccount=location.pathname.match(/^\/VATRA\/account(?:\.html)?$/);
    if(oldAccount){
      location.replace("/VATRA/verify"+location.search+location.hash);
      return;
    }
    // Preserve old bookmarks but never show the obsolete account-creation route.
    if(/^\/VATRA\/register(?:\.html)?$/.test(location.pathname)){
      location.replace("/VATRA/create-account"+location.search+location.hash);
      return;
    }
    const legacy=location.pathname.match(/^\/VATRA\/(create-account|forgot|reset|feed|profile|verify|terms|privacy|cookies|offline)\.html$/);
    if(legacy){
      location.replace("/VATRA/"+legacy[1]+location.search+location.hash);
      return;
    }
    const found=location.pathname.match(/^\/VATRA\/(ua|en)\/(.*)$/);
    if (!found) return;
    const file=found[2]||"index.html";
    const allowed=new Set(["index.html","create-account.html","register.html","forgot.html","reset.html","account.html","verify.html","feed.html","profile.html","terms.html","privacy.html","cookies.html","404.html","offline.html","create-account","register","forgot","reset","feed","profile","verify","terms","privacy","cookies"]);
    if (!allowed.has(file)) return;
    // Existing language preferences always win over old /ua/ or /en/ links.
    // Follow an old link's language only for visitors without a saved choice.
    const key="vatra-language";
    let selected=null;
    try {
      const match=document.cookie.split(";").map(item=>item.trim())
        .find(item=>item.startsWith(key+"="));
      if(match){
        const value=decodeURIComponent(match.slice(key.length+1));
        if(value==="uk"||value==="en")selected=value;
      }
    }catch(_){}
    if(!selected){
      try {
        const value=localStorage.getItem(key);
        if(value==="uk"||value==="en")selected=value;
      }catch(_){}
    }
    if(!selected){
      try{localStorage.setItem(key,found[1]==="en"?"en":"uk");}catch(_){}
    }
    const cleanFile=file.replace(/\.html$/,"").replace(/^account$/,"verify").replace(/^register$/,"create-account");
    const target="/VATRA/"+(cleanFile==="index"?"":cleanFile);
    location.replace(target+location.search+location.hash);
  })();
