begin;
create table public.business_booking_slots(
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.business_companies(id) on delete cascade,
 service_name text not null check(char_length(btrim(service_name)) between 2 and 120),
 starts_at timestamptz not null check(mod(extract(epoch from starts_at),1800)=0),
 reserved boolean not null default false,
 cancelled boolean not null default false,
 created_at timestamptz not null default now(),
 unique(company_id,starts_at)
);
create index business_slots_available_idx on public.business_booking_slots(starts_at) where not reserved and not cancelled;
create table public.business_appointments(
 id uuid primary key default gen_random_uuid(),
 slot_id uuid not null references public.business_booking_slots(id) on delete cascade,
 customer_vatra_id bigint not null default business_private.current_member() references public.accounts(vatra_id) on delete cascade,
 status text not null default 'requested' check(status in ('requested','confirmed','declined','cancelled','completed')),
 created_at timestamptz not null default now()
);
create unique index business_appointments_one_live_idx on public.business_appointments(slot_id) where status in ('requested','confirmed','completed');
create index business_appointments_slot_idx on public.business_appointments(slot_id);
create index business_appointments_customer_idx on public.business_appointments(customer_vatra_id,created_at desc);
create function business_private.reserve_slot() returns trigger language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 if new.customer_vatra_id is distinct from business_private.current_member() or new.status<>'requested' then raise exception 'Invalid booking customer';end if;
 select company_id into cid from public.business_booking_slots where id=new.slot_id;
 if cid is null or business_private.my_role(cid) is not null then raise exception 'Cannot book own company';end if;
 update public.business_booking_slots set reserved=true where id=new.slot_id and not reserved and not cancelled and starts_at>now();
 if not found then raise exception 'Slot is unavailable';end if;
 return new;
end; $$;
revoke all on function business_private.reserve_slot() from public,anon,authenticated;
create trigger business_reserve_slot before insert on public.business_appointments for each row execute function business_private.reserve_slot();
create function business_private.appointment_transition() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.business_booking_slots%rowtype;
begin
 if not ((old.status='requested' and new.status in ('confirmed','declined','cancelled')) or (old.status='confirmed' and new.status in ('cancelled','completed'))) then raise exception 'Invalid booking transition';end if;
 select * into s from public.business_booking_slots where id=old.slot_id;
 if new.status='confirmed' and s.starts_at<=now() then raise exception 'Slot has already started';end if;
 if new.status='completed' and s.starts_at+interval '30 minutes'>now() then raise exception 'Appointment has not ended';end if;
 if new.status in ('declined','cancelled') then update public.business_booking_slots set reserved=false where id=old.slot_id;end if;
 return new;
end; $$;
revoke all on function business_private.appointment_transition() from public,anon,authenticated;
create trigger business_appointment_transition before update of status on public.business_appointments for each row execute function business_private.appointment_transition();
-- Account deletion must release a pending/confirmed appointment. Company deletion cascades the slot itself.
create function business_private.release_deleted_booking() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status in ('requested','confirmed') then update public.business_booking_slots set reserved=false where id=old.slot_id;end if;
 return old;
end; $$;
revoke all on function business_private.release_deleted_booking() from public,anon,authenticated;
create trigger business_release_deleted_booking after delete on public.business_appointments for each row execute function business_private.release_deleted_booking();
create function business_private.can_manage_slot(slot uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.business_booking_slots s where s.id=slot and business_private.my_role(s.company_id) in ('owner','admin','manager'));
$$;
revoke all on function business_private.can_manage_slot(uuid) from public,anon,authenticated;
grant execute on function business_private.can_manage_slot(uuid) to authenticated;
alter table public.business_booking_slots enable row level security;
alter table public.business_appointments enable row level security;
revoke all on public.business_booking_slots,public.business_appointments from public,anon,authenticated;
grant select on public.business_booking_slots,public.business_appointments to authenticated;
grant insert(company_id,service_name,starts_at),update(cancelled) on public.business_booking_slots to authenticated;
grant insert(slot_id),update(status) on public.business_appointments to authenticated;
create policy business_slots_read on public.business_booking_slots for select to authenticated using((select business_private.current_member()) is not null);
create policy business_slots_create on public.business_booking_slots for insert to authenticated with check(business_private.my_role(company_id) in ('owner','admin','manager') and starts_at>now() and starts_at<now()+interval '180 days' and not reserved and not cancelled);
create policy business_slots_toggle on public.business_booking_slots for update to authenticated using(business_private.my_role(company_id) in ('owner','admin','manager') and not reserved and starts_at>now()) with check(business_private.my_role(company_id) in ('owner','admin','manager') and not reserved and starts_at>now());
create policy business_appointments_read on public.business_appointments for select to authenticated using(customer_vatra_id=(select business_private.current_member()) or business_private.can_manage_slot(slot_id));
create policy business_appointments_create on public.business_appointments for insert to authenticated with check(customer_vatra_id=(select business_private.current_member()) and status='requested');
create policy business_appointments_customer_cancel on public.business_appointments for update to authenticated using(customer_vatra_id=(select business_private.current_member()) and status in ('requested','confirmed') and exists(select 1 from public.business_booking_slots s where s.id=slot_id and s.starts_at>now())) with check(customer_vatra_id=(select business_private.current_member()) and status='cancelled');
create policy business_appointments_manager_update on public.business_appointments for update to authenticated using(business_private.can_manage_slot(slot_id) and status in ('requested','confirmed')) with check(business_private.can_manage_slot(slot_id) and status in ('confirmed','declined','cancelled','completed'));
commit;
