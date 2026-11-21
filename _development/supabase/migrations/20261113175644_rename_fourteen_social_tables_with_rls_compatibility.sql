-- Applied to VATRA Supabase project rjasunoawrxvetwadylh as 20261113175644.
-- Rename 14 physical social tables. Preserve RLS, FKs, triggers,
-- existing grants, data and PostgREST legacy simple-view compatibility.
-- No DROP CASCADE, RLS bypass, or service-role client APIs.
BEGIN;
ALTER TABLE public.vatra_avatar_comment_likes RENAME TO avatar_comment_likes;
ALTER TABLE public.vatra_avatar_comments RENAME TO avatar_comments;
ALTER TABLE public.vatra_avatar_likes RENAME TO avatar_likes;
ALTER TABLE public.vatra_blocks RENAME TO member_blocks;
ALTER TABLE public.vatra_community_follows RENAME TO community_follows;
ALTER TABLE public.vatra_community_posts RENAME TO community_posts;
ALTER TABLE public.vatra_direct_messages RENAME TO direct_messages;
ALTER TABLE public.vatra_friendships RENAME TO friendships;
ALTER TABLE public.vatra_post_comment_likes RENAME TO post_comment_likes;
ALTER TABLE public.vatra_post_comments RENAME TO post_comments;
ALTER TABLE public.vatra_post_likes RENAME TO post_likes;
ALTER TABLE public.vatra_profile_media RENAME TO profile_media;
ALTER TABLE public.vatra_public_profiles RENAME TO public_profiles;
ALTER TABLE public.vatra_stories RENAME TO stories;

-- PL/pgSQL, SQL and tg_table_name string literals must use physical new names.
CREATE OR REPLACE FUNCTION private.emit_member_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_recipient bigint;
 v_actor bigint;
 v_kind text;
 v_target_kind text;
 v_target uuid;
 v_context uuid;
 v_avatar_owner bigint;
 v_event_key text;
begin
 if tg_table_name='friendships' then
  if tg_op='INSERT' and new.status='pending' then
   v_recipient:=new.recipient_id;
   v_actor:=new.requester_id;
   v_kind:='friend_request';v_target_kind:='friend';v_target:=new.id;
   v_event_key:='friend_request:'||new.id::text;
  elsif tg_op='UPDATE' and new.status='accepted' and old.status='pending' then
   v_recipient:=new.requester_id;
   v_actor:=new.recipient_id;
   v_kind:='friend_accepted';v_target_kind:='friend';v_target:=new.id;
   v_event_key:='friend_accepted:'||new.id::text;
  else return new;end if;

 elsif tg_table_name='post_likes' and tg_op='INSERT' then
  select a.vatra_id into v_actor from public.accounts a where a.user_id=new.liker_id;
  if new.post_kind='person' then
   select p.author_vatra_id into v_recipient from public.feed_posts p where p.id=new.post_id;
  elsif new.post_kind='group' then
   select p.author_vatra_id into v_recipient from public.community_posts p where p.id=new.post_id;
  else return new;end if;
  v_kind:='post_like';v_target_kind:=new.post_kind;
  v_target:=new.post_id;v_context:=new.post_id;
  v_event_key:='post_like:'||new.post_kind||':'||new.post_id||':'||new.liker_id;

 elsif tg_table_name='post_comment_likes' and tg_op='INSERT' then
  select a.vatra_id into v_actor from public.accounts a where a.user_id=new.liker_id;
  select c.author_vatra_id,c.id,c.post_id
   into v_recipient,v_target,v_context
   from public.post_comments c where c.id=new.comment_id;
  v_kind:='comment_like';v_target_kind:='post_comment';
  v_event_key:='post_comment_like:'||new.comment_id||':'||new.liker_id;

 elsif tg_table_name='avatar_likes' and tg_op='INSERT' then
  select a.vatra_id into v_actor from public.accounts a where a.user_id=new.liker_id;
  v_recipient:=new.owner_vatra_id;v_avatar_owner:=new.owner_vatra_id;
  v_kind:='avatar_like';v_target_kind:='avatar';
  v_event_key:='avatar_like:'||new.owner_vatra_id||':'||new.avatar_path||':'||new.liker_id;

 elsif tg_table_name='avatar_comment_likes' and tg_op='INSERT' then
  select a.vatra_id into v_actor from public.accounts a where a.user_id=new.liker_id;
  select c.author_vatra_id,c.id,c.owner_vatra_id
   into v_recipient,v_target,v_avatar_owner from public.avatar_comments c
   where c.id=new.comment_id;
  v_kind:='avatar_comment_like';v_target_kind:='avatar_comment';
  v_event_key:='avatar_comment_like:'||new.comment_id||':'||new.liker_id;
 else
  return new;
 end if;
 if v_recipient is null or v_actor is null or v_recipient=v_actor or v_event_key is null then
  return new;
 end if;
 insert into public.member_notifications
  (recipient_vatra_id,actor_vatra_id,kind,target_kind,target_id,context_id,avatar_owner_vatra_id,event_key)
 values(v_recipient,v_actor,v_kind,v_target_kind,v_target,v_context,v_avatar_owner,v_event_key)
 on conflict(recipient_vatra_id,event_key) do nothing;
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.publish_registered_vatra_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare registered_name text;
begin
 select left(btrim(concat_ws(' ',
   nullif(btrim(u.raw_user_meta_data->>'first_name'),''),
   nullif(btrim(u.raw_user_meta_data->>'last_name'),'')
 )),80) into registered_name
 from public.accounts a
 join auth.users u on u.id=a.user_id
 where a.vatra_id=new.vatra_id;
 if char_length(coalesce(registered_name,'')) between 2 and 80 then
  insert into public.public_profiles(vatra_id,display_name)
  values(new.vatra_id,registered_name)
  on conflict(vatra_id) do nothing;
 end if;
 return new;
