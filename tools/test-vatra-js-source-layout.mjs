import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {dirname,join,normalize} from 'node:path';
const rootJs=readdirSync('.').filter(name=>name.endsWith('.js'));
assert.deepEqual(rootJs,[],'Legacy root JavaScript duplicates remain');
const dirs=['app','auth','backend','admin','editor','gifts','i18n','media','navigation','public','security','social','support','ui'];
const modules=readdirSync('assets/scripts',{recursive:true}).filter(p=>p.endsWith('.js')).map(p=>join('assets/scripts',p));
assert.ok(modules.length>=30,'Application modules missing from categorized folders');
for(const dir of dirs)assert.ok(modules.some(p=>p.includes('/'+dir+'/')),dir+': missing logical module folder');
const seen=new Set();
for(const module of modules){
 assert.ok(!seen.has(module),'Duplicate JS path: '+module);
 seen.add(module);
 const src=readFileSync(module,'utf8');
 const imports=[...src.matchAll(/\bfrom\s*['"](\.\.?\/[^'"]+)['"]/g),...src.matchAll(/\bimport\s*\(\s*['"](\.\.?\/[^'"]+)['"]/g)];
 for(const [,url] of imports){
  const target=normalize(join(dirname(module),url.split('?')[0]));
  assert.ok(existsSync(target),module+': broken module import '+url);
 }
}
for(const [page,path] of [
 ['index.html','assets/scripts/app/main.js'],
 ['index.html','assets/scripts/ui/icons.js'],
 ['auth.html','assets/scripts/auth/auth.js'],
 ['register.html','assets/scripts/auth/auth.js']
]){
 const html=readFileSync(page,'utf8');
 assert.ok(html.includes('src="'+path+'?'),page+': entry point must use categorized module '+path);
}
const seo=readFileSync('tools/build-vatra-seo.mjs','utf8');
assert.ok(seo.includes('../../assets/scripts/public/preview.js?'),'SEO builder must use categorized public preview module');
assert.ok(existsSync('.nojekyll'),'GitHub Pages must not process frontend modules with Jekyll');
console.log('VATRA JS: no root copies, categorized modules, valid imports and working entrypoint paths.');
