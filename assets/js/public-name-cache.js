/* VATRA shared public-name cache: browser memory + authenticated Redis + RLS fallback.
   The only cached fields are VATRA ID and display name. Never cache session/user flags. */
(() => {
 "use strict";
 const memory=new Map(),inflight=new Map();
 const TTL=90_000,MAX_ENTRIES=256,MAX_BATCH=48;
 let retryRemoteAt=0;
 const validId=value=>{
  const text=String(value??"");
  const number=Number(text);
  return /^[1-9][0-9]{0,15}$/.test(text)&&Number.isSafeInteger(number)?String(number):null;
 };
 const validName=row=>row&&validId(row.vatra_id)&&
  typeof row.display_name==="string"&&row.display_name.length>0&&row.display_name.length<=160;
 const cached=id=>{
  const item=memory.get(id);
  if(!item)return null;
  if(item.expires>Date.now())return item.row;
  memory.delete(id);return null;
 };
 const remember=row=>{
  const id=validId(row.vatra_id);
  if(!id||!validName(row))return;
  memory.delete(id);
  memory.set(id,{row:{vatra_id:Number(id),display_name:row.display_name},expires:Date.now()+TTL});
  while(memory.size>MAX_ENTRIES)memory.delete(memory.keys().next().value);
 };
 async function fetchMissing(client,ids){
  if(Date.now()>=retryRemoteAt&&typeof client?.functions?.invoke==="function"){
   try{
    const {data,error}=await client.functions.invoke("public-profile-names",{
     body:{ids:ids.map(Number)}
    });
    if(error||!data||!Array.isArray(data.data))throw error||Error("Invalid name cache response");
    const allowed=new Set(ids);
    return data.data.filter(validName).filter(row=>allowed.has(validId(row.vatra_id)));
   }catch(_){
    // One failed Edge/Redis request must not create a retry storm.
    retryRemoteAt=Date.now()+60_000;
   }
  }
  const {data,error}=await client.from("public_profiles")
   .select("vatra_id,display_name").in("vatra_id",ids);
  if(error)throw error;
  return (data||[]).filter(validName);
 }
 async function get(client,ids){
  const unique=[...new Set((Array.isArray(ids)?ids:[])
   .map(validId).filter(Boolean))].slice(0,120);
  if(!unique.length)return {data:[],error:null};
  const needed=unique.filter(id=>!cached(id));
  try{
   const groups=[];
   for(let i=0;i<needed.length;i+=MAX_BATCH)groups.push(needed.slice(i,i+MAX_BATCH));
   await Promise.all(groups.map(async group=>{
    const key=group.join(",");
    let task=inflight.get(key);
    if(!task){
     task=fetchMissing(client,group);
     inflight.set(key,task);
     void task.finally(()=>{if(inflight.get(key)===task)inflight.delete(key);}).catch(()=>{});
    }
    for(const row of await task)remember(row);
   }));
   return {data:unique.map(cached).filter(Boolean),error:null};
  }catch(error){return {data:[],error};}
 }
 window.VATRA_PUBLIC_NAMES={get};
})();
