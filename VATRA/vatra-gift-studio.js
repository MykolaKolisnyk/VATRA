/* VATRA — interactive gift studio, self-hosted JavaScript + Canvas 2D.
   Drawing is composited with original shape or uploaded art before upload.
   No remote images, AI services or font endpoints. */
(function(){
 'use strict';
 const ico={
  brush:'<path d="M14 5l5 5M5 16c1-2 4-3 6-1 2 2 0 5-2 6-2 1-6 0-6 0s-1-4 2-5ZM10 15 19 5a2 2 0 0 0-3-3L7 12"/>',
  eraser:'<path d="m20 14-7-7a3 3 0 0 0-4 0l-6 6a3 3 0 0 0 0 4l4 4h12M9 19l8-8"/>',
  line:'<path d="M5 19 19 5"/><circle cx="5" cy="19" r="1"/><circle cx="19" cy="5" r="1"/>',
  rect:'<rect x="4" y="4" width="16" height="16" rx="1.5"/>',
  ellipse:'<ellipse cx="12" cy="12" rx="9" ry="6.5"/>',
  text:'<path d="M4 6h16M12 6v14M7 20h10"/>',
  stamp:'<path d="m12 2 3.2 6.7 7.3 1.1-5.3 5.2 1.2 7.1-6.4-3.4-6.4 3.4 1.2-7.1-5.3-5.2 7.3-1.1Z"/>',
  undo:'<path d="M9 10H4V5M4 10a9 9 0 1 1 1.6 8.2"/>',
  redo:'<path d="M15 10h5V5m0 5A9 9 0 1 0 18.4 18.2"/>',
  trash:'<path d="M4 7h16M10 3h4m-7 4 1 14h8l1-14M10 11v6m4-6v6"/>'
 };
 const svg=name=>'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ico[name]+'</svg>';
 const tools=[['brush','Пензель'],['eraser','Гумка'],['line','Лінія'],['rect','Прямокутник'],['ellipse','Еліпс'],['text','Текст'],['stamp','Наліпка']];
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 let active=null;
 function init(){
  const base=document.querySelector('#vatraCreatorCanvas');
  const form=base?.closest('form');
  const wrap=base?.closest('.vatra-creator-art-preview');
  if(!base||!form||!wrap||form.dataset.vatraStudioReady)return;
  form.dataset.vatraStudioReady='1';
  const state={mode:'brush',color:'#155cff',size:13,opacity:1,fill:false,shape:'star',sticker:'heart',
    history:[],redo:[],active:null,pointer:null,base,form,wrap};
  active=state;
  const ink=document.createElement('canvas');
  ink.id='vatraCreatorInk';
  ink.width=ink.height=512;
  ink.className='vatra-studio-ink';
  ink.tabIndex=0;
  ink.setAttribute('aria-label','Полотно редактора подарунка. Малюйте мишею або пальцем.');
  wrap.append(ink);state.ink=ink;
  const studio=document.createElement('section');
  studio.className='vatra-gift-studio-panel';
  studio.innerHTML='<div class="vatra-gift-studio-head"><div><h3>Майстерня ВАТРИ</h3><p>Малюйте пензлем, додавайте форми, написи та наліпки.</p></div><small>512 × 512</small></div>'+
    '<div class="vatra-studio-tools" role="toolbar" aria-label="Інструменти малювання">'+
    tools.map(([name,title])=>'<button type="button" class="'+(name==='brush'?'active':'')+'" data-studio-tool="'+name+'" aria-label="'+title+'" title="'+title+'" aria-pressed="'+(name==='brush')+'">'+svg(name)+'<span>'+title+'</span></button>').join('')+'</div>'+
    '<div class="vatra-studio-settings"><label>Колір<input type="color" data-studio-color value="'+state.color+'"></label>'+
    '<label>Розмір <output data-studio-size-out>13</output><input data-studio-size type="range" min="2" max="70" value="13"></label>'+
    '<label>Непрозорість <output data-studio-opacity-out>100%</output><input data-studio-opacity type="range" min="10" max="100" value="100" step="5"></label></div>'+
    '<div class="vatra-studio-extra"><label class="vatra-studio-fill"><input type="checkbox" data-studio-fill> Заливка фігур</label>'+
    '<label class="vatra-studio-text-label">Ваш напис<input type="text" data-studio-text maxlength="45" placeholder="Введіть напис і торкніться полотна"></label>'+
    '<label class="vatra-studio-sticker-label">Наліпка<select data-studio-sticker><option value="heart">Серце</option><option value="star">Зірка</option><option value="spark">Іскра</option></select></label></div>'+
    '<div class="vatra-studio-palette" aria-label="Готові кольори">'+
    ['#155cff','#e65a86','#f1b947','#5db68a','#8b70da','#f4f8ff','#253752','#ffffff']
       .map(col=>'<button type="button" data-studio-swatch="'+col+'" style="--swatch:'+col+'" aria-label="Обрати колір '+col+'"></button>').join('')+'</div>'+
    '<div class="vatra-studio-history"><button type="button" data-studio-undo>'+svg('undo')+'Скасувати</button>'+
    '<button type="button" data-studio-redo>'+svg('redo')+'Повторити</button>'+
    '<button type="button" data-studio-clear>'+svg('trash')+'Очистити малюнок</button></div>'+
    '<p class="vatra-studio-note" data-studio-note role="status">Оберіть інструмент і малюйте прямо на подарунку. Фото з комп’ютера теж можна прикрасити.</p>';
  wrap.after(studio);state.studio=studio;
  const ctx=ink.getContext('2d');if(!ctx)return;
  const point=event=>{
   const r=ink.getBoundingClientRect();
   return {x:clamp((event.clientX-r.left)/r.width*512,0,512),y:clamp((event.clientY-r.top)/r.height*512,0,512)};
  };
  const message=str=>{const el=studio.querySelector('[data-studio-note]');if(el)el.textContent=str;};
  function stickerPath(ctx,shape,x,y,r){
   ctx.beginPath();
   if(shape==='heart'){
    ctx.moveTo(x,y+r*.75);
    ctx.bezierCurveTo(x-r*1.7,y-r*.2,x-r*.95,y-r*1.25,x,y-r*.52);
    ctx.bezierCurveTo(x+r*.95,y-r*1.25,x+r*1.7,y-r*.2,x,y+r*.75);
   }else if(shape==='star'){
    for(let i=0;i<10;i++){
     const angle=(i*Math.PI/5-Math.PI/2),rad=i%2?r*.43:r;
     const px=x+Math.cos(angle)*rad,py=y+Math.sin(angle)*rad;
     if(!i)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();
   }else{
    ctx.moveTo(x,y-r);
    ctx.lineTo(x+r*.27,y-r*.27);
    ctx.lineTo(x+r,y);
    ctx.lineTo(x+r*.27,y+r*.27);
    ctx.lineTo(x,y+r);
    ctx.lineTo(x-r*.27,y+r*.27);
    ctx.lineTo(x-r,y);
    ctx.lineTo(x-r*.27,y-r*.27);
    ctx.closePath();
   }
  }
  function drawOperation(op){
   ctx.save();
   ctx.globalAlpha=op.opacity;
   ctx.strokeStyle=op.color;ctx.fillStyle=op.color;
   ctx.lineWidth=op.size;ctx.lineJoin='round';ctx.lineCap='round';
   if(op.mode==='eraser')ctx.globalCompositeOperation='destination-out';
   const p=op.points||[],a=p[0]||{x:0,y:0},b=p[p.length-1]||a;
   if(['brush','eraser'].includes(op.mode)){
    if(p.length===1){ctx.beginPath();ctx.arc(a.x,a.y,op.size/2,0,Math.PI*2);ctx.fill();}
    else{ctx.beginPath();ctx.moveTo(a.x,a.y);
     for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);
     ctx.stroke();}
   }else if(op.mode==='line'){
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
   }else if(op.mode==='rect'){
    const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);
    if(op.fill)ctx.fillRect(x,y,w,h);else ctx.strokeRect(x,y,w,h);
   }else if(op.mode==='ellipse'){
    const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,rx=Math.max(1,Math.abs(a.x-b.x)/2),ry=Math.max(1,Math.abs(a.y-b.y)/2);
    ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
    if(op.fill)ctx.fill();else ctx.stroke();
   }else if(op.mode==='text'){
    const fontSize=clamp(op.size*2.4,18,116);
    ctx.textBaseline='middle';ctx.font='800 '+fontSize+'px "VATRA Onest",system-ui,sans-serif';
    ctx.textAlign='center';ctx.fillText(op.text||'',a.x,a.y,480);
   }else if(op.mode==='stamp'){
    stickerPath(ctx,op.sticker||'heart',a.x,a.y,op.size*1.65);
    ctx.fill();ctx.strokeStyle='rgba(32,55,90,.2)';ctx.lineWidth=2;ctx.stroke();
   }
   ctx.restore();
  }
  function redraw(extra=null){
   ctx.clearRect(0,0,512,512);
   for(const op of state.history)drawOperation(op);
   if(extra)drawOperation(extra);
   studio.querySelector('[data-studio-undo]').disabled=!state.history.length;
   studio.querySelector('[data-studio-redo]').disabled=!state.redo.length;
  }
  function commit(op){
   if(!op)return;
   state.history.push(op);
   if(state.history.length>180)state.history.shift();
   state.redo.length=0;redraw();
  }
  function mkOp(xy){
   return {mode:state.mode,color:state.color,size:state.size,opacity:state.opacity,fill:state.fill,
    sticker:state.sticker,points:[xy]};
  }
  ink.addEventListener('pointerdown',event=>{
   if(event.button!==0&&event.pointerType==='mouse')return;
   if(event.target!==ink)return;
   const a=point(event);
   if(state.mode==='text'){
    const value=studio.querySelector('[data-studio-text]').value.trim();
    if(!value){message('Спочатку введіть напис у поле «Ваш напис».');studio.querySelector('[data-studio-text]').focus();return;}
    const op=mkOp(a);op.text=value;commit(op);return;
   }
   if(state.mode==='stamp'){const op=mkOp(a);commit(op);return;}
   state.pointer=event.pointerId;state.active=mkOp(a);
   ink.setPointerCapture(event.pointerId);event.preventDefault();
  });
  ink.addEventListener('pointermove',event=>{
   if(state.pointer!==event.pointerId||!state.active)return;
   const b=point(event);
   if(['brush','eraser'].includes(state.mode)){state.active.points.push(b);}
   else state.active.points=[state.active.points[0],b];
   redraw(state.active);event.preventDefault();
  });
  function done(event){
   if(state.pointer!==event.pointerId||!state.active)return;
   const op=state.active;state.active=null;state.pointer=null;
   try{if(ink.hasPointerCapture(event.pointerId))ink.releasePointerCapture(event.pointerId);}catch{}
   commit(op);
  }
  ink.addEventListener('pointerup',done);
  ink.addEventListener('pointercancel',done);
  studio.addEventListener('click',event=>{
   const tool=event.target.closest('[data-studio-tool]');
   if(tool){
    state.mode=tool.dataset.studioTool;
    studio.querySelectorAll('[data-studio-tool]').forEach(b=>{
     const selected=b===tool;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));
    });message('Інструмент: '+tool.title+'. Малюйте на полотні.');return;
   }
   const swatch=event.target.closest('[data-studio-swatch]');
   if(swatch){
    state.color=swatch.dataset.studioSwatch;
    studio.querySelector('[data-studio-color]').value=state.color;return;
   }
   if(event.target.closest('[data-studio-undo]')){
    if(state.history.length)state.redo.push(state.history.pop());redraw();return;
   }
   if(event.target.closest('[data-studio-redo]')){
    if(state.redo.length)state.history.push(state.redo.pop());redraw();return;
   }
   if(event.target.closest('[data-studio-clear]')){
    if(!state.history.length)return;
    state.redo=state.history.splice(0);
    redraw();message('Малюнок очищено. Можна повернути останню дію кнопкою «Повторити».');return;
   }
  });
  studio.addEventListener('input',event=>{
   const el=event.target;
   if(el.matches('[data-studio-color]'))state.color=el.value;
   if(el.matches('[data-studio-size]')){state.size=Number(el.value);studio.querySelector('[data-studio-size-out]').textContent=state.size;}
   if(el.matches('[data-studio-opacity]')){state.opacity=Number(el.value)/100;studio.querySelector('[data-studio-opacity-out]').textContent=el.value+'%';}
   if(el.matches('[data-studio-fill]'))state.fill=el.checked;
   if(el.matches('[data-studio-sticker]'))state.sticker=el.value;
  });
  redraw();
  window.vatraCreatorStudioExport=async function(file){
   if(!form.isConnected||active!==state)throw new Error('Майстерню змінено. Відкрийте редактор ще раз.');
   const output=document.createElement('canvas');output.width=output.height=512;
   const x=output.getContext('2d');if(!x)throw new Error('Браузер не підтримує збереження малюнка');
   if(file){
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2097152)throw new Error('PNG, JPEG або WebP до 2 МБ');
    const uploaded=document.querySelector('#vatraCreatorUploadedPreview');
    if(!uploaded||!uploaded.complete||!uploaded.naturalWidth||!uploaded.naturalHeight)throw new Error('Зображення ще не завантажилось');
    const scale=Math.min(512/uploaded.naturalWidth,512/uploaded.naturalHeight);
    const w=uploaded.naturalWidth*scale,h=uploaded.naturalHeight*scale;
    x.fillStyle='#fff';x.fillRect(0,0,512,512);
    x.drawImage(uploaded,(512-w)/2,(512-h)/2,w,h);
   }else x.drawImage(base,0,0,512,512);
   x.drawImage(ink,0,0,512,512);
   const blob=await new Promise((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(new Error('Неможливо створити PNG')),'image/png'));
   if(blob.size>2097152)throw new Error('Подарунок перевищує 2 МБ. Спробуйте менше деталей або інше зображення.');
   return blob;
  };
 }
 window.vatraCreatorStudioInit=init;
 requestAnimationFrame(()=>{if(document.querySelector('#vatraCreatorCanvas'))init();});
})();
