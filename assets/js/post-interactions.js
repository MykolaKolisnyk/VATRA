(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const pickerURL=new URL("comment-picker.js?rev=c2316b22bda8f4d479858040a510c7fb1ef999a1",document.currentScript?.src||location.href).href;
 let pickerPromise=null;const loadPicker=()=>pickerPromise||(pickerPromise=import(pickerURL).catch(error=>{pickerPromise=null;throw error;}));
 const language=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
 const tr=(uk,english)=>{
  const locale=language();
  if(locale==="uk")return uk;
  if(locale==="en")return english;
  const translated=window.VATRA_LANGUAGE?.translate?.(uk);
  return typeof translated==="string"&&translated!==uk?translated:uk;
 };
 const dateLocales={uk:"uk-UA",en:"en-US",pl:"pl-PL",de:"de-DE",fr:"fr-FR",it:"it-IT",ka:"ka-GE",bg:"bg-BG"};
 const validId=value=>/^[1-9]\d{0,18}$/.test(String(value||""));
 const validUUID=value=>/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(String(value||""));
 const make=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const glyph=type=>{
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("width","20");
  svg.setAttribute("height","20");svg.setAttribute("fill","none");
  svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.85");
  svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");
  svg.setAttribute("aria-hidden","true");svg.classList.add("ui-vatra-post-action-symbol-001");
  const path=(d)=>{
   const el=document.createElementNS("http://www.w3.org/2000/svg","path");
   el.setAttribute("d",d);svg.append(el);
  };
  if(type==="thumb")path("M8 10.5 12.3 3c.6-1 2.1-.6 2.1.8v4.7h4.3a2.8 2.8 0 0 1 2.7 3.4l-1.6 6.7a2.8 2.8 0 0 1-2.7 2.1H8V10.5ZM3 10.5h5v10H3z");
  if(type==="comments")path("M20.5 11.3c0 4.8-3.9 8.6-8.6 8.6-1.4 0-2.9-.3-4.2-1L3 20l1.6-4.5a8.5 8.5 0 1 1 15.9-4.2Z");
  if(type==="bookmark")path("M6.5 3.5h11a1 1 0 0 1 1 1V21L12 16.8 5.5 21V4.5a1 1 0 0 1 1-1Z");
  if(type==="paperclip")path("m9 13 6-6a3.2 3.2 0 0 1 4.5 4.5l-8 8a5.2 5.2 0 0 1-7.4-7.4l8-8");
  if(type==="camera")path("M4 7h3l2-3h6l2 3h3v13H4V7ZM12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z");
  if(type==="smile")path("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 14c2.2 3 5.8 3 8 0M9 10h.01M15 10h.01");
  if(type==="arrow")path("M4 12h15m-6-6 6 6-6 6");
  if(type==="video")path("M4 5h13v14H4zM17 9l4-3v12l-4-3");
  if(type==="file")path("M6 3h9l4 4v14H6V3ZM15 3v5h4");
  if(type==="x")path("M5 5 19 19M19 5 5 19");
  if(type==="pin")path("m16 3 5 5-4 1-3 5v3l-2 2-7-7 2-2h3l5-3 1-4ZM8 16l-5 5");
  if(type==="edit")path("m4 16-1 5 5-1L21 7l-4-4Zm10-10 4 4");
  if(type==="copy")path("M8 8h13v13H8zM16 8V3H3v13h5");
  if(type==="archive")path("M3 5h18v4H3zM5 9v12h14V9m-9 4h4");
  if(type==="delete")path("M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7");
  if(type==="closed-comments")path("M4 4l16 16M9 4h10a2 2 0 0 1 2 2v10M4 9v7a2 2 0 0 0 2 2h3v3l4-3h3");

  if(type==="share")path("M13 5l7 7-7 7v-4.3c-5 0-8.4 1.7-10 4.3.3-7 3.4-10.8 10-10.8V5Z");
  return svg;
 };
 const action=(className,type,label)=>{
  const button=make("button",className);button.type="button";
  button.append(glyph(type),make("span","vatra-post-action-label-001",label));
  button.setAttribute("aria-label",label);button.title=label;
  return button;
 };
 const relativeRoot=()=>{
  const path=location.pathname;
  return path.startsWith("/VATRA/")?new URL("/VATRA/",location.origin):new URL("/",location.origin);
 };
 const permalink=post=>{
  if(post?.kind==="group"&&validId(post.club_id))
   return new URL("club"+post.club_id+
    (validUUID(post.id)?"?post="+encodeURIComponent(post.id):""),relativeRoot()).href;
  return new URL((post.is_clip?"clips?clip=":"feed?post=")+encodeURIComponent(post.id),relativeRoot()).href;
 };
 const dateValue=input=>{
  const date=new Date(input);
  if(Number.isNaN(date.valueOf()))return "";
  return window.VATRA_PRESENCE?.relative?.(date,language()==="en")||new Intl.DateTimeFormat(
   dateLocales[language()]||"uk-UA",
   {day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}
  ).format(date);
 };
 async function authorMap(client,rows){
  const ids=[...new Set(rows.map(x=>String(x.author_vatra_id)).filter(validId))];
  const names=new Map(),images=new Map();
  if(!ids.length)return {names,images};
  const [profile,media]=await Promise.all([
   (window.VATRA_PUBLIC_NAMES?.get(client,ids)||
    client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",ids)),
   (window.VATRA_AVATAR?.paths?.(client,ids)||
    client.from("profile_media").select("vatra_id,avatar_path").in("vatra_id",ids))
  ]);
  if(!profile.error)for(const x of profile.data||[])names.set(String(x.vatra_id),x.display_name);
  if(!media.error)for(const x of media.data||[]){
   const id=String(x.vatra_id),path=x.avatar_path;
   if(typeof path!=="string"||!path.startsWith(id+"/avatar/"))continue;
   const url=client.storage.from("avatars").getPublicUrl(path)?.data?.publicUrl;
   if(url)try{
    const validated=new URL(url);
    if(validated.protocol==="https:"&&validated.hostname==="cxrcycxrlkufozomsxcs.supabase.co")
     images.set(id,validated.href);
   }catch(_){}
  }
  return {names,images};
 }


 const COMMENT_PAGE_TTL_MS=15_000,COMMENT_PAGE_MAX=32;
 const commentPageCaches=new WeakMap();
 function commentPageState(client){
  let state=commentPageCaches.get(client);
  if(state)return state;
  state={entries:new Map(),generation:0};
  commentPageCaches.set(client,state);
  if(typeof client.auth?.onAuthStateChange==="function"){
   client.auth.onAuthStateChange(event=>{
    if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;
    state.generation++;state.entries.clear();
   });
  }
  return state;
 }
 function invalidateComments(client){
  const state=client&&commentPageCaches.get(client);
  if(state){state.generation++;state.entries.clear();}
 }
 async function commentThreadPage(client,params){
  const {p_kind,p_post_id,p_sort,p_parent,p_offset,p_limit}=params||{};
  if(!client||typeof client.rpc!=="function"||
   !["person","group"].includes(p_kind)||!validUUID(p_post_id)||
   !["relevant","newest","all"].includes(p_sort)||
   (p_parent!==null&&!validUUID(p_parent))||
   !Number.isSafeInteger(p_offset)||p_offset<0||
   !Number.isSafeInteger(p_limit)||p_limit<1||p_limit>50)
   return {data:null,error:Error("Invalid comment page request")};
  const state=commentPageState(client),generation=state.generation;
  const key=JSON.stringify([p_kind,p_post_id,p_sort,p_parent,p_offset,p_limit]);
  const previous=state.entries.get(key);
  if(previous){
   if(previous.pending){
    try{
     const rows=await previous.pending;
     if(state.generation!==generation)throw Error("Viewer changed");
     return {data:rows.map(row=>({...row})),error:null};
    }catch(error){return {data:null,error};}
   }
   if(previous.expires>Date.now()){
    state.entries.delete(key);state.entries.set(key,previous);
    return {data:previous.rows.map(row=>({...row})),error:null};
   }
   state.entries.delete(key);
  }
  const pending=(async()=>{
   const {data,error}=await client.rpc("vatra_comment_thread_page",params);
   if(error)throw error;
   if(state.generation!==generation)throw Error("Viewer changed");
   if(!Array.isArray(data))throw Error("Invalid comment page response");
   return data;
  })();
  state.entries.set(key,{pending,expires:0});
  while(state.entries.size>COMMENT_PAGE_MAX)
   state.entries.delete(state.entries.keys().next().value);
  try{
   const rows=await pending;
   if(state.generation!==generation)throw Error("Viewer changed");
   if(state.entries.get(key)?.pending===pending){
    state.entries.delete(key);
    state.entries.set(key,{rows:rows.map(row=>({...row})),expires:Date.now()+COMMENT_PAGE_TTL_MS});
   }
   return {data:rows.map(row=>({...row})),error:null};
  }catch(error){
   if(state.entries.get(key)?.pending===pending)state.entries.delete(key);
   return {data:null,error};
  }
 }


 const engagementQueryCache=new WeakMap(),engagementAuthBound=new WeakSet();
 const ENGAGEMENT_TTL_MS=3_000,ENGAGEMENT_MAX_PAGES=16;
 function invalidateEngagement(client){
  if(client)engagementQueryCache.delete(client);
 }
 function bindEngagementAuth(client){
  if(engagementAuthBound.has(client))return;
  engagementAuthBound.add(client);
  if(typeof client.auth?.onAuthStateChange==="function")
   client.auth.onAuthStateChange(event=>{
    if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;
    invalidateEngagement(client);
   });
 }
 async function prefetchEngagement(client,posts){
  const unique=new Map();
  for(const post of posts||[]){
   const kind=post?.kind==="group"?"group":"person";
   if(validUUID(post?.id))unique.set(kind+":"+post.id,{kind,id:post.id});
  }
  const requested=[...unique.values()],empty=new Map();
  if(!requested.length||typeof client?.rpc!=="function")return empty;
  bindEngagementAuth(client);
  const key=requested.map(post=>post.kind+":"+post.id).sort().join("|");
  let cache=engagementQueryCache.get(client);
  if(!cache){cache=new Map();engagementQueryCache.set(client,cache);}
  const previous=cache.get(key);
  if(previous){
   if(previous.pending){
    try{
     const result=await previous.pending;
     return engagementQueryCache.get(client)===cache?new Map(result):new Map();
    }catch(_){return new Map();}
   }
   if(previous.expires>Date.now())return new Map(previous.data);
   cache.delete(key);
  }
  const pending=(async()=>{
   const result=new Map();
   for(let i=0;i<requested.length;i+=24){
    const {data,error}=await client.rpc("post_engagement_page",{
     p_posts:requested.slice(i,i+24)
    });
    if(error)throw error;
    for(const item of data||[]){
     if(validUUID(item?.post_id)&&["group","person"].includes(item.post_kind))
      result.set(item.post_kind+":"+item.post_id,item);
    }
   }
   return result;
  })();
  cache.set(key,{pending,expires:0});
  try{
   const result=await pending;

   if(engagementQueryCache.get(client)!==cache)return new Map();
   if(engagementQueryCache.get(client)===cache){
    cache.delete(key);
    cache.set(key,{data:new Map(result),expires:Date.now()+ENGAGEMENT_TTL_MS});
    while(cache.size>ENGAGEMENT_MAX_PAGES)cache.delete(cache.keys().next().value);
   }
   return result;
  }catch(_){
   if(engagementQueryCache.get(client)===cache)cache.delete(key);

   return new Map();
  }
 }
function appendAudience(container,level,isGroup=false){
  if(!container)return;
  const visibility=isGroup?"group":["public","friends","only_me"].includes(level)?level:"public";
  const label=visibility==="friends"?tr("Для друзів","Friends only"):
   visibility==="only_me"?tr("Лише я","Only me"):
   visibility==="group"?tr("Учасники спільноти","Community members"):
   tr("Публічно","Public");
  const marker=make("span","feed-post-audience ui-feed-post-audience-001");
  marker.setAttribute("role","img");
  marker.setAttribute("aria-label",label);
  const symbol=glyph(visibility==="only_me"?"bookmark":visibility==="public"?"share":"comments");
  symbol.setAttribute("class","ui-feed-post-audience-icon-001");
  symbol.setAttribute("aria-hidden","true");
  symbol.setAttribute("focusable","false");
  symbol.replaceChildren();
  const ns="http://www.w3.org/2000/svg";
  const path=document.createElementNS(ns,"path");
  if(visibility==="only_me")path.setAttribute("d","M7 10V7a5 5 0 0 1 10 0v3M5.5 10.5h13v10h-13z");
  else if(visibility==="public")path.setAttribute("d","M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c-4 4-4 14 0 18M12 3c4 4 4 14 0 18");
  else path.setAttribute("d","M15.5 10a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM4 21v-1a8 8 0 0 1 16 0v1M5.5 9a2.5 2.5 0 0 0 0 5M18.5 9a2.5 2.5 0 0 1 0 5");
  symbol.append(path);marker.append(symbol);
  container.append(marker);
 }


 let ownerMenuListenersBound=false;
 function addOwnerMenu(header,{source="feed",onArchive=null,onDelete,client,post,ownId,onChange}={}){
  if(!header)return null;
  const details=make("details","vatra-post-owner-menu ui-vatra-post-owner-menu-001");
  details.dataset.vatraPostOwnerMenu="";
  const summary=make("summary","vatra-post-owner-toggle vatra-post-owner-toggle-001");
  summary.setAttribute("aria-label",tr("Дії з публікацією","Post options"));
  summary.title=tr("Дії з публікацією","Post options");
  const dots=document.createElementNS("http://www.w3.org/2000/svg","svg");
  dots.setAttribute("viewBox","0 0 24 24");
  dots.setAttribute("width","21");dots.setAttribute("height","21");
  dots.setAttribute("fill","currentColor");dots.setAttribute("aria-hidden","true");
  dots.classList.add("ui-vatra-post-owner-dots-001");
  for(const x of [5,12,19]){
   const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
   c.setAttribute("cx",String(x));c.setAttribute("cy","12");c.setAttribute("r","1.65");
   dots.append(c);
  }
  summary.append(dots);
  const panel=make("div","vatra-post-owner-panel ui-vatra-post-owner-panel-001");
  panel.setAttribute("role","group");
  panel.setAttribute("aria-label",tr("Керування публікацією","Manage post"));
  const option=(kind,text,handler)=>{
   const extra=kind==="archive"?(source==="profile"?"vatra-profile-post-archive-001":"vatra-feed-post-archive-001"):kind==="delete"?(source==="profile"?"vatra-profile-post-remove-001":"feed-post-delete vatra-feed-post-delete-001"):"";
   const button=make("button","vatra-post-owner-action vatra-post-owner-"+kind+"-001 "+extra);button.append(glyph(kind==="comments"?"closed-comments":kind),make("span","vatra-post-owner-action-label-001",text));
   button.type="button";
   button.addEventListener("click",()=>{
    details.open=false;
    if(button.disabled)return;
    button.disabled=true;Promise.resolve().then(handler).catch(()=>window.alert(tr("Не вдалося виконати дію. Спробуйте ще раз.","Could not complete this action. Please retry."))).finally(()=>{button.disabled=false;});
   });
   panel.append(button);
  };
  if(client&&post&&validUUID(post.id)&&post.kind!=="group"&&String(post.author_vatra_id)===String(ownId)&&typeof onDelete==="function"){
   const update=async changes=>{const {data,error}=await client.from("feed_posts").update(changes).eq("id",post.id).eq("author_vatra_id",ownId).select("id").maybeSingle();if(error||!data)throw Error("Not saved");onChange?.();};
   option("pin",post.pinned_at?tr("Відкріпити","Unpin"):tr("Закріпити","Pin"),async()=>{const {data,error}=await client.rpc("vatra_set_post_pin",{p_post_id:post.id,p_pin:!post.pinned_at});if(error||data!==true)throw Error("Not pinned");onChange?.();});
   option("edit",tr("Редагувати","Edit"),()=>{
    const dialog=make("dialog","ui-vatra-post-edit-dialog-001"),form=make("form","ui-vatra-post-edit-form-001"),heading=make("h2","vatra-post-edit-heading-001",tr("Редагувати публікацію","Edit post")),input=make("textarea","ui-vatra-post-edit-text-001"),actions=make("div","ui-vatra-post-edit-actions-001"),cancel=make("button","vatra-post-edit-cancel-001",tr("Скасувати","Cancel")),save=make("button","vatra-post-edit-save-001",tr("Зберегти","Save")),note=make("p","vatra-post-edit-note-001");
    dialog.setAttribute("aria-label",heading.textContent);input.value=post.body||"";input.maxLength=2000;input.rows=5;input.setAttribute("aria-label",tr("Текст публікації","Post text"));cancel.type="button";save.type="submit";note.setAttribute("role","status");actions.append(cancel,save);form.append(heading,input,note,actions);dialog.append(form);document.body.append(dialog);dialog.addEventListener("close",()=>dialog.remove(),{once:true});cancel.onclick=()=>dialog.close();form.onsubmit=async e=>{e.preventDefault();if(save.disabled)return;const body=input.value.trim();if(!body&&!post.media_path&&!post.media_items?.length){note.textContent=tr("Додайте текст.","Add text.");return;}save.disabled=true;cancel.disabled=true;try{await update({body});dialog.close();}catch(_){note.textContent=tr("Не вдалося зберегти.","Could not save.");}finally{save.disabled=false;cancel.disabled=false;}};dialog.showModal();
   });
   option("copy",tr("Скопіювати посилання","Copy link"),async()=>{await navigator.clipboard.writeText(permalink(post));});
   option("comments",post.comments_enabled===false?tr("Увімкнути коментарі","Enable comments"):tr("Вимкнути коментарі","Disable comments"),()=>update({comments_enabled:post.comments_enabled===false}));
  }
  if(typeof onArchive==="function")
   option("archive",tr("Архівувати","Archive"),onArchive);
  if(typeof onDelete==="function")option("delete",tr("Видалити","Delete"),onDelete);
  details.append(summary,panel);
  details.addEventListener("toggle",()=>{
   if(!details.open)return;
   document.querySelectorAll("details[data-vatra-post-owner-menu]").forEach(item=>{
    if(item!==details)item.open=false;
   });
  });
  if(!ownerMenuListenersBound){
   ownerMenuListenersBound=true;
   document.addEventListener("pointerdown",event=>{
    document.querySelectorAll("details[data-vatra-post-owner-menu][open]").forEach(item=>{
     if(!item.contains(event.target))item.open=false;
    });
   });
   document.addEventListener("keydown",event=>{
    if(event.key!=="Escape")return;
    const open=document.querySelector("details[data-vatra-post-owner-menu][open]");
    if(!open)return;
    event.preventDefault();open.open=false;open.querySelector("summary")?.focus();
   });
  }
  header.append(details);
  return details;
 }
 const mediaPanels=new WeakMap();
 function mount(client,post,container,settings={}){
  const kind=post?.kind==="group"?"group":"person";
  if(!validUUID(post?.id)||!client||!container)return;
  const ownId=String(settings.ownId||""),userId=settings.userId;
  if(validId(ownId))container.dataset.vatraViewerId=ownId;
  const snapshot=settings.engagement?.post_id===post.id&&settings.engagement?.post_kind===kind?
   settings.engagement:null;
  const shell=make("section","vatra-post-interactions ui-vatra-post-interactions-001");
  shell.setAttribute("aria-label",tr("Взаємодія з публікацією","Post interactions"));
  const row=make("div","vatra-post-action-row ui-vatra-post-action-row-001");
  const like=action("vatra-post-like-001","thumb",tr("Подобається","Like"));
  like.setAttribute("aria-pressed","false");
  const count=make("span","vatra-post-like-count-001","0");
  like.append(count);
  const commentsButton=action("vatra-post-comments-toggle-001","comments",tr("Коментарі","Comments"));
  const commentsCount=make("span","vatra-post-comments-count-001","0");
  commentsButton.append(commentsCount);
  commentsButton.setAttribute("aria-expanded","false");
  const share=action("vatra-post-share-toggle-001","share",tr("Поділитися","Share"));
  const sharesCount=make("span","vatra-post-shares-count-001","0");
  share.append(sharesCount);
  share.setAttribute("aria-expanded","false");
  const saved=action("vatra-post-save-001 vatra-post-owner-action vatra-post-owner-save-001","bookmark",tr("Зберегти","Save"));
  saved.setAttribute("aria-pressed","false");
  row.append(like,commentsButton,share);shell.append(row);
  if(validId(ownId)){
   const postHead=container.querySelector(".feed-post-header");
   let optionsMenu=postHead?.querySelector("details[data-vatra-post-owner-menu]");
   if(!optionsMenu)optionsMenu=addOwnerMenu(postHead,{client,post,ownId});
   const optionsPanel=optionsMenu?.querySelector(".vatra-post-owner-panel");
   if(optionsPanel){
    saved.querySelector("span").classList.add("vatra-post-owner-action-label-001");
    optionsPanel.prepend(saved);
    saved.addEventListener("click",()=>{optionsMenu.open=false;});
   }else row.append(saved);
   let stored=!!snapshot?.viewer_saved,saveReady=!!snapshot,savePending=null;
   const refresh=()=>{saved.setAttribute("aria-pressed",String(stored));
    const label=stored?tr("Прибрати зі збереженого","Remove from saved"):tr("Зберегти","Save");
    saved.querySelector("span").textContent=label;
    saved.setAttribute("aria-label",label);saved.title=label;};
   const hydrateSaved=()=>{
    if(saveReady)return Promise.resolve(true);
    if(savePending)return savePending;
    savePending=(async()=>{
     const {data,error}=await client.from("post_saves").select("post_id")
      .eq("owner_vatra_id",ownId).eq("post_kind",kind).eq("post_id",post.id).maybeSingle();
     if(error)throw error;
     stored=!!data;saveReady=true;refresh();return true;
    })().catch(()=>false).finally(()=>{savePending=null;});
    return savePending;
   };
   refresh();

   if(!snapshot&&typeof IntersectionObserver==="function"){
    const observer=new IntersectionObserver(entries=>{
     if(entries.some(x=>x.isIntersecting)){observer.disconnect();void hydrateSaved();}
    },{rootMargin:"160px"});
    observer.observe(shell);
   }else if(!snapshot)void hydrateSaved();
   saved.addEventListener("click",async()=>{
    if(saved.disabled)return;saved.disabled=true;
    try{
     if(!await hydrateSaved())throw Error("Save state unavailable");
     const result=stored?await client.from("post_saves").delete()
      .eq("owner_vatra_id",ownId).eq("post_kind",kind).eq("post_id",post.id)
      .select("post_id").maybeSingle():
      await client.from("post_saves").insert({owner_vatra_id:ownId,post_kind:kind,post_id:post.id});

     if(result.error||(stored&&String(result.data?.post_id)!==String(post.id)))
      throw result.error||Error("Saved post was not removed");
     stored=!stored;refresh();invalidateEngagement(client);feedback("");
    }catch(_){
     saved.title=tr("Не вдалося змінити збереження.","Could not update saved post.");
     feedback(tr("Не вдалося змінити збереження. Спробуйте ще раз.",
      "Could not update saved post. Please retry."),true);
    }
    finally{saved.disabled=false;}
   });
  }

  const status=make("p","vatra-post-interactions-status-001");
  status.setAttribute("role","status");status.hidden=true;
  const feedback=(message,bad=false)=>{
   status.hidden=!message;status.textContent=message;status.dataset.state=bad?"error":"ok";
  };
  let likeReady=!!snapshot,likePending=null,liked=!!snapshot?.viewer_liked,
   likeCount=Math.max(0,Number(snapshot?.like_count)||0);
  if(snapshot){
   count.textContent=String(likeCount);
   like.setAttribute("aria-pressed",String(liked));
   like.classList.toggle("is-liked",liked);
  }
  const likeFilter=query=>query.eq("post_kind",kind).eq("post_id",post.id);
  const hydrateLike=()=>{
   if(likeReady)return Promise.resolve();
   if(likePending)return likePending;
   likePending=(async()=>{
    const snapshotMap=await prefetchEngagement(client,[{kind,id:post.id}]);
    const current=snapshotMap.get(kind+":"+post.id);
    if(!current)throw Error("Likes unavailable");
    likeCount=Math.max(0,Number(current.like_count)||0);
    liked=!!current.viewer_liked;likeReady=true;
    count.textContent=String(Math.max(0,likeCount));
    like.setAttribute("aria-pressed",String(liked));
    like.classList.toggle("is-liked",liked);
   })().catch(()=>feedback(tr("Вподобання тимчасово недоступні.","Likes temporarily unavailable."),true))
    .finally(()=>{likePending=null;});
   return likePending;
  };
  if(!snapshot&&typeof IntersectionObserver!=="undefined"){
   const observer=new IntersectionObserver(entries=>{
    if(entries.some(x=>x.isIntersecting)){observer.disconnect();void hydrateLike();}
   },{rootMargin:"160px"});
   observer.observe(shell);
  }else if(!snapshot){void hydrateLike();}
  like.addEventListener("click",async()=>{
   if(like.disabled)return;
   like.disabled=true;feedback("");
   try{
    if(!likeReady)await hydrateLike();
    if(!likeReady)throw Error("Likes unavailable");
    const result=liked?
     await likeFilter(client.from("post_likes").delete()).eq("liker_id",userId)
      .select("liker_id").maybeSingle():
     await client.from("post_likes").insert({post_kind:kind,post_id:post.id,liker_id:userId});
    if(result.error||(liked&&String(result.data?.liker_id)!==String(userId)))
     throw result.error||Error("Post like was not removed");
    liked=!liked;likeCount+=liked?1:-1;
    like.classList.toggle("is-liked",liked);like.setAttribute("aria-pressed",String(liked));
    count.textContent=String(Math.max(0,likeCount));
    invalidateEngagement(client);

   }catch(_){feedback(tr("Не вдалося змінити вподобання.","Could not update your like."),true);}
   finally{like.disabled=false;}
  });


  const panel=make("div","vatra-post-comments-panel ui-vatra-post-comments-panel-001");
  panel.hidden=true;
  commentsButton.setAttribute("aria-expanded","false");

  const filterRow=make("div","vatra-post-comments-filter-row ui-vatra-post-comments-filter-row-001");
  const sortLabel=make("label","vatra-post-comments-filter-label-001");
  sortLabel.setAttribute("aria-label",tr("Сортування коментарів","Comment sort"));
  const sort=make("select","ui-vatra-post-comments-sort-001");
  sort.name="vatra_post_comments_sort";
  sort.setAttribute("aria-label",tr("Сортування коментарів","Comment sort"));
  for(const [id,uk,en] of [
   ["relevant","Найактуальніші","Most relevant"],
   ["newest","Найновіші","Newest"],
   ["all","Усі коментарі","All comments"]
  ]){
   const option=make("option","ui-vatra-post-comment-option-"+id,tr(uk,en));
   option.value=id;sort.append(option);
  }
  sortLabel.append(sort);filterRow.append(sortLabel);
  const note=make("small","vatra-post-comments-sort-note-001");
  const updateNote=()=>{
   note.textContent=sort.value==="relevant"?
    tr("Спочатку друзі та найпопулярніші коментарі.","Friends and most-liked comments appear first."):
    sort.value==="newest"?
    tr("Від найновіших, без позначеного спаму.","Newest first, excluding marked spam."):
    tr("Усі доступні коментарі, зокрема можливий спам.",
       "All accessible comments, including possible spam.");
  };
  updateNote();panel.append(filterRow,note);
  const entries=make("div","vatra-post-comment-list ui-vatra-post-comment-list-001 vatra-media-comments-unified-001");
  entries.setAttribute("role","feed");entries.setAttribute("aria-busy","false");
  const more=make("button","vatra-post-comments-more-001",
   tr("Завантажити ще коментарі","Load more comments"));
  more.type="button";more.hidden=true;
  const form=make("form","vatra-post-comment-form ui-vatra-post-comment-form-001 vatra-media-form-unified-001");
  const input=make("textarea","ui-vatra-post-comment-input-001");
  input.name="vatra_post_comment";input.maxLength=1000;input.rows=1;
  input.placeholder=tr("Коментувати…","Write a comment…");
  input.setAttribute("aria-label",tr("Ваш коментар","Your comment"));
  const ownPortrait=make("span","vatra-post-comment-composer-avatar ui-vatra-post-comment-composer-avatar-001");
  ownPortrait.setAttribute("aria-hidden","true");
  window.VATRA_AVATAR?.fallback(ownPortrait);
  const headerPortrait=document.querySelector("#feed-header-avatar");
  if(headerPortrait?.classList.contains("has-photo")){
   ownPortrait.style.backgroundImage=headerPortrait.style.backgroundImage;
   ownPortrait.classList.add("has-photo");
  }
  const composer=make("div","vatra-post-comment-composer ui-vatra-post-comment-composer-001 vatra-media-composer-content-unified-001");
  const replying=make("div","vatra-post-comment-replying ui-vatra-post-comment-replying-001");
  replying.hidden=true;
  const replyingText=make("span","vatra-post-comment-replying-text-001");
  const cancelReply=make("button","vatra-post-comment-cancel-reply-001");
  cancelReply.type="button";cancelReply.setAttribute("aria-label",tr("Скасувати відповідь","Cancel reply"));
  cancelReply.append(glyph("x"));replying.append(replyingText,cancelReply);
  const composerInput=make("div","vatra-post-comment-input-wrap ui-vatra-post-comment-input-wrap-001");
  const controls=make("div","vatra-post-comment-toolbar ui-vatra-post-comment-toolbar-001");
  const tool=(type,cls,label)=>{
   const button=make("button",cls);button.type="button";button.append(glyph(type));
   button.setAttribute("aria-label",label);button.title=label;return button;
  };
  const attach=tool("paperclip","vatra-post-comment-attach-001",tr("Додати вкладення","Attach media"));
  const emoji=tool("smile","vatra-post-comment-emoji-001",tr("Емодзі та стікери","Emoji and stickers"));
  const send=tool("arrow","vatra-post-comment-send-001",tr("Опублікувати коментар","Post comment"));
  send.type="submit";
  controls.append(attach,emoji,send);
  composerInput.append(input,controls);
  const popovers=make("div","vatra-post-comment-popovers ui-vatra-post-comment-popovers-001");
  const attachmentMenu=make("div","vatra-post-comment-attach-menu ui-vatra-post-comment-attach-menu-001");
  attachmentMenu.hidden=true;attachmentMenu.setAttribute("role","menu");
  const fileInput=make("input","ui-vatra-post-comment-file-001");
  fileInput.type="file";fileInput.accept="image/jpeg,image/png,image/webp,video/mp4,video/webm";
  fileInput.hidden=true;fileInput.setAttribute("aria-label",tr("Додати файл до коментаря","Choose comment media"));
  const menuOption=(type,uk,en,accept)=>{
   const item=make("button","vatra-post-comment-menu-"+type,tr(uk,en));
   item.type="button";item.setAttribute("role","menuitem");
   item.prepend(glyph(type==="photo"?"camera":type==="video"?"video":"paperclip"));
   item.addEventListener("click",()=>{
    fileInput.accept=accept;hideMenus();
    fileInput.click();
   });return item;
  };
  attachmentMenu.append(
   menuOption("device","З пристрою","From device","image/jpeg,image/png,image/webp,video/mp4,video/webm"),
   menuOption("photo","Фотографія","Photo","image/jpeg,image/png,image/webp"),
   menuOption("video","Відео","Video","video/mp4,video/webm")
  );
  const emojiPanel=make("div","vatra-post-comment-emoji-panel ui-vatra-post-comment-emoji-panel-001");
  emojiPanel.hidden=true;
  const emojiTabs=make("div","vatra-post-comment-emoji-tabs ui-vatra-post-comment-emoji-tabs-001");
  const emojisTab=make("button","vatra-post-comment-emoji-tab-001",tr("Емодзі","Emoji"));
  const stickerTab=make("button","vatra-post-comment-sticker-tab-001",tr("Стікери","Stickers"));
  emojisTab.type="button";stickerTab.type="button";
  emojiTabs.append(emojisTab,stickerTab);
  const emojiContent=make("div","vatra-post-comment-emoji-scroll ui-vatra-post-comment-emoji-scroll-001");
  emojiPanel.append(emojiContent,emojiTabs);
  popovers.append(attachmentMenu,emojiPanel);
  const attachmentPreview=make("div","vatra-post-comment-file-preview ui-vatra-post-comment-file-preview-001");
  attachmentPreview.hidden=true;
  const fileLabel=make("span","vatra-post-comment-file-name-001");
  const removeFile=tool("x","vatra-post-comment-file-remove-001",tr("Прибрати вкладення","Remove attachment"));
  attachmentPreview.append(fileLabel,removeFile);
  composer.append(replying,composerInput,popovers,fileInput,attachmentPreview);
  form.append(ownPortrait,composer);

  panel.append(entries,more,form);shell.append(panel,status);
  const commentsLocked=kind==="person"&&post.comments_enabled===false;
  if(commentsLocked){form.hidden=true;panel.append(make("p","vatra-post-comments-locked-001",tr("Коментування цієї публікації вимкнено.","Comments on this post are disabled.")));}
  const pageSize=window.matchMedia?.("(max-width: 640px)")?.matches?4:6;
  const replySize=3;
  let commentOffset=0,busy=false,ticket=0,pendingReset=false,pendingKeep=false,replyTarget=null,chosenFile=null,emojiMode="emoji",pickerVersion=0,activePack="vatryk",cropVersion=0,cropping=false,submitting=false;
  const rootReplies=new Map();
  const stopReply=()=>{
   replyTarget=null;replying.hidden=true;replyingText.textContent="";
  };
  cancelReply.addEventListener("click",()=>{stopReply();input.focus();});
  const updateSend=()=>{send.disabled=submitting||cropping||(!input.value.trim()&&!chosenFile);};
  let activeMenu=null,menuCloseTimer=0;
  const clearMenuClose=()=>{
   if(menuCloseTimer){clearTimeout(menuCloseTimer);menuCloseTimer=0;}
  };
  const hideMenus=()=>{
   clearMenuClose();activeMenu=null;
   attachmentMenu.hidden=true;emojiPanel.hidden=true;
   attach.setAttribute("aria-expanded","false");
   emoji.setAttribute("aria-expanded","false");
  };
  const positionPopover=element=>{
   const anchor=(element===attachmentMenu?attach:emoji).getBoundingClientRect();
   const bounds=form.closest("dialog")?.getBoundingClientRect();
   const view=window.visualViewport;
   const vx=view?.offsetLeft||0,vy=view?.offsetTop||0;
   const vw=view?.width||innerWidth,vh=view?.height||innerHeight;
   const left=Math.max(vx+8,(bounds?.left??vx)+8);
   const right=Math.min(vx+vw-8,(bounds?.right??vx+vw)-8);
   const top=vy+8,bottom=vy+vh-8,gap=6;
   if(anchor.bottom<=top||anchor.top>=bottom||(bounds&&(anchor.bottom<=bounds.top||anchor.top>=bounds.bottom))){hideMenus();return;}
   const desiredWidth=element===attachmentMenu?218:440;
   const width=Math.max(0,Math.min(desiredWidth,right-left));
   const desiredHeight=element===attachmentMenu?160:450;
   const above=Math.max(0,anchor.top-top-gap),below=Math.max(0,bottom-anchor.bottom-gap);
   const upward=above>=desiredHeight||above>=below;
   const available=Math.max(0,upward?above:below);
   if(width<100||available<44){hideMenus();return;}
   element.style.setProperty("--vatra-pop-width",width+"px");
   element.style.setProperty("--vatra-pop-height",Math.min(desiredHeight,available)+"px");
   const x=Math.max(left,Math.min(anchor.right-width,right-width));
   const height=element.getBoundingClientRect().height;
   const y=upward?Math.max(top,anchor.top-gap-height):anchor.bottom+gap;
   element.style.setProperty("--vatra-pop-left",Math.round(x)+"px");
   element.style.setProperty("--vatra-pop-top",Math.round(y)+"px");
  };
  const openMenu=(element,trigger)=>{
   hideMenus();
   activeMenu=element;element.hidden=false;trigger.setAttribute("aria-expanded","true");
   if(element===emojiPanel&&!emojiContent.children.length)void renderEmoji();
   positionPopover(element);
  };
  const hoverPointer=event=>event.pointerType==="mouse"||(event.pointerType==="pen"&&window.matchMedia("(any-hover:hover)").matches);
  const bindMenu=(element,trigger)=>{
   let pointerType="";
   trigger.setAttribute("aria-expanded","false");
   const scheduleClose=event=>{
    if(!hoverPointer(event)||activeMenu!==element)return;
    clearMenuClose();
    menuCloseTimer=setTimeout(()=>{
     menuCloseTimer=0;
     if(activeMenu===element&&!trigger.matches(":hover")&&!element.matches(":hover"))hideMenus();
    },180);
   };
   trigger.addEventListener("pointerenter",event=>{
    if(!hoverPointer(event))return;
    if(activeMenu!==element)openMenu(element,trigger);
    else clearMenuClose();
   });
   trigger.addEventListener("pointerleave",scheduleClose);
   element.addEventListener("pointerenter",event=>{if(hoverPointer(event)&&activeMenu===element)clearMenuClose();});
   element.addEventListener("pointerleave",scheduleClose);
   trigger.addEventListener("pointerdown",event=>{pointerType=event.pointerType;});
   trigger.addEventListener("click",event=>{
    const mouseClick=event.detail!==0&&(pointerType==="mouse"||(pointerType==="pen"&&window.matchMedia("(any-hover:hover)").matches));
    pointerType="";
    if(mouseClick){if(activeMenu!==element)openMenu(element,trigger);return;}
    if(activeMenu===element)hideMenus();else openMenu(element,trigger);
   });
  };
  bindMenu(attachmentMenu,attach);
  bindMenu(emojiPanel,emoji);
  const addEmoji=value=>{
   const start=input.selectionStart,end=input.selectionEnd;
   if(input.value.length-(end-start)+value.length>input.maxLength)return;
   input.setRangeText(value,start,end,"end");input.dispatchEvent(new Event("input",{bubbles:true}));
   input.focus();
  };
  async function chooseSticker(catalog,pack,index){
   if(submitting||cropping)return;
   const version=++cropVersion;cropping=true;updateSend();
   try{
    const file=await catalog.stickerFile(pack.id,index);if(version!==cropVersion||!form.isConnected)return;
    cropping=false;hideMenus();feedback("");
    await publishComment({file,kind:"image",ext:"webp",sticker:true});
   }catch(_){if(version===cropVersion)feedback(tr("Не вдалося підготувати стікер. Спробуйте ще раз.","Could not prepare sticker. Please retry."),true);}
   finally{if(version===cropVersion){cropping=false;updateSend();}}
  }
  async function renderEmoji(){
   const version=++pickerVersion;emojiContent.replaceChildren(make("p","vatra-picker-loading-001",tr("Завантаження…","Loading…")));
   emojisTab.setAttribute("aria-selected",String(emojiMode==="emoji"));stickerTab.setAttribute("aria-selected",String(emojiMode==="sticker"));
   try{
    const catalog=await loadPicker();if(version!==pickerVersion||!form.isConnected)return;
    emojiContent.replaceChildren();emojiContent.scrollTop=0;
    if(emojiMode==="sticker"){
     const pack=catalog.packs.find(x=>x.id===activePack)||catalog.packs[0];
     const packNav=make("div","ui-vatra-sticker-packs-001");
     for(const item of catalog.packs){const button=make("button","vatra-sticker-pack-001",tr(item.uk,item.en));button.type="button";button.setAttribute("aria-pressed",String(item.id===pack.id));button.addEventListener("click",()=>{activePack=item.id;void renderEmoji();});packNav.append(button);}
     emojiContent.append(packNav,make("h4","vatra-post-comment-emoji-heading-001",tr(pack.uk,pack.en)));
     const grid=make("div","ui-vatra-sticker-grid-001");
     pack.rects.forEach((r,index)=>{const button=make("button","vatra-sticker-option-001");button.type="button";button.setAttribute("aria-label",tr(pack.uk,pack.en)+" · "+(index+1));button.append(catalog.stickerArt(pack,index));button.addEventListener("click",()=>void chooseSticker(catalog,pack,index));grid.append(button);});emojiContent.append(grid);
    }else{
     const fragment=document.createDocumentFragment();
     for(const group of catalog.emojiGroups){fragment.append(make("h4","vatra-post-comment-emoji-heading-001",tr(group.uk,group.en)));
      const grid=make("div","vatra-post-comment-emoji-grid ui-vatra-post-comment-emoji-grid-001");
      for(const value of group.values){const button=make("button","vatra-post-comment-emoji-option-001",value);button.type="button";button.setAttribute("aria-label",value);button.addEventListener("click",()=>addEmoji(value));grid.append(button);}fragment.append(grid);
     }emojiContent.append(fragment);
    }
    if(activeMenu===emojiPanel)positionPopover(emojiPanel);
   }catch(_){if(version===pickerVersion){const retry=make("button","vatra-picker-retry-001",tr("Повторити","Retry"));retry.type="button";retry.addEventListener("click",()=>void renderEmoji());emojiContent.replaceChildren(retry);}}
  }
  emojisTab.addEventListener("click",()=>{emojiMode="emoji";void renderEmoji();});
  stickerTab.addEventListener("click",()=>{emojiMode="sticker";void renderEmoji();});
  document.addEventListener("pointerdown",event=>{
   if(!form.isConnected)return;
   if(!attach.contains(event.target)&&!emoji.contains(event.target)&&!popovers.contains(event.target))hideMenus();
  });
  form.addEventListener("keydown",event=>{
   if(event.key==="Escape"){hideMenus();if(replyTarget)stopReply();}
   if(event.key==="Enter"&&!event.shiftKey&&event.target===input&&!event.isComposing){
    event.preventDefault();if(!send.disabled)form.requestSubmit(send);
   }
  });
  fileInput.addEventListener("change",()=>{
   ++cropVersion;cropping=false;
   const file=fileInput.files?.[0];
   if(!file)return;
   const allowed={
    "image/jpeg":["image","jpg",31457280],"image/png":["image","png",31457280],
    "image/webp":["image","webp",31457280],
    "video/mp4":["video","mp4",52428800],"video/webm":["video","webm",52428800]
   };
   const type=allowed[file.type];
   if(!type||file.size>type[2]||file.size<1){
    feedback(tr("Фото: до 30 МБ. Відео: до 50 МБ. Доступні JPEG, PNG, WebP, MP4, WebM.",
     "Photo: up to 30 MB. Video: up to 50 MB. JPEG, PNG, WebP, MP4 or WebM."),true);
    fileInput.value="";chosenFile=null;attachmentPreview.hidden=true;updateSend();return;
   }
   chosenFile={file,kind:type[0],ext:type[1]};
   fileLabel.textContent=file.name.slice(0,110);
   attachmentPreview.hidden=false;feedback("");updateSend();
  });
  removeFile.addEventListener("click",()=>{
   ++cropVersion;cropping=false;chosenFile=null;fileInput.value="";attachmentPreview.hidden=true;updateSend();
  });
  input.addEventListener("input",updateSend);updateSend();
  const startReply=(rootId,name)=>{
   replyTarget={id:rootId,name};
   replyingText.textContent=tr("Відповідь для ","Replying to ")+name;
   replying.hidden=false;hideMenus();
   input.focus();input.scrollIntoView({block:"nearest",behavior:"smooth"});
  };
  const commentPermalink=item=>{
   const url=new URL(permalink(post));
   url.searchParams.set("comment",item.id);return url.href;
  };
  const displayMedia=(item,content)=>{
   if(!item.media_kind||!item.media_path)return;
   const id=String(item.author_vatra_id),kind=item.media_kind,path=item.media_path;
   if(!validId(id)||!["image","video"].includes(kind)||
    !path.startsWith(id+"/comments/"))return;
   const box=make("div","vatra-post-comment-media ui-vatra-post-comment-media-001");
   if(kind==="image"&&/\/comments\/sticker-[0-9a-f-]+\.webp$/i.test(path))box.classList.add("is-vatra-sticker");
   const media=make(kind==="image"?"img":"video",
    "ui-vatra-post-comment-media-"+kind+"-001");
   if(kind==="image"){
    media.alt=box.classList.contains("is-vatra-sticker")?tr("Стікер","Sticker"):tr("Фото в коментарі","Comment photo");media.loading="lazy";
   }else{media.controls=true;media.preload="metadata";media.playsInline=true;}
   box.append(media);content.append(box);
   const bucket=kind==="image"?"post-images":"videos";
   void (async()=>{
    try{

     const getSigned=window.VATRA_POST_MEDIA?.signed;
     let signedUrl;
     if(typeof getSigned==="function"){
      signedUrl=await getSigned(client,kind,path,300);
     }else{
      const {data,error}=await client.storage.from(bucket).createSignedUrl(path,300);
      if(error)throw error;
      signedUrl=data?.signedUrl;
     }
     if(!signedUrl||!box.isConnected)return;
     const url=new URL(signedUrl,location.origin);
     if(url.protocol!=="https:"||url.hostname!=="cxrcycxrlkufozomsxcs.supabase.co")return;
     media.src=url.href;
    }catch(_){}
   })();
  };
  function renderComment(item,people,ownLikes,rootId,isReply=false,initialReplyCount=0){
   const id=String(item.author_vatra_id);
   const name=people.names.get(id)||tr("Користувач VATRA","VATRA member");
   const card=make("article","vatra-post-comment ui-vatra-post-comment-001");
   card.id="vatra-comment-"+item.id;card.dataset.commentId=item.id;
   if(isReply)card.classList.add("is-reply");
   const avatar=make("a","vatra-comment-avatar ui-vatra-comment-avatar-001");
   avatar.href=new URL("id"+id,relativeRoot()).href;
   avatar.setAttribute("aria-label",name);window.VATRA_AVATAR?.fallback(avatar);
   const photo=people.images.get(id);
   if(photo){avatar.style.backgroundImage="url("+JSON.stringify(photo)+")";
    avatar.classList.add("has-photo");window.VATRA_AVATAR?.clearFallback(avatar);}
   const content=make("div","vatra-post-comment-content ui-vatra-post-comment-content-001");
   const author=make("a","vatra-post-comment-author-001",name);
   author.href=avatar.href;
   if(people.names.has(id))void window.VATRA_VERIFIED?.attach(client,author,id);
   const body=make("p","vatra-post-comment-body-001",item.body||"");
   if(item.body){
    const emojiOnly=Array.from(item.body.trim()).length<=8 &&
     /^[\p{Extended_Pictographic}\uFE0F\u200D\p{Emoji_Modifier}\s]+$/u.test(item.body.trim());
    if(emojiOnly)body.classList.add("is-sticker");
   }
   const authorRow=make("div","ui-vatra-comment-author-row-001");authorRow.append(author);
   if(String(item.author_vatra_id)===String(ownId)&&userId){
    const remove=make("button","vatra-post-comment-delete-001");remove.type="button";remove.setAttribute("aria-label",tr("Видалити","Delete"));remove.title=tr("Видалити","Delete");remove.append(glyph("x"));
    remove.addEventListener("click",async()=>{if(remove.disabled)return;remove.disabled=true;try{
     const result=await client.from("post_comments").delete().eq("id",item.id).eq("author_id",userId).select("id").maybeSingle();
     if(result.error||String(result.data?.id)!==String(item.id))throw result.error||Error("Comment not removed");
     card.remove();invalidateComments(client);invalidateEngagement(client);
     if(item.media_path&&String(item.media_path).startsWith(String(ownId)+"/comments/")&&["image","video"].includes(item.media_kind)){try{await client.storage.from(item.media_kind==="image"?"post-images":"videos").remove([item.media_path]);}catch(_){}}
     if(replyTarget?.id===item.id)stopReply();
     void loadComments(true,true);void refreshSocial();
     feedback(tr("Коментар видалено.","Comment deleted."));
    }catch(_){feedback(tr("Не вдалося видалити коментар.","Could not delete comment."),true);}finally{remove.disabled=false;}});authorRow.append(remove);
   }
   content.append(authorRow);
   if(item.body)content.append(body);
   displayMedia(item,content);
   if(item.moderation_status==="possible_spam")content.append(
    make("small","vatra-post-comment-spam-001",tr("Можливий спам","Potential spam")));
   const actions=make("div","vatra-post-comment-actions ui-vatra-post-comment-actions-001");
   const stamp=make("time","vatra-post-comment-date-001",dateValue(item.created_at));
   stamp.dateTime=item.created_at;
   const answer=make("button","vatra-post-comment-reply-001",tr("Відповісти","Reply"));
   answer.type="button";answer.addEventListener("click",()=>startReply(rootId,name));
   const link=make("button","vatra-post-comment-share-001",tr("Поділитися","Share"));
   link.type="button";link.addEventListener("click",async()=>{
    try{await navigator.clipboard.writeText(commentPermalink(item));
     feedback(tr("Посилання на коментар скопійовано.","Comment link copied."));}
    catch(_){feedback(tr("Не вдалося скопіювати посилання.","Could not copy link."),true);}
   });
   const likeComment=make("button","vatra-post-comment-like-001");
   likeComment.type="button";likeComment.append(glyph("heart"));
   const heartCount=make("span","vatra-post-comment-like-count-001");
   likeComment.append(heartCount);
   let likeCount=Number(item.likes)||0,ownLiked=ownLikes.has(item.id);
   const renderLike=()=>{
    heartCount.textContent=likeCount?String(likeCount):"";
    likeComment.setAttribute("aria-pressed",String(ownLiked));
    likeComment.setAttribute("aria-label",ownLiked?tr("Прибрати вподобання","Unlike"):
     tr("Подобається","Like"));
   };
   renderLike();likeComment.addEventListener("click",async()=>{
    if(likeComment.disabled)return;likeComment.disabled=true;
    try{
     const result=ownLiked?
      await client.from("post_comment_likes").delete()
       .eq("comment_id",item.id).eq("liker_id",userId)
       .select("comment_id").maybeSingle():
      await client.from("post_comment_likes").insert({comment_id:item.id,liker_id:userId});
     if(result.error||(ownLiked&&String(result.data?.comment_id)!==String(item.id)))
      throw result.error||Error("Comment like was not removed");
     ownLiked=!ownLiked;likeCount+=ownLiked?1:-1;renderLike();
     invalidateComments(client);
    }catch(_){feedback(tr("Не вдалося змінити вподобання.","Could not update like."),true);}
    finally{likeComment.disabled=false;}
   });
   actions.append(stamp,answer,link,likeComment);content.append(actions);
   card.append(avatar,content);
   if(!isReply){
    const replyArea=make("div","vatra-comment-replies ui-vatra-comment-replies-001");
    const expand=make("button","vatra-comment-expand-replies-001");
    expand.type="button";expand.hidden=true;
    const repliesList=make("div","vatra-comment-reply-list ui-vatra-comment-reply-list-001");
    repliesList.hidden=true;
    const moreReplies=make("button","vatra-comment-more-replies-001",
     tr("Показати ще відповіді","Show more replies"));
    moreReplies.type="button";moreReplies.hidden=true;
    replyArea.append(expand,repliesList,moreReplies);content.append(replyArea);
    let replyOffset=0,replyCount=Math.max(0,Number(initialReplyCount)||0),open=false,working=false;
    const label=()=>expand.textContent=open?tr("Згорнути відповіді","Hide replies"):
     (replyCount===1?tr("1 відповідь","1 reply"):
      String(replyCount)+" "+tr("відповідей","replies"));
    const loadReplies=async(reset=false)=>{
     if(working)return;working=true;moreReplies.disabled=true;
     if(reset){replyOffset=0;repliesList.replaceChildren();}
     try{
      const {data,error}=await commentThreadPage(client,{
       p_kind:kind,p_post_id:post.id,p_sort:sort.value,
       p_parent:item.id,p_offset:replyOffset,p_limit:replySize+1
      });
      if(error)throw error;
      const rows=(data||[]).slice(0,replySize);
      const people=await authorMap(client,rows);
      const ids=rows.map(x=>x.id);
      let mine=new Set();
      if(ids.length){
       const result=await client.from("post_comment_likes")
        .select("comment_id").in("comment_id",ids).eq("liker_id",userId);
       if(!result.error)mine=new Set((result.data||[]).map(x=>x.comment_id));
      }
      for(const reply of rows)repliesList.append(renderComment(reply,people,mine,item.id,true));
      replyOffset+=rows.length;moreReplies.hidden=(data||[]).length<=replySize;
      repliesList.hidden=false;
     }catch(_){feedback(tr("Не вдалося завантажити відповіді.","Could not load replies."),true);}
     finally{working=false;moreReplies.disabled=false;}
    };
    const setOpen=async(value,reload=false)=>{
     open=value;label();repliesList.hidden=!open;
     if(open&&(reload||replyOffset===0))await loadReplies(true);
     else if(!open)moreReplies.hidden=true;
     else moreReplies.hidden=replyOffset>=replyCount;
    };
    expand.addEventListener("click",()=>void setOpen(!open));
    moreReplies.addEventListener("click",()=>void loadReplies());
    rootReplies.set(item.id,{expand:async reload=>{
     replyCount=Math.max(replyCount+1,1);expand.hidden=false;await setOpen(true,reload);
    }});

    expand.hidden=replyCount===0;label();
   }
   return card;
  }
  function emptyPhotoComments(){
   const empty=make("p","vatra-post-comments-empty-001 vatra-media-empty-unified-001");
   const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");
   icon.setAttribute("class","vatra-post-media-empty-icon-001 vatra-media-empty-icon-unified-001");
   icon.setAttribute("viewBox","0 0 48 48");
   icon.setAttribute("fill","none");icon.setAttribute("stroke","currentColor");
   icon.setAttribute("stroke-width","2.6");
   icon.setAttribute("stroke-linecap","round");
   icon.setAttribute("stroke-linejoin","round");
   icon.setAttribute("aria-hidden","true");
   const path=document.createElementNS("http://www.w3.org/2000/svg","path");
   path.setAttribute("class","vatra-post-media-empty-path-001");
   path.setAttribute("d","M16 7h22a5 5 0 0 1 5 5v17a5 5 0 0 1-5 5h-4v8l-10-8h-8a5 5 0 0 1-5-5V12a5 5 0 0 1 5-5ZM6 15a5 5 0 0 0-4 5v14a5 5 0 0 0 5 5h5v5l6-5");
   icon.append(path);
   const basic=make("span","vatra-post-media-empty-basic-001",tr("Коментарів поки немає.","No comments yet."));
   const expanded=make("span","vatra-post-media-empty-expanded-001",tr("Коментарів поки немає. Будьте першими!","No comments yet. Be the first!"));
   empty.append(icon,basic,expanded);
   return empty;
  }
  async function loadComments(reset=false,keepVisible=false){
   if(busy){

    if(reset){pendingReset=true;pendingKeep=keepVisible;ticket++;}
    return;
   }
   busy=true;more.disabled=true;entries.setAttribute("aria-busy","true");
   const token=++ticket;
   const previousRows=reset&&keepVisible?
    new Map([...entries.children].filter(el=>el.dataset?.commentId)
     .map(el=>[el.dataset.commentId,el])):new Map();
   if(reset){
    commentOffset=0;
    if(!keepVisible){entries.replaceChildren();rootReplies.clear();}
    more.hidden=true;
   }
   try{
    const {data,error}=await commentThreadPage(client,{
     p_kind:kind,p_post_id:post.id,p_sort:sort.value,
     p_parent:null,p_offset:commentOffset,p_limit:pageSize+1
    });
    if(error)throw error;
    if(token!==ticket)return;
    const rows=(data||[]).slice(0,pageSize),ids=rows.map(x=>x.id);


    const [people,replyResult]=await Promise.all([
     authorMap(client,rows),
     ids.length?client.rpc("comment_reply_counts",{
      p_kind:kind,p_post_id:post.id,p_parents:ids
     }):Promise.resolve({data:[],error:null})
    ]);
    const replyCounts=new Map(
     (replyResult?.error?[]:replyResult?.data||[])
      .map(item=>[item.parent_id,Math.max(0,Number(item.reply_count)||0)])
    );
    let mine=new Set();
    if(ids.length){
     const result=await client.from("post_comment_likes")
      .select("comment_id").in("comment_id",ids).eq("liker_id",userId);
     if(!result.error)mine=new Set((result.data||[]).map(x=>x.comment_id));
    }
    if(token!==ticket)return;
    if(token!==ticket)return;
    const fresh=[];
    const seen=new Set();
    for(const item of rows){
     const key=String(item.id);seen.add(key);
     fresh.push(previousRows.get(key)||
      renderComment(item,people,mine,item.id,false,replyCounts.get(item.id)||0));
    }
    if(reset&&keepVisible){


     const remaining=rows.length?[...previousRows].filter(([id])=>!seen.has(id))
      .map(([,node])=>node):[];
     entries.replaceChildren(...fresh,...remaining);
     if(!rows.length){
      rootReplies.clear();
      entries.append(emptyPhotoComments());
     }
    }else{
     if(reset&&!rows.length)entries.append(emptyPhotoComments());
     for(const node of fresh){
      if(!entries.querySelector("#"+CSS.escape(node.id)))entries.append(node);
     }
    }
    commentOffset+=rows.length;more.hidden=(data||[]).length<=pageSize;
    const deepComment=new URLSearchParams(location.search).get("comment");
    if(validUUID(deepComment)){
     const target=document.getElementById("vatra-comment-"+deepComment);
     if(target)target.scrollIntoView({block:"center"});
    }
    feedback("");
   }catch(_){
    if(token===ticket)feedback(tr("Не вдалося завантажити коментарі.","Could not load comments."),true);
   }finally{
    busy=false;more.disabled=false;entries.setAttribute("aria-busy","false");
    if(pendingReset){
     const keep=pendingKeep;
     pendingReset=false;pendingKeep=false;
     void loadComments(true,keep);
    }
   }
  }


  let commentDialog=null;
  const openComments=()=>{
   if(settings.inlineComments){panel.hidden=!panel.hidden;commentsButton.setAttribute("aria-expanded",String(!panel.hidden));if(panel.hidden)hideMenus();else void loadComments(true,entries.children.length>0);return;}
   if(commentDialog?.open)return;
   const card=container.closest(".feed-post-card")||container;
   if(!card.parentNode)return;
   const marker=make("span","ui-vatra-comment-origin-001");marker.hidden=true;
   card.parentNode.insertBefore(marker,card);
   const dialog=make("dialog","vatra-post-comment-dialog ui-vatra-post-comment-dialog-001");
   dialog.setAttribute("aria-label",tr("Публікація та коментарі","Post and comments"));
   const close=make("button","vatra-post-comment-dialog-close-001");
   close.type="button";close.setAttribute("aria-label",tr("Закрити коментарі","Close comments"));
   close.append(glyph("x"));
   const content=make("div","vatra-post-comment-dialog-content ui-vatra-post-comment-dialog-content-001");
   content.append(card);dialog.append(close,content,popovers);document.body.append(dialog);
   const reposition=()=>{
    if(activeMenu)positionPopover(activeMenu);
   };
   const viewport=window.visualViewport;
   content.addEventListener("scroll",reposition,{passive:true});
   window.addEventListener("resize",reposition);
   viewport?.addEventListener("resize",reposition);
   viewport?.addEventListener("scroll",reposition);
   commentDialog=dialog;panel.hidden=false;
   commentsButton.setAttribute("aria-expanded","true");
   const previousFocus=document.activeElement;
   let restored=false;
   const restore=()=>{
    if(restored)return;restored=true;
    hideMenus();
    content.removeEventListener("scroll",reposition);
    window.removeEventListener("resize",reposition);
    viewport?.removeEventListener("resize",reposition);
    viewport?.removeEventListener("scroll",reposition);
    composer.insertBefore(popovers,fileInput);
    panel.hidden=true;commentsButton.setAttribute("aria-expanded","false");
    if(marker.parentNode)marker.parentNode.replaceChild(card,marker);
    else if(card.isConnected)card.remove();
    dialog.remove();commentDialog=null;
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
   };
   const dismiss=()=>{if(dialog.open)dialog.close();restore();};
   dialog.addEventListener("close",restore,{once:true});
   dialog.addEventListener("cancel",event=>{
    if(!attachmentMenu.hidden||!emojiPanel.hidden){event.preventDefault();hideMenus();}
   });
   close.addEventListener("click",dismiss);
   dialog.addEventListener("click",event=>{if(event.target===dialog)dismiss();});
   dialog.showModal();content.scrollTop=0;close.focus({preventScroll:true});
   void loadComments(true,entries.children.length>0);
  };
  commentsButton.addEventListener("click",openComments);
  if(new URLSearchParams(location.search).get("comment")&&
   new URLSearchParams(location.search).get("post")===post.id)
   queueMicrotask(openComments);
  sort.addEventListener("change",()=>{updateNote();void loadComments(true);});
  more.addEventListener("click",()=>void loadComments(false));
  async function publishComment(sticker=null){
   hideMenus();
   const body=sticker?"":input.value.trim(),file=sticker||chosenFile;
   if(commentsLocked||submitting||cropping||(!body&&!file)||body.length>1000||!validId(ownId))return;
   submitting=true;updateSend();let uploaded=null,committed=false;
   try{
    const payload={post_kind:kind,post_id:post.id,
     author_id:userId,author_vatra_id:ownId,body};
    const target=replyTarget;
    if(target)payload.parent_comment_id=target.id;
    if(file){
     const bucket=file.kind==="image"?"post-images":"videos";
     const filename=(file.sticker?"sticker-":"")+crypto.randomUUID()+"."+file.ext;
     const path=ownId+"/comments/"+filename;
     const {error}=await client.storage.from(bucket).upload(path,file.file,{
      contentType:file.file.type,cacheControl:"3600",upsert:false
     });
     if(error)throw error;
     uploaded={bucket,path};
     payload.media_kind=file.kind;payload.media_path=path;
    }
    const result=await client.from("post_comments").insert(payload);
    if(result.error)throw result.error;
    committed=true;
    invalidateEngagement(client);invalidateComments(client);
    if(!sticker){input.value="";chosenFile=null;fileInput.value="";attachmentPreview.hidden=true;stopReply();}
    else if(!input.value.trim()&&!chosenFile)stopReply();
    updateSend();
    if(target&&rootReplies.has(target.id)){
     void rootReplies.get(target.id).expand(true);
    }else void loadComments(true,true);
    void refreshSocial();feedback(tr("Коментар опубліковано.","Comment published."));
   }catch(_){
    if(!committed){
     if(uploaded)try{await client.storage.from(uploaded.bucket).remove([uploaded.path]);}catch(_){}
     feedback(tr("Не вдалося опублікувати коментар. Спробуйте ще раз.",
      "Could not post comment. Please retry."),true);
    }else{

     feedback(tr("Коментар опубліковано.","Comment published."));
    }
   }finally{submitting=false;updateSend();}
  }
  form.addEventListener("submit",event=>{event.preventDefault();void publishComment();});







  let socialTicket=0;
  async function refreshSocial(){
   const ticket=++socialTicket;
   try{


   const snapshotMap=await prefetchEngagement(client,[{kind,id:post.id}]);
   if(!shell.isConnected||ticket!==socialTicket)return;
   const current=snapshotMap.get(kind+":"+post.id);
   if(!current)return;
   commentsCount.textContent=String(Math.max(0,Number(current.comment_count)||0));
   sharesCount.textContent=String(Math.max(0,Number(current.share_count)||0));
   }catch(_){ }
  }
  if(snapshot){
   commentsCount.textContent=String(Math.max(0,Number(snapshot.comment_count)||0));
   sharesCount.textContent=String(Math.max(0,Number(snapshot.share_count)||0));
  }
  if(!snapshot&&typeof IntersectionObserver!=="undefined"){
   const summaryObserver=new IntersectionObserver(entries=>{
    if(entries.some(x=>x.isIntersecting)){
     summaryObserver.disconnect();void refreshSocial();
    }
   },{rootMargin:"220px"});
   summaryObserver.observe(shell);
  }else if(!snapshot){void refreshSocial();}
  const shareMenu=make("dialog","vatra-post-share-dialog ui-vatra-post-share-dialog-001");
  shareMenu.setAttribute("aria-label",tr("Поділитися публікацією","Share post"));
  const shareHead=make("div","vatra-post-share-header ui-vatra-post-share-header-001");
  const shareTitle=make("h2","vatra-post-share-heading-001",tr("Поділитися","Share"));
  const shareClose=make("button","vatra-post-share-close-001");
  shareClose.type="button";shareClose.setAttribute("aria-label",tr("Закрити","Close"));
  shareClose.append(glyph("x"));
  shareClose.addEventListener("click",()=>shareMenu.close());
  shareHead.append(shareTitle,shareClose);
  const shareContent=make("div","vatra-post-share-body ui-vatra-post-share-body-001");
  const account=make("div","vatra-post-share-account ui-vatra-post-share-account-001");
  const ownAvatar=make("span","vatra-post-share-account-avatar-001");
  const ownLabel=make("div","vatra-post-share-account-info-001");
  const shareName=make("strong","vatra-post-share-account-name-001",
   tr("Ваша сторінка VATRA","Your VATRA page"));
  const audience=make("small","vatra-post-share-audience-001",tr("Опублікувати у своїй стрічці","Post to your feed"));
  ownLabel.append(shareName,audience);account.append(ownAvatar,ownLabel);
const shareAudienceLabel=make("label","vatra-post-share-visibility ui-vatra-post-share-visibility-001");
  const shareAudienceText=make("span","vatra-post-share-visibility-text-001",tr("Хто може бачити","Who can see this"));
  const shareAudience=make("select","ui-vatra-post-share-visibility-select-001");
  shareAudience.name="vatra_share_visibility";
  for(const [value,uk,en] of [["public","Публічно","Public"],["friends","Друзі","Friends"],["only_me","Лише я","Only me"]]){
   const option=make("option","vatra-post-share-option-"+value,tr(uk,en));option.value=value;
   shareAudience.append(option);
  }
  shareAudienceLabel.append(shareAudienceText,shareAudience);
  const shareCaption=make("textarea","ui-vatra-post-share-caption-001");
  shareCaption.name="vatra_share_caption";
  shareCaption.rows=3;shareCaption.maxLength=1800;
  shareCaption.placeholder=tr("Розкажіть щось про цю публікацію…","Say something about this post…");
  shareCaption.setAttribute("aria-label",tr("Ваш коментар до поширення","Your share caption"));
  const original=make("div","vatra-post-share-original ui-vatra-post-share-original-001");
  const originalHeading=make("strong","vatra-post-share-original-heading-001",
   tr("Публікація VATRA","VATRA post"));
  const originalText=make("p","vatra-post-share-original-text-001",
   Array.from(String(post.body||"")).slice(0,280).join("")||
   (post.media_kind==="video"?tr("Відеопублікація","Video post"):tr("Публікація з медіа","Media post")));
  original.append(originalHeading,originalText);
  const shareError=make("p","vatra-post-share-dialog-error-001");
  shareError.setAttribute("role","status");shareError.hidden=true;
  const showShareError=(msg)=>{shareError.textContent=msg;shareError.hidden=!msg;};
  const repost=make("button","vatra-post-share-profile-001",
   tr("Поділитися зараз","Share now"));repost.type="button";
  const lower=make("div","vatra-post-share-lower ui-vatra-post-share-lower-001");
  const lowerTitle=make("h3","vatra-post-share-lower-heading-001",
   tr("Надіслати у повідомленні","Send in a message"));
  const dm=make("button","vatra-post-share-message-001",
   tr("Оберіть друга","Choose a friend"));dm.type="button";
  const sendRow=make("div","vatra-post-share-friend-row ui-vatra-post-share-friend-row-001");
  sendRow.hidden=true;
  const friendSelect=make("select","ui-vatra-post-share-friend-select-001");
  friendSelect.name="vatra_share_friend";
  friendSelect.setAttribute("aria-label",tr("Оберіть друга","Choose a friend"));
  const sendDM=make("button","vatra-post-send-message-001",tr("Надіслати","Send"));
  sendDM.type="button";sendRow.append(friendSelect,sendDM);
  const linkRow=make("div","vatra-post-share-link-row ui-vatra-post-share-link-row-001");
  const linkTitle=make("h3","vatra-post-share-link-heading-001",tr("Поширити посилання","Share link"));
  const copy=make("button","vatra-post-share-copy-001",tr("Копіювати посилання","Copy link"));
  copy.type="button";
  linkRow.append(linkTitle,copy);
  lower.append(lowerTitle,dm,sendRow,linkRow);
  shareContent.append(account,shareAudienceLabel,shareCaption,original,shareError,repost,lower);
  shareMenu.append(shareHead,shareContent);
  document.body.append(shareMenu);
  shareMenu.addEventListener("click",event=>{if(event.target===shareMenu)shareMenu.close();});
  shareMenu.addEventListener("close",()=>{share.setAttribute("aria-expanded","false");});
  share.addEventListener("click",()=>{
   if(shareMenu.open){shareMenu.close();return;}
   showShareError("");shareMenu.showModal();share.setAttribute("aria-expanded","true");
   void (async()=>{
    try{
     const result=await client.auth.getUser();
     const meta=result.data?.user?.user_metadata||{};
     const name=[meta.first_name,meta.last_name].filter(Boolean).join(" ").trim()||
      String(meta.full_name||"").trim();
     if(name)shareName.textContent=name.slice(0,100);
     const image=window.VATRA_AVATAR?.getRemembered(result.data?.user?.email);
     if(image){
      const tmp=new Image();
      tmp.onload=()=>{if(shareMenu.isConnected){
       ownAvatar.classList.add("has-photo");
       ownAvatar.style.backgroundImage="url("+JSON.stringify(image)+")";
      }};
      tmp.src=image;
     }
    }catch(_){}
   })();
  });
  repost.addEventListener("click",async()=>{
   if(repost.disabled||!validId(ownId))return;
   repost.disabled=true;showShareError("");
   try{
    const caption=shareCaption.value.trim();
    const body=caption||tr("Поширена публікація","Shared a post");
    const result=await client.from("feed_posts").insert({
     author_id:userId,author_vatra_id:ownId,
     body,visibility:shareAudience.value,shared_post_kind:kind,shared_post_id:post.id
    });
    if(result.error)throw result.error;
   }catch(_){
    showShareError(tr("Не вдалося поділитися публікацією.","Could not share the post."));
    repost.disabled=false;return;
   }

   repost.disabled=false;
   invalidateEngagement(client);
   if(shareMenu.open)shareMenu.close();
   shareCaption.value="";
   feedback(tr("Публікацію додано у ваш профіль.","Shared to your profile."));
   if(typeof settings.onShared==="function"){
    try{Promise.resolve(settings.onShared()).catch(()=>{});}catch(_){}
   }
   void refreshSocial();
  });
  let friendsLoaded=false;
  dm.addEventListener("click",async()=>{

   friendsLoaded=false;sendDM.disabled=true;
   sendRow.hidden=false;dm.disabled=true;friendSelect.replaceChildren();
   const placeholder=make("option","ui-vatra-post-share-friend-placeholder-001",
    tr("Завантаження друзів…","Loading friends…"));
   placeholder.value="";friendSelect.append(placeholder);
   try{
    if(!validId(ownId))throw Error("Missing VATRA ID");
    const result=await client.from("friendships").select("requester_id,recipient_id,status")
     .or("requester_id.eq."+ownId+",recipient_id.eq."+ownId)
     .eq("status","accepted").limit(200);
    if(result.error)throw result.error;
    const ids=[...new Set((result.data||[]).map(x=>
     String(x.requester_id)===ownId?String(x.recipient_id):String(x.requester_id)
    ).filter(validId))];
    const people=await authorMap(client,ids.map(author_vatra_id=>({author_vatra_id})));
    friendSelect.replaceChildren();
    if(!ids.length){friendSelect.append(make("option","ui-vatra-post-share-no-friends-001",
      tr("Немає друзів для надсилання","No friends available")));sendDM.disabled=true;}
    else{
     for(const id of ids){
      const option=make("option","ui-vatra-post-share-friend-option-001",
       people.names.get(id)||"VATRA ID "+id);option.value=id;friendSelect.append(option);
     }
     sendDM.disabled=false;
    }
    friendsLoaded=true;
   }catch(_){friendSelect.replaceChildren(make("option","ui-vatra-post-share-error-001",
    tr("Не вдалося завантажити друзів","Could not load friends")));sendDM.disabled=true;}
   finally{dm.disabled=false;}
  });
  sendDM.addEventListener("click",()=>{
   const recipient=friendSelect.value;
   if(!friendsLoaded||!validId(recipient)||recipient===ownId||sendDM.disabled)return;

   const body=tr("Поглянь на цей допис: ","Check out this post: ")+permalink(post);


   try{
    sessionStorage.setItem("vatra:messenger:draft-v1",JSON.stringify({to:recipient,body,at:Date.now()}));
   }catch(_){
    showShareError(tr("Не вдалося передати чернетку безпечно. Скопіюйте посилання.","Cannot securely transfer draft. Copy the link instead."));
    return;
   }
   const link=new URL("messenger.html",relativeRoot());
   link.searchParams.set("to",recipient);
   if(shareMenu.open)shareMenu.close();
   location.assign(link.href);
  });
  copy.addEventListener("click",async()=>{
   try{
    await navigator.clipboard.writeText(permalink(post));
    copy.textContent=tr("Скопійовано","Copied");
    showShareError("");
   }catch(_){showShareError(tr("Не вдалося скопіювати. Скопіюйте посилання з адресного рядка.","Could not copy the link."));}
  });
  container.append(shell);
  mediaPanels.set(container,side=>{
   if(!shell.isConnected||commentDialog?.open)return null;
   const marker=make("span","ui-vatra-media-actions-origin-001");marker.hidden=true;shell.before(marker);
   const wasHidden=panel.hidden;filterRow.remove();note.remove();side.append(shell);row.classList.add("vatra-media-actions-unified-001");panel.hidden=false;commentsButton.setAttribute("aria-expanded","true");side.closest("dialog")?.append(popovers);void loadComments(true,entries.children.length>0);
   const avoidNested=e=>{if(e.target.closest(".vatra-post-comments-toggle-001")){e.preventDefault();e.stopImmediatePropagation();}};side.addEventListener("click",avoidNested,true);
   return ()=>{side.removeEventListener("click",avoidNested,true);hideMenus();row.classList.remove("vatra-media-actions-unified-001");composer.insertBefore(popovers,fileInput);panel.insertBefore(filterRow,entries);panel.insertBefore(note,entries);panel.hidden=wasHidden;commentsButton.setAttribute("aria-expanded",String(!wasHidden));if(marker.isConnected)marker.replaceWith(shell);else shell.remove();};
  });
  if(settings.inlineComments)openComments();
 }
 async function renderSharedPreview(client,post,container){
  const kind=post?.shared_post_kind,id=post?.shared_post_id;
  if(!["person","group"].includes(kind)||!validUUID(id)||!container)return;
  const preview=make("aside","vatra-post-share-preview ui-vatra-post-share-preview-001");
  preview.append(make("strong","vatra-post-share-preview-heading-001",
   tr("Оригінальна публікація","Original post")));
  container.append(preview);
  try{
   const table=kind==="person"?"feed_posts":"community_posts";
   const {data,error}=await client.from(table)
    .select(kind==="group"?
     "id,club_id,author_vatra_id,body,media_kind,media_path,media_items,created_at":
     "id,author_vatra_id,body,media_kind,media_path,media_items,created_at,is_clip")
    .eq("id",id).maybeSingle();
   if(error||!data)throw Error("Original post unavailable");
   if(!preview.isConnected)return;
   const member=await client.from("public_profiles").select("display_name")
    .eq("vatra_id",data.author_vatra_id).maybeSingle();
   const name=!member.error&&member.data?.display_name?
    member.data.display_name:tr("Користувач VATRA","VATRA member");
   const link=make("a","vatra-post-original-link-001",name);
   link.href=new URL("id"+data.author_vatra_id,relativeRoot()).href;
   preview.append(link);
   if(!member.error&&member.data?.display_name)void window.VATRA_VERIFIED?.attach(client,link,data.author_vatra_id);
   if(kind==="group"&&data.club_id){
    const group=await client.from("communities").select("name").eq("club_id",data.club_id).maybeSingle();
    const groupLink=make("a","vatra-post-original-community-001",
     group.data?.name||tr("Спільнота VATRA","VATRA community"));
    groupLink.href=new URL("club"+data.club_id,relativeRoot()).href;
    preview.append(groupLink);
   }
   if(data.body){
    const body=make("p","vatra-post-share-preview-body-001",data.body);
    window.VATRA_POST_MEDIA?.linkifyHashtags(body);preview.append(body);
   }
   if(data.is_clip){const clip=make("a","vatra-post-original-link-001",tr("Відкрити кліп","Open clip"));clip.href=permalink({...data,kind:"person"});preview.append(clip);}
   else if(data.media_items?.length||(data.media_kind&&data.media_path))void window.VATRA_POST_MEDIA?.mount(client,data,preview);
  }catch(_){
   if(preview.isConnected)preview.append(make("p","vatra-post-original-unavailable-001",
    tr("Ця публікація недоступна.","This post is unavailable.")));
  }
 }
 window.VATRA_POST_INTERACTIONS={mount,renderSharedPreview,authorMap,prefetchEngagement,appendAudience,addOwnerMenu,attachMediaPanel:(container,side)=>mediaPanels.get(container)?.(side)};
})();