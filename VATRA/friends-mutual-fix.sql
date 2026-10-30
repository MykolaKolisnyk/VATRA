-- VATRA: atomic, reciprocal friendships for the existing app_data storage.
-- Apply once in the Supabase SQL Editor with a database administrator session.
-- This is additive: no table drops, no RLS changes, no deleted user data.
-- The browser never receives an elevated database key.

create or replace function public.vatra_accept_friend(p_sender uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $vatra_friends$
declare
  receiver_uid text := (select auth.uid())::text;
  sender_uid text := p_sender::text;
  pending jsonb;
begin
  if receiver_uid is null then
    raise exception 'VATRA: log in to accept a friend request' using errcode = '42501';
  end if;
  if p_sender is null or receiver_uid = sender_uid then
    raise exception 'VATRA: invalid friend request' using errcode = '22023';
  end if;

  -- Only the actual recipient can approve an existing, incoming request.
  select r.value into pending
    from public.app_data as r
   where r.path = 'friendRequests/' || receiver_uid || '/' || sender_uid
   for update;
  if pending is null
     or pending ->> 'status' is distinct from 'pending'
     or pending ->> 'direction' is distinct from 'incoming'
     or pending ->> 'from' is distinct from sender_uid
     or pending ->> 'to' is distinct from receiver_uid then
    raise exception 'VATRA: no valid pending incoming friend request' using errcode = '42501';
  end if;

  -- Both sides are written within the same PostgreSQL transaction.
  -- Each existing person's other friendships are preserved.
  insert into public.app_data(path, value, updated_at)
  values ('friends/' || receiver_uid, jsonb_build_object(sender_uid, true), now())
  on conflict (path) do update
     set value = coalesce(public.app_data.value, '{}'::jsonb) || excluded.value,
         updated_at = now();

  insert into public.app_data(path, value, updated_at)
  values ('friends/' || sender_uid, jsonb_build_object(receiver_uid, true), now())
  on conflict (path) do update
     set value = coalesce(public.app_data.value, '{}'::jsonb) || excluded.value,
         updated_at = now();

  delete from public.app_data
   where path in (
     'friendRequests/' || receiver_uid || '/' || sender_uid,
     'friendRequests/' || sender_uid || '/' || receiver_uid
   );
  return true;
end;
$vatra_friends$;

create or replace function public.vatra_remove_friend(p_other uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $vatra_friends$
declare
  actor_uid text := (select auth.uid())::text;
  other_uid text := p_other::text;
  has_link boolean;
begin
  if actor_uid is null then
    raise exception 'VATRA: log in to remove a friend' using errcode = '42501';
  end if;
  if p_other is null or actor_uid = other_uid then
    raise exception 'VATRA: invalid friend' using errcode = '22023';
  end if;

  -- Users can unlink only a relationship that involves themselves.
  select exists (
    select 1 from public.app_data a
     where (a.path = 'friends/' || actor_uid and a.value ->> other_uid = 'true')
        or (a.path = 'friends/' || other_uid and a.value ->> actor_uid = 'true')
  ) into has_link;
  if not has_link then return false; end if;

  update public.app_data
     set value = value - other_uid, updated_at = now()
   where path = 'friends/' || actor_uid and jsonb_typeof(value) = 'object';
  update public.app_data
     set value = value - actor_uid, updated_at = now()
   where path = 'friends/' || other_uid and jsonb_typeof(value) = 'object';
  delete from public.app_data where path in (
    'friendRequests/' || actor_uid || '/' || other_uid,
    'friendRequests/' || other_uid || '/' || actor_uid
  );
  return true;
end;
$vatra_friends$;

-- Repairs only relationships where the receiver's own list already contains
-- the sender AND the sender's original incoming request remains pending.
-- This cannot turn an arbitrary one-sided link into friendship.
create or replace function public.vatra_repair_my_friends()
returns integer
language plpgsql
security definer
set search_path = ''
as $vatra_friends$
declare
  actor_uid text := (select auth.uid())::text;
  candidate record;
  repaired integer := 0;
begin
  if actor_uid is null then
    raise exception 'VATRA: login required' using errcode = '42501';
  end if;
  for candidate in
    select (r.value ->> 'from')::uuid as sender
      from public.app_data r
     where r.path like 'friendRequests/' || actor_uid || '/%'
       and r.value ->> 'status' = 'pending'
       and r.value ->> 'direction' = 'incoming'
       and r.value ->> 'to' = actor_uid
       and (r.value ->> 'from') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and exists (
         select 1 from public.app_data f
          where f.path = 'friends/' || actor_uid
            and f.value ->> (r.value ->> 'from') = 'true'
       )
  loop
    perform public.vatra_accept_friend(candidate.sender);
    repaired := repaired + 1;
  end loop;
  return repaired;
end;
$vatra_friends$;

-- These functions must be callable only by authenticated people, not anon.
revoke all on function public.vatra_accept_friend(uuid) from public, anon;
revoke all on function public.vatra_remove_friend(uuid) from public, anon;
revoke all on function public.vatra_repair_my_friends() from public, anon;
grant execute on function public.vatra_accept_friend(uuid) to authenticated;
grant execute on function public.vatra_remove_friend(uuid) to authenticated;
grant execute on function public.vatra_repair_my_friends() to authenticated;
