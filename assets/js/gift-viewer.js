
(()=>{
"use strict";
const root=new URL("../../",document.currentScript?.src||"assets/js/gift-viewer.js");
const catalog=[
 {code:"first_flame",image:"gift_first-flame.webp",
  uk:"Перший вогник",en:"First flame",
  descriptionUk:"Перший вогник VATRA — знак початку вашої історії. Його отримує кожен, хто приєднався до VATRA.",
  descriptionEn:"Your first VATRA flame marks the beginning of your story. Every new member receives one.",
  eventUk:"Привітальний подарунок",eventEn:"Welcome gift"},
 {code:"beta_member",image:"gift_beta-member.webp",exclusive:true,
  uk:"БЕТА-учасник",en:"Beta participant",
  descriptionUk:"Пам’ятний подарунок кожному, хто зареєструвався під час БЕТА-тестування VATRA. Залишається у профілі назавжди.",
  descriptionEn:"A commemorative gift for everyone who registered during VATRA beta testing. It remains in your profile forever.",
  eventUk:"За участь у БЕТА-тестуванні",eventEn:"For participating in the beta"}
];
const language=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
const lang=(uk,english)=>{
 const locale=language();
 if(locale==="uk")return uk;
 if(locale==="en")return english;
 const translated=window.VATRA_LANGUAGE?.translate?.(uk);
 return typeof translated==="string"&&translated!==uk?translated:uk;
};
const byCode=code=>catalog.find(g=>g.code===code)||null;
const fileUrl=gift=>gift?new URL("assets/gifts/"+gift.image,root).href:null;
const make=(tag,cls,text)=>{
 const el=document.createElement(tag);el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
};
let dialog=null,heading=null,picture=null,effects=null,stage=null,description=null,eventText=null,close=null,lastFocus=null;
const particleAmount=20;
function populateEmbers(){
 effects.replaceChildren();
 const fragment=document.createDocumentFragment();
 for(let i=0;i<particleAmount;i++){
  const particle=make("span","vatra-gift-particle ui-vatra-gift-particle-001");
  particle.dataset.shape=i%2?"spark":"ember";
  const x=(i*47+11+(i*i*7)%21)%94+3;
  const y=(i*37+7+(i*i*13)%31)%88+6;
  particle.style.setProperty("--gift-x",x+"%");
  particle.style.setProperty("--gift-y",y+"%");
  particle.style.setProperty("--gift-drift",((i%2?-1:1)*(18+i%5*12))+"px");
  particle.style.setProperty("--gift-size",(8+(i*7)%14)+"px");
  particle.style.setProperty("--gift-duration",(6+(i%7)*0.85)+"s");
  particle.style.setProperty("--gift-delay",(-i*0.73)+"s");
  fragment.append(particle);
 }
 effects.append(fragment);
}
function setup(){
 if(dialog)return;
 dialog=make("dialog","vatra-gift-viewer ui-vatra-gift-viewer-001");
 dialog.setAttribute("aria-labelledby","vatra-gift-viewer-heading");
 const top=make("header","vatra-gift-viewer-head ui-vatra-gift-viewer-head-001");
 heading=make("h2","vatra-gift-viewer-heading-001");
 heading.id="vatra-gift-viewer-heading";
 close=make("button","vatra-gift-viewer-close-001");
 const closeIcon=document.createElementNS("http://www.w3.org/2000/svg","svg");
 closeIcon.setAttribute("class","ui-vatra-gift-viewer-close-icon-001");
 closeIcon.setAttribute("viewBox","0 0 24 24");
 closeIcon.setAttribute("width","19");closeIcon.setAttribute("height","19");
 closeIcon.setAttribute("fill","none");closeIcon.setAttribute("stroke","currentColor");
 closeIcon.setAttribute("stroke-width","1.8");closeIcon.setAttribute("stroke-linecap","round");
 closeIcon.setAttribute("aria-hidden","true");
 const cross=document.createElementNS("http://www.w3.org/2000/svg","path");
 cross.setAttribute("class","ui-vatra-gift-viewer-close-path-001");
 cross.setAttribute("d","M6 6l12 12M18 6 6 18");closeIcon.append(cross);
 close.append(closeIcon);
 close.type="button";close.setAttribute("aria-label",lang("Закрити подарунок","Close gift"));
 close.addEventListener("click",()=>dialog.close());top.append(heading,close);
 stage=make("div","vatra-gift-viewer-stage ui-vatra-gift-viewer-stage-001");
 stage.addEventListener("dragstart",event=>event.preventDefault());
 stage.addEventListener("contextmenu",event=>event.preventDefault());
 effects=make("div","vatra-gift-effects ui-vatra-gift-effects-001");
 effects.setAttribute("aria-hidden","true");
 picture=make("span","vatra-gift-viewer-picture ui-vatra-gift-viewer-picture-001");
 picture.setAttribute("aria-hidden","true");
 picture.addEventListener("dragstart",event=>event.preventDefault());
 picture.addEventListener("contextmenu",event=>event.preventDefault());
 stage.append(effects,picture);
 eventText=make("p","vatra-gift-viewer-event-001");
 description=make("p","vatra-gift-viewer-description-001");
 const footer=make("footer","vatra-gift-viewer-footer ui-vatra-gift-viewer-footer-001");
 footer.append(eventText,description);
 dialog.append(top,stage,footer);
 dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener("close",()=>{
  if(dialog.open)return;
  effects.replaceChildren();
  if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
  lastFocus=null;
 });
 document.body.append(dialog);
}
function open(code){
 const gift=byCode(code);
 if(!gift)return false;
 setup();
 lastFocus=document.activeElement;
 heading.textContent=lang(gift.uk,gift.en);
 picture.style.backgroundImage="url("+JSON.stringify(fileUrl(gift))+")";
 populateEmbers();
 eventText.textContent=lang(gift.eventUk,gift.eventEn);
 description.textContent=lang(gift.descriptionUk,gift.descriptionEn);
 close.setAttribute("aria-label",lang("Закрити подарунок","Close gift"));
 if(!dialog.open)dialog.showModal();
 close.focus({preventScroll:true});
 return true;
}
window.VATRA_GIFTS_CATALOG={all:catalog,byCode,fileUrl};
window.VATRA_GIFT_VIEWER={open};
})();
