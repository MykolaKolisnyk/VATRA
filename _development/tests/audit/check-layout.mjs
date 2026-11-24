import assert from "node:assert/strict";
import {readFile,stat,readdir} from "node:fs/promises";
const read=path=>readFile(path,"utf8");
const pages=["index","404","create-account","forgot","reset","verify","feed","profile","documents","terms","privacy","cookies","commerce","offline","maintenance"];
const emailNames=["confirmation","invite","recovery","magic-link","email-change","reauthentication","password-changed","email-address-changed"];
const authBaseCss=await read("assets/css/base.css");
const signInCss=await read("assets/css/sign-in.css");
const createAccountCss=await read("assets/css/create-account.css");
const recoveryCss=await read("assets/css/recovery.css");
const verifyCss=await read("assets/css/verify.css");
const notFoundCss=await read("assets/css/not-found.css");
const css=[authBaseCss,signInCss,createAccountCss,recoveryCss,verifyCss,notFoundCss].join("\n");
const legalCss=await read("assets/css/legal.css");
const authShared=await read("assets/js/auth-core.js");
const authSignIn=await read("assets/js/sign-in.js");
const authCreateAccount=await read("assets/js/create-account.js");
const authRecovery=await read("assets/js/recovery.js");
const authVerify=await read("assets/js/verify.js");
const auth=[authShared,authSignIn,authCreateAccount,authRecovery,authVerify].join("\n");

assert.ok(
 !authShared.includes('function wireLogin(')&&
 !authShared.includes('function wireCreateAccount(')&&
 !authShared.includes('function wireForgot(')&&
 authSignIn.includes("function wireLogin(")&&
 authCreateAccount.includes("function wireCreateAccount(")&&
 authRecovery.includes("function wireForgot(")&&
 authVerify.includes("async function wireAccount("),
 "Authentication actions must reside in the correct page-owned JavaScript");
assert.ok(
 signInCss.includes(".site")&&createAccountCss.includes(".signup-")&&
 recoveryCss.includes(".forgot-")&&
 !authBaseCss.includes(".create-account-page"),
 "Sign in, Create account and recovery styles must be separately maintained");
const accountPage=await read("create-account.html");
assert.ok(
 accountPage.includes('data-page="create-account"')&&
 accountPage.includes("assets/css/create-account.css")&&
 accountPage.includes("assets/js/create-account.js")&&
 (await read("index.html")).includes("assets/css/sign-in.css")&&
 (await read("index.html")).includes("assets/js/sign-in.js")&&
 (await read("forgot.html")).includes("assets/css/recovery.css")&&
 (await read("verify.html")).includes("assets/js/verify.js"),
 "Each authentication page must load its own CSS and JavaScript after shared resources");


const authPageModules=[
 ["index","login","sign-in","sign-in"],
 ["create-account","create-account","create-account","create-account"],
 ["forgot","forgot","recovery","recovery"],
 ["reset","reset","recovery","recovery"],
 ["verify","verify","verify","verify"]
];
const authControllerNames=["sign-in","create-account","recovery","verify"];
for(const [name,pageId,controller,stylesheet] of authPageModules){
 const html=await read(name+".html");
 const js='src="assets/js/'+controller+'.js';
 const shared='src="assets/js/auth-core.js';
 assert.ok(html.includes('data-page="'+pageId+'"')&&
  html.split(js).length===2&&html.split(shared).length===2&&
  html.indexOf(js)<html.indexOf(shared)&&
  html.includes('href="assets/css/'+stylesheet+'.css')&&
  authControllerNames.filter(other=>other!==controller).every(other=>
   !html.includes('src="assets/js/'+other+'.js')),
  name+": must load one matching auth controller before the shared initializer");
}
assert.ok(
 authSignIn.includes('if(!data?.session||!data?.user?.email_confirmed_at){')&&
 authSignIn.includes('confirmationError.code="email_not_confirmed";')&&
 authCreateAccount.includes('if(data?.session&&data?.user?.email_confirmed_at){'),
 "Only confirmed Supabase sessions may navigate to Feed");


const missingPage=await read("404.html");
assert.ok(missingPage.includes('src="/VATRA/assets/js/not-found.js"')&&
 missingPage.includes('href="/VATRA/assets/css/not-found.css"')&&
 !missingPage.includes('const dynamic=location.pathname.match(')&&
 notFoundCss.includes('html.vatra-dynamic-route-pending body.error-page > :not(.vatra-route-loading)'),
 "404 fallback must keep routing in its own module and hide the error page for valid permalinks");


const captcha=await read("assets/js/captcha.js");
const lang=await read("assets/js/lang.js");
// These account sections must never show "404 Page not found" in the
// English browser tab while the asynchronous translation JSON is loading.
const instantEnglishTitles=lang.slice(lang.indexOf("  const instantEnglishTitles={"),
 lang.indexOf("\n  };",lang.indexOf("  const instantEnglishTitles={")));
for(const [page,title] of [["friends","Friends"],["gifts","Gifts"]]){
 const html=await read(page+".html");
 assert.ok(instantEnglishTitles.includes(page+':"'+title+'"')&&
  html.indexOf('src="assets/js/lang.js')>=0&&
  html.indexOf('src="assets/js/lang.js')<html.indexOf("<title>"),
  page+": English tab title must be ready before DOM and remote translations");
}
const sw=await read("sw.js");
const host=await read("assets/js/host.js");
const network=await read("assets/js/network.js");
const offline=await read("offline.html");
const offlineStyles=await read("assets/css/offline.css");
const offlineActions=await read("assets/js/offline.js");
assert.ok(offline.includes('href="assets/css/offline.css"')&&
 offline.includes('src="assets/js/offline.js"')&&
 offlineStyles.includes('.offline-content')&&
 offlineActions.includes('addEventListener("online"')&&
 sw.includes('ROOT+"assets/css/offline.css"')&&
 sw.includes('ROOT+"assets/js/offline.js"'),
 "Offline page must use its own CSS/JS and cache both for unavailable networks");

const uk=JSON.parse(await read("assets/i18n/uk.json"));
const en=JSON.parse(await read("assets/i18n/en.json"));
assert.ok(
 auth.includes('if(!window.VATRA_CAPTCHA?.enabled){const error=new Error("captcha_unavailable")')&&
 auth.includes('if(error||!user||!user.email_confirmed_at)')&&
 auth.includes('#reset-form .field:has(input.control)'),
 "Auth requests must fail closed on missing CAPTCHA and profiles require confirmed email");
for(const html of ["forgot.html","reset.html"]){
 const src=await read(html);
 for(const id of ["password","password-confirm"]){
  const input=src.match(new RegExp('<input[^>]+id="'+id+'"[^>]+>'))?.[0]||"";
  assert.ok(input.includes('placeholder=" "')&&!input.includes('data-i18n='),
   html+": password input must have static floating hint and no native placeholder");
 }
 const hints=[...src.matchAll(/class="vatra-floating-hint[^"]*" aria-hidden="true" data-i18n="n(?:25|30|57|58)"/g)];
 assert.equal(hints.length,2,html+": password fields must share two translated floating hints");
}
assert.ok(uk.__pages.forgot.nodes.n57.text["0"]==="Введіть пароль"&&
 en.__pages.forgot.nodes.n58.text["0"]==="Confirm password"&&
 uk.__pages.reset.nodes.n30.text["0"]==="Повторіть пароль"&&
 en.__pages.reset.nodes.n25.text["0"]==="Enter password",
 "Both recovery password screens must have matching Onest labels in both languages");
// Reject same-context duplicate selector definitions; media-specific overrides are allowed.
function repeatedCssSelectors(content){
 const plain=content.replace(/\/\*[\s\S]*?\*\//g,"");
 const scopes=[],seen=new Set(),duplicates=[];
 let start=0;
 for(let i=0;i<plain.length;i++){
  if(plain[i]==="{"){
   const selector=plain.slice(start,i).trim();
   const scope=scopes.filter(v=>v.startsWith("@")).join("|");
   if(selector&&!selector.startsWith("@")&&!scope.includes("@keyframes")){
    const key=scope+"|"+selector;
    if(seen.has(key))duplicates.push(key);else seen.add(key);
   }
   scopes.push(selector);start=i+1;
  }else if(plain[i]==="}"){scopes.pop();start=i+1;}
 }
 return duplicates;
}
assert.deepEqual(repeatedCssSelectors(css),[],"Duplicate CSS selectors in the same responsive context");
// A single password policy and floating-hint system serve all auth forms.
assert.ok(auth.includes('function passwordIssue(value){')&&
 auth.includes('function validPassword(value){return passwordIssue(value)==="";}')&&
 auth.includes('if(control.type==="password"&&form.id!=="login-form")return passwordIssue(value);')&&
 (auth.match(/const passwordProblem=passwordIssue\(password\);/g)||[]).length===2&&
 auth.includes('code==="same_password"')&&
 !auth.includes('if(status&&heading)heading.after(status);')&&
 !auth.includes('if(status&&step.contains(status))form.before(status);')&&
 authShared.includes('window.VATRA_TOAST.show(message,type,options)'),
 "Signup and both reset flows must share a specific password validator and aligned error placement");
for(const [page,key,id] of [
 ["create-account","n260","create-account-password-policy"],["forgot","n60","forgot-password-policy"],
 ["reset","n46","reset-password-policy"]
]){
 const html=await read(page+".html");
 assert.ok(html.includes('id="'+id+'" class="password-policy-note')&&
  html.includes('data-i18n="'+key+'"')&&
  uk.__pages[page].nodes[key].text["0"].includes("12–128")&&
  en.__pages[page].nodes[key].text["0"].includes("12–128")&&
  css.includes('.password-policy-note{margin:-2px 0 2px;'),
  "Password rules should be visible in identical Onest typography on "+page);
}
// No signed-in user can reset a password without a proven recovery event or OTP.
assert.ok(auth.includes('let recoveryVerifiedUserId=null;')&&
 auth.includes('if(event==="PASSWORD_RECOVERY"&&session?.user?.id)reveal(session.user);')&&
 auth.includes('if(!recoveryVerifiedUserId){')&&
 auth.includes('user.id!==recoveryVerifiedUserId')&&
 !auth.includes('if(!error&&data?.user)reveal();'),
 "Password recovery must be bound to verified identity");
const registerHtml=await read("create-account.html");
assert.ok(!registerHtml.includes('vatra-create-account-paragraph-02')&&
 !Object.hasOwn(uk.__pages["create-account"].nodes,"n51")&&
 !Object.hasOwn(en.__pages["create-account"].nodes,"n51"),
 "Do not duplicate the password requirements in signup or translations");
assert.ok(css.includes('.password-policy-note{margin:-2px 0 2px;color:var(--soft);font-size:13px;')&&
 css.includes('.signup-step{display:grid;gap:17px;min-width:0}')&&
 auth.includes('if(animate)replayAuthContent(q(".signup-form-panel .narrow-form"));')&&
 createAccountCss.includes('.signup-form-panel .narrow-form')&&
 createAccountCss.includes('.signup-confirmation')&&
 signInCss.includes('.site .form-box'),
 "Shared password typography and reduced-motion-aware transitions");
const forgotMarkup=await read("forgot.html");
assert.equal(forgotMarkup.split("<section ").length,forgotMarkup.split("</section>").length,
 "Forgot password must have properly balanced section elements");
assert.ok(css.includes('.footer nav{display:flex;flex-wrap:wrap;align-items:center;gap:9px 20px;font-size:13px;font-weight:600}')&&
 css.includes('.auth-footer-content>span{font-size:13px;line-height:1.6;font-weight:450;letter-spacing:.005em;color:#617087}')&&
 css.includes('.auth-footer-content>span b{font-weight:770;color:var(--ink)}')&&
 css.includes('.language-trigger{display:inline-flex;')&&
 legalCss.includes('padding:40px 0 40px;flex:1')&&
 !(await read("404.html")).includes('<footer'),
 "All VATRA page footers, document navigation and full-panel motion should match");
// Every visible element has a class and its own page class in addition to reusable components.
for(const name of pages){
 const markup=await read(name+".html");
 for(const match of markup.matchAll(/<(h[1-6]|p|a|button|input|select|textarea|span|label|li|nav|main|section|div|header|footer|svg|img)(?=[\s>])([^>]*)>/g)){
  const attrs=match[2];
  const classes=attrs.match(/\sclass="([^"]+)"/)?.[1]?.split(/\s+/)||[];
  assert.ok(classes.length>0&&classes.some(c=>c.startsWith("vatra-")||c.startsWith("ui-")),
   name+".html: a visible element must have a page-specific style hook: "+match[0].slice(0,120));
 }
}
assert.ok(css.includes('@keyframes vatraLanguageBackdrop')&&
 css.includes('.language-dialog > :not([hidden]){animation:vatraAuthReveal')&&
 css.includes('.language-backdrop,.language-dialog > :not([hidden]){animation:none!important}')&&
 css.includes('.ui-forgot-main-001 .forgot-panel-brand{order:0;')&&
 css.includes('height:52px;border:0;border-radius:0;background:transparent')&&
 css.includes('.ui-forgot-main-001 .forgot-panel-header .back{order:1;'),
 "Recovery navigation and language modal should share VATRA branding and motion");
assert.ok(css.includes("Onest-Variable.ttf")&&legalCss.includes("max-width:767px"),"Local styles missing");
assert.ok(!(await readdir("assets/js")).includes("errors.js")&&!auth.includes("VATRA_ERRORS"),
 "Retired browser diagnostics must not be recreated");
assert.ok(css.includes('.vatra-input-shell .control::placeholder{color:transparent;opacity:0}')&&
 css.includes('.vatra-floating-hint{')&&
 css.includes('.vatra-input-shell:focus-within .vatra-floating-hint,')&&
 css.includes('.vatra-input-shell.is-floating .control,')&&
 !css.includes('.create-account-floating-label'),
 "Both auth forms must have one floating hint per field without duplicate native labels");
assert.ok(!css.includes("*::-webkit-scrollbar")&&!css.includes("*{scrollbar-width")&&
 !css.includes("html::-webkit-scrollbar")&&!css.includes("body::-webkit-scrollbar")&&
 css.includes("@property --vatra-form-scroll-alpha")&&
 css.includes(".language-scroll-track.is-visible")&&
 css.includes("background:#454b54")&&
 css.includes("scrollbar-color:rgb(64 70 79 / var(--vatra-form-scroll-alpha)) transparent")&&
 css.includes(".captcha-dialog")&&css.includes(".vatra-select-list")&&
 !css.includes(".language-scroll-track:hover"),
 "Page-level scrollbars must stay native; only VATRA forms get dark, fading, hover-free scrollbars");
assert.ok(!css.includes(".orbit-badge")&&!css.includes("one-styleFix"),
 "Do not keep orphaned controls or cosmetic fix layers");
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,"Unbalanced CSS");
assert.ok(auth.includes("await window.VATRA_LANGUAGE?.ready"),"Auth must wait for translated fields");
assert.ok(auth.includes('auth.auth.signInWithPassword(')&&auth.includes('auth.auth.signUp('),"Email sign in/up missing");
assert.ok(auth.includes('auth.auth.verifyOtp({email,token,type:"recovery"})'),"Password OTP recovery missing");
assert.ok(auth.includes('auth.auth.resetPasswordForEmail('),"Recovery email request missing");
assert.ok(auth.includes('auth.auth.updateUser({password})'),"Password update missing");
assert.ok(auth.includes('preferred_locale:window.VATRA_LANGUAGE?.locale||"uk"')&&
 lang.includes('const validLanguage=value=>supportedLanguages.includes(value);'),
 "Signup must store a validated selected email language");
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
assert.ok(lang.includes('clearSearch.className="language-search-clear vatra-language-clear-button"')&&
 lang.includes('search.dispatchEvent(new Event("input",{bubbles:true}))')&&
 css.includes(".language-search-clear{position:absolute;top:50%;right:11px;")&&
 css.includes(".language-search::-webkit-search-cancel-button,"),
 "Language search must use a centered SVG clear button, not the browser X");
