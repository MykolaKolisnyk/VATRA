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

 function setUpSiteSearch(){
  const form=document.querySelector("#feed-search-form");
  const input=document.querySelector("#feed-search-input");
  const panel=document.querySelector("#vatra-search-panel");
  const list=document.querySelector("#vatra-search-history");
  const empty=document.querySelector("#vatra-search-empty");
  const count=document.querySelector("#vatra-search-count");
  const back=document.querySelector("#vatra-search-back");
  const edit=document.querySelector("#vatra-search-edit");
  const clearAll=document.querySelector("#vatra-search-clear");
  const brand=form.closest(".feed-brand-search");
  const logo=brand?.querySelector(".feed-header-brand");
  if(!form||!input||!panel||!list||!empty||!count||!back||!edit||!clearAll||!brand)return;
  // Backdrop-filter on the sticky header creates a fixed-position containing block.
  // Moving the popup to the document layer keeps viewport positioning accurate.
  document.body.append(panel);

  const storageKey="vatra.search.history.v1";
  const limit=120;
  const clean=value=>Array.from(String(value??"").trim().replace(/\s+/g," ")).slice(0,limit).join("");
  const storageRead=()=>{
   try{
    const stored=JSON.parse(localStorage.getItem(storageKey)||"[]");
    return Array.isArray(stored)?stored.filter(item=>typeof item==="string").map(clean).filter(Boolean):[];
   }catch(_){return [];}
  };
  let entries=storageRead();
  const store=()=>{
   try{localStorage.setItem(storageKey,JSON.stringify(entries));}
   catch(_){
    // Preserve the newest terms if the browser runs out of local storage.
    for(let count=entries.length-1;count>0;count--){
     try{localStorage.setItem(storageKey,JSON.stringify(entries.slice(0,count)));break;}catch(_){}
    }
   }
  };
  const t=(uk,en)=>lang()==="en"?en:uk;
  let visible=false,editing=false;
  function syncEditing(){
   edit.hidden=entries.length===0;
   edit.textContent=editing?t("Готово","Done"):t("Редагувати","Edit");
   clearAll.hidden=!editing||entries.length===0;
   panel.classList.toggle("is-editing",editing);
  }
  const localize=()=>{
   for(const el of panel.querySelectorAll("[data-search-uk]"))
    el.textContent=t(el.dataset.searchUk,el.dataset.searchEn);
   panel.setAttribute("aria-label",t("Пошук у VATRA","Search VATRA"));
   list.setAttribute("aria-label",t("Історія запитів","Search queries"));
   panel.querySelector(".vatra-search-scope").setAttribute("aria-label",t("Розділи для пошуку","Search sections"));
   back.setAttribute("aria-label",t("Назад до VATRA","Back to VATRA"));
   render();
  };
  const position=()=>{
   if(!visible)return;
   const vp=window.visualViewport;
   const vw=vp?.width||innerWidth,vh=vp?.height||innerHeight;
   const ox=vp?.offsetLeft||0,oy=vp?.offsetTop||0;
   const field=form.getBoundingClientRect();
   const anchor=brand.getBoundingClientRect();
   const header=document.querySelector(".feed-header")?.getBoundingClientRect();
   const width=Math.max(0,Math.min(400,vw-16));
   const left=Math.max(ox+8,Math.min(anchor.left,ox+vw-width-8));
   const belowTop=Math.max(oy+8,field.bottom+7,(header?.bottom||0)+5);
   const belowSpace=Math.max(0,oy+vh-belowTop-8);
   const aboveSpace=Math.max(0,field.top-oy-16);
   const flip=belowSpace<150&&aboveSpace>belowSpace;
   const available=flip?aboveSpace:belowSpace;
   const height=Math.min(available,Math.max(0,panel.scrollHeight));
   const top=flip?Math.max(oy+8,field.top-7-height):belowTop;
   panel.style.left=Math.round(left)+"px";
   panel.style.top=Math.round(top)+"px";
   panel.style.width=Math.round(width)+"px";
   panel.style.maxHeight=Math.max(0,Math.round(available))+"px";
  };
  const close=()=>{
   visible=false;panel.hidden=true;
   input.setAttribute("aria-expanded","false");
   brand.classList.remove("vatra-search-active");
   back.setAttribute("aria-hidden","true");back.tabIndex=-1;
   logo?.removeAttribute("aria-hidden");
   editing=false;syncEditing();
  };
  const open=()=>{
   visible=true;panel.hidden=false;
   input.setAttribute("aria-expanded","true");
   brand.classList.add("vatra-search-active");
   back.removeAttribute("aria-hidden");back.tabIndex=0;
   logo?.setAttribute("aria-hidden","true");
   render();position();
  };
  function remember(value){
   const query=clean(value);
   if(!query)return;
   entries=[query,...entries.filter(item=>item.toLocaleLowerCase()!==query.toLocaleLowerCase())];
   store();
  }
  function icon(cls,path){
   const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
   svg.setAttribute("class",cls);
   svg.setAttribute("viewBox","0 0 24 24");
   svg.setAttribute("width","18");svg.setAttribute("height","18");
   svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");
   svg.setAttribute("stroke-width","1.75");
   svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");
   svg.setAttribute("aria-hidden","true");
   const element=document.createElementNS("http://www.w3.org/2000/svg","path");
   element.setAttribute("class",cls+"-path");
   element.setAttribute("d",path);
   svg.append(element);return svg;
  }
  function render(){
   const typed=clean(input.value).toLocaleLowerCase();
   const visibleTerms=typed?entries.filter(term=>term.toLocaleLowerCase().includes(typed)):entries;
   const fragment=document.createDocumentFragment();
   visibleTerms.forEach((term,index)=>{
    const suffix=String(index+1).padStart(3,"0");
    const row=document.createElement("div");
    row.className="vatra-search-history-row ui-vatra-search-history-row-"+suffix;
    row.setAttribute("role","listitem");
    const use=document.createElement("button");
    use.type="button";
    use.className="vatra-search-history-term vt-search-history-term-"+suffix;
    use.append(icon("ui-vatra-search-clock-"+suffix,"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2"));
    const label=document.createElement("span");
    label.className="vt-search-history-text-"+suffix;
    label.textContent=term;
    use.append(label);
    use.setAttribute("aria-label",t("Шукати: ","Search for: ")+term);
    use.addEventListener("click",()=>{
     input.value=term;
     close();
     if(typeof form.requestSubmit==="function")form.requestSubmit();
     else form.dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}));
    });
    const remove=document.createElement("button");
    remove.type="button";
    remove.className="vatra-search-history-remove ui-vatra-search-history-remove-"+suffix;
    remove.setAttribute("aria-label",t("Видалити пошук: ","Delete search: ")+term);
    remove.append(icon("ui-vatra-search-remove-"+suffix,"M6 6l12 12M18 6 6 18"));
    remove.addEventListener("click",()=>{
     entries=entries.filter(item=>item!==term);
     store();
     render();
     if(!panel.hidden)position();
     input.focus({preventScroll:true});
    });
    row.append(use,remove);
    fragment.append(row);
   });
   list.replaceChildren(fragment);
   panel.classList.toggle("has-query",!!typed);
   empty.hidden=visibleTerms.length>0;
   empty.textContent=typed?t("Немає збігів в історії","No matches in history"):
    t("Історія пошуку порожня","No search history");
   count.textContent=visibleTerms.length?
    t(visibleTerms.length+" запитів",visibleTerms.length+" searches"):"";
   syncEditing();
  }
  function route(scope){
   const term=clean(input.value);
   if(!term){open();input.focus();return;}
   remember(term);
   close();
   const root=new URL("./",location.href);
   if(scope==="posts"&&document.body.dataset.page==="feed"){
    form.requestSubmit();
    return;
   }
   const destination=scope==="communities"?"communities":"feed";
   location.assign(new URL(destination+"?q="+encodeURIComponent(term),root).href);
  }
  back.addEventListener("click",()=>{
   close();input.blur();logo?.focus({preventScroll:true});
  });
  edit.addEventListener("click",()=>{
   editing=!editing;syncEditing();position();
  });
  clearAll.addEventListener("click",()=>{
   entries=[];store();editing=false;render();position();input.focus({preventScroll:true});
  });
  input.addEventListener("focus",open);
  input.addEventListener("click",open);
  input.addEventListener("input",()=>{if(!visible)open();else{render();position();}});
  input.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&visible){event.preventDefault();close();input.blur();}
   if(event.key==="ArrowDown"&&visible){
    const first=list.querySelector(".vatra-search-history-term");
    if(first){event.preventDefault();first.focus();}
   }
  });
  form.addEventListener("submit",()=>{
   remember(input.value);
   close();
  },true);
  panel.querySelectorAll("[data-vatra-search-scope]").forEach(button=>{
   button.addEventListener("click",()=>route(button.dataset.vatraSearchScope));
  });
  document.addEventListener("pointerdown",event=>{
   if(visible&&!form.contains(event.target)&&!panel.contains(event.target)&&!back.contains(event.target))close();
  });
  document.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&visible)close();
  });
  window.addEventListener("resize",position,{passive:true});
  window.addEventListener("scroll",position,{passive:true});
  window.visualViewport?.addEventListener("resize",position,{passive:true});
  window.visualViewport?.addEventListener("scroll",position,{passive:true});
  window.addEventListener("storage",event=>{
   if(event.key===storageKey){entries=storageRead();render();}
  });
  new MutationObserver(()=>{
   if(!panel.isConnected)return;
   localize();
  }).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  const initial=new URLSearchParams(location.search).get("q");
  if(initial&&!input.value)input.value=clean(initial);
  localize();
 }

 const boot=()=>{
  setUpTooltip();
  setUpComingSoon();
  setUpStories();
  setUpSiteSearch();
 };
 if(document.readyState==="loading")
  document.addEventListener("DOMContentLoaded",boot,{once:true});
 else boot();
})();
