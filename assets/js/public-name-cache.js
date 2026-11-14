/* VATRA public-name cache: authenticated Redis + RLS fallback, bounded per-viewer memory.
   Only VATRA IDs and display names are returned; session state is never persisted. */
(() => {
 "use strict";
 const caches=new WeakMap();
 const TTL=90_000,MISSING_TTL=15_000,MAX_ENTRIES=256,MAX_BATCH=48;
 const validId=value=>{
  const text=String(value??""),number=Number(text);
  return /^[1-9][0-9]{0,15}$/.test(text)&&Number.isSafeInteger(number)?String(number):null;
 };
 const validName=row=>row&&validId(row.vatra_id)&&
  typeof row.display_name==="string"&&row.display_name.length>0&&row.display_name.length<=160;
 const stateFor=client=>{
  let state=caches.get(client);
  if(state)return state;
  state={rows:new Map(),pending:new Map(),generation:0,retryRemoteAt:0};
  caches.set(client,state);
  if(typeof client.auth?.onAuthStateChange==="function"){
   client.auth.onAuthStateChange(event=>{
    // These don't change the signed-in user. Clear on sign-in/sign-out,
    // user update, or any other account-transition notification.
    if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;
    state.generation++;
    state.rows.clear();
    state.pending.clear();
    state.retryRemoteAt=0;
   });
  }
  return state;
 };
 const entryFor=(state,id)=>{
  const entry=state.rows.get(id);
  if(!entry)return undefined;
  if(entry.expires<=Date.now()){
   state.rows.delete(id);
   return undefined;
  }
  // Make the bounded cache LRU instead of allowing hot entries to be evicted.
  state.rows.delete(id);
  state.rows.set(id,entry);
  return entry;
 };
 const remember=(state,id,row)=>{
  state.rows.delete(id);
  state.rows.set(id,{row,expires:Date.now()+(row?TTL:MISSING_TTL)});
  while(state.rows.size>MAX_ENTRIES)state.rows.delete(state.rows.keys().next().value);
 };
 async function fetchMissing(client,ids,state){
  if(Date.now()>=state.retryRemoteAt&&typeof client?.functions?.invoke==="function"){
   try{
    const {data,error}=await client.functions.invoke("public-profile-names",{
     body:{ids:ids.map(Number)}
    });
    if(error||!data||!Array.isArray(data.data))throw error||Error("Invalid name cache response");
    const allowed=new Set(ids);
    return data.data.filter(validName).filter(row=>allowed.has(validId(row.vatra_id)));
   }catch(_){
    // Avoid a wave of repeated failed Edge calls; use normal PostgREST RLS.
    state.retryRemoteAt=Date.now()+60_000;
   }
  }
  const {data,error}=await client.from("public_profiles")
   .select("vatra_id,display_name").in("vatra_id",ids);
  if(error)throw error;
  const allowed=new Set(ids);
  return (data||[]).filter(validName).filter(row=>allowed.has(validId(row.vatra_id)));
 }
 async function get(client,ids){
  const unique=[...new Set((Array.isArray(ids)?ids:[])
   .map(validId).filter(Boolean))].slice(0,120);
  if(!unique.length)return {data:[],error:null};
  if(!client)return {data:[],error:Error("Missing Supabase client")};
  const state=stateFor(client),generation=state.generation,needed=[];
  const tasks=new Set();
  for(const id of unique){
   if(entryFor(state,id)!==undefined)continue;
   const existing=state.pending.get(id);
   if(existing)tasks.add(existing);
   else needed.push(id);
  }
  for(let i=0;i<needed.length;i+=MAX_BATCH){
   const batch=needed.slice(i,i+MAX_BATCH);
   const task=fetchMissing(client,batch,state).then(data=>{
    if(state.generation!==generation)return;
    const found=new Map(data.map(row=>[validId(row.vatra_id),row]));
    for(const id of batch){
     const value=found.get(id);
     remember(state,id,value?
      {vatra_id:Number(id),display_name:value.display_name}:null);
    }
   });
   for(const id of batch)state.pending.set(id,task);
   tasks.add(task);
   void task.finally(()=>{
    for(const id of batch)
     if(state.pending.get(id)===task)state.pending.delete(id);
   }).catch(()=>{});
  }
  try{
   await Promise.all(tasks);
   if(state.generation!==generation)
    throw Error("Session changed while loading public names");
   return {data:unique.map(id=>entryFor(state,id)?.row).filter(Boolean),error:null};
  }catch(error){return {data:[],error};}
 }
 window.VATRA_PUBLIC_NAMES={get};
})();
