-- VATRA Business: company identity and consent-based team membership.
begin;
create schema business_private;
revoke all on schema business_private from public, anon, authenticated;
grant usage on schema business_private to authenticated;

create function business_private.current_member() returns bigint
language sql stable security definer set search_path = ''
as $$
 select a.vatra_id from public.accounts a
 join auth.users u on u.id=a.user_id
 where a.user_id=(select auth.uid()) and u.email_confirmed_at is not null
 and not exists(select 1 from public.account_states s where s.vatra_id=a.vatra_id and s.state<>'active');
$$;
revoke all on function business_private.current_member() from public, anon, authenticated;
grant execute on function business_private.current_member() to authenticated;

create table public.business_companies (
 id uuid primary key default gen_random_uuid(),
 owner_vatra_id bigint not null default business_private.current_member() references public.accounts(vatra_id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 2 and 100),
 category text not null check (char_length(btrim(category)) between 2 and 80),
 description text not null default '' check (char_length(description)<=2000),
 city text not null default '' check(char_length(city)<=100),
 contact_email text not null default '' check(char_length(contact_email)<=254),
 website text not null default '' check(char_length(website)<=300 and (website='' or website ~* '^https?://[^[:space:]]+$')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index business_companies_owner_idx on public.business_companies(owner_vatra_id);
create table public.business_members (
 company_id uuid not null references public.business_companies(id) on delete cascade,
 member_vatra_id bigint not null references public.accounts(vatra_id) on delete cascade,
 role text not null check(role in ('owner','admin','manager','editor')),
 status text not null default 'pending' check(status in ('pending','active') and (role<>'owner' or status='active')),
 created_at timestamptz not null default now(),
 primary key(company_id,member_vatra_id)
);
create index business_members_member_idx on public.business_members(member_vatra_id,status,company_id);

create function business_private.my_role(company uuid) returns text
language sql stable security definer set search_path = ''
as $$
 select m.role from public.business_members m
 where m.company_id=company and m.member_vatra_id=business_private.current_member()
 and m.status='active';
$$;
revoke all on function business_private.my_role(uuid) from public, anon, authenticated;
grant execute on function business_private.my_role(uuid) to authenticated;

create function business_private.add_owner() returns trigger
language plpgsql security definer set search_path = ''
as $$
 begin
  if business_private.current_member() is distinct from new.owner_vatra_id then
    raise exception 'Invalid business owner';
  end if;
  insert into public.business_members(company_id,member_vatra_id,role,status)
  values(new.id,new.owner_vatra_id,'owner','active');
  return new;
 end;
$$;
revoke all on function business_private.add_owner() from public, anon, authenticated;
create trigger business_add_owner after insert on public.business_companies
for each row execute function business_private.add_owner();

create function business_private.touch_company() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at=now(); return new; end; $$;
revoke all on function business_private.touch_company() from public, anon, authenticated;
create trigger business_touch_company before update on public.business_companies
for each row execute function business_private.touch_company();

alter table public.business_companies enable row level security;
alter table public.business_members enable row level security;
revoke all on public.business_companies,public.business_members from public, anon, authenticated;
grant select(id,name,category,description,city,contact_email,website,created_at,updated_at) on public.business_companies to authenticated;
grant insert(name,category,description,city,contact_email,website),update(name,category,description,city,contact_email,website) on public.business_companies to authenticated;
grant select on public.business_members to authenticated;
grant insert(company_id,member_vatra_id,role),update(status) on public.business_members to authenticated;
grant delete on public.business_members to authenticated;

create policy business_company_read on public.business_companies for select to authenticated
using ((select business_private.current_member()) is not null);
create policy business_company_create on public.business_companies for insert to authenticated
with check (owner_vatra_id=(select business_private.current_member()));
create policy business_company_edit on public.business_companies for update to authenticated
using (business_private.my_role(id) in ('owner','admin','editor'))
with check (business_private.my_role(id) in ('owner','admin','editor'));
create policy business_team_read on public.business_members for select to authenticated
using (member_vatra_id=(select business_private.current_member()) or business_private.my_role(company_id) in ('owner','admin'));
create policy business_team_invite on public.business_members for insert to authenticated
with check (business_private.my_role(company_id)='owner' and role in ('admin','manager','editor') and status='pending'
 and member_vatra_id<>(select business_private.current_member()));
create policy business_team_accept on public.business_members for update to authenticated
using (member_vatra_id=(select business_private.current_member()) and role<>'owner' and status='pending')
with check (member_vatra_id=(select business_private.current_member()) and role<>'owner' and status='active');
create policy business_team_remove on public.business_members for delete to authenticated
using (role<>'owner' and (business_private.my_role(company_id)='owner' or member_vatra_id=(select business_private.current_member())));
commit;
