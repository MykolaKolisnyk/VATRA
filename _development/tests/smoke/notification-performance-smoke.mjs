import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const notices=await readFile("assets/js/notifications.js","utf8");
{
 const pending=deferred(),calls=[],run={},list={children:[],replaceChildren(){this.children=[];},setAttribute(){},append(row){this.children.push(row);}},empty={},more={};
 const a=notices.indexOf("async function pageLoad(append=false){"),b=notices.indexOf("function pageUI(){",a);
 assert.ok(a>=0&&b>a);
 const ctx={notificationRun:run,sectionLoading:false,sectionQueued:false,sectionPage:0,sectionFilter:"all",sectionSort:"new",sectionScope:null,
  pick:x=>x==="#notifications-list"?list:x==="#notifications-empty"?empty:more,
  fetchRows:opts=>{calls.push(opts.filter);return calls.length===1?pending.promise:Promise.resolve({rows:[],hasNext:false});},
  authorNames:async()=>({states:new Map(),names:new Map(),avatars:new Map(),forms:new Map()}),
  createRow(){throw Error("Obsolete notification rendered");},renderEmpty(){},t:x=>x,format:x=>x};
 runInNewContext(notices.slice(a,b)+"\nglobalThis.load=pageLoad;",ctx);
 const first=ctx.load();
 ctx.sectionFilter="unread";await ctx.load();
 pending.resolve({rows:[{actor_vatra_id:9}],hasNext:false});
 await first;
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.deepEqual(calls,["all","unread"],"Latest notification filter must be loaded after the pending request");
}
console.log("VATRA notifications: latest-filter race safety passed.");


{
 const a=notices.indexOf(" let positionPending=false;");
 const b=notices.indexOf("\n}",a);
 assert.ok(a>=0&&b>a);
 let positions=0;const frames=[],listeners={};
 const ctx={open:true,positionPanel:()=>{positions++;},requestAnimationFrame:fn=>frames.push(fn),
  window:{addEventListener:(name,fn)=>{listeners[name]=fn;},visualViewport:{addEventListener:(name,fn)=>{listeners["viewport-"+name]=fn;}}}};
 runInNewContext(notices.slice(a,b),ctx);
 for(let i=0;i<50;i++)listeners.scroll();
 listeners.resize();listeners["viewport-resize"]();
 assert.equal(frames.length,1,"Coalesce a burst of 52 events into one frame");
 frames.shift()();assert.equal(positions,1);
 ctx.open=false;listeners.scroll();assert.equal(frames.length,0);
}
console.log("VATRA notification panel: coalesced layout work and no hidden-panel scheduling passed.");

{
 const a=notices.indexOf("async function noticePreviewURL("),b=notices.indexOf("async function enrichNotice(",a);
 assert.ok(a>=0&&b>a);
 let calls=0,finish;
 const run={client:{storage:{from:()=>({createSignedUrl:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}})}}};
 const ctx={window:{},notificationRun:run,URL,Map,Date};
 runInNewContext(notices.slice(a,b)+"\nglobalThis.preview=noticePreviewURL;",ctx);
 const first=ctx.preview(run,"9/posts/preview.jpg"),second=ctx.preview(run,"9/posts/preview.jpg");
 await Promise.resolve();assert.equal(calls,1);
 finish({data:{signedUrl:"https://cxrcycxrlkufozomsxcs.supabase.co/storage/example"},error:null});
 assert.equal(await first,await second);
 await ctx.preview(run,"9/posts/preview.jpg");assert.equal(calls,1);
 const old=ctx.preview(run,"9/posts/old.jpg");await Promise.resolve();
 ctx.notificationRun={};finish({data:{signedUrl:"https://cxrcycxrlkufozomsxcs.supabase.co/storage/old"},error:null});
 await assert.rejects(old,/unavailable/);
 assert.equal(run.previewURLs.has("9/posts/old.jpg"),false);
}
console.log("VATRA notification previews: single-flight, reuse and stale viewer rejection passed.");
