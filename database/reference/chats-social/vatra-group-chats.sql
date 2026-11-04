-- VATRA • private group conversations, 3 November 2026.
-- Apply AFTER app-data-schema.sql. No existing data is deleted.
-- This adds RLS policies ONLY for group-conversation paths.
begin;

create or replace function public.vatra_group_chat_is_member(_id text,_uid uuid)
returns boolean language sql stable security definer
set search_path='' set row_security=off
as $group_members$
 select _uid is not null and exists(
  select 1 from public.app_data c
  where c.path='groupConversations/'||_id
    and jsonb_typeof(c.value->'members')='object'
    and (c.value->'members') ? _uid::text
 );
$group_members$;

create or replace function public.vatra_group_chat_read(_path text,_value jsonb)
returns boolean language plpgsql stable security definer
set search_path='' set row_security=off as $group_read$
declare p text[]:=string_to_array(_path,'/'); u uuid:=auth.uid();
begin
 if u is null then return false; end if;
 if _path ~ '^groupConversations/[^/]+$' then
  return coalesce(_value->'members','{}'::jsonb) ? u::text;
 elsif _path ~ '^groupMessages/[^/]+/[^/]+$' then
  return public.vatra_group_chat_is_member(p[2],u);
 elsif _path ~ '^groupChatIndex/[^/]+(/[^/]+)?$'
    or _path ~ '^groupChatReads/[^/]+(/[^/]+)?$' then
  return p[2]=u::text;
 end if;
 return false;
end;
$group_read$;

create or replace function public.vatra_group_chat_write(_path text,_value jsonb)
returns boolean language plpgsql stable security definer
set search_path='' set row_security=off as $group_write$
declare p text[]:=string_to_array(_path,'/'); u uuid:=auth.uid();
begin
 if u is null then return false; end if;
 if _path ~ '^groupConversations/[^/]+$' then
  return _value->>'ownerUid'=u::text
     and coalesce(_value->'members','{}'::jsonb) ? u::text;
 elsif _path ~ '^groupMessages/[^/]+/[^/]+$' then
  return public.vatra_group_chat_is_member(p[2],u)
     and _value->>'senderUid'=u::text
     and jsonb_typeof(_value->'text')='string'
     and length(trim(_value->>'text')) between 1 and 2000;
 elsif _path ~ '^groupChatReads/[^/]+/[^/]+$' then
  return p[2]=u::text and jsonb_typeof(_value)='number';
 end if;
 return false; -- Users cannot forge inbox rows.
end;
$group_write$;

revoke all on function public.vatra_group_chat_is_member(text,uuid) from public,anon;
revoke all on function public.vatra_group_chat_read(text,jsonb) from public,anon;
revoke all on function public.vatra_group_chat_write(text,jsonb) from public,anon;
grant execute on function public.vatra_group_chat_is_member(text,uuid) to authenticated;
grant execute on function public.vatra_group_chat_read(text,jsonb) to authenticated;
grant execute on function public.vatra_group_chat_write(text,jsonb) to authenticated;

drop policy if exists vatra_group_conversations_read on public.app_data;
create policy vatra_group_conversations_read on public.app_data for select to authenticated
using (public.vatra_group_chat_read(path,value));
drop policy if exists vatra_group_conversations_insert on public.app_data;
create policy vatra_group_conversations_insert on public.app_data for insert to authenticated
with check (public.vatra_group_chat_write(path,value));
drop policy if exists vatra_group_conversations_update on public.app_data;
create policy vatra_group_conversations_update on public.app_data for update to authenticated
using (public.vatra_group_chat_write(path,value))
with check (public.vatra_group_chat_write(path,value));
drop policy if exists vatra_group_conversations_delete on public.app_data;
create policy vatra_group_conversations_delete on public.app_data for delete to authenticated
using (public.vatra_group_chat_write(path,value));

-- Validate participant invitations and prevent renaming/rewriting a chat owned by someone else.
create or replace function public.vatra_group_chat_guard()
returns trigger language plpgsql
set search_path='' as $group_guard$
declare
 member record;
 total integer:=0;
 actor text:=auth.uid()::text;
