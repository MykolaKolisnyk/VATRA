/* VATRA Messenger SQL/RLS regression on disposable postgres:17 only. */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import pg from "pg";

if(!process.env.DATABASE_URL?.includes("localhost:5432/vatra_test"))
 throw Error("Refusing to run on a non-test database");
const db=new pg.Client({connectionString:process.env.DATABASE_URL});
await db.connect();
try{
 const ids=(await db.query("select user_id,vatra_id from public.accounts order by vatra_id limit 3")).rows;
 assert.equal(ids.length,3,"Run tools/scale-audit.mjs before this isolated test");
 const [alice,bob,carol]=ids;
 await db.query("create role authenticated nologin");
 await db.query("create role anon nologin");
 await db.query("create schema vatra_admin_private");
 await db.query("create or replace function auth.uid() returns uuid language sql stable as $fn$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $fn$");
 await db.query("create or replace function vatra_admin_private.allowed() returns boolean language sql stable security definer set search_path='' as $fn$ select true $fn$");
 await db.query("create or replace function public.vatra_has_block_between(other_vatra_id bigint) returns boolean language sql stable as $fn$ select false $fn$");
 await db.query("grant usage on schema public,auth,vatra_admin_private to authenticated");
 await db.query("grant usage on schema public to anon");
 await db.query("grant select on public.accounts to authenticated");
 await db.query("grant execute on function auth.uid() to authenticated");
 await db.query("grant execute on function vatra_admin_private.allowed() to authenticated");
 await db.query("grant execute on function public.vatra_has_block_between(bigint) to authenticated");
 await db.query("create publication supabase_realtime");
 const migration=await readFile("supabase/migrations/20261121113000_private_messenger_ciphertext_and_scoped_deletion.sql","utf8");
 await db.query(migration);
 const as=async user=>{
  await db.query("reset role");
  await db.query("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[String(user.user_id)]);
 };
 const pub=letter=>({kty:"EC",crv:"P-256",x:letter.repeat(43),y:"Y".repeat(43)});
 const keyAlice=pub("A"),keyBob=pub("B");
 await as(alice);
 await db.query("insert into public.messenger_keys(vatra_id,public_key) values($1,$2::jsonb)",
  [alice.vatra_id,JSON.stringify(keyAlice)]);
 await assert.rejects(
  db.query("insert into public.messenger_keys(vatra_id,public_key) values($1,$2::jsonb)",
   [bob.vatra_id,JSON.stringify(keyBob)]),
  err=>err.code==="42501","Alice cannot publish Bob's identity key"
 );
 await assert.rejects(
  db.query("insert into public.messenger_keys(vatra_id,public_key) values($1,$2::jsonb)",
   [alice.vatra_id,JSON.stringify({...keyAlice,d:"private-secret"})]),
  err=>err.code==="23514"||err.code==="23505","Private-key fields must never be accepted"
 );
 await as(bob);
 await db.query("insert into public.messenger_keys(vatra_id,public_key) values($1,$2::jsonb)",
  [bob.vatra_id,JSON.stringify(keyBob)]);
 const messageId=randomUUID();
 const sendSql="insert into public.messenger_messages(id,sender_id,recipient_id,ciphertext,nonce,salt,sender_public_key,recipient_public_key) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb) returning id";
 const envelope=[messageId,alice.vatra_id,bob.vatra_id,"C".repeat(72),"N".repeat(16),"S".repeat(43),
  JSON.stringify(keyAlice),JSON.stringify(keyBob)];
 await assert.rejects(db.query(sendSql,envelope),err=>err.code==="42501",
  "Bob cannot impersonate Alice by inserting under Alice's sender ID");
 await as(alice);
 assert.equal((await db.query(sendSql,envelope)).rows[0].id,messageId);
 await assert.rejects(
  db.query("insert into public.messenger_messages(id,sender_id,recipient_id,ciphertext,nonce,salt,sender_public_key,recipient_public_key,deleted_for_all_at) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,now())",
  [randomUUID(),...envelope.slice(1)]),
  err=>err.code==="42501","Clients must not forge server-owned deletion timestamps"
 );
 await assert.rejects(db.query("update public.messenger_messages set ciphertext=null where id=$1",[messageId]),
  err=>err.code==="42501","Clients must not update encrypted message contents");
 await as(carol);
 assert.equal((await db.query("select count(*)::int as n from public.messenger_messages")).rows[0].n,0,
  "Third-party authenticated users cannot read Alice and Bob's chat");
 await assert.rejects(
  db.query("select public.messenger_delete_message($1,'mine')",[messageId]),
  err=>err.code==="42501","Third parties cannot delete someone else's message"
 );
 await as(bob);
 assert.equal((await db.query("select count(*)::int as n from public.messenger_messages")).rows[0].n,1);
 await assert.rejects(
  db.query("select public.messenger_delete_message($1,'everyone')",[messageId]),
  err=>err.code==="42501","Recipients cannot revoke messages for everyone"
 );
 assert.equal((await db.query("select public.messenger_delete_message($1,'mine') as ok",[messageId])).rows[0].ok,true);
 assert.equal((await db.query("select count(*)::int as n from public.messenger_messages")).rows[0].n,0,
  "Delete for me hides the message from that user");
 await as(alice);
 assert.equal((await db.query("select count(*)::int as n from public.messenger_messages")).rows[0].n,1,
  "Delete for me must retain the other participant's row");
 assert.equal((await db.query("select public.messenger_delete_message($1,'everyone') as ok",[messageId])).rows[0].ok,true);
 const tombstone=(await db.query("select ciphertext,nonce,salt,deleted_for_all_at from public.messenger_messages where id=$1",[messageId])).rows[0];
 assert.equal(tombstone.ciphertext,null);assert.equal(tombstone.nonce,null);assert.equal(tombstone.salt,null);
 assert.ok(tombstone.deleted_for_all_at,"Sender revoke must remove ciphertext from the server");
 await db.query("reset role");
 await db.query("set role anon");
 await assert.rejects(db.query("select count(*) from public.messenger_messages"),
  err=>err.code==="42501","Anonymous sessions cannot query private messages");
 console.log("VATRA Messenger PostgreSQL: sender-only inserts, RLS isolation, timestamp grants, scoped deletion and ciphertext wiping passed.");
}finally{
 try{await db.query("reset role");}catch(_){}
 await db.end();
}