end; $function$;

CREATE OR REPLACE FUNCTION private.vatra_validate_comment_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.parent_comment_id is not null then
    if new.parent_comment_id=new.id or not exists (
      select 1 from public.post_comments parent
      where parent.id=new.parent_comment_id
        and parent.post_kind=new.post_kind
        and parent.post_id=new.post_id
        and parent.parent_comment_id is null
        and parent.moderation_status<>'hidden'
    ) then
      raise exception 'Invalid reply target';
    end if;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.comment_reply_counts(p_kind text, p_post_id uuid, p_parents uuid[])
 RETURNS TABLE(parent_id uuid, reply_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT c.parent_comment_id AS parent_id, count(*)::bigint AS reply_count
  FROM public.post_comments AS c
  WHERE p_kind IN ('person', 'group')
    AND c.post_kind = p_kind
    AND c.post_id = p_post_id
    AND c.parent_comment_id = ANY(p_parents)
    AND cardinality(p_parents) BETWEEN 1 AND 24
  GROUP BY c.parent_comment_id
$function$;

CREATE OR REPLACE FUNCTION public.post_engagement_page(p_posts jsonb)
 RETURNS TABLE(post_kind text, post_id uuid, like_count bigint, comment_count bigint, share_count bigint, viewer_liked boolean, viewer_saved boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 with requested as materialized (
  select distinct p.kind as post_kind, p.id as post_id
  from jsonb_to_recordset(case
   when jsonb_typeof(p_posts)='array' and jsonb_array_length(p_posts) between 1 and 24
    then p_posts else '[]'::jsonb end) as p(kind text,id uuid)
  where p.kind in ('person','group') and p.id is not null
 ),
 visible as materialized (
  select p.post_kind,p.post_id
  from requested p
  where (p.post_kind='person' and exists (
    select 1 from public.feed_posts f where f.id=p.post_id
  )) or (p.post_kind='group' and exists (
    select 1 from public.community_posts g where g.id=p.post_id
  ))
 ),
 likes as (
  select l.post_kind,l.post_id,count(*)::bigint as n,
   coalesce(bool_or(l.liker_id=(select auth.uid())),false) as mine
  from public.post_likes l
  join visible p on p.post_kind=l.post_kind and p.post_id=l.post_id
  group by l.post_kind,l.post_id
 ),
 comments as (
  select c.post_kind,c.post_id,count(*)::bigint as n
  from public.post_comments c
  join visible p on p.post_kind=c.post_kind and p.post_id=c.post_id
  group by c.post_kind,c.post_id
 ),
 shares as (
  select f.shared_post_kind as post_kind,f.shared_post_id as post_id,count(*)::bigint as n
  from public.feed_posts f
  join visible p on p.post_kind=f.shared_post_kind and p.post_id=f.shared_post_id
  where f.archived_at is null
  group by f.shared_post_kind,f.shared_post_id
 ),
 saves as (
  select s.post_kind,s.post_id,true as mine
  from public.post_saves s
  join visible p on p.post_kind=s.post_kind and p.post_id=s.post_id
  where s.owner_vatra_id in (
   select a.vatra_id from public.accounts a where a.user_id=(select auth.uid())
  )
  group by s.post_kind,s.post_id
 )
 select p.post_kind,p.post_id,
  coalesce(l.n,0)::bigint,coalesce(c.n,0)::bigint,coalesce(sh.n,0)::bigint,
  coalesce(l.mine,false),coalesce(s.mine,false)
 from visible p
 left join likes l on l.post_kind=p.post_kind and l.post_id=p.post_id
 left join comments c on c.post_kind=p.post_kind and c.post_id=p.post_id
 left join shares sh on sh.post_kind=p.post_kind and sh.post_id=p.post_id
 left join saves s on s.post_kind=p.post_kind and s.post_id=p.post_id
$function$;

CREATE OR REPLACE FUNCTION public.vatra_avatar_comment_page(p_owner bigint, p_avatar_path text, p_sort text DEFAULT 'relevant'::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 12)
 RETURNS TABLE(id uuid, author_vatra_id bigint, body text, created_at timestamp with time zone, moderation_status text, likes bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
 SELECT c.id,c.author_vatra_id,c.body,c.created_at,c.moderation_status,
  (SELECT count(*) FROM public.avatar_comment_likes cl WHERE cl.comment_id=c.id) AS likes
 FROM public.avatar_comments c
 WHERE c.owner_vatra_id=p_owner AND c.avatar_path=p_avatar_path
  AND (p_sort='all' OR c.moderation_status='visible')
 ORDER BY
  CASE WHEN p_sort='relevant' AND EXISTS(
   SELECT 1 FROM public.friendships f
   JOIN public.accounts a ON a.user_id=(SELECT auth.uid())
   WHERE f.status='accepted'
    AND ((f.requester_id=a.vatra_id AND f.recipient_id=c.author_vatra_id)
     OR (f.recipient_id=a.vatra_id AND f.requester_id=c.author_vatra_id))
  ) THEN 1 ELSE 0 END DESC,
  CASE WHEN p_sort='relevant' THEN
   (SELECT count(*) FROM public.avatar_comment_likes cl WHERE cl.comment_id=c.id)
  ELSE 0 END DESC,
  c.created_at DESC,c.id DESC
 LIMIT least(greatest(coalesce(p_limit,12),1),12)
 OFFSET least(greatest(coalesce(p_offset,0),0),10000)
$function$;

CREATE OR REPLACE FUNCTION public.vatra_comment_page(p_kind text, p_post_id uuid, p_sort text DEFAULT 'relevant'::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 12)
 RETURNS TABLE(id uuid, author_vatra_id bigint, body text, created_at timestamp with time zone, moderation_status text, likes bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
 select c.id,c.author_vatra_id,c.body,c.created_at,c.moderation_status,
  (select count(*) from public.post_comment_likes cl where cl.comment_id=c.id) as likes
 from public.post_comments c
 where c.post_kind=p_kind and c.post_id=p_post_id
  and c.parent_comment_id is null
  and (p_sort='all' or c.moderation_status='visible')
 order by
  case when p_sort='relevant' and exists (
   select 1 from public.friendships f
   join public.accounts a on a.user_id=(select auth.uid())
   where f.status='accepted'
    and ((f.requester_id=a.vatra_id and f.recipient_id=c.author_vatra_id)
     or (f.recipient_id=a.vatra_id and f.requester_id=c.author_vatra_id))
  ) then 1 else 0 end desc,
  case when p_sort='relevant' then
   (select count(*) from public.post_comment_likes cl where cl.comment_id=c.id)
  else 0 end desc,
  c.created_at desc,c.id desc
 limit least(greatest(coalesce(p_limit,12),1),12)
 offset least(greatest(coalesce(p_offset,0),0),10000)
$function$;

CREATE OR REPLACE FUNCTION public.vatra_comment_thread_page(p_kind text, p_post_id uuid, p_sort text DEFAULT 'relevant'::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 12, p_parent uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, author_vatra_id bigint, body text, created_at timestamp with time zone, moderation_status text, likes bigint, parent_comment_id uuid, media_kind text, media_path text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
 select c.id,c.author_vatra_id,c.body,c.created_at,c.moderation_status,
  (select count(*) from public.post_comment_likes cl where cl.comment_id=c.id) as likes,
  c.parent_comment_id,c.media_kind,c.media_path
 from public.post_comments c
 where c.post_kind=p_kind and c.post_id=p_post_id
  and ((p_parent is null and c.parent_comment_id is null)
    or (p_parent is not null and c.parent_comment_id=p_parent))
  and (p_sort='all' or c.moderation_status='visible')
 order by
  case when p_parent is not null then c.created_at end asc nulls last,
  case when p_parent is null and p_sort='relevant' and exists (
   select 1 from public.friendships f
   join public.accounts a on a.user_id=(select auth.uid())
   where f.status='accepted'
    and ((f.requester_id=a.vatra_id and f.recipient_id=c.author_vatra_id)
     or (f.recipient_id=a.vatra_id and f.requester_id=c.author_vatra_id))
  ) then 1 else 0 end desc,
  case when p_parent is null and p_sort='relevant' then
   (select count(*) from public.post_comment_likes cl where cl.comment_id=c.id)
  else 0 end desc,
  c.created_at desc,c.id desc
 limit least(greatest(coalesce(p_limit,12),1),12)
 offset least(greatest(coalesce(p_offset,0),0),10000)
$function$;

CREATE OR REPLACE FUNCTION public.vatra_has_block_between(other_vatra_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select exists(
   select 1 from public.member_blocks b
    join public.accounts a on a.user_id=(select auth.uid())
   where (b.blocker_vatra_id=a.vatra_id and b.blocked_vatra_id=other_vatra_id)
      or (b.blocker_vatra_id=other_vatra_id and b.blocked_vatra_id=a.vatra_id)
  );
 $function$;

CREATE VIEW public.vatra_avatar_comment_likes WITH (security_invoker = true) AS SELECT * FROM public.avatar_comment_likes;
CREATE VIEW public.vatra_avatar_comments WITH (security_invoker = true) AS SELECT * FROM public.avatar_comments;
CREATE VIEW public.vatra_avatar_likes WITH (security_invoker = true) AS SELECT * FROM public.avatar_likes;
CREATE VIEW public.vatra_blocks WITH (security_invoker = true) AS SELECT * FROM public.member_blocks;
CREATE VIEW public.vatra_community_follows WITH (security_invoker = true) AS SELECT * FROM public.community_follows;
CREATE VIEW public.vatra_community_posts WITH (security_invoker = true) AS SELECT * FROM public.community_posts;
CREATE VIEW public.vatra_direct_messages WITH (security_invoker = true) AS SELECT * FROM public.direct_messages;
CREATE VIEW public.vatra_friendships WITH (security_invoker = true) AS SELECT * FROM public.friendships;
CREATE VIEW public.vatra_post_comment_likes WITH (security_invoker = true) AS SELECT * FROM public.post_comment_likes;
CREATE VIEW public.vatra_post_comments WITH (security_invoker = true) AS SELECT * FROM public.post_comments;
CREATE VIEW public.vatra_post_likes WITH (security_invoker = true) AS SELECT * FROM public.post_likes;
CREATE VIEW public.vatra_profile_media WITH (security_invoker = true) AS SELECT * FROM public.profile_media;
CREATE VIEW public.vatra_public_profiles WITH (security_invoker = true) AS SELECT * FROM public.public_profiles;
CREATE VIEW public.vatra_stories WITH (security_invoker = true) AS SELECT * FROM public.stories;
REVOKE ALL ON TABLE public.vatra_avatar_comment_likes, public.vatra_avatar_comments, public.vatra_avatar_likes, public.vatra_blocks, public.vatra_community_follows, public.vatra_community_posts, public.vatra_direct_messages, public.vatra_friendships, public.vatra_post_comment_likes, public.vatra_post_comments, public.vatra_post_likes, public.vatra_profile_media, public.vatra_public_profiles, public.vatra_stories FROM PUBLIC,anon,authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.vatra_avatar_comment_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.vatra_avatar_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.vatra_avatar_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.vatra_blocks TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.vatra_community_follows TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.vatra_community_posts TO authenticated;
GRANT SELECT, INSERT ON TABLE public.vatra_direct_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vatra_friendships TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.vatra_post_comment_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.vatra_post_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.vatra_post_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.vatra_profile_media TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.vatra_public_profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.vatra_stories TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
