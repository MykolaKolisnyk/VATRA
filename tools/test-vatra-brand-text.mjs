import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>readFileSync(file,'utf8');
const brand=read('vatra-brand-text.css');
const panel=read('vatra-auth-unified.css');
const wordmark='class="vatra-wordmark-text">ВАТРА</span>';
const icon='class="vatra-wordmark-symbol" src="favicon.svg?v=20261105-original-v1"';
for(const page of ['auth.html','register.html']){
 const html=read(page);
 assert.ok(html.includes('class="vatra-wordmark vatra-auth-wordmark"'),page+': missing desktop text wordmark');
 assert.ok(html.includes('class="vatra-wordmark vatra-mobile-wordmark"'),page+': missing mobile text wordmark');
 assert.ok(html.includes('class="vatra-wordmark vatra-loader-wordmark"'),page+': missing loader text wordmark');
 assert.ok(html.includes('class="vatra-wordmark vatra-developer-wordmark"'),page+': developer header must use text');
 assert.ok(html.includes(wordmark)&&html.includes(icon),page+': mark or real VATRA text missing');
 assert.ok(html.includes('class="vatra-brand-values"'),page+': footer spacing structure missing');
 assert.ok(!html.includes('vatra-header.svg?v='),page+': do not put text into a horizontal logo image');
 assert.ok(html.includes('vatra-auth-unified.css?v=20261105-brand-flags1'),page+': new panel CSS missing');
 assert.ok(html.includes('vatra-brand-text.css?v=20261105-brand-flags1'),page+': shared text logo stylesheet missing');
 assert.ok(html.lastIndexOf('vatra-auth-unified.css')>html.lastIndexOf('vatra-ui-foundations-v5.css'),
  page+': unified VATRA UI must load after shared component styles');
}
for(const page of ['index.html','404.html']){
 const html=read(page);
 assert.ok(html.includes(icon)&&html.includes(wordmark),page+': logo must be a standalone icon + real text');
 assert.ok(page==='index.html'?html.includes('assets/styles/vatra.css?v=')&&JSON.parse(read('assets/styles/manifest.json')).files.includes('vatra-brand-text.css'):html.includes('vatra-brand-text.css?v=20261105-wordmark1'),page+': global wordmark CSS missing');
 assert.ok(!html.includes('vatra-header.svg?v='),page+': stale image wordmark remains');
}
const index=read('index.html');
assert.ok(index.includes('vatra-header-wordmark'), 'App navigation must render text name');
assert.ok(index.includes('vatra-loader-wordmark'), 'App loader must render text name');
assert.ok(brand.includes('.vatra-wordmark-text')&&brand.includes('.vatra-wordmark-symbol'),
 'The shared wordmark needs separate text and image styling');
assert.ok(brand.includes('body[data-vatra-theme-effective="dark"]'),
 'Text wordmark must remain visible in dark mode');
assert.ok(panel.includes('font:860 clamp(57px,4.55vw,87px)'),
 'Desktop headline must be restored to large type');
assert.ok(panel.includes('max-width:1180px')&&panel.includes('max-height:650px'),
 'Hero headline must remain responsive on narrower and shorter screens');
assert.ok(!panel.includes('.vatra-wordmark .vatra-wordmark-text'), 'Auth CSS must not clone shared logo styles');
assert.ok(panel.includes('.vatra-auth-language-quick')&&panel.includes('.brand-foot'),
 'Blue-side languages and footer must share the new layout');

for(const locale of ['uk','en','pl','de','fr','es','pt','it']){
 const html=read('lang/'+locale+'/index.html');
 assert.ok(html.includes('class="vatra-landing-brand"')&&
  html.includes('src="../../favicon.svg"')&&html.includes('<span>ВАТРА</span>'),
  'Locale '+locale+': must render live VATRA text beside icon');
 assert.ok(!html.includes('vatra-header.svg'),
  'Locale '+locale+': retired image-based wordmark reference remains');
}
for(const asset of ['vatra-header.svg','vatra-header.png','logo.png']){
 assert.ok(!existsSync(asset),'Retired duplicate image asset still tracked: '+asset);
}
console.log('VATRA: large blue panel, readable text wordmarks and responsive breakpoints validated.');
