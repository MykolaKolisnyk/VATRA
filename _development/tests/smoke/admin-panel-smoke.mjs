import assert from "node:assert/strict";
import {openPanel,clearPanel} from "../../../assets/js/admin.js";
import {readFile} from "node:fs/promises";
const rootFiles=await Promise.all(["assets/js/announcements.js","assets/js/admin.js","assets/css/admin.css"].map(file=>readFile(file,"utf8")));
assert.ok(rootFiles[0].includes('from("announcements")'));
assert.ok(rootFiles[0].includes('from("announcement_views")'));
assert.ok(!rootFiles[1].includes('from("vatra_announcements")'));
assert.ok(rootFiles[2].includes(".ui-vatra-admin-directory-row-001"));
const events=[];
class ElementMock{
 constructor(tag="div"){
  this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.className="";this._text="";
  this.dataset={};this.attributes={};this.listeners={};this.hidden=false;this.disabled=false;this.value="";this.open=false;
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
const seen=[],account={vatra_id:25,name:"Тестовий учасник",created_at:"2026-11-21T12:00:00Z",verified:false,state:"active",blocked_until:null};
const client={
 rpc:async(name,parameters)=>{
  assert.equal(name,"vatra_admin_manage");
  seen.push(parameters.p_action);
  switch(parameters.p_action){
   case "dashboard":return {data:{accounts:37,verified:1,posts:14,communities:0,verification_pending:2,reports_pending:1,market_pending:3,blocked:0},error:null};
   case "members":return {data:{total:37,items:[account]},error:null};
   case "lookup":return {data:account,error:null};
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
const usersNav=walk(document.body).find(el=>el.dataset.adminTab==="users");
assert.ok(usersNav,"Members sidebar item missing");
usersNav.click();await tick();
assert.ok(seen.includes("members"),"Members directory RPC not called");
const rows=walk(document.body).filter(el=>el.className==="ui-vatra-admin-directory-row-001");
assert.equal(rows.length,1,"Members directory must show users without manually searching");
rows[0].click();await tick();
assert.ok(seen.includes("lookup"),"Click on member must fetch detail");
assert.ok(walk(document.body).some(el=>el.className==="ui-vatra-admin-member-tools-001"),"Member administration tools missing");
const announcementsNav=walk(document.body).find(el=>el.dataset.adminTab==="announcements");
announcementsNav.click();await tick();
assert.ok(walk(document.body).some(el=>el.className==="vatra-admin-empty-001"&&el.textContent.includes("Оголошень")),"Announcement empty state missing");
clearPanel();
assert.equal(document.body.children.length,0,"Close should remove admin dialog");
console.log("VATRA professional admin: live KPIs, grouped navigation, member list, member detail and announcement names verified.");
