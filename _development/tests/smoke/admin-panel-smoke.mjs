import assert from "node:assert/strict";
import {openPanel,clearPanel} from "../../../assets/js/admin.js";
import {readFile} from "node:fs/promises";
const rootFiles=await Promise.all(["assets/js/announcements.js","assets/js/admin.js","assets/css/admin.css"].map(file=>readFile(file,"utf8")));
assert.ok(rootFiles[0].includes('from("announcements")'));
assert.ok(rootFiles[0].includes('from("announcement_views")'));
assert.ok(!rootFiles[1].includes('from("vatra_announcements")'));
assert.ok(rootFiles[2].includes(".ui-vatra-admin-directory-row-001"));
assert.match(rootFiles[2],/\.ui-vatra-admin-body-001\{[^}]*overflow-y:auto/,"Admin panel must use the body as its only scroll container");
assert.match(rootFiles[2],/\.ui-vatra-admin-nav-001\{[^}]*position:sticky/,"Sidebar must remain sticky");
assert.match(rootFiles[2],/\.ui-vatra-admin-content-001\{[^}]*overflow:visible/,"Content must not have a second scrollbar");
assert.ok(rootFiles[2].includes("html:has(.ui-vatra-admin-dialog-001[open])"),"Background page must not scroll behind admin panel");
const events=[];
class ElementMock{
 constructor(tag="div"){
  this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.className="";this._text="";
  this.dataset={};this.attributes={};this.listeners={};this.style={};this.hidden=false;this.disabled=false;this.value="";this.open=false;
 }
 set textContent(value){this._text=String(value??"");this.replaceChildren();}
 get textContent(){return this._text+this.children.map(child=>child.textContent).join("");}
 append(...nodes){for(const child of nodes){if(child.parentNode)child.remove();this.children.push(child);child.parentNode=this;}}
 before(...nodes){if(!this.parentNode)return;let n=this.parentNode.children.indexOf(this);for(const child of nodes){if(child.parentNode)child.remove();this.parentNode.children.splice(n++,0,child);child.parentNode=this.parentNode;}}
 replaceChildren(...nodes){for(const child of this.children)child.parentNode=null;this.children=[];this.append(...nodes);}
 remove(){if(!this.parentNode)return;const siblings=this.parentNode.children;const idx=siblings.indexOf(this);if(idx>=0)siblings.splice(idx,1);this.parentNode=null;}
 get isConnected(){let el=this;while(el){if(el===document.body)return true;el=el.parentNode;}return false;}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return this.attributes[key]??null;}
 addEventListener(key,fn){(this.listeners[key]??=[]).push(fn);}
 click(){for(const fn of this.listeners.click||[])fn({preventDefault(){}});}
 submit(){for(const fn of this.listeners.submit||[])fn({preventDefault(){}});}
 input(){for(const fn of this.listeners.input||[])fn({preventDefault(){}});}
 showModal(){this.open=true;}
 close(){this.open=false;for(const fn of this.listeners.close||[])fn();}
 scrollIntoView(){}
 querySelector(selector){if(selector.startsWith(".")){const cls=selector.slice(1);return walk(this).find(x=>x.className?.split(" ").includes(cls))||null;}return null;}
}
function walk(node){return node.children.flatMap(child=>[child,...walk(child)]);}
const document={
 body:new ElementMock("body"),documentElement:{lang:"uk"},
 createElement:tag=>new ElementMock(tag),
 createElementNS:(_,tag)=>new ElementMock(tag)
};
globalThis.document=document;
globalThis.window={VATRA_TOAST:{show:(message,kind)=>events.push({message,kind})}};
globalThis.Option=class extends ElementMock{constructor(label,value){super("option");this.textContent=label;this.value=value;}};
globalThis.confirm=()=>false;
const node=(tag,cls,copy)=>{const el=document.createElement(tag);el.className=cls;if(copy!==undefined)el.textContent=copy;return el;};
const button=(cls,copy,fn)=>{const el=node("button",cls,copy);el.type="button";el.addEventListener("click",fn);return el;};
const ui={root:new URL("https://vatra.example/"),t:(uk)=>uk,node,button,icon:()=>node("svg","shield-icon"),valid:id=>/^[1-9][0-9]{0,18}$/.test(String(id))};
const seen=[],readCalls=[],account={vatra_id:25,name:"Тестовий учасник",created_at:"2026-11-21T12:00:00Z",verified:false,state:"active",blocked_until:null};
const daily=Array.from({length:14},(_,i)=>({date:"2026-11-"+String(i+8).padStart(2,"0"),signups:i%3,posts:i%5,comments:i%4}));
const client={
 rpc:async(name,parameters)=>{
  if(name==="admin_console_read"){
   readCalls.push({action:parameters.p_action,payload:parameters.p_payload});
   switch(parameters.p_action){
    case "members_page":return {data:{total:37,items:[account],page:parameters.p_payload?.page||0,page_size:25},error:null};
    case "member_detail":return {data:{posts:3,comments:7,stories:2,reports:0,last_seen_at:"2026-11-21T15:00:00Z",recent_actions:[]},error:null};
    case "analytics":return {data:{daily,active_24h:4,active_7d:19,posts_7d:12,comments_7d:24},error:null};
    case "health":return {data:{checked_at:"2026-11-21T18:00:00Z",db_connections:4,database_size_bytes:10485760,storage_buckets:[{name:"avatars",limit_bytes:31457280}],maintenance:false,moderation_pending:0,audit_24h:0},error:null};
    case "requests_history":return {data:[{vatra_id:11,reason:"Перевірено",status:"approved",created_at:"2026-11-20T12:00:00Z"}],error:null};
    case "reports_history":return {data:[],error:null};
    case "audit_page":return {data:{items:[{id:1,target_vatra_id:11,event:"verify",reason:"Перевірено",created_at:"2026-11-21T18:00:00Z"}],total:1,page:0,page_size:25},error:null};
    default:throw Error("Unknown read action: "+parameters.p_action);
   }
  }
  assert.equal(name,"vatra_admin_manage");
  seen.push(parameters.p_action);
  switch(parameters.p_action){
   case "dashboard":return {data:{accounts:37,verified:1,posts:14,communities:0,verification_pending:2,reports_pending:1,market_pending:3,blocked:0},error:null};
   case "lookup":return {data:account,error:null};
   case "requests":return {data:[],error:null};
   case "reports":return {data:[],error:null};
   case "block":return {data:{ok:true},error:null};
   default:return {data:[],error:null};
  }
 },
 from:name=>{
  assert.equal(name,"announcements","Admin announcement view must use renamed table");
  const query={select:()=>query,order:()=>query,limit:()=>Promise.resolve({data:[],error:null})};
  return query;
 }
};
const tick=async()=>{await Promise.resolve();await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));};
openPanel({client},()=>true,ui);
await tick();
assert.equal(seen[0],"dashboard");
assert.ok(walk(document.body).some(el=>el.className==="vatra-admin-stat-number-001"&&el.textContent==="37"),"Dashboard must show live member count");
assert.ok(walk(document.body).some(el=>el.className==="ui-vatra-admin-overview-status-001"),"Dashboard must show last refresh and pending status");
assert.equal(walk(document.body).filter(el=>el.className==="ui-vatra-admin-shortcut-001").length,4,"Dashboard must show four compact quick actions");
assert.equal(walk(document.body).filter(el=>el.className==="ui-vatra-admin-queue-row-001").length,3,"Pending list must only include actual moderation queues");
const usersNav=walk(document.body).find(el=>el.dataset.adminTab==="users");
assert.ok(usersNav,"Members sidebar item missing");
usersNav.click();await tick();
assert.ok(readCalls.some(x=>x.action==="members_page"),"Server paging not called");
const rows=walk(document.body).filter(el=>el.className==="ui-vatra-admin-directory-row-001");
assert.equal(rows.length,1,"Members directory must show users without manually searching");
rows[0].click();await tick();
assert.ok(seen.includes("lookup"),"Click on member must fetch detail");
assert.ok(readCalls.some(x=>x.action==="member_detail"),"Member detail stats RPC is missing");
assert.ok(walk(document.body).some(el=>el.className==="vatra-admin-member-stat-number-001"&&el.textContent==="3"),"Member post count missing");
assert.ok(walk(document.body).some(el=>el.className==="ui-vatra-admin-member-tools-001"),"Member administration tools missing");
const reasonInput=walk(document.body).find(el=>el.className==="ui-vatra-admin-reason-001");
reasonInput.value="Підтверджена причина для тесту";
const blockButton=walk(document.body).find(el=>el.className==="vatra-admin-danger-001"&&el.textContent.includes("Заблокувати"));
assert.ok(blockButton,"Block account action missing");
blockButton.click();await tick();
const confirmation=walk(document.body).find(el=>el.className==="ui-vatra-admin-confirm-dialog-001");
assert.ok(confirmation?.open,"Typed confirmation dialog is missing");
const approve=walk(confirmation).find(el=>el.className==="vatra-admin-danger-001");
assert.equal(approve.disabled,true,"Blocking must require explicit VATRA ID");
const confirmationId=walk(confirmation).find(el=>el.className==="vatra-admin-confirm-id-input-001");
confirmationId.value="25";confirmationId.input();
assert.equal(approve.disabled,false,"Matching VATRA ID must unlock confirmation");
approve.click();await tick();
assert.ok(seen.includes("block"),"Blocking action should only run after confirmation");
const searchInput=walk(document.body).find(el=>el.className==="ui-vatra-admin-id-input-001");
searchInput.value="Тестовий";
walk(document.body).find(el=>el.className==="ui-vatra-admin-lookup-001").submit();await tick();
assert.ok(readCalls.some(x=>x.action==="members_page"&&x.payload.query==="Тестовий"),"Search must use server");
walk(document.body).find(el=>el.dataset.adminTab==="analytics").click();await tick();
assert.ok(readCalls.some(x=>x.action==="analytics"),"Analytics RPC missing");
assert.equal(walk(document.body).filter(el=>el.className==="ui-vatra-admin-chart-day-001").length,14,"14-day chart missing");
walk(document.body).find(el=>el.dataset.adminTab==="monitor").click();await tick();
assert.ok(readCalls.some(x=>x.action==="health"),"Health RPC missing");
assert.ok(walk(document.body).some(el=>el.className==="vatra-admin-monitor-headline-001"),"Health status missing");
walk(document.body).find(el=>el.dataset.adminTab==="requests").click();await tick();
walk(document.body).find(el=>el.dataset.adminMode==="resolved").click();await tick();
assert.ok(readCalls.some(x=>x.action==="requests_history"),"Moderation history missing");
walk(document.body).find(el=>el.dataset.adminTab==="history").click();await tick();
assert.ok(readCalls.some(x=>x.action==="audit_page"),"Audit pagination missing");
const announcementsNav=walk(document.body).find(el=>el.dataset.adminTab==="announcements");
announcementsNav.click();await tick();
assert.ok(walk(document.body).some(el=>el.className==="vatra-admin-empty-001"&&el.textContent.includes("Оголошень")),"Announcement empty state missing");
assert.ok(walk(document.body).some(el=>el.className==="vatra-admin-announcement-starts-001"),"Announcement start time missing");
assert.ok(walk(document.body).some(el=>el.className==="vatra-admin-announcement-ends-001"),"Announcement end time missing");
clearPanel();
assert.equal(document.body.children.length,0,"Close should remove admin dialog");
console.log("VATRA admin: dashboard, paging, search, account stats, analytics, monitoring, moderation history, audit and announcement scheduling verified.");
