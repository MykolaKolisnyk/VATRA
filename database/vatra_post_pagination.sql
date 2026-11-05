-- VATRA news pagination. RLS is enforced on public.app_data as the calling user.
-- The function never bypasses authorization and cannot mutate records.
create or replace function public.vatra_page_posts(
  p_before_created_at bigint default null,
  p_before_path text default null,
  p_limit integer default 48,
  p_author_ids text[] default null
)
returns table(path text, value jsonb)
language sql stable security invoker
set search_path = ''
as $function$
  select d.path, d.value
  from public.app_data as d
  where d.path like 'posts/%'
    and d.path ~ '^posts/[^/]+$'
    and d.value ->> 'createdAt' ~ '^[0-9]{10,15}$'
    and (p_author_ids is null or d.value ->> 'authorUid' = any(p_author_ids))
    and (p_before_created_at is null
      or (((d.value ->> 'createdAt')::bigint),d.path)
        < (p_before_created_at, coalesce(p_before_path, '')))
  order by (d.value ->> 'createdAt')::bigint desc, d.path desc
  limit least(greatest(coalesce(p_limit,48),1),48);
$function$;

revoke all on function public.vatra_page_posts(bigint,text,integer,text[]) from public,anon;
grant execute on function public.vatra_page_posts(bigint,text,integer,text[]) to authenticated;

-- New posts are append-only for the feed view; the index supports descending
-- cursor scans without reading/sorting the entire application data table.
create index if not exists vatra_app_post_created_cursor_idx
 on public.app_data (((value ->> 'createdAt')::bigint) desc, path desc)
 where path ~ '^posts/[^/]+$'
   and value ->> 'createdAt' ~ '^[0-9]{10,15}$';
