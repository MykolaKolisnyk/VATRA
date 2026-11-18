import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const guard=await readFile("assets/js/account-guard.js","utf8");
function harness(allowed,blocked=false){
 const menu=[],styles=[],imports=[],calls=[],open=[],events=[];
 function element(tag){return {tag,children:[],dataset:{},disabled:false,open:false,
  append(...children){this.children.push(...children);},
  setAttribute(){},addEventListener(type,fn){this[type]=fn;},
  closest(){return {open:true};},showModal(){this.open=true;},close(){this.open=false;},
  remove(){const i=menu.indexOf(this);if(i>=0)menu.splice(i,1);}
 };}
 const support={closest(){return {open:true};},before(entry){menu.push(entry);}};
 const document={currentScript:{src:"https://example.com/VATRA/assets/js/account-guard.js"},documentElement:{lang:"uk"},
  querySelector(sel){return sel===".feed-menu-support"?support:null;},
  getElementById(name){return menu.find(x=>x.id===name);},
  createElement:element,createElementNS(ns,tag){return element(tag);},
  head:{append(style){styles.push(style);style.onload();}},
  body:{append(node){menu.push(node);}}
 };
 const client={auth:{onAuthStateChange(fn){events.push(fn);return {data:{subscription:{unsubscribe(){}}}};}},
  from(table){assert.equal(table,"account_states");calls.push(table);return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:{state:blocked?"blocked":"active",blocked_until:null}};}};},
  async rpc(name){calls.push(name);assert.equal(name,"vatra_admin_access");return {data:allowed,error:null};}
 };
 const window={};
 const loadModule=async url=>{imports.push(url);return {openPanel(current,isCurrent){if(isCurrent())open.push(current.id);},clearPanel(){open.length=0;}};};
 const alerts=[];
 const source=guard.replace('import(new URL("assets/js/admin.js",root).href)','loadModule(new URL("assets/js/admin.js",root).href)');
 new Function("window","document","location","loadModule","alert","URL",source)(window,document,{replace(){}},loadModule,(x)=>alerts.push(x),URL);
 return {menu,styles,imports,calls,open,events,alerts,window,client};
}
for(const [id,allowed,blocked] of [["2",true,false],["1",false,false],["1",true,true]]){
 const h=harness(allowed,blocked);await h.window.VATRA_ADMIN_SESSION(h.client,id);
 assert.equal(h.menu.some(x=>x.id==="vatra-admin-menu"),false);
 assert.equal(h.styles.length,0);assert.equal(h.imports.length,0);
 if(id!=="1"||blocked)assert.ok(!h.calls.includes("vatra_admin_access"));
}
const owner=harness(true);
await owner.window.VATRA_ADMIN_SESSION(owner.client,"1");
assert.equal(owner.menu.length,1);assert.ok(owner.calls.includes("vatra_admin_access"));
assert.equal(owner.imports.length,0);assert.equal(owner.styles.length,0);
await owner.menu[0].click();
assert.equal(owner.imports.length,1);assert.ok(owner.imports[0].endsWith("/assets/js/admin.js"));
assert.equal(owner.styles.length,1);assert.deepEqual(owner.open,["1"]);assert.equal(owner.alerts.length,0);
await owner.menu[0].click();assert.equal(owner.imports.length,1);assert.equal(owner.styles.length,1);
owner.events[0]("SIGNED_OUT");assert.equal(owner.menu.length,0);assert.equal(owner.open.length,0);
for(const name of ["clips","marketplace","settings"]){
 const src=await readFile("assets/js/"+name+".js","utf8");
 let registered=0;new Function("window",src)({VATRA_SECTION_CORE:{start(init){assert.equal(typeof init,"function");registered++;}}});
 assert.equal(registered,1,name+" registers only its own initializer");
 new Function("window",src)({VATRA_HOST_ALLOWED:false,VATRA_SECTION_CORE:{start(){throw Error("Forbidden host");}}});
}
console.log("VATRA lazy architecture: owner role gate, click-only modules, sign-out cleanup and isolated page registration verified.");
