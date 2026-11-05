(function(){
  if(window.__vatraMediaViewerLoaded)return;
  window.__vatraMediaViewerLoaded=true;
  function openViewer(src,caption){
    if(!src||src==='none')return;
    let dialog=document.getElementById('imageLightbox');
    if(!dialog){
      dialog=document.createElement('dialog');
      dialog.id='imageLightbox';
      dialog.setAttribute('aria-label','Перегляд зображення');
      dialog.innerHTML='<div class="lightbox-inner"><button type="button" class="lightbox-close" aria-label="Закрити">×</button><img alt="Зображення на весь екран"><p class="lightbox-caption"></p></div>';
      document.body.append(dialog);
      dialog.querySelector('.lightbox-close').addEventListener('click',()=>dialog.close());
      dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
      dialog.addEventListener('close',()=>{dialog.querySelector('img').removeAttribute('src');});
      document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.open)dialog.close();});
    }
    const img=dialog.querySelector('img');
    img.src=src;
    dialog.querySelector('.lightbox-caption').textContent=caption||'';
    if(!dialog.open)dialog.showModal();
  }
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-view-profile],[data-avatar-viewer],[data-open-photo],[data-open-profile-gallery],.comment-author-avatar,.comment-avatar,.profile-gallery-open'))return;
    const img=e.target.closest('img.post-image');
    if(img&&img.src){e.preventDefault();openViewer(img.currentSrc||img.src,img.alt||'');return;}
    const surface=e.target.closest('.avatar,.settings-avatar,.profile-cover,.cover-settings-preview');
    if(!surface)return;
    const bg=getComputedStyle(surface).backgroundImage;
    const match=bg.match(/url\(["']?(.*?)["']?\)/);
    if(match&&match[1]&&match[1]!=='none')openViewer(match[1],surface.getAttribute('aria-label')||'');
  });
})();