(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const shorteners=["bit.ly","tinyurl.com","t.co","is.gd","cutt.ly","rb.gy","shorturl.at","ow.ly","buff.ly","rebrand.ly","lnkd.in","goo.gl","dub.sh","tiny.cc","short.io","s.id","t.ly","v.gd","bitly.com","bl.ink"];
const brands=[
 ["google",["google.com","google.com.ua","google.co.uk","google.de","google.fr","google.it","google.pl","google.com.ge","google.bg","googleusercontent.com","gstatic.com"]],
 ["facebook",["facebook.com","fb.com","fb.me","facebook.net"]],
 ["microsoft",["microsoft.com","microsoftonline.com","live.com","office.com","office365.com"]],
 ["instagram",["instagram.com"]],["paypal",["paypal.com","paypal.me"]],
 ["telegram",["telegram.org","telegram.me","t.me"]],["vatra",[]]
];
const belongs=(host,domain)=>host===domain||host.endsWith("."+domain);
const hidden=/[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]|%(?:00|09|0a|0d|1b|7f|e2%80%(?:8[b-f]|a[8-e])|e2%81%[a-f][0-9a-f]|ef%bb%bf)/i;
const privateKey=/token|signature|credential|password|secret|authorization|assertion|^sig$|^code$|^state$|^key$|^auth$|^expires?$|^x-amz-|^x-goog-|^saml|^oauth|^session|^policy$|^key-pair-id$|^hmac$|^hash$|^jwt$|^ticket$|^nonce$|^access_key$|^api[_-]?key$|^s[pevrt]$|^se$|^skt$|^ske$|^sks$|^skv$/i;
const redirectKey=/^(?:redirect(?:_?uri|_?url|_?to)?|return(?:_?to|_?url)?|next|continue|destination|dest|target|url|u|forward|goto|link)$/i;
function oneEdit(a,b){
 if(a===b||Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){
  const d=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])d.push(i);
  return d.length===1||d.length===2&&d[1]===d[0]+1&&a[d[0]]===b[d[1]]&&a[d[1]]===b[d[0]];
 }
 if(a.length>b.length)[a,b]=[b,a];
 let i=0;while(i<a.length&&a[i]===b[i])i++;
 return a.slice(i)===b.slice(i+1);
}
function impersonates(host,baseHost){
 const tokens=host.split(".").slice(0,-1).flatMap(label=>label.split(/[-_]/)).filter(Boolean);
 for(const [brand,domains] of brands){
  if(domains.some(domain=>belongs(host,domain))||brand==="vatra"&&host===baseHost)continue;
  if(tokens.some(token=>token===brand||oneEdit(token,brand)))return true;
 }
 return false;
}
function inspect(raw,base,displayed){
 let url,origin;try{url=new URL(raw,base);origin=new URL(base);}catch(_){return null;}
 if(!["http:","https:"].includes(url.protocol)||url.origin===origin.origin)return null;
 const hostname=url.hostname.toLowerCase(),host=hostname.replace(/\.$/,""),reasons=[];
 const credentials=!!url.username||!!url.password;
 const query=[...url.searchParams];
 let crossRedirect=false,redirectParameter=false;
 for(const [key,value] of query){
  if(!redirectKey.test(key))continue;
  redirectParameter=true;
  let target;try{target=new URL(value,url);}catch(_){continue;}
  if(["http:","https:"].includes(target.protocol)&&target.origin!==url.origin){crossRedirect=true;break;}
 }
 const sensitive=credentials||redirectParameter||query.some(([key])=>privateKey.test(key))||/\/(?:auth|oauth|oauth2|sso|login|signin|callback|reset|verify|download)(?:\/|$)/i.test(url.pathname);
 if(url.protocol!=="https:")reasons.push("http");
 if(shorteners.some(domain=>belongs(host,domain)))reasons.push("short");
 if(url.port||/^\d+(?:\.\d+){3}$/.test(host)||host.startsWith("[")||!host.includes(".")||/\.(?:localhost|local|internal|lan|home|test)$/.test(host))reasons.push("host");
 if(host.split(".").some(label=>label.startsWith("xn--"))||hidden.test(String(raw))||hidden.test(String(displayed||"")))reasons.push("idn");
 if(credentials)reasons.push("credentials");
 if(impersonates(host,origin.hostname.toLowerCase()))reasons.push("brand");
 if(crossRedirect)reasons.push("redirect");
 let path=url.pathname;try{path=decodeURIComponent(path);}catch(_){}
 if(/\.(?:exe|msi|msp|scr|bat|cmd|com|ps1|vbs|js|jse|hta|apk|dmg|pkg|jar)(?:$|\/)/i.test(path))reasons.push("executable");
 let href=url.href;
 if(!reasons.length&&!sensitive&&!query.some(([key])=>key.toLowerCase()==="utm_source")){
  const hash=href.indexOf("#"),head=hash<0?href:href.slice(0,hash),tail=hash<0?"":href.slice(hash);
  href=head+(head.includes("?")?(head.endsWith("?")||head.endsWith("&")?"":"&"):"?")+"utm_source=vatra"+tail;
 }
 return {href,hostname,host:url.host,suspicious:reasons.length>0,reasons};
}
const tr=(uk,en)=>{const locale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";return locale==="uk"?uk:locale==="en"?en:window.VATRA_LANGUAGE?.translate?.(uk)||uk;};
const reasonText={"http":["Незахищене HTTP-з’єднання.","Unencrypted HTTP connection."],"short":["Скорочена адреса приховує кінцевий сайт.","A shortened URL hides the final website."],"host":["Незвична адреса сервера або порт.","Unusual server address or port."],"idn":["Міжнародний домен або приховані символи в адресі.","Internationalized domain or hidden characters in the address."],"credentials":["Адреса містить облікові дані.","The address contains credentials."],"brand":["Домен може імітувати відомий сервіс.","The domain may imitate a familiar service."],"redirect":["Адреса може перенаправити на інший сайт.","The address may redirect to another website."],"executable":["Посилання може завантажити виконуваний файл.","The link may download an executable file."]};
let active=null;
function warn(result,newTab,anchor){
 active?.close();
 const dialog=document.createElement("dialog");active=dialog;dialog.className="ui-vatra-external-link-dialog-001";
 const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 const heading=make("h2","vatra-external-link-heading-001",tr("Підозріле посилання","Suspicious link"));heading.id="vatra-external-link-heading";
 dialog.setAttribute("aria-labelledby",heading.id);
 const note=make("p","vatra-external-link-note-001",tr("Ви залишаєте VATRA. Адреса має підозрілі ознаки. Перевірте домен перед переходом.","You are leaving VATRA. This address has suspicious characteristics. Check the domain before continuing."));
 const host=make("p","vatra-external-link-domain-001",result.host);host.dir="ltr";
 const reasons=make("ul","vatra-external-link-reasons-001");
 for(const code of result.reasons){const message=reasonText[code];if(message)reasons.append(make("li","vatra-external-link-reason-001",tr(...message)));}
 const actions=make("div","ui-vatra-external-link-actions-001");
 const back=make("button","vatra-external-link-back-001",tr("Назад","Go back"));back.type="button";back.autofocus=true;
 const next=make("button","vatra-external-link-continue-001",tr("Перейти","Continue"));next.type="button";
 back.addEventListener("click",()=>dialog.close());
 next.addEventListener("click",()=>{dialog.close();if(newTab)window.open(result.href,"_blank","noopener,noreferrer");else location.assign(result.href);});
 dialog.addEventListener("close",()=>{dialog.remove();if(active===dialog)active=null;anchor.focus?.({preventScroll:true});},{once:true});
 dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
 actions.append(back,next);dialog.append(heading,note,host,reasons,actions);document.body.append(dialog);dialog.showModal();
}
function handle(event){
 if(event.defaultPrevented||event.button===2||event.type==="auxclick"&&event.button!==1)return;
 const anchor=event.target?.closest?.("a[href]");
 if(!anchor)return;
 const displayed=anchor.classList?.contains("vatra-external-post-link-001")?anchor.textContent:null;
 const result=inspect(anchor.getAttribute("href"),location.href,displayed);if(!result)return;
 if(anchor.hasAttribute("download")&&!result.suspicious)return;
 if(result.suspicious){event.preventDefault();event.stopImmediatePropagation();warn(result,anchor.target==="_blank"||event.ctrlKey||event.metaKey||event.shiftKey||event.button===1,anchor);return;}
 anchor.href=result.href;
 if(anchor.target==="_blank"){anchor.relList.add("noopener");anchor.relList.add("noreferrer");}
}
document.addEventListener("click",handle,true);
document.addEventListener("auxclick",handle,true);
window.VATRA_EXTERNAL_LINKS=Object.freeze({inspect});
})();
