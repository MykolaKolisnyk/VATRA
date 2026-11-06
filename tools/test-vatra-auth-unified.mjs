import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=path=>readFileSync(path,'utf8');

const css=read('assets/styles/sources/auth/auth-shared.css');
const js=read('assets/scripts/auth/auth.js');
const lang=read('assets/scripts/i18n/language.js');
const logoCss=read('assets/styles/sources/branding/wordmark.css');
const authModules=JSON.parse(read('assets/styles/auth-manifest.json')).files;
assert.ok(logoCss.includes('.vatra-wordmark-text')&&!css.includes('.vatra-wordmark .vatra-wordmark-text'),'A single shared logo stylesheet must own text+icon rules');
const uiRefs=[
 'assets/styles/sources/system/language.css','vatra-recovery-final.css',
 'vatra-auth-brand-refresh.css'
];
for(const page of ['auth.html','register.html']){
 const html=read(page);
 assert.ok(html.includes('assets/styles/vatra-auth.css?v=20261105-onest-unified1'),page+': consolidated CSS missing');
 assert.equal((html.match(/href="assets\/styles\/vatra-auth\.css\?/g)||[]).length,1,page+': duplicated auth bundle');
 assert.ok(authModules.includes('assets/styles/sources/branding/wordmark.css'),page+': logo source missing from auth bundle');
 assert.equal(authModules.at(-1),'assets/styles/sources/auth/auth-shared.css',page+': final auth styles must load last');
 for(const legacy of uiRefs){
  assert.ok(!html.includes('href="'+legacy+'?'),page+': duplicated legacy stylesheet '+legacy);
 }
 assert.ok(html.includes('assets/scripts/i18n/language.js?v=20261105-no-clips1'),page+': stale translation JS');
 assert.ok(html.includes('assets/scripts/auth/auth.js?v=20261105-singleton2'),page+': stale auth script');
 assert.ok(authModules.indexOf('assets/styles/sources/auth/auth-shared.css')>authModules.indexOf('assets/styles/sources/foundation/forms-and-controls.css'),
  page+': canonical auth styles must load last');
}
assert.ok(css.includes('html body .auth-layout>.form-side')&&css.includes('min-height:0!important'),
 'Auth form side must not force an empty full-screen scroll area');
assert.ok(css.includes('html body .auth-layout::before,html body .auth-layout::after{display:none!important}'),
 'Legacy decorative layout rings still overextend the page');
assert.ok(css.includes('html{height:auto!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important}'),
 'Root document must own scrolling');
assert.ok(js.includes('if(previousMode!==m){window.scrollTo(0,0);'),
 'Tab changes must reset scroll after a tall registration form');
assert.ok(css.includes('--vatra-auth-primary:#0757f5')&&css.includes('--vatra-auth-radius:12px'),
 'Auth buttons and fields need shared VATRA tokens');
assert.ok(css.includes('html body #recoveryDialog .vatra-recovery-body::-webkit-scrollbar-thumb'),
 'Recovery must use the shared branded scrollbar');
assert.ok(css.includes('html body dialog#recoveryDialog.auth-dialog #recoveryForm{')&&
 css.includes('overflow:hidden!important')&&css.includes('width:calc(100% - 16px)!important'),
 'Recovery scrollbar must be clipped and inset inside modal');
assert.ok(css.includes('html body #recoveryDialog .vatra-recovery-head{')&&
 css.includes('flex:0 0 auto!important'),
 'Recovery header must be fixed when scrolling the white content');
assert.ok(lang.includes("const vatraPrimaryLanguageOrder=['uk','en','pl','de','es','fr','it','pt']"),
 'Ukrainian must always sort first in the main language dialog');
assert.ok(lang.includes('function vatraAuthRecentCodes()')&&lang.includes('const codes=vatraAuthRecentCodes();'),
 'Quick language strip must show the last four chosen languages');
assert.ok(!lang.includes("new Set([language,'uk','en','pl','de'])"),
 'Old selection-dependent order unexpectedly remains');
assert.ok(read('index.html').includes('assets/scripts/i18n/language.js?v=20261105-no-clips1'),
 'Main site must load the same language order');

assert.ok(css.includes('html body .auth-layout .vatra-auth-language-flag svg'),
 'Quick-language flag must fit precisely inside its chip');
assert.ok(css.includes('.vatra-auth-method-card:focus-within')&&
 css.includes('html body #recoveryDialog .vatra-recovery-methods>label.vatra-auth-method-card:has(input:checked)'),
 'Auth and recovery cards must have unified single-border focus rules');
assert.ok(css.includes('html body #captchaWrap.captcha-modal .human-captcha-status.is-wrong::before'),
 'Error cards must suppress the old misaligned warning bubble');
const siteCss=read('assets/styles/sources/foundation/shared-tokens.css'),index=read('index.html'),app=read('assets/scripts/app/main.js');
assert.ok(index.includes('id="vatraScrollToTop"')&&
 index.includes('aria-label="Прокрутити сторінку вгору"'),
 'Missing user-requested left-side scroll-to-top button');
assert.ok(app.includes("document.getElementById('vatraScrollToTop')")&&
 app.includes("button.addEventListener('click',()=>window.scrollTo"),
 'Scroll-to-top button must connect to its existing behavior');
const pagesCss=read('assets/styles/sources/layout/pages.css');
assert.ok(pagesCss.includes('.vatra-scroll-to-top[hidden]')&&
 pagesCss.includes('height:100dvh!important')&&
 pagesCss.includes('left:0!important'),
 'VK-style left scroll rail must be full height on desktop and hide until needed');
assert.ok(!siteCss.includes('html body #vatraScrollToTop.vatra-scroll-to-top{'),
 'Do not override the full-height scroll rail with a second floating button');
for(const page of ['index.html','auth.html','register.html','404.html']){
 const links=[...read(page).matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+\.css(?:\?[^"]*)?)"[^>]*>/gi)]
  .map(match=>match[1].split('?')[0]);
 assert.equal(new Set(links).size,links.length,page+': exact duplicate CSS imports');
}
console.log('VATRA: fixed language order, no blank form scroll, inset recovery scrollbar, one auth stylesheet.');

/* VATRA Circle: real value on both entry screens, including phones. */
for(const page of ['auth.html','register.html']){
 const html=read(page);
 assert.ok(html.includes('Спілкуйся. <em>Ділись моментами.</em>'),page+': clear headline missing');
 assert.ok(html.includes('Друзі, повідомлення, фото та дописи — в одному місці.'),page+': concise explanation missing');
 assert.ok(html.includes('class="vatra-auth-intro-mobile"'),page+': mobile value proposition missing');
 assert.ok(!html.includes('class="vatra-auth-possibilities"'),page+': feature chip clutter must be removed');
 assert.equal((html.match(/data-developer-open/g)||[]).length>=2,true,page+': developer info must remain accessible');
}
assert.ok(css.includes('.vatra-auth-intro-mobile'),'Mobile brand copy must have styles in the existing auth module');
assert.ok(read('assets/styles/sources/auth/auth-shared.css').includes('VATRA UI · social promise'),'VATRA marketing CSS missing');

/* First-run social-circle wording must be translated, not left Ukrainian abroad. */
assert.ok(lang.includes('const vatraSimpleEntryTranslations='),'Concise entry translation source missing');
for(const locale of ['en','pl','de','fr','es','pt','it']){
 assert.ok(lang.includes('"'+locale+'": {'),'Missing marketing translations for '+locale);
}
for(const page of ['index.html','auth.html','register.html']){
 assert.ok(read(page).includes('language.js?v=20261105-no-clips1&amp;circle=3'),page+': cache-bust localized words');
}

for(const page of ['auth.html','register.html']){
 assert.ok(read(page).includes('vatra-auth.css?v=20261105-onest-unified1&amp;ui=auth-clean-v2'),page+': updated 404-inspired auth stylesheet cache missing');
}
assert.ok(read('index.html').includes('vatra.css?v=20261106-social-circle-1'),'Updated VATRA social-circle CSS cache missing');

assert.ok(lang.includes('const vatraAuthFlowTranslations='),'International password form explanations missing');
for(const page of ['index.html','auth.html','register.html']){
 assert.ok(read(page).includes('language.js?v=20261105-no-clips1&amp;circle=3'),page+': missing updated translated guidance asset');
}

/* International languages remain discoverable without falsely claiming full translations. */
const catalogCodes=JSON.parse(lang.match(/const languageCodes=(\[[^\n]+\]);/)?.[1]||'[]');
const readyCodes=(lang.match(/const translatedLanguages=new Set\((\[[^\]]+\])\)/)?.[1]||'[]').replaceAll("'",'"');
assert.ok(catalogCodes.length>100,'Do not reduce the international language catalog');
assert.equal(JSON.parse(readyCodes).length,8,'Only eight primary UI translations should be flagged as available');
assert.ok(lang.includes('Доступна</small>')&&lang.includes('Частково · у розробці')&&lang.includes('У розробці</small>'),'Missing honest language readiness badges');
assert.ok(lang.includes("get isFullyLocalized(){return language==='uk';}"),'Do not describe incomplete translations as fully localized');


// The login and signup entry HTML must work with password managers before hydration.
for(const path of ['auth.html','register.html']){
 const html=read(path);
 assert.ok(html.includes('id="authForm" novalidate autocomplete="on"'),path+': autocomplete must be enabled');
 assert.ok(html.includes('id="email" type="email" autocomplete="email"'),path+': email autofill missing');
 assert.ok(html.includes('id="password" type="password" autocomplete="current-password"'),path+': login password intent missing');
 assert.ok(!/id="birthday"[^>]*max="2026-10-27"/.test(html),path+': fixed stale date cap');
 assert.ok(html.includes('&amp;ui=auth-clean-v2'),path+': new UI must bust the old CSS cache');
}
const authSource=read('assets/scripts/auth/auth.js');
assert.ok(authSource.includes("$('#password').autocomplete=m==='login'?'current-password':'new-password'"),
 'Password autofill must switch as the auth mode changes');
assert.ok(authSource.includes("$('#birthday').max=[today.getFullYear()"),
 'The birthday date limit must use the current date at runtime');
assert.ok(css.includes('linear-gradient(152deg,#1067fa 0%,#0757ed 51%,#0345cb 100%)'),
 'The blue VATRA entry hero must match the preferred original palette');
assert.ok(css.includes('background:#fff!important;border-color:#fff!important;color:#0757f5!important'),
 'Selected language must be legible on the blue entry hero');
console.log('VATRA: restored blue entry UI, cache refresh, password manager and birthday bound.');

assert.ok(css.includes('color:#eff6ff!important;font:750 12px/1.2'),
 'Inactive language labels must have readable light text on the blue brand panel');


// Search over the 100+ language catalog must not leave ghost entries or empty categories.
assert.ok(lang.includes('function vatraFilterLanguageDialog(dlg)'),'Language search must filter grouped results');
assert.ok(lang.includes('vatraFilterLanguageDialog(dlg);'),'Language search must also reset when reopening');
assert.ok(lang.includes('class="vatra-language-empty" role="status" aria-live="polite" hidden'),'Accessible empty-results state missing');
assert.ok(read('assets/styles/sources/profile/gallery-language.css').includes('.vatra-language-empty)[hidden]{display:none!important}'),'Filtered rows must remain visually hidden despite flex CSS');
for(const page of ['index.html','auth.html','register.html'])assert.ok(read(page).includes('&amp;catalog=keyboard4'),page+': cache key must reflect the updated language dialog');
console.log('VATRA i18n search: status, empty results, reset, grouped languages retained.');

for(const page of ['auth.html','register.html']){
 assert.ok(read(page).includes('&amp;country=search1'),page+': country search bundle needs a refreshed cache key');
}


// Dynamic forms update placeholder and accessible labels without replacing nodes.
assert.ok(lang.includes("attributeFilter:['placeholder','aria-label','title']"),'Language observer must watch changes to form labels');
assert.ok(lang.includes('function translateElementAttributes(el)'),'Dynamic controls must be translated, including the attribute-owning element');
assert.ok(lang.includes('previousTranslation!==undefined&&current!==previousTranslation&&current!==previousOriginal'),'Changing an accessible control action must refresh its source text');
assert.ok(lang.includes("'Приховати пароль':'Hide password'"),'Password visibility must have a localized accessible name');
console.log('VATRA i18n: dynamic placeholders and accessible controls follow the chosen language.');


// Language dialog uses toggle-button semantics and keyboard selection, not invalid
// aria-selected on ordinary buttons. Keep the 100+ language entries and 8 ready.
assert.ok(lang.includes('aria-pressed=')&&lang.includes('String(code===language)'), 'Language dialog must expose selected option using aria-pressed');
assert.ok(lang.includes("dlg.addEventListener('keydown',event=>{"), 'Language dialog must support keyboard navigation');
assert.ok(lang.includes("choices[index].focus();"), 'Keyboard arrows must actually focus a visible language');
assert.ok(!lang.includes("aria-selected="), 'Plain language buttons must not use aria-selected without a selection widget role');
