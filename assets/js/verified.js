(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const states=new WeakMap(),requests=new WeakMap();
 function lookup(client,value){
  const id=String(value??"");
  if(!client||!(/^[1-9][0-9]{0,18}$/.test(id)))return Promise.resolve(false);
  let state=states.get(client);
  if(!state){
   state={cache:new Map(),pending:new Map(),queued:new Set(),scheduled:false,generation:0};
   states.set(client,state);
   client.auth?.onAuthStateChange?.(event=>{
    if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;
    state.generation++;state.cache.clear();state.queued.clear();
    for(const entry of state.pending.values())entry.resolve(false);
    state.pending.clear();
   });
  }
  const cached=state.cache.get(id);
  if(cached&&cached.until>Date.now()){
   state.cache.delete(id);state.cache.set(id,cached);return Promise.resolve(cached.ok);
  }
  if(cached)state.cache.delete(id);
  const existing=state.pending.get(id);
  if(existing)return existing.promise;
  const entry={resolve:null,promise:null};
  entry.promise=new Promise(resolve=>{entry.resolve=resolve;});
  state.pending.set(id,entry);state.queued.add(id);
  if(!state.scheduled){
   state.scheduled=true;
   queueMicrotask(async()=>{
    state.scheduled=false;
    const generation=state.generation,ids=[...state.queued];
    state.queued.clear();
    for(let offset=0;offset<ids.length;offset+=100){
     if(state.generation!==generation)return;
     const batch=ids.slice(offset,offset+100);
     let verified=new Set(),success=false;
     try{
      if(window.VATRA_PUBLIC_NAMES?.get){
       const {data,error}=await window.VATRA_PUBLIC_NAMES.get(client,batch);
       const names=new Map((data||[]).filter(row=>
        row&&typeof row.verified==="boolean"&&/^[1-9][0-9]{0,18}$/.test(String(row.vatra_id)))
        .map(row=>[String(row.vatra_id),row.verified]));
       if(!error&&batch.every(id=>names.has(id))){
        verified=new Set(batch.filter(id=>names.get(id)));
        success=true;
       }
      }
     }catch(_){}
     if(state.generation!==generation)return;
     if(!success)try{
      const {data,error}=await client.from("verified_accounts").select("vatra_id").in("vatra_id",batch);
      if(!error){verified=new Set((data||[]).map(row=>String(row.vatra_id)));success=true;}
     }catch(_){}
     if(state.generation!==generation)return;
     for(const key of batch){
      const ok=verified.has(key),waiting=state.pending.get(key);
      if(success)state.cache.set(key,{ok,until:Date.now()+60000});
      state.pending.delete(key);waiting?.resolve(ok);
     }
     while(state.cache.size>500)state.cache.delete(state.cache.keys().next().value);
    }
   });
  }
  return entry.promise;
 }
 let active=null,tip=null,activeMode=null,inputMode="keyboard";
 const tooltipCopy=new WeakMap();
 const labels={
  uk:["Верифікована сторінка","Справжність цього акаунта підтверджено VATRA."],
  en:["Verified profile","VATRA has confirmed the authenticity of this account."],
  pl:["Zweryfikowany profil","VATRA potwierdziła autentyczność tego konta."],
  de:["Verifiziertes Profil","VATRA hat die Echtheit dieses Kontos bestätigt."],
  fr:["Profil vérifié","VATRA a confirmé l’authenticité de ce compte."],
  it:["Profilo verificato","VATRA ha confermato l’autenticità di questo account."],
  ka:["დადასტურებული პროფილი","VATRA-მ დაადასტურა ამ ანგარიშის ნამდვილობა."],
  bg:["Потвърден профил","VATRA потвърди автентичността на този акаунт."]
 };
 const copy=()=>labels[String(window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk").toLowerCase().split("-")[0]]||labels.en;
 function close(){
  if(active){active.setAttribute("aria-expanded","false");active.removeAttribute("aria-describedby");}
  if(tip){if(typeof tip.hidePopover==="function")try{tip.hidePopover();}catch(_){}tip.remove();}
  active=null;tip=null;activeMode=null;
 }
 function position(){
  if(!active||!tip)return;
  if(!active.isConnected){close();return;}
  const rect=active.getBoundingClientRect(),v=window.visualViewport;
  const left=v?.offsetLeft||0,top=v?.offsetTop||0,w=v?.width||window.innerWidth,h=v?.height||window.innerHeight;
  if(rect.bottom<top||rect.top>top+h){close();return;}
  const width=Math.min(tooltipCopy.has(active)?180:290,w-20);
  tip.style.width=width+"px";
  const height=tip.offsetHeight,x=Math.max(left+10,Math.min(rect.left+rect.width/2-width/2,left+w-width-10));
  const above=rect.top-height-9>=top+8;
  tip.style.left=Math.round(x)+"px";
  tip.style.top=Math.round(above?rect.top-height-9:Math.min(rect.bottom+9,top+h-height-8))+"px";
  tip.dataset.side=above?"above":"below";
  tip.style.setProperty("--vatra-verified-arrow",Math.max(12,Math.min(width-12,rect.left+rect.width/2-x))+"px");
 }
 function open(mark,mode){
  if(active===mark){activeMode=mode;position();return;}
  close();active=mark;activeMode=mode;
  tip=document.createElement("div");tip.id="vatra-verified-tooltip";tip.className="vatra-verified-tooltip";tip.setAttribute("role","tooltip");
  const title=document.createElement("strong"),body=document.createElement("span");
  const custom=tooltipCopy.get(mark);
  title.className="vatra-verified-tooltip-title";title.textContent=copy()[0];
  body.className="vatra-verified-tooltip-text";body.textContent=custom?custom():copy()[1];
  if(custom)tip.append(body);else tip.append(title,body);
  if(typeof tip.showPopover==="function"){
   tip.setAttribute("popover","manual");document.body.append(tip);
   try{tip.showPopover();}catch(_){tip.removeAttribute("popover");(mark.closest("dialog[open]")||document.body).append(tip);}
  }else (mark.closest("dialog[open]")||document.body).append(tip);
  mark.setAttribute("aria-expanded","true");mark.setAttribute("aria-describedby",tip.id);position();
 }
 function badge(interactive=false){
  const mark=document.createElement("span");
  mark.className="vatra-verified-badge";mark.setAttribute("aria-label",copy()[0]);
  if(interactive){mark.classList.add("vatra-verified-badge-interactive");mark.tabIndex=0;mark.setAttribute("role","button");mark.setAttribute("aria-expanded","false");}
  else mark.setAttribute("role","img");
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),path=document.createElementNS("http://www.w3.org/2000/svg","path");
  svg.setAttribute("class","vatra-verified-symbol");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");svg.setAttribute("aria-hidden","true");
  const seal=document.createElementNS("http://www.w3.org/2000/svg","path");
  seal.setAttribute("class","vatra-verified-seal");seal.setAttribute("d","M12 0.35L14.511 2.631L17.825 1.911L18.859 5.141L22.089 6.175L21.369 9.489L23.65 12L21.369 14.511L22.089 17.825L18.859 18.859L17.825 22.089L14.511 21.369L12 23.65L9.489 21.369L6.175 22.089L5.141 18.859L1.911 17.825L2.631 14.511L0.35 12L2.631 9.489L1.911 6.175L5.141 5.141L6.175 1.911L9.489 2.631Z");seal.setAttribute("fill","currentColor");seal.setAttribute("stroke","currentColor");seal.setAttribute("stroke-width","1.15");seal.setAttribute("stroke-linejoin","round");seal.setAttribute("transform","translate(1 1) scale(.916667)");
  path.setAttribute("class","vatra-verified-check");path.setAttribute("d","M7.2 12.2l3.1 3.1 6.5-6.5");path.setAttribute("stroke","#fff");path.setAttribute("stroke-width","2.35");path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");
  svg.append(seal,path);mark.append(svg);
  if(interactive)bindTooltip(mark);
  return mark;
 }
 function bindTooltip(mark,getText){
  if(getText)tooltipCopy.set(mark,getText);
  mark.setAttribute("tabindex","0");mark.setAttribute("role","button");mark.setAttribute("aria-expanded","false");
  let lastPointer="";
  mark.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")open(mark,"hover");});
  mark.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse"&&active===mark)close();});
  mark.addEventListener("pointerdown",e=>{
   lastPointer=e.pointerType;
   if(e.pointerType==="mouse")e.preventDefault();
  });
  mark.addEventListener("focus",()=>{if(inputMode==="keyboard")open(mark,"keyboard");});
  mark.addEventListener("blur",()=>{if(active===mark&&activeMode==="keyboard")close();});
  mark.addEventListener("click",e=>{
   e.preventDefault();e.stopPropagation();
   const pointer=lastPointer;lastPointer="";
   if(pointer==="mouse"||e.pointerType==="mouse")return;
   if(active===mark)close();else open(mark,e.detail===0&&!pointer?"keyboard":"touch");
  });
  mark.addEventListener("keydown",e=>{
   if(e.key==="Enter"||e.key===" "){
    e.preventDefault();e.stopPropagation();
    if(active===mark)close();else open(mark,"keyboard");
   }
  });
  return mark;
 }
 async function attach(client,target,id){
  if(!target)return;
  const token={};requests.set(target,token);
  const previous=target.querySelector(":scope > .vatra-verified-badge");
  if(previous===active)close();
  previous?.remove();
  const name=target.textContent;
  if(!await lookup(client,id)||requests.get(target)!==token||target.textContent!==name)return;
  if(target.matches(".profile-name,.feed-post-name,.vatra-profile-photo-owner-001,.vatra-global-search-name-001,[class*='vatra-search-live-primary-people-'],[class^='vatra-friends-name-'],[class^='vatra-profile-friend-name-']")){
   if(!target.querySelector(":scope > .vatra-verified-name-text")){
    const text=document.createElement("span");text.className="vatra-verified-name-text";text.textContent=name;target.replaceChildren(text);
   }
   target.classList.add("vatra-verified-name");
  }
  target.append(badge(target.matches(".profile-identity .profile-name")));
 }
 document.addEventListener("pointerdown",e=>{
  inputMode="pointer";
  if(active&&!active.contains(e.target))close();
 },true);
 document.addEventListener("pointermove",e=>{
  if(!active||e.pointerType!=="mouse"||activeMode==="keyboard")return;
  const rect=active.getBoundingClientRect();
  if(!active.isConnected||e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)close();
 },{capture:true,passive:true});
 document.documentElement.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse"&&activeMode==="hover")close();});
 window.addEventListener("blur",close);
 document.addEventListener("keydown",e=>{
  inputMode="keyboard";
  if(e.key==="Escape"&&active){e.preventDefault();e.stopPropagation();close();}
 },true);
 window.addEventListener("resize",position,{passive:true});
 window.addEventListener("scroll",position,{capture:true,passive:true});
 window.visualViewport?.addEventListener("resize",position,{passive:true});
 window.visualViewport?.addEventListener("scroll",position,{passive:true});
 window.VATRA_VERIFIED={attach};
 window.VATRA_TOOLTIP={bind:bindTooltip};
})();
