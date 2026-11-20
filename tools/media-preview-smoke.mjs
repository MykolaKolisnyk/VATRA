/* Regression checks for VATRA's optional WebP preview generation.
   Offline browser/API stand-ins: no user data, network requests or Storage writes. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source=readFileSync(new URL("../assets/js/post-media.js",import.meta.url),"utf8");
function setup({small=false,decodeFails=false,noFallback=false,previewUploadFails=false}={}){
 const uploads=[],attempts=[],releases=[];
 let count=0,bitmapClosed=0;
 const document={
  documentElement:{lang:"uk"},
  createElement(tag){
   assert.equal(tag,"canvas");
   return {
    width:0,height:0,
    getContext(type){
     assert.equal(type,"2d");
     return {drawImage:()=>{}};
    },
    toBlob(resolve,type,quality){
     assert.equal(type,"image/webp");
     attempts.push({width:this.width,height:this.height,quality});
     const bytes=this.width>=900?500000:Math.max(20000,Math.round(this.width*140));
     resolve(new Blob([new Uint8Array(bytes)],{type}));
    }
   };
  }
 };
 class FallbackImage{
  naturalWidth=1800;naturalHeight=1200;
  decode(){return Promise.resolve();}
 }
 const context={
  window:{},
  document,
  URL:{createObjectURL:()=>{releases.push("created");return "blob:preview";},
       revokeObjectURL:()=>releases.push("revoked")},
  Blob,
  crypto:{randomUUID:()=>`00000000-0000-4000-8000-${String(++count).padStart(12,"0")}`},
  createImageBitmap:decodeFails?async()=>{throw Error("bitmap unavailable");}:async()=>({
   width:1800,height:1200,close:()=>{bitmapClosed++;}
  }),
  ...(noFallback?{}:{Image:FallbackImage})
 };
 runInNewContext(source,context,{filename:"post-media.js"});
 const client={storage:{from:bucket=>({upload:async(path,file,options)=>{
  uploads.push({bucket,path,size:file.size,contentType:options.contentType});
  return {error:previewUploadFails&&path.endsWith(".webp")?{message:"preview offline"}:null};
 }})}};
 return {
  upload:file=>context.window.VATRA_POST_MEDIA.upload(client,"1",file),
  uploads,attempts,releases,closed:()=>bitmapClosed
 };
}
{
 const case1=setup();
 const post=await case1.upload({type:"image/png",size:3_000_000});
 assert.equal(post.media_kind,"image");
 assert.match(post.media_path,/\.png$/);
 assert.match(post.preview_path,/\.webp$/);
 assert.equal(case1.uploads.length,2);
 assert.equal(case1.uploads[0].size,3_000_000);
 assert.equal(case1.uploads[1].contentType,"image/webp");
 assert.ok(case1.uploads[1].size<400*1024);
 assert.equal(case1.attempts.length,2,"Retry a smaller dimension when 960px is too big");
 assert.equal(case1.closed(),1,"Close decoded image bitmap");
}
{
 const small=setup({small:true});
 const post=await small.upload({type:"image/png",size:65_000});
 assert.equal(post.preview_path,undefined);
 assert.equal(small.uploads.length,1,"Skip redundant small-file previews");
 assert.equal(small.attempts.length,0);
}
{
 const fallback=setup({decodeFails:true});
 const post=await fallback.upload({type:"image/png",size:2_000_000});
 assert.match(post.preview_path,/\.webp$/);
 assert.deepEqual(fallback.releases,["created","revoked"],"Release object URL");
}
{
 const failed=setup({previewUploadFails:true});
 const post=await failed.upload({type:"image/png",size:3_000_000});
 assert.match(post.media_path,/\.png$/);
 assert.equal(post.preview_path,undefined,"Original remains usable if optional preview fails");
 assert.equal(failed.uploads.length,2);
}
{
 const unavailable=setup({decodeFails:true,noFallback:true});
 const post=await unavailable.upload({type:"image/png",size:1_000_000});
 assert.match(post.media_path,/\.png$/);
 assert.equal(post.preview_path,undefined);
 assert.equal(unavailable.uploads.length,1);
}
console.log("VATRA adaptive WebP media preview checks: OK");
