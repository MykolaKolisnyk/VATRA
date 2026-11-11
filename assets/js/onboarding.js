/* VATRA account onboarding: persisted tour + verified server-side task states. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://rjasunoawrxvetwadylh.supabase.co";
const PUBLIC_KEY="sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-";
const q=selector=>document.querySelector(selector);
const en=()=>document.documentElement.lang==="en";
const tr=(uk,english)=>en()?english:uk;
const copy={
 intro:[
  ["Ласкаво просимо до VATRA!","Welcome to VATRA!","Тут ваші люди, спільноти, історії та публікації. За кілька кроків покажемо, як користуватися основними елементами.","This is your place for friends, communities, stories and posts. Here is a short tour of the key controls.","✦","Навчання можна пропустити будь-коли.","You can skip this tour at any time."],
  ["Логотип VATRA","VATRA logo","Натисніть на логотип у шапці, щоб повернутися до Стрічки з будь-якого розділу.","Click the VATRA logo in the header to return to Feed from any section.","V","Усі сторінки використовують спільну шапку.","All sections share the same header."],
  ["Пошук","Search","Поле пошуку допоможе знайти дописи та спільноти. Історія останніх запитів зберігається у вашому браузері.","Use the search field to look for posts or communities. Recent searches are saved in your browser.","⌕","Для пошуку друга за VATRA ID скористайтеся завданням «Знайти друзів».","Use the Find friends task to open a member by VATRA ID."],
  ["Стрічка","Feed","Тут з’являються ваші дописи, публікації прийнятих друзів і спільнот, на які ви підписалися.","Your Feed shows your posts, posts from accepted friends and communities you follow.","▤","Найновіші дописи відображаються першими.","Newest posts appear first."],
  ["Історії","Stories","Натисніть «Ваша історія», щоб поділитися моментом. Історії друзів відображаються поруч і зникають через 24 години.","Choose Your story to share a moment. Friends’ stories appear beside yours and expire after 24 hours.","◫","Зараз доступні текстові історії. Фото та відео додамо пізніше.","Text stories are available now. Photo and video stories will come later."],
  ["Додати публікацію","Write a post","Натисніть поле «Додати публікацію», введіть текст і опублікуйте. Власні дописи можна видаляти.","Click Write a post, enter your text and publish it. You can delete your own posts.","＋","Перша публікація виконає п’яте завдання.","Your first published post completes task five."],
  ["Друзі","Friends","Тут ви спілкуєтеся з іншими учасниками: відкрийте профіль, надішліть заявку та дочекайтеся її прийняття.","Find members by VATRA ID, open a profile, send a friend request and wait for acceptance.","♧","Кнопка розділу «Друзі» в шапці ще розробляється; заявки доступні у вашому профілі.","The Friends header section is still in development; requests are available in your profile."],
  ["Спільноти","Communities","У розділі «Спільноти» знайдіть цікаву спільноту, підпишіться та читайте її дописи у Стрічці.","Discover communities, follow them and read their posts in your Feed.","♧","Підписка та публікації спільнот уже доступні.","Community subscriptions and posts are available."],
  ["Кліпи","Clips","Тут згодом з’являться короткі відео учасників VATRA.","This section will feature short videos from VATRA members.","▷","Розділ поки в розробці.","This feature is still in development."],
  ["Маркетплейс","Marketplace","Майбутній простір для товарів, послуг та пропозицій учасників.","A future place for listings, products and services from members.","▣","Розділ поки в розробці.","This feature is still in development."],
  ["Месенджер","Messenger","Кнопка повідомлень у шапці стане спільним списком діалогів. Уже зараз можна написати людині з її профілю.","The header messenger will become a central inbox. For now, open a member’s profile and use Message.","☏","Ваші діалоги доступні в розділі «Повідомлення» власного профілю.","Your conversations are available under Messages on your profile."],
  ["Сповіщення","Notifications","Тут згодом з’являться повідомлення про нові заявки, відповіді й інші події.","This section will show friend requests, replies and other updates.","♧","Центр сповіщень ще в розробці.","The notification center is still in development."],
  ["Музика","Music","Музичний розділ VATRA поки розробляється.","VATRA’s music section is still being developed.","♫","Музична бібліотека наразі недоступна.","The music library is not available yet."],
  ["Мій профіль","My profile","Натисніть аватар та своє ім’я праворуч у шапці, а потім «Моя сторінка». Там є публікації, друзі, фото та повідомлення.","Select your avatar and name at the top right, then My page. You will find posts, friends, photos and messages there.","◉","У власному профілі можна поставити фото та обкладинку.","You can upload your profile photo and cover there."],
  ["Налаштування та мова","Settings and language","У меню акаунта відкрийте «Налаштування», щоб змінити мову інтерфейсу. Там також є ваш VATRA ID, підтримка та вихід.","Open Settings in the account menu to change the language. Your VATRA ID, support and sign-out are nearby.","⚙","Українська й англійська мають однакові функції.","Ukrainian and English have the same features."],
  ["П’ять завдань","Five getting-started tasks","Завершіть свій профіль: фото, обкладинка, пошук друзів і перша публікація. Реєстрацію вже виконано!","Finish setting up your profile with a photo, cover, friends and your first post. Registration is already complete!","✓","Завдання залишаться у Стрічці навіть після пропуску навчання.","These tasks remain available in your Feed even if you skip the tour."]
 ]
};
let client=null,ownId=null,step=0,wasLoaded=false,onboardingRow=null,tourSaving=false;
const dialog=q("#vatra-tour-dialog"),tasks=q("#vatra-welcome-tasks");
const cleanId=x=>/^[1-9][0-9]{0,18}$/.test(String(x||""));
function renderStep(){
 const slide=copy.intro[step];if(!slide)return;
 q("#vatra-tour-heading").textContent=tr(slide[0],slide[1]);
 q("#vatra-tour-description").textContent=tr(slide[2],slide[3]);
 q("#vatra-tour-icon").textContent=slide[4];
 q("#vatra-tour-hint").textContent=tr(slide[5],slide[6]);
 q("#vatra-tour-step").textContent=(step+1)+" / "+copy.intro.length;
 q(".vt-vatra-tour-kicker-001").textContent=tr("Знайомство з VATRA","Discover VATRA");
 q("#vatra-tour-back").hidden=step===0;
 q("#vatra-tour-back").textContent=tr("Назад","Back");
 q("#vatra-tour-next").textContent=step===copy.intro.length-1?tr("Почати","Get started"):tr("Далі","Next");
 q("#vatra-tour-skip").textContent=tr("Пропустити","Skip");
 q("#vatra-tour-close").setAttribute("aria-label",tr("Пропустити навчання","Skip tutorial"));
}
async function finishTour(){
 if(tourSaving)return;
 tourSaving=true;
 if(dialog?.open)dialog.close();
 if(!client||!cleanId(ownId)||onboardingRow?.tutorial_done){tourSaving=false;return;}
 try{
  const {error}=await client.from("vatra_onboarding")
   .update({tutorial_done:true}).eq("vatra_id",ownId);
  if(error)throw error;
  onboardingRow={tutorial_done:true};
 }catch(_){
  // Do not claim server persistence when offline: tour is retried on another visit.
 }finally{tourSaving=false;}
}
function openTour(){
 step=0;renderStep();
 if(dialog&&!dialog.open)dialog.showModal();
}
function refreshTexts(){
 q("#vatra-tasks-heading").textContent=tr("Перші кроки у VATRA","Getting started on VATRA");
 q("#vatra-tasks-tour").textContent=tr("Як працює VATRA?","Tour VATRA");
 const labels=[
  ["registration","Реєстрація пройдено!","Registration complete!"],
  ["avatar","Поставити фото профілю","Add a profile photo"],
  ["cover","Поставити обкладинку","Add a cover photo"],
  ["friends","Знайти друзів","Find friends"],
  ["first-post","Додати першу публікацію","Publish your first post"]
 ];
 labels.forEach(([slug,uk,eng])=>{
  const label=q("#vatra-task-"+slug+" .vatra-task-name");
  if(label)label.textContent=tr(uk,eng);
 });
 for(const button of document.querySelectorAll("[data-vatra-task]")){
  const action=button.dataset.vatraTask;
  const words=action==="friends"?["Знайти","Find"]:
   action==="post"?["Написати","Write"]:["Додати","Add"];
  button.textContent=tr(...words);
 }
 q("#vatra-find-friends-heading").textContent=tr("Знайти друга","Find a friend");
 q(".vt-vatra-find-friends-description-001").textContent=tr(
  "Введіть VATRA ID друга, щоб відкрити його профіль і надіслати заявку.",
  "Enter your friend's VATRA ID to open their profile and send a request.");
 q("#vatra-find-friends-cancel").textContent=tr("Скасувати","Cancel");
 q("#vatra-find-friends-go").textContent=tr("Відкрити профіль","Open profile");
 q("#vatra-tasks-toggle").setAttribute("aria-label",tr("Згорнути або розгорнути завдання","Collapse or expand tasks"));
}
async function refreshProgress(){
 if(!client||!cleanId(ownId))return;
 const calls=[
  client.from("vatra_profile_media").select("avatar_path,cover_path").eq("vatra_id",ownId).maybeSingle(),
  client.from("vatra_friendships").select("id")
   .or("requester_id.eq."+ownId+",recipient_id.eq."+ownId).limit(1),
  client.from("feed_posts").select("id").eq("author_vatra_id",ownId).limit(1)
 ];
 const results=await Promise.allSettled(calls);
 const data=results[0].status==="fulfilled"&&!results[0].value.error?results[0].value.data:null;
 const friendship=results[1].status==="fulfilled"&&!results[1].value.error?results[1].value.data:[];
 const posts=results[2].status==="fulfilled"&&!results[2].value.error?results[2].value.data:[];
 const completed={
  registration:true,
  avatar:!!data?.avatar_path,
  cover:!!data?.cover_path,
  friends:Array.isArray(friendship)&&friendship.length>0,
  "first-post":Array.isArray(posts)&&posts.length>0
 };
 let count=0;
 for(const [i,key] of ["registration","avatar","cover","friends","first-post"].entries()){
  const row=q("#vatra-task-"+key),done=!!completed[key];
  if(done)count++;
  if(!row)continue;
  row.classList.toggle("is-done",done);
  const indicator=row.querySelector(".vatra-task-status");
  indicator.textContent=done?"✓":String(i+1);
  const button=row.querySelector(".vatra-task-action");
  if(button)button.hidden=done;
 }
 q("#vatra-tasks-count").textContent=tr(count+" із 5 виконано",count+" of 5 completed");
 q("#vatra-tasks-progress").setAttribute("aria-valuenow",String(count));
 q("#vatra-tasks-progress-fill").style.width=(count*20)+"%";
 q("#vatra-tasks-progress").setAttribute("aria-label",tr("Завдання для нового акаунта","New account tasks"));
}
async function start(event){
 if(wasLoaded)return;
 const id=String(event?.detail?.id||"");
 if(!cleanId(id)||!window.supabase?.createClient)return;
 wasLoaded=true;ownId=id;
 client=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}
 });
 try{
  const {data,error}=await client.from("vatra_onboarding")
   .select("tutorial_done").eq("vatra_id",ownId).maybeSingle();
  if(error||!data)return;
  onboardingRow=data;
  refreshTexts();
  tasks.hidden=false;
  await refreshProgress();
  if(!data.tutorial_done)openTour();
 }catch(_){wasLoaded=false;}
}
q("#vatra-tour-next")?.addEventListener("click",()=>{
 if(step<copy.intro.length-1){step++;renderStep();}else void finishTour();
});
q("#vatra-tour-back")?.addEventListener("click",()=>{if(step>0){step--;renderStep();}});
q("#vatra-tour-skip")?.addEventListener("click",()=>void finishTour());
q("#vatra-tour-close")?.addEventListener("click",()=>void finishTour());
dialog?.addEventListener("close",()=>{if(!onboardingRow?.tutorial_done&&!tourSaving)void finishTour();});
q("#vatra-tasks-tour")?.addEventListener("click",openTour);
q("#vatra-tasks-toggle")?.addEventListener("click",()=>{
 const list=q("#vatra-tasks-list");
 const willHide=!list.hidden;list.hidden=willHide;
 q("#vatra-tasks-toggle").setAttribute("aria-expanded",String(!willHide));
 q("#vatra-tasks-toggle").textContent=willHide?"+":"−";
});
const friendDialog=q("#vatra-find-friends-dialog");
q("#vatra-find-friends-cancel")?.addEventListener("click",()=>friendDialog.close());
q("#vatra-find-friends-form")?.addEventListener("submit",event=>{
 event.preventDefault();
 const id=q("#vatra-find-friends-id").value.trim();
 if(!cleanId(id)||id===ownId)return;
 location.href=new URL("id"+id,new URL("./",location.href)).href;
});
for(const button of document.querySelectorAll("[data-vatra-task]")){
 button.addEventListener("click",()=>{
  const action=button.dataset.vatraTask;
  if(action==="post"){
   q("#feed-compose-open")?.click();
  }else if(action==="friends"){
   friendDialog.showModal();q("#vatra-find-friends-id")?.focus();
  }else if(action==="avatar"||action==="cover"){
   try{sessionStorage.setItem("vatra.setup.media.v1",action);}catch(_){}
   location.href=new URL("id"+ownId,new URL("./",location.href)).href;
  }
 });
}
window.VATRA_ONBOARDING={start,refresh:refreshProgress};
document.addEventListener("vatra:feed-ready",start);
document.addEventListener("vatra:onboarding-progress",()=>void refreshProgress());
window.addEventListener("pageshow",()=>{if(wasLoaded)void refreshProgress();});
window.addEventListener("focus",()=>{if(wasLoaded&&!document.hidden)void refreshProgress();});
})();
