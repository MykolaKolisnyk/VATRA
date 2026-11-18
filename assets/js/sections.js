(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const root=new URL("../../",document.currentScript.src);
const page=document.body.dataset.page;
const locale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
const t=(uk,en)=>locale==="uk"?uk:locale==="en"?en:(window.VATRA_LANGUAGE?.translate?.(uk)||uk);
const $=s=>document.querySelector(s);
const make=(tag,cls,txt)=>{const el=document.createElement(tag);el.className=cls;if(txt!==undefined)el.textContent=txt;return el;};
const link=(label,url,cls)=>{const el=make("a",cls,label);el.href=new URL(url,root).href;return el;};
const btn=(label,cls,fn)=>{const el=make("button",cls,label);el.type="button";el.addEventListener("click",fn);return el;};
const valid=id=>/^[1-9][0-9]{0,18}$/.test(String(id??""));
const title=$("#vatra-section-title"),subtitle=$("#vatra-section-subtitle"),action=$("#vatra-section-action"),content=$("#vatra-section-content"),notice=$("#vatra-section-status");
let client,user,ownId,renderTicket=0;
const message=(text,error=false)=>{notice.hidden=!text;notice.dataset.kind=error?"error":"info";notice.textContent=text;
 const local=document.querySelector("dialog[open] .vt-vatra-section-dialog-status-001");if(local){local.hidden=!text;local.dataset.kind=error?"error":"info";local.textContent=text;}};
const empty=(text)=>make("p","vt-vatra-section-empty-001",text);
const card=(cls)=>make("section","ui-vatra-section-card-001 "+cls);
const field=(form,key,label,type="text",max=100,required=false)=>{const wrap=make("div","ui-vatra-section-field-"+key),lab=make("label","vt-vatra-section-label-"+key,label),el=make(type==="textarea"?"textarea":"input","ui-vatra-section-input-"+key);
el.id="vatra-section-"+key;lab.htmlFor=el.id;if(type!=="textarea")el.type=type;el.maxLength=max;el.required=required;if(type==="textarea")el.rows=4;wrap.append(lab,el);form.append(wrap);return el;};
const submit=(form,label,fn)=>{const b=make("button","vt-vatra-section-submit-001",label);b.type="submit";form.append(b);form.addEventListener("submit",async e=>{e.preventDefault();if(b.disabled)return;b.disabled=true;message("");try{await fn();}catch(_){message(t("Не вдалося зберегти. Спробуйте ще раз.","Could not save. Please retry."),true);}finally{b.disabled=false;}});return b;};
async function confirmRemove(){
 return new Promise(resolve=>{const d=make("dialog","ui-vatra-section-dialog-001 ui-vatra-section-confirm-001"),head=make("header","ui-vatra-section-dialog-head-001"),body=make("div","ui-vatra-section-dialog-form-001");
 head.append(make("h2","vt-vatra-section-dialog-title-001",t("Видалити оголошення?","Delete listing?")));
 body.append(make("p","vt-vatra-section-form-note-001",t("Цю дію неможливо скасувати.","This action cannot be undone.")));
 const buttons=make("div","ui-vatra-market-controls-001");let accepted=false;
 buttons.append(btn(t("Скасувати","Cancel"),"vt-vatra-section-confirm-cancel-001",()=>d.close()),btn(t("Видалити","Delete"),"vt-vatra-section-confirm-delete-001",()=>{accepted=true;d.close();}));body.append(buttons);d.append(head,body);document.body.append(d);d.addEventListener("close",()=>{d.remove();resolve(accepted);},{once:true});d.showModal();});
}
function tabs(items,onChange){const bar=make("div","ui-vatra-section-tabs-001");bar.setAttribute("role","group");for(const [id,label] of items){const b=btn(label,"vt-vatra-section-tab-"+id,()=>{for(const el of bar.children){el.classList.toggle("is-active",el===b);el.setAttribute("aria-pressed",String(el===b));}onChange(id);});b.dataset.tab=id;b.setAttribute("aria-pressed","false");bar.append(b);}bar.firstElementChild?.classList.add("is-active");bar.firstElementChild?.setAttribute("aria-pressed","true");return bar;}
const dialog=(heading)=>{const d=make("dialog","ui-vatra-section-dialog-001"),head=make("header","ui-vatra-section-dialog-head-001");head.append(make("h2","vt-vatra-section-dialog-title-001",heading),btn("×","vt-vatra-section-dialog-close-001",()=>d.close()));const form=make("form","ui-vatra-section-dialog-form-001");const status=make("p","vt-vatra-section-dialog-status-001");status.hidden=true;status.setAttribute("role","status");d.append(head,form,status);document.body.append(d);d.addEventListener("close",()=>message(""));d.addEventListener("click",e=>{if(e.target===d)d.close();});return {d,form};};
async function nameOf(id){const {data}=await client.from("public_profiles").select("display_name").eq("vatra_id",id).maybeSingle();return data?.display_name||t("Учасник VATRA","VATRA member");}
async function clips(){
 title.textContent=t("Кліпи","Clips");subtitle.textContent=t("Короткі відео від людей у VATRA.","Short videos from people in VATRA.");
 action.textContent=t("Додати кліп","Create clip");action.hidden=false;
 const grid=make("div","ui-vatra-clips-grid-001");content.append(grid);
 const load=async()=>{
  const ticket=++renderTicket;grid.setAttribute("aria-busy","true");
  const {data,error}=await client.from("feed_posts").select("id,author_vatra_id,body,media_items,created_at").eq("is_clip",true).is("archived_at",null).order("created_at",{ascending:false}).limit(60);
  if(ticket!==renderTicket)return;grid.replaceChildren();grid.setAttribute("aria-busy","false");
  if(error){message(t("Не вдалося завантажити кліпи.","Could not load clips."),true);return;}
  message("");if(!data?.length){grid.append(empty(t("Кліпів поки немає. Додайте перший!","No clips yet. Add the first one!")));return;}
  for(const post of data){const item=post.media_items?.[0];const id=String(post.author_vatra_id);if(!valid(id)||item?.media_kind!=="video"||typeof item.media_path!=="string"||!item.media_path.startsWith(id+"/posts/"))continue;
   const c=card("ui-vatra-clip-card-001"),frame=make("div","ui-vatra-clip-frame-001"),play=btn(t("Відтворити","Play"),"vt-vatra-clip-play-001",async()=>{
    if(play.disabled)return;play.disabled=true;try{const url=await window.VATRA_POST_MEDIA.signed(client,"video",item.media_path,900);if(!frame.isConnected)return;
    for(const v of document.querySelectorAll(".ui-vatra-clip-video-001"))v.pause();
    const video=make("video","ui-vatra-clip-video-001");video.controls=true;video.playsInline=true;video.preload="metadata";video.src=url;video.addEventListener("play",()=>{for(const v of document.querySelectorAll(".ui-vatra-clip-video-001"))if(v!==video)v.pause();});frame.replaceChildren(video);void video.play().catch(()=>{});}catch(_){play.textContent=t("Повторити","Retry");play.disabled=false;}});
   frame.append(play);const info=make("div","ui-vatra-clip-info-001"),author=link("VATRA ID "+id,"id"+id,"vt-vatra-clip-author-001");void nameOf(id).then(name=>{author.textContent=name;void window.VATRA_VERIFIED?.attach(client,author,id);}).catch(()=>{});
   info.append(author,make("p","vt-vatra-clip-caption-001",post.body||""),link(t("Відкрити публікацію","Open post"),"feed?post="+encodeURIComponent(post.id),"vt-vatra-clip-post-001"));c.append(frame,info);grid.append(c);
  }
 };
 const {d,form}=dialog(t("Новий кліп","New clip"));
 const file=field(form,"clip-file",t("Відео MP4 або WebM · до 50 МБ, до 60 секунд","MP4 or WebM · up to 50 MB and 60 seconds"),"file",100,true);file.accept="video/mp4,video/webm";
 const body=field(form,"clip-caption",t("Опис кліпу","Caption"),"textarea",2000);
 form.append(make("p","vt-vatra-section-form-note-001",t("Кліп з’явиться у розділі Кліпи та у ваших публікаціях. Видимість — публічна в межах налаштувань приватності профілю.","Your clip will appear in Clips and your posts, subject to profile privacy.")));
 submit(form,t("Опублікувати кліп","Publish clip"),async()=>{
  const f=file.files?.[0];if(!f||!["video/mp4","video/webm"].includes(f.type)||f.size>52428800){message(t("Виберіть MP4 або WebM до 50 МБ.","Choose MP4 or WebM up to 50 MB."),true);return;}
  let url=URL.createObjectURL(f);let probe=document.createElement("video");probe.preload="metadata";
  let duration;try{duration=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error("timeout")),10000);probe.onloadedmetadata=()=>{clearTimeout(timeout);resolve(probe.duration);};probe.onerror=()=>{clearTimeout(timeout);reject(Error("video"));};probe.src=url;});}finally{probe.removeAttribute("src");probe.load();URL.revokeObjectURL(url);}
  if(!Number.isFinite(duration)||duration<=0||duration>60){message(t("Тривалість кліпу має бути до 60 секунд.","A clip must be up to 60 seconds."),true);return;}
  let uploaded;try{uploaded=await window.VATRA_POST_MEDIA.upload(client,ownId,f);const {error}=await client.from("feed_posts").insert({author_id:user.id,author_vatra_id:ownId,body:body.value.trim(),visibility:"public",is_clip:true,media_items:[uploaded]});if(error)throw error;}catch(e){if(uploaded)await window.VATRA_POST_MEDIA.removeGallery(client,[uploaded]).catch(()=>{});throw e;}
  form.reset();d.close();await load();
 });
 action.addEventListener("click",()=>d.showModal());await load();
}
const categories=[["electronics","Електроніка","Electronics"],["clothes","Одяг","Clothing"],["home","Дім і сад","Home & garden"],["transport","Транспорт","Transport"],["sport","Спорт і хобі","Sports & hobbies"],["other","Інше","Other"]];
async function marketplace(){
 title.textContent=t("Маркетплейс","Marketplace");subtitle.textContent=t("Купуйте та продавайте у спільноті VATRA.","Buy and sell in the VATRA community.");action.textContent=t("Створити оголошення","Create listing");action.hidden=false;
 let mine=false,category="all",term="",rows=[];
 const toolbar=card("ui-vatra-market-toolbar-001"),grid=make("div","ui-vatra-market-grid-001");
 const mode=tabs([["all",t("Усі оголошення","All listings")],["mine",t("Мої оголошення","My listings")]],id=>{mine=id==="mine";void load();});toolbar.append(mode);
 const find=make("input","ui-vatra-market-search-001");find.type="search";find.placeholder=t("Пошук оголошень","Search listings");find.setAttribute("aria-label",find.placeholder);find.addEventListener("input",()=>{term=find.value.trim().toLocaleLowerCase();render();});toolbar.append(find);
 toolbar.append(tabs([["all",t("Усі категорії","All categories")],...categories.map(c=>[c[0],t(c[1],c[2])])],id=>{category=id;render();}));content.append(toolbar,grid);
 const render=()=>{grid.replaceChildren();const visible=rows.filter(r=>(category==="all"||r.category===category)&&(!term||(r.title+" "+r.description+" "+r.city).toLocaleLowerCase().includes(term)));
  if(!visible.length){grid.append(empty(t("Оголошень не знайдено.","No listings found.")));return;}
  for(const row of visible){const c=card("ui-vatra-market-listing-001"),photo=make("div","ui-vatra-market-photo-001"),info=make("div","ui-vatra-market-info-001");photo.append(make("span","vt-vatra-market-photo-placeholder-001",t("Фото","Photo")));
   if(row.image_path){void client.storage.from("marketplace-images").createSignedUrl(row.image_path,900).then(({data,error})=>{if(error||!data?.signedUrl||!photo.isConnected)return;const img=make("img","ui-vatra-market-image-001");img.alt=row.title;img.loading="lazy";img.src=data.signedUrl;photo.replaceChildren(img);}).catch(()=>{});}
   info.append(make("strong","vt-vatra-market-price-001",new Intl.NumberFormat(locale==="en"?"en-GB":"uk-UA",{style:"currency",currency:"UAH",maximumFractionDigits:2}).format(Number(row.price))),make("h2","vt-vatra-market-title-001",row.title),make("p","vt-vatra-market-description-001",row.description));
   if(row.city)info.append(make("span","vt-vatra-market-city-001",row.city));
   const seller=link(t("Профіль продавця","Seller profile"),"id"+row.seller_vatra_id,"vt-vatra-market-seller-001");info.append(seller);
   if(String(row.seller_vatra_id)===ownId){const controls=make("div","ui-vatra-market-controls-001");controls.append(btn(row.status==="sold"?t("Відновити","Reactivate"):t("Позначити проданим","Mark sold"),"vt-vatra-market-sold-001",async()=>{const {data,error}=await client.from("vatra_marketplace_listings").update({status:row.status==="sold"?"active":"sold"}).eq("id",row.id).select("id").maybeSingle();if(error||!data)message(t("Не вдалося оновити оголошення.","Could not update listing."),true);else await load();}),btn(t("Видалити","Delete"),"vt-vatra-market-delete-001",async()=>{if(!await confirmRemove())return;const {data,error}=await client.from("vatra_marketplace_listings").delete().eq("id",row.id).select("id").maybeSingle();if(error||!data){message(t("Не вдалося видалити.","Could not delete."),true);return;}let cleanupError=false;if(row.image_path){try{const removed=await client.storage.from("marketplace-images").remove([row.image_path]);cleanupError=Boolean(removed.error);}catch(_){cleanupError=true;}}await load();if(cleanupError)message(t("Оголошення видалено, фото потребує очищення.","Listing deleted; photo cleanup is required."),true);}));info.append(controls);}
   if(row.status==="sold")info.append(make("span","vt-vatra-market-sold-label-001",t("Продано","Sold")));c.append(photo,info);grid.append(c);
  }
 };
 const load=async()=>{const ticket=++renderTicket;let query=client.from("vatra_marketplace_listings").select("id,seller_vatra_id,title,description,category,price,city,image_path,status,created_at");query=mine?query.eq("seller_vatra_id",ownId):query.eq("status","active");const {data,error}=await query.order("created_at",{ascending:false}).limit(100);if(ticket!==renderTicket)return;if(error){message(t("Не вдалося завантажити оголошення.","Could not load listings."),true);grid.replaceChildren();return;}rows=data||[];message("");render();};
 const {d,form}=dialog(t("Нове оголошення","New listing"));const name=field(form,"market-name",t("Назва","Title"),"text",100,true);name.minLength=3;
 const description=field(form,"market-description",t("Опис","Description"),"textarea",2000,true),price=field(form,"market-price",t("Ціна, грн","Price, UAH"),"number",30,true);price.min="0";price.max="999999999";price.step="0.01";const city=field(form,"market-city",t("Місто","City"),"text",100),photo=field(form,"market-photo",t("Фото · до 6 МБ","Photo · up to 6 MB"),"file");photo.accept="image/jpeg,image/png,image/webp";let picked=categories[0][0];form.append(make("span","vt-vatra-market-category-label-001",t("Категорія","Category")),tabs(categories.map(c=>[c[0],t(c[1],c[2])]),id=>{picked=id;}));
 form.append(make("p","vt-vatra-section-form-note-001",t("VATRA поки не обробляє платежі. Не переказуйте гроші незнайомим без перевірки.","VATRA does not process payments. Verify sellers before sending money.")));
 submit(form,t("Опублікувати оголошення","Publish listing"),async()=>{const f=photo.files?.[0];let path=null;try{if(f){const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[f.type];if(!ext||f.size>6291456){message(t("Оберіть JPG, PNG або WebP до 6 МБ.","Choose JPG, PNG or WebP up to 6 MB."),true);return;}path=ownId+"/"+crypto.randomUUID()+"."+ext;const {error}=await client.storage.from("marketplace-images").upload(path,f,{contentType:f.type,upsert:false});if(error){path=null;throw error;}}
 const {error}=await client.from("vatra_marketplace_listings").insert({seller_vatra_id:ownId,title:name.value.trim(),description:description.value.trim(),price:Number(price.value),category:picked,city:city.value.trim(),image_path:path});if(error)throw error;}catch(e){if(path)await client.storage.from("marketplace-images").remove([path]).catch(()=>{});throw e;}form.reset();d.close();await load();});
 action.addEventListener("click",()=>d.showModal());await load();
}
async function account(){
 title.textContent="VATRA ID";subtitle.textContent=t("Ваші дані та безпека акаунта.","Your account information and security.");
 const layout=make("div","ui-vatra-id-layout-001"),side=card("ui-vatra-id-sidebar-001"),panel=make("div","ui-vatra-id-content-001");
 const nav=tabs([["personal",t("Мої дані","My data")],["security",t("Безпека","Security")],["verification",t("Верифікація","Verification")]],id=>{if(location.hash.slice(1)===id)void show(id);else location.hash=id;});side.append(nav,link(t("Повернутися до VATRA","Return to VATRA"),"id"+ownId,"vt-vatra-id-back-001"));layout.append(side,panel);content.append(layout);
 const show=async(id)=>{const ticket=++renderTicket;panel.replaceChildren();message("");for(const b of nav.children){b.classList.toggle("is-active",b.dataset.tab===id);b.setAttribute("aria-pressed",String(b.dataset.tab===id));}
 if(id==="security"){const c=card("ui-vatra-id-security-001");c.append(make("h2","vt-vatra-id-heading-001",t("Безпека акаунта","Account security")),make("p","vt-vatra-id-email-001",user.email||""),make("p","vt-vatra-id-email-status-001",user.email_confirmed_at?t("Електронну пошту підтверджено","Email confirmed"):t("Пошта не підтверджена","Email not confirmed")),link(t("Відновлення пароля","Password recovery"),"forgot","vt-vatra-id-password-001"));panel.append(c);return;}
 if(id==="verification"){const c=card("ui-vatra-id-verification-001");c.append(make("h2","vt-vatra-id-heading-001",t("Верифікація сторінки","Profile verification")));panel.append(c);
  const [v,request]=await Promise.all([client.from("verified_accounts").select("vatra_id").eq("vatra_id",ownId).maybeSingle(),client.from("vatra_verification_requests").select("status,created_at").eq("vatra_id",ownId).maybeSingle()]);if(ticket!==renderTicket)return;
  if(v.error||request.error){c.append(empty(t("Статус верифікації недоступний.","Verification status unavailable.")));return;}
  if(v.data){c.append(make("p","vt-vatra-id-verification-result-001",t("Вашу сторінку верифіковано.","Your profile is verified.")));return;}
  if(request.data){const status={pending:t("Заявка на розгляді","Application pending"),approved:t("Заявку схвалено; галочка з’явиться після підтвердження VATRA.","Application approved; awaiting VATRA confirmation."),rejected:t("Заявку відхилено","Application rejected")}[request.data.status];c.append(make("p","vt-vatra-id-verification-result-001",status));return;}
  c.append(make("p","vt-vatra-id-verification-copy-001",t("Подайте заявку на підтвердження справжності сторінки. Рішення приймає адміністрація VATRA. Не додавайте паролі, номери документів або банківські дані.","Apply to confirm the authenticity of your profile. VATRA reviews applications. Do not include passwords, ID numbers or bank details.")));
  const form=make("form","ui-vatra-id-verification-form-001"),reason=field(form,"verify-reason",t("Чому ваша сторінка потребує верифікації?","Why does your profile need verification?"),"textarea",1000,true);reason.minLength=10;c.append(form);submit(form,t("Подати заявку","Apply"),async()=>{const {error}=await client.from("vatra_verification_requests").insert({vatra_id:ownId,reason:reason.value.trim()});if(error)throw error;await show("verification");});return;}
 const c=card("ui-vatra-id-personal-001"),identity=make("div","ui-vatra-id-identity-001"),avatar=make("span","ui-vatra-id-avatar-001");window.VATRA_AVATAR?.fallback(avatar,"default");const info=make("div","ui-vatra-id-identity-info-001"),display=make("h2","vt-vatra-id-heading-001",await nameOf(ownId));if(ticket!==renderTicket)return;info.append(display,make("span","vt-vatra-id-number-001","VATRA ID "+ownId));identity.append(avatar,info);c.append(identity);
 void client.from("profile_media").select("avatar_path").eq("vatra_id",ownId).maybeSingle().then(({data,error})=>{if(!error&&data?.avatar_path&&data.avatar_path.startsWith(ownId+"/avatar/")&&avatar.isConnected){const url=client.storage.from("avatars").getPublicUrl(data.avatar_path).data?.publicUrl;if(url){avatar.style.backgroundImage="url("+JSON.stringify(url)+")";avatar.classList.add("has-photo");}}}).catch(()=>{});
 const form=make("form","ui-vatra-id-personal-form-001"),first=field(form,"first-name",t("Ім’я","First name"),"text",40,true),last=field(form,"last-name",t("Прізвище","Last name"),"text",40,true);first.value=user.user_metadata?.first_name||display.textContent.split(" ")[0]||"";last.value=user.user_metadata?.last_name||display.textContent.split(" ").slice(1).join(" ");const note=make("p","vt-vatra-section-form-note-001",t("VATRA ID залишається незмінним. Ім’я та прізвище відображатимуться у профілі.","Your VATRA ID remains unchanged. Your name is displayed on your profile."));form.append(note);c.append(form);panel.append(c);
 submit(form,t("Зберегти зміни","Save changes"),async()=>{const a=first.value.trim(),b=last.value.trim(),name=a+" "+b;if(a.length<1||b.length<1||name.length>80){message(t("Заповніть ім’я та прізвище (до 80 символів разом).","Enter first and last name (up to 80 characters in total)."),true);return;}
 const {data,error}=await client.from("public_profiles").update({display_name:name}).eq("vatra_id",ownId).select("display_name").maybeSingle();if(error||data?.display_name!==name)throw error||Error("name not saved");display.textContent=name;const auth=await client.auth.updateUser({data:{first_name:a,last_name:b,full_name:name}});if(auth.error){message(t("Ім’я у профілі змінено, але не вдалося синхронізувати акаунт. Повторіть збереження.","Profile name changed, but account sync failed. Save again."),true);return;}user=auth.data.user||user;window.VATRA_AVATAR?.setHeader({email:user.email,name:a.slice(0,28),initials:(a[0]+b[0]).toLocaleUpperCase(),id:ownId});message(t("Зміни збережено.","Changes saved."));});
 };
 const open=()=>{const id=location.hash.slice(1);return show(["personal","security","verification"].includes(id)?id:"personal");};
 window.addEventListener("hashchange",()=>void open());await open();
}
async function boot(){
 try{await window.VATRA_LANGUAGE?.ready;
 client=window.supabase?.createClient("https://rjasunoawrxvetwadylh.supabase.co","sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}});
 if(!client)throw Error("client");
 const result=await client.auth.getUser();user=result.data?.user;
 if(result.error||!user?.id||!user.email_confirmed_at){location.replace(root.href);return;}
 const account=await client.from("accounts").select("vatra_id").eq("user_id",user.id).maybeSingle();if(account.error||!valid(account.data?.vatra_id))throw Error("account");ownId=String(account.data.vatra_id);
 const name=String(user.user_metadata?.first_name||user.user_metadata?.full_name||"VATRA");window.VATRA_AVATAR?.setHeader({email:user.email,name:name.split(/\s+/)[0].slice(0,28),initials:name.slice(0,1),id:ownId});window.VATRA_AVATAR?.applyRemembered($("#feed-header-avatar"),user.email);
 void client.from("profile_media").select("avatar_path").eq("vatra_id",ownId).maybeSingle().then(({data,error})=>{if(!error&&data?.avatar_path)window.VATRA_AVATAR?.fromPath(client,user.email,ownId,data.avatar_path);}).catch(()=>{});
 void window.VATRA_PRESENCE?.start(client,ownId,user.user_metadata?.gender);window.VATRA_NOTIFICATIONS?.start(client,ownId);
 const id=$("#feed-header-id");if(id)id.textContent="VATRA ID "+ownId;
 for(const el of document.querySelectorAll("[data-social-uk]"))el.textContent=t(el.dataset.socialUk,el.dataset.socialEn);
 for(const a of document.querySelectorAll('a[href="profile"]'))a.href=new URL("id"+ownId,root).href;
 $("#feed-search-form")?.addEventListener("submit",e=>{e.preventDefault();const query=$("#feed-search-input")?.value.trim()||"";location.assign(new URL("feed"+(query?"?q="+encodeURIComponent(query):""),root).href);});
 $("#feed-logout")?.addEventListener("click",async()=>{const {error}=await client.auth.signOut({scope:"local"});if(error)return;window.VATRA_AVATAR?.clearHeader();location.replace(root.href);});
 $("#feed-app").hidden=false;$("#feed-loading").hidden=true;document.body.dataset.authReady="true";document.body.dataset.feedReady="true";document.body.classList.remove("vatra-shell-pending");
 try{if(page==="clips")await clips();else if(page==="marketplace")await marketplace();else await account();}finally{content.setAttribute("aria-busy","false");}
 document.title=title.textContent+" · VATRA";
 }catch(_){const loader=$("#feed-loading");if(loader&&!loader.hidden)loader.textContent=t("Не вдалося відкрити VATRA. Оновіть сторінку.","Could not open VATRA. Refresh the page.");else message(t("Не вдалося завантажити розділ.","Could not load section."),true);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else void boot();
})();
