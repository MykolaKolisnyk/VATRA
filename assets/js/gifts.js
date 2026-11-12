/* VATRA gifts page: public catalogue; membership and ownership from Supabase. */
(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript?.src||"assets/js/gifts.js");
const q=s=>document.querySelector(s);
const en=()=>document.documentElement.lang==="en";
const t=(uk,english)=>en()?english:uk;
const validId=value=>/^[1-9][0-9]{0,18}$/.test(String(value??""));
const make=(tag,cls,text)=>{
 const el=document.createElement(tag);el.className=cls;
 if(text!==undefined)el.textContent=text;return el;
};
let mine=[],targetId=null;
const catalog=()=>window.VATRA_GIFTS_CATALOG?.all||[];
function card(gift,owned){
 const item=make("button","vatra-gifts-card ui-vatra-gifts-card-"+gift.code);
 item.type="button";item.addEventListener("click",()=>window.VATRA_GIFT_VIEWER?.open(gift.code));
 const artwork=make("div","vatra-gifts-card-image ui-vatra-gifts-card-image-"+gift.code);
 const img=make("img","ui-vatra-gifts-card-art-"+gift.code);
 img.src=window.VATRA_GIFTS_CATALOG.fileUrl(gift);img.alt="";
 img.width=220;img.height=220;img.loading="lazy";
 artwork.append(img);
 const heading=make("strong","vt-vatra-gifts-card-title-"+gift.code,t(gift.uk,gift.en));
 const description=make("span","vt-vatra-gifts-card-copy-"+gift.code,t(gift.descriptionUk,gift.descriptionEn));
 const state=make("small","vt-vatra-gifts-card-state-"+gift.code,
  owned?t("У колекції","In your collection"):
  gift.released?t("Безкоштовний","Free"):
  t("До майбутньої події","For an upcoming event"));
 item.append(artwork,heading,description,state);
 return item;
}
function render(mode){
 const list=q("#gifts-list"),empty=q("#gifts-empty");
 list.replaceChildren();empty.hidden=true;list.setAttribute("aria-busy","true");
 try{
  const gifts=mode==="mine"?mine.map(x=>catalog().find(g=>g.code===x.gift_code)).filter(Boolean):
   mode==="free"?catalog():[];
  for(const gift of gifts)list.append(card(gift,mode==="mine"));
  if(!gifts.length){
   empty.textContent=mode==="paid"?
    t("Платні подарунки ще не запущено. Оплати та покупок зараз немає.",
     "Paid gifts are not available yet. There are no payments or purchases at this time."):
    t("У цій колекції поки немає подарунків.","No gifts in this collection yet.");
   empty.hidden=false;
  }
 }finally{list.setAttribute("aria-busy","false");}
}
async function boot(){
 if(document.body?.dataset.page!=="gifts")return;
 await window.VATRA_LANGUAGE?.ready;
 if(!window.supabase?.createClient)return;
 const client=window.supabase.createClient("https://rjasunoawrxvetwadylh.supabase.co",
  "sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}});
 try{
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user?.id||!data.user.email_confirmed_at){location.replace(root.href);return;}
  const user=data.user;
  const account=await client.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();
  if(account.error||!validId(account.data?.vatra_id))throw Error("Member ID unavailable");
  const id=String(account.data.vatra_id);
  const requested=new URLSearchParams(location.search).get("member");
  targetId=validId(requested)?String(requested):id;
  const name=String(user.user_metadata?.first_name||user.user_metadata?.full_name||"VATRA").trim();
  window.VATRA_AVATAR?.setHeader({email:user.email,name:name.split(/\s+/)[0].slice(0,28),
   initials:name.slice(0,1).toLocaleUpperCase(),id});
  window.VATRA_AVATAR?.applyRemembered(q("#feed-header-avatar"),user.email);
  for(const el of document.querySelectorAll("[data-social-uk]"))
   el.textContent=t(el.dataset.socialUk,el.dataset.socialEn);
  for(const a of document.querySelectorAll('a[href="profile"]'))
   a.href=new URL("id="+id,root).href;
  q("#gifts-back").href=new URL("id="+targetId,root).href;
  q("#feed-logout")?.addEventListener("click",async()=>{
   await client.auth.signOut({scope:"local"});
   window.VATRA_AVATAR?.clearHeader();location.replace(root.href);
  });
  q("#feed-search-form")?.addEventListener("submit",event=>{
   event.preventDefault();const term=q("#feed-search-input")?.value.trim()||"";
   location.assign(new URL("feed"+(term?"?q="+encodeURIComponent(term):""),root).href);
  });
  document.title=t("Подарунки · VATRA","Gifts · VATRA");
  const result=await client.from("vatra_profile_gifts").select("gift_code,created_at")
   .eq("recipient_vatra_id",targetId).order("created_at",{ascending:false}).limit(200);
  if(result.error)throw result.error;
  mine=result.data||[];
  q("#feed-app").hidden=false;q("#feed-loading").hidden=true;
  document.body.dataset.authReady="true";document.body.classList.remove("vatra-shell-pending");
  window.VATRA_NOTIFICATIONS?.start(client,id);
  for(const button of document.querySelectorAll("[data-gifts-tab]")){
   button.addEventListener("click",()=>{
    const mode=button.dataset.giftsTab;
    for(const tab of document.querySelectorAll("[data-gifts-tab]")){
     tab.classList.toggle("is-active",tab===button);
     tab.setAttribute("aria-pressed",String(tab===button));
    }
    render(mode);
   });
  }
  render("mine");
 }catch(_){
  const list=q("#gifts-list"),empty=q("#gifts-empty");
  if(empty){empty.hidden=false;empty.textContent=t("Не вдалося завантажити колекцію.","Could not load the collection.");}
  if(list)list.setAttribute("aria-busy","false");
  q("#feed-loading").textContent=t("Не вдалося відкрити подарунки. Оновіть сторінку.","Could not open gifts. Refresh the page.");
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else void boot();
})();
