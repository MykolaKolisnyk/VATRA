// VATRA account lifecycle. Deploy with verify_jwt=false, then set the cron secret.
// The service-role key must NEVER be shipped to the frontend or committed.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL') || '';
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const cronSecret = Deno.env.get('VATRA_LIFECYCLE_CRON_SECRET') || '';
const service = createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const origins = new Set([
  'https://mykolakolisnyk.github.io',
  'http://localhost:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
]);
const dayMs=86_400_000;
type Lifecycle={
 user_id:string; inactivity_days:number|null; last_seen_at:string;
 deletion_requested_at:string|null;delete_after:string|null;
 deletion_reason:string|null;
};
const allowedDays=[7,30,365];
const cors=(origin:string|null)=>({
 'Access-Control-Allow-Origin':origins.has(origin||'')?origin!:'https://mykolakolisnyk.github.io',
 'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-vatra-cron-secret',
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Vary':'Origin',
});
const json=(body:unknown,status=200,origin:string|null=null)=>new Response(JSON.stringify(body),{
 status,headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
});
async function getLifecycle(uid:string){
 const {data,error}=await service.from('vatra_account_lifecycle')
  .select('*').eq('user_id',uid).maybeSingle();
 if(error)throw error;
 if(data)return data as Lifecycle;
 const {data:created,error:insertError}=await service.from('vatra_account_lifecycle')
  .upsert({user_id:uid,last_seen_at:new Date().toISOString()},{onConflict:'user_id'})
  .select('*').single();
 if(insertError)throw insertError;
 return created as Lifecycle;
}
async function ownsGroups(uid:string){
 const {data,error}=await service.from('app_data').select('path')
  .like('path','groups/%').contains('value',{ownerUid:uid}).limit(1);
 if(error)throw error;return !!data?.length;
}
async function removeMedia(uid:string){
 // All frontend uploads are stored under <uid>/<category>/filename.
 for(const category of ['posts','avatars','covers','videos']){
  for(let pass=0;pass<100;pass++){
   const prefix=uid+'/'+category;
   const {data,error}=await service.storage.from('vatra-media').list(prefix,{limit:100,offset:0});
   if(error)throw error;
   const filenames=(data||[]).filter(item=>item.name&&item.id).map(item=>prefix+'/'+item.name);
   if(!filenames.length)break;
   const {error:removeError}=await service.storage.from('vatra-media').remove(filenames);
   if(removeError)throw removeError;
  }
 }
}
async function deleteDueAccount(record:Lifecycle){
 if(!record.delete_after||Date.parse(record.delete_after)>Date.now())return false;
 // Never silently destroy third-party community content; require transfer first.
 if(await ownsGroups(record.user_id))return false;
 // Verify against current database state again immediately before purging.
 const {data:live,error:lookupError}=await service.from('vatra_account_lifecycle')
  .select('delete_after').eq('user_id',record.user_id).maybeSingle();
 if(lookupError)throw lookupError;
 if(!live?.delete_after||Date.parse(live.delete_after)>Date.now())return false;
 await removeMedia(record.user_id);
 const {error:purgeError}=await service.rpc('vatra_purge_user_data',{target_uid:record.user_id});
 if(purgeError)throw purgeError;
 // Hard deletion (not auth "soft delete"): removes auth sessions and identity.
 const {error:deleteError}=await service.auth.admin.deleteUser(record.user_id,false);
 if(deleteError)throw deleteError;
 return true;
}
async function runSweep(){
 let deleted=0,errors=0;
 // Mark all eligible inactive users in PostgreSQL without a 500-user cap.
 const {data:marked,error:markError}=await service.rpc('vatra_mark_inactive_users');
 if(markError)throw markError;
 const {data:due,error}=await service.from('vatra_account_lifecycle')
  .select('*').not('delete_after','is',null)
  .lte('delete_after',new Date().toISOString())
  .order('updated_at',{ascending:true}).limit(200);
 if(error)throw error;
 for(const row of (due||[]) as Lifecycle[]){
  try{
   if(await deleteDueAccount(row))deleted++;
  }catch(err){
   errors++;
   console.error('Account lifecycle sweep entry failed:',row.user_id,err);
   // Rotate failed rows to the back of the queue; never mark deletion done.
   await service.from('vatra_account_lifecycle')
    .update({updated_at:new Date().toISOString()}).eq('user_id',row.user_id);
  }
 }
 return {marked:Number(marked)||0,deleted,errors};
}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
 if(req.method!=='POST')return json({error:'Method not allowed'},405,origin);
 try{
  const payload=await req.json().catch(()=>({}));
  if(payload?.action==='sweep'){
   if(!cronSecret||req.headers.get('x-vatra-cron-secret')!==cronSecret)
    return json({error:'Unauthorized'},401,origin);
   return json(await runSweep(),200,origin);
  }
  if(!origins.has(origin||''))return json({error:'Forbidden origin'},403,origin);
  const bearer=req.headers.get('authorization')||'';
  const token=bearer.startsWith('Bearer ')?bearer.slice(7):'';
  if(!token)return json({error:'Sign-in required'},401,origin);
  const {data:auth,error:authError}=await service.auth.getUser(token);
  if(authError||!auth.user)return json({error:'Invalid session'},401,origin);
  const uid=auth.user.id;
  const row=await getLifecycle(uid);
  const action=String(payload?.action||'status');
  if(action==='status'||action==='touch'){
   // The act of signing in does NOT silently cancel a voluntary deletion.
   if(!row.delete_after){
    const timestamp=new Date().toISOString();
    const {error}=await service.from('vatra_account_lifecycle').update({
     last_seen_at:timestamp,updated_at:timestamp
    }).eq('user_id',uid);
    if(error)throw error;
    row.last_seen_at=timestamp;
   }
   return json({lifecycle:row},200,origin);
  }
  if(action==='set-inactivity'){
   const days=payload?.days===null?null:Number(payload?.days);
   if(days!==null&&!allowedDays.includes(days))return json({error:'Invalid inactivity policy'},400,origin);
   if(row.delete_after)return json({error:'Restore your account before changing this setting'},409,origin);
   const {data,error}=await service.from('vatra_account_lifecycle').update({
    inactivity_days:days,updated_at:new Date().toISOString()
   }).eq('user_id',uid).select('*').single();
   if(error)throw error;
   return json({lifecycle:data},200,origin);
  }
  if(action==='schedule'){
   if(payload?.confirm!=='ВИДАЛИТИ')return json({error:'Confirmation required'},400,origin);
   if(row.delete_after)return json({lifecycle:row},200,origin);
   if(await ownsGroups(uid))return json({
    error:'Спочатку передайте керування власними спільнотами або видаліть їх. Поки Ви їхній власник, видалення акаунта недоступне.'
   },409,origin);
   const now=Date.now(),stamp=new Date(now).toISOString();
   const {data,error}=await service.from('vatra_account_lifecycle').update({
    deletion_requested_at:stamp,delete_after:new Date(now+30*dayMs).toISOString(),
    deletion_reason:'user',updated_at:stamp
   }).eq('user_id',uid).is('delete_after',null).select('*').single();
   if(error)throw error;
   return json({lifecycle:data},200,origin);
  }
  if(action==='cancel'){
   if(!row.delete_after)return json({lifecycle:row},200,origin);
   if(Date.parse(row.delete_after)<=Date.now())return json({error:'The recovery period has ended'},409,origin);
   const stamp=new Date().toISOString();
   const {data,error}=await service.from('vatra_account_lifecycle').update({
    deletion_requested_at:null,delete_after:null,deletion_reason:null,
    last_seen_at:stamp,updated_at:stamp
   }).eq('user_id',uid).select('*').single();
   if(error)throw error;
   return json({lifecycle:data},200,origin);
  }
  return json({error:'Unknown action'},400,origin);
 }catch(error){
  console.error('VATRA lifecycle:',error);
  return json({error:'Сервіс керування акаунтом тимчасово недоступний.'},500,origin);
 }
});
