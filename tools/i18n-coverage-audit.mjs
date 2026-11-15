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
 "create-account","forgot","reset"];
const dynamicKeys=Object.keys(en).filter(key=>key!=="__pages");
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
  code+": localized static page manifest must match the actual nine translated page catalogs");
 assert.equal(status.dynamic_strings_complete,false,
  code+": dynamic JavaScript messages still require a dedicated translation audit");
 assert.equal(status.email_templates_complete,false,
  code+": untranslated Supabase email templates must not be marked ready");
 assert.deepEqual(Object.keys(dictionary.__pages).sort(),[...activePages].sort(),
  code+": do not ship unreviewed legal-page placeholders");
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
 const covered=dynamicKeys.filter(key=>typeof dictionary[key]==="string").length;
 assert.ok(covered>40&&covered<dynamicKeys.length,
  code+": dynamic translation coverage must be honestly incomplete");
 for(const key of Object.keys(dictionary).filter(key=>!key.startsWith("__")))
  assert.ok(typeof dictionary[key]==="string"&&dictionary[key].trim(),
   code+": invalid shared translation for "+key);
 const legal=targetPages.filter(page=>!dictionary.__pages[page]);
 assert.deepEqual(legal.sort(),["cookies","privacy","terms"].sort());
 console.log("VATRA "+code+": "+activePages.length+"/"+targetPages.length+
  " static page catalogs; "+texts+" UI fields; "+covered+"/"+dynamicKeys.length+
  " shared dynamic phrases; legal pages & email templates pending");
}
console.log("VATRA unpublished locale integrity and rollout gate: OK");
