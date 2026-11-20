/* VATRA official-host check. Client-side deterrent, not copy protection. */
(() => {
  "use strict";
  // Public VATRA runs on the official HTTPS origin only. This check prevents
  // unmodified copies from running elsewhere, but cannot protect downloadable
  // static source from someone who edits or removes JavaScript.
  const allowed=location.protocol==="https:" &&
    location.hostname==="mykolakolisnyk.github.io" &&
    /^\/VATRA(?:\/|$)/.test(location.pathname);
  window.VATRA_HOST_ALLOWED = allowed;
  if (allowed) {
    // The public status contains no member data. It is deliberately not cached.
    const root=new URL("/VATRA/",location.origin);
    const path=location.pathname;
    const maintenancePage=/^\/VATRA\/maintenance(?:\.html)?$/.test(path);
    const ownerLogin=/^\/VATRA\/(?:index\.html)?$/.test(path)&&new URLSearchParams(location.search).get("maintenance-admin")==="1";
    const endpoint="https://cxrcycxrlkufozomsxcs.supabase.co";
    const key="sb_publishable_oKypZDxi8PP1oxSylfh5wQ_H6HxeM-i";
    let pending=null;
    function getStatus(){
      if(pending)return pending;
      pending=(async()=>{
        const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),3500);
        try{
          const response=await fetch(endpoint+"/rest/v1/site_maintenance?select=enabled&id=eq.1",{
            headers:{apikey:key,Accept:"application/json"},cache:"no-store",signal:abort.signal
          });
          if(!response.ok)return null;
          const data=await response.json();
          return typeof data?.[0]?.enabled==="boolean"?data[0].enabled:null;
        }catch(_){return null;}finally{clearTimeout(timer);}
      })().finally(()=>{pending=null;});
      return pending;
    }
    window.VATRA_MAINTENANCE_STATUS=getStatus;
    if(maintenancePage||ownerLogin)return;
    let checking=false;
    async function owner(){
      if(document.readyState==="loading")await new Promise(resolve=>document.addEventListener("DOMContentLoaded",resolve,{once:true}));
      if(!window.supabase?.createClient&&!window.VATRA_ADMIN_CONTEXT?.client)return false;
      let client,temporary=false;
      try{
        client=window.VATRA_ADMIN_CONTEXT?.client;
        if(!client){temporary=true;client=window.supabase.createClient(endpoint,key,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,flowType:"pkce"}});}
        const result=await Promise.race([client.rpc("vatra_admin_access"),new Promise(resolve=>setTimeout(()=>resolve(null),3000))]);
        return result?.data===true&&!result.error;
      }catch(_){return false;}finally{if(temporary)client?.auth?.stopAutoRefresh?.();}
    }
    async function check(){
      if(checking||document.visibilityState==="hidden")return;
      checking=true;
      try{
        if(await getStatus()!==true)return;
        if(await owner())return;
        // Re-read after a slow session check, in case maintenance ended meanwhile.
        if(await getStatus()!==true)return;
        location.replace(new URL("maintenance.html",root).href);
      }finally{checking=false;}
    }
    void check();
    const timer=setInterval(check,60000);
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void check();});
    window.addEventListener("pageshow",event=>{if(event.persisted)void check();});
    window.addEventListener("vatra-maintenance-changed",check);
    window.addEventListener("pagehide",event=>{if(!event.persisted)clearInterval(timer);},{once:false});
    return;
  }
  document.documentElement.setAttribute("data-vatra-denied", "");
  const style = document.createElement("style");
  style.textContent = 'html[data-vatra-denied] body{visibility:hidden!important}body.vatra-access-blocked{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f8f9fd;font-family:Onest,system-ui,sans-serif;color:#2C3850}body.vatra-access-blocked main{width:min(100% - 32px,460px);padding:36px 30px;background:#fff;border:1px solid #e3e8f2;border-radius:19px;text-align:center}body.vatra-access-blocked h1{margin:0 0 12px;font-size:25px}body.vatra-access-blocked p{color:#627187;line-height:1.6}body.vatra-access-blocked a{color:#2865D8;font-weight:700;text-decoration:none}';
  document.head.append(style);
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.createElement("main");
    container.className = "ui-host-blocked-container";
    const heading = document.createElement("h1");
    heading.className = "vt-host-blocked-heading";
    heading.textContent = "VATRA";
    const p = document.createElement("p");
    p.className = "vt-host-blocked-explanation";
    p.textContent = "Будь ласка, відкрийте VATRA на офіційному сайті.";
    const a = document.createElement("a");
    a.className = "vt-host-blocked-link";
    a.href = "https://mykolakolisnyk.github.io/VATRA/";
    a.textContent = "Перейти до VATRA";
    container.append(heading, p, a);
    document.body.replaceChildren(container);
    document.body.className = "vatra-access-blocked";
    document.title = "VATRA";
    document.documentElement.removeAttribute("data-vatra-denied");
  }, { once:true });
})();
