import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const read=path=>readFile(path,"utf8");
const host=await read("assets/js/host.js");
const page=await read("maintenance.html");
const panel=await read("assets/js/admin.js");
assert.ok(page.includes("assets/vatryk/vatryk_technician.webp")&&page.includes("maintenance-admin=1"));
assert.ok(panel.includes('from("site_maintenance").update({enabled:next})')&&panel.includes("maintenance.html?preview=1"));
async function simulate({enabled,owner=false,path="/VATRA/feed",search="",failure=false}){
 const redirects=[],requests=[],events={};
 const location={protocol:"https:",hostname:"mykolakolisnyk.github.io",origin:"https://mykolakolisnyk.github.io",pathname:path,search,replace:url=>redirects.push(url)};
 const doc={readyState:"complete",visibilityState:"visible",addEventListener:(name,fn)=>{events[name]=fn;}};
 const window={addEventListener:(name,fn)=>{events[name]=fn;},supabase:{createClient:()=>({rpc:async name=>{assert.equal(name,"vatra_admin_access");return {data:owner,error:null};},auth:{stopAutoRefresh(){}}})}};
 let value=enabled;
 const timers=new Map();let id=0;
 const context={document:doc,window,location,URL,URLSearchParams,AbortController,
 fetch:async(url,options)=>{requests.push(url);assert.equal(options.cache,"no-store");if(failure)throw Error("offline");return {ok:true,json:async()=>[{enabled:value}]};},
 setTimeout:()=>++id,clearTimeout(){},setInterval:fn=>{timers.set(++id,fn);return id;},clearInterval:()=>{}};
 runInNewContext(host,context);
 for(let i=0;i<20;i++)await Promise.resolve();
 return {redirects,requests,events,timers,setEnabled:v=>{value=v;}};
}
const normal=await simulate({enabled:false});
assert.equal(normal.redirects.length,0);
normal.setEnabled(true);await normal.events["vatra-maintenance-changed"]();assert.match(normal.redirects[0],/maintenance\.html$/);
const guest=await simulate({enabled:true});assert.match(guest.redirects[0],/maintenance\.html$/);
const admin=await simulate({enabled:true,owner:true});assert.equal(admin.redirects.length,0);
const recovery=await simulate({enabled:true,path:"/VATRA/",search:"?maintenance-admin=1"});assert.equal(recovery.redirects.length,0);assert.equal(recovery.requests.length,0);
const maintenance=await simulate({enabled:true,path:"/VATRA/maintenance.html"});assert.equal(maintenance.redirects.length,0);
const offline=await simulate({enabled:true,failure:true});assert.equal(offline.redirects.length,0);
console.log("VATRA maintenance: inactive, active guest, owner bypass, recovery route and network failure verified.");