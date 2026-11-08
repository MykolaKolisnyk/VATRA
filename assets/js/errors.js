/* VATRA: visible, privacy-aware notices for page errors and form failures. */
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const queue=[],recent=new Map();
 const DISPLAYED=3,MAX_QUEUE=45;
 let region=null,active=0,sequence=0;
 const language=()=>document.documentElement.lang==="en";
 function protect(raw){
  let value=raw instanceof Error?raw.message:String(raw??"");
  return value
   .replace(/(?:access_token|refresh_token|id_token|apikey|api_key|authorization|bearer|password)\s*=\s*[^\s&;,]+/gi,"[private]")
   .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}(?:\.[A-Za-z0-9_-]+)?/g,"[private]")
   .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,"[email hidden]")
   .replace(/https?:\/\/[^\s"'<>]+/gi,url=>{
    try{const parsed=new URL(url);return parsed.hostname+(parsed.pathname||"/");}catch(_){return "[address]";}
   })
   .replace(/[A-Za-z0-9_-]{85,}/g,"[private]")
   .replace(/[\x00-\x1f]+/g," ")
   .trim().slice(0,250);
 }
 function ensure(){
  if(region||!document.body)return;
  region=document.createElement("div");
  region.className="vatra-error-stack ui-vatra-error-stack-001";
  region.setAttribute("aria-label",language()?"Error notifications":"Повідомлення про помилки");
  region.setAttribute("aria-live","polite");
  region.setAttribute("role","region");
  document.body.append(region);
 }
 function next(){
  ensure();
  if(!region)return;
  while(queue.length&&active<DISPLAYED){
   const item=queue.shift();
   const toast=document.createElement("article");
   toast.className="vatra-error-toast ui-vatra-error-toast-"+(++sequence);
   toast.setAttribute("role","status");
   const mark=document.createElement("span");
   mark.className="vatra-error-mark vt-vatra-error-mark-"+sequence;
   mark.textContent="!";
   mark.setAttribute("aria-hidden","true");
   const copy=document.createElement("div");
   copy.className="vatra-error-copy ui-vatra-error-copy-"+sequence;
   const title=document.createElement("strong");
   title.className="vt-vatra-error-title-"+sequence;
   title.textContent=language()?"Error":"Помилка";
   const description=document.createElement("p");
   description.className="vt-vatra-error-description-"+sequence;
   description.textContent=item.message;
   copy.append(title,description);
   const close=document.createElement("button");
   close.className="vatra-error-dismiss vt-vatra-error-dismiss-"+sequence;
   close.type="button";
   close.textContent="×";
   close.setAttribute("aria-label",language()?"Dismiss error":"Закрити повідомлення");
   toast.append(mark,copy,close);
   region.append(toast);active++;
   let timer=null,closing=false;
   const dismiss=()=>{
    if(closing)return;
    closing=true;clearTimeout(timer);
    toast.classList.remove("is-visible");
    const remove=()=>{
     if(!toast.isConnected)return;
     toast.remove();active=Math.max(0,active-1);next();
    };
    setTimeout(remove,240);
   };
   const schedule=()=>{clearTimeout(timer);timer=setTimeout(dismiss,8500);};
   close.addEventListener("click",dismiss);
   toast.addEventListener("pointerenter",()=>clearTimeout(timer));
   toast.addEventListener("pointerleave",schedule);
   requestAnimationFrame(()=>toast.classList.add("is-visible"));
   schedule();
  }
 }
 function show(message,context=""){
  const safe=protect(message);
  if(!safe)return;
  const value=context?protect(context)+": "+safe:safe;
  const now=Date.now();
  if(now-(recent.get(value)||0)<4500)return;
  recent.set(value,now);
  if(recent.size>110){for(const [key,ts] of recent)if(now-ts>60000)recent.delete(key);}
  if(queue.length<MAX_QUEUE)queue.push({message:value});
  if(document.body)next();
 }
 window.VATRA_ERRORS={show};
 window.addEventListener("error",event=>{
  try{
   if(event.target&&event.target!==window){
    const resource=event.target;
    const raw=resource.getAttribute?.("src")||resource.getAttribute?.("href");
    if(raw){
     const url=new URL(raw,document.baseURI);
     show((language()?"Could not load ":"Не завантажився ресурс ")+url.pathname.split("/").pop(),"resource");
    }
   }else{
    const source=event.filename?event.filename.split("/").pop().split("?")[0]+":"+(event.lineno||0):"JavaScript";
    show(event.message||"Script error",source);
   }
  }catch(_){}
 },true);
 window.addEventListener("unhandledrejection",event=>{
  const reason=event.reason;
  show(reason?.message||reason||"Unhandled promise rejection","Promise");
 });
 const previous=console.error;
 console.error=function(...args){
  try{previous.apply(this,args);}finally{
   try{
    const content=args.slice(0,3).map(value=>value instanceof Error?value.message:
     typeof value==="string"?value:String(value?.message||value?.code||"Error")).join(" · ");
    show(content,"console");
   }catch(_){}
  }
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",next,{once:true});
 else next();
})();
