-- ВАТРА · Supabase schema migration
-- Run in Supabase SQL Editor. This is idempotent for tables/columns and does not delete existing data.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  username text unique,
  bio text not null default '',
  avatar_url text,
  cover_url text,
  profile_visibility text not null default 'public' check (profile_visibility in ('public','friends','private')),
  searchable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists first_name text not null default '';
alter table public.profiles add column if not exists last_name text not null default '';
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists cover_url text;
alter table public.profiles add column if not exists profile_visibility text not null default 'public';
alter table public.profiles add column if not exists searchable boolean not null default true;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.private_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  date_of_birth date,
  hometown text,
  residence text,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  media_url text,
  media_type text,
  visibility text not null default 'public' check (visibility in ('public','friends','private')),
  community_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.posts add column if not exists content text not null default '';
alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists media_type text;
alter table public.posts add column if not exists visibility text not null default 'public';
alter table public.posts add column if not exists community_id uuid;
alter table public.posts add column if not exists updated_at timestamptz not null default now();

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id,user_id)
);
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique(requester_id,addressee_id),
  check(requester_id <> addressee_id)
);
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  avatar_url text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now()
);
create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'accepted' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique(community_id,user_id)
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_one uuid not null references auth.users(id) on delete cascade,
  user_two uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_one,user_two),
  check(user_one < user_two)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id,post_id)
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_user_id_idx on public.posts(user_id,created_at desc);
create index if not exists comments_post_idx on public.post_comments(post_id,created_at);
create index if not exists messages_conversation_idx on public.messages(conversation_id,created_at);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id,status);
create index if not exists community_members_user_idx on public.community_members(user_id,status);

alter table public.profiles enable row level security;
alter table public.private_profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.friendships enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.saved_posts enable row level security;

grant select,insert,update,delete on public.profiles,public.private_profiles,public.posts,public.post_likes,public.post_comments,public.friendships,public.communities,public.community_members,public.conversations,public.messages,public.saved_posts to authenticated;
grant select on public.profiles,public.posts,public.post_likes,public.post_comments,public.communities to anon;

-- Replace policies with an explicit baseline for this application.
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies where schemaname='public' and tablename in ('profiles','private_profiles','posts','post_likes','post_comments','friendships','communities','community_members','conversations','messages','saved_posts')
  loop execute format('drop policy if exists %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;

create policy profiles_read on public.profiles for select using (profile_visibility='public' or id=auth.uid() or exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester_id=auth.uid() and f.addressee_id=id) or (f.addressee_id=auth.uid() and f.requester_id=id))));
create policy profiles_insert on public.profiles for insert to authenticated with check(id=auth.uid());
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy private_profiles_owner on public.private_profiles for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create policy posts_read on public.posts for select using(user_id=auth.uid() or visibility='public' or (visibility='friends' and exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester_id=auth.uid() and f.addressee_id=user_id) or (f.addressee_id=auth.uid() and f.requester_id=user_id)))));
create policy posts_insert on public.posts for insert to authenticated with check(user_id=auth.uid());
create policy posts_update on public.posts for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy posts_delete on public.posts for delete to authenticated using(user_id=auth.uid());

create policy likes_read on public.post_likes for select using(exists(select 1 from public.posts p where p.id=post_id));
create policy likes_insert on public.post_likes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id));
create policy likes_delete on public.post_likes for delete to authenticated using(user_id=auth.uid());
create policy comments_read on public.post_comments for select using(exists(select 1 from public.posts p where p.id=post_id));
create policy comments_insert on public.post_comments for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id));
create policy comments_update on public.post_comments for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy comments_delete on public.post_comments for delete to authenticated using(user_id=auth.uid());

