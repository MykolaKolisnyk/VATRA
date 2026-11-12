/* VATRA original gifts, available to every authenticated screen.
   The catalogue is descriptive; ownership is always loaded from Supabase.
   No paid item can be purchased until a verified billing system exists. */
(()=>{
"use strict";
const root=new URL("../../",document.currentScript?.src||"assets/js/gift-viewer.js");
const catalog=[
 {code:"first_flame",image:"first-flame.svg",kind:"welcome",
  uk:"Перший вогник",en:"First flame",
  descriptionUk:"Перший вогник VATRA — знак початку вашої історії. Його отримує кожен, хто приєднався до VATRA.",
  descriptionEn:"Your first VATRA flame marks the beginning of your story. Every new member receives one.",
  eventUk:"Привітальний подарунок",eventEn:"Welcome gift",released:true},
 {code:"holiday_star",image:"holiday-star.svg",kind:"holiday",
  uk:"Святкова зірка",en:"Holiday star",
  descriptionUk:"Теплі побажання, що освітлюють особливі дні. Безкоштовний святковий подарунок від VATRA.",
  descriptionEn:"Warm wishes that brighten special days. A free holiday gift from VATRA.",
  eventUk:"Свята та особливі події",eventEn:"Holidays and special occasions",released:false},
 {code:"kind_heart",image:"kind-heart.svg",kind:"holiday",
  uk:"Серце доброти",en:"Kind heart",
  descriptionUk:"Нагадування про щирість, підтримку та близьких людей. Подарунок для майбутніх подій VATRA.",
  descriptionEn:"A reminder of kindness, care and the people who matter. Reserved for upcoming VATRA occasions.",
  eventUk:"Дні доброти",eventEn:"Days of kindness",released:false},
 {code:"bright_sun",image:"bright-sun.svg",kind:"holiday",
  uk:"Промінчик",en:"Sunbeam",
  descriptionUk:"Трішки сонця та гарного настрою для ваших людей. Майбутній безкоштовний подарунок від VATRA.",
  descriptionEn:"A little sunshine for your people. An upcoming free VATRA gift.",
  eventUk:"Літні свята",eventEn:"Summer events",released:false},
 {code:"ribbon",image:"ribbon.svg",kind:"holiday",
  uk:"Стрічка щастя",en:"Ribbon of joy",
  descriptionUk:"Світла стрічка на честь чудових моментів, які хочеться запам’ятати. Для майбутніх подій VATRA.",
  descriptionEn:"A bright ribbon for moments worth remembering. Reserved for future VATRA celebrations.",
  eventUk:"Особливі дні",eventEn:"Special days",released:false}
];
const en=()=>document.documentElement.lang==="en";
const lang=(uk,english)=>en()?english:uk;
const byCode=code=>catalog.find(g=>g.code===code)||null;
const fileUrl=gift=>new URL("assets/gifts/"+gift.image,root).href;
const make=(tag,cls,text)=>{
 const el=document.createElement(tag);el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
};
let dialog=null,heading=null,picture=null,description=null,eventText=null,close=null,lastFocus=null;
function setup(){
 if(dialog)return;
 dialog=make("dialog","vatra-gift-viewer ui-vatra-gift-viewer-001");
 dialog.setAttribute("aria-labelledby","vatra-gift-viewer-heading");
 const top=make("header","vatra-gift-viewer-head ui-vatra-gift-viewer-head-001");
 heading=make("h2","vt-vatra-gift-viewer-heading-001");
 heading.id="vatra-gift-viewer-heading";
 close=make("button","vt-vatra-gift-viewer-close-001","×");
 close.type="button";close.setAttribute("aria-label",lang("Закрити подарунок","Close gift"));
 close.addEventListener("click",()=>dialog.close());top.append(heading,close);
 const stage=make("div","vatra-gift-viewer-stage ui-vatra-gift-viewer-stage-001");
 picture=make("img","ui-vatra-gift-viewer-picture-001");picture.alt="";
 picture.width=240;picture.height=240;stage.append(picture);
 eventText=make("p","vt-vatra-gift-viewer-event-001");
 description=make("p","vt-vatra-gift-viewer-description-001");
 const footer=make("footer","vatra-gift-viewer-footer ui-vatra-gift-viewer-footer-001");
 footer.append(eventText,description);
 dialog.append(top,stage,footer);
 dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener("close",()=>lastFocus?.isConnected&&lastFocus.focus({preventScroll:true}));
 document.body.append(dialog);
}
function open(code){
 const gift=byCode(code);
 if(!gift)return false;
 setup();
 lastFocus=document.activeElement;
 heading.textContent=lang(gift.uk,gift.en);
 picture.src=fileUrl(gift);picture.alt=heading.textContent;
 eventText.textContent=lang(gift.eventUk,gift.eventEn);
 description.textContent=lang(gift.descriptionUk,gift.descriptionEn);
 close.setAttribute("aria-label",lang("Закрити подарунок","Close gift"));
 dialog.showModal();close.focus({preventScroll:true});
 return true;
}
window.VATRA_GIFTS_CATALOG={all:catalog,byCode,fileUrl};
window.VATRA_GIFT_VIEWER={open};
})();
