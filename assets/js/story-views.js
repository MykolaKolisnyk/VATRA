(()=>{
"use strict";
const active=new WeakMap(),records=new WeakMap(),pageSize=50;
const labels={uk:["Перегляди","Завантаження…","Немає переглядів","Не вдалося завантажити. Спробуйте ще раз.","Показати ще","Користувач VATRA"],en:["Views","Loading…","No views","Could not load. Try again.","Show more","VATRA user"],pl:["Wyświetlenia","Ładowanie…","Brak wyświetleń","Nie udało się wczytać. Spróbuj ponownie.","Pokaż więcej","Użytkownik VATRA"],de:["Aufrufe","Wird geladen…","Keine Aufrufe","Laden fehlgeschlagen. Erneut versuchen.","Mehr anzeigen","VATRA-Nutzer"],fr:["Vues","Chargement…","Aucune vue","Impossible de charger. Réessayez.","Afficher plus","Utilisateur VATRA"],it:["Visualizzazioni","Caricamento…","Nessuna visualizzazione","Caricamento non riuscito. Riprova.","Mostra altro","Utente VATRA"],ka:["ნახვები","იტვირთება…","ნახვები არ არის","ვერ ჩაიტვირთა. სცადეთ ხელახლა.","მეტის ჩვენება","VATRA მომხმარებელი"],bg:["Преглеждания","Зареждане…","Няма преглеждания","Неуспешно зареждане. Опитайте отново.","Покажи още","Потребител на VATRA"]};
const words=()=>labels[String(window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk").split("-")[0]]||labels.uk;
const validId=id=>/^[1-9][0-9]{0,18}$/.test(String(id))&&(typeof id!=="number"||Number.isSafeInteger(id));
const validStory=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
const live=story=>validStory(story?.id)&&Date.parse(story.expires_at)>Date.now();
async function record(client,story,viewer){
 if(!client||!live(story)||!validId(viewer)||!validId(story.author_vatra_id)||String(viewer)===String(story.author_vatra_id))return false;
 let cache=records.get(client);if(!cache){cache=new Map();records.set(client,cache);}
 const key=String(viewer)+":"+story.id;
 if(cache.has(key))return cache.get(key);
 const pending=Promise.resolve().then(async()=>{
  try{const {error}=await client.from("story_views").insert({story_id:story.id,viewer_vatra_id:String(viewer)});
   return !error||error.code==="23505";
  }catch(_){return false;}
 });
 cache.set(key,pending);
 const ok=await pending;
 if(!ok&&cache.get(key)===pending)cache.delete(key);
 while(cache.size>256)cache.delete(cache.keys().next().value);
 return ok;
}
async function count(client,id){
 if(!validStory(id))return null;
 try{const result=await client.from("story_views").select("viewer_vatra_id",{count:"exact",head:true}).eq("story_id",id);
 return !result.error&&Number.isSafeInteger(result.count)&&result.count>=0?result.count:null;
 }catch(_){return null;}
}
async function page(client,id,offset=0){
 if(!validStory(id)||!Number.isSafeInteger(offset)||offset<0)return null;
 try{
 const result=await client.from("story_views").select("viewer_vatra_id,viewed_at",{count:"exact"}).eq("story_id",id).order("viewed_at",{ascending:false}).order("viewer_vatra_id",{ascending:true}).range(offset,offset+pageSize-1);
 if(result.error||!Array.isArray(result.data)||!Number.isSafeInteger(result.count))return null;
 const ids=[...new Set(result.data.map(x=>x.viewer_vatra_id).filter(validId).map(String))];let names=new Map();
 if(ids.length)try{
 const named=await (window.VATRA_PUBLIC_NAMES?.get(client,ids)||client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",ids));
 if(!named.error)names=new Map((named.data||[]).filter(x=>validId(x.vatra_id)).map(x=>[String(x.vatra_id),String(x.display_name||"").trim()]));
 }catch(_){}
 return {count:result.count,rows:result.data.filter(x=>validId(x.viewer_vatra_id)).map(x=>({id:String(x.viewer_vatra_id),name:names.get(String(x.viewer_vatra_id))||""})),next:offset+result.data.length};
 }catch(_){return null;}
}
function stop(dialog){
 const state=active.get(dialog);if(!state)return;
 active.delete(dialog);
 if(state.ui){const {ui,toggle,moreClick,close}=state;ui.removeEventListener("toggle",toggle);state.more.removeEventListener("click",moreClick);dialog.removeEventListener("close",close);ui.open=false;ui.hidden=true;state.list.replaceChildren();state.status.textContent="";}
}
function blocked(dialog){return !!active.get(dialog)?.ui?.open;}
function viewed(dialog){const s=active.get(dialog);if(s&&!s.owner&&!s.sent){s.sent=true;void record(s.client,s.story,s.viewer);}}
function start(dialog,client,story,viewer){
 stop(dialog);
 if(!dialog?.open||!client||!live(story)||!validId(viewer)||!validId(story.author_vatra_id))return;
 const owner=String(story.author_vatra_id)===String(viewer);
 const state={client,story,viewer,owner,sent:false};active.set(dialog,state);
 if(!owner)return;
 const ui=dialog.querySelector(".ui-vatra-story-views-001");if(!ui)return;
 const label=ui.querySelector("summary"),list=ui.querySelector("ul"),status=ui.querySelector("[data-story-views-status]"),more=ui.querySelector("button");
 if(!label||!list||!status||!more)return;
 const w=words(),current=()=>active.get(dialog)===state&&dialog.open;
 let offset=0,loading=false,loaded=false,total=null;
 const updateCount=n=>{total=n;label.textContent=w[0]+": "+n;};
 const load=async()=>{
  if(loading||!current()||!ui.open)return;
  loading=true;status.textContent=w[1];more.hidden=true;
  try{
   const result=await page(client,story.id,offset);
   if(!current()||!ui.open)return;
   if(!result){status.textContent=w[3];more.hidden=false;return;}
   updateCount(result.count);for(const viewer of result.rows){const li=document.createElement("li"),a=document.createElement("a");a.className="vatra-story-viewer-link-001";a.href="profile?"+new URLSearchParams({id:viewer.id});a.textContent=viewer.name||w[5]+" · "+viewer.id;li.append(a);list.append(li);}
   offset=result.next;loaded=true;status.textContent=result.count===0?w[2]:"";more.hidden=offset>=result.count||!result.rows.length;
  }finally{loading=false;if(current()&&ui.open&&!loaded&&status.textContent===w[1])void load();}
 };
 const toggle=()=>{if(ui.open&&!loaded)void load();};
 const moreClick=()=>{void load();};
 const close=()=>{if(!dialog.open)stop(dialog);};
 Object.assign(state,{ui,list,status,more,toggle,moreClick,close});
 ui.hidden=true;ui.open=false;list.replaceChildren();status.textContent="";more.textContent=w[4];more.hidden=true;
 ui.addEventListener("toggle",toggle);more.addEventListener("click",moreClick);dialog.addEventListener("close",close);
 void count(client,story.id).then(n=>{if(current()&&n!==null&&total===null){updateCount(n);ui.hidden=false;}});
}
window.VATRA_STORY_VIEWS={record,count,page,start,stop,viewed,blocked};
})();
