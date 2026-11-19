create table public.site_maintenance (
 id smallint primary key default 1 check (id=1),
 enabled boolean not null default false
);
alter table public.site_maintenance enable row level security;
insert into public.site_maintenance(id,enabled) values(1,false);
revoke all on public.site_maintenance from public,anon,authenticated;
grant select(id,enabled) on public.site_maintenance to anon,authenticated;
grant update(enabled) on public.site_maintenance to authenticated;
create policy site_maintenance_read on public.site_maintenance for select to anon,authenticated using (id=1);
create policy site_maintenance_owner_update on public.site_maintenance for update to authenticated
 using (id=1 and (select vatra_admin_private.is_owner()) and (select vatra_admin_private.allowed()))
 with check (id=1 and (select vatra_admin_private.is_owner()) and (select vatra_admin_private.allowed()));