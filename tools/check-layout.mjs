import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
const read=path=>readFile(path,"utf8");
const pages=["index","404","register","forgot","reset","account","terms","privacy","cookies","offline"];
const emailNames=["confirmation","invite","recovery","magic-link","email-change","reauthentication","password-changed","email-address-changed"];
const css=await read("assets/css/auth.css");
const legalCss=await read("assets/css/legal.css");
const auth=await read("assets/js/auth.js");
const errors=await read("assets/js/errors.js");
const captcha=await read("assets/js/captcha.js");
const lang=await read("assets/js/lang.js");
const sw=await read("sw.js");
const host=await read("assets/js/host.js");
const network=await read("assets/js/network.js");
const offline=await read("offline.html");
const uk=JSON.parse(await read("assets/i18n/uk.json"));
const en=JSON.parse(await read("assets/i18n/en.json"));
assert.ok(css.includes("Onest-Variable.ttf")&&legalCss.includes("max-width:767px"),"Local styles missing");
assert.ok(!errors.includes('"%cVATRA%c')&&!errors.includes('console.log(')&&
 errors.includes('VATRA · Помилка')&&errors.includes('VATRA · Error'),
 "Do not print a VATRA banner in DevTools; keep branded error alerts");
assert.ok(errors.includes('window.addEventListener("error"')&&
 errors.includes('window.addEventListener("unhandledrejection"')&&
 errors.includes('for(const kind of ["error","warn"])')&&
 errors.includes('kind==="warn"?"warning":"error"')&&
 errors.includes('setTimeout(dismiss,DISPLAY_MS)')&&
 !errors.includes('window.VATRA_ERRORS={show}')&&
 !auth.includes("VATRA_ERRORS"),
 "Only console errors and warnings should show in automatically dismissing toasts; form errors stay inline");
assert.ok(css.includes(".vatra-error-stack")&&css.includes(".vatra-error-toast.is-visible")&&
 css.includes(".vatra-error-toast--warning")&&css.includes("border-left-color:#d99a32")&&
 errors.includes('VATRA · Попередження')&&errors.includes("VATRA · Warning"),
 "Console errors and warnings need separate red and amber VATRA notification designs");
assert.ok(css.includes('.vatra-input-shell .control::placeholder{color:transparent;opacity:0}')&&
 css.includes('.vatra-floating-hint{')&&
 css.includes('.vatra-input-shell:focus-within .vatra-floating-hint,')&&
 css.includes('.vatra-input-shell.is-floating .control,')&&
 !css.includes('.reg-floating-label'),
 "Both auth forms must have one floating hint per field without duplicate native labels");
assert.ok(!css.includes("*::-webkit-scrollbar")&&!css.includes("*{scrollbar-width")&&
 css.includes(".vatra-select-list::-webkit-scrollbar-thumb,.captcha-dialog::-webkit-scrollbar-thumb")&&
 css.includes(".language-scroll-track{")&&
 css.includes("scrollbar-color:var(--scroll-thumb) var(--scroll-track)"),
 "The website must keep its native browser scrollbar; custom scrollbar styling belongs only inside VATRA forms");
assert.ok(!css.includes(".orbit-badge")&&!css.includes("one-styleFix"),
 "Do not keep orphaned controls or cosmetic fix layers");
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,"Unbalanced CSS");
assert.ok(auth.includes("await window.VATRA_LANGUAGE?.ready"),"Auth must wait for translated fields");
assert.ok(auth.includes('auth.auth.signInWithPassword(')&&auth.includes('auth.auth.signUp('),"Email sign in/up missing");
assert.ok(auth.includes('auth.auth.verifyOtp({email,token,type:"recovery"})'),"Password OTP recovery missing");
assert.ok(auth.includes('auth.auth.resetPasswordForEmail('),"Recovery email request missing");
assert.ok(auth.includes('auth.auth.updateUser({password})'),"Password update missing");
assert.ok(auth.includes('preferred_locale:english?"en":"uk"'),"Signup must store selected email language");
assert.ok(!auth.includes("signInWithOtp({phone")&&!auth.includes("signUp({phone"),"Phone authentication prohibited");
assert.ok(lang.includes('fetch(ROOT + "assets/i18n/" + current + ".json"'),"Both JSON dictionaries must be loaded");
assert.ok(lang.indexOf('const validLanguage =')<lang.indexOf('const current = localFile ?'),
 "Language validation must be initialized before calculating the current locale");
assert.ok(lang.includes('function initLanguagePicker()')&&lang.includes('trigger.addEventListener("click",open)'),
 "Language dropdown must initialize reliably even if script is loaded late");
assert.ok(lang.includes('document.querySelectorAll("[data-i18n]")'),"DOM translation bindings missing");
assert.ok(lang.includes('location.reload()'),"Language selection must reuse the same page URL");
assert.ok(lang.includes('search.id = "vatra-language-search"')&&
 lang.includes('search.name = "vatra-language-search"'),
 "Language search input requires ID and name to support browser autofill");
