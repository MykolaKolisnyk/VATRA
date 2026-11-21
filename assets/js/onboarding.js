
(()=>{
"use strict";
const KEY="vatra.onboarding.v1.member.",MAX_AGE_MS=30*24*60*60*1000;
const ART="/VATRA/assets/vatryk/";
const steps=[
 {selector:"#feed-search-form",title:"Пошук у VATRA",detail:"Шукай людей, спільноти та цікаві публікації за назвою або словами.",art:"vatryk_explanation.webp"},
 {selector:".ui-social-top-feed-001",title:"Твоя стрічка",detail:"Тут з’являються дописи й історії людей, за якими ти стежиш.",art:"vatryk_waiting.webp"},
 {selector:".ui-social-top-friends-001",title:"Друзі",detail:"Знаходь друзів, переглядай запити та дізнавайся, хто онлайн.",art:"vatryk_explanation.webp"},
 {selector:".ui-social-top-communities-001",title:"Спільноти",detail:"Знаходь однодумців і приєднуйся до спільнот за інтересами.",art:"vatryk_explanation.webp"},
 {selector:".ui-social-top-clips-001",title:"Кліпи",detail:"Переглядай короткі відео та публікуй власні кліпи.",art:"vatryk_waiting.webp"},
 {selector:".ui-social-top-marketplace-001",title:"Маркетплейс",detail:"Знаходь товари, створюй оголошення та зв’язуйся з продавцями.",art:"vatryk_waiting.webp"},
 {selector:".ui-shell-header-messenger-001",title:"Повідомлення",detail:"Тут буде повноцінне особисте листування. Месенджер ще розробляється.",art:"vatryk_waiting.webp"},
 {selector:".ui-feed-notifications-button-001",title:"Сповіщення",detail:"Сповіщення допоможуть стежити за подіями й відповідями. Можливості розділу доповнюються.",art:"vatryk_explanation.webp"},
 {selector:".ui-feed-music-button-001",title:"Музика",detail:"Тут з’явиться музичний простір VATRA. Функція ще в розробці.",art:"vatryk_waiting.webp"},
 {selector:".feed-account-toggle",title:"Твій профіль",detail:"У меню акаунта відкрий свою сторінку, щоб додати фото, обкладинку й інформацію про себе.",art:"vatryk_explanation.webp"},
 {selector:".feed-account-toggle",title:"Приватність",detail:"У профілі можна керувати видимістю сторінки та взаємодією з іншими.",art:"vatryk_explanation.webp"},
 {selector:"#feed-filter-toggle",title:"Фільтр стрічки",detail:"Обирай, які публікації переглядати: усі, від друзів чи зі спільнот.",art:"vatryk_explanation.webp"},
 {selector:"#feed-compose-open",title:"Створи перший допис",detail:"Додай текст, фото чи відео. Нічого не публікується без твого підтвердження.",art:"vatryk_explanation.webp"},
 {selector:"#feed-create-story",title:"Твої історії",detail:"Поділися моментом у короткій історії. Історії зникають через 24 години.",art:"vatryk_success.webp"}
];
const tasks=[
 {title:"Додай фотографію профілю",page:"profile",key:"avatar"},
 {title:"Оформи обкладинку",page:"profile",key:"cover"},
 {title:"Напиши перший допис",page:"feed",key:"post"},
 {title:"Знайди першого друга",page:"friends",key:"friend"},
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
const shouldSaveSkip=(wasReplaying,previous)=>!wasReplaying||!["done","skipped"].includes(previous?.status);
const milestoneSnapshot=response=>{
 const verified=i=>response[i]?.status==="fulfilled"&&response[i].value!=null&&
  !response[i].value.error;
 const data=i=>response[i].value.data;
 const media=verified(0)?data(0):null;
 return [
  verified(0)?!!media?.avatar_path:null,
  verified(0)?!!media?.cover_path:null,
  verified(1)?!!data(1)?.length:null,
  verified(2)?!!data(2)?.length:null,
  verified(3)?!!data(3)?.length:null
 ];
};
const tr=text=>window.VATRA_LANGUAGE?.translate?.(text)||text;
const node=(tag,css,content)=>{
 const element=document.createElement(tag);element.className=css;
 if(content!==undefined)element.textContent=content;
 return element;
};
let session=null,root=null,card=null,spotlight=null,art=null,label=null;
let heading=null,description=null,progress=null,prev=null,next=null,skip=null;
let tasksBox=null,taskStatus=null,refresh=null,taskRows=[],stepsCard=null,stepsArt=null,stepsMeter=null,stepsFill=null,mode="welcome",index=0;
let replaying=false,lastFocus=null,raf=0,authSubscription=null;
let positionedIndex=-1;
let checkedAt=0,checking=null,results=null;
const home=()=>new URL("./",location.href);
function stop(){
 document.querySelector("#vatra-onboarding-replay")?.remove();
 session?.controller?.abort();
 if(raf){cancelAnimationFrame(raf);raf=0;}
 if(root){root.remove();root=null;}
 if(stepsCard){stepsCard.hidden=true;stepsCard.replaceChildren();stepsCard=null;}
 tasksBox=taskStatus=refresh=stepsArt=stepsMeter=stepsFill=null;
 document.removeEventListener("keydown",onKeydown,true);
 window.removeEventListener("resize",schedulePosition);
 window.removeEventListener("scroll",schedulePosition,true);
 window.visualViewport?.removeEventListener("resize",schedulePosition);
 authSubscription?.unsubscribe?.();authSubscription=null;
 card=null;spotlight=null;art=null;session=null;checking=null;results=null;
 replaying=false;checkedAt=0;taskRows=[];positionedIndex=-1;
 if(lastFocus?.isConnected&&typeof lastFocus.focus==="function")lastFocus.focus();
 lastFocus=null;
}
function hide(){
 if(!root)return;
 root.hidden=true;
 document.removeEventListener("keydown",onKeydown,true);
 window.removeEventListener("resize",schedulePosition);
 window.removeEventListener("scroll",schedulePosition,true);
 window.visualViewport?.removeEventListener("resize",schedulePosition);
 spotlight.hidden=true;
 positionedIndex=-1;
 if(lastFocus?.isConnected&&typeof lastFocus.focus==="function")lastFocus.focus();
 lastFocus=null;
}
function pause(status="paused"){
 if(session&&!replaying&&(mode==="tour"||mode==="welcome"))
  saveState(localStorage,session.id,status,index);
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
 const vw=window.innerWidth,vh=window.innerHeight,edge=14,gap=16;
 if(mode!=="tour"){
  spotlight.hidden=true;card.classList.remove("vatra-tour-anchored-001");
  card.removeAttribute("data-placement");
  const box=card.getBoundingClientRect();
  card.style.left=Math.max(edge,(vw-box.width)/2)+"px";
  card.style.top=Math.max(edge,(vh-box.height)/2)+"px";
  return;
 }
 const anchor=document.querySelector(steps[index]?.selector);
 if(!anchor||!anchor.getClientRects().length){
  spotlight.hidden=true;card.classList.remove("vatra-tour-anchored-001");
  root.dataset.stage="fallback";
  card.style.left=Math.max(edge,(vw-card.getBoundingClientRect().width)/2)+"px";
  card.style.top=Math.max(edge,(vh-card.getBoundingClientRect().height)/2)+"px";
  return;
 }
 if(positionedIndex!==index){
  positionedIndex=index;
  const initial=anchor.getBoundingClientRect();
  if(initial.top<edge||initial.bottom>vh-edge||initial.left<0||initial.right>vw){
   const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
   anchor.scrollIntoView?.({behavior:reduced?"instant":"smooth",block:"center",inline:"nearest"});
  }
 }
 const rect=anchor.getBoundingClientRect();
 if(rect.bottom<=0||rect.top>=vh||rect.right<=0||rect.left>=vw){
  spotlight.hidden=true;return;
 }
 root.dataset.stage="tour";
 const left=Math.max(3,rect.left-5),top=Math.max(3,rect.top-5);
 const right=Math.min(vw-3,rect.right+5),bottom=Math.min(vh-3,rect.bottom+5);
 spotlight.hidden=false;
 spotlight.style.left=Math.min(left,vw-3)+"px";
 spotlight.style.top=Math.min(top,vh-3)+"px";
 spotlight.style.width=Math.max(2,right-left)+"px";
 spotlight.style.height=Math.max(2,bottom-top)+"px";
 card.classList.add("vatra-tour-anchored-001");
 const width=card.getBoundingClientRect().width,height=card.getBoundingClientRect().height;
 const cardLeft=Math.max(edge,Math.min(vw-width-edge,rect.left+rect.width/2-width/2));
 const below=rect.bottom+gap,above=rect.top-height-gap;
 const placement=below+height<vh-edge?"below":above>=edge?"above":"center";
 const cardTop=placement==="below"?below:placement==="above"?above:
  Math.max(edge,Math.min(vh-height-edge,(vh-height)/2));
 card.dataset.placement=placement;
 card.style.setProperty("--vatra-tour-pointer-x",
  Math.max(22,Math.min(width-22,rect.left+rect.width/2-cardLeft))+"px");
 card.style.left=cardLeft+"px";card.style.top=cardTop+"px";
}
function activate(nextMode,nextIndex=index){
 if(!session)return;
 mode=nextMode;index=Math.max(0,Math.min(steps.length-1,nextIndex));
 show();

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
  window.visualViewport?.addEventListener("resize",schedulePosition);
 }

 progress.hidden=mode!=="tour";
 prev.hidden=mode!=="tour"||index===0;
 skip.hidden=mode==="goodbye";
 card.classList.toggle("vatra-tour-intro-001",mode==="welcome"||mode==="goodbye");
 const current=steps[index];
 const imageName=mode==="welcome"?"vatryk_welcome.webp":
  mode==="goodbye"?"vatryk_goodbye.webp":
  current.art;
 art.style.backgroundImage="url("+JSON.stringify(ART+imageName)+")";
 label.textContent=mode==="tour"?tr("Крок")+" "+(index+1)+" / "+steps.length:
  tr("Знайомство з VATRA");
 heading.textContent=mode==="welcome"?tr("Привіт! Ласкаво просимо до VATRA!"):
  mode==="goodbye"?tr("Тепер ти знаєш основне!"):
  tr(current.title);
 description.textContent=mode==="welcome"?
  tr("Я Ватрик. Покажу тобі стрічку та допоможу знайти своїх людей. Усе можна пропустити."):
  mode==="goodbye"?tr("Досліджуй VATRA та ділися історіями."):
  tr(current.detail);
 next.textContent=mode==="welcome"?tr("Почати знайомство"):
  mode==="tour"?(index===steps.length-1?tr("Завершити екскурсію"):tr("Далі")):
  mode==="goodbye"?tr("До перших завдань"):tr("До моєї VATRA");
 prev.textContent=tr("Назад");skip.textContent=tr("Пропустити");

 if(mode==="tour"){
  progress.textContent=tr("Крок")+" "+(index+1)+" "+tr("із")+" "+steps.length;
  progress.style.setProperty("--vatra-tour-progress",((index+1)/steps.length*100)+"%");
  progress.setAttribute("aria-valuenow",String(index+1));
  progress.setAttribute("aria-valuemax",String(steps.length));
  if(!replaying)saveState(localStorage,session.id,"paused",index);
 }

 card.querySelector(".vatra-tour-scroll-area-001").scrollTop=0;
 schedulePosition();
 next.focus({preventScroll:true});
}
function finish(){
 if(session){saveState(localStorage,session.id,"done",steps.length-1);document.querySelector("#vatra-onboarding-replay")?.remove();void syncCompleted(session);}
 replaying=false;activate("goodbye");
}
function skipTour(){
 if(session&&shouldSaveSkip(replaying,readState(localStorage,session.id)))
  saveState(localStorage,session.id,"skipped",index);
 replaying=false;hide();openTasks(false);
}
function proceed(){
 if(mode==="welcome"){activate("tour",replaying?0:(readState(localStorage,session.id)?.step||0));return;}
 if(mode==="tour"){
  if(index+1<steps.length)activate("tour",index+1);
  else finish();
  return;
 }
 if(mode==="goodbye"){hide();openTasks(false);return;}
 hide();
}
function back(){
 if(mode!=="tour")return;
 if(index>0)activate("tour",index-1);else activate("welcome");
}
function build(){
 root=node("div","vatra-tour-root-001");root.id="vatra-tour-dialog";root.hidden=true;
 root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");
 root.setAttribute("aria-labelledby","vatra-tour-title");
 root.setAttribute("aria-describedby","vatra-tour-description");
 const shield=node("div","vatra-tour-shield-001");
 shield.setAttribute("aria-hidden","true");
 shield.addEventListener("click",()=>pause());
 spotlight=node("div","vatra-tour-spotlight-001");spotlight.hidden=true;
 spotlight.setAttribute("aria-hidden","true");
 card=node("section","vatra-tour-card-001");
 const scrollArea=node("div","vatra-tour-scroll-area-001");
 const top=node("div","vatra-tour-header-001");
 art=node("span","vatra-tour-mascot-001");
 art.setAttribute("aria-hidden","true");
 art.addEventListener("dragstart",event=>event.preventDefault());
 art.addEventListener("contextmenu",event=>event.preventDefault());
 label=node("p","vatra-tour-eyebrow-001");
 const words=node("div","vatra-tour-words-001");
 heading=node("h2","vatra-tour-heading-001");heading.id="vatra-tour-title";
 description=node("p","vatra-tour-description-001");description.id="vatra-tour-description";
 words.append(label,heading,description);
 top.append(art,words);scrollArea.append(top);
 progress=node("p","vatra-tour-progress-001");
 progress.setAttribute("role","progressbar");progress.setAttribute("aria-valuemin","0");
 progress.setAttribute("aria-label",tr("Прогрес знайомства"));
 scrollArea.append(progress);
 const actions=node("div","vatra-tour-actions-001");
 prev=node("button","vatra-tour-back-001");prev.type="button";prev.addEventListener("click",back);
 skip=node("button","vatra-tour-skip-001");skip.type="button";skip.addEventListener("click",skipTour);
 next=node("button","vatra-tour-next-001");next.type="button";next.addEventListener("click",proceed);
 actions.append(prev,skip,next);scrollArea.append(actions);
 card.append(scrollArea);
 root.append(shield,spotlight,card);document.body.append(root);
}
function buildSteps(){
 const host=document.querySelector("#vatra-first-steps");if(!host||!session)return;
 stepsCard=host;host.replaceChildren();
 const header=node("div","ui-feed-first-steps-head-001"),words=node("div","ui-feed-first-steps-copy-001");
 const title=node("h2","vatra-feed-first-steps-title-001",tr("Мої перші кроки"));title.id="vatra-first-steps-title";
 stepsArt=node("span","ui-feed-first-steps-mascot-001");stepsArt.setAttribute("aria-hidden","true");
 taskStatus=node("p","vatra-feed-first-steps-status-001");taskStatus.setAttribute("aria-live","polite");
 words.append(title,taskStatus);header.append(words,stepsArt);
 stepsMeter=node("div","ui-feed-first-steps-meter-001");stepsMeter.setAttribute("role","progressbar");stepsMeter.setAttribute("aria-label",tr("Мої перші кроки"));stepsMeter.setAttribute("aria-valuemin","0");stepsMeter.setAttribute("aria-valuemax",String(tasks.length));
 stepsFill=node("div","ui-feed-first-steps-fill-001");stepsMeter.append(stepsFill);
 tasksBox=node("div","ui-feed-first-steps-list-001");taskRows=[];
 for(let i=0;i<tasks.length;i++){
  const row=node("a","ui-feed-first-step-row-00"+(i+1));row.href=new URL(tasks[i].page,home()).href;
  const marker=node("span","ui-feed-first-step-mark-00"+(i+1));marker.setAttribute("aria-hidden","true");
  const title=node("span","vatra-feed-first-step-name-00"+(i+1),tr(tasks[i].title));
  const status=node("small","vatra-feed-first-step-note-00"+(i+1));status.setAttribute("aria-live","off");
  row.append(marker,title,status);tasksBox.append(row);
  if(tasks[i].key==="post")row.addEventListener("click",event=>{const compose=document.querySelector("#feed-compose-open");if(compose&&results?.[i]!==true){event.preventDefault();compose.click();}});
  taskRows.push({row,marker,title,status});
 }
 const actions=node("div","ui-feed-first-steps-actions-001");
 refresh=node("button","vatra-feed-first-steps-refresh-001",tr("Оновити прогрес"));refresh.type="button";refresh.addEventListener("click",()=>void checkTasks(true));
 actions.append(refresh);host.append(header,stepsMeter,tasksBox,actions);host.hidden=false;renderTasks();
}
function renderTasks(){
 if(!stepsCard||!session)return;
 if(results?.every(value=>value===true)){rememberCompletedTasks(session);stepsCard.hidden=true;return;}
 const num=results?.filter(value=>value===true).length||0;
 stepsFill.style.width=(num/tasks.length*100)+"%";
 if(results)stepsMeter.setAttribute("aria-valuenow",String(num));else stepsMeter.removeAttribute("aria-valuenow");
 const incomplete=results?.some(value=>value===null);
 taskStatus.textContent=checking?tr("Перевіряємо перші досягнення…"):
  results===null?tr("Не вдалося перевірити завдання. Онови прогрес."):
  tr("Виконано")+" "+num+" / "+tasks.length+(incomplete?". "+tr("Деякі завдання не вдалося перевірити."):"");
 refresh.disabled=!!checking;stepsCard.setAttribute("aria-busy",String(!!checking));
 for(let i=0;i<tasks.length;i++){
  const row=taskRows[i],complete=results?.[i]===true,unknown=results===null||results[i]===null;
  row.status.textContent=unknown?tr("Не перевірено"):complete?tr("Виконано"):tr("Перейти");
  row.status.hidden=complete;
  row.row.setAttribute("aria-label",tr(tasks[i].title)+" · "+row.status.textContent);
  row.row.dataset.state=complete?"done":unknown?"unknown":"pending";
  row.row.href=new URL(tasks[i].page==="profile"?"id"+session.id:tasks[i].page,home()).href;
 }
 stepsArt.style.backgroundImage="url("+JSON.stringify(ART+(results?.every(value=>value===true)?"vatryk_success.webp":"vatryk_waiting.webp"))+")";
}
async function checkTasks(force=false){
 if(!session||!stepsCard||!session.client)return;
 if(checking)return checking;
 if(!force&&results&&Date.now()-checkedAt<60000){renderTasks();return;}
 const client=session.client,id=session.id,epoch=session;
 checking=Promise.resolve().then(async()=>{
  if(epoch!==session)return;
  try{
   const lookups=[
    ()=>client.from("profile_media").select("avatar_path,cover_path").eq("vatra_id",id).maybeSingle(),
    ()=>client.from("feed_posts").select("id").eq("author_vatra_id",id).limit(1),
    ()=>client.from("friendships").select("id").or("requester_id.eq."+id+",recipient_id.eq."+id)
     .eq("status","accepted").limit(1),
    ()=>client.from("community_follows").select("club_id").eq("member_vatra_id",id).limit(1)
   ];
   const response=await Promise.allSettled(lookups.map(query=>Promise.resolve().then(query)));
   if(epoch!==session)return;
   results=milestoneSnapshot(response);
   checkedAt=Date.now();
  }catch(_){
   if(epoch===session){
    results=Array(tasks.length).fill(null);
    checkedAt=Date.now();
   }
  }
 }).finally(()=>{if(epoch===session){checking=null;renderTasks();}});
 renderTasks();return checking;
}
async function syncCompleted(current){const key=KEY+current.id+".synced";try{if(localStorage.getItem(key)==="1")return;}catch(_){}try{const {error}=await current.client.from("onboarding_done").insert({vatra_id:current.id});if(!error||error.code==="23505")try{localStorage.setItem(key,"1");}catch(_){}}catch(_){}}
function rememberCompletedTasks(current){try{localStorage.setItem(KEY+current.id+".tasksDone","1");}catch(_){}}
function completedTasks(current){try{return localStorage.getItem(KEY+current.id+".tasksDone")==="1";}catch(_){return false;}}
function start(options={}){
 const id=String(options.memberId||"");
 if(!validId(id)||!options.client||document.body.dataset.feedReady!=="true")return false;
 if(session?.id===id)return true;
 stop();
 session={id,client:options.client,authUserId:String(options.authUserId||""),controller:new AbortController()};
 const saved=readState(localStorage,id);
 const menu=document.querySelector(".feed-account-menu");
 const support=menu?.querySelector(".feed-menu-support");
 if(saved?.status!=="done"&&support&&!document.querySelector("#vatra-onboarding-replay")){
  const launch=node("button","vatra-feed-onboarding-launch-001",tr("Знайомство з VATRA"));
  launch.id="vatra-onboarding-replay";launch.type="button";launch.hidden=true;
  support.before(launch);
 }
 document.querySelector("#vatra-onboarding-replay")?.addEventListener("click",()=>{
  if(menu)menu.open=false;
  replay();
 },{signal:session.controller.signal});
 if(!completedTasks(session)){buildSteps();void checkTasks();}
 const eligible=recentSignup(options.createdAt);
 if(typeof options.client.auth?.onAuthStateChange==="function"){
  const {data}=options.client.auth.onAuthStateChange((event,newSession)=>{
   if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;
   if(event==="SIGNED_IN"&&newSession?.user?.id===session?.authUserId)return;
   stop();
  });
  authSubscription=data?.subscription||null;
 }
 const current=session;
 if(saved?.status==="done"){document.querySelector("#vatra-onboarding-replay")?.remove();void syncCompleted(current);}else void (async()=>{let done=false;try{const {data,error}=await current.client.from("onboarding_done").select("vatra_id").eq("vatra_id",id).maybeSingle();done=!error&&!!data;}catch(_){}if(session!==current)return;if(done){try{localStorage.setItem(KEY+id+".synced","1");}catch(_){}saveState(localStorage,id,"done",steps.length-1);document.querySelector("#vatra-onboarding-replay")?.remove();hide();return;}const replayButton=document.querySelector("#vatra-onboarding-replay");if(replayButton)replayButton.hidden=false;if((eligible&&!saved)||saved?.status==="paused"){index=saved?.step||0;mode=saved?.status==="paused"?"tour":"welcome";show();}})();
 return true;
}
function replay(){
 if(!session||readState(localStorage,session.id)?.status==="done")return;
 replaying=true;index=0;activate("welcome",0);
}
function openTasks(scroll=true){
 if(!session)return;
 if(completedTasks(session))return;
 if(!stepsCard)buildSteps();
 if(scroll)stepsCard?.scrollIntoView({block:"nearest",behavior:"auto"});
 void checkTasks();
}
window.VATRA_ONBOARDING={start,stop,replay,openTasks};
window.VATRA_ONBOARDING_STATE={recentSignup,storedKey,readState,saveState,shouldSaveSkip,milestoneSnapshot};
})();