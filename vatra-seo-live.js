/* VATRA: metadata for in-app navigation. Crawler SEO comes from /people and /communities snapshots. */
(()=>{
 'use strict';
 const ORIGIN='https://mykolakolisnyk.github.io/VATRA/';
 const baseDescription='ВАТРА — українська соціальна мережа для спілкування, спільнот, друзів, відео, музики, фотографій та публікацій.';
 const clean=(text,max=170)=>String(text||'').replace(/\s+/g,' ').trim().slice(0,max);
 const setMeta=(attr,key,value)=>{
  let meta=document.head.querySelector('meta['+attr+'="'+key+'"]');
  if(!meta){meta=document.createElement('meta');meta.setAttribute(attr,key);document.head.append(meta);}
  meta.content=value;
 };
 let scheduled=false;
 function update(){
  scheduled=false;
  const page=document.body.dataset.page||'feed';
  const hash=decodeURIComponent(location.hash||'');
  const profileId=hash.match(/^#\/(?:u|profile)\/([^/]+)(?:\/|$)/i)?.[1]||'';
  const groupId=hash.match(/^#\/community\/([A-Za-z0-9_-]{8,128})(?:\/|$)/)?.[1]||'';
  const feed=document.querySelector('#feed');
  const restricted=!!feed?.querySelector('.vatra-suspended-page,.vatra-ban-load-error');
  let title='',description=baseDescription,url=location.origin+location.pathname,type='website',photo='';
  let schema=null;
  if(profileId&&['publicProfile','profile'].includes(page)&&feed?.querySelector('.vatra-profile-public-layout,.vatra-profile-layout')&&!restricted){
   const name=clean(feed.querySelector('.vatra-profile-name-line h2,.vatra-profile-title-row h2')?.textContent,88)||'Публічний профіль';
   title=name+' · ВАТРА';
   description=clean(feed.querySelector('.vatra-profile-bio,.profile-bio')?.textContent)||'Публічний профіль у ВАТРІ: дописи, друзі, фотографії та спілкування.';
   const img=feed.querySelector('.vatra-profile-avatar-open img')?.src||'';
   if(img.startsWith('https://'))photo=img;
   const displayedHandle=clean(feed.querySelector('.profile-handle')?.textContent,80).replace(/^@/,'');
   const canonicalHandle=window.vatraPublicHandle?.(profileId)||displayedHandle||profileId;
   url=ORIGIN+'people/'+encodeURIComponent(canonicalHandle)+'/';type='profile';
   schema={'@context':'https://schema.org','@type':'ProfilePage',name:title,url,description,mainEntity:{'@type':'Person',name}};
  }else if(groupId&&page==='groups'&&feed?.querySelector('.vatra-group-heading')&&!restricted){
   const name=clean(feed.querySelector('.vatra-group-heading h2')?.textContent,88)||'Спільнота';
   title=name+' · ВАТРА';
   description=clean(feed.querySelector('.vatra-group-description')?.textContent)||'Публічна спільнота ВАТРИ: дописи, спілкування й учасники.';
   const img=feed.querySelector('.vatra-group-heading img')?.src||'';
   if(img.startsWith('https://'))photo=img;
   url=ORIGIN+'communities/'+encodeURIComponent(groupId)+'/';
   schema={'@context':'https://schema.org','@type':'CollectionPage',name:title,url,description,mainEntity:{'@type':'Organization',name}};
  }else{
   const labels={profile:'Мій профіль',feed:'Новини',groups:'Спільноти',friends:'Друзі',messages:'Повідомлення',photos:'Фотографії',music:'Музика',settings:'Налаштування',saved:'Збережене',notifications:'Сповіщення'};
   const label=labels[page];
   if(label)title=label+' · ВАТРА';
  }
  if(title){
   document.title=title;
   setMeta('property','og:title',title);
   setMeta('name','twitter:title',title);
  }
  setMeta('name','description',description);
  setMeta('property','og:description',description);
  setMeta('name','twitter:description',description);
  setMeta('property','og:type',type);
  setMeta('property','og:url',url);
  if(photo){setMeta('property','og:image',photo);setMeta('name','twitter:image',photo);}
  const canonical=document.head.querySelector('link[rel="canonical"]');
  if(canonical)canonical.href=url;
  let json=document.getElementById('vatraLivePageSchema');
  if(schema){
   if(!json){json=document.createElement('script');json.type='application/ld+json';json.id='vatraLivePageSchema';document.head.append(json);}
   json.textContent=JSON.stringify(schema).replace(/</g,'\\u003c');
  }else if(json)json.remove();
 }
 function schedule(){
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(update);
 }
 function init(){
  schedule();
  window.addEventListener('hashchange',schedule);
  document.addEventListener('vatra:languagechange',schedule);
  const feed=document.getElementById('feed');
  if(feed)new MutationObserver(schedule).observe(feed,{childList:true,subtree:false});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
