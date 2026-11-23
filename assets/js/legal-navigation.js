(() => {
  const key="vatra-legal-origin-v1";
  const duration=30*60*1000;
  const root=new URL("./",location.href).pathname;
  const canonical=path=>path.replace(/\/+$/,"").replace(/\.html$/i,"");
  const legal=new Set(["documents","terms","privacy","cookies","commerce"].map(name=>canonical(root+name)));
  const inVATRA=url=>url.origin===location.origin&&url.pathname.startsWith(root);
  const navigate=performance.getEntriesByType("navigation")[0]?.type||"navigate";
  const back=document.querySelector(".vatra-document-origin-001");
  if(!back)return;
  let previous=null;
  try{if(document.referrer)previous=new URL(document.referrer);}catch(_){}
  const isDifferent=previous&&inVATRA(previous)&&canonical(previous.pathname)!==canonical(location.pathname);
  const fromLegal=isDifferent&&legal.has(canonical(previous.pathname));
  const fromOutside=isDifferent&&!fromLegal;
  const read=()=>{
    try{
      const state=JSON.parse(sessionStorage.getItem(key)||"null");
      if(!state||typeof state.path!=="string"||typeof state.at!=="number"||
         Date.now()-state.at>duration||state.at>Date.now()){
        sessionStorage.removeItem(key);return null;
      }
      const url=new URL(state.path,location.origin);
      if(!inVATRA(url)||legal.has(canonical(url.pathname)))return null;
      return url.pathname;
    }catch(_){return null;}
  };
  if(fromOutside){
    try{sessionStorage.setItem(key,JSON.stringify({path:previous.pathname,at:Date.now()}));}catch(_){}
  }else if(!fromLegal&&navigate==="navigate"){
    try{sessionStorage.removeItem(key);}catch(_){}
  }
  const origin=fromOutside?previous.pathname:read();
  if(!origin)return;
  back.href=origin;
  back.hidden=false;
  if(document.body.classList.contains("vatra-documents-home-001"))
    document.querySelector(".vatra-documents-home-link-001")?.setAttribute("hidden","");
})();
