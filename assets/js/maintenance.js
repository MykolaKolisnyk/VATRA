(()=>{"use strict";if(window.VATRA_HOST_ALLOWED===false)return;
const q=s=>document.querySelector(s),root=new URL("../../",document.currentScript.src);
const t=(uk,en)=>document.documentElement.lang==="en"?en:uk;
const preview=new URLSearchParams(location.search).get("preview")==="1";
let checked=false,busy=false,client=null,owner=false;
const status=q("#maintenance-status"),retry=q("#maintenance-retry"),disable=q("#maintenance-disable");
function say(uk,en){status.textContent=t(uk,en);}
async function check(manual=false){
 if(busy)return;busy=true;retry.disabled=true;
 try{
  const enabled=await window.VATRA_MAINTENANCE_STATUS?.();
  if(enabled===false){if(!preview){location.replace(root.href);return;}say("Попередній перегляд · сайт працює","Preview · site is open");}
  else if(enabled===true){checked=true;say("Технічні роботи ще тривають.","Maintenance is still in progress.");}
  else if(manual||!checked)say("Не вдалося перевірити стан. Спробуйте ще раз.","Could not check status. Please try again.");
  disable.disabled=enabled!==true||!owner;
 }finally{busy=false;retry.disabled=false;}
}
async function start(){
 await window.VATRA_LANGUAGE?.ready;
 document.title=t("Технічні роботи · VATRA","Maintenance · VATRA");
 retry.addEventListener("click",()=>void check(true));
 disable.disabled=true;
 if(window.supabase?.createClient){
  try{
   client=window.supabase.createClient("https://rjasunoawrxvetwadylh.supabase.co","sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-",{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,flowType:"pkce"}});
   // Server-enforced owner authorization; the URL is never a permission.
   const role=await client.rpc("vatra_admin_access");
   owner=role.data===true&&!role.error;
   if(owner){q("#maintenance-owner").hidden=false;q("#maintenance-admin-login").hidden=true;}
  }catch(_){}
 }
 disable.addEventListener("click",async()=>{
  if(!owner||!client||disable.disabled)return;
  if(!confirm(t("Вимкнути технічні роботи?","Disable maintenance?")))return;
  disable.disabled=true;
  try{
   const result=await client.from("site_maintenance").update({enabled:false}).eq("id",1).select("enabled").single();
   if(result.error||result.data?.enabled!==false)throw result.error||Error("Update failed");
   location.replace(new URL("feed",root).href);
  }catch(_){say("Не вдалося вимкнути режим.","Could not disable maintenance.");disable.disabled=false;}
 });
 await check();
 setInterval(()=>{if(document.visibilityState==="visible")void check();},30000);
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void check();});
}
void start();
})();