// VATRA Feed: stories must wait for the real friend list and avoid wasted reads.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const feed=await readFile("assets/js/feed.js","utf8");
const subscriptionsStart=feed.indexOf(" async function loadSubscriptions(){");
const subscriptionsEnd=feed.indexOf(" function card(",subscriptionsStart);
const storiesStart=feed.indexOf(" let storyPreviewObserver=null,storyLoadGeneration=0");
const storiesEnd=feed.indexOf(" function bindComposer(){",storiesStart);
assert.ok(subscriptionsStart>=0&&subscriptionsEnd>subscriptionsStart&&
 storiesStart>subscriptionsEnd&&storiesEnd>storiesStart,
 "Locate real Feed subscription and story loaders");
const deadlineStart=feed.indexOf(" function feedDeadline(");
const deadlineEnd=feed.indexOf(" async function init(){",deadlineStart);
assert.ok(deadlineStart>=0&&deadlineEnd>deadlineStart,"Locate real Feed deadline helpers");
const source=feed.slice(deadlineStart,deadlineEnd)+"\n"+
 feed.slice(subscriptionsStart,subscriptionsEnd)+"\n"+
 feed.slice(storiesStart,storiesEnd);

let now=Date.parse("2026-11-14T08:00:00Z");
class FakeDate extends Date{static now(){return now;}}
const owner="654321";
function makeViewer(friendIds,{deferred=false,storyRows=[],lazy=false,slowMetadata=false,wide=false}={}){
 let lastRendered,finishFriends,friendCalls=0,storyCalls=0,storyFilters=[],rendererCalls=0;
 const observers=[];
 let resolveMetadata,metadataReady=!slowMetadata;
 const metadataGate=slowMetadata?new Promise(resolve=>{resolveMetadata=()=>{metadataReady=true;resolve();};}):Promise.resolve();
 storyRows=storyRows.map(row=>({expires_at:new Date(now+86400000).toISOString(),...row}));
 class PreviewObserver{
  constructor(callback){this.callback=callback;this.targets=new Set();this.disconnected=false;observers.push(this);}
  observe(target){this.targets.add(target);}
  unobserve(target){this.targets.delete(target);}
  disconnect(){this.disconnected=true;this.targets.clear();}
  fire(target,isIntersecting=true){this.callback([{target,isIntersecting}]);}
 }
 const friendResult=()=>({data:friendIds.map(id=>({
  requester_id:owner,recipient_id:String(id),status:"accepted"
 })),error:null});
 const database={
  from(table){
   if(table==="friendships"){
    const builder={
     select(){return builder;},or(){return builder;},eq(){return builder;},
     limit(){
      friendCalls++;
      return deferred&&friendCalls===1?
       new Promise(resolve=>{finishFriends=()=>resolve(friendResult());}):
       Promise.resolve(friendResult());
     }
    };return builder;
   }
   if(table==="community_follows"){
    const builder={select(){return builder;},eq(){return builder;},
     limit:async()=>({data:[],error:null})};
    return builder;
   }
   if(table==="communities"){
    const builder={select(){return builder;},in:async()=>({data:[],error:null})};
    return builder;
   }
   if(table==="stories"){
    storyCalls++;
    const builder={
     select(){return builder;},gt(){return builder;},order(){return builder;},
     in(field,ids){storyFilters.push({field,ids:[...ids]});return builder;},
     limit:async n=>{
      assert.equal(n,60);
      const included=storyFilters.at(-1)?.ids;
      return {data:included?storyRows.filter(row=>included.includes(String(row.author_vatra_id))):
       storyRows,error:null};
     }
    };
    return builder;
   }
   throw Error("Unexpected table "+table);
  }
 };
 const holder={children:[],busy:"false",setAttribute(key,value){assert.equal(key,"aria-busy");this.busy=value;},replaceChildren(){this.children=[];},
  append(item){this.children.push(item);},contains(item){return this.children.includes(item);}};
 const style={empty:true,hidden:true,classList:{
  add(value){assert.equal(value,"is-empty");style.empty=true;},
  toggle(value,state){assert.equal(value,"is-empty");style.empty=state;}
 }};
 const node=(tag,cls,body)=>{
  const result={tag,cls,textContent:body||"",dataset:{},children:[],
   append(...parts){result.children.push(...parts);},
   setAttribute(){},addEventListener(type,fn){result[type]=fn;}};
  return result;
 };
 const dialog={open:false,dataset:{},showModal(){this.open=true;}};
 const viewerNodes=new Map([["#feed-story-view",dialog],...["heading","body","position","prev","next","media","delete","menu"].map(key=>["#feed-story-view-"+key,{}])]);
 for(const dir of ["prev","next"]){
  const slot={hidden:true,textContent:""},label={textContent:""};
  viewerNodes.set("#feed-story-neighbor-"+dir,{hidden:true,dataset:{},querySelector:selector=>selector.includes("media")?slot:label,setAttribute(){}});
 }
 const context={
  matchMedia:()=>({matches:wide}),Date:FakeDate,Map,Set,Promise,String,Number,IntersectionObserver:lazy?PreviewObserver:undefined,
  client:database,vatraId:owner,friends:new Set(),hiddenPostAuthors:new Set(),followedClubs:new Map(),
  subscriptionsLoadedAt:0,subscriptionsInflight:null,
  validId:id=>/^[1-9][0-9]{0,18}$/.test(String(id)),
  q:key=>key==="#feed-friend-stories"?holder:key===".feed-stories"?style:viewerNodes.get(key),
  requestAnimationFrame(fn){fn();},updateStoryArrow(){},setTimeout,clearTimeout,
  loadPublicNames:()=>metadataGate,loadAvatars:()=>metadataGate,
  window:{VATRA_POST_MEDIA:{
   clearStory(slot){if(!slot)return;slot.textContent="";slot.hidden=true;},
   renderStory(_client,story){rendererCalls++;lastRendered=story;}
  }},
  memberName:id=>(metadataReady?"Name ":"VATRA ID ")+id,initials:()=> "N",applyAvatar(){},
  node,t:(uk)=>uk
 };
 runInNewContext(source+"\nglobalThis.feedTest={loadStories,ensureSubscriptions,openStoryAt,get index(){return viewIndex;}};",context);
 return {context,holder,style,observers,viewerNodes,get lastRendered(){return lastRendered;},
  get friendCalls(){return friendCalls;},
  get storyCalls(){return storyCalls;},
  get storyFilters(){return storyFilters;},
  get rendererCalls(){return rendererCalls;},
  release(){assert.ok(finishFriends,"The friend query should be pending");finishFriends();},releaseMetadata(){resolveMetadata?.();}
 };
}
// The first Feed call and Stories start at the same time. Until friends
// resolve, stories must not run against the old empty friends Set.
{
 const v=makeViewer(["789012"],{
  deferred:true,storyRows:[{
   author_vatra_id:"789012",body:"Friend story",theme:1,
   media_kind:null,media_path:null
  }]
 });
 const feedReady=v.context.feedTest.ensureSubscriptions();
 const stories=v.context.feedTest.loadStories();
 assert.equal(v.friendCalls,1,"Feed and Stories share one friendship query");
 assert.equal(v.storyCalls,0,"Stories must wait for the friend query");
 assert.equal(v.holder.children.length,0,"Never render fictitious friend story cards");
 assert.equal(v.holder.busy,"true","Friend list loading is exposed through aria-busy");
 assert.equal(v.style.empty,true,"No placeholder stories while loading");
 assert.equal(v.style.hidden,true,"Hide the rail while the first story list loads");
 v.release();
 await Promise.all([feedReady,stories]);
 assert.equal(v.storyCalls,1);
 assert.equal(v.storyFilters.length,0,"RLS must scope the single bounded read, including public stories");
 assert.equal(v.holder.children.length,1,"Friend stories must remain visible on slow networks");
 assert.equal(v.style.empty,false);
 assert.equal(v.style.hidden,false);
 assert.equal(v.holder.busy,"false");
 await v.context.feedTest.loadStories();
 assert.equal(v.friendCalls,1,"A second story visit reuses the same snapshot for 60s");
 now+=60_100;
 await v.context.feedTest.loadStories();
 assert.equal(v.friendCalls,2,"A refreshed snapshot must eventually be fetched");
}
// A member without friends must still see their own published story.
{
 const v=makeViewer([],{storyRows:[{author_vatra_id:owner,body:"Own story",theme:0}]});
 await Promise.all([v.context.feedTest.ensureSubscriptions(),v.context.feedTest.loadStories()]);
 assert.equal(v.friendCalls,1);
 assert.equal(v.storyCalls,1,"One RLS-scoped read without friends");
 assert.equal(v.storyFilters.length,0);
 assert.equal(v.holder.children.length,1);
 assert.equal(v.style.empty,false);
 assert.equal(v.style.hidden,false);
}
// Public stories from non-friends must be visible; friends-only stories must not.
{
 const v=makeViewer(["789012"],{storyRows:[
  {author_vatra_id:"999999",body:"Private stranger",theme:0,visibility:"friends"},
  {author_vatra_id:"999998",body:"Public stranger",theme:1,visibility:"public"},
  {author_vatra_id:"789012",body:"Friend",theme:2,visibility:"friends"}
 ]});
 await v.context.feedTest.loadStories();
 assert.equal(v.holder.children.length,2);
 assert.equal(v.storyCalls,1);
 assert.equal(v.storyFilters.length,0);
 assert.deepEqual(v.holder.children.map(tile=>tile.children.find(child=>child.cls==="vatra-feed-story-live-body-001").textContent),["Public stranger","Friend"]);
}
// For very large friend lists, keep the original (bounded) broad query
// instead of generating a very large URL with hundreds of IDs.
{
 const ids=Array.from({length:101},(_,i)=>String(700000+i));
 const v=makeViewer(ids);
 await v.context.feedTest.loadStories();
 assert.equal(v.storyCalls,1);
 assert.equal(v.storyFilters.length,0);
 assert.equal(v.style.hidden,true,"No active stories means no rail");
}
console.log("VATRA Feed stories: shared friendship singleflight, own stories without friends, bounded RLS reads, public audience and TTL passed.");

