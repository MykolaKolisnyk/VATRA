import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const base='http://127.0.0.1:4173';
const output='artifacts/browser-smoke';
await mkdir(output,{recursive:true});
const cases=[
 {id:'login',url:'/auth.html',selector:'#authForm',stylesheet:'vatra-auth.css'},
 {id:'register',url:'/register.html',selector:'#authForm',stylesheet:'vatra-auth.css'},
 {id:'home',url:'/index.html',selector:'#feed',stylesheet:'vatra.css'}
];
const viewports=[
 {id:'desktop',width:1440,height:900},
 {id:'mobile',width:390,height:844}
];
const browser=await chromium.launch({headless:true});
const results=[];
let failed=false;
try{
 for(const viewport of viewports){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
  try{
   for(const item of cases){
    const page=await context.newPage();
    const missing=[];
    const errors=[];
    page.on('response',response=>{
     if(response.url().startsWith(base)&&response.status()===404)missing.push(response.url());
    });
    page.on('pageerror',err=>errors.push(String(err?.message||err).slice(0,200)));
    let metric;
    try{
     const response=await page.goto(base+item.url,{waitUntil:'domcontentloaded',timeout:25000});
     assert.ok(response?.ok(),item.id+': HTML endpoint failed');
     await page.locator(item.selector).first().waitFor({state:'attached',timeout:10000});
     await page.waitForTimeout(1100);
     const finalUrl=new URL(page.url());
     const redirectedToLogin=item.id==='home'&&finalUrl.pathname.endsWith('/auth.html');
     const expectedCss=redirectedToLogin?'vatra-auth.css':item.stylesheet;
     metric=await page.evaluate((name)=>{
      const link=[...document.querySelectorAll('link[rel="stylesheet"]')].find(node=>node.href.includes(name));
      const brand=[...document.querySelectorAll('.vatra-wordmark')].some(node=>{
       const style=getComputedStyle(node),box=node.getBoundingClientRect();
       return style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0;
      });
      return {title:document.title,viewport:document.documentElement.clientWidth,
       scrollWidth:document.documentElement.scrollWidth,
       cssLoaded:!!link && !!link.sheet,
       brandVisible:brand,
       startupErrorVisible:!!document.querySelector('#startupError:not([hidden])')};
     },expectedCss);
     metric.finalUrl=finalUrl.pathname;
     metric.redirectedToLogin=redirectedToLogin;
     await page.screenshot({path:output+'/'+item.id+'-'+viewport.id+'.png',animations:'disabled'});
     assert.ok(metric.cssLoaded,item.id+': local stylesheet did not load');
     assert.ok(metric.brandVisible,item.id+': wordmark is not visible');
     assert.ok(metric.scrollWidth-metric.viewport<=8,item.id+': horizontal overflow of '+(metric.scrollWidth-metric.viewport)+'px');
     assert.deepEqual(missing,[],item.id+': broken local asset paths');
     if(item.id==='login'||item.id==='register'){
      // These are real click-through checks: a styled but non-functional
      // form must fail CI, even when the initial screenshot looks fine.
      await page.waitForFunction(()=>window.__vatraAuthReady===true,null,{timeout:18000});
      const initialMode=item.id==='register'?'register':'login';
      assert.equal(await page.locator('body').getAttribute('data-auth-mode'),initialMode,'Unexpected initial auth mode');
      await page.locator('#registerTab').click();
      assert.equal(await page.locator('body').getAttribute('data-auth-mode'),'register','Register tab does not switch form');
      assert.equal(await page.locator('#firstNameWrap').isVisible(),true,'Registration name field is hidden');
      const registerSize=await page.evaluate(()=>({
       client:document.documentElement.clientWidth,
       scroll:document.documentElement.scrollWidth
      }));
      assert.ok(registerSize.scroll-registerSize.client<=8,'Registration overflows on '+viewport.id);
      await page.screenshot({path:output+'/'+item.id+'-register-tab-'+viewport.id+'.png',animations:'disabled'});
      await page.locator('#loginTab').click();
      assert.equal(await page.locator('body').getAttribute('data-auth-mode'),'login','Login tab does not switch form');
      assert.equal(await page.locator('#firstNameWrap').isVisible(),false,'Registration-only fields remain on login');
      await page.locator('#showPassword').click();
      assert.equal(await page.locator('#password').getAttribute('type'),'text','Show password button is non-functional');
      await page.locator('#showPassword').click();
      assert.equal(await page.locator('#password').getAttribute('type'),'password','Hide password button is non-functional');
      await page.locator('#forgot').click();
      assert.equal(await page.locator('#recoveryDialog').evaluate(dialog=>dialog.open),true,'Recovery dialog did not open');
      await page.locator('#closeRecovery').click();
      await page.waitForFunction(()=>!document.querySelector('#recoveryDialog')?.open,null,{timeout:4000});
      metric.authClickThrough=true;
     }
     assert.deepEqual(missing,[],item.id+': broken local asset paths after interactions');
     console.log('PASS',item.id,viewport.id,JSON.stringify(metric));
    }catch(error){
     failed=true;
     console.error('FAIL',item.id,viewport.id,error?.stack||error);
    }
    results.push({case:item.id,viewport:viewport.id,...(metric||{}),missing,errors});
    await page.close();
   }
  }finally{await context.close();}
 }

 // The authenticated feed is not reachable without test credentials. Verify
 // its published visual contract with the real stylesheet and a safe fixture.
 const visual=await browser.newPage({viewport:{width:1280,height:850},deviceScaleFactor:1});
 try{
  await visual.goto(base+'/404.html',{waitUntil:'domcontentloaded'});
  await visual.setContent(`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/styles/vatra.css"></head><body data-page="feed"><div class="layout"><aside class="sidebar"><nav aria-label="Основна навігація"><a class="nav" href="#"><span class="nav-icon"><svg class="vatra-icon" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg></span><span>Друзі</span></a><a class="nav active" href="#"><span class="nav-icon"><svg class="vatra-icon" viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h10"/></svg></span><span>Новини</span></a></nav></aside><main class="main"><section class="feed"><article class="post"><div class="post-head"><div class="author"><b><button class="author-link">ВАТРА</button></b><small>Новини спільноти</small></div></div><p class="post-text">Текст допису має бути чітким, читабельним і достатнього розміру.</p><div class="post-actions"><button class="post-action-button">Вподобати</button></div></article></section></main></div></body></html>`,{waitUntil:'load'});
  const visualStyle=await visual.evaluate(async()=>{
   const loaded=await document.fonts.load('500 16px "VATRA Onest"');
   const post=document.querySelector('.post-text');
   const author=document.querySelector('.author-link');
   const side=document.querySelector('.sidebar .nav>span:not(.nav-icon)');
   const activeNav=document.querySelector('.sidebar .nav.active');
   const idleNav=document.querySelector('.sidebar .nav:not(.active)');
   return {fontFaces:loaded.length,postSize:getComputedStyle(post).fontSize,
    postFamily:getComputedStyle(post).fontFamily,authorSize:getComputedStyle(author).fontSize,
    sidebarSize:getComputedStyle(side).fontSize,
    navActiveBackground:getComputedStyle(activeNav).backgroundColor,
    navIdleBackground:getComputedStyle(idleNav).backgroundColor,
    navActiveWeight:getComputedStyle(activeNav.querySelector('span:not(.nav-icon)')).fontWeight,
    navIdleWeight:getComputedStyle(idleNav.querySelector('span:not(.nav-icon)')).fontWeight,
    cssLoaded:[...document.styleSheets].some(sheet=>sheet.href?.includes('vatra.css'))};
  });
  assert.ok(visualStyle.cssLoaded,'Actual site stylesheet must load on feed fixture');
  assert.ok(visualStyle.fontFaces>0,'Bundled Onest variable font must load');
  assert.ok(visualStyle.postFamily.includes('VATRA Onest'),'Posts must use the same Onest font as the 404 page');
  assert.equal(visualStyle.postSize,'16px','Readable body text must be 16px on desktop');
  assert.ok(parseFloat(visualStyle.authorSize)>=15,'Post author must be legible');
  assert.ok(parseFloat(visualStyle.sidebarSize)>=14,'Navigation labels must be legible');
  assert.equal(visualStyle.navActiveBackground,visualStyle.navIdleBackground,'The active route must remain visually neutral in light mode');
  assert.equal(visualStyle.navActiveWeight,visualStyle.navIdleWeight,'Active route must not have a heavier font');
  await visual.screenshot({path:output+'/vatra-visual-system-desktop.png',animations:'disabled'});
  await visual.evaluate(()=>{document.body.dataset.vatraThemeEffective='dark';});
  const darkNav=await visual.evaluate(()=>({
   active:getComputedStyle(document.querySelector('.sidebar .nav.active')).backgroundColor,
   idle:getComputedStyle(document.querySelector('.sidebar .nav:not(.active)')).backgroundColor
  }));
  assert.equal(darkNav.active,darkNav.idle,'The active route must remain visually neutral in dark mode');
  await visual.screenshot({path:output+'/vatra-visual-system-dark-desktop.png',animations:'disabled'});
  visualStyle.darkNav=darkNav;
  results.push({case:'vatra-visual-system',viewport:'desktop',...visualStyle});
  console.log('PASS VATRA visual system',JSON.stringify(visualStyle));
 }catch(error){
  failed=true;console.error('FAIL VATRA visual system',error?.stack||error);
 }finally{await visual.close();}
 // Verify the authenticated profile layout and gallery visually without credentials.
 const gallery=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 try{
  await gallery.goto(base+'/404.html',{waitUntil:'domcontentloaded'});
  const tiles=Array.from({length:4},(_,i)=>'<div class="profile-photo-tile"><span class="profile-gallery-open">Фото '+(i+1)+'</span></div>').join('');
  await gallery.setContent('<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/styles/vatra.css"></head><body data-page="profile"><div class="layout"><aside class="sidebar"></aside><main class="main"><div class="vatra-profile-layout"><div class="vatra-profile-sidebar"></div><section class="vatra-profile-main"><div class="vatra-profile-photos"><div class="vatra-profile-photo-carousel vatra-profile-media-carousel"><div class="vatra-gallery-stage"><div class="vatra-gallery-viewport"><div class="profile-photo-gallery vatra-gallery-track">'+tiles+'</div></div></div></div></div></section></div></main></div></body></html>',{waitUntil:'load'});
  for(const viewport of [{width:1440,height:900,columns:4},{width:840,height:840,columns:3},{width:390,height:844,columns:2}]){
   await gallery.setViewportSize({width:viewport.width,height:viewport.height});
   const measured=await gallery.evaluate(()=>{
    const track=document.querySelector('.vatra-gallery-track'),layout=document.querySelector('.layout');
    return {columns:getComputedStyle(track).gridTemplateColumns.trim().split(/\\s+/).length,
      layoutWidth:Math.round(layout.getBoundingClientRect().width),
      tileWidth:Math.round(track.querySelector('.profile-photo-tile').getBoundingClientRect().width),
      viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth};
   });
   assert.equal(measured.columns,viewport.columns,'Gallery columns mismatch at '+viewport.width+'px');
   assert.ok(measured.tileWidth>=80,'Gallery thumbnail too small at '+viewport.width+'px: '+measured.tileWidth);
   assert.ok(measured.scrollWidth-measured.viewport<=8,'Profile gallery overflows at '+viewport.width+'px');
   if(viewport.width===1440)assert.ok(measured.layoutWidth<=1040,'Wide profile must remain compact, got '+measured.layoutWidth);
   results.push({case:'profile-gallery-responsive',...measured});
   await gallery.screenshot({path:output+'/profile-gallery-'+viewport.width+'.png',animations:'disabled'});
   console.log('PASS profile gallery',JSON.stringify(measured));
  }
 }catch(error){failed=true;console.error('FAIL profile gallery responsiveness',error?.stack||error);}
 finally{await gallery.close();}
}finally{await browser.close();}
await writeFile(output+'/metrics.json',JSON.stringify(results,null,2)+'\n');
if(failed)process.exitCode=1;
