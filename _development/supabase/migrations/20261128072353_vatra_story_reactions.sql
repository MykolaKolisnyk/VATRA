-- Staged candidate for ordinary emoji reactions, not a live migration.
create table public.story_reactions (
 story_id uuid not null references public.stories(id) on delete cascade,
 reactor_vatra_id bigint not null references public.accounts(vatra_id) on delete cascade,
 reaction text not null check (reaction in ('like','heart','laugh','wow','sad','fire')),
 created_at timestamptz not null default now(),
 primary key(story_id,reactor_vatra_id)
);
create index story_reactions_reactor_idx on public.story_reactions(reactor_vatra_id);
alter table public.story_reactions enable row level security;
revoke all on public.story_reactions from public,anon,authenticated;
grant select,delete on public.story_reactions to authenticated;
grant insert(story_id,reactor_vatra_id,reaction),update(reaction) on public.story_reactions to authenticated;
create policy story_reactions_read_participant on public.story_reactions for select to authenticated using (
 (exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=story_reactions.reactor_vatra_id)
 and exists (select 1 from public.stories s where s.id=story_reactions.story_id
  and s.author_vatra_id<>story_reactions.reactor_vatra_id and s.expires_at>now()))
 or (
  exists (select 1 from public.stories s join public.accounts a on a.vatra_id=s.author_vatra_id
   where s.id=story_reactions.story_id and a.user_id=(select auth.uid()))
  and not public.vatra_has_block_between(reactor_vatra_id)
 )
);
create policy story_reactions_insert_self on public.story_reactions for insert to authenticated
 with check (exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=story_reactions.reactor_vatra_id)
 and exists (select 1 from public.stories s where s.id=story_reactions.story_id
  and s.author_vatra_id<>story_reactions.reactor_vatra_id and s.expires_at>now()));
create policy story_reactions_update_self on public.story_reactions for update to authenticated
 using (exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=story_reactions.reactor_vatra_id)
 and exists (select 1 from public.stories s where s.id=story_reactions.story_id
  and s.author_vatra_id<>story_reactions.reactor_vatra_id and s.expires_at>now()))
 with check (exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=story_reactions.reactor_vatra_id)
 and exists (select 1 from public.stories s where s.id=story_reactions.story_id
  and s.author_vatra_id<>story_reactions.reactor_vatra_id and s.expires_at>now()));
create policy story_reactions_delete_self on public.story_reactions for delete to authenticated
 using (exists (select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=story_reactions.reactor_vatra_id)
 and exists (select 1 from public.stories s where s.id=story_reactions.story_id
  and s.author_vatra_id<>story_reactions.reactor_vatra_id and s.expires_at>now()));
create policy vatra_active_account on public.story_reactions as restrictive for all to authenticated
 using ((select vatra_security_private.allowed()))
 with check ((select vatra_security_private.allowed()));
