/* VATRA: shared controls, URLs, public galleries, share dialog. */
import {initializeApp,getAuth,getDatabase,ref,get,set,push,createPost} from './vatra-backend.js?v=20261031-4';
const auth=getAuth(initializeApp()),db=getDatabase(initializeApp()),$=s=>document.querySelector(s);
const x='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const arrow=d=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(d==='prev'?'m15 5-7 7 7 7':'m9 5 7 7-7 7')+'" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentGallery=null,restoring=false,menu=null;
const titleMap={feed:'Новини',profile:'Мій профіль',friends:'Друзі',photos:'Фотографії',groups:'Спільноти',settings:'Налаштування',messages:'Месенджер',notifications:'Сповіщення',saved:'Збережене',explore:'Пошук',music:'Музика',myVideos:'Відео',communityMembers:'Учасники спільноти',postDetail:'Допис',adminCenter:'Адмінпанель ВАТРИ',myReports:'Мої скарги'};
const route=i=>i.page==='publicProfile'?'#/profile/'+encodeURIComponent(i.id):i.page==='publicPhotos'?'#/profile/'+encodeURIComponent(i.id)+'/photos':i.page==='communitySettings'?'#/community/'+encodeURIComponent(i.id)+'/settings':i.page==='communityMembers'?'#/community/'+encodeURIComponent(i.id)+'/members':i.page==='groups'&&i.id?'#/community/'+encodeURIComponent(i.id):i.page==='adminCenter'?'#/admin':i.page==='myReports'?'#/my-reports':i.page==='postDetail'?'#post-'+encodeURIComponent(i.id):'#/'+encodeURIComponent(i.page||'feed');
window.vatraRouteChanged=i=>{
 if(!i?.page)return;
 const name=i.page==='publicProfile'?$('.vatra-profile-public-layout h2')?.textContent:i.page==='groups'&&i.id?$('.vatra-group-heading h2')?.textContent:i.page==='publicPhotos'?'Фотографії користувача':titleMap[i.page]||'ВАТРА';
 document.title=(name||'ВАТРА')+' | ВАТРА';
 const hash=route(i);
 if(!restoring&&location.hash!==hash)history.pushState({vatra:true},'',location.pathname+location.search+hash);
};
function backToRoute(){
 const r=window.vatraRouter;if(!r)return false;
 const profile=location.hash.match(/^#\/profile\/([^/]+)(\/photos)?$/),group=location.hash.match(/^#\/community\/([^/]+)(\/(?:settings|members))?$/),post=location.hash.match(/^#post-(.+)$/);
 restoring=true;
 try{
  if(location.hash==='#/verification'){window.vatraVerificationGuide?.(true);}
  else if(location.hash==='#/admin'){void window.vatraOpenAdminCenter?.();}
  else if(location.hash==='#/my-reports'){void window.vatraOpenMyReports?.();}
  else if(post){void r.openPost(decodeURIComponent(post[1]));}
  else if(profile){r.renderPublicProfile(decodeURIComponent(profile[1]));if(profile[2]){const b=$('[data-vatra-open-public-photos]');if(b)openGallery(b,true);}}
  else if(group){const id=decodeURIComponent(group[1]);if(group[2]==='/settings')r.renderGroupSettings(id);else if(group[2]==='/members')r.renderGroupMembersPage(id);else r.renderGroupDetails(id);}
  else if(location.hash.startsWith('#/'))r.goPage(decodeURIComponent(location.hash.substring(2))||'feed');
 }finally{restoring=false;}
 return true;
}
window.addEventListener('popstate',backToRoute);
window.addEventListener('hashchange',backToRoute);
if(location.hash.startsWith('#/')||location.hash.startsWith('#post-')){let n=0;const original=location.hash;const timer=setInterval(()=>{if(backToRoute()||n++>22)clearInterval(timer);},400);setTimeout(()=>{if(location.hash===original)backToRoute();},2500);}
function upgrade(){
 document.querySelectorAll('.vatra-post-photo-viewer,.vatra-avatar-viewer').forEach(d=>{
  d.querySelectorAll('.vatra-viewer-close,.vatra-avatar-viewer-close').forEach(b=>{if(b.dataset.unified)return;b.innerHTML=x;b.dataset.unified='1';});
  d.querySelectorAll('.vatra-media-viewer-step,.vatra-avatar-viewer-nav').forEach(b=>{if(b.dataset.unified)return;b.innerHTML=arrow(b.classList.contains('prev')?'prev':'next');b.dataset.unified='1';});
 });
 document.querySelectorAll('button:not([data-unified])').forEach(b=>{
  if(b.dataset.unified||b.querySelector('svg')||!['×','✕'].includes(b.textContent.trim()))return;
  b.innerHTML=x;b.dataset.unified='1';b.classList.add('vatra-svg-close');
 });
}
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;upgrade();});}).observe(document.body,{childList:true,subtree:true});upgrade();
function openGallery(b,historical=false){
 let urls=[];try{urls=JSON.parse(b.dataset.photoUrls||'[]');}catch{}
 if(!Array.isArray(urls)||!urls.length)return;
 const uid=b.dataset.vatraOpenPublicPhotos||b.dataset.openProfileGallery;
 if(!uid)return;currentGallery={uid,urls};
 const name=$('.vatra-profile-public-layout h2')?.textContent||'Користувача';
 $('#feed').innerHTML='<section class="vatra-profile-card vatra-public-photos-page"><header class="vatra-public-photos-head"><h2>Фотографії · '+esc(name)+'</h2><button type="button" class="pill" data-gallery-back>← До профілю</button></header><div class="vatra-public-photos-grid">'+urls.map((u,i)=>'<button type="button" data-gallery-photo="'+i+'" aria-label="Фото '+(i+1)+'"><img loading="lazy" src="'+esc(u)+'" alt="Фото '+(i+1)+'"></button>').join('')+'</div></section>';
 if(historical)document.title='Фотографії користувача | ВАТРА';else window.vatraRouteChanged({page:'publicPhotos',id:uid});
 window.scrollTo(0,0);
}
document.addEventListener('click',e=>{
 const gallery=e.target.closest('[data-vatra-open-public-photos]');
 if(gallery){e.preventDefault();e.stopImmediatePropagation();openGallery(gallery);return;}
 if(e.target.closest('[data-gallery-back]')){e.stopImmediatePropagation();const uid=currentGallery?.uid;currentGallery=null;if(uid)window.vatraRouter?.renderPublicProfile(uid);return;}
 const photo=e.target.closest('[data-gallery-photo]');
 if(photo&&currentGallery){e.preventDefault();e.stopImmediatePropagation();window.vatraRouter?.openAvatarViewer?.(currentGallery.uid,currentGallery.urls,Number(photo.dataset.galleryPhoto));}
},true);
function hashForTarget(el){
 const a=el.closest('[data-view-profile]');if(a)return route({page:'publicProfile',id:a.dataset.viewProfile});
 const g=el.closest('[data-open-group]');if(g)return route({page:'groups',id:g.dataset.openGroup});
 const m=el.closest('[data-manage-group]');if(m)return route({page:'communitySettings',id:m.dataset.manageGroup});
 const post=el.closest('[data-open-photo],[data-share]');if(post)return route({page:'postDetail',id:post.dataset.openPhoto||post.dataset.share});
 const p=el.closest('[data-page]');if(p)return route({page:p.dataset.page});
 const ph=el.closest('[data-vatra-open-public-photos]');if(ph)return route({page:'publicPhotos',id:ph.dataset.vatraOpenPublicPhotos});
 return '';
}
function openTab(hash){const u=new URL(location.href);u.hash=hash;window.open(u.toString(),'_blank','noopener,noreferrer');}
document.addEventListener('auxclick',e=>{const h=hashForTarget(e.target);if(e.button!==1||!h)return;e.preventDefault();e.stopImmediatePropagation();openTab(h);},true);
document.addEventListener('click',e=>{if(!(e.ctrlKey||e.metaKey||e.shiftKey))return;const h=hashForTarget(e.target);if(!h)return;e.preventDefault();e.stopImmediatePropagation();openTab(h);},true);
document.addEventListener('contextmenu',e=>{
 const h=hashForTarget(e.target);if(!h)return;e.preventDefault();menu?.remove();menu=document.createElement('div');
 menu.className='vatra-route-menu';menu.style.left=Math.max(8,Math.min(innerWidth-235,e.clientX))+'px';menu.style.top=Math.max(8,Math.min(innerHeight-105,e.clientY))+'px';
 menu.innerHTML='<button type="button" data-action="tab">Відкрити в новій вкладці</button><button type="button" data-action="copy">Копіювати посилання</button>';
 menu.onclick=async ev=>{const action=ev.target.closest('button')?.dataset.action;if(action==='tab')openTab(h);if(action==='copy'){const u=new URL(location.href);u.hash=h;try{await navigator.clipboard.writeText(u.toString());}catch{}}menu?.remove();menu=null;};document.body.append(menu);
},true);
document.addEventListener('click',e=>{if(menu&&!e.target.closest('.vatra-route-menu')){menu.remove();menu=null;}},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'){menu?.remove();menu=null;}});
async function read(path){return (await get(ref(db,path))).val()||{};}
window.vatraOpenShareDialog=async postId=>{
 const user=auth.currentUser;if(!postId)return;if(!user){$('#authButton')?.click();return;}
 const uid=user.uid;
 let profile={},friends={},profiles={},groups={},admins={},moderators={};
 try{[profile,friends,profiles,groups,admins,moderators]=await Promise.all([read('users/'+uid),read('friends/'+uid),read('publicProfiles'),read('groups'),read('groupAdmins'),read('groupModerators')]);}
 catch(e){console.warn('Share choices unavailable',e);}
 const people=Object.keys(friends).filter(id=>friends[id]&&profiles[id]).map(id=>({id,name:profiles[id].name||'Користувач'}));
 const allowed=Object.entries(groups).filter(([id,g])=>g&&(g.ownerUid===uid||admins[id]?.[uid]||(moderators[id]?.[uid]&&g.moderatorsCanPost===true))).map(([id,g])=>({id,name:g.name||'Спільнота'}));
 const url=new URL(location.href);url.hash='#post-'+encodeURIComponent(postId);const href=url.toString();
 const options=(arr,prompt)=>'<option value="">'+prompt+'</option>'+arr.map(o=>'<option value="'+esc(o.id)+'">'+esc(o.name)+'</option>').join('');
 const dialog=document.createElement('dialog');dialog.className='vatra-share-dialog';
 dialog.innerHTML='<header><h2>Поділитися у ВАТРІ</h2><button type="button" aria-label="Закрити" data-share-close>'+x+'</button></header><form><fieldset><legend>Куди поділитися?</legend><label class="vatra-share-choice"><input name="dest" type="radio" value="profile" checked> На своїй сторінці</label><label class="vatra-share-choice"><input name="dest" type="radio" value="friend"'+(!people.length?' disabled':'')+'> Другу в повідомленні</label><label class="vatra-share-choice"><input name="dest" type="radio" value="group"'+(!allowed.length?' disabled':'')+'> У спільноті</label></fieldset><label data-share-profile>Хто побачить?<select name="visibility"><option value="public">Усі</option><option value="friends">Тільки друзі</option><option value="private">Тільки я</option></select></label><label data-share-friend hidden>Оберіть друга<select name="friend">'+options(people,'Оберіть друга')+'</select></label><label data-share-group hidden>Оберіть спільноту<select name="group">'+options(allowed,'Оберіть спільноту')+'</select></label><label>Ваш коментар<textarea name="caption" rows="3" maxlength="800" placeholder="Необов’язково…"></textarea></label><p><a href="'+esc(href)+'" rel="noopener noreferrer" target="_blank">Посилання на оригінальний допис</a></p><p class="vatra-share-error" role="alert" hidden></p><div class="vatra-share-actions"><button type="button" class="pill" data-share-copy>Копіювати посилання</button><button type="submit" class="primary">Поділитися</button></div></form>';
 document.body.append(dialog);dialog.showModal();
 const form=dialog.querySelector('form'),mode=()=>form.querySelector('[name=dest]:checked').value;
 dialog.addEventListener('close',()=>dialog.remove());
 dialog.addEventListener('click',async e=>{if(e.target===dialog||e.target.closest('[data-share-close]'))dialog.close();if(e.target.closest('[data-share-copy]')){await navigator.clipboard.writeText(href).catch(()=>{});e.target.textContent='Скопійовано';}});
 form.onchange=()=>{dialog.querySelector('[data-share-profile]').hidden=mode()!=='profile';dialog.querySelector('[data-share-friend]').hidden=mode()!=='friend';dialog.querySelector('[data-share-group]').hidden=mode()!=='group';};
 form.onsubmit=async e=>{
  e.preventDefault();const btn=form.querySelector('[type=submit]'),err=form.querySelector('.vatra-share-error');err.hidden=true;btn.disabled=true;btn.textContent='Публікуємо…';
  try{
   const to=mode(),comment=form.elements.caption.value.trim().slice(0,800),text=(comment?comment+'\n\n':'')+'Поширено у ВАТРІ: '+href;
   if(to==='friend'){
    const friend=form.elements.friend.value;if(!friends[friend])throw Error('Оберіть друга.');
    dialog.close();await window.vatraRouter?.startChatWith(friend);
    let n=0;const poll=setInterval(()=>{const input=$('#sendMessageForm input[name=message]');if(input){clearInterval(poll);input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}else if(++n>25)clearInterval(poll);},120);return;
   }
   const now=Date.now(),entry={authorUid:uid,authorName:profile.name||user.displayName||'Користувач ВАТРИ',authorHandle:profile.handle||'user',authorAvatar:profile.avatarUrl||'',text,sharedPostId:postId,sharedPostUrl:href,createdAt:now,updatedAt:now};
   if(to==='group'){
    const gid=form.elements.group.value,g=groups[gid],asGroup=g&&(g.ownerUid===uid||admins[gid]?.[uid]);if(!g||(!asGroup&&!(moderators[gid]?.[uid]&&g.moderatorsCanPost===true)))throw Error('Немає дозволу публікувати у спільноті.');
    entry.groupId=gid;entry.authorType=asGroup?'group':'user';entry.visibility='public';
    if(asGroup){entry.authorName=g.name;entry.authorAvatar=g.avatarUrl||'';}
    await set(push(ref(db,'groupPosts/'+gid)),entry);
   }else{entry.visibility=form.elements.visibility.value;await createPost(push(ref(db,'posts')),entry);}
   await set(ref(db,'postShares/'+postId+'/'+uid),{createdAt:now,sharedTo:to});
   const gid=form.elements.group.value;dialog.close();if(to==='group')window.vatraRouter?.renderGroupDetails(gid);else window.vatraRouter?.goPage('profile');
  }catch(error){err.textContent=error.message||'Не вдалося поділитися.';err.hidden=false;}
  finally{btn.disabled=false;btn.textContent='Поділитися';}
 };
};