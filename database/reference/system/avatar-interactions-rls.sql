-- VATRA: narrowly scoped RLS repair for profile-photo reactions/comments.
-- Keeps app_data RLS enabled. Run once in Supabase SQL Editor after reviewing.
-- Private profiles expose these records only to the owner and mutual friends.

create or replace function public.vatra_data_can_read(_path text, _value jsonb)
returns boolean language plpgsql stable security definer
set search_path = '' set row_security = off
as $vatra$
declare parts text[]; uid uuid; parent_value jsonb;
begin
  uid := auth.uid();
  parts := string_to_array(_path, '/');

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
  if _path ~ '^postLikes/[^/]+/[^/]+
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
$vatra$
     or _path ~ '^pollVotes/[^/]+/[^/]+
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
$vatra$
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
$vatra$ then
    return public.vatra_data_can_read_post(parts[2], uid);
  end if;
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
$vatra$
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
$vatra$ then
    select p.value into parent_value
    from public.app_data p
    where p.path = 'publicProfiles/' || parts[2];
    if parent_value is null then
      return uid is not null and (parts[2] = uid::text or public.vatra_data_is_friend(parts[2], uid));
    end if;
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
$vatra$

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
$vatra$ then
    return _value ->> 'uid' = uid::text
      or exists (
        select 1 from public.app_data p
        where p.path = 'posts/' || parts[2]
          and p.value ->> 'authorUid' = uid::text
      );
  end if;
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
$vatra$ then
    return parts[4] = uid::text and _value ->> 'uid' = uid::text;
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
$vatra$ then
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
$vatra$

grant execute on function public.vatra_data_can_read(text, jsonb) to anon, authenticated;
grant execute on function public.vatra_data_can_write(text, jsonb) to authenticated;
