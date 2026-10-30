-- ВАТРА: схема доступу для сумісного шару даних.
-- Повторний запуск оновлює функції та правила доступу, не видаляючи дані.

create table if not exists public.app_data (
  path text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
-- Repair older installations where app_data was created before updated_at existed.
alter table public.app_data add column if not exists updated_at timestamptz not null default now();
create index if not exists app_data_path_prefix_idx on public.app_data (path text_pattern_ops);
create index if not exists app_data_updated_at_idx on public.app_data (updated_at desc);
alter table public.app_data enable row level security;

-- Normalize a legacy Firebase-style posts root into one row per post.
-- This keeps row-level security able to check each post's author independently.
do $posts_migration$
declare root_value jsonb; item record;
begin
  select value into root_value from public.app_data where path = 'posts';
  if jsonb_typeof(root_value) = 'object' then
    for item in select key, value from jsonb_each(root_value)
    loop
      insert into public.app_data(path, value, updated_at)
      values ('posts/' || item.key, item.value, now())
      on conflict (path) do nothing;
    end loop;
    delete from public.app_data where path = 'posts';
  end if;
end;
$posts_migration$;
grant select on public.app_data to anon, authenticated;
grant insert, update, delete on public.app_data to authenticated;

create or replace function public.vatra_data_is_friend(_owner_uid text, _viewer_uid uuid)
returns boolean language sql stable security definer
set search_path = '' set row_security = off
as $vatra$
  select _viewer_uid is not null
    and exists (
      select 1 from public.app_data a
      where a.path = 'friends/' || _owner_uid
        and a.value ? _viewer_uid::text
        and a.value ->> _viewer_uid::text = 'true'
    )
    and exists (
      select 1 from public.app_data b
      where b.path = 'friends/' || _viewer_uid::text
        and b.value ? _owner_uid
        and b.value ->> _owner_uid = 'true'
    );
$vatra$;

create or replace function public.vatra_data_can_read_post(_post_id text, _viewer_uid uuid)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare post_value jsonb; author_uid text; post_visibility text;
begin
  select p.value into post_value from public.app_data p where p.path = 'posts/' || _post_id;
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

create or replace function public.vatra_data_is_group_owner(_group_id text, _viewer_uid uuid)
returns boolean language sql stable security definer
set search_path = '' set row_security = off
as $vatra$
  select _viewer_uid is not null and exists (
    select 1 from public.app_data g
    where g.path = 'groups/' || _group_id and g.value ->> 'ownerUid' = _viewer_uid::text
  );
$vatra$;

create or replace function public.vatra_data_is_group_member(_group_id text, _viewer_uid uuid)
returns boolean language sql stable security definer
set search_path = '' set row_security = off
as $vatra$
  select _viewer_uid is not null
    and (
      public.vatra_data_is_group_owner(_group_id, _viewer_uid)
      or exists (
        select 1 from public.app_data gm
        where gm.path = 'groupMembers/' || _group_id || '/' || _viewer_uid::text
          and gm.value <> 'false'::jsonb and gm.value <> 'null'::jsonb
      )
    );
$vatra$;

create or replace function public.vatra_data_can_read(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb;
begin
  uid := auth.uid();
  parts := string_to_array(_path, '/');

  -- E2EE public identity keys may only be read by signed-in users.
  -- The private key never leaves IndexedDB on the user's device.
  if _path ~ '^e2eeKeys/[^/]+$' then
    return uid is not null;
  end if;
  if _path ~ '^publicProfiles/[^/]+$' then
    return (_value ->> 'profileVisibility' is distinct from 'private')
      or (uid is not null and (parts[2] = uid::text or public.vatra_data_is_friend(parts[2], uid)));
  end if;
  if _path ~ '^friendProfiles/[^/]+$' then
    return uid is not null and (parts[2] = uid::text or public.vatra_data_is_friend(parts[2], uid));
  end if;
  if _path ~ '^users/[^/]+$' or _path ~ '^privateUsers/[^/]+$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^posts/[^/]+$' then return public.vatra_data_can_read_post(parts[2], uid); end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^comments/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' or _path ~ '^postSaves/[^/]+/[^/]+$' or _path ~ '^postShares/[^/]+/[^/]+$' then return public.vatra_data_can_read_post(parts[2], uid); end if;
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' or _path ~ '^postSaves/[^/]+/[^/]+$' or _path ~ '^postShares/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^comments/[^/]+/[^/]+
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^pollVotes/[^/]+(/.*)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    return public.vatra_data_can_read_post(parts[2], uid);
  end if;

  -- Avatar reactions and comments inherit the owner's profile visibility.
  if _path ~ '^avatarLikes/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^avatarComments/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    select p.value into parent_value
      from public.app_data p
      where p.path = 'publicProfiles/' || parts[2];
    if parent_value is null then return false; end if;
    return coalesce(parent_value ->> 'profileVisibility', 'public') <> 'private'
      or (uid is not null and (parts[2] = uid::text or public.vatra_data_is_friend(parts[2], uid)));
  end if;
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 or _path ~ '^pollVotes/[^/]+/[^/]+

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^comments/[^/]+/[^/]+
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^pollVotes/[^/]+(/.*)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    return public.vatra_data_can_read_post(parts[2], uid);
  end if;

  -- Avatar reactions and comments inherit the owner's profile visibility.
  if _path ~ '^avatarLikes/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^avatarComments/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    select p.value into parent_value
      from public.app_data p
      where p.path = 'publicProfiles/' || parts[2];
    if parent_value is null then return false; end if;
    return coalesce(parent_value ->> 'profileVisibility', 'public') <> 'private'
      or (uid is not null and (parts[2] = uid::text or public.vatra_data_is_friend(parts[2], uid)));
  end if;
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^comments/[^/]+/[^/]+
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^pollVotes/[^/]+(/.*)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    return public.vatra_data_can_read_post(parts[2], uid);
  end if;

  -- Avatar reactions and comments inherit the owner's profile visibility.
  if _path ~ '^avatarLikes/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^avatarComments/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    select p.value into parent_value
      from public.app_data p
      where p.path = 'publicProfiles/' || parts[2];
    if parent_value is null then return false; end if;
    return coalesce(parent_value ->> 'profileVisibility', 'public') <> 'private'
      or (uid is not null and (parts[2] = uid::text or public.vatra_data_is_friend(parts[2], uid)));
  end if;
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then return _value ->> 'uid' = uid::text; end if;

  -- A user may react only as themselves. Avatar comments can be removed by
  -- their author or by the owner of the profile the image belongs to.
  if _path ~ '^avatarLikes/[^/]+/[^/]+/[^/]+

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^comments/[^/]+/[^/]+
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^pollVotes/[^/]+(/.*)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    return public.vatra_data_can_read_post(parts[2], uid);
  end if;

  -- Avatar reactions and comments inherit the owner's profile visibility.
  if _path ~ '^avatarLikes/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^avatarComments/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    select p.value into parent_value
      from public.app_data p
      where p.path = 'publicProfiles/' || parts[2];
    if parent_value is null then return false; end if;
    return coalesce(parent_value ->> 'profileVisibility', 'public') <> 'private'
      or (uid is not null and (parts[2] = uid::text or public.vatra_data_is_friend(parts[2], uid)));
  end if;
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    return parts[4] = uid::text;
  end if;
  if _path ~ '^avatarComments/[^/]+/[^/]+/[^/]+

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^comments/[^/]+/[^/]+
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^pollVotes/[^/]+(/.*)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    return public.vatra_data_can_read_post(parts[2], uid);
  end if;

  -- Avatar reactions and comments inherit the owner's profile visibility.
  if _path ~ '^avatarLikes/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^avatarComments/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    select p.value into parent_value
      from public.app_data p
      where p.path = 'publicProfiles/' || parts[2];
    if parent_value is null then return false; end if;
    return coalesce(parent_value ->> 'profileVisibility', 'public') <> 'private'
      or (uid is not null and (parts[2] = uid::text or public.vatra_data_is_friend(parts[2], uid)));
  end if;
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    return _value ->> 'uid' = uid::text or parts[2] = uid::text;
  end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^comments/[^/]+/[^/]+
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^pollVotes/[^/]+(/.*)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    return public.vatra_data_can_read_post(parts[2], uid);
  end if;

  -- Avatar reactions and comments inherit the owner's profile visibility.
  if _path ~ '^avatarLikes/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

     or _path ~ '^avatarComments/[^/]+/[^/]+(/[^/]+)?
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    select p.value into parent_value
      from public.app_data p
      where p.path = 'publicProfiles/' || parts[2];
    if parent_value is null then return false; end if;
    return coalesce(parent_value ->> 'profileVisibility', 'public') <> 'private'
      or (uid is not null and (parts[2] = uid::text or public.vatra_data_is_friend(parts[2], uid)));
  end if;
  if _path ~ '^groups/[^/]+$' then
    return coalesce(_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
     or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then
    select g.value into parent_value from public.app_data g where g.path = 'groups/' || parts[2];
    return coalesce(parent_value ->> 'visibility', 'public') <> 'private'
      or public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$'
     or _path ~ '^groupMembers/[^/]+(/[^/]+)?$'
     or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$'
      or _path ~ '^groupModerators/[^/]+(/[^/]+)?$'
     or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
  if _path ~ '^friends/[^/]+$' or _path ~ '^following/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return uid is not null and (parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text));
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^activityReadAt/[^/]+$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then
    return uid is not null and parts[2] = uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3] = uid::text; end if;
  if _path ~ '^chats/[^/]+$' then
    return uid is not null and coalesce(_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return uid is not null and coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2] = uid::text; end if;
  if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
  if _path ~ '^admins/[^/]+$' then return uid is not null and parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb; old_value jsonb;
begin
  uid := auth.uid();
  if uid is null then return false; end if;
  parts := string_to_array(_path, '/');

  -- The identity is writable only by its owner. The public key is
  -- allowed; a private ECDH key must never be stored in app_data.
  if _path ~ '^e2eeKeys/[^/]+$' then
    return parts[2] = uid::text
      and _value ->> 'v' = '1'
      and _value ->> 'curve' = 'P-256'
      and _value ->> 'fingerprint' ~ '^[a-f0-9]{64}$'
      and _value -> 'jwk' ->> 'kty' = 'EC'
      and _value -> 'jwk' ->> 'crv' = 'P-256'
      and _value -> 'jwk' ->> 'x' ~ '^[A-Za-z0-9_-]{43}
  end if;
  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

      and _value -> 'jwk' ->> 'y' ~ '^[A-Za-z0-9_-]{43}
  end if;
  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

      and _value -> 'signJwk' ->> 'kty' = 'EC'
      and _value -> 'signJwk' ->> 'crv' = 'P-256'
      and _value -> 'signJwk' ->> 'x' ~ '^[A-Za-z0-9_-]{43}
  end if;
  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

      and _value -> 'signJwk' ->> 'y' ~ '^[A-Za-z0-9_-]{43}
  end if;
  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;

      and not (_value ? 'privateKey')
      and not (_value ? 'privateSignKey');
  end if;
  if _path ~ '^users/[^/]+$'
     or _path ~ '^privateUsers/[^/]+$'
     or _path ~ '^publicProfiles/[^/]+$'
     or _path ~ '^friendProfiles/[^/]+$'
     or _path ~ '^activityReadAt/[^/]+$' then
    return parts[2] = uid::text;
  end if;
  if _path ~ '^verifiedUsers/[^/]+$' then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;

  -- A friend list is stored as one JSON object per account. Adding an entry
  -- to someone else's list requires their pending incoming request.
  if _path ~ '^friends/[^/]+$' then
    if parts[2] = uid::text then return true; end if;
    select f.value into old_value from public.app_data f where f.path = 'friends/' || parts[2];
    if old_value is not null and old_value ? uid::text
       and (old_value - uid::text) = (_value - uid::text) then return true; end if;
    return _value ? uid::text
      and _value ->> uid::text = 'true'
      and coalesce(old_value - uid::text, '{}'::jsonb) = (_value - uid::text)
      and exists (
        select 1 from public.app_data r
        where r.path = 'friendRequests/' || uid::text || '/' || parts[2]
          and r.value ->> 'status' = 'pending'
          and r.value ->> 'direction' = 'incoming'
      );
  end if;

  if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts,1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$'
     or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$'
     or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then
    select a.value into old_value from public.app_data a where a.path = _path;
    if old_value is null then return _value ->> 'ownerUid' = uid::text; end if;
    return _value ->> 'ownerUid' = old_value ->> 'ownerUid'
      and (old_value ->> 'ownerUid' = uid::text
        or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb));
  end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts,1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupModerators/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid) or exists (select 1 from public.app_data a where a.path = 'groupAdmins/' || parts[2] || '/' || uid::text and a.value = 'true'::jsonb); end if;
  if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then
    return _value ->> 'authorUid' = uid::text and public.vatra_data_is_group_member(parts[2], uid);
  end if;
  if _path ~ '^chats/[^/]+$' then return coalesce(_value -> 'members', '{}'::jsonb) ? uid::text; end if;
  if _path ~ '^chats/[^/]+/.+$' then
    select c.value into parent_value from public.app_data c where c.path = 'chats/' || parts[2];
    return coalesce(parent_value -> 'members', '{}'::jsonb) ? uid::text;
  end if;
  if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2] = uid::text; end if;
  return false;
