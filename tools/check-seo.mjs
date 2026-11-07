import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";

const read=path=>readFile(path,"utf8");
const BASE="https://mykolakolisnyk.github.io/VATRA/";
const locales=["ua","en"];
const documents=["index.html","register.html","forgot.html","reset.html","account.html","legal.html","terms.html","privacy.html","cookies.html","offline.html"];
const publicPages=new Set(["index.html","legal.html","terms.html","privacy.html","cookies.html"]);
const sensitivePages=new Set(["register.html","forgot.html","reset.html","account.html"]);
const css=await read("assets/css/auth.css");
assert.ok(css.includes("@font-face")&&css.includes("../fonts/Onest-Variable.ttf"),"The Onest font must be hosted locally");
assert.ok((await stat("assets/fonts/Onest-Variable.ttf")).size>100000,"Onest font file is missing");
assert.ok(!css.includes("fonts.googleapis.com"),"External Google Fonts should not be loaded");

const root=await read("index.html");
for(const key of ['rel="canonical"','name="description"','property="og:title"','property="og:image"','name="twitter:card"']){
  assert.ok(root.includes(key),"Language-routing homepage missing: "+key);
}
const sitemap=await read("sitemap.xml");
for(const locale of locales){
  for(const file of documents){
    const path=locale+"/"+file;
    const html=await read(path);
    assert.ok(html.includes('lang="'+(locale==="ua"?"uk":"en")+'"'),path+": incorrect HTML language");
    assert.ok(html.includes("VATRA"),path+": brand missing");
    if(publicPages.has(file)){
      for(const key of ['rel="canonical"','name="description"','property="og:title"','property="og:image"']){
        assert.ok(html.includes(key),path+": missing metadata "+key);
      }
      assert.ok(html.includes('name="robots" content="index,follow'),path+": should be indexable");
    }
    if(sensitivePages.has(file)){
      assert.ok(html.includes('name="robots" content="noindex,follow"'),path+": sensitive page should not be indexed");
    }
    if(file==="index.html"){
      assert.ok(html.includes('type="application/ld+json"'),path+": structured website metadata missing");
    }
    if(publicPages.has(file)){
      const url=BASE+locale+"/"+(file==="index.html"?"":file);
      assert.ok(sitemap.includes(url),path+": absent from sitemap");
    }
  }
}
console.log("VATRA: actual /ua/ and /en/ routes, metadata, sitemap, and local Onest verified.");
