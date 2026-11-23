/* Navigation on VATRA legal pages: follow only a safe VATRA referrer. */
(() => {
  function initDocumentNavigation() {
    const back=document.querySelector(".vatra-document-origin-001");
    if(!back)return;
    const ref=document.referrer;
    if(!ref)return;
    let previous;
    try { previous=new URL(ref); } catch { return; }
    const root=new URL("./",location.href).pathname;
    const clean=path=>path.replace(/\/+$/,"").replace(/\.html$/i,"");
    if(previous.origin!==location.origin||!previous.pathname.startsWith(root)||
       clean(previous.pathname)===clean(location.pathname))return;
    const isHub=document.body.classList.contains("vatra-documents-home-001");
    if(!isHub&&clean(previous.pathname)===clean(root+"documents"))return;
    back.href=previous.href;
    back.hidden=false;
    if(isHub)document.querySelector(".vatra-documents-home-link-001")?.setAttribute("hidden","");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initDocumentNavigation,{once:true});
  else initDocumentNavigation();
})();
