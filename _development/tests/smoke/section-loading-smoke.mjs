import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const guard=await readFile("assets/js/account-guard.js","utf8");
function harness(allowed,blocked=false){
 const menu=[],styles=[],imports=[],calls=[],open=[],events=[],placements=[];
 function element(tag){return {tag,children:[],dataset:{},disabled:false,open:false,
  append(...children){this.children.push(...children);},
  setAttribute(){},addEventListener(type,fn){this[type]=fn;},
  closest(){return {open:true};},showModal(){this.open=true;},close(){this.open=false;},
  remove(){const i=menu.indexOf(this);if(i>=0)menu.splice(i,1);}
 };}
 const support={closest(){return {open:true};},after(entry){placements.push("after-support");menu.push(entry);}};
 const logout={before(entry){placements.push("before-logout");menu.push(entry);}};
 const document={currentScript:{src:"https://example.com/VATRA/assets/js/account-guard.js"},documentElement:{lang:"uk"},
  querySelector(sel){return sel===".feed-menu-support"?support:null;},
  getElementById(name){return name==="feed-logout"?logout:menu.find(x=>x.id===name);},
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
 const source=guard.replace(/import\(new URL\("(assets\/js\/admin\.js\?rev=[a-f0-9]{40})",root\)\.href\)/,'loadModule(new URL("$1",root).href)');
 new Function("window","document","location","loadModule","alert","URL",source)(window,document,{replace(){}},loadModule,(x)=>alerts.push(x),URL);
 return {menu,styles,imports,calls,open,events,alerts,placements,window,client};
}
for(const [id,allowed,blocked] of [["2",true,false],["1",false,false],["1",true,true]]){
 const h=harness(allowed,blocked);await h.window.VATRA_ADMIN_SESSION(h.client,id);
 assert.equal(h.menu.some(x=>x.id==="vatra-admin-menu"),false);
 assert.equal(h.styles.length,0);assert.equal(h.imports.length,0);
 if(id!=="1"||blocked)assert.ok(!h.calls.includes("vatra_admin_access"));
}
const owner=harness(true);
await owner.window.VATRA_ADMIN_SESSION(owner.client,"1");
assert.equal(owner.menu.length,0);assert.deepEqual(owner.calls,["account_states"]);
assert.equal(owner.imports.length,0);assert.equal(owner.styles.length,0);
owner.events[0]("SIGNED_OUT");assert.equal(owner.menu.length,0);
for(const name of ["clips","marketplace","settings"]){
 const src=await readFile("assets/js/"+name+".js","utf8");
 let registered=0;new Function("window","document",src)({VATRA_SECTION_CORE:{start(init){assert.equal(typeof init,"function");registered++;}}},{body:{dataset:{page:name}}});
 assert.equal(registered,1,name+" registers only its own initializer");
 new Function("window",src)({VATRA_HOST_ALLOWED:false,VATRA_SECTION_CORE:{start(){throw Error("Forbidden host");}}});
}
for(const name of ["communities","club"]){
 const src=await readFile("assets/js/"+name+".js","utf8");
 let registered=0;
 new Function("window",src)({VATRA_COMMUNITY_CORE:{start(init){assert.equal(typeof init,"function");registered++;}}});
 assert.equal(registered,1,name+" registers only its own initializer");
 new Function("window",src)({VATRA_HOST_ALLOWED:false,VATRA_COMMUNITY_CORE:{start(){throw Error("Forbidden host");}}});
}
console.log("VATRA lazy architecture: retired owner panel, account-state checks, sign-out cleanup and isolated page registration verified.");

// Execute the real lazy factories, not just a simulated dynamic import.
function element(tag,cls="",copy=""){
 const listeners=new Map();
 const el={tag,className:cls,textContent:copy,children:[],dataset:{},hidden:false,open:false,disabled:false,value:"",isConnected:true,parentElement:null,
  append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);n.parentElement=this;this.children.push(n);}},
  prepend(...nodes){this.append(...nodes);this.children.unshift(...this.children.splice(-nodes.length));},
  replaceChildren(...nodes){this.children=[];this.value="";this.append(...nodes);},
  setAttribute(){},addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
  async fire(type){for(const fn of listeners.get(type)||[])await fn({preventDefault(){},target:this});},
  showModal(){this.open=true;},close(){this.open=false;void this.fire("close");},remove(){this.isConnected=false;},
  reset(){},focus(){},scrollIntoView(){},checkValidity(){return true;},reportValidity(){return true;},
  querySelector(selector){return all(this).find(n=>n.tag===selector)||null;}
 };return el;
}
const all=node=>[node,...node.children.flatMap(all)];
const byClass=(node,cls)=>all(node).find(n=>n.className===cls);
const text=(uk,en)=>uk;
const make=(tag,cls,copy)=>element(tag,cls,copy);
const button=(cls,copy,fn)=>{const b=make("button",cls,copy);b.addEventListener("click",fn);return b;};
const btn=(label,cls,fn)=>button(cls,label,fn);
const field=(parent,key,label,type,max,required)=>{const outer=make("div","field-"+key),input=make("input","input-"+key);outer.append(make("label","label-"+key,label),input);parent.append(outer);return input;};
const doc={body:element("body"),documentElement:{lang:"uk"},createElement:element,createElementNS:(_,tag)=>element(tag)};
const market=await readFile("assets/js/marketplace.js","utf8");
const editor=await readFile("assets/js/marketplace-editor.js","utf8");
const signature=editor.match(/createMarketplaceEditor\(\{([^}]+)\}\)/)[1].split(",");
const supplied=market.match(/module\.createMarketplaceEditor\(\{([^}]+)\}\)/)[1].split(",");
assert.deepEqual(signature,supplied,"All editor dependencies must be passed by the actual caller");
const begin=market.indexOf("const categories="),end=market.indexOf("function marketCurrencySelect");
assert.ok(begin>=0&&end>begin);
const catalog=new Function("t",market.slice(begin,end)+"return {categories,marketTypes,marketTypeCategories,marketFields,marketFieldKeys,marketAmount,marketDetailsText,marketSubLabel};")(text);
const realEditor=new Function(editor.replace(/^export /gm,"")+"\nreturn createMarketplaceEditor;")();
const deps={...catalog,t:text,make,field,btn,marketLimit:10,marketConditions:[["new","Новий","New"]],
 marketScreen(){const d=element("dialog"),area=element("main");d.append(area);return {d,area};},
 marketCurrencySelect(parent,key){return field(parent,key,"currency");},
 marketMoneyField(parent,key,label){const input=field(parent,key,label);return {input,outer:input.parentElement,setCurrency(){},validate(){}};},
 priceText:row=>String(row.price),message(){},sectionIcon:()=>element("svg"),submit(form,label,fn){return btn(label,"publish",fn);},
 ownId:"1",client:{},nameOf:async()=>"Member",link:(label,url,cls)=>make("a",cls,label),onPublished:async()=>{}};
