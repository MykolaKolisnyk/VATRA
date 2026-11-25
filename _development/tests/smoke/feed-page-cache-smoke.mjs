// VATRA: authenticated Feed cursor reuse with bounded TTL and write invalidation.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const feed=await readFile("assets/js/feed.js","utf8");
const start=feed.indexOf(" const FEED_PAGE_TTL_MS=12_000,FEED_PAGE_MAX=16;");
const end=feed.indexOf(" const makeSourceState=()=>",start);
assert.ok(start>0&&end>start,"Find the real Feed cursor cache");
let now=Date.parse("2026-11-14T12:00:00Z");
class FakeDate extends Date{static now(){return now;}}
const scope={Date:FakeDate,Map,WeakMap,Promise,String,JSON,Error,Number};
runInNewContext(feed.slice(start,end)+
 "\nglobalThis.feedCacheTest={readFeedPage,invalidateFeedPages};",scope);
const {readFeedPage,invalidateFeedPages}=scope.feedCacheTest;
const key=JSON.stringify(["person","all","",0,["10","11"],[]]);
const row=body=>({id:"posted-id",body});
function viewer(){
 let listener,requests=0;
 return {client:{auth:{onAuthStateChange(fn){listener=fn;}}},
  get requests(){return requests;},
  query(data=[],error=null){
   return ()=>{requests++;return Promise.resolve({data,error});};
  },
  event(name){assert.ok(listener);listener(name);}
 };
}
{
 const a=viewer();
 const first=await readFeedPage(a.client,key,a.query([row("one")]));
 assert.equal(first.data.length,1);
 const cached=await readFeedPage(a.client,key,a.query([row("should not be read")]));
 assert.equal(a.requests,1,"Re-opening a filter should reuse its latest RLS cursor");
 cached.data[0].body="mutated by card";
 assert.equal((await readFeedPage(a.client,key,a.query([]))).data[0].body,"one");
 const different=await readFeedPage(a.client,key+"other filter",a.query([row("different")]));
 assert.equal(different.data[0].body,"different");
 assert.equal(a.requests,2,"Different source filters require independent cache keys");
 now+=12_100;
 assert.equal((await readFeedPage(a.client,key,a.query([row("fresh")]))).data[0].body,"fresh");
 assert.equal(a.requests,3,"Expired cursors must be refreshed");
 invalidateFeedPages(a.client);
 assert.equal((await readFeedPage(a.client,key,a.query([row("after write")]))).data[0].body,"after write");
 assert.equal(a.requests,4,"A new post, delete or archive must bypass old cursors");
}
{
 let resolveFirst,listener,calls=0;
 const client={auth:{onAuthStateChange(fn){listener=fn;}}};
 const first=readFeedPage(client,key,()=>{
  calls++;return new Promise(resolve=>{resolveFirst=resolve;});
 });
 const shared=readFeedPage(client,key,()=>{
  calls++;return Promise.resolve({data:[],error:null});
 });
 assert.equal(calls,1,"Two simultaneous cursor requests should share one promise");
 listener("TOKEN_REFRESHED");
 listener("SIGNED_OUT");
 resolveFirst({data:[row("previous viewer")],error:null});
 assert.ok((await first).error,"Previous session's query must not render");
 assert.ok((await shared).error,"Waiting queries must not render stale data");
 const next=await readFeedPage(client,key,()=>{
  calls++;return Promise.resolve({data:[row("new viewer")],error:null});
 });
 assert.equal(calls,2);
 assert.equal(next.data[0].body,"new viewer");
}
{
 const a=viewer(),b=viewer();
 const one=await readFeedPage(a.client,key,a.query([row("viewer 1")]));
 const two=await readFeedPage(b.client,key,b.query([row("viewer 2")]));
 assert.equal(one.data[0].body,"viewer 1");
 assert.equal(two.data[0].body,"viewer 2");
 const failed=await readFeedPage(a.client,key+"err",a.query(null,Error("network")));
 assert.ok(failed.error);
 const retried=await readFeedPage(a.client,key+"err",a.query([row("recovered")]));
 assert.equal(retried.data.length,1);
 assert.equal(a.requests,3,"PostgREST errors must never be cached");
}
console.log("VATRA Feed cursor cache: TTL, single-flight, RLS isolation, writes and retries passed.");

