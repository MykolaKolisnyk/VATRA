import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=path=>readFileSync(path,'utf8');
const manifest=JSON.parse(read('assets/styles/auth-manifest.json')).files;
const bundle=read('assets/styles/vatra-auth.css');
assert.equal(manifest.length,10,'Registration/login CSS must include ten original modules');
let offset=-1;
for(const name of manifest){
 const marker='/* ORIGINAL FILE: '+name+'. Keep order from index.html. */';
 const next=bundle.indexOf(marker);
 assert.ok(next>offset,'Auth CSS cascade order changed for '+name);
 offset=next;
}
assert.ok(bundle.includes('../fonts/Onest-Variable.ttf'),'CSS font path must resolve from assets/styles');
for(const page of ['auth.html','register.html']){
 const html=read(page);
 const local=[...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+\.css(?:\?[^"]+)?)"/g)].map(match=>match[1]);
 assert.equal(local.length,1,page+': only one stylesheet may load');
 assert.ok(local[0].startsWith('assets/styles/vatra-auth.css?v=20261105-onest-unified1'),page+': canonical authentication stylesheet missing');
}
for(const file of ['assets/styles/sources/auth/auth-form.css','assets/styles/sources/auth/auth-shared.css']){
 assert.ok(!read(file).includes('Inter'),file+': do not override VATRA Onest with legacy fonts');
}
console.log('VATRA auth: two pages load one ordered stylesheet, shared fonts resolve.');
