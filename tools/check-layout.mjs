import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
const read=path=>readFile(path,"utf8");
const pages=["index","404","register","forgot","reset","account","legal","terms","privacy","cookies","offline"];
const emailNames=["confirmation","invite","recovery","magic-link","email-change","reauthentication","password-changed","email-address-changed"];
const css=await read("assets/css/auth.css");
const legalCss=await read("assets/css/legal.css");
const auth=await read("assets/js/auth.js");
const captcha=await read("assets/js/captcha.js");
const lang=await read("assets/js/lang.js");
const sw=await read("sw.js");
const host=await read("assets/js/host.js");
const network=await read("assets/js/network.js");
const offline=await read("offline.html");
const uk=JSON.parse(await read("assets/i18n/uk.json"));
const en=JSON.parse(await read("assets/i18n/en.json"));
assert.ok(css.includes("Onest-Variable.ttf")&&legalCss.includes("max-width:767px"),"Local styles missing");
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,"Unbalanced CSS");
assert.ok(auth.includes("await window.VATRA_LANGUAGE?.ready"),"Auth must wait for translated fields");
assert.ok(auth.includes('auth.auth.signInWithPassword(')&&auth.includes('auth.auth.signUp('),"Email sign in/up missing");
assert.ok(auth.includes('auth.auth.verifyOtp({email,token,type:"recovery"})'),"Password OTP recovery missing");
assert.ok(auth.includes('auth.auth.resetPasswordForEmail('),"Recovery email request missing");
assert.ok(auth.includes('auth.auth.updateUser({password})'),"Password update missing");
assert.ok(auth.includes('preferred_locale:english?"en":"uk"'),"Signup must store selected email language");
assert.ok(!auth.includes("signInWithOtp({phone")&&!auth.includes("signUp({phone"),"Phone authentication prohibited");
assert.ok(lang.includes('fetch(ROOT + "assets/i18n/" + current + ".json"'),"Both JSON dictionaries must be loaded");
assert.ok(lang.includes('document.querySelectorAll("[data-i18n]")'),"DOM translation bindings missing");
assert.ok(lang.includes('location.reload()'),"Language selection must reuse the same page URL");

/* Verify language selection across independent page loads, cookie fallback,
   old Ukrainian bookmarks, and browsers which reject cookies. */
const languageStart=lang.indexOf("  const LANGUAGE_KEY = ");
const languageEnd=lang.indexOf("  /* A single URL per page.",languageStart);
assert.ok(languageStart>=0&&languageEnd>languageStart,"Persistent language helper missing");
const preferences=new Function("document","location","localStorage","ROOT","localFile",
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
assert.ok(lang.includes('["uk","Українська","Ukrainian","ua"]')&&
 lang.includes('["en","English","English","gb"]')&&
 !lang.includes("In development")&&!lang.includes("У розробці")&&
 !lang.includes("assets/flags/"),
 "Language picker must show only working locales with inline SVG flags");
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
assert.equal((landing.match(/class="orbit-node orbit-message /g)||[]).length,3,"Three large outer labels required");
for(const feature of features){
 assert.ok(landing.includes('feature-'+feature+' ui-inner-node-'),"Missing feature "+feature);
 assert.ok(landing.includes('class="ui-orbit-'+feature+'-svg"'),"No custom SVG for "+feature);
 assert.ok(landing.includes('id="ua-orbit-tip-'+feature+'"'),"Tooltip missing "+feature);
}
assert.ok(css.includes('--inner-radius:min(19cqw,125px)')&&css.includes('--outer-radius:min(37cqw,245px)'),
 "Orbit radius must keep small icons away from central V");
assert.ok(css.includes("animation-play-state:paused"),"Readable hover tooltip animation missing");
assert.ok(landing.includes("Ваші люди. Ваші історії. Ваша VATRA."),"Complete brand footer missing");
const register=await read("register.html"),forgot=await read("forgot.html"),reset=await read("reset.html");
for(const file of [register,forgot,reset])assert.ok(file.includes("assets/js/auth.js"),"Shared auth module not loaded");
for(const file of [landing,register,forgot]){
 assert.ok(file.includes('src="assets/js/captcha.js"'),"Cloudflare widget not loaded");
 assert.ok(file.indexOf('src="assets/js/captcha.js"')<file.indexOf('src="assets/js/auth.js"'),"Cloudflare must load before auth");
}
assert.ok(register.includes('id="consent"')&&register.includes('id="signup-form"'),"Signup consent or form missing");
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
for(const script of ["assets/js/auth.js","assets/js/lang.js","assets/js/captcha.js","assets/js/host.js","assets/js/network.js","sw.js"]){
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
