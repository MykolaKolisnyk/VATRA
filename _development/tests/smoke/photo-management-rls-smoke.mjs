/* Apply actual photo migrations to a disposable local PostgreSQL service only. */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import pg from "pg";
const url=new URL(process.env.DATABASE_URL||"postgresql://invalid");
assert.equal(url.hostname,"localhost");assert.equal(url.port,"5432");assert.equal(url.pathname,"/vatra_test");
const db=new pg.Client({connectionString:url.href});await db.connect();
const root=async()=>{await db.query("reset role");await db.query("select set_config('request.jwt.claim.sub','',false)");};
const as=async user=>{await root();await db.query("set role authenticated");await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user.user_id]);};
const rows=async(sql,p=[]) => (await db.query(sql,p)).rows;
try{
 await db.query(`
  create table public.member_directory(vatra_id bigint primary key);
  insert into public.member_directory select vatra_id from public.accounts;
  create table public.profile_preferences(vatra_id bigint primary key,profile_visibility text);
  create table public.friendships(requester_id bigint,recipient_id bigint,status text);
  create table public.member_blocks(blocker_vatra_id bigint,blocked_vatra_id bigint);
  grant select on public.profile_preferences,public.friendships,public.member_blocks to authenticated;
  create schema storage;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(bucket_id text,name text,primary key(bucket_id,name));
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated;
  grant select,insert,delete on storage.objects to authenticated;
  create policy avatars_read on storage.objects for select to authenticated using(bucket_id='avatars');
 `);
 for(const filename of [
  "20261122122000_photo_albums_private_storage.sql",
  "20261122134500_photo_album_summary_view.sql",
  "20261122140000_photo_per_image_comments_personal_album.sql",
  "20261122154500_photo_actions_pin_owner_update.sql"
 ]) await db.query(await readFile("_development/supabase/migrations/"+filename,"utf8"));
 // Simulate the already-applied explicit UPDATE grant in production.
 await db.query("grant update on public.album_photos to authenticated");
 const [alice,bob]=await rows("select user_id,vatra_id from public.accounts order by vatra_id offset 3 limit 2");
 assert.ok(bob);
 const [source,other,foreign,open]=[randomUUID(),randomUUID(),randomUUID(),randomUUID()];
 const photo=randomUUID(),comment=randomUUID();
 const path=alice.vatra_id+"/albums/"+source+"/"+randomUUID()+".webp";
 const avatar=alice.vatra_id+"/avatar/"+randomUUID()+".webp";
 await db.query("insert into public.photo_albums(id,owner_vatra_id,title,visibility) values($1,$5,'Source','public'),($2,$5,'Private','private'),($3,$6,'Other','public'),($4,$5,'Public','public')",[source,other,foreign,open,alice.vatra_id,bob.vatra_id]);
 await db.query("insert into storage.objects(bucket_id,name) values('album-photos',$1),('avatars',$2)",[path,avatar]);
 await db.query("insert into public.album_photos(id,album_id,owner_vatra_id,media_path) values($1,$2,$3,$4)",[photo,source,alice.vatra_id,path]);
 await db.query("insert into public.photo_album_comments(id,album_id,photo_id,author_id,author_vatra_id,body) values($1,$2,$3,$4,$5,'Comment')",[comment,source,photo,bob.user_id,bob.vatra_id]);
 await db.query("insert into public.album_photo_likes(photo_id,liker_id) values($1,$2)",[photo,bob.user_id]);
 await db.query(await readFile("_development/supabase/migrations/20261124065500_avatar_photo_descriptions.sql","utf8"));
 await as(bob);
 assert.equal((await rows("select id from public.album_photos where id=$1",[photo])).length,1);
 assert.equal((await db.query("update public.album_photos set archived_at=now() where id=$1",[photo])).rowCount,0);
 await assert.rejects(db.query("insert into public.avatar_photo_descriptions(owner_vatra_id,avatar_path,caption) values($1,$2,'Forbidden')",[alice.vatra_id,avatar]),e=>e.code==="42501");
 await as(alice);
 await db.query("insert into public.avatar_photo_descriptions(owner_vatra_id,avatar_path,caption) values($1,$2,'First')",[alice.vatra_id,avatar]);
 await db.query("update public.avatar_photo_descriptions set caption='Edited' where avatar_path=$1",[avatar]);
 await as(bob);assert.equal((await rows("select caption from public.avatar_photo_descriptions where avatar_path=$1",[avatar]))[0].caption,"Edited");
 await as(alice);
 await db.query("update public.album_photos set archived_at=now() where id=$1",[photo]);
 assert.equal((await rows("select photo_count from public.photo_album_summaries where id=$1",[source]))[0].photo_count,0);
 await as(bob);
 for(const [q,p] of [["select id from public.album_photos where id=$1",[photo]],["select name from storage.objects where name=$1",[path]],["select id from public.photo_album_comments where id=$1",[comment]],["select photo_id from public.album_photo_likes where photo_id=$1",[photo]]])assert.equal((await rows(q,p)).length,0);
 await as(alice);
 await db.query("update public.album_photos set archived_at=null where id=$1",[photo]);
 await assert.rejects(db.query("update public.album_photos set album_id=$2 where id=$1",[photo,foreign]),e=>e.code==="42501");
 await db.query("update public.album_photos set album_id=$2 where id=$1",[photo,other]);
 assert.equal((await rows("select media_path from public.album_photos where id=$1",[photo]))[0].media_path,path);
 assert.equal((await rows("select album_id from public.photo_album_comments where id=$1",[comment]))[0].album_id,other);
 assert.equal((await rows("select photo_id from public.album_photo_likes where photo_id=$1",[photo])).length,1);
 await assert.rejects(db.query("update public.album_photos set album_id=$2 where id=$1",[photo,open]),e=>e.code==="23514");
 await as(bob);assert.equal((await rows("select name from storage.objects where name=$1",[path])).length,0);
 await as(alice);await db.query("delete from public.photo_albums where id=$1",[source]);
 assert.equal((await rows("select id from public.album_photos where id=$1",[photo])).length,1);
 await root();await db.query("set role anon");await assert.rejects(db.query("select * from public.avatar_photo_descriptions"),e=>e.code==="42501");
 console.log("VATRA PostgreSQL photo management: caption ownership, archive privacy, immutable storage, comment/like preservation and safe moves passed.");
}finally{try{await root();}finally{await db.end();}}
