-- Map reaction auth UUIDs to public VATRA member IDs on the SERVER.
-- Read access uses the original post's RLS, no exposed SECURITY DEFINER RPC.
create table if not exists public.vatra_post_like_members (
 post_kind text not null check (post_kind in ('person','group')),
 post_id uuid not null,
 liker_vatra_id bigint not null references public.vatra_directory(vatra_id) on delete cascade,
 liked_at timestamptz not null default now(),
 primary key (post_kind,post_id,liker_vatra_id)
);
create index if not exists vatra_post_like_members_recent_idx
 on public.vatra_post_like_members(post_kind,post_id,liked_at desc);
alter table public.vatra_post_like_members enable row level security;
revoke all on public.vatra_post_like_members from public,anon,authenticated;
grant select on public.vatra_post_like_members to authenticated;
drop policy if exists post_liker_member_read_accessible on public.vatra_post_like_members;
create policy post_liker_member_read_accessible
 on public.vatra_post_like_members for select to authenticated
 using (
  (post_kind='person' and exists(select 1 from public.feed_posts p where p.id=post_id))
  or (post_kind='group' and exists(select 1 from public.vatra_community_posts p where p.id=post_id))
 );

create or replace function private.sync_public_post_liker()
returns trigger language plpgsql security definer
set search_path=''
as $fn$
declare member_id bigint;
begin
 if tg_op='DELETE' then
  select a.vatra_id into member_id from public.accounts a where a.user_id=old.liker_id;
  if member_id is not null then
   delete from public.vatra_post_like_members
   where post_kind=old.post_kind and post_id=old.post_id and liker_vatra_id=member_id;
  end if;
  return old;
 end if;
 select a.vatra_id into member_id from public.accounts a where a.user_id=new.liker_id;
 if member_id is not null then
  insert into public.vatra_post_like_members(post_kind,post_id,liker_vatra_id,liked_at)
  values(new.post_kind,new.post_id,member_id,new.created_at)
  on conflict(post_kind,post_id,liker_vatra_id)
  do update set liked_at=excluded.liked_at;
 end if;
 return new;
end $fn$;
revoke all on function private.sync_public_post_liker() from public,anon,authenticated;
drop trigger if exists sync_public_post_liker on public.vatra_post_likes;
create trigger sync_public_post_liker after insert or delete on public.vatra_post_likes
 for each row execute function private.sync_public_post_liker();

-- Backfill only published public IDs, not private auth identifiers.
insert into public.vatra_post_like_members(post_kind,post_id,liker_vatra_id,liked_at)
select l.post_kind,l.post_id,a.vatra_id,l.created_at
from public.vatra_post_likes l
join public.accounts a on a.user_id=l.liker_id
on conflict(post_kind,post_id,liker_vatra_id) do nothing;

-- Superseded exposed privileged RPC: existing client will query this RLS table.
drop function if exists public.vatra_post_recent_likers(text,uuid);
