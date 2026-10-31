-- VATRA account lifecycle: server-owned settings and delayed hard deletion.
-- Apply once in the Supabase SQL Editor. RLS remains enabled.
create table if not exists public.vatra_account_lifecycle (
  user_id uuid primary key references auth.users(id) on delete cascade,
  inactivity_days integer check (inactivity_days in (7,30,365)),
  last_seen_at timestamptz not null default now(),
  deletion_requested_at timestamptz,
  delete_after timestamptz,
  deletion_reason text check (deletion_reason in ('user','inactivity')),
  updated_at timestamptz not null default now()
);
alter table public.vatra_account_lifecycle enable row level security;
revoke all on public.vatra_account_lifecycle from anon, authenticated;
grant select on public.vatra_account_lifecycle to authenticated;
drop policy if exists vatra_account_lifecycle_self on public.vatra_account_lifecycle;
create policy vatra_account_lifecycle_self on public.vatra_account_lifecycle
  for select to authenticated using (user_id = (select auth.uid()));

-- Mark inactive accounts in a single set-based operation; each receives an
-- additional 30-day recovery period. This never deletes an account directly.
create or replace function public.vatra_mark_inactive_users()
returns integer language plpgsql security definer
set search_path = '' set row_security = off
as $vatra$
declare marked integer;
begin
  update public.vatra_account_lifecycle l
  set deletion_requested_at=now(),
      delete_after=now()+interval '30 days',
      deletion_reason='inactivity',updated_at=now()
  where l.inactivity_days in (7,30,365)
    and l.delete_after is null
    and l.last_seen_at + make_interval(days => l.inactivity_days) <= now()
    and not exists (
      select 1 from public.app_data g
      where g.path like 'groups/%' and g.value->>'ownerUid'=l.user_id::text
    );
  get diagnostics marked = row_count;
  return marked;
end;
$vatra$;
revoke all on function public.vatra_mark_inactive_users() from public, anon, authenticated;
grant execute on function public.vatra_mark_inactive_users() to service_role;

-- Minimal non-personal status record: an old profile link may say that the account was deleted.
create table if not exists public.vatra_account_tombstones(user_id uuid primary key,deleted_at timestamptz not null default now());
alter table public.vatra_account_tombstones enable row level security;
revoke all on public.vatra_account_tombstones from anon,authenticated;

-- Called only by the service-role Edge Function after the 30-day recovery period.
-- Owned communities must be transferred/deleted BEFORE requesting deletion.
create or replace function public.vatra_purge_user_data(target_uid uuid)
returns void language plpgsql security definer
set search_path = '' set row_security = off
as $vatra$
declare
  uid text := target_uid::text;
begin
  if exists (
    select 1 from public.app_data
    where path like 'groups/%' and value ->> 'ownerUid' = uid
  ) then raise exception 'Transfer ownership of communities before deletion'; end if;

  insert into public.vatra_account_tombstones(user_id,deleted_at) values(target_uid,now())
  on conflict (user_id) do update set deleted_at=excluded.deleted_at;

  -- Remove the user's content, including posts/comments inside other spaces.
  delete from public.app_data
  where (
    path ~ '^(posts|groupPosts)/'
    and value ->> 'authorUid' = uid
  ) or (
    path ~ '^(comments|avatarComments)/'
    and coalesce(value ->> 'uid', value ->> 'authorUid') = uid
  ) or (
    path ~ '^chats/[^/]+/messages/'
    and value ->> 'senderUid' = uid
  ) or (
    path ~ '^videos/'
    and coalesce(value ->> 'authorUid', value ->> 'uid') = uid
  ) or (
    path ~ '^reports/'
    and (value ->> 'reporterUid' = uid or path like 'reports/' || uid || '/%')
  ) or (
    path ~ '^groupContacts/'
    and value ->> 'uid' = uid
  );

  -- Remove rows directly scoped to the account and per-user reaction / membership keys.
  delete from public.app_data where
    path = any (array[
     'users/'||uid,'publicProfiles/'||uid,'friendProfiles/'||uid,
     'privateUsers/'||uid,'friends/'||uid,'following/'||uid,
     'saved/'||uid,'blockedUsers/'||uid,'userChats/'||uid,
     'friendRequests/'||uid,'chatReads/'||uid,'admins/'||uid,
     'verifiedUsers/'||uid,'e2eeKeys/'||uid,'avatarLikes/'||uid
    ]) or
    path like any (array[
     'privateUsers/'||uid||'/%','userChats/'||uid||'/%',
     'friendRequests/'||uid||'/%','saved/'||uid||'/%',
     'following/'||uid||'/%','blockedUsers/'||uid||'/%',
     'reports/'||uid||'/%','chatReads/'||uid||'/%',
     'groupMembers/%/'||uid,'groupAdmins/%/'||uid,'groupModerators/%/'||uid,
     'postLikes/%/'||uid,'postSaves/%/'||uid,'postShares/%/'||uid,
     'pollVotes/%/'||uid,'avatarLikes/%/'||uid,
     'friends/%/'||uid
    ]);

  -- Scrub cross-references in old Firebase-style objects and public contact lists.
  update public.app_data
    set value = value - uid,updated_at=now()
  where path ~ '^(friends|following|blockedUsers|groupMembers|groupAdmins|groupModerators)/'
    and jsonb_typeof(value) = 'object' and value ? uid;

  update public.app_data a
  set value = jsonb_set(a.value,'{contacts}',
    coalesce((
      select jsonb_agg(item)
      from jsonb_array_elements(case when jsonb_typeof(a.value->'contacts')='array' then a.value->'contacts' else '[]'::jsonb end) item
      where item->>'uid' is distinct from uid
    ),'[]'::jsonb),true),updated_at=now()
  where a.path like 'groups/%'
    and jsonb_typeof(a.value->'contacts') = 'array'
    and exists (
      select 1 from jsonb_array_elements(case when jsonb_typeof(a.value->'contacts')='array' then a.value->'contacts' else '[]'::jsonb end) item
      where item->>'uid' = uid
    );
end;
$vatra$;
revoke all on function public.vatra_purge_user_data(uuid) from public, anon, authenticated;
grant execute on function public.vatra_purge_user_data(uuid) to service_role;
