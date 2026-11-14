// VATRA: comment pages are viewer-scoped, bounded, short-lived and write-invalidated.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const full=await readFile("assets/js/post-interactions.js","utf8");
const start=full.indexOf(" const COMMENT_PAGE_TTL_MS=4_000,COMMENT_PAGE_MAX=32;");
const end=full.indexOf(" // A short-lived, per-client cache for already-RLS-scoped engagement pages.",start);
assert.ok(start>0&&end>start,"Locate the real comment page implementation");
let now=Date.parse("2026-11-14T12:00:00Z");
class FakeDate extends Date{static now(){return now;}}
const env={
 Date:FakeDate,Map,WeakMap,Set,Promise,String,Number,JSON,Error,
 validUUID:value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value))
};
runInNewContext(full.slice(start,end)+"\nglobalThis.commentCacheTest={commentThreadPage,invalidateComments};",env);
const {commentThreadPage,invalidateComments}=env.commentCacheTest;
const id="94fe25a7-77d5-4abf-b077-cdd932161a52";
const params={p_kind:"person",p_post_id:id,p_sort:"newest",p_parent:null,p_offset:0,p_limit:7};
function fakeClient(){
 let calls=0,listener;
 const requests=[];
 const client={
  auth:{onAuthStateChange(fn){listener=fn;}},
  rpc(name,args){
   assert.equal(name,"vatra_comment_thread_page");
   assert.equal(args.p_post_id,id);
   calls++;
   return new Promise(resolve=>requests.push(resolve));
  }
 };
 return {client,requests,get calls(){return calls;},complete(rows=[],error=null){
  const resolve=requests.shift();
  assert.ok(resolve,"Expected a pending RPC");
  resolve({data:rows,error});
 },event(name){assert.ok(listener);listener(name);}};
}
const row=body=>({id,body,author_vatra_id:"12"});
{
 const a=fakeClient();
 const first=commentThreadPage(a.client,params);
 const second=commentThreadPage(a.client,params);
 assert.equal(a.calls,1,"Identical concurrent page opens should share one RPC");
 a.complete([row("first")]);
 const [x,y]=await Promise.all([first,second]);
 assert.equal(x.error,null);
 assert.equal(y.error,null);
 assert.equal(x.data[0].body,"first");
 x.data[0].body="changed by UI";
 assert.equal((await commentThreadPage(a.client,params)).data[0].body,"first",
  "Callers must not mutate cached rows");
 assert.equal(a.calls,1);
 now+=4100;
 const expired=commentThreadPage(a.client,params);
 assert.equal(a.calls,2,"TTL expiry should re-read RLS data");
 a.complete([row("fresh")]);
 assert.equal((await expired).data[0].body,"fresh");
 const anotherSort=commentThreadPage(a.client,{...params,p_sort:"relevant"});
 assert.equal(a.calls,3,"Different ordering must have independent cache keys");
 a.complete([row("sorted")]);await anotherSort;
 invalidateComments(a.client); // successful insert/comment-like must call this
 const afterWrite=commentThreadPage(a.client,params);
 assert.equal(a.calls,4,"Write invalidation must re-read current comment rows");
 a.complete([row("new comment")]);
 assert.equal((await afterWrite).data[0].body,"new comment");
}
{
 const a=fakeClient();
 const old=commentThreadPage(a.client,params);
 a.event("INITIAL_SESSION");a.event("TOKEN_REFRESHED");
 assert.equal(a.calls,1);
 a.event("SIGNED_OUT");
 const fresh=commentThreadPage(a.client,params);
 assert.equal(a.calls,2,"Account switches must never reuse prior RPCs");
 a.complete([row("old session")]); // stale first
 const stale=await old;
 assert.ok(stale.error,"Old RPC results must not cross sessions");
 a.complete([row("new session")]);
 assert.equal((await fresh).data[0].body,"new session");
 assert.equal((await commentThreadPage(a.client,params)).data[0].body,"new session");
}
{
 const a=fakeClient(),b=fakeClient();
 const one=commentThreadPage(a.client,params);
 const two=commentThreadPage(b.client,params);
 assert.equal(a.calls,1);assert.equal(b.calls,1);
 a.complete([row("viewer A")]);b.complete([row("viewer B")]);
 assert.equal((await one).data[0].body,"viewer A");
 assert.equal((await two).data[0].body,"viewer B");
}
{
 const a=fakeClient();
 const failed=commentThreadPage(a.client,params);
 a.complete([],Error("PostgREST unavailable"));
 assert.ok((await failed).error);
 const retry=commentThreadPage(a.client,params);
 assert.equal(a.calls,2,"Failures cannot poison the cache");
 a.complete([row("recovered")]);
 assert.equal((await retry).data[0].body,"recovered");
 assert.ok((await commentThreadPage(a.client,{...params,p_sort:"bad"})).error);
 assert.equal(a.calls,2,"Invalid sort should not call RPC");
}
console.log("VATRA comment cache: single-flight, TTL, account isolation, writes and failure retry passed.");