{
 const storyRows=[
  {author_vatra_id:owner,body:"Photo",media_kind:"image",media_path:"654321/stories/photo.jpg"},
  {author_vatra_id:"789012",body:"Video",media_kind:"video",media_path:"789012/stories/video.mp4"}
 ];
 const v=makeViewer(["789012"],{storyRows,lazy:true});
 await v.context.feedTest.loadStories();
 const [first,second]=v.holder.children;
 const observer=v.observers[0];
 assert.equal(observer.targets.size,2);
 assert.equal(v.rendererCalls,0,"Offscreen story media must not be signed or downloaded");
 observer.fire(second,false);
 assert.equal(v.rendererCalls,0);
 observer.fire(first);observer.fire(first);
 assert.equal(v.rendererCalls,1,"Visible preview starts once");
 assert.equal(observer.targets.has(first),false);
 assert.equal(observer.targets.has(second),true);
 await v.context.feedTest.loadStories();
 assert.equal(observer.disconnected,true);
 observer.fire(second);
 assert.equal(v.rendererCalls,1,"Queued callbacks from a replaced story list must not load media");
 const next=v.observers[1];
 next.fire(v.holder.children[0]);next.fire(v.holder.children[1]);
 assert.equal(v.rendererCalls,3);
 assert.equal(next.disconnected,true,"Release the observer once all previews are loaded");
 const fallback=makeViewer(["789012"],{storyRows});
 await fallback.context.feedTest.loadStories();
 assert.equal(fallback.rendererCalls,2,"Browsers without IntersectionObserver retain the original previews");
}
console.log("VATRA story previews: viewport-only loading, one-shot observation, stale callback isolation and compatibility fallback passed.");

