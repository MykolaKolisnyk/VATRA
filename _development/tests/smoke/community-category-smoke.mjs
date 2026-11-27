// The real directory, DB constraint and public cache must agree.
import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
const src=await readFile("assets/js/communities.js","utf8");
const edge=await readFile("_development/supabase/functions/public-community-directory/index.ts","utf8");
const sql=await readFile("_development/supabase/migrations/20261118181717_add_community_categories.sql","utf8");
const html=await readFile("communities.html","utf8");
const categories=JSON.parse(src.match(/const categories=(\[\[.*?\]\]);/)[1]);
const keys=categories.map(row=>row[0]);
assert.equal(keys.length,40);assert.equal(new Set(keys).size,40);
assert.ok(categories.every(row=>row.length===3&&row.every(Boolean)));
assert.deepEqual(JSON.parse(edge.match(/const CATEGORY_IDS = new Set\((\[.*?\])\);/)[1]),keys);
assert.deepEqual([...sql.match(/check \(category in \((.*?)\)\)/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]),keys);
assert.ok(html.includes('id="community-category" name="category"')&&html.includes('class="ui-community-category-input-001" required'));
assert.ok(src.includes('if(!categoryNames.has(category))')&&src.includes('.insert({name,description,category})'));
assert.ok(src.includes('request.eq("category",selectedCategory)')&&src.includes('club.category===selectedCategory'));
assert.ok(edge.includes('CATEGORY_IDS.has(c.category)')&&edge.includes('vatra:public:communities:v2:latest100'));
assert.ok(src.includes('for(const [id] of categories)')&&src.includes('topicGrid.append(tile)')&&src.includes('topicGrid.classList.toggle("is-expanded",topicsExpanded)'));
assert.ok(src.includes('topicGrid.addEventListener("wheel"')&&src.includes('{passive:false}')&&src.includes('if(Math.abs(target-topicGrid.scrollLeft)<=1)return;')&&src.includes('topicGrid.scrollBy')&&src.includes('previousTopic.disabled')&&src.includes('nextTopic.disabled'));
assert.ok(!src.includes('community-topic-filter')&&!src.includes('ui-community-topic-select-001'));
const covers=JSON.parse(src.match(/const topicCovers=(\{[^\n]+\});/)[1]);
assert.deepEqual(Object.keys(covers).sort(),keys.slice().sort(),"Every topic must have a dedicated cover");
assert.equal(new Set(Object.values(covers)).size,Object.keys(covers).length);
const folder="assets/illustrations/";
const files=Object.values(covers).map(name=>name+".webp").sort();
const available=new Set(await readdir(folder));
assert.ok(files.every(name=>available.has(name))&&available.has("communities.webp"),"All 40 mapped covers and the community banner must exist in shared illustrations");
for(const name of [...files,"communities.webp"]){
 const bytes=await readFile(folder+name);
 assert.ok(bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP",name+" must be actual WebP");
}
assert.ok(src.includes('node("span","ui-community-topic-photo-001")')&&src.includes('new IntersectionObserver')&&src.includes('coverObserver.unobserve')&&src.includes('assets/illustrations/')&&src.includes('["contextmenu","dragstart"]'));
assert.ok(!src.includes('node("img","ui-community-topic-photo-001")')&&!src.includes("assets/other/"));
assert.ok(html.includes('<span class="ui-community-banner-art-001" aria-hidden="true"></span>'));
const css=await readFile("assets/css/communities.css","utf8");
assert.ok(css.includes('../illustrations/communities.webp')&&css.includes('background-size:cover;background-position:center')&&css.includes('pointer-events:none'));
assert.ok(css.includes('flex-wrap:nowrap')&&css.includes('flex:0 0 var(--topic-width)')&&css.includes('aspect-ratio:1.65')&&css.includes('overflow-x:auto')&&css.includes('touch-action:pan-x pan-y pinch-zoom')&&css.includes('.ui-community-topic-grid-001.is-expanded'));
console.log("VATRA community categories: forty unique IDs, bilingual labels, required form, exact filters, DB constraints and cache schema agree.");

assert.ok(!html.includes('id="community-business-enabled"')&&!src.includes("business_enabled")&&html.includes('<dialog id="community-create-panel"')&&src.includes("panel.showModal()"),"Community creation has no retired business opt-in");

assert.ok(src.indexOf("const membershipTask=Promise.allSettled(")<src.indexOf("if(!term&&PUBLIC_DIRECTORY_CACHE_ENABLED")&&src.includes("const results=await membershipTask;"),"Independent directory and membership reads start in parallel");
