(()=>{
"use strict";
const active=new WeakMap(),types=["like","heart","laugh","wow","sad","fire"],icons=["👍","❤️","😂","😮","😢","🔥"],pageSize=50;
const labels={
 uk:["Реакції","Залишити реакцію","Завантаження…","Не вдалося. Спробуйте ще раз.","Повторити","Показати ще","Реакцій немає","Реакцію збережено","Реакцію прибрано","Користувач VATRA","Подобається","Любов","Сміх","Здивування","Сум","Вогонь"],
 en:["Reactions","React","Loading…","Could not complete. Try again.","Retry","Show more","No reactions","Reaction saved","Reaction removed","VATRA user","Like","Love","Laugh","Wow","Sad","Fire"],
 pl:["Reakcje","Zareaguj","Ładowanie…","Nie udało się. Spróbuj ponownie.","Ponów","Pokaż więcej","Brak reakcji","Zapisano reakcję","Usunięto reakcję","Użytkownik VATRA","Lubię to","Miłość","Śmiech","Zaskoczenie","Smutek","Ogień"],
 de:["Reaktionen","Reagieren","Wird geladen…","Fehlgeschlagen. Erneut versuchen.","Erneut versuchen","Mehr anzeigen","Keine Reaktionen","Reaktion gespeichert","Reaktion entfernt","VATRA-Nutzer","Gefällt mir","Liebe","Lachen","Wow","Traurig","Feuer"],
 fr:["Réactions","Réagir","Chargement…","Échec. Réessayez.","Réessayer","Afficher plus","Aucune réaction","Réaction enregistrée","Réaction retirée","Utilisateur VATRA","J’aime","Amour","Rire","Surprise","Tristesse","Feu"],
 it:["Reazioni","Reagisci","Caricamento…","Operazione non riuscita. Riprova.","Riprova","Mostra altro","Nessuna reazione","Reazione salvata","Reazione rimossa","Utente VATRA","Mi piace","Amore","Risata","Sorpresa","Tristezza","Fuoco"],
 ka:["რეაქციები","რეაქცია","იტვირთება…","ვერ შესრულდა. სცადეთ ხელახლა.","გამეორება","მეტის ჩვენება","რეაქციები არ არის","რეაქცია შენახულია","რეაქცია წაშლილია","VATRA მომხმარებელი","მოწონება","სიყვარული","სიცილი","გაკვირვება","სევდა","ცეცხლი"],
 bg:["Реакции","Реагирай","Зареждане…","Неуспешно. Опитайте отново.","Повтори","Покажи още","Няма реакции","Реакцията е запазена","Реакцията е премахната","Потребител на VATRA","Харесвам","Любов","Смях","Изненада","Тъга","Огън"]};
const words=()=>labels[String(window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk").split("-")[0]]||labels.uk;
const validId=id=>/^[1-9][0-9]{0,18}$/.test(String(id))&&(typeof id!=="number"||Number.isSafeInteger(id));
const live=story=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(story?.id))&&Date.parse(story.expires_at)>Date.now();
const eligible=(story,viewer)=>live(story)&&validId(viewer)&&validId(story.author_vatra_id)&&String(viewer)!==String(story.author_vatra_id);
const filter=(query,story,viewer)=>query.eq("story_id",story.id).eq("reactor_vatra_id",String(viewer));
async function read(client,story,viewer){
 if(!eligible(story,viewer))return {ok:false};
 try{const {data,error}=await filter(client.from("story_reactions").select("reaction"),story,viewer).maybeSingle();
 return error||data&&!types.includes(data.reaction)?{ok:false}:{ok:true,value:data?.reaction??null};}catch(_){return {ok:false};}
}
async function write(client,story,viewer,current,next){
 if(!eligible(story,viewer)||!(current===null||types.includes(current))||!(next===null||types.includes(next))||current===next)return {ok:false};
 try{
 const table=client.from("story_reactions");
 const query=next===null?filter(table.delete(),story,viewer):current===null?table.insert({story_id:story.id,reactor_vatra_id:String(viewer),reaction:next}):filter(table.update({reaction:next}),story,viewer);
 const {data,error}=await query.select("reaction").maybeSingle();
 if(error||data?.reaction!==(next===null?current:next))return {ok:false};
 return {ok:true,value:next};
 }catch(_){return {ok:false};}
}
async function page(client,story,viewer,offset){
 if(!live(story)||!validId(viewer)||String(story.author_vatra_id)!==String(viewer)||!Number.isSafeInteger(offset)||offset<0)return null;
 try{const {data,error}=await client.from("story_reactions").select("reactor_vatra_id,reaction").eq("story_id",story.id).order("created_at",{ascending:false}).order("reactor_vatra_id",{ascending:true}).range(offset,offset+pageSize-1);
 if(error||!Array.isArray(data))return null;
 const rows=data.filter(x=>validId(x.reactor_vatra_id)&&types.includes(x.reaction)),ids=[...new Set(rows.map(x=>String(x.reactor_vatra_id)))];let names=new Map();
 if(ids.length)try{const result=await (window.VATRA_PUBLIC_NAMES?.get(client,ids)||client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",ids));if(!result.error)names=new Map((result.data||[]).filter(x=>validId(x.vatra_id)).map(x=>[String(x.vatra_id),String(x.display_name||"").trim()]));}catch(_){}
 return {rows:rows.map(x=>({id:String(x.reactor_vatra_id),reaction:x.reaction,name:names.get(String(x.reactor_vatra_id))||""})),next:offset+data.length,more:data.length===pageSize};
 }catch(_){return null;}
}
function stop(dialog){
 const s=active.get(dialog);if(!s)return;active.delete(dialog);
 s.ui.removeEventListener("toggle",s.toggle);s.other?.removeEventListener("toggle",s.otherToggle);
 s.retry.removeEventListener("click",s.retryClick);s.more.removeEventListener("click",s.moreClick);
 dialog.removeEventListener("close",s.close);dialog.removeEventListener("cancel",s.cancel);
 s.ui.open=false;s.ui.hidden=true;s.list.replaceChildren();s.buttons.replaceChildren();s.status.textContent="";
}
function blocked(dialog){const s=active.get(dialog);return !!(s?.ui.open||s?.writing);}
function start(dialog,client,story,viewer){
 stop(dialog);if(!dialog?.open||!client||!live(story)||!validId(viewer)||!validId(story.author_vatra_id))return;
 const ui=dialog.querySelector(".ui-vatra-story-reactions-001");if(!ui)return;
 const other=dialog.querySelector(".ui-vatra-story-views-001"),label=ui.querySelector("summary"),buttons=ui.querySelector("[data-story-reaction-buttons]"),list=ui.querySelector("ul"),status=ui.querySelector("[data-story-reaction-status]"),retry=ui.querySelector("[data-story-reaction-retry]"),more=ui.querySelector("[data-story-reaction-more]");
 if(!label||!buttons||!list||!status||!retry||!more)return;
 const w=words(),owner=String(story.author_vatra_id)===String(viewer),s={ui,other,buttons,list,status,retry,more,writing:false};
 active.set(dialog,s);let generation=0,selected=null,ready=false,loading=false,offset=0;const seen=new Set(),controls=[];
 const current=()=>active.get(dialog)===s&&dialog.open;
 const paint=()=>{label.textContent=owner?w[0]:selected?icons[types.indexOf(selected)]+" "+w[1]:w[1];for(const [i,b] of controls.entries()){b.disabled=!ready||loading||s.writing;b.setAttribute("aria-pressed",String(types[i]===selected));}};
 const fail=()=>{status.textContent=w[3];retry.hidden=false;};
 const load=async()=>{
  if(!current()||!ui.open||loading||s.writing)return;const request=++generation;loading=true;retry.hidden=true;more.hidden=true;status.textContent=w[2];paint();
  const result=owner?await page(client,story,viewer,offset):await read(client,story,viewer);
  if(!current()||request!==generation||!ui.open)return;loading=false;
  if(owner){
   if(!result){fail();return;}
   for(const item of result.rows){if(seen.has(item.id))continue;seen.add(item.id);const li=document.createElement("li"),a=document.createElement("a");a.className="vatra-story-reaction-person-001";a.href=new URL("id"+item.id,new URL("./",location.href)).href;a.textContent=icons[types.indexOf(item.reaction)]+" "+(item.name||w[9]+" · "+item.id);li.append(a);list.append(li);}
   offset=result.next;status.textContent=seen.size?"":w[6];more.hidden=!result.more;
  }else{
   ready=!!result.ok;if(!ready)fail();else{selected=result.value;status.textContent="";}paint();
  }
 };
 const choose=async type=>{
  if(!current()||!ui.open||!ready||loading||s.writing||!live(story))return;
  s.writing=true;retry.hidden=true;paint();const next=selected===type?null:type;
  const result=await write(client,story,viewer,selected,next);
  if(!current())return;s.writing=false;
  if(!result.ok){ready=false;fail();}else{selected=result.value;status.textContent=selected?w[7]:w[8];}
  paint();if(ui.open&&!ready)retry.hidden=false;
 };
 buttons.replaceChildren();list.replaceChildren();buttons.hidden=owner;list.hidden=!owner;status.textContent="";retry.hidden=more.hidden=true;retry.textContent=w[4];more.textContent=w[5];
 if(!owner)for(const [i,type] of types.entries()){const b=document.createElement("button");b.className="vatra-story-reaction-emoji-001";b.type="button";b.textContent=icons[i];b.setAttribute("aria-label",w[10+i]);b.title=w[10+i];b.addEventListener("click",()=>{void choose(type);});controls.push(b);buttons.append(b);}
 const toggle=()=>{if(s.writing)return;generation++;loading=false;ready=false;offset=0;seen.clear();list.replaceChildren();status.textContent="";retry.hidden=more.hidden=true;paint();if(ui.open){if(other)other.open=false;void load();}};
 const otherToggle=()=>{if(other.open&&ui.open)ui.open=false;};
 const retryClick=()=>{void load();},moreClick=()=>{void load();},close=()=>{if(!dialog.open)stop(dialog);};
 const cancel=event=>{if(ui.open){event.preventDefault();ui.open=false;label.focus();}};
 Object.assign(s,{toggle,otherToggle,retryClick,moreClick,close,cancel});
 ui.open=false;ui.hidden=false;paint();ui.addEventListener("toggle",toggle);other?.addEventListener("toggle",otherToggle);retry.addEventListener("click",retryClick);more.addEventListener("click",moreClick);dialog.addEventListener("close",close);dialog.addEventListener("cancel",cancel);
}
window.VATRA_STORY_REACTIONS={start,stop,blocked,read,write,page};
})();