// Multiple stories per friend stay in one tile; viewer uses the loaded snapshot.
{
 const friend="789012",soon=new Date(now+1000).toISOString();
 const v=makeViewer([friend],{storyRows:[
  {author_vatra_id:friend,body:"Newest",theme:2},
  {author_vatra_id:friend,body:"Middle",theme:1,expires_at:soon},
  {author_vatra_id:friend,body:"Oldest",theme:0},
  {author_vatra_id:friend,body:"Expired",theme:0,expires_at:new Date(now-1).toISOString()}
 ]});
 await v.context.feedTest.loadStories();
 assert.equal(v.holder.children.length,1,"One preview tile per author");
 v.holder.children[0].click();
 assert.equal(v.lastRendered.body,"Oldest");
 assert.equal(v.viewerNodes.get("#feed-story-view-prev").disabled,true);
 assert.equal(v.viewerNodes.get("#feed-story-view-position").textContent,"1 / 3");
 now+=1500;
 v.context.feedTest.openStoryAt(v.context.feedTest.index+1);
 assert.equal(v.lastRendered.body,"Newest","Skip a story expiring while the viewer is open");
 assert.equal(v.viewerNodes.get("#feed-story-view-next").disabled,true);
 v.context.feedTest.openStoryAt(v.context.feedTest.index-1,-1);
 assert.equal(v.lastRendered.body,"Oldest");
 assert.equal(v.storyCalls,1,"Story navigation must not read from the database again");
 assert.equal(v.friendCalls,1);
}
console.log("VATRA story viewer: grouped author navigation, expiry and no additional reads passed.");

