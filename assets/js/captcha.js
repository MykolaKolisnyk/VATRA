/* VATRA — one on-demand Cloudflare Turnstile integration for Supabase Auth.
 * The site key is public. The SECRET key belongs only in Supabase Dashboard.
 * No challenge runs on page load: verification starts after form submission.
 */
(() => {
"use strict";
const SITE_KEY = "0x4AAAAAAF3zmwtnC60B4gUQ";
const enabled = SITE_KEY.trim().length > 0;
const widgets = new WeakMap();
let loader = null;

function failure(code) {
 const error = new Error(code);
 error.code = code;
 return error;
}
function loadProvider() {
 if(window.turnstile?.render && window.turnstile?.execute)return Promise.resolve();
 if(loader)return loader;
 loader = new Promise((resolve,reject) => {
  const script = document.createElement("script");
  script.className = "ui-captcha-provider-script";
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.onload = () => window.turnstile?.render && window.turnstile?.execute
   ? resolve() : reject(failure("captcha_unavailable"));
  script.onerror = () => reject(failure("captcha_unavailable"));
  document.head.append(script);
 }).catch(error => {
  loader = null; // A temporary network error must allow another attempt.
  throw error;
 });
 return loader;
}
async function mount(scope) {
 if(!enabled || !scope?.isConnected || scope.hidden)throw failure("captcha_unavailable");
 const existing = widgets.get(scope);
 if(existing)return existing;
 const host = document.createElement("div");
 host.className = "vatra-captcha ui-captcha-widget-" + scope.id;
 host.setAttribute("role","group");
 host.setAttribute("aria-label",document.documentElement.lang==="en"?"Bot verification":"Перевірка на бота");
 if(scope.id==="recovery-step"){
  const tools=scope.querySelector("#recovery-tools");
  if(!tools || tools.hidden)throw failure("captcha_unavailable");
  tools.prepend(host);
 }else{
  const submit=scope.querySelector('button[type="submit"]');
  if(!submit)throw failure("captcha_unavailable");
  submit.before(host);
 }
 const ready=(async()=>{
  await loadProvider();
  if(!host.isConnected || !scope.isConnected)throw failure("captcha_unavailable");
  const state={id:null,host,pending:null};
  const complete=(kind,value)=>{
   const waiting=state.pending;
   if(!waiting)return;
   state.pending=null;
   clearTimeout(waiting.timer);
   if(kind==="success")waiting.resolve(value);
   else waiting.reject(failure(value));
  };
  state.id=window.turnstile.render(host,{
   sitekey:SITE_KEY,
   theme:"light",
   size:"flexible",
   language:document.documentElement.lang==="en"?"en":"uk",
   execution:"execute",
   appearance:"interaction-only",
   "response-field":false,
   callback:token=>complete("success",token),
   "error-callback":()=>{complete("error","captcha_unavailable");return true;},
   "expired-callback":()=>complete("error","captcha_expired"),
   "timeout-callback":()=>complete("error","captcha_expired")
  });
  if(state.id===undefined || state.id===null)throw failure("captcha_unavailable");
  return state;
 })().catch(error=>{
  host.remove();
  widgets.delete(scope);
  throw error;
 });
 widgets.set(scope,ready);
 return ready;
}
async function token(scope) {
 if(!enabled)return null;
 const state=await mount(scope);
 if(state.pending)return state.pending.promise;
 let resolveToken,rejectToken;
 const promise=new Promise((resolve,reject)=>{resolveToken=resolve;rejectToken=reject;});
 const timer=setTimeout(()=>{
  const waiting=state.pending;
  if(waiting?.promise===promise){
   state.pending=null;
   waiting.reject(failure("captcha_timeout"));
  }
 },120000);
 state.pending={promise,resolve:resolveToken,reject:rejectToken,timer};
 try{window.turnstile.execute(state.id);}
 catch(_){
  clearTimeout(timer);
  state.pending=null;
  rejectToken(failure("captcha_unavailable"));
 }
 return promise;
}
async function reset(scope) {
 if(!enabled || !scope)return;
 const existing=widgets.get(scope);
 if(!existing)return;
 widgets.delete(scope);
 try{
  const state=await existing;
  if(state.pending){
   clearTimeout(state.pending.timer);
   state.pending.reject(failure("captcha_cancelled"));
   state.pending=null;
  }
  if(state.id!==null)window.turnstile?.remove?.(state.id);
  state.host.remove(); // The form returns to its clean layout after the attempt.
 }catch(_){}
}
window.VATRA_CAPTCHA=Object.freeze({enabled,mount,token,reset});
})();