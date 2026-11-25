import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import pg from "pg";
const url=new URL(process.env.DATABASE_URL||"postgresql://invalid");
assert.equal(url.hostname,"localhost");
assert.equal(url.port,"5432");
assert.equal(url.pathname,"/vatra_test");
const admin=new pg.Client({connectionString:url.href});
await admin.connect();
await admin.query("CREATE DATABASE vatra_content_test");
await admin.end();
url.pathname="/vatra_content_test";
const db=new pg.Client({connectionString:url.href});
await db.connect();
const q=(sql,params=[])=>db.query(sql,params);
const count=async(sql,params=[])=>(await q(sql,params)).rows[0].n;
const users=[1,2,3,4].map(i=>"00000000-0000-4000-8000-00000000000"+i);
const as=async i=>{await q("reset role");await q("set role authenticated");await q("select set_config('request.jwt.claim.sub',$1,false)",[users[i-1]]);};
const root=async()=>{await q("reset role");await q("select set_config('request.jwt.claim.sub','',false)");};
try{
 await q(`
 CREATE SCHEMA auth; CREATE SCHEMA private;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon;
 CREATE TABLE public.accounts(user_id uuid PRIMARY KEY,vatra_id bigint UNIQUE NOT NULL);
 INSERT INTO public.accounts SELECT ('00000000-0000-4000-8000-00000000000'||i)::uuid,i FROM generate_series(1,4) i;
 ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
 GRANT SELECT ON public.accounts TO authenticated;
 CREATE POLICY own_account ON public.accounts FOR SELECT TO authenticated USING(user_id=auth.uid());
 CREATE TABLE public.friendships(requester_id bigint,recipient_id bigint,status text);
 INSERT INTO public.friendships VALUES (1,2,'accepted'),(1,4,'accepted');
 CREATE TABLE public.member_blocks(blocker_vatra_id bigint,blocked_vatra_id bigint);
 CREATE TABLE public.account_states(vatra_id bigint,state text,blocked_until timestamptz);
 CREATE TABLE public.profile_preferences(vatra_id bigint PRIMARY KEY,profile_visibility text);
 CREATE FUNCTION public.vatra_has_block_between(other bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.member_blocks b JOIN public.accounts a ON a.user_id=auth.uid()
 WHERE (b.blocker_vatra_id=a.vatra_id AND b.blocked_vatra_id=other) OR (b.blocked_vatra_id=a.vatra_id AND b.blocker_vatra_id=other))
 $$;
 CREATE TABLE public.feed_posts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),author_vatra_id bigint,visibility text NOT NULL DEFAULT 'public',archived_at timestamptz,is_clip boolean NOT NULL DEFAULT false);
 CREATE TABLE public.stories(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),author_vatra_id bigint,expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours');
 CREATE FUNCTION public.fixture_friends(other bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.friendships f JOIN public.accounts a ON a.user_id=auth.uid() WHERE f.status='accepted'
 AND ((f.requester_id=a.vatra_id AND f.recipient_id=other) OR (f.recipient_id=a.vatra_id AND f.requester_id=other)))
 $$;
 CREATE FUNCTION public.fixture_profile_public(other bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT COALESCE((SELECT profile_visibility FROM public.profile_preferences WHERE vatra_id=other),'public')='public'
 $$;
 ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
 GRANT SELECT ON public.feed_posts,public.stories TO authenticated;
 CREATE POLICY post_access ON public.feed_posts FOR SELECT TO authenticated USING
 (archived_at IS NULL AND NOT public.vatra_has_block_between(author_vatra_id) AND
 ((visibility='public' AND public.fixture_profile_public(author_vatra_id)) OR
 (visibility IN ('public','friends') AND public.fixture_friends(author_vatra_id))));
 CREATE POLICY story_access ON public.stories FOR SELECT TO authenticated USING
 (expires_at>now() AND public.fixture_friends(author_vatra_id) AND NOT public.vatra_has_block_between(author_vatra_id));
 CREATE TABLE public.member_notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),recipient_vatra_id bigint,actor_vatra_id bigint,kind text,target_kind text,target_id uuid,event_key text,
 CONSTRAINT member_notifications_kind_check CHECK(kind IN ('friend_request','friend_accepted','friend_declined','post_like','comment_like','avatar_like','avatar_comment_like')),
 CONSTRAINT member_notifications_target_kind_check CHECK(target_kind IN ('friend','person','group','post_comment','avatar','avatar_comment')),
 UNIQUE(recipient_vatra_id,event_key));
 ALTER TABLE public.member_notifications ENABLE ROW LEVEL SECURITY;
 GRANT SELECT ON public.member_notifications TO authenticated;
 CREATE POLICY own_notifications ON public.member_notifications FOR SELECT TO authenticated USING
 (recipient_vatra_id IN (SELECT vatra_id FROM public.accounts WHERE user_id=auth.uid()));
 `);
 await q(await readFile("_development/supabase/operations/prepare_member_content_subscriptions.sql","utf8"));
 await as(2);
 await q("insert into public.member_content_preferences(viewer_vatra_id,author_vatra_id,notify_posts,notify_stories,hide_posts) values(2,1,true,true,true)");
 await assert.rejects(q("insert into public.member_content_preferences(viewer_vatra_id,author_vatra_id,notify_posts) values(3,1,true)"),e=>e.code==="42501");
 await assert.rejects(q("update public.member_content_preferences set viewer_vatra_id=3"),e=>e.code==="42501");
 await as(3);
 assert.equal(await count("select count(*)::int n from public.member_content_preferences"),0);
 await q("insert into public.member_content_preferences(viewer_vatra_id,author_vatra_id,notify_posts,notify_stories) values(3,1,true,true)");
 await as(4);
 await q("insert into public.member_content_preferences(viewer_vatra_id,author_vatra_id,notify_posts,notify_stories) values(4,1,true,true)");
 await root();
 await q("insert into public.member_blocks values(1,4)");
 const post=async(visibility,clip=false)=>(await q("insert into public.feed_posts(author_vatra_id,visibility,is_clip) values(1,$1,$2) returning id",[visibility,clip])).rows[0].id;
 const pub=await post("public"),friends=await post("friends"),priv=await post("only_me"),clip=await post("public",true);
 const story=(await q("insert into public.stories(author_vatra_id) values(1) returning id")).rows[0].id;
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id=$1",[pub]),2);
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id=$1",[friends]),1);
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id in ($1,$2)",[priv,clip]),0);
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id=$1",[story]),1);
 assert.equal(await count("select count(*)::int n from public.member_notifications where recipient_vatra_id=4"),0);
 await as(2);assert.equal(await count("select count(*)::int n from public.member_notifications"),3);
 await as(3);assert.equal(await count("select count(*)::int n from public.member_notifications"),1);
 await root();
 await q("update public.feed_posts set archived_at=now() where id=$1",[pub]);
 await q("delete from public.friendships where requester_id=1 and recipient_id=2");
 await as(2);assert.equal(await count("select count(*)::int n from public.member_notifications"),0);
 await root();
 await q("insert into public.profile_preferences values(1,'private')");
 const closed=await post("public");
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id=$1",[closed]),0);
 await q("set role anon");
 await assert.rejects(q("select * from public.member_content_preferences"),e=>e.code==="42501");
 console.log("VATRA content preferences: ownership, audience, blocks, private posts, clips, stories, archive and friendship revocation passed.");
}finally{try{await root();}finally{await db.end();}}