{
 const friend="789012";
 const v=makeViewer([friend],{slowMetadata:true,storyRows:[{author_vatra_id:friend,body:"Story before author lookup",theme:1}]});
 await v.context.feedTest.loadStories();
 const tile=v.holder.children[0],label=tile.children.find(child=>child.cls==="vatra-feed-story-live-name-001");
 assert.equal(v.holder.busy,"false","Stories are usable before optional author metadata finishes");
 assert.equal(label.textContent,"VATRA ID "+friend);
 tile.click();
 assert.equal(v.lastRendered.body,"Story before author lookup");
 v.releaseMetadata();
 for(let i=0;i<12;i++)await Promise.resolve();
 assert.equal(label.textContent,"Name "+friend,"Existing tile receives the resolved name without replacement");
 assert.equal(v.viewerNodes.get("#feed-story-view-heading").textContent,"Name "+friend);
 assert.strictEqual(v.holder.children[0],tile);
 assert.equal(v.storyCalls,1);
}
console.log("VATRA story metadata: render before delayed names and avatars, refresh existing tile and open viewer passed.");

{
 const friend="789012";
 const v=makeViewer([friend],{wide:true,storyRows:[
  {id:"own-story",author_vatra_id:owner,body:"Own story",theme:0},
  {id:"friend-story",author_vatra_id:friend,body:"Friend story",theme:1,visibility:"friends"}
 ]});
 await v.context.feedTest.loadStories();
 v.holder.children[0].click();
 assert.equal(v.viewerNodes.get("#feed-story-view-delete").hidden,false,"Only own story exposes deletion");
 assert.equal(v.viewerNodes.get("#feed-story-view-menu").hidden,false);
 v.viewerNodes.get("#feed-story-view-menu").open=true;
 assert.equal(v.viewerNodes.get("#feed-story-neighbor-prev").hidden,true);
 assert.equal(v.viewerNodes.get("#feed-story-neighbor-next").hidden,false);
 assert.equal(v.viewerNodes.get("#feed-story-neighbor-next").querySelector("media").textContent,"Friend story");
 v.context.feedTest.openStoryAt(1);
 assert.equal(v.viewerNodes.get("#feed-story-view-delete").hidden,true,"Another author's story cannot be deleted");
 assert.equal(v.viewerNodes.get("#feed-story-view-menu").hidden,true);
 assert.equal(v.viewerNodes.get("#feed-story-view-menu").open,false,"Navigation closes the previous owner action menu");
 assert.equal(v.viewerNodes.get("#feed-story-neighbor-prev").hidden,false);
 assert.equal(v.viewerNodes.get("#feed-story-neighbor-next").hidden,true);
 assert.equal(v.viewerNodes.get("#feed-story-neighbor-next").querySelector("media").textContent,"","Unavailable neighbor must clear its previous preview");
 assert.equal(v.viewerNodes.get("#feed-story-neighbor-prev").querySelector("media").textContent,"Own story");
 assert.equal(v.storyCalls,1,"Adjacent stories reuse the authorized loaded snapshot");
}
console.log("VATRA story viewer: owner-only deletion and real adjacent previews verified.");

 // Exercise the actual shared viewer clock using a controlled monotonic clock.
{
 const runtime=await readFile("assets/js/story-view-progress.js","utf8");
 let tick,clock=0,completed=0,blocked=false,media=null;
 const listeners=()=>({events:new Map(),addEventListener(k,fn){this.events.set(k,fn);},removeEventListener(k,fn){if(this.events.get(k)===fn)this.events.delete(k);}});
 const button={...listeners(),setAttribute(k,v){this[k]=v;},hidden:false};
 const bar={value:0,setAttribute(){}};
 const row={hidden:true,querySelector:s=>s==="progress"?bar:button};
 const dialog={...listeners(),open:true,querySelector:()=>row};
 const document={...listeners(),hidden:false,documentElement:{lang:"uk"}},window={};
 const slot={querySelector:()=>media};
 runInNewContext(runtime,{window,document,performance:{now:()=>clock},WeakMap,Number,Math,String,
  requestAnimationFrame(fn){tick=fn;return 1;},cancelAnimationFrame(){tick=null;}});
 const api=window.VATRA_STORY_PROGRESS,advance=(n,step=100)=>{for(let i=0;i<n;i++){clock+=step;const frame=tick;tick=null;frame?.();}};
 api.start(dialog,slot,{},()=>completed++,()=>blocked);
 advance(1,16);const firstFrame=bar.value;advance(1,16);assert.ok(firstFrame>0&&bar.value>firstFrame,"Progress advances on successive display frames, not every 100ms");
 api.stop(dialog);assert.equal(tick,null,"Stopping cancels the scheduled animation frame");
 api.start(dialog,slot,{},()=>completed++,()=>blocked);
 advance(30);assert.ok(bar.value>.4&&bar.value<.5);
 blocked=true;const before=bar.value;advance(100);assert.equal(bar.value,before);
 blocked=false;button.events.get("click")();advance(100);assert.equal(bar.value,before);
 button.events.get("click")();document.hidden=true;advance(100);assert.equal(bar.value,before);
 document.hidden=false;advance(40);assert.equal(completed,1);assert.equal(row.hidden,true);assert.equal(tick,null);
 api.start(dialog,slot,{media_kind:"image",media_path:"photo"},()=>completed++);
 advance(100);assert.equal(bar.value,0,"Signing and image loading must not consume story time");
 media={complete:true,naturalWidth:100};advance(70);assert.equal(completed,2);
 media={duration:20,currentTime:10,ended:false};
 api.start(dialog,slot,{media_kind:"video",media_path:"video"},()=>completed++,()=>blocked);
 advance(100);assert.equal(bar.value,.5);assert.equal(completed,2);assert.equal(button.hidden,true);
 blocked=true;media.ended=true;media.currentTime=20;advance(1);assert.equal(completed,2);
 blocked=false;advance(1);assert.equal(completed,3);
 let views=0;
 media={duration:20,currentTime:0,ended:false,paused:false,seeking:false,readyState:2,playbackRate:1};
 api.start(dialog,slot,{media_kind:"video",media_path:"video"},()=>{},()=>blocked,()=>views++);
 advance(50);assert.equal(views,0,"Buffering without moving media time is not a view");
 media.currentTime=10;advance(1);assert.equal(views,0,"Seeking forward is not a view");
 for(let i=0;i<5;i++){media.currentTime+=.1;advance(1);}assert.equal(views,0);
 blocked=true;for(let i=0;i<20;i++){media.currentTime+=.1;advance(1);}assert.equal(views,0,"Hidden playback behind a modal does not count");
 blocked=false;for(let i=0;i<7;i++){media.currentTime+=.1;advance(1);}assert.equal(views,1);
 for(let i=0;i<20;i++){media.currentTime+=.1;advance(1);}assert.equal(views,1,"One playback reports at most once");
 api.start(dialog,slot,{},()=>completed++);dialog.open=false;advance(1);
 assert.equal(tick,null);assert.equal(completed,3);assert.equal(row.hidden,true);
}
console.log("VATRA story clock: media readiness, pause, hidden tab, modal blocking, real video time, completion and cleanup verified.");

