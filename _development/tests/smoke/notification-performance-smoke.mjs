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
