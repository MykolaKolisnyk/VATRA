import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const moves=[
 ['media-viewer.js','assets/scripts/media/media-viewer.js',['index.html']],
 ['vatra-tooltips.js','assets/scripts/ui/vatra-tooltips.js',['index.html']],
 ['vatra-loader.js','assets/scripts/ui/vatra-loader.js',['index.html','auth.html','register.html']],
 ['network-status.js','assets/scripts/network/network-status.js',['index.html','auth.html','register.html']]
];
for(const [oldFile,newFile,pages] of moves){
 assert.ok(!existsSync(oldFile),'Stale duplicate must be removed: '+oldFile);
 assert.ok(existsSync(newFile),'Moved module missing: '+newFile);
 const code=readFileSync(newFile,'utf8');
 assert.ok(code.length>100,'Moved script must not be empty: '+newFile);
 for(const page of pages){
  const html=readFileSync(page,'utf8');
  assert.ok(html.includes('src="'+newFile+'?'),page+': new script path missing');
  assert.ok(!html.includes('src="'+oldFile+'?'),page+': obsolete script path remains');
 }
}
const network=readFileSync('assets/scripts/network/network-status.js','utf8');
assert.ok(network.includes('src="vatra-flame.svg?'),'Network status artwork must remain document-relative after module move');
console.log('VATRA frontend: UI, media and network scripts moved, no legacy copies remain.');
