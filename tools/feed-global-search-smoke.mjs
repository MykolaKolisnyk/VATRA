// Offline regression for VATRA Feed global search request lifetime.
// Uses production search code but no browser network or Supabase project.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const code=await readFile("assets/js/feed.js","utf8");
const first=code.indexOf(" let globalSearchTicket=0,globalSearchController=null");
const last=code.indexOf(" // Independent, fixed-size Supabase cursors",first);
assert.ok(first>0&&last>first,"Global search code is available");
assert.ok(code.includes("globalSearchTicket++;globalSearchController?.abort();"),
 "Signing out cancels the active global search");

const requests=[],groups=[];
let term="";
const make=(tag,cls,value)=>({
 tag,cls,textContent:value||"",attrs:{},children:[],
 append(...elements){this.children.push(...elements);},
 setAttribute(name,value){this.attrs[name]=value;}
});
const searchGroups={
 children:[],
 replaceChildren(...items){this.children=[...items];},
 append(item){this.children.push(item);}
};
const globalResults={hidden:true,isConnected:true};
const searchHeading={textContent:""};
const client={from(table){
 assert.ok(["public_profiles","communities"].includes(table));
 const request={table,field:null,term:null,limit:null,signal:null,resolve:null};
 return {
  select(){return this;},
  ilike(field,text){request.field=field;request.term=text;return this;},
  limit(n){request.limit=n;return this;},
  abortSignal(signal){
   request.signal=signal;
   requests.push(request);
   return new Promise(resolve=>{
    let resolved=false;
    request.resolve=result=>{if(!resolved){resolved=true;resolve(result);}};
    if(signal.aborted)request.resolve({data:null,error:Error("aborted")});
    else signal.addEventListener("abort",()=>
     request.resolve({data:null,error:Error("aborted")}),{once:true});
   });
  }
 };
}};
const scope={
 AbortController,Promise,Map,String,Date,Array,Error,
 client,globalResults,searchHeading,searchGroups,
 node:make,t:uk=>uk,
 loadAvatars:async()=>{groups.push("avatar-lookup");},
 avatarStates:new Map(),memberName:id=>id,applyAvatar(){},
 home:"https://example.invalid/VATRA/",URL,
 document:{createElementNS:()=>make("svg")}
};
runInNewContext(`
let searchTerm="";
${code.slice(first,last)}
globalThis.searchTest={
 setTerm(value){searchTerm=value;},
 loadGlobalResults,
 state(){return {ticket:globalSearchTicket,active:!!globalSearchPending};}
};
`,scope);
const search=scope.searchTest;
const settle=(from,to)=>{
 for(const req of requests.slice(from,to))req.resolve({data:[],error:null});
};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// Repeated identical searches reuse one batch of four field-limited queries.
search.setTerm("vatra");
const one=search.loadGlobalResults();
const identical=search.loadGlobalResults();
assert.equal(requests.length,4,"One phrase has four API reads, not eight");
assert.deepEqual(requests.slice(0,4).map(r=>r.field),
 ["display_name","status_text","name","description"]);
assert.ok(requests.slice(0,4).every(r=>r.limit===8));
assert.ok(requests.slice(0,4).every(r=>r.term==="%vatra%"));

// Changing the phrase aborts the entire previous batch immediately.
search.setTerm("community");
const fresh=search.loadGlobalResults();
assert.equal(requests.length,8);
assert.ok(requests.slice(0,4).every(r=>r.signal.aborted));
assert.ok(requests.slice(4,8).every(r=>!r.signal.aborted));
await one;await identical;
assert.equal(searchHeading.textContent,"Пошук у VATRA: community",
 "Old results must never overwrite the new search heading");
settle(4,8);
await fresh;
assert.equal(search.state().active,false);
assert.equal(globalResults.hidden,true,"No matches hides the empty group");

// Search cleared while another batch is pending must abort all requests.
search.setTerm("other");
const pending=search.loadGlobalResults();
assert.equal(requests.length,12);
search.setTerm("");
await search.loadGlobalResults();
assert.ok(requests.slice(8,12).every(r=>r.signal.aborted));
await pending;
assert.equal(globalResults.hidden,true);
assert.equal(searchGroups.children.length,0);
assert.equal(search.state().active,false);
await tick();
console.log("VATRA Feed global search: cancellation, duplicate coalescing, typed filters and UI isolation passed.");
