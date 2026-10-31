-- VATRA: enable community post reactions, comments, shares and polls, with RLS intact.
-- Execute in Supabase SQL Editor. Does not wipe data, disable RLS or recreate policies.
-- Existing tables and vatra_data_is_group_member function must already be installed.
create or replace function public.vatra_data_can_read_post(_post_id text, _viewer_uid uuid)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare post_value jsonb; author_uid text; post_visibility text; group_id text; group_post_id text; group_value jsonb;
begin
  select p.value into post_value from public.app_data p where p.path = 'posts/' || _post_id;
  -- Community posts keep the canonical path groupPosts/<group>/<post>.
  -- Their feed cards use g_<group_id>_<post_id> as stable reaction keys.
  if post_value is null and _post_id ~ '^g_[^_]+_[^_]+$' then
    group_id := substring(_post_id from '^g_([^_]+)_');
    group_post_id := substring(_post_id from '^g_[^_]+_([^_]+)$');
    select gp.value into post_value
    from public.app_data gp
    where gp.path = 'groupPosts/' || group_id || '/' || group_post_id;
    if post_value is null then return false; end if;
    select g.value into group_value
    from public.app_data g where g.path = 'groups/' || group_id;
    if group_value is null then return false; end if;
    return coalesce(group_value ->> 'visibility', 'public') <> 'private'
       or public.vatra_data_is_group_member(group_id, _viewer_uid);
  end if;
  if post_value is null then return false; end if;
  author_uid := coalesce(post_value ->> 'authorUid', '');
  post_visibility := coalesce(post_value ->> 'visibility', 'public');
  if _viewer_uid is not null and author_uid = _viewer_uid::text then return true; end if;
  if post_visibility = 'public' then return true; end if;
  if post_visibility = 'friends' and _viewer_uid is not null then
    return public.vatra_data_is_friend(author_uid, _viewer_uid);
  end if;
  return false;
end;
$vatra$;

-- Enforce community-author permission on signed-in creator/admin accounts.
-- VATRA: publish community posts in the name of a community only by its creator or administrators.
-- Apply once in Supabase SQL Editor, in addition to the existing app-data-schema.sql deployment.
-- This does not disable or broaden RLS. It protects rows even when clients bypass the UI.
create or replace function public.vatra_validate_group_post_author()
returns trigger
language plpgsql security definer
set search_path = '' set row_security = off
as $vatra$
declare
  group_id text;
  viewer_id text;
begin
  if new.path !~ '^groupPosts/[^/]+/[^/]+$' then return new; end if;
  if coalesce(new.value ->> 'authorType','user') <> 'group' then return new; end if;
  group_id := split_part(new.path,'/',2);
  viewer_id := auth.uid()::text;
  if viewer_id is null or new.value ->> 'authorUid' is distinct from viewer_id then
    raise exception 'Only the signed-in author may publish this community post.';
  end if;
  if not exists (
    select 1 from public.app_data g
    where g.path = 'groups/' || group_id and g.value ->> 'ownerUid' = viewer_id
  ) and not exists (
    select 1 from public.app_data a
    where a.path = 'groupAdmins/' || group_id || '/' || viewer_id
      and a.value = 'true'::jsonb
  ) then
    raise exception 'Only a community creator or administrator may publish as the community.';
  end if;
  return new;
end;
$vatra$;
drop trigger if exists vatra_validate_group_post_author on public.app_data;
create trigger vatra_validate_group_post_author
before insert or update on public.app_data
for each row execute function public.vatra_validate_group_post_author();
