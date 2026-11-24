(() => {
 "use strict";
 const caches=new WeakMap();
 const TTL=90_000,MISSING_TTL=15_000,MAX_ENTRIES=256,MAX_BATCH=48;
 const EDGE_COOLDOWN_KEY="vatra-public-names-edge-retry-at-v1";
 const TAB_KEY="vatra:public-names:tab:v1",TAB_TTL=30000;
 const viewerId=value=>typeof value==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)?value.toLowerCase():null;
 const readTab=()=>{try{return JSON.parse(sessionStorage.getItem(TAB_KEY)||"null");}catch(_){return null;}};
 const clearTab=viewer=>{try{if(readTab()?.viewer===viewer)sessionStorage.removeItem(TAB_KEY);}catch(_){}};
 const EDGE_CACHE_ENABLED=window.VATRA_NAME_CACHE_EDGE_ENABLED===true;
 const edgeRetryAt=()=>{
  try{
   const time=Number(sessionStorage.getItem(EDGE_COOLDOWN_KEY));
   return Number.isFinite(time)&&time>Date.now()&&time<Date.now()+600_000?time:0;
  }catch(_){return 0;}
 };
 const pauseEdge=state=>{
  state.retryRemoteAt=Date.now()+300_000;
  try{sessionStorage.setItem(EDGE_COOLDOWN_KEY,String(state.retryRemoteAt));}catch(_){}
 };
 const validId=value=>{
  const text=String(value??""),number=Number(text);
  return /^[1-9][0-9]{0,15}$/.test(text)&&Number.isSafeInteger(number)?String(number):null;
 };
 const validName=row=>row&&validId(row.vatra_id)&&
  typeof row.display_name==="string"&&row.display_name.length>0&&row.display_name.length<=160&&
  (row.verified===undefined||typeof row.verified==="boolean");
 const stateFor=client=>{
  let state=caches.get(client);
  if(state)return state;
  state={rows:new Map(),pending:new Map(),generation:0,retryRemoteAt:edgeRetryAt(),viewer:null};
  caches.set(client,state);
  if(typeof client.auth?.onAuthStateChange==="function"){
   client.auth.onAuthStateChange(event=>{
    if(event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")return;
    clearTab(state.viewer);state.viewer=null;
    state.generation++;
    state.rows.clear();
    state.pending.clear();
    state.retryRemoteAt=edgeRetryAt();
   });
  }
  return state;
 };
 function bindViewer(client,verifiedUserId){
  const viewer=viewerId(verifiedUserId);
  if(!client||!viewer)return false;
  const state=stateFor(client);
  if(state.viewer===viewer)return true;
  state.generation++;state.rows.clear();state.pending.clear();
  state.viewer=viewer;
  const stored=readTab(),now=Date.now();
  if(stored?.viewer!==viewer){
   try{sessionStorage.removeItem(TAB_KEY);}catch(_){}
   return true;
  }
  if(!Array.isArray(stored.rows))return true;
  for(const entry of stored.rows.slice(0,MAX_ENTRIES)){
   if(!validName(entry?.row)||!Number.isFinite(entry.expires)||entry.expires<=now||entry.expires>now+TAB_TTL)continue;
   const id=validId(entry.row.vatra_id);
   state.rows.set(id,{row:{vatra_id:Number(id),display_name:entry.row.display_name},expires:entry.expires,tabExpiry:entry.expires});
  }
  return true;
 }
 function persistTab(state){
  if(!state.viewer)return;
  const now=Date.now(),rows=[];
  for(const entry of state.rows.values()){
   if(!validName(entry.row)||entry.expires<=now||entry.tabExpiry<=now)continue;
   rows.push({row:{vatra_id:entry.row.vatra_id,display_name:entry.row.display_name},
    expires:Math.min(entry.expires,entry.tabExpiry)});
  }
  try{sessionStorage.setItem(TAB_KEY,JSON.stringify({viewer:state.viewer,rows:rows.slice(-MAX_ENTRIES)}));}catch(_){}
 }
 const entryFor=(state,id)=>{
  const entry=state.rows.get(id);
  if(!entry)return undefined;
  if(entry.expires<=Date.now()){
   state.rows.delete(id);
   return undefined;
  }
  state.rows.delete(id);
  state.rows.set(id,entry);
  return entry;
 };
 const remember=(state,id,row)=>{
  state.rows.delete(id);
  const now=Date.now();
  state.rows.set(id,{row,expires:now+(row?TTL:MISSING_TTL),tabExpiry:now+TAB_TTL});
  while(state.rows.size>MAX_ENTRIES)state.rows.delete(state.rows.keys().next().value);
 };
 async function fetchMissing(client,ids,state){
  if(EDGE_CACHE_ENABLED&&Date.now()>=state.retryRemoteAt&&typeof client?.functions?.invoke==="function"){
   try{
    const {data,error}=await client.functions.invoke("public-profile-names",{
     body:{ids:ids.map(Number)}
    });
    if(error||!data||!Array.isArray(data.data))throw error||Error("Invalid name cache response");
    const allowed=new Set(ids);
    return data.data.filter(validName).filter(row=>allowed.has(validId(row.vatra_id)));
   }catch(_){
    pauseEdge(state);
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
      {vatra_id:Number(id),display_name:value.display_name,
       ...(typeof value.verified==="boolean"?{verified:value.verified}:{})}:null);
    }
    persistTab(state);
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
 window.VATRA_PUBLIC_NAMES={get,bindViewer};
})();
