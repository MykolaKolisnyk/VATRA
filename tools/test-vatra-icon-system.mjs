import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync('index.html','utf8');
const sprite=readFileSync('assets/scripts/ui/icons.js','utf8');
const navigation=readFileSync('assets/scripts/navigation/state.js','utf8');
const css=readFileSync('assets/styles/sources/foundation/icons.css','utf8');
assert.ok(css.includes('font-size:14px!important;font-weight:500!important'),'Navigation labels must use regular-weight Onest');
assert.ok(css.includes('background:transparent!important;color:#0757f5!important;')&&!css.includes('box-shadow:inset 3px 0 0 var(--vatra-blue)!important'),'Active route must use blue text without a blue background or selection bar');
const defs=sprite.match(/const GLYPHS=(\{[\s\S]+?\});\s*const ALIASES=/);
assert.ok(defs,'Central SVG definitions not found');
const glyphs=JSON.parse(defs[1]);
const names=new Set(Object.keys(glyphs));
assert.ok(names.size>=50,'Shared icon pack is incomplete');
assert.ok(Object.values(glyphs).every(markup=>/^</.test(markup)&&/<\/(?:path|circle|rect|ellipse|g)>|\/>/.test(markup)),'Invalid icon shape');
const sidebar=html.match(/<aside class="sidebar"><nav[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert.ok(sidebar,'Sidebar not found');
const expected={
 profile:'profile',friends:'friends',feed:'news',messages:'message',
 groups:'community',photos:'photos',myVideos:'video',music:'music',
 gifts:'gift',saved:'bookmark',settings:'settings'
};
for(const [page,icon] of Object.entries(expected)){
 const link=sidebar.match(new RegExp('<a[^>]*data-page="'+page+'"[^>]*>[\\s\\S]*?<\\/a>'))?.[0];
 assert.ok(link,'Missing sidebar route: '+page);
 assert.ok(link.includes('href="#/'), 'Broken sidebar hash URL '+page);
 assert.ok(link.includes('href="#vatra-i-'+icon+'"'),'Unexpected glyph for '+page);
 assert.ok(names.has(icon),'Missing shared sprite glyph '+icon);
}
const expectedOrder=['profile','friends','feed','messages','groups','photos','myVideos','music','gifts','saved','settings'];
const positions=expectedOrder.map(p=>sidebar.indexOf('data-page="'+p+'"'));
assert.ok(positions.every(p=>p>=0)&&positions.every((p,i)=>!i||p>positions[i-1]),'VATRA sidebar order mismatch');
assert.ok(sidebar.includes('data-page="music"')&&sidebar.includes('href="#/music"'),'Music must be reachable from the compact sidebar and existing music route');
assert.ok(sidebar.includes('class="vatra-sidebar-divider"')&&sidebar.indexOf('data-page="gifts"')<sidebar.indexOf('class="vatra-sidebar-divider"')&&sidebar.indexOf('class="vatra-sidebar-divider"')<sidebar.indexOf('data-page="saved"'),'Utility group must have a separate line after Gifts');
assert.ok(/data-menu-page="supportDesk"/.test(sidebar),'Support link is missing');
assert.ok(sidebar.includes('href="#vatra-i-support"'),'Support needs an independent headset glyph');
const references=[...html.matchAll(/<use href="#vatra-i-([\w-]+)"/g)].map(x=>x[1]);
assert.ok(references.length>=18,'Legacy duplicated inline SVGs remain in navigation');
for(const name of references)assert.ok(names.has(name),'Missing icon referenced by document: '+name);
const newGlyphs=['photos','music','gift','settings','support'].map(name=>glyphs[name]);
assert.equal(new Set(newGlyphs).size,newGlyphs.length,'Five distinct sections cannot share the same icon shape');
assert.ok(navigation.includes("button.dataset.menuPage === 'supportDesk'"),'Mobile support navigation is not functional');
assert.ok(navigation.includes("source.dataset.page || source.dataset.menuPage"),'Mobile clone drops support route');
assert.ok(html.includes('assets/scripts/ui/icons.js?')&&html.includes('assets/styles/vatra.css?v=')&&JSON.parse(readFileSync('assets/styles/manifest.json','utf8')).files.includes('assets/styles/sources/foundation/icons.css'),'Icon system assets are not loaded');
assert.ok(css.includes('data-vatra-theme-effective="dark"'),'Dark theme icons are unstyled');
console.log('VATRA icons/navigation: '+names.size+' symbols, '+Object.keys(expected).length+' routes + support, consistent SVG references.');

const badge=readFileSync('assets/scripts/public/verification.js','utf8');
assert.ok(badge.includes('viewBox="0 0 24 24"')&&badge.includes('fill="#fff"'), 'Verified community badge must have crisp contrasting SVG check');

const appMain=readFileSync('assets/scripts/app/main.js','utf8');
assert.ok(html.includes('id="vatraFeedFilterOptions"')&&html.includes('id="vatraFeedFilterToggle"'),'News filters must be a compact dropdown');
assert.ok(appMain.includes("newsFilter?.addEventListener('click'")&&appMain.includes('filter=chosen;vatraFeedVisibleCount=VATRA_FEED_BATCH_SIZE'),'News filter choices must change the feed');
