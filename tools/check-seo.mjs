import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
const get=async path=>readFile(path,"utf8");
const css=await get("assets/css/auth.css");
assert.ok(css.includes('@font-face')&&css.includes('../fonts/Onest-Variable.ttf'));
assert.ok(!css.includes("fonts.googleapis.com")&&!css.includes("fonts.gstatic.com"));
const font=await stat("assets/fonts/Onest-Variable.ttf");
assert.ok(font.size>100000,"Local font data missing");
const home=await get("index.html");
for(const v of ['rel="canonical"','name="description"','name="robots" content="index,follow','property="og:title"','property="og:image"','name="twitter:card"','type="application/ld+json"','href="assets/fonts/Onest-Variable.ttf"'])assert.ok(home.includes(v),"Home meta missing: "+v);
assert.ok(!home.includes('http-equiv="refresh"'),"Public home should be crawlable without meta redirect");
for(const path of ["auth.html","register.html","forgot.html","reset.html","account.html","legal.html"]){const html=await get(path);assert.ok(html.includes('name="robots" content="noindex,follow"'),"Sensitive route must not index: "+path);assert.ok(html.includes('assets/css/auth.css?v=2'));
assert.ok(!html.includes("fonts.googleapis.com"));}
const map=await get("sitemap.xml");assert.ok(map.includes("https://mykolakolisnyk.github.io/VATRA/"));
console.log("VATRA: local Onest, index metadata, noindex auth and sitemap verified.");
