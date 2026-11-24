import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const source=await readFile("assets/js/messenger.js","utf8");
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
{
 const remote=deferred(),local=deferred(),started=[],dialogs=[];
 const state={own:"7",terminating:false,client:{from(){return {select(){return this;},eq(){return this;},maybeSingle(){started.push("remote");return remote.promise;}};}}};
 const a=source.indexOf(" async function setupKeys(){"),b=source.indexOf(" async function init(){",a);
 assert.ok(a>=0&&b>a);
 const ctx={state,cryptoBox:()=>({loadRecord(){started.push("local");return local.promise;}}),keyDialog:x=>dialogs.push(x),status(){},t:x=>x};
 runInNewContext(source.slice(a,b)+"\nglobalThis.setup=setupKeys;",ctx);
 const pending=ctx.setup();
 assert.deepEqual(started,["remote","local"],"Remote and device key reads must overlap");
 local.resolve({publicKey:{}});remote.resolve({data:{public_key:{x:"test"}},error:null});
 await pending;
 assert.deepEqual(dialogs,["unlock"]);
}
{
 const key=deferred(),names=deferred(),started=[],state={selected:null,own:"7",peerRequestVersion:0,chatVersion:0};
 const a=source.indexOf(" async function choosePeer(id){"),b=source.indexOf(" async function beginNew(){",a);
 assert.ok(a>=0&&b>a);
 const ctx={state,validId:x=>!!x,$:()=>({replaceChildren(){}}),setPeerHeading(){},renderConversations(){},syncSend(){},
  URLSearchParams,location:{search:"",pathname:"/messenger"},history:{replaceState(){}},
  loadPeerKey(){state.peerRequestVersion++;started.push("key");return key.promise;},
  loadNames(){started.push("names");return names.promise;},renderMessages(){started.push("render");}};
 runInNewContext(source.slice(a,b)+"\nglobalThis.choose=choosePeer;",ctx);
 const pending=ctx.choose("9");
 assert.deepEqual(started,["key","names"]);
 state.peerRequestVersion++;state.selected="10";
 key.resolve();names.resolve();await pending;
 assert.deepEqual(started,["key","names"],"Old chat must not render after navigation");
}
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
console.log("VATRA Messenger and notifications: parallel keys and latest-filter race safety passed.");
