import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
const rootCss=readdirSync('.').filter(p=>p.endsWith('.css'));
assert.deepEqual(rootCss,[],'Every editable CSS source must be filed under assets/styles/sources/');
const app=JSON.parse(readFileSync('assets/styles/manifest.json','utf8')).files;
const auth=JSON.parse(readFileSync('assets/styles/auth-manifest.json','utf8')).files;
for(const [label,files,bundle] of [['app',app,'assets/styles/vatra.css'],['auth',auth,'assets/styles/vatra-auth.css']]){
 assert.equal(new Set(files).size,files.length,label+' has duplicate CSS modules');
 const css=readFileSync(bundle,'utf8');
 for(const file of files){
  assert.ok(file.startsWith('assets/styles/sources/'),label+': source is not categorized: '+file);
  assert.ok(existsSync(file),label+': missing source: '+file);
  assert.ok(css.includes('/* ORIGINAL FILE: '+file+'. Keep order from index.html. */'),label+': missing compiled module '+file);
 }
}
assert.ok(existsSync('assets/styles/sources/public/public-preview.css'));
assert.ok(!existsSync('vatra-public-preview.css'));
const seo=readFileSync('tools/build-vatra-seo.mjs','utf8');
assert.ok(seo.includes('../../assets/styles/sources/public/public-preview.css'));
const originalFont=readFileSync('assets/styles/sources/foundation/local-fonts.css','utf8');
assert.ok(originalFont.includes('../../../fonts/Onest-Variable.ttf'));
for(const compiled of ['assets/styles/vatra.css','assets/styles/vatra-auth.css']){
 assert.ok(readFileSync(compiled,'utf8').includes('../fonts/Onest-Variable.ttf'),'Bundled local font points to wrong location');
}
console.log('VATRA CSS source structure: all editable modules categorized, no duplicate legacy root files.');
