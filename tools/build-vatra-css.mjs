import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve,posix} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const rewriteUrls=(css,file)=>css.replace(/url\(\s*(['"]?)([^'"()]+)\1\s*\)/g,(full,quote,link)=>{
 if(/^(?:data:|https?:|\/\/|\/|#|blob:)/i.test(link))return full;
 const path=posix.relative('assets/styles',posix.normalize(posix.join(posix.dirname(file),link)));
 return 'url('+quote+path+quote+')';
});
function build(manifestPath,outputPath){
 const manifest=JSON.parse(readFileSync(resolve(root,manifestPath),'utf8'));
 if(!Array.isArray(manifest.files)||!manifest.files.length)throw new Error('CSS manifest is empty: '+manifestPath);
 const seen=new Set();
 const parts=manifest.files.map(file=>{
  if(!/^[a-zA-Z0-9_.\/-]+\.css$/.test(file)||file.includes('..')||seen.has(file))throw new Error('Invalid CSS module path: '+file);
  seen.add(file);
  const raw=readFileSync(resolve(root,file),'utf8');
  if(/@import\s/i.test(raw))throw new Error('CSS @import must be moved before bundling: '+file);
  return '/* ORIGINAL FILE: '+file+'. Keep order from index.html. */\n'+rewriteUrls(raw,file)+'\n';
 });
 const target=resolve(root,outputPath);
 mkdirSync(dirname(target),{recursive:true});
 writeFileSync(target,parts.join('\n')+'\n','utf8');
 console.log('VATRA stylesheet '+outputPath+': '+manifest.files.length+' source files, '+parts.join('').length+' characters');
}
build('assets/styles/manifest.json','assets/styles/vatra.css');
build('assets/styles/auth-manifest.json','assets/styles/vatra-auth.css');
