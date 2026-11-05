import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const read=path=>readFileSync(path,'utf8');
const auth=read('auth.js'),css=read('auth.css'),index=read('index.html');
const a=auth.indexOf("const VATRA_SHIELD_KEY='vatra-human-shield-v2'");
const b=auth.indexOf("let challengeAnswer=null,challengePassed=false",a);
assert.ok(a>0&&b>a,'Shared progressive verification helper is missing');
const values=new Map();
let now=1_800_000_000_000;
const store={getItem:key=>values.get(key)||null,setItem:(key,v)=>values.set(key,String(v)),
 removeItem:key=>values.delete(key)};
const shield=runInNewContext(auth.slice(a,b)+'\n({vatraShieldFail,vatraShieldRead,vatraShieldRemaining,vatraShieldPass})',{
 localStorage:store,Date:{now:()=>now},WeakMap,setTimeout:()=>0,clearTimeout:()=>{}
});
for(const seconds of [120,300,600,1800,3600,3600]){
 assert.equal(shield.vatraShieldFail(),0,'First wrong answer should not lock');
 assert.equal(shield.vatraShieldFail(),0,'Second wrong answer should not lock');
 assert.equal(shield.vatraShieldFail(),seconds*1000,'Third wrong answer must progressively lock');
 assert.equal(shield.vatraShieldRemaining(),seconds*1000);
 assert.equal(shield.vatraShieldPass(),false,'Cannot bypass a lock by guessing right');
 now+=seconds*1000+1000;
}
assert.ok(shield.vatraShieldPass(),'User can pass after expiry');
assert.equal(shield.vatraShieldRead().failed,0);
now+=86_400_001;
assert.equal(shield.vatraShieldRead().stage,0,'Penalty decays after a clean day');
assert.ok(auth.includes("vatraShieldEnforce($('#recoveryProtection')"),'Recovery must share the same cooldown state');
assert.ok(auth.includes('vatraShieldEnforce(wrap'), 'Standalone verification must share the cooldown');
assert.ok(auth.includes('if(vatraShieldRemaining()>0)'), 'Recovery delivery must respect cooldown');
assert.ok(auth.includes('if(!vatraShieldPass())return;'), 'Both flows must block success during a lock');
for(const page of ['auth.html','register.html']){
 const html=read(page);
 const recovery=html.match(/<section class="recovery-protection human-captcha" id="recoveryProtection">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(recovery.includes('Захист ВАТРИ')&&recovery.includes('Швидка перевірка'));
 assert.ok(recovery.includes('id="recoveryMath" class="human-captcha-question"'));
 assert.ok(recovery.includes('class="recovery-answers human-captcha-options"'));
 assert.ok(html.includes('class="vatra-recovery-brand"')||
           html.includes('class="auth-dialog-icon vatra-recovery-brand"'),'Branded recovery header missing');
 assert.ok(html.includes('favicon.svg?v=20261104-ribbon1'),'Auth must use current ribbon logo');
 assert.ok(html.includes('vatra-loader-wordmark')&&html.includes('vatra-wordmark-text'),'Loading brand must use icon + text');
}
assert.ok(css.includes('VATRA Unified Shield v2'), 'Shared visual shield CSS must exist');
assert.ok(css.includes('html body dialog#recoveryDialog.auth-dialog[open]')&&
          css.includes('overflow:hidden!important')&&css.includes('#recoveryDialog #recoveryForm'),
          'Scrollbar must stay inside recovery modal');
assert.ok(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),
          'Both human checks must have four aligned choices');
const favicon=read('favicon.svg'),header=read('vatra-header.svg'),preview=read('social-preview.svg');
for(const asset of [favicon,header,preview]){
 assert.ok(asset.includes('M19 18H36C39 18 42 20 44 24'),
  'Ribbon left arm must be identical across brand assets');
 assert.ok(asset.includes('M76 18H90C94 18 96 22'),
  'Ribbon right arm must be identical across brand assets');
}
assert.ok(!favicon.includes('M433.31 136.6'),'Old V logo must be replaced');
assert.ok(index.includes('favicon.svg?v=20261104-ribbon1'),'Website favicon cache must be updated');
assert.ok(index.includes('vatra-header-wordmark')&&!index.includes('vatra-header.svg?v='),'Website header must use symbol and selectable text');
assert.ok(index.includes('social-preview.png?v=20261104-ribbon1'),'Raster social preview must match the new brand');
assert.ok(read('vatra-language.js').includes('favicon.svg?v=20261104-ribbon1'),
 'Language picker must use updated mark');
// Social scrapers expect PNG, not the original SVG MIME type.
for(const page of ['index.html','auth.html','register.html']){
 const html=read(page);
 assert.ok(html.includes('social-preview.png?v=20261104-ribbon1'),page+': social image must use current ribbon asset');
 assert.ok(html.includes('<meta property="og:image:type" content="image/png">'),page+': incorrect Open Graph image MIME type');
 assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'),page+': large social image card expected');
}

// Recovery must use a branded header with the scroll container clipped by the dialog.
// The final stylesheet must be loaded after earlier auth and design layers.
const recoveryFinal=read('vatra-auth-unified.css');
for(const page of ['auth.html','register.html']){
 const source=read(page);
 assert.ok(source.includes('<header class="vatra-recovery-head">'),page+': recovery header missing');
 assert.ok(source.includes('<div class="vatra-recovery-body">'),page+': recovery form body missing');
 assert.ok(source.includes('vatra-auth-unified.css?v=20261105-auth-consolidated1'),page+': final stylesheet missing');
 assert.ok(source.lastIndexOf('vatra-auth-unified.css')>source.lastIndexOf('vatra-ui-foundations-v5.css'),
  page+': final recovery styles must load after global auth styles');
}
assert.ok(recoveryFinal.includes('#recoveryDialog #recoveryForm::-webkit-scrollbar'),
 'Recovery scrollbar must stay inside clipped dialog');
assert.ok(recoveryFinal.includes('overflow:hidden!important')&&recoveryFinal.includes('.vatra-recovery-head'),
 'Recovery card must clip scrolling and expose its distinct VATRA-blue header');
assert.ok(recoveryFinal.includes('html body #captchaWrap.captcha-modal .human-captcha-options')&&
 recoveryFinal.includes('html body #recoveryDialog #recoveryProtection .human-captcha-options'),
 'Both human checks must share visual rules');
console.log('VATRA: unified shield, progressive lockouts, contained recovery and shared ribbon mark validated.');
