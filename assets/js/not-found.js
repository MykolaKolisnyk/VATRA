
(() => {


    document.addEventListener?.("contextmenu",event=>{
      if(event.target?.closest?.(".ui-404-vatryk-001"))event.preventDefault();
    });
    document.addEventListener?.("dragstart",event=>{
      if(event.target?.closest?.(".ui-404-vatryk-001"))event.preventDefault();
    });
    





    const dynamic=location.pathname.match(/^\/VATRA\/(id|club)([1-9][0-9]{0,18})$/);
    const staticPage=location.pathname.match(/^\/VATRA\/(feed|profile|communities|notifications|friends|gifts|clips|marketplace|vatra-id|club|create-account|forgot|reset|verify|terms|privacy|cookies|offline)$/);
    if(dynamic||staticPage){
      document.documentElement.classList.add("vatra-dynamic-route-pending");


      const titleGuard=new MutationObserver(()=>{
        const node=document.head.querySelector("title");
        if(node&&/^404\b/.test(node.textContent))node.textContent="VATRA";
      });
      titleGuard.observe(document.head,{childList:true,subtree:true,characterData:true});
      const file=dynamic?(dynamic[1]==="id"?"profile.html":"club.html"):staticPage[1]+".html";
      const mount=async()=>{
        try{
          const response=await fetch("/VATRA/"+file,{credentials:"same-origin"});
          if(!response.ok)throw new Error("route document unavailable");
          const markup=await response.text();
          if(!/^\s*<!doctype html>/i.test(markup))throw new Error("invalid route document");


          titleGuard.disconnect();
          document.documentElement.classList.remove("vatra-dynamic-route-pending");
          document.open();
          document.write(markup);
          document.close();
        }catch(_){

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
    const oldAccount=location.pathname.match(/^\/VATRA\/account(?:\.html)?$/);
    if(oldAccount){
      location.replace("/VATRA/verify"+location.search+location.hash);
      return;
    }

    if(/^\/VATRA\/register(?:\.html)?$/.test(location.pathname)){
      location.replace("/VATRA/create-account"+location.search+location.hash);
      return;
    }
    const legacy=location.pathname.match(/^\/VATRA\/(create-account|forgot|reset|feed|profile|friends|gifts|communities|notifications|clips|marketplace|vatra-id|club|verify|terms|privacy|cookies|offline)\.html$/);
    if(legacy){
      location.replace("/VATRA/"+legacy[1]+location.search+location.hash);
      return;
    }
    const found=location.pathname.match(/^\/VATRA\/(ua|en)\/(.*)$/);
    if (!found) return;
    const file=found[2]||"index.html";
    const allowed=new Set(["index.html","create-account.html","register.html","forgot.html","reset.html","account.html","verify.html","feed.html","profile.html","friends.html","gifts.html","communities.html","notifications.html","club.html","terms.html","privacy.html","cookies.html","404.html","offline.html","create-account","register","forgot","reset","feed","profile","friends","gifts","communities","notifications","club","verify","terms","privacy","cookies"]);
    if (!allowed.has(file)) return;


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
