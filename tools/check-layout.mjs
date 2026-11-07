import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";

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
const paths=["index.html","404.html",...["ua","en"].flatMap(locale=>pages.map(name=>locale+"/"+name)),...["confirmation","invite","recovery","magic-link","email-change","reauthentication"].map(name=>"email-templates/"+name+".html")];
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
assert.ok(auth.includes("const COOLDOWN_MS=60000"),
 "Resend control must use the 60-second cooldown");
assert.ok(auth.includes("function wireForgot(){")&&auth.includes("wireReset();"),
 "Forgot password must also register inline code and new-password handlers");
assert.doesNotThrow(()=>new Function(auth),"VATRA authentication script has a syntax error");
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
    if(diskPath.endsWith("/"))diskPath+="index.html";
    assert.ok(!diskPath.includes("../"),path+": unsafe local asset path: "+value);
    try{assert.ok((await stat(diskPath)).isFile());}
    catch{assert.fail(path+": local asset or navigation target missing: "+value+" → "+diskPath);}
  }
}
const sw=await read("sw.js");
assert.ok(sw.includes('const CACHE="vatra-offline-shell"'),"Stable, non-versioned cache key is required");
console.log("VATRA: "+paths.length+" site/email pages, "+count+" visible text nodes with distinct class names, individually classed interface elements and responsive typography.");
