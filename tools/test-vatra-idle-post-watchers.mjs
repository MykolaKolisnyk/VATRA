import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync('assets/scripts/app/main.js','utf8');
const start=source.indexOf("const VATRA_POST_IDLE_PAGES=new Set(");
const end=source.indexOf('function vatraStopPostMode(){',start);
assert.ok(start>=0&&end>start,'Post mode selection must be isolated');
const code=source.slice(start,end);
const counts={watch:0,load:0,stop:0};
const ctx={
 currentUser:{uid:'alice'},page:'messages',vatraPostMode:'',vatraFullPostStop:null,
 vatraPostRefreshTimer:null,vatraPostRequestVersion:0,vatraPostLoading:false,
 vatraPostHasMore:true,vatraPostAuthorSignature:'',posts:{},
 clearTimeout:()=>{},vatraPostAuthorIds:()=>['alice'],vatraLoadPostPage:()=>{counts.load++;return Promise.resolve();},
 watch:path=>{assert.equal(path,'posts');counts.watch++;return ()=>{counts.stop++;}},
 markInitialLoaded:()=>{},render:()=>{},updateNotificationBadges:()=>{}
};
const setMode=runInNewContext(code+'; vatraSetPostMode',ctx);
for(const page of ['messages','friends','music','settings','groupSettings']){
 ctx.page=page;setMode();
 assert.equal(ctx.vatraPostMode,'idle',page+' must not fetch all posts');
}
assert.equal(counts.watch,0,'Idle-only navigation must not subscribe to the entire post tree');
assert.equal(counts.load,0,'Idle-only navigation must not request a feed batch');
ctx.page='feed';setMode();
assert.equal(ctx.vatraPostMode,'paged','Feed must retain server pagination');
assert.equal(counts.load,1,'Feed must load the first server page');
ctx.page='profile';setMode();
assert.equal(ctx.vatraPostMode,'full','Profile needs the post watcher for galleries and cards');
assert.equal(counts.watch,1,'Profile must fetch its expected posts');
ctx.page='messages';setMode();
assert.equal(counts.stop,1,'Leaving a post-heavy page must unsubscribe');
assert.equal(ctx.vatraPostMode,'idle');
ctx.page='saved';setMode();
assert.equal(ctx.vatraPostMode,'full','Saved posts must keep their existing data source');
assert.equal(counts.watch,2);
assert.ok(readFileSync('index.html','utf8').includes('assets/scripts/app/main.js?v=20261105-profile-sync1'));
console.log('VATRA post subscriptions: idle routes avoid full timeline, feed paged, profiles and saved keep post data.');
