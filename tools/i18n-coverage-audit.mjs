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
const socialShell=await readFile("assets/js/social-shell.js","utf8");
const socialShellKeys=[
 "Зрозуміло",
 "Цей розділ готується до запуску у VATRA. Поки він не має активних даних або повідомлень.",
 "Перегляд історії",
 "Закрити",
 "Результати пошуку",
 "Очистити пошук",
 "Шукаємо у VATRA…",
 "Люди",
 "Публікації",
 "Медіапублікація",
 "Дописи спільнот",
 "Стрічка VATRA",
 "Збігів немає. Спробуйте інший запит.",
 "Показати всі результати",
 "Не вдалося виконати пошук.",
 "Готово",
 "Редагувати",
 "Історія запитів",
 "Назад до VATRA",
 "Шукати: ",
 "Видалити пошук: ",
 "Немає збігів в історії",
 "Історія пошуку порожня",
 "Нещодавні",
 "Очистити всю історію",
 "Історії",
 "Месенджер",
 "Меню акаунта",
 "Кількість запитів: {count}",
 "Ваша історія"
];
assert.ok(socialShell.includes("window.VATRA_LANGUAGE?.translate?.(uk)")&&
 socialShell.includes("const t=tr;")&&
 socialShell.includes('tr("Кількість запитів: {count}","Searches: {count}")')&&
 socialShell.includes("window.VATRA_LANGUAGE.ready.then(boot)"),
 "Shared social shell must localize controls after loading the matching catalog");
for(const key of socialShellKeys){
 assert.ok(typeof en[key]==="string"&&en[key].trim(),
  "English social-shell translation missing: "+key);
}

const giftRuntime=await readFile("assets/js/gifts.js","utf8");
const giftViewerRuntime=await readFile("assets/js/gift-viewer.js","utf8");
const giftsMarkup=await readFile("gifts.html","utf8");
const giftKeys=[
 "У колекції",
 "Безкоштовний",
 "У цій колекції поки немає подарунків.",
 "Подарунки · VATRA",
 "Не вдалося завантажити колекцію.",
 "Не вдалося відкрити подарунки. Оновіть сторінку.",
 "Перший вогник",
 "Перший вогник VATRA — знак початку вашої історії. Його отримує кожен, хто приєднався до VATRA.",
 "Привітальний подарунок",
 "Закрити подарунок",
 "Стрічка",
 "Техпідтримка",
 "← На профіль",
 "КОЛЕКЦІЯ VATRA",
 "Подарунки",
 "Збирайте особливі подарунки та зберігайте теплі моменти.",
 "Мої",
 "Безкоштовні"
];
assert.equal(giftKeys.length,18,"Unexpected gifts translation key count");
for(const source of [giftRuntime,giftViewerRuntime]){
 assert.ok(source.includes("window.VATRA_LANGUAGE?.translate?.(uk)")&&
  source.includes('const language=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";')&&
  !source.includes('const en=()=>document.documentElement.lang==="en";'),
  "Gift cards and gift viewer must use a shared locale dictionary");
}
for(const key of giftKeys){
 assert.ok(typeof en[key]==="string"&&en[key].trim(),
  "Missing English gift translation: "+key);
 assert.ok(giftRuntime.includes(key)||giftViewerRuntime.includes(key)||
  giftsMarkup.includes('data-social-uk="'+key+'"'),
  "Gift translation has no source reference: "+key);
}

const postMediaRuntime=await readFile("assets/js/post-media.js","utf8");
assert.ok(postMediaRuntime.includes("window.VATRA_LANGUAGE?.translate?.(uk)")&&
 postMediaRuntime.includes('const language=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";')&&
 !postMediaRuntime.includes('const tr=(uk,en)=>document.documentElement.lang==="en"?en:uk;'),
 "Post media must use the shared locale dictionary");
// Read labels from actual post media controls, including aria and error strings.
const postMediaKeys=[...new Set([...postMediaRuntime.matchAll(/tr\(\s*("(?:\\.|[^"\\])*")\s*,\s*("(?:\\.|[^"\\])*")\s*\)/g)]
 .map(match=>JSON.parse(match[1])))];