begin
 if new.path ~ '^groupConversations/[^/]+$' then
  if coalesce(new.value->>'ownerUid','')<>actor then
   raise exception 'VATRA GROUP: only creator can update group chat' using errcode='P0001';
  end if;
  if tg_op='UPDATE' and old.value->>'ownerUid' is distinct from actor then
   raise exception 'VATRA GROUP: creator cannot change' using errcode='P0001';
  end if;
  if length(trim(coalesce(new.value->>'title',''))) not between 3 and 70
     or jsonb_typeof(new.value->'members')<>'object' then
   raise exception 'VATRA GROUP: invalid title or members' using errcode='P0001';
  end if;
  for member in select key,value from jsonb_each(new.value->'members') loop
   total:=total+1;
   if member.key !~ '^[0-9a-fA-F-]{36}$' or member.value<>'true'::jsonb then
    raise exception 'VATRA GROUP: invalid member' using errcode='P0001';
   end if;
  end loop;
  if total not between 2 and 20 or not(new.value->'members' ? actor) then
   raise exception 'VATRA GROUP: 2 to 20 members required' using errcode='P0001';
  end if;
 end if;
 return new;
end;
$group_guard$;
drop trigger if exists vatra_group_chat_guard on public.app_data;
create trigger vatra_group_chat_guard before insert or update of value on public.app_data
for each row when (new.path ~ '^groupConversations/[^/]+$')
execute function public.vatra_group_chat_guard();

-- Keep member inboxes in sync, including new groups and renamed conversations.
create or replace function public.vatra_group_chat_sync_members()
returns trigger language plpgsql security definer
set search_path='' set row_security=off as $group_sync_members$
declare
 id text:=split_part(new.path,'/',2);
 member text;
 old_members jsonb:='{}'::jsonb;
 indexpath text;
 info jsonb;
begin
 if tg_op='UPDATE' and jsonb_typeof(old.value->'members')='object' then
  old_members:=old.value->'members';
 end if;
 for member in select jsonb_object_keys(new.value->'members') loop
  indexpath:='groupChatIndex/'||member||'/'||id;
  info:=jsonb_build_object('title',left(new.value->>'title',70),
    'ownerUid',new.value->>'ownerUid','members',new.value->'members',
    'createdAt',new.value->'createdAt','updatedAt',coalesce(new.value->'createdAt','0'::jsonb));
  insert into public.app_data(path,value,updated_at)
   values(indexpath,info,clock_timestamp())
   on conflict(path) do update
    set value=public.app_data.value ||
      jsonb_build_object('title',excluded.value->'title',
        'ownerUid',excluded.value->'ownerUid','members',excluded.value->'members'),
      updated_at=clock_timestamp();
 end loop;
 for member in select jsonb_object_keys(old_members) loop
  if not(new.value->'members' ? member) then
   delete from public.app_data where path='groupChatIndex/'||member||'/'||id;
  end if;
 end loop;
 return new;
end;
$group_sync_members$;
revoke all on function public.vatra_group_chat_sync_members() from public,anon,authenticated;
drop trigger if exists vatra_group_chat_sync_members on public.app_data;
create trigger vatra_group_chat_sync_members after insert or update of value on public.app_data
 for each row when (new.path ~ '^groupConversations/[^/]+$')
 execute function public.vatra_group_chat_sync_members();

-- A single new message updates the unread preview for ALL current participants.
create or replace function public.vatra_group_chat_sync_messages()
returns trigger language plpgsql security definer
set search_path='' set row_security=off as $group_sync_messages$
declare
 id text:=split_part(new.path,'/',2);
 members jsonb;
 member text;
 info jsonb;
 stamp bigint;
 indexpath text;
begin
 select value->'members' into members from public.app_data
 where path='groupConversations/'||id;
 if jsonb_typeof(members)<>'object' then return new; end if;
 stamp:=coalesce(nullif(new.value->>'createdAt','')::bigint,
                 floor(extract(epoch from clock_timestamp())*1000)::bigint);
 info:=jsonb_build_object('lastMessage',jsonb_build_object(
  'text',left(new.value->>'text',120),
  'senderUid',new.value->>'senderUid','createdAt',stamp),'updatedAt',stamp);
 for member in select jsonb_object_keys(members) loop
  indexpath:='groupChatIndex/'||member||'/'||id;
  insert into public.app_data(path,value,updated_at)
   values(indexpath,info,clock_timestamp())
   on conflict(path) do update
    set value=public.app_data.value||excluded.value,updated_at=clock_timestamp()
   where coalesce(nullif(public.app_data.value->'lastMessage'->>'createdAt','')::bigint,0)<=stamp;
 end loop;
 return new;
end;
$group_sync_messages$;
revoke all on function public.vatra_group_chat_sync_messages() from public,anon,authenticated;
drop trigger if exists vatra_group_chat_sync_messages on public.app_data;
create trigger vatra_group_chat_sync_messages after insert on public.app_data
 for each row when (new.path ~ '^groupMessages/[^/]+/[^/]+$')
 execute function public.vatra_group_chat_sync_messages();
commit;

select tgname,tgenabled from pg_catalog.pg_trigger
where tgrelid='public.app_data'::regclass
  and tgname like 'vatra_group_chat_%' order by tgname;
