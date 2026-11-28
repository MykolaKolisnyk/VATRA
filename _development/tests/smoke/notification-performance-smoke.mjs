import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const notices=await readFile("assets/js/notifications/notifications.js","utf8");
{
 const pending=deferred(),calls=[],run={},list={children:[],replaceChildren(){this.children=[];},setAttribute(){},append(row){this.children.push(row);}},empty={},more={};
 const a=notices.indexOf("async function pageLoad(append=false){"),b=notices.indexOf("function pageUI(){",a);
 assert.ok(a>=0&&b>a);
 const ctx={notificationRun:run,sectionLoading:false,sectionQueued:false,sectionPage:0,sectionFilter:"all",sectionSort:"new",sectionScope:null,
  pick:x=>x==="#notifications-list"?list:x==="#notifications-empty"?empty:more,
  fetchRows:opts=>{calls.push(opts.filter);return calls.length===1?pending.promise:Promise.resolve({rows:[],hasNext:false});},
  authorNames:async()=>({states:new Map(),names:new Map(),avatars:new Map(),forms:new Map()}),
  createRow(){throw Error("Obsolete notification rendered");},renderEmpty(){},t:x=>x,format:x=>x};
 runInNewContext(notices.slice(a,b)+"\nglobalThis.load=pageLoad;",ctx);
 const first=ctx.load();
 ctx.sectionFilter="unread";await ctx.load();
 pending.resolve({rows:[{actor_vatra_id:9}],hasNext:false});
 await first;
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.deepEqual(calls,["all","unread"],"Latest notification filter must be loaded after the pending request");
}
console.log("VATRA notifications: latest-filter race safety passed.");


{
 const a=notices.indexOf(" let positionPending=false;");
 const b=notices.indexOf("\n}",a);
 assert.ok(a>=0&&b>a);
 let positions=0;const frames=[],listeners={};
 const ctx={open:true,positionPanel:()=>{positions++;},requestAnimationFrame:fn=>frames.push(fn),
  window:{addEventListener:(name,fn)=>{listeners[name]=fn;},visualViewport:{addEventListener:(name,fn)=>{listeners["viewport-"+name]=fn;}}}};
 runInNewContext(notices.slice(a,b),ctx);
 for(let i=0;i<50;i++)listeners.scroll();
 listeners.resize();listeners["viewport-resize"]();
 assert.equal(frames.length,1,"Coalesce a burst of 52 events into one frame");
 frames.shift()();assert.equal(positions,1);
 ctx.open=false;listeners.scroll();assert.equal(frames.length,0);
}
console.log("VATRA notification panel: coalesced layout work and no hidden-panel scheduling passed.");

{
 const a=notices.indexOf("async function noticePreviewURL("),b=notices.indexOf("async function enrichNotice(",a);
 assert.ok(a>=0&&b>a);
 let calls=0,finish;
 const run={client:{storage:{from:()=>({createSignedUrl:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}})}}};
 const ctx={window:{},notificationRun:run,URL,Map,Date};
 runInNewContext(notices.slice(a,b)+"\nglobalThis.preview=noticePreviewURL;",ctx);
 const first=ctx.preview(run,"9/posts/preview.jpg"),second=ctx.preview(run,"9/posts/preview.jpg");
 await Promise.resolve();assert.equal(calls,1);
 finish({data:{signedUrl:"https://cxrcycxrlkufozomsxcs.supabase.co/storage/example"},error:null});
 assert.equal(await first,await second);
 await ctx.preview(run,"9/posts/preview.jpg");assert.equal(calls,1);
 const old=ctx.preview(run,"9/posts/old.jpg");await Promise.resolve();
 ctx.notificationRun={};finish({data:{signedUrl:"https://cxrcycxrlkufozomsxcs.supabase.co/storage/old"},error:null});
 await assert.rejects(old,/unavailable/);
 assert.equal(run.previewURLs.has("9/posts/old.jpg"),false);
}
console.log("VATRA notification previews: single-flight, reuse and stale viewer rejection passed.");

