begin;
lock table public.business_posts, public.business_followers, public.business_companies, public.business_metrics in access exclusive mode;
do $$
begin
 if exists(select 1 from public.business_posts) or exists(select 1 from public.business_followers) then
  raise exception 'Legacy business activity exists; migrate before removal';
 end if;
 if exists(select 1 from public.business_companies c left join public.communities g on g.club_id=c.club_id where g.club_id is null or g.business_enabled is not true) then
  raise exception 'Unlinked business identity exists';
 end if;
 if exists(select 1 from public.business_metrics where follower_count<>0 or post_count<>0) then
  raise exception 'Legacy activity counters are not empty';
 end if;
end $$;
drop table public.business_posts;
drop table public.business_followers;
drop function business_private.change_metrics();
alter table public.business_metrics drop column follower_count, drop column post_count;
drop policy business_company_create on public.business_companies;
alter table public.business_companies alter column club_id set not null;
commit;