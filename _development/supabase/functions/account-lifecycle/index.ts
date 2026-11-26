// STAGED ONLY. Do not deploy or enable deletion until the lifecycle release gate is reviewed.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.119.0";
import {createHandler,verifiedSession} from "./handler.mjs";

const url=Deno.env.get("SUPABASE_URL");
const publishable=Deno.env.get("SUPABASE_ANON_KEY")||
 JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default;
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||
 JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default;
const auth={persistSession:false,autoRefreshToken:false,detectSessionInUrl:false};

Deno.serve(createHandler({
 async verify(token:string){
  if(!url||!publishable||!service)throw Error("Unavailable");
  const client=createClient(url,publishable,{auth});
  const {data,error}=await client.auth.getUser(token);
  if(error||!data.user)return null;
  return verifiedSession(token,data.user);
 },
 async readStatus(identity:{userId:string;sessionId:string}){
  if(!url||!service)throw Error("Unavailable");
  // Privileged client is isolated from the incoming Authorization header.
  const client=createClient(url,service,{auth});
  const {data,error}=await client.rpc("vatra_account_lifecycle_transition",{
   caller:identity.userId,caller_session:identity.sessionId,operation:"status"
  });
  if(error)throw Error("Unavailable");
  return data;
 }
}));