create policy friendships_read on public.friendships for select to authenticated using(requester_id=auth.uid() or addressee_id=auth.uid());
create policy friendships_insert on public.friendships for insert to authenticated with check(requester_id=auth.uid() and status='pending');
create policy friendships_update on public.friendships for update to authenticated using(addressee_id=auth.uid() and status='pending') with check(addressee_id=auth.uid() and status in ('accepted','rejected'));
create policy friendships_delete on public.friendships for delete to authenticated using(requester_id=auth.uid() or addressee_id=auth.uid());

create or replace function public.vatra_is_community_member(_community_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path=public as $
  select exists(select 1 from public.community_members cm where cm.community_id=_community_id and cm.user_id=_user_id and cm.status='accepted');
$;
create or replace function public.vatra_is_community_owner(_community_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path=public as $
  select exists(select 1 from public.communities c where c.id=_community_id and c.owner_id=_user_id);
$;
create policy communities_read on public.communities for select using(visibility='public' or owner_id=auth.uid() or public.vatra_is_community_member(id,auth.uid()));
create policy communities_insert on public.communities for insert to authenticated with check(owner_id=auth.uid());
create policy communities_update on public.communities for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy communities_delete on public.communities for delete to authenticated using(owner_id=auth.uid());
create policy members_read on public.community_members for select to authenticated using(user_id=auth.uid() or public.vatra_is_community_owner(community_id,auth.uid()));
create policy members_insert on public.community_members for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.communities c where c.id=community_id and (c.visibility='public' or c.owner_id=auth.uid())));
create policy members_update on public.community_members for update to authenticated using(user_id=auth.uid() or public.vatra_is_community_owner(community_id,auth.uid())) with check(user_id=auth.uid() or public.vatra_is_community_owner(community_id,auth.uid()));
create policy members_delete on public.community_members for delete to authenticated using(user_id=auth.uid() or public.vatra_is_community_owner(community_id,auth.uid()));

create policy conversations_read on public.conversations for select to authenticated using(user_one=auth.uid() or user_two=auth.uid());
create policy conversations_insert on public.conversations for insert to authenticated with check((user_one=auth.uid() or user_two=auth.uid()) and user_one < user_two);
create policy conversations_delete on public.conversations for delete to authenticated using(user_one=auth.uid() or user_two=auth.uid());
create policy messages_read on public.messages for select to authenticated using(exists(select 1 from public.conversations c where c.id=conversation_id and (c.user_one=auth.uid() or c.user_two=auth.uid())));
create policy messages_insert on public.messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and (c.user_one=auth.uid() or c.user_two=auth.uid())));
create policy messages_delete on public.messages for delete to authenticated using(sender_id=auth.uid());
create policy saved_read on public.saved_posts for select to authenticated using(user_id=auth.uid());
create policy saved_insert on public.saved_posts for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id));
create policy saved_delete on public.saved_posts for delete to authenticated using(user_id=auth.uid());

create or replace function public.vatra_handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,first_name,last_name,username)
  values(new.id,coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name',''),nullif(new.raw_user_meta_data->>'username',''))
  on conflict(id) do nothing;
  insert into public.private_profiles(user_id,date_of_birth)
  values(new.id,nullif(new.raw_user_meta_data->>'date_of_birth','')::date)
  on conflict(user_id) do nothing;
  return new;
end; $$;
drop trigger if exists vatra_auth_user_created on auth.users;
create trigger vatra_auth_user_created after insert on auth.users for each row execute function public.vatra_handle_new_user();

-- Optional social features used by the current interface.
create table if not exists public.post_polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  question text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.post_polls(id) on delete cascade,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.post_polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(poll_id,user_id)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null,
  entity_id uuid,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check(target_type in ('post','profile','comment','community')),
  target_id uuid not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id,created_at desc);
create index if not exists poll_options_poll_idx on public.poll_options(poll_id,position);
alter table public.post_polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.notifications enable row level security;
alter table public.content_reports enable row level security;
grant select,insert,update,delete on public.post_polls,public.poll_options,public.poll_votes,public.notifications,public.content_reports to authenticated;

