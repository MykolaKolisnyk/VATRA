import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

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
const pages=["index.html","register.html","forgot.html","reset.html","account.html","legal.html","terms.html","privacy.html","cookies.html","offline.html"];
const paths=["index.html","404.html",...["ua","en"].flatMap(locale=>pages.map(name=>locale+"/"+name)),...["confirmation","recovery","magic-link","reauthentication"].map(name=>"email-templates/"+name+".html")];
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
const sw=await read("sw.js");
assert.ok(sw.includes('const CACHE="vatra-offline-shell"'),"Stable, non-versioned cache key is required");
console.log("VATRA: "+paths.length+" site/email pages, "+count+" visible text nodes with distinct class names, individually classed interface elements and responsive typography.");
