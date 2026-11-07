import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const read=path=>readFile(path,"utf8");
const css=await read("assets/css/auth.css");
const legal=await read("assets/css/legal.css");
assert.ok(css.includes("Onest-Variable.ttf"),"Local Onest is missing");
assert.ok(css.includes('[class^="vt-"]')&&css.includes('[class*=" vt-"]'),"Individual text classes lack typography rules");
assert.ok(css.includes("max-width:1199px")&&css.includes("max-width:540px"),"Responsive login styles are missing");
assert.ok(legal.includes("max-width:767px"),"Legal mobile styles are missing");
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,"CSS braces are unbalanced");

const host=await read("assets/js/host.js");
assert.ok(host.includes('location.hostname === "mykolakolisnyk.github.io"'),"Official host check is missing");
const auth=await read("assets/js/auth.js");
assert.ok(auth.includes("VATRA_HOST_ALLOWED===false"),"Auth must not initialize on other hosts");
const languages=await read("assets/js/lang.js");
assert.ok(languages.includes("vt-language-dialog-heading")&&languages.includes("vt-language-name-"),"Dynamic language texts need individual classes");
const pages=["index.html","404.html","register.html","forgot.html","reset.html","account.html","legal.html","terms.html","privacy.html","cookies.html","offline.html"];
const paths=["index.html","404.html",...["ua","en"].flatMap(locale=>pages.map(name=>locale+"/"+name)),...["confirmation","invite","recovery","magic-link","email-change","reauthentication","password-changed","email-address-changed"].map(name=>"email-templates/"+name+".html")];
const voidTags=new Set("area base br col embed hr img input link meta param source track wbr".split(" "));

