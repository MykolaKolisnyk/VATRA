(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript?.src||location.href);
const artwork=Object.freeze({
 error:"vatryk_toast-error.webp",
 success:"vatryk_toast-success.webp",
 warning:"vatryk_toast-warning.webp",
 info:"vatryk_toast-info.webp",
 action:"vatryk_toast-action.webp",
 message:"vatryk_toast-message.webp",
 friends:"vatryk_toast-friends.webp",
 gift:"vatryk_toast-gift.webp",
 new:"vatryk_toast-new.webp",
 security:"vatryk_403.webp",
 offline:"vatryk_offline.webp",
 waiting:"vatryk_waiting.webp",
 rate_limit:"vatryk_429.webp",
 server_error:"vatryk_500.webp",
 maintenance:"vatryk_503.webp"
});
const selector=[
 "#profile-media-status","#profile-action-status","#profile-photo-status",
 "#profile-status-error","#profile-edit-message","#profile-report-error",
 "#profile-avatar-finish-error","#profile-cover-edit-error","#profile-compose-status",
 "#profile-photo-tag-status","#feed-status","#feed-compose-error","#club-status","#club-compose-error",
 "#community-create-status","#community-list-status","#profile-message-status",
 "#messenger-send-status","#messenger-key-error","#messenger-new-error","#messenger-delete-error",
 ".vatra-section-dialog-status-001",".vatra-post-interactions-status-001",
 ".vatra-profile-photo-comment-status-001"
].join(",");
const seen=new WeakMap(),active=new Set();
let stack;
const isEn=()=>document.documentElement.lang==="en";
const loading=value=>/^(?:Завантажуємо|Завантаження|Надсилаємо|Створюємо|Зберігаємо|Loading|Uploading|Sending|Saving|Creating|Processing|Шукаємо)[\s.…]/i.test(value);
function severity(value,kind,source){
 const flag=source?.dataset?.status||source?.dataset?.kind||source?.dataset?.state;
 if(["error","invalid"].includes(flag)||source?.getAttribute?.("role")==="alert")return "error";
 if(["success","ok"].includes(flag))return "success";
 if(kind!=="info"&&Object.hasOwn(artwork,kind))return kind;
 if(/^(?:Не вдалося|Помилка|Виникла помилка|Оберіть|Виберіть|Перевірте|Заповніть|Некоректн|Неправильн|Could not|Failed|Error|Invalid|Please select|Choose )/i.test(value))return "error";
 return /(?:збережено|оновлено|опубліковано|надіслано|скопійовано|успішно|готово|saved|updated|published|sent|copied|successfully)/i.test(value)?"success":"info";
}
function safeAction(path){
 if(typeof path!=="string"||!path||path.startsWith("/")||path.includes("..")||/^[a-z][a-z\d+.-]*:/i.test(path))return null;
 try{const target=new URL(path,root);return target.origin===location.origin&&target.pathname.startsWith(root.pathname)?target.href:null;}catch(_){return null;}
}
function show(value,kind="info",options){
 const messageText=String(value??"").replace(/\s+/g," ").trim().slice(0,420);
 if(!messageText||!document.body)return null;
 const source=options instanceof Element?options:null,config=!source&&options&&typeof options==="object"?options:{};
 if(loading(messageText)&&kind!=="waiting")return null;
 kind=severity(messageText,kind,source);
 const title=String(config.title||"").replace(/\s+/g," ").trim().slice(0,110);
 const href=safeAction(config.href);
 const same=[...active].find(entry=>entry.text===messageText&&entry.kind===kind&&entry.title===title&&entry.node.isConnected);
 if(same){same.restart();return same.node;}
 if(!stack){stack=document.createElement("div");stack.className="vatra-toast-stack-001";stack.setAttribute("aria-label",isEn()?"VATRA notifications":"Повідомлення VATRA");}
 const host=[...document.querySelectorAll("dialog[open]")].at(-1)||document.body;
 if(stack.parentNode!==host)host.append(stack);
 const node=document.createElement("section");node.className="vatra-toast-item-001 vatra-toast-item--"+kind;node.setAttribute("role",kind==="error"?"alert":"status");
 const mascot=document.createElement("img");mascot.className="vatra-toast-mascot-001";mascot.alt="";mascot.setAttribute("aria-hidden","true");mascot.loading="eager";mascot.decoding="async";mascot.width=70;mascot.height=70;mascot.src=new URL("assets/vatryk/"+(artwork[kind]||artwork.info),root).href;
 mascot.addEventListener("error",()=>{mascot.style.visibility="hidden";},{once:true});
 const content=document.createElement("div");content.className="vatra-toast-content-001";
 if(title){const heading=document.createElement("strong");heading.className="vatra-toast-title-001";heading.textContent=title;content.append(heading);}
 const message=document.createElement("p");message.className="vatra-toast-text-001";message.textContent=messageText;content.append(message);
 if(href){const link=document.createElement("a");link.className="vatra-toast-action-001";link.href=href;link.textContent=String(config.actionLabel|| (isEn()?"Learn more":"Дізнатися більше")).slice(0,60);content.append(link);}
 const close=document.createElement("button");close.type="button";close.className="vatra-toast-close-001";close.textContent="×";close.setAttribute("aria-label",isEn()?"Dismiss notification":"Закрити повідомлення");
 node.append(mascot,content,close);stack.prepend(node);
 let timer=0,removed=false;
 const customDuration=Number(config.duration);
 const duration=Number.isFinite(customDuration)&&customDuration>=1000&&customDuration<=30000?customDuration:kind==="waiting"?0:kind==="new"?11000:kind==="error"?6500:kind==="warning"?5500:4300;
 const dismiss=()=>{
  if(removed)return;removed=true;clearTimeout(timer);
  node.classList.remove("is-visible");node.classList.add("is-leaving");active.delete(entry);
  const clean=()=>node.remove();node.addEventListener("transitionend",clean,{once:true});setTimeout(clean,400);
 };
 const restart=()=>{clearTimeout(timer);if(duration)timer=setTimeout(dismiss,duration);};
 const entry={text:messageText,title,kind,node,restart};active.add(entry);
 close.addEventListener("click",dismiss);
 node.addEventListener("pointerenter",()=>clearTimeout(timer));node.addEventListener("pointerleave",restart);
 node.addEventListener("focusin",()=>clearTimeout(timer));node.addEventListener("focusout",event=>{if(!node.contains(event.relatedTarget))restart();});
 requestAnimationFrame(()=>node.classList.add("is-visible"));restart();
 while(active.size>3){const oldest=active.values().next().value;if(oldest===entry)break;oldest.node.querySelector(".vatra-toast-close-001")?.click();}
 return node;
}
function inspect(el){
 if(!(el instanceof Element)||!el.matches(selector)||!el.isConnected)return;
 const value=(el.textContent||"").replace(/\s+/g," ").trim();
 if(el.hidden||!value){seen.delete(el);return;}
 if(loading(value)||seen.get(el)===value)return;
 seen.set(el,value);show(value,"info",el);
}
function visit(el){if(!(el instanceof Element))return;if(el.matches(selector))inspect(el);el.querySelectorAll(selector).forEach(inspect);}
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
function clear(){for(const entry of [...active])entry.node.querySelector(".vatra-toast-close-001")?.click();}
window.VATRA_TOAST={show,clear,error:text=>show(text,"error"),success:text=>show(text,"success"),warning:text=>show(text,"warning"),info:text=>show(text,"info"),action:(text,options)=>show(text,"action",options),message:(text,options)=>show(text,"message",options),friends:(text,options)=>show(text,"friends",options),gift:(text,options)=>show(text,"gift",options),new:(text,options)=>show(text,"new",options)};
for(const [text,kind] of window.VATRA_PENDING_TOASTS||[])show(text,kind);
delete window.VATRA_PENDING_TOASTS;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();