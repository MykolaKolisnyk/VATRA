import assert from "node:assert/strict";
import {createHandler,verifiedSession} from "../../supabase/functions/account-lifecycle/handler.mjs";
const userId="11111111-1111-4111-8111-111111111111",sessionId="22222222-2222-4222-8222-222222222222";
const otherId="33333333-3333-4333-8333-333333333333";
const jwt=claims=>"e30."+Buffer.from(JSON.stringify(claims)).toString("base64url")+".signature";
const claims={sub:userId,session_id:sessionId,role:"authenticated",exp:Math.floor(Date.now()/1000)+300};
assert.deepEqual(verifiedSession(jwt(claims),{id:userId}),{userId,sessionId});
for(const invalid of [{...claims,sub:otherId},{...claims,session_id:"invalid"},{...claims,role:"anon"},{...claims,exp:0}]){
 assert.equal(verifiedSession(jwt(invalid),{id:userId}),null);
}
assert.equal(verifiedSession(jwt(claims),{id:userId,is_anonymous:true}),null);
assert.equal(verifiedSession("broken",{id:userId}),null);
let reads=0,verifications=0,state={ok:true,ready:false,state:"active"};
const handler=createHandler({
 async verify(token){verifications++;return token==="valid"?{userId,sessionId}:null;},
 async readStatus(identity){reads++;assert.deepEqual(identity,{userId,sessionId});return state;}
});
const request=(payload,token="valid",method="POST",suffix="")=>new Request("https://example.invalid/account-lifecycle"+suffix,{
 method,headers:{...(token?{Authorization:"Bearer "+token}:{}),"Content-Type":"application/json"},
 ...(method==="POST"?{body:typeof payload==="string"?payload:JSON.stringify(payload)}:{})
});
let response=await handler(request({action:"status"}));
assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"private, no-store");
assert.deepEqual(await response.json(),state);
state={ok:true,ready:false,state:"pending",restore_until:"2026-12-01T12:00:00.000Z",private_note:"must not leak"};
response=await handler(request({action:"status"}));
assert.deepEqual(await response.json(),{ok:true,ready:false,state:"pending",restore_until:state.restore_until});
const before=reads;
for(const [req,status] of [
 [request({action:"status"},""),401],[request({action:"status"},"invalid"),401],
 [request({action:"status",caller:otherId}),400],[request({action:"status",session_id:sessionId}),400],
 [request({action:"request_deletion",recovery_days:0}),503],[request({action:"restore"}),503],
 [request("{broken"),400],[request("x".repeat(1025)),400],[request({action:"status"},"valid","GET"),405],
 [request({action:"status"},"valid","POST","?caller="+otherId),400]
])assert.equal((await handler(req)).status,status);
assert.equal(reads,before,"Invalid requests and mutations cannot call privileged RPC");
assert.equal(verifications,3,"Only well-formed status requests reach Auth");
state={ok:true,ready:true,state:"active"};assert.equal((await handler(request({action:"status"}))).status,503);
state={ok:true,ready:false,state:"pending",restore_until:"invalid"};assert.equal((await handler(request({action:"status"}))).status,503);
const unavailable=createHandler({verify:async()=>({userId,sessionId}),readStatus:async()=>{throw Error("private backend detail");}});
response=await unavailable(request({action:"status"}));assert.equal(response.status,503);
assert.deepEqual(await response.json(),{ok:false,error:"unavailable"});
console.log("VATRA staged lifecycle gateway: verified identity, no caller override, no mutations, sanitized status and fail-closed errors passed.");
