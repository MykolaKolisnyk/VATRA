import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'assets/styles/manifest.json'),'utf8'));
if(!Array.isArray(manifest.files)||!manifest.files.length)throw new Error('CSS manifest is empty');
const seen=new Set();
const rewriteUrls=css=>css.replace(/url\(\s*(['"]?)([^'"()]+)\1\s*\)/g,(full,quote,link)=>{
 if(/^(?:data:|https?:|\/\/|\/|#|blob:)/i.test(link))return full;
 return 'url('+quote+'../../'+link+quote+')';
});
const parts=manifest.files.map(file=>{
 if(!/^[a-zA-Z0-9_.\/-]+\.css$/.test(file)||file.includes('..')||seen.has(file))throw new Error('Invalid CSS module path: '+file);
 seen.add(file);
 const raw=readFileSync(resolve(root,file),'utf8');
 if(/@import\s/i.test(raw))throw new Error('CSS @import must be moved before bundling: '+file);
 return '/* ORIGINAL FILE: '+file+'. Keep order from manifest.json. */\n'+rewriteUrls(raw)+'\n';
});
const target=resolve(root,'assets/styles/vatra.css');
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,parts.join('\n')+'\n','utf8');
console.log('VATRA stylesheet: '+manifest.files.length+' source files, '+parts.join('').length+' characters');
