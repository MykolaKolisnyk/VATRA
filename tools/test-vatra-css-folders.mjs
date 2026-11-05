import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const modules=[
 ['vatra-music.css','assets/styles/sources/media/vatra-music.css'],
 ['vatra-community-v2.css','assets/styles/sources/social/vatra-community-v2.css'],
 ['vatra-post-composer.css','assets/styles/sources/social/vatra-post-composer.css'],
 ['vatra-color-balance.css','assets/styles/sources/foundation/vatra-color-balance.css'],
 ['vatra-neutral.css','assets/styles/sources/foundation/vatra-neutral.css'],
 ['vatra-ux.css','assets/styles/sources/foundation/vatra-ux.css'],
 ['vatra-notifications-redesign.css','assets/styles/sources/social/vatra-notifications-redesign.css'],
 ['vatra-clip-processing.css','assets/styles/sources/media/vatra-clip-processing.css'],
 ['vatra-editor-rework.css','assets/styles/sources/social/vatra-editor-rework.css']
];
const paths=JSON.parse(readFileSync('assets/styles/manifest.json','utf8')).files;
const compiled=readFileSync('assets/styles/vatra.css','utf8');
let last=-1;
for(const [oldFile,newFile] of modules){
 assert.ok(!existsSync(oldFile),'Legacy root CSS copy still exists: '+oldFile);
 assert.ok(existsSync(newFile),'Categorized CSS source missing: '+newFile);
 assert.ok(!/@import\s/i.test(readFileSync(newFile,'utf8')),'Bundled source cannot include imports: '+newFile);
 assert.ok(!/url\s*\(/i.test(readFileSync(newFile,'utf8')),'Moved module requires URL-relative audit: '+newFile);
 assert.ok(paths.includes(newFile),'Manifest must use categorized source: '+newFile);
 assert.ok(!paths.includes(oldFile),'Manifest retains obsolete root source: '+oldFile);
 assert.ok(compiled.includes('/* ORIGINAL FILE: '+newFile+'. Keep order from index.html. */'),'Compiled CSS missing source provenance: '+newFile);
 assert.ok(!compiled.includes('/* ORIGINAL FILE: '+oldFile+'. Keep order from index.html. */'),'Compiled CSS contains obsolete provenance: '+oldFile);
}
assert.equal(paths.length,new Set(paths).size,'CSS manifest must not have duplicate entries');
console.log('VATRA styles: nine categorized sources with no stale root copies.');