{
 const profile=await readFile("assets/js/profile.js","utf8");
 const feed=await readFile("assets/js/feed.js","utf8");
 const start=profile.indexOf("  const settings=[\n"),end=profile.indexOf("  if(morePanel&&removeFriend)",start);
 assert.ok(start>=0&&end>start);
 const make=()=>({label:{},events:{},attrs:{},querySelector(){return this.label;},addEventListener(k,cb){this.events[k]=cb;},setAttribute(k,v){this.attrs[k]=v;}});
 const hideNews=make(),postNotice=make(),storyNotice=make(),moreMenu=make(),window={VATRA_AUTH_MEMBER_ID:"2",VATRA_TOAST:{show(){}}};
 let row=null;const calls=[];
 const client={from(table){assert.equal(table,"member_content_preferences");let action="select",payload={};const b={select(){return b;},eq(){return b;},insert(x){action="insert";payload=x;return b;},update(x){action="update";payload=x;return b;},async maybeSingle(){calls.push(action);if(action==="insert")row={hide_posts:false,notify_posts:false,notify_stories:false,...payload};if(action==="update")row={...row,...payload};return {data:row,error:null};}};return b;}};
 const ctx={hideNews,postNotice,storyNotice,moreMenu,window,ownId:"2",targetId:"1",client,t:uk=>uk,first:"Мар’яна",unavailable:"Coming soon"};
 runInNewContext(profile.slice(start,end)+"\nglobalThis.load=loadPreferences;",ctx);
 assert.equal(calls.length,0);await ctx.load();
 await postNotice.events.click();assert.equal(row.notify_posts,true);assert.equal(postNotice.attrs["aria-pressed"],"true");
 await storyNotice.events.click();assert.equal(row.notify_stories,true);assert.equal(row.notify_posts,true);
 await postNotice.events.click();assert.equal(row.notify_posts,false);assert.equal(row.notify_stories,true);
 window.VATRA_AUTH_MEMBER_ID="3";await hideNews.events.click();assert.equal(row.hide_posts,false);
 const a=notices.indexOf("const interactionKinds="),b=notices.indexOf("const notificationTemplates=",a);
 const route={URL,root:"https://example.test/VATRA/",ownId:"2",validId:id=>/^[1-9][0-9]{0,18}$/.test(String(id))};
 runInNewContext(notices.slice(a,b)+"\nglobalThis.href=hrefFor;",route);
 const id="94fe25a7-77d5-4abf-b077-123456789012";
 assert.equal(route.href({kind:"member_post",actor_vatra_id:1,target_id:id}),route.root+"id1?post="+id);
 assert.equal(route.href({kind:"member_story",actor_vatra_id:1,target_id:id}),route.root+"id1?story="+id);
 assert.ok(feed.includes("!hiddenPostAuthors.has(id)"));
 const post="94fe25a7-77d5-4abf-b077-123456789013",album="94fe25a7-77d5-4abf-b077-123456789014",photo="94fe25a7-77d5-4abf-b077-123456789015";
 assert.equal(route.href({kind:"post_reply",actor_vatra_id:3,target_id:id,context_id:post,event_key:"post_reply:1:"+id}),route.root+"id1?post="+post+"&comment="+id);
 assert.equal(route.href({kind:"post_comment",actor_vatra_id:3,target_id:id,context_id:post,event_key:"post_comment:1:"+id}),route.root+"id1?post="+post+"&comment="+id);
 assert.equal(route.href({kind:"album_comment",actor_vatra_id:3,target_id:id,context_id:photo,event_key:"album_comment:1:"+album+":"+id+":3"}),route.root+"id1?album="+album+"&photo="+photo+"&comment="+id);
 assert.equal(route.href({kind:"album_photo_like",actor_vatra_id:3,target_id:photo,context_id:photo,event_key:"album_photo_like:1:"+album+":"+photo+":3"}),route.root+"id1?album="+album+"&photo="+photo);
 assert.equal(route.href({kind:"post_like",target_kind:"person",target_id:post}),route.root+"id2?post="+post);
 assert.equal(route.href({kind:"post_reply",target_id:id,context_id:"invalid",event_key:"post_reply:1:"+id}),null);
 assert.equal(route.href({kind:"comment_like",target_kind:"post_comment",target_id:id}),null);
 const albums=await readFile("assets/js/photo-albums.js","utf8");
 assert.ok(albums.includes('.eq("photo_id",photo.id).eq("id",linked).maybeSingle()'));
 assert.ok(profile.includes('if(exact)query=query.eq("id",requestedStory)'));
}
console.log("VATRA content preferences: lazy read, independent toggles, session isolation, feed exclusion and exact notification routes passed.");

{
 const start=notices.indexOf("async function noticeContent("),end=notices.indexOf("async function enrichInteraction(",start);
 assert.ok(start>=0&&end>start);
 const calls=[],requests=[];
 const client={from(table){let fields,id;return {select(value){fields=value;return this;},eq(key,value){assert.equal(key,"id");id=value;return this;},maybeSingle(){calls.push([table,fields,id]);const request=deferred();requests.push(request);return request.promise;}};}};
 const run={client},ctx={notificationRun:run};
 runInNewContext(notices.slice(start,end)+"\nglobalThis.read=noticeContent;",ctx);
 const read=(fields="id,body",id="post-1",table="feed_posts",viewer=run)=>ctx.read(viewer,table,fields,id);
 const first=read(),second=read(),otherProjection=read("id"),otherPost=read("id,body","post-2"),otherTable=read("id,body","post-1","community_posts");
 await Promise.resolve();
 assert.equal(calls.length,4,"Identical concurrent preview reads must use one request; projections, IDs and tables stay separate");
 for(const request of requests)request.resolve({data:{id:"fixture"},error:null});
 const values=await Promise.all([first,second,otherProjection,otherPost,otherTable]);
 assert.equal(values[0],values[1]);assert.equal(run.contentPending.size,0,"No settled private content is retained");
 const retry=read();await Promise.resolve();assert.equal(calls.length,5,"Subsequent read must recheck current RLS");
 requests[4].resolve({data:null,error:{message:"denied"}});await assert.rejects(retry,/unavailable/);
 assert.equal(run.contentPending.size,0);
 const stale=read();await Promise.resolve();
 const nextRun={client};ctx.notificationRun=nextRun;
 const fresh=read("id,body","post-1","feed_posts",nextRun);await Promise.resolve();
 assert.equal(calls.length,7,"A new viewer must not join the old viewer's pending request");
 requests[5].resolve({data:{id:"old"},error:null});requests[6].resolve({data:{id:"new"},error:null});
 await assert.rejects(stale,/unavailable|changed/);assert.equal((await fresh).id,"new");
 assert.equal(run.contentPending.size,0);assert.equal(nextRun.contentPending.size,0);
 assert.ok(notices.includes("const read=(table,fields,id)=>noticeContent(run,table,fields,id)")&&notices.includes("content=await noticeContent(run,table,fields,record.target_id)"),"Both notification preview paths must use the shared request");
}
console.log("VATRA notification content: in-flight deduplication, no persistent private cache, RLS retry and viewer isolation passed.");
