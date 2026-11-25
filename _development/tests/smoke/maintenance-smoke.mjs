import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const read=path=>readFile(path,"utf8");
const host=await read("assets/js/host.js");
const page=await read("maintenance.html");
const maintenanceScript=await read("assets/js/maintenance.js");
assert.ok(page.includes("assets/vatryk/vatryk_technician.webp")&&
 page.includes('data-i18n="maintenance-heading"')&&page.includes('data-i18n="maintenance-copy"'));
assert.doesNotMatch(page,/<(?:header|footer|button|a|section)\b|data-language-trigger|maintenance-owner=1|maintenance-status/);
assert.ok(host.includes('get("maintenance-owner")==="1"'),"Direct owner recovery route is retained");
assert.ok(host.includes('rpc("vatra_maintenance_access")'));
async function simulate({enabled,owner=false,path="/VATRA/feed",search="",failure=false}){
 const redirects=[],requests=[],events={},roleChecks=[];
 const location={protocol:"https:",hostname:"mykolakolisnyk.github.io",origin:"https://mykolakolisnyk.github.io",pathname:path,search,replace:url=>redirects.push(url)};
 const doc={readyState:"complete",visibilityState:"visible",addEventListener:(name,fn)=>{events[name]=fn;}};
 const window={addEventListener:(name,fn)=>{events[name]=fn;},supabase:{createClient:()=>({rpc:async name=>{assert.equal(name,"vatra_maintenance_access");roleChecks.push(name);return {data:owner,error:null};},auth:{stopAutoRefresh(){}}})}};
 let value=enabled;
 const timers=new Map();let id=0;
 const context={document:doc,window,location,URL,URLSearchParams,AbortController,
 fetch:async(url,options)=>{requests.push(url);assert.equal(options.cache,"no-store");if(failure)throw Error("offline");return {ok:true,json:async()=>[{enabled:value}]};},
 setTimeout:()=>++id,clearTimeout(){},setInterval:fn=>{timers.set(++id,fn);return id;},clearInterval:()=>{}};
 runInNewContext(host,context);
 // Let the initial async check finish across the VM and host Promise queues.
 // The mocked network and RPC settle immediately; a real event-loop turn drains both queues.
 await new Promise(resolve=>setImmediate(resolve));
 return {redirects,requests,events,timers,roleChecks,setEnabled:v=>{value=v;}};
}
const normal=await simulate({enabled:false});
assert.equal(normal.redirects.length,0);
assert.equal(normal.requests.length,1);assert.equal(normal.roleChecks.length,0);
normal.setEnabled(true);await normal.events["vatra-maintenance-changed"]();assert.match(normal.redirects[0],/maintenance\.html$/);
assert.equal(normal.requests.length,3);assert.equal(normal.roleChecks.length,1);
const guest=await simulate({enabled:true});assert.match(guest.redirects[0],/maintenance\.html$/);
assert.equal(guest.requests.length,2);assert.equal(guest.roleChecks.length,1);
const admin=await simulate({enabled:true,owner:true});assert.equal(admin.redirects.length,0);
assert.equal(admin.requests.length,1);assert.equal(admin.roleChecks.length,1);
const recovery=await simulate({enabled:true,path:"/VATRA/",search:"?maintenance-owner=1"});assert.equal(recovery.redirects.length,0);assert.equal(recovery.requests.length,0);
const maintenance=await simulate({enabled:true,path:"/VATRA/maintenance.html"});assert.equal(maintenance.redirects.length,0);
const offline=await simulate({enabled:true,failure:true});assert.equal(offline.redirects.length,0);
console.log("VATRA maintenance: inactive, active guest, owner bypass, recovery route and network failure verified.");
async function simulatePage({enabled,preview=false}){
 const redirects=[],events={},timers=[];let status=enabled,requests=0;
 const doc={currentScript:{src:"https://mykolakolisnyk.github.io/VATRA/assets/js/maintenance.js"},visibilityState:"visible",addEventListener:(name,fn)=>{events[name]=fn;}};
 const window={VATRA_HOST_ALLOWED:true,VATRA_MAINTENANCE_STATUS:async()=>{requests++;if(status instanceof Error)throw status;return status;},addEventListener:(name,fn)=>{events[name]=fn;}};
 runInNewContext(maintenanceScript,{window,document:doc,location:{search:preview?"?preview=1":"",replace:url=>redirects.push(url)},URL,URLSearchParams,setInterval:fn=>{timers.push(fn);}});
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 await settle();
 return {redirects,events,timers,doc,getRequests:()=>requests,setStatus:v=>{status=v;},settle};
}
const activePage=await simulatePage({enabled:true});
assert.equal(activePage.redirects.length,0);
assert.equal(activePage.getRequests(),1);
activePage.setStatus(false);activePage.timers[0]();await activePage.settle();
assert.deepEqual(activePage.redirects,["https://mykolakolisnyk.github.io/VATRA/"]);
const endedPage=await simulatePage({enabled:false});
assert.equal(endedPage.redirects.length,1);
const previewPage=await simulatePage({enabled:false,preview:true});
assert.equal(previewPage.redirects.length,0);assert.equal(previewPage.getRequests(),0);
const offlinePage=await simulatePage({enabled:new Error("offline")});
assert.equal(offlinePage.redirects.length,0);offlinePage.setStatus(false);
offlinePage.events.online();await offlinePage.settle();assert.equal(offlinePage.redirects.length,1);
console.log("VATRA maintenance display: minimal page, automatic recovery, preview and offline retry verified.");
