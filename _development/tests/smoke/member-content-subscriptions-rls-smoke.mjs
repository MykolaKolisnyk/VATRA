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
 CREATE TABLE public.feed_posts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),author_vatra_id bigint,visibility text NOT NULL DEFAULT 'public',archived_at timestamptz,is_clip boolean NOT NULL DEFAULT false,author_id uuid,body text,media_kind text,media_items jsonb,shared_post_kind text,shared_post_id uuid);
 CREATE TABLE public.stories(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),author_vatra_id bigint,expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',media_kind text);
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
 CREATE TABLE public.post_comments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),post_kind text,post_id uuid,author_id uuid,author_vatra_id bigint,moderation_status text DEFAULT 'visible',parent_comment_id uuid,body text);
 CREATE TABLE public.avatar_comments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_vatra_id bigint,avatar_path text,author_id uuid,author_vatra_id bigint,moderation_status text DEFAULT 'visible');
 CREATE TABLE public.album_photos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),album_id uuid,owner_vatra_id bigint,archived_at timestamptz);
 CREATE TABLE public.photo_album_comments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),album_id uuid,photo_id uuid,author_id uuid,author_vatra_id bigint);
 CREATE TABLE public.album_photo_likes(photo_id uuid,liker_id uuid);
 GRANT SELECT ON public.post_comments,public.avatar_comments,public.album_photos,public.photo_album_comments TO authenticated;
 ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
 CREATE POLICY comments_access ON public.post_comments FOR SELECT TO authenticated USING (moderation_status<>'hidden' AND EXISTS(SELECT 1 FROM public.feed_posts p WHERE p.id=post_id));
 CREATE TABLE public.member_notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),recipient_vatra_id bigint,actor_vatra_id bigint,kind text,target_kind text,target_id uuid,context_id uuid,avatar_owner_vatra_id bigint,event_key text,
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
 await q("delete from public.profile_preferences where vatra_id=1");
 await q("insert into public.friendships values(1,2,'accepted')");
 const article=await post("public");
 const comment=async(id,actor,parent=null,kind="person",status="visible")=>(await q("insert into public.post_comments(post_kind,post_id,author_id,author_vatra_id,parent_comment_id,moderation_status) values($1,$2,$3,$4,$5,$6) returning id",[kind,id,users[actor-1],actor,parent,status])).rows[0].id;
 const first=await comment(article,2);
 assert.equal(await count("select count(*)::int n from public.member_notifications where kind='post_comment' and target_id=$1 and recipient_vatra_id=1",[first]),1);
 const reply=await comment(article,3,first);
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id=$1",[reply]),2);
 assert.equal(await count("select count(*)::int n from public.member_notifications where kind='post_reply' and target_id=$1 and recipient_vatra_id=2",[reply]),1);
 const self=await comment(article,1);
 const blocked=await comment(article,4),group=await comment(article,2,null,"group"),hidden=await comment(article,2,null,"person","hidden");
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id in ($1,$2,$3,$4)",[self,blocked,group,hidden]),0);
 const video=(await q("insert into public.feed_posts(author_vatra_id,media_kind) values(1,'video') returning id")).rows[0].id;
 const videoComment=await comment(video,2);
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id in ($1,$2)",[video,videoComment]),0);
 const mixed=(await q("insert into public.feed_posts(author_vatra_id,media_items) values(1,$1::jsonb) returning id",[JSON.stringify([{media_kind:"image"},{media_kind:"video"}])])).rows[0].id;
 const mixedComment=await comment(mixed,2);
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id in ($1,$2)",[mixed,mixedComment]),0);
 const avatar=(await q("insert into public.avatar_comments(owner_vatra_id,avatar_path,author_id,author_vatra_id) values(1,'1/avatar/a.webp',$1,2) returning id",[users[1]])).rows[0].id;
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id=$1 and kind='avatar_comment'",[avatar]),1);
 const cover=(await q("insert into public.avatar_comments(owner_vatra_id,avatar_path,author_id,author_vatra_id) values(1,'1/cover/a.webp',$1,2) returning id",[users[1]])).rows[0].id;
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id=$1",[cover]),0);
 const photo=(await q("insert into public.album_photos(album_id,owner_vatra_id) values(gen_random_uuid(),1) returning id,album_id")).rows[0];
 const photoComment=(await q("insert into public.photo_album_comments(album_id,photo_id,author_id,author_vatra_id) values($1,$2,$3,2) returning id",[photo.album_id,photo.id,users[1]])).rows[0].id;
 await q("insert into public.album_photo_likes values($1,$2),($1,$2)",[photo.id,users[1]]);
 assert.equal(await count("select count(*)::int n from public.member_notifications where kind='album_comment' and target_id=$1",[photoComment]),1);
 assert.equal(await count("select count(*)::int n from public.member_notifications where kind='album_photo_like' and target_id=$1",[photo.id]),1);
 const share=(await q("insert into public.feed_posts(author_vatra_id,shared_post_kind,shared_post_id) values(2,'person',$1) returning id",[article])).rows[0].id;
 assert.equal(await count("select count(*)::int n from public.member_notifications where kind='post_share' and target_id=$1",[share]),1);
 const mentioned=(await q("insert into public.post_comments(post_kind,post_id,author_id,author_vatra_id,body) values('person',$1,$2,2,'Hello @id3 @id3 @id4 @id2 @id9999999999999999999') returning id",[article,users[1]])).rows[0].id;
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id=$1 and kind='comment_mention' and recipient_vatra_id=3",[mentioned]),1);
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id=$1 and kind='comment_mention' and recipient_vatra_id in (2,4)",[mentioned]),0);
 const tagged=(await q("insert into public.feed_posts(author_vatra_id,author_id,body) values(1,$1,'@id3') returning id",[users[0]])).rows[0].id;
 assert.equal(await count("select count(*)::int n from public.member_notifications where target_id=$1 and recipient_vatra_id=3",[tagged]),1,"A subscription and mention must not duplicate the same event");
 await q("update public.post_comments set moderation_status='hidden' where id=$1",[reply]);
 await as(2);assert.equal(await count("select count(*)::int n from public.member_notifications where target_id=$1",[reply]),0);
 await root();
 await q("set role anon");
 await assert.rejects(q("select * from public.member_content_preferences"),e=>e.code==="42501");
 console.log("VATRA content preferences: ownership, audience, blocks, private posts, clips, stories, archive and friendship revocation passed.");
}finally{try{await root();}finally{await db.end();}}
