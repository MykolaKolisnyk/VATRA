let generation=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const english=()=>document.documentElement.lang==="en";
export function stop(){generation++;}
export async function start(client,accountId,isCurrent){
 const ticket=++generation;
 const valid=()=>ticket===generation&&isCurrent()&&document.visibilityState!=="prerender";
 await sleep(1100);
 if(!valid()||!client?.from)return;
 try{
  const now=new Date().toISOString();
  const {data:items,error}=await client.from("announcements")
   .select("id,title_uk,title_en,body_uk,body_en,target_path,active,starts_at,ends_at,created_at")
   .eq("active",true).lte("starts_at",now).order("created_at",{ascending:false}).limit(15);
  if(error||!Array.isArray(items)||!valid())return;
  const relevant=items.filter(item=>!item.ends_at||item.ends_at>now);
  if(!relevant.length)return;
  const {data:seen,result,error:seenError}=await client.from("announcement_views")
   .select("announcement_id").in("announcement_id",relevant.map(item=>item.id));
  if(seenError||!valid())return;
  const viewed=new Set((seen||[]).map(row=>String(row.announcement_id)));
  const item=relevant.find(row=>!viewed.has(String(row.id)));
  if(!item)return;
  for(let i=0;i<20&&!window.VATRA_TOAST?.show&&valid();i++)await sleep(150);
  if(!valid()||!window.VATRA_TOAST?.show)return;
  const {error:markError}=await client.from("announcement_views").insert({announcement_id:item.id});
  if(markError||!valid())return;
  const title=english()?(item.title_en||item.title_uk):(item.title_uk||item.title_en);
  const message=english()?(item.body_en||item.body_uk):(item.body_uk||item.body_en);
  window.VATRA_TOAST.show(message,"new",{title,href:item.target_path||"",actionLabel:english()?"Learn more":"Дізнатися більше",duration:11500});
 }catch(_){}
}
