(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
function create(item,{client,ownId,userId,locale,names,images,ownCommentLikes,node,t,memberUrl,dateText,feedback,clearCommentCache,onDelete}){
    const id=String(item.author_vatra_id);
    const member=names.get(id)||t("Учасник VATRA","VATRA member");
    const card=node("article","profile-photo-comment ui-profile-photo-comment-001 vatra-media-comment-row-001");
    card.dataset.commentId=String(item.id);
    const head=node("div","profile-photo-comment-head ui-profile-photo-comment-head-001");
    const avatar=node("a","profile-photo-comment-avatar ui-profile-photo-comment-avatar-001",
     member.split(/\s+/).slice(0,2).map(x=>Array.from(x)[0]||"").join("").toLocaleUpperCase(locale));
    avatar.href=memberUrl(id);avatar.setAttribute("aria-label",member);
    if(images.has(id)){
     avatar.style.backgroundImage="url("+JSON.stringify(images.get(id))+")";
     avatar.classList.add("has-photo");avatar.textContent="";
    }
    const meta=node("div","profile-photo-comment-meta ui-profile-photo-comment-meta-001");
    const author=node("a","vatra-profile-photo-comment-name-001",member);
    author.href=memberUrl(id);
    if(names.has(id))void window.VATRA_VERIFIED?.attach(client,author,id);
    const stamp=node("time","vatra-profile-photo-comment-time-001",dateText(item.created_at));
    stamp.dateTime=item.created_at;meta.append(author,node("p","vatra-profile-photo-comment-body-001",item.body),stamp);head.append(avatar,meta);
    card.append(head);
    if(item.moderation_status==="possible_spam")
     card.append(node("small","vatra-profile-photo-comment-spam-001",t("Можливий спам","Potential spam")));
    const reaction=node("button","vatra-profile-photo-comment-like-001");
    reaction.type="button";
    const reactionIcon=document.createElementNS("http://www.w3.org/2000/svg","svg");
    reactionIcon.setAttribute("class","ui-profile-photo-comment-heart-001");
    reactionIcon.setAttribute("viewBox","0 0 24 24");
    reactionIcon.setAttribute("width","16");reactionIcon.setAttribute("height","16");
    reactionIcon.setAttribute("stroke","currentColor");
    reactionIcon.setAttribute("stroke-width","1.8");
    reactionIcon.setAttribute("stroke-linejoin","round");
    reactionIcon.setAttribute("aria-hidden","true");
    const heartPath=document.createElementNS("http://www.w3.org/2000/svg","path");
    heartPath.setAttribute("class","ui-profile-photo-comment-heart-path-001");
    heartPath.setAttribute("d","M20.6 8.5c0 4.5-8.6 10-8.6 10s-8.6-5.5-8.6-10a4.6 4.6 0 0 1 8.6-2.2 4.6 4.6 0 0 1 8.6 2.2Z");
    reactionIcon.append(heartPath);
    const reactionLabel=node("span","vatra-profile-photo-comment-like-label-001");
    reaction.append(reactionIcon,reactionLabel);
    let countValue=Number(item.likes)||0,reacted=ownCommentLikes.has(item.id);
    const paint=()=>{
     reactionIcon.setAttribute("fill",reacted?"currentColor":"none");
     reactionLabel.textContent=countValue?String(countValue):"";reaction.setAttribute("aria-label",t("Подобається коментар","Like comment"));
     reaction.setAttribute("aria-pressed",String(reacted));
    };
    paint();
    reaction.addEventListener("click",async()=>{
     if(reaction.disabled)return;
     reaction.disabled=true;
     try{
      const result=reacted?
       await client.from("avatar_comment_likes").delete()
        .eq("comment_id",item.id).eq("liker_id",userId):
       await client.from("avatar_comment_likes").insert({comment_id:item.id,liker_id:userId});
      if(result.error)throw result.error;
      clearCommentCache();
      reacted=!reacted;countValue+=reacted?1:-1;paint();
     }catch(_){feedback(t("Не вдалося вподобати коментар.","Could not like the comment."),true);}
     finally{reaction.disabled=false;}
    });
    card.append(reaction);
    if(String(item.author_vatra_id)===String(ownId)){
     const remove=node("button","vatra-profile-photo-comment-delete-001 vatra-comment-hover-delete-001");
     card.classList.add("is-own");
     const cross=document.createElementNS("http://www.w3.org/2000/svg","svg");
     cross.setAttribute("class","ui-vatra-photo-comment-delete-icon-001");
     cross.setAttribute("viewBox","0 0 24 24");
     cross.setAttribute("width","18");cross.setAttribute("height","18");
     cross.setAttribute("fill","none");cross.setAttribute("stroke","currentColor");
     cross.setAttribute("stroke-width","1.8");cross.setAttribute("stroke-linecap","round");
     cross.setAttribute("aria-hidden","true");
     const lines=document.createElementNS("http://www.w3.org/2000/svg","path");
     lines.setAttribute("d","M5 5l14 14M19 5 5 19");
     cross.append(lines);remove.append(cross);
     remove.type="button";remove.setAttribute("aria-label",t("Видалити свій коментар","Delete your comment"));
     remove.addEventListener("click",async()=>{
      if(remove.disabled)return;
      if(!await window.VATRA_PROFILE_CONFIRM?.({
       title:t("Видалити свій коментар?","Delete your comment?"),
       description:t("Коментар буде видалено назавжди.","The comment will be permanently deleted."),
       action:t("Видалити","Delete")
      }))return;
      remove.disabled=true;
      try{
       const {data,error}=await client.from("avatar_comments").delete()
        .eq("id",item.id).eq("author_id",userId).select("id").maybeSingle();
       if(error||!data)throw error||Error("Delete not permitted");
       clearCommentCache();
       card.remove();onDelete();
       feedback(t("Коментар видалено.","Comment deleted."));
      }catch(_){
       remove.disabled=false;
       feedback(t("Не вдалося видалити коментар.","Could not delete comment."),true);
      }
     });
     card.append(remove);
    }
 return card;
}
window.VATRA_PROFILE_AVATAR_COMMENT_ROW=Object.freeze({create});
})();
