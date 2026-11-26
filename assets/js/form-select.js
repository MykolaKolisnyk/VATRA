(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
function fillBirthdays(day,month,year){
 if(!month||!day||!year)return;
 const now=new Date();
 const locale=window.VATRA_LANGUAGE?.locale||"uk";
  const dateLocales={uk:"uk-UA",en:"en-US",pl:"pl-PL",de:"de-DE",fr:"fr-FR",it:"it-IT",ka:"ka-GE",bg:"bg-BG"};
  const names=new Intl.DateTimeFormat(dateLocales[locale]||"uk-UA",{month:"long"});
 for(let i=1;i<=12;i++){
  const number=String(i).padStart(2,"0");
  const name=names.format(new Date(2024,i-1,1));
  month.add(new Option(name[0].toUpperCase()+name.slice(1),number));
 }
 for(let i=1;i<=31;i++)day.add(new Option(String(i).padStart(2,"0"),String(i).padStart(2,"0")));
 for(let i=now.getFullYear();i>=1900;i--)year.add(new Option(String(i),String(i)));
}


let opened=null;
 function close(focus=false){
  if(!opened)return;
  const {trigger,list,root,resetRail}=opened;
  resetRail();
  list.hidden=true;trigger.setAttribute("aria-expanded","false");
  root.classList.remove("is-open","opens-up");
  opened=null;
  if(focus)trigger.focus();
 }
function wireSelects(selects){
 for(const select of selects){
  if(!select||select.classList.contains("vatra-select-native"))continue;
  const root=document.createElement("div");
  root.className="vatra-select ui-select-wrapper-"+select.id;
  select.parentNode.insertBefore(root,select);
  root.append(select);
  const required=select.required;
  select.required=false; 
  select.classList.add("vatra-select-native");
  select.tabIndex=-1;
  select.setAttribute("aria-hidden","true");
  const trigger=document.createElement("button");
  trigger.type="button";
  trigger.className="control vatra-select-trigger vatra-select-trigger-"+select.id;
  trigger.setAttribute("aria-haspopup","listbox");
  trigger.setAttribute("aria-expanded","false");
  trigger.setAttribute("aria-label",select.getAttribute("aria-label")||"");
  const display=document.createElement("span");
  display.className="vatra-select-display-"+select.id;
  trigger.append(display);
  const list=document.createElement("div");
  list.className="vatra-select-list ui-select-options-"+select.id;
  list.hidden=true;
  list.setAttribute("role","listbox");
  list.setAttribute("aria-label",select.getAttribute("aria-label")||"");
  const scrollArea=document.createElement("div");
  scrollArea.className="vatra-select-scroll-area ui-select-scroll-"+select.id;
  scrollArea.setAttribute("role","presentation");
  list.append(scrollArea);
  const rail=document.createElement("div");
  rail.className="vatra-select-scroll-rail ui-select-rail-"+select.id;
  rail.hidden=true;
  rail.setAttribute("aria-hidden","true");
  const thumb=document.createElement("span");
  thumb.className="vatra-select-scroll-thumb ui-select-thumb-"+select.id;
  rail.append(thumb);
  list.append(rail);
  let pointerInside=false,dragging=false,hideTimer=null,grabY=0;
  function resetRail(){
   clearTimeout(hideTimer);hideTimer=null;pointerInside=false;dragging=false;
   rail.classList.remove("is-visible","is-dragging");
  }
  function updateRail(){
   if(list.hidden)return;
   const overflow=scrollArea.scrollHeight-scrollArea.clientHeight;
   if(overflow<=1){rail.hidden=true;rail.classList.remove("is-visible");return;}
   rail.hidden=false;
   const height=rail.clientHeight;
   if(height<=0)return;
   const thumbHeight=Math.min(height,Math.max(26,
    height*scrollArea.clientHeight/scrollArea.scrollHeight));
   const travel=Math.max(0,height-thumbHeight);
   thumb.style.height=thumbHeight+"px";
   thumb.style.transform="translateY("+
    (travel*(scrollArea.scrollTop/overflow))+"px)";
  }
  function showRail(){
   updateRail();
   if(rail.hidden)return;
   rail.classList.add("is-visible");
   clearTimeout(hideTimer);hideTimer=null;
   if(!pointerInside&&!dragging)hideTimer=setTimeout(
    ()=>rail.classList.remove("is-visible"),1000);
  }
  list.addEventListener("pointerenter",e=>{
   if(e.pointerType==="mouse"||e.pointerType==="pen"){
    pointerInside=true;showRail();
   }
  });
  list.addEventListener("pointerleave",e=>{
   if(e.pointerType==="mouse"||e.pointerType==="pen"){
    pointerInside=false;
    if(!dragging){clearTimeout(hideTimer);rail.classList.remove("is-visible");}
   }
  });
  scrollArea.addEventListener("scroll",()=>{updateRail();showRail();},{passive:true});
  rail.addEventListener("pointerdown",e=>{
   if(e.button!==0||rail.hidden)return;
   e.preventDefault();e.stopPropagation();
   const thumbRect=thumb.getBoundingClientRect();
   grabY=e.clientY>=thumbRect.top&&e.clientY<=thumbRect.bottom?
    e.clientY-thumbRect.top:thumbRect.height/2;
   dragging=true;rail.classList.add("is-dragging");
   showRail();rail.setPointerCapture(e.pointerId);
   moveRail(e);
  });
  function moveRail(e){
   const limit=scrollArea.scrollHeight-scrollArea.clientHeight;
   const space=rail.clientHeight-thumb.getBoundingClientRect().height;
   if(limit<=0||space<=0)return;
   const y=Math.max(0,Math.min(space,e.clientY-rail.getBoundingClientRect().top-grabY));
   scrollArea.scrollTop=y/space*limit;
   updateRail();
  }
  rail.addEventListener("pointermove",e=>{if(dragging)moveRail(e);});
  function stopDrag(e){
   if(!dragging)return;
   dragging=false;rail.classList.remove("is-dragging");
   if(rail.hasPointerCapture(e.pointerId))rail.releasePointerCapture(e.pointerId);
   pointerInside=list.matches(":hover");
   if(pointerInside)showRail();
   else{clearTimeout(hideTimer);rail.classList.remove("is-visible");}
  }
  rail.addEventListener("pointerup",stopDrag);
  rail.addEventListener("pointercancel",stopDrag);
  rail.addEventListener("wheel",e=>{
   scrollArea.scrollTop+=e.deltaY;
   showRail();e.preventDefault();
  },{passive:false});
  const choices=[...select.options].filter(opt=>!opt.disabled&&(opt.value||!required));
  for(const [optionIndex,opt] of choices.entries()){
   const item=document.createElement("button");
   item.type="button";
   item.className="vatra-select-option vatra-select-"+select.id+"-item-"+(optionIndex+1);
   item.dataset.value=opt.value;
   item.setAttribute("role","option");
   item.setAttribute("aria-selected",String(select.value===opt.value));
   item.tabIndex=-1;
   item.textContent=opt.textContent;
   item.addEventListener("click",()=>{
    select.value=opt.value;
    select.dispatchEvent(new Event("change",{bubbles:true}));
    close(true);
   });
   scrollArea.append(item);
  }
  root.append(trigger,list);
  const caption=document.querySelector('label[for="'+select.id+'"]');
  if(caption){
    caption.addEventListener("click",event=>{
      event.preventDefault();
      trigger.focus();
      trigger.click();
    });
  }
  const update=()=>{
   const current=select.selectedOptions[0];
   display.textContent=current?.textContent||"";
   trigger.classList.toggle("is-placeholder",!select.value);
   for(const item of scrollArea.children){
    item.setAttribute("aria-selected",String(item.dataset.value===select.value));
   }
  };
  select.addEventListener("change",update);
  select.form?.addEventListener("reset",()=>requestAnimationFrame(update));
  update();
  function open(){
   if(!root.isConnected||select.disabled)return;
   if(opened?.trigger===trigger){close();return;}
   close();
   const rect=trigger.getBoundingClientRect();
   const below=window.innerHeight-rect.bottom-12;
   const above=rect.top-12;
   const upwards=below<230&&above>below;
   const room=upwards?above:below;
   list.style.maxHeight=Math.max(100,Math.min(304,room-10))+"px";
   root.classList.toggle("opens-up",upwards);
   list.hidden=false;
   trigger.setAttribute("aria-expanded","true");
   root.classList.add("is-open");
   opened={trigger,list,root,select,choices,resetRail};
   const active=list.querySelector('[aria-selected="true"]');
   if(active)active.scrollIntoView({block:"nearest"});
   requestAnimationFrame(()=>{
    if(opened?.list!==list)return;
    updateRail();
    if(list.matches(":hover")){pointerInside=true;showRail();}
   });
  }
  trigger.addEventListener("click",open);
  trigger.addEventListener("keydown",e=>{
   if(e.key==="Escape"){if(opened?.trigger===trigger){e.preventDefault();close();}return;}
   if(e.key===" "||e.key==="Enter"){e.preventDefault();open();return;}
   const values=choices.map(o=>o.value);
   let index=values.indexOf(select.value);
   if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){
    e.preventDefault();
    if(!opened||opened.trigger!==trigger)open();
    if(e.key==="ArrowDown")index=Math.min(values.length-1,index+1);
    else if(e.key==="ArrowUp")index=Math.max(0,index<0?0:index-1);
    else if(e.key==="Home")index=0;else index=values.length-1;
    if(index>=0){
     select.value=values[index];
     select.dispatchEvent(new Event("change",{bubbles:true}));
     scrollArea.children[index]?.scrollIntoView({block:"nearest"});
    }
   }else if(e.key.length===1&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
    const search=e.key.toLocaleLowerCase();
    const match=choices.find(o=>o.textContent.toLocaleLowerCase().startsWith(search));
    if(match){select.value=match.value;select.dispatchEvent(new Event("change",{bubbles:true}));}
   }
  });
  if(required)root.dataset.required="true";
 }
}
 document.addEventListener("pointerdown",e=>{
  if(opened&&!opened.root.contains(e.target))close();
 });
 document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&opened)close(true);
 });
 window.addEventListener("resize",()=>close());

window.VATRA_FORM_SELECT=Object.freeze({fillBirthdays,wireSelects,close});
})();
