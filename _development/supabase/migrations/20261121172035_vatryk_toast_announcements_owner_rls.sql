create table public.vatra_announcements (
 id bigint generated always as identity primary key,
 title_uk varchar(110) not null check (length(btrim(title_uk))>0),
 title_en varchar(110) not null check (length(btrim(title_en))>0),
 body_uk varchar(360) not null check (length(btrim(body_uk))>0),
 body_en varchar(360) not null check (length(btrim(body_en))>0),
 target_path varchar(200) check (target_path is null or
  (target_path ~ '^[A-Za-z0-9][A-Za-z0-9/_?&=.#%-]*$' and position('..' in target_path)=0)),
 active boolean not null default false,
 starts_at timestamptz not null default now(),
 ends_at timestamptz,
 created_at timestamptz not null default now(),
 constraint vatra_announcement_time_check check(ends_at is null or ends_at>starts_at)
);
create index vatra_announcements_active_created_idx on public.vatra_announcements(created_at desc) where active;
alter table public.vatra_announcements enable row level security;
revoke all on public.vatra_announcements from public,anon,authenticated;
grant select on public.vatra_announcements to authenticated;
grant insert(title_uk,title_en,body_uk,body_en,target_path,active) on public.vatra_announcements to authenticated;
grant update(title_uk,title_en,body_uk,body_en,target_path,active) on public.vatra_announcements to authenticated;
grant delete on public.vatra_announcements to authenticated;
grant usage on sequence public.vatra_announcements_id_seq to authenticated;

create policy vatra_announcement_read on public.vatra_announcements
 for select to authenticated using (
  (select vatra_admin_private.is_owner()) or
  (active and starts_at<=now() and (ends_at is null or ends_at>now()))
 );
create policy vatra_announcement_owner_insert on public.vatra_announcements
 for insert to authenticated with check (
  (select vatra_admin_private.is_owner()) and (select vatra_admin_private.allowed())
 );
create policy vatra_announcement_owner_update on public.vatra_announcements
 for update to authenticated
 using ((select vatra_admin_private.is_owner()) and (select vatra_admin_private.allowed()))
 with check ((select vatra_admin_private.is_owner()) and (select vatra_admin_private.allowed()));
create policy vatra_announcement_owner_delete on public.vatra_announcements
 for delete to authenticated
 using ((select vatra_admin_private.is_owner()) and (select vatra_admin_private.allowed()));

create table public.vatra_announcement_views (
 announcement_id bigint not null references public.vatra_announcements(id) on delete cascade,
 user_id uuid not null default auth.uid(),
 viewed_at timestamptz not null default now(),
 primary key(announcement_id,user_id)
);
create index vatra_announcement_views_member_idx on public.vatra_announcement_views(user_id,viewed_at desc);
alter table public.vatra_announcement_views enable row level security;
revoke all on public.vatra_announcement_views from public,anon,authenticated;
grant select(announcement_id) on public.vatra_announcement_views to authenticated;
grant insert(announcement_id) on public.vatra_announcement_views to authenticated;
create policy vatra_announcement_views_own_read on public.vatra_announcement_views
 for select to authenticated using (user_id=(select auth.uid()));
create policy vatra_announcement_views_own_insert on public.vatra_announcement_views
 for insert to authenticated with check (
  user_id=(select auth.uid()) and exists (
   select 1 from public.vatra_announcements a
   where a.id=announcement_id and a.active
    and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())
  )
 );
