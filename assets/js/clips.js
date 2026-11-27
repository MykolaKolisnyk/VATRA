(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_SECTION_CORE?.start(async ({root,locale,t,$,make,link,btn,valid,title,subtitle,action,content,notice,client,user,ownId,message,empty,card,field,submit,confirmRemove,tabs,dialog,nameOf,sectionIcon,sectionIconButton,discoveryIcons})=>{
let renderTicket=0;
async function clips(){
 title.textContent=t("Кліпи","Clips");subtitle.textContent="";
 action.textContent=t("Додати кліп","Create clip");action.hidden=false;action.className="vatra-discovery-primary vatra-section-action-001";
 const layout=make("div","vatra-discovery-workspace ui-vatra-clips-viewer-001"),grid=make("div","ui-vatra-clips-grid-001"),side=make("aside","vatra-discovery-sidebar ui-vatra-clips-sidebar-001"),detail=card("ui-vatra-clips-detail-001"),social=card("ui-vatra-clips-social-001"),gallery=make("div","vatra-discovery-content ui-vatra-clips-gallery-001"),viewer=make("div","vatra-discovery-content ui-vatra-clips-watch-001"),info=make("div","ui-vatra-clips-watch-info-001");
 let requestedClip=new URLSearchParams(location.search).get("clip");
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedClip||""))requestedClip=null;
 let mode="all",term="",items=[],index=0,revision=0,muted=true,video=null,friendIds=null,searchTimer,watching=false,previewObserver=null;
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
  const cards=make("div","ui-vatra-clips-gallery-grid-001"),more=btn(t("Показати більше","Show more"),"vatra-clips-more-001",()=>appendBatch());let offset=0;
  const preview=async(el,post)=>{try{const url=await window.VATRA_POST_MEDIA.signed(client,"video",post.media_items[0].media_path,900);if(token!==revision||!el.isConnected||gallery.hidden)return;const v=make("video","ui-vatra-clip-preview-video-001");v.muted=true;v.playsInline=true;v.preload="metadata";v.src=url;el.prepend(v);}catch(_){}};
  const targets=new Map();
  if(typeof IntersectionObserver==="function")previewObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;previewObserver?.unobserve(entry.target);const post=targets.get(entry.target);targets.delete(entry.target);if(post)void preview(entry.target,post);}},{rootMargin:"100px"});
  function appendBatch(){const labels=[];for(let i=offset;i<Math.min(offset+12,items.length);i++){const post=items[i],tile=make("article","ui-vatra-clip-preview-001"),cover=btn("","ui-vatra-clip-preview-cover-001",()=>show(i));cover.setAttribute("aria-label",t("Відкрити кліп","Open clip"));const play=make("span","ui-vatra-clip-preview-play-001");play.append(sectionIcon("film"));cover.append(play);const author=link(t("Користувач VATRA","VATRA user"),"id"+post.author_vatra_id,"vatra-clip-preview-author-001");const caption=make("p","vatra-clip-preview-caption-001",post.body||t("Кліп VATRA","VATRA clip"));tile.append(cover,caption,author);cards.append(tile);if(previewObserver){targets.set(cover,post);previewObserver.observe(cover);}else void preview(cover,post);labels.push([String(post.author_vatra_id),author]);}offset+=12;more.hidden=offset>=items.length;
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
  const up=sectionIconButton("up",t("Попередній кліп","Previous clip"),"vatra-clip-prev-001",()=>show(index-1)),down=sectionIconButton("down",t("Наступний кліп","Next clip"),"vatra-clip-next-001",()=>show(index+1));up.disabled=index===0;down.disabled=index===items.length-1;
  const position=make("span","vatra-clip-position-001",(index+1)+" / "+items.length);rail.append(sound,up,position,down);stage.append(frame,rail);grid.append(btn(t("← Усі кліпи","← All clips"),"vatra-clips-back-001",browse),stage);
  const play=btn(t("Відтворити","Play"),"vatra-clip-play-001",async()=>{if(play.disabled)return;play.disabled=true;try{const url=await window.VATRA_POST_MEDIA.signed(client,"video",item.media_path,900);if(token!==revision||!frame.isConnected)return;video=make("video","ui-vatra-clip-video-001");video.controls=true;video.playsInline=true;video.muted=muted;video.loop=true;video.preload="metadata";video.src=url;video.addEventListener("error",()=>{if(token===revision){stop();play.disabled=false;play.textContent=t("Повторити","Retry");frame.replaceChildren(play);}});frame.replaceChildren(video);void video.play().catch(()=>{});}catch(_){play.textContent=t("Повторити","Retry");play.disabled=false;}});frame.append(play);void play.click();
  const author=link("VATRA ID "+id,"id"+id,"vatra-clip-author-001"),caption=make("p","vatra-clip-caption-001",post.body||"");detail.append(author,caption);detail.hidden=false;void nameOf(id).then(name=>{if(token===revision)author.textContent=name;}).catch(()=>{});
  social.hidden=false;social.append(make("h2","vatra-clips-social-title-001",t("Коментарі та реакції","Comments and reactions")));
  if(window.VATRA_POST_INTERACTIONS?.mount)window.VATRA_POST_INTERACTIONS.mount(client,{...post,kind:"person"},social,{ownId,userId:user.id,inlineComments:true});
  else social.append(make("p","vatra-clips-social-unavailable-001",t("Коментарі тимчасово недоступні.","Comments temporarily unavailable.")));
  let lastWheel=0;stage.addEventListener("wheel",e=>{if(Math.abs(e.deltaY)<25||e.ctrlKey)return;e.preventDefault();const now=Date.now();if(now-lastWheel<450)return;lastWheel=now;const n=index+Math.sign(e.deltaY);if(n>=0&&n<items.length)show(n);},{passive:false});
 }
 document.addEventListener("keydown",e=>{if(!["ArrowUp","ArrowDown"].includes(e.key)||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||!watching||e.target.closest?.("input,textarea,select,button,a,video,dialog,[contenteditable]"))return;if(!items.length)return;e.preventDefault();show(index+(e.key==="ArrowDown"?1:-1));});
 window.addEventListener("pagehide",()=>{stop();clearPreviews();});
 const load=async()=>{
  const ticket=++renderTicket;++revision;stop();clearPreviews();viewer.hidden=true;gallery.hidden=false;gallery.setAttribute("aria-busy","true");message("");
  try{
   let query=client.from("feed_posts").select("id,author_vatra_id,body,media_items,created_at,is_clip").eq("is_clip",true).is("archived_at",null);
   if(mode==="mine")query=query.eq("author_vatra_id",ownId);
   if(mode==="friends"){
    if(!friendIds){const f=await client.from("friendships").select("requester_id,recipient_id").eq("status","accepted").or("requester_id.eq."+ownId+",recipient_id.eq."+ownId).limit(350);if(f.error)throw f.error;friendIds=[...new Set((f.data||[]).map(x=>String(x.requester_id)===ownId?String(x.recipient_id):String(x.requester_id)).filter(valid))];}
    if(ticket!==renderTicket)return;if(!friendIds.length){items=[];browse();return;}query=query.in("author_vatra_id",friendIds);
   }
   if(term)query=query.ilike("body","%"+term.replace(/[\\%_]/g,"\\$&")+"%");
   const result=await query.order("created_at",{ascending:false}).limit(60);if(ticket!==renderTicket)return;if(result.error)throw result.error;
   const acceptable=post=>{const item=post.media_items?.[0],id=String(post.author_vatra_id);return valid(id)&&item?.media_kind==="video"&&typeof item.media_path==="string"&&item.media_path.startsWith(id+"/posts/");};
   items=(result.data||[]).filter(acceptable);
   if(requestedClip){const requested=requestedClip;requestedClip=null;let at=items.findIndex(post=>post.id===requested);if(at<0){const direct=await client.from("feed_posts").select("id,author_vatra_id,body,media_items,created_at,is_clip").eq("id",requested).eq("is_clip",true).is("archived_at",null).maybeSingle();if(ticket!==renderTicket)return;if(!direct.error&&direct.data&&acceptable(direct.data)){items.unshift(direct.data);at=0;}}if(at>=0){show(at);return;}message(t("Кліп недоступний.","Clip unavailable."),true);}
   browse();
  }catch(_){if(ticket===renderTicket){items=[];browse();message(t("Не вдалося завантажити кліпи.","Could not load clips."),true);}}
  finally{if(ticket===renderTicket)gallery.setAttribute("aria-busy","false");}
 };
 let composerDialog=null,composerLoading=false;
 action.addEventListener("click",async()=>{
  if(composerLoading||composerDialog?.open)return;
  composerLoading=true;action.setAttribute("aria-busy","true");
  try{
   if(!composerDialog){
    const module=await import(new URL("assets/js/clip-composer.js?rev=f9a6635c0da0e0f8c14c3e3f847b4b0252a7dee3",root).href);
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
