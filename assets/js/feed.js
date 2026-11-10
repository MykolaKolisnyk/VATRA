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
 let client=null,user=null,vatraId=null,displayName="",loading=false,offset=0,searchTerm="";
 const posts=q("#feed-posts"),status=q("#feed-status"),more=q("#feed-more");
 const composer=q("#feed-post-text"),counter=q("#feed-post-counter"),submit=q("#feed-submit");
 const deleteDialog=q("#feed-delete-dialog"),deleteConfirm=q("#feed-delete-confirm");
 let pendingDelete=null;
 function node(tag,cls,value){
  const item=document.createElement(tag);
  if(cls)item.className=cls;
  if(value!==undefined)item.textContent=value;
  return item;
 }
 function message(value,kind="error"){
  status.textContent=value;
  status.dataset.kind=kind;
  status.hidden=false;
 }
 function clearMessage(){status.hidden=true;status.textContent="";status.removeAttribute("data-kind");}
 function showErrorAtGate(text){
  const label=q(".vatra-auth-loading-caption");
  if(label)label.textContent=text;
  const retry=node("button","feed-gate-retry vt-feed-gate-retry-001",t("Повторити","Retry"));
  retry.type="button";
  retry.addEventListener("click",()=>location.reload());
  q("#feed-loading")?.append(retry);
 }
 function initials(name){
  const words=name.split(/\s+/).filter(Boolean);
  return (words.length>1?Array.from(words[0])[0]+Array.from(words[words.length-1])[0]:Array.from(name)[0]||"V").toLocaleUpperCase(locale);
 }
 function postedTime(value){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat(locale,{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
 }
 function card(post){
  const mine=vatraId!==null&&String(post.author_vatra_id)===vatraId;
  const item=node("article","feed-post-card ui-feed-post-card-001");
  const head=node("div","feed-post-header ui-feed-post-header-001");
  const avatar=node("span","feed-avatar feed-post-avatar vt-feed-post-avatar-001",mine?initials(displayName):"V");
  avatar.setAttribute("aria-hidden","true");
  const identity=node("div","feed-post-author ui-feed-post-author-001");
  const postAuthorId=String(post.author_vatra_id);
  const name=node(/^[1-9][0-9]{0,18}$/.test(postAuthorId)?"a":"strong",
   "feed-post-name vt-feed-post-name-001 feed-post-profile-link",
   mine?displayName:t("Учасник VATRA","VATRA member"));
  if(name.tagName==="A")name.href=new URL("id"+postAuthorId,new URL("./",location.href)).href;
  const stamp=node("time","feed-post-date vt-feed-post-date-001",
   "VATRA ID "+String(post.author_vatra_id)+" · "+postedTime(post.created_at));
  stamp.dateTime=post.created_at;
  identity.append(name,stamp);
  head.append(avatar,identity);
  if(mine){
   const remove=node("button","feed-post-delete vt-feed-post-delete-001",t("Видалити","Delete"));
   remove.type="button";
   remove.setAttribute("aria-label",t("Видалити мою публікацію","Delete my post"));
   remove.addEventListener("click",()=>{
    pendingDelete=post.id;
    deleteDialog?.showModal();
    deleteDialog?.querySelector("#feed-delete-cancel")?.focus();
   });
   head.append(remove);
  }
  const body=node("p","feed-post-body vt-feed-post-body-001",post.body);
  item.append(head,body);
  return item;
 }
 function updateCounter(){
  const length=Array.from(composer.value).length;
  counter.textContent=length+" / "+POST_LIMIT;
  counter.classList.toggle("is-at-limit",length>=POST_LIMIT);
  submit.disabled=length===0||length>POST_LIMIT||!vatraId;
 }
 async function loadPosts(reset=false){
  if(loading)return;
  loading=true;
  posts.setAttribute("aria-busy","true");
  more.disabled=true;
  const start=reset?0:offset;
  try{
   let request=client.from("feed_posts").select("id,author_vatra_id,body,created_at");
   if(searchTerm)request=request.ilike("body","%"+searchTerm.replace(/[\\%_]/g,"\\$&")+"%");
   const {data,error}=await request.order("created_at",{ascending:false})
    .order("id",{ascending:false}).range(start,start+PAGE_SIZE-1);
   if(error)throw error;
   if(reset){posts.replaceChildren();offset=0;}
   for(const post of data||[])posts.append(card(post));
   offset=start+(data?.length||0);
   more.hidden=(data?.length||0)<PAGE_SIZE;
   q("#feed-empty").hidden=offset!==0;
   const emptyTitle=q(".feed-empty-title"),emptyText=q(".feed-empty-subtitle");
   if(emptyTitle)emptyTitle.textContent=searchTerm?t("Нічого не знайдено","No matches"):t("Тут поки тихо","It's quiet here");
   if(emptyText)emptyText.textContent=searchTerm?t("Спробуйте інший пошуковий запит.","Try another search.") :
    t("Створіть першу публікацію у VATRA.","Create the first post on VATRA.");
  }catch(_){
   message(t("Не вдалося завантажити публікації. Перевірте підключення й спробуйте ще раз.",
    "Could not load posts. Check your connection and try again."));
   more.hidden=false;
  }finally{
   loading=false;posts.setAttribute("aria-busy","false");more.disabled=false;
  }
 }
 async function createPost(event){
  event.preventDefault();
  if(!user||!vatraId)return;
  const body=composer.value.trim();
  if(!body||Array.from(body).length>POST_LIMIT){
   message(t("Публікація має містити від 1 до 2000 символів.","A post must contain 1–2000 characters."));return;
  }
  submit.disabled=true;clearMessage();
  try{
   const {error}=await client.from("feed_posts").insert({
    author_id:user.id,author_vatra_id:vatraId,body
   });
   if(error)throw error;
   composer.value="";updateCounter();
   // A new post should become visible even if a prior feed filter was active.
   if(searchTerm){searchTerm="";q("#feed-search-input").value="";}
   message(t("Публікацію додано до стрічки.","Your post was added to the feed."),"success");
   await loadPosts(true);
  }catch(_){
   message(t("Не вдалося опублікувати допис. Повторіть спробу.",
    "Could not publish your post. Please try again."));
  }finally{updateCounter();}
 }
 async function deletePost(event){
  event.preventDefault();
  if(!pendingDelete)return;
  const id=pendingDelete;
  deleteConfirm.disabled=true;
  try{
   const {error}=await client.from("feed_posts").delete().eq("id",id);
   if(error)throw error;
   deleteDialog.close();
   pendingDelete=null;
   message(t("Публікацію видалено.","Post deleted."),"success");
   await loadPosts(true);
  }catch(_){
   deleteDialog.close();
   pendingDelete=null;
   message(t("Не вдалося видалити публікацію. Повторіть спробу.","Could not delete the post. Please try again."));
  }finally{deleteConfirm.disabled=false;}
 }
 async function init(){
  await window.VATRA_LANGUAGE?.ready;
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
   q("#feed-my-name").textContent=displayName;
   q("#feed-my-avatar").textContent=initials(displayName);
   q("#feed-header-avatar").textContent=initials(displayName);
   q("#feed-menu-name").textContent=displayName;
   const displayedId=vatraId?"VATRA ID "+vatraId:t("VATRA ID наразі недоступний","VATRA ID unavailable");
   q("#feed-my-id").textContent=displayedId;
   q("#feed-header-id").textContent=displayedId;
   q("#feed-header-id").hidden=!vatraId;
   if(vatraId){
    for(const link of document.querySelectorAll('a[href="profile"]')){
     link.href=new URL("id"+vatraId,new URL("./",location.href)).href;
    }
   }
   q("#feed-app").hidden=false;
   q("#feed-loading").hidden=true;
   document.body.dataset.feedReady="true";
   document.body.dataset.authReady="true";
   composer.addEventListener("input",updateCounter);
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
   q("#feed-post-form").addEventListener("submit",createPost);
   more.addEventListener("click",()=>{clearMessage();void loadPosts(false);});
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
   updateCounter();
   if(!vatraId){
    message(t("VATRA ID для цього акаунта поки недоступний. Створення публікацій тимчасово вимкнене.",
     "VATRA ID is unavailable for this account. Posting is temporarily disabled."));
   }
   await loadPosts(true);
  }catch(_){
   if(!q("#feed-app").hidden){
    message(t("Не вдалося завантажити стрічку. Оновіть сторінку.",
     "Could not load the feed. Refresh the page."));
   }else showErrorAtGate(t("Не вдалося підключитися до VATRA.","Could not connect to VATRA."));
  }
 }
 init();
})();
