-- Disposable PostgreSQL CI only, after the staged lifecycle table exists.
create schema vatra_security_private;
create schema storage;
create function auth.uid() returns uuid language sql stable set search_path='' as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
-- Match the current live moderation predicate, including expired blocks.
create function vatra_security_private.allowed() returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.accounts a join public.account_states s on s.vatra_id=a.vatra_id where a.user_id=auth.uid() and (s.state='deleted' or (s.state='blocked' and (s.blocked_until is null or s.blocked_until>now())))
$$;
revoke all on function vatra_security_private.allowed() from public,anon;
grant usage on schema auth,vatra_security_private,storage to authenticated;
grant execute on function vatra_security_private.allowed() to authenticated;
-- Representative tables, not the full production schema or its permissive policies.
create table public.feed_posts(id integer primary key);
create table public.avatar_photo_tags(id integer primary key);
create table storage.objects(id integer primary key);
alter table public.feed_posts enable row level security;
alter table public.avatar_photo_tags enable row level security;
alter table storage.objects enable row level security;
grant select,insert,update,delete on public.feed_posts,public.avatar_photo_tags,storage.objects to authenticated;
create policy fixture_feed on public.feed_posts for all to authenticated using(true) with check(true);
create policy fixture_tags on public.avatar_photo_tags for all to authenticated using(true) with check(true);
create policy fixture_storage on storage.objects for all to authenticated using(true) with check(true);
create policy vatra_active_account on public.feed_posts as restrictive for all to authenticated using((select vatra_security_private.allowed())) with check((select vatra_security_private.allowed()));
create policy vatra_admin_active_account on storage.objects as restrictive for all to authenticated using((select vatra_security_private.allowed())) with check((select vatra_security_private.allowed()));
