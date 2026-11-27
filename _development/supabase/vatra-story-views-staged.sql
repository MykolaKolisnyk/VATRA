-- Staged candidate; validate in isolated PostgreSQL before any live rollout.
create table public.story_views (
 story_id uuid not null references public.stories(id) on delete cascade,
 viewer_vatra_id bigint not null references public.accounts(vatra_id) on delete cascade,
 viewed_at timestamptz not null default now(),
 primary key (story_id,viewer_vatra_id)
);
create index story_views_viewer_idx on public.story_views(viewer_vatra_id);
create index story_views_story_time_idx on public.story_views(story_id,viewed_at desc,viewer_vatra_id);
alter table public.story_views enable row level security;
revoke all on public.story_views from public,anon,authenticated;
grant select on public.story_views to authenticated;
grant insert(story_id,viewer_vatra_id) on public.story_views to authenticated;
create policy story_views_insert_self on public.story_views for insert to authenticated
 with check (
  exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=story_views.viewer_vatra_id)
  and exists (select 1 from public.stories s where s.id=story_views.story_id
    and s.author_vatra_id<>story_views.viewer_vatra_id and s.expires_at>now())
 );
create policy story_views_read_owner on public.story_views for select to authenticated
 using (
  exists (select 1 from public.stories s join public.accounts a on a.vatra_id=s.author_vatra_id
    where s.id=story_views.story_id and a.user_id=(select auth.uid()))
  and not public.vatra_has_block_between(viewer_vatra_id)
 );
create policy vatra_active_account on public.story_views as restrictive for all to authenticated
 using ((select vatra_security_private.allowed()))
 with check ((select vatra_security_private.allowed()));
