/* VATRA community directory and immutable numeric club URLs. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://rjasunoawrxvetwadylh.supabase.co";
const PUBLIC_KEY="sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-";
const root=new URL("../../",document.currentScript.src).href;
const english=document.documentElement.lang==="en";
const t=(uk,en)=>english?en:uk;
const $=selector=>document.querySelector(selector);
const idPattern=/^[1-9][0-9]{0,18}$/;
const clubURL=id=>root+"club"+id;
const node=(tag,cls,text)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
};
const status=(selector,text,kind)=>{
 const el=$(selector);
 if(!el)return;
 el.textContent=text;
 el.hidden=false;
 if(kind)el.dataset.kind=kind;
};
const gateError=message=>{
 const loader=$("#community-loading");
 if(!loader)return;
 loader.dataset.loadingError="true";
 loader.setAttribute("role","alert");
 const caption=loader.querySelector(".vatra-auth-loading-caption");
 if(caption)caption.textContent=message;
 if(loader.querySelector(".vatra-auth-loading-retry"))return;
 const retry=node("button","vatra-auth-loading-retry vt-community-retry-001",t("Повторити","Retry"));
 retry.type="button";
 retry.addEventListener("click",()=>location.reload());
 loader.querySelector(".vatra-auth-loading-content")?.append(retry);
};
async function loadHeaderPhoto(client,id,email){
 if(!idPattern.test(String(id||"")))return;
 try{
  const {data,error}=await client.from("vatra_profile_media")
   .select("avatar_path").eq("vatra_id",id).maybeSingle();
  if(error)return;
  window.VATRA_AVATAR?.fromPath(client,email,id,data?.avatar_path||null);
  if(typeof data?.avatar_path!=="string"||!data.avatar_path.startsWith(id+"/avatar/"))return;
  const image=client.storage.from("vatra-avatars").getPublicUrl(data.avatar_path)?.data?.publicUrl;
  if(!image)return;
  const url=new URL(image);
  if(url.protocol!=="https:"||url.hostname!=="rjasunoawrxvetwadylh.supabase.co")return;
  const target=$("#feed-header-avatar");
  if(target){target.style.backgroundImage="url("+JSON.stringify(image)+")";
   target.classList.add("has-photo");target.textContent="";}
 }catch(_){/* Initials remain visible if media is unavailable. */}
}
async function start(){
 await window.VATRA_LANGUAGE?.ready;
 const mode=document.body.dataset.page;
 for(const element of document.querySelectorAll("[data-community-uk]")){
  element.textContent=english?element.dataset.communityEn:element.dataset.communityUk;
 }
 for(const element of document.querySelectorAll("[data-social-uk]")){
  element.textContent=english?element.dataset.socialEn:element.dataset.socialUk;
 }
 const brand=document.querySelector(".feed-header-brand");
 if(brand)brand.setAttribute("aria-label",english?"VATRA — Feed":"VATRA — Стрічка");
 for(const input of document.querySelectorAll("[data-shell-placeholder-uk]")){
    input.placeholder=english?input.dataset.shellPlaceholderEn:input.dataset.shellPlaceholderUk;
   }
   for(const control of document.querySelectorAll("[data-shell-aria-uk]")){
    const title=english?control.dataset.shellAriaEn:control.dataset.shellAriaUk;
    control.setAttribute("aria-label",title);
    control.removeAttribute("title");
   }
   for(const pair of [
    [".ui-shell-header-notifications-001","Сповіщення — незабаром","Notifications — coming soon"],
    [".ui-shell-header-music-001","Музика — незабаром","Music — coming soon"]]){
    const control=document.querySelector(pair[0]);
    if(control){
     const title=english?pair[2]:pair[1];
     control.setAttribute("aria-label",title);
     control.removeAttribute("title");
    }
   }
   for(const link of document.querySelectorAll(".social-top-link")){
  const label=link.querySelector("[data-social-uk]");
  if(label){
   link.setAttribute("aria-label",label.textContent);
   link.removeAttribute("title");
  }
 }
 if(english){
  const name=$("#community-name"),description=$("#community-description");
  if(name)name.placeholder="For example, Ukrainian music";
  if(description)description.placeholder="What is your community about?";
 }
 if(!window.supabase?.createClient){
  gateError(t("Не вдалося відкрити VATRA","Could not open VATRA"));
  return;
 }
 try{
  const client=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
   auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}
  });
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user?.id||!data.user.email_confirmed_at){
   location.replace(root);return;
  }
  const user=data.user,meta=user.user_metadata||{};
  const ownName=[meta.first_name,meta.last_name].filter(x=>typeof x==="string"&&x.trim())
    .map(x=>x.trim()).join(" ")||String(meta.full_name||"").trim()||
    t("Учасник VATRA","VATRA member");
  const cleanName=Array.from(ownName).slice(0,100).join("");
  $("#feed-menu-name").textContent=Array.from((typeof meta.first_name==="string"&&meta.first_name.trim()?meta.first_name.trim():cleanName.trim().split(/\s+/)[0])||"VATRA").slice(0,28).join("");
  const nameParts=cleanName.split(/\s+/).filter(Boolean);
  const first=(Array.from(nameParts[0]||"V")[0]||"V");
  const last=nameParts.length>1?(Array.from(nameParts[nameParts.length-1])[0]||""):"";
  const avatar=(first+last).toLocaleUpperCase(english?"en-US":"uk-UA");
  $("#feed-header-avatar").textContent=avatar;
  window.VATRA_AVATAR?.applyRemembered($("#feed-header-avatar"),user.email);
  const {data:account}=await client.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();
  const ownId=account?.vatra_id==null?null:String(account.vatra_id);
  if(ownId)void window.VATRA_PRESENCE?.start(client,ownId,meta.gender);
   if(ownId)void loadHeaderPhoto(client,ownId,user.email);
  $("#feed-header-id").textContent=ownId?"VATRA ID "+ownId:"";
  for(const link of document.querySelectorAll('a[href="profile"],a[href$="/profile"]')){
   if(ownId&&idPattern.test(ownId))link.href=root+"id"+ownId;
  }
  const form=$("#feed-search-form");
  form?.addEventListener("submit",event=>{
   event.preventDefault();
   const value=$("#feed-search-input").value.trim().slice(0,120);
   location.href=root+"feed"+(value?"?q="+encodeURIComponent(value):"");
  });
  const menu=$(".feed-account-menu");
  document.addEventListener("click",event=>{if(menu?.open&&!menu.contains(event.target))menu.open=false;});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&menu?.open)menu.open=false;});
  $("#feed-logout")?.addEventListener("click",async()=>{
   const button=$("#feed-logout");button.disabled=true;
   const {error:signOutError}=await client.auth.signOut({scope:"local"});
   if(signOutError){button.disabled=false;return;}
   try{sessionStorage.setItem("vatra-just-signed-out","1");}catch(_){}
   location.replace(root);
  });
  // Show the ready page only after its first list or community data request.
  if(mode==="club")await openClub(client,ownId,user.id);
  else await openDirectory(client);
  $("#community-app").hidden=false;
  $("#community-loading").hidden=true;
  document.body.dataset.authReady="true";
  document.body.dataset.feedReady="true";
   document.body.classList.remove("vatra-shell-pending");
 }catch(_){
  gateError(t("Не вдалося відкрити сторінку. Оновіть її.","Could not open this page. Please refresh."));
 }
}
async function openDirectory(client){
 document.title=t("Спільноти · VATRA","Communities · VATRA");
 const form=$("#community-create-form"),button=$("#community-create-submit");
 const panel=$("#community-create-panel"),toggle=$("#community-create-toggle");
 toggle?.addEventListener("click",()=>{
  if(!panel)return;
  const opening=panel.hidden;
  panel.hidden=!opening;
  toggle.setAttribute("aria-expanded",String(opening));
  if(opening)$("#community-name")?.focus();
  else toggle.focus();
 });
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(button.disabled)return;
  const name=$("#community-name").value.trim();
  const description=$("#community-description").value.trim();
  if(Array.from(name).length<3||Array.from(name).length>80||Array.from(description).length>1200){
   status("#community-create-status",t("Назва: 3–80 символів. Опис: до 1200 символів.",
    "Name: 3–80 characters. Description: up to 1200 characters."),"error");
   return;
  }
  button.disabled=true;
  status("#community-create-status",t("Створення спільноти…","Creating community…"));
  try{
   // PostgreSQL GENERATED ALWAYS AS IDENTITY assigns the ID; the browser never picks it.
   const {data,error}=await client.from("communities").insert({name,description})
    .select("club_id").single();
   if(error||!data?.club_id)throw error||new Error("missing club ID");
   const number=String(data.club_id);
   if(!idPattern.test(number))throw new Error("unexpected club ID");
   location.assign(clubURL(number));
  }catch(_){
   status("#community-create-status",t("Не вдалося створити спільноту. Повторіть спробу.",
    "Could not create the community. Please retry."),"error");
   button.disabled=false;
  }
 });
 const list=$("#community-list");
 const term=(new URLSearchParams(location.search).get("q")||"").trim().slice(0,120);
 const search=$("#feed-search-input");
 if(search&&term)search.value=term;
 try{
  let request=client.from("communities").select("club_id,name,description,created_at");
  if(term)request=request.ilike("name","%"+term.replace(/[\\%_]/g,"\\$&")+"%");
  const {data,error}=await request.order("created_at",{ascending:false})
   .order("club_id",{ascending:false}).limit(100);
  if(error)throw error;
  list.replaceChildren();
  for(const club of data||[]){
   const number=String(club.club_id);
   if(!idPattern.test(number))continue;
   const card=node("a","ui-community-card-001");
   card.href=clubURL(number);
   const head=node("div","ui-community-card-head-001");
   head.append(node("strong","vt-community-card-name-001",club.name),
    node("span","vt-community-card-id-001","Club ID "+number));
   card.append(head,node("p","vt-community-card-description-001",
    club.description||t("Без опису","No description")));
   list.append(card);
  }
  status("#community-list-status",(data||[]).length===0?
   (term?t("За цим запитом спільнот не знайдено.","No communities match this search."):
    t("Спільнот поки немає. Створіть першу!","No communities yet. Create the first one!")):"");
 }catch(_){
  status("#community-list-status",t("Не вдалося завантажити список спільнот.",
   "Could not load communities."),"error");
 }finally{list.setAttribute("aria-busy","false");}
}