for(const key of signature)assert.ok(key in deps,"No mock for editor dependency "+key);
const listing=realEditor(deps);listing.showModal();assert.equal(listing.open,true);
const picker=byClass(listing,"ui-vatra-market-type-picker-001"),guidance=byClass(picker,"ui-vatra-market-create-guidance-001");
assert.ok(guidance&&byClass(guidance,"vatra-market-moderation-notice-001"),"Publication guidance belongs to the create-listing picker");
assert.ok(byClass(guidance,"vatra-market-rules-link-003"),"Standalone commerce rules must be available when creating a listing");
assert.ok(byClass(listing,"ui-vatra-market-accept-checkbox-001").required,"Rules acceptance remains mandatory");
assert.ok(!market.includes('toolbarNav.append(mode,action,moderationNotice)')&&!market.includes('vatra-market-rules-link-001'),"Routine guidance and rules link must not occupy the catalogue sidebar");
const commerce=await readFile("commerce.html","utf8");
assert.ok(!commerce.includes("policy-tabs-shell")&&commerce.includes('href="documents" class="vatra-document-back-001"'),"Commerce rules must return directly to documents without the old navigation");
const documents=await readFile("documents.html","utf8");
for(const page of ["terms","privacy","cookies","commerce"])assert.ok(documents.includes('href="'+page+'" aria-labelledby="vatra-documents-title-'+page+'-001"'),"Documents index must link "+page);
for(const [id] of catalog.marketTypes){
 const pick=byClass(listing,"vatra-market-type-"+id);assert.ok(pick,"Missing listing type "+id);await pick.fire("click");
 assert.equal(byClass(listing,"ui-vatra-market-editor-sidebar-001").hidden,false);
 const price=byClass(listing,"input-market-price");
 assert.equal(Boolean(price.readOnly),id==="free","Free listing price must be locked only for free listings");
}
console.log("VATRA lazy forms: marketplace controls and listing validation passed.");
