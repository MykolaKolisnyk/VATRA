import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync('assets/scripts/backend/client.js','utf8');
const start=source.indexOf('async function readTree(path) {');
const end=source.indexOf('export async function get(reference)',start);
assert.ok(start>=0&&end>start,'Read tree must be a standalone backend routine');
const code=source.slice(start,end);
assert.ok(!code.includes('.range('),'Large tree reads must avoid OFFSET/range');
assert.ok(code.includes(".order('path', { ascending: true }).limit(pageSize)"),'Keyset scan must have explicit, indexed ordering');
assert.ok(code.includes("query.gt('path', afterPath)"),'Subsequent pages must start after their last path');
const records=[{path:'posts',value:{legacy:{text:'preserved'}}}];
for(let i=0;i<1207;i++) records.push({path:'posts/post-'+String(i).padStart(5,'0'),value:{createdAt:i,authorUid:'test'}});
records.push({path:'settings/internal',value:{secret:true}});
let callCount=0,filteredCount=0;
const client={from(table){
 assert.equal(table,'app_data');
 let before=null,limit=0,ordered=false,prefix='';
 const query={
  select(fields){assert.equal(fields,'path,value');return this;},
  or(conditions){assert.ok(conditions.includes('path.eq.posts'));prefix='posts/';return this;},
  gt(column,cursor){assert.equal(column,'path');before=cursor;return this;},
  order(column,opts){assert.equal(column,'path');assert.equal(opts.ascending,true);ordered=true;return this;},
  async limit(n){
   assert.ok(ordered);assert.ok(n<=1000);
   limit=n;callCount++;
   // Simulate RLS + index ordering. The unrelated private row must not leak.
   const found=records.filter(r=>r.path==='posts'||r.path.startsWith(prefix))
    .filter(r=>before===null||r.path>before)
    .sort((a,b)=>a.path.localeCompare(b.path)).slice(0,limit);
   filteredCount+=found.length;
   return {data:found,error:null};
  }
 };
 return query;
}};
const clone=x=>x===undefined?null:JSON.parse(JSON.stringify(x));
const setDeep=(obj,parts,value)=>{
 let cursor=obj;
 for(const part of parts.slice(0,-1))cursor=cursor[part]??={};
 cursor[parts.at(-1)]=clone(value);
};
const getDeep=(obj,parts)=>parts.reduce((o,k)=>o?.[k]??null,obj);
const readTree=runInNewContext(code+';readTree',{client,TABLE:'app_data',cleanPath:s=>String(s).split('/').filter(Boolean).join('/'),clone,setDeep,getDeep,databaseError:e=>e,reportConnection:()=>{}});
const result=await readTree('posts');
assert.equal(Object.keys(result).length,1208,'Every post plus legacy root must survive pagination');
assert.ok(result['post-00000']&&result['post-01206']);
assert.deepEqual(result.legacy,{text:'preserved'});
assert.equal(callCount,3,'1208 rows should need exactly three 500-row page requests');
assert.equal(filteredCount,1208,'No duplicate entries should be requested across pages');
assert.equal(result.internal,undefined,'Unrelated rows must be excluded');
console.log('VATRA keyset: 1208 scoped records in 3 deterministic pages, no OFFSET or duplicate.');