{
 const runtime=await readFile("assets/js/story-views.js","utf8");
 const window={},document={documentElement:{lang:"uk"}},location={href:"https://example.test/VATRA/feed"};
 runInNewContext(runtime,{window,document,location,WeakMap,Map,Set,Promise,Date:FakeDate,Number,String,URL});
 const api=window.VATRA_STORY_VIEWS,id="10000000-0000-0000-0000-000000000001",story={id,author_vatra_id:"101",expires_at:new Date(now+60000).toISOString()};
 assert.equal(api.profileHref("102"),"https://example.test/VATRA/id102");
 location.href="https://example.test/VATRA/id101";assert.equal(api.profileHref("102"),"https://example.test/VATRA/id102");
 assert.equal(api.profileHref("../bad"),"");
 let inserts=0,error=null,reads=0;
 const client={from(table){assert.equal(table,"story_views");return {
 insert(value){inserts++;assert.equal(value.story_id,id);assert.equal(value.viewer_vatra_id,"102");return Promise.resolve({error});},
 select(columns,options){reads++;assert.equal(options.head,true);return {eq(key,value){assert.equal(key,"story_id");assert.equal(value,id);return Promise.resolve({count:7,error});}};}
 };}};
 assert.equal(await api.record(client,story,"101"),false);assert.equal(inserts,0);
 assert.equal(await api.record(client,{...story,expires_at:new Date(now-1).toISOString()},"102"),false);assert.equal(inserts,0);
 error={code:"network"};assert.equal(await api.record(client,story,"102"),false);assert.equal(inserts,1);
 error={code:"23505"};assert.deepEqual(await Promise.all([api.record(client,story,"102"),api.record(client,story,"102")]),[true,true]);assert.equal(inserts,2);
 assert.equal(await api.record(client,story,"102"),true);assert.equal(inserts,2);
 error=null;assert.equal(await api.count(client,id),7);assert.equal(reads,1);
 error={code:"PGRST205"};assert.equal(await api.count(client,id),null,"Missing backend must never display a fake zero");
 assert.equal(await api.count(client,"bad"),null);assert.equal(reads,2);
}
console.log("VATRA story views: live-only insert, self exclusion, duplicate/network handling and authoritative count verified.");

