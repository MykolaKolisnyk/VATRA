/* Browser regression checks for VATRA: run with playwright installed (CI only). */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve,sep} from "node:path";
import {chromium,firefox,webkit} from "playwright";

const basePath="/VATRA/";
const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".ttf":"font/ttf",".xml":"application/xml"};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost");
  if(!url.pathname.startsWith(basePath)){res.writeHead(404).end();return;}
  let name=decodeURIComponent(url.pathname.slice(basePath.length))||"index.html";
  if(name.endsWith("/"))name+="index.html";
  // Match GitHub Pages' extensionless HTML paths in local browser tests.
  if(!name.split("/").at(-1).includes("."))name+=".html";
  const file=resolve(root,name);
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const body=await readFile(file);
  const extension=name.slice(name.lastIndexOf("."));
  res.writeHead(200,{"Content-Type":mime[extension]||"application/octet-stream"});
  res.end(body);
 }catch(error){
  if(error?.code==="ENOENT"&&/^\/VATRA\/(?:id|club)[1-9][0-9]{0,18}$/.test(new URL(req.url,"http://localhost").pathname)){
   res.writeHead(404,{"Content-Type":mime[".html"]});
   res.end(await readFile(resolve(root,"404.html")));
  }else res.writeHead(404).end("Not found");
 }
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

 // The shared loader reflects real work, with 160ms grace but no forced hold.
 const bootContext=await browser.newContext({locale:"uk-UA",serviceWorkers:"block"});
 await bootContext.route("**/assets/js/host.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
 }));
 await bootContext.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:`window.__bootQueryFinished=false;
   window.supabase={createClient:()=>({auth:{getUser:async()=>{
    await new Promise(resolve=>setTimeout(resolve,850));
    window.__bootQueryFinished=true;
    return {data:{user:null},error:null};
   }}})};`
 }));
 const slowBoot=await bootContext.newPage();
 await slowBoot.addInitScript(()=>localStorage.setItem("vatra-language","uk"));
 await slowBoot.goto(base,{waitUntil:"domcontentloaded"});
 await slowBoot.waitForFunction(()=>getComputedStyle(
  document.querySelector("#vatra-auth-loading")).opacity==="1",null,{timeout:2000});
 const pendingState=await slowBoot.evaluate(()=>({
  complete:window.__bootQueryFinished,ready:document.body.dataset.authReady==="true",
  loader:document.querySelector("#vatra-auth-loading").getBoundingClientRect().width>0,
  track:getComputedStyle(document.querySelector(".vatra-auth-loading-track")).width
 }));
 assert.equal(pendingState.ready,false,"The loader must not dismiss during a real pending auth request");
 assert.equal(pendingState.complete,false,"Auth is still pending when the delayed loader is visible");
 assert.equal(pendingState.loader,true);
 assert.equal(pendingState.track,"80px","All dynamic pages use the same 80px progress indicator");
 await slowBoot.waitForFunction(()=>window.__bootQueryFinished&&document.body.dataset.authReady==="true",
  null,{timeout:7000});
 assert.equal(await slowBoot.locator("#vatra-auth-loading").isVisible(),false,
  "The loader must disappear as soon as auth finishes, without a minimum display duration");
 await slowBoot.close();
 await bootContext.close();

 const quickContext=await browser.newContext({locale:"uk-UA",serviceWorkers:"block"});
 await quickContext.route("**/assets/js/host.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
 }));
 await quickContext.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:"window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};"
 }));
 const quickBoot=await quickContext.newPage();
 await quickBoot.addInitScript(()=>localStorage.setItem("vatra-language","uk"));
 await quickBoot.goto(base,{waitUntil:"domcontentloaded"});
 await quickBoot.waitForFunction(()=>document.body.dataset.authReady==="true",null,{timeout:7000});
 assert.equal(await quickBoot.locator("#vatra-auth-loading").isVisible(),false,
  "Fast completed initialization should expose content immediately");
 for(const staticPage of ["terms","privacy","cookies","404"]){
  await quickBoot.goto(base+staticPage,{waitUntil:"domcontentloaded"});
  assert.equal(await quickBoot.locator(".vatra-auth-loading:visible").count(),0,
   "Static pages should not display a route loader: "+staticPage);
 }
 await quickContext.close();
 console.log("VATRA loading: fast requests, genuine wait, uniform indicator, no static-page splash OK");

 // A static legal page has no auth work; it may display the same loader only
 // if a real English translation request is still pending after the grace period.
 const localeBootContext=await browser.newContext({locale:"en-US",serviceWorkers:"block"});
 await localeBootContext.route("**/assets/js/host.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
 }));
 await localeBootContext.route("**/assets/i18n/en.json",async route=>{
  await new Promise(resolve=>setTimeout(resolve,850));
  await route.continue();
 });
 const localeBoot=await localeBootContext.newPage();
 await localeBoot.addInitScript(()=>localStorage.setItem("vatra-language","en"));
 await localeBoot.goto(base+"terms",{waitUntil:"domcontentloaded"});
 await localeBoot.waitForFunction(()=>document.querySelector("#vatra-auth-loading")&&
  getComputedStyle(document.querySelector("#vatra-auth-loading")).opacity==="1",null,{timeout:2500});
 assert.equal(await localeBoot.evaluate(()=>document.documentElement.classList.contains("i18n-pending")),true,
  "Legal page loader must correspond to a genuinely unfinished language request");
 await localeBoot.waitForFunction(()=>!document.documentElement.classList.contains("i18n-pending"),
  null,{timeout:7000});
 assert.equal(await localeBoot.locator("#vatra-auth-loading").count(),0,
  "The language loader must disappear as soon as translation is ready");
 assert.equal(await localeBoot.locator("h1").count()>0,true);
 await localeBootContext.close();
 console.log("VATRA conditional English locale loading on legal pages: OK");


 const localeTitles={
  uk:JSON.parse(await readFile("assets/i18n/uk.json","utf8")).__pages,
  en:JSON.parse(await readFile("assets/i18n/en.json","utf8")).__pages
 };

 // Locale entrance-animation audit: delayed English translations used to
 // consume the entire 300ms reveal while the body was invisible. Measure real
 // animation-end events in BOTH languages, not just CSS animation-name.
 const localeAnimationPages=[
  {path:"",selectors:[".form-box"]},
  {path:"register.html",selectors:[".signup-form-panel .narrow-form"]},
  {path:"forgot.html",selectors:[".forgot-panel-content"]},
  {path:"reset.html",selectors:[".forgot-panel-content"]},
  {path:"404.html",selectors:[".error-code",".error-heading",".error-description",".error-action"]},
  {path:"terms.html",selectors:[".policy-header",".policy-toc-title",".policy-section h2"]},
  {path:"privacy.html",selectors:[".policy-header",".policy-toc-title",".policy-section h2"]},
  {path:"cookies.html",selectors:[".policy-header",".policy-toc-title",".policy-section h2"]},
 ];
 const runLocaleAnimationAudit=async(engine,engineBrowser,entries,viewports)=>{
  for(const language of ["uk","en"]){
   const audit=await engineBrowser.newContext({locale:language==="en"?"en-US":"uk-UA",
    reducedMotion:"no-preference",serviceWorkers:"block"});
   await audit.route("**/assets/js/host.js",route=>route.fulfill({
    status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
   }));
   await audit.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
    status:200,contentType:"text/javascript",
    body:'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};'
   }));
   try{
    for(const viewport of viewports){
     for(const entry of entries){
      const view=await audit.newPage();
      try{
       await view.setViewportSize(viewport);
       await view.addInitScript(({language,selectors})=>{
        localStorage.setItem("vatra-language",language);
        // Account-page mock stores remembered credentials; keep subsequent login
        // probes on their normal visible login form instead of hiding it.
        localStorage.removeItem("vatra-remembered-account");
        window.__vatraLocaleAnimationEnds=[];
        document.addEventListener("animationend",event=>{
         if(event.animationName!=="vatraAuthReveal"||!(event.target instanceof Element))return;
         const matches=selectors.filter(selector=>event.target.matches(selector));
         if(!matches.length)return;
         window.__vatraLocaleAnimationEnds.push({
          matched:matches,hidden:document.documentElement.classList.contains("i18n-pending")||
           getComputedStyle(document.body).visibility==="hidden",
          authReady:document.body.dataset.authReady==="true",
          loader:!!document.querySelector("#vatra-auth-loading"),
          motion:getComputedStyle(event.target).animationName
         });
        },true);
       },{language,selectors:entry.selectors});
       if(entry.signedIn){
        await view.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
         status:200,contentType:"text/javascript",
         body:'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:"locale-audit-user",email:"audit@example.test",email_confirmed_at:"2026-11-01T00:00:00Z",user_metadata:{first_name:"Audit"}}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{vatra_id:25},error:null})})})})})};'
        }));
       }
       if(language==="en"){
        // Make the translation fetch deliberately slower than the reveal.
        await view.route("**/assets/i18n/en.json",async route=>{
         await new Promise(resolve=>setTimeout(resolve,1050));
         await route.continue();
        });
       }
       await view.goto(base+entry.path,{waitUntil:"domcontentloaded",timeout:20000});
       const pageName=entry.path===""?"index":entry.path.slice(0,-5);
       const expectedTitle=localeTitles[language][pageName].meta.title;
       assert.equal(await view.title(),expectedTitle,
        engine+" "+entry.path+" "+language+" tab title must match locale synchronously, before the language fetch completes");
       if(language==="en"){
        await view.waitForTimeout(210);
        assert.equal(await view.title(),expectedTitle,
         "English tab title must not flash Ukrainian while en.json is pending: "+entry.path);
       }
       const visibleAnimationSelectors=await view.evaluate(selectors=>selectors.filter(selector=>{
        const el=document.querySelector(selector);
        return el&&el.getClientRects().length>0&&
         getComputedStyle(el).animationName.includes("vatraAuthReveal");
       }),entry.selectors);
       assert.ok(visibleAnimationSelectors.includes(entry.selectors[0]),
        engine+" "+entry.path+" must have a visible primary entrance target");
       await view.waitForFunction(()=>document.documentElement.lang===
        (window.localStorage.getItem("vatra-language")||"uk"),null,{timeout:7000});
       if(language==="en"){
        // Assert the 300ms animation is STILL paused after 1+ seconds.
        await view.waitForFunction(()=>document.documentElement.classList.contains("i18n-pending"));
        const pending=await view.locator(entry.selectors[0]).evaluate(node=>({
         playState:getComputedStyle(node).animationPlayState,
         animation:getComputedStyle(node).animationName,
         pageHidden:getComputedStyle(document.body).visibility,
         ended:(window.__vatraLocaleAnimationEnds||[]).length,
         splashPlayState:document.querySelector("#vatra-auth-loading .vatra-auth-loading-symbol")
          ?getComputedStyle(document.querySelector("#vatra-auth-loading .vatra-auth-loading-symbol")).animationPlayState:null
        }));
        assert.ok(pending.animation==="vatraAuthReveal"&&pending.playState==="paused"&&
         pending.pageHidden==="hidden"&&pending.ended===0&&
         (pending.splashPlayState===null||pending.splashPlayState==="running"),
         engine+" "+entry.path+" English must not finish an entrance behind translations: "+JSON.stringify(pending));
       }
       await view.waitForFunction(()=>{
        const loading=document.querySelector("#vatra-auth-loading");
        return !document.documentElement.classList.contains("i18n-pending")&&
         (!loading||document.body.dataset.authReady==="true");
       },null,{timeout:12000});
       await view.waitForFunction(expected=>
        window.__vatraLocaleAnimationEnds?.length>=expected,
        visibleAnimationSelectors.length,{timeout:12000});
       assert.equal(await view.title(),expectedTitle,
        "Tab title must remain stable after asynchronous translation: "+entry.path+" "+language);
       const completed=await view.evaluate(()=>window.__vatraLocaleAnimationEnds);
       assert.ok(visibleAnimationSelectors.every(selector=>
        completed.some(record=>record.matched.includes(selector)&&!record.hidden&&
         (!record.loader||record.authReady)))&&
        completed.every(record=>record.motion==="vatraAuthReveal"),
        engine+" "+language+" "+viewport.width+" "+entry.path+
        " entrance must complete visibly after translated/auth-ready content: "+JSON.stringify(completed));
      }finally{await view.close();}
     }
    }
   }finally{await audit.close();}
   console.log("VATRA "+engine+" "+language+" entrance motion: "+
    entries.length+" pages x "+viewports.length+" viewport(s), translation delay checked");
  }
 };
 await runLocaleAnimationAudit("chromium",browser,localeAnimationPages,
  [{width:390,height:844},{width:1440,height:900}]);

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
  const design=await page.evaluate(()=>{
   const brand=document.querySelector(".intro-side");
   const form=document.querySelector(".form-side");
   const main=document.querySelector(".split");
   const rect=main.getBoundingClientRect();
   const footerTop=document.querySelector("footer").getBoundingClientRect().top;
   const footerContent=document.querySelector(".auth-footer-content").getBoundingClientRect();
   return {headerAbsent:!document.querySelector(".login-header"),
     brandKickerAbsent:!document.querySelector(".login-brand-kicker"),
     hasKickerDot:getComputedStyle(document.querySelector(".login-form-kicker"),"::before").content!=="none",
     footerAligned:Math.abs(footerContent.left-rect.left)<=2&&Math.abs(footerContent.right-rect.right)<=2,
     authAnimation:getComputedStyle(document.querySelector(".form-box")).animationName,
     fieldGap:getComputedStyle(document.querySelector(".form-box .field-stack")).gap,
     orbitCount:document.querySelectorAll(".orbit-icon").length,
     brandStartRadius:getComputedStyle(brand)[innerWidth>=1200?"borderTopLeftRadius":"borderBottomLeftRadius"],
     formStartRadius:getComputedStyle(form)[innerWidth>=1200?"borderTopRightRadius":"borderTopLeftRadius"],
     formBackground:getComputedStyle(form).backgroundColor,
     mainLeft:rect.left,mainRight:rect.right,
     verticallyFits:rect.bottom<=footerTop+1&&footerTop<=innerHeight+1,
     centerDelta:Math.abs((rect.top+rect.bottom)/2-footerTop/2),bottomGap:footerTop-rect.bottom};
  });
  assert.ok(design.headerAbsent&&design.brandKickerAbsent&&!design.hasKickerDot,
   "Login must not show redundant labels or dot at "+width);
  assert.ok(design.footerAligned,"Login footer must align with card edges at "+width);
  assert.equal(design.authAnimation,"vatraAuthReveal","Login must match signup reveal animation");
  assert.equal(design.fieldGap,"19px","Login form must have spacious field gaps");
  if(width>=1200&&design.verticallyFits)
   assert.ok(design.centerDelta<=2,"Login card must be vertically centered at "+width+": "+JSON.stringify(design));
  assert.equal(design.orbitCount,8,"All eight VATRA orbit icons must remain");
  assert.ok(design.mainLeft>=-1&&design.mainRight<=width+1,"Login card leaves viewport at "+width);
  assert.ok(parseFloat(design.brandStartRadius)>=20&&parseFloat(design.formStartRadius)>=20,
   "Login card must preserve rounded corners at "+width);
  assert.equal(design.formBackground,"rgb(255, 255, 255)","Login form must use a clean white background");
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
  if(width===360||width===1440){
   // Verify that the highest orbit icon's tooltip is not lost behind browser chrome.
   await page.addStyleTag({content:".orbit-track,.orbit-face{animation-play-state:paused!important}"});
   const topIndex=await page.locator(".orbit-icon").evaluateAll(nodes=>
    nodes.map((n,i)=>[n.getBoundingClientRect().top,i]).sort((a,b)=>a[0]-b[0])[0][1]);
   const icon=page.locator(".orbit-icon").nth(topIndex);
   await icon.hover({force:true});
   const tooltip=page.locator("#"+await icon.getAttribute("aria-describedby"));
   await tooltip.waitFor({state:"visible"});
   const box=await tooltip.boundingBox();
   assert.ok(box&&box.x>=-1&&box.x+box.width<=width+1&&box.y>=-1&&box.y+box.height<=height+1,
    "Orbit tooltip outside viewport at "+width+": "+JSON.stringify(box));
   const crisp=await tooltip.evaluate(el=>({
    stationary:el.parentElement?.classList.contains("intro-side")===true,
    transform:getComputedStyle(el).transform,
    instances:document.querySelectorAll("#"+el.id).length
   }));
   assert.ok(crisp.stationary&&crisp.transform==="none"&&crisp.instances===1,
    "Tooltip should not be rasterized in rotated layers: "+JSON.stringify(crisp));
   // Pointer-click focus must not leave a stale tooltip after the mouse leaves.
   await icon.click({force:true});
   await page.mouse.move(width-3,height-3);
   await tooltip.waitFor({state:"hidden"});
   assert.equal(await tooltip.evaluate(el=>el.classList.contains("is-visible")),false,
    "Orbit tooltip must close when pointer leaves even after a click");
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
 const modalAnimations=await dialog.evaluate(node=>({
  dialog:getComputedStyle(node).animationName,
  content:getComputedStyle([...node.children].find(el=>!el.hidden)).animationName,
  backdrop:getComputedStyle(node.parentElement).animationName
 }));
 assert.ok(modalAnimations.dialog==="none"&&
  modalAnimations.content.includes("vatraAuthReveal")&&
  modalAnimations.backdrop.includes("vatraLanguageBackdrop"),
  "Language dialog shell must stay still and only its content may rise");
 assert.equal(await page.locator(".language-option").count(),36,"Language directory count");
 await page.locator("#vatra-language-search").fill("English");
 await page.locator(".language-option:not([disabled])").filter({hasText:"English"}).first().click();
 await page.waitForFunction(()=>document.documentElement.lang==="en");
 assert.equal(await page.evaluate(()=>localStorage.getItem("vatra-language")),"en","Language storage");
 assert.ok((await context.cookies()).some(x=>x.name==="vatra-language"&&x.value==="en"),"Persistent language cookie missing");
 const localizedSignup=await context.newPage();
 await localizedSignup.goto(base+"register.html",{waitUntil:"domcontentloaded"});
 await waitReady(localizedSignup);
 await localizedSignup.waitForFunction(()=>document.documentElement.lang==="en");
 assert.deepEqual(await localizedSignup.locator(".signup-brand-highlight").allTextContents(),["#communication","#business","#communities","#photos","#videos","#music","#marketplace","#clips"],
  "The registration hashtags must be translated into English");
 await localizedSignup.close();
 await page.close();
 const reopened=await context.newPage();
 await reopened.goto(base,{waitUntil:"domcontentloaded"});
 await waitReady(reopened);
 assert.equal(await reopened.locator("html").getAttribute("lang"),"en","Language lost after closing tab");
 assert.equal(await reopened.locator(".login-form-kicker").textContent(),"WELCOME BACK TO VATRA",
   "English login overline must be translated");
 assert.equal(await reopened.locator(".login-form-kicker").textContent(),"WELCOME BACK TO VATRA",
   "English login heading must remain translated");
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
 assert.equal(await helps.nth(1).isVisible(),false,"Email help must only show on the second registration step");
 await reopened.locator("#first-name").focus();
 const raised=await reopened.locator("#first-name").evaluate(el=>({
  label:el.closest(".field").querySelector("span:first-child")?.textContent.trim(),
  float:el.closest(".vatra-input-shell").classList.contains("is-floating")||
   el.closest(".vatra-input-shell").matches(":focus-within"),
  hint:el.closest(".vatra-input-shell").querySelectorAll(".vatra-floating-hint").length,
  text:el.closest(".vatra-input-shell").querySelector(".vatra-floating-hint")?.textContent.trim(),
  placeholder:el.placeholder
 }));
 assert.ok(raised.label&&raised.float&&raised.hint===1&&raised.text&&raised.placeholder===" ",
  "Registration must show one floated hint and a separate permanent caption: "+JSON.stringify(raised));
 await reopened.locator("#first-name").fill("VATRA");
 await reopened.locator("#last-name").focus();
 assert.equal(await reopened.locator("#first-name").evaluate(el=>el.closest(".vatra-input-shell").classList.contains("is-floating")),true,
  "Filled hint must remain floated after leaving the field");
 const inputStyle=await reopened.locator("#first-name").evaluate(node=>getComputedStyle(node).fontFamily);
 assert.ok(inputStyle.includes("Onest"),"Registration fields must use Onest");
 console.log("VATRA registration help and restored floating hints: OK");

 // Signup wizard: block incomplete step one, retain values on Back, and check
 // mobile display without contacting Supabase or creating real accounts.
 const wizard=await context.newPage();
 await wizard.setViewportSize({width:390,height:844});
 await wizard.goto(base+"register.html",{waitUntil:"domcontentloaded"});
 await waitReady(wizard);
 assert.equal(await wizard.locator('[data-register-step="2"]').isVisible(),false,"Second step must start hidden");
 await wizard.locator("#register-next").click();
 assert.equal(await wizard.locator('[data-register-step="1"]').isVisible(),true,"Empty identity step must not advance");
 await wizard.locator("#first-name").fill("Тест");
 await wizard.locator("#last-name").fill("Користувач");
 await wizard.evaluate(()=>{
  for(const [id,value] of [["birth-day","12"],["birth-month","05"],["birth-year","2000"]]){
   const node=document.getElementById(id);
   node.value=value;
   node.dispatchEvent(new Event("change",{bubbles:true}));
  }
 });
 await wizard.locator("#register-next").click();
 await wizard.locator('[data-register-step="2"]').waitFor({state:"visible"});
 assert.equal(await wizard.locator(".signup-progress").getAttribute("aria-valuenow"),"2","Progress should announce step two");
 assert.equal(await wizard.locator('[data-register-step="1"]').isVisible(),false,"Identity step should be hidden");
 await wizard.locator(".reg-help-email summary").hover();
 await wizard.waitForFunction(()=>document.querySelector(".reg-help-email")?.open===true);
 await wizard.locator("#email").fill("test@example.com");
 await wizard.locator("#register-back").click();
 assert.equal(await wizard.locator("#first-name").inputValue(),"Тест","First name must survive back navigation");
 assert.equal(await wizard.locator("#last-name").inputValue(),"Користувач","Last name must survive back navigation");
 assert.equal(await wizard.locator("#birth-year").inputValue(),"2000","Date of birth must survive back navigation");
 await wizard.locator("#register-next").click();
 assert.equal(await wizard.locator("#email").inputValue(),"test@example.com","Email must survive step navigation");
 assert.ok((await wizard.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=3,"Mobile signup overflows horizontally");
 await wizard.close();
 console.log("VATRA two-step signup validation, progress, mobile layout and preserved inputs: OK");

 // The footer Sign in CTA mirrors the login page footer Create account link.
 // The registration form and original top text link must stay unchanged.
 for(const [width,height] of [[390,844],[1440,900]]){
  const probe=await context.newPage();
  await probe.setViewportSize({width,height});
  await probe.goto(base+"register.html",{waitUntil:"domcontentloaded"});
  await waitReady(probe);
  const entry=probe.locator(".ui-register-footer-001 .vt-register-footer-signin");
  assert.equal(await entry.count(),1);
  assert.equal(await entry.isVisible(),true,"Footer sign-in link must be visible at "+width);
  assert.equal(new URL(await entry.getAttribute("href"),base).href,base);
  assert.equal(await probe.locator(".signup-login-switch").count(),0,
   "Do not insert a secondary button inside the registration form");
  const styles=await entry.evaluate(el=>({font:getComputedStyle(el).fontFamily,
   border:getComputedStyle(el).borderTopWidth,rounded:getComputedStyle(el).borderRadius}));
  assert.ok(styles.font.includes("Onest")&&styles.border==="0px",
   "Footer sign-in must look like the other plain text footer links");
  const top=await probe.locator(".reg-back-nav .back").evaluate(el=>({
   border:getComputedStyle(el).borderTopWidth,background:getComputedStyle(el).backgroundColor
  }));
  assert.equal(top.border,"0px","Keep the original plain upper Back link");
  await probe.locator("#first-name").fill("Тест");
  await probe.locator("#last-name").fill("Користувач");
  await probe.evaluate(()=>{
   for(const [id,value] of [["birth-day","12"],["birth-month","05"],["birth-year","2000"]]){
    const node=document.getElementById(id);
    node.value=value;
    node.dispatchEvent(new Event("change",{bubbles:true}));
   }
  });
  await probe.locator("#register-next").click();
  assert.equal(await entry.isVisible(),true,"Footer sign-in remains on step two");
  assert.equal(await probe.locator(".signup-form-panel .reg-back-nav").count(),1,
   "Signup back navigation must be a child of the form card, not a header above it");
  assert.equal(await probe.locator(".signup-layout > .reg-back-nav").count(),0);
  await probe.close();
 }
 // Both auth pages must share language-modal geometry and footer spacing.
 for(const [width,height] of [[390,844],[1024,900],[1440,900],[1920,1080]]){
  const samples=[];
  const footerSamples=[];
  for(const route of ["","register.html"]){
   const probe=await context.newPage();
   await probe.setViewportSize({width,height});
   await probe.goto(base+route,{waitUntil:"domcontentloaded"});
   await waitReady(probe);
   const shell=await probe.evaluate(()=>{
    const card=document.querySelector(".split,.reg-main").getBoundingClientRect();
    const footer=document.querySelector(".footer").getBoundingClientRect();
    const container=document.querySelector(".auth-layout").getBoundingClientRect();
    const footerStyle=getComputedStyle(document.querySelector(".footer"));
    const footerNav=document.querySelector(".footer nav");
    const action=footerNav.querySelector("a:last-of-type");
    const range=document.createRange();range.selectNodeContents(action);
    const naturalActionWidth=range.getBoundingClientRect().width;
    const actionWidth=action.getBoundingClientRect().width;
    return {footerBorder:footerStyle.borderTopColor,footerBorderWidth:footerStyle.borderTopWidth,
      footerBackground:footerStyle.backgroundColor,footerHeight:footer.height,
      footerNavGap:getComputedStyle(footerNav).columnGap,footerActionExtra:actionWidth-naturalActionWidth,
      gap:footer.top-card.bottom,top:card.top-container.top,
      sideLeft:card.left,sideRight:innerWidth-card.right,
      centerDelta:Math.abs((card.top+card.bottom)/2-(container.top+container.bottom)/2),
      back:!!document.querySelector(".reg-back-nav .back"),
      overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.ok(shell.overflow<=3&&shell.footerActionExtra<=3,
    "Footer auth link must have natural width and no horizontal overflow at "+width+" "+route+": "+JSON.stringify(shell));
   if(footerSamples.length){
    const previous=footerSamples[0];
    assert.ok(shell.footerBorder===previous.footerBorder&&shell.footerBorderWidth===previous.footerBorderWidth&&
     shell.footerBackground===previous.footerBackground&&Math.abs(shell.footerHeight-previous.footerHeight)<=1&&
     shell.footerNavGap===previous.footerNavGap&&shell.footerActionExtra<=3&&previous.footerActionExtra<=3,
     "Sign-in and signup footer geometry must be identical at "+width+": "+JSON.stringify([previous,shell]));
   }
   assert.ok(Math.abs(shell.sideLeft-shell.sideRight)<=2&&Math.abs(shell.top-shell.gap)<=2,
    "Auth card must have symmetric side and vertical gutters at "+width+" "+route+": "+JSON.stringify(shell));
   assert.ok(shell.gap>=(width<1200?31:39),"Card must keep balanced breathing room above the footer: "+width+" "+route+" "+JSON.stringify(shell));
   footerSamples.push(shell);
   if(width>=1200)assert.ok(shell.centerDelta<=2,
    "Auth card must be centered in the available viewport: "+width+" "+route+" "+JSON.stringify(shell));
   else assert.ok(shell.top>=23&&Math.abs(shell.top-shell.gap)<=2,
    "Stacked auth card must have equal top/bottom clearance, also when it fits the viewport: "+width+" "+route+" "+JSON.stringify(shell));
   if(!route)assert.ok(!shell.back,"Login must not have a redundant Back link");
   else assert.ok(shell.back,"Signup must retain the Back link");
   await probe.locator("[data-language-trigger]").click();
   await probe.locator(".language-dialog").waitFor({state:"visible"});
   const picker=await probe.evaluate(()=>{
    const d=document.querySelector(".language-dialog").getBoundingClientRect();
    const f=document.querySelector(".language-search-field").getBoundingClientRect();
    const s=document.querySelector("#vatra-language-search").getBoundingClientRect();
    const label=document.querySelector(".language-search-shell .vatra-floating-hint");
    const shell=document.querySelector(".language-search-shell");
    return {dialog:d.width,field:f.width,search:s.width,
      captionOffset:label.getBoundingClientRect().y-s.y,
      captionSize:getComputedStyle(label).fontSize,
      uniqueHint:shell.querySelectorAll(".vatra-floating-hint").length,
      placeholder:document.querySelector("#vatra-language-search").placeholder};
   });
   assert.ok(picker.field>=picker.dialog-55&&picker.search>=picker.field-2&&
    picker.uniqueHint===1&&picker.placeholder===" ",
    "Search must have a single floating caption across dialog width "+width+" "+route+": "+JSON.stringify(picker));
   samples.push(picker);
   await probe.close();
  }
  assert.ok(Math.abs(samples[0].search-samples[1].search)<=2&&
   Math.abs(samples[0].captionOffset-samples[1].captionOffset)<=2&&
   samples[0].captionSize===samples[1].captionSize,
   "Language search style differs between auth pages at "+width+": "+JSON.stringify(samples));
  console.log("VATRA auth shell and language picker match "+width+"x"+height+": OK");
 }


 // Offline fallback: original V symbol, top-left placement and readable responsive type.
 for(const [width,height] of [[360,780],[390,844],[768,1024],[1440,900],[1920,1080]]){
  const page=await context.newPage();
  await page.setViewportSize({width,height});
  await page.goto(base+"offline.html",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>document.fonts.ready);
  const metrics=await page.evaluate(()=>{
   const rect=sel=>document.querySelector(sel).getBoundingClientRect();
   const card=rect("main"),logo=rect(".offline-brand img"),icon=rect(".offline-icon");
   const actions=[...document.querySelectorAll(".offline-actions>*")].map(x=>x.getBoundingClientRect().height);
   return {overflow:document.documentElement.scrollWidth-innerWidth,
    cardCenter:Math.abs((card.left+card.right)/2-innerWidth/2),
    logoLeft:logo.left-card.left,logoTop:logo.top-card.top,
    logoRight:logo.right-card.left,iconTop:icon.top-card.top,
    titleSize:parseFloat(getComputedStyle(document.querySelector("h1")).fontSize),
    font:getComputedStyle(document.querySelector("h1")).fontFamily,
    isStandaloneV:document.querySelector(".offline-brand img").getAttribute("src").startsWith("data:image/svg+xml"),
    actionHeights:actions,buttonCount:actions.length};
  });
  assert.ok(metrics.overflow<=3&&metrics.cardCenter<=2,
   "Offline fallback must fit and center horizontally at "+width+": "+JSON.stringify(metrics));
  assert.ok(metrics.isStandaloneV&&metrics.logoLeft>=15&&metrics.logoRight<260&&
   metrics.logoTop<metrics.iconTop,
   "Standalone V must sit at the top-left of the offline card at "+width+": "+JSON.stringify(metrics));
  assert.ok(metrics.font.includes("Onest")&&metrics.titleSize>=27&&
   metrics.buttonCount===2&&metrics.actionHeights.every(h=>h>=48),
   "Offline typography and touch targets must remain legible at "+width+": "+JSON.stringify(metrics));
  await page.close();
 }
 console.log("VATRA offline page responsive V mark and typography: OK");

 // Both back links use the same copy and the same leftward hover animation.
 for(const [route,lang] of [["register.html","uk"],["forgot.html","uk"],["reset.html","uk"],["register.html","en"],["forgot.html","en"],["reset.html","en"]]){
  await context.addCookies([{name:"vatra-language",value:lang,url:base}]);
  const page=await context.newPage();
  await page.addInitScript(value=>localStorage.setItem("vatra-language",value),lang);
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+route,{waitUntil:"domcontentloaded"});
  await waitReady(page);
  await page.waitForFunction(value=>document.documentElement.lang===value,lang);
  const link=page.locator(".back").first();
  const expected=lang==="uk"?"Повернутися до входу":"Back to sign-in";
  assert.equal((await link.textContent()).trim(),expected,route+" return label in "+lang);
  const appearance=await link.evaluate(el=>{const css=getComputedStyle(el);return {transition:css.transitionProperty,animation:css.animationName}});
  assert.ok(appearance.transition.includes("transform"),"Return links need the same hover motion: "+route);
  await link.hover();
  await page.waitForTimeout(220);
  const matrix=await link.evaluate(el=>getComputedStyle(el).transform);
  assert.ok(matrix.startsWith("matrix(")&&parseFloat(matrix.split(",")[4])<=-1.8,
   "Return link must move 2px to the left on hover: "+route+" "+matrix);
  if(route==="register.html"){
    assert.equal(await page.locator(".reg-back-nav").evaluate(el=>getComputedStyle(el).animationName),"none");
    assert.equal(await page.locator(".signup-form-panel .narrow-form").evaluate(el=>getComputedStyle(el).animationName),"vatraAuthReveal");
   }
  else{
   assert.equal(await page.locator(".forgot-panel").evaluate(el=>getComputedStyle(el).animationName),"none");
   assert.equal(await page.locator(".forgot-panel-content").evaluate(el=>getComputedStyle(el).animationName),"vatraAuthReveal");
  }
  await page.close();
 }
 await context.addCookies([{name:"vatra-language",value:"uk",url:base}]);
 console.log("VATRA shared return label and inner-content reveal: OK");

 // A separate responsive sweep for the redesigned registration page.
 for(const [width,height] of [[360,780],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080]]){
  const signup=await context.newPage();
  await signup.setViewportSize({width,height});
  await signup.goto(base+"register.html",{waitUntil:"domcontentloaded"});
  await waitReady(signup);
  const layout=await signup.evaluate(()=>{
   const brand=document.querySelector(".signup-brand").getBoundingClientRect();
   const form=document.querySelector(".signup-form-panel").getBoundingClientRect();
   const main=document.querySelector(".reg-main").getBoundingClientRect();
   const nav=document.querySelector(".reg-back-nav").getBoundingClientRect();
   const back=document.querySelector(".reg-back-nav .back").getBoundingClientRect();
   const footerTop=document.querySelector("footer").getBoundingClientRect().top;
   const footerContent=document.querySelector(".auth-footer-content").getBoundingClientRect();
   return {overflow:document.documentElement.scrollWidth-innerWidth,
    headerAbsent:!document.querySelector(".reg-header"),
    brandKickerAbsent:!document.querySelector(".signup-brand-eyebrow"),
    footerAligned:Math.abs(footerContent.left-brand.left)<=2&&Math.abs(footerContent.right-form.right)<=2,
    authAnimation:getComputedStyle(document.querySelector(".signup-form-panel .narrow-form")).animationName,
     stageAnimation:getComputedStyle(document.querySelector('[data-register-step="1"]')).animationName,
    backText:document.querySelector(".reg-back-nav .back").textContent.trim(),
    backAligned:Math.abs(back.right-document.querySelector(".signup-form-panel .narrow-form").getBoundingClientRect().right)<=2,
    backInside:(()=>{
     const row=document.querySelector(".signup-form-overline").getBoundingClientRect();
     const labels=document.querySelector(".signup-overline-labels").getBoundingClientRect();
     const step=document.querySelector('[data-step-label="1"]').getBoundingClientRect();
     return nav.top>=row.top-2&&nav.bottom<=row.bottom+2&&nav.right<=form.right+1&&
      labels.left<step.right&&(nav.top>=labels.bottom-2||labels.right<=nav.left+2)&&nav.top>=form.top;
    })(),
    fits:main.bottom<=footerTop+1&&footerTop<=innerHeight+1,
    centerDelta:Math.abs((main.top+main.bottom)/2-footerTop/2),bottomGap:footerTop-main.bottom,
    brand:{x:brand.x,y:brand.y,w:brand.width,h:brand.height,bottom:brand.bottom},
    form:{x:form.x,y:form.y,w:form.width,h:form.height}};
  });
  assert.ok(layout.overflow<=3,"Signup overflow at "+width+": "+JSON.stringify(layout));
  assert.ok(layout.brandKickerAbsent&&layout.footerAligned,"Registration footer or brand label is misaligned at "+width+": "+JSON.stringify(layout));
  assert.equal(layout.authAnimation,"vatraAuthReveal","Whole registration form must animate like sign-in");
  const stepAppearance=await signup.locator('[data-step-label="1"]').evaluate(el=>({
   background:getComputedStyle(el).backgroundImage,fontSize:getComputedStyle(el).fontSize
  }));
  assert.ok(stepAppearance.background.includes("linear-gradient")&&stepAppearance.fontSize==="12px",
   "Signup step label should share the progress bar gradient and original size at "+width);
  assert.equal(layout.stageAnimation,"none","Only the full registration form should animate at entry");
  assert.ok(layout.headerAbsent&&layout.backAligned&&layout.backInside,
   "Signup return link must be inside the right registration card at "+width+": "+JSON.stringify(layout));
  assert.ok(layout.backText.length>0,"Signup return link is missing at "+width);
  if(width>=1200&&layout.fits)
   assert.ok(Math.abs((layout.brand.y+layout.brand.h/2)-(layout.form.y+layout.form.h/2))<=2&&layout.centerDelta<=2,
    "Signup split card must be vertically centered at "+width+": "+JSON.stringify(layout));
  if(width>=1200){
   assert.ok(layout.brand.x<layout.form.x&&Math.abs(layout.brand.y-layout.form.y)<=2,
    "Signup columns must align side-by-side at "+width);
  }else{
   assert.ok(layout.brand.bottom<=layout.form.y+2,
    "Signup brand panel must precede the form at "+width);
  }
  assert.equal(await signup.locator("#register-next").isVisible(),true,"Step one CTA not visible at "+width);
  console.log("VATRA signup responsive "+width+"x"+height+": OK");
  await signup.close();
 }




 // Compare auth card widths, column sizes, and whole right-form animation across breakpoints.
 for(const [width,height] of [[360,780],[390,844],[768,1024],[1024,768],[1199,900],[1200,800],[1280,800],[1440,900],[1600,796],[1600,900],[1743,723],[1920,796],[1920,1080]]){
  const snapshots=[];
  for(const route of ["","register.html"]){
   const probe=await context.newPage();
   await probe.setViewportSize({width,height});
   await probe.goto(base+route,{waitUntil:"domcontentloaded"});
   await waitReady(probe);
   const layout=await probe.evaluate(()=>{
    const box=s=>document.querySelector(s).getBoundingClientRect();
    const card=box(".split,.reg-main"),brand=box(".intro-side,.signup-brand");
    const panel=box(".form-side,.signup-form-panel"),footer=box(".auth-footer-content");
    const form=document.querySelector(".form-box,.signup-form-panel .narrow-form");
    return {width:card.width,height:card.height,x:card.x,cardY:card.y,
     brandWidth:brand.width,brandHeight:brand.height,brandY:brand.y,
     panelWidth:panel.width,panelHeight:panel.height,panelY:panel.y,
     panelRight:panel.right,cardRight:card.right,footerWidth:footer.width,
     footerBottom:box(".footer").bottom,viewportHeight:innerHeight,pageScrollHeight:document.documentElement.scrollHeight,
     animation:getComputedStyle(form).animationName,
     duration:getComputedStyle(form).animationDuration,
     stageAnimation:getComputedStyle(document.querySelector(".signup-step")||form).animationName,
     overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.ok(layout.overflow<=3,"Auth horizontal overflow "+width+" "+route);
   assert.equal(layout.animation,"vatraAuthReveal","Full form reveal missing "+width+" "+route);
   assert.equal(layout.duration,"0.3s","Form reveal timing differs "+width+" "+route);
   assert.ok(Math.abs(layout.panelRight-layout.cardRight)<=2,"Form panel misaligned "+width+" "+route);
   snapshots.push(layout);
   await probe.close();
  }
  const [login,signup]=snapshots;
  assert.ok(Math.abs(login.width-signup.width)<=2&&Math.abs(login.x-signup.x)<=2,
   "Sign-in and signup card widths/centering differ at "+width+": "+JSON.stringify(snapshots));
  assert.ok(Math.abs(login.footerWidth-signup.footerWidth)<=2,
   "Sign-in and signup footer widths differ at "+width);
  assert.equal(signup.stageAnimation,"none","Signup fields must not animate separately from header");
  if(width>=1400&&height>=780&&height<=850){
   assert.ok([login,signup].every(v=>v.footerBottom<=v.viewportHeight+2||v.pageScrollHeight>v.viewportHeight+2),
    "Short desktop pages must scroll normally if their content does not fit the viewport: "+JSON.stringify(snapshots));
  }
  if(width>=1200){
   assert.ok(Math.abs(login.cardY-signup.cardY)<=2,
    "Login and signup cards should share the same vertical center at "+width);
   assert.ok(Math.abs(login.height-signup.height)<=5,
    "Sign-in and signup card heights differ at "+width+": "+JSON.stringify(snapshots));
   assert.ok(Math.abs(login.brandWidth-signup.brandWidth)<=2&&
    Math.abs(login.panelWidth-signup.panelWidth)<=2,
    "Auth columns differ at "+width+": "+JSON.stringify(snapshots));
   assert.ok(Math.abs(signup.brandHeight-signup.panelHeight)<=2,
    "Signup panel heights differ at "+width);
  }else if(width<1200){
   assert.ok(login.panelY<login.brandY,"Sign-in should stack form first "+width);
   assert.ok(signup.brandY<signup.panelY,"Signup should stack branding first "+width);
  }
  console.log("VATRA auth card size & whole-form reveal "+width+"x"+height+": OK");
 }
 const stepTwo=await context.newPage();
 await stepTwo.setViewportSize({width:1440,height:900});
 await stepTwo.goto(base+"register.html",{waitUntil:"domcontentloaded"});
 await waitReady(stepTwo);
 await stepTwo.locator("#first-name").fill("Тест");
 await stepTwo.locator("#last-name").fill("Користувач");
 await stepTwo.evaluate(()=>{
  for(const [id,value] of [["birth-day","12"],["birth-month","05"],["birth-year","2000"]]){
   const control=document.getElementById(id);control.value=value;
   control.dispatchEvent(new Event("change",{bubbles:true}));
  }
 });
 await stepTwo.evaluate(()=>{
  window.__vatraSignupRevealCount=0;
  const content=document.querySelector(".signup-form-panel .narrow-form");
  content.addEventListener("animationstart",e=>{
   if(e.target===content&&e.animationName==="vatraAuthReveal")window.__vatraSignupRevealCount++;
  });
 });
 await stepTwo.locator("#register-next").click();
 await stepTwo.locator('[data-register-step="2"]').waitFor({state:"visible"});
 await stepTwo.waitForFunction(()=>window.__vatraSignupRevealCount>=1);
 const secondStageMotion=await stepTwo.evaluate(()=>{
  const content=document.querySelector(".signup-form-panel .narrow-form");
  return {content:getComputedStyle(content).animationName,
   shell:getComputedStyle(document.querySelector(".signup-form-panel")).animationName,
   heading:getComputedStyle(document.querySelector('[data-step-heading="2"]')).animationName,
   fields:getComputedStyle(document.querySelector('[data-register-step="2"]')).animationName,
   logoPanel:getComputedStyle(document.querySelector(".signup-brand")).animationName,
   includesTitle:content.contains(document.querySelector('[data-step-heading="2"]')),
   includesProgress:content.contains(document.querySelector(".signup-progress")),
   includesFields:content.contains(document.querySelector('[data-register-step="2"]'))};
 });
 assert.ok(secondStageMotion.content==="vatraAuthReveal"&&
  ["shell","heading","fields","logoPanel"].every(key=>secondStageMotion[key]==="none")&&
  secondStageMotion.includesTitle&&secondStageMotion.includesProgress&&secondStageMotion.includesFields,
  "On signup step two, headline, step indicator, progress and fields must rise together: "+JSON.stringify(secondStageMotion));
 await stepTwo.locator("#register-back").click();
 await stepTwo.waitForFunction(()=>window.__vatraSignupRevealCount>=2);
 assert.equal(await stepTwo.locator('[data-register-step="1"]').isVisible(),true);
 await stepTwo.locator("#register-next").click();
 await stepTwo.waitForFunction(()=>window.__vatraSignupRevealCount>=3);
 const stepTwoGeometry=await stepTwo.evaluate(()=>{
  const r=s=>document.querySelector(s).getBoundingClientRect();
  const card=r(".reg-main"),panel=r(".signup-form-panel"),active=r('[data-register-step="2"]');
  return {overflow:document.documentElement.scrollWidth-innerWidth,
   activeWidth:active.width,panelWidth:panel.width,panelBottom:panel.bottom,cardBottom:card.bottom};
 });
 assert.ok(stepTwoGeometry.overflow<=3&&stepTwoGeometry.activeWidth<=stepTwoGeometry.panelWidth&&
  stepTwoGeometry.panelBottom<=stepTwoGeometry.cardBottom+2,
  "Desktop second registration step must fit inside the resized card: "+JSON.stringify(stepTwoGeometry));
 await stepTwo.close();
 console.log("VATRA resized signup step 2 desktop: OK");




 // Floating hints must animate on focus/value, stay clear of errors, and
 // validation messages still expire independently of the field contents.
 for(const [route,fieldId,action] of [["","#email","#login-form button[type='submit']"],
  ["register.html","#first-name","#register-next"],
  ["forgot.html","#email","#forgot-form button[type='submit']"]]){
  const probe=await context.newPage();
  await probe.setViewportSize({width:1440,height:900});
  await probe.goto(base+route,{waitUntil:"domcontentloaded"});
  await waitReady(probe);
  const field=probe.locator(fieldId);
  const metrics=()=>field.evaluate(el=>{
   const shell=el.closest(".vatra-input-shell");
   const hint=shell?.querySelector(".vatra-floating-hint");
   const error=el.closest(".field").querySelector(".field-error");
   const ir=el.getBoundingClientRect(),hr=hint?.getBoundingClientRect();
   const er=error?.getBoundingClientRect();
   return {placeholder:el.placeholder,
    floating:shell?.classList.contains("is-floating")||shell?.matches(":focus-within"),
    hintCount:shell?.querySelectorAll(".vatra-floating-hint").length,
    hintText:hint?.textContent.trim(),hintTop:hr?.top,hintBottom:hr?.bottom,
    inputTop:ir.top,inputBottom:ir.bottom,inputMid:(ir.top+ir.bottom)/2,
    errorTop:er?.top,errorText:error?.textContent.trim(),
    invalid:el.getAttribute("aria-invalid")};
  });
  const empty=await metrics();
  assert.ok(empty.hintText&&empty.hintCount===1&&!empty.floating&&empty.placeholder===" "&&
    Math.abs((empty.hintTop+empty.hintBottom)/2-empty.inputMid)<=3,
    "Unfocused empty hint must be centered: "+route+" "+JSON.stringify(empty));
  await field.focus();
  await probe.waitForTimeout(260); // Wait until the 180ms floating-hint transition finishes.
  const focused=await metrics();
  assert.ok(focused.floating&&focused.hintBottom<=focused.inputTop+24,
    "On focus the hint must rise above the text cursor: "+route+" "+JSON.stringify(focused));
  await probe.locator(action).click();
  await probe.waitForTimeout(240);
  const error=await metrics();
  assert.ok(error.invalid==="true"&&error.errorText&&
   error.hintCount===1&&error.placeholder===" "&&
   (error.floating?error.hintBottom<=error.inputTop+24:
    Math.abs((error.hintTop+error.hintBottom)/2-error.inputMid)<=3)&&
   error.errorTop>=error.inputBottom+2,
   "Validation must not overlap a floating hint or the error message: "+route+" "+JSON.stringify(error));
  await probe.waitForTimeout(5800);
  assert.equal(await field.getAttribute("aria-invalid"),null,
   "Validation error must expire without typing: "+route);
  assert.equal(await probe.locator(".field-error").count()>0,false,
   "All errors in that empty form must expire: "+route);
  await probe.locator(action).click();
  assert.equal(await field.getAttribute("aria-invalid"),"true",
   "An unchanged empty field must still fail on next submit: "+route);
  await field.fill("edited");
  assert.equal(await field.getAttribute("aria-invalid"),null,
   "Editing must clear field errors immediately: "+route);
  await field.blur();
  assert.equal(await field.evaluate(el=>el.closest(".vatra-input-shell").classList.contains("is-floating")),true,
   "The floating hint must remain up when a field has a value: "+route);
  await field.fill("");
  await field.blur();
  await probe.waitForTimeout(240);
  const cleared=await metrics();
  assert.ok(!cleared.floating&&Math.abs((cleared.hintTop+cleared.hintBottom)/2-cleared.inputMid)<=3,
   "Cleared field must return its empty hint to the center after blur: "+route+" "+JSON.stringify(cleared));
  await probe.close();
 }
 // Consent error must appear in a separate grid row aligned with the label,
 // not as a fragment within the policy links.
 for(const [width,language] of [[1280,"en"],[390,"uk"]]){
  await context.addCookies([{name:"vatra-language",value:language,url:base}]);
  const consentProbe=await context.newPage();
  await consentProbe.setViewportSize({width,height:900});
  await consentProbe.goto(base+"register.html",{waitUntil:"domcontentloaded"});
  await waitReady(consentProbe);
  await consentProbe.waitForFunction(lang=>document.documentElement.lang===lang,language);
  await consentProbe.locator("#first-name").fill("Тест");
  await consentProbe.locator("#last-name").fill("Користувач");
  await consentProbe.evaluate(()=>{
   for(const [id,value] of [["birth-day","01"],["birth-month","01"],["birth-year","2000"]]){
    const node=document.getElementById(id);node.value=value;
    node.dispatchEvent(new Event("change",{bubbles:true}));
   }
  });
  await consentProbe.locator("#register-next").click();
  await consentProbe.locator("#email").fill("demo@example.test");
  await consentProbe.locator("#password").fill("VeryStrong@12345");
  await consentProbe.locator("#password-confirm").fill("VeryStrong@12345");
  await consentProbe.locator('#signup-form button[type="submit"]').click();
  const geometry=await consentProbe.locator(".check-terms").evaluate(label=>{
   const copy=label.querySelector(":scope > span");
   const checkbox=label.querySelector(":scope > input");
   const error=label.querySelector(":scope > .field-error");
   if(!error)return null;
   const cr=checkbox.getBoundingClientRect(),sr=copy.getBoundingClientRect(),er=error.getBoundingClientRect();
   const gap=parseFloat(getComputedStyle(error).columnGap);
   const iconWidth=parseFloat(getComputedStyle(error,"::before").width);
   return {inside:error.parentElement===label,checkboxX:cr.left,iconX:er.left,
    copyX:sr.left,messageX:er.left+gap+iconWidth,below:er.top-sr.bottom,
    errorRight:er.right,viewport:innerWidth,message:error.textContent.trim()};
  });
  assert.ok(geometry?.inside&&Math.abs(geometry.checkboxX-geometry.iconX)<3&&
   Math.abs(geometry.copyX-geometry.messageX)<3&&geometry.below>=0&&
   geometry.errorRight<=geometry.viewport+1,
   "Consent error icon and text must align at "+width+" "+language+": "+JSON.stringify(geometry));
  await consentProbe.close();
 }
 await context.addCookies([{name:"vatra-language",value:"en",url:base}]);
 console.log("VATRA floating hints, error spacing, and temporary validation: OK");
 // Each page uses the same language modal with a centered SVG X.
 for(const route of ["","register.html","terms.html"]){
  const probe=await context.newPage();
  await probe.setViewportSize({width:390,height:844});
  await probe.goto(base+route,{waitUntil:"domcontentloaded"});
  if(route!=="terms.html")await waitReady(probe);
  await probe.locator("[data-language-trigger]").click();
  const search=probe.locator("#vatra-language-search");
  assert.equal(await probe.locator(".language-search-shell .vatra-floating-hint").count(),1,
   "Language search must not show duplicate captions");
  await search.fill("abcdef-not-a-language");
  await probe.waitForTimeout(240);
  const hintGeometry=await probe.evaluate(()=>{
   const field=document.querySelector("#vatra-language-search");
   const shell=document.querySelector(".language-search-shell");
   const hint=shell.querySelector(".vatra-floating-hint");
   const ir=field.getBoundingClientRect(),hr=hint.getBoundingClientRect();
   return {raised:shell.classList.contains("is-floating"),hintBottom:hr.bottom,fieldTop:ir.top};
  });
  assert.ok(hintGeometry.raised&&hintGeometry.hintBottom<=hintGeometry.fieldTop+25,
   "Search caption must float above typed text: "+JSON.stringify(hintGeometry));
  const clear=probe.locator(".language-search-clear");
  await clear.waitFor({state:"visible"});
  const pos=await probe.evaluate(()=>{
   const input=document.querySelector("#vatra-language-search").getBoundingClientRect();
   const button=document.querySelector(".language-search-clear").getBoundingClientRect();
   const glyph=document.querySelector(".language-search-clear svg").getBoundingClientRect();
   return {dy:Math.abs(button.top+button.height/2-input.top-input.height/2),
    glyphDy:Math.abs(glyph.top+glyph.height/2-button.top-button.height/2),
    rightGap:input.right-button.right,accessible:document.querySelector(".language-search-clear").getAttribute("aria-label")};
  });
  assert.ok(pos.dy<=1.5&&pos.glyphDy<=1.5&&pos.rightGap>=0&&pos.rightGap<=28&&pos.accessible,
   "Search clear X must be centered and accessible: "+route+" "+JSON.stringify(pos));
  await clear.click();
  assert.equal(await search.inputValue(),"","Clearing search must remove input text "+route);
  assert.equal(await probe.locator(".language-option:not([hidden])").count(),36,
   "Clearing search must restore all languages "+route);
  assert.equal(await clear.isVisible(),false,"Clear button hides when search empty "+route);
  await probe.close();
 }
 console.log("VATRA cross alignment and clearing across auth/legal pages: OK");
 // account.html redirects unauthenticated visitors to sign-in; its footer
 // structure is covered by the static checks instead of the guest browser run.
 for(const route of ["terms.html","terms.html","privacy.html","cookies.html",
  "forgot.html","reset.html","404.html"]){
  const probe=await context.newPage();
  await probe.setViewportSize({width:390,height:844});
  await probe.goto(base+route,{waitUntil:"load"});
  await probe.locator(".footer nav>a").first().waitFor({state:"attached",timeout:10000});
  const links=await probe.locator(".footer nav>a").evaluateAll(nodes=>nodes.map(n=>({
   href:new URL(n.href,document.baseURI).pathname,text:n.textContent.trim()
  })));
  assert.equal(links.filter(x=>x.href==="/VATRA/register").length,1,
   "Create account CTA missing from "+route+": "+JSON.stringify(links));
  assert.equal(links.filter(x=>x.href==="/VATRA/").length,1,
   "Sign-in CTA missing from "+route+": "+JSON.stringify(links));
  if(["terms.html","terms.html","privacy.html","cookies.html"].includes(route))
   assert.equal(links.length,2,"Legal page footer must not repeat its document tabs");
  await probe.close();
 }
 // Footers must render navigation links uniformly — no boxed sign-in button.
 for(const route of ["","register.html","forgot.html","reset.html"]){
  const page=await context.newPage();
  await page.goto(base+route,{waitUntil:"domcontentloaded"});
  await waitReady(page);
  const looks=await page.locator(".footer nav>a").evaluateAll(nodes=>nodes.map(node=>{
   const css=getComputedStyle(node);
   return {href:new URL(node.href).pathname,border:css.borderTopWidth,
    background:css.backgroundColor,font:css.fontFamily,size:css.fontSize};
  }));
  assert.ok(looks.every(x=>x.font.includes("Onest")&&x.border==="0px"),
   "Footer links need consistent unboxed typography: "+route+" "+JSON.stringify(looks));
  await page.close();
 }
 // The 404 title must be consistent in the HTML fallback and both languages,
 // including an unknown URL served as the root 404 document.
 const titleContext=await browser.newContext({locale:"uk-UA",serviceWorkers:"block"});
 await titleContext.route("**/assets/js/host.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
 }));
 for(const [language,expected] of [["uk","404 Сторінку не знайдено · VATRA"],
  ["en","404 Page not found · VATRA"]]){
  // VATRA's language cookie is authoritative over localStorage.
  await titleContext.addCookies([{name:"vatra-language",value:language,url:base}]);
  const tab=await titleContext.newPage();
  await tab.addInitScript(lang=>localStorage.setItem("vatra-language",lang),language);
  await tab.goto(base+"404.html",{waitUntil:"load"});
  await tab.waitForFunction(lang=>document.documentElement.lang===lang,language);
  assert.equal(await tab.title(),expected,
   "404 tab title must use the same middle dot and omit punctuation after 404: "+language);
  await tab.close();
 }
 await titleContext.close();
 // Page-to-page footer typography: legal links and language controls use
 // one readable Onest scale, while copyright remains visually secondary.
 let baselineFooterAppearance=null;
 for(const route of ["","register.html","forgot.html","reset.html","terms.html","privacy.html","cookies.html","404.html"]){
  const probe=await context.newPage();
  await probe.setViewportSize({width:390,height:844});
  await probe.goto(base+route,{waitUntil:"domcontentloaded"});
  if(["","register.html","forgot.html","reset.html"].includes(route))
   await waitReady(probe);
  else await probe.evaluate(()=>document.fonts.ready);
  const footerTypography=await probe.evaluate(()=>{
   const copyright=document.querySelector(".auth-footer-content>span");
   const nav=document.querySelector(".footer nav");
   const link=nav.querySelector("a");
   const language=nav.querySelector(".language-trigger");
   const info=e=>({font:getComputedStyle(e).fontFamily,size:parseFloat(getComputedStyle(e).fontSize)});
   const footer=document.querySelector(".footer");
   const fs=getComputedStyle(footer),ns=getComputedStyle(nav),ls=getComputedStyle(link);
   return {copy:info(copyright),nav:info(nav),link:info(link),language:info(language),
    style:{minHeight:fs.minHeight,paddingTop:fs.paddingTop,paddingBottom:fs.paddingBottom,
     borderTop:fs.borderTop,background:fs.backgroundColor,color:fs.color,
     navGap:ns.gap,linkMinHeight:ls.minHeight},
    overflow:document.documentElement.scrollWidth-innerWidth};
  });
  assert.ok(footerTypography.overflow<=3&&
   Object.values(footerTypography).filter(x=>x&&x.font).every(x=>x.font.includes("Onest"))&&
   footerTypography.copy.size===13&&footerTypography.nav.size===13&&
   footerTypography.link.size===13&&footerTypography.language.size===13,
   "Shared footer typography mismatch on "+route+": "+JSON.stringify(footerTypography));
  assert.equal(footerTypography.style.linkMinHeight,"40px",
   "Footer navigation touch area should be uniform across pages: "+route);
  if(!baselineFooterAppearance)baselineFooterAppearance=footerTypography.style;
  else assert.deepEqual(footerTypography.style,baselineFooterAppearance,
   "Footer border, background, spacing, navigation and link height must match across page types: "+route);
  if(route==="404.html")
   assert.equal(await probe.locator('.footer nav a[href$="/cookies"]').count(),1,
    "The 404 page must link to the same three public documents");
  if(["terms.html","privacy.html","cookies.html"].includes(route)){
   const legalMotion=await probe.locator(".policy-header").evaluate(el=>getComputedStyle(el).animationName);
    const shellMotion=await probe.locator(".policy-main").evaluate(el=>getComputedStyle(el).animationName);
    assert.ok(legalMotion==="vatraAuthReveal"&&shellMotion==="none");
  }
  await probe.close();
 }
 console.log("VATRA guest footer links and account creation labels: OK");


 // Compare actual typography, button color and brand logo motion on auth pages.
 for(const [width,height] of [[390,844],[1440,900],[1920,1080]]){
  const settings=[];
  for(const route of ["","register.html"]){
   const probe=await context.newPage();
   await probe.setViewportSize({width,height});
   await probe.goto(base+route,{waitUntil:"domcontentloaded"});
   await waitReady(probe);
   const v=await probe.evaluate(()=>{
    const login=!!document.querySelector(".site");
    const style=sel=>{
     const e=document.querySelector(sel),s=getComputedStyle(e),b=e.getBoundingClientRect();
     return {fontSize:s.fontSize,color:s.color,fontWeight:s.fontWeight,lineHeight:s.lineHeight,
       letterSpacing:s.letterSpacing,width:b.width,animation:s.animationName,duration:s.animationDuration};
    };
    return {kicker:style(login?".login-form-kicker":".signup-form-kicker"),
      heading:style(login?".form-box h2":".signup-step-heading h1"),
      desc:style(login?".login-description":".signup-step-heading .subtitle"),
      logo:style(login?".intro-symbol":".signup-brand-symbol"),
      copyAlign:getComputedStyle(document.querySelector(login?".intro-copy":".signup-brand-copy")).textAlign,
      svg:document.querySelector(login?".intro-symbol":".signup-brand-symbol").getAttribute("src"),
      primary:getComputedStyle(document.querySelector(login?".form-box .action.primary":".signup-form-panel .action.primary")).backgroundImage};
   });
   assert.equal(v.copyAlign,"center","Promo copy must be centered "+route+" "+width);
   settings.push(v);
   await probe.close();
  }
  const [login,signup]=settings;
  for(const key of ["kicker","heading","desc"])
   for(const prop of ["fontSize","color","fontWeight","lineHeight","letterSpacing"])
    assert.equal(login[key][prop],signup[key][prop],
     "Typography mismatch "+width+" "+key+"."+prop+": "+JSON.stringify(settings));
  assert.equal(login.primary,signup.primary,"CTA gradients must match "+width);
  assert.equal(login.svg,signup.svg,"Both logos must use same SVG asset "+width);
  assert.equal(login.logo.animation,signup.logo.animation,"Logo animation differs "+width);
  assert.equal(login.logo.duration,signup.logo.duration,"Logo motion duration differs "+width);
  if(width>=1200)
   assert.ok(Math.abs(login.logo.width-signup.logo.width)<=1,
    "Brand symbol widths differ "+width+": "+JSON.stringify(settings));
  console.log("VATRA matching typography & brand logo "+width+"x"+height+": OK");
 }
 // Regression coverage for all four legal pages and supporting auth pages,
 // checking actual browser geometry instead of just matching CSS strings.
 for(const [width,height] of [[360,780],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080]]){
  for(const route of ["terms.html","terms.html","privacy.html","cookies.html"]){
   const docs=await context.newPage();
   await docs.setViewportSize({width,height});
   await docs.goto(base+route,{waitUntil:"load"});
   const sizes=await docs.evaluate(()=>{
    const box=s=>document.querySelector(s)?.getBoundingClientRect();
    const main=box(".policy-main"),footer=box(".auth-footer-content"),top=box(".policy-top-inner");
    const logo=box(".policy-top .header-logo"),actions=box(".policy-top-actions");
    const header=box(".policy-top"),pageFoot=box(".footer");
    return {overflow:document.documentElement.scrollWidth-innerWidth,
      exists:!!(main&&footer&&top&&logo&&actions&&header&&pageFoot),
      mainLeft:main?.left,mainRight:main?.right,
      footLeft:footer?.left,footRight:footer?.right,
      topLeft:top?.left,topRight:top?.right,
      logoRight:logo?.right,actionLeft:actions?.left,actionRight:actions?.right,
      logoMid:logo?(logo.top+logo.bottom)/2:0,
      actionMid:actions?(actions.top+actions.bottom)/2:0,
      headerHeight:header?.height,footerWidth:pageFoot?.width,
      policyPaddingTop:parseFloat(getComputedStyle(document.querySelector(".policy-main")).paddingTop),
      policyPaddingBottom:parseFloat(getComputedStyle(document.querySelector(".policy-main")).paddingBottom),
      visibleDocumentGap:pageFoot?.top-document.querySelector(".policy-copy").getBoundingClientRect().bottom,
      tabCount:document.querySelectorAll(".policy-tabs a").length,
      linksCount:document.querySelectorAll(".footer nav a").length};
   });
   assert.ok(sizes.exists,"Policy header or footer missing at "+width+" "+route);
   const expectedGap=width<1200?32:40;
   assert.ok(Math.abs(sizes.policyPaddingTop-expectedGap)<1&&
    Math.abs(sizes.policyPaddingBottom-expectedGap)<1&&
    sizes.visibleDocumentGap>=expectedGap-1,
    "VATRA document spacing must match the shared auth gutters at "+width+" "+route+": "+JSON.stringify(sizes));
   assert.ok(sizes.overflow<=3,"Document horizontal overflow at "+width+" "+route+": "+JSON.stringify(sizes));
   assert.ok(Math.abs(sizes.mainLeft-sizes.footLeft)<=2&&Math.abs(sizes.mainRight-sizes.footRight)<=2,
    "Document footer is not aligned with content at "+width+" "+route+": "+JSON.stringify(sizes));
   assert.ok(Math.abs(sizes.mainLeft-sizes.topLeft)<=2&&Math.abs(sizes.mainRight-sizes.topRight)<=2,
    "Document header and content do not align at "+width+" "+route+": "+JSON.stringify(sizes));
   assert.ok(sizes.logoRight<=sizes.actionLeft+2&&Math.abs(sizes.logoMid-sizes.actionMid)<=3,
    "Document logo and login/signup controls must appear in one row at "+width+" "+route);
   assert.ok(sizes.actionRight<=width+1&&sizes.headerHeight<=110,
    "Document header wraps or extends beyond viewport at "+width+" "+route);
   assert.equal(sizes.tabCount,3,"Only the three actual legal documents belong in navigation at "+width+" "+route);
   assert.equal(sizes.linksCount,2,"Document footer must only show Sign in and Create account at "+width+" "+route);
   await docs.close();
  }
  console.log("VATRA document header/content/footer geometry "+width+"x"+height+": OK");
 }
 for(const route of ["forgot.html","reset.html","404.html"]){
  const other=await context.newPage();
  await other.setViewportSize({width:390,height:844});
  await other.goto(base+route,{waitUntil:"load"});
  const footer=await other.locator(".auth-footer-content").evaluate(node=>{
   const rect=node.getBoundingClientRect();
   return {left:rect.left,right:rect.right,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  assert.ok(footer.left>=0&&footer.right<=footer.viewport+1&&footer.scrollWidth<=footer.viewport+3,
   "Supporting page footer not constrained to viewport: "+route);
  await other.close();
 }

 // Recovery design and typography across language, viewport and OTP step.
 for(const [width,height,language] of [[390,844,"uk"],[1440,900,"en"]]){
  await context.addCookies([{name:"vatra-language",value:language,url:base}]);
  const recoveryPage=await context.newPage();
  await recoveryPage.setViewportSize({width,height});
  await recoveryPage.goto(base+"forgot.html",{waitUntil:"domcontentloaded"});
  await waitReady(recoveryPage);
  await recoveryPage.waitForFunction(lang=>document.documentElement.lang===lang,language);
  // Compare final positions, not the brief translated Y coordinates of the
  // entry animation. Keep the reveal itself tested separately below.
  await recoveryPage.locator(".forgot-panel").evaluate(panel=>
   Promise.all(panel.getAnimations().map(animation=>animation.finished.catch(()=>null))));
  const metrics=await recoveryPage.evaluate(()=>{
   const panel=document.querySelector(".forgot-panel").getBoundingClientRect();
   const headline=document.querySelector("#forgot-title").getBoundingClientRect();
   const form=document.querySelector("#forgot-form").getBoundingClientRect();
   const style=getComputedStyle(document.querySelector("#forgot-title"));
   const font=getComputedStyle(document.querySelector("#email"));
   const header=document.querySelector(".forgot-panel-header").getBoundingClientRect();
   const intro=document.querySelector(".forgot-intro").getBoundingClientRect();
   const panelCenter=panel.left+panel.width/2;
   const main=document.querySelector(".center-main").getBoundingClientRect();
   return {panelX:panel.x,panelRight:panel.right,panelWidth:panel.width,
    topGap:panel.top-main.top,bottomGap:main.bottom-panel.bottom,
    sideLeft:panel.left,sideRight:innerWidth-panel.right,
    headlineX:headline.x,formX:form.x,overflow:document.documentElement.scrollWidth-innerWidth,
    formWidth:form.width,headerWidth:header.width,introWidth:intro.width,
    centered:Math.abs(form.left+form.width/2-panelCenter),
    fontFamily:style.fontFamily,fontSize:parseFloat(style.fontSize),inputFont:font.fontFamily};
  });
  assert.ok(metrics.panelX>=0&&metrics.panelRight<=width+1&&metrics.overflow<=2&&
   Math.abs(metrics.sideLeft-metrics.sideRight)<=2&&Math.abs(metrics.topGap-metrics.bottomGap)<=6&&
   Math.abs(metrics.headlineX-metrics.formX)<2&&
   metrics.fontFamily.includes("Onest")&&metrics.inputFont.includes("Onest")&&
   metrics.fontSize>=29&&metrics.fontSize<=41,
   "Recovery panel must be centered, readable and aligned at "+width+" "+language+": "+JSON.stringify(metrics));
  assert.ok(metrics.formWidth<=520.5&&Math.abs(metrics.centered)<=1.5&&
   Math.abs(metrics.formWidth-metrics.headerWidth)<=1.5&&
   Math.abs(metrics.formWidth-metrics.introWidth)<=1.5&&
   (width<768||Math.abs(metrics.formWidth-520)<=1),
   "Recovery form must use the same centered 520px content column as login and registration: "+JSON.stringify(metrics));
  const forgotCaption=await recoveryPage.locator('#forgot-form .vt-forgot-inline-01');
  // CSS-clipped captions remain accessible; Playwright's visibility heuristic
  // may still count their tiny layout rectangle as visible.
  const hiddenCaption=await forgotCaption.evaluate(el=>({
   style:getComputedStyle(el).clipPath,
   label:el.textContent.trim(),
   font:getComputedStyle(el).fontFamily
  }));
  assert.equal(hiddenCaption.style,"inset(50%)");
  assert.ok(hiddenCaption.label.length>0,"Accessible email label must remain in the DOM");
  // One reveal belongs to the full card, including the top back control,
  // V mark, heading, fields and explanatory note — not to separate fragments.
  const motion=await recoveryPage.evaluate(()=>{
   const panel=document.querySelector(".forgot-panel"),intro=document.querySelector(".forgot-intro"),
    header=document.querySelector(".forgot-panel-header"),form=document.querySelector("#forgot-form"),
    note=document.querySelector("#recovery-note"),back=document.querySelector(".forgot-panel-header .back"),
    brand=document.querySelector(".forgot-panel-brand");
   const style=node=>getComputedStyle(node);
   return {card:style(panel).animationName,content:style(document.querySelector(".forgot-panel-content")).animationName,intro:style(intro).animationName,
    form:style(form).animationName,note:style(note).animationName,
    header:style(header).animationName,
    back:style(back).fontFamily,backSize:parseFloat(style(back).fontSize),
    brandBorder:style(brand).borderStyle,
    cardFont:style(panel).fontFamily};
  });
  assert.ok(motion.card==="none"&&motion.content.includes("vatraAuthReveal")&&
   ["intro","form","note","header"].every(part=>motion[part]==="none")&&
   motion.back.includes("Onest")&&motion.backSize===13&&motion.brandBorder==="none",
   "Recovery must animate the entire card once, including visible navigation: "+JSON.stringify(motion));
  const registrationBack=await (async()=>{
   const probe=await context.newPage();
   await probe.goto(base+"register.html",{waitUntil:"domcontentloaded"});
   await waitReady(probe);
   const result=await probe.locator(".reg-back-nav .back").evaluate(node=>{
    const s=getComputedStyle(node);
    return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,
     background:s.backgroundColor,border:s.borderTopWidth,color:s.color};
   });
   await probe.close();
   return result;
  })();
  const recoveryBack=await recoveryPage.locator(".forgot-panel-header .back").evaluate(node=>{
   const s=getComputedStyle(node);
   return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,
    background:s.backgroundColor,border:s.borderTopWidth,color:s.color};
  });
  assert.deepEqual(recoveryBack,registrationBack,
   "Return-to-login must look identical in registration and password recovery");
  const alignment=await recoveryPage.evaluate(()=>{
   const header=document.querySelector(".forgot-panel-header").getBoundingClientRect();
   const back=document.querySelector(".forgot-panel-header .back").getBoundingClientRect();
   const mark=document.querySelector(".forgot-panel-brand").getBoundingClientRect();
   const visibleLogos=[...document.querySelectorAll(".ui-forgot-main-001 img")];
   return {backRight:back.right,brandLeft:mark.left,brandRight:mark.right,
    rowMid:(header.top+header.bottom)/2,backMid:(back.top+back.bottom)/2,
    brandMid:(mark.top+mark.bottom)/2,logos:visibleLogos.length,
    symbol:visibleLogos[0]?.getAttribute("src")};
  });
  assert.ok(alignment.logos===1&&alignment.symbol==="assets/logo/vatra-symbol.svg"&&
   alignment.brandRight<alignment.backRight&&alignment.brandRight<=width+1&&
   Math.abs(alignment.backMid-alignment.brandMid)<=2,
   "Small V logo must be inside the recovery card, opposite the back link: "+JSON.stringify(alignment));
  assert.equal(await recoveryPage.locator(".vt-forgot-floating-hint-01").textContent(),
   language==="uk"?"Електронна пошта":"Email address");
  assert.equal(await recoveryPage.locator(".forgot-kicker").count(),0,
   "The extra recovery eyebrow must be absent in both languages");
  const branding=await recoveryPage.locator(".forgot-panel-brand img").evaluate(el=>{
   const img=el.getBoundingClientRect();
   return {width:img.width,height:img.height,font:getComputedStyle(document.querySelector("#forgot-title")).fontFamily};
  });
  assert.ok(branding.width>=38&&branding.font.includes("Onest"),
   "Brand V should be more prominent while the heading keeps Onest: "+JSON.stringify(branding));
  await recoveryPage.evaluate(()=>{
   document.querySelector("#forgot-form").hidden=true;
   document.querySelector("#recovery-note").hidden=true;
   document.querySelector("#recovery-step").hidden=false;
  });
  assert.equal(await recoveryPage.locator(".forgot-intro").isVisible(),false,
   "Entering the OTP stage must replace the intro instead of stacking both headings");
  const stageMotion=await recoveryPage.locator(".forgot-panel-content").evaluate(el=>getComputedStyle(el).animationName);
  const otpFragment=await recoveryPage.locator("#recovery-step > :not([hidden])").first().evaluate(el=>getComputedStyle(el).animationName);
  assert.equal(stageMotion,"vatraAuthReveal","Entire OTP content, including logo, must share the reveal animation");
  assert.equal(otpFragment,"none","OTP heading and fields must not animate independently");
  const codeField=recoveryPage.locator("#recovery-token");
  const codeHint=recoveryPage.locator(".vt-forgot-floating-hint-02");
  assert.equal(await codeField.getAttribute("placeholder")," ");
  assert.equal(await codeHint.textContent(),language==="uk"?"Введіть код":"Enter code");
  await codeField.focus();
  await recoveryPage.waitForTimeout(240);
  const codeStyles=await codeField.evaluate(el=>{
   const shell=el.closest(".vatra-input-shell");
   const hint=shell.querySelector(".vatra-floating-hint");
   const input=el.getBoundingClientRect(),tip=hint.getBoundingClientRect();
   const style=getComputedStyle(el),hintStyle=getComputedStyle(hint);
   return {floating:shell.classList.contains("is-floating")||shell.matches(":focus-within"),font:style.fontFamily,
    inputSize:parseFloat(style.fontSize),hintFont:hintStyle.fontFamily,
    hintSize:parseFloat(hintStyle.fontSize),hintBottom:tip.bottom,inputTop:input.top};
  });
  assert.ok(codeStyles.floating&&codeStyles.font.includes("Onest")&&
   codeStyles.hintFont.includes("Onest")&&codeStyles.inputSize===15&&
   codeStyles.hintSize===11&&codeStyles.hintBottom<=codeStyles.inputTop+24,
   "Forgot OTP field must use the same Onest animated hint: "+JSON.stringify(codeStyles));
  await codeField.fill("123456");
  await codeField.blur();
  assert.equal(await codeField.evaluate(el=>el.closest(".vatra-input-shell").classList.contains("is-floating")),true,
   "OTP hint must remain raised while the field contains a code");
  await codeField.fill("");
  await codeField.blur();
  await recoveryPage.waitForTimeout(240);
  const resetCode=await codeField.evaluate(el=>{
   const shell=el.closest(".vatra-input-shell"),hint=shell.querySelector(".vatra-floating-hint");
   const ir=el.getBoundingClientRect(),hr=hint.getBoundingClientRect();
   return {floating:shell.classList.contains("is-floating")||shell.matches(":focus-within"),
    offset:Math.abs((hr.top+hr.bottom)/2-(ir.top+ir.bottom)/2)};
  });
  assert.ok(!resetCode.floating&&resetCode.offset<=3,
   "Cleared OTP must restore its hint in the center: "+JSON.stringify(resetCode));
  const codeStep=await recoveryPage.locator("#recovery-step").boundingBox();
  assert.ok(codeStep&&codeStep.x>=0&&codeStep.x+codeStep.width<=width+1,
   "OTP stage must remain within the same card at "+width);
  assert.ok(Math.abs(codeStep.width-metrics.formWidth)<=1.5,
   "OTP stage must match the 520px form column at "+width+": "+JSON.stringify(codeStep));
  // The final password stage is part of the very same card.
  await recoveryPage.evaluate(()=>{
   document.querySelector("#recovery-code-form").hidden=true;
   document.querySelector("#recovery-tools").hidden=true;
   document.querySelector("#reset-form").hidden=false;
  });
  const passwordStep=await recoveryPage.locator("#reset-form").boundingBox();
  assert.ok(passwordStep&&Math.abs(passwordStep.width-metrics.formWidth)<=1.5,
   "The password stage must retain the same centered 520px column at "+width);
  const passwordMotion=await recoveryPage.locator(".forgot-panel-content").evaluate(el=>getComputedStyle(el).animationName);
  const passwordFragment=await recoveryPage.locator("#reset-form").evaluate(el=>getComputedStyle(el).animationName);
  assert.equal(passwordMotion,"vatraAuthReveal","Full recovery screen, including logo, must reveal on password stage");
  assert.equal(passwordFragment,"none","Password form must not animate separately from recovery branding");
  await recoveryPage.close();
 }
 await context.addCookies([{name:"vatra-language",value:"en",url:base}]);

 // Supabase intentionally returns success for unknown emails. Verify that
 // the browser sends the request, remains non-enumerating, and does not claim delivery.
 await context.addCookies([{name:"vatra-language",value:"uk",url:base}]);
 const recoverySend=await context.newPage();
 await recoverySend.addInitScript(()=>{
  window.turnstile={
   render(node,options){window.__recoveryCaptcha={node,options};return "mock-recovery-challenge";},
   execute(){window.__recoveryCaptcha.options.callback("mock-recovery-token");},
   remove(){window.__recoveryCaptcha=null;}
  };
 });
 await recoverySend.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:'window.supabase={createClient:()=>({auth:{resetPasswordForEmail:async (email,opts)=>{window.__recoveryRequest={email,opts};return {data:{},error:null};}}})};'
 }));
 await recoverySend.goto(base+"forgot.html",{waitUntil:"domcontentloaded"});
 await waitReady(recoverySend);
 await recoverySend.waitForFunction(()=>document.documentElement.lang==="uk");
 await recoverySend.locator("#email").fill("notregistered@example.test");
 await recoverySend.locator("#forgot-form button[type='submit']").click();
 await recoverySend.locator("#recovery-step").waitFor({state:"visible",timeout:10000});
 const sent=await recoverySend.evaluate(()=>window.__recoveryRequest);
 assert.equal(sent.email,"notregistered@example.test");
 assert.equal(sent.opts.captchaToken,"mock-recovery-token");
 assert.ok(sent.opts.redirectTo.endsWith("/VATRA/reset"));
 const caption=await recoverySend.locator(".recovery-step-caption").textContent();
 assert.ok(caption.includes("Якщо ця адреса належить акаунту VATRA"),
  "Success response must not claim that an email was delivered: "+caption);
 await recoverySend.close();

 // Full mock lifecycle of an *existing* account: email -> OTP -> password -> success.
 // No Supabase project, SMTP server or live account is contacted.
 const fullRecovery=await context.newPage();
 await fullRecovery.addInitScript(()=>{
  window.turnstile={
   render(element,options){window.__fullCaptcha={element,options};return "mock-widget";},
   execute(){window.__fullCaptcha.options.callback("mock-secure-token");},
   remove(){window.__fullCaptcha=null;}
  };
 });
 await fullRecovery.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:'window.supabase={createClient:(u,k,opts)=>(window.__recoveryAuthOptions=opts.auth,{auth:{resetPasswordForEmail:async()=>({data:{},error:null}),verifyOtp:async params=>{window.__verifiedRecovery=params;return {data:{session:{access_token:"fake-session",user:{id:"verified-mock"}}},error:null}},getUser:async()=>({data:{user:{id:"verified-mock",email:"registered@example.test",email_confirmed_at:"2026-11-01T00:00:00Z"}},error:null}),updateUser:async data=>{if(data.password==="OldPassword@12345")return {data:{},error:{code:"same_password",message:"New password should be different from the old password"}};window.__updatedPassword=data.password;return {data:{},error:null}}}})};'
 }));
 await fullRecovery.goto(base+"forgot.html",{waitUntil:"domcontentloaded"});
 await waitReady(fullRecovery);
 assert.ok(await fullRecovery.evaluate(()=>{
  const cfg=window.__recoveryAuthOptions;
  return cfg?.persistSession===false&&cfg.autoRefreshToken===false&&cfg.detectSessionInUrl===false;
 }),"Forgot-password requests must not create a persistent VATRA login session");
 await fullRecovery.evaluate(()=>{
  window.__vatraRecoveryReveals=0;
  const content=document.querySelector(".forgot-panel-content");
  content.addEventListener("animationstart",event=>{
   if(event.target===content&&event.animationName==="vatraAuthReveal")window.__vatraRecoveryReveals++;
  });
 });
 await fullRecovery.locator("#email").fill("registered@example.test");
 await fullRecovery.locator("#forgot-form button[type='submit']").click();
 await fullRecovery.locator("#recovery-code-form").waitFor({state:"visible",timeout:10000});
 await fullRecovery.waitForFunction(()=>window.__vatraRecoveryReveals>=1);
 const otpWholeContent=await fullRecovery.evaluate(()=>{
  const wrapper=document.querySelector(".forgot-panel-content");
  return {card:getComputedStyle(document.querySelector(".forgot-panel")).animationName,
   wrapper:getComputedStyle(wrapper).animationName,
   header:getComputedStyle(document.querySelector(".forgot-panel-header")).animationName,
   stage:getComputedStyle(document.querySelector("#recovery-step")).animationName,
   logoInside:wrapper.contains(document.querySelector(".forgot-panel-brand img")),
   codeInside:wrapper.contains(document.querySelector("#recovery-code-form"))};
 });
 assert.ok(otpWholeContent.card==="none"&&otpWholeContent.wrapper==="vatraAuthReveal"&&
  otpWholeContent.header==="none"&&otpWholeContent.stage==="none"&&
  otpWholeContent.logoInside&&otpWholeContent.codeInside,
  "OTP entry must raise the brand and all content together while shell stays static: "+JSON.stringify(otpWholeContent));
 assert.equal(await fullRecovery.locator(".forgot-intro").isVisible(),false);
 await fullRecovery.locator("#recovery-token").fill("123456");
 await fullRecovery.locator("#recovery-code-form button[type='submit']").click();
 await fullRecovery.locator("#reset-form").waitFor({state:"visible",timeout:10000});
 await fullRecovery.waitForFunction(()=>window.__vatraRecoveryReveals>=2);
 const passwordWholeContent=await fullRecovery.evaluate(()=>{
  const container=document.querySelector(".forgot-panel-content");
  return {content:getComputedStyle(container).animationName,
   brandInside:container.contains(document.querySelector(".forgot-panel-brand")),
   titleInside:container.contains(document.querySelector("#recovery-step-heading")),
   formInside:container.contains(document.querySelector("#reset-form")),
   headingMotion:getComputedStyle(document.querySelector("#recovery-step-heading")).animationName,
   formMotion:getComputedStyle(document.querySelector("#reset-form")).animationName};
 });
 assert.ok(passwordWholeContent.content==="vatraAuthReveal"&&
  passwordWholeContent.brandInside&&passwordWholeContent.titleInside&&passwordWholeContent.formInside&&
  passwordWholeContent.headingMotion==="none"&&passwordWholeContent.formMotion==="none",
  "Password entry must animate the entire recovery content in one synchronized motion: "+JSON.stringify(passwordWholeContent));
 const verifiedMock=await fullRecovery.evaluate(()=>window.__verifiedRecovery);
 assert.equal(verifiedMock.email,"registered@example.test");
 assert.equal(verifiedMock.token,"123456");
 assert.equal(verifiedMock.type,"recovery");
 assert.equal(await fullRecovery.locator("#recovery-code-form").isVisible(),false);
 assert.equal(await fullRecovery.locator("#recovery-tools").isVisible(),false);
 assert.equal(await fullRecovery.locator("#recovery-step-heading").textContent(),"Встановіть новий пароль");
 assert.equal(await fullRecovery.evaluate(()=>document.activeElement?.id),"recovery-step-heading",
  "Successful OTP must focus the step heading, not an empty password field");
 // Reproduce password-manager implicit focus (e.g. Opera GX): the empty
 // password caption must remain centered until a genuine user interaction.
 const autoFocusPassword=fullRecovery.locator("#password");
 await autoFocusPassword.evaluate(el=>el.focus());
 await fullRecovery.waitForTimeout(240);
 const measurePasswordHint=()=>autoFocusPassword.evaluate(el=>{
  const shell=el.closest(".vatra-input-shell"),hint=shell.querySelector(".vatra-floating-hint");
  const ir=el.getBoundingClientRect(),hr=hint.getBoundingClientRect();
  return {pristine:shell.classList.contains("is-awaiting-user-input"),
   centered:Math.abs((hr.top+hr.bottom)/2-(ir.top+ir.bottom)/2)<=3,
   raised:hr.bottom<=ir.top+24};
 });
 const autoFocused=await measurePasswordHint();
 assert.ok(autoFocused.pristine&&autoFocused.centered,
  "Empty password-manager autofocus must not strand its hint at the top: "+JSON.stringify(autoFocused));
 await autoFocusPassword.click();
 await fullRecovery.waitForTimeout(240);
 const clickedPassword=await measurePasswordHint();
 assert.ok(!clickedPassword.pristine&&clickedPassword.raised,
  "A real click must lift the password caption: "+JSON.stringify(clickedPassword));
 await autoFocusPassword.blur();
 await fullRecovery.waitForTimeout(240);
 assert.ok((await measurePasswordHint()).centered,"Empty password hint must return after blur");
 // A stale class must also be harmless if the browser shows an empty, blurred field.
 await autoFocusPassword.evaluate(el=>el.closest(".vatra-input-shell").classList.add("is-floating"));
 await fullRecovery.waitForTimeout(240);
 assert.ok((await measurePasswordHint()).centered,
  "Stale floating class must not keep an empty recovery caption raised");
 await autoFocusPassword.evaluate(el=>el.closest(".vatra-input-shell").classList.remove("is-floating"));
 for(const id of ["password","password-confirm"]){
  const control=fullRecovery.locator("#"+id);
  assert.equal(await control.evaluate(el=>el.closest(".vatra-input-shell").matches(":focus-within")||
   el.closest(".vatra-input-shell").classList.contains("is-floating")),false,
   "Password and confirmation hints must initially be centered after OTP: "+id);
  await control.fill("NewPassword@12345");
  await control.blur();
  assert.equal(await control.evaluate(el=>el.closest(".vatra-input-shell").classList.contains("is-floating")),true,
   "A nonempty password hint must stay raised after blur: "+id);
  await control.fill("");
  await control.blur();
  await fullRecovery.waitForTimeout(240);
  const hintReset=await control.evaluate(el=>{
   const shell=el.closest(".vatra-input-shell"),h=shell.querySelector(".vatra-floating-hint");
   const ir=el.getBoundingClientRect(),hr=h.getBoundingClientRect();
   return {floating:shell.classList.contains("is-floating")||shell.matches(":focus-within"),
    centered:Math.abs((hr.top+hr.bottom)/2-(ir.top+ir.bottom)/2)<=3};
  });
  assert.ok(!hintReset.floating&&hintReset.centered,
   "Empty password hint must return to its original position: "+id+" "+JSON.stringify(hintReset));
 }
 // Client-side policy errors must explain the missing rule, not reject an
 // otherwise matching pair with a generic "passwords do not match" message.
 const policyTip=fullRecovery.locator("#forgot-password-policy");
 assert.ok((await policyTip.textContent()).includes("12–128"));
 assert.ok((await policyTip.evaluate(el=>getComputedStyle(el).fontFamily)).includes("Onest"));
 assert.equal(await policyTip.evaluate(el=>getComputedStyle(el).fontSize),"13px");
 await fullRecovery.locator("#password").fill("lowercaseonly123!");
 await fullRecovery.locator("#password-confirm").fill("lowercaseonly123!");
 await fullRecovery.locator("#reset-form button[type='submit']").click();
 await fullRecovery.locator("#response").waitFor({state:"visible"});
 assert.ok((await fullRecovery.locator("#response").textContent()).includes("велику латинську літеру"),
  "Recovery must identify missing uppercase Latin letters");
 assert.equal(await fullRecovery.evaluate(()=>window.__updatedPassword),undefined);
 assert.ok(await fullRecovery.locator("#response").evaluate(el=>
  document.querySelector("#recovery-step-heading").nextElementSibling===el),
  "Password errors must appear immediately below the stage heading");

 await fullRecovery.locator("#password").fill("StrongPassword@12345");
 await fullRecovery.locator("#password-confirm").fill("StrongPassword@12346");
 await fullRecovery.locator("#reset-form button[type='submit']").click();
 assert.ok((await fullRecovery.locator("#response").textContent()).includes("Паролі не збігаються"),
  "Mismatch must be separate from password complexity validation");

 await fullRecovery.locator("#password").fill("OldPassword@12345");
 await fullRecovery.locator("#password-confirm").fill("OldPassword@12345");
 await fullRecovery.locator("#reset-form button[type='submit']").click();
 await fullRecovery.waitForFunction(()=>
  document.querySelector("#response")?.textContent.includes("відрізняється від попереднього"));
 assert.equal(await fullRecovery.evaluate(()=>window.__updatedPassword),undefined,
  "Server rejection of the previous password must not update the account");

 await fullRecovery.locator("#password").fill("StrongPassword@12345");
 await fullRecovery.locator("#password-confirm").fill("StrongPassword@12345");
 await fullRecovery.locator("#reset-form button[type='submit']").click();
 await fullRecovery.locator("#account-link").waitFor({state:"visible",timeout:10000});
 await fullRecovery.waitForFunction(()=>window.__vatraRecoveryReveals>=3);
 assert.equal(await fullRecovery.locator("#reset-form").isVisible(),false);
 assert.equal(new URL(await fullRecovery.locator("#account-link").getAttribute("href"),base).pathname,
  new URL(base).pathname,"After changing a password, sign in explicitly; never open account with recovery credentials");
 const successAppearance=await fullRecovery.locator("#account-link").evaluate(node=>{
  const btn=node.getBoundingClientRect(),row=node.closest("#recovery-success-link");
  const parent=node.closest(".forgot-panel-content"),style=getComputedStyle(node);
  return {height:btn.height,width:btn.width,contentWidth:row.getBoundingClientRect().width,
   bg:style.backgroundImage,color:style.color,radius:style.borderRadius,
   contained:parent.contains(document.querySelector("#response")),
   text:node.textContent.trim()};
 });
 assert.ok(successAppearance.height>=55&&successAppearance.width>=successAppearance.contentWidth-2&&
  successAppearance.bg.includes("linear-gradient")&&successAppearance.color==="rgb(255, 255, 255)"&&
  parseFloat(successAppearance.radius)>=25&&successAppearance.contained&&successAppearance.text.length>0,
  "Successful password reset should reveal a prominent full-width VATRA action with status message: "+JSON.stringify(successAppearance));
 assert.equal(await fullRecovery.evaluate(()=>window.__updatedPassword),"StrongPassword@12345");
 assert.equal(await fullRecovery.evaluate(()=>sessionStorage.getItem("vatra-recovery-pending")),null);
 await fullRecovery.close();
 // A saved sign-in session is not permission to reset a password.
 await context.addCookies([{name:"vatra-language",value:"uk",url:base}]);
 const recoveryLink=await context.newPage();
 await recoveryLink.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:'window.supabase={createClient:(u,k,opts)=>(window.__resetAuthOptions=opts.auth,{auth:{onAuthStateChange:fn=>{window.__resetRecoveryHandler=fn;return {data:{subscription:{unsubscribe(){}}}}},getUser:async()=>({data:{user:{id:window.__resetRecoveryUserId||"unrelated-user"}},error:null}),updateUser:async data=>{window.__resetPasswordChanged=data.password;return {data:{},error:null}}}})};'
 }));
 await recoveryLink.goto(base+"reset.html?type=recovery",{waitUntil:"domcontentloaded"});
 await waitReady(recoveryLink);
 assert.ok(await recoveryLink.evaluate(()=>{
  const cfg=window.__resetAuthOptions;
  return cfg?.persistSession===false&&cfg.autoRefreshToken===false&&cfg.detectSessionInUrl===true;
 }),"Reset callback must use an ephemeral recovery session, never a persistent login");
 assert.equal(await recoveryLink.locator("#reset-form").isVisible(),false);
 await recoveryLink.evaluate(()=>window.__resetRecoveryHandler("SIGNED_IN",{user:{id:"unrelated-user"}}));
 assert.equal(await recoveryLink.locator("#reset-form").isVisible(),false,
  "A SIGNED_IN event is not proof of recovery");
 await recoveryLink.evaluate(()=>window.__resetRecoveryHandler("PASSWORD_RECOVERY",{user:{id:"recovery-user"}}));
 await recoveryLink.locator("#reset-form").waitFor({state:"visible"});
 await recoveryLink.locator("#password").fill("NewPassword@12345");
 await recoveryLink.locator("#password-confirm").fill("NewPassword@12345");
 await recoveryLink.locator("#reset-form button[type='submit']").click();
 assert.ok((await recoveryLink.locator("#response").textContent()).includes("Підтвердження закінчилося"),
  "Changing accounts mid-recovery must be rejected");
 assert.equal(await recoveryLink.evaluate(()=>window.__resetPasswordChanged),undefined);
 await recoveryLink.evaluate(()=>{window.__resetRecoveryUserId="recovery-user";window.__resetRecoveryHandler("PASSWORD_RECOVERY",{user:{id:"recovery-user"}});});
 await recoveryLink.locator("#reset-form").waitFor({state:"visible"});
 await recoveryLink.locator("#reset-form button[type='submit']").click();
 await recoveryLink.locator("#account-link").waitFor({state:"visible"});
 assert.equal(new URL(await recoveryLink.locator("#account-link").getAttribute("href"),base).pathname,new URL(base).pathname);
 assert.equal(await recoveryLink.locator("#recovery-success-link").isVisible(),true,
  "Direct reset success action must not leave an empty hidden container");
 const directButton=await recoveryLink.locator("#account-link").evaluate(node=>{
  const rect=node.getBoundingClientRect(),css=getComputedStyle(node);
  return {height:rect.height,width:rect.width,color:css.color,bg:css.backgroundImage};
 });
 assert.ok(directButton.height>=55&&directButton.width>200&&
  directButton.bg.includes("linear-gradient")&&directButton.color==="rgb(255, 255, 255)",
  "Direct reset must reuse the same prominent success CTA: "+JSON.stringify(directButton));
 assert.equal(await recoveryLink.evaluate(()=>window.__resetPasswordChanged),"NewPassword@12345");
 await recoveryLink.close();
 // Critical regression: confirming recovery and abandoning the password form
 // must never sign in on the same device or leave a persistent access token.
 const abandonContext=await browser.newContext({locale:"uk-UA",serviceWorkers:"block"});
 await abandonContext.route("**/assets/js/host.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
 }));
 await abandonContext.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:`window.supabase={createClient:(url,key,opts)=>{window.__temporaryAuthOptions=opts.auth;
    return {auth:{
      getUser:async()=>({data:{user:localStorage.getItem("ci-recovery-session")
       ?{id:"ci-user",email:"example@example.test",email_confirmed_at:"2026-01-01"}:null},error:null}),
      verifyOtp:async()=>{if(opts.auth.persistSession)localStorage.setItem("ci-recovery-session","1");
       return {data:{session:{user:{id:"ci-user"}}},error:null};},
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
    }};}};`
 }));
 try{
  const abandon=await abandonContext.newPage();
  await abandon.addInitScript(()=>localStorage.setItem("vatra-language","uk"));
  await abandon.goto(base+"reset.html",{waitUntil:"domcontentloaded"});
  await waitReady(abandon);
  await abandon.locator("#recovery-email").fill("example@example.test");
  await abandon.locator("#recovery-token").fill("123456");
  await abandon.locator("#recovery-code-form button[type=submit]").click();
  await abandon.locator("#reset-form").waitFor({state:"visible"});
  assert.equal(await abandon.evaluate(()=>localStorage.getItem("ci-recovery-session")),null,
   "Recovery OTP must not persist an app login session");
  await abandon.locator(".forgot-panel-header .back").click();
  await abandon.waitForURL(url=>url.pathname.endsWith("/VATRA/"),{timeout:12000});
  await waitReady(abandon);
  assert.equal(await abandon.locator("#login-form").isVisible(),true,
   "Abandoning password reset must show login instead of opening the account");
  assert.ok(await abandon.evaluate(()=>{
   return localStorage.getItem("ci-recovery-session")===null&&
     window.__temporaryAuthOptions?.persistSession===true;
  }),"Normal sign-in remains persistent, but abandoned recovery must not grant access");
  await abandon.close();
 }finally{await abandonContext.close();}
 const expiredLink=await context.newPage();
 await expiredLink.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:'window.supabase={createClient:()=>({auth:{onAuthStateChange:fn=>{window.__expiredListener=fn;return {data:{subscription:{unsubscribe(){}}}}},getUser:async()=>({data:{user:{id:"unrelated-user"}},error:null})}})};'
 }));
 await expiredLink.goto(base+"reset.html?type=recovery&error=access_denied",{waitUntil:"domcontentloaded"});
 await waitReady(expiredLink);
 assert.equal(await expiredLink.locator("#reset-form").isVisible(),false);
 assert.ok((await expiredLink.locator("#response").textContent()).includes("Посилання недійсне"));
 await expiredLink.close();
 // The UI also displays identical rules and Onest at signup and direct reset.
 for(const [path,selector] of [
  ["register.html","#register-password-policy"],["reset.html","#reset-password-policy"]
 ]){
  const policyPage=await context.newPage();
  await policyPage.goto(base+path,{waitUntil:"domcontentloaded"});
  await waitReady(policyPage);
  const tip=policyPage.locator(selector);
  assert.ok((await tip.textContent()).includes("12–128"),
   path+" must explain the same minimum requirements");
  assert.ok((await tip.evaluate(el=>getComputedStyle(el).fontFamily)).includes("Onest"),
   path+" must share the typography");
  assert.equal(await tip.evaluate(el=>getComputedStyle(el).fontSize),"13px");
  if(path==="register.html"){
   assert.equal(await policyPage.locator(".vt-register-paragraph-02").count(),0);
   assert.equal(await policyPage.locator(".signup-step").first().evaluate(el=>getComputedStyle(el).animationName),"none");
   await policyPage.evaluate(()=>{
    document.body.dataset.registrationStep="2";
    document.querySelector('[data-register-step="2"]').hidden=false;
   });
   assert.equal(await policyPage.locator('[data-register-step="2"]').evaluate(el=>getComputedStyle(el).animationName),"none",
    "Only the shared signup content must animate, not the second-step fields");
   assert.equal(await policyPage.locator(".signup-form-panel .narrow-form").evaluate(el=>getComputedStyle(el).animationName),"vatraAuthReveal");
  }
  await policyPage.close();
 }
 console.log("VATRA complete mock email → OTP → password update → success: OK");
 await context.addCookies([{name:"vatra-language",value:"en",url:base}]);
 // Consistent translated email hint across signup and reset forms.
 for(const language of ["uk","en"]){
  await context.addCookies([{name:"vatra-language",value:language,url:base}]);
  for(const [route,selector] of [
   ["register.html",".vt-register-floating-hint-03"],
   ["reset.html",".vt-reset-floating-hint-01"]
  ]){
   const emailPage=await context.newPage();
   await emailPage.goto(base+route,{waitUntil:"domcontentloaded"});
   await waitReady(emailPage);
   await emailPage.waitForFunction(lang=>document.documentElement.lang===lang,language);
   assert.equal(await emailPage.locator(selector).textContent(),
    language==="uk"?"Електронна пошта":"Email address");
   await emailPage.close();
  }
 }
 await context.addCookies([{name:"vatra-language",value:"uk",url:base}]);
 // Email links open reset.html; its entire flow must match the recovery card.
 for(const [width,language] of [[390,"uk"],[1440,"en"]]){
  await context.addCookies([{name:"vatra-language",value:language,url:base}]);
  const resetVisual=await context.newPage();
  await resetVisual.setViewportSize({width,height:844});
  await resetVisual.goto(base+"reset.html",{waitUntil:"domcontentloaded"});
  await waitReady(resetVisual);
  await resetVisual.waitForFunction(lang=>document.documentElement.lang===lang,language);
  const resetMotion=await resetVisual.evaluate(()=>({
    card:getComputedStyle(document.querySelector(".reset-panel")).animationName,
    content:getComputedStyle(document.querySelector(".reset-panel .forgot-panel-content")).animationName,
    intro:getComputedStyle(document.querySelector(".reset-intro")).animationName,
    form:getComputedStyle(document.querySelector("#recovery-code-form")).animationName,
    logo:getComputedStyle(document.querySelector(".reset-panel-brand")).borderStyle,
    back:getComputedStyle(document.querySelector(".reset-panel-header .back")).fontFamily
  }));
  assert.ok(resetMotion.card==="none"&&resetMotion.content.includes("vatraAuthReveal")&&
   resetMotion.intro==="none"&&resetMotion.form==="none"&&
   resetMotion.logo==="none"&&resetMotion.back.includes("Onest"),
   "Direct reset must animate its whole card, retain back button and brand");
  const panel=resetVisual.locator(".reset-panel");
  const panelBounds=await panel.boundingBox();
  const codeBounds=await resetVisual.locator("#recovery-code-form").boundingBox();
  const topRow=await resetVisual.locator(".reset-panel-header").boundingBox();
  const logo=await resetVisual.locator(".reset-panel-brand img").boundingBox();
  assert.ok(panelBounds&&codeBounds&&topRow&&logo&&
   codeBounds.width<=520.5&&Math.abs(codeBounds.x+codeBounds.width/2-(panelBounds.x+panelBounds.width/2))<=1.5&&
   logo.width>=38,"Direct reset page should match the centered 520px VATRA card");
  await resetVisual.evaluate(()=>{
   document.querySelector("#recovery-code-form").hidden=true;
   document.querySelector("#reset-form").hidden=false;
  });
  const passBounds=await resetVisual.locator("#reset-form").boundingBox();
  assert.ok(passBounds&&Math.abs(passBounds.width-codeBounds.width)<=1.5,
   "Direct reset password form should retain matching width");
  assert.equal(await resetVisual.locator(".forgot-panel-content").evaluate(el=>getComputedStyle(el).animationName),"vatraAuthReveal",
   "Direct reset password stage must share one full-content entrance with logo");
  assert.equal(await resetVisual.locator("#reset-form > :not([hidden])").first().evaluate(el=>getComputedStyle(el).animationName),"none",
   "Direct reset fields must not rise separately");
  await resetVisual.locator("#password").focus();
  await resetVisual.waitForTimeout(230);
  const floatedPassword=await resetVisual.locator("#password").evaluate(el=>{
   const shell=el.closest(".vatra-input-shell");
   const hint=shell.querySelector(".vatra-floating-hint");
   const inputRect=el.getBoundingClientRect(),hintRect=hint.getBoundingClientRect();
   return {raised:shell.classList.contains("is-floating")||shell.matches(":focus-within"),
    inputHeight:inputRect.height,hintTop:hintRect.top-inputRect.top,
    hintLeft:hintRect.left-inputRect.left,hintBottom:hintRect.bottom-inputRect.top,
    paddingTop:getComputedStyle(el).paddingTop,paddingBottom:getComputedStyle(el).paddingBottom,
    labelCount:shell.querySelectorAll(".vatra-floating-hint").length};
  });
  assert.ok(floatedPassword.raised&&floatedPassword.inputHeight>=54&&
   floatedPassword.hintTop>=5&&floatedPassword.hintTop<=10&&
   floatedPassword.hintBottom<=27&&Math.abs(floatedPassword.hintLeft-17)<1&&
   floatedPassword.paddingTop==="21px"&&floatedPassword.paddingBottom==="7px"&&
   floatedPassword.labelCount===1,
   "Password field must have a single correctly positioned floating hint and text caret: "+JSON.stringify(floatedPassword));
  await resetVisual.close();
 }
 await context.addCookies([{name:"vatra-language",value:"uk",url:base}]);
 // Direct reset page must use the same code/email floating fields.
 for(const language of ["uk","en"]){
  await context.addCookies([{name:"vatra-language",value:language,url:base}]);
  const resetPage=await context.newPage();
  await resetPage.goto(base+"reset.html",{waitUntil:"domcontentloaded"});
  await waitReady(resetPage);
  await resetPage.waitForFunction(lang=>document.documentElement.lang===lang,language);
  const token=resetPage.locator("#recovery-token");
  assert.equal(await resetPage.locator(".vt-reset-floating-hint-02").textContent(),
   language==="uk"?"Введіть код":"Enter code");
  await token.focus();
  await resetPage.waitForTimeout(240);
  const tokenStyle=await token.evaluate(el=>{
   const shell=el.closest(".vatra-input-shell");
   const font=getComputedStyle(el);
   const hint=shell.querySelector(".vatra-floating-hint");
   return {floating:shell.classList.contains("is-floating")||shell.matches(":focus-within"),
    font:font.fontFamily,hintFont:getComputedStyle(hint).fontFamily,
    top:hint.getBoundingClientRect().bottom,bottom:el.getBoundingClientRect().top};
  });
  assert.ok(tokenStyle.floating&&tokenStyle.font.includes("Onest")&&
   tokenStyle.hintFont.includes("Onest")&&tokenStyle.top<=tokenStyle.bottom+24,
   "Reset OTP must use the same floating Onest field: "+JSON.stringify(tokenStyle));
  await resetPage.close();
 }
 await context.addCookies([{name:"vatra-language",value:"en",url:base}]);
 console.log("VATRA password recovery request with CAPTCHA and privacy-safe messaging: OK");
 console.log("VATRA password recovery typography and responsive OTP stage: OK");
 console.log("VATRA supporting page footers: OK");

 // Exercise signup confirmation, one-click correction and CAPTCHA-protected resend (offline mocks only).
 const confirmationPage=await context.newPage();
 const lifecycleWarnings=[];
 confirmationPage.on("console",msg=>{if(msg.type()==="warning"&&msg.text().includes("Widget"))lifecycleWarnings.push(msg.text());});
 await confirmationPage.addInitScript(()=>{
  localStorage.setItem("vatra-language","uk");
  window.__removedWithAttachedContainer=false;
  window.turnstile={
   render(element,options){window.__captchaWidget={element,options};return "mock-turnstile-1";},
   execute(){window.__captchaWidget.options.callback("mock-token-for-ui-test");},
   remove(){
    window.__removedWithAttachedContainer=!!window.__captchaWidget.element.isConnected;
    if(!window.__removedWithAttachedContainer)console.warn("Cannot find Widget");
   }
  };
 });
 await confirmationPage.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:window.__verifiedMockUser||null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signUp:async params=>{window.__signupCaptcha=!!params.options?.captchaToken;return {data:{user:{id:"mock"},session:null},error:null};},resend:async params=>{window.__resendParams=params;return {data:{},error:null};}}})};'
 }));
 await confirmationPage.goto(base+"register.html",{waitUntil:"domcontentloaded"});
 await waitReady(confirmationPage);
 assert.equal(await confirmationPage.title(),await confirmationPage.evaluate(()=>document.documentElement.lang==="en"?"Create account · VATRA":"Створити акаунт · VATRA"));
 await confirmationPage.locator("#first-name").fill("Тест");
 await confirmationPage.locator("#last-name").fill("Користувач");
 await confirmationPage.evaluate(()=>{
  for(const [id,value] of [["birth-day","01"],["birth-month","01"],["birth-year","2000"]]){
   const select=document.getElementById(id);select.value=value;select.dispatchEvent(new Event("change",{bubbles:true}));
  }
 });
 await confirmationPage.locator("#register-next").click();
 await confirmationPage.locator("#email").fill("demoexample@example.test");
 await confirmationPage.locator("#password").fill("VeryStrong@12345");
 await confirmationPage.locator("#password-confirm").fill("VeryStrong@12345");
 await confirmationPage.locator("#consent").check();
 await confirmationPage.locator('#signup-form button[type="submit"]').click();
 await confirmationPage.locator("#signup-confirmation").waitFor({state:"visible"});
 assert.equal(await confirmationPage.locator(".signup-form-panel .narrow-form").isVisible(),false);
 assert.equal(await confirmationPage.locator(".signup-confirmation-emblem").count(),0);
 const confirmedMotion=await confirmationPage.evaluate(()=>{
  const content=document.querySelector("#signup-confirmation");
  return {content:getComputedStyle(content).animationName,
   heading:getComputedStyle(content.querySelector(".signup-step-heading")).animationName,
   resend:getComputedStyle(content.querySelector(".signup-confirmation-resend")).animationName,
   card:getComputedStyle(document.querySelector(".signup-form-panel")).animationName};
 });
 assert.ok(confirmedMotion.content==="vatraAuthReveal"&&
  ["heading","resend","card"].every(key=>confirmedMotion[key]==="none"),
  "Signup confirmation should animate all content as one layer with a still card: "+JSON.stringify(confirmedMotion));
 assert.equal(await confirmationPage.locator(".signup-confirmation-overline .signup-confirmation-back-nav a").isVisible(),true,
  "A back-to-login link must remain visible beside the last-step kicker during email confirmation");
 assert.equal(await confirmationPage.locator(".signup-form-overline .reg-back-nav a").isVisible(),false,
  "The inactive registration form navigation must be hidden during confirmation");
 assert.equal(await confirmationPage.locator("#signup-confirmation-resend").isDisabled(),true);
 const typeScale=await confirmationPage.evaluate(()=>{
  const selectors={heading:".signup-confirmation .signup-step-heading h1",
   description:".signup-confirmation-description",tips:".signup-confirmation-tips p",
   countdown:".signup-confirmation-timer-row",delay:".signup-confirmation-delay",
   signIn:".signup-confirmation-signin"};
  return Object.fromEntries(Object.entries(selectors).map(([k,v])=>{
   const style=getComputedStyle(document.querySelector(v));
   return [k,{size:parseFloat(style.fontSize),font:style.fontFamily}];
  }));
 });
 assert.ok(typeScale.heading.size>=31&&typeScale.heading.size<=40,
  "Confirmation heading must match the form scale: "+JSON.stringify(typeScale));
 for(const [name,style] of Object.entries(typeScale)){
  assert.ok(style.font.includes("Onest"),"Confirmation must use Onest: "+name);
  if(name!=="heading")assert.ok(style.size>=13&&style.size<=14,
   "Confirmation secondary text must be 13–14px: "+name+" "+JSON.stringify(style));
 }

 assert.equal(await confirmationPage.locator("#signup-confirmation-expiry").textContent(),"15:00");
 assert.equal(await confirmationPage.evaluate(()=>window.__signupCaptcha),true);
 assert.equal(await confirmationPage.evaluate(()=>window.__removedWithAttachedContainer),true);
 assert.deepEqual(lifecycleWarnings,[]);
 assert.equal(await confirmationPage.locator("#signup-confirmation-restart").count(),0,
  "Email-change button must be entirely removed");
 assert.equal(await confirmationPage.locator(".signup-confirmation-disclaimer,.signup-confirmation-change-note").count(),0,
  "Confirmation must not show server internals or duplicate-account warning");
 assert.equal(await confirmationPage.locator(".signup-confirmation-signin").count(),1,
  "Confirmation must have one consistent sign-in link");
 const emailMask=await confirmationPage.locator("#signup-confirmation-address").textContent();
 assert.equal(emailMask,"dem•••ple@example.test",
  "Show first three and last three email-local-part characters while masking the rest");
 const linkStyle=await confirmationPage.locator(".signup-confirmation-signin").evaluate(el=>({
  font:getComputedStyle(el).fontFamily,
  transition:getComputedStyle(el).transitionProperty,
  centered:getComputedStyle(el).justifyContent
 }));
 assert.ok(linkStyle.font.includes("Onest")&&linkStyle.transition.includes("background")&&linkStyle.centered==="center",
  "Confirmation sign-in link should be centered, legible and use the VATRA hover transition");
 await confirmationPage.reload({waitUntil:"domcontentloaded"});
 await waitReady(confirmationPage);
 assert.equal(await confirmationPage.locator("#signup-confirmation").isVisible(),true);
 await confirmationPage.evaluate(()=>{const key="vatra-signup-confirmation";const p=JSON.parse(sessionStorage.getItem(key));p.nextAllowedAt=Date.now()-1000;sessionStorage.setItem(key,JSON.stringify(p));});
 await confirmationPage.reload({waitUntil:"domcontentloaded"});
 await waitReady(confirmationPage);
 await confirmationPage.waitForFunction(()=>!document.querySelector("#signup-confirmation-resend").disabled);
 await confirmationPage.locator("#signup-confirmation-resend").click();
 await confirmationPage.waitForFunction(()=>!!window.__resendParams);
 const data=await confirmationPage.evaluate(()=>window.__resendParams);
 assert.equal(data.type,"signup");assert.equal(data.email,"demoexample@example.test");
 assert.ok(data.options.captchaToken,"Resend must use CAPTCHA");
 assert.equal(await confirmationPage.locator("#signup-confirmation-resend").isDisabled(),true);
 // Cross-tab messages must not authorize redirects. Always recheck the server
 // and require the exact pending address and email_confirmed_at.
 for(const mockUser of [
  {id:"wrong",email:"another@example.test",email_confirmed_at:"2026-11-08T12:00:00Z"},
  {id:"pending",email:"demoexample@example.test",email_confirmed_at:null}
 ]){
  await confirmationPage.evaluate(user=>{
   window.__verifiedMockUser=user;
   const channel=new BroadcastChannel("vatra-auth-verified");
   channel.postMessage({type:"check-confirmed-session"});
   channel.close();
  },mockUser);
  await confirmationPage.waitForTimeout(150);
  assert.equal(await confirmationPage.locator("#signup-confirmation").isVisible(),true,
   "Unverified or different-user cross-tab signals must not navigate");
 }
 // Simulate the Supabase-confirmed session becoming available in the waiting tab.
 // An independently opened account page broadcasts only a wake-up hint.
 await confirmationPage.evaluate(()=>{
  window.__verifiedMockUser={id:"matched",email:"demoexample@example.test",
   email_confirmed_at:"2026-11-08T12:00:00Z"};
 });
 await confirmationPage.route("**/feed",route=>route.fulfill({
  status:200,contentType:"text/html",body:"<!doctype html><title>Verified VATRA</title><main id='verified-account'>VATRA account</main>"
 }));
 const verifiedTab=await context.newPage();
 await verifiedTab.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:"matched",email:"demoexample@example.test",email_confirmed_at:"2026-11-08T12:00:00Z",user_metadata:{first_name:"Test"}}},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{vatra_id:1},error:null})})})})})};'
 }));
 await verifiedTab.goto(base+"verify",{waitUntil:"domcontentloaded"});
 await waitReady(verifiedTab);
 await confirmationPage.waitForURL(/\/feed$/,{timeout:10000});
 assert.equal(await confirmationPage.locator("#verified-account").count(),1,
  "Matching server-verified user should automatically open the account from the waiting tab");
 await verifiedTab.close();
 await confirmationPage.close();
 console.log("VATRA signup confirmation and secure cross-tab verification: OK");
 // Security and typography regression: password fields on both recovery pages.
 for(const [route,width,language] of [["forgot.html",360,"uk"],["reset.html",1440,"en"]]){
  await context.addCookies([{name:"vatra-language",value:language,url:base}]);
  const view=await context.newPage();
  await view.setViewportSize({width,height:900});
  await view.goto(base+route,{waitUntil:"domcontentloaded"});
  await waitReady(view);
  await view.waitForFunction(lang=>document.documentElement.lang===lang,language);
  await view.evaluate(()=>{
   document.querySelector("#recovery-code-form").hidden=true;
   document.querySelector("#reset-form").hidden=false;
   const stage=document.querySelector("#recovery-step");
   if(stage)stage.hidden=false;
   const initial=document.querySelector("#forgot-form");
   if(initial)initial.hidden=true;
  });
  for(const [id,expected] of [["password",language==="uk"?"Введіть пароль":"Enter password"],
    ["password-confirm",language==="uk"?"Повторіть пароль":"Confirm password"]]){
   const field=view.locator("#"+id),shell=field.locator("..");
   const hint=shell.locator(".vatra-floating-hint");
   const toggle=view.locator("[data-password-toggle='"+id+"']");
   assert.equal(await field.getAttribute("placeholder")," ");
   assert.equal(await hint.textContent(),expected);
   assert.equal(await toggle.isVisible(),false,"Password visibility button must start hidden");
   await field.focus();
   await view.waitForTimeout(230);
   const scale=await field.evaluate(node=>{
    const shell=node.closest(".vatra-input-shell");
    const hint=shell.querySelector(".vatra-floating-hint");
    return {floating:shell.classList.contains("is-floating")||shell.matches(":focus-within"),
     inputFont:getComputedStyle(node).fontFamily,hintFont:getComputedStyle(hint).fontFamily,
     inputSize:parseFloat(getComputedStyle(node).fontSize),
     hintSize:parseFloat(getComputedStyle(hint).fontSize)};
   });
   assert.ok(scale.floating&&scale.inputFont.includes("Onest")&&scale.hintFont.includes("Onest")&&
    scale.inputSize===15&&scale.hintSize===11,
    "Recovery password typography and animation must match other forms: "+JSON.stringify(scale));
   await field.fill("StrongPassword@12345");
   assert.equal(await toggle.isVisible(),true,"Show password should appear for nonempty input");
   await field.fill("");
   assert.equal(await toggle.isVisible(),false,"Show password should hide when field becomes empty");
   await field.blur();
   await view.waitForTimeout(240);
   const clearedHint=await field.evaluate(node=>{
    const shell=node.closest(".vatra-input-shell"),hint=shell.querySelector(".vatra-floating-hint");
    const input=node.getBoundingClientRect(),label=hint.getBoundingClientRect();
    return {floating:shell.classList.contains("is-floating")||shell.matches(":focus-within"),
     offset:Math.abs((label.top+label.bottom)/2-(input.top+input.bottom)/2)};
   });
   assert.ok(!clearedHint.floating&&clearedHint.offset<=3,
    "Clearing either password input must restore its hint: "+id+" "+JSON.stringify(clearedHint));
  }
  const overflow=await view.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=3,"Recovery password stage must not overflow "+width+": "+overflow);
  await view.close();
 }
 // Ensure the legacy direct-login security checks do not inherit a remembered
 // account from earlier signup tests in this same browser context.
 await context.addInitScript(()=>{
  try{localStorage.removeItem("vatra-remembered-account");}catch(_){}
 });
 // If CAPTCHA could not initialize, sign-in must never call Supabase Auth.
 const noCaptcha=await context.newPage();
 await noCaptcha.route("**/assets/js/captcha.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:""
 }));
 await noCaptcha.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null}),signInWithPassword:async()=>{window.__unsafeLoginAttempt=true;return {error:null}}}})};'
 }));
 await noCaptcha.goto(base,{waitUntil:"domcontentloaded"});
 await waitReady(noCaptcha);
 await noCaptcha.locator("#email").fill("example@example.test");
 await noCaptcha.locator("#password").fill("StrongPassword@12345");
 await noCaptcha.locator('#login-form button[type="submit"]').click();
 await noCaptcha.waitForFunction(()=>!document.querySelector("#response").hidden);
 const declined=await noCaptcha.evaluate(()=>({
  authCalled:window.__unsafeLoginAttempt===true,
  message:document.querySelector("#response").textContent,
  type:document.querySelector("#response").dataset.type
 }));
 assert.ok(!declined.authCalled&&declined.type==="error"&&declined.message.length>0,
  "Failed CAPTCHA script must block login, not fail open: "+JSON.stringify(declined));
 await noCaptcha.close();
 // Unconfirmed sessions must never render protected account content or ping-pong between pages.
 const unconfirmed=await context.newPage();
 await unconfirmed.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:"unconfirmed",email:"pending@example.test",email_confirmed_at:null}},error:null})}})};'
 }));
 await unconfirmed.goto(base+"verify",{waitUntil:"domcontentloaded"});
 await unconfirmed.waitForURL(url=>url.pathname==="/VATRA/"||url.pathname==="/VATRA/index.html",{timeout:10000});
 await waitReady(unconfirmed);
 assert.equal(await unconfirmed.locator("#login-form").isVisible(),true,
  "Unconfirmed user must stay at login without redirect loops");
 await unconfirmed.close();
 console.log("VATRA security guards, recovery typography and responsive password fields: OK");

 // Multi-engine responsive audit. All network calls for Auth are mocked:
 // screenshots and interactions must never create production users or emails.
 // Keep real warning reports: only the benign Playwright SW diagnostic is filtered.
 const warnPage=await context.newPage();
 await warnPage.goto(base+"forgot.html",{waitUntil:"domcontentloaded"});
 await waitReady(warnPage);
 await warnPage.evaluate(()=>console.warn("Service Worker registration blocked by Playwright"));
 assert.equal(await warnPage.locator(".vatra-error-toast").count(),0,
  "Playwright-specific service-worker warning must not obscure VATRA forms");
 await warnPage.evaluate(()=>console.warn("VATRA audit: actionable warning"));
 await warnPage.locator(".vatra-error-toast").waitFor({state:"visible"});
 await warnPage.close();

 // Saved-account state is an optional display-only local choice. It must
 // never keep the password or bypass a fresh Supabase password + CAPTCHA check.
 const savedContext=await browser.newContext({locale:"uk-UA",serviceWorkers:"block"});
 await savedContext.route("**/assets/js/host.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
 }));
 await savedContext.route("**/assets/js/captcha.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:'window.VATRA_CAPTCHA={enabled:true,token:async()=>"fake-captcha",reset:async()=>{}};'
 }));
 await savedContext.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:`window.supabase={createClient:()=>({
   auth:{
    getUser:async()=>({data:{user:sessionStorage.getItem("mockLoggedIn")==="1"?{
     id:"saved-user",email:"example@vatra.test",email_confirmed_at:"2026-11-09T00:00:00Z",
     user_metadata:{first_name:"Тест",last_name:"Акаунт"}}:null},error:null}),
    signInWithPassword:async({email,password})=>{
     sessionStorage.setItem("mockAttemptEmail",email);
     if(password!=="CorrectPass@123")return {data:{user:null},error:{code:"invalid_credentials"}};
     sessionStorage.setItem("mockLoggedIn","1");
     return {data:{user:{id:"saved-user",email,email_confirmed_at:"2026-11-09T00:00:00Z",
      user_metadata:{first_name:"Тест",last_name:"Акаунт"}}},error:null};
    },
    signOut:async()=>{sessionStorage.removeItem("mockLoggedIn");return {error:null};}
   },
   from:table=>table==="feed_posts"?
    {select:()=>({order(){return this;},range:async()=>({data:[],error:null})})}:
    {select:()=>({eq:()=>({maybeSingle:async()=>({data:{vatra_id:112233},error:null})})})}
  })};`
 }));
 const savedPage=await savedContext.newPage();
 await savedPage.goto(base,{waitUntil:"domcontentloaded"});
 await waitReady(savedPage);
 assert.equal(await savedPage.locator("#saved-account-panel").isVisible(),false);
 assert.equal(await savedPage.locator("#saved-switch-back").isVisible(),false,
  "Normal login must never show a return-to-saved-account button");
 await savedPage.locator("#email").fill("example@vatra.test");
 await savedPage.locator("#password").fill("CorrectPass@123");
 await savedPage.locator('#login-form button[type="submit"]').click();
 await savedPage.waitForURL("**/feed");
 await waitReady(savedPage);
 const savedData=await savedPage.evaluate(()=>localStorage.getItem("vatra-remembered-account"));
 assert.ok(savedData&&JSON.parse(savedData).email==="example@vatra.test"&&
  !savedData.includes("CorrectPass@123")&&!savedData.includes("token"),
  "Remembered account must store only name and email after real verified sign-in");
 await savedPage.locator(".feed-account-toggle").click();
 await savedPage.locator("#feed-logout").click();
 await savedPage.waitForURL(base);
 await waitReady(savedPage);
 assert.equal(await savedPage.locator("#saved-account-panel").isVisible(),true);
  const savedMotion=await savedPage.locator("#saved-account-panel").evaluate(el=>({
   card:getComputedStyle(el).animationName,
   content:getComputedStyle(el.querySelector("#saved-account-content")).animationName,
   child:getComputedStyle(el.querySelector(".saved-account-top")).animationName
  }));
  assert.equal(savedMotion.card,"none","Saved-account card may not translate");
  assert.equal(savedMotion.content,"vatraAuthReveal","The whole saved-account content must reveal");
  assert.equal(savedMotion.child,"none","Content children must not animate independently");
 assert.equal(await savedPage.locator(".saved-account-wordmark").count(),0,
  "Saved account must not display a redundant VATRA wordmark");
 assert.equal(await savedPage.locator("#standard-login-panel").isVisible(),false);
 assert.equal(await savedPage.locator("#password").inputValue(),"");
 // The remove action needs one branded, localized hint; native title would
 // display the browser's dark tooltip and ignore the VATRA design system.
 const removeHint=savedPage.locator("#saved-account-remove");
 assert.equal(await removeHint.getAttribute("title"),null);
 assert.equal(await removeHint.getAttribute("data-vatra-tooltip"),"Вилучити збережений акаунт");
 assert.equal(await removeHint.getAttribute("aria-label"),"Вилучити збережений акаунт");
 await removeHint.hover();
 const hint=savedPage.locator("#vatra-saved-account-tooltip");
 await hint.waitFor({state:"visible",timeout:2500});
 await savedPage.waitForFunction(()=>{
  const node=document.querySelector("#vatra-saved-account-tooltip");
  return getComputedStyle(node).opacity==="1";
 },null,{timeout:2500});
 const brandedHint=await hint.evaluate(node=>{
  const style=getComputedStyle(node),rect=node.getBoundingClientRect();
  return {visible:style.display!=="none",font:style.fontFamily,
   background:style.backgroundColor,x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,
   viewportWidth:innerWidth,viewportHeight:innerHeight,content:node.textContent.trim()};
 });
 assert.ok(brandedHint.visible&&brandedHint.font.includes("Onest")&&
  brandedHint.background==="rgb(255, 255, 255)"&&
  brandedHint.x>=-1&&brandedHint.y>=-1&&
  brandedHint.right<=brandedHint.viewportWidth+1&&
  brandedHint.bottom<=brandedHint.viewportHeight+1,
  "Localized VATRA tooltip must stay fully in the viewport: "+JSON.stringify(brandedHint));
 await savedPage.evaluate(()=>localStorage.setItem("vatra-language","en"));
 await savedPage.reload({waitUntil:"domcontentloaded"});
 await waitReady(savedPage);
 assert.equal(await savedPage.locator("#saved-account-remove").getAttribute("title"),null);
 assert.equal(await savedPage.locator("#saved-account-remove").getAttribute("data-vatra-tooltip"),"Remove saved account");
 assert.equal(await savedPage.locator("#saved-account-remove").getAttribute("aria-label"),"Remove saved account");
 await savedPage.setViewportSize({width:360,height:700});
 await savedPage.locator("#saved-account-remove").hover();
 const smallHint=await savedPage.locator("#vatra-saved-account-tooltip").evaluate(node=>{
  const b=node.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:innerWidth,height:innerHeight,text:node.textContent};
 });
 assert.ok(smallHint.left>=0&&smallHint.top>=0&&
  smallHint.right<=smallHint.width&&smallHint.bottom<=smallHint.height&&
  smallHint.text==="Remove saved account",
  "Saved-account tooltip must flip/clamp inside a narrow viewport: "+JSON.stringify(smallHint));
 await savedPage.setViewportSize({width:1280,height:900});
 await savedPage.locator("#saved-account-other").click();
 assert.equal(await savedPage.locator("#standard-login-panel").isVisible(),true);
 assert.equal(await savedPage.locator("#saved-switch-back").isVisible(),true);
 const backAlignment=await savedPage.locator("#saved-switch-back").evaluate(button=>{
  const buttonRect=button.getBoundingClientRect(),parentRect=button.parentElement.getBoundingClientRect();
  return {rightGap:Math.abs(buttonRect.right-parentRect.right),alignment:getComputedStyle(button).justifyContent,
   font:getComputedStyle(button).fontFamily};
 });
 assert.ok(backAlignment.rightGap<=2&&backAlignment.alignment==="flex-end"&&backAlignment.font.includes("Onest"),
  "Return to saved account must align with the right edge of the login form");
 assert.equal(await savedPage.locator("#email").inputValue(),"");
 assert.equal(await savedPage.locator("#password").inputValue(),"");
 await savedPage.locator("#saved-switch-back").click();
 assert.equal(await savedPage.locator("#saved-account-panel").isVisible(),true);
 await savedPage.evaluate(()=>{
  window.__vatraSavedRevealCount=0;
  document.querySelector("#saved-account-content").addEventListener("animationstart",()=>{
   window.__vatraSavedRevealCount++;
  });
 });
 const savedOverviewHeight=await savedPage.locator("#saved-account-panel").evaluate(node=>node.getBoundingClientRect().height);
 const overviewNote=await savedPage.locator(".saved-account-note").evaluate(node=>({
  visibility:getComputedStyle(node).visibility,height:node.getBoundingClientRect().height
 }));
 assert.ok(overviewNote.visibility==="visible"&&overviewNote.height>0,
  "The remembered-account reminder must be readable on the first screen");
 assert.equal(await savedPage.locator("#saved-account-return").isVisible(),false);
 await savedPage.locator("#saved-account-continue").click();
 await savedPage.waitForFunction(()=>window.__vatraSavedRevealCount>0);
 const savedPasswordGeometry=await savedPage.locator("#saved-account-panel").evaluate(node=>{
  const top=node.querySelector(".saved-account-top").getBoundingClientRect();
  const back=node.querySelector("#saved-account-return").getBoundingClientRect();
  const remove=node.querySelector("#saved-account-remove").getBoundingClientRect();
  return {cardHeight:node.getBoundingClientRect().height,aligned:Math.abs((back.top+back.bottom)/2-(remove.top+remove.bottom)/2)<=2,
   backInside:back.left>=top.left-1&&back.right<=remove.left,removeAligned:Math.abs(remove.right-top.right)<=1};
 });
 const passwordNote=await savedPage.locator(".saved-account-note").evaluate(node=>({
  visibility:getComputedStyle(node).visibility,height:node.getBoundingClientRect().height
 }));
 assert.ok(passwordNote.visibility==="hidden"&&Math.abs(passwordNote.height-overviewNote.height)<1,
  "Password entry must hide the reminder but preserve its layout slot: "+JSON.stringify({overviewNote,passwordNote}));
 assert.ok(Math.abs(savedPasswordGeometry.cardHeight-savedOverviewHeight)<=2&&
  savedPasswordGeometry.aligned&&savedPasswordGeometry.backInside&&savedPasswordGeometry.removeAligned,
  "Saved account overview and password phases must have equal card height with left/right top controls: "+JSON.stringify({savedOverviewHeight,...savedPasswordGeometry}));
 await savedPage.locator("#saved-account-return").hover();
 await savedPage.waitForTimeout(220);
 const savedReturnMotion=await savedPage.locator("#saved-account-return").evaluate(el=>({
  color:getComputedStyle(el).color,transform:getComputedStyle(el).transform
 }));
 assert.ok(savedReturnMotion.transform.startsWith("matrix(")&&
  parseFloat(savedReturnMotion.transform.split(",")[4])<=-1.8,
  "Saved account return button should slide left like registration back link");
 await savedPage.locator("#saved-account-return").click();
 assert.equal(await savedPage.locator(".saved-account-note").isVisible(),true,
  "Reminder must reappear when returning to the saved-account overview");
 await savedPage.locator("#saved-account-continue").click();
 assert.equal(await savedPage.locator(".saved-account-note").isVisible(),false,
  "Reminder must disappear every time password entry opens");
 const passwordMotion=await savedPage.locator("#saved-account-panel").evaluate(panel=>({
  shell:getComputedStyle(panel).animationName,
  content:getComputedStyle(panel.querySelector("#saved-account-content")).animationName,
  top:getComputedStyle(panel.querySelector(".saved-account-top")).animationName,
  form:getComputedStyle(panel.querySelector("#saved-login-form")).animationName,
  hasCommonParent:panel.querySelector("#saved-account-content").contains(panel.querySelector("#saved-login-form"))
 }));
 assert.ok(passwordMotion.shell==="none"&&passwordMotion.content==="vatraAuthReveal"&&
  passwordMotion.top==="none"&&passwordMotion.form==="none"&&passwordMotion.hasCommonParent,
  "On the password step, avatar, name, fields and note must reveal as one inner content block: "+JSON.stringify(passwordMotion));
 assert.equal(await savedPage.locator(".vt-home-saved-field-title-001").evaluate(
  node=>getComputedStyle(node).clipPath),"inset(50%)",
  "Saved account captions must be screen-reader-only");
 await savedPage.locator("#saved-password").fill("WrongPass@123");
 await savedPage.locator('#saved-login-form button[type="submit"]').click();
 assert.equal(await savedPage.evaluate(()=>sessionStorage.getItem("mockAttemptEmail")),"example@vatra.test");
 await savedPage.locator("#saved-account-response").waitFor({state:"visible"});
 const expectedSavedError=await savedPage.evaluate(()=>
  document.documentElement.lang==="en"?"Could not sign in. Check your password.":"Не вдалося увійти. Перевірте пароль.");
 assert.equal((await savedPage.locator("#saved-account-response").textContent()).trim(),
  expectedSavedError,"Saved password failure needs contextual, translated feedback");
 await savedPage.locator("#saved-password").fill("CorrectPass@123");
 await savedPage.locator('#saved-login-form button[type="submit"]').click();
 await savedPage.waitForURL("**/feed");
 await waitReady(savedPage);
 await savedPage.locator(".feed-account-toggle").click();
 await savedPage.locator("#feed-logout").click();
 await savedPage.waitForURL(base);
 await waitReady(savedPage);
 await savedPage.locator("#saved-account-remove").click();
 assert.equal(await savedPage.locator("#saved-account-remove-dialog").isVisible(),true);
 await savedPage.locator("#saved-remove-cancel").click();
 assert.equal(await savedPage.locator("#saved-account-remove-dialog").isVisible(),false);
 await savedPage.waitForTimeout(250);
 assert.equal(await savedPage.locator("#vatra-saved-account-tooltip").isVisible(),false,
  "Cancel must not reveal tooltip from native dialog focus restoration");
 assert.notEqual(await savedPage.evaluate(()=>localStorage.getItem("vatra-remembered-account")),null,
  "Cancel must not remove remembered user information");
 await savedPage.locator("#saved-account-remove").hover();
 await savedPage.locator("#vatra-saved-account-tooltip").waitFor({state:"visible",timeout:2500});
 await savedPage.locator("#saved-account-remove").click();
 assert.equal(await savedPage.locator("#saved-account-remove-dialog").isVisible(),true);
 await savedPage.locator("#saved-remove-confirm").click();
 assert.equal(await savedPage.evaluate(()=>localStorage.getItem("vatra-remembered-account")),null);
 assert.equal(await savedPage.locator("#standard-login-panel").isVisible(),true);
 assert.equal(await savedPage.locator("#saved-switch-back").isVisible(),false);
 await savedPage.close();
 await savedContext.close();
 console.log("VATRA remembered account: return, alternate login, password check, removal and logout: OK");

 // First Feed release: protected route, text composer, safe rendering, deletion,
 // responsive layout and language switch. All data remains in a browser mock.
 const feedContext=await browser.newContext({locale:"uk-UA",serviceWorkers:"block"});
 await feedContext.route("**/assets/js/host.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
 }));
 const onePixelPng=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+C+y0AAAAASUVORK5CYII=","base64");
 await feedContext.route("**/storage/v1/object/public/vatra-*/**",route=>route.fulfill({
  status:200,contentType:"image/png",body:onePixelPng
 }));
 await feedContext.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:`
  window.__feedTestPosts=[];window.__feedTestCounter=0;
  window.__feedMockStory={id:"00000000-0000-4000-8000-000000000001",body:"Моя тестова історія",
   theme:2,expires_at:"2099-12-31T23:59:59Z"};
  window.supabase={createClient:()=>({
   auth:{
    getUser:async()=>({data:{user:{id:"feed-mock-user",
     email_confirmed_at:"2026-11-09T00:00:00Z",
     user_metadata:{first_name:"Тест",last_name:"VATRA"}}},error:null}),
    signOut:async()=>({error:null})
   },
   from:table=>table==="accounts"?
    {select:()=>({eq:()=>({maybeSingle:async()=>({data:{vatra_id:654321},error:null})})})}:
    table==="vatra_directory"?
    {select:()=>({eq:(_field,id)=>({maybeSingle:async()=>({
     data:["654321","789012"].includes(String(id))?{vatra_id:id}:null,error:null
    })})})}:
    table==="vatra_profile_media"?
    {select:()=>({
      eq:(_field,id)=>({maybeSingle:async()=>({
       data:location.pathname.includes("/feed")?null:{
        avatar_path:id+"/avatar/test-profile.webp",
        cover_path:id+"/cover/test-cover.webp"
       },error:null
      })})
    })}:
    table==="vatra_stories"?
    {select:()=>({
      eq(){this.singleAuthor=true;return this;},
      gt(){return this;},order(){return this;},
      limit:async function(){
       return {data:this.singleAuthor&&window.__feedMockStory?[window.__feedMockStory]:[],error:null};
      }
    }),
    delete:()=>({
     eq(){return this;},
     select:async()=>{const former=window.__feedMockStory;window.__feedMockStory=null;
      return {data:former?[{id:former.id}]:[],error:null};}
    })}:
    table==="communities"?
    {select:()=>({order(){return this;},limit:async()=>({
      data:[{club_id:42,name:"Спільнота тесту",description:"Опис спільноти",
       created_at:"2026-11-10T00:00:00Z"}],error:null
    })})}:
    {select:()=>({filterId:null,eq(_field,id){this.filterId=String(id);return this;},
      order(){return this;},range:async function(a,b){
       await new Promise(resolve=>setTimeout(resolve,320));
       return {data:window.__feedTestPosts.filter(p=>this.filterId===null||String(p.author_vatra_id)===this.filterId).slice(a,b+1),error:null};
      }}),
     insert:async(data)=>{window.__feedTestPosts.unshift({...data,
      id:"feed-mock-"+(++window.__feedTestCounter),created_at:new Date().toISOString()});return {error:null};},
     delete:()=>({eq:async(column,id)=>{window.__feedTestPosts=window.__feedTestPosts.filter(p=>p.id!==id);return {error:null};}})},
   storage:{from:bucket=>({getPublicUrl:path=>({
    data:{publicUrl:"https://rjasunoawrxvetwadylh.supabase.co/storage/v1/object/public/"+bucket+"/"+path}
   })})}
  })};
  // Count all client constructors in this browser tab, on the Feed.
  window.__feedMockCreateClientCalls=0;
  const originalCreateClient=window.supabase.createClient;
  window.supabase.createClient=(...args)=>{
   window.__feedMockCreateClientCalls++;
   return originalCreateClient(...args);
  };
  `
 }));
 let desktopHeaderCenters=null;
 const navCenters=page=>page.locator(".feed-header-brand,.feed-search-form,.social-top-link,.feed-header-icon-button,.feed-account-toggle").evaluateAll(links=>links.map(link=>{
  const rect=link.getBoundingClientRect();return rect.left+rect.width/2;
 }));
 const assertStableHeader=(actual,section)=>{
  assert.equal(actual.length,desktopHeaderCenters.length,section+": header control count must match Feed");
  assert.ok(actual.every((x,i)=>Math.abs(x-desktopHeaderCenters[i])<=1),
   section+": header controls must not move when changing section: "+JSON.stringify({feed:desktopHeaderCenters,current:actual}));
 };
 for(const language of ["uk","en"]){
  await feedContext.addCookies([{name:"vatra-language",value:language,url:base}]);
  const feedProbe=await feedContext.newPage();
  await feedProbe.addInitScript(lang=>localStorage.setItem("vatra-language",lang),language);
  await feedProbe.setViewportSize({width:language==="en"?390:1366,height:844});
  const feedErrors=[];
  feedProbe.on("pageerror",err=>feedErrors.push(err.message));
  await feedProbe.goto(base+"feed",{waitUntil:"domcontentloaded"});
  await feedProbe.locator("#feed-app").waitFor({state:"visible",timeout:14000});
  assert.equal(await feedProbe.locator("#feed-loading").isVisible(),false,
   "Authenticated Feed must not block its header while posts load");
  assert.equal(await feedProbe.locator(".feed-header").isVisible(),true,
   "The persistent header must render before slow Feed posts");
  assert.equal(await feedProbe.locator(".vatra-route-skeleton:visible").count(),0,
   "A full-route skeleton must disappear once the shell is ready");
  assert.equal(await feedProbe.evaluate(()=>window.__feedMockCreateClientCalls),1,
   "Feed uses exactly one Supabase auth client");
  const expectedTitle=language==="en"?"Feed · VATRA":"Стрічка · VATRA";
  assert.equal(await feedProbe.title(),expectedTitle);
  assert.equal((await feedProbe.locator(".feed-title").textContent()).trim(),language==="en"?"Feed":"Стрічка");
  assert.equal(await feedProbe.locator(".feed-nav-link").count(),0);
  assert.equal(await feedProbe.locator(".social-top-nav").isVisible(),true,
   "Four primary destinations must be centered in the header");
  assert.equal(await feedProbe.locator(".feed-sidebar").count(),0,
   "The old sidebar must be removed, not hidden");
  assert.equal(await feedProbe.locator(".social-top-link:visible").count(),5,
   "The centered navigation must show five icon destinations");
  if(language==="uk")desktopHeaderCenters=await navCenters(feedProbe);
  assert.deepEqual(await feedProbe.locator(".social-top-link span").allTextContents(),
   language==="en"?["Feed","Friends","Communities","Clips","Marketplace"]:
   ["Стрічка","Друзі","Спільноти","Кліпи","Маркетплейс"]);
  assert.equal(await feedProbe.locator(".social-top-link:disabled").count(),0,
   "All VATRA header icons must be interactive, including coming-soon previews");
  assert.equal(await feedProbe.locator(".feed-header-icon-button:disabled").count(),0,
   "Right header controls must not be inert");
  assert.equal((await feedProbe.locator(".vt-shell-nav-label-feed-001").textContent()).trim(),
   language==="en"?"Feed":"Стрічка");
  assert.ok((await feedProbe.locator(".feed-header-brand img").getAttribute("src")).endsWith("vatra-symbol.svg"),
   "The VATRA V symbol, not the full wordmark, belongs at the left edge");
  assert.equal(await feedProbe.locator(".feed-aside").count(),0,
   "The Feed must not contain the New Communities rail");
  if(language==="uk"){
   const geometry=await feedProbe.evaluate(()=>{
    const r=selector=>document.querySelector(selector).getBoundingClientRect();
    const story=r(".feed-stories"),posts=r(".feed-posts-section"),
     storyCard=r(".feed-story-create"),
     nav=r(".social-top-nav"),logo=r(".ui-feed-logo-001"),
     account=r(".feed-account-toggle"),search=r(".feed-header .feed-search-form"),
     brand=r(".feed-header-brand");
    return {storyLeft:story.left,postLeft:posts.left,storyWidth:story.width,postWidth:posts.width,
     storyCardWidth:storyCard.width,storyCardHeight:storyCard.height,
     storyCenter:(story.left+story.right)/2,
     navCenter:(nav.left+nav.right)/2,viewportCenter:document.documentElement.clientWidth/2,
     logoMargin:logo.left,rightMargin:document.documentElement.clientWidth-account.right,
     logoToSearch:search.left-brand.right,
     headerHeight:r(".feed-header").height};
   });
   assert.ok(Math.abs(geometry.storyLeft-geometry.postLeft)<3&&
    Math.abs(geometry.storyWidth-geometry.postWidth)<3&&
    Math.abs(geometry.storyCenter-geometry.viewportCenter)<11&&
    geometry.storyCardWidth>=600&&geometry.storyCardWidth<=710&&
    geometry.storyCardHeight>=78&&geometry.storyCardHeight<=82&&
    Math.abs(geometry.navCenter-geometry.viewportCenter)<45&&
    Math.abs(geometry.logoMargin-geometry.rightMargin)<17&&
    geometry.logoToSearch<=9&&geometry.headerHeight<=65,
    "VATRA header symmetry and Feed posts aligned with Stories: "+
    JSON.stringify(geometry));
  }
  assert.equal(await feedProbe.locator(".feed-nav-pending").count(),0,
   "Obsolete sidebar controls must not remain in the DOM");
  assert.equal(await feedProbe.locator(".social-right-panel").count(),0);
  assert.equal(await feedProbe.locator("#feed-community-list").count(),0);
  assert.equal(await feedProbe.locator("#feed-stories-next").count(),1,
   "Friend Story cards use a working overflow control, not a decorative arrow");
  const hashtagProbe=await feedProbe.evaluate(()=>{
   const p=document.createElement("p");
   p.textContent="Тест #Вакансії #НГУ #26полк #служба_в_нгу <script>alert(1)</script>";
   window.VATRA_POST_MEDIA.linkifyHashtags(p);
   return {
    tags:[...p.querySelectorAll("a")].map(a=>a.textContent),
    searches:[...p.querySelectorAll("a")].map(a=>new URL(a.href).searchParams.get("q")),
    unsafeElements:p.querySelectorAll("script,img").length
   };
  });
  assert.deepEqual(hashtagProbe.tags,["#Вакансії","#НГУ","#26полк","#служба_в_нгу"]);
  assert.deepEqual(hashtagProbe.searches,hashtagProbe.tags,
   "Hashtag links must open a real Feed query");
  assert.equal(hashtagProbe.unsafeElements,0,"Post text must not execute arbitrary HTML");
  assert.equal(await feedProbe.locator("#feed-compose-open").isVisible(),true,
   "Members can create a post from their Feed");
  await feedProbe.locator("#feed-compose-open").click();
  assert.equal(await feedProbe.locator("#feed-compose-dialog").evaluate(el=>el.open),true);
  await feedProbe.locator("#feed-compose-text").fill("VATRA Feed publishing smoke test");
  await feedProbe.locator("#feed-compose-save").click();
  await feedProbe.waitForFunction(()=>document.querySelectorAll(".feed-post-card").length===1);
  assert.equal((await feedProbe.locator(".feed-post-body").textContent()).trim(),
   "VATRA Feed publishing smoke test",
   "Feed composer must save to the real feed_posts repository");
  await feedProbe.locator(".feed-post-delete").click();
  await feedProbe.locator("#feed-delete-confirm").click();
  await feedProbe.waitForFunction(()=>document.querySelectorAll(".feed-post-card").length===0);
  assert.ok((await feedProbe.locator(".ui-social-top-communities-001").getAttribute("href")).endsWith("/VATRA/communities"));
  assert.equal(await feedProbe.locator("#feed-search-input").count(),1);
  assert.equal(await feedProbe.locator(".ui-feed-music-button-001").count(),1);
  assert.equal(await feedProbe.locator(".ui-feed-notifications-button-001").count(),1);
  assert.equal(await feedProbe.locator(".feed-account-toggle").count(),1);
  assert.equal((await feedProbe.locator("#feed-menu-name").textContent()).trim(),"Тест",
   "Only the member's given name appears immediately after the avatar");
  assert.equal(await feedProbe.locator(".feed-account-toggle #feed-menu-name").count(),1,
   "The account name must be inside the rounded avatar pill");
  assert.equal(await feedProbe.locator(".feed-account-dropdown #feed-menu-name").count(),0);
  const headerOrder=await feedProbe.evaluate(()=>{
   const controls=document.querySelector(".feed-header-controls");
   const direct=[...controls.children].map(el=>el.className.split(" ").find(c=>c.startsWith("ui-")||c.startsWith("vt-")));
   return direct;
  });
  assert.deepEqual(headerOrder,["ui-shell-header-messenger-001",
    "ui-feed-notifications-button-001","ui-feed-music-button-001",
    "ui-feed-account-menu-001"],
   "Right controls must be Messenger, notifications, music and the avatar-name pill");
  assert.equal(await feedProbe.locator(".feed-header .feed-search-form").isVisible(),true,
   "Search VATRA must be next to the V logo on every page");
  const searchStyles=await feedProbe.evaluate(()=>{
   const input=document.querySelector("#feed-search-input");
   const field=document.querySelector(".feed-header .feed-search-form");
   const nav=[...document.querySelectorAll(".social-top-link")];
   return {font:getComputedStyle(input).fontFamily,size:parseFloat(getComputedStyle(input).fontSize),
    border:getComputedStyle(field).borderColor,
    colors:nav.map(el=>getComputedStyle(el).color),
    activeBackground:getComputedStyle(document.querySelector(".social-top-active")).backgroundColor};
  });
  assert.ok(searchStyles.font.includes("Onest")&&searchStyles.size>=14,
   "The search box must use the same VATRA Onest typography as authentication forms");
  assert.equal(new Set(searchStyles.colors).size,1,
   "Every top navigation icon must have the same neutral color");
  assert.equal(searchStyles.activeBackground,"rgba(0, 0, 0, 0)",
   "Selected navigation is underline-only, never a filled background");
  await feedProbe.evaluate(()=>{
   localStorage.setItem("vatra.search.history.v1",JSON.stringify(
    Array.from({length:12},(_,i)=>"VATRA запит "+(12-i))));
   dispatchEvent(new StorageEvent("storage",{key:"vatra.search.history.v1"}));
  });
  await feedProbe.locator("#feed-search-input").click();
  assert.equal(await feedProbe.locator("#vatra-search-panel").isVisible(),true,
   "Search history must open on input focus");
  assert.equal(await feedProbe.locator("#vatra-search-back").isVisible(),true,
   "Search focus replaces the logo with a back arrow without shifting the header");
  assert.equal((await feedProbe.locator(".vt-search-panel-heading-001").innerText()).trim(),
   language==="en"?"Recent":"Нещодавні");
  assert.equal((await feedProbe.locator("#vatra-search-edit").innerText()).trim(),
   language==="en"?"Edit":"Редагувати");
  assert.equal(await feedProbe.locator(".vatra-search-scope").isVisible(),false,
   "Recent searches use a clean, Facebook-like history panel until a query is typed");
  assert.equal(await feedProbe.locator(".vatra-search-history-row").count(),12,
   "All history entries remain available beyond five visible rows");
  assert.equal((await feedProbe.locator(".vatra-search-history-term").first().innerText()).trim(),
   "VATRA запит 12","Search history must display newest first");
  // Read final geometry after the native 5px entrance transition.
  await feedProbe.waitForFunction(()=>{
   const panel=document.querySelector("#vatra-search-panel")?.getBoundingClientRect();
   const header=document.querySelector(".feed-header")?.getBoundingClientRect();
   const first=document.querySelector(".vatra-search-panel-header")?.getBoundingClientRect();
   return panel&&header&&first&&Math.abs(panel.top-header.top)<=2&&first.top>=header.bottom-2;
  },null,{timeout:3500});
  const menuGeometry=await feedProbe.evaluate(()=>{
   const panel=document.querySelector("#vatra-search-panel");
   const p=panel.getBoundingClientRect();
   const l=document.querySelector("#vatra-search-history");
   const header=document.querySelector(".feed-header").getBoundingClientRect();
   const first=document.querySelector(".vatra-search-panel-header").getBoundingClientRect();
   const navigation=[...document.querySelectorAll(".social-top-link")].map(el=>{
    const rect=el.getBoundingClientRect();return rect.left+rect.width/2;
   });
   return {left:p.left,right:p.right,top:p.top,bottom:p.bottom,
    viewportWidth:innerWidth,viewportHeight:innerHeight,
    scrollHeight:l.scrollHeight,clientHeight:l.clientHeight,
    headerTop:header.top,headerBottom:header.bottom,firstRowTop:first.top,
    panelZ:parseInt(getComputedStyle(panel).zIndex),
    headerZ:parseInt(getComputedStyle(document.querySelector(".feed-header")).zIndex),
    navigation};
  });
  assert.ok(Math.abs(menuGeometry.top-menuGeometry.headerTop)<=2&&
   menuGeometry.firstRowTop>=menuGeometry.headerBottom-2&&
   menuGeometry.panelZ<menuGeometry.headerZ,
   "Search must appear as one continuous overlay behind the stable header: "+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.left>=0&&menuGeometry.right<=menuGeometry.viewportWidth+1&&
   menuGeometry.top>=0&&menuGeometry.bottom<=menuGeometry.viewportHeight+1&&
   menuGeometry.scrollHeight>menuGeometry.clientHeight&&
   menuGeometry.clientHeight<=291,
   "VATRA search menu must fit viewport and scroll beyond five items: "+JSON.stringify(menuGeometry));
  await feedProbe.locator("#vatra-search-edit").click();
  assert.equal((await feedProbe.locator("#vatra-search-edit").innerText()).trim(),
   language==="en"?"Done":"Готово");
  assert.equal(await feedProbe.locator("#vatra-search-clear").isVisible(),true,
   "Edit mode exposes a clear-all history action");
  await feedProbe.locator("#vatra-search-edit").click();
  assert.equal(await feedProbe.locator("#vatra-search-clear").isVisible(),false);
  await feedProbe.locator(".vatra-search-history-remove").first().click();
  assert.equal(await feedProbe.locator(".vatra-search-history-row").count(),11);
  assert.equal(await feedProbe.evaluate(()=>JSON.parse(localStorage.getItem("vatra.search.history.v1")).length),11,
   "Deleting one history item must persist immediately in localStorage");
  await feedProbe.keyboard.press("Escape");
  assert.equal(await feedProbe.locator("#vatra-search-panel").isVisible(),false,
   "Escape closes the VATRA search menu");
  await feedProbe.locator("#feed-search-input").click();
  await feedProbe.locator("#vatra-search-back").click();
  assert.equal(await feedProbe.locator("#vatra-search-panel").isVisible(),false,
   "Back closes Recent searches and restores the VATRA logo");
  assert.equal(await feedProbe.locator(".feed-header-brand").isVisible(),true);

  assert.equal(await feedProbe.locator(".feed-stories").isVisible(),true);
  assert.equal(await feedProbe.locator(".feed-story-preview").count(),0,
   "No friends means no fabricated Story previews");
  assert.equal(await feedProbe.locator("#feed-friend-stories").count(),1);
  assert.equal(await feedProbe.locator(".feed-story-empty-note").count(),0,
   "A missing story must not create an explanatory row");
  assert.equal(await feedProbe.locator(".feed-stories").evaluate(el=>el.classList.contains("is-empty")),true);
  assert.equal(await feedProbe.locator(".ui-feed-story-logo-001").isVisible(),false);
  await feedProbe.locator("#feed-create-story").click();
  assert.equal(await feedProbe.locator("#feed-story-dialog").evaluate(el=>el.open),true);
  await feedProbe.locator("#feed-story-cancel").click();
  assert.equal(await feedProbe.locator("#feed-story-dialog").evaluate(el=>el.open),false);
  const composerFirst=await feedProbe.evaluate(()=>{
   const composer=document.querySelector(".feed-quick-compose").getBoundingClientRect();
   const stories=document.querySelector(".feed-stories").getBoundingClientRect();
   const posts=document.querySelector(".feed-posts-section").getBoundingClientRect();
   return composer.top<stories.top&&stories.top<posts.top&&
    composer.top>=document.querySelector(".feed-header").getBoundingClientRect().bottom-1;
  });
  assert.ok(composerFirst,"Composer, then Stories, then posts");
  await feedProbe.locator(".ui-social-top-friends-001").hover();
  assert.equal(await feedProbe.locator(".vatra-shell-tooltip").getAttribute("data-open"),"true",
   "Each header icon needs a VATRA tooltip on hover");
  const tip=await feedProbe.evaluate(()=>{
   const r=document.querySelector(".vatra-shell-tooltip").getBoundingClientRect();
   const style=getComputedStyle(document.querySelector(".vatra-shell-tooltip"));
   return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight,
    background:style.backgroundColor,color:style.color};
  });
  assert.equal(tip.background,"rgb(255, 255, 255)","VATRA icon tips must match the white auth tooltip");
  assert.ok(tip.left>=0&&tip.right<=tip.w+1&&tip.top>=0&&tip.bottom<=tip.h+1,
   "Header tooltip must be kept inside viewport: "+JSON.stringify(tip));
  await feedProbe.mouse.move(16,420);
  assert.equal(await feedProbe.locator(".vatra-shell-tooltip").getAttribute("data-open"),"false",
   "Tooltip must dismiss immediately when the pointer leaves the header icon");
  await feedProbe.locator(".ui-social-top-friends-001").click();
  assert.equal(await feedProbe.locator(".vatra-shell-dialog").evaluate(el=>el.open),true,
   "The Friends icon must offer a real interactive status instead of being disabled");
  await feedProbe.locator(".vatra-shell-dialog-close").click();
  assert.equal(await feedProbe.locator(".vatra-shell-dialog").evaluate(el=>el.open),false);
  await feedProbe.locator(".feed-account-toggle").click();
  assert.equal(await feedProbe.locator(".feed-account-dropdown").isVisible(),true,
   "Avatar must reveal the account menu");
  // Open details can leave the cursor over the avatar. Repeated pointer motion
  // must not revive the menu tooltip above the dropdown.
  await feedProbe.locator(".feed-account-toggle").hover();
  assert.equal(await feedProbe.locator(".vatra-shell-tooltip").getAttribute("data-open"),"false",
   "Account tooltip must not cover an expanded account dropdown");
  const menuTipStyle=await feedProbe.locator(".vatra-shell-tooltip").evaluate(el=>getComputedStyle(el).visibility);
  assert.equal(menuTipStyle,"hidden",
   "Expanded account dropdown must fully suppress VATRA tooltip rendering");
  assert.ok((await feedProbe.locator(".feed-account-profile").getAttribute("href")).endsWith("/VATRA/id654321"));
  assert.equal(await feedProbe.locator(".feed-menu-support").getAttribute("href"),
   "mailto:vatra.support@gmail.com");
  assert.equal(await feedProbe.locator(".feed-account-dropdown > a").count(),2);
  assert.equal(await feedProbe.locator(".feed-account-dropdown > button").count(),1);
  assert.equal(await feedProbe.locator(".feed-account-dropdown > svg").count(),0);
  assert.equal(await feedProbe.locator(".feed-account-profile > svg").count(),1);
  assert.equal(await feedProbe.locator(".feed-menu-settings-toggle > svg").count(),1);
  assert.equal(await feedProbe.locator(".feed-menu-support > svg").count(),1);
  assert.equal(await feedProbe.locator("#feed-logout > svg").count(),1,
   "All account actions must have persistent SVG icons in UK and EN");
  assert.equal((await feedProbe.locator(".vt-vatra-account-settings-label-001").textContent()).trim(),
   language==="en"?"Settings":"Налаштування");
  await feedProbe.locator(".feed-menu-settings-toggle").click();
  assert.equal(await feedProbe.locator(".feed-language-trigger").isVisible(),true,
   "Settings must provide real language controls");
  // The right account panel must be flush to the common header edge,
  // not a floating card with a 10px gap or a displaced navigation row.
  const navBeforeMenu=await navCenters(feedProbe);
  const checkAccountGeometry=()=>feedProbe.evaluate(()=>{
   const r=document.querySelector(".feed-account-dropdown").getBoundingClientRect();
   const header=document.querySelector(".feed-header").getBoundingClientRect();
   const dropdown=document.querySelector(".feed-account-dropdown");
   return {left:r.left,right:r.right,width:innerWidth,top:r.top,bottom:r.bottom,
    height:innerHeight,headerBottom:header.bottom,headerRight:header.right,
    positioned:!!dropdown.style.getPropertyValue("--vatra-account-dropdown-top")};
  });
  await feedProbe.waitForFunction(()=>
   !!document.querySelector(".feed-account-dropdown").style.getPropertyValue("--vatra-account-dropdown-top"));
  const menuRect=await checkAccountGeometry();
  assert.ok(menuRect.left>=0&&menuRect.right<=menuRect.width+1&&
   menuRect.top>=0&&menuRect.bottom<=menuRect.height+1&&
   Math.abs(menuRect.top-menuRect.headerBottom)<=2&&
   Math.abs(menuRect.right-menuRect.headerRight)<=2,
   "Avatar menu must join the right edge of the header: "+JSON.stringify(menuRect));
  assert.deepEqual(await navCenters(feedProbe),navBeforeMenu,
   "Opening account menu must not move header icons");
  const savedViewport=feedProbe.viewportSize();
  await feedProbe.setViewportSize({width:600,height:800});
  await feedProbe.waitForFunction(()=>{
   const menu=document.querySelector(".feed-account-dropdown").getBoundingClientRect();
   const header=document.querySelector(".feed-header").getBoundingClientRect();
   return Math.abs(menu.top-header.bottom)<=2&&Math.abs(menu.right-header.right)<=2;
  },null,{timeout:3500});
  const mobileMenu=await checkAccountGeometry();
  assert.ok(Math.abs(mobileMenu.top-mobileMenu.headerBottom)<=2&&
   Math.abs(mobileMenu.right-mobileMenu.headerRight)<=2&&
   mobileMenu.left>=-1&&mobileMenu.bottom<=mobileMenu.height+1,
   "Account menu must join the two-row mobile header too: "+JSON.stringify(mobileMenu));
  await feedProbe.setViewportSize(savedViewport);
  await feedProbe.keyboard.press("Escape");
  assert.equal(await feedProbe.locator(".feed-account-dropdown").isVisible(),false,
   "Escape must close the account dropdown");
  assert.equal(await feedProbe.locator("footer").count(),0,
   "Signed-in VATRA Feed must not show a footer");
  assert.ok(new URL(feedProbe.url()).pathname.endsWith("/VATRA/feed"),
   "Feed must use an extensionless public URL");
  assert.equal(await feedProbe.locator(".feed-nav-pending").count(),0);
  assert.equal(await feedProbe.locator("#feed-my-id").count(),0);
  assert.ok((await feedProbe.locator(".feed-account-profile").getAttribute("href")).endsWith("/VATRA/id654321"),
   "Avatar menu must target the signed-in member's numeric ID");
  const injectionText="<img src=x onerror=alert(1)> VATRA";
  await feedProbe.evaluate(text=>{
   window.__feedTestPosts.unshift({id:"feed-manual-post-1",author_id:"feed-mock-user",
    author_vatra_id:654321,body:text,created_at:new Date().toISOString()});
  },injectionText);
  await feedProbe.locator("#feed-search-input").press("Enter");
  await feedProbe.waitForFunction(()=>document.querySelectorAll(".feed-post-card").length===1);
  assert.ok((await feedProbe.locator(".feed-post-profile-link").getAttribute("href")).endsWith("/VATRA/id654321"),
   "Feed author names must link to numeric member profile URLs");
  assert.ok((await feedProbe.locator(".feed-post-profile-avatar").getAttribute("href")).endsWith("/VATRA/id654321"),
   "Feed author avatars must link to numeric member profile URLs");
  assert.equal((await feedProbe.locator(".feed-post-body").textContent()).trim(),injectionText,
   "Feed must render user posts as text, not HTML");
  assert.equal(await feedProbe.locator(".feed-post-body img").count(),0);
  await feedProbe.locator(".feed-post-delete").click();
  assert.equal(await feedProbe.locator("#feed-delete-dialog").evaluate(el=>el.open),true);
  await feedProbe.locator("#feed-delete-cancel").click();
  assert.equal(await feedProbe.locator(".feed-post-card").count(),1,"Cancelling must not delete a post");
  await feedProbe.locator(".feed-post-delete").click();
  await feedProbe.locator("#feed-delete-confirm").click();
  await feedProbe.waitForFunction(()=>document.querySelectorAll(".feed-post-card").length===0);
  await feedProbe.locator("#feed-empty").waitFor({state:"visible",timeout:4500});
  assert.equal(await feedProbe.locator("#feed-empty").isVisible(),true);
  await feedProbe.locator("#feed-search-input").fill("Новий пошук VATRA");
  await feedProbe.locator("#feed-search-input").press("Enter");
  await feedProbe.waitForFunction(()=>
   JSON.parse(localStorage.getItem("vatra.search.history.v1")||"[]")[0]==="Новий пошук VATRA");
  assert.equal(await feedProbe.locator("#vatra-search-panel").isVisible(),false,
   "Submit persists the latest query and closes the search menu");
  const mobileGeometry=await feedProbe.evaluate(()=>({
   overflow:document.documentElement.scrollWidth-innerWidth,
   culprits:[...document.querySelectorAll("body *")].map(el=>{
    const rect=el.getBoundingClientRect();
    return {tag:el.tagName.toLowerCase(),cls:String(el.className?.baseVal||el.className||"").slice(0,105),
     left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)};
   }).filter(rect=>rect.right>innerWidth+3||rect.left< -3).slice(0,20)
  }));
  assert.ok(mobileGeometry.overflow<=3,
   "Feed must fit viewport: "+language+" "+JSON.stringify(mobileGeometry));
  assert.deepEqual(feedErrors,[],"Feed JavaScript error: "+language);
   assert.equal(await feedProbe.locator("#vatra-tour-dialog").count(),0,
    "The removed VATRA tour must not appear in the DOM");
  await feedProbe.close();
  const profilePage=await feedContext.newPage();
  // The public cover is a real image now; serve a deterministic pixel in mocks.
  await profilePage.route("**/storage/v1/object/public/vatra-covers/**",route=>route.fulfill({
   status:200,contentType:"image/gif",
   body:Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=","base64")
  }));
  if(language==="uk")await profilePage.setViewportSize({width:1366,height:844});
  await profilePage.addInitScript(lang=>localStorage.setItem("vatra-language",lang),language);
  await profilePage.goto(base+"profile",{waitUntil:"domcontentloaded"});
  assert.equal(await profilePage.locator(".vatra-route-skeleton").count(),1,
   "The profile must have a structural skeleton instead of the VATRA loading logo");
  await profilePage.locator("#profile-app").waitFor({state:"visible",timeout:14000});
  await profilePage.locator("#profile-cover-view").waitFor({state:"visible",timeout:14000});
  await profilePage.locator("#profile-cover-view").waitFor({state:"visible",timeout:14000});
  // A saved cover should open the original image in a genuine full-viewport
  // modal, not remain trapped as a tiny background behind the profile header.
  assert.equal(await profilePage.locator("#profile-cover-view").isVisible(),true);
  await profilePage.locator("#profile-cover-view").click({position:{x:80,y:80}});
  assert.equal(await profilePage.locator("#profile-media-viewer").evaluate(el=>el.open),true);
  const coverViewer=await profilePage.evaluate(()=>{
   const dialog=document.querySelector("#profile-media-viewer");
   const image=document.querySelector("#profile-media-viewer-image");
   return {width:dialog.getBoundingClientRect().width,height:dialog.getBoundingClientRect().height,
    viewportWidth:innerWidth,viewportHeight:innerHeight,source:image.src};
  });
  assert.ok(Math.abs(coverViewer.width-coverViewer.viewportWidth)<=2&&
   Math.abs(coverViewer.height-coverViewer.viewportHeight)<=2&&
   coverViewer.source.includes("/vatra-covers/654321/cover/test-cover.webp"),
   "Cover photo should fill the viewer viewport without cropping the original: "+JSON.stringify(coverViewer));
  await profilePage.locator("#profile-media-viewer-close").click();
  assert.equal(await profilePage.locator("#profile-media-viewer").evaluate(el=>el.open),false);
  const storyAvatar=profilePage.locator("#profile-avatar-wrap");
  assert.equal(await storyAvatar.evaluate(el=>el.classList.contains("has-active-story")),true,
   "Only a visible active story should create a colored avatar ring");
  await profilePage.locator("#profile-avatar-trigger").hover();
  assert.equal(await profilePage.locator("#profile-avatar-menu").isVisible(),true);
  assert.equal(await profilePage.locator("#profile-avatar-story").isVisible(),true);
  assert.equal(await profilePage.locator("#profile-avatar-photo").isVisible(),true);
  const avatarMenuRect=await profilePage.locator("#profile-avatar-menu").boundingBox();
  assert.ok(avatarMenuRect&&avatarMenuRect.width>=200,
   "Avatar hover actions must not be clipped by the profile card");
  await profilePage.locator("#profile-avatar-story").click();
  assert.equal(await profilePage.locator("#profile-story-viewer").evaluate(el=>el.open),true);
  assert.equal((await profilePage.locator("#profile-story-viewer-text").textContent()).trim(),
   "Моя тестова історія");
  await profilePage.locator("#profile-story-viewer-close").click();
  await profilePage.locator("#profile-avatar-trigger").hover();
  await profilePage.locator("#profile-avatar-photo").click();
  assert.equal(await profilePage.locator("#profile-media-viewer").evaluate(el=>el.open),true);
  assert.ok((await profilePage.locator("#profile-media-viewer-image").getAttribute("src"))
   .includes("/vatra-avatars/654321/avatar/test-profile.webp"));
  await profilePage.keyboard.press("Escape");
  assert.equal(await profilePage.locator("#profile-media-viewer").evaluate(el=>el.open),false,
   "Escape should close the fullscreen avatar viewer");
  await profilePage.locator("#profile-avatar-trigger").hover();
  assert.equal(await profilePage.locator("#profile-avatar-story-delete").isVisible(),true,
   "The profile owner must be able to delete the active story");
  profilePage.once("dialog",dialog=>dialog.accept());
  await profilePage.locator("#profile-avatar-story-delete").click();
  await profilePage.waitForFunction(()=>!document.querySelector("#profile-avatar-wrap").classList.contains("has-active-story"));
  assert.equal(await profilePage.locator("#profile-avatar-story-delete").isVisible(),false,
   "Deleting a story must immediately remove its menu action and ring");
  const profileCoverGap=await profilePage.evaluate(()=>{
   const header=document.querySelector(".feed-header").getBoundingClientRect();
   const cover=document.querySelector(".profile-cover").getBoundingClientRect();
   return cover.top-header.bottom;
  });
  assert.ok(Math.abs(profileCoverGap)<=2,
   "Member cover must begin directly below the header without a top gap: "+profileCoverGap);
  await profilePage.waitForFunction(()=>document.querySelector("#profile-cover-image")?.classList.contains("has-photo"));
  const coverArtwork=await profilePage.evaluate(()=>{
   const cover=document.querySelector("#profile-cover-image");
   const photo=document.querySelector("#profile-cover-photo");
   const motif=cover.querySelector(".profile-cover-motif");
   const label=cover.querySelector(".profile-cover-signature");
   return {
    before:getComputedStyle(cover,"::before").display,
    after:getComputedStyle(cover,"::after").display,
    motif:getComputedStyle(motif).display,
    signature:getComputedStyle(label).display,
    photoFit:getComputedStyle(photo).objectFit,
    photoFilter:getComputedStyle(photo).filter,
    imageLoaded:photo.complete&&photo.naturalWidth>0&&!photo.hidden
   };
  });
  assert.deepEqual(coverArtwork,{
   before:"none",after:"none",motif:"none",signature:"none",
   photoFit:"cover",photoFilter:"none",imageLoaded:true
  },"Uploaded member cover must be a crisp rectangular image without decorative layers");
  if(language==="uk")assertStableHeader(await navCenters(profilePage),"Profile");
  assert.equal((await profilePage.locator("#profile-heading").textContent()).trim(),"Тест VATRA");
  assert.equal(await profilePage.locator(".feed-sidebar").count(),0,
   "Profile has only the actual header navigation");
  assert.equal(await profilePage.locator(".social-top-nav").isVisible(),true);
  assert.equal(await profilePage.locator(".feed-header .feed-search-form").isVisible(),true,
   "Profiles must use the same header search as the Feed");
  assert.equal(await profilePage.locator(".social-profile-tabs").isVisible(),true,
   "Profile must have a visible navigation bar beneath the cover");
  assert.equal(await profilePage.locator("[data-profile-tab]").count(),4,
   "Profile has Posts, Friends, Photos and Videos; private owner hides Friends");
  assert.equal(await profilePage.locator("#profile-tab-friends").isVisible(),false,
   "Only visitors see the Friends tab");
  assert.equal(await profilePage.locator("#profile-edit-open").isVisible(),true,
   "Owner edits status and profile photos in one dialog");
  assert.equal(await profilePage.locator("#profile-write-post").isVisible(),true);
  assert.equal((await profilePage.locator("#profile-write-post").innerText()).trim(),
   language==="en"?"Add publication":"Додати публікацію");
  assert.equal(await profilePage.locator("#profile-edit-open svg").count(),1,
   "Owner's edit action must preserve its VATRA icon after localization");
  assert.equal(await profilePage.locator("#profile-write-post svg").count(),1,
   "Owner's publication action must have a VATRA icon");
  assert.equal(await profilePage.locator("#profile-posts-section").isVisible(),true);
  assert.equal(await profilePage.locator("#profile-about-card").isVisible(),true,
   "Information must be beside compact posts instead of its own tab");
  await profilePage.locator("#profile-status").click();
  assert.equal(await profilePage.locator("#profile-edit-dialog").evaluate(el=>el.open),true,
   "Clicking Add status itself must open the real editor");
  await profilePage.locator("#profile-edit-cancel").click();
  await profilePage.locator("#profile-edit-open").click();
  assert.equal(await profilePage.locator("#profile-edit-dialog").evaluate(el=>el.open),true);
  await profilePage.locator("#profile-edit-cancel").click();
  await profilePage.locator("#profile-tab-photos").click();
  assert.equal(await profilePage.locator("#profile-photos-section").isVisible(),true,
   "Photo tab must open a real on-demand gallery");
  await profilePage.locator("#profile-tab-videos").click();
  assert.equal(await profilePage.locator("#profile-videos-section").isVisible(),true,
   "Video tab must open a real on-demand gallery");
  await profilePage.locator("#profile-tab-posts").click();
  assert.equal(await profilePage.locator("#profile-write-post").isVisible(),true,
   "Only the signed-in member may open the real post creator on their profile");
  await profilePage.locator("#profile-write-post").click();
  assert.equal(await profilePage.locator("#profile-compose-dialog").evaluate(el=>el.open),true);
  await profilePage.locator("#profile-compose-text").fill(injectionText);
  await profilePage.locator("#profile-compose-submit").click();
  await profilePage.waitForFunction(()=>document.querySelectorAll("#profile-posts .feed-post-card").length===1);
  assert.equal((await profilePage.locator("#profile-posts .feed-post-body").textContent()).trim(),injectionText);
  assert.equal(await profilePage.locator("#profile-posts img").count(),0,
   "Profile posts render user input as text, not executable HTML");
  assert.equal(await profilePage.locator("#profile-compose-dialog").evaluate(el=>el.open),false);
  assert.equal((await profilePage.locator("#profile-status").textContent()).trim(),
   language==="en"?"Add a status":"Додайте статус");
  assert.equal(await profilePage.locator("footer").count(),0,
   "The personal profile must not show guest legal footer");
  assert.ok(new URL(profilePage.url()).pathname.endsWith("/VATRA/id654321"),
   "Own profile must canonicalize to /VATRA/id654321");
  const profileNavigations=[];
  profilePage.on("framenavigated",frame=>{
   if(frame===profilePage.mainFrame())profileNavigations.push(new URL(frame.url()).pathname);
  });
  // Slow the intermediate /profile.html fetch: the 404 route must display
  // the SAME splash instead of leaving a white page, in both UK and EN.
  await profilePage.route("**/VATRA/profile.html",async route=>{
   await new Promise(resolve=>setTimeout(resolve,850));
   await route.continue();
  });
  await profilePage.goto(base+"id789012",{waitUntil:"domcontentloaded"});
  await profilePage.waitForFunction(()=>{
   const loader=document.querySelector("#vatra-dynamic-route-loading");
   return loader&&document.documentElement.classList.contains("vatra-dynamic-route-pending")&&
    getComputedStyle(loader).visibility==="visible"&&
    getComputedStyle(loader).opacity==="1"&&loader.getBoundingClientRect().width>0;
  },null,{timeout:2500});
  await profilePage.locator("#profile-app").waitFor({state:"visible",timeout:14000});
  assert.equal(await profilePage.locator("#vatra-dynamic-route-loading").count(),0,
   "Temporary GitHub Pages route splash must be replaced by the real profile");
  assert.ok(new URL(profilePage.url()).pathname.endsWith("/VATRA/id789012"),
   "A direct link to another member must retain their numeric ID");
  assert.ok(profileNavigations.every(path=>!path.includes("/profile")),
   "Opening /idN must never navigate through an intermediate /profile URL: "+JSON.stringify(profileNavigations));
  assert.equal(await profilePage.locator("#profile-status").isVisible(),false,
   "A visitor sees no placeholder when another member has not set a status");
  assert.equal((await profilePage.locator("#profile-heading").textContent()).trim(),
   language==="en"?"VATRA member · ID 789012":"Учасник VATRA · ID 789012");
  assert.equal(await profilePage.locator("#profile-write-post").isVisible(),false,
   "The personal post action must not appear on other members' profiles");
  assert.equal(await profilePage.locator("#profile-friend-button").isVisible(),true,
   "Other member profile must offer Add Friend");
  assert.equal(await profilePage.locator("#profile-message-button").isVisible(),true,
   "Other member profile must offer private Message");
  assert.equal(await profilePage.locator("#profile-friend-button svg").count(),1,
   "Visitor's add-friend button needs a persistent line icon");
  assert.equal(await profilePage.locator("#profile-message-button svg").count(),1,
   "Visitor's message button needs a persistent line icon");
  assert.equal(await profilePage.locator("#profile-tab-friends").isVisible(),true,
   "Visitors have a Friends tab but cannot access private friend lists");
  assert.equal(await profilePage.locator("#profile-edit-open").isVisible(),false,
   "Visitors cannot edit another member's page");
  await profilePage.locator("#profile-message-button").click();
  assert.equal(await profilePage.locator("#profile-message-dialog").evaluate(el=>el.open),true,
   "Message button must open the private conversation dialog");
  await profilePage.locator("#profile-message-close").click();
  assert.equal(await profilePage.locator("#profile-message-dialog").evaluate(el=>el.open),false);
  assert.equal((await profilePage.locator("#feed-menu-name").textContent()).trim(),"Тест",
   "The header must retain the signed-in first name when viewing another profile");
  assert.equal((await profilePage.locator("#feed-menu-name").textContent()).trim(),"Тест",
   "Own given name beside avatar must not be replaced by the visited member's identity");
  await profilePage.goto(base+"id999999",{waitUntil:"domcontentloaded"});
  await profilePage.locator("#profile-app").waitFor({state:"visible",timeout:14000});
  assert.equal((await profilePage.locator("#profile-heading").textContent()).trim(),
   language==="en"?"User not found":"Користувача не знайдено");
  assert.equal(await profilePage.locator(".profile-hero").isVisible(),true);
  assert.equal(await profilePage.locator("#profile-cover-image").isVisible(),true);
  assert.equal(await profilePage.locator("#profile-avatar").isVisible(),true);
  assert.equal(await profilePage.locator(".profile-actions").count(),0);
  assert.equal(await profilePage.locator(".profile-panels").count(),0);
  assert.equal(await profilePage.locator(".social-profile-tabs").count(),0,
   "Missing profile keeps default cover and avatar without fake actions");
  await profilePage.waitForFunction(()=>document.querySelector("#feed-header-avatar")?.classList.contains("has-photo"));
  assert.equal(await profilePage.locator("#feed-header-avatar").evaluate(el=>el.classList.contains("has-photo")),true,
   "Own header photo must persist on a missing VATRA ID");
  await profilePage.close();
 }
 await feedContext.close();
 console.log("VATRA Feed and Profile: UK/EN publishing, secured profile and mobile layout: OK");

 // Communities use a separate immutable sequence and canonical /clubN URLs.
 // Mock Supabase only: never create real communities during CI.
 const clubContext=await browser.newContext({locale:"uk-UA",serviceWorkers:"block"});
 await clubContext.route("**/assets/js/host.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
 }));
 await clubContext.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:`
  window.supabase={createClient:()=>({
   auth:{
    getUser:async()=>({data:{user:{id:"club-mock-user",
     email_confirmed_at:"2026-11-09T00:00:00Z",
     user_metadata:{first_name:"Тест",last_name:"VATRA"}}},error:null}),
    signOut:async()=>({error:null})
   },
   from:table=>table==="accounts"?
    {select:()=>({eq:()=>({maybeSingle:async()=>({data:{vatra_id:654321},error:null})})})}:
    {
     select:()=>({
      term:"",
      eq:(_field,id)=>({maybeSingle:async()=>{
       await new Promise(resolve=>setTimeout(resolve,270));
       return {data:JSON.parse(localStorage.getItem("vatra-test-clubs")||"[]").find(x=>String(x.club_id)===String(id))||null,error:null};
      }}),
      ilike(_field,pattern){this.term=String(pattern).replace(/^%|%$/g,"").toLocaleLowerCase();return this;},
      order(){return this;},
      limit:async function(){await new Promise(resolve=>setTimeout(resolve,270));return {
       data:JSON.parse(localStorage.getItem("vatra-test-clubs")||"[]")
        .filter(club=>!this.term||club.name.toLocaleLowerCase().includes(this.term)),error:null
      };}
     }),
     insert:data=>({select:()=>({single:async()=>{
      const all=JSON.parse(localStorage.getItem("vatra-test-clubs")||"[]");
      const club={club_id:all.length+1,...data,created_at:new Date().toISOString()};
      all.push(club);localStorage.setItem("vatra-test-clubs",JSON.stringify(all));
      return {data:{club_id:club.club_id},error:null};
     }})})
    }
  })};
  `
 }));
 for(const language of ["uk","en"]){
  await clubContext.addCookies([{name:"vatra-language",value:language,url:base}]);
  const page=await clubContext.newPage();
  if(language==="uk")await page.setViewportSize({width:1366,height:844});
  await page.addInitScript(lang=>{
   localStorage.setItem("vatra-language",lang);
  },language);
  const pageErrors=[];
  page.on("pageerror",err=>pageErrors.push(err.message));
  await page.goto(base+"communities",{waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("#community-loading").isVisible(),true,
   "Communities loader must wait for the first directory query");
  await page.locator("#community-app").waitFor({state:"visible",timeout:15000});
  await page.waitForFunction(()=>document.body.dataset.authReady==="true",null,{timeout:15000});
  if(language==="uk")assertStableHeader(await navCenters(page),"Communities");
  assert.equal((await page.locator(".vt-communities-title-001").textContent()).trim(),
   language==="en"?"Communities":"Спільноти");
  assert.equal(await page.locator(".feed-sidebar").count(),0,
   "Communities has only the actual header navigation");
  assert.equal(await page.locator(".social-top-nav").isVisible(),true);
  assert.equal(await page.locator(".feed-header .feed-search-form").isVisible(),true,
   "Communities must share the same header search");
  assert.equal(await page.locator(".feed-nav-pending").count(),0);
  assert.equal(await page.locator("footer").count(),0);
  await page.evaluate(()=>localStorage.removeItem("vatra-test-clubs"));
  assert.equal(await page.locator("#community-create-panel").isVisible(),false,
   "Community creation must be collapsed until explicitly requested");
  await page.locator("#community-create-toggle").click();
  assert.equal(await page.locator("#community-create-toggle").getAttribute("aria-expanded"),"true");
  assert.equal(await page.locator("#community-create-panel").isVisible(),true);
  await page.locator("#community-name").fill("Спільнота тесту");
  await page.locator("#community-description").fill("Опис перевірки");
  const clubNavigations=[];
  page.on("framenavigated",frame=>{
   if(frame===page.mainFrame())clubNavigations.push(new URL(frame.url()).pathname);
  });
  await page.locator("#community-create-submit").click();
  await page.waitForURL("**/club1",{timeout:16000});
  await page.locator("#club-heading").waitFor({state:"visible",timeout:16000});
  if(language==="uk")assertStableHeader(await navCenters(page),"Club");
  assert.equal((await page.locator("#club-heading").textContent()).trim(),"Спільнота тесту");
  assert.equal((await page.locator("#club-public-id").textContent()).trim(),"Club ID 1");
  assert.equal((await page.locator("#club-description").textContent()).trim(),"Опис перевірки");
  assert.ok(clubNavigations.every(path=>!path.includes("/club.html")),
   "Opening /clubN must not display the intermediate static club.html URL");
  await page.goto(base+"club999",{waitUntil:"domcontentloaded"});
  await page.locator("#community-app").waitFor({state:"visible",timeout:15000});
  await page.waitForFunction(()=>document.body.dataset.authReady==="true",null,{timeout:15000});
  assert.equal((await page.locator("#club-heading").textContent()).trim(),
   language==="en"?"Community not found":"Спільноту не знайдено");
  await page.goto(base+"communities",{waitUntil:"domcontentloaded"});
  await page.locator("#community-app").waitFor({state:"visible",timeout:15000});
  await page.waitForFunction(()=>document.body.dataset.authReady==="true",null,{timeout:15000});
  assert.equal(await page.locator(".ui-community-card-001").count(),1);
  assert.ok((await page.locator(".ui-community-card-001").getAttribute("href")).endsWith("/VATRA/club1"));
  await page.goto(base+"communities?q="+encodeURIComponent("Спільнота"),{waitUntil:"domcontentloaded"});
  await page.locator("#community-app").waitFor({state:"visible",timeout:15000});
  await page.waitForFunction(()=>document.body.dataset.authReady==="true",null,{timeout:15000});
  assert.equal(await page.locator(".ui-community-card-001").count(),1,
   "Searching VATRA communities must filter the directory by name");
  assert.equal(await page.locator("#feed-search-input").inputValue(),"Спільнота");
  await page.goto(base+"communities?q="+encodeURIComponent("Неіснуючий"),{waitUntil:"domcontentloaded"});
  await page.locator("#community-app").waitFor({state:"visible",timeout:15000});
  await page.waitForFunction(()=>document.body.dataset.authReady==="true",null,{timeout:15000});
  assert.equal(await page.locator(".ui-community-card-001").count(),0,
   "Unknown search term must not show unrelated communities");
  assert.deepEqual(pageErrors,[],"Community JavaScript errors: "+language);
  await page.close();
 }
 await clubContext.close();
 console.log("VATRA Communities: UK/EN creation, immutable URLs and missing clubs: OK");


 // A cross-device confirmation must not depend on the PKCE state of the
 // browser where registration started. It also must not leak the token in URL.
 const phoneContext=await browser.newContext({locale:"uk-UA",serviceWorkers:"block",
  viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await phoneContext.route("**/assets/js/host.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
 }));
 await phoneContext.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:`window.supabase={createClient:()=>({
   auth:{
    verifyOtp:async({token_hash,type})=>{
     sessionStorage.setItem("verifiedTokenType",type);
     if(token_hash!=="valid-other-device-token")return {data:{},error:{code:"otp_expired"}};
     sessionStorage.setItem("emailVerified","1");
     return {data:{user:{id:"mobile-user"}},error:null};
    },
    getUser:async()=>({data:{user:sessionStorage.getItem("emailVerified")==="1"?{
     id:"mobile-user",email:"mobile@vatra.test",email_confirmed_at:"2026-11-09T00:00:00Z",
     user_metadata:{first_name:"Мобільний"}}:null},error:null})
   },
   from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{vatra_id:778899},error:null})})})})
  })};`
 }));
 const phonePage=await phoneContext.newPage();
 await phonePage.goto(base+"verify?token_hash=valid-other-device-token&type=email",
  {waitUntil:"domcontentloaded"});
 await phonePage.waitForURL(/\/feed$/,{timeout:12000});
 await waitReady(phonePage);
 assert.equal(new URL(phonePage.url()).search,"");
 assert.equal(await phonePage.evaluate(()=>sessionStorage.getItem("verifiedTokenType")),"email");
 assert.equal((await phonePage.locator("#feed-menu-name").textContent()).trim(),"Мобільний");
 assert.equal(JSON.parse(await phonePage.evaluate(()=>localStorage.getItem("vatra-remembered-account"))).email,
  "mobile@vatra.test");
 await phonePage.goto(base+"verify?token_hash=expired&type=email",{waitUntil:"domcontentloaded"});
 await waitReady(phonePage);
 assert.ok((await phonePage.locator("#account-title").textContent()).includes("не завершено"));
 assert.equal(await phonePage.locator("#logout").isVisible(),false);
 assert.equal(new URL(phonePage.url()).search,"");
 await phoneContext.close();
 console.log("VATRA cross-device email token: verified, scrubbed from URL, invalid link denied: OK");
 await mkdir("audit-screenshots",{recursive:true});
 const screenSpecs=[
  {width:320,height:700,id:"small"},
  {width:390,height:844,id:"phone"},
  {width:768,height:1024,id:"tablet"},
  {width:1280,height:800,id:"laptop"},
  {width:1920,height:1080,id:"wide"}
 ];
 const routes=[
  {path:"",id:"home"},
  {path:"register.html",id:"signup"},
  {path:"forgot.html",id:"recovery"},
  {path:"reset.html",id:"reset"}
 ];
 for(const [engine,kind] of [["chromium",chromium],["firefox",firefox],["webkit",webkit]]){
  const auditBrowser=await kind.launch({headless:true});
  try{
   const auditContext=await auditBrowser.newContext({
    locale:"uk-UA",serviceWorkers:"block",deviceScaleFactor:2,
    reducedMotion:"reduce"
   });
   await auditContext.route("**/assets/js/host.js",route=>route.fulfill({
    status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
   }));
   await auditContext.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
    status:200,contentType:"text/javascript",
    body:'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})};'
   }));
   for(const viewport of screenSpecs){
    for(const target of routes){
     const view=await auditContext.newPage();
     const errors=[];
     view.on("pageerror",error=>errors.push(error.message));
     await view.setViewportSize({width:viewport.width,height:viewport.height});
     await view.goto(base+target.path,{waitUntil:"domcontentloaded",timeout:20000});
     await waitReady(view);
     await view.evaluate(()=>document.fonts.ready);
     const measurements=await view.evaluate(()=>{
      const viewportWidth=innerWidth;
      const controls=[...document.querySelectorAll("form input,form button,form select,form textarea")];
      const badlyPositioned=controls.filter(element=>{
       const style=getComputedStyle(element);
       if(style.display==="none"||style.visibility==="hidden")return false;
       const bounds=element.getBoundingClientRect();
       return bounds.width>0&&(bounds.left< -3||bounds.right>viewportWidth+3);
      }).slice(0,4).map(el=>({id:el.id,tag:el.tagName}));
      const labelFonts=[...document.querySelectorAll("form input,form button,form select")]
       .filter(el=>getComputedStyle(el).display!=="none")
       .slice(0,16).map(el=>({id:el.id,font:getComputedStyle(el).fontFamily}));
      return {
       overflow:document.documentElement.scrollWidth-viewportWidth,
       controlsOutside:badlyPositioned,
       typefaces:labelFonts,
       title:document.title,
       ready:document.body.dataset.authReady,
       lang:document.documentElement.lang
      };
     });
     assert.equal(measurements.ready,"true");
     assert.ok(measurements.title.length>0);
     assert.ok(measurements.overflow<=3,
      engine+" "+viewport.id+" "+target.id+" horizontal overflow: "+JSON.stringify(measurements));
     assert.deepEqual(measurements.controlsOutside,[],
      engine+" "+viewport.id+" "+target.id+" control outside viewport");
     assert.ok(measurements.typefaces.every(x=>x.font.includes("Onest")),
      engine+" "+viewport.id+" "+target.id+" inconsistent input typography: "+JSON.stringify(measurements.typefaces));
     assert.deepEqual(errors,[],
      engine+" "+viewport.id+" "+target.id+" uncaught JavaScript errors");
     assert.equal(await view.locator(".vatra-error-toast").count(),0,
      engine+" "+viewport.id+" "+target.id+" must not show test-harness warnings over the form");
     if(["phone","tablet","laptop"].includes(viewport.id))
      await view.screenshot({path:"audit-screenshots/"+engine+"-"+viewport.id+"-"+target.id+".png",fullPage:true});
     await view.close();
    }
   }
   // Public documents and 404 have their own responsive headers and TOCs.
   // Check them at portrait, landscape and desktop widths in BOTH UI languages.
   for(const language of ["uk","en"]){
    // A saved language cookie takes precedence over localStorage on VATRA.
    // Match both sources before each native/engine locale matrix.
    await auditContext.addCookies([{name:"vatra-language",value:language,url:base}]);
    for(const viewport of [{width:320,height:700},{width:390,height:844},
     {width:844,height:390},{width:768,height:1024},{width:1440,height:900}]){
     for(const route of ["404.html","terms.html","privacy.html","cookies.html"]){
      const legal=await auditContext.newPage();
      try{
       const errors=[];
       legal.on("pageerror",error=>errors.push(error.message));
       await legal.setViewportSize(viewport);
       await legal.addInitScript(lang=>{localStorage.setItem("vatra-language",lang);},language);
       await legal.goto(base+route,{waitUntil:"domcontentloaded",timeout:20000});
       await legal.waitForFunction(lang=>document.documentElement.lang===lang&&
        !document.documentElement.classList.contains("i18n-pending"),language,{timeout:15000});
       const layout=await legal.evaluate(()=>{
        const selectors=[".footer",".auth-footer-content",
         document.body.classList.contains("policy-page")?".policy-main":".error-main"];
        const outside=selectors.filter(sel=>{
         const r=document.querySelector(sel)?.getBoundingClientRect();
         return r&&r.width>0&&(r.left< -3||r.right>innerWidth+3);
        });
        return {overflow:document.documentElement.scrollWidth-innerWidth,outside,
         documentLang:document.documentElement.lang,
         headerHeight:document.querySelector(".policy-top,.account-top")?.getBoundingClientRect().height,
         footerHeight:document.querySelector(".footer")?.getBoundingClientRect().height,
         errors:[...document.querySelectorAll("img")].filter(i=>!i.complete&&i.getClientRects().length>0).length};
       });
       assert.ok(layout.overflow<=3&&layout.outside.length===0&&
        layout.headerHeight>30&&layout.footerHeight>40&&layout.documentLang===language,
        engine+" "+language+" "+viewport.width+"x"+viewport.height+" "+route+
        ": legal/404 responsive geometry invalid "+JSON.stringify(layout));
       assert.deepEqual(errors,[],
        engine+" "+language+" "+route+" uncaught JavaScript errors");
      }finally{await legal.close();}
     }
    }
   }
   console.log("VATRA "+engine+" legal/404 bilingual viewport matrix: 2 languages x 5 sizes x 4 pages passed");
   await auditContext.close();
   if(engine!=="chromium"){
    // Verify actual translated entrance events in other rendering engines too.
    await runLocaleAnimationAudit(engine,auditBrowser,localeAnimationPages,[{width:390,height:844}]);
   }
  }finally{await auditBrowser.close();}
  console.log("VATRA "+engine+" responsive matrix: 5 widths x 4 auth pages, UI and fonts OK");
 }
 await reopened.close();
 await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
console.log("VATRA browser smoke checks passed.");
