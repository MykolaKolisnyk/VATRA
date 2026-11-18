create or replace function public.search_site(p_query text,p_limit integer default 20)
returns jsonb language sql stable security invoker set search_path='' as $$
with args as (
 select left(btrim(coalesce(p_query,'')),120) as term, greatest(1,least(coalesce(p_limit,20),30)) as n
), q as (
 select *, '%'||replace(replace(replace(term,chr(92),chr(92)||chr(92)),'%',chr(92)||'%'),'_',chr(92)||'_')||'%' as pattern,
 substring(lower(term) from '^(?:(?:vatra *)?id *#? *)?([1-9][0-9]{0,18})$') as exact_id
 from args where char_length(term)>=2 or term ~ '^[1-9]$'
), people as (
 select p.vatra_id::text as vatra_id,p.display_name,left(p.status_text,180) as status_text,m.avatar_path,
 exists(select 1 from public.verified_accounts v where v.vatra_id=p.vatra_id) as verified
 from public.public_profiles p cross join q left join public.profile_media m on m.vatra_id=p.vatra_id
 where (q.exact_id is not null and p.vatra_id::text=q.exact_id) or (q.exact_id is null and (p.display_name ilike q.pattern or p.status_text ilike q.pattern))
 order by p.display_name,p.vatra_id limit (select n from args)
), clubs as (
 select c.club_id::text as club_id,c.name,left(c.description,180) as description
 from public.communities c cross join q where c.name ilike q.pattern or c.description ilike q.pattern
 order by c.created_at desc,c.club_id limit (select n from args)
), matches as (
 select f.id,null::text as club_id,left(f.body,220) as body,f.created_at,'person'::text as kind,coalesce(f.is_clip,false) as is_clip,
 (f.media_kind='image' or coalesce(f.media_items @> '[{"media_kind":"image"}]'::jsonb,false)) as photo,
 (f.media_kind='video' or coalesce(f.media_items @> '[{"media_kind":"video"}]'::jsonb,false)) as video
 from public.feed_posts f cross join q where f.archived_at is null and f.visibility='public' and f.body ilike q.pattern
 union all
 select c.id,c.club_id::text,left(c.body,220),c.created_at,'group',false,
 (c.media_kind='image' or coalesce(c.media_items @> '[{"media_kind":"image"}]'::jsonb,false)),
 (c.media_kind='video' or coalesce(c.media_items @> '[{"media_kind":"video"}]'::jsonb,false))
 from public.community_posts c cross join q where c.body ilike q.pattern
), posts as (select id,club_id,body,created_at,kind from matches where not is_clip order by created_at desc,id limit (select n from args)),
 clips as (select id,body,created_at from matches where is_clip order by created_at desc,id limit (select n from args)),
 photos as (select id,club_id,body,created_at,kind from matches where photo and not is_clip order by created_at desc,id limit (select n from args)),
 videos as (select id,club_id,body,created_at,kind from matches where video and not is_clip order by created_at desc,id limit (select n from args)),
 products as (
 select m.id,m.title,left(m.description,180) as description,m.price,m.currency,m.city,m.category
 from public.marketplace_listings m cross join q
 where m.status='active' and m.moderation_status='approved'
 and not vatra_market_private.is_suspended(m.seller_vatra_id)
 and not public.vatra_has_block_between(m.seller_vatra_id)
 and (m.title ilike q.pattern or m.description ilike q.pattern or m.city ilike q.pattern or m.category ilike q.pattern)
 order by m.created_at desc,m.id limit (select n from args)
)
select jsonb_build_object(
 'people',coalesce((select jsonb_agg(to_jsonb(p)) from people p),'[]'::jsonb),
 'communities',coalesce((select jsonb_agg(to_jsonb(c)) from clubs c),'[]'::jsonb),
 'posts',coalesce((select jsonb_agg(to_jsonb(p)) from posts p),'[]'::jsonb),
 'products',coalesce((select jsonb_agg(to_jsonb(p)) from products p),'[]'::jsonb),
 'clips',coalesce((select jsonb_agg(to_jsonb(c)) from clips c),'[]'::jsonb),
 'photos',coalesce((select jsonb_agg(to_jsonb(p)) from photos p),'[]'::jsonb),
 'videos',coalesce((select jsonb_agg(to_jsonb(v)) from videos v),'[]'::jsonb)
);
$$;
revoke all on function public.search_site(text,integer) from public,anon;
grant execute on function public.search_site(text,integer) to authenticated;
notify pgrst,'reload schema';
