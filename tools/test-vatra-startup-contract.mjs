import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>readFileSync(path,'utf8');
const app=read('script.js'), backend=read('vatra-backend.js'), page=read('index.html');
const iconSource=read('vatra-icon-system.js');
const imports=[...app.matchAll(/^import\s*\{([^}]*)\}\s*from\s*['"]\.\/vatra-backend\.js\?v=([^'"]+)['"]/gm)];
assert.equal(imports.length,1,'Core VATRA module must import exactly one shared backend');
const names=imports[0][1].split(',').map(s=>s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
assert.ok(names.length>20,'Expected complete backend import contract');
for(const name of names){
 const expression=new RegExp('\\bexport\\s+(?:(?:async\\s+)?function|const|let|class)\\s+'+name+'\\b');
 assert.match(backend,expression,'Backend is missing imported export: '+name);
}
for(const name of ['getStoryMediaUrl','uploadStoryMedia','removeStoryMedia'])assert.ok(names.includes(name),'Core must load private Stories API: '+name);
assert.ok(page.includes('script.js?v=20261105-horizontal-media1'),'Entry script cache must be refreshed');
assert.ok(imports[0][2].includes('storage-split'),'Entry and backend must use compatible fresh versions');
assert.ok(page.includes('id="vatraScrollToTop"')&&page.includes('hidden><svg'),
 'User-requested scroll-to-top must be restored but hidden until a user scrolls');
assert.ok(app.includes("document.getElementById('vatraScrollToTop')")&&app.includes('button.hidden='),
 'Restored button must remain conditional on actual page scrolling');

const def=iconSource.match(/const GLYPHS=(\{[\s\S]+?\});\s*const ALIASES=/);
assert.ok(def,'Shared SVG icon definitions not found');
const glyphs=JSON.parse(def[1]);
const argsPerCommand={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0};
for(const [name,markup] of Object.entries(glyphs)){
 for(const match of markup.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)){
  const d=match[1],chunks=d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g)||[];
  assert.ok(chunks.length>0,'SVG path missing commands: '+name);
  for(const chunk of chunks){
   const command=chunk[0].toUpperCase(),arity=argsPerCommand[command];
   assert.notEqual(arity,undefined,'Unknown SVG command in '+name+': '+command);
   if(arity===0)continue;
   const params=chunk.slice(1).trim();
   const values=params.match(/[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?/g)||[];
   assert.ok(values.length>=arity&&values.length%arity===0,
     'Invalid SVG path command '+command+' in '+name+': '+chunk);
  }
 }
}
const categories={
 posts:'vatra-photos',comments:'vatra-photos','community-photos':'vatra-photos',
 videos:'vatra-videos','community-videos':'vatra-videos',avatars:'vatra-avatars',
 covers:'vatra-covers',gifts:'vatra-gifts'
};
for(const [type,bucket] of Object.entries(categories)){
 const quoted=JSON.stringify(type).replaceAll('"',"'")+':'+JSON.stringify(bucket).replaceAll('"',"'");
 const key=type==='posts'||type==='comments'||type==='videos'||type==='avatars'||type==='covers'||type==='gifts'?type+":'"+bucket+"'":quoted;
 assert.ok(backend.includes(key),'Wrong media bucket routing for '+type);
}
assert.ok(backend.includes("const STORY_BUCKET='vatra-stories'"),'Stories must stay in private Storage');
assert.ok(backend.includes('client.storage.from(bucket).upload')&&
          backend.includes('client.storage.from(bucket).getPublicUrl'),
          'Upload and public URL generation must use the same content-specific bucket');
assert.ok(backend.includes("const MEDIA_BUCKET = 'vatra-media'"),'Historical bucket identifier must remain for compatibility');
console.log('VATRA startup: '+names.length+' named backend imports, SVG paths and Storage routing validated.');
