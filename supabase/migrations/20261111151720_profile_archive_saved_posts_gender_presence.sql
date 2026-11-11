-- VATRA: server-derived last-seen, owner-only archives, and saved posts.
alter table public.feed_posts add column if not exists archived_at timestamptz;
create index if not exists feed_posts_visible_newest_idx on public.feed_posts(created_at desc,id desc) where archived_at is null;
create index if not exists feed_posts_owner_archive_idx on public.feed_posts(author_vatra_id,archived_at desc,id desc) where archived_at is not null;
grant update(archived_at) on public.feed_posts to authenticated;
drop policy if exists "Read feed as signed-in member" on public.feed_posts;
create policy "Read feed as signed-in member" on public.feed_posts for select to authenticated
 using(archived_at is null or author_id=(select auth.uid()));
drop policy if exists "Archive own feed posts" on public.feed_posts;
create policy "Archive own feed posts" on public.feed_posts for update to authenticated
 using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
drop policy if exists "Story archive read by owner" on public.vatra_stories;
create policy "Story archive read by owner" on public.vatra_stories for select to authenticated
 using(expires_at<=now() and exists(select 1 from public.accounts a
 where a.vatra_id=vatra_stories.author_vatra_id and a.user_id=(select auth.uid())));
create index if not exists vatra_story_owner_archived_idx on public.vatra_stories(author_vatra_id,created_at desc);
create table if not exists public.post_saves(
 owner_vatra_id bigint not null references public.vatra_directory(vatra_id) on delete cascade,
 post_kind text not null check(post_kind in ('person','group')),
 post_id uuid not null,
 saved_at timestamptz not null default now(),
 primary key(owner_vatra_id,post_kind,post_id)
);
create index if not exists post_saves_owner_latest_idx on public.post_saves(owner_vatra_id,saved_at desc);
alter table public.post_saves enable row level security;
revoke all on public.post_saves from public,anon,authenticated;
grant select,insert,delete on public.post_saves to authenticated;
drop policy if exists "Read own saved posts" on public.post_saves;
create policy "Read own saved posts" on public.post_saves for select to authenticated
 using(exists(select 1 from public.accounts a where a.vatra_id=post_saves.owner_vatra_id and a.user_id=(select auth.uid())));
drop policy if exists "Save own posts" on public.post_saves;
create policy "Save own posts" on public.post_saves for insert to authenticated
 with check(exists(select 1 from public.accounts a where a.vatra_id=post_saves.owner_vatra_id and a.user_id=(select auth.uid())));
drop policy if exists "Unsave own posts" on public.post_saves;
create policy "Unsave own posts" on public.post_saves for delete to authenticated
 using(exists(select 1 from public.accounts a where a.vatra_id=post_saves.owner_vatra_id and a.user_id=(select auth.uid())));
create or replace function private.stamp_profile_presence()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare v_gender text;
begin
 select u.raw_user_meta_data->>'gender' into v_gender
 from public.accounts a join auth.users u on u.id=a.user_id where a.vatra_id=new.vatra_id;
 new.form:=case v_gender when 'male' then 'masculine' when 'female' then 'feminine' else 'neutral' end;
 new.last_seen_at:=now();
 return new;
end;
$fn$;
revoke update(form) on public.profile_presence from authenticated;
revoke insert(form) on public.profile_presence from authenticated;
update public.profile_presence p
set form=case u.raw_user_meta_data->>'gender' when 'male' then 'masculine' when 'female' then 'feminine' else 'neutral' end
from public.accounts a join auth.users u on u.id=a.user_id
where p.vatra_id=a.vatra_id and p.form is distinct from
 (case u.raw_user_meta_data->>'gender' when 'male' then 'masculine' when 'female' then 'feminine' else 'neutral' end);
