-- VATRA: public-identifiable preview of the three newest likes on a visible post.
-- Client never receives liker auth UUIDs or private accounts.
create or replace function public.vatra_post_recent_likers(p_kind text,p_post_id uuid)
returns table(vatra_id bigint)
language plpgsql stable security definer set search_path=''
as $fn$
begin
 if (select auth.uid()) is null or p_post_id is null or p_kind not in ('person','group') then
  return;
 end if;
 if p_kind='person' then
  if not exists(select 1 from public.feed_posts p where p.id=p_post_id and
   (p.archived_at is null or p.author_id=(select auth.uid()))) then return;end if;
 elsif p_kind='group' then
  if not exists(select 1 from public.vatra_community_posts p where p.id=p_post_id
   and (
    exists(select 1 from public.vatra_community_follows f
      join public.accounts a on a.vatra_id=f.member_vatra_id
      where a.user_id=(select auth.uid()) and f.club_id=p.club_id)
    or exists(select 1 from public.communities c where c.club_id=p.club_id and c.owner_id=(select auth.uid()))
   )) then return;end if;
 end if;
 return query
 select a.vatra_id
 from public.vatra_post_likes l
 join public.accounts a on a.user_id=l.liker_id
 where l.post_kind=p_kind and l.post_id=p_post_id
 order by l.created_at desc, a.vatra_id
 limit 3;
end;
$fn$;
revoke all on function public.vatra_post_recent_likers(text,uuid) from public,anon,authenticated;
grant execute on function public.vatra_post_recent_likers(text,uuid) to authenticated;
