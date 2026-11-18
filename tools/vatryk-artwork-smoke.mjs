// Offline VATRA artwork and missing-page regression.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const base=await readFile("assets/css/base.css","utf8");
const profile=await readFile("assets/css/profile.css","utf8");
const notFound=await readFile("assets/css/not-found.css","utf8");
const avatar=await readFile("assets/js/avatar.js","utf8");
const html=await readFile("404.html","utf8");
for(const kind of ["404","blocked","deleted","not-found"]){
 const path="assets/vatryk/"+(kind==="404"?"vatryk_detective.webp":"vatryk-"+kind+".webp");
 const bytes=await readFile(path);
 assert.ok(bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP"&&bytes.length>1000,path+" must be real WebP");
 if(kind==="404"){
  assert.ok(html.includes('class="ui-404-vatryk-001" aria-hidden="true"')&&notFound.includes('background-image:url("/VATRA/'+path+'")'));
 }else{
  const url="/VATRA/"+path;
  assert.ok(base.includes('--vatra-'+kind+'-avatar:url("'+url+'")'));
  assert.ok(avatar.includes(kind+':"'+url+'"')||avatar.includes('"'+kind+'":"'+url+'"'));
  assert.ok(profile.includes('profile-avatar[data-vatra-avatar-state="'+kind+'"]'));
 }
}
assert.ok(base.includes('--vatra-default-avatar:url("data:image/svg+xml,'));
assert.ok(html.includes('class="vt-404-accessible-title-001"')&&html.includes("Такої сторінки немає")&&html.includes('href="/VATRA/feed" class="error-home-link vt-404-link-002"'));
assert.ok(notFound.includes(".error-main .ui-404-vatryk-001")&&notFound.includes('html.vatra-dynamic-route-pending body.error-page'));
console.log("VATRA: four WebP artworks and 404 message/state wiring verified.");
