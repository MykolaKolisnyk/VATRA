(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const labels={
uk:["Відтворити","Пауза","Вимкнути звук","Увімкнути звук","Гучність","Позиція відео","Швидкість","На весь екран","Вийти з повноекранного режиму","Картинка в картинці","Відеоплеєр VATRA","Не вдалося відтворити відео."],
en:["Play","Pause","Mute","Unmute","Volume","Video position","Playback speed","Fullscreen","Exit fullscreen","Picture in picture","VATRA video player","Could not play video."],
pl:["Odtwórz","Wstrzymaj","Wycisz","Włącz dźwięk","Głośność","Pozycja filmu","Prędkość","Pełny ekran","Zamknij pełny ekran","Obraz w obrazie","Odtwarzacz VATRA","Nie udało się odtworzyć filmu."],
de:["Wiedergabe","Pause","Stummschalten","Ton einschalten","Lautstärke","Videoposition","Geschwindigkeit","Vollbild","Vollbild beenden","Bild im Bild","VATRA-Videoplayer","Video konnte nicht abgespielt werden."],
fr:["Lire","Pause","Couper le son","Activer le son","Volume","Position vidéo","Vitesse","Plein écran","Quitter le plein écran","Image dans l’image","Lecteur vidéo VATRA","Impossible de lire la vidéo."],
it:["Riproduci","Pausa","Disattiva audio","Attiva audio","Volume","Posizione video","Velocità","Schermo intero","Esci da schermo intero","Picture in picture","Lettore video VATRA","Impossibile riprodurre il video."],
ka:["დაკვრა","პაუზა","ხმის გამორთვა","ხმის ჩართვა","ხმის დონე","ვიდეოს პოზიცია","სიჩქარე","სრულ ეკრანზე","სრული ეკრანიდან გამოსვლა","სურათი სურათში","VATRA ვიდეოპლეერი","ვიდეოს დაკვრა ვერ მოხერხდა."],
bg:["Възпроизвеждане","Пауза","Спиране на звука","Включване на звука","Сила на звука","Позиция на видеото","Скорост","Цял екран","Изход от цял екран","Картина в картината","Видео плейър VATRA","Видеото не може да се възпроизведе."]};
const icons={play:"M8 5v14l11-7z",pause:"M9 5v14M15 5v14",sound:"M3 9h4l5-4v14l-5-4H3zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",mute:"M3 9h4l5-4v14l-5-4H3zM16 9l6 6m0-6-6 6",full:"M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",exit:"M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5",pip:"M3 5h18v14H3zM13 12h6v5h-6z"};
const instances=new WeakMap();
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function time(value){if(!Number.isFinite(value)||value<0)return "0:00";const n=Math.floor(value),s=String(n%60).padStart(2,"0"),m=Math.floor(n/60)%60,h=Math.floor(n/3600);return h?h+":"+String(m).padStart(2,"0")+":"+s:m+":"+s;}
function volumePreference(){try{const raw=localStorage.getItem("vatra:player-volume");if(raw===null)return 1;const n=Number(raw);return Number.isFinite(n)?clamp(n,0,1):1;}catch(_){return 1;}}
function attach(video,{mode="inline",onExpand}={}){
 if(!video?.parentNode||instances.has(video))return instances.get(video)?.root||null;
 const words=labels[window.VATRA_LANGUAGE?.locale||document.documentElement.lang]||labels.uk;
 const make=(tag,part)=>{const el=document.createElement(tag);el.className="vatra-player-"+part+"-001";return el;};
 const root=make("div","root");root.dataset.mode=mode;root.setAttribute("role","group");root.setAttribute("aria-label",words[10]);root.tabIndex=0;
 const controls=make("div","controls"),bar=make("div","bar"),left=make("div","left"),right=make("div","right"),clock=make("span","time"),status=make("span","status");
 status.setAttribute("role","status");status.hidden=true;
 const setIcon=(button,key,label)=>{const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),p=document.createElementNS(svg.namespaceURI,"path");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("aria-hidden","true");p.setAttribute("d",icons[key]);svg.append(p);button.replaceChildren(svg);button.title=label;button.setAttribute("aria-label",label);};
 const button=(part,key,label,fn)=>{const b=make("button",part);b.type="button";setIcon(b,key,label);b.addEventListener("click",fn);return b;};
 const showError=()=>{status.textContent=words[11];status.hidden=false;};
 const toggle=()=>{if(video.paused||video.ended){status.hidden=true;try{Promise.resolve(video.play()).catch(showError);}catch(_){showError();}}else video.pause();};
 const play=button("play","play",words[0],toggle),mute=button("mute","sound",words[2],()=>{video.muted=!video.muted;if(!video.muted&&video.volume===0)video.volume=.5;});
 const seek=make("input","seek");seek.type="range";seek.min="0";seek.max="1";seek.step="any";seek.value="0";seek.disabled=true;seek.setAttribute("aria-label",words[5]);
 const volume=make("input","volume");volume.type="range";volume.min="0";volume.max="1";volume.step=".05";volume.setAttribute("aria-label",words[4]);
 const speed=make("select","speed");speed.setAttribute("aria-label",words[6]);speed.title=words[6];
 for(const rate of [.5,.75,1,1.25,1.5,2]){const o=document.createElement("option");o.value=String(rate);o.textContent=rate+"×";speed.append(o);}speed.value="1";
 const isFull=()=>document.fullscreenElement===root||document.webkitFullscreenElement===root;
 const full=button("fullscreen","full",words[7],async()=>{try{if(isFull()){const exit=document.exitFullscreen||document.webkitExitFullscreen;await exit?.call(document);}else if(root.requestFullscreen)await root.requestFullscreen();else if(root.webkitRequestFullscreen)root.webkitRequestFullscreen();else if(typeof video.webkitEnterFullscreen==="function")video.webkitEnterFullscreen();else onExpand?.();}catch(_){if(!isFull())onExpand?.();}});
 full.hidden=!(root.requestFullscreen||root.webkitRequestFullscreen||video.webkitEnterFullscreen||onExpand);
 const pip=button("pip","pip",words[9],async()=>{try{if(document.pictureInPictureElement===video)await document.exitPictureInPicture();else await video.requestPictureInPicture();}catch(_){}});
 pip.hidden=!(document.pictureInPictureEnabled&&typeof video.requestPictureInPicture==="function");
 let timer=0;const reveal=()=>{root.classList.remove("is-controls-hidden");clearTimeout(timer);if(!video.paused&&!video.ended)timer=setTimeout(()=>{if(root.isConnected&&!root.matches(":focus-within")&&!controls.matches(":hover"))root.classList.add("is-controls-hidden");},2800);};
 const updateTime=()=>{const d=video.duration,valid=Number.isFinite(d)&&d>0;seek.disabled=!valid;seek.max=valid?String(d):"1";seek.value=valid?String(clamp(video.currentTime||0,0,d)):"0";clock.textContent=time(video.currentTime)+" / "+time(d);seek.setAttribute("aria-valuetext",clock.textContent);seek.style.setProperty("--vatra-player-progress",valid?(100*Number(seek.value)/d)+"%":"0%");};
 const updatePlay=()=>{const paused=video.paused||video.ended;setIcon(play,paused?"play":"pause",words[paused?0:1]);root.classList.toggle("is-paused",paused);reveal();};
 const updateVolume=()=>{const silent=video.muted||video.volume===0;volume.value=String(video.muted?0:video.volume);setIcon(mute,silent?"mute":"sound",words[silent?3:2]);try{localStorage.setItem("vatra:player-volume",String(video.volume));}catch(_){}};
 const seekBy=n=>{if(Number.isFinite(video.duration)&&video.duration>0)video.currentTime=clamp(video.currentTime+n,0,video.duration);};
 seek.addEventListener("input",()=>{if(Number.isFinite(video.duration)&&video.duration>0)video.currentTime=clamp(Number(seek.value),0,video.duration);updateTime();});
 volume.addEventListener("input",()=>{video.volume=clamp(Number(volume.value),0,1);video.muted=false;updateVolume();});
 speed.addEventListener("change",()=>{video.playbackRate=Number(speed.value);});
 for(const event of ["timeupdate","durationchange","loadedmetadata","progress","seeking"])video.addEventListener(event,updateTime);
 for(const event of ["play","pause","ended"])video.addEventListener(event,updatePlay);
 video.addEventListener("volumechange",updateVolume);video.addEventListener("ratechange",()=>{speed.value=String(video.playbackRate);});
 video.addEventListener("playing",()=>{status.hidden=true;});
 video.addEventListener("click",toggle);
 for(const event of ["pointermove","pointerdown","focusin","focusout","pointerleave"])root.addEventListener(event,reveal);
 for(const event of ["fullscreenchange","webkitfullscreenchange"])root.addEventListener(event,()=>{setIcon(full,isFull()?"exit":"full",words[isFull()?8:7]);reveal();});
 root.addEventListener("keydown",e=>{if(e.target!==root||e.altKey||e.ctrlKey||e.metaKey)return;const k=e.key.toLowerCase();if(![" ","k","m","f","arrowleft","arrowright","arrowup","arrowdown"].includes(k))return;e.preventDefault();e.stopPropagation();if(k===" "||k==="k")toggle();else if(k==="m")mute.click();else if(k==="f")full.click();else if(k==="arrowleft")seekBy(-5);else if(k==="arrowright")seekBy(5);else{video.muted=false;video.volume=clamp(video.volume+(k==="arrowup"?.1:-.1),0,1);}reveal();});
 left.append(play,mute,volume,clock);right.append(speed,pip,full);bar.append(left,right);controls.append(seek,bar);root.append(controls,status);
 // Preserve native controls if styles or enhancement cannot be installed.
 const parent=video.parentNode;parent.insertBefore(root,video);root.prepend(video);
 video.volume=volumePreference();updateVolume();updateTime();updatePlay();video.controls=false;
 instances.set(video,{root});return root;
}
window.VATRA_PLAYER={attach};
})();
