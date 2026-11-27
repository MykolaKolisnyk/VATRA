(()=>{"use strict";if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript.src);
const t=(uk,en)=>document.documentElement.lang==="en"?en:(window.VATRA_LANGUAGE?.translate?.(uk)||uk);
const node=(tag,cls,value)=>{const e=document.createElement(tag);e.className=cls;if(value!==undefined)e.textContent=value;return e;};
const link=(cls,label,path)=>{const a=node("a",cls,label);a.href=new URL(path,root).href;return a;};
const idOK=id=>/^[1-9][0-9]{0,18}$/.test(id||"");
function authLinks(host){host.append(link("vatra-guest-login-001",t("Увійти","Sign in"),""),link("vatra-guest-register-001",t("Створити акаунт","Create account"),"create-account"));}
function layout(loader,app){
 document.body.classList.remove("vatra-shell-pending");document.body.dataset.guestReady="true";document.body.dataset.authReady="true";
 const old=document.querySelector(app);if(old)old.hidden=true;
 const loading=document.querySelector(loader);if(loading)loading.hidden=true;
 const shell=node("div","ui-vatra-guest-shell-001");const header=node("header","ui-vatra-guest-header-001"),inner=node("div","ui-vatra-guest-header-inner-001");
 const brand=link("vatra-guest-brand-001","","");brand.setAttribute("aria-label","VATRA");const logo=node("img","ui-vatra-guest-logo-001");logo.src=new URL("assets/logo/logo.svg",root).href;logo.alt="VATRA";brand.append(logo);
 const headActions=node("div","ui-vatra-guest-header-actions-001");authLinks(headActions);inner.append(brand,headActions);header.append(inner);
 const main=node("main","ui-vatra-guest-main-001");const bar=node("footer","ui-vatra-guest-bottom-001"),barInner=node("div","ui-vatra-guest-bottom-inner-001"),copy=node("div","ui-vatra-guest-bottom-copy-001"),actions=node("div","ui-vatra-guest-bottom-actions-001");
 copy.append(node("strong","vatra-guest-bottom-title-001",t("Ваші люди. Ваші історії. Ваша VATRA.","Your people. Your stories. Your VATRA.")),node("span","vatra-guest-bottom-caption-001",t("Приєднуйтеся, щоб спілкуватися та відкривати більше.","Join to connect and discover more.")));authLinks(actions);barInner.append(copy,actions);bar.append(barInner);
 shell.append(header,main,bar);document.body.append(shell);return main;
}
function identity(main,name,isProfile,description){
 const hero=node("section","ui-vatra-guest-identity-001"),cover=node("div","ui-vatra-guest-cover-001"),row=node("div","ui-vatra-guest-identity-row-001"),avatar=node("div","ui-vatra-guest-avatar-001"),meta=node("div","ui-vatra-guest-identity-meta-001");
 if(isProfile){const img=node("img","ui-vatra-guest-hidden-avatar-001");img.src=new URL("assets/vatryk/vatryk_hidden.webp",root).href;img.alt="";img.decoding="async";avatar.append(img);}else avatar.textContent=Array.from(name.trim())[0]?.toLocaleUpperCase()||"V";
 const heading=node("h1","vatra-guest-name-001",name),caption=node("p","vatra-guest-caption-001",description);meta.append(heading,caption);row.append(avatar,meta);hero.append(cover,row);main.append(hero);return {hero,row};
}
function prompt(name){
 const d=node("dialog","ui-vatra-guest-dialog-001");d.setAttribute("aria-labelledby","vatra-guest-dialog-title");const close=node("button","vatra-guest-close-001","×");close.type="button";close.setAttribute("aria-label",t("Закрити","Close"));const icon=node("img","ui-vatra-guest-dialog-logo-001");icon.src=new URL("assets/logo/logo_app-icon.svg",root).href;icon.alt="";
 const title=node("h2","vatra-guest-dialog-title-001",t("Приєднуйтеся, щоб переглядати спільноту","Join to explore this community")+" «"+name+"»");title.id="vatra-guest-dialog-title";
 const copy=node("p","vatra-guest-dialog-copy-001",t("Підписуйтеся, коментуйте та діліться цікавими дописами.","Follow, comment and share interesting posts."));const actions=node("div","ui-vatra-guest-dialog-actions-001");authLinks(actions);d.append(close,icon,title,copy,actions);document.body.append(d);
 const open=()=>{if(!d.open&&document.visibilityState!=="hidden")d.showModal();};
 close.addEventListener("click",()=>d.close());d.addEventListener("click",e=>{if(e.target===d)d.close();});

 let last=scrollY,lastPromptAt=0,distance=0;
 d.addEventListener("close",()=>{last=scrollY;distance=0;lastPromptAt=Date.now();});
 window.addEventListener("scroll",()=>{const y=scrollY;if(!d.open&&document.visibilityState==="visible"){distance+=Math.max(0,y-last);if(distance>=Math.max(800,innerHeight*1.25)&&Date.now()-lastPromptAt>=18000){distance=0;lastPromptAt=Date.now();open();}}last=y;},{passive:true});
 return open;
}
async function profile(client,id){
 if(!idOK(id))return false;
 const result=await client.from("member_directory").select("vatra_id").eq("vatra_id",id).maybeSingle();
 if(result.error)return false;
 const main=layout("#profile-loading","#profile-app");
 if(!result.data){document.title=t("Користувача не знайдено","User not found");main.append(node("section","ui-vatra-guest-note-001",document.title));return true;}

 let name=t("Користувач VATRA","VATRA user");
 try{const preview=await client.from("public_profiles").select("display_name").eq("vatra_id",id).maybeSingle();if(!preview.error&&typeof preview.data?.display_name==="string"&&preview.data.display_name.trim())name=preview.data.display_name.trim().slice(0,100);}catch(_){}
 document.title=name;identity(main,name,true,t("Сторінку приховано","Profile hidden"));
 main.append(node("section","ui-vatra-guest-note-001",t("Сторінка доступна лише авторизованим користувачам.","This page is available to signed-in members only.")));return true;
}
async function club(client,id){
 if(!idOK(id))return false;
 const result=await client.from("communities").select("club_id,name,description").eq("club_id",id).maybeSingle();
 if(result.error)return false;
 const main=layout("#community-loading","#community-app");
 if(!result.data){document.title=t("Спільноту не знайдено","Community not found");main.append(node("section","ui-vatra-guest-note-001",document.title));return true;}
 const data=result.data,name=String(data.name);document.title=name;const {row}=identity(main,name,false,t("Спільнота VATRA","VATRA community"));
 const open=prompt(name),follow=node("button","vatra-guest-follow-001",t("Підписатися","Follow"));follow.type="button";follow.addEventListener("click",open);row.append(follow);
 const columns=node("div","ui-vatra-guest-columns-001"),posts=node("section","ui-vatra-guest-posts-001"),about=node("aside","ui-vatra-guest-about-001"),list=node("div","ui-vatra-guest-post-list-001");
 about.append(node("h2","vatra-guest-about-heading-001",t("Про спільноту","About community")),node("p","vatra-guest-about-text-001",data.description||t("Опису поки немає.","No description yet.")));
 const more=node("button","vatra-guest-more-001",t("Показати ще","Show more"));more.type="button";more.hidden=true;posts.append(list,more);columns.append(posts,about);main.append(columns);
 let offset=0,busy=false,done=false;
 async function load(){if(busy||done)return;busy=true;more.disabled=true;try{

  const response=await client.from("community_posts").select("id,body,created_at").eq("club_id",id).eq("guest_visible",true).order("created_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+9);
  if(response.error)throw response.error;const rows=response.data||[];offset+=rows.length;done=rows.length<10;more.hidden=done;
  for(const item of rows){const article=node("article","ui-vatra-guest-post-001");article.append(node("strong","vatra-guest-post-author-001",t("Допис спільноти","Community post")),node("time","vatra-guest-post-date-001",new Date(item.created_at).toLocaleDateString(document.documentElement.lang||"uk")));const body=node("p","feed-post-body vatra-guest-post-body-001",item.body||"");article.append(body);window.VATRA_POST_MEDIA?.linkifyHashtags(body);window.VATRA_POST_MEDIA?.collapsibleBody(body);const action=node("button","vatra-guest-post-action-001",t("Взаємодіяти з дописом","Interact with post"));action.type="button";action.addEventListener("click",open);article.append(action);list.append(article);}
  if(!offset)list.append(node("div","ui-vatra-guest-note-001",t("Увійдіть, щоб переглядати всі публікації спільноти.","Sign in to see all community posts.")));
 }catch(_){done=true;more.hidden=true;if(!offset)list.append(node("div","ui-vatra-guest-note-001",t("Увійдіть, щоб переглядати публікації спільноти.","Sign in to see community posts.")));}finally{busy=false;more.disabled=false;}}
 more.addEventListener("click",load);if(typeof IntersectionObserver==="function"){const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)&&!more.hidden)void load();},{rootMargin:"300px"});observer.observe(more);}
 await load();return true;
}
window.VATRA_GUEST=Object.freeze({profile,club});})();