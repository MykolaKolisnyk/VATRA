begin;
set local lock_timeout = '5s';
set local statement_timeout = '20s';
lock table public.announcement_views, public.announcements, public.verification_requests in access exclusive mode;
do $$
begin
 if exists(select 1 from public.announcement_views) or exists(select 1 from public.announcements) or exists(select 1 from public.verification_requests) then
  raise exception 'Retired tables contain records; abort cleanup';
 end if;
end $$;
drop table public.announcement_views restrict;
drop table public.announcements restrict;
drop table public.verification_requests restrict;
commit;
