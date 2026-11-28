(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const stage=document.querySelector(".vatra-login-hero-image-001");
 const script=document.currentScript;
 if(!stage||!script?.src)return;
 const sources=[
  "../../illustrations/login_hero-01.webp?rev=820e2c7986072c953322ea4b846391412efb73b5",
  "../../illustrations/login_hero-02.webp?rev=74bc08046bdeaffecf5fefc916b199e01ac6bcbc",
  "../../illustrations/login_hero-03.webp?rev=4f90c3e4f3821186218f9d4ec4cae07ab45c00b3"
 ].map(path=>new URL(path,script.src).href);
 const INTERVAL=30_000,PRELOAD=25_000,FADE=950;
 const connection=window.navigator?.connection;
 const constrained=()=>connection?.saveData===true||["slow-2g","2g","3g"].includes(connection?.effectiveType);
 let current=-1,active=null,bag=[],pending=null,preloadTimer=null,swapTimer=null,epoch=0;
 function choose(){
  if(!bag.length)bag=sources.map((_,i)=>i).filter(i=>i!==current);
  return bag.splice(Math.floor(Math.random()*bag.length),1)[0];
 }
 function load(index){
  return new Promise(resolve=>{
   const image=document.createElement("img");
   image.className="vatra-login-hero-layer-001 ui-vatra-login-hero-layer-00"+(index+1);
   image.alt="";image.setAttribute("aria-hidden","true");image.draggable=false;image.decoding="async";image.fetchPriority="low";
   let done=false;
   const finish=value=>{if(done)return;done=true;clearTimeout(timeout);image.onload=image.onerror=null;resolve(value);};
   const timeout=setTimeout(()=>{finish(null);image.removeAttribute?.("src");},12_000);
   image.onload=()=>{if(typeof image.decode==="function")image.decode().then(()=>finish({index,image}),()=>finish(null));else finish({index,image});};
   image.onerror=()=>finish(null);
   image.src=sources[index];
  });
 }
 function present(entry){
  const previous=active;
  active=entry.image;current=entry.index;
  if(!previous){active.classList.add("is-active");stage.append(active);return;}
  stage.append(active);
  active.getBoundingClientRect();
  active.classList.add("is-active");previous.classList.remove("is-active");
  setTimeout(()=>previous.remove(),FADE);
 }
 function stop(){
  ++epoch;clearTimeout(preloadTimer);clearTimeout(swapTimer);
  preloadTimer=swapTimer=null;
 }
 function eligible(){return !!active&&!document.hidden&&!constrained();}
 function prepare(){return pending||(pending=load(choose()));}
 function schedule(){
  stop();
  if(!eligible())return;
  const ticket=epoch;
  preloadTimer=setTimeout(()=>{if(ticket===epoch&&eligible())void prepare();},PRELOAD);
  swapTimer=setTimeout(async()=>{
   if(ticket!==epoch||!eligible())return;
   const request=prepare(),entry=await request;
   if(ticket!==epoch||!eligible())return;
   if(pending===request)pending=null;
   if(entry)present(entry);
   schedule();
  },INTERVAL);
 }
 document.addEventListener("visibilitychange",schedule);
 connection?.addEventListener?.("change",schedule);
 void (async()=>{
  for(let attempt=0;attempt<(constrained()?1:sources.length);attempt++){
   const entry=await load(choose());
   if(entry){present(entry);schedule();return;}
  }
 })();
})();
