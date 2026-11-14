// Offline regression for profile media request deduplication.
// Evaluates the live production function bodies against fake PostgREST clients.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const profile=await readFile("assets/js/profile.js","utf8");
const avatar=await readFile("assets/js/avatar.js","utf8");
const start=profile.indexOf(" async function resolveFriendships(friendships){");
const end=profile.indexOf(" const showFriends=async()=>{",start);
assert.ok(start>0&&end>start,"Find profile friend-avatar resolver");
const ownStart=profile.indexOf("async function loadOwnHeaderAvatar(client,ownId,email){");
const ownEnd=profile.indexOf("async function start(){",ownStart);
assert.ok(ownStart>0&&ownEnd>ownStart,"Find profile header-avatar lookup");
assert.ok(profile.includes("const ownHeaderMedia=loadOwnHeaderAvatar(client,ownId,user.email);"));
assert.ok(profile.includes("const preloadedMedia=isMine?ownHeaderMedia:"),
 "The own profile must use the header response, not request the same row twice");
assert.ok(profile.includes("window.VATRA_AVATAR?.invalidatePath?.(client,ownId);"),
 "Successful avatar replacement must invalidate its cached path");

let fromCalls=0,sharedCalls=0,directCalls=0;
const pathsStart=avatar.indexOf("const PATH_TTL_MS=15_000");
const pathsEnd=avatar.indexOf("function safeUrl(input){",pathsStart);
assert.ok(pathsStart>0&&pathsEnd>pathsStart,"Find real shared avatar path cache");
const cacheEnv={Date,Map,Set,WeakMap,Promise,String,Error};
runInNewContext(avatar.slice(pathsStart,pathsEnd)+
 "\nglobalThis.profileAvatarCache={paths,invalidatePath};",cacheEnv);
const cachedPaths=cacheEnv.profileAvatarCache;

const client={
 auth:{onAuthStateChange(){}},
 storage:{from(bucket){
  assert.equal(bucket,"avatars");
  return {getPublicUrl(path){return {data:{publicUrl:"https://test.invalid/"+path}};}};
 }},
 from(table){
  assert.equal(table,"profile_media");
  return {select(fields){
   assert.equal(fields,"vatra_id,avatar_path");
   return {in(column,ids){
    assert.equal(column,"vatra_id");
    fromCalls++;
    const rows=Array.from(ids).map(id=>({vatra_id:Number(id),
     avatar_path:id+"/avatar/portrait.webp"}));
    return Promise.resolve({data:rows,error:null});
   }};
  }};
 }
};
const context={
 Map,Set,Promise,String,Number,
 targetId:"1",client,
 validId:id=>/^[1-9][0-9]{0,18}$/.test(String(id)),
 t:uk=>uk,
 window:{
  VATRA_PUBLIC_NAMES:{get:async(_client,ids)=>({data:ids.map(id=>({
   vatra_id:id,display_name:"Person "+id
  })),error:null})},
  VATRA_AVATAR:{
   paths(...args){sharedCalls++;return cachedPaths.paths(...args);},
   states:async()=>new Map([["4","deleted"]])
  }
 }
};
runInNewContext(profile.slice(start,end)+
 "\nglobalThis.resolveFriends=resolveFriendships;",context);
const short=[{requester_id:1,recipient_id:2},{requester_id:1,recipient_id:3},
 {requester_id:1,recipient_id:4}];
const first=await context.resolveFriends(short);
assert.equal(sharedCalls,1);
assert.equal(fromCalls,1,"Small friend previews must use one shared metadata batch");
assert.equal(first.length,3);
assert.equal(first[0].avatar,"https://test.invalid/2/avatar/portrait.webp");
assert.equal(first[2].avatar,null,"Deleted accounts must not display old portraits");
assert.equal(first[2].name,"Акаунт видалено");
await context.resolveFriends(short);
assert.equal(sharedCalls,2);
assert.equal(fromCalls,1,"Full friend list must reuse recently cached avatar metadata");
const large=Array.from({length:120},(_,i)=>({requester_id:1,recipient_id:i+10}));
const all=await context.resolveFriends(large);
assert.equal(all.length,120);
assert.equal(fromCalls,2,"More than 100 friends must retain a single untruncated query");
assert.equal(sharedCalls,2,"Avoid shared cache's 100-ID truncation for large lists");
cachedPaths.invalidatePath(client,"2");
await context.resolveFriends(short);
assert.equal(fromCalls,3,"Avatar replacements must re-fetch invalidated metadata");

let ownQueries=0,headerCalls=[];
const ownClient={from(table){
 assert.equal(table,"profile_media");
 return {select(fields){
  assert.equal(fields,"avatar_path,cover_path");
  return {eq(field,id){
   assert.equal(field,"vatra_id");assert.equal(id,"18");
   return {async maybeSingle(){
    ownQueries++;
    return {data:{avatar_path:"18/avatar/profile.webp",cover_path:"18/cover/banner.webp"},
     error:null};
   }};
  }};
 }};
}};
const ownEnv={
 Error,Promise,
 validId:id=>/^[1-9][0-9]{0,18}$/.test(String(id)),
 window:{VATRA_AVATAR:{fromPath(...args){headerCalls.push(args);}}}
};
runInNewContext(profile.slice(ownStart,ownEnd)+
 "\nglobalThis.loadOwnerMedia=loadOwnHeaderAvatar;",ownEnv);
const response=await ownEnv.loadOwnerMedia(ownClient,"18","owner@example.invalid");
assert.equal(ownQueries,1);
assert.equal(response.data.cover_path,"18/cover/banner.webp",
 "The same response must serve both cover and header/avatar");
assert.equal(headerCalls.length,1);
assert.equal(headerCalls[0][3],"18/avatar/profile.webp");
assert.ok((await ownEnv.loadOwnerMedia(ownClient,"bad","invalid@example.invalid")).error);
assert.equal(ownQueries,1,"Invalid IDs cannot hit the database");
console.log("VATRA profile media: cached friend previews, safe large-list fallback, owner request reuse and invalidation passed.");
