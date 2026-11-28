export function createClipComposer({dialog,field,t,make,submit,message,client,ownId,user,load}){
 const {d,form}=dialog(t("Новий кліп","New clip"));
 const file=field(form,"clip-file",t("Відео · до 50 МБ, до 60 секунд","Video · up to 50 MB and 60 seconds"),"file",100,true);file.accept=window.VATRA_POST_MEDIA.VIDEO_ACCEPT;
 const body=field(form,"clip-caption",t("Опис кліпу","Caption"),"textarea",2000);
 form.append(make("p","vatra-section-form-note-001",t("Кліп з’явиться лише у розділі «Кліпи» та у вкладці «Кліпи» вашого профілю. Видимість залежить від приватності профілю.","Your clip will appear only in Clips and your profile’s Clips tab, subject to profile privacy.")));
 submit(form,t("Опублікувати кліп","Publish clip"),async()=>{
  let f=file.files?.[0];if(!window.VATRA_POST_MEDIA.isVideoInput(f)||!f.size||f.size>52428800){message(t("Виберіть відео до 50 МБ.","Choose a video up to 50 MB."),true);return;}
  message(t("Обробка відео…","Processing video…"));
  try{f=await window.VATRA_POST_MEDIA.prepareVideo(f);}catch(error){message(error.message,true);return;}
  let url=URL.createObjectURL(f);let probe=document.createElement("video");probe.preload="metadata";
  let duration;try{duration=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error("timeout")),10000);probe.onloadedmetadata=()=>{clearTimeout(timeout);resolve(probe.duration);};probe.onerror=()=>{clearTimeout(timeout);reject(Error("video"));};probe.src=url;});}finally{probe.removeAttribute("src");probe.load();URL.revokeObjectURL(url);}
  if(!Number.isFinite(duration)||duration<=0||duration>60){message(t("Тривалість кліпу має бути до 60 секунд.","A clip must be up to 60 seconds."),true);return;}
  let uploaded;try{uploaded=await window.VATRA_POST_MEDIA.uploadClip(client,ownId,f);const {error}=await client.from("feed_posts").insert({author_id:user.id,author_vatra_id:ownId,body:body.value.trim(),visibility:"public",is_clip:true,media_items:[uploaded]});if(error)throw error;}catch(e){if(uploaded)await window.VATRA_POST_MEDIA.removeGallery(client,[uploaded]).catch(()=>{});throw e;}
  form.reset();d.close();await load();
 });
 return d;
}
