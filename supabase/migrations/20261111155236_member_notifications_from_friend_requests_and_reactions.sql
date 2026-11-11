-- VATRA member notifications. Server-generated from verified friend/reaction writes.
-- Private recipient inbox; no client INSERT permission and no leakage via RLS.
create table if not exists public.member_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_vatra_id bigint not null references public.vatra_directory(vatra_id) on delete cascade,
 actor_vatra_id bigint not null references public.vatra_directory(vatra_id) on delete cascade,
 kind text not null check (kind in ('friend_request','friend_accepted','post_like','comment_like','avatar_like','avatar_comment_like')),
 target_kind text not null check (target_kind in ('friend','person','group','post_comment','avatar','avatar_comment')),
 target_id uuid,
 context_id uuid,
 avatar_owner_vatra_id bigint,
 event_key text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique (recipient_vatra_id,event_key)
);
create index if not exists member_notifications_recent_idx
 on public.member_notifications(recipient_vatra_id,created_at desc,id desc);
create index if not exists member_notifications_unread_idx
 on public.member_notifications(recipient_vatra_id,created_at desc)
 where read_at is null;
alter table public.member_notifications enable row level security;
revoke all on public.member_notifications from public,anon,authenticated;
grant select,delete on public.member_notifications to authenticated;
grant update(read_at) on public.member_notifications to authenticated;
drop policy if exists member_notifications_read_self on public.member_notifications;
create policy member_notifications_read_self on public.member_notifications
 for select to authenticated using (
  exists (select 1 from public.accounts a
   where a.user_id=(select auth.uid()) and a.vatra_id=recipient_vatra_id)
 );
drop policy if exists member_notifications_update_self on public.member_notifications;
create policy member_notifications_update_self on public.member_notifications
 for update to authenticated
 using (exists (select 1 from public.accounts a where a.user_id=(select auth.uid())
   and a.vatra_id=recipient_vatra_id))
 with check (exists (select 1 from public.accounts a where a.user_id=(select auth.uid())
   and a.vatra_id=recipient_vatra_id));
drop policy if exists member_notifications_delete_self on public.member_notifications;
create policy member_notifications_delete_self on public.member_notifications
 for delete to authenticated using (
  exists (select 1 from public.accounts a
   where a.user_id=(select auth.uid()) and a.vatra_id=recipient_vatra_id)
 );

create or replace function private.emit_member_notification()
returns trigger language plpgsql security definer
set search_path=''
as $fn$
declare
 v_recipient bigint;
 v_actor bigint;
 v_kind text;
 v_target_kind text;
 v_target uuid;
 v_context uuid;
 v_avatar_owner bigint;
 v_event_key text;
begin
 if tg_table_name='vatra_friendships' then
  if tg_op='INSERT' and new.status='pending' then
   v_recipient:=new.recipient_id;
   v_actor:=new.requester_id;
   v_kind:='friend_request';v_target_kind:='friend';v_target:=new.id;
   v_event_key:='friend_request:'||new.id::text;
  elsif tg_op='UPDATE' and new.status='accepted' and old.status='pending' then
   v_recipient:=new.requester_id;
   v_actor:=new.recipient_id;
   v_kind:='friend_accepted';v_target_kind:='friend';v_target:=new.id;
   v_event_key:='friend_accepted:'||new.id::text;
  else return new;end if;

 elsif tg_table_name='vatra_post_likes' and tg_op='INSERT' then
  select a.vatra_id into v_actor from public.accounts a where a.user_id=new.liker_id;
  if new.post_kind='person' then
   select p.author_vatra_id into v_recipient from public.feed_posts p where p.id=new.post_id;
  elsif new.post_kind='group' then
   select p.author_vatra_id into v_recipient from public.vatra_community_posts p where p.id=new.post_id;
  else return new;end if;
  v_kind:='post_like';v_target_kind:=new.post_kind;
  v_target:=new.post_id;v_context:=new.post_id;
  v_event_key:='post_like:'||new.post_kind||':'||new.post_id||':'||new.liker_id;

 elsif tg_table_name='vatra_post_comment_likes' and tg_op='INSERT' then
  select a.vatra_id into v_actor from public.accounts a where a.user_id=new.liker_id;
  select c.author_vatra_id,c.id,c.post_id
   into v_recipient,v_target,v_context
   from public.vatra_post_comments c where c.id=new.comment_id;
  v_kind:='comment_like';v_target_kind:='post_comment';
  v_event_key:='post_comment_like:'||new.comment_id||':'||new.liker_id;

 elsif tg_table_name='vatra_avatar_likes' and tg_op='INSERT' then
  select a.vatra_id into v_actor from public.accounts a where a.user_id=new.liker_id;
  v_recipient:=new.owner_vatra_id;v_avatar_owner:=new.owner_vatra_id;
  v_kind:='avatar_like';v_target_kind:='avatar';
  v_event_key:='avatar_like:'||new.owner_vatra_id||':'||new.avatar_path||':'||new.liker_id;

 elsif tg_table_name='vatra_avatar_comment_likes' and tg_op='INSERT' then
  select a.vatra_id into v_actor from public.accounts a where a.user_id=new.liker_id;
  select c.author_vatra_id,c.id,c.owner_vatra_id
   into v_recipient,v_target,v_avatar_owner from public.vatra_avatar_comments c
   where c.id=new.comment_id;
  v_kind:='avatar_comment_like';v_target_kind:='avatar_comment';
  v_event_key:='avatar_comment_like:'||new.comment_id||':'||new.liker_id;
 else
  return new;
 end if;
 if v_recipient is null or v_actor is null or v_recipient=v_actor or v_event_key is null then
  return new;
 end if;
 insert into public.member_notifications
  (recipient_vatra_id,actor_vatra_id,kind,target_kind,target_id,context_id,avatar_owner_vatra_id,event_key)
 values(v_recipient,v_actor,v_kind,v_target_kind,v_target,v_context,v_avatar_owner,v_event_key)
 on conflict(recipient_vatra_id,event_key) do nothing;
 return new;
end;
$fn$;
revoke all on function private.emit_member_notification() from public,anon,authenticated;
drop trigger if exists notify_friend_request on public.vatra_friendships;
create trigger notify_friend_request after insert or update of status on public.vatra_friendships
 for each row execute function private.emit_member_notification();
drop trigger if exists notify_post_like on public.vatra_post_likes;
create trigger notify_post_like after insert on public.vatra_post_likes
 for each row execute function private.emit_member_notification();
drop trigger if exists notify_post_comment_like on public.vatra_post_comment_likes;
create trigger notify_post_comment_like after insert on public.vatra_post_comment_likes
 for each row execute function private.emit_member_notification();
drop trigger if exists notify_avatar_like on public.vatra_avatar_likes;
create trigger notify_avatar_like after insert on public.vatra_avatar_likes
 for each row execute function private.emit_member_notification();
drop trigger if exists notify_avatar_comment_like on public.vatra_avatar_comment_likes;
create trigger notify_avatar_comment_like after insert on public.vatra_avatar_comment_likes
 for each row execute function private.emit_member_notification();
