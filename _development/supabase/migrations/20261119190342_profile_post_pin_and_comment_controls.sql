alter table public.feed_posts add column if not exists pinned_at timestamptz, add column if not exists comments_enabled boolean not null default true;
create unique index if not exists feed_posts_one_pin_per_author on public.feed_posts(author_id) where pinned_at is not null;
create or replace function public.vatra_set_post_pin(p_post_id uuid,p_pin boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
declare owner_id uuid := auth.uid();
begin
 if owner_id is null or p_pin is null then return false; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text,0));
 if not exists(select 1 from public.feed_posts where id=p_post_id and author_id=owner_id and archived_at is null and not is_clip) then return false;end if;
 if p_pin then
  update public.feed_posts set pinned_at=null where author_id=owner_id and pinned_at is not null and id<>p_post_id;
 end if;
 update public.feed_posts set pinned_at=case when p_pin then pg_catalog.now() else null end where id=p_post_id and author_id=owner_id and archived_at is null and not is_clip;
 return found;
end;$$;
revoke all on function public.vatra_set_post_pin(uuid,boolean) from public,anon;
grant execute on function public.vatra_set_post_pin(uuid,boolean) to authenticated;
create policy post_comments_enabled_gate on public.post_comments as restrictive for insert to authenticated with check
 (post_kind <> 'person' or exists(select 1 from public.feed_posts p where p.id=post_comments.post_id and p.comments_enabled and p.archived_at is null));