async function setupClubSocial(client,clubId,ownId,userId){
 const follow=$("#club-follow"),compose=$("#club-compose-open"),list=$("#club-posts");
 const empty=$("#club-posts-empty"),dialog=$("#club-compose-dialog");
 const form=$("#club-compose-form"),input=$("#club-compose-text"),status=$("#club-compose-error");
 if(!follow||!compose||!list||!ownId||!idPattern.test(ownId))return;
 let isFollowing=false,busy=false;
 const show=(el,text)=>{el.textContent=text;el.hidden=!text;};
 const picker=window.VATRA_POST_MEDIA?.bindPicker({
  input:"#club-compose-media",choose:"#club-compose-media-choose",
  clear:"#club-compose-media-remove",preview:"#club-compose-media-preview",
  onError:text=>show(status,text)
 });
 const refreshFollowing=async()=>{
  const {data,error}=await client.from("vatra_community_follows")
   .select("club_id").eq("club_id",clubId).eq("member_vatra_id",ownId).maybeSingle();
  if(error)throw error;
  isFollowing=!!data;
  follow.textContent=isFollowing?t("Відписатися","Unfollow"):t("Підписатися","Follow");
  compose.hidden=!isFollowing;
 };
 const loadClubPosts=async()=>{
  list.replaceChildren();empty.hidden=true;
  try{
   const {data,error}=await client.from("vatra_community_posts")
    .select("id,author_vatra_id,body,created_at,media_kind,media_path")
    .eq("club_id",clubId).order("created_at",{ascending:false}).limit(50);
   if(error)throw error;
   const rows=data||[];
   const names=new Map();
   const ids=[...new Set(rows.map(p=>String(p.author_vatra_id)))];
   if(ids.length){
    try{
     const {data:people}=await client.from("vatra_public_profiles")
      .select("vatra_id,display_name").in("vatra_id",ids);
     for(const member of people||[])names.set(String(member.vatra_id),member.display_name);
    }catch(_){}
   }
   for(const post of rows){
    const id=String(post.author_vatra_id);
    const article=node("article","feed-post-card ui-club-post-card-001");
    article.dataset.postId=post.id;
    const head=node("div","feed-post-header ui-club-post-head-001");
    const profile=node("a","feed-post-name vt-club-post-author-001",
     names.get(id)||t("Учасник VATRA","VATRA member")+" · ID "+id);
    profile.href=root+"id"+id;
    const time=node("time","feed-post-date vt-club-post-date-001",new Intl.DateTimeFormat(english?"en-US":"uk-UA",{
     day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
    }).format(new Date(post.created_at)));
    time.dateTime=post.created_at;
    head.append(profile,time);
    article.append(head);
   if(post.body){
     const body=node("p","feed-post-body vt-club-post-body-001",post.body);
     window.VATRA_POST_MEDIA?.linkifyHashtags(body);
     article.append(body);
    }
   if(post.media_kind&&post.media_path)void window.VATRA_POST_MEDIA?.mount(client,post,article);
    window.VATRA_POST_INTERACTIONS?.mount(client,{...post,kind:"group",club_id:clubId},article,{
     ownId,userId,onShared:()=>void loadClubPosts()
    });
    list.append(article);
   }
   if(!rows.length)show(empty,isFollowing?
    t("У спільноті ще немає дописів. Створіть перший!","No community posts yet. Start the conversation!"):
    t("Підпишіться на спільноту, щоб читати її дописи.","Follow to read community posts."));
  }catch(_){show(empty,t("Не вдалося завантажити публікації.","Could not load community posts."));}
 };
 follow.hidden=false;
 try{await refreshFollowing();}catch(_){show(empty,t("Не вдалося перевірити підписку.","Could not check your subscription."));follow.disabled=true;}
 follow.addEventListener("click",async()=>{
  if(busy)return;
  busy=true;follow.disabled=true;
  try{
   const {error}=isFollowing?
    await client.from("vatra_community_follows").delete().eq("club_id",clubId).eq("member_vatra_id",ownId):
    await client.from("vatra_community_follows").insert({club_id:clubId,member_vatra_id:ownId});
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
  const body=input.value.trim(),file=picker?.getFile(),save=$("#club-compose-save");
  if(!isFollowing||save.disabled)return;
  if((!body&&!file)||Array.from(body).length>2000){
   show(status,t("Додайте текст, фото або відео (до 2000 символів).",
    "Add text, a photo or a video (up to 2000 characters)."));return;
  }
  save.disabled=true;status.hidden=true;
  let uploaded=null;
  try{
   if(file)uploaded=await window.VATRA_POST_MEDIA.upload(client,ownId,file);
   const {error}=await client.from("vatra_community_posts").insert({
    club_id:clubId,author_vatra_id:ownId,body,...(uploaded||{})
   });
   if(error)throw error;
   input.value="";picker?.reset();dialog.close();
   await loadClubPosts();
  }catch(error){
   if(uploaded)try{await window.VATRA_POST_MEDIA.remove(client,uploaded);}catch(_){}
   show(status,error?.message||t("Не вдалося опублікувати допис.","Could not publish community post."));
  }finally{save.disabled=false;}
 });
 await loadClubPosts();
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
 const {data,error}=await client.from("communities")
  .select("club_id,name,description,created_at").eq("club_id",number).maybeSingle();
 if(error){
  status("#club-status",t("Не вдалося завантажити спільноту.","Could not load the community."),"error");
  return;
 }
 if(!data){displayError();return;}
 $("#club-heading").textContent=data.name;
 $("#club-public-id").textContent="Club ID "+String(data.club_id);
 $("#club-description").textContent=data.description||
  t("Опису поки немає.","No description yet.");
 document.title=data.name+" · VATRA";
 await setupClubSocial(client,String(data.club_id),ownId,userId);
 const canonical=clubURL(String(data.club_id));
 if(location.pathname!==new URL(canonical).pathname||location.search||location.hash){
  history.replaceState(history.state,"",canonical);
 }
}
void start();
})();