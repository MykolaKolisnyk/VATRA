(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
function mount({client,targetId,ownId,userId,q,node,t,home}){
 for(const settings of [
  {kind:"image",tab:"#profile-tab-photos",list:"#profile-photo-gallery",empty:"#profile-photos-empty",more:"#profile-photos-more"},
  {kind:"video",tab:"#profile-tab-videos",list:"#profile-video-gallery",empty:"#profile-videos-empty",more:"#profile-videos-more"},
  {kind:"video",clip:true,tab:"#profile-tab-clips",list:"#profile-clips-gallery",empty:"#profile-clips-empty",more:"#profile-clips-more"}
 ]){
  const tab=q(settings.tab),list=q(settings.list),empty=q(settings.empty),more=q(settings.more);
  if(!tab||!list||!empty||!more)continue;
  let busy=false,offset=0;
  const batchSize=settings.kind==="image"?6:12;
  const load=async(append=false)=>{
   if(busy)return;
   busy=true;list.setAttribute("aria-busy","true");more.disabled=true;
   if(!append){
    offset=0;
    const placeholders=Array.from({length:3},(_,i)=>{
     const tile=node("div","profile-media-placeholder ui-profile-media-placeholder-"+settings.kind+"-"+i);
     tile.setAttribute("aria-hidden","true");return tile;
    });
    list.replaceChildren(...placeholders);
   }
   empty.hidden=true;
   try{
    const contains=JSON.stringify([{media_kind:settings.kind}]);
    let query=client.from("feed_posts")
     .select("id,author_vatra_id,body,visibility,comments_enabled,created_at,media_kind,media_path,media_items")
     .eq("author_vatra_id",targetId).eq("is_clip",!!settings.clip)
     .or("media_kind.eq."+settings.kind+",media_items.cs."+contains);
    if(typeof query.is==="function")query=query.is("archived_at",null);
    const {data,error}=await query.order("created_at",{ascending:false}).order("id",{ascending:false})
     .range(offset,offset+batchSize-1);
    if(error)throw error;
    if(!append)list.replaceChildren();
    for(const post of data||[]){
     const items=Array.isArray(post.media_items)?post.media_items.filter(item=>
      item?.media_kind===settings.kind&&typeof item.media_path==="string"&&!!item.media_path):[];
     if(!items.length&&post.media_kind===settings.kind&&typeof post.media_path==="string"&&post.media_path)
      items.push({media_kind:post.media_kind,media_path:post.media_path});
     for(const item of settings.clip?items.slice(0,1):items){
      const tile=node("article","profile-media-tile ui-profile-media-tile-001");
      tile.setAttribute("aria-label",settings.clip?t("Кліп","Clip"):settings.kind==="image"?t("Фото","Photo"):t("Відео","Video"));
      list.append(tile);
      const selected=Array.isArray(post.media_items)&&post.media_items.length?
       {...post,media_items:[item]}:post;
      if(settings.kind==="image"){
       tile.addEventListener("click",event=>{
        const trigger=event.target?.closest?.(".vatra-post-gallery-tile,.vatra-feed-post-media-open-001");
        if(!trigger)return;
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
        void window.VATRA_POST_MEDIA?.openPostPhoto(client,post,item,{ownId,userId});
       },true);
      }
      if(settings.clip){
       const open=node("a","vatra-profile-clip-open-001",t("Відкрити кліп","Open clip"));
       open.href=new URL("clips?clip="+encodeURIComponent(post.id),home).href;
       void window.VATRA_POST_MEDIA?.mount(client,selected,tile).then(()=>{if(tile.isConnected)tile.append(open);});
      }else void window.VATRA_POST_MEDIA?.mount(client,selected,tile);
     }
    }
    offset+=(data||[]).length;
    more.hidden=(data||[]).length<batchSize;
    if(!list.children.length){
     empty.textContent=settings.clip?t("Кліпів поки немає.","No clips yet."):settings.kind==="image"?t("Фотографій поки немає.","No photos yet."):
      t("Відео поки немає.","No videos yet.");
     empty.hidden=false;
    }
   }catch(_){
    if(!append)list.replaceChildren();
    empty.textContent=t("Не вдалося завантажити медіа.","Could not load media.");
    empty.hidden=false;
   }finally{busy=false;list.setAttribute("aria-busy","false");more.disabled=false;}
  };
  const activate=()=>{if(tab.getAttribute("aria-selected")==="true")void load();};
  new MutationObserver(activate).observe(tab,{attributes:true,attributeFilter:["aria-selected"]});
  window.addEventListener("vatra:profile-media-changed",activate);
  activate();
  more.addEventListener("click",()=>void load(true));
 }
}
window.VATRA_PROFILE_GALLERY=Object.freeze({mount});
})();
