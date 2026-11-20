-- Avatar photo tags. Migration version matches the applied VATRA-DE migration.
-- No anonymous API access; owner-only inserts; owner or tagged person can remove.
create table if not exists public.avatar_photo_tags (
 id uuid primary key default gen_random_uuid(),
 owner_vatra_id bigint not null references public.member_directory(vatra_id) on delete cascade,
 avatar_path text not null,
 tagged_vatra_id bigint not null references public.member_directory(vatra_id) on delete cascade,
 x_pct numeric(5,2) not null check (x_pct >= 0 and x_pct <= 100),
 y_pct numeric(5,2) not null check (y_pct >= 0 and y_pct <= 100),
 created_by uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 constraint avatar_photo_tags_image_check check
 (avatar_path ~ ('^' || owner_vatra_id::text || '/avatar/[A-Za-z0-9_-]+[.](jpg|jpeg|png|webp)$')),
 constraint avatar_photo_tags_unique_target unique (owner_vatra_id, avatar_path, tagged_vatra_id)
);
create index if not exists avatar_photo_tags_photo_lookup
 on public.avatar_photo_tags (owner_vatra_id,avatar_path);
alter table public.avatar_photo_tags enable row level security;
revoke all on public.avatar_photo_tags from anon, authenticated;
grant select,insert,delete on public.avatar_photo_tags to authenticated;
grant select,insert,update,delete on public.avatar_photo_tags to service_role;
create policy "avatar tags visible only to photo viewers or tagged members"
on public.avatar_photo_tags for select to authenticated
using (
 exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id in (owner_vatra_id,tagged_vatra_id))
 or (
  not public.vatra_has_block_between(owner_vatra_id)
  and not public.vatra_has_block_between(tagged_vatra_id)
  and (
   coalesce((select p.profile_visibility from public.profile_preferences p where p.vatra_id=owner_vatra_id),'public')='public'
   or exists (
    select 1 from public.accounts a join public.friendships f on
     (f.requester_id=a.vatra_id and f.recipient_id=owner_vatra_id)
     or (f.recipient_id=a.vatra_id and f.requester_id=owner_vatra_id)
    where a.user_id=(select auth.uid()) and f.status='accepted'
   )
  )
 )
);
create policy "only photo owner can tag existing avatar"
on public.avatar_photo_tags for insert to authenticated
with check (
 created_by=(select auth.uid())
 and exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=owner_vatra_id)
 and not public.vatra_has_block_between(tagged_vatra_id)
 and exists (select 1 from storage.objects o where o.bucket_id='avatars' and o.name=avatar_path)
);
create policy "photo owner or tagged member can remove tag"
on public.avatar_photo_tags for delete to authenticated
using (exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id in (owner_vatra_id,tagged_vatra_id)));
