import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=path=>readFileSync(path,'utf8');

const css=read('vatra-auth-unified.css');
const js=read('auth.js');
const lang=read('vatra-language.js');
const logoCss=read('vatra-brand-text.css');
assert.ok(logoCss.includes('.vatra-wordmark-text')&&!css.includes('.vatra-wordmark .vatra-wordmark-text'),'A single shared logo stylesheet must own text+icon rules');
const uiRefs=[
 'vatra-language.css','vatra-recovery-final.css',
 'vatra-auth-brand-refresh.css'
];
for(const page of ['auth.html','register.html']){
 const html=read(page);
 assert.ok(html.includes('vatra-auth-unified.css?v=20261105-media-handle1'),page+': consolidated CSS missing');
 assert.equal((html.match(/href="vatra-auth-unified\.css\?/g)||[]).length,1,page+': duplicated unified styles');
 assert.ok(html.includes('vatra-brand-text.css?v=20261105-wordmark2'),page+': shared logo CSS missing');
 assert.equal((html.match(/href="vatra-brand-text\.css\?/g)||[]).length,1,page+': duplicate logo CSS');
 for(const legacy of uiRefs){
  assert.ok(!html.includes('href="'+legacy+'?'),page+': duplicated legacy stylesheet '+legacy);
 }
 assert.ok(html.includes('vatra-language.js?v=20261105-layout-quiz2'),page+': stale translation JS');
 assert.ok(html.includes('auth.js?v=20261105-media-handle1'),page+': stale auth script');
 assert.ok(html.lastIndexOf('vatra-auth-unified.css')>html.lastIndexOf('vatra-ui-foundations-v5.css'),
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
assert.ok(read('index.html').includes('vatra-language.js?v=20261105-layout-quiz2'),
 'Main site must load the same language order');

assert.ok(css.includes('html body .auth-layout .vatra-auth-language-flag svg'),
 'Quick-language flag must fit precisely inside its chip');
assert.ok(css.includes('.vatra-auth-method-card:focus-within')&&
 css.includes('html body #recoveryDialog .vatra-recovery-methods>label.vatra-auth-method-card:has(input:checked)'),
 'Auth and recovery cards must have unified single-border focus rules');
assert.ok(css.includes('html body #captchaWrap.captcha-modal .human-captcha-status.is-wrong::before'),
 'Error cards must suppress the old misaligned warning bubble');
const siteCss=read('vatra-site-cohesion.css'),index=read('index.html'),app=read('script.js');
assert.ok(index.includes('id="vatraScrollToTop"')&&
 index.includes('aria-label="Прокрутити сторінку вгору"'),
 'Missing user-requested left-side scroll-to-top button');
assert.ok(app.includes("document.getElementById('vatraScrollToTop')")&&
 app.includes("button.addEventListener('click',()=>window.scrollTo"),
 'Scroll-to-top button must connect to its existing behavior');
const pagesCss=read('vatra-pages.css');
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
