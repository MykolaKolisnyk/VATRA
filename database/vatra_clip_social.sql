-- VATRA Clips: isolated social data; never touch existing account/post records.
-- Only authenticated visitors may read visible clips. Private bookmarks are owner-only.
-- RLS checks clip existence through already-protected app_data.
create table if not exists public.vatra_clip_likes (
  clip_id text not null check (length(clip_id) between 1 and 100),
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (clip_id, user_id)
);
alter table public.vatra_clip_likes enable row level security;
revoke all on public.vatra_clip_likes from anon, authenticated;
grant select, insert, delete on public.vatra_clip_likes to authenticated;


create table if not exists public.vatra_clip_bookmarks (
  clip_id text not null check (length(clip_id) between 1 and 100),
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (clip_id, user_id)
);
alter table public.vatra_clip_bookmarks enable row level security;
revoke all on public.vatra_clip_bookmarks from anon, authenticated;
grant select, insert, delete on public.vatra_clip_bookmarks to authenticated;


create table if not exists public.vatra_clip_shares (
  clip_id text not null check (length(clip_id) between 1 and 100),
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (clip_id, user_id)
);
alter table public.vatra_clip_shares enable row level security;
revoke all on public.vatra_clip_shares from anon, authenticated;
grant select, insert on public.vatra_clip_shares to authenticated;


create table if not exists public.vatra_clip_comments (
  id uuid primary key default gen_random_uuid(),
  clip_id text not null check (length(clip_id) between 1 and 100),
  user_id uuid not null default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 800),
  created_at timestamptz not null default now()
);
alter table public.vatra_clip_comments enable row level security;
revoke all on public.vatra_clip_comments from anon, authenticated;
grant select, insert, delete on public.vatra_clip_comments to authenticated;
create index if not exists vatra_clip_comments_recent on public.vatra_clip_comments(clip_id, created_at desc);
drop policy if exists vatra_clip_likes_read on public.vatra_clip_likes;
create policy "vatra_clip_likes_read" on public.vatra_clip_likes for select to authenticated using (exists (
    select 1 from public.app_data v
    where v.path = 'videos/' || vatra_clip_likes.clip_id
      and v.value ->> 'kind' = 'clip'
  ));

drop policy if exists vatra_clip_likes_add on public.vatra_clip_likes;
create policy "vatra_clip_likes_add" on public.vatra_clip_likes for insert to authenticated with check (user_id = (select auth.uid()) and exists (
    select 1 from public.app_data v
    where v.path = 'videos/' || vatra_clip_likes.clip_id
      and v.value ->> 'kind' = 'clip'
  ));

drop policy if exists vatra_clip_likes_remove on public.vatra_clip_likes;
create policy "vatra_clip_likes_remove" on public.vatra_clip_likes for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists vatra_clip_bookmarks_read on public.vatra_clip_bookmarks;
create policy "vatra_clip_bookmarks_read" on public.vatra_clip_bookmarks for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists vatra_clip_bookmarks_add on public.vatra_clip_bookmarks;
create policy "vatra_clip_bookmarks_add" on public.vatra_clip_bookmarks for insert to authenticated with check (user_id = (select auth.uid()) and exists (
    select 1 from public.app_data v
    where v.path = 'videos/' || vatra_clip_bookmarks.clip_id
      and v.value ->> 'kind' = 'clip'
  ));

drop policy if exists vatra_clip_bookmarks_remove on public.vatra_clip_bookmarks;
create policy "vatra_clip_bookmarks_remove" on public.vatra_clip_bookmarks for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists vatra_clip_shares_read on public.vatra_clip_shares;
create policy "vatra_clip_shares_read" on public.vatra_clip_shares for select to authenticated using (exists (
    select 1 from public.app_data v
    where v.path = 'videos/' || vatra_clip_shares.clip_id
      and v.value ->> 'kind' = 'clip'
  ));

drop policy if exists vatra_clip_shares_add on public.vatra_clip_shares;
create policy "vatra_clip_shares_add" on public.vatra_clip_shares for insert to authenticated with check (user_id = (select auth.uid()) and exists (
    select 1 from public.app_data v
    where v.path = 'videos/' || vatra_clip_shares.clip_id
      and v.value ->> 'kind' = 'clip'
  ));

drop policy if exists vatra_clip_comments_read on public.vatra_clip_comments;
create policy "vatra_clip_comments_read" on public.vatra_clip_comments for select to authenticated using (exists (
    select 1 from public.app_data v
    where v.path = 'videos/' || vatra_clip_comments.clip_id
      and v.value ->> 'kind' = 'clip'
  ));

drop policy if exists vatra_clip_comments_add on public.vatra_clip_comments;
create policy "vatra_clip_comments_add" on public.vatra_clip_comments for insert to authenticated with check (user_id = (select auth.uid()) and exists (
    select 1 from public.app_data v
    where v.path = 'videos/' || vatra_clip_comments.clip_id
      and v.value ->> 'kind' = 'clip'
  ));

drop policy if exists vatra_clip_comments_remove on public.vatra_clip_comments;
create policy "vatra_clip_comments_remove" on public.vatra_clip_comments for delete to authenticated using (user_id = (select auth.uid()) or exists (
  select 1 from public.app_data v where v.path='videos/' || vatra_clip_comments.clip_id
    and v.value ->> 'kind'='clip' and v.value ->> 'authorUid'=(select auth.uid())::text
));
comment on table public.vatra_clip_likes is 'VATRA | Clips | likes';
comment on table public.vatra_clip_comments is 'VATRA | Clips | comments';
comment on table public.vatra_clip_bookmarks is 'VATRA | Clips | private saved clips';
comment on table public.vatra_clip_shares is 'VATRA | Clips | unique sharers';
