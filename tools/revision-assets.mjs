import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile,readdir,writeFile} from "node:fs/promises";
const write=process.argv.includes("--write"),memo=new Map(),visiting=new Set();
const pattern=/(assets\/(?:js|css)\/[a-z0-9-]+\.(?:js|css)|account-guard\.js)\?rev=[a-f0-9]{40}/g;
const digest=source=>createHash("sha1").update("blob "+Buffer.byteLength(source)+"\u0000").update(source).digest("hex");
let changes=0,refs=0;
async function visit(path){
 if(memo.has(path))return memo.get(path);
 assert.ok(!visiting.has(path),"Cyclic versioned asset dependency: "+path);visiting.add(path);
 const original=await readFile(path,"utf8");let updated=original;
 for(const match of original.matchAll(pattern)){
  const target=match[1].startsWith("assets/")?match[1]:"assets/js/"+match[1];
  const content=await visit(target);refs++;
  updated=updated.replaceAll(match[0],match[1]+"?rev="+digest(content));
 }
 visiting.delete(path);memo.set(path,updated);
 if(original!==updated){
  changes++;
  if(write)await writeFile(path,updated);
  else throw Error(path+": stale asset revision. Run node tools/revision-assets.mjs --write");
 }
 return updated;
}
for(const file of (await readdir(".")).filter(x=>x.endsWith(".html")))await visit(file);
for(const file of (await readdir("assets/js")).filter(x=>x.endsWith(".js")))await visit("assets/js/"+file);
assert.ok(refs>=16,"Versioned on-demand assets must remain connected");
console.log("VATRA asset revisions: "+refs+" references verified; "+changes+" files updated.");
