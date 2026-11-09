/* Native Windows/macOS Chromium smoke checks; production Supabase untouched. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {resolve,sep} from "node:path";
import {chromium} from "playwright";
const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".ttf":"font/ttf",".png":"image/png"};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,"http://localhost");
  if(!u.pathname.startsWith("/VATRA/")){res.writeHead(404).end();return;}
  let file=decodeURIComponent(u.pathname.slice("/VATRA/".length))||"index.html";
  if(!file.split("/").at(-1).includes("."))file+=".html";
  const path=resolve(root,file);
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
  const body=await readFile(path),ext=file.slice(file.lastIndexOf("."));
  res.writeHead(200,{"Content-Type":mime[ext]||"application/octet-stream"}).end(body);
 }catch(_){res.writeHead(404).end("Not found");}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const base="http://127.0.0.1:"+server.address().port+"/VATRA/";
let browser;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({reducedMotion:"no-preference",serviceWorkers:"block"});
 await context.route("**/assets/js/host.js",r=>r.fulfill({status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"}));
 await context.route("**/cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"text/javascript",body:"window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};"}));
 for(const language of ["uk","en"]){
  // VATRA cookie overrides localStorage; set both to the requested locale.
  await context.addCookies([{name:"vatra-language",value:language,url:base}]);
  for(const viewport of [{width:375,height:812},{width:844,height:390},{width:1366,height:768}]){
   for(const route of ["","register.html","forgot.html","reset.html","404.html","terms.html","privacy.html","cookies.html"]){
    const page=await context.newPage();
    try{
     const pageErrors=[];page.on("pageerror",e=>pageErrors.push(e.message));
     await page.addInitScript(lang=>localStorage.setItem("vatra-language",lang),language);
     await page.setViewportSize(viewport);
     await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:20000});
     try{
      await page.waitForFunction(lang=>document.documentElement.lang===lang&&
       !document.documentElement.classList.contains("i18n-pending")&&
       (!document.querySelector("#vatra-auth-loading")||document.body.dataset.authReady==="true"),language,{timeout:15000});
     }catch(error){
      const state=await page.evaluate(()=>({lang:document.documentElement.lang,
       ready:document.body?.dataset?.authReady,pending:document.documentElement.classList.contains("i18n-pending"),
       url:location.href,loading:!!document.querySelector("#vatra-auth-loading")}));
      throw new Error("Native UI readiness failed "+JSON.stringify({language,viewport,route,state})+": "+error.message);
     }
     const layout=await page.evaluate(()=>{
      const main=document.querySelector("main,.auth-layout,.split,.signup-layout");
      const foot=document.querySelector("footer");
      return {overflow:document.documentElement.scrollWidth-innerWidth,
       main:!!main&&main.getBoundingClientRect().width>0,
       footer:!!foot&&foot.getBoundingClientRect().width>0,
       lang:document.documentElement.lang,
       heading:document.querySelector("h1,h2")?.textContent?.trim()||""};
     });
     assert.ok(layout.overflow<=3&&layout.main&&layout.footer&&layout.lang===language&&layout.heading.length>0,
      process.platform+" "+language+" "+viewport.width+" "+route+" invalid UI: "+JSON.stringify(layout));
     assert.deepEqual(pageErrors,[],process.platform+" "+route+" JavaScript errors");
    }finally{await page.close();}
   }
  }
 }
 await context.close();
 console.log("VATRA native "+process.platform+" Chromium: 8 pages, UK/EN, portrait/landscape/desktop passed");
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done));}
