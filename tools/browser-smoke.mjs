/* Browser regression checks for VATRA: run with playwright installed (CI only). */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {resolve,sep} from "node:path";
import {chromium} from "playwright";

const basePath="/VATRA/";
const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".ttf":"font/ttf",".xml":"application/xml"};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost");
  if(!url.pathname.startsWith(basePath)){res.writeHead(404).end();return;}
  let name=decodeURIComponent(url.pathname.slice(basePath.length))||"index.html";
  if(name.endsWith("/"))name+="index.html";
  const file=resolve(root,name);
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const body=await readFile(file);
  const extension=name.slice(name.lastIndexOf("."));
  res.writeHead(200,{"Content-Type":mime[extension]||"application/octet-stream"});
  res.end(body);
 }catch(error){res.writeHead(404).end("Not found");}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port+basePath;
let browser;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({locale:"uk-UA",serviceWorkers:"block"});
 await context.route("**/assets/js/host.js",route=>route.fulfill({status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"}));
 // Do not contact Supabase during purely visual tests or create real accounts.
 await context.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({status:200,contentType:"text/javascript",body:"window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};"}));
 const waitReady=page=>page.waitForFunction(()=>document.body?.dataset.authReady==="true",null,{timeout:12000});
 for(const [width,height] of [[360,780],[390,844],[768,1024],[1280,800],[1440,900],[1920,1080]]){
  const page=await context.newPage();
  await page.setViewportSize({width,height});
  await page.goto(base,{waitUntil:"domcontentloaded",timeout:20000});
  await waitReady(page);
  const sizes=await page.evaluate(()=>{
   const r=selector=>{const b=document.querySelector(selector)?.getBoundingClientRect();return b?{x:b.x,y:b.y,w:b.width,h:b.height}:null};
   const offenders=[...document.querySelectorAll("body *")].map(node=>({node,b:node.getBoundingClientRect()}))
    .filter(({node,b})=>b.width>0&&b.right>innerWidth+3&&getComputedStyle(node).display!=="none")
    .sort((a,b)=>b.b.right-a.b.right).slice(0,8).map(({node,b})=>({tag:node.tagName,cls:String(node.className).slice(0,110),left:Math.round(b.left),right:Math.round(b.right),width:Math.round(b.width)}));
   return {vw:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,intro:r(".intro-side"),form:r(".form-side"),copy:r(".intro-copy"),split:r(".split"),offenders};
  });
  assert.ok(sizes.intro&&sizes.form&&sizes.copy&&sizes.split,"Landing panels missing at "+width);
  if(sizes.overflow>3)console.log("Overflow diagnostic "+width+": "+JSON.stringify(sizes.offenders));
  assert.ok(sizes.overflow<=3,"Horizontal overflow at "+width+": "+sizes.overflow+"px");
  assert.ok(sizes.copy.w>200,"Description clipped at "+width);
  if(width>=1200){
   assert.ok(Math.abs(sizes.intro.w-sizes.form.w)<=2,"Columns unequal at "+width);
   assert.ok(Math.abs(sizes.intro.y-sizes.form.y)<=2,"Columns misaligned vertically at "+width);
   assert.ok(Math.abs(sizes.intro.h-sizes.form.h)<=2,"Column heights differ at "+width);
  }else{
   assert.ok(sizes.form.y<sizes.intro.y,"Mobile must show sign-in before artwork at "+width);
  }
  console.log("VATRA layout "+width+"x"+height+": OK");
  await page.close();
 }
 const page=await context.newPage();
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await waitReady(page);
 await page.locator("[data-language-trigger]").click();
 const dialog=page.locator(".language-dialog");
 await dialog.waitFor({state:"visible"});
 assert.equal(await page.locator(".language-option").count(),36,"Language directory count");
 await page.locator("#vatra-language-search").fill("English");
 await page.locator(".language-option:not([disabled])").filter({hasText:"English"}).first().click();
 await page.waitForFunction(()=>document.documentElement.lang==="en");
 assert.equal(await page.evaluate(()=>localStorage.getItem("vatra-language")),"en","Language storage");
 assert.ok((await context.cookies()).some(x=>x.name==="vatra-language"&&x.value==="en"),"Persistent language cookie missing");
 await page.close();
 const reopened=await context.newPage();
 await reopened.goto(base,{waitUntil:"domcontentloaded"});
 await waitReady(reopened);
 assert.equal(await reopened.locator("html").getAttribute("lang"),"en","Language lost after closing tab");
 console.log("VATRA language picker, search, cookies and tab reopen: OK");
 await reopened.evaluate(()=>{console.warn("VATRA-browser-smoke-warning");console.error("VATRA-browser-smoke-error");});
 const warning=reopened.locator(".vatra-error-toast--warning").filter({hasText:"VATRA-browser-smoke-warning"});
 const error=reopened.locator(".vatra-error-toast:not(.vatra-error-toast--warning)").filter({hasText:"VATRA-browser-smoke-error"});
 await warning.waitFor({state:"visible"});
 await error.waitFor({state:"visible"});
 const colors=await reopened.evaluate(()=>{
  const one=document.querySelector(".vatra-error-toast--warning");
  const other=[...document.querySelectorAll(".vatra-error-toast")].find(x=>!x.classList.contains("vatra-error-toast--warning"));
  return [getComputedStyle(one).borderLeftColor,getComputedStyle(other).borderLeftColor];
 });
 assert.notEqual(colors[0],colors[1],"Console warnings and errors need distinct colors");
 await warning.waitFor({state:"detached",timeout:9000});
 await error.waitFor({state:"detached",timeout:9000});
 console.log("VATRA warning/error styling and auto-dismiss: OK");
 await reopened.goto(base+"register.html",{waitUntil:"domcontentloaded"});
 await waitReady(reopened);
 const helps=reopened.locator(".reg-help");
 assert.equal(await helps.count(),2,"Gender and email help bubbles missing");
 await helps.nth(0).locator("summary").hover();
 await reopened.waitForFunction(()=>document.querySelectorAll(".reg-help[open]").length===1);
 await helps.nth(1).locator("summary").hover();
 await reopened.waitForFunction(()=>document.querySelectorAll(".reg-help[open]").length===1&&document.querySelectorAll(".reg-help")[1].open);
 await reopened.locator("#first-name").focus();
 await reopened.waitForFunction(()=>document.querySelector("#first-name").closest(".reg-input-wrap")?.classList.contains("is-raised"));
 await reopened.locator("#first-name").fill("VATRA");
 const inputStyle=await reopened.locator("#first-name").evaluate(node=>getComputedStyle(node).fontFamily);
 assert.ok(inputStyle.includes("Onest"),"Registration fields must use Onest");
 console.log("VATRA registration tooltips and floating input labels: OK");
 await reopened.close();
 await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
console.log("VATRA browser smoke checks passed.");
