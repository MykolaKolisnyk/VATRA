// Real viewport emulation via Chrome DevTools Protocol (avoids Chrome's 500px window minimum).
// Run: node --test VATRA/tests/layout.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn,spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const fixture=fileURLToPath(new URL('./layout-smoke.html',import.meta.url));
const toFileUrl='file://'+resolve(fixture);
const browser=(()=>{
 for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
  const result=spawnSync('which',[name],{encoding:'utf8'});
  if(result.status===0&&result.stdout.trim())return result.stdout.trim();
 }
 throw new Error('Headless Chrome/Chromium is required for VATRA responsive layout tests.');
})();
const profile=mkdtempSync(join(tmpdir(),'vatra-layout-'));
const port=9227;
const chrome=spawn(browser,[
 '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--allow-file-access-from-files','--no-first-run','--no-default-browser-check',
 '--remote-allow-origins=*','--remote-debugging-port='+port,
 '--user-data-dir='+profile,'about:blank'
],{stdio:'ignore'});
after(()=>{
 try{ws?.close();}catch{}
 try{chrome.kill('SIGKILL');}catch{}
 try{rmSync(profile,{recursive:true,force:true});}catch{}
});
let ws=null,seq=0;
const pending=new Map();
async function connect(){
 let socketUrl='';
 for(let attempt=0;attempt<80;attempt++){
  if(chrome.exitCode!==null)throw new Error('Chrome exited before debugger connected, code '+chrome.exitCode);
  try{
   const response=await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(700)});
   const pages=await response.json();
   socketUrl=pages.find(p=>p.type==='page')?.webSocketDebuggerUrl||'';
   if(socketUrl)break;
  }catch{}
  await delay(120);
 }
 assert.ok(socketUrl,'Could not connect to Chrome DevTools Protocol.');
 ws=new WebSocket(socketUrl);
 await new Promise((resolve,reject)=>{
  ws.onopen=resolve;ws.onerror=()=>reject(new Error('DevTools WebSocket failed'));
 });
 ws.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(!message.id)return;
  const waiter=pending.get(message.id);if(!waiter)return;
  pending.delete(message.id);
  message.error?waiter.reject(new Error(message.error.message)):waiter.resolve(message.result);
 });
 await command('Page.enable');
 await command('Runtime.enable');
}
function command(method,params={}){
 return new Promise((resolve,reject)=>{
  const id=++seq;pending.set(id,{resolve,reject});
  ws.send(JSON.stringify({id,method,params}));
 });
}
const ready=connect();
async function inspect(width){
 await ready;
 await command('Emulation.setDeviceMetricsOverride',{width,height:920,deviceScaleFactor:1,mobile:width<=760});
 await command('Page.navigate',{url:toFileUrl});
 for(let attempt=0;attempt<70;attempt++){
  const result=await command('Runtime.evaluate',{
   expression:'document.documentElement.getAttribute("data-smoke")',
   returnByValue:true
  });
  if(result?.result?.value){
   const metrics=JSON.parse(result.result.value);
   if(metrics.width===width)return metrics;
  }
  await delay(90);
 }
 throw new Error('Viewport '+width+' did not load the expected metrics.');
}
for(const width of [390,768,1024,1366]){
 test('Responsive layout '+width+'px: true viewport, no overlap or overflow',async()=>{
  const m=await inspect(width);
  assert.equal(m.width,width,'Chrome viewport mismatch: '+JSON.stringify(m));
  assert.ok(m.scrollWidth<=m.width+2,'Horizontal overflow: '+JSON.stringify(m));
  assert.ok(m.headerRight>=m.width-2,'Header not full-width: '+JSON.stringify(m));
  assert.ok(m.avatarW>50&&m.avatarH>50,'Avatar collapsed: '+JSON.stringify(m));
  assert.ok(m.avatarH/m.avatarW>.76&&m.avatarH/m.avatarW<1.26,'Avatar deformed: '+JSON.stringify(m));
  assert.ok(m.textSize>=12,'Post text unreadable: '+JSON.stringify(m));
  if(m.width<=760){
   assert.equal(m.sidebarVisible,false,'Sidebar should be hidden on mobile.');
   assert.equal(m.bottomNavVisible,true,'Bottom navigation missing on mobile.');
  }else{
   assert.equal(m.sidebarVisible,true,'Sidebar missing on tablet/desktop.');
   assert.ok(m.sidebarRight<m.mainLeft,'Sidebar overlaps content: '+JSON.stringify(m));
   assert.ok(m.navRight<=m.sidebarRight+2,'Navigation button clipped: '+JSON.stringify(m));
  }
 });
}
