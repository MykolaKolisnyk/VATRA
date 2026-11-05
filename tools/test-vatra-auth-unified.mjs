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
 assert.ok(html.includes('vatra-auth-unified.css?v=20261105-layout-quiz2'),page+': consolidated CSS missing');
 assert.equal((html.match(/href="vatra-auth-unified\.css\?/g)||[]).length,1,page+': duplicated unified styles');
 assert.ok(html.includes('vatra-brand-text.css?v=20261105-wordmark2'),page+': shared logo CSS missing');
 assert.equal((html.match(/href="vatra-brand-text\.css\?/g)||[]).length,1,page+': duplicate logo CSS');
 for(const legacy of uiRefs){
  assert.ok(!html.includes('href="'+legacy+'?'),page+': duplicated legacy stylesheet '+legacy);
 }
 assert.ok(html.includes('vatra-language.js?v=20261105-layout-quiz2'),page+': stale translation JS');
 assert.ok(html.includes('auth.js?v=20261105-layout-quiz2'),page+': stale auth script');
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
assert.ok(lang.includes("const codes=languages.filter(([code])=>shortcutCodes.has(code)).map(([code])=>code);"),
 'Quick language strip must follow the full language picker rather than selection history');
assert.ok(!lang.includes("new Set([language,'uk','en','pl','de'])"),
 'Old selection-dependent order unexpectedly remains');
assert.ok(read('index.html').includes('vatra-language.js?v=20261105-layout-quiz2'),
 'Main site must load the same language order');
console.log('VATRA: fixed language order, no blank form scroll, inset recovery scrollbar, one auth stylesheet.');
