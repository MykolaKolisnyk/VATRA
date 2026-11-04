import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root='.';
const files=readdirSync(root).filter(x=>x.endsWith('.js'));
assert.ok(!readdirSync(root).some(x=>/\.(?:sql|md|zip)$/i.test(x)), 'SQL, guides and archives must stay outside the deployed VATRA directory');
let passed=0;
for(const filename of files){
 const source=readFileSync(join(root,filename),'utf8');
 const run=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
 if(run.status!==0)throw new Error(filename+': SyntaxError\n'+(run.stderr||run.stdout));
 if(/\${3,}\s*\(/.test(source))throw new Error(filename+': undefined $$$ selector');
 if(/(?<!\$)\$(?!\$)\s*\([^)]*\)\s*\.\s*forEach\s*\(/.test(source))
   throw new Error(filename+': querySelector() result used like an array');
 passed++;
}
const main=readFileSync('index.html','utf8');
const scriptText=readFileSync('script.js','utf8');
const giftText=readFileSync('vatra-gifts.js','utf8');
const sql=readFileSync('database/VATRA_CURRENT_SCHEMA.sql','utf8');
const styling=readFileSync('vatra-interface-fixes.css','utf8');
for(const [label,test] of [
 ['Gifts not in sidebar',!/class="nav" data-page="gifts"/.test(main)],
 ['Profile gift preview',giftText.includes('vatra-gift-preview-card')],
 ['Manual gift orders',readFileSync('database/VATRA_CURRENT_SCHEMA.sql','utf8').includes('vatra_gifts_place_order')],
 ['Gifts module',/src="vatra-gifts\.js\?v=[^"]+"/.test(main)],
 ['Gifts stylesheet',/href="vatra-gifts\.css\?v=[^"]+"/.test(main)],
 ['Gifts page handling',scriptText.includes("if(page==='gifts'){")],
 ['Visible delete comment',scriptText.includes('class="vatra-comment-delete"')],
 ['No blue bar',styling.includes('nav a.nav.active::before')],
 ['Server-only gift transfer',/vatra_gifts_send\(_item_id uuid,\s*_recipient uuid\)/.test(sql)],
 ['Server-only gift issue',/REVOKE ALL ON TABLE public\."vatra_gift_catalog"/.test(sql)],
 ['Holiday gift claims',sql.includes('vatra_gifts_claim_holiday')],
 ['Gift privacy',sql.includes('vatra_gifts_set_visibility')],
 ['Original vector artwork',giftText.includes('const paths={')]
])assert.ok(test,label+' missing');
const re=/(?:src|href)="([^"]+\.js)(?:\?v=[^"]*)?"/g;
for(const match of main.matchAll(re)){
 const local=match[1];if(/^https?:\/\//.test(local))continue;
 assert.ok(existsSync(join(root,local)),'Missing local module: '+local);
}
console.log('VATRA check passed: '+passed+' JavaScript modules and navigation/gift/UI invariants.');

// Gift presentation and cancellation regressions
const giftCss=readFileSync('vatra-gifts.css','utf8');
const ordersSql=readFileSync('database/VATRA_CURRENT_SCHEMA.sql','utf8');
const giftCatalogSql=readFileSync('database/VATRA_CURRENT_SCHEMA.sql','utf8');
assert.ok(!/\b(?:alert|confirm)\s*\(/.test(giftText),'Browser alert/confirm reintroduced');
assert.ok(giftText.includes('giftConfirm(')&&giftText.includes('giftToast('),'Custom gift dialogs missing');
assert.ok(giftText.includes('vatra-profile-link vatra-gift-preview-link'),'Friends and gifts must share button class');
assert.ok(giftCss.includes('vatra-profile-friends button.vatra-profile-link'),'Shared friend/gift hover style missing');
assert.ok(ordersSql.includes('DELETE FROM public.vatra_gift_orders WHERE id=_order_id'),'Cancelled order must be permanently removed');
assert.ok(ordersSql.includes('vatra_gifts_my_orders'),'Old cancelled orders must be cleaned');
for(const code of ['snowglobe','letter','clover','musicbox','swan','diamond']){
 assert.ok(giftText.includes(code+':'),code+' artwork missing');
 assert.ok(giftCatalogSql.includes("'"+code+"'"),code+' SQL catalog missing');
}

const adminGiftSrc=readFileSync('vatra-admin-center.js','utf8');
const adminGiftStart=adminGiftSrc.indexOf('function installGiftAdminEvents(){');
const adminGiftEnd=adminGiftSrc.indexOf('async function renderDashboard(){',adminGiftStart);
assert.ok(adminGiftStart>=0&&adminGiftEnd>adminGiftStart,'Gift admin handlers absent');
assert.ok(!/\balert\s*\(/.test(adminGiftSrc.slice(adminGiftStart,adminGiftEnd)),'Native alert in gift admin');
assert.ok(giftText.includes('let artSerial=0;'),'Each SVG gift requires a unique gradient id');


// Sidebar compactness and monetisation placeholders must not regress.
const footerCss=readFileSync('vatra-sidebar-ads.css','utf8');
const adsJs=readFileSync('vatra-sidebar-ads.js','utf8');
assert.ok(!/id="create"/.test(main),'Removed sidebar compose button reappeared');
assert.equal((main.match(/data-vatra-ad-slot="[12]"/g)||[]).length,2,'Expected exactly two reserved ad spaces');
assert.ok(main.includes('vatra-sidebar-ads.css?'),'Sidebar/ad stylesheet not linked');
assert.ok(main.includes('vatra-sidebar-ads.js?'),'Advertising module not linked');
assert.ok(main.indexOf('class="vatra-sidebar-ads"')>main.indexOf('class="vatra-footer-identity"'),'Ads should be below sidebar copyright');
assert.ok(!main.includes('class="vatra-footer-credit"')&&!main.includes('class="footer-legal vatra-footer-legal"'),'Sidebar must not show developer/legal links');
assert.ok(footerCss.includes('.vatra-footer-legal a')&&footerCss.includes('.vatra-ad-slot'),'Footer/ad styles missing');
assert.ok(adsJs.includes('enabled: false'),'Ad loading must remain off until the site is approved');
assert.ok(adsJs.includes('ca-pub-')&&adsJs.includes('adsbygoogle'),'Missing AdSense integration hooks');

// Playback and profile-save UX regressions.
const musicSrc=readFileSync('vatra-music.js','utf8');
assert.ok(musicSrc.includes('spotifyController.loadEntity(addressFor(playerItem||item))'),'Spotify track switching must reuse the existing iframe');
assert.ok(scriptText.includes("err=f.querySelector('#settingsError');if(err)err.textContent=''"),'Settings errors must clear on a new save attempt');


// Profile language picker, community settings and original brand regression checks.
const languageModule=readFileSync('vatra-language.js','utf8');
const layouts=readFileSync('vatra-settings-community-fix.css','utf8');
assert.ok(scriptText.includes("['language','Мова інтерфейсу']"),'Language settings tab missing');
assert.ok(scriptText.includes("className='vatra-language-settings-mount'"),'Language settings mount missing');
assert.ok(languageModule.includes("querySelector('.vatra-language-settings-mount')"),'Language picker injection missing');
assert.ok(layouts.includes('.vatra-group-view .vatra-group-back'),'Community back navigation layout missing');
assert.ok(layouts.includes('.birthday-selects'),'Date of birth controls layout missing');
assert.ok(main.includes('vatra-settings-community-fix.css'),'Updated profile/community stylesheet missing');
assert.ok(existsSync('vatra-header.svg'),'User-derived horizontal brand SVG missing');
assert.ok(main.includes('vatra-header.svg'),'Horizontal wordmark not linked in website navigation');
assert.ok(main.includes('favicon.svg'),'Original icon vector not linked');


// November 3 international UX regressions.
const finalUx=readFileSync('vatra-ui-finish.css','utf8');
const routeScroll=readFileSync('vatra-route-scroll.js','utf8');
const languageCss=readFileSync('vatra-language.css','utf8');
assert.ok(main.includes('vatra-ui-finish.css?'),'Final profile/dark theme style is not linked');
assert.ok(main.includes('vatra-route-scroll.js?'),'Route scroll fix must be linked');
assert.ok(routeScroll.includes("window.addEventListener('hashchange'"),'Hash navigation must scroll to top');
assert.ok(finalUx.includes('vatra-avatar-hover-wrap:not(.is-open)'),'Avatar controls must remain hidden until requested');
assert.ok(finalUx.includes('vatra-profile-public-actions'),'Foreign profile action layout missing');
assert.ok(finalUx.includes('vatra-language-select'),'Language dropdown and flag styling missing');
assert.ok(languageModule.includes('languageFlag(code)'),'Language options must have flag labels');
assert.ok(languageModule.includes('const seoTitles='),'Translated meta titles missing');
assert.ok(languageModule.includes('ensureMeta('),'Meta title/description updater missing');
assert.ok(giftText.includes('giftDescriptions'),'Gift descriptions missing');
assert.ok(giftText.includes('animatedGiftCodes'),'Looping gift SVG animations missing');
assert.ok(readFileSync('vatra-gifts.css','utf8').includes('@keyframes vatra-gift-float'),'Animated gift CSS missing');
assert.ok(!main.includes('class="vatra-footer-credit"'),'Sidebar developer credit came back');
assert.ok(readFileSync('sitemap.xml','utf8').includes('/lang/en/'),'International sitemap entries missing');
for(const locale of ['uk','en','pl','de','fr','es','pt','it']){
 assert.ok(existsSync('lang/'+locale+'/index.html'),'Static multilingual landing missing: '+locale);
 const content=readFileSync('lang/'+locale+'/index.html','utf8');
 assert.ok(content.includes('hreflang="'+locale+'"'),'Missing locale SEO alternates: '+locale);
}


// Account settings and expanded gift viewing: November 3 design references.
const authPage=readFileSync('auth.html','utf8');
const registerPage=readFileSync('register.html','utf8');
const loaderCss=readFileSync('vatra-loader.css','utf8');
const adminSource=readFileSync('vatra-admin-center.js','utf8');
assert.ok(scriptText.includes("vatraSettingsContext='settings'"),'Profile editing and account settings must be separate');
assert.ok(scriptText.includes("vatraOpeningEditProfile=true"),'Edit-profile button must enter edit context');
assert.ok(layouts.includes('data-vatra-settings-context="settings"'),'Separate account settings layout missing');
assert.ok(layouts.includes('.vatra-settings-nav-button[hidden]'),'Hidden account/edit navigation links must remain hidden');
assert.ok(scriptText.includes('vatra-account-admin-link'),'Admin center missing after account support entry');
assert.ok(scriptText.includes("action==='admin'"),'Admin menu click handler missing');
assert.ok(adminSource.includes('vatraCanOpenAdminCenter'),'Staff role must be checked before showing admin link');
assert.ok(languageModule.includes("excludedLanguageCodes=new Set(['ru','be'])"),'Russian and Belarusian language options must be excluded');
assert.ok(languageModule.includes('capitalizeLanguage(nativeName)'),'Language names must begin with a capital');
for(const html of [authPage,registerPage]){
 assert.ok(html.includes('class="developer-dialog vatra-developer-modern"'),'Founder modal redesign missing');
 assert.ok(html.includes('vatra-loading-wordmark-image'),'Minimal social-network loader missing');
 assert.ok(!html.includes('ВАТРА — це не просто сайт у моєму комп’ютері.'),'Old sentimental founder copy remains');
}
assert.ok(loaderCss.includes('.vatra-loading-screen{'),'Quiet loader styling missing');
assert.ok(giftText.includes('function openGiftDetail(code)'),'Fullscreen gift viewer handler missing');
assert.ok(giftText.includes('data-vatra-gift-open'),'Gift card zoom action missing');
assert.ok(giftText.includes('giftLongDescriptions'),'Expanded description for gifts missing');
assert.ok(readFileSync('vatra-gifts.css','utf8').includes('.vatra-gift-detail-dialog[open]'),'Fullscreen gift styling missing');


// Profile editor and additional settings (source-level non-regression checks).
const editorCss=readFileSync('vatra-profile-editor.css','utf8');
assert.ok(main.includes('vatra-profile-editor.css'),'New branded editor styles must be loaded');
assert.ok(scriptText.includes('VATRA_PROFILE_RECORD_SCHEMAS'),'Education, career and military record schemas missing');
assert.ok(scriptText.includes('vatraGetRecordLists(f)'),'Multi-entry profile records must be validated on save');
assert.ok(scriptText.includes('recordLists,updatedAt:values.updatedAt'),'Private record-list persistence missing');
assert.ok(scriptText.includes('notificationPreferences:privateNotifyPrefs'),'Notification preferences must be persisted');
assert.ok(scriptText.includes("data-vatra-block-from-settings"),'Blacklisted user management missing');
assert.ok(editorCss.includes('.vatra-record-editor'),'Multi-entry form styling missing');
assert.ok(editorCss.includes('.vatra-notify-setting'),'Notification controls styling missing');
assert.ok(!scriptText.includes('settingsCoverFile')&&!scriptText.includes('settingsRemoveCover'),'Profile editor must not offer cover editing');
assert.ok(!editorCss.includes('.vatra-editor-cover'),'Profile editor must not render cover UI');

// November 3 latest: editor navigation and Latin @handle.
const latinAuth=readFileSync('auth.js','utf8');
const latinSQL=readFileSync('database/VATRA_CURRENT_SCHEMA.sql','utf8');
const unifiedLayout=readFileSync('vatra-layout-cleanup.css','utf8');
assert.ok(!main.includes('<aside class="sidebar"><a class="brand"'),'The desktop sidebar must not repeat the topbar logo');
assert.ok(main.includes('vatra-layout-cleanup.css'),'Shared editor/settings and photo-date CSS is not linked');
assert.ok(scriptText.includes("navPage=p==='settings'&&vatraSettingsContext==='edit'?'profile':p"),'The editor must highlight the profile nav, not settings');
assert.ok(scriptText.includes("$$('a[data-page]').forEach"),'Navigation must use the querySelectorAll helper');
assert.ok(scriptText.includes('setFeed(`<section class="settings-page"><form id="profileSettingsForm"'),'Remove redundant profile edit / settings header panels');
assert.ok(scriptText.includes("const VATRA_HANDLE_PATTERN=/^[a-z][a-z0-9._-]{0,22}[a-z0-9]$/"),'Handles must contain Latin ASCII only');
assert.ok(scriptText.includes("handle=vatraNormalizeHandle(fd.get('handle'))"),'Handle must be lowercased on save');
assert.ok(scriptText.includes('function vatraProfilePhotoDateMarkup(timestamp)'),'Profile photo calendar dates must be visible');
assert.ok(scriptText.includes('photoDateByUrl.get(url)'),'Public photos need accurate dates when available');
assert.ok(unifiedLayout.includes('.vatra-profile-photo-date'),'Photo dates need readable non-clipped styling');
assert.ok(unifiedLayout.includes('.vatra-settings-nav-button.active'),'Settings and editor must share nav styling');
assert.ok(latinAuth.includes('function vatraLatinHandlePart(value)'),'New registrations must get a Latin @handle');
assert.ok(latinSQL.toLowerCase().includes('create or replace function public.vatra_check_public_handle'),'Server-side Latin aliases must be enforceable');
