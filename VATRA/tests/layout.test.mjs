// Real CSS viewport via Chrome DevTools Protocol pipe. Node.js 22+ and Chromium.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn,spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve,join } from 'node:path';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

const url='file://'+resolve(fileURLToPath(new URL('./layout-smoke.html',import.meta.url)));
const browser=(()=>{
 for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
  const check=spawnSync('which',[name],{encoding:'utf8'});
  if(check.status===0&&check.stdout.trim())return check.stdout.trim();
 }
 throw new Error('Chrome/Chromium is required.');
})();
const dir=mkdtempSync(join(tmpdir(),'vatra-cdp-'));
const chrome=spawn(browser,[
 '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--allow-file-access-from-files','--no-first-run','--no-default-browser-check',
 '--remote-debugging-pipe','--user-data-dir='+dir,'about:blank'
],{stdio:['ignore','ignore','pipe','pipe','pipe']});
after(()=>{try{chrome.kill('SIGKILL');}catch{}try{rmSync(dir,{recursive:true,force:true});}catch{}});
const pending=new Map();let seq=0,buffer='';
chrome.stdio[4].on('data',chunk=>{
 buffer+=chunk.toString();
 let end;
 while((end=buffer.indexOf('\0'))>=0){
  const raw=buffer.slice(0,end);buffer=buffer.slice(end+1);
  if(!raw)continue;
  let event;try{event=JSON.parse(raw);}catch{continue;}
  const waiter=pending.get(event.id);
  if(!waiter)continue;
  pending.delete(event.id);
  event.error?waiter.reject(new Error(event.error.message)):waiter.resolve(event.result);
 }
});
function command(method,params={},sessionId){
 return new Promise((resolve,reject)=>{
  const id=++seq;pending.set(id,{resolve,reject});
  chrome.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');
 });
}
const ready=(async()=>{
 const {targetId}=await command('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await command('Target.attachToTarget',{targetId,flatten:true});
 await command('Page.enable',{},sessionId);
 await command('Runtime.enable',{},sessionId);
 return sessionId;
})();
async function inspect(width){
 const sessionId=await Promise.race([ready,sleep(15000).then(()=>{throw new Error('Chrome CDP startup timed out');})]);
 await command('Emulation.setDeviceMetricsOverride',{width,height:920,deviceScaleFactor:1,mobile:width<=760},sessionId);
 await command('Page.navigate',{url},sessionId);
 for(let i=0;i<70;i++){
  const evalResult=await command('Runtime.evaluate',{expression:'document.documentElement.getAttribute("data-smoke")',returnByValue:true},sessionId);
  if(evalResult?.result?.value){
   const metrics=JSON.parse(evalResult.result.value);
   if(metrics.width===width)return metrics;
  }
  await sleep(75);
 }
 throw new Error('Could not obtain layout metrics for '+width+'px viewport.');
}
for(const width of [390,768,1024,1366]){
 test('Responsive VATRA '+width+'px: no overflow or overlapping navigation',async()=>{
  const m=await inspect(width);
  assert.equal(m.width,width,'Emulated width mismatch.');
  assert.ok(m.scrollWidth<=m.width+2,'Horizontal overflow: '+JSON.stringify(m));
  assert.ok(m.headerRight>=m.width-2,'Header width: '+JSON.stringify(m));
  assert.ok(m.avatarW>50&&m.avatarH>50,'Avatar collapsed: '+JSON.stringify(m));
  assert.ok(m.avatarH/m.avatarW>.76&&m.avatarH/m.avatarW<1.26,'Avatar deformed: '+JSON.stringify(m));
  assert.ok(m.textSize>=12,'Post text unreadable: '+JSON.stringify(m));
  if(m.width<=760){
   assert.equal(m.sidebarVisible,false,'Desktop rail visible on mobile.');
   assert.equal(m.bottomNavVisible,true,'Mobile bottom nav missing.');
  }else{
   assert.equal(m.sidebarVisible,true,'Sidebar missing on laptop/tablet.');
   assert.ok(m.sidebarRight<m.mainLeft,'Sidebar overlaps content: '+JSON.stringify(m));
   assert.ok(m.navRight<=m.sidebarRight+2,'Nav clipping: '+JSON.stringify(m));
  }
 });
}
