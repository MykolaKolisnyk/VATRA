-- ВАТРА: схема для сумісного шару даних старого сайту.
-- Виконай один раз у SQL Editor. Існуючі дані в інших таблицях не видаляються.

create table if not exists public.app_data (
  path text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists app_data_path_prefix_idx on public.app_data (path text_pattern_ops);
create index if not exists app_data_updated_at_idx on public.app_data (updated_at desc);
alter table public.app_data enable row level security;
grant select on public.app_data to anon, authenticated;
grant insert, update, delete on public.app_data to authenticated;

create or replace function public.vatra_data_is_friend(_owner_uid text, _viewer_uid uuid)
returns boolean language sql stable security definer
set search_path = '' set row_security = off
as $vatra$
  select exists (
    select 1 from public.app_data f
    where f.path = 'friends/' || _owner_uid || '/' || _viewer_uid::text
      and f.value <> 'false'::jsonb and f.value <> 'null'::jsonb
  ) or exists (
    select 1 from public.app_data f
    where f.path = 'friends/' || _viewer_uid::text || '/' || _owner_uid
      and f.value <> 'false'::jsonb and f.value <> 'null'::jsonb
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
  select exists (
    select 1 from public.app_data g
    where g.path = 'groups/' || _group_id and g.value ->> 'ownerUid' = _viewer_uid::text
  );
$vatra$;

create or replace function public.vatra_data_is_group_member(_group_id text, _viewer_uid uuid)
returns boolean language sql stable security definer
set search_path = '' set row_security = off
as $vatra$
  select public.vatra_data_is_group_owner(_group_id, _viewer_uid)
    or exists (
      select 1 from public.app_data gm
      where gm.path = 'groupMembers/' || _group_id || '/' || _viewer_uid::text
        and gm.value <> 'false'::jsonb and gm.value <> 'null'::jsonb
    );
$vatra$;

create or replace function public.vatra_data_can_read(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb;
begin
 uid := auth.uid(); parts := string_to_array(_path, '/');
 if _path ~ '^publicProfiles/[^/]+$' then
   return (_value ->> 'profileVisibility' is distinct from 'private') or (uid is not null and (parts[2]=uid::text or public.vatra_data_is_friend(parts[2],uid)));
 end if;
 if _path ~ '^friendProfiles/[^/]+$' then return uid is not null and (parts[2]=uid::text or public.vatra_data_is_friend(parts[2],uid)); end if;
 if _path ~ '^users/[^/]+$' or _path ~ '^privateUsers/[^/]+$' then return uid is not null and parts[2]=uid::text; end if;
 if _path ~ '^posts/[^/]+$' then return public.vatra_data_can_read_post(parts[2],uid); end if;
 if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^comments/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+(/.*)?$' then return public.vatra_data_can_read_post(parts[2],uid); end if;
 if _path ~ '^videos/[^/]+$' or _path ~ '^groups/[^/]+$' or _path ~ '^groupMembers/[^/]+(/[^/]+)?$' or _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' or _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return true; end if;
 if _path ~ '^friends/[^/]+(/[^/]+)?$' or _path ~ '^following/[^/]+(/[^/]+)?$' then return uid is not null and parts[2]=uid::text; end if;
 if _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then return uid is not null and (parts[2]=uid::text or (array_length(parts,1)>=3 and parts[3]=uid::text)); end if;
 if _path ~ '^saved/[^/]+(/[^/]+)?$' or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$' or _path ~ '^userChats/[^/]+(/[^/]+)?$' or _path ~ '^activityReadAt/[^/]+$' or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return uid is not null and parts[2]=uid::text; end if;
 if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return uid is not null and parts[3]=uid::text; end if;
 if _path ~ '^chats/[^/]+$' then return uid is not null and coalesce(_value->'members','{}'::jsonb) ? uid::text; end if;
 if _path ~ '^chats/[^/]+/.+$' then select c.value into parent_value from public.app_data c where c.path='chats/'||parts[2]; return uid is not null and coalesce(parent_value->'members','{}'::jsonb) ? uid::text; end if;
 if _path ~ '^reports/[^/]+(/.*)?$' then return uid is not null and parts[2]=uid::text; end if;
 if _path ~ '^verifiedUsers/[^/]+$' then return true; end if;
 return false;
end;
$vatra$;

create or replace function public.vatra_data_can_write(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb;
begin
 uid:=auth.uid(); if uid is null then return false; end if; parts:=string_to_array(_path,'/');
 if _path ~ '^users/[^/]+$' or _path ~ '^privateUsers/[^/]+$' or _path ~ '^publicProfiles/[^/]+$' or _path ~ '^friendProfiles/[^/]+$' or _path ~ '^activityReadAt/[^/]+$' then return parts[2]=uid::text; end if;
 if _path ~ '^verifiedUsers/[^/]+$' then return exists(select 1 from public.app_data a where a.path='admins/'||uid::text and a.value='true'::jsonb); end if;
 if _path ~ '^posts/[^/]+$' then return _value->>'authorUid'=uid::text; end if;
 if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3]=uid::text; end if;
 if _path ~ '^saved/[^/]+(/[^/]+)?$' or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$' or _path ~ '^following/[^/]+(/[^/]+)?$' or _path ~ '^userChats/[^/]+(/[^/]+)?$' or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2]=uid::text; end if;
 if _path ~ '^comments/[^/]+/[^/]+$' then return _value->>'uid'=uid::text; end if;
 if _path ~ '^friends/[^/]+(/[^/]+)?$' or _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then return parts[2]=uid::text or (array_length(parts,1)>=3 and parts[3]=uid::text); end if;
 if _path ~ '^videos/[^/]+$' then return _value->>'authorUid'=uid::text; end if;
 if _path ~ '^groups/[^/]+$' then return _value->>'ownerUid'=uid::text; end if;
 if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then return (array_length(parts,1)>=3 and parts[3]=uid::text) or public.vatra_data_is_group_owner(parts[2],uid); end if;
 if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2],uid); end if;
 if _path ~ '^groupPosts/[^/]+(/[^/]+)?$' then return _value->>'authorUid'=uid::text and public.vatra_data_is_group_member(parts[2],uid); end if;
 if _path ~ '^chats/[^/]+$' then return coalesce(_value->'members','{}'::jsonb) ? uid::text; end if;
 if _path ~ '^chats/[^/]+/.+$' then select c.value into parent_value from public.app_data c where c.path='chats/'||parts[2]; return coalesce(parent_value->'members','{}'::jsonb) ? uid::text; end if;
 if _path ~ '^chatBlocks/[^/]+/[^/]+$' then return parts[3]=uid::text; end if;
 if _path ~ '^reports/[^/]+(/.*)?$' then return parts[2]=uid::text; end if;
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
  for p in select policyname from pg_policies where schemaname='public' and tablename='app_data'
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




-- Файлове сховище для аватарів, обкладинок, фото дописів і відео.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vatra-media','vatra-media',true,52428800,
 array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/svg+xml','video/mp4','video/webm','video/quicktime','video/ogg','video/x-m4v'])
on conflict (id) do update set public=true,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists vatra_media_public_read on storage.objects;
create policy vatra_media_public_read on storage.objects for select to anon, authenticated using (bucket_id='vatra-media');
drop policy if exists vatra_media_user_upload on storage.objects;
create policy vatra_media_user_upload on storage.objects for insert to authenticated with check (bucket_id='vatra-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists vatra_media_user_update on storage.objects;
create policy vatra_media_user_update on storage.objects for update to authenticated using (bucket_id='vatra-media' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='vatra-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists vatra_media_user_delete on storage.objects;
create policy vatra_media_user_delete on storage.objects for delete to authenticated using (bucket_id='vatra-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='app_data') then
    alter publication supabase_realtime add table public.app_data;
  end if;
end;
$realtime$;
 then
    return exists (select 1 from public.app_data a where a.path = 'admins/' || uid::text and a.value = 'true'::jsonb);
  end if;
  if _path ~ '^posts/[^/]+
  if _path ~ '^postLikes/[^/]+/[^/]+$' or _path ~ '^pollVotes/[^/]+/[^/]+$' then return parts[3] = uid::text; end if;
  if _path ~ '^saved/[^/]+(/[^/]+)?$' or _path ~ '^blockedUsers/[^/]+(/[^/]+)?$'
     or _path ~ '^following/[^/]+(/[^/]+)?$' or _path ~ '^userChats/[^/]+(/[^/]+)?$'
     or _path ~ '^chatReads/[^/]+(/[^/]+)?$' then return parts[2] = uid::text; end if;
  if _path ~ '^comments/[^/]+/[^/]+$' then return _value ->> 'uid' = uid::text; end if;
  if _path ~ '^friends/[^/]+(/[^/]+)?$' or _path ~ '^friendRequests/[^/]+(/[^/]+)?$' then
    return parts[2] = uid::text or (array_length(parts, 1) >= 3 and parts[3] = uid::text);
  end if;
  if _path ~ '^videos/[^/]+$' then return _value ->> 'authorUid' = uid::text; end if;
  if _path ~ '^groups/[^/]+$' then return _value ->> 'ownerUid' = uid::text; end if;
  if _path ~ '^groupMembers/[^/]+(/[^/]+)?$' then
    return (array_length(parts, 1) >= 3 and parts[3] = uid::text) or public.vatra_data_is_group_owner(parts[2], uid);
  end if;
  if _path ~ '^groupAdmins/[^/]+(/[^/]+)?$' then return public.vatra_data_is_group_owner(parts[2], uid); end if;
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
  for p in select policyname from pg_policies where schemaname='public' and tablename='app_data'
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




