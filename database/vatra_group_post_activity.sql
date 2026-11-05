-- VATRA community discovery: tiny aggregate counts replace fetching the
-- complete worldwide groupPosts tree. This function uses caller RLS.
create or replace function public.vatra_group_recent_counts(p_group_ids text[] default null)
returns table(group_id text, recent_posts bigint)
language sql stable security invoker
set search_path = ''
as $f$
 select split_part(d.path, '/', 2) as group_id, count(*)::bigint as recent_posts
 from public.app_data d
 where d.path ~ '^groupPosts/[0-9a-fA-F-]{36}/[^/]+$'
  and (p_group_ids is null or split_part(d.path, '/', 2) = any(p_group_ids))
  and (d.value->>'createdAt') ~ '^[0-9]{10,15}$'
  and ((d.value->>'createdAt')::bigint) >= ((extract(epoch from now())-2592000)*1000)::bigint
 group by split_part(d.path, '/', 2);
$f$;
revoke all on function public.vatra_group_recent_counts(text[]) from public, anon;
grant execute on function public.vatra_group_recent_counts(text[]) to authenticated;
create index if not exists vatra_group_recent_posts_idx
 on public.app_data ((split_part(path, '/', 2)), ((value->>'createdAt')::bigint) desc)
 where path ~ '^groupPosts/[0-9a-fA-F-]{36}/[^/]+$'
   and (value->>'createdAt') ~ '^[0-9]{10,15}$';
