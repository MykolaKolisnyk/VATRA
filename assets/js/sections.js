(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript.src);
const page=document.body.dataset.page;
const locale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
const t=(uk,en)=>locale==="uk"?uk:locale==="en"?en:(window.VATRA_LANGUAGE?.translate?.(uk)||uk);
const $=s=>document.querySelector(s);
const make=(tag,cls,txt)=>{const el=document.createElement(tag);el.className=cls;if(txt!==undefined)el.textContent=txt;return el;};
const link=(label,url,cls)=>{const el=make("a",cls,label);el.href=new URL(url,root).href;return el;};
const btn=(label,cls,fn)=>{const el=make("button",cls,label);el.type="button";el.addEventListener("click",fn);return el;};
const valid=id=>/^[1-9][0-9]{0,18}$/.test(String(id??""));
const title=$("#vatra-section-title"),subtitle=$("#vatra-section-subtitle"),action=$("#vatra-section-action"),content=$("#vatra-section-content"),notice=$("#vatra-section-status");
let client,user,ownId,renderTicket=0;
const message=(text,error=false)=>{notice.hidden=!text;notice.dataset.kind=error?"error":"info";notice.textContent=text;
 const local=document.querySelector("dialog[open] .vt-vatra-section-dialog-status-001");if(local){local.hidden=!text;local.dataset.kind=error?"error":"info";local.textContent=text;}};
