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
// All first-visit Vatryk tour steps, controls, hints and milestone states
// should be translated together, without partial Ukrainian tutorial content.
const tourStart=dynamicKeys.indexOf("Твоя стрічка");
const tourEnd=dynamicKeys.indexOf("Поділися моментом у короткій історії. Історії зникають через 24 години.");
assert.ok(tourStart>=0&&tourEnd>=tourStart,"Missing tour anchors in reference dictionary");
const tourMessages=dynamicKeys.slice(tourStart,tourEnd+1);
assert.equal(tourMessages.length,68,"Unexpected change in Vatryk tour translation group");


const langJs=await readFile("assets/js/lang.js","utf8");
const verifyRuntime=await readFile("assets/js/verify.js","utf8");
const signupRuntime=await readFile("assets/js/create-account.js","utf8");
const verificationKeys=[
 "Підтвердження пошти не завершено",
 "Якщо пошту вже підтверджено, увійдіть за email і паролем. Інакше запросіть новий лист на пристрої реєстрації.",
 "Перейти до входу",
 "Вітаємо, {name}!"
];
for(const key of verificationKeys){
 assert.ok(typeof en[key]==="string"&&en[key].trim(),
  "English verification translation missing: "+key);
 assert.ok(verifyRuntime.includes('translate("'+key+'")'),
  "Verification message must come from locale dictionary: "+key);
}
assert.ok(verifyRuntime.includes('replace("{name}",name)'),
 "Localized named greeting must interpolate the displayed name");
assert.ok(signupRuntime.includes('preferred_locale:window.VATRA_LANGUAGE?.locale||"uk"')&&
 signupRuntime.includes('new Intl.DateTimeFormat(dateLocales[locale]||"uk-UA"'),
 "Signup locale metadata and date names should follow active language preference");

const authRuntimeSource=await readFile("assets/js/auth-core.js","utf8");
const pendingPasswordLocaleKeys=[
 "Використайте щонайменше 12 символів.",
 "Використайте не більше 128 символів.",
 "Додайте малу латинську літеру (a–z).",
 "Додайте велику латинську літеру (A–Z).",
 "Додайте цифру (0–9).",
 "Додайте спеціальний символ (наприклад, ! або @).",
 "Вилучити збережений акаунт",
 "Введіть пароль.",
 "Встановіть новий пароль"
];
const signInRuntime=await readFile("assets/js/sign-in.js","utf8");
const recoveryRuntime=await readFile("assets/js/recovery.js","utf8");
for(const key of pendingPasswordLocaleKeys){
 assert.ok(typeof en[key]==="string"&&en[key].trim(),
  "Missing English auth and recovery text: "+key);
}
for(const key of pendingPasswordLocaleKeys.slice(0,6)){
 assert.ok(authRuntimeSource.includes('return "'+key+'";'),
  "Password policy must return the untranslated source key: "+key);
}
assert.ok(signInRuntime.includes('translate("Вилучити збережений акаунт")')&&
 signInRuntime.includes('translate("Введіть пароль.")'),
 "Saved account actions must use locale dictionaries");
assert.ok(recoveryRuntime.includes('translate("Повторити через")')&&
 recoveryRuntime.includes('translate("Встановіть новий пароль")'),
 "Recovery steps and countdown must use locale dictionaries");

const authRuntimeKeys=[
 "Виберіть новий пароль, який відрізняється від попереднього.",
 "Пароль не відповідає вимогам сервера. Перевірте правила під полем пароля.",
 "Створення акаунтів тимчасово недоступне."
];
assert.ok(langJs.includes('translate: raw => (typeof errors[raw] === "string" && errors[raw]) ? errors[raw] : raw'),
 "All prepared locales must use the same dynamic dictionary lookup");
for(const key of authRuntimeKeys){
 assert.ok(authRuntimeSource.includes('return "'+key+'";'),
  "Auth runtime must emit the Ukrainian translation key: "+key);
 assert.ok(typeof en[key]==="string"&&en[key].trim(),
  "English auth runtime translation is missing: "+key);
}


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
  code+": locale-specific JavaScript paths still require localization before launch");
 assert.equal(status.shared_catalog_complete,true,
  code+": all shared UK-source translation keys must be present before publishing");
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
 let untranslatedTour=0;
 for(const source of tourMessages){
  const output=dictionary[source];
  assert.ok(typeof output==="string"&&output.trim(),
   code+": untranslated Vatryk tutorial text: "+source);
  if(output.trim()===source.trim())untranslatedTour++;
 }
 assert.ok(untranslatedTour<tourMessages.length*0.05,
  code+": too much Ukrainian text in Vatryk tutorial: "+untranslatedTour);
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
 for(const key of [...authRuntimeKeys,...pendingPasswordLocaleKeys,...verificationKeys]){
  assert.ok(typeof dictionary[key]==="string"&&dictionary[key].trim()!==key,
   code+": auth/recovery runtime message not localized: "+key);
 }
 const missing=dynamicKeys.filter(key=>typeof dictionary[key]!=="string"||!dictionary[key].trim());
 assert.deepEqual(missing,[],code+": shared source key coverage must be complete");
 const covered=dynamicKeys.length;
 const untranslated=dynamicKeys.filter(key=>dictionary[key].trim()===key.trim());
 assert.ok(untranslated.length<=8,
  code+": unexpectedly many shared phrases remain in Ukrainian: "+untranslated.join(" | "));
 for(const key of Object.keys(dictionary).filter(key=>!key.startsWith("__")))
  assert.ok(typeof dictionary[key]==="string"&&dictionary[key].trim(),
   code+": invalid shared translation for "+key);
 assert.deepEqual([...targetPages].sort(),Object.keys(dictionary.__pages).sort(),
  code+": all 12 static pages must be present in the catalog");
 console.log("VATRA "+code+": "+activePages.length+"/"+targetPages.length+
  " static page catalogs; "+texts+" UI fields; "+covered+"/"+dynamicKeys.length+
  " shared translation keys; locale-specific JavaScript, legal review and email templates pending");
}
console.log("VATRA unpublished locale integrity and rollout gate: OK");
