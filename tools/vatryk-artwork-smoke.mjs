// Offline VATRA mascot and system-avatar regression.
// Verify repository PNG assets and user-visible state wiring, never query Supabase.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const base=await readFile("assets/css/base.css","utf8");
const profile=await readFile("assets/css/profile.css","utf8");
const notFound=await readFile("assets/css/not-found.css","utf8");
const avatar=await readFile("assets/js/avatar.js","utf8");
const html=await readFile("404.html","utf8");

const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
for(const kind of ["404","blocked","deleted","not-found"]){
 const path="assets/vatryk/vatryk-"+kind+".png";
 const bytes=await readFile(path);
 assert.ok(bytes.subarray(0,8).equals(pngSignature),path+" must be a real PNG");
 assert.equal(bytes.toString("ascii",12,16),"IHDR",path+" must have a PNG header");
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert.ok(width>=100&&height>=100&&width<=8192&&height<=8192,
  path+" image dimensions must be valid: "+width+"x"+height);
 assert.ok(bytes.length>1000,path+" must not be an empty placeholder");
 if(kind==="404"){
  assert.ok(html.includes('src="/VATRA/'+path+'"'),
   "The error page must use the checked-in Vatryk PNG");
 }else{
  const url="/VATRA/"+path;
  assert.ok(base.includes('--vatra-'+kind+'-avatar:url("'+url+'")'),
   "System-avatar CSS must use the exact local asset for "+kind);
  assert.ok(avatar.includes(kind+':"'+url+'"')||
   avatar.includes('"'+kind+'":"'+url+'"'),
   "The existing avatar.asset API must expose the corresponding local PNG");
  assert.ok(profile.includes('profile-avatar[data-vatra-avatar-state="'+kind+'"]'),
   "Full profile portrait must recognize "+kind);
 }
}
assert.ok(base.includes('--vatra-default-avatar:url("data:image/svg+xml,'),
 "Normal accounts must keep the existing neutral avatar");
assert.ok(html.includes('class="sr-only vt-404-accessible-title-001"')&&
 html.includes('class="ui-404-vatryk-001"')&&
 !html.includes('class="account-card error-card')&&
 !html.includes('class="error-code')&&
 !html.includes('class="error-description'),
 "404 must have an accessible heading but no visible text/card");
assert.ok(notFound.includes(".error-page .account-top-inner")&&
 notFound.includes("justify-content:space-between")&&
 notFound.includes(".error-main .ui-404-vatryk-001")&&
 notFound.includes('html.vatra-dynamic-route-pending body.error-page'),
 "404 must stay balanced and preserve the GitHub Pages /idN router");
console.log("VATRA: four original PNGs verified; centered 404 and three distinct system avatars passed.");
