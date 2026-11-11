/* VATRA Google AdSense slot: never fabricate a publisher or ad-unit ID.
   Fill both meta tags in feed.html after AdSense approval. */
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const boot=()=>{
  const slot=document.querySelector("#feed-google-ad-slot");
  const publisher=document.querySelector('meta[name="vatra-adsense-client"]')?.content?.trim();
  const adSlot=document.querySelector('meta[name="vatra-adsense-slot"]')?.content?.trim();
  if(!slot||!/^ca-pub-\d{16}$/.test(publisher||"")||!/^\d{10}$/.test(adSlot||""))return;
  const render=()=>{
   if(slot.dataset.adsLoaded)return;
   slot.dataset.adsLoaded="true";
   const ins=document.createElement("ins");
   ins.className="adsbygoogle ui-feed-adsense-unit-001";
   ins.style.display="block";
   ins.dataset.adClient=publisher;
   ins.dataset.adSlot=adSlot;
   ins.dataset.adFormat="auto";
   ins.dataset.fullWidthResponsive="true";
   slot.replaceChildren(ins);
   const code=document.createElement("script");
   code.async=true;code.crossOrigin="anonymous";
   code.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+encodeURIComponent(publisher);
   code.addEventListener("load",()=>{try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(_){/* ads may be blocked */}});
   document.head.append(code);
  };
  render();
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
 else boot();
})();
