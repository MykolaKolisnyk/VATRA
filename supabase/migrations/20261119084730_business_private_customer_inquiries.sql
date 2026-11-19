begin;
create table public.business_inquiries(
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.business_companies(id) on delete cascade,
 customer_vatra_id bigint not null default business_private.current_member() references public.accounts(vatra_id) on delete cascade,
 created_at timestamptz not null default now(),
 last_activity_at timestamptz not null default now(),
 unique(company_id,customer_vatra_id)
);
create index business_inquiries_customer_idx on public.business_inquiries(customer_vatra_id,last_activity_at desc);
create index business_inquiries_company_idx on public.business_inquiries(company_id,last_activity_at desc);
create table public.business_inquiry_messages(
 id uuid primary key default gen_random_uuid(),
 inquiry_id uuid not null references public.business_inquiries(id) on delete cascade,
 author_vatra_id bigint default business_private.current_member() references public.accounts(vatra_id) on delete set null,
 sender_side text not null check(sender_side in ('customer','company')),
 body text not null check(char_length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index business_inquiry_messages_thread_idx on public.business_inquiry_messages(inquiry_id,created_at desc,id);
create index business_inquiry_messages_author_rate_idx on public.business_inquiry_messages(author_vatra_id,created_at desc);
create function business_private.inquiry_can_open(company uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_companies c where c.id=company and business_private.current_member() is not null and business_private.my_role(c.id) is null
 and not public.vatra_has_block_between(c.owner_vatra_id));
$$;
revoke all on function business_private.inquiry_can_open(uuid) from public,anon,authenticated;
grant execute on function business_private.inquiry_can_open(uuid) to authenticated;
create function business_private.inquiry_can_read(thread uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_inquiries i where i.id=thread and (i.customer_vatra_id=business_private.current_member() or business_private.my_role(i.company_id) in ('owner','admin','manager')));
$$;
revoke all on function business_private.inquiry_can_read(uuid) from public,anon,authenticated;
grant execute on function business_private.inquiry_can_read(uuid) to authenticated;
create function business_private.inquiry_limit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.customer_vatra_id is distinct from business_private.current_member() or not business_private.inquiry_can_open(new.company_id) then raise exception 'Cannot open this inquiry';end if;
 perform pg_advisory_xact_lock(hashtextextended('business-inquiry:'||new.customer_vatra_id::text,0));
 if (select count(*) from public.business_inquiries where customer_vatra_id=new.customer_vatra_id and created_at>now()-interval '1 day')>=30 then raise exception 'Too many new inquiries';end if;
 return new;
end; $$;
revoke all on function business_private.inquiry_limit() from public,anon,authenticated;
create trigger business_inquiry_limit before insert on public.business_inquiries for each row execute function business_private.inquiry_limit();
create function business_private.inquiry_message_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare actor bigint; thread public.business_inquiries%rowtype; owner_id bigint;
begin
 actor:=business_private.current_member();
 if actor is null or new.author_vatra_id is distinct from actor then raise exception 'Invalid sender';end if;
 select * into thread from public.business_inquiries where id=new.inquiry_id for update;
 if not found then raise exception 'Inquiry unavailable';end if;
 select owner_vatra_id into owner_id from public.business_companies where id=thread.company_id;
 if exists(select 1 from public.member_blocks b where (b.blocker_vatra_id=owner_id and b.blocked_vatra_id=thread.customer_vatra_id) or (b.blocker_vatra_id=thread.customer_vatra_id and b.blocked_vatra_id=owner_id)) then raise exception 'Inquiry unavailable';end if;
 if actor=thread.customer_vatra_id then
  if business_private.my_role(thread.company_id) is not null then raise exception 'Inquiry unavailable';end if;
  new.sender_side:='customer';
 elsif business_private.my_role(thread.company_id) in ('owner','admin','manager') and not public.vatra_has_block_between(thread.customer_vatra_id) then
  new.sender_side:='company';
 else raise exception 'Inquiry unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended('business-message:'||actor::text,0));
 if (select count(*) from public.business_inquiry_messages where author_vatra_id=actor and created_at>now()-interval '1 minute')>=30 then raise exception 'Too many messages';end if;
 update public.business_inquiries set last_activity_at=now() where id=thread.id;
 return new;
end; $$;
revoke all on function business_private.inquiry_message_guard() from public,anon,authenticated;
create trigger business_inquiry_message_guard before insert on public.business_inquiry_messages for each row execute function business_private.inquiry_message_guard();
alter table public.business_inquiries enable row level security;
alter table public.business_inquiry_messages enable row level security;
revoke all on public.business_inquiries,public.business_inquiry_messages from public,anon,authenticated;
grant select on public.business_inquiries to authenticated;
grant insert(company_id) on public.business_inquiries to authenticated;
grant select(id,inquiry_id,sender_side,body,created_at),insert(inquiry_id,body) on public.business_inquiry_messages to authenticated;
create policy business_inquiries_read on public.business_inquiries for select to authenticated using(customer_vatra_id=(select business_private.current_member()) or business_private.my_role(company_id) in ('owner','admin','manager'));
create policy business_inquiries_create on public.business_inquiries for insert to authenticated with check(customer_vatra_id=(select business_private.current_member()) and business_private.inquiry_can_open(company_id));
create policy business_inquiry_messages_read on public.business_inquiry_messages for select to authenticated using(business_private.inquiry_can_read(inquiry_id));
create policy business_inquiry_messages_create on public.business_inquiry_messages for insert to authenticated with check(business_private.inquiry_can_read(inquiry_id));
commit;
