(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
window.VATRA_COMMUNITY_CORE?.start(async (client,ownId,userId,{root,locale,t,$,idPattern,postPattern,clubURL,node,status})=>{
async function setupClubSocial(client,clubId,ownId,userId){
 const follow=$("#club-follow"),compose=$("#club-compose-open"),list=$("#club-posts");
 const empty=$("#club-posts-empty"),more=$("#club-posts-more"),dialog=$("#club-compose-dialog");
 const form=$("#club-compose-form"),input=$("#club-compose-text"),status=$("#club-compose-error");
 if(!follow||!compose||!list||!ownId||!idPattern.test(ownId))return;
 let isFollowing=false,busy=false,focusRequestedPost=true,postsLoading=false,postsOffset=0,refreshQueued=false;
 const renderedPostIds=new Set();
 const CLUB_PAGE_SIZE=12;
 const show=(el,text)=>{el.textContent=text;el.hidden=!text;};
 const guestLabel=node("label","ui-club-guest-optin-001"),guestOption=node("input","ui-club-guest-optin-check-001");guestOption.type="checkbox";
 guestLabel.append(guestOption,node("span","vatra-club-guest-optin-label-001",t("Дозволити гостям читати цей текстовий допис","Allow guests to read this text post")));input.after(guestLabel);
 const picker=window.VATRA_POST_MEDIA?.bindGalleryPicker({
  input:"#club-compose-media",choose:"#club-compose-media-choose",
  clear:"#club-compose-media-remove",preview:"#club-compose-media-preview",
  onError:text=>show(status,text)
 });
 const refreshFollowing=async()=>{
  const {data,error}=await client.from("community_follows")
   .select("club_id").eq("club_id",clubId).eq("member_vatra_id",ownId).maybeSingle();
  if(error)throw error;
  isFollowing=!!data;
  follow.textContent=isFollowing?t("Відписатися","Unfollow"):t("Підписатися","Follow");
  compose.hidden=!isFollowing;
 };
 const loadClubPosts=async(append=false)=>{
  if(postsLoading){if(!append)refreshQueued=true;return;}
  postsLoading=true;
  if(!append){postsOffset=0;renderedPostIds.clear();list.replaceChildren();empty.hidden=true;}
  if(more){more.disabled=true;if(!append)more.hidden=true;}
  try{
   const {data,error}=await client.from("community_posts")
    .select("id,author_vatra_id,body,created_at,media_kind,media_path,media_items")
    .eq("club_id",clubId).order("created_at",{ascending:false})
    .order("id",{ascending:false}).range(postsOffset,postsOffset+CLUB_PAGE_SIZE-1);
   if(error)throw error;
   const fetched=data||[],rows=[...fetched];
   postsOffset+=fetched.length;
   if(more)more.hidden=fetched.length<CLUB_PAGE_SIZE;

   const linkedId=new URLSearchParams(location.search).get("post");
   if(!append&&focusRequestedPost&&postPattern.test(linkedId||"")&&!rows.some(post=>post.id===linkedId)){
    const direct=await client.from("community_posts")
     .select("id,author_vatra_id,body,created_at,media_kind,media_path,media_items")
     .eq("club_id",clubId).eq("id",linkedId).maybeSingle();
    if(!direct.error&&direct.data)rows.unshift(direct.data);
   }
   const engagementPromise=window.VATRA_POST_INTERACTIONS?.prefetchEngagement(
    client,rows.map(post=>({...post,kind:"group"})))||Promise.resolve(new Map());
   const names=new Map();
   const ids=[...new Set(rows.map(p=>String(p.author_vatra_id)))];
   if(ids.length){
    try{
     const {data:people}=await (window.VATRA_PUBLIC_NAMES?.get(client,ids)||
      client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",ids));
     for(const member of people||[])names.set(String(member.vatra_id),member.display_name);
    }catch(_){}
   }
   const engagement=await engagementPromise;
   const batch=document.createDocumentFragment();
   for(const post of rows){
    if(renderedPostIds.has(post.id))continue;
    renderedPostIds.add(post.id);
    const id=String(post.author_vatra_id);
    const article=node("article","feed-post-card ui-club-post-card-001");
    article.dataset.postId=post.id;
    const head=node("div","feed-post-header ui-club-post-head-001");
    const profile=node("a","feed-post-name vatra-club-post-author-001",
     names.get(id)||t("Користувач VATRA","VATRA user"));
    profile.href=root+"id"+id;
    if(names.has(id))void window.VATRA_VERIFIED?.attach(client,profile,id);
    const time=node("time","feed-post-date vatra-club-post-date-001",
     window.VATRA_PRESENCE?.relative?.(post.created_at,locale.startsWith("en"))||
     new Intl.DateTimeFormat(locale,{day:"numeric",month:"short",year:"numeric"}).format(new Date(post.created_at)));
    time.dateTime=post.created_at;
    const meta=node("div","feed-post-meta-row ui-club-post-meta-row-001");
    meta.append(time);window.VATRA_POST_INTERACTIONS?.appendAudience(meta,null,true);
    head.append(profile,meta);
    article.append(head);
   if(post.body){
     const body=node("p","feed-post-body vatra-club-post-body-001",post.body);
     window.VATRA_POST_MEDIA?.linkifyHashtags(body);
     article.append(body);
    }
   if(post.media_items?.length||(post.media_kind&&post.media_path))void window.VATRA_POST_MEDIA?.mount(client,post,article);
    window.VATRA_POST_INTERACTIONS?.mount(client,{...post,kind:"group",club_id:clubId},article,{
     ownId,userId,engagement:engagement.get("group:"+post.id),
     onShared:()=>void loadClubPosts()
    });
    batch.append(article);
   }
   list.append(batch);
   if(focusRequestedPost){
    focusRequestedPost=false;
    const target=postPattern.test(linkedId||"")?
     [...list.querySelectorAll("[data-post-id]")].find(el=>el.dataset.postId===linkedId):null;
    if(target){
     target.classList.add("is-linked-post");
     requestAnimationFrame(()=>target.scrollIntoView({block:"center",behavior:"smooth"}));
    }
   }
   if(!list.querySelector(".feed-post-card"))show(empty,isFollowing?
    t("У спільноті ще немає дописів. Створіть перший!","No community posts yet. Start the conversation!"):
    t("Підпишіться на спільноту, щоб читати її дописи.","Follow to read community posts."));
  }catch(_){show(empty,t("Не вдалося завантажити публікації.","Could not load community posts."));}
  finally{
   postsLoading=false;if(more)more.disabled=false;
   if(refreshQueued){refreshQueued=false;void loadClubPosts(false);}
  }
 };
 if(more){
  more.addEventListener("click",()=>void loadClubPosts(true));
  if(typeof IntersectionObserver==="function"){
   const pager=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)&&!more.hidden&&!postsLoading)
     void loadClubPosts(true);
   },{rootMargin:"400px 0px"});
   pager.observe(more);
  }
 }
 follow.hidden=false;
 try{await refreshFollowing();}catch(_){show(empty,t("Не вдалося перевірити підписку.","Could not check your subscription."));follow.disabled=true;}
 follow.addEventListener("click",async()=>{
  if(busy)return;
  busy=true;follow.disabled=true;
  try{
   const {error}=isFollowing?
    await client.from("community_follows").delete().eq("club_id",clubId).eq("member_vatra_id",ownId):
    await client.from("community_follows").insert({club_id:clubId,member_vatra_id:ownId});
   if(error)throw error;
   await refreshFollowing();
   await loadClubPosts();
  }catch(_){show(empty,t("Не вдалося змінити підписку.","Could not update subscription."));}
  finally{follow.disabled=false;busy=false;}
 });
 compose.addEventListener("click",()=>{
  status.hidden=true;dialog.showModal();input.focus();
 });
 $("#club-compose-cancel").addEventListener("click",()=>dialog.close());
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  const body=input.value.trim(),files=picker?.getFiles()||[],save=$("#club-compose-save");
  if(!isFollowing||save.disabled)return;
  if((!body&&!files.length)||Array.from(body).length>2000){
   show(status,t("Додайте текст, фото або відео (до 2000 символів).",
    "Add text, a photo or a video (up to 2000 characters)."));return;
  }
  save.disabled=true;status.hidden=true;
  let uploaded=null;
  try{
   if(files.length)uploaded=await window.VATRA_POST_MEDIA.uploadGallery(client,ownId,files);
   const payload={club_id:clubId,author_vatra_id:ownId,body,media_items:uploaded||[]};
   if(guestOption.checked&&!files.length&&body)payload.guest_visible=true;
   const {error}=await client.from("community_posts").insert(payload);
   if(error)throw error;
   input.value="";guestOption.checked=false;picker?.reset();dialog.close();
   await loadClubPosts();
  }catch(error){
   if(uploaded)try{await window.VATRA_POST_MEDIA.removeGallery(client,uploaded);}catch(_){}
   show(status,error?.message||t("Не вдалося опублікувати допис.","Could not publish community post."));
  }finally{save.disabled=false;}
 });
 await loadClubPosts();
}

