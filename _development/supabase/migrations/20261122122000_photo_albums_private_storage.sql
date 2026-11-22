-- VATRA photo albums: dedicated private media, visible by owner / accepted friends / signed-in public viewers.
-- Existing profile photos and post media remain untouched.
begin;

create table public.photo_albums (
 id uuid primary key default gen_random_uuid(),
 owner_vatra_id bigint not null references public.accounts(vatra_id) on delete cascade,
 title text not null check (length(btrim(title)) between 1 and 128),
 description text not null default '' check (char_length(description)<=512),
 visibility text not null default 'public' check (visibility in ('public','friends','private')),
 comments_mode text not null default 'everyone' check (comments_mode in ('everyone','friends','off')),
 show_in_photos boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index photo_albums_owner_newest_idx on public.photo_albums(owner_vatra_id,created_at desc);

create table public.album_photos (
 id uuid primary key default gen_random_uuid(),
 album_id uuid not null references public.photo_albums(id) on delete cascade,
 owner_vatra_id bigint not null references public.accounts(vatra_id) on delete cascade,
 media_path text not null unique,
 caption text not null default '' check (char_length(caption)<=300),
 created_at timestamptz not null default now(),
 constraint album_photo_path_check check (
  media_path ~ ('^'||owner_vatra_id::text||'/albums/'||album_id::text||'/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$')
 )
);
create index album_photos_album_newest_idx on public.album_photos(album_id,created_at desc);

create table public.photo_album_comments (
 id uuid primary key default gen_random_uuid(),
 album_id uuid not null references public.photo_albums(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 author_vatra_id bigint not null references public.accounts(vatra_id) on delete cascade,
 body text not null check (char_length(btrim(body)) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index photo_album_comments_album_idx on public.photo_album_comments(album_id,created_at desc);

alter table public.photo_albums enable row level security;
alter table public.album_photos enable row level security;
alter table public.photo_album_comments enable row level security;
revoke all on public.photo_albums,public.album_photos,public.photo_album_comments from anon;
grant select,insert,update,delete on public.photo_albums to authenticated;
grant select,insert,delete on public.album_photos to authenticated;
grant select,insert,delete on public.photo_album_comments to authenticated;

-- Ownership is tied to the authenticated account, never to user-supplied metadata.
create policy vatra_albums_owner_insert on public.photo_albums
 for insert to authenticated with check (
 exists(select 1 from public.accounts me where me.user_id=(select auth.uid()) and me.vatra_id=owner_vatra_id)
 );
create policy vatra_albums_owner_update on public.photo_albums
 for update to authenticated using (
 exists(select 1 from public.accounts me where me.user_id=(select auth.uid()) and me.vatra_id=owner_vatra_id)
 ) with check (
 exists(select 1 from public.accounts me where me.user_id=(select auth.uid()) and me.vatra_id=owner_vatra_id)
 );
create policy vatra_albums_owner_delete on public.photo_albums
 for delete to authenticated using (
 exists(select 1 from public.accounts me where me.user_id=(select auth.uid()) and me.vatra_id=owner_vatra_id)
 );

-- Profile privacy, blocks and album-specific visibility all apply.
create policy vatra_albums_reader on public.photo_albums
 for select to authenticated using (
 exists (
  select 1 from public.accounts me
  where me.user_id=(select auth.uid()) and (
   me.vatra_id=owner_vatra_id
   or (
    not exists (
     select 1 from public.member_blocks b
     where (b.blocker_vatra_id=owner_vatra_id and b.blocked_vatra_id=me.vatra_id)
        or (b.blocked_vatra_id=owner_vatra_id and b.blocker_vatra_id=me.vatra_id)
    )
    and (
     coalesce((select pref.profile_visibility from public.profile_preferences pref
               where pref.vatra_id=owner_vatra_id),'public')='public'
     or exists(select 1 from public.friendships f where f.status='accepted' and
       ((f.requester_id=owner_vatra_id and f.recipient_id=me.vatra_id)
       or (f.recipient_id=owner_vatra_id and f.requester_id=me.vatra_id)))
    )
    and (
     visibility='public'
     or (visibility='friends' and exists(
      select 1 from public.friendships f where f.status='accepted' and
      ((f.requester_id=owner_vatra_id and f.recipient_id=me.vatra_id)
       or (f.recipient_id=owner_vatra_id and f.requester_id=me.vatra_id))
     ))
    )
   )
  )
 )
 );
create policy vatra_albums_active_only on public.photo_albums as restrictive
 for all to authenticated using ((select vatra_admin_private.allowed()))
 with check ((select vatra_admin_private.allowed()));

create policy vatra_album_photos_reader on public.album_photos
 for select to authenticated using (
  exists(select 1 from public.photo_albums a where a.id=album_id and a.owner_vatra_id=album_photos.owner_vatra_id)
 );
create policy vatra_album_photos_owner_insert on public.album_photos
 for insert to authenticated with check (
  exists(select 1 from public.photo_albums a join public.accounts me on me.vatra_id=a.owner_vatra_id
    where a.id=album_id and a.owner_vatra_id=album_photos.owner_vatra_id and me.user_id=(select auth.uid()))
 );
create policy vatra_album_photos_owner_delete on public.album_photos
 for delete to authenticated using (
  exists(select 1 from public.accounts me where me.user_id=(select auth.uid()) and me.vatra_id=owner_vatra_id)
 );
create policy vatra_album_photos_active_only on public.album_photos as restrictive
 for all to authenticated using ((select vatra_admin_private.allowed()))
 with check ((select vatra_admin_private.allowed()));

create policy vatra_album_comments_reader on public.photo_album_comments
 for select to authenticated using (exists(select 1 from public.photo_albums a where a.id=album_id));
create policy vatra_album_comments_write on public.photo_album_comments
 for insert to authenticated with check (
 author_id=(select auth.uid())
 and exists(select 1 from public.accounts me where me.user_id=(select auth.uid()) and me.vatra_id=author_vatra_id)
 and exists(
  select 1 from public.photo_albums a
  where a.id=album_id and a.comments_mode<>'off'
   and (a.comments_mode='everyone' or a.owner_vatra_id=author_vatra_id
     or exists(select 1 from public.friendships f where f.status='accepted' and
       ((f.requester_id=a.owner_vatra_id and f.recipient_id=author_vatra_id)
       or (f.recipient_id=a.owner_vatra_id and f.requester_id=author_vatra_id))))
 )
 );
create policy vatra_album_comments_delete on public.photo_album_comments
 for delete to authenticated using (
 author_id=(select auth.uid())
 or exists(select 1 from public.photo_albums a join public.accounts me
  on me.vatra_id=a.owner_vatra_id
  where a.id=album_id and me.user_id=(select auth.uid()))
 );
create policy vatra_album_comments_active_only on public.photo_album_comments as restrictive
 for all to authenticated using ((select vatra_admin_private.allowed()))
 with check ((select vatra_admin_private.allowed()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('album-photos','album-photos',false,31457280,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy vatra_album_storage_owner_upload on storage.objects
 for insert to authenticated with check (
 bucket_id='album-photos'
 and exists(
  select 1 from public.photo_albums a join public.accounts me on me.vatra_id=a.owner_vatra_id
  where me.user_id=(select auth.uid())
   and name ~ ('^'||a.owner_vatra_id::text||'/albums/'||a.id::text||'/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$')
 )
 );
create policy vatra_album_storage_read on storage.objects
 for select to authenticated using (
 bucket_id='album-photos' and (
  exists(select 1 from public.accounts me where me.user_id=(select auth.uid())
   and name like (me.vatra_id::text||'/albums/%'))
  or exists(select 1 from public.album_photos ap where ap.media_path=name)
 )
 );
create policy vatra_album_storage_owner_delete on storage.objects
 for delete to authenticated using (
 bucket_id='album-photos'
 and exists(select 1 from public.accounts me where me.user_id=(select auth.uid())
  and name like (me.vatra_id::text||'/albums/%'))
 );

commit;