function inspectPage(path,html){
  const bodyIndex=html.search(/<body\b/i);
  assert.ok(bodyIndex>=0,path+": missing body");
  const body=html.slice(bodyIndex).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,"").replace(/\{\{[^}]+\}\}/g,"");
  const stack=[],missing=[],withoutOwnClass=[],uniqueClasses=new Set();
  let visible=0;
  const classes=[...body.matchAll(/\bvt-[a-z0-9-]+/g)].map(match=>match[0]);
  assert.equal(new Set(classes).size,classes.length,path+": duplicate individual text class");
  for(const token of body.match(/<[^>]*>|[^<]+/g)||[]){
    if(token.startsWith("<!--")||token.startsWith("<!"))continue;
    const close=token.match(/^<\/([a-z][a-z0-9-]*)\s*>/i);
    if(close){
      const index=stack.map(x=>x.tag).lastIndexOf(close[1].toLowerCase());
      if(index!==-1)stack.length=index;
      continue;
    }
    const open=token.match(/^<([a-z][a-z0-9-]*)(?=[\s/>])([^>]*)>/i);
    if(open){
      const tag=open[1].toLowerCase();
      const classValue=(open[2].match(/\bclass\s*=\s*"([^"]*)"/i)||[])[1]||"";
      const own=(classValue.match(/\b(?:vt|ui)-[a-z0-9-]+\b/g)||[]);
      if(own.length===0)withoutOwnClass.push(tag+": "+token.slice(0,85));
      else {
        for(const item of own){
          assert.ok(!uniqueClasses.has(item),path+": duplicate own class "+item);
          uniqueClasses.add(item);
        }
      }
      if(!voidTags.has(tag)&&!token.endsWith("/>")){
        stack.push({tag,classes:(open[2].match(/\bclass\s*=\s*"([^"]*)"/i)||[])[1]||""});
      }
      continue;
    }
    if(!token.startsWith("<")&&/[\p{L}\p{N}]/u.test(token.trim())){
      visible++;
      const active=stack[stack.length-1];
      if(!active||!new RegExp(path.startsWith("email-templates/")?"\\b(?:vt|ui)-[a-z0-9-]+":"\\bvt-[a-z0-9-]+").test(active.classes)){
        missing.push((active?.tag||"document")+": "+token.trim().slice(0,50));
      }
    }
  }
  assert.ok(visible>0,path+": no visible text found");
  assert.deepEqual(missing,[],path+": text nodes without unique class");
  assert.deepEqual(withoutOwnClass,[],path+": interface elements without individual classes");
  assert.ok(!/\?v=\d+/.test(html),path+": unnecessary numerical asset version parameter");
  if(path.startsWith("ua/")||path.startsWith("en/")){
    assert.ok(html.includes("assets/css/auth.css")||path.endsWith("/offline.html"),path+": styles missing");
    if(!path.endsWith("/offline.html"))assert.ok(html.includes("assets/js/host.js"),path+": host check missing");
  }
  return visible;
}
let count=0;
for(const path of paths){
 const html=await read(path);
 count+=inspectPage(path,html);
}
// VATRA landing composition: 8 distinct unlabeled SVG features on the inner
// clockwise orbit, with 3 intact label badges on the outer counterclockwise orbit.
const vatraFeatures=[
 ["chat","Спілкування","Communication"],
 ["business","Для бізнесу","For business"],
 ["communities","Спільноти","Communities"],
 ["photos","Фотографії","Photos"],
 ["video","Відео","Video"],
 ["music","Музика","Music"],
 ["marketplace","Маркетплейс","Marketplace"],
 ["clips","Кліпи","Clips"]
];
for(const locale of ["ua","en"]){
 const home=await read(locale+"/index.html");
 const inner=home.match(new RegExp('<div class="orbit-track orbit-track-inner ui-'+locale+'-inner-track">([\\s\\S]*?)</div>\\s*<img class="intro-symbol'))?.[1];
 assert.ok(inner,locale+": feature orbit is missing");
 assert.equal((inner.match(/class="orbit-node orbit-feature /g)||[]).length,8,
  locale+": inner orbit must contain exactly eight features");
 assert.equal((home.match(/class="orbit-node orbit-message /g)||[]).length,3,
  locale+": keep three original large outer badge labels");
 assert.ok(!/<p\b|<button\b/.test(inner),locale+": inner orbit icons must not become text buttons");
 assert.equal((inner.match(/class="orbit-tooltip vt-/g)||[]).length,8,
  locale+": eight inner features need unique descriptive hover tooltips");
 for(let i=0;i<vatraFeatures.length;i++){
  const [key,ua,en]=vatraFeatures[i];
  const angle=-90+i*45;
  const label=locale==="ua"?ua:en;
  assert.ok(inner.includes('feature-'+key+' ui-'+locale+'-inner-node-'+(i+1)),
   locale+": missing unique inner feature "+key);
  assert.ok(inner.includes('class="ui-'+locale+'-orbit-'+key+'-svg"'),
   locale+": missing bespoke SVG for "+key);
  assert.ok(inner.includes('aria-label="'+label+'"'),
   locale+": feature "+key+" must have accessible localized label");
  assert.ok(inner.includes('id="'+locale+'-orbit-tip-'+key+'"'),
   locale+": missing unique descriptive tooltip for "+key);
  assert.ok(inner.includes('aria-describedby="'+locale+'-orbit-tip-'+key+'"'),
   locale+": focusable feature must refer to its tooltip");
  assert.ok(inner.includes('tabindex="0" aria-describedby="'+locale+'-orbit-tip-'+key+'"'),
   locale+": hover details must also work by keyboard");
  assert.ok(inner.includes('--angle:'+angle+'deg;--counter-angle:'+(-angle)+'deg'),
   locale+": each feature needs evenly spaced 45 degree angle");
 }
}
assert.ok(css.includes("--outer-radius:min(39cqw,275px);--inner-radius:min(19cqw,135px)"),
 "Outer badges and inner feature icons require separate non-overlapping orbit lanes");
assert.ok(css.includes("--outer-radius:43cqw;--inner-radius:18cqw"),
 "Mobile rings need greater radial separation");
assert.ok(css.includes(".orbit-track-inner .orbit-node:has(.orbit-icon:is(:hover,:focus-visible)){z-index:30}"),
 "Hovered tooltip must render above all other small icons");
assert.ok(css.includes(".intro-art:has(.orbit-icon:is(:hover,:focus-visible)) .orbit-track-inner{z-index:12}"),
 "Hovered tooltip must render above outer badges and central logo");
assert.ok(css.includes("@container (max-width:680px)"),
 "Narrow layouts need smaller outer badge widths while expanding orbital radii");
const cleanLoginTranslations=JSON.parse(await read("assets/i18n/en.json"));
for(const text of ["Раді бачити Вас знову.","Безпечний вхід","Один акаунт для всього простору VATRA."]){
 assert.ok(!(text in cleanLoginTranslations),"Unused login translation should be removed: "+text);
}
for(const locale of ["ua","en"]){
 const page=await read(locale+"/index.html");
 assert.equal((page.match(/src="\.\.\/assets\/logo\/vatra-(?:logo|app-icon)\.svg"/g)||[]).length,1,
  locale+": landing should have one visible central brand logo");
 assert.ok(!page.includes('class="mobile-logo')&&!page.includes('class="header-logo'),
  locale+": duplicate logos must be removed from login screen");
 assert.ok(!page.includes('class="subtitle vt-'+locale+'-home')&&!page.includes('class="form-note vt-'+locale+'-home'),
  locale+": redundant login paragraphs should not reappear");
 assert.ok(page.includes('class="login-recovery-link ui-'+locale+'-home-div-012"'),
  locale+": forgot-password control must remain aligned to the right");
 assert.ok(page.includes('class="intro-art ui-'+locale+'-home-div-001" role="group"'),
  locale+": accessible hero image/feature group must remain available");
}
assert.ok(css.includes(".login-recovery-link{display:flex;justify-content:flex-end"),
 "Forgot-password link should align correctly after secure-login text removal");
assert.ok(!css.includes(".mobile-logo")&&!css.includes(".controls-inline"),
 "Obsolete login logo/label selectors should be removed");
assert.ok(css.includes(".intro-symbol{position:relative;z-index:4;width:clamp(56px,14cqw,96px)"),
 "Center logo must not obscure small orbit icons");
assert.ok(css.includes(".orbit-icon:hover .orbit-tooltip,.orbit-icon:focus-visible .orbit-tooltip"),
 "Feature descriptions must appear on hover and keyboard focus");
assert.ok(css.includes("animation-play-state:paused"),
 "Hovered moving icons need to pause so their tooltip can be read");
assert.ok(css.includes("vatraOrbitClockwise 32s")&&css.includes("vatraOrbitCounterclockwise 47s"),
 "Outer badges and inner features must rotate in opposite directions");
assert.ok(css.includes("@media (prefers-reduced-motion:reduce)"),
 "Reduced-motion users need a static orbit");
assert.equal((css.match(/\.orbit-track-inner \.orbit-node:nth-child\(/g)||[]).length,8,
 "Each small feature icon must have its own animation phase");

// Keep the complete email -> code -> password flow on the same page.
for(const locale of ["ua","en"]){
 const forgot=await read(locale+"/forgot.html");
 const reset=await read(locale+"/reset.html");
 for(const id of ["forgot-form","recovery-step","recovery-email","recovery-token",
  "recovery-code-form","recovery-resend","recovery-countdown",
  "recovery-change-email","reset-form","password","password-confirm","account-link"]){
   assert.equal((forgot.match(new RegExp('id="'+id+'"',"g"))||[]).length,1,
     locale+": inline recovery step missing/duplicated: "+id);
 }
 assert.ok(/<section id="recovery-step"[^>]*hidden>/.test(forgot),
  locale+": code form should be initially hidden until the email is sent");
 assert.ok(/<button id="recovery-resend"[^>]*disabled>/.test(forgot),
  locale+": resend control must start disabled");
 assert.ok(reset.includes('href="forgot.html"'),
  locale+": direct reset page must let people request another code");
}
assert.ok(auth.includes("auth.auth.resetPasswordForEmail("),
 "Forgot password must continue using the standard Supabase recovery sender");
assert.ok(auth.includes('auth.auth.verifyOtp({email,token,type:"recovery"})'),
 "Recovery must verify the standard Supabase code");
for(const locale of ["ua","en"]){
 for(const name of ["forgot.html","reset.html"]){
  const html=await read(locale+"/"+name);
  assert.ok(html.includes('pattern="[0-9]{8}" minlength="8" maxlength="8"'),
   locale+"/"+name+": recovery must use the 8-digit configured Supabase OTP");
 }
}
assert.ok(auth.includes('/^\\d{8}$/.test(token)'),"OTP validation must accept exactly eight digits");
assert.ok(auth.includes("const COOLDOWN_MS=60000"),
 "Resend control must use the 60-second cooldown");
assert.ok(auth.includes("function wireForgot(){")&&auth.includes("wireReset();"),
 "Forgot password must also register inline code and new-password handlers");
assert.doesNotThrow(()=>new Function(auth),"VATRA authentication script has a syntax error");
// Production policy: minimum 12 characters and required lowercase/uppercase Latin, digits and symbols.
// The HTML fields and client validation must match the selected Supabase Auth provider setting.
for(const locale of ["ua","en"]){
 for(const name of ["register.html","forgot.html","reset.html"]){
  const html=await read(locale+"/"+name);
  assert.equal((html.match(/minlength="12" maxlength="128"/g)||[]).length,2,
   locale+"/"+name+": new passwords must be 12–128 characters");
  assert.ok(!html.includes('minlength="8" maxlength="128"'),
   locale+"/"+name+": obsolete password requirement must not return");
 }
 const register=await read(locale+"/register.html");
 assert.ok(locale==="ua"?register.includes("Від 12 символів:"):register.includes("At least 12 characters:"),
  locale+": password policy must be explained during signup");
}
const passwordFunction=auth.match(/function validPassword\(value\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(passwordFunction,"VATRA password validator is missing");
const validate=new Function(passwordFunction+";return validPassword")();
assert.equal(validate("CorrectPassword123!"),true,"Strong 12+ character passwords must be accepted");
for(const weak of ["Password1!","onlylowercase1234!","ONLYUPPERCASE1234!","NoSymbols123456","MissingDigits!Abc",""]){
 assert.equal(validate(weak),false,"Weak password must be rejected: "+weak);
}
// GitHub Pages requires a small root 404 entrypoint; the real pages are language-specific.
const missingPage=await read("404.html");
assert.ok(missingPage.includes('data-page="technical-404-fallback"'),
 "Root 404 must only handle GitHub Pages fallback");
assert.ok(missingPage.includes('location.replace("/VATRA/"+lang+"/404.html")'),
 "Root 404 must route to the chosen language folder");
assert.ok(!/profile\.js|data-page="public-profile"|supabase-js|vatra_directory|profile-heading/.test(missingPage),
 "Root 404 must not initialize a profile or Supabase");
for(const lang of ["ua","en"]){
 const page=await read(lang+"/404.html");
 assert.ok(page.includes('data-page="not-found"')&&page.includes('id="error-heading"'),
  lang+": missing localized 404 page");
 assert.ok(page.includes("../assets/logo/vatra-logo.svg"),
  lang+": 404 must show VATRA logo");
 assert.ok(page.includes("data-language-trigger"),
  lang+": 404 must keep language selector");
 assert.ok(page.includes('href="./"'),lang+": 404 must link home");
 assert.ok(!/profile\.js|supabase-js|vatra_directory/.test(page),
  lang+": 404 must not load profile or authentication");
}
assert.ok(!/vatraProfileUrl|goToMyProfile|\/VATRA\/id\d+/.test(auth),
 "Authentication must not send users to non-existent profile routes");
for(const lang of ["ua","en"]){
 const account=await read(lang+"/account.html");
 assert.ok(account.includes('<span id="vatra-id"'),lang+": VATRA ID must not link to absent profile page");
}
const expectedEmails=new Map([
 ["password-changed.html",[]],
 ["email-address-changed.html",["{{ .OldEmail }}","{{ .Email }}"]],
 ["confirmation.html",["{{ .ConfirmationURL }}"]],
 ["invite.html",["{{ .ConfirmationURL }}"]],
 ["magic-link.html",["{{ .Token }}","{{ .ConfirmationURL }}"]],
 ["email-change.html",["{{ .NewEmail }}","{{ .ConfirmationURL }}"]],
 ["recovery.html",["{{ .Token }}","{{ .ConfirmationURL }}","{{ .RedirectTo }}"]],
 ["reauthentication.html",["{{ .Token }}"]]
]);
for(const [name,markers] of expectedEmails){
 const html=await read("email-templates/"+name);
 assert.ok(html.includes('.Data.preferred_locale'),name+": preferred locale must match registration metadata");
 for(const item of markers)assert.ok(html.includes(item),name+": missing Supabase variable "+item);
 assert.ok(!/\.Data\.preferredLanguage/.test(html),name+": old metadata name is not recognized by VATRA");
}
assert.ok(auth.includes('preferred_locale:english?"en":"uk"'),
 "Signup must store the preference used by Supabase templates");

// Recovery is one sequential flow, with no redundant initial "already have a code" link.
for(const locale of ["ua","en"]){
 const forgot=await read(locale+"/forgot.html");
 assert.ok(!forgot.includes('id="recovery-link"')&&!forgot.includes('id="recovery-link-note"'),
  locale+": remove redundant code link from the initial recovery screen");
 assert.ok(forgot.includes('id="recovery-code-form"'),
  locale+": code entry must remain available after sending email");
}
assert.ok(!auth.includes('"recovery-link-note"'),"Remove obsolete recovery link handlers");
assert.ok(css.includes(".center-main .response:not([hidden]){margin:0 0 10px}"),
 "Recovery status and form should be adjacent");
assert.ok(css.includes(".center-main .recovery-step{display:grid;gap:14px;margin-top:0;"),
 "Recovery card should not have an extra top gap");
for(const name of ["confirmation","invite","magic-link","email-change","recovery"]){
 const html=await read("email-templates/"+name+".html");
 assert.equal((html.match(/button-wrap" style="margin:22px 0;text-align:center"/g)||[]).length,2,
  name+": both locale email buttons must be centered");
}
// Cloudflare Turnstile must remain a single optional module.
// Do not enable Supabase CAPTCHA before configuring the public site key.
const captcha=await read("assets/js/captcha.js");
assert.doesNotThrow(()=>new Function(captcha),"CAPTCHA module must parse as plain browser JS");
assert.ok(/const SITE_KEY = "[A-Za-z0-9_-]*";/.test(captcha),"CAPTCHA site key must be a public key or be left empty");
assert.ok(!/secret[_-]?key\s*=/.test(captcha),"Never expose a Turnstile secret in browser JavaScript");
assert.ok(captcha.includes("challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"),
 "Cloudflare must load its official, non-proxied script");
assert.ok(captcha.includes("turnstile.render")&&captcha.includes("turnstile.execute")
 &&captcha.includes("turnstile?.remove"),"On-demand widget lifecycle missing");
assert.ok(captcha.includes('execution:"execute"')&&captcha.includes('appearance:"always"'),
 "The Cloudflare challenge must start on submission inside a visible security dialog");
assert.ok(captcha.includes('aria-modal')&&captcha.includes('captcha-backdrop'),
 "Security verification must appear in a keyboard-accessible modal");
assert.ok(captcha.includes('turnstile?.remove')&&captcha.includes('state.dialog.hide()'),
 "Completed and cancelled verification must clean up the dialog");
assert.ok(!auth.includes("window.VATRA_CAPTCHA.mount("),
 "Do not mount CAPTCHA on initial page load or when revealing a recovery code field");
assert.ok(css.includes(".captcha-backdrop{position:fixed")&&css.includes("backdrop-filter:blur"),
 "Security challenge must dim and blur the page");
assert.ok(css.includes(".captcha-dialog{")&&css.includes(".captcha-dialog-open{overflow:hidden}"),
 "Security challenge must use a centered, scroll-safe modal");
assert.ok(css.includes(".check-terms>span .field-error")&&!css.includes(".check-terms.is-invalid{color:#b92c45;flex-wrap:wrap}"),
 "Registration consent errors must stay under text instead of moving the checkbox");
assert.ok(auth.includes('(consentText||wrapper).append(error);'),
 "Consent validation must append error to consent text");
for(const locale of ["ua","en"]){
 for(const filename of ["index.html","register.html","forgot.html"]){
  const content=await read(locale+"/"+filename);
  assert.ok(content.includes('src="../assets/js/captcha.js"'),locale+"/"+filename+": CAPTCHA script missing");
  assert.ok(content.indexOf('src="../assets/js/captcha.js"')<content.indexOf('src="../assets/js/auth.js"'),
   locale+"/"+filename+": CAPTCHA module must load before auth");
 }
}
assert.ok(auth.includes("auth.auth.signInWithPassword({email,password,options})"),"Login must pass CAPTCHA options");
assert.ok(auth.includes("const captcha=await captchaOptions(form);"),"Signup must request CAPTCHA token");
assert.ok(auth.includes("captchaScope=repeat?step:form"),"Repeat password recovery needs a fresh CAPTCHA token");
assert.ok(auth.includes("resetCaptcha(repeat?step:form)"),"Password reset must clear used CAPTCHA tokens");
// Exercise modal, success, retry and cancellation without production Cloudflare credentials.
{
 let rendered=0,executed=0,removed=0,settings;
 const documentStub={documentElement:{lang:"uk"},activeElement:null,listeners:new Map()};
 class TestElement {
  constructor(tag){this.tag=tag;this.children=[];this.parent=null;this.listeners={};
   this.isConnected=false;this.className="";this.offsetParent={};this.attrs={};
   this.classList={add(){},remove(){}};}
  setAttribute(name,value){this.attrs[name]=value;}
  append(...nodes){for(const node of nodes){this.children.push(node);node.parent=this;node.isConnected=true;}}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.isConnected=false;}
  focus(){documentStub.activeElement=this;}
  addEventListener(type,handler){this.listeners[type]=handler;}
  removeEventListener(type){delete this.listeners[type];}
  querySelectorAll(){return [];}
 }
 documentStub.createElement=tag=>new TestElement(tag);
 documentStub.addEventListener=(type,fn)=>documentStub.listeners.set(type,fn);
 documentStub.removeEventListener=type=>documentStub.listeners.delete(type);
 documentStub.body=new TestElement("body");
 documentStub.body.isConnected=true;
 const originalFocus=new TestElement("button");
 originalFocus.isConnected=true;
 documentStub.activeElement=originalFocus;
 const browserWindow={turnstile:{
  render(_host,opts){rendered++;settings=opts;return "mock-widget";},
  execute(){executed++;queueMicrotask(()=>settings.callback("mock-verified-token"));},
  remove(){removed++;}
 }};
 runInNewContext(captcha,{window:browserWindow,document:documentStub,WeakMap,Promise,setTimeout,clearTimeout,Error});
 const form={id:"login-form",isConnected:true,hidden:false};
 assert.equal(rendered,0,"CAPTCHA must not render before user action");
 assert.equal(documentStub.body.children.length,0,"Modal must not be visible before submit");
 const request=browserWindow.VATRA_CAPTCHA.token(form);
 assert.equal(documentStub.body.children.length,1,"Submit must open a security overlay");
 assert.ok(documentStub.body.children[0].className.includes("captcha-backdrop"),"Backdrop missing");
 const token=await request;
 assert.equal(token,"mock-verified-token");
 assert.equal(documentStub.body.children.length,0,"Successful verification should close the modal automatically");
 assert.equal(documentStub.activeElement,originalFocus,"Focus must return after verification");
 assert.equal(executed,1);
 assert.equal(settings.execution,"execute");
 assert.equal(settings.appearance,"always");
 await browserWindow.VATRA_CAPTCHA.reset(form);
 assert.equal(removed,1,"Completed challenge must be removed");
 const second=browserWindow.VATRA_CAPTCHA.token(form);
 assert.equal(await second,"mock-verified-token","Retries need a fresh token");
 await browserWindow.VATRA_CAPTCHA.reset(form);
 assert.equal(removed,2);
 const cancelled=browserWindow.VATRA_CAPTCHA.token(form);
 const backdrop=documentStub.body.children[0];
 const dialog=backdrop.children[0];
 const cancelButton=dialog.children.find(x=>x.tag==="button");
 assert.ok(cancelButton,"Security dialog needs a cancel button");
 cancelButton.listeners.click();
 await assert.rejects(cancelled,/captcha_cancelled/,"Closing a modal must stop authorization");
 assert.equal(documentStub.body.children.length,0,"Cancelled challenge must close the overlay");
 await browserWindow.VATRA_CAPTCHA.reset(form);
}
// Security email templates use the VATRA palette and Outlook-friendly centered buttons.
for(const file of ["password-changed.html","email-address-changed.html"]){
 const mail=await read("email-templates/"+file);
 assert.ok(mail.includes('.Data.preferred_locale'),file+": UA/EN selection missing");
 assert.equal((mail.match(/-button-table" align="center"/g)||[]).length,2,file+": buttons must be centered in both locales");
 assert.equal((mail.match(/background:#2865d8/g)||[]).length,2,file+": wrong button color");
 assert.ok(mail.includes("https://mykolakolisnyk.github.io/VATRA/assets/logo/vatra-logo.png"),file+": brand logo missing");
}
const appManifest=JSON.parse(await read("site.webmanifest"));
assert.equal(appManifest.theme_color,"#ffffff","Manifest theme must match the light VATRA layout");
assert.equal(appManifest.scope,"/VATRA/","PWA scope must use the project subdirectory");
for(const icon of appManifest.icons){
  const file=icon.src.replace(/^\/VATRA\//,"");
  assert.ok((await stat(file)).isFile(),"PWA icon does not exist: "+file);
}
// Broken local asset links are easy to miss when pages are edited separately.
// Check all 22 localized pages, root fallbacks, and six Supabase email templates.
for(const path of paths){
  const html=await read(path);
  for(const match of html.matchAll(/\b(?:href|src)=(["'])(.*?)\1/g)){
    const value=match[2];
    if(!value||value.includes("{{")||/^(?:#|mailto:|tel:|data:|javascript:)/.test(value))continue;
    let target;
    try{target=new URL(value,"https://mykolakolisnyk.github.io/VATRA/"+path);}
    catch{continue;}
    if(target.origin!=="https://mykolakolisnyk.github.io"||!target.pathname.startsWith("/VATRA/"))continue;
    let diskPath=decodeURIComponent(target.pathname.slice("/VATRA/".length));
    if(!diskPath||diskPath.endsWith("/"))diskPath+="index.html";
    assert.ok(!diskPath.includes("../"),path+": unsafe local asset path: "+value);
    try{assert.ok((await stat(diskPath)).isFile());}
    catch{assert.fail(path+": local asset or navigation target missing: "+value+" → "+diskPath);}
  }
}
const sw=await read("sw.js");
assert.ok(sw.includes('const CACHE="vatra-offline-shell"'),"Stable, non-versioned cache key is required");
console.log("VATRA: "+paths.length+" site/email pages, "+count+" visible text nodes with distinct class names, individually classed interface elements and responsive typography.");
