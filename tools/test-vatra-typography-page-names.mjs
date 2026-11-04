import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

// This guard keeps the site readable without adding another stylesheet over legacy CSS.
const read = path => readFileSync(path,'utf8');
const main=read('index.html');
const sidebar=main.match(/<aside class="sidebar"><nav[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
const script=read('script.js');
const language=read('vatra-language.js');
const icons=read('vatra-icon-system.css');
const foundations=read('vatra-ui-foundations-v5.css');
const ux=read('vatra-ux-corrections.css');
const cohesion=read('vatra-site-cohesion.css');

assert.ok(sidebar.includes('Моя сторінка'), 'Sidebar must say Моя сторінка');
assert.ok(/data-page="profile"/.test(sidebar),'Retain stable profile route');
assert.ok(script.includes("profile:['") || script.includes("profile:"), 'Keep original database/router page identifier');
for(const file of ['index.html','script.js','vatra-gifts.js','vatra-unified-ux.js',
 'vatra-public-verification.js','vatra-language.js','auth.html','register.html']){
 assert.ok(!/[Пп]рофіл/.test(read(file)), 'Outdated public-facing profile terminology in '+file);
}
assert.ok(language.includes("'Моя сторінка':'My page'"), 'English page translation missing');
assert.ok(language.includes("'Моя сторінка':'Moja strona'"), 'Polish page translation missing');
assert.ok(language.includes("'Налаштування сторінки':'Page settings'"), 'Page settings translation missing');

for(const file of ['index.html','auth.html','register.html']){
 const html=read(file);
 assert.ok(html.includes('family=Manrope:wght@400..800'), 'Manrope missing in '+file);
 assert.ok(html.includes('family=Inter:wght@400..800'), 'Inter fallback missing in '+file);
}
assert.ok(foundations.includes('--vatra-ui-font:Inter'), 'Readability: Inter must be the sitewide font');
assert.ok(icons.includes('font-size:14px!important;font-weight:580!important'),'Compact readable desktop navigation not applied');
assert.ok(icons.includes('height:38px!important'),'Sidebar buttons must remain compact');
assert.ok(icons.includes('data-vatra-theme-effective="dark"'),'Dark mode navigation is unstyled');

const legacyNavPattern=/nav\[aria-label="Основна навігація"\]>a\.nav/;
for(const [path,text] of [['vatra-ux-corrections.css',ux],['vatra-site-cohesion.css',cohesion],['vatra-ui-foundations-v5.css',foundations]]){
 assert.ok(!legacyNavPattern.test(text), 'Competing legacy nav selector remains in '+path);
 assert.equal((text.match(/\{/g)||[]).length,(text.match(/\}/g)||[]).length,'Unbalanced CSS in '+path);
}
assert.equal((main.match(/<meta name="theme-color"/g)||[]).length,1,'Duplicate theme color metadata');
assert.equal((main.match(/<meta name="application-name"/g)||[]).length,1,'Duplicate application metadata');
console.log('VATRA typography/cleanup: Manrope, clean nav CSS, consistent page terminology and i18n verified.');

const original=read('script.js');
const pageCss=read('vatra-site-cohesion.css');
const galleryCss=read('vatra-profile-gallery-language-v2.css');
assert.ok(original.includes('vatra-profile-layout'),'Original compact profile layout not rendered');
assert.ok(!original.includes('vatra-own-page-layout'),'Unrequested expanded layout must not return');
assert.ok(!original.includes('vatra-own-cover')&&!original.includes('vatraOwnCoverInput'),'Unrequested personal cover must not be rendered');
assert.ok(!original.includes('async function uploadCover('),'Unused cover upload handler must be removed');
assert.ok(!pageCss.includes('vatra-own-cover'),'Old cover CSS must not remain');
assert.ok(!pageCss.includes('margin-top:-100px'),'Avatar must not overlap a removed cover');
assert.ok(!pageCss.includes('1520px'),'Old page expansion must not return');
const basePages=read('vatra-pages.css');
assert.ok(basePages.includes('width:min(1040px,calc(100% - 40px))'),'Compact profile width must be restored');
assert.ok(basePages.includes('max-width:830px!important'),'Compact content width must be restored');
assert.ok(!pageCss.includes('.vatra-own-page-layout'),'Old wide layout CSS must be removed');
assert.ok(galleryCss.includes('grid-auto-columns:calc((100% - 3 * var(--vatra-gallery-gap)) / 4)'),'Original photo carousel sizing must remain');
console.log('VATRA cover-free compact page and original photo gallery verified.');