do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies where schemaname='public' and tablename in ('post_polls','poll_options','poll_votes','notifications','content_reports')
  loop execute format('drop policy if exists %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;
create policy polls_read on public.post_polls for select using(exists(select 1 from public.posts p where p.id=post_id));
create policy polls_insert on public.post_polls for insert to authenticated with check(created_by=auth.uid() and exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));
create policy polls_update on public.post_polls for update to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
create policy polls_delete on public.post_polls for delete to authenticated using(created_by=auth.uid());
create policy poll_options_read on public.poll_options for select using(exists(select 1 from public.post_polls pp where pp.id=poll_id));
create policy poll_options_insert on public.poll_options for insert to authenticated with check(exists(select 1 from public.post_polls pp where pp.id=poll_id and pp.created_by=auth.uid()));
create policy poll_options_delete on public.poll_options for delete to authenticated using(exists(select 1 from public.post_polls pp where pp.id=poll_id and pp.created_by=auth.uid()));
create policy poll_votes_read on public.poll_votes for select using(exists(select 1 from public.posts p join public.post_polls pp on pp.post_id=p.id where pp.id=poll_id));
create policy poll_votes_insert on public.poll_votes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.poll_options po where po.id=option_id and po.poll_id=poll_id));
create policy poll_votes_delete on public.poll_votes for delete to authenticated using(user_id=auth.uid());
create policy notifications_read on public.notifications for select to authenticated using(recipient_id=auth.uid());
create policy notifications_update on public.notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
drop policy if exists notifications_insert on public.notifications;
create policy reports_read on public.content_reports for select to authenticated using(reporter_id=auth.uid());
create policy reports_insert on public.content_reports for insert to authenticated with check(reporter_id=auth.uid());

-- Notifications are created by database triggers, not by arbitrary client inserts.
create or replace function public.vatra_notify_like()
returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid;
begin
  select user_id into recipient from public.posts where id=new.post_id;
  if recipient is not null and recipient<>new.user_id then
    insert into public.notifications(recipient_id,actor_id,kind,entity_id,body)
    values(recipient,new.user_id,'like',new.post_id,'Вподобав(-ла) твій допис');
  end if;
  return new;
end; $$;
drop trigger if exists vatra_post_like_notification on public.post_likes;
create trigger vatra_post_like_notification after insert on public.post_likes for each row execute function public.vatra_notify_like();

create or replace function public.vatra_notify_comment()
returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid;
begin
  select user_id into recipient from public.posts where id=new.post_id;
  if recipient is not null and recipient<>new.user_id then
    insert into public.notifications(recipient_id,actor_id,kind,entity_id,body)
    values(recipient,new.user_id,'comment',new.post_id,'Прокоментував(-ла) твій допис');
  end if;
  return new;
end; $$;
drop trigger if exists vatra_post_comment_notification on public.post_comments;
create trigger vatra_post_comment_notification after insert on public.post_comments for each row execute function public.vatra_notify_comment();

create or replace function public.vatra_notify_friendship()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' and new.status='pending' then
    insert into public.notifications(recipient_id,actor_id,kind,entity_id,body)
    values(new.addressee_id,new.requester_id,'friend_request',new.id,'Надіслав(-ла) запит у друзі');
  elsif tg_op='UPDATE' and new.status='accepted' and old.status is distinct from new.status then
    insert into public.notifications(recipient_id,actor_id,kind,entity_id,body)
    values(new.requester_id,new.addressee_id,'friend_accepted',new.id,'Прийняв(-ла) запит у друзі');
  end if;
  return new;
end; $$;
drop trigger if exists vatra_friendship_notification_insert on public.friendships;
create trigger vatra_friendship_notification_insert after insert on public.friendships for each row execute function public.vatra_notify_friendship();
drop trigger if exists vatra_friendship_notification_update on public.friendships;
create trigger vatra_friendship_notification_update after update of status on public.friendships for each row execute function public.vatra_notify_friendship();
