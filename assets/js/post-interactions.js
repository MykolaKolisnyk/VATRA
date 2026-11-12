/* VATRA post interactions. RLS is the source of truth; no unsafe HTML from members. */
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const tr=(uk,en)=>document.documentElement.lang==="en"?en:uk;
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
  if(type==="heart")path("M20.6 8.5c0 4.5-8.6 10-8.6 10s-8.6-5.5-8.6-10a4.6 4.6 0 0 1 8.6-2.2 4.6 4.6 0 0 1 8.6 2.2Z");
  if(type==="comments")path("M20.5 11.6a8.5 8.5 0 0 1-8.6 8.1 9 9 0 0 1-3.8-.9L3 20l1.4-4.5A8.3 8.3 0 0 1 3.5 12a8.5 8.5 0 0 1 17 0Z M8 10h8M8 13.5h5");
  if(type==="bookmark")path("M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z");
  if(type==="share"){
   path("M8.6 11.2 16 6.7M8.6 13 16 17.3");
   for(const [cx,cy] of [[5.3,12.2],[18,5.5],[18,18.5]]){
    const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("cx",cx);c.setAttribute("cy",cy);c.setAttribute("r","2.5");svg.append(c);
   }
  }
  return svg;
 };
 const action=(className,type,label)=>{
  const button=make("button",className);button.type="button";
  button.append(glyph(type),make("span","vt-vatra-post-action-label-001",label));
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
  return new URL("feed?post="+encodeURIComponent(post.id),relativeRoot()).href;
 };
 const dateValue=input=>{
  const date=new Date(input);return Number.isNaN(date.valueOf())?"":new Intl.DateTimeFormat(
   document.documentElement.lang==="en"?"en-US":"uk-UA",
   {day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}
  ).format(date);
 };
 async function authorMap(client,rows){
  const ids=[...new Set(rows.map(x=>String(x.author_vatra_id)).filter(validId))];
  const names=new Map(),images=new Map();
  if(!ids.length)return {names,images};
  const [profile,media]=await Promise.all([
   client.from("vatra_public_profiles").select("vatra_id,display_name").in("vatra_id",ids),
   client.from("vatra_profile_media").select("vatra_id,avatar_path").in("vatra_id",ids)
  ]);
  if(!profile.error)for(const x of profile.data||[])names.set(String(x.vatra_id),x.display_name);
  if(!media.error)for(const x of media.data||[]){
   const id=String(x.vatra_id),path=x.avatar_path;
   if(typeof path!=="string"||!path.startsWith(id+"/avatar/"))continue;
   const url=client.storage.from("vatra-avatars").getPublicUrl(path)?.data?.publicUrl;
   if(url)try{
    const validated=new URL(url);
    if(validated.protocol==="https:"&&validated.hostname==="rjasunoawrxvetwadylh.supabase.co")
     images.set(id,validated.href);
   }catch(_){}
  }
  return {names,images};
 }
