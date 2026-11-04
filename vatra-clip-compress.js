// Native, in-browser clip optimization. No external converter and no uploading source media.
// MediaRecorder support and playable codecs vary by browser; a clear error is returned if unavailable.
export async function compressVatraClip(source,{signal,onProgress=()=>{},maxBytes=50*1024*1024}={}){
 if(!source||!Number.isFinite(source.size))throw new Error('Відеофайл не вдалося прочитати.');
 if(typeof MediaRecorder==='undefined' || !HTMLCanvasElement.prototype.captureStream)
  throw new Error('Цей браузер не підтримує стискання кліпів. Спробуйте сучасний Chrome, Edge або Safari.');
 const audioClass=window.AudioContext||window.webkitAudioContext;
 if(!audioClass)throw new Error('Браузер не підтримує збереження звуку під час стискання.');
 const candidates=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm'];
 const mime=candidates.find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime)throw new Error('У цьому браузері недоступний відеокодек для стиснення кліпів.');
 const url=URL.createObjectURL(source),video=document.createElement('video'),canvas=document.createElement('canvas');
 const WIDTH=720,HEIGHT=1280,FPS=24;
 canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
 if(!ctx){URL.revokeObjectURL(url);throw new Error('Неможливо відкрити відеоконвертер.');}
 video.preload='auto';video.playsInline=true;video.muted=false;video.volume=1;video.src=url;
 const audioCtx=new audioClass();
 const dest=audioCtx.createMediaStreamDestination();
 let audioSource,stream,rec,frame=0,timer=0,done=false,resolvePromise,rejectPromise;
 const chunks=[];
 const output=new Promise((resolve,reject)=>{resolvePromise=resolve;rejectPromise=reject;});
 const clean=()=>{
  cancelAnimationFrame(frame);clearTimeout(timer);
  video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);
  stream?.getTracks().forEach(t=>t.stop());
  void audioCtx.close().catch(()=>{});
  signal?.removeEventListener('abort',abort);
 };
 const fail=error=>{
  if(done)return;done=true;
  try{if(rec?.state==='recording')rec.stop();}catch{}
  clean();rejectPromise(error instanceof Error?error:new Error('Не вдалося стиснути кліп.'));
 };
 const abort=()=>fail(new DOMException('Стиснення кліпу скасовано.','AbortError'));
 if(signal?.aborted)abort();
 else signal?.addEventListener('abort',abort,{once:true});
 if(done)return output;
 let lastProgress=0;
 const draw=()=>{
  if(done)return;
  const w=video.videoWidth||1,h=video.videoHeight||1;
  ctx.fillStyle='#071424';ctx.fillRect(0,0,WIDTH,HEIGHT);
  if(video.readyState>=2){
   // Fill the background softly, preserving the entire original video in the foreground.
   const cover=Math.max(WIDTH/w,HEIGHT/h),cw=w*cover,ch=h*cover;
   ctx.save();ctx.filter='blur(34px) brightness(0.48)';ctx.drawImage(video,(WIDTH-cw)/2,(HEIGHT-ch)/2,cw,ch);ctx.restore();
   const contain=Math.min(WIDTH/w,HEIGHT/h),fw=w*contain,fh=h*contain;
   ctx.drawImage(video,(WIDTH-fw)/2,(HEIGHT-fh)/2,fw,fh);
  }
  const now=performance.now();
  if(now-lastProgress>500){
   lastProgress=now;onProgress(Math.min(99,Math.round((video.currentTime/(video.duration||1))*100)));
  }
  frame=requestAnimationFrame(draw);
 };
 try{
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('Браузер не зміг відкрити вихідне відео.')),15000);
   video.onloadeddata=()=>{clearTimeout(timeout);resolve();};
   video.onerror=()=>{clearTimeout(timeout);reject(new Error('Непідтримуваний відеокодек. Спробуйте MP4 (H.264) або WebM.'));};
   video.load();
  });
  if(done)return output;
  if(!Number.isFinite(video.duration)||video.duration<=0||video.duration>180)
   throw new Error('Для кліпу потрібне відео тривалістю до 3 хвилин.');
  audioSource=audioCtx.createMediaElementSource(video);
  audioSource.connect(dest);
  stream=canvas.captureStream(FPS);
  dest.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
  // Keep below the 50 MiB upload limit; target may be ignored by some encoders.
  const videoBitrate=Math.max(240000,Math.min(3000000,Math.floor((Math.min(44*1024*1024,maxBytes*.87)*8/video.duration)-128000)));
  rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:videoBitrate,audioBitsPerSecond:96000});
  rec.onerror=()=>fail(new Error('Помилка відеокодека під час стиснення.'));
  rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  rec.onstop=()=>{
   if(done)return;
   const blob=new Blob(chunks,{type:rec.mimeType||mime});
   if(!blob.size||blob.size>maxBytes){fail(new Error('Стиснений кліп усе ще перевищує 50 МБ. Спробуйте коротший ролик.'));return;}
   const type=blob.type||mime,ext=type.includes('mp4')?'mp4':'webm';
   done=true;clean();onProgress(100);
   resolvePromise(new File([blob],'vatra-clip-'+Date.now()+'.'+ext,{type,lastModified:Date.now()}));
  };
  await audioCtx.resume();
  rec.start(2000);
  draw();
  video.onended=()=>{try{if(rec.state==='recording')rec.stop();}catch(e){fail(e);}};
  timer=setTimeout(()=>fail(new Error('Стиснення зайняло надто багато часу. Спробуйте коротший ролик.')),video.duration*1800+30000);
  await video.play();
 }catch(e){fail(e);}
 return output;
}
