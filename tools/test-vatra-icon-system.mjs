import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync('index.html','utf8');
const sprite=readFileSync('vatra-icon-system.js','utf8');
const navigation=readFileSync('navigation.js','utf8');
const css=readFileSync('vatra-icon-system.css','utf8');
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
 groups:'community',photos:'photos',myVideos:'video',
 videos:'clips',gifts:'gift',saved:'bookmark',settings:'settings'
};
for(const [page,icon] of Object.entries(expected)){
 const link=sidebar.match(new RegExp('<a[^>]*data-page="'+page+'"[^>]*>[\\s\\S]*?<\\/a>'))?.[0];
 assert.ok(link,'Missing sidebar route: '+page);
 assert.ok(link.includes('href="#/'), 'Broken sidebar hash URL '+page);
 assert.ok(link.includes('href="#vatra-i-'+icon+'"'),'Unexpected glyph for '+page);
 assert.ok(names.has(icon),'Missing shared sprite glyph '+icon);
}
const expectedOrder=['profile','friends','feed','messages','groups','photos','myVideos','videos','gifts','saved','settings'];
const positions=expectedOrder.map(p=>sidebar.indexOf('data-page="'+p+'"'));
assert.ok(positions.every(p=>p>=0)&&positions.every((p,i)=>!i||p>positions[i-1]),'VATRA sidebar order mismatch');
assert.ok(!sidebar.includes('data-page="music"'),'Music remains accessible from header, not duplicated in compact sidebar');
assert.ok(sidebar.includes('class="vatra-sidebar-divider"')&&sidebar.indexOf('data-page="videos"')<sidebar.indexOf('class="vatra-sidebar-divider"')&&sidebar.indexOf('class="vatra-sidebar-divider"')<sidebar.indexOf('data-page="gifts"'),'Utility group must have a separate line after Clips');
assert.ok(/data-menu-page="supportDesk"/.test(sidebar),'Support link is missing');
assert.ok(sidebar.includes('href="#vatra-i-support"'),'Support needs an independent headset glyph');
const references=[...html.matchAll(/<use href="#vatra-i-([\w-]+)"/g)].map(x=>x[1]);
assert.ok(references.length>=20,'Legacy duplicated inline SVGs remain in navigation');
for(const name of references)assert.ok(names.has(name),'Missing icon referenced by document: '+name);
const newGlyphs=['photos','music','gift','settings','support'].map(name=>glyphs[name]);
assert.equal(new Set(newGlyphs).size,newGlyphs.length,'Five distinct sections cannot share the same icon shape');
assert.ok(navigation.includes("button.dataset.menuPage === 'supportDesk'"),'Mobile support navigation is not functional');
assert.ok(navigation.includes("source.dataset.page || source.dataset.menuPage"),'Mobile clone drops support route');
assert.ok(html.includes('vatra-icon-system.js?')&&html.includes('vatra-icon-system.css?'),'Icon system assets are not loaded');
assert.ok(css.includes('data-vatra-theme-effective="dark"'),'Dark theme icons are unstyled');
console.log('VATRA icons/navigation: '+names.size+' symbols, '+Object.keys(expected).length+' routes + support, consistent SVG references.');
