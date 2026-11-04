// VATRA repository-wide diagnostics. Read-only: does not remove user content or generated pages.
import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,extname,basename,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const skipDir=new Set(['.git','node_modules','__pycache__','.cache']);
const files=[];
function walk(dir){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(entry.isDirectory()){if(!skipDir.has(entry.name))walk(join(dir,entry.name));}
  else if(entry.isFile())files.push(relative(ROOT,join(dir,entry.name)).split(sep).join('/'));
 }
}
walk(ROOT);
files.sort();
const textExtensions=new Set(['.html','.css','.js','.ts','.mjs','.yml','.yaml','.txt','.svg','.xml','.sql','.py','.md','.json']);
const textFiles=new Map();
for(const path of files)if(textExtensions.has(extname(path).toLowerCase())){
 try{textFiles.set(path,readFileSync(join(ROOT,path),'utf8'));}catch(err){throw Error('Unable to read '+path+': '+err.message);}
}
const rootAssets=files.filter(path=>!path.includes('/')&&/\.(?:css|js|svg|png|ttf|woff2|jpg|webp)$/i.test(path));
const candidates=rootAssets.filter(path=>{
 let used=[];
 for(const [source,text] of textFiles){
  if(source!==path&&text.includes(basename(path)))used.push(source);
 }
 return !used.length;
});
function isExternal(spec){
 return /^(?:https?:|data:|blob:|\/\/|#|mailto:|tel:|javascript:)/i.test(spec) ||
 spec.includes('${')||spec.includes('{{');
}
const hardMissing=[];
const checkedLinks=[];
function checkLink(source,spec,tag){
 if(isExternal(spec))return;
 const clean=spec.trim().split(/[?#]/)[0];
 if(!clean||clean.startsWith('/')||clean.startsWith('%'))return;
 // In code generated inside a runtime template the final path is not statically known.
 if(/[<>*'"${}]/.test(clean))return;
 const candidate=resolve(ROOT,dirname(source),decodeURIComponent(clean));
 if(!candidate.startsWith(ROOT+sep)&&candidate!==ROOT)return;
 const target=relative(ROOT,candidate).split(sep).join('/');
 checkedLinks.push([source,spec,target]);
 if(!existsSync(candidate))hardMissing.push({from:source,target,tag});
}
for(const [path,source] of textFiles){
 if(extname(path)==='.html'){
  for(const match of source.matchAll(/<(?:script|link|img|source)\b[^>]*>/gi)){
   const tag=match[0];
   const field=tag.match(/\b(?:src|href|poster)=["']([^"'<>]+)["']/i);
   if(field)checkLink(path,field[1],'html');
  }
 }else if(extname(path)==='.css'){
  for(const match of source.matchAll(/url\(\s*["']?([^)"']+)["']?\s*\)/gi)){
   checkLink(path,match[1],'css');
  }
 }else if(extname(path)==='.js'||extname(path)==='.mjs'||extname(path)==='.ts'){
  for(const match of source.matchAll(/\b(?:from\s*|import\s*\(|import\s*)["'](\.\.?\/[^"'()]+)["']/g)){
   checkLink(path,match[1],'import');
  }
 }
}
const duplicateGroups=new Map();
for(const path of files){
 const hash=createHash('sha256').update(readFileSync(join(ROOT,path))).digest('hex');
 const group=duplicateGroups.get(hash)||[];
 group.push(path);
 duplicateGroups.set(hash,group);
}
const duplicates=[...duplicateGroups.values()].filter(group=>group.length>1);
const jsErrors=[];
for(const path of files.filter(path=>path.endsWith('.js')||path.endsWith('.mjs'))){
 const code=readFileSync(join(ROOT,path),'utf8');
 const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:code,encoding:'utf8',maxBuffer:400_000});
 if(result.status!==0)jsErrors.push({file:path,error:(result.stderr||result.stdout).slice(0,500)});
}
const selectors=new Map();
for(const [path,text] of textFiles)if(path.endsWith('.css')){
 for(const m of text.matchAll(/(?:^|\})\s*([^{}@;][^{}]{0,160})\{/gm)){
  const key=m[1].replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').trim();
  if(!key||key.startsWith('@')||!/[.#\[]/.test(key))continue;
  const refs=selectors.get(key)||new Set();refs.add(path);selectors.set(key,refs);
 }
}
const crossCSS=[...selectors].filter(([,refs])=>refs.size>=4).sort((a,b)=>b[1].size-a[1].size)
 .slice(0,16).map(([selector,refs])=>({selector:selector.slice(0,130),sheets:refs.size}));

const liveCode=[...textFiles].filter(([path])=>/\.(?:html|css|js|ts)$/.test(path) &&
 !path.startsWith('tools/') && !path.startsWith('.github/'));
const assetMentions={};
for(const asset of ['logo.png','vatra-icon.png','favicon.png','vatra-header.png']){
 assetMentions[asset]=liveCode.filter(([path,contents])=>path!==asset&&contents.includes(asset)).map(([path])=>path);
}
const htmlScriptRoots=new Set();
const htmlStyles=new Set();
for(const [path,contents] of textFiles)if(path.endsWith('.html')){
 for(const m of contents.matchAll(/<(?:script|link)\b[^>]*>/gi)){
  const tag=m[0];
  const attr=tag.match(/\b(?:src|href)=["']([^"']+)["']/i)?.[1];
  if(!attr||isExternal(attr))continue;
  const clean=attr.split(/[?#]/)[0];
  const local=relative(ROOT,resolve(ROOT,dirname(path),clean)).split(sep).join('/');
  if(tag.startsWith('<script')&&local.endsWith('.js'))htmlScriptRoots.add(local);
  if(tag.startsWith('<link')&&local.endsWith('.css'))htmlStyles.add(local);
 }
}
const reachableJS=new Set(htmlScriptRoots);
let active=true;
while(active){
 active=false;
 for(const path of [...reachableJS]){
  const contents=textFiles.get(path);if(!contents)continue;
  for(const m of contents.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.\.?\/[^"']+\.js(?:\?[^"']*)?)["']/g)){
   const file=relative(ROOT,resolve(ROOT,dirname(path),m[1].split('?')[0])).split(sep).join('/');
   if(textFiles.has(file)&&!reachableJS.has(file)){reachableJS.add(file);active=true;}
  }
 }
}
const unreachableJS=files.filter(path=>path.endsWith('.js')&&!reachableJS.has(path))
 .map(path=>({path,mentions:liveCode.filter(([source,contents])=>source!==path&&contents.includes(basename(path))).map(([source])=>source).slice(0,5)}));
const rootCssUnloaded=files.filter(path=>path.endsWith('.css')&&!htmlStyles.has(path) && !path.includes('/'));

const report={
 counts:{
  files:files.length,folders:[...new Set(files.filter(x=>x.includes('/')).map(x=>dirname(x)))].length,
  css:files.filter(x=>x.endsWith('.css')).length,
  js:files.filter(x=>x.endsWith('.js')).length,
  html:files.filter(x=>x.endsWith('.html')).length,
  workflows:files.filter(x=>x.startsWith('.github/workflows/')).length,
  checkedLinks:checkedLinks.length
 },
 candidates,duplicates,hardMissing,jsErrors,crossCSS,assetMentions,unreachableJS,rootCssUnloaded
};
console.log('VATRA FULL REPOSITORY AUDIT');
console.log(JSON.stringify(report,null,2));
if(jsErrors.length)throw Error('Syntax errors found in '+jsErrors.length+' JavaScript files');
if(hardMissing.length)throw Error('Missing '+hardMissing.length+' local website dependencies');