{
 const runtime=await readFile("assets/js/story-views.js","utf8");
 const element=()=>({events:new Map(),children:[],dataset:{},hidden:false,open:false,textContent:"",setAttribute(k,v){this[k]=v;},remove(){this.removed=true;},
  addEventListener(k,fn){this.events.set(k,fn);},removeEventListener(k,fn){if(this.events.get(k)===fn)this.events.delete(k);},
  append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;}});
 const label=element(),list=element(),status=element(),more=element(),ui=element(),dialog=element();
 ui.querySelector=s=>({"summary":label,"ul":list,"[data-story-views-status]":status,"button":more})[s];
 dialog.querySelector=()=>ui;dialog.open=true;
 let avatarBatches=0;
 const window={VATRA_PUBLIC_NAMES:{get:async(_client,ids)=>({data:ids.map(vatra_id=>({vatra_id,display_name:"Name "+vatra_id}))})},
 VATRA_AVATAR:{paths:async(_client,ids)=>{avatarBatches++;return {data:ids.map(vatra_id=>({vatra_id,avatar_path:vatra_id==="103"?"103/avatar/test.webp":vatra_id==="104"?"104/avatar/test.webp":"999/avatar/other.webp"})),error:null};},
 states:async()=>new Map([["104","blocked"]])}},
 document={documentElement:{lang:"uk"},createElement:element},location={href:"https://example.test/VATRA/feed"};
 runInNewContext(runtime,{window,document,location,WeakMap,Map,Set,Promise,Date:FakeDate,Number,String,URL});
 const api=window.VATRA_STORY_VIEWS,id="10000000-0000-0000-0000-000000000001",story={id,author_vatra_id:"101",expires_at:new Date(now+60000).toISOString()};
 const pending=[];let countReads=0;
 const client={storage:{from(bucket){assert.equal(bucket,"avatars");return {getPublicUrl(path){return {data:{publicUrl:"https://cxrcycxrlkufozomsxcs.supabase.co/storage/v1/object/public/avatars/"+path}};}};}},from(table){assert.equal(table,"story_views");return {select(_cols,opts){
  const q={eq(){return q;},order(){return q;},range(start,end){assert.equal(end-start,49);return new Promise(resolve=>pending.push({start,resolve}));}};
  if(opts.head){countReads++;q.eq=()=>Promise.resolve({count:3});}return q;
 }};}};
 const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
 const toggle=open=>{ui.open=open;ui.events.get("toggle")();};
 api.start(dialog,client,story,"101");await flush();
 assert.equal(countReads,1);assert.equal(ui.hidden,false);assert.equal(label.textContent,"Перегляди: 3");
 toggle(true);assert.equal(pending.length,1);assert.equal(api.blocked(dialog),true);
 toggle(false);toggle(true);assert.equal(pending.length,2);
 pending[0].resolve({count:3,data:[{viewer_vatra_id:102}]});await flush();
 assert.equal(list.children.length,0,"A response from the previous open cannot paint the new list");
 pending[1].resolve({count:3,data:[{viewer_vatra_id:103},{viewer_vatra_id:104}]});await flush();
 assert.equal(list.children.length,2);const first=list.children[0].children[0],second=list.children[1].children[0];assert.equal(first.children[1].textContent,"Name 103");assert.equal(first.children[0].children[0].src,"https://cxrcycxrlkufozomsxcs.supabase.co/storage/v1/object/public/avatars/103/avatar/test.webp");assert.equal(second.children[0].dataset.vatraAvatarState,"blocked");assert.equal(second.children[0].children.length,0,"Blocked account cannot expose a photo");assert.equal(avatarBatches,2);
 more.events.get("click")();assert.equal(pending[2].start,2);
 pending[2].resolve({count:3,data:[{viewer_vatra_id:104},{viewer_vatra_id:105}]});await flush();
 assert.equal(list.children.length,3,"Repeated rows across pages are displayed once");assert.equal(list.children[2].children[0].children[0].children.length,0,"A mismatched owner path cannot expose another avatar");
 toggle(false);assert.equal(list.children.length,0,"Closed list drops private viewer data");
 toggle(true);assert.equal(pending[3].start,0,"Reopening refreshes access and names from the server");
 api.stop(dialog);pending[3].resolve({count:1,data:[{viewer_vatra_id:102}]});await flush();
 assert.equal(list.children.length,0);assert.equal(ui.hidden,true);assert.equal(api.blocked(dialog),false);
}
console.log("VATRA story views: list refresh, pagination deduplication, stale response isolation and teardown verified.");

