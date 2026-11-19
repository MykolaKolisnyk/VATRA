begin;
create table public.business_followers(
 company_id uuid not null references public.business_companies(id) on delete cascade,
 member_vatra_id bigint not null default business_private.current_member() references public.accounts(vatra_id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(company_id,member_vatra_id)
);
create index business_followers_member_idx on public.business_followers(member_vatra_id);
create table public.business_posts(
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.business_companies(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 3000),
 created_at timestamptz not null default now()
);
create index business_posts_company_date_idx on public.business_posts(company_id,created_at desc,id);
create table public.business_metrics(
 company_id uuid primary key references public.business_companies(id) on delete cascade,
 follower_count bigint not null default 0 check(follower_count>=0),
 post_count bigint not null default 0 check(post_count>=0)
);
insert into public.business_metrics(company_id) select id from public.business_companies;
create function business_private.create_metrics() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.business_metrics(company_id) values(new.id);
 return new;
end; $$;
revoke all on function business_private.create_metrics() from public,anon,authenticated;
create trigger business_create_metrics after insert on public.business_companies for each row execute function business_private.create_metrics();
create function business_private.change_metrics() returns trigger
language plpgsql security definer set search_path='' as $$
declare cid uuid; delta integer;
begin
 if tg_op='INSERT' then cid:=new.company_id;delta:=1;else cid:=old.company_id;delta:=-1;end if;
 if tg_table_name='business_followers' then
  update public.business_metrics set follower_count=follower_count+delta where company_id=cid;
 elsif tg_table_name='business_posts' then
  update public.business_metrics set post_count=post_count+delta where company_id=cid;
 end if;
 return null;
end; $$;
revoke all on function business_private.change_metrics() from public,anon,authenticated;
create trigger business_follow_metrics after insert or delete on public.business_followers for each row execute function business_private.change_metrics();
create trigger business_post_metrics after insert or delete on public.business_posts for each row execute function business_private.change_metrics();
alter table public.business_followers enable row level security;
alter table public.business_posts enable row level security;
alter table public.business_metrics enable row level security;
revoke all on public.business_followers,public.business_posts,public.business_metrics from public,anon,authenticated;
grant select on public.business_followers,public.business_posts,public.business_metrics to authenticated;
grant insert(company_id),delete on public.business_followers to authenticated;
grant insert(company_id,body),delete on public.business_posts to authenticated;
create policy business_follow_read on public.business_followers for select to authenticated using(member_vatra_id=(select business_private.current_member()));
create policy business_follow_add on public.business_followers for insert to authenticated with check(member_vatra_id=(select business_private.current_member()));
create policy business_follow_remove on public.business_followers for delete to authenticated using(member_vatra_id=(select business_private.current_member()));
create policy business_posts_read on public.business_posts for select to authenticated using((select business_private.current_member()) is not null);
create policy business_posts_create on public.business_posts for insert to authenticated with check(business_private.my_role(company_id) in ('owner','admin','editor'));
create policy business_posts_remove on public.business_posts for delete to authenticated using(business_private.my_role(company_id) in ('owner','admin','editor'));
create policy business_metrics_read on public.business_metrics for select to authenticated using((select business_private.current_member()) is not null);
commit;
