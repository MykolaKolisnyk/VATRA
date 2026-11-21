(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const init=()=>{
  if(!document.body.classList.contains("feed-page"))return;
  const side=document.createElement("button");
  side.type="button";side.className="vatra-scroll-rail ui-vatra-scroll-rail-001";side.hidden=true;
  side.setAttribute("aria-label",document.documentElement.lang==="en"?"Scroll to top":"Повернутися вгору");
  side.title=document.documentElement.lang==="en"?"To top":"Вгору";
  const name=document.createElement("span");name.className="vatra-scroll-rail-label vatra-scroll-rail-label-001";
  name.textContent=document.documentElement.lang==="en"?"Top":"Вгору";
  const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");
  icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("class","ui-vatra-scroll-rail-icon-001");
  icon.setAttribute("fill","none");icon.setAttribute("stroke","currentColor");icon.setAttribute("stroke-width","1.7");
  icon.setAttribute("stroke-linecap","round");icon.setAttribute("stroke-linejoin","round");
  const path=document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("class","ui-vatra-scroll-rail-icon-path-001");path.setAttribute("d","m6.5 14 5.5-5.5 5.5 5.5");
  icon.append(path);name.prepend(icon);side.append(name);document.body.append(side);
  const header=document.querySelector(".feed-header");
  const layout=document.querySelector(".feed-layout")||document.querySelector("main");
  let pending=false;
  const update=()=>{
   pending=false;
   const edge=layout?.getBoundingClientRect();
   const gutter=edge&&edge.width>0?edge.left:0;
   const left=gutter>=78?Math.round(gutter-62):16;
   side.style.left=Math.max(12,Math.min(innerWidth-60,left))+"px";
   side.hidden=window.scrollY<350||document.documentElement.scrollHeight-innerHeight<500;
  };
  const scheduled=()=>{if(pending)return;pending=true;requestAnimationFrame(update);};
  if(typeof ResizeObserver==="function"){
   const observer=new ResizeObserver(scheduled);
   if(header)observer.observe(header);
   if(layout)observer.observe(layout);
  }
  side.addEventListener("click",()=>scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
  window.addEventListener("scroll",scheduled,{passive:true});
  window.addEventListener("resize",scheduled,{passive:true});
  update();
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
