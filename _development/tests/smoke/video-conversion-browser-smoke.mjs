import assert from "node:assert/strict";
import {readFile,writeFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createServer} from "node:http";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {chromium} from "playwright";
const source=await readFile("assets/js/video-converter.js","utf8");
const files=new Map();
for(const [name,type] of [["ffmpeg-core.js","text/javascript"],["ffmpeg-core.wasm","application/wasm"]]){
 const bytes=await readFile("node_modules/@ffmpeg/core/dist/esm/"+name);
 const hash=createHash("sha256").update(bytes).digest("hex");
 assert.ok(source.includes(hash),"Pinned engine digest differs from installed npm package: "+name+" "+hash);
 files.set("/engine/"+name,{bytes,type});
}
const originalBase="https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/";
assert.ok(source.includes(originalBase));
files.set("/worker.js",{bytes:source.replace(originalBase,"/engine/"),type:"text/javascript"});
files.set("/",{bytes:"<!doctype html><title>VATRA isolated video fixture</title>",type:"text/html"});
let engineRequests=0;
const server=createServer((req,res)=>{
 const file=files.get(req.url);
 if(!file){res.writeHead(404);res.end();return;}
 if(req.url.startsWith("/engine/"))engineRequests++;
 res.writeHead(200,{"Content-Type":file.type,"Cache-Control":"public,max-age=3600"});
 res.end(file.bytes);
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const temp=await mkdtemp(join(tmpdir(),"vatra-video-"));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.goto("http://127.0.0.1:"+server.address().port+"/");
 assert.equal(engineRequests,0,"Conversion engine must not be fetched on page load");
 const cases=[["mov","mpeg4","aac","transcode"],["avi","mpeg4","mp3","transcode"],["mkv","libvpx","libopus","transcode"],["webm","libvpx-vp9","libopus","transcode"],["mp4","libx264","aac","remux"]];
 for(const [ext,v,a,mode] of cases){
  const input=join(temp,"input."+ext),out=join(temp,"output-"+ext+".mp4");
  execFileSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi","-i","testsrc2=size=96x64:rate=12","-f","lavfi","-i","sine=frequency=440:sample_rate=44100","-t","1","-c:v",v,"-c:a",a,"-threads","1",...(mode==="remux"?["-vf","setsar=1","-pix_fmt","yuv420p","-profile:v","main","-level:v","3.1","-metadata","title=private title"]:[]),input],{timeout:30000});
  const bytes=Array.from(await readFile(input));
  const result=await page.evaluate(async ({bytes,ext})=>await new Promise((resolve,reject)=>{
   const worker=new Worker("/worker.js",{type:"module"});
   const timer=setTimeout(()=>{worker.terminate();reject(Error("Conversion timed out"));},180000);
   const finish=(fn,value)=>{clearTimeout(timer);worker.terminate();fn(value);};
   worker.onerror=e=>finish(reject,Error(e.message));
   worker.onmessage=({data})=>data.bytes?finish(resolve,{bytes:Array.from(new Uint8Array(data.bytes)),mode:data.mode}):finish(reject,Error("Conversion rejected "+ext));
   worker.postMessage(new File([Uint8Array.from(bytes)],"input."+ext,{type:"application/octet-stream"}));
  }),{bytes,ext});
  assert.equal(result.mode,mode,"Expected encoding path for "+ext);
  const output=Buffer.from(result.bytes);await writeFile(out,output);
  const info=JSON.parse(execFileSync("ffprobe",["-v","error","-show_streams","-show_format","-of","json",out],{encoding:"utf8"}));
  assert.equal(info.streams.find(x=>x.codec_type==="video")?.codec_name,"h264");
  assert.equal(info.streams.find(x=>x.codec_type==="video")?.pix_fmt,"yuv420p");
  assert.equal(info.streams.find(x=>x.codec_type==="audio")?.codec_name,"aac");
  assert.ok(Number(info.format.duration)>.8&&Number(info.format.duration)<1.3);
  assert.ok(output.indexOf("moov")>0&&output.indexOf("moov")<output.indexOf("mdat"),"MP4 must have fast-start metadata");
  assert.equal(info.format.tags?.title,undefined,"Container title metadata must not survive");
  console.log(ext+" -> H.264/AAC verified ("+mode+")");
 }
 assert.ok(engineRequests>0);
 const invalid=await page.evaluate(()=>new Promise((resolve,reject)=>{
  const worker=new Worker("/worker.js",{type:"module"});
  const timer=setTimeout(()=>{worker.terminate();reject(Error("Invalid input timed out"));},180000);
  worker.onmessage=({data})=>{clearTimeout(timer);worker.terminate();resolve(data.error===true);};
  worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(Error(e.message));};
  worker.postMessage(new Blob(["not a video"]));
 }));
 assert.equal(invalid,true,"Corrupt video must be rejected");
 console.log("VATRA video: lazy engine, exact package hashes, actual conversion, fast-start and invalid input passed.");
}finally{
 await browser?.close();server.close();await rm(temp,{recursive:true,force:true});
}