const excludedLocales=lang.slice(lang.indexOf("  const languages = ["),lang.indexOf("  const flagGroups="));
assert.ok(!/\["(?:ru|be|sk|hu|sr|zh)"/.test(excludedLocales),
 "Unavailable and intentionally excluded locale entries must not appear in VATRA");

/* Verify language selection across independent page loads, cookie fallback,
   old Ukrainian bookmarks, and browsers which reject cookies. */
const languageStart=lang.indexOf("  function cookieLanguage() {");
const languageEnd=lang.indexOf("  function bindLocalizedLinks() {",languageStart);
assert.ok(languageStart>=0&&languageEnd>languageStart,"Persistent language helper missing");
const preferences=new Function("document","location","localStorage","ROOT","localFile",
 'const LANGUAGE_KEY="vatra-language";const validLanguage=value=>["uk","en","pl","de","fr","it","ka","bg"].includes(value);'+
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
firstVisit.persist("pl");
assert.equal(firstVisit.saved(),"pl","Polish preference must persist in cookie and localStorage");
firstVisit.persist("ka");
assert.equal(firstVisit.saved(),"ka","Georgian preference must persist independently of page");
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
const legacyScript=await read("assets/js/not-found.js");
assert.ok(legacyScript,"Previous locale URLs must keep their redirect");
const oldBookmark={pathname:"/VATRA/ua/index.html",search:"",hash:"",
 replace(url){this.redirectedTo=url;}};
new Function("document","location","localStorage",legacyScript)
 (mockDocument,oldBookmark,mockStorage);
assert.equal(memory.get("vatra-language"),"en",
 "Old /ua/ bookmark must not overwrite a previously selected English locale");
assert.equal(oldBookmark.redirectedTo,"/VATRA/","Legacy bookmark should redirect to root");
assert.ok(legacyScript.includes('const staticPage=location.pathname.match(')&&
 legacyScript.includes('if(dynamic||staticPage)')&&
 legacyScript.includes('staticPage[1]+".html"')&&
 !legacyScript.includes('location.replace("/VATRA/"+pageRoute[1]+".html"'),
 "Clean profile and Friends URLs must mount their HTML in place, not navigate to a visible .html URL");
const outdatedId={pathname:"/VATRA/id=789012",search:"",hash:"",
 replace(url){this.redirectedTo=url;}};
new Function("document","location","localStorage",legacyScript)(mockDocument,outdatedId,mockStorage);
assert.equal(outdatedId.redirectedTo,undefined,
 "Unsupported id= URLs must not be redirected to member profiles");

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
 lang.includes('["pl","Polski","Polish","pl",true]')&&
 lang.includes("In development")&&lang.includes("У розробці")&&
 lang.includes("assets/flags/"),
 "Language picker must show all eight translated locale options");
const languageSection=lang.slice(lang.indexOf("  const languages = ["),lang.indexOf("  const flagGroups="));
const languageCodes=[...languageSection.matchAll(/\["([a-z]+)","[^"]+","[^"]+","[a-z]+"/g)].map(match=>match[1]);
assert.deepEqual(languageCodes,["uk","en","pl","de","fr","it","ka","bg"],
 "Only the owner's eight selected language codes may remain in VATRA");
assert.equal((languageSection.match(/,true\]/g)||[]).length,8,
 "All eight completed language dictionaries must be selectable");
const flagSymbols=new Set();
for(const file of ["europe-a","europe-b","europe-c"]){
 const sprite=await read("assets/flags/"+file+".svg");
 for(const match of sprite.matchAll(/<symbol id="flag-([a-z]+)" viewBox="0 0 640 480"/g))
  flagSymbols.add(match[1]);
}
assert.deepEqual([...flagSymbols].sort(),["pl","de","fr","it","bg","ge"].sort(),
 "All unused SVG flags must be deleted, including default flag assets drawn inline");
for(const match of languageSection.matchAll(/\["[a-z]+","[^"]+","[^"]+","([a-z]+)"/g)){
 const code=match[1];
 assert.ok(["ua","gb"].includes(code)||flagSymbols.has(code),
  "Flag SVG missing for "+code);
}
assert.ok(lang.includes('const ROOT=new URL("../../",scriptUrl).pathname;'),
 "Language assets must resolve from the current site root, not a hard-coded /VATRA/");
assert.ok(network.includes("projectBase.pathname")&&network.includes('new URL("sw.js",projectBase)')&&
 network.includes('updateViaCache:"none"')&&
 network.includes('worker.addEventListener("controllerchange"')&&
 network.includes('if(!navigator.onLine||edited||document.querySelector("dialog[open]"))return'),
 "SW updates should refresh unedited pages without a hard reload");
assert.ok(offline.includes('src="data:image/svg+xml;charset=utf-8,')&&
 offline.includes('class="offline-brand ui-offline-brand-001"')&&
 offline.includes('class="offline-actions ui-offline-actions-001"')&&
 offline.includes('class="ui-offline-img-001"')&&
 !offline.includes("logo.svg"),
 "Offline page must show only the self-contained V mark at the card top-left");
assert.ok(offline.includes('class="ui-offline-vatryk-001" src="assets/vatryk/vatryk_offline.webp"')&&
 offlineStyles.includes(".ui-offline-vatryk-001")&&!offlineStyles.includes(".offline-icon")&&
 !offline.includes("ui-offline-path-004")&&sw.includes('ROOT+"assets/vatryk/vatryk_offline.webp"')&&
 (await stat("assets/vatryk/vatryk_offline.webp")).size>0,
 "Offline mascot replaces the old icon and is available through the offline cache");
assert.ok(offline.includes("controller?.scriptURL")&&offline.includes('href="./" data-i18n="n9"'),
 "Offline fallback must resolve assets and home link at nested routes and localhost");
assert.ok(offline.includes('data-page="offline"')&&lang.includes('dataset.page === "offline"'),
 "Offline screen must keep its own translations when used as a fallback for nested routes");
assert.ok(
 /const CACHE="vatra-offline-shell-v[1-9][0-9]*"/.test(sw)&&
 sw.includes('ROOT+"assets/logo/logo_symbol.svg"'),
 "Offline cache must use a versioned name and include the standalone V mark");
const manifest=JSON.parse(await read("site.webmanifest"));
const appIcon="assets/logo/logo_app-icon.svg";
assert.ok((await stat(appIcon)).size>1000,"Canonical VATRA SVG app icon must exist");
assert.ok(manifest.icons.some(icon=>icon.src==="/VATRA/"+appIcon)&&
 !JSON.stringify(manifest).includes("/VATRA/favicon.svg")&&
 !sw.includes('ROOT+"favicon.svg"'),
 "Site manifest and offline cache must reference existing VATRA icons");
for(const filename of [...pages,"communities","club","notifications"]){
 const content=await read(filename+".html");
 assert.ok(!content.includes("/VATRA/favicon.svg")&&!content.includes('href="favicon.svg"'),
  filename+": must not reference a missing root favicon");
}
assert.ok(sw.includes("Promise.allSettled(INSTALL_ASSETS.filter(")&&
 sw.includes("const INSTALL_ASSETS=["),
 "Optional resources must not prevent the offline fallback from installing");
assert.ok(sw.includes('const OFFLINE=ROOT+"offline.html"'),"Single offline page missing");
assert.ok(!offline.includes('assets/js/errors.js')&&!sw.includes('ROOT+"assets/js/errors.js"'),
 "Offline pages and service worker must not load console-to-toast diagnostics");
assert.ok(sw.includes('ROOT+"assets/i18n/en.json"')&&sw.includes('ROOT+"assets/i18n/uk.json"'),
 "Offline worker must cache both dictionaries");
const isOwnClass=name=>/^(?:ui|vatra)-[a-z0-9_-]+$/.test(name);
const voidTags=new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
function inspect(path,html){
 const body=html.slice(html.search(/<body\b/i)).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,"");
 assert.ok(body.startsWith("<body"),path+": missing HTML body");
 const unique=new Set(),stack=[],missing=[];
 const frequency=new Map();
 for(const token of body.match(/<[^>]*>/g)||[]){
  const attrs=(token.match(/\bclass\s*=\s*"([^"]*)"/i)||[])[1]||"";
  for(const name of attrs.split(/\s+/).filter(isOwnClass))
   frequency.set(name,(frequency.get(name)||0)+1);
 }
 const owned=classes=>classes.split(/\s+/).filter(name=>isOwnClass(name)&&frequency.get(name)===1);
 for(const token of body.match(/<[^>]*>|[^<]+/g)||[]){
  const close=token.match(/^<\/([a-z][a-z0-9-]*)\s*>/i);
  if(close){const index=stack.map(x=>x.tag).lastIndexOf(close[1].toLowerCase());if(index>=0)stack.length=index;continue;}
  const open=token.match(/^<([a-z][a-z0-9-]*)(?=[\s/>])([^>]*)>/i);
  if(open){
   const tag=open[1].toLowerCase(),classes=(open[2].match(/\bclass\s*=\s*"([^"]*)"/i)||[])[1]||"";
   const own=owned(classes);
   assert.ok(own.length>=1,path+": missing individual class on "+tag);
   for(const item of own){assert.ok(!unique.has(item),path+": duplicate individual class "+item);unique.add(item);}
   if(!voidTags.has(tag)&&!token.endsWith("/>"))stack.push({tag,classes});
  }else if(!token.startsWith("<")&&/[\p{L}\p{N}]/u.test(token.trim())){
   const current=stack.at(-1);
   if(!current||!owned(current.classes).length)missing.push(token.trim().slice(0,45));
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
 if(!["offline","maintenance"].includes(page))assert.ok(html.includes("assets/css/base.css"),filename+": central stylesheet missing");
 total+=inspect(filename,html);
 const bindings=[...html.matchAll(/\bdata-i18n="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(bindings).size,bindings.length,filename+": duplicate translation keys");
 const ukMap=uk.__pages[page]?.nodes,enMap=en.__pages[page]?.nodes;
 assert.ok(ukMap&&enMap,filename+": no page in both translation dictionaries");
 assert.deepEqual(Object.keys(ukMap).sort(),bindings.slice().sort(),filename+": Ukrainian dictionary bindings mismatch");
 assert.deepEqual(Object.keys(enMap).sort(),bindings.slice().sort(),filename+": English dictionary bindings mismatch");
}
const landing=await read("index.html");
const registerHtmlHasBrandedSymbol=(await read("create-account.html")).includes('class="signup-brand-symbol ui-signup-brand-symbol-001" src="assets/logo/logo_symbol.svg"');
// VATRA now displays the original poster on sign-in; animated orbit remains retired.
assert.ok(
 landing.includes('class="vatra-login-poster-001 ui-home-poster-001"')&&
 landing.includes('class="vatra-login-poster-image-001 ui-home-poster-image-001" src="assets/poster.webp"')&&
 !landing.includes('class="intro-symbol ui-home-img-002"')&&
 !landing.includes('class="intro-circle')&&
 !landing.includes('class="orbit-node')&&
 !landing.includes('class="orbit-track'),
 "Login must display only the original VATRA poster, without previous orbital icons");
assert.ok(signInCss.includes(".vatra-login-poster-001{")&&
 signInCss.includes(".vatra-login-poster-image-001{")&&
 signInCss.includes("object-fit:contain"),
 "Login poster must retain its dimensions and aspect ratio at every breakpoint");
assert.ok(
 landing.includes('class="vatra-home-paragraph-01">')&&
 landing.includes('class="vatra-home-emphasis-04" data-i18n="n100"')&&
 landing.includes('class="vatra-home-description-001" data-i18n="n99"')&&
 (landing.match(/data-i18n="n99"/g)||[]).length===1&&
 (landing.match(/data-i18n="n100"/g)||[]).length===1&&
 uk.__pages.index.nodes.n99.text["0"].includes("Знаходьте своїх людей")&&
 en.__pages.index.nodes.n99.text["0"].includes("Find your people"),
 "Landing description must remain translated and appear only once");
assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')&&
 css.includes('font-size:clamp(31px,2.55vw,40px)')&&
 css.includes("max-width:69ch")&&
 css.includes(".intro-copy p{margin:0;color:var(--soft);font-size:15px"),
 "Landing columns and welcome description must be consistently readable");
assert.ok(createAccountCss.includes(".signup-brand-symbol{position:relative;width:clamp(112px,15vw,180px);height:auto;animation:vatraSignupSymbol 7s ease-in-out infinite")&&
 registerHtmlHasBrandedSymbol,
 "Registration retains its brand icon while sign-in uses the original poster");
assert.ok(css.includes(".language-option .language-flag{width:36px;height:27px")&&
 lang.includes('add("path",{fill:"#012169",d:"M0 0h640v480H0z"})'),
 "Language flags must remain precise");
assert.ok(auth.includes("function wireFloatingHints()")&&
 css.includes(".signup-form-panel .field:has(input.control)>span:first-child{")&&
 css.includes(".create-account-page .create-account-help-panel")&&css.includes(".vatra-error-stack"),
 "Floating hints must preserve registration captions and help");
assert.ok(landing.includes("Ваші люди. Ваші історії. Ваша VATRA."),"Complete brand footer missing");
assert.ok(landing.includes('class="auth-layout login-layout ui-login-layout-001"')&&
 !landing.includes('class="login-header ui-login-header-001"')&&
 !landing.includes('class="login-header-logo')&&
 !landing.includes('class="login-brand-kicker vatra-login-brand-kicker-01"')&&
 landing.includes('class="login-form-kicker vatra-login-form-kicker-01"')&&
 signInCss.includes(".login-form-overline{")&&createAccountCss.includes(".signup-form-overline{")&&
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
assert.ok(!css.includes(".create-account-page .field:has(input.control)")&&
 css.includes(".signup-form-panel .field:has(input.control)")&&
 css.includes('.auth-layout{flex:1;display:flex;flex-direction:column;justify-content:center;min-width:0;padding:40px 0}')&&
 !css.includes(".login-layout::before")&&!css.includes(".signup-layout::before"),
 "Auth cards must center without reserved space from the former top navigation");
const register=await read("create-account.html"),forgot=await read("forgot.html"),reset=await read("reset.html");
assert.ok(!register.includes('class="create-account-header')&&
 !register.includes('class="header-logo vatra-create-account-link-01"')&&
 register.includes('class="signup-layout auth-layout ui-signup-layout-001"')&&
 register.includes('class="create-account-back-nav ui-create-account-back-nav-001"')&&
 register.includes('href="./" class="back vatra-create-account-link-02"')&&
 css.includes(".auth-layout{")&&!css.includes(".login-layout::before,.signup-layout::before{")&&css.includes(".login-layout .split{")&&css.includes(".create-account-back-nav{")&&
 !register.includes('class="signup-brand-top')&&
 register.includes('auth-footer-content ui-create-account-footer-content-001'),
 "Registration must keep its return-to-login link inside the form panel");
for(const file of [register,forgot,reset])assert.ok(file.includes("assets/js/auth-core.js"),"Shared auth module not loaded");
for(const file of [landing,register,forgot]){
 assert.ok(file.includes('src="assets/js/captcha.js"'),"Cloudflare widget not loaded");
 assert.ok(file.indexOf('src="assets/js/captcha.js')<file.indexOf('src="assets/js/auth-core.js'),"Cloudflare must load before auth");
}
assert.ok(register.includes('id="signup-confirmation" role="status" aria-live="polite" hidden')&&
 !register.includes('signup-confirmation-emblem')&&
 register.includes('id="signup-confirmation-resend"')&&
 register.includes('id="signup-confirmation-expiry"')&&
 !register.includes('id="signup-confirmation-restart"')&&
 !register.includes('signup-confirmation-disclaimer')&&
 !register.includes('signup-confirmation-change-note')&&
 auth.includes('name.slice(0,3)+"•••"+name.slice(-3)')&&
 register.includes('content="Створити акаунт · VATRA"')&&
 css.includes(".signup-confirmation-timing{")&&
 auth.includes('auth.auth.resend({')&&
 auth.includes('SIGNUP_RESEND_COOLDOWN_MS=60000')&&
 auth.includes('SIGNUP_LINK_VALIDITY_MS=900000')&&
 auth.includes('SIGNUP_AUTH_CHANNEL="vatra-auth-verified"')&&
 auth.includes('auth.auth.getUser();')&&
 auth.includes('user.email.trim().toLowerCase()===signupPending.email.trim().toLowerCase()')&&
 auth.includes('channel.postMessage({type:"check-confirmed-session"})')&&
 auth.includes('pageHooks.watchSignupConfirmation?.();')&&
 uk.__pages["create-account"].nodes.n240.text["0"]==="Час до завершення дії посилання"&&
 en.__pages["create-account"].nodes.n240.text["0"]==="Confirmation link expires in",
 "The account-creation confirmation screen needs a distinct resend/cooldown state");
assert.ok(css.includes(".signup-confirmation-tips p{margin:0;color:var(--soft);font-size:14px;")&&
 css.includes(".signup-confirmation-signin{display:inline-flex;align-items:center;justify-content:center;margin-top:22px;"),
 "Confirmation secondary typography must use consistent 13–14px rules");
assert.ok(uk.__pages["create-account"].meta.title==="Створити акаунт"&&
 en.__pages["create-account"].meta.title==="Create account"&&
 !register.includes('href="./" class="vatra-create-account-link-10"'),
 "Registration tab and account-creation links must use consistent naming");
assert.ok(captcha.includes('dispose(scope,state);')&&
 captcha.indexOf('dispose(scope,state);')<captcha.indexOf('waiting.resolve(token);')&&
 captcha.includes('try{window.turnstile?.remove?.(state.id);}catch(_){}')&&
 !captcha.includes('state.dialog.hide();\n    waiting.resolve(token);'),
 "Turnstile must remove its widget before detaching the dialog, avoiding spurious warnings");
assert.ok(register.includes('id="consent"')&&register.includes('id="signup-form"'),"Signup consent or form missing");
assert.ok(register.includes('data-create-account-step="1"')&&register.includes('data-create-account-step="2" hidden')&&
 register.includes('id="create-account-next"')&&register.includes('id="create-account-back"')&&
 register.includes('signup-brand ui-signup-brand-001')&&
 css.includes('.signup-form-panel')&&css.includes('.signup-brand')&&
 auth.includes('function wireCreateAccountWizard()')&&auth.includes('validateCreateAccountStep(first)'),
 "Two-stage VATRA signup, branding and scoped validation must remain intact");
assert.ok(css.includes('.create-account-main{width:min(calc(100% - 88px),1300px);min-height:clamp(650px,calc(100svh - 128px),770px)')&&
 css.includes('.signup-form-panel .narrow-form{width:100%;max-width:520px;margin:0 auto;min-width:0;animation:vatraAuthReveal .3s')&&
 css.includes('.signup-step{display:grid;gap:17px;min-width:0}')&&
 auth.includes('if(animate)replayAuthContent(q(".signup-form-panel .narrow-form"));')&&
 !css.includes('@media(max-width:900px)')&&
 !css.includes('min(100% - 112px,1280px)'),
 "Login and signup must share card dimensions, inner form sizing and full-form animation");
for(const id of ["first-name","last-name","gender","email","password","password-confirm"]){
 assert.ok(register.includes('id="'+id+'"'),"Missing registration control: "+id);
}
assert.ok(register.includes('class="create-account-help-trigger vatra-create-account-summary-01"')&&
 register.includes('class="create-account-help-link vatra-create-account-summary-02"')&&
 register.includes('href="privacy#purpose" target="_blank"'),
 "Signup gender and email must explain why data is requested");
for(const [path,ids] of [["index.html",["email","password","saved-password"]],["create-account.html",["first-name","last-name","email","password","password-confirm"]]]){
 const html=await read(path);
 for(const id of ids){
  const input=html.match(new RegExp('<input\\b[^>]*\\bid="'+id+'"[^>]*>'))?.[0]||"";
  assert.ok(input.includes('placeholder=" "'),path+": floating control must not first render a native placeholder: "+id);
 }
 const hints=(html.match(/class="vatra-floating-hint\b/g)||[]).length;
 assert.equal(hints,ids.length,path+": one static floating caption per input");
}
// The saved account is a display-only local choice, not a password or session cache.
const savedUI=await read("index.html");
const signupTemplate=await read("_development/email-templates/confirmation.html");
for(const id of ["standard-login-panel","saved-account-panel","saved-login-form","saved-account-other",
 "saved-switch-back","saved-account-return","saved-account-remove-dialog","saved-remove-confirm"]){
 assert.ok(savedUI.includes('id="'+id+'"'),"Saved account control missing: "+id);
}
assert.ok(auth.includes('const REMEMBERED_ACCOUNT_KEY="vatra-remembered-account"')&&
 auth.includes('const entry={v:1,email,name};')&&
 auth.includes('window.VATRA_AVATAR?.getRemembered(email)')&&
 !auth.includes('entry.password=')&&
 !auth.includes('entry.access_token=')&&
 !auth.includes('JSON.stringify({v:1,email,name,password')&&
 auth.includes('auth.auth.verifyOtp({token_hash:token,type})')&&
 auth.includes('const allowed=new Set(["email","magiclink","invite","email_change"])')&&
 auth.includes('auth.auth.verifyOtp({token_hash:tokenHash,type:"recovery"})')&&
 auth.includes('history.replaceState(history.state,"",location.pathname)')&&
 signupTemplate.split('token_hash={{ .TokenHash }}').length===9&&
 !signupTemplate.includes('href="{{ .ConfirmationURL }}"'),
 "Cross-device confirmation must verify a one-time token; remembered account stores no password");
// Mobile-friendly email links are verified by the intended action, not the PKCE
// verifier left behind in the browser that originally requested the email.
for(const [template,target,type] of [
 ["confirmation.html","verify","email"],
 ["recovery.html","reset","recovery"],
 ["magic-link.html","verify","magiclink"],
 ["invite.html","verify","invite"],
 ["email-change.html","verify","email_change"]
]){
 const source=await read("_development/email-templates/"+template);
 const expectedLocales=8; // Each auth callback is present in every prepared locale.
 assert.equal(source.split('token_hash={{ .TokenHash }}').length,expectedLocales+1,
  "Every language variant needs a cross-device link: "+template);
 assert.ok(source.includes(target+'?token_hash={{ .TokenHash }}&amp;type='+type),
  "Wrong token type or destination: "+template);
}
assert.ok(register.includes('href="./" class="back vatra-create-account-link-02"')&&
 !css.includes('.create-account-page[data-signup-confirmation="pending"] .create-account-back-nav{visibility:hidden;pointer-events:none}')&&
 !css.includes('.create-account-back-nav .back{min-height:40px;')&&
 !register.includes('class="signup-login-switch')&&
 register.includes('<a href="./" class="vatra-create-account-footer-signin" data-i18n="n247">Увійти</a>')&&
 !css.includes('.create-account-page .footer nav>.vatra-create-account-footer-signin{')&&
 !css.includes('.footer nav>a[href="create-account.html"]{'),
 "Signup should show the mirrored Sign in link ONLY in the footer without altering form layout");
// Field labels are retained for accessibility, but shown as floating hints on
// login, recovery and saved account; only registration has visible top captions.
for(const path of ["forgot.html","reset.html"]){
 const markup=await read(path);
 const labels=[...markup.matchAll(/<label\b[^>]*class="field [^"]+"[^>]*>\s*<span class="([^"]+)"/g)];
 assert.equal(labels.length,4,path+" must keep four accessible captions");
 assert.ok(labels.every(match=>match[1].split(/\s+/).includes("vatra-sr-only")),
  path+" must not repeat captions above the text fields");
}
const homeMarkup=await read("index.html");
assert.ok(homeMarkup.includes('vatra-home-saved-field-title-001 vatra-sr-only')&&
 !homeMarkup.includes('saved-account-wordmark')&&
 !css.includes('.site .saved-account-wordmark{')&&
 css.includes('.site .saved-account-top{display:flex;align-items:center;justify-content:space-between;gap:10px;')&&
 css.includes('.vatra-sr-only{position:absolute!important;'),
 "Remembered account must have no redundant wordmark or visible top password label");
assert.ok(!css.includes('.footer nav>a[href="create-account.html"]{')&&
 !css.includes('.create-account-page .footer nav>.vatra-create-account-footer-signin{'),
 "Footer sign-in and create-account links must use the same shared link typography");
const allTemplates=await readdir("_development/email-templates");
assert.deepEqual(allTemplates.filter(f=>f.endsWith(".html")).sort(),
 emailNames.map(n=>n+".html").sort(),
 "Email templates must have exactly one canonical HTML per purpose");
for(const [filename,route,type] of [
 ["confirmation.html","verify","email"],
 ["invite.html","verify","invite"],
 ["magic-link.html","verify","magiclink"],
 ["email-change.html","verify","email_change"],
 ["recovery.html","reset","recovery"]
]){
 const source=await read("_development/email-templates/"+filename);
 const localeCount=8; // Every source email now has eight localized variants.
 assert.equal(source.split('token_hash={{ .TokenHash }}').length,localeCount+1,
  filename+": every locale branch must use the same direct confirmation URL");
 assert.ok(source.includes(route+'?token_hash={{ .TokenHash }}&amp;type='+type),
  filename+": wrong token type or callback");
}
for(const file of allTemplates.filter(f=>f.endsWith(".html"))){
 const source=await read("_development/email-templates/"+file);
 const classNames=[...source.matchAll(/\sclass="([^"]+)"/g)].flatMap(m=>m[1].split(/\s+/));
 assert.equal(new Set(classNames).size,classNames.length,file+": classes must not collide");
 assert.ok(!/https?:\/\/(?:[^" ]+)?\/v2\b/i.test(source)&&!source.includes('style-2'),
  file+": no obsolete duplicate styles or URLs");
}
// The top return link belongs inside the form card, never above the split card.
const registrationMarkup=await read("create-account.html");
const formStart=registrationMarkup.indexOf('<section class="signup-form-panel ui-signup-form-panel-001"');
const returnStart=registrationMarkup.indexOf('<nav class="create-account-back-nav ui-create-account-back-nav-001"');
const innerStart=registrationMarkup.indexOf('<div class="narrow-form ui-create-account-div-001">');
const overlineStart=registrationMarkup.indexOf('<div class="signup-form-overline ui-signup-form-overline-001">');
const labelsStart=registrationMarkup.indexOf('<div class="signup-overline-labels ui-signup-overline-labels-001">');
const kickerStart=registrationMarkup.indexOf('class="signup-form-kicker vatra-signup-form-kicker-01"');
assert.ok(formStart>=0&&innerStart>formStart&&
 overlineStart>innerStart&&labelsStart>overlineStart&&kickerStart>labelsStart&&returnStart>kickerStart&&
 !registrationMarkup.includes('data-step-label=')&&
 (registrationMarkup.match(/class="create-account-back-nav ui-create-account-back-nav-001"/g)||[]).length===1&&
 css.includes('.create-account-back-nav{display:flex;align-items:center;justify-content:flex-end;flex:0 0 auto;')&&
 css.includes('max-width:none;margin:0;padding:0}')&&
 css.includes('.signup-form-overline .create-account-back-nav{margin-left:auto;max-width:none;min-width:0;animation:none}')&&
 css.includes('.signup-form-panel{display:flex;flex-direction:column;')&&
 css.includes('.auth-layout{flex:1;display:flex;flex-direction:column;justify-content:center;min-width:0;padding:40px 0}')&&
 !css.includes('.login-layout::before,.signup-layout::before{'),
 "Signup return link must be inside the right card with centered auth layout");
// Native title tooltips use the browser theme and cannot match VATRA styling.
for(const page of ["index","create-account","forgot","reset","verify","404","offline","terms","privacy","cookies"]){
 const html=await read(page+".html");
 assert.ok(!/<(?:button|a)\b[^>]*\btitle\s*=/i.test(html),
  page+": browser-native hover text must not be added to interactive elements");
}
assert.ok(landing.includes('id="saved-account-remove"')&&
 landing.includes('data-vatra-tooltip="Вилучити збережений акаунт"')&&
 !landing.includes('title="Вилучити збережений акаунт"')&&
 auth.includes('removeButton.setAttribute("data-vatra-tooltip",label)')&&
 !auth.includes("removeButton.title=label")&&
 auth.includes("function wireSavedAccountTooltip(button){")&&
 auth.includes("wireSavedAccountTooltip(removeButton)")&&
 css.includes(".site .vatra-saved-tooltip{position:fixed;z-index:13000;")&&
 css.includes(".site .vatra-saved-tooltip[hidden]{display:none!important}")&&
 !css.includes(".saved-account-remove[data-vatra-tooltip]::after{"),
 "Saved-account remove help must use the localized VATRA tooltip, not native title");
assert.ok(css.includes(".auth-layout{flex:1;display:flex;flex-direction:column;justify-content:center;")&&
 css.includes(".auth-layout{justify-content:flex-start;padding:32px 0}")&&
 css.includes(".login-layout .split{margin:auto}")&&
 css.includes(".create-account-page .create-account-main{display:flex;flex-direction:column;min-height:0;width:min(calc(100% - 40px),670px);gap:0;margin:auto}")&&
 css.includes(".ui-forgot-main-001{width:min(calc(100% - 48px),680px);padding:40px 0;justify-content:center}")&&
 css.includes(".ui-forgot-main-001{width:calc(100% - 24px);padding:32px 0}"),
 "Auth and recovery layout must have matching top/bottom gutters and shared centering");
// Every return-to-login link uses the same localized text and shared
// hover movement; recovery cards animate only their inner content.
for(const [page,code] of [["create-account","n4"],["forgot","n2"],["reset","n2"]]){
 const markup=await read(page+".html");
 const record=uk.__pages[page].nodes[code];
 assert.equal(record.text["0"],"Повернутися до входу");
 assert.ok(markup.includes('</svg>Повернутися до входу</a>'),
  page+": visible return-to-login label differs from the shared copy");
}
assert.ok(css.includes('.back:hover,.back:focus-visible{transform:translateX(-2px);')&&
 !css.includes('.ui-forgot-main-001 .forgot-panel-header .back:hover{')&&
 css.includes('.ui-forgot-main-001 .forgot-panel-content{display:flex;')&&
 css.includes('.create-account-back-nav{display:flex;')&&
 !css.includes('.ui-forgot-main-001 .forgot-panel{display:flex;flex-direction:column;align-items:center;min-width:0;width:100%;padding:clamp(28px,4.5vw,48px) clamp(24px,5.2vw,52px);border:1px solid #e0e7f5;border-radius:27px;background:#fff;box-shadow:0 26px 64px rgba(31,50,96,.075);animation:'),
 "Shared return-link hover and inner-only reveal must match across pages");
assert.ok(forgot.includes('class="forgot-panel-content ui-forgot-panel-content-001"')&&
 reset.includes('class="forgot-panel-content ui-reset-panel-content-001"'),
 "Both recovery views must group animated content within a static card");
const loadingPages=["index.html","create-account.html","forgot.html","reset.html","verify.html"];
for(const file of loadingPages){
 const html=await read(file);
 assert.ok(html.includes('id="vatra-auth-loading"')&&
 html.includes('vatra-auth-loading-indicator'),
  "Authenticated page needs real loading state: "+file);
}
assert.ok(css.includes('body[data-auth-ready="true"]>.vatra-auth-loading{display:none!important}')&&
 css.includes('.vatra-auth-loading-content{position:relative;')&&
 css.includes('border:0;border-radius:0;background:transparent;box-shadow:none;text-align:center')&&
 css.includes('.site .saved-switch-back{display:flex;align-items:center;justify-content:flex-end;')&&
 css.includes('.site .saved-switch-back[hidden]{display:none!important}')&&
 auth.includes('markAuthReady();')&&auth.includes('sessionCheckWithTimeout()'),
 "Loading is a frameless, real auth state; saved account back link is aligned");
for(const locale of [uk,en])for(let n=500;n<=513;n++)
 assert.ok(locale.__pages.index.nodes["n"+n]?.text?.["0"],"Saved account translation missing: n"+n);
for(const path of ["index.html","create-account.html"]){
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
 auth.includes('feedback(first.message,"error",{group:"auth-validation"})')&&
 !auth.includes('feedback(message,"error");')&&
 !auth.includes('wrapper.append(error);')&&
 !css.includes(".field-error{")&&
 !landing.includes('id="response"')&&
 !register.includes('id="response"'),
 "Field validation must identify one invalid field, expire and avoid hidden or inline error elements");
assert.ok(auth.includes("function wireHoverHelp()")&&auth.includes("other!==help&&other.open")&&
 auth.includes('help.addEventListener("pointerenter"'),
 "Gender and email help must open on hover and never overlap");
assert.ok(css.includes("align-items:start")&&css.includes(".signup-form-panel .two>.field{align-content:start;align-self:start}"),
 "Two-column registration inputs must not move when a field shows validation errors");
for(const page of pages.filter(p=>p!=="offline"&&p!=="verify")){
 const html=await read(page+".html");
 if(page==="maintenance")assert.ok(!html.includes("data-language-trigger")&&!/<(?:header|footer|button)\b/.test(html),"Maintenance display must contain no language picker, header, footer or action buttons");
 else if(!["404","feed","profile","documents","terms","privacy","cookies","commerce"].includes(page))assert.ok(html.includes('ui-language-static-flag-001')&&html.includes('ui-language-static-chevron-001'),
  page+": language switch must show SVG flag and chevron even before JavaScript runs");
 assert.ok(html.includes("assets/js/lang.js")&&!html.includes("assets/js/errors.js"),page+": localization runtime required, console toasts forbidden");
 assert.ok(html.includes("assets/css/base.css")&&!/assets\/(?:js|css)\/[^"\x27]+\?v=/.test(html),page+": local asset paths must be stable and unversioned");
}
assert.ok(lang.includes("function initLanguagePicker()")&&lang.includes("trigger.addEventListener(\"click\",open)"),
 "Language toggle must initialize early and open the full modal");
// All public pages use the same footer structure; the full-width background
// remains separate from the centered content. Documents have a working
// single-row header independent of the former signup header styles.
const footerNames=pages.filter(p=>!["404","offline","feed","profile","verify","maintenance","documents","terms","privacy","cookies","commerce"].includes(p));
const feedFooter=await read("feed.html"),profileMarkup=await read("profile.html");
assert.ok(!feedFooter.includes("<footer")&&!profileMarkup.includes("<footer"),
 "Signed-in VATRA must not show the guest-site footer");
for(const page of footerNames){
 const html=await read(page+".html");
 const tag=page==="index"?"home":page;
 assert.ok(html.includes('class="auth-footer-content ui-'+tag+'-footer-content-001"'),
  page+": missing shared centered footer container");
}
for(const page of ["terms","privacy","cookies","commerce"]){
 const html=await read(page+".html");
 assert.ok(html.includes('href="documents" class="vatra-document-back-001"')&&
  html.includes('class="vatra-document-kicker-001"')&&
  !html.includes("policy-navigation-header")&&!html.includes("policy-tabs-shell")&&
  html.includes("assets/css/legal.css"),
  page+": documents must have one return-to-documents link and no shared navigation");
}
for(const page of ["verify"]){
 const html=await read(page+".html"),prefix=page==="verify"?"account":page;
 assert.ok(html.includes('class="account-top-inner ui-'+prefix+'-header-inner-001"'),
  page+": account-style header must align with the shared footer");
}
assert.ok(legalCss.includes(".policy-page .policy-top{display:flex;align-items:center;")&&
 legalCss.includes(".policy-top-inner{display:flex;")&&
 legalCss.includes(".policy-page .auth-footer-content{width:min(calc(100% - 52px),1100px)")&&
 css.includes(".center-page .footer{padding-inline:0}")&&css.includes(".account-page .footer{padding-inline:0}")&&
 css.includes(".account-top-inner{"),
 "Page headers, document content and shared footer must use centered containers");
assert.ok(landing.includes('data-i18n="n128">Створити акаунт</a>')&&
 register.includes('data-i18n="n59">Створити акаунт</button>')&&
 uk.__pages.index.nodes.n128.text["0"]==="Створити акаунт"&&
 en.__pages.index.nodes.n128.text["0"]==="Create account"&&
 uk.__pages["create-account"].nodes.n59.text["0"]==="Створити акаунт",
 "Create account must be the unified account creation action");
assert.ok(css.includes('--inner-radius:min(34cqw,226px)')&&
 css.includes('.field.is-invalid .control{border-color:#e49aa7'),
 "Orbit size and visual validation details must be updated");
assert.ok(register.includes('class="vatra-input-shell ')&&
 register.includes('class="vatra-floating-hint ')&&
 !auth.includes("wireStableInputHints"),
 "Login and signup floating hints must use original translated text");
for(const page of ["forgot","reset"]){
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
 !html.includes('href="terms.html" class="vatra-'+page+'-footer-legal'),
 page+": redundant document eyebrow and footer navigation must be gone");
}


assert.ok(signInCss.includes(".login-form-kicker{display:inline-flex;")&&createAccountCss.includes(".signup-form-kicker{display:inline-flex;")&&
 signInCss.includes(".login-description{color:var(--soft);font-size:14px;line-height:1.65")&&
 createAccountCss.includes(".signup-step-heading .subtitle{color:var(--soft);font-size:14px;line-height:1.65")&&
 css.includes(".narrow-form h1{margin:0 0 10px;")&&css.includes(".signup-step-heading :is(h1,h2){margin:0 0 10px;")&&
 signInCss.includes(".site .form-box .action.primary{min-height:55px;")&&
 createAccountCss.includes(".signup-form-panel .action.primary{min-height:55px;"),
 "Auth pages must share heading, eyebrow, paragraph and primary-button design tokens");
assert.ok(css.includes(".intro-copy p strong{display:block;")&&
 css.includes(".signup-brand-copy{position:relative;z-index:1;text-align:center}")&&
 css.includes(".signup-brand-highlights{position:relative;z-index:1;display:flex;justify-content:center;")&&
 css.includes(".signup-brand-highlight{display:inline-flex;align-items:center;min-height:35px;"),
 "Promotional copy and larger hashtag chips must be consistent");
const signupTags=["#спілкування","#спільноти","#фотографії","#відео","#музика","#маркетплейс","#кліпи"];
const englishSignupTags=["#communication","#communities","#photos","#videos","#music","#marketplace","#clips"];
const signupKeys=[205,207,230,231,232,233,234];
assert.ok(!register.includes("Особистий VATRA ID")&&
 signupTags.every((tag,i)=>register.includes('data-i18n="n'+signupKeys[i]+'">'+tag+'</span>'))&&
 signupTags.every((tag,i)=>uk.__pages["create-account"].nodes["n"+signupKeys[i]]?.text["0"]===tag&&
 en.__pages["create-account"].nodes["n"+signupKeys[i]]?.text["0"]===englishSignupTags[i]),
 "All seven hashtags must display in Ukrainian and translate correctly into English");
for(const page of ["terms","privacy","cookies","commerce"]){
 const html=await read(page+".html");
 assert.ok(!html.includes("policy-tabs-shell")&&
  (html.match(/class="vatra-document-back-001"/g)||[]).length===1&&
  html.includes('href="documents"'),
  page+": one return link must replace the old document tabs");
}
assert.ok(!legalCss.includes(".policy-cards")&&
 !legalCss.includes(".policy-summary")&&!legalCss.includes(".policy-end")&&
 !css.includes(".footer-doc-icon{"),
 "Deleted document overview must leave no orphan card styles");
for(const page of ["index","create-account","forgot","reset","verify","404"]){
 const html=await read(page+".html");
 assert.ok(!html.includes('footer-doc-icon'),
 "Document icons must not appear in footer: "+page);
}
assert.ok(register.includes('>Уже підтвердили? Увійти</a>')&&
 uk.__pages["create-account"].nodes.n223.text["0"]==="Уже підтвердили? Увійти"&&
 !register.includes('href="./" class="vatra-create-account-link-10"'),
 "Confirmation screen must have one contextual sign-in link");
for(const page of ["forgot","reset"]){
 const html=await read(page+".html");
 assert.ok(!html.includes('>Вхід</a>')&&html.includes('>Увійти</a>')&&
  uk.__pages[page].nodes.n301.text["0"]==="Увійти",
  "All guest sign-in CTAs must use the same Ukrainian verb on "+page);
}

assert.ok(css.includes(".signup-form-panel .field:has(input.control)>span:first-child")&&
 css.includes(".create-account-page .create-account-help-panel"),
 "Registration needs visible static captions and VATRA-style accessible help popovers");
assert.ok(
 !forgot.includes('class="header-logo vatra-forgot-link-02"')&&
 forgot.includes('class="forgot-panel-header ui-forgot-panel-header-001"')&&
 forgot.includes('class="forgot-panel-brand vatra-forgot-link-02"')&&
 forgot.includes('src="assets/logo/logo_symbol.svg"')&&
 css.includes('.ui-forgot-main-001 .forgot-panel-header{display:flex;')&&
 !css.includes('.ui-forgot-main-001>.header-logo{')&&
 !forgot.includes('name@example.com')&&
 !reset.includes('name@example.com')&&
 !register.includes('name@example.com')&&
 ['forgot','reset','create-account'].every(page=>
  Object.values(uk.__pages[page].nodes).some(entry=>entry.text?.["0"]==="Електронна пошта")&&
  Object.values(en.__pages[page].nodes).some(entry=>entry.text?.["0"]==="Email address")
 ),
 "Recovery card must show only the V mark, and all email fields must use translated floating hints");
assert.ok(
 css.includes('.ui-forgot-main-001 .forgot-panel{display:flex;flex-direction:column;align-items:center;')&&
 css.includes('.ui-forgot-main-001 .forgot-panel-content > :is(.forgot-panel-header,.forgot-intro,.reset-intro,.field-stack,.form-note,.recovery-step){width:100%;max-width:520px}')&&
 css.includes('.form-box{width:100%;max-width:520px;')&&
 css.includes('.signup-form-panel .narrow-form{width:100%;max-width:520px;'),
 "Password recovery, sign-in and sign-up must share the same 520px form column");
assert.ok(
 reset.includes('class="forgot-panel reset-panel ui-reset-panel-001"')&&
 reset.includes('class="forgot-panel-header reset-panel-header ui-reset-panel-header-001"')&&
 reset.includes('class="reset-intro ui-reset-intro-001"')&&
 reset.includes('id="reset-title"')&&
 reset.includes('src="assets/logo/logo_symbol.svg"')&&
 !reset.includes('class="header-logo vatra-reset-link-02"')&&
 css.includes('.ui-forgot-main-001 .forgot-panel-brand img{display:block;width:44px;')&&
 css.includes('.ui-forgot-main-001 .forgot-panel{display:flex;flex-direction:column;align-items:center;min-width:0;width:100%;padding:clamp(28px,4.5vw,48px)')&&
 css.includes('box-shadow:0 26px 64px rgba(31,50,96,.075)}')&&
 css.includes('.ui-forgot-main-001 .forgot-panel-content{display:flex;flex-direction:column;align-items:center;width:100%;min-width:0;animation:vatraAuthReveal .3s')&&
 auth.includes('replayAuthContent(q(".forgot-panel-content"));')&&
 css.includes(':is(.account-card,.error-card) > :not([hidden]){animation:none!important}')&&
 css.includes('.ui-forgot-main-001 .forgot-panel-content{animation:none!important}')&&
 createAccountCss.includes('.signup-form-panel .narrow-form,')&&createAccountCss.includes('.signup-confirmation{animation:none!important}')&&
 auth.includes('tokenInput.dispatchEvent(new Event("input",{bubbles:true}))'),
 "Both password recovery paths must share the 520px card, V brand, staged reveal and floating hints");
assert.ok(forgot.includes('class="forgot-panel ui-forgot-panel-001"')&&
 !forgot.includes('forgot-kicker')&&
 !css.includes('.ui-forgot-main-001 .forgot-kicker{')&&
 !uk.__pages.forgot.nodes.n55&&
 !en.__pages.forgot.nodes.n55&&
 forgot.includes('id="forgot-title"')&&
 css.includes('.ui-forgot-main-001 .forgot-panel{display:flex;')&&
 css.includes('.ui-forgot-main-001 .forgot-panel:has(#recovery-step:not([hidden])) .forgot-intro{display:none}')&&
 !forgot.includes('assets/css/forgot.css'),
 "Password recovery must use the shared Onest styles and a single centered card");
assert.ok(
 forgot.includes('Якщо ця адреса належить акаунту VATRA, код відновлення надійде на')&&
 uk.__pages.forgot.nodes.n18.text["0"].startsWith("Якщо ця адреса")&&
 en.__pages.forgot.nodes.n18.text["0"].startsWith("If the address belongs")&&
 !forgot.includes("Одноразовий цифровий код надіслано на адресу"),
 "Recovery must not claim email delivery just because Supabase accepts a reset request");
assert.ok(
 forgot.includes('class="vatra-input-shell ui-forgot-input-shell-001"')&&
 forgot.includes('class="vatra-floating-hint vatra-forgot-floating-hint-01" aria-hidden="true" data-i18n="n59">Електронна пошта</span>')&&
 forgot.includes('class="vatra-input-shell ui-forgot-input-shell-002"')&&
 forgot.includes('class="vatra-floating-hint vatra-forgot-floating-hint-02" aria-hidden="true" data-i18n="n56"')&&
 reset.includes('class="vatra-input-shell ui-reset-input-shell-001"')&&
 reset.includes('class="vatra-input-shell ui-reset-input-shell-002"')&&
 reset.includes('class="vatra-floating-hint vatra-reset-floating-hint-02" aria-hidden="true" data-i18n="n44"')&&
 auth.includes('if(!["login","create-account","forgot","reset"].includes(page))return;')&&
 auth.includes('#recovery-code-form .field:has(input.control)')&&
 uk.__pages.forgot.nodes.n56.text["0"]==="Введіть код"&&
 en.__pages.forgot.nodes.n56.text["0"]==="Enter code"&&
 uk.__pages.reset.nodes.n44.text["0"]==="Введіть код"&&
 en.__pages.reset.nodes.n44.text["0"]==="Enter code",
 "Recovery email and OTP controls must reuse VATRA floating hints with Onest and translated text");
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
for(const script of ["assets/js/auth-core.js","assets/js/feed.js","assets/js/lang.js","assets/js/captcha.js","assets/js/host.js","assets/js/network.js","assets/js/social-shell.js","assets/js/notifications.js","sw.js"]){
 const scriptSource=await read(script);
 assert.doesNotThrow(()=>new Function(scriptSource),script+": invalid JavaScript");
}
// All authenticated social pages use exactly the same header shell. Only the
// active route may differ; this guards against CSS/HTML drift between pages.
const sharedShellPages=["feed","profile","communities","club","notifications","friends","gifts"];
const interactionsScript=await read("assets/js/post-interactions.js");


const reactionsVerifiedDelete=[
 '.select("post_id").maybeSingle()',
 '.select("liker_id").maybeSingle()',
 '.select("comment_id").maybeSingle()'
];
// A zero-row DELETE must not silently flip saved/liked UI state. This is
// deliberately checked against the existing module, not an appended style.
const reactionsSource=await read("assets/js/post-interactions.js");
assert.ok(reactionsVerifiedDelete.every(part=>reactionsSource.includes(part))&&
 reactionsSource.includes("stored&&String(result.data?.post_id)")&&
 reactionsSource.includes("liked&&String(result.data?.liker_id)")&&
 reactionsSource.includes("ownLiked&&String(result.data?.comment_id)"),
 "Post likes, comment likes and bookmarks must verify affected DELETE rows");

const profileExtraScript=await read("assets/js/profile.js");
const scrollRailScript=await read("assets/js/scroll-rail.js");
assert.ok(interactionsScript.includes('vatra-post-share-dialog')&&
 interactionsScript.includes('vatra-post-comments-count-001')&&
 interactionsScript.includes('vatra-post-shares-count-001')&&
 interactionsScript.includes('p_limit:pageSize+1')&&
 !interactionsScript.includes('vatra-post-compact-comments')&&
 interactionsScript.includes('navigator.clipboard.writeText(permalink(post))')&&
 profileExtraScript.includes('displaySavedMedia(article,post)')&&
 profileExtraScript.includes('displaySavedMedia(article,item)')&&
 profileExtraScript.includes('friendButton.dataset.friendState=')&&
 scrollRailScript.includes('scrollTo({top:0')&&
 (await read("feed.html")).includes('ui-feed-filter-heading-icon-001')&&
 (await read("assets/css/feed.css")).includes('vatra-post-share-dialog')&&
 (await read("assets/js/notifications.js")).includes('vatra-notification-avatar'),
 "Social interactions, full post cards, branded filters and scroll rail must remain functional");
assert.ok((await read("assets/js/feed.js")).includes('vatra-global-search-results')&&
 (await read("assets/js/feed.js")).includes('public_profiles')&&
 (await read("assets/js/feed.js")).includes('client.from("communities")'),
 "Global VATRA search must search names and communities as well as accessible posts");
const liveSiteShell=await read("assets/js/social-shell.js");
const liveNotificationProvider=await read("assets/js/notifications.js");
assert.ok(liveSiteShell.includes('vatra-search-live-results')&&
 liveSiteShell.includes('ui-vatra-search-live-glyph-')&&
 liveSiteShell.includes('scheduleLive(term)')&&
 liveNotificationProvider.includes('window.VATRA_SITE_SEARCH={search:findSite,')&&
 liveNotificationProvider.includes('viewer.rpc("search_site"')&&
 liveSiteShell.includes('ui-vatra-search-categories-001')&&liveSiteShell.includes('rememberView(kind,item)'),
 "Site-wide search must query RLS-visible people, communities and posts directly");
const notificationMarkup=await read("notifications.html");
const notificationScript=await read("assets/js/notifications.js");
assert.ok(notificationMarkup.includes('data-page="notifications"')&&
 notificationMarkup.includes('id="notifications-list"')&&
 notificationMarkup.includes('id="notifications-more"')&&
 notificationMarkup.includes('data-notification-filter="unread"')&&
 notificationMarkup.includes('data-notification-filter="read"')&&
 notificationMarkup.includes('id="notifications-sort"')&&
 notificationScript.includes('member_notifications')&&
 notificationScript.includes('vatra-notification-count')&&
 notificationScript.includes('{page:0,size:5},panelLoad')&&
 notificationScript.includes('pageLoad(false)')&&
 notificationScript.includes('c.channel("vatra-notices-"+run.id)')&&
 notificationScript.includes('run.client.from("member_notifications")')&&
 (await read("feed.html")).includes('ui-feed-filter-all-icon-001')&&
 (await read("feed.html")).includes('ui-feed-empty-document-icon-001'),
 "VATRA notifications must include the private inbox and five-item header preview");
const normalizedSocialHeader=html=>{
 const header=html.match(/<header class="feed-header[\s\S]*?<\/header>/)?.[0];
 assert.ok(header,"Signed-in VATRA page must have the shared header");
 return header.replace(/ social-top-active/g,"").replace(/ aria-current="page"/g,"");
};
const canonicalSocialHeader=normalizedSocialHeader(await read("feed.html"));
/* profileMarkup already loaded during the footer audit. */
assert.ok((profileMarkup.match(/data-profile-tab="/g)||[]).length===8&&
 (profileMarkup.match(/data-profile-panel="/g)||[]).length===10&&
 profileMarkup.includes('id="profile-friends-preview"')&&
 profileMarkup.includes('id="profile-gifts-preview"')&&
 profileMarkup.includes('id="profile-tab-clips"')&&
 profileMarkup.includes('id="profile-tab-communities"')&&
 profileMarkup.includes('id="profile-report-dialog"')&&
 profileMarkup.includes('id="profile-report-open"')&&
 profileMarkup.includes('id="profile-friend-button"')&&
 !profileMarkup.includes('id="profile-message-button"')&&
 !profileMarkup.includes('id="profile-message-dialog"')&&
 !profileMarkup.includes('id="profile-inbox-list"')&&
 profileMarkup.includes('id="profile-cover-image" class="profile-cover ui-profile-cover-001 has-system-cover"'),
 "Member profile requires a real cover, tabs, friendship UI");
assert.ok(profileMarkup.includes('id="profile-edit-open"')&&
 profileMarkup.includes('id="profile-status"')&&
 profileMarkup.includes('id="profile-last-seen"')&&
 !profileMarkup.includes('id="profile-online-dot"')&&
 profileMarkup.includes('id="profile-edit-dialog"')&&
 profileMarkup.includes('id="profile-status-text"')&&
 profileMarkup.includes('ui-profile-add-friend-icon-001')&&
 profileMarkup.includes('class="feed-posts ui-profile-posts-001"')&&
 profileMarkup.includes('id="profile-tab-videos"')&&
 !profileMarkup.includes('id="profile-tab-about"')&&
 !profileMarkup.includes('id="profile-vatra-id"')&&
 (await read("assets/js/profile.js")).includes('setupProfilePresence(')&&
 (await read("assets/js/profile.js")).includes('setupLazyProfileGallery(')&&
  (await read("assets/js/profile-gallery.js")).includes('window.VATRA_PROFILE_GALLERY=Object.freeze({mount})')&&
 (await read("assets/js/presence.js")).includes('last_seen_at')&&
 (await read("feed.html")).includes('data-feed-filter="communities"')&&
 (await read("feed.html")).includes('class="feed-top-controls ui-feed-top-controls-001"')&&
 (await read("assets/js/profile.js")).includes('displayed.addEventListener("click",openStatus)')&&
 profileMarkup.includes('id="profile-status-dialog"')&&
 profileMarkup.includes('id="profile-tab-gifts"')&&
 profileMarkup.includes('id="profile-tab-saved"')&&
 profileMarkup.includes('id="profile-archive-menu"')&&
 (await read("assets/js/feed.js")).includes('archived_at')&&
 (await read("assets/js/post-interactions.js")).includes('post_saves')&&
 (await read("assets/css/feed.css")).includes('width:100vw;height:100dvh;')&&
 (await read("assets/js/feed.js")).includes('feedFilter==="friends"'),
 "Profile status, privacy-preserving activity, media tabs and Feed filters must exist");
assert.ok(!profileMarkup.includes('id="profile-edit-name"')&&
 !profileMarkup.includes('id="profile-name-dialog"')&&
 !(await read("create-account.html")).includes('data-i18n="n501"')&&
 (await read("privacy.html")).includes("Ім’я та прізвище, вказані під час реєстрації"),
 "Registered first and last name must appear automatically without a second name setup");
assert.ok(profileMarkup.includes('id="profile-heading"')&&
 !profileMarkup.includes('id="profile-not-found"')&&
 profileMarkup.includes('class="profile-panels ui-profile-panels-001"')&&
 (await read("assets/js/profile.js")).includes('q(".ui-profile-tab-row-001")?.remove()')&&
 (await read("assets/js/profile.js")).includes('q("#profile-edit-open")?.remove()')&&
 (await read("assets/js/profile.js")).includes('q(".profile-panels")?.remove()')&&
 (await read("assets/js/profile.js")).includes('const ownHeaderMedia=loadOwnHeaderAvatar(client,ownId,user.email);')&&
 (await read("assets/js/profile.js")).includes('const preloadedMedia=isMine?ownHeaderMedia:')&&
 (await read("assets/js/profile.js")).includes('window.VATRA_AVATAR?.invalidatePath?.(client,ownId);'),
 "Unknown VATRA ID keeps cover and avatar while removing all invented actions and details");
const profileBehavior=await read("assets/js/profile.js");
assert.ok(profileBehavior.includes('client.from("friendships")')&&
 !profileBehavior.includes('client.from("direct_messages")')&&
 profileBehavior.includes("setupProfileInteractions(client,ownId,targetId,isMine)"),
 "Profile friendship must use persisted, RLS-secured data");
assert.ok(profileMarkup.includes('id="profile-cover-view"')&&
 profileMarkup.includes('id="profile-avatar-wrap"')&&
 profileMarkup.includes('id="profile-avatar-trigger"')&&
 profileMarkup.includes('id="profile-avatar-menu"')&&
 profileMarkup.includes('id="profile-avatar-story"')&&
 !profileMarkup.includes('id="profile-avatar-photo"')&&profileMarkup.includes('id="profile-avatar-next"')&&
 profileMarkup.includes('id="profile-media-viewer"')&&
 profileMarkup.includes('id="profile-media-viewer-image"')&&
 profileMarkup.includes('id="profile-story-viewer"')&&
 profileBehavior.includes('client.from("stories")')&&
 profileBehavior.includes('avatarWrap.classList.toggle("has-active-story",hasStory)')&&
 profileBehavior.includes('coverView.addEventListener("click",()=>void openCover())')&&
 profileBehavior.includes('mediaDialog.showModal()'),
 "Avatar story ring and original photo/cover viewer must be backed by real profile media and stories");
const preflightMemberCss=await read("assets/css/profile.css");
assert.ok(
 profileBehavior.includes('const canViewPhoto=!locked') &&
 profileBehavior.includes('avatarTrigger.disabled=!canViewPhoto') &&
 profileBehavior.includes('coverView.hidden=!canViewPhoto') &&
 profileBehavior.includes('if(!canViewPhoto)return;') &&
 profileBehavior.includes('if(sharedPhoto&&!locked)') &&
 preflightMemberCss.includes('body.profile-page.feed-page .profile-avatar:not(.has-photo)::before') &&
 preflightMemberCss.includes('body.profile-page .profile-cover-view[hidden]') &&
 !profileBehavior.includes('try{await mediaPromise;}') &&
 profileMarkup.includes('data-social-uk="Головна" data-social-en="Home"'),
 "Locked profiles retain cover and avatar but block viewers; fallback portraits stay centered, routes show content before media");
const sharedCss=await read("assets/css/feed.css");
const memberCss=await read("assets/css/profile.css");
const profileStyles=(profileMarkup.match(/href="assets\/css\/[^"?]+\.css(?:\?rev=[a-f0-9]{40})?"/g)||[]).map(value=>value.replace(/\?rev=[a-f0-9]{40}/,""));
assert.deepEqual(profileStyles,[
 'href="assets/css/base.css"','href="assets/css/guest-view.css"','href="assets/css/feed.css"',
 'href="assets/css/profile.css"'
],"Profile styles load after the shared feed stylesheet and only on profile.html");
assert.ok(
 (await Promise.all(["feed.html","communities.html","club.html","notifications.html"].map(p=>read(p))))
 .every(markup=>!["assets/css/profile.css"].some(path=>markup.includes(path))) &&
 !sharedCss.includes("VATRA personal-information presentation:") &&
 !sharedCss.includes("body.profile-page .profile-editor-layout") &&
 memberCss.includes(".profile-hero{") &&
 memberCss.includes(".vatra-profile-details-dialog{") &&
 memberCss.includes("body.profile-page .profile-editor-layout{") &&
 !profileMarkup.includes('profile-info.css') &&
 !profileMarkup.includes('profile-editor.css'),
 "Page-specific CSS belongs in canonical profile stylesheets, not feed.css");
assert.ok(memberCss.includes("body.profile-page .profile-media-viewer{")&&
 memberCss.includes("width:100vw;height:100dvh;")&&
 memberCss.includes("body.profile-page .profile-avatar-wrap.has-active-story::before{")&&
 memberCss.includes("body.profile-page.feed-page:not(.community-page) .profile-hero{overflow:visible}")&&
 memberCss.includes("body.profile-page .profile-avatar-wrap.is-menu-open .profile-avatar-menu:not([hidden])"),
 "Member photo viewer must fill the screen and story avatar menu must not be clipped");
assert.ok(sharedCss.includes(".vatra-account")===false ||
 sharedCss.includes("body.feed-page .feed-account-dropdown > a > svg") &&
 sharedCss.includes("body.feed-page .feed-account-dropdown > button > svg"),
 "Account dropdown SVGs must remain visible after language switching");
const sharedJs=await read("assets/js/social-shell.js");
const coverScript=await read("assets/js/profile.js");
assert.ok(sharedCss.includes(".vatra-shell-tooltip")&&
 memberCss.includes("body.profile-page .profile-cover.has-photo::before,")&&
 memberCss.includes("body.profile-page .profile-cover.has-photo::after{")&&
 memberCss.includes("content:none;display:none")&&
 coverScript.includes('if(photoURLs.cover)coverPhoto.src=photoURLs.cover;')&&
 !coverScript.includes('setProperty("--vatra-cover-image"')&&
 memberCss.includes("body.profile-page.feed-page:not(.community-page) .profile-cover .ui-profile-cover-photo-001{")&&
 memberCss.includes("body.profile-page .profile-cover.has-photo .profile-cover-motif,")&&
 memberCss.includes("body.profile-page .profile-cover.has-photo .profile-cover-signature{")&&
 sharedCss.includes("background-repeat:no-repeat")&&
 sharedJs.includes('document.querySelector(".feed-account-menu")?.open')&&
 sharedJs.includes('accountMenu?.addEventListener("toggle"')&&
 sharedCss.includes("border:1px solid #d7e2f5;border-radius:11px;background:#fff;color:#344766")&&
 sharedCss.includes("body.feed-page .feed-account-toggle")&&
 sharedCss.includes("position:absolute;top:var(--vatra-account-dropdown-top,100%);right:var(--vatra-account-dropdown-right,0px);")&&
 sharedCss.includes("border-top:0;border-radius:0 0 17px 17px;")&&
 sharedJs.includes("function setUpAccountPanel()")&&
 sharedJs.includes('dropdown.style.setProperty("--vatra-account-dropdown-top"')&&
 sharedJs.includes('dropdown.style.setProperty("--vatra-account-dropdown-right"')&&
 sharedJs.includes('menu.addEventListener("toggle",position)')&&
 sharedCss.includes("body.feed-page .feed-header-inner{")&&
 memberCss.includes("border-top:0;border-radius:0 0 19px 19px;background:#fff;")&&
 memberCss.includes("height:290px;overflow:hidden;border-radius:0;")&&
 !sharedCss.includes("html:has(body.feed-page){scrollbar-gutter:stable}")&&
 sharedCss.includes("grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);")&&
 sharedCss.includes("max-width:292px;height:36px")&&
 sharedCss.includes("flex:0 0 108px")&&
 sharedCss.includes("flex:0 0 86px")&&
 sharedCss.includes("grid-template-columns:minmax(0,1fr) 220px!important;")&&
 sharedCss.includes(".vatra-search-history{")&&
 sharedCss.includes("max-height:min(290px,54dvh)")&&
 sharedCss.includes(".vatra-search-edit{")&&
 sharedCss.includes(".vatra-search-back{")&&
 sharedCss.includes(".vatra-search-panel.has-query .vatra-search-scope{display:grid}")&&
 sharedJs.includes("document.body.append(panel)")&&
 sharedJs.includes('panel.style.paddingTop="0px"')&&
 sharedJs.includes('const headerTop=Math.max(oy,header?.top??oy)')&&
 sharedCss.includes("position:fixed;z-index:89;display:flex;flex-direction:column;gap:0;")&&
 sharedCss.includes("border:1px solid #e0e5ed;border-top:0;border-radius:0 0 16px 16px;")&&
 sharedJs.includes('back.addEventListener("click"')&&
 sharedJs.includes('edit.addEventListener("click"')&&
 sharedJs.includes('clearAll.addEventListener("click"')&&
 !sharedCss.includes(".feed-sidebar")&&
 sharedCss.includes(".feed-composer-avatar")&&
 sharedJs.includes("positionTooltip(target)")&&
 sharedJs.includes("setUpStories()")&&
 sharedJs.includes("localStorage.setItem(storageKey")&&
 sharedJs.includes("vatra.search.history.v2.member.")&&
 sharedJs.includes("window.VATRA_SEARCH_HISTORY={setViewer}")&&
 !sharedJs.includes('const storageKey="vatra.search.history.v1"')&&
 (await read("assets/js/notifications.js")).includes("window.VATRA_SEARCH_HISTORY?.setViewer(null)")&&
 (await read("assets/js/notifications.js")).includes("window.VATRA_SEARCH_HISTORY?.setViewer(ownId)")&&
 sharedJs.includes("setUpSiteSearch()")&&
 !sharedCss.includes(".vatra-search-history::-webkit-scrollbar-thumb")&&
 css.includes(".vatra-search-history")&&
 !sharedCss.includes("body.feed-page .ui-social-top-feed-001{color:#376fdf"),
 "VATRA must use auth-style tooltips, one active header and no obsolete social CSS");
for(const page of sharedShellPages){
 const html=await read(page+".html");
 assert.equal(normalizedSocialHeader(html),canonicalSocialHeader,
  page+": social header markup differs from canonical Feed header");
 const header=html.match(/<header class="feed-header[\s\S]*?<\/header>/)[0];
 for(const cls of ["ui-feed-brand-search-001","ui-social-top-feed-001",
  "ui-social-top-friends-001","ui-social-top-communities-001",
  "ui-social-top-clips-001","ui-social-top-marketplace-001",
  "ui-feed-notifications-button-001",
  "ui-feed-music-button-001","ui-feed-account-menu-001"]){
  assert.ok(header.includes(cls),page+": shared header missing "+cls);
 }
 assert.equal((header.match(/id="feed-search-form"/g)||[]).length,1,
  page+": VATRA search must be in the top header exactly once");
 assert.ok(header.includes('id="vatra-search-panel"')&&
  header.includes('id="vatra-search-history"')&&
  header.includes('id="vatra-search-back"')&&
  header.includes('id="vatra-search-edit"')&&
  header.includes('id="vatra-search-clear"')&&
  header.includes('id="feed-search-clear-input"')&&
  !header.includes('data-vatra-search-scope="posts"')&&
  !header.includes('data-vatra-search-scope="communities"'),
  page+": VATRA universal search must retain history and its own clear control");
 assert.ok(["ui-vatra-account-profile-icon-001","ui-vatra-account-settings-icon-001",
  "ui-vatra-account-support-icon-001","ui-vatra-account-logout-icon-001"].every(cls=>header.includes(cls))&&
  header.includes('class="vatra-account-settings-label-001" data-social-uk=')&&
  header.includes('class="vatra-account-profile-label-001" data-i18n="n48"'),
  page+": account avatar menu must preserve SVG icons and live translations");
 assert.ok(header.includes('href="settings#general" class="feed-menu-settings-link')&&!header.includes("feed-menu-settings-panel")&&!header.includes("data-language-trigger"),page+": Settings opens the settings page directly");
 const nav=header.match(/<nav class="social-top-nav[\s\S]*?<\/nav>/)?.[0]||"";
 const controls=header.match(/<div class="feed-header-controls[\s\S]*?<\/header>/)?.[0]||"";
 assert.ok(nav.indexOf("ui-social-top-feed-001")<nav.indexOf("ui-social-top-friends-001")&&
  nav.indexOf("ui-social-top-friends-001")<nav.indexOf("ui-social-top-communities-001")&&
  nav.indexOf("ui-social-top-communities-001")<nav.indexOf("ui-social-top-clips-001")&&
  nav.indexOf("ui-social-top-clips-001")<nav.indexOf("ui-social-top-marketplace-001"),
  page+": five icon destinations must be in the agreed order");
 assert.ok(!controls.includes("ui-shell-header-friends-001")&&
  controls.indexOf("ui-feed-notifications-button-001")<controls.indexOf("ui-feed-music-button-001")&&
  controls.indexOf("ui-feed-music-button-001")<controls.indexOf("ui-feed-account-menu-001")&&
  controls.indexOf("ui-feed-account-menu-001")<controls.indexOf('id="feed-menu-name"'),
  page+": right controls must end with Avatar and first name");
}
const storyPreviewMarkup=await read("feed.html");
assert.ok(storyPreviewMarkup.includes('id="feed-create-story"')&&
 storyPreviewMarkup.includes('id="feed-friend-stories"')&&
 storyPreviewMarkup.includes('id="feed-compose-open"')&&
 storyPreviewMarkup.includes('id="feed-compose-form"')&&
 storyPreviewMarkup.includes('id="feed-story-dialog"')&&storyPreviewMarkup.includes('assets/js/feature-loader.js?rev=')&&
 !storyPreviewMarkup.includes('src="assets/js/story-editor.js?rev=')&&
 !storyPreviewMarkup.includes("ui-feed-story-preview-001")&&
 !storyPreviewMarkup.includes('data-vatra-coming-soon="stories"'),
 "Feed must show real friend Stories without fabricated previews, then the post composer");
// The new Feed must be the authenticated home, not a duplicate account page.
const feedMarkup=await read("feed.html");
const memberProfileMarkup=await read("profile.html");
const feedScript=await read("assets/js/feed.js");
const profileScript=await read("assets/js/profile.js");
assert.ok(
 memberProfileMarkup.includes('id="profile-friend-action"')&&
 memberProfileMarkup.includes('id="profile-friend-menu"')&&
 memberProfileMarkup.includes('id="profile-friend-menu-action"')&&
 memberProfileMarkup.includes('id="profile-more-menu"')&&
 memberProfileMarkup.includes('id="profile-more-trigger"')&&
 memberProfileMarkup.indexOf('id="profile-more-menu"')<memberProfileMarkup.indexOf('class="social-profile-tabs')&&
 profileScript.includes('friendButton.dataset.friendState')&&
 profileScript.includes('friendMenuOpen(false)')&&
 profileScript.includes('friendMenuAction.addEventListener("click",()=>void changeFriendship())')&&
 profileScript.includes('t("Заявку надіслано","Request sent")')&&
 profileScript.includes('t("Заблокувати ","Block ")+firstName'),
 "Visitor actions must provide a dropdown for pending friend requests and More actions beside Message"
);
const avatarCommentRowScript=await read("assets/js/profile-avatar-comment-row.js");
const profileCoverScript=await read("assets/js/profile-cover-editor.js");
const profileCoverViewerScript=await read("assets/js/profile-cover-viewer.js");
const profileAvatarScript=await read("assets/js/profile-avatar-editor.js");
// Only numeric /idN profile permalinks are generated. GitHub Pages serves its
// 404.html fallback at these addresses, then mounts the real profile markup.
assert.ok(profileScript.includes('const memberUrl=id=>home+"id"+encodeURIComponent(id);')&&
 profileScript.includes('history.replaceState(history.state,"",canonical.href)')&&
 legacyScript.includes('const dynamic=location.pathname.match(/^\\/VATRA\\/(id|club)')&&
 !legacyScript.includes("legacyProfile")&&
 !profileScript.includes('new URL("profile.html?vatra_id="+encodeURIComponent(id),home).href')&&
 !profileScript.includes('home+"id="+')&&
 lang.includes('const dynamicMember=/^id[1-9]'),
 "Only /idN is a supported profile permalink; no id= or query-param links");
const communityBannerMarkup=await read("communities.html"),communityBannerCSS=await read("assets/css/communities.css");
assert.ok(communityBannerMarkup.includes('<span class="ui-community-banner-art-001" aria-hidden="true"></span>')&&
 !communityBannerMarkup.includes('<img class="ui-community-banner-art-001"')&&
 communityBannerCSS.includes("width:100%;height:290px")&&communityBannerCSS.includes('background:center/cover no-repeat url("../communities_covers/communities.webp")')&&communityBannerCSS.includes(".ui-community-discovery-banner-001{height:185px}")&&
 communityBannerCSS.includes(".ui-community-discovery-banner-001[hidden]{display:none}")&&
 !(await read("club.html")).includes("ui-community-banner-art-001"),
 "The original Uzhhorod panorama must be exclusively a responsive directory hero");
const communityScript=await read("assets/js/communities.js");
const clubRuntime=await read("assets/js/club.js");
const communityCoreRuntime=await read("assets/js/community-core.js");
for(const source of [communityScript,clubRuntime,communityCoreRuntime])assert.doesNotThrow(()=>new Function(source),"Community routes and Redis fallback must parse as JavaScript");
const directoryMarkup=await read("communities.html"),clubMarkup=await read("club.html");
assert.ok(directoryMarkup.includes("assets/js/community-core.js")&&directoryMarkup.includes("assets/js/communities.js")&&!directoryMarkup.includes("assets/js/club.js")&&!directoryMarkup.includes("assets/js/post-media.js")&&!directoryMarkup.includes("assets/js/post-interactions.js"),"Directory must not load club publication features");
assert.ok(clubMarkup.includes("assets/js/community-core.js")&&clubMarkup.includes("assets/js/club.js")&&!clubMarkup.includes("assets/js/communities.js")&&clubMarkup.includes("assets/js/post-media.js")&&clubMarkup.includes("assets/js/post-interactions.js"),"Club route owns its publication features");
assert.ok(!communityScript.includes("setupClubSocial")&&!clubRuntime.includes("openDirectory"),"Community pages must contain only their own route logic");
const postMediaScript=await read("assets/js/post-media.js");
// Stories accept photo or video without requiring a caption, but keep private media paths.
const storyEditorRuntime=await read("assets/js/story-editor.js");
const storyEditorStyles=await read("assets/css/story-editor.css");
assert.doesNotThrow(()=>new Function(storyEditorRuntime),"Shared story editor must be valid JavaScript");
assert.ok(storyPreviewMarkup.includes('assets/js/feature-loader.js?rev=')&&
 memberProfileMarkup.includes('assets/js/feature-loader.js?rev=')&&
 !storyPreviewMarkup.includes('src="assets/js/story-editor.js?rev=')&&
 !memberProfileMarkup.includes('src="assets/js/story-editor.js?rev=')&&
 storyEditorRuntime.includes('canvas.width=W;canvas.height=H')&&storyEditorRuntime.includes('out.width=1080;out.height=1920')&&storyEditorStyles.includes('aspect-ratio:9/16')&&
 storyPreviewMarkup.includes('id="feed-story-view-media"')&&
 !/id="feed-story-text"[^>]*\srequired/.test(storyPreviewMarkup)&&
 memberProfileMarkup.includes('id="profile-story-viewer-media"')&&
 feedScript.includes('VATRA_FEATURES.load("story")')&&
 profileScript.includes('VATRA_FEATURES.load("story")')&&
 storyEditorRuntime.includes('VATRA_POST_MEDIA.uploadStory(client,id,fileToPublish)')&&
 profileScript.includes('VATRA_POST_MEDIA?.renderStory(client,')&&
 postMediaScript.includes('"/stories/"')&&
 postMediaScript.includes('createSignedUrl(path,ttl)'),
 "Photo/video Stories must use private signed URLs in Feed and profile, without fake media placeholders.");
assert.doesNotThrow(()=>new Function(postMediaScript),"Shared post media module has invalid JavaScript");
assert.ok(
feedMarkup.includes('id="feed-compose-media"') &&
 memberProfileMarkup.includes('id="profile-compose-media"') &&
 (await read("club.html")).includes('id="club-compose-media"') &&
 feedScript.includes("VATRA_POST_MEDIA?.bindGalleryPicker") &&
 profileScript.includes("VATRA_POST_MEDIA?.bindGalleryPicker") &&
 clubRuntime.includes("VATRA_POST_MEDIA?.bindGalleryPicker") &&
 postMediaScript.includes('createSignedUrl(path,ttl)') &&
 postMediaScript.includes('ttl=3600') &&
 postMediaScript.includes('signed(client,kind,path,300)'),
 "VATRA photos and videos must be attached, published and displayed across all post surfaces");
assert.ok(
 clubRuntime.includes("postPattern.test(linkedId") &&
 clubRuntime.includes('.eq("club_id",clubId).eq("id",linkedId)') &&
 clubRuntime.includes('target.scrollIntoView({block:"center",behavior:"smooth"})') &&
 (await read("assets/js/post-interactions.js")).includes('validUUID(post.id)?"?post="'),
 "Community publications from sharing must open their exact post");
const searchRouteSource=await read("assets/js/social-shell.js");
const searchRouteGuards=searchRouteSource.match(/  const validMember=.*\n  const validPost=.*\n/)?.[0];
const searchRouteBody=searchRouteSource.slice(searchRouteSource.indexOf("  const base=()=>new URL("),searchRouteSource.indexOf("  const groupLabel="));
assert.ok(searchRouteGuards&&searchRouteBody.includes("const resultHref="),"Missing search route helpers");
const getSearchHref=new Function("location",searchRouteGuards+searchRouteBody+"return resultHref;")({href:"https://mykolakolisnyk.github.io/VATRA/feed.html"});
const searchTestPost="de305d54-75b4-431b-adb2-eb6b9e546014";
const searchTestBase="https://mykolakolisnyk.github.io/VATRA/";
for(const type of ["posts","photos","videos"]){
 assert.equal(getSearchHref(type,{id:searchTestPost,kind:"group",club_id:"2"}),searchTestBase+"club2?post="+searchTestPost);
 assert.equal(getSearchHref(type,{id:searchTestPost,kind:"person"}),searchTestBase+"feed?post="+searchTestPost);
}
assert.equal(getSearchHref("people",{vatra_id:"1"}),searchTestBase+"id1");
assert.equal(getSearchHref("communities",{club_id:"2"}),searchTestBase+"club2");
assert.equal(getSearchHref("products",{id:searchTestPost}),searchTestBase+"marketplace?item="+searchTestPost);
assert.equal(getSearchHref("clips",{id:searchTestPost}),searchTestBase+"clips?clip="+searchTestPost);
assert.equal(getSearchHref("posts",{id:"invalid"}),null);
assert.equal(getSearchHref("people",{vatra_id:"../1"}),null);
const feedStyle=await read("assets/css/feed.css");
assert.ok(
 feedMarkup.includes('id="feed-filter-summary"') &&
 feedScript.includes('const describeFilter=()=>{') &&
 feedScript.includes('Date.now()-subscriptionsLoadedAt<60000') &&
 feedStyle.includes('body.feed-page:not(.profile-page):not(.community-page) .vatra-feed-filter-summary-001{'),
 "Feed category filters must explain their scope and reuse recent subscriptions");

assert.doesNotThrow(()=>new Function(feedScript),"Feed script must remain valid JavaScript");
assert.ok(
 feedScript.includes("avatarChecks=new Map()") &&
 feedScript.includes("image.onerror=()=>resolve(false)") &&
 feedScript.includes("for(const id of lookup)mediaAvatars.delete(id)") &&
 !feedScript.includes('+" · ID "+String(id)') &&
 feedStyle.includes("body.feed-page .feed-avatar:not(.has-photo)") &&
 feedStyle.includes("body.feed-page .feed-story-author-avatar:not(.has-photo)"),
 "Feed avatars must validate uploaded photos and show silhouettes when Storage objects disappear");
assert.ok(feedMarkup.includes('data-page="feed"')&&
 /data-i18n="n12">\s*Стрічка\s*<\/h1>/.test(feedMarkup)&&
 !feedMarkup.includes("Стрічка новин")&&
 feedMarkup.includes('id="feed-compose-form"')&&
 !feedMarkup.includes('id="feed-community-list"')&&
 !feedMarkup.includes('class="feed-aside ui-feed-aside-001"')&&
 !feedMarkup.includes('class="feed-sidebar ui-feed-sidebar-001"')&&
 !memberProfileMarkup.includes('class="feed-sidebar ui-feed-sidebar-001"')&&
 feedMarkup.includes('id="feed-posts"')&&
 feedMarkup.includes('id="feed-delete-dialog"')&&
 feedMarkup.indexOf('class="feed-quick-compose ui-feed-quick-compose-001"')<
 feedMarkup.indexOf('class="feed-stories is-empty ui-feed-stories-001"')&&
 feedMarkup.indexOf('class="feed-stories is-empty ui-feed-stories-001"')<
 feedMarkup.indexOf('class="feed-posts-section ui-feed-posts-section-001"')&&
 memberProfileMarkup.includes('id="profile-compose-dialog"')&&
 memberProfileMarkup.includes('id="profile-compose-form"')&&
 profileScript.includes('client.from(publishAt?"scheduled_feed_posts":"feed_posts").insert(payload)')&&
 feedScript.includes('client.from(publishAt?"scheduled_feed_posts":"feed_posts")')&&
 feedScript.includes('const personFields="id,author_vatra_id,body,created_at,visibility,media_kind,media_path,media_items,poll,shared_post_kind,shared_post_id,is_clip,pinned_at,comments_enabled"')&&
 feedScript.includes('query.eq("is_clip",false)')&&
 !feedScript.includes("Independent, fixed-size Supabase cursors keep the two chronological feeds merged.\");")&&
 !feedScript.includes("innerHTML")&&
 feedStyle.includes('grid-template-columns:minmax(170px,210px) minmax(0,1fr)!important')&&
 auth.includes('window.location.replace(url("feed"))'),
 "VATRA Feed must render the composer before real Stories and personalized posts");
assert.ok(feedStyle.includes('body.feed-page > .vatra-auth-loading[hidden]{display:none!important}')&&
 feedStyle.includes('body.feed-page:not(.profile-page):not(.community-page) .feed-post-placeholder{')&&
 !feedStyle.includes('body.profile-page .profile-cover.is-loading-media{')&&
 feedStyle.includes('body.feed-page.vatra-shell-pending .feed-header{pointer-events:none}')&&
 feedScript.includes('void Promise.allSettled([loadPosts(true),loadStories(),loadGlobalResults()])')&&
 feedScript.includes('batch.append(same&&oldElement?oldElement:recoverFeedCard(item,engagement))')&&
 feedScript.includes('try{return card(post,engagement);}catch(error)')&&
 feedScript.includes('if(reset){posts.replaceChildren(batch);lastFeedScope=scope;}')&&
 feedScript.includes('else posts.append(batch);')&&
 feedScript.includes('const keepExisting=reset&&scope===lastFeedScope')&&
 profileScript.includes('const mediaPromise=setupProfileMedia(client,ownId,targetId,isMine,user.id,user.email,locked,preloadedMedia)')&&
 profileScript.includes('const postsPromise=locked?Promise.resolve():loadPosts(client,targetId,ownId,user.id)')&&
 profileScript.includes('const access=await profileDeadline(window.VATRA_PROFILE_DETAILS.init({client,ownId,targetId,isMine,blockAccess,prepared}))')&&
 profileScript.includes('void mediaPromise.catch(()=>{')&&
 memberProfileMarkup.includes('ui-vatra-profile-realistic-skeleton-001')&&
 profileScript.includes('setImage(postAvatar,candidate)')&&
 memberProfileMarkup.includes('id="profile-avatar-engagement"'),
 "Authenticated pages must use nonblocking inline skeletons and retain real avatar engagement");

assert.ok(
 profileScript.includes("async function resolveFriendships(friendships)")&&
 profileScript.includes(".order(\"created_at\",{ascending:false}).limit(4)")&&
 profileScript.includes(".eq(\"recipient_vatra_id\",targetId).order(\"created_at\",{ascending:false}).limit(3)")&&
 profileScript.includes("allFriendsPending=(async()=>{")&&
 profileScript.includes("allGiftsPending=(async()=>{")&&
 profileScript.includes("window.VATRA_PROFILE_SHOW_FRIENDS=showFriends")&&
 profileScript.includes("window.VATRA_PROFILE_SHOW_GIFTS=showGifts"),
 "Profile must fetch only four friends and three gifts initially, loading full lists on demand");
const detailsModule=profileScript;
assert.equal((memberProfileMarkup.match(/src="assets\/js\/profile\.js(?:\?rev=[a-f0-9]{40})?"/g)||[]).length,1,
 "Exactly one page-level profile controller must be loaded");
assert.doesNotThrow(()=>new Function(detailsModule),"Profile information module has invalid JavaScript");
assert.ok(memberProfileMarkup.includes('assets/js/profile.js') &&
 !memberProfileMarkup.includes('assets/js/profile-details.js') &&
 detailsModule.includes('profile-editor-page-visibility') &&
 detailsModule.includes('from("profile_details")') &&
 detailsModule.includes('from("profile_preferences")') &&
 detailsModule.includes('window.VATRA_PROFILE_DETAILS={prepare,init,open:()=>openEditor()}') &&
 memberCss.includes("body.profile-page .profile-editor-layout"),
 "VATRA personal profile editor must have group navigation and real Supabase field privacy");
assert.ok(
 detailsModule.includes('button.setAttribute("role","combobox")') &&
 detailsModule.includes('panel.setAttribute("role","listbox")') &&
 detailsModule.includes('button.setAttribute("aria-expanded","false")') &&
 detailsModule.includes('state.anchor.setAttribute("aria-activedescendant",button.id)') &&
 detailsModule.includes('native.hidden=true;native.tabIndex=-1') &&
 detailsModule.includes('native.dispatchEvent(new Event("change",{bubbles:true}))') &&
 detailsModule.includes('enhanceEditorSelect(selectBox,"compact")') &&
 detailsModule.includes('enhanceEditorSelect(change,"page")') &&
 detailsModule.includes('if(!editable){event.preventDefault();open(true);return;}') &&
 detailsModule.includes('state.panel.scrollTop+=option.bottom-bounds.bottom') &&
 memberCss.includes('.vatra-editor-select>select[hidden]{display:none!important}') &&
 memberCss.includes('.ui-profile-editor-dropdown-panel-001'),
 "VATRA editor dropdowns must keep native values synchronized, field privacy selectable, keyboard navigation accessible and option scrolling contained");
assert.ok(
 !detailsModule.includes('item.append(badge,label,content)') &&
 detailsModule.includes('paragraph.textContent=bio') &&
 detailsModule.includes('paragraph.hidden=!bio') &&
 detailsModule.includes('more.hidden=!additional.length&&!hasLongPreview') &&
 !detailsModule.includes('vatra-profile-detail-audience-') &&
 detailsModule.includes('lab.htmlFor=inputId') &&
 !detailsModule.includes('lab.prepend(svg(fieldIcons[key]') &&
 memberCss.includes('body.profile-page.feed-page:not(.community-page) .profile-info{') &&
 memberCss.includes('grid-template-columns:minmax(0,38%) minmax(0,1fr)'),
 "Profile About preview has a centered optional bio, compact facts, and no read-only icon tiles");
assert.ok(
 memberProfileMarkup.includes('id="profile-post-filter-button"') &&
 memberProfileMarkup.includes('id="profile-post-filter-year"') &&
 memberProfileMarkup.includes('id="profile-post-filter-month"') &&
 memberProfileMarkup.includes('id="profile-post-filter-reset"') &&
 profileScript.includes('function setupProfilePostFilters(client,targetId,ownId,userId)') &&
 profileScript.includes('query=query.gte("created_at",start.toISOString())') &&
 profileScript.includes('.lt("created_at",end.toISOString())') &&
 profileScript.includes('if(ticket!==profilePostsRequest)return') &&
 memberCss.includes('body.profile-page .profile-post-filter-panel{'),
 "Profile posts must filter by year/month server-side before pagination, with a safe reset");
const sharedAvatar=await read("assets/js/avatar.js");
const systemAvatarCss=await read("assets/css/base.css");
const systemProfileCss=await read("assets/css/profile.css");
const systemFeedCss=await read("assets/css/feed.css");

assert.ok(
 systemProfileCss.includes("body.profile-page :is(")&&
 systemProfileCss.includes("#profile-posts,#profile-friends-preview-list,#profile-gifts-preview-list")&&
 systemProfileCss.includes("#profile-photo-gallery,#profile-video-gallery,#profile-clips-gallery,#profile-saved-list")&&
 systemProfileCss.includes("#profile-archive-stories-list,#profile-archive-posts-list")&&
 systemProfileCss.includes("):not(:has(> *)){")&&
 systemProfileCss.includes("--vatra-content-card-gap:16px")&&
 systemFeedCss.includes("#feed-posts:not(:has(> *))")&&
 systemFeedCss.includes("#club-posts:not(:has(> *))")&&
 systemFeedCss.includes("row-gap:var(--vatra-content-card-gap)!important"),
 "Empty lists must collapse instead of creating extra gaps before empty cards, on all profile and Feed routes");

const ownerMenus=await read("assets/js/post-interactions.js");
const feedLogic=await read("assets/js/feed.js");
const searchLogic=await read("assets/js/social-shell.js");
// Native three-dot owner menu in Feed and profiles, never an inline archive/delete toolbar.
assert.ok(ownerMenus.includes('function addOwnerMenu(header,')&&
 ownerMenus.includes('tr("Архівувати","Archive")')&&ownerMenus.includes('vatra_set_post_pin')&&ownerMenus.includes('comments_enabled')&&
 ownerMenus.includes('tr("Видалити","Delete")')&&
 feedLogic.includes('VATRA_POST_INTERACTIONS?.addOwnerMenu(head,')&&
 profileBehavior.includes('VATRA_POST_INTERACTIONS?.addOwnerMenu(header,')&&
 !feedLogic.includes('head.append(remove)')&&
 !profileBehavior.includes('header.append(archive,remove)'),
 "Only owners have one accessible three-dot menu with archive and delete");
assert.ok(searchLogic.includes("const compact=vw<=600;")&&
 searchLogic.includes("expanded?790:505")&&
 searchLogic.includes("Math.min(inputBox.left,ox+vw-width-12)")&&
 systemFeedCss.includes('display:grid!important;grid-template-columns:minmax(0,1fr) 220px!important')&&
 systemFeedCss.includes('.feed-top-controls{display:contents!important}')&&
 systemFeedCss.includes('.feed-top-controls > .feed-posts-section{')&&
 systemFeedCss.includes('grid-column:1;grid-row:3;width:100%;min-width:0;margin:0')&&
 systemProfileCss.includes("width:146px;height:146px;margin:-54px"),
 "Search must align to its field without overflowing; Stories and Posts retain the Composer column; avatar is larger");

// A single rule touches the bottom of post content, above the SVG action counts.
// Comments, shares and the composer do not add more divider lines.
assert.ok(
 systemFeedCss.includes('body.feed-page .vatra-post-interactions{\n margin-top:0;padding-top:6px;border-top:1px solid #e8eef6;')&&
 systemFeedCss.includes('padding:5px 0;margin-top:0')&&
 systemFeedCss.includes('padding-top:3px;margin-bottom:2px')&&
 !systemFeedCss.includes('border-top:1px solid #e8eef6;padding-top:11px;margin-bottom:2px')&&
 systemFeedCss.includes('body.feed-page .feed-post-card .vatra-post-action-row{margin-top:0}'),
 "Post footer must have exactly one divider directly above action icons");

// Gallery uploads stay bounded and use the existing RLS-protected post rows.
// Comment threads are not requested or shown until the real post enters its dialog.
const postComposerScript=await read("assets/js/post-composer-ui.js");
const clubPostScript=clubRuntime;
assert.ok(
 postMediaScript.includes("const GALLERY_LIMIT=12,VIDEO_LIMIT=4,TOTAL_LIMIT=160*1024*1024")&&
 postMediaScript.includes("function bindGalleryPicker(ids)")&&
 postMediaScript.includes("async function uploadGallery(client,id,files)")&&
 postMediaScript.includes("async function mountGallery(client,post,container)")&&
 interactionsScript.includes("panel.hidden=true;")&&
 interactionsScript.includes('const openComments=()=>{')&&
 interactionsScript.includes('dialog.showModal();content.scrollTop=0;close.focus(')&&
 !interactionsScript.includes('summaryObserver.disconnect();void refreshSocial();void loadComments(true);')&&
 (await read("assets/js/feed.js")).includes("media_items:uploaded||[]")&&
 profileExtraScript.includes("media_items:uploaded||[]")&&
 clubPostScript.includes("media_items:uploaded||[]")&&
 postComposerScript.includes('vatra-post-composer-dialog')&&
 (await read("feed.html")).includes('type="file" multiple')&&
 (await read("profile.html")).includes('type="file" multiple')&&
 (await read("club.html")).includes('type="file" multiple'),
 "Gallery posting, secure preview and on-demand comments must remain intact");

assert.ok(
 interactionsScript.includes('async function prefetchEngagement(client,posts)')&&
 interactionsScript.includes('client.rpc("post_engagement_page"')&&
 interactionsScript.includes('if(!snapshot&&typeof IntersectionObserver')&&
 interactionsScript.includes('let stored=!!snapshot?.viewer_saved')&&
 interactionsScript.includes('   refresh();')&&
 feedScript.includes('prefetchEngagement(client,page)')&&
 profileScript.includes('prefetchEngagement(')&&
 clubPostScript.includes('prefetchEngagement('),
 "All three post surfaces must batch RLS-scoped engagement instead of querying each badge");

assert.ok(
 clubPostScript.includes("const CLUB_PAGE_SIZE=12")&&
 clubPostScript.includes(".range(postsOffset,postsOffset+CLUB_PAGE_SIZE-1)")&&
 clubPostScript.includes("renderedPostIds.has(post.id)")&&
 clubPostScript.includes("if(!append)refreshQueued=true")&&
 !clubPostScript.includes(".limit(50)")&&
 (await read("club.html")).includes('id="club-posts-more"'),
 "Community posts must paginate in small bounded pages without duplicate deep links");

const feedPostGrantMigration=await read("_development/supabase/migrations/20261113165546_restore_authenticated_feed_posts_data_api_permissions.sql");
assert.ok(
 feedPostGrantMigration.includes("GRANT SELECT, INSERT, UPDATE ON TABLE public.feed_posts TO authenticated;")&&
 !feedPostGrantMigration.includes("TO anon;")&&
 !feedPostGrantMigration.includes("DISABLE ROW LEVEL SECURITY"),
 "Authenticated members must be able to publish feed posts without exposing them to anon");

const mediaOnlyMigration=await read("_development/supabase/migrations/20261113170207_allow_gallery_only_posts_without_text.sql");
const communityGrantMigration=await read("_development/supabase/migrations/20261113171114_restore_community_directory_read_and_owner_create_grants.sql");
const socialUpdateMigration=await read("_development/supabase/migrations/20261113171325_restore_owner_scoped_update_privileges_for_social_features.sql");
assert.ok(
 mediaOnlyMigration.includes("jsonb_array_length(media_items) > 0")&&
 mediaOnlyMigration.includes("feed_posts_body_length")&&
 mediaOnlyMigration.includes("vatra_community_posts_body_check")&&
 communityGrantMigration.includes("GRANT SELECT ON TABLE public.communities TO anon, authenticated;")&&
 communityGrantMigration.includes("GRANT INSERT ON TABLE public.communities TO authenticated;")&&
 socialUpdateMigration.includes("GRANT UPDATE ON TABLE public.vatra_friendships TO authenticated;")&&
 socialUpdateMigration.includes("GRANT UPDATE ON TABLE public.vatra_profile_media TO authenticated;")&&
 socialUpdateMigration.includes("GRANT UPDATE ON TABLE public.vatra_public_profiles TO authenticated;")&&
 socialUpdateMigration.includes("GRANT UPDATE ON TABLE public.member_notifications TO authenticated;")&&
 socialUpdateMigration.includes("GRANT UPDATE ON TABLE public.profile_presence TO authenticated;")&&
 !socialUpdateMigration.includes("TO anon"),
 "Gallery-only publishing, public community directory and RLS-scoped social writes must be retained");

const domainReadViewMigration=await read("_development/supabase/migrations/20261113171916_add_nonbreaking_domain_named_rls_invoker_read_views.sql");
const domainGiftsScript=await read("assets/js/gifts.js");
assert.ok(
 domainReadViewMigration.split("WITH (security_invoker = true)").length===4&&
 domainReadViewMigration.includes("CREATE VIEW public.member_directory")&&
 domainReadViewMigration.includes("CREATE VIEW public.account_states")&&
 domainReadViewMigration.includes("CREATE VIEW public.profile_gifts")&&
 domainReadViewMigration.includes("GRANT SELECT ON TABLE public.member_directory TO anon,authenticated;")&&
 domainReadViewMigration.includes("GRANT SELECT ON TABLE public.account_states,public.profile_gifts TO authenticated;")&&
 domainReadViewMigration.includes("REVOKE ALL ON TABLE")&&
 profileScript.includes('client.from("member_directory")')&&
 profileScript.includes('client.from("profile_gifts")')&&
 sharedAvatar.includes('client.from("account_states")')&&
 domainGiftsScript.includes('client.from("profile_gifts")')&&
 !domainGiftsScript.includes('client.from("vatra_profile_gifts")'),
 "New read-only domain aliases must retain invoker-RLS and support old clients");

const physicalRenameSql=await read("_development/supabase/migrations/20261113174336_rename_three_read_only_domain_tables_and_preserve_legacy_rls_views.sql");
assert.ok(
 physicalRenameSql.includes("ALTER TABLE public.vatra_directory RENAME TO member_directory;")&&
 physicalRenameSql.includes("ALTER TABLE public.vatra_account_states RENAME TO account_states;")&&
 physicalRenameSql.includes("ALTER TABLE public.vatra_profile_gifts RENAME TO profile_gifts;")&&
 physicalRenameSql.includes("insert into public.member_directory(vatra_id)")&&
 physicalRenameSql.includes("insert into public.account_states(vatra_id,state,blocked_until,changed_at)")&&
 physicalRenameSql.includes("CREATE VIEW public.vatra_account_states WITH (security_invoker = true)")&&
 physicalRenameSql.includes("CREATE VIEW public.vatra_profile_gifts WITH (security_invoker = true)")&&
 physicalRenameSql.includes("CREATE VIEW public.vatra_directory WITH (security_invoker = true)")&&
 physicalRenameSql.includes("GRANT SELECT ON TABLE public.vatra_directory TO anon,authenticated;")&&
 physicalRenameSql.includes("COMMIT;"),
 "Physical renames must preserve signup/state trigger writes and old-client RLS-only SELECT aliases");

const welcomeGiftRenameSql=await read("_development/supabase/migrations/20261113175142_fix_welcome_gift_after_physical_profile_gifts_rename.sql");
assert.ok(
 welcomeGiftRenameSql.includes("CREATE OR REPLACE FUNCTION vatra_internal.award_welcome_gift()")&&
 welcomeGiftRenameSql.includes("insert into public.profile_gifts(")&&
 welcomeGiftRenameSql.includes("on conflict (recipient_vatra_id,gift_code) do nothing;")&&
 !welcomeGiftRenameSql.includes("insert into public.vatra_profile_gifts("),
 "Signup welcome-gift trigger must use physical table after renaming it");

const renamedLikerAndReports=await read("_development/supabase/migrations/20261113174858_rename_post_like_members_and_profile_reports_preserving_rls_compatibility.sql");
assert.ok(
 renamedLikerAndReports.includes("ALTER TABLE public.vatra_post_like_members RENAME TO post_like_members;")&&
 renamedLikerAndReports.includes("ALTER TABLE public.vatra_profile_reports RENAME TO profile_reports;")&&
 renamedLikerAndReports.includes("insert into public.post_like_members(")&&
 renamedLikerAndReports.includes("CREATE VIEW public.vatra_profile_reports WITH (security_invoker = true)")&&
 renamedLikerAndReports.includes("GRANT INSERT ON TABLE public.vatra_profile_reports TO authenticated;")&&
 profileScript.includes('client.from("profile_reports").insert(')&&
 !profileScript.includes('client.from("vatra_profile_reports")'),
 "Profile reports and public like membership tables must retain RLS and legacy client write support");

const socialDomainMigration=await read("_development/supabase/migrations/20261113175644_rename_fourteen_social_tables_with_rls_compatibility.sql");
const socialDomainPairs=[
 ["vatra_avatar_comment_likes","avatar_comment_likes"],
 ["vatra_avatar_comments","avatar_comments"],["vatra_avatar_likes","avatar_likes"],
 ["vatra_blocks","member_blocks"],["vatra_community_follows","community_follows"],
 ["vatra_community_posts","community_posts"],["vatra_direct_messages","direct_messages"],
 ["vatra_friendships","friendships"],["vatra_post_comment_likes","post_comment_likes"],
 ["vatra_post_comments","post_comments"],["vatra_post_likes","post_likes"],
 ["vatra_profile_media","profile_media"],["vatra_public_profiles","public_profiles"],
 ["vatra_stories","stories"]
];
assert.ok(
 socialDomainPairs.every(([legacy,physical])=>
  socialDomainMigration.includes(`ALTER TABLE public.${legacy} RENAME TO ${physical};`)&&
  socialDomainMigration.includes(`CREATE VIEW public.${legacy} WITH (security_invoker = true)`))&&
 socialDomainMigration.includes("CREATE OR REPLACE FUNCTION private.emit_member_notification()")&&
 socialDomainMigration.includes("CREATE OR REPLACE FUNCTION public.vatra_comment_thread_page(")&&
 socialDomainMigration.includes("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vatra_friendships TO authenticated;")&&
 !/\bDROP\b[^;]*\bCASCADE\b/i.test(socialDomainMigration.replace(/^\s*--.*$/gm,"")),
 "All 14 physical renames must retain legacy caller-scoped views, notification triggers and RLS");

const lastProfileRename=await read("_development/supabase/migrations/20261113180825_rename_last_two_profile_upsert_tables.sql");
assert.ok(
 lastProfileRename.includes("ALTER TABLE public.vatra_profile_details RENAME TO profile_details;")&&
 lastProfileRename.includes("ALTER TABLE public.vatra_profile_preferences RENAME TO profile_preferences;")&&
 lastProfileRename.includes("CREATE VIEW public.vatra_profile_details WITH (security_invoker = true)")&&
 lastProfileRename.includes("CREATE VIEW public.vatra_profile_preferences WITH (security_invoker = true)")&&
 profileScript.includes('client.from("profile_details")')&&
 profileScript.includes('client.from("profile_preferences")')&&
 !profileScript.includes('client.from("vatra_profile_details")')&&
 !profileScript.includes('client.from("vatra_profile_preferences")'),
 "The last two profile upserts must use physical tables with legacy RLS views");

const publicRedisEdge=await read("_development/supabase/functions/public-community-directory/index.ts");
assert.ok(
 publicRedisEdge.includes('const TTL_SECONDS = 15')&&
 publicRedisEdge.includes('Deno.env.get("REDIS_URL")')&&
 publicRedisEdge.includes('Deno.env.get("REDIS_ENABLED") === "true"')&&
 !publicRedisEdge.includes("REDIS_ALLOW_PLAINTEXT_DEV")&&
 publicRedisEdge.includes('url.startsWith("rediss://")')&&
 publicRedisEdge.includes('url.startsWith("redis://")')&&
 publicRedisEdge.includes('const CACHE_KEY = "vatra:public:communities:v2:latest100"')&&
 publicRedisEdge.includes('createSupabaseClient(supabaseUrl, publishable')&&
 !publicRedisEdge.includes("SUPABASE_SERVICE_ROLE_KEY")&&
 !publicRedisEdge.includes("SUPABASE_SECRET_KEYS")&&
 publicRedisEdge.includes('Cache-Control": "no-store"')&&
 (await read("_development/docs/redis-cache-policy.md")).includes("15 seconds")&&
 communityScript.includes("const PUBLIC_DIRECTORY_CACHE_ENABLED=window.VATRA_COMMUNITY_EDGE_ENABLED===true")&&
 communityScript.includes('client.functions.invoke("public-community-directory",{method:"GET"})')&&
 communityScript.includes("if(!data){"),
 "Optional Redis must cache only globally public community data, fail open, and keep secrets server-side");

assert.ok(
 feedScript.includes('.eq("author_vatra_id",vatraId).select("id").maybeSingle()')&&
 feedScript.includes('String(data?.id)!==String(toDelete.id)')&&
 feedScript.includes('if(insertError)throw insertError;')&&
 feedScript.includes('if(uploaded)try{await window.VATRA_POST_MEDIA.removeGallery(client,uploaded);}catch(_){}')&&
 storyEditorRuntime.includes('if(insertError)throw insertError;inserted=true;')&&
 storyEditorRuntime.includes('if(uploaded&&!inserted)')&&
 storyEditorRuntime.indexOf('if(inserted){dialog.close();reset();try{onPublished?.();}')>storyEditorRuntime.indexOf('if(uploaded&&!inserted)')&&
 interactionsScript.includes("committed=true;")&&
 interactionsScript.includes("if(!committed)"),
 "Feed post, story and comment mutations must confirm persistence before cleanup");
assert.ok(
 interactionsScript.includes('feedback(tr("Публікацію додано у ваш профіль.","Shared to your profile."));')&&
 interactionsScript.includes("Promise.resolve(settings.onShared()).catch(()=>{})")&&
 interactionsScript.includes("navigator.clipboard.writeText(permalink(post))"),
 "Repost success survives refresh and link sharing remains available");
assert.ok(
 feedScript.includes("let feedRequestVersion=0;")&&
 feedScript.includes("if(version!==feedRequestVersion)return;")&&
 feedScript.includes("if(version===feedRequestVersion)"),
 "New search/filter revisions must supersede old Feed pages and errors");
// Third-party friends list privacy must be enforced in both the UI and RLS.
const friendshipPrivacyJs=await read("assets/js/friends.js");
const friendshipPrivacySql=await read("_development/supabase/migrations/20261114154237_private_friendship_rows_to_participants.sql");
assert.ok(
 friendshipPrivacyJs.includes('if(!me){')&&
 friendshipPrivacyJs.includes('Список друзів цього профілю закритий.')&&
 friendshipPrivacyJs.includes('if(error||String(data?.id)!==String(item.id))')&&
 friendshipPrivacyJs.includes('.select("id").maybeSingle()')&&
 friendshipPrivacySql.includes('DROP POLICY IF EXISTS "vatra_friends_read_accepted_or_own"')&&
 friendshipPrivacySql.includes('a.vatra_id = ANY(')&&
 !friendshipPrivacySql.includes("status = 'accepted'"),
 "Private lists and pending requests must remain protected, and removals confirmed");
assert.ok(
 profileBehavior.includes('String(changed?.id)!==String(item.id)')&&
 profileBehavior.includes('Member was not unblocked')&&
 profileBehavior.includes('result.data?.id')&&
 profileBehavior.includes('Friendship was not changed'),
 "Profile blocking and friendship changes must confirm affected rows");
const notificationPerfScript=await read("assets/js/notifications.js");
const workerPerfScript=await read("sw.js");
assert.ok(
 postMediaScript.includes('createSignedUrls(paths,ttl)')&&
 postMediaScript.includes('while(signedURLs.size>256)')&&
 postMediaScript.includes('Promise.allSettled(batch.map(file=>upload(client,id,file)))')&&
 interactionsScript.includes('const snapshotMap=await prefetchEngagement(client,[{kind,id:post.id}]);')&&
 !interactionsScript.includes('const [commentsResult,sharesResult]=await Promise.all([')&&
 interactionsScript.includes('const hydrateSaved=()=>{')&&
 notificationPerfScript.includes('period=subscribed?300000:120000')&&
 notificationPerfScript.includes('Date.now()-lastRefresh<15000')&&
 /const CACHE="vatra-offline-shell-v[0-9]+"/.test(workerPerfScript)&&
 workerPerfScript.includes('fetch(request,{cache:"no-cache"})')&&
 workerPerfScript.includes('cache.match(request)')&&
 workerPerfScript.includes('const staticAsset=url.pathname.startsWith(ROOT+"assets/")')&&
 !workerPerfScript.includes('if(existing)return existing;'),
 "Optimized media batching, bounded caches and idle query throttling must remain intact");

// Blocking is a real member-scoped Supabase relation. Restricted viewers
// retain public header artwork while content and interactions are gated.
assert.ok(
 memberProfileMarkup.includes('id="profile-block-toggle"')&&
 memberProfileMarkup.includes('ui-profile-block-member-icon-001')&&
 memberProfileMarkup.includes('ui-profile-report-warning-icon-001')&&
 profileBehavior.includes('function setupProfileBlocks(client,ownId,targetId,isMine,blockAccess)')&&
 profileBehavior.includes('client.from("member_blocks")')&&
 profileBehavior.includes('blockAccess.blockedByThem')&&
 profileBehavior.includes('data-lock-reason')===false&&
 profileBehavior.includes('notice.dataset.lockReason="block"')&&
 profileBehavior.includes('if(!memberBlocked)setupProfileInteractions(')&&
 systemProfileCss.includes('.profile-locked-notice[data-lock-reason="block"]'),
 "Blocking must show a restricted member notice, hide interactions and keep SVG safety controls");
assert.ok(
 memberProfileMarkup.includes('id="profile-confirm-dialog"')&&
 memberProfileMarkup.includes('id="profile-confirm-accept"')&&
 memberProfileMarkup.includes('id="profile-confirm-cancel"')&&
 memberProfileMarkup.includes('aria-describedby="profile-confirm-description"')&&
 profileBehavior.includes('window.VATRA_PROFILE_CONFIRM=')&&
 profileBehavior.includes('dialog.showModal();')&&
 profileBehavior.includes('window.VATRA_PROFILE_CONFIRM(blocked?{')&&
 !/\b(?:window\.)?confirm\s*\(/.test(profileBehavior.replace(/\/\*[\s\S]*?\*\//g,""))&&
 systemProfileCss.includes('body.profile-page .profile-confirm-dialog::backdrop{'),
 "All profile decisions use the accessible VATRA dialog, not native JS confirm windows");
assert.ok(
 feedMarkup.indexOf('class="feed-posts-section ui-feed-posts-section-001"')<
 feedMarkup.indexOf('</section>\n          </div>\n        </main>')&&
 systemFeedCss.includes('grid-column:1;grid-row:3;width:100%;min-width:0;margin:0'),
 "Feed posts must sit inside the same two-column grid as composer and story");

// The layout shares one compact rhythm between Feed and profiles. A hidden
// notification does not leave a phantom row; media remains uncropped.
assert.ok(
 systemFeedCss.includes('width:min(calc(100% - 36px),1190px)!important')&&
 systemFeedCss.includes('grid-template-columns:minmax(0,1fr) 220px!important')&&
 systemFeedCss.includes('row-gap:13px!important')&&
 systemFeedCss.includes('.feed-main:has(.feed-status:not([hidden]))')&&
 systemFeedCss.includes('max-height:640px;object-fit:contain')&&
 systemFeedCss.includes('width:min(calc(100% - 24px),720px)!important')&&
 systemProfileCss.includes('.profile-posts-main{min-width:0;display:flex;flex-direction:column;gap:14px}')&&
 systemProfileCss.includes('.profile-left-stack{')&&
 systemProfileCss.includes('gap:14px;min-width:0')&&
 systemProfileCss.includes('gap:16px;align-items:start')&&
 systemProfileCss.includes('margin:0;box-sizing:border-box')&&
 systemProfileCss.includes('gap:10px;text-align:center;padding:28px 20px;margin-top:0;'),
 "Feed cards, profile stacks and restricted states share compact spacing");


const friendsInteractionCss=await read("assets/css/friends.css");
const giftsInteractionCss=await read("assets/css/gifts.css");
assert.ok(
 ["--vatra-action-ink:#2464d7","--vatra-action-hover-ink:#1e55bf",
  "--vatra-action-primary:linear-gradient(100deg,#2464d7,#326ce1)",
  "--vatra-action-primary-hover:linear-gradient(100deg,#1e55bf,#2e5fce)"]
  .every(value=>authBaseCss.includes(value))&&
 signInCss.includes("background:var(--vatra-action-primary)")&&
 createAccountCss.includes("background:var(--vatra-action-primary)")&&
 systemFeedCss.includes("height:3px;border-radius:3px 3px 0 0;")&&
 systemFeedCss.includes("color:var(--vatra-action-ink);background:transparent!important")&&
 systemProfileCss.includes("social-profile-tab-active::after")&&
 systemProfileCss.includes("color:var(--vatra-action-ink);background:transparent")&&
 friendsInteractionCss.includes("background:var(--vatra-action-primary)")&&
 giftsInteractionCss.includes("color:var(--vatra-action-ink)")&&
 !systemFeedCss.includes("/* AUTH PALETTE:")&&
 !systemProfileCss.includes("/* AUTH PALETTE:")&&
 !friendsInteractionCss.includes("/* Friend discovery and selected filters")&&
 !giftsInteractionCss.includes("/* Gift filters match the login/signup blue")&&
 systemProfileCss.includes("width:52px;height:52px;padding:10px")&&
 systemProfileCss.includes("width:52px;height:52px;padding:0;box-sizing:border-box"),
 "Auth palette uses canonical declarations without appended duplicate layers");
// Ordinary account avatars and all system covers stay CSS SVGs; exceptional
// account states use the three supplied local Vatryk WebP portraits.
function readEmbeddedSvg(css,name){
 const match=css.match(new RegExp("--"+name+":url\\(\"data:image/svg\\+xml,([^\"\\n]+)\"\\)"));
 return match?decodeURIComponent(match[1]):null;
}
const plainAvatarSvg=readEmbeddedSvg(systemAvatarCss,"vatra-default-avatar");
const plainCoverSvg=readEmbeddedSvg(systemProfileCss,"vatra-default-cover");
assert.ok(
 plainAvatarSvg?.startsWith("<svg")&&plainAvatarSvg.includes('viewBox="0 0 256 256"')&&
 plainCoverSvg?.startsWith("<svg")&&plainCoverSvg.includes('viewBox="0 0 1600 480"')&&
 ["deleted","blocked","not-found"].every(state=>
  systemAvatarCss.includes('--vatra-'+state+'-avatar:url("/VATRA/assets/vatryk/vatryk-'+state+'.webp")')&&
  systemProfileCss.includes("--vatra-"+state+"-cover:var(--vatra-default-cover)"))&&
 !systemProfileCss.includes("--vatra-system-ring:"),
 "Default avatar and covers remain SVGs while blocked, deleted and missing members use their own PNGs");
assert.ok(plainCoverSvg.includes('stop-color="#9db8d7"')&&
 plainCoverSvg.includes('stop-color="#b3c9e2"')&&
 plainCoverSvg.includes('stop-color="#ddc9dd"')&&
 plainCoverSvg.includes('fill="#5f88b2" opacity=".18"')&&
 systemProfileCss.includes('.profile-cover.has-system-cover:not(.has-photo){')&&
 systemProfileCss.includes('background:linear-gradient(105deg,#9db8d7')&&
 systemProfileCss.includes('.profile-cover.has-photo{'),
 "SVG cover must remain distinct from the page background without affecting uploads");
assert.ok(!plainAvatarSvg.includes("<clipPath")&&
 !plainAvatarSvg.includes('r="115"')&&
 plainAvatarSvg.includes('<rect width="256" height="256"')&&
 systemProfileCss.includes("background-size:100% 100%!important")&&
 systemProfileCss.includes("background-size:100% 100%!important")&&
 systemProfileCss.includes("border:4px solid #fff!important"),
 "Default avatar must render full-bleed inside a single white circular border");
assert.ok(
 !systemAvatarCss.includes("/VATRA/assets/avatars/")&&
 !systemProfileCss.includes("/VATRA/assets/avatars/")&&
 !systemProfileCss.includes("/VATRA/assets/covers/")&&
 !sharedAvatar.includes("/VATRA/assets/avatars/")&&
 !sharedAvatar.includes("/VATRA/assets/covers/")&&
 !profileBehavior.includes("/VATRA/assets/covers/")&&
 !memberProfileMarkup.includes("assets/covers/cover-default.svg")&&
 sharedAvatar.includes('window.VATRA_AVATAR={cache,getRemembered,fromPath,applyRemembered,setHeader,clearHeader,asset,coverAsset,')&&
 memberProfileMarkup.includes('id="profile-cover-system" class="ui-profile-cover-system-001" data-vatra-cover-state="default"')&&
 profileBehavior.includes('systemCover.dataset.vatraCoverState=state')&&
 profileBehavior.includes('systemCover.hidden=true')&&
 profileBehavior.includes('systemCover.hidden=false')&&
 !profileBehavior.includes("systemCover.src=")&&
 systemProfileCss.includes('background-image:var(--vatra-default-cover)')&&
 systemProfileCss.includes('[data-vatra-cover-state="blocked"]')&&
 systemProfileCss.includes('[data-vatra-cover-state="deleted"]')&&
 systemProfileCss.includes('[data-vatra-cover-state="not-found"]'),
 "Profile covers remain CSS-embedded SVGs without obsolete upload placeholders");
assert.ok(systemAvatarCss.includes('--vatra-default-avatar:url("data:image/svg+xml,')&&
 systemFeedCss.includes("--vatra-generic-avatar:var(--vatra-default-avatar)")&&
 profileBehavior.includes("missingProfile(publicState)")&&
 profileBehavior.includes('avatarTrigger.disabled=!canViewPhoto||(!hasPhoto&&!hasStory&&!canEdit)')&&
 sharedAvatar.includes('client.from("account_states")')&&
 !sharedAvatar.includes("function portraitColor(image)")&&
 !sharedAvatar.includes("function accent(element,url)")&&
 profileBehavior.includes('avatarWrap.dataset.vatraRingKind="default"')&&
 profileBehavior.includes('wrap.dataset.vatraRingKind=state')&&
 profileBehavior.includes('avatarWrap.removeAttribute("data-vatra-ring-kind")')&&
 systemProfileCss.includes('body.profile-page .profile-avatar-wrap.has-active-story[data-vatra-ring-kind]::before')&&
 systemProfileCss.includes('background:#fff!important;box-shadow:0 0 0 1px #e1e7f1!important')&&
 systemProfileCss.includes('background:conic-gradient(from 40deg,#376de8'),
 "Embedded system SVGs must preserve the story-only gradient ring and privacy behavior");

assert.doesNotThrow(()=>new Function(sharedAvatar),"Shared avatar module remains valid JS");
assert.ok(
 sharedAvatar.includes('face.style.backgroundImage="url("+JSON.stringify(safe)+")"') &&
 sharedAvatar.includes('preload.rel="preload";preload.as="image"') &&
 sharedAvatar.includes("if(verified&&!entry.avatarUrl)entry.avatarUrl=verified"),
 "VATRA header portrait must be primed synchronously without stale remembered-account overrides");
const postInteractionFields=await read("assets/js/post-interactions.js");

const commentsStyle=await read("assets/css/feed.css");
assert.ok(
 postInteractionFields.includes('client.rpc("vatra_comment_thread_page"') &&
 postInteractionFields.includes('client.rpc("comment_reply_counts"') &&
 !postInteractionFields.includes('.eq("parent_comment_id",item.id)') &&
 postInteractionFields.includes('p_parent:item.id') &&
 postInteractionFields.includes('payload.parent_comment_id=target.id') &&
 postInteractionFields.includes('client.from("post_comments").insert(payload)') &&
 postInteractionFields.includes('form.append(ownPortrait,composer)') &&
 postInteractionFields.includes('make("div","vatra-post-comment-emoji-panel') &&
 postInteractionFields.includes('make("div","vatra-post-comment-attach-menu') &&
 postInteractionFields.includes('client.storage.from(bucket).upload(path,file.file') &&
 postInteractionFields.includes('client.storage.from(bucket).createSignedUrl(path,300)') &&
 commentsStyle.includes("body.feed-page .vatra-comment-reply-list") &&
 commentsStyle.includes("body.feed-page .vatra-post-comment-emoji-panel"),
 "VATRA comments must have persisted one-level replies, real signed media, emoji and compact inline layout");

assert.ok(
 postInteractionFields.includes('sort.name="vatra_post_comments_sort"') &&
 postInteractionFields.includes('input.name="vatra_post_comment"') &&
 postInteractionFields.includes('shareAudience.name="vatra_share_visibility"') &&
 postInteractionFields.includes('shareCaption.name="vatra_share_caption"') &&
 postInteractionFields.includes('friendSelect.name="vatra_share_friend"'),
 "Comments and sharing forms must name their controls for accessibility and autofill audits");
const socialMotion=await read("assets/js/social-shell.js");
assert.doesNotThrow(()=>new Function(socialMotion),"Shared VATRA transition logic must be valid JavaScript");
assert.ok(
 !feedStyle.includes("@view-transition{navigation:auto}") &&
 !feedStyle.includes("vatra-route-exiting") &&
 !feedStyle.includes("vatraRouteReadyReveal") &&
 socialMotion.includes('window.VATRA_NAVIGATE={to}') &&
 !socialMotion.includes('direct.searchParams.set("vatra_id",member[1])') &&
 getSearchHref("people",{vatra_id:"1"})===searchTestBase+"id1" &&
 socialMotion.includes('location.assign(next.href)') &&
 !socialMotion.includes('window.setTimeout(navigate,145)') &&
 !socialMotion.includes('classList.add("vatra-route-exiting")') &&
 feedStyle.includes("body.feed-page.vatra-shell-pending .feed-app > :is(.feed-layout,.ui-vatra-community-workspace-001,.ui-vatra-section-main-001)") &&
 !feedStyle.includes("vatra-editor-switching") &&
 !memberCss.includes("view-transition-name:vatra-editor") &&
 feedStyle.includes("@media(prefers-reduced-motion:reduce)") &&
 !socialMotion.includes("VATRA_MOTION") &&
 !profileScript.includes("VATRA_MOTION") &&
 !profileScript.includes("document.startViewTransition(") &&
 /if\s*\(\s*id\s*!==\s*selected\s*\)\s*\{?\s*showGroup\(id\)/.test(profileScript) &&
 profileScript.includes("panel.hidden=panel.dataset.profilePanel!==name"),
 "VATRA routes, tabs and editor chapters must switch immediately while preserving data skeletons");
assert.ok(
 signInCss.includes("background:#fff;border:1.5px solid #a7bff3;color:#285ec6") &&
 memberProfileMarkup.includes('class="profile-posts-overview ui-profile-posts-overview-001"') &&
 memberProfileMarkup.includes('data-social-uk="Головна" data-social-en="Home"') &&
 memberProfileMarkup.includes('data-social-uk="Публікації" data-social-en="Posts"') &&
 memberCss.includes("grid-template-columns:minmax(0,37.5%) minmax(0,1fr)") &&
 memberCss.includes("body.profile-page .profile-posts-overview{"),
 "VATRA sign-in secondary action and balanced About / Posts profile columns must stay visible");
assert.equal(uk.__pages.feed.meta.title,"Стрічка");
assert.equal(en.__pages.feed.meta.title,"Feed");
const onboardingJs=await read("assets/js/onboarding.js");
const ownerAdminGuard=await read("assets/js/account-guard.js");
const ownerAdminJs=await read("assets/js/admin.js");
assert.ok(ownerAdminGuard.indexOf('rpc("vatra_admin_access")')<ownerAdminGuard.indexOf("await loadAdmin()")&&ownerAdminGuard.includes('import(new URL("assets/js/admin.js?rev=')&&ownerAdminGuard.includes('assets/css/admin.css'),"Owner panel code and styles are loaded only after server role check and interaction");
const ownerAdminSQL=await read("_development/supabase/vatra-owner-admin.sql");
assert.ok(ownerAdminGuard.includes('rpc("vatra_admin_access")')&&ownerAdminJs.includes('rpc("vatra_admin_manage"')&&ownerAdminJs.includes("marketView(host,")&&!ownerAdminJs.includes("VATRA_OPEN_MARKET_MODERATION"));
assert.ok((await read("assets/css/feed.css")).includes(".vatra-admin-primary-001{")&&!((await read("assets/css/admin.css")).includes(".vatra-admin-primary-001{")),"Blocked-account action must not depend on lazy admin styles");
assert.ok(ownerAdminSQL.includes("VATRA_ADMIN_REQUIRED")&&ownerAdminSQL.includes("as restrictive")&&ownerAdminSQL.includes("VATRA_OWNER_PROTECTED"));
assert.ok(onboardingJs.includes('onboarding_done')&&onboardingJs.includes('saved?.status!=="done"')&&!onboardingJs.includes("повертайся до підказок"));

const onboardingCss=await read("assets/css/onboarding.css");
assert.ok(feedMarkup.includes('src="assets/js/onboarding.js"')&&
 feedMarkup.includes('href="assets/css/onboarding.css"')&&
 onboardingJs.includes('launch.id="vatra-onboarding-replay"')&&
 feedMarkup.includes('id="vatra-first-steps"')&&
 onboardingJs.includes('buildSteps();void checkTasks();')&&
 !feedMarkup.includes('id="vatra-onboarding-replay"')&&
 feedScript.includes('window.VATRA_ONBOARDING?.start({client,memberId:vatraId,authUserId:user.id,createdAt:user.created_at})')&&
 feedScript.includes('window.VATRA_ONBOARDING?.stop()')&&
 onboardingJs.includes('window.VATRA_ONBOARDING={start,stop,replay,openTasks}')&&
 onboardingJs.includes('vatra.onboarding.v1.member.')&&
 onboardingJs.includes('MAX_AGE_MS=30*24*60*60*1000')&&
 onboardingJs.includes('profile_media')&&onboardingJs.includes('community_follows')&&
 onboardingCss.includes('.vatra-tour-spotlight-001')&&
 onboardingCss.includes('@media(prefers-reduced-motion:reduce)')&&
 ["welcome","waiting","success","goodbye","explanation"].every(state=>
  onboardingJs.includes("vatryk_"+state+".webp")),
 "First-visit Vatryk onboarding must be localized, accessible, per-member and with a nonmodal first-steps panel");
assert.ok(memberProfileMarkup.includes('id="profile-avatar-upload-button"')&&
 memberProfileMarkup.includes('id="profile-cover-upload-button"')&&
 memberProfileMarkup.includes('id="profile-avatar-file"')&&
 memberProfileMarkup.includes('id="profile-cover-file"')&&
 profileScript.includes('from("profile_media")')&&
 profileScript.includes('storage.from(bucketFor(kind)).upload(path,file')&&
 profileScript.includes('startAvatarEditor(fileAvatar.files[0])')&&profileAvatarScript.includes('uploadImage(photo,"avatar",sourceFile)')&&
 profileScript.includes('const bucketFor=kind=>kind==="avatar"?"avatars":"covers"')&&
 profileScript.includes('void startCoverEditor(fileCover.files[0])')&&
 profileCoverScript.includes('encodeProfileCrop(coverSource,rect,2000,580,"profile-cover",coverSourceMime)')&&
 profileCoverScript.includes('uploadImage(file,"cover",coverSourceFile)')&&
 !profileScript.includes('uploadImage(fileCover.files[0],"cover")')&&
 profileScript.includes('"avatars"')&&
 profileScript.includes('"covers"')&&
 feedScript.includes('storage.from("avatars")'),
 "Profile photos and cover images must be uploaded to their dedicated storage buckets");
assert.ok(profileScript.includes('const originalPath=originalExt?')&&
 profileScript.includes('upload(originalPath,originalFile')&&
 profileScript.includes('mediaImage.src=sourceUrl||url')&&
 profileScript.includes('!/-original\\.(?:jpe?g|png|webp)$/i.test')&&
 profileCoverScript.includes('coverPreviewCanvas.width=mobile?390:1000')&&
 memberCss.includes('aspect-ratio:2000/580'),
 "Profile media keeps full originals separate from selected avatar and 2000x580 cover thumbnails");
assert.ok(memberProfileMarkup.includes('id="profile-avatar-story-delete"')&&
 profileScript.includes('client.from("stories").delete()')&&
 profileScript.includes('deleteStoryButton.hidden=!hasStory||!isMine||!activeStory?.id;')&&
 !profileScript.includes('remove([previous])')&&
 !sharedCss.includes('border-radius:0 14px 14px 14px'),
 "Only the owner deletes a story; previous profile photos are preserved");
assert.ok(memberProfileMarkup.includes('id="profile-photo-footer"')&&
 memberProfileMarkup.includes('id="profile-photo-footer-more"')&&
 memberProfileMarkup.includes('id="profile-photo-tag-picker"')&&
 profileScript.includes('client.from("avatar_photo_tags")')&&
 profileScript.includes('out.toBlob(resolve,fileTypes[mime]?mime:"image/webp",.94)')&&
 memberCss.includes('.ui-profile-photo-footer-menu-001.is-open')&&
 (await read("assets/css/feed.css")).includes('body.feed-page .vatra-scroll-rail')&&
 scrollRailScript.includes('side.style.left=')&&
 !(await read("assets/js/network.js")).includes('.showModal()'),
 "Avatar photo viewer needs accessible footer, correct PNG/JPEG files and nonmodal Vatryk errors");

assert.ok(memberProfileMarkup.includes('id="profile-cover-viewer"')&&
 memberProfileMarkup.includes('id="profile-cover-viewer-image"')&&
 memberProfileMarkup.includes('id="profile-cover-viewer-stage"')&&
 profileScript.includes('const openCover=async()=>{')&&
  profileScript.includes('VATRA_FEATURES.load("cover-viewer")')&&
  profileCoverViewerScript.includes('const openCover=()=>{')&&
 profileScript.includes('coverView.addEventListener("click",()=>void openCover())')&&
 profileCoverViewerScript.includes('const flight=coverPhoto.cloneNode(false)')&&
 !profileScript.includes('openMedia("cover")')&&
 !memberCss.includes('.profile-media-viewer[data-kind="cover"]')&&
 memberCss.includes('aspect-ratio:2000 / 580')&&
 memberCss.includes('.ui-profile-cover-viewer-image-001'),
 "Cover uses an independent dark viewer and animates the existing 2000x580 thumbnail without avatar mode");

assert.ok(memberProfileMarkup.includes('id="profile-photo-deleted-notice"')&&
 memberProfileMarkup.includes('id="profile-photo-restore"')&&
 profileScript.includes('pendingAvatarUndo={path,previous')&&
 profileScript.includes('storage.download(path)')&&
 profileScript.includes('restoreAvatarButton.addEventListener("click"')&&
 memberCss.includes('.profile-media-viewer.is-photo-deleted')&&
 memberCss.includes('.ui-profile-photo-deleted-notice-001')&&
 !memberCss.includes('profile-media-viewer-stage{background:#fff}')&&
 memberCss.includes('padding:48px 68px 8px')&&
 memberProfileMarkup.indexOf('id="profile-avatar-prev"')<memberProfileMarkup.indexOf('id="profile-photo-footer"'),
 "Avatar deletions preserve a restorable backup and chevrons stay outside the image");

const photoReportMigration=await read("_development/supabase/migrations/20261121081853_add_specific_avatar_photo_reports.sql");
const photoReportNotNull=await read("_development/supabase/migrations/20261121082718_require_path_for_specific_avatar_reports.sql");
assert.ok(memberProfileMarkup.includes('id="profile-photo-report"')&&
 profileScript.includes('window.VATRA_REPORT_PROFILE_PHOTO=path')&&
 profileScript.includes('category="specific_photo"')&&
 profileScript.includes('photo_path:photoPath')&&
 !memberProfileMarkup.includes('id="profile-photo-footer-tag"')&&
 !profileScript.includes('footerTag.addEventListener("click"')&&
 memberCss.includes('object-fit:contain')&&
 photoReportMigration.includes("profile_reports_photo_reference_check")&&
 photoReportMigration.includes("profile_reports_unique_target_reason_photo")&&
 photoReportNotNull.includes("photo_path IS NOT NULL"),
 "Avatar gallery labels and secure per-photo moderation reporting must remain available");

assert.ok(
 memberCss.includes('body.profile-page .profile-media-viewer[open]{\n display:grid;grid-template-columns:minmax(0,1fr) clamp(318px,25vw,415px)')&&
 systemFeedCss.includes('width:100vw;height:100dvh;')&&
 systemFeedCss.includes('.vatra-post-media-caption-001{')&&
 profileScript.includes('lastAvatarCommentKey=key;')&&
 profileScript.includes('commentList.replaceChildren(...fresh,...older)')&&
 profileScript.includes('const avatarCommentPages=new Map()')&&
 interactionsScript.includes('entries.replaceChildren(...fresh,...remaining)')&&
 interactionsScript.includes('void loadComments(true,true)')&&
 feedScript.includes('const previousFeed=keepExisting?[...visibleFeed]:null;')&&
 feedScript.includes('if(reset){posts.replaceChildren(batch);lastFeedScope=scope;}')&&
 feedScript.includes('else posts.append(batch);')&&
 feedScript.includes('const keepExisting=reset&&scope===lastFeedScope')&&
 !interactionsScript.includes('vatra-post-audience-hint-001')&&
 !systemFeedCss.includes('.feed-post-audience:hover .vatra-post-audience-hint-001'),
 "All profile/post photos share a fullscreen workspace, cached comments reconcile without flashes and audience markers have no hover");
 
assert.ok(
 profileScript.includes('rows.length?await window.VATRA_FEATURES.load("avatar-comment-row"):null')&&
 avatarCommentRowScript.includes('client.from("avatar_comment_likes").insert(')&&
 avatarCommentRowScript.includes('client.from("avatar_comments").delete()')&&
 avatarCommentRowScript.includes('.eq("id",item.id).eq("author_id",userId).select("id").maybeSingle()')&&
 avatarCommentRowScript.includes('String(item.author_vatra_id)===String(ownId)'),
 "Lazy avatar comment cards must retain own-comment deletion and reaction guards"
);
const feedPhotoActions=await read("assets/js/post-interactions.js");
const photoLikeGlyph='M8 10.5 12.3 3c.6-1 2.1-.6 2.1.8v4.7h4.3a2.8 2.8 0 0 1 2.7 3.4l-1.6 6.7a2.8 2.8 0 0 1-2.7 2.1H8V10.5ZM3 10.5h5v10H3z';
const photoShareGlyph='M13 5l7 7-7 7v-4.3c-5 0-8.4 1.7-10 4.3.3-7 3.4-10.8 10-10.8V5Z';
assert.ok(feedPhotoActions.includes(photoLikeGlyph)&&feedPhotoActions.includes(photoShareGlyph)&&
 memberProfileMarkup.includes(photoLikeGlyph)&&memberProfileMarkup.includes(photoShareGlyph)&&
 !memberProfileMarkup.includes('id="profile-photo-comments-heading"')&&
 !profileScript.includes('q("#profile-photo-comments-heading")')&&
 profileScript.includes('Math.min(roomW/mediaImage.naturalWidth,roomH/mediaImage.naturalHeight)')&&
 !profileScript.includes('Math.min(1,roomW*.84/')&&
 memberCss.includes('.profile-photo-comments.is-empty{display:flex;align-items:center;justify-content:center'),
 "Photo viewer uses original VATRA feed like/share SVGs, no comments heading, and uncropped responsive photo scaling");
assert.ok(memberProfileMarkup.includes('id="profile-avatar-engagement"')&&
 memberProfileMarkup.includes('id="profile-photo-like"')&&
 memberProfileMarkup.includes('id="profile-photo-comments"')&&
 memberProfileMarkup.includes('id="profile-photo-share"')&&
 profileScript.includes('from("avatar_likes")')&&
 profileScript.includes('from("avatar_comments")')&&
 profileScript.includes('if(kind!=="avatar"||!canViewPhoto)return;')&&
 !memberCss.includes('body.profile-page .profile-photo-comments::-webkit-scrollbar-thumb')&&
 css.includes(".profile-photo-comments")&&
 memberCss.includes('body.profile-page .ui-profile-cover-viewer-001::backdrop')&&
 memberCss.includes('body.profile-page.feed-page:not(.community-page) .profile-posts-section{'),
 "Original avatar viewer needs real likes/comments/share and matching Feed posts; cover viewer does not");
assert.ok(["feed.html","profile.html","communities.html","club.html"].every(Boolean)&&
 ["feed.html","profile.html","communities.html","club.html"].length===4,
 "Signed-in skeleton route list must remain stable");
for(const page of ["feed.html","profile.html","communities.html","club.html"]){
 const html=await read(page);
 assert.ok(html.includes('class="vatra-route-skeleton ui-vatra-route-skeleton-001"'),
  page+": use page-shaped skeleton instead of a recurring fullscreen logo");
}
const errorPage=await read("404.html");
// The GitHub Pages /idN and /clubN fallback uses the external router and real VATRA splash
// while fetching the route document in BOTH Ukrainian and English.
assert.ok(legacyScript.includes('classList.add("vatra-dynamic-route-pending")')&&
 errorPage.includes('id="vatra-dynamic-route-loading"')&&
 errorPage.includes('vatra-auth-loading-symbol ui-404-route-loading-symbol-001')&&
 !errorPage.includes('document.documentElement.style.visibility="hidden"')&&
 css.includes("html.vatra-dynamic-route-pending body > .vatra-route-loading{visibility:visible!important}")&&
 lang.includes('classList.contains("vatra-dynamic-route-pending")'),
 "A canonical profile or club route must never show a blank screen while loading");

assert.equal(uk.__pages["404"].meta.title,"Сторінку не знайдено");
assert.equal(en.__pages["404"].meta.title,"Page not found");
assert.ok(errorPage.includes("<title>"+uk.__pages["404"].meta.title+"</title>"),
 "404 HTML fallback must match the Ukrainian translation");
assert.ok(lang.includes('"404":'+JSON.stringify(en.__pages["404"].meta.title)),
 "404 immediate English tab title must match the translated value");
assert.ok(lang.includes('instantEnglishTitles[segment]||instantEnglishTitles["404"]'),
 "Unknown URL must immediately use the English 404 title");
assert.ok(auth.includes('dialog?.addEventListener("close",()=>removeTooltip?.suppress())')&&
 auth.includes('removeTooltip?.suppress();')&&
 auth.includes('if(suppressRestore||event?.pointerType==="touch"'),
 "Cancelling the saved-account removal dialog must not show a focus-restored tooltip");
assert.ok(errorPage.includes('class="error-home-link vatra-404-link-002"')&&
 errorPage.includes('class="ui-404-vatryk-001" aria-hidden="true"')&&
 notFoundCss.includes('background-image:url("/VATRA/assets/vatryk/vatryk_detective.webp")')&&
 errorPage.includes('class="vatra-404-accessible-title-001"')&&
 errorPage.includes('href="/VATRA/" class="error-home-link vatra-404-link-002"')&&
 errorPage.includes("Такої сторінки немає")&&
 !errorPage.includes('class="account-card error-card')&&
 !errorPage.includes('class="error-code')&&
 !errorPage.includes('class="error-description')&&
 !errorPage.includes('class="action primary error-action'),
 "404 must center Vatryk, a localized visible message and the return action");
assert.ok(notFoundCss.includes(".error-home-link:hover{")&&
 notFoundCss.includes("color:#fff;text-decoration:none}")&&
 notFoundCss.includes("flex-direction:column;gap:16px")&&
 notFoundCss.includes(".error-main .ui-404-vatryk-001"),
 "404 centered mascot and single return link must remain aligned");
for(const name of ["terms","privacy","cookies"]){
 const html=await read(name+".html");
 const dictionary=uk.__pages[name];
 const revision=Object.values(dictionary.nodes)
  .flatMap(node=>Object.values(node.text||{}))
  .find(text=>/^Оновлено \d{1,2} [^\n]+ 2026 року$/.test(text));
 assert.ok(revision&&html.includes(revision),
  name+": legal revision must match its published translation");
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
await assert.rejects(stat("account.html"),{code:"ENOENT"},
 "Retired account.html must be deleted; profile and verify replace its responsibilities");
assert.ok(errorPage.includes('data-page="not-found"')&&errorPage.includes("error-home-link"),"404 page must stay an error, not a profile");
assert.ok(errorPage.includes('href="/VATRA/"')&&!/<(?:header|footer)\b/i.test(errorPage),
 "GitHub Pages 404 must work at nested missing URLs");
assert.ok(legacyScript.includes("location.replace(target+location.search+location.hash)"),
 "Old localized links should redirect to unified URLs");
assert.ok(!/profile\.js|data-page="public-profile"|supabase-js/.test(errorPage),"404 must not load private account logic");
for(const name of emailNames){
 const email=await read("_development/email-templates/"+name+".html");
 assert.ok(email.includes('.Data.preferred_locale'),"Email "+name+" loses UA/EN language choice");
 assert.ok(!/https:\/\/mykolakolisnyk\.github\.io\/VATRA\/(?:ua|en)\//.test(email),
  "Email "+name+" links must use root routes");
}
assert.ok(!/\/VATRA\/(?:ua|en)\//.test(await read("sitemap.xml")),"Old locale sitemap routes remain");
const obsolete=pages.flatMap(page=>["ua/"+page+".html","en/"+page+".html"]);
for(const file of obsolete)await assert.rejects(stat(file),{code:"ENOENT"},"Duplicate localized page must be removed: "+file);
console.log("VATRA: "+pages.length+" root pages, "+total+" unique UI classes, 2 JSON locales, auth, CAPTCHA and offline verified.");

// The elevated card shells must stay still; only their contents reveal.
assert.ok(css.includes('.site .saved-account-content.is-revealing{animation:vatraAuthReveal')&&
 css.includes(':is(.account-card,.error-card) > :not([hidden]){animation:vatraAuthReveal')&&
 legalCss.includes('.policy-header,.policy-section > :not([hidden]),.policy-toc > :not([hidden]){animation:vatraAuthReveal')&&
 !legalCss.includes('padding:34px 0 74px;flex:1'),
 "Cards must stay still and legal footer spacing must remain balanced");

// Regressions: a single inner block must animate on both saved-account phases.
assert.ok(landing.includes('id="saved-account-content" class="saved-account-content ui-home-saved-content-001 is-revealing"')&&
 auth.includes('const revealSavedContents=()=>{')&&
 auth.includes('content.classList.remove("is-revealing")')&&
 auth.includes('content.classList.add("is-revealing")')&&
 css.includes('.signup-overline-labels{display:flex;align-items:center;flex-wrap:wrap;gap:7px 12px;min-width:0}')&&
 css.includes('.signup-form-head{margin-bottom:25px}')&&
 css.includes('margin-bottom:26px}'),
 "Saved account must reveal its whole contents; signup must keep its intended spacing");

// Policy pages use the same edge-to-footer spacing as VATRA auth views.
assert.ok(legalCss.includes('.policy-main{padding:32px 0 32px}')&&
 !legalCss.includes('.policy-main{padding:25px 0 48px}')&&
 !legalCss.includes('padding:34px 0 34px;flex:1'),
 "Policy documents must share desktop/mobile section spacing with auth pages");

// One VATRA footer line and compact signup eyebrow on both form routes.
assert.ok(landing.includes('class="vatra-home-link-08"')&&
 register.includes('class="vatra-create-account-footer-signin"')&&
 !css.includes('footer-auth-action')&&
 register.indexOf('<div class="signup-overline-labels')<register.indexOf('<nav class="create-account-back-nav')&&
 !css.includes('position:absolute;\n    top:clamp(16px,1.6vw,25px)')&&
 legalCss.includes('.policy-page .footer{min-height:70px;padding-inline:0}'),
 "Auth footer CTA slots and legal footer height must match; signup nav belongs beside the brand kicker");

// Persistent regression: no duplicate stylesheet variants, and saved-login
// navigation occupies the top action row rather than a trailing form row.
const cssFiles=await readdir("assets/css");
assert.deepEqual(cssFiles.sort(),["admin.css","base.css","clips.css","communities.css","core.css","create-account.css","feed.css","friends.css","gifts.css","guest-view.css","legal.css","maintenance.css","marketplace.css","not-found.css","offline.css","onboarding.css","photo-albums.css","post-composer.css","profile.css","recovery.css","settings.css","sign-in.css","story-editor.css","verify.css"],"VATRA must keep only canonical family styles, never style2/fix copies");
const javascriptFiles=await readdir("assets/js");
assert.ok([...cssFiles,...javascriptFiles].every(file=>!/style(?:v[0-9]+|fix)|(?:old|backup|copy)\.(?:css|js)$/i.test(file)),
 "No shadow styles, fixes, backups or duplicate JS/CSS variants may coexist");
const consolidatedFeed=await read("assets/css/feed.css");
assert.ok( consolidatedFeed.includes('width:50px;height:50px;')&&
 !consolidatedFeed.includes('width:var(--vatra-rail-width')&&
 consolidatedFeed.includes('bottom:-1px;left:13px;right:13px;z-index:2;')&&
 consolidatedFeed.includes('height:3px;border-radius:3px 3px 0 0;background:var(--vatra-action-ink)')&&
 consolidatedFeed.includes('padding:12px 0;border:0;border-radius:0;background:transparent;box-shadow:none')&&
 !consolidatedFeed.includes('.feed-account-toggle .feed-header-avatar{')&&
 scrollRailScript.includes('side.style.left=')&&
 scrollRailScript.includes('side.hidden=window.scrollY<350'),
 "One compact social header, no overlapping rail styles and no boxed AdSense placeholder");
const routerScript=await read("assets/js/not-found.js");
const languageScript=await read("assets/js/lang.js");
assert.ok(routerScript.includes('const staticPage=location.pathname.match(')&&
 routerScript.includes('|notifications|friends|gifts|clips|marketplace|vatra-id|club|create-account|')&&
 languageScript.includes('feed|profile|friends|gifts|communities|notifications|clips|marketplace|vatra-id|club|verify')&&
 (await read("assets/js/social-shell.js")).includes('new URL("friends",')&&
 !(await read("assets/js/profile.js")).includes('new URL("friends.html"')&&
 !(await read("assets/js/notifications.js")).includes('new URL("notifications.html"'),
 "All VATRA member areas and outbound navigation use canonical extensionless routes");
assert.ok(landing.includes('id="saved-account-return" class="saved-account-return vatra-home-saved-return-001" data-i18n="n508" hidden')&&
 landing.indexOf('id="saved-account-return"')>landing.indexOf('class="saved-account-top')&&
 landing.indexOf('id="saved-account-return"')<landing.indexOf('id="saved-account-remove"')&&
 !landing.includes('id="saved-account-return" class="saved-account-return vatra-home-saved-return-001" data-i18n="n508">')&&
 css.includes('.site .saved-account-return:hover,.site .saved-account-return:focus-visible{color:var(--blue);transform:translateX(-2px)')&&
 css.includes('min-height:151px;width:100%')&&
 auth.includes('returnButton.hidden=true')&&auth.includes('returnButton.hidden=false')&&
 auth.includes('Не вдалося увійти. Перевірте пароль.')&&
 en["Не вдалося увійти. Перевірте пароль."]==="Could not sign in. Check your password.",
 "Saved account must have a top-left return control, equal state heights and localized password guidance");
assert.ok(css.includes('.signup-progress-segment:first-child')&&
 css.includes('background:linear-gradient(90deg,#2c70e8,#8759e5)')&&
 !register.includes('data-step-label=')&&!css.includes('.signup-step-number{')&&
 !css.includes('min-width:148px')&&!css.includes('min-width:132px'),
 "Signup keeps the accessible progress bar without redundant step text; footer links retain natural widths");

// The remembered account note is exclusive to the overview, without changing
// the card height; all footer link touch targets use the shared stylesheet.
assert.ok(css.includes('.site[data-saved-login="password"] .saved-account-note{visibility:hidden}')&&
 css.includes('.footer nav a{display:inline-flex;align-items:center;min-height:40px}')&&
 !legalCss.includes('.policy-page .footer nav a{min-height:40px}')&&
 auth.includes('document.body.dataset.savedLogin="overview"')&&
 auth.includes('document.body.dataset.savedLogin="password"'),
 "Saved-account explanation must be visible only on overview, with uniform footer link spacing");

// Staged pages animate their SINGLE content layer. No card shell, logo or
// individual field should have a competing stage entrance animation.
assert.ok(auth.includes('function replayAuthContent(node)')&&
 auth.includes('node.style.animation="none"')&&auth.includes('node.style.removeProperty("animation")')&&
 auth.includes('if(animate)replayAuthContent(q(".signup-form-panel .narrow-form"));')&&
 auth.includes('replayAuthContent(q(".forgot-panel-content"));')&&
 css.includes('.signup-confirmation{display:grid;justify-items:center;align-content:center;gap:0;width:100%;max-width:520px;margin:0 auto;text-align:center;animation:vatraAuthReveal')&&
 !css.includes('.signup-confirmation > :not([hidden]){animation:vatraAuthReveal')&&
 !css.includes('.create-account-page[data-registration-step="2"] .signup-step[data-create-account-step="2"]:not([hidden]){animation:')&&
 !css.includes('.ui-forgot-main-001 .forgot-panel #recovery-step:not([hidden]) > :not([hidden]){animation:'),
 "Registration, confirmation and password recovery must reveal whole content blocks");
const resetNew=await read("reset.html");
assert.ok(forgot.includes('id="account-link" href="./" class="action primary full recovery-success-action vatra-forgot-link-08"')&&
 resetNew.includes('id="recovery-success-link" class="form-note recovery-success-row vatra-reset-paragraph-03" hidden')&&
 resetNew.includes('id="account-link" href="./" class="action primary full recovery-success-action vatra-reset-link-03" hidden')&&
 css.includes('.ui-forgot-main-001 .forgot-panel .recovery-success-action{display:flex;align-items:center;justify-content:center;width:100%;min-height:56px')&&
 css.includes('.ui-forgot-main-001 .forgot-panel .vatra-input-shell:is(.is-floating,:focus-within) .control{padding-top:21px;padding-bottom:7px}'),
 "Both recovery paths need identical accessible password fields and full-width success CTA");


assert.ok(
 authRecovery.includes('if(repeat)feedback("Якщо акаунт існує')&&
 !authRecovery.includes('"Якщо акаунт із такою адресою існує, лист із кодом надіслано. Введіть код нижче."'),
 "Initial recovery email must reveal the code step without a redundant green notice");
assert.ok(
 profileScript.includes('document.title=titleName;')&&
 socialMotion.includes('const eligible=target=>')&&
 socialMotion.includes('feed|profile|friends|gifts|communities|notifications|')&&
 !socialMotion.includes('new URL(ownProfile?"profile.html":"club.html"')&&
 !socialMotion.includes('searchParams.set("vatra_id"')&&
 !profileScript.includes('query.get("vatra_id")')&&
 (await read("assets/js/notifications.js")).includes('if(!window.VATRA_NAVIGATE?.to(link.href))'),
 "Member titles and direct /idN routing must never generate query-style profile URLs");

/* English dictionaries are asynchronous: no UI reveal may finish while the
   translated page is hidden. This applies to 404, documents and all auth UIs.
   The authentication splash itself keeps animating during loading. */
assert.ok(lang.includes('html.i18n-pending body{visibility:hidden!important}')&&
 lang.includes('html.i18n-pending body > :not(.vatra-auth-loading)')&&
 lang.includes('{animation-play-state:paused!important}')&&
 css.includes('body:has(> #vatra-auth-loading):not([data-auth-ready="true"]) > :not(#vatra-auth-loading)')&&
 css.includes('body[data-auth-ready="true"]>.vatra-auth-loading{display:none!important}')&&
 css.includes('@keyframes vatraAuthReveal'),
 "Entrance animations must pause until English translations and auth readiness, without freezing loading splash");

// The OTP verification client must be temporary: it may authorize a password
// update, but must not sign the visitor into VATRA if recovery is abandoned.
assert.ok(auth.includes('persistSession:page!=="reset"&&page!=="forgot"')&&
 auth.includes('autoRefreshToken:page!=="reset"&&page!=="forgot"')&&
 auth.includes('detectSessionInUrl:page!=="forgot"')&&
 auth.includes('recoveryVerifiedUserId=null;')&&
 auth.includes('await auth.auth.signOut?.({scope:"local"})')&&
 !forgot.includes('id="account-link" href="account.html"')&&
 !resetNew.includes('id="account-link" href="account.html"')&&
 en.__pages.forgot.nodes.n44.text["0"]==="Sign in with your new password"&&
 uk.__pages.reset.nodes.n34.text["0"]==="Увійти з новим паролем",
 "Recovery authentication must be session-isolated, explicitly released, and lead to password sign-in");
for(const name of pages){
 const enTitle=en.__pages[name]?.meta?.title;
 if(!enTitle)continue;
 assert.ok(lang.includes((/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)?name:JSON.stringify(name))+":"+JSON.stringify(enTitle)),
  "An English browser tab title must be available synchronously for "+name);
}
assert.ok(lang.includes('new MutationObserver(applyTitle)')&&
 lang.includes('observer.disconnect()')&&
 lang.includes('document.head.querySelector("title")'),
 "English tab titles should never briefly show Ukrainian during async translation");

/* Cache regression: public display names only, fail-closed auth and direct
   RLS fallback. Scripts must load before authors are rendered. */
const publicNameBrowser=await read("assets/js/public-name-cache.js");
const publicNameEdge=await read("_development/supabase/functions/public-profile-names/index.ts");
assert.doesNotThrow(()=>new Function(publicNameBrowser),
 "Shared public-name cache must parse in supported browsers");
assert.ok(
 publicNameBrowser.includes('window.VATRA_PUBLIC_NAMES={get,bindViewer}')&&
 publicNameBrowser.includes('client.functions.invoke("public-profile-names"')&&
 publicNameBrowser.includes('pauseEdge(state);')&&
 publicNameBrowser.includes('sessionStorage.setItem(EDGE_COOLDOWN_KEY')&&
 publicNameBrowser.includes('const caches=new WeakMap()')&&
 publicNameBrowser.includes('MISSING_TTL=15_000')&&
 publicNameBrowser.includes('state.pending.set(id,task)')&&
 publicNameBrowser.includes('state.rows.clear()')&&
 publicNameBrowser.includes('if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;')&&
 !publicNameBrowser.includes('const memory=new Map(),inflight=new Map()')&&
 publicNameBrowser.includes('client.from("public_profiles")')&&
 publicNameEdge.includes('client.auth.getUser(token)')&&
 publicNameEdge.includes('client.from("public_profiles")')&&
 publicNameEdge.includes('const TTL_SECONDS = 120')&&
 publicNameEdge.includes('if (!cache) return reply([], "disabled", 503)')&&
 !publicNameEdge.includes('SERVICE_ROLE_KEY'),
 "Redis public-name cache must authenticate, respect RLS and fail safely");
for(const publicNamePage of ["feed","profile","communities","club","notifications","friends","gifts"]){
 const html=await read(publicNamePage+".html");
 const cachePos=html.indexOf('assets/js/public-name-cache.js');
 const avatarPos=html.indexOf('assets/js/avatar.js');
 const interactionsPos=html.indexOf('assets/js/post-interactions.js');
 const notificationsPos=html.indexOf('assets/js/notifications.js');
 assert.ok(cachePos>avatarPos && avatarPos>=0 &&
  (interactionsPos===-1||cachePos<interactionsPos) &&
  (notificationsPos===-1||cachePos<notificationsPos),
  "Public-name cache must load before member data on "+publicNamePage);
}
for(const path of ["assets/js/feed.js","assets/js/post-interactions.js",
 "assets/js/notifications.js","assets/js/profile.js","assets/js/club.js"]){
 assert.ok((await read(path)).includes("window.VATRA_PUBLIC_NAMES?.get(client,"),
  "Public-name lookups must use the shared cache in "+path);
}
await import("../smoke/public-cache-smoke.mjs");

/* Viewer-specific engagement is cached only for 3 seconds in this browser,
   never shared with Redis; all four local mutations invalidate it. */
const engagementCacheController=await read("assets/js/post-interactions.js");
assert.ok(
 engagementCacheController.includes("const engagementQueryCache=new WeakMap()")&&
 engagementCacheController.includes("ENGAGEMENT_TTL_MS=3_000")&&
 engagementCacheController.includes("ENGAGEMENT_MAX_PAGES=16")&&
 engagementCacheController.includes('p_posts:requested.slice(i,i+24)')&&
 (engagementCacheController.match(/invalidateEngagement\(client\);/g)||[]).length>=4,
 "Viewer engagement cache must remain bounded, batched and invalidated after writes");
await import("../smoke/engagement-cache-smoke.mjs");

/* Re-ranked paged comments: SQL query must count each comment's likes once
   and precompute current-viewer friend IDs, without bypassing RLS. */
const commentThreadSqlOptimization=await read(
 "_development/supabase/migrations/20261113185828_optimize_comment_thread_friend_and_like_counts.sql");
assert.ok(
 commentThreadSqlOptimization.includes("WITH friend_ids AS MATERIALIZED")&&
 commentThreadSqlOptimization.includes("LEFT JOIN LATERAL (")&&
 commentThreadSqlOptimization.includes("WHERE cl.comment_id = c.id")&&
 commentThreadSqlOptimization.includes("FROM public.friendships f")&&
 commentThreadSqlOptimization.includes("FROM public.post_comments c")&&
 commentThreadSqlOptimization.includes("LANGUAGE sql")&&
 !commentThreadSqlOptimization.includes("SECURITY DEFINER")&&
 (commentThreadSqlOptimization.match(/count\(\*\)::bigint/g)||[]).length===1,
 "RLS-secured comment pages must precompute friends and count likes once");

/* Single-club metadata joins the Redis catalog: cache only the public,
   explicitly selected columns; preserve the directory GET contract. */
assert.ok(
 publicRedisEdge.includes('const cacheKey = clubId === null ? CACHE_KEY')&&
 publicRedisEdge.includes('request.method !== "GET" && request.method !== "POST"')&&
 publicRedisEdge.includes('Number.isSafeInteger(record.club_id)')&&
 publicRedisEdge.includes('.eq("club_id", clubId).maybeSingle()')&&
 publicRedisEdge.includes('validateCommunity(parsed) && parsed.club_id === clubId')&&
 clubRuntime.includes('client.functions.invoke("public-community-directory",{')&&
 clubRuntime.includes('body:{club_id:numeric}')&&
 clubRuntime.includes('return client.from("communities")')&&
 (await read("_development/docs/redis-cache-policy.md")).includes("Single public community details"),
 "Community detail cache must be public-only and always fall back to PostgREST");
await import("../smoke/community-detail-cache-smoke.mjs");
await import("../smoke/community-category-smoke.mjs");

/* Off-screen batch DOM rendering avoids repeated list-level mutations. */
const batchedFeedPosts=await read("assets/js/feed.js");
const batchedProfilePosts=await read("assets/js/profile.js");
const batchedClubPosts=clubRuntime;
assert.ok(
 batchedFeedPosts.includes("batch.append(same&&oldElement?oldElement:recoverFeedCard(item,engagement))")&&
 batchedFeedPosts.includes("if(reset){posts.replaceChildren(batch);lastFeedScope=scope;}")&&
 batchedFeedPosts.includes("else posts.append(batch);")&&
 batchedFeedPosts.includes("const keepExisting=reset&&scope===lastFeedScope")&&
 batchedProfilePosts.includes("batch.append(article);")&&
 batchedProfilePosts.includes("if(append)list.append(batch);else list.replaceChildren(batch);")&&
 batchedClubPosts.includes("const batch=document.createDocumentFragment();")&&
 batchedClubPosts.includes("batch.append(article);")&&
 batchedClubPosts.includes("list.append(batch);"),
 "Feed, profile and club post pages must attach all cards in a single batch");

/* Legacy Table Editor entries were RLS-invoker views, not physical tables.
   Storage bucket renames must preserve role-specific policies and MIME/size
   limits; the active browser must use only canonical bucket IDs. */
const legacyViewCleanup=await read("_development/supabase/migrations/20261113195057_remove_legacy_vatra_compatibility_views.sql");
const storageBucketCleanup=await read("_development/supabase/migrations/20261113195123_prepare_clean_vatra_storage_bucket_ids_and_rls.sql");
assert.ok((legacyViewCleanup.match(/DROP VIEW IF EXISTS public\.vatra_/g)||[]).length===21&&
 !legacyViewCleanup.includes("CASCADE")&&
 storageBucketCleanup.includes("INSERT INTO storage.buckets(")&&
 storageBucketCleanup.includes("JOIN storage.buckets b ON b.id=m.old_id")&&
 storageBucketCleanup.includes("pg_policies")&&
 storageBucketCleanup.includes("WITH CHECK")&&
 storageBucketCleanup.includes("USING")&&
 !storageBucketCleanup.includes("DELETE FROM storage.objects")&&
 !storageBucketCleanup.includes("UPDATE storage.objects"),
 "Legacy views can be removed independently; clean Storage buckets must preserve owner-only RLS");
for(const source of ["assets/js/avatar.js","assets/js/post-media.js","assets/js/post-interactions.js",
 "assets/js/feed.js","assets/js/profile.js","assets/js/communities.js","assets/js/club.js","assets/js/community-core.js",
 "assets/js/friends.js","assets/js/notifications.js"]){
 const contents=await read(source);
 for(const oldBucket of ["vatra-avatars","vatra-covers","vatra-post-images","vatra-videos"])
  assert.ok(!contents.includes(oldBucket),source+" must not use an old Storage bucket");
}
assert.ok((await read("assets/js/post-media.js")).includes('"post-images"')&&
 (await read("assets/js/profile.js")).includes('"avatars"')&&
 (await read("assets/js/profile.js")).includes('"covers"')&&
 (await read("assets/js/post-media.js")).includes('"videos"'),
 "New uploads and signed URL creation must use canonical bucket IDs");

/* Signed Storage URLs are bearer capabilities. Never keep a global map
   across Supabase clients or reuse a former session's in-flight response. */
assert.ok(
 postMediaScript.includes("const signedURLCaches=new WeakMap()")&&
 postMediaScript.includes("client.auth?.onAuthStateChange")&&
 postMediaScript.includes("state.version++")&&
 postMediaScript.includes("state.signedURLs.clear()")&&
 postMediaScript.includes('throw Error("Session changed while signing media")')&&
 postMediaScript.includes("state.version!==version")&&
 !postMediaScript.includes("const signedURLs=new Map();"),
 "Private signed Storage URLs must be isolated per client and invalidated on auth changes");
await import("../smoke/media-signed-cache-smoke.mjs");

/* The shared live-search results contain RLS-scoped posts. Cache only in
   bounded viewer-local memory; never persist or share them via Redis. */
const liveSearchCacheScript=await read("assets/js/notifications.js");
assert.ok(
 liveSearchCacheScript.includes("const SITE_SEARCH_TTL_MS=8_000,SITE_SEARCH_MAX=24")&&
 liveSearchCacheScript.includes("const siteSearchCaches=new WeakMap()")&&
 liveSearchCacheScript.includes('state.entries.clear()')&&
 liveSearchCacheScript.includes('if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;')&&
 liveSearchCacheScript.includes("if(state.generation!==generation)return emptySiteSearch();")&&
 liveSearchCacheScript.includes('viewer.rpc("search_site",{p_query:phrase,p_limit:20})')&&
 liveSearchCacheScript.includes("if(cacheable&&!entry.controller.signal.aborted)")&&
 liveSearchCacheScript.includes("data[key].slice(0,20)")&&
 !liveSearchCacheScript.includes("site-search-redis"),
 "Site-wide live search must remain RLS-gated, session-scoped and bounded");
const siteSearchSQL=await read("_development/supabase/search-site.sql");
assert.ok(siteSearchSQL.includes("security invoker")&&
 siteSearchSQL.includes("from public.feed_posts")&&
 siteSearchSQL.includes("from public.community_posts")&&
 siteSearchSQL.includes("f.visibility='public'")&&
 siteSearchSQL.includes("m.moderation_status='approved'")&&
 siteSearchSQL.includes("not public.vatra_has_block_between(m.seller_vatra_id)")&&
 siteSearchSQL.includes("revoke all on function public.search_site(text,integer) from public,anon;")&&
 siteSearchSQL.includes("grant execute on function public.search_site(text,integer) to authenticated;"),
 "Server search must keep RLS, public posts, approved listings and authenticated access");
await import("../smoke/live-search-cache-smoke.mjs");

/* Friend stories share the Feed's social graph; don't query all stories while
   waiting for friendships or when the viewer has no friends. */
const feedStoryOptimization=await read("assets/js/feed.js");
assert.ok(
 feedStoryOptimization.includes("let subscriptionsLoadedAt=0,subscriptionsInflight=null")&&
 feedStoryOptimization.includes("function ensureSubscriptions()")&&
 feedStoryOptimization.includes("if(subscriptionsInflight)return subscriptionsInflight;")&&
 feedStoryOptimization.includes("await ensureSubscriptions();")&&
 feedStoryOptimization.includes('if(!friendIds.length){')&&
 feedStoryOptimization.includes('query=query.in("author_vatra_id",friendIds)')&&
 !feedStoryOptimization.includes('await loadSubscriptions();subscriptionsLoadedAt=Date.now();'),
 "Feed and friend stories must share their RLS-scoped subscription snapshot");
await import("../smoke/feed-story-subscriptions-smoke.mjs");

await import("../smoke/section-loading-smoke.mjs");
await import("../smoke/static-cache-smoke.mjs");
await import("../../tools/revision-assets.mjs");
const coreRuntime=await read("assets/js/core.js");
const marketplaceRuntime=await read("assets/js/marketplace.js");
const clipsRuntime=await read("assets/js/clips.js");
const settingsRuntime=await read("assets/js/settings.js");
const editorRuntime=await read("assets/js/marketplace-editor.js");
const clipComposerRuntime=await read("assets/js/clip-composer.js");
const sectionsRuntime=[marketplaceRuntime,editorRuntime,clipsRuntime,clipComposerRuntime,settingsRuntime,coreRuntime].join("\n");
const sectionsStyle=(await Promise.all(["core","marketplace","clips","settings","communities"].map(name=>read("assets/css/"+name+".css")))).join("\n");
for(const runtime of [coreRuntime,marketplaceRuntime,clipsRuntime,settingsRuntime,ownerAdminGuard])assert.doesNotThrow(()=>new Function(runtime));
for(const module of [editorRuntime,clipComposerRuntime,ownerAdminJs])assert.doesNotThrow(()=>new Function(module.replace(/^export /gm,"")));
for(const [section,stem] of [["clips","clips"],["marketplace","marketplace"],["vatra-id","settings"]]){
 const markup=await read(section+".html");
 assert.ok(markup.includes('data-page="'+section+'"')&&markup.includes('assets/js/core.js')&&markup.includes('assets/js/'+stem+'.js')&&markup.includes('assets/css/core.css')&&markup.includes('assets/css/'+stem+'.css'));
 for(const other of ["clips","marketplace","settings"].filter(name=>name!==stem)){
  assert.ok(!markup.includes('assets/js/'+other+'.js')&&!markup.includes('assets/css/'+other+'.css'),section+" must not load another section");
 }
 assert.ok(!markup.includes("sections.js")&&!markup.includes("sections.css")&&!markup.includes("marketplace-editor.js")&&!markup.includes("clip-composer.js"));
}
assert.ok(!clipsRuntime.includes("marketplace_listings")&&!settingsRuntime.includes("marketplace_listings")&&!marketplaceRuntime.includes('eq("is_clip",true)'));
assert.ok(marketplaceRuntime.includes("IntersectionObserver")&&marketplaceRuntime.includes("deferProductPhoto(row,photo)")&&marketplaceRuntime.includes("signedPhotos=new Map()")&&marketplaceRuntime.includes("signedPhotos.clear()"));
assert.ok(marketplaceRuntime.includes('import(new URL("assets/js/marketplace-editor.js?rev=')&&clipsRuntime.includes('import(new URL("assets/js/clip-composer.js?rev='));
await assert.rejects(stat("assets/js/sections.js"),{code:"ENOENT"});
await assert.rejects(stat("assets/css/sections.css"),{code:"ENOENT"});
assert.ok(sectionsRuntime.includes('eq("is_clip",true)')&&sectionsRuntime.includes('is_clip:true')&&sectionsRuntime.includes('marketplace_listings')&&sectionsRuntime.includes('verification_requests')&&sectionsRuntime.includes('client.auth.updateUser')&&sectionsStyle.includes('Onest'));
assert.ok(sectionsRuntime.includes('photo.multiple=true')&&sectionsRuntime.includes('image_paths:paths')&&sectionsRuntime.includes('photoPaths(row)')&&sectionsRuntime.includes('ui-vatra-market-sidebar-scroll-001')&&sectionsRuntime.includes('const marketLimit=10')&&sectionsRuntime.includes('ui-vatra-market-editor-preview-001')&&sectionsStyle.includes('ui-vatra-market-detail-thumbs-001'),
 "Marketplace uses independent sidebar scrolling, ten photos and live preview");
const marketCatalogSource=sectionsRuntime.slice(sectionsRuntime.indexOf("const categories="),sectionsRuntime.indexOf("const marketConditions="));
const marketCatalog=new Function('const t=(uk,en)=>uk;'+marketCatalogSource+';return {categories,marketTypes,marketTypeCategories,marketFieldKeys};')();
assert.equal(marketCatalog.marketTypes.length,5,"Five listing types must be available");
assert.equal(marketCatalog.categories.length,29,"All 29 marketplace categories must remain available");
assert.equal(marketCatalog.categories.reduce((total,entry)=>total+entry[4].length,0),127,"All subcategories must be available");
const mappedMarketCategories=marketCatalog.marketTypes.flatMap(([type])=>marketCatalog.marketTypeCategories(type).map(([id])=>id));
assert.deepEqual([...mappedMarketCategories].sort(),marketCatalog.categories.map(([id])=>id).sort(),"Each category must belong to exactly one listing type");
assert.deepEqual(marketCatalog.marketFieldKeys("vehicle","transport","cars"),["brand","model","year","mileage","fuel","transmission"]);
assert.deepEqual(marketCatalog.marketFieldKeys("rent","rentals","apartments"),["area","rooms","floor"]);
assert.ok(sectionsRuntime.includes('subcategory:subcat.value,details:collectDetails()')&&sectionsRuntime.includes('price.value="0";price.readOnly=true;'),"Listing must persist subcategories and details and prevent nonzero free prices");
const marketMoneySource=sectionsRuntime.slice(sectionsRuntime.indexOf("const marketCurrencies="),sectionsRuntime.indexOf("function marketCurrencySelect"));
const money=new Function(marketMoneySource+";return {marketAmount,marketMoneyText,marketMatchesPrice};")();
assert.equal(money.marketAmount("1 234,50"),1234.5);
assert.equal(money.marketAmount("1234.50"),1234.5);
assert.equal(money.marketAmount(""),null);
assert.ok(Number.isNaN(money.marketAmount("12,345")));
assert.ok(Number.isNaN(money.marketAmount("1000000000")));
assert.ok(Number.isNaN(money.marketAmount("-10")));
assert.ok(money.marketMoneyText(10,"UAH","uk").endsWith("₴"));
assert.ok(money.marketMoneyText(10,"USD","uk").endsWith("$"));
assert.ok(money.marketMoneyText(10,"EUR","uk").endsWith("€"));
assert.ok(!money.marketMatchesPrice({price:10,currency:"USD"},"UAH",0,20));
assert.ok(money.marketMatchesPrice({price:10,currency:"USD"},"USD",0,20));
assert.ok(money.marketMatchesPrice({price:10},"UAH",0,20));
assert.ok(money.marketMatchesPrice({price:10,currency:"EUR"},"all",null,null));
assert.ok(sectionsRuntime.includes("price:marketAmount(price.value),currency:currency.value")&&sectionsRuntime.includes("form.prepend(categoryGroup)")&&sectionsRuntime.includes("price,currency,city"),"Persist currency, read it back and show required category first");
assert.ok(sectionsRuntime.includes('rules_accepted:true')&&sectionsRuntime.includes('eq("moderation_status","approved")')&&ownerAdminJs.includes('pending:t("На перевірці"')&&ownerAdminJs.includes('.eq("moderation_status",kind)'),"Marketplace must submit for moderation and show only approved listings in the public catalog");
assert.ok(sectionsRuntime.includes('marketplace_cases')&&ownerAdminJs.includes('marketplace_moderators')&&sectionsRuntime.includes('marketplace_suspensions')&&ownerAdminJs.includes('marketplace_moderation_history'),"Moderation, appeals, reports, suspensions and history must use server records");
assert.ok(!marketplaceRuntime.includes("VATRA_OPEN_MARKET_MODERATION")&&!marketplaceRuntime.includes("marketplace_moderators")&&!marketplaceRuntime.includes("marketplace_moderation_history")&&!marketplaceRuntime.includes("modControls"),"Only ADMIN PANEL owns staff marketplace moderation");
assert.ok(ownerAdminJs.includes('client.rpc("vatra_admin_access")')&&ownerAdminJs.includes('from("marketplace_moderators")')&&ownerAdminJs.includes('from("marketplace_listings").update')&&ownerAdminJs.includes('from("marketplace_cases").update')&&ownerAdminJs.includes('from("marketplace_suspensions").insert')&&ownerAdminJs.includes('from("marketplace_moderation_history")')&&ownerAdminJs.includes('!ready||!check.checked'),"Owner moderation must check server roles and require manual photo review");
for(const file of ["business","business-bookings","business-brand","business-inbox","business-jobs","business-stores"])await assert.rejects(stat("assets/js/"+file+".js"),{code:"ENOENT"});
const moderationSQL=await read("_development/supabase/vatra-marketplace-moderation.sql");
const moderationMediaSQL=await read("_development/supabase/vatra-marketplace-moderation-media.sql");
assert.ok(moderationSQL.includes("VATRA_MARKET_MODERATOR_REQUIRED")&&moderationSQL.includes("VATRA_MARKET_SUSPENDED")&&moderationSQL.includes("moderation_status='approved'")&&moderationSQL.includes("enable row level security"));
assert.ok(moderationMediaSQL.includes("VATRA_MARKET_IMAGE_NOT_UPLOADED")&&moderationMediaSQL.includes("drop constraint vatra_market_cases_listing_id_fkey"),"Prevent image swaps and preserve complaints");



assert.ok(friendshipPrivacyJs.includes('stateFor(item)==="accepted"&&online(counterpart(item))')&&friendshipPrivacyJs.includes('from("profile_presence")'));

const publicFriendSQL=await read("_development/supabase/migrations/20261119121805_public_accepted_friends_lists.sql");assert.ok(publicFriendSQL.includes("status='accepted'")&&publicFriendSQL.includes("profile_visibility<>'public'")&&friendshipPrivacyJs.includes('query.eq("status","accepted")')&&friendshipPrivacyJs.includes('targetName'),"Public friend lists expose accepted relationships, never private profiles or pending requests");
const stickerCatalog=await read("assets/js/comment-picker.js");assert.ok(stickerCatalog.includes("canvas.toBlob")&&stickerCatalog.includes("image/webp")&&interactionsScript.includes("catalog.stickerFile(pack.id,index)")&&interactionsScript.includes("import(pickerURL)"),"One selected sticker must be an independently encoded WebP, loaded on demand");

assert.ok(memberProfileMarkup.includes('id="profile-avatar-plus"')&&memberProfileMarkup.includes('id="profile-cover-change"')&&memberProfileMarkup.includes('id="profile-avatar-crop-dialog"')&&memberProfileMarkup.includes('id="profile-avatar-finish-dialog"')&&profileAvatarScript.includes('visibility:"friends",media_items:uploaded')&&profileScript.includes('avatar_path:next')&&profileScript.includes('const removed=await storage.remove([path,...(fullBlob?[originalPath]:[])])')&&
 profileScript.includes('storage.upload(undo.path,undo.thumbnail'),"Owner-only media controls, crop/finish workflow and actual upload/removal must remain wired");

assert.ok(profileMarkup.includes('class="ui-profile-tab-row-001"')&&!profileMarkup.includes('ui-profile-status-pencil-icon-001')&&!profileMarkup.includes('ui-profile-edit-icon-001')&&profileMarkup.includes('class="ui-profile-name-row-001"')&&memberCss.includes('.ui-profile-name-row-001>.profile-edit-open')&&!memberCss.includes('.ui-profile-tab-row-001>.profile-edit-open'),"Profile editing belongs beside the name as a single styled text action");

assert.ok(memberProfileMarkup.includes('id="profile-cover-edit-dialog"')&&memberProfileMarkup.includes('id="profile-cover-preview-desktop"')&&memberProfileMarkup.includes('id="profile-cover-preview-mobile"')&&profileScript.includes('void startCoverEditor(fileCover.files[0])')&&profileCoverScript.includes('uploadImage(file,"cover",coverSourceFile)')&&!profileScript.includes('uploadImage(fileCover.files[0],"cover")'),"Cover selection requires crop and device preview before explicit saving");

for(const dirEntry of await readdir(".")){if(!dirEntry.endsWith(".html"))continue;const html=await read(dirEntry);assert.ok(!/<title>[^<]* · VATRA<\/title>/.test(html),dirEntry+": remove the redundant brand suffix from the browser tab");}
for(const file of await readdir("assets/i18n")){if(!file.endsWith(".json"))continue;const catalog=JSON.parse(await read("assets/i18n/"+file));assert.ok(Object.values(catalog.__pages||{}).every(page=>!page.meta?.title?.endsWith(" · VATRA")),file+": localized tab title must be suffix-free");}

await import("../smoke/maintenance-smoke.mjs");

await assert.rejects(stat("business.html"),{code:"ENOENT"});
assert.ok(!(await read("assets/js/club.js")).includes("setupCommunityBusiness")&&
 !(await read("assets/js/communities.js")).includes("business_enabled")&&
 !(await read("communities.html")).includes("community-business-enabled")&&
 !(await read("club.html")).includes("club-business-tools"),
 "Retired business tools must be absent from both community pages");
assert.ok(!(await read("assets/js/not-found.js")).includes("|marketplace|business|"),"Retired business route must not resolve");

const retiredActivitySQL=await read("_development/supabase/migrations/20261119131927_remove_retired_standalone_business_activity.sql");
assert.ok(retiredActivitySQL.includes("drop table public.business_posts;")&&retiredActivitySQL.includes("drop table public.business_followers;")&&retiredActivitySQL.includes("alter column club_id set not null")&&!/drop table[^;]*cascade/i.test(retiredActivitySQL),"Legacy business storage is removed safely and community linkage is mandatory");

await assert.rejects(stat("assets/css/business.css"),{code:"ENOENT"});
assert.ok(!communityBannerCSS.includes("vatra-business-page")&&!communityBannerCSS.includes("ui-club-business-tools-001"),"Retired business styles must be absent");
assert.ok(!(await read("assets/js/club.js")).includes("assets/css/business.css"),"Community tools must not fetch a retired stylesheet");
for(const asset of ["community-business","community-business-brand","community-business-bookings",
 "community-business-jobs","community-business-inbox","community-business-stores"]){
 await assert.rejects(stat("assets/js/"+asset+".js"),{code:"ENOENT"});
}
const businessResetSQL=await read("_development/supabase/migrations/20261120163311_reset_created_communities_retire_business_tools.sql");
assert.ok(businessResetSQL.includes("delete from public.communities;")&&
 businessResetSQL.includes("drop schema if exists business_private cascade;")&&
 businessResetSQL.includes("drop column if exists business_enabled;")&&
 businessResetSQL.includes("public.business_companies")&&
 !businessResetSQL.includes("drop table public.marketplace_listings"),
 "Community reset must retire business tables but preserve independent marketplace listings");

// Gallery, site settings and shared-account navigation regressions.
assert.ok(profileScript.includes('const photoPath=()=>["avatar","avatar-history"].includes(mediaDialog.dataset.kind)?gallery[galleryIndex]')&&profileScript.includes('interaction.hidden=false;activityTicket++')&&!memberCss.includes('body.profile-page .profile-media-viewer[data-kind="avatar-history"][open]{grid-template-columns:minmax(0,1fr)}'),"Historical avatars must retain their own panel");
assert.ok(settingsRuntime.includes('from("profile_preferences")')&&settingsRuntime.includes('from("member_blocks")')&&settingsRuntime.includes('vatra:notification-display:')&&settingsRuntime.includes('get("view")==="settings"'),"Settings must use existing profile and block records and browser-scoped notification filters");
const galleryMigration=await read("_development/supabase/migrations/20261119175800_allow_interactions_on_existing_avatar_gallery_images.sql");
assert.ok(galleryMigration.includes("storage.objects")&&galleryMigration.includes("auth.uid()")&&galleryMigration.includes("profile_visibility"),"Only existing gallery images with permitted viewers accept interactions");

assert.ok(memberProfileMarkup.includes('maxlength="80" placeholder="Напишіть статус"')&&profileScript.includes('Array.from(next).length>80'),"Profile status uses a compact 80-character limit");
assert.ok(memberProfileMarkup.includes('id="profile-photo-emoji-toggle"')&&memberProfileMarkup.includes('id="profile-photo-comment-cancel"')&&profileScript.includes("setRangeText(emoji"),"Photo comments include functional emoji and cancel actions");

assert.ok(profileBehavior.includes("cachedFriends.slice(0,4)")&&profileBehavior.includes('q("#profile-gifts-dialog")')&&profileBehavior.includes('if(!compact)item.append(title,sub)'),"Profile uses four friends and image-only gifts with history dialog");
