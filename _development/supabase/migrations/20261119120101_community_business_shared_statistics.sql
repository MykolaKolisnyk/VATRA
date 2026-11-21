begin;
alter table public.business_metrics add column community_follower_count bigint not null default 0 check(community_follower_count>=0),add column community_post_count bigint not null default 0 check(community_post_count>=0);
update public.business_metrics m set community_follower_count=(select count(*) from public.community_follows f where f.club_id=c.club_id),community_post_count=(select count(*) from public.community_posts p where p.club_id=c.club_id) from public.business_companies c where c.id=m.company_id;
create function business_private.seed_community_metrics() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.club_id is not null then
  update public.business_metrics set community_follower_count=(select count(*) from public.community_follows f where f.club_id=new.club_id),community_post_count=(select count(*) from public.community_posts p where p.club_id=new.club_id) where company_id=new.id;
 end if;return null;
end; $$;
revoke all on function business_private.seed_community_metrics() from public,anon,authenticated;
create trigger business_z_seed_community_metrics after insert on public.business_companies for each row execute function business_private.seed_community_metrics();
create function business_private.community_metrics_delta() returns trigger language plpgsql security definer set search_path='' as $$
declare old_club bigint; new_club bigint; is_follow boolean;
begin
 is_follow:=tg_table_name='community_follows';
 if tg_op<>'INSERT' then old_club:=old.club_id;end if;
 if tg_op<>'DELETE' then new_club:=new.club_id;end if;
 if old_club is not distinct from new_club then return null;end if;
 if old_club is not null then
  update public.business_metrics m set community_follower_count=greatest(0,m.community_follower_count-case when is_follow then 1 else 0 end),community_post_count=greatest(0,m.community_post_count-case when is_follow then 0 else 1 end) from public.business_companies c where c.club_id=old_club and m.company_id=c.id;
 end if;
 if new_club is not null then
  update public.business_metrics m set community_follower_count=m.community_follower_count+case when is_follow then 1 else 0 end,community_post_count=m.community_post_count+case when is_follow then 0 else 1 end from public.business_companies c where c.club_id=new_club and m.company_id=c.id;
 end if;return null;
end; $$;
revoke all on function business_private.community_metrics_delta() from public,anon,authenticated;
create trigger business_shared_follow_metrics after insert or delete or update of club_id on public.community_follows for each row execute function business_private.community_metrics_delta();
create trigger business_shared_post_metrics after insert or delete or update of club_id on public.community_posts for each row execute function business_private.community_metrics_delta();
grant select(community_follower_count,community_post_count) on public.business_metrics to authenticated;
-- The public social identity is the club. Preserve legacy rows but prohibit new duplicate follows/posts.
revoke insert,update,delete on public.business_followers,public.business_posts from authenticated;
revoke insert(company_id) on public.business_followers from authenticated;
revoke insert(company_id,body) on public.business_posts from authenticated;
commit;