{
 const identity="11111111-1111-4111-8111-111111111111";
 let handler,complete,calls=0;
 const ctx={Date:FakeDate,Map,WeakMap,Promise,String,JSON,Error,Number,user:{id:identity}};
 runInNewContext(feed.slice(start,end)+"\nglobalThis.read=readFeedPage;",ctx);
 const client={auth:{onAuthStateChange(fn){handler=fn;}}};
 const pending=ctx.read(client,key,()=>{
  calls++;return new Promise(resolve=>{complete=resolve;});
 });
 handler("SIGNED_IN",{user:{id:identity}});
 complete({data:[row("same viewer result")],error:null});
 assert.equal((await pending).data[0].body,"same viewer result","Repeated same-account sign-in must not reject an authorized in-flight response");
 const cached=await ctx.read(client,key,()=>{calls++;return Promise.resolve({data:[],error:null});});
 assert.equal(cached.data[0].body,"same viewer result");
 assert.equal(calls,1);
 const other=ctx.read(client,key+"new",()=>new Promise(resolve=>{complete=resolve;}));
 handler("SIGNED_IN",{user:{id:"22222222-2222-4222-8222-222222222222"}});
 complete({data:[row("previous viewer")],error:null});
 assert.ok((await other).error,"Actual account changes must still invalidate in-flight responses");
}
console.log("VATRA Feed cursor: repeated same-account SIGNED_IN preserves authorized in-flight reads.");


// Exercise the production cursor merge and lazy query construction together.
{
 const begin=feed.indexOf(" const FEED_PAGE_TTL_MS=12_000,FEED_PAGE_MAX=16;");
 const finish=feed.indexOf(" async function loadPosts(",begin);
 assert.ok(begin>=0&&finish>begin);
 let builders=0,requests=0;
 const rows={
  feed_posts:Array.from({length:12},(_,i)=>({id:"p"+i,author_vatra_id:"10",created_at:new Date(Date.UTC(2026,10,25,12,0,24-i*2)).toISOString()})),
  community_posts:Array.from({length:12},(_,i)=>({id:"g"+i,club_id:"20",created_at:new Date(Date.UTC(2026,10,25,12,0,23-i*2)).toISOString()}))
 };
 const client={from(table){
  builders++;
  const q={select:()=>q,in:()=>q,eq:()=>q,is:()=>q,ilike:()=>q,order:()=>q,
   range(a,b){requests++;return Promise.resolve({data:rows[table].slice(a,b+1),error:null});}};
  return q;
 }};
 const ctx={client,user:{id:"viewer"},vatraId:"10",friends:new Set(["10"]),hiddenPostAuthors:new Set(),followedClubs:new Map([["20","Club"]]),
  feedFilter:"all",searchTerm:"",locale:"uk-UA",PAGE_SIZE:12,Date:FakeDate,Map,WeakMap,Promise,String,JSON,Error,Number,Set,
  feedDeadline:x=>x,sourceState:null,renderedIds:new Set(),lastFeedScope:null};
 const code=feed.slice(begin,finish);
 // sourceState and renderedIds are defined immediately before the cache slice.
 runInNewContext(code+"\nglobalThis.api={takePage,reset(){sourceState=makeSourceState();renderedIds=new Set();},invalidate:()=>invalidateFeedPages(client)};",ctx);
 ctx.api.reset();
 const first=await ctx.api.takePage();
 assert.equal(first.length,12);
 assert.deepEqual(Array.from(first,r=>r.id),["p0","g0","p1","g1","p2","g2","p3","g3","p4","g4","p5","g5"]);
 assert.equal(builders,2);assert.equal(requests,2);
 const next=await ctx.api.takePage();
 assert.deepEqual(Array.from(next,r=>r.id),["p6","g6","p7","g7","p8","g8","p9","g9","p10","g10","p11","g11"]);
 assert.equal(builders,3);assert.equal(requests,3);
 ctx.api.reset();
 const cached=await ctx.api.takePage();
 assert.deepEqual(Array.from(cached,r=>r.id),Array.from(first,r=>r.id));
 assert.equal(builders,3,"Cache hits must not allocate PostgREST builders");
 assert.equal(requests,3,"Cache hits must not make network requests");
 ctx.api.invalidate();ctx.api.reset();
 await ctx.api.takePage();
 assert.equal(builders,5);assert.equal(requests,5,"Invalidation still fetches fresh authorized rows");
}
console.log("VATRA Feed: chronological merge, pagination, lazy query construction and invalidation passed.");

{
 const client={},finish=[];let requests=0;
 const query=()=>{requests++;return new Promise(resolve=>finish.push(resolve));};
 const pages=Array.from({length:40},(_,i)=>readFeedPage(client,"pressure-"+i,query));
 const duplicate=readFeedPage(client,"pressure-0",query);
 assert.equal(requests,40,"Pending cursor must survive pressure on settled cache");
 finish.forEach(resolve=>resolve({data:[row("ok")],error:null}));
 await Promise.all([...pages,duplicate]);
 assert.equal((await readFeedPage(client,"pressure-39",query)).data[0].body,"ok");
 assert.equal(requests,40);
}
