(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const selector=[
"#response","#saved-account-response","#signup-confirmation-feedback",
"#profile-media-status","#profile-action-status","#profile-photo-status",
"#profile-status-error","#profile-edit-message","#profile-report-error",
"#profile-avatar-finish-error","#profile-cover-edit-error","#profile-compose-status",
"#profile-photo-tag-status",".vatra-profile-editor-feedback-001",
"#feed-status","#feed-compose-error","#club-status","#club-compose-error",
"#community-create-status","#community-list-status","#profile-message-status",
"#messenger-send-status","#messenger-key-error","#messenger-new-error","#messenger-delete-error",
".vatra-section-dialog-status-001",
".vatra-post-interactions-status-001",".vatra-profile-photo-comment-status-001"
].join(",");
const seen=new WeakMap(),active=new Set();let stack;
const loading=text=>/^(?:Завантажуємо|Завантаження|Надсилаємо|Створюємо|Зберігаємо|Loading|Uploading|Sending|Saving|Creating|Processing|Шукаємо)[\s.…]/i.test(text);
function severity(text,kind,source){
 const flag=source?.dataset?.status||source?.dataset?.kind||source?.dataset?.state;
 if(["error","invalid"].includes(flag)||source?.getAttribute("role")==="alert")return "error";
 if(["success","ok"].includes(flag))return "success";
 if(["error","success","warning"].includes(kind))return kind;
 if(/^(?:Не вдалося|Помилка|Виникла помилка|Оберіть|Виберіть|Перевірте|Заповніть|Некоректн|Неправильн|Could not|Failed|Error|Invalid|Please select|Choose )/i.test(text))return "error";
 return /(?:збережено|оновлено|опубліковано|надіслано|скопійовано|успішно|готово|saved|updated|published|sent|copied|successfully)/i.test(text)?"success":"info";
}
function show(value,kind="info",source){
 const text=String(value??"").replace(/\s+/g," ").trim().slice(0,420);
 if(!text||loading(text))return null;
 kind=severity(text,kind,source);
 const same=[...active].find(x=>x.text===text&&x.kind===kind&&x.node.isConnected);
 if(same){same.restart();return same.node;}
 if(!stack){stack=document.createElement("div");stack.className="vatra-toast-stack-001";stack.setAttribute("aria-label","Повідомлення VATRA");}
 const openDialogs=[...document.querySelectorAll("dialog[open]")];
 const host=openDialogs.at(-1)||document.body;
 if(stack.parentNode!==host)host.append(stack);
 const node=document.createElement("section");node.className="vatra-toast-item-001 vatra-toast-item--"+kind;node.setAttribute("role",kind==="error"?"alert":"status");
 const mark=document.createElement("span");mark.className="vatra-toast-icon-001";mark.setAttribute("aria-hidden","true");mark.textContent=kind==="error"?"!":kind==="success"?"✓":"i";
 const message=document.createElement("p");message.className="vatra-toast-text-001";message.textContent=text;
 const close=document.createElement("button");close.type="button";close.className="vatra-toast-close-001";close.textContent="×";close.setAttribute("aria-label",document.documentElement.lang==="en"?"Dismiss notification":"Закрити повідомлення");
 node.append(mark,message,close);stack.prepend(node);
 let timer=0,removed=false;const duration=kind==="error"?6500:kind==="warning"?5500:3800;
 const dismiss=()=>{if(removed)return;removed=true;clearTimeout(timer);node.classList.remove("is-visible");node.classList.add("is-leaving");active.delete(entry);const clean=()=>node.remove();node.addEventListener("transitionend",clean,{once:true});setTimeout(clean,400);};
 const restart=()=>{clearTimeout(timer);timer=setTimeout(dismiss,duration);};
 const entry={text,kind,node,restart};active.add(entry);
 close.addEventListener("click",dismiss);
 node.addEventListener("pointerenter",()=>clearTimeout(timer));node.addEventListener("pointerleave",restart);
 node.addEventListener("focusin",()=>clearTimeout(timer));node.addEventListener("focusout",event=>{if(!node.contains(event.relatedTarget))restart();});
 requestAnimationFrame(()=>node.classList.add("is-visible"));restart();
 while(active.size>3){const oldest=active.values().next().value;if(oldest===entry)break;oldest.node.querySelector(".vatra-toast-close-001")?.click();}
 return node;
}
function inspect(el){
 if(!(el instanceof Element)||!el.matches(selector)||!el.isConnected)return;
 const text=(el.textContent||"").replace(/\s+/g," ").trim();
 if(el.hidden||!text){seen.delete(el);return;}
 if(loading(text)||seen.get(el)===text)return;
 seen.set(el,text);show(text,"info",el);
}
function visit(node){if(!(node instanceof Element))return;if(node.matches(selector))inspect(node);node.querySelectorAll(selector).forEach(inspect);}
function init(){
 if(!document.body)return;document.documentElement.classList.add("vatra-toast-enabled");visit(document.body);
 const watcher=new MutationObserver(records=>{
  const touched=new Set();
  for(const record of records){
   const origin=record.target.nodeType===1?record.target:record.target.parentElement;
   const el=origin?.closest?.(selector);if(el)touched.add(el);
   if(record.type==="childList")for(const child of record.addedNodes)if(child.nodeType===1)visit(child);
  }
  touched.forEach(inspect);
 });
 watcher.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["hidden","data-status","data-kind","data-state","role"]});
}
window.VATRA_TOAST={show,error:text=>show(text,"error"),success:text=>show(text,"success"),warning:text=>show(text,"warning")};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();