{
 const runtime=await readFile("assets/js/story-reactions.js","utf8");
 const window={},document={documentElement:{lang:"uk"}};
 runInNewContext(runtime,{window,document,WeakMap,Map,Set,Promise,Date:FakeDate,Number,String,URL});
 const api=window.VATRA_STORY_REACTIONS,id="10000000-0000-0000-0000-000000000001",story={id,author_vatra_id:"101",expires_at:new Date(now+60000).toISOString()};
 let rows=null,calls=0,fail=false;
 const client={from(table){assert.equal(table,"story_reactions");calls++;let action="read",value=null;
 const q={eq(k,v){assert.equal(v,k==="story_id"?id:"102");return q;},select(){return q;},insert(payload){assert.equal(payload.story_id,id);assert.equal(payload.reactor_vatra_id,"102");action="insert";value=payload.reaction;return q;},update(payload){assert.equal(Object.keys(payload).join(","),"reaction");action="update";value=payload.reaction;return q;},delete(){action="delete";return q;},async maybeSingle(){if(fail)return {error:{code:"network"}};if(action==="insert"&&rows!==null)return {error:{code:"23505"}};if(action==="insert"||action==="update"&&rows!==null)rows=value;const data=rows===null?null:{reaction:rows};if(action==="delete")rows=null;return {data,error:null};}};return q;}};
 assert.equal((await api.read(client,story,"101")).ok,false);assert.equal(calls,0);
 assert.equal((await api.write(client,story,"102",null,"sticker")).ok,false);assert.equal(calls,0);
 assert.equal((await api.read(client,story,"102")).value,null);
 assert.equal((await api.write(client,story,"102",null,"heart")).value,"heart");
 assert.equal((await api.read(client,story,"102")).value,"heart");
 assert.equal((await api.write(client,story,"102","heart","fire")).value,"fire");
 assert.equal((await api.write(client,story,"102","fire",null)).value,null);
 fail=true;assert.equal((await api.write(client,story,"102",null,"like")).ok,false);fail=false;
 assert.equal((await api.write(client,story,"102","heart","like")).ok,false,"A missing server row cannot be reported as success");
 assert.equal((await api.write(client,{...story,expires_at:new Date(now-1).toISOString()},"102",null,"like")).ok,false);
 assert.equal(await api.page(client,story,"102",0),null,"Only owner requests the reaction list");
}
console.log("VATRA story reactions: self exclusion, type allowlist, server-confirmed changes, removal, errors and owner-only list verified.");

