import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

// This guard keeps the site readable without adding another stylesheet over legacy CSS.
const read = path => readFileSync(path,'utf8');
const main=read('index.html');
const sidebar=main.match(/<aside class="sidebar"><nav[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
const script=read('assets/scripts/app/main.js');
const language=read('assets/scripts/i18n/language.js');
const icons=read('assets/styles/sources/foundation/icons.css');
const foundations=read('assets/styles/sources/foundation/forms-and-controls.css');
const ux=read('assets/styles/sources/foundation/typography-consistency.css');
const cohesion=read('assets/styles/sources/foundation/shared-tokens.css');

assert.ok(sidebar.includes('Моя сторінка'), 'Sidebar must say Моя сторінка');
assert.ok(/data-page="profile"/.test(sidebar),'Retain stable profile route');
assert.ok(script.includes("profile:['") || script.includes("profile:"), 'Keep original database/router page identifier');
for(const file of ['index.html','assets/scripts/app/main.js','assets/scripts/gifts/gifts.js','assets/scripts/ui/shared-ux.js',
 'assets/scripts/public/verification.js','assets/scripts/i18n/language.js','auth.html','register.html']){
 assert.ok(!/[Пп]рофіл/.test(read(file)), 'Outdated public-facing profile terminology in '+file);
}
// The brand can state VATRA is Ukrainian, without excluding international users.
for(const file of ['index.html','auth.html','register.html','assets/scripts/app/main.js','assets/scripts/i18n/language.js']){
 const content=read(file);
 assert.ok(!/для своїх|свої серед своїх|лише для українців|тільки для українців/i.test(content),'Exclusionary branding text in '+file);
}
assert.ok(main.includes('Українська соціальна мережа'),'Ukrainian origin should remain visible');
assert.ok(language.includes("'Моя сторінка':'My page'"), 'English page translation missing');
assert.ok(language.includes("'Моя сторінка':'Moja strona'"), 'Polish page translation missing');
assert.ok(language.includes("'Налаштування сторінки':'Page settings'"), 'Page settings translation missing');

for(const file of ['index.html','auth.html','register.html']){
 const html=read(file);
 assert.ok(html.includes('family=Manrope:wght@400..800'), 'Manrope missing in '+file);
 assert.ok(html.includes('family=Inter:wght@400..800'), 'Inter fallback missing in '+file);
}
assert.ok(foundations.includes('--vatra-ui-font:"VATRA Onest"'), 'The app must use the same crisp local Onest font as its 404 page');
assert.ok(icons.includes('font-size:14px!important;font-weight:580!important'),'Compact readable desktop navigation not applied');
assert.ok(icons.includes('height:38px!important'),'Sidebar buttons must remain compact');
assert.ok(icons.includes('data-vatra-theme-effective="dark"'),'Dark mode navigation is unstyled');

const legacyNavPattern=/nav\[aria-label="Основна навігація"\]>a\.nav/;
for(const [path,text] of [['assets/styles/sources/foundation/typography-consistency.css',ux],['assets/styles/sources/foundation/shared-tokens.css',cohesion],['assets/styles/sources/foundation/forms-and-controls.css',foundations]]){
 assert.ok(!legacyNavPattern.test(text), 'Competing legacy nav selector remains in '+path);
 assert.equal((text.match(/\{/g)||[]).length,(text.match(/\}/g)||[]).length,'Unbalanced CSS in '+path);
}
assert.equal((main.match(/<meta name="theme-color"/g)||[]).length,1,'Duplicate theme color metadata');
assert.equal((main.match(/<meta name="application-name"/g)||[]).length,1,'Duplicate application metadata');
console.log('VATRA typography/cleanup: Manrope, clean nav CSS, consistent page terminology and i18n verified.');

const original=read('assets/scripts/app/main.js');
const pageCss=read('assets/styles/sources/foundation/shared-tokens.css');
const galleryCss=read('assets/styles/sources/profile/gallery-language.css');
assert.ok(original.includes('vatra-profile-layout'),'Original compact profile layout not rendered');
assert.ok(!original.includes('vatra-own-page-layout'),'Unrequested expanded layout must not return');
assert.ok(!original.includes('vatra-own-cover')&&!original.includes('vatraOwnCoverInput'),'Unrequested personal cover must not be rendered');
assert.ok(!original.includes('async function uploadCover('),'Unused cover upload handler must be removed');
assert.ok(!pageCss.includes('vatra-own-cover'),'Old cover CSS must not remain');
assert.ok(!pageCss.includes('margin-top:-100px'),'Avatar must not overlap a removed cover');
assert.ok(!pageCss.includes('1520px'),'Old page expansion must not return');
const basePages=read('assets/styles/sources/layout/pages.css');
assert.ok(basePages.includes('width:min(1040px,calc(100% - 40px))'),'Compact profile width must be restored');
assert.ok(basePages.includes('max-width:830px!important'),'Compact content width must be restored');
assert.ok(!pageCss.includes('.vatra-own-page-layout'),'Old wide layout CSS must be removed');
assert.ok(galleryCss.includes('grid-template-columns:repeat(6,minmax(0,1fr))!important')&&galleryCss.includes('grid-auto-flow:column!important')&&galleryCss.includes('overflow:hidden!important'),'Media carousel must use six thumbnails in one horizontal row');
const flagsCss=read('assets/styles/sources/layout/interaction-states.css');
assert.ok(flagsCss.includes('body .vatra-language-flag{display:block;flex:0 0 28px;border:0!important;outline:0!important'),'Language SVG flag must not receive an extra border or outline');
const appForPerformance=read('assets/scripts/app/main.js');
assert.ok(appForPerformance.includes('function vatraRequestRender()')&&appForPerformance.includes('if(vatraRenderQueued)return'),'Realtime callbacks must batch duplicate redraws');
const messengerCss=read('assets/styles/sources/social/messenger.css');
assert.equal(messengerCss.split('body[data-page="messages"] .vatra-chat-person>.avatar{').length-1,1,'Messenger avatar must not be defined by two competing rules');
assert.ok(messengerCss.includes('max-width:43px!important;max-height:43px!important'),'Chat avatar size must remain bounded');
assert.ok(original.includes('document.body.dataset.page===page&&document.activeElement?.matches?.'),'Focused inputs must never prevent navigation to another page');
console.log('VATRA cover-free compact page and original photo gallery verified.');

const brandVisual=read('assets/styles/sources/branding/brand.css');
const accountStates=read('assets/styles/sources/layout/navigation-states.css');
assert.ok(brandVisual.includes('--vatra-brand-ember:')&&brandVisual.includes('.vatra-group-card')&&brandVisual.includes('.settings-card'),'VATRA visual system must cover multiple sections');
assert.ok(!accountStates.includes('html body .layout>.sidebar>nav>a.nav'),'Duplicate navigation styling must not return');


/* Keep the polished, readable VATRA look consistent without a new CSS layer. */
const mainUi=read('assets/styles/sources/foundation/shared-tokens.css');
const legacyMedia=read('assets/styles/sources/media/media-access.css');
const giftsUi=read('assets/styles/sources/gifts/catalog.css');
assert.ok(mainUi.includes('/* VATRA common visual language: crisp, clear and consistent across pages. */'),'Shared crisp UI needs one canonical owner');
assert.ok(mainUi.includes('font-size:16px!important;font-weight:450!important;line-height:1.72!important'),'Post body readability must not regress');
assert.ok(mainUi.includes('.post-action-button'),'Feed buttons must have a consistent click target');
assert.ok(mainUi.includes('body[data-vatra-theme-effective="dark"] .layout>.main .post:not(.chat-window)'),'Posts must be legible in dark theme');
assert.ok(giftsUi.includes('body[data-vatra-theme-effective="dark"] .vatra-gifts-page'),'Gifts must honor selected dark theme');
assert.ok(!legacyMedia.includes('.layout>.sidebar>nav>a.nav'),'Old media stylesheet must not restyle the canonical sidebar');
console.log('VATRA crisp card typography, actions, gifts and single navigation owner verified.');
assert.ok(read('assets/styles/sources/branding/brand.css').includes('--vatra-brand-canvas:#f3f6fc'),'Main site must match the clear public page canvas');
assert.ok(read('assets/styles/sources/branding/brand.css').includes('-webkit-font-smoothing:antialiased!important'),'Main site must not override its text smoothing to auto');
assert.ok(read('assets/styles/sources/foundation/local-fonts.css').includes('font-family:"VATRA Onest"'),'Local Onest must be bundled for all site routes');
console.log('VATRA font: 404/app typography unified through local Onest.');