function appendAudience(container,level,isGroup=false){
  if(!container)return;
  const visibility=isGroup?"group":["public","friends","only_me"].includes(level)?level:"public";
  const label=visibility==="friends"?tr("Для друзів","Friends only"):
   visibility==="only_me"?tr("Лише я","Only me"):
   visibility==="group"?tr("Учасники спільноти","Community members"):
   tr("Публічно","Public");
  const marker=make("span","feed-post-audience ui-feed-post-audience-001");
  marker.title=label;marker.setAttribute("aria-label",label);
  const symbol=glyph(visibility==="only_me"?"bookmark":visibility==="public"?"share":"comments");
  symbol.setAttribute("class","ui-feed-post-audience-icon-001");
  symbol.replaceChildren();
  const ns="http://www.w3.org/2000/svg";
  const path=document.createElementNS(ns,"path");
  if(visibility==="only_me")path.setAttribute("d","M7 10V7a5 5 0 0 1 10 0v3M5.5 10.5h13v10h-13z");
  else if(visibility==="public")path.setAttribute("d","M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c-4 4-4 14 0 18M12 3c4 4 4 14 0 18");
  else path.setAttribute("d","M15.5 10a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM4 21v-1a8 8 0 0 1 16 0v1M5.5 9a2.5 2.5 0 0 0 0 5M18.5 9a2.5 2.5 0 0 1 0 5");
  symbol.append(path);marker.append(symbol);
  container.append(marker);
 }
 function mount(client,post,container,settings={}){
  const kind=post?.kind==="group"?"group":"person";
  if(!validUUID(post?.id)||!client||!container)return;
  const ownId=String(settings.ownId||""),userId=settings.userId;
  const shell=make("section","vatra-post-interactions ui-vatra-post-interactions-001");
  shell.setAttribute("aria-label",tr("Взаємодія з публікацією","Post interactions"));
  const row=make("div","vatra-post-action-row ui-vatra-post-action-row-001");
  const like=action("vt-vatra-post-like-001","heart",tr("Подобається","Like"));
  like.setAttribute("aria-pressed","false");
  const count=make("span","vt-vatra-post-like-count-001","");
  like.append(count);
  const commentsButton=action("vt-vatra-post-comments-toggle-001","comments",tr("Коментарі","Comments"));
  commentsButton.setAttribute("aria-expanded","false");
  const share=action("vt-vatra-post-share-toggle-001","share",tr("Поділитися","Share"));
  share.setAttribute("aria-expanded","false");
  const saved=action("vt-vatra-post-save-001","bookmark",tr("Зберегти","Save"));
  saved.setAttribute("aria-pressed","false");
  if(!validId(ownId))saved.hidden=true;
  row.append(like,commentsButton,share,saved);shell.append(row);
  if(validId(ownId)){
   let stored=false;
   const refresh=()=>{saved.setAttribute("aria-pressed",String(stored));
    saved.querySelector("span").textContent=stored?tr("Збережено","Saved"):tr("Зберегти","Save");};
   void (async()=>{
    try{
     const {data,error}=await client.from("post_saves").select("post_id")
      .eq("owner_vatra_id",ownId).eq("post_kind",kind).eq("post_id",post.id).maybeSingle();
     if(!error){stored=!!data;refresh();}
    }catch(_){}
   })();
   saved.addEventListener("click",async()=>{
    if(saved.disabled)return;saved.disabled=true;
    try{
     const result=stored?await client.from("post_saves").delete()
      .eq("owner_vatra_id",ownId).eq("post_kind",kind).eq("post_id",post.id):
      await client.from("post_saves").insert({owner_vatra_id:ownId,post_kind:kind,post_id:post.id});
     if(result.error)throw result.error;
     stored=!stored;refresh();
    }catch(_){saved.title=tr("Не вдалося зберегти. Спробуйте ще раз.","Could not save. Retry.");}
    finally{saved.disabled=false;}
   });
  }

  const status=make("p","vt-vatra-post-interactions-status-001");
  status.setAttribute("role","status");status.hidden=true;
  const feedback=(message,bad=false)=>{
   status.hidden=!message;status.textContent=message;status.dataset.state=bad?"error":"ok";
  };
  let likeReady=false,likePending=null,liked=false,likeCount=0;
  const likeFilter=query=>query.eq("post_kind",kind).eq("post_id",post.id);
  const hydrateLike=()=>{
   if(likePending)return likePending;
   likePending=(async()=>{
    const [total,mine]=await Promise.all([
     likeFilter(client.from("vatra_post_likes").select("liker_id",{count:"exact",head:true})),
     likeFilter(client.from("vatra_post_likes").select("liker_id")).eq("liker_id",userId).limit(1)
    ]);
    if(total.error||mine.error)throw total.error||mine.error;
    likeCount=total.count||0;liked=!!mine.data?.length;likeReady=true;
    count.textContent=likeCount?String(likeCount):"";
    like.setAttribute("aria-pressed",String(liked));
    like.classList.toggle("is-liked",liked);
   })().catch(()=>feedback(tr("Вподобання тимчасово недоступні.","Likes temporarily unavailable."),true))
    .finally(()=>{likePending=null;});
   return likePending;
  };
  if(typeof IntersectionObserver!=="undefined"){
   const observer=new IntersectionObserver(entries=>{
    if(entries.some(x=>x.isIntersecting)){observer.disconnect();void hydrateLike();}
   },{rootMargin:"160px"});
   observer.observe(shell);
  }else{void hydrateLike();}
  like.addEventListener("click",async()=>{
   if(like.disabled)return;
   like.disabled=true;feedback("");
   try{
    if(!likeReady)await hydrateLike();
    if(!likeReady)throw Error("Likes unavailable");
    const result=liked?
     await likeFilter(client.from("vatra_post_likes").delete()).eq("liker_id",userId):
     await client.from("vatra_post_likes").insert({post_kind:kind,post_id:post.id,liker_id:userId});
    if(result.error)throw result.error;
    liked=!liked;likeCount+=liked?1:-1;
    like.classList.toggle("is-liked",liked);like.setAttribute("aria-pressed",String(liked));
    count.textContent=likeCount?String(likeCount):"";
    void refreshSocial();
   }catch(_){feedback(tr("Не вдалося змінити вподобання.","Could not update your like."),true);}
   finally{like.disabled=false;}
  });

  // Real inline thread belongs to every post; never hide comments behind a separate view.
  const panel=make("div","vatra-post-comments-panel ui-vatra-post-comments-panel-001");
  commentsButton.setAttribute("aria-expanded","true");
  const filterRow=make("div","vatra-post-comments-filter-row ui-vatra-post-comments-filter-row-001");
  const sortLabel=make("label","vt-vatra-post-comments-filter-label-001",tr("Сортувати:","Sort:"));
  const sort=make("select","ui-vatra-post-comments-sort-001");
  sort.name="vatra_post_comments_sort";
  for(const [id,uk,en] of [
   ["relevant","Спочатку цікаві","Most relevant first"],
   ["newest","Спочатку нові","Newest first"],
   ["all","Усі коментарі","All comments"]
  ]){
   const option=make("option","ui-vatra-post-comment-option-"+id, tr(uk,en));
   option.value=id;sort.append(option);
  }
  sortLabel.append(sort);filterRow.append(sortLabel);
  const note=make("small","vt-vatra-post-comments-sort-note-001");
  const updateNote=()=>{
   note.textContent=sort.value==="relevant"?
    tr("Спочатку друзі й коментарі з найбільшою кількістю вподобань.",
       "Friends and most-liked comments appear first."):
    sort.value==="newest"?
    tr("Від нових до старих, без позначеного спаму.",
       "Newest first, excluding marked spam."):
    tr("Усі доступні коментарі, включно з можливим спамом.",
       "All available comments, including potential spam.");
  };
  updateNote();panel.append(filterRow,note);
  const entries=make("div","vatra-post-comment-list ui-vatra-post-comment-list-001");
  entries.setAttribute("role","feed");entries.setAttribute("aria-busy","false");
  const more=make("button","vt-vatra-post-comments-more-001",
   tr("Показати наступні коментарі","Show more comments"));
  more.type="button";more.hidden=true;
  const form=make("form","vatra-post-comment-form ui-vatra-post-comment-form-001");
  const input=make("textarea","ui-vatra-post-comment-input-001");
  input.name="vatra_post_comment";
  input.maxLength=1000;input.rows=2;input.required=true;
  input.placeholder=tr("Написати коментар…","Write a comment…");
  input.setAttribute("aria-label",tr("Ваш коментар","Your comment"));
  const send=make("button","vt-vatra-post-comment-send-001",tr("Надіслати","Send"));send.type="submit";
  form.append(input,send);panel.append(entries,more,form);shell.append(panel);

  const pageSize=window.matchMedia?.("(max-width: 640px)")?.matches?4:6;
  let commentOffset=0,busy=false,commentsOpened=true,ticket=0;
  async function loadComments(reset=false){
   if(busy)return;
   busy=true;more.disabled=true;entries.setAttribute("aria-busy","true");
   const token=++ticket;
   if(reset){commentOffset=0;entries.replaceChildren();more.hidden=true;}
   try{
    const {data,error}=await client.rpc("vatra_comment_page",{
     p_kind:kind,p_post_id:post.id,p_sort:sort.value,p_offset:commentOffset,p_limit:pageSize
    });
    if(error)throw error;
    if(token!==ticket)return;
    const rows=data||[],{names,images}=await authorMap(client,rows);
    const ids=rows.map(x=>x.id);
    let ownLikes=new Set();
    if(ids.length){
     const result=await client.from("vatra_post_comment_likes")
      .select("comment_id").in("comment_id",ids).eq("liker_id",userId);
     if(!result.error)ownLikes=new Set((result.data||[]).map(x=>x.comment_id));
    }
    if(token!==ticket)return;
    if(reset&&!rows.length)entries.append(make("p","vt-vatra-post-comments-empty-001",
     tr("Коментарів поки немає.","No comments yet.")));
    for(const item of rows){
     const card=make("article","vatra-post-comment ui-vatra-post-comment-001");
     const head=make("div","vatra-post-comment-head ui-vatra-post-comment-head-001");
     const id=String(item.author_vatra_id),name=names.get(id)||tr("Користувач VATRA","VATRA member");
     const avatar=make("a","vatra-comment-avatar ui-vatra-comment-avatar-001",
      name.split(/\s+/).slice(0,2).map(x=>Array.from(x)[0]||"").join("").toUpperCase());
     avatar.href=new URL("id"+id,relativeRoot()).href;
     avatar.setAttribute("aria-label",name);
     const url=images.get(id);
     if(url){avatar.style.backgroundImage="url("+JSON.stringify(url)+")";avatar.classList.add("has-photo");avatar.textContent="";}
     const info=make("div","vatra-post-comment-meta ui-vatra-post-comment-meta-001");
     const author=make("a","vt-vatra-post-comment-author-001",name);
     author.href=avatar.href;
     const stamp=make("time","vt-vatra-post-comment-date-001",dateValue(item.created_at));
     stamp.dateTime=item.created_at;info.append(author,stamp);head.append(avatar,info);
     const body=make("p","vt-vatra-post-comment-body-001",item.body);
     card.append(head,body);
     if(item.moderation_status==="possible_spam")
      card.append(make("small","vt-vatra-post-comment-spam-001",
       tr("Можливий спам","Potential spam")));
     const likeComment=make("button","vt-vatra-post-comment-like-001");
     likeComment.type="button";
     let countValue=Number(item.likes)||0,ownLiked=ownLikes.has(item.id);
     const renderCommentLike=()=>{
      likeComment.textContent=(ownLiked?"♥ ":"♡ ")+
       tr("Подобається","Like")+(countValue?" · "+countValue:"");
      likeComment.setAttribute("aria-pressed",String(ownLiked));
     };
     renderCommentLike();
     likeComment.addEventListener("click",async()=>{
      if(likeComment.disabled)return;
      likeComment.disabled=true;
      try{
       const result=ownLiked?
        await client.from("vatra_post_comment_likes").delete()
         .eq("comment_id",item.id).eq("liker_id",userId):
        await client.from("vatra_post_comment_likes").insert({comment_id:item.id,liker_id:userId});
       if(result.error)throw result.error;
       ownLiked=!ownLiked;countValue+=ownLiked?1:-1;renderCommentLike();
      }catch(_){feedback(tr("Не вдалося змінити вподобання коментаря.","Could not like the comment."),true);}
      finally{likeComment.disabled=false;}
     });
     card.append(likeComment);entries.append(card);
    }
    commentOffset+=rows.length;
    more.hidden=rows.length<pageSize;
    feedback("");
   }catch(_){feedback(tr("Не вдалося завантажити коментарі.","Could not load comments."),true);}
   finally{busy=false;more.disabled=false;entries.setAttribute("aria-busy","false");}
  }
  commentsButton.addEventListener("click",()=>{
   // Comments are already beneath the post: guide the reader to them.
   if(commentOffset===0)void loadComments(true);
   panel.scrollIntoView({block:"nearest",behavior:"smooth"});
  });
  sort.addEventListener("change",()=>{updateNote();void loadComments(true);});
  more.addEventListener("click",()=>void loadComments(false));
  form.addEventListener("submit",async event=>{
   event.preventDefault();const body=input.value.trim();
   if(!body||body.length>1000||send.disabled||!validId(ownId))return;
   send.disabled=true;
   try{
    const result=await client.from("vatra_post_comments").insert({
     post_kind:kind,post_id:post.id,author_id:userId,author_vatra_id:ownId,body
    });
    if(result.error)throw result.error;
    input.value="";feedback(tr("Коментар додано.","Comment published."));
    await loadComments(true);
    void refreshSocial();
   }catch(_){feedback(tr("Не вдалося опублікувати коментар.","Could not publish comment."),true);}
   finally{send.disabled=false;}
  });

  // A true modal composer, matching VATRA typography: caption, original, friends and link.
  // The original post is referenced by UUID; the share creates a real feed_posts row.

  // Real social proof: three newest liker photos, comment/repost counts and two
  // recent comments. All numbers come from RLS-readable rows, never placeholders.
  const social=make("div","vatra-post-social-summary ui-vatra-post-social-summary-001");
  social.hidden=true;
  const faces=make("div","vatra-post-social-avatars ui-vatra-post-social-avatars-001");
  const likesText=make("span","vt-vatra-post-social-likes-001");
  const commentsText=make("button","vt-vatra-post-social-comments-001");
  commentsText.type="button";
  const sharesText=make("span","vt-vatra-post-social-shares-001");
  social.append(faces,likesText,commentsText,sharesText);
  shell.insertBefore(social,row);
  const compact=make("div","vatra-post-compact-comments ui-vatra-post-compact-comments-001");
  compact.hidden=true;shell.insertBefore(compact,panel);
  const viewAll=make("button","vt-vatra-post-compact-all-001",tr("Переглянути всі коментарі","View all comments"));
  viewAll.type="button";
  const expandComments=()=>{
   if(commentOffset===0)void loadComments(true);
   panel.scrollIntoView({block:"nearest",behavior:"smooth"});
  };
  viewAll.addEventListener("click",expandComments);
  commentsText.addEventListener("click",expandComments);
  let socialTicket=0;
  async function refreshSocial(){
   const ticket=++socialTicket;
   try{
    const [likeResult,commentsResult,sharesResult,recent]=await Promise.all([
     likeFilter(client.from("vatra_post_likes").select("liker_id",{count:"exact",head:true})),
     client.from("vatra_post_comments").select("id,author_vatra_id,body,created_at",{count:"exact"})
      .eq("post_kind",kind).eq("post_id",post.id)
      .order("created_at",{ascending:false}).limit(2),
     client.from("feed_posts").select("id",{count:"exact",head:true})
      .eq("shared_post_kind",kind).eq("shared_post_id",post.id).is("archived_at",null),
     client.from("vatra_post_like_members").select("liker_vatra_id")
      .eq("post_kind",kind).eq("post_id",post.id)
      .order("liked_at",{ascending:false}).limit(3)
    ]);
    if(!shell.isConnected||ticket!==socialTicket)return;
    const likes=likeResult.error?likeCount:Number(likeResult.count||0);
    const comments=commentsResult.error?0:Number(commentsResult.count||0);
    const shares=sharesResult.error?0:Number(sharesResult.count||0);
    const rows=commentsResult.error?[]:commentsResult.data||[];
    const likesIds=recent.error?[]:(recent.data||[]).map(x=>String(x.liker_vatra_id)).filter(validId).slice(0,3);
    const {names,images}=await authorMap(client,[
     ...rows,...likesIds.map(author_vatra_id=>({author_vatra_id}))
    ]);
    if(!shell.isConnected||ticket!==socialTicket)return;
    faces.replaceChildren();
    for(let i=0;i<likesIds.length;i++){
     const id=likesIds[i];
     const avatar=make("a","vatra-post-social-avatar vt-vatra-post-social-avatar-"+i);
     avatar.href=new URL("id"+id,relativeRoot()).href;
     avatar.setAttribute("aria-label",names.get(id)||tr("Користувач VATRA","VATRA member"));
     const photo=images.get(id);
     if(photo){
      const image=new Image();
      image.onload=()=>{if(avatar.isConnected){
       avatar.classList.add("has-photo");avatar.style.backgroundImage="url("+JSON.stringify(photo)+")";
      }};
      image.src=photo;
     }
     faces.append(avatar);
    }
    faces.hidden=!likesIds.length;
    likesText.textContent=likes?likes+" "+tr("вподобали","likes"):"";
    likesText.hidden=!likes;
    commentsText.textContent=comments?comments+" "+tr("коментарів","comments"):"";
    commentsText.hidden=!comments;
    sharesText.textContent=shares?shares+" "+tr("поширень","shares"):"";
    sharesText.hidden=!shares;
    social.hidden=likes+comments+shares===0;
    compact.replaceChildren();
    for(const [i,item] of rows.entries()){
     const authorId=String(item.author_vatra_id);
     const card=make("div","vatra-post-compact-comment ui-vatra-post-compact-comment-"+i);
     const a=make("a","vt-vatra-post-compact-author-"+i,
      names.get(authorId)||tr("Користувач VATRA","VATRA member"));
     a.href=new URL("id"+authorId,relativeRoot()).href;
     const text=make("span","vt-vatra-post-compact-text-"+i,
      Array.from(item.body||"").slice(0,240).join(""));
     const avatar=make("a","vatra-post-compact-avatar ui-vatra-post-compact-avatar-"+i);
     avatar.href=a.href;avatar.setAttribute("aria-label",a.textContent);
     const photo=images.get(authorId);
     if(photo){
      const image=new Image();image.onload=()=>{if(avatar.isConnected){
       avatar.classList.add("has-photo");avatar.style.backgroundImage="url("+JSON.stringify(photo)+")";
      }};image.src=photo;
     }
     card.append(avatar,a,text);compact.append(card);
    }
    if(comments>rows.length)compact.append(viewAll);
    compact.hidden=true; // No second, duplicate comment preview. The thread below is canonical.
   }catch(_){/* Feed and interaction buttons stay usable when social summaries fail. */}
  }
  if(typeof IntersectionObserver!=="undefined"){
   const summaryObserver=new IntersectionObserver(entries=>{
    if(entries.some(x=>x.isIntersecting)){
     summaryObserver.disconnect();void refreshSocial();void loadComments(true);
    }
   },{rootMargin:"220px"});
   summaryObserver.observe(shell);
  }else{void refreshSocial();void loadComments(true);}
  const shareMenu=make("dialog","vatra-post-share-dialog ui-vatra-post-share-dialog-001");
  shareMenu.setAttribute("aria-label",tr("Поділитися публікацією","Share post"));
  const shareHead=make("div","vatra-post-share-header ui-vatra-post-share-header-001");
  const shareTitle=make("h2","vt-vatra-post-share-heading-001",tr("Поділитися","Share"));
  const shareClose=make("button","vt-vatra-post-share-close-001");
  shareClose.type="button";shareClose.setAttribute("aria-label",tr("Закрити","Close"));
  shareClose.textContent="×";
  shareClose.addEventListener("click",()=>shareMenu.close());
  shareHead.append(shareTitle,shareClose);
  const shareContent=make("div","vatra-post-share-body ui-vatra-post-share-body-001");
  const account=make("div","vatra-post-share-account ui-vatra-post-share-account-001");
  const ownAvatar=make("span","vt-vatra-post-share-account-avatar-001");
  const ownLabel=make("div","vt-vatra-post-share-account-info-001");
  const shareName=make("strong","vt-vatra-post-share-account-name-001",
   tr("Ваша сторінка VATRA","Your VATRA page"));
  const audience=make("small","vt-vatra-post-share-audience-001",tr("Опублікувати у своїй стрічці","Post to your feed"));
  ownLabel.append(shareName,audience);account.append(ownAvatar,ownLabel);
const shareAudienceLabel=make("label","vatra-post-share-visibility ui-vatra-post-share-visibility-001");
  const shareAudienceText=make("span","vt-vatra-post-share-visibility-text-001",tr("Хто може бачити","Who can see this"));
  const shareAudience=make("select","ui-vatra-post-share-visibility-select-001");
  shareAudience.name="vatra_share_visibility";
  for(const [value,uk,en] of [["public","Публічно","Public"],["friends","Друзі","Friends"],["only_me","Лише я","Only me"]]){
   const option=make("option","vt-vatra-post-share-option-"+value,tr(uk,en));option.value=value;
   shareAudience.append(option);
  }
  shareAudienceLabel.append(shareAudienceText,shareAudience);
  const shareCaption=make("textarea","ui-vatra-post-share-caption-001");
  shareCaption.name="vatra_share_caption";
  shareCaption.rows=3;shareCaption.maxLength=1800;
  shareCaption.placeholder=tr("Розкажіть щось про цю публікацію…","Say something about this post…");
  shareCaption.setAttribute("aria-label",tr("Ваш коментар до поширення","Your share caption"));
  const original=make("div","vatra-post-share-original ui-vatra-post-share-original-001");
  const originalHeading=make("strong","vt-vatra-post-share-original-heading-001",
   tr("Публікація VATRA","VATRA post"));
  const originalText=make("p","vt-vatra-post-share-original-text-001",
   Array.from(String(post.body||"")).slice(0,280).join("")||
   (post.media_kind==="video"?tr("Відеопублікація","Video post"):tr("Публікація з медіа","Media post")));
  original.append(originalHeading,originalText);
  const shareError=make("p","vt-vatra-post-share-dialog-error-001");
  shareError.setAttribute("role","status");shareError.hidden=true;
  const showShareError=(msg)=>{shareError.textContent=msg;shareError.hidden=!msg;};
  const repost=make("button","vt-vatra-post-share-profile-001",
   tr("Поділитися зараз","Share now"));repost.type="button";
  const lower=make("div","vatra-post-share-lower ui-vatra-post-share-lower-001");
  const lowerTitle=make("h3","vt-vatra-post-share-lower-heading-001",
   tr("Надіслати у повідомленні","Send in a message"));
  const dm=make("button","vt-vatra-post-share-message-001",
   tr("Оберіть друга","Choose a friend"));dm.type="button";
  const sendRow=make("div","vatra-post-share-friend-row ui-vatra-post-share-friend-row-001");
  sendRow.hidden=true;
  const friendSelect=make("select","ui-vatra-post-share-friend-select-001");
  friendSelect.name="vatra_share_friend";
  friendSelect.setAttribute("aria-label",tr("Оберіть друга","Choose a friend"));
  const sendDM=make("button","vt-vatra-post-send-message-001",tr("Надіслати","Send"));
  sendDM.type="button";sendRow.append(friendSelect,sendDM);
  const linkRow=make("div","vatra-post-share-link-row ui-vatra-post-share-link-row-001");
  const linkTitle=make("h3","vt-vatra-post-share-link-heading-001",tr("Поширити посилання","Share link"));
  const copy=make("button","vt-vatra-post-share-copy-001",tr("Копіювати посилання","Copy link"));
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
    shareMenu.close();shareCaption.value="";
    feedback(tr("Публікацію додано на вашу сторінку.","Shared to your profile."));
    if(typeof settings.onShared==="function")settings.onShared();
    void refreshSocial();
   }catch(_){showShareError(tr("Не вдалося поділитися публікацією.","Could not share the post."));}
   finally{repost.disabled=false;}
  });
  let friendsLoaded=false;
  dm.addEventListener("click",async()=>{
   sendRow.hidden=false;dm.disabled=true;friendSelect.replaceChildren();
   const placeholder=make("option","ui-vatra-post-share-friend-placeholder-001",
    tr("Завантаження друзів…","Loading friends…"));
   placeholder.value="";friendSelect.append(placeholder);
   try{
    if(!validId(ownId))throw Error("Missing VATRA ID");
    const result=await client.from("vatra_friendships").select("requester_id,recipient_id,status")
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
  sendDM.addEventListener("click",async()=>{
   const recipient=friendSelect.value;
   if(!friendsLoaded||!validId(recipient)||recipient===ownId||sendDM.disabled)return;
   sendDM.disabled=true;showShareError("");
   try{
    const body=tr("Поглянь на цей допис: ","Check out this post: ")+permalink(post);
    const result=await client.from("vatra_direct_messages").insert({
     sender_id:ownId,recipient_id:recipient,body
    });
    if(result.error)throw result.error;
    shareMenu.close();
    feedback(tr("Посилання надіслано другу.","Sent to your friend."));
   }catch(_){showShareError(tr("Не вдалося надіслати повідомлення.","Could not send message."));}
   finally{sendDM.disabled=false;}
  });
  copy.addEventListener("click",async()=>{
   try{
    await navigator.clipboard.writeText(permalink(post));
    copy.textContent=tr("Скопійовано","Copied");
    showShareError("");
   }catch(_){showShareError(tr("Не вдалося скопіювати. Скопіюйте посилання з адресного рядка.","Could not copy the link."));}
  });
  container.append(shell);
 }
 async function renderSharedPreview(client,post,container){
  const kind=post?.shared_post_kind,id=post?.shared_post_id;
  if(!["person","group"].includes(kind)||!validUUID(id)||!container)return;
  const preview=make("aside","vatra-post-share-preview ui-vatra-post-share-preview-001");
  preview.append(make("strong","vt-vatra-post-share-preview-heading-001",
   tr("Оригінальна публікація","Original post")));
  container.append(preview);
  try{
   const table=kind==="person"?"feed_posts":"vatra_community_posts";
   const {data,error}=await client.from(table)
    .select(kind==="group"?
     "id,club_id,author_vatra_id,body,media_kind,media_path,created_at":
     "id,author_vatra_id,body,media_kind,media_path,created_at")
    .eq("id",id).maybeSingle();
   if(error||!data)throw Error("Original post unavailable");
   if(!preview.isConnected)return;
   const member=await client.from("vatra_public_profiles").select("display_name")
    .eq("vatra_id",data.author_vatra_id).maybeSingle();
   const name=!member.error&&member.data?.display_name?
    member.data.display_name:tr("Користувач VATRA","VATRA member");
   const link=make("a","vt-vatra-post-original-link-001",name);
   link.href=new URL("id"+data.author_vatra_id,relativeRoot()).href;
   preview.append(link);
   if(kind==="group"&&data.club_id){
    const group=await client.from("communities").select("name").eq("club_id",data.club_id).maybeSingle();
    const groupLink=make("a","vt-vatra-post-original-community-001",
     group.data?.name||tr("Спільнота VATRA","VATRA community"));
    groupLink.href=new URL("club"+data.club_id,relativeRoot()).href;
    preview.append(groupLink);
   }
   if(data.body){
    const body=make("p","vt-vatra-post-share-preview-body-001",data.body);
    window.VATRA_POST_MEDIA?.linkifyHashtags(body);preview.append(body);
   }
   if(data.media_kind&&data.media_path)void window.VATRA_POST_MEDIA?.mount(client,data,preview);
  }catch(_){
   if(preview.isConnected)preview.append(make("p","vt-vatra-post-original-unavailable-001",
    tr("Ця публікація недоступна.","This post is unavailable.")));
  }
 }
 window.VATRA_POST_INTERACTIONS={mount,renderSharedPreview,authorMap,appendAudience};
})();