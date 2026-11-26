(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
function inspect(raw,base){
 let url;try{url=new URL(raw,base);}catch(_){return null;}
 if(!["http:","https:"].includes(url.protocol)||url.origin===new URL(base).origin)return null;
 const hostname=url.hostname.toLowerCase(),privateQuery=[...url.searchParams.keys()].some(key=>/token|signature|credential|password|secret|^sig$|^code$|^state$|^key$|^auth$|^expires?$|^x-amz-|^x-goog-|^saml|^oauth|^session/i.test(key));
 const sensitive=privateQuery||!!url.username||!!url.password||/\/(?:auth|oauth|oauth2|sso|login|signin|callback|reset|verify)(?:\/|$)/i.test(url.pathname);
 const suspicious=url.protocol!=="https:"||!!url.username||!!url.password||!!url.port||hostname.includes("xn--")||/^\d+(?:\.\d+){3}$/.test(hostname)||hostname.startsWith("[")||["bit.ly","tinyurl.com","t.co","is.gd","cutt.ly","rb.gy","shorturl.at"].includes(hostname);
 if(!sensitive&&!url.searchParams.has("utm_source"))url.searchParams.set("utm_source","vatra");
 return {href:url.href,hostname,suspicious};
}
const tr=(uk,en)=>{const locale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";return locale==="uk"?uk:locale==="en"?en:window.VATRA_LANGUAGE?.translate?.(uk)||uk;};
let active=null;
function warn(result,newTab,anchor){
 active?.close();
 const dialog=document.createElement("dialog");active=dialog;dialog.className="ui-vatra-external-link-dialog-001";
 const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 const heading=make("h2","vatra-external-link-heading-001",tr("Підозріле посилання","Suspicious link"));heading.id="vatra-external-link-heading";
 dialog.setAttribute("aria-labelledby",heading.id);
 const note=make("p","vatra-external-link-note-001",tr("Ви залишаєте VATRA. Адреса має підозрілі ознаки. Перевірте домен перед переходом.","You are leaving VATRA. This address has suspicious characteristics. Check the domain before continuing."));
 const host=make("p","vatra-external-link-domain-001",result.hostname);host.dir="ltr";
 const actions=make("div","ui-vatra-external-link-actions-001");
 const back=make("button","vatra-external-link-back-001",tr("Назад","Go back"));back.type="button";back.autofocus=true;
 const next=make("button","vatra-external-link-continue-001",tr("Перейти","Continue"));next.type="button";
 back.addEventListener("click",()=>dialog.close());
 next.addEventListener("click",()=>{dialog.close();if(newTab)window.open(result.href,"_blank","noopener,noreferrer");else location.assign(result.href);});
 dialog.addEventListener("close",()=>{dialog.remove();if(active===dialog)active=null;anchor.focus?.({preventScroll:true});},{once:true});
 dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
 actions.append(back,next);dialog.append(heading,note,host,actions);document.body.append(dialog);dialog.showModal();
}
function handle(event){
 if(event.defaultPrevented||event.button===2||event.type==="auxclick"&&event.button!==1)return;
 const anchor=event.target?.closest?.("a[href]");
 if(!anchor||anchor.hasAttribute("download"))return;
 const result=inspect(anchor.getAttribute("href"),location.href);if(!result)return;
 if(result.suspicious){event.preventDefault();event.stopImmediatePropagation();warn(result,anchor.target==="_blank"||event.ctrlKey||event.metaKey||event.shiftKey||event.button===1,anchor);return;}
 anchor.href=result.href;
 if(anchor.target==="_blank"){anchor.relList.add("noopener");anchor.relList.add("noreferrer");}
}
document.addEventListener("click",handle,true);
document.addEventListener("auxclick",handle,true);
window.VATRA_EXTERNAL_LINKS=Object.freeze({inspect});
})();
