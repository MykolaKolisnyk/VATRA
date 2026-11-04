/* VATRA: accessible, calm tooltips. Remove browser-native black title popups only
   on hover/focus, preserving button accessible names. */
(()=>{
 'use strict';
 let active=null,timer=0;
 const tip=document.createElement('div');tip.id='vatraSharedTooltip';tip.className='vatra-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
 function reset(){
  clearTimeout(timer);timer=0;tip.classList.remove('is-visible');tip.hidden=true;
  if(active?.getAttribute('aria-describedby')==='vatraSharedTooltip')active.removeAttribute('aria-describedby');
  active=null;
 }
 function targetFor(node){
  if(!(node instanceof Element))return null;
  return node.closest('[title],[data-vatra-hint]');
 }
 function position(el){
  const r=el.getBoundingClientRect(),margin=10;
  const width=tip.offsetWidth,height=tip.offsetHeight;
  let left=Math.max(margin,Math.min(innerWidth-width-margin,r.left+r.width/2-width/2));
  let top=r.top-height-10;
  if(top<margin)top=Math.min(innerHeight-height-margin,r.bottom+10);
  tip.style.left=Math.max(margin,left)+'px';
  tip.style.top=Math.max(margin,top)+'px';
 }
 function show(node,keyboard=false){
  const el=targetFor(node);if(!el){reset();return;}
  // The sidebar already shows the destination names, so extra repeated hints
  // would just cover nearby content.
  const title=el.getAttribute('title')||el.dataset.vatraHint||'';
  if(el.hasAttribute('title')){
   el.dataset.vatraHint=title;
   el.removeAttribute('title');
   if(!el.hasAttribute('aria-label')&&/^(BUTTON|A)$/.test(el.tagName)&&!(el.textContent||'').trim())el.setAttribute('aria-label',title);
  }
  const label=(el.dataset.vatraHint||'').trim();
  const visible=(el.textContent||'').trim().replace(/\s+/g,' ');
  if(!label||el.closest('.sidebar nav')||label===visible){reset();return;}
  if(active===el&&!tip.hidden)return;
  reset();active=el;
  timer=setTimeout(()=>{
   if(active!==el||!el.isConnected)return;
   tip.textContent=label;tip.hidden=false;
   position(el);
   tip.classList.add('is-visible');
   if(keyboard&&!el.hasAttribute('aria-describedby'))el.setAttribute('aria-describedby',tip.id);
  },keyboard?0:180);
 }
 document.addEventListener('mouseover',event=>{
  if(matchMedia('(hover: hover)').matches)show(event.target);
 },true);
 document.addEventListener('mouseout',event=>{
  if(active&&event.relatedTarget instanceof Node&&active.contains(event.relatedTarget))return;
  reset();
 },true);
 document.addEventListener('focusin',event=>show(event.target,true),true);
 document.addEventListener('focusout',reset,true);
 document.addEventListener('pointerdown',reset,true);
 window.addEventListener('scroll',reset,true);
 window.addEventListener('resize',reset,{passive:true});
 window.addEventListener('pagehide',reset);
})();
