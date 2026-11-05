import {mkdtempSync,mkdirSync,existsSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const originalCwd=process.cwd();
const tmp=mkdtempSync(join(tmpdir(),'vatra-seo-test-'));
const moduleUrl=pathToFileURL(resolve('tools/build-vatra-seo.mjs')).href;
const first='11111111-1111-4111-8111-111111111111';
const second='22222222-2222-4222-8222-222222222222';
const group='group_test_123';
const profiles=[
 {path:'publicProfiles/'+first,value:{name:'Перший профіль',handle:'pershyi',profileVisibility:'public',searchable:true,updatedAt:Date.UTC(2026,10,4,11,0,0)}},
 {path:'publicProfiles/'+second,value:{name:'Другий профіль',handle:'другий.юзер',profileVisibility:'public',searchable:true}}
];
const groups=[
 {path:'groups/'+group,value:{name:'Тестова спільнота',visibility:'public',ownerUid:first}}
];
let activeProfiles=[first,second],activeGroups=[group],rpcFail=false;
const oldFetch=globalThis.fetch;
globalThis.fetch=async(url)=>{
 const u=new URL(String(url));
 const json=(data,ok=true)=>({ok,status:ok?200:503,json:async()=>data});
 if(u.pathname.endsWith('/rpc/vatra_seo_visible_profile_ids'))return rpcFail?json({},false):json(activeProfiles.map(uid=>({uid})));
 if(u.pathname.endsWith('/rpc/vatra_seo_visible_community_ids'))return rpcFail?json({},false):json(activeGroups.map(group_id=>({group_id})));
 const pattern=u.searchParams.get('path');
 if(pattern==='like.publicProfiles/*')return json(profiles);
 if(pattern==='like.groups/*')return json(groups);
 throw new Error('Unexpected SEO URL '+url);
};
try{
 process.chdir(tmp);
 const run=async(v)=>import(moduleUrl+'?test='+v);
 await run(1);
 assert.ok(existsSync(join('people',first,'index.html')));
 assert.ok(existsSync(join('people',second,'index.html')));
 assert.ok(existsSync(join('people','pershyi','index.html')));
 assert.ok(existsSync(join('people','другий.юзер','index.html')));
 assert.ok(readFileSync(join('people','pershyi','index.html'),'utf8').includes('#/u/pershyi'));
 const guestProfile=readFileSync(join('people','pershyi','index.html'),'utf8');
 assert.ok(guestProfile.includes('data-vatra-public-id="'+first+'"'),'Guest page must identify the profile, not its vanity slug');
 assert.ok(guestProfile.includes('assets/scripts/public/preview.js'),'Guest page must load RLS-limited public posts');
 assert.ok(guestProfile.includes('auth.html?mode=register'),'Guest page must include registration in the topbar');
 assert.ok(guestProfile.includes('id="vatraPublicPosts"'),'Guest page must have an accessible post mount');
 assert.ok(guestProfile.includes('og:updated_time')&&guestProfile.includes('2026-11-04T11:00:00.000Z'),'Public snapshot must show the actual profile update timestamp');
 assert.ok(readFileSync('sitemap.xml','utf8').includes('<lastmod>2026-11-04</lastmod>'),'Sitemap must show the actual edit date');
 assert.ok(existsSync(join('communities',group,'index.html')));
 assert.ok(readFileSync(join('communities',group,'index.html'),'utf8').includes('data-vatra-public-kind="group"'),'Group page must allow public preview');
 activeProfiles=[first];activeGroups=[];
 await run(2);
 assert.ok(!existsSync(join('people',second,'index.html')),'Deleted profile SEO page must be removed');
 assert.ok(!existsSync(join('communities',group,'index.html')),'Deleted community SEO page must be removed');
 let sitemap=readFileSync('sitemap.xml','utf8');
 assert.ok(!sitemap.includes('/people/'+second+'/'));
 assert.ok(sitemap.includes('/people/pershyi/'));
 assert.ok(!sitemap.includes('/people/'+first+'/'));
 assert.ok(!sitemap.includes('/people/'+encodeURIComponent('другий.юзер')+'/'));

 assert.ok(!sitemap.includes('/communities/'+group+'/'));
 activeProfiles=[first,second];activeGroups=[group];
 await run(3);
 assert.ok(existsSync(join('people','другий.юзер','index.html')),'Restored username must be reindexed');
 assert.ok(existsSync(join('communities',group,'index.html')),'Restored public group must be reindexed');
 rpcFail=true;
 let failed=false;
 try{await run(4);}catch{failed=true;}
 assert.ok(failed,'Failed authorization query must not silently wipe SEO content');
 assert.ok(existsSync(join('people',first,'index.html')),'Transient RPC failure erased SEO output');
 console.log('VATRA SEO tests passed: create, delete, recover, fail-safe.');
}finally{
 process.chdir(originalCwd);
 globalThis.fetch=oldFetch;
 rmSync(tmp,{recursive:true,force:true});
}