async function fetchPublicClub(client,number){


 const numeric=Number(number);
 if(window.VATRA_COMMUNITY_EDGE_ENABLED===true&&Number.isSafeInteger(numeric)&&numeric>0&&client.functions?.invoke){
  try{
   const response=await client.functions.invoke("public-community-directory",{
    body:{club_id:numeric}
   });
   if(!response.error&&response.data&&
      Object.prototype.hasOwnProperty.call(response.data,"data")){
    const row=response.data.data;
    if(row===null)return {data:null,error:null};
    if(row&&typeof row==="object"&&Number(row.club_id)===numeric&&
       typeof row.name==="string"&&row.name.length<=80&&
       (row.description===null||typeof row.description==="string")&&
       typeof row.created_at==="string")
     return {data:row,error:null};
   }
  }catch(_){}
 }
 return client.from("communities")
  .select("club_id,name,description,created_at").eq("club_id",number).maybeSingle();
}

async function openClub(client,ownId,userId){
 const query=new URLSearchParams(location.search);
 const number=query.get("club_id")||location.pathname.match(/\/club([1-9][0-9]{0,18})$/)?.[1]||"";
 const displayError=()=>{
  $("#club-heading").textContent=t("Спільноту не знайдено","Community not found");
  $("#club-public-id").textContent="";
  $("#club-description").textContent=t("Ця спільнота не існує або її видалено.",
   "This community does not exist or was deleted.");
 };
 if(!idPattern.test(number)){displayError();return;}
 const {data,error}=await fetchPublicClub(client,number);
 if(error){
  status("#club-status",t("Не вдалося завантажити спільноту.","Could not load the community."),"error");
  return;
 }
 if(!data){displayError();return;}
 $("#club-heading").textContent=data.name;
 const clubAvatar=$("#club-avatar");if(clubAvatar){clubAvatar.textContent=Array.from(String(data.name||"").trim())[0]?.toLocaleUpperCase()||"V";}
 $("#club-public-id").textContent="Club ID "+String(data.club_id);
 $("#club-description").textContent=data.description||
  t("Опису поки немає.","No description yet.");
 await setupClubSocial(client,String(data.club_id),ownId,userId);
 const linkedId=query.get("post");
 const suffix=postPattern.test(linkedId||"")?"?post="+encodeURIComponent(linkedId):"";
 const canonical=clubURL(String(data.club_id))+suffix;
 if(location.pathname!==new URL(canonical).pathname||location.search!==suffix||location.hash){
  history.replaceState(history.state,"",canonical);
 }
}
await openClub(client,ownId,userId);
});
})();
