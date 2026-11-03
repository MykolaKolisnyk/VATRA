// VATRA: authenticated, rate-limited translation. Never place the DeepL key in client code.
// Required secret: DEEPL_API_KEY. Deploy with Supabase Edge Functions.
const ORIGINS=new Set(['https://mykolakolisnyk.github.io','http://localhost:5500','http://127.0.0.1:5500']);
const TARGETS={uk:'UK',en:'EN',pl:'PL',de:'DE',fr:'FR',es:'ES',pt:'PT-PT',it:'IT'};
const url=Deno.env.get('SUPABASE_URL')||'';
const publicKey=Deno.env.get('VATRA_PUBLIC_KEY')||'sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-';
function response(req,data,status=200){
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
 if(ORIGINS.has(origin))headers['Access-Control-Allow-Origin']=origin;
 headers['Access-Control-Allow-Headers']='authorization,apikey,content-type,x-client-info';
 headers['Access-Control-Allow-Methods']='POST, OPTIONS';
 return new Response(status===204?null:JSON.stringify(data),{status,headers});
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin');
 if(origin&&!ORIGINS.has(origin))return response(req,{error:'ORIGIN_NOT_ALLOWED'},403);
 if(req.method==='OPTIONS')return response(req,{},204);
 if(req.method!=='POST')return response(req,{error:'METHOD_NOT_ALLOWED'},405);
 const bearer=req.headers.get('authorization')||'';
 if(!bearer.startsWith('Bearer '))return response(req,{error:'SIGN_IN_REQUIRED'},401);
 if(!url)return response(req,{error:'SERVICE_NOT_READY'},503);
 let payload;
 try{payload=await req.json();}catch{return response(req,{error:'INVALID_REQUEST'},400);}
 const text=String(payload?.text||'').trim(),target=String(payload?.target||'').toLowerCase();
 if(!text||text.length>2500||!TARGETS[target])return response(req,{error:'INVALID_REQUEST'},400);
 const authResp=await fetch(url+'/auth/v1/user',{
  headers:{Authorization:bearer,apikey:publicKey}
 }).catch(()=>null);
 if(!authResp?.ok)return response(req,{error:'SIGN_IN_REQUIRED'},401);
 const user=await authResp.json().catch(()=>null);
 if(!user?.id)return response(req,{error:'SIGN_IN_REQUIRED'},401);
 const quota=await fetch(url+'/rest/v1/rpc/vatra_claim_translation_quota',{
  method:'POST',
  headers:{Authorization:bearer,apikey:publicKey,'Content-Type':'application/json'},
  body:'{}'
 }).catch(()=>null);
 if(!quota?.ok)return response(req,{error:'TRANSLATION_QUOTA_NOT_READY'},503);
 if((await quota.json().catch(()=>false))!==true)return response(req,{error:'RATE_LIMITED'},429);
 const key=Deno.env.get('DEEPL_API_KEY')||'';
 if(!key)return response(req,{error:'TRANSLATION_UNAVAILABLE'},503);
 const endpoint=key.endsWith(':fx')?'https://api-free.deepl.com/v2/translate':'https://api.deepl.com/v2/translate';
 const translated=await fetch(endpoint,{
  method:'POST',
  headers:{'Content-Type':'application/json',Authorization:'DeepL-Auth-Key '+key},
  body:JSON.stringify({text:[text],target_lang:TARGETS[target]}),
  signal:AbortSignal.timeout(12000)
 }).catch(()=>null);
 if(!translated?.ok)return response(req,{error:'TRANSLATION_UNAVAILABLE'},502);
 const body=await translated.json().catch(()=>null);
 const item=body?.translations?.[0];
 if(typeof item?.text!=='string')return response(req,{error:'TRANSLATION_UNAVAILABLE'},502);
 return response(req,{translation:item.text,detected:item.detected_source_language||null,target});
});
