/* VATRA composer controls: local drafts and two-stage publishing. */
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function setupPostComposer(api){
 const {modal,getUid,getPhotos,getUrls,getVideo,setVideo,addPhotos,resetPoll,toast,maxVideo,maxText}=api;
 const q=s=>modal.querySelector(s);
 let draftId=null,videoUrl=null;
 const key=()=> 'vatra-post-drafts-v1-'+(getUid()||'guest');
 const read=()=>{try{let a=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(a)?a.slice(0,10):[];}catch{return []}};
 const write=a=>{try{localStorage.setItem(key(),JSON.stringify(a.slice(0,10)));return true;}catch{toast('Чернетку не вдалося зберегти в браузері.');return false;}};
 const badge=()=>{const n=read().length;q('#composerDraftCount').textContent=n;q('#composerDraftCount').hidden=!n;};
 const dispose=()=>{if(videoUrl){URL.revokeObjectURL(videoUrl);videoUrl=null;}};
 function media(){
  const photos=getPhotos(),video=getVideo(),box=q('#composerVideoPreview');
  const has=photos.length>0||!!video;
  q('#composerDropZone').classList.toggle('has-media',has);
  q('#composerEmptyMedia').hidden=has;
  if(video){
   if(!videoUrl)videoUrl=URL.createObjectURL(video);
   box.hidden=false;
   box.innerHTML='<video controls muted playsinline preload="metadata" src="'+h(videoUrl)+'"></video><div class="vatra-compose-video-info"><span>▷ '+h(video.name||'Відео')+'</span><button type="button" id="composerRemoveVideo">Прибрати</button></div>';
  }else{dispose();box.hidden=true;box.innerHTML='';}
  q('#composerMediaCount').textContent=(photos.length?photos.length+' фото':'')+(video?(photos.length?' · ':'')+'1 відео':'')||'Медіафайлів немає';
 }
 function drafts(show){
  q('#composerDraftList').hidden=!show;q('#composerDrafts').setAttribute('aria-expanded',String(show));
  if(!show)return;
  const a=read();q('#composerDraftItems').innerHTML=a.length?a.map(d=>
   '<div class="vatra-compose-draft-item"><button type="button" data-composer-restore="'+h(d.id)+'"><b>'+h((d.text||'Без тексту').slice(0,95))+'</b><small>'+new Date(d.updated||Date.now()).toLocaleString('uk-UA')+'</small></button><button type="button" aria-label="Видалити чернетку" data-composer-delete="'+h(d.id)+'">×</button></div>').join(''):'<p class="vatra-compose-draft-empty">Чернеток поки немає.</p>';
 }
 function review(){
  const first=getUrls()[0],video=getVideo(),text=q('#postText').value.trim();
  q('#composerReview').innerHTML='<div class="vatra-compose-review-media">'+(first?'<img alt="Фото допису" src="'+h(first)+'">':video&&videoUrl?'<video muted playsinline preload="metadata" src="'+h(videoUrl)+'"></video>':'<span>▧</span>')+'</div><div class="vatra-compose-review-copy"><b>Ваш допис</b><p>'+h(text.slice(0,160)||(first||video?'Медіапублікація':'Текст або медіа ще не додано'))+'</p><small>'+(getPhotos().length?getPhotos().length+' фото':'')+(video?' · 1 відео':'')+'</small></div>';
 }
 function step(name){
  const settings=name==='settings';q('#composerEditStep').hidden=settings;q('#composerSettingsStep').hidden=!settings;
  q('#vatraComposeTitle').textContent=settings?'Публікація допису':'Новий допис';
  drafts(false);q('#composerMediaMenu').hidden=true;q('#composerMediaMenuTrigger').setAttribute('aria-expanded','false');
  if(settings)review();
  q('#composerSettingsStep .vatra-compose-step-scroll')?.scrollTo(0,0);
 }
 function saveDraft(){
  const options=q('#pollComposer').hidden?[]:[...q('#pollOptionFields').querySelectorAll('input')].map(x=>x.value.slice(0,80));
  const text=q('#postText').value.slice(0,maxText);
  if(!text.trim()&&!getPhotos().length&&!getVideo()&&!options.some(Boolean))return toast('Додайте текст, медіа або опитування.');
  const id=draftId||'draft-'+Date.now(),row={id,updated:Date.now(),text,visibility:q('#postVisibility').value,pollVisible:!q('#pollComposer').hidden,pollOptions:options};
  if(!write([row,...read().filter(x=>String(x.id)!==String(id))]))return;
  draftId=id;toast(getPhotos().length||getVideo()?'Чернетку тексту збережено. Фото й відео потрібно додати повторно.':'Чернетку збережено в цьому браузері.');modal.close();
 }
 function restore(id){
  const row=read().find(x=>String(x.id)===String(id));if(!row)return;
  draftId=row.id;q('#postText').value=String(row.text||'').slice(0,maxText);q('#postText').dispatchEvent(new Event('input',{bubbles:true}));
  q('#postVisibility').value=['public','friends','private'].includes(row.visibility)?row.visibility:'public';q('#postVisibility').dispatchEvent(new Event('change'));
  resetPoll();
  if(row.pollVisible){
   q('#pollComposer').hidden=false;q('#togglePoll').setAttribute('aria-expanded','true');
   const fields=q('#pollOptionFields');
   (Array.isArray(row.pollOptions)?row.pollOptions:[]).slice(0,6).forEach((value,i)=>{
    let input=fields.querySelectorAll('input')[i];if(!input){const label=document.createElement('label');label.className='poll-option-field';label.innerHTML='<span>'+(i+1)+'</span><input maxlength="80" aria-label="Варіант відповіді"><button type="button" data-remove-poll-option aria-label="Видалити варіант">×</button>';fields.append(label);input=label.querySelector('input');}input.value=String(value||'').slice(0,80);
   });
  }
  step('edit');toast('Чернетку відновлено. Медіафайли потрібно додати повторно.');
 }
 async function add(files){
  const pics=files.filter(x=>x.type?.startsWith('image/')),videos=files.filter(x=>x.type?.startsWith('video/'));
  if(pics.length)await addPhotos(pics);
  if(videos.length){if(videos.length>1)toast('Можна додати лише одне відео.');if(videos[0].size>maxVideo)toast('Відео має бути меншим за 50 МБ.');else{setVideo(videos[0]);dispose();}}
  if(!pics.length&&!videos.length)toast('Виберіть фото або відео.');
  media();
 }
 const zone=q('#composerDropZone');
 zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('is-dragging');});
 zone.addEventListener('dragleave',e=>{if(!zone.contains(e.relatedTarget))zone.classList.remove('is-dragging');});
 zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('is-dragging');add([...e.dataTransfer.files]);});
 q('#composerPickPhotos').addEventListener('click',()=>q('#composerMediaFiles').click());
 for(const id of ['#composerMediaFiles','#composerVideo'])q(id).addEventListener('change',e=>{const files=[...e.target.files];e.target.value='';if(files.length)add(files);});
 zone.addEventListener('click',e=>{if(!e.target.closest('button,input,video,.composer-photo-preview')&&e.target.closest('#composerEmptyMedia'))q('#composerMediaFiles').click();});
 q('#composerVideoPreview').addEventListener('click',e=>{if(e.target.closest('#composerRemoveVideo')){setVideo(null);media();}});
 q('#composerMediaMenuTrigger').addEventListener('click',()=>{const box=q('#composerMediaMenu'),open=box.hidden;box.hidden=!open;q('#composerMediaMenuTrigger').setAttribute('aria-expanded',String(open));});
 q('#composerMediaMenu').addEventListener('click',e=>{const b=e.target.closest('[data-composer-pick]');if(!b)return;q('#composerMediaMenu').hidden=true;q('#composerMediaMenuTrigger').setAttribute('aria-expanded','false');q(b.dataset.composerPick==='video'?'#composerVideo':'#modalPhoto').click();});
 q('#composerNext').addEventListener('click',()=>step('settings'));q('#composerBack').addEventListener('click',()=>step('edit'));
 q('#composerSaveDraft').addEventListener('click',saveDraft);
 q('#composerDrafts').addEventListener('click',()=>drafts(q('#composerDraftList').hidden));
 q('#composerDraftClose').addEventListener('click',()=>drafts(false));
 q('#composerDraftItems').addEventListener('click',e=>{
  const del=e.target.closest('[data-composer-delete]');if(del){write(read().filter(x=>String(x.id)!==del.dataset.composerDelete));badge();drafts(true);return;}
  const restoreButton=e.target.closest('[data-composer-restore]');if(restoreButton)restore(restoreButton.dataset.composerRestore);
 });
 modal.addEventListener('close',()=>{dispose();drafts(false);});
 return {
  onOpen(){draftId=null;dispose();badge();media();step('edit');},
  refreshMedia:media,
  onPublished(){if(draftId){write(read().filter(x=>String(x.id)!==String(draftId)));draftId=null;}dispose();}
 };
}
