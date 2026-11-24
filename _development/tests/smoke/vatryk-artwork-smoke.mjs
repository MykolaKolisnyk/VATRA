// Offline VATRA artwork and missing-page regression.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const base=await readFile("assets/css/base.css","utf8");
const profile=await readFile("assets/css/profile.css","utf8");
const notFound=await readFile("assets/css/not-found.css","utf8");
const avatar=await readFile("assets/js/avatar.js","utf8");
const html=await readFile("404.html","utf8");
for(const kind of ["404","blocked","deleted","not-found"]){
 const path="assets/vatryk/"+(kind==="404"?"vatryk_detective.webp":"vatryk-"+kind+".webp");
 const bytes=await readFile(path);
 assert.ok(bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP"&&bytes.length>1000,path+" must be real WebP");
 if(kind==="404"){
  assert.ok(html.includes('class="ui-404-vatryk-001" aria-hidden="true"')&&notFound.includes('background-image:url("/VATRA/'+path+'")'));
 }else{
  const url="/VATRA/"+path;
  assert.ok(base.includes('--vatra-'+kind+'-avatar:url("'+url+'")'));
  assert.ok(avatar.includes(kind+':"'+url+'"')||avatar.includes('"'+kind+'":"'+url+'"'));
  assert.ok(profile.includes('profile-avatar[data-vatra-avatar-state="'+kind+'"]'));
 }
}
assert.ok(base.includes('--vatra-default-avatar:url("data:image/svg+xml,'));
assert.ok(html.includes('class="vatra-404-accessible-title-001"')&&html.includes("Такої сторінки немає")&&html.includes('href="/VATRA/" class="error-home-link vatra-404-link-002"'));
assert.ok(notFound.includes(".error-main .ui-404-vatryk-001")&&notFound.includes('html.vatra-dynamic-route-pending body.error-page'));
assert.ok(!/<(?:header|footer)\b/i.test(html)&&notFound.includes("background:#f5f5f5;")&&!notFound.includes("radial-gradient("));
console.log("VATRA: four WebP artworks and 404 message/state wiring verified.");

// New service states, their real source artwork and explicit-error mapping.
import vm from "node:vm";
const runtime=await readFile("assets/js/network.js","utf8");
for(const name of ["vatryk_403.webp","vatryk_429.webp","vatryk_500.webp","vatryk_503.webp","vatryk_account-blocking.webp","vatryk_ending-the-session.webp"]){
 const bytes=await readFile("assets/vatryk/"+name);assert.equal(bytes.toString("ascii",0,4),"RIFF");assert.equal(bytes.toString("ascii",8,12),"WEBP");assert.ok(runtime.includes(name));
}
const window={};vm.runInNewContext(runtime,{window,URL,document:{currentScript:{src:"https://example.test/VATRA/assets/js/network.js"},baseURI:"https://example.test/VATRA/",addEventListener(){}}});
const classify=window.VATRA_SERVICE_NOTICE.classify;
for(const code of [403,429,500,503])assert.equal(classify({status:code}),String(code));
assert.equal(classify({status:502}),"503");assert.equal(classify({code:"42501"}),"403");assert.equal(classify({code:"over_request_rate_limit"}),"429");assert.equal(classify({code:"session_expired"},{session:true}),"session");assert.equal(classify({code:"session_expired"}),null);assert.equal(classify({status:403},{access:false}),null);assert.equal(classify({status:400,code:"invalid_credentials"}),null);assert.equal(classify(new Error("Network down")),null);
assert.ok(base.includes(".ui-vatra-service-notice-001"));
console.log("VATRA: six new service illustrations and status classification verified.");

const feedRuntime=await readFile("assets/js/feed.js","utf8");
assert.ok(runtime.includes('document.body.dataset.authReady==="true"')&&
 runtime.includes('!document.body.classList.contains("vatra-shell-pending")'),
 "Service errors must not mount within an invisible pending feed");
assert.ok(feedRuntime.includes('loader.hidden=false;loader.dataset.loadingError="true"')&&
 feedRuntime.includes('await feedDeadline(client.auth.getUser())')&&
 feedRuntime.includes('if(profile.error||!validId(profile.data?.vatra_id))'),
 "Feed startup must expose retry after bounded requests without bypassing authentication");
const begin=feedRuntime.indexOf(" function feedDeadline("),end=feedRuntime.indexOf(" async function init(){",begin);
assert.ok(begin>=0&&end>begin);
const deadlineContext={Promise,Error,Object,setTimeout:(fn)=>setTimeout(fn,5),clearTimeout};
vm.runInNewContext(feedRuntime.slice(begin,end)+"\nglobalThis.deadline=feedDeadline;",deadlineContext);
assert.equal(await deadlineContext.deadline(Promise.resolve("ok")),"ok");
await assert.rejects(deadlineContext.deadline(new Promise(()=>{})),/Feed request timed out/);
console.log("VATRA Feed: visible startup error, auth deadline and fail-closed account check verified.");

const profileRuntime=await readFile("assets/js/profile.js","utf8");
assert.ok(profileRuntime.includes('const prepared=profileDeadline(window.VATRA_PROFILE_DETAILS.prepare({client,ownId,targetId,isMine}))')&&
 profileRuntime.indexOf('const prepared=profileDeadline')<profileRuntime.indexOf('const [directoryOutcome,publicOutcome,stateOutcome,blockOutcome]'),
 "Profile visibility and own detail requests must overlap the identity checks");
assert.ok(profileRuntime.includes('if(!isMine&&(blockOutcome.status!=="fulfilled"||blockOutcome.value.error))throw Error("Profile block check unavailable")')&&
 profileRuntime.includes('const result=locked?{data:[],error:null}:isMine?ownerDetails:await client.from("profile_details")'),
 "Visitor details remain behind the verified privacy and block gates");
assert.ok(!profileRuntime.includes("if(locked)await mediaPromise;"),"Locked profile shell must not wait for image decoding");
console.log("VATRA Profile: parallel access reads, bounded startup and non-blocking image presentation verified.");
