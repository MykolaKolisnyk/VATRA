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
   assert.ok(design.bottomGap>=27&&design.bottomGap<=29,"Login bottom gap must be 28px at "+width+": "+design.bottomGap);
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
   const tooltip=icon.locator(".orbit-tooltip");
   await tooltip.waitFor({state:"visible"});
   const box=await tooltip.boundingBox();
   assert.ok(box&&box.x>=-1&&box.x+box.width<=width+1&&box.y>=-1&&box.y+box.height<=height+1,
    "Orbit tooltip outside viewport at "+width+": "+JSON.stringify(box));
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
 assert.equal(await reopened.locator("#first-name").evaluate(el=>el.closest(".reg-input-wrap").classList.contains("is-raised")),false,
  "An empty focused registration field must keep its hint centered");
 await reopened.locator("#first-name").fill("VATRA");
 await reopened.waitForFunction(()=>document.querySelector("#first-name").closest(".reg-input-wrap")?.classList.contains("is-raised"));
 const inputStyle=await reopened.locator("#first-name").evaluate(node=>getComputedStyle(node).fontFamily);
 assert.ok(inputStyle.includes("Onest"),"Registration fields must use Onest");
 console.log("VATRA registration tooltips and floating input labels: OK");

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
      reserved:login?getComputedStyle(login,"::before").height:null,
      back:!!document.querySelector(".reg-back-nav .back"),
      overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.ok(shell.overflow<=3,"Horizontal overflow at "+width+" "+route);
   assert.ok(shell.gap>=27&&shell.gap<=29,"Card/footer gap must be 28px: "+width+" "+route+" "+JSON.stringify(shell));
   if(!route)assert.ok(!shell.back&&shell.reserved==="36px"&&shell.top>=68,
    "Login must reserve a blank space equal to the Back button: "+JSON.stringify(shell));
   else assert.ok(shell.back,"Signup must retain the Back link");
   await probe.locator("[data-language-trigger]").click();
   await probe.locator(".language-dialog").waitFor({state:"visible"});
   const picker=await probe.evaluate(()=>{
    const d=document.querySelector(".language-dialog").getBoundingClientRect();
    const f=document.querySelector(".language-search-field").getBoundingClientRect();
    const s=document.querySelector("#vatra-language-search").getBoundingClientRect();
    const label=document.querySelector(".language-search-field>span");
    return {dialog:d.width,field:f.width,search:s.width,
      captionOffset:label.getBoundingClientRect().y-s.y,
      captionSize:getComputedStyle(label).fontSize};
   });
   assert.ok(picker.field>=picker.dialog-55&&picker.search>=picker.field-2,
    "Language search must use the full dialog width "+width+" "+route+": "+JSON.stringify(picker));
   samples.push(picker);
   await probe.close();
  }
  assert.ok(Math.abs(samples[0].search-samples[1].search)<=2&&
   Math.abs(samples[0].captionOffset-samples[1].captionOffset)<=2&&
   samples[0].captionSize===samples[1].captionSize,
   "Language search style differs between auth pages at "+width+": "+JSON.stringify(samples));
  console.log("VATRA auth shell and language picker match "+width+"x"+height+": OK");
 }


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
    backAligned:Math.abs(back.right-form.right)<=8,
    backAbove:nav.bottom<=main.top+2,
    fits:main.bottom<=footerTop+1&&footerTop<=innerHeight+1,
    centerDelta:Math.abs((nav.top+main.bottom)/2-footerTop/2),bottomGap:footerTop-main.bottom,
    brand:{x:brand.x,y:brand.y,w:brand.width,h:brand.height,bottom:brand.bottom},
    form:{x:form.x,y:form.y,w:form.width,h:form.height}};
  });
  assert.ok(layout.overflow<=3,"Signup overflow at "+width+": "+JSON.stringify(layout));
  assert.ok(layout.brandKickerAbsent&&layout.footerAligned,"Registration footer or brand label is misaligned at "+width+": "+JSON.stringify(layout));
  assert.equal(layout.authAnimation,"vatraAuthReveal","Whole registration form must animate like sign-in");
  assert.equal(layout.stageAnimation,"none","Only the full registration form should animate at entry");
  assert.ok(layout.headerAbsent&&layout.backAligned&&layout.backAbove,
   "Signup header must be removed and Back link aligned to the card at "+width+": "+JSON.stringify(layout));
  assert.ok(layout.backText.length>0,"Signup return link is missing at "+width);
  if(width>=1200&&layout.fits)
   assert.ok(layout.bottomGap>=27&&layout.bottomGap<=29,"Signup bottom gap must be 28px at "+width+": "+layout.bottomGap);
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
    return {width:card.width,height:card.height,x:card.x,
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


 // An empty focused field must keep its hint centered after failed validation.
 for(const [route,fieldId,action] of [["","#email","#login-form button[type='submit']"],
  ["register.html","#first-name","#register-next"]]){
  const probe=await context.newPage();
  await probe.setViewportSize({width:1440,height:900});
  await probe.goto(base+route,{waitUntil:"domcontentloaded"});
  await waitReady(probe);
  const field=probe.locator(fieldId);
  await field.focus();
  const empty=await field.evaluate(el=>{
   const root=el.closest(".field"),label=el.closest(".reg-input-wrap")?.querySelector(".reg-floating-label")||root.querySelector("span:first-child");
   const a=label.getBoundingClientRect(),b=el.getBoundingClientRect();
   return {centerDistance:Math.abs(a.top+a.height/2-b.top-b.height/2),raised:el.closest(".reg-input-wrap")?.classList.contains("is-raised")||false};
  });
  assert.ok(!empty.raised&&empty.centerDistance<=13,
   "Empty field hint must remain centered: "+route+" "+JSON.stringify(empty));
  await probe.locator(action).click();
  const validation=await field.evaluate(el=>{
   const root=el.closest(".field"),msg=root.querySelector(".field-error");
   const label=el.closest(".reg-input-wrap")?.querySelector(".reg-floating-label")||root.querySelector("span:first-child");
   const a=label.getBoundingClientRect(),b=el.getBoundingClientRect();
   return {message:msg?.textContent?.trim(),invalid:el.getAttribute("aria-invalid"),
    centerDistance:Math.abs(a.top+a.height/2-b.top-b.height/2)};
  });
  assert.ok(validation.message&&validation.invalid==="true"&&validation.centerDistance<=13,
   "Validation must not hide the empty field hint: "+route+" "+JSON.stringify(validation));
  await probe.close();
 }
 console.log("VATRA empty focused hints and form error design: OK");
 for(const route of ["legal.html","terms.html","privacy.html","cookies.html",
  "forgot.html","reset.html","account.html","404.html"]){
  const probe=await context.newPage();
  await probe.setViewportSize({width:390,height:844});
  await probe.goto(base+route,{waitUntil:"load"});
  const footerDebug=await probe.evaluate(()=>({url:location.href,html:document.querySelector(".footer nav")?.outerHTML?.slice(0,650)||"MISSING",count:document.querySelectorAll('.footer nav>a').length}));
  console.log("VATRA guest footer diagnostic "+route+": "+JSON.stringify(footerDebug));
  await probe.locator('.footer nav>a[href="register.html"]').waitFor({state:"attached",timeout:3500});
  const links=await probe.locator(".footer nav>a").evaluateAll(nodes=>nodes.map(n=>({
   href:n.getAttribute("href"),text:n.textContent.trim()
  })));
  assert.equal(links.filter(x=>x.href==="register.html").length,1,
   "Create account CTA missing from "+route);
  assert.equal(links.filter(x=>x.href==="./").length,1,
   "Sign-in CTA missing from "+route);
  if(["legal.html","terms.html","privacy.html","cookies.html"].includes(route))
   assert.equal(links.length,2,"Legal page footer must not repeat its document tabs");
  await probe.close();
 }
 console.log("VATRA guest footer links and account creation labels: OK");

 // Regression coverage for all four legal pages and supporting auth pages,
 // checking actual browser geometry instead of just matching CSS strings.
 for(const [width,height] of [[360,780],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080]]){
  for(const route of ["legal.html","terms.html","privacy.html","cookies.html"]){
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
   assert.equal(sizes.tabCount,4,"Legal navigation tabs missing at "+width+" "+route);
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
 console.log("VATRA supporting page footers: OK");
 await reopened.close();
 await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
console.log("VATRA browser smoke checks passed.");
