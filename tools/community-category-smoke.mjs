// The real directory, DB constraint and public cache must agree.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const src=await readFile("assets/js/communities.js","utf8");
const edge=await readFile("supabase/functions/public-community-directory/index.ts","utf8");
const sql=await readFile("supabase/migrations/20261118181717_add_community_categories.sql","utf8");
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
console.log("VATRA community categories: forty unique IDs, bilingual labels, required form, exact filters, DB constraints and cache schema agree.");
