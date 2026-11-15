// VATRA release gate for unpublished i18n dictionaries.
// Runs entirely offline. It never loads user data, Supabase or translation APIs.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=async code=>JSON.parse(await readFile("assets/i18n/"+code+".json","utf8"));
const uk=await read("uk");
const en=await read("en");
const codes=["pl","de","fr","it","ka","bg"];
const targetPages=Object.keys(uk.__pages);
const activePages=["index","404","feed","profile","offline","verify",
 "create-account","forgot","reset","terms","privacy","cookies"];
const dynamicKeys=Object.keys(en).filter(key=>key!=="__pages");
// Account sign-in, validation, recovery, connection, post and session status
// messages must be localized as one coherent release batch across all six languages.
const criticalStart=dynamicKeys.indexOf("Зачекайте…");
const criticalEnd=dynamicKeys.indexOf("Зміна email до підтвердження створить інший акаунт. Початковий непідтверджений акаунт не зміниться.");
assert.ok(criticalStart>=0&&criticalEnd>criticalStart,"Missing dynamic status anchors in reference dictionary");
const criticalMessages=dynamicKeys.slice(criticalStart,criticalEnd+1);
assert.equal(criticalMessages.length,74,"Unexpected change in high-priority auth/status message set");

const langJs=await readFile("assets/js/lang.js","utf8");

assert.ok(langJs.includes('const validLanguage = value => value === "uk" || value === "en";'),
 "Do not publish incomplete translations as selectable languages");
const pickerEntries=langJs.slice(langJs.indexOf("  const languages = ["),
 langJs.indexOf("  const flagGroups="));
const pickerCodes=[...pickerEntries.matchAll(/\["([a-z]{2})","[^"]+","[^"]+","[a-z]{2}"(,true)?\]/g)]
 .map(match=>({code:match[1],enabled:!!match[2]}));
assert.deepEqual(pickerCodes.map(item=>item.code),["uk","en",...codes],
 "Only eight requested language options may remain");
assert.deepEqual(pickerCodes.filter(item=>item.enabled).map(item=>item.code),["uk","en"],
 "Unfinished languages must remain unavailable");
for(const code of codes){
 const dictionary=await read(code);
 const status=dictionary.__translation_status;
 assert.deepEqual(status.translated_static_pages,activePages,
  code+": localized static page manifest must match all twelve page catalogs");
 assert.equal(status.dynamic_strings_complete,false,
  code+": dynamic JavaScript messages still require a dedicated translation audit");
 assert.equal(status.email_templates_complete,false,
  code+": untranslated Supabase email templates must not be marked ready");
 assert.equal(status.legal_review_complete,false,
  code+": legal translations require expert review before launch");
 assert.deepEqual(Object.keys(dictionary.__pages).sort(),[...activePages].sort(),
  code+": no translated page may be missing or have extra keys");
 let texts=0,unchanged=0;
 for(const page of activePages){
  const original=uk.__pages[page];
  const localized=dictionary.__pages[page];
  assert.ok(localized,code+": missing "+page);
  assert.deepEqual(Object.keys(localized.meta||{}).sort(),Object.keys(original.meta||{}).sort(),
   code+": metadata keys mismatch on "+page);
  assert.deepEqual(Object.keys(localized.nodes||{}).sort(),Object.keys(original.nodes||{}).sort(),
   code+": node keys mismatch on "+page);
  for(const [id,node] of Object.entries(original.nodes||{})){
   const translated=localized.nodes[id];
   for(const field of ["text","attrs"]){
    assert.deepEqual(Object.keys(translated[field]||{}).sort(),Object.keys(node[field]||{}).sort(),
     code+": missing "+page+" "+id+" "+field);
    for(const [attribute,sourceText] of Object.entries(node[field]||{})){
     const value=translated[field][attribute];
     assert.equal(typeof value,"string",code+": non-string "+page+"/"+id+"/"+attribute);
     assert.ok(value.trim(),code+": empty translation "+page+"/"+id+"/"+attribute);
     texts++;
     if(value.trim()===sourceText.trim())unchanged++;
    }
   }
  }
 }
 assert.ok(unchanged<texts*0.08,
  code+": too many strings remain in source language ("+unchanged+"/"+texts+")");
 let untranslatedCritical=0;
 for(const source of criticalMessages){
  const output=dictionary[source];
  assert.ok(typeof output==="string"&&output.trim(),
   code+": missing critical UI status: "+source);
  if(output.trim()===source.trim())untranslatedCritical++;
 }
 assert.ok(untranslatedCritical<criticalMessages.length*0.05,
  code+": account and status messages must not remain in Ukrainian: "+
   untranslatedCritical+"/"+criticalMessages.length);
 const covered=dynamicKeys.filter(key=>typeof dictionary[key]==="string").length;
 assert.ok(covered>40&&covered<dynamicKeys.length,
  code+": dynamic translation coverage must be honestly incomplete");
 for(const key of Object.keys(dictionary).filter(key=>!key.startsWith("__")))
  assert.ok(typeof dictionary[key]==="string"&&dictionary[key].trim(),
   code+": invalid shared translation for "+key);
 assert.deepEqual([...targetPages].sort(),Object.keys(dictionary.__pages).sort(),
  code+": all 12 static pages must be present in the catalog");
 console.log("VATRA "+code+": "+activePages.length+"/"+targetPages.length+
  " static page catalogs; "+texts+" UI fields; "+covered+"/"+dynamicKeys.length+
  " shared dynamic phrases; legal review, dynamic JS and email templates pending");
}
console.log("VATRA unpublished locale integrity and rollout gate: OK");
