(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
for(const root of document.querySelectorAll("[data-create-menu]")){
 const trigger=root.querySelector("[data-create-toggle]"),panel=root.querySelector("[data-create-panel]");
 if(!trigger||!panel)continue;
 let timer=null,clicked=false,keyboard=false;
 const observer=new MutationObserver(()=>{if(!panel.hidden&&(!trigger.isConnected||!trigger.getClientRects().length||trigger.disabled))close();});
 const popover=typeof panel.showPopover==="function"&&typeof panel.hidePopover==="function";
 if(popover)panel.setAttribute("popover","manual");
 const cancel=()=>{clearTimeout(timer);timer=null;};
 const close=(focus=false)=>{cancel();observer.disconnect();if(popover&&panel.matches(":popover-open"))panel.hidePopover();panel.hidden=true;clicked=false;trigger.setAttribute("aria-expanded","false");if(focus)trigger.focus({preventScroll:true});};
 const position=()=>{
  if(panel.hidden)return;
  if(!trigger.isConnected||!trigger.getClientRects().length||trigger.disabled){close();return;}
  if(!popover)return;
  const anchor=trigger.getBoundingClientRect(),viewport=window.visualViewport;
  const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,right=left+(viewport?.width||innerWidth),bottom=top+(viewport?.height||innerHeight);
  const headerBottom=Math.max(top,document.querySelector(".feed-header")?.getBoundingClientRect().bottom||0);
  if(anchor.bottom<=headerBottom||anchor.top>=bottom){close();return;}
  panel.style.setProperty("--create-menu-width",Math.max(0,Math.min(280,anchor.width,right-left-16))+"px");
  const width=panel.offsetWidth,height=panel.offsetHeight;
  const x=Math.max(left+8,Math.min(anchor.left+(anchor.width-width)/2,right-width-8));
  const preferred=anchor.bottom,above=anchor.top-height;
  const y=preferred+height<=bottom-8?preferred:above>=headerBottom+8?above:Math.max(headerBottom+8,Math.min(preferred,bottom-height-8));
  panel.style.setProperty("--create-menu-left",Math.round(x)+"px");
  panel.style.setProperty("--create-menu-top",Math.round(y)+"px");
 };
 const open=()=>{cancel();if(!trigger.getClientRects().length||trigger.disabled){close();return;}panel.hidden=false;if(popover&&!panel.matches(":popover-open"))panel.showPopover();position();if(!panel.hidden){for(let node=trigger;node;node=node.parentElement)observer.observe(node,{attributes:true,attributeFilter:["hidden","class","style","disabled","open"]});}trigger.setAttribute("aria-expanded",String(!panel.hidden));};
 const scheduleClose=()=>{cancel();timer=setTimeout(()=>{if(!root.matches(":hover")&&!panel.matches(":hover")&&!(keyboard&&panel.contains(document.activeElement)))close();},340);};
 const hoverOpen=event=>{if(event.pointerType==="mouse"||event.pointerType==="pen"){keyboard=false;open();}};
 const hoverClose=event=>{if(event.pointerType==="mouse"||event.pointerType==="pen")scheduleClose();};
 root.addEventListener("pointerenter",hoverOpen);
 root.addEventListener("pointerleave",hoverClose);
 panel.addEventListener("pointerenter",hoverOpen);
 panel.addEventListener("pointerleave",hoverClose);
 window.addEventListener("scroll",position,{passive:true});
 window.addEventListener("resize",position,{passive:true});
 window.visualViewport?.addEventListener("scroll",position,{passive:true});
 window.visualViewport?.addEventListener("resize",position,{passive:true});
 root.addEventListener("pointerdown",()=>{keyboard=false;});
 root.addEventListener("keydown",()=>{keyboard=true;});
 window.addEventListener("pagehide",()=>close());
 document.addEventListener("visibilitychange",()=>{if(document.hidden)close();});
 trigger.addEventListener("click",()=>{if(!panel.hidden&&clicked)close();else{clicked=true;open();}});
 trigger.addEventListener("keydown",event=>{if(event.key==="ArrowDown"){event.preventDefault();open();panel.querySelector("button")?.focus();}});
 panel.addEventListener("click",event=>{if(event.target.closest("button"))close(true);});
 root.addEventListener("focusout",event=>{if(event.relatedTarget&&!root.contains(event.relatedTarget))close();});
 document.addEventListener("pointerdown",event=>{if(!root.contains(event.target))close();});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!panel.hidden){event.preventDefault();close(true);}});
}
})();
