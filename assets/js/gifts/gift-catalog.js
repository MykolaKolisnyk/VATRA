(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../../",document.currentScript?.src||"assets/js/gifts/gift-catalog.js");
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
const byCode=code=>catalog.find(g=>g.code===code)||null;
const fileUrl=gift=>gift?new URL("assets/gifts/"+gift.image,root).href:null;
window.VATRA_GIFTS_CATALOG={all:catalog,byCode,fileUrl};
})();
