-- Disposable DB only: representative production story visibility, block and account predicates.
do $$ begin
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
end $$;
create schema auth;
create schema vatra_security_private;
create function auth.uid() returns uuid language sql stable set search_path='' as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create table public.accounts(user_id uuid primary key,vatra_id bigint unique not null);
create table public.friendships(requester_id bigint,recipient_id bigint,status text);
create table public.test_blocks(a bigint,b bigint);
create table public.test_disabled(vatra_id bigint primary key);
create table public.stories(id uuid primary key,author_vatra_id bigint not null references public.accounts(vatra_id),visibility text not null,expires_at timestamptz not null);
insert into public.accounts values
 ('00000000-0000-0000-0000-000000000001',101),
 ('00000000-0000-0000-0000-000000000002',102),
 ('00000000-0000-0000-0000-000000000003',103),
 ('00000000-0000-0000-0000-000000000004',104),
 ('00000000-0000-0000-0000-000000000005',105);
insert into public.friendships values(101,102,'accepted');
insert into public.test_blocks values(101,104);
insert into public.test_disabled values(105);
insert into public.stories values
 ('10000000-0000-0000-0000-000000000001',101,'friends',now()+interval '1 hour'),
 ('10000000-0000-0000-0000-000000000002',101,'public',now()+interval '1 hour'),
 ('10000000-0000-0000-0000-000000000003',101,'public',now()-interval '1 hour'),
 ('10000000-0000-0000-0000-000000000004',103,'public',now()+interval '1 hour');
create function public.vatra_has_block_between(other_vatra_id bigint) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.accounts a join public.test_blocks b
  on ((b.a=a.vatra_id and b.b=other_vatra_id) or (b.b=a.vatra_id and b.a=other_vatra_id))
  where a.user_id=auth.uid())
$$;
create function vatra_security_private.allowed() returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.accounts a join public.test_disabled d on d.vatra_id=a.vatra_id where a.user_id=auth.uid())
$$;
grant usage on schema auth,vatra_security_private to authenticated;
grant execute on function auth.uid(),public.vatra_has_block_between(bigint),vatra_security_private.allowed() to authenticated;
alter table public.accounts enable row level security;
grant select on public.accounts,public.friendships,public.stories to authenticated;
create policy accounts_self on public.accounts for select to authenticated using(user_id=(select auth.uid()));
alter table public.stories enable row level security;
create policy story_read_access on public.stories for select to authenticated using (
 exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=stories.author_vatra_id)
 or (expires_at>now() and (visibility='public' or exists(
 select 1 from public.friendships f join public.accounts a
 on ((a.vatra_id=f.requester_id and f.recipient_id=stories.author_vatra_id) or (a.vatra_id=f.recipient_id and f.requester_id=stories.author_vatra_id))
 where f.status='accepted' and a.user_id=(select auth.uid()))))
);
create policy block_hide_member_stories on public.stories as restrictive for select to authenticated using(not public.vatra_has_block_between(author_vatra_id));
create policy vatra_active_account on public.stories as restrictive for all to authenticated using((select vatra_security_private.allowed())) with check((select vatra_security_private.allowed()));
