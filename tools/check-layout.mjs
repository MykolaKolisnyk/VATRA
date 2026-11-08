import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
const read=path=>readFile(path,"utf8");
const pages=["index","404","register","forgot","reset","account","legal","terms","privacy","cookies","offline"];
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
 errors.includes("console.error=function")&&
 errors.includes('setTimeout(dismiss,DISPLAY_MS)')&&
 !errors.includes('window.VATRA_ERRORS={show}')&&
 !auth.includes("VATRA_ERRORS"),
 "Only console/runtime errors should appear as automatically dismissing toasts; form errors stay inline");
assert.ok(css.includes(".vatra-error-stack")&&css.includes(".vatra-error-toast.is-visible"),
 "Animated bottom-left console notices missing");
assert.ok(css.includes('.field:has(input.control)>span:first-child,.register-page .reg-input-wrap>.reg-floating-label')&&
 !css.includes('opacity:0;transform:translateY(10px)')&&
 !css.includes('.register-page .reg-input-wrap.is-raised>.control{padding-top:20px!important'),
 "Login and registration must use the same animation, not layered overrides");
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
assert.ok(offline.includes('errors.js?v=20261108-errors3')&&sw.includes('ROOT+"assets/js/errors.js"'),
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
const features=["chat","business","communities","photos","video","music","marketplace","clips"];
assert.equal((landing.match(/class="orbit-node orbit-feature /g)||[]).length,8,"Eight small features required");
assert.equal((landing.match(/class="orbit-node orbit-message /g)||[]).length,0,"Retired outer slogan pills must be removed");
assert.ok(!landing.includes("ui-outer-track")&&landing.includes("intro-copy ui-home-div-009"),
 "Keep the restored description under VATRA artwork without bringing back outer slogan pills");
assert.equal((landing.match(/class="orbit-note orbit-note-/g)||[]).length,0,
 "Five VATRA orbit slogans must be removed");
assert.ok(landing.includes('data-i18n="n99"')&&landing.includes('data-i18n="n100"'),
 "Keep translated VATRA social-network description on the left");
for(const feature of features){
 assert.ok(landing.includes('feature-'+feature+' ui-inner-node-'),"Missing feature "+feature);
 assert.ok(landing.includes('class="ui-orbit-'+feature+'-svg"'),"No custom SVG for "+feature);
 assert.ok(landing.includes('id="ua-orbit-tip-'+feature+'"'),"Tooltip missing "+feature);
}
assert.ok(css.includes('--inner-radius:min(33cqw,220px)')&&
 css.includes('width:clamp(130px,29cqw,224px)')&&
 css.includes('width:clamp(42px,8.2cqw,58px)'),
 "Expanded orbit, central V, and eight icons must be scaled consistently");
assert.ok(css.includes('grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)')&&
 css.includes('font-size:clamp(30px,2.3vw,36px)'),
 "Landing columns and right-side typography must be balanced");
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
 css.includes("height:clamp(360px,calc(var(--inner-radius) * 2 + 80px),540px)")&&
 css.includes(".intro-copy{position:relative;z-index:2;width:100%;max-width:none;margin:0;text-align:left}"),
 "VATRA welcome text must be left aligned with copyright and unused orbit slogans removed");
assert.ok(auth.includes("function wireOrbitTooltips()")&&
 auth.includes('tip.classList.add("is-below")')&&
 css.includes(".orbit-tooltip.is-below"),
 "Orbit tooltips must open below top icons instead of clipping behind browser chrome");
assert.ok(css.includes("@keyframes vatraCoreBreath")&&
 css.includes("animation:vatraCoreBreath 7s"),
 "Central VATRA logo must subtly float and breathe without modifying its artwork");
assert.ok(css.includes('.register-page .reg-floating-label')&&
 css.includes(".register-page .reg-help-panel")&&
 css.includes(".vatra-error-stack"),
 "Animated input hints, hover help and diagnostic notices must share site styling");
assert.ok(landing.includes("Ваші люди. Ваші історії. Ваша VATRA."),"Complete brand footer missing");
const register=await read("register.html"),forgot=await read("forgot.html"),reset=await read("reset.html");
for(const file of [register,forgot,reset])assert.ok(file.includes("assets/js/auth.js"),"Shared auth module not loaded");
for(const file of [landing,register,forgot]){
 assert.ok(file.includes('src="assets/js/captcha.js"'),"Cloudflare widget not loaded");
 assert.ok(file.indexOf('src="assets/js/captcha.js')<file.indexOf('src="assets/js/auth.js'),"Cloudflare must load before auth");
}
assert.ok(register.includes('id="consent"')&&register.includes('id="signup-form"'),"Signup consent or form missing");
for(const id of ["first-name","last-name","gender","email","password","password-confirm"]){
 assert.ok(register.includes('id="'+id+'"'),"Missing registration control: "+id);
}
assert.ok(register.includes('class="reg-help-trigger vt-register-summary-01"')&&
 register.includes('class="reg-help-link vt-register-summary-02"')&&
 register.includes('href="privacy.html#purpose" target="_blank"'),
 "Signup gender and email must explain why data is requested");
assert.ok(auth.includes('if(page==="register")')&&auth.includes("reg-floating-label")&&
 auth.includes('wrap.classList.toggle("is-raised",raised)'),
 "Registration must animate interior hints while preserving external captions");
assert.ok(css.includes('.field:has(input.control)>span:first-child,.register-page .reg-input-wrap>.reg-floating-label')&&
 css.includes('.register-page .reg-input-wrap.is-raised>.reg-floating-label{top:7px'),
 "Signup and login must share the same floating-label animation rules");
assert.ok(auth.includes("function wireHoverHelp()")&&auth.includes("other!==help&&other.open")&&
 auth.includes('help.addEventListener("pointerenter"'),
 "Gender and email help must open on hover and never overlap");
assert.ok(css.includes("align-items:start")&&css.includes(".register-page .two>.field{align-content:start;align-self:start}"),
 "Two-column registration inputs must not move when a field shows validation errors");
for(const page of pages.filter(p=>p!=="offline")){
 const html=await read(page+".html");
 assert.ok(html.includes('ui-language-static-flag-001')&&html.includes('ui-language-static-chevron-001'),
  page+": language switch must show SVG flag and chevron even before JavaScript runs");
 assert.ok(html.includes("picker6")&&html.includes("errors.js?v=20261108-errors3"),page+": language picker and console diagnostics versions missing");
 if(page!=="offline")assert.ok(html.includes("auth.css?v=20261108-layout9"),page+": scoped scrollbars stylesheet version missing");
}
assert.ok(lang.includes("function initLanguagePicker()")&&lang.includes("trigger.addEventListener(\"click\",open)"),
 "Language toggle must initialize early and open the full modal");
assert.ok(css.includes(".register-page .field:has(input.control)>span:first-child")&&
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
for(const name of ["legal","terms","privacy","cookies"]){
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
