(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const script=document.currentScript?.src||location.href;
const W=540,H=960;
const palette=["#ffffff","#202938","#b6a99e","#427deb","#20b486","#ffcd42","#f65379","#a697f4","#8054ec","#ef5aa9","#fb913f","#a8d72f","#73d3f3","#5b6573","#dcd3ca","#e9edf4"];
const backgrounds=[["#385ee4","#9759df"],["#176fbc","#65c7dc"],["#ed7591","#7f55bb"],["#1b927c","#91d4a7"],["#ff904d","#ffd56a"],["#232b46","#615a9c"],["#f4d9cb","#f7bbda"],["#e7edf7","#c9d9fc"]];
const fonts=[["Onest","Onest"],["Georgia","Georgia"],["Arial","Arial"],["Verdana","Verdana"],["Courier New","Courier New"]];
const filterNames=[["Оригінал","Original"],["Ватра","Flame"],["Світанок","Dawn"],["Прохолода","Cool"],["Монохром","Mono"],["Вінтаж","Vintage"]];
const filterValues=[[1,1,1,0],[1.06,1.1,1.24,.12],[1.16,.95,1.15,.1],[1.02,1.07,.9,0],[1,1.12,0,0],[.99,.92,.7,.48]];
const translate=(uk,en)=>document.documentElement.lang==="en"?en:(window.VATRA_LANGUAGE?.translate?.(uk)||uk);
const node=(tag,cls,value)=>{const el=document.createElement(tag);el.className=cls;if(value!==undefined)el.textContent=value;return el;};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fresh=()=>({background:null,media:null,kind:null,texts:[],stickers:[],strokes:[],filter:0,intensity:100,adjust:{brightness:0,contrast:0,warmth:0,saturation:0,vignette:0},caption:""});
function mount({dialog,trigger,client,id,prefix,onPublished}){
 if(!dialog||!trigger||!client||!(/^[1-9][0-9]{0,18}$/.test(String(id)))||dialog.dataset.storyEditor)return;
 dialog.dataset.storyEditor="true";
 const e=(tag,suffix,value)=>node(tag,"ui-vatra-story-"+suffix+"-001",value);
 const tr=(uk,en)=>translate(uk,en);
 const button=(suffix,label,fn,ident)=>{const b=node("button","vatra-story-"+suffix+"-001",label);b.type="button";if(ident)b.id=ident;b.addEventListener("click",fn);return b;};
 const form=e("form","form");form.id=prefix+"-form";
 const header=e("header","header"),title=node("h2","vatra-story-title-001",tr("Нова історія","New story"));title.id=prefix+"-title";
 const close=button("close","×",()=>{if(!publishing)dialog.close();},prefix+"-cancel");close.setAttribute("aria-label",tr("Закрити","Close"));header.append(title,close);
 const work=e("div","workspace"),stage=e("div","stage"),surface=e("div","surface");surface.id=prefix+"-media-preview";
 const canvas=e("canvas","canvas");canvas.width=W;canvas.height=H;canvas.setAttribute("aria-label",tr("Попередній перегляд історії","Story preview"));canvas.setAttribute("role","img");canvas.hidden=true;
 const video=e("video","video");video.controls=true;video.playsInline=true;video.preload="metadata";video.hidden=true;
 const empty=e("div","empty"),uploadIcon=e("span","upload-icon","↑");uploadIcon.setAttribute("aria-hidden","true");
 const dropCopy=node("p","vatra-story-drop-copy-001",tr("Перетягніть сюди фото або відео","Drag a photo or video here"));
 const file=e("input","file");file.id=prefix==="feed-story"?prefix+"-media":prefix+"-media-input";file.type="file";file.accept="image/jpeg,image/png,image/webp,video/mp4,video/webm";file.hidden=true;
 const choose=button("choose",tr("Вибрати файл","Choose file"),()=>file.click(),prefix+"-media-choose");
 const pickBackground=button("empty-background",tr("Вибрати фон","Choose background"),()=>setPanel("background"));
 empty.append(uploadIcon,dropCopy,choose,pickBackground);
 const history=e("div","history"),undo=button("undo","↶",()=>restore(-1)),redo=button("redo","↷",()=>restore(1));undo.setAttribute("aria-label",tr("Скасувати дію","Undo"));redo.setAttribute("aria-label",tr("Повторити дію","Redo"));history.append(undo,redo);
 surface.append(canvas,video,empty,history);
 const mediaActions=e("div","media-actions"),replace=button("replace",tr("Вибрати файл","Choose file"),()=>file.click()),remove=button("remove",tr("Прибрати медіа","Remove media"),()=>{mutate(()=>{state.media=null;state.kind=null;state.caption="";});setPanel(active);},prefix+"-media-remove");
 mediaActions.append(file,replace,remove);stage.append(surface,mediaActions);
 const sidebar=e("div","sidebar"),nav=e("nav","tools"),panel=e("section","panel");
 const toolDefs=[
  ["text","Aa","Текст","Text"],["stickers","☺","Стікери","Stickers"],["brush","✎","Пензель","Brush"],
  ["background","◉","Тло","Background"],["filters","◐","Фільтри","Filters"],["adjust","☷","Корекція кольору","Color correction"]
 ];
 const toolButtons=new Map();
 for(const [key,icon,uk,en] of toolDefs){const b=button("tool-"+key,"",()=>setPanel(key));const pict=node("span","ui-vatra-story-tool-icon-"+key+"-001",icon),label=node("span","vatra-story-tool-label-"+key+"-001",tr(uk,en));pict.setAttribute("aria-hidden","true");b.append(pict,label);b.setAttribute("aria-pressed","false");toolButtons.set(key,b);nav.append(b);}
 sidebar.append(nav,panel);work.append(stage,sidebar);
 const footer=e("footer","footer"),info=e("div","info");
 const audience=node("span","vatra-story-audience-001",tr("Для друзів","Friends only")),time=node("span","vatra-story-duration-001",tr("24 години","24 hours"));
 info.append(audience,time);
 const error=node("p","vatra-story-error-001");error.id=prefix+"-error";error.setAttribute("role","status");error.hidden=true;
 const save=button("publish",tr("Опублікувати","Publish"),()=>{},prefix+"-save");save.type="submit";save.disabled=true;
 footer.append(info,error,save);form.append(header,work,footer);dialog.replaceChildren(form);
 let state=fresh(),back=[],forward=[],assets=new Map(),assetSerial=0,layerSerial=0,active="text",selected=null,brush={color:"#ffffff",width:18,opacity:1},pointer=null,loading=false,publishing=false,request=0,stickerCatalog=null,packId=null,stickerBusy=false;
 const clone=()=>JSON.parse(JSON.stringify(state));
 const note=value=>{error.textContent=value||"";error.hidden=!value;};
 const checkpoint=()=>{back.push(clone());if(back.length>25)back.shift();forward=[];};
 const changed=()=>{render();};
 const mutate=fn=>{if(publishing||loading)return;checkpoint();fn();changed();};
 const restore=dir=>{if(publishing||loading||pointer)return;const src=dir<0?back:forward,dst=dir<0?forward:back;if(!src.length)return;dst.push(clone());state=src.pop();selected=null;render();setPanel(active);};
 const reset=()=>{request++;loading=false;stickerBusy=false;pointer=null;state=fresh();selected=null;back=[];forward=[];for(const a of assets.values())if(a.url)URL.revokeObjectURL(a.url);assets.clear();file.value="";video.pause();video.removeAttribute("src");video.load();note("");active="text";render();setPanel("text");};
 const hasArt=()=>!!(state.media||state.background||state.texts.some(a=>a.text.trim())||state.stickers.length||state.strokes.length);
 const addAsset=(file,img,url)=>{const key=String(++assetSerial);assets.set(key,{file,img,url});return key;};
 const filterString=()=>{const f=filterValues[state.filter]||filterValues[0],s=state.intensity/100,a=state.adjust;return "brightness("+Math.max(.1,1+(f[0]-1)*s+a.brightness/100)+") contrast("+Math.max(.1,1+(f[1]-1)*s+a.contrast/100)+") saturate("+Math.max(0,1+(f[2]-1)*s+a.saturation/100)+") sepia("+Math.min(1,f[3]*s+Math.max(0,a.warmth)/180)+") hue-rotate("+Math.min(0,a.warmth)*.5+"deg)";};
 const wrap=(ctx,value,max)=>{const lines=[];for(const paragraph of value.split("\n")){let line="";for(const word of paragraph.split(/\s+/)){const next=line?line+" "+word:word;if(ctx.measureText(next).width>max&&line){lines.push(line);line=word;}else line=next;while(ctx.measureText(line).width>max&&Array.from(line).length>1){const chars=Array.from(line);let part="";while(chars.length&&ctx.measureText(part+chars[0]).width<=max)part+=chars.shift();if(!part)break;lines.push(part);line=chars.join("");}}lines.push(line);}return lines.slice(0,24);};
 const textMetrics=(ctx,a)=>{ctx.font="700 "+a.size+"px "+JSON.stringify(a.font)+",Onest,sans-serif";const lines=wrap(ctx,a.text,a.width),lineHeight=a.size*1.22,w=Math.max(60,Math.min(a.width,Math.max(...lines.map(l=>ctx.measureText(l).width),0)+16)),h=Math.max(lineHeight,lines.length*lineHeight)+12;return {lines,lineHeight,w,h};};
 function draw(target,decorations=false){
  const ctx=target.getContext("2d");if(!ctx)return;
  ctx.save();ctx.scale(target.width/W,target.height/H);ctx.clearRect(0,0,W,H);
  const fill=state.background||backgrounds[0];if(Array.isArray(fill)){const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,fill[0]);g.addColorStop(1,fill[1]);ctx.fillStyle=g;}else ctx.fillStyle=fill;
  ctx.fillRect(0,0,W,H);
  const art=assets.get(state.media)?.img;
  if(art){const iw=art.naturalWidth,ih=art.naturalHeight,scale=Math.max(W/iw,H/ih);ctx.save();ctx.filter=filterString();ctx.drawImage(art,(W-iw*scale)/2,(H-ih*scale)/2,iw*scale,ih*scale);ctx.restore();}
  else if(state.filter||Object.values(state.adjust).some(Boolean)){const base=document.createElement("canvas");base.width=W;base.height=H;const bx=base.getContext("2d");if(Array.isArray(fill)){const g=bx.createLinearGradient(0,0,W,H);g.addColorStop(0,fill[0]);g.addColorStop(1,fill[1]);bx.fillStyle=g;}else bx.fillStyle=fill;bx.fillRect(0,0,W,H);ctx.save();ctx.filter=filterString();ctx.drawImage(base,0,0);ctx.restore();}
  if(state.adjust.vignette){const g=ctx.createRadialGradient(W/2,H/2,H*.16,W/2,H/2,H*.64);g.addColorStop(0,"transparent");g.addColorStop(1,"rgba(0,0,0,"+(state.adjust.vignette/100)*.85+")");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  for(const s of state.strokes){if(!s.points.length)continue;ctx.save();ctx.globalAlpha=s.opacity;ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=s.width;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(s.points[0].x,s.points[0].y);for(const p of s.points.slice(1))ctx.lineTo(p.x,p.y);if(s.points.length===1){ctx.arc(s.points[0].x,s.points[0].y,s.width/2,0,Math.PI*2);ctx.fill();}else ctx.stroke();ctx.restore();}
  for(const a of state.stickers){const img=assets.get(a.asset)?.img;if(!img)continue;const h=a.width*img.naturalHeight/img.naturalWidth;ctx.drawImage(img,a.x-a.width/2,a.y-h/2,a.width,h);if(decorations&&selected===a.id){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.strokeRect(a.x-a.width/2-4,a.y-h/2-4,a.width+8,h+8);}}
  for(const a of state.texts){const m=textMetrics(ctx,a);ctx.textAlign=a.align;ctx.textBaseline="middle";ctx.font="700 "+a.size+"px "+JSON.stringify(a.font)+",Onest,sans-serif";
   if(a.backing){ctx.fillStyle=a.color==="#ffffff"?"rgba(20,29,48,.76)":"rgba(255,255,255,.82)";ctx.beginPath();ctx.roundRect(a.x-m.w/2-6,a.y-m.h/2,m.w+12,m.h,10);ctx.fill();}
   ctx.fillStyle=a.color;const x=a.align==="left"?a.x-m.w/2:a.align==="right"?a.x+m.w/2:a.x;
   m.lines.forEach((line,i)=>ctx.fillText(line,x,a.y+(i-(m.lines.length-1)/2)*m.lineHeight,a.width));
   if(decorations&&selected===a.id){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.strokeRect(a.x-m.w/2-6,a.y-m.h/2,m.w+12,m.h);}
  }
  ctx.restore();
 }
 function render(){
  const art=hasArt(),isVideo=state.kind==="video";canvas.hidden=!art||isVideo;video.hidden=!isVideo;empty.hidden=art;history.hidden=!art;surface.dataset.ready=String(art);
  const url=isVideo?assets.get(state.media)?.url:null;
  if(url&&video.getAttribute("src")!==url)video.src=url;
  if(!isVideo&&video.hasAttribute("src")){video.pause();video.removeAttribute("src");video.load();}
  if(art&&!isVideo)draw(canvas,true);
  remove.hidden=!state.media;replace.hidden=!art;undo.disabled=!back.length||publishing||loading;redo.disabled=!forward.length||publishing||loading;
  save.disabled=!art||publishing||loading||stickerBusy;close.disabled=publishing;replace.disabled=remove.disabled=choose.disabled=pickBackground.disabled=publishing||loading;panel.inert=publishing||loading;
  for(const [key,b] of toolButtons){b.disabled=publishing||loading||(isVideo&&!["text","background"].includes(key));b.setAttribute("aria-pressed",String(key===active));}
  canvas.dataset.tool=active;
 }
 const currentText=()=>state.texts.find(a=>a.id===selected);
 const currentSticker=()=>state.stickers.find(a=>a.id===selected);
 const heading=(uk,en)=>panel.append(node("h3","vatra-story-panel-heading-001",tr(uk,en)));
 const description=(uk,en)=>panel.append(node("p","vatra-story-panel-note-001",tr(uk,en)));
 function field(label,suffix,value,min,max,step,apply){
  const line=e("label",suffix+"-field"),name=node("span","vatra-story-"+suffix+"-label-001",label),display=node("output","vatra-story-"+suffix+"-value-001",String(value)),input=e("input",suffix+"-range");
  input.type="range";input.min=min;input.max=max;input.step=step;input.value=value;
  let saved=false;const remember=()=>{if(!saved){checkpoint();saved=true;}};input.addEventListener("input",()=>{if(publishing||loading)return;remember();const v=Number(input.value);display.value=String(v);apply(v);render();});input.addEventListener("change",()=>{saved=false;});
  line.append(name,display,input);panel.append(line);return input;
 }
 function colors(suffix,chosen,apply){
  const grid=e("div",suffix+"-colors");for(const color of palette){const b=button(suffix+"-color","",()=>apply(color));b.style.backgroundColor=color;b.setAttribute("aria-label",color);b.setAttribute("aria-pressed",String(color===chosen));grid.append(b);}panel.append(grid);
 }
 function addText(){mutate(()=>{if(state.texts.length>=12)return;if(!hasArt())state.background=backgrounds[0];const a={id:"text-"+(++layerSerial),text:"",x:W/2,y:H/2,width:W*.8,size:48,font:"Onest",color:"#ffffff",align:"center",backing:false};state.texts.push(a);selected=a.id;});setPanel("text");panel.querySelector("textarea")?.focus();}
 function setPanel(key){
  if(publishing||loading)return;
  if(state.kind==="video"&&!["text","background"].includes(key))key="text";
  active=key;panel.replaceChildren();render();
  if(key==="text"){
   heading("Текст","Text");
   if(state.kind==="video"){
    description("Відео публікується без перекодування. Можна додати підпис; мальовані шари та фільтри доступні для фото.","Video is published without re-encoding. Add a caption; drawing layers and filters are available for photos.");
    const input=e("textarea","caption");input.maxLength=260;input.value=state.caption;input.placeholder=tr("Підпис до відео","Video caption");input.setAttribute("aria-label",input.placeholder);input.addEventListener("input",()=>{state.caption=input.value;});panel.append(input);return;
   }
   panel.append(button("add-text",tr("＋ Додати текст","+ Add text"),addText));
   const a=currentText();if(!a){description("Додайте текст і перемістіть його на полотні.","Add text and move it on the canvas.");return;}
   const text=e("textarea","text");text.id=prefix+"-text";text.maxLength=260;text.value=a.text;text.placeholder=tr("Розкажіть усім…","Tell your story…");text.setAttribute("aria-label",tr("Текст історії","Story text"));
   let remembered=false;text.addEventListener("input",()=>{if(!remembered){checkpoint();remembered=true;}a.text=text.value;render();});text.addEventListener("change",()=>{remembered=false;});panel.append(text);
   const fontGrid=e("div","fonts");for(const [name,font] of fonts){const b=button("font",name,()=>{mutate(()=>a.font=font);setPanel(key);});b.style.fontFamily=font;b.setAttribute("aria-pressed",String(a.font===font));fontGrid.append(b);}panel.append(fontGrid);
   field(tr("Розмір тексту","Text size"),"text-size",a.size,20,96,1,v=>a.size=v);
   const row=e("div","text-options");for(const align of ["left","center","right"]){const b=button("align-"+align,align==="left"?"≡←":align==="right"?"→≡":"≡",()=>{mutate(()=>a.align=align);setPanel(key);});b.setAttribute("aria-label",tr(align==="left"?"Ліворуч":align==="right"?"Праворуч":"По центру",align));b.setAttribute("aria-pressed",String(a.align===align));row.append(b);}
   const backing=button("backing",tr("Тло тексту","Text background"),()=>{mutate(()=>a.backing=!a.backing);setPanel(key);});backing.setAttribute("aria-pressed",String(a.backing));row.append(backing);panel.append(row);
   colors("text",a.color,color=>{mutate(()=>a.color=color);setPanel(key);});panel.append(button("delete-text",tr("Видалити текст","Delete text"),()=>{mutate(()=>state.texts=state.texts.filter(x=>x.id!==a.id));selected=null;setPanel(key);}));
  }else if(key==="background"){
   heading("Тло","Background");description("Вибір тла замінює завантажене фото або відео.","Choosing a background replaces the selected photo or video.");
   const grid=e("div","backgrounds");const pick=color=>{mutate(()=>{state.background=color;state.media=null;state.kind=null;state.caption="";});setPanel(key);};
   for(const color of backgrounds){const b=button("gradient","",()=>pick(color));b.style.background="linear-gradient(145deg,"+color[0]+","+color[1]+")";b.setAttribute("aria-label",color.join(" "));b.setAttribute("aria-pressed",String(JSON.stringify(state.background)===JSON.stringify(color)&&!state.media));grid.append(b);}panel.append(grid);colors("background",state.kind?null:state.background,pick);
  }else if(key==="brush"){
   heading("Пензель","Brush");description("Малюйте мишею або пальцем на полотні.","Draw with your mouse or finger on the canvas.");
   field(tr("Товщина","Thickness"),"brush-width",brush.width,2,80,1,v=>brush.width=v);
   field(tr("Інтенсивність","Opacity"),"brush-opacity",Math.round(brush.opacity*100),5,100,1,v=>brush.opacity=v/100);
   colors("brush",brush.color,color=>{brush.color=color;setPanel(key);});
  }else if(key==="filters"){
   heading("Фільтри","Filters");field(tr("Інтенсивність","Intensity"),"filter-intensity",state.intensity,0,100,1,v=>state.intensity=v);
   const grid=e("div","filters");for(let i=0;i<filterNames.length;i++){const [uk,en]=filterNames[i],b=button("filter",tr(uk,en),()=>{mutate(()=>{if(!hasArt())state.background=backgrounds[0];state.filter=i;});setPanel(key);});b.setAttribute("aria-pressed",String(state.filter===i));grid.append(b);}panel.append(grid);
  }else if(key==="adjust"){
   heading("Корекція кольору","Color correction");
   for(const [k,uk,en,min,max] of [["brightness","Яскравість","Brightness",-75,75],["contrast","Контраст","Contrast",-75,75],["warmth","Теплота","Warmth",-100,100],["saturation","Насиченість","Saturation",-100,100],["vignette","Віньєтка","Vignette",0,100]])field(tr(uk,en),k,state.adjust[k],min,max,1,v=>{state.adjust[k]=v;if(!hasArt())state.background=backgrounds[0];});
   panel.append(button("reset-adjust",tr("Скинути","Reset"),()=>{mutate(()=>state.adjust=fresh().adjust);setPanel(key);}));
  }else if(key==="stickers"){
   heading("Стікери","Stickers");
   const selectedArt=currentSticker();if(selectedArt){field(tr("Розмір стікера","Sticker size"),"sticker-size",selectedArt.width,44,340,1,v=>selectedArt.width=v);panel.append(button("delete-sticker",tr("Видалити стікер","Delete sticker"),()=>{mutate(()=>state.stickers=state.stickers.filter(x=>x.id!==selectedArt.id));selected=null;setPanel(key);}));}
   if(!stickerCatalog){const pending=node("p","vatra-story-stickers-loading-001",tr("Завантаження…","Loading…"));panel.append(pending);import(new URL("comment-picker.js",script).href).then(mod=>{stickerCatalog=mod;if(dialog.open&&active==="stickers")setPanel("stickers");}).catch(()=>{pending.textContent=tr("Не вдалося завантажити стікери.","Could not load stickers.");});return;}
   const packs=e("div","sticker-packs");const pack=stickerCatalog.packs.find(p=>p.id===packId)||stickerCatalog.packs[0];if(!pack)return;for(const p of stickerCatalog.packs){const b=button("sticker-pack",tr(p.uk,p.en),()=>{packId=p.id;setPanel(key);});b.setAttribute("aria-pressed",String(p.id===pack.id));packs.append(b);}panel.append(packs);
   const grid=e("div","stickers");for(let i=0;i<pack.rects.length;i++){const b=button("sticker","",()=>void addSticker(pack,i));b.setAttribute("aria-label",tr(pack.uk,pack.en)+" "+(i+1));b.append(stickerCatalog.stickerArt(pack,i));grid.append(b);}panel.append(grid);
  }
 }
 async function addSticker(pack,index){
  if(stickerBusy||loading||publishing||state.kind==="video"||state.stickers.length>=30)return;
  const epoch=request;stickerBusy=true;render();
  const img=new Image();let url=null;
  try{const file=await stickerCatalog.stickerFile(pack.id,index);url=URL.createObjectURL(file);img.src=url;await img.decode();if(epoch!==request||!dialog.open){URL.revokeObjectURL(url);return;}const asset=addAsset(file,img,url);url=null;mutate(()=>{if(!hasArt())state.background=backgrounds[0];const a={id:"sticker-"+(++layerSerial),asset,x:W/2,y:H/2,width:156};state.stickers.push(a);selected=a.id;});setPanel("stickers");}
  catch(_){if(url)URL.revokeObjectURL(url);if(epoch===request)note(tr("Не вдалося додати стікер.","Could not add sticker."));}finally{if(epoch===request){stickerBusy=false;render();}}
 }
 async function loadFile(picked){
  if(!picked||publishing||loading)return;const videoType=["video/mp4","video/webm"].includes(picked.type),imageType=["image/jpeg","image/png","image/webp"].includes(picked.type);
  if((!videoType&&!imageType)||!picked.size||picked.size>(videoType?52428800:6291456)){note(tr("Виберіть фото JPEG, PNG, WebP до 6 МБ або відео MP4, WebM до 50 МБ.","Choose JPEG, PNG, WebP up to 6 MB or MP4, WebM up to 50 MB."));file.value="";return;}
  const epoch=++request;stickerBusy=false;loading=true;note("");render();let url=URL.createObjectURL(picked),img=null;
  try{if(imageType){img=new Image();img.src=url;await img.decode();}if(epoch!==request||!dialog.open){URL.revokeObjectURL(url);return;}
   checkpoint();state.media=addAsset(picked,img,url);url=null;state.kind=videoType?"video":"image";state.caption="";state.texts=[];state.stickers=[];state.strokes=[];state.filter=0;state.adjust=fresh().adjust;selected=null;active="text";
  }catch(_){if(url)URL.revokeObjectURL(url);note(tr("Не вдалося відкрити файл.","Could not open the file."));}finally{if(epoch===request){loading=false;file.value="";render();setPanel(active);}}
 }
 file.addEventListener("change",()=>void loadFile(file.files?.[0]));
 for(const type of ["dragenter","dragover","dragleave","drop"])surface.addEventListener(type,event=>{event.preventDefault();if(type==="dragenter"||type==="dragover")surface.dataset.drag="true";else delete surface.dataset.drag;if(type==="drop")void loadFile(event.dataTransfer?.files?.[0]);});
 const point=event=>{const r=canvas.getBoundingClientRect();return{x:clamp((event.clientX-r.left)*W/r.width,0,W),y:clamp((event.clientY-r.top)*H/r.height,0,H)};};
 canvas.addEventListener("pointerdown",event=>{
  if(publishing||loading||!event.isPrimary||event.button!==0)return;event.preventDefault();const p=point(event);
  if(active==="brush"){if(state.strokes.length>=80)return;checkpoint();const stroke={color:brush.color,width:brush.width,opacity:brush.opacity,points:[p]};state.strokes.push(stroke);pointer={id:event.pointerId,stroke};}
  else{const ctx=canvas.getContext("2d");let layer=null,type=null;for(const a of [...state.texts].reverse()){const m=textMetrics(ctx,a);if(Math.abs(p.x-a.x)<m.w/2+12&&Math.abs(p.y-a.y)<m.h/2+12){layer=a;type="text";break;}}if(!layer)for(const a of [...state.stickers].reverse()){const img=assets.get(a.asset)?.img,h=img?a.width*img.naturalHeight/img.naturalWidth:a.width;if(Math.abs(p.x-a.x)<a.width/2+12&&Math.abs(p.y-a.y)<h/2+12){layer=a;type="stickers";break;}}if(!layer){selected=null;setPanel(active);return;}selected=layer.id;checkpoint();pointer={id:event.pointerId,layer,dx:layer.x-p.x,dy:layer.y-p.y};setPanel(type);}
  canvas.setPointerCapture(event.pointerId);render();
 });
 canvas.addEventListener("pointermove",event=>{if(!pointer||pointer.id!==event.pointerId)return;const p=point(event);if(pointer.stroke){if(pointer.stroke.points.length<2000)pointer.stroke.points.push(p);}else{pointer.layer.x=clamp(p.x+pointer.dx,0,W);pointer.layer.y=clamp(p.y+pointer.dy,0,H);}render();});
 for(const type of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(type,()=>{pointer=null;});
 form.addEventListener("submit",async event=>{
  event.preventDefault();if(save.disabled||publishing||!hasArt())return;publishing=true;note("");render();let uploaded=null,inserted=false;
  try{let fileToPublish,body="";
   if(state.kind==="video"){fileToPublish=assets.get(state.media)?.file;body=state.caption.trim();}
   else{await document.fonts?.ready;const out=document.createElement("canvas");out.width=1080;out.height=1920;draw(out);let blob=await new Promise(resolve=>out.toBlob(resolve,"image/webp",.91));if(!blob||!["image/webp","image/png","image/jpeg"].includes(blob.type)||blob.size>6291456)throw Error("Story encoding failed");const ext=blob.type==="image/webp"?"webp":blob.type==="image/jpeg"?"jpg":"png";fileToPublish=new File([blob],"vatra-story."+ext,{type:blob.type});}
   if(!fileToPublish)throw Error("Missing story media");
   uploaded=await window.VATRA_POST_MEDIA.uploadStory(client,id,fileToPublish);
   const {error:insertError}=await client.from("stories").insert({author_vatra_id:String(id),body,theme:0,media_kind:uploaded.media_kind,media_path:uploaded.media_path});
   if(insertError)throw insertError;inserted=true;
  }catch(error){if(uploaded&&!inserted)try{await window.VATRA_POST_MEDIA.remove(client,uploaded);}catch(_){}note(error?.code==="23514"?tr("Не вдалося зберегти медіафайл історії. Повторіть спробу з новим файлом.","The story media failed validation. Try again with a new file."):tr("Не вдалося опублікувати історію. Спробуйте ще раз.","Could not publish the story. Try again."));}
  finally{publishing=false;render();}
  if(inserted){dialog.close();reset();try{onPublished?.();}catch(_){}}
 });
 trigger.addEventListener("click",()=>{if(dialog.open)return;reset();dialog.showModal();});
 dialog.addEventListener("cancel",event=>{if(publishing)event.preventDefault();});
 dialog.addEventListener("close",()=>{if(!dialog.open&&!publishing)reset();});
 render();setPanel("text");
}
window.VATRA_STORY_EDITOR=Object.freeze({mount});
})();