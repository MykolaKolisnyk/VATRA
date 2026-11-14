// VATRA Feed: stories must wait for the real friend list and avoid wasted reads.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const feed=await readFile("assets/js/feed.js","utf8");
const subscriptionsStart=feed.indexOf(" async function loadSubscriptions(){");
const subscriptionsEnd=feed.indexOf(" function card(",subscriptionsStart);
const storiesStart=feed.indexOf(" async function loadStories(){");
const storiesEnd=feed.indexOf(" function bindComposer(){",storiesStart);
assert.ok(subscriptionsStart>=0&&subscriptionsEnd>subscriptionsStart&&
 storiesStart>subscriptionsEnd&&storiesEnd>storiesStart,
 "Locate real Feed subscription and story loaders");
const source=feed.slice(subscriptionsStart,subscriptionsEnd)+"\n"+
 feed.slice(storiesStart,storiesEnd);

let now=Date.parse("2026-11-14T08:00:00Z");
class FakeDate extends Date{static now(){return now;}}
const owner="654321";
function makeViewer(friendIds,{deferred=false,storyRows=[]}={}){
 let finishFriends,friendCalls=0,storyCalls=0,storyFilters=[],rendererCalls=0;
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
 const holder={children:[],replaceChildren(){this.children=[];},
  append(item){this.children.push(item);}};
 const style={empty:false,classList:{
  add(value){assert.equal(value,"is-empty");style.empty=true;},
  toggle(value,state){assert.equal(value,"is-empty");style.empty=state;}
 }};
 const node=(tag,cls,body)=>{
  const result={tag,cls,textContent:body||"",dataset:{},children:[],
   append(...parts){result.children.push(...parts);},
   setAttribute(){},addEventListener(){}};
  return result;
 };
 const context={
  Date:FakeDate,Map,Set,Promise,String,Number,
  client:database,vatraId:owner,friends:new Set(),followedClubs:new Map(),
  subscriptionsLoadedAt:0,subscriptionsInflight:null,
  validId:id=>/^[1-9][0-9]{0,18}$/.test(String(id)),
  q:key=>key==="#feed-friend-stories"?holder:key===".feed-stories"?style:null,
  requestAnimationFrame(fn){fn();},updateStoryArrow(){},
  loadPublicNames:async()=>{},loadAvatars:async()=>{},
  window:{VATRA_POST_MEDIA:{renderStory(){rendererCalls++;}}},
  memberName:id=>"Name "+id,initials:()=> "N",applyAvatar(){},
  node,t:(uk)=>uk
 };
 runInNewContext(source+"\nglobalThis.feedTest={loadStories,ensureSubscriptions};",context);
 return {context,holder,style,
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
 v.release();
 await Promise.all([feedReady,stories]);
 assert.equal(v.storyCalls,1);
 assert.deepEqual(v.storyFilters[0].ids,["789012"]);
 assert.equal(v.holder.children.length,1,"Friend stories must remain visible on slow networks");
 assert.equal(v.style.empty,false);
 await v.context.feedTest.loadStories();
 assert.equal(v.friendCalls,1,"A second story visit reuses the same snapshot for 60s");
 now+=60_100;
 await v.context.feedTest.loadStories();
 assert.equal(v.friendCalls,2,"A refreshed snapshot must eventually be fetched");
}
// Do not request even one story when the viewer has no friends.
{
 const v=makeViewer([]);
 await Promise.all([v.context.feedTest.ensureSubscriptions(),v.context.feedTest.loadStories()]);
 assert.equal(v.friendCalls,1);
 assert.equal(v.storyCalls,0,"Empty friend list must skip the stories query");
 assert.equal(v.holder.children.length,0);
 assert.equal(v.style.empty,true);
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
console.log("VATRA Feed stories: shared friendship singleflight, no-friend skip, targeted RLS reads and TTL passed.");
