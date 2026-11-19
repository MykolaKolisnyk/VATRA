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
    const profile=node("a","feed-post-name vt-club-post-author-001",
     names.get(id)||t("Учасник VATRA","VATRA member"));
    profile.href=root+"id"+id;
    if(names.has(id))void window.VATRA_VERIFIED?.attach(client,profile,id);
    const time=node("time","feed-post-date vt-club-post-date-001",new Intl.DateTimeFormat(locale,{
     day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
    }).format(new Date(post.created_at)));
    time.dateTime=post.created_at;
    const meta=node("div","feed-post-meta-row ui-club-post-meta-row-001");
    meta.append(time);window.VATRA_POST_INTERACTIONS?.appendAudience(meta,null,true);
    head.append(profile,meta);
    article.append(head);
   if(post.body){
     const body=node("p","feed-post-body vt-club-post-body-001",post.body);
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
   const {error}=await client.from("community_posts").insert({
    club_id:clubId,author_vatra_id:ownId,body,media_items:uploaded||[]
   });
   if(error)throw error;
   input.value="";picker?.reset();dialog.close();
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
 if(Number.isSafeInteger(numeric)&&numeric>0&&client.functions?.invoke){
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

async function setupCommunityBusiness(client,number,ownId,userId){
 const host=$("#club-business-tools");if(!host||!ownId)return;
 try{
  const flags=await client.from("communities").select("club_id,owner_id,business_enabled,name,description").eq("club_id",number).maybeSingle();
  if(flags.error||!flags.data)return;
  const isOwner=flags.data.owner_id===userId;
  const action=(label,fn)=>{const button=node("button","vt-club-business-enable-001",label);button.type="button";button.addEventListener("click",fn);return button;};
  if(!flags.data.business_enabled){
   if(!isOwner)return;
   const toggle=action(t("Увімкнути бізнес-інструменти","Enable business tools"),async()=>{
    if(!window.confirm(t("Увімкнути товари, бронювання, вакансії та звернення клієнтів для цієї спільноти?","Enable products, bookings, jobs and customer inquiries for this community?")))return;
    toggle.disabled=true;try{const r=await client.from("communities").update({business_enabled:true}).eq("club_id",number).select("club_id").single();if(r.error||!r.data)throw Error("enable");location.reload();}catch(_){status("#club-status",t("Не вдалося увімкнути бізнес-інструменти.","Could not enable business tools."),"error");toggle.disabled=false;}
   });
   host.append(node("h2","vt-club-business-heading-001",t("Бізнес-інструменти","Business tools")),node("p","vt-club-business-description-001",t("Ви можете оформити цю спільноту для свого бізнесу.","You can set up this community for your business.")),toggle);host.hidden=false;return;
  }
  const result=await client.from("business_companies").select("id,club_id,name,description,city,contact_email,website,logo_path,cover_path").eq("club_id",number).maybeSingle();
  if(result.error||!result.data)return;const company=result.data;
  const [membership,metrics]=await Promise.all([client.from("business_members").select("role,status").eq("company_id",company.id).eq("member_vatra_id",ownId).maybeSingle(),client.from("business_metrics").select("rating_count,rating_total").eq("company_id",company.id).maybeSingle()]);
  const role=membership.data?.status==="active"?membership.data.role:null,pending=membership.data?.status==="pending",manage=Boolean(role);
  // The public club is the only public identity; live linked data avoids a stale directory cache.
  $("#club-heading").textContent=flags.data.name;$("#club-description").textContent=flags.data.description||t("Опису поки немає.","No description yet.");document.title=flags.data.name+" · VATRA";
  const identity=$("#club-identity-extra");if(identity){
   if(company.city)identity.append(node("span","vt-club-business-city-001",company.city));
   const n=Number(metrics.data?.rating_count),total=Number(metrics.data?.rating_total);
   const rating=node("span","vt-club-business-rating-001",n>0&&Number.isFinite(total)?"★ "+new Intl.NumberFormat(locale,{minimumFractionDigits:1,maximumFractionDigits:1}).format(total/n)+" · "+n+" "+t("оцінок","ratings"):t("Оцінок ще немає","No ratings yet"));
   identity.append(rating);identity.hidden=false;
  }
  async function image(path,kind,selector){
   if(typeof path!=="string"||!path.startsWith(company.id+"/"+kind+"/"))return;
   try{const {data,error}=await client.storage.from("business-media").createSignedUrl(path,900);if(error||!data?.signedUrl)return;const target=$(selector);if(!target)return;const img=node("img","ui-club-business-"+kind+"-001");img.alt="";img.addEventListener("error",()=>{img.remove();target.classList.remove("has-business-media");},{once:true});img.src=data.signedUrl;target.append(img);target.classList.add("has-business-media");}catch(_){}
  }
  void image(company.logo_path,"logo","#club-avatar");void image(company.cover_path,"cover",".ui-club-cover-001");
  const tools=(section,mode)=>clubURL(number)+"?tools="+encodeURIComponent(section)+(mode?"&mode="+encodeURIComponent(mode):"");
  const selectedTool=new URLSearchParams(location.search).get("tools");
  const selectedMode=new URLSearchParams(location.search).get("mode");
  const allowedTools=["stores","booking","jobs","ratings","inbox",...((manage||pending)?["overview","team","analytics"]:[])];
  if(allowedTools.includes(selectedTool)){
   const panel=node("section","ui-club-business-tool-panel-001"),header=node("header","ui-club-business-tool-header-001"),back=node("a","vt-club-business-back-001",t("До публікацій спільноти","Back to community posts")),notice=node("p","vt-vatra-section-status-001"),content=node("div","ui-club-business-tool-content-001");
   back.href=clubURL(number);notice.id="club-business-status";notice.hidden=true;notice.setAttribute("role","status");header.append(back);panel.append(header,notice,content);
   const posts=$(".club-posts-section");if(posts){posts.before(panel);posts.hidden=true;}
   const resource=(tag,url)=>new Promise((resolve,reject)=>{const el=document.createElement(tag);if(tag==="link"){el.rel="stylesheet";el.href=new URL(url,root).href;}else{el.src=new URL(url,root).href;el.async=false;}el.addEventListener("load",resolve,{once:true});el.addEventListener("error",reject,{once:true});document.head.append(el);});
   try{
    document.body.classList.add("vatra-section-page","vatra-business-page");
    await Promise.all([resource("link","assets/css/core.css?rev=e54d9ba8c2638618fb5402931fcc95d0bc36b418"),resource("link","assets/css/business.css?rev=0ef7bc4573fb0a8b62579ab0d34f93941c52ac8e"),resource("script","assets/js/core.js?rev=6ae6273e38c53b06b9ccc78e6ebb03a627262090")]);
    await resource("script","assets/js/business.js?rev=76f3d3af1e18a64f209c6abbf491b6e401381fcf");
    if(!window.VATRA_BUSINESS_TOOLS||!window.VATRA_SECTION_CORE?.embedded)throw Error("tools");
    await window.VATRA_BUSINESS_TOOLS.mount(window.VATRA_SECTION_CORE.embedded({client,ownId,user:{id:userId},content,notice,t}));
   }catch(_){notice.hidden=false;notice.textContent=t("Не вдалося завантажити бізнес-інструмент. Оновіть сторінку.","Could not load business tools. Refresh the page.");}
  }
  const icons={stores:"M4 7h16l1 14H3L4 7Zm4 0V5a4 4 0 0 1 8 0v2",booking:"M4 5h16v16H4zM7 3v4m10-4v4M4 10h16m-12 4h3m3 0h3m-9 3h3",jobs:"M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 11v3h4v-3",inbox:"M4 4h16v13H9l-5 4zM8 9h8m-8 4h5",overview:"M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",ratings:"m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z",analytics:"M4 4v16h16M8 16v-5m5 5V7m5 9v-7",team:"M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 21v-2c0-3 3-5 6-5s6 2 6 5v2M16 5a3 3 0 0 1 0 6m2 3c2 1 3 3 3 5v2"};
  function menuRow(key,label,mode){const a=node("a","vt-club-business-link-001");a.href=tools(key,mode);if(selectedTool===key&&((selectedMode==="manage")===(mode==="manage")))a.setAttribute("aria-current","page");const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg"),path=document.createElementNS(ns,"path");svg.setAttribute("class","ui-club-business-icon-"+key);svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.8");svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");svg.setAttribute("aria-hidden","true");path.setAttribute("d",icons[key]);path.setAttribute("class","ui-club-business-path-"+key);svg.append(path);a.append(svg,node("span","vt-club-business-link-label-001",label));return a;}
  host.append(node("h2","vt-club-business-heading-001",t("Бізнес-інструменти","Business tools")));
  const publicMenu=node("nav","ui-club-business-menu-001");publicMenu.setAttribute("aria-label",t("Послуги спільноти","Community services"));
  publicMenu.append(menuRow("stores",t("Товари","Products")),menuRow("booking",t("Запис на послуги","Book services")),menuRow("jobs",t("Вакансії","Jobs")),menuRow("ratings",t("Оцінки клієнтів","Customer ratings")));
  if(!manage)publicMenu.append(menuRow("inbox",t("Написати спільноті","Message community")));
  host.append(publicMenu);
  if(manage||pending){const admin=node("nav","ui-club-business-management-001");admin.setAttribute("aria-label",t("Керування спільнотою","Community management"));admin.append(node("h3","vt-club-business-heading-001",t("Керування","Management")),menuRow("overview",pending?t("Запрошення до команди","Team invitation"):t("Налаштування й оформлення","Settings and branding"),"manage"));
   if(manage){if(["owner","admin","manager"].includes(role))admin.append(menuRow("inbox",t("Звернення клієнтів","Customer inquiries"),"manage"),menuRow("booking",t("Календар записів","Appointment calendar"),"manage"),menuRow("jobs",t("Керування вакансіями","Manage jobs"),"manage"));if(role==="owner")admin.append(menuRow("stores",t("Керування товарами","Manage products"),"manage"));if(["owner","admin"].includes(role))admin.append(menuRow("team",t("Команда","Team"),"manage"));admin.append(menuRow("analytics",t("Статистика","Statistics"),"manage"));}
   host.append(admin);
  }
  const contacts=$("#club-business-contacts");if(contacts){if(company.contact_email)contacts.append(node("p","vt-club-business-contact-001",company.contact_email));if(company.website){try{const u=new URL(company.website);if(["https:","http:"].includes(u.protocol)){const a=node("a","vt-club-business-contact-link-001",t("Вебсайт","Website"));a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";contacts.append(a);}}catch(_){}}contacts.hidden=!contacts.children.length;}
  host.hidden=false;
 }catch(_){/* A failed optional business lookup must not interrupt the regular club. */}
}
async function openClub(client,ownId,userId){
 const query=new URLSearchParams(location.search);
 const number=query.get("club_id")||location.pathname.match(/\/club([1-9][0-9]{0,18})$/)?.[1]||"";
 const displayError=()=>{
  $("#club-heading").textContent=t("Спільноту не знайдено","Community not found");
  $("#club-public-id").textContent="";
  $("#club-description").textContent=t("Ця спільнота не існує або її видалено.",
   "This community does not exist or was deleted.");
  document.title=t("Спільноту не знайдено · VATRA","Community not found · VATRA");
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
 document.title=data.name+" · VATRA";
 await Promise.all([setupClubSocial(client,String(data.club_id),ownId,userId),setupCommunityBusiness(client,String(data.club_id),ownId,userId)]);
 const linkedId=query.get("post");
 const params=new URLSearchParams();const activeTools=new URLSearchParams(location.search).get("tools"),activeMode=new URLSearchParams(location.search).get("mode");if(["overview","team","analytics","stores","booking","jobs","ratings","inbox"].includes(activeTools)){params.set("tools",activeTools);if(activeMode==="manage")params.set("mode","manage");}else if(postPattern.test(linkedId||""))params.set("post",linkedId);const suffix=params.size?"?"+params.toString():"";
 const canonical=clubURL(String(data.club_id))+suffix;
 if(location.pathname!==new URL(canonical).pathname||location.search!==suffix||location.hash){
  history.replaceState(history.state,"",canonical);
 }
}
await openClub(client,ownId,userId);
});
})();
