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
  backdrop:getComputedStyle(node.parentElement).animationName
 }));
 assert.ok(modalAnimations.dialog.includes("vatraLanguageDialog")&&
  modalAnimations.backdrop.includes("vatraLanguageBackdrop"),
  "Language picker must have the shared modal opening animation");
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
  float:el.closest(".vatra-input-shell").classList.contains("is-floating"),
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
  for(const route of ["","register.html"]){
   const probe=await context.newPage();
   await probe.setViewportSize({width,height});
   await probe.goto(base+route,{waitUntil:"domcontentloaded"});
   await waitReady(probe);
   const shell=await probe.evaluate(()=>{
    const card=document.querySelector(".split,.reg-main").getBoundingClientRect();
    const footer=document.querySelector(".footer").getBoundingClientRect();
    const container=document.querySelector(".auth-layout").getBoundingClientRect();
    const login=document.querySelector(".login-layout");
    return {gap:footer.top-card.bottom,top:card.top-container.top,
      sideLeft:card.left,sideRight:innerWidth-card.right,
      centerDelta:Math.abs((card.top+card.bottom)/2-(container.top+container.bottom)/2),
      back:!!document.querySelector(".reg-back-nav .back"),
      overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.ok(shell.overflow<=3,"Horizontal overflow at "+width+" "+route);
   assert.ok(Math.abs(shell.sideLeft-shell.sideRight)<=2&&Math.abs(shell.top-shell.gap)<=2,
    "Auth card must have symmetric side and vertical gutters at "+width+" "+route+": "+JSON.stringify(shell));
   assert.ok(shell.gap>=23,"Card must keep breathing room above the footer: "+width+" "+route+" "+JSON.stringify(shell));
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
    backInside:nav.top>=form.top&&nav.right<=form.right+1&&
     nav.bottom<=document.querySelector(".signup-form-panel .narrow-form").getBoundingClientRect().top+2,
    fits:main.bottom<=footerTop+1&&footerTop<=innerHeight+1,
    centerDelta:Math.abs((main.top+main.bottom)/2-footerTop/2),bottomGap:footerTop-main.bottom,
    brand:{x:brand.x,y:brand.y,w:brand.width,h:brand.height,bottom:brand.bottom},
    form:{x:form.x,y:form.y,w:form.width,h:form.height}};
  });
  assert.ok(layout.overflow<=3,"Signup overflow at "+width+": "+JSON.stringify(layout));
  assert.ok(layout.brandKickerAbsent&&layout.footerAligned,"Registration footer or brand label is misaligned at "+width+": "+JSON.stringify(layout));
  assert.equal(layout.authAnimation,"vatraAuthReveal","Whole registration form must animate like sign-in");
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
 for(const [width,height] of [[360,780],[390,844],[768,1024],[1024,768],[1199,900],[1200,800],[1280,800],[1440,900],[1600,900],[1920,1080]]){
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
  if(width>=1200){
   assert.ok(Math.abs(login.cardY-signup.cardY)<=2,
    "Login and signup cards should share the same vertical center at "+width);
   assert.ok(Math.abs(login.height-signup.height)<=2,
    "Sign-in and signup card heights differ at "+width+": "+JSON.stringify(snapshots));
   assert.ok(Math.abs(login.brandWidth-signup.brandWidth)<=2&&
    Math.abs(login.panelWidth-signup.panelWidth)<=2,
    "Auth columns differ at "+width+": "+JSON.stringify(snapshots));
   assert.ok(Math.abs(signup.brandHeight-signup.panelHeight)<=2,
    "Signup panel heights differ at "+width);
  }else{
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
 await stepTwo.locator("#register-next").click();
 await stepTwo.locator('[data-register-step="2"]').waitFor({state:"visible"});
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
   return {placeholder:el.placeholder,floating:shell?.classList.contains("is-floating"),
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
   error.hintBottom<=error.inputTop+24&&error.errorTop>=error.inputBottom+2,
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
  assert.equal(links.filter(x=>x.href==="/VATRA/register.html").length,1,
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
 // Page-to-page footer typography: legal links and language controls use
 // one readable Onest scale, while copyright remains visually secondary.
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
   return {copy:info(copyright),nav:info(nav),link:info(link),language:info(language),
    overflow:document.documentElement.scrollWidth-innerWidth};
  });
  assert.ok(footerTypography.overflow<=3&&
   Object.values(footerTypography).filter(x=>x&&x.font).every(x=>x.font.includes("Onest"))&&
   footerTypography.copy.size===13&&footerTypography.nav.size===13&&
   footerTypography.link.size===13&&footerTypography.language.size===13,
   "Shared footer typography mismatch on "+route+": "+JSON.stringify(footerTypography));
  if(route==="404.html")
   assert.equal(await probe.locator('.footer nav a[href$="/cookies.html"]').count(),1,
    "The 404 page must link to the same three public documents");
  if(["terms.html","privacy.html","cookies.html"].includes(route)){
   const legalMotion=await probe.locator(".policy-main").evaluate(e=>getComputedStyle(e).animationName);
   assert.ok(legalMotion.includes("vatraAuthReveal"));
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
      tabCount:document.querySelectorAll(".policy-tabs a").length,
      linksCount:document.querySelectorAll(".footer nav a").length};
   });
   assert.ok(sizes.exists,"Policy header or footer missing at "+width+" "+route);
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
   return {card:style(panel).animationName,intro:style(intro).animationName,
    form:style(form).animationName,note:style(note).animationName,
    header:style(header).animationName,
    back:style(back).fontFamily,backSize:parseFloat(style(back).fontSize),
    brandBorder:style(brand).borderStyle,
    cardFont:style(panel).fontFamily};
  });
  assert.ok(motion.card.includes("vatraAuthReveal")&&
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
  const stageMotion=await recoveryPage.locator("#recovery-step").evaluate(el=>getComputedStyle(el).animationName);
  assert.ok(stageMotion.includes("vatraAuthReveal"),
   "Code entry stage must have the same form entrance animation as login and signup");
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
   return {floating:shell.classList.contains("is-floating"),font:style.fontFamily,
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
  const passwordMotion=await recoveryPage.locator("#reset-form").evaluate(el=>getComputedStyle(el).animationName);
  assert.ok(passwordMotion.includes("vatraAuthReveal"),
   "The final password step must use the shared auth reveal motion");
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
 assert.ok(sent.opts.redirectTo.endsWith("/VATRA/reset.html"));
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
  body:'window.supabase={createClient:()=>({auth:{resetPasswordForEmail:async()=>({data:{},error:null}),verifyOtp:async params=>{window.__verifiedRecovery=params;return {data:{session:{access_token:"fake-session",user:{id:"verified-mock"}}},error:null}},getUser:async()=>({data:{user:{id:"verified-mock",email:"registered@example.test",email_confirmed_at:"2026-11-01T00:00:00Z"}},error:null}),updateUser:async data=>{if(data.password==="OldPassword@12345")return {data:{},error:{code:"same_password",message:"New password should be different from the old password"}};window.__updatedPassword=data.password;return {data:{},error:null}}}})};'
 }));
 await fullRecovery.goto(base+"forgot.html",{waitUntil:"domcontentloaded"});
 await waitReady(fullRecovery);
 await fullRecovery.locator("#email").fill("registered@example.test");
 await fullRecovery.locator("#forgot-form button[type='submit']").click();
 await fullRecovery.locator("#recovery-code-form").waitFor({state:"visible",timeout:10000});
 assert.equal(await fullRecovery.locator(".forgot-intro").isVisible(),false);
 await fullRecovery.locator("#recovery-token").fill("123456");
 await fullRecovery.locator("#recovery-code-form button[type='submit']").click();
 await fullRecovery.locator("#reset-form").waitFor({state:"visible",timeout:10000});
 const verifiedMock=await fullRecovery.evaluate(()=>window.__verifiedRecovery);
 assert.equal(verifiedMock.email,"registered@example.test");
 assert.equal(verifiedMock.token,"123456");
 assert.equal(verifiedMock.type,"recovery");
 assert.equal(await fullRecovery.locator("#recovery-code-form").isVisible(),false);
 assert.equal(await fullRecovery.locator("#recovery-tools").isVisible(),false);
 assert.equal(await fullRecovery.locator("#recovery-step-heading").textContent(),"Встановіть новий пароль");
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
 assert.equal(await fullRecovery.locator("#reset-form").isVisible(),false);
 assert.equal(await fullRecovery.evaluate(()=>window.__updatedPassword),"StrongPassword@12345");
 assert.equal(await fullRecovery.evaluate(()=>sessionStorage.getItem("vatra-recovery-pending")),null);
 await fullRecovery.close();
 // A saved sign-in session is not permission to reset a password.
 await context.addCookies([{name:"vatra-language",value:"uk",url:base}]);
 const recoveryLink=await context.newPage();
 await recoveryLink.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:'window.supabase={createClient:()=>({auth:{onAuthStateChange:fn=>{window.__resetRecoveryHandler=fn;return {data:{subscription:{unsubscribe(){}}}}},getUser:async()=>({data:{user:{id:window.__resetRecoveryUserId||"unrelated-user"}},error:null}),updateUser:async data=>{window.__resetPasswordChanged=data.password;return {data:{},error:null}}}})};'
 }));
 await recoveryLink.goto(base+"reset.html?type=recovery",{waitUntil:"domcontentloaded"});
 await waitReady(recoveryLink);
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
 assert.equal(await recoveryLink.evaluate(()=>window.__resetPasswordChanged),"NewPassword@12345");
 await recoveryLink.close();
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
   assert.ok((await policyPage.locator('[data-register-step="2"]').evaluate(el=>getComputedStyle(el).animationName)).includes("vatraAuthReveal"),
    "The next step animates once when entered");
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
    intro:getComputedStyle(document.querySelector(".reset-intro")).animationName,
    form:getComputedStyle(document.querySelector("#recovery-code-form")).animationName,
    logo:getComputedStyle(document.querySelector(".reset-panel-brand")).borderStyle,
    back:getComputedStyle(document.querySelector(".reset-panel-header .back")).fontFamily
  }));
  assert.ok(resetMotion.card.includes("vatraAuthReveal")&&
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
  assert.ok((await resetVisual.locator("#reset-form").evaluate(el=>getComputedStyle(el).animationName)).includes("vatraAuthReveal"),
   "Direct reset password stage should animate just like entry stage");
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
   return {floating:shell.classList.contains("is-floating"),
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
 assert.equal(await confirmationPage.locator(".signup-form-panel > .reg-back-nav a").isVisible(),true,
  "The original top back link must remain visible during email confirmation");
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
 await confirmationPage.route("**/account.html",route=>route.fulfill({
  status:200,contentType:"text/html",body:"<!doctype html><title>Verified VATRA</title><main id='verified-account'>VATRA account</main>"
 }));
 const verifiedTab=await context.newPage();
 await verifiedTab.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:"matched",email:"demoexample@example.test",email_confirmed_at:"2026-11-08T12:00:00Z",user_metadata:{first_name:"Test"}}},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{vatra_id:1},error:null})})})})})};'
 }));
 await verifiedTab.goto(base+"account.html",{waitUntil:"domcontentloaded"});
 await waitReady(verifiedTab);
 await confirmationPage.waitForURL(/\/account\.html$/,{timeout:10000});
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
    return {floating:shell.classList.contains("is-floating"),
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
 await unconfirmed.goto(base+"account.html",{waitUntil:"domcontentloaded"});
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
   from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{vatra_id:112233},error:null})})})})
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
 await savedPage.waitForURL("**/account.html");
 await waitReady(savedPage);
 const savedData=await savedPage.evaluate(()=>localStorage.getItem("vatra-remembered-account"));
 assert.ok(savedData&&JSON.parse(savedData).email==="example@vatra.test"&&
  !savedData.includes("CorrectPass@123")&&!savedData.includes("token"),
  "Remembered account must store only name and email after real verified sign-in");
 await savedPage.locator("#logout").click();
 await savedPage.waitForURL(base);
 await waitReady(savedPage);
 assert.equal(await savedPage.locator("#saved-account-panel").isVisible(),true);
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
 await savedPage.waitForFunction(()=>{
  const node=document.querySelector("#saved-account-remove");
  return getComputedStyle(node,"::after").opacity==="1";
 },null,{timeout:2500});
 const brandedHint=await removeHint.evaluate(button=>{
  const style=getComputedStyle(button,"::after");
  return {visible:style.visibility==="visible",font:style.fontFamily,
   background:style.backgroundColor,maxWidth:style.maxWidth};
 });
 assert.ok(brandedHint.visible&&brandedHint.font.includes("Onest")&&
  brandedHint.background==="rgb(255, 255, 255)",
  "Remove-account description must use a white Onest VATRA tooltip: "+JSON.stringify(brandedHint));
 await savedPage.evaluate(()=>localStorage.setItem("vatra-language","en"));
 await savedPage.reload({waitUntil:"domcontentloaded"});
 await waitReady(savedPage);
 assert.equal(await savedPage.locator("#saved-account-remove").getAttribute("title"),null);
 assert.equal(await savedPage.locator("#saved-account-remove").getAttribute("data-vatra-tooltip"),"Remove saved account");
 assert.equal(await savedPage.locator("#saved-account-remove").getAttribute("aria-label"),"Remove saved account");
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
 await savedPage.locator("#saved-account-continue").click();
 assert.equal(await savedPage.locator(".vt-home-saved-field-title-001").evaluate(
  node=>getComputedStyle(node).clipPath),"inset(50%)",
  "Saved account captions must be screen-reader-only");
 await savedPage.locator("#saved-password").fill("WrongPass@123");
 await savedPage.locator('#saved-login-form button[type="submit"]').click();
 assert.equal(await savedPage.evaluate(()=>sessionStorage.getItem("mockAttemptEmail")),"example@vatra.test");
 await savedPage.locator("#saved-account-response").waitFor({state:"visible"});
 assert.ok((await savedPage.locator("#saved-account-response").textContent()).length>0);
 await savedPage.locator("#saved-password").fill("CorrectPass@123");
 await savedPage.locator('#saved-login-form button[type="submit"]').click();
 await savedPage.waitForURL("**/account.html");
 await waitReady(savedPage);
 await savedPage.locator("#logout").click();
 await savedPage.waitForURL(base);
 await waitReady(savedPage);
 await savedPage.locator("#saved-account-remove").click();
 assert.equal(await savedPage.locator("#saved-account-remove-dialog").isVisible(),true);
 await savedPage.locator("#saved-remove-confirm").click();
 assert.equal(await savedPage.evaluate(()=>localStorage.getItem("vatra-remembered-account")),null);
 assert.equal(await savedPage.locator("#standard-login-panel").isVisible(),true);
 assert.equal(await savedPage.locator("#saved-switch-back").isVisible(),false);
 await savedPage.close();
 await savedContext.close();
 console.log("VATRA remembered account: return, alternate login, password check, removal and logout: OK");

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
 await phonePage.goto(base+"account.html?token_hash=valid-other-device-token&type=email",
  {waitUntil:"domcontentloaded"});
 await waitReady(phonePage);
 assert.equal(new URL(phonePage.url()).search,"");
 assert.equal(await phonePage.evaluate(()=>sessionStorage.getItem("verifiedTokenType")),"email");
 assert.ok((await phonePage.locator("#account-title").textContent()).includes("Мобільний"));
 assert.equal(JSON.parse(await phonePage.evaluate(()=>localStorage.getItem("vatra-remembered-account"))).email,
  "mobile@vatra.test");
 await phonePage.goto(base+"account.html?token_hash=expired&type=email",{waitUntil:"domcontentloaded"});
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
   await auditContext.close();
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
