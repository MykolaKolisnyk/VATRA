import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";
const [auth,toast,profile,coverEditor,html]=await Promise.all([
 "assets/js/auth-core.js","assets/js/toast.js","assets/js/profile.js",
 "assets/js/profile-cover-editor.js","profile.html"
].map(path=>readFile(path,"utf8")));
assert.match(auth,/Оберіть день народження\./);
assert.match(auth,/Оберіть місяць народження\./);
assert.match(auth,/Вкажіть прізвище\./);
assert.match(auth,/feedback\(first\.message,"error",\{group:"auth-validation"\}\)/);
assert.doesNotMatch(auth,/feedback\(message,"error"\)/);
assert.doesNotMatch(auth,/Заповніть це поле\./);
assert.doesNotMatch(toast,/addEventListener\("pointerenter"/);
assert.match(toast,/queueMicrotask\(moveStack\)/);
for(const phrase of ["Фото профілю змінено.","vatra-profile-photo-toast"]){
 assert.ok(profile.includes(phrase),phrase);
}
assert.ok(coverEditor.includes('status(t("Обкладинку профілю змінено.","Profile cover updated."))'),
 "Cover update confirmation remains in the new, on-demand crop editor");
for(const id of ["profile-media-status","profile-avatar-finish-error","profile-cover-edit-error"]){
 assert.ok(!html.includes('id="'+id+'"'),id);
 assert.ok(!profile.includes('"#'+id+'"'),id);
}
let clock=0,id=0;
const timers=new Map();
const setTimer=(fn,delay)=>{const key=++id;timers.set(key,{fn,due:clock+delay});return key;};
const clearTimer=key=>timers.delete(key);
function advance(amount){
 const finish=clock+amount;
 while(true){
  let key=null,earliest=Infinity;
  for(const [k,t] of timers)if(t.due<=finish&&t.due<earliest){earliest=t.due;key=k;}
  if(key===null)break;
  const event=timers.get(key);timers.delete(key);clock=event.due;event.fn();
 }
 clock=finish;
}
let document;
class ElementMock{
 constructor(tag="div"){
  this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;
  this.className="";this.textContent="";this.style={};this.listeners={};this.open=false;
  this.classList={add(){},remove(){}};
 }
 get isConnected(){
  for(let node=this;node;node=node.parentNode)if(node===document.body)return true;
  return false;
 }
 append(...children){for(const child of children){child.remove();this.children.push(child);child.parentNode=this;}}
 prepend(...children){for(const child of children){child.remove();this.children.unshift(child);child.parentNode=this;}}
 remove(){
  if(!this.parentNode)return;
  const items=this.parentNode.children,idx=items.indexOf(this);
  if(idx>=0)items.splice(idx,1);
  this.parentNode=null;
 }
 setAttribute(name,value){(this.attributes??={})[name]=value;}
 getAttribute(name){return this.attributes?.[name]??null;}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 emit(name,event={}){for(const fn of this.listeners[name]||[])fn({...event,target:event.target||this,type:name});}
 matches(){return false;}
 querySelectorAll(){return [];}
 querySelector(selector){
  const cls=selector.startsWith(".")?selector.slice(1):null;
  return this.children.find(child=>cls&&child.className.split(/\s+/).includes(cls))||null;
 }
 click(){this.emit("click");}
}
const handlers={};
const dialogs=[];
document={
 currentScript:{src:"https://vatra.example/assets/js/toast.js"},
 body:new ElementMock("body"),
 documentElement:{lang:"uk",classList:{add(){}}},
 readyState:"complete",
 createElement:tag=>new ElementMock(tag),
 querySelectorAll:selector=>selector==="dialog[open]"?dialogs.filter(d=>d.open):[],
 addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn),
 emit:(name,event)=>{for(const fn of handlers[name]||[])fn(event);}
};
const window={};
vm.runInNewContext(toast,{
 window,document,URL,location:{origin:"https://vatra.example",href:"https://vatra.example/feed"},
 Element:ElementMock,HTMLDialogElement:ElementMock,
 MutationObserver:class{observe(){}},
 requestAnimationFrame:fn=>fn(),
 setTimeout:setTimer,clearTimeout:clearTimer,queueMicrotask
},{filename:"toast.js"});
const first=window.VATRA_TOAST.show("Оберіть день народження.","error",{group:"auth-validation"});
assert.equal(first.isConnected,true);
first.emit("pointerenter");
first.emit("focusin");
advance(5400);
assert.equal(first.isConnected,false,"error toast must dismiss even while pointer/focus remains");
const older=window.VATRA_TOAST.show("Вкажіть прізвище.","error",{group:"auth-validation"});
const newer=window.VATRA_TOAST.show("Оберіть місяць народження.","error",{group:"auth-validation"});
assert.equal(older.isConnected,false,"form validation should replace previous error");
assert.equal(newer.isConnected,true);
const dialog=new ElementMock("dialog");dialog.open=true;document.body.append(dialog);dialogs.push(dialog);
const saved=window.VATRA_TOAST.show("Фото профілю змінено.","success");
assert.equal(saved.parentNode.parentNode,dialog,"modal toast must render above its dialog");
dialog.open=false;
document.emit("close",{target:dialog});
await Promise.resolve();
assert.equal(saved.parentNode.parentNode,document.body,"toast must survive modal closure");
advance(4500);
assert.equal(saved.isConnected,false,"successful photo toast must auto-dismiss");
console.log("VATRA toast UX: one explicit form field, auto-dismiss, dialog survival and photo feedback verified.");
