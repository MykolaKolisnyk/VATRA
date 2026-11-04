import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const script=readFileSync('script.js','utf8');
const css=readFileSync('vatra-clips-v2.css','utf8');
const icons=readFileSync('vatra-icon-system.js','utf8');
const html=readFileSync('index.html','utf8');

for(const [code,description] of [
 ["function teardownVatraClips(){","Explicit cleanup of video playback when changing pages"],
 ["if(previousPage==='videos'&&p!=='videos')teardownVatraClips()","Stop playback on route change"],
 ["teardownVatraClips();","Stop old observers when feed is rerendered"],
 ["preload=\"none\" muted data-vatra-clip-source=","Lazy source loading"],
 ["ensureClipSource(candidate,'metadata')","Preload adjacent clips"],
 ["video.addEventListener('play'","Keep other clips paused"],
 ["video.addEventListener('pause'","Track playback state"],
 ["video.addEventListener('timeupdate',refreshProgress)","Update progress after seek/playback"],
 ["video.addEventListener('durationchange',refreshProgress)","Account for clip duration"],
 ["video.paused?'play':'pause'","Play/pause icon updates"],
 ["data-vatra-clip-play","Clickable play/pause overlay"],
 ["vatra-clip-progress","Progressbar markup"],
 ["window.vatraIcon(video.muted?'mute':'volume')","Centralized mute and volume icon"],
 ["document.addEventListener('visibilitychange',onVisibility)","Pause background tabs"],
 ["document.removeEventListener('visibilitychange',onVisibility)","Clean up visibility handler"]
])assert.ok(script.includes(code),description+' is missing');
assert.ok(script.includes("if(best&&best[1]>=.55)activateClip(best[0])"),'Only dominant visible clip activates');
assert.ok(script.includes("page!=='videos'||document.visibilityState!=='visible'"),'Clip playback must be route and visibility-scoped');
assert.ok(!script.includes('preload="metadata" muted controls src='),'Never eagerly load every clip on render');
assert.ok(css.includes('.vatra-clip-play-toggle')&&css.includes('.vatra-clip-progress>span'),'Missing clip playback CSS');
assert.ok(css.includes('prefers-reduced-motion'),'Reduced motion behavior must be retained');
assert.ok(icons.includes('"mute":')&&icons.includes('"volume":'),'Distinct mute and volume icons must exist');
assert.ok(icons.includes('window.vatraIcon=(name'),'Both icons must use the shared icon renderer');
for(const src of ['vatra-clips-v2.css','vatra-icon-system.js','script.js']){
 const matched=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].filter(match=>match[1].startsWith(src+'?v='));
 assert.equal(matched.length,1,'Expected one versioned include: '+src);
}
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'Clip CSS braces mismatch');
console.log('VATRA clips: lazy playback, visible-only autoplay, pause, progress, sound and cleanup validated.');
