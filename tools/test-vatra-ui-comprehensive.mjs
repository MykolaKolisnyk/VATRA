import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>readFileSync(p,'utf8');
const fonts=read('assets/styles/sources/foundation/local-fonts.css');
const css=read('assets/styles/vatra.css');
const group=read('assets/styles/sources/social/community-gallery.css');
const editor=read('assets/styles/sources/profile/editor.css');
const settings=read('assets/styles/sources/profile/settings-community.css');
const ads=read('assets/styles/sources/layout/sidebar-ads.css');
const messenger=read('assets/styles/sources/social/messenger.css');
const main=read('assets/scripts/app/main.js');
const shared=read('assets/styles/sources/foundation/shared-tokens.css');
const responsive=read('assets/styles/sources/layout/responsive.css');
const profileGallery=read('assets/styles/sources/profile/gallery-language.css');
const pageStyles=read('assets/styles/sources/layout/pages.css');
assert.ok(fonts.includes('--vatra-radius-card:13px')&&fonts.includes('--vatra-control-height:38px'),'Shared design tokens must exist');
assert.ok(fonts.includes('--vatra-ui-font:"VATRA Onest"'),'Onest must be primary');
assert.ok(group.includes('flex-wrap:nowrap;white-space:nowrap'),'Community tabs must not wrap');
assert.ok(group.includes('body .vatra-group-tab-panel[hidden]{display:none!important;}'),'Inactive community tabs must actually be hidden');
assert.ok(main.includes('role="tabpanel" tabindex="0"'),'Community panels must be keyboard focusable');
assert.ok(editor.includes('position:sticky!important;bottom:12px!important'),'Profile editor Save must be reachable');
assert.ok(settings.includes('grid-template-columns:minmax(175px,198px) minmax(0,1fr)!important'),'Settings navigation must be compact');
assert.ok(settings.includes('min-height:40px!important;padding:8px 10px!important'),'Settings rows must not be oversized');
assert.ok(settings.includes('background:transparent!important;'),'Settings introduction must not be another large card');
assert.ok(ads.includes('[data-page="messages"]')&&ads.includes('display:none!important'),'No ads around conversations');
assert.ok(responsive.includes('--vatra-page-width:1000px;--vatra-sidebar-width:180px'),'Header and layout must share compact sizing tokens');
assert.ok(!shared.includes('max-width:1320px')&&!shared.includes('width:min(1320px'),'Wide screens must not expand VATRA beyond the compact layout cap');
assert.ok(main.includes("matches?2:window.matchMedia('(max-width:960px)').matches?3:4"),'Profile gallery must match the 4/3/2 column CSS');
assert.ok(profileGallery.includes('grid-template-columns:repeat(4,minmax(0,1fr))!important')&&profileGallery.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important')&&profileGallery.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'),'Gallery needs a consistent responsive grid');
assert.ok(main.includes('vatra-friends-tabs" role="tablist"')&&main.includes('tabs.map(nav).join('')&&main.includes('id="vatraFriendsResults" role="tabpanel"'),'Every friends category must be accessible from the same tab strip');
assert.ok(main.includes("is-single-column")&&!main.includes('vatra-friends-side-item'),'Empty recommendations must not create a duplicate navigation rail');
assert.ok(pageStyles.includes('vatra-friends-layout.is-single-column')&&pageStyles.includes('scroll-snap-type:x proximity'),'Friends tabs and empty layout must be compact');
assert.ok(main.includes('const VATRA_MY_VIDEOS_BATCH_SIZE=12')&&main.includes('items.slice(0,VATRA_MY_VIDEOS_BATCH_SIZE)'),'Videos must render in progressive batches');
assert.ok(main.includes("p.videoPosterUrl||p.videoThumbnailUrl")&&main.includes('id="vatraMyVideosMore"'),'Poster previews and more videos must be available');
assert.ok(pageStyles.includes('body .vatra-my-video-more[hidden]{display:none!important}')&&pageStyles.includes('body .vatra-my-video-empty{'),'Video navigation and empty states must be styled');
assert.ok(main.includes('const VATRA_CHAT_BATCH_SIZE=60')&&main.includes('allMessages.slice(-vatraChatVisibleCount)'),'Long conversations must render a bounded message window');
assert.ok(main.includes('vatraChatScrollRestore')&&main.includes('data-vatra-chat-load-older'),'Older messages must be accessible without losing scroll');
assert.ok(messenger.includes('@media(hover:none),(pointer:coarse)')&&messenger.includes('vatra-chat-load-older'),'Message actions and history must work on touch');
assert.ok(main.includes("event.key==='Home'")&&main.includes('aria-controls="vatra-group-panel-'),'Group tabs must support keyboard navigation and ARIA');
assert.ok(editor.includes('font:520 13px/1.4 var(--vatra-ui-font)!important'),'Profile editor should use balanced Onest weights');
assert.ok(css.includes('background:transparent!important;color:#24354b!important;')&&css.includes('box-shadow:none!important;'),'Selected sidebar must remain visually neutral');
assert.ok(!read('assets/styles/sources/layout/navigation-profile.css').includes('sidebar nav button.nav.active'),'Legacy button nav rules must be removed');
assert.ok(!read('assets/styles/sources/layout/interface-corrections.css').includes('sidebar nav a.nav.active'),'Legacy active sidebar overrides must be removed');

// All visible VATRA sections use the same Onest variable font, including shorthand rules.
for(const path of ["assets/styles/sources/social/messenger.css","assets/styles/sources/gifts/catalog.css","assets/styles/sources/social/post-composer.css","assets/styles/sources/support/desk.css","assets/styles/sources/layout/app-shell.css","assets/styles/sources/layout/pages.css","assets/styles/sources/foundation/base.css","assets/styles/sources/foundation/neutral-surfaces.css","assets/styles/sources/foundation/typography.css","assets/styles/sources/media/music.css"]){
 assert.ok(!read(path).includes('Inter'),path+': legacy font override reintroduced');
}

for(const path of ["assets/styles/sources/foundation/base-interactions.css","assets/styles/sources/foundation/interaction-patterns.css","assets/styles/sources/layout/interface-corrections.css","assets/styles/sources/layout/popovers-and-dialogs.css","assets/styles/sources/admin/center.css","assets/styles/sources/admin/verification.css","assets/styles/sources/admin/verification-gallery.css","assets/styles/sources/admin/ban-pages.css","assets/styles/sources/support/notifications.css"]){
 assert.ok(!read(path).includes('Inter'),path+': older font would override Onest');
}
console.log('VATRA: compact editor/settings, single-line group tabs, restrained gifts, private ad suppression.');
