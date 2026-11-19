/* Business storefronts reuse moderated Marketplace listings; no parallel sales database. */
export async function renderBusinessStores({target,client,t,make,link,btn,card,tabs,heading,companySelector,selected,roleOf,ownId,message,confirmRemove,err,initialMode,onMode,browseCompany}){
 const cols="id,seller_vatra_id,title,description,price,currency,image_path,status,moderation_status";
 const owner=roleOf(selected)==="owner";let mode=initialMode==="manage"?"manage":"browse",ticket=0;
 const area=make("div","ui-business-store-area-001"),nav=tabs([["browse",t("Каталог товарів","Product catalogue")],["manage",t("Мій магазин","My store")]],key=>{mode=key;onMode(key);void load();});
 for(const b of nav.children){const active=b.dataset.tab===mode;b.classList.toggle("is-active",active);b.setAttribute("aria-pressed",String(active));}
 target.append(heading(t("Магазини","Stores"),t("Товари компаній, які пройшли перевірку маркетплейсу VATRA.","Company products approved by VATRA Marketplace.")),nav,area);
 const empty=copy=>make("p","vt-business-empty-001",copy);
 function makeListing(row,company,controls){
  const box=card("ui-business-store-card-001"),media=make("div","ui-business-store-photo-001"),info=make("div","ui-business-store-info-001");
  const amount=Number(row.price),currency=["UAH","EUR","USD"].includes(row.currency)?row.currency:"UAH";
  const price=Number.isFinite(amount)?new Intl.NumberFormat(document.documentElement.lang||"uk",{style:"currency",currency}).format(amount):"—";
  media.append(make("span","vt-business-store-photo-placeholder-001",t("Без фото","No photo")));
  if(typeof row.image_path==="string"&&row.image_path.startsWith(String(row.seller_vatra_id)+"/")){
   void (async()=>{try{const {data,error}=await client.storage.from("marketplace-images").createSignedUrl(row.image_path,900);if(error||!data?.signedUrl||!media.isConnected)return;const img=make("img","ui-business-store-image-001");img.alt=row.title;img.loading="lazy";img.addEventListener("error",()=>img.remove(),{once:true});img.src=data.signedUrl;media.append(img);}catch(_){}})();
  }
  info.append(make("strong","vt-business-store-price-001",price),make("h3","vt-business-store-title-001",row.title));
  if(company?.name)info.append(link(company.name,"business?company="+encodeURIComponent(company.id),"vt-business-company-link-001"));
  info.append(make("p","vt-business-store-description-001",row.description));
  const actions=make("div","ui-business-store-actions-001");actions.append(link(t("Переглянути оголошення","View listing"),"marketplace?item="+encodeURIComponent(row.id),"vt-business-secondary-001 vt-business-page-action-001"));
  if(controls)controls(actions);info.append(actions);box.append(media,info);return box;
 }
 async function mutate(button,fn){if(button.disabled)return;button.disabled=true;message("");try{const r=await fn();if(r.error)throw r.error;await load();}catch(_){message(err,true);}finally{button.disabled=false;}}
 async function load(){
  const token=++ticket;area.replaceChildren();const body=make("div","ui-business-store-area-001");area.append(body);
  const grid=make("div","ui-business-store-grid-001");
  try{
   if(mode==="manage"){
    if(!selected){body.append(empty(t("Спочатку створіть компанію.","Create a company first.")));return;}
    body.append(companySelector());if(!owner){body.append(empty(t("Додавати та вилучати оголошення магазину може власник компанії.","Only the company owner can add or remove store listings.")));return;}
    body.append(make("p","vt-business-heading-copy-001",t("Додайте свої схвалені оголошення до магазину. Створення, редагування й модерація товарів залишаються в маркетплейсі.","Add your approved listings to the store. Listing creation, editing and moderation remain in Marketplace.")),link(t("До маркетплейсу","Go to Marketplace"),"marketplace","vt-business-primary-001 vt-business-page-action-001"),grid);
    const [linked,available]=await Promise.all([client.from("business_store_listings").select("listing_id,marketplace_listings("+cols+")").eq("company_id",selected).order("created_at",{ascending:false}).limit(100),client.from("marketplace_listings").select(cols).eq("seller_vatra_id",ownId).eq("status","active").eq("moderation_status","approved").order("created_at",{ascending:false}).limit(100)]);
    if(token!==ticket||!body.isConnected)return;if(linked.error||available.error)throw Error("store query");
    const ids=new Set((linked.data||[]).map(x=>x.listing_id));
    for(const row of linked.data||[]){if(!row.marketplace_listings)continue;const product=row.marketplace_listings;grid.append(makeListing(product,null,actions=>{if(product.status!=="active"||product.moderation_status!=="approved")actions.append(make("span","vt-business-company-meta-001",t("Не відображається покупцям","Hidden from buyers")));
     const b=btn(t("Прибрати з магазину","Remove from store"),"vt-business-secondary-001",async()=>{if(await confirmRemove(t("Прибрати товар із магазину?","Remove product from store?"),t("Оголошення залишиться в маркетплейсі.","The listing will remain in Marketplace."),t("Прибрати","Remove")))void mutate(b,()=>client.from("business_store_listings").delete().eq("listing_id",row.listing_id).eq("company_id",selected));});actions.append(b);}));
    }if(!grid.children.length)grid.append(empty(t("У магазині ще немає товарів.","The store has no products yet.")));
    const add=make("div","ui-business-store-grid-001");body.append(heading(t("Додати з маркетплейсу","Add from Marketplace"),null,true),add);
    for(const product of (available.data||[]).filter(row=>!ids.has(row.id))){add.append(makeListing(product,null,actions=>{const b=btn(t("Додати","Add"),"vt-business-primary-001",()=>void mutate(b,()=>client.from("business_store_listings").insert({company_id:selected,listing_id:product.id})));actions.append(b);}));}
    if(!add.children.length)add.append(empty(t("Немає інших схвалених активних оголошень.","No other approved active listings.")));
   }else{
    const search=make("input","ui-business-directory-search-001");search.type="search";search.maxLength=100;search.placeholder=t("Пошук товарів у магазинах","Search store products");search.setAttribute("aria-label",search.placeholder);body.append(search,grid);
    let seq=0,timer;const browse=async()=>{const key=++seq;let q=client.from("business_store_listings").select("listing_id,company_id,business_companies(id,name),marketplace_listings!inner("+cols+")").eq("marketplace_listings.status","active").eq("marketplace_listings.moderation_status","approved").order("created_at",{ascending:false}).limit(60);if(browseCompany)q=q.eq("company_id",browseCompany);const term=search.value.trim().replace(/[%_]/g,"");if(term)q=q.ilike("marketplace_listings.title","%"+term+"%");const r=await q;if(key!==seq||token!==ticket||!body.isConnected)return;grid.replaceChildren();if(r.error){grid.append(empty(err));return;}for(const row of r.data||[]){if(row.marketplace_listings)grid.append(makeListing(row.marketplace_listings,row.business_companies));}if(!grid.children.length)grid.append(empty(t("Товарів не знайдено.","No products found.")));};
    search.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>void browse(),250);});await browse();
   }
  }catch(_){if(token===ticket&&body.isConnected)body.replaceChildren(empty(err));}
 }
 await load();
}
