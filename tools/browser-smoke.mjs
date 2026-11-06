import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';

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
      const headline=page.locator(viewport.id==='mobile'?'.vatra-auth-intro-mobile h1':'.brand-copy h1');
      assert.equal(await headline.isVisible(),true,'VATRA circle headline must be visible on '+viewport.id);
      assert.ok((await headline.textContent()).includes('тут починається твоє коло'),'VATRA social promise is missing');
      if(viewport.id==='desktop'){
       // The 404-inspired auth hero is light; verify actual text/background contrast,
       // rather than expecting the previous white text on a blue background.
       const ratios=await page.evaluate(()=>{
        const readRGB=css=>Array.from(css.matchAll(/[\d.]+/g)).slice(0,3).map(m=>Number(m[0]));
        const lum=rgb=>rgb.slice(0,3).map(x=>{
         const value=x/255;return value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4;
        }).reduce((acc,x,i)=>acc+x*[0.2126,0.7152,0.0722][i],0);
        const contrast=(a,b)=>{
         const [x,y]=[lum(a),lum(b)].sort((u,v)=>v-u);return (x+0.05)/(y+0.05);
        };
        const description=document.querySelector('.brand-copy>p:not(.eyebrow):not(.vatra-auth-promise-subline)');
        const language=document.querySelector('.brand-side .vatra-auth-language-option:not(.is-active)');
        const bodyBackground=readRGB(getComputedStyle(document.body).backgroundColor);
        return {
         description:contrast(readRGB(getComputedStyle(description).color),bodyBackground),
         language:language?contrast(readRGB(getComputedStyle(language).color),readRGB(getComputedStyle(language).backgroundColor)):null
        };
       });
       assert.ok(ratios.description>=4.5,'VATRA auth hero description contrast must be at least 4.5:1');
       if(ratios.language!==null)assert.ok(ratios.language>=4.5,
        'Inactive language labels must have at least 4.5:1 contrast');
      }
      // These are real click-through checks: a styled but non-functional
      // form must fail CI, even when the initial screenshot looks fine.
      await page.waitForFunction(()=>window.__vatraAuthReady===true,null,{timeout:18000});
      const initialMode=item.id==='register'?'register':'login';
      assert.equal(await page.locator('body').getAttribute('data-auth-mode'),initialMode,'Unexpected initial auth mode');
      await page.locator('#registerTab').click();
      assert.equal(await page.locator('body').getAttribute('data-auth-mode'),'register','Register tab does not switch form');
      assert.equal(await page.locator('#firstNameWrap').isVisible(),true,'Registration name field is hidden');
      assert.equal(await page.locator('#password').getAttribute('autocomplete'),'new-password','Registration must offer new password autofill');
      const registerSize=await page.evaluate(()=>({
       client:document.documentElement.clientWidth,
       scroll:document.documentElement.scrollWidth
      }));
      assert.ok(registerSize.scroll-registerSize.client<=8,'Registration overflows on '+viewport.id);
      await page.screenshot({path:output+'/'+item.id+'-register-tab-'+viewport.id+'.png',animations:'disabled'});
      await page.locator('#loginTab').click();
      assert.equal(await page.locator('body').getAttribute('data-auth-mode'),'login','Login tab does not switch form');
      assert.equal(await page.locator('#firstNameWrap').isVisible(),false,'Registration-only fields remain on login');
      assert.equal(await page.locator('#password').getAttribute('autocomplete'),'current-password','Login must allow existing password autofill');
      assert.equal(await page.locator('#email').getAttribute('autocomplete'),'email','Email autofill must remain enabled');
      assert.equal(await page.locator('#authForm').getAttribute('autocomplete'),'on','Password manager must not be blocked');
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
  // Reapply the actual navigation component source to the isolated fixture.
  // Injecting the full bundle again would duplicate font-face rules and block font loading.
  await visual.addStyleTag({content:await readFile('assets/styles/sources/foundation/icons.css','utf8')});
  // Wait until the 160ms active-link color transition reaches its final value.
  await visual.waitForTimeout(260);
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
    navActiveColor:getComputedStyle(activeNav).color,
    navActiveIconColor:getComputedStyle(activeNav.querySelector('.nav-icon')).color,
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
  assert.equal(visualStyle.navActiveBackground,visualStyle.navIdleBackground,'Active sidebar must not use a filled selection background');
  assert.equal(visualStyle.navActiveColor,'rgb(7, 87, 245)','Active route text must use the VATRA blue');
  assert.equal(visualStyle.navActiveIconColor,'rgb(7, 87, 245)','Active route icon must use the VATRA blue');
  assert.ok(Number(visualStyle.navActiveWeight)>Number(visualStyle.navIdleWeight),'Active route should use moderately stronger text');
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
  await gallery.setContent('<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/styles/vatra.css"></head><body data-page="profile"><header class="vatra-global-header"><div class="mobile-brand">ВАТРА</div></header><div class="layout"><aside class="sidebar"></aside><main class="main"><div class="vatra-profile-layout"><div class="vatra-profile-sidebar"></div><section class="vatra-profile-main"><div class="vatra-profile-photos"><div class="vatra-profile-photo-carousel vatra-profile-media-carousel"><div class="vatra-gallery-stage"><div class="vatra-gallery-viewport"><div class="profile-photo-gallery vatra-gallery-track">'+tiles+'</div></div></div></div></div></section></div></main></div></body></html>',{waitUntil:'load'});
  for(const viewport of [{width:1440,height:900,columns:4},{width:840,height:840,columns:3},{width:390,height:844,columns:2}]){
   await gallery.setViewportSize({width:viewport.width,height:viewport.height});
   // A real responsive carousel renders only the visible number of tiles.
   // Remove extras so implicit CSS grid tracks do not skew this fixture.
   await gallery.evaluate(cols=>{
    const tiles=[...document.querySelectorAll('.vatra-gallery-track>.profile-photo-tile')];
    tiles.slice(cols).forEach(node=>node.remove());
   },viewport.columns);
   const measured=await gallery.evaluate(()=>{
    const track=document.querySelector('.vatra-gallery-track'),layout=document.querySelector('.layout');
    return {columns:getComputedStyle(track).gridTemplateColumns.trim().split(/\s+/).length,
      layoutWidth:Math.round(layout.getBoundingClientRect().width),
      layoutLeft:Math.round(layout.getBoundingClientRect().left),
      headerPaddingLeft:Math.round(parseFloat(getComputedStyle(document.querySelector('.vatra-global-header')).paddingLeft)),
      tileWidth:Math.round(track.querySelector('.profile-photo-tile').getBoundingClientRect().width),
      viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth};
   });
   assert.equal(measured.columns,viewport.columns,'Gallery columns mismatch at '+viewport.width+'px');
   assert.ok(measured.tileWidth>=80,'Gallery thumbnail too small at '+viewport.width+'px: '+measured.tileWidth);
   assert.ok(measured.scrollWidth-measured.viewport<=8,'Profile gallery overflows at '+viewport.width+'px');
   if(viewport.width===1440){
    assert.ok(measured.layoutWidth<=1040,'Wide profile must remain compact, got '+measured.layoutWidth);
    assert.ok(Math.abs(measured.layoutLeft-measured.headerPaddingLeft)<=6,'The header must align with the sidebar on desktop');
   }
   results.push({case:'profile-gallery-responsive',...measured});
   await gallery.screenshot({path:output+'/profile-gallery-'+viewport.width+'.png',animations:'disabled'});
   console.log('PASS profile gallery',JSON.stringify(measured));
  }
 }catch(error){failed=true;console.error('FAIL profile gallery responsiveness',error?.stack||error);}
 finally{await gallery.close();}

 // Verify the new welcome/empty-state components at desktop and phone widths.
 const circle=await browser.newPage({viewport:{width:1280,height:820},deviceScaleFactor:1});
 try{
  await circle.goto(base+'/404.html',{waitUntil:'domcontentloaded'});
  await circle.setContent('<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/styles/vatra.css"></head><body data-page="feed"><div class="layout"><aside class="sidebar"><nav aria-label="Основна навігація"><a class="nav" data-page="profile" href="#/profile"><span class="nav-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4"/></svg></span><span>Моя сторінка</span></a><a class="nav active" data-page="feed" href="#/feed"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h9"/></svg></span><span>Новини</span></a></nav></aside><main class="main"><section class="getting-started getting-started-mobile vatra-welcome-steps" id="gettingStartedMobile"><div class="vatra-welcome-head"><div><p class="vatra-welcome-kicker">ПЕРШІ КРОКИ · 0 із 5</p><h2>ВАТРА — тут починається твоє коло</h2><p>Знайди людей, поділися моментом або відкрий спільноту.</p></div><button class="vatra-welcome-dismiss">Не показувати</button></div><div class="vatra-welcome-actions"><button class="vatra-welcome-action"><span class="vatra-welcome-step-number">01</span>Додати фотографію →</button><button class="vatra-welcome-action"><span class="vatra-welcome-step-number">02</span>Розповісти про себе →</button><button class="vatra-welcome-action"><span class="vatra-welcome-step-number">03</span>Знайти друзів →</button><button class="vatra-welcome-action"><span class="vatra-welcome-step-number">04</span>Переглянути спільноти →</button><button class="vatra-welcome-action"><span class="vatra-welcome-step-number">05</span>Написати перший допис →</button></div><div class="vatra-welcome-footer"><button class="vatra-welcome-tour">Можливості ВАТРИ</button><button class="vatra-welcome-invite">Запросити друзів</button></div></section><section id="empty"><div class="vatra-action-empty"><h3>Поділись своїм першим моментом</h3><p>Напиши допис або знайди друзів, щоб стрічка ожила.</p><div class="vatra-action-empty-buttons"><button class="primary">Створити допис</button><button class="pill">Знайти друзів</button></div></div></section></main></div></body></html>',{waitUntil:'load'});
  for(const vp of [{name:'desktop',width:1280,height:820},{name:'mobile',width:390,height:844}]){
   await circle.setViewportSize({width:vp.width,height:vp.height});
   const metrics=await circle.evaluate(()=>{
    const box=document.getElementById('gettingStartedMobile'),bounds=box.getBoundingClientRect();
    const links=[...document.querySelectorAll('.sidebar nav .nav')];
    const idleBg=getComputedStyle(links[0]).backgroundColor,activeBg=getComputedStyle(links[1]).backgroundColor;
    return {visible:getComputedStyle(box).display!=='none',left:bounds.left,right:bounds.right,idleBg,activeBg,
      vw:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth};
   });
   assert.ok(metrics.visible,'Optional welcome fixture hidden on '+vp.name);
   if(vp.name==='desktop')assert.equal(metrics.activeBg,metrics.idleBg,'Sidebar active tab must have no colored background');
   assert.ok(metrics.left>=-3&&metrics.right<=metrics.vw+3,'Welcome card overflows on '+vp.name);
   assert.ok(metrics.scroll-metrics.vw<=8,'Welcome/empty state causes horizontal overflow on '+vp.name);
   await circle.screenshot({path:output+'/social-circle-'+vp.name+'.png',animations:'disabled'});
   results.push({case:'social-circle-fixture',viewport:vp.name,...metrics});
  }
 }catch(error){failed=true;console.error('FAIL VATRA social circle fixture',error?.stack||error);}
 finally{await circle.close();}


 // Visual contract for secure-message readiness (fixture: no real account or database writes).
 const chatUi=await browser.newPage({viewport:{width:1280,height:850},deviceScaleFactor:1});
 try{
  await chatUi.goto(base+'/404.html',{waitUntil:'domcontentloaded'});
  await chatUi.setContent('<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/styles/vatra.css"></head><body data-page="messages"><div class="layout"><aside class="sidebar"></aside><main class="main"><section class="vatra-messenger"><div class="vatra-messenger-shell"><aside class="vatra-messenger-sidebar"><div class="vatra-messenger-heading"><h2>Повідомлення</h2></div><div class="vatra-messenger-contact"><button class="vatra-messenger-contact-main">Тестовий діалог</button></div></aside><article class="post chat-window"><header class="chat-top"><strong>Співрозмовник</strong></header><div class="vatra-chat-security-row"><p id="chatSecurityStatus" class="vatra-chat-security-status" role="status" aria-live="polite" data-ready="false">Повідомлення поки недоступні. Ключ ще не готовий.</p><button id="chatSecurityRefresh" class="vatra-chat-security-retry">Повторити перевірку</button></div><div class="chat-messages" id="chatMessages"></div><form id="sendMessageForm" class="chat-send"><input name="message" disabled placeholder="Очікуємо захищене з’єднання…"><button class="primary" type="submit" disabled>Надіслати</button></form></article></div></section></main></div></body></html>',{waitUntil:'load'});
  for(const vp of [{name:'desktop',width:1280,height:850},{name:'mobile',width:390,height:844}]){
   await chatUi.setViewportSize({width:vp.width,height:vp.height});
   const status=chatUi.locator('#chatSecurityStatus');
   assert.ok(await status.isVisible(),'Secure chat readiness must be visible on '+vp.name);
   assert.ok(await chatUi.locator('#sendMessageForm input').isDisabled(),'Composer must not send before key setup');
   const metrics=await chatUi.evaluate(()=>{
    const row=document.querySelector('.vatra-chat-security-row').getBoundingClientRect();
    return {clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
      statusWidth:Math.round(row.width)};
   });
   assert.ok(metrics.scrollWidth-metrics.clientWidth<=8,'Chat UI horizontal overflow on '+vp.name);
   await chatUi.screenshot({path:output+'/chat-key-readiness-'+vp.name+'.png',animations:'disabled'});
   results.push({case:'chat-security-fixture',viewport:vp.name,...metrics});
  }
 }catch(error){failed=true;console.error('FAIL VATRA chat readiness fixture',error?.stack||error)}
 finally{await chatUi.close();}


 // Browser-level language catalog: display all supported entries and honest translation status.
 const localePage=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
 try{
  await localePage.goto(base+'/auth.html',{waitUntil:'domcontentloaded'});
  await localePage.locator('#vatraLoader').waitFor({state:'hidden',timeout:15000});
  for(const vp of [{name:'desktop',width:1280,height:800},{name:'mobile',width:390,height:844}]){
   await localePage.setViewportSize({width:vp.width,height:vp.height});
   const open=localePage.locator('.vatra-auth-language-all:visible').first();
   await open.waitFor({state:'visible'});
   await open.click();
   const dialog=localePage.locator('#vatraLanguageDialog[open]');
   await dialog.waitFor({state:'visible'});
   const opts=dialog.locator('[data-vatra-language-code]');
   const count=await opts.count();
   const available=await opts.filter({hasText:'Доступна'}).count();
   assert.ok(count>=100,'Full 100+ language catalog should be present on '+vp.name);
   assert.equal(available,8,'Exactly eight entries are currently available on '+vp.name);
   assert.ok(await opts.filter({hasText:'У розробці'}).count()>90,'Incomplete translations must be labeled on '+vp.name);
   const dimensions=await localePage.evaluate(()=>{
    const node=document.querySelector('#vatraLanguageDialog'),rect=node.getBoundingClientRect();
    return {viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,left:Math.round(rect.left),right:Math.round(rect.right)};
   });
   assert.ok(dimensions.left>=-2&&dimensions.right<=dimensions.viewport+2,'Language dialog overflows viewport on '+vp.name);
   const search=dialog.locator('.vatra-language-search');
   assert.equal(await dialog.locator('[data-vatra-language-code="uk"]').getAttribute('aria-pressed'),'true',
    'Current interface language should expose its button selection to assistive technology');
   await search.fill('pl');
   assert.equal(await dialog.locator('[data-vatra-language-code]:visible').count(),1,'Search by ISO code should match exactly one option');
   assert.equal(await dialog.locator('[data-vatra-language-code]:visible').first().getAttribute('data-vatra-language-code'),'pl');
   await search.press('ArrowDown');
   assert.equal(await localePage.evaluate(()=>document.activeElement?.dataset?.vatraLanguageCode),'pl',
    'Down arrow from language search must focus the visible language choice');
   await search.fill('vatra-never-language-999');
   assert.equal(await dialog.locator('[data-vatra-language-code]:visible').count(),0,'Unknown language should leave no visible choices');
   assert.equal(await dialog.locator('.vatra-language-picker-category:visible').count(),0,'Empty language categories must be hidden');
   assert.ok(await dialog.locator('.vatra-language-empty').isVisible(),'Language search needs an accessible empty state');
   await search.fill('');
   assert.equal(await dialog.locator('[data-vatra-language-code]:visible').count(),count,'Clearing the language query should restore the full catalog');
   assert.ok(await dialog.locator('.vatra-language-empty').isHidden(),'Clearing query must remove the no-results notice');
   await localePage.screenshot({path:output+'/language-catalog-status-'+vp.name+'.png',animations:'disabled'});
   results.push({case:'language-catalog-status',viewport:vp.name,count,ready:available,...dimensions});
   await localePage.locator('[data-vatra-language-close]').click();
  }
 }catch(error){failed=true;console.error('FAIL VATRA language availability dialog',error?.stack||error);}
 finally{await localePage.close();}


 // Auth/recovery country lists: search by calling code and keep it independent of interface language.
 const countryPage=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 try{
  await countryPage.goto(base+'/auth.html',{waitUntil:'domcontentloaded'});
  await countryPage.locator('#vatraLoader').waitFor({state:'hidden',timeout:15000});
  await countryPage.locator('label:has(input[name="authMethod"][value="phone"])').click();
  const trigger=countryPage.locator('#countryCodeMenu').locator('xpath=..').locator('.vatra-phone-country-trigger');
  await trigger.click();
  const menu=countryPage.locator('#countryCodeMenu:not([hidden])');
  const search=menu.locator('.vatra-phone-country-search');
  await search.fill('48');
  assert.equal(await menu.locator('[role="option"]:visible').count(),1,'Calling-code search must narrow the country list');
  assert.equal(await menu.locator('[role="option"]:visible').first().getAttribute('data-iso'),'PL');
  await search.fill('vatra-invalid-country-000');
  assert.ok(await menu.locator('.vatra-phone-country-empty').isVisible(),'Unknown calling code needs an empty state');
  assert.equal(await menu.locator('[role="option"]:visible').count(),0,'Filtered country options should be hidden');
  await search.fill('48');
  await search.press('Enter');
  assert.equal(await countryPage.locator('#countryCode').inputValue(),'+48','Enter must select the matching country without submitting the auth form');
  await countryPage.locator('.vatra-auth-language-option[data-vatra-auth-language="en"]:visible').first().click();
  assert.equal(await countryPage.locator('#countryCode').inputValue(),'+48','Changing interface language must not rewrite a selected phone code');
  assert.equal(await countryPage.evaluate(()=>localStorage.getItem('vatra-language')),'en','Selected interface language must persist');
  await countryPage.reload();
  await countryPage.locator('#vatraLoader').waitFor({state:'hidden',timeout:15000});
  assert.equal(await countryPage.evaluate(()=>window.vatraLanguage?.language),'en','Saved interface language must survive reload');
  results.push({case:'phone-code-language-independence',viewport:'mobile',countrySearch:true,languagePersisted:true});
 }catch(error){failed=true;console.error('FAIL VATRA country code and language independence',error?.stack||error);}
 finally{await countryPage.close();}

 // The first impression must be understandable when international users select English.
 const enPage=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 try{
  await enPage.addInitScript(()=>{localStorage.setItem('vatra-language','en')});
  await enPage.goto(base+'/auth.html',{waitUntil:'domcontentloaded'});
  await enPage.waitForFunction(()=>document.querySelector('.brand-copy h1 em')?.textContent?.includes('your circle starts here'),null,{timeout:16000});
  await enPage.locator('#vatraLoader').waitFor({state:'hidden',timeout:15000});
  assert.equal(await enPage.locator('.brand-copy h1 em').isVisible(),true,'English VATRA social promise must be visible');
  await enPage.waitForFunction(()=>document.querySelector('#desc')?.textContent?.includes('Sign in with your email address'),null,{timeout:8000});
  assert.ok((await enPage.locator('#desc').textContent()).includes('Sign in with your email address'),'English sign-in form help must be translated');
  await enPage.waitForFunction(()=>document.querySelector('#password')?.placeholder==='Enter your password',null,{timeout:8000});
  assert.equal(await enPage.locator('#password').getAttribute('placeholder'),'Enter your password','Password placeholder must be localized after auth hydration');
  await enPage.locator('#showPassword').click();
  await enPage.waitForFunction(()=>document.querySelector('#showPassword')?.getAttribute('aria-label')==='Hide password',null,{timeout:8000});
  await enPage.locator('#showPassword').click();
  await enPage.waitForFunction(()=>document.querySelector('#showPassword')?.getAttribute('aria-label')==='Show password',null,{timeout:8000});
  await enPage.locator('.vatra-auth-language-option[data-vatra-auth-language="pl"]:visible').first().click();
  await enPage.waitForFunction(()=>document.querySelector('#password')?.placeholder==='Wpisz hasło',null,{timeout:8000});
  assert.equal(await enPage.locator('#password').getAttribute('placeholder'),'Wpisz hasło','Changing language must restore native text before translation');
  await enPage.locator('.vatra-auth-language-option[data-vatra-auth-language="en"]:visible').first().click();
  await enPage.waitForFunction(()=>document.querySelector('#password')?.placeholder==='Enter your password',null,{timeout:8000});
  await enPage.screenshot({path:output+'/auth-social-circle-english-desktop.png',animations:'disabled'});
  results.push({case:'auth-social-circle-english',viewport:'desktop',translated:true});
 }catch(error){failed=true;console.error('FAIL VATRA English social promise',error?.stack||error);}
 finally{await enPage.close();}
}finally{await browser.close();}
await writeFile(output+'/metrics.json',JSON.stringify(results,null,2)+'\n');
if(failed)process.exitCode=1;
