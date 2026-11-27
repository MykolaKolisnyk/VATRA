(()=>{
"use strict";
const active=new WeakMap(),duration=7000;
const labels={uk:["Перебіг історії","Призупинити історію","Продовжити історію"],en:["Story progress","Pause story","Resume story"],pl:["Postęp relacji","Wstrzymaj relację","Wznów relację"],de:["Story-Fortschritt","Story pausieren","Story fortsetzen"],fr:["Progression de la story","Mettre en pause","Reprendre la story"],it:["Avanzamento della storia","Metti in pausa","Riprendi la storia"],ka:["ისტორიის პროგრესი","ისტორიის შეჩერება","ისტორიის გაგრძელება"],bg:["Напредък на историята","Пауза на историята","Продължи историята"]};
function stop(dialog){
 const state=active.get(dialog);if(!state)return;
 active.delete(dialog);clearInterval(state.timer);
 state.button.removeEventListener("click",state.toggle);
 dialog.removeEventListener("close",state.close);
 document.removeEventListener("visibilitychange",state.visibility);
 state.row.hidden=true;state.bar.value=0;
}
function start(dialog,slot,story,onComplete,blocked=()=>false){
 stop(dialog);
 const row=dialog.querySelector(".ui-vatra-story-progress-001");
 if(!row)return;
 const bar=row.querySelector("progress"),button=row.querySelector("button");
 if(!bar||!button)return;
 const words=labels[String(window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk").split("-")[0]]||labels.uk;
 const videoStory=story.media_kind==="video"&&!!story.media_path;
 const imageStory=story.media_kind==="image"&&!!story.media_path;
 let elapsed=0,last=performance.now(),paused=false;
 row.hidden=false;bar.value=0;bar.setAttribute("aria-label",words[0]);button.hidden=videoStory;
 const sync=()=>{button.setAttribute("aria-pressed",String(paused));button.setAttribute("aria-label",words[paused?2:1]);button.title=words[paused?2:1];};
 const toggle=()=>{paused=!paused;last=performance.now();sync();};
 const close=()=>{if(!dialog.open)stop(dialog);};
 const visibility=()=>{last=performance.now();};
 const state={row,bar,button,toggle,close,visibility,timer:0};
 const finish=()=>{if(active.get(dialog)!==state)return;stop(dialog);onComplete();};
 const tick=()=>{
  if(active.get(dialog)!==state)return;
  if(!dialog.open){stop(dialog);return;}
  const now=performance.now(),delta=Math.max(0,Math.min(250,now-last));last=now;
  const hold=paused||document.hidden||blocked();
  if(videoStory){
   const video=slot.querySelector("video");if(!video)return;
   if(Number.isFinite(video.duration)&&video.duration>0)bar.value=Math.max(0,Math.min(1,video.currentTime/video.duration));
   if(video.ended&&!hold)finish();
   return;
  }
  if(imageStory){const img=slot.querySelector("img");if(!img?.complete||!img.naturalWidth)return;}
  if(hold)return;
  elapsed+=delta;bar.value=Math.min(1,elapsed/duration);
  if(elapsed>=duration)finish();
 };
 active.set(dialog,state);sync();button.addEventListener("click",toggle);
 dialog.addEventListener("close",close);document.addEventListener("visibilitychange",visibility);
 state.timer=setInterval(tick,100);
}
window.VATRA_STORY_PROGRESS={start,stop};
})();
