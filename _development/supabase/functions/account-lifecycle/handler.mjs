// Staged, status-only gateway. Never enable mutations or ready:true here.
const CORS={
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Methods":"POST, OPTIONS",
 "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
};
const headers={...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store"};
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
const fail=(status,error)=>reply(status,{ok:false,error});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validUuid=value=>typeof value==="string"&&uuid.test(value);
async function smallJson(request){
 if(!request.body)throw Error("Missing body");
 const reader=request.body.getReader(),decoder=new TextDecoder("utf-8",{fatal:true});
 let bytes=0,text="";
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   bytes+=value.byteLength;if(bytes>1024){await reader.cancel();throw Error("Too large");}
   text+=decoder.decode(value,{stream:true});
  }
  return JSON.parse(text+decoder.decode());
 }finally{reader.releaseLock();}
}
// Only call after the same token has been verified by Auth.
export function verifiedSession(token,user){
 try{
  const parts=token.split(".");if(parts.length!==3||!user||user.is_anonymous===true)return null;
  const raw=parts[1].replace(/-/g,"+").replace(/_/g,"/");
  const claims=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw),c=>c.charCodeAt(0))));
  if(claims.sub!==user.id||!validUuid(user.id)||!validUuid(claims.session_id)||
     claims.role!=="authenticated"||!Number.isFinite(claims.exp)||claims.exp<=Date.now()/1000)return null;
  return {userId:user.id,sessionId:claims.session_id};
 }catch(_){return null;}
}
export function createHandler({verify,readStatus}){
 return async request=>{
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
  if(request.method!=="POST")return fail(405,"method_not_allowed");
  if(new URL(request.url).search)return fail(400,"invalid_request");
  const match=/^Bearer ([^\s]+)$/i.exec(request.headers.get("Authorization")||"");
  if(!match)return fail(401,"unauthorized");
  let payload;
  try{payload=await smallJson(request);}catch(_){return fail(400,"invalid_request");}
  if(!payload||typeof payload!=="object"||Array.isArray(payload))return fail(400,"invalid_request");
  // Even a valid authenticated user cannot invoke a mutation in this staged build.
  if(payload.action==="request_deletion"||payload.action==="restore")return fail(503,"lifecycle_not_enabled");
  if(payload.action!=="status"||Object.keys(payload).length!==1)return fail(400,"invalid_request");
  try{
   const identity=await verify(match[1]);
   if(!identity||!validUuid(identity.userId)||!validUuid(identity.sessionId))return fail(401,"unauthorized");
   const result=await readStatus(identity);
   if(!result||result.ok!==true||result.ready!==false||!["active","pending","purging"].includes(result.state))
    return fail(503,"unavailable");
   const response={ok:true,ready:false,state:result.state};
   if(result.state!=="active"){
    if(typeof result.restore_until!=="string"||!Number.isFinite(Date.parse(result.restore_until)))return fail(503,"unavailable");
    response.restore_until=result.restore_until;
   }
   return reply(200,response);
  }catch(_){return fail(503,"unavailable");}
 };
}
