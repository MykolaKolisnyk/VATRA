/* VATRA original gifts, available to every authenticated screen.
   The catalogue is descriptive; ownership is always loaded from Supabase.
   No paid item can be purchased until a verified billing system exists. */
(()=>{
"use strict";
const root=new URL("../../",document.currentScript?.src||"assets/js/gift-viewer.js");
const catalog=[
 {code:"first_flame",image:"first-flame.png",symbol:"",effect:"embers",kind:"welcome",
  uk:"Перший вогник",en:"First flame",
  descriptionUk:"Перший вогник VATRA — знак початку вашої історії. Його отримує кожен, хто приєднався до VATRA.",
  descriptionEn:"Your first VATRA flame marks the beginning of your story. Every new member receives one.",
  eventUk:"Привітальний подарунок",eventEn:"Welcome gift",released:true},
 {code:"holiday_star",image:null,symbol:"✦",effect:"stars",kind:"holiday",
  uk:"Святкова зірка",en:"Holiday star",
  descriptionUk:"Теплі побажання, що освітлюють особливі дні. Безкоштовний святковий подарунок від VATRA.",
  descriptionEn:"Warm wishes that brighten special days. A free holiday gift from VATRA.",
  eventUk:"Свята та особливі події",eventEn:"Holidays and special occasions",released:false},
 {code:"kind_heart",image:null,symbol:"♥",effect:"hearts",kind:"holiday",
  uk:"Серце доброти",en:"Kind heart",
  descriptionUk:"Нагадування про щирість, підтримку та близьких людей. Подарунок для майбутніх подій VATRA.",
  descriptionEn:"A reminder of kindness, care and the people who matter. Reserved for upcoming VATRA occasions.",
  eventUk:"Дні доброти",eventEn:"Days of kindness",released:false},
 {code:"bright_sun",image:null,symbol:"☀",effect:"sunbeams",kind:"holiday",
  uk:"Промінчик",en:"Sunbeam",
  descriptionUk:"Трішки сонця та гарного настрою для ваших людей. Майбутній безкоштовний подарунок від VATRA.",
  descriptionEn:"A little sunshine for your people. An upcoming free VATRA gift.",
  eventUk:"Літні свята",eventEn:"Summer events",released:false},
 {code:"ribbon",image:null,symbol:"⌁",effect:"ribbons",kind:"holiday",
  uk:"Стрічка щастя",en:"Ribbon of joy",
  descriptionUk:"Світла стрічка на честь чудових моментів, які хочеться запам’ятати. Для майбутніх подій VATRA.",
  descriptionEn:"A bright ribbon for moments worth remembering. Reserved for future VATRA celebrations.",
  eventUk:"Особливі дні",eventEn:"Special days",released:false}
];
const en=()=>document.documentElement.lang==="en";
const lang=(uk,english)=>en()?english:uk;
const byCode=code=>catalog.find(g=>g.code===code)||null;
const fileUrl=gift=>gift?.image?new URL("assets/gifts/"+gift.image,root).href:null;
const make=(tag,cls,text)=>{
 const el=document.createElement(tag);el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
};
let dialog=null,heading=null,picture=null,effects=null,stage=null,description=null,eventText=null,close=null,lastFocus=null;
const themeKinds={embers:["ember","spark"],stars:["star","twinkle"],hearts:["heart","twinkle"],sunbeams:["sunray","twinkle"],ribbons:["ribbon","twinkle"]};
const particleAmount=20;
function populateEffects(effect){
 const shapes=themeKinds[effect]||themeKinds.embers;
 effects.replaceChildren();
 const fragment=document.createDocumentFragment();
 for(let i=0;i<particleAmount;i++){
  const particle=make("span","vatra-gift-particle ui-vatra-gift-particle-001");
  particle.dataset.shape=shapes[i%shapes.length];
  if(particle.dataset.shape==="heart")particle.textContent="♥";
  if(particle.dataset.shape==="star")particle.textContent="✦";
  if(particle.dataset.shape==="sunray")particle.textContent="✷";
  if(particle.dataset.shape==="twinkle")particle.textContent="✧";
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
 heading=make("h2","vt-vatra-gift-viewer-heading-001");
 heading.id="vatra-gift-viewer-heading";
 close=make("button","vt-vatra-gift-viewer-close-001");
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
 eventText=make("p","vt-vatra-gift-viewer-event-001");
 description=make("p","vt-vatra-gift-viewer-description-001");
 const footer=make("footer","vatra-gift-viewer-footer ui-vatra-gift-viewer-footer-001");
 footer.append(eventText,description);
 dialog.append(top,stage,footer);
 dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener("close",()=>{
  // A queued close event from the previous gift may arrive after rapid reopen.
  // Never erase the newly populated particles or steal focus from that viewer.
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
 const url=fileUrl(gift);
 picture.classList.toggle("is-symbol",!url);
 picture.style.backgroundImage=url?"url("+JSON.stringify(url)+")":"none";
 picture.textContent=url?"":gift.symbol;
 stage.dataset.giftTheme=gift.effect;
 populateEffects(gift.effect);
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
