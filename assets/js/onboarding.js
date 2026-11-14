/* VATRA first-visit walkthrough. Local per-member progress; no automatic API calls. */
(()=>{
"use strict";
const KEY="vatra.onboarding.v1.member.",MAX_AGE_MS=30*24*60*60*1000;
const ART="/VATRA/assets/vatryk/";
const steps=[
 {selector:".ui-social-top-feed-001",title:"Твоя стрічка",detail:"Тут з’являються історії та дописи людей, за якими ти стежиш.",art:"vatryk_waiting.png"},
 {selector:"#feed-compose-open",title:"Розкажи свою історію",detail:"Створи допис із текстом, фото або відео. Нічого не публікується без твого підтвердження.",art:"vatryk_explanation.png"},
 {selector:".feed-account-toggle",title:"Твоя сторінка",detail:"У меню акаунта знайдеш профіль. Додай аватар, обкладинку та розкажи про себе.",art:"vatryk_explanation.png"},
 {selector:"#feed-search-form",title:"Знайди своїх людей",detail:"Пошук допоможе знайти людей, спільноти й цікаві дописи.",art:"vatryk_explanation.png"},
 {selector:".ui-social-top-friends-001",title:"Друзі",detail:"Заявки в друзі можна надсилати зі сторінок людей. Окремий розділ друзів ще розробляється.",art:"vatryk_waiting.png"},
 {selector:".ui-social-top-communities-001",title:"Спільноти",detail:"Приєднуйся до спільнот, які відповідають твоїм інтересам.",art:"vatryk_explanation.png"},
 {selector:".ui-feed-notifications-button-001",title:"Сповіщення",detail:"Тут можна переглядати нові події у VATRA.",art:"vatryk_explanation.png"},
 {selector:".feed-account-toggle",title:"Приватність під твоїм контролем",detail:"На своїй сторінці можна керувати видимістю профілю та взаємодією з іншими.",art:"vatryk_explanation.png"}
];
const tasks=[
 {title:"Додай фотографію профілю",page:"profile",key:"avatar"},
 {title:"Оформи обкладинку",page:"profile",key:"cover"},
 {title:"Напиши перший допис",page:"feed",key:"post"},
 {title:"Знайди першого друга",page:"feed",key:"friend"},
 {title:"Приєднайся до спільноти",page:"communities",key:"community"}
];
const validId=id=>/^[1-9][0-9]{0,18}$/.test(String(id??""));
const recentSignup=(date,now=Date.now())=>{
 const ts=Date.parse(String(date||""));
 return Number.isFinite(ts)&&ts<=now&&now-ts<=MAX_AGE_MS;
};
const storedKey=id=>validId(id)?KEY+String(id):null;
const readState=(store,id)=>{
 const key=storedKey(id);if(!key)return null;
 try{
  const state=JSON.parse(store.getItem(key)||"null");
  if(!state||!["paused","done","skipped"].includes(state.status))return null;
  return {status:state.status,step:Number.isInteger(state.step)?
   Math.max(0,Math.min(steps.length-1,state.step)):0};
 }catch(_){return null;}
};
const saveState=(store,id,status,step)=>{
 const key=storedKey(id);if(!key)return false;
 try{store.setItem(key,JSON.stringify({status,step,version:1}));return true;}
 catch(_){return false;}
};
const tr=text=>window.VATRA_LANGUAGE?.translate?.(text)||text;
const node=(tag,css,content)=>{
 const element=document.createElement(tag);element.className=css;
 if(content!==undefined)element.textContent=content;
 return element;
};
let session=null,root=null,card=null,spotlight=null,art=null,label=null;
let heading=null,description=null,progress=null,prev=null,next=null,skip=null;
let tasksBox=null,taskStatus=null,refresh=null,taskRows=[],mode="welcome",index=0;
let replaying=false,lastFocus=null,raf=0,authSubscription=null;
let checkedAt=0,checking=null,results=null;
const home=()=>new URL("./",location.href);
function stop(){
 if(raf){cancelAnimationFrame(raf);raf=0;}
 if(root){root.remove();root=null;}
 document.removeEventListener("keydown",onKeydown,true);
 window.removeEventListener("resize",schedulePosition);
 window.removeEventListener("scroll",schedulePosition,true);
 authSubscription?.unsubscribe?.();authSubscription=null;
 card=null;spotlight=null;art=null;session=null;checking=null;results=null;
 replaying=false;checkedAt=0;taskRows=[];
 if(lastFocus?.isConnected&&typeof lastFocus.focus==="function")lastFocus.focus();
 lastFocus=null;
}
function hide(){
 if(!root)return;
 root.hidden=true;
 document.removeEventListener("keydown",onKeydown,true);
 window.removeEventListener("resize",schedulePosition);
 window.removeEventListener("scroll",schedulePosition,true);
 spotlight.hidden=true;
 if(lastFocus?.isConnected&&typeof lastFocus.focus==="function")lastFocus.focus();
 lastFocus=null;
}
function pause(status="paused"){
 if(session&&!replaying)saveState(localStorage,session.id,status,index);
 hide();
}
function onKeydown(event){
 if(!root||root.hidden)return;
 if(event.key==="Escape"){
  event.preventDefault();pause();return;
 }
 if(event.key!=="Tab")return;
 const focusable=[...card.querySelectorAll('button:not([hidden]):not([disabled]),a[href]:not([hidden])')]
  .filter(el=>el.getClientRects().length>0);
 if(!focusable.length)return;
 const first=focusable[0],last=focusable[focusable.length-1];
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}
function schedulePosition(){
 if(raf||!root||root.hidden)return;
 raf=requestAnimationFrame(()=>{raf=0;position();});
}
function position(){
 if(!root||root.hidden||!card)return;
 if(mode!=="tour"){spotlight.hidden=true;card.style.removeProperty("left");
  card.style.removeProperty("top");card.classList.remove("vt-tour-anchored-001");return;}
 const anchor=document.querySelector(steps[index]?.selector);
 if(!anchor||!anchor.getClientRects().length){
  spotlight.hidden=true;card.classList.remove("vt-tour-anchored-001");
  card.style.removeProperty("left");card.style.removeProperty("top");
  root.dataset.stage="fallback";return;
 }
 const rect=anchor.getBoundingClientRect(),edge=12,margin=13;
 const width=Math.min(390,innerWidth-24),height=card.getBoundingClientRect().height||310;
 spotlight.hidden=false;
 const left=Math.max(0,rect.left-5),top=Math.max(0,rect.top-5);
 spotlight.style.left=left+"px";spotlight.style.top=top+"px";
 spotlight.style.width=Math.min(innerWidth-left,rect.width+10)+"px";
 spotlight.style.height=Math.min(innerHeight-top,rect.height+10)+"px";
 const cardLeft=Math.max(edge,Math.min(innerWidth-width-edge,
  rect.left+rect.width/2-width/2));
 const below=rect.bottom+margin,above=rect.top-height-margin;
 const cardTop=below+height<=innerHeight-edge?below:
  above>=edge?above:Math.max(edge,(innerHeight-height)/2);
 card.style.left=cardLeft+"px";card.style.top=cardTop+"px";
 card.classList.add("vt-tour-anchored-001");
}
function activate(nextMode,nextIndex=index){
 if(!session)return;
 mode=nextMode;index=Math.max(0,Math.min(steps.length-1,nextIndex));
 show();
 if(mode==="tasks")void checkTasks();
}
function show(){
 if(!session)return;
 if(!root)build();
 root.dataset.stage=mode;
 if(root.hidden){
  lastFocus=document.activeElement;
  root.hidden=false;
  document.addEventListener("keydown",onKeydown,true);
  window.addEventListener("resize",schedulePosition);
  window.addEventListener("scroll",schedulePosition,true);
 }
 tasksBox.hidden=mode!=="tasks";
 progress.hidden=mode!=="tour";
 prev.hidden=mode!=="tour"||index===0;
 skip.hidden=mode==="tasks"||mode==="goodbye";
 refresh.hidden=mode!=="tasks";
 card.classList.toggle("vt-tour-tasks-001",mode==="tasks");
 card.classList.toggle("vt-tour-intro-001",mode==="welcome"||mode==="goodbye");
 const current=steps[index];
 art.src=ART+(mode==="welcome"?"vatryk_welcome.png":
  mode==="goodbye"?"vatryk_goodbye.png":
  mode==="tasks"?(results?.every(Boolean)?"vatryk_success.png":"vatryk_waiting.png"):
  current.art);
 art.alt=tr("Ватрик — помічник VATRA");
 label.textContent=mode==="tour"?tr("Крок")+" "+(index+1)+" / "+steps.length:
  mode==="tasks"?tr("Твій початок у VATRA"):tr("Знайомство з VATRA");
 heading.textContent=mode==="welcome"?tr("Привіт! Ласкаво просимо до VATRA!"):
  mode==="goodbye"?tr("Тепер ти знаєш основне!"):
  mode==="tasks"?tr("Твої перші досягнення"):tr(current.title);
 description.textContent=mode==="welcome"?
  tr("Я Ватрик. Покажу тобі стрічку та допоможу знайти своїх людей. Усе можна пропустити."):
  mode==="goodbye"?tr("Досліджуй VATRA, ділися історіями та повертайся до підказок коли захочеш."):
  mode==="tasks"?tr("Виконуй завдання у своєму темпі. VATRA перевіряє їх лише коли ти відкриваєш цей список або натискаєш «Оновити»."):
  tr(current.detail);
 next.textContent=mode==="welcome"?tr("Почати знайомство"):
  mode==="tour"?(index===steps.length-1?tr("Завершити екскурсію"):tr("Далі")):
  mode==="goodbye"?tr("До перших завдань"):tr("До моєї VATRA");
 prev.textContent=tr("Назад");skip.textContent=tr("Пропустити");
 refresh.textContent=tr("Оновити прогрес");
 if(mode==="tour"){
  progress.textContent=tr("Крок")+" "+(index+1)+" "+tr("із")+" "+steps.length;
  if(!replaying)saveState(localStorage,session.id,"paused",index);
 }
 if(mode==="tasks")renderTasks();
 schedulePosition();
 next.focus({preventScroll:true});
}
function finish(){
 if(!replaying&&session)saveState(localStorage,session.id,"done",steps.length-1);
 replaying=false;activate("goodbye");
}
function skipTour(){
 if(!replaying&&session)saveState(localStorage,session.id,"skipped",index);
 replaying=false;activate("tasks");
}
function proceed(){
 if(mode==="welcome"){activate("tour",replaying?0:(readState(localStorage,session.id)?.step||0));return;}
 if(mode==="tour"){
  if(index+1<steps.length)activate("tour",index+1);
  else finish();
  return;
 }
 if(mode==="goodbye"){activate("tasks");return;}
 hide();
}
function back(){
 if(mode!=="tour")return;
 if(index>0)activate("tour",index-1);else activate("welcome");
}
function build(){
 root=node("div","vt-tour-root-001");root.id="vatra-tour-dialog";root.hidden=true;
 root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");
 root.setAttribute("aria-labelledby","vatra-tour-title");
 root.setAttribute("aria-describedby","vatra-tour-description");
 const shield=node("div","vt-tour-shield-001");
 shield.setAttribute("aria-hidden","true");
 shield.addEventListener("click",()=>pause());
 spotlight=node("div","vt-tour-spotlight-001");spotlight.hidden=true;
 spotlight.setAttribute("aria-hidden","true");
 card=node("section","vt-tour-card-001");
 const top=node("div","vt-tour-header-001");
 art=node("img","vt-tour-mascot-001");art.decoding="async";art.width=168;art.height=168;
 label=node("p","vt-tour-eyebrow-001");
 const words=node("div","vt-tour-words-001");
 heading=node("h2","vt-tour-heading-001");heading.id="vatra-tour-title";
 description=node("p","vt-tour-description-001");description.id="vatra-tour-description";
 words.append(label,heading,description);
 top.append(art,words);card.append(top);
 progress=node("p","vt-tour-progress-001");card.append(progress);
 tasksBox=node("div","vt-tour-checklist-001");
 const meter=node("div","vt-tour-meter-001");
 const track=node("div","vt-tour-meter-track-001");
 const fill=node("div","vt-tour-meter-fill-001");fill.id="vatra-tour-meter";
 track.append(fill);meter.append(track);
 taskStatus=node("p","vt-tour-task-status-001");taskStatus.setAttribute("aria-live","polite");
 tasksBox.append(meter,taskStatus);
 for(let i=0;i<tasks.length;i++){
  const row=node("a","vt-tour-task-00"+(i+1));row.href=new URL(tasks[i].page,home()).href;
  const marker=node("span","vt-tour-task-mark-00"+(i+1),"○");
  const title=node("span","vt-tour-task-name-00"+(i+1));
  const status=node("small","vt-tour-task-note-00"+(i+1));
  row.append(marker,title,status);tasksBox.append(row);
  taskRows.push({row,marker,title,status});
 }
 card.append(tasksBox);
 const actions=node("div","vt-tour-actions-001");
 prev=node("button","vt-tour-back-001");prev.type="button";prev.addEventListener("click",back);
 skip=node("button","vt-tour-skip-001");skip.type="button";skip.addEventListener("click",skipTour);
 refresh=node("button","vt-tour-refresh-001");refresh.type="button";
 refresh.addEventListener("click",()=>void checkTasks(true));
 next=node("button","vt-tour-next-001");next.type="button";next.addEventListener("click",proceed);
 actions.append(prev,skip,refresh,next);card.append(actions);
 root.append(shield,spotlight,card);document.body.append(root);
}
function renderTasks(){
 if(!tasksBox||!session)return;
 const num=results?.filter(Boolean).length||0;
 const fill=document.querySelector("#vatra-tour-meter");
 if(fill)fill.style.width=(num/tasks.length*100)+"%";
 taskStatus.textContent=checking?tr("Перевіряємо перші досягнення…"):
  tr("Виконано")+" "+num+" / "+tasks.length;
 for(let i=0;i<tasks.length;i++){
  const row=taskRows[i],complete=!!results?.[i];
  row.title.textContent=tr(tasks[i].title);
  row.marker.textContent=complete?"✓":"○";
  row.status.textContent=complete?tr("Виконано"):tr("Перейти");
  row.row.classList.toggle("vt-tour-task-done-001",complete);
  if(tasks[i].page==="profile")row.row.href=new URL("id"+session.id,home()).href;
  else row.row.href=new URL(tasks[i].page,home()).href;
 }
 if(mode==="tasks"){
  const desired=results?.every(Boolean)?"vatryk_success.png":"vatryk_waiting.png";
  if(!art.src.endsWith(desired))art.src=ART+desired;
 }
}
async function checkTasks(force=false){
 if(!session||mode!=="tasks"||!session.client)return;
 if(checking)return checking;
 if(!force&&results&&Date.now()-checkedAt<60000){renderTasks();return;}
 const client=session.client,id=session.id,epoch=session;
 checking=(async()=>{
  try{
   const lookups=[
    client.from("profile_media").select("avatar_path,cover_path").eq("vatra_id",id).maybeSingle(),
    client.from("feed_posts").select("id").eq("author_vatra_id",id).limit(1),
    client.from("friendships").select("id").or("requester_id.eq."+id+",recipient_id.eq."+id)
     .eq("status","accepted").limit(1),
    client.from("community_follows").select("club_id").eq("member_vatra_id",id).limit(1)
   ];
   const response=await Promise.allSettled(lookups);
   if(epoch!==session)return;
   const data=i=>response[i].status==="fulfilled"&&!response[i].value.error?
    response[i].value.data:null;
   const media=data(0);
   results=[!!media?.avatar_path,!!media?.cover_path,
    !!data(1)?.length,!!data(2)?.length,!!data(3)?.length];
   checkedAt=Date.now();
  }catch(_){if(epoch===session)results=null;}
  finally{if(epoch===session){checking=null;if(mode==="tasks")renderTasks();}}
 })();
 renderTasks();return checking;
}
function start(options={}){
 const id=String(options.memberId||"");
 if(!validId(id)||!options.client||document.body.dataset.feedReady!=="true")return false;
 if(session?.id===id)return true;
 stop();
 session={id,client:options.client};
 const saved=readState(localStorage,id);
 const eligible=recentSignup(options.createdAt);
 if(typeof options.client.auth?.onAuthStateChange==="function"){
  const {data}=options.client.auth.onAuthStateChange(event=>{
   if(event!=="INITIAL_SESSION"&&event!=="TOKEN_REFRESHED")stop();
  });
  authSubscription=data?.subscription||null;
 }
 // Do not force older accounts into onboarding. A user who pauses an eligible
 // first tour can resume it; skipping/completing permanently disables auto-open.
 if(eligible&&(!saved||saved.status==="paused")){
  index=saved?.step||0;mode=saved?.status==="paused"?"tour":"welcome";
  show();
 }
 return true;
}
function replay(){
 if(!session)return;
 replaying=true;index=0;activate("welcome",0);
}
function openTasks(){
 if(!session)return;
 replaying=true;activate("tasks");
}
window.VATRA_ONBOARDING={start,stop,replay,openTasks};
// Pure decisions are exposed only for hermetic smoke tests.
window.VATRA_ONBOARDING_STATE={recentSignup,storedKey,readState,saveState};
})();