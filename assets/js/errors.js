/* VATRA console errors and warnings; form validation stays beside fields. */
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;

 const pending=[],seen=new Map();
 let stack=null,shown=0,nextId=0;
 const MAX_VISIBLE=3,MAX_PENDING=12,DISPLAY_MS=5400;
 const english=()=>document.documentElement.lang==="en";

 function redact(value){
  const raw=value instanceof Error?value.message:String(value??"");
  return raw
   .replace(/(?:access_token|refresh_token|id_token|api[_-]?key|authorization|bearer|password|secret)\s*[:=]\s*[^\s&;,]+/gi,"[private]")
   .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}(?:\.[A-Za-z0-9_-]+)?/g,"[private]")
   .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,"[email hidden]")
   .replace(/https?:\/\/[^\s"'<>]+/gi,rawUrl=>{
    try{
     const url=new URL(rawUrl);
     return url.hostname+url.pathname;
    }catch(_){return "[address]";}
   })
   .replace(/[A-Za-z0-9_-]{85,}/g,"[private]")
   .replace(/[\x00-\x1f]+/g," ")
   .trim().slice(0,240);
 }

 function ensureStack(){
  if(stack||!document.body)return;
  stack=document.createElement("div");
  stack.className="vatra-error-stack ui-vatra-error-stack-001";
  stack.setAttribute("role","region");
  stack.setAttribute("aria-live","polite");
  stack.setAttribute("aria-label",english()?"Console errors and warnings":"Помилки й попередження консолі");
  document.body.append(stack);
 }

 function render(){
  ensureStack();
  if(!stack)return;
  while(pending.length&&shown<MAX_VISIBLE){
   const {message,kind}=pending.shift();
   const id=++nextId;
   const toast=document.createElement("article");
   toast.className="vatra-error-toast"+(kind==="warning"?" vatra-error-toast--warning":"")+" ui-vatra-error-toast-"+id;
   toast.setAttribute("role","status");
   const icon=document.createElement("span");
   icon.className="vatra-error-mark vt-vatra-error-mark-"+id;
   if(kind==="warning"){
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox","0 0 24 24");
    svg.setAttribute("aria-hidden","true");
    svg.classList.add("vt-vatra-warning-icon-"+id);
    const outline=document.createElementNS("http://www.w3.org/2000/svg","path");
    outline.setAttribute("d","M10.27 4.16a2 2 0 0 1 3.46 0L22 18.5a2 2 0 0 1-1.73 3H3.73a2 2 0 0 1-1.73-3L10.27 4.16Z");
    outline.setAttribute("class","vt-vatra-warning-shape-"+id);
    const mark=document.createElementNS("http://www.w3.org/2000/svg","path");
    mark.setAttribute("d","M12 9v5m0 3h.01");
    mark.setAttribute("class","vt-vatra-warning-detail-"+id);
    svg.append(outline,mark);
    icon.append(svg);
   }else icon.textContent="!";
   icon.setAttribute("aria-hidden","true");
   const info=document.createElement("div");
   info.className="vatra-error-copy ui-vatra-error-copy-"+id;
   const heading=document.createElement("strong");
   heading.className="vt-vatra-error-title-"+id;
   heading.textContent=kind==="warning"
    ?(english()?"VATRA · Warning":"VATRA · Попередження")
    :(english()?"VATRA · Error":"VATRA · Помилка");
   const detail=document.createElement("p");
   detail.className="vt-vatra-error-description-"+id;
   detail.textContent=message;
   info.append(heading,detail);
   const close=document.createElement("button");
   close.type="button";
   close.className="vatra-error-dismiss vt-vatra-error-dismiss-"+id;
   close.textContent="×";
   close.setAttribute("aria-label",english()?"Dismiss":"Закрити");
   toast.append(icon,info,close);
   stack.append(toast);
   shown++;
   let finished=false;
   const dismiss=()=>{
    if(finished)return;
    finished=true;
    toast.classList.remove("is-visible");
    setTimeout(()=>{
     toast.remove();
     shown=Math.max(0,shown-1);
     render();
    },220);
   };
   close.addEventListener("click",dismiss);
   requestAnimationFrame(()=>toast.classList.add("is-visible"));
   // No hover pause: alerts always disappear on their own.
   setTimeout(dismiss,DISPLAY_MS);
  }
 }

 function notify(value,origin="",kind="error"){
  let msg=redact(value);
  if(!msg)return;
  if(origin)msg=redact(origin)+": "+msg;
  const now=Date.now();
  const key=kind+":"+msg;
  if(now-(seen.get(key)||0)<10000)return;
  seen.set(key,now);
  if(seen.size>100){
   for(const [key,time] of seen)if(now-time>60000)seen.delete(key);
  }
  if(pending.length<MAX_PENDING)pending.push({message:msg,kind});
  render();
 }

 function formatConsoleArgs(args){
  return args.slice(0,2).map(x=>x instanceof Error?x.message:
   typeof x==="string"?x:String(x?.message||x?.code||"Message")).join(" · ");
 }
 // Keep the original DevTools output, then mirror only console errors and warnings.
 for(const kind of ["error","warn"]){
  const original=console[kind];
  console[kind]=function(...args){
   try{original.apply(this,args);}finally{
    try{notify(formatConsoleArgs(args),"console",kind==="warn"?"warning":"error");}
    catch(_){}
   }
  };
 }
 // Uncaught JS exceptions and rejected promises appear as errors in DevTools.
 // Browser-generated Issues and network warnings are not exposed to page scripts.
 window.addEventListener("error",event=>{
  if(event.target!==window)return;
  const file=event.filename?event.filename.split("/").pop().split("?")[0]:"JavaScript";
  notify(event.message||"Uncaught script error",file+(event.lineno?":"+event.lineno:""));
 });
 window.addEventListener("unhandledrejection",event=>{
  notify(event.reason?.message||event.reason||"Unhandled promise rejection","Promise");
 });
 if(document.readyState==="loading")
  document.addEventListener("DOMContentLoaded",render,{once:true});
 else render();
})();
