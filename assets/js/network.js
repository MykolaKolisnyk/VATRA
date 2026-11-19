/* VATRA network status: non-destructive banner plus pre-cached offline page. */
(() => {
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const scriptUrl=new URL(document.currentScript?.src||"assets/js/network.js",document.baseURI);
 const projectBase=new URL("../../",scriptUrl);
 // Explicit service responses only: never intercept console, fetch or unhandled rejections.
 const serviceNotices=Object.freeze({
  "403":["vatryk_403.webp","Доступ заборонено","Access denied","Ви не маєте дозволу на виконання цієї дії.","You do not have permission to perform this action."],
  "429":["vatryk_429.webp","Забагато запитів","Too many requests","Спробуйте виконати цю дію трохи пізніше.","Please try this action again in a little while."],
  "500":["vatryk_500.webp","Щось пішло не так","Something went wrong","Виникла неочікувана помилка. Спробуйте ще раз.","An unexpected error occurred. Please try again."],
  "503":["vatryk_503.webp","Сервіс тимчасово недоступний","Service temporarily unavailable","Спробуйте ще раз трохи пізніше.","Please try again a little later."],
  "blocked":["vatryk_account-blocking.webp","Акаунт заблоковано","Account blocked","Доступ до Вашого акаунта обмежено.","Access to your account has been restricted."],
  "deleted":["vatryk-deleted.webp","Акаунт видалено","Account deleted","Зверніться до підтримки VATRA.","Contact VATRA support."],
  "session":["vatryk_ending-the-session.webp","Сеанс завершено","Session ended","Увійдіть у свій акаунт, щоб продовжити користуватися VATRA.","Sign in to your account to continue using VATRA."]
 });
 const translate=(uk,en)=>{const locale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang;return locale==="en"?en:locale==="uk"?uk:window.VATRA_LANGUAGE?.translate?.(uk)||uk;};
 const make=(tag,cls,copy)=>{const el=document.createElement(tag);el.className=cls;if(copy!==undefined)el.textContent=copy;return el;};
 let serviceDialog=null;
 function classifyServiceError(result,{session=false,access=true}={}){
  if(!result)return null;
  const e=result.error||result;
  const status=Number(result.status||e.status||e.statusCode||0),code=String(e.code||"");
  if(session&&["session_expired","session_not_found","refresh_token_not_found","refresh_token_already_used","bad_jwt","PGRST301","PGRST303"].includes(code))return "session";
  if(status===429||["over_request_rate_limit","over_email_send_rate_limit","over_sms_send_rate_limit"].includes(code))return "429";
  if(status===500)return "500";
  if([502,503,504].includes(status))return "503";
  if(access&&(status===403||code==="42501"))return "403";
  return null;
 }
 function showServiceNotice(kind,options={}){
  const config=serviceNotices[String(kind)];if(!config||!document.body)return null;
  if(serviceDialog?.isConnected&&serviceDialog.open){
   if(serviceDialog.dataset.serviceCode===String(kind))return serviceDialog;
   const accountBlock=kind==="blocked"||kind==="deleted",activeBlock=["blocked","deleted"].includes(serviceDialog.dataset.serviceCode);
   if(activeBlock||(!accountBlock&&serviceDialog.dataset.locked==="true"))return null;
   if(!accountBlock&&kind!=="session"&&!options.locked)return null;
   const previous=serviceDialog;previous.close();previous.remove();
  }
  const [file,uk,en,copyUk,copyEn]=config,locked=options.locked===true||kind==="session";
  const d=make("dialog","ui-vatra-service-notice-001");d.dataset.serviceCode=String(kind);d.dataset.locked=String(locked);
  d.setAttribute("aria-labelledby","vatra-service-notice-title");d.setAttribute("aria-describedby","vatra-service-notice-copy");
  const picture=make("img","ui-vatra-service-notice-art-001");picture.src=new URL("assets/vatryk/"+file,projectBase).href;picture.alt="";picture.width=240;picture.height=240;picture.decoding="async";picture.addEventListener("error",()=>{picture.hidden=true;},{once:true});
  const title=make("h2","vt-vatra-service-notice-title-001",translate(uk,en));title.id="vatra-service-notice-title";
  const copy=make("p","vt-vatra-service-notice-copy-001",options.description||translate(copyUk,copyEn));copy.id="vatra-service-notice-copy";
  const actions=make("div","ui-vatra-service-notice-actions-001");
  const isSession=kind==="session",retry=kind==="500"||kind==="503"?options.retry:null;
  const label=options.actionLabel||(isSession?translate("Увійти","Sign in"):retry?translate("Повторити спробу","Retry"):translate("Зрозуміло","Got it"));
  const action=make("button","vt-vatra-service-notice-action-001",label);action.type="button";
  action.addEventListener("click",async()=>{if(action.disabled)return;action.disabled=true;
   try{if(options.onAction){await options.onAction();}else if(isSession){location.replace(projectBase.href);return;}else if(retry){d.close();await retry();return;}if(d.open&&!locked)d.close();}
   catch(_){/* The underlying action keeps its own error UI; never swallow a locked restriction. */}
   finally{action.disabled=false;}
  });
  if(options.support){const support=make("a","vt-vatra-service-notice-support-001",translate("Техпідтримка","Support"));support.href="mailto:vatra.support@gmail.com";actions.append(support);}
  actions.append(action);d.append(picture,title,copy,actions);
  if(locked)d.addEventListener("cancel",e=>e.preventDefault());
  d.addEventListener("close",()=>{d.remove();if(serviceDialog===d)serviceDialog=null;},{once:true});
  document.body.append(d);try{d.showModal();}catch(_){d.remove();return null;}serviceDialog=d;return d;
 }
 window.VATRA_SERVICE_NOTICE=Object.freeze({show:showServiceNotice,classify:classifyServiceError,report(result,options={}){const kind=classifyServiceError(result,options);return kind?Boolean(showServiceNotice(kind,options)):false;}});

 document.addEventListener("DOMContentLoaded",()=>{
  const english=document.documentElement.lang==="en";
  const label=english?"No internet connection. Check your connection.":"Немає підключення до інтернету. Перевірте мережу.";
  const banner=document.createElement("div");
  banner.className="network-status vt-network-status";
  banner.setAttribute("role","status");
  banner.setAttribute("aria-live","polite");
  banner.hidden=true;
  banner.textContent=label;
  document.body.append(banner);
  const update=()=>{
   banner.hidden=navigator.onLine;
   document.body.classList.toggle("is-offline",!navigator.onLine);
  };
  window.addEventListener("offline",update);
  window.addEventListener("online",update);
  update();
  if("serviceWorker" in navigator&&window.isSecureContext&&location.protocol!=="file:"){
   const worker=navigator.serviceWorker;
   // Refresh a previously controlled page when updated code takes over.
   // Never discard input edits or an open dialog during this transition.
   if(worker.controller){
    let edited=false;
    const recordEdit=event=>{
     if(event.target?.closest?.("input,textarea,[contenteditable]"))edited=true;
    };
    document.addEventListener("input",recordEdit,true);
    document.addEventListener("change",recordEdit,true);
    worker.addEventListener("controllerchange",()=>{
     if(!navigator.onLine||edited||document.querySelector("dialog[open]"))return;
     location.reload();
    },{once:true});
   }
   worker.register(new URL("sw.js",projectBase).href,{
    scope:projectBase.pathname,updateViaCache:"none"
   }).catch(()=>{});
  }
 });
})();