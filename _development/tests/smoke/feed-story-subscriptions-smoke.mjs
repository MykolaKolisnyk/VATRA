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
function makeViewer(friendIds,{deferred=false,storyRows=[],lazy=false}={}){
 let lastRendered,finishFriends,friendCalls=0,storyCalls=0,storyFilters=[],rendererCalls=0;
 const observers=[];
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
 const style={empty:true,classList:{
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
 const viewerNodes=new Map([["#feed-story-view",dialog],...["heading","body","position","prev","next","media"].map(key=>["#feed-story-view-"+key,{}])]);
 const context={
  Date:FakeDate,Map,Set,Promise,String,Number,IntersectionObserver:lazy?PreviewObserver:undefined,
  client:database,vatraId:owner,friends:new Set(),hiddenPostAuthors:new Set(),followedClubs:new Map(),
  subscriptionsLoadedAt:0,subscriptionsInflight:null,
  validId:id=>/^[1-9][0-9]{0,18}$/.test(String(id)),
  q:key=>key==="#feed-friend-stories"?holder:key===".feed-stories"?style:viewerNodes.get(key),
  requestAnimationFrame(fn){fn();},updateStoryArrow(){},setTimeout,clearTimeout,
  loadPublicNames:async()=>{},loadAvatars:async()=>{},
  window:{VATRA_POST_MEDIA:{renderStory(_client,story){rendererCalls++;lastRendered=story;}}},
  memberName:id=>"Name "+id,initials:()=> "N",applyAvatar(){},
  node,t:(uk)=>uk
 };
 runInNewContext(source+"\nglobalThis.feedTest={loadStories,ensureSubscriptions,openStoryAt,get index(){return viewIndex;}};",context);
 return {context,holder,style,observers,viewerNodes,get lastRendered(){return lastRendered;},
  get friendCalls(){return friendCalls;},
  get storyCalls(){return storyCalls;},
  get storyFilters(){return storyFilters;},
  get rendererCalls(){return rendererCalls;},
  release(){assert.ok(finishFriends,"The friend query should be pending");finishFriends();}
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
 assert.equal(v.style.empty,true,"Keep only the vertical creation tile while loading");
 v.release();
 await Promise.all([feedReady,stories]);
 assert.equal(v.storyCalls,1);
 assert.deepEqual(v.storyFilters[0].ids,[owner,"789012"]);
 assert.equal(v.holder.children.length,1,"Friend stories must remain visible on slow networks");
 assert.equal(v.style.empty,false);
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
 assert.equal(v.storyCalls,1,"Read only own stories without friends");
 assert.deepEqual(v.storyFilters[0].ids,[owner]);
 assert.equal(v.holder.children.length,1);
 assert.equal(v.style.empty,false);
}
// A targeted PostgREST filter excludes unrelated stories before the limit.
{
 const v=makeViewer(["789012"],{storyRows:[
  {author_vatra_id:"999999",body:"Stranger",theme:0},
  {author_vatra_id:"789012",body:"Friend",theme:2}
 ]});
 await v.context.feedTest.loadStories();
 assert.equal(v.holder.children.length,1);
 assert.equal(v.storyCalls,1);
 assert.equal(v.storyFilters[0].field,"author_vatra_id");
}
// For very large friend lists, keep the original (bounded) broad query
// instead of generating a very large URL with hundreds of IDs.
{
 const ids=Array.from({length:101},(_,i)=>String(700000+i));
 const v=makeViewer(ids);
 await v.context.feedTest.loadStories();
 assert.equal(v.storyCalls,1);
 assert.equal(v.storyFilters.length,0);
}
console.log("VATRA Feed stories: shared friendship singleflight, own stories without friends, targeted RLS reads and TTL passed.");

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
