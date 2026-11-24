/* Execute the actual migration on the disposable PostgreSQL CI service.
   cron.schedule is stubbed; the private worker is invoked directly.
   No production accounts, credentials, or network requests. */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import pg from "pg";

const url=new URL(process.env.DATABASE_URL||"postgresql://invalid");
assert.equal(url.hostname,"localhost");
assert.equal(url.port,"5432");
assert.equal(url.pathname,"/vatra_test");
const db=new pg.Client({connectionString:url.href});
await db.connect();
const root=async()=>{
 await db.query("reset role");
 await db.query("select set_config('request.jwt.claim.sub','',false)");
};
const as=async user=>{
 await root();
 await db.query("set role authenticated");
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user.user_id]);
};
const rows=async(q,p=[])=> (await db.query(q,p)).rows;
const denied=e=>e.code==="42501";
try{
 await db.query(`
  create table public.member_directory(vatra_id bigint primary key);
  insert into public.member_directory select vatra_id from public.accounts;
  create table public.account_states(vatra_id bigint primary key,state text,blocked_until timestamptz);
  create or replace function vatra_admin_private.allowed() returns boolean
  language sql stable security definer set search_path='' as $fn$
   select not exists(select 1 from public.accounts a join public.account_states s on s.vatra_id=a.vatra_id
    where a.user_id=auth.uid() and (s.state='deleted' or (s.state='blocked'
     and (s.blocked_until is null or s.blocked_until>now()))))
  $fn$;
  create view public.public_profiles as select vatra_id,'Synthetic member'::text as display_name from public.member_directory;
  create table public.feed_posts(
   id uuid primary key default gen_random_uuid(),author_id uuid not null references public.accounts(user_id) on delete cascade,
   author_vatra_id bigint not null references public.member_directory(vatra_id) on delete cascade,
   body text not null default '',visibility text not null default 'public',
   media_path text,media_items jsonb not null default '[]',archived_at timestamptz,
   constraint feed_posts_body_length check(char_length(btrim(body)) between 1 and 2000));
  alter table public.feed_posts enable row level security;
  grant select on public.member_directory,public.public_profiles to authenticated;
  grant select,insert,update,delete on public.feed_posts to authenticated;
  create policy feed_read on public.feed_posts for select to authenticated using
   (author_id=auth.uid() or (visibility='public' and archived_at is null));
  create policy feed_insert on public.feed_posts for insert to authenticated with check
   (author_id=auth.uid() and exists(select 1 from public.accounts a where a.user_id=auth.uid() and a.vatra_id=author_vatra_id));
  create policy feed_active on public.feed_posts as restrictive for all to authenticated
   using ((select vatra_admin_private.allowed())) with check ((select vatra_admin_private.allowed()));
  create schema cron;
  create table cron.test_jobs(name text primary key,schedule text,command text);
  create function cron.schedule(text,text,text) returns bigint language sql as $fn$
   insert into cron.test_jobs values($1,$2,$3) returning 1::bigint
  $fn$;
 `);
 const migration=await readFile("_development/supabase/migrations/20261123161115_feed_polls_and_scheduled_posts.sql","utf8");
 await db.query(migration);
 const [alice,bob,carol]=await rows("select user_id,vatra_id from public.accounts order by vatra_id offset 3 limit 3");
 assert.ok(carol);
 const poll=(anonymous,allow_revote=true)=>JSON.stringify({question:"Test poll",options:["A","B"],multiple:false,anonymous,allow_revote});
 const create=async(anonymous,allow_revote=true,visibility="public")=>(await rows(
  "insert into public.feed_posts(author_id,author_vatra_id,body,visibility,poll) values($1,$2,'',$3,$4::jsonb) returning id",
  [alice.user_id,alice.vatra_id,visibility,poll(anonymous,allow_revote)]))[0].id;
 const vote=async(id,user,choice=0)=>db.query("insert into public.post_poll_votes(post_id,voter_id,choices) values($1,$2,$3::smallint[])",[id,user.user_id,[choice]]);
 await as(alice);
 const anonymous=await create(true),named=await create(false,false),hidden=await create(true,true,"only_me");
 await as(bob);
 await vote(anonymous,bob);
 await vote(named,bob,1);
 await assert.rejects(vote(hidden,bob),e=>["42501","23514"].includes(e.code));
 await assert.rejects(vote(anonymous,alice),denied);
 assert.equal((await rows("select count(*)::int n from public.post_poll_voters where post_id=$1",[anonymous]))[0].n,0);
 assert.equal((await rows("select count(*)::int n from public.post_poll_voters where post_id=$1",[named]))[0].n,1);
 assert.equal((await db.query("delete from public.post_poll_votes where post_id=$1",[named])).rowCount,0);
 assert.equal((await db.query("update public.post_poll_votes set choices=array[1]::smallint[] where post_id=$1",[anonymous])).rowCount,1);
 const counts=(await rows("select counts,total_voters from public.post_poll_counts where post_id=$1",[anonymous]))[0];
 assert.deepEqual(counts.counts,[0,1]);assert.equal(Number(counts.total_voters),1);
 await as(carol);
 assert.equal((await rows("select count(*)::int n from public.post_poll_votes"))[0].n,0);
 await assert.rejects(db.query("update public.post_poll_counts set total_voters=999"),denied);
 await assert.rejects(db.query("select vatra_scheduler.publish_due_posts()"),denied);
 await as(alice);
 const schedule=async()=>(await rows("insert into public.scheduled_feed_posts(author_id,author_vatra_id,body,publish_at) values($1,$2,'Scheduled test',now()+interval '1 hour') returning id",[alice.user_id,alice.vatra_id]))[0].id;
 const good=await schedule(),blocked=await schedule();
 await as(bob);
 assert.equal((await rows("select count(*)::int n from public.scheduled_feed_posts"))[0].n,0);
 assert.equal((await db.query("update public.scheduled_feed_posts set status='cancelled' where id=$1",[good])).rowCount,0);
 await root();
 await db.query("update public.scheduled_feed_posts set publish_at=now()-interval '1 minute' where id=$1",[good]);
 assert.equal((await rows("select vatra_scheduler.publish_due_posts() n"))[0].n,1);
 assert.equal((await rows("select vatra_scheduler.publish_due_posts() n"))[0].n,0);
 assert.equal((await rows("select status from public.scheduled_feed_posts where id=$1",[good]))[0].status,"published");
 await db.query("insert into public.account_states(vatra_id,state) values($1,'blocked')",[alice.vatra_id]);
 await db.query("update public.scheduled_feed_posts set publish_at=now()-interval '1 minute' where id=$1",[blocked]);
 assert.equal((await rows("select vatra_scheduler.publish_due_posts() n"))[0].n,0);
 assert.equal((await rows("select status from public.scheduled_feed_posts where id=$1",[blocked]))[0].status,"failed");
 await as(alice);
 assert.equal((await rows("select count(*)::int n from public.scheduled_feed_posts"))[0].n,0);
 await assert.rejects(schedule(),denied);
 await root();
 await db.query("delete from public.accounts where user_id=$1",[bob.user_id]);
 assert.equal((await rows("select total_voters from public.post_poll_counts where post_id=$1",[named]))[0].total_voters,"0");
 await db.query("set role anon");
 await assert.rejects(db.query("select * from public.post_poll_votes"),denied);
 console.log("VATRA poll/scheduler PostgreSQL: RLS, anonymity, counts, cascades, moderation and exactly-once worker passed (cron stub).");
}finally{try{await root();}finally{await db.end();}}