assert.equal(postMediaKeys.length,33,"Unexpected source key count in post media runtime");
for(const key of postMediaKeys){
 assert.ok(typeof en[key]==="string"&&en[key].trim(),
  "English post media translation missing: "+key);
 assert.equal(en[key].endsWith(" "),key.endsWith(" "),
  "English post media prefix whitespace mismatch: "+key);
}
const communityRuntime=await readFile("assets/js/communities.js","utf8");
const communityPages=[
 await readFile("communities.html","utf8"),
 await readFile("club.html","utf8")
];
const communityKeys=[
 "Не вдалося відкрити VATRA",
 "Не вдалося відкрити сторінку. Оновіть її.",
 "Спільноти · VATRA",
 "Назва: 3–80 символів. Опис: до 1200 символів.",
 "Створення спільноти…",
 "Не вдалося створити спільноту. Повторіть спробу.",
 "Без опису",
 "За цим запитом спільнот не знайдено.",
 "Спільнот поки немає. Створіть першу!",
 "Не вдалося завантажити список спільнот.",
 "Відписатися",
 "Підписатися",
 "У спільноті ще немає дописів. Створіть перший!",
 "Підпишіться на спільноту, щоб читати її дописи.",
 "Не вдалося завантажити публікації.",
 "Не вдалося перевірити підписку.",
 "Не вдалося змінити підписку.",
 "Додайте текст, фото або відео (до 2000 символів).",
 "Не вдалося опублікувати допис.",
 "Спільноту не знайдено",
 "Ця спільнота не існує або її видалено.",
 "Спільноту не знайдено · VATRA",
 "Не вдалося завантажити спільноту.",
 "Опису поки немає.",
 "Створити спільноту",
 "Назва спільноти",
 "Опис (необов’язково)",
 "Створити",
 "Усі спільноти",
 "Спільнота",
 "Про спільноту",
 "Допис у спільноту",
 "Публікації спільноти",
 "Завантажити ще",
 "Допис у спільноті",
 "Ваш допис",
 "Фото / відео",
 "Прибрати файл",
 "Скасувати",
 "Опублікувати",
 "Наприклад, Українська музика",
 "Про що ваша спільнота?"
];
assert.equal(communityKeys.length,42,"Unexpected community localization key count");
assert.ok(communityRuntime.includes('const activeLocale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";')&&
 communityRuntime.includes("window.VATRA_LANGUAGE?.translate?.(uk)")&&
 communityRuntime.includes("element.textContent=t(element.dataset.communityUk,element.dataset.communityEn)")&&
 communityRuntime.includes("new Intl.DateTimeFormat(locale,{")&&
 !communityRuntime.includes('const english=document.documentElement.lang==="en";'),
 "Community controls and dates must use the selected locale");
for(const key of communityKeys){
 assert.ok(typeof en[key]==="string"&&en[key].trim(),
  "English community locale missing: "+key);
 assert.ok(communityRuntime.includes(key)||communityPages.some(html=>html.includes('data-community-uk="'+key+'"')),
  "Community translation key is no longer in source: "+key);
}

const composerRuntime=await readFile("assets/js/post-composer-ui.js","utf8");
const composerKeys=[
 "Новий пост",
 "Чернетки",
 "Мої чернетки на цьому пристрої",
 "Закрити редактор",
 "Додайте фото або відео",
 "Завантажити з пристрою",
 "Фото JPG, PNG, WebP або відео MP4, WebM",
 "Напишіть що-небудь…",
 "Налаштування публікації",
 "Перевірте допис та виберіть, хто його побачить.",
 "Публікація з’явиться одразу після натискання «Опублікувати».",
 "Ваші чернетки",
 "Чернетки зберігаються лише в цьому браузері. Фото та відео не зберігаються.",
 "ⓘ  Поради щодо публікації",
 "Діліться своїм, поважайте приватність інших та обирайте видимість допису перед публікацією.",
 "Зберегти чернетку",
 "Налаштування",
 "Без тексту",
 "Видалити чернетку",
 "Чернеток поки немає.",
 "Напишіть текст для збереження чернетки.",
 "Текст збережено. Доданий файл потрібно вибрати знову при публікації.",
 "Чернетку збережено в цьому браузері.",
 "Неможливо зберегти чернетку в цьому браузері."
];
assert.equal(composerKeys.length,24,"Unexpected composer translation key count");
assert.ok(composerRuntime.includes("window.VATRA_LANGUAGE?.translate?.(uk)")&&
 !composerRuntime.includes('const en=()=>document.documentElement.lang==="en";'),
 "Post composer must use the shared locale dictionary, not only UK/EN");
for(const key of composerKeys){
 assert.ok(typeof en[key]==="string"&&en[key].trim(),"Missing English composer label: "+key);
 assert.ok(composerRuntime.includes("t("+JSON.stringify(key)),
  "Composer no longer uses the localized key: "+key);
}

const friendsRuntime=await readFile("assets/js/friends.js","utf8");
const friendsKeys=[
 "Дію виконано, але список не оновився. Оновіть сторінку.",
 "Не вдалося виконати дію.",
 "Ваш друг у VATRA",
 "Хоче додатися до друзів",
 "Запит надіслано",
 "Профіль і повідомлення",
 "Прийняти",
 "Видалити з друзів",
 "Відхилити",
 "Скасувати запит",
 "За запитом нічого не знайдено.",
 "Друзів поки немає.",
 "Немає нових запитів у друзі.",
 "Немає надісланих запитів.",
 "Приватність друзів",
 "Друзі · VATRA",
 "Списки друзів інших користувачів приватні.",
 "Не вдалося завантажити друзів.",
 "Не вдалося відкрити друзів. Оновіть сторінку."
];
assert.equal(friendsKeys.length,19,"Unexpected friend-area translation key count");
assert.ok(friendsRuntime.includes("window.VATRA_LANGUAGE?.translate?.(uk)")&&
 friendsRuntime.includes('const language=()=>window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";')&&
 !friendsRuntime.includes('const en=()=>document.documentElement.lang==="en";'),
 "Friend-page messages must use the active dictionary, not UK/EN branches");
