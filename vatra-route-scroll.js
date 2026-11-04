/* VATRA route scroll: route changes always begin at the top of the new view.
   Do not reset on ordinary data updates, typing, or expanding information. */
(() => {
 'use strict';
 if('scrollRestoration' in history)history.scrollRestoration='manual';
 let previousKey=location.pathname+location.search+location.hash;
 let pending=false;
 function reset(){
   document.documentElement.scrollTop=0;
   document.body.scrollTop=0;
   window.scrollTo(0,0);
   const scrollers=document.querySelectorAll('.layout>.main,.layout>.content,.vatra-main-scroll');
   scrollers.forEach(el=>{if(el.scrollTop>0)el.scrollTop=0;});
 }
 function onRoute(force=false){
   const routeKey=location.pathname+location.search+location.hash;
   if(!force&&routeKey===previousKey)return;
   previousKey=routeKey;
   if(pending)return;
   pending=true;
   requestAnimationFrame(()=>{
     requestAnimationFrame(()=>{
       pending=false;reset();
     });
   });
 }
 window.addEventListener('hashchange',()=>onRoute(),{passive:true});
 window.addEventListener('popstate',()=>onRoute(),{passive:true});
 window.addEventListener('pageshow',event=>{if(!event.persisted)onRoute(true);});
 new MutationObserver(()=>{
   const key=location.pathname+location.search+location.hash;
   if(key!==previousKey)onRoute();
 }).observe(document.body,{attributes:true,attributeFilter:['data-page']});
 document.addEventListener('click',event=>{
   const target=event.target.closest('a[href^="#/"],[data-page],[data-view-profile],[data-manage-group]');
   if(!target)return;
   requestAnimationFrame(()=>onRoute());
 },true);
})();
