import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join,normalize} from 'node:path';
const root='.';
if(!existsSync('index.html')||existsSync('VATRA/index.html')||!existsSync('.nojekyll'))throw new Error('GitHub Pages site must be deployed from repository root');
const files=readdirSync(root);
const junk=files.filter(f=>/\.(?:sql|md|zip)$/i.test(f));
if(junk.length)throw new Error('Website directory contains documentation or SQL: '+junk.join(', '));
let checked=0;
function checkAsset(spec){
 if(/^(?:https?:|data:|blob:|\/\/|#|mailto:)/i.test(spec))return;
 const clean=spec.split(/[?#]/,1)[0];
 if(!clean||clean.startsWith('/'))return;
 const local=normalize(join(root,clean));
 if(local==='..'||local.startsWith('../')||local.startsWith('..\\'))throw new Error('Path escapes website: '+spec);
 if(!existsSync(local))throw new Error('Missing website dependency: '+local);
 checked++;
}
for(const page of ['index.html','auth.html','register.html','404.html']){
 const body=readFileSync(join(root,page),'utf8');
 const tags=body.match(/<(?:script|link)\b[^>]*>/gi)||[];
 for(const tag of tags){
  const m=tag.match(/\b(?:src|href)=["']([^"']+)["']/i);
  if(m)checkAsset(m[1]);
 }
}
for(const file of files.filter(f=>f.endsWith('.js'))){
 const body=readFileSync(join(root,file),'utf8');
 const refs=[...body.matchAll(/\bfrom\s*["'](\.\/[^"']+)["']/g),
   ...body.matchAll(/\bimport\s*\(\s*["'](\.\/[^"']+)["']/g)];
 for(const m of refs)checkAsset(m[1]);
}
// The public site is intentionally documentation-free. No .md files are required.
console.log('VATRA layout check passed:',checked,'local paths resolved.');

const notFound=readFileSync(join(root,'404.html'),'utf8');
if(!notFound.includes('Сторінку не знайдено') ||
   !notFound.includes('vatra-404-wordmark') ||
   !notFound.includes("location.replace(current")) {
 throw new Error('Custom VATRA 404 page or legacy redirect is missing');
}
const loaderStyles=readFileSync(join(root,'vatra-loader.css'),'utf8');
if(!loaderStyles.includes('.vatra-loading-kicker') ||
   !loaderStyles.includes('.vatra-loading-status') ||
   loaderStyles.includes('@media(prefers-color-scheme:dark)')) {
 throw new Error('Branded loading screen styling is incomplete or has conflicting dark mode');
}
for(const page of ['index.html','auth.html','register.html']){
 const html=readFileSync(join(root,page),'utf8');
 if(!html.includes('vatra-loading-kicker') || !html.includes('vatra-loading-status') ||
     !html.includes('vatra-loader.css?v=20261104-1')) {
   throw new Error('Outdated loading UI on '+page);
 }
}