for(const key of friendsKeys){
 assert.ok(typeof en[key]==="string"&&en[key].trim(),
  "English friend-page translation missing: "+key);
}

const notificationRuntime=await readFile("assets/js/notifications.js","utf8");
const notificationKeys=[
 "{name} хоче додатися до вас у друзі",
 "{name}: вашу заявку в друзі прийнято",
 "{name}: вподобайка вашої публікації",
 "{name}: вподобайка вашого коментаря",
 "{name}: вподобайка вашого фото профілю",
 "{name}: вподобайка коментаря під фото",
 "{name}: нова подія",
 "Сповіщення: {count} непрочитаних",
 "Учасник VATRA ID {id}",
 "Сторінка {page}",
 "Видалити сповіщення",
 "Акаунт видалено",
 "Акаунт заблоковано",
 "Сповіщень поки немає.",
 "Не вдалося завантажити сповіщення. Спробуйте ще раз.",
 "Ваші сповіщення",
 "Закрити сповіщення",
 "Відкрити всі сповіщення",
 "Сповіщення · VATRA",
 "Не вдалося завантажити сповіщення. Оновіть сторінку."
];
const interpolationTokens=value=>[...value.matchAll(/\{(name|count|page|id)\}/g)]
 .map(match=>match[1]).sort();
assert.equal(notificationKeys.length,20,"Unexpected notification translation key count");
assert.ok(notificationRuntime.includes("window.VATRA_LANGUAGE?.translate?.(uk)")&&
 notificationRuntime.includes("const notificationTemplates={")&&
 notificationRuntime.includes("return format(uk,english,{name});")&&
 notificationRuntime.includes('format("Сповіщення: {count} непрочитаних"')&&
 notificationRuntime.includes('format("Учасник VATRA ID {id}"')&&
 notificationRuntime.includes('format("Сторінка {page}"')&&
 notificationRuntime.includes('new Intl.DateTimeFormat(dateLocales[language()]||"uk-UA"'),
 "Notification runtime must use dictionaries, interpolation and locale-aware dates");
for(const key of notificationKeys){
 assert.ok(typeof en[key]==="string"&&en[key].trim(),
  "English notification text missing: "+key);
 assert.deepEqual(interpolationTokens(en[key]),interpolationTokens(key),
  "English notification placeholder mismatch: "+key);
}

const feedRuntime=await readFile("assets/js/feed.js","utf8");
const profileRuntime=await readFile("assets/js/profile.js","utf8");
const socialPageKeys=["VATRA — Стрічка","У розробці","Зараз у мережі"];
for(const key of socialPageKeys){
 assert.ok(typeof en[key]==="string"&&en[key].trim(),
  "English Feed/profile shell translation missing: "+key);
}
for(const source of [feedRuntime,profileRuntime]){
 assert.ok(source.includes('const activeLocale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";')&&
  source.includes('element.textContent=t(element.dataset.socialUk,element.dataset.socialEn);')&&
  source.includes('const locale=dateLocales[activeLocale]||"uk-UA";')&&
  source.includes('t("VATRA — Стрічка","VATRA — Feed")'),
  "Feed/profile must apply translated shell controls and native date formats");
}
assert.ok(profileRuntime.includes('t("Зараз у мережі","Online now")'),
 "Online presence label must be localized");

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
 // Some short strings are legitimately identical in Ukrainian and another
 // language (for example Bulgarian "Готово"). Require presence here and use
 // the whole-dictionary untranslated-ratio gate below to catch omissions.
 for(const key of [...socialShellKeys,...socialPageKeys]){
  assert.ok(typeof dictionary[key]==="string"&&dictionary[key].trim(),
   code+": social-shell text missing: "+key);
 }
 for(const key of postMediaKeys){
  assert.ok(typeof dictionary[key]==="string"&&dictionary[key].trim(),
   code+": missing post media translation: "+key);
  assert.equal(dictionary[key].endsWith(" "),key.endsWith(" "),
   code+": post media prefix whitespace mismatch: "+key);
 }
 for(const key of giftKeys){
  assert.ok(typeof dictionary[key]==="string"&&dictionary[key].trim(),
   code+": missing gift translation: "+key);
 }
 for(const key of communityKeys){
  assert.ok(typeof dictionary[key]==="string"&&dictionary[key].trim(),
   code+": missing community locale: "+key);
 }
 for(const key of composerKeys){
  assert.ok(typeof dictionary[key]==="string"&&dictionary[key].trim(),
   code+": missing composer label: "+key);
 }
 for(const key of friendsKeys){
  assert.ok(typeof dictionary[key]==="string"&&dictionary[key].trim(),
   code+": missing friend-page message: "+key);
 }
 for(const key of notificationKeys){
  assert.ok(typeof dictionary[key]==="string"&&dictionary[key].trim(),
   code+": missing notification message: "+key);
  assert.deepEqual(interpolationTokens(dictionary[key]),interpolationTokens(key),
   code+": notification placeholder mismatch: "+key);
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
