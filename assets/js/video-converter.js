// On-demand, single-thread FFmpeg. User media stays in this worker.
const base="https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/",limit=52428800;
async function verified(name,hash,type){
 const response=await fetch(base+name,{credentials:"omit",referrerPolicy:"no-referrer",cache:"force-cache"});
 if(!response.ok)throw Error("engine unavailable");
 const bytes=await response.arrayBuffer();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
 if(digest!==hash)throw Error("engine integrity");
 return URL.createObjectURL(new Blob([bytes],{type}));
}
self.onmessage=async({data:file})=>{
 let js,wasm;
 try{
  if(!(file instanceof Blob)||!file.size||file.size>limit)throw Error("input limit");
  js=await verified("ffmpeg-core.js","67a48f11645f85439f3fde4f2119042c16b374b910206b7a7a24f342e28dcae3","text/javascript");
  wasm=await verified("ffmpeg-core.wasm","9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7","application/wasm");
  const {default:createCore}=await import(js);
  const core=await createCore({mainScriptUrlOrBlob:js+"#"+btoa(JSON.stringify({wasmURL:wasm,workerURL:""}))});
  core.FS.writeFile("input.bin",new Uint8Array(await file.arrayBuffer()));
  core.exec("-protocol_whitelist","file,pipe","-i","input.bin","-map","0:v:0","-map","0:a:0?","-sn","-dn","-map_metadata","-1","-map_chapters","-1","-vf","scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1","-c:v","libx264","-pix_fmt","yuv420p","-preset","ultrafast","-crf","25","-maxrate","4M","-bufsize","8M","-c:a","aac","-b:a","128k","-movflags","+faststart","output.mp4");
  if(core.ret!==0)throw Error("conversion failed");
  const output=core.FS.readFile("output.mp4");
  if(!output.length||output.length>limit)throw Error("output limit");
  const bytes=output.slice().buffer;
  self.postMessage({bytes},[bytes]);
 }catch(_){self.postMessage({error:true});}
 finally{if(js)URL.revokeObjectURL(js);if(wasm)URL.revokeObjectURL(wasm);}
};
