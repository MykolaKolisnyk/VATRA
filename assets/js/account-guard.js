(()=>{
"use strict";
const root=new URL("../../",document.currentScript.src);
const t=(uk,en)=>document.documentElement.lang==="en"?en:uk;
const node=(tag,cls,copy)=>{const el=document.createElement(tag);el.className=cls;if(copy!==undefined)el.textContent=copy;return el;};
const button=(cls,copy,fn)=>{const b=node("button",cls,copy);b.type="button";b.addEventListener("click",fn);return b;};
const icon=()=>{const ns="http://www.w3.org/2000/svg",s=document.createElementNS(ns,"svg"),p=document.createElementNS(ns,"path");s.setAttribute("viewBox","0 0 24 24");s.setAttribute("fill","none");s.setAttribute("stroke","currentColor");s.setAttribute("stroke-width","1.8");s.setAttribute("stroke-linejoin","round");s.setAttribute("stroke-linecap","round");s.setAttribute("class","ui-vatra-owner-admin-icon-001");p.setAttribute("class","ui-vatra-owner-admin-path-001");s.setAttribute("aria-hidden","true");p.setAttribute("d","M12 2 3 6v6c0 5 4 8 9 10 5-2 9-5 9-10V6L12 2Zm-4 10 3 3 5-6");s.append(p);return s;};
let context=null,epoch=0,subscription=null,blockedDialog=null,adminPromise=null,adminModule=null,announcementsPromise=null,announcementsModule=null;
const valid=id=>/^[1-9][0-9]{0,18}$/.test(String(id||""));
function clear(){epoch++;announcementsModule?.stop();document.getElementById("vatra-admin-menu")?.remove();adminModule?.clearPanel();blockedDialog?.remove();blockedDialog=null;subscription?.unsubscribe?.();subscription=null;context=null;}
async function session(client,id){
 if(!client||!valid(id))return;if(context?.client===client&&context.id===id)return;
 clear();const current={client,id};context=current;const ticket=epoch;
 if(client.auth?.onAuthStateChange){const {data}=client.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT"&&context===current&&ticket===epoch){if(window.VATRA_ADMIN_CONTEXT?.client===client&&window.VATRA_ADMIN_CONTEXT.id===id)delete window.VATRA_ADMIN_CONTEXT;clear();}});subscription=data?.subscription;}
 try{
 const {data:state,error}=await client.from("account_states").select("state,blocked_until").eq("vatra_id",id).maybeSingle();
 if(ticket!==epoch)return;
 if(!error&&(state?.state==="deleted"||state?.state==="blocked"&&(!state.blocked_until||Date.parse(state.blocked_until)>Date.now()))){showBlocked(client,state);return;}
 void loadAnnouncements().then(module=>{if(ticket===epoch&&context===current)void module.start(client,id,()=>ticket===epoch&&context===current);}).catch(()=>{});
 if(id!=="1")return;
 const role=await client.rpc("vatra_admin_access");if(ticket!==epoch||role.error||role.data!==true)return;
 const support=document.querySelector(".feed-menu-support");if(!support)return;
 const entry=button("vatra-owner-admin-menu-001","",async()=>{
  if(entry.disabled||ticket!==epoch||context!==current)return;
  entry.disabled=true;
  try{const module=await loadAdmin();if(ticket!==epoch||context!==current)return;const menu=support.closest("details");if(menu)menu.open=false;module.openPanel(current,()=>ticket===epoch&&context===current,{root,t,node,button,icon,valid});}
  catch(_){if(ticket===epoch)alert(t("Не вдалося відкрити ADMIN PANEL.","Could not open ADMIN PANEL."));}
  finally{entry.disabled=false;}
 });entry.id="vatra-admin-menu";entry.append(icon(),node("span","vatra-owner-admin-menu-label-001","ADMIN PANEL"));const logout=document.getElementById("feed-logout");if(logout)logout.before(entry);else support.after(entry);
 }catch(_){}
}
function loadAnnouncements(){
 if(!announcementsPromise)announcementsPromise=import(new URL("assets/js/announcements.js?rev=9813078fb77cef938069ec3023283bf130141992",root).href).then(module=>{announcementsModule=module;return module;}).catch(error=>{announcementsPromise=null;throw error;});
 return announcementsPromise;
}
function loadAdmin(){
 if(adminPromise)return adminPromise;
 const style=document.createElement("link");style.rel="stylesheet";style.href=new URL("assets/css/admin.css?rev=6da7adcee53588676bbd85db04978748c1882a88",root).href;style.dataset.vatraAdminStyle="true";
 const ready=new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=()=>reject(Error("Admin styles unavailable"));});
 document.head.append(style);
 adminPromise=Promise.all([import(new URL("assets/js/admin.js?rev=dbe70f34e81b790b398f2c7415848eaf6cfd69a2",root).href),ready]).then(([module])=>{adminModule=module;return module;}).catch(error=>{style.remove();adminPromise=null;throw error;});
 return adminPromise;
}
function showBlocked(client,state){
 if(blockedDialog)return;
 const signOut=async()=>{await client.auth.signOut({scope:"local"});location.replace(root.href);};
 const service=window.VATRA_SERVICE_NOTICE?.show(state.state==="deleted"?"deleted":"blocked",{locked:true,support:true,actionLabel:t("Вийти","Sign out"),onAction:signOut,description:state.blocked_until?t("Обмеження до: ","Restricted until: ")+new Date(state.blocked_until).toLocaleString():undefined});
 if(service){blockedDialog=service;return;}
 const d=node("dialog","ui-vatra-admin-blocked-001");blockedDialog=d;d.append(node("h2","vatra-admin-blocked-title-001",t("Доступ до VATRA обмежено","Access to VATRA is restricted")),node("p","vatra-admin-blocked-copy-001",state.blocked_until?t("Обмеження до: ","Restricted until: ")+new Date(state.blocked_until).toLocaleString():t("Зверніться до підтримки VATRA.","Contact VATRA support.")));
 const support=node("a","vatra-admin-blocked-support-001",t("Техпідтримка","Support"));support.href="mailto:vatra.support@gmail.com";d.append(support,button("vatra-admin-primary-001",t("Вийти","Sign out"),async()=>{await client.auth.signOut({scope:"local"});location.replace(root.href);}));d.addEventListener("cancel",e=>e.preventDefault());document.body.append(d);d.showModal();
}
window.VATRA_ADMIN_SESSION=session;
window.VATRA_ADMIN_END=(client,id)=>{if(context?.client===client&&context.id===String(id))clear();};
if(window.VATRA_ADMIN_CONTEXT)void session(window.VATRA_ADMIN_CONTEXT.client,window.VATRA_ADMIN_CONTEXT.id);
})();