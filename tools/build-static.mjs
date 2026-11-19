import assert from "node:assert/strict";
import {cp,mkdir,readdir,readFile,writeFile,rm,stat} from "node:fs/promises";
import {resolve,join,extname} from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {transform,version} from "esbuild";
const root=fileURLToPath(new URL("../",import.meta.url));
const output=resolve(root,"dist");
assert.equal(version,"0.28.2","Use the pinned esbuild version");
assert.notEqual(output,resolve(root),"Refusing to replace source");
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
const publicFiles=(await readdir(root,{withFileTypes:true})).filter(x=>x.isFile()&&(/\.html$/.test(x.name)||["sw.js","site.webmanifest","sitemap.xml","CNAME","robots.txt",".nojekyll"].includes(x.name)));
for(const entry of publicFiles)await cp(join(root,entry.name),join(output,entry.name));
await cp(join(root,"assets"),join(output,"assets"),{recursive:true});
await writeFile(join(output,".nojekyll"),"");
let before=0,after=0,count=0;
async function minify(path){
 for(const entry of await readdir(path,{withFileTypes:true})){
  const file=join(path,entry.name);
  if(entry.isDirectory()){await minify(file);continue;}
  const ext=extname(entry.name);if(ext!==".js"&&ext!==".css")continue;
  if(path===output&&entry.name!=="sw.js")continue;
  const original=await readFile(file,"utf8");
  const options=ext===".js"?{loader:"js",minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:false,legalComments:"inline",charset:"utf8"}:{loader:"css",minify:true,legalComments:"inline",charset:"utf8"};
  const result=await transform(original,{...options,sourcefile:entry.name,target:"esnext"});
  assert.ok(typeof result.code==="string",file+": minifier did not return a string");
  for(const warning of result.warnings)console.warn(file+": "+warning.text);
  await writeFile(file,result.code);before+=Buffer.byteLength(original);after+=Buffer.byteLength(result.code);count++;
 }
}
await minify(output);
execFileSync(process.execPath,[join(root,"tools","revision-assets.mjs"),"--write"],{cwd:output,stdio:"inherit"});
execFileSync(process.execPath,[join(root,"tools","revision-assets.mjs")],{cwd:output,stdio:"inherit"});
for(const page of ["index.html","feed.html","profile.html","marketplace.html","clips.html","club.html","vatra-id.html"]){
 assert.ok((await stat(join(output,page))).size>0,page+" missing from static build");
}
assert.ok(count>10&&after<before,"Expected smaller production assets");
const summary={files:count,originalBytes:before,minifiedBytes:after,savedBytes:before-after};
console.log("VATRA static build: "+JSON.stringify(summary));
await writeFile(join(root,"build-summary.json"),JSON.stringify(summary,null,2)+"\n");
