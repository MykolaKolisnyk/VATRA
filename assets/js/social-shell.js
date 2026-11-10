/* VATRA shared social header and Stories presentation.
   Each page keeps its own Supabase/auth logic; this module only handles UI. */
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const lang=()=>document.documentElement.lang==="en"?"en":"uk";
 const tr=(uk,en)=>lang()==="en"?en:uk;
  const make=(tag,cls,txt)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=txt;
  return el;
 };
 let tooltip=null,hovered=null,tooltipSuppressed=null,infoDialog=null,infoTitle=null,infoText=null,infoClose=null;
 function hideTooltip(){
  if(!tooltip)return;
  tooltip.dataset.open="false";hovered=null;
 }
 function positionTooltip(target){
  if(!tooltip||!target||tooltip.dataset.open!=="true")return;
  const bounds=target.getBoundingClientRect();
  const vp=window.visualViewport;
  const edgeLeft=vp?.offsetLeft||0,edgeTop=vp?.offsetTop||0;
  const visibleWidth=vp?.width||innerWidth,visibleHeight=vp?.height||innerHeight;
  const width=tooltip.offsetWidth,height=tooltip.offsetHeight,gap=10;
  const left=Math.max(edgeLeft+8,Math.min(bounds.left+bounds.width/2-width/2,edgeLeft+visibleWidth-width-8));
  const bottomSpace=edgeTop+visibleHeight-bounds.bottom;
  const above=bounds.top-edgeTop;
  let top=bottomSpace>=height+gap+8||bottomSpace>=above?
   bounds.bottom+gap:bounds.top-height-gap;
  top=Math.max(edgeTop+6,Math.min(top,edgeTop+visibleHeight-height-6));
  tooltip.style.left=Math.round(left)+"px";
  tooltip.style.top=Math.round(top)+"px";
 }
 function showTooltip(target,event){
  if(!tooltip||!target||infoDialog?.open||tooltipSuppressed===target||event?.pointerType==="touch")return;
  const label=target.dataset["vatraTooltip"+(lang()==="en"?"En":"Uk")];
  if(!label)return;
  hovered=target;tooltip.textContent=label;tooltip.dataset.open="true";
  positionTooltip(target);
 }
 function setUpTooltip(){
  tooltip=make("div","vatra-shell-tooltip");
  tooltip.id="vatra-shell-tooltip";
  tooltip.setAttribute("role","tooltip");
  tooltip.dataset.open="false";
  document.body.append(tooltip);
  for(const target of document.querySelectorAll("[data-vatra-tooltip-uk]")){
   target.removeAttribute("title");
   target.setAttribute("aria-describedby","vatra-shell-tooltip");
   target.addEventListener("pointerenter",event=>showTooltip(target,event));
   target.addEventListener("pointermove",event=>{
    if(tooltipSuppressed===target&&event.isTrusted&&event.pointerType!=="touch"&&
     (event.movementX||event.movementY)){
     tooltipSuppressed=null;
     showTooltip(target,event);
    }
   });
   target.addEventListener("pointerleave",()=>{
    hideTooltip();
    if(tooltipSuppressed===target)tooltipSuppressed=null;
   });
   target.addEventListener("focus",event=>{
    if(target.matches(":focus-visible"))showTooltip(target,event);
   });
   target.addEventListener("blur",hideTooltip);
   target.addEventListener("click",()=>{
    // Native dialogs restore focus: never re-open a tip without fresh user intent.
    tooltipSuppressed=target;
    hideTooltip();
   });
  }
  document.addEventListener("keydown",event=>{
   if(event.key==="Escape")hideTooltip();
   if(event.key==="Tab")tooltipSuppressed=null;
  });
  for(const name of ["scroll","resize"]){
   window.addEventListener(name,()=>{
    if(name==="scroll")hideTooltip();
    else if(hovered)positionTooltip(hovered);
   },{passive:true});
  }
  window.visualViewport?.addEventListener("resize",()=>{
   if(hovered)positionTooltip(hovered);
  },{passive:true});
 }
 function setUpComingSoon(){
  infoDialog=make("dialog","vatra-shell-dialog");
  infoDialog.setAttribute("aria-labelledby","vatra-shell-dialog-title");
  infoTitle=make("h2","vatra-shell-dialog-heading");
  infoTitle.id="vatra-shell-dialog-title";
  infoText=make("p","vatra-shell-dialog-text");
  infoClose=make("button","vatra-shell-dialog-close");
  infoClose.type="button";
  infoClose.textContent=tr("Зрозуміло","Got it");
  infoClose.addEventListener("click",()=>infoDialog.close());
  infoDialog.append(infoTitle,infoText,infoClose);
  infoDialog.addEventListener("click",event=>{
   if(event.target===infoDialog)infoDialog.close();
  });
  document.body.append(infoDialog);
  for(const item of document.querySelectorAll("[data-vatra-coming-soon]")){
   item.disabled=false;
   item.removeAttribute("aria-disabled");
   item.removeAttribute("title");
   item.addEventListener("click",()=>{
    hideTooltip();
    const text=item.querySelector("[data-social-uk]");
    const name=text?text.textContent:
     lang()==="en"?(item.dataset.storyTitleEn||item.dataset.vatraTooltipEn||"Stories"):
      (item.dataset.storyTitleUk||item.dataset.vatraTooltipUk||"Історії");
    infoTitle.textContent=name;
    infoText.textContent=tr("Цей розділ готується до запуску у VATRA. Поки він не має активних даних або повідомлень.",
     "This VATRA section is being prepared. No live content or messages are available yet.");
    infoClose.textContent=tr("Зрозуміло","Got it");
    infoDialog.showModal();
   });
  }
 }
 function setUpStories(){
  const cards=[...document.querySelectorAll(".feed-story-preview")];
  if(!cards.length)return;
  const dialog=make("dialog","vatra-story-dialog");
  dialog.setAttribute("aria-label",tr("Перегляд історії","Story viewer"));
  const stage=make("div","vatra-story-stage");
  const caption=make("p","vatra-story-caption");
  const close=make("button","vatra-story-close",tr("Закрити","Close"));
  close.type="button";
  close.addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
  dialog.append(stage,close);
  document.body.append(dialog);
  for(const card of cards){
   card.addEventListener("click",()=>{
    hideTooltip();
    const art=card.querySelector("svg");
    const title=lang()==="en"?card.dataset.storyTitleEn:card.dataset.storyTitleUk;
    stage.replaceChildren();
    if(art)stage.append(art.cloneNode(true));
    caption.textContent=title||"";
    stage.append(caption);
    dialog.showModal();
   });
  }
 }
 const boot=()=>{
  setUpTooltip();
  setUpComingSoon();
  setUpStories();
 };
 if(document.readyState==="loading")
  document.addEventListener("DOMContentLoaded",boot,{once:true});
 else boot();
})();
