import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=p=>readFile(p,"utf8");
const css=await read("assets/css/auth.css");
assert.ok(css.includes("img{max-width:100%;height:auto;display:block}"),"Image height must respect logo aspect ratio");
assert.ok(css.includes(".header-logo img{width:100%;height:auto;aspect-ratio:1342/380}"),"Logo cannot be forced to SVG source pixel height");
for(const v of ["max-width:1199px","max-width:768px","max-width:480px","max-height:750px"]){assert.ok(css.includes(v),"Viewport handling missing: "+v);}
const legalCss=await read("assets/css/legal.css");assert.ok(legalCss.includes("max-width:1024px")&&legalCss.includes("max-width:767px"),"Legal tablet/phone breakpoints missing");
const host=await read("assets/js/host.js");assert.ok(host.includes('location.protocol === "https:"')&&host.includes('location.hostname === "mykolakolisnyk.github.io"'));
const docs=["index.html","auth.html","register.html","forgot.html","reset.html","account.html","legal.html","terms.html","privacy.html","cookies.html"];
for(const page of docs){const html=await read(page);assert.ok(html.includes('<script src="assets/js/host.js?v=1"></script>'),page+": missing host check");assert.ok(!/тестов|в розробці|у розробці|ще розробляється|тебе|твій|твої/i.test(html),page+": old copy left");}
const home=await read("index.html"),login=await read("auth.html");for(const html of [home,login])assert.ok(html.includes("Ваші люди.")&&html.includes("Ваші історії.")&&html.includes("Ваша VATRA."),"Approved slogan must appear");
assert.ok((await read("assets/js/auth.js")).includes("VATRA_HOST_ALLOWED===false"),"Auth should not run on blocked origins");
console.log("VATRA responsive desktop/tablet/mobile, formal copy, logo and hostname checks passed.");

// Public document navigation and readable policy text.
for(const path of ["legal.html","terms.html","privacy.html","cookies.html"]){
const html=await read(path);
for(const link of ["legal.html","terms.html","privacy.html","cookies.html"])assert.ok(html.includes('href="'+link+'"'),path+": no nav link "+link);
assert.ok(html.includes('aria-current="page"'),path+": active tab missing");
assert.ok(html.includes('assets/css/legal.css?v=2'),path+": wrong CSS version");
assert.ok(!/майбутн|у розробці|не запущен|тестов|попередня редакція/i.test(html),path+": release notes in legal text");
if(path!=="legal.html")assert.ok(html.includes('policy-mobile-toc'),path+": mobile table of contents missing");
}
assert.ok(legalCss.includes('min-height:50px')&&legalCss.includes('min-height:46px'),"Document tabs too small");
