/* Isolated stress regression for the production VATRA-ID trigger logic.
   GitHub Actions runs this against a disposable postgres:17 container.
   NO Supabase credentials, SMTP, production account creation, or external API calls. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import pg from "pg";

if(!process.env.DATABASE_URL?.includes("localhost:5432/vatra_test")){
 throw new Error("Refusing to run outside the isolated vatra_test PostgreSQL service");
}
const db=new pg.Pool({connectionString:process.env.DATABASE_URL,max:25,connectionTimeoutMillis:10000});
try{
 await db.query(`
  create schema auth;
  create schema private;
  create table auth.users(id uuid primary key);
  create table private.vatra_id_counter(
   singleton boolean primary key default true,
   last_assigned bigint not null default 0,
   constraint singleton_only check(singleton)
  );
  insert into private.vatra_id_counter(singleton,last_assigned) values(true,0);
  create table public.accounts(
   user_id uuid primary key references auth.users(id) on delete cascade,
   vatra_id bigint not null unique
  );
  create table public.vatra_directory(vatra_id bigint primary key);
  create or replace function private.assign_vatra_id() returns trigger
  language plpgsql security definer set search_path to '' as $body$
  declare new_number bigint;
  begin
   update private.vatra_id_counter set last_assigned=last_assigned+1
   where singleton=true returning last_assigned into new_number;
   if new_number is null then raise exception 'VATRA ID counter missing'; end if;
   insert into public.accounts(user_id,vatra_id) values(new.id,new_number);
   insert into public.vatra_directory(vatra_id) values(new_number);
   return new;
  end;
  $body$;
  create trigger on_vatra_auth_user_created
  after insert on auth.users for each row execute function private.assign_vatra_id();
 `);
 const total=1000;
 const ids=Array.from({length:total},()=>randomUUID());
 const begin=performance.now();
 await Promise.all(ids.map(id=>db.query("insert into auth.users(id) values($1)",[id])));
 const elapsed=performance.now()-begin;
 const state=(await db.query(`
  select
   (select count(*)::int from auth.users) as users,
   (select count(*)::int from public.accounts) as accounts,
   (select count(distinct vatra_id)::int from public.accounts) as distinct_ids,
   (select min(vatra_id)::bigint from public.accounts) as min_id,
   (select max(vatra_id)::bigint from public.accounts) as max_id,
   (select count(*)::int from public.vatra_directory) as directory_count,
   (select last_assigned::bigint from private.vatra_id_counter) as last_number
 `)).rows[0];
 for(const field of ["users","accounts","distinct_ids","directory_count"])
  assert.equal(Number(state[field]),total,field+" must match simulated signups");
 assert.equal(Number(state.min_id),1,"First VATRA ID should be 1");
 assert.equal(Number(state.max_id),total,"VATRA ID should be unique and gap-free in successful signups");
 assert.equal(Number(state.last_number),total,"Counter must advance once per successful signup");

 // Verify failed duplicate inserts don't consume a number.
 await assert.rejects(
  db.query("insert into auth.users(id) values($1)",[ids[0]]),
  error=>error.code==="23505"
 );
 const counter=(await db.query("select last_assigned from private.vatra_id_counter")).rows[0];
 assert.equal(Number(counter.last_assigned),total);

 // Deleting users does not reissue old VATRA IDs.
 await db.query("delete from auth.users where id=any($1::uuid[])",[ids.slice(0,10)]);
 const newer=randomUUID();
 await db.query("insert into auth.users(id) values($1)",[newer]);
 const next=(await db.query("select vatra_id from public.accounts where user_id=$1",[newer])).rows[0];
 assert.equal(Number(next.vatra_id),total+1,"Deleted account numbers must never be reused");
 assert.equal((await db.query("select count(*)::int as n from public.accounts")).rows[0].n,total-9);
 assert.equal((await db.query("select count(*)::int as n from public.vatra_directory")).rows[0].n,total+1);
 console.log(JSON.stringify({
  source:"Disposable PostgreSQL 17; production trigger replicated for isolated test only",
  syntheticSignups:total,connections:25,
  elapsedMs:Math.round(elapsed),
  signupsPerSecond:Math.round(total/(elapsed/1000)),
  uniqueIds:total,noDuplicateOrReusedIds:true
 }));
}finally{await db.end();}
