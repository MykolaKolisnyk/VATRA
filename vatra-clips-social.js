// VATRA Clips social controls. Single shared handler for the video feed, no duplicate post logic.
export function mountVatraClipSocial({root,client,userId,records,icon,escape,notify,profileFor,toggleFollow,isFollowing}){
 if(!root||!client||!userId)return {activate(){},destroy(){}};
 const cards=[...root.querySelectorAll('[data-vatra-clip]')];
 const byId=new Map(records.map(record=>[String(record.id),record]));
 const loaded=new Map(),pending=new Set();
 let destroyed=false,activeId='';
 const dialog=root.parentElement.querySelector('#vatraClipCommentsDialog');
 const list=dialog?.querySelector('[data-vatra-clip-comments-list]');
 const commentForm=dialog?.querySelector('[data-vatra-clip-comment-form]');
 const title=dialog?.querySelector('[data-vatra-clip-comments-title]');
 const statuses=dialog?.querySelector('[data-vatra-clip-comment-status]');
 const allowed=id=>!destroyed&&byId.has(id)&&cards.some(card=>card.dataset.vatraClip===id);
 const findCard=id=>cards.find(card=>card.dataset.vatraClip===id);
 const clipUrl=id=>{
  const url=new URL(window.location.href);
  url.searchParams.set('clip',id);url.hash='';
  return url.href;
 };
 const reportError=error=>{
  const message=String(error?.message||'Невідома помилка');
  if(/relation .* does not exist|schema cache|not found|permission denied/i.test(message))notify('Функції кліпів ще налаштовуються. Спробуйте пізніше.');
  else notify(message.slice(0,190));
 };
 const ask=async query=>{const {data,error,count}=await query;if(error)throw error;return {data,count};};
 async function loadSummary(id,{force=false}={}){
  if(!allowed(id))return;
  const recent=loaded.get(id);
  if(!force&&recent&&Date.now()-recent.time<30000)return;
  if(pending.has('stats:'+id))return;
  pending.add('stats:'+id);
  try{
   const results=await Promise.all([
    ask(client.from('vatra_clip_likes').select('clip_id',{count:'exact',head:true}).eq('clip_id',id)),
    ask(client.from('vatra_clip_comments').select('id',{count:'exact',head:true}).eq('clip_id',id)),
    ask(client.from('vatra_clip_shares').select('clip_id',{count:'exact',head:true}).eq('clip_id',id)),
    ask(client.from('vatra_clip_likes').select('clip_id').eq('clip_id',id).eq('user_id',userId).maybeSingle()),
    ask(client.from('vatra_clip_bookmarks').select('clip_id').eq('clip_id',id).eq('user_id',userId).maybeSingle())
   ]);
   if(!allowed(id))return;
   const social={likes:results[0].count||0,comments:results[1].count||0,shares:results[2].count||0,liked:!!results[3].data,saved:!!results[4].data,time:Date.now()};
   loaded.set(id,social);
   const card=findCard(id);
   for(const [kind,num] of [['like',social.likes],['comment',social.comments],['share',social.shares]]){
    const el=card?.querySelector('[data-vatra-clip-'+kind+'] .vatra-clip-count');
    if(el)el.textContent=Intl.NumberFormat('uk-UA',{notation:'compact',maximumFractionDigits:1}).format(num);
   }
   for(const [kind,active] of [['like',social.liked],['save',social.saved]]){
    const button=card?.querySelector('[data-vatra-clip-'+kind+']');
    button?.classList.toggle('is-selected',active);
    button?.setAttribute('aria-pressed',String(active));
   }
  }catch(error){console.warn('[VATRA clips] social stats unavailable:',error?.message||error);}
  finally{pending.delete('stats:'+id);}
 }
 async function toggle(kind,id){
  if(!allowed(id)||pending.has(kind+':'+id))return;
  pending.add(kind+':'+id);
  const button=findCard(id)?.querySelector('[data-vatra-clip-'+kind+']');
  if(button)button.disabled=true;
  try{
   const table=kind==='like'?'vatra_clip_likes':'vatra_clip_bookmarks';
   const social=loaded.get(id)||{};
   const was=kind==='like'?social.liked:social.saved;
   if(was)await ask(client.from(table).delete().eq('clip_id',id).eq('user_id',userId));
   else await ask(client.from(table).insert({clip_id:id,user_id:userId}));
   await loadSummary(id,{force:true});
  }catch(error){reportError(error);}
  finally{pending.delete(kind+':'+id);if(button)button.disabled=false;}
 }
 async function share(id){
  if(!allowed(id)||pending.has('share:'+id))return;
  pending.add('share:'+id);
  try{
   const url=clipUrl(id);
   if(navigator.share){
    await navigator.share({title:'Кліп ВАТРИ',url});
   }else if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(url);notify('Посилання на кліп скопійовано.');
   }else{
    window.prompt('Скопіюйте посилання на кліп',url);
    return;
   }
   const {error}=await client.from('vatra_clip_shares').insert({clip_id:id,user_id:userId});
   if(error&&error.code!=='23505')throw error;
   await loadSummary(id,{force:true});
  }catch(error){if(error?.name!=='AbortError')reportError(error);}
  finally{pending.delete('share:'+id);}
 }
 const renderComment=c=>{
  const profile=profileFor(c.user_id)||{};
  const mine=c.user_id===userId;
  const owner=byId.get(activeId)?.authorUid===userId;
  const name=escape(profile.name||'Користувач ВАТРИ');
  const body=escape(String(c.body||''));
  const when=new Date(c.created_at).toLocaleString('uk-UA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  return '<article class="vatra-clip-comment" data-vatra-clip-comment="'+escape(c.id)+'">'+
   '<div><b>'+name+'</b><time>'+escape(when)+'</time></div><p>'+body+'</p>'+
   ((mine||owner)?'<button type="button" data-vatra-clip-comment-delete="'+escape(c.id)+'">Видалити</button>':'')+'</article>';
 };
 async function loadComments(){
  if(!allowed(activeId)||!list)return;
  list.textContent='Завантажуємо коментарі…';
  try{
   const {data}=await ask(client.from('vatra_clip_comments').select('id,clip_id,user_id,body,created_at').eq('clip_id',activeId).order('created_at',{ascending:false}).limit(100));
   if(!dialog.open||destroyed)return;
   list.innerHTML=data?.length?data.map(renderComment).join(''):'<p class="vatra-clip-comments-empty">Поки немає коментарів. Напишіть перший.</p>';
  }catch(error){list.textContent='Не вдалося завантажити коментарі.';reportError(error);}
 }
 function openComments(id){
  if(!allowed(id)||!dialog)return;
  activeId=id;
  findCard(id)?.querySelector('video')?.pause();
  if(title)title.textContent='Коментарі до кліпу';
  if(statuses)statuses.textContent='';
  dialog.showModal();void loadComments();
 }
 async function sendComment(event){
  event.preventDefault();if(!allowed(activeId))return;
  const input=commentForm.querySelector('textarea');
  const body=input.value.trim();if(!body||body.length>800){if(statuses)statuses.textContent='Введіть коментар до 800 символів.';return;}
  const button=commentForm.querySelector('button[type=submit]');button.disabled=true;
  try{
   await ask(client.from('vatra_clip_comments').insert({clip_id:activeId,user_id:userId,body}));
   input.value='';if(statuses)statuses.textContent='Коментар опубліковано.';
   await loadComments();await loadSummary(activeId,{force:true});
  }catch(error){if(statuses)statuses.textContent=String(error.message||'Помилка збереження.');reportError(error);}
  finally{button.disabled=false;}
 }
 async function deleteComment(id){
  if(!allowed(activeId))return;
  try{
   await ask(client.from('vatra_clip_comments').delete().eq('id',id).eq('clip_id',activeId));
   await loadComments();await loadSummary(activeId,{force:true});
  }catch(error){reportError(error);}
 }
 async function click(event){
  const action=event.target.closest('[data-vatra-clip-like],[data-vatra-clip-comment],[data-vatra-clip-save],[data-vatra-clip-share],[data-vatra-clip-follow]');
  if(!action||!root.contains(action))return;
  const card=action.closest('[data-vatra-clip]');
  const id=card?.dataset.vatraClip||'';
  if(!allowed(id))return;
  event.preventDefault();event.stopPropagation();
  if(action.hasAttribute('data-vatra-clip-like'))return void toggle('like',id);
  if(action.hasAttribute('data-vatra-clip-save'))return void toggle('save',id);
  if(action.hasAttribute('data-vatra-clip-comment'))return openComments(id);
  if(action.hasAttribute('data-vatra-clip-share'))return void share(id);
  const author=byId.get(id)?.authorUid;
  if(!author||author===userId)return;
  action.disabled=true;
  try{
   await toggleFollow(author);
   root.querySelectorAll('[data-vatra-clip-follow]').forEach(button=>{
    const related=byId.get(button.closest('[data-vatra-clip]')?.dataset.vatraClip||'');
    if(related?.authorUid!==author)return;
    const following=isFollowing(author);
    button.textContent=following?'Відписатися':'+ Підписатися';
    button.setAttribute('aria-pressed',String(following));
   });
  }catch(error){reportError(error);}
  finally{action.disabled=false;}
 }
 const close=event=>{if(event.target.closest('[data-vatra-clip-comments-close]'))dialog.close();};
 const deleteClick=event=>{
  const button=event.target.closest('[data-vatra-clip-comment-delete]');
  if(button)void deleteComment(button.dataset.vatraClipCommentDelete);
 };
 root.addEventListener('click',click);
 dialog?.addEventListener('click',close);
 list?.addEventListener('click',deleteClick);
 commentForm?.addEventListener('submit',sendComment);
 dialog?.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 return {
  activate(id){if(allowed(id))void loadSummary(id);},
  destroy(){
   destroyed=true;loaded.clear();
   root.removeEventListener('click',click);
   dialog?.removeEventListener('click',close);
   list?.removeEventListener('click',deleteClick);
   commentForm?.removeEventListener('submit',sendComment);
   if(dialog?.open)dialog.close();
  }
 };
}
