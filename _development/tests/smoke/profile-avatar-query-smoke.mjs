// Offline regression for profile media request deduplication.
// Evaluates the live production function bodies against fake PostgREST clients.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const profile=await readFile("assets/js/profile/profile.js","utf8");
const avatar=await readFile("assets/js/avatar.js","utf8");
const start=profile.indexOf(" async function resolveFriendships(friendships){");
const end=profile.indexOf(" const showFriends=async()=>{",start);
assert.ok(start>0&&end>start,"Find profile friend-avatar resolver");
const ownStart=profile.indexOf("async function loadOwnHeaderAvatar(client,ownId,email){");
const ownEnd=profile.indexOf("async function start(){",ownStart);
assert.ok(ownStart>0&&ownEnd>ownStart,"Find profile header-avatar lookup");
assert.ok(profile.includes("const ownHeaderMedia=loadOwnHeaderAvatar(client,ownId,user.email);"));
assert.ok(!profile.includes('const findPublic=async(kind)=>{')&&
 profile.includes('if(response?.error)response=await request();'),
 "Missing profile_media rows must not trigger slow Storage LIST or redundant database retries");
assert.ok(profile.includes("const preloadedMedia=isMine?ownHeaderMedia:"),
 "The own profile must use the header response, not request the same row twice");
assert.ok(profile.includes("window.VATRA_AVATAR?.invalidatePath?.(client,ownId);"),
 "Successful avatar replacement must invalidate its cached path");

let fromCalls=0,sharedCalls=0,namesCalls=0,statesCalls=0;
const nameBatches=[],stateBatches=[],pathBatches=[];
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
  VATRA_PUBLIC_NAMES:{get:async(_client,ids)=>{
   namesCalls++;nameBatches.push([...ids]);
   // Simulate the shared helper's bounded input to reveal any truncation.
   return {data:ids.slice(0,120).map(id=>({
    vatra_id:id,display_name:"Person "+id
   })),error:null};
  }},
  VATRA_AVATAR:{
   paths(...args){sharedCalls++;pathBatches.push([...args[1]]);return cachedPaths.paths(...args);},
   states:async(_client,ids)=>{
    statesCalls++;stateBatches.push([...ids]);
    const states=new Map([["4","deleted"],["213","deleted"],["214","blocked"]]);
    return new Map(ids.slice(0,100).filter(id=>states.has(String(id)))
     .map(id=>[String(id),states.get(String(id))]));
   }
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
// Three full batches ensure names and safety-critical account states reach
// members beyond the first 100, including the last five friend IDs.
const large=Array.from({length:205},(_,i)=>({requester_id:1,recipient_id:i+10}));
const all=await context.resolveFriends(large);
assert.equal(all.length,205,"Every friend must be returned");
assert.equal(fromCalls,4,"Use one shared avatar query per bounded batch");
assert.equal(sharedCalls,5,"Even a 205-person list must use the shared path cache");
assert.equal(namesCalls,5,"Public names use the same bounded batches");
assert.equal(statesCalls,5,"Account states must be loaded for every friend");
assert.deepEqual(nameBatches.slice(2).map(ids=>ids.length),[100,100,5]);
assert.deepEqual(stateBatches.slice(2).map(ids=>ids.length),[100,100,5]);
assert.deepEqual(pathBatches.slice(2).map(ids=>ids.length),[100,100,5]);
assert.equal(all[204].name,"Акаунт заблоковано");
assert.equal(all[204].state,"blocked");
assert.equal(all[204].avatar,null,"Blocked member at the end must not expose a portrait");
assert.equal(all[203].name,"Акаунт видалено");
assert.equal(all[203].state,"deleted");
assert.equal(all[203].avatar,null,"Deleted member at the end must not expose a portrait");
assert.equal(all[202].name,"Person 212");
assert.equal(all[202].avatar,"https://test.invalid/212/avatar/portrait.webp");
cachedPaths.invalidatePath(client,"2");
await context.resolveFriends(short);
assert.equal(fromCalls,5,"Avatar replacements must re-fetch invalidated metadata");

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
console.log("VATRA profile media: bounded 205-friend batching, deleted/blocked avatar safety, owner reuse and cache invalidation passed.");


// The avatar history cache is local to a mounted profile. A deletion always
// obtains a fresh list, and stale responses after mutations cannot repopulate it.
{
 const begin=profile.indexOf("function createAvatarGalleryLoader(");
 const finish=profile.indexOf("async function setupProfileMedia(",begin);
 assert.ok(begin>=0&&finish>begin);
 const env={};
 runInNewContext(profile.slice(begin,finish)+"\nglobalThis.makeLoader=createAvatarGalleryLoader;",env);
 let calls=0,clock=1000,resolveRead;
 const loader=env.makeLoader(()=>{calls++;return new Promise(resolve=>{resolveRead=resolve;});},()=>clock);
 const one=loader.get(),two=loader.get();
 await Promise.resolve();assert.equal(calls,1);
 resolveRead(["first"]);assert.deepEqual(Array.from(await one),["first"]);
 const second=await two;second.push("wrong");
 assert.deepEqual(Array.from(await loader.get()),["first"]);assert.equal(calls,1);
 clock+=15001;
 const expired=loader.get();await Promise.resolve();assert.equal(calls,2);
 resolveRead(["new"]);assert.deepEqual(Array.from(await expired),["new"]);
 const fresh=loader.get(true);await Promise.resolve();assert.equal(calls,3);
 resolveRead(["verified"]);assert.deepEqual(Array.from(await fresh),["verified"]);
 loader.invalidate();const old=loader.get();const rejected=assert.rejects(old,/Avatar gallery changed/);
 await Promise.resolve();const oldResolve=resolveRead;
 loader.invalidate();const current=loader.get();await Promise.resolve();
 oldResolve(["obsolete"]);await rejected;
 resolveRead(["current"]);assert.deepEqual(Array.from(await current),["current"]);
 assert.deepEqual(Array.from(await loader.get()),["current"]);assert.equal(calls,5);
 const other=env.makeLoader(async()=>["other"],()=>clock);
 assert.deepEqual(Array.from(await other.get()),["other"]);
 assert.deepEqual(Array.from(await loader.get()),["current"]);
 const fail=env.makeLoader(async()=>{throw Error("Network unavailable");});
 await assert.rejects(fail.get(),/Network unavailable/);
 await assert.rejects(fail.get(),/Network unavailable/);
 assert.ok(profile.includes("await listAvatarGallery(true)"),"Deletion must not use a cached file listing");
}
console.log("VATRA avatar history: single-flight, TTL, fresh mutation lookup and stale-response isolation passed.");
