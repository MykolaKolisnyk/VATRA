/* VATRA — one modal Cloudflare Turnstile integration for Supabase Auth.
 * Public site key only. The secret must remain exclusively in Supabase Dashboard.
 * A valid token is required before starting login, registration or email recovery.
 */
(() => {
"use strict";
const SITE_KEY = "0x4AAAAAAF3zmwtnC60B4gUQ";
const enabled = SITE_KEY.trim().length > 0;
const widgets = new WeakMap();
let loader = null;
function failure(code) {
 const error=new Error(code);
 error.code=code;
 return error;
}
function loadProvider() {
 if(window.turnstile?.render && window.turnstile?.execute)return Promise.resolve();
 if(loader)return loader;
 loader=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.className="ui-captcha-provider-script";
  script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async=true;
  script.onload=()=>window.turnstile?.render&&window.turnstile?.execute
   ? resolve() : reject(failure("captcha_unavailable"));
  script.onerror=()=>reject(failure("captcha_unavailable"));
  document.head.append(script);
 }).catch(error=>{loader=null;throw error;});
 return loader;
}
function buildDialog(scope,close) {
 const english=document.documentElement.lang==="en";
 const overlay=document.createElement("div");
 overlay.className="captcha-backdrop ui-captcha-backdrop-"+scope.id;
 const dialog=document.createElement("section");
 dialog.className="captcha-dialog ui-captcha-dialog-"+scope.id;
 dialog.setAttribute("role","dialog");
 dialog.setAttribute("aria-modal","true");
 dialog.setAttribute("aria-labelledby","captcha-title-"+scope.id);
 dialog.setAttribute("aria-describedby","captcha-description-"+scope.id);
 dialog.tabIndex=-1;
 const symbol=document.createElement("div");
 symbol.className="captcha-symbol ui-captcha-symbol-"+scope.id;
 symbol.setAttribute("aria-hidden","true");
 symbol.textContent="🛡";
 const title=document.createElement("h2");
 title.className="captcha-title vt-captcha-title-"+scope.id;
 title.id="captcha-title-"+scope.id;
 title.textContent=english?"VATRA security check":"Перевірка безпеки VATRA";
 const description=document.createElement("p");
 description.className="captcha-description vt-captcha-description-"+scope.id;
 description.id="captcha-description-"+scope.id;
 description.textContent=english
  ?"Confirm you are not a bot. When verification is complete, we will continue automatically."
  :"Підтвердьте, що Ви не бот. Після перевірки дія продовжиться автоматично.";
 const widget=document.createElement("div");
 widget.className="vatra-captcha ui-captcha-widget-"+scope.id;
 widget.setAttribute("role","group");
 widget.setAttribute("aria-label",english?"Cloudflare verification":"Перевірка Cloudflare");
 const note=document.createElement("p");
 note.className="captcha-note vt-captcha-note-"+scope.id;
 note.setAttribute("role","status");
 note.textContent=english?"Verifying…":"Триває перевірка…";
 const cancel=document.createElement("button");
 cancel.type="button";
 cancel.className="captcha-cancel vt-captcha-button-"+scope.id;
 cancel.textContent=english?"Cancel":"Скасувати";
 cancel.setAttribute("aria-label",english?"Cancel security verification":"Скасувати перевірку безпеки");
 dialog.append(symbol,title,description,widget,note,cancel);
 overlay.append(dialog);
 const previousFocus=document.activeElement;
 const keydown=event=>{
  if(event.key==="Escape"){event.preventDefault();close();return;}
  if(event.key!=="Tab")return;
  const focusable=[...dialog.querySelectorAll("iframe:not([tabindex='-1']),button:not(:disabled),input:not(:disabled)")].filter(x=>x.offsetParent!==null);
  if(focusable.length===0){event.preventDefault();dialog.focus();return;}
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 };
 cancel.addEventListener("click",close);
 overlay.addEventListener("click",event=>{if(event.target===overlay)close();});
 document.addEventListener("keydown",keydown);
 document.body.append(overlay);
 document.body.classList.add("captcha-dialog-open");
 cancel.focus({preventScroll:true});
 const hide=()=>{
  if(!overlay.isConnected)return;
  document.removeEventListener("keydown",keydown);
  overlay.remove();
  document.body.classList.remove("captcha-dialog-open");
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 };
 return {overlay,widget,hide};
}
function mount(scope) {
 if(!enabled||!scope?.isConnected||scope.hidden)throw failure("captcha_unavailable");
 const previous=widgets.get(scope);
 if(previous)return previous;
 const state={id:null,pending:null,closed:false,dialog:null,ready:null};
 const cancel=()=>abort(scope,state,"captcha_cancelled");
 state.dialog=buildDialog(scope,cancel);
 widgets.set(scope,state);
 state.ready=(async()=>{
  await loadProvider();
  if(state.closed)throw failure("captcha_cancelled");
  state.id=window.turnstile.render(state.dialog.widget,{
   sitekey:SITE_KEY,
   theme:"light",
   size:"flexible",
   language:document.documentElement.lang==="en"?"en":"uk",
   execution:"execute",
   appearance:"always",
   "response-field":false,
   callback:token=>{
    const waiting=state.pending;
    if(state.closed||!waiting)return;
    state.pending=null;
    clearTimeout(waiting.timer);
    state.dialog.hide();
    waiting.resolve(token);
   },
   "error-callback":()=>{abort(scope,state,"captcha_unavailable");return true;},
   "expired-callback":()=>abort(scope,state,"captcha_expired"),
   "timeout-callback":()=>abort(scope,state,"captcha_timeout")
  });
  if(state.id===undefined||state.id===null)throw failure("captcha_unavailable");
  return state;
 })();
 return state;
}
function abort(scope,state,code){
 if(state.closed)return;
 state.closed=true;
 widgets.delete(scope);
 if(state.pending){
  const waiting=state.pending;
  state.pending=null;
  clearTimeout(waiting.timer);
  waiting.reject(failure(code));
 }
 state.dialog?.hide();
 if(state.id!==null)window.turnstile?.remove?.(state.id);
}
async function token(scope) {
 if(!enabled)return null;
 const state=mount(scope);
 if(state.pending)return state.pending.promise;
 let resolveToken,rejectToken;
 const promise=new Promise((resolve,reject)=>{resolveToken=resolve;rejectToken=reject;});
 const timer=setTimeout(()=>abort(scope,state,"captcha_timeout"),120000);
 state.pending={promise,resolve:resolveToken,reject:rejectToken,timer};
 // The dialog is already visible before loading the Cloudflare script.
 (async()=>{
  try{
   await state.ready;
   if(state.closed)return;
   window.turnstile.execute(state.id);
  }catch(error){
   abort(scope,state,error?.code||"captcha_unavailable");
  }
 })();
 return promise;
}
async function reset(scope) {
 if(!enabled||!scope)return;
 const state=widgets.get(scope);
 if(!state)return;
 abort(scope,state,"captcha_cancelled");
}
window.VATRA_CAPTCHA=Object.freeze({enabled,mount,token,reset});
})();