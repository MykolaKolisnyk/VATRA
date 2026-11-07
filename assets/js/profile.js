/* VATRA public numeric ID page: safe public fields, owner-only editing. */
(() => {
"use strict";
const ROOT="/VATRA/";
const en=window.VATRA_LANGUAGE?.locale==="en"||/^\/VATRA\/en\//.test(location.pathname);
const t=(uk,english)=>en?english:uk;
const $=id=>document.getElementById(id);
const route=location.pathname.match(/^\/VATRA\/(?:(?:ua|en)\/)?id([1-9]\d*)\/?$/);
const endpoint=ROOT+(en?"en/":"ua/");
const heading=$("profile-heading"),description=$("profile-description"),number=$("public-vatra-id"),signIn=$("profile-signin");
const editor=$("profile-editor"),composer=$("profile-composer"),postsPanel=$("profile-posts-panel");
const list=$("posts-list"),status=$("posts-status"),more=$("posts-more");
const setStatus=(element,message,error=false)=>{
 if(!element)return;
 element.textContent=message;element.dataset.error=String(error);element.hidden=!message;
};
const setBusy=(form,busy)=>{const b=form?.querySelector('button[type="submit"]');if(b)b.disabled=busy;};
if(en){
 document.documentElement.lang="en";
 document.querySelectorAll("[data-en]").forEach(el=>{el.textContent=el.dataset.en;});
 const footer=document.querySelector(".footer");
 if(footer){
  footer.querySelectorAll("nav a").forEach(a=>{
   if(a.textContent==="Умови використання"){a.textContent="Terms of Service";a.href=endpoint+"terms.html";}
   if(a.textContent==="Конфіденційність"){a.textContent="Privacy";a.href=endpoint+"privacy.html";}
  });
  const copy=footer.querySelector("span");
  if(copy)copy.textContent="© 2026 VATRA · Your people. Your stories.";
  const trigger=footer.querySelector("[data-language-trigger]");
  if(trigger){trigger.textContent="English";trigger.setAttribute("aria-label","Choose language");}
 }
}
$("profile-home").href=endpoint;
$("profile-home").textContent=t("Головна","Home");
signIn.href=endpoint;
signIn.textContent=t("Увійти у VATRA","Sign in to VATRA");
if(!route||!Number.isSafeInteger(Number(route[1]))){
 heading.textContent=t("Сторінку не знайдено","Page not found");
 description.textContent=t("Перевірте адресу та поверніться до VATRA.","Check the address and return to VATRA.");
 return;
}
const id=Number(route[1]);
document.title="VATRA ID "+id+" · VATRA";
number.textContent="VATRA ID "+id;number.hidden=false;
if(!window.supabase?.createClient){
 description.textContent=t("Не вдалося завантажити дані. Перевірте інтернет.","Unable to connect. Check your internet.");
 return;
}
const client=window.supabase.createClient("https://rjasunoawrxvetwadylh.supabase.co","sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-",{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
});
let owner=false,offset=0,hasMore=false;
const PAGE=12;
const formatDate=value=>{try{return new Intl.DateTimeFormat(en?"en-US":"uk-UA",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}catch{return "";}};
async function loadPosts(reset=false){
 if(reset){offset=0;list.replaceChildren();}
 setStatus(status,t("Завантаження публікацій…","Loading posts…"));
 const {data,error}=await client.from("posts").select("id,author_vatra_id,content,created_at")
   .eq("author_vatra_id",id).order("created_at",{ascending:false}).range(offset,offset+PAGE-1);
 if(error){setStatus(status,t("Не вдалося завантажити публікації.","Unable to load posts."),true);return;}
 const rows=data||[];offset+=rows.length;hasMore=rows.length===PAGE;more.hidden=!hasMore;
 for(const post of rows){
  const card=document.createElement("article");card.className="post-card";
  const top=document.createElement("div");top.className="post-card-header";
  const author=document.createElement("strong");author.textContent="VATRA ID "+id;
  const time=document.createElement("time");time.dateTime=post.created_at;time.textContent=formatDate(post.created_at);
  top.append(author,time);
  const body=document.createElement("p");body.textContent=post.content;
  card.append(top,body);
  if(owner){
   const del=document.createElement("button");del.className="post-delete";del.type="button";
   del.textContent=t("Видалити публікацію","Delete post");
   del.addEventListener("click",async()=>{
    if(!confirm(t("Видалити цю публікацію?","Delete this post?")))return;
    del.disabled=true;
    const {error:deleteError}=await client.from("posts").delete().eq("id",post.id).eq("author_vatra_id",id);
    if(deleteError){del.disabled=false;setStatus(status,t("Не вдалося видалити публікацію.","Unable to delete post."),true);}
    else await loadPosts(true);
   });
   card.append(del);
  }
  list.append(card);
 }
 status.hidden=offset>0;
 if(offset===0)setStatus(status,t("Публікацій поки немає.","No posts yet."));
}
async function setup(){
 const {data:directory,error:directoryError}=await client.from("vatra_directory").select("vatra_id").eq("vatra_id",id).maybeSingle();
 if(directoryError)throw directoryError;
 if(!directory){
  heading.textContent=t("Профіль не знайдено","Profile not found");
  description.textContent=t("VATRA ID з таким номером не існує.","There is no VATRA account with this ID.");
  number.hidden=true;document.title=t("Профіль не знайдено · VATRA","Profile not found · VATRA");
  return;
 }
 const {data:profile,error:profileError}=await client.from("member_profiles")
  .select("display_name,bio").eq("vatra_id",id).maybeSingle();
 if(profileError)throw profileError;
 heading.textContent=profile?.display_name||t("Сторінка користувача VATRA","VATRA member profile");
 description.textContent=profile?.bio||t("Ваші люди. Ваші історії. Ваша VATRA.","Your people. Your stories. Your VATRA.");
 try {
  const {data:{user},error:userError}=await client.auth.getUser();
  if(!userError&&user){
   const {data:own,error:ownError}=await client.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();
   owner=!ownError&&Number(own?.vatra_id)===id;
  }
 }catch{owner=false;}
 if(owner){
  signIn.textContent=t("Налаштування акаунта","Account settings");signIn.href=endpoint+"account.html";
  editor.hidden=false;composer.hidden=false;
  $("profile-name-input").value=profile?.display_name||"";
  $("profile-bio-input").value=profile?.bio||"";
  $("profile-edit-form").addEventListener("submit",async event=>{
   event.preventDefault();
   const name=$("profile-name-input").value.trim(),bio=$("profile-bio-input").value.trim();
   const reply=$("profile-edit-feedback");
   if(name.length>80||bio.length>500){setStatus(reply,t("Перевищено ліміт символів.","Text is too long."),true);return;}
   const form=event.currentTarget;setBusy(form,true);setStatus(reply,"");
   const {error}=await client.from("member_profiles")
     .upsert({vatra_id:id,display_name:name,bio:bio},{onConflict:"vatra_id"});
   setBusy(form,false);
   if(error){setStatus(reply,t("Не вдалося зберегти зміни.","Unable to save changes."),true);return;}
   heading.textContent=name||t("Моя сторінка","My page");
   description.textContent=bio||t("Ваші люди. Ваші історії. Ваша VATRA.","Your people. Your stories. Your VATRA.");
   setStatus(reply,t("Зміни збережено.","Changes saved."));
  });
  $("profile-post-form").addEventListener("submit",async event=>{
   event.preventDefault();
   const body=$("post-input").value.trim(),reply=$("profile-post-feedback");
   if(body.length<1||body.length>2000){setStatus(reply,t("Напишіть від 1 до 2000 символів.","Write 1–2000 characters."),true);return;}
   const form=event.currentTarget;setBusy(form,true);setStatus(reply,"");
   const {error}=await client.from("posts").insert({author_vatra_id:id,content:body});
   setBusy(form,false);
   if(error){setStatus(reply,t("Не вдалося опублікувати допис.","Unable to publish post."),true);return;}
   $("post-input").value="";
   setStatus(reply,t("Публікацію додано.","Post published."));
   await loadPosts(true);
  });
 }
 postsPanel.hidden=false;
 more.addEventListener("click",()=>loadPosts(false));
 await loadPosts(true);
}
setup().catch(()=>{
 description.textContent=t("Не вдалося завантажити профіль. Спробуйте ще раз.","Unable to load this profile. Please try again.");
});
})();