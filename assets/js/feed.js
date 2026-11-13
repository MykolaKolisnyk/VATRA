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
 const PAGE_SIZE=12,POST_LIMIT=2000;
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

 let client=null,user=null,vatraId=null,displayName="",loading=false,refreshQueued=false,offset=0,searchTerm="",feedFilter="all";
 let visibleFeed=[],friends=new Set(),publicNames=new Map(),followedClubs=new Map();
 const posts=q("#feed-posts"),status=q("#feed-status"),more=q("#feed-more");
 const filterSummary=q("#feed-filter-summary");
 let subscriptionsLoadedAt=0;
 const describeFilter=()=>{
  if(!filterSummary)return;
  filterSummary.textContent=feedFilter==="friends"?
   t("Дописи ваших друзів","Posts from your friends"):
   feedFilter==="communities"?t("Дописи ваших спільнот","Posts from your communities"):
   t("Усі доступні публікації","All accessible posts");
 };
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
   day:"numeric",month:"short",year:"numeric"
  }).format(date);
 }
 const mediaAvatars=new Map(),avatarChecks=new Map(),avatarStates=new Map();
 const avatarURL=id=>{
  const path=mediaAvatars.get(String(id));
  if(typeof path!=="string"||!path.startsWith(String(id)+"/avatar/"))return null;
  try{
   const value=client.storage.from("vatra-avatars").getPublicUrl(path)?.data?.publicUrl;
   if(!value)return null;
   const url=new URL(value);
   return url.protocol==="https:"&&url.hostname==="rjasunoawrxvetwadylh.supabase.co"?value:null;
  }catch(_){return null;}
 };
 const applyAvatar=(element,id)=>{
  if(!element)return;
  const key=String(id),state=avatarStates.get(key),url=state?null:avatarURL(id);
  // Inactive account states always override previously cached uploaded photos.
  element.dataset.vatraAvatarUrl=url||"";
  if(!url){
   window.VATRA_AVATAR?.fallback(element,state||"default");
   return;
  }
  window.VATRA_AVATAR?.clearFallback(element);
  let check=avatarChecks.get(url);
  if(!check){
   check=new Promise(resolve=>{
    const image=new Image();
    image.onload=()=>resolve(image.naturalWidth>0);
    image.onerror=()=>resolve(false);
    image.src=url;
   });
   avatarChecks.set(url,check);
  }
  void check.then(valid=>{
   if(!element.isConnected||element.dataset.vatraAvatarUrl!==url)return;
   if(!valid){
    // Storage may have been cleaned outside VATRA. Do not leave a blank circle.
    if(avatarURL(key)===url)mediaAvatars.delete(key);
    window.VATRA_AVATAR?.fallback(element,"default");
    if(key===vatraId)window.VATRA_AVATAR?.cache(user?.email,null);
    return;
   }
   window.VATRA_AVATAR?.clearFallback(element);
   element.style.backgroundImage="url("+JSON.stringify(url)+")";
   element.classList.add("has-photo");
   element.textContent="";
  });
 };
 async function loadAvatars(ids){
  const lookup=[...new Set(ids.map(String).filter(validId))].slice(0,100);
  if(!lookup.length)return;
  try{
   const states=await window.VATRA_AVATAR?.states(client,lookup)||new Map();
   for(const id of lookup){
    avatarStates.delete(id);
    if(states.has(id))avatarStates.set(id,states.get(id));
   }
   const {data,error}=await client.from("vatra_profile_media")
    .select("vatra_id,avatar_path").in("vatra_id",lookup);
   if(error)throw error;
   // A removed avatar path must invalidate the previously cached path as well.
   for(const id of lookup)mediaAvatars.delete(id);
   for(const row of data||[])if(row.avatar_path&&!avatarStates.has(String(row.vatra_id)))
    mediaAvatars.set(String(row.vatra_id),row.avatar_path);
   if(vatraId&&lookup.includes(vatraId)){
    const mine=(data||[]).find(row=>String(row.vatra_id)===vatraId);
    window.VATRA_AVATAR?.fromPath(client,user?.email,vatraId,mine?.avatar_path||null);
   }
   applyAvatar(q("#feed-header-avatar"),vatraId);
   applyAvatar(q("#feed-composer-avatar"),vatraId);
  }catch(_){/* Use initials if media lookup is unavailable. */}
 }
 const memberName=id=>{
  const state=avatarStates.get(String(id));
  if(state==="deleted")return t("Акаунт видалено","Account deleted");
  if(state==="blocked")return t("Акаунт заблоковано","Account blocked");
  return publicNames.get(String(id))||
   (String(id)===vatraId?displayName:t("Учасник VATRA","VATRA member"));
 };
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
  // Names and avatars are fetched only for the 12 visible posts or stories.
 }
 function card(post){
  const authorId=String(post.author_vatra_id);
  const mine=authorId===vatraId;
  const item=node("article","feed-post-card ui-feed-post-card-001");
  item.dataset.postId=post.id;
  const head=node("div","feed-post-header ui-feed-post-header-001");
  const avatar=node("a","feed-avatar feed-post-avatar vt-feed-post-avatar-001 feed-post-profile-avatar",initials(memberName(authorId)));
  avatar.href=new URL("id"+authorId,home).href;
  applyAvatar(avatar,authorId);
  avatar.setAttribute("aria-label",t("Відкрити профіль VATRA ID ","Open profile VATRA ID ")+authorId);
  const identity=node("div","feed-post-author ui-feed-post-author-001");
  const name=node("a","feed-post-name vt-feed-post-name-001 feed-post-profile-link",memberName(authorId));
  name.href=new URL("id"+authorId,home).href;
  const stamp=node("time","feed-post-date vt-feed-post-date-001",postedTime(post.created_at));
  stamp.dateTime=post.created_at;
  const meta=node("div","feed-post-meta-row ui-feed-post-meta-row-001");
  meta.append(stamp);window.VATRA_POST_INTERACTIONS?.appendAudience(meta,post.visibility,post.kind==="group");
  identity.append(name,meta);
  if(post.kind==="group"){
   const group=node("a","feed-post-community vt-feed-post-community-001",
    t("Спільнота: ","Community: ")+(followedClubs.get(String(post.club_id))||t("Спільнота VATRA","VATRA community")));
   group.href=new URL("club"+post.club_id,home).href;identity.append(group);
  }
  head.append(avatar,identity);
  if(mine){
   window.VATRA_POST_INTERACTIONS?.addOwnerMenu(head,{
    source:"feed",
    onDelete:()=>{
     pendingDelete={id:post.id,kind:post.kind,media_kind:post.media_kind,media_path:post.media_path,media_items:post.media_items};
     deleteDialog?.showModal();q("#feed-delete-cancel")?.focus();
    },
    onArchive:post.kind==="person"?async()=>{
     const {data,error}=await client.from("feed_posts")
      .update({archived_at:new Date().toISOString()}).eq("id",post.id)
      .eq("author_vatra_id",vatraId).select("id").maybeSingle();
     if(error||!data){message(t("Не вдалося архівувати публікацію.","Could not archive post."));return;}
     void loadPosts(true);
    }:null
   });
  }
  item.append(head);
   if(post.body){
     const body=node("p","feed-post-body vt-feed-post-body-001",post.body);
     window.VATRA_POST_MEDIA?.linkifyHashtags(body);
     item.append(body);
     window.VATRA_POST_MEDIA?.collapsibleBody(body);
    }
   if(post.media_items?.length||(post.media_kind&&post.media_path))void window.VATRA_POST_MEDIA?.mount(client,post,item);
   if(post.shared_post_id)void window.VATRA_POST_INTERACTIONS?.renderSharedPreview(client,post,item);
   window.VATRA_POST_INTERACTIONS?.mount(client,post,item,{
    ownId:vatraId,userId:user?.id,onShared:()=>void loadPosts(true)
   });
  return item;
 }
 // Unified VATRA search: names, member status, communities and all accessible posts.
 const globalResults=node("section","vatra-global-search-results ui-vatra-global-search-results-001");
 globalResults.id="vatra-global-search-results";globalResults.hidden=true;
 globalResults.setAttribute("aria-label",t("Результати пошуку VATRA","VATRA search results"));
 const searchHeading=node("h2","vt-vatra-global-search-heading-001",t("Знайдено у VATRA","Found on VATRA"));
 const searchGroups=node("div","vatra-global-search-groups ui-vatra-global-search-groups-001");
 globalResults.append(searchHeading,searchGroups);
 posts.parentElement?.insertBefore(globalResults,posts);
 let globalSearchTicket=0;
 const drawGlobalGroup=(title,records,makeCard)=>{
  if(!records.length)return;
  const section=node("section","vatra-global-search-group ui-vatra-global-search-group-001");
  section.append(node("h3","vt-vatra-global-search-section-title-001",title));
  const list=node("div","vatra-global-search-list ui-vatra-global-search-list-001");
  for(const record of records)list.append(makeCard(record));
  section.append(list);searchGroups.append(section);
 };
 async function loadGlobalResults(){
  const phrase=searchTerm.trim(),ticket=++globalSearchTicket;
  if(!phrase){globalResults.hidden=true;searchGroups.replaceChildren();return;}
  globalResults.hidden=false;searchGroups.replaceChildren();
  searchHeading.textContent=t("Пошук у VATRA","Search VATRA")+": "+phrase;
  const escaped=phrase.replace(/[\\%_]/g,character=>String.fromCharCode(92)+character);
  // Separate structured queries avoid composing raw PostgREST OR syntax from member input.
  const [membersByName,membersByStatus,clubsByName,clubsByDescription]=await Promise.allSettled([
   client.from("vatra_public_profiles").select("vatra_id,display_name,status_text")
    .ilike("display_name","%"+escaped+"%").limit(8),
   client.from("vatra_public_profiles").select("vatra_id,display_name,status_text")
    .ilike("status_text","%"+escaped+"%").limit(8),
   client.from("communities").select("club_id,name,description").ilike("name","%"+escaped+"%").limit(8),
   client.from("communities").select("club_id,name,description").ilike("description","%"+escaped+"%").limit(8)
  ]);
  if(ticket!==globalSearchTicket||!globalResults.isConnected)return;
  const successful=r=>r.status==="fulfilled"&&!r.value.error?r.value.data||[]:[];
  const people=[...new Map([...successful(membersByName),...successful(membersByStatus)]
   .map(p=>[String(p.vatra_id),p])).values()].slice(0,8);
  const clubs=[...new Map([...successful(clubsByName),...successful(clubsByDescription)]
   .map(p=>[String(p.club_id),p])).values()].slice(0,8);
  await loadAvatars(people.map(p=>p.vatra_id));
  if(ticket!==globalSearchTicket||!globalResults.isConnected)return;
  searchGroups.replaceChildren();
  drawGlobalGroup(t("Люди","People"),people,person=>{
   const link=node("a","vatra-global-search-card ui-vatra-global-search-person-001");
   const id=String(person.vatra_id);link.href=new URL("id"+id,home).href;
   const avatar=node("span","vatra-global-search-avatar ui-vatra-global-search-avatar-001");
   applyAvatar(avatar,id);
   const info=node("span","vatra-global-search-info ui-vatra-global-search-info-001");
   info.append(node("strong","vt-vatra-global-search-name-001",avatarStates.get(id)?memberName(id):person.display_name||t("Учасник VATRA","VATRA member")));
   if(person.status_text)info.append(node("small","vt-vatra-global-search-description-001",person.status_text.slice(0,100)));
   link.append(avatar,info);return link;
  });
  drawGlobalGroup(t("Спільноти","Communities"),clubs,club=>{
   const link=node("a","vatra-global-search-card ui-vatra-global-search-club-001");
   link.href=new URL("club"+club.club_id,home).href;
   const icon=node("span","vatra-global-search-community-avatar ui-vatra-global-search-community-icon-001");
   icon.setAttribute("aria-hidden","true");
   const symbol=document.createElementNS("http://www.w3.org/2000/svg","svg");
   symbol.setAttribute("viewBox","0 0 24 24");symbol.setAttribute("width","22");
   symbol.setAttribute("height","22");symbol.setAttribute("fill","none");
   symbol.setAttribute("stroke","currentColor");symbol.setAttribute("stroke-width","1.85");
   symbol.setAttribute("stroke-linecap","round");symbol.setAttribute("stroke-linejoin","round");
   const path=document.createElementNS("http://www.w3.org/2000/svg","path");
   path.setAttribute("d","M15.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM4 20v-1a8 8 0 0 1 16 0v1M5.5 7a2.5 2.5 0 0 0 0 5m13-5a2.5 2.5 0 0 1 0 5");
   symbol.append(path);icon.append(symbol);
   const info=node("span","vatra-global-search-info ui-vatra-global-search-club-info-001");
   info.append(node("strong","vt-vatra-global-search-club-name-001",club.name));
   if(club.description)info.append(node("small","vt-vatra-global-search-club-description-001",club.description.slice(0,100)));
   link.append(icon,info);return link;
  });
  if(!people.length&&!clubs.length)globalResults.hidden=true;
 }
 // Independent, fixed-size Supabase cursors keep the two chronological feeds merged.
 // Only the next 12 posts are materialized; no eager 200+200 post download.
 let sourceState=null,renderedIds=new Set();
 const makeSourceState=()=>({
  person:{kind:"person",offset:0,done:!searchTerm&&feedFilter==="communities",queue:[]},
  group:{kind:"group",offset:0,done:!searchTerm&&feedFilter==="friends",queue:[]}
 });
 const personFields="id,author_vatra_id,body,created_at,visibility,media_kind,media_path,media_items,shared_post_kind,shared_post_id";
 const clubFields="id,club_id,author_vatra_id,body,created_at,media_kind,media_path,media_items";
 const comparePosts=(a,b)=>
  Date.parse(b.created_at)-Date.parse(a.created_at)||String(b.id).localeCompare(String(a.id));
 const displayEmpty=()=>{
  q("#feed-empty").hidden=visibleFeed.length>0;
  const title=q(".feed-empty-title"),detail=q(".feed-empty-subtitle");
  if(title)title.textContent=searchTerm?t("Нічого не знайдено","No matches"):
   feedFilter==="friends"?t("Друзі поки не публікували дописів","No posts from friends yet"):
   feedFilter==="communities"?t("У спільнотах поки немає дописів","No community posts yet"):
   t("Поки немає публікацій","No posts yet");
  if(detail)detail.textContent=searchTerm?t("Спробуйте інший пошуковий запит.","Try another search."):
   feedFilter==="friends"?t("Друзі ще не опублікували дописів.","Your friends have not posted yet."):
   feedFilter==="communities"?t("У ваших спільнотах поки немає дописів.","No posts from your communities yet."):
   t("Додайте друзів або підпишіться на спільноту. Тут будуть ваші публікації та їхні дописи.",
    "Add friends or follow a community to see their posts alongside yours.");
 };
 async function fillSource(source){
  let attempts=0;
  while(!source.done&&!source.queue.length&&attempts++<12){
   const isPerson=source.kind==="person";
   const personIds=isPerson?[...friends].filter(id=>feedFilter!=="friends"||id!==vatraId):[];
   if(isPerson&&!personIds.length&&!searchTerm){source.done=true;return;}
   if(!isPerson&&!followedClubs.size&&!searchTerm){source.done=true;return;}
   let query=client.from(isPerson?"feed_posts":"vatra_community_posts")
    .select(isPerson?personFields:clubFields);
   if(isPerson&&!searchTerm&&typeof query.in==="function"){
    query=query.in("author_vatra_id",personIds);
   }
   if(isPerson&&typeof query.is==="function")query=query.is("archived_at",null);
   if(!isPerson&&!searchTerm&&typeof query.in==="function")
    query=query.in("club_id",[...followedClubs.keys()]);
   if(searchTerm&&typeof query.ilike==="function")
    query=query.ilike("body","%"+searchTerm.replace(/[\%_]/g,"\\$&")+"%");
   const {data,error}=await query.order("created_at",{ascending:false})
    .order("id",{ascending:false}).range(source.offset,source.offset+PAGE_SIZE-1);
   if(error){if(isPerson)throw error;source.done=true;return;}
   const raw=data||[];
   source.offset+=raw.length;
   if(raw.length<PAGE_SIZE)source.done=true;
   const rows=raw.filter(post=>searchTerm?true:isPerson?
    personIds.includes(String(post.author_vatra_id)):
    followedClubs.has(String(post.club_id))
   ).filter(post=>!searchTerm||
    String(post.body||"").toLocaleLowerCase(locale).includes(searchTerm.toLocaleLowerCase(locale)))
    .map(post=>({...post,kind:source.kind}));
   source.queue.push(...rows);
  }
 }
 async function takePage(){
  const result=[];
  for(let index=0;index<PAGE_SIZE;index++){
   await Promise.all([fillSource(sourceState.person),fillSource(sourceState.group)]);
   const p=sourceState.person.queue[0],g=sourceState.group.queue[0];
   if(!p&&!g)break;
   const chosen=!p?sourceState.group:!g?sourceState.person:
    comparePosts(p,g)<=0?sourceState.person:sourceState.group;
   const next=chosen.queue.shift();
   const key=next.kind+":"+next.id;
   if(renderedIds.has(key)){index--;continue;}
   renderedIds.add(key);result.push(next);
  }
  return result;
 }
 async function loadPosts(reset=false){
  if(loading){if(reset)refreshQueued=true;return;}
  loading=true;posts.setAttribute("aria-busy","true");more.disabled=true;
  if(reset){
   posts.replaceChildren();visibleFeed=[];renderedIds=new Set();
   sourceState=makeSourceState();
   more.hidden=true;
  }
  try{
   // Category switches reuse the same verified social connections briefly.
   // Avoid extra friendship/community queries on every rapid filter click.
   if(!subscriptionsLoadedAt||Date.now()-subscriptionsLoadedAt>60000){
    await loadSubscriptions();subscriptionsLoadedAt=Date.now();
   }
   if(!sourceState)sourceState=makeSourceState();
   const page=await takePage();
   // Open a shared permalink without downloading hundreds of unrelated posts.
   const requested=reset?new URLSearchParams(location.search).get("post"):null;
   if(feedFilter==="all"&&requested&&/^[a-f0-9-]{36}$/i.test(requested)&&!searchTerm&&
    !page.some(p=>p.id===requested)){
    const found=await Promise.allSettled([
     client.from("feed_posts").select(personFields).eq("id",requested).maybeSingle(),
     client.from("vatra_community_posts").select(clubFields).eq("id",requested).maybeSingle()
    ]);
    const person=found[0].status==="fulfilled"&&!found[0].value.error?found[0].value.data:null;
    const group=found[1].status==="fulfilled"&&!found[1].value.error?found[1].value.data:null;
    const direct=person?{...person,kind:"person"}:group?{...group,kind:"group"}:null;
    if(direct){
     page.unshift(direct);
     renderedIds.add(direct.kind+":"+direct.id);
    }
   }
   await Promise.all([
    loadPublicNames(page.map(p=>p.author_vatra_id)),
    loadAvatars(page.map(p=>p.author_vatra_id))
   ]);
   for(const item of page){visibleFeed.push(item);posts.append(card(item));}
   const outstanding=[sourceState.person,sourceState.group].some(x=>x.queue.length||!x.done);
   more.hidden=!outstanding;
   displayEmpty();
   if(requested){
    const target=[...posts.querySelectorAll("[data-post-id]")].find(el=>el.dataset.postId===requested);
    if(target){target.classList.add("is-linked-post");target.scrollIntoView({block:"center",behavior:"auto"});}
   }
  }catch(_){
   if(reset)posts.replaceChildren();
   message(t("Не вдалося завантажити стрічку. Спробуйте ще раз.",
    "Could not load your Feed. Please retry."));
  }finally{
   loading=false;posts.setAttribute("aria-busy","false");more.disabled=false;
   if(refreshQueued){refreshQueued=false;void loadPosts(true);}
  }
 }
 const storyTrack=q(".feed-stories-track"),storiesNext=q("#feed-stories-next");
 function updateStoryArrow(){
  if(!storyTrack||!storiesNext)return;
  storiesNext.hidden=storyTrack.scrollWidth-storyTrack.clientWidth-storyTrack.scrollLeft<8;
 }
 if(storyTrack&&storiesNext){
  storiesNext.addEventListener("click",()=>storyTrack.scrollBy({
   left:Math.max(120,storyTrack.clientWidth*.72),behavior:"smooth"
  }));
  storyTrack.addEventListener("scroll",updateStoryArrow,{passive:true});
  window.addEventListener("resize",updateStoryArrow,{passive:true});
 }
 async function loadStories(){
  const holder=q("#feed-friend-stories");
  if(!holder||!vatraId)return;
  try{
   const {data,error}=await client.from("vatra_stories")
    .select("author_vatra_id,body,theme,created_at,expires_at,media_kind,media_path")
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
   await loadAvatars(items.map(x=>x.author_vatra_id));
   holder.replaceChildren();
   q(".feed-stories")?.classList.toggle("is-empty",items.length===0);
   for(const story of items){
    const id=String(story.author_vatra_id);
    const button=node("button","feed-story-preview ui-feed-story-live-preview-001");
    button.type="button";button.dataset.theme=String(story.theme||0);
    button.setAttribute("aria-label",memberName(id));
    const storyAvatar=node("span","feed-story-author-avatar vt-feed-story-author-avatar-001",initials(memberName(id)));
    storyAvatar.setAttribute("aria-hidden","true");
    applyAvatar(storyAvatar,id);
    button.append(storyAvatar);
    if(story.media_kind&&story.media_path){
     const cover=node("span","feed-story-cover ui-feed-story-cover-001");
     button.append(cover);
     // Always use a private short-lived signed URL, never a public bucket URL.
     holder.append(button);
     void window.VATRA_POST_MEDIA?.renderStory(client,story,cover,true);
    }else holder.append(button);
    const body=String(story.body||"").trim();
    button.append(node("span","vt-feed-story-live-body-001",body||
     (story.media_kind==="video"?t("Відео","Video"):t("Фото","Photo"))),
     node("span","vt-feed-story-live-name-001",memberName(id)));
    button.addEventListener("click",()=>{
     q("#feed-story-view-heading").textContent=memberName(id);
     const text=q("#feed-story-view-body");
     text.textContent=body;text.hidden=!body;
     q("#feed-story-view").dataset.theme=String(story.theme||0);
     q("#feed-story-view").showModal();
     void window.VATRA_POST_MEDIA?.renderStory(client,story,q("#feed-story-view-media"));
    });
   }
  }catch(_){holder.replaceChildren();q(".feed-stories")?.classList.add("is-empty");}
  finally{requestAnimationFrame(updateStoryArrow);}
 }
 function bindComposer(){
  const dialog=q("#feed-compose-dialog"),form=q("#feed-compose-form");
  const text=q("#feed-compose-text"),error=q("#feed-compose-error");
  const visibility=q("#feed-compose-visibility");
  const submit=q("#feed-compose-save"),counter=q("#feed-compose-counter");
  const showError=value=>{error.textContent=value;error.hidden=!value;};
  const picker=window.VATRA_POST_MEDIA?.bindGalleryPicker({
   input:"#feed-compose-media",choose:"#feed-compose-media-choose",
   clear:"#feed-compose-media-remove",preview:"#feed-compose-media-preview",
   onError:showError,onChange:()=>composerUI?.sync()
  });
  const composerUI=window.VATRA_COMPOSER_UI?.bind({prefix:"feed",ownerId:vatraId,getFile:()=>picker?.getFile()});
  q("#feed-composer-avatar").textContent=initials(displayName);
  const open=()=>{showError("");dialog.showModal();composerUI?.open();};
  q("#feed-compose-open").addEventListener("click",open);
  q("#feed-quick-media")?.addEventListener("click",()=>{
   open();q("#feed-compose-media-choose")?.click();
  });
  q("#feed-compose-cancel").addEventListener("click",()=>dialog.close());
  text.addEventListener("input",()=>{counter.textContent=Array.from(text.value).length+" / 2000";});
  form.addEventListener("submit",async event=>{
   event.preventDefault();
   if(submit.disabled||!validId(vatraId))return;
   const body=text.value.trim(),files=picker?.getFiles()||[];
   if((!body&&!files.length)||Array.from(body).length>POST_LIMIT){
    showError(t("Додайте текст, фото або відео.","Add text, a photo or a video."));return;
   }
   submit.disabled=true;showError("");
   let uploaded=null;
   try{
    if(files.length)uploaded=await window.VATRA_POST_MEDIA.uploadGallery(client,vatraId,files);
    const {error:insertError}=await client.from("feed_posts").insert({
     author_id:user.id,author_vatra_id:vatraId,body,
     visibility:["public","friends","only_me"].includes(visibility?.value)?visibility.value:"public",
     media_items:uploaded||[]
    });
    if(insertError)throw insertError;
    dialog.close();text.value="";counter.textContent="0 / 2000";picker?.reset();composerUI?.reset();
    await loadPosts(true);
    message(t("Публікацію додано.","Post published."),"success");
   }catch(ex){
    if(uploaded)try{await window.VATRA_POST_MEDIA.removeGallery(client,uploaded);}catch(_){}
    showError(ex?.message||t("Не вдалося опублікувати допис.","Could not publish post."));
   }finally{submit.disabled=false;}
  });
  const storyDialog=q("#feed-story-dialog"),storyForm=q("#feed-story-form");
  const storyText=q("#feed-story-text"),storyError=q("#feed-story-error");
  const storySave=q("#feed-story-save");
  const storyPicker=window.VATRA_POST_MEDIA?.bindPicker({
   input:"#feed-story-media",choose:"#feed-story-media-choose",
   clear:"#feed-story-media-remove",preview:"#feed-story-media-preview",
   onError:value=>{storyError.textContent=value;storyError.hidden=!value;}
  });
  q("#feed-create-story").addEventListener("click",()=>{
   storyError.hidden=true;storyDialog.showModal();storyText.focus();
  });
  const resetStoryDraft=()=>{
   storyText.value="";storyPicker?.reset();storyError.hidden=true;
  };
  q("#feed-story-cancel").addEventListener("click",()=>{
   resetStoryDraft();storyDialog.close();
  });
  storyDialog.addEventListener("close",()=>{
   // The close event is queued asynchronously: never erase media added
   // after a user quickly opens the editor again.
   if(!storyDialog.open)resetStoryDraft();
  });
  const storyViewer=q("#feed-story-view");
  q("#feed-story-view-close").addEventListener("click",()=>storyViewer.close());
  storyViewer.addEventListener("close",()=>{
   const video=q("#feed-story-view-media video");
   if(video)video.pause();
  });
  storyForm.addEventListener("submit",async event=>{
   event.preventDefault();
   if(storySave.disabled||!validId(vatraId))return;
   const body=storyText.value.trim(),file=storyPicker?.getFile();
   if((!body&&!file)||Array.from(body).length>260){
    storyError.textContent=t("Додайте текст, фото або відео (до 260 символів).",
     "Add text, a photo or a video (up to 260 characters).");
    storyError.hidden=false;return;
   }
   storySave.disabled=true;storyError.hidden=true;
   let uploaded=null;
   try{
    if(file)uploaded=await window.VATRA_POST_MEDIA.uploadStory(client,vatraId,file);
    const {error:insertError}=await client.from("vatra_stories")
     .insert({author_vatra_id:vatraId,body,theme:Math.floor(Math.random()*5),...(uploaded||{})});
    if(insertError)throw insertError;
    resetStoryDraft();storyDialog.close();
    message(t("Історію опубліковано на 24 години.","Story posted for 24 hours."),"success");
    await loadStories();
   }catch(error){
    if(uploaded)try{await window.VATRA_POST_MEDIA.remove(client,uploaded);}catch(_){}
    storyError.textContent=error?.message||t("Не вдалося додати історію.","Could not publish story.");
    storyError.hidden=false;
   }finally{storySave.disabled=false;}
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
   if(toDelete.media_path)void window.VATRA_POST_MEDIA?.remove(client,toDelete).catch(()=>{});
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

   const headerName=Array.from((typeof metadata.first_name==="string"&&metadata.first_name.trim()?metadata.first_name.trim():displayName.trim().split(/\s+/)[0])||"VATRA").slice(0,28).join("");
   window.VATRA_AVATAR?.setHeader({email:user.email,name:headerName,initials:initials(displayName),id:vatraId});
   window.VATRA_AVATAR?.applyRemembered(q("#feed-header-avatar"),user.email);
   const displayedId=vatraId?"VATRA ID "+vatraId:t("VATRA ID наразі недоступний","VATRA ID unavailable");

   q("#feed-header-id").textContent=displayedId;
   q("#feed-header-id").hidden=!vatraId;
    if(vatraId){
    void loadAvatars([vatraId]);
    void window.VATRA_PRESENCE?.start(client,vatraId,metadata.gender);
    window.VATRA_NOTIFICATIONS?.start(client,vatraId);
   }
   if(vatraId){
    for(const link of document.querySelectorAll('a[href="profile"],a[href$="/profile"]')){
     link.href=new URL("id"+vatraId,new URL("./",location.href)).href;
    }
   }
   const searchForm=q("#feed-search-form"),searchInput=q("#feed-search-input");
   searchTerm=(new URLSearchParams(location.search).get("q")||"").trim().slice(0,120);
   if(searchInput)searchInput.value=searchTerm;
   searchForm?.addEventListener("submit",event=>{
    event.preventDefault();
    searchTerm=searchInput.value.trim().slice(0,120);
    clearMessage();
    void Promise.allSettled([loadGlobalResults(),loadPosts(true)]);
   });
   searchInput?.addEventListener("search",()=>{
    if(!searchInput.value&&searchTerm){
     searchTerm="";clearMessage();void Promise.allSettled([loadGlobalResults(),loadPosts(true)]);
    }
   });
   const accountMenu=q(".feed-account-menu");
   document.addEventListener("click",event=>{
    if(accountMenu?.open&&!accountMenu.contains(event.target))accountMenu.open=false;
   });
   document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&accountMenu?.open)accountMenu.open=false;
   });
   more.addEventListener("click",()=>{clearMessage();void loadPosts(false);});
   // The visible button remains a keyboard-accessible fallback. Load one
   // additional server page when it approaches the viewport, never all posts.
   if(typeof IntersectionObserver==="function"){
    const postPager=new IntersectionObserver(entries=>{
     if(entries.some(entry=>entry.isIntersecting)&&
      !more.hidden&&!more.disabled&&!loading&&document.visibilityState!=="hidden"){
      void loadPosts(false);
     }
    },{rootMargin:"0px 0px 260px 0px"});
    postPager.observe(more);
   }
   // A filter is a new source query, not a cosmetic visibility toggle.
   describeFilter();
   const filterToggle=q("#feed-filter-toggle"),filterOptions=q("#feed-filter-options");
   const closeFilter=()=>{
    if(!filterToggle||!filterOptions)return;
    filterOptions.hidden=true;filterToggle.setAttribute("aria-expanded","false");
    filterToggle.setAttribute("aria-label",t("Відкрити фільтр стрічки","Open feed filter"));
    q(".feed-filter-row")?.setAttribute("data-open","false");
   };
   if(filterToggle&&filterOptions){
    filterToggle.addEventListener("click",()=>{
     const next=filterOptions.hidden;
     filterOptions.hidden=!next;
     filterToggle.setAttribute("aria-expanded",String(next));
     filterToggle.setAttribute("aria-label",next?
      t("Закрити фільтр стрічки","Close feed filter"):
      t("Відкрити фільтр стрічки","Open feed filter"));
     q(".feed-filter-row")?.setAttribute("data-open",String(next));
    });
    // Close after the target's click handler. Closing on pointerdown moves
    // the Feed post cards before pointerup and can swallow a delete/comment click.
    document.addEventListener("click",event=>{
     if(!filterOptions.hidden&&!q(".feed-filter-row")?.contains(event.target))closeFilter();
    });
    document.addEventListener("keydown",event=>{
     if(event.key==="Escape"&&!filterOptions.hidden){closeFilter();filterToggle.focus();}
    });
    closeFilter();
   }
   for(const button of document.querySelectorAll("[data-feed-filter]")){
    button.addEventListener("click",()=>{
     const next=button.dataset.feedFilter;
     if(!["all","friends","communities"].includes(next)||next===feedFilter)return;
     feedFilter=next;
     describeFilter();
     for(const item of document.querySelectorAll("[data-feed-filter]"))
      item.setAttribute("aria-pressed",String(item.dataset.feedFilter===feedFilter));
     clearMessage();void loadPosts(true);
    });
   }
   bindComposer();
   deleteDialog?.addEventListener("close",()=>{pendingDelete=null;});
   q("#feed-delete-cancel")?.addEventListener("click",()=>deleteDialog.close());
   deleteConfirm?.addEventListener("click",deletePost);
   q("#feed-logout")?.addEventListener("click",async()=>{
    const button=q("#feed-logout");button.disabled=true;
    const {error}=await client.auth.signOut({scope:"local"});
    if(error){button.disabled=false;message(t("Не вдалося вийти. Повторіть спробу.","Could not sign out. Please retry."));return;}
    try{sessionStorage.setItem("vatra-just-signed-out","1");}catch(_){}
    window.VATRA_AVATAR?.clearHeader();
    location.replace(new URL("./",location.href).href);
   });
   // The verified shell is ready: render it immediately instead of waiting
   // for several independent social queries. The post area has lightweight
   // skeleton cards until the first response settles.
   posts.replaceChildren();
   for(let i=0;i<2;i++){
    const card=node("div","feed-post-placeholder ui-feed-post-placeholder-00"+(i+1));
    card.setAttribute("aria-hidden","true");
    card.append(node("span","feed-post-placeholder-head ui-feed-post-placeholder-head-00"+(i+1)),
     node("span","feed-post-placeholder-line ui-feed-post-placeholder-line-00"+(i+1)),
     node("span","feed-post-placeholder-line short ui-feed-post-placeholder-short-00"+(i+1)));
    posts.append(card);
   }
   q("#feed-app").hidden=false;
   q("#feed-loading").hidden=true;
   document.body.dataset.feedReady="true";
   document.body.dataset.authReady="true";
   document.body.classList.remove("vatra-shell-pending");
   void Promise.allSettled([loadPosts(true),loadStories(),loadGlobalResults()]);
  }catch(_){
   if(document.body.dataset.authReady==="true"){
    message(t("Не вдалося завантажити стрічку. Оновіть сторінку.",
     "Could not load the feed. Refresh the page."));
   }else showErrorAtGate(t("Не вдалося підключитися до VATRA.","Could not connect to VATRA."));
  }
 }
 init();
})();
