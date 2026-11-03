// VATRA: authenticated, rate-limited translation. Never place the DeepL key in client code.
// Required secret: DEEPL_API_KEY. Deploy with Supabase Edge Functions.
const ORIGINS=new Set(['https://mykolakolisnyk.github.io','http://localhost:5500','http://127.0.0.1:5500']);
const TARGETS=new Set(["aa","ab","ae","af","ak","am","an","ar","as","av","ay","az","ba","be","bg","bh","bi","bm","bn","bo","br","bs","ca","ce","ch","co","cr","cs","cv","cy","da","de","dv","dz","ee","el","en","eo","es","et","eu","fa","ff","fi","fj","fo","fr","fy","ga","gd","gl","gn","gu","gv","ha","he","hi","ho","hr","ht","hu","hy","hz","ia","id","ie","ig","ii","ik","io","is","it","iu","ja","jv","ka","kg","ki","kj","kk","kl","km","kn","ko","kr","ks","ku","kv","kw","ky","la","lb","lg","li","ln","lo","lt","lu","lv","mg","mh","mi","mk","ml","mn","mr","ms","mt","my","na","nb","nd","ne","ng","nl","nn","no","nr","nv","ny","oc","oj","om","or","os","pa","pi","pl","ps","pt","qu","rm","rn","ro","rw","sa","sc","sd","se","sg","si","sk","sl","sm","sn","so","sq","sr","ss","st","su","sv","sw","ta","te","tg","th","ti","tk","tl","tn","to","tr","ts","tt","tw","ty","ug","uk","ur","uz","ve","vi","vo","wa","wo","xh","yi","yo","za","zh","zu"]);
const DEEPL_TARGETS=new Set(['uk','en','pl','de','fr','es','pt','it','ar','bg','cs','da','el','et','fi','hu','id','ja','ko','lt','lv','nb','nl','ro','sk','sl','sv','tr','zh']);
function deeplLanguage(code:string){
 if(code==='en')return 'EN-US';
 if(code==='pt')return 'PT-PT';
 if(code==='zh')return 'ZH-HANS';
 return code.toUpperCase();
}

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
 if(!text||text.length>2500||!TARGETS.has(target))return response(req,{error:'INVALID_REQUEST'},400);
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
 const googleKey=Deno.env.get('GOOGLE_TRANSLATE_API_KEY')||'';
 const deepLKey=Deno.env.get('DEEPL_API_KEY')||'';
 if(!googleKey&&!deepLKey)return response(req,{error:'TRANSLATION_UNAVAILABLE'},503);
 if(googleKey){
  const endpoint='https://translation.googleapis.com/language/translate/v2?key='+encodeURIComponent(googleKey);
  const result=await fetch(endpoint,{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({q:text,target,format:'text'}),
   signal:AbortSignal.timeout(12000)
  }).catch(()=>null);
  if(result?.ok){
   const obj=await result.json().catch(()=>null);
   const output=obj?.data?.translations?.[0]?.translatedText;
   if(typeof output==='string'){
    const decoded=output.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"');
    return response(req,{translation:decoded,target});
   }
  }
  if(!deepLKey)return response(req,{error:'TRANSLATION_UNAVAILABLE'},502);
 }
 if(!DEEPL_TARGETS.has(target))return response(req,{error:'LANGUAGE_UNAVAILABLE'},422);
 const endpoint=deepLKey.endsWith(':fx')?'https://api-free.deepl.com/v2/translate':'https://api.deepl.com/v2/translate';
 const translated=await fetch(endpoint,{
  method:'POST',
  headers:{'Content-Type':'application/json',Authorization:'DeepL-Auth-Key '+deepLKey},
  body:JSON.stringify({text:[text],target_lang:deeplLanguage(target)}),
  signal:AbortSignal.timeout(12000)
 }).catch(()=>null);
 if(!translated?.ok)return response(req,{error:'TRANSLATION_UNAVAILABLE'},502);
 const body=await translated.json().catch(()=>null);
 const item=body?.translations?.[0];
 if(typeof item?.text!=='string')return response(req,{error:'TRANSLATION_UNAVAILABLE'},502);
 return response(req,{translation:item.text,detected:item.detected_source_language||null,target});
});