{
 const window={VATRA_PUBLIC_NAMES:{get:async(_client,ids)=>({data:ids.map(vatra_id=>({vatra_id,display_name:"Name "+vatra_id}))})}},document={documentElement:{lang:"uk"}};
 let batches=0;
 window.VATRA_AVATAR={paths:async(_client,ids)=>{batches++;return {data:ids.map(vatra_id=>({vatra_id,avatar_path:(vatra_id==="105"?"999":vatra_id)+"/avatar/test.webp"})),error:null};},states:async()=>new Map([["104","blocked"]])};
 for(const path of ["assets/js/story-views.js","assets/js/story-reactions.js"])runInNewContext(await readFile(path,"utf8"),{window,document,WeakMap,Map,Set,Promise,Date:FakeDate,Number,String,URL});
 const api=window.VATRA_STORY_REACTIONS,story={id:"10000000-0000-0000-0000-000000000001",author_vatra_id:"101",expires_at:new Date(now+60000).toISOString()};
 const client={storage:{from(bucket){assert.equal(bucket,"avatars");return {getPublicUrl(path){return {data:{publicUrl:"https://cxrcycxrlkufozomsxcs.supabase.co/storage/v1/object/public/avatars/"+path}};}};}},from(table){assert.equal(table,"story_reactions");const q={select(){return q;},eq(){return q;},order(){return q;},async range(){return {data:[{reactor_vatra_id:"103",reaction:"heart"},{reactor_vatra_id:"104",reaction:"like"},{reactor_vatra_id:"105",reaction:"fire"}],error:null};}};return q;}};
 assert.equal(await api.page(client,story,"102",0),null);assert.equal(batches,0);
 const result=await api.page(client,story,"101",0);assert.equal(batches,1);assert.equal(result.rows.length,3);assert.equal(result.rows[0].name,"Name 103");assert.equal(result.rows[0].avatar.url,"https://cxrcycxrlkufozomsxcs.supabase.co/storage/v1/object/public/avatars/103/avatar/test.webp");assert.equal(result.rows[1].avatar.state,"blocked");assert.equal(result.rows[1].avatar.url,null);assert.equal(result.rows[2].avatar.url,null);
}
console.log("VATRA reaction portraits: owner-only batched lookup and blocked/mismatched path exclusion verified.");
