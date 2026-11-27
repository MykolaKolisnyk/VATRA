(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_SECTION_CORE?.start(async ({root,locale,t,$,make,link,btn,valid,title,subtitle,action,content,notice,client,user,ownId,message,empty,card,field,submit,confirmRemove,tabs,dialog,nameOf,sectionIcon,sectionIconButton,discoveryIcons})=>{
let renderTicket=0;
const clipSwipeDirection=(start,end)=>{
 if(!start||!end)return 0;
 const x=end.clientX-start.clientX,y=end.clientY-start.clientY;
 return Math.abs(y)>=55&&Math.abs(y)>Math.abs(x)*1.3?(y<0?1:-1):0;
};
const clipPageFilter=cursor=>cursor&&typeof cursor.created_at==="string"&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(cursor.created_at)&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor.id)
 ? "created_at.lt."+cursor.created_at+",and(created_at.eq."+cursor.created_at+",id.lt."+cursor.id+")":null;
async function clips(){
 title.textContent=t("Кліпи","Clips");subtitle.textContent="";
 action.textContent=t("Додати кліп","Create clip");action.hidden=false;action.className="vatra-discovery-primary vatra-section-action-001";
 const layout=make("div","vatra-discovery-workspace ui-vatra-clips-viewer-001"),grid=make("div","ui-vatra-clips-grid-001"),side=make("aside","vatra-discovery-sidebar ui-vatra-clips-sidebar-001"),detail=card("ui-vatra-clips-detail-001"),social=card("ui-vatra-clips-social-001"),gallery=make("div","vatra-discovery-content ui-vatra-clips-gallery-001"),viewer=make("div","vatra-discovery-content ui-vatra-clips-watch-001"),info=make("div","ui-vatra-clips-watch-info-001");
 let requestedClip=new URLSearchParams(location.search).get("clip");
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedClip||""))requestedClip=null;
 let mode="all",term="",items=[],index=0,revision=0,muted=true,video=null,friendIds=null,searchTimer,watching=false,previewObserver=null;
 const pageSize=24;
 let pageState={cursor:null,hasMore:true,pending:null},moving=false,lastWheel=0,resumeVideo=null;
 const acceptable=post=>{const item=post.media_items?.[0],id=String(post.author_vatra_id);return valid(id)&&item?.media_kind==="video"&&window.VATRA_POST_MEDIA?.clipPathValid(item.media_path,id);};
 async function fetchPage(ticket=renderTicket,state=pageState){
  if(!state.hasMore||ticket!==renderTicket||state!==pageState)return;
  if(state.pending)return state.pending;
  const job=(async()=>{
   let query=client.from("feed_posts").select("id,author_vatra_id,body,media_items,created_at,is_clip").eq("is_clip",true).is("archived_at",null);
   if(mode==="mine")query=query.eq("author_vatra_id",ownId);
   if(mode==="friends"){
    if(!friendIds){const f=await client.from("friendships").select("requester_id,recipient_id").eq("status","accepted").or("requester_id.eq."+ownId+",recipient_id.eq."+ownId).limit(350);if(f.error)throw f.error;friendIds=[...new Set((f.data||[]).map(x=>String(x.requester_id)===ownId?String(x.recipient_id):String(x.requester_id)).filter(valid))];}
    if(ticket!==renderTicket||state!==pageState)return;
    if(!friendIds.length){state.hasMore=false;return;}query=query.in("author_vatra_id",friendIds);
   }
   if(term)query=query.ilike("body","%"+term.replace(/[\\%_]/g,"\\$&")+"%");
   if(state.cursor){const filter=clipPageFilter(state.cursor);if(!filter){state.hasMore=false;return;}query=query.or(filter);}
   const result=await query.order("created_at",{ascending:false}).order("id",{ascending:false}).limit(pageSize);
   if(ticket!==renderTicket||state!==pageState)return;if(result.error)throw result.error;
   const rows=result.data||[],last=rows[rows.length-1];
   state.hasMore=rows.length===pageSize&&!!clipPageFilter(last);
   if(last)state.cursor=last;
   const existing=new Set(items.map(post=>post.id));
   for(const post of rows)if(acceptable(post)&&!existing.has(post.id)){existing.add(post.id);items.push(post);}
  })();
  state.pending=job;
  try{await job;}finally{if(state.pending===job)state.pending=null;}
 }
 async function move(delta){
  if(!watching||moving)return;
  const target=index+delta,ticket=renderTicket,token=revision,state=pageState;
  if(target<0)return;
  if(target<items.length){show(target);return;}
  if(!state.hasMore)return;
  moving=true;
  try{
   for(let attempt=0;attempt<3&&target>=items.length&&state.hasMore;attempt++)await fetchPage(ticket,state);
   if(ticket!==renderTicket||token!==revision||state!==pageState||!watching)return;
   if(target<items.length)show(target);
   else if(!state.hasMore)grid.querySelector(".vatra-clip-next-001")?.setAttribute("disabled","");
  }catch(_){if(ticket===renderTicket&&token===revision)message(t("Не вдалося завантажити кліпи.","Could not load clips."),true);}
  finally{if(ticket===renderTicket)moving=false;}
 }
 const nav=tabs([["all",t("Для вас","For you")],["friends",t("Друзі","Friends")],["mine",t("Мої кліпи","My clips")],["search",t("Пошук кліпів","Search clips")]],key=>{mode=key;watching=false;clearTimeout(searchTimer);if(key==="search")find.focus();else{term="";find.value="";}void load();},"vatra-discovery-tabs ui-vatra-clips-nav-001");discoveryIcons(nav,{all:"film",friends:"friends",mine:"videoMine",search:"search"});
 const find=make("input","vatra-discovery-search ui-vatra-clip-search-001");find.type="search";find.placeholder=t("Пошук кліпів","Search clips");find.setAttribute("aria-label",find.placeholder);find.addEventListener("input",()=>{term=find.value.trim();watching=false;clearTimeout(searchTimer);searchTimer=setTimeout(load,250);});
 const searchBox=make("div","vatra-discovery-search-box ui-vatra-clips-search-box-001");searchBox.append(sectionIcon("search"),find);side.append(make("h2","vatra-discovery-title vatra-browse-title-001",t("Кліпи","Clips")),searchBox,nav,action);info.append(detail,social);viewer.append(grid,info);viewer.hidden=true;layout.append(side,gallery,viewer);content.append(layout);
 function stop(){if(video){video.pause();video.removeAttribute("src");video.load();video=null;}}
 function clearPreviews(){previewObserver?.disconnect();previewObserver=null;for(const el of gallery.querySelectorAll("video")){el.pause();el.removeAttribute("src");el.load();}}
 function browse(){
  watching=false;const token=++revision;stop();clearPreviews();gallery.hidden=false;viewer.hidden=true;grid.replaceChildren();detail.replaceChildren();social.replaceChildren();gallery.replaceChildren();
  const title=make("h2","vatra-clips-gallery-title-001",mode==="mine"?t("Мої кліпи","My clips"):mode==="friends"?t("Кліпи друзів","Friends’ clips"):term?t("Результати пошуку","Search results"):t("Нові кліпи","New clips"));
  gallery.append(title);
  if(!items.length){const box=make("section","ui-vatra-clips-empty-001");box.append(sectionIcon("film"),make("h2","vatra-clips-empty-title-001",t("Кліпів поки немає","No clips yet")),make("p","vatra-clips-empty-copy-001",term?t("Спробуйте інший запит.","Try a different search."):t("Поділіться першим коротким відео у VATRA.","Share the first short video on VATRA.")),btn(t("Опублікувати кліп","Publish a clip"),"vatra-clips-empty-action-001",()=>action.click()));gallery.append(box);return;}
  const cards=make("div","ui-vatra-clips-gallery-grid-001"),more=btn(t("Показати більше","Show more"),"vatra-clips-more-001",async()=>{
   if(more.disabled)return;more.disabled=true;
   try{if(offset>=items.length&&pageState.hasMore)await fetchPage();if(token===revision&&!gallery.hidden)appendBatch();}
   catch(_){if(token===revision)message(t("Не вдалося завантажити кліпи.","Could not load clips."),true);}
   finally{more.disabled=false;}
  });let offset=0;
  const preview=async(el,post)=>{try{const url=await window.VATRA_POST_MEDIA.signed(client,"video",post.media_items[0].media_path,900);if(token!==revision||!el.isConnected||gallery.hidden)return;const v=make("video","ui-vatra-clip-preview-video-001");v.muted=true;v.playsInline=true;v.preload="metadata";v.src=url;el.prepend(v);}catch(_){}};
  const targets=new Map();
  if(typeof IntersectionObserver==="function")previewObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;previewObserver?.unobserve(entry.target);const post=targets.get(entry.target);targets.delete(entry.target);if(post)void preview(entry.target,post);}},{rootMargin:"100px"});
  function appendBatch(){const labels=[];for(let i=offset;i<Math.min(offset+12,items.length);i++){const post=items[i],tile=make("article","ui-vatra-clip-preview-001"),cover=btn("","ui-vatra-clip-preview-cover-001",()=>show(i));cover.setAttribute("aria-label",t("Відкрити кліп","Open clip"));const play=make("span","ui-vatra-clip-preview-play-001");play.append(sectionIcon("film"));cover.append(play);const author=link(t("Користувач VATRA","VATRA user"),"id"+post.author_vatra_id,"vatra-clip-preview-author-001");const caption=make("p","vatra-clip-preview-caption-001",post.body||t("Кліп VATRA","VATRA clip"));tile.append(cover,caption,author);cards.append(tile);if(previewObserver){targets.set(cover,post);previewObserver.observe(cover);}else void preview(cover,post);labels.push([String(post.author_vatra_id),author]);}offset=Math.min(offset+12,items.length);more.hidden=offset>=items.length&&!pageState.hasMore;
   if(window.VATRA_PUBLIC_NAMES){void window.VATRA_PUBLIC_NAMES.get(client,labels.map(([id])=>id)).then(({data,error})=>{
    if(error||token!==revision)return;const names=new Map((data||[]).map(row=>[String(row.vatra_id),row.display_name]));
    for(const [id,author] of labels)if(author.isConnected&&names.has(id))author.textContent=names.get(id);
   }).catch(()=>{});}else for(const [id,author] of labels)void nameOf(id).then(name=>{if(author.isConnected&&token===revision)author.textContent=name;}).catch(()=>{});
  }
  gallery.append(cards,more);appendBatch();
 }
 function show(next){
  if(!items.length){browse();return;}watching=true;clearPreviews();gallery.hidden=true;viewer.hidden=false;
  const token=++revision;stop();grid.replaceChildren();detail.replaceChildren();social.replaceChildren();detail.hidden=true;social.hidden=true;
  index=Math.max(0,Math.min(next,items.length-1));const post=items[index],id=String(post.author_vatra_id),item=post.media_items[0];
  const stage=make("div","ui-vatra-clip-stage-001"),frame=make("div","ui-vatra-clip-frame-001"),rail=make("div","ui-vatra-clip-rail-001");
  const sound=sectionIconButton(muted?"mute":"volume",t("Звук","Sound"),"vatra-clip-sound-001",()=>{muted=!muted;if(video)video.muted=muted;sound.replaceChildren(sectionIcon(muted?"mute":"volume"));sound.setAttribute("aria-pressed",String(!muted));});sound.setAttribute("aria-pressed",String(!muted));
  const up=sectionIconButton("up",t("Попередній кліп","Previous clip"),"vatra-clip-prev-001",()=>void move(-1)),down=sectionIconButton("down",t("Наступний кліп","Next clip"),"vatra-clip-next-001",()=>void move(1));up.disabled=index===0;down.disabled=index===items.length-1&&!pageState.hasMore;
  const position=make("span","vatra-clip-position-001",(index+1)+" / "+items.length);rail.append(sound,up,position,down);stage.append(frame,rail);grid.append(btn(t("← Усі кліпи","← All clips"),"vatra-clips-back-001",browse),stage);
  const play=btn(t("Відтворити","Play"),"vatra-clip-play-001",async()=>{if(play.disabled)return;play.disabled=true;try{const url=await window.VATRA_POST_MEDIA.signed(client,"video",item.media_path,900);if(token!==revision||!frame.isConnected)return;video=make("video","ui-vatra-clip-video-001");video.controls=true;video.playsInline=true;video.muted=muted;video.loop=true;video.preload="metadata";video.src=url;video.addEventListener("error",()=>{if(token===revision){stop();play.disabled=false;play.textContent=t("Повторити","Retry");frame.replaceChildren(play);sound.hidden=false;}});frame.replaceChildren(video);const player=window.VATRA_PLAYER?.attach(video,{mode:"clip"});if(player)sound.hidden=true;video.addEventListener("volumechange",()=>{if(token!==revision||!video)return;muted=video.muted;sound.replaceChildren(sectionIcon(muted?"mute":"volume"));sound.setAttribute("aria-pressed",String(!muted));});if(!document.hidden)void video.play().catch(()=>{});}catch(_){play.textContent=t("Повторити","Retry");play.disabled=false;}});frame.append(play);void play.click();
  const author=link("VATRA ID "+id,"id"+id,"vatra-clip-author-001"),caption=make("p","feed-post-body vatra-clip-caption-001",post.body||"");detail.append(author,caption);window.VATRA_POST_MEDIA?.linkifyHashtags(caption);window.VATRA_POST_MEDIA?.collapsibleBody(caption);detail.hidden=false;void nameOf(id).then(name=>{if(token===revision)author.textContent=name;}).catch(()=>{});
  social.hidden=false;social.append(make("h2","vatra-clips-social-title-001",t("Коментарі та реакції","Comments and reactions")));
  if(window.VATRA_POST_INTERACTIONS?.mount)window.VATRA_POST_INTERACTIONS.mount(client,{...post,kind:"person"},social,{ownId,userId:user.id,inlineComments:true});
  else social.append(make("p","vatra-clips-social-unavailable-001",t("Коментарі тимчасово недоступні.","Comments temporarily unavailable.")));
  stage.addEventListener("wheel",e=>{if(Math.abs(e.deltaY)<25||e.ctrlKey)return;e.preventDefault();const now=Date.now();if(now-lastWheel<450)return;lastWheel=now;void move(Math.sign(e.deltaY));},{passive:false});
  let touch=null;
  frame.addEventListener("touchstart",e=>{touch=e.touches.length===1&&!e.target.closest?.("button,input,select,a,.vatra-player-controls-001")?e.touches[0]:null;},{passive:true});
  frame.addEventListener("touchend",e=>{const direction=clipSwipeDirection(touch,e.changedTouches[0]);touch=null;if(direction&&token===revision)void move(direction);},{passive:true});
  frame.addEventListener("touchcancel",()=>{touch=null;},{passive:true});
 }
 document.addEventListener("keydown",e=>{if(!["ArrowUp","ArrowDown"].includes(e.key)||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||!watching||e.target.closest?.("input,textarea,select,button,a,video,dialog,[contenteditable]"))return;if(!items.length)return;e.preventDefault();void move(e.key==="ArrowDown"?1:-1);});
 document.addEventListener("visibilitychange",()=>{
  if(document.hidden){resumeVideo=video&&!video.paused?video:null;video?.pause();}
  else if(resumeVideo&&resumeVideo===video&&watching){void video.play().catch(()=>{});resumeVideo=null;}
 });
 window.addEventListener("pagehide",()=>{stop();clearPreviews();});
 const load=async()=>{
  const ticket=++renderTicket;++revision;stop();clearPreviews();watching=false;moving=false;items=[];pageState={cursor:null,hasMore:true,pending:null};viewer.hidden=true;gallery.hidden=false;gallery.setAttribute("aria-busy","true");message("");
  try{
   for(let attempt=0;attempt<3&&!items.length&&pageState.hasMore;attempt++){await fetchPage(ticket);if(ticket!==renderTicket)return;}
   if(requestedClip){const requested=requestedClip;requestedClip=null;let at=items.findIndex(post=>post.id===requested);if(at<0){const direct=await client.from("feed_posts").select("id,author_vatra_id,body,media_items,created_at,is_clip").eq("id",requested).eq("is_clip",true).is("archived_at",null).maybeSingle();if(ticket!==renderTicket)return;if(!direct.error&&direct.data&&acceptable(direct.data)){items.unshift(direct.data);at=0;}}if(at>=0){show(at);return;}message(t("Кліп недоступний.","Clip unavailable."),true);}
   if(items.length&&(mode==="all"||mode==="friends"))show(0);else browse();
  }catch(_){if(ticket===renderTicket){items=[];browse();message(t("Не вдалося завантажити кліпи.","Could not load clips."),true);}}
  finally{if(ticket===renderTicket)gallery.setAttribute("aria-busy","false");}
 };
 let composerDialog=null,composerLoading=false;
 action.addEventListener("click",async()=>{
  if(composerLoading||composerDialog?.open)return;
  composerLoading=true;action.setAttribute("aria-busy","true");
  try{
   if(!composerDialog){
    const module=await import(new URL("assets/js/clip-composer.js?rev=e55d638c4ae19ac1d54e4680f370a75584d818d7",root).href);
    composerDialog=module.createClipComposer({dialog,field,t,make,submit,message,client,ownId,user,load});
   }
   if(action.isConnected)composerDialog.showModal();
  }catch(_){message(t("Не вдалося відкрити форму кліпу.","Could not open clip composer."),true);}
  finally{composerLoading=false;action.removeAttribute("aria-busy");}
 });await load();
}
await clips();
});
})();
