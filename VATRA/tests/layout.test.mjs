// Run on a machine with Google Chrome/Chromium: node --test VATRA/tests/layout.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'layout-smoke.html');
function detectBrowser(){
 const names=['google-chrome','google-chrome-stable','chromium','chromium-browser'];
 for(const name of names){
  const check=spawnSync('which',[name],{encoding:'utf8'});
  if(check.status===0&&check.stdout.trim())return check.stdout.trim();
 }
 throw new Error('Headless Chrome or Chromium is required for the layout smoke tests.');
}
const browser=detectBrowser();
function inspect(width){
 const result=spawnSync(browser,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--allow-file-access-from-files','--hide-scrollbars','--force-device-scale-factor=1',
  '--window-size='+width+',920','--virtual-time-budget=1200','--dump-dom',
  'file://'+root
 ],{encoding:'utf8',timeout:25000,maxBuffer:6*1024*1024});
 assert.equal(result.status,0,'Chromium failed: '+(result.stderr||'').slice(-800));
 const match=result.stdout.match(/data-smoke="([^"]+)"/);
 assert.ok(match,'Layout fixture failed to report dimensions.');
 const metrics=JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
 return metrics;
}
for(const width of [390,768,1024,1366]){
 test('Responsive layout '+width+' px does not overlap or overflow',()=>{
  const m=inspect(width);
  assert.ok(Math.abs(m.width-width)<=2,'Unexpected browser viewport width (requested '+width+'): '+JSON.stringify(m));
  assert.ok(m.scrollWidth<=m.width+2,'Horizontal overflow: '+JSON.stringify(m));
  assert.ok(m.headerRight>=m.width-2,'Header not full-width: '+JSON.stringify(m));
  assert.ok(m.avatarW>50&&m.avatarH>50,'Avatar collapsed: '+JSON.stringify(m));
  assert.ok(m.avatarH/m.avatarW>.76&&m.avatarH/m.avatarW<1.26,'Avatar deformed: '+JSON.stringify(m));
  assert.ok(m.textSize>=12,'Post text unreadable: '+JSON.stringify(m));
  if(m.width<=760){
   assert.equal(m.sidebarVisible,false,'Sidebar should be hidden on phone.');
   assert.equal(m.bottomNavVisible,true,'Bottom navigation missing on phone.');
  }else{
   assert.equal(m.sidebarVisible,true,'Sidebar missing on desktop/tablet.');
   assert.ok(m.sidebarRight<m.mainLeft,'Sidebar overlaps content: '+JSON.stringify(m));
   assert.ok(m.navRight<=m.sidebarRight+2,'Navigation button clipped: '+JSON.stringify(m));
  }
 });
}