assert.ok(lang.includes('search.placeholder = " ";')&&
 lang.includes('searchHint.textContent = words.search;')&&
 lang.includes('searchShell.append(search,searchHint,clearSearch)')&&
 css.includes('.language-search-shell .vatra-floating-hint{'),
 "Language search must share one floating hint with auth inputs");
assert.ok(lang.includes('clearSearch.className="language-search-clear vt-language-clear-button"')&&
 lang.includes('search.dispatchEvent(new Event("input",{bubbles:true}))')&&
 css.includes(".language-search-clear{position:absolute;top:50%;right:11px;")&&
 css.includes(".language-search::-webkit-search-cancel-button,"),
 "Language search must use a centered SVG clear button, not the browser X");
const excludedLocales=lang.slice(lang.indexOf("  const languages = ["),lang.indexOf("  const flagGroups="));
assert.ok(!/\["(?:ru|be)"/.test(excludedLocales),
 "Russian and Belarusian language entries must not appear in VATRA");

/* Verify language selection across independent page loads, cookie fallback,
   old Ukrainian bookmarks, and browsers which reject cookies. */
const languageStart=lang.indexOf("  function cookieLanguage() {");
const languageEnd=lang.indexOf("  /* A single URL per page.",languageStart);
assert.ok(languageStart>=0&&languageEnd>languageStart,"Persistent language helper missing");
const preferences=new Function("document","location","localStorage","ROOT","localFile",
 'const LANGUAGE_KEY="vatra-language";const validLanguage=value=>value==="uk"||value==="en";'+
 lang.slice(languageStart,languageEnd)+";return {saved,persist};");
let cookieValue="",cookieAttributes="";
const mockDocument={
 get cookie(){return cookieValue;},
 set cookie(value){cookieValue=value.split(";")[0];cookieAttributes=value;}
};
const memory=new Map();
const mockStorage={
 getItem:key=>memory.get(key)||null,
 setItem:(key,value)=>memory.set(key,value)
};
const currentHost={protocol:"https:"};
const firstVisit=preferences(mockDocument,currentHost,mockStorage,"/VATRA/",false);
firstVisit.persist("en");
assert.equal(firstVisit.saved(),"en","Selected English preference must be readable");
assert.equal(memory.get("vatra-language"),"en","Language must persist in localStorage");
assert.ok(cookieAttributes.includes("Max-Age=31536000")&&
 cookieAttributes.includes("Path=/VATRA/")&&cookieAttributes.includes("SameSite=Lax")&&
 cookieAttributes.includes("Secure"),
 "Language cookie must be durable, site-scoped, and secure");
memory.clear();
const reopened=preferences(mockDocument,currentHost,mockStorage,"/VATRA/",false);
assert.equal(reopened.saved(),"en","Reopened page must recover language from cookie");
assert.equal(memory.get("vatra-language"),"en","Recovered language must repopulate localStorage");
const legacyScript=(await read("404.html")).match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(legacyScript,"Previous locale URLs must keep their redirect");
const oldBookmark={pathname:"/VATRA/ua/index.html",search:"",hash:"",
 replace(url){this.redirectedTo=url;}};
new Function("document","location","localStorage",legacyScript)
 (mockDocument,oldBookmark,mockStorage);
assert.equal(memory.get("vatra-language"),"en",
 "Old /ua/ bookmark must not overwrite a previously selected English locale");
assert.equal(oldBookmark.redirectedTo,"/VATRA/","Legacy bookmark should redirect to root");
const blockedCookies={get cookie(){throw Error("cookies blocked");},
 set cookie(_){throw Error("cookies blocked");}};
const blockedStorage=new Map();
const fallbackStorage={
 getItem:key=>blockedStorage.get(key)||null,
 setItem:(key,value)=>blockedStorage.set(key,value)
};
const noCookies=preferences(blockedCookies,currentHost,fallbackStorage,"/VATRA/",false);
noCookies.persist("en");
assert.equal(noCookies.saved(),"en","Language must still work when cookies are blocked");

assert.ok(!lang.includes("location.replace(pathFor")&&!lang.includes("const explicit ="),"Old language-folder router remains");
assert.ok(host.includes('location.hostname==="mykolakolisnyk.github.io"')&&
 host.includes('location.protocol==="https:"')&&!host.includes('const localPreview='),
 "VATRA must show its public UI only on the official HTTPS origin");
assert.ok(lang.includes('["uk","Українська","Ukrainian","ua",true]')&&
 lang.includes('["en","English","English","gb",true]')&&
 lang.includes('["pl","Polski","Polish","pl"]')&&
 lang.includes("In development")&&lang.includes("У розробці")&&
 lang.includes("assets/flags/"),
 "Language picker must keep all 36 locales, with only two selectable and their flags visible");
const languageSection=lang.slice(lang.indexOf("  const languages = ["),lang.indexOf("  const flagGroups="));
assert.equal((languageSection.match(/\["/g)||[]).length,36,"Language picker must show 36 choices");
assert.equal((languageSection.match(/,true\]/g)||[]).length,2,"Only Ukrainian and English are active");
const flagSymbols=new Set();
for(const file of ["europe-a","europe-b","europe-c","world"]){
 const sprite=await read("assets/flags/"+file+".svg");
 for(const match of sprite.matchAll(/<symbol id="flag-([a-z]+)" viewBox="0 0 640 480"/g))
  flagSymbols.add(match[1]);
}
assert.equal(flagSymbols.size,36,"All available VATRA language flags must be real vector symbols");
for(const match of languageSection.matchAll(/\["[a-z]+","[^"]+","[^"]+","([a-z]+)"/g))
 assert.ok(flagSymbols.has(match[1]),"Flag SVG missing for "+match[1]);
assert.ok(lang.includes('const ROOT=new URL("../../",scriptUrl).pathname;'),
 "Language assets must resolve from the current site root, not a hard-coded /VATRA/");
assert.ok(network.includes("projectBase.pathname")&&network.includes('new URL("sw.js",projectBase)'),
 "Service worker must be registered relative to the current site");
assert.ok(offline.includes('src="data:image/svg+xml;charset=utf-8,'),
 "Offline logo must be available as a self-contained vector");
assert.ok(offline.includes("ui-offline-path-004")&&offline.includes("ui-offline-dot-001"),
 "Offline Wi-Fi-off icon must use the crisp SVG geometry");
assert.ok(offline.includes("controller?.scriptURL")&&offline.includes('href="./" data-i18n="n9"'),
 "Offline fallback must resolve assets and home link at nested routes and localhost");
assert.ok(offline.includes('data-page="offline"')&&lang.includes('dataset.page === "offline"'),
 "Offline screen must keep its own translations when used as a fallback for nested routes");
assert.ok(sw.includes("Promise.allSettled(ASSETS.filter("),
 "Optional resources must not prevent the offline fallback from installing");
assert.ok(sw.includes('const OFFLINE=ROOT+"offline.html"'),"Single offline page missing");
assert.ok(offline.includes('assets/js/errors.js')&&sw.includes('ROOT+"assets/js/errors.js"'),
 "Offline diagnostics and cached resource must exist");
assert.ok(sw.includes('ROOT+"assets/i18n/en.json"')&&sw.includes('ROOT+"assets/i18n/uk.json"'),
 "Offline worker must cache both dictionaries");
const ownRe=/\b(?:vt|ui)-[a-z0-9-]+/g;
const voidTags=new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
function inspect(path,html){
 const body=html.slice(html.search(/<body\b/i)).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,"");
 assert.ok(body.startsWith("<body"),path+": missing HTML body");
 const unique=new Set(),stack=[],missing=[];
 for(const token of body.match(/<[^>]*>|[^<]+/g)||[]){
  const close=token.match(/^<\/([a-z][a-z0-9-]*)\s*>/i);
  if(close){const index=stack.map(x=>x.tag).lastIndexOf(close[1].toLowerCase());if(index>=0)stack.length=index;continue;}
  const open=token.match(/^<([a-z][a-z0-9-]*)(?=[\s/>])([^>]*)>/i);
  if(open){
   const tag=open[1].toLowerCase(),classes=(open[2].match(/\bclass\s*=\s*"([^"]*)"/i)||[])[1]||"";
   const own=(classes.match(ownRe)||[]);
   assert.ok(own.length>=1,path+": missing individual class on "+tag);
   for(const item of own){assert.ok(!unique.has(item),path+": duplicate individual class "+item);unique.add(item);}
   if(!voidTags.has(tag)&&!token.endsWith("/>"))stack.push({tag,classes});
  }else if(!token.startsWith("<")&&/[\p{L}\p{N}]/u.test(token.trim())){
   const current=stack.at(-1);
   if(!current||!/\bvt-[a-z0-9-]+/.test(current.classes))missing.push(token.trim().slice(0,45));
  }
 }
 assert.deepEqual(missing,[],path+": visible text missing unique class");
 return unique.size;
}
let total=0;
for(const page of pages){
 const filename=page+".html",html=await read(filename);
 assert.ok(!/\.\.\/assets\//.test(html),filename+": outdated nested asset path");
 assert.ok(!/\/VATRA\/(?:ua|en)\//.test(html),filename+": stale locale-folder route");
 assert.ok(html.includes("data-i18n="),filename+": localized data nodes missing");
 assert.ok(html.includes("assets/js/lang.js"),filename+": shared language module missing");
 if(page!=="offline")assert.ok(html.includes("assets/css/auth.css"),filename+": central stylesheet missing");
 total+=inspect(filename,html);
 const bindings=[...html.matchAll(/\bdata-i18n="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(bindings).size,bindings.length,filename+": duplicate translation keys");
 const ukMap=uk.__pages[page]?.nodes,enMap=en.__pages[page]?.nodes;
 assert.ok(ukMap&&enMap,filename+": no page in both translation dictionaries");
 assert.deepEqual(Object.keys(ukMap).sort(),bindings.slice().sort(),filename+": Ukrainian dictionary bindings mismatch");
 assert.deepEqual(Object.keys(enMap).sort(),bindings.slice().sort(),filename+": English dictionary bindings mismatch");
}
const landing=await read("index.html");
const registerHtmlHasBrandedSymbol=(await read("register.html")).includes('class="signup-brand-symbol ui-signup-brand-symbol-001" src="assets/logo/vatra-symbol.svg"');
const features=["chat","business","communities","photos","video","music","marketplace","clips"];
assert.equal((landing.match(/class="orbit-node orbit-feature /g)||[]).length,8,"Eight small features required");
assert.equal((landing.match(/class="orbit-node orbit-message /g)||[]).length,0,"Retired outer slogan pills must be removed");
assert.ok(!landing.includes("ui-outer-track")&&landing.includes("intro-copy ui-home-div-009"),
 "Keep the restored description under VATRA artwork without bringing back outer slogan pills");
assert.equal((landing.match(/class="orbit-note orbit-note-/g)||[]).length,0,
 "Five VATRA orbit slogans must be removed");
assert.ok(landing.includes('data-i18n="n99"')&&landing.includes('data-i18n="n100"'),
 "Keep translated VATRA social-network description on the left");
assert.ok(landing.includes('aria-label="Бізнес"')&&
 landing.includes('data-i18n="n41">Бізнес</strong>')&&
 uk.__pages.index.nodes.n41.text["0"]==="Бізнес"&&
 en.__pages.index.nodes.n41.text["0"]==="Business",
 "Business orbit icon must have concise Ukrainian and English labels");
for(const feature of features){
 assert.ok(landing.includes('feature-'+feature+' ui-inner-node-'),"Missing feature "+feature);
 assert.ok(landing.includes('class="ui-orbit-'+feature+'-svg"'),"No custom SVG for "+feature);
 assert.ok(landing.includes('id="ua-orbit-tip-'+feature+'"'),"Tooltip missing "+feature);
}
assert.ok(css.includes('--inner-radius:min(34cqw,226px)')&&
 css.includes('width:clamp(112px,15vw,180px)')&&
 css.includes('width:clamp(44px,8.6cqw,61px)'),
 "Expanded orbit, central V, and eight icons must be scaled consistently");
assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')&&
 css.includes('font-size:clamp(31px,2.55vw,40px)')&&
 css.includes("max-width:69ch")&&
 css.includes(".intro-copy p{margin:0;color:var(--soft);font-size:15px"),
 "Landing columns must be equal and welcome text consistently readable on large and small screens");
for(const name of features){
 assert.ok(css.includes(".feature-"+name+"{--icon-color:")&&
  landing.includes('class="ui-orbit-'+name+'-svg"'),
  "Every VATRA vector icon must use a dedicated color and valid inline SVG");
}
assert.ok(css.includes("svg{shape-rendering:geometricPrecision}")&&
 css.includes(".language-option .language-flag{width:36px;height:27px"),
 "SVG icons and language flags must retain high-precision rendering");
assert.ok(lang.includes("Exact, sharp Union Jack paths")&&
 lang.includes("chevron.setAttribute(\"viewBox\",\"0 0 24 24\")"),
 "Language flag and chevron vectors must use precise geometry");
assert.ok(css.includes("animation-play-state:paused"),"Readable hover tooltip animation missing");
assert.ok(!css.includes(".orbit-note")&&
 css.includes("height:clamp(340px,calc(var(--inner-radius) * 2 + 64px),498px)")&&
 css.includes(".intro-copy{position:relative;z-index:2;width:100%;max-width:69ch;margin:0 auto;text-align:center}"),
 "VATRA welcome text must be centered below logo and no obsolete orbit slogans remain");
assert.ok(auth.includes("function wireOrbitTooltips()")&&
 auth.includes('panel.append(tip);')&&
 auth.includes('tip.classList.add("is-visible")')&&
 css.includes(".orbit-tooltip.is-visible{visibility:visible;opacity:1}")&&
 !css.includes(".orbit-tooltip.is-below"),
 "Tooltip text must remain outside the rotating icon layers");
assert.ok(css.includes("@keyframes vatraSignupSymbol")&&
 css.includes(".intro-symbol,.signup-brand-symbol{position:relative;width:clamp(112px,15vw,180px);height:auto;animation:vatraSignupSymbol 7s ease-in-out infinite}")&&
 !css.includes("vatraCoreBreath")&&
 landing.includes('class="intro-symbol ui-home-img-002" src="assets/logo/vatra-symbol.svg"')&&
 registerHtmlHasBrandedSymbol,
 "Both auth logos must be identical symbols with the same animation and size");
assert.ok(auth.includes("function wireFloatingHints()")&&
 css.includes(".signup-form-panel .field:has(input.control)>span:first-child{")&&
 css.includes(".register-page .reg-help-panel")&&css.includes(".vatra-error-stack"),
 "Floating hints must preserve registration captions and help");
assert.ok(landing.includes("Ваші люди. Ваші історії. Ваша VATRA."),"Complete brand footer missing");
assert.ok(landing.includes('class="auth-layout login-layout ui-login-layout-001"')&&
 !landing.includes('class="login-header ui-login-header-001"')&&
 !landing.includes('class="login-header-logo')&&
 !landing.includes('class="login-brand-kicker vt-login-brand-kicker-01"')&&
 landing.includes('class="login-form-kicker vt-login-form-kicker-01"')&&
 css.includes(".login-form-overline,.signup-form-overline{")&&
 css.includes("margin:auto;border-radius:28px")&&
 css.includes("border-radius:28px 0 0 28px")&&
 css.includes("border-radius:0 28px 28px 0"),
 "Login must have a centered card without the redundant upper logo/header");
assert.ok(!css.includes('.login-form-kicker::before')&&
 !css.includes('.signup-brand-eyebrow{')&&
 css.includes('animation:vatraAuthReveal .3s')&&
 !css.includes('@keyframes vatraSignupReveal')&&
 landing.includes('auth-footer-content ui-home-footer-content-001')&&
 css.includes('.auth-footer-content{'),
 "Consistent auth animation, clean login eyebrow and card-aligned footer must remain");
assert.ok(!css.includes(".register-page .field:has(input.control)")&&
 css.includes(".signup-form-panel .field:has(input.control)")&&
 css.includes('.login-layout::before{content:"";display:block;flex:0 0 36px;margin-bottom:14px}'),
 "Language modal must remain isolated from registration form and login must reserve nav space");
const register=await read("register.html"),forgot=await read("forgot.html"),reset=await read("reset.html");
assert.ok(!register.includes('class="reg-header')&&
 !register.includes('class="header-logo vt-register-link-01"')&&
 register.includes('class="signup-layout auth-layout ui-signup-layout-001"')&&
 register.includes('class="reg-back-nav ui-register-back-nav-001"')&&
 register.includes('href="./" class="back vt-register-link-02"')&&
 css.includes(".auth-layout{")&&css.includes(".login-layout::before{")&&css.includes(".login-layout .split{")&&css.includes(".reg-back-nav{")&&
 !register.includes('class="signup-brand-top')&&
 register.includes('auth-footer-content ui-register-footer-content-001'),
 "Registration must have a centered card with only the return-to-login link above it");
for(const file of [register,forgot,reset])assert.ok(file.includes("assets/js/auth.js"),"Shared auth module not loaded");
for(const file of [landing,register,forgot]){
 assert.ok(file.includes('src="assets/js/captcha.js"'),"Cloudflare widget not loaded");
 assert.ok(file.indexOf('src="assets/js/captcha.js')<file.indexOf('src="assets/js/auth.js'),"Cloudflare must load before auth");
}
assert.ok(register.includes('id="signup-confirmation" role="status" aria-live="polite" hidden')&&
 !register.includes('signup-confirmation-emblem')&&
 register.includes('id="signup-confirmation-resend"')&&
 register.includes('id="signup-confirmation-expiry"')&&
 register.includes('id="signup-confirmation-restart"')&&
 !register.includes('id="signup-confirmation-restart" href=')&&
 register.includes('content="Створити акаунт · VATRA"')&&
 css.includes(".signup-confirmation-timing{")&&
 auth.includes('auth.auth.resend({')&&
 auth.includes('SIGNUP_RESEND_COOLDOWN_MS=60000')&&
 auth.includes('SIGNUP_LINK_ESTIMATE_MS=900000'),
 "The account-creation confirmation screen needs a distinct resend/cooldown state");
assert.ok(uk.__pages.register.meta.title==="Створити акаунт · VATRA"&&
 en.__pages.register.meta.title==="Create account · VATRA"&&
 !register.includes('href="./" class="vt-register-link-10"'),
 "Registration tab and account-creation links must use consistent naming");
assert.ok(captcha.includes('dispose(scope,state);')&&
 captcha.indexOf('dispose(scope,state);')<captcha.indexOf('waiting.resolve(token);')&&
 captcha.includes('try{window.turnstile?.remove?.(state.id);}catch(_){}')&&
 !captcha.includes('state.dialog.hide();\n    waiting.resolve(token);'),
 "Turnstile must remove its widget before detaching the dialog, avoiding spurious warnings");
assert.ok(register.includes('id="consent"')&&register.includes('id="signup-form"'),"Signup consent or form missing");
assert.ok(register.includes('data-register-step="1"')&&register.includes('data-register-step="2" hidden')&&
 register.includes('id="register-next"')&&register.includes('id="register-back"')&&
 register.includes('signup-brand ui-signup-brand-001')&&
 css.includes('.signup-form-panel')&&css.includes('.signup-brand')&&
 auth.includes('function wireRegistrationWizard()')&&auth.includes('validateRegistrationStep(first)'),
 "Two-stage VATRA signup, branding and scoped validation must remain intact");
assert.ok(css.includes('.reg-main{width:min(calc(100% - 88px),1300px);min-height:clamp(650px,calc(100svh - 128px),770px)')&&
 css.includes('.signup-form-panel .narrow-form{width:100%;max-width:520px;margin:0 auto;min-width:0;animation:vatraAuthReveal .3s')&&
 css.includes('.signup-step{display:grid;gap:17px;min-width:0}')&&
 !css.includes('.signup-step{display:grid;gap:17px;min-width:0;animation:')&&
 !css.includes('@media(max-width:900px)')&&
 !css.includes('min(100% - 112px,1280px)'),
 "Login and signup must share card dimensions, inner form sizing and full-form animation");
for(const id of ["first-name","last-name","gender","email","password","password-confirm"]){
 assert.ok(register.includes('id="'+id+'"'),"Missing registration control: "+id);
}
assert.ok(register.includes('class="reg-help-trigger vt-register-summary-01"')&&
 register.includes('class="reg-help-link vt-register-summary-02"')&&
 register.includes('href="privacy.html#purpose" target="_blank"'),
 "Signup gender and email must explain why data is requested");
for(const [path,ids] of [["index.html",["email","password"]],["register.html",["first-name","last-name","email","password","password-confirm"]]]){
 const html=await read(path);
 for(const id of ids){
  const input=html.match(new RegExp('<input\\b[^>]*\\bid="'+id+'"[^>]*>'))?.[0]||"";
  assert.ok(input.includes('placeholder=" "'),path+": floating control must not first render a native placeholder: "+id);
 }
 const hints=(html.match(/class="vatra-floating-hint\b/g)||[]).length;
 assert.equal(hints,ids.length,path+": one static floating caption per input");
}
for(const path of ["index.html","register.html"]){
 const html=await read(path);
 const toggles=[...html.matchAll(/<button[^>]*data-password-toggle="[^"]+"[^>]*>/g)];
 assert.ok(toggles.length>0&&toggles.every(x=>/\shidden(?:\s|>)/.test(x[0])),path+": empty password controls must hide reveal buttons before JS runs");
}
assert.ok(css.includes('.signup-form-panel .field>span:first-child{font-size:13px;line-height:1.4;font-weight:700')&&
 css.includes('.control{border:1px solid #d7ddea;background:white;border-radius:13px;padding:12px 15px;width:100%;min-width:0;height:51px;font-size:15px')&&
 !css.includes('.three .control{font-size:12px'),"Registration captions and birthday selectors must share typography");
assert.ok(auth.includes('button.hidden=!hasText;')&&auth.includes('if(!input.value)return;'),
 "Password reveal controls must appear only after a value is entered");
assert.ok(auth.includes('function wireFloatingHints()')&&
 auth.includes('const hint=shell?.querySelector(":scope > .vatra-floating-hint");')&&
 !auth.includes('document.createElement("span");\n  hint.className="vatra-floating-hint"')&&
 auth.includes('shell.classList.toggle("is-floating",')&&
 !auth.includes("wireStableInputHints"),
 "Both forms must restore floating hints without duplicates");
assert.ok(auth.includes("FIELD_ERROR_DURATION_MS=5500")&&
 auth.includes("fieldErrorTimers.set(control,setTimeout")&&
 css.includes(".check-terms>span .field-error{display:flex;"),
 "Field errors must expire automatically and align consent messages");
assert.ok(auth.includes("function wireHoverHelp()")&&auth.includes("other!==help&&other.open")&&
 auth.includes('help.addEventListener("pointerenter"'),
 "Gender and email help must open on hover and never overlap");
assert.ok(css.includes("align-items:start")&&css.includes(".signup-form-panel .two>.field{align-content:start;align-self:start}"),
 "Two-column registration inputs must not move when a field shows validation errors");
for(const page of pages.filter(p=>p!=="offline")){
 const html=await read(page+".html");
 assert.ok(html.includes('ui-language-static-flag-001')&&html.includes('ui-language-static-chevron-001'),
  page+": language switch must show SVG flag and chevron even before JavaScript runs");
 assert.ok(html.includes("assets/js/lang.js")&&html.includes("assets/js/errors.js"),page+": shared language picker and diagnostics missing");
 assert.ok(html.includes("assets/css/auth.css")&&!/assets\/(?:js|css)\/[^"\x27]+\?v=/.test(html),page+": local asset paths must be stable and unversioned");
}
assert.ok(lang.includes("function initLanguagePicker()")&&lang.includes("trigger.addEventListener(\"click\",open)"),
 "Language toggle must initialize early and open the full modal");
// All public pages use the same footer structure; the full-width background
// remains separate from the centered content. Documents have a working
// single-row header independent of the former signup header styles.
const footerNames=pages.filter(p=>p!=="offline");
for(const page of footerNames){
 const html=await read(page+".html");
 const tag=page==="index"?"home":page;
 assert.ok(html.includes('class="auth-footer-content ui-'+tag+'-footer-content-001"'),
  page+": missing shared centered footer container");
}
for(const page of ["terms","privacy","cookies"]){
 const html=await read(page+".html");
 assert.ok(html.includes('class="policy-top-inner ui-'+page+'-top-inner-001"')&&
  html.includes('class="reg-header policy-top ui-'+page+'-header-001"')&&
  html.includes("assets/css/legal.css"),
  page+": documents need a functioning unified header and fresh stylesheet");
}
for(const page of ["account","404"]){
 const html=await read(page+".html");
 assert.ok(html.includes('class="account-top-inner ui-'+page+'-header-inner-001"'),
  page+": account-style header must align with the shared footer");
}
assert.ok(legalCss.includes(".policy-page .policy-top{display:flex;align-items:center;")&&
 legalCss.includes(".policy-top-inner{display:flex;")&&
 legalCss.includes(".policy-page .auth-footer-content{width:min(calc(100% - 52px),1100px)")&&
 css.includes(".center-page .footer,.account-page .footer{padding-inline:0}")&&
 css.includes(".account-top-inner{"),
 "Page headers, document content and shared footer must use centered containers");
assert.ok(landing.includes('data-i18n="n128">Створити акаунт</a>')&&
 register.includes('data-i18n="n59">Створити акаунт</button>')&&
 uk.__pages.index.nodes.n128.text["0"]==="Створити акаунт"&&
 en.__pages.index.nodes.n128.text["0"]==="Create account"&&
 uk.__pages.register.nodes.n59.text["0"]==="Створити акаунт",
 "Create account must be the unified account creation action");
assert.ok(css.includes('--inner-radius:min(34cqw,226px)')&&
 css.includes('.field-error::before{content:"!"'),
 "Orbit size and visual validation details must be updated");
assert.ok(register.includes('class="vatra-input-shell ')&&
 register.includes('class="vatra-floating-hint ')&&
 !auth.includes("wireStableInputHints"),
 "Login and signup floating hints must use original translated text");
for(const page of ["terms","privacy","cookies","forgot","reset","account","404"]){
 const html=await read(page+".html");
 assert.ok(html.includes('data-i18n="n301">Увійти</a>')&&
 html.includes('data-i18n="n302">Створити акаунт</a>')&&
 uk.__pages[page].nodes.n302.text["0"]==="Створити акаунт"&&
 en.__pages[page].nodes.n302.text["0"]==="Create account",
 page+": guest footer must provide sign-in and account creation in both languages");
}
for(const page of ["terms","privacy","cookies"]){
 const html=await read(page+".html");
 assert.ok(!html.includes("policy-eyebrow")&&!html.includes("VATRA · Інформація")&&
 !html.includes('href="terms.html" class="vt-'+page+'-footer-legal'),
 page+": redundant document eyebrow and footer navigation must be gone");
}


assert.ok(css.includes(".login-form-kicker,.signup-form-kicker{display:inline-flex;")&&
 css.includes(".login-description,.signup-step-heading .subtitle{color:var(--soft);font-size:14px;line-height:1.65")&&
 css.includes(".form-box h2,.narrow-form h1,.signup-step-heading :is(h1,h2){margin:0 0 10px;")&&
 css.includes(".site .form-box .action.primary,.signup-form-panel .action.primary{min-height:55px;"),
 "Auth pages must share heading, eyebrow, paragraph and primary-button design tokens");
assert.ok(css.includes(".intro-copy p strong{display:block;")&&
 css.includes(".signup-brand-copy{position:relative;z-index:1;text-align:center}")&&
 css.includes(".signup-brand-highlights{position:relative;z-index:1;display:flex;justify-content:center;")&&
 css.includes(".signup-brand-highlight{display:inline-flex;align-items:center;min-height:35px;"),
 "Promotional copy and larger hashtag chips must be consistent");
const signupTags=["#спілкування","#бізнес","#спільноти","#фотографії","#відео","#музика","#маркетплейс","#кліпи"];
const signupKeys=[205,206,207,230,231,232,233,234];
assert.ok(!register.includes("Особистий VATRA ID")&&
 signupTags.every((tag,i)=>register.includes('data-i18n="n'+signupKeys[i]+'">'+tag+'</span>'))&&
 signupTags.every((tag,i)=>uk.__pages.register.nodes["n"+signupKeys[i]]?.text["0"]===tag&&
 en.__pages.register.nodes["n"+signupKeys[i]]?.text["0"]===tag),
 "Registration must show all eight requested hashtags in both dictionaries");
for(const page of ["terms","privacy","cookies"]){
 const html=await read(page+".html");
 assert.ok(!html.includes('policy-nav-icon')&&
 !html.includes('>Усі документи</a>')&&
 (html.match(/<nav class="policy-tabs[^"]*"[^>]*>/g)||[]).length===1,
 page+": only three text tabs should remain in legal navigation");
}
assert.ok(!legalCss.includes(".policy-cards")&&
 !legalCss.includes(".policy-summary")&&!legalCss.includes(".policy-end")&&
 !css.includes(".footer-doc-icon{"),
 "Deleted document overview must leave no orphan card styles");
for(const page of ["index","register","forgot","reset","account","404"]){
 const html=await read(page+".html");
 assert.ok(!html.includes('footer-doc-icon'),
 "Document icons must not appear in footer: "+page);
}
assert.ok(register.includes('>Уже підтвердили? Увійти</a>')&&
 uk.__pages.register.nodes.n223.text["0"]==="Уже підтвердили? Увійти"&&
 !register.includes('href="./" class="vt-register-link-10"'),
 "Confirmation screen must have one contextual sign-in link");
for(const page of ["terms","privacy","cookies","forgot","reset","account","404"]){
 const html=await read(page+".html");
 assert.ok(!html.includes('>Вхід</a>')&&html.includes('>Увійти</a>')&&
  uk.__pages[page].nodes.n301.text["0"]==="Увійти",
  "All guest sign-in CTAs must use the same Ukrainian verb on "+page);
}

assert.ok(css.includes(".signup-form-panel .field:has(input.control)>span:first-child")&&
 css.includes(".register-page .reg-help-panel"),
 "Registration needs visible static captions and VATRA-style accessible help popovers");
assert.ok(forgot.includes('id="recovery-step"')&&forgot.includes('id="recovery-code-form"'),"Recovery code step missing");
assert.ok(forgot.includes('id="recovery-resend"'),"Repeat code request missing");
assert.ok(reset.includes('id="reset-form"')&&reset.includes('id="recovery-code-form"'),"Direct reset code and password forms missing");
for(const file of [forgot,reset]){
 assert.ok(file.includes('pattern="[0-9]{6,10}" minlength="6" maxlength="10"'),
  "Recovery form must accept the Supabase-configured 6–10 digit OTP");
}
assert.ok(auth.includes("if(!/^\\d{6,10}$/.test(token))"),
 "Recovery JavaScript must accept the same 6–10 digit OTP range");
assert.ok(captcha.includes('execution:"execute"')&&captcha.includes('appearance:"always"'),"Cloudflare must run in modal on action");
assert.ok(captcha.includes("captcha-backdrop"),"Security modal missing");
assert.ok(auth.includes("captchaToken:token"),"Supabase requests must include CAPTCHA token");
for(const script of ["assets/js/auth.js","assets/js/lang.js","assets/js/errors.js","assets/js/captcha.js","assets/js/host.js","assets/js/network.js","sw.js"]){
 const scriptSource=await read(script);
 assert.doesNotThrow(()=>new Function(scriptSource),script+": invalid JavaScript");
}
const errorPage=await read("404.html");
assert.ok(errorPage.includes("Перейти на головну")&&!errorPage.includes("Повернутися до входу"),
 "404 primary action must not presume the user's previous location");
assert.ok(css.includes("color:#fff;text-decoration:none}")&&
 css.includes(".error-card a.error-action:hover"),
 "404 navigation link and arrow must not be underlined on hover");
for(const name of ["terms","privacy","cookies"]){
 const html=await read(name+".html");
 const dictionary=uk.__pages[name];
 assert.ok(html.includes("Оновлено 8 листопада 2026 року"),
  name+": legal revision date is stale");
 assert.ok(!/\bми\b|\bнаша\b|\bнаші\b/iu.test(html.replace(/<[^>]+>/g," ")),
  name+": text must not describe the developer as a team");
 for(const node of Object.values(dictionary.nodes)){
  for(const original of Object.values(node.text||{})){
   assert.ok(html.includes(original),name+": Ukrainian document diverges from its dictionary");
  }
 }
}
assert.ok((await read("privacy.html")).includes("Електронна пошта потрібна для підтвердження реєстрації")&&
 (await read("privacy.html")).includes("Стать указувати необов’язково"),
 "Privacy policy must actually explain registration email and gender");
assert.ok(!(await read("privacy.html")).includes("Самостійне видалення акаунта зараз"),
 "Privacy page must give the actual contact process instead of placeholder UI");
assert.ok(!(await read("account.html")).includes("Персональні розділи стануть доступними"),
 "Account page must not advertise future sections");
assert.ok(errorPage.includes('data-page="not-found"')&&errorPage.includes("error-home-link"),"404 page must stay an error, not a profile");
assert.ok(errorPage.includes('href="/VATRA/"')&&errorPage.includes('src="/VATRA/assets/logo/vatra-logo.svg"'),
 "GitHub Pages 404 must work at nested missing URLs");
assert.ok(errorPage.includes("location.replace(target+location.search+location.hash)"),
 "Old localized links should redirect to unified URLs");
assert.ok(!/profile\.js|data-page="public-profile"|supabase-js/.test(errorPage),"404 must not load private account logic");
for(const name of emailNames){
 const email=await read("email-templates/"+name+".html");
 assert.ok(email.includes('.Data.preferred_locale'),"Email "+name+" loses UA/EN language choice");
 assert.ok(!/https:\/\/mykolakolisnyk\.github\.io\/VATRA\/(?:ua|en)\//.test(email),
  "Email "+name+" links must use root routes");
}
assert.ok(!/\/VATRA\/(?:ua|en)\//.test(await read("sitemap.xml")),"Old locale sitemap routes remain");
const obsolete=pages.flatMap(page=>["ua/"+page+".html","en/"+page+".html"]);
for(const file of obsolete)await assert.rejects(stat(file),{code:"ENOENT"},"Duplicate localized page must be removed: "+file);
console.log("VATRA: "+pages.length+" root pages, "+total+" unique UI classes, 2 JSON locales, auth, CAPTCHA and offline verified.");
