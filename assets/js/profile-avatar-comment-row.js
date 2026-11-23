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
    const commentText=node("p","vatra-profile-photo-comment-body-001",item.body);
    stamp.dateTime=item.created_at;meta.append(author,commentText,stamp);head.append(avatar,meta);
    card.append(head);
    if(item.moderation_status==="possible_spam")
     card.append(node("small","vatra-profile-photo-comment-spam-001",t("Можливий спам","Potential spam")));
    const reaction=node("button","vatra-profile-photo-comment-like-001");
    reaction.type="button";
    const reactionIcon=document.createElementNS("http://www.w3.org/2000/svg","svg");
    reactionIcon.setAttribute("class","ui-profile-photo-comment-thumb-001");
    reactionIcon.setAttribute("viewBox","0 0 24 24");
    reactionIcon.setAttribute("width","16");reactionIcon.setAttribute("height","16");
    reactionIcon.setAttribute("stroke","currentColor");
    reactionIcon.setAttribute("stroke-width","1.8");
    reactionIcon.setAttribute("stroke-linejoin","round");
    reactionIcon.setAttribute("aria-hidden","true");
    const thumbPath=document.createElementNS("http://www.w3.org/2000/svg","path");
    thumbPath.setAttribute("class","ui-profile-photo-comment-thumb-path-001");
    thumbPath.setAttribute("d","M8 10.5 12.3 3c.6-1 2.1-.6 2.1.8v4.7h4.3a2.8 2.8 0 0 1 2.7 3.4l-1.6 6.7a2.8 2.8 0 0 1-2.7 2.1H8V10.5ZM3 10.5h5v10H3z");
    reactionIcon.append(thumbPath);
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
     card.classList.add("is-own");
     const text=commentText;
     const edit=node("button","vatra-profile-photo-comment-edit-001 vatra-comment-hover-edit-001");
     edit.type="button";edit.setAttribute("aria-label",t("Редагувати коментар","Edit comment"));
     edit.textContent="✎";
     edit.addEventListener("click",()=>{
      if(card.classList.contains("is-deleted-pending")||card.querySelector(".vatra-photo-comment-edit-form-001"))return;
      const form=node("form","vatra-photo-comment-edit-form-001");
      const editor=node("textarea","vatra-photo-comment-edit-textarea-001");
      editor.value=String(item.body||"");editor.maxLength=1000;editor.rows=3;editor.required=true;
      const actions=node("div","vatra-photo-comment-edit-actions-001");
      const cancel=node("button","vatra-photo-comment-edit-cancel-001",t("Скасувати","Cancel"));
      cancel.type="button";
      const save=node("button","vatra-photo-comment-edit-save-001",t("Зберегти","Save"));
      save.type="submit";actions.append(cancel,save);form.append(editor,actions);
      const exit=()=>{form.remove();text.hidden=false;};
      cancel.addEventListener("click",exit);
      form.addEventListener("submit",async e=>{
       e.preventDefault();const value=editor.value.trim();
       if(!value||value.length>1000||save.disabled)return;
       if(value===String(item.body||"").trim()){exit();return;}
       save.disabled=true;cancel.disabled=true;
       try{
        const {data,error}=await client.from("avatar_comments").update({body:value})
         .eq("id",item.id).eq("author_id",userId).select("body").maybeSingle();
        if(error||!data)throw error||Error("Photo comment edit not confirmed");
        item.body=data.body;text.textContent=String(data.body||"");
        clearCommentCache();exit();
       }catch(_){feedback(t("Не вдалося зберегти коментар.","Could not save comment."),true);}
       finally{save.disabled=false;cancel.disabled=false;}
      });
      text.hidden=true;meta.insertBefore(form,stamp);editor.focus();
     });
     card.append(edit);
     const remove=node("button","vatra-profile-photo-comment-delete-001 vatra-comment-hover-delete-001");
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
     remove.addEventListener("click",()=>{
      if(remove.disabled||card.classList.contains("is-deleted-pending"))return;
      remove.disabled=true;edit.disabled=true;
      card.classList.add("is-deleted-pending");
      const tomb=node("div","vatra-photo-comment-deleted-001");
      tomb.append(node("span","vatra-photo-comment-deleted-label-001",t("Коментар видалено","Comment deleted")));
      const undo=node("button","vatra-photo-comment-undo-001",t("Відновити","Undo"));
      undo.type="button";tomb.append(undo);
      head.hidden=true;reaction.hidden=true;edit.hidden=true;remove.hidden=true;card.append(tomb);
      let settled=false;
      const restore=()=>{
       if(settled)return;settled=true;clearTimeout(timer);
       card.classList.remove("is-deleted-pending");tomb.remove();
       head.hidden=false;reaction.hidden=false;edit.hidden=false;remove.hidden=false;
       edit.disabled=false;remove.disabled=false;
      };
      const commit=async()=>{
       if(settled)return;settled=true;undo.disabled=true;
       try{
        const {data,error}=await client.from("avatar_comments").delete()
         .eq("id",item.id).eq("author_id",userId).select("id").maybeSingle();
        if(error||!data)throw error||Error("Delete not permitted");
        clearCommentCache();card.remove();onDelete();
       }catch(_){
        card.classList.remove("is-deleted-pending");tomb.remove();
        head.hidden=false;reaction.hidden=false;edit.hidden=false;remove.hidden=false;
        edit.disabled=false;remove.disabled=false;
        feedback(t("Не вдалося видалити коментар.","Could not delete comment."),true);
       }
      };
      const timer=setTimeout(()=>void commit(),12000);
      undo.addEventListener("click",restore);
      window.addEventListener("pagehide",()=>void commit(),{once:true});
     });
     card.append(remove);
    }
 return card;
}
window.VATRA_PROFILE_AVATAR_COMMENT_ROW=Object.freeze({create});
})();
