// VATRA social screens should reuse the authenticated caches without truncation.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const friends=await readFile("assets/js/friends.js","utf8");
const friendStart=friends.indexOf("async function data(){");
const friendEnd=friends.indexOf("function actionButton(",friendStart);
assert.ok(friendStart>=0&&friendEnd>friendStart,"Find real friends data loader");
const notification=await readFile("assets/js/notifications.js","utf8");
const actorStart=notification.indexOf("async function authorNames(rows){");
const actorEnd=notification.indexOf("async function unreadCount(){",actorStart);
assert.ok(actorStart>=0&&actorEnd>actorStart,"Find real notification author loader");

const avatarUrl=path=>"https://rjasunoawrxvetwadylh.supabase.co/storage/v1/object/public/avatars/"+path;
const friendIds=Array.from({length:205},(_,i)=>String(1201+i));
const namesCalls=[],pathsCalls=[],statesCalls=[];
const cached={
 VATRA_PUBLIC_NAMES:{get:async(_client,ids)=>{
  namesCalls.push(Array.from(ids));
  return {data:ids.map(id=>({vatra_id:id,display_name:"Member "+id})),error:null};
 }},
 VATRA_AVATAR:{
  paths:async(_client,ids)=>{
   pathsCalls.push(Array.from(ids));
   return {data:ids.map(id=>({vatra_id:id,avatar_path:id+"/avatar/"+id+".webp"})),error:null};
  },
  states:async(_client,ids)=>{
   statesCalls.push(Array.from(ids));
   return new Map(ids.includes("1405")?[["1405","deleted"]]:[]);
  }
 }
};
const friendRows=friendIds.map((id,i)=>({
 id:i+1,requester_id:"999",recipient_id:id,status:"accepted"
}));
const friendQuery={
 select(){return friendQuery;},or(){return friendQuery;},order(){return friendQuery;},
 limit:async n=>{assert.equal(n,350);return {data:friendRows,error:null};}
};
const client={
 from(table){
  assert.equal(table,"friendships","Repeated profile/media reads should use shared caches");
  return friendQuery;
 },
 storage:{from(bucket){
  assert.equal(bucket,"avatars");
  return {getPublicUrl:path=>({data:{publicUrl:avatarUrl(path)}})};
 }}
};
const context={
 client,window:cached,URL,Promise,Map,Set,String,
 rows:[],targetId:"999",names:new Map(),photos:new Map(),accountStates:new Map(),
 counterpart:item=>String(item.recipient_id),
 validId:id=>/^[1-9][0-9]{0,18}$/.test(String(id))
};
runInNewContext(friends.slice(friendStart,friendEnd)+"\nglobalThis.loadFriendsData=data;",context);
await context.loadFriendsData();
assert.equal(namesCalls.length,3);
assert.equal(pathsCalls.length,3);
assert.equal(statesCalls.length,3);
assert.deepEqual(namesCalls.map(ids=>ids.length),[100,100,5]);
assert.deepEqual(pathsCalls.map(ids=>ids.length),[100,100,5]);
assert.deepEqual(statesCalls.map(ids=>ids.length),[100,100,5]);
assert.equal(context.names.size,205,"No member should be dropped by the 100-ID cache limit");
assert.equal(context.names.get("1405"),"Member 1405");
assert.equal(context.accountStates.get("1405"),"deleted");
assert.equal(context.photos.has("1405"),false,"Deleted account must not show a cached portrait");
assert.equal(context.photos.size,204);

// Notifications must use the same path cache as the friends list and Feed.
const notifyContext={
 client,window:cached,URL,Promise,Map,Set,String,
 validId:id=>/^[1-9][0-9]{0,18}$/.test(String(id))
};
runInNewContext(notification.slice(actorStart,actorEnd)+
 "\nglobalThis.loadAuthors=authorNames;",notifyContext);
const result=await notifyContext.loadAuthors([
 {actor_vatra_id:"1201"},{actor_vatra_id:"1405"}
]);
assert.equal(result.names.get("1201"),"Member 1201");
assert.equal(result.states.get("1405"),"deleted","Notification state uses verified data");
assert.equal(result.avatars.has("1405"),false,"Deleted account must not expose its portrait");
assert.equal(result.avatars.size,1);
assert.equal(pathsCalls.length,4,"Notification authors should use the shared cache");
assert.equal(pathsCalls[3].length,2);

// Without the shared helpers, legacy direct PostgREST RLS lookups must still work.
const fallbackRows=[{id:1,requester_id:"999",recipient_id:"222",status:"accepted"}];
const directTables=[];
const direct={
 from(table){
  directTables.push(table);
  if(table==="friendships"){
   const query={select(){return query;},or(){return query;},order(){return query;},
    limit:async()=>({data:fallbackRows,error:null})};
   return query;
  }
  return {select(){
   return {in:async(_field,ids)=>({
    data:table==="public_profiles"?ids.map(id=>({vatra_id:id,display_name:"Fallback member"})):
     ids.map(id=>({vatra_id:id,avatar_path:id+"/avatar/fallback.webp"})),error:null
   })};
  }};
 },
 storage:client.storage
};
const fallbackContext={
 ...context,client:direct,window:{VATRA_AVATAR:{}},
 rows:[],names:new Map(),photos:new Map(),accountStates:new Map()
};
runInNewContext(friends.slice(friendStart,friendEnd)+
 "\nglobalThis.loadFriendsData=data;",fallbackContext);
await fallbackContext.loadFriendsData();
assert.equal(fallbackContext.names.get("222"),"Fallback member");
assert.equal(fallbackContext.photos.has("222"),true);
assert.deepEqual(directTables,["friendships","public_profiles","profile_media"]);
console.log("VATRA shared social cache: 205 friends, RLS fallbacks, notification avatars and account states passed.");
