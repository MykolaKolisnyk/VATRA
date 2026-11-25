(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const boot=()=>{
  const slot=document.querySelector("#feed-google-ad-slot");
  const app=document.querySelector("#feed-app");
  const publisher=document.querySelector('meta[name="vatra-adsense-client"]')?.content?.trim();
  const adSlot=document.querySelector('meta[name="vatra-adsense-slot"]')?.content?.trim();
  const enabled=document.querySelector('meta[name="vatra-adsense-enabled"]')?.content==="true";
  if(!enabled||!slot||!app||!/^ca-pub-\d{16}$/.test(publisher||"")||!/^\d{10}$/.test(adSlot||""))return;
  if(slot.dataset.adsLoaded||slot.dataset.adsPending)return;
  let started=false,ready=false,ins=null,observer=null,resize=null;
  const original=[...slot.childNodes];
  // A future certified CMP adapter must explicitly authorize the ad request.
  const eligible=()=>{
   try{return !app.hidden&&document.body.dataset.authReady==="true"&&slot.getBoundingClientRect().width>0&&slot.getClientRects().length>0&&window.VATRA_ADS_CONSENT?.canRequestAds?.()===true;}catch(_){return false;}
  };
  const cleanup=()=>{
   observer?.disconnect();resize?.disconnect();
   window.removeEventListener("resize",render);
   window.removeEventListener("vatra:ads-consent-changed",render);
  };
  const fail=()=>{
   delete slot.dataset.adsPending;
   slot.replaceChildren(...original);
   cleanup();
  };
  const render=()=>{
   if(!eligible()||slot.dataset.adsLoaded)return;
   if(!started){
    started=true;slot.dataset.adsPending="true";
    ins=document.createElement("ins");
    ins.className="adsbygoogle ui-feed-adsense-unit-001";
    ins.style.display="block";
    ins.dataset.adClient=publisher;ins.dataset.adSlot=adSlot;
    ins.dataset.adFormat="auto";ins.dataset.fullWidthResponsive="true";
    slot.replaceChildren(ins);
    const code=document.createElement("script");
    code.className="ui-vatra-adsense-script-001";
    code.async=true;code.crossOrigin="anonymous";
    code.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+encodeURIComponent(publisher);
    code.addEventListener("load",()=>{ready=true;render();},{once:true});
    code.addEventListener("error",fail,{once:true});
    document.head.append(code);
    return;
   }
   if(!ready||!ins)return;
   try{
    (window.adsbygoogle=window.adsbygoogle||[]).push({});
    slot.dataset.adsLoaded="true";delete slot.dataset.adsPending;
    cleanup();
   }catch(_){fail();}
  };
  if(typeof MutationObserver==="function"){
   observer=new MutationObserver(render);
   observer.observe(app,{attributes:true,attributeFilter:["hidden"]});
   observer.observe(document.body,{attributes:true,attributeFilter:["data-auth-ready"]});
  }
  if(typeof ResizeObserver==="function"){
   resize=new ResizeObserver(render);resize.observe(slot);
  }
  window.addEventListener("resize",render,{passive:true});
  window.addEventListener("vatra:ads-consent-changed",render);
  render();
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
 else boot();
})();
