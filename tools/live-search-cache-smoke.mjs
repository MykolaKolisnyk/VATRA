// VATRA site-wide search: only viewer-local cache; never share RLS-scoped posts.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const source=await readFile("assets/js/notifications.js","utf8");
const start=source.indexOf("const SITE_SEARCH_TTL_MS=8_000,SITE_SEARCH_MAX=24;");
const end=source.indexOf("window.VATRA_SITE_SEARCH={search:findSite};",start);
assert.ok(start>0&&end>start,"Find site-wide search cache code");
let now=Date.parse("2026-11-14T11:00:00Z");
class TestDate extends Date{static now(){return now;}}
const context={client:null,Date:TestDate,Map,Set,WeakMap,Promise,String,Number,Error};
runInNewContext(source.slice(start,end)+"\nglobalThis.testSiteSearch={findSite};",context);
const findSite=context.testSiteSearch.findSite;

function viewer(label,options={}){
 const calls=[],held=[],fail=Boolean(options.fail),defer=Boolean(options.defer);
 let onAuth;
 const dataFor=(table,field)=>{
  if(table==="public_profiles")
   return [{vatra_id:1,display_name:label+" Alice",status_text:"hello"}];
  if(table==="communities")
   return [{club_id:7,name:label+" Friends",description:"Public club"}];
  if(table==="feed_posts")
   return [{id:"1111",body:label+" post",created_at:"2026-11-14"}];
  if(table==="community_posts")
   return [{id:"2222",club_id:7,body:label+" group post",created_at:"2026-11-14"}];
  throw Error("Unexpected search table "+table+" "+field);
 };
 const client={
  auth:{onAuthStateChange(fn){onAuth=fn;return {data:{subscription:{unsubscribe(){}}}};}},
  from(table){
   const query={table,field:null,pattern:null,archived:false};
   const builder={
    select(columns){query.columns=columns;return builder;},
    ilike(field,pattern){query.field=field;query.pattern=pattern;return builder;},
    is(field,value){assert.equal(field,"archived_at");assert.equal(value,null);query.archived=true;return builder;},
    limit(size){
     calls.push({...query,size});
     const outcome={data:dataFor(table,query.field),error:fail?Error("RLS read failed"):null};
     if(defer)return new Promise(resolve=>held.push(()=>resolve(outcome)));
     return Promise.resolve(outcome);
    }
   };
   return builder;
  }
 };
 return {client,calls,held,event(name){assert.ok(onAuth);onAuth(name,{user:null});},
  settle(){for(const fn of held.splice(0))fn();}};
}
{
 const one=viewer("One");
 context.client=one.client;
 const [a,b]=await Promise.all([findSite("  VATRA  "),findSite("vatra")]);
 assert.equal(one.calls.length,6,"Concurrent equivalent searches should send six, not twelve queries");
 assert.equal(a.people.length,1);assert.equal(a.communities.length,1);
 assert.equal(a.posts.length,2);
 assert.equal(b.people[0].display_name,"One Alice");
 assert.ok(one.calls.every(c=>c.pattern==="%VATRA%"||c.pattern==="%vatra%"));
 assert.ok(one.calls.find(c=>c.table==="feed_posts")?.archived,
  "Search must keep archived posts excluded");
 await findSite("VATRA");
 assert.equal(one.calls.length,6,"Cached same-term searches should not reread Supabase");
 const other=viewer("Other");
 context.client=other.client;
 const second=await findSite("vatra");
 assert.equal(other.calls.length,6,"Different clients must not share RLS results");
 assert.equal(second.people[0].display_name,"Other Alice");
 context.client=one.client;
 one.event("INITIAL_SESSION");
 await findSite("vatra");
 assert.equal(one.calls.length,6,"Initial auth state must not clear valid cache");
 one.event("TOKEN_REFRESHED");
 await findSite("vatra");
 assert.equal(one.calls.length,6,"Token refresh must not repeat unchanged searches");
 one.event("SIGNED_OUT");
 await findSite("vatra");
 assert.equal(one.calls.length,12,"A sign-out must invalidate cached RLS results");
 now+=8_100;
 await findSite("vatra");
 assert.equal(one.calls.length,18,"Search cache must expire after eight seconds");
}
{
 const search=viewer("Slow",{defer:true});
 context.client=search.client;
 const old=findSite("news");
 assert.equal(search.calls.length,6);
 search.event("SIGNED_OUT");
 search.settle();
 const previous=await old;
 assert.equal(previous.posts.length,0,"Old session's in-flight results must be suppressed");
 const fresh=findSite("news");
 assert.equal(search.calls.length,12,"Stale searches must not populate a new account's cache");
 search.settle();
 assert.equal((await fresh).people.length,1);
}
{
 const invalid=viewer("Failure",{fail:true});
 context.client=invalid.client;
 await findSite("vatra");
 await findSite("vatra");
 assert.equal(invalid.calls.length,12,"PostgREST errors must not be cached as empty results");
 const empty=await findSite("x");
 assert.equal(empty.people.length,0);
 assert.equal(invalid.calls.length,12,"Short searches should not reach the database");
}
// Escaped wildcards remain literal; the filter remains a typed PostgREST query.
{
 const v=viewer("Escapes");
 context.client=v.client;
 await findSite("100%_rate");
 assert.ok(v.calls.every(c=>c.pattern==="%100\\%\\_rate%"),
  "Percent/underscore wildcards must be escaped before ilike");
}
console.log("VATRA live search: RLS scope, six-query dedup, TTL, auth races, errors and escaped wildcards passed.");
