(()=>{
"use strict";
const root=new URL("../../",document.currentScript.src);
const t=(uk,en)=>{const code=window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";if(code==="uk")return uk;if(code==="en")return en;return window.VATRA_LANGUAGE?.translate?.(uk)||uk;};
const node=(tag,cls,copy)=>{const el=document.createElement(tag);el.className=cls;if(copy!==undefined)el.textContent=copy;return el;};
const button=(cls,copy,fn)=>{const b=node("button",cls,copy);b.type="button";b.addEventListener("click",fn);return b;};
let context=null,epoch=0,subscription=null,blockedDialog=null;
const valid=id=>/^[1-9][0-9]{0,18}$/.test(String(id||""));
function clear(){epoch++;blockedDialog?.remove();blockedDialog=null;subscription?.unsubscribe?.();subscription=null;context=null;}
async function session(client,id){
 if(!client||!valid(id))return;if(context?.client===client&&context.id===id)return;
 clear();const current={client,id};context=current;const ticket=epoch;
 if(client.auth?.onAuthStateChange){const {data}=client.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT"&&context===current&&ticket===epoch){if(window.VATRA_ACCOUNT_CONTEXT?.client===client&&window.VATRA_ACCOUNT_CONTEXT.id===id)delete window.VATRA_ACCOUNT_CONTEXT;clear();}});subscription=data?.subscription;}
 try{
 const {data:state,error}=await client.from("account_states").select("state,blocked_until").eq("vatra_id",id).maybeSingle();
 if(ticket!==epoch)return;
 if(!error&&(state?.state==="deleted"||state?.state==="blocked"&&(!state.blocked_until||Date.parse(state.blocked_until)>Date.now()))){showBlocked(client,state);return;}

 }catch(_){}
}
function showBlocked(client,state){
 if(blockedDialog)return;
 const signOut=async()=>{await client.auth.signOut({scope:"local"});location.replace(root.href);};
 const service=window.VATRA_SERVICE_NOTICE?.show(state.state==="deleted"?"deleted":"blocked",{locked:true,support:true,actionLabel:t("Вийти","Sign out"),onAction:signOut,description:state.blocked_until?t("Обмеження до: ","Restricted until: ")+new Date(state.blocked_until).toLocaleString():undefined});
 if(service){blockedDialog=service;return;}
 const d=node("dialog","ui-vatra-account-blocked-001");blockedDialog=d;d.append(node("h2","vatra-account-blocked-title-001",t("Доступ до VATRA обмежено","Access to VATRA is restricted")),node("p","vatra-account-blocked-copy-001",state.blocked_until?t("Обмеження до: ","Restricted until: ")+new Date(state.blocked_until).toLocaleString():t("Зверніться до підтримки VATRA.","Contact VATRA support.")));
 const support=node("a","vatra-account-blocked-support-001",t("Техпідтримка","Support"));support.href="mailto:vatra.support@gmail.com";d.append(support,button("vatra-account-blocked-action-001",t("Вийти","Sign out"),async()=>{await client.auth.signOut({scope:"local"});location.replace(root.href);}));d.addEventListener("cancel",e=>e.preventDefault());document.body.append(d);d.showModal();
}
window.VATRA_ACCOUNT_SESSION=session;
window.VATRA_ACCOUNT_END=(client,id)=>{if(context?.client===client&&context.id===String(id))clear();};
if(window.VATRA_ACCOUNT_CONTEXT)void session(window.VATRA_ACCOUNT_CONTEXT.client,window.VATRA_ACCOUNT_CONTEXT.id);
})();