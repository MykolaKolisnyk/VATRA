import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=path=>readFileSync(path,'utf8');
const script=read('script.js'),social=read('vatra-clips-social.js'),css=read('assets/styles/sources/media/clips.css');
const icons=read('vatra-icon-system.js'),html=read('index.html'),sql=read('database/vatra_clip_social.sql');

for(const action of ['like','comment','save','share','follow']){
 assert.ok(script.includes('data-vatra-clip-'+action),action+' missing from active clip markup');
}
assert.ok(script.includes("mountVatraClipSocial({"),'Dedicated social component must be mounted');
assert.ok(script.includes("vatraClipsSocial?.destroy()"),'Clips social handlers must be removed during navigation');
assert.ok(script.includes("vatraClipsSocial?.activate(item.dataset.vatraClip)"),'Social data must load only when clip activates');
assert.ok(script.includes("vatraClipDeepLinkPending"),'Shared clip URL must open its target');
assert.ok(script.includes("new URLSearchParams(location.search).get('clip')"),'Shared clip link must be read');
assert.ok(social.includes("url.searchParams.set('clip',id)"),'Share links need target clip id');
assert.ok(social.includes("navigator.share")&&social.includes("navigator.clipboard?.writeText"),'Share requires native and clipboard paths');
assert.ok(social.includes("client.from('vatra_clip_shares').insert"),'Record genuine shares');
assert.ok(social.includes("await ask(client.from('vatra_clip_comments').insert"),'Comments must persist on server');
assert.ok(social.includes("await ask(client.from('vatra_clip_comments').delete"),'Comment deletion must persist on server');
assert.ok(social.includes("body=input.value.trim()"),'Comment bodies must be validated before submit');
assert.ok(!social.includes("innerHTML=body"),'Unescaped comment body must never be rendered as HTML');
assert.ok(social.includes("escape(String(c.body||''))"),'Comments must be escaped before insertion');
assert.ok(social.includes("pending.has(kind+':'+id)"),'Double-submit reaction guard missing');
assert.ok(css.includes('.vatra-clip-social-rail')&&css.includes('.vatra-clip-comments-dialog'),'Missing social UI styling');
assert.ok(icons.includes('"share":')&&icons.includes('"heart":')&&icons.includes('"bookmark":'),'Clip icons must reuse centralized SVG');
for(const asset of ['assets/styles/sources/media/clips.css','vatra-icon-system.js','script.js']){
 assert.ok(asset.endsWith('.css')?html.includes('assets/styles/vatra.css?v=')&&JSON.parse(read('assets/styles/manifest.json')).files.includes(asset):html.includes(asset+'?v='),asset+' must be included with a cache version');
}
const tables=['vatra_clip_likes','vatra_clip_comments','vatra_clip_bookmarks','vatra_clip_shares'];
for(const table of tables){
 assert.ok(sql.includes('create table if not exists public.'+table),table+' table missing');
 assert.ok(sql.includes('alter table public.'+table+' enable row level security'),table+' requires RLS');
 assert.ok(sql.includes('revoke all on public.'+table+' from anon, authenticated'),table+' anon access must be revoked');
 assert.ok(sql.includes('grant ')&&sql.includes(' to authenticated;'),table+' API grants missing');
}
assert.ok(sql.includes('user_id = (select auth.uid())'),'All writes must be owner-bound');
assert.ok(sql.includes("v.value ->> 'kind' = 'clip'"),'Reactions require a real published clip');
assert.ok(sql.includes("vt.val")===false,'Avoid old unsandboxed data schemes');
assert.ok(sql.includes('vatra_clip_bookmarks_read')&&sql.includes('using (user_id = (select auth.uid()))'),'Bookmarks are private');
assert.ok(!sql.includes('to anon using (true)'),'No public data grants');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'Clip CSS braces mismatch');
console.log('VATRA clips social integration and database RLS invariants verified.');
