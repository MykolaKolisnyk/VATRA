/* VATRA Photo Studio — canvas-based editor; no external services required. */
const PRESETS={
 original:{label:'Оригінал',css:'none'},
 vivid:{label:'Жвавий',css:'saturate(1.35) contrast(1.08)'},
 warm:{label:'Теплий',css:'sepia(.18) saturate(1.12)'},
 cool:{label:'Холодний',css:'hue-rotate(12deg) saturate(.91)'},
 mono:{label:'Моно',css:'grayscale(1) contrast(1.08)'},
 cinema:{label:'Кіно',css:'contrast(1.21) saturate(.86)'},
 soft:{label:'М’який',css:'brightness(1.07) saturate(.87)'},
 retro:{label:'Ретро',css:'sepia(.42) contrast(.93)'},
 noir:{label:'Нуар',css:'grayscale(1) contrast(1.4)'},
 dusk:{label:'Сутінки',css:'hue-rotate(-17deg) saturate(1.23) contrast(1.12)'}
};
const EMOJI=['💙','💛','🇺🇦','✨','🔥','⭐','💬','🎉','❤️','📸','🌿','☀️','🎮','🛡️','🚀','💫','😊','🙌','⚡','🌸'];
const STUDIO_TOOLS=[
 ['enhance','sparkles','Покращення'],['filters','sliders-horizontal','Фільтри'],
 ['crop','crop','Кадрування'],['adjust','sun','Колір'],
 ['text','type','Текст'],['brush','pencil','Пензель'],
 ['stickers','smile','Стікери'],['blur','aperture','Розмиття']
];
const STUDIO_ICONS={
 sparkles:'<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 17 .7 1.3L21 19l-1.3.7L19 21l-.7-1.3L17 19l1.3-.7L19 17Z"/>',
 'sliders-horizontal':'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
 crop:'<path d="M6 3v14a1 1 0 0 0 1 1h14M3 6h14a1 1 0 0 1 1 1v14"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 type:'<path d="M4 6V4h16v2M12 4v16m-4 0h8"/>',
 pencil:'<path d="m4 20 4-.8L19 8a2 2 0 0 0-3-3L5 16l-1 4Z"/>',
 smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14q4 5 8 0M9 9h.01M15 9h.01"/>',
 aperture:'<circle cx="12" cy="12" r="9"/><path d="m14 4-4 7 4 9M5 9h8l4-5M6 18l5-7 8 3"/>'
};
function svgIcon(key){return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+(STUDIO_ICONS[key]||'')+'</svg>';}
function safe(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function copyState(state){return JSON.stringify(state);}
function range(key,label,min,max,step,value,suffix){
 return '<label class="vatra-studio-range"><span>'+label+' <output data-output="'+key+'">'+value+(suffix||'')+'</output></span>'+
 '<input type="range" data-setting="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"></label>';
}
function optionRow(label,name,items,value){
 return '<label class="vatra-studio-select">'+label+'<select data-setting="'+name+'">'+items.map(item=>'<option value="'+safe(item[0])+'"'+(item[0]===value?' selected':'')+'>'+safe(item[1])+'</option>').join('')+'</select></label>';
}
export async function openVatraPhotoStudio(file,mode='avatar'){
 if(!file||!file.type||!file.type.startsWith('image/'))throw new Error('Оберіть зображення для редагування.');
 if(file.size>15*1024*1024)throw new Error('Фото має бути меншим за 15 МБ.');
 const url=URL.createObjectURL(file);
 let image;
 try{
  image=await new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);
   img.onerror=()=>reject(new Error('Не вдалося прочитати зображення.'));
   img.src=url;
  });
 }catch(error){URL.revokeObjectURL(url);throw error;}
 const originalWidth=image.naturalWidth,originalHeight=image.naturalHeight;
 if(!originalWidth||!originalHeight){URL.revokeObjectURL(url);throw new Error('Зображення порожнє.');}
 const isCover=mode==='cover',isAvatar=mode==='avatar';
 const width=isCover?1600:isAvatar?800:1200,height=isCover?560:isAvatar?800:900;
 const title=isCover?'Редагування обкладинки':isAvatar?'Редагування аватара':'Редагування фотографії';
 const initial={
  preset:'original',zoom:1,x:0,y:0,rotation:0,flipX:1,flipY:1,
  brightness:100,contrast:100,saturation:100,hue:0,temperature:0,vignette:0,grain:0,
  blur:0,blurType:'all',blurX:.5,blurY:.5,brushColor:'#ffffff',brushSize:8,strokes:[],
  sticker:'💙',stickers:[],text:'',textColor:'#ffffff',textStroke:'#1d2f46',
  textSize:50,textFont:'Inter',textX:.5,textY:.78
 };
 let state=JSON.parse(copyState(initial)),tool='enhance',painting=null,dragging=null,draggingLayer=null,finished=false;
 const past=[copyState(state)],future=[];
 const dialog=document.createElement('dialog');
 dialog.className='vatra-studio-dialog';
 dialog.setAttribute('aria-label',title);
 dialog.innerHTML='<div class="vatra-studio-header"><div class="vatra-studio-brand">'+
  '<span class="vatra-studio-mark">В</span><span><b>Фоторедактор ВАТРИ</b><small>'+title+'</small></span></div>'+
  '<span class="vatra-studio-security">Обробка фото у вашому браузері</span>'+
  '<button type="button" class="vatra-studio-close" data-studio-action="cancel" aria-label="Закрити редактор">×</button></div>'+
  '<div class="vatra-studio-workspace"><section class="vatra-studio-workarea">'+
  '<div class="vatra-studio-stage"><canvas class="vatra-studio-canvas" width="800" height="800" aria-label="Полотно редагування"></canvas></div>'+
  '<p class="vatra-studio-stage-hint">Перетягніть фото для кадрування або оберіть інструмент справа.</p></section>'+
  '<div class="vatra-studio-right"><nav class="vatra-studio-toolnav" aria-label="Інструменти редагування">'+
  STUDIO_TOOLS.map(([key,ico,label])=>'<button type="button" data-studio-tool="'+key+'"'+(key===tool?' class="active" aria-current="true"':'')+'>'+svgIcon(ico)+'<span>'+label+'</span></button>').join('')+
  '</nav><aside class="vatra-studio-inspector" aria-label="Налаштування інструмента">'+
  '<div class="vatra-studio-panel"></div></aside></div></div>'+
  '<footer class="vatra-studio-footer"><div class="vatra-studio-history">'+
  '<button type="button" data-studio-action="undo" title="Скасувати зміну" aria-label="Скасувати зміну">↶</button>'+
  '<button type="button" data-studio-action="redo" title="Повторити зміну" aria-label="Повторити зміну">↷</button>'+
  '<div class="vatra-studio-zoom"><button type="button" data-studio-action="zoomout" aria-label="Зменшити">−</button>'+
  '<output data-studio-zoom>100%</output><button type="button" data-studio-action="zoomin" aria-label="Збільшити">＋</button></div>'+
  '<button class="vatra-studio-reset" type="button" data-studio-action="reset">Скинути все</button></div>'+
  '<p class="vatra-studio-status" aria-live="polite"></p>'+
  '<div class="vatra-studio-end"><button type="button" data-studio-action="cancel">Скасувати</button>'+
  '<button class="vatra-studio-save" type="button" data-studio-action="save">Готово</button></div></footer>';
 document.body.append(dialog);
 const canvas=dialog.querySelector('.vatra-studio-canvas'),ctx=canvas.getContext('2d');
 const panel=dialog.querySelector('.vatra-studio-panel'),status=dialog.querySelector('.vatra-studio-status');
 const undoBtn=dialog.querySelector('[data-studio-action="undo"]');
 const redoBtn=dialog.querySelector('[data-studio-action="redo"]');
 const saveBtn=dialog.querySelector('[data-studio-action="save"]');
 if(!ctx){dialog.remove();URL.revokeObjectURL(url);throw new Error('Браузер не підтримує редагування фото.');}
 canvas.width=isCover?980:isAvatar?680:800;canvas.height=Math.round(canvas.width*height/width);
 function commit(){
  const snapshot=copyState(state);
  if(past[past.length-1]!==snapshot){past.push(snapshot);if(past.length>35)past.shift();future.length=0;}
  undoBtn.disabled=past.length<2;redoBtn.disabled=future.length===0;
 }
 function restore(snapshot){
  state=JSON.parse(snapshot);renderPanel();drawPreview();
  undoBtn.disabled=past.length<2;redoBtn.disabled=future.length===0;
 }
 function drawBase(c,w,h,extraBlur=0){
  const radians=state.rotation*Math.PI/180;
  const boundW=originalWidth*Math.abs(Math.cos(radians))+originalHeight*Math.abs(Math.sin(radians));
  const boundH=originalWidth*Math.abs(Math.sin(radians))+originalHeight*Math.abs(Math.cos(radians));
  const scale=Math.max(w/boundW,h/boundH)*state.zoom;
  const filters=[PRESETS[state.preset]?.css==='none'?'':PRESETS[state.preset]?.css||'',
   'brightness('+(state.brightness/100)+')','contrast('+(state.contrast/100)+')',
   'saturate('+(state.saturation/100)+')','hue-rotate('+state.hue+'deg)'];
  if(extraBlur>0)filters.push('blur('+extraBlur+'px)');
  c.save();c.translate(w/2+state.x*w*.002,h/2+state.y*h*.002);
  c.rotate(radians);c.scale(state.flipX,state.flipY);c.filter=filters.join(' ');
  c.drawImage(image,-originalWidth*scale/2,-originalHeight*scale/2,originalWidth*scale,originalHeight*scale);
  c.restore();
 }
 function renderTo(c,w,h){
  c.save();c.clearRect(0,0,w,h);c.fillStyle='#e9eff7';c.fillRect(0,0,w,h);
  drawBase(c,w,h,state.blurType==='all'?state.blur*(w/800):0);
  if(state.blur>0&&state.blurType!=='all'){
   const layer=document.createElement('canvas');layer.width=w;layer.height=h;const l=layer.getContext('2d');
   drawBase(l,w,h,Math.max(.1,state.blur*w/800));
   l.globalCompositeOperation='destination-in';
   let grad;
   if(state.blurType==='radial'){
    grad=l.createRadialGradient(w*state.blurX,h*state.blurY,Math.min(w,h)*.12,w*state.blurX,h*state.blurY,Math.max(w,h)*.65);
    grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(.35,'rgba(0,0,0,.08)');grad.addColorStop(1,'rgba(0,0,0,1)');
   }else{
    grad=l.createLinearGradient(0,h*(state.blurY-.5),0,h*(state.blurY+.5));
    grad.addColorStop(0,'rgba(0,0,0,1)');grad.addColorStop(.43,'rgba(0,0,0,0)');
    grad.addColorStop(.57,'rgba(0,0,0,0)');grad.addColorStop(1,'rgba(0,0,0,1)');
   }
   l.fillStyle=grad;l.fillRect(0,0,w,h);l.globalCompositeOperation='source-over';c.drawImage(layer,0,0);
  }
  if(state.temperature){
   c.fillStyle=state.temperature>0?'rgba(255,133,55,'+(state.temperature*.0028)+')':'rgba(54,133,255,'+(-state.temperature*.0028)+')';
   c.save();c.globalCompositeOperation='soft-light';c.fillRect(0,0,w,h);c.restore();
  }
  if(state.vignette){
   const v=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.22,w/2,h/2,Math.max(w,h)*.74);
   v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,'+(state.vignette*.0065)+')');
   c.fillStyle=v;c.fillRect(0,0,w,h);
  }
  if(state.grain){
   c.save();c.globalAlpha=state.grain*.0015;
   let seed=241;
   for(let i=0;i<Math.floor(w*h/680);i++){
    seed=(seed*1664525+1013904223)>>>0;const x=seed%w;seed=(seed*1664525+1013904223)>>>0;
    const y=seed%h;c.fillStyle=(i%2)?'#fff':'#000';c.fillRect(x,y,Math.max(1,w/800),Math.max(1,h/800));
   }
   c.restore();
  }
  for(const stroke of state.strokes){
   const points=stroke.points;if(!points.length)continue;
   c.save();c.lineCap='round';c.lineJoin='round';c.strokeStyle=stroke.color;
   c.lineWidth=Math.max(1,stroke.size*w/800);c.beginPath();
   c.moveTo(points[0][0]*w,points[0][1]*h);
   if(points.length===1)c.lineTo(points[0][0]*w+.01,points[0][1]*h+.01);
   else for(let i=1;i<points.length;i++)c.lineTo(points[i][0]*w,points[i][1]*h);
   c.stroke();c.restore();
  }
  for(const sticker of state.stickers){
   c.save();c.textAlign='center';c.textBaseline='middle';
   c.font=Math.round(sticker.size*w/800)+'px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
   c.fillText(sticker.emoji,sticker.x*w,sticker.y*h);c.restore();
  }
  if(state.text){
   c.save();const size=state.textSize*w/800;const font=state.textFont==='Impact'?'Impact':state.textFont==='Georgia'?'Georgia':state.textFont==='Mono'?'monospace':'Inter,Arial,sans-serif';
   c.font='700 '+size+'px '+font;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
   const words=state.text.trim().split(/\s+/),lines=[];let line='';
   for(const word of words){const test=line?line+' '+word:word;if(c.measureText(test).width>w*.82&&line){lines.push(line);line=word;}else line=test;}
   if(line)lines.push(line);
   const top=state.textY*h-(lines.length-1)*size*.64;
   c.lineWidth=Math.max(2,size*.11);c.strokeStyle=state.textStroke;c.fillStyle=state.textColor;
   lines.forEach((txt,i)=>{const y=top+i*size*1.28;c.strokeText(txt,state.textX*w,y,w*.85);c.fillText(txt,state.textX*w,y,w*.85);});
   c.restore();
  }
  c.restore();
 }
 let nextFrame=0;
 function drawPreview(){
  if(nextFrame)return;
  nextFrame=requestAnimationFrame(()=>{nextFrame=0;if(!finished)renderTo(ctx,canvas.width,canvas.height);});
  dialog.querySelector('[data-studio-zoom]').textContent=Math.round(state.zoom*100)+'%';
 }
 function renderPanel(){
  let body='',subtitle='';
  switch(tool){
   case'enhance':
    subtitle='Швидкі покращення';body='<p class="vatra-studio-intro">Почніть з автоматичного балансу світла та кольору.</p>'+
    '<button type="button" class="vatra-studio-auto" data-studio-action="auto">'+svgIcon('sparkles')+' Покращити фото</button>'+
    '<p class="vatra-studio-note">Всі зміни можна скасувати стрілкою внизу.</p>'+
    range('brightness','Яскравість',50,160,1,state.brightness,'%')+
    range('contrast','Контраст',50,160,1,state.contrast,'%');
    break;
   case'filters':
    subtitle='Фільтри';body='<p class="vatra-studio-intro">Оберіть стиль — його можна доповнити власними налаштуваннями.</p>'+
    '<div class="vatra-studio-presets">'+Object.keys(PRESETS).map(key=>
     '<button type="button" class="vatra-studio-preset'+(state.preset===key?' is-active':'')+'" data-studio-preset="'+key+'">'+
     '<span><img alt="" src="'+url+'" style="filter:'+PRESETS[key].css+'"></span><b>'+safe(PRESETS[key].label)+'</b></button>').join('')+'</div>';
    break;
   case'crop':
    subtitle='Кадрування';body='<p class="vatra-studio-intro">Перетягуйте зображення на полотні, щоб змінити кадр.</p>'+
    range('zoom','Масштаб',1,3,.05,state.zoom,'×')+
    range('x','Горизонталь',-100,100,1,state.x,'')+range('y','Вертикаль',-100,100,1,state.y,'')+
    '<div class="vatra-studio-button-row"><button type="button" data-studio-action="rotateleft">↶ Повернути</button>'+
    '<button type="button" data-studio-action="rotateright">↷ Повернути</button></div>'+
    '<div class="vatra-studio-button-row"><button type="button" data-studio-action="flipx">↔ Віддзеркалити</button>'+
    '<button type="button" data-studio-action="flipy">↕ Вертикально</button></div>';
    break;
   case'adjust':
    subtitle='Корекція кольору';body=range('brightness','Експозиція',50,160,1,state.brightness,'%')+
    range('contrast','Контрастність',50,170,1,state.contrast,'%')+
    range('saturation','Насиченість',0,200,1,state.saturation,'%')+
    range('temperature','Температура',-100,100,1,state.temperature,'')+
    range('hue','Відтінок',-180,180,1,state.hue,'°')+
    range('vignette','Віньєтка',0,100,1,state.vignette,'%')+
    range('grain','Зернистість',0,100,1,state.grain,'%');
    break;
   case'text':
    subtitle='Текст';body='<label class="vatra-studio-field">Напис<textarea rows="3" maxlength="140" data-setting="text" placeholder="Введіть текст…"></textarea></label>'+
    optionRow('Шрифт','textFont',[['Inter','Класичний'],['Georgia','Вишуканий'],['Impact','Плакат'],['Mono','Моноширинний']],state.textFont)+
    range('textSize','Розмір',18,105,1,state.textSize,'')+
    '<div class="vatra-studio-colors"><label>Колір тексту<input type="color" data-setting="textColor" value="'+state.textColor+'"></label>'+
    '<label>Контур<input type="color" data-setting="textStroke" value="'+state.textStroke+'"></label></div>'+
    '<p class="vatra-studio-note">Натисніть і перетягніть напис у будь-яке місце на фото.</p>';
    break;
   case'brush':
    subtitle='Пензель';body='<p class="vatra-studio-intro">Малюйте прямо на фотографії. Кожен штрих можна скасувати.</p>'+
    range('brushSize','Товщина',2,32,1,state.brushSize,' px')+
    '<label class="vatra-studio-field">Колір пензля<input type="color" data-setting="brushColor" value="'+state.brushColor+'"></label>'+
    '<p class="vatra-studio-note">Щоб перенести намальований штрих, перейдіть до іншого інструмента і перетягніть його.</p>'+ 
    '<div class="vatra-studio-swatches">'+['#ffffff','#1a2433','#0757f5','#ffd631','#ff5b65','#23c493','#9a72f6'].map(color=>
      '<button type="button" aria-label="Колір '+color+'" style="background:'+color+'" data-studio-color="'+color+'"></button>').join('')+'</div>';
    break;
   case'stickers':
    subtitle='Стікери';body='<p class="vatra-studio-intro">Додайте стікер, потім перетягніть його пальцем або мишею в потрібне місце.</p>'+
    '<div class="vatra-studio-stickers">'+EMOJI.map(emoji=>
      '<button type="button" data-studio-sticker="'+emoji+'" aria-label="Додати стікер '+emoji+'">'+emoji+'</button>').join('')+'</div>'+
    '<button type="button" class="vatra-studio-minor" data-studio-action="removesticker">Прибрати останній стікер</button>';
    break;
   case'blur':
    subtitle='Розмиття';body='<p class="vatra-studio-intro">Розмийте фон чи краї фотографії, зберігаючи увагу на головному.</p>'+
    '<div class="vatra-studio-blurtypes">'+[['all','Усе фото'],['radial','Радіальне'],['linear','Лінійне']].map(item=>
     '<button type="button" class="'+(state.blurType===item[0]?'is-active':'')+'" data-studio-blur="'+item[0]+'">'+item[1]+'</button>').join('')+'</div>'+
    range('blur','Інтенсивність',0,18,.5,state.blur,'')+
    '<p class="vatra-studio-note">Перетягуйте область розмиття на фотографії.</p>';
    break;
  }
  panel.innerHTML='<h3>'+subtitle+'</h3>'+body;
  if(tool==='text')panel.querySelector('[data-setting="text"]').value=state.text;
  panel.querySelectorAll('[data-setting]').forEach(input=>{
   const key=input.dataset.setting;
   if(input.type==='range'){
    const paintRange=()=>{const min=Number(input.min),max=Number(input.max),current=Number(input.value);input.style.setProperty('--vatra-range-fill',(((current-min)/(max-min||1))*100).toFixed(2)+'%');};
    paintRange();
    input.addEventListener('input',()=>{paintRange();state[key]=Number(input.value);panel.querySelector('[data-output="'+key+'"]').textContent=input.value+(key==='zoom'?'×':key==='brightness'||key==='contrast'||key==='saturation'||key==='vignette'||key==='grain'?'%':key==='hue'?'°':key==='brushSize'?' px':'');drawPreview();});
    input.addEventListener('change',commit);
   }else{
    input.addEventListener('input',()=>{state[key]=input.value;drawPreview();});
    input.addEventListener('change',commit);
    if(key==='text')input.addEventListener('blur',commit);
   }
  });
 }
 function setTool(next){
  tool=next;
  dialog.querySelectorAll('[data-studio-tool]').forEach(button=>{
   const active=button.dataset.studioTool===next;button.classList.toggle('active',active);
   if(active)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
  });
  canvas.style.cursor=next==='brush'?'crosshair':next==='crop'?'grab':'move';
  renderPanel();drawPreview();
 }
 function point(e){
  const r=canvas.getBoundingClientRect();
  return [clamp((e.clientX-r.left)/r.width,0,1),clamp((e.clientY-r.top)/r.height,0,1)];
 }
 function finish(resolve,result){
  if(finished)return;finished=true;
  if(nextFrame)cancelAnimationFrame(nextFrame);
  if(dialog.open)dialog.close();
  dialog.remove();URL.revokeObjectURL(url);resolve(result);
 }
 renderPanel();drawPreview();commit();
 return new Promise(resolve=>{
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(resolve,null);});
  dialog.addEventListener('click',event=>{if(event.target===dialog)finish(resolve,null);});
  dialog.querySelectorAll('[data-studio-tool]').forEach(button=>button.addEventListener('click',()=>setTool(button.dataset.studioTool)));
  dialog.addEventListener('click',async event=>{
   const preset=event.target.closest('[data-studio-preset]');
   if(preset){state.preset=preset.dataset.studioPreset;commit();renderPanel();drawPreview();return;}
   const sticker=event.target.closest('[data-studio-sticker]');
   if(sticker){state.sticker=sticker.dataset.studioSticker;state.stickers.push({emoji:state.sticker,x:.5,y:.5,size:86});commit();drawPreview();return;}
   const color=event.target.closest('[data-studio-color]');
   if(color){state.brushColor=color.dataset.studioColor;commit();renderPanel();return;}
   const blur=event.target.closest('[data-studio-blur]');
   if(blur){state.blurType=blur.dataset.studioBlur;commit();renderPanel();drawPreview();return;}
   const action=event.target.closest('[data-studio-action]')?.dataset.studioAction;
   if(!action)return;
   if(action==='cancel'){finish(resolve,null);return;}
   if(action==='undo'&&past.length>1){future.push(past.pop());restore(past[past.length-1]);return;}
   if(action==='redo'&&future.length){const snapshot=future.pop();past.push(snapshot);restore(snapshot);return;}
   if(action==='reset'){state=JSON.parse(copyState(initial));commit();renderPanel();drawPreview();return;}
   if(action==='auto'){Object.assign(state,{brightness:108,contrast:106,saturation:113,temperature:9});commit();renderPanel();drawPreview();return;}
   if(action==='zoomout'||action==='zoomin'){state.zoom=clamp(Math.round((state.zoom+(action==='zoomin'?.1:-.1))*100)/100,1,3);commit();renderPanel();drawPreview();return;}
   if(action==='rotateleft'||action==='rotateright'){state.rotation=(state.rotation+(action==='rotateleft'?-90:90)+360)%360;commit();drawPreview();return;}
   if(action==='flipx'||action==='flipy'){if(action==='flipx')state.flipX*=-1;else state.flipY*=-1;commit();drawPreview();return;}
   if(action==='removesticker'){state.stickers.pop();commit();drawPreview();return;}
   if(action==='save'){
    saveBtn.disabled=true;saveBtn.textContent='Обробляємо…';status.textContent='Готуємо фотографію…';
    try{
     const out=document.createElement('canvas');out.width=width;out.height=height;
     const outCtx=out.getContext('2d');if(!outCtx)throw new Error('Не вдалося створити зображення.');
     renderTo(outCtx,width,height);
     const blob=await new Promise((ok,bad)=>out.toBlob(b=>b?ok(b):bad(new Error('Не вдалося зберегти файл.')),'image/jpeg',.9));
     const result=new File([blob],(file.name||'photo').replace(/\.[^.]+$/,'')+'-vatra.jpg',{type:'image/jpeg',lastModified:Date.now()});
     finish(resolve,result);
    }catch(error){status.textContent=error.message||'Помилка обробки.';saveBtn.disabled=false;saveBtn.textContent='Готово';}
   }
  });
  canvas.addEventListener('pointerdown',event=>{
   if(event.button!==0)return;
   const p=point(event);
   /* Overlay objects can be dragged freely without opening another tool. */
   if(tool!=='brush'&&tool!=='crop'){
    const found=state.stickers.map((item,index)=>({index,item,dist:Math.hypot((item.x-p[0])*canvas.width,(item.y-p[1])*canvas.height)}))
      .filter(hit=>hit.dist<Math.max(25,hit.item.size*.65*canvas.width/800)).sort((a,b)=>a.dist-b.dist)[0];
    if(found){
     draggingLayer={type:'sticker',index:found.index,dx:p[0]-found.item.x,dy:p[1]-found.item.y};
     canvas.setPointerCapture(event.pointerId);event.preventDefault();return;
    }
    if(state.text&&Math.abs(p[0]-state.textX)<.28&&Math.abs(p[1]-state.textY)<.13){
     draggingLayer={type:'text',dx:p[0]-state.textX,dy:p[1]-state.textY};
     canvas.setPointerCapture(event.pointerId);event.preventDefault();return;
    }
   }
   if(tool!=='brush'&&tool!=='crop'){
    const near=state.strokes.map((stroke,index)=>({
      index,stroke,dist:stroke.points.length?Math.min(...stroke.points.map(q=>Math.hypot((q[0]-p[0])*canvas.width,(q[1]-p[1])*canvas.height))):Infinity
    })).filter(x=>x.dist<Math.max(17,x.stroke.size*canvas.width/800)).sort((a,b)=>a.dist-b.dist)[0];
    if(near){
     draggingLayer={type:'stroke',index:near.index,start:p,original:near.stroke.points.map(pt=>pt.slice())};
     canvas.setPointerCapture(event.pointerId);event.preventDefault();return;
    }
   }
   if(tool==='brush'){
    painting={color:state.brushColor,size:state.brushSize,points:[p]};state.strokes.push(painting);
   }else if(tool==='crop'){
    dragging={x:event.clientX,y:event.clientY,baseX:state.x,baseY:state.y};
   }else if(tool==='blur'){
    state.blurX=p[0];state.blurY=p[1];draggingLayer={type:'blur'};
   }else if(tool==='stickers'){
    state.stickers.push({emoji:state.sticker,x:p[0],y:p[1],size:86});commit();
   }else if(tool==='text'&&state.text){state.textX=p[0];state.textY=p[1];commit();}
   else return;
   canvas.setPointerCapture(event.pointerId);event.preventDefault();drawPreview();
  });
  canvas.addEventListener('pointermove',event=>{
   if(!canvas.hasPointerCapture(event.pointerId))return;
   if(draggingLayer){
    const p=point(event),x=clamp(p[0]-draggingLayer.dx,0,1),y=clamp(p[1]-draggingLayer.dy,0,1);
    if(draggingLayer.type==='sticker'&&state.stickers[draggingLayer.index]){state.stickers[draggingLayer.index].x=x;state.stickers[draggingLayer.index].y=y;}
    if(draggingLayer.type==='text'){state.textX=x;state.textY=y;}
    if(draggingLayer.type==='blur'){state.blurX=p[0];state.blurY=p[1];}
    if(draggingLayer.type==='stroke'){
     const stroke=state.strokes[draggingLayer.index];
     if(stroke){const dx=p[0]-draggingLayer.start[0],dy=p[1]-draggingLayer.start[1];
      stroke.points=draggingLayer.original.map(pt=>[clamp(pt[0]+dx,0,1),clamp(pt[1]+dy,0,1)]);}
    }
    drawPreview();return;
   }
   if(painting){painting.points.push(point(event));drawPreview();}
   if(dragging){const r=canvas.getBoundingClientRect();
    state.x=clamp(dragging.baseX+(event.clientX-dragging.x)/r.width*220,-100,100);
    state.y=clamp(dragging.baseY+(event.clientY-dragging.y)/r.height*220,-100,100);
    drawPreview();
   }
  });
  const stop=e=>{
   if(!canvas.hasPointerCapture(e.pointerId))return;
   canvas.releasePointerCapture(e.pointerId);
   if(painting||dragging||draggingLayer){painting=null;dragging=null;draggingLayer=null;commit();if(tool==='crop')renderPanel();}
  };
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
  canvas.addEventListener('wheel',e=>{
   if(!e.ctrlKey)return;e.preventDefault();
   state.zoom=clamp(Math.round((state.zoom+(e.deltaY<0?.05:-.05))*100)/100,1,3);
   commit();if(tool==='crop')renderPanel();drawPreview();
  },{passive:false});
  dialog.showModal();
 });
}
