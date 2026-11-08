import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
const read=path=>readFile(path,"utf8");
const BASE="https://mykolakolisnyk.github.io/VATRA/";
const pages=["index","404","register","forgot","reset","account","terms","privacy","cookies","offline"];
const publicPages=new Set(["index","terms","privacy","cookies"]);
const sensitive=new Set(["404","register","forgot","reset","account"]);
const css=await read("assets/css/auth.css");
assert.ok(css.includes("@font-face")&&css.includes("../fonts/Onest-Variable.ttf"),"Local Onest font missing");
assert.ok((await stat("assets/fonts/Onest-Variable.ttf")).size>100000,"Missing local font");
assert.ok(!css.includes("fonts.googleapis.com"),"No Google Fonts dependencies");
const uk=JSON.parse(await read("assets/i18n/uk.json"));
const en=JSON.parse(await read("assets/i18n/en.json"));
assert.deepEqual(Object.keys(uk.__pages).sort(),pages.slice().sort(),"Ukrainian dictionary must cover every root page");
assert.deepEqual(Object.keys(en.__pages).sort(),pages.slice().sort(),"English dictionary must cover every root page");
const sitemap=await read("sitemap.xml");
for(const page of pages){
 const filename=page+".html";
 const html=await read(filename);
 assert.ok(html.includes('<html lang="uk"'),filename+": source markup must use accessible Ukrainian fallback");
 assert.ok(html.includes("VATRA"),filename+": branding missing");
 assert.ok(!/\/VATRA\/(?:ua|en)\//.test(html),filename+": language subfolder link remains");
 assert.ok(/\bsrc=["'](?:\/VATRA\/)?assets\/js\/lang\.js(?:\?v=[^"']+)?["']/.test(html),
  filename+": shared JSON translation loader missing");
 if(publicPages.has(page)){
  for(const tag of ['rel="canonical"','name="description"','property="og:title"','property="og:image"']){
   assert.ok(html.includes(tag),filename+": "+tag+" missing");
  }
  assert.ok(html.includes('name="robots" content="index,follow'),filename+": must be indexable");
  const url=BASE+(page==="index"?"":filename);
  assert.ok(html.includes('href="'+url+'"'),filename+": canonical URL should be unique");
  assert.ok(sitemap.includes('<loc>'+url+'</loc>'),filename+": missing sitemap URL");
 }
 if(sensitive.has(page))assert.ok(html.includes('name="robots" content="noindex,follow"'),filename+": sensitive page should not be indexed");
 if(page==="index")assert.ok(html.includes('type="application/ld+json"'),"Missing website structured data");
 const ukMeta=uk.__pages[page].meta,enMeta=en.__pages[page].meta;
 assert.ok(ukMeta.title&&enMeta.title&&ukMeta.title!==enMeta.title,filename+": localized titles missing");
 assert.ok(Object.keys(uk.__pages[page].nodes).length>=3,filename+": Ukrainian dictionary incomplete");
 assert.deepEqual(Object.keys(uk.__pages[page].nodes).sort(),Object.keys(en.__pages[page].nodes).sort(),
  filename+": dictionary node keys must correspond");
}
assert.equal((sitemap.match(/<loc>/g)||[]).length,4,"Exactly four canonical public VATRA URLs");
assert.ok(!sitemap.includes("legal.html"),"Deleted overview must not remain indexed");
await assert.rejects(stat("legal.html"),{code:"ENOENT"},"Deleted document overview must not exist");
assert.ok(!/\/VATRA\/(?:ua|en)\//.test(sitemap),"Old locale URLs must not be in sitemap");
console.log("VATRA: one canonical HTML per page, bilingual JSON, metadata, and sitemap verified.");
