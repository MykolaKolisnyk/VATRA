/* VATRA post composer: real media upload and publishing, private local drafts.
   Reuses existing Supabase submission and visibility handlers without fake VK
   imports, scheduled publishing or payment-like promises. */
(()=>{
"use strict";
const en=()=>document.documentElement.lang==="en";
const t=(uk,english)=>en()?english:uk;
const make=(tag,cls,label)=>{
 const el=document.createElement(tag);el.className=cls;
 if(label!==undefined)el.textContent=label;return el;
};
const iconUpload=()=>{
 const ns="http://www.w3.org/2000/svg";
 const svg=document.createElementNS(ns,"svg");
 svg.setAttribute("class","ui-vatra-post-upload-symbol-001");
 svg.setAttribute("viewBox","0 0 64 64");svg.setAttribute("width","74");svg.setAttribute("height","74");
 svg.setAttribute("fill","none");svg.setAttribute("aria-hidden","true");
 for(const [d,color,width] of [
  ["M16 41V20a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v21","#5b75d3",3.4],
  ["M18 42l9-10 7 7 5-6 8 9","#71b0d9",3.4],
  ["M33 13V4M29 8h8","#df83bc",2.8],
  ["M12 49h40","#5b75d3",3.4]
 ]){
  const path=document.createElementNS(ns,"path");path.setAttribute("d",d);
  path.setAttribute("stroke",color);path.setAttribute("stroke-width",width);
  path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");
  svg.append(path);
 }
 return svg;
};
function bind({prefix,ownerId}){
 const q=s=>document.querySelector(s);
 const dialog=q("#"+prefix+"-compose-dialog"),form=q("#"+prefix+"-compose-form");
 const title=q("#"+prefix+"-compose-title"),textarea=q("#"+prefix+"-compose-text");
 const select=q("#"+prefix+"-compose-visibility"),cancel=q("#"+prefix+"-compose-cancel");
 const submit=q("#"+prefix+"-compose-"+(prefix==="feed"?"save":"submit"));
 const counter=q("#"+prefix+"-compose-counter");
 const picker=q("#"+prefix+"-compose-media"),choose=q("#"+prefix+"-compose-media-choose");
 const mediaControls=choose?.closest(".vatra-compose-media-controls");
 const mediaPreview=q("#"+prefix+"-compose-media-preview");
 const error=q("#"+prefix+"-compose-"+(prefix==="feed"?"error":"status"));
 const actions=submit?.closest(prefix==="feed"?".feed-compose-actions":".profile-compose-actions");
 if(!dialog||!form||!title||!textarea||!submit||!cancel||!actions||!mediaControls)return null;
 if(dialog.dataset.vatraComposerReady)return null;
 dialog.dataset.vatraComposerReady="true";
 dialog.classList.add("vatra-post-composer-dialog");

 const storeKey="vatra-post-drafts-v1:"+String(ownerId);
 let stage="edit",selectedId=null,view="compose";
 const read=()=>{try{
  const result=JSON.parse(localStorage.getItem(storeKey)||"[]");
  return Array.isArray(result)?result.filter(x=>x&&typeof x.body==="string").slice(0,12):[];
 }catch(_){return [];}};
 const persist=rows=>{try{localStorage.setItem(storeKey,JSON.stringify(rows.slice(0,12)));return true;}catch(_){return false;}};
 const header=make("header","vatra-post-composer-head ui-vatra-post-composer-head-001");
 const back=make("button","vt-vatra-post-composer-back-001",t("← Редагувати","← Edit"));
 back.type="button";back.hidden=true;
 title.textContent=t("Новий пост","New post");
 const drafts=make("button","vt-vatra-post-composer-drafts-001",t("☷  Чернетки","☷  Drafts"));
 drafts.type="button";drafts.setAttribute("aria-label",t("Мої чернетки на цьому пристрої","Drafts on this device"));
 cancel.textContent="×";cancel.setAttribute("aria-label",t("Закрити редактор","Close editor"));
 header.append(back,title,drafts,cancel);

 const edit=make("section","vatra-post-composer-edit ui-vatra-post-composer-edit-001");
 const zone=make("div","vatra-post-composer-zone ui-vatra-post-composer-zone-001");
 zone.append(iconUpload());
 zone.append(make("h3","vt-vatra-post-composer-zone-title-001",t("Додайте фото або відео","Add a photo or video")));
 const upload=make("button","vt-vatra-post-composer-upload-001",t("Завантажити з пристрою","Upload from device"));
 upload.type="button";upload.addEventListener("click",()=>choose.click());
 zone.append(upload);
 zone.append(make("p","vt-vatra-post-composer-zone-note-001",
  t("Фото JPG, PNG, WebP або відео MP4, WebM","Photos JPG, PNG, WebP or video MP4, WebM")));
 // The existing media picker remains the only trusted upload input.
 mediaControls.classList.add("vatra-post-composer-media-controls");
 zone.append(mediaControls,mediaPreview);
 const textWrap=make("div","vatra-post-composer-text-wrap ui-vatra-post-composer-text-wrap-001");
 const label=form.querySelector('label[for="'+prefix+'-compose-text"]');
 if(label)textWrap.append(label);
 textarea.placeholder=t("Напишіть що-небудь…","Write something…");
 textarea.rows=4;
 textWrap.append(textarea,counter);
 edit.append(zone,textWrap);

 const settings=make("section","vatra-post-composer-settings ui-vatra-post-composer-settings-001");
 settings.hidden=true;
 settings.append(make("h3","vt-vatra-post-composer-settings-title-001",t("Налаштування публікації","Post settings")));
 const summary=make("p","vt-vatra-post-composer-settings-summary-001");
 summary.textContent=t("Перевірте допис та виберіть, хто його побачить.","Review your post and choose who can see it.");
 settings.append(summary);
 const audience=form.querySelector('label[for="'+prefix+'-compose-visibility"]');
 if(audience){audience.classList.add("vatra-post-composer-audience");settings.append(audience);}
 const localOnly=make("p","vt-vatra-post-composer-settings-note-001",
  t("Публікація з’явиться одразу після натискання «Опублікувати».",
   "Your post will appear as soon as you press Publish."));
 settings.append(localOnly);
 const draftsPanel=make("section","vatra-post-composer-drafts-panel ui-vatra-post-composer-drafts-001");
 draftsPanel.hidden=true;
 const draftList=make("div","vatra-post-composer-draft-list ui-vatra-post-composer-draft-list-001");
 draftsPanel.append(make("h3","vt-vatra-post-composer-draft-title-001",
  t("Ваші чернетки","Your drafts")));
 draftsPanel.append(make("p","vt-vatra-post-composer-draft-info-001",
  t("Чернетки зберігаються лише в цьому браузері. Фото та відео не зберігаються.",
   "Drafts are saved in this browser only. Photos and videos are not stored.")));
 draftsPanel.append(draftList);

 const footer=make("footer","vatra-post-composer-footer ui-vatra-post-composer-footer-001");
 const left=make("div","vatra-post-composer-footer-left ui-vatra-post-composer-footer-left-001");
 const tips=make("button","vt-vatra-post-composer-tips-001",t("ⓘ  Поради щодо публікації","ⓘ  Posting tips"));
 tips.type="button";
 const tip=make("p","vt-vatra-post-composer-tip-001",
  t("Діліться своїм, поважайте приватність інших та обирайте видимість допису перед публікацією.",
   "Share your own content, respect others' privacy, and choose your post's visibility before publishing."));
 tip.hidden=true;
 tips.addEventListener("click",()=>{tip.hidden=!tip.hidden;});
 const draftSave=make("button","vt-vatra-post-composer-draft-save-001",t("Зберегти чернетку","Save draft"));
 draftSave.type="button";
 const next=make("button","vt-vatra-post-composer-next-001",t("Далі","Next"));
 next.type="button";
 const footerActions=make("div","vatra-post-composer-footer-actions ui-vatra-post-composer-footer-actions-001");
 left.append(tips,tip);footerActions.append(draftSave,next,submit);
 footer.append(left,footerActions);
 actions.remove();
 const notice=make("p","vt-vatra-post-composer-notice-001");notice.hidden=true;
 const showNotice=value=>{notice.textContent=value;notice.hidden=!value;};
 function sync(){
  next.disabled=!textarea.value.trim()&&!picker?.files?.length;
 }
 function setStage(name){
  if(name==="settings"&&!textarea.value.trim()&&!picker?.files?.length)return false;
  view="compose";stage=name;
  edit.hidden=name!=="edit";settings.hidden=name!=="settings";draftsPanel.hidden=true;
  back.hidden=name==="edit";drafts.hidden=name!=="edit";
  title.textContent=name==="settings"?t("Налаштування","Settings"):t("Новий пост","New post");
  next.hidden=name!=="edit";draftSave.hidden=name!=="edit";submit.hidden=name!=="settings";
  tips.hidden=name!=="edit";tip.hidden=true;showNotice("");
  sync();return true;
 }
 function renderDrafts(){
  draftList.replaceChildren();
  for(const item of read()){
   const row=make("div","vatra-post-composer-draft ui-vatra-post-composer-draft-"+String(item.id).replace(/[^a-z0-9]/gi,""));
   const pickDraft=make("button","vt-vatra-post-composer-draft-open-001",item.body.slice(0,85)||t("Без тексту","No text"));
   pickDraft.type="button";pickDraft.addEventListener("click",()=>{
    selectedId=item.id;textarea.value=item.body;
    if(select)select.value=["public","friends","only_me"].includes(item.visibility)?item.visibility:"public";
    textarea.dispatchEvent(new Event("input",{bubbles:true}));
    setStage("edit");textarea.focus();
   });
   const remove=make("button","vt-vatra-post-composer-draft-remove-001","×");
   remove.type="button";remove.setAttribute("aria-label",t("Видалити чернетку","Delete draft"));
   remove.addEventListener("click",()=>{persist(read().filter(x=>x.id!==item.id));renderDrafts();});
   row.append(pickDraft,remove);draftList.append(row);
  }
  if(!draftList.children.length)draftList.append(make("p","vt-vatra-post-composer-draft-empty-001",
   t("Чернеток поки немає.","No drafts yet.")));
 }
 drafts.addEventListener("click",()=>{
  view="drafts";edit.hidden=true;settings.hidden=true;draftsPanel.hidden=false;
  back.hidden=false;drafts.hidden=true;next.hidden=true;draftSave.hidden=true;
  tips.hidden=true;submit.hidden=true;
  title.textContent=t("Чернетки","Drafts");renderDrafts();showNotice("");
 });
 back.addEventListener("click",()=>setStage("edit"));
 next.addEventListener("click",()=>{if(setStage("settings"))select?.focus({preventScroll:true});});
 textarea.addEventListener("input",sync);
 picker?.addEventListener("change",sync);
 q("#"+prefix+"-compose-media-remove")?.addEventListener("click",()=>queueMicrotask(sync));
 draftSave.addEventListener("click",()=>{
  const body=textarea.value.trim();
  if(!body){showNotice(t("Напишіть текст для збереження чернетки.","Write some text to save as a draft."));return;}
  const drafts=read(),now=Date.now(),id=selectedId||String(now);
  const others=drafts.filter(x=>x.id!==id);
  const worked=persist([{id,body:body.slice(0,2000),visibility:select?.value||"public",at:now},...others]);
  if(worked){selectedId=id;showNotice(picker?.files?.length?
   t("Текст збережено. Доданий файл потрібно вибрати знову при публікації.",
    "Text saved. You must reselect your file when publishing."):
   t("Чернетку збережено в цьому браузері.","Draft saved in this browser."));}
  else showNotice(t("Неможливо зберегти чернетку в цьому браузері.","Could not store the draft in this browser."));
 });
 dialog.addEventListener("close",()=>{setStage("edit");showNotice("");});
 dialog.addEventListener("cancel",()=>{if(!submit.disabled)setStage("edit");});
 form.prepend(header,edit,settings,draftsPanel);
 form.append(error,notice,footer);
 setStage("edit");
 return {reset(){if(selectedId){persist(read().filter(x=>x.id!==selectedId));selectedId=null;}setStage("edit");},
  step(){return stage;},setStage};
}
window.VATRA_COMPOSER_UI={bind};
})();
