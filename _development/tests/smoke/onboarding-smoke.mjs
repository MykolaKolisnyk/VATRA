// Isolated first-visit onboarding policy and artwork test: no Supabase traffic.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const source=await readFile("assets/js/onboarding.js","utf8");
const html=await readFile("feed.html","utf8");
const css=await readFile("assets/css/onboarding.css","utf8");
const en=JSON.parse(await readFile("assets/i18n/en.json","utf8"));
const uk=JSON.parse(await readFile("assets/i18n/uk.json","utf8"));
const context={window:{},document:{},location:{href:"https://localhost/VATRA/feed"},
 Date,JSON,Math,Number,String,Map,Set,URL,AbortController};
runInNewContext(source,context);
const {recentSignup,storedKey,readState,saveState,shouldSaveSkip,milestoneSnapshot}=context.window.VATRA_ONBOARDING_STATE;
const now=Date.parse("2026-11-14T19:00:00Z");
assert.equal(recentSignup("2026-11-14T18:59:00Z",now),true);
assert.equal(recentSignup("2026-10-17T19:00:00Z",now),true);
assert.equal(recentSignup("2026-10-01T19:00:00Z",now),false,
 "Older accounts must not be interrupted by the tutorial");
assert.equal(recentSignup("2026-11-14T19:05:00Z",now),false);
assert.equal(recentSignup(null,now),false);
assert.equal(storedKey("654321"),"vatra.onboarding.v1.member.654321");
assert.equal(storedKey("0"),null);
assert.equal(storedKey("../other-member"),null);
const backing=new Map(),store={
 getItem(key){return backing.get(key)||null;},
 setItem(key,value){backing.set(key,value);}
};
assert.equal(readState(store,"654321"),null);
assert.equal(saveState(store,"654321","paused",4),true);
assert.equal(readState(store,"654321").status,"paused");
assert.equal(readState(store,"654321").step,4);
assert.equal(readState(store,"789012"),null,
 "Another member must never inherit the first member's tour position");