const empty=(text)=>make("p","vt-vatra-section-empty-001",text);
const card=(cls)=>make("section","ui-vatra-section-card-001 "+cls);
const field=(form,key,label,type="text",max=100,required=false)=>{const wrap=make("div","ui-vatra-section-field-"+key),lab=make("label","vt-vatra-section-label-"+key,label),el=make(type==="textarea"?"textarea":"input","ui-vatra-section-input-"+key);
el.id="vatra-section-"+key;lab.htmlFor=el.id;if(type!=="textarea")el.type=type;el.maxLength=max;el.required=required;if(type==="textarea")el.rows=4;wrap.append(lab,el);form.append(wrap);return el;};
const submit=(form,label,fn)=>{const b=make("button","vt-vatra-section-submit-001",label);b.type="submit";form.append(b);form.addEventListener("submit",async e=>{e.preventDefault();if(b.disabled)return;b.disabled=true;message("");try{await fn();}catch(_){message(t("Не вдалося зберегти. Спробуйте ще раз.","Could not save. Please retry."),true);}finally{b.disabled=false;}});return b;};
async function confirmRemove(heading=t("Видалити оголошення?","Delete listing?"),description=t("Цю дію неможливо скасувати.","This action cannot be undone."),accept=t("Видалити","Delete")){
 return new Promise(resolve=>{const d=make("dialog","ui-vatra-section-dialog-001 ui-vatra-section-confirm-001"),head=make("header","ui-vatra-section-dialog-head-001"),body=make("div","ui-vatra-section-dialog-form-001");
 head.append(make("h2","vt-vatra-section-dialog-title-001",heading));
 body.append(make("p","vt-vatra-section-form-note-001",description));
 const buttons=make("div","ui-vatra-market-controls-001");let accepted=false;
 buttons.append(btn(t("Скасувати","Cancel"),"vt-vatra-section-confirm-cancel-001",()=>d.close()),btn(accept,"vt-vatra-section-confirm-delete-001",()=>{accepted=true;d.close();}));body.append(buttons);d.append(head,body);document.body.append(d);d.addEventListener("close",()=>{d.remove();resolve(accepted);},{once:true});d.showModal();});
}
function tabs(items,onChange){const bar=make("div","ui-vatra-section-tabs-001");bar.setAttribute("role","group");for(const [id,label] of items){const b=btn(label,"vt-vatra-section-tab-"+id,()=>{for(const el of bar.children){el.classList.toggle("is-active",el===b);el.setAttribute("aria-pressed",String(el===b));}onChange(id);});b.dataset.tab=id;b.setAttribute("aria-pressed","false");bar.append(b);}bar.firstElementChild?.classList.add("is-active");bar.firstElementChild?.setAttribute("aria-pressed","true");return bar;}
const dialog=(heading)=>{const d=make("dialog","ui-vatra-section-dialog-001"),head=make("header","ui-vatra-section-dialog-head-001");head.append(make("h2","vt-vatra-section-dialog-title-001",heading),btn("×","vt-vatra-section-dialog-close-001",()=>d.close()));const form=make("form","ui-vatra-section-dialog-form-001");const status=make("p","vt-vatra-section-dialog-status-001");status.hidden=true;status.setAttribute("role","status");d.append(head,form,status);document.body.append(d);d.addEventListener("close",()=>message(""));d.addEventListener("click",e=>{if(e.target===d)d.close();});return {d,form};};
async function nameOf(id){const {data}=await client.from("public_profiles").select("display_name").eq("vatra_id",id).maybeSingle();return data?.display_name||t("Учасник VATRA","VATRA member");}
const sectionPaths={catalog:"M4 6h16M4 12h12M4 18h8",all:"M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",clothes:"m8 4 4 2 4-2 5 4-3 5-2-1v8H8v-8l-2 1-3-5z",electronics:"M4 4h16v12H4zM2 20h20",home:"M4 11V8a3 3 0 0 1 6 0v1h4V8a3 3 0 0 1 6 0v3M4 11a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-4 0v1H6v-1a2 2 0 0 0-2-2zM5 18v3m14-3v3",transport:"m5 10 2-6h10l2 6M3 10h18v8H3zM5 18v2m14-2v2M6 14h2m8 0h2",sport:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM5 5l14 14M5 19 19 5M3 9c7 1 12 6 12 12M9 3c1 7 6 12 12 12",other:"M4 7h16v14H4zM3 3h18v4H3zM9 11h6",bookmark:"M6 3h12v18l-6-4-6 4z",up:"m6 14 6-6 6 6",down:"m6 10 6 6 6-6",volume:"M3 9h4l5-5v16l-5-5H3zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",mute:"M3 9h4l5-5v16l-5-5H3zM16 9l5 6m0-6-5 6",pin:"M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",film:"M4 4h16v16H4zM4 9h16M8 4v5m8-5v5m-7 4 6 3-6 3z",search:"M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 6 6"};
function sectionIcon(key){const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg"),path=document.createElementNS(ns,"path");svg.setAttribute("class","ui-vatra-section-icon-"+key);svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("width","25");svg.setAttribute("height","25");svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.7");svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");svg.setAttribute("aria-hidden","true");path.setAttribute("class","ui-vatra-section-path-"+key);path.setAttribute("d",sectionPaths[key]||sectionPaths.other);svg.append(path);return svg;}
function sectionIconButton(key,label,cls,fn){const b=btn("",cls,fn);b.title=label;b.setAttribute("aria-label",label);b.append(sectionIcon(key));return b;}
async function clips(){
 title.textContent=t("Кліпи","Clips");subtitle.textContent=t("Короткі відео від людей у VATRA.","Short videos from people in VATRA.");
 action.textContent=t("Додати кліп","Create clip");action.hidden=false;
 const layout=make("div","ui-vatra-clips-viewer-001"),grid=make("div","ui-vatra-clips-grid-001"),side=make("aside","ui-vatra-clips-sidebar-001"),menu=card("ui-vatra-clips-menu-001"),detail=card("ui-vatra-clips-detail-001"),social=card("ui-vatra-clips-social-001");
 let mode="all",term="",items=[],index=0,revision=0,muted=true,video=null,friendIds=null,searchTimer;
 const nav=tabs([["all",t("Для вас","For you")],["friends",t("Друзі","Friends")],["mine",t("Мої кліпи","My clips")],["search",t("Пошук кліпів","Search clips")]],key=>{mode=key;find.hidden=key!=="search";if(key==="search")find.focus();void load();});
 const find=make("input","ui-vatra-clip-search-001");find.type="search";find.placeholder=t("Пошук кліпів","Search clips");find.setAttribute("aria-label",find.placeholder);find.hidden=true;find.addEventListener("input",()=>{term=find.value.trim();clearTimeout(searchTimer);searchTimer=setTimeout(load,250);});
 menu.append(make("h2","vt-vatra-clips-menu-title-001",t("Кліпи VATRA","VATRA Clips")),nav,find);side.append(menu,detail,social);layout.append(grid,side);content.append(layout);
 function stop(){if(video){video.pause();video.removeAttribute("src");video.load();video=null;}}
 function show(next){
  const token=++revision;stop();grid.replaceChildren();detail.replaceChildren();social.replaceChildren();detail.hidden=true;social.hidden=true;
  if(!items.length){const block=card("ui-vatra-clips-empty-001");block.append(sectionIcon("film"),make("h2","vt-vatra-clips-empty-title-001",mode==="mine"?t("Ваших кліпів ще немає","No clips of your own yet"):t("Кліпів поки немає","No clips yet")),make("p","vt-vatra-clips-empty-copy-001",t("Тут з’являтимуться короткі відео учасників VATRA.","Short videos from VATRA members will appear here.")),btn(t("Опублікувати кліп","Publish a clip"),"vt-vatra-clips-empty-action-001",()=>action.click()));grid.append(block);return;}
  index=Math.max(0,Math.min(next,items.length-1));const post=items[index],id=String(post.author_vatra_id),item=post.media_items[0];
  const stage=make("div","ui-vatra-clip-stage-001"),frame=make("div","ui-vatra-clip-frame-001"),rail=make("div","ui-vatra-clip-rail-001");
  const sound=sectionIconButton(muted?"mute":"volume",t("Звук","Sound"),"vt-vatra-clip-sound-001",()=>{muted=!muted;if(video)video.muted=muted;sound.replaceChildren(sectionIcon(muted?"mute":"volume"));sound.setAttribute("aria-pressed",String(!muted));});sound.setAttribute("aria-pressed",String(!muted));
  const up=sectionIconButton("up",t("Попередній кліп","Previous clip"),"vt-vatra-clip-prev-001",()=>show(index-1)),down=sectionIconButton("down",t("Наступний кліп","Next clip"),"vt-vatra-clip-next-001",()=>show(index+1));up.disabled=index===0;down.disabled=index===items.length-1;
  const position=make("span","vt-vatra-clip-position-001",(index+1)+" / "+items.length);rail.append(sound,up,position,down);stage.append(frame,rail);grid.append(stage);
  const play=btn(t("Відтворити","Play"),"vt-vatra-clip-play-001",async()=>{if(play.disabled)return;play.disabled=true;try{const url=await window.VATRA_POST_MEDIA.signed(client,"video",item.media_path,900);if(token!==revision||!frame.isConnected)return;video=make("video","ui-vatra-clip-video-001");video.controls=true;video.playsInline=true;video.muted=muted;video.loop=true;video.preload="metadata";video.src=url;video.addEventListener("error",()=>{if(token===revision){stop();play.disabled=false;play.textContent=t("Повторити","Retry");frame.replaceChildren(play);}});frame.replaceChildren(video);void video.play().catch(()=>{});}catch(_){play.textContent=t("Повторити","Retry");play.disabled=false;}});frame.append(play);void play.click();
  const author=link("VATRA ID "+id,"id"+id,"vt-vatra-clip-author-001"),caption=make("p","vt-vatra-clip-caption-001",post.body||"");detail.append(author,caption,link(t("Відкрити публікацію","Open post"),"feed?post="+encodeURIComponent(post.id),"vt-vatra-clip-post-001"));detail.hidden=false;void nameOf(id).then(name=>{if(token===revision)author.textContent=name;}).catch(()=>{});
  social.hidden=false;social.append(make("h2","vt-vatra-clips-social-title-001",t("Коментарі та реакції","Comments and reactions")));
  if(window.VATRA_POST_INTERACTIONS?.mount)window.VATRA_POST_INTERACTIONS.mount(client,{...post,kind:"person"},social,{ownId,userId:user.id,inlineComments:true});
  else social.append(link(t("Коментарі до публікації","Post comments"),"feed?post="+encodeURIComponent(post.id),"vt-vatra-clip-post-001"));
  let lastWheel=0;stage.addEventListener("wheel",e=>{if(Math.abs(e.deltaY)<25||e.ctrlKey)return;e.preventDefault();const now=Date.now();if(now-lastWheel<450)return;lastWheel=now;const n=index+Math.sign(e.deltaY);if(n>=0&&n<items.length)show(n);},{passive:false});
 }
 document.addEventListener("keydown",e=>{if(!["ArrowUp","ArrowDown"].includes(e.key)||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.target.closest?.("input,textarea,select,button,a,video,dialog,[contenteditable]"))return;if(!items.length)return;e.preventDefault();show(index+(e.key==="ArrowDown"?1:-1));});
 window.addEventListener("pagehide",stop);
 const load=async()=>{
  const ticket=++renderTicket;++revision;stop();grid.setAttribute("aria-busy","true");message("");
  try{
   let query=client.from("feed_posts").select("id,author_vatra_id,body,media_items,created_at").eq("is_clip",true).is("archived_at",null);
   if(mode==="mine")query=query.eq("author_vatra_id",ownId);
   if(mode==="friends"){
    if(!friendIds){const f=await client.from("friendships").select("requester_id,recipient_id").eq("status","accepted").or("requester_id.eq."+ownId+",recipient_id.eq."+ownId).limit(350);if(f.error)throw f.error;friendIds=[...new Set((f.data||[]).map(x=>String(x.requester_id)===ownId?String(x.recipient_id):String(x.requester_id)).filter(valid))];}
    if(ticket!==renderTicket)return;if(!friendIds.length){items=[];show(0);return;}query=query.in("author_vatra_id",friendIds);
   }
   if(mode==="search"&&term)query=query.ilike("body","%"+term.replace(/[\\%_]/g,"\\$&")+"%");
   const result=await query.order("created_at",{ascending:false}).limit(60);if(ticket!==renderTicket)return;if(result.error)throw result.error;
   items=(result.data||[]).filter(post=>{const item=post.media_items?.[0],id=String(post.author_vatra_id);return valid(id)&&item?.media_kind==="video"&&typeof item.media_path==="string"&&item.media_path.startsWith(id+"/posts/");});show(0);
  }catch(_){if(ticket===renderTicket){items=[];show(0);message(t("Не вдалося завантажити кліпи.","Could not load clips."),true);}}
  finally{if(ticket===renderTicket)grid.setAttribute("aria-busy","false");}
 };
 const {d,form}=dialog(t("Новий кліп","New clip"));
 const file=field(form,"clip-file",t("Відео MP4 або WebM · до 50 МБ, до 60 секунд","MP4 or WebM · up to 50 MB and 60 seconds"),"file",100,true);file.accept="video/mp4,video/webm";
 const body=field(form,"clip-caption",t("Опис кліпу","Caption"),"textarea",2000);
 form.append(make("p","vt-vatra-section-form-note-001",t("Кліп з’явиться у розділі Кліпи та у ваших публікаціях. Видимість — публічна в межах налаштувань приватності профілю.","Your clip will appear in Clips and your posts, subject to profile privacy.")));
 submit(form,t("Опублікувати кліп","Publish clip"),async()=>{
  const f=file.files?.[0];if(!f||!["video/mp4","video/webm"].includes(f.type)||f.size>52428800){message(t("Виберіть MP4 або WebM до 50 МБ.","Choose MP4 or WebM up to 50 MB."),true);return;}
  let url=URL.createObjectURL(f);let probe=document.createElement("video");probe.preload="metadata";
  let duration;try{duration=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error("timeout")),10000);probe.onloadedmetadata=()=>{clearTimeout(timeout);resolve(probe.duration);};probe.onerror=()=>{clearTimeout(timeout);reject(Error("video"));};probe.src=url;});}finally{probe.removeAttribute("src");probe.load();URL.revokeObjectURL(url);}
  if(!Number.isFinite(duration)||duration<=0||duration>60){message(t("Тривалість кліпу має бути до 60 секунд.","A clip must be up to 60 seconds."),true);return;}
  let uploaded;try{uploaded=await window.VATRA_POST_MEDIA.upload(client,ownId,f);const {error}=await client.from("feed_posts").insert({author_id:user.id,author_vatra_id:ownId,body:body.value.trim(),visibility:"public",is_clip:true,media_items:[uploaded]});if(error)throw error;}catch(e){if(uploaded)await window.VATRA_POST_MEDIA.removeGallery(client,[uploaded]).catch(()=>{});throw e;}
  form.reset();d.close();await load();
 });
 action.addEventListener("click",()=>d.showModal());await load();
}
const categories=[["electronics","Електроніка","Electronics"],["clothes","Одяг","Clothing"],["home","Дім і сад","Home & garden"],["transport","Транспорт","Transport"],["sport","Спорт і хобі","Sports & hobbies"],["other","Інше","Other"]];
async function marketplace(){
 title.textContent=t("Маркетплейс","Marketplace");subtitle.textContent=t("Купуйте та продавайте у спільноті VATRA.","Buy and sell in the VATRA community.");action.textContent=t("Створити оголошення","Create listing");action.hidden=false;
 let mine=false,savedOnly=false,category="all",term="",cityTerm="",low="",high="",sort="newest",rows=[];
 const storageKey="vatra:market:saved:"+ownId;let saved=new Set();try{const v=JSON.parse(localStorage.getItem(storageKey)||"[]");if(Array.isArray(v))saved=new Set(v.filter(x=>typeof x==="string").slice(0,500));}catch(_){}
 const toolbar=card("ui-vatra-market-toolbar-001"),grid=make("div","ui-vatra-market-grid-001"),filter=card("ui-vatra-market-filters-001"),body=make("div","ui-vatra-market-browse-001"),top=make("div","ui-vatra-market-top-001"),catalog=make("div","ui-vatra-market-catalog-001"),tiles=make("div","ui-vatra-market-categories-001"),navCard=card("ui-vatra-market-nav-001");
 const catalogButton=btn(t("Каталог","Catalog"),"vt-vatra-market-catalog-toggle-001",()=>{catalog.hidden=!catalog.hidden;catalogButton.setAttribute("aria-expanded",String(!catalog.hidden));});catalogButton.prepend(sectionIcon("catalog"));catalogButton.setAttribute("aria-expanded","false");catalog.hidden=true;
 const find=make("input","ui-vatra-market-search-001");find.type="search";find.placeholder=t("Пошук у Маркетплейсі","Search Marketplace");find.setAttribute("aria-label",find.placeholder);find.addEventListener("input",()=>{term=find.value.trim().toLocaleLowerCase();render();});top.append(catalogButton,find);
 const allCategories=[["all","Усі товари","All products"],...categories];
 const selectCategory=id=>{category=id;catalog.hidden=true;catalogButton.setAttribute("aria-expanded","false");for(const b of [...tiles.children,...catalog.children])b.setAttribute("aria-pressed",String(b.dataset.category===id));render();};
 for(const [id,uk,en] of allCategories){for(const [target,cls] of [[tiles,"vt-vatra-market-category-tile-"],[catalog,"vt-vatra-market-catalog-item-"]]){const b=btn("",cls+id,()=>selectCategory(id));b.dataset.category=id;b.setAttribute("aria-pressed",String(id==="all"));const icon=make("span","ui-vatra-market-category-symbol-"+id);icon.append(sectionIcon(id));b.append(icon,make("span","vt-vatra-market-category-label-"+id,t(uk,en)));target.append(b);}}
 catalog.addEventListener("keydown",e=>{if(e.key==="Escape"){catalog.hidden=true;catalogButton.setAttribute("aria-expanded","false");catalogButton.focus();}});
 toolbar.append(top,catalog,tiles);
 const mode=tabs([["all",t("Усі товари","All products")],["saved",t("Закладки","Bookmarks")],["mine",t("Мої оголошення","My listings")]],id=>{mine=id==="mine";savedOnly=id==="saved";void load();});navCard.append(mode);
 const heading=make("h2","vt-vatra-market-results-title-001",t("Усі товари","All products"));
 filter.append(make("h2","vt-vatra-market-filter-title-001",t("Фільтри","Filters")));
 const formFilters=make("div","ui-vatra-market-filter-fields-001");
 const cityFilter=field(formFilters,"filter-city",t("Місто","City"),"search",100);cityFilter.addEventListener("input",()=>{cityTerm=cityFilter.value.trim().toLocaleLowerCase();render();});
 const minPrice=field(formFilters,"filter-min",t("Ціна від, грн","Price from, UAH"),"number"),maxPrice=field(formFilters,"filter-max",t("Ціна до, грн","Price to, UAH"),"number");minPrice.min=maxPrice.min="0";minPrice.addEventListener("input",()=>{low=minPrice.value;render();});maxPrice.addEventListener("input",()=>{high=maxPrice.value;render();});
 formFilters.append(make("span","vt-vatra-market-sort-label-001",t("Сортування","Sort")),tabs([["newest",t("Нові","Newest")],["cheap",t("Дешевші","Lowest price")],["expensive",t("Дорожчі","Highest price")]],id=>{sort=id;render();}));
 const reset=btn(t("Скинути фільтри","Reset filters"),"vt-vatra-market-filter-reset-001",()=>{find.value=cityFilter.value=minPrice.value=maxPrice.value="";term=cityTerm=low=high="";selectCategory("all");});
 formFilters.append(reset);filter.append(formFilters);
 const results=card("ui-vatra-market-results-001");results.append(heading,grid);body.append(results,filter);content.append(toolbar,navCard,body);
 const render=()=>{grid.replaceChildren();heading.textContent=savedOnly?t("Закладки","Bookmarks"):mine?t("Мої оголошення","My listings"):t(...(allCategories.find(x=>x[0]===category)||allCategories[0]).slice(1,3));const visible=rows.filter(r=>(!savedOnly||saved.has(r.id))&&(category==="all"||r.category===category)&&(!term||(r.title+" "+r.description+" "+r.city).toLocaleLowerCase().includes(term))&&(!cityTerm||String(r.city||"").toLocaleLowerCase().includes(cityTerm))&&(!low||Number(r.price)>=Number(low))&&(!high||Number(r.price)<=Number(high)));if(sort!=="newest")visible.sort((a,b)=>sort==="cheap"?Number(a.price)-Number(b.price):Number(b.price)-Number(a.price));
  if(!visible.length){grid.append(empty(savedOnly?t("Тут з’являться збережені вами оголошення. Закладки зберігаються у цьому браузері.","Your saved listings will appear here. Bookmarks are stored in this browser."):t("Оголошень не знайдено.","No listings found.")));return;}
  for(const row of visible){const c=card("ui-vatra-market-listing-001"),photo=make("div","ui-vatra-market-photo-001"),info=make("div","ui-vatra-market-info-001");photo.append(make("span","vt-vatra-market-photo-placeholder-001",t("Фото","Photo")));
   if(row.image_path){void client.storage.from("marketplace-images").createSignedUrl(row.image_path,900).then(({data,error})=>{if(error||!data?.signedUrl||!photo.isConnected)return;const img=make("img","ui-vatra-market-image-001");img.alt=row.title;img.loading="lazy";img.src=data.signedUrl;photo.replaceChildren(img);}).catch(()=>{});}
   const save=sectionIconButton("bookmark",t("Зберегти оголошення","Save listing"),"vt-vatra-market-bookmark-001",()=>{const next=new Set(saved);if(next.has(row.id))next.delete(row.id);else if(next.size<500)next.add(row.id);else{message(t("Досягнуто ліміт закладок.","Bookmark limit reached."),true);return;}try{localStorage.setItem(storageKey,JSON.stringify([...next]));saved=next;}catch(_){message(t("Не вдалося зберегти закладку.","Could not save bookmark."),true);return;}save.setAttribute("aria-pressed",String(saved.has(row.id)));if(savedOnly)render();});save.setAttribute("aria-pressed",String(saved.has(row.id)));c.append(save);
   info.append(make("strong","vt-vatra-market-price-001",new Intl.NumberFormat(locale==="en"?"en-GB":"uk-UA",{style:"currency",currency:"UAH",maximumFractionDigits:2}).format(Number(row.price))),make("h2","vt-vatra-market-title-001",row.title),make("p","vt-vatra-market-description-001",row.description));
   if(row.city)info.append(make("span","vt-vatra-market-city-001",row.city));
   const seller=link(t("Профіль продавця","Seller profile"),"id"+row.seller_vatra_id,"vt-vatra-market-seller-001");info.append(seller);
   if(String(row.seller_vatra_id)===ownId){const controls=make("div","ui-vatra-market-controls-001");controls.append(btn(row.status==="sold"?t("Відновити","Reactivate"):t("Позначити проданим","Mark sold"),"vt-vatra-market-sold-001",async()=>{const {data,error}=await client.from("vatra_marketplace_listings").update({status:row.status==="sold"?"active":"sold"}).eq("id",row.id).select("id").maybeSingle();if(error||!data)message(t("Не вдалося оновити оголошення.","Could not update listing."),true);else await load();}),btn(t("Видалити","Delete"),"vt-vatra-market-delete-001",async()=>{if(!await confirmRemove())return;const {data,error}=await client.from("vatra_marketplace_listings").delete().eq("id",row.id).select("id").maybeSingle();if(error||!data){message(t("Не вдалося видалити.","Could not delete."),true);return;}let cleanupError=false;if(row.image_path){try{const removed=await client.storage.from("marketplace-images").remove([row.image_path]);cleanupError=Boolean(removed.error);}catch(_){cleanupError=true;}}await load();if(cleanupError)message(t("Оголошення видалено, фото потребує очищення.","Listing deleted; photo cleanup is required."),true);}));info.append(controls);}
   if(row.status==="sold")info.append(make("span","vt-vatra-market-sold-label-001",t("Продано","Sold")));c.append(photo,info);grid.append(c);
  }
 };
 const load=async()=>{const ticket=++renderTicket;let query=client.from("vatra_marketplace_listings").select("id,seller_vatra_id,title,description,category,price,city,image_path,status,created_at");query=mine?query.eq("seller_vatra_id",ownId):query.eq("status","active");if(savedOnly){if(!saved.size){rows=[];message("");render();return;}query=query.in("id",[...saved].slice(0,100));}const {data,error}=await query.order("created_at",{ascending:false}).limit(100);if(ticket!==renderTicket)return;if(error){message(t("Не вдалося завантажити оголошення.","Could not load listings."),true);grid.replaceChildren();return;}rows=data||[];message("");render();};
 const {d,form}=dialog(t("Нове оголошення","New listing"));const name=field(form,"market-name",t("Назва","Title"),"text",100,true);name.minLength=3;
 const description=field(form,"market-description",t("Опис","Description"),"textarea",2000,true),price=field(form,"market-price",t("Ціна, грн","Price, UAH"),"number",30,true);price.min="0";price.max="999999999";price.step="0.01";const city=field(form,"market-city",t("Місто","City"),"text",100),photo=field(form,"market-photo",t("Фото · до 6 МБ","Photo · up to 6 MB"),"file");photo.accept="image/jpeg,image/png,image/webp";let picked=categories[0][0];form.append(make("span","vt-vatra-market-category-label-001",t("Категорія","Category")),tabs(categories.map(c=>[c[0],t(c[1],c[2])]),id=>{picked=id;}));
 form.append(make("p","vt-vatra-section-form-note-001",t("VATRA поки не обробляє платежі. Не переказуйте гроші незнайомим без перевірки.","VATRA does not process payments. Verify sellers before sending money.")));
 submit(form,t("Опублікувати оголошення","Publish listing"),async()=>{const f=photo.files?.[0];let path=null;try{if(f){const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[f.type];if(!ext||f.size>6291456){message(t("Оберіть JPG, PNG або WebP до 6 МБ.","Choose JPG, PNG or WebP up to 6 MB."),true);return;}path=ownId+"/"+crypto.randomUUID()+"."+ext;const {error}=await client.storage.from("marketplace-images").upload(path,f,{contentType:f.type,upsert:false});if(error){path=null;throw error;}}
 const {error}=await client.from("vatra_marketplace_listings").insert({seller_vatra_id:ownId,title:name.value.trim(),description:description.value.trim(),price:Number(price.value),category:picked,city:city.value.trim(),image_path:path});if(error)throw error;}catch(e){if(path)await client.storage.from("marketplace-images").remove([path]).catch(()=>{});throw e;}form.reset();d.close();await load();});
 action.addEventListener("click",()=>d.showModal());await load();
}
function sessionDevice(agent){
 const a=String(agent||"");
 const browser=/OPR\/|Opera/i.test(a)?"Opera":/Edg(?:A|iOS)?\//i.test(a)?"Edge":/Firefox\/|FxiOS\//i.test(a)?"Firefox":/Chrome\/|CriOS\//i.test(a)?"Chrome":/Safari\//i.test(a)?"Safari":t("Браузер або застосунок","Browser or app");
 const os=/Windows/i.test(a)?"Windows":/Android/i.test(a)?"Android":/iPhone|iPad|iPod/i.test(a)?"iOS / iPadOS":/Macintosh|Mac OS/i.test(a)?"macOS":/Linux/i.test(a)?"Linux":"";
 return browser+(os?" · "+os:"");
}
async function renderDevices(panel){
 const c=card("ui-vatra-id-devices-001"),head=make("div","ui-vatra-id-devices-head-001"),list=make("div","ui-vatra-id-device-list-001");
 head.append(make("h2","vt-vatra-id-device-heading-001",t("Пристрої та сеанси","Devices and sessions")));
 const refresh=btn(t("Оновити","Refresh"),"vt-vatra-id-device-refresh-001",()=>void load());
 head.append(refresh);c.append(head,make("p","vt-vatra-id-device-note-001",t("Входи у ваш акаунт. Один пристрій може мати кілька сеансів.","Sign-ins to your account. A device may have multiple sessions.")),list);
 const logout=btn(t("Завершити всі інші сеанси","Sign out all other sessions"),"vt-vatra-id-device-revoke-001",async()=>{
  if(logout.disabled)return;logout.disabled=true;
  try{
   if(!await confirmRemove(t("Завершити інші сеанси?","Sign out other sessions?"),t("На інших пристроях потрібно буде увійти повторно. Поточний сеанс залишиться.","Other devices will need to sign in again. Your current session stays active."),t("Завершити","Sign out")))return;
   const {error}=await client.auth.signOut({scope:"others"});if(error)throw error;
   message(t("Інші сеанси завершено. Доступ на них остаточно припиниться після спливу чинних токенів.","Other sessions revoked. Their current access tokens remain valid until expiry."));
   await load();
  }catch(_){message(t("Не вдалося завершити інші сеанси.","Could not revoke other sessions."),true);}finally{logout.disabled=false;}
 });
 c.append(logout);panel.append(c);
 async function load(){
  if(refresh.disabled)return;refresh.disabled=true;list.setAttribute("aria-busy","true");
  try{
   const {data,error}=await client.rpc("vatra_my_sessions");if(error)throw error;if(!c.isConnected)return;
   list.replaceChildren();
   const date=value=>{const d=new Date(value);return value&&Number.isFinite(d.getTime())?new Intl.DateTimeFormat(locale==="en"?"en-GB":"uk-UA",{dateStyle:"medium",timeStyle:"short"}).format(d):"—";};
   for(const [index,entry] of (data||[]).entries()){
    const row=make("div","ui-vatra-id-device-row-001"),symbol=make("span","ui-vatra-id-device-symbol-001"),ns="http://www.w3.org/2000/svg",icon=document.createElementNS(ns,"svg"),path=document.createElementNS(ns,"path");
    icon.setAttribute("class","ui-vatra-id-device-icon-001");icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("width","25");icon.setAttribute("height","25");icon.setAttribute("fill","none");icon.setAttribute("stroke","currentColor");icon.setAttribute("stroke-width","1.7");icon.setAttribute("stroke-linecap","round");icon.setAttribute("stroke-linejoin","round");icon.setAttribute("aria-hidden","true");
    path.setAttribute("class","ui-vatra-id-device-path-"+index);path.setAttribute("d",/Android|iPhone|iPad/i.test(entry.browser_agent||"")?"M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 15h2":"M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm7 14v3m-4 0h8");
    icon.append(path);symbol.append(icon);
    const details=make("div","ui-vatra-id-device-details-001");details.append(make("strong","vt-vatra-id-device-name-001",sessionDevice(entry.browser_agent)),make("span","vt-vatra-id-device-time-001",t("Вхід: ","Signed in: ")+date(entry.signed_in_at)));
    if(entry.refreshed_at)details.append(make("span","vt-vatra-id-device-activity-001",t("Оновлення сеансу: ","Session refreshed: ")+date(entry.refreshed_at)));
    row.append(symbol,details);if(entry.current_session)row.append(make("span","vt-vatra-id-device-current-001",t("Поточний","Current")));list.append(row);
   }
   if(!data?.length)list.append(empty(t("Немає доступних відомостей про сеанси.","No session details available.")));
  }catch(_){if(c.isConnected)list.replaceChildren(empty(t("Не вдалося завантажити сеанси.","Could not load sessions.")));}
  finally{refresh.disabled=false;list.setAttribute("aria-busy","false");}
 }
 await load();
}
async function account(){
 title.textContent="VATRA ID";subtitle.textContent=t("Ваші дані та безпека акаунта.","Your account information and security.");
 const layout=make("div","ui-vatra-id-layout-001"),side=card("ui-vatra-id-sidebar-001"),panel=make("div","ui-vatra-id-content-001");
 const nav=tabs([["personal",t("Мої дані","My data")],["security",t("Безпека","Security")],["verification",t("Верифікація","Verification")]],id=>{if(location.hash.slice(1)===id)void show(id);else location.hash=id;});side.append(nav,link(t("Повернутися до VATRA","Return to VATRA"),"id"+ownId,"vt-vatra-id-back-001"));layout.append(side,panel);content.append(layout);
 const show=async(id)=>{const ticket=++renderTicket;panel.replaceChildren();message("");for(const b of nav.children){b.classList.toggle("is-active",b.dataset.tab===id);b.setAttribute("aria-pressed",String(b.dataset.tab===id));}
 if(id==="security"){const c=card("ui-vatra-id-security-001");c.append(make("h2","vt-vatra-id-heading-001",t("Безпека акаунта","Account security")),make("p","vt-vatra-id-email-001",user.email||""),make("p","vt-vatra-id-email-status-001",user.email_confirmed_at?t("Електронну пошту підтверджено","Email confirmed"):t("Пошта не підтверджена","Email not confirmed")),link(t("Відновлення пароля","Password recovery"),"forgot","vt-vatra-id-password-001"));panel.append(c);await renderDevices(panel);return;}
 if(id==="verification"){const c=card("ui-vatra-id-verification-001");c.append(make("h2","vt-vatra-id-heading-001",t("Верифікація сторінки","Profile verification")));panel.append(c);
  const [v,request]=await Promise.all([client.from("verified_accounts").select("vatra_id").eq("vatra_id",ownId).maybeSingle(),client.from("vatra_verification_requests").select("status,created_at").eq("vatra_id",ownId).maybeSingle()]);if(ticket!==renderTicket)return;
  if(v.error||request.error){c.append(empty(t("Статус верифікації недоступний.","Verification status unavailable.")));return;}
  if(v.data){c.append(make("p","vt-vatra-id-verification-result-001",t("Вашу сторінку верифіковано.","Your profile is verified.")));return;}
  if(request.data){const status={pending:t("Заявка на розгляді","Application pending"),approved:t("Заявку схвалено; галочка з’явиться після підтвердження VATRA.","Application approved; awaiting VATRA confirmation."),rejected:t("Заявку відхилено","Application rejected")}[request.data.status];c.append(make("p","vt-vatra-id-verification-result-001",status));return;}
  c.append(make("p","vt-vatra-id-verification-copy-001",t("Подайте заявку на підтвердження справжності сторінки. Рішення приймає адміністрація VATRA. Не додавайте паролі, номери документів або банківські дані.","Apply to confirm the authenticity of your profile. VATRA reviews applications. Do not include passwords, ID numbers or bank details.")));
  const form=make("form","ui-vatra-id-verification-form-001"),reason=field(form,"verify-reason",t("Чому ваша сторінка потребує верифікації?","Why does your profile need verification?"),"textarea",1000,true);reason.minLength=10;c.append(form);submit(form,t("Подати заявку","Apply"),async()=>{const {error}=await client.from("vatra_verification_requests").insert({vatra_id:ownId,reason:reason.value.trim()});if(error)throw error;await show("verification");});return;}
 const c=card("ui-vatra-id-personal-001"),identity=make("div","ui-vatra-id-identity-001"),avatar=make("span","ui-vatra-id-avatar-001");window.VATRA_AVATAR?.fallback(avatar,"default");const info=make("div","ui-vatra-id-identity-info-001"),display=make("h2","vt-vatra-id-heading-001",await nameOf(ownId));if(ticket!==renderTicket)return;info.append(display,make("span","vt-vatra-id-number-001","VATRA ID "+ownId));identity.append(avatar,info);c.append(identity);
 void client.from("profile_media").select("avatar_path").eq("vatra_id",ownId).maybeSingle().then(({data,error})=>{if(!error&&data?.avatar_path&&data.avatar_path.startsWith(ownId+"/avatar/")&&avatar.isConnected){const url=client.storage.from("avatars").getPublicUrl(data.avatar_path).data?.publicUrl;if(url){avatar.style.backgroundImage="url("+JSON.stringify(url)+")";avatar.classList.add("has-photo");}}}).catch(()=>{});
 const form=make("form","ui-vatra-id-personal-form-001"),first=field(form,"first-name",t("Ім’я","First name"),"text",40,true),last=field(form,"last-name",t("Прізвище","Last name"),"text",40,true);first.value=user.user_metadata?.first_name||display.textContent.split(" ")[0]||"";last.value=user.user_metadata?.last_name||display.textContent.split(" ").slice(1).join(" ");const note=make("p","vt-vatra-section-form-note-001",t("VATRA ID залишається незмінним. Ім’я та прізвище відображатимуться у профілі.","Your VATRA ID remains unchanged. Your name is displayed on your profile."));form.append(note);c.append(form);panel.append(c);
 submit(form,t("Зберегти зміни","Save changes"),async()=>{const a=first.value.trim(),b=last.value.trim(),name=a+" "+b;if(a.length<1||b.length<1||name.length>80){message(t("Заповніть ім’я та прізвище (до 80 символів разом).","Enter first and last name (up to 80 characters in total)."),true);return;}
 const {data,error}=await client.from("public_profiles").update({display_name:name}).eq("vatra_id",ownId).select("display_name").maybeSingle();if(error||data?.display_name!==name)throw error||Error("name not saved");display.textContent=name;const auth=await client.auth.updateUser({data:{first_name:a,last_name:b,full_name:name}});if(auth.error){message(t("Ім’я у профілі змінено, але не вдалося синхронізувати акаунт. Повторіть збереження.","Profile name changed, but account sync failed. Save again."),true);return;}user=auth.data.user||user;window.VATRA_AVATAR?.setHeader({email:user.email,name:a.slice(0,28),initials:(a[0]+b[0]).toLocaleUpperCase(),id:ownId});message(t("Зміни збережено.","Changes saved."));});
 };
 const open=()=>{const id=location.hash.slice(1);return show(["personal","security","verification"].includes(id)?id:"personal");};
 window.addEventListener("hashchange",()=>void open());await open();
}
async function boot(){
 try{await window.VATRA_LANGUAGE?.ready;
 client=window.supabase?.createClient("https://rjasunoawrxvetwadylh.supabase.co","sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}});
 if(!client)throw Error("client");
 const result=await client.auth.getUser();user=result.data?.user;
 if(result.error||!user?.id||!user.email_confirmed_at){location.replace(root.href);return;}
 const accountResult=await client.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();if(accountResult.error||!valid(accountResult.data?.vatra_id))throw Error("account");ownId=String(accountResult.data.vatra_id);
 const name=String(user.user_metadata?.first_name||user.user_metadata?.full_name||"VATRA");window.VATRA_AVATAR?.setHeader({email:user.email,name:name.split(/\s+/)[0].slice(0,28),initials:name.slice(0,1),id:ownId});window.VATRA_AVATAR?.applyRemembered($("#feed-header-avatar"),user.email);
 void client.from("profile_media").select("avatar_path").eq("vatra_id",ownId).maybeSingle().then(({data,error})=>{if(!error&&data?.avatar_path)window.VATRA_AVATAR?.fromPath(client,user.email,ownId,data.avatar_path);}).catch(()=>{});
 void window.VATRA_PRESENCE?.start(client,ownId,user.user_metadata?.gender);window.VATRA_NOTIFICATIONS?.start(client,ownId);
 const id=$("#feed-header-id");if(id)id.textContent="VATRA ID "+ownId;
 for(const el of document.querySelectorAll("[data-social-uk]"))el.textContent=t(el.dataset.socialUk,el.dataset.socialEn);
 for(const a of document.querySelectorAll('a[href="profile"]'))a.href=new URL("id"+ownId,root).href;
 $("#feed-search-form")?.addEventListener("submit",e=>{e.preventDefault();const query=$("#feed-search-input")?.value.trim()||"";location.assign(new URL("feed"+(query?"?q="+encodeURIComponent(query):""),root).href);});
 $("#feed-logout")?.addEventListener("click",async()=>{const {error}=await client.auth.signOut({scope:"local"});if(error)return;window.VATRA_AVATAR?.clearHeader();location.replace(root.href);});
 $("#feed-app").hidden=false;$("#feed-loading").hidden=true;document.body.dataset.authReady="true";document.body.dataset.feedReady="true";document.body.classList.remove("vatra-shell-pending");
 try{if(page==="clips")await clips();else if(page==="marketplace")await marketplace();else await account();}finally{content.setAttribute("aria-busy","false");}
 document.title=title.textContent+" · VATRA";
 }catch(_){const loader=$("#feed-loading");if(loader&&!loader.hidden)loader.textContent=t("Не вдалося відкрити VATRA. Оновіть сторінку.","Could not open VATRA. Refresh the page.");else message(t("Не вдалося завантажити розділ.","Could not load section."),true);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else void boot();
})();
