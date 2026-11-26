import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {chromium,firefox,webkit} from "playwright";

const root="/VATRA/",assets=new Map([
 ["assets/js/external-links.js","text/javascript; charset=utf-8"],
 ["assets/js/network.js","text/javascript; charset=utf-8"],
 ["assets/js/lang.js","text/javascript; charset=utf-8"],
 ["assets/js/toast.js","text/javascript; charset=utf-8"],
 ["assets/i18n/uk.json","application/json"],
 ["assets/vatryk/vatryk_503.webp","image/webp"],
 ["assets/css/external-links.css","text/css; charset=utf-8"],
 ["assets/css/base.css","text/css; charset=utf-8"],
 ["assets/vatryk/vatryk_suspicious-link.webp","image/webp"]
]);
const markup='<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="assets/css/base.css"><link rel="stylesheet" href="assets/css/external-links.css"><script defer src="assets/js/external-links.js"></script></head><body><main><a id="suspect" href="https://example.org/setup.exe">Suspect</a> <a id="ordinary" href="https://example.org/page?q=a%20b">Ordinary</a> <a id="signed" href="https://example.org/page?sig=a%2Bb">Signed</a></main></body></html>';
const modalMarkup='<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="assets/css/base.css"><script defer src="assets/js/lang.js"></script><script defer src="assets/js/network.js"></script></head><body><main style="height:3000px"><button data-language-trigger type="button" style="position:fixed;top:10px;left:10px">Language</button></main></body></html>';
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,"http://localhost").pathname;
  if(path===root+"fixture"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}).end(markup);return;}
  if(path===root+"modal-fixture"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}).end(modalMarkup);return;}
  const relative=path.slice(root.length);
  if(!path.startsWith(root)||!assets.has(relative)){res.writeHead(404).end();return;}
  res.writeHead(200,{"Content-Type":assets.get(relative)}).end(await readFile(relative));
 }catch(_){res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port+root;
const origin=new URL(base).origin;
const selector=".ui-vatra-external-link-dialog-001";
const image=".vatra-external-link-mascot-001";
const back=".vatra-external-link-back-001";
const next=".vatra-external-link-continue-001";
try{
 await mkdir("audit-screenshots",{recursive:true});
 for(const [engine,driver] of [["chromium",chromium],["firefox",firefox],["webkit",webkit]]){
  const browser=await driver.launch({headless:true});
  try{
   const context=await browser.newContext({serviceWorkers:"block"});
   const external=[];
   await context.route("**/*",route=>{
    const url=new URL(route.request().url());
    if(url.origin===origin)return route.continue();
    if(url.origin==="https://example.org"){
     external.push(url.href);
     return route.fulfill({status:200,contentType:"text/html",body:"<!doctype html><title>Mock destination</title>"});
    }
    return route.abort("blockedbyclient");
   });
   for(const viewport of [{width:320,height:700},{width:844,height:390},{width:1440,height:900}]){
    const page=await context.newPage();
    try{
     await page.setViewportSize(viewport);
     let imageRequests=0;
     page.on("request",request=>{if(request.url().includes("vatryk_suspicious-link.webp"))imageRequests++;});
     await page.goto(base+"fixture");
     await page.waitForFunction(()=>!!window.VATRA_EXTERNAL_LINKS);
     assert.equal(imageRequests,0,engine+" must not preload warning artwork");
     const before=external.length;
     await page.locator("#suspect").click();
     await page.locator(selector).waitFor({state:"visible"});
     await page.waitForFunction(sel=>{const img=document.querySelector(sel);return img?.complete&&img.naturalWidth>0;},image);
     assert.equal(imageRequests,1);
     assert.equal(external.length,before,"No navigation before consent");
     assert.match(await page.locator(selector).innerText(),/Підозріле посилання/);
     assert.match(await page.locator(selector).innerText(),/виконуваний файл/);
     for(const sel of [".vatra-external-link-heading-001",".vatra-external-link-note-001",".vatra-external-link-domain-001",".vatra-external-link-reasons-001"])assert.equal(await page.locator(sel).evaluate(el=>getComputedStyle(el).textAlign),"center");
     const layout=await page.locator(selector).evaluate(el=>{
      const r=el.getBoundingClientRect();
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
     });
     assert.ok(layout.left>=-1&&layout.right<=layout.width+1&&layout.top>=-1&&layout.bottom<=layout.height+1&&layout.scrollWidth<=layout.clientWidth+1,engine+" warning overflow "+JSON.stringify(layout));
     if(viewport.width===320||viewport.width===1440)await page.screenshot({path:"audit-screenshots/"+engine+"-"+viewport.width+"-external-link-warning.png"});
     await page.locator(back).click();
     await page.locator(selector).waitFor({state:"detached"});
     assert.equal(page.url(),base+"fixture");
     assert.equal(external.length,before);
     await page.locator("#suspect").focus();
     await page.keyboard.press("Enter");
     await page.locator(selector).waitFor({state:"visible"});
     await page.keyboard.press("Escape");
     await page.locator(selector).waitFor({state:"detached"});
     assert.equal(page.url(),base+"fixture");
     assert.equal(external.length,before);
     await page.locator("#suspect").click();
     await page.locator(selector).waitFor({state:"visible"});
     await Promise.all([page.waitForURL("https://example.org/setup.exe"),page.locator(next).click()]);
     assert.equal(external.at(-1),"https://example.org/setup.exe","Confirmed suspicious address stays unmodified");
    }finally{await page.close();}
   }
   const page=await context.newPage();
   try{
    await page.route("**/vatryk_suspicious-link.webp?*",route=>route.abort("failed"));
    await page.goto(base+"fixture");
    await page.waitForFunction(()=>!!window.VATRA_EXTERNAL_LINKS);
    await page.locator("#suspect").click();
    await page.locator(selector).waitFor({state:"visible"});
    await page.locator(image).waitFor({state:"detached"});
    await page.locator(back).click();
    await page.locator(selector).waitFor({state:"detached"});
    await Promise.all([page.waitForURL("https://example.org/page?q=a%20b&utm_source=vatra"),page.locator("#ordinary").click()]);
    assert.equal(external.at(-1),"https://example.org/page?q=a%20b&utm_source=vatra");
    await page.goto(base+"fixture");
    await Promise.all([page.waitForURL("https://example.org/page?sig=a%2Bb"),page.locator("#signed").click()]);
    assert.equal(external.at(-1),"https://example.org/page?sig=a%2Bb");
   }finally{await page.close();}
   // Use real language picker and service error runtime, with no production requests.
   const modalPage=await context.newPage();
   try{
    await modalPage.setViewportSize({width:390,height:844});
    await modalPage.emulateMedia({reducedMotion:"reduce"});
    await modalPage.addInitScript(()=>{localStorage.setItem("vatra-language","uk");});
    await modalPage.goto(base+"modal-fixture");
    await modalPage.waitForFunction(()=>!!window.VATRA_SERVICE_NOTICE&&!!window.VATRA_LANGUAGE?.openPicker);
    await modalPage.evaluate(()=>{document.documentElement.style.scrollBehavior="auto";window.scrollTo(0,600);});
    await modalPage.waitForFunction(()=>scrollY===600);
    const assertLocked=async(sel,pseudo=null)=>{
     const style=await modalPage.locator(sel).evaluate((el,pseudo)=>{
      const cs=getComputedStyle(el,pseudo);
      return {color:cs.backgroundColor,blur:cs.backdropFilter||cs.webkitBackdropFilter,root:getComputedStyle(document.documentElement).overflowY,body:getComputedStyle(document.body).overflowY,y:scrollY};
     },pseudo);
     assert.equal(style.color,"rgba(15, 24, 44, 0.48)",engine+" shared dim");
     assert.equal(style.blur,"blur(3px)",engine+" shared blur");
     assert.equal(style.root,"hidden");assert.equal(style.body,"hidden");
     assert.equal(style.y,600,"Opening modal must not jump the page");
     await modalPage.mouse.move(4,4);await modalPage.mouse.wheel(0,650);
     await modalPage.waitForTimeout(250);
     assert.equal(await modalPage.evaluate(()=>scrollY),600,engine+" background scroll must stay locked");
    };
    await modalPage.evaluate(()=>window.VATRA_LANGUAGE.openPicker());
    await modalPage.locator(".language-backdrop").waitFor({state:"visible"});
    await assertLocked(".language-backdrop");
    await modalPage.keyboard.press("Escape");
    await modalPage.locator(".language-backdrop").waitFor({state:"hidden"});
    await modalPage.evaluate(()=>window.VATRA_SERVICE_NOTICE.show("503"));
    const service=".ui-vatra-service-notice-001";
    await modalPage.locator(service).waitFor({state:"visible"});
    await modalPage.waitForFunction(()=>{const img=document.querySelector(".ui-vatra-service-notice-art-001");return img?.complete&&img.naturalWidth>0;});
    await assertLocked(service,"::backdrop");
    assert.equal(await modalPage.locator(service).evaluate(el=>getComputedStyle(el).textAlign),"center");
    await modalPage.screenshot({path:"audit-screenshots/"+engine+"-503-modal.png"});
    // Stacked dialogs must not release the underlying scroll lock early.
    await modalPage.evaluate(()=>{const d=document.createElement("dialog");d.id="stacked-modal-test";d.textContent="Fixture";document.body.append(d);d.showModal();});
    await assertLocked("#stacked-modal-test","::backdrop");
    await modalPage.evaluate(()=>{const d=document.querySelector("#stacked-modal-test");d.close();d.remove();});
    await assertLocked(service,"::backdrop");
    await modalPage.locator(".vatra-service-notice-action-001").click();
    await modalPage.locator(service).waitFor({state:"detached"});
    assert.equal(await modalPage.evaluate(()=>getComputedStyle(document.documentElement).overflowY==="hidden"),false);
    await modalPage.mouse.wheel(0,400);
    await modalPage.waitForFunction(()=>scrollY>600);
    console.log("VATRA "+engine+": language and 503 use identical modal dim/blur; background scroll stays locked across nested dialogs and unlocks after dismissal.");
   }finally{await modalPage.close();}
   await context.close();
   console.log("VATRA "+engine+": warning UI, lazy artwork, mobile geometry, keyboard dismissal, consent and mocked navigation passed.");
  }finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));}