end;
$vatra$;

alter function public.vatra_data_is_friend(text, uuid) owner to postgres;
alter function public.vatra_data_can_read_post(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_owner(text, uuid) owner to postgres;
alter function public.vatra_data_is_group_member(text, uuid) owner to postgres;
alter function public.vatra_data_can_read(text, jsonb) owner to postgres;
alter function public.vatra_data_can_write(text, jsonb) owner to postgres;
grant execute on function public.vatra_data_is_friend(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_can_read_post(text, uuid) to anon, authenticated;
grant execute on function public.vatra_data_is_group_owner(text, uuid) to authenticated;
grant execute on function public.vatra_data_is_group_member(text, uuid) to authenticated;
grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;

do $vatra$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data'
  loop execute format('drop policy if exists %I on public.app_data', p.policyname); end loop;
end;
$vatra$;

create policy app_data_select on public.app_data for select to anon, authenticated
  using (public.vatra_data_can_read(path, value));
create policy app_data_insert on public.app_data for insert to authenticated
  with check (public.vatra_data_can_write(path, value));
create policy app_data_update on public.app_data for update to authenticated
  using (public.vatra_data_can_write(path, value))
  with check (public.vatra_data_can_write(path, value));
create policy app_data_delete on public.app_data for delete to authenticated
  using (public.vatra_data_can_write(path, value));

-- Narrow post policies provide an explicit owner check for publishing, editing,
-- and deleting one post row without relaxing access to other data.
drop policy if exists app_data_insert_own_posts on public.app_data;
create policy app_data_insert_own_posts on public.app_data for insert to authenticated
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_update_own_posts on public.app_data;
create policy app_data_update_own_posts on public.app_data for update to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text)
  with check (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);
drop policy if exists app_data_delete_own_posts on public.app_data;
create policy app_data_delete_own_posts on public.app_data for delete to authenticated
  using (path ~ '^posts/[^/]+$' and value ->> 'authorUid' = (select auth.uid())::text);

-- Public media URLs are used for content explicitly shown in the feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media', 'vatra-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vatra-media');

drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vatra-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_data'
     ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;


-- VATRA E2EE enforcement. Existing legacy plaintext messages remain readable,
-- but newly inserted or changed private messages MUST be signed ciphertext.
-- Applies both to individual message paths and to messages nested in a chat row.
create or replace function public.vatra_e2ee_guard()
returns trigger
language plpgsql
set search_path = ''
as $vatra_e2ee$
declare
  old_messages jsonb := '{}'::jsonb;
  new_messages jsonb := '{}'::jsonb;
  message_id text;
  message_payload jsonb;
begin
  if new.path ~ '^chats/[^/]+/messages/[^/]+$' then
    message_payload := new.value;
    if jsonb_typeof(message_payload) <> 'object'
       or not (message_payload ? 'encrypted')
       or message_payload ? 'text'
       or message_payload ->> 'senderUid' is null
       or message_payload -> 'encrypted' ->> 'v' <> '1'
       or message_payload -> 'encrypted' ->> 'alg' <> 'ECDH-P256-HKDF-SHA256-AES256GCM-ECDSA'
       or message_payload -> 'encrypted' ->> 'ciphertext' is null
       or message_payload -> 'encrypted' ->> 'iv' is null
       or message_payload -> 'encrypted' ->> 'signature' is null then
      raise exception 'VATRA E2EE: private messages must contain signed ciphertext';
    end if;
  elsif new.path ~ '^chats/[^/]+$' then
    if tg_op = 'UPDATE' then
      old_messages := coalesce(old.value -> 'messages', '{}'::jsonb);
    end if;
    new_messages := coalesce(new.value -> 'messages', '{}'::jsonb);
    if jsonb_typeof(new_messages) <> 'object' then
      raise exception 'VATRA E2EE: invalid chat message container';
    end if;
    for message_id in select jsonb_object_keys(new_messages) loop
      message_payload := new_messages -> message_id;
      if message_payload is distinct from old_messages -> message_id then
        if jsonb_typeof(message_payload) <> 'object'
           or not (message_payload ? 'encrypted')
           or message_payload ? 'text'
           or message_payload ->> 'senderUid' is null
           or message_payload -> 'encrypted' ->> 'v' <> '1'
           or message_payload -> 'encrypted' ->> 'alg' <> 'ECDH-P256-HKDF-SHA256-AES256GCM-ECDSA'
           or message_payload -> 'encrypted' ->> 'ciphertext' is null
           or message_payload -> 'encrypted' ->> 'iv' is null
           or message_payload -> 'encrypted' ->> 'signature' is null then
          raise exception 'VATRA E2EE: private messages must contain signed ciphertext';
        end if;
      end if;
    end loop;
  end if;
  return new;
end;
$vatra_e2ee$;

drop trigger if exists vatra_require_encrypted_messages on public.app_data;
create trigger vatra_require_encrypted_messages
before insert or update of value on public.app_data
for each row
when (new.path ~ '^chats/[^/]+($|/messages/[^/]+$)')
execute function public.vatra_e2ee_guard();
