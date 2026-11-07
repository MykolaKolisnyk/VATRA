/* VATRA: Cloudflare Turnstile for Supabase email authentication.
 * Configure ONLY the PUBLIC site key below, once.
 * The Cloudflare SECRET key belongs exclusively in Supabase Auth > Attack Protection.
 * Leave SITE_KEY empty until Cloudflare and the Supabase secret are ready.
 */
(() => {
"use strict";
const SITE_KEY = "0x4AAAAAAF3zmwtnC60B4gUQ";
const enabled = SITE_KEY.trim().length > 0;
const widgets = new WeakMap();
let loader = null;

function loadProvider() {
 if(window.turnstile?.render)return Promise.resolve();
 if(loader)return loader;
 loader = new Promise((resolve,reject) => {
  const script = document.createElement("script");
  script.className = "ui-captcha-provider-script";
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.onload = () => window.turnstile?.render ? resolve() : reject(new Error("captcha_unavailable"));
  script.onerror = () => reject(new Error("captcha_unavailable"));
  document.head.append(script);
 });
 return loader;
}
async function mount(scope) {
 if(!enabled || !scope || !scope.isConnected || scope.hidden)return;
 const previous = widgets.get(scope);
 if(previous)return previous;
 const host = document.createElement("div");
 host.className = "vatra-captcha ui-captcha-widget-" + scope.id;
 host.setAttribute("role","group");
 host.setAttribute("aria-label",document.documentElement.lang==="en"?"Bot verification":"Перевірка на бота");
 if(scope.id==="recovery-step"){
  const tools=scope.querySelector("#recovery-tools");
  if(!tools || tools.hidden)return;
  tools.prepend(host);
 }else{
  const submit=scope.querySelector('button[type="submit"]');
  if(!submit)return;
  submit.before(host);
 }
 const record={id:null,host,token:""};
 const ready=(async()=>{
  try {
   await loadProvider();
   if(!host.isConnected)return null;
   record.id=window.turnstile.render(host,{
    sitekey:SITE_KEY,
    theme:"light",
    size:"flexible",
    language:document.documentElement.lang==="en"?"en":"uk",
    "response-field":false,
    callback:token=>{record.token=token;},
    "expired-callback":()=>{record.token="";},
    "error-callback":()=>{record.token="";}
   });
   return record;
  }catch(e){
   host.remove();
   widgets.delete(scope);
   throw e;
  }
 })();
 widgets.set(scope,ready);
 return ready;
}
async function token(scope) {
 if(!enabled)return null;
 const record=await mount(scope);
 if(!record || record.id===null)throw new Error("captcha_unavailable");
 return window.turnstile.getResponse(record.id)||record.token||"";
}
async function reset(scope) {
 if(!enabled || !scope)return;
 try{
  const record=await widgets.get(scope);
  if(record?.id!=null && window.turnstile?.reset){
   record.token="";
   window.turnstile.reset(record.id);
  }
 }catch(_){}
}
window.VATRA_CAPTCHA=Object.freeze({enabled,mount,token,reset});
})();
