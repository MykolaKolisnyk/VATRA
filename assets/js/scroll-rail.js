/* VATRA left scroll progress: decorative edge, one accessible return-to-top control. */
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const init=()=>{
  if(!document.body.classList.contains("feed-page"))return;
  const side=document.createElement("button");
  side.type="button";side.className="vatra-scroll-rail ui-vatra-scroll-rail-001";
  side.setAttribute("aria-label",document.documentElement.lang==="en"?"Scroll to top":"Повернутися вгору");
  side.title=document.documentElement.lang==="en"?"To top":"Вгору";

  const name=document.createElement("span");name.className="vatra-scroll-rail-label vt-vatra-scroll-rail-label-001";
  name.textContent=document.documentElement.lang==="en"?"Top":"Вгору";
  const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");
  icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("class","ui-vatra-scroll-rail-icon-001");
  icon.setAttribute("fill","none");icon.setAttribute("stroke","currentColor");icon.setAttribute("stroke-width","2");
  const path=document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("class","ui-vatra-scroll-rail-icon-path-001");
  path.setAttribute("d","m6 14 6-6 6 6");icon.append(path);name.prepend(icon);
  side.append(name);
  document.body.append(side);
  let pending=false;
  const update=()=>{
   pending=false;
   const total=Math.max(1,document.documentElement.scrollHeight-innerHeight);
   side.hidden=scrollY<350||total<500;
  };
  const scheduled=()=>{if(pending)return;pending=true;requestAnimationFrame(update);};
  side.addEventListener("click",()=>{
   scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  });
  window.addEventListener("scroll",scheduled,{passive:true});
  window.addEventListener("resize",scheduled,{passive:true});
  update();
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();