import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>readFileSync(file,'utf8');
const brand=read('vatra-brand-text.css');
const panel=read('vatra-auth-brand-refresh.css');
const wordmark='class="vatra-wordmark-text">ВАТРА</span>';
const icon='class="vatra-wordmark-symbol" src="favicon.svg?v=20261104-ribbon1"';
for(const page of ['auth.html','register.html']){
 const html=read(page);
 assert.ok(html.includes('class="vatra-wordmark vatra-auth-wordmark"'),page+': missing desktop text wordmark');
 assert.ok(html.includes('class="vatra-wordmark vatra-mobile-wordmark"'),page+': missing mobile text wordmark');
 assert.ok(html.includes('class="vatra-wordmark vatra-loader-wordmark"'),page+': missing loader text wordmark');
 assert.ok(html.includes('class="vatra-wordmark vatra-developer-wordmark"'),page+': developer header must use text');
 assert.ok(html.includes(wordmark)&&html.includes(icon),page+': mark or real VATRA text missing');
 assert.ok(html.includes('class="vatra-brand-values"'),page+': footer spacing structure missing');
 assert.ok(!html.includes('vatra-header.svg?v='),page+': do not put text into a horizontal logo image');
 assert.ok(html.includes('vatra-auth-brand-refresh.css?v=20261105-brand1'),page+': new panel CSS missing');
 assert.ok(html.includes('vatra-brand-text.css?v=20261105-wordmark1'),page+': shared wordmark CSS missing');
 assert.ok(html.lastIndexOf('vatra-auth-brand-refresh.css')>html.lastIndexOf('vatra-recovery-final.css'),
  page+': new visual rules must override old auth media queries');
 assert.ok(html.lastIndexOf('vatra-auth-brand-refresh.css')>html.lastIndexOf('vatra-brand-text.css'),
  page+': final panel styling must load last');
}
for(const page of ['index.html','404.html']){
 const html=read(page);
 assert.ok(html.includes(icon)&&html.includes(wordmark),page+': logo must be a standalone icon + real text');
 assert.ok(html.includes('vatra-brand-text.css?v=20261105-wordmark1'),page+': wordmark CSS missing');
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
assert.ok(panel.includes('.vatra-auth-language-quick')&&panel.includes('.brand-foot'),
 'Blue-side languages and footer must share the new layout');
console.log('VATRA: large blue panel, readable text wordmarks and responsive breakpoints validated.');
