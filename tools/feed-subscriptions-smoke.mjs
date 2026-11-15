// Offline regression: Feed subscriptions must not cache failed reads as empty.
// This executes the real Feed audience loader with fake PostgREST responses.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const source=await readFile("assets/js/feed.js","utf8");
const begin=source.indexOf(" async function loadSubscriptions(){");
const end=source.indexOf(" function card(post,engagement){",begin);
assert.ok(begin>0&&end>begin,"Find the production Feed audience loader");

let now=Date.parse("2026-11-15T08:00:00Z");
class Clock extends Date{static now(){return now;}}
const replies={friendships:[],community_follows:[],communities:[]};
const calls={friendships:0,community_follows:0,communities:0};
const ok=data=>({data,error:null});
const denied={data:null,error:Error("PostgREST temporarily unavailable")};
const deferred=()=>{
 let resolve;
 const promise=new Promise(done=>{resolve=done;});
 return {promise,resolve};
};
const client={
 from(table){
  assert.ok(Object.hasOwn(replies,table),"Unexpected database table "+table);
  const query={
   select(){return query;},
   or(){return query;},
   eq(){return query;},
   limit(){return take(table);},
   in(){return take(table);}
  };
  return query;
 }
};
function take(table){
 calls[table]++;
 assert.ok(replies[table].length,"Unexpected "+table+" request");
 return replies[table].shift();
}
const context={client,vatraId:"10",
 validId:id=>/^[1-9][0-9]{0,18}$/.test(String(id)),
 friends:new Set(),followedClubs:new Map(),
 subscriptionsInflight:null,subscriptionsLoadedAt:0,
 Promise,Set,Map,Date:Clock,String,Array
};
runInNewContext(source.slice(begin,end)+
 "\nglobalThis.feedAudience={ensureSubscriptions,loadSubscriptions};",context);
const {ensureSubscriptions}=context.feedAudience;
const friend=id=>({requester_id:"10",recipient_id:String(id),status:"accepted"});
const follow=id=>({club_id:String(id)});
const club=(id,name)=>({club_id:String(id),name});
const enqueue=(people,follows,groups)=>{
 replies.friendships.push(Promise.resolve(people));
 replies.community_follows.push(Promise.resolve(follows));
 if(groups!==undefined)replies.communities.push(Promise.resolve(groups));
};
const audience=()=>({
 friends:[...context.friends].sort(),
 clubs:[...context.followedClubs.entries()]
});

// A pair of simultaneous Feed and story opens shares one in-flight snapshot.
const wait=deferred();
replies.friendships.push(wait.promise);
replies.community_follows.push(Promise.resolve(ok([follow(100)])));
replies.communities.push(Promise.resolve(ok([club(100,"Nature")])));
const first=ensureSubscriptions(),second=ensureSubscriptions();
assert.strictEqual(first,second,"Feed and stories must deduplicate subscription reads");
assert.equal(calls.friendships,1);
assert.deepEqual([...context.friends],["10"],
 "The first failed or delayed audience read must not hide the viewer’s own posts");
wait.resolve(ok([friend(20)]));
await Promise.all([first,second]);
assert.deepEqual(audience(),{friends:["10","20"],clubs:[["100","Nature"]]});
assert.equal(context.subscriptionsLoadedAt,now);
await ensureSubscriptions();
assert.equal(calls.friendships,1,"Successful snapshot stays cached for 60 seconds");

// An error in one of two reads must preserve the previous complete snapshot.
now+=60_100;
enqueue(ok([friend(21)]),denied);
await ensureSubscriptions();
assert.deepEqual(audience(),{friends:["10","20"],clubs:[["100","Nature"]]});
assert.equal(context.subscriptionsLoadedAt,now-60_100,
 "A rejected read must not renew the success TTL");
assert.equal(calls.communities,1,"Failed follows must not query groups");
enqueue(ok([friend(21)]),ok([follow(101)]),ok([club(101,"Science")]));
await ensureSubscriptions();
assert.deepEqual(audience(),{friends:["10","21"],clubs:[["101","Science"]]});
assert.equal(context.subscriptionsLoadedAt,now);

// A community-name error is not evidence that all followed groups disappeared.
now+=60_100;
enqueue(ok([friend(22)]),ok([follow(102)]),denied);
await ensureSubscriptions();
assert.deepEqual(audience(),{friends:["10","21"],clubs:[["101","Science"]]});
enqueue(ok([friend(22)]),ok([follow(102)]),ok([club(102,"Art")]));
await ensureSubscriptions();
assert.deepEqual(audience(),{friends:["10","22"],clubs:[["102","Art"]]});

// A genuinely empty successful response is cached, rather than retried forever.
now+=60_100;
enqueue(ok([]),ok([]));
await ensureSubscriptions();
assert.deepEqual(audience(),{friends:["10"],clubs:[]});
const cachedCount=calls.friendships;
await ensureSubscriptions();
assert.equal(calls.friendships,cachedCount);

// Rejected network promises also leave known data alone and allow a new retry.
now+=60_100;
enqueue(Promise.reject(Error("Offline")),ok([follow(103)]));
await ensureSubscriptions();
assert.deepEqual(audience(),{friends:["10"],clubs:[]});
enqueue(ok([friend(23)]),ok([]));
await ensureSubscriptions();
assert.deepEqual(audience(),{friends:["10","23"],clubs:[]});
console.log("VATRA Feed audience: single-flight, only successful snapshots cached, safe retries passed.");
