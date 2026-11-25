
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const lang=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";


 const tr=(uk,en)=>{
  const locale=lang();
  if(locale==="uk")return uk;
  const localized=window.VATRA_LANGUAGE?.translate?.(uk);
  if(typeof localized==="string"&&localized!==uk)return localized;
  return locale==="en"?(en??uk):uk;
 };
  const make=(tag,cls,txt)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=txt;
  return el;
 };
 let tooltip=null,hovered=null,tooltipSuppressed=null,infoDialog=null,infoTitle=null,infoText=null,infoClose=null;
 let tooltipDismissTimer=null;
 function hideTooltip(){
  if(tooltipDismissTimer!==null){clearTimeout(tooltipDismissTimer);tooltipDismissTimer=null;}
  if(!tooltip)return;
  tooltip.dataset.open="false";hovered=null;
 }
 function positionTooltip(target){
  if(!tooltip||!target||tooltip.dataset.open!=="true")return;
  const bounds=target.getBoundingClientRect(),header=document.querySelector(".feed-header");
  const vp=window.visualViewport;
  const edgeLeft=vp?.offsetLeft||0,edgeTop=vp?.offsetTop||0;
  const visibleWidth=vp?.width||innerWidth,visibleHeight=vp?.height||innerHeight;
  const width=tooltip.offsetWidth,height=tooltip.offsetHeight;

  const headerRect=header?.getBoundingClientRect();
  let top=(headerRect?.bottom??bounds.bottom)+1;
  if(top+height>edgeTop+visibleHeight-5)
   top=Math.max(edgeTop+5,(headerRect?.top??bounds.top)-height-1);
  top=Math.max(edgeTop+5,Math.min(top,edgeTop+visibleHeight-height-5));
  const left=Math.max(edgeLeft+6,Math.min(bounds.left+bounds.width/2-width/2,
   edgeLeft+visibleWidth-width-6));
  tooltip.style.left=Math.round(left)+"px";
  tooltip.style.top=Math.round(top)+"px";
 }
 function showTooltip(target,event){



  if(!tooltip||!target||infoDialog?.open||document.querySelector("dialog[open]")||
   document.querySelector(".feed-account-menu")?.open||
   !!document.querySelector(".vatra-notification-panel:not([hidden]),#vatra-search-panel:not([hidden])")||
   tooltipSuppressed===target||event?.pointerType==="touch")return;
  const label=tr(target.dataset.vatraTooltipUk,target.dataset.vatraTooltipEn);
  if(!label)return;
  hideTooltip();
  hovered=target;tooltip.textContent=label;tooltip.dataset.open="true";
  positionTooltip(target);

  tooltipDismissTimer=setTimeout(hideTooltip,1800);
 }
 window.VATRA_HIDE_SHELL_TOOLTIP=hideTooltip;
 function setUpAccountPanel(){
  const menu=document.querySelector(".feed-account-menu");
  const dropdown=menu?.querySelector(".feed-account-dropdown");
  const header=document.querySelector(".feed-header");
  if(!menu||!dropdown||!header)return;
  if(!dropdown.querySelector(".vatra-account-manage-001")){
   const root=new URL("../../",shellScript||location.href);
   const manage=make("a","vatra-account-manage-001");
   const brand=make("span","ui-vatra-account-id-brand-001");
   const symbol=make("img","ui-vatra-account-id-symbol-001");
   symbol.src=new URL("assets/logo/logo_symbol.svg",root).href;
   symbol.alt="";brand.append(symbol);
   manage.href=new URL("vatra-id",root).href;
   manage.append(brand,
    make("span","vatra-account-manage-label-001",tr("Керування акаунтом","Manage account")),
    make("small","vatra-account-id-label-001","ID"));
   (dropdown.querySelector(".feed-account-profile")||dropdown.firstElementChild)?.after(manage);
  }
  const support=dropdown.querySelector(".feed-menu-support"),settings=dropdown.querySelector(".feed-menu-settings-link");
  if(support&&settings)settings.before(support);
  const icon=(anchor,kind)=>{
   const svg=anchor?.querySelector("svg");
   if(!svg)return;
   const ns="http://www.w3.org/2000/svg",makePath=d=>{
    const path=document.createElementNS(ns,"path");
    path.setAttribute("d",d);return path;
   };
   svg.replaceChildren();
   svg.setAttribute("viewBox","0 0 24 24");
   svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");
   svg.setAttribute("stroke-width","1.8");svg.setAttribute("stroke-linecap","round");
   svg.setAttribute("stroke-linejoin","round");
   if(kind==="settings"){
    svg.append(makePath("M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"),
     makePath("M19.2 12c0-.5-.05-1-.16-1.46l1.74-1.37-1.8-3.12-2.12.86a7.7 7.7 0 0 0-2.5-1.44L14 3h-4l-.36 2.47a7.7 7.7 0 0 0-2.5 1.44l-2.12-.86-1.8 3.12 1.74 1.37a7 7 0 0 0 0 2.92l-1.74 1.37 1.8 3.12 2.12-.86a7.7 7.7 0 0 0 2.5 1.44L10 21h4l.36-2.47a7.7 7.7 0 0 0 2.5-1.44l2.12.86 1.8-3.12-1.74-1.37c.11-.46.16-.96.16-1.46Z"));
   }else{
    svg.append(makePath("M4 14v-3a8 8 0 0 1 16 0v3"),
     makePath("M5 13h2v7H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2ZM17 13h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2v-7ZM19 20c0 1.5-1.5 2-4 2h-2"));
   }
  };
  icon(settings,"settings");icon(support,"support");



  const position=()=>{
   if(!menu.open)return;
   const menuBox=menu.getBoundingClientRect();
   const headerBox=header.getBoundingClientRect();
   const vp=window.visualViewport;
   const viewTop=vp?.offsetTop||0;
   const viewHeight=vp?.height||innerHeight;

   const gapTop=Math.max(0,headerBox.bottom-menuBox.top);
   const gapRight=0;
   const width=Math.min(344,innerWidth-24);
   const minLeft=12-menuBox.left;
   const maxLeft=innerWidth-12-width-menuBox.left;
   const gapLeft=Math.max(minLeft,Math.min(menuBox.width-width,maxLeft));
   const height=Math.max(0,viewTop+viewHeight-menuBox.bottom-15);
   dropdown.style.setProperty("--vatra-account-dropdown-top",Math.round(gapTop)+"px");
   dropdown.style.setProperty("--vatra-account-dropdown-right",Math.round(gapRight)+"px");
   dropdown.style.setProperty("--vatra-account-dropdown-left",Math.round(gapLeft)+"px");
   dropdown.style.setProperty("--vatra-account-dropdown-height",Math.round(height)+"px");
  };

  const afterLayout=()=>requestAnimationFrame(position);
  document.addEventListener("pointerdown",event=>{
   if(menu.open&&!menu.contains(event.target))menu.open=false;
  },{capture:true});
  document.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&menu.open){menu.open=false;menu.querySelector("summary")?.focus();}
  });
  menu.addEventListener("toggle",position);
  menu.addEventListener("toggle",afterLayout);
  if(typeof ResizeObserver!=="undefined"){
   const observer=new ResizeObserver(afterLayout);
   observer.observe(header);
   observer.observe(menu);
  }
  window.addEventListener("resize",afterLayout,{passive:true});
  window.addEventListener("scroll",afterLayout,{passive:true});
  window.visualViewport?.addEventListener("resize",afterLayout,{passive:true});
  window.visualViewport?.addEventListener("scroll",afterLayout,{passive:true});
 }
 function setUpTooltip(){
  const accountMenu=document.querySelector(".feed-account-menu");
  accountMenu?.addEventListener("toggle",()=>{
   if(accountMenu.open){
    tooltipSuppressed=accountMenu.querySelector(".feed-account-toggle");
    hideTooltip();
   }
  });
  tooltip=make("div","vatra-shell-tooltip");
  tooltip.id="vatra-shell-tooltip";
  tooltip.setAttribute("role","tooltip");
  tooltip.dataset.open="false";
  document.body.append(tooltip);
  for(const target of document.querySelectorAll("[data-vatra-tooltip-uk]")){
   target.removeAttribute("title");
   target.setAttribute("aria-describedby","vatra-shell-tooltip");
   target.addEventListener("pointerenter",event=>showTooltip(target,event));
   target.addEventListener("pointerleave",()=>{
    hideTooltip();
    if(tooltipSuppressed===target)tooltipSuppressed=null;
   });
   target.addEventListener("focus",event=>{
    if(target.matches(":focus-visible"))showTooltip(target,event);
   });
   target.addEventListener("blur",hideTooltip);
   target.addEventListener("click",()=>{


    tooltipSuppressed=target;
    hideTooltip();
   });
  }


  document.addEventListener("pointerdown",hideTooltip,true);
  document.addEventListener("pointermove",event=>{
   if(!hovered||event.pointerType==="touch")return;
   const r=hovered.getBoundingClientRect();
   if(event.clientX<r.left||event.clientX>r.right||
      event.clientY<r.top||event.clientY>r.bottom)hideTooltip();
  },{passive:true,capture:true});
  document.addEventListener("focusin",event=>{
   if(hovered&&event.target!==hovered&&!hovered.contains(event.target))hideTooltip();
  },true);
  window.addEventListener("blur",hideTooltip);
  document.addEventListener("visibilitychange",()=>{
   if(document.hidden)hideTooltip();
  });
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
   if(item.classList.contains("ui-social-top-friends-001")){
    item.removeAttribute("data-vatra-coming-soon");
    item.removeAttribute("title");
    item.addEventListener("click",()=>{
     location.assign(new URL("friends",new URL("./",location.href)).href);
    });
    continue;
   }
   if(["clips","marketplace"].includes(item.dataset.vatraComingSoon)){
    const page=item.dataset.vatraComingSoon;
    item.removeAttribute("data-vatra-coming-soon");item.removeAttribute("title");item.removeAttribute("aria-disabled");item.disabled=false;
    item.classList.remove("social-top-pending");
    if(document.body.dataset.page===page){item.classList.add("social-top-active");item.setAttribute("aria-current","page");}
    item.addEventListener("click",()=>location.assign(new URL(page,location.href).href));
    continue;
   }
   if(item.dataset.vatraComingSoon==="notifications"){
    item.removeAttribute("data-vatra-coming-soon");continue;
   }
   item.disabled=false;
   item.removeAttribute("aria-disabled");
   item.removeAttribute("title");
   item.addEventListener("click",()=>{
    hideTooltip();
    const text=item.querySelector("[data-social-uk]");
    const name=text?tr(text.dataset.socialUk||text.textContent,text.dataset.socialEn):
     tr(item.dataset.storyTitleUk||item.dataset.vatraTooltipUk||"Історії",
      item.dataset.storyTitleEn||item.dataset.vatraTooltipEn||"Stories");
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
    const title=tr(card.dataset.storyTitleUk,card.dataset.storyTitleEn);
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
  const clearInput=document.querySelector("#feed-search-clear-input");
  const brand=form?.closest(".feed-brand-search");
  const logo=brand?.querySelector(".feed-header-brand");
  if(!form||!input||!panel||!list||!empty||!count||!back||!edit||!clearAll||!brand)return;


  document.body.append(panel);

  const suggestions=make("div","vatra-search-live-results ui-vatra-search-live-results-001");
  suggestions.hidden=true; suggestions.setAttribute("role","region");
  suggestions.setAttribute("aria-live","polite");
  suggestions.setAttribute("aria-label",tr("Результати пошуку","Search results"));
  panel.append(suggestions);


  let storageKey=null,viewerId=null;
  clearInput?.setAttribute("aria-label",tr("Очистити пошук","Clear search"));
  const limit=120;
  const clean=value=>Array.from(String(value??"").trim().replace(/\s+/g," ")).slice(0,limit).join("");
  const storageRead=()=>{
   if(!storageKey)return [];
   try{
    const stored=JSON.parse(localStorage.getItem(storageKey)||"[]");
    return Array.isArray(stored)?stored.filter(item=>typeof item==="string").map(clean).filter(Boolean):[];
   }catch(_){return [];}
  };
  let entries=[],recentViews=[];
  const viewKey=()=>storageKey?storageKey+".views":null;
  const readViews=()=>{if(!viewKey())return [];try{const a=JSON.parse(localStorage.getItem(viewKey())||"[]");return Array.isArray(a)?a.filter(v=>v&&typeof v.title==="string"&&typeof v.kind==="string").slice(0,20):[];}catch(_){return [];}};
  const storeViews=()=>{if(viewKey())try{localStorage.setItem(viewKey(),JSON.stringify(recentViews));}catch(_){}};
  const store=()=>{
   if(!storageKey)return;
   try{localStorage.setItem(storageKey,JSON.stringify(entries));}
   catch(_){

    for(let count=entries.length-1;count>0;count--){
     try{localStorage.setItem(storageKey,JSON.stringify(entries.slice(0,count)));break;}catch(_){}
    }
   }
  };
  const t=tr;
  let visible=false,editing=false,expanded=false,activeScope="all",lastResult=null;
  const scopes=[["all","Усе","All"],["people","Люди","People"],["communities","Спільноти","Communities"],["products","Товари","Products"],["posts","Публікації","Posts"],["photos","Фотографії","Photos"],["videos","Відео","Videos"],["clips","Кліпи","Clips"]];
  let liveTimer=null,liveTicket=0,liveController=null,liveTerm=null;
  const validMember=id=>/^[1-9][0-9]{0,18}$/.test(String(id??""));
  const validPost=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id??""));
  const clearLive=()=>{
   if(liveTimer!==null){clearTimeout(liveTimer);liveTimer=null;}
   if(liveController){liveController.abort();liveController=null;}
   liveTerm=null;lastResult=null;liveTicket++;suggestions.replaceChildren();
   suggestions.hidden=true;panel.classList.remove("has-live-results");
  };
  const iconVector=(kind,path)=>{
   const ns="http://www.w3.org/2000/svg";
   const svg=document.createElementNS(ns,"svg");
   svg.setAttribute("class","ui-vatra-search-live-glyph-"+kind);
   svg.setAttribute("viewBox","0 0 24 24");
   svg.setAttribute("fill","none");
   svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.8");
   svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");
   svg.setAttribute("aria-hidden","true");
   const shape=document.createElementNS(ns,"path");
   shape.setAttribute("class","ui-vatra-search-live-path-"+kind);
   shape.setAttribute("d",path);
   svg.append(shape);return svg;
  };
  const base=()=>new URL("./",location.href);
  const resultHref=(kind,item)=>{
   if(kind==="people")return validMember(item.vatra_id)?new URL("id"+item.vatra_id,base()).href:null;
   if(kind==="communities")return validMember(item.club_id)?new URL("club"+item.club_id,base()).href:null;
   if(!validPost(item.id))return null;
   if(kind==="products")return new URL("marketplace?item="+encodeURIComponent(item.id),base()).href;
   if(kind==="clips")return new URL("clips?clip="+encodeURIComponent(item.id),base()).href;
   if(["posts","photos","videos"].includes(kind))return item.kind==="group"&&validMember(item.club_id)?new URL("club"+item.club_id+"?post="+encodeURIComponent(item.id),base()).href:new URL("feed?post="+encodeURIComponent(item.id),base()).href;
   return null;
  };
  const groupLabel=kind=>{const entry=scopes.find(x=>x[0]===kind);return entry?tr(entry[1],entry[2]):"";};
  const resultTitle=(kind,item)=>kind==="people"?item.display_name||tr("Учасник VATRA","VATRA member"):kind==="communities"?item.name:kind==="products"?item.title:String(item.body||groupLabel(kind)).slice(0,105);
  const resultDetails=(kind,item)=>kind==="people"?item.status_text:kind==="communities"?item.description:kind==="products"?[Number(item.price).toLocaleString(lang()==="en"?"en-GB":"uk-UA",{maximumFractionDigits:2})+" "+({UAH:"₴",USD:"$",EUR:"€"}[item.currency]||"₴"),item.city].filter(Boolean).join(" · "):item.kind==="group"?tr("Дописи спільнот","Community posts"):tr("Стрічка VATRA","VATRA feed");
  const vectors={people:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 21v-2a7.5 7.5 0 0 1 15 0v2",communities:"M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20v-1a6 6 0 0 1 12 0v1M17 6a3 3 0 0 1 0 5M18 14a5 5 0 0 1 3 5v1",products:"M4 7h16l1 14H3L4 7Zm4 0V5a4 4 0 0 1 8 0v2",posts:"M5 3.5h14v17H5zM8 9h8M8 13h8M8 17h5",photos:"M3 4h18v16H3zM3 17l6-6 4 4 3-3 5 5M16 8h.1",videos:"M3 5h13v14H3zM16 10l5-3v10l-5-3",clips:"M3 4h18v16H3zM9 9l6 3-6 3z"};
  const resultIcon=(kind,item,suffix)=>{
   const icon=make("span","vatra-search-live-icon ui-vatra-search-live-icon-"+kind+"-"+suffix);
   icon.setAttribute("aria-hidden","true");icon.dataset.kind=kind;icon.append(iconVector(kind+"-"+suffix,vectors[kind]||vectors.posts));
   if(kind==="people"){const url=window.VATRA_SITE_SEARCH?.avatarUrl?.(item.vatra_id,item.avatar_path);if(url){const image=make("img","ui-vatra-search-result-avatar-001");image.alt="";image.loading="lazy";image.decoding="async";image.addEventListener("load",()=>{icon.querySelector("svg")?.remove();},{once:true});image.addEventListener("error",()=>image.remove(),{once:true});icon.append(image);image.src=url;}}
   return icon;
  };
  function rememberView(kind,item){
   if(!viewKey()||!resultHref(kind,item))return;
   const record={kind,title:kind==="people"||kind==="communities"||kind==="products"?clean(resultTitle(kind,item)):groupLabel(kind),vatra_id:item.vatra_id?String(item.vatra_id):null,club_id:item.club_id?String(item.club_id):null,id:item.id||null,post_kind:item.kind||null,avatar_path:kind==="people"?item.avatar_path:null};
   const identity=v=>[v.kind,v.vatra_id,v.club_id,v.id].join(":");recentViews=[record,...recentViews.filter(v=>identity(v)!==identity(record))].slice(0,20);storeViews();
  }
  function group(title,items,kind){
   if(!items?.length)return;
   const section=make("section","vatra-search-live-section ui-vatra-search-live-section-"+kind);section.append(make("h3","vatra-search-live-heading-"+kind,title));
   items.forEach((item,index)=>{
    const href=resultHref(kind,item);if(!href)return;
    const suffix=String(index+1).padStart(3,"0"),row=make("a","vatra-search-live-result ui-vatra-search-live-result-"+kind+"-"+suffix);row.href=href;
    const content=make("span","vatra-search-live-text ui-vatra-search-live-text-"+kind+"-"+suffix),primary=make("strong","vatra-search-live-primary-"+kind+"-"+suffix,resultTitle(kind,item));content.append(primary);
    if(kind==="people"&&item.verified===true)window.VATRA_SITE_SEARCH?.attachVerified?.(primary,item.vatra_id);
    const detail=resultDetails(kind,item);if(detail)content.append(make("small","vatra-search-live-secondary-"+kind+"-"+suffix,detail));
    row.append(resultIcon(kind,item,suffix),content);if(kind==="people")row.append(make("small","vatra-search-result-id-001","ID "+item.vatra_id));
    row.addEventListener("click",()=>{rememberView(kind,item);remember(input.value);});section.append(row);
   });suggestions.append(section);
  }
  function renderResults(result){
   suggestions.replaceChildren();
   const tabs=make("div","ui-vatra-search-categories-001");tabs.setAttribute("role","group");tabs.setAttribute("aria-label",tr("Категорії пошуку","Search categories"));
   for(const [key,uk,en] of scopes){const b=make("button","vatra-search-category-"+key,tr(uk,en));b.type="button";b.setAttribute("aria-pressed",String(activeScope===key));b.addEventListener("click",()=>{activeScope=key;renderResults(result);suggestions.querySelector(".vatra-search-category-"+key)?.focus();position();});tabs.append(b);}
   suggestions.append(tabs);let found=false;
   for(const [kind,uk,en] of scopes.slice(1)){if(activeScope!=="all"&&activeScope!==kind)continue;const rows=result?.[kind]||[];if(!rows.length)continue;found=true;group(tr(uk,en),activeScope==="all"&&!expanded?rows.slice(0,3):rows,kind);}
   if(!found)suggestions.append(make("p","vatra-search-live-empty-001",tr("Збігів немає. Спробуйте інший запит.","No matches. Try another search.")));
   if(!expanded&&found){const all=make("button","vatra-search-live-all-001",tr("Розгорнути результати","Expand results"));all.type="button";all.addEventListener("click",()=>{expanded=true;remember(input.value);panel.classList.add("is-expanded");renderResults(result);position();});suggestions.append(all);}
   panel.classList.add("has-live-results");
  }
  const scheduleLive=value=>{
   const term=String(value||"").trim().slice(0,120);

   if(term===liveTerm&&(liveTimer!==null||liveController||lastResult))return;
   if(term!==liveTerm){lastResult=null;activeScope="all";}
   if(liveTimer!==null){clearTimeout(liveTimer);liveTimer=null;}
   if(liveController){liveController.abort();liveController=null;}
   liveTerm=term;
   const ticket=++liveTicket;
   if(term.length<2&&!/^[1-9]$/.test(term)){clearLive();return;}
   suggestions.hidden=false;list.hidden=true;empty.hidden=true;
   suggestions.replaceChildren(make("p","vatra-search-live-loading-001",tr("Шукаємо у VATRA…","Searching VATRA…")));
   const fetchMatches=async()=>{
    liveTimer=null;
    if(!visible||ticket!==liveTicket)return;
    const controller=new AbortController();
    liveController=controller;
    try{
     if(!window.VATRA_SITE_SEARCH?.search)throw Error("Search provider unavailable");
     const result=await window.VATRA_SITE_SEARCH.search(term,controller.signal);
     if(controller.signal.aborted||!visible||ticket!==liveTicket)return;
     lastResult=result;renderResults(result);position();
    }catch(_){
     if(!controller.signal.aborted&&ticket===liveTicket)
      suggestions.replaceChildren(make("p","vatra-search-live-empty-001",
       tr("Не вдалося виконати пошук.","Could not search VATRA.")));
    }finally{
     if(liveController===controller)liveController=null;
    }
   };
   liveTimer=setTimeout(fetchMatches,350);
  };

  function syncEditing(){
   edit.hidden=entries.length===0&&recentViews.length===0;
   edit.textContent=editing?t("Готово","Done"):t("Редагувати","Edit");
   clearAll.hidden=!editing||(!entries.length&&!recentViews.length);
   panel.classList.toggle("is-editing",editing);
  }
  const localize=()=>{
   for(const el of panel.querySelectorAll("[data-search-uk]"))
    el.textContent=t(el.dataset.searchUk,el.dataset.searchEn);
   panel.setAttribute("aria-label",t("Пошук у VATRA","Search VATRA"));
   list.setAttribute("aria-label",t("Історія запитів","Search queries"));
   back.setAttribute("aria-label",t("Назад до VATRA","Back to VATRA"));
   render();
  };
  const position=()=>{
   if(!visible)return;
   const vp=window.visualViewport;
   const vw=vp?.width||innerWidth,vh=vp?.height||innerHeight;
   const ox=vp?.offsetLeft||0,oy=vp?.offsetTop||0;
   const header=document.querySelector(".feed-header")?.getBoundingClientRect();
   const anchor=brand.getBoundingClientRect();



   const headerTop=Math.max(oy,header?.top??oy);
   const headerBottom=Math.max(headerTop,header?.bottom??anchor.bottom);


   const inputBox=form.getBoundingClientRect();




   const compact=vw<=600;
   const left=ox;
   const width=Math.max(1,Math.min(ox+vw-left-(compact?0:12),compact?vw:expanded?790:Math.max(360,inputBox.right-left+12)));
   const available=Math.max(0,oy+vh-headerBottom-12);
   panel.style.left=Math.round(left)+"px";
   panel.style.top=Math.round(headerBottom)+"px";
   panel.style.width=Math.round(width)+"px";
   panel.style.paddingTop="0px";
   panel.style.maxHeight=Math.round(available)+"px";
  };
  const close=()=>{
   visible=false;expanded=false;activeScope="all";panel.classList.remove("is-expanded");panel.hidden=true;
   input.setAttribute("aria-expanded","false");
   brand.classList.remove("vatra-search-active");
   back.setAttribute("aria-hidden","true");back.tabIndex=-1;
   logo?.removeAttribute("aria-hidden");
   editing=false;syncEditing();clearLive();list.hidden=false;empty.hidden=false;
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
   entries=[query,...entries.filter(item=>item.toLocaleLowerCase()!==query.toLocaleLowerCase())].slice(0,30);
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
   if(!typed)recentViews.forEach((view,index)=>{
    const item={...view,kind:view.post_kind,display_name:view.title,name:view.title,title:view.title};const href=resultHref(view.kind,item);if(!href)return;
    const suffix="recent-"+String(index+1).padStart(3,"0"),row=make("div","vatra-search-history-row ui-vatra-search-history-row-"+suffix);row.setAttribute("role","listitem");
    const link=make("a","vatra-search-history-term ui-vatra-search-recent-link-001");link.href=href;link.append(icon("ui-vatra-search-recent-clock-"+suffix,"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2"),make("span","vatra-search-history-text-"+suffix,view.title),resultIcon(view.kind,item,suffix));
    link.addEventListener("click",()=>rememberView(view.kind,item));const remove=make("button","vatra-search-history-remove ui-vatra-search-history-remove-"+suffix);remove.type="button";remove.setAttribute("aria-label",tr("Видалити з історії","Remove from history"));remove.append(icon("ui-vatra-search-remove-"+suffix,"M6 6l12 12M18 6 6 18"));remove.addEventListener("click",()=>{recentViews=recentViews.filter(v=>v!==view);storeViews();render();position();});row.append(link,remove);fragment.append(row);
   });
   visibleTerms.forEach((term,index)=>{
    const suffix=String(index+1).padStart(3,"0");
    const row=document.createElement("div");
    row.className="vatra-search-history-row ui-vatra-search-history-row-"+suffix;
    row.setAttribute("role","listitem");
    const use=document.createElement("button");
    use.type="button";
    use.className="vatra-search-history-term vatra-search-history-term-"+suffix;
    use.append(icon("ui-vatra-search-clock-"+suffix,"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2"));
    const label=document.createElement("span");
    label.className="vatra-search-history-text-"+suffix;
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
   empty.hidden=visibleTerms.length>0||(!typed&&recentViews.length>0);
   empty.textContent=typed?t("Немає збігів в історії","No matches in history"):
    t("Історія пошуку порожня","No search history");
   const total=visibleTerms.length+(!typed?recentViews.length:0);
   count.textContent=total?
    (lang()==="uk"?total+" записів":
     lang()==="en"?total+" entries":
     tr("Кількість запитів: {count}","Searches: {count}")
      .replace("{count}",String(total))):"";
   syncEditing();if(clearInput)clearInput.hidden=!input.value;
   const term=input.value.trim();
   const live=term.length>=2||/^[1-9]$/.test(term);
   list.hidden=live;
   empty.hidden=live||visibleTerms.length>0||(!typed&&recentViews.length>0);
   edit.hidden=live||(!entries.length&&!recentViews.length);
   clearAll.hidden=live||clearAll.hidden;
   const heading=panel.querySelector(".vatra-search-panel-heading-001");
   if(heading)heading.textContent=live?tr("Результати пошуку","Search results"):
    tr("Нещодавні","Recent");
   if(visible)scheduleLive(term);else if(!live)clearLive();
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
   entries=[];recentViews=[];store();storeViews();editing=false;render();position();input.focus({preventScroll:true});
  });
  input.addEventListener("focus",open);
  input.addEventListener("click",open);
  input.addEventListener("input",()=>{if(!visible)open();else{render();position();}});
  input.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&visible){event.preventDefault();close();input.blur();}
   if(event.key==="ArrowDown"&&visible){
    const first=(suggestions.hidden?list:suggestions).querySelector("a,.vatra-search-history-term");
    if(first){event.preventDefault();first.focus();}
   }
  });
  form.addEventListener("submit",event=>{
   event.preventDefault();event.stopImmediatePropagation();remember(input.value);expanded=true;panel.classList.add("is-expanded");if(!visible)open();if(lastResult&&liveTerm===input.value.trim().slice(0,120))renderResults(lastResult);else scheduleLive(input.value);position();
  },true);
  clearInput?.addEventListener("click",()=>{
   input.value="";render();input.dispatchEvent(new Event("search",{bubbles:true}));
   input.focus({preventScroll:true});
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
   if(storageKey&&(event.key===storageKey||event.key===viewKey())){entries=storageRead();recentViews=readViews();render();}
  });
  new MutationObserver(()=>{
   if(!panel.isConnected)return;
   localize();
  }).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});


  const setViewer=id=>{
   const next=/^[1-9][0-9]{0,18}$/.test(String(id??""))?String(id):null;
   if(next===viewerId)return;
   if(visible)close();else clearLive();
   viewerId=next;
   storageKey=next?"vatra.search.history.v2.member."+next:null;
   entries=storageRead();recentViews=readViews();
   editing=false;render();
  };
  window.VATRA_SEARCH_HISTORY={setViewer};
  setViewer(window.VATRA_AUTH_MEMBER_ID);
  const initial=new URLSearchParams(location.search).get("q");
  if(initial&&!input.value)input.value=clean(initial);
  localize();
 }

 
 function setupRouteMotion(){
  const eligible=target=>/^\/VATRA\/(?:feed|profile|friends|gifts|communities|notifications|clips|marketplace|vatra-id|settings|id[1-9][0-9]*|club[1-9][0-9]*)(?:\/)?$/.test(target.pathname);
  let navigating=false;
  const to=destination=>{
   let next;
   try{next=new URL(destination,location.href);}catch(_){return false;}
   if(navigating)return true;
   if(next.origin!==location.origin||!eligible(next))return false;

   if(next.pathname===location.pathname&&next.search===location.search){

    if(next.hash&&next.hash!==location.hash)return false;
    return true;
   }



   const club=next.pathname.match(/^\/VATRA\/club([1-9][0-9]{0,18})$/);
   if(club){
    const documentUrl=new URL("club.html",new URL("./",next.href));
    documentUrl.search=next.search;
    documentUrl.searchParams.set("club_id",club[1]);
    documentUrl.hash=next.hash;
    next=documentUrl;
   }


   navigating=true;
   location.assign(next.href);
   return true;
  };
  window.VATRA_NAVIGATE={to};
  document.addEventListener("click",event=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||
    event.shiftKey||event.altKey)return;
   const anchor=event.target.closest?.("a[href]");
   if(!anchor||anchor.download||anchor.target&&anchor.target!=="_self")return;
   if(document.querySelector("dialog[open]"))return;
   if(to(anchor.href))event.preventDefault();
  });
 }
 
 function showPendingShell(){
  const app=document.querySelector("#feed-app, #profile-app, #community-app");
  const loader=document.querySelector("#feed-loading, #profile-loading, #community-loading");
  const header=app?.querySelector(".feed-header");
  if(!app||!loader||!header||document.body.dataset.authReady==="true")return;
  app.hidden=false;document.body.classList.add("vatra-shell-pending");
  const align=()=>document.body.style.setProperty("--vatra-shell-bottom",
   Math.max(0,Math.ceil(header.getBoundingClientRect().bottom))+"px");
  align();requestAnimationFrame(align);
  window.addEventListener("resize",align,{passive:true});
  window.visualViewport?.addEventListener("resize",align,{passive:true});
 }
 const soundRoot=new URL("../../",document.currentScript?.src||location.href);
 const soundFiles=Object.freeze({
  like:"like.mp3",
  newFollower:"new-follower.mp3",notification:"notification.mp3"
 });
 let soundLastPlayed=0;
 const playSound=kind=>{
  const filename=soundFiles[kind];
  if(!filename||document.hidden||!window.Audio)return false;
  const now=Date.now();
  if(now-soundLastPlayed<350)return false;
  soundLastPlayed=now;
  try{
   const audio=new Audio(new URL("assets/sounds/"+filename,soundRoot).href);
   audio.volume=kind==="like"?.35:.55;
   const promise=audio.play();promise?.catch?.(()=>{});
   return true;
  }catch(_){return false;}
 };
 window.VATRA_SOUNDS=Object.freeze({play:playSound});
 function setupHeaderDismiss(){
  document.addEventListener("pointerdown",event=>{
   const header=document.querySelector(".feed-header");
   if(!header)return;
   for(const item of header.querySelectorAll("details[open]")){
    if(!item.contains(event.target))item.open=false;
   }
  },true);
  document.addEventListener("keydown",event=>{
   if(event.key!=="Escape")return;
   const header=document.querySelector(".feed-header");
   const open=[...(header?.querySelectorAll("details[open]")||[])];
   for(const item of open)item.open=false;
   if(open.length)open.at(-1)?.querySelector("summary")?.focus();
  },true);
 }
 function setupCommentEnter(){
  document.addEventListener("keydown",event=>{
   if(event.key!=="Enter"||event.shiftKey||event.ctrlKey||event.metaKey||
      event.altKey||event.isComposing||event.keyCode===229)return;
   const input=event.target;
   if(input?.tagName!=="TEXTAREA")return;
   const form=input.closest?.("form");
   if(!form||![...form.classList].some(x=>x.includes("comment")))return;
   event.preventDefault();event.stopImmediatePropagation();
   const button=form.querySelector('button[type="submit"]:not(:disabled)');
   if(button)form.requestSubmit(button);
  },true);
 }
 const shellScript=document.currentScript?.src;
 const boot=()=>{
  if(shellScript&&document.querySelector(".feed-account-menu")&&!document.querySelector("script[data-vatra-admin]")){const s=document.createElement("script");s.src=new URL("account-guard.js?rev=75e4057976db3593814de6d14beae75016283fae",shellScript).href;s.dataset.vatraAdmin="true";document.head.append(s);}
  showPendingShell();
  setUpAccountPanel();
  setupRouteMotion();
  setUpTooltip();
  setUpComingSoon();
  setUpStories();
  setUpSiteSearch();
  setupCommentEnter();
  setupHeaderDismiss();
 };
 const bootLocalized=()=>{


  if(!["uk","en"].includes(lang())&&window.VATRA_LANGUAGE?.ready)
   window.VATRA_LANGUAGE.ready.then(boot);
  else boot();
 };
 if(document.readyState==="loading")
  document.addEventListener("DOMContentLoaded",bootLocalized,{once:true});
 else bootLocalized();
})();
