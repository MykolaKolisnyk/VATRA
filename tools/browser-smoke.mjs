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
}finally{await browser.close();}
await writeFile(output+'/metrics.json',JSON.stringify(results,null,2)+'\n');
if(failed)process.exitCode=1;
