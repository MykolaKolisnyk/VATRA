-- VATRA: single RLS-aware batch of likes, comments, shares and saved status.
-- Applied to Supabase as 20261113153255_batch_rls_post_engagement_page.
-- Default SECURITY INVOKER is intentional; never bypass row visibility.
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
    select 1 from public.vatra_community_posts g where g.id=p.post_id
  ))
 ),
 likes as (
  select l.post_kind,l.post_id,count(*)::bigint as n,
   coalesce(bool_or(l.liker_id=(select auth.uid())),false) as mine
  from public.vatra_post_likes l
  join visible p on p.post_kind=l.post_kind and p.post_id=l.post_id
  group by l.post_kind,l.post_id
 ),
 comments as (
  select c.post_kind,c.post_id,count(*)::bigint as n
  from public.vatra_post_comments c
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
REVOKE ALL ON FUNCTION public.post_engagement_page(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_engagement_page(jsonb) TO authenticated;
