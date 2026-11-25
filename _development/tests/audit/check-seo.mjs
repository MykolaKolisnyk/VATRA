import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
const read=path=>readFile(path,"utf8");
const BASE="https://mykolakolisnyk.github.io/VATRA/";
const pages=["index","404","create-account","forgot","reset","verify","feed","profile","documents","terms","privacy","cookies","commerce","offline","maintenance"];
const publicPages=new Set(["index","documents","terms","privacy","cookies","commerce"]);
const sensitive=new Set(["404","create-account","forgot","reset","verify","feed","profile"]);
const css=await read("assets/css/base.css");
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
 assert.ok(/\bsrc=["'](?:\/VATRA\/)?assets\/js\/lang\.js(?:\?(?:v=[^"']+|rev=[a-f0-9]{40}))?["']/.test(html),
  filename+": shared JSON translation loader missing");
 if(publicPages.has(page)){
  for(const tag of ['rel="canonical"','name="description"','property="og:title"','property="og:image"']){
   assert.ok(html.includes(tag),filename+": "+tag+" missing");
  }
  assert.ok(html.includes('name="robots" content="index,follow'),filename+": must be indexable");
  const url=BASE+(page==="index"?"":page);
  assert.ok(html.includes('href="'+url+'"'),filename+": canonical URL should be unique");
  assert.ok(sitemap.includes('<loc>'+url+'</loc>'),filename+": missing sitemap URL");
 }
 if(page==="maintenance")assert.ok(html.includes('name="robots" content="noindex,nofollow"'),"Maintenance must not be indexed");
 if(sensitive.has(page))assert.ok(html.includes('name="robots" content="noindex,follow"'),filename+": sensitive page should not be indexed");
 if(page==="index")assert.ok(html.includes('type="application/ld+json"'),"Missing website structured data");
 if(["terms","privacy","cookies","commerce"].includes(page))assert.ok(html.includes('href="documents" class="vatra-document-back-001"')&&!html.includes("policy-navigation-header")&&!html.includes("policy-tabs-shell"),page+": documents may expose only the return-to-documents header link");
 if(page==="documents")for(const target of ["terms","privacy","cookies","commerce"])assert.ok(html.includes('href="'+target+'" aria-labelledby="vatra-documents-title-'+target+'-001"'),"Documents hub must link all four policies");
 const ukMeta=uk.__pages[page].meta,enMeta=en.__pages[page].meta;
 assert.ok(ukMeta.title&&enMeta.title&&ukMeta.title!==enMeta.title,filename+": localized titles missing");
 assert.ok(Object.keys(uk.__pages[page].nodes).length>=(page==="404"?2:3),filename+": Ukrainian dictionary incomplete");
 assert.deepEqual(Object.keys(uk.__pages[page].nodes).sort(),Object.keys(en.__pages[page].nodes).sort(),
  filename+": dictionary node keys must correspond");
}
assert.equal((sitemap.match(/<loc>/g)||[]).length,publicPages.size,"Exactly one sitemap entry per canonical public VATRA URL");
assert.ok(!sitemap.includes("legal.html"),"Deleted overview must not remain indexed");
await assert.rejects(stat("legal.html"),{code:"ENOENT"},"Deleted document overview must not exist");
assert.ok(!/\/VATRA\/(?:ua|en)\//.test(sitemap),"Old locale URLs must not be in sitemap");
// Social previews use the current V symbol and the localized welcome metadata.
const preview=await read("index.html");
const homeMeta=uk.__pages.index.meta;
assert.equal(homeMeta.title,"VATRA — ласкаво просимо до своїх");
assert.ok(homeMeta.description.includes("Увійдіть або створіть акаунт")&&homeMeta.description.length<=160);
assert.ok(
 preview.includes('<title>'+homeMeta.title+'</title>')&&
 preview.includes('name="description" content="'+homeMeta.description+'"')&&
 preview.includes('property="og:title" content="'+homeMeta.title+'"')&&
 preview.includes('property="og:description" content="'+homeMeta.description+'"')&&
 preview.includes('name="twitter:title" content="'+homeMeta.title+'"')&&
 preview.includes('name="twitter:description" content="'+homeMeta.description+'"')&&
 preview.includes('/VATRA/assets/logo/logo_app-icon.webp?v=20261118')&&
 preview.includes('property="og:image:width" content="2048"')&&
 !preview.includes('/VATRA/assets/logo/logo.webp')&&
 (await stat("assets/logo/logo_app-icon.webp")).size>10000,
 "Public social previews must show the current VATRA icon and one concise title/description");
for(const page of publicPages){
 const html=await read(page+".html");
 assert.ok(html.includes('og:image" content="'+BASE+'assets/logo/logo_app-icon.webp?v=20261118"'),
  page+": public social card must share the current V icon");
 assert.equal((html.match(/rel="icon" type="image\/svg\+xml"/g)||[]).length,1,
  page+": duplicate SVG favicon link");
}
console.log("VATRA: one canonical HTML per page, bilingual JSON, metadata, and sitemap verified.");
