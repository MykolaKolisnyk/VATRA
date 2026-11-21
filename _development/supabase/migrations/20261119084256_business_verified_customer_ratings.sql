begin;
create table public.business_ratings(
 appointment_id uuid primary key references public.business_appointments(id) on delete cascade,
 company_id uuid not null references public.business_companies(id) on delete cascade,
 customer_vatra_id bigint not null default business_private.current_member() references public.accounts(vatra_id) on delete cascade,
 stars smallint not null check(stars between 1 and 5),
 created_at timestamptz not null default now(),
 unique(company_id,customer_vatra_id)
);
create index business_ratings_company_idx on public.business_ratings(company_id);
alter table public.business_metrics add column rating_count bigint not null default 0 check(rating_count>=0),add column rating_total bigint not null default 0 check(rating_total>=0);
create function business_private.rating_eligible(appointment uuid,company uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.business_appointments a join public.business_booking_slots s on s.id=a.slot_id
 where a.id=appointment and s.company_id=company and a.customer_vatra_id=(select business_private.current_member()) and a.status='completed'
 and business_private.my_role(company) is null);
$$;
revoke all on function business_private.rating_eligible(uuid,uuid) from public,anon,authenticated;
grant execute on function business_private.rating_eligible(uuid,uuid) to authenticated;
create function business_private.rating_metrics() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then update public.business_metrics set rating_count=rating_count+1,rating_total=rating_total+new.stars where company_id=new.company_id;
 elsif tg_op='DELETE' then update public.business_metrics set rating_count=rating_count-1,rating_total=rating_total-old.stars where company_id=old.company_id;
 else update public.business_metrics set rating_total=rating_total+new.stars-old.stars where company_id=new.company_id;
 end if;
 return null;
end; $$;
revoke all on function business_private.rating_metrics() from public,anon,authenticated;
create trigger business_rating_metrics after insert or update of stars or delete on public.business_ratings for each row execute function business_private.rating_metrics();
alter table public.business_ratings enable row level security;
revoke all on public.business_ratings from public,anon,authenticated;
grant select on public.business_ratings to authenticated;
grant insert(appointment_id,company_id,stars),update(stars),delete on public.business_ratings to authenticated;
create policy business_rating_own_read on public.business_ratings for select to authenticated using(customer_vatra_id=(select business_private.current_member()));
create policy business_rating_create on public.business_ratings for insert to authenticated with check(customer_vatra_id=(select business_private.current_member()) and business_private.rating_eligible(appointment_id,company_id));
create policy business_rating_edit on public.business_ratings for update to authenticated using(customer_vatra_id=(select business_private.current_member()) and business_private.rating_eligible(appointment_id,company_id)) with check(customer_vatra_id=(select business_private.current_member()) and business_private.rating_eligible(appointment_id,company_id));
create policy business_rating_remove on public.business_ratings for delete to authenticated using(customer_vatra_id=(select business_private.current_member()));
commit;
