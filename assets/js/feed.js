/* VATRA Feed — authenticated text posts. No passwords, email, or auth UUIDs are displayed publicly. */
(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const PROJECT_URL="https://rjasunoawrxvetwadylh.supabase.co";
 const PUBLIC_KEY="sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-";
 const q=selector=>document.querySelector(selector);
 const english=document.documentElement.lang==="en";
 const locale=english?"en-US":"uk-UA";
 const t=(uk,en)=>{
  if(!english)return uk;
  const translated=window.VATRA_LANGUAGE?.translate(uk);
  return translated&&translated!==uk?translated:en;
 };
 const PAGE_SIZE=15,POST_LIMIT=2000;
 const localizeSocial=()=>{
  for(const element of document.querySelectorAll("[data-social-uk]"))
   element.textContent=english?element.dataset.socialEn:element.dataset.socialUk;
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
 };

 let client=null,user=null,vatraId=null,displayName="",loading=false,offset=0,searchTerm="";
 let visibleFeed=[],friends=new Set(),publicNames=new Map(),followedClubs=new Map();
 const posts=q("#feed-posts"),status=q("#feed-status"),more=q("#feed-more");
 const deleteDialog=q("#feed-delete-dialog"),deleteConfirm=q("#feed-delete-confirm");
 let pendingDelete=null;
 const validId=x=>/^[1-9][0-9]{0,18}$/.test(String(x));
 const home=new URL("./",location.href);
 function node(tag,cls,value){
  const item=document.createElement(tag);
  if(cls)item.className=cls;
  if(value!==undefined)item.textContent=value;
  return item;
 }
 function message(value,kind="error"){
  status.textContent=value;status.dataset.kind=kind;status.hidden=false;
 }
 function clearMessage(){status.hidden=true;status.textContent="";status.removeAttribute("data-kind");}
 function showErrorAtGate(text){
  const loader=q("#feed-loading");
  if(!loader)return;
  loader.dataset.loadingError="true";loader.setAttribute("role","alert");
  const label=loader.querySelector(".vatra-auth-loading-caption");
  if(label)label.textContent=text;
  if(loader.querySelector(".vatra-auth-loading-retry"))return;
  const retry=node("button","vatra-auth-loading-retry vt-feed-gate-retry-001",t("Повторити","Retry"));
  retry.type="button";retry.addEventListener("click",()=>location.reload());
  loader.querySelector(".vatra-auth-loading-content")?.append(retry);
 }
 function initials(name){
  const words=String(name||"").split(/\s+/).filter(Boolean);
  return (words.length>1?Array.from(words[0])[0]+Array.from(words[words.length-1])[0]:
   Array.from(words[0]||"V")[0]||"V").toLocaleUpperCase(locale);
 }
 function postedTime(value){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat(locale,{
   day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
  }).format(date);
 }
 const memberName=id=>publicNames.get(String(id))||
  (String(id)===vatraId?displayName:t("Учасник VATRA","VATRA member")+" · ID "+String(id));
 async function loadPublicNames(ids){
  const needed=[...new Set(ids.map(String).filter(validId))].filter(id=>!publicNames.has(id));
  if(!needed.length)return;
  try{
   const {data,error}=await client.from("vatra_public_profiles")
    .select("vatra_id,display_name").in("vatra_id",needed.slice(0,100));
   if(error)throw error;
   for(const profile of data||[])publicNames.set(String(profile.vatra_id),profile.display_name);
  }catch(_){/* Keep the ID visible when a member has not shared a public name. */}
 }
 async function loadSubscriptions(){
  friends=new Set(vatraId?[vatraId]:[]);
  followedClubs=new Map();
  if(!validId(vatraId))return;
  // Missing optional APIs in offline/browser mocks must never blank the Feed.
  let connectionQuery=Promise.resolve({data:[],error:null});
  let followedQuery=Promise.resolve({data:[],error:null});
  try{
   const query=client.from("vatra_friendships").select("requester_id,recipient_id,status");
   connectionQuery=query.or("requester_id.eq."+vatraId+",recipient_id.eq."+vatraId)
    .eq("status","accepted").limit(500);
  }catch(_){}
  try{
   const query=client.from("vatra_community_follows").select("club_id");
   followedQuery=query.eq("member_vatra_id",vatraId).limit(500);
  }catch(_){}
  const [connections,subscriptions]=await Promise.allSettled([connectionQuery,followedQuery]);
  if(connections.status==="fulfilled"&&!connections.value.error)
   for(const item of connections.value.data||[]){
    const other=String(item.requester_id)===vatraId?String(item.recipient_id):String(item.requester_id);
    if(validId(other))friends.add(other);
   }
  const ids=subscriptions.status==="fulfilled"&&!subscriptions.value.error?
   (subscriptions.value.data||[]).map(x=>String(x.club_id)).filter(validId):[];
  if(ids.length){
   try{
    const {data,error}=await client.from("communities").select("club_id,name").in("club_id",ids);
    if(!error)for(const group of data||[])followedClubs.set(String(group.club_id),group.name);
   }catch(_){}
  }
  await loadPublicNames([...friends]);
 }
 function card(post){
  const authorId=String(post.author_vatra_id);
  const mine=authorId===vatraId;
  const item=node("article","feed-post-card ui-feed-post-card-001");
  const head=node("div","feed-post-header ui-feed-post-header-001");
  const avatar=node("a","feed-avatar feed-post-avatar vt-feed-post-avatar-001 feed-post-profile-avatar",initials(memberName(authorId)));
  avatar.href=new URL("id"+authorId,home).href;
  avatar.setAttribute("aria-label",t("Відкрити профіль VATRA ID ","Open profile VATRA ID ")+authorId);
  const identity=node("div","feed-post-author ui-feed-post-author-001");
  const name=node("a","feed-post-name vt-feed-post-name-001 feed-post-profile-link",memberName(authorId));
  name.href=new URL("id"+authorId,home).href;
  const stamp=node("time","feed-post-date vt-feed-post-date-001",
   "VATRA ID "+authorId+" · "+postedTime(post.created_at));
  stamp.dateTime=post.created_at;identity.append(name,stamp);
  if(post.kind==="group"){
   const group=node("a","feed-post-community vt-feed-post-community-001",
    t("Спільнота: ","Community: ")+(followedClubs.get(String(post.club_id))||"Club ID "+post.club_id));
   group.href=new URL("club"+post.club_id,home).href;identity.append(group);
  }
  head.append(avatar,identity);
  if(mine){
   const remove=node("button","feed-post-delete vt-feed-post-delete-001",t("Видалити","Delete"));
   remove.type="button";
   remove.addEventListener("click",()=>{
    pendingDelete={id:post.id,kind:post.kind};
    deleteDialog?.showModal();q("#feed-delete-cancel")?.focus();
   });
   head.append(remove);
  }
  item.append(head,node("p","feed-post-body vt-feed-post-body-001",post.body));
  return item;
 }
 function renderPage(reset=false){
  if(reset){posts.replaceChildren();offset=0;}
  for(const post of visibleFeed.slice(offset,offset+PAGE_SIZE))posts.append(card(post));
  offset=Math.min(visibleFeed.length,offset+PAGE_SIZE);
  more.hidden=offset>=visibleFeed.length;
  q("#feed-empty").hidden=visibleFeed.length>0;
  const title=q(".feed-empty-title"),detail=q(".feed-empty-subtitle");
  if(title)title.textContent=searchTerm?t("Нічого не знайдено","No matches"):t("Тут поки тихо","It's quiet here");
  if(detail)detail.textContent=searchTerm?t("Спробуйте інший пошуковий запит.","Try another search.") :
   t("Додайте друзів або підпишіться на спільноту. Тут будуть ваші публікації та їхні дописи.",
    "Add friends or follow a community to see their posts alongside yours.");
 }
 async function loadPosts(reset=false){
  if(loading)return;
  if(!reset){renderPage();return;}
  loading=true;posts.setAttribute("aria-busy","true");more.disabled=true;
  try{
   await loadSubscriptions();
   // Filter member posts on the server, not after downloading every user's Feed.
   // Legacy test clients without an .in() method still work with the local filter.
   let personalQuery=client.from("feed_posts").select("id,author_vatra_id,body,created_at");
   if(typeof personalQuery.in==="function")
    personalQuery=personalQuery.in("author_vatra_id",[...friends]);
   const [people,groups]=await Promise.allSettled([
    personalQuery.order("created_at",{ascending:false}).range(0,199),
    followedClubs.size?client.from("vatra_community_posts")
     .select("id,club_id,author_vatra_id,body,created_at")
     .in("club_id",[...followedClubs.keys()])
     .order("created_at",{ascending:false}).range(0,199):Promise.resolve({data:[],error:null})
   ]);
   if(people.status==="rejected"||people.value.error)throw new Error("feed");
   const personal=(people.value.data||[])
    .filter(post=>friends.has(String(post.author_vatra_id))).map(post=>({...post,kind:"person"}));
   const communities=groups.status==="fulfilled"&&!groups.value.error?
    (groups.value.data||[]).map(post=>({...post,kind:"group"})):[];
   await loadPublicNames([...personal,...communities].map(x=>x.author_vatra_id));
   visibleFeed=[...personal,...communities].filter(post=>!searchTerm||
    post.body.toLocaleLowerCase(locale).includes(searchTerm.toLocaleLowerCase(locale)))
    .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||
     String(b.id).localeCompare(String(a.id)));
   renderPage(true);
  }catch(_){
   message(t("Не вдалося завантажити стрічку. Спробуйте ще раз.",
    "Could not load your Feed. Please retry."));
  }finally{loading=false;posts.setAttribute("aria-busy","false");more.disabled=false;}
 }
 async function loadStories(){
  const holder=q("#feed-friend-stories");
  if(!holder||!vatraId)return;
  try{
   const {data,error}=await client.from("vatra_stories")
    .select("author_vatra_id,body,theme,created_at,expires_at")
    .gt("expires_at",new Date().toISOString())
    .order("created_at",{ascending:false}).limit(60);
   if(error)throw error;
   const items=[],seen=new Set();
   for(const story of data||[]){
    const id=String(story.author_vatra_id);
    if(id===vatraId||!friends.has(id)||seen.has(id))continue;
    items.push(story);seen.add(id);
    if(items.length>=3)break;
   }
   await loadPublicNames(items.map(x=>x.author_vatra_id));
   holder.replaceChildren();
   if(!items.length)holder.append(node("p","feed-story-empty-note vt-feed-story-empty-note-001",
    t("Історії друзів з’являться тут.","Friends’ stories will appear here.")));
   for(const story of items){
    const id=String(story.author_vatra_id);
    const button=node("button","feed-story-preview ui-feed-story-live-preview-001");
    button.type="button";button.dataset.theme=String(story.theme||0);
    button.setAttribute("aria-label",memberName(id));
    button.append(node("span","vt-feed-story-live-body-001",story.body),
     node("span","vt-feed-story-live-name-001",memberName(id)));
    button.addEventListener("click",()=>{
     q("#feed-story-view-heading").textContent=memberName(id);
     q("#feed-story-view-body").textContent=story.body;
     q("#feed-story-view").dataset.theme=String(story.theme||0);
     q("#feed-story-view").showModal();
    });
    holder.append(button);
   }
  }catch(_){holder.replaceChildren(node("p","feed-story-empty-note vt-feed-story-unavailable-001",
   t("Історії зараз недоступні.","Stories are temporarily unavailable.")));}
 }
 function bindComposer(){
  const dialog=q("#feed-compose-dialog"),form=q("#feed-compose-form");
  const text=q("#feed-compose-text"),error=q("#feed-compose-error");
  const submit=q("#feed-compose-save"),counter=q("#feed-compose-counter");
  q("#feed-composer-avatar").textContent=initials(displayName);
  q("#feed-compose-open").addEventListener("click",()=>{
   error.hidden=true;dialog.showModal();text.focus();
  });
  q("#feed-compose-cancel").addEventListener("click",()=>dialog.close());
  text.addEventListener("input",()=>{counter.textContent=Array.from(text.value).length+" / 2000";});
  form.addEventListener("submit",async event=>{
   event.preventDefault();
   if(submit.disabled||!validId(vatraId))return;
   const body=text.value.trim();
   if(!body||Array.from(body).length>POST_LIMIT)return;
   submit.disabled=true;error.hidden=true;
   try{
    const {error:insertError}=await client.from("feed_posts").insert({
     author_id:user.id,author_vatra_id:vatraId,body
    });
    if(insertError)throw insertError;
    dialog.close();text.value="";counter.textContent="0 / 2000";
    await loadPosts(true);
    document.dispatchEvent(new Event("vatra:onboarding-progress"));
    message(t("Публікацію додано.","Post published."),"success");
   }catch(_){error.textContent=t("Не вдалося опублікувати допис.","Could not publish post.");error.hidden=false;}
   finally{submit.disabled=false;}
  });
  const storyDialog=q("#feed-story-dialog"),storyForm=q("#feed-story-form");
  const storyText=q("#feed-story-text"),storyError=q("#feed-story-error");
  const storySave=q("#feed-story-save");
  q("#feed-create-story").addEventListener("click",()=>{storyError.hidden=true;storyDialog.showModal();storyText.focus();});
  q("#feed-story-cancel").addEventListener("click",()=>storyDialog.close());
  q("#feed-story-view-close").addEventListener("click",()=>q("#feed-story-view").close());
  storyForm.addEventListener("submit",async event=>{
   event.preventDefault();
   if(storySave.disabled||!validId(vatraId))return;
   const body=storyText.value.trim();
   if(!body||Array.from(body).length>260)return;
   storySave.disabled=true;storyError.hidden=true;
   try{
    const {error:insertError}=await client.from("vatra_stories")
     .insert({author_vatra_id:vatraId,body,theme:Math.floor(Math.random()*5)});
    if(insertError)throw insertError;
    storyDialog.close();storyText.value="";
    message(t("Історію опубліковано на 24 години.","Story posted for 24 hours."),"success");
    await loadStories();
   }catch(_){storyError.textContent=t("Не вдалося додати історію.","Could not publish story.");storyError.hidden=false;}
   finally{storySave.disabled=false;}
  });
 }
 async function deletePost(event){
  event.preventDefault();
  if(!pendingDelete)return;
  const toDelete=pendingDelete;deleteConfirm.disabled=true;
  try{
   const table=toDelete.kind==="group"?"vatra_community_posts":"feed_posts";
   const {error}=await client.from(table).delete().eq("id",toDelete.id);
   if(error)throw error;
   deleteDialog.close();pendingDelete=null;
   await loadPosts(true);message(t("Публікацію видалено.","Post deleted."),"success");
  }catch(_){deleteDialog.close();pendingDelete=null;message(t("Не вдалося видалити.","Could not delete post."));}
  finally{deleteConfirm.disabled=false;}
 }
 async function init(){
  await window.VATRA_LANGUAGE?.ready;
  localizeSocial();
  if(!window.supabase?.createClient){
   showErrorAtGate(t("Не вдалося завантажити VATRA.","Could not load VATRA."));return;
  }
  try{
   client=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}
   });
   const {data,error}=await client.auth.getUser();
   if(error||!data?.user?.id){
    window.location.replace(new URL("./",location.href).href);return;
   }
   if(!data.user.email_confirmed_at){
    window.location.replace(new URL("./",location.href).href);return;
   }
   user=data.user;
   const metadata=user.user_metadata||{};
   const parts=[metadata.first_name,metadata.last_name].filter(v=>typeof v==="string"&&v.trim()).map(v=>v.trim());
   displayName=parts.join(" ")||String(metadata.full_name||"").trim()||t("Мій акаунт","My account");
   displayName=Array.from(displayName).slice(0,80).join("");
   const profile=await client.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();
   if(!profile.error&&profile.data?.vatra_id!=null)vatraId=String(profile.data.vatra_id);

   q("#feed-header-avatar").textContent=initials(displayName);
   q("#feed-menu-name").textContent=Array.from((typeof metadata.first_name==="string"&&metadata.first_name.trim()?metadata.first_name.trim():displayName.trim().split(/\s+/)[0])||"VATRA").slice(0,28).join("");
   const displayedId=vatraId?"VATRA ID "+vatraId:t("VATRA ID наразі недоступний","VATRA ID unavailable");

   q("#feed-header-id").textContent=displayedId;
   q("#feed-header-id").hidden=!vatraId;
   if(vatraId){
    for(const link of document.querySelectorAll('a[href="profile"],a[href$="/profile"]')){
     link.href=new URL("id"+vatraId,new URL("./",location.href)).href;
    }
   }
   // The loading overlay stays visible until the initial Feed query settles.
   // The sliding bar is indeterminate, not a fabricated percentage.
   const searchForm=q("#feed-search-form"),searchInput=q("#feed-search-input");
   searchTerm=(new URLSearchParams(location.search).get("q")||"").trim().slice(0,120);
   if(searchInput)searchInput.value=searchTerm;
   searchForm?.addEventListener("submit",event=>{
    event.preventDefault();
    searchTerm=searchInput.value.trim().slice(0,120);
    clearMessage();
    void loadPosts(true);
   });
   searchInput?.addEventListener("search",()=>{
    if(!searchInput.value&&searchTerm){searchTerm="";clearMessage();void loadPosts(true);}
   });
   const accountMenu=q(".feed-account-menu");
   document.addEventListener("click",event=>{
    if(accountMenu?.open&&!accountMenu.contains(event.target))accountMenu.open=false;
   });
   document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&accountMenu?.open)accountMenu.open=false;
   });
   more.addEventListener("click",()=>{clearMessage();void loadPosts(false);});
   bindComposer();
   deleteDialog?.addEventListener("close",()=>{pendingDelete=null;});
   q("#feed-delete-cancel")?.addEventListener("click",()=>deleteDialog.close());
   deleteConfirm?.addEventListener("click",deletePost);
   q("#feed-logout")?.addEventListener("click",async()=>{
    const button=q("#feed-logout");button.disabled=true;
    const {error}=await client.auth.signOut({scope:"local"});
    if(error){button.disabled=false;message(t("Не вдалося вийти. Повторіть спробу.","Could not sign out. Please retry."));return;}
    try{sessionStorage.setItem("vatra-just-signed-out","1");}catch(_){}
    location.replace(new URL("./",location.href).href);
   });
   await loadPosts(true);
   await loadStories();
   q("#feed-app").hidden=false;
   q("#feed-loading").hidden=true;
   document.body.dataset.feedReady="true";
   document.body.dataset.authReady="true";
   // The onboarding controller waits for a verified member and visible Feed.
   document.dispatchEvent(new CustomEvent("vatra:feed-ready",{detail:{id:vatraId}}));
  }catch(_){
   if(!q("#feed-app").hidden){
    message(t("Не вдалося завантажити стрічку. Оновіть сторінку.",
     "Could not load the feed. Refresh the page."));
   }else showErrorAtGate(t("Не вдалося підключитися до VATRA.","Could not connect to VATRA."));
  }
 }
 init();
})();
