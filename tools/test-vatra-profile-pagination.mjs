import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const app=readFileSync('assets/scripts/app/main.js','utf8'), html=readFileSync('index.html','utf8');
assert.ok(app.includes('const VATRA_PROFILE_POST_BATCH_SIZE=12'),'Profile rendering must use a modest batch');
assert.ok(app.includes('mine.slice(0,vatraOwnPostVisibleCount).map(postCard)'),'Own posts must not create the entire DOM at once');
assert.ok(app.includes('arr.slice(0,vatraPublicPostVisibleCount).map(postCard)'),'Public posts must not create the entire DOM at once');
assert.ok(app.includes("vatraProfileMoreMarkup('own',mine.length,vatraOwnPostVisibleCount)"),'Own page needs a load-more sentinel');
assert.ok(app.includes("vatraProfileMoreMarkup('public',arr.length,vatraPublicPostVisibleCount)"),'Public page needs a load-more sentinel');
assert.ok(app.includes("requestAnimationFrame(()=>vatraObserveProfileMore('own'))"),'Own profile must attach its lazy observer');
assert.ok(app.includes("requestAnimationFrame(()=>vatraObserveProfileMore('public',uid))"),'Public profile must attach its lazy observer');
assert.ok(app.includes('button.addEventListener(\'click\',loadMore,{once:true})'),'Manual fallback must remain available');
assert.ok(html.includes('assets/scripts/app/main.js?v=20261105-ui-compact1'),'Browser must load the new profile renderer');
console.log('VATRA profiles: twelve posts first, infinite scroll + button fallback.');

assert.ok(app.includes('const VATRA_GROUP_POST_BATCH_SIZE=12'),'Community posts must render in modest batches');
assert.ok(app.includes('arr.slice(0,visibleGroupPosts).map(postRow)'),'Community posts must not eagerly render all cards');
assert.ok(app.includes('vatraGroupPostObserver.observe(moreGroupPosts)'),'Community posts must load on scroll');

// A partial auth callback must never try to reserve the globally unique @user handle.
assert.ok(app.includes('function vatraCanSyncPublicProfile(p)'), 'Public profile sync must validate a loaded profile');
assert.ok(app.includes('if(vatraCanSyncPublicProfile(currentProfile))'), 'Async profile writes must be gated on a real handle');
assert.ok(!app.includes("handle:String(p.handle||'user')"), 'Never generate duplicate placeholder @user handles');

const activitySql=readFileSync('database/vatra_group_post_activity.sql','utf8');
assert.ok(!app.includes("unsubscribers.push(watch('groupPosts'"),'The worldwide group posts watcher must not come back');
assert.ok(app.includes("watch('groupPosts/'+gid"),'Group timelines must be scoped to joined communities');
assert.ok(app.includes("db.client.rpc('vatra_group_recent_counts'"),'Discovery counts must be aggregate-only');
assert.ok(activitySql.includes('security invoker')&&activitySql.includes('to authenticated'),'Community activity RPC must enforce the caller RLS');
