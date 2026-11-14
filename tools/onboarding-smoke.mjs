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
const {recentSignup,storedKey,readState,saveState}=context.window.VATRA_ONBOARDING_STATE;
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
assert.equal(saveState(store,"654321","done",7),true);
assert.equal(readState(store,"654321").status,"done");
assert.equal(readState(store,"789012").status,"skipped");
backing.set(storedKey("789012"),JSON.stringify({status:"paused",step:100000}));
assert.equal(readState(store,"789012").step,7,"Invalid stored step must be clamped");
backing.set(storedKey("789012"),"{bad json}");
assert.equal(readState(store,"789012"),null);
assert.equal(saveState(store,"bad/id","done",0),false);
assert.equal(readState(store,"bad/id"),null);
const broken={getItem(){throw Error("Blocked storage");},setItem(){throw Error("Blocked storage");}};
assert.equal(readState(broken,"654321"),null);
assert.equal(saveState(broken,"654321","paused",2),false);

// All five exact user-supplied PNGs must exist; do not generate new avatars.
const expected=["welcome","waiting","success","goodbye","explanation"];
for(const variant of expected){
 const p="assets/vatryk/vatryk_"+variant+".png";
 const png=await readFile(p);
 assert.ok(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),p+" must be PNG");
 assert.ok(source.includes("vatryk_"+variant+".png"),variant+" must be used by onboarding");
}
assert.ok(html.includes('src="assets/js/onboarding.js"'));
assert.ok(html.includes('href="assets/css/onboarding.css"'));
assert.ok(source.includes('launch.id="vatra-onboarding-replay"'));
assert.ok(source.includes('milestones.id="vatra-onboarding-tasks"'));
assert.ok(!html.includes('id="vatra-onboarding-replay"'),
 "Shared header must be identical on all member pages");
assert.ok(css.includes("@media(prefers-reduced-motion:reduce)"));
assert.ok(css.includes(".vt-tour-spotlight-001"));

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
assert.ok(source.includes('mode==="tasks"')&&
 source.includes('if(checking)return checking')&&
 source.includes('Date.now()-checkedAt<60000')&&
 source.includes('client.from("profile_media")')&&
 source.includes('client.from("community_follows")'),
 "Milestone checks must be intentional, cached and use caller RLS");
console.log("VATRA onboarding: five original mascots, i18n, session isolation, resumability and eligibility passed.");
