/* Company branding editor. Images are versioned, private, and signed on read. */
export async function openBusinessBrand({company,client,t,make,btn,dialog,field,submit,message,onSaved}){
 if(document.querySelector(".ui-business-brand-editor-001[open]"))return;
 const {d,form}=dialog(t("Оформлення компанії","Company branding"));d.classList.add("ui-business-brand-editor-001");let uploading=false;
 const allowed={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"},state={},urls=new Set();
 form.append(make("p","vt-business-heading-copy-001",t("Логотип — квадратний. Обкладинка — горизонтальна (3:1). JPG, PNG або WebP, до 6 МБ кожне.","Square logo and landscape cover (3:1). JPG, PNG or WebP, up to 6 MB each.")));
 function draw(kind,label){
  const column=make("section","ui-business-brand-field-001"),preview=make("div","ui-business-brand-preview-001 ui-business-brand-preview-"+kind+"-001"),path=company[kind+"_path"];
  state[kind]={path,file:null,remove:false,preview,local:null};
  const st=state[kind];const fallback=make("span","vt-business-brand-placeholder-001",kind==="logo"?company.name.trim().slice(0,1).toLocaleUpperCase():t("Обкладинка","Cover"));
  function put(src){preview.replaceChildren(fallback);if(src){const img=make("img","ui-business-brand-image-001");img.alt=label;img.addEventListener("error",()=>img.remove(),{once:true});img.src=src;preview.append(img);}}
  put("");if(path)void (async()=>{try{const r=await client.storage.from("business-media").createSignedUrl(path,900);if(!r.error&&r.data?.signedUrl&&!st.file&&!st.remove&&d.open)put(r.data.signedUrl);}catch(_){}})();
  const input=field(column,"business-brand-"+kind,label,"file");input.accept=Object.keys(allowed).join(",");
  const remove=btn(t("Прибрати зображення","Remove image"),"vt-business-secondary-001",()=>{st.remove=true;st.file=null;input.value="";put("");});
  input.addEventListener("change",()=>{const file=input.files?.[0];if(!file)return;if(!allowed[file.type]||file.size>6291456||file.size<1){input.value="";message(t("Оберіть JPG, PNG або WebP до 6 МБ.","Choose JPG, PNG or WebP up to 6 MB."),true);return;}if(st.local){URL.revokeObjectURL(st.local);urls.delete(st.local);}st.file=file;st.remove=false;st.local=URL.createObjectURL(file);urls.add(st.local);put(st.local);message("");});
  column.append(preview,remove);form.append(column);
 }
 draw("logo",t("Логотип","Logo"));draw("cover",t("Обкладинка","Cover"));
 submit(form,t("Зберегти оформлення","Save branding"),async()=>{
  if(uploading)return;const patch={},uploaded=[],obsolete=[];uploading=true;const controls=[...d.querySelectorAll("button,input")].filter(x=>!x.disabled);controls.forEach(x=>x.disabled=true);let saved=false;
  try{
   for(const [kind,st] of Object.entries(state)){if(!st.file&&!st.remove)continue;let path=null;if(st.file){path=company.id+"/"+kind+"/"+crypto.randomUUID()+"."+allowed[st.file.type];const r=await client.storage.from("business-media").upload(path,st.file,{contentType:st.file.type,upsert:false});if(r.error)throw r.error;uploaded.push(path);}patch[kind+"_path"]=path;if(st.path)obsolete.push(st.path);}
   if(Object.keys(patch).length){const r=await client.from("business_companies").update(patch).eq("id",company.id).select("id").single();if(r.error||!r.data)throw Error("save");saved=true;}
   if(saved&&obsolete.length)try{await client.storage.from("business-media").remove(obsolete);}catch(_){}
   d.close();await onSaved();
  }catch(_){if(!saved&&uploaded.length)try{await client.storage.from("business-media").remove(uploaded);}catch(_){}message(saved?t("Оформлення збережено. Оновіть сторінку.","Branding saved. Refresh the page."):t("Не вдалося зберегти оформлення.","Could not save branding."),true);}finally{uploading=false;controls.forEach(x=>x.disabled=false);}
 });d.addEventListener("cancel",e=>{if(uploading)e.preventDefault();});d.addEventListener("click",e=>{if(uploading&&e.target===d)e.stopImmediatePropagation();},true);d.addEventListener("close",()=>{for(const url of urls)URL.revokeObjectURL(url);d.remove();},{once:true});d.showModal();
}
