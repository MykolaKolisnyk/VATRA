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

const generatorStart=auth.indexOf('function vatraNewHumanQuestion(');
const generatorEnd=auth.indexOf('function vatrapauseHumanCheck(',generatorStart);
assert.ok(generatorStart>0&&generatorEnd>generatorStart,
 'Shared challenge generator must exist before both auth CAPTCHA implementations');
const generateQuestion=runInNewContext(auth.slice(generatorStart,generatorEnd)+'\nvatraNewHumanQuestion',{Math});
const kinds=new Set();let lastKey='';
for(let i=0;i<180;i++){
 const question=generateQuestion(lastKey);
 assert.equal(question.choices.length,4,'Question must have exactly four answer buttons');
 assert.equal(new Set(question.choices).size,4,'Every choice must be different');
 assert.ok(question.choices.includes(question.answer),'The correct answer must be offered');
 assert.ok(question.choices.every(v=>Number.isInteger(v)&&v>=0),'Answers must be accessible numeric values');
 assert.notEqual(question.key,lastKey,'Consecutive questions must differ');
 assert.ok(question.prompt.endsWith('?'),'Prompt must be understandable without an image');
 if(question.prompt.includes(' + '))kinds.add('sum');
 else if(question.prompt.includes(' − '))kinds.add('subtract');
 else if(question.prompt.includes(' × '))kinds.add('multiply');
 else if(question.prompt.includes(' чи '))kinds.add('compare');
 lastKey=question.key;
}
assert.equal(kinds.size,4,'Challenge must offer addition, subtraction, comparison and multiplication');
assert.ok(auth.includes('vatraNewHumanQuestion(recoveryPreviousPair)')&&
 auth.includes('vatraNewHumanQuestion(previousAdditionKey)'),
 'Registration and recovery must use the same question generator');
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
 assert.ok(html.includes('favicon.svg?v=20261105-original-v1'),'Auth must use current ribbon logo');
 assert.ok(html.includes('vatra-loader-wordmark')&&html.includes('vatra-wordmark-text'),'Loading brand must use icon + text');
}
assert.ok(css.includes('VATRA Unified Shield v2'), 'Shared visual shield CSS must exist');
assert.ok(css.includes('html body dialog#recoveryDialog.auth-dialog[open]')&&
          css.includes('overflow:hidden!important')&&css.includes('#recoveryDialog #recoveryForm'),
          'Scrollbar must stay inside recovery modal');
assert.ok(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),
          'Both human checks must have four aligned choices');
const favicon=read('favicon.svg'),preview=read('social-preview.svg');
for(const asset of [favicon,preview]){
 assert.ok(asset.includes('M433.31 136.6'),
  'Ribbon left arm must be identical across brand assets');
 assert.ok(asset.includes('M78.69 137.5'),
  'Ribbon right arm must be identical across brand assets');
}
assert.ok(!favicon.includes('M19 18H36C39 18 42 20 44 24'),'Retired ribbon emblem must not return');
assert.ok(index.includes('favicon.svg?v=20261105-original-v1'),'Website favicon cache must be updated');
assert.ok(index.includes('vatra-header-wordmark')&&!index.includes('vatra-header.svg?v='),'Website header must use symbol and selectable text');
assert.ok(index.includes('social-preview.png?v=20261105-original-v1'),'Raster social preview must match the new brand');
assert.ok(read('vatra-language.js').includes('favicon.svg?v=20261105-original-v1'),
 'Language picker must use updated mark');
// Social scrapers expect PNG, not the original SVG MIME type.
for(const page of ['index.html','auth.html','register.html']){
 const html=read(page);
 assert.ok(html.includes('social-preview.png?v=20261105-original-v1'),page+': social image must use current ribbon asset');
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
 assert.ok(source.includes('vatra-auth-unified.css?v=20261105-media-handle1'),page+': final stylesheet missing');
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
