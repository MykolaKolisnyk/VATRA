/* VATRA console error notices: no form-validation or resource warnings. */
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;

 const pending=[],seen=new Map();
 let stack=null,shown=0,nextId=0;
 const MAX_VISIBLE=3,MAX_PENDING=12,DISPLAY_MS=5400;
 // A single branded welcome line in DevTools, not an error or warning.
 // Styling is intentionally self-contained: no CSS rules or extra assets.
 try{
  console.log(
   "%cVATRA%c  Ваші люди. Ваші історії. Ваша VATRA.",
   "font:800 38px/1.4 Onest,system-ui,sans-serif;color:#6745dc;letter-spacing:2px;text-shadow:1px 1px 0 #eb4c99;",
   "font:500 13px/1.4 Onest,system-ui,sans-serif;color:#63748f;"
  );
 }catch(_){}

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
  stack.setAttribute("aria-label",english()?"Console errors":"Помилки консолі");
  document.body.append(stack);
 }

 function render(){
  ensureStack();
  if(!stack)return;
  while(pending.length&&shown<MAX_VISIBLE){
   const message=pending.shift();
   const id=++nextId;
   const toast=document.createElement("article");
   toast.className="vatra-error-toast ui-vatra-error-toast-"+id;
   toast.setAttribute("role","status");
   const icon=document.createElement("span");
   icon.className="vatra-error-mark vt-vatra-error-mark-"+id;
   icon.textContent="!";
   icon.setAttribute("aria-hidden","true");
   const info=document.createElement("div");
   info.className="vatra-error-copy ui-vatra-error-copy-"+id;
   const heading=document.createElement("strong");
   heading.className="vt-vatra-error-title-"+id;
   heading.textContent=english()?"VATRA · Error":"VATRA · Помилка";
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

 function notify(value,origin=""){
  let msg=redact(value);
  if(!msg)return;
  if(origin)msg=redact(origin)+": "+msg;
  const now=Date.now();
  if(now-(seen.get(msg)||0)<10000)return;
  seen.set(msg,now);
  if(seen.size>100){
   for(const [key,time] of seen)if(now-time>60000)seen.delete(key);
  }
  if(pending.length<MAX_PENDING)pending.push(msg);
  render();
 }

 const originalError=console.error;
 console.error=function(...args){
  try{originalError.apply(this,args);}finally{
   try{
    const summary=args.slice(0,2).map(x=>x instanceof Error?x.message:
      typeof x==="string"?x:String(x?.message||x?.code||"Error")).join(" · ");
    notify(summary,"console");
   }catch(_){}
  }
 };
 // Uncaught JS exceptions and rejected promises also appear as red errors
 // in DevTools. Ignore resource errors, form messages and browser warnings.
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
