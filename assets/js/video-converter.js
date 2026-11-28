const base="https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/",limit=52428800;
async function verified(name,hash,type){
 const response=await fetch(base+name,{credentials:"omit",referrerPolicy:"no-referrer",cache:"force-cache"});
 if(!response.ok)throw Error("engine unavailable");
 const bytes=await response.arrayBuffer();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
 if(digest!==hash)throw Error("engine integrity");
 return URL.createObjectURL(new Blob([bytes],{type}));
}
function compatibleStreams(core){
 try{
  core.setTimeout(5000);
  const result=core.ffprobe("-v","error","-protocol_whitelist","file,pipe","-i","input.bin","-show_streams","-show_format","-of","json","-o","probe.json");
  if(result!==0)return false;
  const info=JSON.parse(new TextDecoder().decode(core.FS.readFile("probe.json")));
  const streams=info.streams||[],v=streams.find(s=>s.codec_type==="video"),a=streams.find(s=>s.codec_type==="audio");
  const rate=String(v?.avg_frame_rate||"").split("/").map(Number),fps=rate[0]/rate[1];
  const duration=Number(info.format?.duration),bitrate=Number(v?.bit_rate);
  return !!v&&v.codec_name==="h264"&&["Baseline","Constrained Baseline","Main","High"].includes(v.profile)&&
   v.pix_fmt==="yuv420p"&&v.width>0&&v.width<=1280&&v.height>0&&v.height<=1280&&v.width%2===0&&v.height%2===0&&
   v.level>0&&v.level<=41&&v.sample_aspect_ratio==="1:1"&&Number.isFinite(fps)&&fps>0&&fps<=60&&
   Number.isFinite(duration)&&duration>0&&bitrate>0&&bitrate<=4000000&&
   !v.disposition?.attached_pic&&!v.side_data_list?.length&&!v.tags?.rotate&&
   (!a||(a.codec_name==="aac"&&a.profile==="LC"&&a.channels>0&&a.channels<=2&&Number(a.sample_rate)<=48000&&Number(a.sample_rate)>0));
 }catch(_){return false;}
 finally{core.reset();try{core.FS.unlink("probe.json");}catch(_){}}
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
  let mode="transcode";
  const common=["-nostdin","-protocol_whitelist","file,pipe","-i","input.bin","-map","0:v:0","-map","0:a:0?","-sn","-dn","-map_metadata","-1","-map_metadata:s","-1","-map_chapters","-1"];
  if(compatibleStreams(core)){
   try{
    core.setTimeout(15000);
    core.exec(...common,"-c","copy","-movflags","+faststart","output.mp4");
    if(core.ret===0){const bytes=core.FS.stat("output.mp4").size;if(bytes>0&&bytes<=limit)mode="remux";}
   }catch(_){}
   if(mode!=="remux"){core.reset();try{core.FS.unlink("output.mp4");}catch(_){}}
  }
  if(mode==="transcode"){
   core.setTimeout(140000);
   core.exec(...common,"-vf","scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1","-c:v","libx264","-pix_fmt","yuv420p","-preset","ultrafast","-crf","25","-maxrate","4M","-bufsize","8M","-c:a","aac","-b:a","128k","-movflags","+faststart","output.mp4");
  }
  if(core.ret!==0)throw Error("conversion failed");
  const output=core.FS.readFile("output.mp4");
  if(!output.length||output.length>limit)throw Error("output limit");
  const bytes=output.slice().buffer;
  self.postMessage({bytes,mode},[bytes]);
 }catch(_){self.postMessage({error:true});}
 finally{if(js)URL.revokeObjectURL(js);if(wasm)URL.revokeObjectURL(wasm);}
};
