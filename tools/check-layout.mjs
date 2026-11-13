import assert from "node:assert/strict";
import {readFile,stat,readdir} from "node:fs/promises";
const read=path=>readFile(path,"utf8");
const pages=["index","404","create-account","forgot","reset","verify","feed","profile","terms","privacy","cookies","offline"];
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
 const js='src="assets/js/'+controller+'.js"';
 const shared='src="assets/js/auth-core.js"';
 assert.ok(html.includes('data-page="'+pageId+'"')&&
  html.split(js).length===2&&html.split(shared).length===2&&
  html.indexOf(js)<html.indexOf(shared)&&
  html.includes('href="assets/css/'+stylesheet+'.css"')&&
  authControllerNames.filter(other=>other!==controller).every(other=>
   !html.includes('src="assets/js/'+other+'.js"')),
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

const errors=await read("assets/js/errors.js");
const captcha=await read("assets/js/captcha.js");
const lang=await read("assets/js/lang.js");
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
 auth.includes('if(status&&heading)heading.after(status);')&&
 auth.includes('if(status&&step.contains(status))form.before(status);'),
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
assert.ok(!registerHtml.includes('vt-create-account-paragraph-02')&&
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
 (await read("404.html")).includes('href="/VATRA/cookies"'),
 "All VATRA page footers, document navigation and full-panel motion should match");
// Every visible element has a class and its own page class in addition to reusable components.
for(const name of pages){
 const markup=await read(name+".html");
 for(const match of markup.matchAll(/<(h[1-6]|p|a|button|input|select|textarea|span|label|li|nav|main|section|div|header|footer|svg|img)(?=[\s>])([^>]*)>/g)){
  const attrs=match[2];
  const classes=attrs.match(/\sclass="([^"]+)"/)?.[1]?.split(/\s+/)||[];
  assert.ok(classes.length>0&&classes.some(c=>c.startsWith("vt-")||c.startsWith("ui-")),
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
assert.ok(errors.includes('Service Worker registration blocked by Playwright')&&
 errors.includes('if(origin==="console"&&/^Service Worker registration blocked by Playwright'),
 "Only benign test-harness service-worker warnings are hidden from visible error toasts");
assert.ok(css.includes(".vatra-error-stack")&&css.includes(".vatra-error-toast.is-visible")&&
 css.includes(".vatra-error-toast--warning")&&css.includes("border-left-color:#d99a32")&&
 errors.includes('VATRA · Попередження')&&errors.includes("VATRA · Warning"),
 "Console errors and warnings need separate red and amber VATRA notification designs");
assert.ok(css.includes('.vatra-input-shell .control::placeholder{color:transparent;opacity:0}')&&
 css.includes('.vatra-floating-hint{')&&
 css.includes('.vatra-input-shell:focus-within .vatra-floating-hint,')&&
 css.includes('.vatra-input-shell.is-floating .control,')&&
 !css.includes('.create-account-floating-label'),
 "Both auth forms must have one floating hint per field without duplicate native labels");
assert.ok(!css.includes("*::-webkit-scrollbar")&&!css.includes("*{scrollbar-width")&&
 css.includes(".vatra-select-list::-webkit-scrollbar-thumb")&&
 css.includes(".captcha-dialog::-webkit-scrollbar-thumb")&&
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
const legacyScript=await read("assets/js/not-found.js");
assert.ok(legacyScript,"Previous locale URLs must keep their redirect");
const oldBookmark={pathname:"/VATRA/ua/index.html",search:"",hash:"",
 replace(url){this.redirectedTo=url;}};
new Function("document","location","localStorage",legacyScript)
 (mockDocument,oldBookmark,mockStorage);
assert.equal(memory.get("vatra-language"),"en",
 "Old /ua/ bookmark must not overwrite a previously selected English locale");
assert.equal(oldBookmark.redirectedTo,"/VATRA/","Legacy bookmark should redirect to root");
const profileBookmark={pathname:"/VATRA/profile",search:"",hash:"",
 replace(url){this.redirectedTo=url;}};
new Function("document","location","localStorage",legacyScript)
 (mockDocument,profileBookmark,mockStorage);
assert.equal(profileBookmark.redirectedTo,"/VATRA/profile.html",
 "Extensionless profile fallback must resolve the real HTML file without showing 404");
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
assert.ok(offline.includes('src="data:image/svg+xml;charset=utf-8,')&&
 offline.includes('class="offline-brand ui-offline-brand-001"')&&
 offline.includes('class="offline-actions ui-offline-actions-001"')&&
 offline.includes('class="ui-offline-img-001"')&&
 !offline.includes("vatra-logo.svg"),
 "Offline page must show only the self-contained V mark at the card top-left");
assert.ok(offline.includes("ui-offline-path-004")&&offline.includes("ui-offline-dot-001"),
 "Offline Wi-Fi-off icon must use the crisp SVG geometry");
assert.ok(offline.includes("controller?.scriptURL")&&offline.includes('href="./" data-i18n="n9"'),
 "Offline fallback must resolve assets and home link at nested routes and localhost");
assert.ok(offline.includes('data-page="offline"')&&lang.includes('dataset.page === "offline"'),
 "Offline screen must keep its own translations when used as a fallback for nested routes");
assert.ok(
 /const CACHE="vatra-offline-shell-v[1-9][0-9]*"/.test(sw)&&
 sw.includes('ROOT+"assets/logo/vatra-symbol.svg"'),
 "Offline cache must use a versioned name and include the standalone V mark");
const manifest=JSON.parse(await read("site.webmanifest"));
const appIcon="assets/logo/vatra-app-icon.svg";
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
 if(page!=="offline")assert.ok(html.includes("assets/css/base.css"),filename+": central stylesheet missing");
 total+=inspect(filename,html);
 const bindings=[...html.matchAll(/\bdata-i18n="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(bindings).size,bindings.length,filename+": duplicate translation keys");
 const ukMap=uk.__pages[page]?.nodes,enMap=en.__pages[page]?.nodes;
 assert.ok(ukMap&&enMap,filename+": no page in both translation dictionaries");
 assert.deepEqual(Object.keys(ukMap).sort(),bindings.slice().sort(),filename+": Ukrainian dictionary bindings mismatch");
 assert.deepEqual(Object.keys(enMap).sort(),bindings.slice().sort(),filename+": English dictionary bindings mismatch");
}
const landing=await read("index.html");
const registerHtmlHasBrandedSymbol=(await read("create-account.html")).includes('class="signup-brand-symbol ui-signup-brand-symbol-001" src="assets/logo/vatra-symbol.svg"');
const features=["chat","business","communities","photos","video","music","marketplace","clips"];
assert.equal((landing.match(/class="orbit-node orbit-feature /g)||[]).length,8,"Eight small features required");
assert.equal((landing.match(/class="orbit-node orbit-message /g)||[]).length,0,"Retired outer slogan pills must be removed");
assert.ok(!landing.includes("ui-outer-track")&&landing.includes("intro-copy ui-home-div-009"),
 "Keep the restored description under VATRA artwork without bringing back outer slogan pills");
assert.equal((landing.match(/class="orbit-note orbit-note-/g)||[]).length,0,
 "Five VATRA orbit slogans must be removed");
assert.ok(
 landing.includes('class="vt-home-paragraph-01">')&&
 landing.includes('class="vt-home-emphasis-04" data-i18n="n100"')&&
 landing.includes('class="vt-home-description-001" data-i18n="n99"')&&
 !landing.includes('class="vt-home-paragraph-01" data-i18n="n99"')&&
 (landing.match(/data-i18n="n99"/g)||[]).length===1&&
 (landing.match(/data-i18n="n100"/g)||[]).length===1&&
 uk.__pages.index.nodes.n99.text["0"].includes("Знаходьте своїх людей")&&
 en.__pages.index.nodes.n99.text["0"].includes("Find your people"),
 "Landing description must have its own translatable text node to prevent duplicated copy");
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
 auth.includes('icon.addEventListener("mouseleave",hide);')&&
 auth.includes('icon.addEventListener("pointerdown",()=>{hide();icon.blur();});')&&
 auth.includes('tip.classList.add("is-visible")')&&
 css.includes(".orbit-tooltip.is-visible{visibility:visible;opacity:1}")&&
 !css.includes(".orbit-tooltip.is-below"),
 "Tooltip text must remain outside the rotating icon layers");
assert.ok(css.includes("@keyframes vatraSignupSymbol")&&
 signInCss.includes(".intro-symbol{position:relative;width:clamp(112px,15vw,180px);height:auto;animation:vatraSignupSymbol 7s ease-in-out infinite")&&
 createAccountCss.includes(".signup-brand-symbol{position:relative;width:clamp(112px,15vw,180px);height:auto;animation:vatraSignupSymbol 7s ease-in-out infinite")&&
 !css.includes("vatraCoreBreath")&&
 landing.includes('class="intro-symbol ui-home-img-002" src="assets/logo/vatra-symbol.svg"')&&
 registerHtmlHasBrandedSymbol,
 "Both auth logos must be identical symbols with the same animation and size");
assert.ok(auth.includes("function wireFloatingHints()")&&
 css.includes(".signup-form-panel .field:has(input.control)>span:first-child{")&&
 css.includes(".create-account-page .create-account-help-panel")&&css.includes(".vatra-error-stack"),
 "Floating hints must preserve registration captions and help");
assert.ok(landing.includes("Ваші люди. Ваші історії. Ваша VATRA."),"Complete brand footer missing");
assert.ok(landing.includes('class="auth-layout login-layout ui-login-layout-001"')&&
 !landing.includes('class="login-header ui-login-header-001"')&&
 !landing.includes('class="login-header-logo')&&
 !landing.includes('class="login-brand-kicker vt-login-brand-kicker-01"')&&
 landing.includes('class="login-form-kicker vt-login-form-kicker-01"')&&
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
 !register.includes('class="header-logo vt-create-account-link-01"')&&
 register.includes('class="signup-layout auth-layout ui-signup-layout-001"')&&
 register.includes('class="create-account-back-nav ui-create-account-back-nav-001"')&&
 register.includes('href="./" class="back vt-create-account-link-02"')&&
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
 auth.includes('auth.auth.getUser(); // Verified via Supabase Auth server.')&&
 auth.includes('user.email.trim().toLowerCase()===signupPending.email.trim().toLowerCase()')&&
 auth.includes('channel.postMessage({type:"check-confirmed-session"})')&&
 auth.includes('pageHooks.watchSignupConfirmation?.();')&&
 uk.__pages["create-account"].nodes.n240.text["0"]==="Час до завершення дії посилання"&&
 en.__pages["create-account"].nodes.n240.text["0"]==="Confirmation link expires in",
 "The account-creation confirmation screen needs a distinct resend/cooldown state");
assert.ok(css.includes(".signup-confirmation-tips p{margin:0;color:var(--soft);font-size:14px;")&&
 css.includes(".signup-confirmation-signin{display:inline-flex;align-items:center;justify-content:center;margin-top:22px;"),
 "Confirmation secondary typography must use consistent 13–14px rules");
assert.ok(uk.__pages["create-account"].meta.title==="Створити акаунт · VATRA"&&
 en.__pages["create-account"].meta.title==="Create account · VATRA"&&
 !register.includes('href="./" class="vt-create-account-link-10"'),
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
assert.ok(register.includes('class="create-account-help-trigger vt-create-account-summary-01"')&&
 register.includes('class="create-account-help-link vt-create-account-summary-02"')&&
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
const signupTemplate=await read("email-templates/confirmation.html");
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
 signupTemplate.split('token_hash={{ .TokenHash }}').length===3&&
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
 const source=await read("email-templates/"+template);
 assert.equal(source.split('token_hash={{ .TokenHash }}').length,3,
  "Every language variant needs a cross-device link: "+template);
 assert.ok(source.includes(target+'?token_hash={{ .TokenHash }}&amp;type='+type),
  "Wrong token type or destination: "+template);
}
assert.ok(register.includes('href="./" class="back vt-create-account-link-02"')&&
 !css.includes('.create-account-page[data-signup-confirmation="pending"] .create-account-back-nav{visibility:hidden;pointer-events:none}')&&
 !css.includes('.create-account-back-nav .back{min-height:40px;')&&
 !register.includes('class="signup-login-switch')&&
 register.includes('<a href="./" class="vt-create-account-footer-signin" data-i18n="n247">Увійти</a>')&&
 !css.includes('.create-account-page .footer nav>.vt-create-account-footer-signin{')&&
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
assert.ok(homeMarkup.includes('vt-home-saved-field-title-001 vatra-sr-only')&&
 !homeMarkup.includes('saved-account-wordmark')&&
 !css.includes('.site .saved-account-wordmark{')&&
 css.includes('.site .saved-account-top{display:flex;align-items:center;justify-content:space-between;gap:10px;')&&
 css.includes('.vatra-sr-only{position:absolute!important;'),
 "Remembered account must have no redundant wordmark or visible top password label");
assert.ok(!css.includes('.footer nav>a[href="create-account.html"]{')&&
 !css.includes('.create-account-page .footer nav>.vt-create-account-footer-signin{'),
 "Footer sign-in and create-account links must use the same shared link typography");
const allTemplates=await readdir("email-templates");
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
 const source=await read("email-templates/"+filename);
 assert.equal(source.split('token_hash={{ .TokenHash }}').length,3,
  filename+": both locale branches must use the same direct confirmation URL");
 assert.ok(source.includes(route+'?token_hash={{ .TokenHash }}&amp;type='+type),
  filename+": wrong token type or callback");
}
for(const file of allTemplates.filter(f=>f.endsWith(".html"))){
 const source=await read("email-templates/"+file);
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
const firstStep=registrationMarkup.indexOf('class="signup-step-number vt-signup-step-number-01"');
assert.ok(formStart>=0&&innerStart>formStart&&
 overlineStart>innerStart&&labelsStart>overlineStart&&firstStep>labelsStart&&returnStart>firstStep&&
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
 css.includes(".check-terms>.field-error{grid-column:1/-1;grid-row:2;")&&
 css.includes(".check-terms>.field-error::before{width:16px;height:16px;")&&
 auth.includes('wrapper.append(error);'),
 "Field errors must expire automatically and align consent messages");
assert.ok(auth.includes("function wireHoverHelp()")&&auth.includes("other!==help&&other.open")&&
 auth.includes('help.addEventListener("pointerenter"'),
 "Gender and email help must open on hover and never overlap");
assert.ok(css.includes("align-items:start")&&css.includes(".signup-form-panel .two>.field{align-content:start;align-self:start}"),
 "Two-column registration inputs must not move when a field shows validation errors");
for(const page of pages.filter(p=>p!=="offline"&&p!=="verify")){
 const html=await read(page+".html");
 assert.ok(html.includes('ui-language-static-flag-001')&&html.includes('ui-language-static-chevron-001'),
  page+": language switch must show SVG flag and chevron even before JavaScript runs");
 assert.ok(html.includes("assets/js/lang.js")&&html.includes("assets/js/errors.js"),page+": shared language picker and diagnostics missing");
 assert.ok(html.includes("assets/css/base.css")&&!/assets\/(?:js|css)\/[^"\x27]+\?v=/.test(html),page+": local asset paths must be stable and unversioned");
}
assert.ok(lang.includes("function initLanguagePicker()")&&lang.includes("trigger.addEventListener(\"click\",open)"),
 "Language toggle must initialize early and open the full modal");
// All public pages use the same footer structure; the full-width background
// remains separate from the centered content. Documents have a working
// single-row header independent of the former signup header styles.
const footerNames=pages.filter(p=>!["offline","feed","profile","verify"].includes(p));
const feedFooter=await read("feed.html"),profileMarkup=await read("profile.html");
assert.ok(!feedFooter.includes("<footer")&&!profileMarkup.includes("<footer"),
 "Signed-in VATRA must not show the guest-site footer");
for(const page of footerNames){
 const html=await read(page+".html");
 const tag=page==="index"?"home":page;
 assert.ok(html.includes('class="auth-footer-content ui-'+tag+'-footer-content-001"'),
  page+": missing shared centered footer container");
}
for(const page of ["terms","privacy","cookies"]){
 const html=await read(page+".html");
 assert.ok(html.includes('class="policy-top-inner ui-'+page+'-top-inner-001"')&&
  html.includes('class="policy-navigation-header policy-top ui-'+page+'-header-001"')&&
  html.includes("assets/css/legal.css"),
  page+": documents need a functioning unified header and fresh stylesheet");
}
for(const page of ["verify","404"]){
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
 css.includes('.field-error::before{content:"!"'),
 "Orbit size and visual validation details must be updated");
assert.ok(register.includes('class="vatra-input-shell ')&&
 register.includes('class="vatra-floating-hint ')&&
 !auth.includes("wireStableInputHints"),
 "Login and signup floating hints must use original translated text");
for(const page of ["terms","privacy","cookies","forgot","reset","404"]){
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
const signupTags=["#спілкування","#бізнес","#спільноти","#фотографії","#відео","#музика","#маркетплейс","#кліпи"];
const englishSignupTags=["#communication","#business","#communities","#photos","#videos","#music","#marketplace","#clips"];
const signupKeys=[205,206,207,230,231,232,233,234];
assert.ok(!register.includes("Особистий VATRA ID")&&
 signupTags.every((tag,i)=>register.includes('data-i18n="n'+signupKeys[i]+'">'+tag+'</span>'))&&
 signupTags.every((tag,i)=>uk.__pages["create-account"].nodes["n"+signupKeys[i]]?.text["0"]===tag&&
 en.__pages["create-account"].nodes["n"+signupKeys[i]]?.text["0"]===englishSignupTags[i]),
 "All eight hashtags must display in Ukrainian and translate correctly into English");
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
for(const page of ["index","create-account","forgot","reset","verify","404"]){
 const html=await read(page+".html");
 assert.ok(!html.includes('footer-doc-icon'),
 "Document icons must not appear in footer: "+page);
}
assert.ok(register.includes('>Уже підтвердили? Увійти</a>')&&
 uk.__pages["create-account"].nodes.n223.text["0"]==="Уже підтвердили? Увійти"&&
 !register.includes('href="./" class="vt-create-account-link-10"'),
 "Confirmation screen must have one contextual sign-in link");
for(const page of ["terms","privacy","cookies","forgot","reset","404"]){
 const html=await read(page+".html");
 assert.ok(!html.includes('>Вхід</a>')&&html.includes('>Увійти</a>')&&
  uk.__pages[page].nodes.n301.text["0"]==="Увійти",
  "All guest sign-in CTAs must use the same Ukrainian verb on "+page);
}

assert.ok(css.includes(".signup-form-panel .field:has(input.control)>span:first-child")&&
 css.includes(".create-account-page .create-account-help-panel"),
 "Registration needs visible static captions and VATRA-style accessible help popovers");
assert.ok(
 !forgot.includes('class="header-logo vt-forgot-link-02"')&&
 forgot.includes('class="forgot-panel-header ui-forgot-panel-header-001"')&&
 forgot.includes('class="forgot-panel-brand vt-forgot-link-02"')&&
 forgot.includes('src="assets/logo/vatra-symbol.svg"')&&
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
 css.includes('.ui-forgot-main-001 .forgot-panel-content > :is(.forgot-panel-header,.forgot-intro,.reset-intro,.response,.field-stack,.form-note,.recovery-step){width:100%;max-width:520px}')&&
 css.includes('.form-box{width:100%;max-width:520px;')&&
 css.includes('.signup-form-panel .narrow-form{width:100%;max-width:520px;'),
 "Password recovery, sign-in and sign-up must share the same 520px form column");
assert.ok(
 reset.includes('class="forgot-panel reset-panel ui-reset-panel-001"')&&
 reset.includes('class="forgot-panel-header reset-panel-header ui-reset-panel-header-001"')&&
 reset.includes('class="reset-intro ui-reset-intro-001"')&&
 reset.includes('id="reset-title"')&&
 reset.includes('src="assets/logo/vatra-symbol.svg"')&&
 !reset.includes('class="header-logo vt-reset-link-02"')&&
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
 forgot.includes('class="vatra-floating-hint vt-forgot-floating-hint-01" aria-hidden="true" data-i18n="n59">Електронна пошта</span>')&&
 forgot.includes('class="vatra-input-shell ui-forgot-input-shell-002"')&&
 forgot.includes('class="vatra-floating-hint vt-forgot-floating-hint-02" aria-hidden="true" data-i18n="n56"')&&
 reset.includes('class="vatra-input-shell ui-reset-input-shell-001"')&&
 reset.includes('class="vatra-input-shell ui-reset-input-shell-002"')&&
 reset.includes('class="vatra-floating-hint vt-reset-floating-hint-02" aria-hidden="true" data-i18n="n44"')&&
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
for(const script of ["assets/js/auth-core.js","assets/js/feed.js","assets/js/lang.js","assets/js/errors.js","assets/js/captcha.js","assets/js/host.js","assets/js/network.js","assets/js/social-shell.js","assets/js/notifications.js","sw.js"]){
 const scriptSource=await read(script);
 assert.doesNotThrow(()=>new Function(scriptSource),script+": invalid JavaScript");
}
// All authenticated social pages use exactly the same header shell. Only the
// active route may differ; this guards against CSS/HTML drift between pages.
const sharedShellPages=["feed","profile","communities","club","notifications","friends","gifts"];
const interactionsScript=await read("assets/js/post-interactions.js");
const profileExtraScript=await read("assets/js/profile.js");
const scrollRailScript=await read("assets/js/scroll-rail.js");
assert.ok(interactionsScript.includes('vatra-post-share-dialog')&&
 interactionsScript.includes('vatra-post-social-summary')&&
 interactionsScript.includes('vatra-post-compact-comments')&&
 interactionsScript.includes('vatra_post_like_members')&&
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
 (await read("assets/js/feed.js")).includes('vatra_public_profiles')&&
 (await read("assets/js/feed.js")).includes('client.from("communities")'),
 "Global VATRA search must search names and communities as well as accessible posts");
const liveSiteShell=await read("assets/js/social-shell.js");
const liveNotificationProvider=await read("assets/js/notifications.js");
assert.ok(liveSiteShell.includes('vatra-search-live-results')&&
 liveSiteShell.includes('ui-vatra-search-live-glyph-')&&
 liveSiteShell.includes('scheduleLive(term)')&&
 liveNotificationProvider.includes('window.VATRA_SITE_SEARCH={search:findSite}')&&
 liveNotificationProvider.includes('client.from("vatra_public_profiles")')&&
 liveNotificationProvider.includes('client.from("feed_posts")'),
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
 notificationScript.includes('opts={page:0,size:6}')&&
 notificationScript.includes('pageLoad(false)')&&
 notificationScript.includes('client.channel(')&&
 (await read("feed.html")).includes('ui-feed-filter-all-icon-001')&&
 (await read("feed.html")).includes('ui-feed-empty-document-icon-001'),
 "VATRA notifications must include the private inbox and six-item header preview");
const normalizedSocialHeader=html=>{
 const header=html.match(/<header class="feed-header[\s\S]*?<\/header>/)?.[0];
 assert.ok(header,"Signed-in VATRA page must have the shared header");
 return header.replace(/ social-top-active/g,"").replace(/ aria-current="page"/g,"");
};
const canonicalSocialHeader=normalizedSocialHeader(await read("feed.html"));
/* profileMarkup already loaded during the footer audit. */
assert.ok((profileMarkup.match(/data-profile-tab="/g)||[]).length===8&&
 (profileMarkup.match(/data-profile-panel="/g)||[]).length===11&&
 profileMarkup.includes('id="profile-friends-preview"')&&
 profileMarkup.includes('id="profile-gifts-preview"')&&
 profileMarkup.includes('id="profile-tab-clips"')&&
 profileMarkup.includes('id="profile-tab-communities"')&&
 profileMarkup.includes('id="profile-report-dialog"')&&
 profileMarkup.includes('id="profile-report-open"')&&
 profileMarkup.includes('id="profile-friend-button"')&&
 profileMarkup.includes('id="profile-message-button"')&&
 profileMarkup.includes('id="profile-message-dialog"')&&
 profileMarkup.includes('id="profile-inbox-list"')&&
 profileMarkup.includes('id="profile-cover-image" class="profile-cover ui-profile-cover-001"'),
 "Member profile requires a real cover, tabs, friendship and private message UI");
assert.ok(profileMarkup.includes('id="profile-edit-open"')&&
 profileMarkup.includes('id="profile-status"')&&
 profileMarkup.includes('id="profile-last-seen"')&&
 profileMarkup.includes('id="profile-online-dot"')&&
 profileMarkup.includes('id="profile-edit-dialog"')&&
 profileMarkup.includes('id="profile-status-text"')&&
 profileMarkup.includes('ui-profile-add-friend-icon-001')&&
 profileMarkup.includes('ui-profile-message-icon-001')&&
 profileMarkup.includes('class="feed-posts ui-profile-posts-001"')&&
 profileMarkup.includes('id="profile-tab-videos"')&&
 !profileMarkup.includes('id="profile-tab-about"')&&
 !profileMarkup.includes('id="profile-vatra-id"')&&
 (await read("assets/js/profile.js")).includes('setupProfilePresence(')&&
 (await read("assets/js/profile.js")).includes('setupProfileGallery(')&&
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
 (await read("assets/css/feed.css")).includes('max-height:calc(100dvh - 90px)')&&
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
 (await read("assets/js/profile.js")).includes('q(".social-profile-tabs")?.remove()')&&
 (await read("assets/js/profile.js")).includes('q(".profile-panels")?.remove()')&&
 (await read("assets/js/profile.js")).includes('void loadOwnHeaderAvatar(client,ownId,user.email);'),
 "Unknown VATRA ID keeps cover and avatar while removing all invented actions and details");
const profileBehavior=await read("assets/js/profile.js");
assert.ok(profileBehavior.includes('client.from("vatra_friendships")')&&
 profileBehavior.includes('client.from("vatra_direct_messages")')&&
 profileBehavior.includes("setupProfileInteractions(client,ownId,targetId,isMine)"),
 "Profile friendship and messaging must use persisted, RLS-secured data");
assert.ok(profileMarkup.includes('id="profile-cover-view"')&&
 profileMarkup.includes('id="profile-avatar-wrap"')&&
 profileMarkup.includes('id="profile-avatar-trigger"')&&
 profileMarkup.includes('id="profile-avatar-menu"')&&
 profileMarkup.includes('id="profile-avatar-story"')&&
 profileMarkup.includes('id="profile-avatar-photo"')&&
 profileMarkup.includes('id="profile-media-viewer"')&&
 profileMarkup.includes('id="profile-media-viewer-image"')&&
 profileMarkup.includes('id="profile-story-viewer"')&&
 profileBehavior.includes('client.from("vatra_stories")')&&
 profileBehavior.includes('avatarWrap.classList.toggle("has-active-story",hasStory)')&&
 profileBehavior.includes('coverView.addEventListener("click",()=>openMedia("cover"))')&&
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
const profileStyles=profileMarkup.match(/href="assets\/css\/([^"]+\.css)"/g)||[];
assert.deepEqual(profileStyles,[
 'href="assets/css/base.css"','href="assets/css/feed.css"',
 'href="assets/css/profile.css"','href="assets/css/post-composer.css"','href="assets/css/gifts.css"'
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
 memberCss.includes("body.profile-page .profile-avatar-wrap:hover .profile-avatar-menu:not([hidden])"),
 "Member photo viewer must fill the screen and story avatar menu must not be clipped");
assert.ok(sharedCss.includes(".vt-vatra-account")===false ||
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
 sharedCss.includes("html:has(body.feed-page){scrollbar-gutter:stable}")&&
 sharedCss.includes("grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);")&&
 sharedCss.includes("max-width:292px;height:36px")&&
 sharedCss.includes("flex:0 0 108px")&&
 sharedCss.includes("flex:0 0 86px")&&
 sharedCss.includes("margin:0 auto!important;gap:13px")&&
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
 sharedJs.includes("setUpSiteSearch()")&&
 sharedCss.includes(".vatra-search-history::-webkit-scrollbar-thumb")&&
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
  "ui-shell-header-messenger-001","ui-feed-notifications-button-001",
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
  header.includes('class="vt-vatra-account-settings-label-001" data-social-uk=')&&
  header.includes('class="vt-vatra-account-profile-label-001" data-i18n="n48"'),
  page+": account avatar menu must preserve SVG icons and live translations");
 const nav=header.match(/<nav class="social-top-nav[\s\S]*?<\/nav>/)?.[0]||"";
 const controls=header.match(/<div class="feed-header-controls[\s\S]*?<\/header>/)?.[0]||"";
 assert.ok(nav.indexOf("ui-social-top-feed-001")<nav.indexOf("ui-social-top-friends-001")&&
  nav.indexOf("ui-social-top-friends-001")<nav.indexOf("ui-social-top-communities-001")&&
  nav.indexOf("ui-social-top-communities-001")<nav.indexOf("ui-social-top-clips-001")&&
  nav.indexOf("ui-social-top-clips-001")<nav.indexOf("ui-social-top-marketplace-001"),
  page+": five icon destinations must be in the agreed order");
 assert.ok(!controls.includes("ui-shell-header-friends-001")&&
  controls.indexOf("ui-shell-header-messenger-001")<controls.indexOf("ui-feed-notifications-button-001")&&
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
 storyPreviewMarkup.includes('id="feed-story-form"')&&
 !storyPreviewMarkup.includes("ui-feed-story-preview-001")&&
 !storyPreviewMarkup.includes('data-vatra-coming-soon="stories"'),
 "Feed must show real friend Stories without fabricated previews, then the post composer");
// The new Feed must be the authenticated home, not a duplicate account page.
const feedMarkup=await read("feed.html");
const memberProfileMarkup=await read("profile.html");
const feedScript=await read("assets/js/feed.js");
const profileScript=await read("assets/js/profile.js");
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
const communityScript=await read("assets/js/communities.js");
const postMediaScript=await read("assets/js/post-media.js");
// Stories accept photo or video without requiring a caption, but keep private media paths.
assert.ok(storyPreviewMarkup.includes('id="feed-story-media"')&&
 storyPreviewMarkup.includes('id="feed-story-media-preview"')&&
 storyPreviewMarkup.includes('id="feed-story-view-media"')&&
 !/id="feed-story-text"[^>]*\srequired/.test(storyPreviewMarkup)&&
 memberProfileMarkup.includes('id="profile-story-viewer-media"')&&
 feedScript.includes('VATRA_POST_MEDIA.uploadStory(client,vatraId,file)')&&
 profileScript.includes('VATRA_POST_MEDIA?.renderStory(client,')&&
 postMediaScript.includes('"/stories/"')&&
 postMediaScript.includes('createSignedUrl(path,ttl)'),
 "Photo/video Stories must use private signed URLs in Feed and profile, without fake media placeholders.");
assert.doesNotThrow(()=>new Function(postMediaScript),"Shared post media module has invalid JavaScript");
assert.ok(
feedMarkup.includes('id="feed-compose-media"') &&
 memberProfileMarkup.includes('id="profile-compose-media"') &&
 (await read("club.html")).includes('id="club-compose-media"') &&
 feedScript.includes("VATRA_POST_MEDIA?.bindPicker") &&
 profileScript.includes("VATRA_POST_MEDIA?.bindPicker") &&
 communityScript.includes("VATRA_POST_MEDIA?.bindPicker") &&
 postMediaScript.includes('createSignedUrl(path,ttl)') &&
 postMediaScript.includes('ttl=3600') &&
 postMediaScript.includes('signed(client,kind,path,300)'),
 "VATRA photos and videos must be attached, published and displayed across all post surfaces");
assert.ok(
 communityScript.includes("postPattern.test(linkedId") &&
 communityScript.includes('.eq("club_id",clubId).eq("id",linkedId)') &&
 communityScript.includes('target.scrollIntoView({block:"center",behavior:"smooth"})') &&
 (await read("assets/js/post-interactions.js")).includes('validUUID(post.id)?"?post="') &&
 (await read("assets/js/social-shell.js")).includes('validPost(entry.id)?"?post="'),
 "Community publications from live search and sharing must open their exact post");
const feedStyle=await read("assets/css/feed.css");
assert.ok(
 feedMarkup.includes('id="feed-filter-summary"') &&
 feedScript.includes('const describeFilter=()=>{') &&
 feedScript.includes('subscriptionsLoadedAt>60000') &&
 feedStyle.includes('body.feed-page:not(.profile-page):not(.community-page) .vt-feed-filter-summary-001{'),
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
 profileScript.includes('client.from("feed_posts").insert({')&&
 feedScript.includes('client.from("feed_posts").insert({')&&
 feedScript.includes('const personFields="id,author_vatra_id,body,created_at,visibility,media_kind,media_path,shared_post_kind,shared_post_id"')&&
 !feedScript.includes("Independent, fixed-size Supabase cursors keep the two chronological feeds merged.\");")&&
 !feedScript.includes("innerHTML")&&
 feedStyle.includes('width:min(100%,700px);max-width:700px;min-width:0;')&&
 auth.includes('window.location.replace(url("feed"))'),
 "VATRA Feed must render the composer before real Stories and personalized posts");
assert.ok(feedStyle.includes('body.feed-page > .vatra-auth-loading[hidden]{display:none!important}')&&
 feedStyle.includes('body.feed-page:not(.profile-page):not(.community-page) .feed-post-placeholder{')&&
 !feedStyle.includes('body.profile-page .profile-cover.is-loading-media{')&&
 feedStyle.includes('body.feed-page.vatra-shell-pending .feed-header{pointer-events:none}')&&
 feedScript.includes('void Promise.allSettled([loadPosts(true),loadStories(),loadGlobalResults()])')&&
 feedScript.includes('posts.append(card(item))')&&
 profileScript.includes('const mediaPromise=setupProfileMedia(client,ownId,targetId,isMine,user.id,user.email,locked,preloadedMedia)')&&
 profileScript.includes('const postsPromise=locked?Promise.resolve():loadPosts(client,targetId,ownId,user.id)')&&
 profileScript.includes('const access=await window.VATRA_PROFILE_DETAILS?.init({client,ownId,targetId,isMine})')&&
 profileScript.includes('void mediaPromise.catch(()=>{')&&
 memberProfileMarkup.includes('ui-vatra-profile-realistic-skeleton-001')&&
 profileScript.includes('setImage(postAvatar,candidate)')&&
 memberProfileMarkup.includes('id="profile-avatar-engagement"'),
 "Authenticated pages must use nonblocking inline skeletons and retain real avatar engagement");
const detailsModule=profileScript;
assert.equal((memberProfileMarkup.match(/src="assets\/js\/profile\.js"/g)||[]).length,1,
 "Exactly one page-level profile controller must be loaded");
assert.doesNotThrow(()=>new Function(detailsModule),"Profile information module has invalid JavaScript");
assert.ok(memberProfileMarkup.includes('assets/js/profile.js') &&
 !memberProfileMarkup.includes('assets/js/profile-details.js') &&
 detailsModule.includes('profile-editor-page-visibility') &&
 detailsModule.includes('from("vatra_profile_details")') &&
 detailsModule.includes('from("vatra_profile_preferences")') &&
 detailsModule.includes('window.VATRA_PROFILE_DETAILS={init,open:()=>openEditor()}') &&
 memberCss.includes("body.profile-page .profile-editor-layout"),
 "VATRA personal profile editor must have group navigation and real Supabase field privacy");
assert.ok(
 !detailsModule.includes('item.append(badge,label,content)') &&
 detailsModule.includes('paragraph.textContent=bio') &&
 detailsModule.includes('paragraph.hidden=!bio') &&
 detailsModule.includes('more.hidden=!additional.length&&!hasLongPreview') &&
 !detailsModule.includes('vt-profile-detail-audience-') &&
 detailsModule.includes('lab.prepend(svg(fieldIcons[key]') &&
 memberCss.includes('/* PROFILE READING ·') &&
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
for(const kind of ["default","deleted","blocked","not-found"]){
 assert.ok(sharedAvatar.includes("/VATRA/assets/avatars/1024px/avatar-"+kind+"-1024.webp")&&
  sharedAvatar.includes("/VATRA/assets/avatars/2048px/avatar-"+kind+".webp"),
  "Both supplied WebP sizes must be available for "+kind);
}
assert.ok(systemAvatarCss.includes("--vatra-default-avatar:url(\"/VATRA/assets/avatars/1024px/avatar-default-1024.webp\")")&&
 systemProfileCss.includes("avatar-not-found.webp")&&
 systemProfileCss.includes("avatar-blocked.webp")&&
 systemFeedCss.includes("--vatra-generic-avatar:var(--vatra-default-avatar)")&&
 profileBehavior.includes("missingProfile(publicState)")&&
 profileBehavior.includes('avatarTrigger.disabled=!canViewPhoto||(!hasPhoto&&!hasStory)')&&
 sharedAvatar.includes('client.from("vatra_account_states")'),
 "Four system states must be distinct, RLS-backed, and non-clickable as photos");

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
 postInteractionFields.includes('p_parent:item.id') &&
 postInteractionFields.includes('payload.parent_comment_id=target.id') &&
 postInteractionFields.includes('client.from("vatra_post_comments").insert(payload)') &&
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
 socialMotion.includes('const member=id=>validMember(id)?new URL("id"+id,base).href:null;') &&
 socialMotion.includes('location.assign(next.href)') &&
 !socialMotion.includes('window.setTimeout(navigate,145)') &&
 !socialMotion.includes('classList.add("vatra-route-exiting")') &&
 feedStyle.includes("body.feed-page.vatra-shell-pending .feed-app > .feed-layout") &&
 !feedStyle.includes("vatra-editor-switching") &&
 !memberCss.includes("view-transition-name:vatra-editor") &&
 feedStyle.includes("@media(prefers-reduced-motion:reduce)") &&
 !socialMotion.includes("VATRA_MOTION") &&
 !profileScript.includes("VATRA_MOTION") &&
 !profileScript.includes("document.startViewTransition(") &&
 profileScript.includes("if(id!==selected)showGroup(id)") &&
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
assert.equal(uk.__pages.feed.meta.title,"Стрічка · VATRA");
assert.equal(en.__pages.feed.meta.title,"Feed · VATRA");
 assert.ok(!feedMarkup.includes('id="vatra-tour-dialog"')&&
  !feedMarkup.includes("assets/js/onboarding.js")&&
  !feedMarkup.includes("assets/css/onboarding.css")&&
  !feedScript.includes("VATRA_ONBOARDING")&&
  !feedScript.includes("vatra:feed-ready"),
  "Removed VATRA walkthrough must not be loaded or displayed");
assert.ok(memberProfileMarkup.includes('id="profile-avatar-upload-button"')&&
 memberProfileMarkup.includes('id="profile-cover-upload-button"')&&
 memberProfileMarkup.includes('id="profile-avatar-file"')&&
 memberProfileMarkup.includes('id="profile-cover-file"')&&
 profileScript.includes('from("vatra_profile_media")')&&
 profileScript.includes('storage.from(bucketFor(kind)).upload(path,file')&&
 profileScript.includes('uploadImage(fileAvatar.files[0],"avatar")')&&
 profileScript.includes('uploadImage(fileCover.files[0],"cover")')&&
 profileScript.includes('"vatra-avatars"')&&
 profileScript.includes('"vatra-covers"')&&
 feedScript.includes('storage.from("vatra-avatars")'),
 "Profile photos and cover images must be uploaded to their dedicated storage buckets");
assert.ok(memberProfileMarkup.includes('id="profile-avatar-story-delete"')&&
 profileScript.includes('client.from("vatra_stories").delete()')&&
 profileScript.includes('deleteStoryButton.hidden=!hasStory||!isMine||!activeStory?.id;')&&
 !profileScript.includes('remove([previous])')&&
 !sharedCss.includes('border-radius:0 14px 14px 14px'),
 "Only the owner deletes a story; previous profile photos are preserved");
assert.ok(memberProfileMarkup.includes('id="profile-avatar-engagement"')&&
 memberProfileMarkup.includes('id="profile-photo-like"')&&
 memberProfileMarkup.includes('id="profile-photo-comments"')&&
 memberProfileMarkup.includes('id="profile-photo-share"')&&
 profileScript.includes('from("vatra_avatar_likes")')&&
 profileScript.includes('from("vatra_avatar_comments")')&&
 profileScript.includes('interaction.hidden=kind!=="avatar"')&&
 memberCss.includes('body.profile-page .profile-photo-comments::-webkit-scrollbar-thumb')&&
 memberCss.includes('body.profile-page .profile-media-viewer[data-kind="cover"][open]')&&
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

assert.equal(uk.__pages["404"].meta.title,"404 Сторінку не знайдено · VATRA");
assert.equal(en.__pages["404"].meta.title,"404 Page not found · VATRA");
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
assert.ok(errorPage.includes("Перейти на головну")&&!errorPage.includes("Повернутися до входу"),
 "404 primary action must not presume the user's previous location");
assert.ok(css.includes("color:#fff;text-decoration:none}")&&
 css.includes(".error-card a.error-action:hover"),
 "404 navigation link and arrow must not be underlined on hover");
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
assert.ok(errorPage.includes('href="/VATRA/"')&&errorPage.includes('src="/VATRA/assets/logo/vatra-logo.svg"'),
 "GitHub Pages 404 must work at nested missing URLs");
assert.ok(legacyScript.includes("location.replace(target+location.search+location.hash)"),
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
assert.ok(landing.includes('class="vt-home-link-08"')&&
 register.includes('class="vt-create-account-footer-signin"')&&
 !css.includes('footer-auth-action')&&
 register.indexOf('<div class="signup-overline-labels')<register.indexOf('<nav class="create-account-back-nav')&&
 !css.includes('position:absolute;\n    top:clamp(16px,1.6vw,25px)')&&
 legalCss.includes('.policy-page .footer{min-height:70px;padding-inline:0}'),
 "Auth footer CTA slots and legal footer height must match; signup nav belongs beside step labels");

// Persistent regression: no duplicate stylesheet variants, and saved-login
// navigation occupies the top action row rather than a trailing form row.
const cssFiles=await readdir("assets/css");
assert.deepEqual(cssFiles.sort(),["base.css","communities.css","create-account.css","feed.css","friends.css","gifts.css","legal.css","not-found.css","offline.css","post-composer.css","profile.css","recovery.css","sign-in.css","verify.css"],"VATRA must keep only canonical family styles, never style2/fix copies");
assert.ok(landing.includes('id="saved-account-return" class="saved-account-return vt-home-saved-return-001" data-i18n="n508" hidden')&&
 landing.indexOf('id="saved-account-return"')>landing.indexOf('class="saved-account-top')&&
 landing.indexOf('id="saved-account-return"')<landing.indexOf('id="saved-account-remove"')&&
 !landing.includes('id="saved-account-return" class="saved-account-return vt-home-saved-return-001" data-i18n="n508">')&&
 css.includes('.site .saved-account-return:hover,.site .saved-account-return:focus-visible{color:var(--blue);transform:translateX(-2px)')&&
 css.includes('min-height:151px;width:100%')&&
 auth.includes('returnButton.hidden=true')&&auth.includes('returnButton.hidden=false')&&
 auth.includes('Не вдалося увійти. Перевірте пароль.')&&
 en["Не вдалося увійти. Перевірте пароль."]==="Could not sign in. Check your password.",
 "Saved account must have a top-left return control, equal state heights and localized password guidance");
assert.ok(css.includes('background:linear-gradient(90deg,#2c70e8,#8759e5);-webkit-background-clip:text;background-clip:text')&&
 !css.includes('min-width:148px')&&!css.includes('min-width:132px'),
 "Signup step color should match the progress gradient, and footer links must have natural widths");

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
assert.ok(forgot.includes('id="account-link" href="./" class="action primary full recovery-success-action vt-forgot-link-08"')&&
 resetNew.includes('id="recovery-success-link" class="form-note recovery-success-row vt-reset-paragraph-03" hidden')&&
 resetNew.includes('id="account-link" href="./" class="action primary full recovery-success-action vt-reset-link-03" hidden')&&
 css.includes('.ui-forgot-main-001 .forgot-panel .recovery-success-action{display:flex;align-items:center;justify-content:center;width:100%;min-height:56px')&&
 css.includes('.ui-forgot-main-001 .forgot-panel .vatra-input-shell:is(.is-floating,:focus-within) .control{padding-top:21px;padding-bottom:7px}'),
 "Both recovery paths need identical accessible password fields and full-width success CTA");


assert.ok(
 authRecovery.includes('if(repeat)feedback("Якщо акаунт існує')&&
 !authRecovery.includes('"Якщо акаунт із такою адресою існує, лист із кодом надіслано. Введіть код нижче."'),
 "Initial recovery email must reveal the code step without a redundant green notice");
assert.ok(
 profileScript.includes('document.title=titleName+" · VATRA";')&&
 socialMotion.includes('const club=next.pathname.match(')&&
 socialMotion.includes('const ownProfile=next.pathname==="/VATRA/profile";')&&
 socialMotion.includes('new URL(ownProfile?"profile.html":"club.html"')&&
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