assert.equal(saveState(store,"789012","skipped",0),true);
assert.equal(readState(store,"789012").status,"skipped");
// Explicitly skipping a resumed paused tour must be final. Replaying an
// already finished or skipped tour must preserve its terminal state.
assert.equal(shouldSaveSkip(false,{status:"paused"}),true);
assert.equal(shouldSaveSkip(true,{status:"paused"}),true);
assert.equal(shouldSaveSkip(true,null),true);
assert.equal(shouldSaveSkip(true,{status:"done"}),false);
assert.equal(shouldSaveSkip(true,{status:"skipped"}),false);
// Failed or rejected milestone lookups cannot masquerade as incomplete work.
const fulfilled=data=>({status:"fulfilled",value:{data,error:null}});
const denied={status:"fulfilled",value:{data:null,error:{message:"Forbidden"}}};
const rejected={status:"rejected",reason:Error("Offline")};
assert.deepEqual(Array.from(milestoneSnapshot([
 fulfilled({avatar_path:"21/avatar/portrait.webp",cover_path:null}),
 fulfilled([{id:"one"}]),fulfilled([]),rejected
])),[true,false,true,false,null]);
assert.deepEqual(Array.from(milestoneSnapshot([
 denied,fulfilled([]),rejected,fulfilled([{club_id:"91"}])
])),[null,null,false,null,true]);
assert.equal(saveState(store,"654321","done",7),true);
assert.equal(readState(store,"654321").status,"done");
assert.equal(readState(store,"789012").status,"skipped");
backing.set(storedKey("789012"),JSON.stringify({status:"paused",step:100000}));
assert.equal(readState(store,"789012").step,[...source.matchAll(/\{selector:"([^"]+)"/g)].length-1,"Invalid stored step must be clamped");
backing.set(storedKey("789012"),"{bad json}");
assert.equal(readState(store,"789012"),null);
assert.equal(saveState(store,"bad/id","done",0),false);
assert.equal(readState(store,"bad/id"),null);
const broken={getItem(){throw Error("Blocked storage");},setItem(){throw Error("Blocked storage");}};
assert.equal(readState(broken,"654321"),null);
assert.equal(saveState(broken,"654321","paused",2),false);

// All five exact user-supplied WebP files must exist; do not generate new avatars.
const expected=["welcome","waiting","success","goodbye","explanation"];
for(const variant of expected){
 const p="assets/vatryk/vatryk_"+variant+".webp";
 const png=await readFile(p);
 assert.ok(png.toString("ascii",0,4)==="RIFF"&&png.toString("ascii",8,12)==="WEBP"&&png.length>1000,p+" must be WebP");
 assert.ok(source.includes("vatryk_"+variant+".webp"),variant+" must be used by onboarding");
}
assert.ok(html.includes('src="assets/js/onboarding.js?rev='));
assert.ok(html.includes('href="assets/css/onboarding.css?rev='));
assert.ok(source.includes('launch.id="vatra-onboarding-replay"'));
assert.ok(html.includes('id="vatra-first-steps"')&&source.includes('buildSteps();void checkTasks();')&&!source.includes('activate("tasks")'));
assert.ok(!html.includes('id="vatra-onboarding-replay"'),
 "Shared header must be identical on all member pages");
assert.ok(css.includes("@media(prefers-reduced-motion:reduce)"));
assert.ok(css.includes(".vatra-tour-spotlight-001"));
assert.ok(css.includes("transition:left .36s")&&css.includes("transition:left .35s"),
 "Spotlight and card must move smoothly instead of jumping");
assert.ok(source.includes('art=node("span","vatra-tour-mascot-001")')&&
 source.includes('event.preventDefault()')&&
 !source.includes('art=node("img","vatra-tour-mascot-001")'),
 "Vatryk must be decorative and not draggable");
const route=[...source.matchAll(/\{selector:"([^"]+)"/g)].map(match=>match[1]);
assert.deepEqual(Array.from(route),[
 "#feed-search-form",".ui-social-top-feed-001",".ui-social-top-friends-001",
 ".ui-social-top-communities-001",".ui-social-top-clips-001",
 ".ui-social-top-marketplace-001",
 ".ui-feed-notifications-button-001",".ui-feed-music-button-001",
 ".feed-account-toggle",".feed-account-toggle","#feed-filter-options",
 "#feed-create-menu","#feed-create-menu"
],"All sections must be introduced in real header order, then Feed controls");
for(const selector of new Set(route)){
 if(selector.startsWith("#"))
  assert.ok(html.includes('id="'+selector.slice(1)+'"'),"Missing tour target "+selector);
 else assert.ok(html.includes(selector.slice(1)),"Missing tour target "+selector);
}
assert.ok(css.includes("--vatra-tour-pointer-x"),"Anchored cards must point to their highlights");

// Every Ukrainian original string used in onboarding must have an English
// localization through the existing dictionary, not a new HTTP fetch.
const literals=[...source.matchAll(/tr\("([^"]+)"\)/g)].map(x=>x[1]);
const titles=[...source.matchAll(/(?:title|detail):"([^"]+)"/g)].map(x=>x[1]);
for(const phrase of new Set([...literals,...titles])){
 assert.ok(typeof en[phrase]==="string"&&en[phrase].trim(),
  "Missing English onboarding text: "+phrase);
}
assert.ok(uk.__pages.feed&&en.__pages.feed,"Preserve existing feed translations");
assert.ok(!source.includes('fetch('),"Tour must not load a translation or data endpoint");
assert.ok(source.includes('newSession?.user?.id===session?.authUserId'),
 "Supabase SIGNED_IN for the same account must not prematurely close the tour");
assert.ok(source.includes('mode==="tour"||mode==="welcome"')&&
 source.includes('if((eligible&&!saved)||saved?.status==="paused")')&&
 source.includes('saveState(localStorage,session.id,"done",steps.length-1)'),
 "Completing or skipping tour must stay final even after dismissing checklist; paused tours resume");
assert.ok(source.includes('if(!session||!stepsCard||!session.client)return;')&&
 source.includes('if(checking)return checking')&&
 source.includes('Date.now()-checkedAt<60000')&&
 source.includes('client.from("profile_media")')&&
 source.includes('client.from("community_follows")'),
 "Milestone checks must be cached and use caller RLS");
console.log("VATRA onboarding: five original mascots, i18n, session isolation, resumability and eligibility passed.");

 // A synchronously failing PostgREST builder must not leave progress stuck,
 // and one failed milestone must not hide other successful milestones.
const startCheck=source.indexOf("const MILESTONE_TAB_KEY="),endCheck=source.indexOf("async function syncCompleted",startCheck);
assert.ok(startCheck>=0&&endCheck>startCheck);
let failed=true,calls=0;
const mock={
 from(table){
  calls++;
  if(table==="feed_posts"&&failed)throw Error("Synchronous query initialization failed");
  return {select(){return this;},eq(){return this;},or(){return this;},
   maybeSingle:async()=>({data:{avatar_path:"17/avatar/test.webp",cover_path:null},error:null}),
   limit:async()=>({data:table==="feed_posts"?[{id:"post"}]:[],error:null})};
 }
};
const tabBacking=new Map(),sessionStorage={getItem:key=>tabBacking.get(key)||null,setItem:(key,value)=>tabBacking.set(key,value),removeItem:key=>tabBacking.delete(key)};
const taskContext={mock,milestoneSnapshot,Date,Promise,sessionStorage};
runInNewContext(`
let session={client:mock,id:"17",authUserId:"viewer-a"},stepsCard={},checking=null,results=null,checkedAt=0;
const tasks=Array(5).fill(null);
let refreshDisabled=false;
const renderTasks=()=>{refreshDisabled=!!checking;};
${source.slice(startCheck,endCheck)}
globalThis.test={checkTasks,snapshot:()=>({checking,results,refreshDisabled}),clear:()=>{session=null;checking=null;results=null;}};
`,taskContext);
const t=taskContext.test;
const firstCheck=t.checkTasks(true),concurrent=t.checkTasks(true);
await Promise.all([firstCheck,concurrent]);
assert.equal(calls,4,"Concurrent milestone checks must share one request per source");
assert.equal(t.snapshot().checking,null);
assert.equal(t.snapshot().refreshDisabled,false,"Failed query must re-enable the refresh button");
assert.deepEqual(Array.from(t.snapshot().results),[true,false,null,false,false]);
failed=false;
await t.checkTasks(true);
assert.equal(calls,8);
assert.deepEqual(Array.from(t.snapshot().results),[true,false,true,false,false]);
assert.equal(t.snapshot().refreshDisabled,false);
await t.checkTasks(false);
assert.equal(calls,8,"Recent milestone results must be reused");
const old=t.checkTasks(true);t.clear();await old;
assert.equal(calls,8,"Queued milestone work must not start after sign-out");
console.log("VATRA milestones: synchronous failure recovery, partial results, retry, shared request and stale-session guard passed.");

{
 const {readMilestoneTab,writeMilestoneTab}=context.window.VATRA_ONBOARDING_STATE;
 const viewer={id:"17",authUserId:"viewer-a"},other={id:"17",authUserId:"viewer-b"},values=[true,false,true,false,false];
 writeMilestoneTab(sessionStorage,viewer,values,1000);
 assert.deepEqual(Array.from(readMilestoneTab(sessionStorage,viewer,15000).results),values);
 assert.equal(readMilestoneTab(sessionStorage,viewer,16000),null,"Cross-page progress expires after 15 seconds");
 writeMilestoneTab(sessionStorage,viewer,values,1000);
 assert.equal(readMilestoneTab(sessionStorage,other,1001),null,"Different account must not reuse progress");
 assert.equal(tabBacking.size,0);
 writeMilestoneTab(sessionStorage,viewer,[true,null,true,false,false],1000);
 assert.equal(tabBacking.size,0,"Partial errors must not persist across pages");
}
console.log("VATRA onboarding: short viewer-scoped tab cache, expiry and partial failure exclusion passed.");
