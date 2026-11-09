/* VATRA personal profile; read-only starter, authenticated and bilingual. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://rjasunoawrxvetwadylh.supabase.co";
const PUBLIC_KEY="sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-";
const q=selector=>document.querySelector(selector);
const english=document.documentElement.lang==="en";
const t=(uk,en)=>{if(!english)return uk;const value=window.VATRA_LANGUAGE?.translate(uk);return value&&value!==uk?value:en;};
const home=new URL("./",location.href).href;
async function start(){
 await window.VATRA_LANGUAGE?.ready;
 if(!window.supabase?.createClient){
  q(".vatra-auth-loading-caption").textContent=t("Не вдалося відкрити VATRA","Could not open VATRA");return;
 }
 try{
  const client=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
   auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}
  });
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user?.id||!data.user.email_confirmed_at){location.replace(home);return;}
  const user=data.user,metadata=user.user_metadata||{};
  const name=[metadata.first_name,metadata.last_name].filter(x=>typeof x==="string"&&x.trim()).map(x=>x.trim()).join(" ")
   ||String(metadata.full_name||"").trim()||t("Учасник VATRA","VATRA member");
  const cleanName=Array.from(name).slice(0,100).join("");
  const avatar=(Array.from(cleanName)[0]||"V").toLocaleUpperCase(english?"en-US":"uk-UA");
  const profile=await client.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();
  const label=profile.error||profile.data?.vatra_id==null?"VATRA":("VATRA ID "+profile.data.vatra_id);
  q("#profile-heading").textContent=cleanName;
  q("#profile-avatar").textContent=avatar;
  q("#profile-vatra-id").textContent=label;
  q("#feed-header-avatar").textContent=avatar;
  q("#feed-menu-name").textContent=cleanName;
  q("#feed-header-id").textContent=label;
  q("#profile-app").hidden=false;q("#profile-loading").hidden=true;
  document.body.dataset.authReady="true";document.body.dataset.feedReady="true";
  const form=q("#feed-search-form");
  form?.addEventListener("submit",event=>{
   event.preventDefault();
   const search=q("#feed-search-input").value.trim().slice(0,120);
   location.href=new URL("feed"+(search?"?q="+encodeURIComponent(search):""),home).href;
  });
  const menu=q(".feed-account-menu");
  document.addEventListener("click",event=>{
   if(menu?.open&&!menu.contains(event.target))menu.open=false;
  });
  document.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&menu?.open)menu.open=false;
  });
  q("#feed-logout").addEventListener("click",async()=>{
   const button=q("#feed-logout");button.disabled=true;
   const {error}=await client.auth.signOut({scope:"local"});
   if(error){button.disabled=false;return;}
   try{sessionStorage.setItem("vatra-just-signed-out","1");}catch(_){}
   location.replace(home);
  });
 }catch(_){
  q(".vatra-auth-loading-caption").textContent=t("Не вдалося завантажити сторінку. Оновіть її.","Could not load this page. Please refresh.");
 }
}
void start();
})();