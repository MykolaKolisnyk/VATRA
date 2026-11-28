// Site-wide search uses a single permission-scoped RPC per uncached phrase.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const source=await readFile("assets/js/notifications/notifications.js","utf8");
const start=source.indexOf("const SITE_SEARCH_TTL_MS=8_000,SITE_SEARCH_MAX=24;");
const end=source.indexOf("window.VATRA_SITE_SEARCH={search:findSite,",start);
assert.ok(start>=0&&end>start);
let now=Date.now();class TestDate extends Date{static now(){return now;}}
const context={client:null,Date:TestDate,Map,Set,WeakMap,Promise,String,Number,Error,Object,Array,AbortController};
runInNewContext(source.slice(start,end)+"\nglobalThis.testSiteSearch={findSite};",context);
const findSite=context.testSiteSearch.findSite;
function viewer(label,{slow=false,fail=false}={}){
 const calls=[],held=[],aborts=[];let auth;
 const client={auth:{onAuthStateChange(fn){auth=fn;}},rpc(name,args){
  assert.equal(name,"search_site");assert.equal(args.p_limit,20);calls.push(args.p_query);
  const data={people:[{vatra_id:"1",display_name:label}],communities:[{club_id:"2"}],posts:[{id:"p"}],products:[{id:"m"}],clips:[{id:"c"}],photos:[{id:"p"}],videos:[{id:"v"}]};
  let finish,finished=false;const response=new Promise(resolve=>{finish=value=>{if(!finished){finished=true;resolve(value);}};});
  const settle=()=>finish({data,error:fail?Error("RPC failed"):null});
  if(slow)held.push(settle);else settle();
  response.abortSignal=signal=>{const cancel=()=>{aborts.push(args.p_query);finish({data:null,error:Error("Aborted")});};if(signal.aborted)cancel();else signal.addEventListener("abort",cancel,{once:true});return response;};return response;
 }};
 return {client,calls,held,aborts,event:name=>auth(name),settle:()=>held.splice(0).forEach(fn=>fn())};
}
{
 const v=viewer("One");context.client=v.client;
 const [a,b]=await Promise.all([findSite(" VATRA "),findSite("vatra")]);assert.equal(v.calls.length,1);
 assert.equal(a.people[0].display_name,"One");assert.equal(b.products.length,1);assert.equal(a.clips.length,1);assert.equal(a.photos.length,1);assert.equal(a.videos.length,1);
 await findSite("VATRA");assert.equal(v.calls.length,1);
 v.event("INITIAL_SESSION");v.event("TOKEN_REFRESHED");await findSite("vatra");assert.equal(v.calls.length,1);
 const other=viewer("Other");context.client=other.client;assert.equal((await findSite("vatra")).people[0].display_name,"Other");assert.equal(other.calls.length,1);
 context.client=v.client;v.event("SIGNED_OUT");await findSite("vatra");assert.equal(v.calls.length,2);
 now+=8100;await findSite("vatra");assert.equal(v.calls.length,3);
 await findSite("x");assert.equal(v.calls.length,3);
 await findSite("1");await findSite("VATRA ID 1");await findSite("100%_rate");assert.deepEqual(v.calls.slice(-3),["1","VATRA ID 1","100%_rate"]);
}
{
 const v=viewer("Slow",{slow:true});context.client=v.client;const a=new AbortController(),b=new AbortController();
 const first=findSite("same",a.signal),second=findSite("same",b.signal);assert.equal(v.calls.length,1);
 a.abort();assert.equal((await first).people.length,0);assert.equal(v.aborts.length,0);v.settle();assert.equal((await second).people.length,1);
 const dead=new AbortController(),old=findSite("different",dead.signal);dead.abort();assert.equal((await old).people.length,0);assert.equal(v.aborts.length,1);
 const fresh=findSite("different");v.settle();assert.equal((await fresh).people.length,1);
 const stale=findSite("new session");v.event("SIGNED_OUT");v.settle();assert.equal((await stale).people.length,0);
}
{
 const v=viewer("Fail",{fail:true});context.client=v.client;await assert.rejects(findSite("vatra"));await assert.rejects(findSite("vatra"));assert.equal(v.calls.length,2);
}
console.log("VATRA global search: single RPC, seven categories, cache TTL, viewer isolation, cancellation, exact input and errors passed.");

{
 const sql=await readFile("_development/supabase/search-site.sql","utf8");
 assert.ok(sql.includes("exact_id::numeric<=9223372036854775807::numeric then exact_id::bigint"),"Exact ID conversion must guard bigint overflow");
 assert.ok(sql.includes("p.vatra_id=q.exact_bigint")&&!sql.includes("p.vatra_id::text=q.exact_id"),"Exact search must compare the indexed bigint column directly");
 assert.ok(sql.includes("where q.exact_id is not null")&&sql.includes("where q.exact_id is null and (p.display_name ilike q.pattern or p.status_text ilike q.pattern)"),"Numeric and pattern lookup branches must stay mutually exclusive");
}
console.log("VATRA server search: bounded numeric cast and separate exact lookup verified.");
